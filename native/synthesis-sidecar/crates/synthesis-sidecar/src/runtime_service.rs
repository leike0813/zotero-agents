use crate::runtime_contract::{
    NativeLaunchConfig, SIDECAR_CAPABILITIES, current_time_ms, read_native_launch_config,
};
use serde_json::{Value, json};
use std::fs;
use std::io::{self, Read};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use synthesis_application::{RepositoryPort, project_legacy_canonical_topic};
use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
use synthesis_repository::{
    Repository, RepositoryIdentity, legacy_production_topic_inventory,
    prepare_production_schema_with_legacy_topics,
};

use crate::runtime_background_tasks::BackgroundTaskOwner;
use crate::runtime_capabilities::RequestContext;
use crate::runtime_diagnostics::{
    NativeDiagnosticEvent, configure_debug_events, emit_debug, emit_startup,
    install_observation_context,
};
use crate::runtime_lifecycle::{
    RuntimeOwnership, ServeFailure, ServePhase, StopReason, StopSignal,
};
use crate::runtime_production_client::{ProductionClientCatalog, ProductionClientRuntime};
use crate::runtime_production_ports::{ProductionApplications, build_production_applications};
use crate::runtime_reverse_host::probe_reverse_host;
use crate::runtime_server_loop::SidecarTransport;
use crate::runtime_transfer::NativeTransferOwner;
use crate::runtime_worker_pool::NativeComputePool;

const SHUTDOWN_TIMEOUT: Duration = Duration::from_millis(500);
const TRANSFER_REAP_INTERVAL_MS: u64 = 30_000;

fn stable_startup_code(error: &str) -> String {
    let candidate = error.split(':').next().unwrap_or_default();
    if !candidate.is_empty()
        && candidate.len() <= 128
        && candidate.bytes().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || b"_.-".contains(&byte)
        })
    {
        candidate.to_owned()
    } else {
        "sidecar_startup_failed".to_owned()
    }
}

fn startup_step<T>(
    phase: &'static str,
    operation: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    emit_startup(NativeDiagnosticEvent::new("lifecycle", phase, "started"));
    match operation() {
        Ok(value) => {
            emit_startup(NativeDiagnosticEvent::new("lifecycle", phase, "succeeded"));
            Ok(value)
        }
        Err(error) => {
            emit_startup(
                NativeDiagnosticEvent::new("lifecycle", phase, "failed")
                    .code(stable_startup_code(&error)),
            );
            Err(error)
        }
    }
}

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

#[derive(Default)]
struct StartupOwnership {
    runtime: Option<RuntimeOwnership>,
    repository: Option<Arc<Mutex<Repository>>>,
    canonical: Option<Arc<Mutex<CanonicalStore>>>,
}

impl StartupOwnership {
    fn commit(&mut self) -> Result<RuntimeOwnership, String> {
        self.repository.take();
        self.canonical.take();
        self.runtime
            .take()
            .ok_or_else(|| "runtime_owner_missing".to_owned())
    }

    fn rollback(&mut self, stop_signal: &StopSignal) {
        self.runtime.take();
        if let Some(canonical) = self.canonical.take()
            && let Err(error) = close_canonical(canonical)
        {
            stop_signal.record_cleanup_issue(ServePhase::Shutdown, error);
        }
        if let Some(repository) = self.repository.take()
            && let Err(error) = close_repository(repository)
        {
            stop_signal.record_cleanup_issue(ServePhase::Shutdown, error);
        }
    }
}

impl Drop for StartupOwnership {
    fn drop(&mut self) {
        self.runtime.take();
        if let Some(canonical) = self.canonical.take() {
            let _ = close_canonical(canonical);
        }
        if let Some(repository) = self.repository.take() {
            let _ = close_repository(repository);
        }
    }
}

struct RunningRuntime {
    stop_signal: StopSignal,
    ownership: Option<RuntimeOwnership>,
    context: Option<Arc<RequestContext>>,
    transport: Option<SidecarTransport>,
    repository: Option<Arc<Mutex<Repository>>>,
    canonical: Option<Arc<Mutex<CanonicalStore>>>,
    applications: Option<Arc<ProductionApplications>>,
    compute_pool: Option<Arc<NativeComputePool>>,
    transfer: Option<Arc<Mutex<NativeTransferOwner>>>,
    background_tasks: Option<Arc<BackgroundTaskOwner>>,
}

impl RunningRuntime {
    fn start(config_path: &Path) -> Result<Self, ServeFailure> {
        let stop_signal = StopSignal::new();
        let mut startup = StartupOwnership::default();
        let composed = (|| -> Result<Self, String> {
            let config = read_native_launch_config(config_path)?;
            configure_debug_events(config.diagnostics_enabled);
            let startup_trace = config.startup_trace.clone();
            install_observation_context(startup_trace.as_ref());
            emit_startup(NativeDiagnosticEvent::new(
                "lifecycle",
                "config-validate",
                "succeeded",
            ));
            let production_client_catalog = Arc::new(
                ProductionClientCatalog::from_embedded().map_err(|error| error.to_string())?,
            );
            startup_step("reverse-host-probe", || probe_reverse_host(&config))?;
            startup.runtime = Some(startup_step("owner-acquire", || {
                RuntimeOwnership::acquire(&config)
            })?);
            let service_instance_id = startup
                .runtime
                .as_ref()
                .expect("runtime ownership was assigned")
                .service_instance_id()
                .to_owned();
            let repository_identity = RepositoryIdentity {
                profile_id: config.profile_id.clone(),
                data_root_id: config.data_root_id.clone(),
            };
            let canonical_identity = CanonicalIdentity {
                profile_id: config.profile_id.clone(),
                data_root_id: config.data_root_id.clone(),
            };
            startup_step("source-validate", || {
                ensure_production_source(
                    &config.repository_db_path,
                    &config.canonical_root,
                    &repository_identity,
                    &canonical_identity,
                )
            })?;
            let migration_backup_root = config
                .repository_db_path
                .parent()
                .ok_or_else(|| "repository_production_path_invalid".to_owned())?
                .join("synthesis-migration-backups");
            let legacy_topics =
                startup_step(
                    "source-classify",
                    || match legacy_production_topic_inventory(&config.repository_db_path)? {
                        Some(inventory) => {
                            let topics = CanonicalStore::preflight_legacy_production(
                                &config.canonical_root,
                                &inventory.canonical_topic_ids,
                                &inventory.graph_only_topic_ids,
                            )?;
                            let projected = topics
                                .iter()
                                .map(project_legacy_canonical_topic)
                                .collect::<Result<Vec<_>, _>>()?;
                            let projected_topic_ids = projected
                                .iter()
                                .map(|(state, _)| state.topic_id.clone())
                                .collect::<std::collections::BTreeSet<_>>();
                            if inventory.canonical_topic_ids != projected_topic_ids {
                                return Err("canonical_legacy_topic_sources_mismatch".into());
                            }
                            Ok(projected)
                        }
                        None => Ok(Vec::new()),
                    },
                )?;
            startup_step("repository-migrate", || {
                prepare_production_schema_with_legacy_topics(
                    &config.repository_db_path,
                    &migration_backup_root,
                    &legacy_topics,
                )
            })?;
            let repository = Arc::new(Mutex::new(startup_step("repository-open", || {
                Repository::open_production(
                    &config.repository_db_path,
                    repository_identity,
                    &current_time_ms()?.to_string(),
                )
            })?));
            startup.repository = Some(Arc::clone(&repository));
            let canonical = Arc::new(Mutex::new(startup_step("canonical-open", || {
                CanonicalStore::open_production(&config.canonical_root, canonical_identity)
            })?));
            startup.canonical = Some(Arc::clone(&canonical));
            let repository_id = repository
                .lock()
                .map_err(|_| "repository_unavailable".to_owned())?
                .repository_id()
                .to_owned();
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
            let applications = Arc::new(startup_step("application-compose", || {
                build_production_applications(
                    repository_port,
                    Arc::clone(&canonical),
                    Arc::clone(&compute_pool),
                    Some(Arc::clone(&config)),
                    service_instance_id.clone(),
                    webdav_state_path,
                )
            })?);
            crate::runtime_public_maintenance_operation::reconcile_restart(
                applications.as_ref(),
                &synthesis_protocol::utc_now_iso8601(),
            )?;
            let canonical_port = applications.canonical.as_ref().clone();
            let transfer = Arc::new(Mutex::new(NativeTransferOwner::new(
                &config.profile_runtime_root,
                production_client_catalog.membership(),
            )?));
            let background_tasks = BackgroundTaskOwner::new();
            let production_client = Arc::new(ProductionClientRuntime::new(
                production_client_catalog,
                Arc::clone(&applications),
                Arc::clone(&transfer),
                Arc::clone(&background_tasks),
            ));
            let context = Arc::new(RequestContext::new(
                Arc::clone(&config),
                service_instance_id.clone(),
                repository_id,
                Arc::clone(&applications),
                production_client,
                canonical_port,
                stop_signal.clone(),
                Arc::clone(&compute_pool),
                Arc::clone(&transfer),
                Arc::clone(&background_tasks),
            ));
            let transport = startup_step("listener-bind", SidecarTransport::bind)?;
            let port = transport.port()?;
            let discovery = discovery_document(&config, &service_instance_id, port);
            startup_step("discovery-publish", || {
                startup
                    .runtime
                    .as_ref()
                    .expect("runtime ownership was assigned")
                    .publish_discovery(&discovery)
            })?;
            println!(
                "{}",
                json!({
                    "type":"listening",
                    "port":port,
                    "buildFingerprint":config.build_fingerprint
                })
            );
            let ownership = startup.commit()?;
            Ok(Self {
                stop_signal: stop_signal.clone(),
                ownership: Some(ownership),
                context: Some(context),
                transport: Some(transport),
                repository: Some(repository),
                canonical: Some(canonical),
                applications: Some(applications),
                compute_pool: Some(compute_pool),
                transfer: Some(transfer),
                background_tasks: Some(background_tasks),
            })
        })();
        match composed {
            Ok(runtime) => Ok(runtime),
            Err(code) => {
                stop_signal.request_failure(ServePhase::Startup, code);
                startup.rollback(&stop_signal);
                Err(stop_signal
                    .finish()
                    .expect_err("startup failure must form a terminal failure"))
            }
        }
    }

    fn run(mut self) -> Result<(), ServeFailure> {
        watch_parent_input(self.stop_signal.clone());
        let mut next_transfer_reap_ms = match current_time_ms() {
            Ok(now_ms) => now_ms.saturating_add(TRANSFER_REAP_INTERVAL_MS),
            Err(error) => {
                self.stop_signal.request_failure(ServePhase::Running, error);
                0
            }
        };
        while !self.stop_signal.is_stopping() {
            let background = self
                .background_tasks
                .as_ref()
                .expect("running background task owner")
                .reap_finished();
            if background.panicked > 0 {
                emit_debug(|| {
                    NativeDiagnosticEvent::new("process", "background-task-panicked", "failed")
                        .warning_count(background.panicked)
                });
            }
            let now_ms = match current_time_ms() {
                Ok(now_ms) => now_ms,
                Err(error) => {
                    self.stop_signal.request_failure(ServePhase::Running, error);
                    break;
                }
            };
            if now_ms >= next_transfer_reap_ms {
                match self
                    .transfer
                    .as_ref()
                    .expect("running transfer owner")
                    .lock()
                {
                    Ok(mut transfer) => transfer.reap(now_ms),
                    Err(_) => {
                        self.stop_signal
                            .request_failure(ServePhase::Running, "transfer_owner_unavailable");
                        break;
                    }
                }
                next_transfer_reap_ms = now_ms.saturating_add(TRANSFER_REAP_INTERVAL_MS);
            }
            let activity = self.transport.as_mut().expect("running transport").poll(
                self.context.as_ref().expect("running request context"),
                &self.stop_signal,
            );
            match activity {
                Ok(true) => {}
                Ok(false) => thread::sleep(Duration::from_millis(5)),
                Err(error) => {
                    self.stop_signal.request_failure(ServePhase::Running, error);
                    break;
                }
            }
        }
        self.shutdown()
    }

    fn shutdown(mut self) -> Result<(), ServeFailure> {
        let cleanup_deadline = Instant::now() + SHUTDOWN_TIMEOUT;
        self.transport
            .as_mut()
            .expect("running transport")
            .begin_shutdown();
        let background_tasks = self
            .background_tasks
            .as_ref()
            .expect("running background task owner");
        background_tasks.stop_admission();
        let applications = self.applications.as_ref().expect("running applications");
        if let Err(error) = applications.canonical_autosync.shutdown() {
            self.stop_signal
                .record_cleanup_issue(ServePhase::Shutdown, error);
        }
        if let Err(error) = applications
            .references
            .quiesce(cleanup_deadline.saturating_duration_since(Instant::now()))
        {
            self.stop_signal
                .record_cleanup_issue(ServePhase::Shutdown, error);
        }
        self.compute_pool
            .as_ref()
            .expect("running compute pool")
            .stop();
        match self
            .transfer
            .as_ref()
            .expect("running transfer owner")
            .lock()
        {
            Ok(mut transfer) => transfer.request_stop(),
            Err(_) => self
                .stop_signal
                .record_cleanup_issue(ServePhase::Shutdown, "transfer_owner_unavailable"),
        }
        let background = background_tasks.stop_and_drain_until(cleanup_deadline);
        if background.panicked > 0 {
            self.stop_signal.record_cleanup_issue(
                ServePhase::Shutdown,
                format!("background_task_panicked:{}", background.panicked),
            );
        }
        if background.remaining > 0 {
            self.stop_signal.record_cleanup_issue(
                ServePhase::Shutdown,
                format!("background_task_drain_timeout:{}", background.remaining),
            );
        } else {
            match self
                .transfer
                .as_ref()
                .expect("running transfer owner")
                .lock()
            {
                Ok(mut transfer) => transfer.finalize_stop(),
                Err(_) => self
                    .stop_signal
                    .record_cleanup_issue(ServePhase::Shutdown, "transfer_owner_unavailable"),
            }
        }
        let transport = self
            .transport
            .as_mut()
            .expect("running transport")
            .drain(cleanup_deadline);
        if transport.handler_panicked {
            self.stop_signal
                .record_cleanup_issue(ServePhase::Shutdown, "http_handler_panicked");
        }
        if transport.pending_handlers > 0 {
            self.stop_signal.record_cleanup_issue(
                ServePhase::Shutdown,
                format!("http_handler_drain_timeout:{}", transport.pending_handlers),
            );
        }
        if let Err(error) = applications
            .webdav
            .shutdown(cleanup_deadline.saturating_duration_since(Instant::now()))
        {
            self.stop_signal
                .record_cleanup_issue(ServePhase::Shutdown, error);
        }
        let can_close_storage = background.remaining == 0 && transport.pending_handlers == 0;
        self.transport.take();
        match self.context.take().map(Arc::try_unwrap) {
            Some(Ok(context)) => drop(context),
            Some(Err(context)) if can_close_storage => {
                drop(context);
                self.stop_signal
                    .record_cleanup_issue(ServePhase::Shutdown, "service_owner_leaked");
            }
            Some(Err(context)) => drop(context),
            None => {}
        }
        self.applications.take();
        self.compute_pool.take();
        self.transfer.take();
        self.background_tasks.take();
        if can_close_storage {
            if let Some(canonical) = self.canonical.take()
                && let Err(error) = close_canonical(canonical)
            {
                self.stop_signal
                    .record_cleanup_issue(ServePhase::Shutdown, error);
            }
            if let Some(repository) = self.repository.take()
                && let Err(error) = close_repository(repository)
            {
                self.stop_signal
                    .record_cleanup_issue(ServePhase::Shutdown, error);
            }
        } else {
            self.canonical.take();
            self.repository.take();
        }
        self.ownership.take();
        self.stop_signal.finish()
    }
}

fn close_canonical(canonical: Arc<Mutex<CanonicalStore>>) -> Result<(), String> {
    Arc::try_unwrap(canonical)
        .map_err(|_| "canonical_store_owner_leaked".to_owned())?
        .into_inner()
        .map_err(|_| "canonical_store_unavailable".to_owned())?
        .close()
}

fn close_repository(repository: Arc<Mutex<Repository>>) -> Result<(), String> {
    Arc::try_unwrap(repository)
        .map_err(|_| "repository_owner_leaked".to_owned())?
        .into_inner()
        .map_err(|_| "repository_unavailable".to_owned())?
        .close()
}

fn discovery_document(config: &NativeLaunchConfig, service_instance_id: &str, port: u16) -> Value {
    json!({
        "schema":"synthesis-sidecar-discovery.v5",
        "profileId":config.profile_id,
        "supervisorInstanceId":config.supervisor_instance_id,
        "serviceInstanceId":service_instance_id,
        "bundleId":config.bundle_id,
        "implementation":config.implementation,
        "target":config.target,
        "targetTriple":config.target_triple,
        "buildFingerprint":config.build_fingerprint,
        "platformSignature":config.platform_signature,
        "serviceVersion":config.service_version,
        "protocolVersion":config.protocol_version,
        "schemaVersion":config.schema_version,
        "runtimeRootId":config.runtime_root_id,
        "dataRootId":config.data_root_id,
        "host":"127.0.0.1",
        "port":port,
        "pid":std::process::id(),
        "lifecycleState":"ready",
        "tokenLocator":"supervisor-session",
        "capabilities":SIDECAR_CAPABILITIES,
    })
}

fn watch_parent_input(stop_signal: StopSignal) {
    thread::spawn(move || {
        let mut buffer = [0_u8; 1];
        while io::stdin().read(&mut buffer).is_ok_and(|size| size > 0) {}
        stop_signal.request_normal(StopReason::ParentInputClosed);
    });
}

pub fn serve(config_path: &Path) -> Result<(), ServeFailure> {
    RunningRuntime::start(config_path)?.run()
}

#[cfg(test)]
mod service_tests {
    use super::*;
    use std::sync::atomic::AtomicBool;
    use std::thread;
    use std::time::Duration;
    use synthesis_test_support::TestRoot;

    fn production_root(label: &str) -> TestRoot {
        TestRoot::new(&format!("synthesis-production-{label}"))
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
