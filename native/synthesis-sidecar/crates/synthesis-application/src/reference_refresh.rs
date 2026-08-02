use crate::PromotionCheckpoint;
use crate::ports::ReferenceRefreshRepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;
#[cfg(test)]
use std::time::{SystemTime, UNIX_EPOCH};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    CanonicalReferenceRecord, LiteratureMatchingMetadataRecord, OperationRecord,
    RawReferenceRecord, ReferenceApplicationStateRecord, ReferenceArtifactRecord,
    ReferenceBindingFactRecord, ReferenceProjectionReplacement, ReferenceProjectionScope,
    ReferenceRevisionReviewRecord, ReferenceSourceRecord,
};

const MAX_PREPARATION_BYTES: usize = 8 * 1024 * 1024;
const MAX_PREPARATION_JSON_NODES: usize = 250_000;
pub const REFERENCE_REFRESH_MATERIALIZED_MAX_BYTES: usize = 2 * 8 * 1024 * 1024 + 64 * 1024;
pub const REFERENCE_REFRESH_MATERIALIZED_MAX_JSON_NODES: usize = 2 * 250_000 + 1_024;
const MAX_SOURCES: usize = 100;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ReferenceRefreshApplyCapacity {
    pub bytes: usize,
    pub json_nodes: usize,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReferenceRefreshStatus {
    Prepared,
    Promoted,
    Unchanged,
    BasisMismatch,
    ReferenceRefreshBusy,
    PreparationMissing,
    PayloadStale,
    InvalidRequest,
    ProjectionFailed,
    RepairRequired,
    Stopping,
    Discarded,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceRefreshInspectResult {
    pub reference_hash: Option<String>,
    pub input_hash: Option<String>,
    pub source_count: i64,
    pub reference_count: i64,
    pub canonical_count: i64,
    pub binding_count: i64,
    pub reference_ready: bool,
    pub graph_ready: bool,
    pub related_items_ready: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceRefreshMutationResult {
    pub status: ReferenceRefreshStatus,
    pub reference_hash: Option<String>,
    pub input_hash: Option<String>,
    pub warnings: Vec<String>,
    pub affected_source_refs: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum ReferenceRefreshScope {
    Full,
    Sources { source_refs: Vec<String> },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceRefreshItem {
    pub paper_ref: String,
    pub library_id: i64,
    pub item_key: String,
    pub title: String,
    #[serde(default)]
    pub year: String,
    #[serde(flatten)]
    pub metadata: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReferenceArtifactType {
    Digest,
    References,
    CitationAnalysis,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceArtifactDescriptor {
    pub paper_ref: String,
    pub artifact_type: ReferenceArtifactType,
    pub payload_type: String,
    pub status: String,
    pub locator: String,
    pub payload_hash: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub estimated_size: Option<usize>,
    #[serde(default)]
    pub diagnostics: Vec<Value>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceRefreshPrepareRequest {
    pub expected_reference_hash: Option<String>,
    #[serde(default)]
    pub force: bool,
    pub scope: ReferenceRefreshScope,
    pub items: Vec<ReferenceRefreshItem>,
    pub artifacts: Vec<ReferenceArtifactDescriptor>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceRefreshRead {
    pub paper_ref: String,
    pub artifact_type: ReferenceArtifactType,
    pub locator: String,
    pub expected_hash: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceRefreshPrepareResult {
    pub status: ReferenceRefreshStatus,
    pub reference_hash: Option<String>,
    pub input_hash: Option<String>,
    pub preparation_id: Option<String>,
    pub reads: Vec<ReferenceRefreshRead>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceRefreshPayload {
    pub locator: String,
    pub expected_hash: String,
    pub status: String,
    pub payload_hash: String,
    pub content: Value,
    #[serde(default)]
    pub diagnostics: Vec<Value>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceRefreshApplyRequest {
    pub preparation_id: String,
    pub payloads: Vec<ReferenceRefreshPayload>,
}

#[derive(Clone)]
struct Preparation {
    id: String,
    operation_id: String,
    input_hash: String,
    request: ReferenceRefreshPrepareRequest,
    reads: Vec<ReferenceRefreshRead>,
    replace_source_refs: Vec<String>,
    binding_candidates: Vec<ReferenceRefreshItem>,
}

struct RefreshState {
    accepting: bool,
    active: bool,
    preparation: Option<Preparation>,
}

type Clock = Arc<dyn Fn() -> String + Send + Sync>;
type IdFactory = Arc<dyn Fn() -> String + Send + Sync>;

pub struct ReferenceRefreshApplication {
    repository: Arc<dyn ReferenceRefreshRepositoryPort>,
    now: Clock,
    preparation_id: IdFactory,
    state: Mutex<RefreshState>,
    drained: Condvar,
}

struct ActiveApply<'a>(&'a ReferenceRefreshApplication);

impl Drop for ActiveApply<'_> {
    fn drop(&mut self) {
        if let Ok(mut state) = self.0.state.lock() {
            state.active = false;
            self.0.drained.notify_all();
        }
    }
}

impl ReferenceRefreshApplication {
    pub fn new(repository: Arc<dyn ReferenceRefreshRepositoryPort>) -> Self {
        let sequence = Arc::new(AtomicU64::new(0));
        let id_sequence = Arc::clone(&sequence);
        Self::with_factories(
            repository,
            Arc::new(synthesis_protocol::utc_now_iso8601),
            Arc::new(move || {
                format!(
                    "reference-refresh:{}",
                    id_sequence.fetch_add(1, Ordering::Relaxed)
                )
            }),
        )
    }

    pub fn with_factories(
        repository: Arc<dyn ReferenceRefreshRepositoryPort>,
        now: Clock,
        preparation_id: IdFactory,
    ) -> Self {
        Self {
            repository,
            now,
            preparation_id,
            state: Mutex::new(RefreshState {
                accepting: true,
                active: false,
                preparation: None,
            }),
            drained: Condvar::new(),
        }
    }

    pub fn inspect(&self) -> Result<ReferenceRefreshInspectResult, String> {
        Ok(inspect_state(self.repository.get_state()?))
    }

    pub fn prepare_refresh(
        &self,
        request: ReferenceRefreshPrepareRequest,
    ) -> ReferenceRefreshPrepareResult {
        self.prepare_refresh_with_options(request, Vec::new(), false, false)
    }

    pub fn prepare_literature_apply(
        &self,
        request: ReferenceRefreshPrepareRequest,
        binding_candidates: Vec<ReferenceRefreshItem>,
    ) -> ReferenceRefreshPrepareResult {
        self.prepare_refresh_with_options(request, binding_candidates, true, true)
    }

    fn prepare_refresh_with_options(
        &self,
        request: ReferenceRefreshPrepareRequest,
        binding_candidates: Vec<ReferenceRefreshItem>,
        bypass_unchanged: bool,
        reproject_sources: bool,
    ) -> ReferenceRefreshPrepareResult {
        if validate_prepare(&request).is_err() {
            return self.prepare_result(ReferenceRefreshStatus::InvalidRequest, None, Vec::new());
        }
        {
            let mut state = match self.state.lock() {
                Ok(state) => state,
                Err(_) => {
                    return self.prepare_result(
                        ReferenceRefreshStatus::RepairRequired,
                        None,
                        Vec::new(),
                    );
                }
            };
            if !state.accepting {
                return self.prepare_result(ReferenceRefreshStatus::Stopping, None, Vec::new());
            }
            if state.active || state.preparation.is_some() {
                return self.prepare_result(
                    ReferenceRefreshStatus::ReferenceRefreshBusy,
                    None,
                    Vec::new(),
                );
            }
            state.active = true;
        }
        let _active = ActiveApply(self);
        let current = match self.repository.get_state() {
            Ok(state) => state,
            Err(_) => {
                return self.prepare_result(
                    ReferenceRefreshStatus::RepairRequired,
                    None,
                    Vec::new(),
                );
            }
        };
        if current.as_ref().map(|state| state.reference_hash.as_str())
            != request.expected_reference_hash.as_deref()
        {
            return self.prepare_result(ReferenceRefreshStatus::BasisMismatch, None, Vec::new());
        }
        let input_basis = if binding_candidates.is_empty() {
            json!({
                "scope": request.scope,
                "items": request.items,
                "artifacts": request.artifacts,
            })
        } else {
            json!({
                "scope": request.scope,
                "items": request.items,
                "artifacts": request.artifacts,
                "bindingCandidates": binding_candidates,
            })
        };
        let input_hash = match canonical_json_hash(&input_basis) {
            Ok(hash) => hash,
            Err(_) => {
                return self.prepare_result(
                    ReferenceRefreshStatus::InvalidRequest,
                    None,
                    Vec::new(),
                );
            }
        };
        if !request.force
            && !bypass_unchanged
            && current
                .as_ref()
                .is_some_and(|state| state.input_hash == input_hash)
        {
            return self.prepare_result(
                ReferenceRefreshStatus::Unchanged,
                Some(input_hash),
                Vec::new(),
            );
        }
        let source_refs = scoped_source_refs(&request);
        let current_artifacts = match self.repository.list_artifacts(&source_refs) {
            Ok(rows) => rows
                .into_iter()
                .map(|row| ((row.paper_ref.clone(), row.artifact_type.clone()), row))
                .collect::<HashMap<_, _>>(),
            Err(_) => {
                return self.prepare_result(
                    ReferenceRefreshStatus::RepairRequired,
                    None,
                    Vec::new(),
                );
            }
        };
        let descriptors = request
            .artifacts
            .iter()
            .map(|row| {
                (
                    (
                        row.paper_ref.clone(),
                        artifact_type_name(&row.artifact_type).to_owned(),
                    ),
                    row,
                )
            })
            .collect::<HashMap<_, _>>();
        let changed_sources = source_refs
            .iter()
            .filter(|paper_ref| {
                let key = ((*paper_ref).clone(), "references".to_owned());
                let next = descriptors[&key];
                request.force
                    || reproject_sources
                    || current_artifacts.get(&key).is_none_or(|current| {
                        current.status != next.status
                            || current.locator != next.locator
                            || current.payload_hash != next.payload_hash
                            || current.payload_type != next.payload_type
                    })
            })
            .cloned()
            .collect::<Vec<_>>();
        let mut reads = Vec::new();
        for paper_ref in &changed_sources {
            for artifact_type in [
                ReferenceArtifactType::References,
                ReferenceArtifactType::CitationAnalysis,
            ] {
                let key = (
                    paper_ref.clone(),
                    artifact_type_name(&artifact_type).to_owned(),
                );
                let descriptor = descriptors[&key];
                if descriptor.status == "available" {
                    reads.push(ReferenceRefreshRead {
                        paper_ref: paper_ref.clone(),
                        artifact_type,
                        locator: descriptor.locator.clone(),
                        expected_hash: descriptor.payload_hash.clone(),
                    });
                }
            }
        }
        reads.sort_by(|left, right| {
            left.paper_ref.cmp(&right.paper_ref).then_with(|| {
                artifact_type_name(&left.artifact_type)
                    .cmp(artifact_type_name(&right.artifact_type))
            })
        });
        let id = (self.preparation_id)();
        let operation_id = format!("operation:{id}");
        let preparation = Preparation {
            id: id.clone(),
            operation_id: operation_id.clone(),
            input_hash: input_hash.clone(),
            request,
            reads: reads.clone(),
            replace_source_refs: changed_sources,
            binding_candidates,
        };
        if self
            .repository
            .upsert_operation(&running_operation(
                &operation_id,
                "reference_sidecar_refresh",
                &(self.now)(),
            ))
            .is_err()
        {
            return self.prepare_result(ReferenceRefreshStatus::ProjectionFailed, None, Vec::new());
        }
        if let Ok(mut state) = self.state.lock() {
            state.preparation = Some(preparation);
        }
        self.prepare_result(ReferenceRefreshStatus::Prepared, Some(input_hash), reads)
            .with_preparation(id)
    }

    pub fn apply_refresh(
        &self,
        request: ReferenceRefreshApplyRequest,
    ) -> ReferenceRefreshMutationResult {
        self.apply_refresh_with_commit(request, None, None, None)
    }

    pub fn apply_refresh_with_checkpoint(
        &self,
        request: ReferenceRefreshApplyRequest,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> ReferenceRefreshMutationResult {
        self.apply_refresh_with_commit(request, None, None, Some(checkpoint))
    }

    pub fn apply_literature_refresh(
        &self,
        request: ReferenceRefreshApplyRequest,
        metadata: Option<LiteratureMatchingMetadataRecord>,
        receipt: OperationRecord,
    ) -> ReferenceRefreshMutationResult {
        self.apply_refresh_with_commit(request, metadata, Some(receipt), None)
    }

    pub fn apply_literature_refresh_with_checkpoint(
        &self,
        request: ReferenceRefreshApplyRequest,
        metadata: Option<LiteratureMatchingMetadataRecord>,
        receipt: OperationRecord,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> ReferenceRefreshMutationResult {
        self.apply_refresh_with_commit(request, metadata, Some(receipt), Some(checkpoint))
    }

    fn apply_refresh_with_commit(
        &self,
        request: ReferenceRefreshApplyRequest,
        metadata: Option<LiteratureMatchingMetadataRecord>,
        receipt: Option<OperationRecord>,
        checkpoint: Option<&PromotionCheckpoint<'_>>,
    ) -> ReferenceRefreshMutationResult {
        let preparation = {
            let mut state = match self.state.lock() {
                Ok(state) => state,
                Err(_) => {
                    return self.mutation_result(
                        ReferenceRefreshStatus::RepairRequired,
                        Vec::new(),
                        Vec::new(),
                    );
                }
            };
            let Some(preparation) = state.preparation.as_ref() else {
                return self.mutation_result(
                    ReferenceRefreshStatus::PreparationMissing,
                    Vec::new(),
                    Vec::new(),
                );
            };
            if preparation.id != request.preparation_id {
                return self.mutation_result(
                    ReferenceRefreshStatus::PreparationMissing,
                    Vec::new(),
                    Vec::new(),
                );
            }
            let preparation = state.preparation.take().expect("checked preparation");
            state.active = true;
            preparation
        };
        let _active = ActiveApply(self);
        if validate_reference_refresh_apply_request(&request).is_err() {
            self.finish_operation(&preparation.operation_id, "failed", "invalid_request");
            return self.mutation_result(
                ReferenceRefreshStatus::InvalidRequest,
                Vec::new(),
                Vec::new(),
            );
        }
        if !exact_payloads(&preparation.reads, &request.payloads) {
            self.finish_operation(&preparation.operation_id, "failed", "payload_stale");
            return self.mutation_result(
                ReferenceRefreshStatus::PayloadStale,
                Vec::new(),
                Vec::new(),
            );
        }
        let mut projection = match self.project(&preparation, &request.payloads) {
            Ok(projection) => projection,
            Err(_) => {
                self.finish_operation(&preparation.operation_id, "failed", "payload_stale");
                return self.mutation_result(
                    ReferenceRefreshStatus::PayloadStale,
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if receipt.is_some() && !projection.graph_facts_changed {
            projection.replace_reference_source_refs.clear();
            projection.remove_binding_ids.clear();
            projection.raw_references.clear();
            projection.canonicals.clear();
            projection.bindings.clear();
            projection.reviews.clear();
        }
        let affected = preparation.replace_source_refs.clone();
        if checkpoint.is_some_and(|checkpoint| checkpoint().is_err()) {
            self.finish_operation(&preparation.operation_id, "canceled", "promotion_blocked");
            return self.mutation_result(ReferenceRefreshStatus::Stopping, Vec::new(), Vec::new());
        }
        let replaced = if let Some(receipt) = receipt.as_ref() {
            self.repository
                .apply_literature_projection(&projection, metadata.as_ref(), receipt)
        } else {
            self.repository.replace(&projection)
        };
        match replaced {
            Ok(true) => {
                let mut warnings = Vec::new();
                if self
                    .repository
                    .update_operation(
                        &preparation.operation_id,
                        "succeeded",
                        "completed",
                        &[],
                        &(self.now)(),
                    )
                    .is_err()
                {
                    warnings.push("reference_refresh_operation_receipt_failed".into());
                }
                self.mutation_result(ReferenceRefreshStatus::Promoted, warnings, affected)
            }
            Ok(false) => {
                self.finish_operation(&preparation.operation_id, "failed", "basis_mismatch");
                self.mutation_result(
                    ReferenceRefreshStatus::BasisMismatch,
                    Vec::new(),
                    Vec::new(),
                )
            }
            Err(_) => {
                self.finish_operation(&preparation.operation_id, "failed", "projection_failed");
                self.mutation_result(
                    ReferenceRefreshStatus::ProjectionFailed,
                    Vec::new(),
                    Vec::new(),
                )
            }
        }
    }

    pub fn discard_preparation(&self, preparation_id: &str) -> ReferenceRefreshMutationResult {
        let discarded = self.state.lock().ok().and_then(|mut state| {
            state
                .preparation
                .as_ref()
                .filter(|preparation| preparation.id == preparation_id)?;
            state.preparation.take()
        });
        if let Some(preparation) = discarded {
            self.finish_operation(&preparation.operation_id, "canceled", "discarded");
            self.mutation_result(ReferenceRefreshStatus::Discarded, Vec::new(), Vec::new())
        } else {
            self.mutation_result(
                ReferenceRefreshStatus::PreparationMissing,
                Vec::new(),
                Vec::new(),
            )
        }
    }

    pub fn read_sources(
        &self,
        cursor: usize,
        limit: usize,
    ) -> Result<(Vec<ReferenceSourceRecord>, Option<usize>), String> {
        page(self.repository.list_sources()?, cursor, limit)
    }

    pub fn read_references(
        &self,
        cursor: usize,
        limit: usize,
    ) -> Result<(Vec<RawReferenceRecord>, Option<usize>), String> {
        page(self.repository.list_raw_references()?, cursor, limit)
    }

    pub fn stop_admission(&self) {
        if let Ok(mut state) = self.state.lock() {
            state.accepting = false;
            if let Some(preparation) = state.preparation.take() {
                self.finish_operation(&preparation.operation_id, "canceled", "stopping");
            }
        }
    }

    pub fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.stop_admission();
        let state = self
            .state
            .lock()
            .map_err(|_| "reference_refresh_unavailable".to_owned())?;
        let (state, wait) = self
            .drained
            .wait_timeout_while(state, timeout, |state| state.active)
            .map_err(|_| "reference_refresh_unavailable".to_owned())?;
        if wait.timed_out() && state.active {
            Err("reference_refresh_drain_timeout".into())
        } else {
            Ok(())
        }
    }

    fn project(
        &self,
        preparation: &Preparation,
        payloads: &[ReferenceRefreshPayload],
    ) -> Result<ReferenceProjectionReplacement, String> {
        let now = (self.now)();
        let payload_by_locator = payloads
            .iter()
            .map(|payload| (payload.locator.as_str(), payload))
            .collect::<HashMap<_, _>>();
        let sources = preparation
            .request
            .items
            .iter()
            .map(|item| ReferenceSourceRecord {
                paper_ref: item.paper_ref.clone(),
                library_id: item.library_id,
                item_key: item.item_key.clone(),
                title: item.title.clone(),
                year: item.year.clone(),
                metadata_hash: canonical_json_hash(&json!({
                    "title": item.title,
                    "year": item.year,
                    "date": item.metadata.get("date").cloned().unwrap_or(Value::String(String::new())),
                    "creators": item.metadata.get("creators").cloned().unwrap_or(Value::Array(Vec::new())),
                    "tags": item.metadata.get("tags").cloned().unwrap_or(Value::Array(Vec::new())),
                    "collections": item.metadata.get("collections").cloned().unwrap_or(Value::Array(Vec::new())),
                    "doi": item.metadata.get("doi").cloned().unwrap_or(Value::String(String::new())),
                    "arxiv": item.metadata.get("arxiv").cloned().unwrap_or(Value::String(String::new())),
                    "isbn": item.metadata.get("isbn").cloned().unwrap_or(Value::String(String::new())),
                    "url": item.metadata.get("url").cloned().unwrap_or(Value::String(String::new())),
                    "citekey": item.metadata.get("citekey").cloned().unwrap_or(Value::String(String::new())),
                }))
                .unwrap_or_default(),
                summary_json: synthesis_protocol::canonical_json(item)
                    .unwrap_or_else(|_| "{}".into()),
                updated_at: now.clone(),
            })
            .collect::<Vec<_>>();
        let artifacts = preparation
            .request
            .artifacts
            .iter()
            .map(|descriptor| ReferenceArtifactRecord {
                paper_ref: descriptor.paper_ref.clone(),
                artifact_type: artifact_type_name(&descriptor.artifact_type).into(),
                payload_type: descriptor.payload_type.clone(),
                status: descriptor.status.clone(),
                locator: descriptor.locator.clone(),
                payload_hash: descriptor.payload_hash.clone(),
                diagnostics_json: serde_json::to_string(&descriptor.diagnostics)
                    .unwrap_or_else(|_| "[]".into()),
                updated_at: now.clone(),
            })
            .collect::<Vec<_>>();
        let current_sources = self.repository.list_sources()?;
        let current_artifacts = self.repository.list_artifacts(
            &current_sources
                .iter()
                .map(|row| row.paper_ref.clone())
                .collect::<Vec<_>>(),
        )?;
        let current_raws = self.repository.list_raw_references()?;
        let current_bindings = self.repository.list_bindings()?;
        let protected_canonicals = current_bindings
            .iter()
            .filter(|binding| binding.reviewer != "reference-refresh-application")
            .map(|binding| binding.canonical_reference_id.clone())
            .collect::<HashSet<_>>();
        let mut raw_references = Vec::new();
        let mut canonicals = Vec::new();
        let mut bindings = Vec::new();
        let mut reviews = Vec::new();
        for read in preparation
            .reads
            .iter()
            .filter(|read| read.artifact_type == ReferenceArtifactType::References)
        {
            let payload = payload_by_locator[read.locator.as_str()];
            let references = payload
                .content
                .get("references")
                .and_then(Value::as_array)
                .ok_or_else(|| "payload_stale".to_owned())?;
            for (index, reference) in references.iter().enumerate() {
                let title = reference
                    .get("title")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .trim()
                    .to_owned();
                let normalized_title = normalize_title(&title);
                let year = reference
                    .get("year")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_owned();
                let authors = reference
                    .get("authors")
                    .cloned()
                    .unwrap_or_else(|| Value::Array(Vec::new()));
                let authors_json = serde_json::to_string(&authors).unwrap_or_else(|_| "[]".into());
                let citekey = reference
                    .get("citekey")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_lowercase();
                let metadata_hash = canonical_json_hash(&json!({
                    "citekey": citekey,
                    "normalized_title": normalized_title,
                    "year": year,
                    "authors": authors,
                }))
                .map_err(|_| "payload_stale")?;
                let canonical_id = format!("cref:{}", &metadata_hash[7..31]);
                let raw_reference = reference
                    .get("raw")
                    .or_else(|| reference.get("raw_reference"))
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .trim()
                    .to_owned();
                let raw_hash = if raw_reference.is_empty() {
                    canonical_json_hash(&json!({
                        "title": title,
                        "normalizedTitle": normalized_title,
                        "year": year,
                        "authors": authors,
                        "citekey": citekey,
                    }))
                    .map_err(|_| "payload_stale")?
                } else {
                    use sha2::{Digest, Sha256};
                    format!("sha256:{:x}", Sha256::digest(raw_reference.as_bytes()))
                };
                let raw_id = format!(
                    "rawref:{}",
                    &canonical_json_hash(&json!({
                        "source":read.paper_ref,
                        "artifact": read.expected_hash,
                        "index":index,
                        "rawHash":raw_hash
                    }))
                    .map_err(|_| "payload_stale")?[7..31]
                );
                if let Some(previous) = current_raws.iter().find(|row| {
                    row.source_ref == read.paper_ref && row.reference_index == index as i64
                }) && previous.canonical_reference_id != canonical_id
                    && protected_canonicals.contains(&previous.canonical_reference_id)
                {
                    reviews.push(ReferenceRevisionReviewRecord {
                        review_id: format!(
                            "revision:{}",
                            &canonical_json_hash(&json!({
                                "sourceRef": read.paper_ref,
                                "referenceIndex": index,
                                "previousCanonicalReferenceId":
                                    previous.canonical_reference_id,
                                "nextCanonicalReferenceId": canonical_id,
                            }))
                            .map_err(|_| "projection_failed")?[7..31]
                        ),
                        source_ref: read.paper_ref.clone(),
                        canonical_reference_id: previous.canonical_reference_id.clone(),
                        status: "open".into(),
                        reason: "protected_canonical_changed".into(),
                        payload_json: serde_json::to_string(reference)
                            .unwrap_or_else(|_| "{}".into()),
                        created_at: now.clone(),
                        updated_at: now.clone(),
                    });
                }
                canonicals.push(CanonicalReferenceRecord {
                    canonical_reference_id: canonical_id.clone(),
                    title: title.clone(),
                    normalized_title: normalized_title.clone(),
                    year: year.clone(),
                    authors_json: authors_json.clone(),
                    identifiers_json: serde_json::to_string(&json!({
                        "citekey": citekey
                    }))
                    .unwrap_or_else(|_| "{}".into()),
                    metadata_hash,
                    status: "active".into(),
                    created_at: now.clone(),
                    updated_at: now.clone(),
                });
                raw_references.push(RawReferenceRecord {
                    raw_reference_id: raw_id,
                    source_ref: read.paper_ref.clone(),
                    references_artifact_hash: read.expected_hash.clone(),
                    reference_index: index as i64,
                    raw_hash,
                    parsed_title: title,
                    normalized_title: canonicals
                        .last()
                        .map(|row| row.normalized_title.clone())
                        .unwrap_or_default(),
                    year: canonicals
                        .last()
                        .map(|row| row.year.clone())
                        .unwrap_or_default(),
                    authors_json: canonicals
                        .last()
                        .map(|row| row.authors_json.clone())
                        .unwrap_or_else(|| "[]".into()),
                    raw_reference,
                    canonical_reference_id: canonical_id.clone(),
                    status: "active".into(),
                    roles_json: roles_for_reference(
                        &preparation.reads,
                        &payload_by_locator,
                        &read.paper_ref,
                        index,
                    ),
                    diagnostics_json: "[]".into(),
                    created_at: now.clone(),
                    updated_at: now.clone(),
                });
                let candidates = if preparation.binding_candidates.is_empty() {
                    &preparation.request.items
                } else {
                    &preparation.binding_candidates
                };
                let matched =
                    match_reference_candidate(candidates, &citekey, &normalized_title, &year);
                if let Some(item) = matched {
                    let binding_hash = canonical_json_hash(&json!({
                        "canonicalReferenceId": canonical_id,
                        "libraryId": item.library_id,
                        "itemKey": item.item_key,
                    }))
                    .map_err(|_| "projection_failed")?;
                    let basis_hash = canonical_json_hash(&json!({
                        "kind": if !citekey.is_empty() {
                            "citekey"
                        } else {
                            "title_year"
                        },
                        "citekey": citekey,
                        "title": normalized_title,
                        "year": canonicals.last().map(|row| row.year.as_str()).unwrap_or(""),
                        "item": item.paper_ref,
                    }))
                    .map_err(|_| "projection_failed")?;
                    bindings.push(ReferenceBindingFactRecord {
                        binding_id: format!("binding:{}", &binding_hash[7..31]),
                        canonical_reference_id: canonical_id,
                        library_id: item.library_id,
                        item_key: item.item_key.clone(),
                        status: "accepted".into(),
                        confidence: "deterministic".into(),
                        reviewer: "reference-refresh-application".into(),
                        basis_hash,
                        diagnostics_json: "[]".into(),
                        created_at: now.clone(),
                        updated_at: now.clone(),
                    });
                }
            }
        }
        let replacement_sources = preparation
            .replace_source_refs
            .iter()
            .collect::<HashSet<_>>();
        let mut projected_facts = current_raws
            .iter()
            .filter(|row| !replacement_sources.contains(&row.source_ref))
            .map(|row| {
                (
                    row.source_ref.clone(),
                    row.raw_reference_id.clone(),
                    row.canonical_reference_id.clone(),
                    row.roles_json.clone(),
                )
            })
            .collect::<Vec<_>>();
        projected_facts.extend(raw_references.iter().map(|row| {
            (
                row.source_ref.clone(),
                row.raw_reference_id.clone(),
                row.canonical_reference_id.clone(),
                row.roles_json.clone(),
            )
        }));
        projected_facts.sort();
        let mut previous_facts = current_raws
            .iter()
            .map(|row| {
                (
                    row.source_ref.clone(),
                    row.raw_reference_id.clone(),
                    row.canonical_reference_id.clone(),
                    row.roles_json.clone(),
                )
            })
            .collect::<Vec<_>>();
        previous_facts.sort();
        let source_scope = scoped_source_refs(&preparation.request)
            .into_iter()
            .collect::<HashSet<_>>();
        let mut final_sources = current_sources
            .into_iter()
            .filter(|row| {
                !matches!(preparation.request.scope, ReferenceRefreshScope::Full)
                    || source_scope.contains(&row.paper_ref)
            })
            .map(|row| (row.paper_ref.clone(), row))
            .collect::<BTreeMap<_, _>>();
        for row in &sources {
            final_sources.insert(row.paper_ref.clone(), row.clone());
        }
        let mut final_artifacts = current_artifacts
            .into_iter()
            .filter(|row| {
                (!matches!(preparation.request.scope, ReferenceRefreshScope::Full)
                    || source_scope.contains(&row.paper_ref))
                    && !source_scope.contains(&row.paper_ref)
            })
            .map(|row| ((row.paper_ref.clone(), row.artifact_type.clone()), row))
            .collect::<BTreeMap<_, _>>();
        for row in &artifacts {
            final_artifacts.insert(
                (row.paper_ref.clone(), row.artifact_type.clone()),
                row.clone(),
            );
        }
        let mut final_raws = current_raws
            .iter()
            .filter(|row| {
                !replacement_sources.contains(&row.source_ref)
                    && (!matches!(preparation.request.scope, ReferenceRefreshScope::Full)
                        || source_scope.contains(&row.source_ref))
            })
            .cloned()
            .collect::<Vec<_>>();
        final_raws.extend(raw_references.iter().cloned());
        let retained_canonical_ids = current_raws
            .iter()
            .filter(|row| !replacement_sources.contains(&row.source_ref))
            .map(|row| row.canonical_reference_id.as_str())
            .collect::<HashSet<_>>();
        let replaced_canonical_ids = current_raws
            .iter()
            .filter(|row| replacement_sources.contains(&row.source_ref))
            .map(|row| row.canonical_reference_id.as_str())
            .collect::<HashSet<_>>();
        let remove_binding_ids = current_bindings
            .iter()
            .filter(|binding| {
                binding.reviewer == "reference-refresh-application"
                    && replaced_canonical_ids.contains(binding.canonical_reference_id.as_str())
                    && !retained_canonical_ids.contains(binding.canonical_reference_id.as_str())
            })
            .map(|binding| binding.binding_id.clone())
            .collect::<Vec<_>>();
        let mut final_bindings = current_bindings
            .iter()
            .filter(|row| !remove_binding_ids.contains(&row.binding_id))
            .cloned()
            .map(|row| (row.binding_id.clone(), row))
            .collect::<BTreeMap<_, _>>();
        for row in &bindings {
            final_bindings.insert(row.binding_id.clone(), row.clone());
        }
        let projected_binding_facts = final_bindings
            .values()
            .map(|row| {
                (
                    row.binding_id.clone(),
                    row.canonical_reference_id.clone(),
                    row.library_id,
                    row.item_key.clone(),
                    row.status.clone(),
                )
            })
            .collect::<Vec<_>>();
        let previous_binding_facts = current_bindings
            .iter()
            .map(|row| {
                (
                    row.binding_id.clone(),
                    row.canonical_reference_id.clone(),
                    row.library_id,
                    row.item_key.clone(),
                    row.status.clone(),
                )
            })
            .collect::<Vec<_>>();
        final_raws.sort_by(|left, right| left.raw_reference_id.cmp(&right.raw_reference_id));
        let reference_hash = canonical_json_hash(&json!({
            "sources": final_sources.values().map(|row| {
                json!([row.paper_ref, row.metadata_hash])
            }).collect::<Vec<_>>(),
            "artifacts": final_artifacts.values().map(|row| {
                json!([
                    row.paper_ref,
                    row.artifact_type,
                    row.status,
                    row.payload_hash,
                    row.locator,
                ])
            }).collect::<Vec<_>>(),
            "references": final_raws.iter().map(|row| {
                    json!([
                        row.raw_reference_id,
                        row.source_ref,
                        row.raw_hash,
                        row.canonical_reference_id,
                        row.roles_json,
                    ])
                }).collect::<Vec<_>>(),
            "bindings": final_bindings.values().map(|row| {
                json!([
                    row.binding_id,
                    row.canonical_reference_id,
                    row.library_id,
                    row.item_key,
                    row.status,
                ])
            }).collect::<Vec<_>>(),
        }))
        .map_err(|_| "projection_failed")?;
        Ok(ReferenceProjectionReplacement {
            expected_reference_hash: preparation.request.expected_reference_hash.clone(),
            reference_hash,
            input_hash: preparation.input_hash.clone(),
            scope: match preparation.request.scope {
                ReferenceRefreshScope::Full => ReferenceProjectionScope::Full,
                ReferenceRefreshScope::Sources { .. } => ReferenceProjectionScope::Sources,
            },
            source_refs: scoped_source_refs(&preparation.request),
            replace_reference_source_refs: preparation.replace_source_refs.clone(),
            remove_binding_ids,
            sources,
            artifacts,
            raw_references,
            canonicals,
            bindings,
            reviews,
            graph_facts_changed: previous_facts != projected_facts
                || previous_binding_facts != projected_binding_facts,
            now,
        })
    }

    fn prepare_result(
        &self,
        status: ReferenceRefreshStatus,
        input_hash: Option<String>,
        reads: Vec<ReferenceRefreshRead>,
    ) -> ReferenceRefreshPrepareResult {
        ReferenceRefreshPrepareResult {
            status,
            reference_hash: self
                .repository
                .get_state()
                .ok()
                .flatten()
                .map(|state| state.reference_hash),
            input_hash,
            preparation_id: None,
            reads,
            warnings: Vec::new(),
        }
    }

    fn mutation_result(
        &self,
        status: ReferenceRefreshStatus,
        warnings: Vec<String>,
        affected_source_refs: Vec<String>,
    ) -> ReferenceRefreshMutationResult {
        let state = self.repository.get_state().ok().flatten();
        ReferenceRefreshMutationResult {
            status,
            reference_hash: state.as_ref().map(|state| state.reference_hash.clone()),
            input_hash: state.map(|state| state.input_hash),
            warnings,
            affected_source_refs,
        }
    }

    fn finish_operation(&self, operation_id: &str, status: &str, phase: &str) {
        let _ = self
            .repository
            .update_operation(operation_id, status, phase, &[], &(self.now)());
    }
}

trait WithPreparation {
    fn with_preparation(self, id: String) -> Self;
}

impl WithPreparation for ReferenceRefreshPrepareResult {
    fn with_preparation(mut self, id: String) -> Self {
        self.preparation_id = Some(id);
        self
    }
}

fn validate_prepare(request: &ReferenceRefreshPrepareRequest) -> Result<(), String> {
    let bytes = serde_json::to_vec(request).map_err(|_| "invalid_request")?;
    if bytes.len() > MAX_PREPARATION_BYTES
        || count_nodes(&serde_json::to_value(request).map_err(|_| "invalid_request")?)
            > MAX_PREPARATION_JSON_NODES
    {
        return Err("invalid_request".into());
    }
    let source_refs = scoped_source_refs(request);
    if matches!(
        &request.scope,
        ReferenceRefreshScope::Sources { source_refs }
            if source_refs.is_empty() || source_refs.len() > MAX_SOURCES
    ) || source_refs.iter().collect::<HashSet<_>>().len() != source_refs.len()
        || request.items.len() != source_refs.len()
        || request
            .items
            .iter()
            .map(|item| &item.paper_ref)
            .collect::<HashSet<_>>()
            .len()
            != request.items.len()
    {
        return Err("invalid_request".into());
    }
    let descriptor_keys = request
        .artifacts
        .iter()
        .map(|row| {
            (
                row.paper_ref.as_str(),
                artifact_type_name(&row.artifact_type),
            )
        })
        .collect::<HashSet<_>>();
    let source_ref_set = source_refs
        .iter()
        .map(String::as_str)
        .collect::<HashSet<_>>();
    let item_ref_set = request
        .items
        .iter()
        .map(|item| item.paper_ref.as_str())
        .collect::<HashSet<_>>();
    if descriptor_keys.len() != request.artifacts.len()
        || request.artifacts.len() != source_refs.len() * 3
        || item_ref_set != source_ref_set
        || request.artifacts.iter().any(|row| {
            !source_ref_set.contains(row.paper_ref.as_str())
                || row.payload_type.is_empty()
                || row.locator.is_empty()
                || row.payload_hash.is_empty()
                || !matches!(row.status.as_str(), "available" | "missing" | "failed")
        })
        || source_refs.iter().any(|source| {
            [
                ReferenceArtifactType::Digest,
                ReferenceArtifactType::References,
                ReferenceArtifactType::CitationAnalysis,
            ]
            .iter()
            .any(|kind| !descriptor_keys.contains(&(source.as_str(), artifact_type_name(kind))))
        })
    {
        return Err("invalid_request".into());
    }
    Ok(())
}

pub fn validate_reference_refresh_apply_request(
    request: &ReferenceRefreshApplyRequest,
) -> Result<(), &'static str> {
    let capacity = measure_reference_refresh_apply_request(request)?;
    if capacity.bytes > REFERENCE_REFRESH_MATERIALIZED_MAX_BYTES
        || capacity.json_nodes > REFERENCE_REFRESH_MATERIALIZED_MAX_JSON_NODES
    {
        return Err("reference_refresh_payload_too_large");
    }
    Ok(())
}

pub fn measure_reference_refresh_apply_request(
    request: &ReferenceRefreshApplyRequest,
) -> Result<ReferenceRefreshApplyCapacity, &'static str> {
    let bytes = serde_json::to_vec(request).map_err(|_| "reference_refresh_payload_invalid")?;
    let value = serde_json::to_value(request).map_err(|_| "reference_refresh_payload_invalid")?;
    Ok(ReferenceRefreshApplyCapacity {
        bytes: bytes.len(),
        json_nodes: count_nodes(&value),
    })
}

fn scoped_source_refs(request: &ReferenceRefreshPrepareRequest) -> Vec<String> {
    match &request.scope {
        ReferenceRefreshScope::Full => request
            .items
            .iter()
            .map(|item| item.paper_ref.clone())
            .collect(),
        ReferenceRefreshScope::Sources { source_refs } => source_refs.clone(),
    }
}

fn artifact_type_name(value: &ReferenceArtifactType) -> &'static str {
    match value {
        ReferenceArtifactType::Digest => "digest",
        ReferenceArtifactType::References => "references",
        ReferenceArtifactType::CitationAnalysis => "citation_analysis",
    }
}

fn exact_payloads(reads: &[ReferenceRefreshRead], payloads: &[ReferenceRefreshPayload]) -> bool {
    if reads.len() != payloads.len() {
        return false;
    }
    let expected = reads
        .iter()
        .map(|read| (read.locator.as_str(), read.expected_hash.as_str()))
        .collect::<BTreeSet<_>>();
    let actual = payloads
        .iter()
        .filter(|payload| {
            payload.status == "available"
                && payload.payload_hash == payload.expected_hash
                && payload.content.is_object()
        })
        .map(|payload| (payload.locator.as_str(), payload.expected_hash.as_str()))
        .collect::<BTreeSet<_>>();
    expected == actual && actual.len() == payloads.len()
}

fn inspect_state(state: Option<ReferenceApplicationStateRecord>) -> ReferenceRefreshInspectResult {
    ReferenceRefreshInspectResult {
        reference_hash: state.as_ref().map(|state| state.reference_hash.clone()),
        input_hash: state.as_ref().map(|state| state.input_hash.clone()),
        source_count: state.as_ref().map_or(0, |state| state.source_count),
        reference_count: state.as_ref().map_or(0, |state| state.reference_count),
        canonical_count: state.as_ref().map_or(0, |state| state.canonical_count),
        binding_count: state.as_ref().map_or(0, |state| state.binding_count),
        reference_ready: state.as_ref().is_some_and(|state| state.reference_ready),
        graph_ready: state.as_ref().is_some_and(|state| state.graph_ready),
        related_items_ready: state
            .as_ref()
            .is_some_and(|state| state.related_items_ready),
    }
}

fn page<T>(rows: Vec<T>, cursor: usize, limit: usize) -> Result<(Vec<T>, Option<usize>), String> {
    if limit == 0 || limit > 100 || cursor > rows.len() {
        return Err("invalid_request".into());
    }
    let page = rows
        .into_iter()
        .skip(cursor)
        .take(limit + 1)
        .collect::<Vec<_>>();
    let has_more = page.len() > limit;
    let records = page.into_iter().take(limit).collect::<Vec<_>>();
    let next = has_more.then_some(cursor + records.len());
    Ok((records, next))
}

fn normalize_title(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn match_reference_candidate<'a>(
    candidates: &'a [ReferenceRefreshItem],
    citekey: &str,
    normalized_title: &str,
    year: &str,
) -> Option<&'a ReferenceRefreshItem> {
    if !citekey.is_empty()
        && let Some(candidate) = candidates.iter().find(|item| {
            item.metadata
                .get("citekey")
                .and_then(Value::as_str)
                .is_some_and(|value| value.to_lowercase() == citekey)
        })
    {
        return Some(candidate);
    }
    if normalized_title.is_empty() || year.is_empty() {
        return None;
    }
    let mut matches = candidates
        .iter()
        .filter(|item| normalize_title(&item.title) == normalized_title && item.year == year);
    let candidate = matches.next()?;
    matches.next().is_none().then_some(candidate)
}

fn roles_for_reference(
    reads: &[ReferenceRefreshRead],
    payload_by_locator: &HashMap<&str, &ReferenceRefreshPayload>,
    paper_ref: &str,
    reference_index: usize,
) -> String {
    #[derive(Serialize)]
    struct RoleCount {
        role: String,
        count: usize,
    }
    let roles = reads
        .iter()
        .find(|read| {
            read.paper_ref == paper_ref
                && read.artifact_type == ReferenceArtifactType::CitationAnalysis
        })
        .and_then(|read| payload_by_locator.get(read.locator.as_str()))
        .and_then(|payload| payload.content.get("citations"))
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter(|entry| {
            entry
                .get("reference_index")
                .or_else(|| entry.get("ref_index"))
                .and_then(Value::as_u64)
                == Some(reference_index as u64)
        })
        .filter_map(|entry| entry.get("role").and_then(Value::as_str))
        .fold(BTreeMap::<String, usize>::new(), |mut roles, role| {
            *roles.entry(role.to_lowercase()).or_default() += 1;
            roles
        })
        .into_iter()
        .map(|(role, count)| RoleCount { role, count })
        .collect::<Vec<_>>();
    serde_json::to_string(&roles).unwrap_or_else(|_| "[]".into())
}

fn count_nodes(value: &Value) -> usize {
    match value {
        Value::Array(values) => 1 + values.iter().map(count_nodes).sum::<usize>(),
        Value::Object(values) => 1 + values.values().map(count_nodes).sum::<usize>(),
        _ => 1,
    }
}

fn running_operation(operation_id: &str, operation_type: &str, now: &str) -> OperationRecord {
    OperationRecord {
        operation_id: operation_id.into(),
        operation_type: operation_type.into(),
        status: "running".into(),
        phase: "prepared".into(),
        progress_mode: "indeterminate".into(),
        diagnostics_json: "[]".into(),
        created_at: now.into(),
        started_at: now.into(),
        updated_at: now.into(),
        ..OperationRecord::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::RepositoryPort;
    use std::path::PathBuf;
    use synthesis_repository::{Repository, RepositoryIdentity};

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-reference-refresh-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
    }

    fn application() -> (ReferenceRefreshApplication, PathBuf) {
        let root = root();
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("open repository");
        let port = Arc::new(RepositoryPort::new(Arc::new(Mutex::new(repository))));
        (
            ReferenceRefreshApplication::with_factories(
                port,
                Arc::new(|| "2026-07-26T00:00:00.000Z".into()),
                Arc::new(|| "refresh:1".into()),
            ),
            root,
        )
    }

    fn request(expected_reference_hash: Option<String>) -> ReferenceRefreshPrepareRequest {
        let paper_ref = "1:A".to_owned();
        let artifacts = [
            (ReferenceArtifactType::Digest, "text/markdown", "a"),
            (ReferenceArtifactType::References, "references-json", "b"),
            (
                ReferenceArtifactType::CitationAnalysis,
                "citation-analysis-json",
                "c",
            ),
        ]
        .into_iter()
        .map(
            |(artifact_type, payload_type, hash)| ReferenceArtifactDescriptor {
                paper_ref: paper_ref.clone(),
                locator: format!("1:A/{payload_type}"),
                payload_hash: format!("sha256:{hash}"),
                artifact_type,
                payload_type: payload_type.into(),
                status: "available".into(),
                estimated_size: None,
                diagnostics: Vec::new(),
            },
        )
        .collect();
        ReferenceRefreshPrepareRequest {
            expected_reference_hash,
            force: false,
            scope: ReferenceRefreshScope::Full,
            items: vec![ReferenceRefreshItem {
                paper_ref,
                library_id: 1,
                item_key: "A".into(),
                title: "Alpha".into(),
                year: "2024".into(),
                metadata: BTreeMap::new(),
            }],
            artifacts,
        }
    }

    fn payloads(prepared: &ReferenceRefreshPrepareResult) -> Vec<ReferenceRefreshPayload> {
        prepared
            .reads
            .iter()
            .map(|read| ReferenceRefreshPayload {
                locator: read.locator.clone(),
                expected_hash: read.expected_hash.clone(),
                status: "available".into(),
                payload_hash: read.expected_hash.clone(),
                content: match read.artifact_type {
                    ReferenceArtifactType::References => {
                        json!({"references":[{"title":"Target","year":"2020","authors":["A"]}]})
                    }
                    ReferenceArtifactType::CitationAnalysis => {
                        json!({"citations":[{"reference_index":0,"role":"background"}]})
                    }
                    ReferenceArtifactType::Digest => json!({}),
                },
                diagnostics: Vec::new(),
            })
            .collect()
    }

    #[test]
    fn plans_exact_reads_promotes_once_and_drains() {
        let (application, root) = application();
        let prepared = application.prepare_refresh(request(None));
        assert_eq!(prepared.status, ReferenceRefreshStatus::Prepared);
        assert_eq!(prepared.reads.len(), 2);
        assert_eq!(
            application
                .apply_refresh(ReferenceRefreshApplyRequest {
                    preparation_id: "wrong".into(),
                    payloads: Vec::new(),
                })
                .status,
            ReferenceRefreshStatus::PreparationMissing
        );
        assert_eq!(
            application
                .apply_refresh_with_checkpoint(
                    ReferenceRefreshApplyRequest {
                        preparation_id: prepared.preparation_id.clone().expect("preparation id"),
                        payloads: payloads(&prepared),
                    },
                    &|| Err("operation_timeout".into()),
                )
                .status,
            ReferenceRefreshStatus::Stopping
        );
        assert!(
            application
                .read_references(0, 100)
                .expect("reference page")
                .0
                .is_empty()
        );
        let prepared = application.prepare_refresh(request(None));
        assert_eq!(prepared.status, ReferenceRefreshStatus::Prepared);
        let promoted = application.apply_refresh(ReferenceRefreshApplyRequest {
            preparation_id: prepared.preparation_id.clone().expect("preparation id"),
            payloads: payloads(&prepared),
        });
        assert_eq!(promoted.status, ReferenceRefreshStatus::Promoted);
        assert_eq!(
            application
                .read_references(0, 100)
                .expect("reference page")
                .0
                .len(),
            1
        );
        assert_eq!(
            application
                .apply_refresh(ReferenceRefreshApplyRequest {
                    preparation_id: "refresh:1".into(),
                    payloads: Vec::new(),
                })
                .status,
            ReferenceRefreshStatus::PreparationMissing
        );
        assert!(application.shutdown(Duration::from_secs(1)).is_ok());
        assert_eq!(
            application
                .prepare_refresh(request(promoted.reference_hash))
                .status,
            ReferenceRefreshStatus::Stopping
        );
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_oversized_apply_payload_and_consumes_the_preparation() {
        let (application, root) = application();
        let prepared = application.prepare_refresh(request(None));
        let preparation_id = prepared
            .preparation_id
            .clone()
            .expect("prepared reference refresh");
        let mut oversized_payloads = payloads(&prepared);
        oversized_payloads[0].content =
            json!({ "blob": "x".repeat(REFERENCE_REFRESH_MATERIALIZED_MAX_BYTES) });

        assert_eq!(
            application
                .apply_refresh(ReferenceRefreshApplyRequest {
                    preparation_id: preparation_id.clone(),
                    payloads: oversized_payloads,
                })
                .status,
            ReferenceRefreshStatus::InvalidRequest
        );
        assert_eq!(
            application
                .apply_refresh(ReferenceRefreshApplyRequest {
                    preparation_id,
                    payloads: Vec::new(),
                })
                .status,
            ReferenceRefreshStatus::PreparationMissing
        );

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn materialized_batch_accepts_more_than_the_preparation_limit() {
        let request = ReferenceRefreshApplyRequest {
            preparation_id: "refresh:capacity".into(),
            payloads: vec![ReferenceRefreshPayload {
                locator: "reference:a".into(),
                expected_hash: "sha256:a".into(),
                status: "available".into(),
                payload_hash: "sha256:a".into(),
                content: json!({
                    "references":[{
                        "title":"x".repeat(MAX_PREPARATION_BYTES + 1),
                    }],
                }),
                diagnostics: Vec::new(),
            }],
        };
        let capacity =
            measure_reference_refresh_apply_request(&request).expect("measured apply request");
        assert!(capacity.bytes > MAX_PREPARATION_BYTES);
        assert!(capacity.bytes < REFERENCE_REFRESH_MATERIALIZED_MAX_BYTES);
        assert_eq!(validate_reference_refresh_apply_request(&request), Ok(()));
    }
}
