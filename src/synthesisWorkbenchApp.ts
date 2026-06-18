import Graph from "graphology";
import Sigma from "sigma";
import { drawDiscNodeHover } from "sigma/rendering";
import {
  CITATION_GRAPH_EDGE_SIZE,
  CITATION_GRAPH_INCOMING_EDGE_COLOR,
  CITATION_GRAPH_OUTGOING_EDGE_COLOR,
  GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK,
  GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK_SOFT,
  GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT,
  GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT_SOFT,
  GRAPH_EXTERNAL_NODE_SIZE_CAP,
  GRAPH_IMPORTANCE_HALO_MAX,
  GRAPH_IMPORTANCE_HALO_TOP_RATIO,
  GRAPH_LIBRARY_BASE_NODE_SIZE,
  GRAPH_LIBRARY_IMPORTANCE_HALO_DARK,
  GRAPH_LIBRARY_IMPORTANCE_HALO_DARK_SOFT,
  GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT,
  GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT,
  GRAPH_LIBRARY_NODE_SIZE_CAP,
  GRAPH_MAX_ZOOM_RATIO,
  GRAPH_MIN_ZOOM_RATIO,
  GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE,
  GRAPH_SINGLE_EXTERNAL_BASE_NODE_SIZE,
  GRAPH_ZOOM_SLIDER_MAX,
} from "./shared/citationGraphVisualRules";
import {
  renderTopicTimeline as renderSharedTopicTimeline,
  type TopicTimelineData,
} from "./shared/topicTimelineRenderer";
import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
  type SynthesisWorkbenchI18nEnvelope,
  type SynthesisWorkbenchMessageKey,
} from "./synthesisWorkbenchI18n";

declare const window: Window &
  typeof globalThis & {
    markdownit?: (options?: Record<string, unknown>) => MarkdownItLike;
    texmath?: MarkdownItPlugin;
    katex?: unknown;
    __zoteroSkillsSynthesisWorkbenchBridge?: SynthesisWorkbenchBridge;
    __zoteroSkillsSynthesisTopicExport?: SynthesisTopicExportEnvelope;
    __zoteroSkillsSynthesisGraphExport?: SynthesisGraphExportEnvelope;
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

type SynthesisI18nPayload = Partial<SynthesisWorkbenchI18nEnvelope>;

type GraphNodeKind = "library_paper" | "external_reference";

type GraphNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
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
  is_focus?: boolean;
  focus_role?: string;
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

type SyncTransportSnapshot = {
  queue_state?: string;
  paused?: boolean;
  adapter_configured?: boolean;
  config_status?: string;
  remote_url?: string;
  branch?: string;
  base_url?: string;
  remote_path?: string;
  token_masked?: string;
  token_updated_at?: string;
  connection_test?: {
    ok?: boolean;
    tested_at?: string;
    remote_branch_state?: string;
    remote_state?: string;
    diagnostics?: Array<Record<string, unknown>>;
  };
  last_run_status?: string;
  last_run_at?: string;
  conflict_count?: number;
  conflict_assets?: Array<{
    asset_path?: string;
    reason?: string;
    base_hash?: string;
    local_hash?: string;
    remote_hash?: string;
  }>;
  conflictActions?: string[];
  diagnostics?: Array<Record<string, unknown>>;
  allowedActions?: string[];
};

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
    git?: SyncTransportSnapshot;
    webdav?: SyncTransportSnapshot;
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
    matchTargetCandidates?: Array<Record<string, unknown>>;
    canonicalRows?: Array<Record<string, unknown>>;
    visibleCanonicalRows?: Array<Record<string, unknown>>;
    canonicalDiagnostics?: unknown[];
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
    summary?: {
      openCount?: number;
      indexCount?: number;
      referenceMatchingCount?: number;
      conceptCount?: number;
      topicGraphCount?: number;
    };
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
      topicId: string;
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
    topicScopes: Array<{
      topicId: string;
      title: string;
      paperRefs: string[];
      nodeIds: string[];
    }>;
    selectedTopicScope?: {
      topicId: string;
      title: string;
      paperRefs: string[];
      nodeIds: string[];
    };
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
  draftFacet?: string;
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
  | "future_directions"
  | "report"
  | "citation_graph";

type TopicDetailDto = {
  topicId: string;
  title: string;
  language?: string;
  updated_at?: string;
  artifact_hash?: string;
  paper_count?: number;
  topic?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  taxonomy?: Record<string, unknown>;
  improvement_dimensions?: unknown;
  comparison_matrix?: Record<string, unknown>;
  claims?: unknown[];
  timeline_events?: unknown[] | Record<string, unknown>;
  source_papers?: unknown[];
  debates?: unknown[];
  coverage?: Record<string, unknown>;
  statistics?: Record<string, unknown>;
  synthesis_report?: Record<string, unknown>;
  future_directions?: unknown[];
  review_outline?: Record<string, unknown>;
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

type SynthesisTopicExportEnvelope = {
  version?: number;
  generatedAt?: string;
  i18n?: SynthesisI18nPayload;
  snapshot?: Snapshot;
  topicDetail?: TopicDetailDto;
  digestsByKey?: Record<string, Record<string, unknown>>;
  graphLayouts?: Record<string, Snapshot["graph"]>;
};

type SynthesisGraphExportEnvelope = {
  version?: number;
  generatedAt?: string;
  i18n?: SynthesisI18nPayload;
  snapshot?: Snapshot;
  graphLayouts?: Record<string, Snapshot["graph"]>;
  scopeLabel?: string;
  focusNodeId?: string;
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
  | "delete"
  | "manual_target";

type ReferenceProposalManualTarget =
  | { kind: "zotero_item"; libraryId: number; itemKey: string }
  | { kind: "canonical_reference"; canonicalReferenceId: string };

type PendingReferenceProposalDecision = {
  proposalId: string;
  action: ReferenceProposalAction;
  target?: ReferenceProposalManualTarget;
  targetLabel?: string;
  createdAt: number;
};

type PendingCanonicalMergeRequest = {
  sourceEffectiveCanonicalId: string;
  targetEffectiveCanonicalId: string;
  sourceTitle: string;
  targetTitle: string;
  createdAt: number;
};

type CanonicalEditIdentifierDraft = {
  kind: string;
  value: string;
};

type CanonicalEditDraft = {
  title: string;
  year: string;
  authorsText: string;
  identifiers: CanonicalEditIdentifierDraft[];
};

type ManualTargetPickerState = {
  proposalId: string;
  sourceTitle: string;
  anchorRect?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
};

type ReferenceProposalSubmission = {
  operationKey: string;
  proposalIds: string[];
};

type CanonicalMergeSubmission = {
  operationKey: string;
  sourceEffectiveCanonicalIds: string[];
};

type LocalReviewPanelState = {
  collapsed: boolean;
  index: number;
};

type WorkbenchSurfaceRuntime = {
  status: "missing" | "loading" | "ready" | "stale" | "failed";
  revision: number;
  error?: string;
  errorCode?: string;
  transient?: boolean;
  requestId?: number;
  snapshot?: Snapshot;
};

const STATUSBAR_COMPLETED_TIMEOUT_MS = 4000;
const STATUSBAR_FAILED_TIMEOUT_MS = 8000;
const STATUSBAR_WARNING_TIMEOUT_MS = 8000;
const STATUSBAR_EXPIRY_RENDER_GRACE_MS = 25;

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
  graphReturnTopicId?: string;
  standaloneExport: boolean;
  standaloneGraphOnly: boolean;
  standaloneGraphScopeLabel: string;
  standaloneGraphFocusNodeId: string;
  standaloneDigestsByKey: Map<string, Record<string, unknown>>;
  standaloneGraphLayouts: Map<string, Snapshot["graph"]>;
  dynamicHoverNodeIds: Set<string>;
  dynamicHoverEdgeIds: Set<string>;
  localPendingActions: Map<string, ActionOperation>;
  optimisticReviewDecisions: Map<string, OptimisticReviewDecision>;
  pendingReferenceProposalDecisions: Map<
    string,
    PendingReferenceProposalDecision
  >;
  pendingCanonicalMergeRequests: Map<string, PendingCanonicalMergeRequest>;
  canonicalEditOpenRowId?: string;
  canonicalEditDrafts: Map<string, CanonicalEditDraft>;
  canonicalEditCompareIndexByRowId: Map<string, number>;
  selectedCanonicalRowIds: Set<string>;
  canonicalMergeSourceRowIds: Set<string>;
  selectedReferenceProposalIds: Set<string>;
  selectedConceptIds: Set<string>;
  referenceProposalSubmission?: ReferenceProposalSubmission;
  canonicalMergeSubmission?: CanonicalMergeSubmission;
  manualTargetPicker?: ManualTargetPickerState;
  topicGraphReviewPanel: LocalReviewPanelState;
  conceptReviewPanel: LocalReviewPanelState;
  expandedConceptReviewMergeRows: Set<string>;
  surfaces: Record<string, WorkbenchSurfaceRuntime>;
  acceptedSurfaceRequestIds: Record<string, number>;
  lastLocalAction?: ActionOperation;
  statusbarExpirations: Map<string, number>;
  statusbarTimer?: number;
  jobPopoverOpen: boolean;
  tagImportOpen: boolean;
  dismissedTagImportPreviewSignature?: string;
  autoLayoutRequests: Set<string>;
  registryExpandedRows: Set<string>;
  registryLoadingReferenceRows: Set<string>;
  canonicalDetailTab: "overview" | "redirects" | "reviews";
  canonicalDetailCollapsed: boolean;
  locale: string;
  messages: Record<SynthesisWorkbenchMessageKey, string>;
} = {
  snapshot: null,
  topicDetailSection: "overview",
  evidenceExplorerOpen: false,
  sidebarExpanded: false,
  explorerWidth: 360,
  localPendingActions: new Map(),
  optimisticReviewDecisions: new Map(),
  pendingReferenceProposalDecisions: new Map(),
  pendingCanonicalMergeRequests: new Map(),
  canonicalEditDrafts: new Map(),
  canonicalEditCompareIndexByRowId: new Map(),
  selectedCanonicalRowIds: new Set(),
  canonicalMergeSourceRowIds: new Set(),
  selectedReferenceProposalIds: new Set(),
  selectedConceptIds: new Set(),
  topicGraphReviewPanel: { collapsed: false, index: 0 },
  conceptReviewPanel: { collapsed: false, index: 0 },
  expandedConceptReviewMergeRows: new Set(),
  surfaces: {},
  acceptedSurfaceRequestIds: {},
  statusbarExpirations: new Map(),
  jobPopoverOpen: false,
  tagImportOpen: false,
  autoLayoutRequests: new Set(),
  registryExpandedRows: new Set(),
  registryLoadingReferenceRows: new Set(),
  canonicalDetailTab: "overview",
  canonicalDetailCollapsed: false,
  dynamicHoverNodeIds: new Set(),
  dynamicHoverEdgeIds: new Set(),
  standaloneExport: false,
  standaloneGraphOnly: false,
  standaloneGraphScopeLabel: "",
  standaloneGraphFocusNodeId: "",
  standaloneDigestsByKey: new Map(),
  standaloneGraphLayouts: new Map(),
  locale: "en-US",
  messages: { ...SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES },
};

const colors: Record<GraphNodeKind, string> = {
  library_paper: "#1967b3",
  external_reference: "#7a861f",
};

let conceptBubbleCleanup: (() => void) | undefined;
let conceptBubbleCloseTimer: number | undefined;

const SYNTHESIS_DEFAULT_TEXT_TO_KEY = new Map<
  string,
  SynthesisWorkbenchMessageKey
>(
  (
    Object.entries(SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) as Array<
      [SynthesisWorkbenchMessageKey, string]
    >
  ).map(([key, value]) => [value, key]),
);

function t(
  key: SynthesisWorkbenchMessageKey,
  args: Record<string, unknown> = {},
) {
  return formatSynthesisWorkbenchMessage(
    state.messages[key] || SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
    args,
  );
}

function uiText(value: string, args: Record<string, unknown> = {}) {
  const key = SYNTHESIS_DEFAULT_TEXT_TO_KEY.get(value);
  return key ? t(key, args) : value;
}

const CONTROLLED_ENUM_DOMAINS = [
  "status",
  "kind",
  "reason",
  "relation",
  "action",
  "confidence",
  "coverage",
  "coverage-caveat",
  "freshness",
  "binding-status",
  "priority",
  "graph-node-kind",
  "graph-edge-role",
  "graph-layout",
  "tag-status",
  "tag-density",
  "concept-type",
  "review-tab",
  "sync-status",
  "scope",
] as const;

type ControlledEnumDomain = (typeof CONTROLLED_ENUM_DOMAINS)[number];

function enumKeyPart(value: unknown) {
  return textValue(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function humanizeEnumValue(value: unknown) {
  const text = textValue(value);
  if (!text) return "";
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function enumMessageKey(domain: ControlledEnumDomain, value: unknown) {
  const keyPart = enumKeyPart(value);
  if (!keyPart) return undefined;
  const key =
    `synthesis-enum-${domain}-${keyPart}` as SynthesisWorkbenchMessageKey;
  return key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES ? key : undefined;
}

function enumLabel(
  domain: ControlledEnumDomain,
  value: unknown,
  fallback?: string,
) {
  const key = enumMessageKey(domain, value);
  if (key) return t(key);
  const fallbackText = textValue(fallback);
  if (fallbackText) return uiText(fallbackText);
  return humanizeEnumValue(value);
}

function filterOptionLabel(
  filterKey: SynthesisWorkbenchMessageKey,
  domain: ControlledEnumDomain,
  value: unknown,
) {
  return `${t(filterKey)}: ${enumLabel(domain, value)}`;
}

function maybeLocalizedValue(value: unknown) {
  const text = textValue(value);
  if (!text) return "";
  const normalized = text.replace(/_/g, "-").toLowerCase();
  const statusKey =
    `synthesis-status-${normalized}` as SynthesisWorkbenchMessageKey;
  if (statusKey in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) {
    return t(statusKey);
  }
  const relationKey =
    `synthesis-relation-${normalized}` as SynthesisWorkbenchMessageKey;
  if (relationKey in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) {
    return t(relationKey);
  }
  for (const domain of CONTROLLED_ENUM_DOMAINS) {
    const enumKey = enumMessageKey(domain, text);
    if (enumKey) {
      return t(enumKey);
    }
  }
  return uiText(text);
}

function applyI18nEnvelope(payload: unknown) {
  const envelope = recordValue((payload as Record<string, unknown>)?.i18n);
  const locale = textValue(envelope.locale, state.locale || "en-US");
  const incomingMessages = recordValue(envelope.messages);
  const nextMessages: Record<SynthesisWorkbenchMessageKey, string> = {
    ...SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  };
  Object.keys(nextMessages).forEach((key) => {
    const message = textValue(incomingMessages[key]);
    if (message) {
      nextMessages[key as SynthesisWorkbenchMessageKey] = message;
    }
  });
  const changed =
    locale !== state.locale ||
    JSON.stringify(nextMessages) !== JSON.stringify(state.messages);
  state.locale = locale;
  state.messages = nextMessages;
  const html = document.documentElement as HTMLHtmlElement | null;
  if (html) {
    html.lang = locale;
  }
  document.title = t("synthesis-page-title");
  return changed;
}

function stripI18nFromSnapshotPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }
  const { i18n: _i18n, ...snapshot } = payload as Record<string, unknown>;
  return snapshot;
}

function localizeWorkbenchDom(root: ParentNode & Node) {
  const excludedSelector = [
    ".markdown-body",
    ".report-card",
    ".paper-digest-body",
    ".digest-scroll-body",
    ".evidence-explorer-content",
    ".topic-report-concept-nav",
    ".concept-mention",
    ".concept-bubble",
  ].join(",");
  const translateAttribute = (node: Element, attr: string) => {
    const value = node.getAttribute(attr);
    if (!value) return;
    const localized = uiText(value);
    if (localized !== value) {
      node.setAttribute(attr, localized);
    }
  };

  const elements = Array.from(root.querySelectorAll("*")) as Element[];
  elements.forEach((node) => {
    if (!(node instanceof Element) || node.closest(excludedSelector)) {
      return;
    }
    ["placeholder", "title", "aria-label", "alt"].forEach((attr) =>
      translateAttribute(node, attr),
    );
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(excludedSelector)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }
  nodes.forEach((node) => {
    const value = node.nodeValue || "";
    const trimmed = value.trim();
    if (!trimmed) return;
    const localized = uiText(trimmed);
    if (localized !== trimmed) {
      node.nodeValue = value.replace(trimmed, localized);
    }
  });
}

function sendAction(action: string, payload: Record<string, unknown> = {}) {
  if (action === "openTopicCitationSubgraph") {
    const topicId = textValue(payload.topicId);
    if (topicId) {
      state.graphReturnTopicId = topicId;
      sendAction("setGraphView", { topicId, selectedElement: null });
      sendAction("selectTab", { tab: "graph" });
    }
    return;
  }
  if (action === "backToTopicDetail") {
    const topicId = textValue(payload.topicId || state.graphReturnTopicId);
    state.graphReturnTopicId = undefined;
    if (topicId) {
      if (state.standaloneExport && state.snapshot) {
        state.snapshot = {
          ...state.snapshot,
          selectedTab: "reader",
          reader: {
            topicId,
            previousTab: "graph",
          },
        };
        renderSelectedTabShell();
        return;
      }
      sendAction("showArtifactReader", { topicId, previousTab: "graph" });
    }
    return;
  }
  if (state.standaloneExport && action === "setGraphView" && state.snapshot) {
    const selected =
      "selectedElement" in payload ? payload.selectedElement : undefined;
    const nextAlgorithm = textValue(
      payload.layoutAlgorithm || payload.layoutPreset,
      state.snapshot.graph.layoutAlgorithm,
    );
    const layoutGraph = normalizeStandaloneGraphSnapshot(
      state.standaloneGraphLayouts.get(nextAlgorithm) || state.snapshot.graph,
    );
    const filters = {
      ...layoutGraph.filters,
      ...state.snapshot.graph.filters,
      topicId: state.snapshot.graph.filters.topicId,
      role: textValue(payload.role, state.snapshot.graph.filters.role),
      layoutAlgorithm: normalizeGraphLayoutAlgorithm(nextAlgorithm),
      nodeKinds: Array.isArray(payload.nodeKinds)
        ? (payload.nodeKinds
            .map((value) => textValue(value))
            .filter(Boolean) as GraphNodeKind[])
        : state.snapshot.graph.filters.nodeKinds,
      showLowSignalReferences:
        "showLowSignalReferences" in payload
          ? Boolean(payload.showLowSignalReferences)
          : state.snapshot.graph.filters.showLowSignalReferences,
    };
    const filtered = filterStandaloneGraph(layoutGraph, filters);
    state.snapshot = {
      ...state.snapshot,
      graph: {
        ...layoutGraph,
        filters,
        layoutAlgorithm: normalizeGraphLayoutAlgorithm(nextAlgorithm),
        visibleNodes: filtered.visibleNodes,
        visibleEdges: filtered.visibleEdges,
        selectedElement:
          selected === null
            ? undefined
            : selected && typeof selected === "object"
              ? (selected as Snapshot["graph"]["selectedElement"])
              : state.snapshot.graph.selectedElement,
      },
    };
    renderSelectedTabShell();
    return;
  }
  if (state.standaloneExport && action === "hostCommand") {
    return;
  }
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
      if (tab !== "graph") {
        state.graphReturnTopicId = undefined;
      }
      state.snapshot = {
        ...state.snapshot,
        selectedTab: tab,
      };
      if (state.standaloneExport) {
        renderSelectedTabShell();
        return;
      }
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
    case "applyCanonicalRevisionReviewAction":
      return `canonical-revision:${keyPart(args.reviewItemId || args.proposalId)}`;
    case "deleteConceptEntry":
      return `concept:${keyPart(Array.isArray(args.conceptIds) ? args.conceptIds.join("_") : args.conceptId)}`;
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

function normalizeStandaloneGraphSnapshot(graph: Snapshot["graph"]) {
  const layoutAlgorithm = normalizeGraphLayoutAlgorithm(graph.layoutAlgorithm);
  return {
    ...graph,
    layoutStatus: "ready" as const,
    layoutAlgorithm,
    filters: {
      ...graph.filters,
      layoutAlgorithm,
    },
    diagnostics: {
      ...(graph.diagnostics || {}),
      cache_status: "ready",
    },
  };
}

function operationKey(command: string, args: Record<string, unknown> = {}) {
  if (!command) return "";
  switch (command) {
    case "manualRecomputeLayout":
      return `${command}:${normalizeGraphLayoutAlgorithm(args.algorithm || args.preset)}`;
    case "applyConceptReviewAction":
      return `${command}:${keyPart(args.reviewId)}`;
    case "deleteConceptEntry":
      return `${command}:${keyPart(Array.isArray(args.conceptIds) ? args.conceptIds.join("_") : args.conceptId)}`;
    case "applyTopicGraphReviewAction":
      return `${command}:${keyPart(args.reviewId)}`;
    case "applyReferenceMatchProposalActions":
      return command;
    case "applyCanonicalRevisionReviewAction":
      return `${command}:${keyPart(args.reviewItemId || args.proposalId)}`;
    case "mergeEffectiveCanonicalReference":
      return `${command}:${keyPart(args.sourceEffectiveCanonicalId)}:${keyPart(args.targetEffectiveCanonicalId)}`;
    case "applyCanonicalRevisionMergeRequests":
      return command;
    case "updateCanonicalReferenceMetadata":
    case "archiveCanonicalReference":
      return `${command}:${keyPart(args.canonicalReferenceId)}`;
    case "acceptTopicGraphRelation":
    case "rejectTopicGraphRelation":
      return `decideTopicGraphRelation:${keyPart(args.edgeId)}`;
    case "applyTagVocabularyImport":
      return `${command}:${keyPart(args.action)}`;
    case "updateStagedTagSuggestion":
    case "updateTagVocabularyEntry":
    case "deleteTagVocabularyEntry":
      return `${command}:${keyPart(args.originalTag || args.tag)}`;
    case "promoteStagedTagSuggestions":
    case "discardStagedTagSuggestions":
      return `${command}:${keyPart(args.tag || (Array.isArray(args.tags) ? args.tags.join("_") : ""))}`;
    case "submitTopicSynthesisUpdate":
      return `${command}:${keyPart(args.topicId)}:${keyPart(args.language, "auto")}`;
    case "openTopicArtifact":
    case "exportTopicSynthesisReport":
    case "exportTopicDetailHtml":
    case "deleteTopicArtifact":
    case "resolveTopicPaperDigest":
      return `${command}:${keyPart(args.topicId)}`;
    default:
      return command;
  }
}

function operationLabel(command: string) {
  const key = `synthesis-operation-${command}` as SynthesisWorkbenchMessageKey;
  return key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES ? t(key) : command;
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
  if (
    state.canonicalMergeSubmission &&
    state.canonicalMergeSubmission.operationKey === completedKey
  ) {
    const completedSources = new Set(
      state.canonicalMergeSubmission.sourceEffectiveCanonicalIds,
    );
    for (const [key, request] of state.pendingCanonicalMergeRequests) {
      if (completedSources.has(request.sourceEffectiveCanonicalId)) {
        state.pendingCanonicalMergeRequests.delete(key);
      }
    }
    state.selectedCanonicalRowIds.clear();
    state.canonicalMergeSourceRowIds.clear();
    state.canonicalMergeSubmission = undefined;
  } else if (
    state.canonicalMergeSubmission &&
    state.canonicalMergeSubmission.operationKey === failedKey
  ) {
    state.canonicalMergeSubmission = undefined;
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
    node.textContent = uiText(text);
  }
  return node;
}

function elRawText<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
) {
  const node = el(tag, className);
  if (typeof text === "string") {
    node.textContent = text;
  }
  return node;
}

function iconEl(className: string) {
  const node = el("span", `zs-icon ${className}`);
  node.setAttribute("aria-hidden", "true");
  return node;
}

function clear(node: Element) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function badge(text: unknown, tone = "") {
  return el("span", `badge ${tone}`, maybeLocalizedValue(text) || "-");
}

function topicDiscoveryBadge(row: Record<string, unknown>) {
  const count = Number(row.candidate_count || 0);
  const candidateCount = Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : 0;
  const node =
    candidateCount > 0
      ? badge(
          t(
            candidateCount === 1
              ? "synthesis-discovery-candidate"
              : "synthesis-discovery-candidates",
            { count: candidateCount },
          ),
          candidateCount < 5 ? "orange" : "danger",
        )
      : badge(t("synthesis-discovery-none"), "ok");
  node.classList.add("topic-discovery-badge");
  return node;
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
  empty.appendChild(el("strong", "empty-state-title", uiText(title)));
  if (message) {
    empty.appendChild(el("p", "empty-state-message", uiText(message)));
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
    row.appendChild(el("span", "muted", uiText(label)));
    row.appendChild(
      el("strong", "", maybeLocalizedValue(value) || textValue(value, "-")),
    );
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
    uiText(label),
  );
  button.type = "button";
  button.disabled = disabled || pending;
  if (pending) {
    button.setAttribute("aria-busy", "true");
    button.title = t("synthesis-operation-in-progress", {
      operation: operationLabel(hostCommand),
    });
    const spinner = el("span", "button-spinner");
    spinner.setAttribute("aria-hidden", "true");
    button.prepend(spinner);
  }
  button.addEventListener("click", () => sendAction(action, payload));
  return button;
}

function makeLocalButton(
  label: string,
  onClick: (event: MouseEvent) => void,
  active = false,
) {
  const button = el("button", active ? "active" : "", uiText(label));
  button.type = "button";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    onClick(event as MouseEvent);
  });
  return button;
}

function titleForTab(tab: Snapshot["selectedTab"]) {
  if (tab === "reader") {
    return (
      state.topicDetail?.title ||
      state.artifactReader?.title ||
      t("synthesis-tab-topic-detail")
    );
  }
  if (tab === "artifacts") return t("synthesis-tab-topics");
  if (tab === "registry") return t("synthesis-tab-index");
  if (tab === "tags") return t("synthesis-tab-tags");
  if (tab === "concepts") return t("synthesis-tab-concepts");
  if (tab === "graph") return t("synthesis-tab-citation-graph");
  if (tab === "reviews") return t("synthesis-tab-review");
  return t("synthesis-tab-home");
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

function normalizeSurfaceRequestId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function surfacePayloadRequestId(payload: Record<string, unknown>) {
  const direct = normalizeSurfaceRequestId(payload.requestId);
  if (direct !== undefined) {
    return direct;
  }
  const request =
    payload.request && typeof payload.request === "object"
      ? (payload.request as Record<string, unknown>)
      : null;
  return normalizeSurfaceRequestId(request?.requestId);
}

function isStaleSurfacePayload(
  surface: WorkbenchSurfaceName,
  requestId?: number,
) {
  if (requestId === undefined) {
    return false;
  }
  return requestId < (state.acceptedSurfaceRequestIds[surface] || 0);
}

function acceptSurfacePayload(
  surface: WorkbenchSurfaceName,
  requestId?: number,
) {
  if (requestId === undefined) {
    return;
  }
  state.acceptedSurfaceRequestIds[surface] = Math.max(
    state.acceptedSurfaceRequestIds[surface] || 0,
    requestId,
  );
}

function markSurfaceRuntime(
  surface: WorkbenchSurfaceName,
  status: WorkbenchSurfaceRuntime["status"],
  error?: string,
  snapshot?: Snapshot,
  details: {
    errorCode?: string;
    transient?: boolean;
    requestId?: number;
  } = {},
) {
  const key = surfaceRuntimeKey(surface, snapshot || state.snapshot);
  const previous = state.surfaces[key];
  state.surfaces[key] = {
    status,
    revision: (previous?.revision || 0) + 1,
    error,
    errorCode: details.errorCode,
    transient: details.transient,
    requestId: details.requestId ?? previous?.requestId,
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

function restoreSurfaceSnapshotForError(surface: WorkbenchSurfaceName) {
  const cached = surfaceRuntime(surface)?.snapshot;
  if (!cached) {
    return false;
  }
  if (!state.snapshot) {
    state.snapshot = cached;
    return true;
  }
  if (surfaceForTab(state.snapshot.selectedTab) !== surface) {
    return false;
  }
  return restoreCachedSurfaceSnapshot(surface, state.snapshot.selectedTab);
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

function backgroundJobStatusbarOperation(
  job: BackgroundJobRow | undefined,
): ActionOperation | undefined {
  if (!job) {
    return undefined;
  }
  return {
    key: `background:${job.job_id}`,
    command: job.command || job.source || "backgroundJob",
    status: "failed",
    label: job.label,
    started_at: job.updated_at,
    completed_at: job.updated_at,
    message: job.detail,
  };
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
  const failedJobEntry = backgroundJobStatusbarOperation(failedJob);
  const showFailedJob = shouldShowTimedStatusbarEntry(
    failedJobEntry,
    STATUSBAR_FAILED_TIMEOUT_MS,
    "failed",
  );
  const statusbarJobs = activeJobs.length || showFailedJob ? jobs : activeJobs;
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

  const appendJobButton = (buttonJobs: BackgroundJobRow[] = statusbarJobs) => {
    const button = el("button", "action-statusbar-job-button");
    button.type = "button";
    button.title = t("synthesis-jobs-show");
    button.setAttribute("aria-label", t("synthesis-jobs-show"));
    button.setAttribute(
      "aria-expanded",
      state.jobPopoverOpen ? "true" : "false",
    );
    button.appendChild(
      iconEl(
        "zs-icon-sm action-statusbar-job-icon zs-icon-format-list-bulleted",
      ),
    );
    const count = buttonJobs.length;
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
      wrap.appendChild(renderBackgroundJobPopover(buttonJobs));
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
        latest.status === "running"
          ? t("synthesis-status-running")
          : t("synthesis-status-queued"),
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
    if (statusbarJobs.length || state.jobPopoverOpen) appendJobButton();
    return statusbar;
  }

  if (failedJob && showFailedJob) {
    statusbar.className = "action-statusbar is-danger";
    statusbar.appendChild(
      el("span", "action-statusbar-state", t("synthesis-status-failed")),
    );
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
    statusbar.appendChild(
      el("span", "action-statusbar-state", t("synthesis-status-failed")),
    );
    statusbar.appendChild(
      el("span", "action-statusbar-message", statusbarMessage(failed!)),
    );
    if (statusbarJobs.length) appendJobButton();
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
    statusbar.appendChild(
      el("span", "action-statusbar-state", t("synthesis-status-warning")),
    );
    statusbar.appendChild(
      el("span", "action-statusbar-message", statusbarMessage(latestWarning!)),
    );
    if (statusbarJobs.length) appendJobButton();
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
    statusbar.appendChild(
      el("span", "action-statusbar-state", t("synthesis-status-completed")),
    );
    statusbar.appendChild(
      el("span", "action-statusbar-message", statusbarMessage(completed!)),
    );
    if (statusbarJobs.length) appendJobButton();
    return statusbar;
  }

  statusbar.appendChild(
    el("span", "action-statusbar-state", t("synthesis-status-ready")),
  );
  if (statusbarJobs.length || state.jobPopoverOpen) {
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
  logo.alt = t("synthesis-brand-alt");
  brand.appendChild(logo);
  const sidebarToggle = el("button", "sidebar-collapse-toggle icon-only");
  sidebarToggle.type = "button";
  sidebarToggle.title = state.sidebarExpanded
    ? t("synthesis-nav-collapse")
    : t("synthesis-nav-expand");
  sidebarToggle.setAttribute("aria-label", sidebarToggle.title);
  sidebarToggle.setAttribute(
    "aria-expanded",
    state.sidebarExpanded ? "true" : "false",
  );
  sidebarToggle.appendChild(
    iconEl(
      state.sidebarExpanded
        ? "zs-icon-right-panel-open"
        : "zs-icon-right-panel-close",
    ),
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
    t("synthesis-library-label", { libraryId: snapshot.libraryId }),
  );
  sidebar.appendChild(libraryLabel);
  const nav = el("div", "nav");
  [
    ["overview", t("synthesis-tab-home"), "home"],
    ["artifacts", t("synthesis-tab-topics"), "topics"],
    ["concepts", t("synthesis-tab-concepts"), "concepts"],
    ["graph", t("synthesis-tab-graph"), "graph"],
    ["registry", t("synthesis-tab-index"), "index"],
    ["tags", t("synthesis-tab-tags"), "tags"],
    ["reviews", t("synthesis-tab-review"), "review"],
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
    const iconClasses: Record<string, string> = {
      home: "zs-icon-home",
      topics: "zs-icon-topic",
      concepts: "zs-icon-lightbulb",
      graph: "zs-icon-hub",
      index: "zs-icon-manage-search",
      tags: "zs-icon-sell",
      review: "zs-icon-fact-check",
    };
    icon.appendChild(iconEl(iconClasses[String(iconName)] || "zs-icon-hub"));
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

function renderStandaloneTopicExportShell(
  root: HTMLElement,
  snapshot: Snapshot,
) {
  clear(root);
  root.classList.remove("sidebar-expanded", "sidebar-collapsed");
  root.classList.add("standalone-topic-export-root");
  const content = el("div", "content standalone-topic-export-content");
  const header = el("div", "topbar standalone-topic-export-header");
  header.appendChild(
    el("h1", "", state.topicDetail?.title || titleForTab("reader")),
  );
  content.appendChild(header);
  const main = el("section", "main standalone-topic-export-main");
  main.dataset.synthesisSurface = "reader";
  renderTopicDetail(main, snapshot);
  content.appendChild(main);
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
  const renderState = captureWorkbenchRenderState(root);
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
  if (state.standaloneExport) {
    renderStandaloneTopicExportShell(root, state.snapshot);
    restoreWorkbenchRenderState(root, renderState);
    localizeWorkbenchDom(root);
    state.lastContentSignature = "";
    return;
  }
  const runtime = surfaceRuntime(surface);
  if (
    runtime?.status === "ready" ||
    (runtime?.status === "failed" && runtime.snapshot)
  ) {
    renderCurrentView(main, state.snapshot);
    maybeRequestGraphLayoutRefresh(state.snapshot);
  } else {
    main.appendChild(renderSurfaceLoading(surface));
  }
  localizeWorkbenchDom(root);
  state.lastContentSignature = "";
}

function renderSurfaceLoading(surface: WorkbenchSurfaceName) {
  const runtime = surfaceRuntime(surface);
  const wrap = el("div", "surface-loading");
  wrap.dataset.synthesisSurface = `${surface}-loading`;
  if (runtime?.status !== "failed") {
    wrap.appendChild(el("div", "loading-spinner"));
  }
  wrap.appendChild(
    el(
      "div",
      "loading-title",
      runtime?.status === "failed"
        ? t("synthesis-surface-error-label")
        : t("synthesis-surface-loading-title", {
            surface: surfaceLabel(surface),
          }),
    ),
  );
  wrap.appendChild(
    el(
      "div",
      "loading-subtitle",
      runtime?.status === "failed"
        ? runtime.error || t("synthesis-surface-error-message")
        : t("synthesis-surface-loading-subtitle"),
    ),
  );
  return wrap;
}

function surfaceLabel(surface: WorkbenchSurfaceName) {
  if (surface === "home") return t("synthesis-tab-home");
  if (surface === "topics") return t("synthesis-tab-topics");
  if (surface === "index") return t("synthesis-tab-index");
  if (surface === "review") return t("synthesis-tab-review");
  if (surface === "graph") return t("synthesis-tab-citation-graph");
  if (surface === "tags") return t("synthesis-tab-tags");
  if (surface === "concepts") return t("synthesis-tab-concepts");
  if (surface === "reader") return t("synthesis-tab-reader");
  return t("synthesis-page-title");
}

function isWorkbenchSurfaceName(value: unknown): value is WorkbenchSurfaceName {
  return (
    value === "home" ||
    value === "topics" ||
    value === "index" ||
    value === "review" ||
    value === "graph" ||
    value === "tags" ||
    value === "concepts" ||
    value === "reader"
  );
}

function renderWorkbenchChrome() {
  const root = document.getElementById("app") as HTMLElement | null;
  if (!root || !state.snapshot) {
    return;
  }
  const existingStatusbar = root.querySelector(".action-statusbar");
  if (existingStatusbar) {
    existingStatusbar.replaceWith(renderActionStatusbar(state.snapshot));
    localizeWorkbenchDom(root);
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
  localizeWorkbenchDom(root);
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
  const diagnostic = renderSurfaceRefreshDiagnostic(
    surfaceForTab(snapshot.selectedTab),
  );
  if (diagnostic) {
    main.appendChild(diagnostic);
  }
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

function renderSurfaceRefreshDiagnostic(surface: WorkbenchSurfaceName) {
  const runtime = surfaceRuntime(surface);
  if (runtime?.status !== "failed" || !runtime.snapshot) {
    return null;
  }
  const wrap = el(
    "div",
    `surface-refresh-diagnostic${runtime.transient ? " is-transient" : ""}`,
  );
  wrap.dataset.synthesisSurfaceDiagnostic = surface;
  wrap.appendChild(
    el(
      "strong",
      "",
      runtime.transient
        ? t("synthesis-surface-refreshing-label")
        : t("synthesis-surface-error-label"),
    ),
  );
  wrap.appendChild(
    el("span", "", runtime.error || t("synthesis-surface-error-message")),
  );
  return wrap;
}

function topicPaperCount(row: Record<string, unknown>) {
  const value = Number(row.paper_count || 0);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function topicSourceMaterialsPercent(row: Record<string, unknown>) {
  const value = Number(row.source_materials_percent || 0);
  return Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.floor(value)))
    : 0;
}

function topicSourceMaterialsStatus(row: Record<string, unknown>) {
  const status = textValue(row.source_materials_status, "missing");
  return status === "complete" || status === "partial" || status === "missing"
    ? status
    : "missing";
}

function sourceMaterialsLabel(row: Record<string, unknown>) {
  const status = topicSourceMaterialsStatus(row);
  const percent = topicSourceMaterialsPercent(row);
  if (status === "complete") {
    return t("synthesis-source-materials-ready");
  }
  if (status === "missing") {
    return t("synthesis-source-materials-missing");
  }
  return t("synthesis-source-materials-percent-ready", { percent });
}

function sourceMaterialsTone(row: Record<string, unknown>) {
  const status = topicSourceMaterialsStatus(row);
  const percent = topicSourceMaterialsPercent(row);
  if (status === "complete" && percent >= 100) {
    return "ok";
  }
  if (percent >= 50) {
    return "warn";
  }
  return "danger";
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

function openReviewCount(rows: Array<Record<string, unknown>> | undefined) {
  return (rows || []).filter((row) => textValue(row.status) === "open").length;
}

function reviewSummaryForHome(snapshot: Snapshot) {
  const summary = snapshot.reviews?.summary || {};
  const indexFallback =
    openReviewCount(snapshot.registry.cleanupProposals) +
    openReviewCount(snapshot.registry.matchProposals);
  const conceptFallback = openReviewCount(snapshot.concepts.reviewItems);
  const topicGraphFallback = openReviewCount(snapshot.topicGraph.reviewItems);
  const indexCount = Math.max(Number(summary.indexCount || 0), indexFallback);
  const conceptCount = Math.max(
    Number(summary.conceptCount || 0),
    conceptFallback,
  );
  const topicGraphCount = Math.max(
    Number(summary.topicGraphCount || 0),
    topicGraphFallback,
  );
  return {
    openCount: Math.max(
      Number(summary.openCount || 0),
      indexCount + conceptCount + topicGraphCount,
    ),
    indexCount,
    conceptCount,
    topicGraphCount,
  };
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
  const definition = String(row.definition || "").trim();
  const summary = String(
    definition || row.summary || row.markdown_preview || "",
  ).trim();
  const count = topicPaperCount(row);
  const sourceMaterialsPercent = topicSourceMaterialsPercent(row);
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
  fill.style.width = `${sourceMaterialsPercent}%`;
  meter.appendChild(fill);
  card.appendChild(meter);
  const meta = el("div", "topic-card-meta");
  meta.appendChild(el("span", "", `${count} papers`));
  meta.appendChild(el("span", "", sourceMaterialsLabel(row)));
  meta.appendChild(topicDiscoveryBadge(row));
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
    "Update",
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
  const reviewSummary = reviewSummaryForHome(snapshot);
  grid.appendChild(
    renderInsightCard(
      t("synthesis-home-review-items"),
      reviewSummary.openCount,
      t("synthesis-home-review-items-detail", {
        index: reviewSummary.indexCount,
        concepts: reviewSummary.conceptCount,
        topicGraph: reviewSummary.topicGraphCount,
      }),
      reviewSummary.openCount ? "orange" : "",
    ),
  );
  insights.appendChild(grid);
  shell.appendChild(insights);
  shell.appendChild(renderSyncPanel(snapshot));

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

function renderSyncPanel(snapshot: Snapshot) {
  const section = el("section", "workspace-section");
  section.classList.add("sync-panel");
  const header = el("div", "section-heading");
  header.appendChild(el("h2", "", t("synthesis-home-sync")));
  section.appendChild(header);
  const webdav = snapshot.sync?.webdav || {};
  const webDavSyncNowPending = isOperationPending("syncWebDavNow", {});
  const webDavRetryPending = isOperationPending("retryWebDavSync", {});
  const webDavSyncPending = webDavSyncNowPending || webDavRetryPending;
  const summary = el("div", "sync-summary");
  const appendSummaryItem = (label: string, value: string, detail = "") => {
    const item = el("div", "sync-summary-item");
    item.appendChild(el("span", "sync-summary-label", label));
    item.appendChild(el("strong", "sync-summary-value", value));
    if (detail) {
      item.appendChild(el("span", "sync-summary-detail", detail));
    }
    summary.appendChild(item);
  };
  appendSummaryItem(
    t("synthesis-sync-webdav-exchange"),
    textValue(webdav.queue_state, "disabled"),
    webdav.config_status
      ? t("synthesis-sync-config", { status: webdav.config_status })
      : webdav.paused
        ? t("synthesis-sync-paused")
        : t("synthesis-sync-webdav-exchange-detail"),
  );
  appendSummaryItem(
    t("synthesis-sync-remote"),
    textValue(webdav.remote_path) || t("synthesis-sync-not-configured"),
    textValue(webdav.base_url) || t("synthesis-sync-remote-detail"),
  );
  section.appendChild(summary);
  const webDavActions = el("div", "toolbar");
  const webDavAllowed = new Set(webdav.allowedActions || []);
  if (!webdav.adapter_configured) {
    webDavActions.appendChild(
      makeButton(t("synthesis-action-open-preferences"), "hostCommand", {
        command: "openPreferences",
      }),
    );
  } else {
    webDavActions.appendChild(
      makeButton(
        t("synthesis-action-webdav-sync-now"),
        "hostCommand",
        { command: "syncWebDavNow" },
        false,
        !webDavAllowed.has("syncWebDavNow"),
      ),
    );
    webDavActions.appendChild(
      makeButton(
        webdav.paused
          ? t("synthesis-action-resume-webdav-sync")
          : t("synthesis-action-pause-webdav-sync"),
        "hostCommand",
        { command: webdav.paused ? "resumeWebDavSync" : "pauseWebDavSync" },
        false,
        webdav.paused
          ? !webDavAllowed.has("resumeWebDavSync")
          : !webDavAllowed.has("pauseWebDavSync"),
      ),
    );
    webDavActions.appendChild(
      makeButton(
        t("synthesis-action-retry-webdav-sync"),
        "hostCommand",
        { command: "retryWebDavSync" },
        false,
        !webDavAllowed.has("retryWebDavSync"),
      ),
    );
  }
  section.appendChild(webDavActions);
  section.appendChild(
    renderSyncFeedbackLog(snapshot, webdav, webDavSyncPending),
  );
  appendSyncConflictPanel(section, webdav, webDavAllowed);
  return section;
}

function renderSyncFeedbackLog(
  snapshot: Snapshot,
  webdav: SyncTransportSnapshot,
  webDavSyncPending: boolean,
) {
  const log = el("div", "sync-feedback-terminal");
  const appendLine = (
    level: "info" | "ok" | "warn" | "error",
    source: string,
    message: string,
  ) => {
    const line = el("div", `sync-log-line sync-log-level-${level}`);
    line.appendChild(el("span", "sync-log-source", source));
    line.appendChild(el("span", "sync-log-message", message));
    log.appendChild(line);
  };

  const syncOperations = [
    "syncWebDavNow",
    "retryWebDavSync",
    "pauseWebDavSync",
    "resumeWebDavSync",
    "resolveWebDavSyncConflict",
  ];
  (snapshot.actions?.inFlight || [])
    .filter((entry) => syncOperations.includes(entry.command || ""))
    .forEach((entry) =>
      appendLine(
        "info",
        t("synthesis-sync-log-pending"),
        `${entry.label || entry.command} ${t("synthesis-sync-log-running")}`,
      ),
    );
  if (webDavSyncPending && !(snapshot.actions?.inFlight || []).length) {
    appendLine(
      "info",
      t("synthesis-sync-log-pending"),
      t("synthesis-sync-log-webdav-running"),
    );
  }
  const lastFailed = snapshot.actions?.lastFailed;
  if (lastFailed && syncOperations.includes(lastFailed.command || "")) {
    appendLine(
      "error",
      t("synthesis-sync-log-failed"),
      `${lastFailed.label || lastFailed.command}: ${
        lastFailed.message || t("synthesis-sync-log-failed")
      }`,
    );
  }
  const lastCompleted = snapshot.actions?.lastCompleted;
  if (lastCompleted && syncOperations.includes(lastCompleted.command || "")) {
    appendLine(
      "ok",
      t("synthesis-sync-log-completed"),
      `${lastCompleted.label || lastCompleted.command} ${t(
        "synthesis-sync-log-completed",
      )}`,
    );
  }

  const diagnostics = [
    ...(snapshot.sync?.diagnostics || []),
    ...(webdav.diagnostics || []),
  ];
  diagnostics.slice(0, 6).forEach((entry) => {
    appendLine(
      entry.severity === "error"
        ? "error"
        : entry.severity === "warning"
          ? "warn"
          : "info",
      t("synthesis-sync-log-diagnostic"),
      `${textValue(entry.code)}: ${textValue(entry.message)}`,
    );
  });

  const connectionDiagnostics = webdav.connection_test?.diagnostics || [];
  if (webdav.connection_test || connectionDiagnostics.length) {
    appendLine(
      webdav.connection_test?.ok ? "ok" : "warn",
      t("synthesis-sync-log-connection"),
      `${webdav.connection_test?.ok ? t("synthesis-sync-log-ready") : t("synthesis-sync-log-not-ready")} ${
        webdav.connection_test?.tested_at || ""
      }`.trim(),
    );
    connectionDiagnostics
      .slice(0, 3)
      .forEach((entry) =>
        appendLine(
          entry.severity === "error" ? "error" : "warn",
          t("synthesis-sync-log-connection"),
          `${textValue(entry.code)}: ${textValue(entry.message)}`,
        ),
      );
  }

  if (webdav.last_run_status || webdav.last_run_at) {
    appendLine(
      webdav.last_run_status?.startsWith("failed") ? "error" : "info",
      t("synthesis-sync-log-last-run"),
      `${
        webdav.last_run_status || t("synthesis-sync-log-unknown")
      } ${webdav.last_run_at || ""}`.trim(),
    );
  }
  if (!log.childElementCount) {
    appendLine(
      "info",
      t("synthesis-home-sync"),
      t("synthesis-sync-log-no-activity"),
    );
  }
  return log;
}

function appendSyncConflictPanel(
  section: HTMLElement,
  state: SyncTransportSnapshot,
  actionSet: Set<string>,
) {
  if (
    state.queue_state !== "blocked_conflict" ||
    !state.conflict_assets?.length
  ) {
    return;
  }
  const asset = state.conflict_assets[0];
  const conflictActions = new Set(state.conflictActions || []);
  const command = "resolveWebDavSyncConflict";
  const conflictButton = (label: string, action: string) =>
    makeButton(
      label,
      "hostCommand",
      {
        command,
        args: { action },
      },
      false,
      !actionSet.has(command) || !conflictActions.has(action),
    );
  section.appendChild(
    renderReviewPanel(
      renderReviewCard({
        kind: t("synthesis-sync-review"),
        title: textValue(asset.asset_path, t("synthesis-sync-conflict-title")),
        meta:
          state.conflict_assets.length > 1
            ? t("synthesis-sync-more-assets", {
                count: String(state.conflict_assets.length - 1),
              })
            : t("synthesis-sync-one-asset"),
        body: t("synthesis-sync-conflict-body-webdav"),
        details: [
          [t("synthesis-field-reason"), asset.reason || "both_changed"],
          ["base", asset.base_hash || "-"],
          ["local", asset.local_hash || "-"],
          ["remote", asset.remote_hash || "-"],
          [t("synthesis-field-queue-state"), state.queue_state],
          [
            t("synthesis-field-remote"),
            state.base_url || t("synthesis-field-not-configured"),
          ],
          [t("synthesis-field-remote-path"), state.remote_path || "-"],
        ],
        actions: [
          conflictButton(t("synthesis-action-keep-local"), "keep_local"),
          conflictButton(
            t("synthesis-action-save-remote-copy"),
            "save_remote_copy",
          ),
          conflictButton(
            t("synthesis-action-recheck-sync"),
            "clear_after_manual_edit",
          ),
          conflictButton(t("synthesis-action-use-remote"), "use_remote"),
          conflictButton(
            t("synthesis-action-needs-attention"),
            "mark_needs_attention",
          ),
        ],
      }),
      "sync-review-panel",
    ),
  );
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
          { label: "Title", className: "topics-list-title-cell" },
          { label: "Definition", className: "topics-list-definition-column" },
          { label: "Papers", className: "topics-list-center-cell" },
          {
            label: t("synthesis-column-source-materials"),
            className: "topics-list-center-cell",
          },
          { label: "Freshness", className: "topics-list-center-cell" },
          {
            label: t("synthesis-column-discovery"),
            className: "topics-list-center-cell",
          },
          { label: "Updated", className: "topics-list-center-cell" },
          "Action",
        ],
        snapshot.artifacts.visibleRows,
        (row) => [
          el(
            "span",
            "topics-list-title-text",
            String(row.title || row.id || "-"),
          ),
          el(
            "span",
            "topics-list-definition-cell",
            String(row.definition || "-"),
          ),
          topicPaperCount(row),
          badge(sourceMaterialsLabel(row), sourceMaterialsTone(row)),
          badge(row.freshness, toneFor(row.freshness)),
          topicDiscoveryBadge(row),
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
      t("synthesis-deleted-artifacts-waiting", {
        count: snapshot.deletedArtifacts.count,
      }),
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
    badge(
      t("synthesis-topic-count", {
        count: snapshot.topicGraph.visibleNodes.length,
      }),
      "ok",
    ),
  );
  summary.appendChild(
    badge(
      t("synthesis-relation-count", {
        count: snapshot.topicGraph.visibleEdges.length,
      }),
      "warn",
    ),
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
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("orient", "auto");
  const arrow = createSvgElement("path");
  arrow.setAttribute("d", "M0,0 L10,5 L0,10 Z");
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
    ["broader_than", t("synthesis-topic-graph-legend-hierarchy")],
    ["related_to", t("synthesis-topic-graph-legend-related")],
    ["overlaps_with", t("synthesis-topic-graph-legend-overlap")],
    ["contrasts_with", t("synthesis-topic-graph-legend-contrast")],
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
    t("synthesis-topic-paper-count", {
      count: numberValue(node.paper_count, 0),
    }),
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
  const definition = firstText(topic, [
    "definition",
    "short_definition",
    "summary",
  ]);
  if (definition) {
    inspector.appendChild(el("p", "muted topic-definition", definition));
  }
  if (textValue(topic.node_type) === "materialized") {
    inspector.appendChild(
      actionGroup([
        makeButton("Open details", "hostCommand", {
          command: "openTopicArtifact",
          args: { topicId: textValue(topic.topic_id) },
        }),
      ]),
    );
  }
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

function humanizeReviewLabel(value: unknown, fallback = "-") {
  const normalized = textValue(value, fallback);
  return maybeLocalizedValue(normalized) || humanizeEnumValue(normalized);
}

function wrapReviewIndex(index: number, total: number) {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

function renderLocalReviewPanelHeader(args: {
  title: string;
  state: LocalReviewPanelState;
  total: number;
  onChange: () => void;
}) {
  const header = el("div", "review-drawer-header inline-review-header");
  header.appendChild(el("strong", "", args.title));
  header.appendChild(
    el(
      "span",
      "muted",
      args.total
        ? `${wrapReviewIndex(args.state.index, args.total) + 1} / ${args.total}`
        : "0 open",
    ),
  );
  const controls = el("div", "review-drawer-controls");
  const previous = makeLocalButton("↑", () => {
    args.state.index = wrapReviewIndex(args.state.index - 1, args.total);
    args.onChange();
  });
  previous.disabled = args.total <= 1;
  controls.appendChild(previous);
  const next = makeLocalButton("↓", () => {
    args.state.index = wrapReviewIndex(args.state.index + 1, args.total);
    args.onChange();
  });
  next.disabled = args.total <= 1;
  controls.appendChild(next);
  controls.appendChild(
    makeLocalButton(args.state.collapsed ? "Expand" : "Collapse", () => {
      args.state.collapsed = !args.state.collapsed;
      args.onChange();
    }),
  );
  header.appendChild(controls);
  return header;
}

function renderTopicRelationBlock(args: {
  sourceTitle: string;
  relation: string;
  targetTitle: string;
}) {
  const block = el("div", "topic-relation-review-block");
  const source = el("div", "topic-relation-review-node");
  source.appendChild(el("strong", "", args.sourceTitle));
  block.appendChild(source);
  block.appendChild(renderTopicRelationArrow());
  const relation = el("div", "topic-relation-review-relation");
  relation.appendChild(el("strong", "", humanizeReviewLabel(args.relation)));
  block.appendChild(relation);
  block.appendChild(renderTopicRelationArrow());
  const target = el("div", "topic-relation-review-node");
  target.appendChild(el("strong", "", args.targetTitle));
  block.appendChild(target);
  return block;
}

function renderTopicRelationArrow() {
  const arrow = el("div", "topic-relation-review-arrow");
  arrow.setAttribute("aria-hidden", "true");
  arrow.appendChild(el("span", "topic-relation-review-arrow-icon"));
  return arrow;
}

function renderTopicGraphReviewPanel(snapshot: Snapshot) {
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
  const queue = [
    ...suggestions.map((relation) => {
      const sourceId = textValue(relation.source_topic_id);
      const targetId = textValue(relation.target_topic_id);
      return {
        kind: "suggestion",
        title: "Suggested relation",
        sourceTitle:
          textValue(nodesById.get(sourceId)?.title) ||
          textValue(sourceId, "Source topic"),
        targetTitle:
          textValue(nodesById.get(targetId)?.title) ||
          textValue(targetId, "Target topic"),
        relation: textValue(relation.relation),
        confidence: relation.confidence,
        evidence: relation.evidence_refs,
        provenance: relation.provenance,
        diagnostics: undefined,
        status: relation.status || "suggested",
        body: undefined,
        actions: [
          makeButton("Accept", "hostCommand", {
            command: "acceptTopicGraphRelation",
            args: { edgeId: textValue(relation.edge_id) },
          }),
          makeButton("Reject", "hostCommand", {
            command: "rejectTopicGraphRelation",
            args: { edgeId: textValue(relation.edge_id) },
          }),
        ],
      };
    }),
    ...relationReviews.map((item) => {
      const sourceId = textValue(item.source_topic_id);
      const targetId = textValue(item.target_topic_id);
      return {
        kind: "review",
        title: "Relation review",
        sourceTitle:
          textValue(nodesById.get(sourceId)?.title) ||
          textValue(sourceId, "Source topic"),
        targetTitle:
          textValue(item.target_title) ||
          textValue(nodesById.get(targetId)?.title) ||
          textValue(targetId, "Target topic"),
        relation: textValue(item.relation || item.proposal_type),
        confidence: item.confidence,
        evidence: item.evidence_refs || item.evidence,
        provenance: item.provenance,
        diagnostics: item.diagnostics,
        status: item.status || "open",
        body:
          textValue(item.reason) ||
          "Review whether this low-confidence relation proposal should become a suggested topic graph edge.",
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
      };
    }),
  ];
  if (!queue.length) {
    return null;
  }
  state.topicGraphReviewPanel.index = wrapReviewIndex(
    state.topicGraphReviewPanel.index,
    queue.length,
  );
  const selected = queue[state.topicGraphReviewPanel.index];
  const panel = renderReviewPanel(
    renderLocalReviewPanelHeader({
      title: "Topic relation review",
      state: state.topicGraphReviewPanel,
      total: queue.length,
      onChange: render,
    }),
    "topic-review-panel inline-review-panel",
  );
  if (state.topicGraphReviewPanel.collapsed) {
    panel.classList.add("is-collapsed");
    return panel;
  }
  const card = el("article", "review-card topic-relation-review-card");
  card.appendChild(
    renderTopicRelationBlock({
      sourceTitle: selected.sourceTitle,
      relation: selected.relation,
      targetTitle: selected.targetTitle,
    }),
  );
  if (selected.body) {
    card.appendChild(el("p", "review-card-body", selected.body));
  }
  const metadata = renderReviewMetadata([
    ["status", selected.status],
    ["confidence", selected.confidence],
    ["evidence", selected.evidence],
    ["provenance", selected.provenance],
  ]);
  if (metadata) {
    card.appendChild(metadata);
  }
  if (selected.actions.length) {
    card.appendChild(actionGroup(selected.actions));
  }
  panel.appendChild(card);
  return panel;
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

function renderReviewMetadata(fields: Array<[string, unknown]>) {
  const details = fields.filter(([, value]) => hasStructuredContent(value));
  if (!details.length) {
    return undefined;
  }
  const list = el("div", "review-card-details review-card-metadata");
  details.forEach(([label, value]) => {
    const row = el("div", "detail-row");
    row.appendChild(el("span", "muted", uiText(label)));
    row.appendChild(el("strong", "", compactReviewValue(value)));
    list.appendChild(row);
  });
  return list;
}

function renderReviewCard(options: ReviewCardOptions) {
  const card = el("article", "review-card");
  const header = el("div", "review-card-header");
  const title = el("div", "review-card-title");
  if (options.showKindBadge !== false) {
    title.appendChild(badge(options.kind, options.tone || "warn"));
  }
  title.appendChild(el("strong", "", uiText(options.title)));
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
    card.appendChild(el("p", "review-card-body", uiText(options.body)));
  }
  (options.primaryChildren || []).forEach((child) => card.appendChild(child));
  const metadata = renderReviewMetadata(options.details || []);
  if (metadata) {
    card.appendChild(metadata);
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
        return maybeLocalizedValue(entry) || textValue(entry);
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
    html: true,
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

const CONCEPT_OVERLAY_SKIP_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "code",
  "pre",
  "kbd",
  "samp",
  "script",
  "style",
  ".katex",
  ".math",
  ".badge",
  ".chip",
  ".toolbar",
  ".filters",
  ".topic-detail-tabs",
  ".topic-report-outline",
  ".topic-report-concept-nav",
  ".concept-mention",
  ".concept-bubble",
].join(", ");

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
    if (parent?.closest(CONCEPT_OVERLAY_SKIP_SELECTOR)) {
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
      const link = elRawText("span", "concept-mention", match);
      link.tabIndex = 0;
      link.setAttribute("data-concept-id", textValue(entry.concept_id));
      link.setAttribute(
        "aria-label",
        t("synthesis-concept-preview-label", {
          label: textValue(entry.label || entry.alias),
        }),
      );
      const openBubble = () => {
        showConceptBubble(link, entry);
      };
      link.addEventListener("mouseenter", openBubble);
      link.addEventListener("focus", openBubble);
      link.addEventListener("mouseleave", scheduleConceptBubbleClose);
      link.addEventListener("blur", scheduleConceptBubbleClose);
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

function cancelConceptBubbleClose() {
  if (conceptBubbleCloseTimer !== undefined) {
    window.clearTimeout(conceptBubbleCloseTimer);
    conceptBubbleCloseTimer = undefined;
  }
}

function scheduleConceptBubbleClose() {
  cancelConceptBubbleClose();
  conceptBubbleCloseTimer = window.setTimeout(() => {
    closeConceptBubble();
  }, 120);
}

function closeConceptBubble() {
  cancelConceptBubbleClose();
  conceptBubbleCleanup?.();
  conceptBubbleCleanup = undefined;
  document
    .querySelectorAll(".concept-bubble")
    .forEach((node: Element) => node.remove());
}

function showConceptBubble(
  anchor: HTMLElement,
  entry: Record<string, unknown>,
) {
  closeConceptBubble();
  const bubble = el("div", "concept-bubble");
  bubble.setAttribute("role", "dialog");
  bubble.setAttribute("aria-label", t("synthesis-concept-preview"));
  bubble.appendChild(
    elRawText("strong", "", textValue(entry.label || entry.alias)),
  );
  const alias = textValue(entry.alias);
  const confidence = textValue(entry.confidence);
  if (alias || confidence) {
    const meta = el("div", "concept-bubble-meta");
    if (alias) meta.appendChild(elRawText("span", "badge blue", alias));
    if (confidence) meta.appendChild(badge(confidence, toneFor(confidence)));
    bubble.appendChild(meta);
  }
  bubble.appendChild(
    elRawText(
      "p",
      "muted",
      textValue(
        entry.short_definition || entry.definition,
        t("synthesis-concept-no-definition"),
      ),
    ),
  );
  const rect = anchor.getBoundingClientRect();
  bubble.style.position = "fixed";
  bubble.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 260))}px`;
  bubble.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 160)}px`;
  document.body?.appendChild(bubble);
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeConceptBubble();
    }
  };
  bubble.addEventListener("mouseenter", cancelConceptBubbleClose);
  bubble.addEventListener("mouseleave", scheduleConceptBubbleClose);
  document.addEventListener("keydown", handleKeyDown);
  conceptBubbleCleanup = () => {
    bubble.removeEventListener("mouseenter", cancelConceptBubbleClose);
    bubble.removeEventListener("mouseleave", scheduleConceptBubbleClose);
    document.removeEventListener("keydown", handleKeyDown);
  };
}

type TopicReportConceptEntry = {
  conceptId: string;
  label: string;
  preview: Record<string, unknown>;
};

function topicReportConceptEntries(
  snapshot: Snapshot | null | undefined,
  detail: TopicDetailDto,
): TopicReportConceptEntry[] {
  const topicId = textValue(detail.topicId || snapshot?.reader?.topicId);
  if (!snapshot || !topicId) {
    return [];
  }
  const conceptsById = new Map(
    snapshot.concepts.rows.map((row) => [textValue(row.concept_id), row]),
  );
  const overlayBySenseId = new Map<string, Record<string, unknown>>();
  const overlayByConceptId = new Map<string, Record<string, unknown>>();
  conceptOverlayEntries(snapshot).forEach((entry) => {
    const senseId = textValue(entry.sense_id);
    const conceptId = textValue(entry.concept_id);
    if (senseId && !overlayBySenseId.has(senseId)) {
      overlayBySenseId.set(senseId, entry);
    }
    if (conceptId && !overlayByConceptId.has(conceptId)) {
      overlayByConceptId.set(conceptId, entry);
    }
  });
  const seenConceptIds = new Set<string>();
  return snapshot.concepts.senses
    .filter((sense) => stringArray(sense.source_topic_ids).includes(topicId))
    .map((sense): TopicReportConceptEntry | undefined => {
      const conceptId = textValue(sense.concept_id);
      if (!conceptId || seenConceptIds.has(conceptId)) {
        return undefined;
      }
      seenConceptIds.add(conceptId);
      const concept = conceptsById.get(conceptId) || {};
      const senseId = textValue(sense.sense_id);
      const overlay =
        overlayBySenseId.get(senseId) ||
        overlayByConceptId.get(conceptId) ||
        {};
      const label =
        textValue(overlay.label) ||
        textValue(concept.label) ||
        textValue(sense.label) ||
        conceptId;
      const alias =
        textValue(overlay.alias) ||
        stringArray(sense.aliases)[0] ||
        stringArray(concept.aliases)[0] ||
        label;
      const summary =
        textValue(overlay.short_definition) ||
        textValue(sense.short_definition) ||
        textValue(concept.short_definition) ||
        textValue(overlay.definition) ||
        textValue(sense.definition) ||
        textValue(concept.definition);
      return {
        conceptId,
        label,
        preview: {
          concept_id: conceptId,
          sense_id: senseId || undefined,
          alias,
          label,
          short_definition: summary || undefined,
          definition:
            textValue(overlay.definition) ||
            textValue(sense.definition) ||
            textValue(concept.definition) ||
            undefined,
          confidence: textValue(
            overlay.confidence || sense.confidence,
            "medium",
          ),
        },
      };
    })
    .filter((entry): entry is TopicReportConceptEntry => Boolean(entry))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function renderTopicReportConceptNav(
  snapshot: Snapshot | null | undefined,
  detail: TopicDetailDto,
) {
  const entries = topicReportConceptEntries(snapshot, detail);
  if (!entries.length) {
    return undefined;
  }
  const nav = el("aside", "topic-report-concept-nav");
  nav.setAttribute("aria-label", t("synthesis-topic-concepts"));
  const header = el("div", "topic-report-concept-nav-header");
  header.appendChild(el("strong", "", t("synthesis-tab-concepts")));
  header.appendChild(elRawText("span", "muted", String(entries.length)));
  nav.appendChild(header);
  const list = el("div", "topic-report-concept-nav-list");
  list.setAttribute("role", "list");
  entries.forEach((entry) => {
    const item = el("div", "topic-report-concept-nav-item");
    item.tabIndex = 0;
    item.setAttribute("role", "listitem");
    item.setAttribute("data-concept-id", entry.conceptId);
    item.setAttribute(
      "aria-label",
      t("synthesis-concept-preview-label", { label: entry.label }),
    );
    item.appendChild(elRawText("strong", "", entry.label));
    const openBubble = () => showConceptBubble(item, entry.preview);
    item.addEventListener("mouseenter", openBubble);
    item.addEventListener("focus", openBubble);
    item.addEventListener("mouseleave", scheduleConceptBubbleClose);
    item.addEventListener("blur", scheduleConceptBubbleClose);
    list.appendChild(item);
  });
  nav.appendChild(list);
  return nav;
}

type MarkdownOutlineOptions = {
  ariaLabel: string;
  headingIdPrefix: string;
  linkClassName: string;
  navClassName: string;
  title: string;
};

function buildMarkdownOutline(
  markdownNode: HTMLElement,
  options: MarkdownOutlineOptions,
) {
  const headings = Array.from(
    markdownNode.querySelectorAll("h1, h2, h3, h4"),
  ) as HTMLElement[];
  if (!headings.length) {
    return undefined;
  }
  const outline = el("nav", options.navClassName);
  outline.setAttribute("aria-label", options.ariaLabel);
  outline.appendChild(el("strong", "", options.title));
  headings.forEach((heading, index) => {
    const id = `${options.headingIdPrefix}-${index + 1}`;
    heading.id = id;
    const level = Number(heading.tagName.replace(/\D/g, "")) || 2;
    const link = el(
      "a",
      `${options.linkClassName} depth-${Math.max(1, Math.min(4, level))}`,
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

function buildReportOutline(markdownNode: HTMLElement) {
  return buildMarkdownOutline(markdownNode, {
    ariaLabel: "Report outline",
    headingIdPrefix: "topic-report-heading",
    linkClassName: "topic-report-outline-link",
    navClassName: "topic-report-outline",
    title: "Report",
  });
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
  bindMarkdownLinks(body);
  renderMarkdownCircleShortcodes(body);
  return applyConceptOverlay(body, state.snapshot);
}

function bindMarkdownLinks(root: HTMLElement) {
  root.querySelectorAll("a[href]").forEach((anchor: Element) => {
    const href = anchor.getAttribute("href") || "";
    const trimmedHref = href.trim();
    if (/^\s*javascript:/i.test(href)) {
      anchor.removeAttribute("href");
      return;
    }
    if (/^#[A-Za-z][\w:.-]*$/.test(trimmedHref)) {
      anchor.removeAttribute("target");
      anchor.removeAttribute("rel");
      anchor.addEventListener("click", (event: Event) => {
        const target = findMarkdownAnchorTarget(root, trimmedHref);
        if (!target) {
          return;
        }
        event.preventDefault();
        const scrollTarget =
          (target.closest(
            "li, h1, h2, h3, h4, h5, h6",
          ) as HTMLElement | null) || target;
        scrollTarget.scrollIntoView({ block: "start", inline: "nearest" });
      });
      return;
    }
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noreferrer noopener");
  });
}

function findMarkdownAnchorTarget(
  root: HTMLElement,
  href: string,
): HTMLElement | null {
  const rawId = href.slice(1);
  let id = rawId;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    id = rawId;
  }
  if (!id) {
    return null;
  }
  const candidates = root.querySelectorAll("[id]");
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates.item(index);
    if (candidate.id === id) {
      return candidate as HTMLElement;
    }
  }
  return null;
}

const markdownCircleShortcodes: Record<string, string> = {
  red: "red",
  orange: "orange",
  yellow: "yellow",
  green: "green",
  blue: "blue",
  purple: "purple",
  brown: "brown",
  black: "black",
  white: "white",
};

function renderMarkdownCircleShortcodes(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!(node instanceof Text)) {
      continue;
    }
    const parent = node.parentElement;
    if (
      parent?.closest("code, pre, kbd, samp, script, style") ||
      !/:([a-z]+)_circle:/.test(node.nodeValue || "")
    ) {
      continue;
    }
    textNodes.push(node);
  }
  for (const node of textNodes) {
    replaceCircleShortcodesInTextNode(node);
  }
}

function replaceCircleShortcodesInTextNode(node: Text) {
  const text = node.nodeValue || "";
  const pattern = /:([a-z]+)_circle:/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  const fragment = document.createDocumentFragment();
  while ((match = pattern.exec(text))) {
    const color = markdownCircleShortcodes[match[1]];
    if (!color) {
      continue;
    }
    if (match.index > cursor) {
      fragment.appendChild(
        document.createTextNode(text.slice(cursor, match.index)),
      );
    }
    const icon = el("span", `markdown-circle-icon markdown-circle-${color}`);
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", `${color} circle`);
    icon.title = `${color}_circle`;
    fragment.appendChild(icon);
    cursor = match.index + match[0].length;
  }
  if (cursor === 0) {
    return;
  }
  if (cursor < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(cursor)));
  }
  node.replaceWith(fragment);
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
        box.appendChild(elRawText("p", "", entry));
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
        box.appendChild(elRawText("p", "", entry));
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
      row.appendChild(elRawText("strong", "", "-"));
    } else if (
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      row.appendChild(elRawText("strong", "", String(raw)));
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

function renderScopeBoundaryValue(raw: unknown): HTMLElement {
  if (Array.isArray(raw)) {
    const arrWrap = el("div", "kv-array-wrap");
    raw.forEach((item) => {
      arrWrap.appendChild(
        badge(typeof item === "object" ? JSON.stringify(item) : String(item)),
      );
    });
    return arrWrap;
  }
  if (raw && typeof raw === "object") {
    return renderKeyValueList(raw as Record<string, unknown>);
  }
  return elRawText(
    "strong",
    "",
    raw === null || raw === undefined ? "-" : String(raw),
  );
}

function renderTopicScopeBoundary(
  topic: Record<string, unknown> | undefined,
): HTMLElement {
  const boundary = recordValue(topic?.scope_boundary);
  const rows: Array<[string, unknown]> = [];
  const researchArea = firstText(topic || {}, [
    "research_area",
    "researchArea",
    "notes",
  ]);
  if (researchArea) {
    rows.push([t("synthesis-topic-research-area"), researchArea]);
  }
  if (hasStructuredContent(boundary.include)) {
    rows.push([t("synthesis-scope-include"), boundary.include]);
  }
  if (hasStructuredContent(boundary.exclude)) {
    rows.push([t("synthesis-scope-exclude"), boundary.exclude]);
  }
  const list = el("div", "topic-kv-list");
  rows.forEach(([label, raw]) => {
    const row = el("div", "topic-kv-row");
    row.appendChild(el("span", "muted", label));
    row.appendChild(renderScopeBoundaryValue(raw));
    list.appendChild(row);
  });
  return list;
}

function evidenceRows(detail: TopicDetailDto) {
  return recordArray(detail.source_papers);
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
  return firstText(evidence, ["paper_ref", "paperRef", "item_key", "itemKey"]);
}

function normalizeEvidenceRefKey(value: unknown) {
  let key = textValue(value);
  if (!key) return "";
  key = key.replace(/^#/, "");
  let previous = "";
  while (key !== previous) {
    previous = key;
    key = key.replace(/^(source[_-]?paper|paper|item)[:/]/i, "");
  }
  return key;
}

function evidenceItemKey(value: unknown) {
  const key = normalizeEvidenceRefKey(value);
  if (!key.includes(":")) {
    return key;
  }
  return key.split(":").filter(Boolean).pop() || "";
}

function evidenceRefKeyVariants(value: unknown) {
  const raw = textValue(value);
  const normalized = normalizeEvidenceRefKey(raw);
  const itemKey = evidenceItemKey(raw);
  return new Set([raw, normalized, itemKey].filter(Boolean));
}

function evidenceRefKeys(evidence: Record<string, unknown>) {
  const variants = new Set<string>();
  [
    evidenceId(evidence),
    evidence.paper_ref || evidence.paperRef,
    evidence.item_key || evidence.itemKey,
  ].forEach((value) => {
    evidenceRefKeyVariants(value).forEach((variant) => variants.add(variant));
  });
  return variants;
}

function evidenceDigestLinkCandidates(evidence: Record<string, unknown>) {
  const candidates = new Set<string>();
  [
    evidence.paper_ref,
    evidence.paperRef,
    evidence.literature_item_id,
    evidence.projected_literature_item_id,
    evidence.item_key,
    evidence.itemKey,
  ].forEach((value) => {
    const text = textValue(value);
    if (text.length >= 3 || text.includes(":")) {
      candidates.add(text);
    }
  });
  const libraryId = textValue(
    evidence.library_id || evidence.libraryId || state.snapshot?.libraryId,
  );
  const itemKey = textValue(evidence.item_key || evidence.itemKey);
  if (libraryId && itemKey) {
    candidates.add(`${libraryId}:${itemKey}`);
  }
  return candidates;
}

function enhanceReportLiteratureDigestLinks(
  root: HTMLElement,
  detail: TopicDetailDto,
) {
  const byCandidate = new Map<string, Record<string, unknown>>();
  evidenceRows(detail).forEach((evidence) => {
    evidenceDigestLinkCandidates(evidence).forEach((candidate) => {
      if (!byCandidate.has(candidate)) {
        byCandidate.set(candidate, evidence);
      }
    });
  });
  const candidates = Array.from(byCandidate.keys()).sort(
    (left, right) => right.length - left.length,
  );
  if (!candidates.length) {
    return root;
  }
  const escaped = candidates.map((candidate) =>
    candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9_:-])(${escaped.join("|")})(?=$|[^A-Za-z0-9_:-])`,
    "g",
  );
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!(node instanceof Text)) {
      continue;
    }
    const parent = node.parentElement;
    if (
      !parent?.closest("li, td, th") ||
      parent.closest("a, button, code, pre, kbd, samp, script, style") ||
      !pattern.test(node.nodeValue || "")
    ) {
      pattern.lastIndex = 0;
      continue;
    }
    pattern.lastIndex = 0;
    textNodes.push(node);
  }
  textNodes.forEach((node) => {
    const text = node.nodeValue || "";
    pattern.lastIndex = 0;
    let cursor = 0;
    let match: RegExpExecArray | null;
    const fragment = document.createDocumentFragment();
    while ((match = pattern.exec(text))) {
      const prefix = match[1] || "";
      const id = match[2] || "";
      const idStart = match.index + prefix.length;
      const evidence = byCandidate.get(id);
      if (!evidence) {
        continue;
      }
      if (idStart > cursor) {
        fragment.appendChild(
          document.createTextNode(text.slice(cursor, idStart)),
        );
      }
      const button = elRawText("button", "topic-report-digest-link", id);
      button.type = "button";
      button.title = t("synthesis-action-open-digest-artifact");
      button.setAttribute(
        "aria-label",
        `${t("synthesis-action-open-digest-artifact")}: ${id}`,
      );
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openDigestModal(evidence);
      });
      fragment.appendChild(button);
      cursor = idStart + id.length;
    }
    if (cursor === 0) {
      return;
    }
    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }
    node.replaceWith(fragment);
  });
  return root;
}

function evidenceForRef(detail: TopicDetailDto, ref: unknown) {
  const id = textValue(ref);
  if (!id) {
    return undefined;
  }
  const rows = evidenceRows(detail);
  const exact = rows.filter((row) => evidenceRefKeys(row).has(id));
  if (exact.length === 1) return exact[0];
  const normalized = normalizeEvidenceRefKey(id);
  const normalizedMatches = rows.filter((row) =>
    evidenceRefKeys(row).has(normalized),
  );
  if (normalizedMatches.length === 1) return normalizedMatches[0];
  const itemKey = evidenceItemKey(id);
  if (!itemKey || itemKey === normalized) return undefined;
  const itemKeyMatches = rows.filter((row) =>
    evidenceRefKeys(row).has(itemKey),
  );
  return itemKeyMatches.length === 1 ? itemKeyMatches[0] : undefined;
}

function evidenceMatchesRef(
  detail: TopicDetailDto,
  evidence: Record<string, unknown>,
  ref: unknown,
) {
  const match = evidenceForRef(detail, ref);
  return !!match && evidenceId(match) === evidenceId(evidence);
}

function primaryEvidenceForEvent(
  detail: TopicDetailDto,
  event: Record<string, unknown>,
) {
  const refs = [...stringArray(event.source_paper_refs)];
  if (refs.length) {
    return evidenceForRef(detail, refs[0]);
  }
  const direct = firstText(event, ["paper_ref"]);
  return direct ? evidenceForRef(detail, direct) : undefined;
}

function standaloneDigestKeysForEvidence(evidence: Record<string, unknown>) {
  const digestRef = recordValue(evidence.digest_ref || evidence.digestRef);
  return [
    evidenceId(evidence),
    evidence.paper_ref,
    evidence.paperRef,
    digestRef.paper_ref,
    digestRef.paperRef,
    digestRef.note_key,
    digestRef.noteKey,
    digestRef.payload_hash,
    digestRef.payloadHash,
  ]
    .map((value) => textValue(value))
    .filter(Boolean);
}

function standaloneDigestForEvidence(evidence: Record<string, unknown>) {
  for (const key of standaloneDigestKeysForEvidence(evidence)) {
    const digest = state.standaloneDigestsByKey.get(key);
    if (digest) {
      return digest;
    }
  }
  return undefined;
}

function openDigestModal(evidence: Record<string, unknown>) {
  state.selectedEvidenceId = evidenceId(evidence);
  if (state.standaloneExport) {
    const digest =
      standaloneDigestForEvidence(evidence) ||
      ({
        ok: false,
        status: t("synthesis-standalone-digest-unavailable"),
      } as Record<string, unknown>);
    state.digestModal = {
      status: digest.ok ? "available" : "unavailable",
      evidence,
      result: digest,
    };
    syncDigestModal();
    return;
  }
  state.digestModal = { status: "loading", evidence };
  syncDigestModal();
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

function renderReviewOutlineGroups(detail: TopicDetailDto) {
  const outline = detail.review_outline || {};
  const strategies = recordArray(outline.writing_strategies);
  if (!textValue(outline.topic_importance) && !strategies.length)
    return undefined;
  const recommendedId = textValue(outline.recommended_strategy_id);
  const outlineSection = el("div", "overview-outline-section");
  outlineSection.appendChild(el("h3", "", t("synthesis-review-blueprint")));
  const importance = textValue(outline.topic_importance);
  if (importance) {
    outlineSection.appendChild(
      renderContentCard(
        t("synthesis-topic-importance"),
        renderParagraphs(importance),
      ),
    );
  }
  const grid = el("div", "outline-group-grid");
  strategies.forEach((strategy, index) => {
    const card = el("article", "outline-blueprint-card");
    const titleWrap = el("div", "claim-header");
    titleWrap.appendChild(
      elRawText(
        "strong",
        "",
        firstText(
          strategy,
          ["title", "id"],
          t("synthesis-writing-strategy", { count: index + 1 }),
        ),
      ),
    );
    if (firstText(strategy, ["id"]) === recommendedId) {
      titleWrap.appendChild(badge(t("synthesis-recommended"), "green"));
    }
    card.appendChild(titleWrap);
    const thesis = firstText(strategy, ["review_thesis"]);
    if (thesis)
      card.appendChild(
        renderContentCard(
          t("synthesis-thesis"),
          renderParagraphs(thesis),
          "outline-strategy-field",
        ),
      );
    const writing = firstText(strategy, ["writing_strategy"]);
    if (writing)
      card.appendChild(
        renderContentCard(
          t("synthesis-strategy"),
          renderParagraphs(writing),
          "outline-strategy-field",
        ),
      );
    const sectionPlan = stringArray(strategy.section_plan);
    if (sectionPlan.length) {
      const list = el("ul", "outline-key-point-list");
      sectionPlan.forEach((point) => list.appendChild(el("li", "", point)));
      card.appendChild(
        renderContentCard(
          t("synthesis-section-plan"),
          list,
          "outline-strategy-field",
        ),
      );
    }
    const bestFor = firstText(strategy, ["best_for"]);
    if (bestFor)
      card.appendChild(
        renderContentCard(
          t("synthesis-best-for"),
          renderParagraphs(bestFor),
          "outline-strategy-field",
        ),
      );
    const risks = firstText(strategy, ["risks"]);
    if (risks)
      card.appendChild(
        renderContentCard(
          t("synthesis-risks"),
          renderParagraphs(risks),
          "outline-strategy-field",
        ),
      );
    const refs = stringArray(strategy.source_paper_refs);
    if (refs.length) card.appendChild(evidenceRefChips(detail, refs));
    grid.appendChild(card);
  });
  outlineSection.appendChild(grid);
  return outlineSection;
}

function renderTopicOverviewSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", t("synthesis-topic-tab-overview")));

  const summaryBlocks = [
    textValue(detail.topic?.definition),
    textValue(detail.summary?.summary),
  ].filter(Boolean);

  if (summaryBlocks.length) {
    const summaryCard = el("div", "overview-summary-hero");
    summaryCard.appendChild(
      el("h3", "hero-title", t("synthesis-synthesis-summary")),
    );
    summaryBlocks.forEach((block) => {
      summaryCard.appendChild(renderParagraphs(block));
    });
    section.appendChild(summaryCard);
  }

  const takeaways = stringArray(detail.summary?.key_takeaways);
  if (takeaways.length) {
    const list = el("ul", "outline-key-point-list");
    takeaways.forEach((takeaway) => list.appendChild(el("li", "", takeaway)));
    section.appendChild(renderContentCard(t("synthesis-key-takeaways"), list));
  }

  const topicBoundary = renderTopicScopeBoundary(detail.topic);
  if (topicBoundary.childElementCount) {
    section.appendChild(
      renderContentCard(t("synthesis-scope-boundary"), topicBoundary),
    );
  }

  const outline = renderReviewOutlineGroups(detail);
  if (outline) section.appendChild(outline);

  if (section.childElementCount <= 1) {
    section.appendChild(
      renderEmptyStructuredState(t("synthesis-empty-overview")),
    );
  }
  return section;
}

const TAXONOMY_AXIS_MESSAGE_KEYS: Record<string, SynthesisWorkbenchMessageKey> =
  {
    problem_formulation: "synthesis-taxonomy-axis-problem-formulation",
    technical_mechanism: "synthesis-taxonomy-axis-technical-mechanism",
    evidence_scope: "synthesis-taxonomy-axis-evidence-scope",
    research_route: "synthesis-taxonomy-axis-research-route",
    application_context: "synthesis-taxonomy-axis-application-context",
  };

const TAXONOMY_AXIS_TONE_CLASSES = [
  "axis-tone-blue",
  "axis-tone-green",
  "axis-tone-purple",
  "axis-tone-orange",
  "axis-tone-teal",
];

function taxonomyAxisLabel(axisType: string) {
  const key = TAXONOMY_AXIS_MESSAGE_KEYS[axisType];
  return key ? t(key) : axisType.replace(/_/g, " ");
}

function renderTaxonomyNodeCard(
  detail: TopicDetailDto,
  node: Record<string, unknown>,
  index: number,
) {
  const card = el("article", "taxonomy-list-item");

  const header = el("header", "taxonomy-item-header");
  const titleWrap = el("div", "taxonomy-item-title");
  titleWrap.appendChild(el("span", "claim-index", `T${index + 1}`));
  titleWrap.appendChild(
    elRawText(
      "h3",
      "",
      firstText(
        node,
        ["title", "label", "name", "id"],
        t("synthesis-taxonomy-node", { count: index + 1 }),
      ),
    ),
  );
  header.appendChild(titleWrap);

  const maturity = firstText(node, ["maturity", "status", "development_stage"]);
  if (maturity) header.appendChild(badge(maturity, "purple"));
  card.appendChild(header);

  const text = firstText(node, [
    "description",
    "summary",
    "rationale",
    "definition",
  ]);
  if (text) card.appendChild(elRawText("p", "taxonomy-item-desc", text));

  const detailsWrap = el("div", "taxonomy-item-details");

  const probMech = el("div", "taxonomy-detail-group");
  const prob = firstText(node, ["core_problem", "problem", "target_problem"]);
  if (prob) {
    const pDiv = el("div", "taxonomy-detail-row");
    pDiv.appendChild(el("span", "muted", t("synthesis-detail-problem")));
    pDiv.appendChild(elRawText("strong", "", prob));
    probMech.appendChild(pDiv);
  }
  const mech = firstText(node, [
    "mechanism",
    "technical_mechanism",
    "core_mechanism",
  ]);
  if (mech) {
    const mDiv = el("div", "taxonomy-detail-row");
    mDiv.appendChild(el("span", "muted", t("synthesis-detail-mechanism")));
    mDiv.appendChild(elRawText("strong", "", mech));
    probMech.appendChild(mDiv);
  }
  if (probMech.childElementCount) detailsWrap.appendChild(probMech);

  const prosCons = el("div", "taxonomy-detail-group pros-cons");
  const strengths = stringArray(node.strengths || node.advantages);
  if (strengths.length) {
    const sDiv = el("div", "taxonomy-detail-row");
    sDiv.appendChild(el("span", "muted", t("synthesis-detail-strengths")));
    const sList = el("ul", "taxonomy-bullet-list");
    strengths.forEach((st) =>
      sList.appendChild(elRawText("li", "pro-item", st)),
    );
    sDiv.appendChild(sList);
    prosCons.appendChild(sDiv);
  }
  const limits = stringArray(node.limitations || node.weaknesses);
  if (limits.length) {
    const lDiv = el("div", "taxonomy-detail-row");
    lDiv.appendChild(el("span", "muted", t("synthesis-detail-limitations")));
    const lList = el("ul", "taxonomy-bullet-list");
    limits.forEach((lt) => lList.appendChild(elRawText("li", "con-item", lt)));
    lDiv.appendChild(lList);
    prosCons.appendChild(lDiv);
  }
  if (prosCons.childElementCount) detailsWrap.appendChild(prosCons);

  if (detailsWrap.childElementCount) card.appendChild(detailsWrap);

  const refs = node.source_paper_refs;
  if (stringArray(refs).length) {
    const foot = el("footer", "taxonomy-item-footer");
    foot.appendChild(evidenceRefChips(detail, refs, "blue"));
    card.appendChild(foot);
  }
  return card;
}

function renderTaxonomyNodeList(
  detail: TopicDetailDto,
  nodes: Record<string, unknown>[],
) {
  const list = el("div", "taxonomy-list");
  nodes.forEach((node, index) => {
    list.appendChild(renderTaxonomyNodeCard(detail, node, index));
  });
  return list;
}

function renderTopicTaxonomySection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", t("synthesis-topic-tab-taxonomy")));
  const taxonomy = detail.taxonomy || {};
  const summary = recordValue(taxonomy.summary);
  const summaryText = firstText(summary, ["text", "analysis", "overview"]);
  if (summaryText) {
    section.appendChild(
      renderContentCard(
        t("synthesis-route-synthesis"),
        renderParagraphs(summaryText),
      ),
    );
  }

  const axes = recordArray(taxonomy.axes);
  if (axes.length) {
    axes.forEach((axis, axisIndex) => {
      const axisType = firstText(axis, ["axis_type", "type", "axis"]);
      const nodes = recordArray(axis.nodes);
      if (!axisType && !nodes.length) {
        return;
      }
      const group = el(
        "section",
        `taxonomy-axis-group ${
          TAXONOMY_AXIS_TONE_CLASSES[
            axisIndex % TAXONOMY_AXIS_TONE_CLASSES.length
          ]
        }`,
      );
      const head = el("header", "taxonomy-axis-header");
      head.appendChild(
        el(
          "span",
          "taxonomy-axis-index",
          String(axisIndex + 1).padStart(2, "0"),
        ),
      );
      const heading = el("div", "taxonomy-axis-heading");
      heading.appendChild(
        el("span", "taxonomy-axis-kicker", t("synthesis-classification-axis")),
      );
      heading.appendChild(
        elRawText(
          "h3",
          "taxonomy-axis-title",
          axisType
            ? taxonomyAxisLabel(axisType)
            : `${t("synthesis-classification-axis")} ${axisIndex + 1}`,
        ),
      );
      const rationale = firstText(axis, [
        "axis_rationale",
        "rationale",
        "reason",
      ]);
      if (rationale)
        heading.appendChild(
          elRawText("p", "taxonomy-axis-rationale", rationale),
        );
      head.appendChild(heading);
      group.appendChild(head);
      if (nodes.length) {
        const body = el("div", "taxonomy-axis-body");
        body.appendChild(renderTaxonomyNodeList(detail, nodes));
        group.appendChild(body);
      }
      section.appendChild(group);
    });
  } else {
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
      section.appendChild(
        renderContentCard(t("synthesis-classification-axis"), head),
      );
    }
    const nodes = recordArray(
      taxonomy.nodes || taxonomy.categories || taxonomy.taxonomy_nodes,
    );
    if (nodes.length) {
      section.appendChild(renderTaxonomyNodeList(detail, nodes));
    }
  }

  if (section.childElementCount <= 1) {
    section.appendChild(
      renderEmptyStructuredState(t("synthesis-empty-taxonomy")),
    );
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

function renderTopicClaimsSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", t("synthesis-topic-tab-claims")));
  const claims = recordArray(detail.claims);
  if (!claims.length) {
    section.appendChild(renderEmptyStructuredState(t("synthesis-empty-claim")));
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
      elRawText(
        "h3",
        "",
        firstText(
          claim,
          ["text", "claim", "title", "id"],
          t("synthesis-claim-title", { count: index + 1 }),
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
    if (rationale) leftCol.appendChild(elRawText("p", "", rationale));
    card.appendChild(leftCol);

    const rightCol = el("div", "claim-evidence");
    const eRefs = stringArray(claim.source_paper_refs);
    if (eRefs.length) {
      rightCol.appendChild(
        el("h4", "evidence-group-title", t("synthesis-source-papers")),
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
          eCard.appendChild(elRawText("span", "evidence-code", code));
          eCard.appendChild(elRawText("span", "evidence-title", title));
          eList.appendChild(eCard);
        } else {
          eList.appendChild(badge(ref, "green"));
        }
      });
      rightCol.appendChild(eList);
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
    el(
      "h3",
      "",
      t("synthesis-associated-literature-references", {
        count: rows.length,
      }),
    ),
  );
  header.appendChild(titleContainer);

  const searchBar = el("div", "references-search-bar");
  const input = el("input", "references-search-input") as HTMLInputElement;
  input.type = "text";
  input.placeholder = t("synthesis-search-references");
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
      const codeEl = elRawText("span", "ref-code-badge", code);
      badgeContainer.appendChild(codeEl);
      if (status) {
        badgeContainer.appendChild(badge(status, toneFor(status)));
      }
      cardHead.appendChild(badgeContainer);

      if (year) {
        cardHead.appendChild(elRawText("span", "ref-year-label", year));
      }
      card.appendChild(cardHead);

      card.appendChild(elRawText("h4", "ref-title", title));

      if (refKey) {
        card.appendChild(elRawText("div", "ref-key-badge", refKey));
      }

      if (summary) {
        const sumText =
          summary.length > 130 ? summary.substring(0, 127) + "..." : summary;
        card.appendChild(elRawText("p", "ref-summary", sumText));
      }

      card.addEventListener("click", () => {
        openEvidenceExplorer(evidenceId(r) || undefined);
      });

      grid.appendChild(card);
    });

    if (!grid.childElementCount) {
      grid.appendChild(
        renderEmptyStructuredState(t("synthesis-empty-matching-references")),
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

function improvementDimensionRows(detail: TopicDetailDto) {
  const value = detail.improvement_dimensions;
  if (isRecord(value)) {
    return recordArray(value.dimensions);
  }
  return recordArray(value);
}

function improvementDimensionSummary(detail: TopicDetailDto) {
  const value = recordValue(detail.improvement_dimensions);
  const summary = recordValue(value.summary);
  return (
    firstText(summary, ["text", "summary", "analysis", "overview"]) ||
    firstText(value, ["summary", "overview", "text"]) ||
    ""
  );
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
  const improvementDimensions = improvementDimensionRows(detail);
  if (improvementDimensions.length) {
    section.appendChild(el("h2", "", t("synthesis-improvement-dimensions")));
    const summary = improvementDimensionSummary(detail);
    if (summary) section.appendChild(renderParagraphs(summary));
    improvementDimensions.forEach((dimension, index) => {
      const card = el("article", "debate-card");
      card.appendChild(el("span", "claim-index", `I${index + 1}`));
      card.appendChild(
        elRawText(
          "h3",
          "",
          firstText(
            dimension,
            ["title", "dimension", "name", "id"],
            t("synthesis-dimension-title", { count: index + 1 }),
          ),
        ),
      );
      const analysis = firstText(dimension, [
        "analysis",
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
      if (trajectory) card.appendChild(elRawText("p", "muted", trajectory));
      if (stringArray(dimension.source_paper_refs).length) {
        card.appendChild(evidenceRefChips(detail, dimension.source_paper_refs));
      }
      section.appendChild(card);
    });
  } else {
    section.appendChild(el("h2", "", t("synthesis-topic-tab-compare")));
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
    trHead.appendChild(
      el("th", "matrix-th matrix-dim-col", t("synthesis-column-dimension")),
    );
    routes.forEach((route) => {
      trHead.appendChild(elRawText("th", "matrix-th", route));
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
        elRawText(
          "strong",
          "",
          firstText(
            r,
            ["name", "title", "dimension", "label", "id"],
            t("synthesis-dimension-title", { count: i + 1 }),
          ),
        ),
      );
      tdDim.appendChild(dimTitle);
      const desc = firstText(r, ["description", "summary", "rationale"]);
      if (desc) tdDim.appendChild(elRawText("p", "matrix-dim-desc", desc));

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
    section.appendChild(
      renderEmptyStructuredState(t("synthesis-empty-comparison")),
    );
  }
  const debates = recordArray(detail.debates);
  if (debates.length) {
    section.appendChild(el("h3", "", t("synthesis-debates")));
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
            t("synthesis-debate-title", { count: index + 1 }),
          ),
        ),
      );
      const type = firstText(debate, ["evidence_type", "type"]);
      if (type) card.appendChild(badge(type, "orange"));
      const text = firstText(debate, [
        "current_judgment",
        "synthesis_judgment",
        "analysis",
        "summary",
        "description",
        "tension",
        "rationale",
      ]);
      if (text) card.appendChild(elRawText("p", "", text));
      if (stringArray(debate.source_paper_refs).length)
        card.appendChild(
          evidenceRefChips(detail, debate.source_paper_refs, "orange"),
        );
      section.appendChild(card);
    });
  }
  return section;
}

function renderStructuredRecordCards(args: {
  title: string;
  rows: Array<Record<string, unknown>>;
  className?: string;
  titleKeys?: string[];
  bodyKeys?: string[];
  titleFormatter?: (row: Record<string, unknown>, fallback: string) => string;
  priorityFormatter?: (value: string) => string;
  priorityTone?: (value: string) => string;
}) {
  if (!args.rows.length) return undefined;
  const wrap = el("div", "coverage-structured-block");
  wrap.appendChild(el("h3", "", args.title));
  const grid = el("div", "topic-card-grid");
  args.rows.forEach((row, index) => {
    const card = el("article", args.className || "external-theme-card");
    const title = firstText(
      row,
      args.titleKeys || ["title", "direction", "theme", "label", "type", "id"],
      `${args.title} ${index + 1}`,
    );
    card.appendChild(
      elRawText("strong", "", args.titleFormatter?.(row, title) || title),
    );
    const body = firstText(
      row,
      args.bodyKeys || [
        "reason",
        "analysis",
        "summary",
        "description",
        "rationale",
        "caveat",
      ],
    );
    if (body) card.appendChild(elRawText("p", "", body));
    const priority = firstText(row, ["priority", "urgency", "severity"]);
    if (priority) {
      const priorityBadge = badge(
        args.priorityFormatter?.(priority) || priority,
        args.priorityTone?.(priority) || toneFor(priority),
      );
      priorityBadge.classList.add("coverage-priority-badge");
      card.appendChild(priorityBadge);
    }
    const examples = stringArray(
      row.example_titles_or_terms || row.examples || row.terms,
    );
    if (examples.length) {
      const exampleWrap = el("div", "coverage-examples");
      examples.forEach((example) => {
        const exampleBadge = badge(example);
        exampleBadge.classList.add("coverage-example-pill");
        exampleWrap.appendChild(exampleBadge);
      });
      card.appendChild(exampleWrap);
    }
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
  return wrap;
}

function textDedupeKey(value: unknown) {
  return textValue(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function dedupeStructuredRows(
  rows: Array<Record<string, unknown>>,
  keys = ["direction", "title", "summary", "reason", "rationale", "note"],
) {
  const seen = new Set<string>();
  const result: Array<Record<string, unknown>> = [];
  rows.forEach((row) => {
    const key =
      keys
        .map((field) => textValue(row[field]))
        .filter(Boolean)
        .join("\n") || JSON.stringify(row);
    const normalized = textDedupeKey(key);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(row);
  });
  return result;
}

function coverageCaveatTitle(row: Record<string, unknown>, fallback: string) {
  const type = firstText(row, ["type"]);
  return type ? enumLabel("coverage-caveat", type, fallback) : fallback;
}

function priorityLabel(value: string) {
  return enumLabel("priority", value, value);
}

function priorityTone(value: string) {
  const normalized = enumKeyPart(value);
  if (normalized === "high" || normalized === "urgent") return "danger";
  if (normalized === "low") return "ok";
  return "warn";
}

function renderTopicExternalCoverageSection(detail: TopicDetailDto) {
  const section = el("div", "external-coverage-section");
  const coverage = detail.coverage || {};
  const summary = firstText(coverage, ["external_context_summary"]);
  if (summary) {
    const hero = el("div", "overview-summary-hero");
    hero.appendChild(
      el("h3", "hero-title", t("synthesis-external-literature-context")),
    );
    hero.appendChild(renderParagraphs(summary));
    section.appendChild(hero);
  }
  return section.childElementCount ? section : undefined;
}

function renderCoverageSummary(detail: TopicDetailDto) {
  const coverage = detail.coverage || {};
  if (!hasStructuredContent(coverage)) return undefined;
  const block = el("div", "coverage-summary-block");
  const verdict = firstText(coverage, [
    "coverage_verdict",
    "verdict",
    "status",
  ]);
  const reason = firstText(coverage, ["coverage_reason", "reason"]);
  if (verdict || reason) {
    const card = el("div", "coverage-verdict-card");
    if (verdict) {
      const line = el("div", "verdict-line");
      line.appendChild(el("strong", "", `${t("synthesis-coverage-verdict")}:`));
      line.appendChild(badge(verdict, toneFor(verdict)));
      card.appendChild(line);
    }
    if (reason) card.appendChild(renderParagraphs(reason));
    block.appendChild(card);
  }
  const caveats = recordArray(coverage.coverage_caveats);
  const caveatBlock = renderStructuredRecordCards({
    title: t("synthesis-coverage-caveats"),
    rows: caveats,
    className: "coverage-caveat-card",
    titleKeys: ["type", "title", "label", "id"],
    bodyKeys: ["note", "reason", "description", "summary", "caveat"],
    titleFormatter: coverageCaveatTitle,
  });
  if (caveatBlock) block.appendChild(caveatBlock);
  return block.childElementCount ? block : undefined;
}

function renderMergedCollectionDirections(detail: TopicDetailDto) {
  const coverage = detail.coverage || {};
  const rows = dedupeStructuredRows(
    recordArray(coverage.suggested_collection_directions),
  );
  return renderStructuredRecordCards({
    title: t("synthesis-suggested-collection-directions"),
    rows,
    className: "coverage-direction-card",
    titleKeys: ["direction", "title", "label", "id"],
    bodyKeys: ["reason", "rationale", "why", "summary"],
    priorityFormatter: priorityLabel,
    priorityTone,
  });
}

function routeCoverageCount(value: unknown) {
  if (isRecord(value)) {
    return firstText(value, ["routes", "route_count", "count"]);
  }
  return maybeLocalizedValue(value) || textValue(value);
}

function renderCoverageStatistics(detail: TopicDetailDto) {
  const stats = (detail.statistics || {}) as Record<string, unknown>;
  const coverage = detail.coverage || {};
  const paperVal = stats.paper_count ?? detail.paper_count;
  const timeSpanVal = formatTimeSpan(stats.time_span);
  const routeVal = routeCoverageCount(stats.route_coverage);
  const verdict =
    firstText(stats, ["coverage_verdict"]) ||
    firstText(coverage, ["coverage_verdict", "verdict", "status"]);
  const metrics = [
    [t("synthesis-stat-papers"), paperVal],
    [t("synthesis-stat-time-span"), timeSpanVal],
    [t("synthesis-coverage-verdict"), verdict],
    [t("synthesis-stat-routes"), routeVal],
  ].filter(([, value]) => textValue(value));
  if (!metrics.length) return undefined;
  const dash = el("div", "overview-dashboard coverage-statistics-dashboard");
  metrics.forEach(([label, value]) => {
    const metric = el("div", "dashboard-metric");
    metric.appendChild(el("div", "metric-label", String(label)));
    metric.appendChild(el("div", "metric-value", String(value)));
    dash.appendChild(metric);
  });
  return dash;
}

function renderTopicCoverageSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", t("synthesis-topic-tab-coverage")));
  const coverageStats = renderCoverageStatistics(detail);
  if (coverageStats) section.appendChild(coverageStats);
  const coverageSummary = renderCoverageSummary(detail);
  if (coverageSummary) section.appendChild(coverageSummary);
  const externalSection = renderTopicExternalCoverageSection(detail);
  if (externalSection) section.appendChild(externalSection);
  const directions = renderMergedCollectionDirections(detail);
  if (directions) section.appendChild(directions);
  if (hasStructuredContent(detail.diagnostics)) {
    section.appendChild(
      renderContentCard(
        t("synthesis-diagnostics"),
        renderKeyValueList(
          isRecord(detail.diagnostics)
            ? detail.diagnostics
            : { value: detail.diagnostics },
        ),
      ),
    );
  }
  if (section.childElementCount <= 2) {
    section.appendChild(
      renderEmptyStructuredState(t("synthesis-empty-coverage")),
    );
  }
  return section;
}

function formatTimeSpan(value: unknown) {
  if (Array.isArray(value)) {
    const years = value.map((entry) => textValue(entry)).filter(Boolean);
    return years.length >= 2
      ? `${years[0]} - ${years[years.length - 1]}`
      : years[0] || "";
  }
  if (isRecord(value)) {
    const start = firstText(value, [
      "earliest",
      "start_year",
      "min_year",
      "from",
      "start",
    ]);
    const end = firstText(value, [
      "latest",
      "end_year",
      "max_year",
      "to",
      "end",
    ]);
    if (start || end) return `${start || "?"} - ${end || "?"}`;
  }
  return textValue(value);
}

function stripDuplicateReportHeadings(markdown: string, reportTitle = "") {
  let body = markdown.trim();
  const escapedTitle = reportTitle
    ? reportTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : "";
  const headingPatterns = [
    /^#{1,3}\s*Synthesis Report\s*\n+/i,
    /^#{1,3}\s*Report Body\s*\n+/i,
    escapedTitle ? new RegExp(`^#{1,3}\\s*${escapedTitle}\\s*\\n+`, "i") : null,
  ].filter(Boolean) as RegExp[];
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of headingPatterns) {
      const next = body.replace(pattern, "").trimStart();
      if (next !== body) {
        body = next;
        changed = true;
      }
    }
  }
  return body;
}

function renderTopicFutureDirectionsSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", t("synthesis-topic-tab-future-directions")));
  const rows = recordArray(detail.future_directions);
  if (rows.length) {
    const list = el("div", "claims-list");
    rows.forEach((direction, index) => {
      const card = el("article", "claim-row future-direction-row");
      const leftCol = el("div", "claim-content");
      const header = el("div", "claim-header");
      header.appendChild(el("span", "claim-index", `F${index + 1}`));
      const directionType = firstText(direction, ["direction_type"]);
      if (directionType) header.appendChild(badge(directionType, "blue"));
      leftCol.appendChild(header);
      leftCol.appendChild(
        elRawText(
          "h3",
          "",
          firstText(
            direction,
            ["title", "id"],
            t("synthesis-future-direction-title", { count: index + 1 }),
          ),
        ),
      );
      const limitation = firstText(direction, ["current_limitation"]);
      if (limitation) {
        const block = el("div", "future-direction-field");
        block.appendChild(el("strong", "", t("synthesis-current-limitation")));
        block.appendChild(renderParagraphs(limitation));
        leftCol.appendChild(block);
      }
      const future = firstText(direction, ["future_direction"]);
      if (future) {
        const block = el("div", "future-direction-field");
        block.appendChild(el("strong", "", t("synthesis-future-direction")));
        block.appendChild(renderParagraphs(future));
        leftCol.appendChild(block);
      }
      const rationale = firstText(direction, ["rationale"]);
      if (rationale) {
        const block = el("div", "future-direction-field");
        block.appendChild(el("strong", "", t("synthesis-rationale")));
        block.appendChild(renderParagraphs(rationale));
        leftCol.appendChild(block);
      }
      const refs = stringArray(direction.source_paper_refs);
      if (refs.length) {
        leftCol.appendChild(evidenceRefChips(detail, refs, "blue"));
      }
      card.appendChild(leftCol);
      list.appendChild(card);
    });
    section.appendChild(list);
  }
  if (section.childElementCount <= 1) {
    section.appendChild(
      renderEmptyStructuredState(t("synthesis-empty-future-directions")),
    );
  }
  return section;
}

function renderTopicReportSection(
  detail: TopicDetailDto,
  snapshot?: Snapshot | null,
) {
  const section = el("div", "topic-section topic-report-section");
  const header = el("div", "topic-report-header");
  header.appendChild(el("h2", "", t("synthesis-report-title")));
  const report = detail.synthesis_report || {};
  const title = firstText(report, ["title", "heading"]);
  const body = firstText(report, ["body"]);
  if (body) {
    const actions = el("div", "topic-report-actions");
    const copy = el("button", "", t("synthesis-action-copy"));
    copy.type = "button";
    let copyFeedbackTimer: number | undefined;
    copy.addEventListener("click", () => {
      const writeText = navigator.clipboard?.writeText?.bind(
        navigator.clipboard,
      );
      const setFeedback = (label: string, className: string) => {
        copy.textContent = label;
        copy.classList.remove("is-confirmed", "is-error");
        if (className) {
          copy.classList.add(className);
        }
        if (copyFeedbackTimer) {
          window.clearTimeout(copyFeedbackTimer);
        }
        copyFeedbackTimer = window.setTimeout(() => {
          copy.textContent = t("synthesis-action-copy");
          copy.classList.remove("is-confirmed", "is-error");
        }, 1400);
      };
      if (!writeText) {
        setFeedback(t("synthesis-action-copy-failed"), "is-error");
        return;
      }
      void writeText(body)
        .then(() => setFeedback(t("synthesis-action-copied"), "is-confirmed"))
        .catch(() =>
          setFeedback(t("synthesis-action-copy-failed"), "is-error"),
        );
    });
    const exportButton = makeButton(
      t("synthesis-action-export"),
      "hostCommand",
      {
        command: "exportTopicSynthesisReport",
        args: { topicId: detail.topicId },
      },
    );
    actions.appendChild(copy);
    actions.appendChild(exportButton);
    header.appendChild(actions);
  }
  if (body) {
    const reportBody = renderMarkdown(
      stripDuplicateReportHeadings(body, title),
    );
    reportBody.classList.add("report-card");
    enhanceReportLiteratureDigestLinks(reportBody, detail);
    const reportOutline =
      reportBody instanceof HTMLElement
        ? buildReportOutline(reportBody)
        : undefined;
    const conceptNav = renderTopicReportConceptNav(snapshot, detail);
    const scrollBody = el("div", "topic-report-scroll-body");
    scrollBody.appendChild(reportBody);
    const readerFrame = el("div", "topic-report-reader-frame");
    if (reportOutline) {
      readerFrame.appendChild(reportOutline);
    } else {
      readerFrame.classList.add("no-outline");
    }
    readerFrame.appendChild(scrollBody);
    const reportPanel = el("div", "topic-report-panel");
    reportPanel.appendChild(header);
    reportPanel.appendChild(readerFrame);
    if (conceptNav) {
      const workspace = el("div", "topic-report-workspace");
      workspace.appendChild(conceptNav);
      workspace.appendChild(reportPanel);
      section.appendChild(workspace);
    } else {
      section.appendChild(reportPanel);
    }
  } else {
    section.appendChild(header);
  }
  if (!body) {
    section.appendChild(
      renderEmptyStructuredState(t("synthesis-report-empty")),
    );
  }
  return section;
}

function renderTopicSection(
  detail: TopicDetailDto,
  snapshot?: Snapshot | null,
) {
  if (
    state.topicDetailSection === "external" ||
    state.topicDetailSection === "statistics"
  ) {
    state.topicDetailSection = "coverage";
  }
  if (state.topicDetailSection === "taxonomy")
    return renderTopicTaxonomySection(detail);
  if (state.topicDetailSection === "claims")
    return renderTopicClaimsSection(detail);
  if (state.topicDetailSection === "references")
    return renderTopicReferencesSection(detail);
  if (state.topicDetailSection === "compare")
    return renderTopicCompareSection(detail);
  if (state.topicDetailSection === "coverage")
    return renderTopicCoverageSection(detail);
  if (state.topicDetailSection === "future_directions")
    return renderTopicFutureDirectionsSection(detail);
  if (state.topicDetailSection === "report")
    return renderTopicReportSection(detail, snapshot);
  if (state.topicDetailSection === "citation_graph" && snapshot)
    return renderStandaloneTopicCitationGraphSection(snapshot);
  return renderTopicOverviewSection(detail);
}

function renderTopicTabs() {
  const tabs = el("nav", "topic-detail-tabs");
  const entries: Array<[TopicDetailSection, SynthesisWorkbenchMessageKey]> = [
    ["overview", "synthesis-topic-tab-overview"],
    ["taxonomy", "synthesis-topic-tab-taxonomy"],
    ["claims", "synthesis-topic-tab-claims"],
    ["compare", "synthesis-topic-tab-compare"],
    ["future_directions", "synthesis-topic-tab-future-directions"],
    ["coverage", "synthesis-topic-tab-coverage"],
    ["references", "synthesis-topic-tab-references"],
    ["report", "synthesis-topic-tab-report"],
  ];
  if (state.standaloneExport) {
    entries.push(["citation_graph", "synthesis-topic-tab-citation-graph"]);
  }
  entries.forEach(([id, labelKey]) => {
    const button = el(
      "button",
      state.topicDetailSection === id ? "active" : "",
      t(labelKey),
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

function renderStandaloneTopicCitationGraphSection(snapshot: Snapshot) {
  const section = el("div", "topic-section topic-citation-graph-section");
  renderGraph(section, snapshot);
  return section;
}

function selectedEvidence(detail: TopicDetailDto) {
  if (!state.selectedEvidenceId) {
    return undefined;
  }
  return evidenceForRef(detail, state.selectedEvidenceId);
}

function derivedEvidenceLinks(
  detail: TopicDetailDto,
  evidence: Record<string, unknown>,
) {
  const matches = {
    claims: [] as string[],
    timeline: [] as string[],
    taxonomy: [] as string[],
  };
  recordArray(detail.claims).forEach((claim, index) => {
    const refs = stringArray(claim.source_paper_refs);
    if (refs.some((ref) => evidenceMatchesRef(detail, evidence, ref))) {
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
    const refs = stringArray(node.source_paper_refs);
    if (refs.some((ref) => evidenceMatchesRef(detail, evidence, ref))) {
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
  chipRow.appendChild(badge(t("synthesis-evidence-selected"), "blue"));
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
    row.appendChild(el("strong", "", enumLabel("kind", kind)));
    row.appendChild(el("span", "muted", refs.join(", ")));
    linkList.appendChild(row);
  });
  if (linkList.childElementCount) card.appendChild(linkList);
  const open = el(
    "button",
    "primary",
    t("synthesis-action-open-digest-artifact"),
  );
  open.type = "button";
  open.addEventListener("click", () => openDigestModal(selected));
  card.appendChild(open);
  return card;
}

function renderEvidenceExplorer(detail: TopicDetailDto) {
  const explorer = el("aside", "evidence-explorer");
  const header = el("div", "explorer-head");
  header.appendChild(el("h2", "", t("synthesis-evidence-explorer")));
  const close = el(
    "button",
    "icon-button evidence-drawer-close",
    t("synthesis-action-close"),
  );
  close.type = "button";
  close.title = t("synthesis-evidence-explorer");
  close.addEventListener("click", () => {
    state.evidenceExplorerOpen = false;
    render();
  });
  header.appendChild(close);
  explorer.appendChild(header);
  const rows = evidenceRows(detail);
  if (!rows.length) {
    explorer.appendChild(
      el("div", "empty", t("synthesis-evidence-none-linked")),
    );
    return explorer;
  }
  const selected = selectedEvidence(detail);
  if (!selected) {
    const empty = el("div", "explorer-empty");
    empty.appendChild(el("strong", "", t("synthesis-evidence-none-selected")));
    empty.appendChild(el("p", "muted", t("synthesis-evidence-select-hint")));
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
  panel.setAttribute("aria-label", t("synthesis-evidence-explorer"));
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

type TimelineItem = {
  key: string;
  kind: "paper" | "event";
  year: number;
  label: string;
  title: string;
  order: number;
  evidence?: Record<string, unknown>;
  event?: Record<string, unknown>;
  events?: Record<string, unknown>[];
  weight: number;
  tone:
    | "paper"
    | "milestone"
    | "frontier"
    | "foundation"
    | "external"
    | "warning";
};

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

function timelineEventDescription(
  event: Record<string, unknown> | undefined,
  index: number,
) {
  return (
    firstText(event || {}, [
      "description",
      "analysis",
      "why_it_matters",
      "summary",
    ]) ||
    timelineEventTitle(event) ||
    `Event ${index + 1}`
  );
}

function timelineTooltipLines(item: TimelineItem) {
  if (item.kind !== "event") {
    return [item.title].filter(Boolean);
  }
  const events = item.events?.length
    ? item.events
    : item.event
      ? [item.event]
      : [];
  return events
    .map((event, index) => timelineEventDescription(event, index))
    .filter(Boolean);
}

function timelineItems(detail: TopicDetailDto) {
  const papers = evidenceRows(detail);
  return papers
    .map((evidence, index) => ({
      evidence,
      index,
      year: evidenceYear(evidence),
    }))
    .filter((row) => Number.isFinite(row.year))
    .map(({ evidence, index, year }) => ({
      key: `paper:${evidenceId(evidence) || index}`,
      kind: "paper" as const,
      year,
      label: evidenceCode(evidence, index),
      title: evidenceTitle(evidence, index),
      order: index,
      evidence,
      weight: timelineWeight(evidence, undefined),
      tone: timelineTone(evidence, undefined),
    }));
}

function timelineEventGroups(detail: TopicDetailDto): TimelineItem[] {
  const groups = new Map<number, Record<string, unknown>[]>();
  topicTimelineEvents(detail).forEach((event) => {
    const year = eventYear(event);
    if (!Number.isFinite(year)) return;
    const normalized = Math.floor(year);
    const list = groups.get(normalized) || [];
    list.push(event);
    groups.set(normalized, list);
  });
  return Array.from(groups.entries())
    .sort(([left], [right]) => left - right)
    .map(([year, events], index) => {
      const first = events[0];
      const title =
        events.length === 1
          ? timelineEventTitle(first) || `Milestone ${index + 1}`
          : `${year} milestones (${events.length})`;
      return {
        key: `event:${year}`,
        kind: "event" as const,
        year,
        label: String(year),
        title,
        order: index,
        event: first,
        events,
        weight: 1.24,
        tone: timelineTone(undefined, first),
      };
    });
}

function renderTopicTimeline(detail: TopicDetailDto) {
  const paperItems = timelineItems(detail);
  const milestoneItems = timelineEventGroups(detail);
  const summaryText = firstText(topicTimelineSummary(detail), [
    "text",
    "analysis",
    "overview",
  ]);
  const timelineData: TopicTimelineData = {
    summary: summaryText,
    papers: paperItems.map((item) => ({
      key: item.key,
      year: item.year,
      label: item.label,
      title: item.title,
      order: item.order,
      weight: item.weight,
      tone: item.tone,
      evidence: item.evidence,
      evidenceId: item.evidence ? evidenceId(item.evidence) : "",
      paperRef: firstText(item.evidence || {}, ["paper_ref", "paperRef", "id"]),
      itemKey: firstText(item.evidence || {}, ["item_key", "itemKey"]),
      sortKey: timelineItemSortKey(item),
    })),
    events: milestoneItems.map((item) => ({
      key: item.key,
      year: item.year,
      label: item.label,
      title: item.title,
      order: item.order,
      weight: item.weight,
      tone: item.tone,
      event: item.event,
      descriptions: timelineTooltipLines(item),
      sortKey: timelineItemSortKey(item),
    })),
  };
  return renderSharedTopicTimeline(timelineData, {
    labels: {
      title: t("synthesis-timeline"),
      milestones: t("synthesis-timeline-key-milestones"),
      papers: t("synthesis-timeline-literature-papers"),
      empty: t("synthesis-timeline-empty-dated-papers"),
    },
    selectedEvidenceId: state.selectedEvidenceId,
    renderSummary: renderParagraphs,
    renderEmpty: renderEmptyStructuredState,
    onPaperClick: (paper) => {
      if (!paper.evidence) return;
      openEvidenceExplorer(evidenceId(paper.evidence));
    },
    canClickPaper: (paper) => Boolean(paper.evidence),
    disableUnclickablePapers: true,
  });
}

function renderTopicDetailToolbar(detail: TopicDetailDto, snapshot: Snapshot) {
  const topicId = detail.topicId || snapshot.reader?.topicId || "";
  const updateRow = topicRowById(snapshot, topicId);
  const updateIntent = updateRow ? topicUpdateIntent(updateRow) : null;
  const toolbar = el("div", "toolbar topic-detail-toolbar");
  const meta = el("div", "topic-detail-toolbar-meta");
  meta.appendChild(badge(detail.language || "auto", "blue"));
  meta.appendChild(
    badge(
      t("synthesis-topic-paper-count", {
        count: numberValue(detail.paper_count),
      }),
      "green",
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
    makeButton(t("synthesis-action-back-to-topics"), "selectTab", {
      tab: "artifacts",
    }),
  );
  actions.appendChild(
    makeButton(
      "Update",
      "hostCommand",
      {
        command: "submitTopicSynthesisUpdate",
        args: { topicId },
      },
      false,
      !updateIntent,
    ),
  );
  actions.appendChild(
    makeButton(
      t("synthesis-action-open-citation-subgraph"),
      "openTopicCitationSubgraph",
      {
        topicId,
      },
    ),
  );
  actions.appendChild(
    makeButton(
      t("synthesis-action-export-topic-html"),
      "hostCommand",
      {
        command: "exportTopicDetailHtml",
        args: { topicId, title: detail.title },
      },
      false,
      state.standaloneExport,
    ),
  );
  toolbar.appendChild(actions);
  return toolbar;
}

function renderTopicDetail(main: HTMLElement, snapshot: Snapshot) {
  renderTopicDetailShell(main, snapshot);
}

function renderTopicDetailShell(root: HTMLElement, snapshot: Snapshot) {
  const detail = state.topicDetail;
  const app = el("div", "topic-detail-shell detail-shell-in-workbench");
  if (!detail) {
    app.appendChild(
      renderEmptyState({
        title: t("synthesis-empty-no-topics"),
        message: t("synthesis-topic-open-from-topics"),
        tone: "info",
      }),
    );
    root.appendChild(app);
    return;
  }
  const body = el("section", "topic-detail");
  const workbench = el("div", "topic-detail-layout");
  workbench.appendChild(renderTopicTabs());
  const readerClass =
    state.topicDetailSection === "report"
      ? "topic-reading-surface topic-report-reading-surface"
      : state.topicDetailSection === "citation_graph"
        ? "topic-reading-surface topic-graph-reading-surface"
        : "topic-reading-surface";
  const reader = el("main", readerClass);
  reader.appendChild(
    applyConceptOverlay(renderTopicSection(detail, snapshot), snapshot),
  );
  workbench.appendChild(reader);
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
  const copy = el("button", "", "Copy Markdown");
  copy.type = "button";
  copy.addEventListener("click", () => {
    void navigator.clipboard?.writeText(reader?.markdown || "");
  });
  actions.appendChild(copy);
  header.appendChild(actions);
  panel.appendChild(header);
  if (!reader) {
    panel.appendChild(
      renderEmptyState({
        title: "No artifact selected",
        message: "Open a topic artifact to inspect its structured details.",
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
    textValue(reference.reference_instance_id) ||
    textValue(reference.target_paper_ref) ||
    textValue(reference.target_literature_item_id) ||
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
  const sourceBinding = recordValue(sourceEvidence.binding);
  const sourceEvidenceTitle =
    textValue(sourceEvidence.title) ||
    textValue(sourceEvidence.normalized_title);
  const sourceBindingTitle =
    textValue(sourceBinding.title) ||
    textValue(sourceBinding.paper_ref) ||
    textValue(sourceEvidence.projected_literature_item_id);
  const sourceRowTitle = sourceMatch?.source
    ? textValue(sourceMatch.source.title)
    : "";
  const sourceRowRef = sourceMatch?.source
    ? textValue(sourceMatch.source.paper_ref)
    : "";
  const sourceRowTitleIsFallback =
    !sourceRowTitle ||
    sourceRowTitle === sourceRowRef ||
    sourceRowTitle === textValue(proposal.source_canonical_reference_id) ||
    sourceRowTitle.endsWith("(fallback id)");
  const parentItemTitle = sourceRowTitleIsFallback
    ? sourceBindingTitle ||
      sourceEvidenceTitle ||
      sourceRowTitle ||
      "Unknown parent item"
    : sourceRowTitle;
  return {
    proposal,
    sourceReference: sourceMatch?.reference,
    sourcePaper: sourceMatch?.source,
    targetPaper: targetRow,
    sourceReferenceTitle: sourceMatch?.reference
      ? registryReferenceReadableTitle(sourceMatch.reference)
      : sourceEvidenceTitle ||
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
  if (
    status === "accepted" ||
    status === "approved" ||
    status === "confirmed"
  ) {
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
    action === "delete" ||
    action === "manual_target"
  ) {
    return action;
  }
  return "accept";
}

function normalizeReferenceProposalManualTarget(
  value: unknown,
): ReferenceProposalManualTarget | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const input = value as Record<string, unknown>;
  if (textValue(input.kind) === "canonical_reference") {
    const canonicalReferenceId = textValue(
      input.canonicalReferenceId || input.canonical_reference_id,
    );
    return canonicalReferenceId
      ? { kind: "canonical_reference", canonicalReferenceId }
      : undefined;
  }
  if (textValue(input.kind) === "zotero_item") {
    const itemKey = textValue(input.itemKey || input.item_key);
    return itemKey
      ? {
          kind: "zotero_item",
          libraryId: Math.max(
            0,
            Math.floor(Number(input.libraryId || input.library_id) || 0),
          ),
          itemKey,
        }
      : undefined;
  }
  return undefined;
}

function referenceProposalDecisionArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((entry) => ({
          proposalId: textValue(entry.proposalId || entry.proposal_id),
          action: normalizeReferenceProposalAction(entry.action),
          target: normalizeReferenceProposalManualTarget(entry.target),
          targetLabel: textValue(entry.targetLabel || entry.target_label),
        }))
        .filter(
          (entry) =>
            entry.proposalId &&
            (entry.action !== "manual_target" || Boolean(entry.target)),
        )
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
  options: {
    target?: ReferenceProposalManualTarget;
    targetLabel?: string;
  } = {},
) {
  if (
    !proposalId ||
    isReferenceProposalDecisionSubmitting(proposalId) ||
    (action === "manual_target" && !options.target)
  ) {
    return;
  }
  state.pendingReferenceProposalDecisions.set(proposalId, {
    proposalId,
    action,
    target: options.target,
    targetLabel: textValue(options.targetLabel) || undefined,
    createdAt: Date.now(),
  });
  state.manualTargetPicker = undefined;
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
  ).map((decision) =>
    decision.action === "manual_target"
      ? {
          proposalId: decision.proposalId,
          action: decision.action,
          target: decision.target,
          targetLabel: decision.targetLabel,
        }
      : {
          proposalId: decision.proposalId,
          action: decision.action,
        },
  );
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
  const labels: Record<ReferenceProposalAction, SynthesisWorkbenchMessageKey> =
    {
      accept: "synthesis-action-accept",
      reverse_accept: "synthesis-action-reverse-accept",
      reject: "synthesis-action-reject",
      reopen: "synthesis-action-reopen",
      delete: "synthesis-action-delete",
      manual_target: "synthesis-action-manual-target",
    };
  return t(labels[action] || "synthesis-action-delete");
}

function referenceProposalPendingLabel(
  pending: PendingReferenceProposalDecision,
) {
  const label = referenceProposalActionLabel(pending.action);
  return pending.action === "manual_target" && pending.targetLabel
    ? `${label}: ${pending.targetLabel}`
    : label;
}

function renderReferenceProposalPendingControls() {
  const pendingCount = state.pendingReferenceProposalDecisions.size;
  const submitting = isReferenceProposalDecisionSubmitting();
  const controls = el("div", "reference-review-pending-controls");
  const apply = makeLocalButton(
    submitting
      ? t("synthesis-action-applying-pending")
      : t("synthesis-action-apply-pending"),
    () => applyPendingReferenceProposalDecisions(),
  );
  apply.disabled = pendingCount === 0 || submitting;
  if (submitting) {
    apply.classList.add("is-busy");
    apply.setAttribute("aria-busy", "true");
    apply.title = t("synthesis-reference-review-applying-pending");
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
      makeLocalButton(t("synthesis-action-clear-pending"), () => {
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
  th.appendChild(el("span", "registry-column-header-label", uiText(label)));
  if (options.subtitle) {
    th.appendChild(
      el("span", "registry-column-header-subtitle", uiText(options.subtitle)),
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
    [reference.year || "-", "registry-center-cell"],
    ["-"],
    ["-", "registry-artifacts-cell"],
    [renderRegistryReferenceStatus(reference), "registry-center-cell"],
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
        : "Refresh the reference sidecar after generating literature-analysis references.",
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
      [reference.year || "-", "registry-center-cell"],
      [renderRegistryReferenceStatus(reference), "registry-center-cell"],
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
    [row.year || "-", "registry-center-cell"],
    [
      badge(row.artifactCoverage, toneFor(row.artifactCoverage)),
      "registry-center-cell",
    ],
    [renderRegistryArtifacts(row), "registry-artifacts-cell"],
    [
      badge(textValue(row.index_scope, "library"), "ok"),
      "registry-center-cell",
    ],
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
  if (!pending) {
    const manualTarget = makeLocalButton(
      "Manual target",
      (event) =>
        openReferenceManualTargetPicker(
          proposalId,
          context.sourceReferenceTitle,
          event.currentTarget instanceof HTMLElement
            ? event.currentTarget
            : undefined,
        ),
      state.manualTargetPicker?.proposalId === proposalId,
    );
    actions.push(manualTarget);
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
      ? t("synthesis-review-pending-body", {
          action: referenceProposalPendingLabel(pending),
        })
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
    ].filter(Boolean) as HTMLElement[],
    badges: pending
      ? [
          [
            t("synthesis-review-pending-action", {
              action: referenceProposalPendingLabel(pending),
            }),
            "warn",
          ],
        ]
      : undefined,
    actions,
  });
}

function isCanonicalRevisionProposal(proposal: Record<string, unknown>) {
  return (
    textValue(proposal.review_kind || proposal.kind) === "canonical_revision"
  );
}

function canonicalRevisionReviewContext(proposal: Record<string, unknown>) {
  const sourceTitle =
    textValue(proposal.reference_title) ||
    textValue(proposal.source_paper_title) ||
    textValue(proposal.source_paper_ref, "Canonical reference");
  const targetTitle =
    textValue(proposal.target_paper_title) ||
    textValue(proposal.target_work_title) ||
    textValue(proposal.target_paper_ref) ||
    t("synthesis-review-canonical-no-successor");
  return {
    sourceTitle,
    targetTitle,
    reason:
      textValue(proposal.reason) ||
      textValue(proposal.decision_summary) ||
      t("synthesis-review-canonical-revision-body"),
  };
}

function canonicalRevisionReviewActionButtons(
  proposal: Record<string, unknown>,
) {
  const reviewItemId = textValue(proposal.proposal_id);
  if (
    !reviewItemId ||
    textValue(proposal.status, "open") !== "open" ||
    isReviewOptimisticallyResolved("canonical-revision", reviewItemId)
  ) {
    return [];
  }
  return [
    makeButton(t("synthesis-action-accept"), "hostCommand", {
      command: "applyCanonicalRevisionReviewAction",
      args: { reviewItemId, action: "accept" },
    }),
    makeButton(t("synthesis-action-reject"), "hostCommand", {
      command: "applyCanonicalRevisionReviewAction",
      args: { reviewItemId, action: "reject" },
    }),
  ];
}

function renderCanonicalRevisionReviewActions(
  proposal: Record<string, unknown>,
) {
  const actions = el("div", "review-table-actions");
  const buttons = canonicalRevisionReviewActionButtons(proposal);
  if (buttons.length) {
    buttons.forEach((button) => actions.appendChild(button));
  } else {
    actions.appendChild(
      el("span", "muted", t("synthesis-review-managed-by-canonical")),
    );
  }
  return actions;
}

function renderCanonicalRevisionReviewCard(proposal: Record<string, unknown>) {
  const context = canonicalRevisionReviewContext(proposal);
  return renderReviewCard({
    kind: enumLabel("kind", "canonical_revision"),
    title: t("synthesis-review-canonical-revision-title"),
    showKindBadge: false,
    body: context.reason,
    details: [
      ["kind", proposal.review_kind || proposal.kind],
      ["status", proposal.status],
      ["blocked by", proposal.blocked_by_review_item_id],
      ["diagnostics", proposal.diagnostics],
      ["proposal id", proposal.proposal_id],
    ],
    primaryChildren: [
      renderReferenceMatchDecisionSummary({
        source: context.sourceTitle,
        target: context.targetTitle,
      }),
    ],
    actions: canonicalRevisionReviewActionButtons(proposal),
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
      : isCanonicalRevisionProposal(item.proposal)
        ? renderCanonicalRevisionReviewCard(item.proposal)
        : renderCleanupReviewCard(item.proposal),
  );
  return drawer;
}

function renderIndex(main: HTMLElement, snapshot: Snapshot) {
  const panel = el("div", "panel");
  const activeIndexTool = textValue(snapshot.registry.filters.activeIndexTool);
  if (activeIndexTool === "revise_canonicals") {
    const filters = el("div", "filters");
    filters.appendChild(
      makeLocalButton(t("synthesis-action-back-to-index"), () =>
        sendAction("setFilters", {
          registry: { activeIndexTool: "none", selectedCanonicalRowId: "" },
        }),
      ),
    );
    filters.appendChild(
      badge(
        t("synthesis-index-reference-sidecar", {
          status: maybeLocalizedValue(
            textValue(snapshot.registry.cacheStatus?.status, "missing"),
          ),
        }),
        toneFor(snapshot.registry.cacheStatus?.status),
      ),
    );
    filters.appendChild(
      makeButton(
        t("synthesis-action-refresh"),
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
        t("synthesis-action-advanced-matching"),
        "hostCommand",
        {
          command: "runAdvancedReferenceMatchingNow",
        },
        false,
        isOperationPending("runAdvancedReferenceMatchingNow"),
      ),
    );
    panel.appendChild(renderPanelToolbar(filters));
    panel.appendChild(renderCanonicalRevisionWorkbench(snapshot));
    main.appendChild(panel);
    return;
  }
  const filters = el("div", "filters");
  const search = el("input");
  search.placeholder = t("synthesis-search");
  search.value = textValue(snapshot.registry.filters.search);
  search.addEventListener("input", () =>
    sendAction("setFilters", { registry: { search: search.value } }),
  );
  filters.appendChild(search);
  filters.appendChild(
    selectControlWithLabels(
      [
        [
          "library",
          filterOptionLabel("synthesis-filter-scope", "scope", "library"),
        ],
        [
          "referenced",
          filterOptionLabel("synthesis-filter-scope", "scope", "referenced"),
        ],
        ["all", filterOptionLabel("synthesis-filter-scope", "scope", "all")],
      ],
      textValue(snapshot.registry.filters.scope, "library"),
      (scope) => sendAction("setFilters", { registry: { scope } }),
    ),
  );
  if (textValue(snapshot.registry.filters.scope) !== "referenced") {
    filters.appendChild(
      selectControlWithLabels(
        [
          [
            "all",
            filterOptionLabel("synthesis-filter-coverage", "coverage", "all"),
          ],
          [
            "complete",
            filterOptionLabel(
              "synthesis-filter-coverage",
              "coverage",
              "complete",
            ),
          ],
          [
            "partial",
            filterOptionLabel(
              "synthesis-filter-coverage",
              "coverage",
              "partial",
            ),
          ],
          [
            "missing",
            filterOptionLabel(
              "synthesis-filter-coverage",
              "coverage",
              "missing",
            ),
          ],
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
          [
            "all",
            filterOptionLabel("synthesis-filter-binding", "status", "all"),
          ],
          [
            "unbound",
            filterOptionLabel("synthesis-filter-binding", "status", "unbound"),
          ],
          [
            "candidate",
            filterOptionLabel(
              "synthesis-filter-binding",
              "binding-status",
              "candidate",
            ),
          ],
          [
            "accepted",
            filterOptionLabel(
              "synthesis-filter-binding",
              "binding-status",
              "accepted",
            ),
          ],
          [
            "rejected",
            filterOptionLabel(
              "synthesis-filter-binding",
              "binding-status",
              "rejected",
            ),
          ],
          [
            "stale_target",
            filterOptionLabel(
              "synthesis-filter-binding",
              "binding-status",
              "stale_target",
            ),
          ],
        ],
        textValue(snapshot.registry.filters.bindingStatus, "all"),
        (bindingStatus) =>
          sendAction("setFilters", { registry: { bindingStatus } }),
      ),
    );
  }
  filters.appendChild(
    badge(
      t("synthesis-index-reference-sidecar", {
        status: maybeLocalizedValue(
          textValue(snapshot.registry.cacheStatus?.status, "missing"),
        ),
      }),
      toneFor(snapshot.registry.cacheStatus?.status),
    ),
  );
  filters.appendChild(
    makeButton(
      t("synthesis-action-refresh"),
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
      t("synthesis-action-advanced-matching"),
      "hostCommand",
      {
        command: "runAdvancedReferenceMatchingNow",
      },
      false,
      isOperationPending("runAdvancedReferenceMatchingNow"),
    ),
  );
  filters.appendChild(
    makeLocalButton(t("synthesis-canonical-revise-title"), () =>
      sendAction("setFilters", {
        registry: { activeIndexTool: "revise_canonicals" },
      }),
    ),
  );
  if (snapshot.registry.cacheStatus?.status === "failed") {
    filters.appendChild(
      makeButton(t("synthesis-action-retry"), "hostCommand", {
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

function canonicalRows(snapshot: Snapshot) {
  return (snapshot.registry.visibleCanonicalRows ||
    snapshot.registry.canonicalRows ||
    []) as Array<Record<string, unknown>>;
}

function allCanonicalRows(snapshot: Snapshot) {
  return (snapshot.registry.canonicalRows || []) as Array<
    Record<string, unknown>
  >;
}

function pendingCanonicalMergeSourceIds() {
  return new Set(
    Array.from(state.pendingCanonicalMergeRequests.values()).map(
      (request) => request.sourceEffectiveCanonicalId,
    ),
  );
}

function canonicalRowId(row: Record<string, unknown>) {
  return (
    textValue(row.row_id) ||
    textValue(row.projected_literature_item_id) ||
    textValue(row.effective_canonical_id)
  );
}

function canonicalEffectiveId(row: Record<string, unknown>) {
  return textValue(row.effective_canonical_id);
}

function visibleCanonicalRowsForRevision(snapshot: Snapshot) {
  const pendingSources = pendingCanonicalMergeSourceIds();
  return canonicalRows(snapshot).filter(
    (row) => !pendingSources.has(canonicalEffectiveId(row)),
  );
}

function canonicalRowByRowId(snapshot: Snapshot, rowId: string) {
  return allCanonicalRows(snapshot).find(
    (row) => canonicalRowId(row) === rowId,
  );
}

function canonicalPendingMergeKey(source: string, target: string) {
  return `${source}->${target}`;
}

function setCanonicalMergeSources(rowIds: string[]) {
  state.canonicalMergeSourceRowIds = new Set(rowIds.filter(Boolean));
  render();
}

function clearCanonicalMergeMode() {
  if (!state.canonicalMergeSourceRowIds.size) return;
  state.canonicalMergeSourceRowIds.clear();
  render();
}

function queueCanonicalMergeTarget(
  snapshot: Snapshot,
  target: Record<string, unknown>,
) {
  const targetEffectiveCanonicalId = canonicalEffectiveId(target);
  if (!targetEffectiveCanonicalId) return;
  state.canonicalMergeSourceRowIds.forEach((sourceRowId) => {
    const source = canonicalRowByRowId(snapshot, sourceRowId);
    if (!source) return;
    const sourceEffectiveCanonicalId = canonicalEffectiveId(source);
    if (
      !sourceEffectiveCanonicalId ||
      sourceEffectiveCanonicalId === targetEffectiveCanonicalId
    ) {
      return;
    }
    state.pendingCanonicalMergeRequests.set(
      canonicalPendingMergeKey(
        sourceEffectiveCanonicalId,
        targetEffectiveCanonicalId,
      ),
      {
        sourceEffectiveCanonicalId,
        targetEffectiveCanonicalId,
        sourceTitle: textValue(source.title, sourceEffectiveCanonicalId),
        targetTitle: textValue(target.title, targetEffectiveCanonicalId),
        createdAt: Date.now(),
      },
    );
  });
  state.canonicalMergeSourceRowIds.clear();
  state.selectedCanonicalRowIds.clear();
  render();
}

function clearPendingCanonicalMerges() {
  if (state.canonicalMergeSubmission) return;
  state.pendingCanonicalMergeRequests.clear();
  state.canonicalMergeSourceRowIds.clear();
  render();
}

function applyPendingCanonicalMerges() {
  const requests = Array.from(state.pendingCanonicalMergeRequests.values()).map(
    (request) => ({
      sourceEffectiveCanonicalId: request.sourceEffectiveCanonicalId,
      targetEffectiveCanonicalId: request.targetEffectiveCanonicalId,
    }),
  );
  if (!requests.length) return;
  state.canonicalMergeSubmission = {
    operationKey: operationKey("applyCanonicalRevisionMergeRequests"),
    sourceEffectiveCanonicalIds: requests.map(
      (request) => request.sourceEffectiveCanonicalId,
    ),
  };
  state.canonicalMergeSourceRowIds.clear();
  state.selectedCanonicalRowIds.clear();
  sendAction("hostCommand", {
    command: "applyCanonicalRevisionMergeRequests",
    args: { requests },
  });
  render();
}

function canonicalRowBindingLabel(row: Record<string, unknown>) {
  const binding = recordValue(row.binding);
  return binding.itemKey
    ? textValue(binding.paperRef) ||
        `${textValue(binding.libraryId)}:${textValue(binding.itemKey)}`
    : "External";
}

function canonicalAuthorsForEdit(row: Record<string, unknown>) {
  return normalizeStringArray(row.authors);
}

function canonicalIdentifierDrafts(row: Record<string, unknown>) {
  const identifiers = canonicalRecordArray(row.identifiers_list)
    .map((entry) => ({
      kind: textValue(entry.kind),
      value: textValue(entry.value),
    }))
    .filter((entry) => entry.kind || entry.value);
  if (identifiers.length) {
    return identifiers;
  }
  return Object.entries(recordValue(row.identifiers))
    .map(([kind, value]) => ({ kind, value: textValue(value) }))
    .filter((entry) => entry.kind || entry.value);
}

function canonicalEditDraftFromRecord(
  row: Record<string, unknown>,
): CanonicalEditDraft {
  return {
    title: textValue(row.title),
    year: textValue(row.year),
    authorsText: canonicalAuthorsForEdit(row).join("\n"),
    identifiers: canonicalIdentifierDrafts(row),
  };
}

function canonicalEditComparableDraft(draft: CanonicalEditDraft) {
  return {
    title: draft.title.trim(),
    year: draft.year.trim(),
    authors: draft.authorsText
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean),
    identifiers: draft.identifiers
      .map((entry) => ({
        kind: entry.kind.trim(),
        value: entry.value.trim(),
      }))
      .filter((entry) => entry.kind || entry.value),
  };
}

function canonicalEditDraftForRow(row: Record<string, unknown>) {
  const rowId = canonicalRowId(row);
  const existing = state.canonicalEditDrafts.get(rowId);
  if (existing) {
    return existing;
  }
  return canonicalEditDraftFromRecord(row);
}

function setCanonicalEditDraft(
  row: Record<string, unknown>,
  draft: CanonicalEditDraft,
) {
  state.canonicalEditDrafts.set(canonicalRowId(row), draft);
  render();
}

function canonicalEditIsDirty(row: Record<string, unknown>) {
  const draft = state.canonicalEditDrafts.get(canonicalRowId(row));
  if (!draft) {
    return false;
  }
  return (
    JSON.stringify(canonicalEditComparableDraft(draft)) !==
    JSON.stringify(
      canonicalEditComparableDraft(canonicalEditDraftFromRecord(row)),
    )
  );
}

function canonicalEditPatch(draft: CanonicalEditDraft) {
  const comparable = canonicalEditComparableDraft(draft);
  const identifiers: Record<string, string> = {};
  comparable.identifiers.forEach((entry) => {
    if (entry.kind && entry.value) {
      identifiers[entry.kind] = entry.value;
    }
  });
  return {
    title: comparable.title,
    year: comparable.year,
    authors: comparable.authors,
    identifiers,
  };
}

function toggleCanonicalEdit(row: Record<string, unknown>) {
  const rowId = canonicalRowId(row);
  if (!rowId) return;
  sendAction("setFilters", {
    registry: { selectedCanonicalRowId: rowId },
  });
  state.canonicalEditOpenRowId =
    state.canonicalEditOpenRowId === rowId ? undefined : rowId;
  if (state.canonicalEditOpenRowId) {
    state.canonicalDetailCollapsed = false;
  }
  render();
}

function canonicalIncomingRedirectSources(row: Record<string, unknown>) {
  return canonicalRecordArray(row.incoming_redirects)
    .map((redirect) => recordValue(redirect.from))
    .filter((entry) => textValue(entry.canonical_reference_id));
}

function canonicalActionAllowed(
  row: Record<string, unknown>,
  action: "merge" | "edit" | "archive",
) {
  const availability = recordValue(
    recordValue(row.action_availability)[action],
  );
  return Boolean(availability.allowed);
}

function canonicalActionBlockers(
  row: Record<string, unknown>,
  action: "merge" | "edit" | "archive",
) {
  const availability = recordValue(
    recordValue(row.action_availability)[action],
  );
  return (
    normalizeStringArray(availability.blockers).join(", ") ||
    textValue(availability.reason) ||
    "Unavailable"
  );
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => textValue(entry)).filter(Boolean)
    : textValue(value)
      ? [textValue(value)]
      : [];
}

function renderCanonicalRevisionWorkbench(snapshot: Snapshot) {
  const wrap = el("div", "canonical-revision-workbench");
  const rows = visibleCanonicalRowsForRevision(snapshot);
  const allRows = allCanonicalRows(snapshot);
  const boundCount = allRows.filter(
    (row) => recordValue(row.binding).itemKey,
  ).length;
  const duplicateCount = allRows.filter((row) =>
    textValue(row.possible_duplicate_group),
  ).length;
  const blockedCount = allRows.filter(
    (row) =>
      !canonicalActionAllowed(row, "merge") &&
      !canonicalActionAllowed(row, "edit") &&
      !canonicalActionAllowed(row, "archive"),
  ).length;
  const header = el("div", "canonical-revision-header");
  const title = el("div", "canonical-revision-title");
  title.appendChild(el("strong", "", t("synthesis-canonical-revise-title")));
  title.appendChild(
    el("span", "muted", t("synthesis-canonical-revise-subtitle")),
  );
  header.appendChild(title);
  const summary = el("div", "canonical-summary-strip");
  [
    [
      `${rows.length}/${allRows.length}`,
      t("synthesis-canonical-summary-shown"),
    ],
    [`${allRows.length}`, t("synthesis-canonical-summary-effective")],
    [`${boundCount}`, t("synthesis-canonical-summary-bound")],
    [
      `${Math.max(0, allRows.length - boundCount)}`,
      t("synthesis-canonical-summary-external"),
    ],
    [`${duplicateCount}`, t("synthesis-canonical-summary-possible-dupes")],
    [`${blockedCount}`, t("synthesis-canonical-summary-blocked")],
    [
      maybeLocalizedValue(
        textValue(snapshot.registry.cacheStatus?.status, "missing"),
      ),
      t("synthesis-canonical-summary-sidecar"),
    ],
  ].forEach(([value, label]) => {
    const item = el("div", "canonical-summary-item");
    item.appendChild(el("strong", "", value));
    item.appendChild(el("span", "muted", label));
    summary.appendChild(item);
  });
  header.appendChild(summary);
  wrap.appendChild(header);
  const filters = el("div", "filters canonical-filters");
  const search = el("input");
  search.placeholder = t("synthesis-canonical-search");
  search.value = textValue(snapshot.registry.filters.canonicalSearch);
  search.addEventListener("input", () =>
    sendAction("setFilters", {
      registry: { canonicalSearch: search.value },
    }),
  );
  filters.appendChild(search);
  filters.appendChild(
    selectControlWithLabels(
      [
        ["all", filterOptionLabel("synthesis-filter-binding", "status", "all")],
        [
          "bound",
          filterOptionLabel(
            "synthesis-filter-binding",
            "binding-status",
            "accepted",
          ),
        ],
        [
          "external",
          `${t("synthesis-filter-binding")}: ${t("synthesis-canonical-summary-external")}`,
        ],
      ],
      textValue(snapshot.registry.filters.canonicalBinding, "all"),
      (canonicalBinding) =>
        sendAction("setFilters", { registry: { canonicalBinding } }),
    ),
  );
  filters.appendChild(
    selectControlWithLabels(
      [
        ["all", filterOptionLabel("synthesis-filter-graph", "status", "all")],
        [
          "visible",
          `${t("synthesis-filter-graph")}: ${t("synthesis-canonical-visible")}`,
        ],
        [
          "not_in_graph",
          `${t("synthesis-filter-graph")}: ${t("synthesis-canonical-not-in-graph")}`,
        ],
      ],
      textValue(snapshot.registry.filters.canonicalGraph, "all"),
      (canonicalGraph) =>
        sendAction("setFilters", { registry: { canonicalGraph } }),
    ),
  );
  filters.appendChild(
    selectControlWithLabels(
      [
        [
          "all",
          filterOptionLabel("synthesis-filter-duplicates", "status", "all"),
        ],
        [
          "possible_duplicate",
          `${t("synthesis-filter-duplicates")}: ${t("synthesis-canonical-summary-possible-dupes")}`,
        ],
      ],
      textValue(snapshot.registry.filters.canonicalDuplicates, "all"),
      (canonicalDuplicates) =>
        sendAction("setFilters", { registry: { canonicalDuplicates } }),
    ),
  );
  const mergeBar = renderCanonicalMergeBar(snapshot, rows);
  if (mergeBar) {
    filters.appendChild(mergeBar);
  }
  wrap.appendChild(filters);
  const selected =
    allRows.find(
      (row) =>
        canonicalRowId(row) ===
        textValue(snapshot.registry.filters.selectedCanonicalRowId),
    ) || rows[0];
  const layout = el("div", "canonical-revision-layout");
  layout.appendChild(renderCanonicalRevisionTable(snapshot, rows));
  if (selected) {
    layout.appendChild(renderCanonicalDetailDrawer(selected));
  }
  wrap.appendChild(layout);
  return wrap;
}

function selectedVisibleCanonicalRowIds(rows: Array<Record<string, unknown>>) {
  const visible = new Set(rows.map(canonicalRowId).filter(Boolean));
  state.selectedCanonicalRowIds.forEach((rowId) => {
    if (!visible.has(rowId)) {
      state.selectedCanonicalRowIds.delete(rowId);
    }
  });
  return Array.from(state.selectedCanonicalRowIds).filter((rowId) =>
    visible.has(rowId),
  );
}

function setAllCanonicalRowSelection(
  rows: Array<Record<string, unknown>>,
  checked: boolean,
) {
  if (checked) {
    rows
      .map(canonicalRowId)
      .filter(Boolean)
      .forEach((rowId) => state.selectedCanonicalRowIds.add(rowId));
  } else {
    rows
      .map(canonicalRowId)
      .filter(Boolean)
      .forEach((rowId) => state.selectedCanonicalRowIds.delete(rowId));
  }
  render();
}

function toggleCanonicalRowSelection(rowId: string, checked: boolean) {
  if (!rowId) return;
  if (checked) {
    state.selectedCanonicalRowIds.add(rowId);
  } else {
    state.selectedCanonicalRowIds.delete(rowId);
  }
  render();
}

function renderCanonicalMergeBar(
  snapshot: Snapshot,
  rows: Array<Record<string, unknown>>,
) {
  const selectedIds = selectedVisibleCanonicalRowIds(rows);
  const pending = Array.from(state.pendingCanonicalMergeRequests.values());
  const applying = Boolean(
    state.canonicalMergeSubmission ||
    isOperationPending("applyCanonicalRevisionMergeRequests"),
  );
  const bar = el("div", "canonical-merge-bar");
  const mergeSelected = makeLocalButton(
    t("synthesis-action-merge-selected"),
    () => setCanonicalMergeSources(selectedIds),
  );
  mergeSelected.disabled =
    applying ||
    selectedIds.length === 0 ||
    state.canonicalMergeSourceRowIds.size > 0;
  bar.appendChild(mergeSelected);
  if (state.canonicalMergeSourceRowIds.size) {
    bar.appendChild(
      badge(`${state.canonicalMergeSourceRowIds.size} source(s)`, "warn"),
    );
    bar.appendChild(
      makeLocalButton(
        t("synthesis-action-cancel-target-picking"),
        clearCanonicalMergeMode,
      ),
    );
  }
  if (pending.length) {
    const label = el(
      "span",
      "canonical-pending-summary",
      applying
        ? `Applying ${pending.length} pending merge(s)`
        : `${pending.length} pending merge(s)`,
    );
    label.title = pending
      .map((request) => `${request.sourceTitle} -> ${request.targetTitle}`)
      .join("\n");
    bar.appendChild(label);
    const apply = makeLocalButton("Apply pending", applyPendingCanonicalMerges);
    apply.disabled = applying;
    bar.appendChild(apply);
    const clear = makeLocalButton(
      t("synthesis-action-clear-pending"),
      clearPendingCanonicalMerges,
    );
    clear.disabled = applying;
    bar.appendChild(clear);
  }
  if (!bar.childNodes.length) {
    return null;
  }
  return bar;
}

function renderCanonicalRevisionTable(
  snapshot: Snapshot,
  rows: Array<Record<string, unknown>>,
) {
  if (!rows.length) {
    return renderEmptyState({
      title: t("synthesis-canonical-no-references"),
      message: t("synthesis-canonical-no-references-message"),
      tone: "info",
    });
  }
  const shell = el("div", "canonical-table-shell");
  const index = el("div", "reference-target-index canonical-letter-index");
  const wrap = el("div", "table-wrap registry-table-wrap canonical-table-wrap");
  wrap.dataset.synthesisScrollKey = "registry.canonical.table";
  const availableGroups = new Set(
    rows.map((row) => referenceTargetCandidateGroup(textValue(row.title))),
  );
  ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].forEach((group) => {
    const button = makeLocalButton(group, () =>
      scrollReferenceTargetListToGroup(wrap, group),
    );
    button.disabled = !availableGroups.has(group);
    index.appendChild(button);
  });
  const table = el("table", "registry-table canonical-table");
  appendRegistryColgroup(table, [
    "canonical-select",
    "canonical-title",
    "canonical-year",
    "canonical-binding",
    "canonical-graph",
    "canonical-count",
    "canonical-redirects",
    "canonical-reviews",
    "canonical-actions",
  ]);
  const thead = el("thead");
  const head = el("tr");
  const selectedIds = selectedVisibleCanonicalRowIds(rows);
  const selectAllCell = el("th", "registry-center-cell");
  const selectAll = el("input") as HTMLInputElement;
  selectAll.type = "checkbox";
  selectAll.checked =
    selectedIds.length > 0 && selectedIds.length === rows.length;
  selectAll.indeterminate =
    selectedIds.length > 0 && selectedIds.length < rows.length;
  selectAll.setAttribute("aria-label", t("synthesis-canonical-select-all"));
  selectAll.addEventListener("change", () =>
    setAllCanonicalRowSelection(rows, selectAll.checked),
  );
  selectAllCell.appendChild(selectAll);
  head.appendChild(selectAllCell);
  [
    "Title",
    "Year",
    "Binding",
    "Graph",
    "Raw refs",
    "Pointed by",
    "Reviews",
    "Actions",
  ].forEach((label) => head.appendChild(renderRegistryHeader(label)));
  thead.appendChild(head);
  table.appendChild(thead);
  const tbody = el("tbody");
  const selectedRowId =
    textValue(snapshot.registry.filters.selectedCanonicalRowId) ||
    canonicalRowId(rows[0] || {});
  const seenGroups = new Set<string>();
  rows.forEach((row) => {
    const rowId = canonicalRowId(row);
    const selected = rowId === selectedRowId;
    const isMergeSource = state.canonicalMergeSourceRowIds.has(rowId);
    const group = referenceTargetCandidateGroup(textValue(row.title));
    const tr = el(
      "tr",
      [
        "registry-parent-row",
        "canonical-row",
        selected ? "selected" : "",
        isMergeSource ? "merge-source" : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
    tr.tabIndex = 0;
    tr.setAttribute("aria-selected", selected ? "true" : "false");
    tr.dataset.referenceTargetGroup = group;
    if (!seenGroups.has(group)) {
      tr.dataset.referenceTargetGroupStart = group;
      seenGroups.add(group);
    }
    tr.addEventListener("click", () =>
      rowId && rowId !== selectedRowId
        ? sendAction("setFilters", {
            registry: { selectedCanonicalRowId: rowId },
          })
        : undefined,
    );
    tr.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      if (rowId && rowId !== selectedRowId) {
        sendAction("setFilters", {
          registry: { selectedCanonicalRowId: rowId },
        });
      }
    });
    const title = el("div", "registry-reference-title-cell");
    const label = textValue(row.title);
    title.title = label;
    title.appendChild(el("span", "registry-reference-parent-title", label));
    title.appendChild(
      el(
        "span",
        "registry-reference-muted",
        textValue(row.projected_literature_item_id),
      ),
    );
    const selectionCell = el(
      "td",
      "registry-center-cell canonical-select-cell",
    );
    const checkbox = el("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = state.selectedCanonicalRowIds.has(rowId);
    checkbox.disabled = state.canonicalMergeSourceRowIds.size > 0;
    checkbox.setAttribute(
      "aria-label",
      t("synthesis-canonical-select-row", { label: label || rowId }),
    );
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", () =>
      toggleCanonicalRowSelection(rowId, checkbox.checked),
    );
    selectionCell.appendChild(checkbox);
    tr.appendChild(selectionCell);
    [
      [title],
      [textValue(row.year, "-"), "registry-center-cell"],
      [
        badge(
          canonicalRowBindingLabel(row),
          recordValue(row.binding).itemKey ? "ok" : "orange",
        ),
        "registry-center-cell",
      ],
      [
        badge(
          textValue(row.graph_node_id)
            ? t("synthesis-canonical-visible")
            : t("synthesis-canonical-not-in-graph"),
          textValue(row.graph_node_id) ? "ok" : "danger",
        ),
        "registry-center-cell",
      ],
      [textValue(row.raw_reference_count, "0"), "registry-center-cell"],
      [textValue(row.incoming_redirect_count, "0"), "registry-center-cell"],
      [textValue(row.proposal_count, "0"), "registry-center-cell"],
      [renderCanonicalRowActions(snapshot, row), "registry-center-cell"],
    ].forEach(([value, className]) =>
      appendRegistryCell(tr, value, textValue(className)),
    );
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  shell.appendChild(index);
  shell.appendChild(wrap);
  return shell;
}

function renderCanonicalRowActions(
  snapshot: Snapshot,
  row: Record<string, unknown>,
) {
  const controls = el("div", "canonical-row-actions");
  const rowId = canonicalRowId(row);
  const mergeSourceActive = state.canonicalMergeSourceRowIds.size > 0;
  if (mergeSourceActive) {
    const isSource = state.canonicalMergeSourceRowIds.has(rowId);
    const target = makeLocalButton(
      isSource ? t("synthesis-action-source") : t("synthesis-action-target"),
      () => queueCanonicalMergeTarget(snapshot, row),
    );
    target.disabled = isSource || !canonicalActionAllowed(row, "merge");
    target.title = isSource
      ? t("synthesis-canonical-merge-source-selected")
      : target.disabled
        ? canonicalActionBlockers(row, "merge")
        : t("synthesis-canonical-use-merge-target");
    controls.appendChild(target);
  } else {
    const merge = makeLocalButton(t("synthesis-action-merge"), () =>
      setCanonicalMergeSources([rowId]),
    );
    merge.disabled = !canonicalActionAllowed(row, "merge");
    merge.title = merge.disabled
      ? canonicalActionBlockers(row, "merge")
      : t("synthesis-canonical-select-merge-source");
    controls.appendChild(merge);
  }
  const edit = makeLocalButton(t("synthesis-action-edit"), () =>
    toggleCanonicalEdit(row),
  );
  edit.disabled = !canonicalActionAllowed(row, "edit");
  edit.dataset.canonicalEditRowId = rowId;
  edit.classList.toggle("is-dirty", canonicalEditIsDirty(row));
  edit.classList.toggle(
    "active",
    state.canonicalEditOpenRowId === canonicalRowId(row),
  );
  edit.title = edit.disabled
    ? canonicalActionBlockers(row, "edit")
    : canonicalEditIsDirty(row)
      ? t("synthesis-canonical-unsaved-metadata")
      : t("synthesis-canonical-edit-metadata");
  controls.appendChild(edit);
  const archive = makeLocalButton(t("synthesis-action-archive"), () =>
    sendAction("hostCommand", {
      command: "archiveCanonicalReference",
      args: { canonicalReferenceId: textValue(row.effective_canonical_id) },
    }),
  );
  archive.disabled = !canonicalActionAllowed(row, "archive");
  archive.title = archive.disabled
    ? canonicalActionBlockers(row, "archive")
    : t("synthesis-canonical-archive-empty");
  controls.appendChild(archive);
  return controls;
}

function canonicalRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object",
      )
    : [];
}

function renderCanonicalIdentifierList(row: Record<string, unknown>) {
  const identifiers = canonicalRecordArray(row.identifiers_list);
  if (!identifiers.length) {
    const record = recordValue(row.identifiers);
    Object.entries(record).forEach(([kind, value]) => {
      const normalized = textValue(value);
      if (kind && normalized) {
        identifiers.push({ kind, value: normalized });
      }
    });
  }
  if (!identifiers.length) {
    return el("span", "muted", t("synthesis-canonical-no-identifiers"));
  }
  const list = el("div", "canonical-chip-list");
  identifiers.forEach((identifier) => {
    const kind = textValue(identifier.kind).toUpperCase();
    const value = textValue(identifier.value);
    const chip = el("span", "canonical-info-chip");
    chip.appendChild(el("strong", "", kind));
    chip.appendChild(el("span", "", value));
    list.appendChild(chip);
  });
  return list;
}

function renderCanonicalBinding(row: Record<string, unknown>) {
  const binding = recordValue(row.binding);
  if (!binding.itemKey) {
    return el("span", "muted", t("synthesis-canonical-external-unbound"));
  }
  const block = el("div", "canonical-readable-block");
  block.appendChild(
    el("strong", "", textValue(binding.title) || textValue(row.title)),
  );
  block.appendChild(
    el(
      "span",
      "muted",
      [
        textValue(binding.paperRef),
        textValue(binding.status)
          ? `${t("synthesis-filter-status")} ${maybeLocalizedValue(binding.status)}`
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ),
  );
  return block;
}

function withHoverTitle<T extends HTMLElement>(node: T, value: unknown) {
  const title = textValue(value);
  if (title) {
    node.title = title;
  }
  return node;
}

function renderCanonicalRedirectList(
  rows: Array<Record<string, unknown>>,
  empty: string,
  direction: "from" | "to",
) {
  if (!rows.length) {
    return el("span", "muted", empty);
  }
  const list = el("div", "canonical-readable-list");
  rows.slice(0, 12).forEach((redirect) => {
    const endpoint = recordValue(redirect[direction]);
    const item = el("div", "canonical-readable-block");
    item.appendChild(
      withHoverTitle(
        el(
          "strong",
          "",
          textValue(endpoint.title, t("synthesis-canonical-untitled")),
        ),
        endpoint.title,
      ),
    );
    item.title = textValue(endpoint.title, t("synthesis-canonical-untitled"));
    item.appendChild(
      withHoverTitle(
        el(
          "span",
          "muted",
          [
            textValue(endpoint.year),
            textValue(redirect.reason)
              ? `${t("synthesis-field-reason")} ${enumLabel("reason", redirect.reason)}`
              : "",
          ]
            .filter(Boolean)
            .join(" · "),
        ),
        [
          textValue(endpoint.title),
          textValue(endpoint.year),
          textValue(redirect.reason)
            ? `${t("synthesis-field-reason")} ${enumLabel("reason", redirect.reason)}`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      ),
    );
    list.appendChild(item);
  });
  if (rows.length > 12) {
    list.appendChild(
      el(
        "span",
        "muted",
        t("synthesis-canonical-more-items", { count: rows.length - 12 }),
      ),
    );
  }
  return list;
}

function renderCanonicalDuplicatePeers(row: Record<string, unknown>) {
  const peers = canonicalRecordArray(row.duplicate_peers);
  if (!peers.length) {
    return el("span", "muted", t("synthesis-canonical-no-duplicate-group"));
  }
  const list = el("div", "canonical-readable-list");
  peers.slice(0, 10).forEach((peer) => {
    const item = el("div", "canonical-readable-block");
    item.title = textValue(peer.title, t("synthesis-canonical-untitled"));
    item.appendChild(
      withHoverTitle(
        el(
          "strong",
          "",
          textValue(peer.title, t("synthesis-canonical-untitled")),
        ),
        peer.title,
      ),
    );
    item.appendChild(
      withHoverTitle(
        el(
          "span",
          "muted",
          [textValue(peer.year), textValue(peer.binding)]
            .filter(Boolean)
            .join(" · "),
        ),
        [textValue(peer.title), textValue(peer.year), textValue(peer.binding)]
          .filter(Boolean)
          .join(" · "),
      ),
    );
    list.appendChild(item);
  });
  return list;
}

function renderCanonicalProposalList(row: Record<string, unknown>) {
  const proposals = canonicalRecordArray(row.related_proposals);
  if (!proposals.length) {
    return el("span", "muted", t("synthesis-canonical-no-related-proposals"));
  }
  const list = el("div", "canonical-readable-list");
  proposals.slice(0, 12).forEach((proposal) => {
    const source = recordValue(proposal.source);
    const target = recordValue(proposal.target);
    const item = el("div", "canonical-readable-block");
    const proposalTitle = `${enumLabel("kind", proposal.kind, "proposal")} · ${maybeLocalizedValue(proposal.status) || textValue(proposal.status, t("synthesis-status-unknown"))}`;
    const proposalMeta = `${textValue(source.title, t("synthesis-column-source"))} -> ${textValue(target.title, t("synthesis-column-target"))}`;
    item.title = `${proposalTitle}\n${proposalMeta}`;
    item.appendChild(
      withHoverTitle(el("strong", "", proposalTitle), proposalTitle),
    );
    item.appendChild(
      withHoverTitle(el("span", "muted", proposalMeta), proposalMeta),
    );
    list.appendChild(item);
  });
  return list;
}

function renderCanonicalRawReferenceList(row: Record<string, unknown>) {
  const refs = canonicalRecordArray(row.raw_reference_samples);
  if (!refs.length) {
    return el("span", "muted", t("synthesis-canonical-no-raw-references"));
  }
  const list = el("div", "canonical-readable-list");
  refs.slice(0, 10).forEach((ref) => {
    const item = el("div", "canonical-readable-block");
    item.title =
      textValue(ref.raw_reference) ||
      textValue(ref.title, "Untitled reference");
    item.appendChild(
      withHoverTitle(
        el(
          "strong",
          "",
          textValue(ref.title, t("synthesis-reference-untitled")),
        ),
        ref.title,
      ),
    );
    item.appendChild(
      withHoverTitle(
        el(
          "span",
          "muted",
          [
            textValue(ref.year),
            textValue(ref.source_ref),
            textValue(ref.reference_index)
              ? `#${textValue(ref.reference_index)}`
              : "",
          ]
            .filter(Boolean)
            .join(" · "),
        ),
        [
          textValue(ref.title),
          textValue(ref.year),
          textValue(ref.source_ref),
          textValue(ref.reference_index)
            ? `#${textValue(ref.reference_index)}`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      ),
    );
    const raw = textValue(ref.raw_reference);
    if (raw && raw !== textValue(ref.title)) {
      item.appendChild(withHoverTitle(el("span", "muted", raw), raw));
    }
    list.appendChild(item);
  });
  if (Number(row.raw_reference_count || 0) > refs.length) {
    list.appendChild(
      el(
        "span",
        "muted",
        t("synthesis-canonical-more-raw-references", {
          count: Number(row.raw_reference_count || 0) - refs.length,
        }),
      ),
    );
  }
  return list;
}

function renderCanonicalDetailSection(title: string, content: Node) {
  const section = el("section", "canonical-detail-section");
  section.appendChild(el("h3", "", title));
  section.appendChild(content);
  return section;
}

function updateCanonicalEditButtons(row: Record<string, unknown>) {
  const rowId = canonicalRowId(row);
  const dirty = canonicalEditIsDirty(row);
  document
    .querySelectorAll("button[data-canonical-edit-row-id]")
    .forEach((node: Element) => {
      if (!(node instanceof HTMLButtonElement)) return;
      if (node.dataset.canonicalEditRowId !== rowId) return;
      node.classList.toggle("is-dirty", dirty);
      node.title = dirty
        ? t("synthesis-canonical-unsaved-metadata")
        : t("synthesis-canonical-edit-metadata");
    });
  document
    .querySelectorAll("button[data-canonical-edit-save-row-id]")
    .forEach((node: Element) => {
      if (!(node instanceof HTMLButtonElement)) return;
      if (node.dataset.canonicalEditSaveRowId !== rowId) return;
      node.disabled = !dirty;
    });
}

function canonicalEditTextInput(args: {
  label: string;
  value: string;
  readOnly?: boolean;
  onInput?: (value: string) => void;
}) {
  const field = el("label", "canonical-edit-field");
  field.appendChild(el("span", "muted", uiText(args.label)));
  const input = el("input") as HTMLInputElement;
  input.value = args.value;
  input.disabled = Boolean(args.readOnly);
  input.addEventListener("input", () => args.onInput?.(input.value));
  field.appendChild(input);
  return field;
}

function canonicalEditAuthorsInput(args: {
  value: string;
  readOnly?: boolean;
  onInput?: (value: string) => void;
}) {
  const field = el("label", "canonical-edit-field");
  field.appendChild(el("span", "muted", t("synthesis-field-authors")));
  const input = el("textarea") as HTMLTextAreaElement;
  input.rows = 4;
  input.value = args.value;
  input.disabled = Boolean(args.readOnly);
  input.placeholder = t("synthesis-placeholder-one-author-per-line");
  input.addEventListener("input", () => args.onInput?.(input.value));
  field.appendChild(input);
  return field;
}

function renderCanonicalEditIdentifierRows(args: {
  row: Record<string, unknown>;
  draft: CanonicalEditDraft;
  readOnly?: boolean;
}) {
  const wrap = el("div", "canonical-edit-identifiers");
  const rows = args.draft.identifiers.length
    ? args.draft.identifiers
    : [{ kind: "", value: "" }];
  rows.forEach((identifier, index) => {
    const line = el("div", "canonical-edit-identifier-row");
    const kind = el("input") as HTMLInputElement;
    kind.value = identifier.kind;
    kind.placeholder = t("synthesis-column-kind");
    kind.disabled = Boolean(args.readOnly);
    const value = el("input") as HTMLInputElement;
    value.value = identifier.value;
    value.placeholder = t("synthesis-field-value");
    value.disabled = Boolean(args.readOnly);
    const updateIdentifier = () => {
      const next = {
        ...args.draft,
        identifiers: rows.map((entry, rowIndex) =>
          rowIndex === index
            ? { kind: kind.value, value: value.value }
            : { ...entry },
        ),
      };
      state.canonicalEditDrafts.set(canonicalRowId(args.row), next);
      args.draft.identifiers = next.identifiers;
      updateCanonicalEditButtons(args.row);
    };
    kind.addEventListener("input", updateIdentifier);
    value.addEventListener("input", updateIdentifier);
    line.appendChild(kind);
    line.appendChild(value);
    if (!args.readOnly) {
      const remove = makeLocalButton(t("synthesis-action-remove"), () => {
        const next = {
          ...args.draft,
          identifiers: args.draft.identifiers.filter(
            (_, rowIndex) => rowIndex !== index,
          ),
        };
        setCanonicalEditDraft(args.row, next);
      });
      remove.disabled = args.draft.identifiers.length === 0;
      line.appendChild(remove);
    }
    wrap.appendChild(line);
  });
  if (!args.readOnly) {
    wrap.appendChild(
      makeLocalButton(t("synthesis-action-add-identifier"), () =>
        setCanonicalEditDraft(args.row, {
          ...args.draft,
          identifiers: [...args.draft.identifiers, { kind: "", value: "" }],
        }),
      ),
    );
  }
  return wrap;
}

function renderCanonicalEditFields(args: {
  row: Record<string, unknown>;
  draft: CanonicalEditDraft;
  readOnly?: boolean;
}) {
  const form = el("div", "canonical-edit-fields");
  form.appendChild(
    canonicalEditTextInput({
      label: "Title",
      value: args.draft.title,
      readOnly: args.readOnly,
      onInput: (title) => {
        const next = { ...args.draft, title };
        state.canonicalEditDrafts.set(canonicalRowId(args.row), next);
        args.draft.title = title;
        updateCanonicalEditButtons(args.row);
      },
    }),
  );
  form.appendChild(
    canonicalEditTextInput({
      label: "Year",
      value: args.draft.year,
      readOnly: args.readOnly,
      onInput: (year) => {
        const next = { ...args.draft, year };
        state.canonicalEditDrafts.set(canonicalRowId(args.row), next);
        args.draft.year = year;
        updateCanonicalEditButtons(args.row);
      },
    }),
  );
  form.appendChild(
    canonicalEditAuthorsInput({
      value: args.draft.authorsText,
      readOnly: args.readOnly,
      onInput: (authorsText) => {
        const next = { ...args.draft, authorsText };
        state.canonicalEditDrafts.set(canonicalRowId(args.row), next);
        args.draft.authorsText = authorsText;
        updateCanonicalEditButtons(args.row);
      },
    }),
  );
  const identifiersLabel = el("div", "canonical-edit-label");
  identifiersLabel.appendChild(
    el("span", "muted", t("synthesis-field-identifiers")),
  );
  form.appendChild(identifiersLabel);
  form.appendChild(renderCanonicalEditIdentifierRows(args));
  return form;
}

function renderCanonicalEditDrawer(row: Record<string, unknown>) {
  const rowId = canonicalRowId(row);
  const drawer = el(
    "section",
    `index-review-drawer canonical-detail-drawer canonical-edit-drawer ${
      state.canonicalDetailCollapsed ? "is-collapsed" : "is-open"
    }`,
  );
  const header = el("div", "review-card-header");
  const title = el("div", "canonical-detail-title");
  title.appendChild(el("strong", "", t("synthesis-canonical-edit-title")));
  title.appendChild(
    el(
      "span",
      "muted",
      textValue(row.title, t("synthesis-canonical-untitled")),
    ),
  );
  header.appendChild(title);
  const mode = el("div", "canonical-detail-tabs segmented-control");
  mode.appendChild(
    el(
      "span",
      "canonical-edit-mode-label",
      t("synthesis-canonical-metadata-editor"),
    ),
  );
  header.appendChild(mode);
  const headerActions = el("div", "canonical-detail-header-actions");
  if (canonicalEditIsDirty(row)) {
    headerActions.appendChild(badge(t("synthesis-status-unsaved"), "warn"));
  }
  headerActions.appendChild(
    makeLocalButton(
      state.canonicalDetailCollapsed
        ? t("synthesis-action-expand")
        : t("synthesis-action-collapse"),
      () => {
        state.canonicalDetailCollapsed = !state.canonicalDetailCollapsed;
        render();
      },
    ),
  );
  header.appendChild(headerActions);
  drawer.appendChild(header);
  if (state.canonicalDetailCollapsed) {
    return drawer;
  }
  const draft = canonicalEditDraftForRow(row);
  const compareSources = canonicalIncomingRedirectSources(row);
  const currentIndex = Math.min(
    Math.max(0, state.canonicalEditCompareIndexByRowId.get(rowId) || 0),
    Math.max(0, compareSources.length - 1),
  );
  state.canonicalEditCompareIndexByRowId.set(rowId, currentIndex);
  const compareSource = compareSources[currentIndex];
  const body = el("div", "canonical-edit-body");
  const editor = renderCanonicalDetailSection(
    t("synthesis-canonical-current"),
    (() => {
      const panel = el("div", "canonical-edit-panel");
      panel.appendChild(renderCanonicalEditFields({ row, draft }));
      const actions = el("div", "canonical-edit-actions");
      const save = makeLocalButton(t("synthesis-action-save"), () => {
        sendAction("hostCommand", {
          command: "updateCanonicalReferenceMetadata",
          args: {
            canonicalReferenceId: textValue(row.effective_canonical_id),
            patch: canonicalEditPatch(canonicalEditDraftForRow(row)),
          },
        });
        state.canonicalEditDrafts.delete(rowId);
        state.canonicalEditOpenRowId = undefined;
        render();
      });
      save.dataset.canonicalEditSaveRowId = rowId;
      save.disabled = !canonicalEditIsDirty(row);
      actions.appendChild(save);
      actions.appendChild(
        makeLocalButton(t("synthesis-action-revert"), () => {
          state.canonicalEditDrafts.delete(rowId);
          render();
        }),
      );
      panel.appendChild(actions);
      return panel;
    })(),
  );
  body.appendChild(editor);
  const compare = renderCanonicalDetailSection(
    t("synthesis-canonical-pointing"),
    (() => {
      const panel = el(
        "div",
        "canonical-edit-panel canonical-edit-compare-panel",
      );
      const nav = el("div", "canonical-edit-compare-nav");
      nav.appendChild(
        el(
          "span",
          "muted",
          compareSources.length
            ? `${currentIndex + 1} / ${compareSources.length}`
            : t("synthesis-canonical-no-incoming-redirect-source"),
        ),
      );
      const prev = makeLocalButton("↑", () => {
        state.canonicalEditCompareIndexByRowId.set(rowId, currentIndex - 1);
        render();
      });
      prev.disabled = currentIndex <= 0;
      const next = makeLocalButton("↓", () => {
        state.canonicalEditCompareIndexByRowId.set(rowId, currentIndex + 1);
        render();
      });
      next.disabled = currentIndex >= compareSources.length - 1;
      nav.appendChild(prev);
      nav.appendChild(next);
      const copy = makeLocalButton(t("synthesis-action-copy-to-draft"), () => {
        if (!compareSource) return;
        setCanonicalEditDraft(row, canonicalEditDraftFromRecord(compareSource));
      });
      copy.disabled = !compareSource;
      nav.appendChild(copy);
      panel.appendChild(nav);
      if (compareSource) {
        panel.appendChild(
          renderCanonicalEditFields({
            row,
            draft: canonicalEditDraftFromRecord(compareSource),
            readOnly: true,
          }),
        );
      } else {
        panel.appendChild(
          renderEmptyState({
            title: t("synthesis-canonical-no-source"),
            message: t("synthesis-canonical-no-source-message"),
            tone: "info",
          }),
        );
      }
      return panel;
    })(),
  );
  body.appendChild(compare);
  drawer.appendChild(body);
  return drawer;
}

function renderCanonicalDetailDrawer(row: Record<string, unknown>) {
  if (state.canonicalEditOpenRowId === canonicalRowId(row)) {
    return renderCanonicalEditDrawer(row);
  }
  const drawer = el(
    "section",
    `index-review-drawer canonical-detail-drawer ${
      state.canonicalDetailCollapsed ? "is-collapsed" : "is-open"
    }`,
  );
  const header = el("div", "review-card-header");
  const title = el("div", "canonical-detail-title");
  title.appendChild(
    el("strong", "", textValue(row.title, t("synthesis-canonical-details"))),
  );
  title.appendChild(
    el(
      "span",
      "muted",
      [textValue(row.year), textValue(row.authors)].filter(Boolean).join(" · "),
    ),
  );
  header.appendChild(title);
  const tabs = el("div", "canonical-detail-tabs segmented-control");
  (
    [
      ["overview", t("synthesis-topic-tab-overview")],
      ["redirects", t("synthesis-canonical-tab-redirects")],
      ["reviews", t("synthesis-canonical-tab-reviews")],
    ] as const
  ).forEach(([tab, label]) => {
    const button = makeLocalButton(label, () => {
      state.canonicalDetailTab = tab;
      render();
    });
    button.classList.toggle("active", state.canonicalDetailTab === tab);
    button.setAttribute(
      "aria-selected",
      String(state.canonicalDetailTab === tab),
    );
    tabs.appendChild(button);
  });
  header.appendChild(tabs);
  const headerActions = el("div", "canonical-detail-header-actions");
  headerActions.appendChild(
    badge(
      recordValue(row.binding).itemKey
        ? t("synthesis-canonical-summary-bound")
        : t("synthesis-canonical-summary-external"),
      recordValue(row.binding).itemKey ? "ok" : "muted",
    ),
  );
  headerActions.appendChild(
    makeLocalButton(
      state.canonicalDetailCollapsed
        ? t("synthesis-action-expand")
        : t("synthesis-action-collapse"),
      () => {
        state.canonicalDetailCollapsed = !state.canonicalDetailCollapsed;
        render();
      },
    ),
  );
  header.appendChild(headerActions);
  drawer.appendChild(header);
  if (state.canonicalDetailCollapsed) {
    return drawer;
  }
  const body = el(
    "div",
    `canonical-detail-body canonical-detail-body-${state.canonicalDetailTab}`,
  );
  if (state.canonicalDetailTab === "redirects") {
    body.appendChild(
      renderCanonicalDetailSection(
        t("synthesis-canonical-pointing-here", {
          count: textValue(row.incoming_redirect_count, "0"),
        }),
        renderCanonicalRedirectList(
          canonicalRecordArray(row.incoming_redirects),
          t("synthesis-canonical-no-redirects-here"),
          "from",
        ),
      ),
    );
    body.appendChild(
      renderCanonicalDetailSection(
        t("synthesis-canonical-raw-references"),
        renderCanonicalRawReferenceList(row),
      ),
    );
  } else if (state.canonicalDetailTab === "reviews") {
    body.appendChild(
      renderCanonicalDetailSection(
        t("synthesis-canonical-related-proposals", {
          count: textValue(row.proposal_count, "0"),
        }),
        renderCanonicalProposalList(row),
      ),
    );
    body.appendChild(
      renderCanonicalDetailSection(
        t("synthesis-canonical-possible-duplicates"),
        renderCanonicalDuplicatePeers(row),
      ),
    );
  } else {
    body.appendChild(
      renderCanonicalDetailSection(
        t("synthesis-column-binding"),
        renderCanonicalBinding(row),
      ),
    );
    body.appendChild(
      renderCanonicalDetailSection(
        t("synthesis-field-identifiers"),
        renderCanonicalIdentifierList(row),
      ),
    );
    body.appendChild(
      renderCanonicalDetailSection(
        t("synthesis-canonical-signals"),
        (() => {
          const grid = el("div", "canonical-signal-grid");
          [
            [t("synthesis-column-raw-refs"), row.raw_reference_count],
            [
              t("synthesis-canonical-redirect-targets"),
              textValue(row.incoming_redirect_count, "0"),
            ],
            [
              t("synthesis-column-graph"),
              textValue(row.graph_node_id)
                ? t("synthesis-canonical-visible")
                : t("synthesis-canonical-not-in-graph"),
            ],
            [
              t("synthesis-column-reviews"),
              t("synthesis-canonical-review-counts", {
                open: textValue(row.open_proposal_count, "0"),
                total: textValue(row.proposal_count, "0"),
              }),
            ],
          ].forEach(([label, value]) => {
            const item = el("div", "canonical-signal-item");
            item.appendChild(el("span", "muted", textValue(label)));
            item.appendChild(el("strong", "", textValue(value, "-")));
            grid.appendChild(item);
          });
          return grid;
        })(),
      ),
    );
  }
  drawer.appendChild(body);
  return drawer;
}

function openCanonicalMergePicker(
  snapshot: Snapshot,
  source: Record<string, unknown>,
) {
  document
    .querySelectorAll(".reference-target-overlay")
    .forEach((node: Element) => node.remove());
  const overlay = el("div", "reference-target-overlay");
  overlay.tabIndex = -1;
  overlay.addEventListener("click", () => overlay.remove());
  const popover = el("div", "reference-target-popover");
  popover.addEventListener("click", (event) => event.stopPropagation());
  const header = el("div", "reference-target-popover-header");
  header.appendChild(el("strong", "", "Merge into"));
  header.appendChild(makeLocalButton("Close", () => overlay.remove()));
  popover.appendChild(header);
  const list = el("div", "reference-target-list");
  allCanonicalRows(snapshot)
    .filter(
      (row) =>
        textValue(row.projected_literature_item_id) !==
        textValue(source.projected_literature_item_id),
    )
    .sort((left, right) =>
      textValue(left.title).localeCompare(textValue(right.title), undefined, {
        sensitivity: "base",
      }),
    )
    .forEach((row) => {
      const button = el("button", "reference-target-row");
      button.type = "button";
      button.title = `${textValue(row.title)}\n${textValue(row.projected_literature_item_id)}`;
      button.appendChild(
        el("span", "reference-target-title", textValue(row.title)),
      );
      button.appendChild(
        el(
          "span",
          "reference-target-meta",
          textValue(row.projected_literature_item_id),
        ),
      );
      button.addEventListener("click", () => {
        overlay.remove();
        sendAction("hostCommand", {
          command: "mergeEffectiveCanonicalReference",
          args: {
            sourceEffectiveCanonicalId: textValue(
              source.effective_canonical_id,
            ),
            targetEffectiveCanonicalId: textValue(row.effective_canonical_id),
            confirmRetargetGroup: true,
          },
        });
      });
      list.appendChild(button);
    });
  popover.appendChild(list);
  overlay.appendChild(popover);
  document.body?.appendChild(overlay);
  positionReferenceManualTargetPopover(popover);
}

function reviewStatusMatches(status: unknown, filter: unknown) {
  const normalizedFilter = textValue(filter, "open");
  if (normalizedFilter === "all") {
    return true;
  }
  const normalizedStatus = textValue(status, "open");
  if (normalizedFilter === "accepted") {
    return (
      normalizedStatus === "accepted" ||
      normalizedStatus === "approved" ||
      normalizedStatus === "confirmed"
    );
  }
  if (normalizedFilter === "superseded") {
    return normalizedStatus === "superseded" || normalizedStatus === "stale";
  }
  return normalizedStatus === normalizedFilter;
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
  const activeTab = reviewCenterActiveTab(snapshot);
  const toolbar = el("div", "filters review-center-toolbar");
  const tabs = el("div", "segmented");
  [
    ["reference_matching", enumLabel("review-tab", "reference_matching")],
    ["concepts", enumLabel("review-tab", "concepts")],
    ["topic_graph", enumLabel("review-tab", "topic_graph")],
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
  search.placeholder = t("synthesis-search-reviews");
  search.value = textValue(filters.search);
  search.addEventListener("input", () =>
    sendAction("setFilters", { reviews: { search: search.value } }),
  );
  toolbar.appendChild(search);
  toolbar.appendChild(
    selectControlWithLabels(
      [
        [
          "open",
          filterOptionLabel("synthesis-filter-status", "status", "open"),
        ],
        ["all", filterOptionLabel("synthesis-filter-status", "status", "all")],
        [
          "accepted",
          filterOptionLabel("synthesis-filter-status", "status", "accepted"),
        ],
        [
          "rejected",
          filterOptionLabel("synthesis-filter-status", "status", "rejected"),
        ],
        [
          "superseded",
          filterOptionLabel("synthesis-filter-status", "status", "superseded"),
        ],
        [
          "retargeted",
          filterOptionLabel("synthesis-filter-status", "status", "retargeted"),
        ],
      ],
      textValue(filters.status, "open"),
      (status) => sendAction("setFilters", { reviews: { status } }),
    ),
  );
  if (activeTab === "reference_matching") {
    toolbar.appendChild(
      selectControlWithLabels(
        [
          ["all", filterOptionLabel("synthesis-filter-kind", "status", "all")],
          [
            "zotero_binding",
            filterOptionLabel(
              "synthesis-filter-kind",
              "kind",
              "zotero_binding",
            ),
          ],
          [
            "canonical_merge",
            filterOptionLabel(
              "synthesis-filter-kind",
              "kind",
              "canonical_merge",
            ),
          ],
          [
            "canonical_revision",
            filterOptionLabel(
              "synthesis-filter-kind",
              "kind",
              "canonical_revision",
            ),
          ],
        ],
        textValue(filters.kind, "all"),
        (kind) => sendAction("setFilters", { reviews: { kind } }),
      ),
    );
    toolbar.appendChild(
      selectControlWithLabels(
        [
          [
            "all",
            filterOptionLabel("synthesis-filter-confidence", "status", "all"),
          ],
          [
            "deterministic",
            filterOptionLabel(
              "synthesis-filter-confidence",
              "confidence",
              "deterministic",
            ),
          ],
          [
            "high",
            filterOptionLabel(
              "synthesis-filter-confidence",
              "confidence",
              "high",
            ),
          ],
          [
            "medium",
            filterOptionLabel(
              "synthesis-filter-confidence",
              "confidence",
              "medium",
            ),
          ],
          [
            "low",
            filterOptionLabel(
              "synthesis-filter-confidence",
              "confidence",
              "low",
            ),
          ],
          [
            "review",
            filterOptionLabel(
              "synthesis-filter-confidence",
              "confidence",
              "review",
            ),
          ],
        ],
        textValue(filters.confidence, "all"),
        (confidence) => sendAction("setFilters", { reviews: { confidence } }),
      ),
    );
  }
  return toolbar;
}

function reviewCenterActiveTab(snapshot: Snapshot) {
  const activeTab = textValue(
    reviewFilters(snapshot).activeTab,
    "reference_matching",
  );
  return activeTab === "concepts" || activeTab === "topic_graph"
    ? activeTab
    : "reference_matching";
}

type ReviewTableColumn = {
  label: string;
  className?: string;
  get: (row: Record<string, unknown>) => unknown;
};

function appendReviewTableCell(
  row: HTMLTableRowElement,
  value: unknown,
  className = "",
) {
  const cell = el("td", className);
  if (value instanceof Node) {
    cell.appendChild(value);
  } else {
    cell.textContent = maybeLocalizedValue(value) || textValue(value, "-");
  }
  row.appendChild(cell);
}

function referenceTargetCandidateKey(candidate: Record<string, unknown>) {
  return textValue(candidate.kind) === "canonical_reference"
    ? `canonical:${textValue(candidate.canonicalReferenceId || candidate.canonical_reference_id)}`
    : `zotero:${Math.max(0, Math.floor(Number(candidate.libraryId || candidate.library_id) || 0))}:${textValue(candidate.itemKey || candidate.item_key)}`;
}

function referenceTargetCandidateProjectedId(
  candidate: Record<string, unknown>,
) {
  if (textValue(candidate.kind) === "canonical_reference") {
    const bindingTarget = candidate.bindingTarget || candidate.binding_target;
    if (bindingTarget && typeof bindingTarget === "object") {
      const paperRef = textValue(
        (bindingTarget as Record<string, unknown>).paperRef ||
          (bindingTarget as Record<string, unknown>).paper_ref,
      );
      if (paperRef) {
        return paperRef;
      }
    }
    return textValue(
      candidate.canonicalReferenceId || candidate.canonical_reference_id,
    );
  }
  return (
    textValue(candidate.paperRef || candidate.paper_ref) ||
    `${Math.max(
      0,
      Math.floor(Number(candidate.libraryId || candidate.library_id) || 0),
    )}:${textValue(candidate.itemKey || candidate.item_key)}`
  );
}

function referenceTargetCandidateLabel(candidate: Record<string, unknown>) {
  const title = textValue(candidate.title, "Untitled target");
  const year = textValue(candidate.year);
  return year ? `${title} (${year})` : title;
}

function referenceTargetBindingLabel(status: unknown) {
  const normalized = textValue(status);
  if (normalized === "accepted") return enumLabel("binding-status", "accepted");
  if (normalized === "candidate")
    return enumLabel("binding-status", "candidate");
  if (normalized === "stale_target") {
    return enumLabel("binding-status", "stale_target");
  }
  if (normalized === "rejected") return enumLabel("binding-status", "rejected");
  return "";
}

function referenceTargetCandidateGroup(title: string) {
  const first = textValue(title).trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

function referenceManualTargetForCandidate(
  candidate: Record<string, unknown>,
): ReferenceProposalManualTarget | undefined {
  if (textValue(candidate.kind) === "canonical_reference") {
    const canonicalReferenceId = textValue(
      candidate.canonicalReferenceId || candidate.canonical_reference_id,
    );
    return canonicalReferenceId
      ? { kind: "canonical_reference", canonicalReferenceId }
      : undefined;
  }
  const itemKey = textValue(candidate.itemKey || candidate.item_key);
  if (!itemKey) {
    return undefined;
  }
  return {
    kind: "zotero_item",
    libraryId: Math.max(
      0,
      Math.floor(Number(candidate.libraryId || candidate.library_id) || 0),
    ),
    itemKey,
  };
}

function referenceManualTargetCandidates(
  snapshot: Snapshot,
  proposal: Record<string, unknown>,
) {
  const kind = textValue(proposal.kind);
  const candidates = snapshot.registry.matchTargetCandidates || [];
  const currentTargetItem = textValue(proposal.target_item_key);
  const currentTargetCanonical =
    textValue(proposal.target_effective_canonical_reference_id) ||
    textValue(proposal.target_canonical_reference_id);
  const sourceCanonical =
    textValue(proposal.source_effective_canonical_reference_id) ||
    textValue(proposal.source_canonical_reference_id);
  const currentTargetProjected = textValue(
    proposal.target_projected_literature_item_id,
  );
  const sourceProjected = textValue(
    proposal.source_projected_literature_item_id,
  );
  return candidates
    .filter((candidate) => {
      const candidateProjected = referenceTargetCandidateProjectedId(candidate);
      if (kind === "canonical_merge") {
        if (textValue(candidate.kind) !== "canonical_reference") {
          return false;
        }
        const candidateId = textValue(
          candidate.canonicalReferenceId || candidate.canonical_reference_id,
        );
        return (
          candidateId &&
          candidateId !== sourceCanonical &&
          candidateId !== currentTargetCanonical &&
          (!candidateProjected ||
            (candidateProjected !== sourceProjected &&
              candidateProjected !== currentTargetProjected))
        );
      }
      if (textValue(candidate.kind) !== "zotero_item") {
        return false;
      }
      const itemKey = textValue(candidate.itemKey || candidate.item_key);
      return Boolean(
        itemKey &&
        itemKey !== currentTargetItem &&
        (!candidateProjected ||
          (candidateProjected !== sourceProjected &&
            candidateProjected !== currentTargetProjected)),
      );
    })
    .sort((left, right) =>
      referenceTargetCandidateLabel(left).localeCompare(
        referenceTargetCandidateLabel(right),
        undefined,
        { sensitivity: "base" },
      ),
    );
}

function scrollReferenceTargetListToGroup(list: HTMLElement, group: string) {
  const target =
    list.querySelector<HTMLElement>(
      `[data-reference-target-group-start="${group}"]`,
    ) ||
    list.querySelector<HTMLElement>(`[data-reference-target-group="${group}"]`);
  if (!target) {
    return;
  }
  const heading = list.querySelector<HTMLElement>(
    `[data-reference-target-group="${group}"]`,
  );
  const top = Math.max(0, target.offsetTop - (heading?.offsetHeight || 0) - 4);
  if (typeof list.scrollTo === "function") {
    list.scrollTo({ top, behavior: "auto" });
    return;
  }
  list.scrollTop = top;
}

function referenceManualTargetAnchorRect(anchor?: HTMLElement) {
  if (!anchor) {
    return undefined;
  }
  const rect = anchor.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function openReferenceManualTargetPicker(
  proposalId: string,
  sourceTitle: string,
  anchor?: HTMLElement,
) {
  state.manualTargetPicker =
    state.manualTargetPicker?.proposalId === proposalId
      ? undefined
      : {
          proposalId,
          sourceTitle,
          anchorRect: referenceManualTargetAnchorRect(anchor),
        };
  refreshReferenceReviewSurfaces();
}

function closeReferenceManualTargetPicker() {
  if (!state.manualTargetPicker) {
    return;
  }
  state.manualTargetPicker = undefined;
  refreshReferenceReviewSurfaces();
}

function referenceMatchProposalById(snapshot: Snapshot, proposalId: string) {
  return (snapshot.registry.matchProposals || []).find(
    (proposal) => referenceProposalId(proposal) === proposalId,
  );
}

function positionReferenceManualTargetPopover(
  popover: HTMLElement,
  anchorRect?: ManualTargetPickerState["anchorRect"],
) {
  const margin = 16;
  const gap = 8;
  const documentElement = document.documentElement;
  const viewportWidth =
    window.innerWidth || documentElement?.clientWidth || 1024;
  const viewportHeight =
    window.innerHeight || documentElement?.clientHeight || 768;
  const width = popover.offsetWidth || 560;
  const height = popover.offsetHeight || 480;
  const fallbackLeft = Math.max(margin, (viewportWidth - width) / 2);
  const fallbackTop = Math.max(margin, (viewportHeight - height) / 2);
  const rawLeft = anchorRect ? anchorRect.left : fallbackLeft;
  const rawTop = anchorRect ? anchorRect.bottom + gap : fallbackTop;
  const clampedLeft = Math.max(
    margin,
    Math.min(rawLeft, viewportWidth - width - margin),
  );
  const top =
    anchorRect && rawTop + height > viewportHeight - margin
      ? Math.max(
          margin,
          Math.min(
            anchorRect.top - height - gap,
            viewportHeight - height - margin,
          ),
        )
      : rawTop;
  const clampedTop = Math.max(
    margin,
    Math.min(top, viewportHeight - height - margin),
  );
  popover.style.left = `${clampedLeft}px`;
  popover.style.top = `${clampedTop}px`;
}

function renderReferenceManualTargetPicker(args: {
  snapshot: Snapshot;
  proposal: Record<string, unknown>;
  sourceTitle: string;
}) {
  const proposalId = referenceProposalId(args.proposal);
  const candidates = referenceManualTargetCandidates(
    args.snapshot,
    args.proposal,
  );
  const popover = el("div", "reference-target-popover");
  popover.dataset.proposalId = proposalId;
  const header = el("div", "reference-target-popover-header");
  header.appendChild(el("strong", "", t("synthesis-action-manual-target")));
  header.appendChild(
    makeLocalButton("Close", closeReferenceManualTargetPicker),
  );
  popover.appendChild(header);
  if (!candidates.length) {
    popover.appendChild(
      renderEmptyState({
        title: "No legal targets",
        message: "No manual target candidates are available in this snapshot.",
        tone: "info",
      }),
    );
    return popover;
  }
  const body = el("div", "reference-target-popover-body");
  const index = el("div", "reference-target-index");
  const list = el("div", "reference-target-list");
  const groups = new Map<string, Record<string, unknown>[]>();
  candidates.forEach((candidate) => {
    const group = referenceTargetCandidateGroup(
      referenceTargetCandidateLabel(candidate),
    );
    const rows = groups.get(group) || [];
    rows.push(candidate);
    groups.set(group, rows);
  });
  ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].forEach((group) => {
    const button = makeLocalButton(group, () => {
      scrollReferenceTargetListToGroup(list, group);
    });
    button.disabled = !groups.has(group);
    index.appendChild(button);
  });
  Array.from(groups.keys())
    .sort((left, right) =>
      left === "#" ? -1 : right === "#" ? 1 : left.localeCompare(right),
    )
    .forEach((group) => {
      const heading = el("div", "reference-target-group-heading", group);
      heading.dataset.referenceTargetGroup = group;
      list.appendChild(heading);
      (groups.get(group) || []).forEach((candidate, index) => {
        const bindingStatus = textValue(candidate.bindingStatus);
        const row = el(
          "button",
          `reference-target-row ${
            bindingStatus ? `has-binding binding-${bindingStatus}` : ""
          }`.trim(),
        );
        row.type = "button";
        row.dataset.referenceTargetKey = referenceTargetCandidateKey(candidate);
        if (index === 0) {
          row.dataset.referenceTargetGroupStart = group;
        }
        const labelText = referenceTargetCandidateLabel(candidate);
        const metaText =
          textValue(candidate.kind) === "canonical_reference"
            ? textValue(candidate.canonicalReferenceId)
            : textValue(candidate.paperRef) ||
              `${textValue(candidate.libraryId)}:${textValue(candidate.itemKey)}`;
        const bindingLabel = referenceTargetBindingLabel(bindingStatus);
        const tooltip = [labelText, metaText, bindingLabel]
          .filter(Boolean)
          .join("\n");
        if (tooltip) {
          row.title = tooltip;
          row.setAttribute("aria-label", tooltip);
        }
        const title = el("span", "reference-target-title");
        title.textContent = labelText;
        row.appendChild(title);
        const meta = el("span", "reference-target-meta", metaText);
        if (bindingLabel) {
          meta.appendChild(
            el(
              "span",
              `reference-target-binding-pill ${bindingStatus}`,
              bindingLabel,
            ),
          );
        }
        row.appendChild(meta);
        row.addEventListener("click", () => {
          const target = referenceManualTargetForCandidate(candidate);
          if (!target) {
            return;
          }
          queueReferenceProposalDecision(proposalId, "manual_target", {
            target,
            targetLabel: referenceTargetCandidateLabel(candidate),
          });
        });
        list.appendChild(row);
      });
    });
  body.appendChild(index);
  body.appendChild(list);
  popover.appendChild(body);
  const initialGroup = referenceTargetCandidateGroup(args.sourceTitle);
  window.requestAnimationFrame(() => {
    const group = groups.has(initialGroup) ? initialGroup : "#";
    scrollReferenceTargetListToGroup(list, group);
  });
  return popover;
}

function syncReferenceManualTargetOverlay(snapshot: Snapshot | null) {
  document
    .querySelectorAll(".reference-target-overlay")
    .forEach((node: Element) => node.remove());
  const picker = state.manualTargetPicker;
  if (!snapshot || !picker) {
    return;
  }
  const proposal = referenceMatchProposalById(snapshot, picker.proposalId);
  if (!proposal) {
    state.manualTargetPicker = undefined;
    return;
  }
  const overlay = el("div", "reference-target-overlay");
  overlay.tabIndex = -1;
  overlay.addEventListener("click", closeReferenceManualTargetPicker);
  overlay.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Escape") {
      closeReferenceManualTargetPicker();
    }
  });
  const popover = renderReferenceManualTargetPicker({
    snapshot,
    proposal,
    sourceTitle: picker.sourceTitle,
  });
  popover.addEventListener("click", (event) => event.stopPropagation());
  overlay.appendChild(popover);
  const overlayHost = document.body || document.documentElement;
  if (!overlayHost) {
    return;
  }
  overlayHost.appendChild(overlay);
  positionReferenceManualTargetPopover(popover, picker.anchorRect);
  overlay.focus();
}

function appendReferenceManualTargetButton(
  actions: HTMLElement,
  proposal: Record<string, unknown>,
  sourceTitle: string,
) {
  const proposalId = referenceProposalId(proposal);
  const pending = pendingReferenceProposalDecision(proposalId);
  const button = makeLocalButton(
    "Manual target",
    (event) =>
      openReferenceManualTargetPicker(
        proposalId,
        sourceTitle,
        event.currentTarget instanceof HTMLElement
          ? event.currentTarget
          : undefined,
      ),
    pending?.action === "manual_target" ||
      state.manualTargetPicker?.proposalId === proposalId,
  );
  button.disabled = isReferenceProposalDecisionSubmitting(proposalId);
  actions.appendChild(button);
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
  return rows.filter(
    (proposal) =>
      textValue(proposal.status) !== "superseded" &&
      textValue(proposal.status) !== "retargeted",
  );
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
  if (status !== "all" && status !== "superseded" && status !== "retargeted") {
    if (status !== "accepted") {
      const acceptAll = makeLocalButton(t("synthesis-action-accept-all"), () =>
        queueReferenceProposalDecisions(visibleRows, "accept"),
      );
      acceptAll.disabled =
        !visibleRows.length || isReferenceProposalDecisionSubmitting();
      controls.appendChild(acceptAll);
    }
    if (status !== "rejected") {
      const rejectAll = makeLocalButton(t("synthesis-action-reject-all"), () =>
        queueReferenceProposalDecisions(visibleRows, "reject"),
      );
      rejectAll.disabled =
        !visibleRows.length || isReferenceProposalDecisionSubmitting();
      controls.appendChild(rejectAll);
    }
    if (status !== "accepted") {
      const acceptSelected = makeLocalButton(
        t("synthesis-action-accept-selected"),
        () => queueReferenceProposalDecisions(selectedRows, "accept"),
      );
      acceptSelected.disabled =
        !selectedRows.length || isReferenceProposalDecisionSubmitting();
      controls.appendChild(acceptSelected);
    }
    if (status !== "rejected") {
      const rejectSelected = makeLocalButton(
        t("synthesis-action-reject-selected"),
        () => queueReferenceProposalDecisions(selectedRows, "reject"),
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
      t("synthesis-review-selection-pending", {
        selected: selectedRows.length,
        pending: state.pendingReferenceProposalDecisions.size,
      }),
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
  const cleanupRows = cleanupProposalRowsForIndexReview(snapshot);
  if (!rows.length && !cleanupRows.length) {
    const empty = renderEmptyState({
      title: "No index reviews",
      message: "Adjust the Review filters or run Advanced Matching.",
      tone: "info",
    });
    empty.dataset.synthesisSurface = "reference-review-table";
    return empty;
  }
  const wrap = el("div", "table-wrap review-center-table-wrap");
  wrap.dataset.synthesisSurface = "reference-review-table";
  if (rows.length) {
    wrap.appendChild(renderReferenceProposalBulkActions(rows));
  }
  const table = el(
    "table",
    "registry-table review-center-table review-index-table",
  );
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
    ["Source", ""],
    ["Target", ""],
    ["Parent item", ""],
    ["Kind", "review-cell-center review-kind-cell"],
    ["Reasons", "review-cell-center review-reason-cell"],
    ["Status", "review-cell-center review-status-cell"],
    ["Updated", "review-cell-center review-updated-cell"],
    ["Actions", "review-action-cell"],
  ].forEach(([label, className]) =>
    header.appendChild(renderRegistryHeader(label, { className })),
  );
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
    appendReviewTableCell(
      row,
      proposal.kind,
      "review-cell-center review-kind-cell",
    );
    appendReviewTableCell(
      row,
      proposal.reasons,
      "review-cell-center review-reason-cell",
    );
    const statusCell = el("div", "review-status-stack");
    statusCell.appendChild(
      badge(proposal.status, registryStatusTone(proposal.status)),
    );
    const pending = pendingReferenceProposalDecision(proposalId);
    if (pending) {
      statusCell.appendChild(
        badge(
          t("synthesis-review-pending-action", {
            action: referenceProposalPendingLabel(pending),
          }),
          "warn",
        ),
      );
    }
    appendReviewTableCell(
      row,
      statusCell,
      "review-cell-center review-status-cell",
    );
    appendReviewTableCell(
      row,
      proposal.updated_at,
      "review-cell-center review-updated-cell",
    );
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
      appendReferenceManualTargetButton(
        actions,
        proposal,
        context.sourceReferenceTitle,
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
    appendReviewTableCell(row, actions, "review-action-cell");
    tbody.appendChild(row);
  });
  cleanupRows.forEach((proposal) => {
    const row = el("tr");
    appendReviewTableCell(row, "");
    appendReviewTableCell(
      row,
      proposal.reference_title ||
        proposal.reference_raw ||
        proposal.source_paper_ref,
    );
    appendReviewTableCell(
      row,
      proposal.target_paper_title || proposal.target_work_title || "-",
    );
    appendReviewTableCell(
      row,
      proposal.source_paper_title || proposal.source_paper_ref,
    );
    appendReviewTableCell(
      row,
      proposal.review_kind || proposal.kind || "cleanup",
      "review-cell-center review-kind-cell",
    );
    appendReviewTableCell(
      row,
      proposal.reason || proposal.decision_summary,
      "review-cell-center review-reason-cell",
    );
    const statusCell = el("div", "review-status-stack");
    statusCell.appendChild(
      badge(proposal.status, registryStatusTone(proposal.status)),
    );
    appendReviewTableCell(
      row,
      statusCell,
      "review-cell-center review-status-cell",
    );
    appendReviewTableCell(
      row,
      proposal.updated_at,
      "review-cell-center review-updated-cell",
    );
    if (isCanonicalRevisionProposal(proposal)) {
      appendReviewTableCell(
        row,
        renderCanonicalRevisionReviewActions(proposal),
        "review-action-cell",
      );
      tbody.appendChild(row);
      return;
    }
    appendReviewTableCell(
      row,
      el("span", "muted", t("synthesis-review-managed-in-index")),
      "review-action-cell",
    );
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function cleanupProposalRowsForIndexReview(snapshot: Snapshot) {
  const filters = reviewFilters(snapshot);
  const status = textValue(filters.status, "open");
  const kind = textValue(filters.kind, "all");
  const query = textValue(filters.search);
  return (snapshot.registry.cleanupProposals || []).filter(
    (row) =>
      (kind === "all" || textValue(row.review_kind || row.kind) === kind) &&
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
          row.review_kind,
        ],
        query,
      ),
  );
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
    return;
  }
  syncReferenceManualTargetOverlay(snapshot);
}

function renderGenericReviewTable(
  rows: Array<Record<string, unknown>>,
  columns: ReviewTableColumn[],
  emptyTitle: string,
  tableClassName = "",
) {
  if (!rows.length) {
    return renderEmptyState({
      title: emptyTitle,
      message: "Adjust the Review filters to show more records.",
      tone: "info",
    });
  }
  const wrap = el("div", "table-wrap review-center-table-wrap");
  const table = el(
    "table",
    `registry-table review-center-table ${tableClassName}`.trim(),
  );
  const thead = el("thead");
  const header = el("tr");
  columns.forEach((column) =>
    header.appendChild(
      renderRegistryHeader(column.label, { className: column.className }),
    ),
  );
  thead.appendChild(header);
  table.appendChild(thead);
  const tbody = el("tbody");
  rows.forEach((entry) => {
    const row = el("tr");
    columns.forEach((column) =>
      appendReviewTableCell(row, column.get(entry), column.className),
    );
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function topicGraphNodeTitleById(snapshot: Snapshot) {
  return new Map(
    (snapshot.topicGraph.nodes || []).map((node) => [
      textValue(node.topic_id),
      textValue(node.title) || textValue(node.topic_id),
    ]),
  );
}

function topicTitleById(snapshot: Snapshot) {
  const titles = topicGraphNodeTitleById(snapshot);
  (snapshot.artifacts.rows || []).forEach((row) => {
    const topicId = textValue(row.topic_id || row.id);
    const title = textValue(row.title);
    if (topicId && title && !titles.has(topicId)) {
      titles.set(topicId, title);
    }
  });
  return titles;
}

function renderPillList(values: unknown, className = "review-pill") {
  const items = Array.isArray(values)
    ? values
        .map((entry) =>
          isRecord(entry)
            ? firstText(entry, [
                "label",
                "title",
                "text",
                "ref",
                "paper_ref",
                "evidence_ref",
                "id",
              ])
            : textValue(entry),
        )
        .filter(Boolean)
    : textValue(values)
      ? [textValue(values)]
      : [];
  const wrap = el("div", "review-pill-list");
  if (!items.length) {
    wrap.appendChild(el("span", "muted", "-"));
    return wrap;
  }
  items.forEach((item) => {
    const label = maybeLocalizedValue(item) || item;
    const pill = el("span", className, label);
    pill.title = item;
    wrap.appendChild(pill);
  });
  return wrap;
}

function topicGraphReviewStatusForEdge(status: unknown) {
  const value = textValue(status, "suggested");
  if (value === "confirmed") return "accepted";
  if (value === "rejected") return "rejected";
  if (value === "stale") return "superseded";
  return "open";
}

function topicGraphReviewStatusForItem(status: unknown) {
  const value = textValue(status, "open");
  if (value === "approved") return "accepted";
  if (value === "rejected") return "rejected";
  return "open";
}

function topicGraphReviewRows(
  snapshot: Snapshot,
): Array<Record<string, unknown>> {
  const titles = topicGraphNodeTitleById(snapshot);
  const edgeRows = (snapshot.topicGraph.edges || [])
    .filter((edge) => textValue(edge.status) !== "deleted")
    .map((edge) => {
      const sourceId = textValue(edge.source_topic_id);
      const targetId = textValue(edge.target_topic_id);
      const edgeId = textValue(edge.edge_id);
      const status = topicGraphReviewStatusForEdge(edge.status);
      return {
        row_kind: "edge",
        review_id: edgeId,
        edge_id: edgeId,
        source_topic_id: sourceId,
        target_topic_id: targetId,
        source_title: titles.get(sourceId) || sourceId,
        target_title: titles.get(targetId) || targetId,
        relation: textValue(edge.relation),
        status,
        reason:
          status === "open"
            ? "Suggested topic graph relation"
            : "Topic graph relation decision",
        confidence: edge.confidence,
        evidence_refs: edge.evidence_refs,
        provenance: edge.provenance,
      };
    });
  const reviewRows = (snapshot.topicGraph.reviewItems || [])
    .filter((item) => textValue(item.status) !== "deleted")
    .map((item) => {
      const sourceId = textValue(item.source_topic_id);
      const targetId = textValue(item.target_topic_id);
      return {
        ...item,
        row_kind: "review_item",
        source_title: titles.get(sourceId) || sourceId,
        target_title:
          textValue(item.target_title) || titles.get(targetId) || targetId,
        status: topicGraphReviewStatusForItem(item.status),
        reason: textValue(item.reason) || "Topic graph relation review item",
      };
    });
  return [...edgeRows, ...reviewRows];
}

function topicGraphReviewActionCell(row: Record<string, unknown>) {
  if (textValue(row.status) !== "open") {
    return "-";
  }
  if (textValue(row.row_kind) === "edge") {
    const edgeId = textValue(row.edge_id || row.review_id);
    return actionGroup([
      makeButton("Accept", "hostCommand", {
        command: "acceptTopicGraphRelation",
        args: { edgeId },
      }),
      makeButton("Reject", "hostCommand", {
        command: "rejectTopicGraphRelation",
        args: { edgeId },
      }),
    ]);
  }
  const reviewId = textValue(row.review_id);
  return actionGroup([
    makeButton("Approve", "hostCommand", {
      command: "applyTopicGraphReviewAction",
      args: { reviewId, action: "approve_suggested" },
    }),
    makeButton("Reject", "hostCommand", {
      command: "applyTopicGraphReviewAction",
      args: { reviewId, action: "reject" },
    }),
  ]);
}

function conceptReviewCandidateIds(row: Record<string, unknown>) {
  return Array.isArray(row.candidate_concept_ids)
    ? row.candidate_concept_ids.map((entry) => textValue(entry)).filter(Boolean)
    : [];
}

function renderConceptCandidatePills(
  snapshot: Snapshot,
  candidateIds: string[],
) {
  const pills = el("div", "concept-candidate-pills");
  if (!candidateIds.length) {
    pills.appendChild(el("span", "muted", "-"));
    return pills;
  }
  candidateIds.forEach((candidateId) => {
    const pill = el(
      "span",
      "concept-candidate-pill",
      conceptDisplayName(snapshot, candidateId),
    );
    pill.title = candidateId;
    pills.appendChild(pill);
  });
  return pills;
}

function reviewCenterConceptCandidatePills(
  snapshot: Snapshot,
  row: Record<string, unknown>,
) {
  return renderConceptCandidatePills(snapshot, conceptReviewCandidateIds(row));
}

function conceptReviewActionCell(
  snapshot: Snapshot,
  row: Record<string, unknown>,
) {
  if (textValue(row.status) !== "open") {
    return "-";
  }
  const reviewId = textValue(row.review_id);
  const candidateIds = conceptReviewCandidateIds(row);
  const actions = el("div", "review-table-actions concept-review-actions");
  actions.appendChild(
    makeButton("Approve", "hostCommand", {
      command: "applyConceptReviewAction",
      args: { reviewId, action: "approve_create" },
    }),
  );
  const mergeToggle = makeLocalButton("Merge", () => {
    if (state.expandedConceptReviewMergeRows.has(reviewId)) {
      state.expandedConceptReviewMergeRows.delete(reviewId);
    } else {
      state.expandedConceptReviewMergeRows.add(reviewId);
    }
    render();
  });
  mergeToggle.disabled = candidateIds.length === 0;
  actions.appendChild(mergeToggle);
  actions.appendChild(
    makeButton("Reject", "hostCommand", {
      command: "applyConceptReviewAction",
      args: { reviewId, action: "reject" },
    }),
  );
  if (state.expandedConceptReviewMergeRows.has(reviewId)) {
    const selectedTarget =
      snapshot.concepts.filters.reviewMergeTargets?.[reviewId] ||
      candidateIds[0] ||
      "";
    const mergeTarget = el("div", "review-card-field review-card-field-inline");
    mergeTarget.appendChild(el("span", "muted", "merge target"));
    mergeTarget.appendChild(
      selectControlWithLabels(
        candidateIds.map((id) => [id, conceptDisplayName(snapshot, id)]),
        selectedTarget,
        (value) => setConceptReviewMergeTarget(snapshot, reviewId, value),
      ),
    );
    const submit = makeButton("Apply merge", "hostCommand", {
      command: "applyConceptReviewAction",
      args: {
        reviewId,
        action: "merge_into_existing",
        targetConceptId: selectedTarget,
      },
    });
    submit.disabled = !selectedTarget;
    mergeTarget.appendChild(submit);
    actions.appendChild(mergeTarget);
  }
  return actions;
}

function renderReviewCenter(main: HTMLElement, snapshot: Snapshot) {
  const panel = el("div", "panel review-center");
  panel.appendChild(renderReviewCenterToolbar(snapshot));
  const filters = reviewFilters(snapshot);
  const activeTab = reviewCenterActiveTab(snapshot);
  const status = textValue(filters.status, "open");
  const query = textValue(filters.search);
  const topicTitles = topicTitleById(snapshot);
  if (activeTab === "reference_matching") {
    panel.appendChild(renderReferenceMatchingReviewTable(snapshot));
  } else if (activeTab === "concepts") {
    const rows = (snapshot.concepts.reviewItems || []).filter(
      (row) =>
        reviewStatusMatches(row.status, status) &&
        reviewSearchMatches(
          [
            row.label,
            row.reason,
            topicTitles.get(textValue(row.topic_id)),
            row.topic_id,
            row.review_id,
          ],
          query,
        ),
    );
    panel.appendChild(
      renderGenericReviewTable(
        rows,
        [
          { label: "Label", get: (row) => row.label },
          {
            label: "Target Candidates",
            get: (row) => reviewCenterConceptCandidatePills(snapshot, row),
          },
          {
            label: "Reason",
            className: "review-cell-center review-reason-cell",
            get: (row) => row.reason,
          },
          {
            label: "Confidence",
            className: "review-cell-center review-confidence-cell",
            get: (row) => row.confidence,
          },
          {
            label: "Status",
            className: "review-cell-center review-status-cell",
            get: (row) => badge(row.status, registryStatusTone(row.status)),
          },
          {
            label: "Topic",
            get: (row) =>
              topicTitles.get(textValue(row.topic_id)) || row.topic_id,
          },
          {
            label: "Actions",
            className: "review-action-cell",
            get: (row) => conceptReviewActionCell(snapshot, row),
          },
        ],
        "No concept reviews",
        "review-concepts-table",
      ),
    );
  } else {
    const rows = topicGraphReviewRows(snapshot).filter(
      (row) =>
        reviewStatusMatches(row.status, status) &&
        reviewSearchMatches(
          [
            row.source_title,
            row.target_title,
            row.relation,
            row.reason,
            row.confidence,
            row.evidence_refs,
            row.evidence,
            row.provenance,
            row.edge_id,
            row.review_id,
          ],
          query,
        ),
    );
    panel.appendChild(
      renderGenericReviewTable(
        rows,
        [
          {
            label: "Source",
            get: (row) => row.source_title || row.source_topic_id,
          },
          {
            label: "Relation",
            get: (row) => humanizeReviewLabel(row.relation),
          },
          {
            label: "Target",
            get: (row) => row.target_title || row.target_topic_id,
          },
          { label: "Reason", get: (row) => row.reason },
          {
            label: "Confidence",
            className: "review-cell-center review-confidence-cell",
            get: (row) => row.confidence || "-",
          },
          {
            label: "Evidence",
            get: (row) =>
              renderPillList(
                row.evidence_refs || row.evidence || row.provenance,
              ),
          },
          {
            label: "Status",
            className: "review-cell-center review-status-cell",
            get: (row) => badge(row.status, registryStatusTone(row.status)),
          },
          {
            label: "Action",
            className: "review-action-cell",
            get: topicGraphReviewActionCell,
          },
        ],
        "No topic graph reviews",
        "review-topic-graph-table",
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
  shell.appendChild(renderTagsSummaryBar(snapshot, view));
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
  shell.setAttribute("aria-label", t("synthesis-tags-management"));
  return shell;
}

function renderTagsSummaryMetric(label: string, value: unknown, tone = "") {
  const metricNode = el("div", "tags-summary-metric");
  metricNode.appendChild(el("span", "muted", label));
  metricNode.appendChild(badge(value, tone));
  return metricNode;
}

function renderTagsSummaryBar(snapshot: Snapshot, view: string) {
  const bar = el("div", "tags-summary-bar");
  const primary = el("div", "tags-summary-primary");
  const metrics = el("div", "tags-summary-metrics");
  metrics.appendChild(
    renderTagsSummaryMetric(
      t("synthesis-tags-summary-canonical"),
      snapshot.tags.rows.length,
      "ok",
    ),
  );
  metrics.appendChild(
    renderTagsSummaryMetric(
      t("synthesis-tags-summary-staged"),
      snapshot.tags.stagedCount || 0,
      "warn",
    ),
  );
  metrics.appendChild(
    renderTagsSummaryMetric(
      t("synthesis-tags-summary-warnings"),
      snapshot.tags.validationWarnings.length,
      snapshot.tags.validationWarnings.length ? "warn" : "ok",
    ),
  );
  metrics.appendChild(
    renderTagsSummaryMetric(
      t("synthesis-tags-summary-cache"),
      snapshot.tags.projection.stale ? "stale" : "ready",
      snapshot.tags.projection.stale ? "warn" : "ok",
    ),
  );
  primary.appendChild(metrics);
  primary.appendChild(renderTagsSubviewTabs(snapshot, view));
  const actions = el("div", "tags-summary-actions");
  actions.appendChild(
    makeButton(t("synthesis-action-validate"), "hostCommand", {
      command: "validateTagVocabulary",
    }),
  );
  actions.appendChild(
    makeButton(t("synthesis-action-export"), "hostCommand", {
      command: "exportTagVocabulary",
    }),
  );
  actions.appendChild(
    makeLocalButton(t("synthesis-action-import"), () => {
      state.tagImportOpen = true;
      state.dismissedTagImportPreviewSignature = undefined;
      render();
    }),
  );
  bar.appendChild(primary);
  bar.appendChild(actions);
  return bar;
}

function renderTagsSubviewTabs(snapshot: Snapshot, view: string) {
  const tabs = el(
    "div",
    `segmented tags-subview-tabs tags-view-switch ${
      view === "staged" ? "is-staged" : "is-vocabulary"
    }`,
  );
  tabs.setAttribute("role", "tablist");
  tabs.appendChild(el("span", "segmented-thumb"));
  const vocabulary = makeLocalButton(
    t("synthesis-tags-tab-vocabulary", { count: snapshot.tags.rows.length }),
    () => switchTagsSubview("vocabulary"),
    view === "vocabulary",
  );
  vocabulary.setAttribute("role", "tab");
  vocabulary.setAttribute("aria-selected", String(view === "vocabulary"));
  const staged = makeLocalButton(
    t("synthesis-tags-tab-staged", {
      count: snapshot.tags.stagedCount || 0,
    }),
    () => switchTagsSubview("staged"),
    view === "staged",
  );
  staged.setAttribute("role", "tab");
  staged.setAttribute("aria-selected", String(view === "staged"));
  tabs.appendChild(vocabulary);
  tabs.appendChild(staged);
  return tabs;
}

function switchTagsSubview(view: "vocabulary" | "staged") {
  const tabs = document.querySelector(".tags-view-switch");
  if (tabs instanceof HTMLElement) {
    tabs.classList.toggle("is-staged", view === "staged");
    tabs.classList.toggle("is-vocabulary", view === "vocabulary");
    const buttons = tabs.querySelectorAll(
      "button",
    ) as NodeListOf<HTMLButtonElement>;
    buttons.forEach((button: HTMLButtonElement, index: number) => {
      const active = view === "vocabulary" ? index === 0 : index === 1;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }
  sendAction("setFilters", { tags: { view } });
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
  args.headers.forEach((header) =>
    tr.appendChild(el("th", "", uiText(header))),
  );
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
        td.textContent = maybeLocalizedValue(cell) || String(cell ?? "");
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

function vocabularyEditingState(
  snapshot: Snapshot,
): TagsEditingState | undefined {
  const value = snapshot.tags.filters.editingVocabularyTag;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as TagsEditingState)
    : undefined;
}

function tagFacetOptions(snapshot: Snapshot, fallback?: unknown) {
  return Array.from(
    new Set(
      ["topic", "method", "field", ...snapshot.tags.facets, fallback]
        .map((value) => textValue(value))
        .filter(Boolean),
    ),
  );
}

function renderTagFacetSelect(args: {
  snapshot: Snapshot;
  value: string;
  fallback?: unknown;
  onChange: (value: string) => void;
}) {
  return selectControl(
    tagFacetOptions(args.snapshot, args.fallback),
    args.value,
    args.onChange,
    (value) =>
      value === "all"
        ? t("synthesis-filter-all")
        : enumLabel("concept-type", value),
  );
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

function renderTagPillList(values: unknown, empty = "-") {
  const items = Array.isArray(values)
    ? values.map((entry) => textValue(entry)).filter(Boolean)
    : textValue(values)
      ? [textValue(values)]
      : [];
  const wrap = el("div", "tag-pill-list");
  if (!items.length) {
    wrap.appendChild(el("span", "tags-cell-text", empty));
    return wrap;
  }
  items.forEach((item) => {
    const pill = el("span", "tag-pill", item);
    pill.title = item;
    wrap.appendChild(pill);
  });
  return wrap;
}

function renderRowExpandButton(snapshot: Snapshot, key: string) {
  const expanded = isTagRowExpanded(snapshot, key);
  const button = makeLocalButton(
    expanded ? t("synthesis-action-hide") : t("synthesis-action-details"),
    () => toggleTagExpandedRow(snapshot, key),
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
  search.placeholder = t("synthesis-search-tags");
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
    checkbox.setAttribute(
      "aria-label",
      t("synthesis-tags-select-all-vocabulary"),
    );
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
          ? t("synthesis-tags-vocabulary-selected", {
              count: selectedVocabularyTags.length,
            })
          : t("synthesis-tags-selection-visual-only"),
      ),
    );
    panel.appendChild(vocabularyBulk);
  }
  const status = el("div", "details");
  status.appendChild(
    badge(
      snapshot.tags.projection.stale
        ? t("synthesis-tags-cache-stale")
        : t("synthesis-tags-cache-ready"),
      snapshot.tags.projection.stale ? "warn" : "ok",
    ),
  );
  status.appendChild(
    el(
      "span",
      "muted",
      t("synthesis-tags-count-warning", {
        count: snapshot.tags.rows.length,
        warnings: snapshot.tags.validationWarnings.length,
      }),
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
        "Note",
        "Status",
        "Usage",
        "Source",
        "Aliases",
        "Abbrev",
        "Warnings",
        "Actions",
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
        const editing = vocabularyEditingState(snapshot)?.originalTag === tag;
        const draft = currentVocabularyDraft(snapshot, row);
        let tagCell: HTMLElement | HTMLInputElement = renderCompactText(tag);
        let facetCell: HTMLElement | HTMLSelectElement = renderCompactText(
          row.facet || "-",
        );
        let noteCell: HTMLElement | HTMLInputElement = renderCompactText(
          row.note || "-",
        );
        const actions = el("div", "row-actions");
        if (editing) {
          const tagInput = el("input");
          tagInput.value = draft.tag;
          tagInput.dataset.synthesisControlKey = `tags.vocabulary.${tag}.tag`;
          const facetSelect = renderTagFacetSelect({
            snapshot,
            value: draft.facet,
            fallback: row.facet,
            onChange: (facetValue) =>
              setVocabularyDraft({
                snapshot,
                row,
                tagValue: tagInput.value,
                facetValue,
                noteValue: noteInput.value,
              }),
          });
          const noteInput = el("input");
          noteInput.value = draft.note;
          noteInput.dataset.synthesisControlKey = `tags.vocabulary.${tag}.note`;
          tagInput.addEventListener("change", () =>
            setVocabularyDraft({
              snapshot,
              row,
              tagValue: tagInput.value,
              facetValue: facetSelect.value,
              noteValue: noteInput.value,
            }),
          );
          noteInput.addEventListener("change", () =>
            setVocabularyDraft({
              snapshot,
              row,
              tagValue: tagInput.value,
              facetValue: facetSelect.value,
              noteValue: noteInput.value,
            }),
          );
          tagCell = tagInput;
          facetCell = facetSelect;
          noteCell = noteInput;
          actions.appendChild(
            makeLocalButton(t("synthesis-action-apply"), () =>
              applyVocabularyDraft({
                snapshot,
                row,
                draft: {
                  tag: tagInput.value,
                  facet: facetSelect.value,
                  note: noteInput.value,
                },
              }),
            ),
          );
        } else {
          actions.appendChild(
            makeLocalButton(t("synthesis-action-edit"), () =>
              setVocabularyDraft({
                snapshot,
                row,
                tagValue: tag,
                facetValue: textValue(row.facet, "topic"),
                noteValue: textValue(row.note),
              }),
            ),
          );
        }
        actions.appendChild(
          makeLocalButton(t("synthesis-action-delete"), () => {
            if (!window.confirm(`Delete vocabulary tag "${tag}"?`)) {
              return;
            }
            sendAction("hostCommand", {
              command: "deleteTagVocabularyEntry",
              args: { originalTag: tag, tag },
            });
          }),
        );
        actions.appendChild(renderRowExpandButton(snapshot, key));
        return [
          checkbox,
          tagCell,
          facetCell,
          noteCell,
          statusBadge,
          row.usage_count || 0,
          renderCompactText(row.source || "-"),
          renderTagPillList(row.aliases),
          renderTagPillList(row.abbrev),
          warnings.length ? badge(warnings.length, "warn") : "-",
          actions,
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
          ? t("synthesis-tags-empty-filtered")
          : t("synthesis-tags-empty"),
        message: snapshot.tags.rows.length
          ? t("synthesis-tags-empty-filtered-message")
          : t("synthesis-tags-empty-message"),
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
      facet: textValue(edit.draftFacet, textValue(row.facet, "topic")),
      note: textValue(edit.draftNote, textValue(row.note)),
      status: textValue(edit.status, "idle"),
      error: textValue(edit.error),
    };
  }
  return {
    tag: stagedTagSuffix(row),
    facet: textValue(row.facet, "topic"),
    note: textValue(row.note),
    status: "idle",
    error: "",
  };
}

function persistStagedDraft(args: {
  snapshot: Snapshot;
  row: Record<string, unknown>;
  tagValue: string;
  facetValue: string;
  noteValue: string;
}) {
  const tag = textValue(args.row.tag);
  const facet = textValue(args.facetValue, textValue(args.row.facet, "topic"));
  const suffix = textValue(args.tagValue);
  const nextTag = suffix.includes(":") ? suffix : `${facet}:${suffix}`;
  sendAction("setFilters", {
    tags: {
      editingStagedTag: {
        originalTag: tag,
        draftTag: suffix,
        draftFacet: facet,
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
      facet,
      note: args.noteValue,
      source_flow: textValue(args.row.source_flow),
      parent_bindings: Array.isArray(args.row.parent_bindings)
        ? args.row.parent_bindings
        : [],
    },
  });
}

function currentVocabularyDraft(
  snapshot: Snapshot,
  row: Record<string, unknown>,
) {
  const tag = textValue(row.tag);
  const edit = vocabularyEditingState(snapshot);
  if (edit?.originalTag === tag) {
    return {
      tag: textValue(edit.draftTag, tag),
      facet: textValue(edit.draftFacet, textValue(row.facet, "topic")),
      note: textValue(edit.draftNote, textValue(row.note)),
      status: textValue(edit.status, "idle"),
      error: textValue(edit.error),
    };
  }
  return {
    tag,
    facet: textValue(row.facet, "topic"),
    note: textValue(row.note),
    status: "idle",
    error: "",
  };
}

function setVocabularyDraft(args: {
  snapshot: Snapshot;
  row: Record<string, unknown>;
  tagValue: string;
  facetValue: string;
  noteValue: string;
  status?: TagsEditingState["status"];
}) {
  sendAction("setFilters", {
    tags: {
      editingVocabularyTag: {
        originalTag: textValue(args.row.tag),
        draftTag: textValue(args.tagValue),
        draftFacet: textValue(
          args.facetValue,
          textValue(args.row.facet, "topic"),
        ),
        draftNote: args.noteValue,
        status: args.status || "idle",
      },
    },
  });
}

function applyVocabularyDraft(args: {
  snapshot: Snapshot;
  row: Record<string, unknown>;
  draft: { tag: string; facet: string; note: string };
}) {
  const originalTag = textValue(args.row.tag);
  sendAction("setFilters", {
    tags: {
      editingVocabularyTag: {
        originalTag,
        draftTag: args.draft.tag,
        draftFacet: args.draft.facet,
        draftNote: args.draft.note,
        status: "pending",
      },
    },
  });
  sendAction("hostCommand", {
    command: "updateTagVocabularyEntry",
    args: {
      originalTag,
      tag: args.draft.tag,
      facet: args.draft.facet,
      note: args.draft.note,
    },
  });
}

function renderStagedEditInputs(args: {
  snapshot: Snapshot;
  row: Record<string, unknown>;
  draft: { tag: string; facet: string; note: string };
}) {
  const tagInput = el("input");
  const facetSelect = renderTagFacetSelect({
    snapshot: args.snapshot,
    value: args.draft.facet,
    fallback: args.row.facet,
    onChange: (facetValue) => {
      persistStagedDraft({
        snapshot: args.snapshot,
        row: args.row,
        tagValue: tagInput.value,
        facetValue,
        noteValue: noteInput.value,
      });
    },
  });
  const noteInput = el("input");
  tagInput.value = args.draft.tag;
  tagInput.dataset.synthesisControlKey = `tags.staged.${textValue(args.row.tag)}.tag`;
  tagInput.addEventListener("change", () => {
    persistStagedDraft({
      snapshot: args.snapshot,
      row: args.row,
      tagValue: tagInput.value,
      facetValue: facetSelect.value,
      noteValue: noteInput.value,
    });
  });
  noteInput.value = args.draft.note;
  noteInput.dataset.synthesisControlKey = `tags.staged.${textValue(args.row.tag)}.note`;
  noteInput.addEventListener("change", () => {
    persistStagedDraft({
      snapshot: args.snapshot,
      row: args.row,
      tagValue: tagInput.value,
      facetValue: facetSelect.value,
      noteValue: noteInput.value,
    });
  });
  return { tagInput, facetSelect, noteInput };
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
    maybeLocalizedValue(stateText) || stateText,
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
    checkbox.setAttribute("aria-label", t("synthesis-tags-select-all-staged"));
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
        ? t("synthesis-tags-staged-selected", { count: selectedCount })
        : t("synthesis-tags-select-staged-bulk"),
    ),
  );
  const promote = makeButton(
    t("synthesis-action-promote-selected"),
    "hostCommand",
    {
      command: "promoteStagedTagSuggestions",
      args: { tags: args.selectedTags },
    },
    false,
    selectedCount === 0,
  );
  const discard = makeButton(
    t("synthesis-action-discard-selected"),
    "hostCommand",
    {
      command: "discardStagedTagSuggestions",
      args: { tags: args.selectedTags },
    },
    false,
    selectedCount === 0,
  );
  const clearSelection = makeLocalButton(
    t("synthesis-action-clear-selection"),
    () => setAllTagSelection("selectedStagedTags", [], false),
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
  search.placeholder = t("synthesis-search-staged-tags");
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
  const clearButton = makeLocalButton(
    t("synthesis-action-clear-staged"),
    () => {
      if (!window.confirm("Clear all staged tag suggestions?")) {
        return;
      }
      sendAction("hostCommand", {
        command: "clearStagedTagSuggestions",
        args: {},
      });
    },
  );
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
      ],
      rows: snapshot.tags.visibleStagedRows,
      mapRow: (row) => {
        const tag = textValue(row.tag);
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
        const { tagInput, facetSelect, noteInput } = renderStagedEditInputs({
          snapshot,
          row,
          draft,
        });
        const actions = el("div", "row-actions");
        actions.appendChild(
          makeButton(t("synthesis-action-promote"), "hostCommand", {
            command: "promoteStagedTagSuggestions",
            args: { tag, tags: [tag] },
          }),
        );
        actions.appendChild(
          makeButton(t("synthesis-action-discard"), "hostCommand", {
            command: "discardStagedTagSuggestions",
            args: { tag, tags: [tag] },
          }),
        );
        const key = expandedRowKey("staged", tag);
        actions.appendChild(renderRowExpandButton(snapshot, key));
        const editState = renderStagedEditState(snapshot, row);
        const tagCell = el("div", "tags-inline-edit-cell");
        tagCell.appendChild(tagInput);
        tagCell.appendChild(editState);
        return [
          checkbox,
          tagCell,
          facetSelect,
          noteInput,
          row.parent_count || 0,
          renderCompactText(row.source_flow || "-"),
          renderCompactText(row.updated_at || "-"),
          actions,
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
          ? t("synthesis-tags-staged-empty-filtered")
          : t("synthesis-tags-staged-empty"),
        message: snapshot.tags.stagedCount
          ? t("synthesis-tags-staged-empty-filtered-message")
          : t("synthesis-tags-staged-empty-message"),
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
  importDraft.placeholder = t("synthesis-placeholder-tag-vocabulary-json");
  importDraft.value = draft;
  importDraft.addEventListener("input", () => {
    state.dismissedTagImportPreviewSignature = undefined;
    sendAction("setFilters", { tags: { importDraft: importDraft.value } });
  });
  const close = makeLocalButton(t("synthesis-action-close"), () => {
    state.tagImportOpen = false;
    state.dismissedTagImportPreviewSignature = signature || undefined;
    render();
  });
  const children: HTMLElement[] = [importDraft];
  const actions = [
    makeButton(
      t("synthesis-action-preview-import"),
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
          ? t("synthesis-tags-import-first-conflict", {
              tag: textValue(
                conflict.tag || importedConflict.tag || localConflict.tag,
                t("synthesis-tags-import-unknown-tag"),
              ),
            })
          : t("synthesis-tags-import-no-conflicts"),
      ),
    );
    actions.unshift(
      makeButton(
        t("synthesis-action-merge-non-conflicting"),
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
        t("synthesis-action-use-imported"),
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
      kind: t("synthesis-tags-import-kind"),
      title: preview
        ? t("synthesis-tags-import-preview-title")
        : t("synthesis-tags-import-title"),
      meta: preview
        ? t("synthesis-tags-import-preview-meta", {
            additions: preview.additions?.length || 0,
            conflicts: preview.conflicts?.length || 0,
          })
        : t("synthesis-tags-import-meta"),
      body: preview
        ? t("synthesis-tags-import-preview-body")
        : t("synthesis-tags-import-body"),
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
  const panel = el("div", "panel");
  const filters = el("div", "filters");
  const search = el("input");
  search.dataset.synthesisControlKey = "concepts.search";
  search.placeholder = t("synthesis-search-concepts");
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
      (value) =>
        value === "all"
          ? t("synthesis-filter-all")
          : enumLabel("concept-type", value),
    ),
  );
  filters.appendChild(
    selectControl(
      ["all", "active", "review", "deprecated"],
      snapshot.concepts.filters.status || "all",
      (value) => sendAction("setFilters", { concepts: { status: value } }),
      (value) => enumLabel("status", value),
    ),
  );
  filters.appendChild(
    makeButton(
      snapshot.concepts.filters.overlayEnabled
        ? t("synthesis-concepts-overlay-on")
        : t("synthesis-concepts-overlay-off"),
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
        ? t("synthesis-concepts-cache-stale")
        : t("synthesis-concepts-cache-ready"),
      snapshot.concepts.projection.stale ? "warn" : "ok",
    ),
  );
  status.appendChild(
    el(
      "span",
      "muted",
      t("synthesis-concepts-count", { count: snapshot.concepts.rows.length }),
    ),
  );
  panel.appendChild(status);
  const conceptBulkBar = renderConceptBulkActionBar(snapshot);
  if (conceptBulkBar) {
    panel.appendChild(conceptBulkBar);
  }
  panel.appendChild(renderConceptTable(snapshot));
  const reviewItems = (snapshot.concepts.reviewItems || []).filter(
    (item) =>
      textValue(item.status) === "open" &&
      !isReviewOptimisticallyResolved("concept-review", item.review_id),
  );
  if (reviewItems.length) {
    state.conceptReviewPanel.index = wrapReviewIndex(
      state.conceptReviewPanel.index,
      reviewItems.length,
    );
    panel.appendChild(
      renderConceptReviewPanel(
        snapshot,
        reviewItems[state.conceptReviewPanel.index],
        reviewItems.length,
      ),
    );
  }
  main.appendChild(panel);
}

function conceptDefinitionSummary(row: Record<string, unknown>) {
  return firstText(row, [
    "short_definition",
    "definition",
    "usage_note",
    "editorial_note",
  ]);
}

function visibleConceptIds(snapshot: Snapshot) {
  return snapshot.concepts.visibleRows
    .map((row) => textValue(row.concept_id))
    .filter(Boolean);
}

function selectedVisibleConceptIds(snapshot: Snapshot) {
  const visible = new Set(visibleConceptIds(snapshot));
  state.selectedConceptIds.forEach((conceptId) => {
    if (!visible.has(conceptId)) {
      state.selectedConceptIds.delete(conceptId);
    }
  });
  return Array.from(state.selectedConceptIds).filter((conceptId) =>
    visible.has(conceptId),
  );
}

function setAllConceptSelection(snapshot: Snapshot, checked: boolean) {
  state.selectedConceptIds.clear();
  if (checked) {
    visibleConceptIds(snapshot).forEach((conceptId) =>
      state.selectedConceptIds.add(conceptId),
    );
  }
  render();
}

function toggleConceptSelection(conceptId: string, checked: boolean) {
  if (!conceptId) return;
  if (checked) {
    state.selectedConceptIds.add(conceptId);
  } else {
    state.selectedConceptIds.delete(conceptId);
  }
  render();
}

function deleteConcepts(conceptIds: string[]) {
  const ids = conceptIds.map((id) => textValue(id)).filter(Boolean);
  if (!ids.length) return;
  if (!window.confirm(`Delete ${ids.length} concept(s)?`)) {
    return;
  }
  sendAction("hostCommand", {
    command: "deleteConceptEntry",
    args: { conceptIds: ids },
  });
}

function renderConceptBulkActionBar(snapshot: Snapshot) {
  const visibleIds = visibleConceptIds(snapshot);
  if (!visibleIds.length) {
    return null;
  }
  const selectedIds = selectedVisibleConceptIds(snapshot);
  const bar = el("div", "concept-bulk-bar");
  const checkbox = el("input") as HTMLInputElement;
  checkbox.type = "checkbox";
  checkbox.checked = selectedIds.length === visibleIds.length;
  checkbox.setAttribute("aria-label", t("synthesis-concepts-select-all"));
  checkbox.addEventListener("change", () =>
    setAllConceptSelection(snapshot, checkbox.checked),
  );
  bar.appendChild(checkbox);
  bar.appendChild(
    el(
      "span",
      "muted",
      selectedIds.length
        ? t("synthesis-concepts-selected", { count: selectedIds.length })
        : t("synthesis-concepts-select-bulk"),
    ),
  );
  const deleteSelected = makeLocalButton(
    t("synthesis-action-delete-selected"),
    () => deleteConcepts(selectedIds),
  );
  deleteSelected.disabled = selectedIds.length === 0;
  bar.appendChild(deleteSelected);
  return bar;
}

function renderConceptTable(snapshot: Snapshot) {
  if (!snapshot.concepts.visibleRows.length) {
    return renderEmptyState({
      title: snapshot.concepts.rows.length
        ? t("synthesis-concepts-empty-filtered")
        : t("synthesis-concepts-empty"),
      message: snapshot.concepts.rows.length
        ? t("synthesis-concepts-empty-filtered-message")
        : t("synthesis-concepts-empty-message"),
      tone: snapshot.concepts.rows.length ? "default" : "info",
    });
  }
  const wrap = el("div", "table-wrap concept-table-wrap");
  const table = el("table", "concept-table");
  const thead = el("thead");
  const head = el("tr");
  [
    "",
    t("synthesis-column-concept"),
    t("synthesis-column-definition"),
    t("synthesis-column-type"),
    t("synthesis-column-domain"),
    t("synthesis-column-aliases"),
    t("synthesis-column-status"),
    t("synthesis-column-actions"),
  ].forEach((header) => head.appendChild(el("th", "", header)));
  thead.appendChild(head);
  table.appendChild(thead);
  const tbody = el("tbody");
  snapshot.concepts.visibleRows.forEach((row) => {
    const conceptId = textValue(row.concept_id);
    const tr = el("tr", "concept-row");
    const selectionCell = el("td", "concept-selection-cell");
    const checkbox = el("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = state.selectedConceptIds.has(conceptId);
    checkbox.setAttribute(
      "aria-label",
      `Select ${textValue(row.label, conceptId)}`,
    );
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", () =>
      toggleConceptSelection(conceptId, checkbox.checked),
    );
    selectionCell.appendChild(checkbox);
    tr.appendChild(selectionCell);
    const label = el(
      "strong",
      "concept-row-label",
      String(row.label || conceptId),
    );
    const labelCell = el("td");
    labelCell.appendChild(label);
    tr.appendChild(labelCell);
    tr.appendChild(
      el("td", "concept-definition-cell", conceptDefinitionSummary(row) || "-"),
    );
    tr.appendChild(
      el(
        "td",
        "concept-cell-center",
        enumLabel("concept-type", row.concept_type, "-"),
      ),
    );
    tr.appendChild(el("td", "concept-cell-center", textValue(row.domain, "-")));
    const aliasesCell = el("td", "concept-alias-cell");
    aliasesCell.appendChild(renderPillList(row.aliases, "concept-alias-pill"));
    tr.appendChild(aliasesCell);
    const statusCell = el("td", "concept-cell-center");
    statusCell.appendChild(badge(row.status || "active", toneFor(row.status)));
    tr.appendChild(statusCell);
    const actions = actionGroup([
      makeLocalButton(t("synthesis-action-delete"), () =>
        deleteConcepts([conceptId]),
      ),
    ]);
    actions.addEventListener("click", (event) => event.stopPropagation());
    const actionsCell = el("td", "concept-action-cell");
    actionsCell.appendChild(actions);
    tr.appendChild(actionsCell);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function renderConceptReviewPanel(
  snapshot: Snapshot,
  item: Record<string, unknown>,
  total = 1,
) {
  const candidateIds = Array.isArray(item.candidate_concept_ids)
    ? item.candidate_concept_ids
        .map((candidate) => textValue(candidate))
        .filter(Boolean)
    : [];
  const reviewId = textValue(item.review_id);
  const selectedTarget =
    snapshot.concepts.filters.reviewMergeTargets?.[reviewId] || "";
  const actions = [
    makeButton(t("synthesis-action-approve-as-new"), "hostCommand", {
      command: "applyConceptReviewAction",
      args: {
        reviewId,
        action: "approve_create",
      },
    }),
    makeButton(t("synthesis-action-reject"), "hostCommand", {
      command: "applyConceptReviewAction",
      args: { reviewId, action: "reject" },
    }),
  ];
  const primaryChildren = [
    renderConceptReviewDecisionSummary(
      snapshot,
      item,
      candidateIds,
      reviewId,
      selectedTarget,
    ),
  ];
  if (candidateIds.length) {
    actions.splice(
      1,
      0,
      makeButton(
        t("synthesis-action-merge"),
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
  const panel = renderReviewPanel(
    renderLocalReviewPanelHeader({
      title: t("synthesis-concept-review-title"),
      state: state.conceptReviewPanel,
      total,
      onChange: render,
    }),
    "concept-review-panel inline-review-panel",
  );
  if (state.conceptReviewPanel.collapsed) {
    panel.classList.add("is-collapsed");
    return panel;
  }
  panel.appendChild(
    renderReviewCard({
      kind: t("synthesis-concept-review-title"),
      title: t("synthesis-review-proposal-title"),
      showKindBadge: false,
      meta: `${state.conceptReviewPanel.index + 1} / ${total}`,
      primaryChildren,
      details: [
        [t("synthesis-column-confidence"), item.confidence],
        [t("synthesis-column-type"), item.concept_type],
        [t("synthesis-column-domain"), item.domain],
        [t("synthesis-column-topic"), item.topic_id],
        [t("synthesis-detail-topic-relevance"), item.topic_relevance],
        [t("synthesis-column-reason"), item.reason],
      ],
      actions,
    }),
  );
  return panel;
}

function conceptDisplayName(snapshot: Snapshot, conceptId: string) {
  const row = (snapshot.concepts.rows || []).find(
    (entry) => textValue(entry.concept_id) === conceptId,
  );
  return textValue(row?.label) || conceptId;
}

function setConceptReviewMergeTarget(
  snapshot: Snapshot,
  reviewId: string,
  targetConceptId: string,
) {
  sendAction("setFilters", {
    concepts: {
      reviewMergeTargets: {
        ...(snapshot.concepts.filters.reviewMergeTargets || {}),
        [reviewId]: targetConceptId,
      },
    },
  });
}

function renderConceptReviewDecisionSummary(
  snapshot: Snapshot,
  item: Record<string, unknown>,
  candidateIds: string[],
  reviewId: string,
  selectedTarget: string,
) {
  const summary = el("div", "reference-review-summary concept-review-summary");
  const source = el("div", "reference-review-summary-row");
  source.appendChild(
    el(
      "span",
      "reference-review-summary-label",
      t("synthesis-review-source-label"),
    ),
  );
  const sourceValue = el("div", "concept-review-summary-value");
  sourceValue.appendChild(
    el("strong", "", textValue(item.label, t("synthesis-concept-proposal"))),
  );
  const definition = textValue(item.short_definition || item.definition);
  if (definition) {
    sourceValue.appendChild(el("span", "muted", definition));
  }
  source.appendChild(sourceValue);
  summary.appendChild(source);

  const targets = el("div", "reference-review-summary-row");
  targets.appendChild(
    el(
      "span",
      "reference-review-summary-label",
      t("synthesis-review-target-label"),
    ),
  );
  targets.appendChild(renderConceptCandidatePills(snapshot, candidateIds));
  summary.appendChild(targets);

  if (candidateIds.length) {
    const merge = el("div", "reference-review-summary-row");
    merge.appendChild(
      el(
        "span",
        "reference-review-summary-label",
        t("synthesis-review-merge-label"),
      ),
    );
    merge.appendChild(
      selectControlWithLabels(
        [
          ["", t("synthesis-review-select-target")],
          ...candidateIds.map(
            (id) => [id, conceptDisplayName(snapshot, id)] as [string, string],
          ),
        ],
        selectedTarget,
        (value) => setConceptReviewMergeTarget(snapshot, reviewId, value),
      ),
    );
    summary.appendChild(merge);
  }
  return summary;
}

function roleOptions(snapshot: Snapshot) {
  return Array.from(
    new Set(
      snapshot.graph.edges
        .map((edge) => edge.primary_role || "unknown")
        .map((role) => (role === "citation" ? "" : role))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function graphTopicScopeOptions(snapshot: Snapshot): Array<[string, string]> {
  return [
    ["all", t("synthesis-graph-topic-all")],
    ...(snapshot.graph.topicScopes || []).map(
      (scope) =>
        [
          textValue(scope.topicId),
          textValue(scope.title) || textValue(scope.topicId),
        ] as [string, string],
    ),
  ];
}

function graphEdgeRoleLabel(value: string) {
  return value === "all"
    ? t("synthesis-filter-all")
    : enumLabel("graph-edge-role", value);
}

function graphControlGroup(
  label: string,
  children: Array<HTMLElement | undefined>,
  className = "",
) {
  const group = el("div", `graph-control-group ${className}`.trim());
  group.appendChild(el("span", "graph-control-group-label", label));
  const row = el("div", "filters graph-control-row");
  children
    .filter((child): child is HTMLElement => Boolean(child))
    .forEach((child) => row.appendChild(child));
  group.appendChild(row);
  return group;
}

function selectedGraphTopicTitle(snapshot: Snapshot) {
  if ((snapshot.graph.filters.topicId || "all") === "all") {
    return "";
  }
  return (
    textValue(snapshot.graph.selectedTopicScope?.title) ||
    textValue(snapshot.graph.filters.topicId)
  );
}

function graphScopeLabel(snapshot: Snapshot) {
  if (state.standaloneGraphOnly && state.standaloneGraphScopeLabel) {
    return state.standaloneGraphScopeLabel;
  }
  const selectedTopicTitle = selectedGraphTopicTitle(snapshot);
  if (selectedTopicTitle) {
    return t("synthesis-graph-scope-topic", {
      topic: selectedTopicTitle,
    });
  }
  return t("synthesis-graph-scope-all");
}

function graphDiagnosticSummary(
  diagnostics: Record<string, unknown>,
  layoutStatus: Snapshot["graph"]["layoutStatus"],
) {
  const entries = objectEntries(diagnostics);
  if (!entries.length) {
    if (layoutStatus === "refreshing") {
      return t("synthesis-graph-diagnostic-refreshing");
    }
    if (layoutStatus === "missing") {
      return t("synthesis-graph-diagnostic-missing");
    }
    if (layoutStatus === "stale") {
      return t("synthesis-graph-diagnostic-stale");
    }
    if (layoutStatus === "failed") {
      return t("synthesis-graph-diagnostic-failed");
    }
    return t("synthesis-graph-diagnostic-not-ready");
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
  const legend = el(
    "div",
    state.standaloneGraphOnly
      ? "citation-graph-legend citation-graph-legend-horizontal"
      : "citation-graph-legend",
  );
  legend.setAttribute("aria-label", t("synthesis-graph-legend"));
  legend.appendChild(el("strong", "", t("synthesis-graph-legend-direction")));
  const rows: Array<[string, string]> = [
    [t("synthesis-graph-legend-incoming"), CITATION_GRAPH_INCOMING_EDGE_COLOR],
    [t("synthesis-graph-legend-outgoing"), CITATION_GRAPH_OUTGOING_EDGE_COLOR],
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
  legend.appendChild(el("strong", "", t("synthesis-graph-legend-importance")));
  const sizeRow = el("div", "citation-graph-legend-row");
  const sizeSwatch = el("span", "citation-graph-legend-node-size");
  sizeSwatch.appendChild(el("span", "citation-graph-legend-node is-small"));
  sizeSwatch.appendChild(el("span", "citation-graph-legend-node is-large"));
  sizeRow.appendChild(sizeSwatch);
  sizeRow.appendChild(el("span", "", t("synthesis-graph-legend-node-size")));
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
  haloRow.appendChild(el("span", "", t("synthesis-graph-legend-halo")));
  legend.appendChild(haloRow);
  if (state.standaloneGraphOnly) {
    const focusRow = el("div", "citation-graph-legend-row");
    const focusSwatch = el("span", "citation-graph-legend-node-size");
    focusSwatch.appendChild(
      el("span", "citation-graph-legend-node is-large is-current-paper"),
    );
    focusRow.appendChild(focusSwatch);
    focusRow.appendChild(
      el("span", "", t("synthesis-graph-legend-current-paper")),
    );
    legend.appendChild(focusRow);
  }
  return legend;
}

function renderGraph(main: HTMLElement, snapshot: Snapshot) {
  const shell = el("div", "graph-shell");
  if (state.standaloneGraphOnly) {
    shell.classList.add("graph-shell-standalone-only");
    shell.appendChild(renderCitationGraphLegend());
  }
  const stage = el("div", "graph-stage");
  const canvas = el("div", "sigma-stage");
  stage.appendChild(canvas);
  stage.appendChild(renderGraphZoomOverlay());
  stage.appendChild(el("div", "graph-scope-badge", graphScopeLabel(snapshot)));
  shell.appendChild(stage);

  const selectedTopicTitle = selectedGraphTopicTitle(snapshot);
  if (!state.standaloneGraphOnly) {
    const detail = el("aside", "panel details graph-control-drawer");
    detail.tabIndex = 0;
    detail.setAttribute("aria-label", t("synthesis-graph-controls"));
    const header = el("div", "panel-header");
    const controlIcon = el("span", "graph-control-icon");
    controlIcon.appendChild(iconEl("zs-icon-tune"));
    header.appendChild(controlIcon);
    header.appendChild(
      el("strong", "graph-control-title", t("synthesis-graph-controls")),
    );
    detail.appendChild(header);
    const controls = el("div", "details");
    controls.dataset.synthesisScrollKey = "graph.controls";
    controls.appendChild(
      state.standaloneExport
        ? renderStandaloneGraphControls(snapshot)
        : renderGraphControls(snapshot),
    );
    if (
      !state.standaloneExport &&
      state.graphReturnTopicId &&
      snapshot.graph.filters.topicId === state.graphReturnTopicId
    ) {
      controls.appendChild(
        makeLocalButton(t("synthesis-action-back-to-topic-details"), () =>
          sendAction("backToTopicDetail", {
            topicId: state.graphReturnTopicId,
          }),
        ),
      );
    }
    controls.appendChild(
      el(
        "p",
        "muted",
        t("synthesis-graph-shown-count", {
          nodes: snapshot.graph.visibleNodes.length,
          edges: snapshot.graph.visibleEdges.length,
        }),
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
        t("synthesis-graph-node-counts", {
          library: libraryCount,
          shared: sharedExternalCount,
          hoverOnly: hoverOnlyExternalCount,
        }),
      ),
    );
    detail.appendChild(controls);
    shell.appendChild(detail);
  }

  if (snapshot.graph.selectedElement) {
    const selection = el("aside", "panel details graph-selection-drawer");
    if (state.standaloneGraphOnly) {
      selection.classList.add("graph-selection-drawer-compact");
    }
    selection.tabIndex = 0;
    selection.setAttribute("aria-label", t("synthesis-graph-selection"));
    const selectionHeader = el("div", "panel-header");
    selectionHeader.appendChild(
      el("strong", "", t("synthesis-graph-selection")),
    );
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
        title: t("synthesis-graph-no-data"),
        message: graphDiagnosticSummary(
          snapshot.graph.diagnostics || {},
          snapshot.graph.layoutStatus,
        ),
        action: state.standaloneExport
          ? undefined
          : makeButton(
              t("synthesis-action-rebuild-graph-cache"),
              "hostCommand",
              {
                command: "rebuildCitationGraphCacheNow",
                args: {
                  reason: "graph_tab",
                },
              },
            ),
        tone: snapshot.graph.layoutStatus === "failed" ? "warning" : "info",
      }),
    );
    stage.appendChild(empty);
    return;
  }
  if (selectedTopicTitle && !snapshot.graph.visibleNodes.length) {
    const empty = el("div", "graph-empty");
    empty.appendChild(
      renderEmptyState({
        title: t("synthesis-graph-empty-topic-title", {
          topic: selectedTopicTitle,
        }),
        message: t("synthesis-graph-empty-topic-message"),
        tone: "info",
      }),
    );
    stage.appendChild(empty);
    return;
  }
  if (graphCacheStatus !== "ready" && !state.standaloneExport) {
    const banner = el("div", "graph-layout-banner");
    banner.appendChild(
      el(
        "strong",
        "",
        graphCacheStatus === "failed"
          ? t("synthesis-graph-cache-failed")
          : t("synthesis-graph-cache-stale-title"),
      ),
    );
    banner.appendChild(
      el(
        "span",
        "muted",
        graphCacheStatus === "failed"
          ? t("synthesis-graph-cache-failed-body")
          : t("synthesis-graph-cache-stale-body"),
      ),
    );
    banner.appendChild(
      graphCacheStatus === "stale"
        ? makeGraphIncrementalRefreshButton(snapshot)
        : makeButton(t("synthesis-action-rebuild-graph-cache"), "hostCommand", {
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
          ? t("synthesis-graph-drawing")
          : t("synthesis-graph-refreshing-layout"),
      ),
    );
    banner.appendChild(
      el(
        "span",
        "muted",
        snapshot.graph.layoutStatus === "failed"
          ? t("synthesis-graph-layout-failed-body")
          : t("synthesis-graph-layout-refreshing-body"),
      ),
    );
    stage.appendChild(banner);
  }
  if (!hasVisibleCoordinates) {
    const pending = el("div", "graph-empty");
    pending.appendChild(
      renderEmptyState({
        title: t("synthesis-graph-drawing"),
        message: t("synthesis-graph-layout-computing"),
        tone: snapshot.graph.layoutStatus === "failed" ? "warning" : "info",
      }),
    );
    stage.appendChild(pending);
    return;
  }
  if (!state.standaloneGraphOnly) {
    stage.appendChild(renderCitationGraphLegend());
  }
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
  slider.setAttribute("aria-label", t("synthesis-graph-zoom"));
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

function filterStandaloneGraph(
  graph: Snapshot["graph"],
  filters: Snapshot["graph"]["filters"],
) {
  const selectedScope =
    filters.topicId === "all"
      ? undefined
      : graph.topicScopes.find((scope) => scope.topicId === filters.topicId);
  const isTopicScoped = filters.topicId !== "all";
  const topicSourceIds = new Set(selectedScope?.nodeIds || []);
  const topicScopedNodeIds = new Set(topicSourceIds);
  if (isTopicScoped) {
    graph.edges.forEach((edge) => {
      if (topicSourceIds.has(edge.source)) {
        topicScopedNodeIds.add(edge.source);
        topicScopedNodeIds.add(edge.target);
      }
      if (topicSourceIds.has(edge.target)) {
        topicScopedNodeIds.add(edge.source);
        topicScopedNodeIds.add(edge.target);
      }
    });
  }
  const visibleNodes = graph.nodes.filter((node) => {
    if (!filters.nodeKinds.includes(node.kind)) return false;
    if (!filters.showLowSignalReferences && node.low_signal) return false;
    if (node.visibility === "hover_only") return false;
    if (isTopicScoped && !topicScopedNodeIds.has(node.id)) return false;
    return true;
  });
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = graph.edges.filter((edge) => {
    if (edge.visibility === "hover_only") return false;
    if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) {
      return false;
    }
    if (
      isTopicScoped &&
      !topicSourceIds.has(edge.source) &&
      !topicSourceIds.has(edge.target)
    ) {
      return false;
    }
    if (filters.role !== "all" && edge.primary_role !== filters.role) {
      return false;
    }
    return true;
  });
  return { visibleNodes, visibleEdges };
}

function renderStandaloneGraphControls(snapshot: Snapshot) {
  const wrap = el("div", "graph-controls standalone-graph-controls");
  const role = selectControl(
    ["all", ...roleOptions(snapshot)],
    snapshot.graph.filters.role,
    (value) => sendAction("setGraphView", { role: value }),
    graphEdgeRoleLabel,
  );
  wrap.appendChild(
    graphControlGroup(t("synthesis-graph-control-citation-role"), [role]),
  );

  const kindControls: HTMLElement[] = [];
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
        document.createTextNode(enumLabel("graph-node-kind", kind)),
      );
      kindControls.push(label);
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
  lowSignal.appendChild(
    document.createTextNode(
      enumLabel("graph-node-kind", "low_signal_external"),
    ),
  );
  kindControls.push(lowSignal);
  wrap.appendChild(
    graphControlGroup(t("synthesis-graph-control-node-types"), kindControls),
  );

  const layoutButtons: HTMLElement[] = [];
  (
    [
      ["force", enumLabel("graph-layout", "force")],
      ["radial", enumLabel("graph-layout", "radial")],
      ["components", enumLabel("graph-layout", "components")],
    ] as Array<[string, string]>
  ).forEach(([algorithm, label]) => {
    layoutButtons.push(
      makeButton(
        label,
        "setGraphView",
        { layoutAlgorithm: algorithm },
        snapshot.graph.layoutAlgorithm === algorithm,
      ),
    );
  });
  wrap.appendChild(
    graphControlGroup(t("synthesis-graph-control-layout"), layoutButtons),
  );
  return wrap;
}

function renderGraphControls(snapshot: Snapshot) {
  const wrap = el("div", "graph-controls");
  const search = el("input");
  search.dataset.synthesisControlKey = "graph.search";
  search.placeholder = t("synthesis-search-node");
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
  const searchButton = makeLocalButton(t("synthesis-action-search"), () => {
    submitGraphSearch(search.value);
  });
  const clearSearchButton = makeLocalButton(t("synthesis-action-clear"), () => {
    search.value = "";
    state.graphSearchDraft = "";
    sendAction("setFilters", { graph: { search: "" } });
    refreshGraphSearchHighlight();
  });
  wrap.appendChild(
    graphControlGroup(t("synthesis-graph-control-search"), [
      search,
      searchButton,
      clearSearchButton,
    ]),
  );

  const role = selectControl(
    ["all", ...roleOptions(snapshot)],
    snapshot.graph.filters.role,
    (value) => sendAction("setGraphView", { role: value }),
    graphEdgeRoleLabel,
  );
  wrap.appendChild(
    graphControlGroup(t("synthesis-graph-control-citation-role"), [role]),
  );
  const scope = selectControlWithLabels(
    graphTopicScopeOptions(snapshot),
    snapshot.graph.filters.topicId || "all",
    (value) => {
      state.graphReturnTopicId = undefined;
      sendAction("setGraphView", { topicId: value || "all" });
    },
  );
  wrap.appendChild(
    graphControlGroup(t("synthesis-graph-control-scope"), [scope]),
  );
  const graphCacheStatus = textValue(
    snapshot.graph.diagnostics?.cache_status,
    snapshot.graph.graph_hash ? "ready" : "missing",
  );
  const refreshButton = makeGraphIncrementalRefreshButton(snapshot);
  const rebuildButton = makeButton(
    t("synthesis-action-rebuild-graph-cache"),
    "hostCommand",
    {
      command: "rebuildCitationGraphCacheNow",
      args: { reason: "user" },
    },
    false,
    graphCacheStatus === "refreshing",
  );
  const redrawButton = makeButton(
    t("synthesis-action-redraw-layout"),
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
  );
  wrap.appendChild(
    graphControlGroup(t("synthesis-graph-control-cache"), [
      refreshButton,
      rebuildButton,
      redrawButton,
    ]),
  );

  const kindControls: HTMLElement[] = [];
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
        document.createTextNode(enumLabel("graph-node-kind", kind)),
      );
      kindControls.push(label);
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
  lowSignal.appendChild(
    document.createTextNode(
      enumLabel("graph-node-kind", "low_signal_external"),
    ),
  );
  kindControls.push(lowSignal);
  wrap.appendChild(
    graphControlGroup(t("synthesis-graph-control-node-types"), kindControls),
  );

  const layoutButtons: HTMLElement[] = [];
  (
    [
      ["force", enumLabel("graph-layout", "force")],
      ["radial", enumLabel("graph-layout", "radial")],
      ["components", enumLabel("graph-layout", "components")],
    ] as Array<[string, string]>
  ).forEach(([algorithm, label]) => {
    layoutButtons.push(
      makeButton(
        label,
        "setGraphView",
        { layoutAlgorithm: algorithm },
        snapshot.graph.layoutAlgorithm === algorithm,
      ),
    );
  });
  wrap.appendChild(
    graphControlGroup(t("synthesis-graph-control-layout"), layoutButtons),
  );
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
    t("synthesis-action-refresh-stale-graph"),
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
        ? t("synthesis-graph-refresh-only-stale")
        : t("synthesis-graph-cache-no-scope");
  }
  return button;
}

function isCurrentPaperGraphNode(node: GraphNode) {
  return Boolean(
    node.is_focus ||
    node.focus_role === "current_paper" ||
    (state.standaloneGraphFocusNodeId &&
      node.id === state.standaloneGraphFocusNodeId),
  );
}

function graphNodeColor(node: GraphNode) {
  if (isCurrentPaperGraphNode(node)) {
    return "#dc2626";
  }
  if (node.display_tier === "single_external") {
    return "#b6bd74";
  }
  return colors[node.kind];
}

function graphNodeImportanceColor(node: GraphNode) {
  if (isCurrentPaperGraphNode(node)) {
    return "#ef4444";
  }
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
  const multiplier = isCurrentPaperGraphNode(node) ? 1.5 : 1;
  if (!importance || importance.incomingDegree <= 0) {
    return base * multiplier;
  }
  const cap = graphNodeSizeCap(node);
  return (
    Math.min(cap, base + (cap - base) * importance.percentile) * multiplier
  );
}

function graphNodeZIndex(node: GraphNode, importance?: GraphNodeImportance) {
  if (isCurrentPaperGraphNode(node)) {
    return 18;
  }
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
    currentPaperNode?: unknown;
  },
) {
  const dark = graphUsesDarkTheme();
  const libraryNode = data.kind === "library_paper";
  const currentPaperNode = Boolean(data.currentPaperNode);
  const strong = currentPaperNode
    ? dark
      ? "rgba(248, 113, 113, 0.88)"
      : "rgba(220, 38, 38, 0.62)"
    : libraryNode
      ? dark
        ? GRAPH_LIBRARY_IMPORTANCE_HALO_DARK
        : GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT
      : dark
        ? GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK
        : GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT;
  const soft = currentPaperNode
    ? dark
      ? "rgba(248, 113, 113, 0.32)"
      : "rgba(220, 38, 38, 0.2)"
    : libraryNode
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
        currentPaperNode?: unknown;
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
    const currentPaperNode = isCurrentPaperGraphNode(node);
    graph.addNode(node.id, {
      title: node.label,
      label: "",
      x: typeof node.x === "number" ? node.x : 0,
      y: typeof node.y === "number" ? node.y : 0,
      size: graphNodeSize(node, importance),
      color:
        importance?.halo || currentPaperNode
          ? graphNodeImportanceColor(node)
          : graphNodeColor(node),
      zIndex: graphNodeZIndex(node, importance),
      highlighted: importance?.halo || currentPaperNode || false,
      importanceHalo: importance?.halo || currentPaperNode || false,
      importanceInteractive: false,
      currentPaperNode,
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
        label: edge.primary_role ? graphEdgeRoleLabel(edge.primary_role) : "",
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
      const currentPaperNode = Boolean(data.currentPaperNode);
      if (!state.hoveredNode || !graph.hasNode(state.hoveredNode)) {
        if (!searchActive) return data;
        return {
          ...data,
          color: searchMatch
            ? "#0ea5e9"
            : currentPaperNode
              ? data.color
              : "#d3d8de",
          size: searchMatch
            ? Math.max(
                Number(data.size || 1) * 1.35,
                Number(data.size || 1) + 1,
              )
            : Number(data.size || 1),
          zIndex: searchMatch
            ? Math.max(30, Number(data.zIndex || 0))
            : Number(data.zIndex || 0),
          highlighted: Boolean(
            currentPaperNode || (data.importanceHalo && searchMatch),
          ),
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
        color: searchMatch
          ? "#0ea5e9"
          : neighbor || currentPaperNode
            ? data.color
            : "#d3d8de",
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
        highlighted: Boolean(
          currentPaperNode ||
          (data.importanceHalo && (searchMatch || neighbor)),
        ),
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
      ["authors", node?.authors?.length ? node.authors.join("; ") : "-"],
      ["signal", node?.low_signal ? "low" : "normal"],
    ];
    if (!state.standaloneGraphOnly) {
      fields.splice(4, 0, [
        "incoming citations",
        node ? graphNodeIncomingDegree(node, incomingDegrees) : "-",
      ]);
    }
    if (!state.standaloneExport) {
      fields.push(["id", selected.id]);
    }
    wrap.appendChild(renderDetailList(fields));
    if (node?.kind === "library_paper") {
      if (!state.standaloneExport) {
        wrap.appendChild(
          makeButton(t("synthesis-action-open-zotero-item"), "hostCommand", {
            command: "openZoteroItem",
            args: { nodeId: node.id, libraryId: snapshot.libraryId },
          }),
        );
      }
      if (!state.standaloneGraphOnly) {
        wrap.appendChild(renderSelectedNodeCitations(snapshot, node));
      }
    }
    return wrap;
  }
  const edge = graphEdgeById(snapshot).get(selected.id);
  const edgeFields: Array<[string, unknown]> = [
    ["role", edge?.primary_role ? graphEdgeRoleLabel(edge.primary_role) : "-"],
    ["source", edge?.source || "-"],
    ["target", edge?.target || "-"],
  ];
  if (!state.standaloneGraphOnly) {
    edgeFields.push(["mentions", edge?.mention_count || 0]);
  }
  if (!state.standaloneExport) {
    edgeFields.push(["id", selected.id]);
  }
  wrap.appendChild(renderDetailList(edgeFields));
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
        message:
          node.kind === "library_paper"
            ? "This library paper has no citation targets in the graph."
            : "This reference has no outgoing citation targets in the graph.",
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
      meta.appendChild(
        el("span", "muted", graphEdgeRoleLabel(edge.primary_role)),
      );
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
        td.textContent = maybeLocalizedValue(cell) || String(cell ?? "");
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
  headers: Array<string | { label: string; className?: string }>,
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
  headers.forEach((header) =>
    tr.appendChild(
      el(
        "th",
        typeof header === "string" ? "" : header.className || "",
        typeof header === "string" ? header : header.label,
      ),
    ),
  );
  thead.appendChild(tr);
  table.appendChild(thead);
  const tbody = el("tbody");
  rows.forEach((row) => {
    const rowNode = el("tr");
    mapRow(row).forEach((cell, index) => {
      const header = headers[index];
      const td = el(
        "td",
        typeof header === "string" ? "" : header.className || "",
      );
      if (cell instanceof Node) {
        td.appendChild(cell);
      } else {
        td.textContent = maybeLocalizedValue(cell) || String(cell ?? "");
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

function compactTopicGraphEdgeSignature(row: Record<string, unknown>) {
  return [
    row.edge_id,
    row.status,
    row.relation,
    row.source_topic_id,
    row.target_topic_id,
    row.confidence,
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
    row.source_materials_status,
    row.source_materials_percent,
    row.discovery_status,
    row.candidate_count,
    row.updated_at,
    row.paper_count,
    row.updateIntent,
  ];
}

function registryContentSignature(snapshot: Snapshot) {
  const targetCandidates = (snapshot.registry.matchTargetCandidates || []).map(
    (candidate) => [
      candidate.kind,
      candidate.title,
      candidate.year,
      candidate.canonicalReferenceId,
      candidate.itemKey,
      candidate.paperRef,
    ],
  );
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
    targetCandidates,
    cacheStatus: [
      snapshot.registry.cacheStatus?.status,
      snapshot.registry.cacheStatus?.refreshed_at,
    ],
  };
}

function reviewContentSignature(snapshot: Snapshot) {
  const targetCandidates = (snapshot.registry.matchTargetCandidates || []).map(
    (candidate) => [
      candidate.kind,
      candidate.title,
      candidate.year,
      candidate.canonicalReferenceId,
      candidate.itemKey,
      candidate.paperRef,
    ],
  );
  return {
    selectedTab: snapshot.selectedTab,
    filters: reviewFilters(snapshot),
    proposals: (snapshot.registry.matchProposals || []).map(
      compactReferenceProposalSignature,
    ),
    targetCandidates,
    cleanup: (snapshot.registry.cleanupProposals || []).map(
      compactCleanupProposalSignature,
    ),
    concepts: (snapshot.concepts.reviewItems || []).map(
      compactReviewItemSignature,
    ),
    graphEdges: (snapshot.topicGraph.edges || []).map(
      compactTopicGraphEdgeSignature,
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
      topicScopes: (snapshot.graph.topicScopes || []).map((scope) => [
        scope.topicId,
        scope.title,
        scope.nodeIds,
      ]),
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
  const graphSurfaceActive =
    snapshot?.selectedTab === "graph" ||
    (state.standaloneExport && state.topicDetailSection === "citation_graph");
  if (!snapshot || !graphSurfaceActive) {
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
  labelFor: (value: string) => string = (option) => maybeLocalizedValue(option),
) {
  const select = el("select");
  options.forEach((option) => {
    const node = el("option", "", labelFor(option));
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
    const node = el("option", "", uiText(label));
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
      el("div", "loading-title", t("synthesis-loading-title")),
    );
    loading.appendChild(
      el("div", "loading-subtitle", t("synthesis-loading-subtitle")),
    );
    root.appendChild(loading);
    localizeWorkbenchDom(root);
    return;
  }
  const renderState = captureWorkbenchRenderState(root as HTMLElement);
  disposeGraphRenderer();
  if (state.standaloneGraphOnly) {
    renderStandaloneGraphExportShell(root as HTMLElement, state.snapshot);
  } else if (state.standaloneExport) {
    renderStandaloneTopicExportShell(root as HTMLElement, state.snapshot);
  } else {
    renderShell(root as HTMLElement, state.snapshot);
  }
  restoreWorkbenchRenderState(root as HTMLElement, renderState);
  renderDigestModal(root as HTMLElement);
  syncReferenceManualTargetOverlay(state.snapshot);
  localizeWorkbenchDom(root as HTMLElement);
  state.lastContentSignature = snapshotContentSignature(state.snapshot);
  state.lastChromeSignature = snapshotChromeSignature(state.snapshot);
  maybeRequestGraphLayoutRefresh(state.snapshot);
}

function renderStandaloneGraphExportShell(
  root: HTMLElement,
  snapshot: Snapshot,
) {
  clear(root);
  root.className = "synthesis-root standalone-graph-export-root";
  const main = el("main", "standalone-graph-export-main");
  root.appendChild(main);
  renderGraph(main, snapshot);
}

function maybeRequestGraphLayoutRefresh(snapshot: Snapshot | null) {
  if (state.standaloneExport) {
    return;
  }
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
  return buildMarkdownOutline(markdownNode, {
    ariaLabel: "Digest outline",
    headingIdPrefix: "digest-heading",
    linkClassName: "digest-outline-link",
    navClassName: "digest-outline",
    title: "Outline",
  });
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

function applyStandaloneTopicExportEnvelope(
  envelope: SynthesisTopicExportEnvelope | undefined,
) {
  if (!envelope || typeof envelope !== "object") {
    return false;
  }
  state.standaloneExport = true;
  applyI18nEnvelope({ i18n: envelope.i18n || {} });
  state.snapshot = envelope.snapshot || null;
  state.topicDetail = envelope.topicDetail || undefined;
  state.artifactReader = undefined;
  state.digestModal = undefined;
  state.evidenceExplorerOpen = false;
  state.topicDetailSection = "overview";
  state.graphReturnTopicId =
    state.topicDetail?.topicId || state.snapshot?.reader?.topicId || undefined;
  state.standaloneDigestsByKey.clear();
  state.standaloneGraphLayouts.clear();
  const digestsByKey = recordValue(envelope.digestsByKey);
  Object.entries(digestsByKey).forEach(([key, value]) => {
    const digest = recordValue(value);
    if (key && Object.keys(digest).length) {
      state.standaloneDigestsByKey.set(key, digest);
    }
  });
  const graphLayouts = recordValue(envelope.graphLayouts);
  Object.entries(graphLayouts).forEach(([key, value]) => {
    const graph = normalizeStandaloneGraphSnapshot(
      recordValue(value) as Snapshot["graph"],
    );
    if (key && Array.isArray(graph.nodes) && Array.isArray(graph.edges)) {
      state.standaloneGraphLayouts.set(
        normalizeGraphLayoutAlgorithm(key),
        graph,
      );
    }
  });
  if (state.snapshot) {
    if (state.snapshot.graph) {
      state.snapshot = {
        ...state.snapshot,
        graph: normalizeStandaloneGraphSnapshot(state.snapshot.graph),
      };
      state.standaloneGraphLayouts.set(
        normalizeGraphLayoutAlgorithm(state.snapshot.graph.layoutAlgorithm),
        state.snapshot.graph,
      );
    }
    state.snapshot = {
      ...state.snapshot,
      selectedTab: "reader",
      reader: {
        topicId:
          state.topicDetail?.topicId || state.snapshot.reader?.topicId || "",
        previousTab: "artifacts",
      },
    };
  }
  render();
  return true;
}

function applyStandaloneGraphExportEnvelope(
  envelope: SynthesisGraphExportEnvelope | undefined,
) {
  if (!envelope || typeof envelope !== "object" || !envelope.snapshot) {
    return false;
  }
  state.standaloneExport = true;
  state.standaloneGraphOnly = true;
  state.standaloneGraphScopeLabel = textValue(envelope.scopeLabel);
  state.standaloneGraphFocusNodeId = textValue(envelope.focusNodeId);
  applyI18nEnvelope({ i18n: envelope.i18n || {} });
  state.snapshot = {
    ...envelope.snapshot,
    graph: normalizeStandaloneGraphSnapshot(envelope.snapshot.graph),
    selectedTab: "graph",
  };
  state.topicDetail = undefined;
  state.artifactReader = undefined;
  state.digestModal = undefined;
  state.evidenceExplorerOpen = false;
  state.graphReturnTopicId = undefined;
  state.standaloneDigestsByKey.clear();
  state.standaloneGraphLayouts.clear();
  const graphLayouts = recordValue(envelope.graphLayouts);
  Object.entries(graphLayouts).forEach(([key, value]) => {
    const graph = normalizeStandaloneGraphSnapshot(
      recordValue(value) as Snapshot["graph"],
    );
    if (key && Array.isArray(graph.nodes) && Array.isArray(graph.edges)) {
      state.standaloneGraphLayouts.set(
        normalizeGraphLayoutAlgorithm(key),
        graph,
      );
    }
  });
  state.standaloneGraphLayouts.set(
    normalizeGraphLayoutAlgorithm(state.snapshot.graph.layoutAlgorithm),
    state.snapshot.graph,
  );
  render();
  return true;
}

function syncDigestModal() {
  const root = document.getElementById("app");
  if (!(root instanceof HTMLElement)) {
    return;
  }
  renderDigestModal(root);
  localizeWorkbenchDom(root);
}

function renderDigestModal(root: HTMLElement) {
  root
    .querySelectorAll(".paper-digest-modal")
    .forEach((node: Element) => node.remove());
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
    syncDigestModal();
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
    syncDigestModal();
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
    const i18nChanged = applyI18nEnvelope(data.payload);
    const nextSnapshot = stripI18nFromSnapshotPayload(
      data.payload || null,
    ) as Snapshot | null;
    state.snapshot = nextSnapshot;
    clearResolvedLocalPending(state.snapshot);
    if (!state.snapshot) {
      render();
      return;
    }
    const nextChromeSignature = snapshotChromeSignature(state.snapshot);
    if (i18nChanged) {
      state.lastChromeSignature = nextChromeSignature;
      render();
      return;
    }
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
    const i18nChanged = applyI18nEnvelope(payload);
    const surface = String(payload.surface || "");
    if (!isWorkbenchSurfaceName(surface)) {
      render();
      return;
    }
    const requestId = surfacePayloadRequestId(payload);
    if (isStaleSurfacePayload(surface, requestId)) {
      return;
    }
    acceptSurfacePayload(surface, requestId);
    const nextSnapshot = stripI18nFromSnapshotPayload(
      payload.snapshot || null,
    ) as Snapshot | null;
    if (!nextSnapshot) {
      render();
      return;
    }
    const visibleSurface = state.snapshot
      ? surfaceForTab(state.snapshot.selectedTab)
      : surface;
    markSurfaceRuntime(surface, "ready", undefined, nextSnapshot, {
      requestId,
    });
    if (visibleSurface !== surface) {
      return;
    }
    state.snapshot = nextSnapshot;
    clearResolvedLocalPending(state.snapshot);
    const nextChromeSignature = snapshotChromeSignature(state.snapshot);
    const chromeChanged =
      i18nChanged || nextChromeSignature !== state.lastChromeSignature;
    if (surface === "index") {
      state.registryLoadingReferenceRows.clear();
    }
    if (i18nChanged) {
      render();
    } else {
      renderSurface(surface);
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
    applyI18nEnvelope(payload);
    const surface = String(payload.surface || "");
    if (!isWorkbenchSurfaceName(surface)) {
      renderWorkbenchChrome();
      return;
    }
    const requestId = surfacePayloadRequestId(payload);
    if (isStaleSurfacePayload(surface, requestId)) {
      return;
    }
    acceptSurfacePayload(surface, requestId);
    const transient = payload.transient === true;
    const message = String(
      payload.message || t("synthesis-surface-error-message"),
    );
    state.lastLocalAction = {
      key: `surface-error:${surface}`,
      command: "refresh",
      status: "failed",
      label: transient
        ? t("synthesis-surface-refreshing-label")
        : t("synthesis-surface-error-label"),
      completed_at: new Date().toISOString(),
      message,
    };
    const restored = restoreSurfaceSnapshotForError(surface);
    const cachedSnapshot = restored
      ? state.snapshot || undefined
      : surfaceRuntime(surface)?.snapshot;
    markSurfaceRuntime(surface, "failed", message, cachedSnapshot, {
      errorCode: String(payload.code || ""),
      transient,
      requestId,
    });
    const visibleSurface = state.snapshot
      ? surfaceForTab(state.snapshot.selectedTab)
      : surface;
    if (visibleSurface === surface) {
      if (restored || cachedSnapshot) {
        renderSurface(surface);
      } else {
        renderSelectedTabShell();
      }
    }
    renderWorkbenchChrome();
    return;
  }
  if (data.type === "synthesis:init" || data.type === "synthesis:snapshot") {
    const i18nChanged = applyI18nEnvelope(data.payload);
    const nextSnapshot = stripI18nFromSnapshotPayload(
      data.payload || null,
    ) as Snapshot | null;
    const nextContentSignature = snapshotContentSignature(nextSnapshot);
    const contentChanged =
      i18nChanged || nextContentSignature !== state.lastContentSignature;
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
    syncDigestModal();
  }
});

if (
  !applyStandaloneGraphExportEnvelope(
    window.__zoteroSkillsSynthesisGraphExport,
  ) &&
  !applyStandaloneTopicExportEnvelope(window.__zoteroSkillsSynthesisTopicExport)
) {
  sendAction("ready");
  render();
}
