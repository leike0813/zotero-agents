use serde::Deserialize;
use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use synthesis_application::reference_matching::{ReferenceReviewAction, ReferenceReviewDecision};
use synthesis_application::{
    TopicDeleteRequest, TopicDetailRequest, TopicDetailResult, TopicListRequest, TopicListResult,
    TopicRecord,
};
use synthesis_repository::{
    DeletedTopicArtifactRecord, TagStagedSuggestionRecord, TagVocabularyReplacement,
};

use crate::runtime_artifact_library_debug;
use crate::runtime_host_collection::{ReferenceHostItem, collect_host_items};
use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::{
    checkpoint_before_promotion, current_operation_id,
};
use crate::runtime_reference_canonical::{
    CanonicalArchiveRequest, CanonicalMergeBatchRequest, CanonicalMetadataUpdateRequest,
    CanonicalRevisionReviewRequest, EffectiveCanonicalMergeRequest,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RelatedItemsEchoRequest {
    library_id: i64,
    item_key: String,
    #[serde(default)]
    related_item_key: Option<String>,
}

fn wire<T: serde::Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|_| "production_projection_invalid".into())
}

fn one<T: DeserializeOwned>(args: &[Value]) -> Result<T, String> {
    match args {
        [value] => serde_json::from_value(value.clone()).map_err(|_| "invalid_request".into()),
        _ => Err("invalid_request".into()),
    }
}

fn optional_one<T: DeserializeOwned + Default>(args: &[Value]) -> Result<T, String> {
    match args {
        [] => Ok(T::default()),
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

fn promotion_checkpoint(apps: &ProductionApplications) -> Result<(), String> {
    let Some(operation_id) = current_operation_id() else {
        return Ok(());
    };
    checkpoint_before_promotion(apps, &operation_id, &synthesis_protocol::utc_now_iso8601())
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
    })
}

fn deleted_topic_record_wire(record: DeletedTopicArtifactRecord) -> Value {
    json!({
        "topic_id":record.topic_id,
        "path_id":record.path_id,
        "deleted_path_id":record.deleted_path_id,
        "title":record.title,
        "manifest_hash":record.manifest_hash,
        "artifact_hash":record.artifact_hash,
        "metadata_hash":record.metadata_hash,
        "bundle_hash":record.bundle_hash,
        "updated_at":record.updated_at,
        "deleted_at":record.deleted_at,
    })
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

fn topic_detail_wire(result: TopicDetailResult) -> Value {
    match result {
        TopicDetailResult::Absent {
            topic_id,
            diagnostics,
        }
        | TopicDetailResult::Invalid {
            topic_id,
            diagnostics,
        } => json!({
            "ok":false,
            "status":"unavailable",
            "topicId":topic_id,
            "title":"",
            "source_papers":[],
            "diagnostics":diagnostics,
        }),
        TopicDetailResult::Ready {
            topic_id,
            topic,
            snapshot,
        } => {
            let artifact = snapshot.artifact;
            let metadata = snapshot.metadata;
            let topic_section = artifact
                .get("topic")
                .cloned()
                .unwrap_or_else(|| topic.topic_definition.clone());
            let source_papers = artifact
                .get("source_papers")
                .and_then(Value::as_array)
                .cloned()
                .or_else(|| {
                    topic
                        .resolved_paper_set
                        .get("papers")
                        .and_then(Value::as_array)
                        .cloned()
                })
                .unwrap_or_default();
            let title = topic_section
                .get("title")
                .and_then(Value::as_str)
                .filter(|value| !value.trim().is_empty())
                .unwrap_or(&topic.title);
            json!({
                "ok":true,
                "status":"ready",
                "topicId":topic_id,
                "title":title,
                "language":topic.language,
                "updated_at":topic.updated_at,
                "artifact_hash":topic.artifact_hash,
                "paper_count":source_papers.len(),
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
                "manifest":snapshot.manifest,
                "metadata":metadata,
                "pathId":snapshot.path_id,
            })
        }
    }
}

fn list_all_topics(apps: &ProductionApplications) -> Result<TopicListResult, String> {
    let mut cursor = String::new();
    let mut topics = Vec::new();
    for _ in 0..1_000 {
        let page = apps.topics.list(TopicListRequest { cursor, limit: 100 })?;
        topics.extend(page.topics);
        if !page.has_more {
            let returned = topics.len();
            return Ok(TopicListResult {
                topics,
                cursor: String::new(),
                next_cursor: String::new(),
                has_more: false,
                returned,
                total: page.total,
                limit: returned.max(1),
            });
        }
        cursor = page.next_cursor;
        if cursor.is_empty() {
            return Err("topic_page_invalid".into());
        }
    }
    Err("topic_limit_exceeded".into())
}

fn contains_exact_string(value: &Value, expected: &str) -> bool {
    match value {
        Value::String(value) => value == expected,
        Value::Array(values) => values
            .iter()
            .any(|value| contains_exact_string(value, expected)),
        Value::Object(object) => object
            .values()
            .any(|value| contains_exact_string(value, expected)),
        _ => false,
    }
}

fn find_topics_by_paper_ref(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    let request: Value = optional_one(args)?;
    let mut paper_refs = Vec::new();
    for field in ["paper_refs", "paperRefs", "paper_ref", "paperRef"] {
        match request.get(field) {
            Some(Value::String(value)) if !value.is_empty() => paper_refs.push(value.clone()),
            Some(Value::Array(values)) => paper_refs.extend(
                values
                    .iter()
                    .filter_map(Value::as_str)
                    .filter(|value| !value.is_empty())
                    .map(str::to_owned),
            ),
            _ => {}
        }
    }
    paper_refs.sort();
    paper_refs.dedup();
    if paper_refs.is_empty() || paper_refs.len() > 100 {
        return Ok(json!({
            "ok":false,
            "status":"invalid_request",
            "paper_refs":paper_refs,
            "topics":[],
            "diagnostics":{
                "requested_count":paper_refs.len(),
                "matched_topic_count":0,
                "unmatched_paper_refs":paper_refs,
                "source":"artifact_state",
                "errors":["paper_ref or paper_refs is required"],
            },
        }));
    }
    let mut matched_refs = std::collections::BTreeSet::new();
    let topics = list_all_topics(apps)?
        .topics
        .into_iter()
        .filter_map(|topic| {
            let matched = paper_refs
                .iter()
                .filter(|paper_ref| contains_exact_string(&topic.resolved_paper_set, paper_ref))
                .cloned()
                .collect::<Vec<_>>();
            if matched.is_empty() {
                return None;
            }
            matched_refs.extend(matched.iter().cloned());
            Some(json!({
                "topic_id":topic.topic_id,
                "title":topic.title,
                "status":topic.operation,
                "updated_at":topic.updated_at,
                "matched_paper_refs":matched,
                "match_sources":["current_dependencies"],
                "freshness":topic.projection.get("freshness").cloned().unwrap_or(Value::Null),
                "source_materials_status":topic.projection
                    .get("source_materials_status")
                    .cloned()
                    .unwrap_or(Value::Null),
            }))
        })
        .collect::<Vec<_>>();
    let unmatched = paper_refs
        .iter()
        .filter(|paper_ref| !matched_refs.contains(*paper_ref))
        .cloned()
        .collect::<Vec<_>>();
    Ok(json!({
        "ok":true,
        "status":"ok",
        "paper_refs":paper_refs,
        "topics":topics,
        "diagnostics":{
            "requested_count":paper_refs.len(),
            "matched_topic_count":topics.len(),
            "unmatched_paper_refs":unmatched,
            "source":"artifact_state",
        },
    }))
}

fn workflow_topic_options(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: Value = optional_one(args)?;
    let filter = request
        .get("filter")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_lowercase();
    let topics = list_all_topics(apps)?;
    let options = topics
        .topics
        .into_iter()
        .filter(|topic| {
            filter.is_empty()
                || topic.title.to_lowercase().contains(&filter)
                || topic.topic_id.to_lowercase().contains(&filter)
        })
        .map(|topic| {
            json!({
                "value":topic.topic_id,
                "label":topic.title,
                "description":topic.definition,
                "meta":{"kind":"topic","pathId":topic.path_id},
            })
        })
        .collect::<Vec<_>>();
    Ok(json!({"options":options,"diagnostics":[]}))
}

fn object_arg(args: &[Value]) -> Result<Value, String> {
    let value = one::<Value>(args)?;
    if value.is_object() {
        Ok(value)
    } else {
        Err("invalid_request".into())
    }
}

fn string_field<'a>(value: &'a Value, names: &[&str]) -> Result<&'a str, String> {
    names
        .iter()
        .find_map(|name| value.get(*name).and_then(Value::as_str))
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "invalid_request".to_owned())
}

fn optional_string_field<'a>(value: &'a Value, names: &[&str]) -> Option<&'a str> {
    names
        .iter()
        .find_map(|name| value.get(*name).and_then(Value::as_str))
        .filter(|value| !value.is_empty())
}

fn topic_detail_request(args: &[Value]) -> Result<String, String> {
    let request = object_arg(args)?;
    Ok(string_field(&request, &["topicId", "topic_id"])?.to_owned())
}

fn topic_detail(
    apps: &ProductionApplications,
    topic_id: String,
) -> Result<TopicDetailResult, String> {
    apps.topics.detail(TopicDetailRequest { topic_id })
}

fn topic_context_from_compat(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    let request = object_arg(args)?;
    let topic_id = string_field(&request, &["topicId", "topic_id"])?;
    let view = optional_string_field(&request, &["view"]);
    match topic_detail(apps, topic_id.to_owned())? {
        TopicDetailResult::Absent { diagnostics, .. } => Ok(json!({
            "schema_id":"synthesis.topic_context",
            "schema_version":"2.0.0",
            "topic_id":topic_id,
            "status":"not_found",
            "diagnostics":diagnostics,
        })),
        TopicDetailResult::Invalid { diagnostics, .. } => Ok(json!({
            "schema_id":"synthesis.topic_context",
            "schema_version":"2.0.0",
            "topic_id":topic_id,
            "status":"invalid",
            "diagnostics":diagnostics,
        })),
        TopicDetailResult::Ready {
            topic, snapshot, ..
        } => {
            let digest = json!({
                "topic_id":topic.topic_id,
                "title":topic.title,
                "definition":topic.definition,
                "language":topic.language,
                "markdown":snapshot.markdown,
            });
            let semantic = json!({
                "topic_definition":topic.topic_definition,
                "topic_resolver":topic.topic_resolver,
                "resolved_paper_set":topic.resolved_paper_set,
            });
            let audit = json!({
                "manifest":snapshot.manifest,
                "metadata":snapshot.metadata,
                "artifact":snapshot.artifact,
                "projection":topic.projection,
            });
            let mut response = json!({
                "schema_id":"synthesis.topic_context",
                "schema_version":"2.0.0",
                "topic_id":topic_id,
            });
            let response = response
                .as_object_mut()
                .ok_or_else(|| "production_projection_invalid".to_owned())?;
            match view {
                Some("digest") => {
                    response.insert("digest".into(), digest);
                    Ok(Value::Object(response.clone()))
                }
                Some("semantic") => {
                    response.insert("semantic".into(), semantic);
                    Ok(Value::Object(response.clone()))
                }
                Some("audit") => {
                    response.insert("audit".into(), audit);
                    Ok(Value::Object(response.clone()))
                }
                Some("full") | None => {
                    response.insert("digest".into(), digest);
                    response.insert("semantic".into(), semantic);
                    response.insert("audit".into(), audit);
                    Ok(Value::Object(response.clone()))
                }
                Some(_) => Err("invalid_request".into()),
            }
        }
    }
}

fn topic_report_from_compat(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    let topic_id = topic_detail_request(args)?;
    match topic_detail(apps, topic_id.clone())? {
        TopicDetailResult::Absent { .. } | TopicDetailResult::Invalid { .. } => Ok(json!({
            "ok":false,
            "status":"not_found",
            "topic_id":topic_id,
            "format":"markdown",
            "markdown":"",
            "diagnostics":["topic_report_unavailable"],
        })),
        TopicDetailResult::Ready {
            topic, snapshot, ..
        } => {
            let artifact = snapshot.artifact.as_object();
            let report = artifact
                .and_then(|value| {
                    value
                        .get("synthesis_report")
                        .or_else(|| value.get("synthesisReport"))
                })
                .and_then(Value::as_object);
            let markdown = report
                .and_then(|value| value.get("body").or_else(|| value.get("markdown")))
                .and_then(Value::as_str)
                .or_else(|| snapshot.markdown.get("report").map(String::as_str))
                .or_else(|| snapshot.markdown.values().next().map(String::as_str))
                .unwrap_or_default();
            Ok(json!({
                "ok":!markdown.is_empty(),
                "status":if markdown.is_empty() { "unavailable" } else { "available" },
                "topic_id":topic.topic_id,
                "title":report.and_then(|value| value.get("title")).and_then(Value::as_str).unwrap_or(&topic.title),
                "format":"markdown",
                "markdown":markdown,
                "metadata":{
                    "language":topic.language,
                    "updated_at":topic.updated_at,
                    "artifact_hash":topic.artifact_hash,
                    "manifest_hash":topic.manifest_hash,
                    "metadata_hash":topic.metadata_hash,
                },
                "diagnostics":if markdown.is_empty() { json!(["synthesis_report_body_unavailable"]) } else { json!([]) },
            }))
        }
    }
}

fn resolver_string_values(value: &Value, array_only: bool) -> Option<Vec<String>> {
    let values = match value {
        Value::String(value) if !array_only => vec![value.trim().to_owned()],
        Value::Array(values) => values
            .iter()
            .map(|value| value.as_str().map(str::trim).map(str::to_owned))
            .collect::<Option<Vec<_>>>()?,
        _ => return None,
    };
    (!values.is_empty() && values.iter().all(|value| !value.is_empty())).then_some(values)
}

fn valid_tag_query(value: &Value) -> bool {
    match value {
        Value::String(_) | Value::Array(_) => resolver_string_values(value, false).is_some(),
        Value::Object(object) => {
            !object.is_empty()
                && object
                    .keys()
                    .all(|key| matches!(key.as_str(), "and" | "or" | "not"))
                && object
                    .values()
                    .all(|value| resolver_string_values(value, false).is_some())
        }
        _ => false,
    }
}

fn resolver_errors(request: &serde_json::Map<String, Value>) -> Vec<&'static str> {
    let mut errors = Vec::new();
    if request.keys().any(|key| {
        !matches!(
            key.as_str(),
            "tag" | "collection_key" | "paper_refs" | "combine" | "limit" | "cursor"
        )
    }) {
        errors.push("resolver payload contains unsupported fields");
    }
    if !["tag", "collection_key", "paper_refs"]
        .iter()
        .any(|key| request.contains_key(*key))
    {
        errors.push("resolver requires a selector");
    }
    if request
        .get("tag")
        .is_some_and(|value| !valid_tag_query(value))
    {
        errors.push("resolver tag is invalid");
    }
    if request
        .get("collection_key")
        .is_some_and(|value| resolver_string_values(value, false).is_none())
    {
        errors.push("resolver collection_key is invalid");
    }
    if request
        .get("paper_refs")
        .is_some_and(|value| resolver_string_values(value, true).is_none())
    {
        errors.push("resolver paper_refs must be an array");
    }
    if request
        .get("combine")
        .is_some_and(|value| !matches!(value.as_str(), Some("union" | "intersection")))
    {
        errors.push("resolver combine is invalid");
    }
    errors
}

fn tag_query_matches(item: &ReferenceHostItem, query: &Value) -> bool {
    let tags = item
        .tags
        .iter()
        .map(|value| value.to_lowercase())
        .collect::<std::collections::HashSet<_>>();
    let contains = |value: &str| tags.contains(&value.to_lowercase());
    match query {
        Value::String(value) => contains(value),
        Value::Array(_) => resolver_string_values(query, false)
            .is_some_and(|values| values.iter().all(|value| contains(value))),
        Value::Object(object) => {
            let values = |key: &str| {
                object
                    .get(key)
                    .and_then(|value| resolver_string_values(value, false))
                    .unwrap_or_default()
            };
            let and_values = values("and");
            let or_values = values("or");
            let not_values = values("not");
            and_values.iter().all(|value| contains(value))
                && (or_values.is_empty() || or_values.iter().any(|value| contains(value)))
                && !not_values.iter().any(|value| contains(value))
        }
        _ => false,
    }
}

fn resolver_page_number(
    value: Option<&Value>,
    default: usize,
    max: usize,
) -> Result<usize, String> {
    let Some(value) = value else {
        return Ok(default);
    };
    let number = match value {
        Value::Number(value) => value.as_u64().and_then(|value| usize::try_from(value).ok()),
        Value::String(value) => value.parse::<usize>().ok(),
        _ => None,
    }
    .ok_or_else(|| "invalid_request".to_owned())?;
    if number > max || (max != usize::MAX && number == 0) {
        return Err("invalid_request".into());
    }
    Ok(number)
}

fn resolver_response_from_items(
    items: &[ReferenceHostItem],
    request: &Value,
) -> Result<Value, String> {
    let request = request
        .as_object()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let errors = resolver_errors(request);
    if !errors.is_empty() {
        return Ok(json!({
            "ok":false,
            "errors":errors,
            "papers":[],
            "normalized_resolver":Value::Null,
            "diagnostics":{"final_count":0,"total_candidates":items.len(),"rejected":true},
        }));
    }
    let combine = request
        .get("combine")
        .and_then(Value::as_str)
        .unwrap_or("union");
    let selector_count = ["tag", "collection_key", "paper_refs"]
        .iter()
        .filter(|key| request.contains_key(**key))
        .count();
    let collections = request
        .get("collection_key")
        .and_then(|value| resolver_string_values(value, false))
        .unwrap_or_default()
        .into_iter()
        .map(|value| value.to_lowercase())
        .collect::<std::collections::HashSet<_>>();
    let paper_refs = request
        .get("paper_refs")
        .and_then(|value| resolver_string_values(value, true))
        .unwrap_or_default()
        .into_iter()
        .collect::<std::collections::HashSet<_>>();
    let mut papers = items
        .iter()
        .filter_map(|item| {
            let mut reasons = Vec::new();
            if request
                .get("tag")
                .is_some_and(|query| tag_query_matches(item, query))
            {
                reasons.push("tag");
            }
            if request.contains_key("collection_key")
                && item
                    .collections
                    .iter()
                    .any(|value| collections.contains(&value.to_lowercase()))
            {
                reasons.push("collection_key");
            }
            if request.contains_key("paper_refs") && paper_refs.contains(&item.paper_ref) {
                reasons.push("paper_refs");
            }
            let matched = if combine == "intersection" {
                reasons.len() == selector_count
            } else {
                !reasons.is_empty()
            };
            matched.then(|| {
                reasons.sort_unstable();
                json!({
                    "paper_ref":item.paper_ref,
                    "item_key":item.item_key,
                    "title":item.title,
                    "year":item.year,
                    "match_reasons":reasons,
                })
            })
        })
        .collect::<Vec<_>>();
    papers.sort_by(|left, right| left["paper_ref"].as_str().cmp(&right["paper_ref"].as_str()));
    let total = papers.len();
    let cursor = resolver_page_number(request.get("cursor"), 0, usize::MAX)?;
    let limit = resolver_page_number(request.get("limit"), 100, 250)?;
    if cursor > total {
        return Err("invalid_request".into());
    }
    let end = total.min(cursor.saturating_add(limit));
    let page = papers[cursor..end].to_vec();
    let has_more = end < total;
    Ok(json!({
        "ok":total > 0,
        "errors":if total == 0 { json!(["resolver matched no papers"]) } else { json!([]) },
        "papers":page,
        "normalized_resolver":Value::Object(request.clone()),
        "cursor":cursor.to_string(),
        "next_cursor":if has_more { end.to_string() } else { String::new() },
        "has_more":has_more,
        "returned":end-cursor,
        "total":total,
        "limit":limit,
        "diagnostics":{"final_count":total,"total_candidates":items.len(),"rejected":false},
    }))
}

fn resolver_from_compat(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = object_arg(args)?;
    let items = collect_host_items(apps.host_items.as_ref())?;
    resolver_response_from_items(&items, &request)
}

fn digest_resolution_from_compat(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    let request = object_arg(args)?;
    let paper_ref = optional_string_field(&request, &["paper_ref", "paperRef"]).unwrap_or_default();
    let Some(locator) = request.get("locator") else {
        return Ok(json!({
            "ok":false,
            "status":"unavailable",
            "paper_ref":paper_ref,
            "digest_markdown":"",
            "recorded_hash":"",
            "current_hash":"",
            "source_changed":false,
            "diagnostics":["digest_unavailable"],
        }));
    };
    let expected_hash = request
        .get("expectedHash")
        .or_else(|| request.get("expected_hash"))
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "invalid_request".to_owned())?;
    let result = apps.call_host(
        "library.artifacts.read",
        json!({"locator":locator,"expectedHash":expected_hash}),
    )?;
    let markdown = result
        .get("text")
        .or_else(|| result.get("markdown"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    Ok(json!({
        "ok":!markdown.is_empty(),
        "status":if markdown.is_empty() { "unavailable" } else { "available" },
        "paper_ref":paper_ref,
        "digest_markdown":markdown,
        "recorded_hash":"",
        "current_hash":expected_hash,
        "source_changed":false,
        "diagnostics":result.get("diagnostics").cloned().unwrap_or_else(|| json!([])),
    }))
}

fn workbench_surface_from_compat(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    let [surface, state] = args else {
        return Err("invalid_request".into());
    };
    let surface = surface
        .as_str()
        .ok_or_else(|| "invalid_request".to_owned())?;
    if !matches!(
        surface,
        "home" | "topics" | "index" | "review" | "graph" | "tags" | "concepts" | "reader"
    ) || !state.is_object()
    {
        return Err("invalid_request".into());
    }
    if surface == "index" {
        return apps
            .reference_canonical
            .workbench_index(state, apps.library_id());
    }
    if surface == "graph" {
        return crate::runtime_citation_graph_read_surface::workbench_graph_surface(apps, state);
    }
    let library_id = apps.library_id();
    let topic_projection = || -> Result<Value, String> {
        let page = apps.topics.list(TopicListRequest::default())?;
        let (deleted, deleted_total) = apps.topics.list_deleted(0, 250)?;
        Ok(json!({
            "libraryId":library_id,
            "deletedArtifacts":{
                "rows":deleted.into_iter().map(deleted_topic_record_wire).collect::<Vec<_>>(),
                "total":deleted_total,
            },
            "artifacts":page.topics.into_iter().map(topic_record_wire).collect::<Vec<_>>(),
            "topicPage":{
                "cursor":page.cursor,
                "next_cursor":page.next_cursor,
                "has_more":page.has_more,
                "returned":page.returned,
                "total":page.total,
                "limit":page.limit,
            },
            "topicGraph":wire(apps.topic_graph.load()?)?,
        }))
    };
    match surface {
        "topics" => topic_projection(),
        "tags" => Ok(json!({
            "libraryId":library_id,
            "tags":crate::runtime_tag_surface::dispatch(
                apps,
                "client.loadTagVocabulary",
                &[],
            )?,
        })),
        "concepts" => Ok(json!({
            "libraryId":library_id,
            "concepts":wire(apps.concepts.load()?)?,
        })),
        "review" => {
            let concepts = wire(apps.concepts.load()?)?;
            let topic_graph = wire(apps.topic_graph.load()?)?;
            Ok(json!({
                "libraryId":library_id,
                "reviews":{
                    "reference":apps.reference_canonical.review_input(state)?,
                    "concept":concepts.get("reviews").cloned().unwrap_or_else(|| json!([])),
                    "topicGraph":topic_graph.get("reviews").cloned().unwrap_or_else(|| json!([])),
                },
            }))
        }
        "reader" => {
            let topic_id = state
                .get("reader")
                .and_then(Value::as_object)
                .and_then(|reader| reader.get("topicId").or_else(|| reader.get("topic_id")))
                .and_then(Value::as_str)
                .filter(|value| !value.trim().is_empty());
            let reader = match topic_id {
                Some(topic_id) => topic_detail_wire(apps.topics.detail(TopicDetailRequest {
                    topic_id: topic_id.to_owned(),
                })?),
                None => json!({
                    "ok":false,
                    "status":"unavailable",
                    "topicId":"",
                    "title":"",
                    "source_papers":[],
                    "diagnostics":["reader_topic_unselected"],
                }),
            };
            Ok(json!({"libraryId":library_id,"reader":reader}))
        }
        "home" => {
            let mut projection = topic_projection()?;
            let projection = projection
                .as_object_mut()
                .ok_or_else(|| "production_projection_invalid".to_owned())?;
            projection.insert("concepts".into(), wire(apps.concepts.load()?)?);
            projection.insert(
                "graph".into(),
                crate::runtime_citation_graph_read_surface::workbench_graph_surface(apps, state)?
                    .get("graph")
                    .cloned()
                    .unwrap_or(Value::Null),
            );
            Ok(Value::Object(projection.clone()))
        }
        _ => Err("invalid_request".into()),
    }
}

fn workbench_chrome_from_compat(apps: &ProductionApplications) -> Result<Value, String> {
    let chrome = apps.workbench.read()?;
    let reference = chrome
        .maintenance
        .cache_readiness
        .iter()
        .find(|cache| cache.cache_key == "reference-sidecar:library");
    let citation = chrome
        .maintenance
        .cache_readiness
        .iter()
        .find(|cache| cache.cache_key == "citation-graph:library");
    let caches = [reference, citation];
    let missing = caches
        .iter()
        .flatten()
        .filter(|cache| cache.status == "missing")
        .map(|cache| cache.cache_key.clone())
        .collect::<Vec<_>>();
    let stale = caches
        .iter()
        .flatten()
        .filter(|cache| cache.status == "stale")
        .map(|cache| cache.cache_key.clone())
        .collect::<Vec<_>>();
    let failed = caches
        .iter()
        .flatten()
        .filter(|cache| cache.status == "failed")
        .map(|cache| cache.cache_key.clone())
        .collect::<Vec<_>>();
    let active_jobs = chrome
        .maintenance
        .background_jobs
        .iter()
        .filter(|job| job.status != "failed")
        .collect::<Vec<_>>();
    let partial = if missing.len() == 1 {
        missing.clone()
    } else {
        Vec::new()
    };
    let status = if !active_jobs.is_empty() {
        "running"
    } else if !failed.is_empty() {
        "failed"
    } else if missing.len() > 1 {
        "missing"
    } else if !partial.is_empty() {
        "partial"
    } else if !stale.is_empty() {
        "stale"
    } else {
        "ready"
    };
    let mut recommended_commands = Vec::new();
    if reference
        .is_some_and(|cache| matches!(cache.status.as_str(), "missing" | "stale" | "failed"))
    {
        recommended_commands.push("refreshReferenceSidecarNow");
    }
    if citation.is_some_and(|cache| matches!(cache.status.as_str(), "missing" | "stale" | "failed"))
    {
        recommended_commands.push("rebuildCitationGraphCache");
    }
    let latest_reference = reference
        .map(|cache| {
            if cache.refreshed_at.is_empty() {
                cache.updated_at.as_str()
            } else {
                cache.refreshed_at.as_str()
            }
        })
        .filter(|value| !value.is_empty());
    let latest_citation = citation
        .map(|cache| {
            if cache.refreshed_at.is_empty() {
                cache.updated_at.as_str()
            } else {
                cache.refreshed_at.as_str()
            }
        })
        .filter(|value| !value.is_empty());
    Ok(json!({
        "maintenance":{
            "summary":{
                "status":status,
                "latestUsable":{
                    "referenceSidecar":latest_reference.map(|updated_at|json!({"updated_at":updated_at})),
                    "citationGraph":latest_citation.map(|updated_at|json!({"updated_at":updated_at})),
                },
                "pendingDirtyCount":0,
                "activeWorkerCount":active_jobs.len(),
                "activeWorkerKind":active_jobs.first().map(|job|job.source.as_str()),
                "canonicalSyncPending":false,
                "canonicalEpoch":0,
                "stale":stale,
                "partial":partial,
                "missing":missing,
                "recommendedCommands":recommended_commands,
                "diagnostics":[],
            },
            "backgroundJobs":chrome.maintenance.background_jobs,
        },
    }))
}

#[allow(dead_code)]
fn tag_candidate_request(
    args: &[Value],
) -> Result<(Option<String>, TagVocabularyReplacement), String> {
    match args {
        [candidate] => {
            let expected = optional_string_field(
                candidate,
                &["expectedVocabularyHash", "expected_vocabulary_hash"],
            )
            .map(str::to_owned);
            let candidate = candidate
                .get("candidate")
                .or_else(|| candidate.get("replacement"))
                .cloned()
                .unwrap_or_else(|| candidate.clone());
            serde_json::from_value(candidate)
                .map(|candidate| (expected, candidate))
                .map_err(|_| "invalid_request".into())
        }
        [expected, candidate] => {
            let expected = expected.as_str().map(str::to_owned);
            serde_json::from_value(candidate.clone())
                .map(|candidate| (expected, candidate))
                .map_err(|_| "invalid_request".into())
        }
        _ => Err("invalid_request".into()),
    }
}

#[allow(dead_code)]
fn staged_request(args: &[Value]) -> Result<(i64, Vec<TagStagedSuggestionRecord>), String> {
    match args {
        [request] => {
            let revision = request
                .get("expectedRevision")
                .or_else(|| request.get("expected_revision"))
                .and_then(Value::as_i64)
                .ok_or_else(|| "invalid_request".to_owned())?;
            let staged = request
                .get("staged")
                .or_else(|| request.get("suggestions"))
                .or_else(|| request.get("retained"))
                .cloned()
                .ok_or_else(|| "invalid_request".to_owned())?;
            serde_json::from_value(staged)
                .map(|staged| (revision, staged))
                .map_err(|_| "invalid_request".into())
        }
        [revision, staged] => {
            let revision = revision
                .as_i64()
                .ok_or_else(|| "invalid_request".to_owned())?;
            serde_json::from_value(staged.clone())
                .map(|staged| (revision, staged))
                .map_err(|_| "invalid_request".into())
        }
        _ => Err("invalid_request".into()),
    }
}

fn reference_review_decisions(args: &[Value]) -> Result<Vec<ReferenceReviewDecision>, String> {
    let decisions = match args {
        [Value::Array(decisions)] => decisions.clone(),
        [Value::Object(request)] if request.contains_key("decisions") => request
            .get("decisions")
            .and_then(Value::as_array)
            .cloned()
            .ok_or_else(|| "invalid_request".to_owned())?,
        [decision @ Value::Object(_)] => vec![decision.clone()],
        _ => return Err("invalid_request".into()),
    };
    if decisions.is_empty() || decisions.len() > 100 {
        return Err("invalid_request".into());
    }
    decisions
        .into_iter()
        .map(|decision| {
            let object = decision
                .as_object()
                .ok_or_else(|| "invalid_request".to_owned())?;
            if object
                .keys()
                .any(|key| !matches!(key.as_str(), "proposalId" | "action" | "target"))
            {
                return Err("invalid_request".into());
            }
            let proposal_id = object
                .get("proposalId")
                .and_then(Value::as_str)
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| "invalid_request".to_owned())?
                .trim()
                .to_owned();
            let action = object
                .get("action")
                .and_then(Value::as_str)
                .ok_or_else(|| "invalid_request".to_owned())?;
            let mut result = ReferenceReviewDecision {
                proposal_id,
                action: match action {
                    "accept" => ReferenceReviewAction::Accept,
                    "reverse_accept" => ReferenceReviewAction::Reverse,
                    "reject" => ReferenceReviewAction::Reject,
                    "reopen" => ReferenceReviewAction::Reopen,
                    "delete" => ReferenceReviewAction::Delete,
                    "manual_target" => ReferenceReviewAction::Retarget,
                    _ => return Err("invalid_request".into()),
                },
                target_canonical_reference_id: String::new(),
                target_library_id: 0,
                target_item_key: String::new(),
            };
            if action == "manual_target" {
                let target = object
                    .get("target")
                    .and_then(Value::as_object)
                    .ok_or_else(|| "invalid_request".to_owned())?;
                match target.get("kind").and_then(Value::as_str) {
                    Some("zotero_item") => {
                        if target
                            .keys()
                            .any(|key| !matches!(key.as_str(), "kind" | "libraryId" | "itemKey"))
                        {
                            return Err("invalid_request".into());
                        }
                        result.target_library_id = target
                            .get("libraryId")
                            .and_then(Value::as_i64)
                            .filter(|value| *value > 0)
                            .ok_or_else(|| "invalid_request".to_owned())?;
                        result.target_item_key = target
                            .get("itemKey")
                            .and_then(Value::as_str)
                            .filter(|value| !value.trim().is_empty())
                            .ok_or_else(|| "invalid_request".to_owned())?
                            .trim()
                            .to_owned();
                    }
                    Some("canonical_reference") => {
                        if target
                            .keys()
                            .any(|key| !matches!(key.as_str(), "kind" | "canonicalReferenceId"))
                        {
                            return Err("invalid_request".into());
                        }
                        result.target_canonical_reference_id = target
                            .get("canonicalReferenceId")
                            .and_then(Value::as_str)
                            .filter(|value| !value.trim().is_empty())
                            .ok_or_else(|| "invalid_request".to_owned())?
                            .trim()
                            .to_owned();
                    }
                    _ => return Err("invalid_request".into()),
                }
            } else if object.contains_key("target") {
                return Err("invalid_request".into());
            }
            Ok(result)
        })
        .collect()
}

#[allow(dead_code)]
fn tag_vocabulary_hash(apps: &ProductionApplications) -> Result<String, String> {
    apps.tags
        .inspect()?
        .vocabulary_hash
        .ok_or_else(|| "tag_vocabulary_not_initialized".to_owned())
}

type ProductionClientHandler = fn(&ProductionApplications, &[Value]) -> Result<Value, String>;

struct RegisteredProductionClientHandler {
    capability: &'static str,
    dispatch: ProductionClientHandler,
}

macro_rules! register_production_client_handlers {
    ($(($capability:literal, $handler:expr)),+ $(,)?) => {
        const PRODUCTION_CLIENT_HANDLERS: &[RegisteredProductionClientHandler] = &[
            $(RegisteredProductionClientHandler {
                capability: $capability,
                dispatch: $handler,
            }),+
        ];
    };
}

register_production_client_handlers!(
    ("client.listTopics", |apps, args| {
        apps.topics.list(optional_one(args)?).map(topic_list_wire)
    }),
    ("client.findTopicsByPaperRef", find_topics_by_paper_ref),
    ("client.readTopicDetail", |apps, args| {
        apps.topics
            .detail(one::<TopicDetailRequest>(args)?)
            .map(topic_detail_wire)
    }),
    ("client.listWorkflowTopicOptions", workflow_topic_options),
    ("client.getSynthesisWorkbenchChromeInput", |apps, args| {
        if !one::<Value>(args)?.is_object() {
            return Err("invalid_request".into());
        }
        workbench_chrome_from_compat(apps)
    }),
    ("client.getSynthesisWorkbenchSurfaceInput", |apps, args| {
        workbench_surface_from_compat(apps, args)
    }),
    ("client.getSynthesisBackgroundJobRows", |apps, args| {
        no_args(args)?;
        wire(apps.workbench.read()?.maintenance.background_jobs)
    }),
    ("client.getSchemas", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.getSchemas", args)
    }),
    ("client.getCitationGraphLayout", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.getCitationGraphLayout",
            args,
        )
    }),
    ("client.queryCitationGraph", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.queryCitationGraph",
            args,
        )
    }),
    ("client.queryCitationGraphCluster", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.queryCitationGraphCluster",
            args,
        )
    }),
    ("client.getReferenceSidecarIndex", |apps, args| {
        apps.reference_canonical
            .sidecar_index(&optional_one::<Value>(args)?)
    }),
    ("client.isBuiltinTagPolicyInitialized", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.isBuiltinTagPolicyInitialized", args)
    }),
    ("client.loadTagVocabulary", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.loadTagVocabulary", args)
    }),
    ("client.exportTagVocabularyForRegulator", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.exportTagVocabularyForRegulator", args)
    }),
    ("client.listStagedTagSuggestions", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.listStagedTagSuggestions", args)
    }),
    ("client.clearTagAuditRecord", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.clearTagAuditRecord", args)
    }),
    ("client.debugSynthesisSnapshot", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisSnapshot", args)
    }),
    ("client.debugSynthesisCacheList", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisCacheList", args)
    }),
    ("client.debugSynthesisOperationsList", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisOperationsList", args)
    }),
    ("client.debugSynthesisTopicInspect", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisTopicInspect", args)
    }),
    ("client.applyTopicSynthesisResult", |apps, args| {
        let request = one::<synthesis_application::TopicApplyRequest>(args)?;
        wire(apps.topics.apply(request))
    }),
    ("client.consumeRelatedItemsSyncEcho", |apps, args| {
        let request = one::<RelatedItemsEchoRequest>(args)?;
        apps.consume_related_items_sync_echo(
            request.library_id,
            &request.item_key,
            request.related_item_key.as_deref(),
        )
    }),
    ("client.readPaperArtifacts", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.readPaperArtifacts", args)
    }),
    ("client.getPaperArtifactManifest", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.getPaperArtifactManifest", args)
    }),
    ("client.exportFilteredPaperArtifacts", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.exportFilteredPaperArtifacts", args)
    }),
    ("client.getTopicContext", topic_context_from_compat),
    ("client.resolveResolver", resolver_from_compat),
    ("client.getTopicReport", topic_report_from_compat),
    (
        "client.resolveTopicPaperDigest",
        digest_resolution_from_compat
    ),
    ("client.applyLiteratureDigestSidecar", |apps, args| {
        apps.apply_literature_digest(one::<Value>(args)?)
    }),
    ("client.deleteTopicArtifact", |apps, args| {
        wire(apps.topics.delete(one::<TopicDeleteRequest>(args)?)?)
    }),
    ("client.purgeDeletedTopicArtifacts", |apps, args| {
        no_args(args)?;
        wire(apps.topics.purge_deleted()?)
    }),
    ("client.rejectTopicDiscoveryHint", |apps, args| {
        let request = object_arg(args)?;
        apps.update_topic_discovery_hint(string_field(&request, &["hintId"])?, "rejected")
    }),
    ("client.restoreTopicDiscoveryHint", |apps, args| {
        let request = object_arg(args)?;
        apps.update_topic_discovery_hint(string_field(&request, &["hintId"])?, "open")
    }),
    ("client.getCitationGraphSlice", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.getCitationGraphSlice",
            args,
        )
    }),
    ("client.getCitationGraphMetrics", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.getCitationGraphMetrics",
            args,
        )
    }),
    ("client.rankLibraryPapers", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(apps, "client.rankLibraryPapers", args)
    }),
    ("client.refreshCitationGraphMetricsNow", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.refreshCitationGraphMetricsNow",
            args,
        )
    }),
    ("client.startCitationGraphUpdate", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.startCitationGraphUpdate",
            args,
        )
    }),
    ("client.recomputeCitationGraphLayout", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.recomputeCitationGraphLayout",
            args,
        )
    }),
    ("client.rebuildCitationGraphCacheNow", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.rebuildCitationGraphCacheNow",
            args,
        )
    }),
    (
        "client.refreshCitationGraphCacheIncrementalNow",
        |apps, args| {
            crate::runtime_citation_graph_commands::dispatch(
                apps,
                "client.refreshCitationGraphCacheIncrementalNow",
                args,
            )
        }
    ),
    ("client.retryCitationGraphCacheRebuild", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.retryCitationGraphCacheRebuild",
            args,
        )
    }),
    ("client.rankExternalReferences", |apps, args| {
        apps.reference_canonical
            .rank_external_references(&optional_one::<Value>(args)?)
    }),
    ("client.getAttentionQueue", |apps, args| {
        apps.reference_canonical
            .attention_queue(&optional_one::<Value>(args)?)
    }),
    ("client.startReferenceSidecarRefresh", |apps, args| {
        let request = optional_one::<Value>(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .start_refresh_with_checkpoint(&request, &checkpoint)
    }),
    ("client.refreshReferenceSidecarNow", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .refresh_now_with_checkpoint(&checkpoint)
    }),
    ("client.retryReferenceSidecarRefresh", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .retry_refresh_with_checkpoint(&checkpoint)
    }),
    ("client.runAdvancedReferenceMatchingNow", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .run_advanced_matching_with_checkpoint(&checkpoint)
    }),
    ("client.retryAdvancedReferenceMatching", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .retry_advanced_matching_with_checkpoint(&checkpoint)
    }),
    ("client.applyCanonicalRevisionReviewAction", |apps, args| {
        apps.reference_canonical
            .apply_revision_review(one::<CanonicalRevisionReviewRequest>(args)?)
    }),
    ("client.applyReferenceMatchProposalAction", |apps, args| {
        apps.reference_canonical
            .apply_proposal_actions(&reference_review_decisions(args)?)
    }),
    ("client.applyReferenceMatchProposalActions", |apps, args| {
        apps.reference_canonical
            .apply_proposal_actions(&reference_review_decisions(args)?)
    }),
    ("client.mergeEffectiveCanonicalReference", |apps, args| {
        apps.reference_canonical
            .merge_canonical(one::<EffectiveCanonicalMergeRequest>(args)?)
    }),
    (
        "client.applyCanonicalRevisionMergeRequests",
        |apps, args| {
            apps.reference_canonical
                .merge_canonical_batch(one::<CanonicalMergeBatchRequest>(args)?)
        }
    ),
    ("client.updateCanonicalReferenceMetadata", |apps, args| {
        apps.reference_canonical
            .update_canonical_metadata(one::<CanonicalMetadataUpdateRequest>(args)?)
    }),
    ("client.archiveCanonicalReference", |apps, args| {
        apps.reference_canonical
            .archive_canonical(one::<CanonicalArchiveRequest>(args)?)
    }),
    ("client.queryConceptKb", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(apps, "client.queryConceptKb", args)
    }),
    ("client.rebuildConceptKbIndex", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.rebuildConceptKbIndex",
            args,
        )
    }),
    ("client.updateConceptDisplayText", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.updateConceptDisplayText",
            args,
        )
    }),
    ("client.applyConceptReviewAction", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.applyConceptReviewAction",
            args,
        )
    }),
    ("client.deleteConceptEntries", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.deleteConceptEntries",
            args,
        )
    }),
    ("client.rebuildTopicGraphIndex", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.rebuildTopicGraphIndex",
            args,
        )
    }),
    ("client.acceptTopicGraphRelation", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.acceptTopicGraphRelation",
            args,
        )
    }),
    ("client.rejectTopicGraphRelation", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.rejectTopicGraphRelation",
            args,
        )
    }),
    ("client.applyTopicGraphReviewAction", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.applyTopicGraphReviewAction",
            args,
        )
    }),
    ("client.saveTagVocabulary", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.saveTagVocabulary", args)
    }),
    ("client.validateTagVocabulary", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.validateTagVocabulary", args)
    }),
    ("client.rebuildTagVocabularyIndex", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.rebuildTagVocabularyIndex", args)
    }),
    ("client.stageTagSuggestions", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.stageTagSuggestions", args)
    }),
    ("client.updateStagedTagSuggestion", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.updateStagedTagSuggestion", args)
    }),
    ("client.updateTagVocabularyEntry", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.updateTagVocabularyEntry", args)
    }),
    ("client.deleteTagVocabularyEntry", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.deleteTagVocabularyEntry", args)
    }),
    ("client.promoteStagedTagSuggestions", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.promoteStagedTagSuggestions", args)
    }),
    ("client.discardStagedTagSuggestions", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.discardStagedTagSuggestions", args)
    }),
    ("client.clearStagedTagSuggestions", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.clearStagedTagSuggestions", args)
    }),
    ("client.previewTagVocabularyImport", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.previewTagVocabularyImport", args)
    }),
    ("client.applyTagVocabularyImport", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.applyTagVocabularyImport", args)
    }),
    ("client.replaceTagAuditRecords", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.replaceTagAuditRecords", args)
    }),
    ("client.initializeBuiltinTagPolicy", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.initializeBuiltinTagPolicy", args)
    }),
    ("client.getPublicMaintenanceOperation", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(
            apps,
            "client.getPublicMaintenanceOperation",
            args,
        )
    }),
    ("client.getLibraryIndex", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.getLibraryIndex", args)
    }),
    ("client.getReviewInput", |apps, args| {
        let request = optional_one::<Value>(args)?;
        Ok(json!({
            "reference":apps.reference_canonical.review_input(&request)?,
            "concept":apps.concepts.load()?.reviews,
            "topicGraph":apps.topic_graph.load()?.reviews,
        }))
    }),
    ("client.debugSynthesisProfilerList", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisProfilerList", args)
    }),
    ("client.debugSynthesisPaperInspect", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisPaperInspect", args)
    }),
    ("client.debugSynthesisDiff", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisDiff", args)
    }),
    ("client.debugSynthesisCleanInstallReset", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(
            apps,
            "client.debugSynthesisCleanInstallReset",
            args,
        )
    }),
    (
        "client.reconcileSynthesisRuntimeWorkStateOnStartup",
        |apps, args| {
            crate::runtime_webdav_maintenance_surface::dispatch(
                apps,
                "client.reconcileSynthesisRuntimeWorkStateOnStartup",
                args,
            )
        }
    ),
    ("client.resetSynthesisDatabase", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(
            apps,
            "client.resetSynthesisDatabase",
            args,
        )
    }),
    ("client.syncWebDavNow", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(apps, "client.syncWebDavNow", args)
    }),
    ("client.pauseWebDavSync", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(apps, "client.pauseWebDavSync", args)
    }),
    ("client.resumeWebDavSync", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(apps, "client.resumeWebDavSync", args)
    }),
    ("client.retryWebDavSync", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(apps, "client.retryWebDavSync", args)
    }),
    ("client.resolveWebDavSyncConflict", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(
            apps,
            "client.resolveWebDavSyncConflict",
            args,
        )
    }),
);

#[cfg(test)]
fn dispatched_production_client_capabilities() -> impl Iterator<Item = &'static str> {
    PRODUCTION_CLIENT_HANDLERS
        .iter()
        .map(|handler| handler.capability)
}

// The control receipt endpoint is deliberately handled by the production
// transport before legacy dispatch.  Keep it visible to the roster tests so a
// wire-only extension cannot be mistaken for an unimplemented capability.
#[cfg(test)]
const DIRECT_PRODUCTION_CLIENT_CAPABILITIES: &[&str] =
    &["client.controlPublicMaintenanceOperation"];

pub(crate) fn dispatch_legacy_client(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Result<Value, String> {
    PRODUCTION_CLIENT_HANDLERS
        .iter()
        .find(|handler| handler.capability == capability)
        .ok_or_else(|| "operation_unavailable".to_owned())
        .and_then(|handler| (handler.dispatch)(apps, args))
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;
    use std::path::{Path, PathBuf};
    use std::sync::{Arc, Mutex};
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;
    use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
    use synthesis_repository::{
        CacheBasisRecord, CanonicalReferenceRecord, Repository, RepositoryIdentity,
    };
    use synthesis_sidecar::production_capabilities::{
        READY_PRODUCTION_CLIENT_CAPABILITIES, production_client_capabilities,
    };

    use crate::runtime_production_ports::build_production_applications;
    use crate::runtime_worker_pool::NativeComputePool;

    fn test_root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-production-compat-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
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
            Arc::new(Mutex::new(repository)),
            Arc::new(Mutex::new(canonical)),
            Arc::new(NativeComputePool::new()),
            None,
            "service".into(),
            root.join("webdav-state.json"),
        )
    }

    fn literature_digest_request() -> Value {
        json!({
            "libraryId":1,
            "itemKey":"AAAA1111",
            "paperRef":"1:AAAA1111",
            "itemType":"journalArticle",
            "title":"Source paper",
            "year":"2026",
            "date":"2026-01-01",
            "creators":["Source Author"],
            "tags":["topic:test"],
            "collections":["collection-1"],
            "doi":"10.1000/source",
            "arxiv":"",
            "isbn":"",
            "url":"https://example.test/source",
            "citekey":"source2026",
            "dateAdded":"2026-01-01",
            "digest":{
                "noteKey":"DIGEST1",
                "payloadHash":"sha256:digest-1",
                "content":"# Digest\n".to_owned() + &"x".repeat(128 * 1024),
            },
            "references":{
                "noteKey":"REFS1",
                "payloadHash":"sha256:references-1",
                "references":[{
                    "title":"Matched paper",
                    "year":"2024",
                    "authors":["Matched Author"],
                    "citekey":"matched2024",
                    "raw":"Matched Author (2024). Matched paper."
                }]
            },
            "citationAnalysis":{
                "noteKey":"CITATION1",
                "payloadHash":"sha256:citation-1",
                "citations":[{"reference_index":0,"role":"background"}]
            },
            "literatureMatchingMetadata":{
                "key_terms":["  Knowledge Graph  ","knowledge graph","Rust"],
                "methods":["Case Study"],
                "problems":["Reference Drift"],
                "datasets":["Zotero Library"],
                "exclude_terms":["Legacy"]
            },
            "matchedReferences":[{
                "libraryId":1,
                "itemKey":"BBBB2222",
                "paperRef":"1:BBBB2222",
                "title":"Matched paper",
                "year":"2024",
                "citekey":"matched2024"
            }]
        })
    }

    #[test]
    fn registered_handlers_are_unique_and_declared() {
        let declared = production_client_capabilities()
            .unwrap()
            .into_iter()
            .collect::<BTreeSet<_>>();
        let registered = dispatched_production_client_capabilities()
            .chain(DIRECT_PRODUCTION_CLIENT_CAPABILITIES.iter().copied())
            .map(str::to_owned)
            .collect::<BTreeSet<_>>();
        assert_eq!(
            registered.len(),
            PRODUCTION_CLIENT_HANDLERS.len() + DIRECT_PRODUCTION_CLIENT_CAPABILITIES.len()
        );
        assert!(registered.is_subset(&declared));
    }

    #[test]
    fn every_declared_client_operation_has_exactly_one_handler() {
        let declared = production_client_capabilities()
            .unwrap()
            .into_iter()
            .collect::<BTreeSet<_>>();
        let registered = dispatched_production_client_capabilities()
            .chain(DIRECT_PRODUCTION_CLIENT_CAPABILITIES.iter().copied())
            .map(str::to_owned)
            .collect::<BTreeSet<_>>();
        assert_eq!(registered, declared);
    }

    #[test]
    fn ready_roster_is_a_dispatchable_subset() {
        let ready = READY_PRODUCTION_CLIENT_CAPABILITIES
            .iter()
            .map(|capability| (*capability).to_owned())
            .collect::<BTreeSet<_>>();
        let registered = dispatched_production_client_capabilities()
            .chain(DIRECT_PRODUCTION_CLIENT_CAPABILITIES.iter().copied())
            .map(str::to_owned)
            .collect::<BTreeSet<_>>();
        assert!(ready.is_subset(&registered));
    }

    #[test]
    fn topic_apply_rejects_a_raw_bundle_without_the_strict_envelope() {
        let root = test_root();
        let apps = test_applications(&root);
        let result = dispatch_legacy_client(
            &apps,
            "client.applyTopicSynthesisResult",
            &[json!({"topicId":"topic:test","title":"Raw bundle"})],
        );

        assert_eq!(result, Err("invalid_request".into()));
    }

    #[test]
    fn resolver_uses_host_library_facts_for_union_intersection_and_pagination() {
        let item = |paper_ref: &str, tags: &[&str], collections: &[&str]| {
            crate::runtime_host_collection::ReferenceHostItem {
                paper_ref: paper_ref.into(),
                library_id: 1,
                item_key: paper_ref.split_once(':').expect("paper ref").1.into(),
                item_type: "journalArticle".into(),
                title: paper_ref.into(),
                year: "2026".into(),
                date: String::new(),
                creators: Vec::new(),
                tags: tags.iter().map(|value| (*value).into()).collect(),
                collections: collections.iter().map(|value| (*value).into()).collect(),
                doi: String::new(),
                arxiv: String::new(),
                isbn: String::new(),
                url: String::new(),
                citekey: String::new(),
                date_added: String::new(),
                updated_at: String::new(),
                metadata_hash: String::new(),
            }
        };
        let items = vec![
            item("1:AAAA1111", &["Topic:Alpha", "Domain:Vision"], &["COLL_A"]),
            item("1:BBBB2222", &["topic:beta"], &["coll_b"]),
        ];

        let union = resolver_response_from_items(
            &items,
            &json!({"tag":"topic:alpha","paper_refs":["1:BBBB2222"]}),
        )
        .expect("union");
        assert_eq!(union["total"], 2);
        assert_eq!(union["papers"][0]["paper_ref"], "1:AAAA1111");
        assert_eq!(union["papers"][1]["match_reasons"], json!(["paper_refs"]));

        let intersection = resolver_response_from_items(
            &items,
            &json!({
                "tag":{"and":["TOPIC:ALPHA"],"or":["domain:vision"]},
                "collection_key":"coll_a",
                "paper_refs":["1:AAAA1111","1:BBBB2222"],
                "combine":"intersection",
                "cursor":"0",
                "limit":1
            }),
        )
        .expect("intersection");
        assert_eq!(intersection["returned"], 1);
        assert_eq!(intersection["total"], 1);
        assert_eq!(intersection["papers"][0]["paper_ref"], "1:AAAA1111");
        assert_eq!(
            intersection["papers"][0]["match_reasons"],
            json!(["collection_key", "paper_refs", "tag"])
        );

        let invalid = resolver_response_from_items(
            &items,
            &json!({"resolver":{"selection_strategy":"tag_only"}}),
        )
        .expect("invalid response");
        assert_eq!(invalid["ok"], false);
        assert_eq!(invalid["diagnostics"]["rejected"], true);
    }

    #[test]
    fn missing_topic_lifecycle_routes_return_typed_terminals_without_touching_topic_graph() {
        let root = test_root();
        let apps = test_applications(&root);

        assert_eq!(
            dispatch_legacy_client(
                &apps,
                "client.deleteTopicArtifact",
                &[json!({"topicId":"topic:test"})],
            ),
            Ok(json!({
                "ok":false,
                "status":"not_found",
                "topicId":"topic:test",
                "reason":"topic artifact not found"
            }))
        );
        assert_eq!(
            dispatch_legacy_client(&apps, "client.purgeDeletedTopicArtifacts", &[]),
            Ok(json!({"ok":true,"status":"purged","purged_count":0}))
        );
        assert!(
            apps.topic_graph
                .load()
                .expect("topic graph")
                .nodes
                .is_empty()
        );
    }

    #[test]
    fn workbench_surfaces_use_domain_projections_instead_of_maintenance_chrome() {
        let root = test_root();
        let apps = test_applications(&root);
        for (surface, field) in [
            ("home", "artifacts"),
            ("topics", "artifacts"),
            ("review", "reviews"),
            ("tags", "tags"),
            ("concepts", "concepts"),
            ("reader", "reader"),
        ] {
            let projection = dispatch_legacy_client(
                &apps,
                "client.getSynthesisWorkbenchSurfaceInput",
                &[json!(surface), json!({})],
            )
            .unwrap_or_else(|error| panic!("{surface}: {error}"));
            assert!(projection.get(field).is_some(), "{surface}: {projection}");
            assert!(
                projection.get("maintenance").is_none(),
                "{surface}: {projection}"
            );
        }
    }

    #[test]
    fn related_items_echo_reads_repository_without_calling_reverse_host() {
        let root = test_root();
        let apps = test_applications(&root);
        assert_eq!(
            dispatch_legacy_client(
                &apps,
                "client.consumeRelatedItemsSyncEcho",
                &[json!({"libraryId":1,"itemKey":"AAAA1111"})],
            ),
            Ok(json!({"consumed":false}))
        );
        let payload = json!({
            "effectId":"effect:1",
            "sourceLibraryId":1,
            "sourceItemKey":"AAAA1111",
            "targetLibraryId":1,
            "targetItemKey":"BBBB2222",
            "status":"applied",
            "externalWriteAt":synthesis_protocol::utc_now_iso8601(),
            "echoState":"awaiting_echo",
            "updatedAt":synthesis_protocol::utc_now_iso8601()
        });
        apps.repository
            .owner()
            .lock()
            .expect("repository")
            .execute(
                "INSERT INTO synt_related_items_sync_effect(effect_id,payload_json,updated_at) VALUES(?1,?2,?3)",
                &[
                    json!("effect:1"),
                    json!(serde_json::to_string(&payload).expect("payload")),
                    json!(synthesis_protocol::utc_now_iso8601()),
                ],
            )
            .expect("seed echo");

        assert_eq!(
            dispatch_legacy_client(
                &apps,
                "client.consumeRelatedItemsSyncEcho",
                &[json!({
                    "libraryId":1,
                    "itemKey":"AAAA1111",
                    "relatedItemKey":"BBBB2222"
                })],
            ),
            Ok(json!({"consumed":true}))
        );
    }

    #[test]
    fn unavailable_debug_projections_return_typed_stable_terminals() {
        let root = test_root();
        let apps = test_applications(&root);
        for (operation, request) in [
            ("client.debugSynthesisProfilerList", json!({})),
            (
                "client.debugSynthesisPaperInspect",
                json!({"paperRef":"1:ABSENT"}),
            ),
            ("client.debugSynthesisDiff", json!({})),
        ] {
            assert_eq!(
                dispatch_legacy_client(&apps, operation, &[request]),
                Ok(json!({"status":"unavailable","diagnostics":[]})),
                "{operation}"
            );
        }
    }

    #[test]
    fn literature_digest_receipt_is_idempotent_after_reopen() {
        let root = test_root();
        let request = literature_digest_request();
        let first = test_applications(&root)
            .apply_literature_digest(request.clone())
            .expect("first apply");
        assert_eq!(first["status"], "sidecar_applied");
        assert_eq!(first["idempotent"], false);

        let second = test_applications(&root)
            .apply_literature_digest(request)
            .expect("reopened apply");
        assert_eq!(second["status"], "sidecar_applied");
        assert_eq!(second["idempotent"], true);
        assert_eq!(first["operationId"], second["operationId"]);
    }

    #[test]
    fn literature_digest_apply_materializes_and_rolls_back_scoped_state() {
        let root = test_root();
        let apps = test_applications(&root);
        let request = literature_digest_request();
        let first = apps
            .apply_literature_digest(request.clone())
            .expect("materialized apply");
        assert_eq!(first["status"], "sidecar_applied");
        assert_eq!(first["sourceRef"], "1:AAAA1111");
        assert_eq!(first["source_ref"], "1:AAAA1111");
        assert_eq!(first["paperRef"], "1:AAAA1111");
        assert_eq!(first["reference_count"], 1);
        assert_eq!(first["matched_count"], 1);

        let owner = apps.repository.owner();
        let repository = owner.lock().expect("repository");
        let artifacts = repository
            .list_reference_artifacts(&["1:AAAA1111".into()])
            .expect("artifacts");
        assert_eq!(artifacts.len(), 3);
        let raw_before = repository.list_raw_references().expect("references");
        assert_eq!(raw_before.len(), 1);
        assert!(raw_before[0].roles_json.contains("background"));
        let bindings = repository.list_reference_bindings().expect("bindings");
        assert_eq!(bindings.len(), 1);
        assert_eq!(bindings[0].item_key, "BBBB2222");
        let metadata = repository
            .query(
                "SELECT * FROM synt_literature_matching_metadata WHERE literature_item_id=?1",
                &[json!("1:AAAA1111")],
            )
            .expect("metadata");
        assert_eq!(metadata.len(), 1);
        assert_eq!(
            metadata[0]["key_terms_json"],
            "[\"Knowledge Graph\",\"Rust\"]"
        );

        for key in ["citation-graph:library", "related-items-sync:global"] {
            repository
                .upsert_cache_basis(&CacheBasisRecord {
                    cache_key: key.into(),
                    cache_kind: key.into(),
                    status: "ready".into(),
                    updated_at: "ready".into(),
                    ..CacheBasisRecord::default()
                })
                .expect("ready cache");
        }
        drop(repository);

        let mut digest_only = request.clone();
        digest_only["digest"]["payloadHash"] = json!("sha256:digest-2");
        digest_only["digest"]["content"] = json!("changed digest");
        apps.apply_literature_digest(digest_only)
            .expect("digest-only apply");
        let repository = owner.lock().expect("repository");
        assert_eq!(
            repository.list_raw_references().expect("references"),
            raw_before
        );
        assert_eq!(
            repository
                .get_cache_basis("citation-graph:library")
                .expect("graph cache")
                .expect("graph cache row")
                .status,
            "ready"
        );
        drop(repository);

        let mut citation_only = request.clone();
        citation_only["citationAnalysis"]["payloadHash"] = json!("sha256:citation-2");
        citation_only["citationAnalysis"]["citations"][0]["role"] = json!("method");
        apps.apply_literature_digest(citation_only)
            .expect("citation-only apply");
        let repository = owner.lock().expect("repository");
        assert!(
            repository.list_raw_references().expect("references")[0]
                .roles_json
                .contains("method")
        );
        assert_eq!(
            repository
                .get_cache_basis("citation-graph:library")
                .expect("graph cache")
                .expect("graph cache row")
                .status,
            "stale"
        );
        drop(repository);

        let mut ambiguous = request.clone();
        ambiguous["matchedReferences"] = json!([
            {"libraryId":1,"itemKey":"BBBB2222","paperRef":"1:BBBB2222","title":"Matched paper","year":"2024"},
            {"libraryId":1,"itemKey":"CCCC3333","paperRef":"1:CCCC3333","title":"Matched paper","year":"2024"}
        ]);
        apps.apply_literature_digest(ambiguous)
            .expect("ambiguous title-year apply");
        let repository = owner.lock().expect("repository");
        assert!(
            repository
                .list_reference_bindings()
                .expect("bindings")
                .is_empty()
        );
        let before_failure = repository.list_raw_references().expect("references");
        drop(repository);

        let mut invalid = request.clone();
        invalid["references"]["payloadHash"] = json!("sha256:references-invalid");
        invalid["references"]["references"] = json!("not-an-array");
        assert!(apps.apply_literature_digest(invalid).is_err());
        assert_eq!(
            owner
                .lock()
                .expect("repository")
                .list_raw_references()
                .expect("references"),
            before_failure
        );

        let mut missing_references = request;
        missing_references
            .as_object_mut()
            .expect("request object")
            .remove("references");
        missing_references["citationAnalysis"] = Value::Null;
        let missing = apps
            .apply_literature_digest(missing_references)
            .expect("missing references artifact");
        assert_eq!(missing["reference_count"], 0);
        assert!(
            owner
                .lock()
                .expect("repository")
                .list_raw_references()
                .expect("references")
                .is_empty()
        );
    }

    #[test]
    fn canonical_and_topic_discovery_public_adapters_preserve_stable_shapes() {
        let root = test_root();
        let apps = test_applications(&root);
        {
            let owner = apps.repository.owner();
            let mut repository = owner.lock().expect("repository");
            for id in ["canonical:source", "canonical:target"] {
                repository
                    .upsert_canonical_reference_record(&CanonicalReferenceRecord {
                        canonical_reference_id: id.into(),
                        title: id.into(),
                        normalized_title: id.into(),
                        authors_json: "[]".into(),
                        identifiers_json: "{}".into(),
                        metadata_hash: "sha256:metadata".into(),
                        status: "active".into(),
                        created_at: "1".into(),
                        updated_at: "1".into(),
                        ..CanonicalReferenceRecord::default()
                    })
                    .expect("canonical");
            }
            repository
                .execute(
                    "INSERT INTO synt_topic_discovery_hint(
                     hint_id,payload_json,updated_at
                     ) VALUES('hint:1','{\"hint_id\":\"hint:1\",\"status\":\"open\"}','1')",
                    &[],
                )
                .expect("hint");
        }
        let merged = dispatch_legacy_client(
            &apps,
            "client.mergeEffectiveCanonicalReference",
            &[json!({
                "sourceEffectiveCanonicalId":"canonical:source",
                "targetEffectiveCanonicalId":"canonical:target",
            })],
        )
        .expect("merge");
        assert_eq!(merged["status"], "merged");
        let rejected = dispatch_legacy_client(
            &apps,
            "client.rejectTopicDiscoveryHint",
            &[json!({"hintId":"hint:1"})],
        )
        .expect("reject hint");
        assert_eq!(rejected["status"], "rejected");
        assert_eq!(rejected["hint"]["status"], "rejected");
        drop(apps);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn reference_public_adapters_preserve_empty_reads_and_no_arg_jobs() {
        let root = test_root();
        let apps = test_applications(&root);
        let index = dispatch_legacy_client(&apps, "client.getReferenceSidecarIndex", &[json!({})])
            .expect("index");
        assert_eq!(index["rows"], json!([]));
        assert_eq!(index["cursor"], "0");
        assert_eq!(index["next_cursor"], "");
        assert_eq!(index["has_more"], false);

        let ranked = dispatch_legacy_client(&apps, "client.rankExternalReferences", &[json!({})])
            .expect("ranking");
        assert_eq!(ranked["items"], json!([]));
        assert_eq!(ranked["nextCursor"], "");
        assert_eq!(ranked["hasMore"], false);

        let attention = dispatch_legacy_client(&apps, "client.getAttentionQueue", &[json!({})])
            .expect("attention");
        assert_eq!(attention["ok"], true);
        assert!(attention["items"].is_array());

        let review = dispatch_legacy_client(&apps, "client.getReviewInput", &[json!({})])
            .expect("review input");
        assert!(review["reference"]["records"].is_array());
        assert!(review["concept"].is_array());
        assert!(review["topicGraph"].is_array());

        for capability in [
            "client.refreshReferenceSidecarNow",
            "client.retryReferenceSidecarRefresh",
            "client.runAdvancedReferenceMatchingNow",
            "client.retryAdvancedReferenceMatching",
        ] {
            assert_eq!(
                dispatch_legacy_client(&apps, capability, &[]),
                Err("reverse_host_unavailable".into()),
                "{capability} must accept the public no-argument boundary",
            );
        }
        assert_eq!(
            dispatch_legacy_client(
                &apps,
                "client.updateCanonicalReferenceMetadata",
                &[json!({
                    "canonicalReferenceId":"canonical",
                    "patch":{"title":"Title"},
                    "unexpected":true,
                })],
            ),
            Err("invalid_request".into()),
        );
        drop(apps);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn citation_graph_public_commands_validate_only_the_public_boundary() {
        let root = test_root();
        let apps = test_applications(&root);

        for capability in [
            "client.rebuildCitationGraphCacheNow",
            "client.refreshCitationGraphCacheIncrementalNow",
            "client.retryCitationGraphCacheRebuild",
        ] {
            assert_ne!(
                dispatch_legacy_client(&apps, capability, &[]),
                Err("invalid_request".into()),
                "{capability} must accept the public no-argument boundary",
            );
            assert_eq!(
                dispatch_legacy_client(&apps, capability, &[json!({})]),
                Err("invalid_request".into()),
                "{capability} must reject public arguments",
            );
        }

        assert_ne!(
            dispatch_legacy_client(
                &apps,
                "client.startCitationGraphUpdate",
                &[json!({
                    "scope":"papers",
                    "paperRefs":["1:AAAA1111"],
                    "expectedReferenceBasisHash":"sha256:reference",
                    "idempotencyKey":"graph-update-a",
                })],
            ),
            Err("invalid_request".into()),
        );
        assert_ne!(
            dispatch_legacy_client(
                &apps,
                "client.refreshCitationGraphMetricsNow",
                &[json!({"graphHash":"sha256:graph"})],
            ),
            Err("invalid_request".into()),
        );
        assert_ne!(
            dispatch_legacy_client(
                &apps,
                "client.recomputeCitationGraphLayout",
                &[json!({"algorithm":"radial","force":true})],
            ),
            Err("invalid_request".into()),
        );
        assert_eq!(
            dispatch_legacy_client(
                &apps,
                "client.startCitationGraphUpdate",
                &[json!({"scope":"library","libraryId":1})],
            ),
            Err("invalid_request".into()),
            "native payloads must not select Host library authority",
        );
        assert_eq!(
            dispatch_legacy_client(
                &apps,
                "client.recomputeCitationGraphLayout",
                &[json!({"algorithm":"radial","force":true,"input":{}})],
            ),
            Err("invalid_request".into()),
        );
        drop(apps);
        let _ = std::fs::remove_dir_all(root);
    }
}
