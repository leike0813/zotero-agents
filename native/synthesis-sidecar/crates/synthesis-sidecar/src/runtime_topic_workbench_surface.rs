use serde::de::DeserializeOwned;
use serde_json::{Map, Value, json};
use synthesis_application::{
    TopicApplyRequest, TopicContextRequest, TopicContextView, TopicDeleteRequest,
    TopicDetailRequest, TopicDetailResult, TopicDiscoveryHintRequest, TopicFindRequest,
    TopicListRequest, TopicListResult, TopicRecord, TopicReportRequest, TopicResolverCombine,
    TopicResolverRequest, TopicWorkflowFilter, WorkbenchSurface, WorkbenchSurfacePort,
    WorkbenchSurfaceRequest,
};
use synthesis_repository::DeletedTopicArtifactRecord;

use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_reference_canonical::LiteratureDigestApplyRequest;

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

fn one_object(args: &[Value]) -> Result<&Map<String, Value>, String> {
    match args {
        [Value::Object(value)] => Ok(value),
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

fn ensure_allowed(object: &Map<String, Value>, allowed: &[&str]) -> Result<(), String> {
    if object.keys().all(|key| allowed.contains(&key.as_str())) {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn required_string(object: &Map<String, Value>, names: &[&str]) -> Result<String, String> {
    names
        .iter()
        .find_map(|name| object.get(*name).and_then(Value::as_str))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .ok_or_else(|| "invalid_request".into())
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
                "metadata":snapshot.metadata,
                "pathId":snapshot.path_id,
            })
        }
    }
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

fn decode_find_request(args: &[Value]) -> Result<TopicFindRequest, String> {
    let object = one_object(args)?;
    ensure_allowed(
        object,
        &["paper_refs", "paperRefs", "paper_ref", "paperRef"],
    )?;
    let mut paper_refs = Vec::new();
    for name in ["paper_refs", "paperRefs", "paper_ref", "paperRef"] {
        match object.get(name) {
            Some(Value::String(value)) => paper_refs.push(value.clone()),
            Some(Value::Array(values)) => paper_refs.extend(
                values
                    .iter()
                    .map(Value::as_str)
                    .collect::<Option<Vec<_>>>()
                    .ok_or_else(|| "invalid_request".to_owned())?
                    .into_iter()
                    .map(str::to_owned),
            ),
            Some(_) => return Err("invalid_request".into()),
            None => {}
        }
    }
    Ok(TopicFindRequest { paper_refs })
}

fn decode_workflow_filter(args: &[Value]) -> Result<TopicWorkflowFilter, String> {
    let object = match args {
        [] => return Ok(TopicWorkflowFilter::All),
        _ => one_object(args)?,
    };
    ensure_allowed(object, &["filter"])?;
    match object
        .get("filter")
        .and_then(Value::as_str)
        .unwrap_or("all")
    {
        "all" => Ok(TopicWorkflowFilter::All),
        "updatable" => Ok(TopicWorkflowFilter::Updatable),
        _ => Err("invalid_request".into()),
    }
}

fn decode_topic_context(args: &[Value]) -> Result<TopicContextRequest, String> {
    let object = one_object(args)?;
    ensure_allowed(object, &["topicId", "topic_id", "view"])?;
    let view = match object.get("view").and_then(Value::as_str).unwrap_or("full") {
        "digest" => TopicContextView::Digest,
        "semantic" => TopicContextView::Semantic,
        "audit" => TopicContextView::Audit,
        "full" => TopicContextView::Full,
        _ => return Err("invalid_request".into()),
    };
    Ok(TopicContextRequest {
        topic_id: required_string(object, &["topicId", "topic_id"])?,
        view,
    })
}

fn resolver_strings(value: &Value, array_only: bool) -> Option<Vec<String>> {
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
        Value::String(_) | Value::Array(_) => resolver_strings(value, false).is_some(),
        Value::Object(object) => {
            !object.is_empty()
                && object
                    .keys()
                    .all(|key| matches!(key.as_str(), "and" | "or" | "not"))
                && object
                    .values()
                    .all(|value| resolver_strings(value, false).is_some())
        }
        _ => false,
    }
}

fn page_number(value: Option<&Value>, default: usize, max: usize) -> Result<usize, String> {
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

fn decode_resolver(args: &[Value]) -> Result<TopicResolverRequest, Vec<String>> {
    let object = one_object(args).map_err(|_| vec!["resolver payload is invalid".into()])?;
    let mut errors = Vec::new();
    if object.keys().any(|key| {
        !matches!(
            key.as_str(),
            "tag" | "collection_key" | "paper_refs" | "combine" | "limit" | "cursor"
        )
    }) {
        errors.push("resolver payload contains unsupported fields".into());
    }
    if !["tag", "collection_key", "paper_refs"]
        .iter()
        .any(|key| object.contains_key(*key))
    {
        errors.push("resolver requires a selector".into());
    }
    if object
        .get("tag")
        .is_some_and(|value| !valid_tag_query(value))
    {
        errors.push("resolver tag is invalid".into());
    }
    let collection_keys = object
        .get("collection_key")
        .and_then(|value| resolver_strings(value, false))
        .unwrap_or_default();
    if object.contains_key("collection_key") && collection_keys.is_empty() {
        errors.push("resolver collection_key is invalid".into());
    }
    let paper_refs = object
        .get("paper_refs")
        .and_then(|value| resolver_strings(value, true))
        .unwrap_or_default();
    if object.contains_key("paper_refs") && paper_refs.is_empty() {
        errors.push("resolver paper_refs must be an array".into());
    }
    let combine = match object
        .get("combine")
        .and_then(Value::as_str)
        .unwrap_or("union")
    {
        "union" => TopicResolverCombine::Union,
        "intersection" => TopicResolverCombine::Intersection,
        _ => {
            errors.push("resolver combine is invalid".into());
            TopicResolverCombine::Union
        }
    };
    let cursor = page_number(object.get("cursor"), 0, usize::MAX)
        .map_err(|_| vec!["resolver cursor is invalid".into()])?;
    let limit = page_number(object.get("limit"), 100, 250)
        .map_err(|_| vec!["resolver limit is invalid".into()])?;
    if !errors.is_empty() {
        return Err(errors);
    }
    Ok(TopicResolverRequest {
        tag: object.get("tag").cloned(),
        collection_keys,
        paper_refs,
        combine,
        cursor,
        limit,
        normalized: Value::Object(object.clone()),
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
        let page = self.apps.topics.list(TopicListRequest::default())?;
        let (deleted, deleted_total) = self.apps.topics.list_deleted(0, 250)?;
        Ok(json!({
            "libraryId":self.apps.library_id(),
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
        }))
    }
}

impl WorkbenchSurfacePort for ProductionWorkbenchSurfaces<'_> {
    fn home(&self, _state: &Value) -> Result<Value, String> {
        self.topic_projection()
    }

    fn topics(&self, _state: &Value) -> Result<Value, String> {
        self.topic_projection()
    }

    fn index(&self, state: &Value) -> Result<Value, String> {
        self.apps
            .reference_canonical
            .workbench_index(state, self.apps.library_id())
    }

    fn reference_review(&self, state: &Value) -> Result<Value, String> {
        Ok(json!({
            "libraryId":self.apps.library_id(),
            "reviews":{"reference":self.apps.reference_canonical.review_input(state)?},
        }))
    }

    fn topic_graph_review(&self, _state: &Value) -> Result<Value, String> {
        let topic_graph = wire(self.apps.topic_graph.load()?)?;
        Ok(json!({
            "libraryId":self.apps.library_id(),
            "reviews":{"topicGraph":topic_graph.get("reviews").cloned().unwrap_or_else(|| json!([]))},
        }))
    }

    fn concept_review(&self, _state: &Value) -> Result<Value, String> {
        let concepts = wire(self.apps.concepts.load()?)?;
        Ok(json!({
            "libraryId":self.apps.library_id(),
            "reviews":{"concept":concepts.get("reviews").cloned().unwrap_or_else(|| json!([]))},
        }))
    }

    fn graph(&self, state: &Value) -> Result<Value, String> {
        crate::runtime_citation_graph_read_surface::workbench_graph_surface(self.apps, state)
    }

    fn tags(&self, _state: &Value) -> Result<Value, String> {
        Ok(json!({
            "libraryId":self.apps.library_id(),
            "tags":crate::runtime_tag_surface::dispatch(self.apps, "client.loadTagVocabulary", &[])?,
        }))
    }

    fn concepts(&self, _state: &Value) -> Result<Value, String> {
        Ok(json!({
            "libraryId":self.apps.library_id(),
            "concepts":wire(self.apps.concepts.load()?)?,
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
            })?),
            None => json!({
                "ok":false,"status":"unavailable","topicId":"","title":"",
                "source_papers":[],"diagnostics":["reader_topic_unselected"],
            }),
        };
        Ok(json!({"libraryId":self.apps.library_id(),"reader":reader}))
    }
}

type ProductionClientHandler = fn(&ProductionApplications, &[Value]) -> Result<Value, String>;

struct RegisteredProductionClientHandler {
    capability: &'static str,
    dispatch: ProductionClientHandler,
}

macro_rules! register_production_client_handlers {
    ($(($capability:literal, $handler:expr)),+ $(,)?) => {
        const TOPIC_WORKBENCH_CLIENT_HANDLERS: &[RegisteredProductionClientHandler] = &[
            $(RegisteredProductionClientHandler { capability: $capability, dispatch: $handler }),+
        ];
    };
}

register_production_client_handlers!(
    ("client.listTopics", |apps, args| {
        apps.topics.list(optional_one(args)?).map(topic_list_wire)
    }),
    ("client.findTopicsByPaperRef", |apps, args| {
        wire(apps.topics.find_by_paper_refs(decode_find_request(args)?)?)
    }),
    ("client.readTopicDetail", |apps, args| {
        apps.topics.detail(one(args)?).map(topic_detail_wire)
    }),
    ("client.listWorkflowTopicOptions", |apps, args| {
        wire(
            apps.topics
                .workflow_options(decode_workflow_filter(args)?)?,
        )
    }),
    ("client.getSynthesisWorkbenchChromeInput", |apps, args| {
        if !one::<Value>(args)?.is_object() {
            return Err("invalid_request".into());
        }
        wire(apps.workbench.read_public_chrome()?)
    }),
    ("client.getSynthesisWorkbenchSurfaceInput", |apps, args| {
        let request = decode_surface(args)?;
        wire(
            apps.workbench
                .read_surface(&request, &ProductionWorkbenchSurfaces { apps })?,
        )
    }),
    ("client.getSynthesisBackgroundJobRows", |apps, args| {
        no_args(args)?;
        wire(apps.workbench.background_jobs()?)
    }),
    ("client.applyTopicSynthesisResult", |apps, args| {
        wire(apps.topics.apply(one::<TopicApplyRequest>(args)?))
    }),
    ("client.getTopicContext", |apps, args| {
        wire(apps.topics.context(decode_topic_context(args)?)?)
    }),
    ("client.resolveResolver", |apps, args| {
        let request = match decode_resolver(args) {
            Ok(request) => request,
            Err(errors) => return Ok(invalid_resolver(errors)),
        };
        wire(apps.topics.resolve(apps.topic_library.as_ref(), request)?)
    }),
    ("client.getTopicReport", |apps, args| {
        let object = one_object(args)?;
        ensure_allowed(object, &["topicId", "topic_id"])?;
        wire(apps.topics.report(TopicReportRequest {
            topic_id: required_string(object, &["topicId", "topic_id"])?,
        })?)
    }),
    ("client.applyLiteratureDigestSidecar", |apps, args| {
        apps.reference_canonical
            .apply_literature_digest(one::<LiteratureDigestApplyRequest>(args)?)
    }),
    ("client.deleteTopicArtifact", |apps, args| {
        wire(apps.topics.delete(one::<TopicDeleteRequest>(args)?)?)
    }),
    ("client.purgeDeletedTopicArtifacts", |apps, args| {
        no_args(args)?;
        wire(apps.topics.purge_deleted()?)
    }),
    ("client.rejectTopicDiscoveryHint", |apps, args| {
        let object = one_object(args)?;
        ensure_allowed(object, &["hintId"])?;
        wire(
            apps.topics
                .update_discovery_hint(TopicDiscoveryHintRequest {
                    hint_id: required_string(object, &["hintId"])?,
                    status: "rejected".into(),
                })?,
        )
    }),
    ("client.restoreTopicDiscoveryHint", |apps, args| {
        let object = one_object(args)?;
        ensure_allowed(object, &["hintId"])?;
        wire(
            apps.topics
                .update_discovery_hint(TopicDiscoveryHintRequest {
                    hint_id: required_string(object, &["hintId"])?,
                    status: "open".into(),
                })?,
        )
    }),
);

pub(crate) fn dispatch(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Option<Result<Value, String>> {
    TOPIC_WORKBENCH_CLIENT_HANDLERS
        .iter()
        .find(|handler| handler.capability == capability)
        .map(|handler| (handler.dispatch)(apps, args))
}

#[cfg(test)]
pub(crate) fn dispatched_capabilities() -> impl Iterator<Item = &'static str> {
    TOPIC_WORKBENCH_CLIENT_HANDLERS
        .iter()
        .map(|handler| handler.capability)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adapter_has_the_closed_sixteen_operation_slice() {
        assert_eq!(TOPIC_WORKBENCH_CLIENT_HANDLERS.len(), 16);
        let mut capabilities = TOPIC_WORKBENCH_CLIENT_HANDLERS
            .iter()
            .map(|handler| handler.capability)
            .collect::<Vec<_>>();
        capabilities.sort_unstable();
        capabilities.dedup();
        assert_eq!(capabilities.len(), 16);
    }

    #[test]
    fn invalid_resolver_is_rejected_before_a_library_port_exists() {
        let result = decode_resolver(&[json!({"topicId":"topic:invalid"})]);
        assert_eq!(
            result.expect_err("invalid"),
            vec![
                "resolver payload contains unsupported fields",
                "resolver requires a selector"
            ]
        );
    }
}
