use crate::runtime_contract::NativeLaunchConfig;
use crate::runtime_file_system::sync_directory;
use crate::runtime_test_checkpoint::hold_once;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Mutex, RwLock, RwLockReadGuard, RwLockWriteGuard};
use synthesis_application::RepositoryPort;
use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};

#[derive(Default)]
pub(crate) struct RuntimeActivity {
    access: RwLock<()>,
    repair_required: AtomicBool,
}

impl RuntimeActivity {
    pub(crate) fn repair_required(&self) -> bool {
        self.repair_required.load(Ordering::Acquire)
    }

    pub(crate) fn read(&self) -> Result<RwLockReadGuard<'_, ()>, String> {
        let guard = self.access.try_read().map_err(|_| "busy".to_owned())?;
        if self.repair_required() {
            return Err("repair_required".into());
        }
        Ok(guard)
    }

    pub(crate) fn exclusive(&self) -> Result<RwLockWriteGuard<'_, ()>, String> {
        let guard = self.access.try_write().map_err(|_| "busy".to_owned())?;
        if self.repair_required() {
            return Err("repair_required".into());
        }
        Ok(guard)
    }

    pub(crate) fn require_repair(&self) {
        self.repair_required.store(true, Ordering::Release);
    }
}

pub(crate) const DATABASE_CONFIRMATION: &str = "RESET SYNTHESIS DATABASE";
pub(crate) const CLEAN_INSTALL_CONFIRMATION: &str = "RESET SYNTHESIS CLEAN INSTALL";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResetResult {
    ok: bool,
    pub(crate) status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    deleted_rows_by_table: Option<BTreeMap<String, u64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reset_at: Option<String>,
}

impl ResetResult {
    fn mismatch() -> Self {
        Self {
            ok: false,
            status: "confirmation_mismatch",
            deleted_rows_by_table: None,
            reset_at: None,
        }
    }
}

pub(crate) struct RuntimeReset {
    repository: Arc<RepositoryPort>,
    canonical: Arc<Mutex<CanonicalStore>>,
    config: Option<Arc<NativeLaunchConfig>>,
    activity: Arc<RuntimeActivity>,
}

impl RuntimeReset {
    pub(crate) fn new(
        repository: Arc<RepositoryPort>,
        canonical: Arc<Mutex<CanonicalStore>>,
        config: Option<Arc<NativeLaunchConfig>>,
        activity: Arc<RuntimeActivity>,
    ) -> Self {
        Self {
            repository,
            canonical,
            config,
            activity,
        }
    }

    pub(crate) fn database(&self, confirmation: &str) -> Result<ResetResult, String> {
        if confirmation != DATABASE_CONFIRMATION {
            return Ok(ResetResult::mismatch());
        }
        self.apply(false)
    }

    pub(crate) fn clean_install(
        &self,
        confirmation: Option<&str>,
        dry_run: bool,
    ) -> Result<ResetResult, String> {
        if !dry_run {
            if confirmation.map(str::trim) != Some(CLEAN_INSTALL_CONFIRMATION) {
                return Ok(ResetResult::mismatch());
            }
            return self.apply(true);
        }
        let owner = self.repository.owner();
        let repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        Ok(ResetResult {
            ok: true,
            status: "preview",
            deleted_rows_by_table: Some(repository.reset_preview()?),
            reset_at: None,
        })
    }

    fn apply(&self, clean_install: bool) -> Result<ResetResult, String> {
        let config = self.config.as_deref().ok_or("unsupported_operation")?;
        let owner = self.repository.owner();
        let mut repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        let mut canonical = self
            .canonical
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?;
        let reset_at = synthesis_protocol::utc_now_iso8601();
        let journal = ResetJournal {
            id: format!(
                "{}-{}-{}",
                crate::runtime_contract::current_time_ms()?,
                std::process::id(),
                RESET_SEQUENCE.fetch_add(1, Ordering::Relaxed)
            ),
            profile_id: config.profile_id.clone(),
            data_root_id: config.data_root_id.clone(),
            clean_install,
        };
        let state = state_root(config)?;
        let backup = backup_root(config, &journal)?;
        ensure_directory(&state.join("synthesis-reset-backups"))?;
        fs::create_dir(&backup).map_err(|_| "reset_backup_failed".to_owned())?;
        repository.verified_backup(&backup.join("synthesis.db"))?;
        sync_directory(&backup).map_err(|_| "reset_backup_failed".to_owned())?;
        if let Err(error) = write_journal(config, &journal) {
            if journal_path(config)?.exists() {
                self.activity.require_repair();
            }
            return Err(error);
        }
        checkpoint(config, "reset-after-backup");
        let outcome = (|| {
            crate::runtime_deadline::bounded_timeout(std::time::Duration::from_secs(1))?;
            if clean_install {
                fs::rename(&config.canonical_root, backup.join("synthesis"))
                    .map_err(|_| "reset_canonical_stage_failed".to_owned())?;
                sync_directory(config.canonical_root.parent().ok_or("reset_path_invalid")?)?;
                sync_directory(&backup)?;
                checkpoint(config, "reset-after-canonical-stage");
                *canonical = CanonicalStore::initialize_production(
                    &config.canonical_root,
                    canonical_identity(config),
                )?;
                sync_directory(config.canonical_root.parent().ok_or("reset_path_invalid")?)?;
            }
            checkpoint(config, "reset-before-database-commit");
            crate::runtime_deadline::bounded_timeout(std::time::Duration::from_secs(1))?;
            let counts = repository.reset_state(&journal.id, &reset_at)?;
            checkpoint(config, "reset-after-database-commit");
            finish_journal(config)?;
            Ok(ResetResult {
                ok: true,
                status: "reset",
                deleted_rows_by_table: Some(counts),
                reset_at: Some(reset_at),
            })
        })();
        if outcome.is_err() {
            // Recovery uses the committed SQLite marker, including an ambiguous commit result.
            if recover_pending_reset(config).is_err() {
                self.activity.require_repair();
                return Err("repair_required".into());
            }
            match CanonicalStore::open_production(
                &config.canonical_root,
                canonical_identity(config),
            ) {
                Ok(restored) => *canonical = restored,
                Err(_) => {
                    self.activity.require_repair();
                    return Err("repair_required".into());
                }
            }
            self.activity.require_repair();
        }
        outcome
    }
}

static RESET_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ResetJournal {
    id: String,
    profile_id: String,
    data_root_id: String,
    clean_install: bool,
}

fn state_root(config: &NativeLaunchConfig) -> Result<&Path, String> {
    config
        .repository_db_path
        .parent()
        .ok_or_else(|| "reset_path_invalid".into())
}

fn backup_root(config: &NativeLaunchConfig, journal: &ResetJournal) -> Result<PathBuf, String> {
    if journal.id.is_empty()
        || journal.id.len() > 96
        || !journal.id.bytes().all(|b| b.is_ascii_digit() || b == b'-')
        || journal.profile_id != config.profile_id
        || journal.data_root_id != config.data_root_id
    {
        return Err("reset_journal_invalid".into());
    }
    Ok(state_root(config)?
        .join("synthesis-reset-backups")
        .join(&journal.id))
}

fn ensure_directory(path: &Path) -> Result<(), String> {
    if !path.exists() {
        fs::create_dir(path).map_err(|_| "reset_path_invalid".to_owned())?;
    }
    let metadata = fs::symlink_metadata(path).map_err(|_| "reset_path_invalid".to_owned())?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err("reset_path_invalid".into());
    }
    Ok(())
}

fn canonical_identity(config: &NativeLaunchConfig) -> CanonicalIdentity {
    CanonicalIdentity {
        profile_id: config.profile_id.clone(),
        data_root_id: config.data_root_id.clone(),
    }
}

fn journal_path(config: &NativeLaunchConfig) -> Result<PathBuf, String> {
    Ok(state_root(config)?.join("synthesis-reset-pending.json"))
}

fn write_journal(config: &NativeLaunchConfig, journal: &ResetJournal) -> Result<(), String> {
    let bytes = serde_json::to_vec(journal).map_err(|_| "reset_journal_invalid".to_owned())?;
    let temporary = backup_root(config, journal)?.join("journal.json");
    let destination = journal_path(config)?;
    if destination.exists() {
        return Err("reset_journal_unavailable".into());
    }
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|_| "reset_journal_unavailable".to_owned())?;
    file.write_all(&bytes)
        .and_then(|()| file.sync_all())
        .map_err(|_| "reset_journal_unavailable".to_owned())?;
    drop(file);
    fs::rename(temporary, destination).map_err(|_| "reset_journal_unavailable".to_owned())?;
    sync_directory(&backup_root(config, journal)?)?;
    sync_directory(state_root(config)?).map_err(|_| "reset_journal_unavailable".into())
}

fn finish_journal(config: &NativeLaunchConfig) -> Result<(), String> {
    fs::remove_file(journal_path(config)?).map_err(|_| "reset_journal_unavailable".to_owned())?;
    sync_directory(state_root(config)?).map_err(|_| "reset_journal_unavailable".into())
}

pub(crate) fn recover_pending_reset(config: &NativeLaunchConfig) -> Result<(), String> {
    let path = journal_path(config)?;
    if !path.exists() {
        return Ok(());
    }
    let metadata = fs::symlink_metadata(&path).map_err(|_| "reset_journal_invalid".to_owned())?;
    if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.len() > 4096 {
        return Err("reset_journal_invalid".into());
    }
    let journal: ResetJournal =
        serde_json::from_slice(&fs::read(path).map_err(|_| "reset_journal_invalid".to_owned())?)
            .map_err(|_| "reset_journal_invalid".to_owned())?;
    let backup = backup_root(config, &journal)?;
    let metadata = fs::symlink_metadata(&backup).map_err(|_| "reset_backup_missing".to_owned())?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err("reset_backup_missing".into());
    }
    let committed = synthesis_repository::reset_commit_id_at(&config.repository_db_path)?
        .as_deref()
        == Some(&journal.id);
    let staged = backup.join("synthesis");
    if journal.clean_install && staged.exists() && !committed {
        ensure_directory(&staged)?;
        if config.canonical_root.exists() {
            fs::rename(&config.canonical_root, backup.join("uncommitted-synthesis"))
                .map_err(|_| "reset_recovery_failed".to_owned())?;
        }
        fs::rename(staged, &config.canonical_root)
            .map_err(|_| "reset_recovery_failed".to_owned())?;
        sync_directory(&backup)?;
        sync_directory(config.canonical_root.parent().ok_or("reset_path_invalid")?)?;
    }
    CanonicalStore::open_production(&config.canonical_root, canonical_identity(config))?.close()?;
    finish_journal(config)
}

fn checkpoint(config: &NativeLaunchConfig, name: &str) {
    if config.diagnostics_enabled {
        hold_once(
            &config
                .test_checkpoint_root
                .clone()
                .unwrap_or_else(|| config.profile_runtime_root.join("test-checkpoints")),
            name,
        );
    }
}
