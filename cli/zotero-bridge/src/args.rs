use std::path::PathBuf;

use clap::{ArgGroup, Args, Parser, Subcommand};

#[derive(Debug, Clone, Parser)]
#[command(
    name = "zotero-bridge",
    version,
    about = "Agent-first CLI for Zotero library, workflows, and Synthesis",
    long_about = "Access Zotero through the local Zotero Bridge service over HTTP JSON.\n\nOutput contract: stdout contains exactly one final JSON object. Use --help on subcommands for input fields and examples."
)]
pub struct Cli {
    #[arg(
        long,
        global = true,
        env = "ZOTERO_BRIDGE_ENDPOINT",
        help = "Zotero Bridge service endpoint, for example http://127.0.0.1:26570/bridge/v2",
        long_help = "Zotero Bridge service endpoint base URL. If omitted, the CLI reads ZOTERO_BRIDGE_ENDPOINT or a profile file. The CLI does not guess random bridge ports."
    )]
    pub endpoint: Option<String>,

    #[arg(
        long,
        global = true,
        env = "ZOTERO_BRIDGE_PROFILE",
        value_name = "PATH",
        help = "Path to a Zotero Bridge connection-profile JSON file",
        long_help = "Path to a Zotero Bridge connection-profile JSON file. If omitted, the CLI tries the Zotero Agents well-known profile. ACP run profiles usually reference tokenEnv; the local well-known profile may contain a bearer token protected by user-level file permissions."
    )]
    pub profile: Option<PathBuf>,

    #[arg(
        long,
        global = true,
        env = "ZOTERO_BRIDGE_OPERATION_ID",
        value_name = "ID",
        value_parser = parse_operation_id,
        help = "Opaque idempotency id for a state-changing Zotero request"
    )]
    pub operation_id: Option<String>,

    #[arg(
        long,
        global = true,
        help = "Print raw structured-input schemas for one canonical leaf command",
        long_help = "Print the versioned raw JSON Schemas and governed examples for one canonical leaf command. Schema mode is offline and does not load a profile, read Zotero Bridge configuration, or connect to Zotero."
    )]
    pub schema: bool,

    #[command(subcommand)]
    pub command: Command,
}

pub(crate) fn normalize_operation_id(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.encode_utf16().count() > 128 {
        return Err("operation id must contain between 1 and 128 characters".to_string());
    }
    Ok(trimmed.to_string())
}

fn parse_operation_id(value: &str) -> Result<String, String> {
    normalize_operation_id(value)
}

#[derive(Debug, Clone, Subcommand)]
pub enum Command {
    #[command(
        about = "Inspect the offline machine-readable CLI control surface",
        long_about = "Read the embedded Zotero Bridge agent surface without connecting to Zotero."
    )]
    Surface(SurfaceArgs),

    #[command(
        about = "Inspect Zotero Bridge service status and manifest",
        long_about = "Read Zotero Bridge service health and authenticated manifest metadata."
    )]
    Bridge(BridgeArgs),

    #[command(
        about = "Advanced diagnostic raw capability call",
        long_about = "Send a raw capability request to POST /bridge/v2/call. Use this only for raw-only capabilities or diagnostics; semantic command validation is part of the CLI contract and must not be bypassed with raw call."
    )]
    Call(CallArgs),

    #[command(about = "Read Zotero library, item, and note data")]
    Library(LibraryArgs),

    #[command(about = "Read Zotero UI context and navigate to Zotero objects")]
    Context(ContextArgs),

    #[command(about = "Read Synthesis topics, graph, indexes, artifacts, and insights")]
    Synthesis(SynthesisArgs),

    #[command(about = "Preview and execute approval-gated Zotero mutations")]
    Mutation(MutationArgs),

    #[command(about = "List, submit, and inspect Zotero workflow runs")]
    Workflow(WorkflowArgs),

    #[command(about = "Inspect and control workflow runtime state")]
    Run(RunArgs),

    #[command(about = "Download files registered by the Zotero Bridge service")]
    File(FileArgs),

    #[command(about = "List, inspect, download, and remove Dashboard Products")]
    Product(ProductArgs),

    #[command(about = "Debug-only Zotero Bridge service diagnostics and controls")]
    Debug(DebugArgs),

    #[command(about = "Inspect durable Zotero operation receipts")]
    Operation(OperationArgs),
}

#[derive(Debug, Clone, Args)]
pub struct OperationArgs {
    #[command(subcommand)]
    pub command: OperationCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum OperationCommand {
    #[command(about = "Read one durable Zotero operation receipt")]
    Get(OperationGetArgs),
}

#[derive(Debug, Clone, Args)]
pub struct OperationGetArgs {
    #[arg(
        value_parser = parse_operation_id,
        help = "Operation id returned by or supplied to a state-changing command"
    )]
    pub operation_id: String,
}

#[derive(Debug, Clone, Args)]
pub struct SurfaceArgs {
    #[command(subcommand)]
    pub command: SurfaceCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum SurfaceCommand {
    #[command(about = "Print exact CLI build and command-catalog identity")]
    Identity(SurfaceJsonArgs),

    #[command(about = "Describe one canonical command")]
    Describe(SurfaceDescribeArgs),

    #[command(about = "Search canonical commands by task intent")]
    Search(SurfaceSearchArgs),
}

#[derive(Debug, Clone, Args)]
pub struct SurfaceJsonArgs {
    #[arg(long, help = "Emit JSON (the CLI output contract is always JSON)")]
    pub json: bool,
}

#[derive(Debug, Clone, Args)]
pub struct SurfaceDescribeArgs {
    #[arg(required = true, num_args = 1.., help = "Canonical command, for example workflow submit")]
    pub command: Vec<String>,

    #[arg(long, help = "Emit JSON (the CLI output contract is always JSON)")]
    pub json: bool,
}

#[derive(Debug, Clone, Args)]
pub struct SurfaceSearchArgs {
    #[arg(long, required = true, help = "Natural-language task intent")]
    pub intent: String,

    #[arg(
        long,
        default_value_t = 10,
        value_parser = clap::value_parser!(u16).range(1..=20),
        help = "Maximum number of ranked matches (1-20)"
    )]
    pub limit: u16,

    #[arg(
        long,
        help = "Include raw and debug commands in intent recommendations"
    )]
    pub include_debug: bool,

    #[arg(long, help = "Emit JSON (the CLI output contract is always JSON)")]
    pub json: bool,
}

#[derive(Debug, Clone, Args)]
pub struct BridgeArgs {
    #[command(subcommand)]
    pub command: BridgeCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum BridgeCommand {
    #[command(
        about = "Check Zotero Bridge service health without authentication",
        long_about = "Call GET /bridge/v2/health. This command does not require a bearer token and is useful for checking whether the bridge endpoint is reachable."
    )]
    Status,

    #[command(
        about = "Read the authenticated Zotero Bridge service manifest",
        long_about = "Call GET /bridge/v2/manifest. Requires ZOTERO_BRIDGE_TOKEN, a profile token/tokenEnv, or the Zotero Agents well-known profile. The response lists bridge protocol metadata and capability names."
    )]
    Manifest(PageArgs),

    #[command(about = "Inspect or diagnose the active Zotero Bridge connection profile")]
    Profile(BridgeProfileArgs),

    #[command(about = "Inspect configured Zotero backend profiles")]
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
        about = "Inspect the redacted Zotero Bridge connection profile",
        long_about = "Call GET /bridge/v2/diagnostics/profile. The response redacts tokens, local private paths, and backend private payloads."
    )]
    Inspect,

    #[command(
        about = "Diagnose Zotero Bridge connection-profile readiness",
        long_about = "Call GET /bridge/v2/diagnostics/profile/diagnose."
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
        long_about = "Call GET /bridge/v2/diagnostics/backends."
    )]
    List,

    #[command(
        about = "Read one redacted backend profile status",
        long_about = "Call GET /bridge/v2/diagnostics/backends/{backendId}."
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
        long_about = "Call GET /bridge/v2/context/current. This read-only command returns the active Zotero target, ordered library-tree sources, library ids, selection state, current item summary, and current collection when available."
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
        about = "Read one exact page of selected Zotero items",
        long_about = "Call GET /bridge/v2/context/selection. The page defaults to 25 items, accepts at most 100, and uses an opaque cursor bound to the current selection basis."
    )]
    Get(PageArgs),

    #[command(
        about = "Open one or more Zotero items as the active selection",
        long_about = "Call POST /bridge/v2/context/selection/open. Item refs must be Zotero object handles such as item keys, numeric ids, libraryId:itemKey, or JSON objects."
    )]
    Open(ContextSelectionOpenArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ContextSelectionOpenArgs {
    #[arg(required = true, help = "Zotero item refs")]
    pub item_refs: Vec<String>,

    #[command(flatten)]
    pub page: PageArgs,
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
        long_about = "Call POST /bridge/v2/context/items/open. The item ref must be a Zotero object handle, not a path or URI."
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
        long_about = "Call POST /bridge/v2/context/notes/open. The note ref must be a Zotero object handle, not a path or URI."
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
        long_about = "Call POST /bridge/v2/context/collections/open. The collection target is a collection key with optional --library-id."
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
        long_about = "Call Zotero capability library.search_items. --query must be a JSON object with query and optional limit and libraryId."
    )]
    Search(ItemSearchArgs),

    #[command(
        about = "Get detailed metadata for one Zotero item",
        long_about = "Call Zotero capability library.get_item_detail. Provide --key or --id. --library-id disambiguates item keys."
    )]
    Get(ItemRefArgs),

    #[command(
        about = "List child notes for one Zotero item",
        long_about = "Call Zotero capability library.get_item_notes. Provide --key or --id. Use --limit, --cursor, and --max-excerpt-chars for bounded reads."
    )]
    Notes(ItemNotesArgs),

    #[command(
        about = "List child attachments for one Zotero item",
        long_about = "Call Zotero capability library.get_item_attachments. This returns metadata and bridge-issued file handles when available; use file download to fetch registered files."
    )]
    Attachments(ItemPageArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ItemSearchArgs {
    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Bounded search query JSON object with query, limit, and libraryId",
        long_help = "Bounded search query JSON object. Use inline JSON such as '{\"query\":\"graph\",\"limit\":10}', a file path containing JSON, @file syntax, or '-' to read JSON from stdin."
    )]
    pub query: String,
}

#[derive(Debug, Clone, Args)]
#[command(group(
    ArgGroup::new("item_ref")
        .required(true)
        .multiple(false)
        .args(["key", "id"])
))]
pub struct ItemRefArgs {
    #[arg(
        long,
        conflicts_with = "id",
        required_unless_present = "id",
        help = "Zotero item key"
    )]
    pub key: Option<String>,

    #[arg(
        long,
        conflicts_with = "key",
        required_unless_present = "key",
        help = "Zotero item numeric id"
    )]
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
    pub cursor: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct ItemPageArgs {
    #[command(flatten)]
    pub item: ItemRefArgs,

    #[command(flatten)]
    pub page: PageArgs,
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
        long_about = "Call Zotero capability library.get_note_detail. Provide --key or --id. Defaults to text format; use --offset and --max-chars for large notes."
    )]
    Get(NoteDetailArgs),

    #[command(
        about = "List embedded workflow payloads in one Zotero note",
        long_about = "Call Zotero capability library.list_note_payloads. Provide --key or --id."
    )]
    Payloads(ItemPageArgs),

    #[command(
        about = "Read one embedded workflow payload from a Zotero note",
        long_about = "Call Zotero capability library.get_note_payload. Provide --key or --id and --payload-type. Returns one complete bounded payload after checking all candidates for ambiguity."
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
}

#[derive(Debug, Clone, Args)]
pub struct LibraryArgs {
    #[command(subcommand)]
    pub command: LibraryCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum LibraryCommand {
    #[command(about = "Discover Saved Searches by portable identity")]
    SavedSearches(LibrarySavedSearchesArgs),

    #[command(about = "Read compact Zotero library item summaries")]
    Items(LibraryItemsArgs),

    #[command(about = "Read Zotero item data through semantic commands")]
    Item(ItemArgs),

    #[command(about = "Read Zotero note data and embedded note payloads")]
    Note(NoteArgs),

    #[command(about = "Read Zotero reader annotations")]
    Annotation(AnnotationArgs),

    #[command(
        about = "Read a fixed Zotero full-library snapshot page",
        long_about = "Call Zotero capability library.sync_snapshot. The first query requires libraryId and may set batchSize (default 500, maximum 1000). Continue only with the returned snapshotId and cursor under the same libraryId and batchSize. A completed terminal page includes Host-issued completionEvidence; active, interrupted, expired, or restarted sessions do not authorize index replacement. Snapshot and cursor values are opaque process-local state, not change cursors."
    )]
    Snapshot(BridgeQueryArgs),

    #[command(about = "Audit Zotero library PDF, Markdown, and literature-analysis readiness")]
    Readiness(LibraryReadinessArgs),
}

#[derive(Debug, Clone, Args)]
pub struct LibraryItemsArgs {
    #[command(subcommand)]
    pub command: LibraryItemsCommand,
}

#[derive(Debug, Clone, Args)]
pub struct LibrarySavedSearchesArgs {
    #[command(subcommand)]
    pub command: LibrarySavedSearchesCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum LibrarySavedSearchesCommand {
    #[command(about = "List a source-bounded Saved Search page")]
    List(SavedSearchPageArgs),
}

#[derive(Debug, Clone, Args)]
pub struct SavedSearchPageArgs {
    #[arg(long, help = "Library identity; defaults to the user library")]
    pub library_id: Option<u64>,

    #[command(flatten)]
    pub page: PageArgs,
}

#[derive(Debug, Clone, Subcommand)]
pub enum LibraryItemsCommand {
    #[command(
        about = "List compact Zotero library item summaries",
        long_about = "Call Zotero capability library.list_items. Use --query for optional filters: libraryId, cursor, limit, collectionId, collectionKey, tag, itemType, or query."
    )]
    List(BridgeQueryArgs),

    #[command(
        about = "Export one or more papers as a research bundle",
        long_about = "Call Zotero capability items.export_research_bundle. --items accepts a JSON array or JSON file containing {id} or {key,libraryId?} refs. Local profiles require --output-dir and write the bundle directory atomically; remote profiles omit --output-dir and return a downloadable ZIP handle."
    )]
    ExportResearchBundle(DirectPaperResearchBundleArgs),
}

#[derive(Debug, Clone, Args)]
pub struct DirectPaperResearchBundleArgs {
    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "One to 100 Zotero item refs as a JSON array, file path, @file, or '-' for stdin"
    )]
    pub items: String,

    #[arg(
        long,
        value_name = "DIR",
        help = "Absent or empty destination directory for local profiles; omit for remote profiles"
    )]
    pub output_dir: Option<PathBuf>,
}

#[derive(Debug, Clone, Args)]
pub struct LibraryReadinessArgs {
    #[command(subcommand)]
    pub command: LibraryReadinessCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum LibraryReadinessCommand {
    #[command(
        about = "Audit PDF, source Markdown, and literature-analysis artifact readiness",
        long_about = "Call Zotero capability library.readiness_audit. Use --query for optional filters plus checks and missingOnly."
    )]
    Audit(BridgeQueryArgs),

    #[command(
        about = "List Zotero items missing a PDF attachment",
        long_about = "Call Zotero capability library.readiness_audit with checks=[\"pdf\"] and missingOnly=true."
    )]
    MissingPdf(BridgeQueryArgs),

    #[command(
        about = "List Zotero items missing same-stem source Markdown",
        long_about = "Call Zotero capability library.readiness_audit with checks=[\"markdown\"] and missingOnly=true."
    )]
    MissingMarkdown(BridgeQueryArgs),

    #[command(
        about = "List Zotero items missing literature-analysis generated artifacts",
        long_about = "Call Zotero capability library.readiness_audit with checks=[\"analysis\"] and missingOnly=true."
    )]
    MissingAnalysis(BridgeQueryArgs),
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
        long_about = "Call Zotero capability library.list_annotations. Provide --item as a Zotero object ref."
    )]
    List(AnnotationItemArgs),

    #[command(
        about = "Export reader annotations for one Zotero item",
        long_about = "Call Zotero capability library.export_annotations. Format values are markdown or json."
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

    #[command(flatten)]
    pub page: PageArgs,
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

    #[command(name = "insight", about = "Read aggregate Zotero insight queues")]
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
        long_about = "Call GET /bridge/v2/synthesis/index/status."
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
        long_about = "Call GET /bridge/v2/synthesis/cache/status."
    )]
    Status(SynthesisCacheStatusArgs),

    #[command(
        about = "Start a reference-sidecar refresh",
        long_about = "Call Zotero capability reference_sidecar.refresh. Use --input for a library scope or bounded same-library paper_refs scope. This mutation requires its own Zotero-side approval and returns a persistent operation handle; it never updates the citation graph."
    )]
    RefreshReferenceSidecar(BridgeInputArgs),

    #[command(
        about = "Invalidate a constrained Synthesis cache scope",
        long_about = "Call POST /bridge/v2/synthesis/cache/invalidate. Scope must be topic, graph, or index and requires Zotero-side approval."
    )]
    Invalidate(SynthesisCacheInvalidateArgs),
}

#[derive(Debug, Clone, Args)]
pub struct SynthesisCacheStatusArgs {
    #[arg(
        long,
        help = "Persistent maintenance operation id to read; omit for general cache status"
    )]
    pub operation_id: Option<String>,
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
    Get(BridgeQueryArgs),
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
        long_about = "Call Zotero capability topics.list. Use --query with cursor and limit for paged topic inventory reads; omitted query is {}."
    )]
    List(BridgeQueryArgs),

    #[command(
        about = "Find active topic synthesis topics by paper_ref",
        long_about = "Call Zotero capability topics.find_by_paper_ref. Use --query with paper_ref/paperRef or paper_refs/paperRefs."
    )]
    FindByPaperRef(BridgeQueryArgs),

    #[command(
        about = "Read one topic synthesis context",
        long_about = "Call Zotero capability topics.get_context. Use --query for the topic lookup payload. Explicit view values are digest, semantic, audit, and full. Omitting view keeps the flat response. For large semantic or full contexts, pass outputPath/output_path and optional overwrite in --query. Local profiles write the view JSON directly. Remote profiles with connectionMode:\"remote\" return delivery.mode=\"bridge-download\"; run the returned zotero-bridge file download command and then unzip the bundle."
    )]
    GetContext(BridgeQueryArgs),

    #[command(
        about = "Read the library-wide topic planning context",
        long_about = "Call Zotero capability topics.get_planning_context. Use --query with an optional limit. The complete JSON snapshot is returned through delivery.mode=\"bridge-download\" for the existing file download flow."
    )]
    GetPlanningContext(BridgeQueryArgs),

    #[command(
        about = "Read one topic synthesis report markdown body",
        long_about = "Call Zotero capability topics.get_report. The report markdown is read from runtime synthesis_report.body."
    )]
    GetReport(BridgeQueryArgs),

    #[command(
        about = "Read review workflow input from Synthesis",
        long_about = "Call Zotero capability topics.get_review_input."
    )]
    GetReviewInput(BridgeQueryArgs),

    #[command(
        about = "Export one or more Topic research bundles",
        long_about = "Call Zotero capability topics.export_research_bundle. Repeat --topic-id for up to 20 Topics. Local profiles require --output-dir and write the bundle directory atomically; remote profiles omit --output-dir and return a downloadable ZIP handle."
    )]
    ExportResearchBundle(DirectTopicResearchBundleArgs),
}

#[derive(Debug, Clone, Args)]
pub struct DirectTopicResearchBundleArgs {
    #[arg(
        long = "topic-id",
        required = true,
        action = clap::ArgAction::Append,
        help = "Stable Topic id; repeat to aggregate multiple Topics"
    )]
    pub topic_ids: Vec<String>,

    #[arg(
        long,
        value_name = "DIR",
        help = "Absent or empty destination directory for local profiles; omit for remote profiles"
    )]
    pub output_dir: Option<PathBuf>,
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
        long_about = "Call Zotero capability schemas.get."
    )]
    Get(BridgeQueryArgs),
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
        long_about = "Call Zotero capability concepts.query. Use --query with concept_candidate_labels/labels for bounded read-only alias matching."
    )]
    Query(BridgeQueryArgs),
}

#[derive(Debug, Clone, Args)]
pub struct CitationGraphArgs {
    #[command(subcommand)]
    pub command: CitationGraphCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum CitationGraphCommand {
    #[command(
        about = "Read a paged Synthesis citation graph overview",
        long_about = "Call Zotero capability citation_graph.get_overview. The overview returns summary plus paged nodes, edges, hover_only_nodes, and hover_only_edges; use --query with cursor/limit or nodeCursor/edgeCursor/hoverNodeCursor/hoverEdgeCursor."
    )]
    Overview(BridgeQueryArgs),

    #[command(
        about = "Query a topic-scoped citation graph cluster",
        long_about = "Call Zotero capability citation_graph.query_cluster. Use --query with source_paper_refs, max_external_nodes, and cluster_policy."
    )]
    QueryCluster(BridgeQueryArgs),

    #[command(
        about = "Read a Synthesis citation graph slice",
        long_about = "Call Zotero capability citation_graph.get_slice."
    )]
    GetSlice(BridgeQueryArgs),

    #[command(
        about = "Read persisted citation graph layout coordinates",
        long_about = "Call Zotero capability citation_graph.get_layout. Use --query with scope:\"full\" for an explicit full graph layout, or with startNodeId/paperRef/nodeIds/paperRefs for a bounded subgraph layout."
    )]
    GetLayout(BridgeQueryArgs),

    #[command(
        about = "Read citation graph metrics for selected papers",
        long_about = "Call Zotero capability citation_graph.get_metrics. Use --query with cursor, limit, and sortBy for paged metric reads. Complex metrics are maintained automatically after citation graph rebuilds and incremental refreshes; if diagnostics report missing metrics, use synthesis graph refresh-metrics."
    )]
    GetMetrics(BridgeQueryArgs),

    #[command(
        about = "Rank external references from the citation graph",
        long_about = "Call Zotero capability citation_graph.rank_external_references. Use --query with cursor, limit, and sortBy for paged ranked reads."
    )]
    RankExternalReferences(BridgeQueryArgs),

    #[command(
        about = "Rank library papers from citation graph metrics",
        long_about = "Call Zotero capability citation_graph.rank_library_papers. Use --query with cursor, limit, and sortBy for paged ranked reads."
    )]
    RankLibraryPapers(BridgeQueryArgs),

    #[command(
        about = "Refresh persisted citation graph complex metrics",
        long_about = "Call Zotero capability citation_graph.refresh_metrics. This diagnostic repair command requires Zotero-side approval and refreshes persisted complex metrics from the current graph cache without rebuilding graph structure."
    )]
    RefreshMetrics(BridgeInputArgs),

    #[command(
        about = "Start a citation graph update",
        long_about = "Call Zotero capability citation_graph.update. Use --input for a library scope or bounded paper_refs closure and optional expected_reference_basis_hash. This mutation requires a separate Zotero-side approval and returns a persistent operation handle."
    )]
    Update(BridgeInputArgs),
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
        long_about = "Call Zotero capability resolvers.resolve. --query must be a JSON object with direct resolver fields such as {\"tag\":{\"and\":[\"topic:vision\"]},\"paper_refs\":[\"1:ABCD1234\"],\"combine\":\"union\"}. Do not pass a top-level resolver wrapper, topic_resolver, mode, query, include, or exclude."
    )]
    Resolve(BridgeQueryArgs),
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
        long_about = "Call Zotero capability paper_artifacts.get_manifest."
    )]
    Manifest(BridgeQueryArgs),

    #[command(
        about = "Read selected paper artifacts",
        long_about = "Call Zotero capability paper_artifacts.read."
    )]
    Read(BridgeQueryArgs),

    #[command(
        about = "Export bounded paper artifacts into the run workspace",
        long_about = "Call Zotero capability paper_artifacts.export_filtered. Local profiles write runtime/payloads files inside the supplied run_root. Remote profiles with connectionMode:\"remote\" return delivery.mode=\"bridge-download\"; run the returned zotero-bridge file download command and then unzip the bundle before reading manifest_file."
    )]
    ExportFiltered(BridgeQueryArgs),

    #[command(
        about = "Resolve a topic paper digest",
        long_about = "Call Zotero capability paper_artifacts.resolve_topic_digest."
    )]
    ResolveTopicDigest(BridgeQueryArgs),
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
        long_about = "Call Zotero capability insights.get_attention_queue."
    )]
    AttentionQueue(BridgeQueryArgs),
}

#[derive(Debug, Clone, Args)]
pub struct BridgeInputArgs {
    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Zotero capability input as inline JSON, a file path, @file, or '-' for stdin",
        long_help = "Zotero capability input. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Omit for {}."
    )]
    pub input: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct MutationInputArgs {
    #[arg(
        long,
        required = true,
        value_name = "JSON_OR_FILE",
        help = "Canonical mutation input as inline JSON, a file path, @file, or '-' for stdin",
        long_help = "Canonical mutation input is required. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin."
    )]
    pub input: String,
}

#[derive(Debug, Clone, Args)]
pub struct BridgeQueryArgs {
    #[arg(
        long,
        alias = "input",
        value_name = "JSON_OR_FILE",
        help = "Read query as inline JSON, a file path, @file, or '-' for stdin",
        long_help = "Read query. Use inline JSON by default, such as '{\"cursor\":1}'. Use a file path containing JSON, @file syntax, or '-' for stdin only when that input source is intentional. Omit for {}."
    )]
    pub query: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct MutationArgs {
    #[command(subcommand)]
    pub command: MutationCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum MutationCommand {
    #[command(
        about = "Preview a Zotero mutation",
        long_about = "Call Zotero capability mutation.preview. Use --input with the mutation preview payload."
    )]
    Preview(MutationInputArgs),

    #[command(
        about = "Apply a Zotero mutation",
        long_about = "Call Zotero capability mutation.execute. Use --input with the mutation execution payload."
    )]
    Apply(MutationInputArgs),

    #[command(
        name = "get-operation",
        about = "Read canonical mutation evidence",
        long_about = "Call Zotero capability mutation.get_operation. This only observes canonical mutation evidence and never executes or retries a mutation."
    )]
    GetOperation(MutationGetOperationArgs),

    #[command(
        name = "literature-ingest",
        about = "Ingest searched literature into Zotero",
        long_about = "Execute the canonical literature.ingest mutation through Zotero-side approval. Input is a JSON object with one typed paper (itemType, fields, creators, identifiers) and optional collection."
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
pub struct MutationGetOperationArgs {
    #[arg(
        value_parser = parse_operation_id,
        help = "Canonical mutation operation id returned by or supplied to mutation.execute"
    )]
    pub operation_id: String,
}

#[derive(Debug, Clone, Args)]
pub struct LiteratureIngestArgs {
    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Literature ingest payload as inline JSON, a file path, @file, or '-' for stdin",
        long_help = "Literature ingest payload. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin. The payload must be an object with one typed paper (itemType, fields, creators, identifiers) and optional collection."
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
        about = "Attach a file uploaded through Zotero Bridge to a Zotero item"
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

    #[arg(long, help = "Bridge-issued uploaded file id")]
    pub file_id: String,

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
        long_about = "Call GET /bridge/v2/workflows. This read-only command returns workflow ids, labels, providers, and input metadata."
    )]
    List,

    #[command(
        about = "Submit a workflow with explicit JSON input",
        long_about = "Call POST /bridge/v2/workflows/submit. Requires --workflow and either --selection or --none. Use --workflow-options for workflow parameters and --provider-profile for backend/provider runtime options. Workflow submit requires Zotero-side approval unless approvals are globally disabled in Zotero."
    )]
    Submit(WorkflowSubmitArgs),

    #[command(
        about = "Inspect and cancel Zotero-managed workflow queue units",
        long_about = "Use workflow queue list to read pending native queue units and workflow queue cancel to cancel one still-pending unit by opaque queue id."
    )]
    Queue(WorkflowQueueArgs),

    #[command(
        about = "Inspect one active Zotero-managed workflow submission",
        long_about = "Read pending and admitted native queue units for an opaque submission id returned by workflow submit."
    )]
    Submission(WorkflowSubmissionArgs),

    #[command(
        about = "Describe workflow selection and workflow options",
        long_about = "Call POST /bridge/v2/workflows/describe. This read-only command returns workflow-owned selection, option, execution-mode, and provider-requirement facts. Use workflow profile commands for backend-owned provider options."
    )]
    Describe(WorkflowDescribeArgs),

    #[command(
        about = "Validate workflow input without starting execution",
        long_about = "Validate workflow-owned selection and workflow options without resolving a provider profile or starting a task."
    )]
    Validate(WorkflowValidateArgs),

    #[command(
        about = "Read workflow requirements",
        long_about = "Call POST /bridge/v2/workflows/requirements. This returns workflow-owned selection, option, execution-mode, and provider-requirement facts without starting a task."
    )]
    Requirements(WorkflowRequirementsArgs),

    #[command(
        about = "Discover and validate backend-owned provider profiles",
        long_about = "Provider profile commands are backend-scoped and do not accept a workflow id. Workflow submit is the only command that combines a workflow with a provider profile."
    )]
    Profile(WorkflowProfileArgs),

    #[command(
        name = "defaults",
        about = "Show the saved workflow provider profile candidate",
        long_about = "Call POST /bridge/v2/workflows/defaults. This read-only command discloses a Host-saved provider profile candidate; it does not authorize submission."
    )]
    Defaults(WorkflowDefaultsArgs),

    #[command(
        about = "Prepare a self-owned agent workflow handoff bundle",
        long_about = "Call POST /bridge/v2/workflows/agent-run. This read-only command returns a downloadable workflow context bundle for the calling agent. Requires --workflow and either --selection or --none. It does not accept workflow options or provider profiles and does not start a backend task."
    )]
    AgentRun(WorkflowAgentRunArgs),

    #[command(
        about = "Inspect a downloaded self-owned agent handoff bundle locally",
        long_about = "Read a local agent-run handoff directory or ZIP and report its agent run id, request ids, and output contracts. This command does not contact the Zotero Bridge service, consume a handle, or apply a result."
    )]
    AgentBundle(WorkflowAgentBundleArgs),

    #[command(
        about = "Validate a self-owned agent result bundle locally",
        long_about = "Validate a local result directory or ZIP against an output-contract JSON file. This command does not contact the Zotero Bridge service, consume a handle, or apply a result."
    )]
    AgentResult(WorkflowAgentResultArgs),

    #[command(
        about = "Apply finalized self-owned agent workflow result bundles",
        long_about = "Call POST /bridge/v2/workflows/agent-runs/{agentRunId}/apply. Each --result must be AGENT_REQUEST_ID=BUNDLE_PATH. The host recalculates workflow apply readiness and requests Zotero-side approval before applying."
    )]
    AgentApply(WorkflowAgentApplyArgs),

    #[command(
        name = "agent-apply-status",
        about = "Read the auditable apply-back receipt for an agent run"
    )]
    AgentApplyStatus(WorkflowAgentApplyStatusArgs),

    #[command(name = "agent-renew", about = "Renew an unconsumed agent-run lease")]
    AgentRenew(WorkflowAgentRunLifecycleArgs),

    #[command(name = "agent-abandon", about = "Abandon an unconsumed agent run")]
    AgentAbandon(WorkflowAgentRunLifecycleArgs),
}

#[derive(Debug, Clone, Args)]
#[command(group(
    ArgGroup::new("workflow_submit_selection")
        .required(true)
        .multiple(false)
        .args(["selection", "none"])
))]
pub struct WorkflowSubmitArgs {
    #[arg(long, help = "Workflow id to submit")]
    pub workflow: String,

    #[arg(
        long = "selection",
        value_name = "JSON_OR_FILE",
        conflicts_with = "none",
        required_unless_present = "none",
        help = "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    )]
    pub selection: Option<String>,

    #[arg(
        long,
        conflicts_with = "selection",
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

    #[arg(
        long = "input-resource",
        value_name = "SLOT=FILE_ID",
        help = "Bind an uploaded opaque file handle to a workflow input resource slot; repeat for multiple files"
    )]
    pub input_resource: Vec<String>,

    #[arg(
        long = "output-resource",
        value_name = "SLOT=bridge-download",
        help = "Request bridge-download delivery for a workflow output resource slot"
    )]
    pub output_resource: Vec<String>,

    #[arg(
        long,
        help = "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited"
    )]
    pub max_concurrency: Option<u32>,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowQueueArgs {
    #[command(subcommand)]
    pub command: WorkflowQueueCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum WorkflowQueueCommand {
    #[command(
        about = "List pending Zotero-managed workflow queue units",
        long_about = "Call GET /bridge/v2/workflows/queue. Optional backend filters must identify both backend type and backend id."
    )]
    List(WorkflowQueueListArgs),

    #[command(
        about = "Cancel one still-pending Zotero-managed workflow queue unit",
        long_about = "Call POST /bridge/v2/workflows/queue/{queueId}/cancel. Admitted or settled units cannot be canceled through the pending queue."
    )]
    Cancel(WorkflowQueueCancelArgs),
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowQueueListArgs {
    #[arg(long, help = "Filter by backend type: acp or skillrunner")]
    pub backend_type: Option<String>,

    #[arg(long, help = "Filter by backend id")]
    pub backend: Option<String>,

    #[arg(long, help = "Opaque continuation cursor")]
    pub cursor: Option<String>,

    #[arg(long, help = "Maximum number of queue units (1-100)")]
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowQueueCancelArgs {
    #[arg(help = "Opaque queue id returned by workflow queue list")]
    pub queue_id: String,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowSubmissionArgs {
    #[command(subcommand)]
    pub command: WorkflowSubmissionCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum WorkflowSubmissionCommand {
    #[command(
        about = "Read one active Zotero-managed workflow submission",
        long_about = "Call GET /bridge/v2/workflows/submissions/{submissionId}. The active projection contains pending and admitted units only and disappears after settlement."
    )]
    Get(WorkflowSubmissionGetArgs),
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowSubmissionGetArgs {
    #[arg(help = "Opaque submission id returned by workflow submit")]
    pub submission_id: String,

    #[arg(long, help = "Opaque continuation cursor for submission units")]
    pub cursor: Option<String>,

    #[arg(long, help = "Maximum number of submission units (1-100)")]
    pub limit: Option<u32>,
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
}

#[derive(Debug, Clone, Args)]
#[command(group(
    ArgGroup::new("workflow_validate_selection")
        .required(true)
        .multiple(false)
        .args(["selection", "none"])
))]
pub struct WorkflowValidateArgs {
    #[arg(long, help = "Workflow id to validate")]
    pub workflow: String,

    #[arg(
        long = "selection",
        value_name = "JSON_OR_FILE",
        conflicts_with = "none",
        required_unless_present = "none",
        help = "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    )]
    pub selection: Option<String>,

    #[arg(
        long,
        conflicts_with = "selection",
        help = "Validate a no-selection workflow"
    )]
    pub none: bool,

    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Workflow options JSON object, file path, @file, or '-' for stdin"
    )]
    pub workflow_options: Option<String>,

    #[arg(
        long = "input-resource",
        value_name = "SLOT=FILE_ID",
        help = "Validate an uploaded opaque file handle binding; repeat for multiple files"
    )]
    pub input_resource: Vec<String>,

    #[arg(
        long = "output-resource",
        value_name = "SLOT=bridge-download",
        help = "Validate bridge-download delivery for a workflow output resource slot"
    )]
    pub output_resource: Vec<String>,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowProfileArgs {
    #[command(subcommand)]
    pub command: WorkflowProfileCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum WorkflowProfileCommand {
    #[command(about = "List configured backend provider profiles")]
    List,
    #[command(about = "Describe the provider profile contract for one backend")]
    Describe(WorkflowProfileDescribeArgs),
    #[command(about = "Validate and normalize one backend provider profile")]
    Validate(WorkflowProfileValidateArgs),
    #[command(about = "Refresh an ACP backend provider catalog")]
    Refresh(WorkflowProfileRefreshArgs),
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowProfileDescribeArgs {
    #[arg(
        long,
        help = "Configured backend id whose provider profile is described"
    )]
    pub backend: String,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowProfileRefreshArgs {
    #[arg(long, help = "Configured ACP backend id to probe and refresh")]
    pub backend: String,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowDefaultsArgs {
    #[arg(
        long,
        help = "Workflow id whose saved provider profile candidate is disclosed"
    )]
    pub workflow: String,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowProfileValidateArgs {
    #[arg(
        long,
        value_name = "JSON_OR_FILE",
        help = "Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE"
    )]
    pub provider_profile: Option<String>,
}

#[derive(Debug, Clone, Args)]
#[command(group(
    ArgGroup::new("workflow_requirement_id")
        .required(true)
        .multiple(false)
        .args(["workflow", "legacy_workflow"])
))]
pub struct WorkflowRequirementsArgs {
    #[arg(
        long,
        conflicts_with = "legacy_workflow",
        required_unless_present = "legacy_workflow",
        help = "Workflow id"
    )]
    pub workflow: Option<String>,

    #[arg(
        hide = true,
        conflicts_with = "workflow",
        required_unless_present = "workflow"
    )]
    pub legacy_workflow: Option<String>,
}

#[derive(Debug, Clone, Args)]
#[command(group(
    ArgGroup::new("workflow_agent_selection")
        .required(true)
        .multiple(false)
        .args(["selection", "none"])
))]
pub struct WorkflowAgentRunArgs {
    #[arg(long, help = "Workflow id to prepare for self-owned agent execution")]
    pub workflow: String,

    #[arg(
        long = "selection",
        value_name = "JSON_OR_FILE",
        conflicts_with = "none",
        required_unless_present = "none",
        help = "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    )]
    pub selection: Option<String>,

    #[arg(
        long,
        conflicts_with = "selection",
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
pub struct WorkflowAgentBundleArgs {
    #[command(subcommand)]
    pub command: WorkflowAgentBundleCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum WorkflowAgentBundleCommand {
    #[command(about = "Inspect a local agent handoff directory")]
    Inspect(WorkflowAgentBundleInspectArgs),
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowAgentBundleInspectArgs {
    #[arg(
        long,
        value_name = "DIR_OR_ZIP",
        help = "Agent handoff directory or ZIP"
    )]
    pub bundle: PathBuf,

    #[command(flatten)]
    pub page: PageArgs,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowAgentResultArgs {
    #[command(subcommand)]
    pub command: WorkflowAgentResultCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum WorkflowAgentResultCommand {
    #[command(about = "Validate a local agent result directory against an output contract")]
    Validate(WorkflowAgentResultValidateArgs),
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowAgentResultValidateArgs {
    #[arg(
        long,
        value_name = "FILE",
        help = "Authoritative output-contract JSON file"
    )]
    pub contract: PathBuf,

    #[arg(
        long,
        value_name = "DIR_OR_ZIP",
        help = "Agent result directory or ZIP"
    )]
    pub result: PathBuf,
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
pub struct WorkflowAgentApplyStatusArgs {
    #[arg(help = "Agent run id returned by workflow agent-run")]
    pub agent_run_id: String,

    #[command(flatten)]
    pub page: PageArgs,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowAgentRunLifecycleArgs {
    #[arg(help = "Agent run id returned by workflow agent-run")]
    pub agent_run_id: String,
}

#[derive(Debug, Clone, Args)]
pub struct WorkflowRunArgs {
    #[arg(help = "Workflow run id")]
    pub run_id: String,

    #[command(flatten)]
    pub page: PageArgs,
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
        long_about = "Call GET /bridge/v2/workflows/runs/{workflowRunId}. This read-only command returns workflow-level state and known skill run projections."
    )]
    Get(WorkflowRunArgs),

    #[command(
        about = "Request cancellation of a workflow run",
        long_about = "Call POST /bridge/v2/workflows/runs/{workflowRunId}/cancel. Cancellation is an intent and does not guarantee immediate terminal status."
    )]
    Cancel(WorkflowCancelArgs),

    #[command(
        about = "List active and recent workflow runtime tasks",
        long_about = "Call GET /bridge/v2/tasks. Optional filters: --workflow, --backend, --backend-type, --request, --run, --state, and --active-only."
    )]
    List(TaskListArgs),

    #[command(
        about = "List lightweight active workflow runtime tasks",
        long_about = "Call GET /bridge/v2/tasks/active. This returns running, waiting, and failed-retriable task handles without transcripts or local paths."
    )]
    Active(PageArgs),

    #[command(
        about = "List lightweight recent workflow runtime tasks",
        long_about = "Call GET /bridge/v2/tasks/recent. This returns recent task metadata without transcripts or local paths."
    )]
    Recent(TaskRecentArgs),

    #[command(about = "Inspect workflow-run history")]
    Workflow(RunWorkflowArgs),

    #[command(about = "Inspect and interact with concrete workflow skill runs")]
    Skill(RunSkillArgs),

    #[command(about = "Read and acknowledge lightweight workflow notifications")]
    Notification(RunNotificationArgs),

    #[command(about = "Read Zotero-side permission requests")]
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
        long_about = "Call GET /bridge/v2/workflows/runs filtered by workflow id."
    )]
    Recent(RunWorkflowRecentArgs),
}

#[derive(Debug, Clone, Args)]
pub struct RunWorkflowRecentArgs {
    #[arg(long, help = "Workflow id")]
    pub workflow: String,

    #[arg(long, help = "Maximum number of runs")]
    pub limit: Option<u32>,

    #[arg(long, help = "Opaque continuation cursor")]
    pub cursor: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct RunPermissionArgs {
    #[command(subcommand)]
    pub command: RunPermissionCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum RunPermissionCommand {
    #[command(
        about = "List pending Zotero-side permission requests",
        long_about = "Call GET /bridge/v2/permissions/pending. This is read-only and cannot approve or reject."
    )]
    Pending(PageArgs),

    #[command(
        about = "Read one Zotero-side permission request",
        long_about = "Call GET /bridge/v2/permissions/{permissionRequestId}. This is read-only."
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

    #[arg(long, help = "Opaque continuation cursor")]
    pub cursor: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct PageArgs {
    #[arg(long, help = "Opaque continuation cursor")]
    pub cursor: Option<String>,

    #[arg(long, help = "Maximum number of entries (1-100)")]
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
        long_about = "Call GET /bridge/v2/notifications. This returns lightweight lifecycle events without transcripts or provider private payloads."
    )]
    List(NotificationListArgs),

    #[command(
        about = "Poll until a workflow notification is available",
        long_about = "Poll GET /bridge/v2/notifications until at least one event matches the filters or the timeout expires."
    )]
    Wait(NotificationWaitArgs),

    #[command(
        about = "Acknowledge workflow notification inbox events",
        long_about = "Call POST /bridge/v2/notifications/ack with one or more event ids."
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

    #[arg(long, help = "Best-effort Zotero notification client id")]
    pub client_id: Option<String>,

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

    #[arg(long, help = "Best-effort Zotero notification client id")]
    pub client_id: Option<String>,

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

    #[arg(long, help = "Best-effort Zotero notification client id")]
    pub client_id: Option<String>,
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

    #[arg(long, help = "Filter by native workflow submission id")]
    pub submission: Option<String>,

    #[arg(long, help = "Filter by workflow run id")]
    pub run: Option<String>,

    #[arg(long, help = "Filter by task state")]
    pub state: Option<String>,

    #[arg(long, help = "Only return active task runtime rows")]
    pub active_only: bool,

    #[arg(long, help = "Opaque continuation cursor")]
    pub cursor: Option<String>,

    #[arg(long, help = "Maximum number of tasks (1-100)")]
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Subcommand)]
pub enum SkillRunCommand {
    #[command(
        about = "Read one concrete skill run",
        long_about = "Call GET /bridge/v2/skill-runs/{skillRunId}. The skill run id is opaque and should be copied from workflow run status or task active output."
    )]
    Get(SkillRunIdArgs),

    #[command(
        about = "Reply to a waiting ACP skill run",
        long_about = "Call POST /bridge/v2/skill-runs/{skillRunId}/reply with a message."
    )]
    Reply(SkillRunReplyArgs),

    #[command(
        about = "Connect a recoverable ACP skill run",
        long_about = "Call POST /bridge/v2/skill-runs/{skillRunId}/connect. This reconnects only and does not send a continuation message."
    )]
    Connect(SkillRunIdArgs),

    #[command(
        about = "List recent concrete skill runs",
        long_about = "Call GET /bridge/v2/skill-runs/recent."
    )]
    Recent(SkillRunRecentArgs),

    #[command(
        about = "List lightweight lifecycle events for one skill run",
        long_about = "Call GET /bridge/v2/skill-runs/{skillRunId}/events. This returns progress facts, not transcripts."
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

    #[arg(long, help = "Opaque continuation cursor")]
    pub cursor: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct SkillRunEventsArgs {
    #[arg(help = "Opaque skill run id")]
    pub skill_run_id: String,

    #[arg(long, help = "Return events after this updatedAt timestamp")]
    pub since_updated_at: Option<String>,

    #[arg(long, help = "Maximum number of events")]
    pub limit: Option<u32>,

    #[arg(long, help = "Opaque continuation cursor")]
    pub cursor: Option<String>,
}

#[derive(Debug, Clone, Args)]
pub struct FileArgs {
    #[command(subcommand)]
    pub command: FileCommand,
}

#[derive(Debug, Clone, Args)]
pub struct ProductArgs {
    #[command(subcommand)]
    pub command: ProductCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum ProductCommand {
    #[command(about = "List normal Dashboard Products")]
    List(ProductListArgs),
    #[command(about = "Read one normal Dashboard Product")]
    Get(ProductGetArgs),
    #[command(about = "Download one or all Dashboard Product assets")]
    Download(ProductDownloadArgs),
    #[command(about = "Remove one Dashboard Product record through Zotero approval")]
    Remove(ProductIdArgs),
}

#[derive(Debug, Clone, Args)]
pub struct ProductIdArgs {
    #[arg(help = "Dashboard Product id")]
    pub product_id: String,
}

#[derive(Debug, Clone, Args)]
pub struct ProductGetArgs {
    #[arg(help = "Dashboard Product id")]
    pub product_id: String,

    #[command(flatten)]
    pub page: PageArgs,
}

#[derive(Debug, Clone, Args)]
pub struct ProductListArgs {
    #[arg(long)]
    pub workflow_id: Option<String>,
    #[arg(long)]
    pub backend_id: Option<String>,
    #[arg(long)]
    pub request_id: Option<String>,
    #[arg(long)]
    pub cursor: Option<String>,
    #[arg(long)]
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Args)]
pub struct ProductDownloadArgs {
    #[arg(help = "Dashboard Product id")]
    pub product_id: String,
    #[arg(long, help = "Optional asset id; omit to download all assets")]
    pub asset: Option<String>,
    #[arg(
        long = "output-dir",
        alias = "output",
        value_name = "DIR",
        help = "Destination directory"
    )]
    pub output_dir: PathBuf,
    #[arg(long, help = "Allow existing output files to be replaced")]
    pub force: bool,
}

#[derive(Debug, Clone, Args)]
pub struct DebugArgs {
    #[command(subcommand)]
    pub command: DebugCommand,
}

#[derive(Debug, Clone, Subcommand)]
pub enum DebugCommand {
    #[command(about = "Read debug-only Zotero Bridge service runtime status")]
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
        long_about = "Call Zotero capability debug.acpSkillRun.reapplyResult. Use --input with {\"requestId\":\"...\"}; add resultJsonOverride and overrideMode when the stored result must be corrected before apply."
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
        long_about = "Call GET /bridge/v2/files/{fileId}. This command accepts only broker-issued opaque file ids, never local filesystem paths. It fails if --output already exists unless --force is set."
    )]
    Download(FileDownloadArgs),

    #[command(
        about = "Upload one local file through Zotero Bridge and return a short-lived file handle",
        long_about = "Call POST /bridge/v2/files/upload. The local source path is used only by the CLI; the Zotero Bridge service returns an opaque file handle for later attach-file mutation."
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

    #[arg(long, help = "Display name stored in the Zotero-side file descriptor")]
    pub display_name: Option<String>,

    #[arg(long, help = "Content type for the uploaded file")]
    pub content_type: Option<String>,
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use clap::{CommandFactory, Parser};

    use super::{
        AnnotationCommand, BridgeBackendCommand, BridgeCommand, BridgeProfileCommand,
        CitationGraphCommand, Cli, Command, ContextCollectionCommand, ContextCommand,
        ContextItemCommand, ContextNoteCommand, ContextSelectionCommand, FileCommand, ItemCommand,
        LibraryCommand, LibraryItemsCommand, LibraryReadinessCommand, MutationCollectionCommand,
        MutationCommand, MutationItemCommand, MutationNoteCommand, MutationTagCommand,
        NotificationCommand, PageArgs, ProductCommand, RunArgs, RunCommand, RunPermissionCommand,
        RunWorkflowCommand, SkillRunCommand, SurfaceCommand, SynthesisCacheCommand,
        SynthesisCommand, SynthesisIndexCommand, TopicsCommand, WorkflowAgentBundleCommand,
        WorkflowAgentResultCommand, WorkflowCommand, WorkflowProfileCommand, WorkflowQueueCommand,
        WorkflowSubmissionCommand,
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
    fn parses_bounded_surface_search_with_debug_opt_in() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "surface",
            "search",
            "--intent",
            "diagnostic snapshot",
            "--limit",
            "20",
            "--include-debug",
            "--json",
        ]);
        match cli.command {
            Command::Surface(args) => match args.command {
                SurfaceCommand::Search(search) => {
                    assert_eq!(search.intent, "diagnostic snapshot");
                    assert_eq!(search.limit, 20);
                    assert!(search.include_debug);
                    assert!(search.json);
                }
                _ => panic!("expected surface search"),
            },
            _ => panic!("expected surface command"),
        }
    }

    #[test]
    fn legacy_task_and_skill_run_top_level_commands_are_not_supported() {
        for argv in [
            ["zotero-bridge", "task", "active"],
            ["zotero-bridge", "skill-run", "get"],
        ] {
            assert!(
                Cli::try_parse_from(argv).is_err(),
                "legacy top-level command parsed unexpectedly: {:?}",
                argv
            );
        }

        assert!(matches!(
            Cli::parse_from(["zotero-bridge", "run", "active"]).command,
            Command::Run(RunArgs {
                command: RunCommand::Active(PageArgs {
                    cursor: None,
                    limit: None,
                })
            })
        ));
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
                "get-planning-context",
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
    fn parses_topic_planning_context_query() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "synthesis",
            "topic",
            "get-planning-context",
            "--query",
            r#"{"limit":400}"#,
        ]);
        match cli.command {
            Command::Synthesis(args) => match args.command {
                SynthesisCommand::Topic(args) => match args.command {
                    TopicsCommand::GetPlanningContext(input) => {
                        assert_eq!(input.query.as_deref(), Some(r#"{"limit":400}"#));
                    }
                    _ => panic!("expected topic planning context"),
                },
                _ => panic!("expected synthesis topic"),
            },
            _ => panic!("expected synthesis command"),
        }
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
    fn parses_canonical_mutation_observation() {
        let cli = Cli::parse_from(["zotero-bridge", "mutation", "get-operation", "mutation-1"]);

        match cli.command {
            Command::Mutation(args) => match args.command {
                MutationCommand::GetOperation(args) => {
                    assert_eq!(args.operation_id, "mutation-1");
                }
                _ => panic!("expected mutation get-operation"),
            },
            _ => panic!("expected mutation command"),
        }
    }

    #[test]
    fn normalizes_operation_ids_like_the_mutation_authority() {
        assert_eq!(
            super::normalize_operation_id("  操作-1  "),
            Ok("操作-1".to_string())
        );
        assert!(super::normalize_operation_id(&"a".repeat(129)).is_err());
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
            "--file-id",
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
                        assert_eq!(input.file_id, "file-1");
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
    fn parses_synthesis_topic_subcommand_with_json_query() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "synthesis",
            "topic",
            "list",
            "--query",
            "{}",
        ]);

        match cli.command {
            Command::Synthesis(args) => match args.command {
                SynthesisCommand::Topic(args) => match args.command {
                    TopicsCommand::List(input) => {
                        assert_eq!(input.query.as_deref(), Some("{}"));
                    }
                    _ => panic!("expected topic list"),
                },
                _ => panic!("expected synthesis topic"),
            },
            _ => panic!("expected synthesis command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "synthesis",
            "graph",
            "update",
            "--input",
            r#"{"scope":"papers","paper_refs":["1:ABCD1234"]}"#,
        ]);
        match cli.command {
            Command::Synthesis(args) => match args.command {
                SynthesisCommand::Graph(args) => match args.command {
                    CitationGraphCommand::Update(input) => assert!(input
                        .input
                        .as_deref()
                        .is_some_and(|value| value.contains("paper_refs"))),
                    _ => panic!("expected citation graph update"),
                },
                _ => panic!("expected synthesis graph"),
            },
            _ => panic!("expected synthesis command"),
        }
    }

    #[test]
    fn accepts_hidden_input_alias_for_read_queries() {
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
                    TopicsCommand::List(input) => assert_eq!(input.query.as_deref(), Some("{}")),
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
                    SynthesisCacheCommand::Status(input) => {
                        assert!(input.operation_id.is_none());
                    }
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
            "refresh-reference-sidecar",
            "--input",
            r#"{"scope":"library"}"#,
        ]);
        match cli.command {
            Command::Synthesis(args) => match args.command {
                SynthesisCommand::Cache(args) => match args.command {
                    SynthesisCacheCommand::RefreshReferenceSidecar(input) => {
                        assert_eq!(input.input.as_deref(), Some(r#"{"scope":"library"}"#));
                    }
                    _ => panic!("expected reference sidecar refresh"),
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
    fn parses_library_items_list_with_json_query() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "library",
            "items",
            "list",
            "--query",
            "{\"limit\":50}",
        ]);

        match cli.command {
            Command::Library(args) => match args.command {
                LibraryCommand::Items(args) => match args.command {
                    LibraryItemsCommand::List(input) => {
                        assert_eq!(input.query.as_deref(), Some("{\"limit\":50}"));
                    }
                    _ => panic!("expected library items list"),
                },
                _ => panic!("expected library items"),
            },
            _ => panic!("expected library command"),
        }
    }

    #[test]
    fn parses_library_item_search_with_json_query() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "library",
            "item",
            "search",
            "--query",
            "{\"text\":\"graph\",\"limit\":5}",
        ]);

        match cli.command {
            Command::Library(args) => match args.command {
                LibraryCommand::Item(args) => match args.command {
                    ItemCommand::Search(input) => {
                        assert_eq!(input.query, "{\"text\":\"graph\",\"limit\":5}")
                    }
                    _ => panic!("expected item search"),
                },
                _ => panic!("expected library item command"),
            },
            _ => panic!("expected library command"),
        }
    }

    #[test]
    fn parses_library_snapshot_with_json_query() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "library",
            "snapshot",
            "--query",
            "{\"libraryId\":1,\"batchSize\":500,\"snapshotId\":\"opaque-snapshot\",\"cursor\":\"opaque-cursor\"}",
        ]);

        match cli.command {
            Command::Library(args) => match args.command {
                LibraryCommand::Snapshot(input) => {
                    assert_eq!(
                        input.query.as_deref(),
                        Some("{\"libraryId\":1,\"batchSize\":500,\"snapshotId\":\"opaque-snapshot\",\"cursor\":\"opaque-cursor\"}")
                    );
                }
                _ => panic!("expected library snapshot"),
            },
            _ => panic!("expected library command"),
        }
    }

    #[test]
    fn parses_library_readiness_commands_with_json_query() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "library",
            "readiness",
            "audit",
            "--query",
            "{\"limit\":50,\"checks\":[\"pdf\",\"analysis\"]}",
        ]);
        match cli.command {
            Command::Library(args) => match args.command {
                LibraryCommand::Readiness(args) => match args.command {
                    LibraryReadinessCommand::Audit(input) => {
                        assert_eq!(
                            input.query.as_deref(),
                            Some("{\"limit\":50,\"checks\":[\"pdf\",\"analysis\"]}")
                        );
                    }
                    _ => panic!("expected readiness audit"),
                },
                _ => panic!("expected library readiness"),
            },
            _ => panic!("expected library command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "library",
            "readiness",
            "missing-analysis",
            "--query",
            "{\"collectionKey\":\"COLL\"}",
        ]);
        match cli.command {
            Command::Library(args) => match args.command {
                LibraryCommand::Readiness(args) => match args.command {
                    LibraryReadinessCommand::MissingAnalysis(input) => {
                        assert_eq!(input.query.as_deref(), Some("{\"collectionKey\":\"COLL\"}"));
                    }
                    _ => panic!("expected readiness missing-analysis"),
                },
                _ => panic!("expected library readiness"),
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
    fn parses_workflow_describe_with_workflow_options_only() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "describe",
            "--workflow",
            "literature-analysis",
            "--workflow-options",
            "{\"language\":\"zh-CN\"}",
        ]);

        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Describe(input) => {
                    assert_eq!(input.workflow, "literature-analysis");
                    assert_eq!(
                        input.workflow_options.as_deref(),
                        Some("{\"language\":\"zh-CN\"}")
                    );
                }
                _ => panic!("expected workflow describe"),
            },
            _ => panic!("expected workflow command"),
        }
    }

    #[test]
    fn parses_backend_scoped_workflow_profile_commands() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "profile",
            "describe",
            "--backend",
            "acp-opencode",
        ]);
        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Profile(args) => match args.command {
                    WorkflowProfileCommand::Describe(input) => {
                        assert_eq!(input.backend, "acp-opencode");
                    }
                    _ => panic!("expected workflow profile describe"),
                },
                _ => panic!("expected workflow profile"),
            },
            _ => panic!("expected workflow command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "profile",
            "validate",
            "--provider-profile",
            "{\"backendId\":\"acp-opencode\"}",
        ]);
        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Profile(args) => match args.command {
                    WorkflowProfileCommand::Validate(input) => assert_eq!(
                        input.provider_profile.as_deref(),
                        Some("{\"backendId\":\"acp-opencode\"}")
                    ),
                    _ => panic!("expected workflow profile validate"),
                },
                _ => panic!("expected workflow profile"),
            },
            _ => panic!("expected workflow command"),
        }
    }

    #[test]
    fn parses_workflow_defaults_and_profile_refresh_commands() {
        let defaults = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "defaults",
            "--workflow",
            "literature-analysis",
        ]);
        match defaults.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Defaults(input) => {
                    assert_eq!(input.workflow, "literature-analysis");
                }
                _ => panic!("expected workflow defaults"),
            },
            _ => panic!("expected workflow command"),
        }

        let refresh = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "profile",
            "refresh",
            "--backend",
            "acp-opencode",
        ]);
        match refresh.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Profile(args) => match args.command {
                    WorkflowProfileCommand::Refresh(input) => {
                        assert_eq!(input.backend, "acp-opencode");
                    }
                    _ => panic!("expected workflow profile refresh"),
                },
                _ => panic!("expected workflow profile"),
            },
            _ => panic!("expected workflow command"),
        }
    }

    #[test]
    fn workflow_describe_rejects_provider_profile_flag() {
        let result = Cli::try_parse_from([
            "zotero-bridge",
            "workflow",
            "describe",
            "--workflow",
            "literature-analysis",
            "--provider-profile",
            "{}",
        ]);
        assert!(result.is_err());
    }

    #[test]
    fn parses_workflow_submit_with_selection() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "submit",
            "--workflow",
            "literature-analysis",
            "--selection",
            "[{\"key\":\"ABC\",\"libraryId\":1}]",
            "--input-resource",
            "source=file-upload-1",
            "--input-resource",
            "source=file-upload-2",
            "--output-resource",
            "result=bridge-download",
            "--max-concurrency",
            "2",
        ]);

        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Submit(input) => {
                    assert_eq!(input.workflow, "literature-analysis");
                    assert_eq!(
                        input.selection.as_deref(),
                        Some("[{\"key\":\"ABC\",\"libraryId\":1}]")
                    );
                    assert!(!input.none);
                    assert_eq!(
                        input.input_resource,
                        vec![
                            "source=file-upload-1".to_string(),
                            "source=file-upload-2".to_string(),
                        ]
                    );
                    assert_eq!(
                        input.output_resource,
                        vec!["result=bridge-download".to_string(),]
                    );
                    assert_eq!(input.max_concurrency, Some(2));
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
                    assert!(input.selection.is_none());
                }
                _ => panic!("expected workflow submit"),
            },
            _ => panic!("expected workflow command"),
        }
    }

    #[test]
    fn parses_workflow_native_queue_and_submission_commands() {
        let queued = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "queue",
            "list",
            "--backend-type",
            "skillrunner",
            "--backend",
            "backend-a",
        ]);
        match queued.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Queue(args) => match args.command {
                    WorkflowQueueCommand::List(input) => {
                        assert_eq!(input.backend_type.as_deref(), Some("skillrunner"));
                        assert_eq!(input.backend.as_deref(), Some("backend-a"));
                    }
                    _ => panic!("expected workflow queue list"),
                },
                _ => panic!("expected workflow queue"),
            },
            _ => panic!("expected workflow command"),
        }

        let submission = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "submission",
            "get",
            "workflow-submission-1",
        ]);
        match submission.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Submission(args) => match args.command {
                    WorkflowSubmissionCommand::Get(input) => {
                        assert_eq!(input.submission_id, "workflow-submission-1");
                    }
                },
                _ => panic!("expected workflow submission"),
            },
            _ => panic!("expected workflow command"),
        }

        let canceled = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "queue",
            "cancel",
            "workflow-queue-1",
        ]);
        match canceled.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Queue(args) => match args.command {
                    WorkflowQueueCommand::Cancel(input) => {
                        assert_eq!(input.queue_id, "workflow-queue-1");
                    }
                    _ => panic!("expected workflow queue cancel"),
                },
                _ => panic!("expected workflow queue"),
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
            "--input-resource",
            "notes=file-notes-1",
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
                    assert_eq!(input.input_resource, vec!["notes=file-notes-1"]);
                }
                _ => panic!("expected workflow validate"),
            },
            _ => panic!("expected workflow command"),
        }

        let cli = Cli::parse_from([
            "zotero-bridge",
            "workflow",
            "requirements",
            "--workflow",
            "literature-analysis",
        ]);
        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::Requirements(input) => {
                    assert_eq!(input.workflow.as_deref(), Some("literature-analysis"));
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
            "--selection",
            "[{\"key\":\"ABC\",\"libraryId\":1}]",
            "--output-dir",
            "handoff",
        ]);

        match cli.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::AgentRun(input) => {
                    assert_eq!(input.workflow, "literature-analysis");
                    assert_eq!(
                        input.selection.as_deref(),
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
    fn parses_local_agent_bundle_and_result_commands() {
        let inspect = Cli::try_parse_from([
            "zotero-bridge",
            "workflow",
            "agent-bundle",
            "inspect",
            "--bundle",
            "./handoff",
        ])
        .unwrap();
        match inspect.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::AgentBundle(args) => match args.command {
                    WorkflowAgentBundleCommand::Inspect(input) => {
                        assert_eq!(input.bundle, PathBuf::from("./handoff"));
                    }
                },
                _ => panic!("expected workflow agent-bundle inspect"),
            },
            _ => panic!("expected workflow command"),
        }

        let validate = Cli::try_parse_from([
            "zotero-bridge",
            "workflow",
            "agent-result",
            "validate",
            "--contract",
            "./contract.json",
            "--result",
            "./result",
        ])
        .unwrap();
        match validate.command {
            Command::Workflow(args) => match args.command {
                WorkflowCommand::AgentResult(args) => match args.command {
                    WorkflowAgentResultCommand::Validate(input) => {
                        assert_eq!(input.contract, PathBuf::from("./contract.json"));
                        assert_eq!(input.result, PathBuf::from("./result"));
                    }
                },
                _ => panic!("expected workflow agent-result validate"),
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
                RunCommand::Active(args) => {
                    assert!(args.cursor.is_none());
                    assert!(args.limit.is_none());
                }
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
            "--client-id",
            "agent-a",
            "--acknowledged",
            "false",
        ]);

        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Notification(args) => match args.command {
                    NotificationCommand::List(input) => {
                        assert_eq!(input.workflow_run_id.as_deref(), Some("run-1"));
                        assert_eq!(input.event_type.as_deref(), Some("workflow.run.completed"));
                        assert_eq!(input.client_id.as_deref(), Some("agent-a"));
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
            "--client-id",
            "agent-a",
        ]);
        match cli.command {
            Command::Run(args) => match args.command {
                RunCommand::Notification(args) => match args.command {
                    NotificationCommand::Ack(input) => {
                        assert_eq!(input.events, vec!["event-1", "event-2"]);
                        assert_eq!(input.client_id.as_deref(), Some("agent-a"));
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
    fn rejects_duplicate_or_conflicting_canonical_argument_forms() {
        assert!(Cli::try_parse_from([
            "zotero-bridge",
            "library",
            "items",
            "list",
            "--query",
            "{}",
            "--input",
            "{}",
        ])
        .is_err());
        assert!(Cli::try_parse_from([
            "zotero-bridge",
            "workflow",
            "submit",
            "--workflow",
            "global-workflow",
            "--selection",
            "[]",
            "--items",
            "[]",
        ])
        .is_err());
        assert!(Cli::try_parse_from([
            "zotero-bridge",
            "workflow",
            "requirements",
            "--workflow",
            "global-workflow",
            "global-workflow",
        ])
        .is_err());
    }

    #[test]
    fn hides_compatibility_aliases_from_primary_help() {
        let mut command = Cli::command();
        let list_help = command
            .find_subcommand_mut("library")
            .unwrap()
            .find_subcommand_mut("items")
            .unwrap()
            .find_subcommand_mut("list")
            .unwrap()
            .render_help()
            .to_string();
        assert!(list_help.contains("--query"));
        assert!(!list_help.contains("--input"));

        let mut command = Cli::command();
        let product_help = command
            .find_subcommand_mut("product")
            .unwrap()
            .find_subcommand_mut("download")
            .unwrap()
            .render_help()
            .to_string();
        assert!(product_help.contains("--output-dir"));
        assert!(!product_help.contains("--output <"));
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

    #[test]
    fn parses_product_download_with_filters_and_force() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "product",
            "download",
            "product-1",
            "--asset",
            "draft",
            "--output-dir",
            "out",
            "--force",
        ]);
        match cli.command {
            Command::Product(args) => match args.command {
                ProductCommand::Download(args) => {
                    assert_eq!(args.product_id, "product-1");
                    assert_eq!(args.asset.as_deref(), Some("draft"));
                    assert_eq!(args.output_dir, PathBuf::from("out"));
                    assert!(args.force);
                }
                _ => panic!("expected product download"),
            },
            _ => panic!("expected product command"),
        }
    }

    #[test]
    fn parses_direct_paper_research_bundle_export() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "library",
            "items",
            "export-research-bundle",
            "--items",
            "[{\"key\":\"ABC\",\"libraryId\":1}]",
            "--output-dir",
            "paper-bundle",
        ]);
        match cli.command {
            Command::Library(args) => match args.command {
                LibraryCommand::Items(args) => match args.command {
                    LibraryItemsCommand::ExportResearchBundle(args) => {
                        assert_eq!(args.items, "[{\"key\":\"ABC\",\"libraryId\":1}]");
                        assert_eq!(args.output_dir, Some(PathBuf::from("paper-bundle")));
                    }
                    _ => panic!("expected paper research bundle export"),
                },
                _ => panic!("expected library items"),
            },
            _ => panic!("expected library command"),
        }
    }

    #[test]
    fn parses_direct_topic_research_bundle_export() {
        let cli = Cli::parse_from([
            "zotero-bridge",
            "synthesis",
            "topic",
            "export-research-bundle",
            "--topic-id",
            "topic-one",
            "--topic-id",
            "topic-two",
        ]);
        match cli.command {
            Command::Synthesis(args) => match args.command {
                SynthesisCommand::Topic(args) => match args.command {
                    TopicsCommand::ExportResearchBundle(args) => {
                        assert_eq!(args.topic_ids, vec!["topic-one", "topic-two"]);
                        assert_eq!(args.output_dir, None);
                    }
                    _ => panic!("expected Topic research bundle export"),
                },
                _ => panic!("expected synthesis Topic command"),
            },
            _ => panic!("expected synthesis command"),
        }
    }
}
