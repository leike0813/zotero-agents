use crate::runtime_contract::{NativeLaunchConfig, current_time_ms};
use crate::runtime_file_system::sync_directory;
use serde_json::Value;
use std::fmt;
use std::fs::{self, File, OpenOptions, TryLockError};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ServePhase {
    Startup,
    Running,
    Shutdown,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ServeIssue {
    phase: ServePhase,
    code: String,
}

impl ServeIssue {
    pub fn phase(&self) -> ServePhase {
        self.phase
    }

    pub fn code(&self) -> &str {
        &self.code
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ServeFailure {
    phase: ServePhase,
    code: String,
    cleanup_issues: Vec<ServeIssue>,
}

impl ServeFailure {
    pub fn phase(&self) -> ServePhase {
        self.phase
    }

    pub fn code(&self) -> &str {
        &self.code
    }

    pub fn cleanup_issues(&self) -> &[ServeIssue] {
        &self.cleanup_issues
    }
}

impl fmt::Display for ServeFailure {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}", self.code)?;
        if !self.cleanup_issues.is_empty() {
            write!(formatter, ":")?;
            for (index, issue) in self.cleanup_issues.iter().enumerate() {
                if index > 0 {
                    write!(formatter, ",")?;
                }
                write!(formatter, "{}", issue.code)?;
            }
        }
        Ok(())
    }
}

impl std::error::Error for ServeFailure {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum StopReason {
    AuthenticatedRequest,
    ParentInputClosed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum StopCause {
    Normal(StopReason),
    Failure(ServeIssue),
}

#[derive(Debug, Default)]
struct StopState {
    cause: Option<StopCause>,
    cleanup_issues: Vec<ServeIssue>,
    terminal: Option<Result<(), ServeFailure>>,
}

#[derive(Debug)]
struct StopInner {
    stopping: AtomicBool,
    state: Mutex<StopState>,
}

#[derive(Debug, Clone)]
pub(crate) struct StopSignal {
    inner: Arc<StopInner>,
}

impl StopSignal {
    pub(crate) fn new() -> Self {
        Self {
            inner: Arc::new(StopInner {
                stopping: AtomicBool::new(false),
                state: Mutex::new(StopState::default()),
            }),
        }
    }

    pub(crate) fn is_stopping(&self) -> bool {
        self.inner.stopping.load(Ordering::Acquire)
    }

    pub(crate) fn stopping_flag(&self) -> &AtomicBool {
        &self.inner.stopping
    }

    pub(crate) fn request_normal(&self, reason: StopReason) {
        let mut state = self
            .inner
            .state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if state.terminal.is_some() {
            return;
        }
        state.cause.get_or_insert(StopCause::Normal(reason));
        self.inner.stopping.store(true, Ordering::Release);
    }

    pub(crate) fn request_failure(&self, phase: ServePhase, code: impl Into<String>) {
        let issue = ServeIssue {
            phase,
            code: code.into(),
        };
        let mut state = self
            .inner
            .state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if state.terminal.is_some() {
            return;
        }
        match &state.cause {
            Some(StopCause::Failure(_)) => state.cleanup_issues.push(issue),
            Some(StopCause::Normal(_)) | None => state.cause = Some(StopCause::Failure(issue)),
        }
        self.inner.stopping.store(true, Ordering::Release);
    }

    pub(crate) fn record_cleanup_issue(&self, phase: ServePhase, code: impl Into<String>) {
        let mut state = self
            .inner
            .state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if state.terminal.is_none() {
            state.cleanup_issues.push(ServeIssue {
                phase,
                code: code.into(),
            });
        }
    }

    pub(crate) fn finish(&self) -> Result<(), ServeFailure> {
        let mut state = self
            .inner
            .state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if let Some(terminal) = &state.terminal {
            return terminal.clone();
        }
        let terminal = match state.cause.clone() {
            Some(StopCause::Failure(primary)) => Err(ServeFailure {
                phase: primary.phase,
                code: primary.code,
                cleanup_issues: state.cleanup_issues.clone(),
            }),
            Some(StopCause::Normal(_)) | None if state.cleanup_issues.is_empty() => Ok(()),
            Some(StopCause::Normal(_)) | None => Err(ServeFailure {
                phase: ServePhase::Shutdown,
                code: "shutdown_incomplete".to_owned(),
                cleanup_issues: state.cleanup_issues.clone(),
            }),
        };
        state.terminal = Some(terminal.clone());
        terminal
    }
}

fn atomic_write_json(path: &Path, value: &Value) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "runtime_path_invalid".to_owned())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary = parent.join(format!(
        ".discovery.tmp-{}-{}",
        std::process::id(),
        current_time_ms()?
    ));
    let bytes = serde_json::to_vec(value).map_err(|error| error.to_string())?;
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary)
        .map_err(|error| error.to_string())?;
    file.write_all(&bytes).map_err(|error| error.to_string())?;
    file.write_all(b"\n").map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())?;
    drop(file);
    #[cfg(windows)]
    {
        let previous = parent.join(format!(
            ".discovery.previous-{}-{}",
            std::process::id(),
            current_time_ms()?
        ));
        let replaced = path.exists();
        if replaced {
            fs::rename(path, &previous).map_err(|error| error.to_string())?;
        }
        if let Err(error) = fs::rename(&temporary, path) {
            if replaced {
                let _ = fs::rename(&previous, path);
            }
            return Err(error.to_string());
        }
        if replaced {
            fs::remove_file(previous).map_err(|error| error.to_string())?;
        }
    }
    #[cfg(not(windows))]
    fs::rename(&temporary, path).map_err(|error| error.to_string())?;
    sync_directory(parent)
}

#[derive(Debug)]
pub(crate) struct RuntimeOwnership {
    _production_lock: File,
    discovery_path: PathBuf,
    service_instance_id: String,
}

impl RuntimeOwnership {
    pub(crate) fn acquire(config: &NativeLaunchConfig) -> Result<Self, String> {
        let state_root = config
            .repository_db_path
            .parent()
            .ok_or_else(|| "production_lock_path_invalid".to_owned())?;
        fs::create_dir_all(state_root).map_err(|error| error.to_string())?;
        let lock_path = state_root.join("synthesis.lock");
        let lock = OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(lock_path)
            .map_err(|error| error.to_string())?;
        match lock.try_lock() {
            Ok(()) => {}
            Err(TryLockError::WouldBlock) => return Err("production_lock_conflict".into()),
            Err(TryLockError::Error(error)) => return Err(error.to_string()),
        }
        Ok(Self {
            _production_lock: lock,
            discovery_path: config.profile_runtime_root.join("discovery.json"),
            service_instance_id: format!("rust-{}", std::process::id()),
        })
    }

    pub(crate) fn publish_discovery(&self, document: &Value) -> Result<(), String> {
        atomic_write_json(&self.discovery_path, document)
    }

    pub(crate) fn service_instance_id(&self) -> &str {
        &self.service_instance_id
    }
}

impl Drop for RuntimeOwnership {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.discovery_path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runtime_contract::ProductionReverseHost;
    use serde_json::json;
    use synthesis_test_support::TestRoot;

    fn config(root: &Path) -> NativeLaunchConfig {
        NativeLaunchConfig {
            schema: "synthesis-sidecar-launch-config.v4".into(),
            profile_id: "1".repeat(64),
            library_id: 1,
            profile_runtime_root: root.join("runtime/session"),
            runtime_root_id: "2".repeat(64),
            data_root_id: "3".repeat(64),
            bundle_id: "4".repeat(64),
            implementation: "rust-native".into(),
            target: "linux-x64".into(),
            target_triple: "x86_64-unknown-linux-gnu".into(),
            build_fingerprint: "5".repeat(64),
            platform_signature: json!({
                "scheme":"not-applicable",
                "status":"not-applicable",
                "signer":null
            }),
            service_version: env!("CARGO_PKG_VERSION").into(),
            protocol_version: "synthesis-sidecar.v1".into(),
            schema_version: "synthesis-repository-foundation.v3".into(),
            supervisor_instance_id: "supervisor-1".into(),
            diagnostics_enabled: false,
            startup_trace: None,
            repository_db_path: root.join("state/synthesis.db"),
            canonical_root: root.join("data/synthesis"),
            reverse_host: ProductionReverseHost {
                host: "127.0.0.1".into(),
                port: 9134,
                authorization_token: "6".repeat(64),
            },
            client_token: "7".repeat(64),
            lifecycle_token: "8".repeat(64),
            port: 0,
        }
    }

    #[test]
    fn holds_the_production_lock_for_process_lifetime() {
        let root = TestRoot::new("synthesis-production-lock");
        let config = config(&root);
        let first = RuntimeOwnership::acquire(&config).expect("first lock");
        assert_eq!(
            RuntimeOwnership::acquire(&config).unwrap_err(),
            "production_lock_conflict"
        );
        drop(first);
        RuntimeOwnership::acquire(&config).expect("lock after release");
    }

    #[test]
    fn lifecycle_failure_promotes_a_pending_normal_stop() {
        let signal = StopSignal::new();
        signal.request_normal(StopReason::ParentInputClosed);
        signal.request_failure(ServePhase::Running, "listener_failed");

        let failure = signal.finish().expect_err("terminal failure");
        assert_eq!(failure.phase(), ServePhase::Running);
        assert_eq!(failure.code(), "listener_failed");
        assert!(failure.cleanup_issues().is_empty());
    }

    #[test]
    fn first_lifecycle_failure_stays_primary_and_later_failures_are_secondary() {
        let signal = StopSignal::new();
        signal.request_failure(ServePhase::Running, "listener_failed");
        signal.request_failure(ServePhase::Shutdown, "handler_owner_failed");
        signal.record_cleanup_issue(ServePhase::Shutdown, "repository_close_failed");

        let failure = signal.finish().expect_err("terminal failure");
        assert_eq!(failure.code(), "listener_failed");
        assert_eq!(
            failure
                .cleanup_issues()
                .iter()
                .map(|issue| issue.code())
                .collect::<Vec<_>>(),
            ["handler_owner_failed", "repository_close_failed"]
        );
    }

    #[test]
    fn terminal_result_is_formed_once() {
        let signal = StopSignal::new();
        signal.request_failure(ServePhase::Running, "listener_failed");
        let first = signal.finish().expect_err("first terminal");

        signal.record_cleanup_issue(ServePhase::Shutdown, "late_cleanup_failure");
        let second = signal.finish().expect_err("same terminal");

        assert_eq!(first, second);
        assert!(second.cleanup_issues().is_empty());
    }

    #[test]
    fn cleanup_issue_turns_a_normal_stop_into_shutdown_incomplete() {
        let signal = StopSignal::new();
        signal.request_normal(StopReason::AuthenticatedRequest);
        signal.record_cleanup_issue(ServePhase::Shutdown, "handler_drain_timeout");

        let failure = signal.finish().expect_err("incomplete shutdown");
        assert_eq!(failure.phase(), ServePhase::Shutdown);
        assert_eq!(failure.code(), "shutdown_incomplete");
        assert_eq!(failure.cleanup_issues()[0].code(), "handler_drain_timeout");
    }
}
