use serde::{Deserialize, Serialize, Serializer};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::cmp::Ordering;
use std::collections::HashSet;

pub const WORKER_PROTOCOL: &str = "synthesis-rust-worker.v1";
pub const METRICS_OPERATION: &str = "citation_graph_metrics.v1";
pub const METRICS_VERSION: u8 = 2;
pub const NODE_MAX: usize = 5_000;
pub const EDGE_MAX: usize = 20_000;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NodeKind {
    LibraryPaper,
    ExternalReference,
    UnresolvedReference,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MetricsNode {
    pub node_id: String,
    pub kind: NodeKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub library_id: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MetricsEdge {
    pub edge_id: String,
    pub source: String,
    pub target: String,
    pub mention_count: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MetricsRequest {
    pub graph_hash: String,
    pub nodes: Vec<MetricsNode>,
    pub edges: Vec<MetricsEdge>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetricsParams {
    pub pagerank_damping: f64,
    pub pagerank_iterations: u8,
    pub foundation_formula: String,
    pub frontier_formula: String,
}

fn serialize_js_number<S>(value: &f64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    if *value >= 0.0 && value.fract() == 0.0 && *value <= 9_007_199_254_740_991.0 {
        serializer.serialize_u64(*value as u64)
    } else {
        serializer.serialize_f64(*value)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryNodeMetrics {
    pub node_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paper_ref: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<String>,
    #[serde(serialize_with = "serialize_js_number")]
    pub internal_in_degree: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub internal_out_degree: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub external_reference_count: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub unresolved_reference_count: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub internal_pagerank: f64,
    pub component_id: String,
    pub component_size: usize,
    pub is_isolated: bool,
    #[serde(serialize_with = "serialize_js_number")]
    pub age_norm: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub recency_norm: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub in_degree_norm: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub out_degree_norm: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub pagerank_norm: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub foundation_score: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub frontier_score: f64,
    pub synthesis_role_hints: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MetricsDiagnostics {
    pub library_node_count: usize,
    pub external_reference_count: usize,
    pub unresolved_reference_count: usize,
    pub component_count: usize,
    pub isolated_library_node_count: usize,
    pub missing_year_count: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetricsResult {
    pub graph_hash: String,
    pub metrics_version: u8,
    pub params: MetricsParams,
    pub graph_year: Option<i32>,
    pub library_node_metrics: Vec<LibraryNodeMetrics>,
    pub diagnostics: MetricsDiagnostics,
}

pub fn compare_utf16(left: &str, right: &str) -> Ordering {
    left.encode_utf16().cmp(right.encode_utf16())
}

fn valid_text(value: &str, max: usize) -> bool {
    !value.is_empty() && value.encode_utf16().count() <= max
}

pub fn rebuild_metrics_request(
    mut request: MetricsRequest,
) -> Result<MetricsRequest, &'static str> {
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
    let mut node_ids = HashSet::new();
    for node in &request.nodes {
        if !valid_text(&node.node_id, 512)
            || !node_ids.insert(node.node_id.clone())
            || node.library_id == Some(0)
            || node
                .item_key
                .as_deref()
                .is_some_and(|value| !valid_text(value, 4_096))
            || node
                .title
                .as_deref()
                .is_some_and(|value| !valid_text(value, 4_096))
            || node
                .year
                .as_deref()
                .is_some_and(|value| !valid_text(value, 4_096))
        {
            return Err("invalid_request");
        }
    }
    let mut edge_ids = HashSet::new();
    for edge in &request.edges {
        if !valid_text(&edge.edge_id, 512)
            || !edge_ids.insert(edge.edge_id.clone())
            || !node_ids.contains(&edge.source)
            || !node_ids.contains(&edge.target)
            || !edge.mention_count.is_finite()
            || edge.mention_count <= 0.0
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
    Ok(request)
}

fn write_canonical(value: &Value, output: &mut String) -> Result<(), &'static str> {
    match value {
        Value::Null => output.push_str("null"),
        Value::Bool(value) => output.push_str(if *value { "true" } else { "false" }),
        Value::Number(value) => {
            if value.as_f64() == Some(0.0) {
                output.push('0');
            } else {
                output.push_str(&value.to_string());
            }
        }
        Value::String(value) => {
            output.push_str(&serde_json::to_string(value).map_err(|_| "invalid_json")?)
        }
        Value::Array(values) => {
            output.push('[');
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                write_canonical(value, output)?;
            }
            output.push(']');
        }
        Value::Object(values) => {
            output.push('{');
            let mut entries: Vec<_> = values.iter().collect();
            entries.sort_by(|(left, _), (right, _)| compare_utf16(left, right));
            for (index, (key, value)) in entries.into_iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                output.push_str(&serde_json::to_string(key).map_err(|_| "invalid_json")?);
                output.push(':');
                write_canonical(value, output)?;
            }
            output.push('}');
        }
    }
    Ok(())
}

pub fn canonical_json<T: Serialize>(value: &T) -> Result<String, &'static str> {
    let value = serde_json::to_value(value).map_err(|_| "invalid_json")?;
    let mut output = String::new();
    write_canonical(&value, &mut output)?;
    Ok(output)
}

pub fn canonical_sha256<T: Serialize>(value: &T) -> Result<String, &'static str> {
    let canonical = canonical_json(value)?;
    let digest = Sha256::digest(canonical.as_bytes());
    Ok(format!("sha256:{digest:x}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonicalizes_utf16_keys_and_hashes() {
        let value: Value =
            serde_json::from_str(r#"{"\ue000":1,"😀":2,"a":-0,"float":1e-7}"#).unwrap();
        assert_eq!(
            canonical_json(&value).unwrap(),
            r#"{"a":0,"float":1e-7,"😀":2,"":1}"#
        );
        assert_eq!(
            canonical_sha256(&value).unwrap(),
            "sha256:8ea42081471bf081697b912e59f207b803004aaf41fc75df225c77941edda7ed"
        );
    }
}
