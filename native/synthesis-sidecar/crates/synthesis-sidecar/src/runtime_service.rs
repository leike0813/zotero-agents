use std::fs;
use std::path::Path;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use synthesis_application::RepositoryPort;
use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
use synthesis_repository::{Repository, RepositoryIdentity, prepare_production_schema};
use synthesis_sidecar::production_capabilities::{
    production_client_capabilities, production_client_operation_metadata,
    production_ready_client_capabilities,
};
use synthesis_sidecar::runtime_contract::{current_time_ms, read_native_launch_config};

use crate::runtime_capabilities::ServeState;
use crate::runtime_diagnostics::configure_debug_events;
use crate::runtime_lifecycle::RuntimeOwnership;
use crate::runtime_production_ports::build_production_applications;
use crate::runtime_reverse_host::probe_reverse_host;
use crate::runtime_server_loop::run_sidecar_listener;
use crate::runtime_transfer::NativeTransferOwner;
use crate::runtime_worker_pool::NativeComputePool;

fn database_sidecars(database_path: &Path) -> [std::path::PathBuf; 2] {
    [
        std::path::PathBuf::from(format!("{}-wal", database_path.display())),
        std::path::PathBuf::from(format!("{}-shm", database_path.display())),
    ]
}

fn initialize_empty_production(
    database_path: &Path,
    canonical_root: &Path,
    repository_identity: RepositoryIdentity,
    canonical_identity: CanonicalIdentity,
) -> Result<(), String> {
    let repository = Repository::initialize_production(database_path, repository_identity)?;
    repository.close()?;
    match CanonicalStore::initialize_production(canonical_root, canonical_identity) {
        Ok(canonical) => canonical.close(),
        Err(error) => {
            let _ = fs::remove_file(database_path);
            for sidecar in database_sidecars(database_path) {
                let _ = fs::remove_file(sidecar);
            }
            Err(error)
        }
    }
}

fn ensure_production_source(
    database_path: &Path,
    canonical_root: &Path,
    repository_identity: &RepositoryIdentity,
    canonical_identity: &CanonicalIdentity,
) -> Result<(), String> {
    let database_exists = database_path.exists();
    let canonical_exists = canonical_root.exists();
    let sqlite_sidecar_exists = database_sidecars(database_path)
        .iter()
        .any(|path| path.exists());
    match (database_exists, canonical_exists, sqlite_sidecar_exists) {
        (false, false, false) => initialize_empty_production(
            database_path,
            canonical_root,
            repository_identity.clone(),
            canonical_identity.clone(),
        ),
        (true, true, _) => Ok(()),
        _ => Err("synthesis_source_state_incomplete".into()),
    }
}

pub(crate) fn serve(config_path: &str) -> Result<(), String> {
    production_client_capabilities()?;
    production_ready_client_capabilities()?;
    let production_client_operations = production_client_operation_metadata()?;
    let config = read_native_launch_config(Path::new(config_path))?;
    configure_debug_events(config.diagnostics_enabled);
    probe_reverse_host(&config)?;
    let ownership = Arc::new(RuntimeOwnership::acquire(&config)?);
    let repository_identity = RepositoryIdentity {
        profile_id: config.profile_id.clone(),
        data_root_id: config.data_root_id.clone(),
    };
    let canonical_identity = CanonicalIdentity {
        profile_id: config.profile_id.clone(),
        data_root_id: config.data_root_id.clone(),
    };
    ensure_production_source(
        &config.repository_db_path,
        &config.canonical_root,
        &repository_identity,
        &canonical_identity,
    )?;
    let migration_backup_root = config
        .repository_db_path
        .parent()
        .ok_or_else(|| "repository_production_path_invalid".to_owned())?
        .join("synthesis-migration-backups");
    prepare_production_schema(&config.repository_db_path, &migration_backup_root)?;
    let repository = Repository::open_production(
        &config.repository_db_path,
        repository_identity,
        &current_time_ms()?.to_string(),
    )?;
    let canonical = CanonicalStore::open_production(&config.canonical_root, canonical_identity)?;
    let repository_id = repository.repository_id().to_owned();
    let repository = Arc::new(Mutex::new(repository));
    let canonical = Arc::new(Mutex::new(canonical));
    let compute_pool = Arc::new(NativeComputePool::new());
    let webdav_state_path = config
        .repository_db_path
        .parent()
        .ok_or_else(|| "repository_production_path_invalid".to_owned())?
        .join("native-webdav-state.json");
    let config = Arc::new(config);
    let repository_port = Arc::new(RepositoryPort::new_with_readers(
        Arc::clone(&repository),
        4,
    )?);
    let applications = build_production_applications(
        repository_port,
        Arc::clone(&canonical),
        Arc::clone(&compute_pool),
        Some(Arc::clone(&config)),
        ownership.service_instance_id.clone(),
        webdav_state_path,
    );
    crate::runtime_public_maintenance_operation::reconcile_restart(
        &applications,
        &synthesis_protocol::utc_now_iso8601(),
    )?;
    let canonical_port = applications.canonical.as_ref().clone();
    let stopping = Arc::new(AtomicBool::new(false));
    let transfer = NativeTransferOwner::new(&config.profile_runtime_root)?;
    let state = Arc::new(ServeState {
        service_instance_id: ownership.service_instance_id.clone(),
        profile: config.profile_id.clone(),
        config,
        repository_id,
        repository,
        applications: Arc::new(applications),
        production_client_operations,
        runtime_ownership: Arc::clone(&ownership),
        canonical: canonical_port,
        stopping: Arc::clone(&stopping),
        compute_pool,
        transfer: Mutex::new(transfer),
    });
    drop(canonical);
    let result = run_sidecar_listener(state);
    drop(ownership);
    result
}

#[cfg(test)]
mod service_tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::thread;
    use std::time::Duration;

    static ROOT_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    fn production_root(label: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-production-{label}-{}-{}",
            std::process::id(),
            ROOT_SEQUENCE.fetch_add(1, Ordering::Relaxed)
        ))
    }

    fn identities() -> (RepositoryIdentity, CanonicalIdentity) {
        (
            RepositoryIdentity {
                profile_id: "1".repeat(64),
                data_root_id: "2".repeat(64),
            },
            CanonicalIdentity {
                profile_id: "1".repeat(64),
                data_root_id: "2".repeat(64),
            },
        )
    }

    #[test]
    fn initializes_only_a_fully_empty_source_and_creates_no_migration_backup() {
        let root = production_root("empty");
        let database = root.join("state/synthesis.db");
        let canonical = root.join("data/synthesis");
        let (repository_identity, canonical_identity) = identities();
        ensure_production_source(
            &database,
            &canonical,
            &repository_identity,
            &canonical_identity,
        )
        .expect("empty source");
        assert!(database.exists());
        assert!(canonical.exists());
        assert!(!root.join("state/synthesis-migration-backups").exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_partial_source_state_without_writing_the_missing_half() {
        let root = production_root("partial");
        let database = root.join("state/synthesis.db");
        let canonical = root.join("data/synthesis");
        fs::create_dir_all(database.parent().unwrap()).unwrap();
        fs::write(&database, b"partial").unwrap();
        let (repository_identity, canonical_identity) = identities();
        assert_eq!(
            ensure_production_source(
                &database,
                &canonical,
                &repository_identity,
                &canonical_identity,
            )
            .unwrap_err(),
            "synthesis_source_state_incomplete"
        );
        assert!(!canonical.exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn native_compute_pool_bounds_queue_and_fuses_failures() {
        let pool = Arc::new(NativeComputePool::new());
        let stopping = Arc::new(AtomicBool::new(false));
        let active = pool.admit(&stopping).expect("active admission");
        let mut waiting = Vec::new();
        for _ in 0..2 {
            let pool = Arc::clone(&pool);
            let stopping = Arc::clone(&stopping);
            waiting.push(thread::spawn(move || {
                let _admission = pool.admit(&stopping).expect("queued admission");
            }));
        }
        for _ in 0..100 {
            if pool.snapshot(false).expect("snapshot")["queued"].as_u64() == Some(2) {
                break;
            }
            thread::sleep(Duration::from_millis(1));
        }
        assert_eq!(
            pool.admit(&stopping).err(),
            Some("worker_busy"),
            "third queued task must fail immediately"
        );
        drop(active);
        for waiter in waiting {
            waiter.join().expect("queued task");
        }
        for _ in 0..3 {
            pool.record_failure();
        }
        assert_eq!(
            pool.admit(&stopping).err(),
            Some("worker_unavailable"),
            "three consecutive runtime failures fuse compute"
        );
        assert_eq!(pool.snapshot(false).expect("snapshot")["state"], "degraded");
    }
}
