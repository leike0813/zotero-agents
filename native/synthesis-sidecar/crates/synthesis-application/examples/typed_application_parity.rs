use serde::Deserialize;
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, VecDeque};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Condvar, Mutex, mpsc};
use std::thread;
use std::time::Duration;
use synthesis_application::{
    CanonicalStorePort, PatchOutput, RepositoryPort, StructuredArtifactPort, TopicApplication,
    TopicApplyRequest, TopicApplyStatus, TopicCanonicalPort, TopicDetailRequest, TopicListRequest,
    TopicRepositoryPort, WorkbenchApplication,
};
use synthesis_canonical_store::{
    CanonicalError, CanonicalIdentity, CanonicalReceipt, CanonicalStore, CanonicalTopicState,
    CanonicalTopicView, PreparedCanonicalPromotion, canonical_topic_path_id,
};
use synthesis_repository::{
    CacheBasisRecord, DeletedTopicArtifactRecord, OperationQuery, OperationRecord, Repository,
    RepositoryIdentity, TopicApplicationProjectionRecord, TopicApplicationStateRecord,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Corpus {
    schema: String,
    report_schema: String,
    profile_id: String,
    data_root_id: String,
    clock: String,
    operation_ids: Vec<String>,
    transaction_ids: Vec<String>,
    workbench: WorkbenchFixture,
    topic: TopicFixture,
    coverage: Value,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct WorkbenchFixture {
    cache_rows: Vec<CacheBasisRecord>,
    operation_rows: Vec<OperationRecord>,
    generated_bounds: GeneratedBounds,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GeneratedBounds {
    running_count: usize,
    failed_count: usize,
    updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicFixture {
    topic_id: String,
    apply: TopicApplyRequest,
    patch: TopicApplyRequest,
    limits: TopicLimits,
    faults: BTreeMap<String, FaultFixture>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicLimits {
    max_asset_bytes: usize,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct FaultFixture {
    phase: String,
    status: String,
    #[serde(default)]
    warning: String,
}

struct FixtureEngine;

impl StructuredArtifactPort for FixtureEngine {
    fn validate_manifest(&self, manifest: &Value) -> Result<(), String> {
        if matches!(
            manifest.get("fixture_outcome").and_then(Value::as_str),
            Some("compute_failure" | "compute_cancel")
        ) {
            return Err(manifest["fixture_outcome"]
                .as_str()
                .unwrap_or_default()
                .to_owned());
        }
        manifest
            .is_object()
            .then_some(())
            .ok_or_else(|| "manifest_invalid".into())
    }

    fn assemble_artifact(
        &self,
        manifest: &Value,
        sections: &BTreeMap<String, Value>,
    ) -> Result<Value, String> {
        let mut artifact = Map::from_iter([
            (
                "schema_id".into(),
                json!("synthesis.topic_synthesis_artifact"),
            ),
            ("schema_version".into(), json!("4.0.0")),
            (
                "language".into(),
                manifest
                    .get("language")
                    .cloned()
                    .unwrap_or_else(|| json!("en")),
            ),
        ]);
        artifact.extend(sections.clone());
        Ok(Value::Object(artifact))
    }

    fn validate_artifact(&self, artifact: &Value, _language: &str) -> Result<(), String> {
        artifact
            .is_object()
            .then_some(())
            .ok_or_else(|| "artifact_invalid".into())
    }

    fn apply_section_patch(
        &self,
        current: &CanonicalTopicView,
        patch_manifest: &Value,
        changed_sections: &BTreeMap<String, Value>,
    ) -> Result<PatchOutput, String> {
        if patch_manifest
            .get("fixture_outcome")
            .and_then(Value::as_str)
            == Some("patch_conflict")
        {
            return Ok(PatchOutput {
                sections: current.sections.clone(),
                mismatches: vec![json!({
                    "name":"claims",
                    "base":format!("sha256:{}", "1".repeat(64)),
                    "current":format!("sha256:{}", "2".repeat(64)),
                })],
            });
        }
        let mut sections = current.sections.clone();
        sections.extend(changed_sections.clone());
        Ok(PatchOutput {
            sections,
            mismatches: Vec::new(),
        })
    }
}

struct DrainEngine {
    gate: Arc<(Mutex<(bool, bool)>, Condvar)>,
}

fn reconcile_reopened_operations(
    repository: &Arc<Mutex<Repository>>,
    now: &str,
) -> Result<(), String> {
    const PAGE_LIMIT: usize = 1_000;
    let mut start_after_operation_id = None;
    loop {
        let rows = repository
            .lock()
            .map_err(|_| "parity_repository_lock_failed".to_owned())?
            .list_operations(&OperationQuery {
                statuses: vec!["running".into()],
                include_completed: true,
                order_by_operation_id: true,
                start_after_operation_id: start_after_operation_id.clone(),
                limit: PAGE_LIMIT,
                ..OperationQuery::default()
            })?;
        if rows.is_empty() {
            return Ok(());
        }
        let page_len = rows.len();
        start_after_operation_id = rows.last().map(|row| row.operation_id.clone());
        let owner = repository
            .lock()
            .map_err(|_| "parity_repository_lock_failed".to_owned())?;
        for mut row in rows {
            row.status = "canceled".into();
            row.phase = "service_restart".into();
            row.phase_label = "Service restarted".into();
            row.message = "Interrupted by sidecar service restart.".into();
            row.diagnostics_json = serde_json::to_string(&vec![json!({
                "code":"synthesis_operation_stale_after_restart",
                "severity":"warning",
            })])
            .map_err(|_| "parity_restart_diagnostic_invalid".to_owned())?;
            row.completed_at = now.into();
            row.updated_at = now.into();
            owner.finish_operation_if_nonterminal(&row)?;
        }
        if page_len < PAGE_LIMIT {
            return Ok(());
        }
    }
}

impl StructuredArtifactPort for DrainEngine {
    fn validate_manifest(&self, manifest: &Value) -> Result<(), String> {
        let (state, changed) = &*self.gate;
        let mut state = state
            .lock()
            .map_err(|_| "fixture_drain_failed".to_owned())?;
        state.0 = true;
        changed.notify_all();
        while !state.1 {
            state = changed
                .wait(state)
                .map_err(|_| "fixture_drain_failed".to_owned())?;
        }
        FixtureEngine.validate_manifest(manifest)
    }

    fn assemble_artifact(
        &self,
        manifest: &Value,
        sections: &BTreeMap<String, Value>,
    ) -> Result<Value, String> {
        FixtureEngine.assemble_artifact(manifest, sections)
    }

    fn validate_artifact(&self, artifact: &Value, language: &str) -> Result<(), String> {
        FixtureEngine.validate_artifact(artifact, language)
    }

    fn apply_section_patch(
        &self,
        current: &CanonicalTopicView,
        patch_manifest: &Value,
        changed_sections: &BTreeMap<String, Value>,
    ) -> Result<PatchOutput, String> {
        FixtureEngine.apply_section_patch(current, patch_manifest, changed_sections)
    }
}

fn read_tree(root: &Path) -> Result<BTreeMap<String, String>, String> {
    fn visit(
        base: &Path,
        current: &Path,
        output: &mut BTreeMap<String, String>,
    ) -> Result<(), String> {
        if !current.exists() {
            return Ok(());
        }
        let mut entries = fs::read_dir(current)
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            let path = entry.path();
            if path.is_dir() {
                visit(base, &path, output)?;
            } else {
                let relative = path
                    .strip_prefix(base)
                    .map_err(|error| error.to_string())?
                    .to_string_lossy()
                    .replace('\\', "/");
                output.insert(
                    relative,
                    String::from_utf8(fs::read(path).map_err(|error| error.to_string())?)
                        .map_err(|_| "parity_non_utf8_file".to_owned())?,
                );
            }
        }
        Ok(())
    }
    let mut output = BTreeMap::new();
    visit(root, root, &mut output)?;
    Ok(output)
}

fn canonical_report(
    store: &CanonicalStore,
    topic_id: &str,
    include_receipt: bool,
) -> Result<Value, String> {
    let path_id = canonical_topic_path_id(topic_id)?;
    let current = store.root().join("topics").join(&path_id).join("current");
    let receipt = if include_receipt {
        store.receipt(topic_id)?
    } else {
        None
    };
    let current_value = match store
        .read_topic(topic_id)
        .map_err(|error| error.code().to_owned())?
    {
        CanonicalTopicState::Absent { topic_id, path_id } => json!({
            "status":"absent",
            "topicId":topic_id,
            "pathId":path_id,
            "diagnostics":[],
        }),
        CanonicalTopicState::Invalid {
            topic_id,
            path_id,
            diagnostics,
        } => json!({
            "status":"invalid",
            "topicId":topic_id,
            "pathId":path_id,
            "diagnostics":diagnostics,
        }),
        CanonicalTopicState::Ready(topic) => json!({
            "status":"ready",
            "topicId":topic.topic_id,
            "pathId":topic.path_id,
            "snapshot":topic,
            "diagnostics":[],
        }),
    };
    Ok(json!({
        "inspect":store.inspect(topic_id)?,
        "current":current_value,
        "files":read_tree(&current)?,
        "journal":Value::Null,
        "receipt":receipt.map(|receipt| json!({
            "transactionId":receipt.transaction_id,
            "topicId":receipt.topic_id,
            "pathId":receipt.path_id,
            "manifestHash":receipt.manifest_hash,
            "artifactHash":receipt.artifact_hash,
        })),
    }))
}

fn topic_request_for(
    fixture: &TopicApplyRequest,
    topic_id: &str,
) -> Result<TopicApplyRequest, String> {
    let mut request = fixture.clone();
    let bundle = request
        .bundle
        .as_object_mut()
        .ok_or_else(|| "parity_fixture_invalid".to_owned())?;
    bundle.insert("topic_id".into(), json!(topic_id));
    let definition = bundle
        .get_mut("topic_definition")
        .and_then(Value::as_object_mut)
        .ok_or_else(|| "parity_fixture_invalid".to_owned())?;
    definition.insert("id".into(), json!(topic_id));
    definition.insert(
        "title".into(),
        json!(if topic_id == "topic-alpha" {
            "Typed Topic"
        } else {
            "Typed Beta"
        }),
    );
    let manifest = request
        .assets
        .first_mut()
        .ok_or_else(|| "parity_fixture_invalid".to_owned())?;
    let mut manifest_value: Value =
        serde_json::from_str(&manifest.text).map_err(|_| "parity_fixture_invalid".to_owned())?;
    manifest_value
        .as_object_mut()
        .ok_or_else(|| "parity_fixture_invalid".to_owned())?
        .insert("topic_id".into(), json!(topic_id));
    manifest.text =
        serde_json::to_string(&manifest_value).map_err(|_| "parity_fixture_invalid".to_owned())?;
    Ok(request)
}

fn full_update_request(
    fixture: &TopicApplyRequest,
    hashes: &BTreeMap<String, String>,
) -> Result<TopicApplyRequest, String> {
    let mut request = topic_request_for(fixture, "topic-alpha")?;
    let bundle = request
        .bundle
        .as_object_mut()
        .ok_or_else(|| "parity_fixture_invalid".to_owned())?;
    bundle.insert("operation".into(), json!("update_full"));
    bundle.insert("mode".into(), json!("update"));
    bundle.insert("base_hashes".into(), json!(hashes));
    let definition = bundle
        .get_mut("topic_definition")
        .and_then(Value::as_object_mut)
        .ok_or_else(|| "parity_fixture_invalid".to_owned())?;
    definition.insert("title".into(), json!("Typed Topic Updated"));
    definition.insert("definition".into(), json!("Typed full update"));
    Ok(request)
}

fn manifest_outcome_request(
    fixture: &TopicApplyRequest,
    outcome: &str,
) -> Result<TopicApplyRequest, String> {
    let mut request = fixture.clone();
    let manifest = request
        .assets
        .first_mut()
        .ok_or_else(|| "parity_fixture_invalid".to_owned())?;
    let mut value: Value =
        serde_json::from_str(&manifest.text).map_err(|_| "parity_fixture_invalid".to_owned())?;
    value
        .as_object_mut()
        .ok_or_else(|| "parity_fixture_invalid".to_owned())?
        .insert("fixture_outcome".into(), json!(outcome));
    manifest.text =
        serde_json::to_string(&value).map_err(|_| "parity_fixture_invalid".to_owned())?;
    Ok(request)
}

fn state_report(
    repository: &Arc<Mutex<Repository>>,
    canonical: &Arc<Mutex<CanonicalStore>>,
    topic_ids: &[&str],
) -> Result<Value, String> {
    let tables = repository
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?
        .table_snapshot()?;
    let canonical = canonical
        .lock()
        .map_err(|_| "canonical_store_unavailable".to_owned())?;
    let mut topics = Map::new();
    for (index, topic_id) in topic_ids.iter().enumerate() {
        topics.insert(
            (*topic_id).into(),
            canonical_report(&canonical, topic_id, index + 1 == topic_ids.len())?,
        );
    }
    Ok(json!({"tables":tables,"canonical":topics}))
}

#[derive(Clone, Copy)]
enum RepositoryFault {
    Projection,
    Receipt,
}

struct FaultRepository {
    inner: RepositoryPort,
    fault: RepositoryFault,
}

impl TopicRepositoryPort for FaultRepository {
    fn get_state(&self, topic_id: &str) -> Result<Option<TopicApplicationStateRecord>, String> {
        self.inner.get_state(topic_id)
    }

    fn list_states(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<TopicApplicationStateRecord>, usize), String> {
        self.inner.list_states(offset, limit)
    }

    fn upsert_state(&self, record: &TopicApplicationStateRecord) -> Result<(), String> {
        if matches!(self.fault, RepositoryFault::Projection) {
            Err("fixture_projection".into())
        } else {
            self.inner.upsert_state(record)
        }
    }

    fn get_projection(
        &self,
        topic_id: &str,
    ) -> Result<Option<TopicApplicationProjectionRecord>, String> {
        self.inner.get_projection(topic_id)
    }

    fn upsert_projection(&self, record: &TopicApplicationProjectionRecord) -> Result<(), String> {
        self.inner.upsert_projection(record)
    }

    fn get_deleted(&self, topic_id: &str) -> Result<Option<DeletedTopicArtifactRecord>, String> {
        self.inner.get_deleted(topic_id)
    }

    fn list_deleted(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<DeletedTopicArtifactRecord>, usize), String> {
        self.inner.list_deleted(offset, limit)
    }

    fn soft_delete(&self, record: &DeletedTopicArtifactRecord) -> Result<(), String> {
        self.inner.soft_delete(record)
    }

    fn purge_deleted(&self, records: &[DeletedTopicArtifactRecord]) -> Result<usize, String> {
        self.inner.purge_deleted(records)
    }

    fn upsert_operation(&self, record: &OperationRecord) -> Result<(), String> {
        self.inner.upsert_operation(record)
    }

    fn update_operation(
        &self,
        operation_id: &str,
        status: &str,
        phase: &str,
        diagnostics: &[String],
        now: &str,
    ) -> Result<Option<OperationRecord>, String> {
        if matches!(self.fault, RepositoryFault::Receipt) && status == "completed" {
            Err("fixture_receipt".into())
        } else {
            self.inner
                .update_operation(operation_id, status, phase, diagnostics, now)
        }
    }
}

struct FaultCanonical {
    inner: CanonicalStorePort,
    status: TopicApplyStatus,
}

impl TopicCanonicalPort for FaultCanonical {
    fn read_topic(&self, topic_id: &str) -> Result<CanonicalTopicState, CanonicalError> {
        self.inner.read_topic(topic_id)
    }

    fn promote(
        &self,
        promotion: PreparedCanonicalPromotion,
    ) -> Result<CanonicalReceipt, CanonicalError> {
        Err(self.inner.reject_promotion_for_parity(
            promotion,
            match self.status {
                TopicApplyStatus::CanonicalStoreBusy => "canonical_store_busy",
                TopicApplyStatus::FailedRecovered => "failed_recovered",
                TopicApplyStatus::RepairRequired => "repair_required",
                _ => "parity_fault_invalid",
            }
            .into(),
        ))
    }

    fn archive_current(
        &self,
        topic_id: &str,
        deleted_path_id: &str,
    ) -> Result<bool, CanonicalError> {
        self.inner.archive_current(topic_id, deleted_path_id)
    }

    fn restore_deleted(
        &self,
        topic_id: &str,
        deleted_path_id: &str,
    ) -> Result<bool, CanonicalError> {
        self.inner.restore_deleted(topic_id, deleted_path_id)
    }

    fn purge_deleted(&self, deleted_path_id: &str) -> Result<bool, CanonicalError> {
        self.inner.purge_deleted(deleted_path_id)
    }
}

fn run_drain(
    root: &Path,
    corpus: &Corpus,
    operation_index: &Arc<AtomicUsize>,
    transaction_ids: &Arc<Mutex<VecDeque<String>>>,
) -> Result<Value, String> {
    let drain_root = root.join("drain");
    let repository = Arc::new(Mutex::new(Repository::open_at(
        &drain_root,
        RepositoryIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
        &corpus.clock,
    )?));
    let mut canonical_store = CanonicalStore::open(
        &drain_root,
        CanonicalIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
    )?;
    canonical_store.set_transaction_ids_for_parity(Arc::clone(transaction_ids));
    let canonical = Arc::new(Mutex::new(canonical_store));
    let operation_ids = corpus.operation_ids.clone();
    let operation_index_factory = Arc::clone(operation_index);
    let gate = Arc::new((Mutex::new((false, false)), Condvar::new()));
    let topic = Arc::new(TopicApplication::with_factories(
        Arc::new(RepositoryPort::new(Arc::clone(&repository))),
        Arc::new(CanonicalStorePort::new(Arc::clone(&canonical))),
        Arc::new(DrainEngine {
            gate: Arc::clone(&gate),
        }),
        {
            let clock = corpus.clock.clone();
            Arc::new(move || clock.clone())
        },
        Arc::new(move |_| {
            operation_ids[operation_index_factory.fetch_add(1, Ordering::Relaxed)].clone()
        }),
    ));
    let request = topic_request_for(&corpus.topic.apply, "topic-drain")?;
    let applying = {
        let topic = Arc::clone(&topic);
        thread::spawn(move || topic.apply(request))
    };
    {
        let (state, changed) = &*gate;
        let state = state
            .lock()
            .map_err(|_| "fixture_drain_failed".to_owned())?;
        drop(
            changed
                .wait_while(state, |state| !state.0)
                .map_err(|_| "fixture_drain_failed".to_owned())?,
        );
    }
    let (shutdown_sender, shutdown_receiver) = mpsc::channel();
    let shutting_down = {
        let topic = Arc::clone(&topic);
        thread::spawn(move || {
            let result = topic.shutdown(Duration::from_secs(1));
            let _ = shutdown_sender.send(result);
        })
    };
    let blocked_before_release = matches!(
        shutdown_receiver.recv_timeout(Duration::from_millis(50)),
        Err(mpsc::RecvTimeoutError::Timeout)
    );
    {
        let (state, changed) = &*gate;
        let mut state = state
            .lock()
            .map_err(|_| "fixture_drain_failed".to_owned())?;
        state.1 = true;
        changed.notify_all();
    }
    let result = applying
        .join()
        .map_err(|_| "fixture_drain_failed".to_owned())?;
    let shutdown = shutdown_receiver
        .recv_timeout(Duration::from_secs(1))
        .map_err(|_| "fixture_drain_failed".to_owned())?;
    shutdown?;
    shutting_down
        .join()
        .map_err(|_| "fixture_drain_failed".to_owned())?;
    let before = state_report(&repository, &canonical, &["topic-drain"])?;
    drop(topic);
    drop(canonical);
    drop(repository);

    let reopened_repository = Arc::new(Mutex::new(Repository::open_at(
        &drain_root,
        RepositoryIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
        &corpus.clock,
    )?));
    reconcile_reopened_operations(&reopened_repository, &corpus.clock)?;
    let reopened_canonical = Arc::new(Mutex::new(CanonicalStore::open(
        &drain_root,
        CanonicalIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
    )?));
    let reopened_topic = TopicApplication::new(
        Arc::new(RepositoryPort::new(Arc::clone(&reopened_repository))),
        Arc::new(CanonicalStorePort::new(Arc::clone(&reopened_canonical))),
        Arc::new(FixtureEngine),
    );
    let state = state_report(&reopened_repository, &reopened_canonical, &["topic-drain"])?;
    let reopen = json!({
        "detail":reopened_topic.detail(TopicDetailRequest {
            topic_id:"topic-drain".into(),
        })?,
        "tables":state["tables"],
        "canonical":state["canonical"],
    });
    reopened_topic.shutdown(Duration::from_secs(1))?;
    Ok(json!({
        "result":result,
        "blockedBeforeRelease":blocked_before_release,
        "drained":true,
        "before":before,
        "reopen":reopen,
    }))
}

#[allow(clippy::too_many_arguments)]
fn run_fault(
    root: &Path,
    case_name: &str,
    corpus: &Corpus,
    operation_index: &Arc<AtomicUsize>,
    transaction_ids: &Arc<Mutex<VecDeque<String>>>,
    promotion_fault: Option<TopicApplyStatus>,
    repository_fault: Option<RepositoryFault>,
) -> Result<Value, String> {
    let fault_root = root.join(format!("fault-{case_name}"));
    let repository = Arc::new(Mutex::new(Repository::open_at(
        &fault_root,
        RepositoryIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
        &corpus.clock,
    )?));
    let mut canonical_store = CanonicalStore::open(
        &fault_root,
        CanonicalIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
    )?;
    canonical_store.set_transaction_ids_for_parity(Arc::clone(transaction_ids));
    let canonical = Arc::new(Mutex::new(canonical_store));
    let repository_port = RepositoryPort::new(Arc::clone(&repository));
    let canonical_port = CanonicalStorePort::new(Arc::clone(&canonical));
    let repository_owner: Arc<dyn TopicRepositoryPort> = match repository_fault {
        Some(fault) => Arc::new(FaultRepository {
            inner: repository_port,
            fault,
        }),
        None => Arc::new(repository_port),
    };
    let canonical_owner: Arc<dyn TopicCanonicalPort> = match promotion_fault {
        Some(status) => Arc::new(FaultCanonical {
            inner: canonical_port,
            status,
        }),
        None => Arc::new(canonical_port),
    };
    let operation_ids = corpus.operation_ids.clone();
    let operation_index_factory = Arc::clone(operation_index);
    let topic = TopicApplication::with_factories(
        repository_owner,
        canonical_owner,
        Arc::new(FixtureEngine),
        {
            let clock = corpus.clock.clone();
            Arc::new(move || clock.clone())
        },
        Arc::new(move |_| {
            operation_ids[operation_index_factory.fetch_add(1, Ordering::Relaxed)].clone()
        }),
    );
    let result = topic.apply(corpus.topic.apply.clone());
    topic.shutdown(Duration::from_secs(1))?;
    let before = state_report(&repository, &canonical, &[&corpus.topic.topic_id])?;
    drop(topic);
    drop(canonical);
    drop(repository);

    let reopened_repository = Arc::new(Mutex::new(Repository::open_at(
        &fault_root,
        RepositoryIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
        &corpus.clock,
    )?));
    reconcile_reopened_operations(&reopened_repository, &corpus.clock)?;
    let reopened_canonical = Arc::new(Mutex::new(CanonicalStore::open(
        &fault_root,
        CanonicalIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
    )?));
    let reopened_topic = TopicApplication::new(
        Arc::new(RepositoryPort::new(Arc::clone(&reopened_repository))),
        Arc::new(CanonicalStorePort::new(Arc::clone(&reopened_canonical))),
        Arc::new(FixtureEngine),
    );
    let state = state_report(
        &reopened_repository,
        &reopened_canonical,
        &[&corpus.topic.topic_id],
    )?;
    let reopen = json!({
        "detail":reopened_topic.detail(TopicDetailRequest {
            topic_id: corpus.topic.topic_id.clone(),
        })?,
        "tables":state["tables"],
        "canonical":state["canonical"],
    });
    reopened_topic.shutdown(Duration::from_secs(1))?;
    Ok(json!({"result":result,"before":before,"reopen":reopen}))
}

fn main() -> Result<(), String> {
    let mut args = std::env::args().skip(1);
    let corpus_path = PathBuf::from(
        args.next()
            .ok_or_else(|| "corpus_path_required".to_owned())?,
    );
    let root = PathBuf::from(args.next().ok_or_else(|| "root_required".to_owned())?);
    if args.next().is_some() || !root.is_absolute() {
        return Err("parity_arguments_invalid".into());
    }
    let corpus: Corpus =
        serde_json::from_slice(&fs::read(&corpus_path).map_err(|error| error.to_string())?)
            .map_err(|_| "parity_corpus_invalid".to_owned())?;
    if corpus.schema != "synthesis-typed-application-parity-v1"
        || corpus.report_schema != "synthesis-typed-application-parity-report.v1"
        || corpus.operation_ids.len() < 2
        || corpus.transaction_ids.is_empty()
        || !corpus.coverage.is_object()
    {
        return Err("parity_corpus_invalid".into());
    }
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    if corpus.workbench.generated_bounds.running_count != 51
        || corpus.workbench.generated_bounds.failed_count != 21
        || corpus.topic.limits.max_asset_bytes != 5 * 1024 * 1024
        || corpus.topic.faults.len() != 7
        || corpus.topic.faults.values().any(|fault| {
            fault.phase.is_empty()
                || fault.status.is_empty()
                || (fault.status == "persisted" && fault.warning.is_empty())
        })
    {
        return Err("parity_corpus_invalid".into());
    }
    let main_root = root.join("main");
    let repository = Arc::new(Mutex::new(Repository::open_at(
        &main_root,
        RepositoryIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
        &corpus.clock,
    )?));
    let repository_port = RepositoryPort::new(Arc::clone(&repository));
    let workbench = WorkbenchApplication::new(Arc::new(repository_port.clone()));
    let workbench_empty = workbench.read()?;
    {
        let repository = repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        for row in &corpus.workbench.cache_rows {
            repository.upsert_cache_basis(row)?;
        }
        for row in &corpus.workbench.operation_rows {
            repository.upsert_operation(row)?;
        }
        for index in 0..corpus.workbench.generated_bounds.running_count {
            repository.upsert_operation(&OperationRecord {
                operation_id: format!("running-bound-{index:03}"),
                operation_type: "canonical_maintenance".into(),
                status: "running".into(),
                label: format!("Running {index}"),
                progress_mode: "indeterminate".into(),
                created_at: corpus.clock.clone(),
                started_at: corpus.clock.clone(),
                updated_at: corpus.workbench.generated_bounds.updated_at.clone(),
                ..OperationRecord::default()
            })?;
        }
        for index in 0..corpus.workbench.generated_bounds.failed_count {
            repository.upsert_operation(&OperationRecord {
                operation_id: format!("failed-bound-{index:03}"),
                operation_type: "citation_graph_cache_rebuild".into(),
                status: "failed".into(),
                label: format!("Failed {index}"),
                progress_mode: "indeterminate".into(),
                created_at: corpus.clock.clone(),
                started_at: corpus.clock.clone(),
                updated_at: corpus.workbench.generated_bounds.updated_at.clone(),
                ..OperationRecord::default()
            })?;
        }
    }
    let transaction_ids = Arc::new(Mutex::new(VecDeque::from(corpus.transaction_ids.clone())));
    let mut canonical_store = CanonicalStore::open(
        &main_root,
        CanonicalIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
    )?;
    canonical_store.set_transaction_ids_for_parity(Arc::clone(&transaction_ids));
    let canonical = Arc::new(Mutex::new(canonical_store));
    let canonical_port = CanonicalStorePort::new(Arc::clone(&canonical));
    let operation_index = Arc::new(AtomicUsize::new(0));
    let operation_ids = corpus.operation_ids.clone();
    let main_operation_index = Arc::clone(&operation_index);
    let topic = TopicApplication::with_factories(
        Arc::new(repository_port.clone()),
        Arc::new(canonical_port.clone()),
        Arc::new(FixtureEngine),
        {
            let clock = corpus.clock.clone();
            Arc::new(move || clock.clone())
        },
        Arc::new(move |_| {
            operation_ids[main_operation_index.fetch_add(1, Ordering::Relaxed)].clone()
        }),
    );
    let workbench_populated = workbench.read()?;
    let absent = topic.detail(TopicDetailRequest {
        topic_id: corpus.topic.topic_id.clone(),
    })?;
    let missing_update = topic.apply(full_update_request(
        &corpus.topic.apply,
        &BTreeMap::from([
            ("manifest".into(), format!("sha256:{}", "1".repeat(64))),
            ("artifact".into(), format!("sha256:{}", "2".repeat(64))),
            ("metadata".into(), format!("sha256:{}", "3".repeat(64))),
        ]),
    )?);
    let created = topic.apply(corpus.topic.apply.clone());
    let duplicate = topic.apply(corpus.topic.apply.clone());
    let update_full = topic.apply(full_update_request(&corpus.topic.apply, &created.hashes)?);
    let stale_basis = topic.apply(full_update_request(&corpus.topic.apply, &created.hashes)?);
    let update_patch = topic.apply(corpus.topic.patch.clone());
    let patch_conflict = topic.apply(manifest_outcome_request(
        &corpus.topic.patch,
        "patch_conflict",
    )?);
    let beta_create = topic.apply(topic_request_for(&corpus.topic.apply, "topic-beta")?);
    let compute_failure = topic.apply(manifest_outcome_request(
        &topic_request_for(&corpus.topic.apply, "topic-compute-failure")?,
        "compute_failure",
    )?);
    let compute_cancel = topic.apply(manifest_outcome_request(
        &topic_request_for(&corpus.topic.apply, "topic-compute-cancel")?,
        "compute_cancel",
    )?);
    let mut invalid_field_request = corpus.topic.apply.clone();
    invalid_field_request
        .bundle
        .as_object_mut()
        .ok_or_else(|| "parity_fixture_invalid".to_owned())?
        .insert("unknown".into(), json!(true));
    let invalid_field = topic.apply(invalid_field_request);
    let mut invalid_asset_request = corpus.topic.apply.clone();
    invalid_asset_request
        .assets
        .retain(|asset| asset.id != "asset/resolver");
    let invalid_asset = topic.apply(invalid_asset_request);
    let mut invalid_path_request = corpus.topic.apply.clone();
    invalid_path_request
        .assets
        .first_mut()
        .ok_or_else(|| "parity_fixture_invalid".to_owned())?
        .id = "../escape".into();
    let invalid_path = topic.apply(invalid_path_request);
    let mut invalid_size_request = corpus.topic.apply.clone();
    invalid_size_request
        .assets
        .get_mut(1)
        .ok_or_else(|| "parity_fixture_invalid".to_owned())?
        .text = "x".repeat(corpus.topic.limits.max_asset_bytes + 1);
    let invalid_size = topic.apply(invalid_size_request);
    let first_page = topic.list(TopicListRequest {
        cursor: String::new(),
        limit: 1,
    })?;
    let second_page = topic.list(TopicListRequest {
        cursor: first_page.next_cursor.clone(),
        limit: 1,
    })?;
    let detail = topic.detail(TopicDetailRequest {
        topic_id: corpus.topic.topic_id.clone(),
    })?;
    topic.stop_admission();
    let stop_admission = topic.apply(corpus.topic.apply.clone());
    topic.shutdown(Duration::from_secs(1))?;
    let main_state = state_report(
        &repository,
        &canonical,
        &[&corpus.topic.topic_id, "topic-beta"],
    )?;
    drop(topic);
    drop(workbench);
    drop(repository_port);
    drop(canonical_port);
    drop(canonical);
    drop(repository);

    let reopened_repository = Arc::new(Mutex::new(Repository::open_at(
        &main_root,
        RepositoryIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
        &corpus.clock,
    )?));
    reconcile_reopened_operations(&reopened_repository, &corpus.clock)?;
    let reopened_canonical = Arc::new(Mutex::new(CanonicalStore::open(
        &main_root,
        CanonicalIdentity {
            profile_id: corpus.profile_id.clone(),
            data_root_id: corpus.data_root_id.clone(),
        },
    )?));
    let reopened_repository_port = RepositoryPort::new(Arc::clone(&reopened_repository));
    let reopened_canonical_port = CanonicalStorePort::new(Arc::clone(&reopened_canonical));
    let reopened_workbench = WorkbenchApplication::new(Arc::new(reopened_repository_port.clone()));
    let reopened_topic = TopicApplication::new(
        Arc::new(reopened_repository_port),
        Arc::new(reopened_canonical_port),
        Arc::new(FixtureEngine),
    );
    let reopened_state = state_report(
        &reopened_repository,
        &reopened_canonical,
        &[&corpus.topic.topic_id, "topic-beta"],
    )?;
    let reopened = json!({
        "workbench":reopened_workbench.read()?,
        "detail":reopened_topic.detail(TopicDetailRequest {
            topic_id:corpus.topic.topic_id.clone(),
        })?,
        "tables":reopened_state["tables"],
        "canonical":reopened_state["canonical"],
    });
    reopened_topic.shutdown(Duration::from_secs(1))?;
    drop(reopened_topic);
    drop(reopened_workbench);
    drop(reopened_canonical);
    drop(reopened_repository);

    let drain = run_drain(&root, &corpus, &operation_index, &transaction_ids)?;
    let faults = json!({
        "canonicalBusy":run_fault(
            &root,
            "canonical-busy",
            &corpus,
            &operation_index,
            &transaction_ids,
            Some(TopicApplyStatus::CanonicalStoreBusy),
            None,
        )?,
        "failedRecovered":run_fault(
            &root,
            "failed-recovered",
            &corpus,
            &operation_index,
            &transaction_ids,
            Some(TopicApplyStatus::FailedRecovered),
            None,
        )?,
        "repairRequired":run_fault(
            &root,
            "repair-required",
            &corpus,
            &operation_index,
            &transaction_ids,
            Some(TopicApplyStatus::RepairRequired),
            None,
        )?,
        "projectionWarning":run_fault(
            &root,
            "projection-warning",
            &corpus,
            &operation_index,
            &transaction_ids,
            None,
            Some(RepositoryFault::Projection),
        )?,
        "receiptWarning":run_fault(
            &root,
            "receipt-warning",
            &corpus,
            &operation_index,
            &transaction_ids,
            None,
            Some(RepositoryFault::Receipt),
        )?,
    });
    let report = json!({
        "schema":corpus.report_schema,
        "corpusVersion":corpus.schema,
        "sourceFingerprint":std::env::var("SYNTHESIS_RUST_SOURCE_FINGERPRINT")
            .unwrap_or_else(|_| "sha256:development".into()),
        "workbench":{"empty":workbench_empty,"populated":workbench_populated},
        "topic":{
            "absent":absent,
            "missingUpdate":missing_update,
            "create":created,
            "duplicateCreate":duplicate,
            "updateFull":update_full,
            "staleBasis":stale_basis,
            "updatePatch":update_patch,
            "patchConflict":patch_conflict,
            "betaCreate":beta_create,
            "computeFailure":compute_failure,
            "computeCancel":compute_cancel,
            "invalidField":invalid_field,
            "invalidAsset":invalid_asset,
            "invalidPath":invalid_path,
            "invalidSize":invalid_size,
            "listPaging":{"firstPage":first_page,"secondPage":second_page},
            "detail":detail,
            "stopAdmission":stop_admission,
            "drain":drain,
            "faults":faults,
        },
        "tables":main_state["tables"],
        "canonical":main_state["canonical"],
        "reopen":reopened,
    });
    println!(
        "{}",
        serde_json::to_string(&report).map_err(|_| "parity_report_invalid".to_owned())?
    );
    Ok(())
}
