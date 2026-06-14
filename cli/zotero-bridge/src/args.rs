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
        long_about = "Send a raw capability request to POST /bridge/v1/call. This is an advanced diagnostic interface; prefer semantic item, note, topic, citation-graph, paper-artifacts, literature, workflow, task, and file commands for normal operations."
    )]
    Call(CallArgs),

    #[command(about = "Read Zotero item data through semantic commands")]
    Item(ItemArgs),

    #[command(about = "Read Zotero note data and embedded note payloads")]
    Note(NoteArgs),

    #[command(about = "Read topic synthesis topic data through semantic commands")]
    Topics(TopicsArgs),

    #[command(about = "Read Synthesis schema metadata through semantic commands")]
    Schemas(SchemasArgs),

    #[command(about = "Query concept knowledge base data through semantic commands")]
    Concepts(ConceptsArgs),

    #[command(about = "Read citation graph data and rankings through semantic commands")]
    CitationGraph(CitationGraphArgs),

    #[command(about = "Read compact library index pages through semantic commands")]
    LibraryIndex(LibraryIndexArgs),

    #[command(about = "Resolve topic resolvers through semantic commands")]
    Resolvers(ResolversArgs),

    #[command(about = "Read reference index diagnostics through semantic commands")]
    ReferenceIndex(ReferenceIndexArgs),

    #[command(about = "Read and export paper artifact data through semantic commands")]
    PaperArtifacts(PaperArtifactsArgs),

    #[command(about = "Read aggregate Host Bridge insight queues")]
    Insights(InsightsArgs),

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
pub struct TopicsArgs {
    #[command(subcommand)]
    pub command: TopicsCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum TopicsCommand {
    #[command(
        about = "List existing topic synthesis topics",
        long_about = "Map to Host Bridge capability topics.list. Use --input for optional JSON parameters; omitted input is {}."
    )]
    List(BridgeInputArgs),

    #[command(
        about = "Find active topic synthesis topics by paper_ref",
        long_about = "Map to Host Bridge capability topics.find_by_paper_ref. Use --input with paper_ref/paperRef or paper_refs/paperRefs."
    )]
    FindByPaperRef(BridgeInputArgs),

    #[command(
        about = "Read one topic synthesis context",
        long_about = "Map to Host Bridge capability topics.get_context. Use --input for the topic lookup payload. Explicit view values are digest, semantic, audit, and full. No view keeps the legacy flat response. For large semantic or full contexts, pass outputPath/output_path and optional overwrite in --input so the Host Bridge writes the view JSON to a file and stdout only contains a compact envelope."
    )]
    GetContext(BridgeInputArgs),

    #[command(
        about = "Read one topic synthesis report markdown body",
        long_about = "Map to Host Bridge capability topics.get_report. The report markdown is read from runtime synthesis_report.body."
    )]
    GetReport(BridgeInputArgs),

    #[command(
        about = "Read review workflow input from Synthesis",
        long_about = "Map to Host Bridge capability topics.get_review_input."
    )]
    GetReviewInput(BridgeInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct SchemasArgs {
    #[command(subcommand)]
    pub command: SchemasCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum SchemasCommand {
    #[command(
        about = "Read Synthesis Layer schema metadata",
        long_about = "Map to Host Bridge capability schemas.get."
    )]
    Get(BridgeInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ConceptsArgs {
    #[command(subcommand)]
    pub command: ConceptsCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum ConceptsCommand {

    #[command(
        about = "Query Synthesis Concept KB candidates",
        long_about = "Map to Host Bridge capability concepts.query. Use --input with concept_candidate_labels/labels for bounded read-only alias matching."
    )]
    Query(BridgeInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct CitationGraphArgs {
    #[command(subcommand)]
    pub command: CitationGraphCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum CitationGraphCommand {
    #[command(
        about = "Read the Synthesis citation graph overview",
        long_about = "Map to Host Bridge capability citation_graph.get_overview."
    )]
    Overview(BridgeInputArgs),

    #[command(
        about = "Query a topic-scoped citation graph cluster",
        long_about = "Map to Host Bridge capability citation_graph.query_cluster. Use --input with source_paper_refs, max_external_nodes, and cluster_policy."
    )]
    QueryCluster(BridgeInputArgs),

    #[command(
        about = "Read a Synthesis citation graph slice",
        long_about = "Map to Host Bridge capability citation_graph.get_slice."
    )]
    GetSlice(BridgeInputArgs),

    #[command(
        about = "Read persisted citation graph layout coordinates",
        long_about = "Map to Host Bridge capability citation_graph.get_layout. Use --input with scope:\"full\" for an explicit full graph layout, or with startNodeId/paperRef/nodeIds/paperRefs for a bounded subgraph layout."
    )]
    GetLayout(BridgeInputArgs),

    #[command(
        about = "Read citation graph metrics for selected papers",
        long_about = "Map to Host Bridge capability citation_graph.get_metrics. Complex metrics are maintained automatically after citation graph rebuilds and incremental refreshes; if diagnostics report missing metrics, use citation-graph refresh-metrics."
    )]
    GetMetrics(BridgeInputArgs),

    #[command(
        about = "Rank external references from the citation graph",
        long_about = "Map to Host Bridge capability citation_graph.rank_external_references."
    )]
    RankExternalReferences(BridgeInputArgs),

    #[command(
        about = "Rank library papers from citation graph metrics",
        long_about = "Map to Host Bridge capability citation_graph.rank_library_papers."
    )]
    RankLibraryPapers(BridgeInputArgs),

    #[command(
        about = "Refresh persisted citation graph complex metrics",
        long_about = "Map to Host Bridge capability citation_graph.refresh_metrics. This diagnostic repair command requires Zotero-side approval and refreshes persisted complex metrics from the current graph cache without rebuilding graph structure."
    )]
    RefreshMetrics(BridgeInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct LibraryIndexArgs {
    #[command(subcommand)]
    pub command: LibraryIndexCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum LibraryIndexCommand {
    #[command(
        about = "Read a compact Synthesis library index page",
        long_about = "Map to Host Bridge capability library_index.get. Use --input for paging and filter JSON."
    )]
    Get(BridgeInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ResolversArgs {
    #[command(subcommand)]
    pub command: ResolversCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum ResolversCommand {
    #[command(
        about = "Resolve a topic resolver into a paper set",
        long_about = "Map to Host Bridge capability resolvers.resolve. --input must be a JSON object with direct resolver fields such as {\"tag\":{\"and\":[\"topic:vision\"]},\"paper_refs\":[\"1:ABCD1234\"],\"combine\":\"union\"}. Do not pass a top-level resolver wrapper, topic_resolver, mode, query, include, or exclude."
    )]
    Resolve(BridgeInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ReferenceIndexArgs {
    #[command(subcommand)]
    pub command: ReferenceIndexCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum ReferenceIndexCommand {
    #[command(
        about = "Read the Synthesis reference index",
        long_about = "Map to Host Bridge capability reference_index.get."
    )]
    Get(BridgeInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct PaperArtifactsArgs {
    #[command(subcommand)]
    pub command: PaperArtifactsCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum PaperArtifactsCommand {

    #[command(
        about = "Read paper artifact manifest metadata",
        long_about = "Map to Host Bridge capability paper_artifacts.get_manifest."
    )]
    Manifest(BridgeInputArgs),

    #[command(
        about = "Read selected paper artifacts",
        long_about = "Map to Host Bridge capability paper_artifacts.read."
    )]
    Read(BridgeInputArgs),

    #[command(
        about = "Export bounded paper artifacts into the run workspace",
        long_about = "Map to Host Bridge capability paper_artifacts.export_filtered."
    )]
    ExportFiltered(BridgeInputArgs),

    #[command(
        about = "Resolve a topic paper digest",
        long_about = "Map to Host Bridge capability paper_artifacts.resolve_topic_digest."
    )]
    ResolveTopicDigest(BridgeInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct InsightsArgs {
    #[command(subcommand)]
    pub command: InsightsCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum InsightsCommand {

    #[command(
        about = "Read aggregate graph/artifact/reference attention items",
        long_about = "Map to Host Bridge capability insights.get_attention_queue."
    )]
    AttentionQueue(BridgeInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct BridgeInputArgs {
    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin",
        long_help = "Host Bridge capability input. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Omit for {}."
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

    #[command(about = "Debug ACP skill run state and recovery actions")]
    AcpSkillRun(DebugAcpSkillRunArgs),

    #[command(about = "Debug Synthesis Layer cache and operations")]
    Synthesis(DebugSynthesisArgs),
}

#[derive(Debug, Clone, Args)]
pub struct DebugAcpSkillRunArgs {
    #[command(subcommand)]
    pub command: DebugAcpSkillRunCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum DebugAcpSkillRunCommand {
    #[command(
        about = "Re-run applyResult for one existing ACP skill run result",
        long_about = "Map to Host Bridge capability debug.acpSkillRun.reapplyResult. Use --input with {\"requestId\":\"...\"}; add resultJsonOverride and overrideMode when the stored result must be corrected before apply."
    )]
    ReapplyResult(DebugInputArgs),
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

    #[command(about = "List debug-only Synthesis explicit operations")]
    Operations(DebugInputArgs),

    #[command(about = "List debug-only Synthesis profiler timings")]
    Profiler(DebugInputArgs),

    #[command(about = "List debug-only Synthesis sidecar cache basis rows")]
    Cache(DebugInputArgs),

    #[command(about = "Dangerous debug operation: reset Synthesis install state")]
    CleanInstallReset(DebugInputArgs),
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

    use super::{Cli, Command, LiteratureCommand, TopicsCommand};

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
        assert!(help.contains("topics"));
        assert!(help.contains("citation-graph"));
        assert!(help.contains("paper-artifacts"));
        assert!(help.contains("insights"));
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
        assert!(help.contains("acp-skill-run"));
        assert!(help.contains("synthesis"));
        let acp = debug.find_subcommand_mut("acp-skill-run").unwrap();
        let acp_help = acp.render_long_help().to_string();
        assert!(acp_help.contains("reapply-result"));
        let synthesis = debug.find_subcommand_mut("synthesis").unwrap();
        let synthesis_help = synthesis.render_long_help().to_string();
        for name in [
            "snapshot",
            "diff",
            "inspect-paper",
            "inspect-topic",
            "operations",
            "profiler",
            "cache",
            "clean-install-reset",
        ] {
            assert!(synthesis_help.contains(name), "missing {name}");
        }
        for removed in ["queue", "jobs", "worker", "maintenance"] {
            assert!(
                !synthesis_help.contains(removed),
                "removed debug command still listed: {removed}"
            );
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
    fn domain_help_exposes_split_subcommands() {
        let mut command = Cli::command();
        let topics = command.find_subcommand_mut("topics").unwrap();
        let topics_help = topics.render_long_help().to_string();
        for name in [
            "list",
            "find-by-paper-ref",
            "get-context",
            "get-report",
            "get-review-input",
        ] {
            assert!(topics_help.contains(name), "missing {name}");
        }

        let graph = command.find_subcommand_mut("citation-graph").unwrap();
        let graph_help = graph.render_long_help().to_string();
        for name in [
            "overview",
            "query-cluster",
            "get-slice",
            "get-layout",
            "get-metrics",
            "rank-external-references",
            "rank-library-papers",
            "refresh-metrics",
        ] {
            assert!(graph_help.contains(name), "missing {name}");
        }

        let artifacts = command.find_subcommand_mut("paper-artifacts").unwrap();
        let artifacts_help = artifacts.render_long_help().to_string();
        for name in ["manifest", "read", "export-filtered", "resolve-topic-digest"] {
            assert!(artifacts_help.contains(name), "missing {name}");
        }
        let insights = command.find_subcommand_mut("insights").unwrap();
        assert!(insights.render_long_help().to_string().contains("attention-queue"));
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
    fn parses_topics_subcommand_with_json_input() {
        let cli = Cli::parse_from(["zotero-bridge", "topics", "list", "--input", "{}"]);

        match cli.command {
            Command::Topics(args) => match args.command {
                TopicsCommand::List(input) => {
                    assert_eq!(input.input.as_deref(), Some("{}"));
                }
                _ => panic!("expected topics list"),
            },
            _ => panic!("expected topics command"),
        }
    }
}
