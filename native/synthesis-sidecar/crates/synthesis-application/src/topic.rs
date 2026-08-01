use crate::dto::{
    TopicApplyRequest, TopicApplyResult, TopicApplyStatus, TopicDetailRequest, TopicDetailResult,
    TopicListRequest, TopicListResult, TopicRecord,
};
use crate::ports::{StructuredArtifactPort, TopicCanonicalPort, TopicRepositoryPort};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;
#[cfg(test)]
use std::time::{SystemTime, UNIX_EPOCH};
use synthesis_canonical_store::{
    CurrentTopic, Promotion, TopicSnapshot, canonical_json_hash, canonical_topic_path_id,
};
use synthesis_protocol::canonical_json;
use synthesis_repository::{
    OperationRecord, TopicApplicationProjectionRecord, TopicApplicationStateRecord,
};

const MAX_ASSETS: usize = 256;
const MAX_ASSET_BYTES: usize = 5 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES: usize = 50 * 1024 * 1024;
const MAX_LIST: usize = 250;
const BUNDLE_FIELDS: &[&str] = &[
    "kind",
    "operation",
    "mode",
    "language",
    "base_hashes",
    "create_base_hashes_ignored",
    "topic_id",
    "read_section_hashes",
    "topic_definition",
    "topic_resolver",
    "resolved_paper_set",
    "resolver_manifest_path",
    "artifact_manifest_path",
    "resolver_diagnostics",
    "artifact_metadata",
    "analysis_manifest_path",
    "topic_interest_metadata_path",
    "concept_cards_proposal_path",
    "topic_graph_relation_proposals_path",
    "markdown",
    "markdown_path",
    "timeline",
];

type TextFactory = Arc<dyn Fn(&str) -> String + Send + Sync>;
type Clock = Arc<dyn Fn() -> String + Send + Sync>;

pub struct TopicApplication {
    repository: Arc<dyn TopicRepositoryPort>,
    canonical: Arc<dyn TopicCanonicalPort>,
    engine: Arc<dyn StructuredArtifactPort>,
    now: Clock,
    operation_id: TextFactory,
    transaction_id: TextFactory,
    accepting: AtomicBool,
    active: Mutex<usize>,
    drained: Condvar,
}

struct ActiveApply<'a>(&'a TopicApplication);

impl Drop for ActiveApply<'_> {
    fn drop(&mut self) {
        if let Ok(mut active) = self.0.active.lock() {
            *active = active.saturating_sub(1);
            self.0.drained.notify_all();
        }
    }
}

impl TopicApplication {
    pub fn new(
        repository: Arc<dyn TopicRepositoryPort>,
        canonical: Arc<dyn TopicCanonicalPort>,
        engine: Arc<dyn StructuredArtifactPort>,
    ) -> Self {
        let sequence = Arc::new(AtomicU64::new(0));
        let operation_sequence = Arc::clone(&sequence);
        let transaction_sequence = Arc::clone(&sequence);
        Self::with_factories(
            repository,
            canonical,
            engine,
            Arc::new(synthesis_protocol::utc_now_iso8601),
            Arc::new(move |topic_id| {
                format!(
                    "topic-apply-{}-{}",
                    canonical_topic_path_id(topic_id).unwrap_or_else(|_| "invalid".into()),
                    operation_sequence.fetch_add(1, Ordering::Relaxed)
                )
            }),
            Arc::new(move |topic_id| {
                format!(
                    "topic-transaction-{}-{}",
                    canonical_topic_path_id(topic_id).unwrap_or_else(|_| "invalid".into()),
                    transaction_sequence.fetch_add(1, Ordering::Relaxed)
                )
            }),
        )
    }

    pub fn with_factories(
        repository: Arc<dyn TopicRepositoryPort>,
        canonical: Arc<dyn TopicCanonicalPort>,
        engine: Arc<dyn StructuredArtifactPort>,
        now: Clock,
        operation_id: TextFactory,
        transaction_id: TextFactory,
    ) -> Self {
        Self {
            repository,
            canonical,
            engine,
            now,
            operation_id,
            transaction_id,
            accepting: AtomicBool::new(true),
            active: Mutex::new(0),
            drained: Condvar::new(),
        }
    }

    pub fn list(&self, request: TopicListRequest) -> Result<TopicListResult, String> {
        if request.limit == 0 || request.limit > MAX_LIST {
            return Err("invalid_request".into());
        }
        let offset = if request.cursor.is_empty() {
            0
        } else {
            request
                .cursor
                .parse::<usize>()
                .map_err(|_| "invalid_request".to_owned())?
        };
        let (rows, total) = self.repository.list_states(offset, request.limit)?;
        let returned = rows.len();
        let next = offset.saturating_add(returned);
        let topics = rows
            .into_iter()
            .map(|row| {
                let projection = self.repository.get_projection(&row.topic_id)?;
                project_record(row, projection)
            })
            .collect::<Result<Vec<_>, String>>()?;
        Ok(TopicListResult {
            topics,
            cursor: request.cursor,
            next_cursor: if next < total {
                next.to_string()
            } else {
                String::new()
            },
            has_more: next < total,
            returned,
            total,
            limit: request.limit,
        })
    }

    pub fn detail(&self, request: TopicDetailRequest) -> Result<TopicDetailResult, String> {
        validate_topic_id(&request.topic_id)?;
        let state = self.repository.get_state(&request.topic_id)?;
        let current = self.canonical.read_current(&request.topic_id)?;
        match (state, current) {
            (None, _) | (_, CurrentTopic::Absent { .. }) => Ok(TopicDetailResult::Absent {
                topic_id: request.topic_id,
                diagnostics: Vec::new(),
            }),
            (_, CurrentTopic::Invalid { diagnostics, .. }) => Ok(TopicDetailResult::Invalid {
                topic_id: request.topic_id,
                diagnostics,
            }),
            (Some(state), CurrentTopic::Ready { snapshot, .. }) => {
                let projection = self.repository.get_projection(&request.topic_id)?;
                Ok(TopicDetailResult::Ready {
                    topic_id: request.topic_id,
                    topic: Box::new(project_record(state, projection)?),
                    snapshot: Box::new(snapshot),
                })
            }
        }
    }

    pub fn apply(&self, request: TopicApplyRequest) -> TopicApplyResult {
        if !self.accepting.load(Ordering::Acquire) {
            return TopicApplyResult::failed(
                TopicApplyStatus::RepairRequired,
                String::new(),
                String::new(),
            );
        }
        let mut active = match self.active.lock() {
            Ok(active) => active,
            Err(_) => {
                return TopicApplyResult::failed(
                    TopicApplyStatus::RepairRequired,
                    String::new(),
                    String::new(),
                );
            }
        };
        if !self.accepting.load(Ordering::Acquire) {
            return TopicApplyResult::failed(
                TopicApplyStatus::RepairRequired,
                String::new(),
                String::new(),
            );
        }
        *active += 1;
        drop(active);
        let _active = ActiveApply(self);
        self.apply_admitted(request)
    }

    pub fn stop_admission(&self) {
        self.accepting.store(false, Ordering::Release);
    }

    pub fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.stop_admission();
        let active = self
            .active
            .lock()
            .map_err(|_| "topic_drain_failed".to_owned())?;
        let (active, wait) = self
            .drained
            .wait_timeout_while(active, timeout, |active| *active > 0)
            .map_err(|_| "topic_drain_failed".to_owned())?;
        if *active > 0 || wait.timed_out() {
            Err("topic_drain_timeout".into())
        } else {
            Ok(())
        }
    }

    fn apply_admitted(&self, request: TopicApplyRequest) -> TopicApplyResult {
        let rejected_topic_id = rejected_request_topic_id(&request);
        let parsed = match ParsedApply::rebuild(request) {
            Ok(parsed) => parsed,
            Err(_) => {
                return TopicApplyResult::failed(
                    TopicApplyStatus::InvalidRequest,
                    rejected_topic_id,
                    String::new(),
                );
            }
        };
        let topic_id = parsed.topic_id.clone();
        let operation_id = (self.operation_id)(&topic_id);
        let started = (self.now)();
        if self
            .repository
            .upsert_operation(&OperationRecord {
                operation_id: operation_id.clone(),
                operation_type: "topic_apply".into(),
                scope_kind: "topic".into(),
                scope_ref: topic_id.clone(),
                status: "running".into(),
                phase: "validation".into(),
                label: format!("Apply Topic {topic_id}"),
                progress_mode: "determinate".into(),
                total_count: 4,
                created_at: started.clone(),
                started_at: started.clone(),
                updated_at: started.clone(),
                ..OperationRecord::default()
            })
            .is_err()
        {
            return TopicApplyResult::failed(
                TopicApplyStatus::InvalidRequest,
                topic_id,
                operation_id,
            );
        }
        let result = self.apply_after_receipt(&parsed, &operation_id);
        if result.ok {
            return result;
        }
        let phase = apply_status_phase(result.status);
        let _ =
            self.repository
                .update_operation(&operation_id, "failed", phase, &[], &(self.now)());
        result
    }

    fn apply_after_receipt(&self, parsed: &ParsedApply, operation_id: &str) -> TopicApplyResult {
        let current = match self.canonical.read_current(&parsed.topic_id) {
            Ok(current) => current,
            Err(error) => {
                return failed_from_error(error, &parsed.topic_id, operation_id);
            }
        };
        match (&parsed.operation, &current) {
            (TopicOperation::Create, CurrentTopic::Absent { .. }) => {}
            (TopicOperation::Create, _) => {
                return TopicApplyResult::failed(
                    TopicApplyStatus::TopicExists,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
            }
            (_, CurrentTopic::Absent { .. }) => {
                return TopicApplyResult::failed(
                    TopicApplyStatus::TopicMissing,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
            }
            (_, CurrentTopic::Invalid { .. }) => {
                return TopicApplyResult::failed(
                    TopicApplyStatus::RepairRequired,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
            }
            _ => {}
        }
        let current_hashes = match &current {
            CurrentTopic::Ready { snapshot, basis } => Some((
                basis.clone(),
                canonical_json_hash(&snapshot.metadata).unwrap_or_default(),
            )),
            _ => None,
        };
        if parsed.operation == TopicOperation::UpdateFull {
            let Some((basis, metadata_hash)) = &current_hashes else {
                return TopicApplyResult::failed(
                    TopicApplyStatus::TopicMissing,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
            };
            let current = BTreeMap::from([
                ("manifest", basis.manifest_hash.as_str()),
                ("artifact", basis.artifact_hash.as_str()),
                ("metadata", metadata_hash.as_str()),
            ]);
            let mismatches = ["artifact", "manifest", "metadata"]
                .into_iter()
                .filter_map(|name| {
                    let base = parsed.base_hashes.get(name)?;
                    let actual = current.get(name).copied().unwrap_or_default();
                    (base != actual).then(|| json!({"name":name,"base":base,"current":actual}))
                })
                .collect::<Vec<_>>();
            if !mismatches.is_empty() {
                let mut result = TopicApplyResult::failed(
                    TopicApplyStatus::Conflict,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
                result.mismatches = mismatches;
                return result;
            }
        }
        let _ = self.repository.update_operation(
            operation_id,
            "running",
            "assembly",
            &[],
            &(self.now)(),
        );
        let candidate = match self.build_candidate(parsed, &current) {
            Ok(candidate) => candidate,
            Err(CandidateError::Patch(mismatches)) => {
                let mut result = TopicApplyResult::failed(
                    TopicApplyStatus::PatchConflict,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
                result.mismatches = mismatches;
                return result;
            }
            Err(CandidateError::Code(_code)) => {
                let mut result = TopicApplyResult::failed(
                    TopicApplyStatus::InvalidRequest,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
                result.warnings.push("topic_apply_invalid".into());
                return result;
            }
        };
        let timestamp = (self.now)();
        let created_at = match &current {
            CurrentTopic::Ready { snapshot, .. } => snapshot.metadata["created_at"]
                .as_str()
                .filter(|value| !value.is_empty())
                .unwrap_or(&timestamp)
                .to_owned(),
            _ => timestamp.clone(),
        };
        let metadata = json!({
            "schema_id":"synthesis.topic_artifact_metadata",
            "schema_version":"1.0.0",
            "created_at":created_at,
            "updated_at":timestamp,
            "data":{
                "topic_id":parsed.topic_id,
                "title":parsed.title,
                "definition":parsed.definition,
                "language":parsed.language,
                "operation":parsed.operation.as_str(),
                "artifact_metadata":parsed.artifact_metadata,
            }
        });
        let artifact_hash = match canonical_json_hash(&candidate.artifact) {
            Ok(hash) => hash,
            Err(error) => return failed_from_error(error, &parsed.topic_id, operation_id),
        };
        let metadata_hash = match canonical_json_hash(&metadata) {
            Ok(hash) => hash,
            Err(error) => return failed_from_error(error, &parsed.topic_id, operation_id),
        };
        let section_hashes = candidate
            .sections
            .iter()
            .map(|(name, value)| canonical_json_hash(value).map(|hash| (name.clone(), hash)))
            .collect::<Result<BTreeMap<_, _>, _>>();
        let section_hashes = match section_hashes {
            Ok(hashes) => hashes,
            Err(error) => return failed_from_error(error, &parsed.topic_id, operation_id),
        };
        let mut manifest = candidate.manifest.as_object().cloned().unwrap_or_default();
        manifest.insert("artifact_hash".into(), json!(artifact_hash));
        manifest.insert("metadata_hash".into(), json!(metadata_hash));
        manifest.insert("section_hashes".into(), json!(section_hashes));
        let snapshot = TopicSnapshot {
            topic_id: parsed.topic_id.clone(),
            path_id: match canonical_topic_path_id(&parsed.topic_id) {
                Ok(path) => path,
                Err(error) => return failed_from_error(error, &parsed.topic_id, operation_id),
            },
            manifest: Value::Object(manifest),
            artifact: candidate.artifact,
            metadata,
            sections: candidate.sections,
            markdown: BTreeMap::new(),
        };
        let manifest_hash = match canonical_json_hash(&snapshot.manifest) {
            Ok(hash) => hash,
            Err(error) => return failed_from_error(error, &parsed.topic_id, operation_id),
        };
        let _ = self.repository.update_operation(
            operation_id,
            "running",
            "promotion",
            &[],
            &(self.now)(),
        );
        let expected_basis = match &current {
            CurrentTopic::Ready { basis, .. } => Some(basis.clone()),
            _ => None,
        };
        if let Err(error) = self.canonical.promote(Promotion {
            transaction_id: (self.transaction_id)(&parsed.topic_id),
            expected_basis,
            snapshot: snapshot.clone(),
        }) {
            return failed_from_error(error, &parsed.topic_id, operation_id);
        }
        let mut warnings = Vec::new();
        let _ = self.repository.update_operation(
            operation_id,
            "running",
            "projection",
            &[],
            &(self.now)(),
        );
        let inherited_state = if parsed.operation == TopicOperation::UpdatePatch {
            self.repository.get_state(&parsed.topic_id).ok().flatten()
        } else {
            None
        };
        let topic_resolver_json = if parsed.topic_resolver == json!({}) {
            inherited_state
                .as_ref()
                .map(|state| state.topic_resolver_json.clone())
                .unwrap_or_else(|| "{}".into())
        } else {
            canonical_json(&parsed.topic_resolver).unwrap_or_else(|_| "{}".into())
        };
        let resolved_paper_set_json = if parsed.resolved_paper_set == json!({}) {
            inherited_state
                .as_ref()
                .map(|state| state.resolved_paper_set_json.clone())
                .unwrap_or_else(|| "{}".into())
        } else {
            canonical_json(&parsed.resolved_paper_set).unwrap_or_else(|_| "{}".into())
        };
        let state = TopicApplicationStateRecord {
            topic_id: parsed.topic_id.clone(),
            path_id: snapshot.path_id.clone(),
            title: parsed.title.clone(),
            definition: parsed.definition.clone(),
            language: parsed.language.clone(),
            operation: parsed.operation.as_str().into(),
            manifest_hash: manifest_hash.clone(),
            artifact_hash: artifact_hash.clone(),
            metadata_hash: metadata_hash.clone(),
            bundle_hash: canonical_json_hash(&parsed.bundle).unwrap_or_default(),
            paper_count: snapshot.artifact["source_papers"]
                .as_array()
                .map(|rows| rows.len() as i64)
                .unwrap_or_default(),
            topic_definition_json: canonical_json(&parsed.topic_definition)
                .unwrap_or_else(|_| "{}".into()),
            topic_resolver_json,
            resolved_paper_set_json,
            created_at,
            updated_at: timestamp.clone(),
        };
        let source_paper_refs = snapshot.artifact["source_papers"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(|paper| paper["paper_ref"].as_str())
            .filter(|paper_ref| !paper_ref.trim().is_empty())
            .collect::<Vec<_>>();
        let projection = TopicApplicationProjectionRecord {
            topic_id: parsed.topic_id.clone(),
            topic_graph_json: canonical_json(&json!({
                "topic":{
                    "topic_id":parsed.topic_id,
                    "title":parsed.title,
                    "definition":parsed.definition,
                    "artifact_hash":artifact_hash,
                },
                "relations":parsed.relations,
            }))
            .unwrap_or_else(|_| "{}".into()),
            concepts_json: canonical_json(&parsed.concepts).unwrap_or_else(|_| "{}".into()),
            interest_metadata_json: canonical_json(&parsed.interest)
                .unwrap_or_else(|_| "{}".into()),
            discovery_json: canonical_json(&json!({"source_paper_refs":source_paper_refs}))
                .unwrap_or_else(|_| "{}".into()),
            updated_at: timestamp.clone(),
        };
        if self.repository.upsert_state(&state).is_err()
            || self.repository.upsert_projection(&projection).is_err()
        {
            warnings.push("topic_projection_failed".into());
        }
        if self
            .repository
            .update_operation(
                operation_id,
                "completed",
                "completed",
                &warnings,
                &(self.now)(),
            )
            .is_err()
        {
            warnings.push("topic_operation_receipt_failed".into());
        }
        TopicApplyResult {
            ok: true,
            status: TopicApplyStatus::Persisted,
            topic_id: parsed.topic_id.clone(),
            operation_id: operation_id.into(),
            hashes: BTreeMap::from([
                ("manifest".into(), manifest_hash),
                ("artifact".into(), artifact_hash),
                ("metadata".into(), metadata_hash),
            ]),
            mismatches: Vec::new(),
            warnings,
        }
    }

    fn build_candidate(
        &self,
        parsed: &ParsedApply,
        current: &CurrentTopic,
    ) -> Result<Candidate, CandidateError> {
        if parsed.operation == TopicOperation::UpdatePatch {
            let CurrentTopic::Ready { snapshot, .. } = current else {
                return Err(CandidateError::Code("topic_missing".into()));
            };
            let changed = read_manifest_sections(
                parsed.manifest["patch"]["sections"].as_object(),
                &parsed.assets,
            )
            .map_err(CandidateError::Code)?;
            let patched = self
                .engine
                .apply_section_patch(snapshot, &parsed.manifest, &changed)
                .map_err(CandidateError::Code)?;
            if !patched.mismatches.is_empty() {
                return Err(CandidateError::Patch(patched.mismatches));
            }
            let sections = patched.sections;
            let mut manifest = snapshot.manifest.as_object().cloned().unwrap_or_default();
            manifest.insert("operation".into(), json!("update_patch"));
            manifest.insert("language".into(), json!(parsed.language));
            manifest.insert(
                "sections".into(),
                Value::Object(
                    sections
                        .keys()
                        .map(|name| {
                            (
                                name.clone(),
                                json!({"path":format!("current/sections/{name}.json")}),
                            )
                        })
                        .collect(),
                ),
            );
            let manifest = Value::Object(manifest);
            let artifact = self
                .engine
                .assemble_artifact(&manifest, &sections)
                .map_err(CandidateError::Code)?;
            self.engine
                .validate_artifact(&artifact, &parsed.language)
                .map_err(CandidateError::Code)?;
            return Ok(Candidate {
                manifest,
                artifact,
                sections,
            });
        }
        self.engine
            .validate_manifest(&parsed.manifest)
            .map_err(CandidateError::Code)?;
        let sections =
            read_manifest_sections(parsed.manifest["sections"].as_object(), &parsed.assets)
                .map_err(CandidateError::Code)?;
        let artifact = self
            .engine
            .assemble_artifact(&parsed.manifest, &sections)
            .map_err(CandidateError::Code)?;
        self.engine
            .validate_artifact(&artifact, &parsed.language)
            .map_err(CandidateError::Code)?;
        Ok(Candidate {
            manifest: parsed.manifest.clone(),
            artifact,
            sections,
        })
    }
}

fn rejected_request_topic_id(request: &TopicApplyRequest) -> String {
    if materialize_assets(&request.assets).is_err() {
        return String::new();
    }
    let Some(bundle) = request.bundle.as_object() else {
        return String::new();
    };
    if bundle
        .keys()
        .any(|key| !BUNDLE_FIELDS.contains(&key.as_str()))
        || bundle.get("kind").and_then(Value::as_str) != Some("topic_synthesis")
    {
        return String::new();
    }
    let definition_id = bundle
        .get("topic_definition")
        .and_then(Value::as_object)
        .and_then(|definition| definition.get("id"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    let bundle_id = bundle
        .get("topic_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let topic_id = if definition_id.is_empty() {
        bundle_id
    } else {
        definition_id
    };
    if validate_topic_id(topic_id).is_ok() {
        topic_id.to_owned()
    } else {
        String::new()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum TopicOperation {
    Create,
    UpdateFull,
    UpdatePatch,
}

impl TopicOperation {
    fn as_str(self) -> &'static str {
        match self {
            Self::Create => "create",
            Self::UpdateFull => "update_full",
            Self::UpdatePatch => "update_patch",
        }
    }
}

struct ParsedApply {
    bundle: Value,
    operation: TopicOperation,
    topic_id: String,
    title: String,
    definition: String,
    language: String,
    base_hashes: BTreeMap<String, String>,
    topic_definition: Value,
    topic_resolver: Value,
    resolved_paper_set: Value,
    artifact_metadata: Value,
    manifest: Value,
    assets: BTreeMap<String, Value>,
    interest: Value,
    concepts: Value,
    relations: Value,
}

impl ParsedApply {
    fn rebuild(request: TopicApplyRequest) -> Result<Self, String> {
        let bundle = request
            .bundle
            .as_object()
            .ok_or_else(|| "invalid_request".to_owned())?;
        if bundle
            .keys()
            .any(|key| !BUNDLE_FIELDS.contains(&key.as_str()))
            || bundle.get("kind").and_then(Value::as_str) != Some("topic_synthesis")
        {
            return Err("invalid_request".into());
        }
        let operation = match bundle.get("operation").and_then(Value::as_str) {
            Some("create") => TopicOperation::Create,
            Some("update_full") => TopicOperation::UpdateFull,
            Some("update_patch") => TopicOperation::UpdatePatch,
            _ => return Err("invalid_request".into()),
        };
        let language = nonempty_string(bundle.get("language"), 4096)?;
        if bundle
            .get("markdown")
            .and_then(Value::as_str)
            .is_some_and(|value| !value.trim().is_empty())
            || bundle
                .get("markdown_path")
                .and_then(Value::as_str)
                .is_some_and(|value| !value.trim().is_empty())
        {
            return Err("invalid_request".into());
        }
        let definition = bundle
            .get("topic_definition")
            .and_then(Value::as_object)
            .cloned()
            .unwrap_or_default();
        let definition_id = definition
            .get("id")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let bundle_id = bundle
            .get("topic_id")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let topic_id = if definition_id.is_empty() {
            bundle_id
        } else {
            definition_id
        };
        validate_topic_id(topic_id)?;
        if !bundle_id.is_empty() && bundle_id != topic_id {
            return Err("invalid_request".into());
        }
        if operation != TopicOperation::UpdatePatch && definition_id.is_empty() {
            return Err("invalid_request".into());
        }
        let assets = materialize_assets(&request.assets)?;
        let manifest_id = bundle
            .get("analysis_manifest_path")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .or_else(|| {
                bundle
                    .get("artifact_manifest_path")
                    .and_then(Value::as_str)
                    .filter(|value| !value.is_empty())
            })
            .ok_or_else(|| "invalid_request".to_owned())?;
        let manifest = assets
            .get(manifest_id)
            .cloned()
            .ok_or_else(|| "invalid_request".to_owned())?;
        let manifest_object = manifest
            .as_object()
            .ok_or_else(|| "invalid_request".to_owned())?;
        let entries = if operation == TopicOperation::UpdatePatch {
            manifest_object
                .get("patch")
                .and_then(Value::as_object)
                .and_then(|patch| patch.get("sections"))
                .and_then(Value::as_object)
        } else {
            manifest_object.get("sections").and_then(Value::as_object)
        };
        let _ = read_manifest_sections(entries, &assets)?;
        let base_hashes = bundle
            .get("base_hashes")
            .and_then(Value::as_object)
            .map(|hashes| {
                hashes
                    .iter()
                    .filter_map(|(key, value)| {
                        value.as_str().map(|value| (key.clone(), value.into()))
                    })
                    .collect::<BTreeMap<_, _>>()
            })
            .unwrap_or_default();
        if operation == TopicOperation::UpdateFull
            && ["artifact", "manifest", "metadata"]
                .iter()
                .any(|name| base_hashes.get(*name).is_none_or(String::is_empty))
        {
            return Err("invalid_request".into());
        }
        let resolver = read_resolver(bundle, &assets, operation != TopicOperation::UpdatePatch)?;
        let topic_definition = Value::Object(definition.clone());
        let title = definition
            .get("title")
            .and_then(Value::as_str)
            .filter(|value| !value.trim().is_empty())
            .unwrap_or(topic_id)
            .trim()
            .to_owned();
        let definition_text = definition
            .get("definition")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_owned();
        let interest = read_optional_asset(bundle.get("topic_interest_metadata_path"), &assets);
        let concepts = read_optional_asset(bundle.get("concept_cards_proposal_path"), &assets);
        let relations =
            read_optional_asset(bundle.get("topic_graph_relation_proposals_path"), &assets);
        Ok(Self {
            bundle: Value::Object(bundle.clone()),
            operation,
            topic_id: topic_id.into(),
            title,
            definition: definition_text,
            language,
            base_hashes,
            topic_definition,
            topic_resolver: resolver.0,
            resolved_paper_set: resolver.1,
            artifact_metadata: bundle
                .get("artifact_metadata")
                .filter(|value| value.is_object())
                .cloned()
                .unwrap_or_else(|| json!({})),
            manifest,
            assets,
            interest,
            concepts,
            relations,
        })
    }
}

struct Candidate {
    manifest: Value,
    artifact: Value,
    sections: BTreeMap<String, Value>,
}

enum CandidateError {
    Code(String),
    Patch(Vec<Value>),
}

fn validate_topic_id(value: &str) -> Result<(), String> {
    if value.is_empty()
        || value.trim() != value
        || value.len() > 512
        || value.contains(['/', '\\'])
        || matches!(value, "." | "..")
        || value.chars().any(char::is_control)
    {
        Err("invalid_request".into())
    } else {
        Ok(())
    }
}

fn nonempty_string(value: Option<&Value>, max: usize) -> Result<String, String> {
    value
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty() && value.len() <= max)
        .map(|value| value.trim().to_owned())
        .ok_or_else(|| "invalid_request".into())
}

fn valid_asset_id(value: &str) -> bool {
    !value.is_empty()
        && value.trim() == value
        && value.len() <= 256
        && !value.starts_with('/')
        && !value.contains('\\')
        && !value.contains("://")
        && !value
            .split('/')
            .any(|segment| segment.is_empty() || segment == "..")
}

fn materialize_assets(
    assets: &[crate::dto::TopicAsset],
) -> Result<BTreeMap<String, Value>, String> {
    if assets.len() > MAX_ASSETS {
        return Err("invalid_request".into());
    }
    let mut seen = BTreeSet::new();
    let mut total = 0usize;
    let mut values = BTreeMap::new();
    for asset in assets {
        if !valid_asset_id(&asset.id)
            || !seen.insert(asset.id.clone())
            || !matches!(
                asset.media_type.as_str(),
                "application/json" | "text/markdown" | "text/plain"
            )
        {
            return Err("invalid_request".into());
        }
        let bytes = asset.text.len();
        total = total.saturating_add(bytes);
        if bytes > MAX_ASSET_BYTES || total > MAX_TOTAL_ASSET_BYTES {
            return Err("invalid_request".into());
        }
        if asset.media_type == "application/json" {
            let value =
                serde_json::from_str(&asset.text).map_err(|_| "invalid_request".to_owned())?;
            values.insert(asset.id.clone(), value);
        }
    }
    Ok(values)
}

fn read_manifest_sections(
    entries: Option<&Map<String, Value>>,
    assets: &BTreeMap<String, Value>,
) -> Result<BTreeMap<String, Value>, String> {
    let mut sections = BTreeMap::new();
    for (name, entry) in entries.into_iter().flatten() {
        let path = entry
            .as_object()
            .and_then(|entry| entry.get("path"))
            .and_then(Value::as_str)
            .ok_or_else(|| "invalid_request".to_owned())?;
        let value = assets
            .get(path)
            .cloned()
            .ok_or_else(|| "invalid_request".to_owned())?;
        sections.insert(name.clone(), value);
    }
    Ok(sections)
}

fn read_resolver(
    bundle: &Map<String, Value>,
    assets: &BTreeMap<String, Value>,
    required: bool,
) -> Result<(Value, Value), String> {
    if let (Some(topic_resolver), Some(resolved_paper_set)) = (
        bundle.get("topic_resolver"),
        bundle.get("resolved_paper_set"),
    ) && topic_resolver.is_object()
        && resolved_paper_set["papers"].as_array().is_some()
    {
        return Ok((topic_resolver.clone(), resolved_paper_set.clone()));
    }
    let id = bundle
        .get("resolver_manifest_path")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty());
    let Some(id) = id else {
        return if required {
            Err("invalid_request".into())
        } else {
            Ok((json!({}), json!({})))
        };
    };
    let resolver = assets
        .get(id)
        .and_then(Value::as_object)
        .ok_or_else(|| "invalid_request".to_owned())?;
    let resolved = resolver
        .get("resolved_paper_set")
        .or_else(|| resolver.get("resolution_result"))
        .filter(|value| value["papers"].as_array().is_some())
        .cloned()
        .ok_or_else(|| "invalid_request".to_owned())?;
    Ok((
        resolver
            .get("topic_resolver")
            .or_else(|| resolver.get("resolver"))
            .filter(|value| value.is_object())
            .cloned()
            .unwrap_or_else(|| json!({})),
        resolved,
    ))
}

fn read_optional_asset(id: Option<&Value>, assets: &BTreeMap<String, Value>) -> Value {
    id.and_then(Value::as_str)
        .and_then(|id| assets.get(id))
        .filter(|value| value.is_object())
        .cloned()
        .unwrap_or_else(|| json!({}))
}

fn parse_object(text: &str) -> Result<Value, String> {
    let value: Value = serde_json::from_str(text).map_err(|_| "repository_topic_json_invalid")?;
    if value.is_object() {
        Ok(value)
    } else {
        Err("repository_topic_json_invalid".into())
    }
}

fn project_record(
    state: TopicApplicationStateRecord,
    projection: Option<TopicApplicationProjectionRecord>,
) -> Result<TopicRecord, String> {
    let projection = projection
        .map(|projection| {
            Ok::<Value, String>(json!({
                "topicGraph":parse_object(&projection.topic_graph_json)?,
                "concepts":parse_object(&projection.concepts_json)?,
                "interestMetadata":parse_object(&projection.interest_metadata_json)?,
                "discovery":parse_object(&projection.discovery_json)?,
            }))
        })
        .transpose()?
        .unwrap_or_else(|| json!({}));
    Ok(TopicRecord {
        topic_id: state.topic_id,
        path_id: state.path_id,
        title: state.title,
        definition: state.definition,
        language: state.language,
        operation: state.operation,
        manifest_hash: state.manifest_hash,
        artifact_hash: state.artifact_hash,
        metadata_hash: state.metadata_hash,
        bundle_hash: state.bundle_hash,
        paper_count: state.paper_count,
        updated_at: state.updated_at,
        topic_definition: parse_object(&state.topic_definition_json)?,
        topic_resolver: parse_object(&state.topic_resolver_json)?,
        resolved_paper_set: parse_object(&state.resolved_paper_set_json)?,
        projection,
    })
}

fn apply_status_phase(status: TopicApplyStatus) -> &'static str {
    match status {
        TopicApplyStatus::TopicExists => "topic_exists",
        TopicApplyStatus::TopicMissing => "topic_missing",
        TopicApplyStatus::Conflict => "basis_conflict",
        TopicApplyStatus::PatchConflict => "patch_conflict",
        TopicApplyStatus::CanonicalStoreBusy => "canonical_store_busy",
        TopicApplyStatus::FailedRecovered => "failed_recovered",
        TopicApplyStatus::RepairRequired => "repair_required",
        TopicApplyStatus::Persisted => "completed",
        TopicApplyStatus::InvalidRequest => "invalid_request",
    }
}

fn failed_from_error(error: String, topic_id: &str, operation_id: &str) -> TopicApplyResult {
    let status = match error.as_str() {
        "basis_mismatch" => TopicApplyStatus::Conflict,
        "canonical_store_busy" => TopicApplyStatus::CanonicalStoreBusy,
        "failed_recovered" => TopicApplyStatus::FailedRecovered,
        "repair_required" => TopicApplyStatus::RepairRequired,
        _ => TopicApplyStatus::InvalidRequest,
    };
    let mut result = TopicApplyResult::failed(status, topic_id.to_owned(), operation_id.to_owned());
    if status == TopicApplyStatus::InvalidRequest {
        result.warnings.push("topic_apply_invalid".into());
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dto::{PatchOutput, TopicAsset};
    use crate::ports::{CanonicalStorePort, RepositoryPort};
    use std::fs;
    use std::path::PathBuf;
    use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
    use synthesis_repository::{Repository, RepositoryIdentity};

    struct FixtureEngine;

    impl StructuredArtifactPort for FixtureEngine {
        fn validate_manifest(&self, manifest: &Value) -> Result<(), String> {
            if manifest.is_object() {
                Ok(())
            } else {
                Err("manifest_invalid".into())
            }
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
                ("schema_version".into(), json!("3.0.0")),
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
            current: &TopicSnapshot,
            _patch_manifest: &Value,
            changed_sections: &BTreeMap<String, Value>,
        ) -> Result<PatchOutput, String> {
            let mut sections = current.sections.clone();
            sections.extend(changed_sections.clone());
            Ok(PatchOutput {
                sections,
                mismatches: Vec::new(),
            })
        }
    }

    fn root(label: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "synthesis-typed-topic-{label}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(&root).expect("root");
        root
    }

    fn owners(root: &std::path::Path) -> (RepositoryPort, CanonicalStorePort) {
        let repository = Repository::open(
            root,
            RepositoryIdentity {
                profile_id: "profile:typed".into(),
                data_root_id: "data:typed".into(),
            },
        )
        .expect("repository");
        let canonical = CanonicalStore::open(
            root,
            CanonicalIdentity {
                profile_id: "profile:typed".into(),
                data_root_id: "data:typed".into(),
            },
        )
        .expect("canonical");
        (
            RepositoryPort::new(Arc::new(Mutex::new(repository))),
            CanonicalStorePort::new(Arc::new(Mutex::new(canonical))),
        )
    }

    fn make_application(root: &std::path::Path) -> TopicApplication {
        let (repository, canonical) = owners(root);
        let sequence = Arc::new(AtomicU64::new(0));
        let operation_sequence = Arc::clone(&sequence);
        let transaction_sequence = Arc::clone(&sequence);
        TopicApplication::with_factories(
            Arc::new(repository),
            Arc::new(canonical),
            Arc::new(FixtureEngine),
            Arc::new(|| "2026-07-26T12:00:00.000Z".into()),
            Arc::new(move |topic| {
                format!(
                    "operation:{topic}:{}",
                    operation_sequence.fetch_add(1, Ordering::Relaxed)
                )
            }),
            Arc::new(move |topic| {
                format!(
                    "transaction:{topic}:{}",
                    transaction_sequence.fetch_add(1, Ordering::Relaxed)
                )
            }),
        )
    }

    fn request(topic_id: &str, operation: &str) -> TopicApplyRequest {
        let manifest = if operation == "update_patch" {
            json!({
                "schema_id":"synthesis.topic_analysis_patch",
                "schema_version":"3.0.0",
                "topic_id":topic_id,
                "patch":{"sections":{"claims":{"path":"asset/claims"}}},
            })
        } else {
            json!({
                "schema_id":"synthesis.topic_analysis_manifest",
                "schema_version":"3.0.0",
                "topic_id":topic_id,
                "language":"en",
                "sections":{
                    "claims":{"path":"asset/claims"},
                    "source_papers":{"path":"asset/papers"},
                },
            })
        };
        TopicApplyRequest {
            bundle: json!({
                "kind":"topic_synthesis",
                "operation":operation,
                "mode":if operation == "create" {"create"} else {"update"},
                "language":"en",
                "topic_id":topic_id,
                "topic_definition":{
                    "id":topic_id,
                    "title":"Typed Topic",
                    "definition":"Typed parity reference slice",
                },
                "resolver_manifest_path":"asset/resolver",
                "analysis_manifest_path":"asset/manifest",
                "artifact_metadata":{},
                "markdown":"",
            }),
            assets: vec![
                TopicAsset {
                    id: "asset/manifest".into(),
                    media_type: "application/json".into(),
                    text: serde_json::to_string(&manifest).expect("manifest"),
                },
                TopicAsset {
                    id: "asset/claims".into(),
                    media_type: "application/json".into(),
                    text: r#"[{"id":"claim:one","text":"One"}]"#.into(),
                },
                TopicAsset {
                    id: "asset/papers".into(),
                    media_type: "application/json".into(),
                    text: r#"[{"paper_ref":"1:AAAA"}]"#.into(),
                },
                TopicAsset {
                    id: "asset/resolver".into(),
                    media_type: "application/json".into(),
                    text: r#"{"resolver":{"query":"typed"},"resolved_paper_set":{"papers":[{"paper_ref":"1:AAAA"}]}}"#.into(),
                },
            ],
        }
    }

    #[test]
    fn create_list_detail_duplicate_and_reopen_are_typed_and_durable() {
        let root = root("create");
        let application = make_application(&root);
        assert!(
            application
                .list(TopicListRequest::default())
                .unwrap()
                .topics
                .is_empty()
        );
        let created = application.apply(request("topic-alpha", "create"));
        assert_eq!(created.status, TopicApplyStatus::Persisted);
        assert!(created.ok);
        assert_eq!(
            application
                .list(TopicListRequest::default())
                .unwrap()
                .topics
                .len(),
            1
        );
        assert!(matches!(
            application
                .detail(TopicDetailRequest {
                    topic_id: "topic-alpha".into()
                })
                .unwrap(),
            TopicDetailResult::Ready { .. }
        ));
        assert_eq!(
            application.apply(request("topic-alpha", "create")).status,
            TopicApplyStatus::TopicExists
        );
        drop(application);
        let reopened = make_application(&root);
        assert!(matches!(
            reopened
                .detail(TopicDetailRequest {
                    topic_id: "topic-alpha".into()
                })
                .unwrap(),
            TopicDetailResult::Ready { .. }
        ));
        drop(reopened);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn full_update_checks_basis_and_patch_inherits_sections() {
        let root = root("update");
        let application = make_application(&root);
        let created = application.apply(request("topic-alpha", "create"));
        let mut stale = request("topic-alpha", "update_full");
        stale.bundle["base_hashes"] = json!({
            "manifest":"sha256:stale",
            "artifact":created.hashes["artifact"],
            "metadata":created.hashes["metadata"],
        });
        assert_eq!(application.apply(stale).status, TopicApplyStatus::Conflict);
        let mut update = request("topic-alpha", "update_full");
        update.bundle["base_hashes"] = json!({
            "manifest":created.hashes["manifest"],
            "artifact":created.hashes["artifact"],
            "metadata":created.hashes["metadata"],
        });
        let updated = application.apply(update);
        assert_eq!(updated.status, TopicApplyStatus::Persisted);
        let patched = application.apply(request("topic-alpha", "update_patch"));
        assert_eq!(patched.status, TopicApplyStatus::Persisted);
        let detail = application
            .detail(TopicDetailRequest {
                topic_id: "topic-alpha".into(),
            })
            .unwrap();
        let TopicDetailResult::Ready { snapshot, .. } = detail else {
            panic!("ready");
        };
        assert!(snapshot.sections.contains_key("source_papers"));
        drop(application);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn invalid_assets_write_no_operation_and_stopped_admission_is_bounded() {
        let root = root("invalid");
        let application = make_application(&root);
        let mut invalid = request("topic-alpha", "create");
        invalid.assets[0].id = "../escape".into();
        let result = application.apply(invalid);
        assert_eq!(result.status, TopicApplyStatus::InvalidRequest);
        application.stop_admission();
        assert_eq!(
            application.apply(request("topic-alpha", "create")).status,
            TopicApplyStatus::RepairRequired
        );
        assert_eq!(application.shutdown(Duration::from_millis(10)), Ok(()));
        drop(application);
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile:typed".into(),
                data_root_id: "data:typed".into(),
            },
        )
        .expect("repository");
        assert!(
            repository
                .query("SELECT operation_id FROM synt_operation", &[])
                .expect("operations")
                .is_empty()
        );
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }
}
