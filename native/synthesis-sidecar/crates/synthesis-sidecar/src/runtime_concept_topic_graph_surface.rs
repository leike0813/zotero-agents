use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeSet;
use synthesis_application::concept_kb::{
    ConceptDeleteRequest, ConceptDisplayUpdateRequest, ConceptReviewAction, ConceptReviewRequest,
};
use synthesis_application::topic_graph::{
    TopicGraphMutationStatus, TopicGraphRelationDecisionRequest, TopicGraphRelationStatus,
    TopicGraphReviewAction, TopicGraphReviewRequest,
};

use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::{
    checkpoint_before_promotion, current_operation_id,
};

const MAX_QUERY_LABELS: usize = 100;
const MAX_TEXT_BYTES: usize = 4_096;

/// The single public adapter for the Concept KB and Topic Graph operations.
/// The dispatcher only selects this domain surface; this module owns public
/// aliases, captured CAS bases, and the domain-specific typed commands.
type ProductionClientHandler = fn(&ProductionApplications, &[Value]) -> Result<Value, String>;

struct RegisteredProductionClientHandler {
    capability: &'static str,
    dispatch: ProductionClientHandler,
}

macro_rules! register_production_client_handlers {
    ($(($capability:literal, $handler:expr)),+ $(,)?) => {
        const CONCEPT_TOPIC_GRAPH_CLIENT_HANDLERS: &[RegisteredProductionClientHandler] = &[
            $(RegisteredProductionClientHandler { capability: $capability, dispatch: $handler }),+
        ];
    };
}

register_production_client_handlers!(
    ("client.queryConceptKb", query),
    ("client.rebuildConceptKbIndex", |apps, args| {
        no_args(args)?;
        let basis = concept_basis(apps)?;
        let checkpoint = || promotion_checkpoint(apps);
        wire(
            apps.concepts
                .rebuild_index_with_checkpoint(&basis, &checkpoint),
        )
    }),
    ("client.updateConceptDisplayText", update_display_text),
    ("client.applyConceptReviewAction", review_concept),
    ("client.deleteConceptEntries", delete_concepts),
    ("client.rebuildTopicGraphIndex", |apps, args| {
        no_args(args)?;
        let basis = topic_graph_basis(apps)?;
        let checkpoint = || promotion_checkpoint(apps);
        wire(
            apps.topic_graph
                .rebuild_index_with_checkpoint(&basis, &checkpoint),
        )
    }),
    ("client.acceptTopicGraphRelation", |apps, args| {
        decide_relation(apps, args, TopicGraphRelationStatus::Confirmed)
    }),
    ("client.rejectTopicGraphRelation", |apps, args| {
        decide_relation(apps, args, TopicGraphRelationStatus::Rejected)
    }),
    ("client.applyTopicGraphReviewAction", review_topic_graph),
);

pub(crate) fn dispatch(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Option<Result<Value, String>> {
    CONCEPT_TOPIC_GRAPH_CLIENT_HANDLERS
        .iter()
        .find(|handler| handler.capability == capability)
        .map(|handler| (handler.dispatch)(apps, args))
}

#[cfg(test)]
pub(crate) fn dispatched_capabilities() -> impl Iterator<Item = &'static str> {
    CONCEPT_TOPIC_GRAPH_CLIENT_HANDLERS
        .iter()
        .map(|handler| handler.capability)
}

fn promotion_checkpoint(apps: &ProductionApplications) -> Result<(), String> {
    let Some(operation_id) = current_operation_id() else {
        return Ok(());
    };
    checkpoint_before_promotion(apps, &operation_id, &synthesis_protocol::utc_now_iso8601())
}

fn wire<T: serde::Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|_| "production_projection_invalid".into())
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
    wire(
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
    wire(apps.concepts.review(&ConceptReviewRequest {
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
    wire(apps.concepts.delete_concepts(&ConceptDeleteRequest {
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
    if result.status == TopicGraphMutationStatus::Committed && refresh_discovery {
        let refreshed = apps
            .repository
            .owner()
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .refresh_topic_discovery_projections(&synthesis_protocol::utc_now_iso8601());
        if let Err(error) = refreshed {
            result
                .warnings
                .push(format!("topic_discovery_projection_failed:{error}"));
        }
    }
    wire(result)
}

fn review_topic_graph(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: TopicGraphReviewWireRequest = one_request(args)?;
    let action = match request.action {
        TopicGraphReviewWireAction::ApproveSuggested => TopicGraphReviewAction::ApproveSuggested,
        TopicGraphReviewWireAction::Reject => TopicGraphReviewAction::Reject,
    };
    wire(apps.topic_graph.review(&TopicGraphReviewRequest {
        expected_manifest_hash: topic_graph_basis(apps)?,
        review_id: bounded_text(&request.review_id)?,
        action,
    }))
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
    use super::*;

    #[test]
    fn adapter_has_the_closed_nine_operation_slice() {
        assert_eq!(CONCEPT_TOPIC_GRAPH_CLIENT_HANDLERS.len(), 9);
        let capabilities = CONCEPT_TOPIC_GRAPH_CLIENT_HANDLERS
            .iter()
            .map(|handler| handler.capability)
            .collect::<BTreeSet<_>>();
        assert_eq!(capabilities.len(), 9);
    }
}
