use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use synthesis_application::citation_graph::{
    CitationLayoutRequest, CitationMetricsPageRequest, CitationRebuildRequest, CitationSliceRequest,
};
use synthesis_application::concept_kb::{
    ConceptDeleteRequest, ConceptDisplayUpdateRequest, ConceptReviewRequest,
};
use synthesis_application::debug_maintenance::DebugMaintenanceKind;
use synthesis_application::reference_matching::{
    ReferenceMatchingPrepareRequest, ReferenceReviewDecision,
};
use synthesis_application::reference_refresh::{
    ReferenceRefreshApplyRequest, ReferenceRefreshPrepareRequest,
};
use synthesis_application::tag_vocabulary::TagPromoteRequest;
use synthesis_application::topic_graph::{
    TopicGraphPurgeRequest, TopicGraphRelationDecisionRequest, TopicGraphRelationStatus,
    TopicGraphReviewRequest,
};
use synthesis_application::{
    CitationGraphRepositoryPort, ReferenceRefreshRepositoryPort, TagVocabularyRepositoryPort,
    TopicDetailRequest, TopicListRequest, TopicListResult, TopicRecord,
};
use synthesis_repository::{TagAuditRecord, TagStagedSuggestionRecord, TagVocabularyReplacement};

use crate::runtime_artifact_library_debug;
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

fn page_request(args: &[Value]) -> Result<(usize, usize), String> {
    let request: Value = optional_one(args)?;
    let cursor = request
        .get("cursor")
        .and_then(Value::as_u64)
        .unwrap_or_default() as usize;
    let limit = request.get("limit").and_then(Value::as_u64).unwrap_or(100) as usize;
    if limit == 0 || limit > 100 {
        return Err("invalid_request".into());
    }
    Ok((cursor, limit))
}

fn topic_detail_from_compat(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    let request = object_arg(args)?;
    let topic_id = string_field(&request, &["topicId", "topic_id"])?;
    wire(apps.topics.detail(TopicDetailRequest {
        topic_id: topic_id.to_owned(),
    })?)
}

fn expected_hash_request(args: &[Value], names: &[&str]) -> Result<String, String> {
    match args {
        [Value::String(value)] if !value.is_empty() => Ok(value.clone()),
        [request] => Ok(string_field(request, names)?.to_owned()),
        _ => Err("invalid_request".into()),
    }
}

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
    match args {
        [Value::Array(decisions)] => serde_json::from_value(Value::Array(decisions.clone()))
            .map_err(|_| "invalid_request".into()),
        [decision] => serde_json::from_value(decision.clone())
            .map(|decision| vec![decision])
            .map_err(|_| "invalid_request".into()),
        _ => Err("invalid_request".into()),
    }
}

fn concept_manifest_hash(apps: &ProductionApplications) -> Result<String, String> {
    apps.concepts
        .inspect()?
        .manifest_hash
        .ok_or_else(|| "concept_kb_not_initialized".to_owned())
}

fn topic_graph_manifest_hash(apps: &ProductionApplications) -> Result<String, String> {
    apps.topic_graph
        .inspect()?
        .manifest_hash
        .ok_or_else(|| "topic_graph_not_initialized".to_owned())
}

fn tag_vocabulary_hash(apps: &ProductionApplications) -> Result<String, String> {
    apps.tags
        .inspect()?
        .vocabulary_hash
        .ok_or_else(|| "tag_vocabulary_not_initialized".to_owned())
}

fn with_field(mut value: Value, key: &str, field: Value) -> Result<Value, String> {
    value
        .as_object_mut()
        .ok_or_else(|| "invalid_request".to_owned())?
        .insert(key.to_owned(), field);
    Ok(value)
}

fn public_concept_display_request(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<ConceptDisplayUpdateRequest, String> {
    let request = object_arg(args)?;
    let concept_id = string_field(&request, &["conceptId"])?;
    let fields = request
        .get("fields")
        .and_then(Value::as_object)
        .ok_or_else(|| "invalid_request".to_owned())?;
    let current = apps
        .concepts
        .load()?
        .concepts
        .into_iter()
        .find(|concept| concept.concept_id == concept_id)
        .ok_or_else(|| "not_found".to_owned())?;
    Ok(ConceptDisplayUpdateRequest {
        expected_manifest_hash: concept_manifest_hash(apps)?,
        concept_id: concept_id.to_owned(),
        label: fields
            .get("label")
            .and_then(Value::as_str)
            .unwrap_or(&current.label)
            .to_owned(),
        short_definition: fields
            .get("short_definition")
            .or_else(|| fields.get("shortDefinition"))
            .and_then(Value::as_str)
            .unwrap_or(&current.short_definition)
            .to_owned(),
        definition: fields
            .get("definition")
            .and_then(Value::as_str)
            .unwrap_or(&current.definition)
            .to_owned(),
        usage_note: fields
            .get("usage_note")
            .or_else(|| fields.get("usageNote"))
            .and_then(Value::as_str)
            .unwrap_or(&current.usage_note)
            .to_owned(),
        editorial_note: fields
            .get("editorial_note")
            .or_else(|| fields.get("editorialNote"))
            .and_then(Value::as_str)
            .unwrap_or(&current.editorial_note)
            .to_owned(),
    })
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
            .and_then(wire)
    }),
    ("client.listWorkflowTopicOptions", workflow_topic_options),
    ("client.getSynthesisWorkbenchChromeInput", |apps, args| {
        if !one::<Value>(args)?.is_object() {
            return Err("invalid_request".into());
        }
        apps.workbench.read_json()
    }),
    ("client.getSynthesisWorkbenchSurfaceInput", |apps, args| {
        if args.len() != 2 || !args[0].is_string() || !args[1].is_object() {
            return Err("invalid_request".into());
        }
        apps.workbench.read_json()
    }),
    ("client.getSynthesisBackgroundJobRows", |apps, args| {
        no_args(args)?;
        wire(apps.workbench.read()?.maintenance.background_jobs)
    }),
    ("client.getSchemas", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.getSchemas", args)
    }),
    ("client.getCitationGraphLayout", |apps, args| {
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
    }),
    ("client.queryCitationGraph", |apps, args| {
        let _: Value = optional_one(args)?;
        Ok(json!({
            "nodes":CitationGraphRepositoryPort::list_nodes(apps.repository.as_ref())?,
            "edges":CitationGraphRepositoryPort::list_edges(apps.repository.as_ref())?,
        }))
    }),
    ("client.queryCitationGraphCluster", |apps, args| {
        let _: Value = optional_one(args)?;
        Ok(json!({
            "nodes":CitationGraphRepositoryPort::list_nodes(apps.repository.as_ref())?,
            "edges":CitationGraphRepositoryPort::list_edges(apps.repository.as_ref())?,
        }))
    }),
    ("client.getReferenceSidecarIndex", |apps, args| {
        let _: Value = optional_one(args)?;
        Ok(json!({
            "sources":ReferenceRefreshRepositoryPort::list_sources(apps.repository.as_ref())?,
            "references":ReferenceRefreshRepositoryPort::list_raw_references(apps.repository.as_ref())?,
        }))
    }),
    ("client.isBuiltinTagPolicyInitialized", |apps, args| {
        no_args(args)?;
        Ok(Value::Bool(
            TagVocabularyRepositoryPort::get_state(apps.repository.as_ref())?.is_some(),
        ))
    }),
    ("client.loadTagVocabulary", |apps, args| {
        no_args(args)?;
        Ok(json!({
            "state":TagVocabularyRepositoryPort::get_state(apps.repository.as_ref())?,
            "entries":TagVocabularyRepositoryPort::list_entries(apps.repository.as_ref())?,
            "staged":TagVocabularyRepositoryPort::list_staged(apps.repository.as_ref())?,
            "effects":TagVocabularyRepositoryPort::list_effects(apps.repository.as_ref())?,
        }))
    }),
    ("client.exportTagVocabularyForRegulator", |apps, args| {
        no_args(args)?;
        Ok(Value::Array(
            TagVocabularyRepositoryPort::list_entries(apps.repository.as_ref())?
                .into_iter()
                .map(|entry| Value::String(entry.tag))
                .collect(),
        ))
    }),
    ("client.listStagedTagSuggestions", |apps, args| {
        no_args(args)?;
        wire(TagVocabularyRepositoryPort::list_staged(
            apps.repository.as_ref(),
        )?)
    }),
    ("client.clearTagAuditRecord", |apps, args| {
        let request = one::<Value>(args)?;
        let library_id = request
            .get("libraryId")
            .and_then(Value::as_i64)
            .ok_or_else(|| "invalid_request".to_owned())?;
        let item_key = request
            .get("itemKey")
            .and_then(Value::as_str)
            .ok_or_else(|| "invalid_request".to_owned())?;
        TagVocabularyRepositoryPort::clear_audit(apps.repository.as_ref(), library_id, item_key)?;
        Ok(json!({"ok":true}))
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
    }),
    ("client.consumeRelatedItemsSyncEcho", |apps, args| {
        let request = one::<Value>(args)?;
        apps.call_host("effects.related_items.apply_batch", request)
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
    ("client.getTopicContext", topic_detail_from_compat),
    ("client.resolveResolver", topic_detail_from_compat),
    ("client.getTopicReport", topic_detail_from_compat),
    ("client.resolveTopicPaperDigest", |apps, args| {
        let request = object_arg(args)?;
        apps.call_host("library.artifacts.read", request)
    }),
    ("client.applyLiteratureDigestSidecar", |apps, args| {
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
    }),
    ("client.deleteTopicArtifact", |apps, args| {
        let request = object_arg(args)?;
        wire(apps.topic_graph.mark_topic_relations_deleted(
            &serde_json::from_value(request).map_err(|_| "invalid_request".to_owned())?,
        ))
    }),
    ("client.purgeDeletedTopicArtifacts", |apps, args| {
        wire(
            apps.topic_graph
                .purge_deleted(&one::<TopicGraphPurgeRequest>(args)?),
        )
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
        wire(
            apps.citations
                .read_slice(one::<CitationSliceRequest>(args)?)?,
        )
    }),
    ("client.getCitationGraphMetrics", |apps, args| {
        wire(
            apps.citations
                .read_metrics(one::<CitationMetricsPageRequest>(args)?)?,
        )
    }),
    ("client.rankLibraryPapers", |apps, args| {
        let _: Value = optional_one(args)?;
        wire(CitationGraphRepositoryPort::list_complex_metrics(
            apps.repository.as_ref(),
        )?)
    }),
    ("client.refreshCitationGraphMetricsNow", |apps, args| {
        let hash = expected_hash_request(args, &["expectedGraphHash", "graphHash"])?;
        wire(apps.citations.refresh_metrics(&hash))
    }),
    ("client.startCitationGraphUpdate", |apps, args| {
        wire(
            apps.citations
                .rebuild_full(one::<CitationRebuildRequest>(args)?),
        )
    }),
    ("client.recomputeCitationGraphLayout", |apps, args| {
        wire(
            apps.citations
                .recompute_layout(one::<CitationLayoutRequest>(args)?),
        )
    }),
    ("client.rebuildCitationGraphCacheNow", |apps, args| {
        wire(
            apps.citations
                .rebuild_full(one::<CitationRebuildRequest>(args)?),
        )
    }),
    (
        "client.refreshCitationGraphCacheIncrementalNow",
        |apps, args| {
            wire(
                apps.citations
                    .rebuild_full(one::<CitationRebuildRequest>(args)?),
            )
        }
    ),
    ("client.retryCitationGraphCacheRebuild", |apps, args| {
        wire(
            apps.citations
                .rebuild_full(one::<CitationRebuildRequest>(args)?),
        )
    }),
    ("client.rankExternalReferences", |apps, args| {
        let (cursor, limit) = page_request(args)?;
        let (records, next_cursor) = apps.reference_refresh.read_references(cursor, limit)?;
        Ok(json!({"records":records,"nextCursor":next_cursor}))
    }),
    ("client.getAttentionQueue", |apps, args| {
        let (cursor, limit) = page_request(args)?;
        wire(apps.reference_matching.read_proposals(cursor, limit)?)
    }),
    ("client.startReferenceSidecarRefresh", |apps, args| {
        wire(
            apps.reference_refresh
                .prepare_refresh(one::<ReferenceRefreshPrepareRequest>(args)?),
        )
    }),
    ("client.refreshReferenceSidecarNow", |apps, args| {
        wire(
            apps.reference_refresh
                .apply_refresh(one::<ReferenceRefreshApplyRequest>(args)?),
        )
    }),
    ("client.retryReferenceSidecarRefresh", |apps, args| {
        wire(
            apps.reference_refresh
                .prepare_refresh(one::<ReferenceRefreshPrepareRequest>(args)?),
        )
    }),
    ("client.runAdvancedReferenceMatchingNow", |apps, args| {
        wire(
            apps.reference_matching
                .prepare(one::<ReferenceMatchingPrepareRequest>(args)?),
        )
    }),
    ("client.retryAdvancedReferenceMatching", |apps, args| {
        let request = object_arg(args)?;
        let preparation_id = string_field(&request, &["preparationId"])?;
        let host_basis_hash = string_field(&request, &["hostBasisHash"])?;
        wire(
            apps.reference_matching
                .apply(preparation_id, host_basis_hash),
        )
    }),
    ("client.applyCanonicalRevisionReviewAction", |apps, args| {
        wire(
            apps.reference_matching
                .review(&reference_review_decisions(args)?),
        )
    }),
    ("client.applyReferenceMatchProposalAction", |apps, args| {
        wire(
            apps.reference_matching
                .review(&reference_review_decisions(args)?),
        )
    }),
    ("client.applyReferenceMatchProposalActions", |apps, args| {
        wire(
            apps.reference_matching
                .review(&reference_review_decisions(args)?),
        )
    }),
    ("client.mergeEffectiveCanonicalReference", |apps, args| {
        apps.merge_canonical_reference(&object_arg(args)?)
    }),
    (
        "client.applyCanonicalRevisionMergeRequests",
        |apps, args| { apps.apply_canonical_merge_requests(&object_arg(args)?) }
    ),
    ("client.updateCanonicalReferenceMetadata", |apps, args| {
        apps.update_canonical_reference_metadata(&object_arg(args)?)
    }),
    ("client.archiveCanonicalReference", |apps, args| {
        apps.archive_canonical_reference(&object_arg(args)?)
    }),
    ("client.queryConceptKb", |apps, args| {
        apps.concepts.query(&object_arg(args)?)
    }),
    ("client.rebuildConceptKbIndex", |apps, args| {
        no_args(args)?;
        let hash = concept_manifest_hash(apps)?;
        wire(apps.concepts.rebuild_index(&hash))
    }),
    ("client.updateConceptDisplayText", |apps, args| {
        wire(
            apps.concepts
                .update_display_text(&public_concept_display_request(apps, args)?),
        )
    }),
    ("client.applyConceptReviewAction", |apps, args| {
        let mut request = object_arg(args)?;
        let action = match string_field(&request, &["action"])? {
            "approve_create" => "approve",
            "merge_into_existing" => "merge",
            "reject" => "reject",
            _ => return Err("invalid_request".into()),
        };
        request["action"] = Value::String(action.into());
        let request = with_field(
            request,
            "expectedManifestHash",
            Value::String(concept_manifest_hash(apps)?),
        )?;
        wire(
            apps.concepts.review(
                &serde_json::from_value::<ConceptReviewRequest>(request)
                    .map_err(|_| "invalid_request".to_owned())?,
            ),
        )
    }),
    ("client.deleteConceptEntries", |apps, args| {
        let request = with_field(
            object_arg(args)?,
            "expectedManifestHash",
            Value::String(concept_manifest_hash(apps)?),
        )?;
        wire(
            apps.concepts.delete_concepts(
                &serde_json::from_value::<ConceptDeleteRequest>(request)
                    .map_err(|_| "invalid_request".to_owned())?,
            ),
        )
    }),
    ("client.rebuildTopicGraphIndex", |apps, args| {
        no_args(args)?;
        let hash = topic_graph_manifest_hash(apps)?;
        wire(apps.topic_graph.rebuild_index(&hash))
    }),
    ("client.acceptTopicGraphRelation", |apps, args| {
        let request = object_arg(args)?;
        let request = TopicGraphRelationDecisionRequest {
            expected_manifest_hash: topic_graph_manifest_hash(apps)?,
            edge_id: string_field(&request, &["edgeId"])?.to_owned(),
            status: TopicGraphRelationStatus::Confirmed,
        };
        wire(apps.topic_graph.decide_relation(&request))
    }),
    ("client.rejectTopicGraphRelation", |apps, args| {
        let request = object_arg(args)?;
        let request = TopicGraphRelationDecisionRequest {
            expected_manifest_hash: topic_graph_manifest_hash(apps)?,
            edge_id: string_field(&request, &["edgeId"])?.to_owned(),
            status: TopicGraphRelationStatus::Rejected,
        };
        wire(apps.topic_graph.decide_relation(&request))
    }),
    ("client.applyTopicGraphReviewAction", |apps, args| {
        let request = with_field(
            object_arg(args)?,
            "expectedManifestHash",
            Value::String(topic_graph_manifest_hash(apps)?),
        )?;
        wire(
            apps.topic_graph.review(
                &serde_json::from_value::<TopicGraphReviewRequest>(request)
                    .map_err(|_| "invalid_request".to_owned())?,
            ),
        )
    }),
    ("client.saveTagVocabulary", |apps, args| {
        let (expected, candidate) = tag_candidate_request(args)?;
        wire(apps.tags.save(expected.as_deref(), &candidate))
    }),
    ("client.validateTagVocabulary", |apps, args| {
        wire(
            apps.tags
                .validate(&one::<TagVocabularyReplacement>(args)?)?,
        )
    }),
    ("client.rebuildTagVocabularyIndex", |apps, args| {
        no_args(args)?;
        let hash = tag_vocabulary_hash(apps)?;
        wire(apps.tags.rebuild_index(&hash))
    }),
    ("client.stageTagSuggestions", |apps, args| {
        let (revision, staged) = staged_request(args)?;
        wire(apps.tags.stage(revision, &staged))
    }),
    ("client.updateStagedTagSuggestion", |apps, args| {
        let (revision, staged) = staged_request(args)?;
        wire(apps.tags.update_staged(revision, &staged))
    }),
    ("client.updateTagVocabularyEntry", |apps, args| {
        let (expected, candidate) = tag_candidate_request(args)?;
        wire(apps.tags.update_entry(expected.as_deref(), &candidate))
    }),
    ("client.deleteTagVocabularyEntry", |apps, args| {
        let (expected, candidate) = tag_candidate_request(args)?;
        wire(apps.tags.delete_entry(expected.as_deref(), &candidate))
    }),
    ("client.promoteStagedTagSuggestions", |apps, args| {
        let request = object_arg(args)?;
        let tags = request
            .get("tags")
            .cloned()
            .ok_or_else(|| "invalid_request".to_owned())?;
        wire(
            apps.tags.promote(
                &serde_json::from_value::<TagPromoteRequest>(json!({
                    "expectedVocabularyHash":tag_vocabulary_hash(apps)?,
                    "expectedStagedRevision":apps.tags.inspect()?.staged_revision,
                    "tags":tags,
                }))
                .map_err(|_| "invalid_request".to_owned())?,
            ),
        )
    }),
    ("client.discardStagedTagSuggestions", |apps, args| {
        let (revision, retained) = staged_request(args)?;
        wire(apps.tags.discard(revision, &retained))
    }),
    ("client.clearStagedTagSuggestions", |apps, args| {
        no_args(args)?;
        let revision = apps.tags.inspect()?.staged_revision;
        wire(apps.tags.clear_staged(revision))
    }),
    ("client.previewTagVocabularyImport", |apps, args| {
        wire(
            apps.tags
                .validate(&one::<TagVocabularyReplacement>(args)?)?,
        )
    }),
    ("client.applyTagVocabularyImport", |apps, args| {
        let (expected, candidate) = tag_candidate_request(args)?;
        wire(apps.tags.save(expected.as_deref(), &candidate))
    }),
    ("client.replaceTagAuditRecords", |apps, args| {
        let records = match args {
            [Value::Array(records)] => records.clone(),
            [record] => vec![record.clone()],
            _ => return Err("invalid_request".into()),
        };
        records
            .into_iter()
            .map(|record| {
                serde_json::from_value::<TagAuditRecord>(record)
                    .map_err(|_| "invalid_request".to_owned())
                    .and_then(|record| wire(apps.tags.replace_audit(&record)))
            })
            .collect::<Result<Vec<_>, String>>()
            .map(Value::Array)
    }),
    ("client.initializeBuiltinTagPolicy", |apps, args| {
        no_args(args)?;
        apps.initialize_builtin_tag_policy()
    }),
    ("client.getPublicMaintenanceOperation", |apps, args| {
        let _: Value = optional_one(args)?;
        wire(apps.workbench.read()?.maintenance)
    }),
    ("client.getLibraryIndex", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.getLibraryIndex", args)
    }),
    ("client.getReviewInput", |apps, args| {
        let (cursor, limit) = page_request(args)?;
        Ok(json!({
            "reference":apps.reference_matching.read_proposals(cursor,limit)?,
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
        wire(
            apps.debug
                .run_maintenance(DebugMaintenanceKind::Reset, &object_arg(args)?)?,
        )
    }),
    (
        "client.reconcileSynthesisRuntimeWorkStateOnStartup",
        |apps, args| {
            no_args(args)?;
            apps.workbench.read_json()
        }
    ),
    ("client.resetSynthesisDatabase", |apps, args| {
        wire(
            apps.debug
                .run_maintenance(DebugMaintenanceKind::Reset, &object_arg(args)?)?,
        )
    }),
    ("client.syncWebDavNow", |apps, args| {
        no_args(args)?;
        wire(apps.webdav.trigger_webdav_sync()?)
    }),
    ("client.pauseWebDavSync", |apps, args| {
        no_args(args)?;
        wire(apps.webdav.pause_webdav_sync()?)
    }),
    ("client.resumeWebDavSync", |apps, args| {
        no_args(args)?;
        wire(apps.webdav.resume_webdav_sync()?)
    }),
    ("client.retryWebDavSync", |apps, args| {
        no_args(args)?;
        wire(apps.webdav.retry_webdav_sync()?)
    }),
    ("client.resolveWebDavSyncConflict", |apps, args| {
        let request = object_arg(args)?;
        wire(
            apps.webdav
                .resolve_webdav_sync_conflict(string_field(&request, &["action"])?)?,
        )
    }),
);

#[cfg(test)]
fn dispatched_production_client_capabilities() -> impl Iterator<Item = &'static str> {
    PRODUCTION_CLIENT_HANDLERS
        .iter()
        .map(|handler| handler.capability)
}

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
    use synthesis_repository::{CanonicalReferenceRecord, Repository, RepositoryIdentity};
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

    #[test]
    fn registered_handlers_are_unique_and_declared() {
        let declared = production_client_capabilities()
            .unwrap()
            .into_iter()
            .collect::<BTreeSet<_>>();
        let registered = dispatched_production_client_capabilities()
            .map(str::to_owned)
            .collect::<BTreeSet<_>>();
        assert_eq!(registered.len(), PRODUCTION_CLIENT_HANDLERS.len());
        assert!(registered.is_subset(&declared));
    }

    #[test]
    fn every_declared_client_operation_has_exactly_one_handler() {
        let declared = production_client_capabilities()
            .unwrap()
            .into_iter()
            .collect::<BTreeSet<_>>();
        let registered = dispatched_production_client_capabilities()
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
            .map(str::to_owned)
            .collect::<BTreeSet<_>>();
        assert!(ready.is_subset(&registered));
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
}
