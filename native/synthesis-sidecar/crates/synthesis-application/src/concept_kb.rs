use crate::admission::{AdmissionError, SingleFlightAdmission};
use crate::ports::ConceptKbRepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{BTreeMap, HashSet};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    ConceptAliasRecord, ConceptKbReplacement, ConceptRecord, ConceptRelationRecord,
    ConceptReviewItemRecord, ConceptSenseRecord, TopicConceptLinkRecord,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConceptMutationStatus {
    Committed,
    Unchanged,
    NotFound,
    BasisMismatch,
    ConceptKbBusy,
    InvalidRequest,
    WorkerFailed,
    Stopping,
    RepairRequired,
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
        index_json: &str,
        request: &Value,
        canceled: &Arc<AtomicBool>,
    ) -> Result<Value, String>;
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

    pub fn review(&self, request: &ConceptReviewRequest) -> ConceptMutationResult {
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
        let Some(index) = snapshot
            .reviews
            .iter()
            .position(|review| review.review_id == request.review_id && review.status == "open")
        else {
            return self.result(ConceptMutationStatus::NotFound, Vec::new(), Vec::new());
        };
        let proposal =
            match serde_json::from_str::<ConceptProposal>(&snapshot.reviews[index].proposal_json) {
                Ok(proposal) => proposal,
                Err(_) => {
                    return self.result(
                        ConceptMutationStatus::RepairRequired,
                        Vec::new(),
                        Vec::new(),
                    );
                }
            };
        let now = (self.now)();
        let mut changed = Vec::new();
        let status = match request.action {
            ConceptReviewAction::Reject => "rejected",
            ConceptReviewAction::Approve => {
                let topic_id = snapshot.reviews[index].topic_id.clone();
                let concept_id =
                    merge_concept_proposal(&mut snapshot, &proposal, &topic_id, None, &now);
                snapshot.reviews[index].target_concept_id = concept_id.clone();
                changed.push(concept_id);
                "approved"
            }
            ConceptReviewAction::Merge => {
                let Some(target) = request.target_concept_id.as_deref() else {
                    return self.result(
                        ConceptMutationStatus::InvalidRequest,
                        Vec::new(),
                        Vec::new(),
                    );
                };
                if !snapshot
                    .concepts
                    .iter()
                    .any(|concept| concept.concept_id == target)
                {
                    return self.result(ConceptMutationStatus::NotFound, Vec::new(), Vec::new());
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
        if set_concept_manifest(&mut snapshot).is_err() {
            return self.result(
                ConceptMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
            );
        }
        self.apply_replacement(Some(&request.expected_manifest_hash), &snapshot)
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
            .filter(|state| state.index_stale == 0 && !state.index_json.is_empty())
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
        let state = self
            .repository
            .get_state()?
            .filter(|state| state.index_stale == 0)
            .ok_or_else(|| "concept_kb_index_stale".to_owned())?;
        self.compute
            .query(&state.index_json, request, &lease.canceled)
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
        }
    }
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
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::RepositoryPort;
    use std::path::PathBuf;
    use std::sync::mpsc;
    use std::thread;
    use synthesis_repository::{
        ConceptApplicationStateRecord, ConceptRecord, Repository, RepositoryIdentity,
    };

    struct Compute {
        query_started: Mutex<Option<mpsc::Sender<()>>>,
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
            _index_json: &str,
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

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-concept-application-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
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
        let _ = std::fs::remove_dir_all(root);
    }
}
