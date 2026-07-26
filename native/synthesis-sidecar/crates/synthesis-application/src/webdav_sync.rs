use crate::admission::{AdmissionError, SingleFlightAdmission};
use crate::durable_bundle::{
    DurableBundleApplication, DurableBundleSourcePort, DurableExport, DurableImportApplyRequest,
    DurableImportApplyResult, DurableImportPreview,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeSet;
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub const WEBDAV_RETRY_DELAYS_MS: [u64; 4] = [1_000, 5_000, 30_000, 120_000];

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WebDavHostDescription {
    pub status: String,
    pub config_status: String,
    pub auto_sync_enabled: bool,
    pub auto_retry_enabled: bool,
    pub base_url: String,
    pub remote_path: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub credential_updated_at: String,
    #[serde(default)]
    pub connection_test: Value,
    pub diagnostics: Vec<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WebDavReadResult {
    pub status: String,
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub etag: String,
    pub diagnostics: Vec<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WebDavWriteResult {
    pub status: String,
    #[serde(default)]
    pub etag: String,
    pub diagnostics: Vec<String>,
}

pub trait WebDavHostPort: Send + Sync {
    fn describe(&self) -> Result<WebDavHostDescription, String>;
    fn read_text(&self, path: &str) -> Result<WebDavReadResult, String>;
    fn ensure_collection(&self, path: &str) -> Result<WebDavWriteResult, String>;
    fn write_text(
        &self,
        path: &str,
        text: &str,
        if_match: Option<&str>,
    ) -> Result<WebDavWriteResult, String>;
}

pub trait WebDavStateStorePort: Send + Sync {
    fn load(&self) -> Result<Option<WebDavSyncState>, String>;
    fn save(&self, state: &WebDavSyncState) -> Result<(), String>;
}

pub trait WebDavRetrySchedulerPort: Send + Sync {
    fn wait(&self, delay_ms: u64, generation: u64) -> Result<bool, String>;
    fn cancel(&self, generation: u64);
}

pub trait WebDavDurablePort: Send + Sync {
    fn build_export(&self) -> Result<DurableExport, String>;
    fn preview_import(
        &self,
        source: &dyn DurableBundleSourcePort,
    ) -> Result<DurableImportPreview, String>;
    fn apply_import(
        &self,
        request: &DurableImportApplyRequest,
    ) -> Result<DurableImportApplyResult, String>;
    fn discard_import(&self, receipt_id: Option<&str>) -> Result<bool, String>;
}

impl WebDavDurablePort for DurableBundleApplication {
    fn build_export(&self) -> Result<DurableExport, String> {
        self.build_export(None)
    }

    fn preview_import(
        &self,
        source: &dyn DurableBundleSourcePort,
    ) -> Result<DurableImportPreview, String> {
        self.preview_import(source)
    }

    fn apply_import(
        &self,
        request: &DurableImportApplyRequest,
    ) -> Result<DurableImportApplyResult, String> {
        self.apply_import(request)
    }

    fn discard_import(&self, receipt_id: Option<&str>) -> Result<bool, String> {
        self.discard_import(receipt_id)
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WebDavDiagnostic {
    pub code: String,
    pub severity: String,
    pub message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WebDavConflict {
    pub asset_path: String,
    pub reason: String,
    #[serde(default)]
    pub base_hash: String,
    #[serde(default)]
    pub local_hash: String,
    #[serde(default)]
    pub remote_hash: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WebDavConflictReport {
    pub conflict_id: String,
    pub status: String,
    pub conflicts: Vec<WebDavConflict>,
    pub diagnostics: Vec<WebDavDiagnostic>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WebDavLastRun {
    pub run_id: String,
    pub status: String,
    pub started_at: String,
    pub completed_at: String,
    pub diagnostics: Vec<WebDavDiagnostic>,
    #[serde(default)]
    pub snapshot_id: String,
    #[serde(default)]
    pub manifest_hash: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WebDavSyncState {
    pub schema_id: String,
    pub schema_version: String,
    pub queue_state: String,
    pub paused: bool,
    pub adapter_configured: bool,
    pub config_status: String,
    pub base_url: String,
    pub remote_path: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub credential_updated_at: String,
    #[serde(default)]
    pub connection_test: Value,
    #[serde(default)]
    pub retry_attempt: usize,
    #[serde(default)]
    pub next_retry_at: String,
    #[serde(default)]
    pub last_phase: String,
    #[serde(default)]
    pub progress: Value,
    #[serde(default)]
    pub last_run: Option<WebDavLastRun>,
    #[serde(default)]
    pub conflict_report: Option<WebDavConflictReport>,
    pub diagnostics: Vec<WebDavDiagnostic>,
    pub allowed_actions: Vec<String>,
    pub conflict_actions: Vec<String>,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WebDavHead {
    pub schema_id: String,
    pub schema_version: String,
    pub snapshot_id: String,
    pub manifest_hash: String,
    pub updated_at: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub producer_version: String,
}

type Clock = Arc<dyn Fn() -> String + Send + Sync>;

struct RuntimeState {
    generation: u64,
    aborted: bool,
}

pub struct WebDavSyncApplication {
    host: Arc<dyn WebDavHostPort>,
    state_store: Arc<dyn WebDavStateStorePort>,
    scheduler: Arc<dyn WebDavRetrySchedulerPort>,
    durable: Arc<dyn WebDavDurablePort>,
    now: Clock,
    acknowledge_unbased_updates: bool,
    retry_delays: Vec<u64>,
    runtime: Mutex<RuntimeState>,
    admission: SingleFlightAdmission,
}

impl WebDavSyncApplication {
    pub fn new(
        host: Arc<dyn WebDavHostPort>,
        state_store: Arc<dyn WebDavStateStorePort>,
        scheduler: Arc<dyn WebDavRetrySchedulerPort>,
        durable: Arc<dyn WebDavDurablePort>,
        now: Clock,
    ) -> Self {
        Self {
            host,
            state_store,
            scheduler,
            durable,
            now,
            acknowledge_unbased_updates: false,
            retry_delays: WEBDAV_RETRY_DELAYS_MS.to_vec(),
            runtime: Mutex::new(RuntimeState {
                generation: 0,
                aborted: false,
            }),
            admission: SingleFlightAdmission::new(),
        }
    }

    pub fn with_policy(mut self, acknowledge_unbased_updates: bool, delays: Vec<u64>) -> Self {
        self.acknowledge_unbased_updates = acknowledge_unbased_updates;
        self.retry_delays = delays.into_iter().take(4).collect();
        self
    }

    pub fn load_webdav_sync_state(&self) -> Result<WebDavSyncState, String> {
        let timestamp = (self.now)();
        let host = self.describe_host();
        let configured = host.status == "available" && host.config_status == "configured";
        let mut state = self.state_store.load()?.unwrap_or(WebDavSyncState {
            schema_id: "synthesis.webdav_sync_state".into(),
            schema_version: "1.0.0".into(),
            queue_state: if configured { "idle" } else { "disabled" }.into(),
            adapter_configured: configured,
            config_status: host.config_status.clone(),
            base_url: host.base_url.clone(),
            remote_path: host.remote_path.clone(),
            username: host.username.clone(),
            credential_updated_at: host.credential_updated_at.clone(),
            connection_test: host.connection_test.clone(),
            diagnostics: host
                .diagnostics
                .iter()
                .map(|code| diagnostic(code, if configured { "info" } else { "error" }))
                .collect(),
            updated_at: timestamp.clone(),
            ..WebDavSyncState::default()
        });
        validate_state(&state)?;
        state.adapter_configured = configured;
        state.config_status = host.config_status;
        state.base_url = host.base_url;
        state.remote_path = host.remote_path;
        state.username = host.username;
        state.credential_updated_at = host.credential_updated_at;
        state.connection_test = host.connection_test;
        if state.queue_state == "syncing" && state.updated_at != timestamp {
            state.queue_state = "failed_retryable".into();
            state.diagnostics = vec![diagnostic("webdav_sync_stale_running_recovered", "warning")];
        }
        state.updated_at = timestamp;
        self.save(state)
    }

    pub fn run_sync(&self) -> Result<WebDavSyncState, String> {
        let _lease = self.admission.admit().map_err(admission_code)?;
        self.execute_sync()
    }

    pub fn trigger_webdav_sync(&self) -> Result<WebDavSyncState, String> {
        let generation = self.next_generation()?;
        let mut state = self.run_sync()?;
        for (index, delay) in self.retry_delays.iter().copied().enumerate() {
            if state.queue_state != "failed_retryable" || state.paused || self.is_aborted()? {
                break;
            }
            let host = self.describe_host();
            if host.status != "available" || !host.auto_retry_enabled {
                break;
            }
            state.retry_attempt = index + 1;
            state.next_retry_at = format!("{}+{}ms", (self.now)(), delay);
            state = self.save(state)?;
            if !self.scheduler.wait(delay, generation)? || self.generation()? != generation {
                break;
            }
            state = self.run_sync()?;
        }
        Ok(state)
    }

    pub fn trigger_webdav_auto_sync(&self) -> Result<WebDavSyncState, String> {
        let host = self.describe_host();
        if host.status == "available" && host.auto_sync_enabled && !self.is_aborted()? {
            self.trigger_webdav_sync()
        } else {
            self.load_webdav_sync_state()
        }
    }

    pub fn is_webdav_auto_sync_enabled(&self) -> Result<bool, String> {
        let host = self.describe_host();
        Ok(host.status == "available" && host.auto_sync_enabled && !self.is_aborted()?)
    }

    pub fn pause_webdav_sync(&self) -> Result<WebDavSyncState, String> {
        self.cancel_generation()?;
        self.persist_patch(|state| {
            state.paused = true;
            state.retry_attempt = 0;
            state.next_retry_at.clear();
        })
    }

    pub fn resume_webdav_sync(&self) -> Result<WebDavSyncState, String> {
        self.persist_patch(|state| state.paused = false)
    }

    pub fn retry_webdav_sync(&self) -> Result<WebDavSyncState, String> {
        self.persist_patch(|state| {
            state.paused = false;
            state.queue_state = "queued".into();
            state.diagnostics.clear();
            state.conflict_report = None;
            state.retry_attempt = 0;
            state.next_retry_at.clear();
        })?;
        self.trigger_webdav_sync()
    }

    pub fn resolve_webdav_sync_conflict(&self, action: &str) -> Result<WebDavSyncState, String> {
        self.cancel_generation()?;
        let current = self.load_webdav_sync_state()?;
        match action.trim() {
            "" | "keep_local" if current.conflict_report.is_some() => self.persist_patch(|state| {
                state.queue_state = "queued".into();
                if let Some(report) = &mut state.conflict_report {
                    report.status = "resolved".into();
                }
                state.diagnostics.clear();
            }),
            "clear_after_manual_edit" => self.retry_webdav_sync(),
            unsupported => self.persist_patch(|state| {
                state.queue_state = "blocked_conflict".into();
                state.diagnostics = vec![WebDavDiagnostic {
                    code: "webdav_sync_conflict_action_unsupported".into(),
                    severity: "warning".into(),
                    message: "webdav_sync_conflict_action_unsupported".into(),
                    details: Some(json!({"action":unsupported})),
                }];
            }),
        }
    }

    pub fn abort(&self) -> Result<(), String> {
        let previous = {
            let mut runtime = self
                .runtime
                .lock()
                .map_err(|_| "webdav_sync_unavailable".to_owned())?;
            let previous = runtime.generation;
            runtime.aborted = true;
            runtime.generation += 1;
            previous
        };
        self.scheduler.cancel(previous);
        Ok(())
    }

    pub fn stop_admission(&self) {
        self.admission.stop();
        let _ = self.cancel_generation();
    }

    pub fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.stop_admission();
        self.admission.shutdown(timeout, "webdav_sync")
    }

    fn execute_sync(&self) -> Result<WebDavSyncState, String> {
        if self.is_aborted()? {
            return Err("aborted".into());
        }
        let started_at = (self.now)();
        let run_id = format!("webdav-sync-{}", stable_slug(&started_at));
        let initial = self.load_webdav_sync_state()?;
        if !initial.adapter_configured || initial.queue_state == "disabled" {
            return Ok(initial);
        }
        if initial.paused {
            return self.persist_patch(|state| state.queue_state = "queued".into());
        }
        if initial.queue_state == "blocked_conflict" {
            return Ok(initial);
        }
        self.persist_patch(|state| {
            state.queue_state = "syncing".into();
            state.diagnostics.clear();
        })?;
        let result = self.sync_once(&run_id, &started_at);
        match result {
            Ok((snapshot_id, manifest_hash, diagnostics)) => self.persist_patch(|state| {
                state.queue_state = "idle".into();
                state.retry_attempt = 0;
                state.next_retry_at.clear();
                state.conflict_report = None;
                state.diagnostics = diagnostics.clone();
                state.last_run = Some(WebDavLastRun {
                    run_id: run_id.clone(),
                    status: "completed".into(),
                    started_at: started_at.clone(),
                    completed_at: (self.now)(),
                    diagnostics: diagnostics.clone(),
                    snapshot_id: snapshot_id.clone(),
                    manifest_hash: manifest_hash.clone(),
                });
            }),
            Err(Failure::Conflict(conflicts, code)) => {
                let report = WebDavConflictReport {
                    conflict_id: run_id.clone(),
                    status: "blocked".into(),
                    conflicts,
                    diagnostics: vec![diagnostic(&code, "warning")],
                };
                self.persist_patch(|state| {
                    state.queue_state = "blocked_conflict".into();
                    state.diagnostics = report.diagnostics.clone();
                    state.conflict_report = Some(report.clone());
                    state.last_run = Some(WebDavLastRun {
                        run_id: run_id.clone(),
                        status: "blocked_conflict".into(),
                        started_at: started_at.clone(),
                        completed_at: (self.now)(),
                        diagnostics: report.diagnostics.clone(),
                        ..WebDavLastRun::default()
                    });
                })
            }
            Err(Failure::Code(code, retryable)) => {
                let status = if retryable {
                    "failed_retryable"
                } else {
                    "failed_permanent"
                };
                let entry = diagnostic(&code, "error");
                self.persist_patch(|state| {
                    state.queue_state = status.into();
                    state.diagnostics = vec![entry.clone()];
                    state.last_run = Some(WebDavLastRun {
                        run_id: run_id.clone(),
                        status: status.into(),
                        started_at: started_at.clone(),
                        completed_at: (self.now)(),
                        diagnostics: vec![entry.clone()],
                        ..WebDavLastRun::default()
                    });
                })
            }
        }
    }

    fn sync_once(
        &self,
        _run_id: &str,
        started_at: &str,
    ) -> Result<(String, String, Vec<WebDavDiagnostic>), Failure> {
        let observed = self.read_remote_head()?;
        let mut diagnostics = Vec::new();
        if let Some(pointer) = &observed.pointer {
            let source = RemoteBundleSource {
                host: Arc::clone(&self.host),
                pointer: pointer.clone(),
            };
            let preview = self
                .durable
                .preview_import(&source)
                .map_err(|code| Failure::Code(code, false))?;
            if !preview.conflicts.is_empty() {
                let _ = self.durable.discard_import(Some(&preview.receipt_id));
                return Err(Failure::Conflict(
                    preview
                        .conflicts
                        .into_iter()
                        .map(|conflict| WebDavConflict {
                            asset_path: conflict.path,
                            reason: conflict.reason,
                            base_hash: conflict.base_hash,
                            local_hash: conflict.local_hash,
                            remote_hash: conflict.remote_hash,
                        })
                        .collect(),
                    "webdav_sync_conflict_blocked".into(),
                ));
            }
            if !preview.ok || preview.receipt_id.is_empty() || preview.manifest_hash.is_empty() {
                let _ = self.durable.discard_import(Some(&preview.receipt_id));
                return Err(Failure::Code(
                    "webdav_sync_snapshot_validation_failed".into(),
                    false,
                ));
            }
            if preview.unbased_updates > 0 && !self.acknowledge_unbased_updates {
                let _ = self.durable.discard_import(Some(&preview.receipt_id));
                return Err(Failure::Conflict(
                    vec![WebDavConflict {
                        asset_path: "durable://unbased-updates".into(),
                        reason: "unbased_update_acknowledgement_required".into(),
                        ..WebDavConflict::default()
                    }],
                    "webdav_sync_unbased_update_blocked".into(),
                ));
            }
            self.durable
                .apply_import(&DurableImportApplyRequest {
                    receipt_id: preview.receipt_id,
                    manifest_hash: preview.manifest_hash,
                    acknowledge_unbased_updates: self.acknowledge_unbased_updates,
                })
                .map_err(|code| Failure::Code(code, false))?;
        } else {
            diagnostics.push(diagnostic("webdav_sync_head_missing_initializable", "info"));
        }
        let built = self
            .durable
            .build_export()
            .map_err(|code| Failure::Code(code, false))?;
        let snapshot_id = snapshot_id(started_at, &built.manifest.manifest_hash);
        let pointer = WebDavHead {
            schema_id: "synthesis.webdav_sync_head".into(),
            schema_version: "1.0.0".into(),
            snapshot_id: snapshot_id.clone(),
            manifest_hash: built.manifest.manifest_hash.clone(),
            updated_at: (self.now)(),
            producer_version: built.manifest.producer_version.clone(),
        };
        self.upload_export(&built, &pointer, &observed)?;
        Ok((snapshot_id, built.manifest.manifest_hash, diagnostics))
    }

    fn read_remote_head(&self) -> Result<ObservedHead, Failure> {
        let result = self
            .host
            .read_text("HEAD.json")
            .map_err(|_| Failure::Code("webdav_sync_host_read_failed".into(), true))?;
        if result.status == "missing" {
            return Ok(ObservedHead {
                pointer: None,
                etag: result.etag,
            });
        }
        if result.status != "read" {
            return Err(Failure::Code("webdav_sync_host_read_failed".into(), true));
        }
        let pointer: WebDavHead = serde_json::from_str(&result.text)
            .map_err(|_| Failure::Code("webdav_sync_head_invalid".into(), false))?;
        validate_head(&pointer)?;
        Ok(ObservedHead {
            pointer: Some(pointer),
            etag: result.etag,
        })
    }

    fn upload_export(
        &self,
        built: &DurableExport,
        pointer: &WebDavHead,
        observed: &ObservedHead,
    ) -> Result<(), Failure> {
        let manifest_path = remote_manifest_path(pointer);
        let mut paths = built
            .assets
            .iter()
            .map(|asset| remote_asset_path(pointer, &asset.path))
            .collect::<Vec<_>>();
        paths.push(manifest_path.clone());
        paths.push("HEAD.json".into());
        for collection in parent_collections(&paths) {
            let result = self
                .host
                .ensure_collection(&collection)
                .map_err(|_| Failure::Code("webdav_sync_host_collection_failed".into(), true))?;
            if result.status != "ready" && result.status != "created" {
                return Err(Failure::Code(
                    "webdav_sync_host_collection_failed".into(),
                    true,
                ));
            }
        }
        let current = self
            .host
            .read_text("HEAD.json")
            .map_err(|_| Failure::Code("webdav_sync_host_read_failed".into(), true))?;
        if current.etag != observed.etag {
            return Err(Failure::Code(
                "webdav_sync_remote_changed_during_sync".into(),
                true,
            ));
        }
        for asset in &built.assets {
            let result = self
                .host
                .write_text(&remote_asset_path(pointer, &asset.path), &asset.text, None)
                .map_err(|_| Failure::Code("webdav_sync_snapshot_upload_failed".into(), true))?;
            if result.status != "written" {
                return Err(Failure::Code(
                    "webdav_sync_snapshot_upload_failed".into(),
                    result.status == "conflict",
                ));
            }
        }
        let manifest = self
            .host
            .write_text(&manifest_path, &built.manifest_text, None)
            .map_err(|_| Failure::Code("webdav_sync_snapshot_upload_failed".into(), true))?;
        if manifest.status != "written" {
            return Err(Failure::Code(
                "webdav_sync_remote_changed_during_sync".into(),
                true,
            ));
        }
        let head_text = serde_json::to_string_pretty(pointer)
            .map_err(|_| Failure::Code("webdav_sync_head_invalid".into(), false))?;
        let head = self
            .host
            .write_text(
                "HEAD.json",
                &head_text,
                if observed.etag.is_empty() {
                    None
                } else {
                    Some(&observed.etag)
                },
            )
            .map_err(|_| Failure::Code("webdav_sync_head_upload_failed".into(), true))?;
        if head.status != "written" {
            return Err(Failure::Code(
                "webdav_sync_remote_changed_during_sync".into(),
                true,
            ));
        }
        Ok(())
    }

    fn describe_host(&self) -> WebDavHostDescription {
        self.host.describe().unwrap_or(WebDavHostDescription {
            status: "unavailable".into(),
            config_status: "invalid".into(),
            diagnostics: vec!["webdav_sync_host_description_failed".into()],
            ..WebDavHostDescription::default()
        })
    }

    fn save(&self, mut state: WebDavSyncState) -> Result<WebDavSyncState, String> {
        state.allowed_actions = allowed_actions(&state);
        state.conflict_actions = conflict_actions(&state);
        validate_state(&state)?;
        self.state_store.save(&state)?;
        Ok(state)
    }

    fn persist_patch(
        &self,
        patch: impl FnOnce(&mut WebDavSyncState),
    ) -> Result<WebDavSyncState, String> {
        let mut state = self.load_webdav_sync_state()?;
        patch(&mut state);
        state.updated_at = (self.now)();
        self.save(state)
    }

    fn next_generation(&self) -> Result<u64, String> {
        let (previous, next) = {
            let mut runtime = self
                .runtime
                .lock()
                .map_err(|_| "webdav_sync_unavailable".to_owned())?;
            let previous = runtime.generation;
            runtime.generation += 1;
            (previous, runtime.generation)
        };
        self.scheduler.cancel(previous);
        Ok(next)
    }

    fn cancel_generation(&self) -> Result<(), String> {
        self.next_generation()?;
        Ok(())
    }

    fn generation(&self) -> Result<u64, String> {
        self.runtime
            .lock()
            .map(|runtime| runtime.generation)
            .map_err(|_| "webdav_sync_unavailable".to_owned())
    }

    fn is_aborted(&self) -> Result<bool, String> {
        self.runtime
            .lock()
            .map(|runtime| runtime.aborted)
            .map_err(|_| "webdav_sync_unavailable".to_owned())
    }
}

enum Failure {
    Code(String, bool),
    Conflict(Vec<WebDavConflict>, String),
}

struct ObservedHead {
    pointer: Option<WebDavHead>,
    etag: String,
}

struct RemoteBundleSource {
    host: Arc<dyn WebDavHostPort>,
    pointer: WebDavHead,
}

impl DurableBundleSourcePort for RemoteBundleSource {
    fn read_manifest_text(&self) -> Result<Option<String>, String> {
        let result = self.host.read_text(&remote_manifest_path(&self.pointer))?;
        Ok((result.status == "read").then_some(result.text))
    }

    fn read_asset_text(&self, path: &str) -> Result<Option<String>, String> {
        let result = self
            .host
            .read_text(&remote_asset_path(&self.pointer, path))?;
        Ok((result.status == "read").then_some(result.text))
    }
}

fn validate_state(state: &WebDavSyncState) -> Result<(), String> {
    if state.schema_id != "synthesis.webdav_sync_state"
        || state.schema_version != "1.0.0"
        || state.retry_attempt > 4
        || state.updated_at.is_empty()
    {
        Err("webdav_sync_state_invalid".into())
    } else {
        Ok(())
    }
}

fn validate_head(head: &WebDavHead) -> Result<(), Failure> {
    if head.schema_id != "synthesis.webdav_sync_head"
        || head.schema_version != "1.0.0"
        || head.snapshot_id.is_empty()
        || !head.manifest_hash.starts_with("sha256:")
    {
        Err(Failure::Code("webdav_sync_head_invalid".into(), false))
    } else {
        Ok(())
    }
}

fn allowed_actions(state: &WebDavSyncState) -> Vec<String> {
    if !state.adapter_configured {
        return Vec::new();
    }
    if state.queue_state == "blocked_conflict" {
        return vec![
            "resolveWebDavSyncConflict".into(),
            "retryWebDavSync".into(),
            "pauseWebDavSync".into(),
        ];
    }
    if state.paused {
        return vec!["resumeWebDavSync".into(), "syncWebDavNow".into()];
    }
    if state.queue_state == "syncing" {
        return vec!["pauseWebDavSync".into()];
    }
    vec!["syncWebDavNow".into(), "pauseWebDavSync".into()]
}

fn conflict_actions(state: &WebDavSyncState) -> Vec<String> {
    if state.queue_state == "blocked_conflict" {
        vec![
            "keep_local".into(),
            "save_remote_copy".into(),
            "clear_after_manual_edit".into(),
        ]
    } else {
        Vec::new()
    }
}

fn diagnostic(code: &str, severity: &str) -> WebDavDiagnostic {
    WebDavDiagnostic {
        code: code.into(),
        severity: severity.into(),
        message: code.into(),
        details: None,
    }
}

fn snapshot_id(timestamp: &str, manifest_hash: &str) -> String {
    let suffix = manifest_hash
        .get(manifest_hash.len().saturating_sub(12)..)
        .unwrap_or(manifest_hash);
    format!("{}-{suffix}", stable_slug(timestamp))
}

fn stable_slug(value: &str) -> String {
    let mut result = String::new();
    let mut separator = false;
    for character in value.chars() {
        if character.is_ascii_alphanumeric() {
            result.push(character);
            separator = false;
        } else if !separator {
            result.push('-');
            separator = true;
        }
    }
    result
}

fn remote_manifest_path(pointer: &WebDavHead) -> String {
    format!("snapshots/{}/manifest.json", pointer.snapshot_id)
}

fn remote_asset_path(pointer: &WebDavHead, path: &str) -> String {
    format!("snapshots/{}/{}", pointer.snapshot_id, path)
}

fn parent_collections(paths: &[String]) -> Vec<String> {
    let mut collections = BTreeSet::new();
    for path in paths {
        let parts = path.split('/').collect::<Vec<_>>();
        for index in 1..parts.len() {
            collections.insert(parts[..index].join("/"));
        }
    }
    collections.into_iter().collect()
}

fn admission_code(error: AdmissionError) -> String {
    match error {
        AdmissionError::Busy => "webdav_sync_busy".into(),
        AdmissionError::Stopping => "stopping".into(),
        AdmissionError::Unavailable => "webdav_sync_unavailable".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Default)]
    struct MemoryState(Mutex<Option<WebDavSyncState>>);

    impl WebDavStateStorePort for MemoryState {
        fn load(&self) -> Result<Option<WebDavSyncState>, String> {
            Ok(self.0.lock().expect("state").clone())
        }

        fn save(&self, state: &WebDavSyncState) -> Result<(), String> {
            *self.0.lock().expect("state") = Some(state.clone());
            Ok(())
        }
    }

    struct Scheduler;

    impl WebDavRetrySchedulerPort for Scheduler {
        fn wait(&self, _delay_ms: u64, _generation: u64) -> Result<bool, String> {
            Ok(false)
        }
        fn cancel(&self, _generation: u64) {}
    }

    #[derive(Default)]
    struct RecordingScheduler(Mutex<Vec<u64>>);

    impl WebDavRetrySchedulerPort for RecordingScheduler {
        fn wait(&self, _delay_ms: u64, _generation: u64) -> Result<bool, String> {
            Ok(false)
        }

        fn cancel(&self, generation: u64) {
            self.0.lock().expect("cancellations").push(generation);
        }
    }

    struct Host;

    impl WebDavHostPort for Host {
        fn describe(&self) -> Result<WebDavHostDescription, String> {
            Ok(WebDavHostDescription {
                status: "available".into(),
                config_status: "configured".into(),
                base_url: "https://example.test".into(),
                remote_path: "synthesis".into(),
                ..WebDavHostDescription::default()
            })
        }
        fn read_text(&self, _path: &str) -> Result<WebDavReadResult, String> {
            Ok(WebDavReadResult {
                status: "missing".into(),
                ..WebDavReadResult::default()
            })
        }
        fn ensure_collection(&self, _path: &str) -> Result<WebDavWriteResult, String> {
            Ok(WebDavWriteResult {
                status: "ready".into(),
                ..WebDavWriteResult::default()
            })
        }
        fn write_text(
            &self,
            _path: &str,
            _text: &str,
            _if_match: Option<&str>,
        ) -> Result<WebDavWriteResult, String> {
            Ok(WebDavWriteResult {
                status: "written".into(),
                ..WebDavWriteResult::default()
            })
        }
    }

    struct Durable;

    impl WebDavDurablePort for Durable {
        fn build_export(&self) -> Result<DurableExport, String> {
            crate::durable_bundle::build_export(&[], "2026-07-26T00:00:00.000Z", "test", 0)
        }
        fn preview_import(
            &self,
            _source: &dyn DurableBundleSourcePort,
        ) -> Result<DurableImportPreview, String> {
            Err("unexpected_preview".into())
        }
        fn apply_import(
            &self,
            _request: &DurableImportApplyRequest,
        ) -> Result<DurableImportApplyResult, String> {
            Err("unexpected_apply".into())
        }
        fn discard_import(&self, _receipt_id: Option<&str>) -> Result<bool, String> {
            Ok(false)
        }
    }

    #[test]
    fn empty_remote_publishes_and_reopens_idle_state() {
        let state = Arc::new(MemoryState::default());
        let application = WebDavSyncApplication::new(
            Arc::new(Host),
            state,
            Arc::new(Scheduler),
            Arc::new(Durable),
            Arc::new(|| "2026-07-26T00:00:00.000Z".into()),
        );
        let result = application.run_sync().expect("sync");
        assert_eq!(result.queue_state, "idle");
        assert_eq!(result.last_run.expect("last run").status, "completed");
    }

    #[test]
    fn retrigger_pause_and_abort_cancel_the_previous_retry_generation() {
        let scheduler = Arc::new(RecordingScheduler::default());
        let application = WebDavSyncApplication::new(
            Arc::new(Host),
            Arc::new(MemoryState::default()),
            scheduler.clone(),
            Arc::new(Durable),
            Arc::new(|| "2026-07-26T00:00:00.000Z".into()),
        );

        application.trigger_webdav_sync().expect("trigger");
        application.pause_webdav_sync().expect("pause");
        application.abort().expect("abort");

        assert_eq!(*scheduler.0.lock().expect("cancellations"), vec![0, 1, 2]);
    }
}
