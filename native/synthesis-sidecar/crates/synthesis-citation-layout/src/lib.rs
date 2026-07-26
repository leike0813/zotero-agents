use forceatlas2::{Layout, Node, Settings, VecN};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::cmp::Ordering;
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::atomic::{AtomicBool, Ordering as AtomicOrdering};
use synthesis_protocol::compare_utf16;

pub const OPERATION: &str = "citation_graph_layout.v2";
pub const LAYOUT_VERSION: u8 = 2;
pub const NODE_MAX: usize = 5_000;
pub const EDGE_MAX: usize = 20_000;

const GOLDEN_ANGLE: f64 = 2.399_963_229_728_653;
const FORCE_ITERATIONS: usize = 700;
const FORCE_NODE_RADIUS: f64 = 24.0;
const FORCE_ISOLATED_RADIUS: f64 = 72.0;
const FORCE_ISOLATED_GAP: f64 = 96.0;
const RADIAL_LIBRARY_STEP: f64 = 82.0;
const RADIAL_EXTERNAL_OFFSET: f64 = 76.0;
const RADIAL_FALLBACK_STEP: f64 = 64.0;
const COMPONENT_GAP: f64 = 360.0;
const COMPONENT_NODE_GAP: f64 = 54.0;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Algorithm {
    Force,
    Radial,
    Components,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeKind {
    LibraryPaper,
    ExternalReference,
    UnresolvedReference,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RequestNode {
    pub node_id: String,
    pub kind: NodeKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub year: Option<String>,
    pub initial_x: f64,
    pub initial_y: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RequestEdge {
    pub edge_id: String,
    pub source: String,
    pub target: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Request {
    pub graph_hash: String,
    pub algorithm: Algorithm,
    pub nodes: Vec<RequestNode>,
    pub edges: Vec<RequestEdge>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultNode {
    pub node_id: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct ForceParams {
    pub theta: f64,
    pub ka: f64,
    pub kg: f64,
    pub kr: f64,
    pub lin_log: &'static str,
    pub strong_gravity: &'static str,
    pub prevent_overlapping: f64,
    pub speed: f64,
    pub node_radius: f64,
    pub iterations: usize,
    pub isolated_radius: f64,
    pub isolated_gap: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct RadialParams {
    pub library_radius_step: f64,
    pub external_offset: f64,
    pub fallback_radius_step: f64,
    pub golden_angle: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct ComponentParams {
    pub component_gap: f64,
    pub node_gap: f64,
    pub golden_angle: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
pub enum Params {
    Force(ForceParams),
    Radial(RadialParams),
    Components(ComponentParams),
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutResult {
    pub graph_hash: String,
    pub algorithm: Algorithm,
    pub layout_engine: &'static str,
    pub layout_version: u8,
    pub params: Params,
    pub nodes: Vec<ResultNode>,
}

fn valid_string(value: &str, max: usize) -> bool {
    !value.is_empty()
        && value.trim() == value
        && value.encode_utf16().count() <= max
        && !value.chars().any(|character| character.is_control())
}

fn validate_request(request: &mut Request) -> Result<(), &'static str> {
    if !request.graph_hash.starts_with("sha256:")
        || request.graph_hash.len() != 71
        || !request.graph_hash[7..]
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        || request.nodes.is_empty()
        || request.nodes.len() > NODE_MAX
        || request.edges.len() > EDGE_MAX
    {
        return Err("invalid_request");
    }
    let mut node_ids = HashSet::with_capacity(request.nodes.len());
    for node in &request.nodes {
        if !valid_string(&node.node_id, 512)
            || !node.initial_x.is_finite()
            || !node.initial_y.is_finite()
            || node
                .title
                .as_ref()
                .is_some_and(|value| !valid_string(value, 4096))
            || node
                .year
                .as_ref()
                .is_some_and(|value| !valid_string(value, 4096))
            || !node_ids.insert(node.node_id.clone())
        {
            return Err("invalid_request");
        }
    }
    let mut edge_ids = HashSet::with_capacity(request.edges.len());
    for edge in &request.edges {
        if !valid_string(&edge.edge_id, 512)
            || !valid_string(&edge.source, 512)
            || !valid_string(&edge.target, 512)
            || !edge_ids.insert(edge.edge_id.clone())
            || !node_ids.contains(&edge.source)
            || !node_ids.contains(&edge.target)
        {
            return Err("invalid_request");
        }
    }
    request
        .nodes
        .sort_by(|left, right| compare_utf16(&left.node_id, &right.node_id));
    request
        .edges
        .sort_by(|left, right| compare_utf16(&left.edge_id, &right.edge_id));
    Ok(())
}

fn force_params() -> Params {
    Params::Force(ForceParams {
        theta: 0.5,
        ka: 1.0,
        kg: 1.0,
        kr: 1.0,
        lin_log: "false",
        strong_gravity: "false",
        prevent_overlapping: 100.0,
        speed: 0.01,
        node_radius: FORCE_NODE_RADIUS,
        iterations: FORCE_ITERATIONS,
        isolated_radius: FORCE_ISOLATED_RADIUS,
        isolated_gap: FORCE_ISOLATED_GAP,
    })
}

fn radial_params() -> Params {
    Params::Radial(RadialParams {
        library_radius_step: RADIAL_LIBRARY_STEP,
        external_offset: RADIAL_EXTERNAL_OFFSET,
        fallback_radius_step: RADIAL_FALLBACK_STEP,
        golden_angle: GOLDEN_ANGLE,
    })
}

fn component_params() -> Params {
    Params::Components(ComponentParams {
        component_gap: COMPONENT_GAP,
        node_gap: COMPONENT_NODE_GAP,
        golden_angle: GOLDEN_ANGLE,
    })
}

fn round_coordinate(value: f64) -> f64 {
    let rounded = (value * 1000.0 + 0.5).floor() / 1000.0;
    if rounded == 0.0 { 0.0 } else { rounded }
}

fn spiral(index: usize, radius_step: f64) -> (f64, f64) {
    if index == 0 {
        return (0.0, 0.0);
    }
    let angle = index as f64 * GOLDEN_ANGLE;
    let radius = radius_step * (index as f64).sqrt();
    (angle.cos() * radius, angle.sin() * radius)
}

fn degree_maps(request: &Request) -> (HashMap<&str, usize>, HashMap<&str, usize>) {
    let mut incoming = HashMap::new();
    let mut outgoing = HashMap::new();
    for edge in &request.edges {
        *incoming.entry(edge.target.as_str()).or_insert(0) += 1;
        *outgoing.entry(edge.source.as_str()).or_insert(0) += 1;
    }
    (incoming, outgoing)
}

fn importance_cmp(
    left: &RequestNode,
    right: &RequestNode,
    incoming: &HashMap<&str, usize>,
    outgoing: &HashMap<&str, usize>,
) -> Ordering {
    let left_year = left
        .year
        .as_deref()
        .and_then(|value| value.parse::<f64>().ok())
        .filter(|value| *value != 0.0)
        .unwrap_or(f64::INFINITY);
    let right_year = right
        .year
        .as_deref()
        .and_then(|value| value.parse::<f64>().ok())
        .filter(|value| *value != 0.0)
        .unwrap_or(f64::INFINITY);
    let left_title = left
        .title
        .as_deref()
        .unwrap_or(&left.node_id)
        .to_lowercase();
    let right_title = right
        .title
        .as_deref()
        .unwrap_or(&right.node_id)
        .to_lowercase();
    incoming
        .get(right.node_id.as_str())
        .unwrap_or(&0)
        .cmp(incoming.get(left.node_id.as_str()).unwrap_or(&0))
        .then_with(|| {
            outgoing
                .get(right.node_id.as_str())
                .unwrap_or(&0)
                .cmp(outgoing.get(left.node_id.as_str()).unwrap_or(&0))
        })
        .then_with(|| {
            left_year
                .partial_cmp(&right_year)
                .unwrap_or(Ordering::Equal)
        })
        .then_with(|| compare_utf16(&left_title, &right_title))
        .then_with(|| compare_utf16(&left.node_id, &right.node_id))
}

fn result(
    request: &Request,
    layout_engine: &'static str,
    params: Params,
    coordinates: HashMap<String, (f64, f64)>,
) -> Result<LayoutResult, &'static str> {
    if coordinates.len() != request.nodes.len() {
        return Err("worker_result_invalid");
    }
    let mut nodes = Vec::with_capacity(request.nodes.len());
    for node in &request.nodes {
        let Some((x, y)) = coordinates.get(&node.node_id).copied() else {
            return Err("worker_result_invalid");
        };
        if !x.is_finite() || !y.is_finite() {
            return Err("worker_result_invalid");
        }
        nodes.push(ResultNode {
            node_id: node.node_id.clone(),
            x: round_coordinate(x),
            y: round_coordinate(y),
        });
    }
    Ok(LayoutResult {
        graph_hash: request.graph_hash.clone(),
        algorithm: request.algorithm,
        layout_engine,
        layout_version: LAYOUT_VERSION,
        params,
        nodes,
    })
}

fn compute_force(request: &Request, canceled: &AtomicBool) -> Result<LayoutResult, &'static str> {
    let connected_ids: HashSet<&str> = request
        .edges
        .iter()
        .flat_map(|edge| [edge.source.as_str(), edge.target.as_str()])
        .collect();
    let connected: Vec<&RequestNode> = request
        .nodes
        .iter()
        .filter(|node| connected_ids.contains(node.node_id.as_str()))
        .collect();
    let isolated: Vec<&RequestNode> = request
        .nodes
        .iter()
        .filter(|node| !connected_ids.contains(node.node_id.as_str()))
        .collect();
    let index_by_id: HashMap<&str, usize> = connected
        .iter()
        .enumerate()
        .map(|(index, node)| (node.node_id.as_str(), index))
        .collect();
    let nodes = connected
        .iter()
        .map(|node| Node {
            pos: VecN([node.initial_x, node.initial_y]),
            speed: VecN([0.0, 0.0]),
            old_speed: VecN([0.0, 0.0]),
            size: FORCE_NODE_RADIUS,
            mass: 1.0,
        })
        .collect();
    let edges = request
        .edges
        .iter()
        .map(|edge| {
            (
                (
                    *index_by_id.get(edge.source.as_str()).unwrap(),
                    *index_by_id.get(edge.target.as_str()).unwrap(),
                ),
                1.0,
            )
        })
        .collect();
    let mut coordinates = HashMap::with_capacity(request.nodes.len());
    if !connected.is_empty() {
        let settings = Settings {
            theta: 0.5,
            ka: 1.0,
            kg: 1.0,
            kr: 1.0,
            lin_log: false,
            prevent_overlapping: Some(100.0),
            speed: 0.01,
            strong_gravity: false,
        };
        let mut layout = Layout::<f64, 2>::from_positioned(settings, nodes, edges);
        for _ in 0..FORCE_ITERATIONS {
            if canceled.load(AtomicOrdering::Relaxed) {
                return Err("worker_canceled");
            }
            layout.iteration();
        }
        for (node, positioned) in connected.iter().zip(layout.nodes.iter()) {
            coordinates.insert(node.node_id.clone(), (positioned.pos[0], positioned.pos[1]));
        }
    }
    let max_x = coordinates
        .values()
        .map(|point| point.0)
        .reduce(f64::max)
        .unwrap_or(0.0);
    let min_y = coordinates
        .values()
        .map(|point| point.1)
        .reduce(f64::min)
        .unwrap_or(0.0);
    let center_x = max_x + FORCE_ISOLATED_RADIUS + FORCE_ISOLATED_GAP;
    for (index, node) in isolated.into_iter().enumerate() {
        let offset = spiral(index, FORCE_ISOLATED_RADIUS);
        coordinates.insert(
            node.node_id.clone(),
            (center_x + offset.0, min_y + offset.1),
        );
    }
    result(request, "forceatlas2-rust", force_params(), coordinates)
}

fn compute_radial(request: &Request) -> Result<LayoutResult, &'static str> {
    let (incoming, outgoing) = degree_maps(request);
    let mut library: Vec<&RequestNode> = request
        .nodes
        .iter()
        .filter(|node| node.kind == NodeKind::LibraryPaper)
        .collect();
    let mut external: Vec<&RequestNode> = request
        .nodes
        .iter()
        .filter(|node| node.kind != NodeKind::LibraryPaper)
        .collect();
    library.sort_by(|left, right| importance_cmp(left, right, &incoming, &outgoing));
    external.sort_by(|left, right| importance_cmp(left, right, &incoming, &outgoing));
    let mut coordinates = HashMap::with_capacity(request.nodes.len());
    for (index, node) in library.iter().enumerate() {
        coordinates.insert(node.node_id.clone(), spiral(index, RADIAL_LIBRARY_STEP));
    }
    let mut sources: HashMap<&str, Vec<&str>> = HashMap::new();
    for edge in &request.edges {
        sources
            .entry(edge.target.as_str())
            .or_default()
            .push(edge.source.as_str());
    }
    for (index, node) in external.iter().enumerate() {
        let source_points: Vec<(f64, f64)> = sources
            .get(node.node_id.as_str())
            .into_iter()
            .flatten()
            .filter_map(|source| coordinates.get(*source).copied())
            .collect();
        let point = if source_points.is_empty() {
            spiral(library.len() + index + 1, RADIAL_FALLBACK_STEP)
        } else {
            let count = source_points.len() as f64;
            let centroid = source_points.iter().fold((0.0, 0.0), |acc, point| {
                (acc.0 + point.0 / count, acc.1 + point.1 / count)
            });
            let angle = {
                let value = centroid.1.atan2(centroid.0);
                if value == 0.0 {
                    (index + 1) as f64 * GOLDEN_ANGLE
                } else {
                    value
                }
            };
            let offset = RADIAL_EXTERNAL_OFFSET
                + ((index + 1) as f64).sqrt() * (RADIAL_EXTERNAL_OFFSET / 3.0);
            (
                centroid.0 + angle.cos() * offset,
                centroid.1 + angle.sin() * offset,
            )
        };
        coordinates.insert(node.node_id.clone(), point);
    }
    result(request, "radial-rust", radial_params(), coordinates)
}

fn compute_components(request: &Request) -> Result<LayoutResult, &'static str> {
    let (incoming, outgoing) = degree_maps(request);
    let nodes_by_id: HashMap<&str, &RequestNode> = request
        .nodes
        .iter()
        .map(|node| (node.node_id.as_str(), node))
        .collect();
    let mut adjacency: HashMap<&str, Vec<&str>> = request
        .nodes
        .iter()
        .map(|node| (node.node_id.as_str(), Vec::new()))
        .collect();
    for edge in &request.edges {
        adjacency
            .get_mut(edge.source.as_str())
            .unwrap()
            .push(edge.target.as_str());
        adjacency
            .get_mut(edge.target.as_str())
            .unwrap()
            .push(edge.source.as_str());
    }
    for neighbors in adjacency.values_mut() {
        neighbors.sort_by(|left, right| compare_utf16(left, right));
    }
    let mut visited = HashSet::new();
    let mut components: Vec<Vec<&RequestNode>> = Vec::new();
    for node in &request.nodes {
        if !visited.insert(node.node_id.as_str()) {
            continue;
        }
        let mut queue = VecDeque::from([node.node_id.as_str()]);
        let mut component = Vec::new();
        while let Some(current) = queue.pop_front() {
            component.push(*nodes_by_id.get(current).unwrap());
            for next in adjacency.get(current).unwrap() {
                if visited.insert(*next) {
                    queue.push_back(next);
                }
            }
        }
        components.push(component);
    }
    components.sort_by(|left, right| {
        right
            .len()
            .cmp(&left.len())
            .then_with(|| compare_utf16(&left[0].node_id, &right[0].node_id))
    });
    let columns = ((components.len().max(1) as f64).sqrt().ceil() as usize).max(1);
    let mut coordinates = HashMap::with_capacity(request.nodes.len());
    let visible_columns = columns.min(components.len());
    for (component_index, component) in components.iter_mut().enumerate() {
        let column = component_index % columns;
        let row = component_index / columns;
        let center = (
            (column as f64 - (visible_columns as f64 - 1.0) / 2.0) * COMPONENT_GAP,
            row as f64 * COMPONENT_GAP,
        );
        component.sort_by(|left, right| importance_cmp(left, right, &incoming, &outgoing));
        for (index, node) in component.iter().enumerate() {
            let offset = spiral(index, COMPONENT_NODE_GAP);
            coordinates.insert(
                node.node_id.clone(),
                (center.0 + offset.0, center.1 + offset.1),
            );
        }
    }
    result(request, "components-rust", component_params(), coordinates)
}

pub fn compute_value(request: Value, canceled: &AtomicBool) -> Result<Value, &'static str> {
    let mut request: Request = serde_json::from_value(request).map_err(|_| "invalid_request")?;
    validate_request(&mut request)?;
    if canceled.load(AtomicOrdering::Relaxed) {
        return Err("worker_canceled");
    }
    let result = match request.algorithm {
        Algorithm::Force => compute_force(&request, canceled),
        Algorithm::Radial => compute_radial(&request),
        Algorithm::Components => compute_components(&request),
    }?;
    serde_json::to_value(result).map_err(|_| "worker_result_invalid")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn request(algorithm: &str) -> Value {
        json!({
            "graphHash": format!("sha256:{}", "a".repeat(64)),
            "algorithm": algorithm,
            "nodes": [
                {"nodeId":"paper:a","kind":"library_paper","title":"Alpha","year":"2020","initialX":-10.0,"initialY":4.0},
                {"nodeId":"paper:b","kind":"library_paper","title":"Beta","year":"2024","initialX":12.0,"initialY":-3.0},
                {"nodeId":"ref:c","kind":"external_reference","title":"Gamma","year":"2019","initialX":2.0,"initialY":8.0},
                {"nodeId":"paper:d","kind":"library_paper","title":"Isolated","year":"2018","initialX":4.0,"initialY":9.0}
            ],
            "edges": [
                {"edgeId":"edge:1","source":"paper:a","target":"paper:b"},
                {"edgeId":"edge:2","source":"paper:a","target":"ref:c"}
            ]
        })
    }

    #[test]
    fn computes_all_algorithms_with_v2_metadata_and_stable_nodes() {
        for (algorithm, engine) in [
            ("force", "forceatlas2-rust"),
            ("radial", "radial-rust"),
            ("components", "components-rust"),
        ] {
            let results: Vec<Value> = (0..3)
                .map(|_| compute_value(request(algorithm), &AtomicBool::new(false)).unwrap())
                .collect();
            assert_eq!(results[0], results[1]);
            assert_eq!(results[1], results[2]);
            let first = &results[0];
            assert_eq!(first["layoutVersion"], 2);
            assert_eq!(first["layoutEngine"], engine);
            assert_eq!(first["nodes"].as_array().unwrap().len(), 4);
            for node in first["nodes"].as_array().unwrap() {
                assert!(node["x"].as_f64().unwrap().is_finite());
                assert!(node["y"].as_f64().unwrap().is_finite());
            }
        }
    }

    #[test]
    fn satisfies_reviewed_connected_graph_quality_thresholds() {
        let result = compute_value(request("force"), &AtomicBool::new(false)).unwrap();
        let nodes = result["nodes"].as_array().unwrap();
        let positions: HashMap<&str, (f64, f64)> = nodes
            .iter()
            .map(|node| {
                (
                    node["nodeId"].as_str().unwrap(),
                    (node["x"].as_f64().unwrap(), node["y"].as_f64().unwrap()),
                )
            })
            .collect();
        let connected = ["paper:a", "paper:b", "ref:c"];
        let xs: Vec<f64> = connected.iter().map(|id| positions[id].0).collect();
        let ys: Vec<f64> = connected.iter().map(|id| positions[id].1).collect();
        let extent_x = xs.iter().copied().reduce(f64::max).unwrap()
            - xs.iter().copied().reduce(f64::min).unwrap();
        let extent_y = ys.iter().copied().reduce(f64::max).unwrap()
            - ys.iter().copied().reduce(f64::min).unwrap();
        assert!(extent_x > 20.0);
        assert!(extent_y > 20.0);
        for (source, target) in [("paper:a", "paper:b"), ("paper:a", "ref:c")] {
            let delta_x = positions[source].0 - positions[target].0;
            let delta_y = positions[source].1 - positions[target].1;
            let length = delta_x.hypot(delta_y);
            assert!((40.0..=120.0).contains(&length));
        }
        for (index, left) in connected.iter().enumerate() {
            for right in connected.iter().skip(index + 1) {
                let delta_x = positions[*left].0 - positions[*right].0;
                let delta_y = positions[*left].1 - positions[*right].1;
                assert!(delta_x.hypot(delta_y) >= 40.0);
            }
        }
    }

    #[test]
    fn preserves_structured_layout_semantics() {
        let radial = compute_value(request("radial"), &AtomicBool::new(false)).unwrap();
        let radial_nodes = radial["nodes"].as_array().unwrap();
        assert!(
            radial_nodes
                .iter()
                .any(|node| node["nodeId"] == "paper:b" && node["x"] == 0.0 && node["y"] == 0.0)
        );

        let components = compute_value(request("components"), &AtomicBool::new(false)).unwrap();
        assert!(
            components["nodes"]
                .as_array()
                .unwrap()
                .iter()
                .any(|node| node["nodeId"] == "paper:d" && node["x"] == 180.0)
        );
    }

    #[test]
    fn rejects_invalid_requests_and_honors_cancellation() {
        let mut invalid = request("force");
        invalid["nodes"][1]["nodeId"] = json!("paper:a");
        assert_eq!(
            compute_value(invalid, &AtomicBool::new(false)),
            Err("invalid_request")
        );
        assert_eq!(
            compute_value(request("force"), &AtomicBool::new(true)),
            Err("worker_canceled")
        );
    }
}
