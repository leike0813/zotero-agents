//! Development-only Checkpoint/Bundle/WebDAV/Debug parity driver.
//! This example is not linked into the production sidecar.

use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs;
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use synthesis_application::debug_maintenance::DebugProfilerResult;
use synthesis_application::durable_bundle::{
    DurableBundleApplication, DurableBundleSourcePort, DurableImportApplyRequest,
};
use synthesis_application::knowledge_checkpoint::KnowledgeCheckpointApplyRequest;
use synthesis_application::webdav_sync::{
    WebDavHostDescription, WebDavHostPort, WebDavReadResult, WebDavRetrySchedulerPort,
    WebDavStateStorePort, WebDavSyncApplication, WebDavSyncState, WebDavWriteResult,
};
use synthesis_application::{
    CanonicalStorePort, DebugMaintenanceApplication, KnowledgeCheckpointApplication, RepositoryPort,
};
use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
use synthesis_repository::{Repository, RepositoryIdentity};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DriverRequest {
    corpus: Corpus,
    runtime_root: PathBuf,
    canonical_root: PathBuf,
    webdav_state_root: PathBuf,
    remote_root: PathBuf,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Corpus {
    schema: String,
    report_schema: String,
    profile_id: String,
    data_root_id: String,
    clock: String,
    receipt_ids: Vec<String>,
    run_ids: Vec<String>,
    fault_phases: Vec<String>,
    coverage: Value,
    expected: Value,
}

struct FileStateStore {
    path: PathBuf,
}

struct ExportSource {
    manifest_text: String,
    assets: BTreeMap<String, String>,
}

impl DurableBundleSourcePort for ExportSource {
    fn read_manifest_text(&self) -> Result<Option<String>, String> {
        Ok(Some(self.manifest_text.clone()))
    }

    fn read_asset_text(&self, path: &str) -> Result<Option<String>, String> {
        Ok(self.assets.get(path).cloned())
    }
}

impl WebDavStateStorePort for FileStateStore {
    fn load(&self) -> Result<Option<WebDavSyncState>, String> {
        if !self.path.exists() {
            return Ok(None);
        }
        serde_json::from_slice(
            &fs::read(&self.path).map_err(|error| format!("state_read_failed:{error}"))?,
        )
        .map(Some)
        .map_err(|_| "webdav_sync_state_invalid".into())
    }

    fn save(&self, state: &WebDavSyncState) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|error| format!("state_write_failed:{error}"))?;
        }
        fs::write(
            &self.path,
            serde_json::to_vec_pretty(state).map_err(|_| "webdav_sync_state_invalid")?,
        )
        .map_err(|error| format!("state_write_failed:{error}"))
    }
}

struct ImmediateScheduler {
    events: Mutex<Vec<Value>>,
}

impl WebDavRetrySchedulerPort for ImmediateScheduler {
    fn wait(&self, delay_ms: u64, generation: u64) -> Result<bool, String> {
        self.events
            .lock()
            .map_err(|_| "scheduler_unavailable".to_owned())?
            .push(json!({"kind":"wait","delayMs":delay_ms,"generation":generation}));
        Ok(false)
    }

    fn cancel(&self, generation: u64) {
        if let Ok(mut events) = self.events.lock() {
            events.push(json!({"kind":"cancel","generation":generation}));
        }
    }
}

struct FileHost {
    root: PathBuf,
    writes: Mutex<Vec<String>>,
}

impl FileHost {
    fn resolve(&self, relative: &str) -> Result<PathBuf, String> {
        if relative.is_empty()
            || relative.starts_with('/')
            || relative.contains('\\')
            || relative
                .split('/')
                .any(|part| part.is_empty() || part == "." || part == "..")
        {
            return Err("webdav_sync_path_invalid".into());
        }
        Ok(self.root.join(relative))
    }

    fn etag(path: &Path) -> Result<String, String> {
        if !path.exists() {
            return Ok(String::new());
        }
        let bytes = fs::read(path).map_err(|error| format!("remote_read_failed:{error}"))?;
        Ok(format!("sha256:{:x}", Sha256::digest(bytes)))
    }
}

impl WebDavHostPort for FileHost {
    fn describe(&self) -> Result<WebDavHostDescription, String> {
        Ok(WebDavHostDescription {
            status: "available".into(),
            config_status: "configured".into(),
            auto_sync_enabled: false,
            auto_retry_enabled: false,
            base_url: "https://parity.invalid".into(),
            remote_path: "synthesis".into(),
            username: "fixture".into(),
            diagnostics: Vec::new(),
            ..WebDavHostDescription::default()
        })
    }

    fn read_text(&self, relative: &str) -> Result<WebDavReadResult, String> {
        let path = self.resolve(relative)?;
        if !path.exists() {
            return Ok(WebDavReadResult {
                status: "missing".into(),
                ..WebDavReadResult::default()
            });
        }
        Ok(WebDavReadResult {
            status: "read".into(),
            text: fs::read_to_string(&path)
                .map_err(|error| format!("remote_read_failed:{error}"))?,
            etag: Self::etag(&path)?,
            diagnostics: Vec::new(),
        })
    }

    fn ensure_collection(&self, relative: &str) -> Result<WebDavWriteResult, String> {
        fs::create_dir_all(self.resolve(relative)?)
            .map_err(|error| format!("remote_collection_failed:{error}"))?;
        Ok(WebDavWriteResult {
            status: "ready".into(),
            ..WebDavWriteResult::default()
        })
    }

    fn write_text(
        &self,
        relative: &str,
        text: &str,
        if_match: Option<&str>,
    ) -> Result<WebDavWriteResult, String> {
        let path = self.resolve(relative)?;
        if if_match.is_some_and(|expected| Self::etag(&path).ok().as_deref() != Some(expected)) {
            return Ok(WebDavWriteResult {
                status: "conflict".into(),
                ..WebDavWriteResult::default()
            });
        }
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| format!("remote_write_failed:{error}"))?;
        }
        fs::write(&path, text).map_err(|error| format!("remote_write_failed:{error}"))?;
        self.writes
            .lock()
            .map_err(|_| "remote_write_failed".to_owned())?
            .push(relative.into());
        Ok(WebDavWriteResult {
            status: "written".into(),
            etag: Self::etag(&path)?,
            diagnostics: Vec::new(),
        })
    }
}

fn tree(root: &Path) -> Result<BTreeMap<String, String>, String> {
    fn visit(
        root: &Path,
        current: &Path,
        result: &mut BTreeMap<String, String>,
    ) -> Result<(), String> {
        if !current.exists() {
            return Ok(());
        }
        let mut entries = fs::read_dir(current)
            .map_err(|error| format!("tree_read_failed:{error}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("tree_read_failed:{error}"))?;
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            let path = entry.path();
            let metadata =
                fs::symlink_metadata(&path).map_err(|error| format!("tree_read_failed:{error}"))?;
            if metadata.file_type().is_symlink() {
                return Err("parity_symlink_rejected".into());
            }
            if metadata.is_dir() {
                visit(root, &path, result)?;
            } else {
                let relative = path
                    .strip_prefix(root)
                    .map_err(|_| "tree_read_failed")?
                    .to_string_lossy()
                    .replace('\\', "/");
                result.insert(
                    relative,
                    format!(
                        "sha256:{:x}",
                        Sha256::digest(
                            fs::read(&path).map_err(|error| format!("tree_read_failed:{error}"))?
                        )
                    ),
                );
            }
        }
        Ok(())
    }
    let mut result = BTreeMap::new();
    visit(root, root, &mut result)?;
    Ok(result)
}

fn main() -> Result<(), String> {
    let mut input = String::new();
    io::stdin()
        .read_to_string(&mut input)
        .map_err(|error| format!("driver_input_failed:{error}"))?;
    let request: DriverRequest =
        serde_json::from_str(&input).map_err(|_| "driver_request_invalid".to_owned())?;
    let _contract_inventory = (
        &request.corpus.run_ids,
        &request.corpus.fault_phases,
        &request.corpus.coverage,
        &request.corpus.expected,
    );
    fs::create_dir_all(&request.runtime_root)
        .map_err(|error| format!("driver_root_failed:{error}"))?;
    fs::create_dir_all(&request.canonical_root)
        .map_err(|error| format!("driver_root_failed:{error}"))?;
    fs::create_dir_all(&request.webdav_state_root)
        .map_err(|error| format!("driver_root_failed:{error}"))?;
    fs::create_dir_all(&request.remote_root)
        .map_err(|error| format!("driver_root_failed:{error}"))?;

    let identity = RepositoryIdentity {
        profile_id: request.corpus.profile_id.clone(),
        data_root_id: request.corpus.data_root_id.clone(),
    };
    let canonical_identity = CanonicalIdentity {
        profile_id: request.corpus.profile_id.clone(),
        data_root_id: request.corpus.data_root_id.clone(),
    };
    let owner = Arc::new(Mutex::new(Repository::open_at(
        &request.runtime_root,
        identity.clone(),
        &request.corpus.clock,
    )?));
    let canonical = Arc::new(Mutex::new(CanonicalStore::open(
        &request.canonical_root,
        canonical_identity.clone(),
    )?));
    let canonical_before = tree(&request.canonical_root)?;
    let repository_port = Arc::new(RepositoryPort::new(Arc::clone(&owner)));
    let canonical_port = Arc::new(CanonicalStorePort::new(Arc::clone(&canonical)));
    let clock = request.corpus.clock.clone();
    let checkpoint_receipt = request
        .corpus
        .receipt_ids
        .first()
        .cloned()
        .ok_or_else(|| "fixture_receipt_missing".to_owned())?;
    let checkpoint = KnowledgeCheckpointApplication::with_runtime(
        repository_port.clone(),
        {
            let clock = clock.clone();
            Arc::new(move || clock.clone())
        },
        Arc::new(move || checkpoint_receipt.clone()),
    );
    let built_checkpoint = checkpoint.build_checkpoint()?;
    let initial_checkpoint_preview = checkpoint.preview_import(&built_checkpoint)?;
    let checkpoint_acknowledgement_code = checkpoint
        .apply_import(&KnowledgeCheckpointApplyRequest {
            receipt_id: initial_checkpoint_preview.receipt_id,
            checkpoint_hash: built_checkpoint.checkpoint_hash.clone(),
            acknowledge_full_replacement: false,
        })
        .expect_err("checkpoint acknowledgement must be required");
    let checkpoint_preview = checkpoint.preview_import(&built_checkpoint)?;
    let checkpoint_applied = checkpoint.apply_import(&KnowledgeCheckpointApplyRequest {
        receipt_id: checkpoint_preview.receipt_id.clone(),
        checkpoint_hash: built_checkpoint.checkpoint_hash.clone(),
        acknowledge_full_replacement: true,
    })?;
    let checkpoint_replay_code = checkpoint
        .apply_import(&KnowledgeCheckpointApplyRequest {
            receipt_id: checkpoint_preview.receipt_id.clone(),
            checkpoint_hash: built_checkpoint.checkpoint_hash.clone(),
            acknowledge_full_replacement: true,
        })
        .expect_err("checkpoint receipt must be single use");

    let durable_receipt = request
        .corpus
        .receipt_ids
        .get(1)
        .cloned()
        .ok_or_else(|| "fixture_receipt_missing".to_owned())?;
    let durable = Arc::new(DurableBundleApplication::acquire_for_parity(
        repository_port.clone(),
        canonical_port.clone(),
        clock.clone(),
        durable_receipt,
        "parity".into(),
    )?);
    let durable_export = durable.build_export()?;
    let durable_source = ExportSource {
        manifest_text: durable_export.manifest_text.clone(),
        assets: durable_export
            .assets
            .iter()
            .map(|asset| (asset.path.clone(), asset.text.clone()))
            .collect(),
    };
    let durable_preview = durable.preview_import(&durable_source)?;
    if durable_preview.receipt_id.is_empty() || durable_preview.manifest_hash.is_empty() {
        return Err("durable_parity_receipt_missing".into());
    }
    let durable_request = DurableImportApplyRequest {
        receipt_id: durable_preview.receipt_id.clone(),
        manifest_hash: durable_preview.manifest_hash.clone(),
        acknowledge_unbased_updates: false,
    };
    let durable_applied = durable.apply_import(&durable_request)?;
    let durable_replay_code = durable
        .apply_import(&durable_request)
        .expect_err("durable receipt must be single use");

    let state_store = Arc::new(FileStateStore {
        path: request.webdav_state_root.join("state.json"),
    });
    let scheduler = Arc::new(ImmediateScheduler {
        events: Mutex::new(Vec::new()),
    });
    let host = Arc::new(FileHost {
        root: request.remote_root.clone(),
        writes: Mutex::new(Vec::new()),
    });
    let webdav = WebDavSyncApplication::new(
        host.clone(),
        state_store.clone(),
        scheduler.clone(),
        durable.clone(),
        {
            let clock = clock.clone();
            Arc::new(move || clock.clone())
        },
    );
    let webdav_result = webdav.trigger_webdav_sync()?;

    let debug = DebugMaintenanceApplication::new(repository_port.clone(), canonical_port.clone());
    let debug_snapshot = debug.snapshot()?;
    let profiler: DebugProfilerResult = debug.inspect_profiler()?;

    let tables = owner
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?
        .table_snapshot()?;
    let canonical_tree = tree(&request.canonical_root)?;
    let remote_tree = tree(&request.remote_root)?;
    let writes = host
        .writes
        .lock()
        .map_err(|_| "remote_unavailable".to_owned())?
        .clone();
    let scheduler_events = scheduler
        .events
        .lock()
        .map_err(|_| "scheduler_unavailable".to_owned())?
        .clone();
    let persisted_state = state_store.load()?;

    checkpoint.shutdown(Duration::from_secs(1))?;
    durable.shutdown(Duration::from_secs(1))?;
    webdav.shutdown(Duration::from_secs(1))?;
    debug.shutdown(Duration::from_secs(1))?;
    drop(checkpoint);
    drop(debug);
    drop(webdav);
    drop(durable);
    drop(repository_port);
    drop(canonical_port);
    drop(owner);
    drop(canonical);

    let mut reopened = Repository::open_at(&request.runtime_root, identity, &request.corpus.clock)?;
    let reopen_tables = reopened.table_snapshot()?;
    let reopen_debug = reopened.capture_debug_projection()?;
    reopened.close()?;
    let reopened_canonical = CanonicalStore::open(&request.canonical_root, canonical_identity)?;
    drop(reopened_canonical);

    let report = json!({
        "schema":request.corpus.report_schema,
        "corpusVersion":request.corpus.schema,
        "driver":"development_only",
        "productionCapabilityRegistered":false,
        "knowledgeCheckpoint":{
            "built":{
                "contractVersion":built_checkpoint.contract_version,
                "counts":built_checkpoint.counts,
                "hashPresent":built_checkpoint.checkpoint_hash.starts_with("sha256:")
            },
            "preview":{
                "receiptId":checkpoint_preview.receipt_id,
                "diff":checkpoint_preview.diff,
                "overrideCount":checkpoint_preview.user_decision_overrides.len()
            },
            "acknowledgementCode":checkpoint_acknowledgement_code,
            "replayCode":checkpoint_replay_code,
            "applied":checkpoint_applied
        },
        "durableBundle":{
            "manifestVersion":durable_export.manifest.manifest_schema_version,
            "assetCount":durable_export.manifest.asset_count,
            "entityCount":durable_export.entries.len(),
            "manifestHashPresent":durable_export.manifest.manifest_hash.starts_with("sha256:"),
            "preview":{
                "ok":durable_preview.ok,
                "additions":durable_preview.additions,
                "updates":durable_preview.updates,
                "unchanged":durable_preview.unchanged
            },
            "applied":durable_applied,
            "replayCode":durable_replay_code
        },
        "webDavSync":{
            "queueState":webdav_result.queue_state,
            "lastRunStatus":webdav_result.last_run.as_ref().map(|run| run.status.clone()),
            "writes":writes,
            "schedulerEvents":scheduler_events
        },
        "debugMaintenance":{
            "snapshotStatus":debug_snapshot.status,
            "schemaId":debug_snapshot.schema_id,
            "profiler":profiler
        },
        "crossApplication":{
            "checkpointApplied":true,
            "bundleExported":true,
            "webDavPublished":true,
            "debugRead":true,
            "downstreamTriggered":false
        },
        "tables":tables,
        "canonical":{
            "before":canonical_before,
            "after":canonical_tree,
            "importBatchPresent":request.canonical_root.join("import-batch.json").exists()
        },
        "webdav":{
            "state":persisted_state,
            "remote":remote_tree
        },
        "reopen":{
            "tables":reopen_tables,
            "debugBasis":reopen_debug.basis,
            "webdavState":state_store.load()?
        }
    });
    println!(
        "{}",
        serde_json::to_string(&report).map_err(|_| "parity_report_invalid")?
    );
    Ok(())
}
