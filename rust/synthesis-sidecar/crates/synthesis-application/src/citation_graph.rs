use crate::PromotionCheckpoint;
use crate::ports::RepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeSet, HashMap, HashSet};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    CITATION_GRAPH_DEFAULT_EDGE_MAX, CITATION_GRAPH_DEFAULT_NODE_MAX, CacheBasisRecord,
    CitationComplexMetricsRecord, CitationEdgeRecord, CitationGraphPromotion,
    CitationGraphPromotionCommit, CitationGraphPromotionResult, CitationGraphReplacement,
    CitationLayoutRecord, CitationNodeRecord, OperationRecord,
};

mod persistence;
mod read;
mod rebuild;
pub use read::*;
pub use rebuild::*;

const MAX_INPUT_BYTES: usize = 8 * 1024 * 1024;
const MAX_INPUT_NODES: usize = 250_000;
const MAX_RESULT_NODES: usize = 50_000;
pub const CITATION_GRAPH_LAYOUT_NODE_MAX: usize = CITATION_GRAPH_DEFAULT_NODE_MAX;
pub const CITATION_GRAPH_LAYOUT_EDGE_MAX: usize = CITATION_GRAPH_DEFAULT_EDGE_MAX;

#[derive(Clone, Debug, Default)]
pub struct CitationGraphDefaultProjection {
    pub nodes: Vec<CitationNodeRecord>,
    pub edges: Vec<CitationEdgeRecord>,
    pub hover_nodes: Vec<CitationNodeRecord>,
    pub hover_edges: Vec<CitationEdgeRecord>,
    pub external_degrees: HashMap<String, usize>,
}

pub fn project_citation_graph_default(
    nodes: Vec<CitationNodeRecord>,
    edges: Vec<CitationEdgeRecord>,
) -> CitationGraphDefaultProjection {
    project_citation_graph_default_with_limits(
        nodes,
        edges,
        CITATION_GRAPH_LAYOUT_NODE_MAX,
        CITATION_GRAPH_LAYOUT_EDGE_MAX,
    )
}

fn project_citation_graph_default_with_limits(
    mut nodes: Vec<CitationNodeRecord>,
    edges: Vec<CitationEdgeRecord>,
    node_limit: usize,
    edge_limit: usize,
) -> CitationGraphDefaultProjection {
    nodes.retain(|node| node.node_status == "active");
    nodes.sort_by(|left, right| left.literature_item_id.cmp(&right.literature_item_id));
    let node_by_id = nodes
        .iter()
        .map(|node| (node.literature_item_id.clone(), node.clone()))
        .collect::<HashMap<_, _>>();
    let library_ids = nodes
        .iter()
        .filter(|node| node.has_zotero_binding)
        .map(|node| node.literature_item_id.clone())
        .collect::<BTreeSet<_>>();
    let mut candidate_edges = edges
        .into_iter()
        .filter(|edge| {
            library_ids.contains(&edge.source_literature_item_id)
                && matches!(edge.edge_status.as_str(), "accepted" | "unbound")
                && node_by_id.contains_key(&edge.target_literature_item_id)
        })
        .collect::<Vec<_>>();
    candidate_edges.sort_by(|left, right| left.edge_id.cmp(&right.edge_id));

    let mut external_sources = HashMap::<String, BTreeSet<String>>::new();
    for edge in &candidate_edges {
        if node_by_id
            .get(&edge.target_literature_item_id)
            .is_some_and(|node| !node.has_zotero_binding)
        {
            external_sources
                .entry(edge.target_literature_item_id.clone())
                .or_default()
                .insert(edge.source_literature_item_id.clone());
        }
    }
    let external_degrees = external_sources
        .iter()
        .map(|(node_id, sources)| (node_id.clone(), sources.len()))
        .collect::<HashMap<_, _>>();

    let mut default_nodes = nodes
        .iter()
        .filter(|node| {
            node.has_zotero_binding
                || external_degrees
                    .get(&node.literature_item_id)
                    .is_some_and(|degree| *degree > 1)
        })
        .cloned()
        .collect::<Vec<_>>();
    default_nodes.sort_by(|left, right| {
        right
            .has_zotero_binding
            .cmp(&left.has_zotero_binding)
            .then_with(|| left.literature_item_id.cmp(&right.literature_item_id))
    });
    default_nodes.truncate(node_limit);
    let selected_ids = default_nodes
        .iter()
        .map(|node| node.literature_item_id.clone())
        .collect::<HashSet<_>>();

    let mut default_edges = candidate_edges
        .iter()
        .filter(|edge| {
            if !selected_ids.contains(&edge.source_literature_item_id)
                || !selected_ids.contains(&edge.target_literature_item_id)
            {
                return false;
            }
            node_by_id
                .get(&edge.target_literature_item_id)
                .is_some_and(|target| {
                    if target.has_zotero_binding {
                        edge.edge_status == "accepted"
                    } else {
                        external_degrees
                            .get(&target.literature_item_id)
                            .is_some_and(|degree| *degree > 1)
                    }
                })
        })
        .cloned()
        .collect::<Vec<_>>();
    default_edges.truncate(edge_limit);

    let hover_ids = candidate_edges
        .iter()
        .filter(|edge| selected_ids.contains(&edge.source_literature_item_id))
        .filter(|edge| {
            external_degrees
                .get(&edge.target_literature_item_id)
                .is_some_and(|degree| *degree == 1)
        })
        .map(|edge| edge.target_literature_item_id.clone())
        .collect::<BTreeSet<_>>();
    let hover_nodes = nodes
        .into_iter()
        .filter(|node| hover_ids.contains(&node.literature_item_id))
        .collect::<Vec<_>>();
    let hover_edges = candidate_edges
        .into_iter()
        .filter(|edge| {
            selected_ids.contains(&edge.source_literature_item_id)
                && hover_ids.contains(&edge.target_literature_item_id)
        })
        .collect::<Vec<_>>();

    CitationGraphDefaultProjection {
        nodes: default_nodes,
        edges: default_edges,
        hover_nodes,
        hover_edges,
        external_degrees,
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CitationMutationStatus {
    Promoted,
    Unchanged,
    BasisMismatch,
    GraphApplicationBusy,
    WorkerBusy,
    WorkerFailed,
    InvalidRequest,
    RepairRequired,
    Stopping,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationMutationResult {
    pub status: CitationMutationStatus,
    pub graph_hash: Option<String>,
    pub input_hash: Option<String>,
    pub metrics_hash: Option<String>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationInspectResult {
    pub graph_hash: Option<String>,
    pub input_hash: Option<String>,
    pub metrics_hash: Option<String>,
    pub node_count: i64,
    pub edge_count: i64,
    pub metrics_ready: bool,
    pub layout_presets: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationRebuildRequest {
    pub expected_graph_hash: Option<String>,
    #[serde(default)]
    pub force: bool,
    pub input: Value,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CitationDirection {
    Incoming,
    Outgoing,
    Both,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CitationMetricsSort {
    Foundation,
    Frontier,
    Pagerank,
    InDegree,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationMetricsPageRequest {
    pub cursor: usize,
    pub limit: usize,
    pub sort_by: CitationMetricsSort,
    #[serde(default)]
    pub paper_refs: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationLayoutRequest {
    pub expected_graph_hash: String,
    pub layout_key: String,
    pub view_key: String,
    pub preset: String,
}

pub struct CitationBuildOutput {
    pub graph_hash: String,
    pub replacement: CitationGraphReplacement,
}

pub struct CitationMetricsOutput {
    pub metrics_hash: String,
    pub records: Vec<CitationComplexMetricsRecord>,
}

pub trait CitationGraphComputePort: Send + Sync {
    fn build(
        &self,
        input: &Value,
        canceled: &Arc<AtomicBool>,
    ) -> Result<CitationBuildOutput, String>;
    fn metrics(
        &self,
        graph_hash: &str,
        nodes: &[CitationNodeRecord],
        edges: &[CitationEdgeRecord],
        canceled: &Arc<AtomicBool>,
    ) -> Result<CitationMetricsOutput, String>;
    fn layout(
        &self,
        request: &CitationLayoutRequest,
        nodes: &[CitationNodeRecord],
        edges: &[CitationEdgeRecord],
        canceled: &Arc<AtomicBool>,
    ) -> Result<CitationLayoutRecord, String>;
}

type Clock = Arc<dyn Fn() -> String + Send + Sync>;
type IdFactory = Arc<dyn Fn() -> String + Send + Sync>;

struct AdmissionState {
    accepting: bool,
    active: Option<Arc<AtomicBool>>,
}

pub struct CitationGraphApplication {
    repository: Arc<RepositoryPort>,
    compute: Arc<dyn CitationGraphComputePort>,
    now: Clock,
    operation_id: IdFactory,
    admission: Mutex<AdmissionState>,
    drained: Condvar,
}

struct ActiveMutation<'a>(&'a CitationGraphApplication);

impl Drop for ActiveMutation<'_> {
    fn drop(&mut self) {
        if let Ok(mut state) = self.0.admission.lock() {
            state.active = None;
            self.0.drained.notify_all();
        }
    }
}

impl CitationGraphApplication {
    pub fn new(
        repository: Arc<RepositoryPort>,
        compute: Arc<dyn CitationGraphComputePort>,
    ) -> Self {
        let sequence = Arc::new(AtomicU64::new(0));
        let operation_sequence = Arc::clone(&sequence);
        Self::with_factories(
            repository,
            compute,
            Arc::new(synthesis_protocol::utc_now_iso8601),
            Arc::new(move || {
                format!(
                    "citation-graph-{}",
                    operation_sequence.fetch_add(1, Ordering::Relaxed)
                )
            }),
        )
    }

    pub fn with_factories(
        repository: Arc<RepositoryPort>,
        compute: Arc<dyn CitationGraphComputePort>,
        now: Clock,
        operation_id: IdFactory,
    ) -> Self {
        Self {
            repository,
            compute,
            now,
            operation_id,
            admission: Mutex::new(AdmissionState {
                accepting: true,
                active: None,
            }),
            drained: Condvar::new(),
        }
    }

    pub fn inspect(&self) -> Result<CitationInspectResult, String> {
        let state = persistence::state(&self.repository)?;
        let presets = state.as_ref().map_or_else(
            || Ok(Vec::new()),
            |state| persistence::ready_layout_presets(&self.repository, &state.graph_hash),
        )?;
        Ok(CitationInspectResult {
            graph_hash: state.as_ref().map(|state| state.graph_hash.clone()),
            input_hash: state.as_ref().map(|state| state.input_hash.clone()),
            metrics_hash: state.as_ref().and_then(|state| state.metrics_hash.clone()),
            node_count: state.as_ref().map_or(0, |state| state.node_count),
            edge_count: state.as_ref().map_or(0, |state| state.edge_count),
            metrics_ready: state
                .as_ref()
                .and_then(|state| state.metrics_hash.as_ref())
                .is_some_and(|hash| !hash.is_empty()),
            layout_presets: presets,
        })
    }

    pub fn read(&self) -> Result<CitationGraphReadView, String> {
        let basis = self.repository.with_reader(|repository| {
            repository
                .get_citation_graph_application_state()
                .map(CitationGraphBasis::from)
        })?;
        Ok(CitationGraphReadView::new(
            Arc::clone(&self.repository),
            basis,
        ))
    }

    pub fn rebuild_full(&self, request: CitationRebuildRequest) -> CitationMutationResult {
        self.rebuild(request, None, None, None)
    }

    pub fn rebuild_full_with_checkpoint(
        &self,
        request: CitationRebuildRequest,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> CitationMutationResult {
        self.rebuild(request, None, Some(checkpoint), None)
    }

    pub fn rebuild_source_slice(
        &self,
        request: CitationRebuildRequest,
        source_ids: &[String],
    ) -> CitationMutationResult {
        if source_ids.is_empty() || request.expected_graph_hash.is_none() {
            return self.result(CitationMutationStatus::InvalidRequest, Vec::new());
        }
        self.rebuild(request, Some(source_ids), None, None)
    }

    pub fn rebuild_source_slice_with_checkpoint(
        &self,
        request: CitationRebuildRequest,
        source_ids: &[String],
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> CitationMutationResult {
        if source_ids.is_empty() || request.expected_graph_hash.is_none() {
            return self.result(CitationMutationStatus::InvalidRequest, Vec::new());
        }
        self.rebuild(request, Some(source_ids), Some(checkpoint), None)
    }

    pub fn prepare_rebuild(
        &self,
        mode: CitationGraphRebuildMode,
    ) -> Result<CitationGraphRebuildAttempt, String> {
        let expected_graph_hash = persistence::state(&self.repository)?
            .map(|state| state.graph_hash)
            .filter(|graph_hash| !graph_hash.is_empty());
        let cancel = self
            .reserve()
            .map_err(|status| format!("citation_graph_prepare_{status:?}"))?;
        let operation_id = (self.operation_id)();
        let started_at = (self.now)();
        let receipt = running_operation(
            &operation_id,
            match mode {
                CitationGraphRebuildMode::Full => "citation_graph_cache_rebuild",
                CitationGraphRebuildMode::Incremental => "citation_graph_cache_incremental_refresh",
            },
            &started_at,
        );
        if let Err(error) = persistence::insert_operation(&self.repository, &receipt) {
            drop(self.claim(&cancel));
            return Err(error);
        }
        Ok(CitationGraphRebuildAttempt {
            operation_id,
            started_at,
            plan: CitationGraphCollectionPlan {
                mode,
                expected_graph_hash,
            },
            cancel,
        })
    }

    pub fn latest_failed_rebuild_mode(&self) -> Result<Option<CitationGraphRebuildMode>, String> {
        Ok(
            match persistence::latest_failed_rebuild_type(&self.repository)?.as_deref() {
                Some("citation_graph_cache_rebuild") => Some(CitationGraphRebuildMode::Full),
                Some("citation_graph_cache_incremental_refresh") => {
                    Some(CitationGraphRebuildMode::Incremental)
                }
                _ => None,
            },
        )
    }

    pub fn finish_rebuild(
        &self,
        attempt: CitationGraphRebuildAttempt,
        material: Result<CitationGraphRebuildMaterial, String>,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> Result<CitationMutationResult, String> {
        let material = match material {
            Ok(material) => material,
            Err(error) => {
                let _active = self
                    .claim(&attempt.cancel)
                    .map_err(|status| format!("citation_graph_finish_{status:?}"))?;
                let mut warnings = Vec::new();
                self.finish_operation(&attempt.operation_id, "failed", &error, &mut warnings);
                return Err(error);
            }
        };
        let source_ids = match attempt.plan.mode {
            CitationGraphRebuildMode::Full if material.source_ids.is_empty() => None,
            CitationGraphRebuildMode::Incremental if !material.source_ids.is_empty() => {
                Some(material.source_ids.as_slice())
            }
            _ => {
                let _active = self
                    .claim(&attempt.cancel)
                    .map_err(|status| format!("citation_graph_finish_{status:?}"))?;
                let mut warnings = Vec::new();
                self.finish_operation(
                    &attempt.operation_id,
                    "failed",
                    "invalid_request",
                    &mut warnings,
                );
                return Ok(self.result(CitationMutationStatus::InvalidRequest, warnings));
            }
        };
        let request = CitationRebuildRequest {
            expected_graph_hash: attempt.plan.expected_graph_hash.clone(),
            force: true,
            input: material.input,
        };
        Ok(self.rebuild(request, source_ids, Some(checkpoint), Some(attempt)))
    }

    fn rebuild(
        &self,
        request: CitationRebuildRequest,
        source_ids: Option<&[String]>,
        checkpoint: Option<&PromotionCheckpoint<'_>>,
        prepared: Option<CitationGraphRebuildAttempt>,
    ) -> CitationMutationResult {
        if prepared.is_none() {
            let input_hash = match validate_rebuild(&request, source_ids) {
                Ok(hash) => hash,
                Err(_) => return self.result(CitationMutationStatus::InvalidRequest, Vec::new()),
            };
            let current = match persistence::state(&self.repository) {
                Ok(state) => state,
                Err(_) => return self.result(CitationMutationStatus::RepairRequired, Vec::new()),
            };
            if current.as_ref().map(|state| state.graph_hash.as_str())
                != request.expected_graph_hash.as_deref()
            {
                return self.result(CitationMutationStatus::BasisMismatch, Vec::new());
            }
            if !request.force
                && current
                    .as_ref()
                    .is_some_and(|state| state.input_hash == input_hash)
            {
                return self.result(CitationMutationStatus::Unchanged, Vec::new());
            }
        }
        let (cancel, _active, operation_id, now, receipt, mut warnings) = match prepared {
            Some(attempt) => {
                let active = match self.claim(&attempt.cancel) {
                    Ok(active) => active,
                    Err(status) => return self.result(status, Vec::new()),
                };
                let receipt = running_operation(
                    &attempt.operation_id,
                    match attempt.plan.mode {
                        CitationGraphRebuildMode::Full => "citation_graph_cache_rebuild",
                        CitationGraphRebuildMode::Incremental => {
                            "citation_graph_cache_incremental_refresh"
                        }
                    },
                    &attempt.started_at,
                );
                (
                    attempt.cancel,
                    active,
                    attempt.operation_id,
                    attempt.started_at,
                    receipt,
                    Vec::new(),
                )
            }
            None => {
                let (cancel, active) = match self.admit() {
                    Ok(active) => active,
                    Err(status) => return self.result(status, Vec::new()),
                };
                let operation_id = (self.operation_id)();
                let now = (self.now)();
                let receipt = running_operation(
                    &operation_id,
                    if source_ids.is_some() {
                        "citation_graph_cache_incremental_refresh"
                    } else {
                        "citation_graph_cache_rebuild"
                    },
                    &now,
                );
                let mut warnings = Vec::new();
                if persistence::insert_operation(&self.repository, &receipt).is_err() {
                    warnings.push("citation_graph_operation_receipt_failed".into());
                }
                (cancel, active, operation_id, now, receipt, warnings)
            }
        };
        let input_hash = match validate_rebuild(&request, source_ids) {
            Ok(hash) => hash,
            Err(_) => {
                self.finish_operation(&operation_id, "failed", "invalid_request", &mut warnings);
                return self.result(CitationMutationStatus::InvalidRequest, warnings);
            }
        };
        let current = match persistence::state(&self.repository) {
            Ok(state) => state,
            Err(_) => {
                self.finish_operation(&operation_id, "failed", "state_read_failed", &mut warnings);
                return self.result(CitationMutationStatus::RepairRequired, warnings);
            }
        };
        if current.as_ref().map(|state| state.graph_hash.as_str())
            != request.expected_graph_hash.as_deref()
        {
            self.finish_operation(&operation_id, "failed", "basis_mismatch", &mut warnings);
            return self.result(CitationMutationStatus::BasisMismatch, warnings);
        }
        if !request.force
            && current
                .as_ref()
                .is_some_and(|state| state.input_hash == input_hash)
        {
            self.finish_operation(&operation_id, "completed", "unchanged", &mut warnings);
            return self.result(CitationMutationStatus::Unchanged, warnings);
        }
        let build = match self.compute.build(&request.input, &cancel) {
            Ok(build) if build.replacement.nodes.len() <= MAX_RESULT_NODES => build,
            Ok(_) => {
                self.finish_operation(&operation_id, "failed", "invalid_result", &mut warnings);
                return self.result(CitationMutationStatus::InvalidRequest, warnings);
            }
            Err(error) => {
                let status = worker_status(&error);
                self.finish_operation(&operation_id, "failed", &error, &mut warnings);
                return self.result(status, warnings);
            }
        };
        let mut replacement = build.replacement;
        let graph_hash = build.graph_hash;
        replacement.state.graph_hash = graph_hash.clone();
        replacement.state.input_hash = input_hash.clone();
        replacement.state.metrics_hash = None;
        replacement.state.updated_at = now.clone();
        if checkpoint.is_some_and(|checkpoint| checkpoint().is_err()) {
            self.finish_operation(
                &operation_id,
                "canceled",
                "promotion_blocked",
                &mut warnings,
            );
            return self.result(CitationMutationStatus::Stopping, warnings);
        }
        let promotion = match source_ids {
            None => CitationGraphPromotion::Full {
                expected_graph_hash: request.expected_graph_hash.clone(),
                replacement,
            },
            Some(source_ids) => CitationGraphPromotion::SourceSlice {
                expected_graph_hash: request.expected_graph_hash.clone().unwrap_or_default(),
                source_ids: source_ids.to_vec(),
                replacement,
            },
        };
        let terminal = OperationRecord {
            status: "completed".into(),
            phase: "committed".into(),
            progress_mode: "determinate".into(),
            processed_count: 1,
            total_count: 1,
            basis_kind: "graph_hash".into(),
            source_hash: input_hash.clone(),
            completed_at: now.clone(),
            updated_at: now.clone(),
            ..receipt
        };
        let promotion = persistence::commit_graph(
            &self.repository,
            &CitationGraphPromotionCommit {
                promotion,
                ready_cache: CacheBasisRecord {
                    cache_key: "citation-graph:library".into(),
                    cache_kind: "citation_graph".into(),
                    scope_kind: "library".into(),
                    status: "ready".into(),
                    basis_kind: "graph_hash".into(),
                    source_hash: input_hash,
                    policy_version: "citation-graph-application-v1".into(),
                    active_operation_id: operation_id.clone(),
                    refreshed_at: now.clone(),
                    diagnostics_json: "[]".into(),
                    updated_at: now,
                    ..CacheBasisRecord::default()
                },
                terminal_operation: terminal,
            },
        );
        let promoted_hash = match promotion {
            Ok(CitationGraphPromotionResult::Promoted { graph_hash }) => graph_hash,
            Ok(CitationGraphPromotionResult::BasisMismatch) => {
                self.finish_operation(&operation_id, "failed", "basis_mismatch", &mut warnings);
                return self.result(CitationMutationStatus::BasisMismatch, warnings);
            }
            Err(_) => {
                self.finish_operation(&operation_id, "failed", "projection_failed", &mut warnings);
                return self.result(CitationMutationStatus::RepairRequired, warnings);
            }
        };
        if let Err(error) = self.refresh_metrics_inner(&promoted_hash, &cancel, None)
            && error != "basis_mismatch"
        {
            warnings.push("citation_graph_metrics_refresh_failed".into());
        }
        self.result(CitationMutationStatus::Promoted, warnings)
    }

    pub fn refresh_metrics(&self, expected_graph_hash: &str) -> CitationMutationResult {
        self.refresh_metrics_with_checkpoint(expected_graph_hash, &|| Ok(()))
    }

    pub fn refresh_metrics_with_checkpoint(
        &self,
        expected_graph_hash: &str,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> CitationMutationResult {
        let (cancel, _active) = match self.admit() {
            Ok(active) => active,
            Err(status) => return self.result(status, Vec::new()),
        };
        match self.refresh_metrics_inner(expected_graph_hash, &cancel, Some(checkpoint)) {
            Ok(true) => self.result(CitationMutationStatus::Promoted, Vec::new()),
            Ok(false) => self.result(CitationMutationStatus::BasisMismatch, Vec::new()),
            Err(error) if error == "basis_mismatch" => {
                self.result(CitationMutationStatus::BasisMismatch, Vec::new())
            }
            Err(error) => self.result(worker_status(&error), Vec::new()),
        }
    }

    pub fn recompute_layout(&self, request: CitationLayoutRequest) -> CitationMutationResult {
        self.recompute_layout_with_checkpoint(request, &|| Ok(()))
    }

    pub fn recompute_layout_with_checkpoint(
        &self,
        request: CitationLayoutRequest,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> CitationMutationResult {
        if request.layout_key.is_empty()
            || request.view_key.is_empty()
            || !matches!(request.preset.as_str(), "force" | "radial" | "components")
        {
            return self.result(CitationMutationStatus::InvalidRequest, Vec::new());
        }
        let (cancel, _active) = match self.admit() {
            Ok(active) => active,
            Err(status) => return self.result(status, Vec::new()),
        };
        let (nodes, edges) = match persistence::graph(&self.repository) {
            Ok(graph) => graph,
            Err(_) => return self.result(CitationMutationStatus::RepairRequired, Vec::new()),
        };
        let projection = project_citation_graph_default(nodes, edges);
        let mut layout =
            match self
                .compute
                .layout(&request, &projection.nodes, &projection.edges, &cancel)
            {
                Ok(layout) => layout,
                Err(error) => return self.result(worker_status(&error), vec![error]),
            };
        layout.graph_hash = request.expected_graph_hash.clone();
        if checkpoint().is_err() {
            return self.result(CitationMutationStatus::Stopping, Vec::new());
        }
        match persistence::promote_layout(&self.repository, &request.expected_graph_hash, &layout) {
            Ok(true) => self.result(CitationMutationStatus::Promoted, Vec::new()),
            Ok(false) => self.result(CitationMutationStatus::BasisMismatch, Vec::new()),
            Err(_) => self.result(CitationMutationStatus::RepairRequired, Vec::new()),
        }
    }

    pub fn stop_admission(&self) {
        if let Ok(mut state) = self.admission.lock() {
            state.accepting = false;
            if let Some(active) = &state.active {
                active.store(true, Ordering::Relaxed);
            }
        }
    }

    pub fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.stop_admission();
        let state = self
            .admission
            .lock()
            .map_err(|_| "graph_application_unavailable".to_owned())?;
        let (state, wait) = self
            .drained
            .wait_timeout_while(state, timeout, |state| state.active.is_some())
            .map_err(|_| "graph_application_unavailable".to_owned())?;
        if wait.timed_out() && state.active.is_some() {
            Err("graph_application_drain_timeout".into())
        } else {
            Ok(())
        }
    }

    fn admit(&self) -> Result<(Arc<AtomicBool>, ActiveMutation<'_>), CitationMutationStatus> {
        let cancel = self.reserve()?;
        let active = self.claim(&cancel)?;
        Ok((cancel, active))
    }

    fn reserve(&self) -> Result<Arc<AtomicBool>, CitationMutationStatus> {
        let mut state = self
            .admission
            .lock()
            .map_err(|_| CitationMutationStatus::RepairRequired)?;
        if !state.accepting {
            return Err(CitationMutationStatus::Stopping);
        }
        if state.active.is_some() {
            return Err(CitationMutationStatus::GraphApplicationBusy);
        }
        let cancel = Arc::new(AtomicBool::new(false));
        state.active = Some(Arc::clone(&cancel));
        Ok(cancel)
    }

    fn claim(
        &self,
        cancel: &Arc<AtomicBool>,
    ) -> Result<ActiveMutation<'_>, CitationMutationStatus> {
        let state = self
            .admission
            .lock()
            .map_err(|_| CitationMutationStatus::RepairRequired)?;
        if !state
            .active
            .as_ref()
            .is_some_and(|active| Arc::ptr_eq(active, cancel))
        {
            return Err(CitationMutationStatus::GraphApplicationBusy);
        }
        Ok(ActiveMutation(self))
    }

    fn refresh_metrics_inner(
        &self,
        graph_hash: &str,
        canceled: &Arc<AtomicBool>,
        checkpoint: Option<&PromotionCheckpoint<'_>>,
    ) -> Result<bool, String> {
        if persistence::state(&self.repository)?
            .as_ref()
            .map(|state| state.graph_hash.as_str())
            != Some(graph_hash)
        {
            return Err("basis_mismatch".into());
        }
        let (nodes, edges) = persistence::graph(&self.repository)?;
        let output = self.compute.metrics(graph_hash, &nodes, &edges, canceled)?;
        if checkpoint.is_some_and(|checkpoint| checkpoint().is_err()) {
            return Err("stopping".into());
        }
        persistence::promote_metrics(
            &self.repository,
            graph_hash,
            &output.metrics_hash,
            &output.records,
            &(self.now)(),
        )
    }

    fn finish_operation(
        &self,
        operation_id: &str,
        status: &str,
        phase: &str,
        warnings: &mut Vec<String>,
    ) {
        if persistence::update_operation(
            &self.repository,
            operation_id,
            status,
            phase,
            &[],
            &(self.now)(),
        )
        .is_err()
            && !warnings
                .iter()
                .any(|warning| warning == "citation_graph_operation_receipt_failed")
        {
            warnings.push("citation_graph_operation_receipt_failed".into());
        }
    }

    fn result(
        &self,
        status: CitationMutationStatus,
        warnings: Vec<String>,
    ) -> CitationMutationResult {
        let state = persistence::state(&self.repository).ok().flatten();
        CitationMutationResult {
            status,
            graph_hash: state.as_ref().map(|state| state.graph_hash.clone()),
            input_hash: state.as_ref().map(|state| state.input_hash.clone()),
            metrics_hash: state.and_then(|state| state.metrics_hash),
            warnings,
        }
    }
}

fn validate_rebuild(
    request: &CitationRebuildRequest,
    source_ids: Option<&[String]>,
) -> Result<String, String> {
    let bytes = serde_json::to_vec(&request.input).map_err(|_| "invalid_request")?;
    if bytes.len() > MAX_INPUT_BYTES || count_nodes(&request.input) > MAX_INPUT_NODES {
        return Err("invalid_request".into());
    }
    let object = request
        .input
        .as_object()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let scope = object
        .get("scope")
        .and_then(Value::as_object)
        .ok_or_else(|| "invalid_request".to_owned())?;
    let kind = scope.get("kind").and_then(Value::as_str);
    if source_ids.is_none() && kind != Some("full") {
        return Err("invalid_request".into());
    }
    if let Some(source_ids) = source_ids {
        let requested = scope
            .get("sourceIds")
            .and_then(Value::as_array)
            .ok_or_else(|| "invalid_request".to_owned())?
            .iter()
            .map(|value| {
                value
                    .as_str()
                    .filter(|value| !value.is_empty())
                    .map(str::to_owned)
                    .ok_or_else(|| "invalid_request".to_owned())
            })
            .collect::<Result<BTreeSet<_>, _>>()?;
        if kind != Some("source_slice")
            || requested != source_ids.iter().cloned().collect::<BTreeSet<_>>()
        {
            return Err("invalid_request".into());
        }
    }
    canonical_json_hash(&request.input).map_err(|_| "invalid_request".into())
}

fn count_nodes(value: &Value) -> usize {
    match value {
        Value::Array(values) => 1 + values.iter().map(count_nodes).sum::<usize>(),
        Value::Object(values) => 1 + values.values().map(count_nodes).sum::<usize>(),
        _ => 1,
    }
}

fn worker_status(error: &str) -> CitationMutationStatus {
    match error {
        "worker_busy" => CitationMutationStatus::WorkerBusy,
        "worker_canceled" | "stopping" => CitationMutationStatus::Stopping,
        "invalid_request" => CitationMutationStatus::InvalidRequest,
        _ => CitationMutationStatus::WorkerFailed,
    }
}

fn running_operation(operation_id: &str, operation_type: &str, now: &str) -> OperationRecord {
    OperationRecord {
        operation_id: operation_id.into(),
        operation_type: operation_type.into(),
        status: "running".into(),
        phase: "compute".into(),
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
    use synthesis_repository::{
        CitationGraphApplicationStateRecord, CitationSourceOwnershipRecord, Repository,
        RepositoryIdentity,
    };

    struct FixtureCompute;

    impl CitationGraphComputePort for FixtureCompute {
        fn build(
            &self,
            _input: &Value,
            _canceled: &Arc<AtomicBool>,
        ) -> Result<CitationBuildOutput, String> {
            let now = "2026-07-26T00:00:00.000Z".to_owned();
            let nodes = ["paper:a", "paper:b"]
                .into_iter()
                .map(|id| CitationNodeRecord {
                    literature_item_id: id.into(),
                    node_status: "active".into(),
                    has_zotero_binding: true,
                    title: id.into(),
                    authors_json: "[]".into(),
                    summary_json: "{}".into(),
                    updated_at: now.clone(),
                    ..CitationNodeRecord::default()
                })
                .collect();
            let edges = vec![CitationEdgeRecord {
                edge_id: "edge:1".into(),
                source_literature_item_id: "paper:a".into(),
                target_literature_item_id: "paper:b".into(),
                reference_instance_id: "reference:1".into(),
                edge_status: "accepted".into(),
                roles_json: "[]".into(),
                weight: 1.0,
                created_at: now.clone(),
                updated_at: now.clone(),
                ..CitationEdgeRecord::default()
            }];
            Ok(CitationBuildOutput {
                graph_hash: "sha256:graph".into(),
                replacement: CitationGraphReplacement {
                    state: CitationGraphApplicationStateRecord::default(),
                    nodes,
                    edges,
                    ownership: vec![CitationSourceOwnershipRecord {
                        source_literature_item_id: "paper:a".into(),
                        edge_id: "edge:1".into(),
                        reference_instance_id: "reference:1".into(),
                        target_literature_item_id: "paper:b".into(),
                        edge_status: "accepted".into(),
                        updated_at: now,
                    }],
                    incoming_groups: Vec::new(),
                    light_metrics: Vec::new(),
                    complex_metrics: Vec::new(),
                },
            })
        }

        fn metrics(
            &self,
            graph_hash: &str,
            nodes: &[CitationNodeRecord],
            _edges: &[CitationEdgeRecord],
            _canceled: &Arc<AtomicBool>,
        ) -> Result<CitationMetricsOutput, String> {
            Ok(CitationMetricsOutput {
                metrics_hash: "sha256:metrics".into(),
                records: nodes
                    .iter()
                    .enumerate()
                    .map(|(index, node)| CitationComplexMetricsRecord {
                        literature_item_id: node.literature_item_id.clone(),
                        node_id: node.literature_item_id.clone(),
                        paper_ref: node.literature_item_id.clone(),
                        foundation_score: 1.0 - index as f64 / 10.0,
                        source_graph_hash: graph_hash.into(),
                        metrics_hash: "sha256:metrics".into(),
                        status: "ready".into(),
                        updated_at: "2026-07-26T00:00:00.000Z".into(),
                        ..CitationComplexMetricsRecord::default()
                    })
                    .collect(),
            })
        }

        fn layout(
            &self,
            request: &CitationLayoutRequest,
            _nodes: &[CitationNodeRecord],
            _edges: &[CitationEdgeRecord],
            _canceled: &Arc<AtomicBool>,
        ) -> Result<CitationLayoutRecord, String> {
            Ok(CitationLayoutRecord {
                layout_key: request.layout_key.clone(),
                view_key: request.view_key.clone(),
                preset: request.preset.clone(),
                status: "ready".into(),
                layout_json: "{}".into(),
                diagnostics_json: "[]".into(),
                created_at: "2026-07-26T00:00:00.000Z".into(),
                updated_at: "2026-07-26T00:00:00.000Z".into(),
                ..CitationLayoutRecord::default()
            })
        }
    }

    struct ToggleCompute {
        fail_build: Arc<AtomicBool>,
    }

    impl CitationGraphComputePort for ToggleCompute {
        fn build(
            &self,
            input: &Value,
            canceled: &Arc<AtomicBool>,
        ) -> Result<CitationBuildOutput, String> {
            if self.fail_build.load(Ordering::Relaxed) {
                Err("worker_crashed".into())
            } else {
                FixtureCompute.build(input, canceled)
            }
        }

        fn metrics(
            &self,
            graph_hash: &str,
            nodes: &[CitationNodeRecord],
            edges: &[CitationEdgeRecord],
            canceled: &Arc<AtomicBool>,
        ) -> Result<CitationMetricsOutput, String> {
            FixtureCompute.metrics(graph_hash, nodes, edges, canceled)
        }

        fn layout(
            &self,
            request: &CitationLayoutRequest,
            nodes: &[CitationNodeRecord],
            edges: &[CitationEdgeRecord],
            canceled: &Arc<AtomicBool>,
        ) -> Result<CitationLayoutRecord, String> {
            FixtureCompute.layout(request, nodes, edges, canceled)
        }
    }

    struct VersionedCompute {
        blocked_revision: Option<i64>,
        gate: Arc<(Mutex<(bool, bool)>, Condvar)>,
    }

    impl VersionedCompute {
        fn unblocked() -> Self {
            Self {
                blocked_revision: None,
                gate: Arc::new((Mutex::new((false, false)), Condvar::new())),
            }
        }

        fn blocking(revision: i64) -> Self {
            Self {
                blocked_revision: Some(revision),
                gate: Arc::new((Mutex::new((false, false)), Condvar::new())),
            }
        }
    }

    impl CitationGraphComputePort for VersionedCompute {
        fn build(
            &self,
            input: &Value,
            _canceled: &Arc<AtomicBool>,
        ) -> Result<CitationBuildOutput, String> {
            let revision = input["revision"].as_i64().unwrap_or_default();
            if self.blocked_revision == Some(revision) {
                let (lock, ready) = &*self.gate;
                let mut state = lock.lock().map_err(|_| "worker_crashed")?;
                state.0 = true;
                ready.notify_all();
                while !state.1 {
                    state = ready.wait(state).map_err(|_| "worker_crashed")?;
                }
            }
            let now = "2026-07-26T00:00:00.000Z".to_owned();
            let source = format!("paper:{revision}:a");
            let target = format!("paper:{revision}:b");
            Ok(CitationBuildOutput {
                graph_hash: format!("sha256:graph-{revision}"),
                replacement: CitationGraphReplacement {
                    state: CitationGraphApplicationStateRecord::default(),
                    nodes: vec![
                        CitationNodeRecord {
                            literature_item_id: source.clone(),
                            node_status: "active".into(),
                            has_zotero_binding: true,
                            title: source.clone(),
                            authors_json: "[]".into(),
                            summary_json: "{}".into(),
                            updated_at: now.clone(),
                            ..CitationNodeRecord::default()
                        },
                        CitationNodeRecord {
                            literature_item_id: target.clone(),
                            node_status: "active".into(),
                            has_zotero_binding: true,
                            title: target.clone(),
                            authors_json: "[]".into(),
                            summary_json: "{}".into(),
                            updated_at: now.clone(),
                            ..CitationNodeRecord::default()
                        },
                    ],
                    edges: vec![CitationEdgeRecord {
                        edge_id: format!("edge:{revision}"),
                        source_literature_item_id: source.clone(),
                        target_literature_item_id: target.clone(),
                        reference_instance_id: format!("reference:{revision}"),
                        edge_status: "accepted".into(),
                        roles_json: "[\"supports\"]".into(),
                        weight: 1.0,
                        created_at: now.clone(),
                        updated_at: now.clone(),
                        ..CitationEdgeRecord::default()
                    }],
                    ownership: vec![CitationSourceOwnershipRecord {
                        source_literature_item_id: source,
                        edge_id: format!("edge:{revision}"),
                        reference_instance_id: format!("reference:{revision}"),
                        target_literature_item_id: target,
                        edge_status: "accepted".into(),
                        updated_at: now,
                    }],
                    incoming_groups: Vec::new(),
                    light_metrics: Vec::new(),
                    complex_metrics: Vec::new(),
                },
            })
        }

        fn metrics(
            &self,
            graph_hash: &str,
            nodes: &[CitationNodeRecord],
            edges: &[CitationEdgeRecord],
            canceled: &Arc<AtomicBool>,
        ) -> Result<CitationMetricsOutput, String> {
            FixtureCompute.metrics(graph_hash, nodes, edges, canceled)
        }

        fn layout(
            &self,
            request: &CitationLayoutRequest,
            nodes: &[CitationNodeRecord],
            edges: &[CitationEdgeRecord],
            canceled: &Arc<AtomicBool>,
        ) -> Result<CitationLayoutRecord, String> {
            FixtureCompute.layout(request, nodes, edges, canceled)
        }
    }

    fn root() -> synthesis_test_support::TestRoot {
        synthesis_test_support::TestRoot::new("synthesis-citation-application")
    }

    fn projection_node(id: &str, library: bool) -> CitationNodeRecord {
        CitationNodeRecord {
            literature_item_id: id.into(),
            node_status: "active".into(),
            has_zotero_binding: library,
            ..CitationNodeRecord::default()
        }
    }

    fn projection_edge(id: &str, source: &str, target: &str) -> CitationEdgeRecord {
        CitationEdgeRecord {
            edge_id: id.into(),
            source_literature_item_id: source.into(),
            target_literature_item_id: target.into(),
            edge_status: "accepted".into(),
            ..CitationEdgeRecord::default()
        }
    }

    #[test]
    fn default_projection_is_tiered_bounded_and_endpoint_closed() {
        let nodes = vec![
            projection_node("external:hover", false),
            projection_node("library:b", true),
            projection_node("external:shared", false),
            projection_node("library:a", true),
            CitationNodeRecord {
                literature_item_id: "library:inactive".into(),
                node_status: "inactive".into(),
                has_zotero_binding: true,
                ..CitationNodeRecord::default()
            },
        ];
        let edges = vec![
            projection_edge("edge:3", "library:a", "external:hover"),
            projection_edge("edge:3b", "library:a", "external:hover"),
            projection_edge("edge:2", "library:b", "external:shared"),
            projection_edge("edge:1", "library:a", "external:shared"),
            projection_edge("edge:4", "library:b", "library:a"),
        ];

        let projection = project_citation_graph_default_with_limits(nodes, edges, 3, 2);
        assert_eq!(
            projection
                .nodes
                .iter()
                .map(|node| node.literature_item_id.as_str())
                .collect::<Vec<_>>(),
            vec!["library:a", "library:b", "external:shared"]
        );
        assert_eq!(
            projection
                .edges
                .iter()
                .map(|edge| edge.edge_id.as_str())
                .collect::<Vec<_>>(),
            vec!["edge:1", "edge:2"]
        );
        assert_eq!(projection.hover_nodes.len(), 1);
        assert_eq!(projection.hover_edges.len(), 2);
        assert_eq!(projection.external_degrees["external:hover"], 1);
        assert_eq!(projection.external_degrees["external:shared"], 2);
        let selected = projection
            .nodes
            .iter()
            .map(|node| node.literature_item_id.as_str())
            .collect::<HashSet<_>>();
        assert!(projection.edges.iter().all(|edge| {
            selected.contains(edge.source_literature_item_id.as_str())
                && selected.contains(edge.target_literature_item_id.as_str())
        }));
    }

    #[test]
    fn rebuilds_pages_promotes_layout_and_closes_admission() {
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
        let application = CitationGraphApplication::with_factories(
            port,
            Arc::new(FixtureCompute),
            Arc::new(|| "2026-07-26T00:00:00.000Z".into()),
            Arc::new(|| "citation:1".into()),
        );
        let request = CitationRebuildRequest {
            expected_graph_hash: None,
            force: false,
            input: serde_json::json!({"scope":{"kind":"full"}}),
        };
        assert_eq!(
            application
                .rebuild_full_with_checkpoint(request.clone(), &|| Err("operation_canceled".into()))
                .status,
            CitationMutationStatus::Stopping
        );
        assert!(application.inspect().expect("inspect").graph_hash.is_none());
        let created = application.rebuild_full(request.clone());
        assert_eq!(created.status, CitationMutationStatus::Promoted);
        assert_eq!(application.inspect().expect("inspect").node_count, 2);
        assert_eq!(
            application
                .rebuild_full(CitationRebuildRequest {
                    expected_graph_hash: created.graph_hash.clone(),
                    ..request
                })
                .status,
            CitationMutationStatus::Unchanged
        );
        assert_eq!(
            application
                .read()
                .expect("read view")
                .neighborhood(CitationGraphNeighborhoodRequest {
                    start_node_id: "paper:a".into(),
                    direction: CitationDirection::Both,
                    max_nodes: 10,
                    max_edges: 10,
                    filter: CitationGraphFilter::default(),
                })
                .expect("slice")
                .edges
                .len(),
            1
        );
        assert_eq!(
            application
                .read()
                .expect("read view")
                .metrics(CitationMetricsPageRequest {
                    cursor: 0,
                    limit: 1,
                    sort_by: CitationMetricsSort::Foundation,
                    paper_refs: Vec::new(),
                })
                .expect("metrics")
                .next_cursor,
            Some(1)
        );
        assert_eq!(
            application
                .recompute_layout(CitationLayoutRequest {
                    expected_graph_hash: created.graph_hash.expect("graph hash"),
                    layout_key: "layout:force".into(),
                    view_key: "overview".into(),
                    preset: "force".into(),
                })
                .status,
            CitationMutationStatus::Promoted
        );
        assert!(application.shutdown(Duration::from_secs(1)).is_ok());
        assert_eq!(
            application.refresh_metrics("sha256:graph").status,
            CitationMutationStatus::Stopping
        );
    }

    #[test]
    fn worker_failure_and_cas_supersession_preserve_last_good_graph() {
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
        let fail_build = Arc::new(AtomicBool::new(false));
        let application = CitationGraphApplication::with_factories(
            port,
            Arc::new(ToggleCompute {
                fail_build: fail_build.clone(),
            }),
            Arc::new(|| "2026-07-26T00:00:00.000Z".into()),
            Arc::new(|| "citation:failure".into()),
        );
        let created = application.rebuild_full(CitationRebuildRequest {
            expected_graph_hash: None,
            force: true,
            input: serde_json::json!({"scope":{"kind":"full"},"revision":1}),
        });
        assert_eq!(created.status, CitationMutationStatus::Promoted);
        let last_good = created.graph_hash.clone();

        let superseded = application.rebuild_full(CitationRebuildRequest {
            expected_graph_hash: Some("sha256:stale".into()),
            force: true,
            input: serde_json::json!({"scope":{"kind":"full"},"revision":2}),
        });
        assert_eq!(superseded.status, CitationMutationStatus::BasisMismatch);
        assert_eq!(superseded.graph_hash, last_good);

        fail_build.store(true, Ordering::Relaxed);
        let failed = application.rebuild_full(CitationRebuildRequest {
            expected_graph_hash: last_good.clone(),
            force: true,
            input: serde_json::json!({"scope":{"kind":"full"},"revision":3}),
        });
        assert_eq!(failed.status, CitationMutationStatus::WorkerFailed);
        assert_eq!(failed.graph_hash, last_good);
        assert_eq!(application.inspect().expect("inspect").node_count, 2);
    }

    #[test]
    fn read_view_rejects_stale_continuations_and_keeps_endpoint_closed_identity() {
        let root = root();
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("open repository");
        let port = Arc::new(
            RepositoryPort::new_with_readers(Arc::new(Mutex::new(repository)), 2)
                .expect("reader pool"),
        );
        let application = CitationGraphApplication::with_factories(
            port,
            Arc::new(VersionedCompute::unblocked()),
            Arc::new(|| "2026-07-26T00:00:00.000Z".into()),
            Arc::new(|| "citation:versioned".into()),
        );
        let first = application.rebuild_full(CitationRebuildRequest {
            expected_graph_hash: None,
            force: true,
            input: serde_json::json!({"scope":{"kind":"full"},"revision":1}),
        });
        assert_eq!(first.status, CitationMutationStatus::Promoted);
        let view = application.read().expect("read view");
        let request = CitationGraphPageRequest {
            node_limit: 1,
            edge_limit: 1,
            hover_node_limit: 1,
            hover_edge_limit: 1,
            ..CitationGraphPageRequest::default()
        };
        let page = view.first_page(request.clone()).expect("first page");
        let endpoints = page
            .edges
            .iter()
            .flat_map(|edge| [edge.source.as_str(), edge.target.as_str()])
            .collect::<BTreeSet<_>>();
        let returned = page
            .nodes
            .iter()
            .chain(page.endpoint_nodes.iter())
            .map(|node| node.node_id.as_str())
            .collect::<BTreeSet<_>>();
        assert!(endpoints.is_subset(&returned));
        let cursor = page.next_cursor.expect("bounded continuation");
        let metrics = view
            .metrics(CitationMetricsPageRequest {
                cursor: 0,
                limit: 1,
                sort_by: CitationMetricsSort::Foundation,
                paper_refs: Vec::new(),
            })
            .expect("basis-bound metrics");
        assert_eq!(metrics.basis, *view.basis());
        assert_eq!(metrics.records.len(), 1);
        assert_eq!(
            application
                .recompute_layout(CitationLayoutRequest {
                    expected_graph_hash: view.basis().graph_hash.clone(),
                    layout_key: "layout:force".into(),
                    view_key: "overview".into(),
                    preset: "force".into(),
                })
                .status,
            CitationMutationStatus::Promoted
        );
        assert_eq!(
            view.layout("layout:force", &[])
                .expect("basis-bound layout")
                .expect("ready layout")
                .graph_hash,
            view.basis().graph_hash
        );

        let second = application.rebuild_full(CitationRebuildRequest {
            expected_graph_hash: first.graph_hash,
            force: true,
            input: serde_json::json!({"scope":{"kind":"full"},"revision":2}),
        });
        assert_eq!(second.status, CitationMutationStatus::Promoted);
        assert_eq!(
            view.continue_page(request, &cursor).unwrap_err(),
            "basis_mismatch"
        );
        assert_eq!(
            application.read().expect("current view").basis().graph_hash,
            "sha256:graph-2"
        );
    }

    #[test]
    fn last_good_read_view_remains_available_while_rebuild_compute_is_blocked() {
        let root = root();
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("open repository");
        let port = Arc::new(
            RepositoryPort::new_with_readers(Arc::new(Mutex::new(repository)), 2)
                .expect("reader pool"),
        );
        let compute = VersionedCompute::blocking(2);
        let gate = Arc::clone(&compute.gate);
        let application = Arc::new(CitationGraphApplication::with_factories(
            port,
            Arc::new(compute),
            Arc::new(|| "2026-07-26T00:00:00.000Z".into()),
            Arc::new(|| "citation:blocking".into()),
        ));
        let first = application.rebuild_full(CitationRebuildRequest {
            expected_graph_hash: None,
            force: true,
            input: serde_json::json!({"scope":{"kind":"full"},"revision":1}),
        });
        let rebuilding = Arc::clone(&application);
        let worker = std::thread::spawn(move || {
            rebuilding.rebuild_full(CitationRebuildRequest {
                expected_graph_hash: first.graph_hash,
                force: true,
                input: serde_json::json!({"scope":{"kind":"full"},"revision":2}),
            })
        });
        {
            let (lock, ready) = &*gate;
            let mut state = lock.lock().expect("gate");
            while !state.0 {
                state = ready.wait(state).expect("wait for compute");
            }
        }

        let view = application.read().expect("last-good view");
        assert_eq!(view.basis().graph_hash, "sha256:graph-1");
        let slice = view
            .neighborhood(CitationGraphNeighborhoodRequest {
                start_node_id: "paper:1:a".into(),
                direction: CitationDirection::Both,
                max_nodes: 10,
                max_edges: 10,
                filter: CitationGraphFilter::default(),
            })
            .expect("read during compute");
        assert_eq!(slice.edges.len(), 1);

        {
            let (lock, ready) = &*gate;
            let mut state = lock.lock().expect("gate");
            state.1 = true;
            ready.notify_all();
        }
        assert_eq!(
            worker.join().expect("join").status,
            CitationMutationStatus::Promoted
        );
    }

    #[test]
    fn failed_collection_releases_its_attempt_and_retry_prepares_from_current_graph() {
        let root = root();
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("open repository");
        let application = CitationGraphApplication::new(
            Arc::new(RepositoryPort::new(Arc::new(Mutex::new(repository)))),
            Arc::new(VersionedCompute::unblocked()),
        );

        let failed = application
            .prepare_rebuild(CitationGraphRebuildMode::Full)
            .expect("first attempt");
        assert!(failed.plan().expected_graph_hash.is_none());
        assert_eq!(
            application
                .finish_rebuild(failed, Err("reverse_host_unavailable".into()), &|| Ok(()))
                .expect_err("collection failure"),
            "reverse_host_unavailable"
        );
        assert_eq!(
            application
                .latest_failed_rebuild_mode()
                .expect("failed mode"),
            Some(CitationGraphRebuildMode::Full)
        );

        let retry = application
            .prepare_rebuild(CitationGraphRebuildMode::Full)
            .expect("fresh retry attempt");
        let promoted = application
            .finish_rebuild(
                retry,
                Ok(CitationGraphRebuildMaterial {
                    input: serde_json::json!({"scope":{"kind":"full"},"revision":1}),
                    source_ids: Vec::new(),
                }),
                &|| Ok(()),
            )
            .expect("finish retry");
        assert_eq!(promoted.status, CitationMutationStatus::Promoted);

        let next = application
            .prepare_rebuild(CitationGraphRebuildMode::Full)
            .expect("next attempt");
        assert_eq!(
            next.plan().expected_graph_hash.as_deref(),
            Some("sha256:graph-1")
        );
        assert!(
            application
                .finish_rebuild(next, Err("stop".into()), &|| Ok(()))
                .is_err()
        );
    }
}
