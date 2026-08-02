use crate::runtime_production_ports::ProductionApplications;
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet, HashSet};
use synthesis_application::citation_graph::project_citation_graph_default;
use synthesis_protocol::canonical_sha256;
use synthesis_repository::{
    CacheBasisRecord, CitationComplexMetricsRecord, CitationEdgeRecord,
    CitationGraphApplicationStateRecord, CitationGraphWindowFilter, CitationGraphWindowNodeRecord,
    CitationGraphWindowQuery, CitationGraphWindowRows, CitationLayoutRecord,
    CitationLightMetricsRecord, CitationNodeRecord,
};

const CACHE_KEY: &str = "citation-graph:library";
const LAYOUT_VERSION: i64 = 2;
const DEFAULT_LIMIT: usize = 100;
const MAX_LIMIT: usize = 500;
const DEFAULT_NODE_LIMIT: usize = 200;
const DEFAULT_EDGE_LIMIT: usize = 400;
const DEFAULT_HOVER_NODE_LIMIT: usize = 100;
const DEFAULT_HOVER_EDGE_LIMIT: usize = 200;
const GRAPH_RESPONSE_BUDGET_BYTES: usize = 768 * 1024;
const GRAPH_CURSOR_MAX_LENGTH: usize = 4096;
const TOPIC_SCOPE_LIMIT: usize = 250;

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
    topic_scope_total: usize,
    layout: Option<CitationLayoutRecord>,
    cache: Option<CacheBasisRecord>,
}

#[derive(Clone, Debug, Default)]
struct CitationGraphReadSnapshot {
    state: Option<CitationGraphApplicationStateRecord>,
    nodes: Vec<CitationNodeRecord>,
    edges: Vec<CitationEdgeRecord>,
    complex_metrics: Vec<CitationComplexMetricsRecord>,
    layouts: Vec<CitationLayoutRecord>,
}

#[derive(Clone, Debug)]
struct ProjectedNode {
    record: CitationNodeRecord,
    external_degree: Option<usize>,
    visibility: &'static str,
    display_tier: &'static str,
}

#[derive(Clone, Debug, Default)]
struct CitationGraphProjection {
    graph_hash: String,
    main_nodes: Vec<ProjectedNode>,
    main_edges: Vec<CitationEdgeRecord>,
    complex_metrics: Vec<CitationComplexMetricsRecord>,
    layouts: Vec<CitationLayoutRecord>,
}

fn read_topic_scopes(
    repository: &synthesis_repository::Repository,
) -> Result<(Vec<Value>, usize), String> {
    let mut topic_scopes = Vec::new();
    let (records, total) = repository.list_topic_application_records(0, TOPIC_SCOPE_LIMIT)?;
    for (state, projection) in records {
        if let Some(projection) = projection {
            let discovery = serde_json::from_str::<Value>(&projection.discovery_json)
                .unwrap_or_else(|_| json!({}));
            let paper_refs = discovery["source_paper_refs"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .filter(|value| !value.is_empty())
                .map(str::to_owned)
                .collect::<BTreeSet<_>>()
                .into_iter()
                .collect::<Vec<_>>();
            if !paper_refs.is_empty() {
                topic_scopes.push(json!({
                    "topicId":state.topic_id,
                    "title":if state.title.is_empty() { state.topic_id.clone() } else { state.title },
                    "paperRefs":paper_refs,
                    "nodeIds":paper_refs,
                }));
            }
        }
    }
    topic_scopes.sort_by(|left, right| {
        left["title"]
            .as_str()
            .cmp(&right["title"].as_str())
            .then_with(|| left["topicId"].as_str().cmp(&right["topicId"].as_str()))
    });
    Ok((topic_scopes, total))
}

fn read_snapshot(apps: &ProductionApplications) -> Result<CitationGraphReadSnapshot, String> {
    let owner = apps.repository.owner();
    let repository = owner
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?;
    Ok(CitationGraphReadSnapshot {
        state: repository.get_citation_graph_application_state()?,
        nodes: repository.list_citation_nodes()?,
        edges: repository.list_citation_edges()?,
        complex_metrics: repository.list_citation_complex_metrics()?,
        layouts: repository.list_citation_layouts()?,
    })
}

fn project(snapshot: CitationGraphReadSnapshot) -> CitationGraphProjection {
    let default = project_citation_graph_default(snapshot.nodes, snapshot.edges);
    let external_degrees = default.external_degrees;
    let projected_node = |record: CitationNodeRecord, visibility, display_tier| ProjectedNode {
        external_degree: (!record.has_zotero_binding).then(|| {
            external_degrees
                .get(&record.literature_item_id)
                .copied()
                .unwrap_or_default()
        }),
        record,
        visibility,
        display_tier,
    };
    let main_nodes = default
        .nodes
        .into_iter()
        .map(|node| {
            let tier = if node.has_zotero_binding {
                "library"
            } else {
                "shared_external"
            };
            projected_node(node, "default", tier)
        })
        .collect();
    CitationGraphProjection {
        graph_hash: snapshot
            .state
            .map(|state| state.graph_hash)
            .unwrap_or_default(),
        main_nodes,
        main_edges: default.edges,
        complex_metrics: snapshot.complex_metrics,
        layouts: snapshot.layouts,
    }
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
            let (topic_scopes, topic_scope_total) = read_topic_scopes(&repository)?;
            return Ok(GraphWindowRead {
                graph_hash,
                query_signature: signature,
                cursor,
                rows,
                topic_scopes,
                topic_scope_total,
                layout: repository
                    .get_citation_layout(&format!("workbench_overview:{algorithm}"))?,
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

fn layout<'a>(
    projection: &'a CitationGraphProjection,
    algorithm: &str,
) -> Option<&'a CitationLayoutRecord> {
    let key = format!("workbench_overview:{algorithm}");
    projection
        .layouts
        .iter()
        .find(|layout| layout.layout_key == key)
}

fn parsed_layout(
    record: &CitationLayoutRecord,
    graph_hash: &str,
    node_ids: &[String],
) -> Option<Value> {
    if record.status != "ready" || record.graph_hash != graph_hash {
        return None;
    }
    let value = serde_json::from_str::<Value>(&record.layout_json).ok()?;
    if value["graph_hash"].as_str()? != graph_hash
        || value["layout_version"].as_i64()? != LAYOUT_VERSION
        || !value["nodes"].is_object()
    {
        return None;
    }
    for node_id in node_ids {
        let point = &value["nodes"][node_id];
        if point["x"].as_f64().is_none_or(|value| !value.is_finite())
            || point["y"].as_f64().is_none_or(|value| !value.is_finite())
        {
            return None;
        }
    }
    Some(value)
}

fn layout_status(
    record: Option<&CitationLayoutRecord>,
    layout: Option<&Value>,
    has_nodes: bool,
) -> &'static str {
    if !has_nodes {
        return "missing";
    }
    match record.map(|record| record.status.as_str()) {
        None => "missing",
        Some("running") => "refreshing",
        Some("failed") => "failed",
        Some("ready") if layout.is_some() => "ready",
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
    let normalized_layout = window
        .layout
        .as_ref()
        .and_then(|record| parsed_layout(record, &window.graph_hash, &node_ids));
    let status = layout_status(
        window.layout.as_ref(),
        normalized_layout.as_ref(),
        !nodes.is_empty(),
    );
    if let Some(layout) = &normalized_layout {
        for node in &mut nodes {
            let Some(node_id) = node["id"].as_str().map(str::to_owned) else {
                continue;
            };
            node["x"] = layout["nodes"][&node_id]["x"].clone();
            node["y"] = layout["nodes"][&node_id]["y"].clone();
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
            "returned":topic_scope_returned,
            "total":window.topic_scope_total,
            "limit":TOPIC_SCOPE_LIMIT,
            "hasMore":window.topic_scope_total>TOPIC_SCOPE_LIMIT,
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

fn page(values: Vec<Value>, cursor: usize, limit: usize) -> (Vec<Value>, Value) {
    let total = values.len();
    let start = cursor.min(total);
    let end = (start + limit).min(total);
    let has_more = end < total;
    (
        values[start..end].to_vec(),
        json!({
            "cursor":start.to_string(),
            "nextCursor":if has_more { end.to_string() } else { String::new() },
            "hasMore":has_more,
            "returned":end-start,
            "total":total,
            "limit":limit,
        }),
    )
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

fn metrics(projection: &CitationGraphProjection, request: &Map<String, Value>) -> Value {
    let cursor = usize_field(request, &["cursor"], 0, usize::MAX);
    let limit = usize_field(request, &["limit"], DEFAULT_LIMIT, MAX_LIMIT).max(1);
    let sort = string_field(request, &["sortBy", "sort_by"]).unwrap_or("foundation");
    let mut records = projection.complex_metrics.clone();
    records.sort_by(|left, right| {
        let order = match sort {
            "frontier" => right.frontier_score.total_cmp(&left.frontier_score),
            "pagerank" => right.internal_pagerank.total_cmp(&left.internal_pagerank),
            "in_degree" => right.internal_in_degree.cmp(&left.internal_in_degree),
            _ => right.foundation_score.total_cmp(&left.foundation_score),
        };
        order.then_with(|| left.node_id.cmp(&right.node_id))
    });
    let metrics_hash = records
        .first()
        .map(|record| record.metrics_hash.clone())
        .unwrap_or_default();
    let stale = records
        .iter()
        .any(|record| record.source_graph_hash != projection.graph_hash);
    let (items, page_info) = page(records.iter().map(public_metric).collect(), cursor, limit);
    let status = if records.is_empty() {
        "missing"
    } else if stale {
        "stale"
    } else {
        "ready"
    };
    json!({
        "ok":true,"graph_hash":projection.graph_hash,"metrics_hash":metrics_hash,"status":status,
        "items":items,"cursor":page_info["cursor"],"nextCursor":page_info["nextCursor"],"hasMore":page_info["hasMore"],
        "returned":page_info["returned"],"total":page_info["total"],"limit":page_info["limit"],
        "diagnostics":{"snapshot_found":!projection.graph_hash.is_empty(),"metrics_found":!records.is_empty(),"stale":stale,"total_library_nodes":records.len(),"returned_count":items.len(),"warnings":[]},
    })
}

fn layout_result(projection: &CitationGraphProjection, request: &Map<String, Value>) -> Value {
    let algorithm = string_field(request, &["preset", "algorithm"])
        .filter(|value| matches!(*value, "force" | "radial" | "components"))
        .unwrap_or("force");
    let nodes = projection
        .main_nodes
        .iter()
        .map(public_node)
        .collect::<Vec<_>>();
    let edges = projection
        .main_edges
        .iter()
        .map(|edge| public_edge(edge, "default"))
        .collect::<Vec<_>>();
    let node_ids = nodes
        .iter()
        .filter_map(|node| node["node_id"].as_str().map(str::to_owned))
        .collect::<Vec<_>>();
    let record = layout(projection, algorithm);
    let normalized =
        record.and_then(|record| parsed_layout(record, &projection.graph_hash, &node_ids));
    let status = layout_status(record, normalized.as_ref(), !nodes.is_empty());
    let layout_nodes = normalized.as_ref().map(|layout| {
        nodes.iter().filter_map(|node| {
            let node_id = node["node_id"].as_str()?;
            Some(json!({
                "node_id":node_id,"title":node["title"],"node_type":node["kind"],"paper_ref":node_id,
                "year":node["year"],"authors":node["authors"],"x":layout["nodes"][node_id]["x"],"y":layout["nodes"][node_id]["y"],
                "low_signal":node["low_signal"],
            }))
        }).collect::<Vec<_>>()
    }).unwrap_or_default();
    let layout_edges = if status == "ready" {
        edges
            .iter()
            .map(|edge| {
                json!({
                    "edge_id":edge["edge_id"],
                    "source":edge["source"],
                    "target":edge["target"],
                    "primary_role":edge["primary_role"],
                    "aux_roles":edge["aux_roles"],
                    "weight":edge["mention_count"],
                })
            })
            .collect::<Vec<_>>()
    } else {
        Vec::new()
    };
    let edge_count = layout_edges.len();
    json!({
        "ok":status=="ready","status":status,"scope":"full","graph_hash":projection.graph_hash,
        "layout_hash":normalized.as_ref().and_then(|layout| layout["layout_hash"].as_str()).unwrap_or_default(),
        "layout_status":status,"preset":algorithm,"view_key":"workbench_overview","nodes":layout_nodes,
        "edges":layout_edges,
        "diagnostics":{"snapshot_found":!projection.graph_hash.is_empty(),"layout_found":record.is_some(),"node_count":layout_nodes.len(),"edge_count":edge_count,"truncated":false,"warnings":[]},
    })
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
        "client.getCitationGraphLayout" => {
            Ok(layout_result(&project(read_snapshot(apps)?), &request))
        }
        "client.getCitationGraphMetrics" | "client.rankLibraryPapers" => {
            Ok(metrics(&project(read_snapshot(apps)?), &request))
        }
        _ => Err("unsupported_capability".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn node(id: &str, bound: bool, title: &str) -> CitationNodeRecord {
        CitationNodeRecord {
            literature_item_id: id.into(),
            node_status: "active".into(),
            has_zotero_binding: bound,
            title: title.into(),
            authors_json: "[]".into(),
            ..CitationNodeRecord::default()
        }
    }

    fn edge(id: &str, source: &str, target: &str) -> CitationEdgeRecord {
        CitationEdgeRecord {
            edge_id: id.into(),
            source_literature_item_id: source.into(),
            target_literature_item_id: target.into(),
            edge_status: "unbound".into(),
            weight: 1.0,
            ..CitationEdgeRecord::default()
        }
    }

    fn snapshot() -> CitationGraphReadSnapshot {
        CitationGraphReadSnapshot {
            state: Some(CitationGraphApplicationStateRecord {
                graph_hash: "graph:1".into(),
                ..CitationGraphApplicationStateRecord::default()
            }),
            nodes: vec![
                node("1:A", true, "A"),
                node("1:B", true, "B"),
                node("external:shared", false, "Shared"),
                node("external:hover", false, "Hover"),
            ],
            edges: vec![
                edge("e1", "1:A", "external:shared"),
                edge("e2", "1:B", "external:shared"),
                edge("e3", "1:A", "external:hover"),
            ],
            ..CitationGraphReadSnapshot::default()
        }
    }

    #[test]
    fn compute_projection_uses_default_layout_membership() {
        let projection = project(snapshot());
        assert_eq!(projection.main_nodes.len(), 3);
        assert_eq!(projection.main_edges.len(), 2);
        assert!(
            projection
                .main_nodes
                .iter()
                .all(|node| node.visibility == "default")
        );
    }

    #[test]
    fn raw_worker_layout_is_stale_and_normalized_layout_is_ready() {
        let mut projection = project(snapshot());
        let ids = projection
            .main_nodes
            .iter()
            .map(|node| node.record.literature_item_id.clone())
            .collect::<Vec<_>>();
        let raw = CitationLayoutRecord {
            layout_key: "workbench_overview:force".into(),
            graph_hash: "graph:1".into(),
            status: "ready".into(),
            layout_json: r#"{"graphHash":"graph:1","layoutVersion":2,"nodes":[]}"#.into(),
            ..CitationLayoutRecord::default()
        };
        assert!(parsed_layout(&raw, "graph:1", &ids).is_none());
        let coordinates = ids
            .iter()
            .map(|id| (id.clone(), json!({"x":1.0,"y":2.0})))
            .collect::<Map<_, _>>();
        let normalized = CitationLayoutRecord {
            layout_json: json!({"graph_hash":"graph:1","layout_version":2,"nodes":coordinates})
                .to_string(),
            ..raw.clone()
        };
        assert!(parsed_layout(&normalized, "graph:1", &ids).is_some());
        projection.layouts.push(normalized);
        assert_eq!(
            layout_status(
                layout(&projection, "force"),
                parsed_layout(layout(&projection, "force").unwrap(), "graph:1", &ids).as_ref(),
                true
            ),
            "ready"
        );
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
