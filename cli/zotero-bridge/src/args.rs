use std::path::PathBuf;

use clap::{Args, Parser, Subcommand};

#[derive(Debug, Clone, Parser)]
#[command(
    name = "zotero-bridge",
    version,
    about = "Agent-first CLI for Zotero Skills Host Bridge",
    long_about = "Call the Zotero Skills Host Bridge over local HTTP JSON.\n\nOutput contract: stdout contains exactly one final JSON object. Use --help on subcommands for input fields and examples."
)]
pub struct Cli {
    #[arg(
        long,
        global = true,
        env = "ZOTERO_BRIDGE_ENDPOINT",
        help = "Host Bridge endpoint, for example http://127.0.0.1:26570/bridge/v1",
        long_help = "Host Bridge endpoint base URL. If omitted, the CLI reads ZOTERO_BRIDGE_ENDPOINT or a profile file. The CLI does not guess random bridge ports."
    )]
    pub endpoint: Option<String>,

    #[arg(
        long,
        global = true,
        env = "ZOTERO_BRIDGE_PROFILE",
        value_name = "PATH",
        help = "Path to a Host Bridge profile JSON file",
        long_help = "Path to a Host Bridge profile JSON file. If omitted, the CLI tries the Zotero Skills well-known profile. ACP run profiles usually reference tokenEnv; the local well-known profile may contain a bearer token protected by user-level file permissions."
    )]
    pub profile: Option<PathBuf>,

    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Clone, Subcommand)]
pub enum Command {
    #[command(
        about = "Check Host Bridge health without authentication",
        long_about = "Call GET /bridge/v1/health. This command does not require a bearer token and is useful for checking whether the bridge endpoint is reachable."
    )]
    Status,

    #[command(
        about = "Read authenticated Host Bridge manifest",
        long_about = "Call GET /bridge/v1/manifest. Requires ZOTERO_BRIDGE_TOKEN, a profile token/tokenEnv, or the Zotero Skills well-known profile. The response lists bridge protocol metadata and capability names."
    )]
    Manifest,

    #[command(
        about = "Advanced diagnostic raw capability call",
        long_about = "Send a raw capability request to POST /bridge/v1/call. This is an advanced diagnostic interface; prefer semantic item, note, synthesis, literature, workflow, task, and file commands for normal operations."
    )]
    Call(CallArgs),

    #[command(about = "Read Zotero item data through semantic commands")]
    Item(ItemArgs),

    #[command(about = "Read Zotero note data and embedded note payloads")]
    Note(NoteArgs),

    #[command(about = "Read Zotero Synthesis Layer data through semantic commands")]
    Synthesis(SynthesisArgs),

    #[command(about = "Run literature workflow actions through semantic commands")]
    Literature(LiteratureArgs),

    #[command(about = "List, submit, and inspect Zotero workflow runs")]
    Workflow(WorkflowArgs),

    #[command(about = "Inspect workflow task state")]
    Task(TaskArgs),

    #[command(about = "Download registered Host Bridge files")]
    File(FileArgs),

    #[command(about = "Debug-only Host Bridge diagnostics and controls")]
    Debug(DebugArgs),
}

#[derive(Debug, Clone, Args)]
pub struct CallArgs {
    #[arg(help = "Capability name, for example library.get_item_detail")]
    pub capability: String,

    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Capability input as inline JSON, a file path, @file, or '-' for stdin",
        long_help = "Capability input. Use inline JSON such as '{\"key\":\"ABC\"}', a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Omit for {}."
    )]
    pub input: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct ItemArgs {
    #[command(subcommand)]
    pub command: ItemCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum ItemCommand {
    #[command(
        about = "Search Zotero library items",
        long_about = "Map to Host Bridge capability library.search_items. Required: --query. Optional: --limit and --library-id."
    )]
    Search(ItemSearchArgs),

    #[command(
        about = "Get detailed metadata for one Zotero item",
        long_about = "Map to Host Bridge capability library.get_item_detail. Provide --key or --id. --library-id disambiguates item keys."
    )]
    Get(ItemRefArgs),

    #[command(
        about = "List child notes for one Zotero item",
        long_about = "Map to Host Bridge capability library.get_item_notes. Provide --key or --id. Use --limit, --cursor, and --max-excerpt-chars for bounded reads."
    )]
    Notes(ItemNotesArgs),

    #[command(
        about = "List child attachments for one Zotero item",
        long_about = "Map to Host Bridge capability library.get_item_attachments. This returns metadata and broker-issued file handles when available; use file download to fetch registered files."
    )]
    Attachments(ItemRefArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ItemSearchArgs {
    #[arg(long, help = "Search query text")]
    pub query: String,

    #[arg(long, help = "Maximum result count")]
    pub limit: Option<u32>,

    #[arg(long, help = "Zotero library id")]
    pub library_id: Option<u64>,
}

#[derive(Debug, Clone, Args)]
pub struct ItemRefArgs {
    #[arg(long, conflicts_with = "id", help = "Zotero item key")]
    pub key: Option<String>,

    #[arg(long, conflicts_with = "key", help = "Zotero item numeric id")]
    pub id: Option<u64>,

    #[arg(long, help = "Zotero library id for key lookup")]
    pub library_id: Option<u64>,
}

#[derive(Debug, Clone, Args)]
pub struct ItemNotesArgs {
    #[command(flatten)]
    pub item: ItemRefArgs,

    #[arg(long, help = "Maximum note summary count")]
    pub limit: Option<u32>,

    #[arg(long, help = "Pagination cursor")]
    pub cursor: Option<u32>,

    #[arg(long, help = "Maximum excerpt characters per note")]
    pub max_excerpt_chars: Option<u32>,
}

#[derive(Debug, Clone, Args)]
pub struct NoteArgs {
    #[command(subcommand)]
    pub command: NoteCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum NoteCommand {
    #[command(
        about = "Read one Zotero note body chunk",
        long_about = "Map to Host Bridge capability library.get_note_detail. Provide --key or --id. Defaults to text format; use --offset and --max-chars for large notes."
    )]
    Get(NoteDetailArgs),

    #[command(
        about = "List embedded workflow payloads in one Zotero note",
        long_about = "Map to Host Bridge capability library.list_note_payloads. Provide --key or --id."
    )]
    Payloads(ItemRefArgs),

    #[command(
        about = "Read one embedded workflow payload from a Zotero note",
        long_about = "Map to Host Bridge capability library.get_note_payload. Provide --key or --id and optional --payload-type, --offset, and --max-chars."
    )]
    Payload(NotePayloadArgs),
}

#[derive(Debug, Clone, Args)]
pub struct NoteDetailArgs {
    #[command(flatten)]
    pub note: ItemRefArgs,

    #[arg(long, value_parser = ["text", "html"], help = "Payload format")]
    pub format: Option<String>,

    #[arg(long, help = "Start offset")]
    pub offset: Option<u32>,

    #[arg(long, help = "Maximum characters")]
    pub max_chars: Option<u32>,
}

#[derive(Debug, Clone, Args)]
pub struct NotePayloadArgs {
    #[command(flatten)]
    pub note: ItemRefArgs,

    #[arg(long, help = "Payload type to decode")]
    pub payload_type: Option<String>,

    #[arg(long, help = "Start offset")]
    pub offset: Option<u32>,

    #[arg(long, help = "Maximum characters")]
    pub max_chars: Option<u32>,
}

#[derive(Debug, Clone, Args)]
pub struct SynthesisArgs {
    #[command(subcommand)]
    pub command: SynthesisCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum SynthesisCommand {
    #[command(
        about = "List existing topic synthesis topics",
        long_about = "Map to Host Bridge capability synthesis.list_topics. Use --input for optional JSON parameters; omitted input is {}."
    )]
    ListTopics(SynthesisInputArgs),

    #[command(
        about = "Read one topic synthesis context",
        long_about = "Map to Host Bridge capability synthesis.get_topic_context. Use --input for the topic lookup payload."
    )]
    GetTopicContext(SynthesisInputArgs),

    #[command(
        about = "Read Synthesis Layer schema metadata",
        long_about = "Map to Host Bridge capability synthesis.get_schemas."
    )]
    GetSchemas(SynthesisInputArgs),

    #[command(
        about = "Read a compact Synthesis library index page",
        long_about = "Map to Host Bridge capability synthesis.get_library_index. Use --input for paging and filter JSON."
    )]
    GetLibraryIndex(SynthesisInputArgs),

    #[command(
        about = "Resolve a topic resolver into a paper set",
        long_about = "Map to Host Bridge capability synthesis.resolve_resolver. Use --input for resolver JSON."
    )]
    ResolveResolver(SynthesisInputArgs),

    #[command(
        about = "Read the Synthesis paper registry",
        long_about = "Map to Host Bridge capability synthesis.get_paper_registry."
    )]
    GetPaperRegistry(SynthesisInputArgs),

    #[command(
        about = "Query the Synthesis citation graph",
        long_about = "Map to Host Bridge capability synthesis.query_citation_graph."
    )]
    QueryCitationGraph(SynthesisInputArgs),

    #[command(
        about = "Read a Synthesis citation graph slice",
        long_about = "Map to Host Bridge capability synthesis.get_citation_graph_slice."
    )]
    GetCitationGraphSlice(SynthesisInputArgs),

    #[command(
        about = "Read citation graph metrics for selected papers",
        long_about = "Map to Host Bridge capability synthesis.get_citation_graph_metrics."
    )]
    GetCitationGraphMetrics(SynthesisInputArgs),

    #[command(
        about = "Read paper artifact manifest metadata",
        long_about = "Map to Host Bridge capability synthesis.get_paper_artifact_manifest."
    )]
    GetPaperArtifactManifest(SynthesisInputArgs),

    #[command(
        about = "Read selected paper artifacts",
        long_about = "Map to Host Bridge capability synthesis.read_paper_artifacts."
    )]
    ReadPaperArtifacts(SynthesisInputArgs),

    #[command(
        about = "Export bounded paper artifacts into the run workspace",
        long_about = "Map to Host Bridge capability synthesis.export_filtered_paper_artifacts."
    )]
    ExportFilteredPaperArtifacts(SynthesisInputArgs),

    #[command(
        about = "Resolve a topic paper digest",
        long_about = "Map to Host Bridge capability synthesis.resolve_topic_paper_digest."
    )]
    ResolveTopicPaperDigest(SynthesisInputArgs),

    #[command(
        about = "Read review workflow input from Synthesis",
        long_about = "Map to Host Bridge capability synthesis.get_review_input."
    )]
    GetReviewInput(SynthesisInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct SynthesisInputArgs {
    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Synthesis capability input as inline JSON, a file path, @file, or '-' for stdin",
        long_help = "Synthesis capability input. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Omit for {}."
    )]
    pub input: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct LiteratureArgs {
    #[command(subcommand)]
    pub command: LiteratureCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum LiteratureCommand {
    #[command(
        about = "Ingest searched literature into Zotero",
        long_about = "Execute the canonical literature.ingest mutation through Host Bridge approval. Input is a JSON object with papers[] and optional collection."
    )]
    Ingest(LiteratureIngestArgs),
}

#[derive(Debug, Clone, Args)]
pub struct LiteratureIngestArgs {
    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Literature ingest payload as inline JSON, a file path, @file, or '-' for stdin",
        long_help = "Literature ingest payload. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin. The payload must be an object with papers[] and optional collection."
    )]
    pub input: String,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowArgs {
    #[command(subcommand)]
    pub command: WorkflowCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum WorkflowCommand {
    #[command(
        about = "List loaded workflows",
        long_about = "Call GET /bridge/v1/workflows. This read-only command returns workflow ids, labels, providers, and input metadata."
    )]
    List,

    #[command(
        about = "Submit a workflow with explicit JSON input",
        long_about = "Call POST /bridge/v1/workflows/submit. Requires --workflow and --input. The input file must contain explicit input such as {\"items\":[{\"key\":\"ABCD1234\",\"libraryId\":1}]} or {\"kind\":\"none\"}. Workflow submit requires Zotero-side approval."
    )]
    Submit(WorkflowSubmitArgs),

    #[command(
        about = "Read one workflow run status",
        long_about = "Call GET /bridge/v1/workflows/runs/{runId}. This read-only command returns current and recent task state for a workflow run."
    )]
    Run(WorkflowRunArgs),
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowSubmitArgs {
    #[arg(long, help = "Workflow id to submit")]
    pub workflow: String,

    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Workflow input JSON, file path, @file, or '-' for stdin"
    )]
    pub input: String,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowRunArgs {
    #[arg(help = "Workflow run id")]
    pub run_id: String,
}

#[derive(Debug, Clone, Args)]
pub struct TaskArgs {
    #[command(subcommand)]
    pub command: TaskCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum TaskCommand {
    #[command(
        about = "List active and recent workflow tasks",
        long_about = "Call GET /bridge/v1/tasks. Optional filters: --workflow, --backend, --backend-type, --request, --run, --state, and --active-only."
    )]
    List(TaskListArgs),
}

#[derive(Debug, Clone, Args)]
pub struct TaskListArgs {
    #[arg(long, help = "Filter by workflow id")]
    pub workflow: Option<String>,

    #[arg(long, help = "Filter by backend id")]
    pub backend: Option<String>,

    #[arg(long, help = "Filter by backend type")]
    pub backend_type: Option<String>,

    #[arg(long, help = "Filter by provider request id")]
    pub request: Option<String>,

    #[arg(long, help = "Filter by workflow run id")]
    pub run: Option<String>,

    #[arg(long, help = "Filter by task state")]
    pub state: Option<String>,

    #[arg(long, help = "Only return active task runtime rows")]
    pub active_only: bool,
}

#[derive(Debug, Clone, Args)]
pub struct FileArgs {
    #[command(subcommand)]
    pub command: FileCommand,
}

#[derive(Debug, Clone, Args)]
pub struct DebugArgs {
    #[command(subcommand)]
    pub command: DebugCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum DebugCommand {
    #[command(about = "Read debug-only Host Bridge runtime status")]
    Status,

    #[command(about = "Read debug-only persistence diagnostics")]
    Persistence(DebugInputArgs),

    #[command(about = "Read debug-only workflow task diagnostics")]
    Tasks(DebugInputArgs),

    #[command(about = "Debug Synthesis Layer state and workers")]
    Synthesis(DebugSynthesisArgs),
}

#[derive(Debug, Clone, Args)]
pub struct DebugSynthesisArgs {
    #[command(subcommand)]
    pub command: DebugSynthesisCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum DebugSynthesisCommand {
    #[command(about = "Read a debug-only Synthesis snapshot")]
    Snapshot(DebugInputArgs),

    #[command(about = "Read debug-only Synthesis DB/cache differences")]
    Diff(DebugInputArgs),

    #[command(about = "Inspect one debug Synthesis paper")]
    InspectPaper(DebugInputArgs),

    #[command(about = "Inspect one debug Synthesis topic")]
    InspectTopic(DebugInputArgs),

    #[command(about = "Debug Synthesis update queue")]
    Queue(DebugSynthesisQueueArgs),

    #[command(about = "Debug Synthesis job progress")]
    Jobs(DebugSynthesisJobsArgs),

    #[command(about = "Run one debug Synthesis worker")]
    Worker(DebugSynthesisWorkerArgs),

    #[command(about = "Run one debug Synthesis maintenance pass")]
    Maintenance(DebugSynthesisMaintenanceArgs),
}

#[derive(Debug, Clone, Args)]
pub struct DebugSynthesisQueueArgs {
    #[command(subcommand)]
    pub command: DebugSynthesisQueueCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum DebugSynthesisQueueCommand {
    #[command(about = "List debug Synthesis queue events")]
    List(DebugInputArgs),

    #[command(about = "Enqueue one debug Synthesis dirty event")]
    Enqueue(DebugInputArgs),

    #[command(about = "Retry debug Synthesis queue failures")]
    Retry(DebugInputArgs),

    #[command(about = "Pause debug Synthesis queue processing")]
    Pause(DebugInputArgs),

    #[command(about = "Resume debug Synthesis queue processing")]
    Resume(DebugInputArgs),

    #[command(about = "Dangerous debug operation: clear Synthesis queue")]
    Clear(DebugInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct DebugSynthesisJobsArgs {
    #[command(subcommand)]
    pub command: DebugSynthesisJobsCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum DebugSynthesisJobsCommand {
    #[command(about = "List debug Synthesis job progress rows")]
    List(DebugInputArgs),

    #[command(about = "Mark stale debug Synthesis jobs as retryable failures")]
    ClearStale(DebugInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct DebugSynthesisWorkerArgs {
    #[command(subcommand)]
    pub command: DebugSynthesisWorkerCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum DebugSynthesisWorkerCommand {
    #[command(about = "Run one debug Synthesis worker")]
    Run(DebugInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct DebugSynthesisMaintenanceArgs {
    #[command(subcommand)]
    pub command: DebugSynthesisMaintenanceCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum DebugSynthesisMaintenanceCommand {
    #[command(about = "Run one debug Synthesis maintenance pass")]
    Run(DebugInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct DebugInputArgs {
    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Debug capability input as inline JSON, a file path, @file, or '-' for stdin"
    )]
    pub input: Option<String>,
}

#[derive(Debug, Clone, Subcommand)]
pub enum FileCommand {
    #[command(
        about = "Download one registered file handle",
        long_about = "Call GET /bridge/v1/files/{fileId}. This command accepts only broker-issued opaque file ids, never local filesystem paths. It fails if --output already exists unless --force is set."
    )]
    Download(FileDownloadArgs),
}

#[derive(Debug, Clone, Args)]
pub struct FileDownloadArgs {
    #[arg(help = "Broker-issued opaque file id")]
    pub file_id: String,

    #[arg(long, value_name = "PATH", help = "Output file path")]
    pub output: PathBuf,

    #[arg(long, help = "Overwrite the output file if it already exists")]
    pub force: bool,
}

#[cfg(test)]
mod tests {
    use clap::{CommandFactory, Parser};

    use super::{Cli, Command, LiteratureCommand, SynthesisCommand};

    #[test]
    fn top_level_help_exposes_agent_discovery_cues() {
        let mut command = Cli::command();
        let help = command.render_long_help().to_string();

        assert!(help.contains("zotero-bridge"));
        assert!(help.contains("Output contract"));
        assert!(help.contains("status"));
        assert!(help.contains("manifest"));
        assert!(help.contains("item"));
        assert!(help.contains("note"));
        assert!(help.contains("synthesis"));
        assert!(help.contains("literature"));
        assert!(help.contains("workflow"));
        assert!(help.contains("task"));
        assert!(help.contains("file"));
        assert!(help.contains("debug"));
    }

    #[test]
    fn debug_help_exposes_synthesis_controls() {
        let mut command = Cli::command();
        let debug = command.find_subcommand_mut("debug").unwrap();
        let help = debug.render_long_help().to_string();

        assert!(help.contains("status"));
        assert!(help.contains("persistence"));
        assert!(help.contains("tasks"));
        assert!(help.contains("synthesis"));
        let synthesis = debug.find_subcommand_mut("synthesis").unwrap();
        let synthesis_help = synthesis.render_long_help().to_string();
        for name in [
            "snapshot",
            "diff",
            "inspect-paper",
            "inspect-topic",
            "queue",
            "jobs",
            "worker",
            "maintenance",
        ] {
            assert!(synthesis_help.contains(name), "missing {name}");
        }
    }

    #[test]
    fn literature_help_exposes_ingest_subcommand() {
        let mut command = Cli::command();
        let literature = command.find_subcommand_mut("literature").unwrap();
        let help = literature.render_long_help().to_string();

        assert!(help.contains("ingest"));
        let ingest = literature.find_subcommand_mut("ingest").unwrap();
        let ingest_help = ingest.render_long_help().to_string();
        assert!(ingest_help.contains("literature.ingest"));
    }

    #[test]
    fn synthesis_help_exposes_all_subcommands() {
        let mut command = Cli::command();
        let synthesis = command.find_subcommand_mut("synthesis").unwrap();
        let help = synthesis.render_long_help().to_string();

        for name in [
            "list-topics",
            "get-topic-context",
            "get-schemas",
            "get-library-index",
            "resolve-resolver",
            "get-paper-registry",
            "query-citation-graph",
            "get-citation-graph-slice",
            "get-citation-graph-metrics",
            "get-paper-artifact-manifest",
            "read-paper-artifacts",
            "export-filtered-paper-artifacts",
            "resolve-topic-paper-digest",
            "get-review-input",
        ] {
            assert!(help.contains(name), "missing {name}");
        }
    }

    #[test]
    fn parses_literature_ingest_with_json_input() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "literature",
            "ingest",
            "--input",
            "{\"papers\":[{\"title\":\"A\"}]}",
        ]);

        match cli.command {
            Command::Literature(args) => match args.command {
                LiteratureCommand::Ingest(input) => {
                    assert_eq!(input.input, "{\"papers\":[{\"title\":\"A\"}]}");
                }
            },
            _ => panic!("expected literature command"),
        }
    }

    #[test]
    fn parses_synthesis_subcommand_with_json_input() {
        let cli = Cli::parse_from(["zotero-bridge", "synthesis", "list-topics", "--input", "{}"]);

        match cli.command {
            Command::Synthesis(args) => match args.command {
                SynthesisCommand::ListTopics(input) => {
                    assert_eq!(input.input.as_deref(), Some("{}"));
                }
                _ => panic!("expected list-topics"),
            },
            _ => panic!("expected synthesis command"),
        }
    }
}
