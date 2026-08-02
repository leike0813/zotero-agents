use serde_json::{Map, Value, json};
use std::collections::BTreeSet;
use synthesis_application::concept_kb::{
    ConceptDeleteRequest, ConceptDisplayUpdateRequest, ConceptReviewAction, ConceptReviewRequest,
};
use synthesis_application::topic_graph::{
    TopicGraphRelationDecisionRequest, TopicGraphRelationStatus, TopicGraphReviewAction,
    TopicGraphReviewRequest,
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
pub(crate) fn dispatch(
    apps: &ProductionApplications,
    operation: &str,
    args: &[Value],
) -> Result<Value, String> {
    match operation {
        "client.queryConceptKb" => query(apps, args),
        "client.rebuildConceptKbIndex" => {
            no_args(args)?;
            let basis = concept_basis(apps)?;
            let checkpoint = || promotion_checkpoint(apps);
            wire(
                apps.concepts
                    .rebuild_index_with_checkpoint(&basis, &checkpoint),
            )
        }
        "client.updateConceptDisplayText" => update_display_text(apps, args),
        "client.applyConceptReviewAction" => review_concept(apps, args),
        "client.deleteConceptEntries" => delete_concepts(apps, args),
        "client.rebuildTopicGraphIndex" => {
            no_args(args)?;
            let basis = topic_graph_basis(apps)?;
            let checkpoint = || promotion_checkpoint(apps);
            wire(
                apps.topic_graph
                    .rebuild_index_with_checkpoint(&basis, &checkpoint),
            )
        }
        "client.acceptTopicGraphRelation" => {
            decide_relation(apps, args, TopicGraphRelationStatus::Confirmed)
        }
        "client.rejectTopicGraphRelation" => {
            decide_relation(apps, args, TopicGraphRelationStatus::Rejected)
        }
        "client.applyTopicGraphReviewAction" => review_topic_graph(apps, args),
        _ => Err("unknown_operation".into()),
    }
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

fn one_object(args: &[Value], allowed: &[&str]) -> Result<Map<String, Value>, String> {
    let [value] = args else {
        return Err("invalid_request".into());
    };
    let object = value
        .as_object()
        .ok_or_else(|| "invalid_request".to_owned())?;
    if object.keys().any(|key| !allowed.contains(&key.as_str())) {
        return Err("invalid_request".into());
    }
    Ok(object.clone())
}

fn no_args(args: &[Value]) -> Result<(), String> {
    if args.is_empty() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn bounded_text(value: &Value) -> Result<String, String> {
    let value = value
        .as_str()
        .ok_or_else(|| "invalid_request".to_owned())?
        .trim();
    if value.is_empty() || value.len() > MAX_TEXT_BYTES || value.chars().any(char::is_control) {
        return Err("invalid_request".into());
    }
    Ok(value.split_whitespace().collect::<Vec<_>>().join(" "))
}

fn required(object: &Map<String, Value>, name: &str) -> Result<String, String> {
    object
        .get(name)
        .ok_or_else(|| "invalid_request".to_owned())
        .and_then(bounded_text)
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

fn query_labels(args: &[Value]) -> Result<(Vec<String>, usize), String> {
    let request = match args {
        [] => Map::new(),
        [value] => value
            .as_object()
            .cloned()
            .ok_or_else(|| "invalid_request".to_owned())?,
        _ => return Err("invalid_request".into()),
    };
    const FIELDS: &[&str] = &[
        "concept_candidate_labels",
        "conceptCandidateLabels",
        "labels",
        "aliases",
        "label",
        "query",
        "limit",
    ];
    if request.keys().any(|key| !FIELDS.contains(&key.as_str())) {
        return Err("invalid_request".into());
    }
    let limit = match request.get("limit") {
        None => 50,
        Some(Value::Number(value)) => value
            .as_u64()
            .filter(|value| *value > 0 && *value <= MAX_QUERY_LABELS as u64)
            .ok_or_else(|| "invalid_request".to_owned())?
            as usize,
        _ => return Err("invalid_request".into()),
    };
    let mut labels = BTreeSet::new();
    for key in [
        "concept_candidate_labels",
        "conceptCandidateLabels",
        "labels",
        "aliases",
    ] {
        if let Some(value) = request.get(key) {
            let values = value
                .as_array()
                .ok_or_else(|| "invalid_request".to_owned())?;
            for value in values {
                labels.insert(bounded_text(value)?);
            }
        }
    }
    for key in ["label", "query"] {
        if let Some(value) = request.get(key) {
            labels.insert(bounded_text(value)?);
        }
    }
    let total = labels.len();
    Ok((labels.into_iter().take(limit).collect(), total))
}

fn query(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let (labels, total) = query_labels(args)?;
    let truncated = total > labels.len();
    match apps.concepts.query(&json!({"labels":labels})) {
        Ok(result) => Ok(json!({
            "ok": true,
            "labels": labels,
            "matches": result.get("matches").cloned().unwrap_or_else(|| Value::Array(Vec::new())),
            "truncated": truncated,
            "limits": {"limit": total, "maxLimit": MAX_QUERY_LABELS, "total": total},
            "diagnostics": [{"code":"bounded_read_only","details":{"requested":total}}],
        })),
        Err(code) if code == "concept_kb_index_stale" || code == "concept_kb_index_invalid" => {
            Ok(json!({
                "ok": true,
                "labels": labels,
                "matches": labels.iter().map(|label| json!({"label":label,"exactConceptIds":[],"aliasMatches":[],"senseIds":[],"ambiguous":false})).collect::<Vec<_>>(),
            "truncated": truncated,
                "limits": {"limit": total, "maxLimit": MAX_QUERY_LABELS, "total": total},
                "diagnostics": [{"code":"concept_kb_index_unavailable"},{"code":"bounded_read_only","details":{"requested":total}}],
            }))
        }
        Err(code) => Err(code),
    }
}

fn update_display_text(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args, &["conceptId", "fields"])?;
    let concept_id = required(&request, "conceptId")?;
    let fields = request
        .get("fields")
        .and_then(Value::as_object)
        .ok_or_else(|| "invalid_request".to_owned())?;
    if fields.is_empty()
        || fields.keys().any(|key| {
            ![
                "short_definition",
                "shortDefinition",
                "definition",
                "usage_note",
                "usageNote",
                "editorial_note",
                "editorialNote",
            ]
            .contains(&key.as_str())
        })
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
    let text = |snake: &str, camel: &str, fallback: &str| -> Result<String, String> {
        fields
            .get(snake)
            .or_else(|| fields.get(camel))
            .map(bounded_text)
            .transpose()
            .map(|value| value.unwrap_or_else(|| fallback.to_owned()))
    };
    wire(
        apps.concepts
            .update_display_text(&ConceptDisplayUpdateRequest {
                expected_manifest_hash: concept_basis(apps)?,
                concept_id,
                label: current.label,
                short_definition: text(
                    "short_definition",
                    "shortDefinition",
                    &current.short_definition,
                )?,
                definition: text("definition", "definition", &current.definition)?,
                usage_note: text("usage_note", "usageNote", &current.usage_note)?,
                editorial_note: text("editorial_note", "editorialNote", &current.editorial_note)?,
            }),
    )
}

fn review_concept(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args, &["reviewId", "action", "targetConceptId"])?;
    let action = match required(&request, "action")?.as_str() {
        "approve_create" => ConceptReviewAction::Approve,
        "merge_into_existing" => ConceptReviewAction::Merge,
        "reject" => ConceptReviewAction::Reject,
        _ => return Err("invalid_request".into()),
    };
    let target = request
        .get("targetConceptId")
        .map(bounded_text)
        .transpose()?;
    if (matches!(action, ConceptReviewAction::Merge)) != target.is_some() {
        return Err("invalid_request".into());
    }
    wire(apps.concepts.review(&ConceptReviewRequest {
        expected_manifest_hash: concept_basis(apps)?,
        review_id: required(&request, "reviewId")?,
        action,
        target_concept_id: target,
    }))
}

fn delete_concepts(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args, &["conceptIds"])?;
    let ids = request
        .get("conceptIds")
        .and_then(Value::as_array)
        .ok_or_else(|| "invalid_request".to_owned())?;
    let ids = ids
        .iter()
        .map(bounded_text)
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
    let request = one_object(args, &["edgeId"])?;
    wire(
        apps.topic_graph
            .decide_relation(&TopicGraphRelationDecisionRequest {
                expected_manifest_hash: topic_graph_basis(apps)?,
                edge_id: required(&request, "edgeId")?,
                status,
            }),
    )
}

fn review_topic_graph(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args, &["reviewId", "action"])?;
    let action = match required(&request, "action")?.as_str() {
        "approve_suggested" => TopicGraphReviewAction::ApproveSuggested,
        "reject" => TopicGraphReviewAction::Reject,
        _ => return Err("invalid_request".into()),
    };
    wire(apps.topic_graph.review(&TopicGraphReviewRequest {
        expected_manifest_hash: topic_graph_basis(apps)?,
        review_id: required(&request, "reviewId")?,
        action,
    }))
}
