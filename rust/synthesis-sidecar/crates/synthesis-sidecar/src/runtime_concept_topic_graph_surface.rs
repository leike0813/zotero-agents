use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeSet;
use synthesis_application::concept_kb::{
    ConceptDeleteRequest, ConceptDisplayUpdateRequest, ConceptMutationResult,
    ConceptMutationStatus, ConceptReviewAction, ConceptReviewRequest,
};
use synthesis_application::topic_graph::{
    TopicGraphMutationResult, TopicGraphMutationStatus, TopicGraphRelationDecisionRequest,
    TopicGraphRelationStatus, TopicGraphReviewAction, TopicGraphReviewRequest,
};

use crate::runtime_production_client::{
    ProductionClientCanonicalEffect, ProductionClientRouteEntry,
};
use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::checkpoint_current_before_promotion;

const MAX_QUERY_LABELS: usize = 100;
const MAX_TEXT_BYTES: usize = 4_096;

/// The single public adapter for the Concept KB and Topic Graph operations.
/// This module owns public aliases, captured CAS bases, and the domain-specific
/// typed commands selected by the production client runtime.
pub(crate) const CONCEPT_TOPIC_GRAPH_CLIENT_ROUTES: &[ProductionClientRouteEntry] = &[
    ProductionClientRouteEntry::new("client.queryConceptKb", query),
    ProductionClientRouteEntry::new("client.rebuildConceptKbIndex", |apps, args| {
        no_args(args)?;
        let basis = concept_basis(apps)?;
        let checkpoint = || promotion_checkpoint(apps);
        concept_mutation_wire(
            apps.concepts
                .rebuild_index_with_checkpoint(&basis, &checkpoint),
        )
    }),
    ProductionClientRouteEntry::new("client.updateConceptDisplayText", update_display_text)
        .with_canonical_effect(ProductionClientCanonicalEffect::Committed),
    ProductionClientRouteEntry::new("client.applyConceptReviewAction", review_concept)
        .with_canonical_effect(ProductionClientCanonicalEffect::Committed),
    ProductionClientRouteEntry::new("client.deleteConceptEntries", delete_concepts)
        .with_canonical_effect(ProductionClientCanonicalEffect::Committed),
    ProductionClientRouteEntry::new("client.rebuildTopicGraphIndex", |apps, args| {
        no_args(args)?;
        let basis = topic_graph_basis(apps)?;
        let checkpoint = || promotion_checkpoint(apps);
        topic_graph_mutation_wire(
            apps.topic_graph
                .rebuild_index_with_checkpoint(&basis, &checkpoint),
        )
    }),
    ProductionClientRouteEntry::new("client.acceptTopicGraphRelation", |apps, args| {
        decide_relation(apps, args, TopicGraphRelationStatus::Confirmed)
    })
    .with_canonical_effect(ProductionClientCanonicalEffect::Committed),
    ProductionClientRouteEntry::new("client.rejectTopicGraphRelation", |apps, args| {
        decide_relation(apps, args, TopicGraphRelationStatus::Rejected)
    })
    .with_canonical_effect(ProductionClientCanonicalEffect::Committed),
    ProductionClientRouteEntry::new("client.applyTopicGraphReviewAction", review_topic_graph)
        .with_canonical_effect(ProductionClientCanonicalEffect::Committed),
];

fn promotion_checkpoint(apps: &ProductionApplications) -> Result<(), String> {
    checkpoint_current_before_promotion(apps)
}

fn wire<T: serde::Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|_| "production_projection_invalid".into())
}

fn concept_mutation_wire(result: ConceptMutationResult) -> Result<Value, String> {
    let status = match result.status {
        ConceptMutationStatus::ReviewItemClosed => return Err("concept_review_item_closed".into()),
        ConceptMutationStatus::ReviewTargetMissing => {
            return Err("concept_review_target_missing".into());
        }
        ConceptMutationStatus::RepairRequired => return Err("repair_required".into()),
        ConceptMutationStatus::Committed => "committed",
        ConceptMutationStatus::Unchanged => "unchanged",
        ConceptMutationStatus::NotFound => return Err("not_found".into()),
        ConceptMutationStatus::BasisMismatch => "basis_mismatch",
        ConceptMutationStatus::ConceptKbBusy => "concept_kb_busy",
        ConceptMutationStatus::InvalidRequest => "invalid_request",
        ConceptMutationStatus::WorkerFailed => "worker_failed",
        ConceptMutationStatus::Stopping => "stopping",
    };
    let mut diagnostics = result
        .warnings
        .into_iter()
        .map(|code| json!({ "code": code, "severity": "warning" }))
        .collect::<Vec<_>>();
    if let Some(diagnostic) = result.diagnostic {
        diagnostics.push(json!({ "code": diagnostic.code, "severity": "error" }));
    }
    Ok(json!({
        "status": status,
        "manifestHash": result.manifest_hash,
        "revision": result.revision,
        "changedConceptIds": result.changed_concept_ids,
        "reviewIds": result.review_ids,
        "diagnostics": diagnostics,
    }))
}

fn topic_graph_mutation_wire(result: TopicGraphMutationResult) -> Result<Value, String> {
    let status = match result.status {
        TopicGraphMutationStatus::RepairRequired => return Err("repair_required".into()),
        TopicGraphMutationStatus::Committed => "committed",
        TopicGraphMutationStatus::Unchanged => "unchanged",
        TopicGraphMutationStatus::NotFound => return Err("not_found".into()),
        TopicGraphMutationStatus::BasisMismatch => "basis_mismatch",
        TopicGraphMutationStatus::TopicGraphBusy => "topic_graph_busy",
        TopicGraphMutationStatus::InvalidRequest => "invalid_request",
        TopicGraphMutationStatus::WorkerFailed => "worker_failed",
        TopicGraphMutationStatus::Stopping => "stopping",
    };
    let mut diagnostics = result
        .warnings
        .into_iter()
        .map(|code| json!({ "code": code, "severity": "warning" }))
        .collect::<Vec<_>>();
    if let Some(diagnostic) = result.diagnostic {
        diagnostics.push(json!({ "code": diagnostic.code, "severity": "error" }));
    }
    Ok(json!({
        "status": status,
        "manifestHash": result.manifest_hash,
        "revision": result.revision,
        "changedNodeIds": result.changed_node_ids,
        "changedEdgeIds": result.changed_edge_ids,
        "reviewIds": result.review_ids,
        "diagnostics": diagnostics,
    }))
}

fn one_request<T: for<'de> Deserialize<'de>>(args: &[Value]) -> Result<T, String> {
    let [value] = args else {
        return Err("invalid_request".into());
    };
    serde_json::from_value(value.clone()).map_err(|_| "invalid_request".to_owned())
}

fn no_args(args: &[Value]) -> Result<(), String> {
    if args.is_empty() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn bounded_text(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() || value.len() > MAX_TEXT_BYTES || value.chars().any(char::is_control) {
        return Err("invalid_request".into());
    }
    Ok(value.split_whitespace().collect::<Vec<_>>().join(" "))
}

fn concept_basis(apps: &ProductionApplications) -> Result<String, String> {
    apps.concepts
        .inspect()?
        .manifest_hash
        .ok_or_else(|| "concept_kb_not_initialized".into())
}

fn topic_graph_basis(apps: &ProductionApplications) -> Result<String, String> {
    apps.topic_graph
        .inspect()?
        .manifest_hash
        .ok_or_else(|| "topic_graph_not_initialized".into())
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ConceptQueryWireRequest {
    labels: Option<Vec<String>>,
    aliases: Option<Vec<String>>,
    label: Option<String>,
    query: Option<String>,
    limit: Option<usize>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConceptQueryAliasMatchWire {
    alias_id: String,
    concept_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConceptQueryMatchWire {
    alias_matches: Vec<ConceptQueryAliasMatchWire>,
    ambiguous: bool,
    exact_concept_ids: Vec<String>,
    label: String,
    sense_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct ConceptApplicationQueryResult {
    matches: Vec<ConceptQueryMatchWire>,
}

#[derive(Debug, Serialize)]
struct ConceptQueryLimitsWire {
    limit: usize,
    #[serde(rename = "maxLimit")]
    max_limit: usize,
    total: usize,
}

#[derive(Debug, Serialize)]
struct ConceptQueryDiagnosticDetailsWire {
    requested: usize,
}

#[derive(Debug, Serialize)]
struct ConceptQueryDiagnosticWire {
    code: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<ConceptQueryDiagnosticDetailsWire>,
}

#[derive(Debug, Serialize)]
struct ConceptQueryResultWire {
    ok: bool,
    labels: Vec<String>,
    matches: Vec<ConceptQueryMatchWire>,
    truncated: bool,
    limits: ConceptQueryLimitsWire,
    diagnostics: Vec<ConceptQueryDiagnosticWire>,
}

fn query_labels(args: &[Value]) -> Result<(Vec<String>, usize), String> {
    let request: ConceptQueryWireRequest = one_request(args)?;
    let limit = request.limit.unwrap_or(50);
    if !(1..=MAX_QUERY_LABELS).contains(&limit) {
        return Err("invalid_request".into());
    }
    let mut labels = BTreeSet::new();
    for values in [request.labels, request.aliases].into_iter().flatten() {
        if values.len() > MAX_QUERY_LABELS {
            return Err("invalid_request".into());
        }
        for value in values {
            labels.insert(bounded_text(&value)?);
        }
    }
    for value in [request.label, request.query].into_iter().flatten() {
        labels.insert(bounded_text(&value)?);
    }
    let total = labels.len();
    Ok((labels.into_iter().take(limit).collect(), total))
}

fn query(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let (labels, total) = query_labels(args)?;
    let truncated = total > labels.len();
    match apps.concepts.query(&json!({"labels":labels})) {
        Ok(result) => {
            let result: ConceptApplicationQueryResult = serde_json::from_value(result)
                .map_err(|_| "production_projection_invalid".to_owned())?;
            wire(ConceptQueryResultWire {
                ok: true,
                labels,
                matches: result.matches,
                truncated,
                limits: ConceptQueryLimitsWire {
                    limit: total,
                    max_limit: MAX_QUERY_LABELS,
                    total,
                },
                diagnostics: vec![ConceptQueryDiagnosticWire {
                    code: "bounded_read_only",
                    details: Some(ConceptQueryDiagnosticDetailsWire { requested: total }),
                }],
            })
        }
        Err(code) if code == "concept_kb_index_stale" || code == "concept_kb_index_invalid" => {
            let matches = labels
                .iter()
                .map(|label| ConceptQueryMatchWire {
                    alias_matches: Vec::new(),
                    ambiguous: false,
                    exact_concept_ids: Vec::new(),
                    label: label.clone(),
                    sense_ids: Vec::new(),
                })
                .collect();
            wire(ConceptQueryResultWire {
                ok: true,
                labels,
                matches,
                truncated,
                limits: ConceptQueryLimitsWire {
                    limit: total,
                    max_limit: MAX_QUERY_LABELS,
                    total,
                },
                diagnostics: vec![
                    ConceptQueryDiagnosticWire {
                        code: "concept_kb_index_unavailable",
                        details: None,
                    },
                    ConceptQueryDiagnosticWire {
                        code: "bounded_read_only",
                        details: Some(ConceptQueryDiagnosticDetailsWire { requested: total }),
                    },
                ],
            })
        }
        Err(code) => Err(code),
    }
}

fn update_display_text(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: ConceptDisplayWireRequest = one_request(args)?;
    let concept_id = bounded_text(&request.concept_id)?;
    let fields = request.fields;
    if fields.short_definition.is_none()
        && fields.definition.is_none()
        && fields.usage_note.is_none()
        && fields.editorial_note.is_none()
    {
        return Err("invalid_request".into());
    }
    let current = apps
        .concepts
        .load()?
        .concepts
        .into_iter()
        .find(|entry| entry.concept_id == concept_id)
        .ok_or_else(|| "not_found".to_owned())?;
    let text = |value: Option<String>, fallback: &str| -> Result<String, String> {
        value
            .map(|value| bounded_text(&value))
            .transpose()
            .map(|value| value.unwrap_or_else(|| fallback.to_owned()))
    };
    concept_mutation_wire(
        apps.concepts
            .update_display_text(&ConceptDisplayUpdateRequest {
                expected_manifest_hash: concept_basis(apps)?,
                concept_id,
                label: current.label,
                short_definition: text(fields.short_definition, &current.short_definition)?,
                definition: text(fields.definition, &current.definition)?,
                usage_note: text(fields.usage_note, &current.usage_note)?,
                editorial_note: text(fields.editorial_note, &current.editorial_note)?,
            }),
    )
}

fn review_concept(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: ConceptReviewWireRequest = one_request(args)?;
    let action = match request.action {
        ConceptReviewWireAction::ApproveCreate => ConceptReviewAction::Approve,
        ConceptReviewWireAction::MergeIntoExisting => ConceptReviewAction::Merge,
        ConceptReviewWireAction::Reject => ConceptReviewAction::Reject,
    };
    let target = request
        .target_concept_id
        .as_deref()
        .map(bounded_text)
        .transpose()?;
    if (matches!(action, ConceptReviewAction::Merge)) != target.is_some() {
        return Err("invalid_request".into());
    }
    concept_mutation_wire(apps.concepts.review(&ConceptReviewRequest {
        expected_manifest_hash: concept_basis(apps)?,
        review_id: bounded_text(&request.review_id)?,
        action,
        target_concept_id: target,
    }))
}

fn delete_concepts(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: ConceptDeleteWireRequest = one_request(args)?;
    let ids = request
        .concept_ids
        .iter()
        .map(|value| bounded_text(value))
        .collect::<Result<BTreeSet<_>, _>>()?;
    if ids.is_empty() || ids.len() > MAX_QUERY_LABELS {
        return Err("invalid_request".into());
    }
    concept_mutation_wire(apps.concepts.delete_concepts(&ConceptDeleteRequest {
        expected_manifest_hash: concept_basis(apps)?,
        concept_ids: ids.into_iter().collect(),
    }))
}

fn decide_relation(
    apps: &ProductionApplications,
    args: &[Value],
    status: TopicGraphRelationStatus,
) -> Result<Value, String> {
    let request: TopicGraphEdgeWireRequest = one_request(args)?;
    let edge_id = bounded_text(&request.edge_id)?;
    let refresh_discovery = status == TopicGraphRelationStatus::Confirmed
        && apps.topic_graph.load()?.edges.iter().any(|edge| {
            edge.edge_id == edge_id && edge.status == "suggested" && edge.relation == "broader_than"
        });
    let mut result = apps
        .topic_graph
        .decide_relation(&TopicGraphRelationDecisionRequest {
            expected_manifest_hash: topic_graph_basis(apps)?,
            edge_id,
            status,
        });
    if refresh_discovery {
        refresh_topic_discovery(apps, &mut result);
    }
    topic_graph_mutation_wire(result)
}

/// A newly confirmed `broader_than` relation changes which topics the discovery
/// cascade aggregates. This is a post-commit refresh: a failure is a warning
/// and never rolls back the committed edge.
fn refresh_topic_discovery(apps: &ProductionApplications, result: &mut TopicGraphMutationResult) {
    if result.status != TopicGraphMutationStatus::Committed {
        return;
    }
    let refreshed = apps
        .repository
        .owner()
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())
        .and_then(|mut repository| {
            repository.refresh_topic_discovery_projections(&synthesis_protocol::utc_now_iso8601())
        });
    if let Err(error) = refreshed {
        result
            .warnings
            .push(format!("topic_discovery_projection_failed:{error}"));
    }
}

fn review_topic_graph(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: TopicGraphReviewWireRequest = one_request(args)?;
    let review_id = bounded_text(&request.review_id)?;
    let action = match request.action {
        TopicGraphReviewWireAction::ApproveSuggested => TopicGraphReviewAction::ApproveSuggested,
        TopicGraphReviewWireAction::Reject => TopicGraphReviewAction::Reject,
    };
    // Approval commits a confirmed edge directly, so it must refresh the
    // discovery cascade exactly like a direct accept: only when the open
    // review being approved is a `broader_than` relation. The relation is read
    // from the pre-mutation snapshot, mirroring `decide_relation`.
    let refresh_discovery = action == TopicGraphReviewAction::ApproveSuggested
        && apps.topic_graph.load()?.reviews.iter().any(|review| {
            review.review_id == review_id
                && review.status == "open"
                && review.relation == "broader_than"
        });
    let mut result = apps.topic_graph.review(&TopicGraphReviewRequest {
        expected_manifest_hash: topic_graph_basis(apps)?,
        review_id,
        action,
    });
    if refresh_discovery {
        refresh_topic_discovery(apps, &mut result);
    }
    topic_graph_mutation_wire(result)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConceptDisplayWireRequest {
    concept_id: String,
    fields: ConceptDisplayFieldsWire,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ConceptDisplayFieldsWire {
    short_definition: Option<String>,
    definition: Option<String>,
    usage_note: Option<String>,
    editorial_note: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum ConceptReviewWireAction {
    ApproveCreate,
    MergeIntoExisting,
    Reject,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConceptReviewWireRequest {
    review_id: String,
    action: ConceptReviewWireAction,
    target_concept_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConceptDeleteWireRequest {
    concept_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicGraphEdgeWireRequest {
    edge_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum TopicGraphReviewWireAction {
    ApproveSuggested,
    Reject,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicGraphReviewWireRequest {
    review_id: String,
    action: TopicGraphReviewWireAction,
}

#[cfg(test)]
mod tests {
    use std::path::Path;
    use std::sync::{Arc, Mutex};

    use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
    use synthesis_repository::{
        Repository, RepositoryIdentity, TopicApplicationProjectionRecord,
        TopicGraphApplicationStateRecord, TopicGraphNodeRecord, TopicGraphReplacement,
        TopicGraphReviewItemRecord,
    };

    use crate::runtime_production_ports::build_production_applications;
    use crate::runtime_worker_pool::NativeComputePool;

    use super::*;

    fn seed_open_review(apps: &ProductionApplications, relation: &str, discovery_json: &str) {
        let nodes = ["parent", "child"]
            .into_iter()
            .map(|id| TopicGraphNodeRecord {
                topic_id: format!("topic:{id}"),
                title: id.into(),
                aliases_json: "[]".into(),
                node_type: "topic".into(),
                created_at: "before".into(),
                updated_at: "before".into(),
                ..TopicGraphNodeRecord::default()
            })
            .collect::<Vec<_>>();
        let seeded = apps.topic_graph.replace_snapshot(
            None,
            &TopicGraphReplacement {
                state: TopicGraphApplicationStateRecord {
                    singleton_id: 1,
                    manifest_hash: "graph:review-refresh".into(),
                    index_json: "{}".into(),
                    updated_at: "before".into(),
                    ..TopicGraphApplicationStateRecord::default()
                },
                nodes,
                edges: Vec::new(),
                reviews: vec![TopicGraphReviewItemRecord {
                    review_id: "review:relation".into(),
                    status: "open".into(),
                    source_topic_id: "topic:parent".into(),
                    target_topic_id: "topic:child".into(),
                    target_title: "child".into(),
                    relation: relation.into(),
                    confidence: Some(0.4),
                    provenance_json: "[]".into(),
                    evidence_refs_json: "[]".into(),
                    created_at: "before".into(),
                    updated_at: "before".into(),
                    ..TopicGraphReviewItemRecord::default()
                }],
            },
        );
        assert_eq!(seeded.status, TopicGraphMutationStatus::Committed);
        let owner = apps.repository.owner();
        let repository = owner.lock().expect("repository");
        repository
            .upsert_topic_application_projection(&TopicApplicationProjectionRecord {
                topic_id: "topic:parent".into(),
                topic_graph_json: "{}".into(),
                concepts_json: "{}".into(),
                interest_metadata_json: "{}".into(),
                discovery_json: discovery_json.into(),
                updated_at: "before".into(),
            })
            .expect("projection");
        repository
            .execute(
                "INSERT INTO synt_topic_discovery_hint(hint_id,payload_json,updated_at)
                 VALUES(?1,?2,?3)",
                &[
                    json!("hint:child"),
                    json!("{\"topic_id\":\"topic:child\",\"literature_item_id\":\"1:ABC\",\"status\":\"open\"}"),
                    json!("before"),
                ],
            )
            .expect("hint");
    }

    fn discovery_cascade(apps: &ProductionApplications) -> Value {
        let projection = apps
            .repository
            .owner()
            .lock()
            .expect("repository")
            .get_topic_application_projection("topic:parent")
            .expect("projection read")
            .expect("projection");
        serde_json::from_str::<Value>(&projection.discovery_json).expect("discovery json")
            ["cascade_topic_ids"]
            .clone()
    }

    fn approve_review(apps: &ProductionApplications) -> Value {
        dispatch_owned(
            apps,
            "client.applyTopicGraphReviewAction",
            &[json!({"reviewId": "review:relation", "action": "approve_suggested"})],
        )
        .expect("approved review")
    }

    fn warnings(result: &Value) -> Vec<String> {
        result["diagnostics"]
            .as_array()
            .into_iter()
            .flatten()
            .filter(|row| row["severity"] == "warning")
            .filter_map(|row| row["code"].as_str())
            .map(str::to_owned)
            .collect()
    }

    fn test_applications(root: &Path) -> ProductionApplications {
        let repository = Repository::open(
            root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("repository");
        let canonical = CanonicalStore::open(
            root,
            CanonicalIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("canonical");
        build_production_applications(
            Arc::new(synthesis_application::RepositoryPort::new(Arc::new(
                Mutex::new(repository),
            ))),
            Arc::new(Mutex::new(canonical)),
            Arc::new(NativeComputePool::new()),
            None,
            "service".into(),
            root.join("webdav-state.json"),
        )
        .expect("applications")
    }

    fn dispatch_owned(
        apps: &ProductionApplications,
        capability: &str,
        args: &[Value],
    ) -> Result<Value, String> {
        let route = CONCEPT_TOPIC_GRAPH_CLIENT_ROUTES
            .iter()
            .find(|route| route.capability == capability)
            .expect("owned capability");
        (route.handler)(apps, args)
    }

    /// Approving a low-confidence narrower-topic review is terminal: the review
    /// commits a confirmed `broader_than` edge and that new confirmation must
    /// refresh the topic discovery cascade exactly like a direct edge accept.
    #[test]
    fn approving_a_broader_relation_review_refreshes_topic_discovery() {
        let root = synthesis_test_support::TestRoot::new("synthesis-concept-topic-graph-surface");
        let apps = test_applications(&root);
        seed_open_review(&apps, "broader_than", "{\"source_paper_refs\":[]}");

        let approved = approve_review(&apps);
        assert_eq!(approved["status"], "committed");
        assert!(
            warnings(&approved).is_empty(),
            "discovery refresh must not degrade into a warning: {approved}"
        );
        let graph = apps.topic_graph.load().expect("graph");
        assert_eq!(graph.reviews[0].status, "approved");
        assert_eq!(graph.edges[0].status, "confirmed");
        assert_eq!(
            discovery_cascade(&apps),
            json!(["topic:child", "topic:parent"]),
            "the newly confirmed broader_than edge refreshes the discovery cascade"
        );
        drop(apps);
    }

    /// Only `broader_than` confirmations change the discovery cascade, so an
    /// approved non-hierarchy review must not refresh it.
    #[test]
    fn approving_a_non_broader_relation_review_skips_the_discovery_refresh() {
        let root = synthesis_test_support::TestRoot::new("synthesis-concept-topic-graph-surface");
        let apps = test_applications(&root);
        seed_open_review(
            &apps,
            "related_to",
            "{\"cascade_topic_ids\":[\"sentinel\"]}",
        );

        let approved = approve_review(&apps);
        assert_eq!(approved["status"], "committed");
        assert!(warnings(&approved).is_empty(), "{approved}");
        let graph = apps.topic_graph.load().expect("graph");
        assert_eq!(graph.reviews[0].status, "approved");
        assert_eq!(graph.edges[0].status, "confirmed");
        assert_eq!(
            discovery_cascade(&apps),
            json!(["sentinel"]),
            "a non-broader_than approval leaves the discovery projection untouched"
        );
        drop(apps);
    }
}
