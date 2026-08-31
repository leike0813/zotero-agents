use crate::ports::RepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeSet;
use std::sync::Arc;
use synthesis_repository::{
    CitationComplexMetricsRecord, CitationGraphApplicationStateRecord,
    CitationGraphNeighborhoodRows, CitationGraphWindowEdgeRecord, CitationGraphWindowFilter,
    CitationGraphWindowNodeRecord, CitationGraphWindowQuery, CitationLayoutWindowRecord,
    CitationMetricsPageQuery, CitationMetricsSort as RepositoryCitationMetricsSort, Repository,
};

const CACHE_KEY: &str = "citation-graph:library";
const CURSOR_MAX_LENGTH: usize = 4096;

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphBasis {
    pub graph_hash: String,
    pub input_hash: String,
    pub metrics_hash: Option<String>,
}

impl From<Option<CitationGraphApplicationStateRecord>> for CitationGraphBasis {
    fn from(state: Option<CitationGraphApplicationStateRecord>) -> Self {
        state.map_or_else(Self::default, |state| Self {
            graph_hash: state.graph_hash,
            input_hash: state.input_hash,
            metrics_hash: state.metrics_hash,
        })
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphFilter {
    #[serde(default)]
    pub node_kinds: Vec<String>,
    #[serde(default)]
    pub roles: Vec<String>,
    #[serde(default)]
    pub include_low_signal: bool,
    #[serde(default)]
    pub search: String,
    pub topic_node_ids: Option<Vec<String>>,
}

impl CitationGraphFilter {
    fn repository_filter(&self) -> CitationGraphWindowFilter {
        CitationGraphWindowFilter {
            node_kinds: self.node_kinds.clone(),
            roles: self.roles.clone(),
            include_low_signal: self.include_low_signal,
            search: self.search.clone(),
            topic_node_ids: self.topic_node_ids.clone(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphPageRequest {
    pub node_limit: usize,
    pub edge_limit: usize,
    pub hover_node_limit: usize,
    pub hover_edge_limit: usize,
    pub layout_algorithm: String,
    pub filter: CitationGraphFilter,
}

impl Default for CitationGraphPageRequest {
    fn default() -> Self {
        Self {
            node_limit: 200,
            edge_limit: 400,
            hover_node_limit: 100,
            hover_edge_limit: 200,
            layout_algorithm: "force".into(),
            filter: CitationGraphFilter::default(),
        }
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphLightMetrics {
    pub outgoing_count: i64,
    pub incoming_count: i64,
    pub matched_outgoing_count: i64,
    pub unresolved_outgoing_count: i64,
    pub ambiguous_outgoing_count: i64,
    pub local_degree: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphNode {
    pub node_id: String,
    pub status: String,
    pub has_zotero_binding: bool,
    pub title: String,
    pub year: String,
    pub authors: Vec<String>,
    pub external_degree: Option<usize>,
    pub visibility: String,
    pub light_metrics: Option<CitationGraphLightMetrics>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphRoleEvidence {
    pub role: String,
    pub count: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphEdge {
    pub edge_id: String,
    pub source: String,
    pub target: String,
    pub reference_instance_id: String,
    pub status: String,
    pub roles: Vec<CitationGraphRoleEvidence>,
    pub weight: f64,
    pub visibility: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphPage {
    pub basis: CitationGraphBasis,
    pub query_signature: String,
    pub cursor: String,
    pub next_cursor: Option<String>,
    pub nodes: Vec<CitationGraphNode>,
    pub edges: Vec<CitationGraphEdge>,
    pub hover_nodes: Vec<CitationGraphNode>,
    pub hover_edges: Vec<CitationGraphEdge>,
    pub endpoint_nodes: Vec<CitationGraphNode>,
    pub total_nodes: usize,
    pub total_edges: usize,
    pub total_hover_nodes: usize,
    pub total_hover_edges: usize,
    pub role_options: Vec<String>,
    pub cache_status: String,
    pub layout: Option<CitationGraphLayout>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphNeighborhoodRequest {
    pub start_node_id: String,
    pub direction: super::CitationDirection,
    pub max_nodes: usize,
    pub max_edges: usize,
    pub filter: CitationGraphFilter,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphNeighborhood {
    pub basis: CitationGraphBasis,
    pub nodes: Vec<CitationGraphNode>,
    pub edges: Vec<CitationGraphEdge>,
    pub truncated: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphMetric {
    pub node_id: String,
    pub paper_ref: String,
    pub item_key: String,
    pub title: String,
    pub year: String,
    pub internal_in_degree: i64,
    pub internal_out_degree: i64,
    pub external_reference_count: i64,
    pub unresolved_reference_count: i64,
    pub internal_pagerank: f64,
    pub component_id: String,
    pub component_size: i64,
    pub is_isolated: bool,
    pub age_norm: f64,
    pub recency_norm: f64,
    pub in_degree_norm: f64,
    pub out_degree_norm: f64,
    pub pagerank_norm: f64,
    pub foundation_score: f64,
    pub frontier_score: f64,
    pub synthesis_role_hints: Value,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphMetricsPage {
    pub basis: CitationGraphBasis,
    pub records: Vec<CitationGraphMetric>,
    pub cursor: usize,
    pub next_cursor: Option<usize>,
    pub total: usize,
    pub stale: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphLayoutPoint {
    pub node_id: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphLayout {
    pub layout_key: String,
    pub view_key: String,
    pub preset: String,
    pub graph_hash: String,
    pub layout_hash: String,
    pub layout_version: i64,
    pub status: String,
    pub points: Vec<CitationGraphLayoutPoint>,
}

#[derive(Clone, Copy, Debug, Default)]
struct WindowCursor {
    node_offset: usize,
    edge_offset: usize,
    hover_node_offset: usize,
    hover_edge_offset: usize,
}

#[derive(Clone)]
pub struct CitationGraphReadView {
    repository: Arc<RepositoryPort>,
    basis: CitationGraphBasis,
}

impl CitationGraphReadView {
    pub(super) fn new(repository: Arc<RepositoryPort>, basis: CitationGraphBasis) -> Self {
        Self { repository, basis }
    }

    pub fn basis(&self) -> &CitationGraphBasis {
        &self.basis
    }

    pub fn first_page(
        &self,
        request: CitationGraphPageRequest,
    ) -> Result<CitationGraphPage, String> {
        self.page(request, WindowCursor::default())
    }

    pub fn continue_page(
        &self,
        request: CitationGraphPageRequest,
        cursor: &str,
    ) -> Result<CitationGraphPage, String> {
        let signature = query_signature(&request)?;
        self.page(
            request,
            decode_cursor(cursor, &self.basis.graph_hash, &signature)?,
        )
    }

    pub fn neighborhood(
        &self,
        request: CitationGraphNeighborhoodRequest,
    ) -> Result<CitationGraphNeighborhood, String> {
        if request.start_node_id.is_empty()
            || request.max_nodes == 0
            || request.max_nodes > 100
            || request.max_edges > 200
        {
            return Err("invalid_request".into());
        }
        let direction = match request.direction {
            super::CitationDirection::Incoming => "incoming",
            super::CitationDirection::Outgoing => "outgoing",
            super::CitationDirection::Both => "both",
        };
        let rows = self.guarded(|repository| {
            repository.read_citation_graph_neighborhood(
                &request.start_node_id,
                direction,
                request.max_nodes,
                request.max_edges,
                &request.filter.repository_filter(),
            )
        })?;
        Ok(neighborhood(&self.basis, rows))
    }

    pub fn explicit(
        &self,
        node_ids: &[String],
        max_edges: usize,
        filter: &CitationGraphFilter,
    ) -> Result<CitationGraphNeighborhood, String> {
        let rows = self.guarded(|repository| {
            repository.read_citation_graph_explicit(
                node_ids,
                max_edges,
                &filter.repository_filter(),
            )
        })?;
        Ok(neighborhood(&self.basis, rows))
    }

    pub fn metrics(
        &self,
        request: super::CitationMetricsPageRequest,
    ) -> Result<CitationGraphMetricsPage, String> {
        if request.limit == 0 || request.limit > 100 || request.paper_refs.len() > 250 {
            return Err("invalid_request".into());
        }
        let page = self.guarded(|repository| {
            repository.read_citation_metrics_page(&CitationMetricsPageQuery {
                offset: request.cursor,
                limit: request.limit,
                sort_by: match request.sort_by {
                    super::CitationMetricsSort::Foundation => {
                        RepositoryCitationMetricsSort::Foundation
                    }
                    super::CitationMetricsSort::Frontier => RepositoryCitationMetricsSort::Frontier,
                    super::CitationMetricsSort::Pagerank => RepositoryCitationMetricsSort::Pagerank,
                    super::CitationMetricsSort::InDegree => RepositoryCitationMetricsSort::InDegree,
                },
                paper_refs: request.paper_refs,
            })
        })?;
        let next = request.cursor + page.records.len();
        Ok(CitationGraphMetricsPage {
            basis: self.basis.clone(),
            records: page.records.into_iter().map(metric).collect(),
            cursor: request.cursor,
            next_cursor: (next < page.total).then_some(next),
            total: page.total,
            stale: page.stale,
        })
    }

    pub fn layout(
        &self,
        layout_key: &str,
        node_ids: &[String],
    ) -> Result<Option<CitationGraphLayout>, String> {
        self.guarded(|repository| repository.read_citation_layout_window(layout_key, node_ids))
            .map(|record| record.map(layout))
    }

    fn page(
        &self,
        request: CitationGraphPageRequest,
        cursor: WindowCursor,
    ) -> Result<CitationGraphPage, String> {
        if request.node_limit == 0
            || request.edge_limit == 0
            || request.hover_node_limit == 0
            || request.hover_edge_limit == 0
            || [
                request.node_limit,
                request.edge_limit,
                request.hover_node_limit,
                request.hover_edge_limit,
            ]
            .into_iter()
            .any(|limit| limit > 500)
            || !matches!(
                request.layout_algorithm.as_str(),
                "force" | "radial" | "components"
            )
        {
            return Err("invalid_request".into());
        }
        let signature = query_signature(&request)?;
        self.guarded(|repository| {
            let rows = repository.read_citation_graph_window(&CitationGraphWindowQuery {
                node_offset: cursor.node_offset,
                node_limit: request.node_limit,
                edge_offset: cursor.edge_offset,
                edge_limit: request.edge_limit,
                hover_node_offset: cursor.hover_node_offset,
                hover_node_limit: request.hover_node_limit,
                hover_edge_offset: cursor.hover_edge_offset,
                hover_edge_limit: request.hover_edge_limit,
                filter: request.filter.repository_filter(),
            })?;
            let next = WindowCursor {
                node_offset: cursor.node_offset + rows.nodes.len(),
                edge_offset: cursor.edge_offset + rows.edges.len(),
                hover_node_offset: cursor.hover_node_offset + rows.hover_nodes.len(),
                hover_edge_offset: cursor.hover_edge_offset + rows.hover_edges.len(),
            };
            let has_more = next.node_offset < rows.total_nodes
                || next.edge_offset < rows.total_edges
                || next.hover_node_offset < rows.total_hover_nodes
                || next.hover_edge_offset < rows.total_hover_edges;
            let layout_node_ids = rows
                .nodes
                .iter()
                .chain(
                    rows.endpoint_nodes
                        .iter()
                        .filter(|node| node.visibility == "default"),
                )
                .map(|node| node.record.literature_item_id.clone())
                .collect::<BTreeSet<_>>()
                .into_iter()
                .collect::<Vec<_>>();
            let layout = repository
                .read_citation_layout_window(
                    &format!("workbench_overview:{}", request.layout_algorithm),
                    &layout_node_ids,
                )?
                .map(layout);
            let cache_status = repository
                .get_cache_basis(CACHE_KEY)?
                .map(|cache| cache.status)
                .filter(|status| !status.is_empty())
                .unwrap_or_else(|| "missing".into());
            Ok(CitationGraphPage {
                basis: self.basis.clone(),
                query_signature: signature.clone(),
                cursor: encode_cursor(&self.basis.graph_hash, &signature, &cursor),
                next_cursor: has_more
                    .then(|| encode_cursor(&self.basis.graph_hash, &signature, &next)),
                nodes: rows.nodes.into_iter().map(node).collect(),
                edges: rows.edges.into_iter().map(edge).collect(),
                hover_nodes: rows.hover_nodes.into_iter().map(node).collect(),
                hover_edges: rows.hover_edges.into_iter().map(edge).collect(),
                endpoint_nodes: rows.endpoint_nodes.into_iter().map(node).collect(),
                total_nodes: rows.total_nodes,
                total_edges: rows.total_edges,
                total_hover_nodes: rows.total_hover_nodes,
                total_hover_edges: rows.total_hover_edges,
                role_options: rows.role_options,
                cache_status,
                layout,
            })
        })
    }

    fn guarded<T>(
        &self,
        operation: impl FnOnce(&Repository) -> Result<T, String>,
    ) -> Result<T, String> {
        self.repository.with_reader(|repository| {
            let current =
                CitationGraphBasis::from(repository.get_citation_graph_application_state()?);
            if current != self.basis {
                return Err("basis_mismatch".into());
            }
            operation(repository)
        })
    }
}

fn query_signature(request: &CitationGraphPageRequest) -> Result<String, String> {
    synthesis_protocol::canonical_sha256(&json!({
        "nodeKinds": request.filter.node_kinds,
        "roles": request.filter.roles,
        "includeLowSignal": request.filter.include_low_signal,
        "search": request.filter.search,
        "topicNodeIds": request.filter.topic_node_ids,
        "layoutAlgorithm": request.layout_algorithm,
    }))
    .map_err(|_| "invalid_request".into())
}

fn encode_cursor(graph_hash: &str, signature: &str, cursor: &WindowCursor) -> String {
    format!(
        "cg1|{graph_hash}|{signature}|{}|{}|{}|{}",
        cursor.node_offset, cursor.edge_offset, cursor.hover_node_offset, cursor.hover_edge_offset
    )
}

fn decode_cursor(value: &str, graph_hash: &str, signature: &str) -> Result<WindowCursor, String> {
    if value.len() > CURSOR_MAX_LENGTH {
        return Err("invalid_request".into());
    }
    let fields = value.split('|').collect::<Vec<_>>();
    if fields.len() != 7 || fields[0] != "cg1" {
        return Err("invalid_request".into());
    }
    if fields[1] != graph_hash || fields[2] != signature {
        return Err("basis_mismatch".into());
    }
    let offset = |value: &str| {
        value
            .parse::<usize>()
            .map_err(|_| "invalid_request".to_owned())
    };
    Ok(WindowCursor {
        node_offset: offset(fields[3])?,
        edge_offset: offset(fields[4])?,
        hover_node_offset: offset(fields[5])?,
        hover_edge_offset: offset(fields[6])?,
    })
}

fn node(row: CitationGraphWindowNodeRecord) -> CitationGraphNode {
    let authors = serde_json::from_str::<Vec<String>>(&row.record.authors_json).unwrap_or_default();
    CitationGraphNode {
        node_id: row.record.literature_item_id,
        status: row.record.node_status,
        has_zotero_binding: row.record.has_zotero_binding,
        title: row.record.title,
        year: row.record.year,
        authors,
        external_degree: (!row.record.has_zotero_binding)
            .then_some(row.external_degree.max(0) as usize),
        visibility: row.visibility,
        light_metrics: row.light_metrics.map(|metrics| CitationGraphLightMetrics {
            outgoing_count: metrics.outgoing_count,
            incoming_count: metrics.incoming_count,
            matched_outgoing_count: metrics.matched_outgoing_count,
            unresolved_outgoing_count: metrics.unresolved_outgoing_count,
            ambiguous_outgoing_count: metrics.ambiguous_outgoing_count,
            local_degree: metrics.local_degree,
        }),
    }
}

fn roles(value: &str) -> Vec<CitationGraphRoleEvidence> {
    let mut roles = std::collections::BTreeMap::<String, i64>::new();
    for entry in serde_json::from_str::<Value>(value)
        .ok()
        .and_then(|value| value.as_array().cloned())
        .unwrap_or_default()
    {
        let role = entry
            .as_str()
            .or_else(|| entry.get("role").and_then(Value::as_str))
            .unwrap_or_default();
        if !role.is_empty() {
            *roles.entry(role.to_owned()).or_default() += entry
                .get("count")
                .and_then(Value::as_i64)
                .unwrap_or(1)
                .max(1);
        }
    }
    if roles.is_empty() {
        roles.insert("unknown".into(), 1);
    }
    roles
        .into_iter()
        .map(|(role, count)| CitationGraphRoleEvidence { role, count })
        .collect()
}

fn edge(row: CitationGraphWindowEdgeRecord) -> CitationGraphEdge {
    CitationGraphEdge {
        edge_id: row.record.edge_id,
        source: row.record.source_literature_item_id,
        target: row.record.target_literature_item_id,
        reference_instance_id: row.record.reference_instance_id,
        status: row.record.edge_status,
        roles: roles(&row.record.roles_json),
        weight: row.record.weight,
        visibility: row.visibility,
    }
}

fn neighborhood(
    basis: &CitationGraphBasis,
    rows: CitationGraphNeighborhoodRows,
) -> CitationGraphNeighborhood {
    CitationGraphNeighborhood {
        basis: basis.clone(),
        nodes: rows.nodes.into_iter().map(node).collect(),
        edges: rows.edges.into_iter().map(edge).collect(),
        truncated: rows.truncated,
    }
}

fn metric(record: CitationComplexMetricsRecord) -> CitationGraphMetric {
    CitationGraphMetric {
        node_id: record.node_id,
        paper_ref: record.paper_ref,
        item_key: record.item_key,
        title: record.title,
        year: record.year,
        internal_in_degree: record.internal_in_degree,
        internal_out_degree: record.internal_out_degree,
        external_reference_count: record.external_reference_count,
        unresolved_reference_count: record.unresolved_reference_count,
        internal_pagerank: record.internal_pagerank,
        component_id: record.component_id,
        component_size: record.component_size,
        is_isolated: record.is_isolated,
        age_norm: record.age_norm,
        recency_norm: record.recency_norm,
        in_degree_norm: record.in_degree_norm,
        out_degree_norm: record.out_degree_norm,
        pagerank_norm: record.pagerank_norm,
        foundation_score: record.foundation_score,
        frontier_score: record.frontier_score,
        synthesis_role_hints: serde_json::from_str(&record.synthesis_role_hints_json)
            .unwrap_or_else(|_| json!([])),
    }
}

fn layout(record: CitationLayoutWindowRecord) -> CitationGraphLayout {
    CitationGraphLayout {
        layout_key: record.metadata.layout_key,
        view_key: record.metadata.view_key,
        preset: record.metadata.preset,
        graph_hash: record.metadata.graph_hash,
        layout_hash: record.metadata.layout_hash,
        layout_version: record.metadata.layout_version,
        status: record.metadata.status,
        points: record
            .points
            .into_iter()
            .map(|point| CitationGraphLayoutPoint {
                node_id: point.node_id,
                x: point.x,
                y: point.y,
            })
            .collect(),
    }
}
