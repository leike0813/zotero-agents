import Graph from "graphology";
import Sigma from "sigma";
import { drawDiscNodeHover } from "sigma/rendering";

declare const window: Window &
  typeof globalThis & {
    markdownit?: (options?: Record<string, unknown>) => MarkdownItLike;
    texmath?: MarkdownItPlugin;
    katex?: unknown;
    __zoteroSkillsSynthesisWorkbenchBridge?: SynthesisWorkbenchBridge;
  };
declare const document: Document;

type MarkdownItPlugin = (...args: unknown[]) => unknown;

type MarkdownItLike = {
  use: (
    plugin: MarkdownItPlugin,
    options?: Record<string, unknown>,
  ) => MarkdownItLike;
  render: (source: string) => string;
};

type SynthesisWorkbenchBridge = {
  postMessage: (
    action: string,
    payload?: Record<string, unknown>,
  ) => Promise<unknown> | unknown;
};

type GraphNodeKind = "library_paper" | "external_reference";

type GraphNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
  year?: string;
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

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  primary_role?: string;
  mention_count?: number;
  visibility?: "default" | "hover_only";
};

type SynthesisTab =
  | "overview"
  | "artifacts"
  | "registry"
  | "reviews"
  | "tags"
  | "concepts"
  | "graph"
  | "reader";

type WorkbenchSurfaceName =
  | "home"
  | "topics"
  | "index"
  | "review"
  | "graph"
  | "tags"
  | "concepts"
  | "reader";

type Snapshot = {
  libraryId: number;
  selectedTab: SynthesisTab;
  actions?: {
    inFlight?: ActionOperation[];
    lastCompleted?: ActionOperation;
    lastFailed?: ActionOperation;
    warnings?: ActionOperation[];
  };
  maintenance?: {
    backgroundJobs?: {
      rows?: BackgroundJobRow[];
    };
  };
  storage: Record<string, string>;
  preferences: Record<string, unknown>;
  sync?: {
    status?: string;
    diagnostics?: Array<Record<string, unknown>>;
    git?: {
      queue_state?: string;
      paused?: boolean;
      adapter_configured?: boolean;
      remote_url?: string;
      branch?: string;
      last_run_status?: string;
      last_run_at?: string;
      conflict_count?: number;
      conflict_assets?: Array<{ asset_path?: string; reason?: string }>;
      diagnostics?: Array<Record<string, unknown>>;
      allowedActions?: string[];
    };
  };
  conflicts?: { candidates?: Array<Record<string, unknown>> };
  deletedArtifacts: {
    count: number;
    rows: Array<Record<string, unknown>>;
  };
  artifacts: {
    filters: Record<string, string>;
    rows: Array<Record<string, unknown>>;
    visibleRows: Array<Record<string, unknown>>;
  };
  registry: {
    filters: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    visibleRows: Array<Record<string, unknown>>;
    cleanupProposals?: Array<Record<string, unknown>>;
    matchProposals?: Array<Record<string, unknown>>;
    cacheStatus?: {
      cache_key?: string;
      status?: string;
      refreshed_at?: string;
      diagnostics?: Array<Record<string, unknown>>;
      allowedActions?: string[];
    };
  };
  reviews?: {
    filters: Record<string, unknown>;
  };
  tags: {
    filters: Record<string, unknown>;
    facets: string[];
    rows: Array<Record<string, unknown>>;
    visibleRows: Array<Record<string, unknown>>;
    stagedRows: Array<Record<string, unknown>>;
    visibleStagedRows: Array<Record<string, unknown>>;
    stagedCount: number;
    stagedFacets: string[];
    selected?: Record<string, unknown>;
    validationWarnings: Array<Record<string, unknown>>;
    projection: {
      target?: string;
      stale?: boolean;
      last_rebuild_at?: string;
      diagnostics?: unknown[];
    };
    manifest: Record<string, unknown>;
    importPreview?: {
      additions?: Array<Record<string, unknown>>;
      unchanged?: Array<Record<string, unknown>>;
      conflicts?: Array<Record<string, unknown>>;
      warnings?: Array<Record<string, unknown>>;
    };
    importDraft: string;
  };
  topicGraph: {
    filters: {
      mode: "hierarchy" | "neighborhood" | "unplaced";
      search: string;
      selectedTopicId?: string;
    };
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
    reviewItems: Array<Record<string, unknown>>;
    visibleNodes: Array<Record<string, unknown>>;
    visibleEdges: Array<Record<string, unknown>>;
    inspector: {
      topic?: Record<string, unknown>;
      parents: Array<Record<string, unknown>>;
      children: Array<Record<string, unknown>>;
      related: Array<{
        relation: string;
        status: string;
        node: Record<string, unknown>;
      }>;
      suggestedRelations: Array<{
        edge_id: string;
        relation: string;
        status: string;
        node: Record<string, unknown>;
        source_topic_id?: string;
        target_topic_id?: string;
        confidence?: number;
        provenance?: unknown[];
        evidence_refs?: unknown[];
      }>;
      relationReviewItems: Array<Record<string, unknown>>;
      suggestedCount: number;
    };
    manifest: Record<string, unknown>;
    projection: {
      target?: string;
      stale?: boolean;
      last_rebuild_at?: string;
      diagnostics?: unknown[];
    };
    diagnostics: unknown[];
  };
  concepts: {
    filters: {
      search: string;
      conceptType: string;
      status: string;
      topicId: string;
      selectedConceptId?: string;
      overlayEnabled: boolean;
      reviewMergeTargets: Record<string, string>;
    };
    rows: Array<Record<string, unknown>>;
    visibleRows: Array<Record<string, unknown>>;
    selected?: Record<string, unknown>;
    senses: Array<Record<string, unknown>>;
    aliases: Array<Record<string, unknown>>;
    relations: Array<Record<string, unknown>>;
    reviewItems: Array<Record<string, unknown>>;
    overlayEntries: Array<Record<string, unknown>>;
    conceptTypes: string[];
    projection: {
      target?: string;
      stale?: boolean;
      last_rebuild_at?: string;
      diagnostics?: unknown[];
    };
    manifest: Record<string, unknown>;
    diagnostics: unknown[];
  };
  graph: {
    filters: {
      search: string;
      role: string;
      layoutAlgorithm: string;
      layoutPreset?: string;
      nodeKinds: GraphNodeKind[];
      showLowSignalReferences: boolean;
    };
    graph_hash: string;
    layoutStatus: "missing" | "refreshing" | "ready" | "stale" | "failed";
    layoutAlgorithm: string;
    layoutPreset?: string;
    selectedElement?: { kind: "node" | "edge"; id: string };
    nodes: GraphNode[];
    edges: GraphEdge[];
    hoverOnlyNodes: GraphNode[];
    hoverOnlyEdges: GraphEdge[];
    visibleNodes: GraphNode[];
    visibleEdges: GraphEdge[];
    diagnostics: Record<string, unknown>;
  };
  reader?: {
    topicId: string;
    previousTab:
      | "overview"
      | "artifacts"
      | "registry"
      | "tags"
      | "concepts"
      | "graph";
  };
};

type TagsEditingState = {
  originalTag?: string;
  draftTag?: string;
  draftNote?: string;
  status?: string;
  error?: string;
};

type ArtifactReaderDto = {
  topicId: string;
  title: string;
  markdown: string;
  metadata?: Record<string, unknown>;
  hash?: string;
  updated_at?: string;
};

type TopicDetailSection =
  | "overview"
  | "taxonomy"
  | "claims"
  | "references"
  | "compare"
  | "external"
  | "coverage"
  | "statistics"
  | "report"
  | "provenance";

type TopicDetailDto = {
  topicId: string;
  title: string;
  language?: string;
  updated_at?: string;
  markdown_export?: string;
  markdown_hash?: string;
  artifact_hash?: string;
  paper_count?: number;
  external_literature_count?: number;
  topic?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  positioning?: Record<string, unknown>;
  taxonomy?: Record<string, unknown>;
  improvement_dimension_summary?: Record<string, unknown>;
  improvement_dimensions?: unknown[];
  comparison_matrix?: Record<string, unknown>;
  claims?: unknown[];
  timeline_events?: unknown[] | Record<string, unknown>;
  paper_evidence?: unknown[];
  external_literature_analysis?: Record<string, unknown>;
  debates?: unknown[];
  coverage?: Record<string, unknown>;
  statistics?: Record<string, unknown>;
  synthesis_report?: Record<string, unknown>;
  gaps?: unknown[];
  review_outline?: Record<string, unknown>;
  evidence_map?: Record<string, unknown>;
  source_artifacts?: unknown;
  diagnostics?: unknown;
  artifact_provenance?: Record<string, unknown>;
  manifest?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  paths?: Record<string, unknown>;
};

type DigestModalState = {
  status: "loading" | "available" | "unavailable";
  evidence?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

type ActionOperation = {
  key: string;
  command: string;
  status: "pending" | "running" | "queued" | "completed" | "failed";
  label?: string;
  started_at?: string;
  completed_at?: string;
  message?: string;
};

type BackgroundJobStatus =
  | "submitted"
  | "queued"
  | "running"
  | "waiting"
  | "failed";

type BackgroundJobProgress =
  | {
      mode: "indeterminate";
      label?: string;
    }
  | {
      mode: "determinate";
      percent: number;
      current?: number;
      total?: number;
      label?: string;
    };

type BackgroundJobRow = {
  job_id: string;
  source: string;
  status: BackgroundJobStatus;
  label: string;
  detail?: string;
  updated_at?: string;
  command?: string;
  targetTab?: SynthesisTab;
  progress?: BackgroundJobProgress;
};

type OptimisticReviewDecision = {
  key: string;
  operationKey: string;
  createdAt: number;
};

type ReferenceProposalAction =
  | "accept"
  | "reverse_accept"
  | "reject"
  | "reopen"
  | "delete";

type PendingReferenceProposalDecision = {
  proposalId: string;
  action: ReferenceProposalAction;
  createdAt: number;
};

type ReferenceProposalSubmission = {
  operationKey: string;
  proposalIds: string[];
};

type WorkbenchSurfaceRuntime = {
  status: "missing" | "loading" | "ready" | "stale" | "failed";
  revision: number;
  error?: string;
  snapshot?: Snapshot;
};

const STATUSBAR_COMPLETED_TIMEOUT_MS = 4000;
const STATUSBAR_FAILED_TIMEOUT_MS = 8000;
const STATUSBAR_WARNING_TIMEOUT_MS = 8000;
const STATUSBAR_EXPIRY_RENDER_GRACE_MS = 25;
const GRAPH_MIN_ZOOM_RATIO = 0.12;
const GRAPH_MAX_ZOOM_RATIO = 2.4;
const GRAPH_ZOOM_SLIDER_MAX = 100;
const GRAPH_LIBRARY_BASE_NODE_SIZE = 4.6;
const GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE = 3;
const GRAPH_SINGLE_EXTERNAL_BASE_NODE_SIZE = 2;
const GRAPH_LIBRARY_NODE_SIZE_CAP = 8;
const GRAPH_EXTERNAL_NODE_SIZE_CAP = 4.8;
const GRAPH_IMPORTANCE_HALO_TOP_RATIO = 0.1;
const GRAPH_IMPORTANCE_HALO_MAX = 8;
const GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT = "rgba(37, 99, 235, 0.52)";
const GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT = "rgba(37, 99, 235, 0.22)";
const GRAPH_LIBRARY_IMPORTANCE_HALO_DARK = "rgba(147, 197, 253, 0.82)";
const GRAPH_LIBRARY_IMPORTANCE_HALO_DARK_SOFT = "rgba(147, 197, 253, 0.32)";
const GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT = "rgba(180, 83, 9, 0.56)";
const GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT_SOFT = "rgba(180, 83, 9, 0.22)";
const GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK = "rgba(251, 191, 36, 0.86)";
const GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK_SOFT = "rgba(251, 191, 36, 0.34)";

const state: {
  snapshot: Snapshot | null;
  lastChromeSignature?: string;
  lastContentSignature?: string;
  artifactReader?: ArtifactReaderDto;
  topicDetail?: TopicDetailDto;
  topicDetailSection: TopicDetailSection;
  selectedEvidenceId?: string;
  evidenceExplorerOpen: boolean;
  sidebarExpanded: boolean;
  explorerWidth: number;
  digestModal?: DigestModalState;
  sigma?: Sigma;
  sigmaResizeObserver?: ResizeObserver;
  graph?: Graph;
  hoveredNode?: string;
  hoverLabelNode?: string;
  hoverClearTimer?: number;
  graphSearchDraft?: string;
  dynamicHoverNodeIds: Set<string>;
  dynamicHoverEdgeIds: Set<string>;
  localPendingActions: Map<string, ActionOperation>;
  optimisticReviewDecisions: Map<string, OptimisticReviewDecision>;
  pendingReferenceProposalDecisions: Map<
    string,
    PendingReferenceProposalDecision
  >;
  selectedReferenceProposalIds: Set<string>;
  referenceProposalSubmission?: ReferenceProposalSubmission;
  surfaces: Record<string, WorkbenchSurfaceRuntime>;
  lastLocalAction?: ActionOperation;
  statusbarExpirations: Map<string, number>;
  statusbarTimer?: number;
  jobPopoverOpen: boolean;
  tagImportOpen: boolean;
  dismissedTagImportPreviewSignature?: string;
  autoLayoutRequests: Set<string>;
  registryExpandedRows: Set<string>;
  registryLoadingReferenceRows: Set<string>;
} = {
  snapshot: null,
  topicDetailSection: "overview",
  evidenceExplorerOpen: false,
  sidebarExpanded: false,
  explorerWidth: 360,
  localPendingActions: new Map(),
  optimisticReviewDecisions: new Map(),
  pendingReferenceProposalDecisions: new Map(),
  selectedReferenceProposalIds: new Set(),
  surfaces: {},
  statusbarExpirations: new Map(),
  jobPopoverOpen: false,
  tagImportOpen: false,
  autoLayoutRequests: new Set(),
  registryExpandedRows: new Set(),
  registryLoadingReferenceRows: new Set(),
  dynamicHoverNodeIds: new Set(),
  dynamicHoverEdgeIds: new Set(),
};

const colors: Record<GraphNodeKind, string> = {
  library_paper: "#1967b3",
  external_reference: "#7a861f",
};

const CITATION_GRAPH_EDGE_SIZE = 1.05;
const CITATION_GRAPH_INCOMING_EDGE_COLOR = "#d97706";
const CITATION_GRAPH_OUTGOING_EDGE_COLOR = "#7c3aed";

function sendAction(action: string, payload: Record<string, unknown> = {}) {
  if (action === "selectTab" && state.snapshot) {
    const tab = textValue(payload.tab) as SynthesisTab;
    if (
      tab === "overview" ||
      tab === "artifacts" ||
      tab === "registry" ||
      tab === "reviews" ||
      tab === "tags" ||
      tab === "concepts" ||
      tab === "graph" ||
      tab === "reader"
    ) {
      state.snapshot = {
        ...state.snapshot,
        selectedTab: tab,
      };
      const surface = surfaceForTab(tab);
      if (
        surfaceRuntime(surface)?.status === "ready" &&
        restoreCachedSurfaceSnapshot(surface, tab)
      ) {
        // Keep the cached surface visible while the host decides whether it is stale.
      } else {
        markSurfaceRuntime(surface, "loading");
      }
      renderSelectedTabShell();
    }
  }
  if (action === "hostCommand") {
    const command = textValue(payload.command);
    const args = recordValue(payload.args);
    const key = operationKey(command, args);
    if (key) {
      const reviewKey = reviewDecisionKey(command, args);
      if (reviewKey) {
        state.optimisticReviewDecisions.set(reviewKey, {
          key: reviewKey,
          operationKey: key,
          createdAt: Date.now(),
        });
      }
      if (command === "applyReferenceMatchProposalActions") {
        const proposalIds = referenceProposalDecisionArray(args.decisions).map(
          (decision) => decision.proposalId,
        );
        if (proposalIds.length) {
          state.referenceProposalSubmission = {
            operationKey: key,
            proposalIds,
          };
        }
      }
      state.localPendingActions.set(key, {
        key,
        command,
        status: "pending",
        label: operationLabel(command),
        started_at: new Date().toISOString(),
      });
      renderWorkbenchChrome();
    }
  }
  const direct = window.__zoteroSkillsSynthesisWorkbenchBridge;
  if (direct && typeof direct.postMessage === "function") {
    void Promise.resolve(direct.postMessage(action, payload)).catch(() => {
      // Fall through behavior is handled by later user actions.
    });
    return;
  }
  const message = { type: "synthesis:action", action, payload };
  const targets = [window.parent, window.top, window.opener];
  const seen = new Set<Window>();
  for (const target of targets) {
    if (!target || seen.has(target)) {
      continue;
    }
    seen.add(target);
    try {
      target.postMessage(message, "*");
    } catch {
      // ignore bridge target failures
    }
  }
}

function reviewDecisionKey(
  command: string,
  args: Record<string, unknown> = {},
) {
  switch (command) {
    case "acceptTopicGraphRelation":
    case "rejectTopicGraphRelation":
      return `topic-edge:${keyPart(args.edgeId)}`;
    case "applyTopicGraphReviewAction":
      return `topic-review:${keyPart(args.reviewId)}`;
    case "applyConceptReviewAction":
      return `concept-review:${keyPart(args.reviewId)}`;
    case "applyReferenceMatchProposalAction":
      return `reference-match:${keyPart(args.proposalId)}`;
    case "applyTagVocabularyImport":
      return `tag-import:${keyPart(args.action)}`;
    case "resolveGitSyncConflict":
      return `git-conflict:${keyPart(args.assetPath, "current")}:${keyPart(args.action)}`;
    default:
      return "";
  }
}

function isReviewOptimisticallyResolved(kind: string, id: unknown) {
  const key = `${kind}:${keyPart(id)}`;
  return state.optimisticReviewDecisions.has(key);
}

function keyPart(value: unknown, fallback = "all") {
  return textValue(value, fallback).replace(/\s+/g, "_") || fallback;
}

function normalizeGraphLayoutAlgorithm(value: unknown) {
  const algorithm = textValue(value).trim();
  return algorithm === "radial" || algorithm === "components"
    ? algorithm
    : "force";
}

function operationKey(command: string, args: Record<string, unknown> = {}) {
  if (!command) return "";
  switch (command) {
    case "manualRecomputeLayout":
      return `${command}:${normalizeGraphLayoutAlgorithm(args.algorithm || args.preset)}`;
    case "applyConceptReviewAction":
      return `${command}:${keyPart(args.reviewId)}`;
    case "applyTopicGraphReviewAction":
      return `${command}:${keyPart(args.reviewId)}`;
    case "applyReferenceMatchProposalActions":
      return command;
    case "acceptTopicGraphRelation":
    case "rejectTopicGraphRelation":
      return `decideTopicGraphRelation:${keyPart(args.edgeId)}`;
    case "applyTagVocabularyImport":
      return `${command}:${keyPart(args.action)}`;
    case "updateStagedTagSuggestion":
      return `${command}:${keyPart(args.originalTag || args.tag)}`;
    case "promoteStagedTagSuggestions":
    case "discardStagedTagSuggestions":
      return `${command}:${keyPart(args.tag || (Array.isArray(args.tags) ? args.tags.join("_") : ""))}`;
    case "submitTopicSynthesisUpdate":
      return `${command}:${keyPart(args.topicId)}:${keyPart(args.language, "auto")}`;
    case "openTopicArtifact":
    case "openCanonicalMarkdown":
    case "copyTopicMarkdownExport":
    case "deleteTopicArtifact":
    case "resolveTopicPaperDigest":
      return `${command}:${keyPart(args.topicId)}`;
    default:
      return command;
  }
}

function operationLabel(command: string) {
  const labels: Record<string, string> = {
    manualRecomputeLayout: "Rebuilding graph layout",
    validateTagVocabulary: "Validating tags",
    previewTagVocabularyImport: "Previewing tag import",
    applyTagVocabularyImport: "Applying tag import",
    exportTagVocabulary: "Exporting tags",
    updateStagedTagSuggestion: "Updating staged tag",
    promoteStagedTagSuggestions: "Promoting staged tags",
    discardStagedTagSuggestions: "Discarding staged tags",
    clearStagedTagSuggestions: "Clearing staged tags",
    rebuildTagVocabularyIndex: "Rebuilding tag index",
    rebuildConceptKbIndex: "Rebuilding concept index",
    applyConceptReviewAction: "Applying concept review",
    updateConceptDisplayText: "Updating concept text",
    acceptTopicGraphRelation: "Accepting topic relation",
    rejectTopicGraphRelation: "Rejecting topic relation",
    applyTopicGraphReviewAction: "Applying topic graph review",
    refreshReferenceSidecarNow: "Refreshing reference sidecar",
    retryReferenceSidecarRefresh: "Retrying reference sidecar refresh",
    runAdvancedReferenceMatchingNow: "Running advanced reference matching",
    retryAdvancedReferenceMatching: "Retrying advanced reference matching",
    applyReferenceMatchProposalAction: "Applying reference match proposal",
    applyReferenceMatchProposalActions: "Applying reference match proposals",
    refreshCitationGraphCacheIncrementalNow:
      "Refreshing citation graph cache incrementally",
    rebuildCitationGraphCacheNow: "Rebuilding citation graph cache",
    retryCitationGraphCacheRebuild: "Retrying citation graph cache rebuild",
    runSynthesizeTopic: "Starting topic synthesis",
    submitTopicSynthesisUpdate: "Starting topic update",
    syncNow: "Running sync",
    pauseGitSync: "Pausing sync",
    resumeGitSync: "Resuming sync",
    retryGitSync: "Retrying sync",
    resolveGitSyncConflict: "Resolving sync conflict",
    deleteTopicArtifact: "Deleting topic artifact",
    purgeDeletedTopicArtifacts: "Purging deleted artifacts",
  };
  return labels[command] || command;
}

function snapshotInFlightKeys(snapshot = state.snapshot) {
  return new Set((snapshot?.actions?.inFlight || []).map((entry) => entry.key));
}

function isOperationPending(
  command: string,
  args: Record<string, unknown> = {},
) {
  const key = operationKey(command, args);
  return Boolean(
    key &&
    (state.localPendingActions.has(key) || snapshotInFlightKeys().has(key)),
  );
}

function clearResolvedLocalPending(snapshot: Snapshot | null) {
  if (!snapshot) return;
  const serverKeys = snapshotInFlightKeys(snapshot);
  const completedKey = snapshot.actions?.lastCompleted?.key;
  const failedKey = snapshot.actions?.lastFailed?.key;
  const submittedReferenceDecisions = state.referenceProposalSubmission;
  for (const key of Array.from(state.localPendingActions.keys())) {
    if (!serverKeys.has(key) || key === completedKey || key === failedKey) {
      state.localPendingActions.delete(key);
    }
  }
  if (
    submittedReferenceDecisions &&
    submittedReferenceDecisions.operationKey === completedKey
  ) {
    submittedReferenceDecisions.proposalIds.forEach((proposalId) => {
      state.pendingReferenceProposalDecisions.delete(proposalId);
      state.selectedReferenceProposalIds.delete(proposalId);
    });
    state.referenceProposalSubmission = undefined;
  } else if (
    submittedReferenceDecisions &&
    submittedReferenceDecisions.operationKey === failedKey
  ) {
    state.referenceProposalSubmission = undefined;
  }
  if (failedKey) {
    for (const [key, decision] of state.optimisticReviewDecisions) {
      if (decision.operationKey === failedKey) {
        state.optimisticReviewDecisions.delete(key);
      }
    }
  }
  pruneOptimisticReviewDecisions(snapshot);
  pruneReferenceProposalUiState(snapshot);
  state.lastLocalAction =
    snapshot.actions?.lastFailed ||
    snapshot.actions?.lastCompleted ||
    state.lastLocalAction;
}

function snapshotHasReviewItem(snapshot: Snapshot, key: string) {
  const separator = key.indexOf(":");
  if (separator < 0) return false;
  const kind = key.slice(0, separator);
  const id = key.slice(separator + 1);
  if (!id) return false;
  if (kind === "cleanup") {
    return (snapshot.registry.cleanupProposals || []).some(
      (proposal) =>
        proposal.status === "open" && keyPart(proposal.proposal_id) === id,
    );
  }
  if (kind === "reference-match") {
    return (snapshot.registry.matchProposals || []).some(
      (proposal) =>
        proposal.status === "open" && keyPart(proposal.proposal_id) === id,
    );
  }
  if (kind === "topic-edge") {
    return (snapshot.topicGraph.inspector.suggestedRelations || []).some(
      (relation) => keyPart(relation.edge_id) === id,
    );
  }
  if (kind === "topic-review") {
    return (snapshot.topicGraph.inspector.relationReviewItems || []).some(
      (item) => item.status === "open" && keyPart(item.review_id) === id,
    );
  }
  if (kind === "concept-review") {
    return (snapshot.concepts.reviewItems || []).some(
      (item) => item.status === "open" && keyPart(item.review_id) === id,
    );
  }
  return true;
}

function pruneOptimisticReviewDecisions(snapshot: Snapshot) {
  for (const key of Array.from(state.optimisticReviewDecisions.keys())) {
    if (!snapshotHasReviewItem(snapshot, key)) {
      state.optimisticReviewDecisions.delete(key);
    }
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (typeof text === "string") {
    node.textContent = text;
  }
  return node;
}

function iconSvg(
  name:
    | "home"
    | "topics"
    | "graph"
    | "index"
    | "review"
    | "tags"
    | "concepts"
    | "controls"
    | "panel-open"
    | "panel-close"
    | "jobs",
) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const paths: Record<typeof name, string[]> = {
    home: ["M3.5 10.5 12 3.5l8.5 7", "M5.5 9.5V20h4.8v-5.7h3.4V20h4.8V9.5"],
    topics: [
      "M7 4.5h8.5L19 8v11.5H7z",
      "M15.5 4.5V8H19",
      "M5 7.5H3v12h2",
      "M10 12h6",
      "M10 15h4",
    ],
    graph: [
      "M7 7.5 12 12l5-4.5",
      "M7 16.5 12 12l5 4.5",
      "M5.2 5.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6",
      "M18.8 5.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6",
      "M12 9.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6",
      "M5.2 14.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6",
      "M18.8 14.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6",
    ],
    index: [
      "M8 6h12",
      "M8 12h12",
      "M8 18h12",
      "M4 6h.01",
      "M4 12h.01",
      "M4 18h.01",
    ],
    review: ["M6 4.5h12v15H6z", "M9 8h6", "M9 12h4", "M8.5 16l1.5 1.5 3-3"],
    tags: ["M20 12.5 12.5 20 4 11.5V4h7.5z", "M8.5 8.5h.01", "M14 7l3 3"],
    concepts: [
      "M9 18h6",
      "M10 21h4",
      "M8.5 14.5c-1.7-1.2-2.5-2.9-2.5-5a6 6 0 1 1 12 0c0 2.1-.9 3.8-2.5 5l-1.2.9c-.5.4-.8 1-.8 1.6H10c0-.7-.3-1.2-.8-1.6z",
    ],
    controls: [
      "M4 7h4",
      "M12 7h8",
      "M8 5v4",
      "M4 12h10",
      "M18 12h2",
      "M14 10v4",
      "M4 17h8",
      "M16 17h4",
      "M16 15v4",
    ],
    "panel-open": ["M4 5h16v14H4z", "M9 5v14", "M13 9l3 3-3 3"],
    "panel-close": ["M4 5h16v14H4z", "M9 5v14", "M16 9l-3 3 3 3"],
    jobs: [
      "M5 7h14",
      "M5 12h14",
      "M5 17h14",
      "M3 7h.01",
      "M3 12h.01",
      "M3 17h.01",
    ],
  };
  paths[name].forEach((data) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", data);
    svg.appendChild(path);
  });
  return svg;
}

function clear(node: Element) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function badge(text: unknown, tone = "") {
  return el("span", `badge ${tone}`, String(text || "-"));
}

function renderEmptyState({
  title,
  message,
  action,
  tone = "default",
}: {
  title: string;
  message?: string;
  action?: HTMLElement;
  tone?: "default" | "info" | "warning";
}) {
  const empty = el("div", `empty-state empty-state-${tone}`);
  empty.appendChild(el("strong", "empty-state-title", title));
  if (message) {
    empty.appendChild(el("p", "empty-state-message", message));
  }
  if (action) {
    const actions = el("div", "empty-state-actions");
    actions.appendChild(action);
    empty.appendChild(actions);
  }
  return empty;
}

function renderDetailList(fields: Array<[string, unknown]>) {
  const list = el("div", "detail-list");
  fields.forEach(([label, value]) => {
    const row = el("div", "detail-row");
    row.appendChild(el("span", "muted", label));
    row.appendChild(el("strong", "", textValue(value, "-") || "-"));
    list.appendChild(row);
  });
  return list;
}

function toneFor(value: unknown) {
  if (value === "ready" || value === "fresh" || value === "complete") {
    return "ok";
  }
  if (value === "missing" || value === "failed") {
    return "danger";
  }
  if (value === "stale" || value === "refreshing") {
    return "warn";
  }
  return "warn";
}

function makeButton(
  label: string,
  action: string,
  payload: Record<string, unknown> = {},
  active = false,
  disabled = false,
) {
  const hostCommand =
    action === "hostCommand" ? textValue(payload.command) : "";
  const hostArgs = action === "hostCommand" ? recordValue(payload.args) : {};
  const pending = hostCommand
    ? isOperationPending(hostCommand, hostArgs)
    : false;
  const button = el(
    "button",
    `${active ? "active" : ""}${pending ? " is-busy" : ""}`.trim(),
    label,
  );
  button.type = "button";
  button.disabled = disabled || pending;
  if (pending) {
    button.setAttribute("aria-busy", "true");
    button.title = `${operationLabel(hostCommand)} is in progress`;
    const spinner = el("span", "button-spinner");
    spinner.setAttribute("aria-hidden", "true");
    button.prepend(spinner);
  }
  button.addEventListener("click", () => sendAction(action, payload));
  return button;
}

function makeLocalButton(label: string, onClick: () => void, active = false) {
  const button = el("button", active ? "active" : "", label);
  button.type = "button";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    onClick();
  });
  return button;
}

function titleForTab(tab: Snapshot["selectedTab"]) {
  if (tab === "reader") {
    return (
      state.topicDetail?.title || state.artifactReader?.title || "Topic Detail"
    );
  }
  if (tab === "artifacts") return "Topics";
  if (tab === "registry") return "Index";
  if (tab === "tags") return "Tags";
  if (tab === "concepts") return "Concepts";
  if (tab === "graph") return "Citation Graph";
  if (tab === "reviews") return "Review";
  return "Home";
}

function surfaceForTab(tab: Snapshot["selectedTab"]): WorkbenchSurfaceName {
  if (tab === "overview") return "home";
  if (tab === "artifacts") return "topics";
  if (tab === "registry") return "index";
  if (tab === "reviews") return "review";
  return tab;
}

function surfaceRuntimeKey(
  surface: WorkbenchSurfaceName,
  snapshot: Snapshot | null = state.snapshot,
) {
  if (surface !== "index") {
    return surface;
  }
  const scope = textValue(snapshot?.registry?.filters?.scope, "library");
  return `index:${
    scope === "referenced" ? "referenced" : scope === "all" ? "all" : "library"
  }`;
}

function surfaceRuntime(surface: WorkbenchSurfaceName) {
  return state.surfaces[surfaceRuntimeKey(surface)];
}

function markSurfaceRuntime(
  surface: WorkbenchSurfaceName,
  status: WorkbenchSurfaceRuntime["status"],
  error?: string,
  snapshot?: Snapshot,
) {
  const key = surfaceRuntimeKey(surface, snapshot || state.snapshot);
  const previous = state.surfaces[key];
  state.surfaces[key] = {
    status,
    revision: (previous?.revision || 0) + 1,
    error,
    snapshot: snapshot || previous?.snapshot,
  };
}

function restoreCachedSurfaceSnapshot(
  surface: WorkbenchSurfaceName,
  selectedTab: SynthesisTab,
) {
  const cached = surfaceRuntime(surface)?.snapshot;
  if (!cached || !state.snapshot) {
    return false;
  }
  state.snapshot = {
    ...cached,
    selectedTab,
    actions: state.snapshot.actions,
    maintenance: state.snapshot.maintenance || cached.maintenance,
    storage: state.snapshot.storage || cached.storage,
    sync: state.snapshot.sync || cached.sync,
  };
  return true;
}

function actionStatusbarKey(
  entry: ActionOperation,
  statusOverride: ActionOperation["status"] | "warning" = entry.status,
) {
  const identity =
    entry.key || entry.command || entry.label || entry.message || "unknown";
  const stamp = entry.completed_at || entry.started_at || entry.message || "";
  return `${statusOverride}:${identity}:${stamp}`;
}

function scheduleStatusbarExpiry(delayMs: number) {
  if (state.statusbarTimer) {
    window.clearTimeout(state.statusbarTimer);
  }
  state.statusbarTimer = window.setTimeout(
    () => {
      state.statusbarTimer = undefined;
      renderWorkbenchChrome();
    },
    Math.max(0, delayMs) + STATUSBAR_EXPIRY_RENDER_GRACE_MS,
  );
}

function pruneExpiredStatusbarEntries(now = Date.now()) {
  for (const [key, expiresAt] of Array.from(state.statusbarExpirations)) {
    if (expiresAt <= now) {
      state.statusbarExpirations.delete(key);
    }
  }
}

function shouldShowTimedStatusbarEntry(
  entry: ActionOperation | undefined,
  timeoutMs: number,
  statusOverride:
    | ActionOperation["status"]
    | "warning"
    | undefined = entry?.status,
) {
  if (!entry || !statusOverride) {
    return false;
  }
  const now = Date.now();
  pruneExpiredStatusbarEntries(now);
  const key = actionStatusbarKey(entry, statusOverride);
  let expiresAt = state.statusbarExpirations.get(key);
  if (!expiresAt) {
    expiresAt = now + timeoutMs;
    state.statusbarExpirations.set(key, expiresAt);
  }
  if (expiresAt <= now) {
    return false;
  }
  scheduleStatusbarExpiry(expiresAt - now);
  return true;
}

function statusbarMessage(entry: ActionOperation) {
  const label = textValue(entry.label, entry.command || "Action");
  const message = textValue(entry.message);
  return message ? `${label} - ${message}` : label;
}

function activeActionPriority(status: ActionOperation["status"]) {
  if (status === "running") return 0;
  if (status === "pending") return 1;
  if (status === "queued") return 2;
  return 3;
}

function listActiveActionOperations(snapshot: Snapshot) {
  const rows = new Map<string, ActionOperation>();
  const accept = (entry: ActionOperation | null | undefined) => {
    if (!entry || entry.status === "completed" || entry.status === "failed") {
      return;
    }
    const key = entry.key || operationKey(entry.command);
    if (!key) {
      return;
    }
    const existing = rows.get(key);
    if (
      !existing ||
      textValue(entry.started_at).localeCompare(
        textValue(existing.started_at),
      ) >= 0
    ) {
      rows.set(key, { ...entry, key });
    }
  };
  for (const entry of snapshot.actions?.inFlight || []) {
    accept(entry);
  }
  for (const entry of state.localPendingActions.values()) {
    accept(entry);
  }
  return Array.from(rows.values()).sort(
    (left, right) =>
      activeActionPriority(left.status) - activeActionPriority(right.status) ||
      textValue(right.started_at).localeCompare(textValue(left.started_at)),
  );
}

function backgroundJobPriority(status: BackgroundJobStatus) {
  if (status === "running") return 0;
  if (status === "waiting") return 1;
  if (status === "queued") return 2;
  if (status === "submitted") return 3;
  return 4;
}

function listBackgroundJobs(snapshot: Snapshot) {
  const rows = new Map<string, BackgroundJobRow>();
  const accept = (row: BackgroundJobRow | null) => {
    if (!row) return;
    const existing = rows.get(row.job_id);
    if (
      !existing ||
      textValue(row.updated_at).localeCompare(textValue(existing.updated_at)) >=
        0
    ) {
      rows.set(row.job_id, row);
    }
  };
  for (const entry of snapshot.maintenance?.backgroundJobs?.rows || []) {
    accept(entry);
  }
  return Array.from(rows.values()).sort(
    (left, right) =>
      backgroundJobPriority(left.status) -
        backgroundJobPriority(right.status) ||
      textValue(right.updated_at).localeCompare(textValue(left.updated_at)),
  );
}

function statusLabelForJob(status: BackgroundJobStatus) {
  if (status === "submitted") return "Submitted";
  if (status === "queued") return "Queued";
  if (status === "running") return "Running";
  if (status === "waiting") return "Waiting";
  return "Failed";
}

function sourceLabelForJob(source: string) {
  const labels: Record<string, string> = {
    workbench: "Workbench",
    operation: "Operation",
    citation_graph_layout: "Graph layout",
    git_sync: "Git Sync",
    canonical_maintenance: "Canonical",
  };
  return labels[source] || source || "Synthesis";
}

function progressLabel(progress: BackgroundJobProgress | undefined) {
  if (!progress) return "";
  if (progress.mode === "determinate") {
    if (progress.label) return `${progress.label} - ${progress.percent}%`;
    if (progress.total) return `${progress.current || 0}/${progress.total}`;
    return `${progress.percent}%`;
  }
  return progress.label || "In progress";
}

function renderStatusbarProgress(progress: BackgroundJobProgress | undefined) {
  const meter = el(
    "span",
    `action-statusbar-progress ${
      progress?.mode === "determinate" ? "is-determinate" : "is-indeterminate"
    }`,
  );
  meter.setAttribute("aria-hidden", "true");
  const fill = el("span", "action-statusbar-progress-fill");
  if (progress?.mode === "determinate") {
    fill.style.width = `${progress.percent}%`;
  }
  meter.appendChild(fill);
  return meter;
}

function handleBackgroundJobOpen(job: BackgroundJobRow) {
  state.jobPopoverOpen = false;
  if (job.command) {
    sendAction("hostCommand", {
      command: job.command,
      args: {},
    });
    return;
  }
  if (job.targetTab && job.targetTab !== "reader") {
    sendAction("selectTab", { tab: job.targetTab });
    return;
  }
  render();
}

function renderBackgroundJobPopover(jobs: BackgroundJobRow[]) {
  const popover = el("div", "action-statusbar-job-popover");
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", "Synthesis jobs");
  const header = el("div", "action-statusbar-job-popover-header");
  header.appendChild(el("strong", "", "Synthesis jobs"));
  const close = el("button", "icon-only action-statusbar-job-popover-close");
  close.type = "button";
  close.title = "Close";
  close.setAttribute("aria-label", "Close");
  close.textContent = "x";
  close.addEventListener("click", () => {
    state.jobPopoverOpen = false;
    render();
  });
  header.appendChild(close);
  popover.appendChild(header);

  if (!jobs.length) {
    popover.appendChild(
      el("div", "action-statusbar-job-empty", "No active Synthesis jobs."),
    );
    return popover;
  }

  const list = el("div", "action-statusbar-job-list");
  jobs.slice(0, 10).forEach((job) => {
    const isRunning = job.status === "running";
    const row = el("button", `action-statusbar-job-row is-${job.status}`);
    row.type = "button";
    row.addEventListener("click", () => handleBackgroundJobOpen(job));
    const meta = el("span", "action-statusbar-job-meta");
    meta.appendChild(
      el(
        "span",
        `action-statusbar-job-state is-${job.status}`,
        statusLabelForJob(job.status),
      ),
    );
    meta.appendChild(
      el("span", "action-statusbar-job-source", sourceLabelForJob(job.source)),
    );
    const title = el("span", "action-statusbar-job-title", job.label);
    const detail = el(
      "span",
      "action-statusbar-job-detail",
      [job.detail, isRunning ? progressLabel(job.progress) : ""]
        .filter(Boolean)
        .join(" - "),
    );
    row.appendChild(meta);
    row.appendChild(title);
    if (detail.textContent) {
      row.appendChild(detail);
    }
    if (isRunning && job.progress) {
      row.appendChild(renderStatusbarProgress(job.progress));
    }
    list.appendChild(row);
  });
  popover.appendChild(list);
  return popover;
}

function renderActionStatusbar(snapshot: Snapshot) {
  const jobs = listBackgroundJobs(snapshot);
  const activeJobs = jobs.filter((job) => job.status !== "failed");
  const activeActions = listActiveActionOperations(snapshot);
  const failedJob = jobs.find((job) => job.status === "failed");
  const latestWarning = (snapshot.actions?.warnings || []).slice(-1)[0];
  const failed =
    snapshot.actions?.lastFailed ||
    (state.lastLocalAction?.status === "failed"
      ? state.lastLocalAction
      : undefined);
  const completed =
    snapshot.actions?.lastCompleted ||
    (state.lastLocalAction?.status === "completed"
      ? state.lastLocalAction
      : undefined);
  const statusbar = el("footer", "action-statusbar is-idle");
  statusbar.setAttribute("role", "status");
  statusbar.setAttribute("aria-live", "polite");

  const appendJobButton = () => {
    const button = el("button", "action-statusbar-job-button");
    button.type = "button";
    button.title = "Show Synthesis jobs";
    button.setAttribute("aria-label", "Show Synthesis jobs");
    button.setAttribute(
      "aria-expanded",
      state.jobPopoverOpen ? "true" : "false",
    );
    button.appendChild(iconSvg("jobs"));
    const count = jobs.length;
    if (count > 0) {
      button.appendChild(
        el("span", "action-statusbar-job-button-count", String(count)),
      );
    }
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.jobPopoverOpen = !state.jobPopoverOpen;
      renderWorkbenchChrome();
    });
    const wrap = el("span", "action-statusbar-job-anchor");
    wrap.appendChild(button);
    if (state.jobPopoverOpen) {
      wrap.appendChild(renderBackgroundJobPopover(jobs));
    }
    statusbar.appendChild(wrap);
  };

  if (activeJobs.length) {
    const latest = activeJobs[0];
    const label = statusLabelForJob(latest.status);
    statusbar.className = "action-statusbar is-busy";
    statusbar.appendChild(renderStatusbarProgress(latest.progress));
    statusbar.appendChild(el("span", "action-statusbar-state", label));
    statusbar.appendChild(
      el(
        "span",
        "action-statusbar-message",
        [latest.label, latest.detail].filter(Boolean).join(" - "),
      ),
    );
    if (activeJobs.length > 1) {
      statusbar.appendChild(
        el("span", "action-statusbar-count", `+${activeJobs.length - 1}`),
      );
    }
    appendJobButton();
    return statusbar;
  }

  if (activeActions.length) {
    const latest = activeActions[0];
    statusbar.className = "action-statusbar is-busy";
    statusbar.appendChild(
      renderStatusbarProgress({
        mode: "indeterminate",
        label: statusbarMessage(latest),
      }),
    );
    statusbar.appendChild(
      el(
        "span",
        "action-statusbar-state",
        latest.status === "running" ? "Running" : "Pending",
      ),
    );
    statusbar.appendChild(
      el("span", "action-statusbar-message", statusbarMessage(latest)),
    );
    if (activeActions.length > 1) {
      statusbar.appendChild(
        el("span", "action-statusbar-count", `+${activeActions.length - 1}`),
      );
    }
    if (jobs.length || state.jobPopoverOpen) appendJobButton();
    return statusbar;
  }

  if (failedJob) {
    statusbar.className = "action-statusbar is-danger";
    statusbar.appendChild(el("span", "action-statusbar-state", "Failed"));
    statusbar.appendChild(
      el(
        "span",
        "action-statusbar-message",
        [failedJob.label, failedJob.detail].filter(Boolean).join(" - "),
      ),
    );
    appendJobButton();
    return statusbar;
  }

  if (
    shouldShowTimedStatusbarEntry(failed, STATUSBAR_FAILED_TIMEOUT_MS, "failed")
  ) {
    statusbar.className = "action-statusbar is-danger";
    statusbar.appendChild(el("span", "action-statusbar-state", "Failed"));
    statusbar.appendChild(
      el("span", "action-statusbar-message", statusbarMessage(failed!)),
    );
    if (jobs.length) appendJobButton();
    return statusbar;
  }

  if (
    shouldShowTimedStatusbarEntry(
      latestWarning,
      STATUSBAR_WARNING_TIMEOUT_MS,
      "warning",
    )
  ) {
    statusbar.className = "action-statusbar is-warn";
    statusbar.appendChild(el("span", "action-statusbar-state", "Warning"));
    statusbar.appendChild(
      el("span", "action-statusbar-message", statusbarMessage(latestWarning!)),
    );
    if (jobs.length) appendJobButton();
    return statusbar;
  }

  if (
    shouldShowTimedStatusbarEntry(
      completed,
      STATUSBAR_COMPLETED_TIMEOUT_MS,
      "completed",
    )
  ) {
    statusbar.className = "action-statusbar is-ok";
    statusbar.appendChild(el("span", "action-statusbar-state", "Completed"));
    statusbar.appendChild(
      el("span", "action-statusbar-message", statusbarMessage(completed!)),
    );
    if (jobs.length) appendJobButton();
    return statusbar;
  }

  statusbar.appendChild(el("span", "action-statusbar-state", "Ready"));
  if (jobs.length || state.jobPopoverOpen) {
    appendJobButton();
  }
  return statusbar;
}

function renderShell(root: HTMLElement, snapshot: Snapshot) {
  clear(root);
  root.classList.toggle("sidebar-expanded", state.sidebarExpanded);
  root.classList.toggle("sidebar-collapsed", !state.sidebarExpanded);

  const sidebar = el("aside", "sidebar");
  const brand = el("div", "brand brand-icon-only");
  const logo = document.createElement("img");
  logo.src = "../icons/favicon.png";
  logo.alt = "Zotero Skills";
  brand.appendChild(logo);
  const sidebarToggle = el("button", "sidebar-collapse-toggle icon-only");
  sidebarToggle.type = "button";
  sidebarToggle.title = state.sidebarExpanded
    ? "Collapse navigation"
    : "Expand navigation";
  sidebarToggle.setAttribute("aria-label", sidebarToggle.title);
  sidebarToggle.setAttribute(
    "aria-expanded",
    state.sidebarExpanded ? "true" : "false",
  );
  sidebarToggle.appendChild(
    iconSvg(state.sidebarExpanded ? "panel-close" : "panel-open"),
  );
  sidebarToggle.addEventListener("click", () => {
    state.sidebarExpanded = !state.sidebarExpanded;
    render();
  });
  brand.appendChild(sidebarToggle);
  sidebar.appendChild(brand);
  const libraryLabel = el(
    "div",
    "muted sidebar-library",
    `Library ${snapshot.libraryId}`,
  );
  sidebar.appendChild(libraryLabel);
  const nav = el("div", "nav");
  [
    ["overview", "Home", "home"],
    ["artifacts", "Topics", "topics"],
    ["tags", "Tags", "tags"],
    ["concepts", "Concepts", "concepts"],
    ["graph", "Graph", "graph"],
    ["registry", "Index", "index"],
    ["reviews", "Review", "review"],
  ].forEach(([tab, label, iconName]) => {
    const button = makeButton(
      "",
      "selectTab",
      { tab },
      snapshot.selectedTab === tab,
    );
    button.dataset.synthesisTab = tab;
    button.title = label;
    button.setAttribute("aria-label", label);
    const icon = el("span", `nav-icon nav-icon-${iconName}`);
    icon.appendChild(
      iconSvg(
        iconName as
          | "home"
          | "topics"
          | "graph"
          | "index"
          | "review"
          | "tags"
          | "concepts",
      ),
    );
    button.appendChild(icon);
    button.appendChild(el("span", "nav-label", label));
    nav.appendChild(button);
  });
  sidebar.appendChild(nav);
  root.appendChild(sidebar);

  const content = el("main", "content");
  const topbar = el("div", "topbar");
  topbar.appendChild(el("h1", "", titleForTab(snapshot.selectedTab)));
  if (snapshot.selectedTab === "reader" && state.topicDetail) {
    topbar.appendChild(renderTopicDetailToolbar(state.topicDetail, snapshot));
  }
  content.appendChild(topbar);
  const main = el("section", "main");
  main.dataset.synthesisSurface = surfaceForTab(snapshot.selectedTab);
  renderCurrentView(main, snapshot);
  content.appendChild(main);
  content.appendChild(renderActionStatusbar(snapshot));
  root.appendChild(content);
}

function renderSelectedTabShell() {
  const root = document.getElementById("app") as HTMLElement | null;
  if (!root || !state.snapshot) {
    render();
    return;
  }
  const main = root.querySelector(".main") as HTMLElement | null;
  const topbar = root.querySelector(".topbar") as HTMLElement | null;
  if (!main || !topbar) {
    render();
    return;
  }
  root
    .querySelectorAll<HTMLButtonElement>("[data-synthesis-tab]")
    .forEach((button: HTMLButtonElement) => {
      const active =
        button.dataset.synthesisTab === state.snapshot?.selectedTab;
      button.classList.toggle("active", active);
    });
  clear(topbar);
  topbar.appendChild(el("h1", "", titleForTab(state.snapshot.selectedTab)));
  if (state.snapshot.selectedTab === "reader" && state.topicDetail) {
    topbar.appendChild(
      renderTopicDetailToolbar(state.topicDetail, state.snapshot),
    );
  }
  if (main.dataset.synthesisSurface === "graph") {
    disposeGraphRenderer();
  }
  const surface = surfaceForTab(state.snapshot.selectedTab);
  main.dataset.synthesisSurface = surface;
  clear(main);
  if (surfaceRuntime(surface)?.status === "ready") {
    renderCurrentView(main, state.snapshot);
    maybeRequestGraphLayoutRefresh(state.snapshot);
  } else {
    main.appendChild(renderSurfaceLoading(surface));
  }
  state.lastContentSignature = "";
}

function renderSurfaceLoading(surface: WorkbenchSurfaceName) {
  const wrap = el("div", "surface-loading");
  wrap.dataset.synthesisSurface = `${surface}-loading`;
  wrap.appendChild(el("div", "loading-spinner"));
  wrap.appendChild(
    el("div", "loading-title", `Loading ${surfaceLabel(surface)}`),
  );
  wrap.appendChild(
    el("div", "loading-subtitle", "Preparing this Workbench view..."),
  );
  return wrap;
}

function surfaceLabel(surface: WorkbenchSurfaceName) {
  if (surface === "home") return "Home";
  if (surface === "topics") return "Topics";
  if (surface === "index") return "Index";
  if (surface === "review") return "Review";
  if (surface === "graph") return "Citation Graph";
  if (surface === "tags") return "Tags";
  if (surface === "concepts") return "Concepts";
  if (surface === "reader") return "Reader";
  return "Synthesis";
}

function renderWorkbenchChrome() {
  const root = document.getElementById("app") as HTMLElement | null;
  if (!root || !state.snapshot) {
    return;
  }
  const existingStatusbar = root.querySelector(".action-statusbar");
  if (existingStatusbar) {
    existingStatusbar.replaceWith(renderActionStatusbar(state.snapshot));
    return;
  }
  render();
}

function renderSurface(surface: WorkbenchSurfaceName) {
  const root = document.getElementById("app") as HTMLElement | null;
  if (!root || !state.snapshot) {
    render();
    return;
  }
  if (surfaceForTab(state.snapshot.selectedTab) !== surface) {
    state.lastContentSignature = snapshotContentSignature(state.snapshot);
    return;
  }
  const main = root.querySelector(".main") as HTMLElement | null;
  if (!main) {
    render();
    return;
  }
  const renderState = captureWorkbenchRenderState(root);
  if (state.snapshot.selectedTab === "graph") {
    disposeGraphRenderer();
  }
  main.dataset.synthesisSurface = surface;
  clear(main);
  renderCurrentView(main, state.snapshot);
  restoreWorkbenchRenderState(root, renderState);
  state.lastContentSignature = snapshotContentSignature(state.snapshot);
  maybeRequestGraphLayoutRefresh(state.snapshot);
}

function disposeGraphRenderer() {
  cancelScheduledHoverClear();
  state.sigmaResizeObserver?.disconnect();
  state.sigmaResizeObserver = undefined;
  state.sigma?.kill();
  state.sigma = undefined;
  state.graph = undefined;
  state.hoveredNode = undefined;
  state.hoverLabelNode = undefined;
  state.dynamicHoverNodeIds.clear();
  state.dynamicHoverEdgeIds.clear();
}

function scheduleSigmaResize(renderer: Sigma, container: HTMLElement) {
  const resize = () => {
    if (!state.sigma || state.sigma !== renderer) {
      return;
    }
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    renderer.resize();
    renderer.refresh();
  };
  window.requestAnimationFrame(resize);
  window.requestAnimationFrame(() => window.requestAnimationFrame(resize));
  setTimeout(resize, 80);
  setTimeout(resize, 240);
}

function renderCurrentView(main: HTMLElement, snapshot: Snapshot) {
  if (snapshot.selectedTab === "reader") {
    if (state.topicDetail) {
      renderTopicDetail(main, snapshot);
    } else {
      renderArtifactReader(main, snapshot);
    }
  } else if (snapshot.selectedTab === "artifacts") {
    renderTopics(main, snapshot);
  } else if (snapshot.selectedTab === "registry") {
    renderIndex(main, snapshot);
  } else if (snapshot.selectedTab === "tags") {
    renderTags(main, snapshot);
  } else if (snapshot.selectedTab === "concepts") {
    renderConcepts(main, snapshot);
  } else if (snapshot.selectedTab === "graph") {
    renderGraph(main, snapshot);
  } else if (snapshot.selectedTab === "reviews") {
    renderReviewCenter(main, snapshot);
  } else {
    renderHome(main, snapshot);
  }
}

function topicPaperCount(row: Record<string, unknown>) {
  const value = Number(row.paper_count || 0);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function topicCompletion(row: Record<string, unknown>) {
  const value = Number(row.completion || 0);
  return Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.floor(value)))
    : 0;
}

function sortedTopTopics(snapshot: Snapshot) {
  return [...snapshot.artifacts.rows]
    .sort(
      (left, right) =>
        topicPaperCount(right) - topicPaperCount(left) ||
        String(right.updated_at || "").localeCompare(
          String(left.updated_at || ""),
        ) ||
        String(left.title || "").localeCompare(String(right.title || "")),
    )
    .slice(0, 8);
}

function renderInsightCard(
  label: string,
  value: unknown,
  detail: string,
  tone = "",
) {
  const card = el("div", `insight-card ${tone}`.trim());
  card.appendChild(el("span", "insight-label", label));
  card.appendChild(el("strong", "insight-value", String(value || "0")));
  card.appendChild(el("span", "insight-detail", detail));
  return card;
}

function renderTopicCard(row: Record<string, unknown>) {
  const card = el("button", "topic-card");
  card.type = "button";
  card.addEventListener("click", () =>
    sendAction("hostCommand", {
      command: "openTopicArtifact",
      args: { topicId: row.id },
    }),
  );
  const title = String(row.title || row.id || "Untitled topic");
  const summary = String(row.summary || row.markdown_preview || "").trim();
  const count = topicPaperCount(row);
  const completion = topicCompletion(row);
  const head = el("div", "topic-card-head");
  head.appendChild(el("strong", "", title));
  head.appendChild(badge(row.freshness, toneFor(row.freshness)));
  card.appendChild(head);
  card.appendChild(
    el(
      "p",
      "topic-card-summary",
      summary || "No topic summary is available yet.",
    ),
  );
  const meter = el("div", "topic-meter");
  const fill = el("span");
  fill.style.width = `${completion}%`;
  meter.appendChild(fill);
  card.appendChild(meter);
  const meta = el("div", "topic-card-meta");
  meta.appendChild(el("span", "", `${count} papers`));
  meta.appendChild(el("span", "", `${completion}% complete`));
  meta.appendChild(el("span", "", String(row.updated_at || "Not updated")));
  card.appendChild(meta);
  return card;
}

function topicUpdateIntent(row: Record<string, unknown>) {
  const intent = row.updateIntent;
  return intent &&
    typeof intent === "object" &&
    !(intent as Record<string, unknown>).blocked
    ? (intent as Record<string, unknown>)
    : null;
}

function topicRowById(snapshot: Snapshot, topicId: string) {
  const id = String(topicId || "").trim();
  if (!id) {
    return null;
  }
  return (
    snapshot.artifacts.rows.find((row) => String(row.id || "") === id) ||
    snapshot.artifacts.visibleRows.find((row) => String(row.id || "") === id) ||
    null
  );
}

function makeTopicUpdateButton(row: Record<string, unknown>) {
  const intent = topicUpdateIntent(row);
  return makeButton(
    String(intent?.actionLabel || "Update"),
    "hostCommand",
    {
      command: "submitTopicSynthesisUpdate",
      args: { topicId: row.id },
    },
    false,
    !intent,
  );
}

function renderHome(main: HTMLElement, snapshot: Snapshot) {
  const shell = el("div", "home-shell");
  const insights = el("section", "workspace-section");
  const insightHeader = el("div", "section-heading");
  insightHeader.appendChild(el("h2", "", "Library Insights"));
  insights.appendChild(insightHeader);
  const grid = el("div", "insight-grid");
  grid.appendChild(
    renderInsightCard(
      "Registered papers",
      snapshot.registry.rows.length,
      "Rows available in the local registry",
      "teal",
    ),
  );
  grid.appendChild(
    renderInsightCard(
      "Topics",
      snapshot.artifacts.rows.length,
      "Generated synthesis artifacts",
      "blue",
    ),
  );
  grid.appendChild(
    renderInsightCard(
      "Graph",
      snapshot.graph.visibleNodes.length,
      `${snapshot.graph.visibleEdges.length} visible edges`,
    ),
  );
  grid.appendChild(
    renderInsightCard(
      "Sync",
      snapshot.sync?.status || "ready",
      `${snapshot.conflicts?.candidates?.length || 0} open conflicts`,
      "orange",
    ),
  );
  insights.appendChild(grid);
  shell.appendChild(insights);
  shell.appendChild(renderGitSyncPanel(snapshot));

  const topics = el("section", "workspace-section");
  const topicHeader = el("div", "section-heading");
  topicHeader.appendChild(el("h2", "", "Top Topics"));
  topicHeader.appendChild(
    makeButton("View All", "selectTab", { tab: "artifacts" }, false),
  );
  topics.appendChild(topicHeader);
  const topicGrid = el("div", "topic-grid");
  const rows = sortedTopTopics(snapshot);
  if (!rows.length) {
    topicGrid.appendChild(
      renderEmptyState({
        title: "No synthesis topics yet",
        message:
          "Create a topic synthesis to populate the topic workspace and graph views.",
        tone: "info",
      }),
    );
  } else {
    rows.forEach((row) => topicGrid.appendChild(renderTopicCard(row)));
  }
  topics.appendChild(topicGrid);
  shell.appendChild(topics);
  main.appendChild(shell);
}

function renderGitSyncPanel(snapshot: Snapshot) {
  const section = el("section", "workspace-section");
  const header = el("div", "section-heading");
  header.appendChild(el("h2", "", "Sync"));
  section.appendChild(header);
  const git = snapshot.sync?.git || {};
  const grid = el("div", "insight-grid");
  grid.appendChild(
    renderInsightCard(
      "Git exchange",
      git.queue_state || "disabled",
      git.paused ? "Paused" : "Canonical store exchange state",
      git.queue_state === "blocked_conflict" ? "orange" : "teal",
    ),
  );
  grid.appendChild(
    renderInsightCard(
      "Remote",
      git.remote_url || "Not configured",
      git.branch ? `Branch ${git.branch}` : "Single remote branch",
      "blue",
    ),
  );
  grid.appendChild(
    renderInsightCard(
      "Last run",
      git.last_run_status || "-",
      git.last_run_at || "No sync run recorded",
    ),
  );
  grid.appendChild(
    renderInsightCard(
      "Review items",
      git.conflict_count || 0,
      "Canonical assets waiting for conflict review",
      "orange",
    ),
  );
  section.appendChild(grid);
  const actions = el("div", "toolbar");
  const allowed = new Set(git.allowedActions || []);
  actions.appendChild(
    makeButton(
      "Sync now",
      "hostCommand",
      { command: "syncNow" },
      false,
      !allowed.has("syncNow"),
    ),
  );
  actions.appendChild(
    makeButton(
      git.paused ? "Resume" : "Pause",
      "hostCommand",
      { command: git.paused ? "resumeGitSync" : "pauseGitSync" },
      false,
      git.paused ? !allowed.has("resumeGitSync") : !allowed.has("pauseGitSync"),
    ),
  );
  actions.appendChild(
    makeButton(
      "Retry",
      "hostCommand",
      { command: "retryGitSync" },
      false,
      !allowed.has("retryGitSync"),
    ),
  );
  actions.appendChild(
    makeButton(
      "Mark reviewed",
      "hostCommand",
      {
        command: "resolveGitSyncConflict",
        args: { action: "resolved" },
      },
      false,
      !allowed.has("resolveGitSyncConflict"),
    ),
  );
  section.appendChild(actions);
  const diagnostics = [
    ...(snapshot.sync?.diagnostics || []),
    ...(git.diagnostics || []),
  ];
  if (diagnostics.length) {
    const list = el("div", "details");
    diagnostics.slice(0, 4).forEach((entry) => {
      list.appendChild(
        el(
          "div",
          "muted",
          `${textValue(entry.code)}: ${textValue(entry.message)}`,
        ),
      );
    });
    section.appendChild(list);
  }
  if (git.queue_state === "blocked_conflict" && git.conflict_assets?.length) {
    const asset = git.conflict_assets[0];
    section.appendChild(
      renderReviewPanel(
        renderReviewCard({
          kind: "Sync review",
          title: textValue(asset.asset_path, "Canonical asset conflict"),
          meta:
            git.conflict_assets.length > 1
              ? `${git.conflict_assets.length - 1} more asset(s) waiting`
              : "One asset waiting",
          body: "This canonical asset changed in more than one place. Review the affected asset before allowing sync to continue.",
          details: [
            ["reason", asset.reason || "both_changed"],
            ["queue state", git.queue_state],
            ["remote", git.remote_url || "not configured"],
            ["branch", git.branch || "-"],
          ],
          actions: [
            makeButton(
              "Mark reviewed",
              "hostCommand",
              {
                command: "resolveGitSyncConflict",
                args: { action: "resolved" },
              },
              false,
              !allowed.has("resolveGitSyncConflict"),
            ),
            makeButton(
              "Skip",
              "hostCommand",
              {
                command: "resolveGitSyncConflict",
                args: { action: "skip" },
              },
              false,
              !allowed.has("resolveGitSyncConflict"),
            ),
          ],
        }),
        "sync-review-panel",
      ),
    );
  }
  return section;
}

function renderTopics(main: HTMLElement, snapshot: Snapshot) {
  const panel = el("div", "panel");
  const filters = el("div", "filters");
  const search = el("input");
  search.dataset.synthesisControlKey = "registry.search";
  search.placeholder = "Search";
  search.value = snapshot.artifacts.filters.search || "";
  search.addEventListener("input", () =>
    sendAction("setFilters", { artifacts: { search: search.value } }),
  );
  filters.appendChild(search);
  filters.appendChild(
    selectControl(
      ["title", "paper_count", "updated_at"],
      snapshot.artifacts.filters.sort || "title",
      (value) => sendAction("setFilters", { artifacts: { sort: value } }),
    ),
  );
  filters.appendChild(
    makeButton(
      "Graph",
      "setFilters",
      { artifacts: { viewMode: "graph" } },
      snapshot.artifacts.filters.viewMode === "graph",
    ),
  );
  filters.appendChild(
    makeButton(
      "List",
      "setFilters",
      { artifacts: { viewMode: "list" } },
      snapshot.artifacts.filters.viewMode === "list",
    ),
  );
  filters.appendChild(
    makeButton(
      "Grid",
      "setFilters",
      { artifacts: { viewMode: "grid" } },
      snapshot.artifacts.filters.viewMode === "grid",
    ),
  );
  filters.appendChild(
    makeButton("Create Topic", "hostCommand", {
      command: "runSynthesizeTopic",
    }),
  );
  filters.appendChild(
    makeButton("Purge Deleted", "hostCommand", {
      command: "purgeDeletedTopicArtifacts",
    }),
  );
  panel.appendChild(renderPanelToolbar(filters));
  if (snapshot.artifacts.filters.viewMode === "graph") {
    panel.appendChild(renderTopicsGraph(snapshot));
  } else if (snapshot.artifacts.filters.viewMode === "grid") {
    const grid = el("div", "topic-grid panel-grid");
    if (!snapshot.artifacts.visibleRows.length) {
      grid.appendChild(
        renderEmptyState({
          title: snapshot.artifacts.rows.length
            ? "No topics match the current filters"
            : "No synthesis topics yet",
          message: snapshot.artifacts.rows.length
            ? "Adjust the search or sort settings to show more topics."
            : "Create a topic synthesis to make it available here.",
          action: makeButton("Create Topic", "hostCommand", {
            command: "runSynthesizeTopic",
          }),
          tone: "info",
        }),
      );
    } else {
      snapshot.artifacts.visibleRows.forEach((row) =>
        grid.appendChild(renderTopicCard(row)),
      );
    }
    panel.appendChild(grid);
  } else {
    panel.appendChild(
      tableView(
        [
          "Title",
          "Papers",
          "Completion",
          "Coverage",
          "Freshness",
          "Updated",
          "Action",
        ],
        snapshot.artifacts.visibleRows,
        (row) => [
          titleWithSummary(
            String(row.title || ""),
            String(row.summary || row.markdown_preview || ""),
          ),
          topicPaperCount(row),
          `${topicCompletion(row)}%`,
          badge(row.coverage, toneFor(row.coverage)),
          badge(row.freshness, toneFor(row.freshness)),
          row.updated_at || "-",
          actionGroup([
            makeButton("Open", "hostCommand", {
              command: "openTopicArtifact",
              args: { topicId: row.id },
            }),
            makeTopicUpdateButton(row),
            makeButton("Delete", "hostCommand", {
              command: "deleteTopicArtifact",
              args: { topicId: row.id },
            }),
          ]),
        ],
        renderEmptyState({
          title: snapshot.artifacts.rows.length
            ? "No topics match the current filters"
            : "No synthesis topics yet",
          message: snapshot.artifacts.rows.length
            ? "Adjust the search or sort settings to show more topics."
            : "Create a topic synthesis to make it available here.",
          action: makeButton("Create Topic", "hostCommand", {
            command: "runSynthesizeTopic",
          }),
          tone: snapshot.artifacts.rows.length ? "default" : "info",
        }),
      ),
    );
  }
  if (snapshot.deletedArtifacts.count > 0) {
    const deleted = el(
      "p",
      "muted",
      `${snapshot.deletedArtifacts.count} deleted artifact(s) waiting for purge.`,
    );
    panel.appendChild(deleted);
  }
  main.appendChild(panel);
}

function renderTopicsGraph(snapshot: Snapshot) {
  const shell = el("div", "topic-graph-layout");
  const board = el("section", "topic-graph-board");
  const toolbar = el("div", "filters topic-graph-controls");
  const modes = [
    ["hierarchy", "Hierarchy"],
    ["neighborhood", "Neighborhood"],
    ["unplaced", "Unplaced"],
  ] as const;
  modes.forEach(([mode, label]) => {
    toolbar.appendChild(
      makeButton(
        label,
        "setTopicGraphView",
        { mode },
        snapshot.topicGraph.filters.mode === mode,
      ),
    );
  });
  const search = el("input");
  search.placeholder = "Search topics";
  search.value = snapshot.topicGraph.filters.search || "";
  search.addEventListener("input", () =>
    sendAction("setTopicGraphView", { search: search.value }),
  );
  toolbar.appendChild(search);
  board.appendChild(toolbar);

  const summary = el("div", "topic-graph-summary");
  summary.appendChild(
    badge(`${snapshot.topicGraph.visibleNodes.length} topics`, "ok"),
  );
  summary.appendChild(
    badge(`${snapshot.topicGraph.visibleEdges.length} relations`, "warn"),
  );
  summary.appendChild(badge(snapshot.topicGraph.filters.mode));
  board.appendChild(summary);

  if (!snapshot.topicGraph.visibleNodes.length) {
    const empty = el("div", "topic-graph-canvas is-empty");
    empty.appendChild(
      renderEmptyState({
        title: snapshot.artifacts.rows.length
          ? "No topics in this graph view"
          : "No topic graph data yet",
        message: snapshot.artifacts.rows.length
          ? "Adjust the graph mode or search terms to reveal existing topics."
          : "Create or update topic synthesis artifacts to make them available here.",
        tone: "info",
      }),
    );
    board.appendChild(empty);
  } else {
    board.appendChild(renderTopicGraphCanvas(snapshot));
  }
  shell.appendChild(board);
  shell.appendChild(renderTopicInspector(snapshot));
  return shell;
}

type TopicGraphLayoutNode = {
  node: Record<string, unknown>;
  x: number;
  y: number;
  role: string;
};

function createSvgElement(tag: string) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function topicGraphNodeId(node: Record<string, unknown>) {
  return textValue(node.topic_id);
}

function distribute(index: number, count: number, min = 14, max = 86) {
  if (count <= 1) {
    return 50;
  }
  return min + ((max - min) * index) / (count - 1);
}

function clampPosition(value: number) {
  return Math.max(8, Math.min(92, value));
}

function topicGraphNodeRole(node: Record<string, unknown>, fallback: string) {
  if (node.is_root || node.level === "top") {
    return "root";
  }
  if (Array.isArray(node.relation_statuses)) {
    if (node.relation_statuses.includes("suggested")) {
      return "suggested";
    }
    if (node.relation_statuses.includes("confirmed")) {
      return "linked";
    }
  }
  return fallback;
}

function computeTopicGraphLayout(snapshot: Snapshot): TopicGraphLayoutNode[] {
  const nodes = snapshot.topicGraph.visibleNodes;
  const byId = new Map(nodes.map((node) => [topicGraphNodeId(node), node]));
  const placed = new Map<string, TopicGraphLayoutNode>();
  const place = (
    node: Record<string, unknown> | undefined,
    x: number,
    y: number,
    role: string,
  ) => {
    if (!node) return;
    const id = topicGraphNodeId(node);
    if (!id || placed.has(id)) return;
    placed.set(id, {
      node,
      x: clampPosition(x),
      y: clampPosition(y),
      role: topicGraphNodeRole(node, role),
    });
  };

  if (
    snapshot.topicGraph.filters.mode === "neighborhood" &&
    snapshot.topicGraph.inspector.topic
  ) {
    const selected = byId.get(
      topicGraphNodeId(snapshot.topicGraph.inspector.topic),
    );
    place(selected, 50, 50, "selected");
    snapshot.topicGraph.inspector.parents.forEach((node, index, group) =>
      place(
        byId.get(topicGraphNodeId(node)),
        distribute(index, group.length),
        18,
        "parent",
      ),
    );
    snapshot.topicGraph.inspector.children.forEach((node, index, group) =>
      place(
        byId.get(topicGraphNodeId(node)),
        distribute(index, group.length),
        82,
        "child",
      ),
    );
    snapshot.topicGraph.inspector.related.forEach((entry, index, group) => {
      const side = index % 2 === 0 ? 20 : 80;
      const row = Math.floor(index / 2);
      const rows = Math.ceil(group.length / 2);
      place(
        byId.get(topicGraphNodeId(entry.node)),
        side,
        distribute(row, rows, 34, 66),
        "related",
      );
    });
    const leftovers = nodes.filter(
      (node) => !placed.has(topicGraphNodeId(node)),
    );
    leftovers.forEach((node, index) =>
      place(node, distribute(index, leftovers.length, 20, 80), 66, "related"),
    );
    return [...placed.values()];
  }

  if (snapshot.topicGraph.filters.mode === "unplaced") {
    const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    const rows = Math.max(1, Math.ceil(nodes.length / columns));
    nodes.forEach((node, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      place(
        node,
        distribute(column, columns, 18, 82),
        distribute(row, rows, 24, 76),
        "unplaced",
      );
    });
    return [...placed.values()];
  }

  const depths = new Map(nodes.map((node) => [topicGraphNodeId(node), 0]));
  const broaderEdges = snapshot.topicGraph.visibleEdges.filter(
    (edge) =>
      textValue(edge.relation) === "broader_than" &&
      byId.has(textValue(edge.source_topic_id)) &&
      byId.has(textValue(edge.target_topic_id)),
  );
  for (let pass = 0; pass < nodes.length; pass += 1) {
    broaderEdges.forEach((edge) => {
      const parentId = textValue(edge.source_topic_id);
      const childId = textValue(edge.target_topic_id);
      depths.set(
        childId,
        Math.max(depths.get(childId) || 0, (depths.get(parentId) || 0) + 1),
      );
    });
  }
  const maxDepth = Math.max(0, ...Array.from(depths.values()));
  const groups = new Map<number, Array<Record<string, unknown>>>();
  nodes.forEach((node) => {
    const depth = depths.get(topicGraphNodeId(node)) || 0;
    groups.set(depth, [...(groups.get(depth) || []), node]);
  });
  Array.from(groups.entries())
    .sort(([left], [right]) => left - right)
    .forEach(([depth, group]) => {
      group
        .sort((left, right) =>
          textValue(left.title).localeCompare(textValue(right.title)),
        )
        .forEach((node, index) =>
          place(
            node,
            distribute(index, group.length, 16, 84),
            maxDepth ? distribute(depth, maxDepth + 1, 18, 82) : 50,
            depth === 0 ? "root" : "child",
          ),
        );
    });
  return [...placed.values()];
}

function renderTopicGraphCanvas(snapshot: Snapshot) {
  const canvas = el(
    "div",
    `topic-graph-canvas mode-${snapshot.topicGraph.filters.mode}`,
  );
  const layout = computeTopicGraphLayout(snapshot);
  const positions = new Map(
    layout.map((entry) => [topicGraphNodeId(entry.node), entry]),
  );
  const svg = createSvgElement("svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  const defs = createSvgElement("defs");
  const marker = createSvgElement("marker");
  marker.setAttribute("id", "topic-graph-arrow");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("refX", "7");
  marker.setAttribute("refY", "4");
  marker.setAttribute("orient", "auto");
  const arrow = createSvgElement("path");
  arrow.setAttribute("d", "M0,0 L8,4 L0,8 Z");
  marker.appendChild(arrow);
  defs.appendChild(marker);
  svg.appendChild(defs);

  snapshot.topicGraph.visibleEdges.forEach((edge) => {
    const source = positions.get(textValue(edge.source_topic_id));
    const target = positions.get(textValue(edge.target_topic_id));
    if (!source || !target) return;
    const path = createSvgElement("path");
    const relation = textValue(edge.relation, "related_to");
    const status = textValue(edge.status, "suggested");
    const midY = (source.y + target.y) / 2;
    path.setAttribute(
      "d",
      `M${source.x},${source.y} C${source.x},${midY} ${target.x},${midY} ${target.x},${target.y}`,
    );
    path.setAttribute(
      "class",
      `topic-graph-link relation-${relation} status-${status}`,
    );
    if (relation === "broader_than") {
      path.setAttribute("marker-end", "url(#topic-graph-arrow)");
    }
    const title = createSvgElement("title");
    title.textContent = `${relation}: ${textValue(edge.source_topic_id)} -> ${textValue(edge.target_topic_id)} (${status})`;
    path.appendChild(title);
    svg.appendChild(path);
  });
  canvas.appendChild(svg);

  layout.forEach((entry) => {
    const node = renderTopicGraphNode(entry.node, snapshot);
    node.classList.add(`role-${entry.role}`);
    node.style.left = `${entry.x}%`;
    node.style.top = `${entry.y}%`;
    canvas.appendChild(node);
  });

  const legend = el("div", "topic-graph-legend");
  [
    ["broader_than", "Hierarchy"],
    ["related_to", "Related"],
    ["overlaps_with", "Overlap"],
    ["contrasts_with", "Contrast"],
  ].forEach(([relation, label]) => {
    const item = el("span", `topic-graph-legend-item relation-${relation}`);
    item.appendChild(el("span", "topic-graph-legend-line"));
    item.appendChild(el("span", "", label));
    legend.appendChild(item);
  });
  canvas.appendChild(legend);
  return canvas;
}

function renderTopicGraphNode(
  node: Record<string, unknown>,
  snapshot: Snapshot,
) {
  const selected =
    textValue(node.topic_id) === snapshot.topicGraph.inspector.topic?.topic_id;
  const card = el(
    "button",
    selected ? "topic-graph-node active" : "topic-graph-node",
  );
  card.type = "button";
  card.addEventListener("click", () =>
    sendAction("setTopicGraphView", {
      selectedTopicId: textValue(node.topic_id),
      mode:
        snapshot.topicGraph.filters.mode === "unplaced"
          ? "unplaced"
          : "neighborhood",
    }),
  );
  card.appendChild(el("span", "topic-node-title", textValue(node.title)));
  const meta = el(
    "span",
    "topic-node-meta",
    `${numberValue(node.paper_count, 0)} papers`,
  );
  card.appendChild(meta);
  const badges = el("span", "tag-row");
  badges.appendChild(badge(textValue(node.node_type)));
  if (node.is_root || node.level === "top") {
    badges.appendChild(badge("top", "ok"));
  }
  if (Array.isArray(node.relation_statuses)) {
    node.relation_statuses.forEach((status) =>
      badges.appendChild(badge(status, toneFor(status))),
    );
  }
  card.appendChild(badges);
  return card;
}

function renderTopicInspector(snapshot: Snapshot) {
  const inspector = el("aside", "topic-inspector");
  inspector.appendChild(el("h3", "", "Topic Inspector"));
  const topic = snapshot.topicGraph.inspector.topic;
  if (!topic) {
    inspector.appendChild(el("div", "empty", "No topic selected."));
    return inspector;
  }
  inspector.appendChild(el("h4", "", textValue(topic.title)));
  inspector.appendChild(el("p", "muted", textValue(topic.topic_id)));
  const metrics = el("div", "metric-grid");
  metrics.appendChild(metric("Papers", numberValue(topic.paper_count, 0)));
  metrics.appendChild(
    metric("Suggested", snapshot.topicGraph.inspector.suggestedCount),
  );
  metrics.appendChild(
    metric("Last synthesis", textValue(topic.last_synthesis_at, "-")),
  );
  inspector.appendChild(metrics);
  inspector.appendChild(
    relationSection("Parents", snapshot.topicGraph.inspector.parents),
  );
  inspector.appendChild(
    relationSection("Children", snapshot.topicGraph.inspector.children),
  );
  const related = el("div", "relation-section");
  related.appendChild(el("h4", "", "Related"));
  if (!snapshot.topicGraph.inspector.related.length) {
    related.appendChild(el("p", "muted", "-"));
  } else {
    snapshot.topicGraph.inspector.related.forEach((entry) => {
      const row = el("div", "relation-row");
      row.appendChild(badge(entry.relation, toneFor(entry.status)));
      row.appendChild(el("span", "", textValue(entry.node.title)));
      row.appendChild(badge(entry.status, toneFor(entry.status)));
      related.appendChild(row);
    });
  }
  inspector.appendChild(related);
  const reviewPanel = renderTopicGraphReviewPanel(snapshot);
  if (reviewPanel) {
    inspector.appendChild(reviewPanel);
  }
  return inspector;
}

function renderTopicGraphReviewPanel(snapshot: Snapshot) {
  const topic = snapshot.topicGraph.inspector.topic;
  const suggestions = (
    snapshot.topicGraph.inspector.suggestedRelations || []
  ).filter(
    (relation) =>
      !isReviewOptimisticallyResolved("topic-edge", relation.edge_id),
  );
  const relationReviews = (
    snapshot.topicGraph.inspector.relationReviewItems || []
  ).filter(
    (item) => !isReviewOptimisticallyResolved("topic-review", item.review_id),
  );
  const nodesById = new Map(
    (snapshot.topicGraph.nodes || []).map((node) => [
      textValue(node.topic_id),
      node,
    ]),
  );
  const firstSuggestion = suggestions[0];
  if (firstSuggestion) {
    const sourceTitle =
      textValue(
        nodesById.get(textValue(firstSuggestion.source_topic_id))?.title,
      ) || textValue(firstSuggestion.source_topic_id, "Source topic");
    const targetTitle =
      textValue(
        nodesById.get(textValue(firstSuggestion.target_topic_id))?.title,
      ) || textValue(firstSuggestion.target_topic_id, "Target topic");
    return renderReviewPanel(
      renderReviewCard({
        kind: "Topic relation",
        title: `${sourceTitle} -> ${textValue(firstSuggestion.relation)} -> ${targetTitle}`,
        meta:
          suggestions.length + relationReviews.length > 1
            ? `${suggestions.length + relationReviews.length - 1} more review item(s)`
            : "Suggested relation",
        body: "Accepting confirms this suggested topic graph relation; rejecting keeps it out of the active graph.",
        details: [
          ["current topic", topic?.title || topic?.topic_id],
          ["source topic", sourceTitle],
          ["target topic", targetTitle],
          ["relation", firstSuggestion.relation],
          ["confidence", firstSuggestion.confidence],
          ["evidence", firstSuggestion.evidence_refs],
          ["provenance", firstSuggestion.provenance],
          ["status", firstSuggestion.status || "suggested"],
        ],
        actions: [
          makeButton("Accept", "hostCommand", {
            command: "acceptTopicGraphRelation",
            args: { edgeId: textValue(firstSuggestion.edge_id) },
          }),
          makeButton("Reject", "hostCommand", {
            command: "rejectTopicGraphRelation",
            args: { edgeId: textValue(firstSuggestion.edge_id) },
          }),
        ],
      }),
      "topic-review-panel",
    );
  }
  const item = relationReviews[0];
  if (!item) {
    return null;
  }
  const sourceTitle =
    textValue(nodesById.get(textValue(item.source_topic_id))?.title) ||
    textValue(item.source_topic_id, "Source topic");
  const targetTitle =
    textValue(item.target_title) ||
    textValue(nodesById.get(textValue(item.target_topic_id))?.title) ||
    textValue(item.target_topic_id, "Target topic");
  return renderReviewPanel(
    renderReviewCard({
      kind: "Relation review",
      title: `${sourceTitle} -> ${textValue(item.relation)} -> ${targetTitle}`,
      meta:
        relationReviews.length > 1
          ? `${relationReviews.length - 1} more review item(s)`
          : "Open review item",
      body:
        textValue(item.reason) ||
        "Review whether this low-confidence relation proposal should become a suggested topic graph edge.",
      details: [
        ["relation", item.relation || item.proposal_type],
        ["source topic", sourceTitle],
        ["target topic", targetTitle],
        ["confidence", item.confidence],
        ["evidence", item.evidence_refs || item.evidence],
        ["provenance", item.provenance],
        ["diagnostics", item.diagnostics],
      ],
      actions: [
        makeButton("Approve", "hostCommand", {
          command: "applyTopicGraphReviewAction",
          args: {
            reviewId: textValue(item.review_id),
            action: "approve_suggested",
          },
        }),
        makeButton("Reject", "hostCommand", {
          command: "applyTopicGraphReviewAction",
          args: { reviewId: textValue(item.review_id), action: "reject" },
        }),
      ],
    }),
    "topic-review-panel",
  );
}

function metric(label: string, value: unknown) {
  const item = el("div", "metric");
  item.appendChild(el("strong", "", String(value || "-")));
  item.appendChild(el("span", "muted", label));
  return item;
}

function relationSection(title: string, rows: Array<Record<string, unknown>>) {
  const section = el("div", "relation-section");
  section.appendChild(el("h4", "", title));
  if (!rows.length) {
    section.appendChild(el("p", "muted", "-"));
    return section;
  }
  rows.forEach((row) => {
    const item = el("button", "link-button", textValue(row.title));
    item.type = "button";
    item.addEventListener("click", () =>
      sendAction("setTopicGraphView", {
        selectedTopicId: textValue(row.topic_id),
        mode: "neighborhood",
      }),
    );
    section.appendChild(item);
  });
  return section;
}

function renderPanelToolbar(content: HTMLElement) {
  const header = el("div", "panel-header panel-toolbar");
  header.appendChild(content);
  return header;
}

function titleWithSummary(title: string, summary?: string) {
  if (!summary) {
    return title;
  }
  const wrapper = el("div", "cell-stack");
  wrapper.appendChild(el("span", "", title));
  wrapper.appendChild(el("span", "muted", summary));
  return wrapper;
}

function actionGroup(buttons: HTMLElement[]) {
  const group = el("div", "action-group");
  buttons.forEach((button) => group.appendChild(button));
  return group;
}

type ReviewCardOptions = {
  kind: string;
  title: string;
  tone?: string;
  meta?: string;
  body?: string;
  details?: Array<[string, unknown]>;
  badges?: Array<[string, string?]>;
  primaryChildren?: HTMLElement[];
  children?: HTMLElement[];
  actions?: HTMLElement[];
  showKindBadge?: boolean;
};

function renderReviewPanel(card: HTMLElement, className = "") {
  const panel = el(
    "section",
    `review-panel review-panel-enter ${className}`.trim(),
  );
  panel.appendChild(card);
  return panel;
}

function renderReviewCard(options: ReviewCardOptions) {
  const card = el("article", "review-card");
  const header = el("div", "review-card-header");
  const title = el("div", "review-card-title");
  if (options.showKindBadge !== false) {
    title.appendChild(badge(options.kind, options.tone || "warn"));
  }
  title.appendChild(el("strong", "", options.title));
  header.appendChild(title);
  if (options.meta) {
    header.appendChild(el("span", "muted", options.meta));
  }
  card.appendChild(header);
  const badgeList = options.badges?.filter(([value]) => textValue(value)) || [];
  if (badgeList.length) {
    const row = el("div", "review-card-badges");
    badgeList.forEach(([value, tone]) => row.appendChild(badge(value, tone)));
    card.appendChild(row);
  }
  if (options.body) {
    card.appendChild(el("p", "review-card-body", options.body));
  }
  (options.primaryChildren || []).forEach((child) => card.appendChild(child));
  const details =
    options.details?.filter(([, value]) => hasStructuredContent(value)) || [];
  if (details.length) {
    const list = el("div", "review-card-details");
    details.forEach(([label, value]) => {
      const row = el("div", "detail-row");
      row.appendChild(el("span", "muted", label));
      row.appendChild(el("strong", "", compactReviewValue(value)));
      list.appendChild(row);
    });
    card.appendChild(list);
  }
  (options.children || []).forEach((child) => card.appendChild(child));
  if (options.actions?.length) {
    card.appendChild(actionGroup(options.actions));
  }
  return card;
}

function compactReviewValue(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (isRecord(entry)) {
          return (
            firstText(entry, ["label", "title", "tag", "id", "code"]) ||
            JSON.stringify(entry)
          );
        }
        return textValue(entry);
      })
      .filter(Boolean)
      .slice(0, 4)
      .join(", ");
  }
  if (isRecord(value)) {
    return (
      firstText(value, ["message", "summary", "label", "title", "code"]) ||
      JSON.stringify(value)
    );
  }
  return textValue(value, "-");
}

function getMarkdownParser() {
  if (typeof window.markdownit !== "function") {
    return null;
  }
  const parser = window.markdownit({
    html: false,
    linkify: true,
    breaks: false,
  });
  if (window.texmath && window.katex) {
    try {
      parser.use(window.texmath, {
        engine: window.katex,
        delimiters: "dollars",
        katexOptions: {
          throwOnError: false,
        },
      });
    } catch {
      // Markdown remains usable without math support.
    }
  }
  return parser;
}

function conceptOverlayEntries(snapshot?: Snapshot | null) {
  if (!snapshot?.concepts?.filters?.overlayEnabled) {
    return [] as Array<Record<string, unknown>>;
  }
  return Array.isArray(snapshot.concepts.overlayEntries)
    ? snapshot.concepts.overlayEntries
    : [];
}

function applyConceptOverlay(root: HTMLElement, snapshot?: Snapshot | null) {
  const entries = conceptOverlayEntries(snapshot);
  if (!entries.length) {
    return root;
  }
  const escaped = entries
    .map((entry) => textValue(entry.alias))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .map((entry) => entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) {
    return root;
  }
  const byAlias = new Map(
    entries.map((entry) => [textValue(entry.alias).toLowerCase(), entry]),
  );
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  const linkedSenseIds = new Set<string>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (
      parent?.closest(
        "a, code, pre, kbd, samp, script, style, .katex, .math, .concept-link",
      )
    ) {
      continue;
    }
    if (node.nodeValue && pattern.test(node.nodeValue)) {
      textNodes.push(node);
    }
    pattern.lastIndex = 0;
  }
  for (const textNode of textNodes) {
    const text = textNode.nodeValue || "";
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    text.replace(pattern, (match, _alias, offset: number) => {
      const entry = byAlias.get(match.toLowerCase());
      const senseKey = textValue(entry?.sense_id || entry?.concept_id);
      if (!entry || linkedSenseIds.has(senseKey)) {
        return match;
      }
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex, offset)),
      );
      const link = el("button", "concept-link", match);
      link.type = "button";
      link.setAttribute("data-concept-id", textValue(entry.concept_id));
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showConceptBubble(link, entry);
      });
      fragment.appendChild(link);
      linkedSenseIds.add(senseKey);
      lastIndex = offset + match.length;
      return match;
    });
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.parentNode?.replaceChild(fragment, textNode);
  }
  return root;
}

function showConceptBubble(
  anchor: HTMLElement,
  entry: Record<string, unknown>,
) {
  document
    .querySelectorAll(".concept-bubble")
    .forEach((node: Element) => node.remove());
  const bubble = el("div", "concept-bubble");
  bubble.appendChild(el("strong", "", textValue(entry.label || entry.alias)));
  bubble.appendChild(
    el(
      "p",
      "muted",
      textValue(entry.short_definition || entry.definition, "No definition."),
    ),
  );
  const open = makeButton("Open Concept", "selectConcept", {
    conceptId: textValue(entry.concept_id),
  });
  bubble.appendChild(open);
  const rect = anchor.getBoundingClientRect();
  bubble.style.position = "fixed";
  bubble.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 260))}px`;
  bubble.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 160)}px`;
  document.body?.appendChild(bubble);
}

function renderMarkdown(markdown: string) {
  const parser = getMarkdownParser();
  if (!parser) {
    const pre = el("pre", "markdown-fallback");
    pre.textContent = markdown;
    return applyConceptOverlay(pre, state.snapshot);
  }
  const body = el("article", "reader-body markdown-body");
  body.innerHTML = sanitizeRenderedMarkdown(parser.render(markdown));
  body.querySelectorAll("a[href]").forEach((anchor: Element) => {
    const href = anchor.getAttribute("href") || "";
    if (/^\s*javascript:/i.test(href)) {
      anchor.removeAttribute("href");
      return;
    }
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noreferrer noopener");
  });
  return applyConceptOverlay(body, state.snapshot);
}

function sanitizeRenderedMarkdown(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content
    .querySelectorAll("script, iframe, object, embed")
    .forEach((node: Element) => {
      node.remove();
    });
  template.content.querySelectorAll("*").forEach((node: Element) => {
    Array.from(node.attributes).forEach((attribute: Attr) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value || "";
      if (name.startsWith("on") || /^\s*javascript:/i.test(value)) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return template.innerHTML;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function numberValue(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function recordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function recordValue(value: unknown) {
  return isRecord(value) ? value : {};
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => textValue(entry)).filter(Boolean)
    : [];
}

function objectEntries(value: unknown) {
  return isRecord(value)
    ? Object.entries(value).filter(([, entry]) => {
        if (Array.isArray(entry)) return entry.length > 0;
        if (isRecord(entry)) return Object.keys(entry).length > 0;
        return !!textValue(entry);
      })
    : [];
}

function hasStructuredContent(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return objectEntries(value).length > 0;
  return !!textValue(value);
}

function firstText(
  row: Record<string, unknown>,
  keys: string[],
  fallback = "",
) {
  for (const key of keys) {
    const value = textValue(row[key]);
    if (value) {
      return value;
    }
  }
  return fallback;
}

function renderParagraphs(value: unknown) {
  const box = el("div", "topic-prose");
  if (Array.isArray(value)) {
    value
      .map((entry) => textValue(entry))
      .filter(Boolean)
      .forEach((entry) => {
        box.appendChild(el("p", "", entry));
      });
    return box;
  }
  const text = textValue(value);
  if (text) {
    text
      .split(/\n{2,}/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => {
        box.appendChild(el("p", "", entry));
      });
  }
  return box;
}

function renderKeyValueList(value: Record<string, unknown>): HTMLElement {
  const list = el("div", "topic-kv-list");
  Object.entries(value).forEach(([key, raw]) => {
    const row = el("div", "topic-kv-row");
    row.appendChild(el("span", "muted", key.replace(/_/g, " ")));
    if (raw === null || raw === undefined) {
      row.appendChild(el("strong", "", "-"));
    } else if (
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      row.appendChild(el("strong", "", String(raw)));
    } else if (Array.isArray(raw)) {
      const arrWrap = el("div", "kv-array-wrap");
      raw.forEach((item) => {
        arrWrap.appendChild(
          badge(typeof item === "object" ? JSON.stringify(item) : String(item)),
        );
      });
      row.appendChild(arrWrap);
    } else if (typeof raw === "object") {
      const subList = el("div", "kv-sub-list");
      Object.entries(raw as Record<string, unknown>).forEach(([subK, subV]) => {
        const subRow = el("div", "kv-sub-row");
        subRow.appendChild(el("span", "muted", subK.replace(/_/g, " ") + ": "));
        subRow.appendChild(
          el(
            "span",
            "",
            typeof subV === "object" ? JSON.stringify(subV) : String(subV),
          ),
        );
        subList.appendChild(subRow);
      });
      row.appendChild(subList);
    }
    list.appendChild(row);
  });
  return list;
}

function evidenceRows(detail: TopicDetailDto) {
  return recordArray(detail.paper_evidence);
}

function evidenceTitle(evidence: Record<string, unknown>, index = 0) {
  return firstText(
    evidence,
    ["title", "paper_title", "label", "paper_ref", "id"],
    `Paper ${index + 1}`,
  );
}

function evidenceCode(evidence: Record<string, unknown>, index = 0) {
  return firstText(evidence, ["short_id", "code", "label"], `P${index + 1}`);
}

function evidenceId(evidence: Record<string, unknown>) {
  return firstText(evidence, [
    "id",
    "paper_ref",
    "paperRef",
    "item_key",
    "itemKey",
  ]);
}

function evidenceRefKeys(evidence: Record<string, unknown>) {
  return new Set(
    [
      evidenceId(evidence),
      textValue(evidence.paper_ref || evidence.paperRef),
      textValue(evidence.item_key || evidence.itemKey),
      textValue(evidence.id),
    ].filter(Boolean),
  );
}

function evidenceForRef(detail: TopicDetailDto, ref: unknown) {
  const id = textValue(ref);
  if (!id) {
    return undefined;
  }
  return evidenceRows(detail).find((row) => {
    const keys = evidenceRefKeys(row);
    if (keys.has(id)) return true;
    return Array.from(keys).some((key) => id.endsWith(key) || key.endsWith(id));
  });
}

function primaryEvidenceForEvent(
  detail: TopicDetailDto,
  event: Record<string, unknown>,
) {
  const refs = [
    ...stringArray(event.evidence_refs),
    ...stringArray(event.paper_evidence_refs),
    ...stringArray(event.paper_refs),
    ...stringArray(event.source_paper_refs),
  ];
  if (refs.length) {
    return evidenceForRef(detail, refs[0]);
  }
  const direct = firstText(event, [
    "paper_evidence_id",
    "evidence_id",
    "paper_ref",
  ]);
  return direct ? evidenceForRef(detail, direct) : undefined;
}

function openDigestModal(evidence: Record<string, unknown>) {
  state.selectedEvidenceId = evidenceId(evidence);
  state.digestModal = { status: "loading", evidence };
  render();
  sendAction("hostCommand", {
    command: "resolveTopicPaperDigest",
    args: {
      topicId: state.topicDetail?.topicId,
      paper_ref: evidence.paper_ref || evidence.paperRef,
      digest_ref: evidence.digest_ref || evidence.digestRef,
      include_representative_image: true,
    },
  });
}

function openEvidenceExplorer(evidenceIdValue?: string) {
  if (evidenceIdValue) {
    state.selectedEvidenceId = evidenceIdValue;
  }
  state.evidenceExplorerOpen = true;
  render();
}

function selectEvidenceRef(detail: TopicDetailDto, ref: unknown) {
  const evidence = evidenceForRef(detail, ref);
  if (evidence) {
    state.selectedEvidenceId = evidenceId(evidence);
  } else {
    state.selectedEvidenceId = textValue(ref) || undefined;
  }
  state.evidenceExplorerOpen = true;
  render();
}

function evidenceRefChips(
  detail: TopicDetailDto,
  refs: unknown,
  tone = "blue",
) {
  const chips = el("div", "evidence-chips");
  stringArray(refs).forEach((ref) => {
    const chip = el("button", `chip ${tone}`, ref);
    chip.type = "button";
    chip.title = `Inspect evidence ${ref}`;
    chip.addEventListener("click", () => selectEvidenceRef(detail, ref));
    chips.appendChild(chip);
  });
  return chips;
}

function traceChips(refs: unknown) {
  const chips = el("div", "evidence-chips");
  stringArray(refs).forEach((ref) => chips.appendChild(badge(ref, "purple")));
  return chips;
}

function renderEmptyStructuredState(label = "No structured data") {
  const empty = el("div", "structured-empty");
  empty.appendChild(el("strong", "", label));
  empty.appendChild(
    el(
      "p",
      "muted",
      "This section was not materialized in the current structured artifact.",
    ),
  );
  return empty;
}

function renderContentCard(
  title: string,
  body?: Node | string,
  className = "content-card",
) {
  const card = el("section", className);
  card.appendChild(el("h3", "", title));
  if (typeof body === "string") {
    card.appendChild(renderParagraphs(body));
  } else if (body) {
    card.appendChild(body);
  }
  return card;
}

function renderTopicOverviewSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", "Overview"));

  const summaryText =
    detail.summary?.text ||
    detail.summary?.brief ||
    detail.summary?.summary ||
    detail.summary?.long_summary ||
    detail.positioning?.review_position;

  if (summaryText) {
    const summaryCard = el("div", "overview-summary-hero");
    summaryCard.appendChild(el("h3", "hero-title", "Synthesis Summary"));
    summaryCard.appendChild(renderParagraphs(summaryText));
    section.appendChild(summaryCard);
  }

  const positioning = detail.positioning || {};
  if (hasStructuredContent(positioning)) {
    const dash = el("div", "overview-dashboard");
    [
      "importance",
      "timeliness",
      "review_position",
      "concept_position",
      "why_synthesize",
    ].forEach((key) => {
      const text = textValue(positioning[key]);
      if (text) {
        const metric = el("div", "dashboard-metric");
        metric.appendChild(el("div", "metric-label", key.replace(/_/g, " ")));
        metric.appendChild(el("div", "metric-value", text));
        dash.appendChild(metric);
      }
    });
    const boundary = positioning.scope_boundary;
    if (hasStructuredContent(boundary)) {
      const metric = el("div", "dashboard-metric span-2");
      metric.appendChild(el("div", "metric-label", "Scope Boundary"));
      metric.appendChild(
        renderKeyValueList(boundary as Record<string, unknown>),
      );
      dash.appendChild(metric);
    }
    if (dash.childElementCount) section.appendChild(dash);
  }

  const outline = detail.review_outline || {};
  const outlineRows = [
    ...recordArray(outline.introduction_logic),
    ...recordArray(outline.related_work_logic),
    ...recordArray(outline.body_sections),
    ...recordArray(outline.sections),
  ];
  if (outlineRows.length) {
    const outlineSection = el("div", "overview-outline-section");
    outlineSection.appendChild(el("h3", "", "Review Outline"));

    const stepper = el("div", "outline-stepper");
    outlineRows.slice(0, 8).forEach((row, index) => {
      const step = el("div", "outline-step");

      const marker = el("div", "step-marker");
      marker.appendChild(el("span", "step-number", `${index + 1}`));
      step.appendChild(marker);

      const content = el("div", "step-content");
      content.appendChild(
        el(
          "h4",
          "",
          firstText(
            row,
            ["title", "heading", "purpose", "id"],
            `Step ${index + 1}`,
          ),
        ),
      );

      const text = firstText(row, [
        "summary",
        "description",
        "purpose",
        "rationale",
      ]);
      if (text) content.appendChild(el("p", "", text));

      const refs = stringArray(
        row.evidence_map_refs || row.source_section_refs,
      );
      if (refs.length) {
        const foot = el("div", "step-footer");
        foot.appendChild(traceChips(refs));
        content.appendChild(foot);
      }

      step.appendChild(content);
      stepper.appendChild(step);
    });
    outlineSection.appendChild(stepper);
    section.appendChild(outlineSection);
  }

  if (section.childElementCount <= 1) {
    section.appendChild(renderEmptyStructuredState("No overview data"));
  }
  return section;
}

function renderTopicTaxonomySection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", "Taxonomy"));
  const taxonomy = detail.taxonomy || {};
  const summary = recordValue(taxonomy.summary);
  const summaryText = firstText(summary, ["text", "analysis", "overview"]);
  if (summaryText) {
    section.appendChild(
      renderContentCard("Route Synthesis", renderParagraphs(summaryText)),
    );
  }
  const axis = firstText(taxonomy, [
    "primary_axis",
    "axis",
    "classification_axis",
  ]);
  const rationale = firstText(taxonomy, [
    "axis_rationale",
    "rationale",
    "reason",
  ]);
  if (axis || rationale) {
    const head = el("div", "taxonomy-head");
    if (axis) head.appendChild(badge(axis, "blue"));
    if (rationale) head.appendChild(renderParagraphs(rationale));
    section.appendChild(renderContentCard("Classification Axis", head));
  }
  const nodes = recordArray(
    taxonomy.nodes || taxonomy.categories || taxonomy.taxonomy_nodes,
  );
  if (nodes.length) {
    const list = el("div", "taxonomy-list");
    nodes.forEach((node, index) => {
      const card = el("article", "taxonomy-list-item");

      const header = el("header", "taxonomy-item-header");
      const titleWrap = el("div", "taxonomy-item-title");
      titleWrap.appendChild(el("span", "claim-index", `T${index + 1}`));
      titleWrap.appendChild(
        el(
          "h3",
          "",
          firstText(
            node,
            ["title", "label", "name", "id"],
            `Node ${index + 1}`,
          ),
        ),
      );
      header.appendChild(titleWrap);

      const maturity = firstText(node, [
        "maturity",
        "status",
        "development_stage",
      ]);
      if (maturity) header.appendChild(badge(maturity, "purple"));
      card.appendChild(header);

      const text = firstText(node, [
        "description",
        "summary",
        "rationale",
        "definition",
      ]);
      if (text) card.appendChild(el("p", "taxonomy-item-desc", text));

      const detailsWrap = el("div", "taxonomy-item-details");

      const probMech = el("div", "taxonomy-detail-group");
      const prob = firstText(node, [
        "core_problem",
        "problem",
        "target_problem",
      ]);
      if (prob) {
        const pDiv = el("div", "taxonomy-detail-row");
        pDiv.appendChild(el("span", "muted", "Problem"));
        pDiv.appendChild(el("strong", "", prob));
        probMech.appendChild(pDiv);
      }
      const mech = firstText(node, [
        "mechanism",
        "technical_mechanism",
        "core_mechanism",
      ]);
      if (mech) {
        const mDiv = el("div", "taxonomy-detail-row");
        mDiv.appendChild(el("span", "muted", "Mechanism"));
        mDiv.appendChild(el("strong", "", mech));
        probMech.appendChild(mDiv);
      }
      if (probMech.childElementCount) detailsWrap.appendChild(probMech);

      const prosCons = el("div", "taxonomy-detail-group pros-cons");
      const strengths = stringArray(node.strengths || node.advantages);
      if (strengths.length) {
        const sDiv = el("div", "taxonomy-detail-row");
        sDiv.appendChild(el("span", "muted", "Strengths"));
        const sList = el("ul", "taxonomy-bullet-list");
        strengths.forEach((st) => sList.appendChild(el("li", "pro-item", st)));
        sDiv.appendChild(sList);
        prosCons.appendChild(sDiv);
      }
      const limits = stringArray(node.limitations || node.weaknesses);
      if (limits.length) {
        const lDiv = el("div", "taxonomy-detail-row");
        lDiv.appendChild(el("span", "muted", "Limitations"));
        const lList = el("ul", "taxonomy-bullet-list");
        limits.forEach((lt) => lList.appendChild(el("li", "con-item", lt)));
        lDiv.appendChild(lList);
        prosCons.appendChild(lDiv);
      }
      if (prosCons.childElementCount) detailsWrap.appendChild(prosCons);

      if (detailsWrap.childElementCount) card.appendChild(detailsWrap);

      const refs =
        node.evidence_refs || node.paper_refs || node.paper_unit_refs;
      if (stringArray(refs).length) {
        const foot = el("footer", "taxonomy-item-footer");
        foot.appendChild(evidenceRefChips(detail, refs, "blue"));
        if (stringArray(node.evidence_map_refs).length)
          foot.appendChild(traceChips(node.evidence_map_refs));
        card.appendChild(foot);
      } else if (stringArray(node.evidence_map_refs).length) {
        const foot = el("footer", "taxonomy-item-footer");
        foot.appendChild(traceChips(node.evidence_map_refs));
        card.appendChild(foot);
      }
      list.appendChild(card);
    });
    section.appendChild(list);
  } else {
    section.appendChild(renderEmptyStructuredState("No taxonomy data"));
  }
  return section;
}

function topicTimelineEvents(detail: TopicDetailDto) {
  const timeline = detail.timeline_events;
  if (recordValue(timeline).events) {
    return recordArray(recordValue(timeline).events);
  }
  return recordArray(timeline);
}

function topicTimelineSummary(detail: TopicDetailDto) {
  const timeline = recordValue(detail.timeline_events);
  return recordValue(timeline.summary);
}

function topicTimelineMarkers(detail: TopicDetailDto) {
  const timeline = recordValue(detail.timeline_events);
  return recordArray(timeline.markers);
}

function renderTopicClaimsSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", "Claims"));
  const claims = recordArray(detail.claims);
  if (!claims.length) {
    section.appendChild(renderEmptyStructuredState("No claim data"));
    return section;
  }
  const list = el("div", "claims-list");
  claims.forEach((claim, index) => {
    const card = el("article", "claim-row");

    // Left column: Claim text and rationale
    const leftCol = el("div", "claim-content");
    const header = el("div", "claim-header");
    header.appendChild(
      el("span", "claim-index", firstText(claim, ["id"], `C${index + 1}`)),
    );
    const strength = firstText(claim, [
      "strength",
      "claim_strength",
      "support_level",
    ]);
    if (strength) {
      const tone =
        strength.toLowerCase() === "strong"
          ? "ok"
          : strength.toLowerCase() === "weak"
            ? "warn"
            : "";
      header.appendChild(badge(strength, tone as any));
    }
    leftCol.appendChild(header);
    leftCol.appendChild(
      el(
        "h3",
        "",
        firstText(
          claim,
          ["text", "claim", "title", "id"],
          `Claim ${index + 1}`,
        ),
      ),
    );

    const rationale = firstText(claim, [
      "analysis",
      "rationale",
      "support",
      "summary",
      "explanation",
    ]);
    if (rationale) leftCol.appendChild(el("p", "", rationale));
    card.appendChild(leftCol);

    // Right column: Evidence cards
    const rightCol = el("div", "claim-evidence");
    const eRefs = stringArray(claim.evidence_refs || claim.paper_evidence_refs);
    if (eRefs.length) {
      rightCol.appendChild(
        el("h4", "evidence-group-title", "Supporting Evidence"),
      );
      const eList = el("div", "claim-evidence-list");
      eRefs.forEach((ref) => {
        const rows = evidenceRows(detail);
        const ev = rows.find((r) => evidenceRefKeys(r).has(ref));

        if (ev) {
          const eCard = el("button", "mini-evidence-card");
          eCard.type = "button";
          eCard.title = "View in Evidence Explorer";
          const id = evidenceId(ev);
          if (id) {
            eCard.addEventListener("click", () => {
              openEvidenceExplorer(id);
            });
          }
          const code = evidenceCode(
            ev,
            Math.max(
              0,
              rows.findIndex((r) => evidenceId(r) === id),
            ),
          );
          const title = evidenceTitle(
            ev,
            Math.max(
              0,
              rows.findIndex((r) => evidenceId(r) === id),
            ),
          );
          eCard.appendChild(el("span", "evidence-code", code));
          eCard.appendChild(el("span", "evidence-title", title));
          eList.appendChild(eCard);
        } else {
          // Fallback to chip if not found in paper evidence
          eList.appendChild(badge(ref, "green"));
        }
      });
      rightCol.appendChild(eList);
    }

    const tRefs = stringArray(claim.evidence_map_refs);
    if (tRefs.length) {
      const tList = el("div", "claim-evidence-list");
      tRefs.forEach((r) => tList.appendChild(badge(r, "purple")));
      rightCol.appendChild(tList);
    }

    card.appendChild(rightCol);
    list.appendChild(card);
  });
  section.appendChild(list);
  return section;
}

function renderTopicReferencesSection(detail: TopicDetailDto) {
  const container = el("div", "references-section");

  const header = el("div", "references-header");
  const rows = evidenceRows(detail);

  const titleContainer = el("div", "references-title-row");
  titleContainer.appendChild(
    el("h3", "", `Associated Literature References (${rows.length})`),
  );
  header.appendChild(titleContainer);

  const searchBar = el("div", "references-search-bar");
  const input = el("input", "references-search-input") as HTMLInputElement;
  input.type = "text";
  input.placeholder = "Search references by title, author, key, or summary...";
  searchBar.appendChild(input);
  header.appendChild(searchBar);
  container.appendChild(header);

  const grid = el("div", "references-grid");
  container.appendChild(grid);

  function updateGrid(filterText = "") {
    grid.innerHTML = "";
    const query = filterText.toLowerCase();

    rows.forEach((r, idx) => {
      const title = evidenceTitle(r, idx);
      const year = firstText(r, ["year", "publication_year"]) || "";
      const refKey = firstText(r, ["paper_ref", "paperRef"]) || "";
      const summary =
        firstText(r, [
          "summary",
          "evidence_summary",
          "topic_relevance",
          "rationale",
        ]) || "";
      const code = evidenceCode(r, idx);
      const status =
        firstText(r, ["synthesis_role", "status", "freshness"]) || "";
      const isSelected = state.selectedEvidenceId === evidenceId(r);

      if (
        query &&
        !title.toLowerCase().includes(query) &&
        !year.toLowerCase().includes(query) &&
        !refKey.toLowerCase().includes(query) &&
        !summary.toLowerCase().includes(query) &&
        !code.toLowerCase().includes(query)
      ) {
        return;
      }

      const card = el("div", `reference-card${isSelected ? " active" : ""}`);

      const cardHead = el("div", "ref-card-head");
      const badgeContainer = el("div", "ref-badge-container");

      // Code Badge
      const codeEl = el("span", "ref-code-badge", code);
      badgeContainer.appendChild(codeEl);
      if (status) {
        badgeContainer.appendChild(badge(status, toneFor(status)));
      }
      cardHead.appendChild(badgeContainer);

      if (year) {
        cardHead.appendChild(el("span", "ref-year-label", year));
      }
      card.appendChild(cardHead);

      card.appendChild(el("h4", "ref-title", title));

      if (refKey) {
        card.appendChild(el("div", "ref-key-badge", refKey));
      }

      if (summary) {
        const sumText =
          summary.length > 130 ? summary.substring(0, 127) + "..." : summary;
        card.appendChild(el("p", "ref-summary", sumText));
      }

      card.addEventListener("click", () => {
        openEvidenceExplorer(evidenceId(r) || undefined);
      });

      grid.appendChild(card);
    });

    if (!grid.childElementCount) {
      grid.appendChild(
        renderEmptyStructuredState("No matching references found"),
      );
    }
  }

  input.addEventListener("input", (e) => {
    updateGrid((e.target as HTMLInputElement).value);
  });

  updateGrid();

  return container;
}

function comparisonRows(matrix: Record<string, unknown>) {
  const rows = recordArray(matrix.rows || matrix.items);
  if (rows.length) return rows;
  const dimensions = recordArray(matrix.dimensions);
  return dimensions.length ? dimensions : [];
}

function renderMethodComparisonCard(row: Record<string, unknown>) {
  const methods = recordArray(
    row.methods_comparison || row.methods || row.entries,
  );
  if (!methods.length) return undefined;
  return tableView(
    ["Method", "AP", "FPS", "Epochs", "Backbone"],
    methods,
    (method) => [
      firstText(method, ["method", "name"], "-"),
      firstText(method, ["ap", "mAP"], "-"),
      firstText(method, ["fps", "speed"], "-"),
      firstText(method, ["epochs", "schedule"], "-"),
      firstText(method, ["backbone", "model"], "-"),
    ],
  );
}

function renderTopicCompareSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  const improvementDimensions = recordArray(detail.improvement_dimensions);
  if (improvementDimensions.length) {
    section.appendChild(el("h2", "", "Improvement / Dimensions"));
    const summary = firstText(
      recordValue(detail.improvement_dimension_summary),
      ["text", "summary", "analysis", "overview"],
    );
    if (summary) section.appendChild(renderParagraphs(summary));
    improvementDimensions.forEach((dimension, index) => {
      const card = el("article", "debate-card");
      card.appendChild(el("span", "claim-index", `I${index + 1}`));
      card.appendChild(
        el(
          "h3",
          "",
          firstText(
            dimension,
            ["label", "title", "dimension", "name", "id"],
            `Dimension ${index + 1}`,
          ),
        ),
      );
      const analysis = firstText(dimension, [
        "analysis",
        "summary",
        "description",
        "rationale",
        "tradeoff",
      ]);
      if (analysis) card.appendChild(renderParagraphs(analysis));
      const trajectory = firstText(dimension, [
        "trajectory",
        "progression",
        "improvement_pattern",
      ]);
      if (trajectory) card.appendChild(el("p", "muted", trajectory));
      if (stringArray(dimension.source_paper_refs).length) {
        card.appendChild(evidenceRefChips(detail, dimension.source_paper_refs));
      } else if (stringArray(dimension.evidence_refs).length) {
        card.appendChild(evidenceRefChips(detail, dimension.evidence_refs));
      }
      section.appendChild(card);
    });
  } else {
    section.appendChild(el("h2", "", "Compare"));
  }
  const matrix = detail.comparison_matrix || {};
  const rows = comparisonRows(matrix);
  if (!improvementDimensions.length && rows.length) {
    // 1. Extract all unique routes/methods to form columns
    const routeSet = new Set<string>();
    rows.forEach((r) => {
      recordArray(r.comparisons).forEach((c) => {
        const route = firstText(c, ["route", "method", "name"]);
        if (route && route !== "-") routeSet.add(route);
      });
    });
    const routes = Array.from(routeSet);

    // 2. Build the table
    const tableWrap = el("div", "matrix-table-wrap");
    const table = el("table", "matrix-table");

    // Header
    const thead = el("thead");
    const trHead = el("tr");
    trHead.appendChild(el("th", "matrix-th matrix-dim-col", "Dimension"));
    routes.forEach((route) => {
      trHead.appendChild(el("th", "matrix-th", route));
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Body
    const tbody = el("tbody");
    rows.forEach((r, i) => {
      const tr = el("tr");
      // Dimension column
      const tdDim = el("td", "matrix-td matrix-dim-col");
      const dimTitle = el("div", "matrix-dim-title");
      dimTitle.appendChild(el("span", "claim-index", `M${i + 1}`));
      dimTitle.appendChild(
        el(
          "strong",
          "",
          firstText(
            r,
            ["name", "title", "dimension", "label", "id"],
            `Dimension ${i + 1}`,
          ),
        ),
      );
      tdDim.appendChild(dimTitle);
      const desc = firstText(r, ["description", "summary", "rationale"]);
      if (desc) tdDim.appendChild(el("p", "matrix-dim-desc", desc));

      const methodTable = renderMethodComparisonCard(r);
      if (methodTable) {
        tdDim.appendChild(methodTable);
      }

      tr.appendChild(tdDim);

      // Value columns
      const comps = recordArray(r.comparisons);
      routes.forEach((route) => {
        const td = el("td", "matrix-td");
        const match = comps.find(
          (c) => firstText(c, ["route", "method", "name"]) === route,
        );
        if (match) {
          const val = firstText(match, ["value", "result"], "-");
          td.appendChild(renderParagraphs(val));
          // Apply subtle coloring based on text content as a heuristic
          const lowerVal = val.toLowerCase();
          if (
            lowerVal.includes("high") ||
            lowerVal.includes("strong") ||
            lowerVal.includes("good") ||
            lowerVal.includes("better")
          ) {
            td.classList.add("highlight-positive");
          } else if (
            lowerVal.includes("low") ||
            lowerVal.includes("weak") ||
            lowerVal.includes("poor") ||
            lowerVal.includes("worse") ||
            lowerVal.includes("limited") ||
            lowerVal.includes("high cost")
          ) {
            td.classList.add("highlight-negative");
          }
        } else {
          td.appendChild(el("span", "muted", "-"));
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    section.appendChild(tableWrap);
  } else if (!improvementDimensions.length) {
    section.appendChild(renderEmptyStructuredState("No comparison matrix"));
  }
  const debates = recordArray(detail.debates);
  if (debates.length) {
    section.appendChild(el("h3", "", "Debates"));
    debates.forEach((debate, index) => {
      const card = el("article", "debate-card");
      card.appendChild(el("span", "claim-index", `D${index + 1}`));
      card.appendChild(
        el(
          "h3",
          "",
          firstText(
            debate,
            ["name", "title", "text", "debate", "topic", "id"],
            `Debate ${index + 1}`,
          ),
        ),
      );
      const type = firstText(debate, ["evidence_type", "type"]);
      if (type) card.appendChild(badge(type, "orange"));
      const text = firstText(debate, [
        "synthesis_judgment",
        "summary",
        "description",
        "tension",
        "rationale",
      ]);
      if (text) card.appendChild(el("p", "", text));
      if (stringArray(debate.evidence_refs).length)
        card.appendChild(
          evidenceRefChips(detail, debate.evidence_refs, "orange"),
        );
      if (stringArray(debate.evidence_map_refs).length)
        card.appendChild(traceChips(debate.evidence_map_refs));
      section.appendChild(card);
    });
  }
  return section;
}

function renderTopicExternalSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  const external = detail.external_literature_analysis || {};
  section.appendChild(el("h2", "", "External Literature Analysis"));
  const summary = external.summary || external.contribution_to_topic;
  if (summary) {
    const hero = el("div", "overview-summary-hero");
    hero.appendChild(el("h3", "hero-title", "External Context"));
    hero.appendChild(renderParagraphs(summary));
    section.appendChild(hero);
  }
  const verdict = firstText(external, [
    "coverage_verdict",
    "coverage_judgment",
  ]);
  const reason = firstText(external, [
    "coverage_reason",
    "reason",
    "limitations",
  ]);
  if (verdict || reason) {
    const verdictCard = el("div", "coverage-verdict-card");
    if (verdict) {
      const line = el("div", "verdict-line");
      line.style.display = "flex";
      line.style.alignItems = "center";
      line.style.gap = "8px";
      line.appendChild(el("strong", "", "Coverage Verdict:"));
      line.appendChild(badge(verdict, toneFor(verdict)));
      verdictCard.appendChild(line);
    }
    if (reason) verdictCard.appendChild(renderParagraphs(reason));
    section.appendChild(verdictCard);
  }
  const themes = recordArray(external.themes);
  if (themes.length) {
    section.appendChild(el("h3", "", "Themes"));
    const grid = el("div", "topic-card-grid");
    themes.forEach((theme) => {
      const card = el("article", "external-theme-card");
      card.appendChild(
        el(
          "strong",
          "",
          firstText(theme, ["title", "theme", "label", "id"], "Theme"),
        ),
      );
      const text = firstText(theme, ["analysis", "summary", "description"]);
      if (text) card.appendChild(el("p", "", text));
      grid.appendChild(card);
    });
    section.appendChild(grid);
  }
  const references = recordArray(external.representative_references);
  if (references.length) {
    section.appendChild(el("h3", "", "Representative References"));
    section.appendChild(
      matrixTableView(
        ["Reference", "Context", "Completeness"],
        references,
        (row) => {
          const titleStrong = el(
            "strong",
            "",
            firstText(row, ["title", "label", "id"], "Reference"),
          );
          const contextSpan = el(
            "span",
            "muted",
            firstText(row, ["citation_context", "context", "reason"], "-"),
          );
          const completenessSpan = el(
            "span",
            "muted",
            firstText(
              row,
              ["information_completeness", "completeness", "status"],
              "-",
            ),
          );
          return [titleStrong, contextSpan, completenessSpan];
        },
      ),
    );
  }
  if (external.limitations) {
    section.appendChild(
      renderContentCard("Limitations", renderParagraphs(external.limitations)),
    );
  }
  const additions = recordArray(external.suggested_additions);
  if (additions.length) {
    section.appendChild(el("h3", "", "Suggested Additions"));
    section.appendChild(
      matrixTableView(["Candidate", "Reason", "Priority"], additions, (row) => {
        const titleStrong = el(
          "strong",
          "",
          firstText(row, ["title", "label", "id"], "Candidate"),
        );
        const reasonSpan = el(
          "span",
          "",
          firstText(row, ["reason", "rationale", "why"], "-"),
        );
        const pText = firstText(row, ["priority", "urgency"], "-");
        const priorityCell = pText.toLowerCase().includes("high")
          ? badge(pText, "warn")
          : el("span", "", pText);
        return [titleStrong, reasonSpan, priorityCell];
      }),
    );
  }
  if (section.childElementCount <= 1) {
    section.appendChild(
      renderEmptyStructuredState("No external literature data"),
    );
  }
  return section;
}

function renderEvidenceMapSummary(detail: TopicDetailDto) {
  const map = detail.evidence_map || {};
  const card = renderContentCard(
    "Evidence Map",
    undefined,
    "content-card evidence-map-summary",
  );
  const rows = el("div", "topic-kv-list");
  [
    ["path", map.path],
    ["hash", map.hash],
    [
      "candidate ids",
      stringArray(map.candidate_ids).length || textValue(map.candidate_ids),
    ],
  ].forEach(([key, value]) => {
    if (!textValue(value)) return;
    const row = el("div", "topic-kv-row");
    row.appendChild(el("span", "muted", String(key)));
    row.appendChild(el("strong", "", String(value)));
    rows.appendChild(row);
  });
  if (isRecord(map.candidate_counts)) {
    Object.entries(map.candidate_counts).forEach(([key, value]) => {
      const row = el("div", "topic-kv-row");
      row.appendChild(el("span", "muted", key));
      row.appendChild(el("strong", "", String(value ?? 0)));
      rows.appendChild(row);
    });
  }
  if (rows.childElementCount) card.appendChild(rows);
  else
    card.appendChild(renderEmptyStructuredState("No evidence map provenance"));
  return card;
}

function renderTopicCoverageSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", "Coverage"));
  if (hasStructuredContent(detail.coverage)) {
    const metric = el("div", "dashboard-metric span-2");
    metric.appendChild(el("div", "metric-label", "Coverage Status"));
    metric.appendChild(renderKeyValueList(detail.coverage || {}));
    const dash = el("div", "overview-dashboard");
    dash.appendChild(metric);
    section.appendChild(dash);
  }
  const gaps = recordArray(detail.gaps);
  if (gaps.length) {
    section.appendChild(el("h3", "", "Identified Gaps"));
    const gList = el("div", "claims-list");
    gaps.forEach((gap, i) => {
      const card = el("article", "claim-row");
      const leftCol = el("div", "claim-content");
      const header = el("div", "claim-header");
      header.appendChild(el("span", "claim-index", `G${i + 1}`));
      const type = firstText(gap, ["gap_type", "type"]);
      if (type)
        header.appendChild(
          badge(type, type === "library_coverage_gap" ? "orange" : "warn"),
        );
      leftCol.appendChild(header);
      leftCol.appendChild(
        el("h3", "", firstText(gap, ["title", "gap", "id"], "Gap")),
      );
      const text = firstText(gap, ["text", "description", "impact", "summary"]);
      if (text) leftCol.appendChild(el("p", "", text));
      card.appendChild(leftCol);
      gList.appendChild(card);
    });
    section.appendChild(gList);
  }
  section.appendChild(renderEvidenceMapSummary(detail));
  if (hasStructuredContent(detail.diagnostics)) {
    section.appendChild(
      renderContentCard(
        "Diagnostics",
        renderKeyValueList(
          isRecord(detail.diagnostics)
            ? detail.diagnostics
            : { value: detail.diagnostics },
        ),
      ),
    );
  }
  if (hasStructuredContent(detail.source_artifacts)) {
    section.appendChild(
      renderContentCard(
        "Source Artifacts",
        renderParagraphs(JSON.stringify(detail.source_artifacts, null, 2)),
      ),
    );
  }
  if (section.childElementCount <= 2) {
    section.appendChild(renderEmptyStructuredState("No coverage data"));
  }
  return section;
}

function renderTopicStatisticsSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", "Statistics"));
  const stats = (detail.statistics || {}) as Record<string, unknown>;
  if (hasStructuredContent(stats)) {
    const dash = el("div", "overview-dashboard");
    const paperVal = stats.paper_count ?? detail.paper_count;
    const timeSpan = stats.time_span;
    const timeSpanVal = isRecord(timeSpan)
      ? `${timeSpan.earliest || timeSpan.start_year || "?"} - ${timeSpan.latest || timeSpan.end_year || "?"}`
      : textValue(timeSpan);
    [
      ["Papers", paperVal],
      ["Time span", timeSpanVal],
      ["Coverage Verdict", stats.coverage_verdict],
    ].forEach(([label, value]) => {
      if (!textValue(value)) return;
      const metric = el("div", "dashboard-metric");
      metric.appendChild(el("div", "metric-label", String(label)));
      metric.appendChild(el("div", "metric-value", String(value)));
      dash.appendChild(metric);
    });
    if (dash.childElementCount) section.appendChild(dash);

    const dash2 = el("div", "overview-dashboard");
    if (stats.route_coverage) {
      const rcCard = el("div", "dashboard-metric span-2");
      rcCard.appendChild(el("div", "metric-label", "Route Coverage"));
      rcCard.appendChild(
        renderKeyValueList(
          isRecord(stats.route_coverage)
            ? stats.route_coverage
            : { value: stats.route_coverage },
        ),
      );
      dash2.appendChild(rcCard);
    }

    const metricCard = el("div", "dashboard-metric span-2");
    metricCard.appendChild(el("div", "metric-label", "Full Statistics"));
    const filteredStats = { ...stats };
    delete filteredStats.route_coverage;
    delete filteredStats.coverage_verdict;
    delete filteredStats.time_span;
    delete filteredStats.paper_count;
    metricCard.appendChild(renderKeyValueList(filteredStats));
    dash2.appendChild(metricCard);

    section.appendChild(dash2);
  }
  if (hasStructuredContent(detail.coverage)) {
    section.appendChild(
      renderContentCard("Coverage", renderKeyValueList(detail.coverage || {})),
    );
  }
  if (section.childElementCount <= 1) {
    section.appendChild(renderEmptyStructuredState("No statistics data"));
  }
  return section;
}

function renderTopicReportSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section topic-report-section");
  section.appendChild(el("h2", "", "Synthesis Report"));
  const report = detail.synthesis_report || {};
  const title = firstText(report, ["title", "heading"]);
  if (title) section.appendChild(el("h3", "", title));
  const body = firstText(report, ["body", "markdown", "text", "report"]);
  if (body) {
    section.appendChild(
      renderContentCard("Report Body", renderParagraphs(body), "report-card"),
    );
  }
  const sourceChapters = isRecord(report.source_section_chapters)
    ? report.source_section_chapters
    : {};
  if (hasStructuredContent(sourceChapters)) {
    section.appendChild(
      renderContentCard("Source Chapters", renderKeyValueList(sourceChapters)),
    );
  }
  if (section.childElementCount <= 1) {
    section.appendChild(renderEmptyStructuredState("No synthesis report"));
  }
  return section;
}

function renderTopicProvenanceSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section topic-provenance-section");
  section.appendChild(el("h2", "", "Provenance"));
  const provenance = detail.artifact_provenance || {};
  const manifest = detail.manifest || {};
  const metadata = detail.metadata || {};
  const sections = isRecord(provenance.sections)
    ? provenance.sections
    : isRecord(manifest.sections)
      ? manifest.sections
      : {};
  const sidecars = isRecord(provenance.sidecars)
    ? provenance.sidecars
    : isRecord(manifest.sidecars)
      ? manifest.sidecars
      : {};

  const summary = {
    manifest_schema:
      textValue(provenance.manifest_schema_id) ||
      textValue(manifest.schema_id) ||
      "-",
    operation:
      textValue(provenance.operation) || textValue(metadata.operation) || "-",
    section_count:
      textValue(provenance.section_count) || Object.keys(sections).length,
    sidecar_count:
      textValue(provenance.sidecar_count) || Object.keys(sidecars).length,
    artifact_hash:
      textValue(provenance.artifact_hash) || textValue(detail.artifact_hash),
    manifest_hash: textValue(provenance.manifest_hash),
    export_hash:
      textValue(provenance.export_hash) || textValue(detail.markdown_hash),
  };
  section.appendChild(
    renderContentCard("Artifact Summary", renderKeyValueList(summary)),
  );

  if (Object.keys(sections).length) {
    const rows = Object.entries(sections)
      .filter(([, entry]) => isRecord(entry))
      .map(([name, entry]) => ({
        name,
        path: textValue((entry as Record<string, unknown>).path),
        hash: textValue((entry as Record<string, unknown>).hash),
        content_type: textValue(
          (entry as Record<string, unknown>).content_type,
        ),
      }));
    section.appendChild(
      renderContentCard(
        "Sections",
        matrixTableView(["Section", "Path", "Content"], rows, (row) => [
          el("strong", "", textValue(row.name)),
          el("span", "muted", textValue(row.path)),
          el("span", "muted", textValue(row.content_type || "-")),
        ]),
      ),
    );
  }

  if (Object.keys(sidecars).length) {
    const rows = Object.entries(sidecars)
      .filter(([, entry]) => isRecord(entry))
      .map(([name, entry]) => ({
        name,
        path: textValue((entry as Record<string, unknown>).path),
        schema_id: textValue((entry as Record<string, unknown>).schema_id),
      }));
    section.appendChild(
      renderContentCard(
        "Sidecars",
        matrixTableView(["Sidecar", "Schema", "Path"], rows, (row) => [
          el("strong", "", textValue(row.name)),
          el("span", "muted", textValue(row.schema_id || "-")),
          el("span", "muted", textValue(row.path)),
        ]),
      ),
    );
  }

  if (hasStructuredContent(detail.source_artifacts)) {
    section.appendChild(
      renderContentCard(
        "Source Artifacts",
        renderKeyValueList(
          isRecord(detail.source_artifacts)
            ? detail.source_artifacts
            : { value: detail.source_artifacts },
        ),
      ),
    );
  }

  if (hasStructuredContent(detail.diagnostics)) {
    section.appendChild(
      renderContentCard(
        "Diagnostics",
        renderKeyValueList(
          isRecord(detail.diagnostics)
            ? detail.diagnostics
            : { value: detail.diagnostics },
        ),
      ),
    );
  }

  if (section.childElementCount <= 1) {
    section.appendChild(renderEmptyStructuredState("No provenance data"));
  }
  return section;
}

function renderTopicSection(detail: TopicDetailDto) {
  if (state.topicDetailSection === "taxonomy")
    return renderTopicTaxonomySection(detail);
  if (state.topicDetailSection === "claims")
    return renderTopicClaimsSection(detail);
  if (state.topicDetailSection === "references")
    return renderTopicReferencesSection(detail);
  if (state.topicDetailSection === "compare")
    return renderTopicCompareSection(detail);
  if (state.topicDetailSection === "external")
    return renderTopicExternalSection(detail);
  if (state.topicDetailSection === "coverage")
    return renderTopicCoverageSection(detail);
  if (state.topicDetailSection === "statistics")
    return renderTopicStatisticsSection(detail);
  if (state.topicDetailSection === "report")
    return renderTopicReportSection(detail);
  if (state.topicDetailSection === "provenance")
    return renderTopicProvenanceSection(detail);
  return renderTopicOverviewSection(detail);
}

function renderTopicTabs() {
  const tabs = el("nav", "topic-detail-tabs");
  const entries: Array<[TopicDetailSection, string]> = [
    ["overview", "Overview"],
    ["taxonomy", "Taxonomy"],
    ["claims", "Claims"],
    ["references", "References"],
    ["compare", "Compare"],
    ["external", "External"],
    ["coverage", "Coverage"],
    ["statistics", "Stats"],
    ["report", "Report"],
    ["provenance", "Provenance"],
  ];
  entries.forEach(([id, label]) => {
    const button = el(
      "button",
      state.topicDetailSection === id ? "active" : "",
      label,
    );
    button.type = "button";
    button.addEventListener("click", () => {
      state.topicDetailSection = id;
      render();
    });
    tabs.appendChild(button);
  });
  return tabs;
}

function selectedEvidence(detail: TopicDetailDto) {
  const rows = evidenceRows(detail);
  if (!state.selectedEvidenceId) {
    return undefined;
  }
  return rows.find((row) =>
    evidenceRefKeys(row).has(state.selectedEvidenceId || ""),
  );
}

function derivedEvidenceLinks(
  detail: TopicDetailDto,
  evidence: Record<string, unknown>,
) {
  const keys = evidenceRefKeys(evidence);
  const matches = {
    claims: [] as string[],
    timeline: [] as string[],
    taxonomy: [] as string[],
  };
  recordArray(detail.claims).forEach((claim, index) => {
    const refs = stringArray(claim.evidence_refs || claim.paper_evidence_refs);
    if (refs.some((ref) => keys.has(ref))) {
      matches.claims.push(
        firstText(claim, ["id", "label", "text", "claim"], `C${index + 1}`),
      );
    }
  });
  topicTimelineEvents(detail).forEach((event, index) => {
    const eventEvidence = primaryEvidenceForEvent(detail, event);
    if (eventEvidence && evidenceId(eventEvidence) === evidenceId(evidence)) {
      matches.timeline.push(
        firstText(event, ["id", "label", "title"], `T${index + 1}`),
      );
    }
  });
  recordArray(detail.taxonomy?.nodes).forEach((node, index) => {
    const refs = stringArray(
      node.evidence_refs || node.paper_unit_refs || node.paper_refs,
    );
    if (refs.some((ref) => keys.has(ref))) {
      matches.taxonomy.push(
        firstText(node, ["id", "label", "title", "name"], `N${index + 1}`),
      );
    }
  });
  return matches;
}

function renderSelectedEvidenceCard(
  detail: TopicDetailDto,
  selected: Record<string, unknown>,
) {
  const card = el("div", "selected-evidence-card");
  const rows = evidenceRows(detail);
  const index = Math.max(
    0,
    rows.findIndex((row) => evidenceId(row) === evidenceId(selected)),
  );
  const chipRow = el("div", "chip-row");
  chipRow.appendChild(badge("selected evidence", "blue"));
  const status = firstText(selected, ["status", "freshness", "source_status"]);
  if (status) chipRow.appendChild(badge(status, toneFor(status)));
  card.appendChild(chipRow);
  card.appendChild(el("span", "evidence-code", evidenceCode(selected, index)));
  card.appendChild(el("h2", "", evidenceTitle(selected, index)));
  const meta = [
    firstText(selected, ["year", "publication_year"]),
    firstText(selected, ["paper_ref", "paperRef", "item_key", "itemKey"]),
  ]
    .filter(Boolean)
    .join(" | ");
  if (meta) card.appendChild(el("p", "muted", meta));
  const summary = firstText(selected, [
    "summary",
    "evidence_summary",
    "topic_relevance",
    "rationale",
  ]);
  if (summary) card.appendChild(renderParagraphs(summary));
  const links = derivedEvidenceLinks(detail, selected);
  const linkList = el("div", "evidence-stack");
  Object.entries(links).forEach(([kind, refs]) => {
    if (!refs.length) return;
    const row = el("div", "evidence-row");
    row.appendChild(el("strong", "", kind));
    row.appendChild(el("span", "muted", refs.join(", ")));
    linkList.appendChild(row);
  });
  if (linkList.childElementCount) card.appendChild(linkList);
  const open = el("button", "primary", "Open Digest Artifact");
  open.type = "button";
  open.addEventListener("click", () => openDigestModal(selected));
  card.appendChild(open);
  return card;
}

function renderEvidenceExplorer(detail: TopicDetailDto) {
  const explorer = el("aside", "evidence-explorer");
  const header = el("div", "explorer-head");
  header.appendChild(el("h2", "", "Evidence Explorer"));
  const close = el("button", "icon-button evidence-drawer-close", "Close");
  close.type = "button";
  close.title = "Close Evidence Explorer";
  close.addEventListener("click", () => {
    state.evidenceExplorerOpen = false;
    render();
  });
  header.appendChild(close);
  explorer.appendChild(header);
  const rows = evidenceRows(detail);
  if (!rows.length) {
    explorer.appendChild(el("div", "empty", "No paper evidence is linked."));
    return explorer;
  }
  const selected = selectedEvidence(detail);
  if (!selected) {
    const empty = el("div", "explorer-empty");
    empty.appendChild(el("strong", "", "No evidence selected"));
    empty.appendChild(
      el(
        "p",
        "muted",
        "Select evidence from a claim, taxonomy node, comparison row, or timeline marker.",
      ),
    );
    explorer.appendChild(empty);
    return explorer;
  }
  explorer.appendChild(renderSelectedEvidenceCard(detail, selected));
  return explorer;
}

function renderEvidenceDrawer(detail: TopicDetailDto) {
  const drawer = el(
    "div",
    `evidence-drawer${state.evidenceExplorerOpen ? " open" : ""}`,
  );
  drawer.setAttribute(
    "aria-hidden",
    state.evidenceExplorerOpen ? "false" : "true",
  );
  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) {
      state.evidenceExplorerOpen = false;
      render();
    }
  });
  const panel = el("div", "evidence-drawer-panel");
  panel.setAttribute("role", "complementary");
  panel.setAttribute("aria-label", "Evidence Explorer");
  panel.appendChild(renderEvidenceExplorer(detail));
  drawer.appendChild(panel);
  return drawer;
}

function numericYear(value: unknown) {
  const number = Number(value);
  if (
    Number.isFinite(number) &&
    number >= 1500 &&
    number <= 2199 &&
    Number.isInteger(number)
  ) {
    return number;
  }

  const text = textValue(value).trim();
  if (!text) return NaN;

  const match4 = text.match(/\b(?:1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  if (match4) return Number(match4[0]);

  const matchCh = text.match(/(\d{2})年/);
  if (matchCh) {
    const year = Number(matchCh[1]);
    return year >= 50 ? 1900 + year : 2000 + year;
  }

  const matchPrefix = text.match(/^(\d{2})[-/]\d{1,2}\b/);
  if (matchPrefix) {
    const year = Number(matchPrefix[1]);
    if (year >= 20 && year <= 35) return 2000 + year;
  }

  const matchQuote = text.match(/['’](\d{2})\b/);
  if (matchQuote) {
    const year = Number(matchQuote[1]);
    return year >= 50 ? 1900 + year : 2000 + year;
  }

  return NaN;
}

type TimelineCluster = {
  key: string;
  label: string;
  left: number;
  items: TimelineItem[];
};

type PlacedTimelineItem = {
  cluster: TimelineCluster;
  item: TimelineItem;
  left: number;
};

const TIMELINE_LABEL_COLLISION_GAP_PERCENT = 7;

type TimelineItem = {
  key: string;
  kind: "paper" | "event";
  year: number;
  label: string;
  title: string;
  order: number;
  evidence?: Record<string, unknown>;
  event?: Record<string, unknown>;
  weight: number;
  tone:
    | "paper"
    | "milestone"
    | "frontier"
    | "foundation"
    | "external"
    | "warning";
};

function timelineLeft(
  index: number,
  total: number,
  year: number,
  minYear: number,
  maxYear: number,
) {
  if (
    Number.isFinite(year) &&
    Number.isFinite(minYear) &&
    Number.isFinite(maxYear) &&
    maxYear > minYear
  ) {
    return ((year - minYear) / (maxYear - minYear)) * 100;
  }
  return total <= 1 ? 50 : (index / (total - 1)) * 100;
}

function timelineAxisTicks(
  minYear: number,
  maxYear: number,
): { label: string; left: number }[] {
  if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
    return [
      { label: "Start", left: 0 },
      { label: "End", left: 100 },
    ];
  }
  const span = Math.max(1, maxYear - minYear);
  let stepInterval = 1;
  if (span > 15 && span <= 30) stepInterval = 2;
  else if (span > 30 && span <= 75) stepInterval = 5;
  else if (span > 75 && span <= 150) stepInterval = 10;
  else if (span > 150) stepInterval = Math.ceil(span / 10);

  const ticks: { label: string; left: number }[] = [];
  for (let y = minYear; y <= maxYear; y += stepInterval) {
    ticks.push({
      label: String(y),
      left: ((y - minYear) / span) * 100,
    });
  }
  if (ticks.length > 0 && Math.round(ticks[ticks.length - 1].left) !== 100) {
    ticks.push({
      label: String(maxYear),
      left: 100,
    });
  }
  return ticks;
}

function evidenceYear(evidence: Record<string, unknown>) {
  const keys = [
    "year",
    "publication_year",
    "publicationYear",
    "paper_year",
    "paperYear",
    "published_year",
    "publishedYear",
    "date",
    "published_at",
    "publishedAt",
    "publication_date",
    "publicationDate",
  ];
  const direct = numericYear(firstText(evidence, keys));
  if (Number.isFinite(direct)) return direct;
  for (const containerKey of [
    "bibliographic",
    "metadata",
    "paper",
    "source",
    "item",
  ]) {
    const nested = recordValue(evidence[containerKey]);
    const nestedYear = numericYear(firstText(nested, keys));
    if (Number.isFinite(nestedYear)) return nestedYear;
  }
  return NaN;
}

function eventYear(event: Record<string, unknown> | undefined) {
  return numericYear(
    event?.year ||
      event?.date ||
      event?.publication_year ||
      event?.publicationYear,
  );
}

function timelineItemSortKey(item: TimelineItem) {
  const evidence = item.evidence || {};
  const ref = firstText(evidence, ["paper_ref", "id"]);
  const itemKey = ref.includes(":") ? ref.split(":").pop() : ref;
  const semanticKey = (
    itemKey ||
    item.key ||
    item.label ||
    item.title ||
    ""
  ).toLowerCase();
  return `${semanticKey}:${String(item.order).padStart(6, "0")}`;
}

function eventReferencesEvidence(
  event: Record<string, unknown>,
  evidence: Record<string, unknown>,
) {
  const keys = evidenceRefKeys(evidence);
  const refs = [
    ...stringArray(event.evidence_refs),
    ...stringArray(event.paper_evidence_refs),
    ...stringArray(event.paper_refs),
    ...stringArray(event.source_paper_refs),
  ];
  const direct = firstText(event, [
    "paper_evidence_id",
    "evidence_id",
    "paper_ref",
  ]);
  if (direct) refs.push(direct);
  return refs.some((ref) => {
    const id = textValue(ref);
    if (!id) return false;
    if (keys.has(id)) return true;
    return Array.from(keys).some((key) => id.endsWith(key) || key.endsWith(id));
  });
}

function metricNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function nestedMetric(evidence: Record<string, unknown>, key: string) {
  if (key in evidence) return evidence[key];
  for (const containerKey of [
    "graph_metrics",
    "metrics",
    "citation_graph_metrics",
  ]) {
    const container = recordValue(evidence[containerKey]);
    if (key in container) return container[key];
  }
  return undefined;
}

function timelineWeight(
  evidence: Record<string, unknown> | undefined,
  event: Record<string, unknown> | undefined,
) {
  const explicit = metricNumber(
    event?.importance ||
      event?.weight ||
      evidence?.importance ||
      evidence?.weight,
  );
  if (Number.isFinite(explicit))
    return Math.max(0.85, Math.min(1.35, 0.95 + explicit * 0.2));
  const foundation = metricNumber(
    nestedMetric(evidence || {}, "foundation_score"),
  );
  const frontier = metricNumber(nestedMetric(evidence || {}, "frontier_score"));
  const score = Math.max(
    Number.isFinite(foundation) ? foundation : 0,
    Number.isFinite(frontier) ? frontier : 0,
  );
  return event ? 1.22 : Math.max(0.9, Math.min(1.2, 0.92 + score * 0.22));
}

function timelineTone(
  evidence: Record<string, unknown> | undefined,
  event: Record<string, unknown> | undefined,
): TimelineItem["tone"] {
  const status = `${textValue(event?.status)} ${textValue(evidence?.status)} ${textValue(evidence?.freshness)}`;
  if (status.match(/stale|dirty|missing|incomplete/i)) return "warning";
  const roleHints = [
    ...stringArray(evidence?.synthesis_role_hints),
    ...stringArray(evidence?.role_hints),
    ...stringArray(nestedMetric(evidence || {}, "synthesis_role_hints")),
  ].join(" ");
  if (roleHints.match(/external-heavy|unresolved/i)) return "external";
  if (roleHints.match(/foundation|core/i)) return "foundation";
  if (roleHints.match(/frontier/i)) return "frontier";
  return event ? "milestone" : "paper";
}

function timelineEventTitle(event: Record<string, unknown> | undefined) {
  return firstText(event || {}, ["event", "title", "label", "summary"]);
}

function timelineMarkerTitle(
  evidence: Record<string, unknown>,
  index: number,
  event: Record<string, unknown> | undefined,
) {
  const paperTitle = evidenceTitle(evidence, index);
  const eventTitle = timelineEventTitle(event);
  if (!eventTitle) return paperTitle;
  if (eventTitle === paperTitle) return paperTitle;
  return `${paperTitle} - ${eventTitle}`;
}

function timelineInYearCoordinate(
  year: number,
  itemIndex: number,
  total: number,
) {
  return year + (itemIndex + 1) / (total + 1);
}

function timelineDenseMarkerKeys(items: PlacedTimelineItem[]) {
  const dense = new Set<string>();
  const sorted = [...items]
    .filter((item) => Number.isFinite(item.left))
    .sort((left, right) => left.left - right.left);
  sorted.forEach((item, index) => {
    const prev = sorted[index - 1];
    const next = sorted[index + 1];
    if (
      (prev && item.left - prev.left < TIMELINE_LABEL_COLLISION_GAP_PERCENT) ||
      (next && next.left - item.left < TIMELINE_LABEL_COLLISION_GAP_PERCENT)
    ) {
      dense.add(item.item.key);
    }
  });
  return dense;
}

function timelineMarkerEvidence(
  marker: Record<string, unknown>,
  papers: Record<string, unknown>[],
) {
  const refs = [
    firstText(marker, ["paper_evidence_id", "evidence_id", "paper_ref"]),
    ...stringArray(marker.evidence_refs),
    ...stringArray(marker.paper_evidence_refs),
    ...stringArray(marker.source_paper_refs),
  ].filter(Boolean);
  return papers.find((evidence) => {
    const keys = evidenceRefKeys(evidence);
    return refs.some((ref) => keys.has(ref));
  });
}

function timelineMarkerEvent(
  marker: Record<string, unknown>,
  events: Record<string, unknown>[],
) {
  const eventId = firstText(marker, ["event_id", "timeline_event_id"]);
  if (!eventId) return undefined;
  return events.find((event) => firstText(event, ["id"]) === eventId);
}

function timelineItems(detail: TopicDetailDto) {
  const events = topicTimelineEvents(detail);
  const papers = evidenceRows(detail);
  const markers = topicTimelineMarkers(detail);
  if (markers.length) {
    return markers.map((marker, index) => {
      const evidence = timelineMarkerEvidence(marker, papers);
      const event = timelineMarkerEvent(marker, events);
      const kindText = firstText(marker, ["kind", "marker_kind", "type"]);
      const kind: TimelineItem["kind"] =
        kindText === "paper" || (!event && !kindText) ? "paper" : "event";
      const evidenceIndex = evidence
        ? Math.max(
            0,
            papers.findIndex((row) => evidenceId(row) === evidenceId(evidence)),
          )
        : index;
      const title =
        firstText(marker, ["title", "label", "summary"]) ||
        (evidence
          ? timelineMarkerTitle(evidence, evidenceIndex, event)
          : timelineEventTitle(event)) ||
        `Marker ${index + 1}`;
      return {
        key:
          firstText(marker, ["id", "marker_id"]) ||
          `marker:${firstText(marker, ["paper_evidence_id", "event_id"], String(index))}`,
        kind,
        year:
          numericYear(firstText(marker, ["year", "date"])) || eventYear(event),
        label:
          firstText(marker, ["label", "code"]) ||
          (evidence ? evidenceCode(evidence, evidenceIndex) : `T${index + 1}`),
        title,
        order: index,
        evidence,
        event,
        weight: timelineWeight(evidence, event),
        tone: timelineTone(evidence, event),
      };
    });
  }
  return papers.map((evidence, index) => {
    const event = events.find((entry) =>
      eventReferencesEvidence(entry, evidence),
    );
    const kind: TimelineItem["kind"] = event ? "event" : "paper";
    const year = eventYear(event) || evidenceYear(evidence);
    const title = timelineMarkerTitle(evidence, index, event);
    return {
      key: `paper:${evidenceId(evidence) || index}`,
      kind,
      year,
      label: evidenceCode(evidence, index),
      title,
      order: index,
      evidence,
      event,
      weight: timelineWeight(evidence, event),
      tone: timelineTone(evidence, event),
    };
  });
}

function renderTimelineClusters(
  detail: TopicDetailDto,
  items: TimelineItem[],
  minYear: number,
  maxYear: number,
) {
  const byYear = new Map<string, TimelineItem[]>();
  items.forEach((item, index) => {
    const year = item.year;
    const key = Number.isFinite(year)
      ? String(Math.floor(year))
      : `phase-${index + 1}`;
    const list = byYear.get(key) || [];
    list.push(item);
    byYear.set(key, list);
  });
  const clusters: TimelineCluster[] = Array.from(byYear.entries()).map(
    ([key, clusterItems], index, all) => {
      const year = Number(key);
      return {
        key,
        label: "",
        left: timelineLeft(index, all.length, year, minYear, maxYear),
        items: clusterItems,
      };
    },
  );
  const fragment = document.createDocumentFragment();
  const placedItems: PlacedTimelineItem[] = [];
  clusters.forEach((cluster, clusterIndex, allClusters) => {
    const year = Number(cluster.key);
    const sortedItems = [...cluster.items].sort((left, right) =>
      timelineItemSortKey(left).localeCompare(timelineItemSortKey(right)),
    );
    sortedItems.forEach((item, itemIndex) => {
      const coordinate = Number.isFinite(year)
        ? timelineInYearCoordinate(year, itemIndex, sortedItems.length)
        : NaN;
      const left = Number.isFinite(coordinate)
        ? timelineLeft(
            clusterIndex,
            allClusters.length,
            coordinate,
            minYear,
            maxYear,
          )
        : cluster.left;
      placedItems.push({
        cluster,
        item,
        left,
      });
    });
  });
  const denseTimelineMarkerKeys = timelineDenseMarkerKeys(placedItems);
  placedItems.forEach((placedItem) => {
    const { cluster, item, left } = placedItem;
    const phase = el("section", "timeline-phase");
    phase.style.left = `${left}%`;
    const title = el("div", "phase-title");
    if (cluster.label) {
      title.appendChild(el("strong", "", cluster.label));
    }
    phase.appendChild(title);
    const markerList = el("div", "marker-list");
    const evidence = item.evidence;
    const markerClasses = [
      "timeline-marker",
      `timeline-${item.kind}`,
      `timeline-tone-${item.tone}`,
    ];
    if (denseTimelineMarkerKeys.has(item.key)) markerClasses.push("too-dense");
    if (evidence && evidenceId(evidence) === state.selectedEvidenceId)
      markerClasses.push("selected");
    const marker = el("button", markerClasses.join(" "));
    marker.type = "button";
    marker.style.left = "0";
    marker.style.setProperty("--pin-scale", String(item.weight));
    marker.title = item.title;
    marker.setAttribute("aria-label", marker.title);
    const code = el("span", "timeline-code", item.label);
    marker.appendChild(code);
    const pin = el("span", "timeline-pin");
    pin.appendChild(el("span", "timeline-pin-body"));
    pin.appendChild(el("span", "timeline-pin-dot"));
    marker.appendChild(pin);
    marker.appendChild(el("span", "timeline-event-label", marker.title));
    if (evidence) {
      marker.addEventListener("click", () => {
        openEvidenceExplorer(evidenceId(evidence));
      });
    } else {
      marker.disabled = true;
    }
    markerList.appendChild(marker);
    phase.appendChild(markerList);
    fragment.appendChild(phase);
  });
  return fragment;
}

function renderTopicTimeline(detail: TopicDetailDto) {
  const items = timelineItems(detail);
  items.sort((a, b) => {
    const aFinite = Number.isFinite(a.year);
    const bFinite = Number.isFinite(b.year);
    if (aFinite && bFinite) return a.year - b.year;
    if (aFinite) return -1;
    if (bFinite) return 1;
    return 0;
  });
  const rail = el("section", "topic-timeline");
  const head = el("div", "timeline-head");
  head.appendChild(el("strong", "", "Timeline"));

  // Legend
  const legend = el("div", "timeline-legend");

  const legEvent = el("div", "legend-item");
  const dotEvent = el("span", "legend-icon legend-icon-event");
  legEvent.appendChild(dotEvent);
  legEvent.appendChild(el("span", "legend-label", "Key Milestones"));
  legend.appendChild(legEvent);

  const legPaper = el("div", "legend-item");
  const dotPaper = el("span", "legend-icon legend-icon-paper");
  legPaper.appendChild(dotPaper);
  legPaper.appendChild(el("span", "legend-label", "Literature Papers"));
  legend.appendChild(legPaper);

  head.appendChild(legend);
  rail.appendChild(head);

  const summaryText = firstText(topicTimelineSummary(detail), [
    "text",
    "analysis",
    "overview",
  ]);
  if (summaryText) {
    const summBlock = el("div", "timeline-summary");
    summBlock.appendChild(renderParagraphs(summaryText));
    rail.appendChild(summBlock);
  }

  const scroll = el("div", "timeline-scroll");
  const timeline = el("div", "horizontal-timeline");
  const trackInner = el("div", "timeline-inner-rail");

  const years = items.map((item) => item.year).filter(Number.isFinite);
  const minYear = years.length ? Math.min(...years) : NaN;
  const maxYear = years.length ? Math.max(...years) + 1 : NaN;
  const axis = el("div", "time-axis");
  const ticks = timelineAxisTicks(minYear, maxYear);
  ticks.forEach((tick) => {
    const stepEl = el("span", "", tick.label);
    stepEl.style.position = "absolute";
    stepEl.style.left = `${tick.left}%`;
    stepEl.style.transform = "translateX(-50%)";
    axis.appendChild(stepEl);
  });
  trackInner.appendChild(axis);
  trackInner.appendChild(
    renderTimelineClusters(detail, items, minYear, maxYear),
  );
  timeline.appendChild(trackInner);
  scroll.appendChild(timeline);
  rail.appendChild(scroll);
  return rail;
}

function renderTopicDetailToolbar(detail: TopicDetailDto, snapshot: Snapshot) {
  const topicId = detail.topicId || snapshot.reader?.topicId || "";
  const updateRow = topicRowById(snapshot, topicId);
  const updateIntent = updateRow ? topicUpdateIntent(updateRow) : null;
  const toolbar = el("div", "toolbar topic-detail-toolbar");
  const meta = el("div", "topic-detail-toolbar-meta");
  meta.appendChild(badge(detail.language || "auto", "blue"));
  meta.appendChild(badge(`${numberValue(detail.paper_count)} papers`, "green"));
  meta.appendChild(
    badge(
      `${numberValue(detail.external_literature_count)} external refs`,
      "purple",
    ),
  );
  const coverageVerdict = firstText(detail.coverage || {}, [
    "coverage_verdict",
    "coverage_judgment",
  ]);
  if (coverageVerdict) {
    meta.appendChild(badge(coverageVerdict, toneFor(coverageVerdict)));
  }
  toolbar.appendChild(meta);

  const actions = el("div", "topic-detail-toolbar-actions");
  actions.appendChild(
    makeButton("Back to Topics", "selectTab", { tab: "artifacts" }),
  );
  actions.appendChild(
    makeButton(
      String(updateIntent?.actionLabel || "Update"),
      "hostCommand",
      {
        command: "submitTopicSynthesisUpdate",
        args: { topicId },
      },
      false,
      !updateIntent,
    ),
  );
  const copySummary = el("button", "", "Copy Summary");
  copySummary.type = "button";
  copySummary.addEventListener("click", () => {
    const summary = textValue(
      detail.summary?.brief || detail.summary?.summary || detail.title,
    );
    void navigator.clipboard?.writeText(summary);
  });
  actions.appendChild(copySummary);
  actions.appendChild(
    makeButton("Markdown export", "hostCommand", {
      command: "openCanonicalMarkdown",
      args: { topicId },
    }),
  );
  actions.appendChild(
    makeButton("Open folder", "hostCommand", {
      command: "openSynthesisFolder",
      args: { topicId },
    }),
  );
  toolbar.appendChild(actions);
  return toolbar;
}

function renderTopicDetail(main: HTMLElement, snapshot: Snapshot) {
  renderTopicDetailShell(main, snapshot);
}

function renderTopicProvenanceAside(detail: TopicDetailDto) {
  const aside = el("aside", "topic-provenance-aside");
  aside.appendChild(el("h3", "", "Artifact"));
  const provenance = detail.artifact_provenance || {};
  const rows = {
    operation:
      textValue(provenance.operation) || textValue(detail.metadata?.operation),
    sections: textValue(provenance.section_count),
    sidecars: textValue(provenance.sidecar_count),
    manifest_hash: textValue(provenance.manifest_hash),
    artifact_hash:
      textValue(provenance.artifact_hash) || textValue(detail.artifact_hash),
  };
  aside.appendChild(renderKeyValueList(rows));
  const open = el("button", "", "Provenance");
  open.type = "button";
  open.addEventListener("click", () => {
    state.topicDetailSection = "provenance";
    render();
  });
  aside.appendChild(open);
  return aside;
}

function renderTopicDetailShell(root: HTMLElement, snapshot: Snapshot) {
  const detail = state.topicDetail;
  const app = el("div", "topic-detail-shell detail-shell-in-workbench");
  if (!detail) {
    app.appendChild(
      renderEmptyState({
        title: "No structured topic selected",
        message: "Open a topic from the Topics tab to inspect its synthesis.",
        tone: "info",
      }),
    );
    root.appendChild(app);
    return;
  }
  const body = el("section", "topic-detail");
  const workbench = el("div", "topic-detail-layout");
  workbench.appendChild(renderTopicTabs());
  const reader = el("main", "topic-reading-surface");
  reader.appendChild(renderTopicSection(detail));
  workbench.appendChild(reader);
  workbench.appendChild(renderTopicProvenanceAside(detail));
  body.appendChild(workbench);
  body.appendChild(renderEvidenceDrawer(detail));
  body.appendChild(renderTopicTimeline(detail));
  app.appendChild(body);
  root.appendChild(app);
}

function renderArtifactReader(main: HTMLElement, snapshot: Snapshot) {
  const topicId =
    state.artifactReader?.topicId || snapshot.reader?.topicId || "";
  const reader = state.artifactReader;
  const panel = el("div", "reader-panel immersive-reader");
  const header = el("div", "reader-header");
  const titleGroup = el("div", "reader-title");
  titleGroup.appendChild(
    el("strong", "", reader?.title || topicId || "Artifact"),
  );
  const metaLine = [
    reader?.updated_at ? `Updated ${reader.updated_at}` : "",
    reader?.hash ? `Hash ${reader.hash}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  if (metaLine) {
    titleGroup.appendChild(el("span", "muted", metaLine));
  }
  header.appendChild(titleGroup);
  const actions = el("div", "toolbar");
  actions.appendChild(makeButton("Back to Artifacts", "closeArtifactReader"));
  actions.appendChild(
    makeButton("Refresh", "hostCommand", {
      command: "openCanonicalMarkdown",
      args: { topicId },
    }),
  );
  const copy = el("button", "", "Copy Markdown");
  copy.type = "button";
  copy.addEventListener("click", () => {
    void navigator.clipboard?.writeText(reader?.markdown || "");
  });
  actions.appendChild(copy);
  actions.appendChild(
    makeButton("Open folder", "hostCommand", {
      command: "openSynthesisFolder",
      args: { topicId },
    }),
  );
  header.appendChild(actions);
  panel.appendChild(header);
  if (!reader) {
    panel.appendChild(
      renderEmptyState({
        title: "No artifact selected",
        message: "Open a topic artifact to preview its Markdown export.",
        tone: "info",
      }),
    );
  } else {
    panel.appendChild(renderMarkdown(reader.markdown));
  }
  main.appendChild(panel);
}

function registryReferences(row: Record<string, unknown>) {
  return Array.isArray(row.references)
    ? (row.references as Array<Record<string, unknown>>)
    : [];
}

function registryRowKey(row: Record<string, unknown>) {
  return (
    textValue(row.paper_ref) ||
    textValue(row.literature_item_id) ||
    textValue(row.title)
  );
}

function registryRowDisplayId(row: Record<string, unknown>) {
  return textValue(row.paper_ref) || textValue(row.literature_item_id) || "-";
}

function registryReferencePrimaryTitle(reference: Record<string, unknown>) {
  return (
    textValue(reference.target_title) ||
    textValue(reference.title) ||
    textValue(reference.raw_reference) ||
    textValue(reference.target_paper_ref) ||
    textValue(reference.target_literature_item_id) ||
    textValue(reference.reference_instance_id) ||
    "Untitled reference"
  );
}

function registryReferenceDisplayIndex(reference: Record<string, unknown>) {
  const index = Number(reference.reference_index);
  return Number.isFinite(index) ? `#${Math.max(0, Math.floor(index)) + 1}` : "";
}

function registryReferenceTargetId(reference: Record<string, unknown>) {
  return (
    textValue(reference.target_paper_ref) ||
    textValue(reference.target_literature_item_id)
  );
}

function registryReferenceDisplayId(reference: Record<string, unknown>) {
  return (
    registryReferenceTargetId(reference) ||
    textValue(reference.reference_instance_id) ||
    "-"
  );
}

function registryReferenceReadableTitle(reference: Record<string, unknown>) {
  return (
    textValue(reference.title) ||
    textValue(reference.raw_reference) ||
    textValue(reference.reference_instance_id) ||
    "Untitled reference"
  );
}

function targetPaperRefForProposal(proposal: Record<string, unknown>) {
  const itemKey = textValue(proposal.target_item_key);
  if (!itemKey) {
    return "";
  }
  const libraryId = Number(proposal.target_library_id || 0);
  return `${Number.isFinite(libraryId) && libraryId > 0 ? Math.floor(libraryId) : ""}:${itemKey}`.replace(
    /^:/,
    "",
  );
}

function buildRegistryReviewLookup(snapshot: Snapshot) {
  const sourceByRawReferenceId = new Map<
    string,
    { source: Record<string, unknown>; reference: Record<string, unknown> }
  >();
  const rowByPaperRef = new Map<string, Record<string, unknown>>();
  const rowByItemKey = new Map<string, Record<string, unknown>>();
  for (const row of snapshot.registry.rows || []) {
    const paperRef = textValue(row.paper_ref);
    if (paperRef) {
      rowByPaperRef.set(paperRef, row);
      const itemKey = paperRef.split(":").pop() || "";
      if (itemKey) {
        rowByItemKey.set(itemKey, row);
      }
    }
    for (const reference of registryReferences(row)) {
      const referenceId = textValue(reference.reference_instance_id);
      if (referenceId) {
        sourceByRawReferenceId.set(referenceId, { source: row, reference });
      }
    }
  }
  return { sourceByRawReferenceId, rowByPaperRef, rowByItemKey };
}

type RegistryReviewLookup = ReturnType<typeof buildRegistryReviewLookup>;

function referenceMatchProposalContext(
  snapshot: Snapshot,
  proposal: Record<string, unknown>,
  lookup: RegistryReviewLookup,
) {
  const evidence =
    proposal.evidence && typeof proposal.evidence === "object"
      ? (proposal.evidence as Record<string, unknown>)
      : {};
  const sourceEvidence =
    evidence.source && typeof evidence.source === "object"
      ? (evidence.source as Record<string, unknown>)
      : {};
  const targetEvidence =
    evidence.target && typeof evidence.target === "object"
      ? (evidence.target as Record<string, unknown>)
      : {};
  const rawIds = Array.isArray(proposal.source_raw_reference_ids)
    ? proposal.source_raw_reference_ids
        .map((value) => textValue(value))
        .filter(Boolean)
    : [];
  const sourceMatch = rawIds
    .map((id) => lookup.sourceByRawReferenceId.get(id))
    .find(Boolean);
  const targetRef = targetPaperRefForProposal(proposal);
  const targetRow =
    (targetRef ? lookup.rowByPaperRef.get(targetRef) : undefined) ||
    lookup.rowByItemKey.get(textValue(proposal.target_item_key));
  const targetFallback =
    targetRef ||
    textValue(proposal.target_item_key) ||
    textValue(targetEvidence.title) ||
    textValue(targetEvidence.normalized_title) ||
    textValue(proposal.target_canonical_reference_id) ||
    "Unknown target";
  const targetEvidenceTitle =
    textValue(targetEvidence.title) ||
    textValue(targetEvidence.normalized_title);
  const parentItemTitle = sourceMatch?.source
    ? textValue(sourceMatch.source.title, "Unknown parent item")
    : "Unknown parent item";
  return {
    proposal,
    sourceReference: sourceMatch?.reference,
    sourcePaper: sourceMatch?.source,
    targetPaper: targetRow,
    sourceReferenceTitle: sourceMatch?.reference
      ? registryReferenceReadableTitle(sourceMatch.reference)
      : textValue(sourceEvidence.title) ||
        textValue(sourceEvidence.normalized_title) ||
        textValue(proposal.source_canonical_reference_id, "Unknown reference"),
    parentItemTitle,
    sourcePaperTitle: parentItemTitle,
    targetPaperTitle: targetRow
      ? textValue(targetRow.title, targetFallback)
      : targetEvidenceTitle || `${targetFallback} (fallback id)`,
    targetPaperRef: targetRow
      ? registryRowDisplayId(targetRow)
      : targetFallback,
    rawReferenceIds: rawIds,
  };
}

function registryStatusTone(value: unknown) {
  const status = textValue(value);
  if (status === "accepted") {
    return "blue";
  }
  if (status === "candidate" || status === "stale_target") {
    return "warn";
  }
  if (status === "unbound" || status === "rejected") {
    return "danger";
  }
  return toneFor(status);
}

function normalizeReferenceProposalAction(
  value: unknown,
): ReferenceProposalAction {
  const action = textValue(value);
  if (
    action === "reject" ||
    action === "reverse_accept" ||
    action === "reopen" ||
    action === "delete"
  ) {
    return action;
  }
  return "accept";
}

function referenceProposalDecisionArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((entry) => ({
          proposalId: textValue(entry.proposalId || entry.proposal_id),
          action: normalizeReferenceProposalAction(entry.action),
        }))
        .filter((entry) => entry.proposalId)
    : [];
}

function referenceProposalId(proposal: Record<string, unknown>) {
  return textValue(proposal.proposal_id);
}

function pendingReferenceProposalDecision(proposalId: string) {
  return state.pendingReferenceProposalDecisions.get(proposalId);
}

function isReferenceProposalDecisionSubmitting(proposalId?: string) {
  const submission = state.referenceProposalSubmission;
  if (!submission) {
    return false;
  }
  if (!proposalId) {
    return true;
  }
  return submission.proposalIds.includes(proposalId);
}

function queueReferenceProposalDecision(
  proposalId: string,
  action: ReferenceProposalAction,
) {
  if (!proposalId || isReferenceProposalDecisionSubmitting(proposalId)) {
    return;
  }
  state.pendingReferenceProposalDecisions.set(proposalId, {
    proposalId,
    action,
    createdAt: Date.now(),
  });
  refreshReferenceReviewSurfaces();
}

function renderReferenceMatchDecisionSummary(args: {
  source: string;
  target: string;
}) {
  const summary = el("div", "reference-review-summary");
  const source = el("div", "reference-review-summary-row");
  source.appendChild(el("span", "reference-review-summary-label", "Source:"));
  source.appendChild(el("strong", "", args.source));
  summary.appendChild(source);
  const target = el("div", "reference-review-summary-row");
  target.appendChild(el("span", "reference-review-summary-label", "Target:"));
  target.appendChild(el("strong", "", args.target));
  summary.appendChild(target);
  return summary;
}

function queueReferenceProposalDecisions(
  proposals: Array<Record<string, unknown>>,
  action: ReferenceProposalAction,
) {
  if (isReferenceProposalDecisionSubmitting()) {
    return;
  }
  proposals.forEach((proposal) => {
    const proposalId = referenceProposalId(proposal);
    if (proposalId) {
      state.pendingReferenceProposalDecisions.set(proposalId, {
        proposalId,
        action,
        createdAt: Date.now(),
      });
    }
  });
  refreshReferenceReviewSurfaces();
}

function cancelReferenceProposalDecision(proposalId: string) {
  state.pendingReferenceProposalDecisions.delete(proposalId);
  refreshReferenceReviewSurfaces();
}

function clearReferenceProposalSelections() {
  state.selectedReferenceProposalIds.clear();
  refreshReferenceReviewSurfaces();
}

function toggleReferenceProposalSelection(
  proposalId: string,
  selected: boolean,
) {
  if (!proposalId) {
    return;
  }
  if (selected) {
    state.selectedReferenceProposalIds.add(proposalId);
  } else {
    state.selectedReferenceProposalIds.delete(proposalId);
  }
  refreshReferenceReviewSurfaces();
}

function toggleReferenceProposalRowsSelection(
  proposals: Array<Record<string, unknown>>,
  selected: boolean,
) {
  proposals.forEach((proposal) => {
    const proposalId = referenceProposalId(proposal);
    if (!proposalId) {
      return;
    }
    if (selected) {
      state.selectedReferenceProposalIds.add(proposalId);
    } else {
      state.selectedReferenceProposalIds.delete(proposalId);
    }
  });
  refreshReferenceReviewSurfaces();
}

function applyPendingReferenceProposalDecisions() {
  if (
    isReferenceProposalDecisionSubmitting() ||
    !state.pendingReferenceProposalDecisions.size
  ) {
    return;
  }
  const decisions = Array.from(
    state.pendingReferenceProposalDecisions.values(),
  ).map((decision) => ({
    proposalId: decision.proposalId,
    action: decision.action,
  }));
  sendAction("hostCommand", {
    command: "applyReferenceMatchProposalActions",
    args: { decisions },
  });
  refreshReferenceReviewSurfaces();
}

function pruneReferenceProposalUiState(snapshot: Snapshot) {
  const knownProposalIds = new Set(
    (snapshot.registry.matchProposals || [])
      .map((proposal) => referenceProposalId(proposal))
      .filter(Boolean),
  );
  state.pendingReferenceProposalDecisions.forEach((_, proposalId) => {
    if (!knownProposalIds.has(proposalId)) {
      state.pendingReferenceProposalDecisions.delete(proposalId);
    }
  });
  state.selectedReferenceProposalIds.forEach((proposalId) => {
    if (!knownProposalIds.has(proposalId)) {
      state.selectedReferenceProposalIds.delete(proposalId);
    }
  });
}

function referenceProposalActionLabel(action: ReferenceProposalAction) {
  return action === "accept"
    ? "Accept"
    : action === "reverse_accept"
      ? "Reverse & accept"
      : action === "reject"
        ? "Reject"
        : action === "reopen"
          ? "Reopen"
          : "Delete";
}

function renderReferenceProposalPendingControls() {
  const pendingCount = state.pendingReferenceProposalDecisions.size;
  const submitting = isReferenceProposalDecisionSubmitting();
  const controls = el("div", "reference-review-pending-controls");
  const apply = makeLocalButton(
    submitting ? "Applying pending" : "Apply pending",
    () => applyPendingReferenceProposalDecisions(),
  );
  apply.disabled = pendingCount === 0 || submitting;
  if (submitting) {
    apply.classList.add("is-busy");
    apply.setAttribute("aria-busy", "true");
    apply.title = "Applying pending reference review decisions";
    const spinner = el("span", "button-spinner");
    spinner.setAttribute("aria-hidden", "true");
    apply.prepend(spinner);
  }
  const count = badge(pendingCount, pendingCount ? "warn" : "");
  count.classList.add("reference-review-pending-badge");
  apply.appendChild(count);
  controls.appendChild(apply);
  if (pendingCount) {
    controls.appendChild(
      makeLocalButton("Clear pending", () => {
        state.pendingReferenceProposalDecisions.clear();
        refreshReferenceReviewSurfaces();
      }),
    );
  }
  return controls;
}

const registryArtifactBadges = [
  ["digest", "D", "Digest artifact"],
  ["references", "R", "References artifact"],
  ["citation_analysis", "C", "Citation analysis artifact"],
] as const;

function hasRegistryArtifact(row: Record<string, unknown>, artifact: string) {
  const coverage = textValue(row.artifactCoverage);
  const missing = Array.isArray(row.missing_artifacts)
    ? row.missing_artifacts.map((entry) => textValue(entry))
    : [];
  if (coverage === "complete") {
    return true;
  }
  if (coverage === "missing") {
    return false;
  }
  return !missing.includes(artifact);
}

function renderRegistryArtifacts(row: Record<string, unknown>) {
  const wrap = el("div", "registry-artifact-badges");
  registryArtifactBadges.forEach(([artifact, label, title]) => {
    const available = hasRegistryArtifact(row, artifact);
    const node = badge(label, available ? "ok" : "danger");
    node.classList.add("registry-artifact-badge");
    node.title = `${title}: ${available ? "available" : "missing"}`;
    node.setAttribute("aria-label", node.title);
    wrap.appendChild(node);
  });
  return wrap;
}

function renderRegistryHeader(
  label: string,
  options: { subtitle?: string; className?: string } = {},
) {
  const th = el("th", options.className || "");
  th.appendChild(el("span", "registry-column-header-label", label));
  if (options.subtitle) {
    th.appendChild(
      el("span", "registry-column-header-subtitle", options.subtitle),
    );
  }
  return th;
}

function appendRegistryColgroup(table: HTMLTableElement, columns: string[]) {
  const colgroup = document.createElement("colgroup");
  columns.forEach((column) => {
    colgroup.appendChild(el("col", `registry-col-${column}`));
  });
  table.appendChild(colgroup);
}

function renderRegistryTitle(row: Record<string, unknown>) {
  const references = registryReferences(row);
  const referenceCount = Math.max(
    references.length,
    Math.floor(Number(row.reference_count || 0)),
  );
  if (referenceCount <= 0 || textValue(row.index_scope) === "referenced") {
    return textValue(row.title);
  }
  const key = registryRowKey(row);
  const expanded = !!key && state.registryExpandedRows.has(key);
  const loading = !!key && state.registryLoadingReferenceRows.has(key);
  const title = el("div", "registry-reference-title-cell");
  const disclosure = el(
    "button",
    "registry-reference-disclosure",
    expanded ? "-" : "+",
  );
  disclosure.type = "button";
  disclosure.setAttribute("aria-expanded", String(expanded));
  disclosure.setAttribute(
    "aria-label",
    expanded ? "Collapse references" : "Expand references",
  );
  disclosure.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!key) {
      return;
    }
    if (state.registryExpandedRows.has(key)) {
      state.registryExpandedRows.delete(key);
      state.registryLoadingReferenceRows.delete(key);
      renderSurface("index");
    } else {
      state.registryExpandedRows.add(key);
      if (!references.length) {
        state.registryLoadingReferenceRows.add(key);
        sendAction("setFilters", {
          registry: {
            expandedSourceRefs: Array.from(state.registryExpandedRows),
          },
        });
      }
      renderSurface("index");
    }
  });
  title.appendChild(disclosure);
  title.appendChild(
    el("span", "registry-reference-parent-title", textValue(row.title)),
  );
  title.appendChild(
    el(
      "span",
      "registry-reference-muted",
      loading && !references.length
        ? "Loading refs..."
        : `${referenceCount} refs`,
    ),
  );
  return title;
}

function renderRegistryReferenceSummary(row: Record<string, unknown>) {
  const count = Number(row.reference_count || 0);
  const unbound = Number(row.unbound_reference_count || 0);
  const safeTotal = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const safeUnbound = Number.isFinite(unbound)
    ? Math.max(0, Math.floor(unbound))
    : 0;
  return el("span", "registry-reference-count", `${safeTotal}/${safeUnbound}`);
}

function appendRegistryCell(
  rowNode: HTMLTableRowElement,
  cell: Node | unknown,
  className = "",
) {
  const td = el("td", className);
  if (cell instanceof Node) {
    td.appendChild(cell);
  } else {
    td.textContent = String(cell ?? "");
  }
  rowNode.appendChild(td);
}

function renderRegistryReferenceTitle(reference: Record<string, unknown>) {
  const primaryTitle = registryReferencePrimaryTitle(reference);
  const title = el("div", "registry-reference-title-cell is-child");
  title.appendChild(el("span", "registry-reference-child-marker", ""));
  title.appendChild(el("span", "registry-reference-primary", primaryTitle));
  const index = registryReferenceDisplayIndex(reference);
  if (index) {
    title.appendChild(el("span", "registry-reference-muted", index));
  }
  return title;
}

function renderRegistryReferenceStatus(reference: Record<string, unknown>) {
  const wrap = el("span", "tag-row");
  const bindingStatus = textValue(reference.binding_status, "unbound");
  wrap.appendChild(badge(bindingStatus, registryStatusTone(bindingStatus)));
  return wrap;
}

function registryReferencedEntries(snapshot: Snapshot) {
  const query = textValue(snapshot.registry.filters.search).toLowerCase();
  const bindingFilter = textValue(
    snapshot.registry.filters.bindingStatus,
    "all",
  );
  return (snapshot.registry.visibleRows || [])
    .flatMap((source) =>
      registryReferences(source).map((reference) => ({ source, reference })),
    )
    .filter(({ source, reference }) => {
      const bindingStatus = textValue(reference.binding_status, "unbound");
      if (bindingFilter !== "all" && bindingStatus !== bindingFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        source.title,
        source.paper_ref,
        reference.title,
        reference.raw_reference,
        reference.target_title,
        reference.target_paper_ref,
        reference.reference_instance_id,
      ]
        .map((value) => textValue(value).toLowerCase())
        .join(" ");
      return haystack.includes(query);
    })
    .sort(
      (left, right) =>
        registryReferencePrimaryTitle(left.reference).localeCompare(
          registryReferencePrimaryTitle(right.reference),
        ) ||
        textValue(left.source.title).localeCompare(
          textValue(right.source.title),
        ),
    );
}

function reviewFilters(snapshot: Snapshot) {
  return snapshot.reviews?.filters || {};
}

function referenceMatchProposalEntriesForReviewCenter(
  snapshot: Snapshot,
  lookup: RegistryReviewLookup,
) {
  const filters = reviewFilters(snapshot);
  const kindFilter = textValue(filters.kind, "all");
  const statusFilter = textValue(filters.status, "open");
  const confidenceFilter = textValue(filters.confidence, "all");
  const query = textValue(filters.search).toLowerCase();
  return (snapshot.registry.matchProposals || [])
    .map((proposal) => ({
      proposal,
      context: referenceMatchProposalContext(snapshot, proposal, lookup),
    }))
    .filter(({ proposal, context }) => {
      if (kindFilter !== "all" && textValue(proposal.kind) !== kindFilter) {
        return false;
      }
      if (
        statusFilter !== "all" &&
        textValue(proposal.status) !== statusFilter
      ) {
        return false;
      }
      if (
        confidenceFilter !== "all" &&
        textValue(proposal.confidence) !== confidenceFilter
      ) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        context.sourceReferenceTitle,
        context.parentItemTitle,
        context.targetPaperTitle,
        context.targetPaperRef,
        proposal.kind,
        proposal.confidence,
        proposal.reasons,
      ]
        .map((value) => textValue(value).toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
}

function openReferenceMatchProposals(snapshot: Snapshot) {
  return (snapshot.registry.matchProposals || []).filter(
    (proposal) =>
      textValue(proposal.status) === "open" &&
      !pendingReferenceProposalDecision(referenceProposalId(proposal)) &&
      !isReviewOptimisticallyResolved("reference-match", proposal.proposal_id),
  );
}

function renderReferencedSourceCell(source: Record<string, unknown>) {
  const wrap = el("div", "registry-reference-title-cell");
  wrap.appendChild(
    el("span", "registry-reference-primary", textValue(source.title)),
  );
  wrap.appendChild(
    el("span", "registry-reference-muted", registryRowDisplayId(source)),
  );
  return wrap;
}

function renderRegistryReferenceRow(reference: Record<string, unknown>) {
  const rowNode = el("tr", "registry-reference-row");
  const cells: Array<[unknown, string?]> = [
    [renderRegistryReferenceTitle(reference)],
    [reference.year || "-"],
    ["-"],
    ["-", "registry-artifacts-cell"],
    [renderRegistryReferenceStatus(reference)],
    ["", "registry-references-cell"],
    [registryReferenceDisplayId(reference)],
  ];
  cells.forEach(([cell, className]) =>
    appendRegistryCell(rowNode, cell, className),
  );
  return rowNode;
}

function renderReferencedOnlyTable(snapshot: Snapshot) {
  const entries = registryReferencedEntries(snapshot);
  if (!entries.length) {
    return renderEmptyState({
      title: snapshot.registry.rows.length
        ? "No referenced entries match the current filters"
        : "No extracted references yet",
      message: snapshot.registry.rows.length
        ? "Adjust the search or Binding filter to show more extracted references."
        : "Refresh the reference sidecar after generating literature-digest references.",
      action: makeButton(
        "Refresh",
        "hostCommand",
        {
          command: "refreshReferenceSidecarNow",
        },
        false,
        isOperationPending("refreshReferenceSidecarNow"),
      ),
      tone: snapshot.registry.rows.length ? "default" : "info",
    });
  }
  const wrap = el("div", "table-wrap registry-table-wrap");
  const table = el("table", "registry-table");
  appendRegistryColgroup(table, [
    "reference",
    "source",
    "year",
    "binding",
    "target",
    "id",
  ]);
  const thead = el("thead");
  const header = el("tr");
  [
    renderRegistryHeader("Reference"),
    renderRegistryHeader("Source"),
    renderRegistryHeader("Year"),
    renderRegistryHeader("Binding"),
    renderRegistryHeader("Target"),
    renderRegistryHeader("ID"),
  ].forEach((node) => header.appendChild(node));
  thead.appendChild(header);
  table.appendChild(thead);

  const tbody = el("tbody");
  entries.forEach(({ source, reference }) => {
    const rowNode = el("tr", "registry-reference-row");
    const cells: Array<[unknown, string?]> = [
      [renderRegistryReferenceTitle(reference), "registry-reference-main-cell"],
      [renderReferencedSourceCell(source), "registry-reference-source-cell"],
      [reference.year || "-"],
      [renderRegistryReferenceStatus(reference)],
      [
        textValue(reference.target_title) ||
          textValue(reference.target_paper_ref) ||
          "-",
        "registry-reference-target-cell",
      ],
      [registryReferenceDisplayId(reference)],
    ];
    cells.forEach(([cell, className]) =>
      appendRegistryCell(rowNode, cell, className),
    );
    tbody.appendChild(rowNode);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function renderRegistryParentRow(row: Record<string, unknown>) {
  const rowNode = el("tr", "registry-parent-row");
  const cells: Array<[unknown, string?]> = [
    [renderRegistryTitle(row)],
    [row.year || "-"],
    [badge(row.artifactCoverage, toneFor(row.artifactCoverage))],
    [renderRegistryArtifacts(row), "registry-artifacts-cell"],
    [badge(textValue(row.index_scope, "library"), "ok")],
    [renderRegistryReferenceSummary(row), "registry-references-cell"],
    [registryRowDisplayId(row)],
  ];
  cells.forEach(([cell, className]) =>
    appendRegistryCell(rowNode, cell, className),
  );
  return rowNode;
}

function renderRegistryTable(snapshot: Snapshot) {
  const rows = snapshot.registry.visibleRows;
  if (!rows.length) {
    return renderEmptyState({
      title: snapshot.registry.rows.length
        ? "No index rows match the current filters"
        : "No reference sidecar records yet",
      message: snapshot.registry.rows.length
        ? "Adjust the search or Index filters to show more records."
        : "Refresh the reference sidecar after adding papers or references.",
      action: makeButton(
        "Refresh",
        "hostCommand",
        {
          command: "refreshReferenceSidecarNow",
        },
        false,
        isOperationPending("refreshReferenceSidecarNow"),
      ),
      tone: snapshot.registry.rows.length ? "default" : "info",
    });
  }
  const wrap = el("div", "table-wrap registry-table-wrap");
  const table = el("table", "registry-table");
  appendRegistryColgroup(table, [
    "title",
    "year",
    "coverage",
    "artifacts",
    "status",
    "references",
    "id",
  ]);
  const thead = el("thead");
  const header = el("tr");
  [
    renderRegistryHeader("Title"),
    renderRegistryHeader("Year"),
    renderRegistryHeader("Coverage"),
    renderRegistryHeader("Artifacts", {
      className: "registry-artifacts-header",
    }),
    renderRegistryHeader("Status"),
    renderRegistryHeader("References", {
      subtitle: "(Total/Unbound)",
      className: "registry-references-header",
    }),
    renderRegistryHeader("ID"),
  ].forEach((node) => header.appendChild(node));
  thead.appendChild(header);
  table.appendChild(thead);

  const tbody = el("tbody");
  rows.forEach((row) => {
    tbody.appendChild(renderRegistryParentRow(row));
    const key = registryRowKey(row);
    const references = registryReferences(row);
    if (
      key &&
      state.registryExpandedRows.has(key) &&
      textValue(row.index_scope) !== "referenced"
    ) {
      references.forEach((reference) => {
        tbody.appendChild(renderRegistryReferenceRow(reference));
      });
    }
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function openIndexCleanupProposals(snapshot: Snapshot) {
  return (snapshot.registry.cleanupProposals || []).filter(
    (proposal) =>
      proposal.status === "open" &&
      !isReviewOptimisticallyResolved("cleanup", proposal.proposal_id),
  );
}

function indexReviewItems(snapshot: Snapshot) {
  return [
    ...openReferenceMatchProposals(snapshot).map((proposal) => ({
      type: "reference_match" as const,
      id: textValue(proposal.proposal_id),
      proposal,
    })),
    ...openIndexCleanupProposals(snapshot).map((proposal) => ({
      type: "cleanup" as const,
      id: textValue(proposal.proposal_id),
      proposal,
    })),
  ].filter((item) => item.id);
}

function renderReferenceMatchReviewCard(
  snapshot: Snapshot,
  proposal: Record<string, unknown>,
  lookup: RegistryReviewLookup = buildRegistryReviewLookup(snapshot),
) {
  const proposalId = textValue(proposal.proposal_id);
  const context = referenceMatchProposalContext(snapshot, proposal, lookup);
  const pending = pendingReferenceProposalDecision(proposalId);
  const submitting = isReferenceProposalDecisionSubmitting(proposalId);
  const isCanonicalMerge = textValue(proposal.kind) === "canonical_merge";
  const actions = [
    makeLocalButton("Accept", () =>
      queueReferenceProposalDecision(proposalId, "accept"),
    ),
    makeLocalButton("Reject", () =>
      queueReferenceProposalDecision(proposalId, "reject"),
    ),
  ];
  if (isCanonicalMerge) {
    actions.splice(
      1,
      0,
      makeLocalButton("Reverse & accept", () =>
        queueReferenceProposalDecision(proposalId, "reverse_accept"),
      ),
    );
  }
  actions.forEach((button) => {
    button.disabled = submitting;
  });
  if (pending) {
    actions.push(
      makeLocalButton("Cancel pending", () =>
        cancelReferenceProposalDecision(proposalId),
      ),
    );
  }
  return renderReviewCard({
    kind: "Reference match",
    title: "Review proposal",
    showKindBadge: false,
    body: pending
      ? `Pending: ${referenceProposalActionLabel(pending.action)}`
      : undefined,
    details: [
      ["parent item", context.parentItemTitle],
      ["kind", proposal.kind],
      ["reasons", proposal.reasons],
      ["diagnostics", proposal.diagnostics],
    ],
    primaryChildren: [
      renderReferenceMatchDecisionSummary({
        source: context.sourceReferenceTitle,
        target: context.targetPaperTitle,
      }),
    ],
    badges: pending
      ? [[`Pending ${referenceProposalActionLabel(pending.action)}`, "warn"]]
      : undefined,
    actions,
  });
}

function renderCleanupReviewCard(proposal: Record<string, unknown>) {
  const reviewKind = textValue(proposal.review_kind || proposal.kind);
  const isDeleteReview = reviewKind === "zotero_item_delete";
  const isDedupeReview = reviewKind === "zotero_dedupe_candidate";
  const sourceTitle =
    textValue(proposal.source_paper_title) ||
    textValue(proposal.source_paper_ref, "Parent item");
  const referenceTitle =
    textValue(proposal.reference_title) ||
    textValue(proposal.reference_raw) ||
    textValue(proposal.provisional_key) ||
    "Unresolved reference";
  const targetTitle =
    textValue(proposal.target_paper_title) ||
    textValue(proposal.target_work_title);
  return renderReviewCard({
    kind: isDeleteReview || isDedupeReview ? "Index review" : "Cleanup",
    title:
      isDeleteReview || isDedupeReview
        ? sourceTitle
        : `${sourceTitle} -> ${referenceTitle}`,
    meta: isDeleteReview
      ? "Zotero deletion review"
      : isDedupeReview
        ? "Zotero dedupe review"
        : "Open cleanup proposal",
    body:
      textValue(proposal.decision_summary) ||
      "Decide how this unresolved reference should be handled in the reference sidecar.",
    details: [
      ["parent item", sourceTitle],
      ["reference", referenceTitle],
      ["target", targetTitle],
      ["kind", proposal.kind],
      ["reason", proposal.reason],
      ["blocked by", proposal.blocked_by_review_item_id],
      ["diagnostics", proposal.diagnostics],
      ["proposal id", proposal.proposal_id],
    ],
    actions: [],
  });
}

function renderIndexReviewDrawer(snapshot: Snapshot) {
  const items = indexReviewItems(snapshot);
  const pendingCount = state.pendingReferenceProposalDecisions.size;
  if (!items.length && !pendingCount) {
    return null;
  }
  const safeIndex = Math.min(
    Math.max(0, items.length - 1),
    Math.max(
      0,
      Math.floor(Number(snapshot.registry.filters.reviewDrawerIndex) || 0),
    ),
  );
  const isOpen = snapshot.registry.filters.reviewDrawerOpen !== false;
  const drawer = el(
    "section",
    `review-panel index-review-drawer ${isOpen ? "is-open" : "is-collapsed"}`,
  );
  drawer.dataset.synthesisSurface = "index-review-drawer";
  const header = el("div", "review-drawer-header");
  header.appendChild(el("strong", "", "Index Review"));
  header.appendChild(
    el(
      "span",
      "muted",
      items.length ? `${safeIndex + 1} / ${items.length}` : "0 open",
    ),
  );
  const controls = el("div", "review-drawer-controls");
  controls.appendChild(
    makeButton(
      "↑",
      "setFilters",
      {
        registry: {
          reviewDrawerIndex: safeIndex <= 0 ? items.length - 1 : safeIndex - 1,
        },
      },
      false,
      items.length <= 1,
    ),
  );
  controls.appendChild(
    makeButton(
      "↓",
      "setFilters",
      {
        registry: {
          reviewDrawerIndex: safeIndex >= items.length - 1 ? 0 : safeIndex + 1,
        },
      },
      false,
      items.length <= 1,
    ),
  );
  controls.appendChild(renderReferenceProposalPendingControls());
  controls.appendChild(
    makeButton(isOpen ? "Collapse" : "Expand", "setFilters", {
      registry: { reviewDrawerOpen: !isOpen },
    }),
  );
  header.appendChild(controls);
  drawer.appendChild(header);
  if (!isOpen) {
    return drawer;
  }
  if (!items.length) {
    drawer.appendChild(
      renderEmptyState({
        title: "No open review proposals",
        message: `${pendingCount} pending decision(s) are ready to apply.`,
        tone: "info",
      }),
    );
    return drawer;
  }
  const item = items[safeIndex] || items[0];
  const lookup =
    item.type === "reference_match"
      ? buildRegistryReviewLookup(snapshot)
      : undefined;
  drawer.appendChild(
    item.type === "reference_match"
      ? renderReferenceMatchReviewCard(snapshot, item.proposal, lookup!)
      : renderCleanupReviewCard(item.proposal),
  );
  return drawer;
}

function renderIndex(main: HTMLElement, snapshot: Snapshot) {
  const panel = el("div", "panel");
  const filters = el("div", "filters");
  const search = el("input");
  search.placeholder = "Search";
  search.value = textValue(snapshot.registry.filters.search);
  search.addEventListener("input", () =>
    sendAction("setFilters", { registry: { search: search.value } }),
  );
  filters.appendChild(search);
  filters.appendChild(
    selectControlWithLabels(
      [
        ["library", "Scope: Library items"],
        ["referenced", "Scope: Referenced only"],
        ["all", "Scope: All"],
      ],
      textValue(snapshot.registry.filters.scope, "library"),
      (scope) => sendAction("setFilters", { registry: { scope } }),
    ),
  );
  if (textValue(snapshot.registry.filters.scope) !== "referenced") {
    filters.appendChild(
      selectControlWithLabels(
        [
          ["all", "Coverage: All"],
          ["complete", "Coverage: Complete"],
          ["partial", "Coverage: Partial"],
          ["missing", "Coverage: Missing"],
        ],
        textValue(snapshot.registry.filters.artifactCoverage, "all"),
        (artifactCoverage) =>
          sendAction("setFilters", { registry: { artifactCoverage } }),
      ),
    );
  }
  if (textValue(snapshot.registry.filters.scope) === "referenced") {
    filters.appendChild(
      selectControlWithLabels(
        [
          ["all", "Binding: All"],
          ["unbound", "Binding: Unbound"],
          ["candidate", "Binding: Candidate"],
          ["accepted", "Binding: Accepted"],
          ["rejected", "Binding: Rejected"],
          ["stale_target", "Binding: Stale target"],
        ],
        textValue(snapshot.registry.filters.bindingStatus, "all"),
        (bindingStatus) =>
          sendAction("setFilters", { registry: { bindingStatus } }),
      ),
    );
  }
  filters.appendChild(
    badge(
      `Reference sidecar: ${textValue(snapshot.registry.cacheStatus?.status, "missing")}`,
      toneFor(snapshot.registry.cacheStatus?.status),
    ),
  );
  filters.appendChild(
    makeButton(
      "Refresh",
      "hostCommand",
      {
        command: "refreshReferenceSidecarNow",
      },
      false,
      isOperationPending("refreshReferenceSidecarNow"),
    ),
  );
  filters.appendChild(
    makeButton(
      "Advanced Matching",
      "hostCommand",
      {
        command: "runAdvancedReferenceMatchingNow",
      },
      false,
      isOperationPending("runAdvancedReferenceMatchingNow"),
    ),
  );
  if (snapshot.registry.cacheStatus?.status === "failed") {
    filters.appendChild(
      makeButton("Retry", "hostCommand", {
        command: "retryReferenceSidecarRefresh",
      }),
    );
  }
  panel.appendChild(renderPanelToolbar(filters));
  const registryTable =
    snapshot.registry.filters.scope === "referenced"
      ? renderReferencedOnlyTable(snapshot)
      : renderRegistryTable(snapshot);
  registryTable.dataset.synthesisScrollKey = "registry.table";
  panel.appendChild(registryTable);
  const indexReviewDrawer = renderIndexReviewDrawer(snapshot);
  if (indexReviewDrawer) {
    panel.appendChild(indexReviewDrawer);
  }
  main.appendChild(panel);
}

function reviewStatusMatches(status: unknown, filter: unknown) {
  const normalizedFilter = textValue(filter, "open");
  if (normalizedFilter === "all") {
    return true;
  }
  return textValue(status, "open") === normalizedFilter;
}

function reviewSearchMatches(values: unknown[], query: unknown) {
  const normalized = textValue(query).toLowerCase();
  if (!normalized) {
    return true;
  }
  return values
    .map((value) => textValue(value).toLowerCase())
    .join(" ")
    .includes(normalized);
}

function renderReviewCenterToolbar(snapshot: Snapshot) {
  const filters = reviewFilters(snapshot);
  const activeTab = textValue(filters.activeTab, "reference_matching");
  const toolbar = el("div", "filters review-center-toolbar");
  const tabs = el("div", "segmented");
  [
    ["reference_matching", "Reference Matching"],
    ["index_cleanup", "Index Cleanup"],
    ["concepts", "Concepts"],
    ["topic_graph", "Topic Graph"],
  ].forEach(([tab, label]) => {
    tabs.appendChild(
      makeButton(
        label,
        "setFilters",
        { reviews: { activeTab: tab } },
        activeTab === tab,
      ),
    );
  });
  toolbar.appendChild(tabs);
  const search = el("input");
  search.placeholder = "Search reviews";
  search.value = textValue(filters.search);
  search.addEventListener("input", () =>
    sendAction("setFilters", { reviews: { search: search.value } }),
  );
  toolbar.appendChild(search);
  toolbar.appendChild(
    selectControlWithLabels(
      [
        ["open", "Status: Open"],
        ["all", "Status: All"],
        ["accepted", "Status: Accepted"],
        ["rejected", "Status: Rejected"],
        ["superseded", "Status: Superseded"],
      ],
      textValue(filters.status, "open"),
      (status) => sendAction("setFilters", { reviews: { status } }),
    ),
  );
  if (activeTab === "reference_matching") {
    toolbar.appendChild(
      selectControlWithLabels(
        [
          ["all", "Kind: All"],
          ["zotero_binding", "Kind: Zotero binding"],
          ["canonical_merge", "Kind: Canonical merge"],
        ],
        textValue(filters.kind, "all"),
        (kind) => sendAction("setFilters", { reviews: { kind } }),
      ),
    );
    toolbar.appendChild(
      selectControlWithLabels(
        [
          ["all", "Confidence: All"],
          ["deterministic", "Confidence: Deterministic"],
          ["high", "Confidence: High"],
          ["medium", "Confidence: Medium"],
          ["low", "Confidence: Low"],
          ["review", "Confidence: Review"],
        ],
        textValue(filters.confidence, "all"),
        (confidence) => sendAction("setFilters", { reviews: { confidence } }),
      ),
    );
  }
  return toolbar;
}

function appendReviewTableCell(row: HTMLTableRowElement, value: unknown) {
  const cell = el("td");
  if (value instanceof Node) {
    cell.appendChild(value);
  } else {
    cell.textContent = textValue(value, "-");
  }
  row.appendChild(cell);
}

function appendReferenceProposalActionButton(
  actions: HTMLElement,
  label: string,
  proposalId: string,
  action: ReferenceProposalAction,
) {
  const pending = pendingReferenceProposalDecision(proposalId);
  const button = makeLocalButton(
    label,
    () => queueReferenceProposalDecision(proposalId, action),
    pending?.action === action,
  );
  button.disabled = isReferenceProposalDecisionSubmitting(proposalId);
  actions.appendChild(button);
}

function appendReferenceProposalCancelButton(
  actions: HTMLElement,
  proposalId: string,
) {
  if (!pendingReferenceProposalDecision(proposalId)) {
    return;
  }
  actions.appendChild(
    makeLocalButton("Cancel pending", () =>
      cancelReferenceProposalDecision(proposalId),
    ),
  );
}

function selectedReferenceProposalRows(rows: Array<Record<string, unknown>>) {
  return rows.filter((proposal) =>
    state.selectedReferenceProposalIds.has(referenceProposalId(proposal)),
  );
}

function actionableReferenceProposalRows(rows: Array<Record<string, unknown>>) {
  return rows.filter((proposal) => textValue(proposal.status) !== "superseded");
}

function renderReferenceProposalBulkActions(
  rows: Array<Record<string, unknown>>,
) {
  const filters = reviewFilters(state.snapshot as Snapshot);
  const status = textValue(filters.status, "open");
  const selectedRows = selectedReferenceProposalRows(rows);
  const visibleRows = actionableReferenceProposalRows(rows);
  const controls = el("div", "reference-review-bulk-actions");
  controls.appendChild(renderReferenceProposalPendingControls());
  if (status !== "all" && status !== "superseded") {
    if (status !== "accepted") {
      const acceptAll = makeLocalButton("Accept all", () =>
        queueReferenceProposalDecisions(visibleRows, "accept"),
      );
      acceptAll.disabled =
        !visibleRows.length || isReferenceProposalDecisionSubmitting();
      controls.appendChild(acceptAll);
    }
    if (status !== "rejected") {
      const rejectAll = makeLocalButton("Reject all", () =>
        queueReferenceProposalDecisions(visibleRows, "reject"),
      );
      rejectAll.disabled =
        !visibleRows.length || isReferenceProposalDecisionSubmitting();
      controls.appendChild(rejectAll);
    }
    if (status !== "accepted") {
      const acceptSelected = makeLocalButton("Accept selected", () =>
        queueReferenceProposalDecisions(selectedRows, "accept"),
      );
      acceptSelected.disabled =
        !selectedRows.length || isReferenceProposalDecisionSubmitting();
      controls.appendChild(acceptSelected);
    }
    if (status !== "rejected") {
      const rejectSelected = makeLocalButton("Reject selected", () =>
        queueReferenceProposalDecisions(selectedRows, "reject"),
      );
      rejectSelected.disabled =
        !selectedRows.length || isReferenceProposalDecisionSubmitting();
      controls.appendChild(rejectSelected);
    }
  }
  if (selectedRows.length) {
    controls.appendChild(
      makeLocalButton("Clear selection", () =>
        clearReferenceProposalSelections(),
      ),
    );
  }
  controls.appendChild(
    el(
      "span",
      "muted",
      `${selectedRows.length} selected / ${state.pendingReferenceProposalDecisions.size} pending`,
    ),
  );
  return controls;
}

function renderReferenceMatchingReviewTable(snapshot: Snapshot) {
  const lookup = buildRegistryReviewLookup(snapshot);
  const entries = referenceMatchProposalEntriesForReviewCenter(
    snapshot,
    lookup,
  );
  const rows = entries.map((entry) => entry.proposal);
  if (!rows.length) {
    const empty = renderEmptyState({
      title: "No reference matching reviews",
      message: "Adjust the Review filters or run Advanced Matching.",
      tone: "info",
    });
    empty.dataset.synthesisSurface = "reference-review-table";
    return empty;
  }
  const wrap = el("div", "table-wrap review-center-table-wrap");
  wrap.dataset.synthesisSurface = "reference-review-table";
  wrap.appendChild(renderReferenceProposalBulkActions(rows));
  const table = el("table", "registry-table review-center-table");
  const thead = el("thead");
  const header = el("tr");
  const allRowsSelected = rows.every((proposal) =>
    state.selectedReferenceProposalIds.has(referenceProposalId(proposal)),
  );
  const selectionHeader = el("th", "review-selection-cell");
  const selectAll = el("input");
  selectAll.type = "checkbox";
  selectAll.checked = rows.length > 0 && allRowsSelected;
  selectAll.addEventListener("change", () =>
    toggleReferenceProposalRowsSelection(rows, selectAll.checked),
  );
  selectionHeader.appendChild(selectAll);
  header.appendChild(selectionHeader);
  [
    "Source",
    "Target",
    "Parent item",
    "Kind",
    "Reasons",
    "Status",
    "Updated",
    "Actions",
  ].forEach((label) => header.appendChild(renderRegistryHeader(label)));
  thead.appendChild(header);
  table.appendChild(thead);
  const tbody = el("tbody");
  entries.forEach(({ proposal, context }) => {
    const row = el("tr");
    const proposalId = textValue(proposal.proposal_id);
    const selectionCell = el("td", "review-selection-cell");
    const checkbox = el("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.selectedReferenceProposalIds.has(proposalId);
    checkbox.addEventListener("change", () =>
      toggleReferenceProposalSelection(proposalId, checkbox.checked),
    );
    selectionCell.appendChild(checkbox);
    row.appendChild(selectionCell);
    appendReviewTableCell(row, context.sourceReferenceTitle);
    appendReviewTableCell(row, context.targetPaperTitle);
    appendReviewTableCell(row, context.parentItemTitle);
    appendReviewTableCell(row, proposal.kind);
    appendReviewTableCell(row, proposal.reasons);
    const statusCell = el("div", "review-status-stack");
    statusCell.appendChild(
      badge(proposal.status, registryStatusTone(proposal.status)),
    );
    const pending = pendingReferenceProposalDecision(proposalId);
    if (pending) {
      statusCell.appendChild(
        badge(
          `Pending ${referenceProposalActionLabel(pending.action)}`,
          "warn",
        ),
      );
    }
    appendReviewTableCell(row, statusCell);
    appendReviewTableCell(row, proposal.updated_at);
    const actions = el("div", "review-table-actions");
    const status = textValue(proposal.status, "open");
    const isOptimisticallyResolved = isReviewOptimisticallyResolved(
      "reference-match",
      proposalId,
    );
    if (status === "open" && !isOptimisticallyResolved) {
      appendReferenceProposalActionButton(
        actions,
        "Accept",
        proposalId,
        "accept",
      );
      if (textValue(proposal.kind) === "canonical_merge") {
        appendReferenceProposalActionButton(
          actions,
          "Reverse & accept",
          proposalId,
          "reverse_accept",
        );
      }
      appendReferenceProposalActionButton(
        actions,
        "Reject",
        proposalId,
        "reject",
      );
    } else if (status === "accepted") {
      appendReferenceProposalActionButton(
        actions,
        "Reopen",
        proposalId,
        "reopen",
      );
      if (textValue(proposal.kind) === "canonical_merge") {
        appendReferenceProposalActionButton(
          actions,
          "Reverse & accept",
          proposalId,
          "reverse_accept",
        );
      }
      appendReferenceProposalActionButton(
        actions,
        "Reject",
        proposalId,
        "reject",
      );
      appendReferenceProposalActionButton(
        actions,
        "Delete",
        proposalId,
        "delete",
      );
    } else if (status === "rejected") {
      appendReferenceProposalActionButton(
        actions,
        "Reopen",
        proposalId,
        "reopen",
      );
      appendReferenceProposalActionButton(
        actions,
        "Accept",
        proposalId,
        "accept",
      );
      if (textValue(proposal.kind) === "canonical_merge") {
        appendReferenceProposalActionButton(
          actions,
          "Reverse & accept",
          proposalId,
          "reverse_accept",
        );
      }
      appendReferenceProposalActionButton(
        actions,
        "Delete",
        proposalId,
        "delete",
      );
    } else {
      actions.appendChild(el("span", "muted", "-"));
    }
    appendReferenceProposalCancelButton(actions, proposalId);
    appendReviewTableCell(row, actions);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function replaceSynthesisSurface(name: string, next: HTMLElement | null) {
  const current = document.querySelector(`[data-synthesis-surface="${name}"]`);
  if (current && next) {
    current.replaceWith(next);
    return true;
  }
  if (current && !next) {
    current.remove();
    return true;
  }
  return false;
}

function refreshReferenceReviewSurfaces() {
  const snapshot = state.snapshot;
  if (!snapshot) {
    render();
    return;
  }
  let handled = false;
  if (snapshot.selectedTab === "registry") {
    const drawer = renderIndexReviewDrawer(snapshot);
    handled = replaceSynthesisSurface("index-review-drawer", drawer);
  }
  if (snapshot.selectedTab === "reviews") {
    handled = replaceSynthesisSurface(
      "reference-review-table",
      renderReferenceMatchingReviewTable(snapshot),
    );
  }
  if (!handled) {
    render();
  }
}

function renderGenericReviewTable(
  rows: Array<Record<string, unknown>>,
  columns: Array<[string, (row: Record<string, unknown>) => unknown]>,
  emptyTitle: string,
) {
  if (!rows.length) {
    return renderEmptyState({
      title: emptyTitle,
      message: "Adjust the Review filters to show more records.",
      tone: "info",
    });
  }
  const wrap = el("div", "table-wrap review-center-table-wrap");
  const table = el("table", "registry-table review-center-table");
  const thead = el("thead");
  const header = el("tr");
  columns.forEach(([label]) => header.appendChild(renderRegistryHeader(label)));
  thead.appendChild(header);
  table.appendChild(thead);
  const tbody = el("tbody");
  rows.forEach((entry) => {
    const row = el("tr");
    columns.forEach(([, getter]) => appendReviewTableCell(row, getter(entry)));
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function renderReviewCenter(main: HTMLElement, snapshot: Snapshot) {
  const panel = el("div", "panel review-center");
  panel.appendChild(renderReviewCenterToolbar(snapshot));
  const filters = reviewFilters(snapshot);
  const activeTab = textValue(filters.activeTab, "reference_matching");
  const status = textValue(filters.status, "open");
  const query = textValue(filters.search);
  if (activeTab === "reference_matching") {
    panel.appendChild(renderReferenceMatchingReviewTable(snapshot));
  } else if (activeTab === "index_cleanup") {
    const rows = (snapshot.registry.cleanupProposals || []).filter(
      (row) =>
        reviewStatusMatches(row.status, status) &&
        reviewSearchMatches(
          [
            row.source_paper_title,
            row.source_paper_ref,
            row.reference_title,
            row.reference_raw,
            row.target_paper_title,
            row.reason,
            row.kind,
          ],
          query,
        ),
    );
    panel.appendChild(
      renderGenericReviewTable(
        rows,
        [
          [
            "Parent item",
            (row) => row.source_paper_title || row.source_paper_ref,
          ],
          ["Reference", (row) => row.reference_title || row.reference_raw],
          ["Target", (row) => row.target_paper_title || row.target_work_title],
          ["Kind", (row) => row.review_kind || row.kind],
          [
            "Status",
            (row) => badge(row.status, registryStatusTone(row.status)),
          ],
          ["Updated", (row) => row.updated_at],
        ],
        "No index cleanup reviews",
      ),
    );
  } else if (activeTab === "concepts") {
    const rows = (snapshot.concepts.reviewItems || []).filter(
      (row) =>
        reviewStatusMatches(row.status, status) &&
        reviewSearchMatches(
          [row.label, row.reason, row.topic_id, row.review_id],
          query,
        ),
    );
    panel.appendChild(
      renderGenericReviewTable(
        rows,
        [
          ["Label", (row) => row.label],
          ["Reason", (row) => row.reason],
          ["Confidence", (row) => row.confidence],
          [
            "Status",
            (row) => badge(row.status, registryStatusTone(row.status)),
          ],
          ["Topic", (row) => row.topic_id],
          ["ID", (row) => row.review_id],
        ],
        "No concept reviews",
      ),
    );
  } else {
    const topicGraphReviewRows = [
      ...(snapshot.topicGraph.reviewItems || []),
      ...(snapshot.topicGraph.inspector?.relationReviewItems || []),
    ];
    const rows = topicGraphReviewRows.filter(
      (row) =>
        reviewStatusMatches(row.status, status) &&
        reviewSearchMatches(
          [row.source_title, row.target_title, row.reason, row.review_id],
          query,
        ),
    );
    panel.appendChild(
      renderGenericReviewTable(
        rows,
        [
          ["Source", (row) => row.source_title || row.source_topic_id],
          ["Target", (row) => row.target_title || row.target_topic_id],
          ["Reason", (row) => row.reason],
          [
            "Status",
            (row) => badge(row.status, registryStatusTone(row.status)),
          ],
          ["ID", (row) => row.review_id],
        ],
        "No topic graph reviews",
      ),
    );
  }
  main.appendChild(panel);
}

function tagWarningsFor(row: Record<string, unknown>) {
  return Array.isArray(row.validation_warnings)
    ? (row.validation_warnings as Array<Record<string, unknown>>)
    : [];
}

function renderTags(main: HTMLElement, snapshot: Snapshot) {
  const shell = renderTagsWorkbenchShell(snapshot);
  const view =
    textValue(snapshot.tags.filters.view, "vocabulary") === "staged"
      ? "staged"
      : "vocabulary";
  shell.appendChild(renderTagsSummaryBar(snapshot));
  shell.appendChild(renderTagsSubviewTabs(snapshot, view));
  shell.appendChild(
    view === "staged"
      ? renderStagedInboxSubview(snapshot)
      : renderVocabularySubview(snapshot),
  );
  main.appendChild(shell);
}

function renderTagsWorkbenchShell(snapshot: Snapshot) {
  const density =
    textValue(snapshot.tags.filters.density, "compact") === "comfortable"
      ? "comfortable"
      : "compact";
  const shell = el("section", `tags-workbench density-${density}`);
  shell.setAttribute("aria-label", "Synthesis tag management");
  return shell;
}

function renderTagsSummaryMetric(label: string, value: unknown, tone = "") {
  const metricNode = el("div", "tags-summary-metric");
  metricNode.appendChild(el("span", "muted", label));
  metricNode.appendChild(badge(value, tone));
  return metricNode;
}

function renderTagsSummaryBar(snapshot: Snapshot) {
  const bar = el("div", "tags-summary-bar");
  const metrics = el("div", "tags-summary-metrics");
  metrics.appendChild(
    renderTagsSummaryMetric("Canonical", snapshot.tags.rows.length, "ok"),
  );
  metrics.appendChild(
    renderTagsSummaryMetric("Staged", snapshot.tags.stagedCount || 0, "warn"),
  );
  metrics.appendChild(
    renderTagsSummaryMetric(
      "Warnings",
      snapshot.tags.validationWarnings.length,
      snapshot.tags.validationWarnings.length ? "warn" : "ok",
    ),
  );
  metrics.appendChild(
    renderTagsSummaryMetric(
      "Cache",
      snapshot.tags.projection.stale ? "stale" : "ready",
      snapshot.tags.projection.stale ? "warn" : "ok",
    ),
  );
  const actions = el("div", "tags-summary-actions");
  actions.appendChild(
    makeButton("Validate", "hostCommand", {
      command: "validateTagVocabulary",
    }),
  );
  actions.appendChild(
    makeButton("Export", "hostCommand", {
      command: "exportTagVocabulary",
    }),
  );
  actions.appendChild(
    makeLocalButton("Import", () => {
      state.tagImportOpen = true;
      state.dismissedTagImportPreviewSignature = undefined;
      render();
    }),
  );
  bar.appendChild(metrics);
  bar.appendChild(actions);
  return bar;
}

function renderTagsSubviewTabs(snapshot: Snapshot, view: string) {
  const tabs = el("div", "tags-subview-tabs");
  tabs.setAttribute("role", "tablist");
  const vocabulary = makeLocalButton(
    `Vocabulary (${snapshot.tags.rows.length})`,
    () => sendAction("setFilters", { tags: { view: "vocabulary" } }),
    view === "vocabulary",
  );
  vocabulary.setAttribute("role", "tab");
  vocabulary.setAttribute("aria-selected", String(view === "vocabulary"));
  const staged = makeLocalButton(
    `Staged (${snapshot.tags.stagedCount || 0})`,
    () => sendAction("setFilters", { tags: { view: "staged" } }),
    view === "staged",
  );
  staged.setAttribute("role", "tab");
  staged.setAttribute("aria-selected", String(view === "staged"));
  tabs.appendChild(vocabulary);
  tabs.appendChild(staged);
  return tabs;
}

function renderTagsTable(args: {
  className: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  mapRow: (row: Record<string, unknown>) => Array<Node | unknown>;
  expandedRow?: (row: Record<string, unknown>) => HTMLElement | null;
  emptyState: HTMLElement;
}) {
  if (!args.rows.length) {
    return args.emptyState;
  }
  const wrap = el("div", `tags-table-wrap ${args.className}`);
  const table = el("table", "tags-table");
  const thead = el("thead");
  const tr = el("tr");
  args.headers.forEach((header) => tr.appendChild(el("th", "", header)));
  thead.appendChild(tr);
  table.appendChild(thead);
  const tbody = el("tbody");
  args.rows.forEach((row) => {
    const rowNode = el("tr");
    args.mapRow(row).forEach((cell) => {
      const td = el("td");
      if (cell instanceof Node) {
        td.appendChild(cell);
      } else {
        td.textContent = String(cell ?? "");
      }
      rowNode.appendChild(td);
    });
    tbody.appendChild(rowNode);
    const expanded = args.expandedRow?.(row);
    if (expanded) {
      const detailRow = el("tr", "tags-expanded-row");
      const detailCell = el("td");
      detailCell.colSpan = args.headers.length;
      detailCell.appendChild(expanded);
      detailRow.appendChild(detailCell);
      tbody.appendChild(detailRow);
    }
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function expandedRowKey(kind: string, tag: unknown) {
  return `${kind}:${textValue(tag)}`;
}

function isTagRowExpanded(snapshot: Snapshot, key: string) {
  const expandedRows = recordValue(snapshot.tags.filters.expandedRows);
  return expandedRows[key] === true;
}

function toggleTagExpandedRow(snapshot: Snapshot, key: string) {
  const expandedRows = {
    ...recordValue(snapshot.tags.filters.expandedRows),
  } as Record<string, boolean>;
  if (expandedRows[key]) {
    delete expandedRows[key];
  } else {
    expandedRows[key] = true;
  }
  sendAction("setFilters", { tags: { expandedRows } });
}

function toggleTagSelection(
  snapshot: Snapshot,
  key: "selectedStagedTags" | "selectedVocabularyTags",
  tag: string,
  checked: boolean,
) {
  const selected = new Set(
    Array.isArray(snapshot.tags.filters[key])
      ? (snapshot.tags.filters[key] as string[])
      : [],
  );
  if (checked) {
    selected.add(tag);
  } else {
    selected.delete(tag);
  }
  sendAction("setFilters", { tags: { [key]: Array.from(selected).sort() } });
}

function setAllTagSelection(
  key: "selectedStagedTags" | "selectedVocabularyTags",
  tags: string[],
  checked: boolean,
) {
  sendAction("setFilters", {
    tags: { [key]: checked ? [...tags].sort() : [] },
  });
}

function selectedTagList(
  snapshot: Snapshot,
  key: "selectedStagedTags" | "selectedVocabularyTags",
) {
  return Array.isArray(snapshot.tags.filters[key])
    ? ((snapshot.tags.filters[key] as string[]).filter(Boolean) as string[])
    : [];
}

function stagedEditingState(snapshot: Snapshot): TagsEditingState | undefined {
  const value = snapshot.tags.filters.editingStagedTag;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as TagsEditingState)
    : undefined;
}

function renderCompactText(value: unknown, className = "tags-cell-text") {
  const text = textValue(value, "-");
  const node = el("span", className, text || "-");
  node.title = text;
  return node;
}

function renderListCell(values: unknown, empty = "-") {
  const items = Array.isArray(values)
    ? values.map((entry) => textValue(entry)).filter(Boolean)
    : [];
  return renderCompactText(items.length ? items.join(", ") : empty);
}

function renderRowExpandButton(snapshot: Snapshot, key: string) {
  const expanded = isTagRowExpanded(snapshot, key);
  const button = makeLocalButton(expanded ? "Hide" : "Details", () =>
    toggleTagExpandedRow(snapshot, key),
  );
  button.classList.add("tags-expand-button");
  button.setAttribute("aria-expanded", String(expanded));
  return button;
}

function renderVocabularySubview(snapshot: Snapshot) {
  const panel = el("div", "tags-subview");
  const vocabularyFilters = el("div", "filters");
  const search = el("input");
  search.dataset.synthesisControlKey = "tags.search";
  search.placeholder = "Search tags";
  search.value = textValue(snapshot.tags.filters.search);
  search.addEventListener("input", () =>
    sendAction("setFilters", { tags: { search: search.value } }),
  );
  vocabularyFilters.appendChild(search);
  vocabularyFilters.appendChild(
    selectControl(
      ["all", ...snapshot.tags.facets],
      textValue(snapshot.tags.filters.facet, "all"),
      (value) => sendAction("setFilters", { tags: { facet: value } }),
    ),
  );
  vocabularyFilters.appendChild(
    selectControl(
      ["all", "active", "deprecated", "warning"],
      textValue(snapshot.tags.filters.status, "all"),
      (value) => sendAction("setFilters", { tags: { status: value } }),
    ),
  );
  vocabularyFilters.appendChild(
    selectControl(
      ["compact", "comfortable"],
      textValue(snapshot.tags.filters.density, "compact"),
      (value) => sendAction("setFilters", { tags: { density: value } }),
    ),
  );
  panel.appendChild(renderPanelToolbar(vocabularyFilters));
  const visibleVocabularyTags = snapshot.tags.visibleRows.map((row) =>
    textValue(row.tag),
  );
  const selectedVocabularyTags = selectedTagList(
    snapshot,
    "selectedVocabularyTags",
  ).filter((tag) => visibleVocabularyTags.includes(tag));
  if (snapshot.tags.visibleRows.length) {
    const vocabularyBulk = el("div", "tags-bulk-bar tags-bulk-bar-passive");
    const allSelected =
      selectedVocabularyTags.length === visibleVocabularyTags.length;
    const checkbox = el("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = allSelected;
    checkbox.setAttribute("aria-label", "Select all visible vocabulary tags");
    checkbox.addEventListener("change", () =>
      setAllTagSelection(
        "selectedVocabularyTags",
        visibleVocabularyTags,
        checkbox.checked,
      ),
    );
    vocabularyBulk.appendChild(checkbox);
    vocabularyBulk.appendChild(
      el(
        "span",
        "muted",
        selectedVocabularyTags.length
          ? `${selectedVocabularyTags.length} vocabulary tag(s) selected`
          : "Vocabulary selection is visual only",
      ),
    );
    panel.appendChild(vocabularyBulk);
  }
  const status = el("div", "details");
  status.appendChild(
    badge(
      snapshot.tags.projection.stale ? "Tag cache stale" : "Tag cache ready",
      snapshot.tags.projection.stale ? "warn" : "ok",
    ),
  );
  status.appendChild(
    el(
      "span",
      "muted",
      `${snapshot.tags.rows.length} tags, ${snapshot.tags.validationWarnings.length} warning(s)`,
    ),
  );
  panel.appendChild(status);
  panel.appendChild(
    renderTagsTable({
      className: "tags-vocabulary-table",
      headers: [
        "",
        "Tag",
        "Facet",
        "Status",
        "Usage",
        "Source",
        "Note",
        "Aliases",
        "Abbrev",
        "Warnings",
        "",
      ],
      rows: snapshot.tags.visibleRows,
      mapRow: (row) => {
        const tag = textValue(row.tag);
        const selected = selectedVocabularyTags.includes(tag);
        const checkbox = el("input") as HTMLInputElement;
        checkbox.type = "checkbox";
        checkbox.checked = selected;
        checkbox.setAttribute("aria-label", `Select ${tag}`);
        checkbox.addEventListener("change", () =>
          toggleTagSelection(
            snapshot,
            "selectedVocabularyTags",
            tag,
            checkbox.checked,
          ),
        );
        const statusBadge = tagWarningsFor(row).length
          ? badge("warning", "warn")
          : badge(
              row.deprecated ? "deprecated" : "active",
              row.deprecated ? "danger" : "ok",
            );
        const warnings = tagWarningsFor(row);
        const key = expandedRowKey("vocabulary", tag);
        return [
          checkbox,
          renderCompactText(tag),
          row.facet || "-",
          statusBadge,
          row.usage_count || 0,
          renderCompactText(row.source || "-"),
          renderCompactText(row.note || "-"),
          renderListCell(row.aliases),
          renderListCell(row.abbrev),
          warnings.length ? badge(warnings.length, "warn") : "-",
          renderRowExpandButton(snapshot, key),
        ];
      },
      expandedRow: (row) => {
        const key = expandedRowKey("vocabulary", row.tag);
        if (!isTagRowExpanded(snapshot, key)) {
          return null;
        }
        const warnings = tagWarningsFor(row);
        const details = el("div", "tags-expanded-content");
        details.appendChild(
          renderDetailList([
            ["note", row.note || "-"],
            [
              "aliases",
              Array.isArray(row.aliases) && row.aliases.length
                ? row.aliases.join(", ")
                : "-",
            ],
            [
              "abbrev",
              Array.isArray(row.abbrev) && row.abbrev.length
                ? row.abbrev.join(", ")
                : "-",
            ],
            ["replacement", row.replacement || "-"],
            ["last synced", row.last_synced_at || "-"],
          ]),
        );
        if (warnings.length) {
          const warningList = el("div", "tags-warning-list");
          warnings.forEach((warning) =>
            warningList.appendChild(
              badge(
                `${warning.code}: ${warning.message || ""}`,
                warning.severity === "error" ? "danger" : "warn",
              ),
            ),
          );
          details.appendChild(warningList);
        }
        return details;
      },
      emptyState: renderEmptyState({
        title: snapshot.tags.rows.length
          ? "No tags match the current filters"
          : "No tag vocabulary indexed yet",
        message: snapshot.tags.rows.length
          ? "Adjust the search, facet, or status filters to show more tags."
          : "Import tags to make them available here.",
        tone: snapshot.tags.rows.length ? "default" : "info",
      }),
    }),
  );
  const tagImportPanel = renderTagImportPanel(snapshot);
  if (tagImportPanel) {
    panel.appendChild(tagImportPanel);
  }
  return panel;
}

function stagedTagSuffix(row: Record<string, unknown>) {
  const tag = textValue(row.tag);
  const facet = textValue(row.facet);
  const prefix = `${facet}:`;
  return facet && tag.startsWith(prefix) ? tag.slice(prefix.length) : tag;
}

function currentStagedDraft(snapshot: Snapshot, row: Record<string, unknown>) {
  const tag = textValue(row.tag);
  const edit = stagedEditingState(snapshot);
  if (edit?.originalTag === tag) {
    return {
      tag: textValue(edit.draftTag, stagedTagSuffix(row)),
      note: textValue(edit.draftNote, textValue(row.note)),
      status: textValue(edit.status, "idle"),
      error: textValue(edit.error),
    };
  }
  return {
    tag: stagedTagSuffix(row),
    note: textValue(row.note),
    status: "idle",
    error: "",
  };
}

function persistStagedDraft(args: {
  snapshot: Snapshot;
  row: Record<string, unknown>;
  tagValue: string;
  noteValue: string;
}) {
  const tag = textValue(args.row.tag);
  const facet = textValue(args.row.facet, "topic");
  const suffix = textValue(args.tagValue);
  const nextTag = suffix.includes(":") ? suffix : `${facet}:${suffix}`;
  sendAction("setFilters", {
    tags: {
      editingStagedTag: {
        originalTag: tag,
        draftTag: suffix,
        draftNote: args.noteValue,
        status: "pending",
      },
    },
  });
  sendAction("hostCommand", {
    command: "updateStagedTagSuggestion",
    args: {
      originalTag: tag,
      tag: nextTag,
      facet: nextTag.split(":")[0] || facet,
      note: args.noteValue,
      source_flow: textValue(args.row.source_flow),
      parent_bindings: Array.isArray(args.row.parent_bindings)
        ? args.row.parent_bindings
        : [],
    },
  });
}

function renderStagedEditState(
  snapshot: Snapshot,
  row: Record<string, unknown>,
) {
  const tag = textValue(row.tag);
  const edit = stagedEditingState(snapshot);
  const pending = isOperationPending("updateStagedTagSuggestion", {
    originalTag: tag,
  });
  const failed =
    snapshot.actions?.lastFailed?.key ===
    operationKey("updateStagedTagSuggestion", { originalTag: tag });
  const completed =
    snapshot.actions?.lastCompleted?.key ===
    operationKey("updateStagedTagSuggestion", { originalTag: tag });
  const stateText = failed
    ? "failed"
    : pending || edit?.status === "pending"
      ? "saving"
      : completed || edit?.status === "saved"
        ? "saved"
        : "";
  if (!stateText) {
    return el("span", "staged-edit-state", "");
  }
  const node = el(
    "span",
    `staged-edit-state ${failed ? "failed" : pending ? "pending" : "saved"}`,
    stateText,
  );
  if (failed && snapshot.actions?.lastFailed?.message) {
    node.title = snapshot.actions.lastFailed.message;
  }
  return node;
}

function renderTagBulkActionBar(args: {
  snapshot: Snapshot;
  selectedTags: string[];
  visibleTags: string[];
}) {
  const bar = el("div", "tags-bulk-bar");
  const selectedCount = args.selectedTags.length;
  if (args.visibleTags.length) {
    const allSelected = selectedCount === args.visibleTags.length;
    const checkbox = el("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = allSelected;
    checkbox.setAttribute(
      "aria-label",
      "Select all visible staged suggestions",
    );
    checkbox.addEventListener("change", () =>
      setAllTagSelection(
        "selectedStagedTags",
        args.visibleTags,
        checkbox.checked,
      ),
    );
    bar.appendChild(checkbox);
  }
  bar.appendChild(
    el(
      "span",
      "muted",
      selectedCount
        ? `${selectedCount} staged suggestion(s) selected`
        : "Select staged suggestions for bulk actions",
    ),
  );
  const promote = makeButton(
    "Promote selected",
    "hostCommand",
    {
      command: "promoteStagedTagSuggestions",
      args: { tags: args.selectedTags },
    },
    false,
    selectedCount === 0,
  );
  const discard = makeButton(
    "Discard selected",
    "hostCommand",
    {
      command: "discardStagedTagSuggestions",
      args: { tags: args.selectedTags },
    },
    false,
    selectedCount === 0,
  );
  const clearSelection = makeLocalButton("Clear selection", () =>
    setAllTagSelection("selectedStagedTags", [], false),
  );
  clearSelection.disabled = selectedCount === 0;
  bar.appendChild(promote);
  bar.appendChild(discard);
  bar.appendChild(clearSelection);
  return bar;
}

function renderStagedInboxSubview(snapshot: Snapshot) {
  const panel = el("div", "tags-subview");
  const filters = el("div", "filters");
  const search = el("input");
  search.dataset.synthesisControlKey = "tags.stagedSearch";
  search.placeholder = "Search staged tags";
  search.value = textValue(snapshot.tags.filters.stagedSearch);
  search.addEventListener("input", () =>
    sendAction("setFilters", { tags: { stagedSearch: search.value } }),
  );
  filters.appendChild(search);
  filters.appendChild(
    selectControl(
      ["all", ...snapshot.tags.stagedFacets],
      textValue(snapshot.tags.filters.stagedFacet, "all"),
      (value) => sendAction("setFilters", { tags: { stagedFacet: value } }),
    ),
  );
  const clearButton = makeLocalButton("Clear Staged", () => {
    if (!window.confirm("Clear all staged tag suggestions?")) {
      return;
    }
    sendAction("hostCommand", {
      command: "clearStagedTagSuggestions",
      args: {},
    });
  });
  clearButton.disabled = !(snapshot.tags.stagedCount || 0);
  filters.appendChild(clearButton);
  panel.appendChild(renderPanelToolbar(filters));
  const visibleTags = snapshot.tags.visibleStagedRows.map((row) =>
    textValue(row.tag),
  );
  const selectedTags = selectedTagList(snapshot, "selectedStagedTags").filter(
    (tag) => visibleTags.includes(tag),
  );
  panel.appendChild(
    renderTagBulkActionBar({
      snapshot,
      selectedTags,
      visibleTags,
    }),
  );
  panel.appendChild(
    renderTagsTable({
      className: "tags-staged-table",
      headers: [
        "",
        "Tag",
        "Facet",
        "Note",
        "Parents",
        "Source",
        "Updated",
        "Actions",
        "",
      ],
      rows: snapshot.tags.visibleStagedRows,
      mapRow: (row) => {
        const tag = textValue(row.tag);
        const facet = textValue(row.facet, "topic");
        const draft = currentStagedDraft(snapshot, row);
        const selected = selectedTags.includes(tag);
        const checkbox = el("input") as HTMLInputElement;
        checkbox.type = "checkbox";
        checkbox.checked = selected;
        checkbox.setAttribute("aria-label", `Select staged ${tag}`);
        checkbox.addEventListener("change", () =>
          toggleTagSelection(
            snapshot,
            "selectedStagedTags",
            tag,
            checkbox.checked,
          ),
        );
        const tagInput = el("input");
        tagInput.value = draft.tag;
        tagInput.dataset.synthesisControlKey = `tags.staged.${tag}.tag`;
        tagInput.addEventListener("change", () => {
          persistStagedDraft({
            snapshot,
            row,
            tagValue: tagInput.value,
            noteValue: noteInput.value,
          });
        });
        const noteInput = el("input");
        noteInput.value = draft.note;
        noteInput.dataset.synthesisControlKey = `tags.staged.${tag}.note`;
        noteInput.addEventListener("change", () => {
          persistStagedDraft({
            snapshot,
            row,
            tagValue: tagInput.value,
            noteValue: noteInput.value,
          });
        });
        const actions = el("div", "row-actions");
        actions.appendChild(
          makeButton("Promote", "hostCommand", {
            command: "promoteStagedTagSuggestions",
            args: { tag, tags: [tag] },
          }),
        );
        actions.appendChild(
          makeButton("Discard", "hostCommand", {
            command: "discardStagedTagSuggestions",
            args: { tag, tags: [tag] },
          }),
        );
        const key = expandedRowKey("staged", tag);
        const editState = renderStagedEditState(snapshot, row);
        const tagCell = el("div", "tags-inline-edit-cell");
        tagCell.appendChild(tagInput);
        tagCell.appendChild(editState);
        return [
          checkbox,
          tagCell,
          facet,
          noteInput,
          row.parent_count || 0,
          renderCompactText(row.source_flow || "-"),
          renderCompactText(row.updated_at || "-"),
          actions,
          renderRowExpandButton(snapshot, key),
        ];
      },
      expandedRow: (row) => {
        const key = expandedRowKey("staged", row.tag);
        if (!isTagRowExpanded(snapshot, key)) {
          return null;
        }
        const details = el("div", "tags-expanded-content");
        details.appendChild(
          renderDetailList([
            ["full tag", row.tag],
            ["note", row.note || "-"],
            [
              "parent bindings",
              Array.isArray(row.parent_bindings) && row.parent_bindings.length
                ? row.parent_bindings.join(", ")
                : "-",
            ],
            ["source flow", row.source_flow || "-"],
            ["created", row.created_at || "-"],
            ["updated", row.updated_at || "-"],
          ]),
        );
        details.appendChild(renderStagedEditState(snapshot, row));
        return details;
      },
      emptyState: renderEmptyState({
        title: snapshot.tags.stagedCount
          ? "No staged tags match the current filters"
          : "No staged tag suggestions",
        message: snapshot.tags.stagedCount
          ? "Adjust the staged search or facet filter to show more suggestions."
          : "Tag-regulator suggestions staged for review will appear here.",
        tone: snapshot.tags.stagedCount ? "default" : "info",
      }),
    }),
  );
  return panel;
}

function tagImportPreviewSignature(snapshot: Snapshot) {
  const preview = snapshot.tags.importPreview;
  if (!preview) return "";
  return [
    snapshot.tags.importDraft?.length || 0,
    preview.additions?.length || 0,
    preview.conflicts?.length || 0,
    preview.unchanged?.length || 0,
    preview.warnings?.length || 0,
  ].join(":");
}

function renderTagImportPanel(snapshot: Snapshot) {
  if (
    isReviewOptimisticallyResolved("tag-import", "merge-non-conflicting") ||
    isReviewOptimisticallyResolved("tag-import", "use-imported")
  ) {
    return null;
  }
  const preview = snapshot.tags.importPreview;
  const signature = tagImportPreviewSignature(snapshot);
  const shouldShow =
    state.tagImportOpen ||
    (preview && state.dismissedTagImportPreviewSignature !== signature);
  if (!shouldShow) {
    return null;
  }
  const draft = snapshot.tags.importDraft || "";
  const importDraft = document.createElement("textarea");
  importDraft.rows = 5;
  importDraft.placeholder = "Paste Tag Vocabulary JSON";
  importDraft.value = draft;
  importDraft.addEventListener("input", () => {
    state.dismissedTagImportPreviewSignature = undefined;
    sendAction("setFilters", { tags: { importDraft: importDraft.value } });
  });
  const close = makeLocalButton("Close", () => {
    state.tagImportOpen = false;
    state.dismissedTagImportPreviewSignature = signature || undefined;
    render();
  });
  const children: HTMLElement[] = [importDraft];
  const actions = [
    makeButton(
      "Preview Import",
      "hostCommand",
      {
        command: "previewTagVocabularyImport",
        args: { payload: draft },
      },
      false,
      !draft.trim(),
    ),
    close,
  ];
  if (preview) {
    const conflict = preview.conflicts?.[0];
    const importedConflict = recordValue(conflict?.imported);
    const localConflict = recordValue(conflict?.local);
    children.push(
      el(
        "p",
        "review-card-body",
        conflict
          ? `First conflict: ${textValue(conflict.tag || importedConflict.tag || localConflict.tag, "unknown tag")}`
          : "No conflicts detected in the current import preview.",
      ),
    );
    actions.unshift(
      makeButton(
        "Merge Non-conflicting",
        "hostCommand",
        {
          command: "applyTagVocabularyImport",
          args: {
            payload: draft,
            action: "merge-non-conflicting",
          },
        },
        false,
        !draft.trim(),
      ),
      makeButton(
        "Use Imported",
        "hostCommand",
        {
          command: "applyTagVocabularyImport",
          args: {
            payload: draft,
            action: "use-imported",
          },
        },
        false,
        !draft.trim(),
      ),
    );
  }
  return renderReviewPanel(
    renderReviewCard({
      kind: "Tag import",
      title: preview ? "Review tag import preview" : "Import tag vocabulary",
      meta: preview
        ? `${preview.additions?.length || 0} addition(s), ${preview.conflicts?.length || 0} conflict(s)`
        : "Paste TagVocab JSON to preview changes",
      body: preview
        ? "Review additions, unchanged tags, conflicts, and warnings before applying this vocabulary to the canonical store."
        : "Import is preview-first. The pasted vocabulary will not change canonical tags until you choose an explicit apply action.",
      details: preview
        ? [
            ["additions", preview.additions],
            ["conflicts", preview.conflicts],
            ["unchanged", preview.unchanged],
            ["warnings", preview.warnings],
          ]
        : [],
      children,
      actions,
    }),
    "tag-import-popover",
  );
}

function renderConcepts(main: HTMLElement, snapshot: Snapshot) {
  const shell = el("div", "graph-shell concepts-shell");
  const panel = el("div", "panel");
  const filters = el("div", "filters");
  const search = el("input");
  search.dataset.synthesisControlKey = "concepts.search";
  search.placeholder = "Search concepts";
  search.value = snapshot.concepts.filters.search || "";
  search.addEventListener("input", () =>
    sendAction("setFilters", { concepts: { search: search.value } }),
  );
  filters.appendChild(search);
  filters.appendChild(
    selectControl(
      ["all", ...snapshot.concepts.conceptTypes],
      snapshot.concepts.filters.conceptType || "all",
      (value) => sendAction("setFilters", { concepts: { conceptType: value } }),
    ),
  );
  filters.appendChild(
    selectControl(
      ["all", "active", "review", "deprecated"],
      snapshot.concepts.filters.status || "all",
      (value) => sendAction("setFilters", { concepts: { status: value } }),
    ),
  );
  filters.appendChild(
    makeButton(
      snapshot.concepts.filters.overlayEnabled ? "Overlay On" : "Overlay Off",
      "setConceptOverlay",
      { enabled: !snapshot.concepts.filters.overlayEnabled },
      snapshot.concepts.filters.overlayEnabled,
    ),
  );
  panel.appendChild(renderPanelToolbar(filters));
  const status = el("div", "details");
  status.appendChild(
    badge(
      snapshot.concepts.projection.stale
        ? "Concept cache stale"
        : "Concept cache ready",
      snapshot.concepts.projection.stale ? "warn" : "ok",
    ),
  );
  status.appendChild(
    el("span", "muted", `${snapshot.concepts.rows.length} concepts`),
  );
  panel.appendChild(status);
  panel.appendChild(
    tableView(
      ["Concept", "Type", "Domain", "Aliases", "Status"],
      snapshot.concepts.visibleRows,
      (row) => [
        makeButton(String(row.label || ""), "selectConcept", {
          conceptId: row.concept_id,
        }),
        row.concept_type || "-",
        row.domain || "-",
        Array.isArray(row.aliases) && row.aliases.length
          ? row.aliases.join(", ")
          : "-",
        badge(row.status || "active", toneFor(row.status)),
      ],
      renderEmptyState({
        title: snapshot.concepts.rows.length
          ? "No concepts match the current filters"
          : "No concepts indexed yet",
        message: snapshot.concepts.rows.length
          ? "Adjust the search, concept type, or status filters to show more concepts."
          : "Add concept knowledge to make it available here.",
        tone: snapshot.concepts.rows.length ? "default" : "info",
      }),
    ),
  );
  const reviewItems = (snapshot.concepts.reviewItems || []).filter(
    (item) =>
      textValue(item.status) === "open" &&
      !isReviewOptimisticallyResolved("concept-review", item.review_id),
  );
  if (reviewItems.length) {
    panel.appendChild(renderConceptReviewPanel(snapshot, reviewItems[0]));
  }
  shell.appendChild(panel);
  shell.appendChild(renderConceptInspector(snapshot));
  main.appendChild(shell);
}

function renderConceptReviewPanel(
  snapshot: Snapshot,
  item: Record<string, unknown>,
) {
  const candidateIds = Array.isArray(item.candidate_concept_ids)
    ? item.candidate_concept_ids
        .map((candidate) => textValue(candidate))
        .filter(Boolean)
    : [];
  const reviewId = textValue(item.review_id);
  const actions = [
    makeButton("Approve as New", "hostCommand", {
      command: "applyConceptReviewAction",
      args: {
        reviewId,
        action: "approve_create",
      },
    }),
    makeButton("Reject", "hostCommand", {
      command: "applyConceptReviewAction",
      args: { reviewId, action: "reject" },
    }),
  ];
  const children: HTMLElement[] = [];
  if (candidateIds.length) {
    const selectedTarget =
      snapshot.concepts.filters.reviewMergeTargets?.[reviewId] || "";
    const selectorRow = el("div", "review-card-field");
    selectorRow.appendChild(el("span", "muted", "merge target"));
    selectorRow.appendChild(
      selectControl(["", ...candidateIds], selectedTarget, (value) =>
        sendAction("setFilters", {
          concepts: {
            reviewMergeTargets: {
              ...(snapshot.concepts.filters.reviewMergeTargets || {}),
              [reviewId]: value,
            },
          },
        }),
      ),
    );
    children.push(selectorRow);
    actions.splice(
      1,
      0,
      makeButton(
        "Merge",
        "hostCommand",
        {
          command: "applyConceptReviewAction",
          args: {
            reviewId,
            action: "merge_into_existing",
            targetConceptId: selectedTarget,
          },
        },
        false,
        !selectedTarget,
      ),
    );
  }
  return renderReviewPanel(
    renderReviewCard({
      kind: "Concept review",
      title: textValue(item.label, "Concept proposal"),
      meta: textValue(item.reason, "Open review item"),
      body:
        textValue(item.short_definition || item.definition) ||
        "This concept proposal was not merged automatically because confidence or identity matching requires a human decision.",
      details: [
        ["confidence", item.confidence],
        ["type", item.concept_type],
        ["domain", item.domain],
        ["topic relevance", item.topic_relevance],
        ["candidates", candidateIds],
        ["evidence", item.evidence],
        ["diagnostics", item.diagnostics],
      ],
      children,
      actions,
    }),
    "concept-review-panel",
  );
}

function renderConceptInspector(snapshot: Snapshot) {
  const selected = snapshot.concepts.selected;
  const panel = el("aside", "panel details concept-inspector");
  const header = el("div", "panel-header");
  header.appendChild(el("strong", "", "Concept Detail"));
  panel.appendChild(header);
  const details = el("div", "details");
  if (!selected) {
    details.appendChild(
      renderEmptyState({
        title: "No concept selected",
        message: "Select a concept row to inspect definitions and senses.",
      }),
    );
    panel.appendChild(details);
    return panel;
  }
  const fields: Array<[string, unknown]> = [
    ["concept_id", selected.concept_id],
    ["label", selected.label],
    ["type", selected.concept_type],
    ["domain", selected.domain],
    ["status", selected.status],
    [
      "aliases",
      Array.isArray(selected.aliases) ? selected.aliases.join(", ") : "-",
    ],
    ["short_definition", selected.short_definition || "-"],
    ["definition", selected.definition || "-"],
    ["usage_note", selected.usage_note || "-"],
    ["editorial_note", selected.editorial_note || "-"],
  ];
  fields.forEach(([label, value]) => {
    const row = el("div", "detail-row");
    row.appendChild(el("span", "muted", label));
    row.appendChild(el("strong", "", String(value)));
    details.appendChild(row);
  });
  details.appendChild(
    makeButton("Edit Display Text", "hostCommand", {
      command: "updateConceptDisplayText",
      args: {
        conceptId: selected.concept_id,
        allowedFields: [
          "short_definition",
          "definition",
          "usage_note",
          "editorial_note",
        ],
      },
    }),
  );
  const senses = snapshot.concepts.senses.filter(
    (sense) => sense.concept_id === selected.concept_id,
  );
  const senseBox = el("div", "details");
  senseBox.appendChild(el("strong", "", "Senses"));
  senses.forEach((sense) => {
    senseBox.appendChild(
      el(
        "p",
        "muted",
        `${sense.label || sense.sense_id}: ${sense.short_definition || sense.definition || ""}`,
      ),
    );
  });
  details.appendChild(senseBox);
  panel.appendChild(details);
  return panel;
}

function roleOptions(snapshot: Snapshot) {
  return Array.from(
    new Set(
      snapshot.graph.edges
        .map((edge) => edge.primary_role || "")
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function graphDiagnosticSummary(
  diagnostics: Record<string, unknown>,
  layoutStatus: Snapshot["graph"]["layoutStatus"],
) {
  const entries = objectEntries(diagnostics);
  if (!entries.length) {
    if (layoutStatus === "refreshing") {
      return "The citation graph layout is still being computed.";
    }
    if (layoutStatus === "missing") {
      return "No graph layout has been generated for the current graph cache.";
    }
    if (layoutStatus === "stale") {
      return "The graph layout is stale and should be rebuilt.";
    }
    if (layoutStatus === "failed") {
      return "The last graph layout attempt failed. Rebuild to retry.";
    }
    return "The citation graph is not ready yet.";
  }
  return entries
    .slice(0, 3)
    .map(([key, value]) => {
      const label = key.replace(/_/g, " ");
      if (Array.isArray(value)) {
        return `${label}: ${value.length} item(s)`;
      }
      if (isRecord(value)) {
        return `${label}: ${Object.keys(value).length} field(s)`;
      }
      return `${label}: ${textValue(value, "available")}`;
    })
    .join("; ");
}

function renderCitationGraphLegend() {
  const legend = el("div", "citation-graph-legend");
  legend.setAttribute("aria-label", "Citation graph legend");
  legend.appendChild(el("strong", "", "Citation direction"));
  const rows: Array<[string, string]> = [
    ["Incoming to selected", CITATION_GRAPH_INCOMING_EDGE_COLOR],
    ["Outgoing from selected", CITATION_GRAPH_OUTGOING_EDGE_COLOR],
  ];
  rows.forEach(([label, color]) => {
    const row = el("div", "citation-graph-legend-row");
    const swatch = el("span", "citation-graph-legend-edge");
    swatch.style.background = color;
    swatch.style.color = color;
    row.appendChild(swatch);
    row.appendChild(el("span", "", label));
    legend.appendChild(row);
  });
  legend.appendChild(el("strong", "", "Citation importance"));
  const sizeRow = el("div", "citation-graph-legend-row");
  const sizeSwatch = el("span", "citation-graph-legend-node-size");
  sizeSwatch.appendChild(el("span", "citation-graph-legend-node is-small"));
  sizeSwatch.appendChild(el("span", "citation-graph-legend-node is-large"));
  sizeRow.appendChild(sizeSwatch);
  sizeRow.appendChild(el("span", "", "Node size = incoming citations"));
  legend.appendChild(sizeRow);
  const haloRow = el("div", "citation-graph-legend-row");
  const haloSwatch = el("span", "citation-graph-legend-node-size");
  haloSwatch.appendChild(
    el("span", "citation-graph-legend-node is-large is-halo is-library"),
  );
  haloSwatch.appendChild(
    el("span", "citation-graph-legend-node is-large is-halo is-external"),
  );
  haloRow.appendChild(haloSwatch);
  haloRow.appendChild(el("span", "", "Halo = top cited visible nodes"));
  legend.appendChild(haloRow);
  return legend;
}

function renderGraph(main: HTMLElement, snapshot: Snapshot) {
  const shell = el("div", "graph-shell");
  const stage = el("div", "graph-stage");
  const canvas = el("div", "sigma-stage");
  stage.appendChild(canvas);
  stage.appendChild(renderGraphZoomOverlay());
  shell.appendChild(stage);

  const detail = el("aside", "panel details graph-control-drawer");
  detail.tabIndex = 0;
  detail.setAttribute("aria-label", "Graph controls");
  const header = el("div", "panel-header");
  const controlIcon = el("span", "graph-control-icon");
  controlIcon.appendChild(iconSvg("controls"));
  header.appendChild(controlIcon);
  header.appendChild(el("strong", "graph-control-title", "Graph Controls"));
  detail.appendChild(header);
  const controls = el("div", "details");
  controls.dataset.synthesisScrollKey = "graph.controls";
  controls.appendChild(renderGraphControls(snapshot));
  controls.appendChild(
    el(
      "p",
      "muted",
      `${snapshot.graph.visibleNodes.length} shown nodes, ${snapshot.graph.visibleEdges.length} shown edges`,
    ),
  );
  const libraryCount = Number(
    snapshot.graph.diagnostics.library_node_count || 0,
  );
  const sharedExternalCount = Number(
    snapshot.graph.diagnostics.shared_external_count || 0,
  );
  const hoverOnlyExternalCount = Number(
    snapshot.graph.diagnostics.hover_only_external_count ||
      snapshot.graph.hoverOnlyNodes.length ||
      0,
  );
  controls.appendChild(
    el(
      "p",
      "muted",
      `${libraryCount} library, ${sharedExternalCount} shared external, ${hoverOnlyExternalCount} hover-only external hidden`,
    ),
  );
  detail.appendChild(controls);
  shell.appendChild(detail);

  if (snapshot.graph.selectedElement) {
    const selection = el("aside", "panel details graph-selection-drawer");
    selection.tabIndex = 0;
    selection.setAttribute("aria-label", "Graph selection");
    const selectionHeader = el("div", "panel-header");
    selectionHeader.appendChild(el("strong", "", "Selection"));
    selection.appendChild(selectionHeader);
    const selectionBody = el("div", "graph-selection-content");
    selectionBody.dataset.synthesisScrollKey = "graph.selection";
    selectionBody.appendChild(renderSelectedDetail(snapshot));
    selection.appendChild(selectionBody);
    shell.appendChild(selection);
  }
  main.appendChild(shell);

  const hasGraphData = snapshot.graph.nodes.length > 0;
  const graphCacheStatus = textValue(
    snapshot.graph.diagnostics?.cache_status,
    snapshot.graph.graph_hash ? "ready" : "missing",
  );
  const hasVisibleCoordinates = snapshot.graph.visibleNodes.some(
    (node) => typeof node.x === "number" && typeof node.y === "number",
  );
  if (!snapshot.graph.graph_hash || !hasGraphData) {
    const empty = el("div", "graph-empty");
    empty.appendChild(
      renderEmptyState({
        title: "No citation graph data",
        message: graphDiagnosticSummary(
          snapshot.graph.diagnostics || {},
          snapshot.graph.layoutStatus,
        ),
        action: makeButton("Rebuild graph cache", "hostCommand", {
          command: "rebuildCitationGraphCacheNow",
          args: {
            reason: "graph_tab",
          },
        }),
        tone: snapshot.graph.layoutStatus === "failed" ? "warning" : "info",
      }),
    );
    stage.appendChild(empty);
    return;
  }
  if (graphCacheStatus !== "ready") {
    const banner = el("div", "graph-layout-banner");
    banner.appendChild(
      el(
        "strong",
        "",
        graphCacheStatus === "failed"
          ? "Graph cache failed"
          : "Graph cache stale",
      ),
    );
    banner.appendChild(
      el(
        "span",
        "muted",
        graphCacheStatus === "failed"
          ? "Showing latest available graph data. Rebuild the graph cache to repair it."
          : "Showing latest available graph data. Refresh stale graph to update it.",
      ),
    );
    banner.appendChild(
      graphCacheStatus === "stale"
        ? makeGraphIncrementalRefreshButton(snapshot)
        : makeButton("Rebuild graph cache", "hostCommand", {
            command: "rebuildCitationGraphCacheNow",
            args: {
              reason: "graph_tab_failed",
            },
          }),
    );
    stage.appendChild(banner);
  }
  if (snapshot.graph.layoutStatus !== "ready") {
    const banner = el("div", "graph-layout-banner");
    banner.appendChild(
      el(
        "strong",
        "",
        snapshot.graph.layoutStatus === "refreshing"
          ? "Drawing graph"
          : "Refreshing graph layout",
      ),
    );
    banner.appendChild(
      el(
        "span",
        "muted",
        snapshot.graph.layoutStatus === "failed"
          ? "The latest layout attempt failed. Showing available graph data."
          : "The citation graph is available; layout is being refreshed.",
      ),
    );
    stage.appendChild(banner);
  }
  if (!hasVisibleCoordinates) {
    const pending = el("div", "graph-empty");
    pending.appendChild(
      renderEmptyState({
        title: "Drawing graph",
        message:
          "The citation graph data is ready. Layout coordinates are being computed.",
        tone: snapshot.graph.layoutStatus === "failed" ? "warning" : "info",
      }),
    );
    stage.appendChild(pending);
    return;
  }
  stage.appendChild(renderCitationGraphLegend());
  renderSigmaGraph(canvas, snapshot);
}

function renderGraphZoomOverlay() {
  const overlay = el("div", "graph-zoom-overlay");
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = String(GRAPH_ZOOM_SLIDER_MAX);
  slider.step = "1";
  slider.value = "50";
  slider.setAttribute("aria-label", "Graph zoom");
  slider.className = "graph-zoom-slider";
  slider.addEventListener("input", () => {
    const renderer = state.sigma;
    if (!renderer) {
      return;
    }
    setGraphZoomFromSlider(renderer, slider);
  });
  overlay.appendChild(slider);
  return overlay;
}

function clampGraphZoomRatio(value: unknown) {
  const ratio = Number(value);
  if (!Number.isFinite(ratio)) {
    return 1;
  }
  return Math.min(GRAPH_MAX_ZOOM_RATIO, Math.max(GRAPH_MIN_ZOOM_RATIO, ratio));
}

function graphZoomSliderValueFromRatio(ratio: unknown) {
  const clamped = clampGraphZoomRatio(ratio);
  const progress =
    (GRAPH_MAX_ZOOM_RATIO - clamped) /
    (GRAPH_MAX_ZOOM_RATIO - GRAPH_MIN_ZOOM_RATIO);
  return String(Math.round(progress * GRAPH_ZOOM_SLIDER_MAX));
}

function graphZoomRatioFromSliderValue(value: unknown) {
  const progress = Math.min(
    1,
    Math.max(0, Number(value) / GRAPH_ZOOM_SLIDER_MAX || 0),
  );
  return (
    GRAPH_MAX_ZOOM_RATIO -
    progress * (GRAPH_MAX_ZOOM_RATIO - GRAPH_MIN_ZOOM_RATIO)
  );
}

function graphZoomSliderForRenderer(renderer: Sigma) {
  return ((renderer as any).getContainer?.() as HTMLElement | undefined)
    ?.closest(".graph-stage")
    ?.querySelector(".graph-zoom-slider") as HTMLInputElement | null;
}

function syncGraphZoomSlider(renderer: Sigma) {
  const slider = graphZoomSliderForRenderer(renderer);
  if (!slider) {
    return;
  }
  const camera = renderer.getCamera() as any;
  slider.value = graphZoomSliderValueFromRatio(camera?.getState?.().ratio);
}

function clampGraphCameraZoom(renderer: Sigma) {
  const camera = renderer.getCamera() as any;
  const state = camera?.getState?.();
  if (!state) {
    return;
  }
  const ratio = clampGraphZoomRatio(state.ratio);
  if (ratio !== state.ratio) {
    camera.setState?.({ ...state, ratio });
    renderer.refresh();
  }
  syncGraphZoomSlider(renderer);
}

function setGraphZoomFromSlider(renderer: Sigma, slider: HTMLInputElement) {
  const camera = renderer.getCamera() as any;
  const state = camera?.getState?.();
  if (!state) {
    return;
  }
  camera.setState?.({
    ...state,
    ratio: clampGraphZoomRatio(graphZoomRatioFromSliderValue(slider.value)),
  });
  renderer.refresh();
  syncGraphZoomSlider(renderer);
}

function renderGraphControls(snapshot: Snapshot) {
  const wrap = el("div", "graph-controls");
  const filters = el("div", "filters");
  const search = el("input");
  search.dataset.synthesisControlKey = "graph.search";
  search.placeholder = "Search node";
  search.value = state.graphSearchDraft ?? snapshot.graph.filters.search ?? "";
  search.addEventListener("input", () => {
    state.graphSearchDraft = search.value;
  });
  search.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Enter") {
      event.preventDefault();
      submitGraphSearch(search.value);
    }
  });
  filters.appendChild(search);
  filters.appendChild(
    makeLocalButton("Search", () => {
      submitGraphSearch(search.value);
    }),
  );
  filters.appendChild(
    makeLocalButton("Clear", () => {
      search.value = "";
      state.graphSearchDraft = "";
      sendAction("setFilters", { graph: { search: "" } });
      refreshGraphSearchHighlight();
    }),
  );

  const role = selectControl(
    ["all", ...roleOptions(snapshot)],
    snapshot.graph.filters.role,
    (value) => sendAction("setFilters", { graph: { role: value } }),
  );
  filters.appendChild(role);
  const graphCacheStatus = textValue(
    snapshot.graph.diagnostics?.cache_status,
    snapshot.graph.graph_hash ? "ready" : "missing",
  );
  filters.appendChild(makeGraphIncrementalRefreshButton(snapshot));
  filters.appendChild(
    makeButton(
      "Rebuild graph cache",
      "hostCommand",
      {
        command: "rebuildCitationGraphCacheNow",
        args: { reason: "user" },
      },
      false,
      graphCacheStatus === "refreshing",
    ),
  );
  filters.appendChild(
    makeButton(
      "Redraw layout",
      "hostCommand",
      {
        command: "manualRecomputeLayout",
        args: {
          reason: "user",
          algorithm: snapshot.graph.filters.layoutAlgorithm,
        },
      },
      false,
      graphCacheStatus !== "ready" ||
        !snapshot.graph.graph_hash ||
        snapshot.graph.layoutStatus === "refreshing",
    ),
  );
  wrap.appendChild(filters);

  const kinds = el("div", "filters");
  (["library_paper", "external_reference"] as GraphNodeKind[]).forEach(
    (kind) => {
      const label = el("label", "checkbox-label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = snapshot.graph.filters.nodeKinds.includes(kind);
      input.addEventListener("change", () => {
        const next = new Set(snapshot.graph.filters.nodeKinds);
        if (input.checked) next.add(kind);
        else next.delete(kind);
        sendAction("setGraphView", { nodeKinds: Array.from(next) });
      });
      label.appendChild(input);
      label.appendChild(
        document.createTextNode(kind.replace("_reference", "")),
      );
      kinds.appendChild(label);
    },
  );
  const lowSignal = el("label", "checkbox-label");
  const lowSignalInput = document.createElement("input");
  lowSignalInput.type = "checkbox";
  lowSignalInput.checked = snapshot.graph.filters.showLowSignalReferences;
  lowSignalInput.addEventListener("change", () =>
    sendAction("setGraphView", {
      showLowSignalReferences: lowSignalInput.checked,
    }),
  );
  lowSignal.appendChild(lowSignalInput);
  lowSignal.appendChild(document.createTextNode("low-signal external"));
  kinds.appendChild(lowSignal);
  wrap.appendChild(kinds);

  const algorithms = el("div", "filters");
  (
    [
      ["force", "Force"],
      ["radial", "Radial"],
      ["components", "Components"],
    ] as Array<[string, string]>
  ).forEach(([algorithm, label]) => {
    algorithms.appendChild(
      makeButton(
        label,
        "setGraphView",
        { layoutAlgorithm: algorithm },
        snapshot.graph.layoutAlgorithm === algorithm,
      ),
    );
  });
  wrap.appendChild(algorithms);
  return wrap;
}

function submitGraphSearch(query: string) {
  state.graphSearchDraft = query;
  sendAction("setFilters", { graph: { search: query } });
  focusSearch(query);
  refreshGraphSearchHighlight();
}

function currentGraphSearchQuery(snapshot?: Snapshot) {
  return textValue(state.graphSearchDraft ?? snapshot?.graph.filters.search);
}

function graphNodeSearchText(node: GraphNode) {
  return `${node.label} ${node.id} ${node.year || ""} ${(node.tags || []).join(
    " ",
  )} ${(node.collections || []).join(" ")}`.toLowerCase();
}

function graphNodeMatchesSearchText(searchable: unknown, query: string) {
  const normalized = query.trim().toLowerCase();
  return (
    !!normalized && textValue(searchable).toLowerCase().includes(normalized)
  );
}

function refreshGraphSearchHighlight() {
  if (!currentGraphSearchQuery(state.snapshot || undefined)) {
    state.hoverLabelNode = undefined;
  }
  state.sigma?.refresh();
}

function graphCacheHasIncrementalDelta(snapshot: Snapshot) {
  return Boolean(snapshot.graph.diagnostics?.cache_delta_available);
}

function makeGraphIncrementalRefreshButton(snapshot: Snapshot) {
  const graphCacheStatus = textValue(
    snapshot.graph.diagnostics?.cache_status,
    snapshot.graph.graph_hash ? "ready" : "missing",
  );
  const hasDelta = graphCacheHasIncrementalDelta(snapshot);
  const disabled = graphCacheStatus !== "stale" || !hasDelta;
  const button = makeButton(
    "Refresh stale graph",
    "hostCommand",
    {
      command: "refreshCitationGraphCacheIncrementalNow",
      args: { reason: "user" },
    },
    false,
    disabled,
  );
  if (disabled) {
    button.title =
      graphCacheStatus !== "stale"
        ? "Incremental graph refresh is available only when the graph cache is stale."
        : "This stale graph cache has no recorded incremental refresh scope; use full rebuild.";
  }
  return button;
}

function graphNodeColor(node: GraphNode) {
  if (node.display_tier === "single_external") {
    return "#b6bd74";
  }
  return colors[node.kind];
}

function graphNodeImportanceColor(node: GraphNode) {
  if (node.kind === "library_paper") {
    return "#2f7df6";
  }
  if (node.display_tier === "single_external") {
    return "#c4ca5d";
  }
  return "#94a51f";
}

type GraphNodeImportance = {
  incomingDegree: number;
  percentile: number;
  halo: boolean;
};

function graphNodeBaseSize(node: GraphNode) {
  if (node.kind === "library_paper") {
    return GRAPH_LIBRARY_BASE_NODE_SIZE;
  }
  if (node.display_tier === "shared_external") {
    return GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE;
  }
  if (node.display_tier === "single_external") {
    return GRAPH_SINGLE_EXTERNAL_BASE_NODE_SIZE;
  }
  return 2.5;
}

function graphNodeSizeCap(node: GraphNode) {
  return node.kind === "library_paper"
    ? GRAPH_LIBRARY_NODE_SIZE_CAP
    : GRAPH_EXTERNAL_NODE_SIZE_CAP;
}

function graphNodeSize(node: GraphNode, importance?: GraphNodeImportance) {
  const base = graphNodeBaseSize(node);
  if (!importance || importance.incomingDegree <= 0) {
    return base;
  }
  const cap = graphNodeSizeCap(node);
  return Math.min(cap, base + (cap - base) * importance.percentile);
}

function graphNodeZIndex(node: GraphNode, importance?: GraphNodeImportance) {
  const importanceZIndex = importance?.halo ? 8 : 0;
  if (node.kind === "library_paper") {
    return Math.max(4, importanceZIndex);
  }
  if (node.display_tier === "shared_external") {
    return Math.max(2, importanceZIndex);
  }
  if (node.visibility === "hover_only") {
    return Math.max(1, importanceZIndex);
  }
  return Math.max(2, importanceZIndex);
}

function graphNodeIncomingDegree(
  node: GraphNode,
  fallbackIncomingDegrees: Map<string, number>,
) {
  const metricDegree = node.metrics?.internal_in_degree;
  if (typeof metricDegree === "number" && Number.isFinite(metricDegree)) {
    return Math.max(0, Math.floor(metricDegree));
  }
  return fallbackIncomingDegrees.get(node.id) || 0;
}

function fallbackGraphIncomingDegrees(snapshot: Snapshot) {
  const visibleIds = new Set(
    snapshot.graph.visibleNodes.map((node) => node.id),
  );
  const incoming = new Map<string, number>();
  [...snapshot.graph.edges, ...snapshot.graph.hoverOnlyEdges].forEach(
    (edge) => {
      if (visibleIds.has(edge.target)) {
        incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
      }
    },
  );
  return incoming;
}

function buildGraphNodeImportance(snapshot: Snapshot) {
  const fallbackIncomingDegrees = fallbackGraphIncomingDegrees(snapshot);
  const entries = snapshot.graph.visibleNodes
    .map((node) => ({
      node,
      incomingDegree: graphNodeIncomingDegree(node, fallbackIncomingDegrees),
    }))
    .filter((entry) => entry.incomingDegree > 0);
  const degreeRanks = Array.from(
    new Set(entries.map((entry) => entry.incomingDegree)),
  ).sort((left, right) => left - right);
  const rankByDegree = new Map(
    degreeRanks.map((degree, index) => [
      degree,
      degreeRanks.length <= 1 ? 1 : index / (degreeRanks.length - 1),
    ]),
  );
  const haloCount = Math.min(
    GRAPH_IMPORTANCE_HALO_MAX,
    Math.max(1, Math.ceil(entries.length * GRAPH_IMPORTANCE_HALO_TOP_RATIO)),
  );
  const haloNodeIds = new Set(
    entries
      .slice()
      .sort(
        (left, right) =>
          right.incomingDegree - left.incomingDegree ||
          left.node.id.localeCompare(right.node.id),
      )
      .slice(0, haloCount)
      .map((entry) => entry.node.id),
  );
  return new Map(
    entries.map((entry) => [
      entry.node.id,
      {
        incomingDegree: entry.incomingDegree,
        percentile: rankByDegree.get(entry.incomingDegree) || 0,
        halo: haloNodeIds.has(entry.node.id),
      },
    ]),
  );
}

function graphUsesDarkTheme() {
  const root = document.documentElement;
  const explicitTheme = root?.getAttribute("data-zs-theme");
  if (explicitTheme === "dark") return true;
  if (explicitTheme === "light") return false;
  return Boolean(window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
}

function drawGraphImportanceHalo(
  context: CanvasRenderingContext2D,
  data: {
    x: number;
    y: number;
    size: number;
    kind?: unknown;
    importanceHalo?: unknown;
  },
) {
  const dark = graphUsesDarkTheme();
  const libraryNode = data.kind === "library_paper";
  const strong = libraryNode
    ? dark
      ? GRAPH_LIBRARY_IMPORTANCE_HALO_DARK
      : GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT
    : dark
      ? GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK
      : GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT;
  const soft = libraryNode
    ? dark
      ? GRAPH_LIBRARY_IMPORTANCE_HALO_DARK_SOFT
      : GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT
    : dark
      ? GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK_SOFT
      : GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT_SOFT;
  const radius = Math.max(5, Number(data.size || 1)) + 3;
  context.save();
  context.lineCap = "round";
  context.strokeStyle = soft;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(data.x, data.y, radius + 1, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = strong;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(data.x, data.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawGraphNodeHover(
  context: CanvasRenderingContext2D,
  data: Record<string, unknown>,
  settings: Record<string, unknown>,
) {
  if (data.importanceHalo && !data.importanceInteractive) {
    drawGraphImportanceHalo(
      context,
      data as {
        x: number;
        y: number;
        size: number;
        kind?: unknown;
        importanceHalo?: unknown;
      },
    );
    return;
  }
  drawDiscNodeHover(context as any, data as any, settings as any);
}

function clearDynamicHoverGraph(graph: Graph) {
  for (const edgeId of Array.from(state.dynamicHoverEdgeIds)) {
    if (graph.hasEdge(edgeId)) {
      graph.dropEdge(edgeId);
    }
  }
  for (const nodeId of Array.from(state.dynamicHoverNodeIds)) {
    if (graph.hasNode(nodeId)) {
      graph.dropNode(nodeId);
    }
  }
  state.dynamicHoverEdgeIds.clear();
  state.dynamicHoverNodeIds.clear();
}

function cancelScheduledHoverClear() {
  if (state.hoverClearTimer) {
    window.clearTimeout(state.hoverClearTimer);
    state.hoverClearTimer = undefined;
  }
}

function scheduleHoverClear(
  renderer: Sigma,
  graph: Graph,
  pinnedNode?: string,
) {
  cancelScheduledHoverClear();
  state.hoverClearTimer = window.setTimeout(() => {
    state.hoverClearTimer = undefined;
    if (state.sigma !== renderer || state.graph !== graph) {
      return;
    }
    if (pinnedNode && graph.hasNode(pinnedNode)) {
      addHoverNeighborhood(graph, pinnedNode);
      state.hoveredNode = pinnedNode;
    } else {
      clearDynamicHoverGraph(graph);
      state.hoveredNode = undefined;
    }
    state.hoverLabelNode = undefined;
    renderer.refresh();
  }, 80);
}

function addHoverNeighborhood(graph: Graph, hoveredNode: string) {
  clearDynamicHoverGraph(graph);
  if (!graph.hasNode(hoveredNode)) return;
}

function selectedGraphHoverNode(snapshot: Snapshot, graph: Graph) {
  const selected = snapshot.graph.selectedElement;
  if (selected?.kind !== "node" || !graph.hasNode(selected.id)) {
    return undefined;
  }
  return selected.id;
}

function renderSigmaGraph(container: HTMLElement, snapshot: Snapshot) {
  const graph = new Graph({ multi: false, type: "directed" });
  const importanceByNodeId = buildGraphNodeImportance(snapshot);
  state.dynamicHoverNodeIds.clear();
  state.dynamicHoverEdgeIds.clear();
  const visibleIds = new Set(
    snapshot.graph.visibleNodes.map((node) => node.id),
  );
  for (const node of snapshot.graph.visibleNodes) {
    const importance = importanceByNodeId.get(node.id);
    graph.addNode(node.id, {
      title: node.label,
      label: "",
      x: typeof node.x === "number" ? node.x : 0,
      y: typeof node.y === "number" ? node.y : 0,
      size: graphNodeSize(node, importance),
      color: importance?.halo
        ? graphNodeImportanceColor(node)
        : graphNodeColor(node),
      zIndex: graphNodeZIndex(node, importance),
      highlighted: importance?.halo || false,
      importanceHalo: importance?.halo || false,
      importanceInteractive: false,
      incomingDegree: importance?.incomingDegree || 0,
      kind: node.kind,
      visibility: node.visibility || "default",
      display_tier: node.display_tier || "library",
      searchable: graphNodeSearchText(node),
    });
  }
  for (const edge of snapshot.graph.visibleEdges) {
    if (visibleIds.has(edge.source) && visibleIds.has(edge.target)) {
      graph.mergeDirectedEdgeWithKey(edge.id, edge.source, edge.target, {
        type: "arrow",
        hidden: true,
        color: CITATION_GRAPH_OUTGOING_EDGE_COLOR,
        size: CITATION_GRAPH_EDGE_SIZE,
        label: edge.primary_role || "",
        zIndex: 0,
        visibility: edge.visibility || "default",
      });
    }
  }

  state.graph = graph;
  const pinnedHoverNode = selectedGraphHoverNode(snapshot, graph);
  state.hoveredNode = pinnedHoverNode;
  state.hoverLabelNode = undefined;
  if (pinnedHoverNode) {
    addHoverNeighborhood(graph, pinnedHoverNode);
  }
  const renderer = new Sigma(graph, container, {
    allowInvalidContainer: true,
    enableEdgeEvents: false,
    renderEdgeLabels: false,
    defaultDrawNodeHover: drawGraphNodeHover,
    zIndex: true,
    nodeReducer(node: string, data: Record<string, unknown>) {
      const query = currentGraphSearchQuery(snapshot);
      const searchActive = !!query.trim();
      const searchMatch = graphNodeMatchesSearchText(data.searchable, query);
      if (!state.hoveredNode || !graph.hasNode(state.hoveredNode)) {
        if (!searchActive) return data;
        return {
          ...data,
          color: searchMatch ? "#0ea5e9" : "#d3d8de",
          size: searchMatch
            ? Math.max(
                Number(data.size || 1) * 1.35,
                Number(data.size || 1) + 1,
              )
            : Number(data.size || 1),
          zIndex: searchMatch
            ? Math.max(30, Number(data.zIndex || 0))
            : Number(data.zIndex || 0),
          highlighted: Boolean(data.importanceHalo && searchMatch),
          importanceInteractive: false,
          label: searchMatch ? data.title : "",
        };
      }
      const neighbor =
        node === state.hoveredNode ||
        graph.areNeighbors(node, state.hoveredNode);
      const activeHaloNode = Boolean(
        data.importanceHalo && node === state.hoveredNode,
      );
      const showHoverLabel =
        searchMatch ||
        node === state.hoverLabelNode ||
        node === state.hoveredNode ||
        (neighbor &&
          (data.kind === "library_paper" || data.visibility === "hover_only"));
      return {
        ...data,
        color: searchMatch ? "#0ea5e9" : neighbor ? data.color : "#d3d8de",
        size: searchMatch
          ? Math.max(Number(data.size || 1) * 1.35, Number(data.size || 1) + 1)
          : neighbor || data.visibility !== "hover_only"
            ? data.size
            : Math.max(1, Number(data.size || 1) * 0.6),
        zIndex: searchMatch
          ? Math.max(30, Number(data.zIndex || 0))
          : neighbor
            ? Math.max(10, Number(data.zIndex || 0))
            : Number(data.zIndex || 0),
        highlighted: Boolean(data.importanceHalo && (searchMatch || neighbor)),
        importanceInteractive: activeHaloNode,
        label: showHoverLabel ? data.title : "",
      };
    },
    edgeReducer(edge: string, data: Record<string, unknown>) {
      const selectedEdgeId =
        snapshot.graph.selectedElement?.kind === "edge"
          ? snapshot.graph.selectedElement.id
          : undefined;
      const activeNode =
        state.hoveredNode && graph.hasNode(state.hoveredNode)
          ? state.hoveredNode
          : undefined;
      const source = graph.source(edge);
      const target = graph.target(edge);
      const connectedToActiveNode = activeNode
        ? source === activeNode || target === activeNode
        : false;
      const selectedEdge = selectedEdgeId === edge;
      const visible = connectedToActiveNode || selectedEdge;
      const directionColor =
        activeNode && target === activeNode
          ? CITATION_GRAPH_INCOMING_EDGE_COLOR
          : CITATION_GRAPH_OUTGOING_EDGE_COLOR;
      return {
        ...data,
        hidden: !visible,
        color: directionColor,
        size: CITATION_GRAPH_EDGE_SIZE,
        zIndex: visible ? 20 : 0,
      };
    },
  } as any);
  state.sigma = renderer;
  const camera = renderer.getCamera() as any;
  camera?.on?.("updated", () => clampGraphCameraZoom(renderer));
  clampGraphCameraZoom(renderer);
  if (typeof ResizeObserver !== "undefined") {
    state.sigmaResizeObserver = new ResizeObserver(() => {
      scheduleSigmaResize(renderer, container);
    });
    state.sigmaResizeObserver.observe(container);
  }
  scheduleSigmaResize(renderer, container);
  renderer.on("enterNode", ({ node }: { node: string }) => {
    const pinnedNode = selectedGraphHoverNode(snapshot, graph);
    if (pinnedNode && node !== pinnedNode) {
      state.hoverLabelNode = graph.areNeighbors(node, pinnedNode)
        ? node
        : undefined;
      renderer.refresh();
      return;
    }
    cancelScheduledHoverClear();
    if (
      state.dynamicHoverNodeIds.has(node) &&
      state.hoveredNode &&
      graph.hasNode(state.hoveredNode)
    ) {
      renderer.refresh();
      return;
    }
    if (node === state.hoveredNode) {
      state.hoverLabelNode = undefined;
      renderer.refresh();
      return;
    }
    addHoverNeighborhood(graph, node);
    state.hoveredNode = node;
    state.hoverLabelNode = undefined;
    renderer.refresh();
  });
  renderer.on("leaveNode", () => {
    state.hoverLabelNode = undefined;
    scheduleHoverClear(
      renderer,
      graph,
      selectedGraphHoverNode(snapshot, graph),
    );
  });
  renderer.on("clickNode", ({ node }: { node: string }) => {
    cancelScheduledHoverClear();
    addHoverNeighborhood(graph, node);
    state.hoveredNode = node;
    state.hoverLabelNode = undefined;
    renderer.refresh();
    sendAction("setGraphView", { selectedElement: { kind: "node", id: node } });
  });
  renderer.on("clickEdge", ({ edge }: { edge: string }) => {
    cancelScheduledHoverClear();
    state.hoveredNode = undefined;
    state.hoverLabelNode = undefined;
    renderer.refresh();
    sendAction("setGraphView", { selectedElement: { kind: "edge", id: edge } });
  });
  renderer.on("clickStage", () => {
    cancelScheduledHoverClear();
    clearDynamicHoverGraph(graph);
    state.hoveredNode = undefined;
    state.hoverLabelNode = undefined;
    renderer.refresh();
    sendAction("setGraphView", { selectedElement: null });
  });
}

function focusSearch(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized || !state.snapshot || !state.graph || !state.sigma) {
    return;
  }
  state.hoverLabelNode = undefined;
  const match = state.snapshot.graph.visibleNodes.find(
    (node) =>
      graphNodeSearchText(node).includes(normalized) &&
      state.graph?.hasNode(node.id),
  );
  if (!match || !state.graph.hasNode(match.id)) {
    return;
  }
  state.hoverLabelNode = match.id;
  state.sigma.refresh();
}

function renderSelectedDetail(snapshot: Snapshot) {
  const wrap = el("div", "selected-detail");
  const selected = snapshot.graph.selectedElement;
  if (!selected) {
    wrap.appendChild(
      renderEmptyState({
        title: "No graph item selected",
        message: "Select a node or edge to inspect citation graph details.",
      }),
    );
    return wrap;
  }
  if (selected.kind === "node") {
    const node = graphNodeById(snapshot).get(selected.id);
    const incomingDegrees = fallbackGraphIncomingDegrees(snapshot);
    const fields: Array<[string, unknown]> = [
      ["title", node?.label || selected.id],
      ["type", node?.kind || selected.kind],
      ["year", node?.year || "-"],
      [
        "incoming citations",
        node ? graphNodeIncomingDegree(node, incomingDegrees) : "-",
      ],
      ["signal", node?.low_signal ? "low" : "normal"],
      ["id", selected.id],
    ];
    wrap.appendChild(renderDetailList(fields));
    if (node?.kind === "library_paper") {
      wrap.appendChild(
        makeButton("Open Zotero item", "hostCommand", {
          command: "openZoteroItem",
          args: { nodeId: node.id },
        }),
      );
      wrap.appendChild(renderSelectedNodeCitations(snapshot, node));
    }
    return wrap;
  }
  const edge = graphEdgeById(snapshot).get(selected.id);
  wrap.appendChild(
    renderDetailList([
      ["role", edge?.primary_role || "-"],
      ["source", edge?.source || "-"],
      ["target", edge?.target || "-"],
      ["mentions", edge?.mention_count || 0],
      ["id", selected.id],
    ]),
  );
  return wrap;
}

function graphNodeById(snapshot: Snapshot) {
  return new Map(
    [...snapshot.graph.nodes, ...snapshot.graph.hoverOnlyNodes].map((node) => [
      node.id,
      node,
    ]),
  );
}

function graphEdgeById(snapshot: Snapshot) {
  return new Map(
    [...snapshot.graph.edges, ...snapshot.graph.hoverOnlyEdges].map((edge) => [
      edge.id,
      edge,
    ]),
  );
}

function collectSelectedNodeCitations(snapshot: Snapshot, sourceId: string) {
  const nodesById = graphNodeById(snapshot);
  const edgesById = graphEdgeById(snapshot);
  return Array.from(edgesById.values())
    .filter((edge) => edge.source === sourceId)
    .sort(
      (left, right) =>
        (nodesById.get(left.target)?.label || left.target).localeCompare(
          nodesById.get(right.target)?.label || right.target,
        ) || left.id.localeCompare(right.id),
    )
    .map((edge) => ({
      edge,
      target: nodesById.get(edge.target),
    }));
}

function graphCitationKindLabel(node: GraphNode | undefined) {
  if (!node) return "reference";
  if (node.kind === "library_paper") return "library";
  if (node.kind === "external_reference") {
    return node.display_tier === "single_external"
      ? "single external"
      : "shared external";
  }
  return "unresolved";
}

function renderSelectedNodeCitations(snapshot: Snapshot, node: GraphNode) {
  const section = el("section", "graph-citation-section");
  const header = el("div", "graph-citation-header");
  header.appendChild(el("h3", "", "Citations"));
  const citations = collectSelectedNodeCitations(snapshot, node.id);
  header.appendChild(el("span", "badge", `${citations.length} outgoing`));
  section.appendChild(header);
  if (!citations.length) {
    section.appendChild(
      renderEmptyState({
        title: "No outgoing citations",
        message: "This library paper has no citation targets in the graph.",
      }),
    );
    return section;
  }
  const list = el("div", "graph-citation-list");
  citations.forEach(({ edge, target }) => {
    const card = el("article", "graph-citation-card");
    const title = el(
      "strong",
      "graph-citation-title",
      target?.label || edge.target,
    );
    card.appendChild(title);
    const meta = el("div", "graph-citation-meta");
    meta.appendChild(badge(graphCitationKindLabel(target), target?.kind || ""));
    if (target?.year) {
      meta.appendChild(el("span", "muted", target.year));
    }
    if (edge.primary_role) {
      meta.appendChild(el("span", "muted", edge.primary_role));
    }
    meta.appendChild(
      el("span", "muted", `${Math.max(0, edge.mention_count || 0)} mentions`),
    );
    card.appendChild(meta);
    card.title = `${target?.label || edge.target} (${edge.id})`;
    list.appendChild(card);
  });
  section.appendChild(list);
  return section;
}

function matrixTableView(
  headers: string[],
  rows: Array<Record<string, unknown>>,
  mapRow: (row: Record<string, unknown>) => Array<Node | unknown>,
  emptyState?: HTMLElement,
) {
  if (!rows.length) {
    return (
      emptyState ||
      renderEmptyState({
        title: "No rows to show",
        message: "This view has no records for the current selection.",
      })
    );
  }
  const wrap = el("div", "matrix-table-wrap");
  const table = el("table", "matrix-table");
  const thead = el("thead");
  const tr = el("tr");
  headers.forEach((header) => tr.appendChild(el("th", "matrix-th", header)));
  thead.appendChild(tr);
  table.appendChild(thead);
  const tbody = el("tbody");
  rows.forEach((row) => {
    const rowNode = el("tr");
    mapRow(row).forEach((cell) => {
      const td = el("td", "matrix-td");
      if (cell instanceof Node) {
        td.appendChild(cell);
      } else {
        td.textContent = String(cell ?? "");
      }
      rowNode.appendChild(td);
    });
    tbody.appendChild(rowNode);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function tableView(
  headers: string[],
  rows: Array<Record<string, unknown>>,
  mapRow: (row: Record<string, unknown>) => Array<Node | unknown>,
  emptyState?: HTMLElement,
) {
  if (!rows.length) {
    return (
      emptyState ||
      renderEmptyState({
        title: "No rows to show",
        message: "This view has no records for the current filters.",
      })
    );
  }
  const wrap = el("div", "table-wrap");
  const table = el("table");
  const thead = el("thead");
  const tr = el("tr");
  headers.forEach((header) => tr.appendChild(el("th", "", header)));
  thead.appendChild(tr);
  table.appendChild(thead);
  const tbody = el("tbody");
  rows.forEach((row) => {
    const rowNode = el("tr");
    mapRow(row).forEach((cell) => {
      const td = el("td");
      if (cell instanceof Node) {
        td.appendChild(cell);
      } else {
        td.textContent = String(cell ?? "");
      }
      rowNode.appendChild(td);
    });
    tbody.appendChild(rowNode);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function snapshotChromeSignature(snapshot: Snapshot | null) {
  if (!snapshot) {
    return "";
  }
  return JSON.stringify({
    actions: snapshot.actions || {},
    localPendingActions: Array.from(state.localPendingActions.values()).map(
      (entry) => [entry.key, entry.command, entry.status, entry.started_at],
    ),
    backgroundJobs: snapshot.maintenance?.backgroundJobs || {},
    sync: snapshot.sync?.status,
    jobPopoverOpen: state.jobPopoverOpen,
  });
}

function compactRegistryRowSignature(row: Record<string, unknown>) {
  return [
    row.paper_ref,
    row.title,
    row.year,
    row.artifactCoverage,
    row.index_scope,
    row.reference_count,
    row.unbound_reference_count,
  ];
}

function compactReferenceProposalSignature(row: Record<string, unknown>) {
  return [
    row.proposal_id,
    row.status,
    row.kind,
    row.updated_at,
    row.source_canonical_reference_id,
    row.target_canonical_reference_id,
    row.target_library_id,
    row.target_item_key,
  ];
}

function compactCleanupProposalSignature(row: Record<string, unknown>) {
  return [
    row.proposal_id,
    row.status,
    row.kind,
    row.review_kind,
    row.updated_at,
    row.source_paper_ref,
    row.target_paper_ref,
  ];
}

function compactReviewItemSignature(row: Record<string, unknown>) {
  return [
    row.review_id,
    row.edge_id,
    row.status,
    row.kind,
    row.review_kind,
    row.updated_at,
    row.source_topic_id,
    row.target_topic_id,
  ];
}

function graphCountSignature(snapshot: Snapshot) {
  return {
    nodeCount: snapshot.graph.nodes.length,
    edgeCount: snapshot.graph.edges.length,
    visibleNodeCount: snapshot.graph.visibleNodes.length,
    visibleEdgeCount: snapshot.graph.visibleEdges.length,
    hoverOnlyNodeCount: snapshot.graph.hoverOnlyNodes.length,
    hoverOnlyEdgeCount: snapshot.graph.hoverOnlyEdges.length,
  };
}

function compactTagRowSignature(row: Record<string, unknown>) {
  return [row.tag, row.status, row.paper_count, row.updated_at];
}

function compactConceptRowSignature(row: Record<string, unknown>) {
  return [
    row.concept_id,
    row.label,
    row.status,
    row.concept_type,
    row.updated_at,
  ];
}

function compactArtifactRowSignature(row: Record<string, unknown>) {
  return [
    row.id,
    row.title,
    row.freshness,
    row.coverage,
    row.updated_at,
    row.paper_count,
  ];
}

function registryContentSignature(snapshot: Snapshot) {
  return {
    selectedTab: snapshot.selectedTab,
    filters: snapshot.registry.filters,
    rows: snapshot.registry.visibleRows.map(compactRegistryRowSignature),
    cleanup: (snapshot.registry.cleanupProposals || []).map(
      compactCleanupProposalSignature,
    ),
    proposals: (snapshot.registry.matchProposals || []).map(
      compactReferenceProposalSignature,
    ),
    cacheStatus: [
      snapshot.registry.cacheStatus?.status,
      snapshot.registry.cacheStatus?.refreshed_at,
    ],
  };
}

function reviewContentSignature(snapshot: Snapshot) {
  return {
    selectedTab: snapshot.selectedTab,
    filters: reviewFilters(snapshot),
    proposals: (snapshot.registry.matchProposals || []).map(
      compactReferenceProposalSignature,
    ),
    cleanup: (snapshot.registry.cleanupProposals || []).map(
      compactCleanupProposalSignature,
    ),
    concepts: (snapshot.concepts.reviewItems || []).map(
      compactReviewItemSignature,
    ),
    graph: (snapshot.topicGraph.reviewItems || []).map(
      compactReviewItemSignature,
    ),
    graphInspector: (
      snapshot.topicGraph.inspector?.relationReviewItems || []
    ).map(compactReviewItemSignature),
  };
}

function snapshotContentSignature(snapshot: Snapshot | null) {
  if (!snapshot) {
    return "";
  }
  const selectedTab = snapshot.selectedTab;
  if (selectedTab === "registry") {
    return JSON.stringify(registryContentSignature(snapshot));
  }
  if (selectedTab === "reviews") {
    return JSON.stringify(reviewContentSignature(snapshot));
  }
  if (selectedTab === "graph") {
    return JSON.stringify({
      selectedTab,
      filters: snapshot.graph.filters,
      graph_hash: snapshot.graph.graph_hash,
      layoutStatus: snapshot.graph.layoutStatus,
      layoutAlgorithm: snapshot.graph.layoutAlgorithm,
      selectedElement: snapshot.graph.selectedElement,
      counts: graphCountSignature(snapshot),
    });
  }
  if (selectedTab === "tags") {
    return JSON.stringify({
      selectedTab,
      filters: snapshot.tags.filters,
      rows: snapshot.tags.visibleRows.map(compactTagRowSignature),
      selected: snapshot.tags.selected,
      importPreview: [
        snapshot.tags.importPreview?.additions?.length || 0,
        snapshot.tags.importPreview?.unchanged?.length || 0,
        snapshot.tags.importPreview?.conflicts?.length || 0,
        snapshot.tags.importPreview?.warnings?.length || 0,
      ],
      importDraft: snapshot.tags.importDraft,
      projection: [
        snapshot.tags.projection?.stale,
        snapshot.tags.projection?.last_rebuild_at,
      ],
    });
  }
  if (selectedTab === "concepts") {
    return JSON.stringify({
      selectedTab,
      filters: snapshot.concepts.filters,
      rows: snapshot.concepts.visibleRows.map(compactConceptRowSignature),
      selected: snapshot.concepts.selected,
      reviewItems: snapshot.concepts.reviewItems.map(
        compactReviewItemSignature,
      ),
      projection: [
        snapshot.concepts.projection?.stale,
        snapshot.concepts.projection?.last_rebuild_at,
      ],
    });
  }
  if (selectedTab === "artifacts") {
    return JSON.stringify({
      selectedTab,
      filters: snapshot.artifacts.filters,
      rows: snapshot.artifacts.visibleRows.map(compactArtifactRowSignature),
      graphProjection: [
        snapshot.topicGraph.projection?.stale,
        snapshot.topicGraph.projection?.last_rebuild_at,
      ],
      deletedArtifacts: [
        snapshot.deletedArtifacts.count,
        snapshot.deletedArtifacts.rows.length,
      ],
    });
  }
  if (selectedTab === "reader") {
    return JSON.stringify({
      selectedTab,
      reader: snapshot.reader,
      artifactReader: state.artifactReader,
      topicDetail: state.topicDetail,
      topicDetailSection: state.topicDetailSection,
      evidenceExplorerOpen: state.evidenceExplorerOpen,
      selectedEvidenceId: state.selectedEvidenceId,
    });
  }
  return JSON.stringify({
    selectedTab,
    artifactCount: snapshot.artifacts.rows.length,
    registryCount: snapshot.registry.rows.length,
    graphCount: snapshot.graph.visibleNodes.length,
    sync: snapshot.sync?.status,
    conflicts: snapshot.conflicts,
  });
}

type WorkbenchRenderState = {
  selectedTab?: string;
  mainScrollTop: number;
  scrollTops: Record<string, number>;
  openDetails: string[];
  activeControlKey?: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  graphCamera?: Record<string, unknown>;
  graphCameraKey?: string;
};

function graphCameraRestoreKey(snapshot: Snapshot | null) {
  if (!snapshot || snapshot.selectedTab !== "graph") {
    return "";
  }
  return [
    snapshot.graph.graph_hash,
    snapshot.graph.layoutAlgorithm,
    snapshot.graph.layoutStatus,
  ].join(":");
}

function captureWorkbenchRenderState(root: HTMLElement): WorkbenchRenderState {
  const main = root.querySelector(".main") as HTMLElement | null;
  const scrollTops: Record<string, number> = {};
  Array.from(root.querySelectorAll("[data-synthesis-scroll-key]")).forEach(
    (node) => {
      if (node instanceof HTMLElement) {
        const key = node.dataset.synthesisScrollKey || "";
        if (key) {
          scrollTops[key] = node.scrollTop || 0;
        }
      }
    },
  );
  const active = (root.ownerDocument || document)
    .activeElement as HTMLElement | null;
  const activeControlKey = active?.dataset?.synthesisControlKey || undefined;
  const graphCamera = (() => {
    try {
      return (state.sigma?.getCamera?.() as any)?.getState?.();
    } catch {
      return undefined;
    }
  })();
  return {
    selectedTab: state.snapshot?.selectedTab,
    mainScrollTop: main?.scrollTop || 0,
    scrollTops,
    openDetails: (
      Array.from(
        root.querySelectorAll("details[data-synthesis-details-key][open]"),
      ) as HTMLElement[]
    )
      .map((node) => node.getAttribute("data-synthesis-details-key") || "")
      .filter(Boolean),
    activeControlKey,
    selectionStart:
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement
        ? active.selectionStart
        : undefined,
    selectionEnd:
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement
        ? active.selectionEnd
        : undefined,
    graphCamera,
    graphCameraKey: graphCameraRestoreKey(state.snapshot),
  };
}

function restoreWorkbenchRenderState(
  root: HTMLElement,
  previous: WorkbenchRenderState,
) {
  if (previous.selectedTab !== state.snapshot?.selectedTab) {
    return;
  }
  const main = root.querySelector(".main") as HTMLElement | null;
  if (main) {
    main.scrollTop = previous.mainScrollTop;
  }
  const scrollContainers = Array.from(
    root.querySelectorAll("[data-synthesis-scroll-key]"),
  ) as HTMLElement[];
  scrollContainers.forEach((node) => {
    const key = node.dataset.synthesisScrollKey || "";
    if (key && typeof previous.scrollTops[key] === "number") {
      node.scrollTop = previous.scrollTops[key];
    }
  });
  previous.openDetails.forEach((key) => {
    const escaped =
      typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key;
    const details = root.querySelector(
      `details[data-synthesis-details-key="${escaped}"]`,
    ) as HTMLDetailsElement | null;
    if (details) {
      details.open = true;
    }
  });
  if (previous.activeControlKey) {
    const escaped =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(previous.activeControlKey)
        : previous.activeControlKey;
    const control = root.querySelector(
      `[data-synthesis-control-key="${escaped}"]`,
    ) as HTMLElement | null;
    control?.focus();
    if (
      (control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement) &&
      typeof previous.selectionStart === "number" &&
      typeof previous.selectionEnd === "number"
    ) {
      control.setSelectionRange(previous.selectionStart, previous.selectionEnd);
    }
  }
  if (
    previous.graphCamera &&
    previous.graphCameraKey &&
    previous.graphCameraKey === graphCameraRestoreKey(state.snapshot) &&
    state.sigma
  ) {
    try {
      (state.sigma.getCamera() as any).setState(previous.graphCamera);
      state.sigma.refresh();
    } catch {
      // Camera restore is best-effort because Sigma may reject stale bounds.
    }
  }
}

function selectControl(
  options: string[],
  value: string,
  onChange: (value: string) => void,
) {
  const select = el("select");
  options.forEach((option) => {
    const node = el("option", "", option);
    node.value = option;
    node.selected = option === value;
    select.appendChild(node);
  });
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function selectControlWithLabels(
  options: Array<[string, string]>,
  value: string,
  onChange: (value: string) => void,
) {
  const select = el("select");
  options.forEach(([optionValue, label]) => {
    const node = el("option", "", label);
    node.value = optionValue;
    node.selected = optionValue === value;
    select.appendChild(node);
  });
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function render() {
  const root = document.getElementById("app");
  if (!root) return;
  if (!state.snapshot) {
    clear(root);
    const loading = el("div", "loading-shell");
    loading.appendChild(el("div", "loading-spinner"));
    loading.appendChild(
      el("div", "loading-title", "Loading Synthesis Workbench"),
    );
    loading.appendChild(
      el(
        "div",
        "loading-subtitle",
        "Preparing Zotero bridge and library state...",
      ),
    );
    root.appendChild(loading);
    return;
  }
  const renderState = captureWorkbenchRenderState(root as HTMLElement);
  disposeGraphRenderer();
  renderShell(root as HTMLElement, state.snapshot);
  restoreWorkbenchRenderState(root as HTMLElement, renderState);
  renderDigestModal(root as HTMLElement);
  state.lastContentSignature = snapshotContentSignature(state.snapshot);
  state.lastChromeSignature = snapshotChromeSignature(state.snapshot);
  maybeRequestGraphLayoutRefresh(state.snapshot);
}

function maybeRequestGraphLayoutRefresh(snapshot: Snapshot | null) {
  if (!snapshot || snapshot.selectedTab !== "graph") {
    return;
  }
  if (
    !snapshot.graph.graph_hash ||
    snapshot.graph.nodes.length === 0 ||
    (snapshot.graph.layoutStatus !== "missing" &&
      snapshot.graph.layoutStatus !== "stale")
  ) {
    return;
  }
  const algorithm =
    snapshot.graph.filters.layoutAlgorithm || snapshot.graph.layoutAlgorithm;
  const key = `${snapshot.graph.graph_hash}:${algorithm}`;
  if (
    state.autoLayoutRequests.has(key) ||
    isOperationPending("manualRecomputeLayout", { algorithm })
  ) {
    return;
  }
  state.autoLayoutRequests.add(key);
  window.setTimeout(() => {
    sendAction("hostCommand", {
      command: "manualRecomputeLayout",
      args: { reason: "auto", algorithm },
    });
  }, 0);
}

function buildDigestOutline(markdownNode: HTMLElement) {
  const headings = Array.from(
    markdownNode.querySelectorAll("h1, h2, h3, h4"),
  ) as HTMLElement[];
  if (!headings.length) {
    return undefined;
  }
  const outline = el("nav", "digest-outline");
  outline.setAttribute("aria-label", "Digest outline");
  outline.appendChild(el("strong", "", "Outline"));
  headings.forEach((heading, index) => {
    const id = `digest-heading-${index + 1}`;
    heading.id = id;
    const level = Number(heading.tagName.replace(/\D/g, "")) || 2;
    const link = el(
      "a",
      `digest-outline-link depth-${Math.max(1, Math.min(4, level))}`,
      heading.textContent || `Section ${index + 1}`,
    );
    link.href = `#${id}`;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      heading.scrollIntoView({ block: "start" });
    });
    outline.appendChild(link);
  });
  return outline;
}

function renderDigestRepresentativeImage(result: Record<string, unknown>) {
  const image = recordValue(result.representative_image);
  if (textValue(image.status) !== "available") {
    return undefined;
  }
  const dataUrl = textValue(image.data_url);
  if (!/^data:image\//i.test(dataUrl)) {
    return undefined;
  }
  const alt = firstText(image, ["alt", "caption"], "Representative image");
  const figure = el("figure", "digest-representative-image");
  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = alt;
  img.loading = "lazy";
  const width = numberValue(image.width);
  const height = numberValue(image.height);
  if (width > 0) {
    img.width = width;
  }
  if (height > 0) {
    img.height = height;
  }
  figure.appendChild(img);
  const caption = firstText(image, ["caption", "alt"], "");
  if (caption) {
    figure.appendChild(el("figcaption", "", caption));
  }
  return figure;
}

function renderDigestModal(root: HTMLElement) {
  if (!state.digestModal) {
    return;
  }
  const overlay = el("div", "paper-digest-modal");
  const dialog = el("section", "paper-digest-dialog");
  const header = el("div", "paper-digest-header");
  const evidence = state.digestModal.evidence || {};
  header.appendChild(
    el(
      "strong",
      "",
      firstText(evidence, ["title", "paper_title", "label"], "Paper digest"),
    ),
  );
  const close = el("button", "", "Close");
  close.type = "button";
  close.addEventListener("click", () => {
    state.digestModal = undefined;
    render();
  });
  header.appendChild(close);
  dialog.appendChild(header);
  if (state.digestModal.status === "loading") {
    dialog.appendChild(el("div", "empty", "Loading digest artifact..."));
  } else {
    const result = state.digestModal.result || {};
    const content = el("div", "paper-digest-content");
    const intro = el("div", "digest-modal-intro");
    if (result.source_changed) {
      intro.appendChild(
        el(
          "div",
          "digest-warning",
          "Digest source changed since this topic was synthesized.",
        ),
      );
    }
    const representativeImage = renderDigestRepresentativeImage(result);
    if (representativeImage) {
      intro.appendChild(representativeImage);
    }
    const markdown = textValue(result.digest_markdown);
    if (markdown) {
      const digestBody = el("div", "paper-digest-body");
      const markdownNode = renderMarkdown(markdown);
      if (intro.childNodes.length) {
        if (markdownNode instanceof HTMLElement) {
          markdownNode.prepend(intro);
        }
      }
      const outline =
        markdownNode instanceof HTMLElement
          ? buildDigestOutline(markdownNode)
          : undefined;
      if (outline) {
        digestBody.appendChild(outline);
      } else {
        digestBody.classList.add("no-outline");
      }
      const scrollBody = el("div", "digest-scroll-body");
      scrollBody.appendChild(markdownNode);
      digestBody.appendChild(scrollBody);
      content.appendChild(digestBody);
    } else {
      if (intro.childNodes.length) {
        content.appendChild(intro);
      }
      content.appendChild(
        el(
          "div",
          "empty",
          textValue(result.status) || "Digest is unavailable.",
        ),
      );
    }
    dialog.appendChild(content);
  }
  overlay.appendChild(dialog);
  root.appendChild(overlay);
}

window.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key !== "Escape") {
    return;
  }
  if (state.digestModal) {
    state.digestModal = undefined;
    render();
    return;
  }
  if (state.evidenceExplorerOpen) {
    state.evidenceExplorerOpen = false;
    render();
  }
});

window.addEventListener("message", (event: MessageEvent) => {
  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }
  if (data.type === "synthesis:chrome") {
    const nextSnapshot = (data.payload || null) as Snapshot | null;
    state.snapshot = nextSnapshot;
    clearResolvedLocalPending(state.snapshot);
    if (!state.snapshot) {
      render();
      return;
    }
    const nextChromeSignature = snapshotChromeSignature(state.snapshot);
    if (nextChromeSignature !== state.lastChromeSignature) {
      state.lastChromeSignature = nextChromeSignature;
      renderWorkbenchChrome();
    }
    return;
  }
  if (data.type === "synthesis:surface") {
    const payload =
      data.payload && typeof data.payload === "object"
        ? (data.payload as Record<string, unknown>)
        : {};
    const surface = String(payload.surface || "") as WorkbenchSurfaceName;
    const nextSnapshot = (payload.snapshot || null) as Snapshot | null;
    state.snapshot = nextSnapshot;
    clearResolvedLocalPending(state.snapshot);
    if (!state.snapshot) {
      render();
      return;
    }
    const nextChromeSignature = snapshotChromeSignature(state.snapshot);
    const chromeChanged = nextChromeSignature !== state.lastChromeSignature;
    if (
      surface === "home" ||
      surface === "topics" ||
      surface === "index" ||
      surface === "review" ||
      surface === "graph" ||
      surface === "tags" ||
      surface === "concepts" ||
      surface === "reader"
    ) {
      markSurfaceRuntime(surface, "ready", undefined, state.snapshot);
      if (surface === "index") {
        state.registryLoadingReferenceRows.clear();
      }
      renderSurface(surface);
    } else {
      render();
      return;
    }
    if (chromeChanged) {
      state.lastChromeSignature = nextChromeSignature;
      renderWorkbenchChrome();
    }
    return;
  }
  if (data.type === "synthesis:surface-error") {
    const payload =
      data.payload && typeof data.payload === "object"
        ? (data.payload as Record<string, unknown>)
        : {};
    state.lastLocalAction = {
      key: `surface-error:${String(payload.surface || "unknown")}`,
      command: "refresh",
      status: "failed",
      label: "Loading Synthesis surface",
      completed_at: new Date().toISOString(),
      message: String(payload.message || "Surface failed to load."),
    };
    const surface = String(payload.surface || "") as WorkbenchSurfaceName;
    if (
      surface === "home" ||
      surface === "topics" ||
      surface === "index" ||
      surface === "review" ||
      surface === "graph" ||
      surface === "tags" ||
      surface === "concepts" ||
      surface === "reader"
    ) {
      markSurfaceRuntime(
        surface,
        "failed",
        String(payload.message || "Surface failed to load."),
      );
    }
    renderWorkbenchChrome();
    return;
  }
  if (data.type === "synthesis:init" || data.type === "synthesis:snapshot") {
    const nextSnapshot = (data.payload || null) as Snapshot | null;
    const nextContentSignature = snapshotContentSignature(nextSnapshot);
    const contentChanged = nextContentSignature !== state.lastContentSignature;
    state.snapshot = nextSnapshot;
    clearResolvedLocalPending(state.snapshot);
    const nextChromeSignature = snapshotChromeSignature(state.snapshot);
    const chromeChanged = nextChromeSignature !== state.lastChromeSignature;
    if (!contentChanged && !chromeChanged) {
      return;
    }
    if (!contentChanged) {
      state.lastChromeSignature = snapshotChromeSignature(state.snapshot);
      renderWorkbenchChrome();
      maybeRequestGraphLayoutRefresh(state.snapshot);
      return;
    }
    render();
  }
  if (data.type === "synthesis:artifact") {
    state.artifactReader = data.payload || undefined;
    state.topicDetail = undefined;
    state.digestModal = undefined;
    state.evidenceExplorerOpen = false;
    if (state.snapshot) {
      state.snapshot = {
        ...state.snapshot,
        selectedTab: "reader",
        reader: {
          topicId: state.artifactReader?.topicId || "",
          previousTab: state.snapshot.reader?.previousTab || "artifacts",
        },
      };
    }
    render();
  }
  if (data.type === "synthesis:topic-detail") {
    state.topicDetail = data.payload || undefined;
    state.artifactReader = undefined;
    state.digestModal = undefined;
    state.evidenceExplorerOpen = false;
    if (state.snapshot) {
      state.snapshot = {
        ...state.snapshot,
        selectedTab: "reader",
        reader: {
          topicId: state.topicDetail?.topicId || "",
          previousTab: state.snapshot.reader?.previousTab || "artifacts",
        },
      };
    }
    render();
  }
  if (data.type === "synthesis:digest") {
    state.digestModal = {
      status: data.payload?.ok ? "available" : "unavailable",
      evidence: state.digestModal?.evidence,
      result: data.payload || {},
    };
    render();
  }
});

sendAction("ready");
render();
