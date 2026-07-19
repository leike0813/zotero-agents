use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::atomic::{AtomicBool, Ordering as AtomicOrdering};
use synthesis_protocol::{
    LibraryNodeMetrics, METRICS_VERSION, MetricsDiagnostics, MetricsParams, MetricsRequest,
    MetricsResult, NodeKind, compare_utf16, rebuild_metrics_request,
};

const DAMPING: f64 = 0.85;
const ITERATIONS: usize = 50;
const FOUNDATION: &str =
    "is_isolated ? 0.15*age_norm : 0.50*in_degree_norm + 0.35*pagerank_norm + 0.15*age_norm";
const FRONTIER: &str = "is_isolated ? 0.55*recency_norm : 0.55*recency_norm + 0.25*out_degree_norm + 0.20*pagerank_norm";

fn rounded(value: f64) -> f64 {
    (value * 1_000_000.0).round() / 1_000_000.0
}
fn normalized(value: f64, max: f64) -> f64 {
    if max <= 0.0 {
        0.0
    } else {
        rounded(value.max(0.0) / max)
    }
}

fn metric_year(value: Option<&str>) -> Option<i32> {
    let bytes = value?.trim().as_bytes();
    for index in 0..bytes.len().saturating_sub(3) {
        let part = &bytes[index..index + 4];
        if part.iter().all(u8::is_ascii_digit)
            && (index == 0 || !bytes[index - 1].is_ascii_alphanumeric() && bytes[index - 1] != b'_')
            && (index + 4 == bytes.len()
                || !bytes[index + 4].is_ascii_alphanumeric() && bytes[index + 4] != b'_')
        {
            let year = std::str::from_utf8(part).ok()?.parse().ok()?;
            if (1500..=2199).contains(&year) {
                return Some(year);
            }
        }
    }
    None
}

pub fn compute(
    request: MetricsRequest,
    canceled: &AtomicBool,
) -> Result<MetricsResult, &'static str> {
    let request = rebuild_metrics_request(request)?;
    if canceled.load(AtomicOrdering::Relaxed) {
        return Err("worker_canceled");
    }
    let library_nodes: Vec<_> = request
        .nodes
        .iter()
        .filter(|node| node.kind == NodeKind::LibraryPaper)
        .collect();
    let ids: Vec<_> = library_nodes
        .iter()
        .map(|node| node.node_id.clone())
        .collect();
    let library_set: HashSet<_> = ids.iter().cloned().collect();
    let node_kinds: HashMap<_, _> = request
        .nodes
        .iter()
        .map(|node| (node.node_id.as_str(), &node.kind))
        .collect();
    let internal_edges: Vec<_> = request
        .edges
        .iter()
        .filter(|edge| library_set.contains(&edge.source) && library_set.contains(&edge.target))
        .collect();
    let mut incoming = HashMap::new();
    let mut outgoing = HashMap::new();
    let mut external = HashMap::new();
    let mut unresolved = HashMap::new();
    for id in &ids {
        incoming.insert(id.clone(), 0.0);
        outgoing.insert(id.clone(), 0.0);
        external.insert(id.clone(), 0.0);
        unresolved.insert(id.clone(), 0.0);
    }
    for edge in &request.edges {
        let weight = edge.mention_count.max(1.0);
        if library_set.contains(&edge.source) && library_set.contains(&edge.target) {
            *outgoing.get_mut(&edge.source).unwrap() += weight;
            *incoming.get_mut(&edge.target).unwrap() += weight;
        } else if library_set.contains(&edge.source) {
            match node_kinds.get(edge.target.as_str()) {
                Some(NodeKind::ExternalReference) => {
                    *external.get_mut(&edge.source).unwrap() += weight
                }
                Some(NodeKind::UnresolvedReference) => {
                    *unresolved.get_mut(&edge.source).unwrap() += weight
                }
                _ => {}
            }
        }
    }

    let count = ids.len();
    let mut ranks: HashMap<String, f64> = ids
        .iter()
        .map(|id| {
            (
                id.clone(),
                if count == 0 { 0.0 } else { 1.0 / count as f64 },
            )
        })
        .collect();
    let mut links: HashMap<String, Vec<(String, f64)>> =
        ids.iter().map(|id| (id.clone(), Vec::new())).collect();
    for edge in &internal_edges {
        links
            .get_mut(&edge.source)
            .unwrap()
            .push((edge.target.clone(), edge.mention_count.max(1.0)));
    }
    for _ in 0..ITERATIONS {
        if canceled.load(AtomicOrdering::Relaxed) {
            return Err("worker_canceled");
        }
        let base = if count == 0 {
            0.0
        } else {
            (1.0 - DAMPING) / count as f64
        };
        let mut next: HashMap<String, f64> = ids.iter().map(|id| (id.clone(), base)).collect();
        let mut dangling = 0.0;
        for id in &ids {
            let rank = ranks[id];
            let outgoing_links = &links[id];
            let total: f64 = outgoing_links.iter().map(|(_, weight)| weight).sum();
            if outgoing_links.is_empty() || total <= 0.0 {
                dangling += rank;
                continue;
            }
            for (target, weight) in outgoing_links {
                *next.get_mut(target).unwrap() += DAMPING * rank * (*weight / total);
            }
        }
        let share = if count == 0 {
            0.0
        } else {
            DAMPING * dangling / count as f64
        };
        for id in &ids {
            ranks.insert(id.clone(), next[id] + share);
        }
    }
    for rank in ranks.values_mut() {
        *rank = rounded(*rank);
    }

    let mut adjacency: HashMap<String, HashSet<String>> =
        ids.iter().map(|id| (id.clone(), HashSet::new())).collect();
    for edge in &internal_edges {
        adjacency
            .get_mut(&edge.source)
            .unwrap()
            .insert(edge.target.clone());
        adjacency
            .get_mut(&edge.target)
            .unwrap()
            .insert(edge.source.clone());
    }
    let mut seen = HashSet::new();
    let mut components: Vec<Vec<String>> = Vec::new();
    for id in &ids {
        if seen.contains(id) {
            continue;
        }
        let mut queue = VecDeque::from([id.clone()]);
        seen.insert(id.clone());
        let mut component = Vec::new();
        while let Some(current) = queue.pop_front() {
            component.push(current.clone());
            let mut neighbors: Vec<_> = adjacency[&current].iter().cloned().collect();
            neighbors.sort_by(|a, b| compare_utf16(a, b));
            for next in neighbors {
                if seen.insert(next.clone()) {
                    queue.push_back(next);
                }
            }
        }
        component.sort_by(|a, b| compare_utf16(a, b));
        components.push(component);
    }
    components.sort_by(|a, b| compare_utf16(&a[0], &b[0]));
    let mut component_by_node = HashMap::new();
    for (index, component) in components.iter().enumerate() {
        for id in component {
            component_by_node.insert(
                id.clone(),
                (format!("component:{:03}", index + 1), component.len()),
            );
        }
    }

    let years: Vec<_> = library_nodes
        .iter()
        .filter_map(|node| metric_year(node.year.as_deref()))
        .collect();
    let graph_year = years.iter().max().copied();
    let min_year = years.iter().min().copied();
    let span = match (graph_year, min_year) {
        (Some(max), Some(min)) if max > min => max - min,
        _ => 0,
    };
    let max_in = incoming.values().copied().fold(0.0, f64::max);
    let max_out = outgoing.values().copied().fold(0.0, f64::max);
    let max_rank = ranks.values().copied().fold(0.0, f64::max);
    let mut metrics = Vec::new();
    for node in library_nodes {
        let year = metric_year(node.year.as_deref());
        let age = if let (Some(year), Some(max)) = (year, graph_year) {
            if span > 0 {
                rounded((max - year) as f64 / span as f64)
            } else {
                0.0
            }
        } else {
            0.0
        };
        let recency = if year.is_some() && graph_year.is_some() {
            if span > 0 { rounded(1.0 - age) } else { 1.0 }
        } else {
            0.0
        };
        let in_degree = incoming[&node.node_id];
        let out_degree = outgoing[&node.node_id];
        let rank = ranks[&node.node_id];
        let in_norm = normalized(in_degree, max_in);
        let out_norm = normalized(out_degree, max_out);
        let rank_norm = normalized(rank, max_rank);
        let (component_id, component_size) = component_by_node[&node.node_id].clone();
        let isolated = component_size <= 1;
        let foundation = rounded(if isolated {
            0.15 * age
        } else {
            0.5 * in_norm + 0.35 * rank_norm + 0.15 * age
        });
        let frontier = rounded(if isolated {
            0.55 * recency
        } else {
            0.55 * recency + 0.25 * out_norm + 0.2 * rank_norm
        });
        let mut hints = HashSet::new();
        if foundation >= 0.65 && rank_norm >= 0.35 {
            hints.insert("core");
        }
        if foundation >= 0.55 && in_norm >= 0.35 {
            hints.insert("foundation");
        }
        if frontier >= 0.55 && recency >= 0.5 {
            hints.insert("frontier");
        }
        if isolated {
            hints.insert("isolated");
        }
        if external[&node.node_id] + unresolved[&node.node_id] >= 3.0
            && external[&node.node_id] + unresolved[&node.node_id] >= out_degree * 2.0
        {
            hints.insert("external-heavy");
        }
        let mut role_hints: Vec<_> = hints.into_iter().map(str::to_owned).collect();
        role_hints.sort_by(|a, b| compare_utf16(a, b));
        metrics.push(LibraryNodeMetrics {
            node_id: node.node_id.clone(),
            paper_ref: node
                .library_id
                .zip(node.item_key.as_ref())
                .map(|(id, key)| format!("{id}:{key}")),
            item_key: node.item_key.clone(),
            title: node.title.clone(),
            year: node.year.clone(),
            internal_in_degree: in_degree,
            internal_out_degree: out_degree,
            external_reference_count: external[&node.node_id],
            unresolved_reference_count: unresolved[&node.node_id],
            internal_pagerank: rounded(rank),
            component_id,
            component_size,
            is_isolated: isolated,
            age_norm: age,
            recency_norm: recency,
            in_degree_norm: in_norm,
            out_degree_norm: out_norm,
            pagerank_norm: rank_norm,
            foundation_score: foundation,
            frontier_score: frontier,
            synthesis_role_hints: role_hints,
        });
    }
    metrics.sort_by(|a, b| compare_utf16(&a.node_id, &b.node_id));
    Ok(MetricsResult {
        graph_hash: request.graph_hash,
        metrics_version: METRICS_VERSION,
        params: MetricsParams {
            pagerank_damping: DAMPING,
            pagerank_iterations: ITERATIONS as u8,
            foundation_formula: FOUNDATION.to_owned(),
            frontier_formula: FRONTIER.to_owned(),
        },
        graph_year,
        library_node_metrics: metrics,
        diagnostics: MetricsDiagnostics {
            library_node_count: ids.len(),
            external_reference_count: request
                .nodes
                .iter()
                .filter(|node| node.kind == NodeKind::ExternalReference)
                .count(),
            unresolved_reference_count: request
                .nodes
                .iter()
                .filter(|node| node.kind == NodeKind::UnresolvedReference)
                .count(),
            component_count: components.len(),
            isolated_library_node_count: components
                .iter()
                .filter(|component| component.len() == 1)
                .count(),
            missing_year_count: ids.len() - years.len(),
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use synthesis_protocol::{canonical_json, canonical_sha256};

    #[test]
    fn matches_metrics_gold_case() {
        let corpus_path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../../../packages/synthesis-contracts/contract-set/synthesis-cross-language-v1/corpus/positive.json"
        );
        let corpus: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(corpus_path).unwrap()).unwrap();
        let case = corpus["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|case| case["id"] == "metrics-result-v2")
            .unwrap();
        let request: MetricsRequest =
            serde_json::from_str(case["inputJson"].as_str().unwrap()).unwrap();
        let result = compute(request, &AtomicBool::new(false)).unwrap();
        assert_eq!(canonical_json(&result).unwrap(), case["canonicalJson"]);
        assert_eq!(canonical_sha256(&result).unwrap(), case["sha256"]);
    }
}
