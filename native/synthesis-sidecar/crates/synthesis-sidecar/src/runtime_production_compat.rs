use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use synthesis_application::{
    CitationGraphRepositoryPort, DebugMaintenanceApplication, ReferenceRefreshRepositoryPort,
    TagVocabularyRepositoryPort, TopicDetailRequest, TopicListRequest, TopicListResult,
    TopicRecord,
};

use crate::runtime_production_ports::ProductionApplications;

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

fn list_all_topics(apps: &ProductionApplications) -> Result<TopicListResult, String> {
    apps.topics.list(TopicListRequest {
        cursor: String::new(),
        limit: 100,
    })
}

fn find_topics_by_paper_ref(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    let request: Value = optional_one(args)?;
    let paper_ref = request
        .get("paper_ref")
        .or_else(|| request.get("paperRef"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    if paper_ref.is_empty() {
        return Ok(topic_list_wire(list_all_topics(apps)?));
    }
    let mut result = list_all_topics(apps)?;
    result.topics.retain(|topic| {
        serde_json::to_string(&topic.resolved_paper_set)
            .is_ok_and(|value| value.contains(paper_ref))
    });
    result.total = result.topics.len();
    result.returned = result.topics.len();
    result.has_more = false;
    result.next_cursor.clear();
    Ok(topic_list_wire(result))
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

fn debug_snapshot(apps: &ProductionApplications) -> Result<Value, String> {
    wire(
        DebugMaintenanceApplication::new(apps.repository.clone(), apps.canonical.clone())
            .snapshot()?,
    )
}

pub(crate) fn dispatch_legacy_client(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Result<Value, String> {
    match capability {
        "client.listTopics" => apps.topics.list(optional_one(args)?).map(topic_list_wire),
        "client.findTopicsByPaperRef" => find_topics_by_paper_ref(apps, args),
        "client.readTopicDetail" => apps
            .topics
            .detail(one::<TopicDetailRequest>(args)?)
            .and_then(wire),
        "client.listWorkflowTopicOptions" => workflow_topic_options(apps, args),
        "client.getSynthesisWorkbenchChromeInput" => {
            if !one::<Value>(args)?.is_object() {
                return Err("invalid_request".into());
            }
            apps.workbench.read_json()
        }
        "client.getSynthesisWorkbenchSurfaceInput" => {
            if args.len() != 2 || !args[0].is_string() || !args[1].is_object() {
                return Err("invalid_request".into());
            }
            apps.workbench.read_json()
        }
        "client.getSynthesisBackgroundJobRows" => {
            no_args(args)?;
            wire(apps.workbench.read()?.maintenance.background_jobs)
        }
        "client.getSchemas" => {
            let _: Value = optional_one(args)?;
            Ok(json!({
                "repository":"synthesis-repository-foundation.v1",
                "canonical":"synthesis-topic-canonical-store.v1",
            }))
        }
        "client.getCitationGraphLayout" => {
            let request = one::<Value>(args)?;
            let key = request
                .get("layoutKey")
                .or_else(|| request.get("layout_key"))
                .and_then(Value::as_str)
                .ok_or_else(|| "invalid_request".to_owned())?;
            wire(CitationGraphRepositoryPort::get_layout(
                apps.repository.as_ref(),
                key,
            )?)
        }
        "client.queryCitationGraph" | "client.queryCitationGraphCluster" => {
            let _: Value = optional_one(args)?;
            Ok(json!({
                "nodes":CitationGraphRepositoryPort::list_nodes(apps.repository.as_ref())?,
                "edges":CitationGraphRepositoryPort::list_edges(apps.repository.as_ref())?,
            }))
        }
        "client.getReferenceSidecarIndex" => {
            let _: Value = optional_one(args)?;
            Ok(json!({
                "sources":ReferenceRefreshRepositoryPort::list_sources(apps.repository.as_ref())?,
                "references":ReferenceRefreshRepositoryPort::list_raw_references(apps.repository.as_ref())?,
            }))
        }
        "client.isBuiltinTagPolicyInitialized" => {
            no_args(args)?;
            Ok(Value::Bool(
                TagVocabularyRepositoryPort::get_state(apps.repository.as_ref())?.is_some(),
            ))
        }
        "client.loadTagVocabulary" => {
            no_args(args)?;
            Ok(json!({
                "state":TagVocabularyRepositoryPort::get_state(apps.repository.as_ref())?,
                "entries":TagVocabularyRepositoryPort::list_entries(apps.repository.as_ref())?,
                "staged":TagVocabularyRepositoryPort::list_staged(apps.repository.as_ref())?,
                "effects":TagVocabularyRepositoryPort::list_effects(apps.repository.as_ref())?,
            }))
        }
        "client.exportTagVocabularyForRegulator" => {
            no_args(args)?;
            Ok(Value::Array(
                TagVocabularyRepositoryPort::list_entries(apps.repository.as_ref())?
                    .into_iter()
                    .map(|entry| Value::String(entry.tag))
                    .collect(),
            ))
        }
        "client.listStagedTagSuggestions" => {
            no_args(args)?;
            wire(TagVocabularyRepositoryPort::list_staged(
                apps.repository.as_ref(),
            )?)
        }
        "client.clearTagAuditRecord" => {
            let request = one::<Value>(args)?;
            let library_id = request
                .get("libraryId")
                .and_then(Value::as_i64)
                .ok_or_else(|| "invalid_request".to_owned())?;
            let item_key = request
                .get("itemKey")
                .and_then(Value::as_str)
                .ok_or_else(|| "invalid_request".to_owned())?;
            TagVocabularyRepositoryPort::clear_audit(
                apps.repository.as_ref(),
                library_id,
                item_key,
            )?;
            Ok(json!({"ok":true}))
        }
        "client.debugSynthesisSnapshot" => {
            let _: Value = optional_one(args)?;
            debug_snapshot(apps)
        }
        "client.debugSynthesisCacheList" => {
            let _: Value = optional_one(args)?;
            Ok(debug_snapshot(apps)?
                .get("caches")
                .cloned()
                .unwrap_or_else(|| json!({"items":[]})))
        }
        "client.debugSynthesisOperationsList" => {
            let _: Value = optional_one(args)?;
            Ok(debug_snapshot(apps)?
                .get("operations")
                .cloned()
                .unwrap_or_else(|| json!({"items":[]})))
        }
        "client.debugSynthesisTopicInspect" => {
            let request = one::<Value>(args)?;
            let topic_id = request
                .get("topicId")
                .or_else(|| request.get("topic_id"))
                .and_then(Value::as_str)
                .ok_or_else(|| "invalid_request".to_owned())?;
            wire(
                DebugMaintenanceApplication::new(apps.repository.clone(), apps.canonical.clone())
                    .inspect_topic(topic_id)?,
            )
        }
        "client.applyTopicSynthesisResult" => {
            let request = match args {
                [request] => serde_json::from_value(request.clone()).unwrap_or_else(|_| {
                    synthesis_application::TopicApplyRequest {
                        bundle: request.clone(),
                        assets: Vec::new(),
                    }
                }),
                _ => return Err("invalid_request".into()),
            };
            wire(apps.topics.apply(request))
        }
        "client.consumeRelatedItemsSyncEcho" => {
            let request = one::<Value>(args)?;
            apps.call_host("effects.related_items.apply_batch", request)
        }
        "client.readPaperArtifacts" => {
            let request = one::<Value>(args)?;
            apps.call_host("library.artifacts.read", request)
        }
        "client.getPaperArtifactManifest" => {
            let request: Value = optional_one(args)?;
            apps.call_host("library.artifacts.scan_page", request)
        }
        "client.exportFilteredPaperArtifacts" => match args {
            [request] | [request, _] => {
                apps.call_host("delivery.export.publish_archive", request.clone())
            }
            _ => Err("invalid_request".into()),
        },
        _ => Err("operation_unavailable".into()),
    }
}
