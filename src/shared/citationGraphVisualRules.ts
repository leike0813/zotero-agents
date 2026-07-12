export const GRAPH_MIN_ZOOM_RATIO = 0.12;
export const GRAPH_MAX_ZOOM_RATIO = 2.4;
export const GRAPH_ZOOM_SLIDER_MAX = 100;
export const GRAPH_LIBRARY_BASE_NODE_SIZE = 4.6;
export const GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE = 3;
export const GRAPH_SINGLE_EXTERNAL_BASE_NODE_SIZE = 2;
export const GRAPH_LIBRARY_NODE_SIZE_CAP = 8;
export const GRAPH_EXTERNAL_NODE_SIZE_CAP = 4.8;
export const GRAPH_IMPORTANCE_HALO_TOP_RATIO = 0.1;
export const GRAPH_IMPORTANCE_HALO_MAX = 8;
export const GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT = "rgba(37, 99, 235, 0.52)";
export const GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT =
  "rgba(37, 99, 235, 0.22)";
export const GRAPH_LIBRARY_IMPORTANCE_HALO_DARK = "rgba(147, 197, 253, 0.82)";
export const GRAPH_LIBRARY_IMPORTANCE_HALO_DARK_SOFT =
  "rgba(147, 197, 253, 0.32)";
export const GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT = "rgba(180, 83, 9, 0.56)";
export const GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT_SOFT =
  "rgba(180, 83, 9, 0.22)";
export const GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK = "rgba(251, 191, 36, 0.86)";
export const GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK_SOFT =
  "rgba(251, 191, 36, 0.34)";
export const CITATION_GRAPH_EDGE_SIZE = 1.05;
export const CITATION_GRAPH_INCOMING_EDGE_COLOR = "#d97706";
export const CITATION_GRAPH_OUTGOING_EDGE_COLOR = "#7c3aed";

export type CitationGraphVisualNode = {
  id: string;
  kind: "library_paper" | "external_reference";
  display_tier?: "library" | "shared_external" | "single_external";
  metrics?: {
    internal_in_degree?: number;
  };
};

export type CitationGraphVisualEdge = {
  source: string;
  target: string;
  mention_count?: number;
  visibility?: "default" | "hover_only";
};

export type CitationGraphNodeImportance = {
  incomingDegree: number;
  percentile: number;
  halo: boolean;
};

export function citationGraphFallbackIncomingDegrees(
  nodes: CitationGraphVisualNode[],
  edges: CitationGraphVisualEdge[],
) {
  const visibleIds = new Set(nodes.map((node) => node.id));
  const incoming = new Map<string, number>();
  for (const edge of edges) {
    if (
      edge.visibility === "hover_only" ||
      !visibleIds.has(edge.source) ||
      !visibleIds.has(edge.target)
    ) {
      continue;
    }
    const weight = Math.max(1, Math.floor(Number(edge.mention_count) || 1));
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + weight);
  }
  return incoming;
}

export function citationGraphIncomingDegree(
  node: CitationGraphVisualNode,
  fallbackIncomingDegrees: ReadonlyMap<string, number>,
) {
  const metricDegree = node.metrics?.internal_in_degree;
  if (typeof metricDegree === "number" && Number.isFinite(metricDegree)) {
    return Math.max(0, Math.floor(metricDegree));
  }
  return fallbackIncomingDegrees.get(node.id) || 0;
}

export function buildCitationGraphNodeImportance(
  nodes: CitationGraphVisualNode[],
  visibleEdges: CitationGraphVisualEdge[],
) {
  const fallbackIncomingDegrees = citationGraphFallbackIncomingDegrees(
    nodes,
    visibleEdges,
  );
  const entries = nodes
    .map((node) => ({
      node,
      incomingDegree: citationGraphIncomingDegree(
        node,
        fallbackIncomingDegrees,
      ),
    }))
    .filter((entry) => entry.incomingDegree > 0);
  const maxDegree = Math.max(
    0,
    ...entries.map((entry) => entry.incomingDegree),
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
  return new Map<string, CitationGraphNodeImportance>(
    entries.map((entry) => [
      entry.node.id,
      {
        incomingDegree: entry.incomingDegree,
        percentile:
          Math.log1p(entry.incomingDegree) / Math.log1p(maxDegree + 1),
        halo: haloNodeIds.has(entry.node.id),
      },
    ]),
  );
}

function citationGraphNodeBaseSize(node: CitationGraphVisualNode) {
  if (node.kind === "library_paper") return GRAPH_LIBRARY_BASE_NODE_SIZE;
  if (node.display_tier === "shared_external") {
    return GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE;
  }
  if (node.display_tier === "single_external") {
    return GRAPH_SINGLE_EXTERNAL_BASE_NODE_SIZE;
  }
  return 2.5;
}

function citationGraphNodeSizeCap(node: CitationGraphVisualNode) {
  return node.kind === "library_paper"
    ? GRAPH_LIBRARY_NODE_SIZE_CAP
    : GRAPH_EXTERNAL_NODE_SIZE_CAP;
}

export function citationGraphNodeSize(
  node: CitationGraphVisualNode,
  importance: CitationGraphNodeImportance | undefined,
  isCurrentPaper: boolean,
) {
  const base = citationGraphNodeBaseSize(node);
  const multiplier = isCurrentPaper ? 1.5 : 1;
  if (!importance || importance.incomingDegree <= 0) return base * multiplier;
  const cap = citationGraphNodeSizeCap(node);
  return (
    Math.min(cap, base + (cap - base) * importance.percentile) * multiplier
  );
}
