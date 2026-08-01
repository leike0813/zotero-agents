use crate::admission::{AdmissionError, SingleFlightAdmission};
use crate::ports::TopicGraphRepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
#[cfg(test)]
use std::time::{SystemTime, UNIX_EPOCH};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    TopicGraphEdgeRecord, TopicGraphReplacement, TopicGraphReviewItemRecord,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TopicGraphMutationStatus {
    Committed,
    Unchanged,
    NotFound,
    BasisMismatch,
    TopicGraphBusy,
    InvalidRequest,
    WorkerFailed,
    Stopping,
    RepairRequired,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphMutationResult {
    pub status: TopicGraphMutationStatus,
    pub manifest_hash: Option<String>,
    pub revision: i64,
    pub changed_node_ids: Vec<String>,
    pub changed_edge_ids: Vec<String>,
    pub review_ids: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphInspectResult {
    pub manifest_hash: Option<String>,
    pub revision: i64,
    pub index_hash: Option<String>,
    pub index_basis_hash: Option<String>,
    pub index_stale: bool,
    pub node_count: usize,
    pub edge_count: usize,
    pub review_count: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopicGraphIndexOutput {
    pub index_hash: String,
    pub index_json: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TopicGraphProposalKind {
    TargetIsBroaderTopicCandidate,
    TargetIsNarrowerTopicCandidate,
    OverlapTopicCandidate,
    ContrastTopicCandidate,
    RelatedTopicCandidate,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphProposal {
    #[serde(rename = "type")]
    pub proposal_type: TopicGraphProposalKind,
    pub target_topic_id: String,
    pub target_title: Option<String>,
    pub confidence: Option<f64>,
    #[serde(default)]
    pub provenance: Vec<Value>,
    #[serde(default)]
    pub evidence_refs: Vec<Value>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphIngestRequest {
    pub expected_manifest_hash: String,
    pub source_topic_id: String,
    pub proposals: Vec<TopicGraphProposal>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TopicGraphRelationStatus {
    Confirmed,
    Rejected,
}

impl TopicGraphRelationStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Confirmed => "confirmed",
            Self::Rejected => "rejected",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphRelationDecisionRequest {
    pub expected_manifest_hash: String,
    pub edge_id: String,
    pub status: TopicGraphRelationStatus,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TopicGraphReviewAction {
    ApproveSuggested,
    Reject,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphReviewRequest {
    pub expected_manifest_hash: String,
    pub review_id: String,
    pub action: TopicGraphReviewAction,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphMarkDeletedRequest {
    pub expected_manifest_hash: String,
    pub topic_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphPurgeRequest {
    pub expected_manifest_hash: String,
    pub topic_ids: Vec<String>,
}

pub trait TopicGraphComputePort: Send + Sync {
    fn build_index(
        &self,
        snapshot: &TopicGraphReplacement,
        canceled: &Arc<AtomicBool>,
    ) -> Result<TopicGraphIndexOutput, String>;
}

type Clock = Arc<dyn Fn() -> String + Send + Sync>;

pub struct TopicGraphApplication {
    repository: Arc<dyn TopicGraphRepositoryPort>,
    compute: Arc<dyn TopicGraphComputePort>,
    now: Clock,
    admission: SingleFlightAdmission,
}

impl TopicGraphApplication {
    pub fn new(
        repository: Arc<dyn TopicGraphRepositoryPort>,
        compute: Arc<dyn TopicGraphComputePort>,
    ) -> Self {
        Self::with_clock(repository, compute, Arc::new(default_now))
    }

    pub fn with_clock(
        repository: Arc<dyn TopicGraphRepositoryPort>,
        compute: Arc<dyn TopicGraphComputePort>,
        now: Clock,
    ) -> Self {
        Self {
            repository,
            compute,
            now,
            admission: SingleFlightAdmission::new(),
        }
    }

    pub fn inspect(&self) -> Result<TopicGraphInspectResult, String> {
        let snapshot = self.repository.load()?;
        let state = self.repository.get_state()?;
        Ok(TopicGraphInspectResult {
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
            node_count: snapshot.nodes.len(),
            edge_count: snapshot.edges.len(),
            review_count: snapshot.reviews.len(),
        })
    }

    pub fn load(&self) -> Result<TopicGraphReplacement, String> {
        self.repository.load()
    }

    pub fn replace_snapshot(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
    ) -> TopicGraphMutationResult {
        self.apply_replacement(expected_manifest_hash, replacement)
    }

    pub fn upsert(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
    ) -> TopicGraphMutationResult {
        self.apply_replacement(expected_manifest_hash, replacement)
    }

    pub fn upsert_materialized_topic(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
    ) -> TopicGraphMutationResult {
        self.apply_replacement(expected_manifest_hash, replacement)
    }

    pub fn ingest_proposals(&self, request: &TopicGraphIngestRequest) -> TopicGraphMutationResult {
        if request.source_topic_id.trim().is_empty()
            || request.proposals.is_empty()
            || request.proposals.len() > 100
        {
            return self.result(
                TopicGraphMutationStatus::InvalidRequest,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        let mut snapshot = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return self.result(
                    TopicGraphMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if snapshot.state.manifest_hash != request.expected_manifest_hash {
            return self.result(
                TopicGraphMutationStatus::BasisMismatch,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        let node_ids = snapshot
            .nodes
            .iter()
            .map(|node| node.topic_id.clone())
            .collect::<HashSet<_>>();
        let now = (self.now)();
        let mut changed_edges = Vec::new();
        let mut reviews = Vec::new();
        for proposal in &request.proposals {
            if proposal.target_topic_id == request.source_topic_id
                || !node_ids.contains(&proposal.target_topic_id)
            {
                continue;
            }
            let (source_topic_id, target_topic_id, relation) =
                topic_graph_tuple(&request.source_topic_id, proposal);
            let edge_id = topic_graph_edge_id(&source_topic_id, &target_topic_id, relation);
            if snapshot.edges.iter().any(|edge| {
                edge.edge_id == edge_id && matches!(edge.status.as_str(), "confirmed" | "rejected")
            }) {
                continue;
            }
            if proposal
                .confidence
                .is_some_and(|confidence| confidence < 0.5)
            {
                let review_id = topic_graph_review_id(&source_topic_id, &target_topic_id, relation);
                if let Some(review) = snapshot
                    .reviews
                    .iter_mut()
                    .find(|review| review.review_id == review_id)
                {
                    if review.status == "open" {
                        review.updated_at = now.clone();
                        reviews.push(review_id);
                    }
                } else {
                    snapshot.reviews.push(TopicGraphReviewItemRecord {
                        review_id: review_id.clone(),
                        status: "open".into(),
                        source_topic_id,
                        target_topic_id,
                        target_title: proposal.target_title.clone().unwrap_or_default(),
                        relation: relation.into(),
                        confidence: proposal.confidence,
                        provenance_json: serde_json::to_string(&proposal.provenance)
                            .unwrap_or_else(|_| "[]".into()),
                        evidence_refs_json: serde_json::to_string(&proposal.evidence_refs)
                            .unwrap_or_else(|_| "[]".into()),
                        created_at: now.clone(),
                        updated_at: now.clone(),
                        ..TopicGraphReviewItemRecord::default()
                    });
                    reviews.push(review_id);
                }
                continue;
            }
            let edge = TopicGraphEdgeRecord {
                edge_id: edge_id.clone(),
                source_topic_id,
                target_topic_id,
                relation: relation.into(),
                status: "suggested".into(),
                confidence: proposal.confidence,
                provenance_json: serde_json::to_string(&proposal.provenance)
                    .unwrap_or_else(|_| "[]".into()),
                evidence_refs_json: serde_json::to_string(&proposal.evidence_refs)
                    .unwrap_or_else(|_| "[]".into()),
                created_at: snapshot
                    .edges
                    .iter()
                    .find(|existing| existing.edge_id == edge_id)
                    .map(|existing| existing.created_at.clone())
                    .unwrap_or_else(|| now.clone()),
                updated_at: now.clone(),
            };
            let previous = snapshot.edges.clone();
            snapshot
                .edges
                .retain(|existing| existing.edge_id != edge_id);
            snapshot.edges.push(edge);
            if relation == "broader_than" && has_broader_cycle(&snapshot) {
                snapshot.edges = previous;
                continue;
            }
            changed_edges.push(edge_id);
        }
        if changed_edges.is_empty() && reviews.is_empty() {
            return self.result(
                TopicGraphMutationStatus::Unchanged,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        if set_topic_graph_manifest(&mut snapshot).is_err() {
            return self.result(
                TopicGraphMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        self.apply_replacement(Some(&request.expected_manifest_hash), &snapshot)
    }

    pub fn decide_relation(
        &self,
        request: &TopicGraphRelationDecisionRequest,
    ) -> TopicGraphMutationResult {
        let mut snapshot = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return self.result(
                    TopicGraphMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if snapshot.state.manifest_hash != request.expected_manifest_hash {
            return self.result(
                TopicGraphMutationStatus::BasisMismatch,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        let Some(edge) = snapshot
            .edges
            .iter_mut()
            .find(|edge| edge.edge_id == request.edge_id && edge.status == "suggested")
        else {
            return self.result(
                TopicGraphMutationStatus::NotFound,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        };
        edge.status = request.status.as_str().into();
        edge.updated_at = (self.now)();
        if set_topic_graph_manifest(&mut snapshot).is_err() {
            return self.result(
                TopicGraphMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        self.apply_replacement(Some(&request.expected_manifest_hash), &snapshot)
    }

    pub fn review(&self, request: &TopicGraphReviewRequest) -> TopicGraphMutationResult {
        let mut snapshot = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return self.result(
                    TopicGraphMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if snapshot.state.manifest_hash != request.expected_manifest_hash {
            return self.result(
                TopicGraphMutationStatus::BasisMismatch,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        let Some(index) = snapshot
            .reviews
            .iter()
            .position(|review| review.review_id == request.review_id && review.status == "open")
        else {
            return self.result(
                TopicGraphMutationStatus::NotFound,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        };
        let now = (self.now)();
        if request.action == TopicGraphReviewAction::ApproveSuggested {
            let review = &snapshot.reviews[index];
            let edge_id = topic_graph_edge_id(
                &review.source_topic_id,
                &review.target_topic_id,
                &review.relation,
            );
            if snapshot.edges.iter().any(|edge| {
                edge.edge_id == edge_id && matches!(edge.status.as_str(), "confirmed" | "rejected")
            }) {
                return self.result(
                    TopicGraphMutationStatus::Unchanged,
                    Vec::new(),
                    Vec::new(),
                    Vec::new(),
                );
            }
            let review = snapshot.reviews[index].clone();
            snapshot.edges.retain(|edge| edge.edge_id != edge_id);
            snapshot.edges.push(TopicGraphEdgeRecord {
                edge_id,
                source_topic_id: review.source_topic_id,
                target_topic_id: review.target_topic_id,
                relation: review.relation,
                status: "suggested".into(),
                confidence: review.confidence,
                provenance_json: review.provenance_json,
                evidence_refs_json: review.evidence_refs_json,
                created_at: now.clone(),
                updated_at: now.clone(),
            });
            snapshot.reviews[index].status = "approved".into();
        } else {
            snapshot.reviews[index].status = "rejected".into();
        }
        snapshot.reviews[index].updated_at = now.clone();
        snapshot.reviews[index].resolved_at = now;
        if set_topic_graph_manifest(&mut snapshot).is_err() {
            return self.result(
                TopicGraphMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        self.apply_replacement(Some(&request.expected_manifest_hash), &snapshot)
    }

    pub fn mark_topic_relations_deleted(
        &self,
        request: &TopicGraphMarkDeletedRequest,
    ) -> TopicGraphMutationResult {
        let mut snapshot = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return self.result(
                    TopicGraphMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if snapshot.state.manifest_hash != request.expected_manifest_hash {
            return self.result(
                TopicGraphMutationStatus::BasisMismatch,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        let now = (self.now)();
        let mut changed = false;
        for edge in &mut snapshot.edges {
            if edge.source_topic_id == request.topic_id || edge.target_topic_id == request.topic_id
            {
                changed |= edge.status != "deleted";
                edge.status = "deleted".into();
                edge.updated_at = now.clone();
            }
        }
        for review in &mut snapshot.reviews {
            if review.source_topic_id == request.topic_id
                || review.target_topic_id == request.topic_id
            {
                changed |= review.status != "deleted";
                review.status = "deleted".into();
                review.updated_at = now.clone();
                if review.resolved_at.is_empty() {
                    review.resolved_at = now.clone();
                }
            }
        }
        if !changed {
            return self.result(
                TopicGraphMutationStatus::Unchanged,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        if set_topic_graph_manifest(&mut snapshot).is_err() {
            return self.result(
                TopicGraphMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        self.apply_replacement(Some(&request.expected_manifest_hash), &snapshot)
    }

    pub fn purge_deleted(&self, request: &TopicGraphPurgeRequest) -> TopicGraphMutationResult {
        let mut snapshot = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return self.result(
                    TopicGraphMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if snapshot.state.manifest_hash != request.expected_manifest_hash {
            return self.result(
                TopicGraphMutationStatus::BasisMismatch,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        let topic_ids = request.topic_ids.iter().collect::<HashSet<_>>();
        let before = (
            snapshot.nodes.len(),
            snapshot.edges.len(),
            snapshot.reviews.len(),
        );
        snapshot.nodes.retain(|node| {
            !topic_ids.contains(&node.topic_id) || node.definition_status != "deleted"
        });
        snapshot.edges.retain(|edge| {
            !topic_ids.contains(&edge.source_topic_id) && !topic_ids.contains(&edge.target_topic_id)
        });
        snapshot.reviews.retain(|review| {
            !topic_ids.contains(&review.source_topic_id)
                && !topic_ids.contains(&review.target_topic_id)
        });
        if before
            == (
                snapshot.nodes.len(),
                snapshot.edges.len(),
                snapshot.reviews.len(),
            )
        {
            return self.result(
                TopicGraphMutationStatus::Unchanged,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        if set_topic_graph_manifest(&mut snapshot).is_err() {
            return self.result(
                TopicGraphMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        self.apply_replacement(Some(&request.expected_manifest_hash), &snapshot)
    }

    pub fn purge_deleted_topic_relations(
        &self,
        request: &TopicGraphPurgeRequest,
    ) -> TopicGraphMutationResult {
        self.purge_deleted(request)
    }

    pub fn rebuild_index(&self, expected_manifest_hash: &str) -> TopicGraphMutationResult {
        let lease = match self.admission.admit() {
            Ok(lease) => lease,
            Err(error) => {
                return self.result(map_admission(error), Vec::new(), Vec::new(), Vec::new());
            }
        };
        let snapshot = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return self.result(
                    TopicGraphMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if snapshot.state.manifest_hash != expected_manifest_hash {
            return self.result(
                TopicGraphMutationStatus::BasisMismatch,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        let output = match self.compute.build_index(&snapshot, lease.canceled()) {
            Ok(output) => output,
            Err(error) => {
                return self.result(worker_status(&error), Vec::new(), Vec::new(), Vec::new());
            }
        };
        if lease.canceled().load(Ordering::Relaxed) {
            return self.result(
                TopicGraphMutationStatus::Stopping,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        match self.repository.promote_index_with_receipt(
            expected_manifest_hash,
            &output.index_hash,
            &output.index_json,
            &(self.now)(),
            None,
        ) {
            Ok(true) => self.result(
                TopicGraphMutationStatus::Committed,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            ),
            Ok(false) => self.result(
                TopicGraphMutationStatus::BasisMismatch,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            ),
            Err(_) => self.result(
                TopicGraphMutationStatus::RepairRequired,
                Vec::new(),
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
                    .map_err(|_| "topic_graph_index_invalid".to_owned())
            })
            .transpose()
    }

    pub fn stop_admission(&self) {
        self.admission.stop();
    }

    pub fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.admission.shutdown(timeout, "topic_graph")
    }

    fn apply_replacement(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
    ) -> TopicGraphMutationResult {
        if validate_snapshot(replacement).is_err() {
            return self.result(
                TopicGraphMutationStatus::InvalidRequest,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        let lease = match self.admission.admit() {
            Ok(lease) => lease,
            Err(error) => {
                return self.result(map_admission(error), Vec::new(), Vec::new(), Vec::new());
            }
        };
        let current = match self.repository.get_state() {
            Ok(current) => current,
            Err(_) => {
                return self.result(
                    TopicGraphMutationStatus::RepairRequired,
                    Vec::new(),
                    Vec::new(),
                    Vec::new(),
                );
            }
        };
        if current.as_ref().map(|state| state.manifest_hash.as_str()) != expected_manifest_hash {
            return self.result(
                TopicGraphMutationStatus::BasisMismatch,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        if current
            .as_ref()
            .is_some_and(|state| state.manifest_hash == replacement.state.manifest_hash)
        {
            return self.result(
                TopicGraphMutationStatus::Unchanged,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        if lease.canceled().load(Ordering::Relaxed) {
            return self.result(
                TopicGraphMutationStatus::Stopping,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        let mut replacement = replacement.clone();
        replacement.state.singleton_id = 1;
        replacement.state.revision = current.as_ref().map_or(1, |state| state.revision + 1);
        replacement.state.index_stale = 1;
        replacement.state.updated_at = (self.now)();
        let nodes = replacement
            .nodes
            .iter()
            .map(|node| node.topic_id.clone())
            .collect();
        let edges = replacement
            .edges
            .iter()
            .map(|edge| edge.edge_id.clone())
            .collect();
        let reviews = replacement
            .reviews
            .iter()
            .map(|review| review.review_id.clone())
            .collect();
        match self
            .repository
            .replace_with_receipt(expected_manifest_hash, &replacement, None)
        {
            Ok(true) => self.result(TopicGraphMutationStatus::Committed, nodes, edges, reviews),
            Ok(false) => self.result(
                TopicGraphMutationStatus::BasisMismatch,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            ),
            Err(_) => self.result(
                TopicGraphMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            ),
        }
    }

    fn result(
        &self,
        status: TopicGraphMutationStatus,
        mut changed_node_ids: Vec<String>,
        mut changed_edge_ids: Vec<String>,
        mut review_ids: Vec<String>,
    ) -> TopicGraphMutationResult {
        changed_node_ids.sort();
        changed_node_ids.dedup();
        changed_edge_ids.sort();
        changed_edge_ids.dedup();
        review_ids.sort();
        review_ids.dedup();
        let state = self.repository.get_state().ok().flatten();
        TopicGraphMutationResult {
            status,
            manifest_hash: state.as_ref().map(|state| state.manifest_hash.clone()),
            revision: state.as_ref().map_or(0, |state| state.revision),
            changed_node_ids,
            changed_edge_ids,
            review_ids,
            warnings: Vec::new(),
        }
    }
}

fn safe_topic_graph_id(value: &str) -> String {
    let mut safe = String::with_capacity(value.len());
    let mut separator = false;
    for character in value.trim().chars() {
        if character.is_ascii_alphanumeric() || matches!(character, '_' | '.' | '-') {
            safe.push(character);
            separator = false;
        } else if !separator && !safe.is_empty() {
            safe.push('_');
            separator = true;
        }
    }
    while safe.ends_with('_') {
        safe.pop();
    }
    if safe.is_empty() {
        "topic".into()
    } else {
        safe
    }
}

fn topic_graph_tuple(
    source_topic_id: &str,
    proposal: &TopicGraphProposal,
) -> (String, String, &'static str) {
    let relation = match proposal.proposal_type {
        TopicGraphProposalKind::TargetIsBroaderTopicCandidate
        | TopicGraphProposalKind::TargetIsNarrowerTopicCandidate => "broader_than",
        TopicGraphProposalKind::OverlapTopicCandidate => "overlaps_with",
        TopicGraphProposalKind::ContrastTopicCandidate => "contrasts_with",
        TopicGraphProposalKind::RelatedTopicCandidate => "related_to",
    };
    let (mut source, mut target) =
        if proposal.proposal_type == TopicGraphProposalKind::TargetIsBroaderTopicCandidate {
            (proposal.target_topic_id.clone(), source_topic_id.into())
        } else {
            (source_topic_id.into(), proposal.target_topic_id.clone())
        };
    if relation != "broader_than" && target < source {
        std::mem::swap(&mut source, &mut target);
    }
    (source, target, relation)
}

fn topic_graph_edge_id(source: &str, target: &str, relation: &str) -> String {
    format!(
        "edge:{}:{}:{}",
        relation,
        safe_topic_graph_id(source),
        safe_topic_graph_id(target)
    )
}

fn topic_graph_review_id(source: &str, target: &str, relation: &str) -> String {
    format!(
        "review:{}:{}:{}",
        safe_topic_graph_id(relation),
        safe_topic_graph_id(source),
        safe_topic_graph_id(target)
    )
}

fn set_topic_graph_manifest(snapshot: &mut TopicGraphReplacement) -> Result<(), String> {
    snapshot.state.manifest_hash = canonical_json_hash(&json!({
        "nodes": &snapshot.nodes,
        "edges": &snapshot.edges,
        "reviews": &snapshot.reviews,
    }))?;
    Ok(())
}

fn validate_snapshot(snapshot: &TopicGraphReplacement) -> Result<(), String> {
    let nodes = snapshot
        .nodes
        .iter()
        .map(|node| &node.topic_id)
        .collect::<HashSet<_>>();
    if snapshot.state.manifest_hash.is_empty()
        || snapshot.nodes.len() > 100_000
        || nodes.len() != snapshot.nodes.len()
        || snapshot
            .nodes
            .iter()
            .any(|node| node.topic_id.is_empty() || node.title.is_empty())
        || snapshot.edges.iter().any(|edge| {
            edge.edge_id.is_empty()
                || edge.source_topic_id == edge.target_topic_id
                || !nodes.contains(&edge.source_topic_id)
                || !nodes.contains(&edge.target_topic_id)
        })
        || has_broader_cycle(snapshot)
    {
        Err("invalid_request".into())
    } else {
        Ok(())
    }
}

fn has_broader_cycle(snapshot: &TopicGraphReplacement) -> bool {
    let mut adjacent = HashMap::<&str, Vec<&str>>::new();
    for edge in snapshot.edges.iter().filter(|edge| {
        edge.relation == "broader_than"
            && !matches!(edge.status.as_str(), "rejected" | "deleted" | "purged")
    }) {
        adjacent
            .entry(&edge.source_topic_id)
            .or_default()
            .push(&edge.target_topic_id);
    }
    let mut visited = HashSet::new();
    let mut active = HashSet::new();
    snapshot
        .nodes
        .iter()
        .any(|node| cycle_visit(&node.topic_id, &adjacent, &mut visited, &mut active))
}

fn cycle_visit<'a>(
    node: &'a str,
    adjacent: &HashMap<&'a str, Vec<&'a str>>,
    visited: &mut HashSet<&'a str>,
    active: &mut HashSet<&'a str>,
) -> bool {
    if active.contains(node) {
        return true;
    }
    if !visited.insert(node) {
        return false;
    }
    active.insert(node);
    if adjacent.get(node).is_some_and(|targets| {
        targets
            .iter()
            .any(|target| cycle_visit(target, adjacent, visited, active))
    }) {
        return true;
    }
    active.remove(node);
    false
}

fn map_admission(error: AdmissionError) -> TopicGraphMutationStatus {
    match error {
        AdmissionError::Busy => TopicGraphMutationStatus::TopicGraphBusy,
        AdmissionError::Stopping => TopicGraphMutationStatus::Stopping,
        AdmissionError::Unavailable => TopicGraphMutationStatus::RepairRequired,
    }
}

fn worker_status(error: &str) -> TopicGraphMutationStatus {
    if error.contains("stopping") || error.contains("canceled") {
        TopicGraphMutationStatus::Stopping
    } else {
        TopicGraphMutationStatus::WorkerFailed
    }
}

fn default_now() -> String {
    synthesis_protocol::utc_now_iso8601()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::RepositoryPort;
    use std::path::PathBuf;
    use std::sync::Mutex;
    use synthesis_repository::{
        Repository, RepositoryIdentity, TopicGraphApplicationStateRecord, TopicGraphEdgeRecord,
        TopicGraphNodeRecord,
    };

    struct Compute;
    impl TopicGraphComputePort for Compute {
        fn build_index(
            &self,
            snapshot: &TopicGraphReplacement,
            _canceled: &Arc<AtomicBool>,
        ) -> Result<TopicGraphIndexOutput, String> {
            Ok(TopicGraphIndexOutput {
                index_hash: format!("index:{}", snapshot.nodes.len()),
                index_json: format!("{{\"count\":{}}}", snapshot.nodes.len()),
            })
        }
    }

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-topic-graph-application-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
    }

    fn snapshot(hash: &str, cycle: bool) -> TopicGraphReplacement {
        let nodes = ["one", "two"]
            .into_iter()
            .map(|id| TopicGraphNodeRecord {
                topic_id: format!("topic:{id}"),
                title: id.into(),
                aliases_json: "[]".into(),
                node_type: "topic".into(),
                created_at: "fixed".into(),
                updated_at: "fixed".into(),
                ..TopicGraphNodeRecord::default()
            })
            .collect::<Vec<_>>();
        let mut edges = vec![TopicGraphEdgeRecord {
            edge_id: "edge:one".into(),
            source_topic_id: "topic:one".into(),
            target_topic_id: "topic:two".into(),
            relation: "broader_than".into(),
            status: "accepted".into(),
            provenance_json: "[]".into(),
            evidence_refs_json: "[]".into(),
            created_at: "fixed".into(),
            updated_at: "fixed".into(),
            ..TopicGraphEdgeRecord::default()
        }];
        if cycle {
            edges.push(TopicGraphEdgeRecord {
                edge_id: "edge:two".into(),
                source_topic_id: "topic:two".into(),
                target_topic_id: "topic:one".into(),
                relation: "broader_than".into(),
                status: "accepted".into(),
                provenance_json: "[]".into(),
                evidence_refs_json: "[]".into(),
                created_at: "fixed".into(),
                updated_at: "fixed".into(),
                ..TopicGraphEdgeRecord::default()
            });
        }
        TopicGraphReplacement {
            state: TopicGraphApplicationStateRecord {
                singleton_id: 1,
                manifest_hash: hash.into(),
                index_json: "{}".into(),
                index_stale: 1,
                updated_at: "fixed".into(),
                ..TopicGraphApplicationStateRecord::default()
            },
            nodes,
            edges,
            reviews: Vec::new(),
        }
    }

    #[test]
    fn rejects_cycles_commits_index_and_stops() {
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
        let app = TopicGraphApplication::with_clock(
            Arc::new(RepositoryPort::new(Arc::clone(&owner))),
            Arc::new(Compute),
            Arc::new(|| "fixed".into()),
        );
        assert_eq!(
            app.replace_snapshot(None, &snapshot("graph:bad", true))
                .status,
            TopicGraphMutationStatus::InvalidRequest
        );
        assert_eq!(
            app.replace_snapshot(None, &snapshot("graph:1", false))
                .status,
            TopicGraphMutationStatus::Committed
        );
        assert_eq!(
            app.rebuild_index("graph:1").status,
            TopicGraphMutationStatus::Committed
        );
        app.stop_admission();
        assert_eq!(
            app.purge_deleted(&TopicGraphPurgeRequest {
                expected_manifest_hash: "graph:1".into(),
                topic_ids: vec!["topic:one".into()],
            })
            .status,
            TopicGraphMutationStatus::Stopping
        );
        app.shutdown(Duration::from_secs(1)).expect("shutdown");
        drop(app);
        drop(owner);
        let _ = std::fs::remove_dir_all(root);
    }
}
