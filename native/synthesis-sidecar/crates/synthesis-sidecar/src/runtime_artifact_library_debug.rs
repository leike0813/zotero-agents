use serde_json::{Map, Value, json};
use std::collections::HashSet;
use synthesis_application::{TopicListRequest, TopicListResult};

use synthesis_canonical_store::{canonical_json_hash, content_sha256};

use crate::runtime_production_ports::ProductionApplications;

const SCHEMA_MANIFEST: &str = include_str!(
    "../../../../../packages/synthesis-contracts/contract-set/synthesis-artifact-library-debug-surface-v1/schemas.json"
);
const PAGE_DEFAULT: usize = 50;
const PAGE_MAX: usize = 100;
const COLLECT_MAX: usize = 1_000;

type ProductionClientHandler = fn(&ProductionApplications, &[Value]) -> Result<Value, String>;

struct RegisteredProductionClientHandler {
    capability: &'static str,
    dispatch: ProductionClientHandler,
}

macro_rules! register_production_client_handlers {
    ($(($capability:literal, $handler:expr)),+ $(,)?) => {
        const ARTIFACT_LIBRARY_DEBUG_CLIENT_HANDLERS: &[RegisteredProductionClientHandler] = &[
            $(RegisteredProductionClientHandler { capability: $capability, dispatch: $handler }),+
        ];
    };
}

register_production_client_handlers!(
    ("client.getSchemas", |_, args| schemas(args)),
    ("client.readPaperArtifacts", read_artifacts),
    ("client.getPaperArtifactManifest", manifest),
    ("client.exportFilteredPaperArtifacts", export),
    ("client.resolveTopicPaperDigest", resolve_topic_paper_digest),
    ("client.getLibraryIndex", library_index),
    ("client.debugSynthesisSnapshot", debug_snapshot),
    ("client.debugSynthesisCacheList", debug_cache_list),
    ("client.debugSynthesisOperationsList", debug_operations_list),
    ("client.debugSynthesisProfilerList", debug_profiler),
    ("client.debugSynthesisPaperInspect", debug_paper),
    ("client.debugSynthesisTopicInspect", debug_topic),
    ("client.debugSynthesisDiff", debug_diff),
);

pub(crate) fn dispatch(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Option<Result<Value, String>> {
    ARTIFACT_LIBRARY_DEBUG_CLIENT_HANDLERS
        .iter()
        .find(|handler| handler.capability == capability)
        .map(|handler| (handler.dispatch)(apps, args))
}

#[cfg(test)]
pub(crate) fn dispatched_capabilities() -> impl Iterator<Item = &'static str> {
    ARTIFACT_LIBRARY_DEBUG_CLIENT_HANDLERS
        .iter()
        .map(|handler| handler.capability)
}

fn one_object(args: &[Value]) -> Result<Value, String> {
    match args {
        [] => Ok(json!({})),
        [value] if value.is_object() => Ok(value.clone()),
        _ => Err("invalid_request".into()),
    }
}

fn required_object(args: &[Value]) -> Result<Value, String> {
    match args {
        [value] if value.is_object() => Ok(value.clone()),
        _ => Err("invalid_request".into()),
    }
}

fn optional_string_field<'a>(value: &'a Value, names: &[&str]) -> Option<&'a str> {
    names
        .iter()
        .find_map(|name| value.get(*name).and_then(Value::as_str))
        .filter(|value| !value.is_empty())
}

fn resolve_topic_paper_digest(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    let request = required_object(args)?;
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
    if let Some(quality) = object.get("literatureQuality") {
        result["literature_quality"] = quality.clone();
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
                if let Some(content) = content_object.get("content").and_then(Value::as_object) {
                    match content.get("kind").and_then(Value::as_str) {
                        Some("json") => {
                            result["payload"] =
                                content.get("value").cloned().unwrap_or(Value::Null);
                        }
                        Some("text") => {
                            let text = content
                                .get("text")
                                .and_then(Value::as_str)
                                .unwrap_or_default();
                            result["payload"] = json!(text);
                            result["decoded_text"] = json!(text);
                            if content.get("mediaType").and_then(Value::as_str)
                                == Some("text/markdown")
                            {
                                result["markdown"] = json!(text);
                            }
                        }
                        _ => return Err("reverse_host_result_invalid".into()),
                    }
                }
                let mut diagnostics = result
                    .get("diagnostics")
                    .and_then(Value::as_array)
                    .cloned()
                    .unwrap_or_default();
                diagnostics.extend(
                    content_object
                        .get("diagnostics")
                        .and_then(Value::as_array)
                        .cloned()
                        .unwrap_or_default(),
                );
                result["diagnostics"] = json!(diagnostics);
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
    let mut artifacts = scan_descriptors(apps, &request)?
        .iter()
        .map(|descriptor| artifact_from_descriptor(apps, descriptor, true))
        .collect::<Result<Vec<_>, _>>()?;
    for index in 0..artifacts.len() {
        let paper_ref = artifacts[index]
            .get("paper_ref")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let mut seen = HashSet::new();
        let payload_types_seen = artifacts
            .iter()
            .filter(|artifact| artifact.get("paper_ref").and_then(Value::as_str) == Some(paper_ref))
            .filter_map(|artifact| artifact.get("payload_type").and_then(Value::as_str))
            .filter(|payload_type| {
                !payload_type.is_empty() && seen.insert((*payload_type).to_owned())
            })
            .map(|payload_type| Value::String(payload_type.to_owned()))
            .collect::<Vec<_>>();
        artifacts[index]["payload_types_seen"] = Value::Array(payload_types_seen);
    }
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

#[derive(Clone, Copy, PartialEq, Eq)]
enum ExportMode {
    Local,
    Remote,
}

pub(crate) enum ArtifactExportDestination {
    RunWorkspace { run_root: String },
    Archive { display_name: String },
}

pub(crate) struct ArtifactExportPlan {
    pub(crate) response: Value,
    pub(crate) entries: Value,
    pub(crate) destination: ArtifactExportDestination,
}

fn export(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let ArtifactExportPlan {
        response,
        entries,
        destination,
    } = prepare_export(apps, args)?;
    let destination = match destination {
        ArtifactExportDestination::RunWorkspace { run_root } => {
            json!({"mode":"run_workspace","runRoot":run_root})
        }
        ArtifactExportDestination::Archive { display_name } => {
            json!({"mode":"archive","displayName":display_name})
        }
    };
    Ok(json!({
        "kind":"artifact_export_delivery.v1",
        "response":response,
        "entries":entries,
        "destination":destination,
    }))
}

pub(crate) fn rebuild_export_plan(value: Value) -> Result<ArtifactExportPlan, String> {
    let mut object = match value {
        Value::Object(object) if object.len() == 4 => object,
        _ => return Err("production_projection_invalid".into()),
    };
    if object
        .remove("kind")
        .and_then(|value| value.as_str().map(str::to_owned))
        != Some("artifact_export_delivery.v1".to_owned())
    {
        return Err("production_projection_invalid".into());
    }
    let response = object
        .remove("response")
        .filter(Value::is_object)
        .ok_or_else(|| "production_projection_invalid".to_owned())?;
    let entries = object
        .remove("entries")
        .filter(Value::is_array)
        .ok_or_else(|| "production_projection_invalid".to_owned())?;
    let destination = object
        .remove("destination")
        .and_then(|value| value.as_object().cloned())
        .ok_or_else(|| "production_projection_invalid".to_owned())?;
    let destination = match destination.get("mode").and_then(Value::as_str) {
        Some("run_workspace") if destination.len() == 2 => {
            ArtifactExportDestination::RunWorkspace {
                run_root: destination
                    .get("runRoot")
                    .and_then(Value::as_str)
                    .filter(|value| !value.is_empty())
                    .ok_or_else(|| "production_projection_invalid".to_owned())?
                    .to_owned(),
            }
        }
        Some("archive") if destination.len() == 2 => ArtifactExportDestination::Archive {
            display_name: destination
                .get("displayName")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| "production_projection_invalid".to_owned())?
                .to_owned(),
        },
        _ => return Err("production_projection_invalid".into()),
    };
    Ok(ArtifactExportPlan {
        response,
        entries,
        destination,
    })
}

struct ExportContent {
    path: String,
    text: String,
    hash: String,
    diagnostics: Vec<Value>,
    removed_trailing_section_heading: Option<String>,
}

fn export_request(args: &[Value]) -> Result<(Value, ExportMode), String> {
    match args {
        [request] if request.is_object() => Ok((request.clone(), ExportMode::Local)),
        [request, delivery] if request.is_object() => {
            let delivery = delivery
                .as_object()
                .filter(|delivery| delivery.len() == 1)
                .ok_or_else(|| "invalid_request".to_owned())?;
            match delivery.get("mode").and_then(Value::as_str) {
                Some("local") => Ok((request.clone(), ExportMode::Local)),
                Some("remote") => Ok((request.clone(), ExportMode::Remote)),
                _ => Err("invalid_request".into()),
            }
        }
        _ => Err("invalid_request".into()),
    }
}

fn clean_string(value: Option<&Value>) -> String {
    value
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_owned()
}

fn safe_file_segment(value: &str, fallback: &str) -> String {
    let mut result = String::new();
    let mut replacing = false;
    for character in value.trim().chars() {
        if character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-') {
            result.push(character);
            replacing = false;
        } else if !replacing {
            result.push('_');
            replacing = true;
        }
    }
    let normalized = result.trim_matches('_');
    if normalized.is_empty() {
        fallback.to_owned()
    } else {
        normalized.to_owned()
    }
}

fn demote_markdown_headings(markdown: &str, levels: usize) -> String {
    markdown
        .lines()
        .map(|line| {
            let heading_depth = line
                .chars()
                .take_while(|character| *character == '#')
                .count();
            if !(1..=6).contains(&heading_depth)
                || !line[heading_depth..]
                    .chars()
                    .next()
                    .is_some_and(char::is_whitespace)
            {
                return line.to_owned();
            }
            format!(
                "{}{}",
                "#".repeat((heading_depth + levels).min(6)),
                &line[heading_depth..]
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn filter_digest_export_markdown(markdown: &str) -> String {
    let mut top_level_index = 0;
    let mut keep_current = true;
    let mut kept = Vec::new();
    let normalized = markdown.replace("\r\n", "\n");
    for line in normalized.lines() {
        if line.starts_with("## ") {
            top_level_index += 1;
            keep_current = top_level_index <= 4;
        }
        if keep_current {
            kept.push(line);
        }
    }
    format!(
        "{}\n",
        demote_markdown_headings(kept.join("\n").trim(), 2).trim()
    )
}

fn remove_citation_wrapper_and_trailing_section(report: &str) -> (String, Option<String>) {
    let normalized = report.replace("\r\n", "\n");
    let mut lines = normalized.lines().map(str::to_owned).collect::<Vec<_>>();
    if lines.first().is_some_and(|line| line.starts_with("## ")) {
        lines.remove(0);
        while lines.first().is_some_and(|line| line.trim().is_empty()) {
            lines.remove(0);
        }
    }
    let section_indexes = lines
        .iter()
        .enumerate()
        .filter_map(|(index, line)| line.starts_with("### ").then_some(index))
        .collect::<Vec<_>>();
    let removed = if section_indexes.len() >= 2 {
        let remove_from = *section_indexes.last().unwrap_or(&lines.len());
        let heading = lines[remove_from].trim_start_matches('#').trim().to_owned();
        lines.truncate(remove_from);
        (!heading.is_empty()).then_some(heading)
    } else {
        None
    };
    (
        format!(
            "{}\n",
            demote_markdown_headings(lines.join("\n").trim(), 1).trim()
        ),
        removed,
    )
}

fn compact_authors(value: Option<&Value>) -> String {
    let authors = match value {
        Some(Value::Array(values)) => values
            .iter()
            .filter_map(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
            .collect::<Vec<_>>(),
        Some(Value::String(value)) if !value.trim().is_empty() => vec![value.trim().to_owned()],
        _ => Vec::new(),
    };
    if authors.len() > 2 {
        format!("{}; {}; et al.", authors[0], authors[1])
    } else {
        authors.join("; ")
    }
}

fn compact_references(payload: Option<&Value>) -> Value {
    let references = payload
        .and_then(|payload| payload.get("references"))
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_object)
        .map(|reference| {
            json!({
                "id": clean_string(reference.get("id").or_else(|| reference.get("ref_id")).or_else(|| reference.get("key"))),
                "year": clean_string(reference.get("year")),
                "authors": compact_authors(reference.get("author").or_else(|| reference.get("authors"))),
                "title": clean_string(reference.get("title")),
            })
        })
        .collect::<Vec<_>>();
    json!({"references":references})
}

fn pretty_json_text(value: &Value) -> Result<String, String> {
    serde_json::to_string_pretty(value)
        .map(|text| format!("{text}\n"))
        .map_err(|_| "production_projection_invalid".to_owned())
}

fn export_content(paper_ref: &str, artifact: &Value) -> Result<ExportContent, String> {
    let artifact_type = artifact
        .get("artifact_type")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let directory = format!(
        "runtime/payloads/artifacts/{}",
        safe_file_segment(paper_ref, "paper")
    );
    let mut diagnostics = Vec::new();
    let mut removed_trailing_section_heading = None;
    let (path, text) = match artifact_type {
        "digest" => {
            let markdown = artifact
                .get("markdown")
                .and_then(Value::as_str)
                .or_else(|| {
                    artifact
                        .get("payload")
                        .and_then(|payload| payload.get("content"))
                        .and_then(Value::as_str)
                })
                .unwrap_or_default();
            (
                format!("{directory}/digest.md"),
                filter_digest_export_markdown(markdown),
            )
        }
        "references" => (
            format!("{directory}/references.json"),
            pretty_json_text(&compact_references(artifact.get("payload")))?,
        ),
        "citation_analysis" => {
            let report = artifact
                .get("payload")
                .and_then(|payload| payload.get("citation_analysis"))
                .and_then(|citation| citation.get("report_md"))
                .and_then(Value::as_str)
                .or_else(|| {
                    artifact
                        .get("payload")
                        .and_then(|payload| payload.get("report_md"))
                        .and_then(Value::as_str)
                })
                .unwrap_or_default();
            let (markdown, removed) = remove_citation_wrapper_and_trailing_section(report);
            if let Some(heading) = removed.as_ref() {
                diagnostics.push(json!(format!("removed_trailing_section_heading:{heading}")));
            }
            removed_trailing_section_heading = removed;
            (format!("{directory}/citation-analysis.md"), markdown)
        }
        "literature_score" => (
            format!("{directory}/literature-score.json"),
            pretty_json_text(artifact.get("payload").unwrap_or(&Value::Null))?,
        ),
        _ => {
            diagnostics.push(json!(format!("unsupported_artifact_type:{artifact_type}")));
            (String::new(), String::new())
        }
    };
    Ok(ExportContent {
        hash: content_sha256(text.as_bytes()),
        path,
        text,
        diagnostics,
        removed_trailing_section_heading,
    })
}

fn literature_quality(artifacts: &[&Value]) -> Value {
    let score = artifacts.iter().find(|artifact| {
        artifact.get("artifact_type").and_then(Value::as_str) == Some("literature_score")
    });
    let Some(score) = score else {
        return json!({"status":"missing","quality_prior":0.5,"diagnostics":["literature_score_missing"]});
    };
    if score.get("status").and_then(Value::as_str) == Some("missing") {
        return json!({"status":"missing","quality_prior":0.5,"diagnostics":["literature_score_missing"]});
    }
    score.get("literature_quality").cloned().unwrap_or_else(|| {
        json!({
            "status":"invalid",
            "quality_prior":0.5,
            "payload_hash":score.get("payload_hash").cloned().unwrap_or(Value::Null),
            "diagnostics":["literature_score_invalid"]
        })
    })
}

fn prepare_export(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<ArtifactExportPlan, String> {
    let (request, mode) = export_request(args)?;
    let raw_paper_refs = string_list(
        &request,
        &["paper_refs", "paperRefs", "paper_ref", "paperRef"],
    )?;
    let mut seen_paper_refs = HashSet::new();
    let paper_refs = raw_paper_refs
        .into_iter()
        .filter(|paper_ref| seen_paper_refs.insert(paper_ref.clone()))
        .collect::<Vec<_>>();
    if paper_refs.is_empty() {
        return Err("invalid_request".into());
    }
    let read = read_artifacts(apps, std::slice::from_ref(&request))?;
    let artifacts = read
        .get("artifacts")
        .and_then(Value::as_array)
        .ok_or_else(|| "production_projection_invalid".to_owned())?;
    let diagnostics = read
        .get("diagnostics")
        .cloned()
        .unwrap_or_else(|| json!([]));
    let mut entries = Vec::new();
    let mut papers = Vec::new();
    let mut statuses = Vec::new();
    for paper_ref in &paper_refs {
        let paper_artifacts = artifacts
            .iter()
            .filter(|artifact| artifact.get("paper_ref").and_then(Value::as_str) == Some(paper_ref))
            .collect::<Vec<_>>();
        let mut manifest_artifacts = Vec::new();
        for artifact in &paper_artifacts {
            let status = artifact
                .get("status")
                .and_then(Value::as_str)
                .unwrap_or("available");
            let artifact_type = clean_string(artifact.get("artifact_type"));
            let payload_type = clean_string(artifact.get("payload_type"));
            let missing_reason = clean_string(artifact.get("missing_reason"));
            let artifact_diagnostics = artifact
                .get("diagnostics")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            let mut manifest_entry = json!({
                "artifact_type":artifact_type,
                "payload_type":payload_type,
                "status":status,
                "note_key":clean_string(artifact.get("note_key")),
                "note_title":clean_string(artifact.get("note_title")),
                "payload_types_seen":artifact.get("payload_types_seen").cloned().unwrap_or_else(|| json!([])),
                "payload_hash":clean_string(artifact.get("payload_hash").or_else(|| artifact.get("hash"))),
                "missing_reason":missing_reason,
                "diagnostics":artifact_diagnostics,
            });
            statuses.push(json!({
                "paper_ref":paper_ref,
                "artifact_type":artifact_type,
                "payload_type":payload_type,
                "status":status,
                "missing_reason":missing_reason,
            }));
            if status == "available" {
                let content = export_content(paper_ref, artifact)?;
                if !content.path.is_empty() {
                    entries.push(json!({"path":content.path,"text":content.text}));
                }
                manifest_entry["content_file"] = json!(content.path);
                manifest_entry["content_hash"] = json!(content.hash);
                if let Some(heading) = content.removed_trailing_section_heading {
                    manifest_entry["removed_trailing_section_heading"] = json!(heading);
                }
                let mut combined_diagnostics = artifact_diagnostics;
                combined_diagnostics.extend(content.diagnostics);
                manifest_entry["diagnostics"] = json!(combined_diagnostics);
            }
            manifest_artifacts.push(manifest_entry);
        }
        let paper_diagnostics = diagnostics
            .as_array()
            .into_iter()
            .flatten()
            .filter(|diagnostic| {
                diagnostic
                    .as_str()
                    .is_some_and(|diagnostic| diagnostic.starts_with(&format!("{paper_ref}:")))
            })
            .cloned()
            .collect::<Vec<_>>();
        papers.push(json!({
            "paper_ref":paper_ref,
            "artifacts":manifest_artifacts,
            "literature_quality":literature_quality(&paper_artifacts),
            "diagnostics":paper_diagnostics,
        }));
    }
    let manifest_path = "runtime/payloads/paper-artifacts-manifest.json";
    let manifest = json!({
        "schema_id":"synthesis.filtered_paper_artifacts_manifest",
        "schema_version":"1.1.0",
        "exported_by":"paper_artifacts.export_filtered",
        "exported_at":synthesis_protocol::utc_now_iso8601(),
        "paper_refs":paper_refs,
        "papers":papers,
        "diagnostics":diagnostics,
    });
    entries.insert(
        0,
        json!({"path":manifest_path,"text":pretty_json_text(&manifest)?}),
    );
    let mut response = json!({
        "paper_refs":paper_refs,
        "manifest_file":manifest_path,
        "artifact_statuses":statuses,
        "diagnostics":diagnostics,
    });
    if paper_refs.len() == 1 {
        response["paper_ref"] = json!(paper_refs[0]);
    }
    let destination = match mode {
        ExportMode::Local => {
            let run_root = request
                .get("run_root")
                .or_else(|| request.get("runRoot"))
                .and_then(Value::as_str)
                .filter(|run_root| !run_root.trim().is_empty())
                .ok_or_else(|| "invalid_request".to_owned())?;
            ArtifactExportDestination::RunWorkspace {
                run_root: run_root.to_owned(),
            }
        }
        ExportMode::Remote => {
            let suffix = if paper_refs.len() == 1 {
                safe_file_segment(&paper_refs[0], "bundle")
            } else {
                "bundle".to_owned()
            };
            let display_name = format!("paper-artifacts-{suffix}.zip");
            ArtifactExportDestination::Archive { display_name }
        }
    };
    Ok(ArtifactExportPlan {
        response,
        entries: Value::Array(entries),
        destination,
    })
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adapter_has_the_closed_thirteen_operation_slice() {
        assert_eq!(ARTIFACT_LIBRARY_DEBUG_CLIENT_HANDLERS.len(), 13);
        let capabilities = ARTIFACT_LIBRARY_DEBUG_CLIENT_HANDLERS
            .iter()
            .map(|handler| handler.capability)
            .collect::<std::collections::BTreeSet<_>>();
        assert_eq!(capabilities.len(), 13);
    }
}
