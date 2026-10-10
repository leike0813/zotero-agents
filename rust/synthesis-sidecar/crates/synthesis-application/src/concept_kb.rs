use crate::PromotionCheckpoint;
use crate::admission::{AdmissionError, SingleFlightAdmission};
use crate::ports::ConceptKbRepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{BTreeMap, HashSet};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    ConceptAliasRecord, ConceptKbReplacement, ConceptRecord, ConceptRelationRecord,
    ConceptReviewItemRecord, ConceptSenseRecord, ReviewPageQuery, TopicConceptLinkRecord,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConceptMutationStatus {
    Committed,
    Unchanged,
    NotFound,
    ReviewItemClosed,
    ReviewTargetMissing,
    BasisMismatch,
    ConceptKbBusy,
    InvalidRequest,
    WorkerFailed,
    Stopping,
    RepairRequired,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptDiagnostic {
    pub code: String,
    pub message: String,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub details: BTreeMap<String, String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptMutationResult {
    pub status: ConceptMutationStatus,
    pub manifest_hash: Option<String>,
    pub revision: i64,
    pub changed_concept_ids: Vec<String>,
    pub review_ids: Vec<String>,
    pub warnings: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub diagnostic: Option<ConceptDiagnostic>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptInspectResult {
    pub manifest_hash: Option<String>,
    pub revision: i64,
    pub index_hash: Option<String>,
    pub index_basis_hash: Option<String>,
    pub index_stale: bool,
    pub concept_count: usize,
    pub review_count: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ConceptIndexOutput {
    pub index_hash: String,
    pub index_json: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptProposalRelation {
    pub target_concept_id: String,
    pub relation: String,
    pub confidence: ConceptConfidence,
    #[serde(default)]
    pub provenance: Vec<Value>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConceptConfidence {
    High,
    Medium,
    Low,
}

impl ConceptConfidence {
    fn as_str(self) -> &'static str {
        match self {
            Self::High => "high",
            Self::Medium => "medium",
            Self::Low => "low",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptProposal {
    #[serde(default)]
    pub local_id: Option<String>,
    pub label: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    pub concept_type: String,
    pub domain: String,
    #[serde(default)]
    pub short_definition: String,
    #[serde(default)]
    pub definition: String,
    #[serde(default)]
    pub disambiguation: String,
    #[serde(default)]
    pub topic_relevance: String,
    pub confidence: ConceptConfidence,
    #[serde(default)]
    pub evidence: Vec<Value>,
    #[serde(default)]
    pub relations: Vec<ConceptProposalRelation>,
}

pub fn decode_stored_concept_proposal(text: &str) -> Result<ConceptProposal, String> {
    let mut value = serde_json::from_str::<Value>(text)
        .map_err(|_| "concept_review_payload_invalid".to_owned())?;
    let proposal = value
        .as_object_mut()
        .ok_or_else(|| "concept_review_payload_invalid".to_owned())?;

    proposal.remove("merge_hints");
    proposal.remove("mergeHints");
    proposal.remove("audit_alias");
    for (stored, canonical) in [
        ("local_id", "localId"),
        ("concept_type", "conceptType"),
        ("short_definition", "shortDefinition"),
        ("topic_relevance", "topicRelevance"),
    ] {
        if !proposal.contains_key(canonical)
            && let Some(value) = proposal.remove(stored)
        {
            proposal.insert(canonical.to_owned(), value);
        }
    }
    if let Some(relations) = proposal.get_mut("relations").and_then(Value::as_array_mut) {
        for relation in relations {
            let Some(relation) = relation.as_object_mut() else {
                continue;
            };
            if !relation.contains_key("targetConceptId")
                && let Some(value) = relation.remove("target_concept_id")
            {
                relation.insert("targetConceptId".into(), value);
            }
        }
    }

    serde_json::from_value(value).map_err(|_| "concept_review_payload_invalid".to_owned())
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptIngestRequest {
    pub expected_manifest_hash: Option<String>,
    pub topic_id: String,
    pub topic_path_id: String,
    pub proposals: Vec<ConceptProposal>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConceptReviewAction {
    Approve,
    Merge,
    Reject,
    KeepAlias,
    RemoveAlias,
}

#[derive(Deserialize)]
struct ConceptAliasAuditTarget {
    alias_id: String,
    alias: String,
    normalized: String,
    concept_id: String,
}

fn decode_alias_audit_target(text: &str) -> Result<Option<ConceptAliasAuditTarget>, String> {
    let value: Value = serde_json::from_str(text).map_err(|error| error.to_string())?;
    let Some(target) = value.get("audit_alias") else {
        return Ok(None);
    };
    let target: ConceptAliasAuditTarget =
        serde_json::from_value(target.clone()).map_err(|error| error.to_string())?;
    if target.alias_id.trim().is_empty()
        || target.concept_id.trim().is_empty()
        || target.normalized.is_empty()
        || normalized_concept_text(&target.alias) != target.normalized
    {
        return Err("concept_review_payload_invalid".into());
    }
    Ok(Some(target))
}

fn remove_audited_alias(
    snapshot: &mut ConceptKbReplacement,
    target: &ConceptAliasAuditTarget,
    now: &str,
) -> Result<(), String> {
    snapshot
        .aliases
        .retain(|alias| alias.concept_id != target.concept_id || alias.alias_id != target.alias_id);
    let owners = snapshot
        .concepts
        .iter_mut()
        .filter(|concept| concept.concept_id == target.concept_id)
        .map(|concept| (&mut concept.aliases_json, &mut concept.updated_at));
    let senses = snapshot
        .senses
        .iter_mut()
        .filter(|sense| sense.concept_id == target.concept_id)
        .map(|sense| (&mut sense.aliases_json, &mut sense.updated_at));
    for (aliases_json, updated_at) in owners.chain(senses) {
        let mut aliases: Vec<String> =
            serde_json::from_str(aliases_json).map_err(|error| error.to_string())?;
        aliases.retain(|alias| normalized_concept_text(alias) != target.normalized);
        *aliases_json = serde_json::to_string(&aliases).map_err(|error| error.to_string())?;
        *updated_at = now.into();
    }
    Ok(())
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptReviewRequest {
    pub expected_manifest_hash: String,
    pub review_id: String,
    pub action: ConceptReviewAction,
    pub target_concept_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptDisplayUpdateRequest {
    pub expected_manifest_hash: String,
    pub concept_id: String,
    pub label: String,
    pub short_definition: String,
    pub definition: String,
    pub usage_note: String,
    pub editorial_note: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptDeleteRequest {
    pub expected_manifest_hash: String,
    pub concept_ids: Vec<String>,
}

pub trait ConceptKbComputePort: Send + Sync {
    fn build_index(
        &self,
        snapshot: &ConceptKbReplacement,
        canceled: &Arc<AtomicBool>,
    ) -> Result<ConceptIndexOutput, String>;
    fn query(
        &self,
        snapshot: &ConceptKbReplacement,
        request: &Value,
        canceled: &Arc<AtomicBool>,
    ) -> Result<Value, String>;
}

/// The index is usable only when a rebuild has been promoted for the current
/// application state; a repository without one loads a default (fresh-looking)
/// state that must not read as a promoted index.
fn promoted_index(state: &synthesis_repository::ConceptApplicationStateRecord) -> bool {
    state.index_stale == 0 && !state.index_json.is_empty()
}

type Clock = Arc<dyn Fn() -> String + Send + Sync>;

struct QueryState {
    accepting: bool,
    active: BTreeMap<u64, Arc<AtomicBool>>,
}

struct QueryAdmission {
    next_id: AtomicU64,
    state: Mutex<QueryState>,
    drained: Condvar,
}

struct QueryLease<'a> {
    owner: &'a QueryAdmission,
    id: u64,
    canceled: Arc<AtomicBool>,
}

impl QueryAdmission {
    fn new() -> Self {
        Self {
            next_id: AtomicU64::new(0),
            state: Mutex::new(QueryState {
                accepting: true,
                active: BTreeMap::new(),
            }),
            drained: Condvar::new(),
        }
    }

    fn admit(&self) -> Result<QueryLease<'_>, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "concept_kb_unavailable".to_owned())?;
        if !state.accepting {
            return Err("stopping".into());
        }
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let canceled = Arc::new(AtomicBool::new(false));
        state.active.insert(id, Arc::clone(&canceled));
        Ok(QueryLease {
            owner: self,
            id,
            canceled,
        })
    }

    fn stop(&self) {
        if let Ok(mut state) = self.state.lock() {
            state.accepting = false;
            for canceled in state.active.values() {
                canceled.store(true, Ordering::Relaxed);
            }
        }
    }

    fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.stop();
        let state = self
            .state
            .lock()
            .map_err(|_| "concept_kb_unavailable".to_owned())?;
        let (state, wait) = self
            .drained
            .wait_timeout_while(state, timeout, |state| !state.active.is_empty())
            .map_err(|_| "concept_kb_unavailable".to_owned())?;
        if wait.timed_out() && !state.active.is_empty() {
            Err("concept_kb_query_drain_timeout".into())
        } else {
            Ok(())
        }
    }
}

impl Drop for QueryLease<'_> {
    fn drop(&mut self) {
        if let Ok(mut state) = self.owner.state.lock() {
            state.active.remove(&self.id);
            self.owner.drained.notify_all();
        }
    }
}

pub struct ConceptKbApplication {
    repository: Arc<dyn ConceptKbRepositoryPort>,
    compute: Arc<dyn ConceptKbComputePort>,
    now: Clock,
    mutations: SingleFlightAdmission,
    queries: QueryAdmission,
}

impl ConceptKbApplication {
    pub fn new(
        repository: Arc<dyn ConceptKbRepositoryPort>,
        compute: Arc<dyn ConceptKbComputePort>,
    ) -> Self {
        Self::with_clock(repository, compute, Arc::new(default_now))
    }

    pub fn with_clock(
        repository: Arc<dyn ConceptKbRepositoryPort>,
        compute: Arc<dyn ConceptKbComputePort>,
        now: Clock,
    ) -> Self {
        Self {
            repository,
            compute,
            now,
            mutations: SingleFlightAdmission::new(),
            queries: QueryAdmission::new(),
        }
    }

    pub fn inspect(&self) -> Result<ConceptInspectResult, String> {
        let snapshot = self.repository.load()?;
        let state = self.repository.get_state()?;
        Ok(ConceptInspectResult {
            manifest_hash: state.as_ref().map(|state| state.manifest_hash.clone()),
            revision: state.as_ref().map_or(0, |state| state.revision),
            index_hash: state
                .as_ref()
                .map(|state| state.index_hash.clone())
                .filter(|value| !value.is_empty()),
            index_basis_hash: state
                .as_ref()
                .map(|state| state.index_basis_hash.clone())
                .filter(|value| !value.is_empty()),
            index_stale: state.as_ref().is_none_or(|state| state.index_stale != 0),
            concept_count: snapshot.concepts.len(),
            review_count: snapshot.reviews.len(),
        })
    }

    pub fn load(&self) -> Result<ConceptKbReplacement, String> {
        self.repository.load()
    }

    pub fn load_review_page(
        &self,
        query: &ReviewPageQuery,
    ) -> Result<(ConceptKbReplacement, usize), String> {
        self.repository.load_review_page(query)
    }

    pub fn replace_snapshot(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &ConceptKbReplacement,
    ) -> ConceptMutationResult {
        self.apply_replacement(expected_manifest_hash, replacement)
    }

    pub fn ingest_proposals(&self, request: &ConceptIngestRequest) -> ConceptMutationResult {
        if request.topic_id.trim().is_empty()
            || request.proposals.is_empty()
            || request.proposals.len() > 100
            || request.proposals.iter().any(|proposal| {
                proposal.label.trim().is_empty() || proposal.domain.trim().is_empty()
            })
        {
            return self.result(
                ConceptMutationStatus::InvalidRequest,
                Vec::new(),
                Vec::new(),
            );
        }
        let current = match self.repository.get_state() {
            Ok(current) => current,
            Err(_) => {
                return self.result(
                    ConceptMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if current.as_ref().map(|state| state.manifest_hash.as_str())
            != request.expected_manifest_hash.as_deref()
        {
            return self.result(ConceptMutationStatus::BasisMismatch, Vec::new(), Vec::new());
        }
        let mut snapshot = if current.is_some() {
            match self.repository.load() {
                Ok(snapshot) => snapshot,
                Err(_) => {
                    return self.result(
                        ConceptMutationStatus::RepairRequired,
                        Vec::new(),
                        Vec::new(),
                    );
                }
            }
        } else {
            ConceptKbReplacement::default()
        };
        let now = (self.now)();
        let mut changed = Vec::new();
        let mut reviews = Vec::new();
        for proposal in &request.proposals {
            let candidates = concept_matches(&snapshot, proposal);
            if proposal.confidence == ConceptConfidence::Low || candidates.len() > 1 {
                let reason = if candidates.len() > 1 {
                    "ambiguous_concept_match"
                } else {
                    "low_confidence_concept"
                };
                let review_id = concept_review_id(&request.topic_id, reason, proposal);
                if !snapshot
                    .reviews
                    .iter()
                    .any(|review| review.review_id == review_id)
                {
                    let proposal_json = match serde_json::to_string(proposal) {
                        Ok(value) => value,
                        Err(_) => {
                            return self.result(
                                ConceptMutationStatus::InvalidRequest,
                                Vec::new(),
                                Vec::new(),
                            );
                        }
                    };
                    snapshot.reviews.push(ConceptReviewItemRecord {
                        review_id: review_id.clone(),
                        status: "open".into(),
                        reason: reason.into(),
                        topic_id: request.topic_id.clone(),
                        topic_path_id: request.topic_path_id.clone(),
                        label: proposal.label.clone(),
                        confidence: proposal.confidence.as_str().into(),
                        candidate_concept_ids_json: serde_json::to_string(&candidates)
                            .unwrap_or_else(|_| "[]".into()),
                        proposal_json,
                        created_at: now.clone(),
                        updated_at: now.clone(),
                        ..ConceptReviewItemRecord::default()
                    });
                }
                reviews.push(review_id);
            } else {
                changed.push(merge_concept_proposal(
                    &mut snapshot,
                    proposal,
                    &request.topic_id,
                    candidates.first().map(String::as_str),
                    &now,
                ));
            }
        }
        if changed.is_empty() && reviews.is_empty() {
            return self.result(ConceptMutationStatus::Unchanged, Vec::new(), Vec::new());
        }
        if set_concept_manifest(&mut snapshot).is_err() {
            return self.result(
                ConceptMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
            );
        }
        self.apply_replacement(request.expected_manifest_hash.as_deref(), &snapshot)
    }

    pub fn ingest_topic_sidecar(
        &self,
        topic_id: &str,
        topic_path_id: &str,
        payload: &Value,
    ) -> ConceptMutationResult {
        let Some(object) = payload.as_object() else {
            return self.result(
                ConceptMutationStatus::InvalidRequest,
                Vec::new(),
                Vec::new(),
            );
        };
        let rows = ["cards", "concepts", "proposals"]
            .into_iter()
            .find_map(|name| object.get(name).and_then(Value::as_array));
        let Some(rows) = rows else {
            return self.result(
                ConceptMutationStatus::InvalidRequest,
                Vec::new(),
                Vec::new(),
            );
        };
        if rows.is_empty() {
            return self.result(ConceptMutationStatus::Unchanged, Vec::new(), Vec::new());
        }
        let Some(proposals) = rows
            .iter()
            .map(concept_proposal_from_sidecar)
            .collect::<Option<Vec<_>>>()
        else {
            return self.result(
                ConceptMutationStatus::InvalidRequest,
                Vec::new(),
                Vec::new(),
            );
        };
        let expected_manifest_hash = match self.repository.get_state() {
            Ok(state) => state.map(|state| state.manifest_hash),
            Err(_) => {
                return self.result(
                    ConceptMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        self.ingest_proposals(&ConceptIngestRequest {
            expected_manifest_hash,
            topic_id: topic_id.to_owned(),
            topic_path_id: topic_path_id.to_owned(),
            proposals,
        })
    }

    pub fn review(&self, request: &ConceptReviewRequest) -> ConceptMutationResult {
        let mut snapshot = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return self.diagnostic_result(
                    ConceptMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                    "concept_review_repair_required",
                    "Concept review state is unavailable.",
                    [("review_id", request.review_id.as_str())],
                );
            }
        };
        if snapshot.state.manifest_hash != request.expected_manifest_hash {
            return self.diagnostic_result(
                ConceptMutationStatus::BasisMismatch,
                Vec::new(),
                Vec::new(),
                "concept_review_basis_mismatch",
                "Concept review state changed before the decision was applied.",
                [("review_id", request.review_id.as_str())],
            );
        }
        let Some(index) = snapshot
            .reviews
            .iter()
            .position(|review| review.review_id == request.review_id)
        else {
            return self.diagnostic_result(
                ConceptMutationStatus::NotFound,
                Vec::new(),
                Vec::new(),
                "concept_review_item_missing",
                "Concept review item does not exist.",
                [("review_id", request.review_id.as_str())],
            );
        };
        if snapshot.reviews[index].status != "open" {
            return self.diagnostic_result(
                ConceptMutationStatus::ReviewItemClosed,
                Vec::new(),
                Vec::new(),
                "concept_review_item_closed",
                "Concept review item is already resolved.",
                [
                    ("review_id", request.review_id.as_str()),
                    ("status", snapshot.reviews[index].status.as_str()),
                ],
            );
        }
        let audit = match decode_alias_audit_target(&snapshot.reviews[index].proposal_json) {
            Ok(audit) => audit,
            Err(_) => {
                return self.diagnostic_result(
                    ConceptMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                    "concept_review_payload_invalid",
                    "Concept review payload cannot be decoded.",
                    [("review_id", request.review_id.as_str())],
                );
            }
        };
        if audit.is_some()
            != matches!(
                request.action,
                ConceptReviewAction::KeepAlias | ConceptReviewAction::RemoveAlias
            )
        {
            return self.diagnostic_result(
                ConceptMutationStatus::InvalidRequest,
                Vec::new(),
                Vec::new(),
                "concept_review_action_invalid",
                "Concept review action does not match the review kind.",
                [("review_id", request.review_id.as_str())],
            );
        }
        let now = (self.now)();
        let mut changed = Vec::new();
        let status = if let Some(target) = audit {
            if !snapshot.aliases.iter().any(|alias| {
                alias.alias_id == target.alias_id
                    && alias.concept_id == target.concept_id
                    && normalized_concept_text(&alias.alias) == target.normalized
            }) {
                return self.diagnostic_result(
                    ConceptMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                    "concept_review_alias_target_mismatch",
                    "Concept alias ownership no longer matches the reviewed target.",
                    [("review_id", request.review_id.as_str())],
                );
            }
            if request.action == ConceptReviewAction::RemoveAlias
                && remove_audited_alias(&mut snapshot, &target, &now).is_err()
            {
                return self.diagnostic_result(
                    ConceptMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                    "concept_review_payload_invalid",
                    "Concept alias ownership records cannot be decoded.",
                    [("review_id", request.review_id.as_str())],
                );
            }
            snapshot.reviews[index].target_concept_id = target.concept_id;
            if request.action == ConceptReviewAction::KeepAlias {
                "approved"
            } else {
                "rejected"
            }
        } else {
            let proposal =
                match decode_stored_concept_proposal(&snapshot.reviews[index].proposal_json) {
                    Ok(proposal) => proposal,
                    Err(_) => {
                        return self.diagnostic_result(
                            ConceptMutationStatus::RepairRequired,
                            Vec::new(),
                            Vec::new(),
                            "concept_review_payload_invalid",
                            "Concept review payload cannot be decoded.",
                            [("review_id", request.review_id.as_str())],
                        );
                    }
                };
            if request.action == ConceptReviewAction::Reject {
                "rejected"
            } else if request.action == ConceptReviewAction::Approve {
                let topic_id = snapshot.reviews[index].topic_id.clone();
                let concept_id =
                    merge_concept_proposal(&mut snapshot, &proposal, &topic_id, None, &now);
                snapshot.reviews[index].target_concept_id = concept_id.clone();
                changed.push(concept_id);
                "approved"
            } else {
                let Some(target) = request.target_concept_id.as_deref() else {
                    return self.diagnostic_result(
                        ConceptMutationStatus::ReviewTargetMissing,
                        Vec::new(),
                        Vec::new(),
                        "concept_review_target_missing",
                        "Concept review merge target is required.",
                        [("review_id", request.review_id.as_str())],
                    );
                };
                if !snapshot
                    .concepts
                    .iter()
                    .any(|concept| concept.concept_id == target)
                {
                    return self.diagnostic_result(
                        ConceptMutationStatus::ReviewTargetMissing,
                        Vec::new(),
                        Vec::new(),
                        "concept_review_target_missing",
                        "Concept review merge target does not exist.",
                        [
                            ("review_id", request.review_id.as_str()),
                            ("target_concept_id", target),
                        ],
                    );
                }
                let topic_id = snapshot.reviews[index].topic_id.clone();
                let concept_id =
                    merge_concept_proposal(&mut snapshot, &proposal, &topic_id, Some(target), &now);
                snapshot.reviews[index].target_concept_id = concept_id.clone();
                changed.push(concept_id);
                "merged"
            }
        };
        snapshot.reviews[index].status = status.into();
        snapshot.reviews[index].updated_at = now.clone();
        snapshot.reviews[index].resolved_at = now;
        snapshot.state.index_stale = 1;
        if set_concept_manifest(&mut snapshot).is_err() {
            return self.diagnostic_result(
                ConceptMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
                "concept_review_projection_failed",
                "Concept review state could not be finalized.",
                [("review_id", request.review_id.as_str())],
            );
        }
        let mut result = self.apply_replacement(Some(&request.expected_manifest_hash), &snapshot);
        if result.status != ConceptMutationStatus::Committed && result.diagnostic.is_none() {
            result.diagnostic = Some(ConceptDiagnostic {
                code: "concept_review_commit_failed".into(),
                message: "Concept review decision was not committed.".into(),
                details: [("review_id".into(), request.review_id.clone())]
                    .into_iter()
                    .collect(),
            });
        }
        result
    }

    pub fn update_display_text(
        &self,
        request: &ConceptDisplayUpdateRequest,
    ) -> ConceptMutationResult {
        let mut snapshot = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return self.result(
                    ConceptMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if snapshot.state.manifest_hash != request.expected_manifest_hash {
            return self.result(ConceptMutationStatus::BasisMismatch, Vec::new(), Vec::new());
        }
        let Some(concept) = snapshot
            .concepts
            .iter_mut()
            .find(|concept| concept.concept_id == request.concept_id)
        else {
            return self.result(ConceptMutationStatus::NotFound, Vec::new(), Vec::new());
        };
        concept.label = request.label.clone();
        concept.short_definition = request.short_definition.clone();
        concept.definition = request.definition.clone();
        concept.usage_note = request.usage_note.clone();
        concept.editorial_note = request.editorial_note.clone();
        concept.updated_at = (self.now)();
        if set_concept_manifest(&mut snapshot).is_err() {
            return self.result(
                ConceptMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
            );
        }
        self.apply_replacement(Some(&request.expected_manifest_hash), &snapshot)
    }

    pub fn delete_concepts(&self, request: &ConceptDeleteRequest) -> ConceptMutationResult {
        let mut snapshot = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return self.result(
                    ConceptMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if snapshot.state.manifest_hash != request.expected_manifest_hash {
            return self.result(ConceptMutationStatus::BasisMismatch, Vec::new(), Vec::new());
        }
        let requested = request.concept_ids.iter().collect::<HashSet<_>>();
        let deleted = snapshot
            .concepts
            .iter()
            .filter(|concept| requested.contains(&concept.concept_id))
            .map(|concept| concept.concept_id.clone())
            .collect::<HashSet<_>>();
        if deleted.is_empty() {
            return self.result(ConceptMutationStatus::NotFound, Vec::new(), Vec::new());
        }
        let sense_ids = snapshot
            .senses
            .iter()
            .filter(|sense| deleted.contains(&sense.concept_id))
            .map(|sense| sense.sense_id.clone())
            .collect::<HashSet<_>>();
        snapshot
            .concepts
            .retain(|concept| !deleted.contains(&concept.concept_id));
        snapshot
            .senses
            .retain(|sense| !deleted.contains(&sense.concept_id));
        snapshot.aliases.retain(|alias| {
            !deleted.contains(&alias.concept_id) && !sense_ids.contains(&alias.sense_id)
        });
        snapshot.relations.retain(|relation| {
            !deleted.contains(&relation.source_concept_id)
                && !deleted.contains(&relation.target_concept_id)
        });
        snapshot.topic_links.retain(|link| {
            !deleted.contains(&link.concept_id) && !sense_ids.contains(&link.sense_id)
        });
        for review in &mut snapshot.reviews {
            let candidates =
                serde_json::from_str::<Vec<String>>(&review.candidate_concept_ids_json)
                    .unwrap_or_default()
                    .into_iter()
                    .filter(|concept_id| !deleted.contains(concept_id))
                    .collect::<Vec<_>>();
            review.candidate_concept_ids_json =
                serde_json::to_string(&candidates).unwrap_or_else(|_| "[]".into());
            if deleted.contains(&review.target_concept_id) {
                review.target_concept_id.clear();
            }
        }
        if set_concept_manifest(&mut snapshot).is_err() {
            return self.result(
                ConceptMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
            );
        }
        self.apply_replacement(Some(&request.expected_manifest_hash), &snapshot)
    }

    pub fn rebuild_index(&self, expected_manifest_hash: &str) -> ConceptMutationResult {
        self.rebuild_index_with_checkpoint(expected_manifest_hash, &|| Ok(()))
    }

    pub fn rebuild_index_with_checkpoint(
        &self,
        expected_manifest_hash: &str,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> ConceptMutationResult {
        let lease = match self.mutations.admit() {
            Ok(lease) => lease,
            Err(error) => return self.result(map_admission(error), Vec::new(), Vec::new()),
        };
        let snapshot = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return self.result(
                    ConceptMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if snapshot.state.manifest_hash != expected_manifest_hash {
            return self.result(ConceptMutationStatus::BasisMismatch, Vec::new(), Vec::new());
        }
        let output = match self.compute.build_index(&snapshot, lease.canceled()) {
            Ok(output) => output,
            Err(error) => return self.result(worker_status(&error), Vec::new(), Vec::new()),
        };
        if lease.canceled().load(Ordering::Relaxed) {
            return self.result(ConceptMutationStatus::Stopping, Vec::new(), Vec::new());
        }
        if checkpoint().is_err() {
            return self.result(ConceptMutationStatus::Stopping, Vec::new(), Vec::new());
        }
        match self.repository.promote_index_with_receipt(
            expected_manifest_hash,
            &output.index_hash,
            &output.index_json,
            &(self.now)(),
            None,
        ) {
            Ok(true) => self.result(ConceptMutationStatus::Committed, Vec::new(), Vec::new()),
            Ok(false) => self.result(ConceptMutationStatus::BasisMismatch, Vec::new(), Vec::new()),
            Err(_) => self.result(
                ConceptMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
            ),
        }
    }

    pub fn read_index(&self) -> Result<Option<Value>, String> {
        let state = self.repository.get_state()?;
        state
            .filter(promoted_index)
            .map(|state| {
                serde_json::from_str(&state.index_json)
                    .map_err(|_| "concept_kb_index_invalid".to_owned())
            })
            .transpose()
    }

    pub fn query(&self, request: &Value) -> Result<Value, String> {
        if request.to_string().len() > 1024 * 1024 {
            return Err("invalid_request".into());
        }
        let lease = self.queries.admit()?;
        // One read carries both the freshness decision and the rows it gates,
        // so a query can never run against a basis other than the promoted one.
        let snapshot = self.repository.load()?;
        // A repository without a concept state row loads a default state, so
        // the promoted-index predicate stays the only freshness evidence.
        if !promoted_index(&snapshot.state) {
            return Err("concept_kb_index_stale".into());
        }
        self.compute.query(&snapshot, request, &lease.canceled)
    }

    pub fn stop_admission(&self) {
        self.mutations.stop();
        self.queries.stop();
    }

    pub fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.stop_admission();
        self.mutations.shutdown(timeout, "concept_kb")?;
        self.queries.shutdown(timeout)
    }

    fn apply_replacement(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &ConceptKbReplacement,
    ) -> ConceptMutationResult {
        if validate_snapshot(replacement).is_err() {
            return self.result(
                ConceptMutationStatus::InvalidRequest,
                Vec::new(),
                Vec::new(),
            );
        }
        let lease = match self.mutations.admit() {
            Ok(lease) => lease,
            Err(error) => return self.result(map_admission(error), Vec::new(), Vec::new()),
        };
        let current = match self.repository.get_state() {
            Ok(current) => current,
            Err(_) => {
                return self.result(
                    ConceptMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if current.as_ref().map(|state| state.manifest_hash.as_str()) != expected_manifest_hash {
            return self.result(ConceptMutationStatus::BasisMismatch, Vec::new(), Vec::new());
        }
        if current
            .as_ref()
            .is_some_and(|state| state.manifest_hash == replacement.state.manifest_hash)
        {
            return self.result(ConceptMutationStatus::Unchanged, Vec::new(), Vec::new());
        }
        if lease.canceled().load(Ordering::Relaxed) {
            return self.result(ConceptMutationStatus::Stopping, Vec::new(), Vec::new());
        }
        let mut replacement = replacement.clone();
        replacement.state.singleton_id = 1;
        replacement.state.revision = current.as_ref().map_or(1, |state| state.revision + 1);
        replacement.state.index_stale = 1;
        replacement.state.updated_at = (self.now)();
        let changed = replacement
            .concepts
            .iter()
            .map(|concept| concept.concept_id.clone())
            .collect::<Vec<_>>();
        let reviews = replacement
            .reviews
            .iter()
            .map(|review| review.review_id.clone())
            .collect::<Vec<_>>();
        match self
            .repository
            .replace_with_receipt(expected_manifest_hash, &replacement, None)
        {
            Ok(true) => self.result(ConceptMutationStatus::Committed, changed, reviews),
            Ok(false) => self.result(ConceptMutationStatus::BasisMismatch, Vec::new(), Vec::new()),
            Err(_) => self.result(
                ConceptMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
            ),
        }
    }

    fn result(
        &self,
        status: ConceptMutationStatus,
        mut changed_concept_ids: Vec<String>,
        mut review_ids: Vec<String>,
    ) -> ConceptMutationResult {
        changed_concept_ids.sort();
        changed_concept_ids.dedup();
        review_ids.sort();
        review_ids.dedup();
        let state = self.repository.get_state().ok().flatten();
        ConceptMutationResult {
            status,
            manifest_hash: state.as_ref().map(|state| state.manifest_hash.clone()),
            revision: state.as_ref().map_or(0, |state| state.revision),
            changed_concept_ids,
            review_ids,
            warnings: Vec::new(),
            diagnostic: None,
        }
    }

    fn diagnostic_result<const N: usize>(
        &self,
        status: ConceptMutationStatus,
        changed_concept_ids: Vec<String>,
        review_ids: Vec<String>,
        code: &str,
        message: &str,
        details: [(&str, &str); N],
    ) -> ConceptMutationResult {
        let mut result = self.result(status, changed_concept_ids, review_ids);
        result.diagnostic = Some(ConceptDiagnostic {
            code: code.into(),
            message: message.into(),
            details: details
                .into_iter()
                .map(|(key, value)| (key.to_owned(), value.to_owned()))
                .collect(),
        });
        result
    }
}

fn sidecar_text(object: &serde_json::Map<String, Value>, names: &[&str]) -> String {
    names
        .iter()
        .find_map(|name| object.get(*name).and_then(Value::as_str))
        .map(str::trim)
        .filter(|value| !value.is_empty() && value.len() <= 4096)
        .unwrap_or_default()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn sidecar_strings(value: Option<&Value>) -> Option<Vec<String>> {
    let values = value?.as_array()?;
    let mut output = values
        .iter()
        .map(Value::as_str)
        .collect::<Option<Vec<_>>>()?
        .into_iter()
        .map(str::trim)
        .filter(|value| !value.is_empty() && value.len() <= 4096)
        .map(str::to_owned)
        .collect::<Vec<_>>();
    output.sort();
    output.dedup();
    Some(output)
}

fn sidecar_confidence(value: Option<&Value>) -> ConceptConfidence {
    match value.and_then(Value::as_str) {
        Some("high") => ConceptConfidence::High,
        Some("low") => ConceptConfidence::Low,
        _ => ConceptConfidence::Medium,
    }
}

fn concept_proposal_relation_from_sidecar(value: &Value) -> Option<ConceptProposalRelation> {
    let object = value.as_object()?;
    let target_concept_id = sidecar_text(object, &["target_concept_id", "targetConceptId"]);
    let relation = sidecar_text(object, &["relation"]);
    if target_concept_id.is_empty() || relation.is_empty() {
        return None;
    }
    Some(ConceptProposalRelation {
        target_concept_id,
        relation,
        confidence: sidecar_confidence(object.get("confidence")),
        provenance: object
            .get("provenance")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default(),
    })
}

fn concept_proposal_from_sidecar(value: &Value) -> Option<ConceptProposal> {
    let object = value.as_object()?;
    let label = sidecar_text(object, &["label"]);
    if label.is_empty() {
        return None;
    }
    let mut aliases = sidecar_strings(object.get("aliases")).unwrap_or_default();
    aliases.push(label.clone());
    aliases.sort();
    aliases.dedup();
    let short_definition = sidecar_text(object, &["short_definition", "shortDefinition"]);
    let definition = sidecar_text(object, &["definition"]);
    let relations = match object.get("relations") {
        None => Vec::new(),
        Some(Value::Array(rows)) => rows
            .iter()
            .map(concept_proposal_relation_from_sidecar)
            .collect::<Option<Vec<_>>>()?,
        Some(_) => return None,
    };
    Some(ConceptProposal {
        local_id: object
            .get("local_id")
            .or_else(|| object.get("localId"))
            .and_then(Value::as_str)
            .map(str::to_owned),
        label,
        aliases,
        concept_type: {
            let value = sidecar_text(object, &["concept_type", "conceptType"]);
            if value.is_empty() {
                "concept".into()
            } else {
                value
            }
        },
        domain: {
            let value = sidecar_text(object, &["domain"]);
            if value.is_empty() {
                "general".into()
            } else {
                value
            }
        },
        short_definition: if short_definition.is_empty() {
            definition.clone()
        } else {
            short_definition
        },
        definition: if definition.is_empty() {
            sidecar_text(object, &["short_definition", "shortDefinition"])
        } else {
            definition
        },
        disambiguation: sidecar_text(object, &["disambiguation"]),
        topic_relevance: sidecar_text(object, &["topic_relevance", "topicRelevance"]),
        confidence: sidecar_confidence(object.get("confidence")),
        evidence: object
            .get("evidence")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default(),
        relations,
    })
}

fn normalized_concept_text(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn safe_concept_id(value: &str) -> String {
    let normalized = normalized_concept_text(value);
    let mut safe = String::with_capacity(normalized.len());
    let mut separator = false;
    for character in normalized.chars() {
        if character.is_ascii_alphanumeric() || matches!(character, '_' | '.' | '-') {
            safe.push(character);
            separator = false;
        } else if !separator && !safe.is_empty() {
            safe.push('-');
            separator = true;
        }
    }
    while safe.ends_with('-') {
        safe.pop();
    }
    if safe.is_empty() {
        "concept".into()
    } else {
        safe
    }
}

fn short_concept_hash(value: &Value) -> String {
    canonical_json_hash(value)
        .unwrap_or_else(|_| "sha256:invalid".into())
        .trim_start_matches("sha256:")
        .chars()
        .take(12)
        .collect()
}

fn concept_id(proposal: &ConceptProposal) -> String {
    format!(
        "concept:{}:{}",
        safe_concept_id(&proposal.domain),
        safe_concept_id(&proposal.label)
    )
}

fn concept_sense_id(concept_id: &str, proposal: &ConceptProposal) -> String {
    format!(
        "sense:{}:{}",
        safe_concept_id(concept_id),
        short_concept_hash(&json!({
            "label": normalized_concept_text(&proposal.label),
            "domain": normalized_concept_text(&proposal.domain),
            "definition": normalized_concept_text(&proposal.definition),
        }))
    )
}

fn concept_alias_id(alias: &str) -> String {
    format!(
        "alias:{}",
        short_concept_hash(&json!(normalized_concept_text(alias)))
    )
}

fn concept_review_id(topic_id: &str, reason: &str, proposal: &ConceptProposal) -> String {
    format!(
        "review:{}",
        short_concept_hash(&json!({
            "topicId": topic_id,
            "reason": reason,
            "label": normalized_concept_text(&proposal.label),
            "domain": normalized_concept_text(&proposal.domain),
            "definition": normalized_concept_text(&proposal.definition),
        }))
    )
}

fn concept_matches(snapshot: &ConceptKbReplacement, proposal: &ConceptProposal) -> Vec<String> {
    let keys = std::iter::once(&proposal.label)
        .chain(proposal.aliases.iter())
        .map(|value| normalized_concept_text(value))
        .collect::<HashSet<_>>();
    let mut matches = snapshot
        .concepts
        .iter()
        .filter(|concept| {
            keys.contains(&normalized_concept_text(&concept.label))
                || serde_json::from_str::<Vec<String>>(&concept.aliases_json)
                    .unwrap_or_default()
                    .iter()
                    .any(|alias| keys.contains(&normalized_concept_text(alias)))
        })
        .map(|concept| concept.concept_id.clone())
        .collect::<Vec<_>>();
    matches.extend(
        snapshot
            .aliases
            .iter()
            .filter(|alias| keys.contains(&normalized_concept_text(&alias.normalized)))
            .map(|alias| alias.concept_id.clone()),
    );
    matches.sort();
    matches.dedup();
    matches
}

fn merge_concept_proposal(
    snapshot: &mut ConceptKbReplacement,
    proposal: &ConceptProposal,
    topic_id: &str,
    target_concept_id: Option<&str>,
    now: &str,
) -> String {
    let concept_id = target_concept_id
        .map(str::to_owned)
        .unwrap_or_else(|| concept_id(proposal));
    let sense_id = concept_sense_id(&concept_id, proposal);
    if let Some(concept) = snapshot
        .concepts
        .iter_mut()
        .find(|concept| concept.concept_id == concept_id)
    {
        let mut aliases =
            serde_json::from_str::<Vec<String>>(&concept.aliases_json).unwrap_or_default();
        aliases.extend(proposal.aliases.iter().cloned());
        aliases.sort();
        aliases.dedup();
        concept.aliases_json = serde_json::to_string(&aliases).unwrap_or_else(|_| "[]".into());
        let mut senses =
            serde_json::from_str::<Vec<String>>(&concept.sense_ids_json).unwrap_or_default();
        senses.push(sense_id.clone());
        senses.sort();
        senses.dedup();
        concept.sense_ids_json = serde_json::to_string(&senses).unwrap_or_else(|_| "[]".into());
        concept.updated_at = now.into();
    } else {
        snapshot.concepts.push(ConceptRecord {
            concept_id: concept_id.clone(),
            label: proposal.label.clone(),
            aliases_json: serde_json::to_string(&proposal.aliases).unwrap_or_else(|_| "[]".into()),
            concept_type: proposal.concept_type.clone(),
            domain: proposal.domain.clone(),
            status: "active".into(),
            short_definition: proposal.short_definition.clone(),
            definition: proposal.definition.clone(),
            sense_ids_json: serde_json::to_string(&vec![sense_id.clone()])
                .unwrap_or_else(|_| "[]".into()),
            created_at: now.into(),
            updated_at: now.into(),
            ..ConceptRecord::default()
        });
    }
    if let Some(sense) = snapshot
        .senses
        .iter_mut()
        .find(|sense| sense.sense_id == sense_id)
    {
        let mut topics =
            serde_json::from_str::<Vec<String>>(&sense.source_topic_ids_json).unwrap_or_default();
        topics.push(topic_id.into());
        topics.sort();
        topics.dedup();
        sense.source_topic_ids_json =
            serde_json::to_string(&topics).unwrap_or_else(|_| "[]".into());
        sense.updated_at = now.into();
    } else {
        snapshot.senses.push(ConceptSenseRecord {
            sense_id: sense_id.clone(),
            concept_id: concept_id.clone(),
            label: proposal.label.clone(),
            aliases_json: serde_json::to_string(&proposal.aliases).unwrap_or_else(|_| "[]".into()),
            domain: proposal.domain.clone(),
            short_definition: proposal.short_definition.clone(),
            definition: proposal.definition.clone(),
            disambiguation: proposal.disambiguation.clone(),
            topic_relevance: proposal.topic_relevance.clone(),
            confidence: proposal.confidence.as_str().into(),
            source_topic_ids_json: serde_json::to_string(&vec![topic_id])
                .unwrap_or_else(|_| "[]".into()),
            evidence_json: serde_json::to_string(&proposal.evidence)
                .unwrap_or_else(|_| "[]".into()),
            created_at: now.into(),
            updated_at: now.into(),
        });
    }
    for alias in std::iter::once(&proposal.label).chain(proposal.aliases.iter()) {
        let alias_id = concept_alias_id(alias);
        if !snapshot
            .aliases
            .iter()
            .any(|record| record.alias_id == alias_id)
        {
            snapshot.aliases.push(ConceptAliasRecord {
                alias_id,
                alias: alias.clone(),
                normalized: normalized_concept_text(alias),
                concept_id: concept_id.clone(),
                sense_id: sense_id.clone(),
                status: "active".into(),
                confidence: proposal.confidence.as_str().into(),
                created_at: now.into(),
                updated_at: now.into(),
            });
        }
    }
    if !snapshot.topic_links.iter().any(|link| {
        link.topic_id == topic_id && link.concept_id == concept_id && link.sense_id == sense_id
    }) {
        snapshot.topic_links.push(TopicConceptLinkRecord {
            topic_id: topic_id.into(),
            concept_id: concept_id.clone(),
            sense_id: sense_id.clone(),
            label: proposal.label.clone(),
            relevance: proposal.topic_relevance.clone(),
            confidence: proposal.confidence.as_str().into(),
            source: "topic_synthesis_concept_cards".into(),
            created_at: now.into(),
            updated_at: now.into(),
        });
    }
    for relation in &proposal.relations {
        if relation.target_concept_id == concept_id
            || !snapshot
                .concepts
                .iter()
                .any(|concept| concept.concept_id == relation.target_concept_id)
        {
            continue;
        }
        let relation_id = format!(
            "relation:{}:{}:{}",
            safe_concept_id(&relation.relation),
            safe_concept_id(&concept_id),
            safe_concept_id(&relation.target_concept_id)
        );
        if !snapshot
            .relations
            .iter()
            .any(|record| record.relation_id == relation_id)
        {
            snapshot.relations.push(ConceptRelationRecord {
                relation_id,
                source_concept_id: concept_id.clone(),
                target_concept_id: relation.target_concept_id.clone(),
                relation: relation.relation.clone(),
                status: "suggested".into(),
                confidence: relation.confidence.as_str().into(),
                provenance_json: serde_json::to_string(&relation.provenance)
                    .unwrap_or_else(|_| "[]".into()),
                created_at: now.into(),
                updated_at: now.into(),
            });
        }
    }
    concept_id
}

fn set_concept_manifest(snapshot: &mut ConceptKbReplacement) -> Result<(), String> {
    snapshot.state.manifest_hash = canonical_json_hash(&json!({
        "concepts": &snapshot.concepts,
        "senses": &snapshot.senses,
        "aliases": &snapshot.aliases,
        "relations": &snapshot.relations,
        "reviews": &snapshot.reviews,
        "topicLinks": &snapshot.topic_links,
    }))?;
    Ok(())
}

fn validate_snapshot(snapshot: &ConceptKbReplacement) -> Result<(), String> {
    let concept_ids = snapshot
        .concepts
        .iter()
        .map(|concept| &concept.concept_id)
        .collect::<HashSet<_>>();
    if snapshot.state.manifest_hash.is_empty()
        || snapshot.concepts.len() > 100_000
        || concept_ids.len() != snapshot.concepts.len()
        || snapshot
            .concepts
            .iter()
            .any(|concept| concept.concept_id.is_empty() || concept.label.is_empty())
        || snapshot
            .senses
            .iter()
            .any(|sense| !concept_ids.contains(&sense.concept_id))
        || snapshot.relations.iter().any(|relation| {
            !concept_ids.contains(&relation.source_concept_id)
                || !concept_ids.contains(&relation.target_concept_id)
        })
    {
        Err("invalid_request".into())
    } else {
        Ok(())
    }
}

fn map_admission(error: AdmissionError) -> ConceptMutationStatus {
    match error {
        AdmissionError::Busy => ConceptMutationStatus::ConceptKbBusy,
        AdmissionError::Stopping => ConceptMutationStatus::Stopping,
        AdmissionError::Unavailable => ConceptMutationStatus::RepairRequired,
    }
}

fn worker_status(error: &str) -> ConceptMutationStatus {
    if error.contains("stopping") || error.contains("canceled") {
        ConceptMutationStatus::Stopping
    } else {
        ConceptMutationStatus::WorkerFailed
    }
}

fn default_now() -> String {
    synthesis_protocol::utc_now_iso8601()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::RepositoryPort;
    use std::sync::mpsc;
    use std::thread;
    use synthesis_repository::{
        ConceptApplicationStateRecord, ConceptRecord, Repository, RepositoryIdentity,
    };

    struct Compute {
        query_started: Mutex<Option<mpsc::Sender<()>>>,
    }

    /// Records what the compute port was handed, so a query can be traced back
    /// to one promoted repository read.
    struct RecordingCompute {
        queries: Mutex<Vec<(usize, Value)>>,
    }

    impl ConceptKbComputePort for RecordingCompute {
        fn build_index(
            &self,
            snapshot: &ConceptKbReplacement,
            _canceled: &Arc<AtomicBool>,
        ) -> Result<ConceptIndexOutput, String> {
            Ok(ConceptIndexOutput {
                index_hash: format!("index:{}", snapshot.concepts.len()),
                index_json: "{}".into(),
            })
        }

        fn query(
            &self,
            snapshot: &ConceptKbReplacement,
            request: &Value,
            _canceled: &Arc<AtomicBool>,
        ) -> Result<Value, String> {
            self.queries
                .lock()
                .expect("query lock")
                .push((snapshot.concepts.len(), request.clone()));
            Ok(json!({"matches":[]}))
        }
    }

    impl ConceptKbComputePort for Compute {
        fn build_index(
            &self,
            snapshot: &ConceptKbReplacement,
            _canceled: &Arc<AtomicBool>,
        ) -> Result<ConceptIndexOutput, String> {
            Ok(ConceptIndexOutput {
                index_hash: format!("index:{}", snapshot.concepts.len()),
                index_json: format!("{{\"count\":{}}}", snapshot.concepts.len()),
            })
        }

        fn query(
            &self,
            _snapshot: &ConceptKbReplacement,
            request: &Value,
            canceled: &Arc<AtomicBool>,
        ) -> Result<Value, String> {
            if let Some(sender) = self.query_started.lock().expect("query lock").take() {
                sender.send(()).expect("query started");
                while !canceled.load(Ordering::Relaxed) {
                    thread::yield_now();
                }
                return Err("worker_canceled".into());
            }
            Ok(request.clone())
        }
    }

    fn root() -> synthesis_test_support::TestRoot {
        synthesis_test_support::TestRoot::new("synthesis-concept-application")
    }

    fn snapshot(hash: &str) -> ConceptKbReplacement {
        ConceptKbReplacement {
            state: ConceptApplicationStateRecord {
                singleton_id: 1,
                manifest_hash: hash.into(),
                index_json: "{}".into(),
                index_stale: 1,
                updated_at: "fixed".into(),
                ..ConceptApplicationStateRecord::default()
            },
            concepts: vec![ConceptRecord {
                concept_id: "concept:one".into(),
                label: "One".into(),
                aliases_json: "[]".into(),
                concept_type: "concept".into(),
                domain: "test".into(),
                status: "active".into(),
                sense_ids_json: "[]".into(),
                created_at: "fixed".into(),
                updated_at: "fixed".into(),
                ..ConceptRecord::default()
            }],
            ..ConceptKbReplacement::default()
        }
    }

    #[test]
    fn replaces_indexes_and_cancels_concurrent_query_on_shutdown() {
        let root = root();
        let owner = Arc::new(Mutex::new(
            Repository::open(
                &root,
                RepositoryIdentity {
                    profile_id: "profile".into(),
                    data_root_id: "data".into(),
                },
            )
            .expect("repository"),
        ));
        let (started_tx, started_rx) = mpsc::channel();
        let app = Arc::new(ConceptKbApplication::with_clock(
            Arc::new(RepositoryPort::new(Arc::clone(&owner))),
            Arc::new(Compute {
                query_started: Mutex::new(Some(started_tx)),
            }),
            Arc::new(|| "fixed".into()),
        ));
        assert_eq!(
            app.replace_snapshot(None, &snapshot("concept:1")).status,
            ConceptMutationStatus::Committed
        );
        assert_eq!(
            app.rebuild_index_with_checkpoint("concept:1", &|| Err("operation_timeout".into()))
                .status,
            ConceptMutationStatus::Stopping
        );
        assert!(app.inspect().expect("inspect").index_hash.is_none());
        assert_eq!(
            app.rebuild_index("concept:1").status,
            ConceptMutationStatus::Committed
        );
        let query_app = Arc::clone(&app);
        let query = thread::spawn(move || query_app.query(&serde_json::json!({"labels":["One"]})));
        started_rx.recv().expect("query start");
        app.shutdown(Duration::from_secs(1)).expect("shutdown");
        assert_eq!(
            query.join().expect("query thread"),
            Err("worker_canceled".into())
        );
        drop(app);
        drop(owner);
    }

    #[test]
    fn query_refuses_a_stale_index_and_serves_the_promoted_rows_once_fresh() {
        let root = root();
        let owner = Arc::new(Mutex::new(
            Repository::open(
                &root,
                RepositoryIdentity {
                    profile_id: "profile".into(),
                    data_root_id: "data".into(),
                },
            )
            .expect("repository"),
        ));
        let compute = Arc::new(RecordingCompute {
            queries: Mutex::new(Vec::new()),
        });
        let app = ConceptKbApplication::with_clock(
            Arc::new(RepositoryPort::new(Arc::clone(&owner))),
            Arc::clone(&compute) as Arc<dyn ConceptKbComputePort>,
            Arc::new(|| "fixed".into()),
        );
        // No concept state row at all loads a fresh-looking default state; it
        // must still read as "no promoted index".
        assert_eq!(
            app.query(&json!({"labels":["One"]})),
            Err("concept_kb_index_stale".into())
        );
        assert_eq!(
            app.replace_snapshot(None, &snapshot("concept:1")).status,
            ConceptMutationStatus::Committed
        );
        assert_eq!(
            app.replace_snapshot(Some("concept:1"), &snapshot("concept:2"))
                .status,
            ConceptMutationStatus::Committed
        );

        assert_eq!(
            app.query(&json!({"labels":["One"]})),
            Err("concept_kb_index_stale".into())
        );
        assert!(
            compute.queries.lock().expect("query lock").is_empty(),
            "a stale index must not reach the compute port"
        );

        assert_eq!(
            app.rebuild_index("concept:2").status,
            ConceptMutationStatus::Committed
        );
        assert_eq!(app.query(&json!({"labels":["One"]})).map(|_| ()), Ok(()));
        assert_eq!(
            *compute.queries.lock().expect("query lock"),
            vec![(1, json!({"labels":["One"]}))]
        );
    }

    #[test]
    fn review_reports_diagnostics_marks_index_stale_and_reads_filtered_page() {
        let root = root();
        let owner = Arc::new(Mutex::new(
            Repository::open(
                &root,
                RepositoryIdentity {
                    profile_id: "profile".into(),
                    data_root_id: "data".into(),
                },
            )
            .expect("repository"),
        ));
        let app = ConceptKbApplication::with_clock(
            Arc::new(RepositoryPort::new(Arc::clone(&owner))),
            Arc::new(Compute {
                query_started: Mutex::new(None),
            }),
            Arc::new(|| "reviewed".into()),
        );
        let proposal = ConceptProposal {
            local_id: None,
            label: "Review concept".into(),
            aliases: vec!["Reviewed alias".into()],
            concept_type: "method".into(),
            domain: "test".into(),
            short_definition: "A reviewed method.".into(),
            definition: "A method promoted through an explicit review decision.".into(),
            disambiguation: String::new(),
            topic_relevance: String::new(),
            confidence: ConceptConfidence::Low,
            evidence: Vec::new(),
            relations: Vec::new(),
        };
        let mut initial = snapshot("concept:review");
        initial.state.index_stale = 0;
        initial.reviews.push(ConceptReviewItemRecord {
            review_id: "review:one".into(),
            status: "open".into(),
            reason: "low_confidence".into(),
            topic_id: "topic:one".into(),
            topic_path_id: "topic-one".into(),
            label: proposal.label.clone(),
            confidence: "low".into(),
            candidate_concept_ids_json: "[\"concept:one\"]".into(),
            proposal_json: serde_json::to_string(&json!({
                "label":proposal.label,
                "aliases":proposal.aliases,
                "concept_type":proposal.concept_type,
                "domain":proposal.domain,
                "short_definition":proposal.short_definition,
                "definition":proposal.definition,
                "topic_relevance":proposal.topic_relevance,
                "confidence":"low",
                "evidence":[],
                "relations":[],
                "merge_hints":[],
            }))
            .expect("legacy proposal"),
            created_at: "fixed".into(),
            updated_at: "fixed".into(),
            ..ConceptReviewItemRecord::default()
        });
        assert_eq!(
            app.replace_snapshot(None, &initial).status,
            ConceptMutationStatus::Committed
        );
        let missing = app.review(&ConceptReviewRequest {
            expected_manifest_hash: "concept:review".into(),
            review_id: "missing".into(),
            action: ConceptReviewAction::Approve,
            target_concept_id: None,
        });
        assert_eq!(
            missing.diagnostic.expect("missing diagnostic").code,
            "concept_review_item_missing"
        );
        let missing_target = app.review(&ConceptReviewRequest {
            expected_manifest_hash: "concept:review".into(),
            review_id: "review:one".into(),
            action: ConceptReviewAction::Merge,
            target_concept_id: Some("concept:missing".into()),
        });
        assert_eq!(
            missing_target.diagnostic.expect("target diagnostic").code,
            "concept_review_target_missing"
        );
        let committed = app.review(&ConceptReviewRequest {
            expected_manifest_hash: "concept:review".into(),
            review_id: "review:one".into(),
            action: ConceptReviewAction::Approve,
            target_concept_id: None,
        });
        assert_eq!(committed.status, ConceptMutationStatus::Committed);
        let current = app.load().expect("current");
        assert_eq!(current.state.index_stale, 1);
        assert_eq!(current.concepts.len(), 2);
        let review = current
            .reviews
            .iter()
            .find(|review| review.review_id == "review:one")
            .expect("approved review");
        assert_eq!(review.status, "approved");
        let created = current
            .concepts
            .iter()
            .find(|concept| concept.concept_id == review.target_concept_id)
            .expect("review target was materialized");
        assert_ne!(created.concept_id, "concept:one");
        assert_eq!(created.label, "Review concept");
        assert_eq!(created.concept_type, "method");
        assert_eq!(created.domain, "test");
        assert_eq!(created.status, "active");
        assert_eq!(created.short_definition, "A reviewed method.");
        assert_eq!(
            created.definition,
            "A method promoted through an explicit review decision."
        );
        assert_eq!(
            serde_json::from_str::<Vec<String>>(&created.aliases_json).expect("aliases"),
            vec!["Reviewed alias"]
        );
        assert_eq!(
            current
                .concepts
                .iter()
                .find(|concept| concept.concept_id == "concept:one"),
            initial.concepts.first()
        );
        assert!(current.aliases.iter().any(|alias| {
            alias.alias == "Reviewed alias" && alias.concept_id == created.concept_id
        }));
        let closed = app.review(&ConceptReviewRequest {
            expected_manifest_hash: current.state.manifest_hash.clone(),
            review_id: "review:one".into(),
            action: ConceptReviewAction::Approve,
            target_concept_id: None,
        });
        assert_eq!(
            closed.diagnostic.expect("closed diagnostic").code,
            "concept_review_item_closed"
        );
        let (page, total) = app
            .load_review_page(&ReviewPageQuery {
                status: "accepted".into(),
                kind: "all".into(),
                confidence: "all".into(),
                search: "review concept".into(),
                limit: 10,
                ..ReviewPageQuery::default()
            })
            .expect("review page");
        assert_eq!(total, 1);
        assert_eq!(page.reviews[0].status, "approved");
        assert_eq!(app.load().expect("after closed replay"), current);
        drop(app);
        drop(owner);
        let reopened_owner = Arc::new(Mutex::new(
            Repository::open(
                &root,
                RepositoryIdentity {
                    profile_id: "profile".into(),
                    data_root_id: "data".into(),
                },
            )
            .expect("reopen repository"),
        ));
        let reopened = ConceptKbApplication::with_clock(
            Arc::new(RepositoryPort::new(reopened_owner)),
            Arc::new(Compute {
                query_started: Mutex::new(None),
            }),
            Arc::new(|| "reopened".into()),
        );
        assert_eq!(reopened.load().expect("reopened approved facts"), current);
    }

    #[test]
    fn alias_review_preserves_or_removes_owned_facts_and_survives_reopen() {
        for (action, status, removed) in [
            ("keep_alias", "approved", false),
            ("remove_alias", "rejected", true),
        ] {
            let root = root();
            let open = || {
                ConceptKbApplication::with_clock(
                    Arc::new(RepositoryPort::new(Arc::new(Mutex::new(
                        Repository::open(
                            &root,
                            RepositoryIdentity {
                                profile_id: "profile".into(),
                                data_root_id: "data".into(),
                            },
                        )
                        .expect("repository"),
                    )))),
                    Arc::new(Compute {
                        query_started: Mutex::new(None),
                    }),
                    Arc::new(|| "reviewed".into()),
                )
            };
            let app = open();
            let mut initial = snapshot("concept:alias-review");
            initial.concepts[0].aliases_json = r#"["Shared alias","Unrelated alias"]"#.into();
            initial.concepts[0].sense_ids_json = r#"["sense:one","sense:two"]"#.into();
            let mut other = initial.concepts[0].clone();
            other.concept_id = "concept:other".into();
            other.sense_ids_json = r#"["sense:other"]"#.into();
            initial.concepts.push(other);
            for (sense_id, concept_id) in [
                ("sense:one", "concept:one"),
                ("sense:two", "concept:one"),
                ("sense:other", "concept:other"),
            ] {
                initial.senses.push(ConceptSenseRecord {
                    sense_id: sense_id.into(),
                    concept_id: concept_id.into(),
                    label: sense_id.into(),
                    aliases_json: r#"["Shared alias","Unrelated alias"]"#.into(),
                    ..ConceptSenseRecord::default()
                });
            }
            for (alias_id, alias, concept_id, sense_id) in [
                ("alias:shared", "Shared alias", "concept:one", "sense:one"),
                (
                    "alias:unrelated",
                    "Unrelated alias",
                    "concept:one",
                    "sense:two",
                ),
                (
                    "alias:other",
                    "Shared alias",
                    "concept:other",
                    "sense:other",
                ),
            ] {
                initial.aliases.push(ConceptAliasRecord {
                    alias_id: alias_id.into(),
                    alias: alias.into(),
                    normalized: alias.to_lowercase(),
                    concept_id: concept_id.into(),
                    sense_id: sense_id.into(),
                    status: "active".into(),
                    ..ConceptAliasRecord::default()
                });
            }
            // Historical audit records persist the exact target inside proposal_json.
            initial.reviews.push(ConceptReviewItemRecord {
                review_id: "review:alias".into(),
                status: "open".into(),
                reason: "alias_conflict".into(),
                topic_id: "concept:one".into(),
                label: "Shared alias".into(),
                proposal_json: json!({
                    "label": "Shared alias", "aliases": [],
                    "concept_type": "alias_audit", "domain": "test",
                    "short_definition": "Alias of One.",
                    "definition": "Review alias ownership for concept:one.",
                    "evidence": [], "relations": [], "merge_hints": [],
                    "confidence": "medium",
                    "audit_alias": {
                        "alias_id": "alias:shared", "alias": "Shared alias",
                        "normalized": "shared alias", "concept_id": "concept:one",
                        "sense_id": "sense:one"
                    }
                })
                .to_string(),
                ..ConceptReviewItemRecord::default()
            });
            for (review_id, mutation) in [
                ("review:ordinary", "ordinary"),
                ("review:wrong-owner", "owner"),
                ("review:wrong-alias", "alias"),
                ("review:missing-alias", "missing"),
                ("review:malformed", "malformed"),
            ] {
                let mut review = initial.reviews[0].clone();
                review.review_id = review_id.into();
                let mut payload: Value = serde_json::from_str(&review.proposal_json).unwrap();
                match mutation {
                    "ordinary" => {
                        payload.as_object_mut().unwrap().remove("audit_alias");
                        review.reason = "low_confidence_concept".into();
                    }
                    "owner" => payload["audit_alias"]["concept_id"] = json!("concept:other"),
                    "missing" => payload["audit_alias"]["alias_id"] = json!("alias:missing"),
                    "malformed" => payload["audit_alias"] = json!({"alias_id": "alias:shared"}),
                    _ => payload["audit_alias"]["alias_id"] = json!("alias:unrelated"),
                }
                review.proposal_json = payload.to_string();
                initial.reviews.push(review);
            }
            assert_eq!(
                app.replace_snapshot(None, &initial).status,
                ConceptMutationStatus::Committed
            );
            let before = app.load().expect("persisted fixture");
            for (review_id, expected_status, code) in [
                (
                    "review:missing-alias",
                    ConceptMutationStatus::RepairRequired,
                    "concept_review_alias_target_mismatch",
                ),
                (
                    "review:malformed",
                    ConceptMutationStatus::RepairRequired,
                    "concept_review_payload_invalid",
                ),
                (
                    "review:ordinary",
                    ConceptMutationStatus::InvalidRequest,
                    "concept_review_action_invalid",
                ),
                (
                    "review:wrong-owner",
                    ConceptMutationStatus::RepairRequired,
                    "concept_review_alias_target_mismatch",
                ),
                (
                    "review:wrong-alias",
                    ConceptMutationStatus::RepairRequired,
                    "concept_review_alias_target_mismatch",
                ),
            ] {
                let request: ConceptReviewRequest = serde_json::from_value(json!({
                    "expectedManifestHash": before.state.manifest_hash,
                    "reviewId": review_id, "action": action
                }))
                .expect("alias action");
                let result = app.review(&request);
                assert_eq!(result.status, expected_status);
                assert_eq!(result.diagnostic.expect("guard diagnostic").code, code);
                assert_eq!(app.load().expect("guard preserves facts"), before);
            }
            let invalid = app.review(&ConceptReviewRequest {
                expected_manifest_hash: before.state.manifest_hash.clone(),
                review_id: "review:alias".into(),
                action: ConceptReviewAction::Approve,
                target_concept_id: None,
            });
            assert_eq!(invalid.status, ConceptMutationStatus::InvalidRequest);
            assert_eq!(app.load().expect("invalid action facts"), before);
            let request: ConceptReviewRequest = serde_json::from_value(json!({
                "expectedManifestHash": before.state.manifest_hash,
                "reviewId": "review:alias", "action": action
            }))
            .expect("alias review action");
            assert_eq!(
                app.review(&request).status,
                ConceptMutationStatus::Committed
            );
            let after = app.load().expect("resolved alias facts");
            assert_eq!(after.reviews[0].status, status);
            assert_eq!(after.reviews[0].target_concept_id, "concept:one");
            assert_eq!(after.reviews[0].resolved_at, "reviewed");
            let mut expected = before.clone();
            if removed {
                expected
                    .aliases
                    .retain(|alias| alias.alias_id != "alias:shared");
                expected.concepts[0].aliases_json = r#"["Unrelated alias"]"#.into();
                expected.concepts[0].updated_at = "reviewed".into();
                for sense in &mut expected.senses {
                    if sense.concept_id == "concept:one" {
                        sense.aliases_json = r#"["Unrelated alias"]"#.into();
                        sense.updated_at = "reviewed".into();
                    }
                }
            }
            assert_eq!(after.aliases, expected.aliases);
            assert_eq!(after.concepts, expected.concepts);
            assert_eq!(after.senses, expected.senses);
            assert_eq!(after.relations, before.relations);
            assert_eq!(after.topic_links, before.topic_links);
            let closed = app.review(&ConceptReviewRequest {
                expected_manifest_hash: after.state.manifest_hash.clone(),
                ..request
            });
            assert_eq!(closed.status, ConceptMutationStatus::ReviewItemClosed);
            assert_eq!(app.load().expect("closed replay facts"), after);
            drop(app);
            let reopened = open();
            assert_eq!(reopened.load().expect("reopened alias facts"), after);
        }
    }

    #[test]
    fn decodes_historical_local_id_proposal() {
        let proposal = decode_stored_concept_proposal(
            r#"{
                "local_id":"concept:historical",
                "label":"Historical concept",
                "aliases":[],
                "concept_type":"method",
                "domain":"test",
                "short_definition":"short",
                "definition":"definition",
                "confidence":"medium",
                "evidence":[],
                "relations":[],
                "merge_hints":[]
            }"#,
        );
        assert_eq!(
            proposal.expect("historical proposal").local_id.as_deref(),
            Some("concept:historical")
        );
    }
}
