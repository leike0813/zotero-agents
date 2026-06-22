use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
};

use serde_json::{json, Map, Value};

use crate::{
    args::{
        BridgeInputArgs, CallArgs, CitationGraphArgs, CitationGraphCommand, ConceptsArgs,
        ConceptsCommand, DebugAcpSkillRunCommand, DebugArgs, DebugCommand, DebugInputArgs,
        DebugSynthesisCommand, FileArgs, FileCommand, FileDownloadArgs, InsightsArgs,
        InsightsCommand, ItemArgs, ItemCommand, ItemNotesArgs, ItemRefArgs, ItemSearchArgs,
        LibraryIndexArgs, LibraryIndexCommand, LiteratureArgs, LiteratureCommand,
        LiteratureIngestArgs, NoteArgs, NoteCommand, NoteDetailArgs, NotePayloadArgs,
        PaperArtifactsArgs, PaperArtifactsCommand, ReferenceIndexArgs, ReferenceIndexCommand,
        ResolversArgs, ResolversCommand, SchemasArgs, SchemasCommand, TaskArgs, TaskCommand,
        TaskListArgs, TopicsArgs, TopicsCommand, WorkflowAgentRunArgs, WorkflowArgs,
        WorkflowCommand, WorkflowDescribeArgs, WorkflowRunArgs, WorkflowSubmitArgs,
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

pub fn topics(config: &BridgeConfig, args: TopicsArgs) -> Result<Value, CliError> {
    let capability = topics_capability(&args.command);
    let input = bridge_input(topics_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn schemas(config: &BridgeConfig, args: SchemasArgs) -> Result<Value, CliError> {
    let capability = schemas_capability(&args.command);
    let input = bridge_input(schemas_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn concepts(config: &BridgeConfig, args: ConceptsArgs) -> Result<Value, CliError> {
    let capability = concepts_capability(&args.command);
    let input = bridge_input(concepts_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn citation_graph(config: &BridgeConfig, args: CitationGraphArgs) -> Result<Value, CliError> {
    let capability = citation_graph_capability(&args.command);
    let input = bridge_input(citation_graph_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn library_index(config: &BridgeConfig, args: LibraryIndexArgs) -> Result<Value, CliError> {
    let capability = library_index_capability(&args.command);
    let input = bridge_input(library_index_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn resolvers(config: &BridgeConfig, args: ResolversArgs) -> Result<Value, CliError> {
    let capability = resolvers_capability(&args.command);
    let input = bridge_input(resolvers_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn reference_index(config: &BridgeConfig, args: ReferenceIndexArgs) -> Result<Value, CliError> {
    let capability = reference_index_capability(&args.command);
    let input = bridge_input(reference_index_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn paper_artifacts(config: &BridgeConfig, args: PaperArtifactsArgs) -> Result<Value, CliError> {
    let capability = paper_artifacts_capability(&args.command);
    let input = bridge_input(paper_artifacts_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn insights(config: &BridgeConfig, args: InsightsArgs) -> Result<Value, CliError> {
    let capability = insights_capability(&args.command);
    let input = bridge_input(insights_input(args.command))?;
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
        WorkflowCommand::Describe(args) => client::post(
            config,
            "/workflows/describe",
            workflow_describe_input(args)?,
        ),
        WorkflowCommand::Submit(args) => {
            client::post(config, "/workflows/submit", workflow_submit_input(args)?)
        }
        WorkflowCommand::AgentRun(args) => workflow_agent_run(config, args),
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
        DebugCommand::AcpSkillRun(args) => match args.command {
            DebugAcpSkillRunCommand::ReapplyResult(input) => {
                Ok(("debug.acpSkillRun.reapplyResult", debug_input(input)?))
            }
        },
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
        DebugSynthesisCommand::Operations(input) => {
            Ok(("debug.synthesis.operations.list", debug_input(input)?))
        }
        DebugSynthesisCommand::Profiler(input) => {
            Ok(("debug.synthesis.profiler.list", debug_input(input)?))
        }
        DebugSynthesisCommand::Cache(input) => {
            Ok(("debug.synthesis.cache.list", debug_input(input)?))
        }
        DebugSynthesisCommand::CleanInstallReset(input) => {
            Ok(("debug.synthesis.cleanInstallReset", debug_input(input)?))
        }
    }
}

fn debug_input(args: DebugInputArgs) -> Result<Value, CliError> {
    read_json_arg(args.input.as_deref())
}

fn topics_capability(command: &TopicsCommand) -> &'static str {
    match command {
        TopicsCommand::List(_) => "topics.list",
        TopicsCommand::FindByPaperRef(_) => "topics.find_by_paper_ref",
        TopicsCommand::GetContext(_) => "topics.get_context",
        TopicsCommand::GetReport(_) => "topics.get_report",
        TopicsCommand::GetReviewInput(_) => "topics.get_review_input",
    }
}

fn topics_input(command: TopicsCommand) -> BridgeInputArgs {
    match command {
        TopicsCommand::List(args)
        | TopicsCommand::FindByPaperRef(args)
        | TopicsCommand::GetContext(args)
        | TopicsCommand::GetReport(args)
        | TopicsCommand::GetReviewInput(args) => args,
    }
}

fn schemas_capability(command: &SchemasCommand) -> &'static str {
    match command {
        SchemasCommand::Get(_) => "schemas.get",
    }
}

fn schemas_input(command: SchemasCommand) -> BridgeInputArgs {
    match command {
        SchemasCommand::Get(args) => args,
    }
}

fn concepts_capability(command: &ConceptsCommand) -> &'static str {
    match command {
        ConceptsCommand::Query(_) => "concepts.query",
    }
}

fn concepts_input(command: ConceptsCommand) -> BridgeInputArgs {
    match command {
        ConceptsCommand::Query(args) => args,
    }
}

fn citation_graph_capability(command: &CitationGraphCommand) -> &'static str {
    match command {
        CitationGraphCommand::Overview(_) => "citation_graph.get_overview",
        CitationGraphCommand::QueryCluster(_) => "citation_graph.query_cluster",
        CitationGraphCommand::GetSlice(_) => "citation_graph.get_slice",
        CitationGraphCommand::GetLayout(_) => "citation_graph.get_layout",
        CitationGraphCommand::GetMetrics(_) => "citation_graph.get_metrics",
        CitationGraphCommand::RankExternalReferences(_) => {
            "citation_graph.rank_external_references"
        }
        CitationGraphCommand::RankLibraryPapers(_) => "citation_graph.rank_library_papers",
        CitationGraphCommand::RefreshMetrics(_) => "citation_graph.refresh_metrics",
    }
}

fn citation_graph_input(command: CitationGraphCommand) -> BridgeInputArgs {
    match command {
        CitationGraphCommand::Overview(args)
        | CitationGraphCommand::QueryCluster(args)
        | CitationGraphCommand::GetSlice(args)
        | CitationGraphCommand::GetLayout(args)
        | CitationGraphCommand::GetMetrics(args)
        | CitationGraphCommand::RankExternalReferences(args)
        | CitationGraphCommand::RankLibraryPapers(args)
        | CitationGraphCommand::RefreshMetrics(args) => args,
    }
}

fn library_index_capability(command: &LibraryIndexCommand) -> &'static str {
    match command {
        LibraryIndexCommand::Get(_) => "library_index.get",
    }
}

fn library_index_input(command: LibraryIndexCommand) -> BridgeInputArgs {
    match command {
        LibraryIndexCommand::Get(args) => args,
    }
}

fn resolvers_capability(command: &ResolversCommand) -> &'static str {
    match command {
        ResolversCommand::Resolve(_) => "resolvers.resolve",
    }
}

fn resolvers_input(command: ResolversCommand) -> BridgeInputArgs {
    match command {
        ResolversCommand::Resolve(args) => args,
    }
}

fn reference_index_capability(command: &ReferenceIndexCommand) -> &'static str {
    match command {
        ReferenceIndexCommand::Get(_) => "reference_index.get",
    }
}

fn reference_index_input(command: ReferenceIndexCommand) -> BridgeInputArgs {
    match command {
        ReferenceIndexCommand::Get(args) => args,
    }
}

fn paper_artifacts_capability(command: &PaperArtifactsCommand) -> &'static str {
    match command {
        PaperArtifactsCommand::Manifest(_) => "paper_artifacts.get_manifest",
        PaperArtifactsCommand::Read(_) => "paper_artifacts.read",
        PaperArtifactsCommand::ExportFiltered(_) => "paper_artifacts.export_filtered",
        PaperArtifactsCommand::ResolveTopicDigest(_) => "paper_artifacts.resolve_topic_digest",
    }
}

fn paper_artifacts_input(command: PaperArtifactsCommand) -> BridgeInputArgs {
    match command {
        PaperArtifactsCommand::Manifest(args)
        | PaperArtifactsCommand::Read(args)
        | PaperArtifactsCommand::ExportFiltered(args)
        | PaperArtifactsCommand::ResolveTopicDigest(args) => args,
    }
}

fn insights_capability(command: &InsightsCommand) -> &'static str {
    match command {
        InsightsCommand::AttentionQueue(_) => "insights.get_attention_queue",
    }
}

fn insights_input(command: InsightsCommand) -> BridgeInputArgs {
    match command {
        InsightsCommand::AttentionQueue(args) => args,
    }
}

fn bridge_input(args: BridgeInputArgs) -> Result<Value, CliError> {
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

fn json_object_arg(input: Option<&str>, code: &str, message: &str) -> Result<Value, CliError> {
    let value = read_json_arg(input)?;
    match value {
        Value::Object(_) => Ok(value),
        _ => Err(CliError::validation(code, message)),
    }
}

fn workflow_id_arg(workflow: &str, command: &str) -> Result<String, CliError> {
    let workflow = workflow.trim();
    if workflow.is_empty() {
        return Err(CliError::validation(
            "missing_workflow_id",
            format!("Workflow {command} requires --workflow"),
        ));
    }
    Ok(workflow.to_string())
}

fn workflow_options_arg(input: Option<&str>) -> Result<Value, CliError> {
    json_object_arg(
        input,
        "invalid_workflow_options",
        "Workflow options must be a JSON object",
    )
}

fn provider_profile_arg(input: Option<&str>) -> Result<Value, CliError> {
    json_object_arg(
        input,
        "invalid_provider_profile",
        "Provider profile must be a JSON object",
    )
}

fn workflow_describe_input(args: WorkflowDescribeArgs) -> Result<Value, CliError> {
    let workflow = workflow_id_arg(&args.workflow, "describe")?;
    Ok(json!({
        "workflowId": workflow,
        "workflowOptions": workflow_options_arg(args.workflow_options.as_deref())?,
        "providerProfile": provider_profile_arg(args.provider_profile.as_deref())?
    }))
}

fn workflow_selection_from(
    items_input: Option<&str>,
    none: bool,
    command: &str,
) -> Result<Value, CliError> {
    if none {
        return Ok(json!({ "kind": "none" }));
    }
    let Some(items_input) = items_input else {
        return Err(CliError::validation(
            "missing_workflow_selection",
            format!("Workflow {command} requires --items or --none"),
        ));
    };
    let items = read_json_arg(Some(items_input))?;
    if !items.is_array() {
        return Err(CliError::validation(
            "invalid_workflow_items",
            "Workflow --items must be a JSON array",
        ));
    }
    Ok(json!({
        "kind": "items",
        "items": items
    }))
}

fn workflow_selection(args: &WorkflowSubmitArgs) -> Result<Value, CliError> {
    workflow_selection_from(args.items.as_deref(), args.none, "submit")
}

fn workflow_submit_input(args: WorkflowSubmitArgs) -> Result<Value, CliError> {
    let workflow = workflow_id_arg(&args.workflow, "submit")?;
    Ok(json!({
        "workflowId": workflow,
        "selection": workflow_selection(&args)?,
        "workflowOptions": workflow_options_arg(args.workflow_options.as_deref())?,
        "providerProfile": provider_profile_arg(args.provider_profile.as_deref())?
    }))
}

fn workflow_agent_run_input(args: &WorkflowAgentRunArgs) -> Result<Value, CliError> {
    let workflow = workflow_id_arg(&args.workflow, "agent-run")?;
    Ok(json!({
        "workflowId": workflow,
        "selection": workflow_selection_from(args.items.as_deref(), args.none, "agent-run")?,
        "delivery": {
            "mode": "bundle"
        }
    }))
}

fn workflow_agent_run(
    config: &BridgeConfig,
    args: WorkflowAgentRunArgs,
) -> Result<Value, CliError> {
    let output_dir = args.output_dir.clone();
    let result = client::post(
        config,
        "/workflows/agent-run",
        workflow_agent_run_input(&args)?,
    )?;
    let Some(output_dir) = output_dir else {
        return Ok(result);
    };
    let file_id = result
        .pointer("/bundle/file/fileId")
        .and_then(Value::as_str)
        .ok_or_else(|| {
            CliError::protocol(
                "missing_agent_run_bundle_file",
                "Workflow agent-run response did not include a downloadable bundle file",
            )
        })?;
    let display_name = result
        .pointer("/bundle/file/displayName")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("workflow-agent-run.zip");
    let output = available_output_path(&output_dir.join(display_name));
    let response = client::download(config, &format!("/files/{file_id}"))?;
    write_download_output(&output, &response.bytes, false)?;
    Ok(merge_agent_run_download_payload(
        result,
        &output,
        response.bytes.len(),
        response.content_type,
    ))
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

fn available_output_path(preferred: &Path) -> PathBuf {
    if !preferred.exists() {
        return preferred.to_path_buf();
    }
    let parent = preferred.parent().unwrap_or_else(|| Path::new(""));
    let stem = preferred
        .file_stem()
        .and_then(|entry| entry.to_str())
        .unwrap_or("workflow-agent-run");
    let extension = preferred
        .extension()
        .and_then(|entry| entry.to_str())
        .map(|entry| format!(".{entry}"))
        .unwrap_or_default();
    for index in 1..1000 {
        let candidate = parent.join(format!("{stem}-{index}{extension}"));
        if !candidate.exists() {
            return candidate;
        }
    }
    parent.join(format!("{stem}-{}{}", std::process::id(), extension))
}

fn merge_agent_run_download_payload(
    mut result: Value,
    output: &Path,
    bytes_written: usize,
    content_type: String,
) -> Value {
    if let Value::Object(ref mut map) = result {
        map.insert(
            "download".to_string(),
            json!({
                "outputPath": output.display().to_string(),
                "outputName": output_name(output),
                "bytesWritten": bytes_written,
                "contentType": content_type
            }),
        );
    }
    result
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
    use crate::args::BridgeInputArgs;

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
    fn maps_domain_subcommands_to_capabilities() {
        assert_eq!(
            topics_capability(&TopicsCommand::List(BridgeInputArgs { input: None })),
            "topics.list"
        );
        assert_eq!(
            topics_capability(&TopicsCommand::FindByPaperRef(BridgeInputArgs {
                input: None
            })),
            "topics.find_by_paper_ref"
        );
        assert_eq!(
            topics_capability(&TopicsCommand::GetContext(BridgeInputArgs { input: None })),
            "topics.get_context"
        );
        assert_eq!(
            topics_capability(&TopicsCommand::GetReport(BridgeInputArgs { input: None })),
            "topics.get_report"
        );
        assert_eq!(
            topics_capability(&TopicsCommand::GetReviewInput(BridgeInputArgs {
                input: None
            })),
            "topics.get_review_input"
        );
        assert_eq!(
            schemas_capability(&SchemasCommand::Get(BridgeInputArgs { input: None })),
            "schemas.get"
        );
        assert_eq!(
            concepts_capability(&ConceptsCommand::Query(BridgeInputArgs { input: None })),
            "concepts.query"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::Overview(BridgeInputArgs {
                input: None
            })),
            "citation_graph.get_overview"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::QueryCluster(BridgeInputArgs {
                input: None
            })),
            "citation_graph.query_cluster"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::GetSlice(BridgeInputArgs {
                input: None
            })),
            "citation_graph.get_slice"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::GetLayout(BridgeInputArgs {
                input: None
            })),
            "citation_graph.get_layout"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::GetMetrics(BridgeInputArgs {
                input: None
            })),
            "citation_graph.get_metrics"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::RankExternalReferences(
                BridgeInputArgs { input: None }
            )),
            "citation_graph.rank_external_references"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::RankLibraryPapers(BridgeInputArgs {
                input: None
            })),
            "citation_graph.rank_library_papers"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::RefreshMetrics(BridgeInputArgs {
                input: None
            })),
            "citation_graph.refresh_metrics"
        );
        assert_eq!(
            library_index_capability(&LibraryIndexCommand::Get(BridgeInputArgs { input: None })),
            "library_index.get"
        );
        assert_eq!(
            resolvers_capability(&ResolversCommand::Resolve(BridgeInputArgs { input: None })),
            "resolvers.resolve"
        );
        assert_eq!(
            reference_index_capability(&ReferenceIndexCommand::Get(BridgeInputArgs {
                input: None
            })),
            "reference_index.get"
        );
        assert_eq!(
            paper_artifacts_capability(&PaperArtifactsCommand::Manifest(BridgeInputArgs {
                input: None
            })),
            "paper_artifacts.get_manifest"
        );
        assert_eq!(
            paper_artifacts_capability(&PaperArtifactsCommand::Read(BridgeInputArgs {
                input: None
            })),
            "paper_artifacts.read"
        );
        assert_eq!(
            paper_artifacts_capability(&PaperArtifactsCommand::ExportFiltered(BridgeInputArgs {
                input: None
            })),
            "paper_artifacts.export_filtered"
        );
        assert_eq!(
            paper_artifacts_capability(&PaperArtifactsCommand::ResolveTopicDigest(
                BridgeInputArgs { input: None }
            )),
            "paper_artifacts.resolve_topic_digest"
        );
        assert_eq!(
            insights_capability(&InsightsCommand::AttentionQueue(BridgeInputArgs {
                input: None
            })),
            "insights.get_attention_queue"
        );
    }

    #[test]
    fn maps_debug_subcommands_to_capabilities() {
        use crate::args::{
            DebugAcpSkillRunArgs, DebugAcpSkillRunCommand, DebugArgs, DebugCommand, DebugInputArgs,
            DebugSynthesisArgs, DebugSynthesisCommand,
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
                    command: DebugCommand::AcpSkillRun(DebugAcpSkillRunArgs {
                        command: DebugAcpSkillRunCommand::ReapplyResult(DebugInputArgs {
                            input: None,
                        }),
                    }),
                },
                "debug.acpSkillRun.reapplyResult",
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
                        command: DebugSynthesisCommand::Operations(DebugInputArgs { input: None }),
                    }),
                },
                "debug.synthesis.operations.list",
            ),
            (
                DebugArgs {
                    command: DebugCommand::Synthesis(DebugSynthesisArgs {
                        command: DebugSynthesisCommand::Profiler(DebugInputArgs { input: None }),
                    }),
                },
                "debug.synthesis.profiler.list",
            ),
            (
                DebugArgs {
                    command: DebugCommand::Synthesis(DebugSynthesisArgs {
                        command: DebugSynthesisCommand::Cache(DebugInputArgs { input: None }),
                    }),
                },
                "debug.synthesis.cache.list",
            ),
            (
                DebugArgs {
                    command: DebugCommand::Synthesis(DebugSynthesisArgs {
                        command: DebugSynthesisCommand::CleanInstallReset(DebugInputArgs {
                            input: Some("{\"confirm\":true}".to_string()),
                        }),
                    }),
                },
                "debug.synthesis.cleanInstallReset",
            ),
        ];

        for (args, capability) in cases {
            let (actual, _input) = debug_capability_and_input(args).unwrap();
            assert_eq!(actual, capability);
        }
    }

    #[test]
    fn reads_bridge_inline_and_file_inputs() {
        let inline = bridge_input(BridgeInputArgs {
            input: Some("{\"cursor\":1}".to_string()),
        })
        .unwrap();
        assert_eq!(inline, json!({ "cursor": 1 }));

        let path = std::env::temp_dir().join(format!(
            "zotero-bridge-domain-input-{}.json",
            std::process::id()
        ));
        fs::write(&path, "{\"paperRefs\":[\"p1\"]}").unwrap();
        let file = bridge_input(BridgeInputArgs {
            input: Some(format!("@{}", path.display())),
        })
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
            items: Some("[{\"key\":\"ABC\",\"libraryId\":1}]".to_string()),
            none: false,
            workflow_options: Some("{\"language\":\"zh-CN\"}".to_string()),
            provider_profile: Some(
                "{\"schema\":\"zotero-bridge.provider-profile.v1\",\"backendId\":\"acp-opencode\",\"providerOptions\":{\"acpModelId\":\"gpt-5.2\"}}".to_string(),
            ),
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "workflowId": "topic-synthesis",
                "selection": {
                    "kind": "items",
                    "items": [
                        {
                            "key": "ABC",
                            "libraryId": 1
                        }
                    ]
                },
                "workflowOptions": {
                    "language": "zh-CN"
                },
                "providerProfile": {
                    "schema": "zotero-bridge.provider-profile.v1",
                    "backendId": "acp-opencode",
                    "providerOptions": {
                        "acpModelId": "gpt-5.2"
                    }
                }
            })
        );
    }

    #[test]
    fn maps_workflow_submit_none_selection() {
        let input = workflow_submit_input(WorkflowSubmitArgs {
            workflow: "global-workflow".to_string(),
            items: None,
            none: true,
            workflow_options: None,
            provider_profile: None,
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "workflowId": "global-workflow",
                "selection": {
                    "kind": "none"
                },
                "workflowOptions": {},
                "providerProfile": {}
            })
        );
    }

    #[test]
    fn maps_workflow_agent_run_to_bridge_input() {
        let input = workflow_agent_run_input(&WorkflowAgentRunArgs {
            workflow: "topic-synthesis".to_string(),
            items: Some("[{\"key\":\"ABC\",\"libraryId\":1}]".to_string()),
            none: false,
            output_dir: None,
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "workflowId": "topic-synthesis",
                "selection": {
                    "kind": "items",
                    "items": [
                        {
                            "key": "ABC",
                            "libraryId": 1
                        }
                    ]
                },
                "delivery": {
                    "mode": "bundle"
                }
            })
        );
    }

    #[test]
    fn maps_workflow_agent_run_none_selection() {
        let input = workflow_agent_run_input(&WorkflowAgentRunArgs {
            workflow: "global-workflow".to_string(),
            items: None,
            none: true,
            output_dir: None,
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "workflowId": "global-workflow",
                "selection": {
                    "kind": "none"
                },
                "delivery": {
                    "mode": "bundle"
                }
            })
        );
    }

    #[test]
    fn maps_workflow_agent_run_items_from_file() {
        let path = std::env::temp_dir().join(format!(
            "zotero-bridge-agent-run-items-{}.json",
            std::process::id()
        ));
        fs::write(&path, "[{\"id\":123}]").unwrap();
        let input = workflow_agent_run_input(&WorkflowAgentRunArgs {
            workflow: "topic-synthesis".to_string(),
            items: Some(format!("@{}", path.display())),
            none: false,
            output_dir: None,
        })
        .unwrap();
        assert_eq!(input.pointer("/selection/items/0/id"), Some(&json!(123)));
        let _ = fs::remove_file(path);
    }

    #[test]
    fn maps_workflow_describe_to_bridge_input() {
        let input = workflow_describe_input(WorkflowDescribeArgs {
            workflow: "topic-synthesis".to_string(),
            workflow_options: Some("{\"language\":\"en-US\"}".to_string()),
            provider_profile: Some("{\"backendId\":\"skillrunner\"}".to_string()),
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "workflowId": "topic-synthesis",
                "workflowOptions": {
                    "language": "en-US"
                },
                "providerProfile": {
                    "backendId": "skillrunner"
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
