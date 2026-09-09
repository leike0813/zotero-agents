use serde::{Deserialize, Deserializer, Serialize, Serializer, de::DeserializeOwned};
use serde_json::{Map, Value, json};
use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, Ordering};
use synthesis_protocol::{
    CITATION_GRAPH_BUILD_OPERATION, CITATION_GRAPH_BUILD_TRANSFER_OPERATION, PageDescriptor,
    PagedInputValidator, compare_utf16, count_json_nodes_raw,
};

const CONTRACT_VERSION: &str = "synthesis-citation-graph-build.v1";

fn canceled(flag: &AtomicBool, index: usize) -> Result<(), &'static str> {
    if index.is_multiple_of(256) && flag.load(Ordering::Relaxed) {
        Err("worker_canceled")
    } else {
        Ok(())
    }
}

fn valid(value: &str) -> bool {
    !value.is_empty() && value.trim() == value && value.encode_utf16().count() <= 4096
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Scope {
    kind: String,
    source_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LibraryNode {
    node_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    year: Option<String>,
    authors: Vec<String>,
    aliases: Vec<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum TargetKind {
    LibraryPaper,
    ExternalReference,
    UnresolvedReference,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
enum EdgeStatus {
    Accepted,
    Unbound,
}

#[derive(Clone, Copy, Debug)]
struct JsNumber(f64);

impl<'de> Deserialize<'de> for JsNumber {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        f64::deserialize(deserializer).map(Self)
    }
}

impl Serialize for JsNumber {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if self.0.fract() == 0.0 && self.0 >= 0.0 && self.0 <= 9_007_199_254_740_991.0 {
            serializer.serialize_u64(self.0 as u64)
        } else {
            serializer.serialize_f64(self.0)
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Reference {
    reference_id: String,
    edge_id: String,
    source_id: String,
    source_ref: Option<String>,
    target_id: String,
    target_kind: TargetKind,
    target_title: Option<String>,
    target_year: Option<String>,
    target_authors: Vec<String>,
    target_aliases: Vec<String>,
    roles: Vec<String>,
    weight: JsNumber,
}

#[derive(Debug)]
pub struct GraphRequest {
    scope: Scope,
    role_priority: Vec<String>,
    library_nodes: Vec<LibraryNode>,
    references: Vec<Reference>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Header {
    contract_version: String,
    scope: Scope,
    role_priority: Vec<String>,
}

#[derive(Debug)]
pub struct GraphPagedInputAssembler {
    validator: PagedInputValidator,
    library_nodes: Vec<LibraryNode>,
    references: Vec<Reference>,
}

impl GraphPagedInputAssembler {
    pub fn new(
        task_id: String,
        operation: String,
        request_hash: String,
        header: Map<String, Value>,
    ) -> Result<Self, &'static str> {
        if operation != CITATION_GRAPH_BUILD_OPERATION
            && operation != CITATION_GRAPH_BUILD_TRANSFER_OPERATION
        {
            return Err("invalid_request");
        }
        Ok(Self {
            validator: PagedInputValidator::new(task_id, operation, request_hash, header)?,
            library_nodes: Vec::new(),
            references: Vec::new(),
        })
    }

    pub fn task_id(&self) -> &str {
        self.validator.task_id()
    }

    pub fn append_raw_page(
        &mut self,
        task_id: &str,
        descriptor: PageDescriptor,
        raw_rows: &str,
    ) -> Result<(String, u64), &'static str> {
        fn parse<T: DeserializeOwned>(source: &str) -> Result<Vec<T>, &'static str> {
            serde_json::from_str(source).map_err(|_| "invalid_request")
        }
        let node_count = count_json_nodes_raw(raw_rows)?;
        let (row_count, page) = match descriptor.section.as_str() {
            "libraryNodes" => {
                let rows = parse::<LibraryNode>(raw_rows)?;
                (rows.len(), EitherPage::Library(rows))
            }
            "references" => {
                let rows = parse::<Reference>(raw_rows)?;
                (rows.len(), EitherPage::References(rows))
            }
            _ => return Err("invalid_request"),
        };
        let (section, page_index) = self.validator.validate_verified_raw_page(
            task_id,
            &descriptor,
            raw_rows,
            row_count,
            node_count,
        )?;
        match page {
            EitherPage::Library(rows) => self.library_nodes.extend(rows),
            EitherPage::References(rows) => self.references.extend(rows),
        }
        Ok((section.name.to_owned(), page_index))
    }

    pub fn finish(
        self,
        task_id: &str,
    ) -> Result<(String, String, String, GraphRequest), &'static str> {
        let (task_id, operation, request_hash, header) = self.validator.finish(task_id)?;
        let header: Header =
            serde_json::from_value(Value::Object(header)).map_err(|_| "invalid_request")?;
        if header.contract_version != CONTRACT_VERSION
            || !matches!(header.scope.kind.as_str(), "full" | "source_slice")
            || header.role_priority.iter().any(|value| !valid(value))
        {
            return Err("invalid_request");
        }
        Ok((
            task_id,
            operation,
            request_hash,
            GraphRequest {
                scope: header.scope,
                role_priority: header.role_priority,
                library_nodes: self.library_nodes,
                references: self.references,
            },
        ))
    }
}

enum EitherPage {
    Library(Vec<LibraryNode>),
    References(Vec<Reference>),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    aliases: Vec<String>,
    authors: Vec<String>,
    kind: TargetKind,
    node_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    year: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedEdge {
    edge_id: String,
    reference_id: String,
    roles: Vec<String>,
    source_id: String,
    status: EdgeStatus,
    target_id: String,
    weight: JsNumber,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleEvidence {
    count: usize,
    role: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AggregateEdge {
    aux_roles: Vec<RoleEvidence>,
    mention_count: JsNumber,
    primary_role: String,
    role_evidence: Vec<RoleEvidence>,
    source_id: String,
    source_refs: Vec<String>,
    target_id: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ownership {
    edge_id: String,
    reference_id: String,
    source_id: String,
    status: EdgeStatus,
    target_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LightMetric {
    ambiguous_outgoing_count: usize,
    incoming_count: usize,
    local_degree: usize,
    matched_outgoing_count: usize,
    node_id: String,
    outgoing_count: usize,
    unresolved_outgoing_count: usize,
}

#[derive(Debug)]
pub struct GraphResult {
    header: Map<String, Value>,
    nodes: Vec<GraphNode>,
    resolved_edges: Vec<ResolvedEdge>,
    aggregate_edges: Vec<AggregateEdge>,
    source_ownership: Vec<Ownership>,
    incoming_groups: Vec<Ownership>,
    light_metrics: Vec<LightMetric>,
}

pub enum GraphResultSection {
    Nodes(Vec<GraphNode>),
    ResolvedEdges(Vec<ResolvedEdge>),
    AggregateEdges(Vec<AggregateEdge>),
    SourceOwnership(Vec<Ownership>),
    IncomingGroups(Vec<Ownership>),
    LightMetrics(Vec<LightMetric>),
}

pub struct GraphResultParts {
    pub header: Map<String, Value>,
    pub sections: Vec<GraphResultSection>,
}

impl GraphResultSection {
    pub fn name(&self) -> &'static str {
        match self {
            Self::Nodes(_) => "nodes",
            Self::ResolvedEdges(_) => "resolvedEdges",
            Self::AggregateEdges(_) => "aggregateEdges",
            Self::SourceOwnership(_) => "sourceOwnership",
            Self::IncomingGroups(_) => "incomingGroups",
            Self::LightMetrics(_) => "lightMetrics",
        }
    }
}

impl GraphResult {
    pub fn into_parts(self) -> GraphResultParts {
        GraphResultParts {
            header: self.header,
            sections: vec![
                GraphResultSection::Nodes(self.nodes),
                GraphResultSection::ResolvedEdges(self.resolved_edges),
                GraphResultSection::AggregateEdges(self.aggregate_edges),
                GraphResultSection::SourceOwnership(self.source_ownership),
                GraphResultSection::IncomingGroups(self.incoming_groups),
                GraphResultSection::LightMetrics(self.light_metrics),
            ],
        }
    }

    fn into_value(self) -> Value {
        let parts = self.into_parts();
        let mut output = parts.header;
        for section in parts.sections {
            let (name, value) = match section {
                GraphResultSection::Nodes(rows) => ("nodes", json!(rows)),
                GraphResultSection::ResolvedEdges(rows) => ("resolvedEdges", json!(rows)),
                GraphResultSection::AggregateEdges(rows) => ("aggregateEdges", json!(rows)),
                GraphResultSection::SourceOwnership(rows) => ("sourceOwnership", json!(rows)),
                GraphResultSection::IncomingGroups(rows) => ("incomingGroups", json!(rows)),
                GraphResultSection::LightMetrics(rows) => ("lightMetrics", json!(rows)),
            };
            output.insert(name.into(), value);
        }
        Value::Object(output)
    }
}

fn primary_role(counts: &HashMap<String, usize>, priority: &[String]) -> String {
    if counts.is_empty() {
        return "unspecified".into();
    }
    let ranks: HashMap<&str, usize> = priority
        .iter()
        .enumerate()
        .map(|(index, value)| (value.as_str(), index))
        .collect();
    let mut values: Vec<_> = counts.iter().collect();
    values.sort_by(|(left, left_count), (right, right_count)| {
        right_count
            .cmp(left_count)
            .then_with(|| {
                ranks
                    .get(left.as_str())
                    .unwrap_or(&usize::MAX)
                    .cmp(ranks.get(right.as_str()).unwrap_or(&usize::MAX))
            })
            .then_with(|| compare_utf16(left, right))
    });
    values[0].0.clone()
}

pub fn compute_typed(
    request: GraphRequest,
    flag: &AtomicBool,
) -> Result<GraphResult, &'static str> {
    canceled(flag, 0)?;
    let mut nodes = HashMap::<String, GraphNode>::with_capacity(request.library_nodes.len());
    for (index, node) in request.library_nodes.into_iter().enumerate() {
        canceled(flag, index)?;
        if !valid(&node.node_id)
            || nodes
                .insert(
                    node.node_id.clone(),
                    GraphNode {
                        node_id: node.node_id,
                        kind: TargetKind::LibraryPaper,
                        title: node.title,
                        year: node.year,
                        authors: node.authors,
                        aliases: node.aliases,
                    },
                )
                .is_some()
        {
            return Err("invalid_request");
        }
    }
    if request.scope.kind == "source_slice"
        && request
            .scope
            .source_ids
            .iter()
            .any(|source| !nodes.contains_key(source))
    {
        return Err("invalid_request");
    }

    struct Aggregate {
        source: String,
        target: String,
        mention_count: f64,
        role_counts: HashMap<String, usize>,
        source_refs: Vec<String>,
    }

    let reference_count = request.references.len();
    let mut reference_ids = HashSet::with_capacity(reference_count);
    let mut edge_ids = HashSet::with_capacity(reference_count);
    let mut resolved_edges = Vec::with_capacity(reference_count);
    let mut aggregate = HashMap::<String, Aggregate>::with_capacity(reference_count);
    for (index, reference) in request.references.into_iter().enumerate() {
        canceled(flag, index)?;
        if !reference.weight.0.is_finite()
            || reference.weight.0 <= 0.0
            || !reference_ids.insert(reference.reference_id.clone())
            || !edge_ids.insert(reference.edge_id.clone())
            || !nodes.contains_key(&reference.source_id)
            || (reference.target_kind == TargetKind::LibraryPaper
                && !nodes.contains_key(&reference.target_id))
        {
            return Err("invalid_request");
        }
        if let Some(node) = nodes.get_mut(&reference.target_id) {
            node.title = node.title.take().or(reference.target_title);
            node.year = node.year.take().or(reference.target_year);
            if node.authors.is_empty() {
                node.authors = reference.target_authors;
            }
            node.aliases.extend(reference.target_aliases);
            node.aliases
                .sort_by(|left, right| compare_utf16(left, right));
            node.aliases.dedup();
        } else {
            nodes.insert(
                reference.target_id.clone(),
                GraphNode {
                    node_id: reference.target_id.clone(),
                    kind: reference.target_kind,
                    title: reference.target_title,
                    year: reference.target_year,
                    authors: reference.target_authors,
                    aliases: reference.target_aliases,
                },
            );
        }
        let status = if reference.target_kind == TargetKind::LibraryPaper {
            EdgeStatus::Accepted
        } else {
            EdgeStatus::Unbound
        };
        let aggregate_key = format!("{}\0{}", reference.source_id, reference.target_id);
        let aggregate_row = aggregate.entry(aggregate_key).or_insert_with(|| Aggregate {
            source: reference.source_id.clone(),
            target: reference.target_id.clone(),
            mention_count: 0.0,
            role_counts: HashMap::new(),
            source_refs: Vec::new(),
        });
        aggregate_row.mention_count += reference.weight.0;
        aggregate_row.source_refs.push(
            reference
                .source_ref
                .clone()
                .unwrap_or_else(|| reference.reference_id.clone()),
        );
        for role in &reference.roles {
            *aggregate_row.role_counts.entry(role.clone()).or_default() += 1;
        }
        resolved_edges.push(ResolvedEdge {
            edge_id: reference.edge_id,
            reference_id: reference.reference_id,
            source_id: reference.source_id,
            target_id: reference.target_id,
            status,
            roles: reference.roles,
            weight: reference.weight,
        });
    }
    drop(reference_ids);
    drop(edge_ids);
    resolved_edges.sort_by(|left, right| compare_utf16(&left.reference_id, &right.reference_id));

    let mut aggregate_edges = Vec::with_capacity(aggregate.len());
    for row in aggregate.into_values() {
        let primary = primary_role(&row.role_counts, &request.role_priority);
        let mut evidence: Vec<_> = row
            .role_counts
            .into_iter()
            .map(|(role, count)| RoleEvidence { role, count })
            .collect();
        evidence.sort_by(|left, right| {
            right
                .count
                .cmp(&left.count)
                .then_with(|| compare_utf16(&left.role, &right.role))
        });
        let aux = evidence
            .iter()
            .filter(|entry| entry.role != primary)
            .map(|entry| RoleEvidence {
                role: entry.role.clone(),
                count: entry.count,
            })
            .collect();
        aggregate_edges.push(AggregateEdge {
            source_id: row.source,
            target_id: row.target,
            mention_count: JsNumber(row.mention_count),
            primary_role: primary,
            aux_roles: aux,
            role_evidence: evidence,
            source_refs: row.source_refs,
        });
    }
    aggregate_edges.sort_by(|left, right| {
        compare_utf16(&left.source_id, &right.source_id)
            .then_with(|| compare_utf16(&left.target_id, &right.target_id))
    });
    let source_ownership: Vec<_> = resolved_edges
        .iter()
        .map(|edge| Ownership {
            source_id: edge.source_id.clone(),
            edge_id: edge.edge_id.clone(),
            reference_id: edge.reference_id.clone(),
            target_id: edge.target_id.clone(),
            status: edge.status,
        })
        .collect();
    let mut incoming_groups = source_ownership.clone();
    incoming_groups.sort_by(|left, right| {
        compare_utf16(&left.target_id, &right.target_id)
            .then_with(|| compare_utf16(&left.source_id, &right.source_id))
            .then_with(|| compare_utf16(&left.edge_id, &right.edge_id))
    });
    let mut node_list: Vec<_> = nodes.into_values().collect();
    node_list.sort_by(|left, right| compare_utf16(&left.node_id, &right.node_id));
    let mut outgoing = HashMap::<String, usize>::new();
    let mut incoming = HashMap::<String, usize>::new();
    let mut matched = HashMap::<String, usize>::new();
    let mut unresolved = HashMap::<String, usize>::new();
    for edge in &resolved_edges {
        *outgoing.entry(edge.source_id.clone()).or_default() += 1;
        *incoming.entry(edge.target_id.clone()).or_default() += 1;
        let target = if edge.status == EdgeStatus::Accepted {
            &mut matched
        } else {
            &mut unresolved
        };
        *target.entry(edge.source_id.clone()).or_default() += 1;
    }
    let light_metrics = node_list
        .iter()
        .map(|node| {
            let out = *outgoing.get(&node.node_id).unwrap_or(&0);
            let incoming_count = *incoming.get(&node.node_id).unwrap_or(&0);
            LightMetric {
                node_id: node.node_id.clone(),
                outgoing_count: out,
                incoming_count,
                local_degree: out + incoming_count,
                matched_outgoing_count: *matched.get(&node.node_id).unwrap_or(&0),
                unresolved_outgoing_count: *unresolved.get(&node.node_id).unwrap_or(&0),
                ambiguous_outgoing_count: 0,
            }
        })
        .collect();
    let node_counts = json!({
        "library_paper": node_list.iter().filter(|node| node.kind == TargetKind::LibraryPaper).count(),
        "external_reference": node_list.iter().filter(|node| node.kind == TargetKind::ExternalReference).count(),
        "unresolved_reference": node_list.iter().filter(|node| node.kind == TargetKind::UnresolvedReference).count(),
    });
    canceled(flag, reference_count)?;
    let header = serde_json::from_value(json!({
        "contractVersion": CONTRACT_VERSION,
        "scope": request.scope,
        "diagnostics": {
            "nodeCounts": node_counts,
            "referenceCount": reference_count,
            "aggregateEdgeCount": aggregate_edges.len(),
        }
    }))
    .expect("static graph result header is an object");
    Ok(GraphResult {
        header,
        nodes: node_list,
        resolved_edges,
        aggregate_edges,
        source_ownership,
        incoming_groups,
        light_metrics,
    })
}

pub fn compute(request: Value, flag: &AtomicBool) -> Result<Value, &'static str> {
    let object = request.as_object().ok_or("invalid_request")?;
    let header: Header = serde_json::from_value(json!({
        "contractVersion": object.get("contractVersion"),
        "scope": object.get("scope"),
        "rolePriority": object.get("rolePriority"),
    }))
    .map_err(|_| "invalid_request")?;
    let library_nodes = serde_json::from_value(
        object
            .get("libraryNodes")
            .cloned()
            .ok_or("invalid_request")?,
    )
    .map_err(|_| "invalid_request")?;
    let references =
        serde_json::from_value(object.get("references").cloned().ok_or("invalid_request")?)
            .map_err(|_| "invalid_request")?;
    if header.contract_version != CONTRACT_VERSION {
        return Err("invalid_request");
    }
    compute_typed(
        GraphRequest {
            scope: header.scope,
            role_priority: header.role_priority,
            library_nodes,
            references,
        },
        flag,
    )
    .map(GraphResult::into_value)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request() -> Value {
        json!({
            "contractVersion":CONTRACT_VERSION,
            "scope":{"kind":"source_slice","sourceIds":["paper:A"]},
            "rolePriority":["background","method"],
            "libraryNodes":[
                {"nodeId":"paper:A","title":"Source","authors":[],"aliases":[]},
                {"nodeId":"paper:B","title":"Target","authors":[],"aliases":[]}
            ],
            "references":[
                {"referenceId":"raw:1","edgeId":"edge:1","sourceId":"paper:A","targetId":"paper:B","targetKind":"library_paper","targetAuthors":[],"targetAliases":[],"roles":["background","method"],"weight":1},
                {"referenceId":"raw:2","edgeId":"edge:2","sourceId":"paper:A","targetId":"ref:😀","targetKind":"external_reference","targetAuthors":[],"targetAliases":[],"roles":["method"],"weight":1}
            ]
        })
    }

    #[test]
    fn builds_graph_and_preserves_utf16_order() {
        let result = compute(request(), &AtomicBool::new(false)).unwrap();
        assert_eq!(result["diagnostics"]["referenceCount"], 2);
        assert_eq!(result["resolvedEdges"][0]["referenceId"], "raw:1");
        assert_eq!(result["aggregateEdges"][0]["mentionCount"], 1);
    }

    #[test]
    fn cancellation_and_dangling_source_fail_closed() {
        assert_eq!(
            compute(request(), &AtomicBool::new(true)),
            Err("worker_canceled")
        );
        let mut invalid = request();
        invalid["references"][0]["sourceId"] = json!("missing");
        assert_eq!(
            compute(invalid, &AtomicBool::new(false)),
            Err("invalid_request")
        );
    }
}
