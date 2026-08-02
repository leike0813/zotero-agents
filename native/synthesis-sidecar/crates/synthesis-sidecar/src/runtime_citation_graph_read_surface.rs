use crate::runtime_production_ports::ProductionApplications;
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet, HashSet};
use synthesis_application::citation_graph::{
    CitationMetricsPageRequest, CitationMetricsSort as ApplicationCitationMetricsSort,
};
use synthesis_protocol::canonical_sha256;
use synthesis_repository::{
    CacheBasisRecord, CitationComplexMetricsRecord, CitationEdgeRecord, CitationGraphWindowFilter,
    CitationGraphWindowNodeRecord, CitationGraphWindowQuery, CitationGraphWindowRows,
    CitationLayoutWindowRecord, CitationLightMetricsRecord, CitationNodeRecord,
};

const CACHE_KEY: &str = "citation-graph:library";
const LAYOUT_VERSION: i64 = 2;
const MAX_LIMIT: usize = 500;
const DEFAULT_NODE_LIMIT: usize = 200;
const DEFAULT_EDGE_LIMIT: usize = 400;
const DEFAULT_HOVER_NODE_LIMIT: usize = 100;
const DEFAULT_HOVER_EDGE_LIMIT: usize = 200;
const GRAPH_RESPONSE_BUDGET_BYTES: usize = 768 * 1024;
const GRAPH_CURSOR_MAX_LENGTH: usize = 4096;
const DEFAULT_TOPIC_SCOPE_LIMIT: usize = 50;
const MAX_TOPIC_SCOPE_LIMIT: usize = 250;

#[derive(Clone, Debug, Default, PartialEq, Eq)]
struct GraphWindowCursor {
    node_offset: usize,
    edge_offset: usize,
    hover_node_offset: usize,
    hover_edge_offset: usize,
}

#[derive(Clone, Debug)]
struct GraphWindowRead {
    graph_hash: String,
    query_signature: String,
    cursor: GraphWindowCursor,
    rows: CitationGraphWindowRows,
    topic_scopes: Vec<Value>,
    topic_scope_cursor: usize,
    topic_scope_limit: usize,
    topic_scope_total: usize,
    layout: Option<CitationLayoutWindowRecord>,
    cache: Option<CacheBasisRecord>,
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

fn ui_node(node: &ProjectedNode, metrics: Option<&CitationLightMetricsRecord>) -> Value {
    let mut value = json!({
        "id":node.record.literature_item_id,
        "label":bounded_text(if node.record.title.is_empty() { &node.record.literature_item_id } else { &node.record.title }),
        "kind":if node.record.has_zotero_binding { "library_paper" } else { "external_reference" },
        "year":node.record.year,
        "authors":authors(&node.record.authors_json),
        "tags":[],
        "collections":[],
        "low_signal":false,
        "visibility":node.visibility,
        "display_tier":node.display_tier,
    });
    if let Some(degree) = node.external_degree {
        value["external_degree"] = json!(degree);
    }
    if let Some(metrics) = metrics {
        value["metrics"] = json!({
            "internal_in_degree":metrics.incoming_count,
            "internal_out_degree":metrics.outgoing_count,
        });
    }
    value
}

fn ui_edge(edge: &CitationEdgeRecord, visibility: &str) -> Value {
    let primary_role = roles(&edge.roles_json)
        .first()
        .map(|entry| entry.0.clone())
        .unwrap_or_else(|| "unknown".into());
    json!({
        "id":edge.edge_id,
        "source":edge.source_literature_item_id,
        "target":edge.target_literature_item_id,
        "primary_role":primary_role,
        "mention_count":edge.weight.round().max(1.0) as i64,
        "visibility":visibility,
    })
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

fn normalized_filter(request: &Map<String, Value>) -> CitationGraphWindowFilter {
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
    CitationGraphWindowFilter {
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

fn query_signature(filter: &CitationGraphWindowFilter, algorithm: &str) -> Result<String, String> {
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

fn encode_cursor(graph_hash: &str, query_signature: &str, cursor: &GraphWindowCursor) -> String {
    format!(
        "cg1|{graph_hash}|{query_signature}|{}|{}|{}|{}",
        cursor.node_offset, cursor.edge_offset, cursor.hover_node_offset, cursor.hover_edge_offset
    )
}

fn decode_cursor(
    value: &str,
    graph_hash: &str,
    query_signature: &str,
) -> Result<GraphWindowCursor, String> {
    if value.len() > GRAPH_CURSOR_MAX_LENGTH {
        return Err("invalid_request".into());
    }
    let fields = value.split('|').collect::<Vec<_>>();
    if fields.len() != 7 || fields[0] != "cg1" {
        return Err("invalid_request".into());
    }
    if fields[1] != graph_hash || fields[2] != query_signature {
        return Err("basis_mismatch".into());
    }
    let offset = |value: &str| {
        value
            .parse::<usize>()
            .map_err(|_| "invalid_request".to_owned())
    };
    Ok(GraphWindowCursor {
        node_offset: offset(fields[3])?,
        edge_offset: offset(fields[4])?,
        hover_node_offset: offset(fields[5])?,
        hover_edge_offset: offset(fields[6])?,
    })
}

fn resolve_topic_filter(
    repository: &synthesis_repository::Repository,
    request: &Map<String, Value>,
    filter: &mut CitationGraphWindowFilter,
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
    let owner = apps.repository.owner();
    let repository = owner
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?;
    let graph_hash = repository
        .get_citation_graph_application_state()?
        .map(|state| state.graph_hash)
        .unwrap_or_default();
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
    resolve_topic_filter(&repository, request, &mut filter)?;
    let signature = query_signature(&filter, &algorithm)?;
    let cursor_value = string_field(request, &["windowCursor", "window_cursor"])
        .or_else(|| string_field(request, &["cursor"]).filter(|value| value.starts_with("cg1|")));
    let cursor = cursor_value
        .map(|value| decode_cursor(value, &graph_hash, &signature))
        .transpose()?
        .unwrap_or_default();
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
        let query = CitationGraphWindowQuery {
            node_offset: cursor.node_offset,
            node_limit: limits.0,
            edge_offset: cursor.edge_offset,
            edge_limit: limits.1,
            hover_node_offset: cursor.hover_node_offset,
            hover_node_limit: limits.2,
            hover_edge_offset: cursor.hover_edge_offset,
            hover_edge_limit: limits.3,
            filter: filter.clone(),
        };
        let rows = repository.read_citation_graph_window(&query)?;
        let candidate_size = serde_json::to_vec(&json!({
            "nodes":rows.nodes.iter().map(window_public_node).collect::<Vec<_>>(),
            "edges":rows.edges.iter().map(window_public_edge).collect::<Vec<_>>(),
            "hover_only_nodes":rows.hover_nodes.iter().map(window_public_node).collect::<Vec<_>>(),
            "hover_only_edges":rows.hover_edges.iter().map(window_public_edge).collect::<Vec<_>>(),
            "endpoint_nodes":rows.endpoint_nodes.iter().map(window_public_node).collect::<Vec<_>>(),
        }))
        .map_err(|_| "response_invalid".to_owned())?
        .len();
        if candidate_size <= GRAPH_RESPONSE_BUDGET_BYTES {
            let (topic_scopes, topic_scope_cursor, topic_scope_limit, topic_scope_total) =
                read_topic_scopes(&repository, request)?;
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
            return Ok(GraphWindowRead {
                graph_hash,
                query_signature: signature,
                cursor,
                rows,
                topic_scopes,
                topic_scope_cursor,
                topic_scope_limit,
                topic_scope_total,
                layout: repository.read_citation_layout_window(
                    &format!("workbench_overview:{algorithm}"),
                    &layout_node_ids,
                )?,
                cache: repository.get_cache_basis(CACHE_KEY)?,
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

fn projected_window_node(row: &CitationGraphWindowNodeRecord) -> ProjectedNode {
    ProjectedNode {
        record: row.record.clone(),
        external_degree: (!row.record.has_zotero_binding)
            .then_some(row.external_degree.max(0) as usize),
        visibility: if row.visibility == "hover_only" {
            "hover_only"
        } else {
            "default"
        },
        display_tier: if row.record.has_zotero_binding {
            "library"
        } else if row.visibility == "hover_only" {
            "single_external"
        } else {
            "shared_external"
        },
    }
}

fn window_public_node(row: &CitationGraphWindowNodeRecord) -> Value {
    public_node(&projected_window_node(row))
}

fn window_ui_node(row: &CitationGraphWindowNodeRecord) -> Value {
    ui_node(&projected_window_node(row), row.light_metrics.as_ref())
}

fn window_public_edge(row: &synthesis_repository::CitationGraphWindowEdgeRecord) -> Value {
    public_edge(&row.record, &row.visibility)
}

fn window_ui_edge(row: &synthesis_repository::CitationGraphWindowEdgeRecord) -> Value {
    ui_edge(&row.record, &row.visibility)
}

fn next_window_cursor(window: &GraphWindowRead) -> (GraphWindowCursor, bool) {
    let next = GraphWindowCursor {
        node_offset: window.cursor.node_offset + window.rows.nodes.len(),
        edge_offset: window.cursor.edge_offset + window.rows.edges.len(),
        hover_node_offset: window.cursor.hover_node_offset + window.rows.hover_nodes.len(),
        hover_edge_offset: window.cursor.hover_edge_offset + window.rows.hover_edges.len(),
    };
    let has_more = next.node_offset < window.rows.total_nodes
        || next.edge_offset < window.rows.total_edges
        || next.hover_node_offset < window.rows.total_hover_nodes
        || next.hover_edge_offset < window.rows.total_hover_edges;
    (next, has_more)
}

fn window_page_metadata(window: &GraphWindowRead, layout_status: &str) -> Value {
    let (next, has_more) = next_window_cursor(window);
    json!({
        "nextCursor":if has_more { encode_cursor(&window.graph_hash, &window.query_signature, &next) } else { String::new() },
        "hasMore":has_more,
        "totalNodes":window.rows.total_nodes,
        "totalEdges":window.rows.total_edges,
        "totalHoverNodes":window.rows.total_hover_nodes,
        "totalHoverEdges":window.rows.total_hover_edges,
        "returnedNodes":window.rows.nodes.len(),
        "returnedEdges":window.rows.edges.len(),
        "returnedHoverNodes":window.rows.hover_nodes.len(),
        "returnedHoverEdges":window.rows.hover_edges.len(),
        "querySignature":window.query_signature,
        "layoutStatus":layout_status,
        "windowStatus":if has_more { "loading" } else { "complete" },
        "roleOptions":window.rows.role_options,
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
    record: Option<&CitationLayoutWindowRecord>,
    graph_hash: &str,
    node_ids: &[String],
    has_nodes: bool,
) -> &'static str {
    if !has_nodes {
        return "missing";
    }
    match record.map(|record| record.metadata.status.as_str()) {
        None => "missing",
        Some("running") => "refreshing",
        Some("failed") => "failed",
        Some("ready")
            if record.is_some_and(|record| {
                record.metadata.graph_hash == graph_hash
                    && record.metadata.layout_version == LAYOUT_VERSION
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
        .rows
        .nodes
        .iter()
        .chain(
            window
                .rows
                .endpoint_nodes
                .iter()
                .filter(|node| node.visibility == "default"),
        )
        .filter(|node| seen_node_ids.insert(node.record.literature_item_id.clone()))
        .map(window_ui_node)
        .collect::<Vec<_>>();
    let mut seen_hover_node_ids = HashSet::new();
    let hover_nodes = window
        .rows
        .hover_nodes
        .iter()
        .chain(
            window
                .rows
                .endpoint_nodes
                .iter()
                .filter(|node| node.visibility == "hover_only"),
        )
        .filter(|node| seen_hover_node_ids.insert(node.record.literature_item_id.clone()))
        .map(window_ui_node)
        .collect::<Vec<_>>();
    let node_ids = nodes
        .iter()
        .filter_map(|node| node["id"].as_str().map(str::to_owned))
        .collect::<Vec<_>>();
    let status = layout_status(
        window.layout.as_ref(),
        &window.graph_hash,
        &node_ids,
        !nodes.is_empty(),
    );
    if status == "ready"
        && let Some(layout) = &window.layout
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
        .rows
        .edges
        .iter()
        .map(window_ui_edge)
        .collect::<Vec<_>>();
    let hover_edges = window
        .rows
        .hover_edges
        .iter()
        .map(window_ui_edge)
        .collect::<Vec<_>>();
    let cache_status = window
        .cache
        .as_ref()
        .map(|cache| cache.status.as_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("missing");
    let topic_scope_returned = window.topic_scopes.len();
    let graph = json!({
        "graph_hash":window.graph_hash,
        "layoutStatus":status,
        "page":window_page_metadata(&window, status),
        "diagnostics":{
            "storage":"sqlite",
            "bounded":true,
            "semantic_slice":"library_and_shared_external",
            "displayed_node_count":window.rows.total_nodes,
            "hover_only_external_count":window.rows.total_hover_nodes,
            "displayed_edge_count":window.rows.total_edges,
            "hover_only_edge_count":window.rows.total_hover_edges,
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

fn object_arg(args: &[Value]) -> Result<Map<String, Value>, String> {
    match args {
        [] => Ok(Map::new()),
        [Value::Object(value)] => Ok(value.clone()),
        _ => Err("invalid_request".into()),
    }
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
        .rows
        .nodes
        .iter()
        .chain(window.rows.endpoint_nodes.iter())
        .filter(|node| node.visibility == "default")
        .filter(|node| seen_node_ids.insert(node.record.literature_item_id.clone()))
        .map(window_public_node)
        .collect::<Vec<_>>();
    let mut seen_hover_node_ids = HashSet::new();
    let hover_nodes = window
        .rows
        .hover_nodes
        .iter()
        .chain(window.rows.endpoint_nodes.iter())
        .filter(|node| node.visibility == "hover_only")
        .filter(|node| seen_hover_node_ids.insert(node.record.literature_item_id.clone()))
        .map(window_public_node)
        .collect::<Vec<_>>();
    let page = window_page_metadata(&window, "missing");
    let result = json!({
        "schema_id":"synthesis.unified_citation_graph",
        "schema_version":"1.0.0",
        "graph_hash":window.graph_hash,
        "nodes":nodes,
        "edges":window.rows.edges.iter().map(window_public_edge).collect::<Vec<_>>(),
        "hover_only_nodes":hover_nodes,
        "hover_only_edges":window.rows.hover_edges.iter().map(window_public_edge).collect::<Vec<_>>(),
        "summary":{
            "semantic_slice":"library_and_shared_external",
            "displayed_node_count":window.rows.total_nodes,
            "displayed_edge_count":window.rows.total_edges,
            "hover_only_node_count":window.rows.total_hover_nodes,
            "hover_only_edge_count":window.rows.total_hover_edges,
        },
        "pagination":{
            "cursor":encode_cursor(&window.graph_hash,&window.query_signature,&window.cursor),
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
    let owner = apps.repository.owner();
    let repository = owner
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?;
    let graph_hash = repository
        .get_citation_graph_application_state()?
        .map(|state| state.graph_hash)
        .unwrap_or_default();
    if string_field(request, &["expectedGraphHash", "expected_graph_hash"])
        .is_some_and(|expected| expected != graph_hash)
    {
        return Err("basis_mismatch".into());
    }
    let mut filter = normalized_filter(request);
    resolve_topic_filter(&repository, request, &mut filter)?;
    let signature = query_signature(&filter, selected_algorithm(&Value::Object(request.clone())))?;
    if string_field(request, &["querySignature", "query_signature"])
        .is_some_and(|expected| expected != signature)
    {
        return Err("basis_mismatch".into());
    }
    let rows = repository
        .read_citation_graph_neighborhood(start, direction, max_nodes, max_edges, &filter)?;
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

fn public_metric(record: &CitationComplexMetricsRecord) -> Value {
    let hints = serde_json::from_str::<Value>(&record.synthesis_role_hints_json)
        .unwrap_or_else(|_| json!([]));
    json!({
        "node_id":record.node_id,"paper_ref":record.paper_ref,"item_key":record.item_key,
        "title":bounded_text(&record.title),"year":record.year,
        "internal_in_degree":record.internal_in_degree,"internal_out_degree":record.internal_out_degree,
        "external_reference_count":record.external_reference_count,"unresolved_reference_count":record.unresolved_reference_count,
        "internal_pagerank":record.internal_pagerank,"component_id":record.component_id,"component_size":record.component_size,
        "is_isolated":record.is_isolated,"age_norm":record.age_norm,"recency_norm":record.recency_norm,
        "in_degree_norm":record.in_degree_norm,"out_degree_norm":record.out_degree_norm,"pagerank_norm":record.pagerank_norm,
        "foundation_score":record.foundation_score,"frontier_score":record.frontier_score,"synthesis_role_hints":hints,
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
    let page = apps.citations.read_metrics(CitationMetricsPageRequest {
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
    let state = apps
        .repository
        .owner()
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?
        .get_citation_graph_application_state()?;
    let graph_hash = state
        .as_ref()
        .map(|state| state.graph_hash.clone())
        .unwrap_or_default();
    let metrics_hash = state
        .and_then(|state| state.metrics_hash)
        .unwrap_or_default();
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
        "hasMore":page.has_more,"returned":page.returned,"total":page.total,"limit":limit,
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
    let initial_layout = apps.citations.read_layout_window(&layout_key, &[])?;
    let owner = apps.repository.owner();
    let repository = owner
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?;
    let graph_hash = repository
        .get_citation_graph_application_state()?
        .map(|state| state.graph_hash)
        .unwrap_or_default();
    let layout_found = initial_layout.is_some();
    let layout_hash = initial_layout
        .as_ref()
        .map(|layout| layout.metadata.layout_hash.as_str())
        .unwrap_or("");
    let layout_status = match initial_layout
        .as_ref()
        .map(|layout| layout.metadata.status.as_str())
    {
        None => "missing",
        Some("running") => "refreshing",
        Some("failed") => "failed",
        Some("ready")
            if initial_layout.as_ref().is_some_and(|layout| {
                layout.metadata.graph_hash == graph_hash
                    && layout.metadata.layout_version == LAYOUT_VERSION
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
    let filter = CitationGraphWindowFilter {
        include_low_signal: request
            .get("includeLowSignal")
            .or_else(|| request.get("include_low_signal"))
            .and_then(Value::as_bool)
            .unwrap_or(false),
        roles: string_list_field(request, &["roleFilter", "role_filter"])?,
        ..CitationGraphWindowFilter::default()
    };
    let (mut selected_nodes, mut selected_edges, mut truncated) = match scope {
        "slice" => {
            let direction = string_field(request, &["direction"]).unwrap_or("both");
            let rows = repository.read_citation_graph_neighborhood(
                start.as_deref().unwrap_or_default(),
                direction,
                max_nodes.saturating_add(1),
                max_edges.saturating_add(1),
                &filter,
            )?;
            (rows.nodes, rows.edges, rows.truncated)
        }
        "explicit" => {
            if explicit.len() > 100 {
                return Ok(empty_layout_result("too_large", true, layout_basis));
            }
            let rows = repository.read_citation_graph_explicit(
                &explicit,
                max_edges.saturating_add(1),
                &filter,
            )?;
            (rows.nodes, rows.edges, rows.truncated)
        }
        _ => {
            let rows = repository.read_citation_graph_window(&CitationGraphWindowQuery {
                node_offset: 0,
                node_limit: max_nodes.saturating_add(1),
                edge_offset: 0,
                edge_limit: max_edges.saturating_add(1),
                hover_node_offset: 0,
                hover_node_limit: 1,
                hover_edge_offset: 0,
                hover_edge_limit: 1,
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
        .map(|node| node.record.literature_item_id.clone())
        .collect::<BTreeSet<_>>();
    selected_edges.retain(|edge| {
        retained.contains(&edge.record.source_literature_item_id)
            && retained.contains(&edge.record.target_literature_item_id)
    });
    selected_edges.truncate(max_edges);
    drop(repository);

    let node_ids = retained.into_iter().collect::<Vec<_>>();
    let Some(layout) = apps.citations.read_layout_window(&layout_key, &node_ids)? else {
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
    let status = match layout.metadata.status.as_str() {
        "running" => "refreshing",
        "failed" => "failed",
        "ready"
            if layout.metadata.graph_hash == graph_hash
                && layout.metadata.layout_version == LAYOUT_VERSION
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
        "layout_hash":layout.metadata.layout_hash,"layout_status":status,"preset":algorithm,
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
    let request = object_arg(args)?;
    match capability {
        "client.queryCitationGraph" => bounded_overview(apps, &request),
        "client.queryCitationGraphCluster" => {
            let mut result = bounded_overview(apps, &request)?;
            result["cluster"] = json!({"status":"ready","scope":"overview"});
            Ok(result)
        }
        "client.getCitationGraphSlice" => bounded_slice(apps, &request),
        "client.getCitationGraphLayout" => layout_result(apps, &request),
        "client.getCitationGraphMetrics" | "client.rankLibraryPapers" => metrics(apps, &request),
        _ => Err("unsupported_capability".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn layout_window_requires_matching_basis_version_and_complete_coordinates() {
        let ids = vec!["1:A".to_owned(), "1:B".to_owned()];
        let stale = CitationLayoutWindowRecord {
            metadata: synthesis_repository::CitationLayoutMetadataRecord {
                graph_hash: "graph:1".into(),
                status: "ready".into(),
                layout_version: 1,
                ..synthesis_repository::CitationLayoutMetadataRecord::default()
            },
            points: Vec::new(),
        };
        assert_eq!(layout_status(Some(&stale), "graph:1", &ids, true), "stale");
        let ready = CitationLayoutWindowRecord {
            metadata: synthesis_repository::CitationLayoutMetadataRecord {
                layout_version: LAYOUT_VERSION,
                ..stale.metadata.clone()
            },
            points: ids
                .iter()
                .map(|id| synthesis_repository::CitationLayoutPointRecord {
                    node_id: id.clone(),
                    x: 1.0,
                    y: 2.0,
                })
                .collect(),
        };
        assert_eq!(layout_status(Some(&ready), "graph:1", &ids, true), "ready");
    }

    #[test]
    fn graph_window_cursor_is_versioned_deterministic_and_basis_bound() {
        let cursor = GraphWindowCursor {
            node_offset: 200,
            edge_offset: 400,
            hover_node_offset: 100,
            hover_edge_offset: 200,
        };
        let encoded = encode_cursor("graph:1", "sha256:query", &cursor);
        assert_eq!(
            decode_cursor(&encoded, "graph:1", "sha256:query").expect("cursor"),
            cursor
        );
        assert_eq!(
            decode_cursor(&encoded, "graph:2", "sha256:query").expect_err("stale graph"),
            "basis_mismatch"
        );
        assert_eq!(
            decode_cursor(&encoded, "graph:1", "sha256:other").expect_err("stale query"),
            "basis_mismatch"
        );
        assert_eq!(
            decode_cursor(&"x".repeat(GRAPH_CURSOR_MAX_LENGTH + 1), "graph:1", "query")
                .expect_err("oversized cursor"),
            "invalid_request"
        );
    }
}
