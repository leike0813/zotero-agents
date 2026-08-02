use crate::PromotionCheckpoint;
use crate::ports::CitationGraphRepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeSet, HashMap, HashSet, VecDeque};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;
#[cfg(test)]
use std::time::{SystemTime, UNIX_EPOCH};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    CitationComplexMetricsRecord, CitationEdgeRecord, CitationGraphReplacement,
    CitationLayoutRecord, CitationLayoutWindowRecord, CitationMetricsPageQuery,
    CitationMetricsSort as RepositoryCitationMetricsSort, CitationNodeRecord, OperationRecord,
};

const MAX_INPUT_BYTES: usize = 8 * 1024 * 1024;
const MAX_INPUT_NODES: usize = 250_000;
const MAX_RESULT_NODES: usize = 50_000;
pub const CITATION_GRAPH_LAYOUT_NODE_MAX: usize = 20_000;
pub const CITATION_GRAPH_LAYOUT_EDGE_MAX: usize = 80_000;

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

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationSliceRequest {
    pub root_node_id: String,
    pub depth: usize,
    pub direction: CitationDirection,
    pub max_nodes: usize,
    pub max_edges: usize,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationSliceResult {
    pub nodes: Vec<CitationNodeRecord>,
    pub edges: Vec<CitationEdgeRecord>,
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

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationMetricsPage {
    pub records: Vec<CitationComplexMetricsRecord>,
    pub cursor: usize,
    pub next_cursor: Option<usize>,
    pub returned: usize,
    pub total: usize,
    pub has_more: bool,
    pub stale: bool,
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
    repository: Arc<dyn CitationGraphRepositoryPort>,
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
        repository: Arc<dyn CitationGraphRepositoryPort>,
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
        repository: Arc<dyn CitationGraphRepositoryPort>,
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
        let state = self.repository.get_state()?;
        let presets = state.as_ref().map_or_else(
            || Ok(Vec::new()),
            |state| self.repository.list_ready_layout_presets(&state.graph_hash),
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

    pub fn rebuild_full(&self, request: CitationRebuildRequest) -> CitationMutationResult {
        self.rebuild(request, None, None)
    }

    pub fn rebuild_full_with_checkpoint(
        &self,
        request: CitationRebuildRequest,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> CitationMutationResult {
        self.rebuild(request, None, Some(checkpoint))
    }

    pub fn rebuild_source_slice(
        &self,
        request: CitationRebuildRequest,
        source_ids: &[String],
    ) -> CitationMutationResult {
        if source_ids.is_empty() || request.expected_graph_hash.is_none() {
            return self.result(CitationMutationStatus::InvalidRequest, Vec::new());
        }
        self.rebuild(request, Some(source_ids), None)
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
        self.rebuild(request, Some(source_ids), Some(checkpoint))
    }

    fn rebuild(
        &self,
        request: CitationRebuildRequest,
        source_ids: Option<&[String]>,
        checkpoint: Option<&PromotionCheckpoint<'_>>,
    ) -> CitationMutationResult {
        let input_hash = match validate_rebuild(&request, source_ids) {
            Ok(hash) => hash,
            Err(_) => return self.result(CitationMutationStatus::InvalidRequest, Vec::new()),
        };
        let current = match self.repository.get_state() {
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
        let (cancel, _active) = match self.admit() {
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
        if self.repository.upsert_operation(&receipt).is_err() {
            warnings.push("citation_graph_operation_receipt_failed".into());
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
        replacement.state.input_hash = input_hash;
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
        let promoted_hash = match source_ids {
            Some(source_ids) => match self.repository.replace_source_slice(
                request.expected_graph_hash.as_deref().unwrap_or_default(),
                source_ids,
                &replacement,
            ) {
                Ok(value) => value,
                Err(_) => {
                    self.finish_operation(
                        &operation_id,
                        "failed",
                        "projection_failed",
                        &mut warnings,
                    );
                    return self.result(CitationMutationStatus::RepairRequired, warnings);
                }
            },
            None => match self
                .repository
                .replace(request.expected_graph_hash.as_deref(), &replacement)
            {
                Ok(true) => Some(graph_hash.clone()),
                Ok(false) => None,
                Err(_) => {
                    self.finish_operation(
                        &operation_id,
                        "failed",
                        "projection_failed",
                        &mut warnings,
                    );
                    return self.result(CitationMutationStatus::RepairRequired, warnings);
                }
            },
        };
        let Some(promoted_hash) = promoted_hash else {
            self.finish_operation(&operation_id, "failed", "basis_mismatch", &mut warnings);
            return self.result(CitationMutationStatus::BasisMismatch, warnings);
        };
        if let Err(error) = self.refresh_metrics_inner(&promoted_hash, &cancel, None)
            && error != "basis_mismatch"
        {
            warnings.push("citation_graph_metrics_refresh_failed".into());
        }
        self.finish_operation(&operation_id, "succeeded", "completed", &mut warnings);
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
        let nodes = match self.repository.list_nodes() {
            Ok(nodes) => nodes,
            Err(_) => return self.result(CitationMutationStatus::RepairRequired, Vec::new()),
        };
        let edges = match self.repository.list_edges() {
            Ok(edges) => edges,
            Err(_) => return self.result(CitationMutationStatus::RepairRequired, Vec::new()),
        };
        let projection = project_citation_graph_default(nodes, edges);
        let mut layout =
            match self
                .compute
                .layout(&request, &projection.nodes, &projection.edges, &cancel)
            {
                Ok(layout) => layout,
                Err(error) => return self.result(worker_status(&error), Vec::new()),
            };
        layout.graph_hash = request.expected_graph_hash.clone();
        if checkpoint().is_err() {
            return self.result(CitationMutationStatus::Stopping, Vec::new());
        }
        match self
            .repository
            .promote_layout(&request.expected_graph_hash, &layout)
        {
            Ok(true) => self.result(CitationMutationStatus::Promoted, Vec::new()),
            Ok(false) => self.result(CitationMutationStatus::BasisMismatch, Vec::new()),
            Err(_) => self.result(CitationMutationStatus::RepairRequired, Vec::new()),
        }
    }

    pub fn read_slice(&self, request: CitationSliceRequest) -> Result<CitationSliceResult, String> {
        if request.root_node_id.is_empty()
            || !(1..=2).contains(&request.depth)
            || request.max_nodes == 0
            || request.max_nodes > 200
            || request.max_edges == 0
            || request.max_edges > 500
        {
            return Err("invalid_request".into());
        }
        let nodes = self.repository.list_nodes()?;
        let edges = self.repository.list_edges()?;
        let by_id = nodes
            .into_iter()
            .map(|node| (node.literature_item_id.clone(), node))
            .collect::<HashMap<_, _>>();
        if !by_id.contains_key(&request.root_node_id) {
            return Ok(CitationSliceResult {
                nodes: Vec::new(),
                edges: Vec::new(),
            });
        }
        let mut selected = BTreeSet::from([request.root_node_id.clone()]);
        let mut queue = VecDeque::from([(request.root_node_id, 0usize)]);
        while let Some((node, depth)) = queue.pop_front() {
            if depth >= request.depth || selected.len() >= request.max_nodes {
                continue;
            }
            for edge in &edges {
                let candidate = match request.direction {
                    CitationDirection::Outgoing if edge.source_literature_item_id == node => {
                        Some(edge.target_literature_item_id.as_str())
                    }
                    CitationDirection::Incoming if edge.target_literature_item_id == node => {
                        Some(edge.source_literature_item_id.as_str())
                    }
                    CitationDirection::Both if edge.source_literature_item_id == node => {
                        Some(edge.target_literature_item_id.as_str())
                    }
                    CitationDirection::Both if edge.target_literature_item_id == node => {
                        Some(edge.source_literature_item_id.as_str())
                    }
                    _ => None,
                };
                if let Some(candidate) = candidate
                    && by_id.contains_key(candidate)
                    && selected.insert(candidate.to_owned())
                {
                    queue.push_back((candidate.to_owned(), depth + 1));
                    if selected.len() >= request.max_nodes {
                        break;
                    }
                }
            }
        }
        let selected_set = selected.iter().cloned().collect::<HashSet<_>>();
        let result_nodes = selected
            .into_iter()
            .filter_map(|id| by_id.get(&id).cloned())
            .collect();
        let result_edges = edges
            .into_iter()
            .filter(|edge| {
                selected_set.contains(&edge.source_literature_item_id)
                    && selected_set.contains(&edge.target_literature_item_id)
            })
            .take(request.max_edges)
            .collect();
        Ok(CitationSliceResult {
            nodes: result_nodes,
            edges: result_edges,
        })
    }

    pub fn read_metrics(
        &self,
        request: CitationMetricsPageRequest,
    ) -> Result<CitationMetricsPage, String> {
        if request.limit == 0 || request.limit > 100 || request.paper_refs.len() > 250 {
            return Err("invalid_request".into());
        }
        let page = self
            .repository
            .read_metrics_page(&CitationMetricsPageQuery {
                offset: request.cursor,
                limit: request.limit,
                sort_by: match request.sort_by {
                    CitationMetricsSort::Foundation => RepositoryCitationMetricsSort::Foundation,
                    CitationMetricsSort::Frontier => RepositoryCitationMetricsSort::Frontier,
                    CitationMetricsSort::Pagerank => RepositoryCitationMetricsSort::Pagerank,
                    CitationMetricsSort::InDegree => RepositoryCitationMetricsSort::InDegree,
                },
                paper_refs: request.paper_refs,
            })?;
        let records = page.records;
        let next = request.cursor + records.len();
        let has_more = next < page.total;
        Ok(CitationMetricsPage {
            returned: records.len(),
            records,
            cursor: request.cursor,
            next_cursor: has_more.then_some(next),
            has_more,
            total: page.total,
            stale: page.stale,
        })
    }

    pub fn read_layout_window(
        &self,
        layout_key: &str,
        node_ids: &[String],
    ) -> Result<Option<CitationLayoutWindowRecord>, String> {
        self.repository.read_layout_window(layout_key, node_ids)
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
        Ok((cancel, ActiveMutation(self)))
    }

    fn refresh_metrics_inner(
        &self,
        graph_hash: &str,
        canceled: &Arc<AtomicBool>,
        checkpoint: Option<&PromotionCheckpoint<'_>>,
    ) -> Result<bool, String> {
        if self
            .repository
            .get_state()?
            .as_ref()
            .map(|state| state.graph_hash.as_str())
            != Some(graph_hash)
        {
            return Err("basis_mismatch".into());
        }
        let nodes = self.repository.list_nodes()?;
        let edges = self.repository.list_edges()?;
        let output = self.compute.metrics(graph_hash, &nodes, &edges, canceled)?;
        if checkpoint.is_some_and(|checkpoint| checkpoint().is_err()) {
            return Err("stopping".into());
        }
        self.repository.promote_metrics(
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
        if self
            .repository
            .update_operation(operation_id, status, phase, &[], &(self.now)())
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
        let state = self.repository.get_state().ok().flatten();
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
    use std::path::PathBuf;
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
                edge_status: "matched".into(),
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
                        edge_status: "matched".into(),
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

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-citation-application-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
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
        assert_eq!(projection.hover_edges.len(), 1);
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
                .read_slice(CitationSliceRequest {
                    root_node_id: "paper:a".into(),
                    depth: 1,
                    direction: CitationDirection::Both,
                    max_nodes: 10,
                    max_edges: 10,
                })
                .expect("slice")
                .edges
                .len(),
            1
        );
        assert_eq!(
            application
                .read_metrics(CitationMetricsPageRequest {
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
        let _ = std::fs::remove_dir_all(root);
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
        let _ = std::fs::remove_dir_all(root);
    }
}
