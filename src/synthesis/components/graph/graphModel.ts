// Citation graph surface model: narrowed wire projections, defensive
// narrowing helpers, and the pure view logic shared by the GraphRegion
// component and the Sigma island.
//
// The wire contract keeps host-owned graphNode/graphEdge slots opaque
// (unknown); this module is the single place that narrows them into the
// concrete shapes the surface renders. The panel model projects the wire
// snapshot through narrowGraphSurfaceView; the region and island only consume
// the narrowed view.
//
// Ported from the legacy imperative page (src/synthesisWorkbenchApp.ts
// :13511-15596 and the graph node/edge row shapes at :77-111).

import {
  aggregateCitationGraphVisualEdges,
  citationGraphIncomingCounts,
} from "../../../shared/citationGraphVisualRules";
import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  type SynthesisWorkbenchMessageKey,
} from "../../../shared/synthesisWorkbenchI18nContract";

export type SynthesisGraphText = (
  key: SynthesisWorkbenchMessageKey,
  vars?: Record<string, unknown>,
) => string;

export type SynthesisGraphNodeKind =
  | "library_paper"
  | "external_reference"
  | "unresolved_reference";

export type SynthesisGraphLayoutAlgorithm = "force" | "radial" | "components";

export type SynthesisGraphElement =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string };

export type SynthesisGraphNodeVisibility = "default" | "hover_only";

export type SynthesisGraphNodeDisplayTier =
  | "library"
  | "shared_external"
  | "single_external";

export type SynthesisGraphNode = {
  id: string;
  label: string;
  kind: SynthesisGraphNodeKind;
  year?: string;
  authors?: string[];
  tags?: string[];
  collections?: string[];
  x?: number;
  y?: number;
  low_signal?: boolean;
  external_degree?: number;
  visibility?: SynthesisGraphNodeVisibility;
  display_tier?: SynthesisGraphNodeDisplayTier;
  is_focus?: boolean;
  focus_role?: string;
  metrics?: {
    internal_in_degree?: number;
    internal_out_degree?: number;
  };
};

export type SynthesisGraphEdge = {
  id: string;
  source: string;
  target: string;
  primary_role?: string;
  mention_count?: number;
  visibility?: SynthesisGraphNodeVisibility;
};

export type SynthesisGraphFilters = {
  search: string;
  role: string;
  topicId: string;
  layoutAlgorithm: SynthesisGraphLayoutAlgorithm;
  neighborhoodDepth: number;
  nodeKinds: SynthesisGraphNodeKind[];
  showLowSignalReferences: boolean;
};

export type SynthesisGraphWindowState = {
  status: "loading" | "complete" | "paused" | "failed";
  loadedNodes: number;
  loadedEdges: number;
  totalNodes: number;
  totalEdges: number;
  totalHoverNodes: number;
  totalHoverEdges: number;
  querySignature: string;
  roleOptions: string[];
  errorReason?: string;
};

export type SynthesisGraphTopicScope = {
  topicId: string;
  title: string;
  nodeIds: string[];
};

export type SynthesisGraphLayoutFailure = {
  graphHash: string;
  layoutAlgorithm: string;
  code: string;
  mutationStatus?: string;
  message?: string;
  occurredAt: string;
};

// diagnostics narrows to the fields the surface renders. summaryEntries are
// the legacy graphDiagnosticSummary "label: value" pieces built from raw
// diagnostic keys (legacy never translated them); the status fallback
// messages are resolved by the region through t().
export type SynthesisGraphDiagnostics = {
  cacheStatus: string;
  cacheDeltaAvailable: boolean;
  libraryNodeCount: number;
  sharedExternalCount: number;
  hoverOnlyExternalCount: number;
  layoutFailure?: SynthesisGraphLayoutFailure;
  summaryEntries: string[];
};

// The region's equality input: only this surface's user-visible content.
// generatedAt, request metadata, and fields owned by other surfaces stay out.
export type SynthesisGraphSurfaceView = {
  libraryId: number;
  graphHash: string;
  layoutStatus: "missing" | "refreshing" | "ready" | "stale" | "failed";
  layoutAlgorithm: SynthesisGraphLayoutAlgorithm;
  filters: SynthesisGraphFilters;
  selectedElement?: SynthesisGraphElement;
  topicScopes: SynthesisGraphTopicScope[];
  selectedTopicTitle: string;
  nodes: SynthesisGraphNode[];
  edges: SynthesisGraphEdge[];
  hoverOnlyNodes: SynthesisGraphNode[];
  hoverOnlyEdges: SynthesisGraphEdge[];
  visibleNodes: SynthesisGraphNode[];
  visibleEdges: SynthesisGraphEdge[];
  window?: SynthesisGraphWindowState;
  diagnostics: SynthesisGraphDiagnostics;
};

// ---------------------------------------------------------------------------
// Narrowing
// ---------------------------------------------------------------------------

function textValue(value: unknown, fallback = ""): string {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((entry) => textValue(entry)).filter(Boolean);
}

function optionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function narrowNodeKind(value: unknown): SynthesisGraphNodeKind {
  return value === "external_reference" || value === "unresolved_reference"
    ? value
    : "library_paper";
}

function narrowVisibility(value: unknown): SynthesisGraphNodeVisibility {
  return value === "hover_only" ? "hover_only" : "default";
}

function narrowDisplayTier(
  value: unknown,
): SynthesisGraphNodeDisplayTier | undefined {
  return value === "shared_external" || value === "single_external"
    ? value
    : value === "library"
      ? value
      : undefined;
}

export function narrowGraphNode(value: unknown): SynthesisGraphNode | null {
  if (!isRecord(value)) return null;
  const id = textValue(value.id);
  if (!id) return null;
  const metrics = isRecord(value.metrics) ? value.metrics : undefined;
  return {
    id,
    label: textValue(value.label, id),
    kind: narrowNodeKind(value.kind),
    year: textValue(value.year) || undefined,
    authors: stringArray(value.authors),
    tags: stringArray(value.tags),
    collections: stringArray(value.collections),
    x: optionalNumber(value.x),
    y: optionalNumber(value.y),
    low_signal: value.low_signal === true,
    external_degree: optionalNumber(value.external_degree),
    visibility: narrowVisibility(value.visibility),
    display_tier: narrowDisplayTier(value.display_tier),
    is_focus: value.is_focus === true,
    focus_role: textValue(value.focus_role) || undefined,
    metrics: metrics
      ? {
          internal_in_degree: optionalNumber(metrics.internal_in_degree),
          internal_out_degree: optionalNumber(metrics.internal_out_degree),
        }
      : undefined,
  };
}

export function narrowGraphEdge(value: unknown): SynthesisGraphEdge | null {
  if (!isRecord(value)) return null;
  const id = textValue(value.id);
  const source = textValue(value.source);
  const target = textValue(value.target);
  if (!id || !source || !target) return null;
  return {
    id,
    source,
    target,
    primary_role: textValue(value.primary_role) || undefined,
    mention_count: optionalNumber(value.mention_count),
    visibility: narrowVisibility(value.visibility),
  };
}

function narrowNodeList(value: unknown): SynthesisGraphNode[] {
  if (!Array.isArray(value)) return [];
  const rows: SynthesisGraphNode[] = [];
  for (const entry of value) {
    const node = narrowGraphNode(entry);
    if (node) rows.push(node);
  }
  return rows;
}

function narrowEdgeList(value: unknown): SynthesisGraphEdge[] {
  if (!Array.isArray(value)) return [];
  const rows: SynthesisGraphEdge[] = [];
  for (const entry of value) {
    const edge = narrowGraphEdge(entry);
    if (edge) rows.push(edge);
  }
  return rows;
}

function narrowLayoutAlgorithm(value: unknown): SynthesisGraphLayoutAlgorithm {
  return value === "radial" || value === "components" ? value : "force";
}

function narrowNodeKindList(value: unknown): SynthesisGraphNodeKind[] {
  if (!Array.isArray(value)) {
    return ["library_paper", "external_reference", "unresolved_reference"];
  }
  const kinds: SynthesisGraphNodeKind[] = [];
  for (const entry of value) {
    if (
      entry === "library_paper" ||
      entry === "external_reference" ||
      entry === "unresolved_reference"
    ) {
      kinds.push(entry);
    }
  }
  return kinds;
}

function narrowFilters(value: unknown): SynthesisGraphFilters {
  const record = isRecord(value) ? value : {};
  return {
    search: textValue(record.search),
    role: textValue(record.role, "all"),
    topicId: textValue(record.topicId, "all"),
    layoutAlgorithm: narrowLayoutAlgorithm(record.layoutAlgorithm),
    neighborhoodDepth: Math.max(
      0,
      Math.floor(numberValue(record.neighborhoodDepth, 1)),
    ),
    nodeKinds: narrowNodeKindList(record.nodeKinds),
    showLowSignalReferences: record.showLowSignalReferences !== false,
  };
}

function narrowWindow(value: unknown): SynthesisGraphWindowState | undefined {
  if (!isRecord(value)) return undefined;
  const status = textValue(value.status);
  const error = isRecord(value.error) ? value.error : undefined;
  return {
    status:
      status === "paused" || status === "failed" || status === "loading"
        ? status
        : "complete",
    loadedNodes: Math.max(0, Math.floor(numberValue(value.loadedNodes))),
    loadedEdges: Math.max(0, Math.floor(numberValue(value.loadedEdges))),
    totalNodes: Math.max(0, Math.floor(numberValue(value.totalNodes))),
    totalEdges: Math.max(0, Math.floor(numberValue(value.totalEdges))),
    totalHoverNodes: Math.max(
      0,
      Math.floor(numberValue(value.totalHoverNodes)),
    ),
    totalHoverEdges: Math.max(
      0,
      Math.floor(numberValue(value.totalHoverEdges)),
    ),
    querySignature: textValue(value.querySignature),
    roleOptions: stringArray(value.roleOptions) || [],
    errorReason: textValue(error?.reason) || undefined,
  };
}

function narrowTopicScopes(value: unknown): SynthesisGraphTopicScope[] {
  if (!Array.isArray(value)) return [];
  const scopes: SynthesisGraphTopicScope[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const topicId = textValue(entry.topicId);
    if (!topicId) continue;
    scopes.push({
      topicId,
      title: textValue(entry.title) || topicId,
      nodeIds: stringArray(entry.nodeIds) || [],
    });
  }
  return scopes;
}

function narrowSelectedElement(
  value: unknown,
): SynthesisGraphElement | undefined {
  if (!isRecord(value)) return undefined;
  const id = textValue(value.id);
  if (!id) return undefined;
  if (value.kind === "node") return { kind: "node", id };
  if (value.kind === "edge") return { kind: "edge", id };
  return undefined;
}

function narrowLayoutFailure(
  value: unknown,
  graphHash: string,
  layoutAlgorithm: string,
): SynthesisGraphLayoutFailure | undefined {
  if (!isRecord(value)) return undefined;
  const failureHash = textValue(value.graph_hash);
  const failureAlgorithm = textValue(value.layout_algorithm);
  if (
    !failureHash ||
    failureHash !== graphHash ||
    !failureAlgorithm ||
    failureAlgorithm !== layoutAlgorithm
  ) {
    return undefined;
  }
  return {
    graphHash: failureHash,
    layoutAlgorithm: failureAlgorithm,
    code: textValue(value.code, "internal"),
    mutationStatus: textValue(value.mutation_status) || undefined,
    message: textValue(value.message) || undefined,
    occurredAt: textValue(value.occurred_at),
  };
}

// Legacy graphDiagnosticSummary entry formatting (:13582): the first three
// raw diagnostic keys rendered as "label: value" pieces.
function narrowDiagnosticSummaryEntries(
  diagnostics: Record<string, unknown>,
): string[] {
  return Object.entries(diagnostics)
    .filter(([key]) => key !== "layout_failure")
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
    });
}

function narrowDiagnostics(
  value: unknown,
  graphHash: string,
  layoutAlgorithm: string,
): SynthesisGraphDiagnostics {
  const record = isRecord(value) ? value : {};
  return {
    cacheStatus: textValue(
      record.cache_status,
      graphHash ? "ready" : "missing",
    ),
    cacheDeltaAvailable: record.cache_delta_available === true,
    libraryNodeCount: Math.max(
      0,
      Math.floor(numberValue(record.library_node_count)),
    ),
    sharedExternalCount: Math.max(
      0,
      Math.floor(numberValue(record.shared_external_count)),
    ),
    hoverOnlyExternalCount: Math.max(
      0,
      Math.floor(numberValue(record.hover_only_external_count)),
    ),
    layoutFailure: narrowLayoutFailure(
      record.layout_failure,
      graphHash,
      layoutAlgorithm,
    ),
    summaryEntries: narrowDiagnosticSummaryEntries(record),
  };
}

/**
 * Projects the wire snapshot's graph section into the narrowed surface view.
 * This is the panelModel integration seam: `narrowGraphSurfaceView(
 * snapshot.graph, snapshot.libraryId)`.
 */
export function narrowGraphSurfaceView(
  graph: unknown,
  libraryId: unknown,
): SynthesisGraphSurfaceView {
  const record = isRecord(graph) ? graph : {};
  const filters = narrowFilters(record.filters);
  const graphHash = textValue(record.graph_hash);
  const selectedTopicScope = isRecord(record.selectedTopicScope)
    ? record.selectedTopicScope
    : undefined;
  const selectedTopicTitle =
    filters.topicId === "all"
      ? ""
      : textValue(selectedTopicScope?.title) || filters.topicId;
  return {
    libraryId: Math.max(0, Math.floor(numberValue(libraryId))),
    graphHash,
    layoutStatus: ((): SynthesisGraphSurfaceView["layoutStatus"] => {
      const status = textValue(record.layoutStatus);
      return status === "refreshing" ||
        status === "ready" ||
        status === "stale" ||
        status === "failed"
        ? status
        : "missing";
    })(),
    layoutAlgorithm: narrowLayoutAlgorithm(record.layoutAlgorithm),
    filters,
    selectedElement: narrowSelectedElement(record.selectedElement),
    topicScopes: narrowTopicScopes(record.topicScopes),
    selectedTopicTitle,
    nodes: narrowNodeList(record.nodes),
    edges: narrowEdgeList(record.edges),
    hoverOnlyNodes: narrowNodeList(record.hoverOnlyNodes),
    hoverOnlyEdges: narrowEdgeList(record.hoverOnlyEdges),
    visibleNodes: narrowNodeList(record.visibleNodes),
    visibleEdges: narrowEdgeList(record.visibleEdges),
    window: narrowWindow(record.window),
    diagnostics: narrowDiagnostics(
      record.diagnostics,
      graphHash,
      filters.layoutAlgorithm,
    ),
  };
}

// ---------------------------------------------------------------------------
// Pure view logic
// ---------------------------------------------------------------------------

const GRAPH_NODE_COLORS: Record<SynthesisGraphNodeKind, string> = {
  library_paper: "#1967b3",
  external_reference: "#7a861f",
  unresolved_reference: "#9a6a21",
};

export function graphNodeBaseColor(kind: SynthesisGraphNodeKind): string {
  return GRAPH_NODE_COLORS[kind];
}

export function isCurrentPaperGraphNode(
  node: SynthesisGraphNode,
  focusNodeId?: string,
): boolean {
  return Boolean(
    node.is_focus ||
    node.focus_role === "current_paper" ||
    (focusNodeId && node.id === focusNodeId),
  );
}

function enumKeyPart(value: unknown): string {
  return textValue(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function humanizeEnumValue(value: unknown): string {
  const text = textValue(value);
  if (!text) return "";
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export type SynthesisGraphEnumDomain =
  | "graph-node-kind"
  | "graph-edge-role"
  | "graph-layout";

export function graphEnumLabel(
  t: SynthesisGraphText,
  domain: SynthesisGraphEnumDomain,
  value: unknown,
): string {
  const keyPart = enumKeyPart(value);
  if (keyPart) {
    const key =
      `synthesis-enum-${domain}-${keyPart}` as SynthesisWorkbenchMessageKey;
    if (key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) {
      return t(key);
    }
  }
  return humanizeEnumValue(value);
}

export function graphEdgeRoleLabel(
  t: SynthesisGraphText,
  value: string,
): string {
  return value === "all"
    ? t("synthesis-filter-all")
    : graphEnumLabel(t, "graph-edge-role", value);
}

/** Legacy roleOptions (:13511): window-provided roles win over derivation. */
export function graphRoleOptions(view: SynthesisGraphSurfaceView): string[] {
  if (view.window?.roleOptions.length) {
    return [...view.window.roleOptions];
  }
  return Array.from(
    new Set(
      view.edges
        .map((edge) => edge.primary_role || "unknown")
        .map((role) => (role === "citation" ? "" : role))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function graphNodeById(
  view: SynthesisGraphSurfaceView,
): Map<string, SynthesisGraphNode> {
  return new Map(
    [...view.nodes, ...view.hoverOnlyNodes].map((node) => [node.id, node]),
  );
}

export function graphEdgeById(
  view: SynthesisGraphSurfaceView,
): Map<string, SynthesisGraphEdge> {
  return new Map(
    [...view.edges, ...view.hoverOnlyEdges].map((edge) => [edge.id, edge]),
  );
}

/**
 * Legacy maybeLocalizedValue (:839) scoped to the domains the graph detail
 * list can produce: status keys, relation keys, and the graph enum domains.
 * Returns "" when no localization exists so callers fall back to raw text.
 */
export function localizedGraphDetailValue(
  t: SynthesisGraphText,
  value: unknown,
): string {
  const text = textValue(value);
  if (!text) return "";
  const normalized = text.replace(/_/g, "-").toLowerCase();
  const statusKey =
    `synthesis-status-${normalized}` as SynthesisWorkbenchMessageKey;
  if (statusKey in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) return t(statusKey);
  const relationKey =
    `synthesis-relation-${normalized}` as SynthesisWorkbenchMessageKey;
  if (relationKey in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) {
    return t(relationKey);
  }
  const domains: SynthesisGraphEnumDomain[] = [
    "graph-node-kind",
    "graph-edge-role",
    "graph-layout",
  ];
  for (const domain of domains) {
    const keyPart = enumKeyPart(text);
    if (!keyPart) break;
    const key =
      `synthesis-enum-${domain}-${keyPart}` as SynthesisWorkbenchMessageKey;
    if (key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) return t(key);
  }
  return "";
}

/** Legacy graphNodeSearchText (:14462). */
export function graphNodeSearchText(node: SynthesisGraphNode): string {
  return `${node.label} ${node.id} ${node.year || ""} ${(node.tags || []).join(
    " ",
  )} ${(node.collections || []).join(" ")}`.toLowerCase();
}

export function graphNodeMatchesSearchText(
  searchable: unknown,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  return (
    Boolean(normalized) &&
    String(searchable == null ? "" : searchable)
      .toLowerCase()
      .includes(normalized)
  );
}

export function hasUsableGraphCoordinates(
  view: SynthesisGraphSurfaceView,
): boolean {
  return view.visibleNodes.some(
    (node) => Number.isFinite(node.x) && Number.isFinite(node.y),
  );
}

// Minimal structural input for the Sigma diff signatures; both the full
// surface view (region) and the island view satisfy it.
export type SynthesisGraphSignatureInput = {
  visibleNodes: readonly SynthesisGraphNode[];
  visibleEdges?: readonly SynthesisGraphEdge[];
  layoutAlgorithm: SynthesisGraphLayoutAlgorithm;
};

/** Legacy sigmaGraphModelSignature (:14723). */
export function sigmaGraphModelSignature(
  view: SynthesisGraphSignatureInput,
): string {
  const visualEdges = aggregateCitationGraphVisualEdges(
    view.visibleEdges || [],
  );
  return JSON.stringify({
    nodes: view.visibleNodes.map((node) => [
      node.id,
      node.label,
      node.kind,
      node.visibility,
      node.display_tier,
      node.metrics,
      node.is_focus,
      node.focus_role,
    ]),
    edges: visualEdges.map((edge) => [
      edge.id,
      edge.source,
      edge.target,
      edge.primary_role,
      edge.mention_count,
      edge.visibility,
    ]),
  });
}

/** Legacy sigmaGraphLayoutSignature (:14749). */
export function sigmaGraphLayoutSignature(
  view: SynthesisGraphSignatureInput,
): string {
  return JSON.stringify({
    algorithm: view.layoutAlgorithm,
    nodes: view.visibleNodes.map((node) => [node.id, node.x, node.y]),
  });
}

/** Selected-node incoming citation counts (legacy renderSelectedDetail). */
export function graphSelectedNodeIncomingCounts(
  view: SynthesisGraphSurfaceView,
  nodeId: string,
): { sourcePaperCount: number; citationRecordCount: number } {
  const loadedEdges = Array.from(
    new Map(
      [...view.visibleEdges, ...view.hoverOnlyEdges].map((edge) => [
        edge.id,
        edge,
      ]),
    ).values(),
  );
  return citationGraphIncomingCounts(nodeId, loadedEdges, [
    ...view.visibleNodes,
    ...view.hoverOnlyNodes,
  ]);
}

export type SynthesisGraphCitationEntry = {
  edge: SynthesisGraphEdge;
  target?: SynthesisGraphNode;
};

/** Legacy collectSelectedNodeCitations (:15345). */
export function collectSelectedNodeCitations(
  view: SynthesisGraphSurfaceView,
  sourceId: string,
): SynthesisGraphCitationEntry[] {
  const nodesById = graphNodeById(view);
  return Array.from(graphEdgeById(view).values())
    .filter((edge) => edge.source === sourceId)
    .sort(
      (left, right) =>
        (nodesById.get(left.target)?.label || left.target).localeCompare(
          nodesById.get(right.target)?.label || right.target,
        ) || left.id.localeCompare(right.id),
    )
    .map((edge) => ({ edge, target: nodesById.get(edge.target) }));
}
