use crate::PromotionCheckpoint;
use crate::admission::{AdmissionError, SingleFlightAdmission};
use crate::ports::TopicGraphRepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    ReviewPageQuery, TopicGraphEdgeRecord, TopicGraphNodeRecord, TopicGraphReplacement,
    TopicGraphReviewItemRecord,
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
pub struct TopicGraphDiagnostic {
    pub code: String,
    pub message: String,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub details: BTreeMap<String, String>,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub diagnostic: Option<TopicGraphDiagnostic>,
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

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopicGraphMaterializedTopic {
    pub topic_id: String,
    pub title: String,
    pub definition: String,
    pub current_artifact_path: String,
    pub paper_count: i64,
    pub synthesized_at: String,
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
    #[serde(default)]
    pub deleted_path_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphPurgeRequest {
    pub expected_manifest_hash: String,
    pub topic_ids: Vec<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicPlanScope {
    #[serde(default)]
    pub include: Vec<String>,
    #[serde(default)]
    pub exclude: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TopicPlanAction {
    pub action: String,
    pub topic_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub definition: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub scope: TopicPlanScope,
    #[serde(default)]
    pub resolver: Value,
    #[serde(default)]
    pub revision: Option<i64>,
    #[serde(default)]
    pub basis: Vec<Value>,
    #[serde(default)]
    pub provenance: Vec<Value>,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TopicPlanRelationProposal {
    pub source_topic_id: String,
    pub target_topic_id: String,
    pub relation: String,
    #[serde(default)]
    pub confidence: Option<f64>,
    #[serde(default)]
    pub provenance: Vec<Value>,
    #[serde(default)]
    pub evidence_refs: Vec<Value>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TopicPlanReconcileRequest {
    pub kind: String,
    pub operation: String,
    pub base_graph_hash: String,
    pub library_index_hash: String,
    #[serde(default)]
    pub topic_actions: Vec<TopicPlanAction>,
    #[serde(default)]
    pub relation_proposals: Vec<TopicPlanRelationProposal>,
    #[serde(default)]
    pub coverage_manifest_path: String,
    #[serde(default)]
    pub recommended_updates: Vec<String>,
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

    pub fn load_window(&self, limit: usize) -> Result<TopicGraphReplacement, String> {
        if limit == 0 || limit > 250 {
            return Err("invalid_request".into());
        }
        self.repository.load_window(limit)
    }

    pub fn load_review_page(
        &self,
        query: &ReviewPageQuery,
    ) -> Result<(TopicGraphReplacement, usize, usize), String> {
        self.repository.load_review_page(query)
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
        topic: &TopicGraphMaterializedTopic,
    ) -> TopicGraphMutationResult {
        self.reconcile_materialized_topics(std::slice::from_ref(topic))
    }

    pub fn reconcile_materialized_topics(
        &self,
        topics: &[TopicGraphMaterializedTopic],
    ) -> TopicGraphMutationResult {
        if topics.is_empty()
            || topics
                .iter()
                .any(|topic| topic.topic_id.trim().is_empty() || topic.title.trim().is_empty())
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
        let expected_manifest_hash = self
            .repository
            .get_state()
            .ok()
            .flatten()
            .map(|state| state.manifest_hash);
        let now = (self.now)();
        let mut changed = Vec::new();
        for topic in topics {
            let previous = snapshot
                .nodes
                .iter()
                .find(|node| node.topic_id == topic.topic_id)
                .cloned();
            let next = TopicGraphNodeRecord {
                topic_id: topic.topic_id.clone(),
                title: topic.title.clone(),
                definition: topic.definition.clone(),
                aliases_json: previous
                    .as_ref()
                    .map(|node| node.aliases_json.clone())
                    .unwrap_or_else(|| "[]".into()),
                node_type: "materialized".into(),
                definition_status: "has_synthesis".into(),
                current_artifact_path: topic.current_artifact_path.clone(),
                is_root: previous.as_ref().map_or(0, |node| node.is_root),
                level: previous
                    .as_ref()
                    .map(|node| node.level.clone())
                    .unwrap_or_default(),
                paper_count: topic.paper_count,
                last_synthesis_at: topic.synthesized_at.clone(),
                created_at: previous
                    .as_ref()
                    .map(|node| node.created_at.clone())
                    .filter(|value| !value.is_empty())
                    .unwrap_or_else(|| now.clone()),
                updated_at: now.clone(),
                planning_json: materialized_planning_json(previous.as_ref()),
            };
            let materially_equal = previous.as_ref().is_some_and(|node| {
                node.topic_id == next.topic_id
                    && node.title == next.title
                    && node.definition == next.definition
                    && node.aliases_json == next.aliases_json
                    && node.node_type == next.node_type
                    && node.definition_status == next.definition_status
                    && node.current_artifact_path == next.current_artifact_path
                    && node.is_root == next.is_root
                    && node.level == next.level
                    && node.paper_count == next.paper_count
                    && node.last_synthesis_at == next.last_synthesis_at
                    && node.planning_json == next.planning_json
            });
            if materially_equal {
                continue;
            }
            snapshot
                .nodes
                .retain(|node| node.topic_id != topic.topic_id);
            snapshot.nodes.push(next);
            changed.push(topic.topic_id.clone());
        }
        if changed.is_empty() {
            return self.result(
                TopicGraphMutationStatus::Unchanged,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        snapshot
            .nodes
            .sort_by(|left, right| left.topic_id.cmp(&right.topic_id));
        snapshot.state.singleton_id = 1;
        snapshot.state.index_stale = 1;
        if set_topic_graph_manifest(&mut snapshot).is_err() {
            return self.result(
                TopicGraphMutationStatus::RepairRequired,
                Vec::new(),
                Vec::new(),
                Vec::new(),
            );
        }
        self.apply_replacement(expected_manifest_hash.as_deref(), &snapshot)
    }

    pub fn reconcile_plan(
        &self,
        request: &TopicPlanReconcileRequest,
        current_library_index_hash: &str,
    ) -> Value {
        let current = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return topic_plan_result(
                    "conflict",
                    "",
                    false,
                    &request.recommended_updates,
                    vec!["topic_graph_repair_required"],
                );
            }
        };
        let coverage_stale = request.library_index_hash != current_library_index_hash;
        if request.kind != "topic_plan" || request.operation != "reconcile" {
            return topic_plan_result(
                "conflict",
                &current.state.manifest_hash,
                coverage_stale,
                &request.recommended_updates,
                vec!["invalid_topic_plan_contract"],
            );
        }
        let mut next = current.clone();
        let now = (self.now)();
        let mut diagnostics = Vec::new();
        for topic_id in &request.recommended_updates {
            if !current
                .nodes
                .iter()
                .any(|node| node.topic_id == *topic_id && node.node_type == "materialized")
            {
                diagnostics.push("recommended_update_requires_materialized_topic");
            }
        }
        for action in &request.topic_actions {
            let previous = next
                .nodes
                .iter()
                .find(|node| node.topic_id == action.topic_id)
                .cloned();
            if action.topic_id.trim().is_empty() {
                diagnostics.push("invalid_planned_topic_id");
                continue;
            }
            if ["paper_ids", "paper_refs", "papers", "members"]
                .iter()
                .any(|field| action.extra.contains_key(*field))
            {
                diagnostics.push("planned_topic_membership_forbidden");
                continue;
            }
            if previous
                .as_ref()
                .is_some_and(|node| node.node_type == "materialized")
            {
                diagnostics.push("materialized_topic_is_not_planner_writable");
                continue;
            }
            let previous_planning = previous
                .as_ref()
                .and_then(|node| serde_json::from_str::<Value>(&node.planning_json).ok())
                .filter(Value::is_object);
            let previous_revision = previous_planning
                .as_ref()
                .and_then(|value| value.get("revision"))
                .and_then(Value::as_i64)
                .unwrap_or(0);
            if action.action != "create" && previous_planning.is_none() {
                diagnostics.push("planned_topic_missing");
                continue;
            }
            if action.action != "create"
                && action
                    .revision
                    .is_some_and(|revision| revision != previous_revision)
            {
                diagnostics.push("planned_topic_revision_conflict");
                continue;
            }
            if !matches!(
                action.action.as_str(),
                "create" | "update" | "mark_stale" | "reactivate"
            ) {
                diagnostics.push("invalid_topic_plan_action");
                continue;
            }
            let definition = if action.definition.trim().is_empty() {
                previous
                    .as_ref()
                    .map(|node| node.definition.clone())
                    .unwrap_or_default()
            } else {
                action.definition.clone()
            };
            let resolver = if action.resolver.is_object() {
                action.resolver.clone()
            } else {
                previous_planning
                    .as_ref()
                    .and_then(|value| value.get("resolver"))
                    .cloned()
                    .unwrap_or_else(|| json!({}))
            };
            if definition.trim().is_empty()
                || ((action.action == "create" || action.action == "update")
                    && resolver.as_object().is_none_or(|value| value.is_empty()))
            {
                diagnostics.push("invalid_planned_topic_definition");
                continue;
            }
            let lifecycle = if action.action == "mark_stale" {
                "stale"
            } else {
                "planned"
            };
            let revision = if action.action == "create" {
                1
            } else if action.action == "update" {
                previous_revision + 1
            } else {
                previous_revision.max(1)
            };
            let planning = json!({
                "lifecycle":lifecycle,
                "scope":{"include":action.scope.include,"exclude":action.scope.exclude},
                "resolver":resolver,
                "revision":revision,
                "basis":action.basis,
                "provenance":action.provenance,
                "coverage_manifest_path":request.coverage_manifest_path,
            });
            let node = TopicGraphNodeRecord {
                topic_id: action.topic_id.clone(),
                title: if action.title.trim().is_empty() {
                    previous
                        .as_ref()
                        .map(|node| node.title.clone())
                        .unwrap_or_else(|| action.topic_id.clone())
                } else {
                    action.title.clone()
                },
                definition,
                aliases_json: if action.aliases.is_empty() {
                    previous
                        .as_ref()
                        .map(|node| node.aliases_json.clone())
                        .unwrap_or_else(|| "[]".into())
                } else {
                    serde_json::to_string(&action.aliases).unwrap_or_else(|_| "[]".into())
                },
                node_type: "placeholder".into(),
                definition_status: if lifecycle == "stale" {
                    "stale".into()
                } else {
                    "placeholder".into()
                },
                created_at: previous
                    .as_ref()
                    .map(|node| node.created_at.clone())
                    .filter(|value| !value.is_empty())
                    .unwrap_or_else(|| now.clone()),
                updated_at: now.clone(),
                planning_json: serde_json::to_string(&planning).unwrap_or_else(|_| "{}".into()),
                ..TopicGraphNodeRecord::default()
            };
            next.nodes.retain(|node| node.topic_id != action.topic_id);
            next.nodes.push(node);
        }
        let node_ids = next
            .nodes
            .iter()
            .map(|node| node.topic_id.clone())
            .collect::<HashSet<_>>();
        for proposal in &request.relation_proposals {
            if !matches!(
                proposal.relation.as_str(),
                "broader_than" | "related_to" | "overlaps_with" | "contrasts_with"
            ) || proposal.source_topic_id == proposal.target_topic_id
                || !node_ids.contains(&proposal.source_topic_id)
                || !node_ids.contains(&proposal.target_topic_id)
            {
                diagnostics.push("invalid_topic_plan_relation");
                continue;
            }
            let edge_id = topic_graph_edge_id(
                &proposal.source_topic_id,
                &proposal.target_topic_id,
                &proposal.relation,
            );
            let previous = next.edges.iter().find(|edge| edge.edge_id == edge_id);
            if previous.is_some_and(|edge| matches!(edge.status.as_str(), "confirmed" | "rejected"))
            {
                continue;
            }
            next.edges.retain(|edge| edge.edge_id != edge_id);
            next.edges.push(TopicGraphEdgeRecord {
                edge_id,
                source_topic_id: proposal.source_topic_id.clone(),
                target_topic_id: proposal.target_topic_id.clone(),
                relation: proposal.relation.clone(),
                status: "suggested".into(),
                confidence: proposal.confidence,
                provenance_json: serde_json::to_string(&proposal.provenance)
                    .unwrap_or_else(|_| "[]".into()),
                evidence_refs_json: serde_json::to_string(&proposal.evidence_refs)
                    .unwrap_or_else(|_| "[]".into()),
                created_at: now.clone(),
                updated_at: now.clone(),
            });
        }
        if !diagnostics.is_empty() || has_broader_cycle(&next) {
            if has_broader_cycle(&next) {
                diagnostics.push("broader_cycle_rejected");
            }
            return topic_plan_result(
                "conflict",
                &current.state.manifest_hash,
                coverage_stale,
                &request.recommended_updates,
                diagnostics,
            );
        }
        next.nodes
            .sort_by(|left, right| left.topic_id.cmp(&right.topic_id));
        next.edges
            .sort_by(|left, right| left.edge_id.cmp(&right.edge_id));
        next.state.singleton_id = 1;
        next.state.index_stale = 1;
        next.state.updated_at = now;
        if set_topic_graph_manifest(&mut next).is_err() {
            return topic_plan_result(
                "conflict",
                &current.state.manifest_hash,
                coverage_stale,
                &request.recommended_updates,
                vec!["topic_graph_projection_failed"],
            );
        }
        if next.state.manifest_hash == current.state.manifest_hash {
            return topic_plan_result(
                if request.base_graph_hash == current.state.manifest_hash {
                    "no_change"
                } else {
                    "already_applied"
                },
                &current.state.manifest_hash,
                coverage_stale,
                &request.recommended_updates,
                Vec::new(),
            );
        }
        if request.base_graph_hash != current.state.manifest_hash {
            return topic_plan_result(
                "conflict",
                &current.state.manifest_hash,
                coverage_stale,
                &request.recommended_updates,
                vec!["topic_graph_compare_and_swap_conflict"],
            );
        }
        let result = self.apply_replacement(Some(&current.state.manifest_hash), &next);
        topic_plan_result(
            if result.status == TopicGraphMutationStatus::Committed {
                "persisted"
            } else {
                "conflict"
            },
            result
                .manifest_hash
                .as_deref()
                .unwrap_or(&current.state.manifest_hash),
            coverage_stale,
            &request.recommended_updates,
            if result.status == TopicGraphMutationStatus::Committed {
                Vec::new()
            } else {
                vec!["topic_graph_commit_failed"]
            },
        )
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
                return self.diagnostic_result(
                    TopicGraphMutationStatus::RepairRequired,
                    "topic_graph_review_repair_required",
                    "Topic graph review state is unavailable.",
                    [("edge_id", request.edge_id.as_str())],
                );
            }
        };
        if snapshot.state.manifest_hash != request.expected_manifest_hash {
            return self.diagnostic_result(
                TopicGraphMutationStatus::BasisMismatch,
                "topic_graph_review_basis_mismatch",
                "Topic graph review state changed before the decision was applied.",
                [("edge_id", request.edge_id.as_str())],
            );
        }
        let Some(index) = snapshot
            .edges
            .iter()
            .position(|edge| edge.edge_id == request.edge_id)
        else {
            return self.diagnostic_result(
                TopicGraphMutationStatus::NotFound,
                "topic_graph_edge_missing",
                "Topic graph edge does not exist.",
                [("edge_id", request.edge_id.as_str())],
            );
        };
        if snapshot.edges[index].status != "suggested" {
            return self.diagnostic_result(
                TopicGraphMutationStatus::Unchanged,
                "topic_graph_edge_not_suggested",
                "Only suggested topic graph edges can be reviewed.",
                [
                    ("edge_id", request.edge_id.as_str()),
                    ("status", snapshot.edges[index].status.as_str()),
                ],
            );
        }
        let edge = &mut snapshot.edges[index];
        edge.status = request.status.as_str().into();
        edge.updated_at = (self.now)();
        snapshot.state.index_stale = 1;
        if set_topic_graph_manifest(&mut snapshot).is_err() {
            return self.diagnostic_result(
                TopicGraphMutationStatus::RepairRequired,
                "topic_graph_review_projection_failed",
                "Topic graph relation decision could not be finalized.",
                [("edge_id", request.edge_id.as_str())],
            );
        }
        let mut result = self.apply_replacement(Some(&request.expected_manifest_hash), &snapshot);
        if result.status != TopicGraphMutationStatus::Committed && result.diagnostic.is_none() {
            result.diagnostic = Some(TopicGraphDiagnostic {
                code: "topic_graph_review_commit_failed".into(),
                message: "Topic graph relation decision was not committed.".into(),
                details: [("edge_id".into(), request.edge_id.clone())]
                    .into_iter()
                    .collect(),
            });
        }
        result
    }

    pub fn review(&self, request: &TopicGraphReviewRequest) -> TopicGraphMutationResult {
        let mut snapshot = match self.repository.load() {
            Ok(snapshot) => snapshot,
            Err(_) => {
                return self.diagnostic_result(
                    TopicGraphMutationStatus::RepairRequired,
                    "topic_graph_review_repair_required",
                    "Topic graph review state is unavailable.",
                    [("review_id", request.review_id.as_str())],
                );
            }
        };
        if snapshot.state.manifest_hash != request.expected_manifest_hash {
            return self.diagnostic_result(
                TopicGraphMutationStatus::BasisMismatch,
                "topic_graph_review_basis_mismatch",
                "Topic graph review state changed before the decision was applied.",
                [("review_id", request.review_id.as_str())],
            );
        }
        let Some(index) = snapshot
            .reviews
            .iter()
            .position(|review| review.review_id == request.review_id)
        else {
            return self.diagnostic_result(
                TopicGraphMutationStatus::NotFound,
                "topic_graph_review_missing",
                "Topic graph review item does not exist.",
                [("review_id", request.review_id.as_str())],
            );
        };
        if snapshot.reviews[index].status != "open" {
            return self.diagnostic_result(
                TopicGraphMutationStatus::Unchanged,
                "topic_graph_review_closed",
                "Topic graph review item is already resolved.",
                [
                    ("review_id", request.review_id.as_str()),
                    ("status", snapshot.reviews[index].status.as_str()),
                ],
            );
        }
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
                return self.diagnostic_result(
                    TopicGraphMutationStatus::Unchanged,
                    "topic_graph_user_decision_preserved",
                    "An existing user relation decision is preserved.",
                    [("review_id", request.review_id.as_str())],
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
        snapshot.state.index_stale = 1;
        if set_topic_graph_manifest(&mut snapshot).is_err() {
            return self.diagnostic_result(
                TopicGraphMutationStatus::RepairRequired,
                "topic_graph_review_projection_failed",
                "Topic graph review decision could not be finalized.",
                [("review_id", request.review_id.as_str())],
            );
        }
        let mut result = self.apply_replacement(Some(&request.expected_manifest_hash), &snapshot);
        if result.status != TopicGraphMutationStatus::Committed && result.diagnostic.is_none() {
            result.diagnostic = Some(TopicGraphDiagnostic {
                code: "topic_graph_review_commit_failed".into(),
                message: "Topic graph review decision was not committed.".into(),
                details: [("review_id".into(), request.review_id.clone())]
                    .into_iter()
                    .collect(),
            });
        }
        result
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
        for node in &mut snapshot.nodes {
            if node.topic_id == request.topic_id {
                changed |= node.definition_status != "deleted";
                node.definition_status = "deleted".into();
                if !request.deleted_path_id.is_empty() {
                    node.current_artifact_path =
                        format!("deleted/{}/current/artifact.json", request.deleted_path_id);
                }
                node.updated_at = now.clone();
            }
        }
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
        if self.admission.is_stopping() {
            return self.result(
                TopicGraphMutationStatus::Stopping,
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
            edge.status != "deleted"
                || (!topic_ids.contains(&edge.source_topic_id)
                    && !topic_ids.contains(&edge.target_topic_id))
        });
        snapshot.reviews.retain(|review| {
            review.status != "deleted"
                || (!topic_ids.contains(&review.source_topic_id)
                    && !topic_ids.contains(&review.target_topic_id))
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

    pub fn mark_deleted_topic(&self, topic_id: &str, deleted_path_id: &str) -> Result<(), String> {
        let expected_manifest_hash = self
            .repository
            .get_state()?
            .map(|state| state.manifest_hash)
            .unwrap_or_default();
        match self
            .mark_topic_relations_deleted(&TopicGraphMarkDeletedRequest {
                expected_manifest_hash,
                topic_id: topic_id.into(),
                deleted_path_id: deleted_path_id.into(),
            })
            .status
        {
            TopicGraphMutationStatus::Committed | TopicGraphMutationStatus::Unchanged => Ok(()),
            _ => Err("topic_graph_update_failed".into()),
        }
    }

    pub fn purge_deleted_topics(&self, topic_ids: &[String]) -> Result<(), String> {
        let expected_manifest_hash = self
            .repository
            .get_state()?
            .map(|state| state.manifest_hash)
            .unwrap_or_default();
        match self
            .purge_deleted(&TopicGraphPurgeRequest {
                expected_manifest_hash,
                topic_ids: topic_ids.to_vec(),
            })
            .status
        {
            TopicGraphMutationStatus::Committed | TopicGraphMutationStatus::Unchanged => Ok(()),
            _ => Err("topic_graph_update_failed".into()),
        }
    }

    pub fn rebuild_index(&self, expected_manifest_hash: &str) -> TopicGraphMutationResult {
        self.rebuild_index_with_checkpoint(expected_manifest_hash, &|| Ok(()))
    }

    pub fn rebuild_index_with_checkpoint(
        &self,
        expected_manifest_hash: &str,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> TopicGraphMutationResult {
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
        if checkpoint().is_err() {
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
            diagnostic: None,
        }
    }

    fn diagnostic_result<const N: usize>(
        &self,
        status: TopicGraphMutationStatus,
        code: &str,
        message: &str,
        details: [(&str, &str); N],
    ) -> TopicGraphMutationResult {
        let mut result = self.result(status, Vec::new(), Vec::new(), Vec::new());
        result.diagnostic = Some(TopicGraphDiagnostic {
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

fn materialized_planning_json(previous: Option<&TopicGraphNodeRecord>) -> String {
    let mut planning = previous
        .and_then(|node| serde_json::from_str::<Value>(&node.planning_json).ok())
        .filter(Value::is_object)
        .unwrap_or_else(|| json!({}));
    if let Some(object) = planning.as_object_mut() {
        object.insert("lifecycle".into(), json!("materialized"));
    }
    serde_json::to_string(&planning).unwrap_or_else(|_| "{}".into())
}

fn topic_plan_result(
    status: &str,
    graph_hash: &str,
    coverage_stale: bool,
    recommended_updates: &[String],
    diagnostics: Vec<&str>,
) -> Value {
    json!({
        "status":status,
        "graph_hash":graph_hash,
        "coverage_stale":coverage_stale,
        "recommended_updates":recommended_updates,
        "diagnostics":diagnostics.into_iter().map(|code|json!({"code":code})).collect::<Vec<_>>(),
    })
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
    use std::sync::Mutex;
    use synthesis_repository::{
        Repository, RepositoryIdentity, TopicGraphApplicationStateRecord, TopicGraphEdgeRecord,
        TopicGraphNodeRecord,
    };
    use synthesis_test_support::TestRoot;

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

    fn root() -> TestRoot {
        TestRoot::new("synthesis-topic-graph-application")
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
    fn planned_topic_reconcile_is_atomic_revision_guarded_and_membership_free() {
        let root = root();
        let owner = Arc::new(Mutex::new(
            Repository::open(
                &root,
                RepositoryIdentity {
                    profile_id: "profile-plan".into(),
                    data_root_id: "data-plan".into(),
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
            app.replace_snapshot(None, &snapshot("base", false)).status,
            TopicGraphMutationStatus::Committed
        );
        let mut forbidden = BTreeMap::new();
        forbidden.insert("paper_refs".into(), json!(["1:ITEM"]));
        let request = TopicPlanReconcileRequest {
            kind: "topic_plan".into(),
            operation: "reconcile".into(),
            base_graph_hash: "base".into(),
            library_index_hash: "library".into(),
            topic_actions: vec![TopicPlanAction {
                action: "create".into(),
                topic_id: "topic:planned".into(),
                title: "Planned".into(),
                definition: "Reusable definition".into(),
                resolver: json!({"tags":["planned"]}),
                extra: forbidden,
                ..serde_json::from_value(json!({
                    "action":"create","topic_id":"placeholder"
                }))
                .expect("action defaults")
            }],
            relation_proposals: Vec::new(),
            coverage_manifest_path: String::new(),
            recommended_updates: Vec::new(),
        };
        let rejected = app.reconcile_plan(&request, "library");
        assert_eq!(rejected["status"], "conflict");
        assert!(
            app.load()
                .unwrap()
                .nodes
                .iter()
                .all(|node| node.topic_id != "topic:planned")
        );

        let mut accepted = request;
        accepted.topic_actions[0].extra.clear();
        let persisted = app.reconcile_plan(&accepted, "library");
        assert_eq!(persisted["status"], "persisted");
        let planned = app
            .load()
            .unwrap()
            .nodes
            .into_iter()
            .find(|node| node.topic_id == "topic:planned")
            .expect("planned node");
        let planning: Value = serde_json::from_str(&planned.planning_json).expect("planning");
        assert_eq!(planning["lifecycle"], "planned");
        assert_eq!(planning["revision"], 1);

        let stale_update = TopicPlanReconcileRequest {
            base_graph_hash: persisted["graph_hash"].as_str().unwrap().into(),
            topic_actions: vec![TopicPlanAction {
                action: "update".into(),
                topic_id: "topic:planned".into(),
                definition: "Changed".into(),
                resolver: json!({"tags":["changed"]}),
                revision: Some(0),
                ..serde_json::from_value(json!({
                    "action":"update","topic_id":"placeholder"
                }))
                .expect("action defaults")
            }],
            ..accepted
        };
        assert_eq!(
            app.reconcile_plan(&stale_update, "library")["status"],
            "conflict"
        );
        assert_eq!(
            serde_json::from_str::<Value>(
                &app.load()
                    .unwrap()
                    .nodes
                    .into_iter()
                    .find(|node| node.topic_id == "topic:planned")
                    .unwrap()
                    .planning_json
            )
            .unwrap()["revision"],
            1
        );
        drop(app);
        Arc::try_unwrap(owner)
            .expect("repository owner")
            .into_inner()
            .expect("repository")
            .close()
            .expect("close repository");
        std::fs::remove_dir_all(root).expect("cleanup");
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
            app.rebuild_index_with_checkpoint("graph:1", &|| Err("operation_timeout".into()))
                .status,
            TopicGraphMutationStatus::Stopping
        );
        assert!(app.inspect().expect("inspect").index_hash.is_none());
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
    }

    #[test]
    fn purge_keeps_rebuilt_active_relations_and_reviews() {
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
        let mut active = snapshot("graph:active", false);
        active.reviews.push(TopicGraphReviewItemRecord {
            review_id: "review:active".into(),
            status: "open".into(),
            source_topic_id: "topic:one".into(),
            target_topic_id: "topic:two".into(),
            relation: "broader_than".into(),
            confidence: Some(0.8),
            provenance_json: "[]".into(),
            evidence_refs_json: "[]".into(),
            created_at: "fixed".into(),
            updated_at: "fixed".into(),
            ..TopicGraphReviewItemRecord::default()
        });
        assert_eq!(
            app.replace_snapshot(None, &active).status,
            TopicGraphMutationStatus::Committed
        );
        let basis = app.load().expect("load").state.manifest_hash;
        assert_eq!(
            app.purge_deleted(&TopicGraphPurgeRequest {
                expected_manifest_hash: basis,
                topic_ids: vec!["topic:one".into()],
            })
            .status,
            TopicGraphMutationStatus::Unchanged
        );
        let current = app.load().expect("current");
        assert_eq!(current.edges.len(), 1);
        assert_eq!(current.reviews.len(), 1);
        drop(app);
        drop(owner);
    }

    #[test]
    fn review_is_two_stage_diagnostic_filtered_and_marks_index_stale() {
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
            Arc::new(|| "reviewed".into()),
        );
        let mut initial = snapshot("graph:review", false);
        initial.state.index_stale = 0;
        initial.edges.clear();
        initial.reviews.push(TopicGraphReviewItemRecord {
            review_id: "review:relation".into(),
            status: "open".into(),
            source_topic_id: "topic:one".into(),
            target_topic_id: "topic:two".into(),
            target_title: "two".into(),
            relation: "broader_than".into(),
            confidence: Some(0.4),
            provenance_json: "[]".into(),
            evidence_refs_json: "[]".into(),
            created_at: "fixed".into(),
            updated_at: "fixed".into(),
            ..TopicGraphReviewItemRecord::default()
        });
        assert_eq!(
            app.replace_snapshot(None, &initial).status,
            TopicGraphMutationStatus::Committed
        );
        let missing = app.review(&TopicGraphReviewRequest {
            expected_manifest_hash: "graph:review".into(),
            review_id: "missing".into(),
            action: TopicGraphReviewAction::ApproveSuggested,
        });
        assert_eq!(
            missing.diagnostic.expect("missing diagnostic").code,
            "topic_graph_review_missing"
        );
        let approved = app.review(&TopicGraphReviewRequest {
            expected_manifest_hash: "graph:review".into(),
            review_id: "review:relation".into(),
            action: TopicGraphReviewAction::ApproveSuggested,
        });
        assert_eq!(approved.status, TopicGraphMutationStatus::Committed);
        let suggested = app.load().expect("suggested");
        assert_eq!(suggested.state.index_stale, 1);
        assert_eq!(suggested.reviews[0].status, "approved");
        assert_eq!(suggested.edges[0].status, "suggested");
        let (open_page, open_edges, open_reviews) = app
            .load_review_page(&ReviewPageQuery {
                status: "open".into(),
                kind: "all".into(),
                confidence: "all".into(),
                search: "broader_than".into(),
                limit: 10,
                ..ReviewPageQuery::default()
            })
            .expect("open review page");
        assert_eq!((open_edges, open_reviews), (1, 0));
        assert_eq!(open_page.nodes.len(), 2);
        let confirmed = app.decide_relation(&TopicGraphRelationDecisionRequest {
            expected_manifest_hash: suggested.state.manifest_hash,
            edge_id: suggested.edges[0].edge_id.clone(),
            status: TopicGraphRelationStatus::Confirmed,
        });
        assert_eq!(confirmed.status, TopicGraphMutationStatus::Committed);
        let current = app.load().expect("confirmed");
        assert_eq!(current.edges[0].status, "confirmed");
        let closed = app.review(&TopicGraphReviewRequest {
            expected_manifest_hash: current.state.manifest_hash,
            review_id: "review:relation".into(),
            action: TopicGraphReviewAction::ApproveSuggested,
        });
        assert_eq!(
            closed.diagnostic.expect("closed diagnostic").code,
            "topic_graph_review_closed"
        );
        drop(app);
        drop(owner);
    }
}
