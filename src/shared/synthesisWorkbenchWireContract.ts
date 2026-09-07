/**
 * Synthesis Workbench wire contract — single source of truth for the
 * postMessage envelopes exchanged between the synthesis workbench page and
 * the Zotero host (src/modules/synthesisWorkbenchTab.ts), plus the
 * standalone export envelopes the host injects as window globals.
 *
 * Imported both by the host-side modules (src/modules/**) and by the
 * synthesis workbench page bundle (src/synthesis/**). This file must stay
 * free of imports from src/modules/** so the page bundle never pulls in
 * privileged code. Type-only imports from packages/synthesis-contracts and
 * src/synthesisWorkbenchI18n.ts keep this file runtime-free.
 *
 * Boundary rule: every type here is a pure JSON-serializable wire shape.
 * Snapshot views use the concrete SynthesisWorkbenchSnapshotHostTypes map
 * below. The map is defined here so the host and page share one portable
 * contract without importing privileged host modules into the page bundle.
 * Scalar/filter vocabulary the page renders directly (tabs, surfaces, filter
 * enums, action operations, background jobs, graph window metadata) is also
 * declared here as wire types.
 */

import type {
  SynthesisHostItemRef,
  SynthesisTagValidationWarning,
  SynthesisWorkbenchPaperDigestResult,
  SynthesisWorkbenchSidecarStatus,
  SynthesisWorkbenchSurfaceName,
  SynthesisWorkbenchTopicArtifactRow,
  SynthesisWorkbenchTopicDetailResult,
  SynthesisWorkbenchTopicFreshness,
  SynthesisWorkbenchTopicSourceMaterialsStatus,
  SynthesisWorkbenchTopicUpdateIntent,
} from "../../packages/synthesis-contracts/src/index";
import type { SynthesisCitationGraphWindowStatus } from "./synthesisCitationGraphWindow";
import type {
  SynthesisWorkbenchI18nEnvelope,
  SynthesisWorkbenchMessageKey,
} from "../synthesisWorkbenchI18n";

// The i18n contract is owned by src/synthesisWorkbenchI18n.ts (shared by the
// host and the legacy page, DOM-free); the wire contract re-exports the
// type-level surface so page bundles can source everything from src/shared.
export type { SynthesisWorkbenchI18nEnvelope, SynthesisWorkbenchMessageKey };
export type {
  SynthesisHostItemRef,
  SynthesisTagValidationWarning,
  SynthesisWorkbenchPaperDigestResult,
  SynthesisWorkbenchSidecarStatus,
  SynthesisWorkbenchTopicArtifactRow,
  SynthesisWorkbenchTopicDetailResult,
  SynthesisWorkbenchTopicFreshness,
  SynthesisWorkbenchTopicSourceMaterialsStatus,
  SynthesisWorkbenchTopicUpdateIntent,
};

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchTab =
  | "overview"
  | "artifacts"
  | "registry"
  | "reviews"
  | "tags"
  | "concepts"
  | "graph"
  | "reader";

export type { SynthesisWorkbenchSurfaceName };

/** Visible navigation tabs (reader is a hidden tab with no nav entry). */
export type SynthesisWorkbenchNavTab = Exclude<SynthesisWorkbenchTab, "reader">;

export type SynthesisWorkbenchLayoutAlgorithm =
  | "force"
  | "radial"
  | "components";

export type SynthesisWorkbenchGraphNodeKind =
  | "library_paper"
  | "external_reference"
  | "unresolved_reference";

export type SynthesisWorkbenchGraphElement =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string };

export type SynthesisWorkbenchCacheReadiness =
  | "missing"
  | "refreshing"
  | "ready"
  | "stale"
  | "failed";

/**
 * Host command vocabulary carried by the "hostCommand" action. The host-side
 * single source of truth for execution is SynthesisUiHostCommandName in
 * src/modules/synthesis/uiModel.ts; this union is the page-facing wire
 * vocabulary and must stay in sync with it.
 */
export type SynthesisWorkbenchHostCommandName =
  | "openTopicArtifact"
  | "exportTopicSynthesisReport"
  | "exportTopicDetailHtml"
  | "runSynthesizeTopic"
  | "openZoteroItem"
  | "runMissingArtifactWorkflow"
  | "runRegistryItemWorkflow"
  | "openPreferences"
  | "manualRecomputeLayout"
  | "runTagBootstrapper"
  | "validateTagVocabulary"
  | "importTagVocabulary"
  | "previewTagVocabularyImport"
  | "applyTagVocabularyImport"
  | "exportTagVocabulary"
  | "updateStagedTagSuggestion"
  | "updateTagVocabularyEntry"
  | "deleteTagVocabularyEntry"
  | "promoteStagedTagSuggestions"
  | "discardStagedTagSuggestions"
  | "clearStagedTagSuggestions"
  | "rebuildTagVocabularyIndex"
  | "rebuildConceptKbIndex"
  | "deleteConceptEntry"
  | "applyConceptReviewAction"
  | "updateConceptDisplayText"
  | "rebuildTopicGraphIndex"
  | "acceptTopicGraphRelation"
  | "rejectTopicGraphRelation"
  | "applyTopicGraphReviewAction"
  | "rejectTopicDiscoveryHint"
  | "restoreTopicDiscoveryHint"
  | "refreshReferenceSidecarNow"
  | "retryReferenceSidecarRefresh"
  | "runAdvancedReferenceMatchingNow"
  | "retryAdvancedReferenceMatching"
  | "applyReferenceMatchProposalAction"
  | "applyReferenceMatchProposalActions"
  | "applyCanonicalRevisionReviewAction"
  | "mergeEffectiveCanonicalReference"
  | "applyCanonicalRevisionMergeRequests"
  | "updateCanonicalReferenceMetadata"
  | "archiveCanonicalReference"
  | "refreshCitationGraphCacheIncrementalNow"
  | "rebuildCitationGraphCacheNow"
  | "retryCitationGraphCacheRebuild"
  | "deleteTopicArtifact"
  | "purgeDeletedTopicArtifacts"
  | "submitTopicSynthesisUpdate"
  | "resolveTopicPaperDigest"
  | "syncWebDavNow"
  | "pauseWebDavSync"
  | "resumeWebDavSync"
  | "retryWebDavSync"
  | "resolveWebDavSyncConflict";

// ---------------------------------------------------------------------------
// page -> host
// ---------------------------------------------------------------------------

/**
 * Wire action names. The legacy page also dispatches the page-local macros
 * "openTopicCitationSubgraph" and "backToTopicDetail"; those are decomposed
 * page-side into setGraphView/selectTab/showArtifactReader and never cross
 * postMessage, so they are not part of this union.
 */
export type SynthesisWorkbenchActionName =
  | "ready"
  | "refresh"
  | "selectTab"
  | "setFilters"
  | "setGraphView"
  | "setTopicGraphView"
  | "hostCommand"
  | "showArtifactReader"
  | "closeArtifactReader"
  | "continueGraphWindow"
  | "retryGraphWindow"
  | "expandGraphNeighborhood"
  | "openSynthesisSidecarDiagnostics"
  | "retrySynthesisSidecar";

export type SynthesisWorkbenchSelectTabPayload = {
  tab: SynthesisWorkbenchTab;
};

export type SynthesisWorkbenchShowArtifactReaderPayload = {
  topicId: string;
  previousTab?: SynthesisWorkbenchNavTab;
};

export type SynthesisWorkbenchSetGraphViewPayload = {
  role?: string;
  topicId?: string;
  nodeKinds?: SynthesisWorkbenchGraphNodeKind[];
  showLowSignalReferences?: boolean;
  layoutAlgorithm?: SynthesisWorkbenchLayoutAlgorithm;
  layoutPreset?: SynthesisWorkbenchLayoutAlgorithm;
  neighborhoodDepth?: number;
  selectedElement?: SynthesisWorkbenchGraphElement | null;
};

export type SynthesisWorkbenchSetTopicGraphViewPayload = {
  search?: string;
  mode?: "hierarchy" | "neighborhood" | "unplaced";
  selectedTopicId?: string;
};

export type SynthesisWorkbenchHostCommandPayload = {
  command: SynthesisWorkbenchHostCommandName;
  args?: Record<string, unknown>;
};

export type SynthesisWorkbenchExpandGraphNeighborhoodPayload = {
  nodeId?: string;
  direction?: "incoming" | "outgoing" | "both";
};

export type SynthesisWorkbenchEmptyActionPayload = Record<string, never>;

/** Payloads carried by each action crossing the page/host boundary. */
export type SynthesisWorkbenchActionPayloadMap = {
  ready: SynthesisWorkbenchEmptyActionPayload;
  refresh: SynthesisWorkbenchEmptyActionPayload;
  selectTab: SynthesisWorkbenchSelectTabPayload;
  setFilters: SynthesisWorkbenchSetFiltersPayload;
  setGraphView: SynthesisWorkbenchSetGraphViewPayload;
  setTopicGraphView: SynthesisWorkbenchSetTopicGraphViewPayload;
  hostCommand: SynthesisWorkbenchHostCommandPayload;
  showArtifactReader: SynthesisWorkbenchShowArtifactReaderPayload;
  closeArtifactReader: SynthesisWorkbenchEmptyActionPayload;
  continueGraphWindow: SynthesisWorkbenchEmptyActionPayload;
  retryGraphWindow: SynthesisWorkbenchEmptyActionPayload;
  expandGraphNeighborhood: SynthesisWorkbenchExpandGraphNeighborhoodPayload;
  openSynthesisSidecarDiagnostics: SynthesisWorkbenchEmptyActionPayload;
  retrySynthesisSidecar: SynthesisWorkbenchEmptyActionPayload;
};

export type SynthesisWorkbenchActionPayload<
  Action extends SynthesisWorkbenchActionName,
> = SynthesisWorkbenchActionPayloadMap[Action];

/** Strict discriminated action envelope for new page callers. */
export type SynthesisWorkbenchActionEnvelope = {
  [Action in SynthesisWorkbenchActionName]: {
    type: "synthesis:action";
    action: Action;
    payload?: SynthesisWorkbenchActionPayload<Action>;
  };
}[SynthesisWorkbenchActionName];

/**
 * Transitional host-side envelope for callers that still decode a generic
 * Record payload. It keeps the wire type migration staged without weakening
 * the strict action map used by new callers.
 */
export type SynthesisWorkbenchLegacyActionEnvelope = {
  type: "synthesis:action";
  action: SynthesisWorkbenchActionName;
  payload?: Record<string, unknown>;
};

/**
 * Direct bridge injected by the host as
 * window.__zoteroSkillsSynthesisWorkbenchBridge; when present it takes
 * precedence over postMessage fan-out to window.parent/top/opener.
 */
export type SynthesisWorkbenchBridge = {
  postMessage: <Action extends SynthesisWorkbenchActionName>(
    action: Action,
    payload?: SynthesisWorkbenchActionPayload<Action>,
  ) => Promise<unknown> | unknown;
};

// ---------------------------------------------------------------------------
// Snapshot building blocks (page-rendered wire vocabulary)
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchActionOperationStatus =
  | "pending"
  | "running"
  | "queued"
  | "completed"
  | "failed";

export type SynthesisWorkbenchActionOperation = {
  key: string;
  command: SynthesisWorkbenchHostCommandName;
  status: SynthesisWorkbenchActionOperationStatus;
  label: string;
  started_at?: string;
  completed_at?: string;
  message?: string;
};

export type SynthesisWorkbenchActionStatus = {
  inFlight: SynthesisWorkbenchActionOperation[];
  lastCompleted?: SynthesisWorkbenchActionOperation;
  lastFailed?: SynthesisWorkbenchActionOperation;
  warnings: SynthesisWorkbenchActionOperation[];
};

export type SynthesisWorkbenchBackgroundJobStatus =
  | "submitted"
  | "queued"
  | "running"
  | "waiting"
  | "failed";

export type SynthesisWorkbenchBackgroundJobProgress =
  | { mode: "indeterminate"; label?: string }
  | {
      mode: "determinate";
      percent: number;
      current?: number;
      total?: number;
      label?: string;
    };

export type SynthesisWorkbenchBackgroundJobRow = {
  job_id: string;
  source:
    | "workbench"
    | "operation"
    | "reference_sidecar_refresh"
    | "citation_graph_cache_rebuild"
    | "citation_graph_layout"
    | "webdav_sync"
    | "canonical_maintenance";
  status: SynthesisWorkbenchBackgroundJobStatus;
  label: string;
  detail?: string;
  updated_at?: string;
  command?: SynthesisWorkbenchHostCommandName;
  targetTab?: SynthesisWorkbenchTab;
  progress?: SynthesisWorkbenchBackgroundJobProgress;
};

export type SynthesisWorkbenchBackgroundJobSummary = {
  rows: SynthesisWorkbenchBackgroundJobRow[];
  activeCount: number;
  submittedCount: number;
  queuedCount: number;
  runningCount: number;
  waitingCount: number;
  failedCount: number;
  primaryJob?: SynthesisWorkbenchBackgroundJobRow;
};

export type SynthesisWorkbenchSyncDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type SynthesisWorkbenchDurableSyncStatus = {
  queue_state:
    | "idle"
    | "queued"
    | "syncing"
    | "blocked_conflict"
    | "failed_retryable"
    | "failed_permanent"
    | "disabled";
  paused: boolean;
  adapter_configured: boolean;
  config_status?: string;
  base_url?: string;
  remote_path?: string;
  connection_test?: {
    ok: boolean;
    tested_at?: string;
    diagnostics: SynthesisWorkbenchSyncDiagnostic[];
  };
  last_run_status?: string;
  last_run_at?: string;
  conflict_count: number;
  conflict_assets: Array<{
    asset_path: string;
    reason: string;
    base_hash?: string;
    local_hash?: string;
    remote_hash?: string;
  }>;
  conflictActions: string[];
  diagnostics: SynthesisWorkbenchSyncDiagnostic[];
  allowedActions: string[];
};

export type SynthesisWorkbenchSyncStatus = {
  status:
    | "ready"
    | "missing_root"
    | "divergent"
    | "index_dirty"
    | "check_skipped";
  diagnostics: SynthesisWorkbenchSyncDiagnostic[];
  allowedActions: string[];
  requiresConfirmation: boolean;
  webdav?: SynthesisWorkbenchDurableSyncStatus;
};

export type SynthesisWorkbenchStorageStatus = {
  rootPath?: string;
  rootState: "missing" | "ready" | "unbound";
};

export type SynthesisWorkbenchPreferencesStatus = {
  sourceWatchEnabled: boolean;
  registryAutoRebuild: boolean;
  graphRebuildMode: "off" | "idle" | "auto";
  stalenessScanEnabled: boolean;
  debounceMs: number;
  startupHashCheck: boolean;
};

// ---------------------------------------------------------------------------
// Snapshot filter vocabulary (mirrors SynthesisUiState filter sections)
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchArtifactsFilters = {
  search: string;
  sourceMaterials: "all" | "complete" | "partial" | "missing";
  freshness:
    | "all"
    | "fresh"
    | "stale"
    | "dirty"
    | "queued"
    | "running"
    | "failed"
    | "unknown";
  sort: "title" | "paper_count" | "updated_at";
  viewMode: "graph" | "list" | "grid";
};

export type SynthesisWorkbenchRegistryFilters = {
  activeIndexTool: "none" | "revise_canonicals";
  search: string;
  scope: "all" | "library" | "referenced";
  artifactCoverage: "all" | "complete" | "partial" | "missing";
  bindingStatus:
    | "all"
    | "unbound"
    | "candidate"
    | "accepted"
    | "rejected"
    | "stale_target";
  canonicalSearch: string;
  canonicalBinding: "all" | "bound" | "external";
  canonicalGraph: "all" | "visible" | "not_in_graph";
  canonicalRedirects: "all" | "has_redirects";
  canonicalProposals: "all" | "has_proposals";
  canonicalDuplicates: "all" | "possible_duplicate";
  selectedCanonicalRowId?: string;
  reviewDrawerOpen: boolean;
  reviewDrawerIndex: number;
  expandedSourceRefs: string[];
};

export type SynthesisWorkbenchReviewsFilters = {
  activeTab: "reference_matching" | "concepts" | "topic_graph";
  search: string;
  status:
    | "open"
    | "all"
    | "accepted"
    | "rejected"
    | "superseded"
    | "retargeted";
  kind: "all" | "zotero_binding" | "canonical_merge" | "canonical_revision";
  confidence: "all" | "deterministic" | "high" | "medium" | "low" | "review";
};

export type SynthesisWorkbenchTagsFilters = {
  search: string;
  facet: "all" | string;
  status: "all" | "active" | "deprecated" | "warning";
  view: "vocabulary" | "staged";
  stagedSearch: string;
  stagedFacet: "all" | string;
  selectedStagedTags: string[];
  selectedVocabularyTags: string[];
  density: "compact" | "comfortable";
  expandedRows: Record<string, boolean>;
  selectedTag?: string;
  importDraft: string;
};

export type SynthesisWorkbenchTopicGraphFilters = {
  mode: "hierarchy" | "neighborhood" | "unplaced";
  search: string;
  selectedTopicId?: string;
};

export type SynthesisWorkbenchConceptsFilters = {
  search: string;
  conceptType: "all" | string;
  status: "all" | "active" | "review" | "deprecated";
  topicId: "all" | string;
  selectedConceptId?: string;
  overlayEnabled: boolean;
  reviewMergeTargets: Record<string, string>;
};

export type SynthesisWorkbenchGraphFilters = {
  search: string;
  role: "all" | string;
  topicId: "all" | string;
  layoutAlgorithm: SynthesisWorkbenchLayoutAlgorithm;
  neighborhoodDepth: number;
  nodeKinds: SynthesisWorkbenchGraphNodeKind[];
  showLowSignalReferences: boolean;
};

/**
 * Filter patch payloads for the "setFilters" action: every section is a
 * partial of the corresponding snapshot filter state.
 */
export type SynthesisWorkbenchSetFiltersPayload = {
  artifacts?: Partial<SynthesisWorkbenchArtifactsFilters>;
  registry?: Partial<SynthesisWorkbenchRegistryFilters>;
  reviews?: Partial<SynthesisWorkbenchReviewsFilters>;
  tags?: Partial<SynthesisWorkbenchTagsFilters> & Record<string, unknown>;
  topicGraph?: Partial<SynthesisWorkbenchTopicGraphFilters>;
  concepts?: Partial<SynthesisWorkbenchConceptsFilters>;
  graph?: Partial<SynthesisWorkbenchGraphFilters>;
};

// ---------------------------------------------------------------------------
// Graph window metadata (incremental graph-page channel)
// ---------------------------------------------------------------------------

/**
 * Graph window metadata embedded in snapshot.graph.window. The incremental
 * "synthesis:graph-page" channel carries a full snapshot whose graph section
 * holds the merged window; the merge basis is snapshot.graph.graph_hash plus
 * window.querySignature, the cursor pair is window.nextCursor/hasMore, and
 * the payload-level generation is the window generation. Merge/validation
 * semantics live in src/shared/synthesisCitationGraphWindow.ts.
 */
export type SynthesisWorkbenchGraphWindow = {
  nextCursor?: string;
  hasMore: boolean;
  totalNodes: number;
  totalEdges: number;
  totalHoverNodes: number;
  totalHoverEdges: number;
  loadedNodes: number;
  loadedEdges: number;
  querySignature: string;
  status: SynthesisCitationGraphWindowStatus;
  roleOptions: string[];
  error?: { code: string; reason?: string };
};

export type SynthesisWorkbenchGraphTopicScope = {
  topicId: string;
  title: string;
  paperRefs: string[];
  nodeIds: string[];
};

// ---------------------------------------------------------------------------
// Concrete host-owned view DTOs
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchArtifactCoverage =
  | "complete"
  | "partial"
  | "missing";

export type SynthesisWorkbenchBindingStatus =
  | "candidate"
  | "accepted"
  | "rejected"
  | "stale_target";

export type SynthesisWorkbenchRegistryReferenceRow = {
  reference_instance_id: string;
  reference_index: number;
  title: string;
  year?: string;
  raw_reference?: string;
  confidence?: string;
  target_literature_item_id?: string;
  target_title?: string;
  target_paper_ref?: string;
  target_binding: "library" | "external" | "none";
  binding_status?: SynthesisWorkbenchBindingStatus;
};

export type SynthesisWorkbenchRegistryRow = {
  libraryId?: number;
  itemKey?: string;
  paper_ref: string;
  title: string;
  year?: string;
  artifactCoverage: SynthesisWorkbenchArtifactCoverage;
  ratingScore?: number;
  missing_artifacts: string[];
  index_scope?: "library" | "referenced";
  literature_item_id?: string;
  reference_count?: number;
  unbound_reference_count?: number;
  referenced_by_count?: number;
  references?: SynthesisWorkbenchRegistryReferenceRow[];
  needsTagRegulation?: boolean;
};

export type SynthesisWorkbenchReferenceMatchProposalRow = {
  proposal_id: string;
  kind: "zotero_binding" | "canonical_merge";
  status: "open" | "accepted" | "rejected" | "superseded" | "retargeted";
  source_canonical_reference_id: string;
  source_effective_canonical_reference_id?: string;
  source_projected_literature_item_id?: string;
  source_raw_reference_ids: string[];
  target_canonical_reference_id?: string;
  target_effective_canonical_reference_id?: string;
  target_projected_literature_item_id?: string;
  target_library_id?: number;
  target_item_key?: string;
  confidence?: string;
  score?: number;
  reasons?: string[];
  evidence?: Record<string, unknown>;
  diagnostics?: unknown[];
  updated_at?: string;
};

export type SynthesisWorkbenchReferenceMatchTargetCandidate =
  | {
      kind: "zotero_item";
      libraryId: number;
      itemKey: string;
      title: string;
      year?: string;
      paperRef?: string;
    }
  | {
      kind: "canonical_reference";
      canonicalReferenceId: string;
      title: string;
      year?: string;
      rawReferenceIds?: string[];
      bindingStatus?: SynthesisWorkbenchBindingStatus;
      bindingTarget?: {
        libraryId: number;
        itemKey: string;
        paperRef?: string;
      };
    };

export type SynthesisWorkbenchCanonicalActionAvailability = {
  allowed: boolean;
  reason?: string;
  blockers?: string[];
};

export type SynthesisWorkbenchCanonicalReferenceRow = {
  row_id: string;
  effective_canonical_id: string;
  projected_literature_item_id: string;
  title: string;
  normalized_title?: string;
  year?: string;
  authors?: string[];
  identifiers?: Record<string, unknown>;
  identifiers_list?: Array<{ kind: string; value: string }>;
  binding?: {
    libraryId: number;
    itemKey: string;
    paperRef: string;
    title?: string;
    status?: SynthesisWorkbenchBindingStatus;
  };
  raw_reference_count: number;
  raw_reference_samples?: unknown[];
  physical_canonical_ids: string[];
  effective_canonical_ids: string[];
  incoming_redirects?: unknown[];
  outgoing_redirects?: unknown[];
  related_proposals?: unknown[];
  duplicate_peers?: unknown[];
  incoming_redirect_count: number;
  outgoing_redirect_count: number;
  proposal_count: number;
  open_proposal_count: number;
  graph_node_id?: string;
  graph_in_degree: number;
  graph_out_degree: number;
  possible_duplicate_group?: string;
  action_availability: {
    merge: SynthesisWorkbenchCanonicalActionAvailability;
    edit: SynthesisWorkbenchCanonicalActionAvailability;
    archive: SynthesisWorkbenchCanonicalActionAvailability;
  };
  diagnostics?: unknown[];
};

export type SynthesisWorkbenchCleanupProposalRow = {
  proposal_id: string;
  status:
    | "open"
    | "resolved"
    | "deferred"
    | "blocked_by_upstream_review"
    | "superseded"
    | "retargeted"
    | "approved"
    | "rejected"
    | "skipped";
  kind?: string;
  review_kind?: string;
  priority?: number;
  blocked_by_review_item_id?: string;
  source_paper_ref: string;
  source_paper_title?: string;
  reference_instance_id?: string;
  provisional_key?: string;
  reference_title?: string;
  reference_raw?: string;
  target_paper_ref?: string;
  target_paper_title?: string;
  target_literature_item_id?: string;
  target_work_id?: string;
  target_work_title?: string;
  reason: string;
  diagnostics?: unknown[];
  decision_summary?: string;
  updated_at?: string;
};

export type SynthesisWorkbenchTagRow = {
  tag: string;
  facet: string;
  note?: string;
  source?: string;
  deprecated?: boolean;
  replacement?: string;
  aliases: string[];
  abbrev: string[];
  usage_count: number;
  last_synced_at?: string;
  validation_warnings: SynthesisTagValidationWarning[];
  builtin: boolean;
};

export type SynthesisWorkbenchStagedTagRow = {
  tag: string;
  facet: string;
  note?: string;
  source_flow?: string;
  parent_bindings: SynthesisHostItemRef[];
  parent_count: number;
  created_at?: string;
  updated_at?: string;
};

export type SynthesisWorkbenchTagImportPreview = {
  builtins: Array<{
    tag: string;
    local: SynthesisWorkbenchTagRow;
    imported: SynthesisWorkbenchTagRow;
  }>;
  additions: SynthesisWorkbenchTagRow[];
  unchanged: SynthesisWorkbenchTagRow[];
  conflicts: Array<{
    tag: string;
    local: SynthesisWorkbenchTagRow;
    imported: SynthesisWorkbenchTagRow;
  }>;
  warnings: SynthesisTagValidationWarning[];
};

export type SynthesisWorkbenchTopicGraphRelation =
  | "broader_than"
  | "related_to"
  | "overlaps_with"
  | "contrasts_with";

export type SynthesisWorkbenchTopicGraphEdgeStatus =
  | "suggested"
  | "confirmed"
  | "rejected"
  | "stale"
  | "deleted";

export type SynthesisWorkbenchTopicGraphNode = {
  topic_id: string;
  title: string;
  short_definition?: string;
  definition?: string;
  summary?: string;
  aliases: string[];
  node_type: "materialized" | "placeholder";
  definition_status?: "has_synthesis" | "placeholder" | "deleted" | "stale";
  current_artifact_path?: string;
  is_root?: boolean;
  level?: "top" | "normal";
  paper_count: number;
  last_synthesis_at?: string;
  relation_statuses: SynthesisWorkbenchTopicGraphEdgeStatus[];
};

export type SynthesisWorkbenchTopicGraphEdge = {
  edge_id: string;
  source_topic_id: string;
  target_topic_id: string;
  relation: SynthesisWorkbenchTopicGraphRelation;
  status: SynthesisWorkbenchTopicGraphEdgeStatus;
  confidence?: number;
  provenance: unknown[];
  evidence_refs: unknown[];
};

export type SynthesisWorkbenchTopicGraphReviewItem = {
  review_id: string;
  status: "open" | "approved" | "rejected" | "deleted";
  source_topic_id: string;
  target_topic_id: string;
  target_title?: string;
  relation: SynthesisWorkbenchTopicGraphRelation;
  confidence?: number;
  provenance: unknown[];
  evidence_refs: unknown[];
  diagnostics: unknown[];
};

export type SynthesisWorkbenchTopicGraphInspector = {
  topic?: SynthesisWorkbenchTopicGraphNode;
  parents: SynthesisWorkbenchTopicGraphNode[];
  children: SynthesisWorkbenchTopicGraphNode[];
  related: Array<{
    relation: SynthesisWorkbenchTopicGraphRelation;
    status: SynthesisWorkbenchTopicGraphEdgeStatus;
    node: SynthesisWorkbenchTopicGraphNode;
  }>;
  suggestedRelations: Array<{
    edge_id: string;
    relation: SynthesisWorkbenchTopicGraphRelation;
    status: Extract<SynthesisWorkbenchTopicGraphEdgeStatus, "suggested">;
    node: SynthesisWorkbenchTopicGraphNode;
    source_topic_id: string;
    target_topic_id: string;
    confidence?: number;
    provenance?: unknown[];
    evidence_refs?: unknown[];
  }>;
  relationReviewItems: SynthesisWorkbenchTopicGraphReviewItem[];
  suggestedCount: number;
};

export type SynthesisWorkbenchConceptRow = {
  concept_id: string;
  label: string;
  aliases: string[];
  concept_type: string;
  domain: string;
  status: "active" | "review" | "deprecated";
  short_definition?: string;
  definition?: string;
  usage_note?: string;
  editorial_note?: string;
  sense_ids: string[];
};

export type SynthesisWorkbenchConceptSenseRow = {
  sense_id: string;
  concept_id: string;
  label: string;
  aliases: string[];
  domain: string;
  short_definition: string;
  definition: string;
  confidence: "high" | "medium" | "low";
  source_topic_ids: string[];
};

export type SynthesisWorkbenchConceptAliasRow = {
  alias_id: string;
  alias: string;
  normalized: string;
  concept_id: string;
  sense_id?: string;
  status: "active" | "review" | "deprecated";
  confidence: "high" | "medium" | "low";
};

export type SynthesisWorkbenchConceptOverlayEntry = {
  concept_id: string;
  sense_id?: string;
  alias: string;
  label: string;
  short_definition?: string;
  definition?: string;
  confidence: "high" | "medium" | "low";
};

export type SynthesisWorkbenchConceptReviewItem = {
  review_id: string;
  status: "open" | "approved" | "merged" | "rejected";
  reason:
    | "low_confidence_concept"
    | "ambiguous_concept_match"
    | "alias_conflict"
    | "alias_equivalence_audit";
  topic_id: string;
  label: string;
  short_definition?: string;
  definition?: string;
  concept_type?: string;
  domain?: string;
  topic_relevance?: unknown;
  evidence?: unknown;
  diagnostics?: unknown[];
  confidence: "high" | "medium" | "low";
  candidate_concept_ids: string[];
  audit_alias?: {
    alias_id: string;
    alias: string;
    normalized: string;
    concept_id: string;
    sense_id?: string;
  };
};

export type SynthesisWorkbenchConceptRelation = {
  relation_id?: string;
  source_concept_id?: string;
  target_concept_id?: string;
  relation?: string;
  status?: string;
  confidence?: string;
  provenance?: unknown[];
  created_at?: string;
  updated_at?: string;
};

export type SynthesisWorkbenchGraphNodeView = {
  id: string;
  label: string;
  kind: SynthesisWorkbenchGraphNodeKind;
  year?: string;
  authors?: string[];
  tags?: string[];
  collections?: string[];
  x?: number;
  y?: number;
  low_signal?: boolean;
  external_degree?: number;
  visibility?: "default" | "hover_only";
  display_tier?: "library" | "shared_external" | "single_external";
  metrics?: {
    internal_in_degree?: number;
    internal_out_degree?: number;
  };
};

export type SynthesisWorkbenchGraphEdgeView = {
  id: string;
  source: string;
  target: string;
  primary_role?: string;
  mention_count?: number;
  visibility?: "default" | "hover_only";
};

export type SynthesisWorkbenchMaintenanceSummary = {
  status:
    | "ready"
    | "stale"
    | "partial"
    | "missing"
    | "queued"
    | "running"
    | "failed";
  latestUsable: {
    referenceSidecar?: {
      updated_at?: string;
      age_ms?: number;
    };
    citationGraph?: {
      updated_at?: string;
      age_ms?: number;
      graph_hash?: string;
    };
  };
  pendingDirtyCount: number;
  activeWorkerCount: number;
  activeWorkerKind?: string;
  canonicalSyncPending: boolean;
  canonicalEpoch: number;
  lastFailure?: SynthesisWorkbenchSyncDiagnostic;
  stale: string[];
  partial: string[];
  missing: string[];
  recommendedCommands: string[];
  diagnostics: SynthesisWorkbenchSyncDiagnostic[];
};

export type SynthesisWorkbenchSnapshotHostTypes = {
  artifactRow: SynthesisWorkbenchTopicArtifactRow;
  registryRow: SynthesisWorkbenchRegistryRow;
  cleanupProposalRow: SynthesisWorkbenchCleanupProposalRow;
  referenceMatchProposalRow: SynthesisWorkbenchReferenceMatchProposalRow;
  referenceMatchTargetCandidate: SynthesisWorkbenchReferenceMatchTargetCandidate;
  canonicalReferenceRow: SynthesisWorkbenchCanonicalReferenceRow;
  tagRow: SynthesisWorkbenchTagRow;
  stagedTagRow: SynthesisWorkbenchStagedTagRow;
  tagImportPreview: SynthesisWorkbenchTagImportPreview;
  topicGraphNode: SynthesisWorkbenchTopicGraphNode;
  topicGraphEdge: SynthesisWorkbenchTopicGraphEdge;
  topicGraphReviewItem: SynthesisWorkbenchTopicGraphReviewItem;
  topicGraphInspector: SynthesisWorkbenchTopicGraphInspector;
  conceptRow: SynthesisWorkbenchConceptRow;
  conceptSenseRow: SynthesisWorkbenchConceptSenseRow;
  conceptAliasRow: SynthesisWorkbenchConceptAliasRow;
  conceptRelation: SynthesisWorkbenchConceptRelation;
  conceptReviewItem: SynthesisWorkbenchConceptReviewItem;
  conceptOverlayEntry: SynthesisWorkbenchConceptOverlayEntry;
  graphNode: SynthesisWorkbenchGraphNodeView;
  graphEdge: SynthesisWorkbenchGraphEdgeView;
  maintenanceSummary: SynthesisWorkbenchMaintenanceSummary;
  topicDetail: SynthesisWorkbenchTopicDetailResult;
  artifactReader: SynthesisWorkbenchArtifactReaderPayload;
};

/** Concrete map shared by the host and page; no page-side module mapping. */
export type SynthesisWorkbenchPageHostTypes =
  SynthesisWorkbenchSnapshotHostTypes;

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchReviewSummary = {
  openCount: number;
  indexCount: number;
  referenceMatchingCount: number;
  conceptCount: number;
  topicGraphCount: number;
};

export type SynthesisWorkbenchProjectionStatus = {
  target: string;
  stale: boolean;
  last_rebuild_at?: string;
  diagnostics: unknown[];
};

export type SynthesisWorkbenchSnapshot<
  Host extends SynthesisWorkbenchSnapshotHostTypes =
    SynthesisWorkbenchSnapshotHostTypes,
> = {
  libraryId: number;
  selectedTab: SynthesisWorkbenchTab;
  sidecarStatus?: SynthesisWorkbenchSidecarStatus;
  actions: SynthesisWorkbenchActionStatus;
  maintenance: {
    summary: Host["maintenanceSummary"];
    backgroundJobs: SynthesisWorkbenchBackgroundJobSummary;
  };
  storage: SynthesisWorkbenchStorageStatus;
  preferences: SynthesisWorkbenchPreferencesStatus;
  sync: SynthesisWorkbenchSyncStatus;
  conflicts: {
    candidates: Array<{
      id: string;
      topic_id: string;
      created_at: string;
      bundle_hash: string;
      reason: string;
      status: "open" | "cleared";
    }>;
  };
  deletedArtifacts: {
    count: number;
    rows: Array<{ topic_id: string; title: string; deleted_at: string }>;
  };
  artifacts: {
    filters: SynthesisWorkbenchArtifactsFilters;
    rows: Array<Host["artifactRow"]>;
    visibleRows: Array<Host["artifactRow"]>;
  };
  registry: {
    filters: SynthesisWorkbenchRegistryFilters;
    rows: Array<Host["registryRow"]>;
    visibleRows: Array<Host["registryRow"]>;
    cleanupProposals: Array<Host["cleanupProposalRow"]>;
    matchProposals: Array<Host["referenceMatchProposalRow"]>;
    matchTargetCandidates: Array<Host["referenceMatchTargetCandidate"]>;
    canonicalRows: Array<Host["canonicalReferenceRow"]>;
    visibleCanonicalRows: Array<Host["canonicalReferenceRow"]>;
    canonicalDiagnostics: unknown[];
    cacheStatus: {
      cache_key: string;
      status: SynthesisWorkbenchCacheReadiness;
      source_hash?: string;
      basis_hash?: string;
      refreshed_at?: string;
      updated_at?: string;
      diagnostics: SynthesisWorkbenchSyncDiagnostic[];
      allowedActions: string[];
    };
  };
  reviews: {
    filters: SynthesisWorkbenchReviewsFilters;
    summary: SynthesisWorkbenchReviewSummary;
  };
  tags: {
    filters: SynthesisWorkbenchTagsFilters;
    facets: string[];
    rows: Array<Host["tagRow"]>;
    visibleRows: Array<Host["tagRow"]>;
    stagedRows: Array<Host["stagedTagRow"]>;
    visibleStagedRows: Array<Host["stagedTagRow"]>;
    stagedCount: number;
    stagedFacets: string[];
    selected?: Host["tagRow"];
    validationWarnings: SynthesisTagValidationWarning[];
    projection: SynthesisWorkbenchProjectionStatus;
    manifest: Record<string, unknown>;
    importPreview?: Host["tagImportPreview"];
    importDraft: string;
  };
  topicGraph: {
    filters: SynthesisWorkbenchTopicGraphFilters;
    nodes: Array<Host["topicGraphNode"]>;
    edges: Array<Host["topicGraphEdge"]>;
    reviewItems: Array<Host["topicGraphReviewItem"]>;
    visibleNodes: Array<Host["topicGraphNode"]>;
    visibleEdges: Array<Host["topicGraphEdge"]>;
    inspector: Host["topicGraphInspector"];
    manifest: Record<string, unknown>;
    projection: SynthesisWorkbenchProjectionStatus;
    diagnostics: unknown[];
  };
  concepts: {
    filters: SynthesisWorkbenchConceptsFilters;
    rows: Array<Host["conceptRow"]>;
    visibleRows: Array<Host["conceptRow"]>;
    selected?: Host["conceptRow"];
    senses: Array<Host["conceptSenseRow"]>;
    aliases: Array<Host["conceptAliasRow"]>;
    relations: Array<Host["conceptRelation"]>;
    reviewItems: Array<Host["conceptReviewItem"]>;
    overlayEntries: Array<Host["conceptOverlayEntry"]>;
    conceptTypes: string[];
    projection: SynthesisWorkbenchProjectionStatus;
    manifest: Record<string, unknown>;
    diagnostics: unknown[];
  };
  graph: {
    filters: SynthesisWorkbenchGraphFilters;
    graph_hash: string;
    layoutStatus: SynthesisWorkbenchCacheReadiness;
    layoutAlgorithm: SynthesisWorkbenchLayoutAlgorithm;
    nodeKinds: SynthesisWorkbenchGraphNodeKind[];
    showLowSignalReferences: boolean;
    selectedElement?: SynthesisWorkbenchGraphElement;
    topicScopes: SynthesisWorkbenchGraphTopicScope[];
    selectedTopicScope?: SynthesisWorkbenchGraphTopicScope;
    nodes: Array<Host["graphNode"]>;
    edges: Array<Host["graphEdge"]>;
    hoverOnlyNodes: Array<Host["graphNode"]>;
    hoverOnlyEdges: Array<Host["graphEdge"]>;
    diagnostics: Record<string, unknown>;
    window: SynthesisWorkbenchGraphWindow;
    visibleNodes: Array<Host["graphNode"]>;
    visibleEdges: Array<Host["graphEdge"]>;
  };
  reader: {
    topicId: string;
    previousTab: SynthesisWorkbenchNavTab;
  };
  hostCommands: SynthesisWorkbenchHostCommandName[];
};

// ---------------------------------------------------------------------------
// host -> page
// ---------------------------------------------------------------------------

/** Every host payload is wrapped by withSynthesisWorkbenchI18n. */
export type SynthesisWorkbenchI18nCarrier = {
  i18n?: SynthesisWorkbenchI18nEnvelope;
};

export type SynthesisWorkbenchSurfaceRequestMeta = {
  requestId: number;
  surface: SynthesisWorkbenchSurfaceName;
  selectedTabAtRequest: SynthesisWorkbenchTab;
  refreshFromService: boolean;
  libraryReadModelRevision?: number;
  startedAt?: string;
};

export type SynthesisWorkbenchSnapshotPayload<
  Host extends SynthesisWorkbenchSnapshotHostTypes =
    SynthesisWorkbenchSnapshotHostTypes,
> = SynthesisWorkbenchSnapshot<Host> & SynthesisWorkbenchI18nCarrier;

export type SynthesisWorkbenchSurfacePayload<
  Host extends SynthesisWorkbenchSnapshotHostTypes =
    SynthesisWorkbenchSnapshotHostTypes,
> = SynthesisWorkbenchI18nCarrier & {
  surface: SynthesisWorkbenchSurfaceName;
  request?: SynthesisWorkbenchSurfaceRequestMeta;
  requestId?: number;
  snapshot?: SynthesisWorkbenchSnapshot<Host>;
};

export type SynthesisWorkbenchGraphPagePayload<
  Host extends SynthesisWorkbenchSnapshotHostTypes =
    SynthesisWorkbenchSnapshotHostTypes,
> = SynthesisWorkbenchI18nCarrier & {
  surface: "graph";
  request?: SynthesisWorkbenchSurfaceRequestMeta;
  requestId?: number;
  /** Graph window generation; must match the staged window's generation. */
  generation: number;
  snapshot?: SynthesisWorkbenchSnapshot<Host>;
};

export type SynthesisWorkbenchSurfaceErrorPayload =
  SynthesisWorkbenchI18nCarrier & {
    surface: SynthesisWorkbenchSurfaceName;
    request?: SynthesisWorkbenchSurfaceRequestMeta;
    requestId?: number;
    transient?: boolean;
    code?: string;
    message?: string;
  };

export type SynthesisWorkbenchArtifactReaderPayload = {
  topicId: string;
  title: string;
  markdown: string;
  metadata?: Record<string, unknown>;
  hash?: string;
  updated_at?: string;
};

export type SynthesisWorkbenchHostMessageType =
  | "synthesis:init"
  | "synthesis:snapshot"
  | "synthesis:chrome"
  | "synthesis:surface"
  | "synthesis:graph-page"
  | "synthesis:surface-error"
  | "synthesis:artifact"
  | "synthesis:topic-detail"
  | "synthesis:digest";

export type SynthesisWorkbenchHostMessage<
  Host extends SynthesisWorkbenchSnapshotHostTypes =
    SynthesisWorkbenchSnapshotHostTypes,
> =
  | {
      type: "synthesis:init" | "synthesis:snapshot" | "synthesis:chrome";
      payload: SynthesisWorkbenchSnapshotPayload<Host>;
    }
  | {
      type: "synthesis:surface";
      payload: SynthesisWorkbenchSurfacePayload<Host>;
    }
  | {
      type: "synthesis:graph-page";
      payload: SynthesisWorkbenchGraphPagePayload<Host>;
    }
  | {
      type: "synthesis:surface-error";
      payload: SynthesisWorkbenchSurfaceErrorPayload;
    }
  | {
      /**
       * Legacy reader channel: kept for wire compatibility; the current host
       * never sends it (reader content arrives via synthesis:topic-detail).
       */
      type: "synthesis:artifact";
      payload?: SynthesisWorkbenchArtifactReaderPayload;
    }
  | {
      type: "synthesis:topic-detail";
      payload?: Host["topicDetail"];
    }
  | {
      type: "synthesis:digest";
      payload?: SynthesisWorkbenchPaperDigestResult;
    };

// ---------------------------------------------------------------------------
// Standalone export envelopes (injected as window globals, not postMessage)
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchHostShape =
  | "hosted"
  | "standaloneTopicExport"
  | "standaloneGraphOnly";

export type SynthesisWorkbenchTopicExportEnvelope<
  Host extends SynthesisWorkbenchSnapshotHostTypes =
    SynthesisWorkbenchSnapshotHostTypes,
> = {
  version?: number;
  generatedAt?: string;
  i18n?: Partial<SynthesisWorkbenchI18nEnvelope>;
  snapshot?: SynthesisWorkbenchSnapshot<Host>;
  topicDetail?: Host["topicDetail"];
  digestsByKey?: Record<string, Record<string, unknown>>;
  graphLayouts?: Record<string, SynthesisWorkbenchSnapshot<Host>["graph"]>;
};

export type SynthesisWorkbenchGraphExportEnvelope<
  Host extends SynthesisWorkbenchSnapshotHostTypes =
    SynthesisWorkbenchSnapshotHostTypes,
> = {
  version?: number;
  generatedAt?: string;
  i18n?: Partial<SynthesisWorkbenchI18nEnvelope>;
  snapshot?: SynthesisWorkbenchSnapshot<Host>;
  graphLayouts?: Record<string, SynthesisWorkbenchSnapshot<Host>["graph"]>;
  scopeLabel?: string;
  focusNodeId?: string;
};
