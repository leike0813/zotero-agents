use std::{
    cell::RefCell,
    collections::BTreeMap,
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
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
        InsightsArgs, InsightsCommand, ItemArgs, ItemCommand, ItemNotesArgs, ItemPageArgs,
        ItemRefArgs, LibraryArgs, LibraryCommand, LibraryItemsCommand, LibraryReadinessCommand,
        MutationArgs, MutationCollectionArgs, MutationCollectionCommand, MutationCommand,
        MutationItemArgs, MutationItemCommand, MutationNoteArgs, MutationNoteCommand,
        MutationTagArgs, MutationTagCommand, NoteArgs, NoteCommand, NoteDetailArgs,
        NotePayloadArgs, NotificationAckArgs, NotificationCommand, NotificationListArgs,
        NotificationWaitArgs, OperationArgs, OperationCommand, PageArgs, PaperArtifactsArgs,
        PaperArtifactsCommand, PermissionRequestIdArgs, ProductArgs, ProductCommand,
        ProductDownloadArgs, ProductGetArgs, ProductIdArgs, ProductListArgs, ResolversArgs,
        ResolversCommand, RunArgs, RunCommand, RunPermissionArgs, RunPermissionCommand,
        RunWorkflowArgs, RunWorkflowCommand, RunWorkflowRecentArgs, SchemasArgs, SchemasCommand,
        SkillRunCommand, SkillRunEventsArgs, SkillRunIdArgs, SkillRunRecentArgs, SkillRunReplyArgs,
        SynthesisArgs, SynthesisCacheArgs, SynthesisCacheCommand, SynthesisCacheInvalidateArgs,
        SynthesisCommand, SynthesisIndexCommand, SynthesisIndexGetCommand, TaskListArgs,
        TaskRecentArgs, TopicsArgs, TopicsCommand, WorkflowAgentApplyArgs,
        WorkflowAgentApplyStatusArgs, WorkflowAgentBundleArgs, WorkflowAgentBundleCommand,
        WorkflowAgentBundleInspectArgs, WorkflowAgentResultArgs, WorkflowAgentResultCommand,
        WorkflowAgentResultValidateArgs, WorkflowAgentRunArgs, WorkflowAgentRunLifecycleArgs,
        WorkflowArgs, WorkflowCancelArgs, WorkflowCommand, WorkflowDescribeArgs,
        WorkflowDefaultsArgs, WorkflowProfileArgs, WorkflowProfileCommand,
        WorkflowProfileDescribeArgs,
        WorkflowProfileValidateArgs, WorkflowQueueArgs, WorkflowQueueCancelArgs,
        WorkflowQueueCommand, WorkflowQueueListArgs, WorkflowRequirementsArgs, WorkflowRunArgs,
        WorkflowSubmissionArgs, WorkflowSubmissionCommand, WorkflowSubmissionGetArgs,
        WorkflowSubmitArgs, WorkflowValidateArgs,
    },
    client,
    config::BridgeConfig,
    contract,
    error::{CliError, ErrorCategory},
};

const PROTOCOL: &str = "host-bridge.v2";
const AGENT_RUN_OUTPUT_CONTRACT_SCHEMA: &str = "zotero-bridge.agent-run.output-contract.v1";
const MAX_BUNDLE_ENTRIES: usize = 4096;
const MAX_BUNDLE_JSON_BYTES: u64 = 16 * 1024 * 1024;

pub fn status(config: &BridgeConfig) -> Result<Value, CliError> {
    let result = client::health(config)?;
    ensure_protocol(&result)?;
    Ok(result)
}

pub fn manifest(config: &BridgeConfig, args: PageArgs) -> Result<Value, CliError> {
    client::get(config, &page_path("/manifest", args))
}

pub fn bridge(config: &BridgeConfig, args: BridgeArgs) -> Result<Value, CliError> {
    match args.command {
        BridgeCommand::Status => status(config),
        BridgeCommand::Manifest(args) => manifest(config, args),
        BridgeCommand::Profile(args) => bridge_profile(config, args),
        BridgeCommand::Backend(args) => bridge_backend(config, args),
    }
}

pub fn operation(config: &BridgeConfig, args: OperationArgs) -> Result<Value, CliError> {
    match args.command {
        OperationCommand::Get(args) => {
            let operation_id = args.operation_id.trim();
            if operation_id.is_empty() {
                return Err(CliError::validation(
                    "invalid_operation_id",
                    "operation get requires an operation id",
                ));
            }
            client::get(
                config,
                &format!("/operations/{}", percent_encode_path(operation_id)),
            )
        }
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
    let input = read_contract_json_arg("input", args.input.as_deref())?;
    client::call(config, &args.capability, input)
}

pub fn item(config: &BridgeConfig, args: ItemArgs) -> Result<Value, CliError> {
    match args.command {
        ItemCommand::Search(args) => call_structured(
            config,
            "query",
            read_contract_json_arg("query", Some(&args.query))?,
        ),
        ItemCommand::Get(args) => client::call_current(config, item_ref_arguments(args)?),
        ItemCommand::Notes(args) => client::call_current(config, item_notes_arguments(args)?),
        ItemCommand::Attachments(args) => client::call_current(config, item_page_arguments(args)?),
    }
}

pub fn note(config: &BridgeConfig, args: NoteArgs) -> Result<Value, CliError> {
    match args.command {
        NoteCommand::Get(args) => client::call_current(config, note_detail_arguments(args)?),
        NoteCommand::Payloads(args) => client::call_current(config, item_page_arguments(args)?),
        NoteCommand::Payload(args) => client::call_current(config, note_payload_arguments(args)?),
    }
}

pub fn library(config: &BridgeConfig, args: LibraryArgs) -> Result<Value, CliError> {
    match args.command {
        LibraryCommand::Items(args) => match args.command {
            LibraryItemsCommand::List(input) => {
                call_structured(config, "query", bridge_query(input)?)
            }
        },
        LibraryCommand::Item(args) => item(config, args),
        LibraryCommand::Note(args) => note(config, args),
        LibraryCommand::Annotation(args) => annotation(config, args),
        LibraryCommand::Snapshot(input) => call_structured(config, "query", bridge_query(input)?),
        LibraryCommand::Readiness(args) => {
            call_structured(config, "query", library_readiness_query(args.command)?)
        }
    }
}

pub fn annotation(config: &BridgeConfig, args: AnnotationArgs) -> Result<Value, CliError> {
    match args.command {
        AnnotationCommand::List(args) => {
            client::call_current(config, annotation_item_arguments(args))
        }
        AnnotationCommand::Export(args) => {
            client::call_current(config, annotation_export_arguments(args))
        }
    }
}

pub fn context(config: &BridgeConfig, args: ContextArgs) -> Result<Value, CliError> {
    match args.command {
        ContextCommand::Current(args) => client::get(config, &page_path("/context/current", args)),
        ContextCommand::Selection(args) => match args.command {
            ContextSelectionCommand::Get(args) => {
                client::get(config, &page_path("/context/selection", args))
            }
            ContextSelectionCommand::Open(args) => {
                let path = page_path("/context/selection/open", args.page.clone());
                client::post(config, &path, context_selection_open_input(args)?)
            }
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
                    call_structured(config, "query", bridge_query(input)?)
                }
            },
            SynthesisIndexCommand::Reference(args) => match args.command {
                SynthesisIndexGetCommand::Get(input) => {
                    call_structured(config, "query", bridge_query(input)?)
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
        SynthesisCacheCommand::Status(args) => {
            if let Some(operation_id) = args.operation_id {
                return call_declared_capability(
                    config,
                    "synthesis.operation.get",
                    json!({ "operation_id": operation_id }),
                );
            }
            client::get(config, "/synthesis/cache/status")
        }
        SynthesisCacheCommand::RefreshReferenceSidecar(input) => {
            call_structured(config, "input", bridge_input(input)?)
        }
        SynthesisCacheCommand::Invalidate(args) => client::post(
            config,
            "/synthesis/cache/invalidate",
            synthesis_cache_invalidate_input(args),
        ),
    }
}

pub fn mutation(config: &BridgeConfig, args: MutationArgs) -> Result<Value, CliError> {
    match args.command {
        MutationCommand::Preview(input) | MutationCommand::Apply(input) => {
            call_structured(config, "input", bridge_input(input)?)
        }
        MutationCommand::LiteratureIngest(args) => call_structured(
            config,
            "input",
            read_contract_json_arg("input", Some(&args.input))?,
        ),
        MutationCommand::Tag(args) => client::call_current(config, mutation_tag_arguments(args)),
        MutationCommand::Collection(args) => {
            client::call_current(config, mutation_collection_arguments(args)?)
        }
        MutationCommand::Item(args) => client::call_current(config, mutation_item_arguments(args)?),
        MutationCommand::Note(args) => client::call_current(config, mutation_note_arguments(args)?),
    }
}

pub fn product(config: &BridgeConfig, args: ProductArgs) -> Result<Value, CliError> {
    match args.command {
        ProductCommand::List(args) => client::call_current(config, product_list_arguments(args)),
        ProductCommand::Get(args) => client::call_current(config, product_get_arguments(args)),
        ProductCommand::Download(args) => {
            client::call_current(config, product_download_arguments(args))
        }
        ProductCommand::Remove(args) => client::call_current(config, product_id_arguments(args)),
    }
}

fn insert_argument(map: &mut Map<String, Value>, argument: &str, value: Option<Value>) {
    if let Some(value) = value {
        map.insert(argument.to_string(), value);
    }
}

fn product_id_arguments(args: ProductIdArgs) -> Map<String, Value> {
    Map::from_iter([("product_id".to_string(), json!(args.product_id))])
}

fn product_get_arguments(args: ProductGetArgs) -> Map<String, Value> {
    let mut arguments = product_id_arguments(ProductIdArgs {
        product_id: args.product_id,
    });
    insert_argument(
        &mut arguments,
        "cursor",
        args.page.cursor.map(Value::String),
    );
    insert_argument(&mut arguments, "limit", args.page.limit.map(Value::from));
    arguments
}

fn product_list_arguments(args: ProductListArgs) -> Map<String, Value> {
    let mut arguments = Map::new();
    insert_argument(
        &mut arguments,
        "workflow_id",
        args.workflow_id.map(Value::String),
    );
    insert_argument(
        &mut arguments,
        "backend_id",
        args.backend_id.map(Value::String),
    );
    insert_argument(
        &mut arguments,
        "request_id",
        args.request_id.map(Value::String),
    );
    insert_argument(&mut arguments, "cursor", args.cursor.map(Value::String));
    insert_argument(&mut arguments, "limit", args.limit.map(Value::from));
    arguments
}

fn product_download_arguments(args: ProductDownloadArgs) -> Map<String, Value> {
    let mut arguments = product_id_arguments(ProductIdArgs {
        product_id: args.product_id,
    });
    insert_argument(&mut arguments, "asset", args.asset.map(Value::String));
    arguments.insert(
        "output_dir".to_string(),
        Value::String(args.output_dir.display().to_string()),
    );
    arguments.insert("force".to_string(), Value::Bool(args.force));
    arguments
}

pub fn topics(config: &BridgeConfig, args: TopicsArgs) -> Result<Value, CliError> {
    let input = bridge_query(topics_input(args.command))?;
    call_structured(config, "query", input)
}

pub fn schemas(config: &BridgeConfig, args: SchemasArgs) -> Result<Value, CliError> {
    let input = bridge_query(schemas_input(args.command))?;
    call_structured(config, "query", input)
}

pub fn concepts(config: &BridgeConfig, args: ConceptsArgs) -> Result<Value, CliError> {
    let input = bridge_query(concepts_input(args.command))?;
    call_structured(config, "query", input)
}

pub fn citation_graph(config: &BridgeConfig, args: CitationGraphArgs) -> Result<Value, CliError> {
    match args.command {
        CitationGraphCommand::RefreshMetrics(input) => {
            return call_structured(config, "input", bridge_input(input)?);
        }
        CitationGraphCommand::Update(input) => {
            return call_structured(config, "input", bridge_input(input)?);
        }
        command => {
            let input = bridge_query(citation_graph_input(command))?;
            return call_structured(config, "query", input);
        }
    }
}

pub fn resolvers(config: &BridgeConfig, args: ResolversArgs) -> Result<Value, CliError> {
    let input = bridge_query(resolvers_input(args.command))?;
    call_structured(config, "query", input)
}

pub fn paper_artifacts(config: &BridgeConfig, args: PaperArtifactsArgs) -> Result<Value, CliError> {
    let input = bridge_query(paper_artifacts_input(args.command))?;
    call_structured(config, "query", input)
}

pub fn insights(config: &BridgeConfig, args: InsightsArgs) -> Result<Value, CliError> {
    let input = bridge_query(insights_input(args.command))?;
    call_structured(config, "query", input)
}

pub fn workflow(config: &BridgeConfig, args: WorkflowArgs) -> Result<Value, CliError> {
    match args.command {
        WorkflowCommand::List => client::get(config, "/workflows"),
        WorkflowCommand::Describe(args) => client::post(
            config,
            "/workflows/describe",
            workflow_describe_input(args)?,
        ),
        WorkflowCommand::Validate(args) => client::post(
            config,
            "/workflows/validate",
            workflow_validate_input(args)?,
        ),
        WorkflowCommand::Requirements(args) => client::post(
            config,
            "/workflows/requirements",
            workflow_requirements_input(args)?,
        ),
        WorkflowCommand::Submit(args) => {
            client::post(config, "/workflows/submit", workflow_submit_input(args)?)
        }
        WorkflowCommand::Queue(args) => workflow_queue(config, args),
        WorkflowCommand::Submission(args) => workflow_submission(config, args),
        WorkflowCommand::Profile(args) => workflow_profile(config, args),
        WorkflowCommand::Defaults(args) => workflow_defaults(config, args),
        WorkflowCommand::AgentRun(args) => workflow_agent_run(config, args),
        WorkflowCommand::AgentBundle(args) => workflow_agent_bundle(args),
        WorkflowCommand::AgentResult(args) => workflow_agent_result(args),
        WorkflowCommand::AgentApply(args) => workflow_agent_apply(config, args),
        WorkflowCommand::AgentApplyStatus(args) => workflow_agent_apply_status(config, args),
        WorkflowCommand::AgentRenew(args) => workflow_agent_run_lifecycle(config, args, "renew"),
        WorkflowCommand::AgentAbandon(args) => {
            workflow_agent_run_lifecycle(config, args, "abandon")
        }
    }
}

fn workflow_queue(config: &BridgeConfig, args: WorkflowQueueArgs) -> Result<Value, CliError> {
    match args.command {
        WorkflowQueueCommand::List(args) => client::get(config, &workflow_queue_list_path(args)?),
        WorkflowQueueCommand::Cancel(args) => {
            client::post(config, &workflow_queue_cancel_path(args)?, json!({}))
        }
    }
}

fn workflow_submission(
    config: &BridgeConfig,
    args: WorkflowSubmissionArgs,
) -> Result<Value, CliError> {
    match args.command {
        WorkflowSubmissionCommand::Get(args) => {
            client::get(config, &workflow_submission_path(args)?)
        }
    }
}

fn workflow_agent_bundle(args: WorkflowAgentBundleArgs) -> Result<Value, CliError> {
    match args.command {
        WorkflowAgentBundleCommand::Inspect(args) => workflow_agent_bundle_inspect(args),
    }
}

fn workflow_agent_result(args: WorkflowAgentResultArgs) -> Result<Value, CliError> {
    match args.command {
        WorkflowAgentResultCommand::Validate(args) => workflow_agent_result_validate(args),
    }
}

struct ZipBundle {
    archive: RefCell<zip::ZipArchive<File>>,
    entries: BTreeMap<String, usize>,
}

enum LocalBundle {
    Directory(PathBuf),
    Zip(ZipBundle),
}

fn normalize_bundle_entry(entry: &str, label: &str) -> Result<String, CliError> {
    let normalized = entry.replace('\\', "/");
    let normalized = normalized.trim_end_matches('/');
    if normalized.is_empty() || normalized.starts_with('/') || normalized.contains('\0') {
        return Err(CliError::validation(
            "invalid_bundle_path",
            format!("{label} must be a safe relative bundle path"),
        ));
    }
    let mut parts = Vec::new();
    for part in normalized.split('/') {
        if part.is_empty() || part == ".." {
            return Err(CliError::validation(
                "invalid_bundle_path",
                format!("{label} must be a safe relative bundle path"),
            ));
        }
        if part == "." {
            continue;
        }
        if parts.is_empty() && part.ends_with(':') {
            return Err(CliError::validation(
                "invalid_bundle_path",
                format!("{label} must be a safe relative bundle path"),
            ));
        }
        parts.push(part);
    }
    if parts.is_empty() {
        return Err(CliError::validation(
            "invalid_bundle_path",
            format!("{label} must be a safe relative bundle path"),
        ));
    }
    Ok(parts.join("/"))
}

fn invalid_bundle_archive(message: impl Into<String>) -> CliError {
    CliError::validation("invalid_bundle_archive", message)
        .with_details(json!({ "inputKind": "zip" }))
}

impl LocalBundle {
    fn open(path: &Path) -> Result<Self, CliError> {
        if path.is_dir() {
            let root = fs::canonicalize(path).map_err(|_| {
                CliError::validation(
                    "invalid_agent_bundle",
                    "Agent bundle directory cannot be resolved",
                )
            })?;
            return Ok(Self::Directory(root));
        }
        let is_zip = path.is_file()
            && path
                .extension()
                .and_then(|value| value.to_str())
                .is_some_and(|value| value.eq_ignore_ascii_case("zip"));
        if !is_zip {
            return Err(CliError::validation(
                "invalid_agent_bundle",
                "Agent bundle must be a readable directory or ZIP file",
            ));
        }
        let file = File::open(path)
            .map_err(|_| invalid_bundle_archive("ZIP agent bundle cannot be opened"))?;
        let mut archive = zip::ZipArchive::new(file)
            .map_err(|_| invalid_bundle_archive("ZIP agent bundle is malformed"))?;
        if archive.len() > MAX_BUNDLE_ENTRIES {
            return Err(CliError::validation(
                "bundle_entry_limit_exceeded",
                "ZIP agent bundle contains too many entries",
            )
            .with_details(json!({ "limit": MAX_BUNDLE_ENTRIES })));
        }
        let mut entries = BTreeMap::new();
        for index in 0..archive.len() {
            let entry = archive
                .by_index(index)
                .map_err(|_| invalid_bundle_archive("ZIP agent bundle entry cannot be read"))?;
            let name = normalize_bundle_entry(entry.name(), "ZIP entry")?;
            if entry.is_symlink() {
                return Err(CliError::validation(
                    "invalid_bundle_path",
                    "ZIP agent bundle must not contain symbolic links",
                ));
            }
            if entry.is_dir() {
                continue;
            }
            if entries.insert(name, index).is_some() {
                return Err(invalid_bundle_archive(
                    "ZIP agent bundle contains duplicate file entries",
                ));
            }
        }
        Ok(Self::Zip(ZipBundle {
            archive: RefCell::new(archive),
            entries,
        }))
    }

    fn directory_file(root: &Path, entry: &str, label: &str) -> Result<Option<PathBuf>, CliError> {
        let relative = normalize_bundle_entry(entry, label)?;
        let candidate = root.join(relative);
        let resolved = match fs::canonicalize(&candidate) {
            Ok(path) => path,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(_) => {
                return Err(CliError::validation(
                    "bundle_entry_unreadable",
                    format!("Bundle entry cannot be resolved: {label}"),
                ));
            }
        };
        if !resolved.starts_with(root) {
            return Err(CliError::validation(
                "invalid_bundle_path",
                format!("{label} resolves outside the bundle root"),
            ));
        }
        Ok(resolved.is_file().then_some(resolved))
    }

    fn contains_file(&self, entry: &str, label: &str) -> Result<bool, CliError> {
        match self {
            Self::Directory(root) => Ok(Self::directory_file(root, entry, label)?.is_some()),
            Self::Zip(bundle) => {
                let entry = normalize_bundle_entry(entry, label)?;
                Ok(bundle.entries.contains_key(&entry))
            }
        }
    }

    fn read_json(&self, entry: &str, label: &str) -> Result<Value, CliError> {
        match self {
            Self::Directory(root) => {
                let path = Self::directory_file(root, entry, label)?.ok_or_else(|| {
                    CliError::validation(
                        "bundle_entry_missing",
                        format!("Bundle entry is missing: {label}"),
                    )
                    .with_details(json!({ "entry": label }))
                })?;
                read_local_json(&path, label)
            }
            Self::Zip(bundle) => {
                let normalized = normalize_bundle_entry(entry, label)?;
                let index = bundle.entries.get(&normalized).copied().ok_or_else(|| {
                    CliError::validation(
                        "bundle_entry_missing",
                        format!("Bundle entry is missing: {label}"),
                    )
                    .with_details(json!({ "entry": label }))
                })?;
                let mut archive = bundle.archive.borrow_mut();
                let mut file = archive
                    .by_index(index)
                    .map_err(|_| invalid_bundle_archive("ZIP agent bundle entry cannot be read"))?;
                if file.size() > MAX_BUNDLE_JSON_BYTES {
                    return Err(CliError::validation(
                        "bundle_entry_too_large",
                        format!("Bundle JSON entry exceeds the size limit: {label}"),
                    )
                    .with_details(json!({ "entry": label, "limitBytes": MAX_BUNDLE_JSON_BYTES })));
                }
                let mut raw = Vec::with_capacity(file.size() as usize);
                file.by_ref()
                    .take(MAX_BUNDLE_JSON_BYTES + 1)
                    .read_to_end(&mut raw)
                    .map_err(|_| {
                        invalid_bundle_archive("ZIP agent bundle entry cannot be decompressed")
                    })?;
                if raw.len() as u64 > MAX_BUNDLE_JSON_BYTES {
                    return Err(CliError::validation(
                        "bundle_entry_too_large",
                        format!("Bundle JSON entry exceeds the size limit: {label}"),
                    )
                    .with_details(json!({ "entry": label, "limitBytes": MAX_BUNDLE_JSON_BYTES })));
                }
                serde_json::from_slice(&raw).map_err(|error| {
                    CliError::validation(
                        "invalid_bundle_json",
                        format!("Bundle entry is not valid JSON: {label}"),
                    )
                    .with_details(json!({
                        "entry": label,
                        "line": error.line(),
                        "column": error.column()
                    }))
                })
            }
        }
    }

    fn output_contract_entries(&self) -> Result<Vec<String>, CliError> {
        let mut entries = Vec::new();
        match self {
            Self::Directory(root) => {
                let requests = root.join("agent-run/requests");
                let request_entries = fs::read_dir(&requests).map_err(|_| {
                    CliError::validation(
                        "output_contract_missing",
                        "Agent handoff contains no output contracts",
                    )
                })?;
                for entry in request_entries.flatten() {
                    if !entry.file_type().map(|kind| kind.is_dir()).unwrap_or(false) {
                        continue;
                    }
                    let request_id = entry.file_name().to_string_lossy().to_string();
                    let contract_entry =
                        format!("agent-run/requests/{request_id}/output-contract.json");
                    if self.contains_file(&contract_entry, "output contract")? {
                        entries.push(contract_entry);
                    }
                }
            }
            Self::Zip(bundle) => {
                for name in bundle.entries.keys() {
                    let Some(relative) = name.strip_prefix("agent-run/requests/") else {
                        continue;
                    };
                    let Some(request_id) = relative.strip_suffix("/output-contract.json") else {
                        continue;
                    };
                    if !request_id.is_empty() && !request_id.contains('/') {
                        entries.push(name.clone());
                    }
                }
            }
        }
        entries.sort();
        Ok(entries)
    }
}

fn read_local_json(path: &Path, label: &str) -> Result<Value, CliError> {
    let raw = fs::read_to_string(path).map_err(|error| {
        CliError::validation(
            "bundle_entry_missing",
            format!("Bundle entry is missing: {label}"),
        )
        .with_details(json!({ "entry": label, "reason": error.kind().to_string() }))
    })?;
    serde_json::from_str(&raw).map_err(|error| {
        CliError::validation(
            "invalid_bundle_json",
            format!("Bundle entry is not valid JSON: {label}"),
        )
        .with_details(json!({ "entry": label, "line": error.line(), "column": error.column() }))
    })
}

fn required_string(value: &Value, field: &str, error_code: &str) -> Result<String, CliError> {
    value
        .as_str()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .ok_or_else(|| {
            CliError::validation(error_code, format!("{field} must be a non-empty string"))
        })
}

fn required_object<'a>(
    value: &'a Value,
    label: &str,
) -> Result<&'a serde_json::Map<String, Value>, CliError> {
    value.as_object().ok_or_else(|| {
        CliError::validation("invalid_bundle", format!("{label} must be a JSON object"))
    })
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalPageCursor {
    version: u8,
    scope: String,
    criteria: String,
    issued_at: u64,
    after_key: String,
}

fn encode_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn decode_hex(value: &str) -> Result<Vec<u8>, CliError> {
    if value.len() % 2 != 0 || !value.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(CliError::validation(
            "invalid_host_bridge_cursor",
            "Pagination cursor is malformed",
        ));
    }
    (0..value.len())
        .step_by(2)
        .map(|index| {
            u8::from_str_radix(&value[index..index + 2], 16).map_err(|_| {
                CliError::validation(
                    "invalid_host_bridge_cursor",
                    "Pagination cursor is malformed",
                )
            })
        })
        .collect()
}

fn now_unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn local_page_cursor(
    value: Option<&str>,
    scope: &str,
    criteria: &str,
) -> Result<Option<LocalPageCursor>, CliError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    let raw = decode_hex(value)?;
    let cursor: LocalPageCursor = serde_json::from_slice(&raw).map_err(|_| {
        CliError::validation(
            "invalid_host_bridge_cursor",
            "Pagination cursor is malformed",
        )
    })?;
    if cursor.version != 1 || cursor.scope != scope {
        return Err(CliError::validation(
            "invalid_host_bridge_cursor",
            "Pagination cursor belongs to another command",
        ));
    }
    if cursor.criteria != criteria {
        return Err(CliError::validation(
            "invalid_host_bridge_cursor",
            "Pagination cursor does not match the current bundle",
        ));
    }
    if now_unix_seconds().saturating_sub(cursor.issued_at) > 30 * 60 {
        return Err(CliError::validation(
            "invalid_host_bridge_cursor",
            "Pagination cursor has expired",
        ));
    }
    Ok(Some(cursor))
}

fn workflow_agent_bundle_inspect(args: WorkflowAgentBundleInspectArgs) -> Result<Value, CliError> {
    let bundle = LocalBundle::open(&args.bundle)?;
    let context = bundle.read_json("agent-run/context.json", "agent-run/context.json")?;
    let context = required_object(&context, "agent-run/context.json")?;
    let agent_run_id = required_string(
        context.get("agentRunId").unwrap_or(&Value::Null),
        "agentRunId",
        "invalid_agent_bundle",
    )?;
    let mut contracts = Vec::new();
    for entry in bundle.output_contract_entries()? {
        let contract = bundle.read_json(&entry, &entry)?;
        let contract_object = required_object(&contract, "output contract")?;
        if contract_object.get("schema").and_then(Value::as_str)
            != Some(AGENT_RUN_OUTPUT_CONTRACT_SCHEMA)
        {
            return Err(CliError::validation(
                "invalid_output_contract",
                "Agent handoff contains an unsupported output contract schema",
            ));
        }
        required_string(
            contract_object
                .get("agentRequestId")
                .unwrap_or(&Value::Null),
            "agentRequestId",
            "invalid_output_contract",
        )?;
        contracts.push(contract);
    }
    contracts.sort_by(|left, right| {
        left.get("agentRequestId")
            .and_then(Value::as_str)
            .cmp(&right.get("agentRequestId").and_then(Value::as_str))
    });
    if contracts.is_empty() {
        return Err(CliError::validation(
            "output_contract_missing",
            "Agent handoff contains no output contracts",
        ));
    }
    let agent_request_ids = contracts
        .iter()
        .filter_map(|contract| contract.get("agentRequestId").and_then(Value::as_str))
        .collect::<Vec<_>>();
    let criteria = format!("{}\n{}", args.bundle.display(), agent_run_id);
    let cursor = local_page_cursor(
        args.page.cursor.as_deref(),
        "workflow agent-bundle inspect",
        &criteria,
    )?;
    let start = cursor
        .as_ref()
        .map(|cursor| {
            agent_request_ids
                .iter()
                .position(|entry| **entry == cursor.after_key)
                .map(|index| index + 1)
                .ok_or_else(|| {
                    CliError::validation(
                        "invalid_host_bridge_cursor",
                        "Pagination cursor anchor is no longer present",
                    )
                })
        })
        .transpose()?
        .unwrap_or(0);
    let limit = args.page.limit.unwrap_or(25).clamp(1, 100) as usize;
    let end = (start + limit).min(contracts.len());
    let page_contracts = contracts[start..end].to_vec();
    let page_request_ids = agent_request_ids[start..end].to_vec();
    let has_more = end < contracts.len();
    let next_cursor = if has_more {
        let cursor = LocalPageCursor {
            version: 1,
            scope: "workflow agent-bundle inspect".to_string(),
            criteria,
            issued_at: now_unix_seconds(),
            after_key: page_request_ids
                .last()
                .copied()
                .unwrap_or_default()
                .to_string(),
        };
        encode_hex(&serde_json::to_vec(&cursor).map_err(|_| {
            CliError::internal("cursor_encode_failed", "Could not encode pagination cursor")
        })?)
    } else {
        String::new()
    };
    Ok(json!({
        "schema": "zotero-bridge.agent-bundle-inspection.v1",
        "agentRunId": agent_run_id,
        "agentRequestIds": page_request_ids,
        "contracts": page_contracts,
        "nextCursor": next_cursor,
        "hasMore": has_more,
        "returned": end - start,
        "total": contracts.len(),
        "limit": limit,
    }))
}

fn namespace_from(value: &Value) -> Option<&str> {
    value
        .get("namespace")
        .and_then(Value::as_str)
        .or_else(|| {
            value
                .get("run")
                .and_then(Value::as_object)
                .and_then(|run| run.get("namespace"))
                .and_then(Value::as_str)
        })
        .or_else(|| {
            value
                .get("result")
                .and_then(Value::as_object)
                .and_then(|result| result.get("namespace"))
                .and_then(Value::as_str)
        })
}

fn validate_contract_artifacts(
    bundle: &LocalBundle,
    contract: &serde_json::Map<String, Value>,
) -> Result<Vec<String>, CliError> {
    let mut paths = Vec::new();
    for field in ["artifactManifestPath", "requiredArtifactManifestPath"] {
        if let Some(path) = contract.get(field).and_then(Value::as_str) {
            if !bundle.contains_file(path, field)? {
                return Err(CliError::validation(
                    "artifact_manifest_missing",
                    format!("Required artifact manifest is missing: {field}"),
                ));
            }
            bundle.read_json(path, field)?;
            paths.push(field.to_string());
        }
    }
    if let Some(required) = contract
        .get("requiredArtifactPaths")
        .and_then(Value::as_array)
    {
        for (index, entry) in required.iter().enumerate() {
            let raw = required_string(
                entry,
                &format!("requiredArtifactPaths[{index}]"),
                "invalid_output_contract",
            )?;
            if !bundle.contains_file(&raw, "requiredArtifactPaths")? {
                return Err(CliError::validation(
                    "required_artifact_missing",
                    format!("Required result artifact is missing: {raw}"),
                ));
            }
            paths.push(raw);
        }
    }
    Ok(paths)
}

fn workflow_agent_result_validate(
    args: WorkflowAgentResultValidateArgs,
) -> Result<Value, CliError> {
    let contract = read_local_json(&args.contract, "output contract")?;
    let contract = required_object(&contract, "output contract")?;
    if contract.get("schema").and_then(Value::as_str) != Some(AGENT_RUN_OUTPUT_CONTRACT_SCHEMA) {
        return Err(CliError::validation(
            "invalid_output_contract",
            "Output contract has an unsupported schema",
        ));
    }
    let agent_request_id = required_string(
        contract.get("agentRequestId").unwrap_or(&Value::Null),
        "agentRequestId",
        "invalid_output_contract",
    )?;
    let namespace = required_string(
        contract.get("namespace").unwrap_or(&Value::Null),
        "namespace",
        "invalid_output_contract",
    )?;
    let result_json_path = required_string(
        contract.get("resultJsonPath").unwrap_or(&Value::Null),
        "resultJsonPath",
        "invalid_output_contract",
    )?;
    let manifest_path = contract
        .get("expectedBundleManifestPath")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| format!("bundle/{namespace}/manifest.json"));
    let bundle = LocalBundle::open(&args.result)?;
    let result = bundle.read_json(&result_json_path, "resultJsonPath")?;
    required_object(&result, "result JSON")?;
    let manifest = bundle.read_json(&manifest_path, "expectedBundleManifestPath")?;
    required_object(&manifest, "bundle manifest")?;
    for (label, value) in [("result JSON", &result), ("bundle manifest", &manifest)] {
        let actual = namespace_from(value)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                CliError::validation(
                    "bundle_namespace_missing",
                    format!("{label} must declare the result namespace"),
                )
            })?;
        if actual != namespace {
            return Err(CliError::validation(
                "bundle_namespace_mismatch",
                format!("{label} namespace does not match the output contract"),
            )
            .with_details(json!({ "expected": namespace, "actual": actual, "source": label })));
        }
    }
    let artifact_requirements = validate_contract_artifacts(&bundle, contract)?;
    Ok(json!({
        "schema": "zotero-bridge.agent-result-validation.v1",
        "agentRequestId": agent_request_id,
        "namespace": namespace,
        "resultJsonPath": result_json_path,
        "manifestPath": manifest_path,
        "artifactRequirements": artifact_requirements,
    }))
}

fn workflow_profile(config: &BridgeConfig, args: WorkflowProfileArgs) -> Result<Value, CliError> {
    match args.command {
        WorkflowProfileCommand::List => client::get(config, "/workflows/provider-profiles"),
        WorkflowProfileCommand::Describe(args) => client::post(
            config,
            "/workflows/provider-profiles/describe",
            workflow_profile_describe_input(args)?,
        ),
        WorkflowProfileCommand::Validate(args) => client::post(
            config,
            "/workflows/provider-profiles/validate",
            workflow_profile_validate_input(
                args,
                std::env::var("ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE")
                    .ok()
                    .as_deref(),
            )?,
        ),
        WorkflowProfileCommand::Refresh(args) => {
            let backend = args.backend.trim();
            if backend.is_empty() {
                return Err(CliError::validation(
                    "missing_backend_id",
                    "workflow profile refresh requires --backend",
                ));
            }
            client::post(
                config,
                "/workflows/provider-profiles/refresh",
                json!({ "backendId": backend }),
            )
        }
    }
}

fn workflow_defaults(config: &BridgeConfig, args: WorkflowDefaultsArgs) -> Result<Value, CliError> {
    let workflow = workflow_id_arg(&args.workflow, "defaults")?;
    client::post(config, "/workflows/defaults", json!({ "workflowId": workflow }))
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
        RunCommand::Active(args) => client::get(config, &page_path("/tasks/active", args)),
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
        RunPermissionCommand::Pending(args) => {
            client::get(config, &page_path("/permissions/pending", args))
        }
        RunPermissionCommand::Get(args) => client::get(config, &permission_path(args)),
    }
}

fn page_path(path: &str, args: PageArgs) -> String {
    let mut query = Vec::new();
    push_query(&mut query, "cursor", args.cursor);
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    path_with_query(path, query)
}

pub fn file(config: &BridgeConfig, args: FileArgs) -> Result<Value, CliError> {
    match args.command {
        FileCommand::Download(args) => file_download(config, args),
        FileCommand::Upload(args) => file_upload(config, args),
    }
}

pub fn debug(config: &BridgeConfig, args: DebugArgs) -> Result<Value, CliError> {
    match args.command {
        DebugCommand::Status => client::call_current(config, Map::new()),
        DebugCommand::Persistence(input) | DebugCommand::Tasks(input) => {
            call_structured(config, "input", debug_input(input)?)
        }
        DebugCommand::AcpSkillRun(args) => match args.command {
            DebugAcpSkillRunCommand::ReapplyResult(input) => {
                call_structured(config, "input", debug_input(input)?)
            }
        },
        DebugCommand::Synthesis(args) => {
            let input = match args.command {
                DebugSynthesisCommand::Snapshot(input)
                | DebugSynthesisCommand::Diff(input)
                | DebugSynthesisCommand::InspectPaper(input)
                | DebugSynthesisCommand::InspectTopic(input)
                | DebugSynthesisCommand::Operations(input)
                | DebugSynthesisCommand::Profiler(input)
                | DebugSynthesisCommand::Cache(input)
                | DebugSynthesisCommand::CleanInstallReset(input) => input,
            };
            call_structured(config, "input", debug_input(input)?)
        }
    }
}

fn call_declared_capability(
    config: &BridgeConfig,
    capability: &str,
    input: Value,
) -> Result<Value, CliError> {
    client::call(config, capability, input)
}

fn debug_input(args: DebugInputArgs) -> Result<Value, CliError> {
    read_contract_json_arg("input", args.input.as_deref())
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

fn schemas_input(command: SchemasCommand) -> BridgeQueryArgs {
    match command {
        SchemasCommand::Get(args) => args,
    }
}

fn concepts_input(command: ConceptsCommand) -> BridgeQueryArgs {
    match command {
        ConceptsCommand::Query(args) => args,
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
        CitationGraphCommand::RefreshMetrics(_) | CitationGraphCommand::Update(_) => {
            unreachable!("mutation input uses --input")
        }
    }
}

fn resolvers_input(command: ResolversCommand) -> BridgeQueryArgs {
    match command {
        ResolversCommand::Resolve(args) => args,
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

fn insights_input(command: InsightsCommand) -> BridgeQueryArgs {
    match command {
        InsightsCommand::AttentionQueue(args) => args,
    }
}

fn bridge_input(args: BridgeInputArgs) -> Result<Value, CliError> {
    read_contract_json_arg("input", args.input.as_deref())
}

fn bridge_query(args: BridgeQueryArgs) -> Result<Value, CliError> {
    read_contract_json_arg("query", args.query.as_deref())
}

fn call_structured(
    config: &BridgeConfig,
    argument_id: &str,
    input: Value,
) -> Result<Value, CliError> {
    client::call_current(config, Map::from_iter([(argument_id.to_string(), input)]))
}

fn library_readiness_query(command: LibraryReadinessCommand) -> Result<Value, CliError> {
    match command {
        LibraryReadinessCommand::Audit(input)
        | LibraryReadinessCommand::MissingPdf(input)
        | LibraryReadinessCommand::MissingMarkdown(input)
        | LibraryReadinessCommand::MissingAnalysis(input) => bridge_query(input),
    }
}

fn annotation_item_arguments(args: AnnotationItemArgs) -> Map<String, Value> {
    let mut arguments = Map::from_iter([("item".to_string(), Value::String(args.item))]);
    insert_argument(
        &mut arguments,
        "cursor",
        args.page.cursor.map(Value::String),
    );
    insert_argument(&mut arguments, "limit", args.page.limit.map(Value::from));
    arguments
}

fn annotation_export_arguments(args: AnnotationExportArgs) -> Map<String, Value> {
    let mut arguments = Map::from_iter([("item".to_string(), Value::String(args.item))]);
    insert_argument(&mut arguments, "format", args.format.map(Value::String));
    arguments
}

fn synthesis_cache_invalidate_input(args: SynthesisCacheInvalidateArgs) -> Value {
    let mut input = json!({ "scope": args.scope });
    if let Some(id) = args.id {
        input["id"] = Value::String(id);
    }
    input
}

fn mutation_tag_arguments(args: MutationTagArgs) -> Map<String, Value> {
    let input = match args.command {
        MutationTagCommand::Add(input) | MutationTagCommand::Remove(input) => input,
    };
    Map::from_iter([
        ("items".to_string(), json!(input.items)),
        ("tags".to_string(), json!(input.tags)),
    ])
}

fn mutation_collection_arguments(
    args: MutationCollectionArgs,
) -> Result<Map<String, Value>, CliError> {
    match args.command {
        MutationCollectionCommand::Create(args) => Ok(Map::from_iter([(
            "input".to_string(),
            read_contract_json_arg("input", Some(&args.input))?,
        )])),
        MutationCollectionCommand::AddItems(args)
        | MutationCollectionCommand::RemoveItems(args) => Ok(Map::from_iter([
            ("collection".to_string(), Value::String(args.collection)),
            ("items".to_string(), json!(args.items)),
        ])),
    }
}

fn mutation_item_arguments(args: MutationItemArgs) -> Result<Map<String, Value>, CliError> {
    match args.command {
        MutationItemCommand::Update(args) => Ok(Map::from_iter([
            ("item".to_string(), Value::String(args.item)),
            (
                "patch".to_string(),
                read_contract_json_arg("patch", Some(&args.patch))?,
            ),
        ])),
        MutationItemCommand::AttachFile(args) => {
            let mut arguments = Map::from_iter([
                ("item".to_string(), Value::String(args.item)),
                ("file_id".to_string(), Value::String(args.file_id)),
            ]);
            insert_argument(
                &mut arguments,
                "display_name",
                args.display_name.map(Value::String),
            );
            insert_argument(
                &mut arguments,
                "content_type",
                args.content_type.map(Value::String),
            );
            Ok(arguments)
        }
    }
}

fn mutation_note_arguments(args: MutationNoteArgs) -> Result<Map<String, Value>, CliError> {
    match args.command {
        MutationNoteCommand::Create(args) => Ok(Map::from_iter([
            ("item".to_string(), Value::String(args.item)),
            (
                "input".to_string(),
                read_contract_json_arg("input", Some(&args.input))?,
            ),
        ])),
        MutationNoteCommand::Update(args) => Ok(Map::from_iter([
            ("note".to_string(), Value::String(args.note)),
            (
                "input".to_string(),
                read_contract_json_arg("input", Some(&args.input))?,
            ),
        ])),
        MutationNoteCommand::UpsertPayload(args) => Ok(Map::from_iter([
            ("note".to_string(), Value::String(args.note)),
            (
                "input".to_string(),
                read_contract_json_arg("input", Some(&args.input))?,
            ),
        ])),
    }
}

fn json_object_arg(
    argument_id: &str,
    input: Option<&str>,
    code: &str,
    message: &str,
) -> Result<Value, CliError> {
    let value = read_contract_json_arg(argument_id, input)?;
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
        "workflow_options",
        input,
        "invalid_workflow_options",
        "Workflow options must be a JSON object",
    )
}

fn provider_profile_arg(input: Option<&str>) -> Result<Value, CliError> {
    json_object_arg(
        "provider_profile",
        input,
        "invalid_provider_profile",
        "Provider profile must be a JSON object",
    )
}

fn resolved_provider_profile_arg(
    explicit: Option<&str>,
    environment_default: Option<&str>,
) -> Result<Value, CliError> {
    if let Some(explicit) = explicit {
        return provider_profile_arg(Some(explicit));
    }
    let Some(environment_default) = environment_default else {
        return provider_profile_arg(None);
    };
    let trimmed = environment_default.trim();
    if trimmed == "-" {
        return Err(CliError::validation(
            "invalid_default_provider_profile",
            "ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE does not accept stdin",
        ));
    }
    if let Some(path) = trimmed.strip_prefix('@') {
        if !std::path::Path::new(path).is_absolute() {
            return Err(CliError::validation(
                "invalid_default_provider_profile",
                "ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE @file must be absolute",
            ));
        }
    } else if !trimmed.starts_with('{') {
        return Err(CliError::validation(
            "invalid_default_provider_profile",
            "ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE must be inline JSON or @absolute-file",
        ));
    }
    provider_profile_arg(Some(trimmed))
}

fn workflow_describe_input(args: WorkflowDescribeArgs) -> Result<Value, CliError> {
    let workflow = workflow_id_arg(&args.workflow, "describe")?;
    Ok(json!({
        "workflowId": workflow,
        "workflowOptions": workflow_options_arg(args.workflow_options.as_deref())?
    }))
}

fn workflow_profile_describe_input(args: WorkflowProfileDescribeArgs) -> Result<Value, CliError> {
    let backend = args.backend.trim();
    if backend.is_empty() {
        return Err(CliError::validation(
            "missing_backend_id",
            "workflow profile describe requires --backend",
        ));
    }
    Ok(json!({ "backendId": backend }))
}

fn workflow_profile_validate_input(
    args: WorkflowProfileValidateArgs,
    environment_default: Option<&str>,
) -> Result<Value, CliError> {
    let mut input = json!({
        "providerProfile": resolved_provider_profile_arg(
            args.provider_profile.as_deref(),
            environment_default,
        )?
    });
    if args.provider_profile.is_none() && environment_default.is_some() {
        input["source"] = json!("environment-default");
    }
    Ok(input)
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
    let items = read_contract_json_arg("selection", Some(items_input))?;
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

fn workflow_resource_binding(raw: &str) -> Result<(&str, &str), CliError> {
    let Some((slot, value)) = raw.split_once('=') else {
        return Err(CliError::validation(
            "invalid_workflow_resource_binding",
            "Workflow resource bindings must use SLOT=VALUE",
        ));
    };
    let slot = slot.trim();
    let value = value.trim();
    if slot.is_empty()
        || slot.contains('/')
        || slot.contains('\\')
        || value.is_empty()
        || value.contains('=')
    {
        return Err(CliError::validation(
            "invalid_workflow_resource_binding",
            "Workflow resource bindings require a stable slot id and one opaque value",
        ));
    }
    Ok((slot, value))
}

fn is_opaque_file_id(value: &str) -> bool {
    value
        .strip_prefix("file-")
        .is_some_and(|suffix| {
            !suffix.is_empty()
                && suffix
                    .chars()
                    .all(|character| character.is_ascii_alphanumeric() || character == '-')
        })
}

fn workflow_resource_bindings(
    input_resources: &[String],
    output_resources: &[String],
) -> Result<Option<Value>, CliError> {
    if input_resources.is_empty() && output_resources.is_empty() {
        return Ok(None);
    }
    let mut inputs = Map::new();
    for raw in input_resources {
        let (slot, file_id) = workflow_resource_binding(raw)?;
        if !is_opaque_file_id(file_id) {
            return Err(CliError::validation(
                "invalid_workflow_resource_binding",
                "Workflow input resources require opaque file-* handles from file upload",
            ));
        }
        let entry = inputs
            .entry(slot.to_string())
            .or_insert_with(|| json!({ "fileIds": [] }));
        entry["fileIds"]
            .as_array_mut()
            .expect("workflow resource fileIds is initialized as an array")
            .push(Value::String(file_id.to_string()));
    }
    let mut outputs = Map::new();
    for raw in output_resources {
        let (slot, delivery) = workflow_resource_binding(raw)?;
        if delivery != "bridge-download" || outputs.contains_key(slot) {
            return Err(CliError::validation(
                "invalid_workflow_resource_binding",
                "Workflow output resources require one SLOT=bridge-download binding per slot",
            ));
        }
        outputs.insert(slot.to_string(), json!({ "delivery": "bridge-download" }));
    }
    Ok(Some(json!({
        "schema": "zotero-bridge.workflow-resources.v1",
        "inputs": inputs,
        "outputs": outputs,
    })))
}

fn workflow_validate_input(args: WorkflowValidateArgs) -> Result<Value, CliError> {
    let workflow = workflow_id_arg(&args.workflow, "validate")?;
    let mut input = json!({
        "workflowId": workflow,
        "selection": workflow_selection_from(
            args.selection.as_deref(),
            args.none,
            "validate",
        )?,
        "workflowOptions": workflow_options_arg(args.workflow_options.as_deref())?
    });
    if let Some(resource_bindings) = workflow_resource_bindings(
        &args.input_resource,
        &args.output_resource,
    )? {
        input["resourceBindings"] = resource_bindings;
    }
    Ok(input)
}

fn workflow_submit_input(args: WorkflowSubmitArgs) -> Result<Value, CliError> {
    let workflow = workflow_id_arg(&args.workflow, "submit")?;
    let mut input = json!({
        "workflowId": workflow,
        "selection": workflow_selection(&args)?,
        "workflowOptions": workflow_options_arg(args.workflow_options.as_deref())?,
    });
    let environment_default = std::env::var("ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE").ok();
    if args.provider_profile.is_some() || environment_default.is_some() {
        input["providerProfile"] = resolved_provider_profile_arg(
            args.provider_profile.as_deref(),
            environment_default.as_deref(),
        )?;
    }
    if let Some(max_concurrency) = args.max_concurrency {
        input["hostOptions"] = json!({
            "queue": {
                "maxConcurrency": max_concurrency
            }
        });
    }
    if let Some(resource_bindings) = workflow_resource_bindings(
        &args.input_resource,
        &args.output_resource,
    )? {
        input["resourceBindings"] = resource_bindings;
    }
    Ok(input)
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

fn workflow_agent_apply_status(
    config: &BridgeConfig,
    args: WorkflowAgentApplyStatusArgs,
) -> Result<Value, CliError> {
    let agent_run_id = args.agent_run_id.trim();
    if agent_run_id.is_empty() {
        return Err(CliError::validation(
            "missing_agent_run_id",
            "workflow agent-apply-status requires an agent run id",
        ));
    }
    client::get(
        config,
        &page_path(
            &format!(
                "/workflows/agent-runs/{}/apply",
                percent_encode_path(agent_run_id)
            ),
            args.page,
        ),
    )
}

fn workflow_agent_run_lifecycle(
    config: &BridgeConfig,
    args: WorkflowAgentRunLifecycleArgs,
    action: &str,
) -> Result<Value, CliError> {
    let agent_run_id = args.agent_run_id.trim();
    if agent_run_id.is_empty() {
        return Err(CliError::validation(
            "missing_agent_run_id",
            format!("workflow agent-{action} requires an agent run id"),
        ));
    }
    client::post(
        config,
        &format!(
            "/workflows/agent-runs/{}/{}",
            percent_encode_path(agent_run_id),
            action
        ),
        json!({}),
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
    Ok(page_path(
        &format!("/workflows/runs/{}", percent_encode_path(run_id)),
        args.page,
    ))
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
    push_query(&mut query, "cursor", args.cursor);
    path_with_query("/skill-runs/recent", query)
}

fn skill_run_events_path(args: SkillRunEventsArgs) -> Result<String, CliError> {
    let skill_run_id = normalized_skill_run_id(&args.skill_run_id)?;
    let mut query: Vec<(String, String)> = Vec::new();
    push_query(&mut query, "sinceUpdatedAt", args.since_updated_at);
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    push_query(&mut query, "cursor", args.cursor);
    Ok(path_with_query(
        &format!("/skill-runs/{}/events", percent_encode_path(skill_run_id)),
        query,
    ))
}

fn skill_run_reply_input(args: SkillRunReplyArgs) -> Value {
    json!({ "message": args.message })
}

fn context_object_open_input(field: &str, args: ContextObjectRefArgs) -> Result<Value, CliError> {
    let mut map = Map::new();
    map.insert(
        field.to_string(),
        contract::context_ref_value(&args.object_ref)?,
    );
    Ok(Value::Object(map))
}

fn context_selection_open_input(args: ContextSelectionOpenArgs) -> Result<Value, CliError> {
    let items = args
        .item_refs
        .iter()
        .map(|entry| contract::context_ref_value(entry))
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
    push_query(&mut query, "submissionId", args.submission);
    push_query(&mut query, "runId", args.run);
    push_query(&mut query, "state", args.state);
    if args.active_only {
        query.push(("includeHistory".to_string(), "false".to_string()));
    }
    push_query(&mut query, "cursor", args.cursor);
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    path_with_query("/tasks", query)
}

fn workflow_queue_list_path(args: WorkflowQueueListArgs) -> Result<String, CliError> {
    if args.backend_type.is_some() != args.backend.is_some() {
        return Err(CliError::validation(
            "invalid_workflow_queue_scope",
            "Workflow queue backend filtering requires both --backend-type and --backend",
        ));
    }
    let mut query = Vec::new();
    push_query(&mut query, "backendType", args.backend_type);
    push_query(&mut query, "backendId", args.backend);
    push_query(&mut query, "cursor", args.cursor);
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    Ok(path_with_query("/workflows/queue", query))
}

fn workflow_queue_cancel_path(args: WorkflowQueueCancelArgs) -> Result<String, CliError> {
    let queue_id = args.queue_id.trim();
    if queue_id.is_empty() {
        return Err(CliError::validation(
            "missing_workflow_queue_id",
            "Workflow queue cancel requires a queue id",
        ));
    }
    Ok(format!(
        "/workflows/queue/{}/cancel",
        percent_encode_path(queue_id)
    ))
}

fn workflow_submission_path(args: WorkflowSubmissionGetArgs) -> Result<String, CliError> {
    let submission_id = args.submission_id.trim();
    if submission_id.is_empty() {
        return Err(CliError::validation(
            "missing_workflow_submission_id",
            "Workflow submission get requires a submission id",
        ));
    }
    let mut query = Vec::new();
    push_query(&mut query, "cursor", args.cursor);
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    Ok(path_with_query(
        &format!(
            "/workflows/submissions/{}",
            percent_encode_path(submission_id)
        ),
        query,
    ))
}

fn task_recent_path(args: TaskRecentArgs) -> String {
    let mut query: Vec<(String, String)> = Vec::new();
    push_query(&mut query, "workflowId", args.workflow);
    push_query(&mut query, "backendId", args.backend);
    push_query(&mut query, "state", args.state);
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    push_query(&mut query, "cursor", args.cursor);
    path_with_query("/tasks/recent", query)
}

fn workflow_runs_path(args: RunWorkflowRecentArgs) -> String {
    let mut query: Vec<(String, String)> = Vec::new();
    push_query(&mut query, "workflowId", Some(args.workflow));
    if let Some(limit) = args.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    push_query(&mut query, "cursor", args.cursor);
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
        .pointer("/notifications")
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
                "No matching Zotero notification arrived before the timeout",
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
    let file_id = contract::normalize_file_id(&args.file_id)?;
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
    let raw = output.to_string_lossy();
    raw.rsplit(['/', '\\'])
        .find(|entry| !entry.is_empty())
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
            "Zotero Bridge protocol version is incompatible",
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

fn item_notes_arguments(args: ItemNotesArgs) -> Result<Map<String, Value>, CliError> {
    let mut arguments = item_ref_arguments(args.item)?;
    insert_argument(&mut arguments, "limit", args.limit.map(Value::from));
    insert_argument(&mut arguments, "cursor", args.cursor.map(Value::String));
    insert_argument(
        &mut arguments,
        "max_excerpt_chars",
        args.max_excerpt_chars.map(Value::from),
    );
    Ok(arguments)
}

fn item_page_arguments(args: ItemPageArgs) -> Result<Map<String, Value>, CliError> {
    let mut arguments = item_ref_arguments(args.item)?;
    insert_argument(
        &mut arguments,
        "cursor",
        args.page.cursor.map(Value::String),
    );
    insert_argument(&mut arguments, "limit", args.page.limit.map(Value::from));
    Ok(arguments)
}

fn note_detail_arguments(args: NoteDetailArgs) -> Result<Map<String, Value>, CliError> {
    let mut arguments = item_ref_arguments(args.note)?;
    insert_argument(&mut arguments, "format", args.format.map(Value::String));
    insert_argument(&mut arguments, "offset", args.offset.map(Value::from));
    insert_argument(&mut arguments, "max_chars", args.max_chars.map(Value::from));
    Ok(arguments)
}

fn note_payload_arguments(args: NotePayloadArgs) -> Result<Map<String, Value>, CliError> {
    let mut arguments = item_ref_arguments(args.note)?;
    insert_argument(
        &mut arguments,
        "payload_type",
        args.payload_type.map(Value::String),
    );
    insert_argument(&mut arguments, "offset", args.offset.map(Value::from));
    insert_argument(&mut arguments, "max_chars", args.max_chars.map(Value::from));
    Ok(arguments)
}

fn item_ref_arguments(args: ItemRefArgs) -> Result<Map<String, Value>, CliError> {
    let mut arguments = Map::new();
    match (args.key, args.id) {
        (Some(key), None) if !key.trim().is_empty() => {
            arguments.insert("key".to_string(), Value::String(key));
        }
        (None, Some(id)) => {
            arguments.insert("id".to_string(), Value::from(id));
        }
        _ => {
            return Err(CliError::validation(
                "missing_item_ref",
                "Provide exactly one item or note reference with --key or --id",
            ));
        }
    }
    insert_argument(
        &mut arguments,
        "library_id",
        args.library_id.map(Value::from),
    );
    Ok(arguments)
}

fn read_json_arg(input: Option<&str>) -> Result<Value, CliError> {
    let Some(input) = input else {
        return Ok(json!({}));
    };
    let text = if input == "-" {
        let mut buffer = String::new();
        std::io::stdin()
            .read_to_string(&mut buffer)
            .map_err(|_error| {
                CliError::validation("input_source_invalid", "Failed to read JSON from stdin")
                    .with_details(json!({
                        "schema": "host-bridge.argument-error.v1",
                        "phase": "json_source",
                        "source": "stdin",
                        "violations": [{ "reason": "unreadable" }],
                        "truncated": false
                    }))
            })?;
        buffer
    } else if let Some(path) = input.strip_prefix('@') {
        fs::read_to_string(path).map_err(|_error| {
            CliError::validation("input_source_invalid", "Failed to read JSON input file")
                .with_details(json!({
                    "schema": "host-bridge.argument-error.v1",
                    "phase": "json_source",
                    "source": "file",
                    "violations": [{ "reason": "unreadable" }],
                    "truncated": false
                }))
        })?
    } else if Path::new(input).exists() {
        fs::read_to_string(input).map_err(|_error| {
            CliError::validation("input_source_invalid", "Failed to read JSON input file")
                .with_details(json!({
                    "schema": "host-bridge.argument-error.v1",
                    "phase": "json_source",
                    "source": "file",
                    "violations": [{ "reason": "unreadable" }],
                    "truncated": false
                }))
        })?
    } else {
        input.to_string()
    };
    serde_json::from_str::<Value>(&text).map_err(|error| {
        CliError::validation("input_json_invalid", "Input must be valid JSON").with_details(json!({
            "schema": "host-bridge.argument-error.v1",
            "phase": "json_syntax",
            "source": if input == "-" {
                "stdin"
            } else if input.starts_with('@') || Path::new(input).exists() {
                "file"
            } else {
                "inline"
            },
            "line": error.line(),
            "column": error.column(),
            "violations": [{ "reason": "invalid_json" }],
            "truncated": false
        }))
    })
}

fn read_contract_json_arg(argument_id: &str, input: Option<&str>) -> Result<Value, CliError> {
    let value = read_json_arg(input)?;
    contract::validate_current_command_input(argument_id, &value)?;
    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::args::{
        BridgeInputArgs, BridgeQueryArgs, ItemSearchArgs, LiteratureIngestArgs,
        MutationCollectionItemsArgs, MutationItemAttachFileArgs, MutationItemUpdateArgs,
        MutationNoteCreateArgs, MutationTagsArgs,
    };
    use std::io::Write;

    fn write_test_zip(path: &Path, entries: &[(String, Vec<u8>)]) {
        let file = fs::File::create(path).unwrap();
        let mut archive = zip::ZipWriter::new(file);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);
        for (name, contents) in entries {
            archive.start_file(name, options).unwrap();
            archive.write_all(contents).unwrap();
        }
        archive.finish().unwrap();
    }

    fn compose_current(arguments: Map<String, Value>) -> Result<Value, CliError> {
        let command = contract::current_command().unwrap();
        contract::compose_command_payload(&command, &arguments)
    }

    fn item_search_input(args: ItemSearchArgs) -> Result<Value, CliError> {
        read_contract_json_arg("query", Some(&args.query))
    }

    fn item_ref(args: ItemRefArgs) -> Result<Value, CliError> {
        contract::compose_command_payload("library item get", &item_ref_arguments(args)?)
    }

    fn library_readiness_input(command: LibraryReadinessCommand) -> Result<Value, CliError> {
        let query = library_readiness_query(command)?;
        compose_current(Map::from_iter([("query".to_string(), query)]))
    }

    fn literature_ingest_input(args: LiteratureIngestArgs) -> Result<Value, CliError> {
        let input = read_contract_json_arg("input", Some(&args.input))?;
        compose_current(Map::from_iter([("input".to_string(), input)]))
    }

    fn mutation_tag_input(args: MutationTagArgs) -> Result<Value, CliError> {
        let command = match args.command {
            MutationTagCommand::Add(_) => "mutation tag add",
            MutationTagCommand::Remove(_) => "mutation tag remove",
        };
        contract::compose_command_payload(command, &mutation_tag_arguments(args))
    }

    fn mutation_collection_items_input(
        operation: &str,
        args: MutationCollectionItemsArgs,
    ) -> Result<Value, CliError> {
        let command = match operation {
            "collection.addItems" => "mutation collection add-items",
            "collection.removeItems" => "mutation collection remove-items",
            _ => panic!("unexpected collection mutation"),
        };
        contract::compose_command_payload(
            command,
            &Map::from_iter([
                ("collection".to_string(), Value::String(args.collection)),
                ("items".to_string(), json!(args.items)),
            ]),
        )
    }

    fn mutation_item_update_input(args: MutationItemUpdateArgs) -> Result<Value, CliError> {
        let patch = read_contract_json_arg("patch", Some(&args.patch))?;
        compose_current(Map::from_iter([
            ("item".to_string(), Value::String(args.item)),
            ("patch".to_string(), patch),
        ]))
    }

    fn mutation_note_create_input(args: MutationNoteCreateArgs) -> Result<Value, CliError> {
        let input = read_contract_json_arg("input", Some(&args.input))?;
        compose_current(Map::from_iter([
            ("item".to_string(), Value::String(args.item)),
            ("input".to_string(), input),
        ]))
    }

    fn mutation_item_attach_file_input(
        args: MutationItemAttachFileArgs,
    ) -> Result<Value, CliError> {
        let mut arguments = Map::from_iter([
            ("item".to_string(), Value::String(args.item)),
            ("file_id".to_string(), Value::String(args.file_id)),
        ]);
        insert_argument(
            &mut arguments,
            "display_name",
            args.display_name.map(Value::String),
        );
        insert_argument(
            &mut arguments,
            "content_type",
            args.content_type.map(Value::String),
        );
        contract::compose_command_payload("mutation item attach-file", &arguments)
    }

    fn context_ref_value(raw: &str) -> Result<Value, CliError> {
        contract::context_ref_value(raw)
    }

    fn annotation_item_input(args: AnnotationItemArgs) -> Result<Value, CliError> {
        contract::compose_command_payload(
            "library annotation list",
            &annotation_item_arguments(args),
        )
    }

    fn annotation_export_input(args: AnnotationExportArgs) -> Result<Value, CliError> {
        contract::compose_command_payload(
            "library annotation export",
            &annotation_export_arguments(args),
        )
    }

    fn normalize_file_id(raw: &str) -> Result<String, CliError> {
        contract::normalize_file_id(raw)
    }

    #[test]
    fn passes_item_search_query_object_without_field_translation() {
        contract::set_current_command("library item search");
        let input = item_search_input(ItemSearchArgs {
            query: "{\"query\":\"graph\",\"limit\":5,\"libraryId\":1}".to_string(),
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
    fn rejects_legacy_item_search_text_field() {
        contract::set_current_command("library item search");
        let error = item_search_input(ItemSearchArgs {
            query: "{\"text\":\"graph\"}".to_string(),
        })
        .unwrap_err();

        assert_eq!(error.code, "command_input_invalid");
        assert_eq!(
            error
                .details
                .as_ref()
                .and_then(|details| details["violations"][0]["property"].as_str()),
            Some("text")
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
        let cases = [
            ("synthesis topic list", "topics.list"),
            (
                "synthesis topic find-by-paper-ref",
                "topics.find_by_paper_ref",
            ),
            ("synthesis topic get-context", "topics.get_context"),
            ("synthesis topic get-report", "topics.get_report"),
            (
                "synthesis topic get-review-input",
                "topics.get_review_input",
            ),
            ("synthesis schema get", "schemas.get"),
            ("synthesis concept query", "concepts.query"),
            ("synthesis graph overview", "citation_graph.get_overview"),
            (
                "synthesis graph query-cluster",
                "citation_graph.query_cluster",
            ),
            ("synthesis graph get-slice", "citation_graph.get_slice"),
            ("synthesis graph get-layout", "citation_graph.get_layout"),
            ("synthesis graph get-metrics", "citation_graph.get_metrics"),
            (
                "synthesis graph rank-external-references",
                "citation_graph.rank_external_references",
            ),
            (
                "synthesis graph rank-library-papers",
                "citation_graph.rank_library_papers",
            ),
            (
                "synthesis graph refresh-metrics",
                "citation_graph.refresh_metrics",
            ),
            ("synthesis graph update", "citation_graph.update"),
            ("synthesis resolver resolve", "resolvers.resolve"),
            (
                "synthesis artifact manifest",
                "paper_artifacts.get_manifest",
            ),
            ("synthesis artifact read", "paper_artifacts.read"),
            (
                "synthesis artifact export-filtered",
                "paper_artifacts.export_filtered",
            ),
            (
                "synthesis artifact resolve-topic-digest",
                "paper_artifacts.resolve_topic_digest",
            ),
            (
                "synthesis insight attention-queue",
                "insights.get_attention_queue",
            ),
        ];
        for (command, expected) in cases {
            assert_eq!(
                contract::command_entry(command)
                    .unwrap()
                    .pointer("/target/capability")
                    .and_then(Value::as_str),
                Some(expected),
                "{command}"
            );
        }
    }

    #[test]
    fn maps_debug_subcommands_to_capabilities() {
        let cases = [
            ("debug status", "debug.status"),
            ("debug tasks", "debug.tasks.snapshot"),
            ("debug persistence", "debug.persistence.snapshot"),
            (
                "debug acp-skill-run reapply-result",
                "debug.acpSkillRun.reapplyResult",
            ),
            ("debug synthesis snapshot", "debug.synthesis.snapshot"),
            ("debug synthesis diff", "debug.synthesis.diff"),
            (
                "debug synthesis inspect-paper",
                "debug.synthesis.paper.inspect",
            ),
            (
                "debug synthesis inspect-topic",
                "debug.synthesis.topic.inspect",
            ),
            (
                "debug synthesis operations",
                "debug.synthesis.operations.list",
            ),
            ("debug synthesis profiler", "debug.synthesis.profiler.list"),
            ("debug synthesis cache", "debug.synthesis.cache.list"),
            (
                "debug synthesis clean-install-reset",
                "debug.synthesis.cleanInstallReset",
            ),
        ];
        for (command, expected) in cases {
            assert_eq!(
                contract::command_entry(command)
                    .unwrap()
                    .pointer("/target/capability")
                    .and_then(Value::as_str),
                Some(expected),
                "{command}"
            );
        }
    }

    #[test]
    fn reads_bridge_inline_and_file_inputs() {
        contract::set_current_command("mutation preview");
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
        contract::set_current_command("library readiness audit");
        let audit = library_readiness_input(LibraryReadinessCommand::Audit(BridgeQueryArgs {
            query: Some("{\"limit\":25,\"checks\":[\"pdf\",\"analysis\"]}".to_string()),
        }))
        .unwrap();
        assert_eq!(audit, json!({ "limit": 25, "checks": ["pdf", "analysis"] }));

        contract::set_current_command("library readiness missing-markdown");
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
        contract::set_current_command("mutation literature-ingest");
        let input = literature_ingest_input(LiteratureIngestArgs {
            input: "{\"paper\":{\"itemType\":\"thesis\",\"fields\":{\"title\":\"Bridge Paper\",\"university\":\"Example University\"},\"creators\":[{\"name\":\"欧阳明\",\"creatorType\":\"author\"}],\"identifiers\":{},\"attachLandingUrlOnMissingPdf\":true},\"collection\":{\"key\":\"COLL\",\"libraryId\":1}}".to_string(),
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "operation": "literature.ingest",
                "paper": {
                    "itemType": "thesis",
                    "fields": {
                        "title": "Bridge Paper",
                        "university": "Example University"
                    },
                    "creators": [{
                        "name": "欧阳明",
                        "creatorType": "author"
                    }],
                    "identifiers": {},
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
        contract::set_current_command("mutation literature-ingest");
        let path = std::env::temp_dir().join(format!(
            "zotero-bridge-literature-ingest-input-{}.json",
            std::process::id()
        ));
        fs::write(&path, "{\"paper\":{\"itemType\":\"journalArticle\",\"fields\":{\"title\":\"Example\",\"DOI\":\"10.1000/example\"},\"creators\":[],\"identifiers\":{\"doi\":\"10.1000/example\"}}}").unwrap();
        let input = literature_ingest_input(LiteratureIngestArgs {
            input: format!("@{}", path.display()),
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "operation": "literature.ingest",
                "paper": {
                    "itemType": "journalArticle",
                    "fields": {
                        "title": "Example",
                        "DOI": "10.1000/example"
                    },
                    "creators": [],
                    "identifiers": {
                        "doi": "10.1000/example"
                    }
                }
            })
        );
        let _ = fs::remove_file(path);
    }

    #[test]
    fn rejects_non_object_literature_ingest_input() {
        contract::set_current_command("mutation literature-ingest");
        let error = literature_ingest_input(LiteratureIngestArgs {
            input: "[]".to_string(),
        })
        .unwrap_err();
        assert_eq!(error.code, "command_input_invalid");
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
        contract::set_current_command("mutation item update");
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
        contract::set_current_command("mutation note create");
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
                file_id: "file-abc".to_string(),
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
            file_id: "../artifact.md".to_string(),
            display_name: None,
            content_type: None,
        })
        .unwrap_err();
        assert_eq!(attach_error.code, "command_payload_composition_failed");
        assert_eq!(
            attach_error.details.as_ref().unwrap()["argumentId"],
            "file_id"
        );

        let non_handle_error = mutation_item_attach_file_input(MutationItemAttachFileArgs {
            item: "ABC123".to_string(),
            file_id: "artifact-md".to_string(),
            display_name: None,
            content_type: None,
        })
        .unwrap_err();
        assert_eq!(non_handle_error.code, "command_payload_composition_failed");
    }

    #[test]
    fn builds_annotation_inputs() {
        assert_eq!(
            annotation_item_input(AnnotationItemArgs {
                item: "1:ABC123".to_string(),
                page: PageArgs {
                    cursor: None,
                    limit: None,
                },
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
        contract::set_current_command("workflow submit");
        let input = workflow_submit_input(WorkflowSubmitArgs {
            workflow: "topic-synthesis".to_string(),
            selection: Some("[{\"key\":\"ABC\",\"libraryId\":1}]".to_string()),
            none: false,
            workflow_options: Some("{\"language\":\"zh-CN\"}".to_string()),
            provider_profile: Some(
                "{\"schema\":\"zotero-bridge.provider-profile.v1\",\"backendId\":\"acp-opencode\",\"providerOptions\":{\"acpModelId\":\"gpt-5.2\",\"autoApproveAcpPermissions\":true}}".to_string(),
            ),
            input_resource: vec![
                "source=file-upload-1".to_string(),
                "source=file-upload-2".to_string(),
            ],
            output_resource: vec!["result=bridge-download".to_string()],
            max_concurrency: Some(3),
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
                "resourceBindings": {
                    "schema": "zotero-bridge.workflow-resources.v1",
                    "inputs": {
                        "source": {
                            "fileIds": ["file-upload-1", "file-upload-2"]
                        }
                    },
                    "outputs": {
                        "result": {"delivery": "bridge-download"}
                    }
                },
                "providerProfile": {
                    "schema": "zotero-bridge.provider-profile.v1",
                    "backendId": "acp-opencode",
                    "providerOptions": {
                        "acpModelId": "gpt-5.2",
                        "autoApproveAcpPermissions": true
                    }
                },
                "hostOptions": {
                    "queue": {
                        "maxConcurrency": 3
                    }
                }
            })
        );
    }

    #[test]
    fn maps_workflow_submit_none_selection() {
        contract::set_current_command("workflow submit");
        let input = workflow_submit_input(WorkflowSubmitArgs {
            workflow: "global-workflow".to_string(),
            selection: None,
            none: true,
            workflow_options: None,
            provider_profile: None,
            input_resource: vec![],
            output_resource: vec![],
            max_concurrency: None,
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "workflowId": "global-workflow",
                "selection": {
                    "kind": "none"
                },
                "workflowOptions": {}
            })
        );
    }

    #[test]
    fn maps_workflow_validate_resource_bindings() {
        contract::set_current_command("workflow validate");
        let input = workflow_validate_input(WorkflowValidateArgs {
            workflow: "import-notes".to_string(),
            selection: Some("[{\"key\":\"ABC\",\"libraryId\":1}]".to_string()),
            none: false,
            workflow_options: Some("{\"conflictPolicy\":\"error\"}".to_string()),
            input_resource: vec!["digest=file-upload-1".to_string()],
            output_resource: vec![],
        })
        .unwrap();
        assert_eq!(
            input["resourceBindings"],
            json!({
                "schema": "zotero-bridge.workflow-resources.v1",
                "inputs": {
                    "digest": {"fileIds": ["file-upload-1"]}
                },
                "outputs": {}
            })
        );
    }

    #[test]
    fn maps_workflow_agent_run_to_bridge_input() {
        contract::set_current_command("workflow agent-run");
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
        contract::set_current_command("workflow agent-run");
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
        contract::set_current_command("workflow describe");
        let input = workflow_describe_input(WorkflowDescribeArgs {
            workflow: "topic-synthesis".to_string(),
            workflow_options: Some("{\"language\":\"en-US\"}".to_string()),
        })
        .unwrap();
        assert_eq!(
            input,
            json!({
                "workflowId": "topic-synthesis",
                "workflowOptions": {
                    "language": "en-US"
                }
            })
        );
    }

    #[test]
    fn maps_workflow_provider_profile_commands_without_workflow_context() {
        contract::set_current_command("workflow profile validate");
        assert_eq!(
            workflow_profile_describe_input(WorkflowProfileDescribeArgs {
                backend: "acp-opencode".to_string(),
            })
            .unwrap(),
            json!({ "backendId": "acp-opencode" })
        );
        assert_eq!(
            workflow_profile_validate_input(
                WorkflowProfileValidateArgs {
                    provider_profile: Some("{\"backendId\":\"acp-opencode\"}".to_string()),
                },
                None,
            )
            .unwrap(),
            json!({
                "providerProfile": {
                    "backendId": "acp-opencode"
                }
            })
        );
    }

    #[test]
    fn resolves_default_provider_profile_only_when_explicit_is_absent() {
        contract::set_current_command("workflow submit");
        let default = Some("{\"backendId\":\"default-backend\"}");
        assert_eq!(
            resolved_provider_profile_arg(Some("{}"), default).unwrap(),
            json!({})
        );
        assert_eq!(
            resolved_provider_profile_arg(None, default).unwrap(),
            json!({ "backendId": "default-backend" })
        );
    }

    #[test]
    fn builds_task_list_query() {
        let path = task_list_path(TaskListArgs {
            workflow: Some("w 1".to_string()),
            backend: Some("b".to_string()),
            backend_type: None,
            request: None,
            submission: Some("workflow-submission-1".to_string()),
            run: Some("run-1".to_string()),
            state: Some("running".to_string()),
            active_only: true,
            cursor: Some("cursor-1".to_string()),
            limit: Some(25),
        });
        assert_eq!(
            path,
            "/tasks?workflowId=w+1&backendId=b&submissionId=workflow-submission-1&runId=run-1&state=running&includeHistory=false&cursor=cursor-1&limit=25"
        );
    }

    #[test]
    fn builds_native_workflow_queue_and_submission_paths() {
        assert_eq!(
            workflow_queue_list_path(WorkflowQueueListArgs {
                backend_type: Some("skillrunner".to_string()),
                backend: Some("backend a".to_string()),
                cursor: Some("next".to_string()),
                limit: Some(25),
            })
            .unwrap(),
            "/workflows/queue?backendType=skillrunner&backendId=backend+a&cursor=next&limit=25"
        );
        assert!(workflow_queue_list_path(WorkflowQueueListArgs {
            backend_type: Some("skillrunner".to_string()),
            backend: None,
            cursor: None,
            limit: None,
        })
        .is_err());
        assert_eq!(
            workflow_queue_cancel_path(WorkflowQueueCancelArgs {
                queue_id: "workflow queue/1".to_string(),
            })
            .unwrap(),
            "/workflows/queue/workflow%20queue%2F1/cancel"
        );
        assert_eq!(
            workflow_submission_path(WorkflowSubmissionGetArgs {
                submission_id: "workflow submission/1".to_string(),
                cursor: Some("next".to_string()),
                limit: Some(10),
            })
            .unwrap(),
            "/workflows/submissions/workflow%20submission%2F1?cursor=next&limit=10"
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
                page: PageArgs {
                    cursor: None,
                    limit: None,
                },
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
            "notifications": [{ "eventId": "event-1" }]
        })));
        assert!(!notification_response_has_events(&json!({
            "notifications": []
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
    fn inspects_and_validates_local_agent_bundles_without_a_bridge_client() {
        let root = std::env::temp_dir().join(format!(
            "zotero-bridge-local-agent-bundle-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("agent-run/requests/request-1")).unwrap();
        fs::write(
            root.join("agent-run/context.json"),
            r#"{"agentRunId":"agent-run-1"}"#,
        )
        .unwrap();
        let contract = json!({
            "schema": AGENT_RUN_OUTPUT_CONTRACT_SCHEMA,
            "agentRequestId": "request-1",
            "namespace": "example",
            "resultJsonPath": "result/result.json",
            "expectedBundleManifestPath": "bundle/example/manifest.json",
            "requiredArtifactPaths": ["artifacts/proof.txt"]
        });
        fs::write(
            root.join("agent-run/requests/request-1/output-contract.json"),
            serde_json::to_vec(&contract).unwrap(),
        )
        .unwrap();
        let inspection = workflow_agent_bundle_inspect(WorkflowAgentBundleInspectArgs {
            bundle: root.clone(),
            page: PageArgs {
                cursor: None,
                limit: None,
            },
        })
        .unwrap();
        assert_eq!(inspection["agentRunId"], "agent-run-1");
        assert_eq!(inspection["agentRequestIds"], json!(["request-1"]));

        let result_root = root.join("result-bundle");
        fs::create_dir_all(result_root.join("result")).unwrap();
        fs::create_dir_all(result_root.join("bundle/example")).unwrap();
        fs::create_dir_all(result_root.join("artifacts")).unwrap();
        fs::write(
            result_root.join("result/result.json"),
            r#"{"namespace":"example"}"#,
        )
        .unwrap();
        fs::write(
            result_root.join("bundle/example/manifest.json"),
            r#"{"namespace":"example"}"#,
        )
        .unwrap();
        fs::write(result_root.join("artifacts/proof.txt"), "proof").unwrap();
        let contract_path = root.join("contract.json");
        fs::write(&contract_path, serde_json::to_vec(&contract).unwrap()).unwrap();
        let validation = workflow_agent_result_validate(WorkflowAgentResultValidateArgs {
            contract: contract_path,
            result: result_root,
        })
        .unwrap();
        assert_eq!(validation["namespace"], "example");
        assert_eq!(validation["agentRequestId"], "request-1");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn inspects_and_validates_zip_agent_bundles_without_a_bridge_client() {
        let root = std::env::temp_dir().join(format!(
            "zotero-bridge-local-agent-zip-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let contract = json!({
            "schema": AGENT_RUN_OUTPUT_CONTRACT_SCHEMA,
            "agentRequestId": "request-zip",
            "namespace": "example",
            "resultJsonPath": "result/result.json",
            "expectedBundleManifestPath": "bundle/example/manifest.json",
            "requiredArtifactPaths": ["artifacts/proof.txt"]
        });
        let contract_bytes = serde_json::to_vec(&contract).unwrap();
        let handoff_zip = root.join("handoff.zip");
        write_test_zip(
            &handoff_zip,
            &[
                (
                    "agent-run/context.json".to_string(),
                    br#"{"agentRunId":"agent-run-zip"}"#.to_vec(),
                ),
                (
                    "agent-run/requests/request-zip/output-contract.json".to_string(),
                    contract_bytes.clone(),
                ),
            ],
        );
        let inspection = workflow_agent_bundle_inspect(WorkflowAgentBundleInspectArgs {
            bundle: handoff_zip,
            page: PageArgs {
                cursor: None,
                limit: None,
            },
        })
        .unwrap();
        assert_eq!(inspection["agentRunId"], "agent-run-zip");
        assert_eq!(inspection["agentRequestIds"], json!(["request-zip"]));

        let result_zip = root.join("result.zip");
        write_test_zip(
            &result_zip,
            &[
                (
                    "result/result.json".to_string(),
                    br#"{"namespace":"example"}"#.to_vec(),
                ),
                (
                    "bundle/example/manifest.json".to_string(),
                    br#"{"namespace":"example"}"#.to_vec(),
                ),
                ("artifacts/proof.txt".to_string(), b"proof".to_vec()),
            ],
        );
        let contract_path = root.join("contract.json");
        fs::write(&contract_path, contract_bytes).unwrap();
        let validation = workflow_agent_result_validate(WorkflowAgentResultValidateArgs {
            contract: contract_path,
            result: result_zip,
        })
        .unwrap();
        assert_eq!(validation["namespace"], "example");
        assert_eq!(validation["agentRequestId"], "request-zip");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_malformed_zip_agent_bundle_with_structured_error() {
        let zip = std::env::temp_dir().join(format!(
            "zotero-bridge-malformed-agent-zip-test-{}.zip",
            std::process::id()
        ));
        fs::write(&zip, b"PK\x03\x04").unwrap();
        let error = workflow_agent_bundle_inspect(WorkflowAgentBundleInspectArgs {
            bundle: zip.clone(),
            page: PageArgs {
                cursor: None,
                limit: None,
            },
        })
        .unwrap_err();
        assert_eq!(error.code, "invalid_bundle_archive");
        let _ = fs::remove_file(zip);
    }

    #[test]
    fn rejects_zip_entries_that_escape_the_bundle_root() {
        let zip = std::env::temp_dir().join(format!(
            "zotero-bridge-unsafe-agent-zip-test-{}.zip",
            std::process::id()
        ));
        write_test_zip(&zip, &[("../outside.json".to_string(), b"{}".to_vec())]);
        let error = workflow_agent_bundle_inspect(WorkflowAgentBundleInspectArgs {
            bundle: zip.clone(),
            page: PageArgs {
                cursor: None,
                limit: None,
            },
        })
        .unwrap_err();
        assert_eq!(error.code, "invalid_bundle_path");
        let _ = fs::remove_file(zip);
    }

    #[test]
    fn rejects_unsafe_bundle_paths_consistently_across_platforms() {
        for path in [
            "../outside.json",
            "/absolute.json",
            "C:\\outside.json",
            "./C:/outside.json",
            "inside/../../outside.json",
            "nul\0entry.json",
        ] {
            let error = normalize_bundle_entry(path, "test entry").unwrap_err();
            assert_eq!(error.code, "invalid_bundle_path", "path: {path:?}");
        }
    }

    #[test]
    fn rejects_oversized_json_entries_in_zip_agent_bundles() {
        let zip = std::env::temp_dir().join(format!(
            "zotero-bridge-large-agent-zip-test-{}.zip",
            std::process::id()
        ));
        write_test_zip(
            &zip,
            &[(
                "agent-run/context.json".to_string(),
                vec![b' '; 16 * 1024 * 1024 + 1],
            )],
        );
        let error = workflow_agent_bundle_inspect(WorkflowAgentBundleInspectArgs {
            bundle: zip.clone(),
            page: PageArgs {
                cursor: None,
                limit: None,
            },
        })
        .unwrap_err();
        assert_eq!(error.code, "bundle_entry_too_large");
        let _ = fs::remove_file(zip);
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
