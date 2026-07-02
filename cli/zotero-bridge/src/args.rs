use std::path::PathBuf;

use clap::{Args, Parser, Subcommand};

#[derive(Debug, Clone, Parser)]
#[command(
    name = "zotero-bridge",
    version,
    about = "Agent-first CLI for Zotero Agents Host Bridge",
    long_about = "Call the Zotero Agents Host Bridge over local HTTP JSON.\n\nOutput contract: stdout contains exactly one final JSON object. Use --help on subcommands for input fields and examples."
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
        long_help = "Path to a Host Bridge profile JSON file. If omitted, the CLI tries the Zotero Agents well-known profile. ACP run profiles usually reference tokenEnv; the local well-known profile may contain a bearer token protected by user-level file permissions."
    )]
    pub profile: Option<PathBuf>,

    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Clone, Subcommand)]
pub enum Command {
    #[command(
        about = "Inspect Host Bridge status and manifest",
        long_about = "Read Host Bridge health and authenticated manifest metadata."
    )]
    Bridge(BridgeArgs),

    #[command(
        about = "Advanced diagnostic raw capability call",
        long_about = "Send a raw capability request to POST /bridge/v1/call. This is an advanced diagnostic interface; prefer semantic bridge, library, synthesis, workflow, run, mutation, and file commands for normal operations."
    )]
    Call(CallArgs),

    #[command(about = "Read Zotero library, item, and note data")]
    Library(LibraryArgs),

    #[command(about = "Read Zotero UI context and navigate to Zotero objects")]
    Context(ContextArgs),

    #[command(about = "Read Synthesis topics, graph, indexes, artifacts, and insights")]
    Synthesis(SynthesisArgs),

    #[command(about = "Preview and execute approval-gated Host Bridge mutations")]
    Mutation(MutationArgs),

    #[command(about = "List, submit, and inspect Zotero workflow runs")]
    Workflow(WorkflowArgs),

    #[command(about = "Inspect and control workflow runtime state")]
    Run(RunArgs),

    #[command(about = "Download registered Host Bridge files")]
    File(FileArgs),

    #[command(about = "Debug-only Host Bridge diagnostics and controls")]
    Debug(DebugArgs),
}

#[derive(Debug, Clone, Args)]
pub struct BridgeArgs {
    #[command(subcommand)]
    pub command: BridgeCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum BridgeCommand {
    #[command(
        about = "Check Host Bridge health without authentication",
        long_about = "Call GET /bridge/v1/health. This command does not require a bearer token and is useful for checking whether the bridge endpoint is reachable."
    )]
    Status,

    #[command(
        about = "Read authenticated Host Bridge manifest",
        long_about = "Call GET /bridge/v1/manifest. Requires ZOTERO_BRIDGE_TOKEN, a profile token/tokenEnv, or the Zotero Agents well-known profile. The response lists bridge protocol metadata and capability names."
    )]
    Manifest,

    #[command(about = "Inspect or diagnose the active Host Bridge profile")]
    Profile(BridgeProfileArgs),

    #[command(about = "Inspect configured Host Bridge backend profiles")]
    Backend(BridgeBackendArgs),
}

#[derive(Debug, Clone, Args)]
pub struct BridgeProfileArgs {
    #[command(subcommand)]
    pub command: BridgeProfileCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum BridgeProfileCommand {
    #[command(
        about = "Inspect the redacted Host Bridge profile",
        long_about = "Call GET /bridge/v1/diagnostics/profile. The response redacts tokens, local private paths, and backend private payloads."
    )]
    Inspect,

    #[command(
        about = "Diagnose Host Bridge profile readiness",
        long_about = "Call GET /bridge/v1/diagnostics/profile/diagnose."
    )]
    Diagnose,
}

#[derive(Debug, Clone, Args)]
pub struct BridgeBackendArgs {
    #[command(subcommand)]
    pub command: BridgeBackendCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum BridgeBackendCommand {
    #[command(
        about = "List redacted backend profile diagnostics",
        long_about = "Call GET /bridge/v1/diagnostics/backends."
    )]
    List,

    #[command(
        about = "Read one redacted backend profile status",
        long_about = "Call GET /bridge/v1/diagnostics/backends/{backendId}."
    )]
    Status(BridgeBackendStatusArgs),
}

#[derive(Debug, Clone, Args)]
pub struct BridgeBackendStatusArgs {
    #[arg(help = "Backend id")]
    pub backend_id: String,
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
pub struct ContextArgs {
    #[command(subcommand)]
    pub command: ContextCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum ContextCommand {
    #[command(
        about = "Read current Zotero UI context",
        long_about = "Call GET /bridge/v1/context/current. This read-only command returns the active Zotero target, library id, selection state, current item summary, and selected item summaries."
    )]
    Current,

    #[command(about = "Read or open the current Zotero selection")]
    Selection(ContextSelectionArgs),

    #[command(about = "Navigate to a Zotero item")]
    Item(ContextItemArgs),

    #[command(about = "Navigate to a Zotero note")]
    Note(ContextNoteArgs),

    #[command(about = "Navigate to a Zotero collection")]
    Collection(ContextCollectionArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ContextSelectionArgs {
    #[command(subcommand)]
    pub command: ContextSelectionCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum ContextSelectionCommand {
    #[command(
        about = "Read selected Zotero item summaries",
        long_about = "Call GET /bridge/v1/context/selection."
    )]
    Get,

    #[command(
        about = "Open one or more Zotero items as the active selection",
        long_about = "Call POST /bridge/v1/context/selection/open. Item refs must be Zotero object handles such as item keys, numeric ids, libraryId:itemKey, or JSON objects."
    )]
    Open(ContextSelectionOpenArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ContextSelectionOpenArgs {
    #[arg(required = true, help = "Zotero item refs")]
    pub item_refs: Vec<String>,
}

#[derive(Debug, Clone, Args)]
pub struct ContextItemArgs {
    #[command(subcommand)]
    pub command: ContextItemCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum ContextItemCommand {
    #[command(
        about = "Open one Zotero item",
        long_about = "Call POST /bridge/v1/context/items/open. The item ref must be a Zotero object handle, not a path or URI."
    )]
    Open(ContextObjectRefArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ContextNoteArgs {
    #[command(subcommand)]
    pub command: ContextNoteCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum ContextNoteCommand {
    #[command(
        about = "Open one Zotero note",
        long_about = "Call POST /bridge/v1/context/notes/open. The note ref must be a Zotero object handle, not a path or URI."
    )]
    Open(ContextObjectRefArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ContextCollectionArgs {
    #[command(subcommand)]
    pub command: ContextCollectionCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum ContextCollectionCommand {
    #[command(
        about = "Open one Zotero collection",
        long_about = "Call POST /bridge/v1/context/collections/open. The collection target is a collection key with optional --library-id."
    )]
    Open(ContextCollectionOpenArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ContextObjectRefArgs {
    #[arg(help = "Zotero object ref: key, numeric id, libraryId:key, or JSON object")]
    pub object_ref: String,
}

#[derive(Debug, Clone, Args)]
pub struct ContextCollectionOpenArgs {
    #[arg(help = "Zotero collection key")]
    pub collection_key: String,

    #[arg(long, help = "Zotero library id for key lookup")]
    pub library_id: Option<u64>,
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
pub struct LibraryArgs {
    #[command(subcommand)]
    pub command: LibraryCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum LibraryCommand {
    #[command(about = "Read compact Zotero library item summaries")]
    Items(LibraryItemsArgs),

    #[command(about = "Read Zotero item data through semantic commands")]
    Item(ItemArgs),

    #[command(about = "Read Zotero note data and embedded note payloads")]
    Note(NoteArgs),

    #[command(about = "Read Zotero reader annotations")]
    Annotation(AnnotationArgs),

    #[command(
        about = "Sync a Zotero library metadata snapshot page",
        long_about = "Map to Host Bridge capability library.sync_snapshot. Use --input for optional filters: libraryId, cursor, limit, collectionId, collectionKey, tag, itemType, or query. The output includes schema, generatedAt, snapshotId, items, nextCursor, hasMore, returned, and totalScanned."
    )]
    Snapshot(BridgeInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct LibraryItemsArgs {
    #[command(subcommand)]
    pub command: LibraryItemsCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum LibraryItemsCommand {
    #[command(
        about = "List compact Zotero library item summaries",
        long_about = "Map to Host Bridge capability library.list_items. Use --input for optional filters: libraryId, cursor, limit, collectionId, collectionKey, tag, itemType, or query."
    )]
    List(BridgeInputArgs),
}

#[derive(Debug, Clone, Args)]
pub struct AnnotationArgs {
    #[command(subcommand)]
    pub command: AnnotationCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum AnnotationCommand {
    #[command(
        about = "List reader annotations for one Zotero item",
        long_about = "Map to Host Bridge capability library.list_annotations. Provide --item as a Zotero object ref."
    )]
    List(AnnotationItemArgs),

    #[command(
        about = "Export reader annotations for one Zotero item",
        long_about = "Map to Host Bridge capability library.export_annotations. Format values are markdown or json."
    )]
    Export(AnnotationExportArgs),
}

#[derive(Debug, Clone, Args)]
pub struct AnnotationItemArgs {
    #[arg(
        long,
        help = "Zotero item ref: key, numeric id, libraryId:key, or JSON object"
    )]
    pub item: String,
}

#[derive(Debug, Clone, Args)]
pub struct AnnotationExportArgs {
    #[arg(
        long,
        help = "Zotero item ref: key, numeric id, libraryId:key, or JSON object"
    )]
    pub item: String,

    #[arg(long, value_parser = ["markdown", "json"], help = "Export format")]
    pub format: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct SynthesisArgs {
    #[command(subcommand)]
    pub command: SynthesisCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum SynthesisCommand {
    #[command(name = "topic", about = "Read topic synthesis topic data")]
    Topic(TopicsArgs),

    #[command(name = "schema", about = "Read Synthesis schema metadata")]
    Schema(SchemasArgs),

    #[command(name = "concept", about = "Query concept knowledge base data")]
    Concept(ConceptsArgs),

    #[command(name = "graph", about = "Read citation graph data and rankings")]
    Graph(CitationGraphArgs),

    #[command(name = "index", about = "Read compact Synthesis index pages")]
    Index(SynthesisIndexArgs),

    #[command(name = "cache", about = "Inspect and maintain Synthesis cache state")]
    Cache(SynthesisCacheArgs),

    #[command(name = "resolver", about = "Resolve topic resolvers")]
    Resolver(ResolversArgs),

    #[command(name = "artifact", about = "Read and export paper artifact data")]
    Artifact(PaperArtifactsArgs),

    #[command(name = "insight", about = "Read aggregate Host Bridge insight queues")]
    Insight(InsightsArgs),
}

#[derive(Debug, Clone, Args)]
pub struct SynthesisIndexArgs {
    #[command(subcommand)]
    pub command: SynthesisIndexCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum SynthesisIndexCommand {
    #[command(
        about = "Read Synthesis index maintenance status",
        long_about = "Call GET /bridge/v1/synthesis/index/status."
    )]
    Status,

    #[command(about = "Read compact Synthesis library index pages")]
    Library(SynthesisIndexGetArgs),

    #[command(about = "Read Synthesis reference index diagnostics")]
    Reference(SynthesisIndexGetArgs),
}

#[derive(Debug, Clone, Args)]
pub struct SynthesisCacheArgs {
    #[command(subcommand)]
    pub command: SynthesisCacheCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum SynthesisCacheCommand {
    #[command(
        about = "Read Synthesis cache maintenance status",
        long_about = "Call GET /bridge/v1/synthesis/cache/status."
    )]
    Status,

    #[command(
        about = "Invalidate a constrained Synthesis cache scope",
        long_about = "Call POST /bridge/v1/synthesis/cache/invalidate. Scope must be topic, graph, or index and requires Zotero-side approval."
    )]
    Invalidate(SynthesisCacheInvalidateArgs),
}

#[derive(Debug, Clone, Args)]
pub struct SynthesisCacheInvalidateArgs {
    #[arg(long, value_parser = ["topic", "graph", "index"], help = "Cache scope")]
    pub scope: String,

    #[arg(long, help = "Optional opaque target id")]
    pub id: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct SynthesisIndexGetArgs {
    #[command(subcommand)]
    pub command: SynthesisIndexGetCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum SynthesisIndexGetCommand {
    #[command(about = "Read an index page")]
    Get(BridgeInputArgs),
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
        long_about = "Map to Host Bridge capability topics.get_context. Use --input for the topic lookup payload. Explicit view values are digest, semantic, audit, and full. Omitting view keeps the flat response. For large semantic or full contexts, pass outputPath/output_path and optional overwrite in --input. Local profiles write the view JSON directly. Remote profiles with connectionMode:\"remote\" return delivery.mode=\"bridge-download\"; run the returned zotero-bridge file download command and then unzip the bundle."
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
        long_about = "Map to Host Bridge capability citation_graph.get_metrics. Complex metrics are maintained automatically after citation graph rebuilds and incremental refreshes; if diagnostics report missing metrics, use synthesis graph refresh-metrics."
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
        long_about = "Map to Host Bridge capability paper_artifacts.export_filtered. Local profiles write runtime/payloads files inside the supplied run_root. Remote profiles with connectionMode:\"remote\" return delivery.mode=\"bridge-download\"; run the returned zotero-bridge file download command and then unzip the bundle before reading manifest_file."
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
pub struct MutationArgs {
    #[command(subcommand)]
    pub command: MutationCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum MutationCommand {
    #[command(
        about = "Preview a Host Bridge mutation",
        long_about = "Map to Host Bridge capability mutation.preview. Use --input with the mutation preview payload."
    )]
    Preview(BridgeInputArgs),

    #[command(
        about = "Apply a Host Bridge mutation",
        long_about = "Map to Host Bridge capability mutation.execute. Use --input with the mutation execution payload."
    )]
    Apply(BridgeInputArgs),

    #[command(
        name = "literature-ingest",
        about = "Ingest searched literature into Zotero",
        long_about = "Execute the canonical literature.ingest mutation through Host Bridge approval. Input is a JSON object with one paper and optional collection."
    )]
    LiteratureIngest(LiteratureIngestArgs),

    #[command(about = "Build and apply Zotero tag mutations")]
    Tag(MutationTagArgs),

    #[command(about = "Build and apply Zotero collection mutations")]
    Collection(MutationCollectionArgs),

    #[command(about = "Build and apply Zotero item mutations")]
    Item(MutationItemArgs),

    #[command(about = "Build and apply Zotero note mutations")]
    Note(MutationNoteArgs),
}

#[derive(Debug, Clone, Args)]
pub struct LiteratureIngestArgs {
    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Literature ingest payload as inline JSON, a file path, @file, or '-' for stdin",
        long_help = "Literature ingest payload. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin. The payload must be an object with one paper and optional collection."
    )]
    pub input: String,
}

#[derive(Debug, Clone, Args)]
pub struct MutationTagArgs {
    #[command(subcommand)]
    pub command: MutationTagCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum MutationTagCommand {
    #[command(about = "Add tags to Zotero items")]
    Add(MutationTagsArgs),

    #[command(about = "Remove tags from Zotero items")]
    Remove(MutationTagsArgs),
}

#[derive(Debug, Clone, Args)]
pub struct MutationTagsArgs {
    #[arg(long, required = true, help = "Target Zotero item refs")]
    pub items: Vec<String>,

    #[arg(long, required = true, help = "Tags to add or remove")]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Args)]
pub struct MutationCollectionArgs {
    #[command(subcommand)]
    pub command: MutationCollectionCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum MutationCollectionCommand {
    #[command(about = "Create a Zotero collection")]
    Create(MutationCollectionCreateArgs),

    #[command(name = "add-items", about = "Add Zotero items to a collection")]
    AddItems(MutationCollectionItemsArgs),

    #[command(name = "remove-items", about = "Remove Zotero items from a collection")]
    RemoveItems(MutationCollectionItemsArgs),
}

#[derive(Debug, Clone, Args)]
pub struct MutationCollectionCreateArgs {
    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Collection creation payload"
    )]
    pub input: String,
}

#[derive(Debug, Clone, Args)]
pub struct MutationCollectionItemsArgs {
    #[arg(long, help = "Zotero collection ref")]
    pub collection: String,

    #[arg(long, required = true, help = "Target Zotero item refs")]
    pub items: Vec<String>,
}

#[derive(Debug, Clone, Args)]
pub struct MutationItemArgs {
    #[command(subcommand)]
    pub command: MutationItemCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum MutationItemCommand {
    #[command(about = "Update Zotero item fields")]
    Update(MutationItemUpdateArgs),

    #[command(
        name = "attach-file",
        about = "Attach an uploaded Host Bridge file to a Zotero item"
    )]
    AttachFile(MutationItemAttachFileArgs),
}

#[derive(Debug, Clone, Args)]
pub struct MutationItemUpdateArgs {
    #[arg(long, help = "Target Zotero item ref")]
    pub item: String,

    #[arg(long, value_name = "JSON_OR_FILE", help = "Field patch JSON object")]
    pub patch: String,
}

#[derive(Debug, Clone, Args)]
pub struct MutationItemAttachFileArgs {
    #[arg(long, help = "Target Zotero item ref")]
    pub item: String,

    #[arg(long, help = "Host Bridge uploaded file id")]
    pub file: String,

    #[arg(long, help = "Attachment display name")]
    pub display_name: Option<String>,

    #[arg(long, help = "Attachment content type")]
    pub content_type: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct MutationNoteArgs {
    #[command(subcommand)]
    pub command: MutationNoteCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum MutationNoteCommand {
    #[command(about = "Create a child note under one Zotero item")]
    Create(MutationNoteCreateArgs),

    #[command(about = "Update one Zotero note")]
    Update(MutationNoteUpdateArgs),

    #[command(name = "upsert-payload", about = "Upsert one embedded note payload")]
    UpsertPayload(MutationNotePayloadArgs),
}

#[derive(Debug, Clone, Args)]
pub struct MutationNoteCreateArgs {
    #[arg(long, help = "Parent Zotero item ref")]
    pub item: String,

    #[arg(long, value_name = "JSON_OR_FILE", help = "Note payload JSON object")]
    pub input: String,
}

#[derive(Debug, Clone, Args)]
pub struct MutationNoteUpdateArgs {
    #[arg(long, help = "Target Zotero note ref")]
    pub note: String,

    #[arg(long, value_name = "JSON_OR_FILE", help = "Note payload JSON object")]
    pub input: String,
}

#[derive(Debug, Clone, Args)]
pub struct MutationNotePayloadArgs {
    #[arg(long, help = "Target Zotero note ref")]
    pub note: String,

    #[arg(long, value_name = "JSON_OR_FILE", help = "Payload JSON object")]
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
        long_about = "Call POST /bridge/v1/workflows/submit. Requires --workflow and either --items or --none. Use --workflow-options for workflow parameters and --provider-profile for backend/provider runtime options. Workflow submit requires Zotero-side approval unless Host Bridge approvals are globally disabled in Zotero."
    )]
    Submit(WorkflowSubmitArgs),

    #[command(
        about = "Describe workflow selection, option, and provider profile requirements",
        long_about = "Call POST /bridge/v1/workflows/describe. This read-only command returns selection requirements, workflow option schema, compatible backend profiles, provider option schema, and normalized draft values."
    )]
    Describe(WorkflowDescribeArgs),

    #[command(
        about = "Validate workflow input without starting execution",
        long_about = "Call POST /bridge/v1/workflows/validate. Uses the same selection, workflow option, and provider profile payload shape as workflow submit, but does not start a task."
    )]
    Validate(WorkflowSubmitArgs),

    #[command(
        about = "Read workflow requirements",
        long_about = "Call POST /bridge/v1/workflows/requirements. This returns selection, workflow option, and provider profile requirements without starting a task."
    )]
    Requirements(WorkflowRequirementsArgs),

    #[command(
        about = "Prepare a self-owned agent workflow handoff bundle",
        long_about = "Call POST /bridge/v1/workflows/agent-run. This read-only command returns a downloadable workflow context bundle for the calling agent. Requires --workflow and either --items or --none. It does not accept workflow options or provider profiles and does not start a backend task."
    )]
    AgentRun(WorkflowAgentRunArgs),

    #[command(
        about = "Apply finalized self-owned agent workflow result bundles",
        long_about = "Call POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply. Each --result must be AGENT_REQUEST_ID=BUNDLE_PATH. The host recalculates workflow apply readiness and requests Zotero-side approval before applying."
    )]
    AgentApply(WorkflowAgentApplyArgs),
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowSubmitArgs {
    #[arg(long, help = "Workflow id to submit")]
    pub workflow: String,

    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        conflicts_with = "none",
        required_unless_present = "none",
        help = "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    )]
    pub items: Option<String>,

    #[arg(
        long,
        conflicts_with = "items",
        help = "Submit a no-selection workflow"
    )]
    pub none: bool,

    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Workflow options JSON object, file path, @file, or '-' for stdin"
    )]
    pub workflow_options: Option<String>,

    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Provider profile JSON object with backendId and providerOptions"
    )]
    pub provider_profile: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowDescribeArgs {
    #[arg(long, help = "Workflow id to describe")]
    pub workflow: String,

    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Draft workflow options JSON object, file path, @file, or '-' for stdin"
    )]
    pub workflow_options: Option<String>,

    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Draft provider profile JSON object with backendId and providerOptions"
    )]
    pub provider_profile: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowRequirementsArgs {
    #[arg(help = "Workflow id")]
    pub workflow: String,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowAgentRunArgs {
    #[arg(long, help = "Workflow id to prepare for self-owned agent execution")]
    pub workflow: String,

    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        conflicts_with = "none",
        required_unless_present = "none",
        help = "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    )]
    pub items: Option<String>,

    #[arg(
        long,
        conflicts_with = "items",
        help = "Prepare a no-selection workflow"
    )]
    pub none: bool,

    #[arg(
        long,
        value_name = "DIR",
        help = "Download the handoff zip into this directory"
    )]
    pub output_dir: Option<PathBuf>,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowAgentApplyArgs {
    #[arg(help = "Agent run id returned by workflow agent-run")]
    pub agent_run_id: String,

    #[arg(
        long = "result",
        value_name = "AGENT_REQUEST_ID=BUNDLE_PATH",
        required = true,
        num_args = 1,
        help = "Apply-back result mapping. Repeat for multiple request bundles."
    )]
    pub results: Vec<String>,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowRunArgs {
    #[arg(help = "Workflow run id")]
    pub run_id: String,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowCancelArgs {
    #[arg(help = "Workflow run id")]
    pub run_id: String,

    #[arg(long, help = "Optional cancellation reason")]
    pub reason: Option<String>,

    #[arg(long, help = "Optional cancellation message")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct RunArgs {
    #[command(subcommand)]
    pub command: RunCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum RunCommand {
    #[command(
        about = "Read one workflow run status",
        long_about = "Call GET /bridge/v1/workflows/runs/{workflowRunId}. This read-only command returns workflow-level state and known skill run projections."
    )]
    Get(WorkflowRunArgs),

    #[command(
        about = "Request cancellation of a workflow run",
        long_about = "Call POST /bridge/v1/workflows/runs/{workflowRunId}/cancel. Cancellation is an intent and does not guarantee immediate terminal status."
    )]
    Cancel(WorkflowCancelArgs),

    #[command(
        about = "List active and recent workflow runtime tasks",
        long_about = "Call GET /bridge/v1/tasks. Optional filters: --workflow, --backend, --backend-type, --request, --run, --state, and --active-only."
    )]
    List(TaskListArgs),

    #[command(
        about = "List lightweight active workflow runtime tasks",
        long_about = "Call GET /bridge/v1/tasks/active. This returns running, waiting, and failed-retriable task handles without transcripts or local paths."
    )]
    Active,

    #[command(
        about = "List lightweight recent workflow runtime tasks",
        long_about = "Call GET /bridge/v1/tasks/recent. This returns recent task metadata without transcripts or local paths."
    )]
    Recent(TaskRecentArgs),

    #[command(about = "Inspect workflow-run history")]
    Workflow(RunWorkflowArgs),

    #[command(about = "Inspect and interact with concrete workflow skill runs")]
    Skill(RunSkillArgs),

    #[command(about = "Read and acknowledge lightweight workflow notifications")]
    Notification(RunNotificationArgs),

    #[command(about = "Read Host Bridge permission requests")]
    Permission(RunPermissionArgs),
}

#[derive(Debug, Clone, Args)]
pub struct RunWorkflowArgs {
    #[command(subcommand)]
    pub command: RunWorkflowCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum RunWorkflowCommand {
    #[command(
        about = "List recent workflow runs",
        long_about = "Call GET /bridge/v1/workflows/runs filtered by workflow id."
    )]
    Recent(RunWorkflowRecentArgs),
}

#[derive(Debug, Clone, Args)]
pub struct RunWorkflowRecentArgs {
    #[arg(long, help = "Workflow id")]
    pub workflow: String,

    #[arg(long, help = "Maximum number of runs")]
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Args)]
pub struct RunPermissionArgs {
    #[command(subcommand)]
    pub command: RunPermissionCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum RunPermissionCommand {
    #[command(
        about = "List pending Host Bridge permission requests",
        long_about = "Call GET /bridge/v1/permissions/pending. This is read-only and cannot approve or reject."
    )]
    Pending,

    #[command(
        about = "Read one Host Bridge permission request",
        long_about = "Call GET /bridge/v1/permissions/{permissionRequestId}. This is read-only."
    )]
    Get(PermissionRequestIdArgs),
}

#[derive(Debug, Clone, Args)]
pub struct PermissionRequestIdArgs {
    #[arg(help = "Permission request id")]
    pub permission_request_id: String,
}

#[derive(Debug, Clone, Args)]
pub struct TaskRecentArgs {
    #[arg(long, help = "Filter by workflow id")]
    pub workflow: Option<String>,

    #[arg(long, help = "Filter by backend id")]
    pub backend: Option<String>,

    #[arg(long, help = "Filter by task state")]
    pub state: Option<String>,

    #[arg(long, help = "Maximum number of tasks")]
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Args)]
pub struct RunSkillArgs {
    #[command(subcommand)]
    pub command: SkillRunCommand,
}

#[derive(Debug, Clone, Args)]
pub struct RunNotificationArgs {
    #[command(subcommand)]
    pub command: NotificationCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum NotificationCommand {
    #[command(
        about = "List workflow notification inbox events",
        long_about = "Call GET /bridge/v1/notifications. This returns lightweight lifecycle events without transcripts or provider private payloads."
    )]
    List(NotificationListArgs),

    #[command(
        about = "Poll until a workflow notification is available",
        long_about = "Poll GET /bridge/v1/notifications until at least one event matches the filters or the timeout expires."
    )]
    Wait(NotificationWaitArgs),

    #[command(
        about = "Acknowledge workflow notification inbox events",
        long_about = "Call POST /bridge/v1/notifications/ack with one or more event ids."
    )]
    Ack(NotificationAckArgs),
}

#[derive(Debug, Clone, Args)]
pub struct NotificationListArgs {
    #[arg(long, help = "Filter by workflow run id")]
    pub workflow_run_id: Option<String>,

    #[arg(long, help = "Filter by concrete skill run id")]
    pub skill_run_id: Option<String>,

    #[arg(long = "type", help = "Filter by notification type")]
    pub event_type: Option<String>,

    #[arg(long, help = "Return events after this event id")]
    pub since_event_id: Option<String>,

    #[arg(long, help = "Filter by acknowledgement state")]
    pub acknowledged: Option<bool>,

    #[arg(long, help = "Maximum number of events to return")]
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Args)]
pub struct NotificationWaitArgs {
    #[arg(long, help = "Filter by workflow run id")]
    pub workflow_run_id: Option<String>,

    #[arg(long, help = "Filter by concrete skill run id")]
    pub skill_run_id: Option<String>,

    #[arg(long = "type", help = "Filter by notification type")]
    pub event_type: Option<String>,

    #[arg(long, help = "Return events after this event id")]
    pub since_event_id: Option<String>,

    #[arg(long, help = "Filter by acknowledgement state")]
    pub acknowledged: Option<bool>,

    #[arg(long, help = "Maximum number of events to return")]
    pub limit: Option<u32>,

    #[arg(
        long,
        default_value_t = 60000,
        help = "Maximum wait time in milliseconds"
    )]
    pub timeout_ms: u64,

    #[arg(
        long,
        default_value_t = 1000,
        help = "Polling interval in milliseconds"
    )]
    pub interval_ms: u64,
}

#[derive(Debug, Clone, Args)]
pub struct NotificationAckArgs {
    #[arg(long = "event", required = true, help = "Notification event id")]
    pub events: Vec<String>,
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

    #[command(
        about = "List lightweight active workflow tasks",
        long_about = "Call GET /bridge/v1/tasks/active. This returns running, waiting, and failed-retriable task handles without transcripts or local paths."
    )]
    Active,
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
pub struct SkillRunArgs {
    #[command(subcommand)]
    pub command: SkillRunCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum SkillRunCommand {
    #[command(
        about = "Read one concrete skill run",
        long_about = "Call GET /bridge/v1/skill-runs/{skillRunId}. The skill run id is opaque and should be copied from workflow run status or task active output."
    )]
    Get(SkillRunIdArgs),

    #[command(
        about = "Reply to a waiting ACP skill run",
        long_about = "Call POST /bridge/v1/skill-runs/{skillRunId}/reply with a message."
    )]
    Reply(SkillRunReplyArgs),

    #[command(
        about = "Connect a recoverable ACP skill run",
        long_about = "Call POST /bridge/v1/skill-runs/{skillRunId}/connect. This reconnects only and does not send a continuation message."
    )]
    Connect(SkillRunIdArgs),

    #[command(
        about = "List recent concrete skill runs",
        long_about = "Call GET /bridge/v1/skill-runs/recent."
    )]
    Recent(SkillRunRecentArgs),

    #[command(
        about = "List lightweight lifecycle events for one skill run",
        long_about = "Call GET /bridge/v1/skill-runs/{skillRunId}/events. This returns progress facts, not transcripts."
    )]
    Events(SkillRunEventsArgs),
}

#[derive(Debug, Clone, Args)]
pub struct SkillRunIdArgs {
    #[arg(help = "Opaque skill run id")]
    pub skill_run_id: String,
}

#[derive(Debug, Clone, Args)]
pub struct SkillRunReplyArgs {
    #[arg(help = "Opaque skill run id")]
    pub skill_run_id: String,

    #[arg(long, help = "Reply message")]
    pub message: String,
}

#[derive(Debug, Clone, Args)]
pub struct SkillRunRecentArgs {
    #[arg(long, help = "Filter by skill run state")]
    pub state: Option<String>,

    #[arg(long, help = "Maximum number of skill runs")]
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Args)]
pub struct SkillRunEventsArgs {
    #[arg(help = "Opaque skill run id")]
    pub skill_run_id: String,

    #[arg(long, help = "Return events after this updatedAt timestamp")]
    pub since_updated_at: Option<String>,

    #[arg(long, help = "Maximum number of events")]
    pub limit: Option<u32>,
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

    #[command(
        about = "Upload one local file to Host Bridge and return a short-lived file handle",
        long_about = "Call POST /bridge/v1/files/upload. The local source path is used only by the CLI; Host Bridge returns an opaque file handle for later attach-file mutation."
    )]
    Upload(FileUploadArgs),
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

#[derive(Debug, Clone, Args)]
pub struct FileUploadArgs {
    #[arg(help = "Local file path to upload")]
    pub path: String,

    #[arg(long, help = "Display name stored in the Host Bridge file descriptor")]
    pub display_name: Option<String>,

    #[arg(long, help = "Content type for the uploaded file")]
    pub content_type: Option<String>,
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use clap::{CommandFactory, Parser};

    use super::{
        AnnotationCommand, BridgeBackendCommand, BridgeCommand, BridgeProfileCommand, Cli, Command,
        ContextCollectionCommand, ContextCommand, ContextItemCommand, ContextNoteCommand,
        ContextSelectionCommand, FileCommand, LibraryCommand, LibraryItemsCommand,
        MutationCollectionCommand, MutationCommand, MutationItemCommand, MutationNoteCommand,
        MutationTagCommand, NotificationCommand, RunCommand, RunPermissionCommand,
        RunWorkflowCommand, SkillRunCommand, SynthesisCacheCommand, SynthesisCommand,
        SynthesisIndexCommand, TopicsCommand, WorkflowCommand,
    };

    #[test]
    fn top_level_help_exposes_agent_discovery_cues() {
        let mut command = Cli::command();
        let help = command.render_long_help().to_string();

        assert!(help.contains("zotero-bridge"));
        assert!(help.contains("Output contract"));
        assert!(help.contains("bridge"));
        assert!(help.contains("context"));
        assert!(help.contains("library"));
        assert!(help.contains("synthesis"));
        assert!(help.contains("mutation"));
        assert!(help.contains("workflow"));
        assert!(help.contains("run"));
        assert!(help.contains("file"));
        assert!(help.contains("debug"));
        assert!(help.contains("call"));
        for removed in [
            "status",
            "manifest",
            "topics",
            "citation-graph",
            "paper-artifacts",
            "literature",
            "task",
            "skill-run",
        ] {
            assert!(
                command.find_subcommand_mut(removed).is_none(),
                "legacy top-level command still listed: {removed}"
            );
        }
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
    fn bridge_help_exposes_status_and_manifest() {
        let mut command = Cli::command();
        let bridge = command.find_subcommand_mut("bridge").unwrap();
        let help = bridge.render_long_help().to_string();

        assert!(help.contains("status"));
        assert!(help.contains("manifest"));
    }

    #[test]
    fn mutation_help_exposes_literature_ingest_subcommand() {
        let mut command = Cli::command();
        let mutation = command.find_subcommand_mut("mutation").unwrap();
        let help = mutation.render_long_help().to_string();

        assert!(help.contains("preview"));
        assert!(help.contains("apply"));
        assert!(help.contains("literature-ingest"));
        let ingest = mutation.find_subcommand_mut("literature-ingest").unwrap();
        let ingest_help = ingest.render_long_help().to_string();
        assert!(ingest_help.contains("literature.ingest"));
    }

    #[test]
    fn canonical_domain_help_exposes_split_subcommands() {
        let mut command = Cli::command();
        {
            let synthesis = command.find_subcommand_mut("synthesis").unwrap();
            for name in [
                "topic", "schema", "concept", "graph", "index", "resolver", "artifact", "insight",
            ] {
                assert!(
                    synthesis.render_long_help().to_string().contains(name),
                    "missing synthesis group {name}"
                );
            }
            let topics = synthesis.find_subcommand_mut("topic").unwrap();
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
        }

        let library = command.find_subcommand_mut("library").unwrap();
        let library_help = library.render_long_help().to_string();
        for name in ["items", "item", "note", "snapshot"] {
            assert!(library_help.contains(name), "missing {name}");
        }
        let items = library.find_subcommand_mut("items").unwrap();
        assert!(items.render_long_help().to_string().contains("list"));

        let synthesis = command.find_subcommand_mut("synthesis").unwrap();
        {
            let graph = synthesis.find_subcommand_mut("graph").unwrap();
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
        }
        {
            let artifacts = synthesis.find_subcommand_mut("artifact").unwrap();
            let artifacts_help = artifacts.render_long_help().to_string();
            for name in [
                "manifest",
                "read",
                "export-filtered",
                "resolve-topic-digest",
            ] {
                assert!(artifacts_help.contains(name), "missing {name}");
            }
        }
        let insights = synthesis.find_subcommand_mut("insight").unwrap();
        assert!(insights
            .render_long_help()
            .to_string()
            .contains("attention-queue"));
    }

    #[test]
    fn parses_bridge_status() {
        let cli = Cli::parse_from(["zotero-bridge", "bridge", "status"]);

        match cli.command {
            Command::Bridge(args) => match args.command {
                BridgeCommand::Status => {}
                _ => panic!("expected bridge status"),
            },
            _ => panic!("expected bridge command"),
        }
    }

    #[test]
    fn parses_bridge_diagnostics_commands() {
        let cli = Cli::parse_from(["zotero-bridge", "bridge", "profile", "inspect"]);
        match cli.command {
            Command::Bridge(args) => match args.command {
                BridgeCommand::Profile(args) => match args.command {
                    BridgeProfileCommand::Inspect => {}
                    _ => panic!("expected profile inspect"),
                },
                _ => panic!("expected bridge profile"),
            },
            _ => panic!("expected bridge command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "bridge",
            "backend",
            "status",
            "acp-opencode",
        ]);
        match cli.command {
            Command::Bridge(args) => match args.command {
                BridgeCommand::Backend(args) => match args.command {
                    BridgeBackendCommand::Status(input) => {
                        assert_eq!(input.backend_id, "acp-opencode");
                    }
                    _ => panic!("expected backend status"),
                },
                _ => panic!("expected bridge backend"),
            },
            _ => panic!("expected bridge command"),
        }
    }

    #[test]
    fn parses_mutation_literature_ingest_with_json_input() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "mutation",
            "literature-ingest",
            "--input",
            "{\"paper\":{\"title\":\"A\"}}",
        ]);

        match cli.command {
            Command::Mutation(args) => match args.command {
                MutationCommand::LiteratureIngest(input) => {
                    assert_eq!(input.input, "{\"paper\":{\"title\":\"A\"}}");
                }
                _ => panic!("expected mutation literature-ingest"),
            },
            _ => panic!("expected mutation command"),
        }
    }

    #[test]
    fn parses_safe_mutation_commands() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "mutation",
            "tag",
            "add",
            "--items",
            "1:ABC123",
            "--items",
            "DEF456",
            "--tags",
            "reviewed",
            "--tags",
            "favorite",
        ]);
        match cli.command {
            Command::Mutation(args) => match args.command {
                MutationCommand::Tag(args) => match args.command {
                    MutationTagCommand::Add(input) => {
                        assert_eq!(input.items, vec!["1:ABC123", "DEF456"]);
                        assert_eq!(input.tags, vec!["reviewed", "favorite"]);
                    }
                    _ => panic!("expected tag add"),
                },
                _ => panic!("expected mutation tag"),
            },
            _ => panic!("expected mutation command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "mutation",
            "collection",
            "add-items",
            "--collection",
            "COLL123",
            "--items",
            "ABC123",
        ]);
        match cli.command {
            Command::Mutation(args) => match args.command {
                MutationCommand::Collection(args) => match args.command {
                    MutationCollectionCommand::AddItems(input) => {
                        assert_eq!(input.collection, "COLL123");
                        assert_eq!(input.items, vec!["ABC123"]);
                    }
                    _ => panic!("expected collection add-items"),
                },
                _ => panic!("expected mutation collection"),
            },
            _ => panic!("expected mutation command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "mutation",
            "item",
            "attach-file",
            "--item",
            "ABC123",
            "--file",
            "file-1",
            "--display-name",
            "digest.md",
            "--content-type",
            "text/markdown",
        ]);
        match cli.command {
            Command::Mutation(args) => match args.command {
                MutationCommand::Item(args) => match args.command {
                    MutationItemCommand::AttachFile(input) => {
                        assert_eq!(input.item, "ABC123");
                        assert_eq!(input.file, "file-1");
                        assert_eq!(input.display_name.as_deref(), Some("digest.md"));
                        assert_eq!(input.content_type.as_deref(), Some("text/markdown"));
                    }
                    _ => panic!("expected item attach-file"),
                },
                _ => panic!("expected mutation item"),
            },
            _ => panic!("expected mutation command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "mutation",
            "note",
            "upsert-payload",
            "--note",
            "NOTE123",
            "--input",
            "{\"payloadId\":\"digest\"}",
        ]);
        match cli.command {
            Command::Mutation(args) => match args.command {
                MutationCommand::Note(args) => match args.command {
                    MutationNoteCommand::UpsertPayload(input) => {
                        assert_eq!(input.note, "NOTE123");
                        assert_eq!(input.input, "{\"payloadId\":\"digest\"}");
                    }
                    _ => panic!("expected note upsert-payload"),
                },
                _ => panic!("expected mutation note"),
            },
            _ => panic!("expected mutation command"),
        }
    }

    #[test]
    fn parses_annotation_and_upload_commands() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "library",
            "annotation",
            "export",
            "--item",
            "1:ABC123",
            "--format",
            "json",
        ]);
        match cli.command {
            Command::Library(args) => match args.command {
                LibraryCommand::Annotation(args) => match args.command {
                    AnnotationCommand::Export(input) => {
                        assert_eq!(input.item, "1:ABC123");
                        assert_eq!(input.format.as_deref(), Some("json"));
                    }
                    _ => panic!("expected annotation export"),
                },
                _ => panic!("expected library annotation"),
            },
            _ => panic!("expected library command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "file",
            "upload",
            "digest.md",
            "--display-name",
            "Topic Digest.md",
            "--content-type",
            "text/markdown",
        ]);
        match cli.command {
            Command::File(args) => match args.command {
                FileCommand::Upload(input) => {
                    assert_eq!(input.path, PathBuf::from("digest.md"));
                    assert_eq!(input.display_name.as_deref(), Some("Topic Digest.md"));
                    assert_eq!(input.content_type.as_deref(), Some("text/markdown"));
                }
                _ => panic!("expected file upload"),
            },
            _ => panic!("expected file command"),
        }
    }

    #[test]
    fn parses_synthesis_topic_subcommand_with_json_input() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "synthesis",
            "topic",
            "list",
            "--input",
            "{}",
        ]);

        match cli.command {
            Command::Synthesis(args) => match args.command {
                SynthesisCommand::Topic(args) => match args.command {
                    TopicsCommand::List(input) => {
                        assert_eq!(input.input.as_deref(), Some("{}"));
                    }
                    _ => panic!("expected topic list"),
                },
                _ => panic!("expected synthesis topic"),
            },
            _ => panic!("expected synthesis command"),
        }
    }

    #[test]
    fn parses_synthesis_maintenance_commands() {
        let cli = Cli::parse_from(["zotero-bridge", "synthesis", "cache", "status"]);
        match cli.command {
            Command::Synthesis(args) => match args.command {
                SynthesisCommand::Cache(args) => match args.command {
                    SynthesisCacheCommand::Status => {}
                    _ => panic!("expected synthesis cache status"),
                },
                _ => panic!("expected synthesis cache"),
            },
            _ => panic!("expected synthesis command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "synthesis",
            "cache",
            "invalidate",
            "--scope",
            "graph",
            "--id",
            "metrics",
        ]);
        match cli.command {
            Command::Synthesis(args) => match args.command {
                SynthesisCommand::Cache(args) => match args.command {
                    SynthesisCacheCommand::Invalidate(input) => {
                        assert_eq!(input.scope, "graph");
                        assert_eq!(input.id.as_deref(), Some("metrics"));
                    }
                    _ => panic!("expected synthesis cache invalidate"),
                },
                _ => panic!("expected synthesis cache"),
            },
            _ => panic!("expected synthesis command"),
        }

        let cli = Cli::parse_from(["zotero-bridge", "synthesis", "index", "status"]);
        match cli.command {
            Command::Synthesis(args) => match args.command {
                SynthesisCommand::Index(args) => match args.command {
                    SynthesisIndexCommand::Status => {}
                    _ => panic!("expected synthesis index status"),
                },
                _ => panic!("expected synthesis index"),
            },
            _ => panic!("expected synthesis command"),
        }
    }

    #[test]
    fn parses_library_items_list_with_json_input() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "library",
            "items",
            "list",
            "--input",
            "{\"limit\":50}",
        ]);

        match cli.command {
            Command::Library(args) => match args.command {
                LibraryCommand::Items(args) => match args.command {
                    LibraryItemsCommand::List(input) => {
                        assert_eq!(input.input.as_deref(), Some("{\"limit\":50}"));
                    }
                },
                _ => panic!("expected library items"),
            },
            _ => panic!("expected library command"),
        }
    }

    #[test]
    fn parses_library_snapshot_with_json_input() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "library",
            "snapshot",
            "--input",
            "{\"limit\":200,\"collectionKey\":\"COLL\"}",
        ]);

        match cli.command {
            Command::Library(args) => match args.command {
                LibraryCommand::Snapshot(input) => {
                    assert_eq!(
                        input.input.as_deref(),
                        Some("{\"limit\":200,\"collectionKey\":\"COLL\"}")
                    );
                }
                _ => panic!("expected library snapshot"),
            },
            _ => panic!("expected library command"),
        }
    }

    #[test]
    fn parses_context_commands() {
        let cli = Cli::parse_from(["zotero-bridge", "context", "current"]);
        match cli.command {
            Command::Context(args) => match args.command {
                ContextCommand::Current => {}
                _ => panic!("expected context current"),
            },
            _ => panic!("expected context command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "context",
            "selection",
            "open",
            "1:ABC123",
            "{\"key\":\"DEF456\"}",
        ]);
        match cli.command {
            Command::Context(args) => match args.command {
                ContextCommand::Selection(args) => match args.command {
                    ContextSelectionCommand::Open(input) => {
                        assert_eq!(input.item_refs, vec!["1:ABC123", "{\"key\":\"DEF456\"}"]);
                    }
                    _ => panic!("expected selection open"),
                },
                _ => panic!("expected context selection"),
            },
            _ => panic!("expected context command"),
        }

        let cli = Cli::parse_from(["zotero-bridge", "context", "item", "open", "ABC123"]);
        match cli.command {
            Command::Context(args) => match args.command {
                ContextCommand::Item(args) => match args.command {
                    ContextItemCommand::Open(input) => assert_eq!(input.object_ref, "ABC123"),
                },
                _ => panic!("expected context item"),
            },
            _ => panic!("expected context command"),
        }

        let cli = Cli::parse_from(["zotero-bridge", "context", "note", "open", "NOTE123"]);
        match cli.command {
            Command::Context(args) => match args.command {
                ContextCommand::Note(args) => match args.command {
                    ContextNoteCommand::Open(input) => assert_eq!(input.object_ref, "NOTE123"),
                },
                _ => panic!("expected context note"),
            },
            _ => panic!("expected context command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "context",
            "collection",
            "open",
            "COLL123",
            "--library-id",
            "1",
        ]);
        match cli.command {
            Command::Context(args) => match args.command {
                ContextCommand::Collection(args) => match args.command {
                    ContextCollectionCommand::Open(input) => {
                        assert_eq!(input.collection_key, "COLL123");
                        assert_eq!(input.library_id, Some(1));
                    }
                },
                _ => panic!("expected context collection"),
            },
            _ => panic!("expected context command"),
        }
    }

    #[test]
    fn parses_workflow_describe_with_profile_inputs() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "describe",
            "--workflow",
            "literature-analysis",
            "--workflow-options",
            "{\"language\":\"zh-CN\"}",
            "--provider-profile",
            "{\"backendId\":\"acp-opencode\"}",
        ]);

        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Describe(input) => {
                    assert_eq!(input.workflow, "literature-analysis");
                    assert_eq!(
                        input.workflow_options.as_deref(),
                        Some("{\"language\":\"zh-CN\"}")
                    );
                    assert_eq!(
                        input.provider_profile.as_deref(),
                        Some("{\"backendId\":\"acp-opencode\"}")
                    );
                }
                _ => panic!("expected workflow describe"),
            },
            _ => panic!("expected workflow command"),
        }
    }

    #[test]
    fn parses_workflow_submit_with_items() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "submit",
            "--workflow",
            "literature-analysis",
            "--items",
            "[{\"key\":\"ABC\",\"libraryId\":1}]",
        ]);

        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Submit(input) => {
                    assert_eq!(input.workflow, "literature-analysis");
                    assert_eq!(
                        input.items.as_deref(),
                        Some("[{\"key\":\"ABC\",\"libraryId\":1}]")
                    );
                    assert!(!input.none);
                }
                _ => panic!("expected workflow submit"),
            },
            _ => panic!("expected workflow command"),
        }
    }

    #[test]
    fn parses_workflow_submit_with_none() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "submit",
            "--workflow",
            "global-workflow",
            "--none",
        ]);

        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Submit(input) => {
                    assert_eq!(input.workflow, "global-workflow");
                    assert!(input.none);
                    assert!(input.items.is_none());
                }
                _ => panic!("expected workflow submit"),
            },
            _ => panic!("expected workflow command"),
        }
    }

    #[test]
    fn parses_workflow_validate_and_requirements() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "validate",
            "--workflow",
            "literature-analysis",
            "--none",
            "--workflow-options",
            "{\"language\":\"zh-CN\"}",
        ]);
        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Validate(input) => {
                    assert_eq!(input.workflow, "literature-analysis");
                    assert!(input.none);
                    assert_eq!(
                        input.workflow_options.as_deref(),
                        Some("{\"language\":\"zh-CN\"}")
                    );
                }
                _ => panic!("expected workflow validate"),
            },
            _ => panic!("expected workflow command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "requirements",
            "literature-analysis",
        ]);
        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Requirements(input) => {
                    assert_eq!(input.workflow, "literature-analysis");
                }
                _ => panic!("expected workflow requirements"),
            },
            _ => panic!("expected workflow command"),
        }
    }

    #[test]
    fn parses_workflow_agent_run_with_output_dir() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "agent-run",
            "--workflow",
            "literature-analysis",
            "--items",
            "[{\"key\":\"ABC\",\"libraryId\":1}]",
            "--output-dir",
            "handoff",
        ]);

        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::AgentRun(input) => {
                    assert_eq!(input.workflow, "literature-analysis");
                    assert_eq!(
                        input.items.as_deref(),
                        Some("[{\"key\":\"ABC\",\"libraryId\":1}]")
                    );
                    assert_eq!(
                        input.output_dir.as_deref(),
                        Some(PathBuf::from("handoff").as_path())
                    );
                }
                _ => panic!("expected workflow agent-run"),
            },
            _ => panic!("expected workflow command"),
        }
    }

    #[test]
    fn parses_workflow_agent_apply_with_multiple_results() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "agent-apply",
            "agent-run-1",
            "--result",
            "req-001=C:\\tmp\\one.zip",
            "--result",
            "req-002=C:\\tmp\\two",
        ]);

        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::AgentApply(input) => {
                    assert_eq!(input.agent_run_id, "agent-run-1");
                    assert_eq!(input.results.len(), 2);
                    assert_eq!(input.results[0], "req-001=C:\\tmp\\one.zip");
                    assert_eq!(input.results[1], "req-002=C:\\tmp\\two");
                }
                _ => panic!("expected workflow agent-apply"),
            },
            _ => panic!("expected workflow command"),
        }
    }

    #[test]
    fn parses_workflow_cancel() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "run",
            "cancel",
            "run-1",
            "--reason",
            "user-requested",
        ]);

        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Cancel(input) => {
                    assert_eq!(input.run_id, "run-1");
                    assert_eq!(input.reason.as_deref(), Some("user-requested"));
                }
                _ => panic!("expected run cancel"),
            },
            _ => panic!("expected run command"),
        }
    }

    #[test]
    fn parses_run_active() {
        let cli = Cli::parse_from(["zotero-bridge", "run", "active"]);

        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Active => {}
                _ => panic!("expected run active"),
            },
            _ => panic!("expected run command"),
        }
    }

    #[test]
    fn parses_run_notification_commands() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "run",
            "notification",
            "list",
            "--workflow-run-id",
            "run-1",
            "--type",
            "workflow.run.completed",
            "--acknowledged",
            "false",
        ]);

        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Notification(args) => match args.command {
                    NotificationCommand::List(input) => {
                        assert_eq!(input.workflow_run_id.as_deref(), Some("run-1"));
                        assert_eq!(input.event_type.as_deref(), Some("workflow.run.completed"));
                        assert_eq!(input.acknowledged, Some(false));
                    }
                    _ => panic!("expected notification list"),
                },
                _ => panic!("expected run notification"),
            },
            _ => panic!("expected run command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "run",
            "notification",
            "ack",
            "--event",
            "event-1",
            "--event",
            "event-2",
        ]);
        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Notification(args) => match args.command {
                    NotificationCommand::Ack(input) => {
                        assert_eq!(input.events, vec!["event-1", "event-2"]);
                    }
                    _ => panic!("expected notification ack"),
                },
                _ => panic!("expected run notification"),
            },
            _ => panic!("expected run command"),
        }
    }

    #[test]
    fn parses_run_history_permission_and_event_commands() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "run",
            "recent",
            "--workflow",
            "wf-1",
            "--backend",
            "backend-1",
            "--state",
            "running",
            "--limit",
            "5",
        ]);
        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Recent(input) => {
                    assert_eq!(input.workflow.as_deref(), Some("wf-1"));
                    assert_eq!(input.backend.as_deref(), Some("backend-1"));
                    assert_eq!(input.state.as_deref(), Some("running"));
                    assert_eq!(input.limit, Some(5));
                }
                _ => panic!("expected run recent"),
            },
            _ => panic!("expected run command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "run",
            "workflow",
            "recent",
            "--workflow",
            "wf-1",
            "--limit",
            "3",
        ]);
        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Workflow(args) => match args.command {
                    RunWorkflowCommand::Recent(input) => {
                        assert_eq!(input.workflow, "wf-1");
                        assert_eq!(input.limit, Some(3));
                    }
                },
                _ => panic!("expected run workflow"),
            },
            _ => panic!("expected run command"),
        }

        let cli = Cli::parse_from(["zotero-bridge", "run", "permission", "get", "permission-1"]);
        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Permission(args) => match args.command {
                    RunPermissionCommand::Get(input) => {
                        assert_eq!(input.permission_request_id, "permission-1");
                    }
                    _ => panic!("expected permission get"),
                },
                _ => panic!("expected run permission"),
            },
            _ => panic!("expected run command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "run",
            "skill",
            "events",
            "skill-1",
            "--since-updated-at",
            "2026-01-01T00:00:00Z",
            "--limit",
            "10",
        ]);
        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Skill(args) => match args.command {
                    SkillRunCommand::Events(input) => {
                        assert_eq!(input.skill_run_id, "skill-1");
                        assert_eq!(
                            input.since_updated_at.as_deref(),
                            Some("2026-01-01T00:00:00Z")
                        );
                        assert_eq!(input.limit, Some(10));
                    }
                    _ => panic!("expected skill events"),
                },
                _ => panic!("expected run skill"),
            },
            _ => panic!("expected run command"),
        }
    }

    #[test]
    fn parses_skill_run_reply() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "run",
            "skill",
            "reply",
            "skill-run-1",
            "--message",
            "continue",
        ]);

        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Skill(args) => match args.command {
                    SkillRunCommand::Reply(input) => {
                        assert_eq!(input.skill_run_id, "skill-run-1");
                        assert_eq!(input.message, "continue");
                    }
                    _ => panic!("expected skill reply"),
                },
                _ => panic!("expected run skill"),
            },
            _ => panic!("expected run command"),
        }
    }

    #[test]
    fn parses_skill_run_connect() {
        let cli = Cli::parse_from(["zotero-bridge", "run", "skill", "connect", "skill-run-1"]);

        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Skill(args) => match args.command {
                    SkillRunCommand::Connect(input) => {
                        assert_eq!(input.skill_run_id, "skill-run-1");
                    }
                    _ => panic!("expected skill connect"),
                },
                _ => panic!("expected run skill"),
            },
            _ => panic!("expected run command"),
        }
    }

    #[test]
    fn rejects_workflow_agent_run_items_and_none_together() {
        let result = Cli::try_parse_from([
            "zotero-bridge",
            "workflow",
            "agent-run",
            "--workflow",
            "global-workflow",
            "--items",
            "[]",
            "--none",
        ]);

        assert!(result.is_err());
    }

    #[test]
    fn rejects_workflow_agent_run_provider_profile_flag() {
        let result = Cli::try_parse_from([
            "zotero-bridge",
            "workflow",
            "agent-run",
            "--workflow",
            "global-workflow",
            "--none",
            "--provider-profile",
            "{}",
        ]);

        assert!(result.is_err());
    }

    #[test]
    fn workflow_help_lists_agent_run_without_platform_or_provider_flags() {
        let mut command = Cli::command();
        let workflow_help = command
            .find_subcommand_mut("workflow")
            .unwrap()
            .render_help()
            .to_string();

        assert!(workflow_help.contains("agent-run"));
        assert!(!workflow_help.contains("--platform"));
        assert!(!workflow_help.contains("--provider-profile"));
    }

    #[test]
    fn rejects_workflow_submit_items_and_none_together() {
        let result = Cli::try_parse_from([
            "zotero-bridge",
            "workflow",
            "submit",
            "--workflow",
            "global-workflow",
            "--items",
            "[]",
            "--none",
        ]);

        assert!(result.is_err());
    }

    #[test]
    fn rejects_legacy_workflow_submit_input_flag() {
        let result = Cli::try_parse_from([
            "zotero-bridge",
            "workflow",
            "submit",
            "--workflow",
            "global-workflow",
            "--input",
            "{}",
        ]);

        assert!(result.is_err());
    }
}
