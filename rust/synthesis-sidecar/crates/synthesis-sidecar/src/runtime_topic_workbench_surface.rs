use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet};
use synthesis_application::concept_kb::decode_stored_concept_proposal;
use synthesis_application::topic_graph::TopicPlanReconcileRequest;
use synthesis_application::{
    TopicApplyRequest, TopicContextRequest, TopicContextView, TopicDeleteRequest,
    TopicDetailRequest, TopicDetailResult, TopicDiscoveryHintRequest, TopicFindRequest,
    TopicListRequest, TopicListResult, TopicRecord, TopicReportRequest, TopicResolverCombine,
    TopicResolverRequest, TopicWorkflowFilter, WorkbenchSurface, WorkbenchSurfacePort,
    WorkbenchSurfaceRequest,
};
use synthesis_repository::{
    ConceptAliasRecord, ConceptKbReplacement, ConceptRecord, ConceptRelationRecord,
    ConceptReviewItemRecord, ConceptSenseRecord, DeletedTopicArtifactRecord, ReviewPageQuery,
    TopicConceptLinkRecord, TopicGraphEdgeRecord, TopicGraphNodeRecord, TopicGraphReplacement,
    TopicGraphReviewItemRecord,
};

use crate::runtime_production_client::{
    ProductionClientCanonicalEffect, ProductionClientRouteEntry,
};
use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::checkpoint_current_before_promotion;
use synthesis_application::reference_application::{
    LiteratureDigestApplyRequest, ReferenceIndexRequest,
};

fn wire<T: serde::Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|_| "production_projection_invalid".into())
}

fn one<T: DeserializeOwned>(args: &[Value]) -> Result<T, String> {
    match args {
        [value] => serde_json::from_value(value.clone()).map_err(|_| "invalid_request".into()),
        _ => Err("invalid_request".into()),
    }
}

fn no_args(args: &[Value]) -> Result<(), String> {
    if args.is_empty() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct WorkflowReviewRequest {
    topic_id: String,
    max_graph_nodes: Option<usize>,
    max_graph_edges: Option<usize>,
    max_chars: Option<usize>,
    include_paper_artifacts: Option<bool>,
}

fn review_bound(value: Option<usize>, default: usize, maximum: usize) -> Result<usize, String> {
    let value = value.unwrap_or(default);
    if value == 0 || value > maximum {
        Err("invalid_request".into())
    } else {
        Ok(value)
    }
}

fn sanitize_review_artifact(value: Value) -> Value {
    match value {
        Value::Array(values) => {
            Value::Array(values.into_iter().map(sanitize_review_artifact).collect())
        }
        Value::Object(values) => Value::Object(
            values
                .into_iter()
                .filter(|(key, _)| key != "digest" && key != "digest_markdown")
                .map(|(key, value)| (key, sanitize_review_artifact(value)))
                .collect(),
        ),
        value => value,
    }
}

fn review_timeline(value: &Value) -> Value {
    match value {
        Value::Object(_) => value.clone(),
        Value::Array(values) => json!({"summary":{},"events":values}),
        _ => json!({"summary":{},"events":[]}),
    }
}

fn review_improvement_dimensions(value: &Value) -> Value {
    match value {
        Value::Object(_) => value.clone(),
        Value::Array(values) => json!({"summary":{},"dimensions":values}),
        _ => json!({"summary":{},"dimensions":[]}),
    }
}

fn review_registry_rows(
    apps: &ProductionApplications,
    paper_refs: &[String],
) -> Result<Vec<Value>, String> {
    let mut rows = Vec::new();
    for source_refs in paper_refs.chunks(250) {
        let mut cursor = 0usize;
        loop {
            let page = apps.references.sidecar_index(&ReferenceIndexRequest {
                cursor: Some(cursor.to_string()),
                limit: Some(100),
                include_references: Some(false),
                source_refs: Some(source_refs.to_vec()),
            })?;
            let page_rows = page
                .get("rows")
                .and_then(Value::as_array)
                .ok_or_else(|| "production_projection_invalid".to_owned())?;
            for row in page_rows {
                let paper_ref = row["paper_ref"].as_str().unwrap_or_default();
                if paper_ref.is_empty() {
                    return Err("production_projection_invalid".into());
                }
                let coverage = match row["artifactCoverage"].as_str() {
                    Some("complete" | "partial" | "missing") => row["artifactCoverage"].clone(),
                    _ => json!("missing"),
                };
                let missing_artifacts = row["missing_artifacts"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(str::to_owned)
                    .collect::<BTreeSet<_>>()
                    .into_iter()
                    .collect::<Vec<_>>();
                rows.push(json!({
                    "paper_ref":paper_ref,
                    "title":row["title"].as_str().filter(|value| !value.is_empty()).unwrap_or(paper_ref),
                    "artifactCoverage":coverage,
                    "missing_artifacts":missing_artifacts,
                }));
            }
            if !page["has_more"].as_bool().unwrap_or(false) {
                break;
            }
            cursor += page_rows.len();
            if page_rows.is_empty() {
                return Err("production_projection_invalid".into());
            }
        }
    }
    rows.sort_by(|left, right| left["paper_ref"].as_str().cmp(&right["paper_ref"].as_str()));
    Ok(rows)
}

fn workflow_review_input(
    apps: &ProductionApplications,
    request: WorkflowReviewRequest,
) -> Result<Value, String> {
    if request.topic_id.trim().is_empty() {
        return Err("invalid_request".into());
    }
    let max_graph_nodes = review_bound(request.max_graph_nodes, 500, 1000)?;
    let max_graph_edges = review_bound(request.max_graph_edges, 1000, 2000)?;
    let max_chars = review_bound(request.max_chars, 50_000, 200_000)?;
    let TopicDetailResult::Ready {
        topic, snapshot, ..
    } = apps.topics.detail(TopicDetailRequest {
        topic_id: request.topic_id.clone(),
    })?
    else {
        return Err("topic_not_found".into());
    };
    let artifact = sanitize_review_artifact(snapshot.artifact.clone());
    let artifact_object = artifact
        .as_object()
        .ok_or_else(|| "production_projection_invalid".to_owned())?;
    let report = artifact_object
        .get("synthesis_report")
        .and_then(Value::as_object)
        .ok_or_else(|| "production_projection_invalid".to_owned())?;
    let markdown = report
        .get("body")
        .or_else(|| report.get("markdown"))
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "production_projection_invalid".to_owned())?
        .to_owned();
    let mut resolved_papers = topic
        .resolved_paper_set
        .papers
        .iter()
        .filter_map(|paper| {
            let paper_ref = paper.paper_ref.trim();
            if paper_ref.is_empty() {
                return None;
            }
            let match_reasons = paper
                .match_reasons
                .iter()
                .flatten()
                .map(String::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_owned)
                .collect::<BTreeSet<_>>()
                .into_iter()
                .collect::<Vec<_>>();
            Some((paper_ref.to_owned(), match_reasons))
        })
        .collect::<Vec<_>>();
    resolved_papers.sort_by(|left, right| left.0.cmp(&right.0));
    if resolved_papers.is_empty() {
        return Err("production_projection_invalid".into());
    }
    let paper_refs = resolved_papers
        .iter()
        .map(|paper| paper.0.clone())
        .collect::<Vec<_>>();
    let resolved_papers = resolved_papers
        .into_iter()
        .map(|(paper_ref, match_reasons)| {
            json!({"paper_ref":paper_ref,"match_reasons":match_reasons})
        })
        .collect::<Vec<_>>();
    let registry_rows = review_registry_rows(apps, &paper_refs)?;
    let missing_diagnostics = registry_rows
        .iter()
        .flat_map(|row| {
            row["missing_artifacts"]
                .as_array()
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .filter_map(|artifact_type| artifact_type.as_str().map(str::to_owned))
                .map(|artifact_type| {
                    let paper_ref = row["paper_ref"].as_str().unwrap_or_default();
                    json!({
                        "paper_ref":paper_ref,
                        "artifact_type":artifact_type,
                        "severity":"warning",
                        "message":format!("{artifact_type} is missing for {paper_ref}"),
                    })
                })
                .collect::<Vec<_>>()
        })
        .collect::<Vec<_>>();
    let (graph_hash, graph_nodes, graph_edges) = {
        let owner = apps.repository.owner();
        let repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        let graph_hash = repository
            .get_citation_graph_application_state()?
            .map(|state| state.graph_hash)
            .unwrap_or(
                synthesis_protocol::canonical_sha256(&json!({
                    "nodes":[],
                    "edges":[],
                }))
                .map_err(|_| "production_projection_invalid".to_owned())?,
            );
        let (nodes, edges) = crate::runtime_citation_graph_read_surface::project_review_graph(
            repository.list_citation_nodes()?,
            repository.list_citation_edges()?,
            &paper_refs,
        );
        (graph_hash, nodes, edges)
    };
    let stored_metadata = snapshot.metadata.clone();
    let stored_metadata_data = stored_metadata.get("data").and_then(Value::as_object);
    let topic_metadata = stored_metadata_data
        .and_then(|data| data.get("artifact_metadata"))
        .filter(|value| value.is_object())
        .cloned()
        .unwrap_or_else(|| json!({}));
    let timeline = artifact_object
        .get("timeline_events")
        .filter(|value| value.is_object())
        .cloned()
        .unwrap_or_else(|| json!(""));
    let mut review_manifest = snapshot.manifest.clone();
    if let Some(manifest) = review_manifest.as_object_mut() {
        manifest.remove("artifact_hash");
        manifest.remove("metadata_hash");
        manifest.remove("section_hashes");
    }
    let manifest_hash = synthesis_protocol::canonical_sha256(&review_manifest)
        .map_err(|_| "production_projection_invalid".to_owned())?;
    let artifact_hash = synthesis_protocol::canonical_sha256(&artifact)
        .map_err(|_| "production_projection_invalid".to_owned())?;
    let section_hashes = snapshot
        .sections
        .iter()
        .map(|(name, value)| {
            synthesis_protocol::canonical_sha256(value)
                .map(|hash| (name.clone(), hash))
                .map_err(|_| "production_projection_invalid".to_owned())
        })
        .collect::<Result<BTreeMap<_, _>, _>>()?;
    let mut canonical_metadata = json!({
        "topic_id":request.topic_id.clone(),
        "title":topic.title.clone(),
        "definition":topic.definition.clone(),
        "mode":topic.operation.clone(),
        "bundle_hash":topic.bundle_hash.clone(),
        "timeline":timeline.clone(),
        "artifact_metadata":topic_metadata.clone(),
        "updated_at":topic.updated_at.clone(),
        "operation":topic.operation.clone(),
        "language":topic.language.clone(),
        "manifest_hash":manifest_hash,
        "structured_hash":artifact_hash,
        "artifact_hash":artifact_hash,
        "section_hashes":section_hashes,
        "paper_count":topic.paper_count,
        "external_literature_count":0,
        "coverage_summary":artifact_object.get("coverage").filter(|value| value.is_object()).cloned().unwrap_or_else(|| json!({})),
        "prospective_topic_relation_proposals":artifact_object.get("prospective_topic_relation_proposals").and_then(Value::as_array).cloned().unwrap_or_default(),
    });
    let metadata_hash = synthesis_protocol::canonical_sha256(&canonical_metadata)
        .map_err(|_| "production_projection_invalid".to_owned())?;
    canonical_metadata
        .as_object_mut()
        .ok_or_else(|| "production_projection_invalid".to_owned())?
        .insert("metadata_hash".into(), json!(metadata_hash));
    let incomplete_sections = [
        "taxonomy",
        "improvement_dimensions",
        "debates",
        "review_outline",
        "source_papers",
    ]
    .into_iter()
    .filter(|section| !artifact_object.contains_key(*section))
    .collect::<Vec<_>>();
    let mut base = json!({
        "kind":"synthesis.review_workflow_input",
        "schema_version":"1.0.0",
        "topic":{
            "topic_id":request.topic_id.clone(),
            "title":topic.title.clone(),
            "markdown":markdown,
            "metadata":topic_metadata.clone(),
            "topic_definition":topic.topic_definition.clone(),
            "resolver":topic.topic_resolver.clone(),
        },
        "topic_timeline":{"content":timeline},
        "structured_topic":{
            "artifact":artifact.clone(),
            "manifest":review_manifest,
            "metadata":canonical_metadata,
            "claims":artifact_object.get("claims").and_then(Value::as_array).cloned().unwrap_or_default(),
            "timeline_events":review_timeline(artifact_object.get("timeline_events").unwrap_or(&Value::Null)),
            "source_papers":artifact_object.get("source_papers").and_then(Value::as_array).cloned().unwrap_or_default(),
            "taxonomy":artifact_object.get("taxonomy").filter(|value| value.is_object()).cloned().unwrap_or_else(|| json!({})),
            "improvement_dimensions":review_improvement_dimensions(artifact_object.get("improvement_dimensions").unwrap_or(&Value::Null)),
            "debates":artifact_object.get("debates").and_then(Value::as_array).cloned().unwrap_or_default(),
            "coverage":artifact_object.get("coverage").filter(|value| value.is_object()).cloned().unwrap_or_else(|| json!({})),
            "future_directions":artifact_object.get("future_directions").and_then(Value::as_array).cloned().unwrap_or_default(),
            "review_outline":artifact_object.get("review_outline").filter(|value| value.is_object()).cloned().unwrap_or_else(|| json!({})),
            "incomplete_sections":incomplete_sections,
        },
        "resolved_paper_set":{
            "papers":resolved_papers.clone(),
            "snapshot":{"papers":resolved_papers},
        },
        "registry_artifact_coverage":{"rows":registry_rows},
        "citation_graph_slice":{
            "graph_hash":graph_hash,
            "nodes":graph_nodes,
            "edges":graph_edges,
        },
        "missing_artifact_diagnostics":missing_diagnostics.clone(),
        "diagnostics":{
            "blocking":[],
            "warnings":missing_diagnostics.iter().filter_map(|row| row["message"].as_str()).collect::<Vec<_>>(),
        },
    });
    let input_hash = synthesis_protocol::canonical_sha256(&base)
        .map_err(|_| "production_projection_invalid".to_owned())?;
    base.as_object_mut()
        .ok_or_else(|| "production_projection_invalid".to_owned())?
        .insert("input_hash".into(), json!(input_hash));
    let mut warnings = base["diagnostics"]["warnings"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    if markdown.chars().count() > max_chars {
        base["topic"]["markdown"] = json!(markdown.chars().take(max_chars).collect::<String>());
        warnings.push(json!(format!(
            "topic markdown truncated to {max_chars} chars"
        )));
    }
    if let Some(nodes) = base["citation_graph_slice"]["nodes"].as_array_mut()
        && nodes.len() > max_graph_nodes
    {
        nodes.truncate(max_graph_nodes);
        warnings.push(json!(format!(
            "citation graph nodes truncated to {max_graph_nodes}"
        )));
    }
    if let Some(edges) = base["citation_graph_slice"]["edges"].as_array_mut()
        && edges.len() > max_graph_edges
    {
        edges.truncate(max_graph_edges);
        warnings.push(json!(format!(
            "citation graph edges truncated to {max_graph_edges}"
        )));
    }
    if request.include_paper_artifacts == Some(false) {
        base.as_object_mut()
            .ok_or_else(|| "production_projection_invalid".to_owned())?
            .remove("structured_topic");
        warnings.push(json!(
            "structured paper artifact context omitted by includePaperArtifacts=false"
        ));
    }
    base["diagnostics"]["warnings"] = Value::Array(warnings);
    Ok(base)
}

pub(crate) fn dispatch_workflow_review_input(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    workflow_review_input(apps, one::<WorkflowReviewRequest>(args)?)
}

fn review_page_query(state: &Value) -> Result<ReviewPageQuery, String> {
    let reviews = state.get("reviews").unwrap_or(state);
    let object = reviews
        .as_object()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let offset = object
        .get("cursor")
        .map(|value| match value {
            Value::String(value) => value.parse::<usize>().map_err(|_| "invalid_request"),
            Value::Number(value) => value
                .as_u64()
                .map(|value| value as usize)
                .ok_or("invalid_request"),
            _ => Err("invalid_request"),
        })
        .transpose()?
        .unwrap_or_default();
    let limit = object
        .get("limit")
        .and_then(Value::as_u64)
        .map(|value| value as usize)
        .unwrap_or(25);
    Ok(ReviewPageQuery {
        status: object
            .get("status")
            .and_then(Value::as_str)
            .unwrap_or("open")
            .into(),
        kind: object
            .get("kind")
            .and_then(Value::as_str)
            .unwrap_or("all")
            .into(),
        confidence: object
            .get("confidence")
            .and_then(Value::as_str)
            .unwrap_or("all")
            .into(),
        search: object
            .get("search")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .into(),
        offset,
        limit,
    })
}

fn topic_record_wire(record: TopicRecord) -> Value {
    json!({
        "topic_id":record.topic_id,
        "path_id":record.path_id,
        "title":record.title,
        "definition":record.definition,
        "language":record.language,
        "operation":record.operation,
        "manifest_hash":record.manifest_hash,
        "artifact_hash":record.artifact_hash,
        "metadata_hash":record.metadata_hash,
        "bundle_hash":record.bundle_hash,
        "paper_count":record.paper_count,
        "updated_at":record.updated_at,
        "topic_definition":record.topic_definition,
        "topic_resolver":record.topic_resolver,
        "resolved_paper_set":record.resolved_paper_set,
        "projection":record.projection,
        "freshness":record.freshness.as_str(),
        "source_materials_status":record.source_materials_status.as_str(),
        "source_materials_percent":record.source_materials_percent,
        "stale_reasons":record.stale_reasons,
        "dirty_reasons":record.dirty_reasons,
        "missing_sections":record.missing_sections,
    })
}

fn stored_json(text: &str, expected_array: bool) -> Result<Value, String> {
    let value = serde_json::from_str::<Value>(text)
        .map_err(|_| "production_projection_invalid".to_owned())?;
    if (expected_array && value.is_array()) || (!expected_array && value.is_object()) {
        Ok(value)
    } else {
        Err("production_projection_invalid".into())
    }
}

fn topic_graph_node_wire(record: TopicGraphNodeRecord) -> Result<Value, String> {
    let planning = stored_json(&record.planning_json, false)?;
    Ok(json!({
        "topic_id":record.topic_id,
        "title":record.title,
        "definition":record.definition,
        "aliases":stored_json(&record.aliases_json, true)?,
        "node_type":record.node_type,
        "definition_status":record.definition_status,
        "current_artifact_path":record.current_artifact_path,
        "is_root":record.is_root != 0,
        "level":record.level,
        "paper_count":record.paper_count,
        "last_synthesis_at":record.last_synthesis_at,
        "created_at":record.created_at,
        "updated_at":record.updated_at,
        "planning":planning,
    }))
}

fn topic_graph_edge_wire(record: TopicGraphEdgeRecord) -> Result<Value, String> {
    Ok(json!({
        "edge_id":record.edge_id,
        "source_topic_id":record.source_topic_id,
        "target_topic_id":record.target_topic_id,
        "relation":record.relation,
        "status":record.status,
        "confidence":record.confidence,
        "provenance":stored_json(&record.provenance_json, true)?,
        "evidence_refs":stored_json(&record.evidence_refs_json, true)?,
        "created_at":record.created_at,
        "updated_at":record.updated_at,
    }))
}

fn topic_graph_review_wire(record: TopicGraphReviewItemRecord) -> Result<Value, String> {
    Ok(json!({
        "review_id":record.review_id,
        "status":record.status,
        "source_topic_id":record.source_topic_id,
        "target_topic_id":record.target_topic_id,
        "target_title":record.target_title,
        "relation":record.relation,
        "confidence":record.confidence,
        "provenance":stored_json(&record.provenance_json, true)?,
        "evidence_refs":stored_json(&record.evidence_refs_json, true)?,
        "created_at":record.created_at,
        "updated_at":record.updated_at,
        "resolved_at":record.resolved_at,
    }))
}

fn topic_graph_projection(snapshot: TopicGraphReplacement) -> Result<Value, String> {
    let TopicGraphReplacement {
        state,
        nodes,
        edges,
        reviews,
    } = snapshot;
    let node_count = nodes.len();
    let edge_count = edges.len();
    let review_count = reviews.len();
    let manifest_hash = (!state.manifest_hash.is_empty()).then_some(state.manifest_hash);
    Ok(json!({
        "nodes":nodes.into_iter().map(topic_graph_node_wire).collect::<Result<Vec<_>, _>>()?,
        "edges":edges.into_iter().map(topic_graph_edge_wire).collect::<Result<Vec<_>, _>>()?,
        "reviewItems":reviews.into_iter().map(topic_graph_review_wire).collect::<Result<Vec<_>, _>>()?,
        "manifest":{
            "manifest_hash":manifest_hash,
            "node_count":node_count,
            "edge_count":edge_count,
            "review_count":review_count,
            "updated_at":state.updated_at.clone(),
        },
        "projection":{
            "target":"topic-graph-index",
            "stale":state.index_stale != 0,
            "last_rebuild_at":state.updated_at,
            "diagnostics":[],
        },
        "diagnostics":[],
    }))
}

fn concept_record_wire(record: ConceptRecord) -> Result<Value, String> {
    Ok(json!({
        "concept_id":record.concept_id,
        "label":record.label,
        "aliases":stored_json(&record.aliases_json, true)?,
        "concept_type":record.concept_type,
        "domain":record.domain,
        "status":record.status,
        "short_definition":record.short_definition,
        "definition":record.definition,
        "usage_note":record.usage_note,
        "editorial_note":record.editorial_note,
        "sense_ids":stored_json(&record.sense_ids_json, true)?,
        "created_at":record.created_at,
        "updated_at":record.updated_at,
    }))
}

fn concept_sense_wire(record: ConceptSenseRecord) -> Result<Value, String> {
    Ok(json!({
        "sense_id":record.sense_id,
        "concept_id":record.concept_id,
        "label":record.label,
        "aliases":stored_json(&record.aliases_json, true)?,
        "domain":record.domain,
        "short_definition":record.short_definition,
        "definition":record.definition,
        "disambiguation":record.disambiguation,
        "topic_relevance":record.topic_relevance,
        "confidence":record.confidence,
        "source_topic_ids":stored_json(&record.source_topic_ids_json, true)?,
        "evidence":stored_json(&record.evidence_json, true)?,
        "created_at":record.created_at,
        "updated_at":record.updated_at,
    }))
}

fn concept_alias_wire(record: ConceptAliasRecord) -> Value {
    json!({
        "alias_id":record.alias_id,
        "alias":record.alias,
        "normalized":record.normalized,
        "concept_id":record.concept_id,
        "sense_id":record.sense_id,
        "status":record.status,
        "confidence":record.confidence,
        "created_at":record.created_at,
        "updated_at":record.updated_at,
    })
}

fn concept_relation_wire(record: ConceptRelationRecord) -> Result<Value, String> {
    Ok(json!({
        "relation_id":record.relation_id,
        "source_concept_id":record.source_concept_id,
        "target_concept_id":record.target_concept_id,
        "relation":record.relation,
        "status":record.status,
        "confidence":record.confidence,
        "provenance":stored_json(&record.provenance_json, true)?,
        "created_at":record.created_at,
        "updated_at":record.updated_at,
    }))
}

fn concept_review_wire(record: ConceptReviewItemRecord) -> Result<Value, String> {
    let proposal = decode_stored_concept_proposal(&record.proposal_json)
        .map_err(|_| "production_projection_invalid".to_owned())?;
    Ok(json!({
        "review_id":record.review_id,
        "status":record.status,
        "reason":record.reason,
        "topic_id":record.topic_id,
        "topic_path_id":record.topic_path_id,
        "label":record.label,
        "confidence":record.confidence,
        "candidate_concept_ids":stored_json(&record.candidate_concept_ids_json, true)?,
        "short_definition":proposal.short_definition,
        "definition":proposal.definition,
        "concept_type":proposal.concept_type,
        "domain":proposal.domain,
        "topic_relevance":proposal.topic_relevance,
        "evidence":proposal.evidence,
        "target_concept_id":record.target_concept_id,
        "created_at":record.created_at,
        "updated_at":record.updated_at,
        "resolved_at":record.resolved_at,
    }))
}

fn topic_concept_link_wire(record: TopicConceptLinkRecord) -> Value {
    json!({
        "topic_id":record.topic_id,
        "concept_id":record.concept_id,
        "sense_id":record.sense_id,
        "label":record.label,
        "relevance":record.relevance,
        "confidence":record.confidence,
        "source":record.source,
        "created_at":record.created_at,
        "updated_at":record.updated_at,
    })
}

fn concept_projection(snapshot: ConceptKbReplacement) -> Result<Value, String> {
    let ConceptKbReplacement {
        state,
        concepts,
        senses,
        aliases,
        relations,
        reviews,
        topic_links,
    } = snapshot;
    let concept_count = concepts.len();
    let sense_count = senses.len();
    let alias_count = aliases.len();
    let relation_count = relations.len();
    let manifest_hash = (!state.manifest_hash.is_empty()).then_some(state.manifest_hash);
    Ok(json!({
        "concepts":concepts.into_iter().map(concept_record_wire).collect::<Result<Vec<_>, _>>()?,
        "senses":senses.into_iter().map(concept_sense_wire).collect::<Result<Vec<_>, _>>()?,
        "aliases":aliases.into_iter().map(concept_alias_wire).collect::<Vec<_>>(),
        "relations":relations.into_iter().map(concept_relation_wire).collect::<Result<Vec<_>, _>>()?,
        "manifest":{
            "manifest_hash":manifest_hash,
            "concept_count":concept_count,
            "sense_count":sense_count,
            "alias_count":alias_count,
            "relation_count":relation_count,
            "updated_at":state.updated_at.clone(),
            "projection_target":"concept-kb-index",
        },
        "projection":{
            "target":"concept-kb-index",
            "stale":state.index_stale != 0,
            "last_rebuild_at":state.updated_at,
            "diagnostics":[],
        },
        "diagnostics":[],
        "overlayEntries":[],
        "reviewItems":reviews.into_iter().map(concept_review_wire).collect::<Result<Vec<_>, _>>()?,
        "topicLinks":topic_links.into_iter().map(topic_concept_link_wire).collect::<Vec<_>>(),
    }))
}

fn topic_list_wire(result: TopicListResult) -> Value {
    let returned = result.returned;
    let total = result.total;
    json!({
        "topics":result.topics.into_iter().map(topic_record_wire).collect::<Vec<_>>(),
        "cursor":result.cursor,
        "next_cursor":result.next_cursor,
        "has_more":result.has_more,
        "returned":returned,
        "total":total,
        "limit":result.limit,
        "diagnostics":{
            "count":returned,
            "total_count":total,
            "source":"rust-topic-application",
        },
    })
}

fn project_object(value: &Value, keys: &[&str]) -> Map<String, Value> {
    value
        .as_object()
        .map(|object| {
            keys.iter()
                .filter_map(|key| {
                    object
                        .get(*key)
                        .cloned()
                        .map(|value| ((*key).into(), value))
                })
                .collect()
        })
        .unwrap_or_default()
}

fn project_string_list(value: &Value, object_keys: &[&str]) -> Value {
    let values = value
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|entry| {
            entry.as_str().or_else(|| {
                object_keys
                    .iter()
                    .find_map(|key| entry.get(*key).and_then(Value::as_str))
            })
        })
        .filter(|value| !value.trim().is_empty())
        .map(str::to_owned)
        .collect::<Vec<_>>();
    Value::Array(values.into_iter().map(Value::String).collect())
}

fn project_topic_definition(value: &Value, fallback: &Value) -> Value {
    let mut object = project_object(
        if value.is_object() { value } else { fallback },
        &[
            "id",
            "title",
            "name",
            "definition",
            "scope",
            "discipline",
            "research_field",
            "aliases",
            "scope_include",
            "scope_exclude",
        ],
    );
    if let Some(scope_boundary) = value.get("scope_boundary") {
        object.insert(
            "scope_boundary".into(),
            Value::Object(project_object(scope_boundary, &["include", "exclude"])),
        );
    }
    Value::Object(object)
}

fn project_resolved_paper(value: &Value) -> Result<Value, String> {
    let paper_ref = value
        .get("paper_ref")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "production_projection_invalid".to_owned())?;
    let mut object = project_object(
        value,
        &[
            "paper_ref",
            "item_key",
            "title",
            "year",
            "summary",
            "synthesis_role",
            "match_reasons",
            "authors",
            "role",
            "context_selection_score",
            "caveats",
        ],
    );
    object.insert("paper_ref".into(), Value::String(paper_ref.into()));
    for key in ["match_reasons", "authors", "caveats"] {
        if let Some(value) = object.get(key).cloned() {
            object.insert(key.into(), project_string_list(&value, &[]));
        }
    }
    if let Some(value) = value.get("digest_ref") {
        let digest = project_object(
            value,
            &[
                "paper_ref",
                "payload_type",
                "note_key",
                "path",
                "locator",
                "payload_hash",
                "library_id",
            ],
        );
        if digest.get("paper_ref").is_some() && digest.get("payload_type").is_some() {
            object.insert("digest_ref".into(), Value::Object(digest));
        }
    }
    if let Some(value) = value.get("literature_quality") {
        let quality = project_object(
            value,
            &[
                "status",
                "schema",
                "rubric_id",
                "paper_type",
                "overall_score",
                "confidence",
                "confidence_adjusted_score",
                "quality_prior",
                "payload_hash",
                "diagnostics",
            ],
        );
        if quality.get("status").is_some() {
            object.insert("literature_quality".into(), Value::Object(quality));
        }
    }
    Ok(Value::Object(object))
}

fn project_text_summary(value: &Value) -> Value {
    let mut object = project_object(
        value,
        &["text", "analysis", "overview", "brief", "report_excerpt"],
    );
    if let Some(value) = value.get("key_takeaways") {
        object.insert("key_takeaways".into(), project_string_list(value, &[]));
    }
    Value::Object(object)
}

fn project_coverage(value: &Value) -> Value {
    let mut object = project_object(
        value,
        &[
            "verdict",
            "reason",
            "paper_count",
            "external_literature_count",
            "coverage_verdict",
            "coverage_reason",
            "external_context_summary",
        ],
    );
    for (key, object_keys) in [
        ("caveats", &["note", "reason"][..]),
        ("coverage_caveats", &["note", "reason"][..]),
        (
            "suggested_collection_directions",
            &["direction", "reason"][..],
        ),
    ] {
        if let Some(value) = value.get(key) {
            object.insert(key.into(), project_string_list(value, object_keys));
        }
    }
    Value::Object(object)
}

fn project_topic_artifact(value: &Value, topic: &TopicRecord) -> Result<Value, String> {
    let mut object = project_object(
        value,
        &[
            "schema_id",
            "schema_version",
            "language",
            "taxonomy",
            "improvement_dimensions",
            "claims",
            "timeline_events",
            "debates",
            "statistics",
            "synthesis_report",
            "future_directions",
            "review_outline",
            "source_artifacts",
            "diagnostics",
        ],
    );
    let fallback_topic = serde_json::to_value(&topic.topic_definition)
        .map_err(|_| "production_projection_invalid".to_owned())?;
    object.insert(
        "topic".into(),
        project_topic_definition(
            value.get("topic").unwrap_or(&fallback_topic),
            &fallback_topic,
        ),
    );
    object.insert(
        "summary".into(),
        project_text_summary(value.get("summary").unwrap_or(&json!({}))),
    );
    object.insert(
        "coverage".into(),
        project_coverage(value.get("coverage").unwrap_or(&json!({}))),
    );
    let papers = if let Some(papers) = value.get("source_papers").and_then(Value::as_array) {
        papers
            .iter()
            .map(project_resolved_paper)
            .collect::<Result<Vec<_>, _>>()?
    } else {
        topic
            .resolved_paper_set
            .papers
            .iter()
            .map(|paper| {
                serde_json::to_value(paper)
                    .map_err(|_| "production_projection_invalid".to_owned())
                    .and_then(|value| project_resolved_paper(&value))
            })
            .collect::<Result<Vec<_>, _>>()?
    };
    object.insert("source_papers".into(), Value::Array(papers));
    Ok(Value::Object(object))
}

fn project_manifest(value: &Value) -> Value {
    let mut object = project_object(
        value,
        &[
            "schema_id",
            "schema_version",
            "topic_id",
            "operation",
            "language",
            "artifact_hash",
            "metadata_hash",
            "section_hashes",
        ],
    );
    for key in ["sections", "sidecars"] {
        if let Some(entries) = value.get(key).and_then(Value::as_object) {
            let projected = entries
                .iter()
                .map(|(name, entry)| {
                    (
                        name.clone(),
                        Value::Object(project_object(
                            entry,
                            &[
                                "key",
                                "path",
                                "hash",
                                "skill_id",
                                "stage_id",
                                "content_type",
                                "schema_id",
                            ],
                        )),
                    )
                })
                .collect();
            object.insert(key.into(), Value::Object(projected));
        }
    }
    Value::Object(object)
}

fn project_metadata(value: &Value, topic: &TopicRecord) -> Value {
    let source = value.as_object();
    let data = source.and_then(|value| value.get("data"));
    let artifact_metadata = data
        .and_then(|value| value.get("artifact_metadata"))
        .map(|value| {
            let mut metadata = project_object(
                value,
                &[
                    "topic_id",
                    "runtime",
                    "markdown_path",
                    "analysis_source_path",
                    "update_reason",
                ],
            );
            if let Some(depends_on) = value.get("depends_on") {
                metadata.insert(
                    "depends_on".into(),
                    Value::Object(project_object(depends_on, &["papers", "artifacts"])),
                );
            }
            Value::Object(metadata)
        })
        .unwrap_or_else(|| json!({}));
    json!({
        "schema_id":"synthesis.topic_artifact_metadata",
        "schema_version":"1.0.0",
        "created_at":source.and_then(|value| value.get("created_at")).and_then(Value::as_str).unwrap_or(&topic.updated_at),
        "updated_at":source.and_then(|value| value.get("updated_at")).and_then(Value::as_str).unwrap_or(&topic.updated_at),
        "data":{
            "topic_id":topic.topic_id,
            "title":topic.title,
            "definition":topic.definition,
            "language":topic.language,
            "operation":match topic.operation.as_str() { "create" | "update_full" | "update_patch" => topic.operation.as_str(), _ => "create" },
            "artifact_metadata":artifact_metadata,
        }
    })
}

fn topic_detail_wire(result: TopicDetailResult) -> Result<Value, String> {
    match result {
        TopicDetailResult::Absent {
            topic_id,
            diagnostics,
        }
        | TopicDetailResult::Invalid {
            topic_id,
            diagnostics,
        } => Ok(json!({
            "ok":false,
            "status":"unavailable",
            "topicId":topic_id,
            "title":"",
            "source_papers":[],
            "diagnostics":diagnostics,
        })),
        TopicDetailResult::Ready {
            topic_id,
            topic,
            snapshot,
        } => {
            let artifact = project_topic_artifact(&snapshot.artifact, &topic)?;
            let topic_section = artifact.get("topic").cloned().unwrap_or_else(|| json!({}));
            let source_papers = artifact
                .get("source_papers")
                .cloned()
                .unwrap_or_else(|| json!([]));
            let title = topic_section
                .get("title")
                .and_then(Value::as_str)
                .filter(|value| !value.trim().is_empty())
                .unwrap_or(&topic.title);
            let manifest = project_manifest(&snapshot.manifest);
            let metadata = project_metadata(&snapshot.metadata, &topic);
            Ok(json!({
                "ok":true,
                "status":"ready",
                "topicId":topic_id,
                "title":title,
                "language":topic.language,
                "updated_at":topic.updated_at,
                "artifact_hash":topic.artifact_hash,
                "paper_count":source_papers.as_array().map_or(0, Vec::len),
                "topic":topic_section,
                "summary":artifact.get("summary").cloned().unwrap_or_else(|| json!({})),
                "taxonomy":artifact.get("taxonomy").cloned().unwrap_or_else(|| json!({})),
                "improvement_dimensions":artifact.get("improvement_dimensions").cloned().unwrap_or_else(|| json!({"summary":{},"dimensions":[]})),
                "claims":artifact.get("claims").cloned().unwrap_or_else(|| json!([])),
                "timeline_events":artifact.get("timeline_events").cloned().unwrap_or_else(|| json!({"summary":{},"events":[]})),
                "source_papers":source_papers,
                "debates":artifact.get("debates").cloned().unwrap_or_else(|| json!([])),
                "coverage":artifact.get("coverage").cloned().unwrap_or_else(|| json!({})),
                "statistics":artifact.get("statistics").cloned().unwrap_or_else(|| json!({})),
                "synthesis_report":artifact.get("synthesis_report").cloned().unwrap_or_else(|| json!({})),
                "future_directions":artifact.get("future_directions").cloned().unwrap_or_else(|| json!([])),
                "review_outline":artifact.get("review_outline").cloned().unwrap_or_else(|| json!({})),
                "source_artifacts":artifact.get("source_artifacts").cloned().unwrap_or_else(|| json!({})),
                "diagnostics":artifact.get("diagnostics").cloned().unwrap_or_else(|| json!([])),
                "artifact":artifact,
                "manifest":manifest,
                "metadata":metadata,
                "pathId":snapshot.path_id,
            }))
        }
    }
}

fn deleted_topic_record_wire(record: DeletedTopicArtifactRecord) -> Value {
    json!({
        "topic_id":record.topic_id,
        "title":record.title,
        "deleted_at":record.deleted_at,
    })
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct TopicFindWireRequest {
    paper_refs: Vec<String>,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum TopicWorkflowFilterWire {
    All,
    Updatable,
    Planned,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct TopicWorkflowFilterWireRequest {
    filter: TopicWorkflowFilterWire,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum TopicContextViewWire {
    Digest,
    Semantic,
    Audit,
    Full,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicContextWireRequest {
    topic_id: String,
    view: TopicContextViewWire,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicDiscoveryHintWireRequest {
    hint_id: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ResolverTagWire {
    #[serde(skip_serializing_if = "Option::is_none")]
    and: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    or: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    not: Option<Vec<String>>,
}

impl ResolverTagWire {
    fn is_empty(&self) -> bool {
        self.and.is_none() && self.or.is_none() && self.not.is_none()
    }

    fn has_empty_value(&self) -> bool {
        [&self.and, &self.or, &self.not].into_iter().any(|values| {
            values.as_ref().is_some_and(|values| {
                values.is_empty() || values.iter().any(|value| value.trim().is_empty())
            })
        })
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum TopicResolverCombineWire {
    Union,
    Intersection,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct TopicResolverWireRequest {
    paper_refs: Vec<String>,
    collection_key: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tag: Option<ResolverTagWire>,
    combine: TopicResolverCombineWire,
    cursor: usize,
    limit: usize,
}

fn decode_find_request(args: &[Value]) -> Result<TopicFindRequest, String> {
    let request = one::<TopicFindWireRequest>(args)?;
    if request.paper_refs.is_empty()
        || request
            .paper_refs
            .iter()
            .any(|paper_ref| paper_ref.trim().is_empty())
    {
        return Err("invalid_request".into());
    }
    Ok(TopicFindRequest {
        paper_refs: request.paper_refs,
    })
}

fn decode_workflow_filter(args: &[Value]) -> Result<TopicWorkflowFilter, String> {
    match one::<TopicWorkflowFilterWireRequest>(args)?.filter {
        TopicWorkflowFilterWire::All => Ok(TopicWorkflowFilter::All),
        TopicWorkflowFilterWire::Updatable => Ok(TopicWorkflowFilter::Updatable),
        TopicWorkflowFilterWire::Planned => Ok(TopicWorkflowFilter::Planned),
    }
}

fn planned_workflow_options(apps: &ProductionApplications) -> Result<Value, String> {
    let mut options = apps
        .topic_graph
        .load()?
        .nodes
        .into_iter()
        .filter_map(|node| {
            if node.node_type != "placeholder"
                || matches!(node.definition_status.as_str(), "deleted" | "stale")
            {
                return None;
            }
            let planning = stored_json(&node.planning_json, false).ok()?;
            if planning.get("lifecycle").and_then(Value::as_str) != Some("planned") {
                return None;
            }
            let revision = planning
                .get("revision")
                .and_then(Value::as_i64)
                .unwrap_or(1);
            let title = if node.title.trim().is_empty() {
                node.topic_id.clone()
            } else {
                node.title.clone()
            };
            Some(json!({
                "value":node.topic_id,
                "label":title,
                "description":format!("{} · revision {}", node.definition, revision),
                "meta":{
                    "kind":"synthesis.planned-topic",
                    "topicId":node.topic_id,
                    "title":title,
                    "lifecycle":"planned",
                    "revision":revision,
                },
            }))
        })
        .collect::<Vec<_>>();
    options.sort_by(|left, right| {
        left["label"]
            .as_str()
            .unwrap_or_default()
            .cmp(right["label"].as_str().unwrap_or_default())
    });
    Ok(json!({"options":options,"diagnostics":[]}))
}

fn topic_planning_context(apps: &ProductionApplications) -> Result<Value, String> {
    let library = crate::runtime_artifact_library_debug::complete_library_index(apps)?;
    let graph = topic_graph_projection(apps.topic_graph.load()?)?;
    Ok(json!({
        "schema_id":"synthesis.topic_planning_context",
        "schema_version":"1.0.0",
        "library":{
            "library_id":library["libraryId"],
            "index_hash":library["index_hash"],
            "total_papers":library["papers"].as_array().map_or(0, Vec::len),
            "papers":library["papers"],
            "tags":library["tags"],
            "collections":library["collections"],
        },
        "topics":graph["nodes"],
        "topic_graph":graph,
        "coverage":{
            "denominator":"top_level_regular_items",
            "primary_states":["materialized_covered","planned_covered","uncovered","indeterminate"],
            "overlap_is_separate":true,
        },
        "diagnostics":{"bounded_inline":true,"truncated":false},
    }))
}

fn decode_topic_context(args: &[Value]) -> Result<TopicContextRequest, String> {
    let request = one::<TopicContextWireRequest>(args)?;
    if request.topic_id.trim().is_empty() {
        return Err("invalid_request".into());
    }
    let view = match request.view {
        TopicContextViewWire::Digest => TopicContextView::Digest,
        TopicContextViewWire::Semantic => TopicContextView::Semantic,
        TopicContextViewWire::Audit => TopicContextView::Audit,
        TopicContextViewWire::Full => TopicContextView::Full,
    };
    Ok(TopicContextRequest {
        topic_id: request.topic_id,
        view,
    })
}

fn decode_resolver(args: &[Value]) -> Result<TopicResolverRequest, Vec<String>> {
    let request = one::<TopicResolverWireRequest>(args)
        .map_err(|_| vec!["resolver payload is invalid".into()])?;
    let tag_is_empty = request.tag.as_ref().is_none_or(ResolverTagWire::is_empty);
    if (request.paper_refs.is_empty() && request.collection_key.is_empty() && tag_is_empty)
        || request.limit == 0
        || request.limit > 250
        || request
            .paper_refs
            .iter()
            .chain(request.collection_key.iter())
            .any(|value| value.trim().is_empty())
        || request
            .tag
            .as_ref()
            .is_some_and(ResolverTagWire::has_empty_value)
    {
        return Err(vec!["resolver payload is invalid".into()]);
    }
    let combine = match request.combine {
        TopicResolverCombineWire::Union => TopicResolverCombine::Union,
        TopicResolverCombineWire::Intersection => TopicResolverCombine::Intersection,
    };
    let normalized =
        serde_json::to_value(&request).map_err(|_| vec!["resolver payload is invalid".into()])?;
    Ok(TopicResolverRequest {
        tag: request
            .tag
            .map(|tag| serde_json::to_value(tag).expect("resolver tag serializes")),
        collection_keys: request.collection_key,
        paper_refs: request.paper_refs,
        combine,
        cursor: request.cursor,
        limit: request.limit,
        normalized,
    })
}

fn invalid_resolver(errors: Vec<String>) -> Value {
    json!({
        "ok":false,
        "errors":errors,
        "papers":[],
        "normalized_resolver":Value::Null,
        "diagnostics":{"final_count":0,"total_candidates":0,"rejected":true},
    })
}

fn decode_surface(args: &[Value]) -> Result<WorkbenchSurfaceRequest, String> {
    let [Value::String(surface), state @ Value::Object(_)] = args else {
        return Err("invalid_request".into());
    };
    let surface = match surface.as_str() {
        "home" => WorkbenchSurface::Home,
        "topics" => WorkbenchSurface::Topics,
        "index" => WorkbenchSurface::Index,
        "review" => WorkbenchSurface::Review,
        "graph" => WorkbenchSurface::Graph,
        "tags" => WorkbenchSurface::Tags,
        "concepts" => WorkbenchSurface::Concepts,
        "reader" => WorkbenchSurface::Reader,
        _ => return Err("invalid_request".into()),
    };
    Ok(WorkbenchSurfaceRequest {
        surface,
        state: state.clone(),
    })
}

struct ProductionWorkbenchSurfaces<'a> {
    apps: &'a ProductionApplications,
}

impl ProductionWorkbenchSurfaces<'_> {
    fn topic_projection(&self) -> Result<Value, String> {
        let page = self
            .apps
            .topics
            .list_workbench(TopicListRequest::default())?;
        let (deleted, deleted_total) = self.apps.topics.list_deleted(0, 250)?;
        Ok(json!({
            "libraryId":self.apps.library_id(),
            "deletedArtifacts":{
                "rows":deleted.into_iter().map(deleted_topic_record_wire).collect::<Vec<_>>(),
                "total":deleted_total,
            },
            "artifacts":page.rows,
            "topicPage":{
                "cursor":page.cursor,
                "next_cursor":page.next_cursor,
                "has_more":page.has_more,
                "returned":page.returned,
                "total":page.total,
                "limit":page.limit,
            },
        }))
    }

    fn review_summary(&self) -> Result<Value, String> {
        let query = ReviewPageQuery {
            status: "open".into(),
            kind: "all".into(),
            confidence: "all".into(),
            limit: 1,
            ..ReviewPageQuery::default()
        };
        let (reference_matching_count, index_count) = {
            let owner = self.apps.repository.owner();
            let repository = owner
                .lock()
                .map_err(|_| "repository_unavailable".to_owned())?;
            (
                repository
                    .list_reference_match_proposals_for_review(&query)?
                    .total,
                repository
                    .list_reference_revision_reviews_for_review(&query)?
                    .total,
            )
        };
        let (_, concept_count) = self.apps.concepts.load_review_page(&query)?;
        let (_, suggested_edge_count, topic_review_count) =
            self.apps.topic_graph.load_review_page(&query)?;
        let topic_graph_count = suggested_edge_count + topic_review_count;
        Ok(json!({
            "openCount":reference_matching_count + index_count + concept_count + topic_graph_count,
            "indexCount":index_count,
            "referenceMatchingCount":reference_matching_count,
            "conceptCount":concept_count,
            "topicGraphCount":topic_graph_count,
        }))
    }

    fn attach_review_summary(&self, mut projection: Value) -> Result<Value, String> {
        let object = projection
            .as_object_mut()
            .ok_or_else(|| "production_projection_invalid".to_owned())?;
        object.insert("reviews".into(), json!({"summary":self.review_summary()?}));
        Ok(projection)
    }
}

impl WorkbenchSurfacePort for ProductionWorkbenchSurfaces<'_> {
    fn home(&self, _state: &Value) -> Result<Value, String> {
        self.topic_projection()
    }

    fn topics(&self, _state: &Value) -> Result<Value, String> {
        let mut projection = self.topic_projection()?;
        projection
            .as_object_mut()
            .ok_or_else(|| "production_projection_invalid".to_owned())?
            .insert(
                "topicGraph".into(),
                topic_graph_projection(self.apps.topic_graph.load_window(250)?)?,
            );
        Ok(projection)
    }

    fn index(&self, state: &Value) -> Result<Value, String> {
        let projection = self
            .apps
            .references
            .workbench_index(state, self.apps.library_id())?;
        self.attach_review_summary(projection)
    }

    fn reference_review(&self, state: &Value) -> Result<Value, String> {
        let projection = self
            .apps
            .references
            .workbench_review(state, self.apps.library_id())?;
        self.attach_review_summary(projection)
    }

    fn topic_graph_review(&self, state: &Value) -> Result<Value, String> {
        let query = review_page_query(state)?;
        let (snapshot, edge_total, review_total) =
            self.apps.topic_graph.load_review_page(&query)?;
        let mut topic_graph = topic_graph_projection(snapshot)?;
        topic_graph
            .as_object_mut()
            .ok_or_else(|| "production_projection_invalid".to_owned())?
            .insert(
                "reviewPage".into(),
                json!({
                    "cursor":query.offset.to_string(),
                    "limit":query.limit,
                    "edge_total":edge_total,
                    "review_total":review_total,
                }),
            );
        self.attach_review_summary(json!({
            "libraryId":self.apps.library_id(),
            "topicGraph":topic_graph,
        }))
    }

    fn concept_review(&self, state: &Value) -> Result<Value, String> {
        let query = review_page_query(state)?;
        let (snapshot, total) = self.apps.concepts.load_review_page(&query)?;
        let mut concepts = concept_projection(snapshot)?;
        concepts
            .as_object_mut()
            .ok_or_else(|| "production_projection_invalid".to_owned())?
            .insert(
                "reviewPage".into(),
                json!({
                    "cursor":query.offset.to_string(),
                    "limit":query.limit,
                    "total":total,
                }),
            );
        self.attach_review_summary(json!({
            "libraryId":self.apps.library_id(),
            "concepts":concepts,
        }))
    }

    fn graph(&self, state: &Value) -> Result<Value, String> {
        crate::runtime_citation_graph_read_surface::workbench_graph_surface(self.apps, state)
    }

    fn tags(&self, _state: &Value) -> Result<Value, String> {
        let mut tags = wire(self.apps.tags.load_public_vocabulary()?)?;
        let staged = wire(self.apps.tags.list_public_staged()?)?;
        tags.as_object_mut()
            .ok_or_else(|| "production_projection_invalid".to_owned())?
            .insert("staged".into(), staged);
        Ok(json!({
            "libraryId":self.apps.library_id(),
            "tags":tags,
        }))
    }

    fn concepts(&self, _state: &Value) -> Result<Value, String> {
        Ok(json!({
            "libraryId":self.apps.library_id(),
            "concepts":concept_projection(self.apps.concepts.load()?)?,
        }))
    }

    fn reader(&self, state: &Value) -> Result<Value, String> {
        let topic_id = state
            .get("reader")
            .and_then(Value::as_object)
            .and_then(|reader| reader.get("topicId").or_else(|| reader.get("topic_id")))
            .and_then(Value::as_str)
            .filter(|value| !value.trim().is_empty());
        let reader = match topic_id {
            Some(topic_id) => topic_detail_wire(self.apps.topics.detail(TopicDetailRequest {
                topic_id: topic_id.to_owned(),
            })?)?,
            None => json!({
                "ok":false,"status":"unavailable","topicId":"","title":"",
                "source_papers":[],"diagnostics":["reader_topic_unselected"],
            }),
        };
        Ok(json!({"libraryId":self.apps.library_id(),"reader":reader}))
    }
}

pub(crate) const TOPIC_WORKBENCH_CLIENT_ROUTES: &[ProductionClientRouteEntry] = &[
    ProductionClientRouteEntry::new("client.listTopics", |apps, args| {
        apps.topics.list(one(args)?).map(topic_list_wire)
    }),
    ProductionClientRouteEntry::new("client.findTopicsByPaperRef", |apps, args| {
        wire(apps.topics.find_by_paper_refs(decode_find_request(args)?)?)
    }),
    ProductionClientRouteEntry::new("client.readTopicDetail", |apps, args| {
        apps.topics.detail(one(args)?).and_then(topic_detail_wire)
    }),
    ProductionClientRouteEntry::new("client.listWorkflowTopicOptions", |apps, args| {
        match decode_workflow_filter(args)? {
            TopicWorkflowFilter::Planned => planned_workflow_options(apps),
            filter => wire(apps.topics.workflow_options(filter)?),
        }
    }),
    ProductionClientRouteEntry::new("client.getTopicPlanningContext", |apps, args| {
        no_args(args)?;
        topic_planning_context(apps)
    }),
    ProductionClientRouteEntry::new("client.applyTopicPlan", |apps, args| {
        let plan = one::<TopicPlanReconcileRequest>(args)?;
        let library = crate::runtime_artifact_library_debug::complete_library_index(apps)?;
        let index_hash = library["index_hash"]
            .as_str()
            .ok_or_else(|| "production_projection_invalid".to_owned())?;
        Ok(apps.topic_graph.reconcile_plan(&plan, index_hash))
    })
    .with_canonical_effect(ProductionClientCanonicalEffect::Persisted),
    ProductionClientRouteEntry::new("client.getSynthesisWorkbenchChromeInput", |apps, args| {
        if !one::<Value>(args)?.is_object() {
            return Err("invalid_request".into());
        }
        wire(apps.workbench.read_public_chrome()?)
    }),
    ProductionClientRouteEntry::new("client.getSynthesisWorkbenchSurfaceInput", |apps, args| {
        let request = decode_surface(args)?;
        wire(
            apps.workbench
                .read_surface(&request, &ProductionWorkbenchSurfaces { apps })?,
        )
    }),
    ProductionClientRouteEntry::new("client.getSynthesisBackgroundJobRows", |apps, args| {
        no_args(args)?;
        wire(apps.workbench.background_jobs()?)
    }),
    ProductionClientRouteEntry::new("client.applyTopicSynthesisResult", |apps, args| {
        wire(apps.topics.apply(one::<TopicApplyRequest>(args)?))
    })
    .with_canonical_effect(ProductionClientCanonicalEffect::Persisted),
    ProductionClientRouteEntry::new("client.getTopicContext", |apps, args| {
        wire(apps.topics.context(decode_topic_context(args)?)?)
    }),
    ProductionClientRouteEntry::new("client.resolveResolver", |apps, args| {
        let request = match decode_resolver(args) {
            Ok(request) => request,
            Err(errors) => return Ok(invalid_resolver(errors)),
        };
        wire(apps.topics.resolve(apps.topic_library.as_ref(), request)?)
    }),
    ProductionClientRouteEntry::new("client.getTopicReport", |apps, args| {
        let request = one::<TopicDetailRequest>(args)?;
        wire(apps.topics.report(TopicReportRequest {
            topic_id: request.topic_id,
        })?)
    }),
    ProductionClientRouteEntry::new("client.applyLiteratureDigestSidecar", |apps, args| {
        let checkpoint = || checkpoint_current_before_promotion(apps);
        apps.references
            .apply_literature_digest(one::<LiteratureDigestApplyRequest>(args)?, &checkpoint)
    }),
    ProductionClientRouteEntry::new("client.deleteTopicArtifact", |apps, args| {
        wire(apps.topics.delete(one::<TopicDeleteRequest>(args)?)?)
    })
    .with_canonical_effect(ProductionClientCanonicalEffect::Deleted),
    ProductionClientRouteEntry::new("client.purgeDeletedTopicArtifacts", |apps, args| {
        no_args(args)?;
        wire(apps.topics.purge_deleted()?)
    }),
    ProductionClientRouteEntry::new("client.rejectTopicDiscoveryHint", |apps, args| {
        let request = one::<TopicDiscoveryHintWireRequest>(args)?;
        if request.hint_id.trim().is_empty() {
            return Err("invalid_request".into());
        }
        wire(
            apps.topics
                .update_discovery_hint(TopicDiscoveryHintRequest {
                    hint_id: request.hint_id,
                    status: "rejected".into(),
                })?,
        )
    }),
    ProductionClientRouteEntry::new("client.restoreTopicDiscoveryHint", |apps, args| {
        let request = one::<TopicDiscoveryHintWireRequest>(args)?;
        if request.hint_id.trim().is_empty() {
            return Err("invalid_request".into());
        }
        wire(
            apps.topics
                .update_discovery_hint(TopicDiscoveryHintRequest {
                    hint_id: request.hint_id,
                    status: "open".into(),
                })?,
        )
    }),
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn invalid_resolver_is_rejected_before_a_library_port_exists() {
        let result = decode_resolver(&[json!({"topicId":"topic:invalid"})]);
        let errors = result.expect_err("invalid");
        assert_eq!(errors.len(), 1);
        assert!(errors[0].contains("invalid"));
    }

    #[test]
    fn topic_request_decoders_reject_aliases_and_missing_contract_fields() {
        assert!(one::<TopicListRequest>(&[json!({})]).is_err());
        assert!(decode_find_request(&[json!({"paperRef":"1:ITEM1"})]).is_err());
        assert!(decode_workflow_filter(&[]).is_err());
        assert!(decode_topic_context(&[json!({"topicId":"topic:1"})]).is_err());
        assert!(decode_topic_context(&[json!({"topic_id":"topic:1","view":"full"}),]).is_err());
        assert!(
            decode_resolver(&[json!({
                "paper_refs":["1:ITEM1"],
                "collection_key":[]
            })])
            .is_err()
        );
    }

    #[test]
    fn projects_historical_topic_nested_fields_into_the_public_shape() {
        let paper = project_resolved_paper(&json!({
            "paper_ref": "1:ITEM1",
            "title": "Paper",
            "triage": {"status": "included"},
            "match_reasons": ["resolver"],
        }))
        .expect("valid paper");
        assert_eq!(paper["paper_ref"], "1:ITEM1");
        assert!(paper.get("triage").is_none());

        let coverage = project_coverage(&json!({
            "verdict": "partial",
            "coverage_caveats": [{"note": "small corpus", "type": "scope"}],
            "suggested_collection_directions": [{
                "direction": "Add surveys",
                "reason": "Improve context",
                "priority": "high"
            }]
        }));
        assert_eq!(coverage["coverage_caveats"], json!(["small corpus"]));
        assert_eq!(
            coverage["suggested_collection_directions"],
            json!(["Add surveys"])
        );
    }
}
