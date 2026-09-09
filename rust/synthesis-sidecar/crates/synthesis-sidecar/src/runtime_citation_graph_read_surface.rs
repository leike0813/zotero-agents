use crate::runtime_production_ports::ProductionApplications;
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet, HashSet};
use synthesis_application::citation_graph::{
    CitationGraphEdge as ApplicationCitationGraphEdge,
    CitationGraphFilter as ApplicationCitationGraphFilter,
    CitationGraphLayout as ApplicationCitationGraphLayout,
    CitationGraphMetric as ApplicationCitationGraphMetric, CitationGraphNeighborhoodRequest,
    CitationGraphNode as ApplicationCitationGraphNode, CitationGraphPage, CitationGraphPageRequest,
    CitationMetricsPageRequest, CitationMetricsSort as ApplicationCitationMetricsSort,
};
use synthesis_protocol::canonical_sha256;
use synthesis_repository::{CitationEdgeRecord, CitationNodeRecord};

const CACHE_KEY: &str = "citation-graph:library";
const LAYOUT_VERSION: i64 = 2;
const MAX_LIMIT: usize = 500;
const DEFAULT_NODE_LIMIT: usize = 200;
const DEFAULT_EDGE_LIMIT: usize = 400;
const DEFAULT_HOVER_NODE_LIMIT: usize = 100;
const DEFAULT_HOVER_EDGE_LIMIT: usize = 200;
const GRAPH_RESPONSE_BUDGET_BYTES: usize = 768 * 1024;
const DEFAULT_TOPIC_SCOPE_LIMIT: usize = 50;
const MAX_TOPIC_SCOPE_LIMIT: usize = 250;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(untagged)]
enum CursorValue {
    Text(String),
    Number(u64),
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GraphWindowLimitsDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    node_limit: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    edge_limit: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    hover_node_limit: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    hover_edge_limit: Option<usize>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GraphBasisDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    expected_graph_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    layout_algorithm: Option<LayoutAlgorithmDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    topic_id: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum LayoutAlgorithmDto {
    Force,
    Radial,
    Components,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum GraphNodeKindDto {
    LibraryPaper,
    ExternalReference,
    UnresolvedReference,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GraphFiltersDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    topic_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    node_kinds: Option<Vec<GraphNodeKindDto>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    roles: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    include_low_signal: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    search: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GraphQueryDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    cursor: Option<CursorValue>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    limit: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    window_cursor: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    window: Option<GraphWindowLimitsDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    basis: Option<GraphBasisDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    filters: Option<GraphFiltersDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    layout_algorithm: Option<LayoutAlgorithmDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    node_cursor: Option<CursorValue>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    node_limit: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    edge_cursor: Option<CursorValue>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    edge_limit: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    hover_node_cursor: Option<CursorValue>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    hover_node_limit: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    hover_edge_cursor: Option<CursorValue>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    hover_edge_limit: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    topic_scope_cursor: Option<CursorValue>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    topic_scope_limit: Option<usize>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum GraphDirectionDto {
    Incoming,
    Outgoing,
    Both,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GraphSliceDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    start_node_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    paper_ref: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    depth: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    direction: Option<GraphDirectionDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    max_nodes: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    max_edges: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    expected_graph_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    query_signature: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    filters: Option<GraphFiltersDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    layout_algorithm: Option<LayoutAlgorithmDto>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GraphLayoutReadDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    scope: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    preset: Option<LayoutAlgorithmDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    algorithm: Option<LayoutAlgorithmDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    view_key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    start_node_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    paper_ref: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    node_ids: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    paper_refs: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    depth: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    direction: Option<GraphDirectionDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    include_low_signal: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    role_filter: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    max_nodes: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    max_edges: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    allow_truncated: Option<bool>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum MetricsSortDto {
    Foundation,
    Frontier,
    Pagerank,
    InDegree,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GraphMetricsDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    cursor: Option<CursorValue>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    limit: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    sort_by: Option<MetricsSortDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    paper_refs: Option<Vec<String>>,
}

fn typed_request<T>(args: &[Value]) -> Result<Map<String, Value>, String>
where
    T: DeserializeOwned + Serialize + Default,
{
    let decoded = match args {
        [] => T::default(),
        [value] => serde_json::from_value(value.clone()).map_err(|_| "invalid_request")?,
        _ => return Err("invalid_request".into()),
    };
    match serde_json::to_value(decoded).map_err(|_| "invalid_request")? {
        Value::Object(object) => Ok(object),
        _ => Err("invalid_request".into()),
    }
}

#[derive(Clone, Debug)]
struct GraphWindowRead {
    page: CitationGraphPage,
    topic_scopes: Vec<Value>,
    topic_scope_cursor: usize,
    topic_scope_limit: usize,
    topic_scope_total: usize,
}

#[derive(Clone, Debug)]
struct ProjectedNode {
    record: CitationNodeRecord,
    external_degree: Option<usize>,
    visibility: &'static str,
    display_tier: &'static str,
}

fn read_topic_scopes(
    repository: &synthesis_repository::Repository,
    request: &Map<String, Value>,
) -> Result<(Vec<Value>, usize, usize, usize), String> {
    let mut topic_scopes = Vec::new();
    let cursor = usize_field(
        request,
        &["topicScopeCursor", "topic_scope_cursor"],
        0,
        usize::MAX,
    );
    let limit = usize_field(
        request,
        &["topicScopeLimit", "topic_scope_limit"],
        DEFAULT_TOPIC_SCOPE_LIMIT,
        MAX_TOPIC_SCOPE_LIMIT,
    )
    .max(1);
    let (records, total) = repository.list_topic_graph_scope_records(cursor, limit)?;
    for record in records {
        let paper_refs = serde_json::from_str::<Value>(&record.source_paper_refs_json)
            .ok()
            .and_then(|value| value.as_array().cloned())
            .unwrap_or_default()
            .into_iter()
            .filter_map(|value| value.as_str().map(str::to_owned))
            .filter(|value| !value.is_empty())
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        if !paper_refs.is_empty() {
            topic_scopes.push(json!({
                "topicId":record.topic_id,
                "title":if record.title.is_empty() { record.topic_id.clone() } else { record.title },
                "paperCount":record.paper_count,
                "paperRefTotal":record.source_paper_ref_total,
                "paperRefsTruncated":paper_refs.len() < record.source_paper_ref_total.max(0) as usize,
                "paperRefs":paper_refs,
                "nodeIds":paper_refs,
            }));
        }
    }
    topic_scopes.sort_by(|left, right| {
        left["title"]
            .as_str()
            .cmp(&right["title"].as_str())
            .then_with(|| left["topicId"].as_str().cmp(&right["topicId"].as_str()))
    });
    Ok((topic_scopes, cursor, limit, total))
}

fn authors(value: &str) -> Vec<String> {
    serde_json::from_str::<Value>(value)
        .ok()
        .and_then(|value| value.as_array().cloned())
        .unwrap_or_default()
        .into_iter()
        .filter_map(|value| value.as_str().map(str::to_owned))
        .filter(|value| !value.is_empty())
        .collect()
}

fn bounded_text(value: &str) -> String {
    value.chars().take(500).collect()
}

fn roles(value: &str) -> Vec<(String, i64)> {
    let mut result = BTreeMap::<String, i64>::new();
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
            let count = entry
                .get("count")
                .and_then(Value::as_i64)
                .unwrap_or(1)
                .max(1);
            *result.entry(role.to_owned()).or_default() += count;
        }
    }
    if result.is_empty() {
        result.insert("unknown".into(), 1);
    }
    result.into_iter().collect()
}

fn public_node(node: &ProjectedNode) -> Value {
    let record = &node.record;
    let mut value = json!({
        "node_id":record.literature_item_id,
        "kind":if record.has_zotero_binding { "library_paper" } else { "external_reference" },
        "target_state":if record.has_zotero_binding { "library" } else { "external" },
        "aliases":[record.literature_item_id],
        "title":bounded_text(&record.title),
        "year":record.year,
        "authors":authors(&record.authors_json),
        "low_signal":false,
        "visibility":node.visibility,
        "display_tier":node.display_tier,
    });
    if let Some(degree) = node.external_degree {
        value["external_degree"] = json!(degree);
    }
    if record.has_zotero_binding {
        if let Some((library_id, item_key)) = record.literature_item_id.split_once(':') {
            value["library_id"] = library_id.parse::<i64>().map_or(Value::Null, Value::from);
            value["item_key"] = json!(item_key);
        }
    } else {
        value["provisional_key"] = json!(record.literature_item_id);
    }
    value
}

fn public_edge(edge: &CitationEdgeRecord, visibility: &str) -> Value {
    let role_entries = roles(&edge.roles_json);
    let primary_role = role_entries
        .first()
        .map(|entry| entry.0.as_str())
        .unwrap_or("unknown");
    let evidence = role_entries
        .iter()
        .map(|(role, count)| json!({"role":role,"count":count}))
        .collect::<Vec<_>>();
    json!({
        "edge_id":edge.edge_id,
        "source":edge.source_literature_item_id,
        "target":edge.target_literature_item_id,
        "kind":"citation",
        "mention_count":edge.weight.round().max(1.0) as i64,
        "primary_role":primary_role,
        "aux_roles":evidence.iter().skip(1).cloned().collect::<Vec<_>>(),
        "role_evidence":evidence,
        "source_refs":[edge.reference_instance_id],
        "visibility":visibility,
    })
}

pub(crate) fn project_review_graph(
    nodes: Vec<CitationNodeRecord>,
    edges: Vec<CitationEdgeRecord>,
    paper_refs: &[String],
) -> (Vec<Value>, Vec<Value>) {
    let requested = paper_refs
        .iter()
        .flat_map(|paper_ref| {
            let item_key = paper_ref.rsplit(':').next().unwrap_or_default();
            [paper_ref.clone(), format!("zotero:item:{item_key}")]
        })
        .collect::<BTreeSet<_>>();
    let mut edges = edges
        .into_iter()
        .filter(|edge| {
            requested.contains(&edge.source_literature_item_id)
                && requested.contains(&edge.target_literature_item_id)
        })
        .collect::<Vec<_>>();
    edges.sort_by(|left, right| left.edge_id.cmp(&right.edge_id));
    edges.truncate(1000);
    let mut nodes = nodes
        .into_iter()
        .filter(|node| requested.contains(&node.literature_item_id))
        .collect::<Vec<_>>();
    nodes.sort_by(|left, right| left.literature_item_id.cmp(&right.literature_item_id));
    nodes.truncate(500);
    let retained = nodes
        .iter()
        .map(|node| node.literature_item_id.clone())
        .collect::<BTreeSet<_>>();
    edges.retain(|edge| {
        retained.contains(&edge.source_literature_item_id)
            && retained.contains(&edge.target_literature_item_id)
    });
    let nodes = nodes
        .into_iter()
        .map(|record| {
            public_node(&ProjectedNode {
                display_tier: if record.has_zotero_binding {
                    "library"
                } else {
                    "shared_external"
                },
                record,
                external_degree: None,
                visibility: "default",
            })
        })
        .collect();
    let edges = edges
        .iter()
        .map(|edge| public_edge(edge, "default"))
        .collect();
    (nodes, edges)
}

fn string_array(request: &Map<String, Value>, name: &str) -> Vec<String> {
    request
        .get(name)
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

fn graph_request_object<'a>(request: &'a Map<String, Value>, name: &str) -> &'a Map<String, Value> {
    request
        .get(name)
        .and_then(Value::as_object)
        .unwrap_or(request)
}

fn normalized_filter(request: &Map<String, Value>) -> ApplicationCitationGraphFilter {
    let filter = graph_request_object(request, "filters");
    let topic_id = string_field(filter, &["topicId", "topic_id"])
        .filter(|value| *value != "all")
        .map(str::to_owned);
    let mut roles = string_array(filter, "roles");
    if roles.is_empty()
        && let Some(role) = string_field(filter, &["role"]).filter(|value| *value != "all")
    {
        roles.push(role.to_owned());
    }
    ApplicationCitationGraphFilter {
        node_kinds: string_array(filter, "nodeKinds"),
        roles,
        include_low_signal: filter
            .get("includeLowSignal")
            .or_else(|| filter.get("showLowSignalReferences"))
            .and_then(Value::as_bool)
            .unwrap_or(false),
        search: string_field(filter, &["search"])
            .unwrap_or_default()
            .trim()
            .to_lowercase(),
        topic_node_ids: topic_id.map(|_| Vec::new()),
    }
}

fn query_signature(
    filter: &ApplicationCitationGraphFilter,
    algorithm: &str,
) -> Result<String, String> {
    canonical_sha256(&json!({
        "nodeKinds":filter.node_kinds,
        "roles":filter.roles,
        "includeLowSignal":filter.include_low_signal,
        "search":filter.search,
        "topicNodeIds":filter.topic_node_ids,
        "layoutAlgorithm":algorithm,
    }))
    .map_err(|_| "invalid_request".to_owned())
}

fn resolve_topic_filter(
    repository: &synthesis_repository::Repository,
    request: &Map<String, Value>,
    filter: &mut ApplicationCitationGraphFilter,
) -> Result<(), String> {
    let request_filter = graph_request_object(request, "filters");
    let Some(topic_id) =
        string_field(request_filter, &["topicId", "topic_id"]).filter(|value| *value != "all")
    else {
        filter.topic_node_ids = None;
        return Ok(());
    };
    let Some(projection) = repository.get_topic_application_projection(topic_id)? else {
        filter.topic_node_ids = Some(Vec::new());
        return Ok(());
    };
    let discovery =
        serde_json::from_str::<Value>(&projection.discovery_json).unwrap_or_else(|_| json!({}));
    filter.topic_node_ids = Some(
        discovery["source_paper_refs"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect(),
    );
    Ok(())
}

fn read_graph_window(
    apps: &ProductionApplications,
    request: &Map<String, Value>,
) -> Result<GraphWindowRead, String> {
    let view = apps.citations.read()?;
    let graph_hash = &view.basis().graph_hash;
    let expected_graph_hash = request
        .get("basis")
        .and_then(Value::as_object)
        .and_then(|basis| string_field(basis, &["expectedGraphHash", "expected_graph_hash"]))
        .or_else(|| string_field(request, &["expectedGraphHash", "expected_graph_hash"]));
    if expected_graph_hash.is_some_and(|expected| expected != graph_hash) {
        return Err("basis_mismatch".into());
    }
    let algorithm = selected_algorithm(&Value::Object(request.clone())).to_owned();
    let mut filter = normalized_filter(request);
    apps.repository
        .with_reader(|repository| resolve_topic_filter(repository, request, &mut filter))?;
    let cursor_value = string_field(request, &["windowCursor", "window_cursor"])
        .or_else(|| string_field(request, &["cursor"]).filter(|value| value.starts_with("cg1|")));
    let window = request
        .get("window")
        .and_then(Value::as_object)
        .unwrap_or(request);
    let mut limits = (
        usize_field(
            window,
            &["nodeLimit", "node_limit"],
            DEFAULT_NODE_LIMIT,
            MAX_LIMIT,
        )
        .max(1),
        usize_field(
            window,
            &["edgeLimit", "edge_limit"],
            DEFAULT_EDGE_LIMIT,
            MAX_LIMIT,
        )
        .max(1),
        usize_field(
            window,
            &["hoverNodeLimit", "hover_node_limit"],
            DEFAULT_HOVER_NODE_LIMIT,
            MAX_LIMIT,
        )
        .max(1),
        usize_field(
            window,
            &["hoverEdgeLimit", "hover_edge_limit"],
            DEFAULT_HOVER_EDGE_LIMIT,
            MAX_LIMIT,
        )
        .max(1),
    );
    loop {
        let query = CitationGraphPageRequest {
            node_limit: limits.0,
            edge_limit: limits.1,
            hover_node_limit: limits.2,
            hover_edge_limit: limits.3,
            layout_algorithm: algorithm.clone(),
            filter: filter.clone(),
        };
        let page = match cursor_value {
            Some(cursor) => view.continue_page(query, cursor)?,
            None => view.first_page(query)?,
        };
        let candidate_size = serde_json::to_vec(&json!({
            "nodes":page.nodes.iter().map(window_public_node).collect::<Vec<_>>(),
            "edges":page.edges.iter().map(window_public_edge).collect::<Vec<_>>(),
            "hover_only_nodes":page.hover_nodes.iter().map(window_public_node).collect::<Vec<_>>(),
            "hover_only_edges":page.hover_edges.iter().map(window_public_edge).collect::<Vec<_>>(),
            "endpoint_nodes":page.endpoint_nodes.iter().map(window_public_node).collect::<Vec<_>>(),
        }))
        .map_err(|_| "response_invalid".to_owned())?
        .len();
        if candidate_size <= GRAPH_RESPONSE_BUDGET_BYTES {
            let (topic_scopes, topic_scope_cursor, topic_scope_limit, topic_scope_total) = apps
                .repository
                .with_reader(|repository| read_topic_scopes(repository, request))?;
            return Ok(GraphWindowRead {
                page,
                topic_scopes,
                topic_scope_cursor,
                topic_scope_limit,
                topic_scope_total,
            });
        }
        if limits == (1, 1, 1, 1) {
            return Err("response_body_too_large".into());
        }
        limits = (
            (limits.0 / 2).max(1),
            (limits.1 / 2).max(1),
            (limits.2 / 2).max(1),
            (limits.3 / 2).max(1),
        );
    }
}

fn window_public_node(node: &ApplicationCitationGraphNode) -> Value {
    let mut value = json!({
        "node_id":node.node_id,
        "kind":if node.has_zotero_binding { "library_paper" } else { "external_reference" },
        "target_state":if node.has_zotero_binding { "library" } else { "external" },
        "aliases":[node.node_id],
        "title":bounded_text(&node.title),
        "year":node.year,
        "authors":node.authors,
        "low_signal":false,
        "visibility":node.visibility,
        "display_tier":if node.has_zotero_binding { "library" } else if node.visibility == "hover_only" { "single_external" } else { "shared_external" },
    });
    if let Some(degree) = node.external_degree {
        value["external_degree"] = json!(degree);
    }
    if node.has_zotero_binding {
        if let Some((library_id, item_key)) = node.node_id.split_once(':') {
            value["library_id"] = library_id.parse::<i64>().map_or(Value::Null, Value::from);
            value["item_key"] = json!(item_key);
        }
    } else {
        value["provisional_key"] = json!(node.node_id);
    }
    value
}

fn window_ui_node(node: &ApplicationCitationGraphNode) -> Value {
    let public = window_public_node(node);
    let metrics = node.light_metrics.as_ref();
    json!({
        "id":public["node_id"],"label":public["title"],"title":public["title"],
        "kind":public["kind"],"targetState":public["target_state"],"paperRef":public["node_id"],
        "year":public["year"],"authors":public["authors"],"lowSignal":public["low_signal"],
        "visibility":public["visibility"],"displayTier":public["display_tier"],
        "externalDegree":public.get("external_degree").cloned().unwrap_or(Value::Null),
        "outgoingCount":metrics.map(|value| value.outgoing_count).unwrap_or_default(),
        "incomingCount":metrics.map(|value| value.incoming_count).unwrap_or_default(),
        "matchedOutgoingCount":metrics.map(|value| value.matched_outgoing_count).unwrap_or_default(),
        "unresolvedOutgoingCount":metrics.map(|value| value.unresolved_outgoing_count).unwrap_or_default(),
        "ambiguousOutgoingCount":metrics.map(|value| value.ambiguous_outgoing_count).unwrap_or_default(),
        "localDegree":metrics.map(|value| value.local_degree).unwrap_or_default(),
    })
}

fn window_public_edge(edge: &ApplicationCitationGraphEdge) -> Value {
    let primary = edge
        .roles
        .first()
        .map(|entry| entry.role.as_str())
        .unwrap_or("unknown");
    let evidence = edge
        .roles
        .iter()
        .map(|entry| json!({"role":entry.role,"count":entry.count}))
        .collect::<Vec<_>>();
    json!({
        "edge_id":edge.edge_id,"source":edge.source,"target":edge.target,"kind":"citation",
        "mention_count":edge.weight.round().max(1.0) as i64,"primary_role":primary,
        "aux_roles":evidence.iter().skip(1).cloned().collect::<Vec<_>>(),"role_evidence":evidence,
        "source_refs":[edge.reference_instance_id],"visibility":edge.visibility,
    })
}

fn window_ui_edge(edge: &ApplicationCitationGraphEdge) -> Value {
    let public = window_public_edge(edge);
    json!({
        "id":public["edge_id"],"source":public["source"],"target":public["target"],
        "kind":public["kind"],"role":public["primary_role"],"primaryRole":public["primary_role"],
        "auxRoles":public["aux_roles"],"roleEvidence":public["role_evidence"],
        "mentionCount":public["mention_count"],"sourceRefs":public["source_refs"],
        "visibility":public["visibility"],
    })
}

fn window_page_metadata(window: &GraphWindowRead, layout_status: &str) -> Value {
    let page = &window.page;
    let has_more = page.next_cursor.is_some();
    json!({
        "nextCursor":page.next_cursor.clone().unwrap_or_default(),
        "hasMore":has_more,
        "totalNodes":page.total_nodes,
        "totalEdges":page.total_edges,
        "totalHoverNodes":page.total_hover_nodes,
        "totalHoverEdges":page.total_hover_edges,
        "returnedNodes":page.nodes.len(),
        "returnedEdges":page.edges.len(),
        "returnedHoverNodes":page.hover_nodes.len(),
        "returnedHoverEdges":page.hover_edges.len(),
        "querySignature":page.query_signature,
        "layoutStatus":layout_status,
        "windowStatus":if has_more { "loading" } else { "complete" },
        "roleOptions":page.role_options,
        "responseBudgetBytes":GRAPH_RESPONSE_BUDGET_BYTES,
    })
}

fn selected_algorithm(state: &Value) -> &str {
    state["graph"]["layoutAlgorithm"]
        .as_str()
        .or_else(|| state["graph"]["layout_algorithm"].as_str())
        .or_else(|| state["layoutAlgorithm"].as_str())
        .or_else(|| state["layout_algorithm"].as_str())
        .or_else(|| state["basis"]["layoutAlgorithm"].as_str())
        .filter(|value| matches!(*value, "force" | "radial" | "components"))
        .unwrap_or("force")
}

fn layout_status(
    record: Option<&ApplicationCitationGraphLayout>,
    graph_hash: &str,
    node_ids: &[String],
    has_nodes: bool,
) -> &'static str {
    if !has_nodes {
        return "missing";
    }
    match record.map(|record| record.status.as_str()) {
        None => "missing",
        Some("running") => "refreshing",
        Some("failed") => "failed",
        Some("ready")
            if record.is_some_and(|record| {
                record.graph_hash == graph_hash
                    && record.layout_version == LAYOUT_VERSION
                    && node_ids.iter().all(|node_id| {
                        record.points.iter().any(|point| {
                            point.node_id == *node_id && point.x.is_finite() && point.y.is_finite()
                        })
                    })
            }) =>
        {
            "ready"
        }
        Some(_) => "stale",
    }
}

pub(crate) fn workbench_graph_surface(
    apps: &ProductionApplications,
    state: &Value,
) -> Result<Value, String> {
    let request = state["graph"].as_object().cloned().unwrap_or_default();
    let window = read_graph_window(apps, &request)?;
    let mut seen_node_ids = HashSet::new();
    let mut nodes = window
        .page
        .nodes
        .iter()
        .chain(
            window
                .page
                .endpoint_nodes
                .iter()
                .filter(|node| node.visibility == "default"),
        )
        .filter(|node| seen_node_ids.insert(node.node_id.clone()))
        .map(window_ui_node)
        .collect::<Vec<_>>();
    let mut seen_hover_node_ids = HashSet::new();
    let hover_nodes = window
        .page
        .hover_nodes
        .iter()
        .chain(
            window
                .page
                .endpoint_nodes
                .iter()
                .filter(|node| node.visibility == "hover_only"),
        )
        .filter(|node| seen_hover_node_ids.insert(node.node_id.clone()))
        .map(window_ui_node)
        .collect::<Vec<_>>();
    let node_ids = nodes
        .iter()
        .filter_map(|node| node["id"].as_str().map(str::to_owned))
        .collect::<Vec<_>>();
    let status = layout_status(
        window.page.layout.as_ref(),
        &window.page.basis.graph_hash,
        &node_ids,
        !nodes.is_empty(),
    );
    if status == "ready"
        && let Some(layout) = &window.page.layout
    {
        let coordinates = layout
            .points
            .iter()
            .map(|point| (point.node_id.as_str(), (point.x, point.y)))
            .collect::<BTreeMap<_, _>>();
        for node in &mut nodes {
            let Some(node_id) = node["id"].as_str().map(str::to_owned) else {
                continue;
            };
            if let Some((x, y)) = coordinates.get(node_id.as_str()) {
                node["x"] = json!(x);
                node["y"] = json!(y);
            }
        }
    }
    let edges = window
        .page
        .edges
        .iter()
        .map(window_ui_edge)
        .collect::<Vec<_>>();
    let hover_edges = window
        .page
        .hover_edges
        .iter()
        .map(window_ui_edge)
        .collect::<Vec<_>>();
    let cache_status = window.page.cache_status.as_str();
    let topic_scope_returned = window.topic_scopes.len();
    let graph = json!({
        "graph_hash":window.page.basis.graph_hash,
        "layoutStatus":status,
        "page":window_page_metadata(&window, status),
        "diagnostics":{
            "storage":"sqlite",
            "bounded":true,
            "semantic_slice":"library_and_shared_external",
            "displayed_node_count":window.page.total_nodes,
            "hover_only_external_count":window.page.total_hover_nodes,
            "displayed_edge_count":window.page.total_edges,
            "hover_only_edge_count":window.page.total_hover_edges,
            "cache_status":cache_status,
            "cache_key":CACHE_KEY,
            "layout_status":status,
            "layout_source":"sqlite",
        },
        "topicScopes":window.topic_scopes,
        "topicScopePage":{
            "cursor":window.topic_scope_cursor.to_string(),
            "nextCursor":if window.topic_scope_cursor+topic_scope_returned<window.topic_scope_total { (window.topic_scope_cursor+topic_scope_returned).to_string() } else { String::new() },
            "returned":topic_scope_returned,
            "total":window.topic_scope_total,
            "limit":window.topic_scope_limit,
            "hasMore":window.topic_scope_cursor+topic_scope_returned<window.topic_scope_total,
        },
        "hoverOnlyNodes":hover_nodes,
        "hoverOnlyEdges":hover_edges,
        "nodes":nodes,
        "edges":edges,
    });
    let result = json!({"libraryId":apps.library_id(),"graph":graph});
    if serde_json::to_vec(&result)
        .map_err(|_| "response_invalid".to_owned())?
        .len()
        > GRAPH_RESPONSE_BUDGET_BYTES
    {
        return Err("response_body_too_large".into());
    }
    Ok(result)
}

fn usize_field(request: &Map<String, Value>, names: &[&str], fallback: usize, max: usize) -> usize {
    names
        .iter()
        .find_map(|name| request.get(*name))
        .and_then(|value| {
            value
                .as_u64()
                .map(|value| value as usize)
                .or_else(|| value.as_str()?.parse().ok())
        })
        .unwrap_or(fallback)
        .min(max)
}

fn string_field<'a>(request: &'a Map<String, Value>, names: &[&str]) -> Option<&'a str> {
    names
        .iter()
        .find_map(|name| request.get(*name)?.as_str())
        .filter(|value| !value.is_empty())
}

fn bounded_overview(
    apps: &ProductionApplications,
    request: &Map<String, Value>,
) -> Result<Value, String> {
    let window = read_graph_window(apps, request)?;
    let mut seen_node_ids = HashSet::new();
    let nodes = window
        .page
        .nodes
        .iter()
        .chain(window.page.endpoint_nodes.iter())
        .filter(|node| node.visibility == "default")
        .filter(|node| seen_node_ids.insert(node.node_id.clone()))
        .map(window_public_node)
        .collect::<Vec<_>>();
    let mut seen_hover_node_ids = HashSet::new();
    let hover_nodes = window
        .page
        .hover_nodes
        .iter()
        .chain(window.page.endpoint_nodes.iter())
        .filter(|node| node.visibility == "hover_only")
        .filter(|node| seen_hover_node_ids.insert(node.node_id.clone()))
        .map(window_public_node)
        .collect::<Vec<_>>();
    let page = window_page_metadata(&window, "missing");
    let result = json!({
        "schema_id":"synthesis.unified_citation_graph",
        "schema_version":"1.0.0",
        "graph_hash":window.page.basis.graph_hash,
        "nodes":nodes,
        "edges":window.page.edges.iter().map(window_public_edge).collect::<Vec<_>>(),
        "hover_only_nodes":hover_nodes,
        "hover_only_edges":window.page.hover_edges.iter().map(window_public_edge).collect::<Vec<_>>(),
        "summary":{
            "semantic_slice":"library_and_shared_external",
            "displayed_node_count":window.page.total_nodes,
            "displayed_edge_count":window.page.total_edges,
            "hover_only_node_count":window.page.total_hover_nodes,
            "hover_only_edge_count":window.page.total_hover_edges,
        },
        "pagination":{
            "cursor":window.page.cursor,
            "nextCursor":page["nextCursor"],
            "hasMore":page["hasMore"],
        },
        "page":page,
        "diagnostics":{"storage":"sqlite","bounded":true,"truncated":page["hasMore"]},
    });
    if serde_json::to_vec(&result)
        .map_err(|_| "response_invalid".to_owned())?
        .len()
        > GRAPH_RESPONSE_BUDGET_BYTES
    {
        return Err("response_body_too_large".into());
    }
    Ok(result)
}

fn bounded_slice(
    apps: &ProductionApplications,
    request: &Map<String, Value>,
) -> Result<Value, String> {
    let start = string_field(
        request,
        &["startNodeId", "start_node_id", "paperRef", "paper_ref"],
    )
    .ok_or_else(|| "invalid_request".to_owned())?;
    let direction = string_field(request, &["direction"]).unwrap_or("both");
    let max_nodes = usize_field(request, &["maxNodes", "max_nodes"], 25, 100).max(1);
    let max_edges = usize_field(request, &["maxEdges", "max_edges"], 50, 200);
    let view = apps.citations.read()?;
    let graph_hash = &view.basis().graph_hash;
    if string_field(request, &["expectedGraphHash", "expected_graph_hash"])
        .is_some_and(|expected| expected != graph_hash)
    {
        return Err("basis_mismatch".into());
    }
    let mut filter = normalized_filter(request);
    apps.repository
        .with_reader(|repository| resolve_topic_filter(repository, request, &mut filter))?;
    let signature = query_signature(&filter, selected_algorithm(&Value::Object(request.clone())))?;
    if string_field(request, &["querySignature", "query_signature"])
        .is_some_and(|expected| expected != signature)
    {
        return Err("basis_mismatch".into());
    }
    let rows = view.neighborhood(CitationGraphNeighborhoodRequest {
        start_node_id: start.into(),
        direction: match direction {
            "incoming" => synthesis_application::citation_graph::CitationDirection::Incoming,
            "outgoing" => synthesis_application::citation_graph::CitationDirection::Outgoing,
            "both" => synthesis_application::citation_graph::CitationDirection::Both,
            _ => return Err("invalid_request".into()),
        },
        max_nodes,
        max_edges,
        filter,
    })?;
    let result = json!({
        "ok":!rows.nodes.is_empty(),
        "graph_hash":graph_hash,
        "querySignature":signature,
        "start_node_id":start,
        "nodes":rows.nodes.iter().map(window_public_node).collect::<Vec<_>>(),
        "edges":rows.edges.iter().map(window_public_edge).collect::<Vec<_>>(),
        "diagnostics":{
            "snapshot_found":!graph_hash.is_empty(),
            "depth":1,
            "direction":direction,
            "node_count":rows.nodes.len(),
            "edge_count":rows.edges.len(),
            "truncated":rows.truncated,
            "bounded":true,
            "warnings":[],
        },
    });
    if serde_json::to_vec(&result)
        .map_err(|_| "response_invalid".to_owned())?
        .len()
        > GRAPH_RESPONSE_BUDGET_BYTES
    {
        return Err("response_body_too_large".into());
    }
    Ok(result)
}

fn public_metric(record: &ApplicationCitationGraphMetric) -> Value {
    json!({
        "node_id":record.node_id,"paper_ref":record.paper_ref,"item_key":record.item_key,
        "title":bounded_text(&record.title),"year":record.year,
        "internal_in_degree":record.internal_in_degree,"internal_out_degree":record.internal_out_degree,
        "external_reference_count":record.external_reference_count,"unresolved_reference_count":record.unresolved_reference_count,
        "internal_pagerank":record.internal_pagerank,"component_id":record.component_id,"component_size":record.component_size,
        "is_isolated":record.is_isolated,"age_norm":record.age_norm,"recency_norm":record.recency_norm,
        "in_degree_norm":record.in_degree_norm,"out_degree_norm":record.out_degree_norm,"pagerank_norm":record.pagerank_norm,
        "foundation_score":record.foundation_score,"frontier_score":record.frontier_score,"synthesis_role_hints":record.synthesis_role_hints,
    })
}

fn metrics(apps: &ProductionApplications, request: &Map<String, Value>) -> Result<Value, String> {
    let cursor = usize_field(request, &["cursor"], 0, usize::MAX);
    let limit = usize_field(request, &["limit"], 25, 100).max(1);
    let sort = string_field(request, &["sortBy", "sort_by"]).unwrap_or("foundation");
    let paper_refs = match request
        .get("paperRefs")
        .or_else(|| request.get("paper_refs"))
    {
        None => Vec::new(),
        Some(Value::Array(values)) => values
            .iter()
            .map(|value| value.as_str().filter(|value| !value.is_empty()))
            .collect::<Option<Vec<_>>>()
            .ok_or_else(|| "invalid_request".to_owned())?,
        Some(_) => return Err("invalid_request".into()),
    };
    if paper_refs.len() > 250 {
        return Err("invalid_request".into());
    }
    let page = apps.citations.read()?.metrics(CitationMetricsPageRequest {
        cursor,
        limit,
        sort_by: match sort {
            "foundation" => ApplicationCitationMetricsSort::Foundation,
            "frontier" => ApplicationCitationMetricsSort::Frontier,
            "pagerank" => ApplicationCitationMetricsSort::Pagerank,
            "in_degree" => ApplicationCitationMetricsSort::InDegree,
            _ => return Err("invalid_request".into()),
        },
        paper_refs: paper_refs.into_iter().map(str::to_owned).collect(),
    })?;
    let graph_hash = page.basis.graph_hash.clone();
    let metrics_hash = page.basis.metrics_hash.clone().unwrap_or_default();
    let items = page.records.iter().map(public_metric).collect::<Vec<_>>();
    let status = if page.total == 0 {
        "missing"
    } else if page.stale || metrics_hash.is_empty() {
        "stale"
    } else {
        "ready"
    };
    Ok(json!({
        "ok":true,"graph_hash":graph_hash,"metrics_hash":metrics_hash,"status":status,
        "items":items,"cursor":page.cursor.to_string(),
        "nextCursor":page.next_cursor.map(|value| value.to_string()).unwrap_or_default(),
        "hasMore":page.next_cursor.is_some(),"returned":page.records.len(),"total":page.total,"limit":limit,
        "diagnostics":{"snapshot_found":!graph_hash.is_empty(),"metrics_found":page.total>0,
          "stale":page.stale,"total_library_nodes":page.total,"returned_count":items.len(),
          "limits":{"limit":limit,"maxLimit":100},"warnings":[]},
    }))
}

fn string_list_field(request: &Map<String, Value>, names: &[&str]) -> Result<Vec<String>, String> {
    let Some(value) = names.iter().find_map(|name| request.get(*name)) else {
        return Ok(Vec::new());
    };
    let values = value
        .as_array()
        .ok_or_else(|| "invalid_request".to_owned())?;
    values
        .iter()
        .map(|value| {
            value
                .as_str()
                .filter(|value| !value.is_empty())
                .map(str::to_owned)
                .ok_or_else(|| "invalid_request".to_owned())
        })
        .collect()
}

#[derive(Clone, Copy)]
struct LayoutResultBasis<'a> {
    scope: &'a str,
    graph_hash: &'a str,
    layout_hash: &'a str,
    layout_status: &'a str,
    layout_found: bool,
    preset: &'a str,
    view_key: &'a str,
    max_nodes: usize,
    max_edges: usize,
}

fn empty_layout_result(status: &str, truncated: bool, basis: LayoutResultBasis<'_>) -> Value {
    json!({
        "ok":false,"status":status,"scope":basis.scope,"graph_hash":basis.graph_hash,"layout_hash":basis.layout_hash,
        "layout_status":basis.layout_status,"preset":basis.preset,"view_key":basis.view_key,"nodes":[],"edges":[],
        "diagnostics":{"snapshot_found":!basis.graph_hash.is_empty(),"layout_found":basis.layout_found,
          "node_count":0,"edge_count":0,"truncated":truncated,
          "limits":{"maxNodes":basis.max_nodes,"maxEdges":basis.max_edges,"hardMaxNodes":100,"hardMaxEdges":200},
          "warnings":[]},
    })
}

fn layout_result(
    apps: &ProductionApplications,
    request: &Map<String, Value>,
) -> Result<Value, String> {
    let algorithm = match string_field(request, &["preset", "algorithm"]) {
        None => "force",
        Some(value) if matches!(value, "force" | "radial" | "components") => value,
        Some(_) => return Err("invalid_request".into()),
    };
    let view_key = string_field(request, &["viewKey", "view_key"]).unwrap_or("workbench_overview");
    let max_nodes = usize_field(request, &["maxNodes", "max_nodes"], 25, 100).max(1);
    let max_edges = usize_field(request, &["maxEdges", "max_edges"], 50, 200);
    let allow_truncated = request
        .get("allowTruncated")
        .or_else(|| request.get("allow_truncated"))
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let explicit = {
        let mut values = string_list_field(request, &["nodeIds", "node_ids"])?;
        values.extend(string_list_field(request, &["paperRefs", "paper_refs"])?);
        values.sort();
        values.dedup();
        values
    };
    let start = string_field(
        request,
        &["startNodeId", "start_node_id", "paperRef", "paper_ref"],
    )
    .map(str::to_owned);
    let scope = if request.get("scope").and_then(Value::as_str) == Some("full") {
        "full"
    } else if start.is_some() {
        "slice"
    } else if !explicit.is_empty() {
        "explicit"
    } else {
        "none"
    };
    if scope == "none" {
        return Ok(empty_layout_result(
            "invalid_request",
            false,
            LayoutResultBasis {
                scope,
                graph_hash: "",
                layout_hash: "",
                layout_status: "missing",
                layout_found: false,
                preset: algorithm,
                view_key,
                max_nodes,
                max_edges,
            },
        ));
    }

    let layout_key = format!("{view_key}:{algorithm}");
    let view = apps.citations.read()?;
    let initial_layout = view.layout(&layout_key, &[])?;
    let graph_hash = view.basis().graph_hash.clone();
    let layout_found = initial_layout.is_some();
    let layout_hash = initial_layout
        .as_ref()
        .map(|layout| layout.layout_hash.as_str())
        .unwrap_or("");
    let layout_status = match initial_layout.as_ref().map(|layout| layout.status.as_str()) {
        None => "missing",
        Some("running") => "refreshing",
        Some("failed") => "failed",
        Some("ready")
            if initial_layout.as_ref().is_some_and(|layout| {
                layout.graph_hash == graph_hash && layout.layout_version == LAYOUT_VERSION
            }) =>
        {
            "ready"
        }
        Some(_) => "stale",
    };
    let layout_basis = LayoutResultBasis {
        scope,
        graph_hash: &graph_hash,
        layout_hash,
        layout_status,
        layout_found,
        preset: algorithm,
        view_key,
        max_nodes,
        max_edges,
    };
    if graph_hash.is_empty() {
        return Ok(empty_layout_result("missing", false, layout_basis));
    }
    if layout_status != "ready" {
        return Ok(empty_layout_result(layout_status, false, layout_basis));
    }
    let filter = ApplicationCitationGraphFilter {
        include_low_signal: request
            .get("includeLowSignal")
            .or_else(|| request.get("include_low_signal"))
            .and_then(Value::as_bool)
            .unwrap_or(false),
        roles: string_list_field(request, &["roleFilter", "role_filter"])?,
        ..ApplicationCitationGraphFilter::default()
    };
    let (mut selected_nodes, mut selected_edges, mut truncated) = match scope {
        "slice" => {
            let direction = string_field(request, &["direction"]).unwrap_or("both");
            let rows = view.neighborhood(CitationGraphNeighborhoodRequest {
                start_node_id: start.clone().unwrap_or_default(),
                direction: match direction {
                    "incoming" => {
                        synthesis_application::citation_graph::CitationDirection::Incoming
                    }
                    "outgoing" => {
                        synthesis_application::citation_graph::CitationDirection::Outgoing
                    }
                    "both" => synthesis_application::citation_graph::CitationDirection::Both,
                    _ => return Err("invalid_request".into()),
                },
                max_nodes: max_nodes.saturating_add(1),
                max_edges: max_edges.saturating_add(1),
                filter: filter.clone(),
            })?;
            (rows.nodes, rows.edges, rows.truncated)
        }
        "explicit" => {
            if explicit.len() > 100 {
                return Ok(empty_layout_result("too_large", true, layout_basis));
            }
            let rows = view.explicit(&explicit, max_edges.saturating_add(1), &filter)?;
            (rows.nodes, rows.edges, rows.truncated)
        }
        _ => {
            let rows = view.first_page(CitationGraphPageRequest {
                node_limit: max_nodes.saturating_add(1),
                edge_limit: max_edges.saturating_add(1),
                hover_node_limit: 1,
                hover_edge_limit: 1,
                layout_algorithm: algorithm.into(),
                filter,
            })?;
            let too_large = rows.total_nodes > max_nodes || rows.total_edges > max_edges;
            (rows.nodes, rows.edges, too_large)
        }
    };
    if selected_nodes.is_empty() {
        return Ok(empty_layout_result("not_found", false, layout_basis));
    }
    if selected_nodes.len() > max_nodes || selected_edges.len() > max_edges {
        truncated = true;
    }
    if truncated && !allow_truncated {
        return Ok(empty_layout_result("too_large", true, layout_basis));
    }
    selected_nodes.truncate(max_nodes);
    let retained = selected_nodes
        .iter()
        .map(|node| node.node_id.clone())
        .collect::<BTreeSet<_>>();
    selected_edges
        .retain(|edge| retained.contains(&edge.source) && retained.contains(&edge.target));
    selected_edges.truncate(max_edges);

    let node_ids = retained.into_iter().collect::<Vec<_>>();
    let Some(layout) = view.layout(&layout_key, &node_ids)? else {
        return Ok(empty_layout_result(
            "missing",
            truncated,
            LayoutResultBasis {
                layout_hash: "",
                layout_status: "missing",
                layout_found: false,
                ..layout_basis
            },
        ));
    };
    let status = match layout.status.as_str() {
        "running" => "refreshing",
        "failed" => "failed",
        "ready"
            if layout.graph_hash == graph_hash
                && layout.layout_version == LAYOUT_VERSION
                && layout.points.len() == node_ids.len() =>
        {
            "ready"
        }
        "ready" => "stale",
        _ => "stale",
    };
    let coordinates = layout
        .points
        .iter()
        .map(|point| (point.node_id.as_str(), (point.x, point.y)))
        .collect::<BTreeMap<_, _>>();
    let layout_nodes = if status == "ready" {
        selected_nodes
            .iter()
            .filter_map(|node| {
                let public = window_public_node(node);
                let node_id = public["node_id"].as_str()?;
                let (x, y) = coordinates.get(node_id)?;
                Some(json!({
                    "node_id":node_id,"title":public["title"],"node_type":public["kind"],
                    "paper_ref":node_id,"year":public["year"],"authors":public["authors"],
                    "x":x,"y":y,"low_signal":public["low_signal"],
                }))
            })
            .collect::<Vec<_>>()
    } else {
        Vec::new()
    };
    let layout_edges = if status == "ready" {
        selected_edges
            .iter()
            .map(window_public_edge)
            .map(|edge| {
                json!({
                    "edge_id":edge["edge_id"],"source":edge["source"],"target":edge["target"],
                    "primary_role":edge["primary_role"],"aux_roles":edge["aux_roles"],
                    "weight":edge["mention_count"],
                })
            })
            .collect::<Vec<_>>()
    } else {
        Vec::new()
    };
    let result = json!({
        "ok":status=="ready","status":status,"scope":scope,"graph_hash":graph_hash,
        "layout_hash":layout.layout_hash,"layout_status":status,"preset":algorithm,
        "view_key":view_key,"nodes":layout_nodes,"edges":layout_edges,
        "diagnostics":{"snapshot_found":!graph_hash.is_empty(),"layout_found":true,
          "node_count":layout_nodes.len(),"edge_count":layout_edges.len(),"truncated":truncated,
          "limits":{"maxNodes":max_nodes,"maxEdges":max_edges,"hardMaxNodes":100,"hardMaxEdges":200},
          "warnings":[]},
    });
    if serde_json::to_vec(&result)
        .map_err(|_| "response_invalid".to_owned())?
        .len()
        > GRAPH_RESPONSE_BUDGET_BYTES
    {
        return Err("response_body_too_large".into());
    }
    Ok(result)
}

pub(crate) fn dispatch(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Result<Value, String> {
    match capability {
        "client.queryCitationGraph" => {
            bounded_overview(apps, &typed_request::<GraphQueryDto>(args)?)
        }
        "client.queryCitationGraphCluster" => {
            let request = typed_request::<GraphQueryDto>(args)?;
            let mut result = bounded_overview(apps, &request)?;
            result["cluster"] = json!({"status":"ready","scope":"overview"});
            Ok(result)
        }
        "client.getCitationGraphSlice" => {
            bounded_slice(apps, &typed_request::<GraphSliceDto>(args)?)
        }
        "client.getCitationGraphLayout" => {
            layout_result(apps, &typed_request::<GraphLayoutReadDto>(args)?)
        }
        "client.getCitationGraphMetrics" | "client.rankLibraryPapers" => {
            metrics(apps, &typed_request::<GraphMetricsDto>(args)?)
        }
        _ => Err("unsupported_capability".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn layout_window_requires_matching_basis_version_and_complete_coordinates() {
        let ids = vec!["1:A".to_owned(), "1:B".to_owned()];
        let stale = ApplicationCitationGraphLayout {
            graph_hash: "graph:1".into(),
            status: "ready".into(),
            layout_version: 1,
            points: Vec::new(),
            ..ApplicationCitationGraphLayout::default()
        };
        assert_eq!(layout_status(Some(&stale), "graph:1", &ids, true), "stale");
        let ready = ApplicationCitationGraphLayout {
            layout_version: LAYOUT_VERSION,
            points: ids
                .iter()
                .map(
                    |id| synthesis_application::citation_graph::CitationGraphLayoutPoint {
                        node_id: id.clone(),
                        x: 1.0,
                        y: 2.0,
                    },
                )
                .collect(),
            ..stale.clone()
        };
        assert_eq!(layout_status(Some(&ready), "graph:1", &ids, true), "ready");
    }
}
