use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
};

use serde_json::{json, Map, Value};

use crate::{
    args::{
        CallArgs, DebugArgs, DebugCommand, DebugInputArgs, DebugSynthesisCommand,
        DebugSynthesisJobsCommand, DebugSynthesisMaintenanceCommand, DebugSynthesisQueueCommand,
        DebugSynthesisWorkerCommand, FileArgs, FileCommand, FileDownloadArgs, ItemArgs,
        ItemCommand, ItemNotesArgs, ItemRefArgs, ItemSearchArgs, LiteratureArgs, LiteratureCommand,
        LiteratureIngestArgs, NoteArgs, NoteCommand, NoteDetailArgs, NotePayloadArgs,
        SynthesisArgs, SynthesisCommand, TaskArgs, TaskCommand, TaskListArgs, WorkflowArgs,
        WorkflowCommand, WorkflowRunArgs, WorkflowSubmitArgs,
    },
    client,
    config::BridgeConfig,
    error::CliError,
};

const PROTOCOL: &str = "host-bridge.v1";

pub fn status(config: &BridgeConfig) -> Result<Value, CliError> {
    let result = client::health(config)?;
    ensure_protocol(&result)?;
    Ok(result)
}

pub fn manifest(config: &BridgeConfig) -> Result<Value, CliError> {
    client::manifest(config)
}

pub fn call(config: &BridgeConfig, args: CallArgs) -> Result<Value, CliError> {
    let input = read_json_arg(args.input.as_deref())?;
    client::call(config, &args.capability, input)
}

pub fn item(config: &BridgeConfig, args: ItemArgs) -> Result<Value, CliError> {
    match args.command {
        ItemCommand::Search(args) => {
            call_capability(config, "library.search_items", item_search_input(args))
        }
        ItemCommand::Get(args) => {
            call_capability(config, "library.get_item_detail", item_ref(args)?)
        }
        ItemCommand::Notes(args) => {
            call_capability(config, "library.get_item_notes", item_notes_input(args)?)
        }
        ItemCommand::Attachments(args) => {
            call_capability(config, "library.get_item_attachments", item_ref(args)?)
        }
    }
}

pub fn note(config: &BridgeConfig, args: NoteArgs) -> Result<Value, CliError> {
    match args.command {
        NoteCommand::Get(args) => {
            call_capability(config, "library.get_note_detail", note_detail_input(args)?)
        }
        NoteCommand::Payloads(args) => {
            call_capability(config, "library.list_note_payloads", item_ref(args)?)
        }
        NoteCommand::Payload(args) => call_capability(
            config,
            "library.get_note_payload",
            note_payload_input(args)?,
        ),
    }
}

pub fn synthesis(config: &BridgeConfig, args: SynthesisArgs) -> Result<Value, CliError> {
    let capability = synthesis_capability(&args.command);
    let input = synthesis_input(args.command)?;
    call_capability(config, capability, input)
}

pub fn literature(config: &BridgeConfig, args: LiteratureArgs) -> Result<Value, CliError> {
    match args.command {
        LiteratureCommand::Ingest(args) => {
            call_capability(config, "mutation.execute", literature_ingest_input(args)?)
        }
    }
}

pub fn workflow(config: &BridgeConfig, args: WorkflowArgs) -> Result<Value, CliError> {
    match args.command {
        WorkflowCommand::List => client::get(config, "/workflows"),
        WorkflowCommand::Submit(args) => {
            client::post(config, "/workflows/submit", workflow_submit_input(args)?)
        }
        WorkflowCommand::Run(args) => client::get(config, &workflow_run_path(args)?),
    }
}

pub fn task(config: &BridgeConfig, args: TaskArgs) -> Result<Value, CliError> {
    match args.command {
        TaskCommand::List(args) => client::get(config, &task_list_path(args)),
    }
}

pub fn file(config: &BridgeConfig, args: FileArgs) -> Result<Value, CliError> {
    match args.command {
        FileCommand::Download(args) => file_download(config, args),
    }
}

pub fn debug(config: &BridgeConfig, args: DebugArgs) -> Result<Value, CliError> {
    let (capability, input) = debug_capability_and_input(args)?;
    ensure_debug_capability(config, capability)?;
    call_capability(config, capability, input)
}

fn call_capability(
    config: &BridgeConfig,
    capability: &str,
    input: Value,
) -> Result<Value, CliError> {
    client::call(config, capability, input)
}

fn ensure_debug_capability(config: &BridgeConfig, capability: &str) -> Result<(), CliError> {
    let manifest = client::manifest(config)?;
    let found = manifest
        .get("capabilities")
        .and_then(Value::as_array)
        .map(|capabilities| {
            capabilities
                .iter()
                .any(|entry| entry.get("name").and_then(Value::as_str) == Some(capability))
        })
        .unwrap_or(false);
    if found {
        return Ok(());
    }
    Err(CliError::new(
        "debug_mode_disabled",
        crate::error::ErrorCategory::Capability,
        "Host Bridge debug capabilities are not exposed; enable hardcoded debug mode and restart Zotero",
    )
    .with_details(json!({ "capability": capability })))
}

fn debug_capability_and_input(args: DebugArgs) -> Result<(&'static str, Value), CliError> {
    match args.command {
        DebugCommand::Status => Ok(("debug.status", json!({}))),
        DebugCommand::Persistence(input) => Ok(("debug.persistence.snapshot", debug_input(input)?)),
        DebugCommand::Tasks(input) => Ok(("debug.tasks.snapshot", debug_input(input)?)),
        DebugCommand::Synthesis(args) => debug_synthesis_capability_and_input(args.command),
    }
}

fn debug_synthesis_capability_and_input(
    command: DebugSynthesisCommand,
) -> Result<(&'static str, Value), CliError> {
    match command {
        DebugSynthesisCommand::Snapshot(input) => {
            Ok(("debug.synthesis.snapshot", debug_input(input)?))
        }
        DebugSynthesisCommand::Diff(input) => Ok(("debug.synthesis.diff", debug_input(input)?)),
        DebugSynthesisCommand::InspectPaper(input) => {
            Ok(("debug.synthesis.paper.inspect", debug_input(input)?))
        }
        DebugSynthesisCommand::InspectTopic(input) => {
            Ok(("debug.synthesis.topic.inspect", debug_input(input)?))
        }
        DebugSynthesisCommand::Queue(args) => {
            debug_synthesis_queue_capability_and_input(args.command)
        }
        DebugSynthesisCommand::Jobs(args) => {
            debug_synthesis_jobs_capability_and_input(args.command)
        }
        DebugSynthesisCommand::Worker(args) => match args.command {
            DebugSynthesisWorkerCommand::Run(input) => {
                Ok(("debug.synthesis.worker.run", debug_input(input)?))
            }
        },
        DebugSynthesisCommand::Maintenance(args) => match args.command {
            DebugSynthesisMaintenanceCommand::Run(input) => {
                Ok(("debug.synthesis.maintenance.run", debug_input(input)?))
            }
        },
    }
}

fn debug_synthesis_queue_capability_and_input(
    command: DebugSynthesisQueueCommand,
) -> Result<(&'static str, Value), CliError> {
    match command {
        DebugSynthesisQueueCommand::List(input) => {
            Ok(("debug.synthesis.queue.list", debug_input(input)?))
        }
        DebugSynthesisQueueCommand::Enqueue(input) => {
            Ok(("debug.synthesis.queue.enqueue", debug_input(input)?))
        }
        DebugSynthesisQueueCommand::Retry(input) => {
            Ok(("debug.synthesis.queue.retry", debug_input(input)?))
        }
        DebugSynthesisQueueCommand::Pause(input) => {
            Ok(("debug.synthesis.queue.pause", debug_input(input)?))
        }
        DebugSynthesisQueueCommand::Resume(input) => {
            Ok(("debug.synthesis.queue.resume", debug_input(input)?))
        }
        DebugSynthesisQueueCommand::Clear(input) => {
            Ok(("debug.synthesis.queue.clear", debug_input(input)?))
        }
    }
}

fn debug_synthesis_jobs_capability_and_input(
    command: DebugSynthesisJobsCommand,
) -> Result<(&'static str, Value), CliError> {
    match command {
        DebugSynthesisJobsCommand::List(input) => {
            Ok(("debug.synthesis.jobs.list", debug_input(input)?))
        }
        DebugSynthesisJobsCommand::ClearStale(input) => {
            Ok(("debug.synthesis.jobs.clearStale", debug_input(input)?))
        }
    }
}

fn debug_input(args: DebugInputArgs) -> Result<Value, CliError> {
    read_json_arg(args.input.as_deref())
}

fn synthesis_capability(command: &SynthesisCommand) -> &'static str {
    match command {
        SynthesisCommand::ListTopics(_) => "synthesis.list_topics",
        SynthesisCommand::GetTopicContext(_) => "synthesis.get_topic_context",
        SynthesisCommand::GetSchemas(_) => "synthesis.get_schemas",
        SynthesisCommand::GetLibraryIndex(_) => "synthesis.get_library_index",
        SynthesisCommand::ResolveResolver(_) => "synthesis.resolve_resolver",
        SynthesisCommand::GetReferenceSidecarIndex(_) => {
            "synthesis.get_reference_sidecar_index"
        }
        SynthesisCommand::QueryCitationGraph(_) => "synthesis.query_citation_graph",
        SynthesisCommand::GetCitationGraphSlice(_) => "synthesis.get_citation_graph_slice",
        SynthesisCommand::GetCitationGraphMetrics(_) => "synthesis.get_citation_graph_metrics",
        SynthesisCommand::GetPaperArtifactManifest(_) => "synthesis.get_paper_artifact_manifest",
        SynthesisCommand::ReadPaperArtifacts(_) => "synthesis.read_paper_artifacts",
        SynthesisCommand::ExportFilteredPaperArtifacts(_) => {
            "synthesis.export_filtered_paper_artifacts"
        }
        SynthesisCommand::ResolveTopicPaperDigest(_) => "synthesis.resolve_topic_paper_digest",
        SynthesisCommand::GetReviewInput(_) => "synthesis.get_review_input",
    }
}

fn synthesis_input(command: SynthesisCommand) -> Result<Value, CliError> {
    let args = match command {
        SynthesisCommand::ListTopics(args)
        | SynthesisCommand::GetTopicContext(args)
        | SynthesisCommand::GetSchemas(args)
        | SynthesisCommand::GetLibraryIndex(args)
        | SynthesisCommand::ResolveResolver(args)
        | SynthesisCommand::GetReferenceSidecarIndex(args)
        | SynthesisCommand::QueryCitationGraph(args)
        | SynthesisCommand::GetCitationGraphSlice(args)
        | SynthesisCommand::GetCitationGraphMetrics(args)
        | SynthesisCommand::GetPaperArtifactManifest(args)
        | SynthesisCommand::ReadPaperArtifacts(args)
        | SynthesisCommand::ExportFilteredPaperArtifacts(args)
        | SynthesisCommand::ResolveTopicPaperDigest(args)
        | SynthesisCommand::GetReviewInput(args) => args,
    };
    read_json_arg(args.input.as_deref())
}

fn literature_ingest_input(args: LiteratureIngestArgs) -> Result<Value, CliError> {
    let input = read_json_arg(Some(&args.input))?;
    let mut object = match input {
        Value::Object(map) => map,
        _ => {
            return Err(CliError::validation(
                "invalid_literature_ingest_input",
                "literature ingest input must be a JSON object",
            ));
        }
    };
    object.insert(
        "operation".to_string(),
        Value::String("literature.ingest".to_string()),
    );
    Ok(Value::Object(object))
}

fn workflow_submit_input(args: WorkflowSubmitArgs) -> Result<Value, CliError> {
    let workflow = args.workflow.trim();
    if workflow.is_empty() {
        return Err(CliError::validation(
            "missing_workflow_id",
            "Workflow submit requires --workflow",
        ));
    }
    let input = read_json_arg(Some(&args.input))?;
    Ok(json!({
        "workflowId": workflow,
        "input": input
    }))
}

fn workflow_run_path(args: WorkflowRunArgs) -> Result<String, CliError> {
    let run_id = args.run_id.trim();
    if run_id.is_empty() {
        return Err(CliError::validation(
            "missing_run_id",
            "Workflow run status requires a run id",
        ));
    }
    Ok(format!("/workflows/runs/{}", percent_encode_path(run_id)))
}

fn task_list_path(args: TaskListArgs) -> String {
    let mut query: Vec<(String, String)> = Vec::new();
    push_query(&mut query, "workflowId", args.workflow);
    push_query(&mut query, "backendId", args.backend);
    push_query(&mut query, "backendType", args.backend_type);
    push_query(&mut query, "requestId", args.request);
    push_query(&mut query, "runId", args.run);
    push_query(&mut query, "state", args.state);
    if args.active_only {
        query.push(("includeHistory".to_string(), "false".to_string()));
    }
    if query.is_empty() {
        return "/tasks".to_string();
    }
    let query = query
        .into_iter()
        .map(|(key, value)| format!("{}={}", key, percent_encode_query(&value)))
        .collect::<Vec<_>>()
        .join("&");
    format!("/tasks?{query}")
}

fn file_download(config: &BridgeConfig, args: FileDownloadArgs) -> Result<Value, CliError> {
    let file_id = normalize_file_id(&args.file_id)?;
    let output = args.output;
    if output.exists() && !args.force {
        return Err(CliError::new(
            "output_exists",
            crate::error::ErrorCategory::Download,
            "Output path already exists; pass --force to overwrite",
        )
        .with_details(output_error_details(&output)));
    }
    let response = client::download(config, &format!("/files/{file_id}"))?;
    write_download_output(&output, &response.bytes, args.force)?;
    Ok(download_success_payload(
        file_id,
        &output,
        response.bytes.len(),
        response.content_type,
        args.force,
    ))
}

fn output_name(output: &Path) -> String {
    output
        .file_name()
        .and_then(|entry| entry.to_str())
        .unwrap_or("download")
        .to_string()
}

fn output_error_details(output: &Path) -> Value {
    json!({ "outputName": output_name(output) })
}

fn download_success_payload(
    file_id: String,
    output: &Path,
    bytes_written: usize,
    content_type: String,
    overwritten: bool,
) -> Value {
    json!({
        "command": "file.download",
        "fileId": file_id,
        "outputName": output_name(output),
        "bytesWritten": bytes_written,
        "contentType": content_type,
        "overwritten": overwritten
    })
}

fn normalize_file_id(file_id: &str) -> Result<String, CliError> {
    let file_id = file_id.trim();
    if file_id.is_empty()
        || file_id.contains('/')
        || file_id.contains('\\')
        || file_id.contains("..")
        || file_id.contains(':')
    {
        return Err(CliError::validation(
            "invalid_file_id",
            "file download requires an opaque fileId, not a path",
        ));
    }
    Ok(file_id.to_string())
}

fn temp_output_path(output: &Path) -> PathBuf {
    let file_name = output
        .file_name()
        .and_then(|entry| entry.to_str())
        .unwrap_or("download");
    output.with_file_name(format!(
        ".{file_name}.zotero-bridge-{}.tmp",
        std::process::id()
    ))
}

fn write_download_output(output: &Path, bytes: &[u8], force: bool) -> Result<(), CliError> {
    if output.exists() && !force {
        return Err(CliError::new(
            "output_exists",
            crate::error::ErrorCategory::Download,
            "Output path already exists; pass --force to overwrite",
        )
        .with_details(output_error_details(output)));
    }
    if let Some(parent) = output.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|error| {
                CliError::new(
                    "download_output_unwritable",
                    crate::error::ErrorCategory::Download,
                    "Failed to create output directory",
                )
                .with_details(json!({
                    "outputName": output_name(output),
                    "message": error.to_string()
                }))
            })?;
        }
    }
    let temp = temp_output_path(output);
    fs::write(&temp, bytes).map_err(|error| {
        CliError::new(
            "download_output_unwritable",
            crate::error::ErrorCategory::Download,
            "Failed to write temporary download file",
        )
        .with_details(json!({
            "outputName": output_name(output),
            "message": error.to_string()
        }))
    })?;
    if force && output.exists() {
        fs::remove_file(output).map_err(|error| {
            let _ = fs::remove_file(&temp);
            CliError::new(
                "download_output_unwritable",
                crate::error::ErrorCategory::Download,
                "Failed to replace existing output file",
            )
            .with_details(json!({
                "outputName": output_name(output),
                "message": error.to_string()
            }))
        })?;
    }
    fs::rename(&temp, output).map_err(|error| {
        let _ = fs::remove_file(&temp);
        CliError::new(
            "download_output_unwritable",
            crate::error::ErrorCategory::Download,
            "Failed to move temporary download file into place",
        )
        .with_details(json!({
            "outputName": output_name(output),
            "message": error.to_string()
        }))
    })
}

fn ensure_protocol(value: &Value) -> Result<(), CliError> {
    let protocol = value.get("protocol").and_then(Value::as_str).unwrap_or("");
    if protocol != PROTOCOL {
        return Err(CliError::protocol(
            "incompatible_bridge_protocol",
            "Host Bridge protocol version is incompatible",
        )
        .with_details(json!({
            "expected": PROTOCOL,
            "actual": protocol
        })));
    }
    Ok(())
}

fn push_query(query: &mut Vec<(String, String)>, key: &str, value: Option<String>) {
    let Some(value) = value else {
        return;
    };
    let value = value.trim();
    if value.is_empty() {
        return;
    }
    query.push((key.to_string(), value.to_string()));
}

fn percent_encode_path(value: &str) -> String {
    percent_encode(value, false)
}

fn percent_encode_query(value: &str) -> String {
    percent_encode(value, true)
}

fn percent_encode(value: &str, encode_space_as_plus: bool) -> String {
    let mut output = String::new();
    for byte in value.bytes() {
        let allowed = byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~');
        if allowed {
            output.push(byte as char);
        } else if encode_space_as_plus && byte == b' ' {
            output.push('+');
        } else {
            output.push_str(&format!("%{byte:02X}"));
        }
    }
    output
}

fn item_search_input(args: ItemSearchArgs) -> Value {
    let mut input = Map::new();
    input.insert("query".to_string(), Value::String(args.query));
    insert_u32(&mut input, "limit", args.limit);
    insert_u64(&mut input, "libraryId", args.library_id);
    Value::Object(input)
}

fn item_notes_input(args: ItemNotesArgs) -> Result<Value, CliError> {
    let mut input = into_object(item_ref(args.item)?);
    insert_u32(&mut input, "limit", args.limit);
    insert_u32(&mut input, "cursor", args.cursor);
    insert_u32(&mut input, "maxExcerptChars", args.max_excerpt_chars);
    Ok(Value::Object(input))
}

fn note_detail_input(args: NoteDetailArgs) -> Result<Value, CliError> {
    let mut input = into_object(item_ref(args.note)?);
    if let Some(format) = args.format {
        input.insert("format".to_string(), Value::String(format));
    }
    insert_u32(&mut input, "offset", args.offset);
    insert_u32(&mut input, "maxChars", args.max_chars);
    Ok(Value::Object(input))
}

fn note_payload_input(args: NotePayloadArgs) -> Result<Value, CliError> {
    let mut input = into_object(item_ref(args.note)?);
    if let Some(payload_type) = args.payload_type {
        input.insert("payloadType".to_string(), Value::String(payload_type));
    }
    insert_u32(&mut input, "offset", args.offset);
    insert_u32(&mut input, "maxChars", args.max_chars);
    Ok(Value::Object(input))
}

fn item_ref(args: ItemRefArgs) -> Result<Value, CliError> {
    let mut input = Map::new();
    match (args.key, args.id) {
        (Some(key), None) if !key.trim().is_empty() => {
            input.insert("key".to_string(), Value::String(key));
        }
        (None, Some(id)) => {
            input.insert("id".to_string(), Value::from(id));
        }
        _ => {
            return Err(CliError::validation(
                "missing_item_ref",
                "Provide exactly one item or note reference with --key or --id",
            ));
        }
    }
    insert_u64(&mut input, "libraryId", args.library_id);
    Ok(Value::Object(input))
}

fn into_object(value: Value) -> Map<String, Value> {
    match value {
        Value::Object(map) => map,
        _ => Map::new(),
    }
}

fn insert_u32(input: &mut Map<String, Value>, name: &str, value: Option<u32>) {
    if let Some(value) = value {
        input.insert(name.to_string(), Value::from(value));
    }
}

fn insert_u64(input: &mut Map<String, Value>, name: &str, value: Option<u64>) {
    if let Some(value) = value {
        input.insert(name.to_string(), Value::from(value));
    }
}

fn read_json_arg(input: Option<&str>) -> Result<Value, CliError> {
    let Some(input) = input else {
        return Ok(json!({}));
    };
    let text = if input == "-" {
        let mut buffer = String::new();
        std::io::stdin()
            .read_to_string(&mut buffer)
            .map_err(|error| {
                CliError::validation("input_stdin_failed", "Failed to read JSON from stdin")
                    .with_details(json!({ "message": error.to_string() }))
            })?;
        buffer
    } else if let Some(path) = input.strip_prefix('@') {
        fs::read_to_string(path).map_err(|error| {
            CliError::validation("input_file_unreadable", "Failed to read JSON input file")
                .with_details(json!({ "path": path, "message": error.to_string() }))
        })?
    } else if Path::new(input).exists() {
        fs::read_to_string(input).map_err(|error| {
            CliError::validation("input_file_unreadable", "Failed to read JSON input file")
                .with_details(json!({ "path": input, "message": error.to_string() }))
        })?
    } else {
        input.to_string()
    };
    serde_json::from_str::<Value>(&text).map_err(|error| {
        CliError::validation("input_json_invalid", "Input must be valid JSON")
            .with_details(json!({ "message": error.to_string() }))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::args::SynthesisInputArgs;

    #[test]
    fn maps_item_search_to_bridge_input() {
        let input = item_search_input(ItemSearchArgs {
            query: "graph".to_string(),
            limit: Some(5),
            library_id: Some(1),
        });
        assert_eq!(
            input,
            json!({
                "query": "graph",
                "limit": 5,
                "libraryId": 1
            })
        );
    }

    #[test]
    fn builds_item_ref_with_key() {
        let input = item_ref(ItemRefArgs {
            key: Some("ABC123".to_string()),
            id: None,
            library_id: Some(1),
        })
        .unwrap();
        assert_eq!(input, json!({ "key": "ABC123", "libraryId": 1 }));
    }

    #[test]
    fn rejects_missing_item_ref() {
        let error = item_ref(ItemRefArgs {
            key: None,
            id: None,
            library_id: None,
        })
        .unwrap_err();
        assert_eq!(error.code, "missing_item_ref");
    }

    #[test]
    fn reads_inline_json_arg() {
        assert_eq!(read_json_arg(Some("{\"a\":1}")).unwrap(), json!({ "a": 1 }));
    }

    #[test]
    fn maps_synthesis_subcommands_to_capabilities() {
        let commands = vec![
            (
                SynthesisCommand::ListTopics(SynthesisInputArgs { input: None }),
                "synthesis.list_topics",
            ),
            (
                SynthesisCommand::GetTopicContext(SynthesisInputArgs { input: None }),
                "synthesis.get_topic_context",
            ),
            (
                SynthesisCommand::GetSchemas(SynthesisInputArgs { input: None }),
                "synthesis.get_schemas",
            ),
            (
                SynthesisCommand::GetLibraryIndex(SynthesisInputArgs { input: None }),
                "synthesis.get_library_index",
            ),
            (
                SynthesisCommand::ResolveResolver(SynthesisInputArgs { input: None }),
                "synthesis.resolve_resolver",
            ),
            (
                SynthesisCommand::GetReferenceSidecarIndex(SynthesisInputArgs { input: None }),
                "synthesis.get_reference_sidecar_index",
            ),
            (
                SynthesisCommand::QueryCitationGraph(SynthesisInputArgs { input: None }),
                "synthesis.query_citation_graph",
            ),
            (
                SynthesisCommand::GetCitationGraphSlice(SynthesisInputArgs { input: None }),
                "synthesis.get_citation_graph_slice",
            ),
            (
                SynthesisCommand::GetCitationGraphMetrics(SynthesisInputArgs { input: None }),
                "synthesis.get_citation_graph_metrics",
            ),
            (
                SynthesisCommand::GetPaperArtifactManifest(SynthesisInputArgs { input: None }),
                "synthesis.get_paper_artifact_manifest",
            ),
            (
                SynthesisCommand::ReadPaperArtifacts(SynthesisInputArgs { input: None }),
                "synthesis.read_paper_artifacts",
            ),
            (
                SynthesisCommand::ExportFilteredPaperArtifacts(SynthesisInputArgs { input: None }),
                "synthesis.export_filtered_paper_artifacts",
            ),
            (
                SynthesisCommand::ResolveTopicPaperDigest(SynthesisInputArgs { input: None }),
                "synthesis.resolve_topic_paper_digest",
            ),
            (
                SynthesisCommand::GetReviewInput(SynthesisInputArgs { input: None }),
                "synthesis.get_review_input",
            ),
        ];

        for (command, capability) in commands {
            assert_eq!(synthesis_capability(&command), capability);
            assert_eq!(synthesis_input(command).unwrap(), json!({}));
        }
    }

    #[test]
    fn maps_debug_subcommands_to_capabilities() {
        use crate::args::{
            DebugArgs, DebugCommand, DebugInputArgs, DebugSynthesisArgs, DebugSynthesisCommand,
            DebugSynthesisJobsArgs, DebugSynthesisJobsCommand, DebugSynthesisQueueArgs,
            DebugSynthesisQueueCommand, DebugSynthesisWorkerArgs, DebugSynthesisWorkerCommand,
        };

        let cases = vec![
            (
                DebugArgs {
                    command: DebugCommand::Status,
                },
                "debug.status",
            ),
            (
                DebugArgs {
                    command: DebugCommand::Persistence(DebugInputArgs { input: None }),
                },
                "debug.persistence.snapshot",
            ),
            (
                DebugArgs {
                    command: DebugCommand::Synthesis(DebugSynthesisArgs {
                        command: DebugSynthesisCommand::Snapshot(DebugInputArgs { input: None }),
                    }),
                },
                "debug.synthesis.snapshot",
            ),
            (
                DebugArgs {
                    command: DebugCommand::Synthesis(DebugSynthesisArgs {
                        command: DebugSynthesisCommand::Queue(DebugSynthesisQueueArgs {
                            command: DebugSynthesisQueueCommand::Clear(DebugInputArgs {
                                input: None,
                            }),
                        }),
                    }),
                },
                "debug.synthesis.queue.clear",
            ),
            (
                DebugArgs {
                    command: DebugCommand::Synthesis(DebugSynthesisArgs {
                        command: DebugSynthesisCommand::Jobs(DebugSynthesisJobsArgs {
                            command: DebugSynthesisJobsCommand::ClearStale(DebugInputArgs {
                                input: None,
                            }),
                        }),
                    }),
                },
                "debug.synthesis.jobs.clearStale",
            ),
            (
                DebugArgs {
                    command: DebugCommand::Synthesis(DebugSynthesisArgs {
                        command: DebugSynthesisCommand::Worker(DebugSynthesisWorkerArgs {
                            command: DebugSynthesisWorkerCommand::Run(DebugInputArgs {
                                input: Some(
                                    "{\"worker\":\"paperRegistryIncremental\"}".to_string(),
                                ),
                            }),
                        }),
                    }),
                },
                "debug.synthesis.worker.run",
            ),
        ];

        for (args, capability) in cases {
            let (actual, _input) = debug_capability_and_input(args).unwrap();
            assert_eq!(actual, capability);
        }
    }

    #[test]
    fn reads_synthesis_inline_and_file_inputs() {
        let inline = synthesis_input(SynthesisCommand::GetLibraryIndex(SynthesisInputArgs {
            input: Some("{\"cursor\":1}".to_string()),
        }))
        .unwrap();
        assert_eq!(inline, json!({ "cursor": 1 }));

        let path = std::env::temp_dir().join(format!(
            "zotero-bridge-synthesis-input-{}.json",
            std::process::id()
        ));
        fs::write(&path, "{\"paperRefs\":[\"p1\"]}").unwrap();
        let file = synthesis_input(SynthesisCommand::GetCitationGraphMetrics(
            SynthesisInputArgs {
                input: Some(format!("@{}", path.display())),
            },
        ))
        .unwrap();
        assert_eq!(file, json!({ "paperRefs": ["p1"] }));
        let _ = fs::remove_file(path);
    }

    #[test]
    fn builds_literature_ingest_mutation_input() {
        let input = literature_ingest_input(LiteratureIngestArgs {
            input: "{\"papers\":[{\"title\":\"Bridge Paper\"}],\"collection\":{\"key\":\"COLL\",\"libraryId\":1}}".to_string(),
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "operation": "literature.ingest",
                "papers": [
                    {
                        "title": "Bridge Paper"
                    }
                ],
                "collection": {
                    "key": "COLL",
                    "libraryId": 1
                }
            })
        );
    }

    #[test]
    fn literature_ingest_reuses_file_input_parser() {
        let path = std::env::temp_dir().join(format!(
            "zotero-bridge-literature-ingest-input-{}.json",
            std::process::id()
        ));
        fs::write(&path, "{\"papers\":[{\"doi\":\"10.1000/example\"}]}").unwrap();
        let input = literature_ingest_input(LiteratureIngestArgs {
            input: format!("@{}", path.display()),
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "operation": "literature.ingest",
                "papers": [
                    {
                        "doi": "10.1000/example"
                    }
                ]
            })
        );
        let _ = fs::remove_file(path);
    }

    #[test]
    fn rejects_non_object_literature_ingest_input() {
        let error = literature_ingest_input(LiteratureIngestArgs {
            input: "[]".to_string(),
        })
        .unwrap_err();
        assert_eq!(error.code, "invalid_literature_ingest_input");
    }

    #[test]
    fn maps_workflow_submit_to_bridge_input() {
        let input = workflow_submit_input(WorkflowSubmitArgs {
            workflow: "topic-synthesis".to_string(),
            input: "{\"items\":[{\"key\":\"ABC\",\"libraryId\":1}]}".to_string(),
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "workflowId": "topic-synthesis",
                "input": {
                    "items": [
                        {
                            "key": "ABC",
                            "libraryId": 1
                        }
                    ]
                }
            })
        );
    }

    #[test]
    fn builds_task_list_query() {
        let path = task_list_path(TaskListArgs {
            workflow: Some("w 1".to_string()),
            backend: Some("b".to_string()),
            backend_type: None,
            request: None,
            run: Some("run-1".to_string()),
            state: Some("running".to_string()),
            active_only: true,
        });
        assert_eq!(
            path,
            "/tasks?workflowId=w+1&backendId=b&runId=run-1&state=running&includeHistory=false"
        );
    }

    #[test]
    fn rejects_path_like_file_id() {
        let error = normalize_file_id("../paper.pdf").unwrap_err();
        assert_eq!(error.code, "invalid_file_id");
    }

    #[test]
    fn writes_download_without_overwriting_by_default() {
        let root = std::env::temp_dir().join(format!(
            "zotero-bridge-download-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let output = root.join("paper.txt");
        write_download_output(&output, b"first", false).unwrap();
        let error = write_download_output(&output, b"second", false).unwrap_err();
        assert_eq!(error.code, "output_exists");
        let details = error.details.unwrap();
        assert_eq!(details["outputName"], "paper.txt");
        assert!(details.get("output").is_none());
        assert!(!details
            .to_string()
            .contains(root.to_string_lossy().as_ref()));
        write_download_output(&output, b"second", true).unwrap();
        assert_eq!(fs::read(&output).unwrap(), b"second");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn builds_download_success_payload_without_absolute_output_path() {
        let output = PathBuf::from("C:\\Users\\A\\Downloads\\paper.txt");
        let payload = download_success_payload(
            "file-abc".to_string(),
            &output,
            42,
            "text/plain".to_string(),
            false,
        );
        assert_eq!(payload["outputName"], "paper.txt");
        assert!(payload.get("output").is_none());
        assert!(!payload.to_string().contains("C:\\\\Users"));
    }
}
