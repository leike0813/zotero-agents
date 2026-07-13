use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
    thread,
    time::{Duration, Instant},
};

use serde_json::{json, Map, Value};

use crate::{
    args::{
        AnnotationArgs, AnnotationCommand, AnnotationExportArgs, AnnotationItemArgs, BridgeArgs,
        BridgeBackendArgs, BridgeBackendCommand, BridgeBackendStatusArgs, BridgeCommand,
        BridgeInputArgs, BridgeProfileArgs, BridgeProfileCommand, BridgeQueryArgs, CallArgs,
        CitationGraphArgs, CitationGraphCommand, ConceptsArgs, ConceptsCommand, ContextArgs,
        ContextCollectionCommand, ContextCollectionOpenArgs, ContextCommand, ContextItemCommand,
        ContextNoteCommand, ContextObjectRefArgs, ContextSelectionCommand,
        ContextSelectionOpenArgs, DebugAcpSkillRunCommand, DebugArgs, DebugCommand, DebugInputArgs,
        DebugSynthesisCommand, FileArgs, FileCommand, FileDownloadArgs, FileUploadArgs,
        InsightsArgs, InsightsCommand, ItemArgs, ItemCommand, ItemNotesArgs, ItemRefArgs,
        ItemSearchArgs, LibraryArgs, LibraryCommand, LibraryItemsCommand, LibraryReadinessCommand,
        LiteratureIngestArgs, MutationArgs, MutationCollectionArgs, MutationCollectionCommand,
        MutationCollectionCreateArgs, MutationCollectionItemsArgs, MutationCommand,
        MutationItemArgs, MutationItemAttachFileArgs, MutationItemCommand, MutationItemUpdateArgs,
        MutationNoteArgs, MutationNoteCommand, MutationNoteCreateArgs, MutationNotePayloadArgs,
        MutationNoteUpdateArgs, MutationTagArgs, MutationTagCommand, MutationTagsArgs, NoteArgs,
        NoteCommand, NoteDetailArgs, NotePayloadArgs, NotificationAckArgs, NotificationCommand,
        NotificationListArgs, NotificationWaitArgs, PaperArtifactsArgs, PaperArtifactsCommand,
        PermissionRequestIdArgs, ProductArgs, ProductCommand, ProductDownloadArgs, ProductIdArgs,
        ProductListArgs, ResolversArgs, ResolversCommand, RunArgs, RunCommand, RunPermissionArgs,
        RunPermissionCommand, RunWorkflowArgs, RunWorkflowCommand, RunWorkflowRecentArgs,
        SchemasArgs, SchemasCommand, SkillRunCommand, SkillRunEventsArgs, SkillRunIdArgs,
        SkillRunRecentArgs, SkillRunReplyArgs, SynthesisArgs, SynthesisCacheArgs,
        SynthesisCacheCommand, SynthesisCacheInvalidateArgs, SynthesisCommand,
        SynthesisIndexCommand, SynthesisIndexGetCommand, TaskListArgs, TaskRecentArgs, TopicsArgs,
        TopicsCommand, WorkflowAgentApplyArgs, WorkflowAgentRunArgs, WorkflowArgs,
        WorkflowCancelArgs, WorkflowCommand, WorkflowDescribeArgs, WorkflowRequirementsArgs,
        WorkflowRunArgs, WorkflowSubmitArgs,
    },
    client,
    config::BridgeConfig,
    error::{CliError, ErrorCategory},
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

pub fn bridge(config: &BridgeConfig, args: BridgeArgs) -> Result<Value, CliError> {
    match args.command {
        BridgeCommand::Status => status(config),
        BridgeCommand::Manifest => manifest(config),
        BridgeCommand::Profile(args) => bridge_profile(config, args),
        BridgeCommand::Backend(args) => bridge_backend(config, args),
    }
}

fn bridge_profile(config: &BridgeConfig, args: BridgeProfileArgs) -> Result<Value, CliError> {
    match args.command {
        BridgeProfileCommand::Inspect => client::get(config, "/diagnostics/profile"),
        BridgeProfileCommand::Diagnose => client::get(config, "/diagnostics/profile/diagnose"),
    }
}

fn bridge_backend(config: &BridgeConfig, args: BridgeBackendArgs) -> Result<Value, CliError> {
    match args.command {
        BridgeBackendCommand::List => client::get(config, "/diagnostics/backends"),
        BridgeBackendCommand::Status(args) => bridge_backend_status(config, args),
    }
}

fn bridge_backend_status(
    config: &BridgeConfig,
    args: BridgeBackendStatusArgs,
) -> Result<Value, CliError> {
    client::get(
        config,
        &format!(
            "/diagnostics/backends/{}",
            percent_encode_path(&args.backend_id)
        ),
    )
}

pub fn call(config: &BridgeConfig, args: CallArgs) -> Result<Value, CliError> {
    let input = read_json_arg(args.input.as_deref())?;
    client::call(config, &args.capability, input)
}

pub fn item(config: &BridgeConfig, args: ItemArgs) -> Result<Value, CliError> {
    match args.command {
        ItemCommand::Search(args) => {
            call_capability(config, "library.search_items", item_search_input(args)?)
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

pub fn library(config: &BridgeConfig, args: LibraryArgs) -> Result<Value, CliError> {
    match args.command {
        LibraryCommand::Items(args) => match args.command {
            LibraryItemsCommand::List(input) => {
                call_capability(config, "library.list_items", bridge_query(input)?)
            }
        },
        LibraryCommand::Item(args) => item(config, args),
        LibraryCommand::Note(args) => note(config, args),
        LibraryCommand::Annotation(args) => annotation(config, args),
        LibraryCommand::Snapshot(input) => {
            call_capability(config, "library.sync_snapshot", bridge_query(input)?)
        }
        LibraryCommand::Readiness(args) => call_capability(
            config,
            "library.readiness_audit",
            library_readiness_input(args.command)?,
        ),
    }
}

pub fn annotation(config: &BridgeConfig, args: AnnotationArgs) -> Result<Value, CliError> {
    match args.command {
        AnnotationCommand::List(args) => call_capability(
            config,
            "library.list_annotations",
            annotation_item_input(args)?,
        ),
        AnnotationCommand::Export(args) => call_capability(
            config,
            "library.export_annotations",
            annotation_export_input(args)?,
        ),
    }
}

pub fn context(config: &BridgeConfig, args: ContextArgs) -> Result<Value, CliError> {
    match args.command {
        ContextCommand::Current => client::get(config, "/context/current"),
        ContextCommand::Selection(args) => match args.command {
            ContextSelectionCommand::Get => client::get(config, "/context/selection"),
            ContextSelectionCommand::Open(args) => client::post(
                config,
                "/context/selection/open",
                context_selection_open_input(args)?,
            ),
        },
        ContextCommand::Item(args) => match args.command {
            ContextItemCommand::Open(args) => client::post(
                config,
                "/context/items/open",
                context_object_open_input("item", args)?,
            ),
        },
        ContextCommand::Note(args) => match args.command {
            ContextNoteCommand::Open(args) => client::post(
                config,
                "/context/notes/open",
                context_object_open_input("note", args)?,
            ),
        },
        ContextCommand::Collection(args) => match args.command {
            ContextCollectionCommand::Open(args) => client::post(
                config,
                "/context/collections/open",
                context_collection_open_input(args)?,
            ),
        },
    }
}

pub fn synthesis(config: &BridgeConfig, args: SynthesisArgs) -> Result<Value, CliError> {
    match args.command {
        SynthesisCommand::Topic(args) => topics(config, args),
        SynthesisCommand::Schema(args) => schemas(config, args),
        SynthesisCommand::Concept(args) => concepts(config, args),
        SynthesisCommand::Graph(args) => citation_graph(config, args),
        SynthesisCommand::Index(args) => match args.command {
            SynthesisIndexCommand::Status => client::get(config, "/synthesis/index/status"),
            SynthesisIndexCommand::Library(args) => match args.command {
                SynthesisIndexGetCommand::Get(input) => {
                    call_capability(config, "library_index.get", bridge_query(input)?)
                }
            },
            SynthesisIndexCommand::Reference(args) => match args.command {
                SynthesisIndexGetCommand::Get(input) => {
                    call_capability(config, "reference_index.get", bridge_query(input)?)
                }
            },
        },
        SynthesisCommand::Cache(args) => synthesis_cache(config, args),
        SynthesisCommand::Resolver(args) => resolvers(config, args),
        SynthesisCommand::Artifact(args) => paper_artifacts(config, args),
        SynthesisCommand::Insight(args) => insights(config, args),
    }
}

fn synthesis_cache(config: &BridgeConfig, args: SynthesisCacheArgs) -> Result<Value, CliError> {
    match args.command {
        SynthesisCacheCommand::Status => client::get(config, "/synthesis/cache/status"),
        SynthesisCacheCommand::Invalidate(args) => client::post(
            config,
            "/synthesis/cache/invalidate",
            synthesis_cache_invalidate_input(args),
        ),
    }
}

pub fn mutation(config: &BridgeConfig, args: MutationArgs) -> Result<Value, CliError> {
    match args.command {
        MutationCommand::Preview(input) => {
            call_capability(config, "mutation.preview", bridge_input(input)?)
        }
        MutationCommand::Apply(input) => {
            call_capability(config, "mutation.execute", bridge_input(input)?)
        }
        MutationCommand::LiteratureIngest(args) => {
            call_capability(config, "mutation.execute", literature_ingest_input(args)?)
        }
        MutationCommand::Tag(args) => {
            call_capability(config, "mutation.execute", mutation_tag_input(args)?)
        }
        MutationCommand::Collection(args) => {
            call_capability(config, "mutation.execute", mutation_collection_input(args)?)
        }
        MutationCommand::Item(args) => {
            call_capability(config, "mutation.execute", mutation_item_input(args)?)
        }
        MutationCommand::Note(args) => {
            call_capability(config, "mutation.execute", mutation_note_input(args)?)
        }
    }
}

pub fn product(config: &BridgeConfig, args: ProductArgs) -> Result<Value, CliError> {
    match args.command {
        ProductCommand::List(args) => {
            call_capability(config, "workflow_products.list", product_list_input(args))
        }
        ProductCommand::Get(args) => {
            call_capability(config, "workflow_products.get", product_id_input(args))
        }
        ProductCommand::Download(args) => call_capability(
            config,
            "workflow_products.export",
            product_download_input(args),
        ),
        ProductCommand::Remove(args) => {
            call_capability(config, "workflow_products.remove", product_id_input(args))
        }
    }
}

fn product_id_input(args: ProductIdArgs) -> Value {
    json!({ "productId": args.product_id.trim() })
}

fn product_list_input(args: ProductListArgs) -> Value {
    let mut input = Map::new();
    push_value(&mut input, "workflowId", args.workflow_id);
    push_value(&mut input, "backendId", args.backend_id);
    push_value(&mut input, "requestId", args.request_id);
    insert_u32(&mut input, "cursor", args.cursor);
    insert_u32(&mut input, "limit", args.limit);
    Value::Object(input)
}

fn product_download_input(args: ProductDownloadArgs) -> Value {
    let mut input = Map::new();
    input.insert("productId".to_string(), json!(args.product_id.trim()));
    push_value(&mut input, "assetId", args.asset);
    input.insert(
        "outputDir".to_string(),
        json!(args.output_dir.display().to_string()),
    );
    input.insert("overwrite".to_string(), json!(args.force));
    Value::Object(input)
}

pub fn topics(config: &BridgeConfig, args: TopicsArgs) -> Result<Value, CliError> {
    let capability = topics_capability(&args.command);
    let input = bridge_query(topics_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn schemas(config: &BridgeConfig, args: SchemasArgs) -> Result<Value, CliError> {
    let capability = schemas_capability(&args.command);
    let input = bridge_query(schemas_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn concepts(config: &BridgeConfig, args: ConceptsArgs) -> Result<Value, CliError> {
    let capability = concepts_capability(&args.command);
    let input = bridge_query(concepts_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn citation_graph(config: &BridgeConfig, args: CitationGraphArgs) -> Result<Value, CliError> {
    if let CitationGraphCommand::RefreshMetrics(input) = args.command {
        return call_capability(
            config,
            "citation_graph.refresh_metrics",
            bridge_input(input)?,
        );
    }
    let capability = citation_graph_capability(&args.command);
    let input = bridge_query(citation_graph_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn resolvers(config: &BridgeConfig, args: ResolversArgs) -> Result<Value, CliError> {
    let capability = resolvers_capability(&args.command);
    let input = bridge_query(resolvers_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn paper_artifacts(config: &BridgeConfig, args: PaperArtifactsArgs) -> Result<Value, CliError> {
    let capability = paper_artifacts_capability(&args.command);
    let input = bridge_query(paper_artifacts_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn insights(config: &BridgeConfig, args: InsightsArgs) -> Result<Value, CliError> {
    let capability = insights_capability(&args.command);
    let input = bridge_query(insights_input(args.command))?;
    call_capability(config, capability, input)
}

pub fn workflow(config: &BridgeConfig, args: WorkflowArgs) -> Result<Value, CliError> {
    match args.command {
        WorkflowCommand::List => client::get(config, "/workflows"),
        WorkflowCommand::Describe(args) => client::post(
            config,
            "/workflows/describe",
            workflow_describe_input(args)?,
        ),
        WorkflowCommand::Validate(args) => {
            client::post(config, "/workflows/validate", workflow_submit_input(args)?)
        }
        WorkflowCommand::Requirements(args) => client::post(
            config,
            "/workflows/requirements",
            workflow_requirements_input(args)?,
        ),
        WorkflowCommand::Submit(args) => {
            client::post(config, "/workflows/submit", workflow_submit_input(args)?)
        }
        WorkflowCommand::AgentRun(args) => workflow_agent_run(config, args),
        WorkflowCommand::AgentApply(args) => workflow_agent_apply(config, args),
    }
}

pub fn run(config: &BridgeConfig, args: RunArgs) -> Result<Value, CliError> {
    match args.command {
        RunCommand::Get(args) => client::get(config, &workflow_run_path(args)?),
        RunCommand::Cancel(args) => client::post(
            config,
            &workflow_cancel_path(&args)?,
            workflow_cancel_input(args),
        ),
        RunCommand::List(args) => client::get(config, &task_list_path(args)),
        RunCommand::Active => client::get(config, "/tasks/active"),
        RunCommand::Recent(args) => client::get(config, &task_recent_path(args)),
        RunCommand::Workflow(args) => run_workflow(config, args),
        RunCommand::Skill(args) => match args.command {
            SkillRunCommand::Get(args) => client::get(config, &skill_run_path(&args)?),
            SkillRunCommand::Reply(args) => client::post(
                config,
                &skill_run_reply_path(&args)?,
                skill_run_reply_input(args),
            ),
            SkillRunCommand::Connect(args) => {
                client::post(config, &skill_run_connect_path(&args)?, json!({}))
            }
            SkillRunCommand::Recent(args) => client::get(config, &skill_run_recent_path(args)),
            SkillRunCommand::Events(args) => client::get(config, &skill_run_events_path(args)?),
        },
        RunCommand::Notification(args) => match args.command {
            NotificationCommand::List(args) => client::get(
                config,
                &notification_list_path(notification_list_query(args)),
            ),
            NotificationCommand::Wait(args) => notification_wait(config, args),
            NotificationCommand::Ack(args) => {
                client::post(config, "/notifications/ack", notification_ack_input(args)?)
            }
        },
        RunCommand::Permission(args) => run_permission(config, args),
    }
}

fn run_workflow(config: &BridgeConfig, args: RunWorkflowArgs) -> Result<Value, CliError> {
    match args.command {
        RunWorkflowCommand::Recent(args) => client::get(config, &workflow_runs_path(args)),
    }
}

fn run_permission(config: &BridgeConfig, args: RunPermissionArgs) -> Result<Value, CliError> {
    match args.command {
        RunPermissionCommand::Pending => client::get(config, "/permissions/pending"),
        RunPermissionCommand::Get(args) => client::get(config, &permission_path(args)),
    }
}

pub fn file(config: &BridgeConfig, args: FileArgs) -> Result<Value, CliError> {
    match args.command {
        FileCommand::Download(args) => file_download(config, args),
        FileCommand::Upload(args) => file_upload(config, args),
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

fn topics_input(command: TopicsCommand) -> BridgeQueryArgs {
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

fn schemas_input(command: SchemasCommand) -> BridgeQueryArgs {
    match command {
        SchemasCommand::Get(args) => args,
    }
}

fn concepts_capability(command: &ConceptsCommand) -> &'static str {
    match command {
        ConceptsCommand::Query(_) => "concepts.query",
    }
}

fn concepts_input(command: ConceptsCommand) -> BridgeQueryArgs {
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

fn citation_graph_input(command: CitationGraphCommand) -> BridgeQueryArgs {
    match command {
        CitationGraphCommand::Overview(args)
        | CitationGraphCommand::QueryCluster(args)
        | CitationGraphCommand::GetSlice(args)
        | CitationGraphCommand::GetLayout(args)
        | CitationGraphCommand::GetMetrics(args)
        | CitationGraphCommand::RankExternalReferences(args)
        | CitationGraphCommand::RankLibraryPapers(args) => args,
        CitationGraphCommand::RefreshMetrics(_) => unreachable!("mutation input uses --input"),
    }
}

fn resolvers_capability(command: &ResolversCommand) -> &'static str {
    match command {
        ResolversCommand::Resolve(_) => "resolvers.resolve",
    }
}

fn resolvers_input(command: ResolversCommand) -> BridgeQueryArgs {
    match command {
        ResolversCommand::Resolve(args) => args,
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

fn paper_artifacts_input(command: PaperArtifactsCommand) -> BridgeQueryArgs {
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

fn insights_input(command: InsightsCommand) -> BridgeQueryArgs {
    match command {
        InsightsCommand::AttentionQueue(args) => args,
    }
}

fn bridge_input(args: BridgeInputArgs) -> Result<Value, CliError> {
    read_json_arg(args.input.as_deref())
}

fn bridge_query(args: BridgeQueryArgs) -> Result<Value, CliError> {
    read_json_arg(args.query.as_deref())
}

fn library_readiness_input(command: LibraryReadinessCommand) -> Result<Value, CliError> {
    let (input, check) = match command {
        LibraryReadinessCommand::Audit(input) => return bridge_query(input),
        LibraryReadinessCommand::MissingPdf(input) => (input, "pdf"),
        LibraryReadinessCommand::MissingMarkdown(input) => (input, "markdown"),
        LibraryReadinessCommand::MissingAnalysis(input) => (input, "analysis"),
    };
    let mut value = bridge_query(input)?;
    if !value.is_object() {
        value = json!({});
    }
    let object = value.as_object_mut().expect("readiness input object");
    object.insert("checks".to_string(), json!([check]));
    object.insert("missingOnly".to_string(), Value::Bool(true));
    Ok(value)
}

fn literature_ingest_input(args: LiteratureIngestArgs) -> Result<Value, CliError> {
    let input = read_json_arg(Some(&args.input))?;
    let mut object = match input {
        Value::Object(map) => map,
        _ => {
            return Err(CliError::validation(
                "invalid_literature_ingest_input",
                "mutation literature-ingest input must be a JSON object",
            ));
        }
    };
    object.insert(
        "operation".to_string(),
        Value::String("literature.ingest".to_string()),
    );
    Ok(Value::Object(object))
}

fn merge_operation_input(operation: &str, input: Value) -> Result<Value, CliError> {
    let mut object = match input {
        Value::Object(map) => map,
        _ => {
            return Err(CliError::validation(
                "invalid_mutation_input",
                "Mutation command input must be a JSON object",
            ));
        }
    };
    object.insert(
        "operation".to_string(),
        Value::String(operation.to_string()),
    );
    Ok(Value::Object(object))
}

fn refs_value(values: Vec<String>) -> Result<Value, CliError> {
    Ok(Value::Array(
        values
            .into_iter()
            .map(|value| context_ref_value(&value))
            .collect::<Result<Vec<_>, _>>()?,
    ))
}

fn annotation_item_input(args: AnnotationItemArgs) -> Result<Value, CliError> {
    Ok(json!({ "ref": context_ref_value(&args.item)? }))
}

fn annotation_export_input(args: AnnotationExportArgs) -> Result<Value, CliError> {
    Ok(json!({
        "ref": context_ref_value(&args.item)?,
        "format": args.format.unwrap_or_else(|| "markdown".to_string())
    }))
}

fn synthesis_cache_invalidate_input(args: SynthesisCacheInvalidateArgs) -> Value {
    let mut input = json!({ "scope": args.scope });
    if let Some(id) = args.id {
        input["id"] = Value::String(id);
    }
    input
}

fn mutation_tag_input(args: MutationTagArgs) -> Result<Value, CliError> {
    let (operation, input) = match args.command {
        MutationTagCommand::Add(input) => ("item.addTags", input),
        MutationTagCommand::Remove(input) => ("item.removeTags", input),
    };
    mutation_tags_input(operation, input)
}

fn mutation_tags_input(operation: &str, args: MutationTagsArgs) -> Result<Value, CliError> {
    Ok(json!({
        "operation": operation,
        "items": refs_value(args.items)?,
        "tags": args.tags,
    }))
}

fn mutation_collection_input(args: MutationCollectionArgs) -> Result<Value, CliError> {
    match args.command {
        MutationCollectionCommand::Create(args) => mutation_collection_create_input(args),
        MutationCollectionCommand::AddItems(args) => {
            mutation_collection_items_input("collection.addItems", args)
        }
        MutationCollectionCommand::RemoveItems(args) => {
            mutation_collection_items_input("collection.removeItems", args)
        }
    }
}

fn mutation_collection_create_input(args: MutationCollectionCreateArgs) -> Result<Value, CliError> {
    merge_operation_input("collection.create", read_json_arg(Some(&args.input))?)
}

fn mutation_collection_items_input(
    operation: &str,
    args: MutationCollectionItemsArgs,
) -> Result<Value, CliError> {
    Ok(json!({
        "operation": operation,
        "collection": context_ref_value(&args.collection)?,
        "items": refs_value(args.items)?,
    }))
}

fn mutation_item_input(args: MutationItemArgs) -> Result<Value, CliError> {
    match args.command {
        MutationItemCommand::Update(args) => mutation_item_update_input(args),
        MutationItemCommand::AttachFile(args) => mutation_item_attach_file_input(args),
    }
}

fn mutation_item_update_input(args: MutationItemUpdateArgs) -> Result<Value, CliError> {
    let fields = read_json_arg(Some(&args.patch))?;
    match fields {
        Value::Object(_) => Ok(json!({
            "operation": "item.updateFields",
            "item": context_ref_value(&args.item)?,
            "fields": fields,
        })),
        _ => Err(CliError::validation(
            "invalid_item_patch",
            "Item patch must be a JSON object",
        )),
    }
}

fn mutation_item_attach_file_input(args: MutationItemAttachFileArgs) -> Result<Value, CliError> {
    let file_id = normalize_file_id(&args.file)?;
    let mut object = Map::new();
    object.insert(
        "operation".to_string(),
        Value::String("item.attachFile".to_string()),
    );
    object.insert("item".to_string(), context_ref_value(&args.item)?);
    object.insert("fileId".to_string(), Value::String(file_id));
    if let Some(display_name) = args.display_name {
        object.insert("displayName".to_string(), Value::String(display_name));
    }
    if let Some(content_type) = args.content_type {
        object.insert("contentType".to_string(), Value::String(content_type));
    }
    Ok(Value::Object(object))
}

fn mutation_note_input(args: MutationNoteArgs) -> Result<Value, CliError> {
    match args.command {
        MutationNoteCommand::Create(args) => mutation_note_create_input(args),
        MutationNoteCommand::Update(args) => mutation_note_update_input(args),
        MutationNoteCommand::UpsertPayload(args) => mutation_note_payload_input(args),
    }
}

fn mutation_note_create_input(args: MutationNoteCreateArgs) -> Result<Value, CliError> {
    let mut input = merge_operation_input("note.createChild", read_json_arg(Some(&args.input))?)?;
    if let Value::Object(ref mut object) = input {
        object.insert("parent".to_string(), context_ref_value(&args.item)?);
    }
    Ok(input)
}

fn mutation_note_update_input(args: MutationNoteUpdateArgs) -> Result<Value, CliError> {
    let mut input = merge_operation_input("note.update", read_json_arg(Some(&args.input))?)?;
    if let Value::Object(ref mut object) = input {
        object.insert("note".to_string(), context_ref_value(&args.note)?);
    }
    Ok(input)
}

fn mutation_note_payload_input(args: MutationNotePayloadArgs) -> Result<Value, CliError> {
    let mut input = merge_operation_input("note.upsertPayload", read_json_arg(Some(&args.input))?)?;
    if let Value::Object(ref mut object) = input {
        object.insert("note".to_string(), context_ref_value(&args.note)?);
    }
    Ok(input)
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

fn workflow_requirements_input(args: WorkflowRequirementsArgs) -> Result<Value, CliError> {
    let workflow = args.workflow.or(args.legacy_workflow).unwrap_or_default();
    let workflow = workflow_id_arg(&workflow, "requirements")?;
    Ok(json!({ "workflowId": workflow }))
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
            format!("Workflow {command} requires --selection or --none"),
        ));
    };
    let items = read_json_arg(Some(items_input))?;
    if !items.is_array() {
        return Err(CliError::validation(
            "invalid_workflow_items",
            "Workflow --selection must be a JSON array",
        ));
    }
    Ok(json!({
        "kind": "items",
        "items": items
    }))
}

fn workflow_selection(args: &WorkflowSubmitArgs) -> Result<Value, CliError> {
    workflow_selection_from(args.selection.as_deref(), args.none, "submit")
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
        "selection": workflow_selection_from(args.selection.as_deref(), args.none, "agent-run")?,
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
    let response = client::download(config, &format!("/files/{file_id}"))
        .map_err(|error| download_error_with_output_name(error, &output))?;
    write_download_output(&output, &response.bytes, false)?;
    Ok(merge_agent_run_download_payload(result, &output, &response))
}

fn workflow_agent_apply_result_arg(raw: &str) -> Result<Value, CliError> {
    let Some((agent_request_id, bundle_path)) = raw.split_once('=') else {
        return Err(CliError::validation(
            "invalid_agent_apply_result",
            "workflow agent-apply --result must be AGENT_REQUEST_ID=BUNDLE_PATH",
        ));
    };
    let agent_request_id = agent_request_id.trim();
    let bundle_path = bundle_path.trim();
    if agent_request_id.is_empty() || bundle_path.is_empty() {
        return Err(CliError::validation(
            "invalid_agent_apply_result",
            "workflow agent-apply --result requires non-empty request id and bundle path",
        ));
    }
    Ok(json!({
        "agentRequestId": agent_request_id,
        "bundle": {
            "kind": "local_path",
            "path": bundle_path
        }
    }))
}

fn workflow_agent_apply_input(args: &WorkflowAgentApplyArgs) -> Result<Value, CliError> {
    if args.agent_run_id.trim().is_empty() {
        return Err(CliError::validation(
            "missing_agent_run_id",
            "workflow agent-apply requires an agent run id",
        ));
    }
    let mut results = Vec::with_capacity(args.results.len());
    for result in &args.results {
        results.push(workflow_agent_apply_result_arg(result)?);
    }
    Ok(json!({ "results": results }))
}

fn workflow_agent_apply_path(args: &WorkflowAgentApplyArgs) -> Result<String, CliError> {
    let agent_run_id = args.agent_run_id.trim();
    if agent_run_id.is_empty() {
        return Err(CliError::validation(
            "missing_agent_run_id",
            "workflow agent-apply requires an agent run id",
        ));
    }
    Ok(format!(
        "/workflows/agent-runs/{}/apply",
        percent_encode_path(agent_run_id)
    ))
}

fn workflow_agent_apply(
    config: &BridgeConfig,
    args: WorkflowAgentApplyArgs,
) -> Result<Value, CliError> {
    client::post(
        config,
        &workflow_agent_apply_path(&args)?,
        workflow_agent_apply_input(&args)?,
    )
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

fn workflow_cancel_path(args: &WorkflowCancelArgs) -> Result<String, CliError> {
    let run_id = args.run_id.trim();
    if run_id.is_empty() {
        return Err(CliError::validation(
            "missing_run_id",
            "Workflow cancel requires a run id",
        ));
    }
    Ok(format!(
        "/workflows/runs/{}/cancel",
        percent_encode_path(run_id)
    ))
}

fn workflow_cancel_input(args: WorkflowCancelArgs) -> Value {
    let mut map = Map::new();
    if let Some(reason) = args.reason.map(|value| value.trim().to_string()) {
        if !reason.is_empty() {
            map.insert("reason".to_string(), Value::String(reason));
        }
    }
    if let Some(message) = args.message.map(|value| value.trim().to_string()) {
        if !message.is_empty() {
            map.insert("message".to_string(), Value::String(message));
        }
    }
    Value::Object(map)
}

fn normalized_skill_run_id(id: &str) -> Result<&str, CliError> {
    let trimmed = id.trim();
    if trimmed.is_empty() {
        return Err(CliError::validation(
            "missing_skill_run_id",
            "Skill run command requires a skill run id",
        ));
    }
    Ok(trimmed)
}

fn skill_run_path(args: &SkillRunIdArgs) -> Result<String, CliError> {
    Ok(format!(
        "/skill-runs/{}",
        percent_encode_path(normalized_skill_run_id(&args.skill_run_id)?)
    ))
}

fn skill_run_reply_path(args: &SkillRunReplyArgs) -> Result<String, CliError> {
    Ok(format!(
        "/skill-runs/{}/reply",
        percent_encode_path(normalized_skill_run_id(&args.skill_run_id)?)
    ))
}

fn skill_run_connect_path(args: &SkillRunIdArgs) -> Result<String, CliError> {
    Ok(format!(
        "/skill-runs/{}/connect",
        percent_encode_path(normalized_skill_run_id(&args.skill_run_id)?)
    ))
}

fn skill_run_recent_path(args: SkillRunRecentArgs) -> String {
    let mut query: Vec<(String, String)> = Vec::new();
    push_query(&mut query, "state", args.state);
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    path_with_query("/skill-runs/recent", query)
}

fn skill_run_events_path(args: SkillRunEventsArgs) -> Result<String, CliError> {
    let skill_run_id = normalized_skill_run_id(&args.skill_run_id)?;
    let mut query: Vec<(String, String)> = Vec::new();
    push_query(&mut query, "sinceUpdatedAt", args.since_updated_at);
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    Ok(path_with_query(
        &format!("/skill-runs/{}/events", percent_encode_path(skill_run_id)),
        query,
    ))
}

fn skill_run_reply_input(args: SkillRunReplyArgs) -> Value {
    json!({ "message": args.message })
}

fn context_ref_value(raw: &str) -> Result<Value, CliError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(CliError::validation(
            "missing_object_ref",
            "Context navigation requires a Zotero object ref",
        ));
    }
    if trimmed.starts_with('{') {
        let value: Value = serde_json::from_str(trimmed)
            .map_err(|error| CliError::validation("invalid_object_ref_json", error.to_string()))?;
        if !value.is_object() {
            return Err(CliError::validation(
                "invalid_object_ref_json",
                "Object ref JSON must be a JSON object",
            ));
        }
        return Ok(value);
    }
    if !is_safe_zotero_object_ref(trimmed) {
        return Err(CliError::validation(
            "invalid_object_ref",
            "Object ref must be a Zotero key, libraryId:itemKey, or JSON object",
        ));
    }
    Ok(Value::String(trimmed.to_string()))
}

fn is_safe_zotero_object_ref(value: &str) -> bool {
    if value.contains('/')
        || value.contains('\\')
        || value.contains("..")
        || value.contains('(')
        || value.contains(')')
        || value.contains(';')
        || value.contains('{')
        || value.contains('}')
        || value.contains('[')
        || value.contains(']')
    {
        return false;
    }
    if let Some((library_id, key)) = value.split_once(':') {
        return !library_id.is_empty()
            && library_id.chars().all(|entry| entry.is_ascii_digit())
            && is_zotero_key_like(key);
    }
    !value.contains(':') && is_zotero_key_like(value)
}

fn is_zotero_key_like(value: &str) -> bool {
    let length = value.len();
    (2..=128).contains(&length)
        && value
            .chars()
            .all(|entry| entry.is_ascii_alphanumeric() || entry == '_' || entry == '-')
}

fn context_object_open_input(field: &str, args: ContextObjectRefArgs) -> Result<Value, CliError> {
    let mut map = Map::new();
    map.insert(field.to_string(), context_ref_value(&args.object_ref)?);
    Ok(Value::Object(map))
}

fn context_selection_open_input(args: ContextSelectionOpenArgs) -> Result<Value, CliError> {
    let items = args
        .item_refs
        .iter()
        .map(|entry| context_ref_value(entry))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(json!({ "items": items }))
}

fn context_collection_open_input(args: ContextCollectionOpenArgs) -> Result<Value, CliError> {
    let key = args.collection_key.trim();
    if key.is_empty() {
        return Err(CliError::validation(
            "missing_collection_key",
            "Context collection open requires a collection key",
        ));
    }
    let mut map = Map::new();
    map.insert("key".to_string(), Value::String(key.to_string()));
    if let Some(library_id) = args.library_id {
        map.insert("libraryId".to_string(), json!(library_id));
    }
    Ok(Value::Object(map))
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
    path_with_query("/tasks", query)
}

fn task_recent_path(args: TaskRecentArgs) -> String {
    let mut query: Vec<(String, String)> = Vec::new();
    push_query(&mut query, "workflowId", args.workflow);
    push_query(&mut query, "backendId", args.backend);
    push_query(&mut query, "state", args.state);
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    path_with_query("/tasks/recent", query)
}

fn workflow_runs_path(args: RunWorkflowRecentArgs) -> String {
    let mut query: Vec<(String, String)> = Vec::new();
    push_query(&mut query, "workflowId", Some(args.workflow));
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    path_with_query("/workflows/runs", query)
}

fn permission_path(args: PermissionRequestIdArgs) -> String {
    format!(
        "/permissions/{}",
        percent_encode_path(args.permission_request_id.trim())
    )
}

fn notification_list_query(args: NotificationListArgs) -> Vec<(String, String)> {
    let mut query: Vec<(String, String)> = Vec::new();
    push_query(&mut query, "workflowRunId", args.workflow_run_id);
    push_query(&mut query, "skillRunId", args.skill_run_id);
    push_query(&mut query, "type", args.event_type);
    push_query(&mut query, "sinceEventId", args.since_event_id);
    push_query(&mut query, "clientId", args.client_id);
    if let Some(acknowledged) = args.acknowledged {
        query.push(("acknowledged".to_string(), acknowledged.to_string()));
    }
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    query
}

fn notification_wait_query(args: &NotificationWaitArgs) -> Vec<(String, String)> {
    let mut query: Vec<(String, String)> = Vec::new();
    push_query(&mut query, "workflowRunId", args.workflow_run_id.clone());
    push_query(&mut query, "skillRunId", args.skill_run_id.clone());
    push_query(&mut query, "type", args.event_type.clone());
    push_query(&mut query, "sinceEventId", args.since_event_id.clone());
    push_query(&mut query, "clientId", args.client_id.clone());
    if let Some(acknowledged) = args.acknowledged {
        query.push(("acknowledged".to_string(), acknowledged.to_string()));
    }
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    query
}

fn notification_list_path(query: Vec<(String, String)>) -> String {
    path_with_query("/notifications", query)
}

fn notification_ack_input(args: NotificationAckArgs) -> Result<Value, CliError> {
    let events = args
        .events
        .into_iter()
        .map(|entry| entry.trim().to_string())
        .filter(|entry| !entry.is_empty())
        .collect::<Vec<_>>();
    if events.is_empty() {
        return Err(CliError::validation(
            "missing_notification_event",
            "Notification ack requires at least one event id",
        ));
    }
    let mut input = Map::new();
    input.insert("eventIds".to_string(), json!(events));
    if let Some(client_id) = args.client_id {
        let trimmed = client_id.trim();
        if !trimmed.is_empty() {
            input.insert("clientId".to_string(), json!(trimmed));
        }
    }
    Ok(Value::Object(input))
}

fn notification_response_has_events(value: &Value) -> bool {
    value
        .pointer("/result/notifications")
        .and_then(Value::as_array)
        .map(|entries| !entries.is_empty())
        .unwrap_or(false)
}

fn notification_wait(config: &BridgeConfig, args: NotificationWaitArgs) -> Result<Value, CliError> {
    let timeout = Duration::from_millis(args.timeout_ms);
    let interval = Duration::from_millis(args.interval_ms.max(1));
    let started = Instant::now();
    loop {
        let response = client::get(
            config,
            &notification_list_path(notification_wait_query(&args)),
        )?;
        if notification_response_has_events(&response) {
            return Ok(response);
        }
        if started.elapsed() >= timeout {
            return Err(CliError::new(
                "notification_wait_timeout",
                ErrorCategory::Workflow,
                "No matching Host Bridge notification arrived before the timeout",
            )
            .with_details(json!({
                "timeoutMs": args.timeout_ms,
                "intervalMs": args.interval_ms
            })));
        }
        let remaining = timeout.saturating_sub(started.elapsed());
        thread::sleep(interval.min(remaining));
    }
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
    response: &client::DownloadResponse,
) -> Value {
    if let Value::Object(ref mut map) = result {
        map.insert(
            "download".to_string(),
            json!({
                "outputPath": output.display().to_string(),
                "outputName": output_name(output),
                "verified": response.verified,
                "bytesExpected": response.bytes_expected,
                "bytesWritten": response.bytes.len(),
                "sha256Expected": response.sha256_expected,
                "sha256Actual": response.sha256_actual,
                "attempts": response.attempts,
                "retried": response.retried,
                "contentType": response.content_type
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
    let response = client::download(config, &format!("/files/{file_id}"))
        .map_err(|error| download_error_with_output_name(error, &output))?;
    write_download_output(&output, &response.bytes, args.force)?;
    Ok(download_success_payload(
        file_id, &output, &response, args.force,
    ))
}

fn file_upload(config: &BridgeConfig, args: FileUploadArgs) -> Result<Value, CliError> {
    let path = PathBuf::from(&args.path);
    let display_name = args.display_name.or_else(|| {
        path.file_name()
            .and_then(|name| name.to_str())
            .map(|name| name.to_string())
    });
    let bytes = fs::read(&path).map_err(|error| {
        CliError::new(
            "upload_input_unreadable",
            ErrorCategory::Validation,
            "Failed to read upload input file",
        )
        .with_details(json!({
            "message": error.to_string(),
            "inputName": path.file_name().and_then(|name| name.to_str()).unwrap_or("upload")
        }))
    })?;
    if bytes.is_empty() {
        return Err(CliError::validation(
            "upload_input_empty",
            "Upload input file is empty",
        ));
    }
    client::upload(
        config,
        "/files/upload",
        &bytes,
        display_name.as_deref(),
        args.content_type.as_deref(),
    )
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

fn download_error_with_output_name(mut error: CliError, output: &Path) -> CliError {
    if error.code != "download_retry_exhausted" {
        return error;
    }
    let mut details = match error.details.take() {
        Some(Value::Object(map)) => map,
        _ => Map::new(),
    };
    details.insert("outputName".to_string(), json!(output_name(output)));
    error.details = Some(Value::Object(details));
    error
}

fn download_success_payload(
    file_id: String,
    output: &Path,
    response: &client::DownloadResponse,
    overwritten: bool,
) -> Value {
    json!({
        "command": "file.download",
        "fileId": file_id,
        "outputName": output_name(output),
        "verified": response.verified,
        "bytesExpected": response.bytes_expected,
        "bytesWritten": response.bytes.len(),
        "sha256Expected": response.sha256_expected,
        "sha256Actual": response.sha256_actual,
        "attempts": response.attempts,
        "retried": response.retried,
        "contentType": response.content_type,
        "overwritten": overwritten
    })
}

fn normalize_file_id(file_id: &str) -> Result<String, CliError> {
    let file_id = file_id.trim();
    if file_id.is_empty()
        || !file_id.starts_with("file-")
        || file_id.contains('/')
        || file_id.contains('\\')
        || file_id.contains("..")
        || file_id.contains(':')
    {
        return Err(CliError::validation(
            "invalid_file_id",
            "file commands require a Host Bridge opaque file-* handle, not a path",
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

fn path_with_query(base: &str, query: Vec<(String, String)>) -> String {
    if query.is_empty() {
        return base.to_string();
    }
    let query = query
        .into_iter()
        .map(|(key, value)| format!("{}={}", key, percent_encode_query(&value)))
        .collect::<Vec<_>>()
        .join("&");
    format!("{base}?{query}")
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

fn item_search_input(args: ItemSearchArgs) -> Result<Value, CliError> {
    let query = read_json_arg(Some(&args.query))?;
    let Value::Object(mut query) = query else {
        return Err(CliError::validation(
            "invalid_item_search_query",
            "Item search --query must be a JSON object",
        ));
    };
    let text = query
        .remove("text")
        .and_then(|value| value.as_str().map(str::to_string))
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| {
            CliError::validation(
                "missing_item_search_text",
                "Item search --query must include non-empty text",
            )
        })?;
    let mut input = Map::new();
    input.insert("query".to_string(), Value::String(text));
    if let Some(limit) = query.remove("limit") {
        let limit = limit
            .as_u64()
            .and_then(|value| u32::try_from(value).ok())
            .ok_or_else(|| {
                CliError::validation(
                    "invalid_item_search_limit",
                    "Item search --query limit must be an unsigned 32-bit integer",
                )
            })?;
        input.insert("limit".to_string(), Value::from(limit));
    }
    if let Some(library_id) = query.remove("libraryId") {
        let library_id = library_id.as_u64().ok_or_else(|| {
            CliError::validation(
                "invalid_item_search_library_id",
                "Item search --query libraryId must be an unsigned integer",
            )
        })?;
        input.insert("libraryId".to_string(), Value::from(library_id));
    }
    Ok(Value::Object(input))
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

fn push_value(input: &mut Map<String, Value>, name: &str, value: Option<String>) {
    if let Some(value) = value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        input.insert(name.to_string(), Value::String(value));
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
    use crate::args::{BridgeInputArgs, BridgeQueryArgs};

    #[test]
    fn maps_item_search_json_query_to_bridge_input() {
        let input = item_search_input(ItemSearchArgs {
            query: "{\"text\":\"graph\",\"limit\":5,\"libraryId\":1}".to_string(),
        });
        assert_eq!(
            input.unwrap(),
            json!({
                "query": "graph",
                "limit": 5,
                "libraryId": 1
            })
        );
    }

    #[test]
    fn rejects_item_search_bare_text_query() {
        let error = item_search_input(ItemSearchArgs {
            query: "graph".to_string(),
        })
        .unwrap_err();

        assert_eq!(error.code, "input_json_invalid");
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
        let query = || BridgeQueryArgs { query: None };
        assert_eq!(
            topics_capability(&TopicsCommand::List(query())),
            "topics.list"
        );
        assert_eq!(
            topics_capability(&TopicsCommand::FindByPaperRef(query())),
            "topics.find_by_paper_ref"
        );
        assert_eq!(
            topics_capability(&TopicsCommand::GetContext(query())),
            "topics.get_context"
        );
        assert_eq!(
            topics_capability(&TopicsCommand::GetReport(query())),
            "topics.get_report"
        );
        assert_eq!(
            topics_capability(&TopicsCommand::GetReviewInput(query())),
            "topics.get_review_input"
        );
        assert_eq!(
            schemas_capability(&SchemasCommand::Get(query())),
            "schemas.get"
        );
        assert_eq!(
            concepts_capability(&ConceptsCommand::Query(query())),
            "concepts.query"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::Overview(query())),
            "citation_graph.get_overview"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::QueryCluster(query())),
            "citation_graph.query_cluster"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::GetSlice(query())),
            "citation_graph.get_slice"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::GetLayout(query())),
            "citation_graph.get_layout"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::GetMetrics(query())),
            "citation_graph.get_metrics"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::RankExternalReferences(query())),
            "citation_graph.rank_external_references"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::RankLibraryPapers(query())),
            "citation_graph.rank_library_papers"
        );
        assert_eq!(
            citation_graph_capability(&CitationGraphCommand::RefreshMetrics(BridgeInputArgs {
                input: None
            })),
            "citation_graph.refresh_metrics"
        );
        assert_eq!(
            resolvers_capability(&ResolversCommand::Resolve(query())),
            "resolvers.resolve"
        );
        assert_eq!(
            paper_artifacts_capability(&PaperArtifactsCommand::Manifest(query())),
            "paper_artifacts.get_manifest"
        );
        assert_eq!(
            paper_artifacts_capability(&PaperArtifactsCommand::Read(query())),
            "paper_artifacts.read"
        );
        assert_eq!(
            paper_artifacts_capability(&PaperArtifactsCommand::ExportFiltered(query())),
            "paper_artifacts.export_filtered"
        );
        assert_eq!(
            paper_artifacts_capability(&PaperArtifactsCommand::ResolveTopicDigest(query())),
            "paper_artifacts.resolve_topic_digest"
        );
        assert_eq!(
            insights_capability(&InsightsCommand::AttentionQueue(query())),
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
    fn builds_library_readiness_missing_inputs() {
        let audit = library_readiness_input(LibraryReadinessCommand::Audit(BridgeQueryArgs {
            query: Some("{\"limit\":25,\"checks\":[\"pdf\",\"analysis\"]}".to_string()),
        }))
        .unwrap();
        assert_eq!(audit, json!({ "limit": 25, "checks": ["pdf", "analysis"] }));

        let missing_markdown =
            library_readiness_input(LibraryReadinessCommand::MissingMarkdown(BridgeQueryArgs {
                query: Some("{\"collectionKey\":\"COLL\",\"limit\":10}".to_string()),
            }))
            .unwrap();
        assert_eq!(
            missing_markdown,
            json!({
                "collectionKey": "COLL",
                "limit": 10,
                "checks": ["markdown"],
                "missingOnly": true
            })
        );
    }

    #[test]
    fn builds_literature_ingest_mutation_input() {
        let input = literature_ingest_input(LiteratureIngestArgs {
            input: "{\"paper\":{\"title\":\"Bridge Paper\",\"attachLandingUrlOnMissingPdf\":true},\"collection\":{\"key\":\"COLL\",\"libraryId\":1}}".to_string(),
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "operation": "literature.ingest",
                "paper": {
                    "title": "Bridge Paper",
                    "attachLandingUrlOnMissingPdf": true
                },
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
        fs::write(&path, "{\"paper\":{\"doi\":\"10.1000/example\"}}").unwrap();
        let input = literature_ingest_input(LiteratureIngestArgs {
            input: format!("@{}", path.display()),
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "operation": "literature.ingest",
                "paper": {
                    "doi": "10.1000/example"
                }
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
    fn builds_safe_mutation_writeback_inputs() {
        assert_eq!(
            mutation_tag_input(MutationTagArgs {
                command: MutationTagCommand::Add(MutationTagsArgs {
                    items: vec!["1:ABC123".to_string(), "{\"id\":2}".to_string()],
                    tags: vec!["status:read".to_string()],
                }),
            })
            .unwrap(),
            json!({
                "operation": "item.addTags",
                "items": ["1:ABC123", { "id": 2 }],
                "tags": ["status:read"]
            })
        );
        assert_eq!(
            mutation_collection_items_input(
                "collection.addItems",
                MutationCollectionItemsArgs {
                    collection: "1:COLL123".to_string(),
                    items: vec!["ABC123".to_string()],
                },
            )
            .unwrap(),
            json!({
                "operation": "collection.addItems",
                "collection": "1:COLL123",
                "items": ["ABC123"]
            })
        );
        assert_eq!(
            mutation_item_update_input(MutationItemUpdateArgs {
                item: "ABC123".to_string(),
                patch: "{\"title\":\"Updated\"}".to_string(),
            })
            .unwrap(),
            json!({
                "operation": "item.updateFields",
                "item": "ABC123",
                "fields": { "title": "Updated" }
            })
        );
        assert_eq!(
            mutation_note_create_input(MutationNoteCreateArgs {
                item: "ABC123".to_string(),
                input: "{\"content\":\"<p>Note</p>\"}".to_string(),
            })
            .unwrap(),
            json!({
                "operation": "note.createChild",
                "parent": "ABC123",
                "content": "<p>Note</p>"
            })
        );
        assert_eq!(
            mutation_item_attach_file_input(MutationItemAttachFileArgs {
                item: "ABC123".to_string(),
                file: "file-abc".to_string(),
                display_name: Some("artifact.md".to_string()),
                content_type: Some("text/markdown".to_string()),
            })
            .unwrap(),
            json!({
                "operation": "item.attachFile",
                "item": "ABC123",
                "fileId": "file-abc",
                "displayName": "artifact.md",
                "contentType": "text/markdown"
            })
        );
    }

    #[test]
    fn rejects_unsafe_object_refs_and_non_opaque_attach_file_ids() {
        for value in [
            "../ABC123",
            "C:\\tmp\\paper.pdf",
            "https://example.test/item",
            "javascript:alert(1)",
            "eval(ABC123)",
            "1:http://example.test",
        ] {
            let error = context_ref_value(value).unwrap_err();
            assert_eq!(error.code, "invalid_object_ref", "{value}");
        }

        let json_array_error = context_ref_value("[\"ABC123\"]").unwrap_err();
        assert_eq!(json_array_error.code, "invalid_object_ref");

        assert_eq!(context_ref_value("1:ABC123").unwrap(), json!("1:ABC123"));
        assert_eq!(context_ref_value("ABC123").unwrap(), json!("ABC123"));
        assert_eq!(
            context_ref_value("{\"key\":\"ABC123\"}").unwrap(),
            json!({ "key": "ABC123" })
        );

        let attach_error = mutation_item_attach_file_input(MutationItemAttachFileArgs {
            item: "ABC123".to_string(),
            file: "../artifact.md".to_string(),
            display_name: None,
            content_type: None,
        })
        .unwrap_err();
        assert_eq!(attach_error.code, "invalid_file_id");

        let non_handle_error = mutation_item_attach_file_input(MutationItemAttachFileArgs {
            item: "ABC123".to_string(),
            file: "artifact-md".to_string(),
            display_name: None,
            content_type: None,
        })
        .unwrap_err();
        assert_eq!(non_handle_error.code, "invalid_file_id");
    }

    #[test]
    fn builds_annotation_inputs() {
        assert_eq!(
            annotation_item_input(AnnotationItemArgs {
                item: "1:ABC123".to_string(),
            })
            .unwrap(),
            json!({ "ref": "1:ABC123" })
        );
        assert_eq!(
            annotation_export_input(AnnotationExportArgs {
                item: "{\"key\":\"ABC123\"}".to_string(),
                format: Some("json".to_string()),
            })
            .unwrap(),
            json!({ "ref": { "key": "ABC123" }, "format": "json" })
        );
    }

    #[test]
    fn maps_workflow_submit_to_bridge_input() {
        let input = workflow_submit_input(WorkflowSubmitArgs {
            workflow: "topic-synthesis".to_string(),
            selection: Some("[{\"key\":\"ABC\",\"libraryId\":1}]".to_string()),
            none: false,
            workflow_options: Some("{\"language\":\"zh-CN\"}".to_string()),
            provider_profile: Some(
                "{\"schema\":\"zotero-bridge.provider-profile.v1\",\"backendId\":\"acp-opencode\",\"providerOptions\":{\"acpModelId\":\"gpt-5.2\",\"autoApproveAcpPermissions\":true}}".to_string(),
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
                        "acpModelId": "gpt-5.2",
                        "autoApproveAcpPermissions": true
                    }
                }
            })
        );
    }

    #[test]
    fn maps_workflow_submit_none_selection() {
        let input = workflow_submit_input(WorkflowSubmitArgs {
            workflow: "global-workflow".to_string(),
            selection: None,
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
            selection: Some("[{\"key\":\"ABC\",\"libraryId\":1}]".to_string()),
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
            selection: None,
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
            selection: Some(format!("@{}", path.display())),
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
    fn builds_context_navigation_inputs() {
        assert_eq!(
            context_object_open_input(
                "item",
                ContextObjectRefArgs {
                    object_ref: "1:ABC123".to_string(),
                },
            )
            .unwrap(),
            json!({ "item": "1:ABC123" })
        );
        assert_eq!(
            context_object_open_input(
                "note",
                ContextObjectRefArgs {
                    object_ref: "{\"key\":\"NOTE123\"}".to_string(),
                },
            )
            .unwrap(),
            json!({ "note": { "key": "NOTE123" } })
        );
        assert_eq!(
            context_selection_open_input(ContextSelectionOpenArgs {
                item_refs: vec!["ABC123".to_string(), "{\"id\":2}".to_string()],
            })
            .unwrap(),
            json!({ "items": ["ABC123", { "id": 2 }] })
        );
        assert_eq!(
            context_collection_open_input(ContextCollectionOpenArgs {
                collection_key: "COLL123".to_string(),
                library_id: Some(1),
            })
            .unwrap(),
            json!({ "key": "COLL123", "libraryId": 1 })
        );
    }

    #[test]
    fn builds_notification_paths_and_ack_input() {
        let path = notification_list_path(notification_list_query(NotificationListArgs {
            workflow_run_id: Some("run 1".to_string()),
            skill_run_id: Some("skill/1".to_string()),
            event_type: Some("skill_run.waiting_user".to_string()),
            since_event_id: Some("event-1".to_string()),
            client_id: Some("agent-a".to_string()),
            acknowledged: Some(false),
            limit: Some(10),
        }));
        assert_eq!(
            path,
            "/notifications?workflowRunId=run+1&skillRunId=skill%2F1&type=skill_run.waiting_user&sinceEventId=event-1&clientId=agent-a&acknowledged=false&limit=10"
        );

        let input = notification_ack_input(NotificationAckArgs {
            events: vec![" event-1 ".to_string(), "event-2".to_string()],
            client_id: Some("agent-a".to_string()),
        })
        .unwrap();
        assert_eq!(
            input,
            json!({ "eventIds": ["event-1", "event-2"], "clientId": "agent-a" })
        );
    }

    #[test]
    fn detects_notification_response_events() {
        assert!(notification_response_has_events(&json!({
            "result": {
                "notifications": [{ "eventId": "event-1" }]
            }
        })));
        assert!(!notification_response_has_events(&json!({
            "result": {
                "notifications": []
            }
        })));
    }

    #[test]
    fn builds_workflow_cancel_path_and_input() {
        let args = WorkflowCancelArgs {
            run_id: "run 1".to_string(),
            reason: Some("user".to_string()),
            message: Some("stop".to_string()),
        };
        assert_eq!(
            workflow_cancel_path(&args).unwrap(),
            "/workflows/runs/run%201/cancel"
        );
        assert_eq!(
            workflow_cancel_input(args),
            json!({ "reason": "user", "message": "stop" })
        );
    }

    #[test]
    fn builds_skill_run_paths_and_reply_input() {
        let id_args = SkillRunIdArgs {
            skill_run_id: "skill run/1".to_string(),
        };
        assert_eq!(
            skill_run_path(&id_args).unwrap(),
            "/skill-runs/skill%20run%2F1"
        );
        assert_eq!(
            skill_run_connect_path(&id_args).unwrap(),
            "/skill-runs/skill%20run%2F1/connect"
        );
        let reply_args = SkillRunReplyArgs {
            skill_run_id: "skill run/1".to_string(),
            message: "continue".to_string(),
        };
        assert_eq!(
            skill_run_reply_path(&reply_args).unwrap(),
            "/skill-runs/skill%20run%2F1/reply"
        );
        assert_eq!(
            skill_run_reply_input(reply_args),
            json!({ "message": "continue" })
        );
    }

    #[test]
    fn builds_workflow_agent_apply_path_and_input() {
        let args = WorkflowAgentApplyArgs {
            agent_run_id: "agent run/1".to_string(),
            results: vec![
                "req-001=C:\\tmp\\bundle.zip".to_string(),
                "req-002=D:\\tmp\\bundle-dir".to_string(),
            ],
        };
        assert_eq!(
            workflow_agent_apply_path(&args).unwrap(),
            "/workflows/agent-runs/agent%20run%2F1/apply"
        );
        assert_eq!(
            workflow_agent_apply_input(&args).unwrap(),
            json!({
                "results": [
                    {
                        "agentRequestId": "req-001",
                        "bundle": { "kind": "local_path", "path": "C:\\tmp\\bundle.zip" }
                    },
                    {
                        "agentRequestId": "req-002",
                        "bundle": { "kind": "local_path", "path": "D:\\tmp\\bundle-dir" }
                    }
                ]
            })
        );
    }

    #[test]
    fn rejects_invalid_workflow_agent_apply_result_arg() {
        let args = WorkflowAgentApplyArgs {
            agent_run_id: "agent-run-1".to_string(),
            results: vec!["req-only".to_string()],
        };
        let error = workflow_agent_apply_input(&args).unwrap_err();
        assert_eq!(error.code, "invalid_agent_apply_result");
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
        let response = client::DownloadResponse {
            bytes: vec![0; 42],
            content_type: "text/plain".to_string(),
            verified: true,
            bytes_expected: Some(42),
            sha256_expected: Some(
                "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                    .to_string(),
            ),
            sha256_actual:
                "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                    .to_string(),
            attempts: 2,
            retried: true,
        };
        let payload = download_success_payload("file-abc".to_string(), &output, &response, false);
        assert_eq!(payload["outputName"], "paper.txt");
        assert_eq!(payload["verified"], true);
        assert_eq!(payload["bytesExpected"], 42);
        assert_eq!(payload["bytesWritten"], 42);
        assert_eq!(payload["attempts"], 2);
        assert_eq!(payload["retried"], true);
        assert!(payload.get("output").is_none());
        assert!(!payload.to_string().contains("C:\\\\Users"));
    }

    #[test]
    fn annotates_retry_exhausted_download_error_with_output_name_only() {
        let output = PathBuf::from("C:\\Users\\A\\Downloads\\bundle.zip");
        let error = CliError::new(
            "download_retry_exhausted",
            crate::error::ErrorCategory::Download,
            "retry exhausted",
        )
        .with_details(json!({
            "attempts": 2,
            "bytesExpected": 10,
            "bytesReceived": 5
        }));
        let error = download_error_with_output_name(error, &output);
        let details = error.details.unwrap();

        assert_eq!(details["outputName"], "bundle.zip");
        assert_eq!(details["attempts"], 2);
        assert_eq!(details["bytesExpected"], 10);
        assert_eq!(details["bytesReceived"], 5);
        assert!(details.get("outputPath").is_none());
        assert!(!details.to_string().contains("C:\\\\Users"));
    }
}
