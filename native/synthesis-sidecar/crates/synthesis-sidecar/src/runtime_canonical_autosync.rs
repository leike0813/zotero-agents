use serde_json::Value;
use std::sync::{Arc, Condvar, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use synthesis_application::WebDavSyncApplication;

use crate::runtime_diagnostics::{NativeDiagnosticEvent, emit_debug};

pub(crate) const CANONICAL_AUTOSYNC_DEBOUNCE: Duration = Duration::from_secs(5);

pub(crate) trait CanonicalAutosyncTarget: Send + Sync + 'static {
    fn trigger_auto_sync(&self) -> Result<(), String>;
    fn abort(&self);
}

impl CanonicalAutosyncTarget for WebDavSyncApplication {
    fn trigger_auto_sync(&self) -> Result<(), String> {
        self.trigger_webdav_auto_sync().map(|_| ())
    }

    fn abort(&self) {
        let _ = WebDavSyncApplication::abort(self);
    }
}

#[derive(Default)]
struct CoordinatorState {
    accepting: bool,
    stopping: bool,
    active_maintenance: usize,
    dirty: bool,
    deadline: Option<Instant>,
}

struct CoordinatorShared {
    state: Mutex<CoordinatorState>,
    changed: Condvar,
    debounce: Duration,
}

impl CoordinatorShared {
    fn mark_dirty(&self) {
        let Ok(mut state) = self.state.lock() else {
            return;
        };
        if !state.accepting || state.stopping {
            return;
        }
        state.dirty = true;
        if state.active_maintenance == 0 {
            state.deadline = Some(Instant::now() + self.debounce);
        }
        self.changed.notify_all();
    }

    fn finish_maintenance(&self, mutated: bool) {
        let Ok(mut state) = self.state.lock() else {
            return;
        };
        state.active_maintenance = state.active_maintenance.saturating_sub(1);
        if mutated && state.accepting && !state.stopping {
            state.dirty = true;
        }
        if state.active_maintenance == 0 && state.dirty && state.accepting && !state.stopping {
            state.deadline = Some(Instant::now() + self.debounce);
        }
        self.changed.notify_all();
    }
}

pub(crate) struct CanonicalMaintenanceGuard {
    shared: Arc<CoordinatorShared>,
    capability: &'static str,
    mutated: bool,
}

impl CanonicalMaintenanceGuard {
    pub(crate) fn observe(&mut self, result: &Value, write_count: u64) {
        self.mutated |= canonical_commit(self.capability, result, write_count);
    }
}

impl Drop for CanonicalMaintenanceGuard {
    fn drop(&mut self) {
        self.shared.finish_maintenance(self.mutated);
    }
}

pub(crate) struct CanonicalAutosyncCoordinator {
    shared: Arc<CoordinatorShared>,
    target: Arc<dyn CanonicalAutosyncTarget>,
    worker: Mutex<Option<JoinHandle<()>>>,
}

impl CanonicalAutosyncCoordinator {
    pub(crate) fn new<T>(target: Arc<T>, debounce: Duration) -> Result<Self, String>
    where
        T: CanonicalAutosyncTarget,
    {
        let target: Arc<dyn CanonicalAutosyncTarget> = target;
        let shared = Arc::new(CoordinatorShared {
            state: Mutex::new(CoordinatorState {
                accepting: true,
                ..CoordinatorState::default()
            }),
            changed: Condvar::new(),
            debounce,
        });
        let worker_shared = Arc::clone(&shared);
        let worker_target = Arc::clone(&target);
        let worker = thread::Builder::new()
            .name("synthesis-canonical-autosync".into())
            .spawn(move || run_worker(worker_shared, worker_target))
            .map_err(|_| "canonical_autosync_worker_unavailable".to_owned())?;
        Ok(Self {
            shared,
            target,
            worker: Mutex::new(Some(worker)),
        })
    }

    pub(crate) fn observe_commit(&self, capability: &str, result: &Value, write_count: u64) {
        if canonical_commit(capability, result, write_count) {
            self.shared.mark_dirty();
        }
    }

    pub(crate) fn begin_maintenance(&self, capability: &str) -> Option<CanonicalMaintenanceGuard> {
        let capability = canonical_maintenance_capability(capability)?;
        let mut state = self.shared.state.lock().ok()?;
        if !state.accepting || state.stopping {
            return None;
        }
        state.active_maintenance = state.active_maintenance.saturating_add(1);
        state.deadline = None;
        Some(CanonicalMaintenanceGuard {
            shared: Arc::clone(&self.shared),
            capability,
            mutated: false,
        })
    }

    pub(crate) fn cancel_pending(&self) {
        if let Ok(mut state) = self.shared.state.lock() {
            state.dirty = false;
            state.deadline = None;
            self.shared.changed.notify_all();
        }
    }

    pub(crate) fn shutdown(&self) -> Result<(), String> {
        if let Ok(mut state) = self.shared.state.lock() {
            state.accepting = false;
            state.stopping = true;
            state.dirty = false;
            state.deadline = None;
            self.shared.changed.notify_all();
        }
        self.target.abort();
        let worker = self
            .worker
            .lock()
            .map_err(|_| "canonical_autosync_worker_unavailable".to_owned())?
            .take();
        if worker.is_some_and(|worker| worker.join().is_err()) {
            Err("canonical_autosync_worker_panicked".into())
        } else {
            Ok(())
        }
    }
}

impl Drop for CanonicalAutosyncCoordinator {
    fn drop(&mut self) {
        let _ = self.shutdown();
    }
}

fn run_worker(shared: Arc<CoordinatorShared>, target: Arc<dyn CanonicalAutosyncTarget>) {
    let Ok(mut state) = shared.state.lock() else {
        return;
    };
    loop {
        if state.stopping {
            return;
        }
        let Some(deadline) = state.deadline.filter(|_| state.active_maintenance == 0) else {
            let Ok(next) = shared.changed.wait(state) else {
                return;
            };
            state = next;
            continue;
        };
        let remaining = deadline.saturating_duration_since(Instant::now());
        if !remaining.is_zero() {
            let Ok((next, _)) = shared.changed.wait_timeout(state, remaining) else {
                return;
            };
            state = next;
            continue;
        }
        if state.deadline != Some(deadline) || state.active_maintenance != 0 || !state.dirty {
            continue;
        }
        state.deadline = None;
        state.dirty = false;
        drop(state);
        if let Err(code) = target.trigger_auto_sync() {
            emit_debug(|| {
                NativeDiagnosticEvent::new("operation", "canonical-autosync", "failed").code(code)
            });
        }
        let Ok(next) = shared.state.lock() else {
            return;
        };
        state = next;
    }
}

fn canonical_maintenance_capability(capability: &str) -> Option<&'static str> {
    match capability {
        "client.startReferenceSidecarRefresh" => Some("client.startReferenceSidecarRefresh"),
        "client.refreshReferenceSidecarNow" => Some("client.refreshReferenceSidecarNow"),
        "client.retryReferenceSidecarRefresh" => Some("client.retryReferenceSidecarRefresh"),
        _ => None,
    }
}

pub(crate) fn canonical_commit(capability: &str, result: &Value, write_count: u64) -> bool {
    if write_count == 0 {
        return false;
    }
    let status = || result.get("status").and_then(Value::as_str);
    match capability {
        "client.applyTopicSynthesisResult" => status() == Some("persisted"),
        "client.deleteTopicArtifact" => status() == Some("deleted"),
        "client.saveTagVocabulary"
        | "client.applyTagVocabularyImport"
        | "client.updateConceptDisplayText"
        | "client.applyConceptReviewAction"
        | "client.deleteConceptEntries"
        | "client.acceptTopicGraphRelation"
        | "client.rejectTopicGraphRelation"
        | "client.applyTopicGraphReviewAction" => status() == Some("committed"),
        "client.updateTagVocabularyEntry" | "client.deleteTagVocabularyEntry" => {
            result.get("mutated").and_then(Value::as_bool) == Some(true)
        }
        "client.promoteStagedTagSuggestions" => result
            .get("promoted")
            .and_then(Value::as_array)
            .is_some_and(|promoted| !promoted.is_empty()),
        "client.startReferenceSidecarRefresh"
        | "client.refreshReferenceSidecarNow"
        | "client.retryReferenceSidecarRefresh" => status() == Some("promoted"),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::sync::{Arc, Condvar, Mutex};
    use std::time::{Duration, Instant};

    #[derive(Default)]
    struct RecordingTarget {
        state: Mutex<(usize, bool, bool)>,
        changed: Condvar,
    }

    impl RecordingTarget {
        fn calls(&self) -> usize {
            self.state.lock().expect("state").0
        }

        fn fail(&self) {
            self.state.lock().expect("state").2 = true;
        }

        fn wait_for_calls(&self, expected: usize) {
            let deadline = Instant::now() + Duration::from_secs(1);
            let mut state = self.state.lock().expect("state");
            while state.0 < expected {
                let remaining = deadline.saturating_duration_since(Instant::now());
                assert!(!remaining.is_zero(), "autosync call was not observed");
                state = self.changed.wait_timeout(state, remaining).expect("wait").0;
            }
        }
    }

    impl CanonicalAutosyncTarget for RecordingTarget {
        fn trigger_auto_sync(&self) -> Result<(), String> {
            let mut state = self.state.lock().map_err(|_| "target_unavailable")?;
            state.0 += 1;
            let fail = state.2;
            self.changed.notify_all();
            if fail {
                Err("fixture_failure".into())
            } else {
                Ok(())
            }
        }

        fn abort(&self) {
            if let Ok(mut state) = self.state.lock() {
                state.1 = true;
                self.changed.notify_all();
            }
        }
    }

    #[test]
    fn classifies_only_committed_fixed_baseline_mutations() {
        for (capability, result) in [
            (
                "client.applyTopicSynthesisResult",
                json!({"status":"persisted"}),
            ),
            ("client.deleteTopicArtifact", json!({"status":"deleted"})),
            ("client.saveTagVocabulary", json!({"status":"committed"})),
            ("client.updateTagVocabularyEntry", json!({"mutated":true})),
            ("client.deleteTagVocabularyEntry", json!({"mutated":true})),
            (
                "client.promoteStagedTagSuggestions",
                json!({"promoted":["topic:a"]}),
            ),
            (
                "client.applyTagVocabularyImport",
                json!({"status":"committed"}),
            ),
            (
                "client.updateConceptDisplayText",
                json!({"status":"committed"}),
            ),
            (
                "client.applyConceptReviewAction",
                json!({"status":"committed"}),
            ),
            ("client.deleteConceptEntries", json!({"status":"committed"})),
            (
                "client.acceptTopicGraphRelation",
                json!({"status":"committed"}),
            ),
            (
                "client.rejectTopicGraphRelation",
                json!({"status":"committed"}),
            ),
            (
                "client.applyTopicGraphReviewAction",
                json!({"status":"committed"}),
            ),
            (
                "client.startReferenceSidecarRefresh",
                json!({"status":"promoted"}),
            ),
            (
                "client.refreshReferenceSidecarNow",
                json!({"status":"promoted"}),
            ),
            (
                "client.retryReferenceSidecarRefresh",
                json!({"status":"promoted"}),
            ),
        ] {
            assert!(canonical_commit(capability, &result, 1), "{capability}");
            assert!(!canonical_commit(capability, &result, 0), "{capability}");
        }

        for (capability, result) in [
            (
                "client.applyTopicSynthesisResult",
                json!({"status":"conflict"}),
            ),
            ("client.deleteTopicArtifact", json!({"status":"not_found"})),
            ("client.saveTagVocabulary", json!({"status":"unchanged"})),
            ("client.updateTagVocabularyEntry", json!({"mutated":false})),
            ("client.promoteStagedTagSuggestions", json!({"promoted":[]})),
            (
                "client.updateConceptDisplayText",
                json!({"status":"not_found"}),
            ),
            (
                "client.refreshReferenceSidecarNow",
                json!({"status":"unchanged"}),
            ),
            (
                "client.rebuildConceptKbIndex",
                json!({"status":"committed"}),
            ),
            ("client.syncWebDavNow", json!({"queue_state":"idle"})),
        ] {
            assert!(!canonical_commit(capability, &result, 1), "{capability}");
        }
    }

    #[test]
    fn coalesces_short_commits_and_isolates_target_failure() {
        let target = Arc::new(RecordingTarget::default());
        target.fail();
        let coordinator =
            CanonicalAutosyncCoordinator::new(target.clone(), Duration::from_millis(20))
                .expect("coordinator");

        coordinator.observe_commit(
            "client.updateTagVocabularyEntry",
            &json!({"mutated":true}),
            1,
        );
        coordinator.observe_commit(
            "client.deleteTagVocabularyEntry",
            &json!({"mutated":true}),
            1,
        );
        target.wait_for_calls(1);
        std::thread::sleep(Duration::from_millis(50));
        assert_eq!(target.calls(), 1);
        coordinator.shutdown().expect("shutdown");
    }

    #[test]
    fn waits_for_the_canonical_maintenance_epoch_to_drain() {
        let target = Arc::new(RecordingTarget::default());
        let coordinator =
            CanonicalAutosyncCoordinator::new(target.clone(), Duration::from_millis(20))
                .expect("coordinator");
        let mut first = coordinator
            .begin_maintenance("client.refreshReferenceSidecarNow")
            .expect("tracked maintenance");
        let second = coordinator
            .begin_maintenance("client.retryReferenceSidecarRefresh")
            .expect("tracked maintenance");

        first.observe(&json!({"status":"promoted"}), 1);
        coordinator.observe_commit(
            "client.updateConceptDisplayText",
            &json!({"status":"committed"}),
            1,
        );
        drop(first);
        std::thread::sleep(Duration::from_millis(50));
        assert_eq!(target.calls(), 0);
        drop(second);
        target.wait_for_calls(1);
        coordinator.shutdown().expect("shutdown");
    }

    #[test]
    fn shutdown_cancels_pending_debounce() {
        let target = Arc::new(RecordingTarget::default());
        let coordinator =
            CanonicalAutosyncCoordinator::new(target.clone(), Duration::from_millis(100))
                .expect("coordinator");
        coordinator.observe_commit(
            "client.saveTagVocabulary",
            &json!({"status":"committed"}),
            1,
        );
        coordinator.shutdown().expect("shutdown");
        std::thread::sleep(Duration::from_millis(130));
        assert_eq!(target.calls(), 0);
        assert!(target.state.lock().expect("state").1);
    }
}
