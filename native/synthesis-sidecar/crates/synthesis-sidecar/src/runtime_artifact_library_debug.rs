use serde_json::{Map, Value, json};
use synthesis_application::{TopicListRequest, TopicListResult};
use synthesis_canonical_store::canonical_json_hash;

use crate::runtime_production_ports::ProductionApplications;

const SCHEMA_MANIFEST: &str = include_str!(
    "../../../../../packages/synthesis-contracts/contract-set/synthesis-artifact-library-debug-surface-v1/schemas.json"
);
const PAGE_DEFAULT: usize = 50;
const PAGE_MAX: usize = 100;
const COLLECT_MAX: usize = 1_000;

pub(crate) fn dispatch(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Result<Value, String> {
    match capability {
        "client.getSchemas" => schemas(args),
        "client.readPaperArtifacts" => read_artifacts(apps, args),
        "client.getPaperArtifactManifest" => manifest(apps, args),
        "client.exportFilteredPaperArtifacts" => export(apps, args),
        "client.getLibraryIndex" => library_index(apps, args),
        "client.debugSynthesisSnapshot" => debug_snapshot(apps, args),
        "client.debugSynthesisCacheList" => debug_cache_list(apps, args),
        "client.debugSynthesisOperationsList" => debug_operations_list(apps, args),
        "client.debugSynthesisProfilerList" => debug_profiler(apps, args),
        "client.debugSynthesisPaperInspect" => debug_paper(apps, args),
        "client.debugSynthesisTopicInspect" => debug_topic(apps, args),
        "client.debugSynthesisDiff" => debug_diff(apps, args),
        _ => Err("operation_unavailable".into()),
    }
}

fn one_object(args: &[Value]) -> Result<Value, String> {
    match args {
        [] => Ok(json!({})),
        [value] if value.is_object() => Ok(value.clone()),
        _ => Err("invalid_request".into()),
    }
}

fn string_list(request: &Value, names: &[&str]) -> Result<Vec<String>, String> {
    let value = names.iter().find_map(|name| request.get(*name));
    match value {
        None => Ok(Vec::new()),
        Some(Value::String(value)) if !value.trim().is_empty() => Ok(vec![value.trim().into()]),
        Some(Value::Array(values)) if values.len() <= PAGE_MAX => values
            .iter()
            .map(|value| {
                value
                    .as_str()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(str::to_owned)
                    .ok_or_else(|| "invalid_request".to_owned())
            })
            .collect(),
        _ => Err("invalid_request".into()),
    }
}

fn limit(request: &Value, default: usize) -> Result<usize, String> {
    let limit = request
        .get("limit")
        .and_then(Value::as_u64)
        .unwrap_or(default as u64) as usize;
    if !(1..=PAGE_MAX).contains(&limit) {
        return Err("invalid_request".into());
    }
    Ok(limit)
}

fn offset(request: &Value, names: &[&str]) -> Result<usize, String> {
    let raw = names.iter().find_map(|name| request.get(*name));
    match raw {
        None => Ok(0),
        Some(Value::String(value)) if value.is_empty() => Ok(0),
        Some(Value::String(value)) => value
            .parse::<usize>()
            .map_err(|_| "invalid_request".to_owned()),
        Some(Value::Number(value)) => value
            .as_u64()
            .map(|value| value as usize)
            .ok_or_else(|| "invalid_request".to_owned()),
        _ => Err("invalid_request".into()),
    }
}

fn host_request(
    request: &Value,
    cursor: &str,
    limit: usize,
    artifacts: bool,
) -> Result<Value, String> {
    let mut payload = Map::new();
    payload.insert("cursor".into(), Value::String(cursor.into()));
    payload.insert("limit".into(), Value::from(limit));
    if artifacts {
        let refs = string_list(
            request,
            &["paper_refs", "paperRefs", "paper_ref", "paperRef"],
        )?;
        if !refs.is_empty() {
            payload.insert("paperRefs".into(), json!(refs));
        }
        let kinds = string_list(request, &["artifact_types", "artifactTypes"])?;
        if !kinds.is_empty() {
            payload.insert("artifactTypes".into(), json!(kinds));
        }
    }
    Ok(Value::Object(payload))
}

fn scan_descriptors(apps: &ProductionApplications, request: &Value) -> Result<Vec<Value>, String> {
    let mut cursor = String::new();
    let mut descriptors = Vec::new();
    for _ in 0..COLLECT_MAX / PAGE_MAX {
        let page = apps.call_host(
            "library.artifacts.scan_page",
            host_request(request, &cursor, PAGE_MAX, true)?,
        )?;
        let object = page
            .as_object()
            .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
        let rows = object
            .get("artifacts")
            .and_then(Value::as_array)
            .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
        descriptors.extend(rows.iter().cloned());
        if descriptors.len() > COLLECT_MAX {
            return Err("artifact_limit_exceeded".into());
        }
        if object.get("hasMore").and_then(Value::as_bool) != Some(true) {
            return Ok(descriptors);
        }
        let next = object
            .get("nextCursor")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "host_page_invalid".to_owned())?;
        if next == cursor {
            return Err("host_page_invalid".into());
        }
        cursor = next.into();
    }
    Err("artifact_limit_exceeded".into())
}

fn artifact_from_descriptor(
    apps: &ProductionApplications,
    descriptor: &Value,
    include_content: bool,
) -> Result<Value, String> {
    let object = descriptor
        .as_object()
        .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
    let paper_ref = object
        .get("paperRef")
        .and_then(Value::as_str)
        .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
    let artifact_type = object
        .get("artifactType")
        .and_then(Value::as_str)
        .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
    let payload_type = object
        .get("payloadType")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let status = object
        .get("status")
        .and_then(Value::as_str)
        .unwrap_or("missing");
    let mut result = json!({
        "paper_ref": paper_ref,
        "artifact_type": artifact_type,
        "payload_type": payload_type,
        "status": status,
        "diagnostics": object.get("diagnostics").cloned().unwrap_or_else(|| json!([])),
    });
    if let Some(hash) = object.get("payloadHash").and_then(Value::as_str) {
        result["payload_hash"] = json!(hash);
    }
    if include_content && status == "available" {
        let locator = object
            .get("locator")
            .and_then(Value::as_str)
            .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
        let expected_hash = object
            .get("payloadHash")
            .and_then(Value::as_str)
            .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
        let content = apps.call_host(
            "library.artifacts.read",
            json!({"locator":locator,"expectedHash":expected_hash}),
        )?;
        let content_object = content
            .as_object()
            .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
        match content_object.get("status").and_then(Value::as_str) {
            Some("available") => {
                if let Some(payload) = content_object.get("content") {
                    result["payload"] = payload.clone();
                }
                result["diagnostics"] = content_object
                    .get("diagnostics")
                    .cloned()
                    .unwrap_or_else(|| json!([]));
            }
            Some("stale") => return Err("synthesis_host_artifact_stale".into()),
            Some(status) => {
                result["status"] = json!(status);
                result["diagnostics"] = content_object
                    .get("diagnostics")
                    .cloned()
                    .unwrap_or_else(|| json!([]));
            }
            None => return Err("reverse_host_result_invalid".into()),
        }
    }
    Ok(result)
}

fn read_artifacts(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args)?;
    let artifacts = scan_descriptors(apps, &request)?
        .iter()
        .map(|descriptor| artifact_from_descriptor(apps, descriptor, true))
        .collect::<Result<Vec<_>, _>>()?;
    let diagnostics = artifacts
        .iter()
        .filter_map(|artifact| artifact.get("diagnostics").and_then(Value::as_array))
        .flatten()
        .cloned()
        .collect::<Vec<_>>();
    Ok(json!({"artifacts":artifacts,"diagnostics":diagnostics}))
}

fn manifest(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let mut result = read_artifacts(apps, args)?;
    let diagnostics = result
        .get("diagnostics")
        .cloned()
        .unwrap_or_else(|| json!([]));
    let artifacts = result
        .get_mut("artifacts")
        .and_then(Value::as_array_mut)
        .ok_or_else(|| "production_projection_invalid".to_owned())?;
    for artifact in artifacts.iter_mut() {
        if let Some(object) = artifact.as_object_mut() {
            object.remove("payload");
            object.remove("markdown");
            object.remove("decoded_text");
        }
    }
    let total = artifacts.len();
    Ok(json!({"artifacts":artifacts,"diagnostics":diagnostics,"total":total}))
}

fn export(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = match args {
        [request] if request.is_object() => request.clone(),
        [request, delivery]
            if request.is_object()
                && delivery.as_object().is_some_and(|delivery| {
                    delivery.len() == 1 && delivery.get("mode") == Some(&json!("remote"))
                }) =>
        {
            request.clone()
        }
        _ => return Err("invalid_request".into()),
    };
    let paper_refs = string_list(
        &request,
        &["paper_refs", "paperRefs", "paper_ref", "paperRef"],
    )?;
    if paper_refs.is_empty() {
        return Err("invalid_request".into());
    }
    let read = read_artifacts(apps, std::slice::from_ref(&request))?;
    let artifacts = read
        .get("artifacts")
        .and_then(Value::as_array)
        .ok_or_else(|| "production_projection_invalid".to_owned())?;
    let mut entries = Vec::new();
    let mut statuses = Vec::new();
    for artifact in artifacts {
        let paper_ref = artifact
            .get("paper_ref")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let artifact_type = artifact
            .get("artifact_type")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let status = artifact
            .get("status")
            .and_then(Value::as_str)
            .unwrap_or("missing");
        statuses.push(json!({"paper_ref":paper_ref,"artifact_type":artifact_type,"payload_type":artifact.get("payload_type").cloned().unwrap_or(Value::Null),"status":status,"missing_reason":""}));
        if status == "available" {
            let file = format!(
                "runtime/payloads/{}/{}.json",
                safe_segment(paper_ref),
                safe_segment(artifact_type)
            );
            let text =
                serde_json::to_string_pretty(artifact.get("payload").unwrap_or(&Value::Null))
                    .map_err(|_| "production_projection_invalid".to_owned())?;
            entries.push(json!({"path":file,"text":text}));
        }
    }
    let manifest_path = "runtime/payloads/paper-artifacts-manifest.json";
    entries.insert(0, json!({"path":manifest_path,"text":serde_json::to_string_pretty(&json!({"schema_id":"synthesis.filtered_paper_artifacts_manifest","paper_refs":paper_refs,"artifact_statuses":statuses})).map_err(|_| "production_projection_invalid".to_owned())?}));
    let delivery = apps.call_host("delivery.export.publish_archive", json!({"capability":"paper_artifacts.export_filtered","displayName":"paper-artifacts.zip","entries":entries}))?;
    Ok(
        json!({"paper_refs":paper_refs,"manifest_file":manifest_path,"artifact_statuses":statuses,"diagnostics":read.get("diagnostics").cloned().unwrap_or_else(|| json!([])),"delivery":delivery}),
    )
}

fn safe_segment(value: &str) -> String {
    value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '-' || character == '_' {
                character
            } else {
                '-'
            }
        })
        .collect()
}

fn schemas(args: &[Value]) -> Result<Value, String> {
    let _ = one_object(args)?;
    serde_json::from_str(SCHEMA_MANIFEST).map_err(|_| "production_projection_invalid".into())
}

fn all_library_items(apps: &ProductionApplications) -> Result<Vec<Value>, String> {
    let mut cursor = String::new();
    let mut items = Vec::new();
    for _ in 0..COLLECT_MAX / PAGE_MAX {
        let page = apps.call_host(
            "library.items.list_page",
            host_request(&json!({}), &cursor, PAGE_MAX, false)?,
        )?;
        let object = page
            .as_object()
            .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
        let rows = object
            .get("items")
            .and_then(Value::as_array)
            .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
        items.extend(rows.iter().cloned());
        if items.len() > COLLECT_MAX {
            return Err("library_limit_exceeded".into());
        }
        if object.get("hasMore").and_then(Value::as_bool) != Some(true) {
            return Ok(items);
        }
        let next = object
            .get("nextCursor")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "host_page_invalid".to_owned())?;
        if next == cursor {
            return Err("host_page_invalid".into());
        }
        cursor = next.into();
    }
    Err("library_limit_exceeded".into())
}

fn library_index(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args)?;
    let items = all_library_items(apps)?;
    let mut papers = items
        .iter()
        .map(host_paper)
        .collect::<Result<Vec<_>, _>>()?;
    papers.sort_by(|left, right| {
        left.get("title")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .cmp(
                right
                    .get("title")
                    .and_then(Value::as_str)
                    .unwrap_or_default(),
            )
    });
    let library_id = papers
        .first()
        .and_then(|row| row.get("library_id"))
        .cloned()
        .unwrap_or(Value::from(1));
    let tags = counted(papers.iter(), "tags", "tag");
    let collections = counted(papers.iter(), "collections", "key");
    let topics = all_topics(apps)?;
    let registry = papers.clone();
    let index_hash = canonical_json_hash(
        &json!({"libraryId":library_id,"papers":papers,"tags":tags,"collections":collections,"topics":topics,"registry":registry}),
    )?;
    let start = offset(&request, &["cursor"])?;
    let page_limit = limit(&request, PAGE_DEFAULT)?;
    if start > papers.len() {
        return Err("invalid_request".into());
    }
    let page = papers[start..papers.len().min(start + page_limit)].to_vec();
    let next = start + page.len();
    let has_more = next < papers.len();
    let mut response = json!({"libraryId":library_id,"papers":page,"cursor":start.to_string(),"next_cursor":if has_more { next.to_string() } else { String::new() },"has_more":has_more,"returned":page.len(),"total_papers":papers.len(),"limit":page_limit,"index_hash":index_hash,"pagination":{"papers":{"cursor":start.to_string(),"nextCursor":if has_more { next.to_string() } else { String::new() },"hasMore":has_more,"returned":page.len(),"total":papers.len(),"limit":page_limit}}});
    if request.get("includeTags").and_then(Value::as_bool) == Some(true) {
        response["tags"] = page_named(
            &tags,
            &request,
            &["tagCursor", "tag_cursor"],
            &["tagLimit", "tag_limit"],
        )?;
    }
    if request.get("includeCollections").and_then(Value::as_bool) == Some(true) {
        response["collections"] = page_named(
            &collections,
            &request,
            &["collectionCursor", "collection_cursor"],
            &["collectionLimit", "collection_limit"],
        )?;
    }
    if request.get("includeItems").and_then(Value::as_bool) == Some(true) {
        response["topics"] = page_named(
            &topics,
            &request,
            &["topicCursor", "topic_cursor"],
            &["topicLimit", "topic_limit"],
        )?;
        response["registry"] = page_named(
            &registry,
            &request,
            &["registryCursor", "registry_cursor"],
            &["registryLimit", "registry_limit"],
        )?;
    }
    response["page_hash"] = json!(canonical_json_hash(&response)?);
    Ok(response)
}

fn host_paper(item: &Value) -> Result<Value, String> {
    let item = item
        .as_object()
        .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
    Ok(
        json!({"paper_ref":item.get("paperRef").cloned().unwrap_or(Value::String(String::new())),"library_id":item.get("libraryId").cloned().unwrap_or(Value::from(1)),"item_key":item.get("itemKey").cloned().unwrap_or(Value::String(String::new())),"title":item.get("title").cloned().unwrap_or(Value::String(String::new())),"year":item.get("year").cloned().unwrap_or(Value::String(String::new())),"item_type":item.get("itemType").cloned().unwrap_or(Value::String(String::new())),"creators":item.get("creators").cloned().unwrap_or_else(|| json!([])),"tags":item.get("tags").cloned().unwrap_or_else(|| json!([])),"collections":item.get("collections").cloned().unwrap_or_else(|| json!([]))}),
    )
}
fn counted<'a>(rows: impl Iterator<Item = &'a Value>, field: &str, output: &str) -> Vec<Value> {
    let mut counts = std::collections::BTreeMap::<String, usize>::new();
    for row in rows {
        for value in row
            .get(field)
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
        {
            *counts.entry(value.into()).or_default() += 1;
        }
    }
    counts
        .into_iter()
        .map(|(value, count)| {
            if output == "tag" {
                json!({"tag":value,"count":count})
            } else {
                json!({"id":value,"key":value,"name":value,"library_id":1,"item_count":count})
            }
        })
        .collect()
}
fn all_topics(apps: &ProductionApplications) -> Result<Vec<Value>, String> {
    let TopicListResult { topics, .. } = apps.topics.list(TopicListRequest {
        cursor: String::new(),
        limit: PAGE_MAX,
    })?;
    topics
        .into_iter()
        .map(|topic| {
            serde_json::to_value(topic).map_err(|_| "production_projection_invalid".to_owned())
        })
        .collect()
}
fn page_named(
    rows: &[Value],
    request: &Value,
    cursors: &[&str],
    limits: &[&str],
) -> Result<Value, String> {
    let start = offset(request, cursors)?;
    let raw_limit = limits
        .iter()
        .find_map(|name| request.get(*name))
        .cloned()
        .unwrap_or_else(|| {
            request
                .get("limit")
                .cloned()
                .unwrap_or(Value::from(PAGE_DEFAULT))
        });
    let limit = limit(&json!({"limit":raw_limit}), PAGE_DEFAULT)?;
    if start > rows.len() {
        return Err("invalid_request".into());
    }
    let page = rows[start..rows.len().min(start + limit)].to_vec();
    let next = start + page.len();
    Ok(
        json!({"items":page,"cursor":start.to_string(),"nextCursor":if next<rows.len(){next.to_string()}else{String::new()},"hasMore":next<rows.len(),"returned":page.len(),"total":rows.len(),"limit":limit}),
    )
}

fn debug_snapshot(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let _ = one_object(args)?;
    serde_json::to_value(apps.debug.snapshot()?).map_err(|_| "production_projection_invalid".into())
}
fn debug_cache_list(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args)?;
    let snapshot = debug_snapshot(apps, &[])?;
    let mut items = snapshot
        .pointer("/caches/items")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    if let Some(kind) = request
        .get("cacheKind")
        .or_else(|| request.get("cache_kind"))
        .and_then(Value::as_str)
    {
        items.retain(|item| item.get("cacheKind").and_then(Value::as_str) == Some(kind));
    }
    page_debug(items, &request)
}
fn debug_operations_list(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args)?;
    let snapshot = debug_snapshot(apps, &[])?;
    page_debug(
        snapshot
            .pointer("/operations/items")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default(),
        &request,
    )
}
fn page_debug(items: Vec<Value>, request: &Value) -> Result<Value, String> {
    let start = offset(request, &["cursor"])?;
    let limit = limit(request, PAGE_DEFAULT)?;
    if start > items.len() {
        return Err("invalid_request".into());
    }
    let page = items[start..items.len().min(start + limit)].to_vec();
    let next = start + page.len();
    Ok(
        json!({"rows":page,"total":items.len(),"truncated":next<items.len(),"cursor":start.to_string(),"next_cursor":if next<items.len(){next.to_string()}else{String::new()},"has_more":next<items.len(),"limit":limit}),
    )
}
fn debug_profiler(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let _ = one_object(args)?;
    serde_json::to_value(apps.debug.inspect_profiler()?)
        .map_err(|_| "production_projection_invalid".into())
}
fn debug_paper(_apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args)?;
    request
        .get("paperRef")
        .or_else(|| request.get("paper_ref"))
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "invalid_request".to_owned())?;
    Ok(json!({"status":"unavailable","diagnostics":[]}))
}
fn debug_topic(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args)?;
    let topic_id = request
        .get("topicId")
        .or_else(|| request.get("topic_id"))
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "invalid_request".to_owned())?;
    serde_json::to_value(apps.debug.inspect_topic(topic_id)?)
        .map_err(|_| "production_projection_invalid".into())
}
fn debug_diff(_apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args)?;
    let _ = limit(&request, PAGE_DEFAULT)?;
    Ok(json!({"status":"unavailable","diagnostics":[]}))
}
