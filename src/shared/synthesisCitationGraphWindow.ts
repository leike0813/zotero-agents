export const SYNTHESIS_CITATION_GRAPH_NODE_SOFT_LIMIT = 10_000;
export const SYNTHESIS_CITATION_GRAPH_EDGE_SOFT_LIMIT = 20_000;

export type SynthesisCitationGraphWindowStatus =
  | "loading"
  | "complete"
  | "paused"
  | "failed";

type GraphNode = { id?: string; node_id?: string };
type GraphEdge = {
  id?: string;
  edge_id?: string;
  source: string;
  target: string;
};

export type SynthesisCitationGraphWindow<
  Node extends GraphNode = GraphNode,
  Edge extends GraphEdge = GraphEdge,
> = {
  generation: number;
  graphHash?: string;
  querySignature?: string;
  nodes: Node[];
  edges: Edge[];
  hoverOnlyNodes: Node[];
  hoverOnlyEdges: Edge[];
  nextCursor?: string;
  hasMore: boolean;
  totalNodes: number;
  totalEdges: number;
  totalHoverNodes: number;
  totalHoverEdges: number;
  nodeSoftLimit: number;
  edgeSoftLimit: number;
  status: SynthesisCitationGraphWindowStatus;
  error?: { code: string; reason?: string };
};

export type SynthesisCitationGraphWindowPatch<
  Node extends GraphNode,
  Edge extends GraphEdge,
> = {
  generation: number;
  graphHash: string;
  querySignature: string;
  nodes: Node[];
  edges: Edge[];
  hoverOnlyNodes?: Node[];
  hoverOnlyEdges?: Edge[];
  nextCursor?: string;
  hasMore?: boolean;
  totalNodes?: number;
  totalEdges?: number;
  totalHoverNodes?: number;
  totalHoverEdges?: number;
};

export type SynthesisCitationGraphMergeResult<
  Node extends GraphNode,
  Edge extends GraphEdge,
> = {
  accepted: boolean;
  reason?: "stale_generation" | "basis_mismatch" | "invalid_patch";
  addedNodes: number;
  addedEdges: number;
  window: SynthesisCitationGraphWindow<Node, Edge>;
};

export function createSynthesisCitationGraphWindow<
  Node extends GraphNode = GraphNode,
  Edge extends GraphEdge = GraphEdge,
>(options: {
  generation: number;
  nodeSoftLimit?: number;
  edgeSoftLimit?: number;
}): SynthesisCitationGraphWindow<Node, Edge> {
  return {
    generation: options.generation,
    nodes: [],
    edges: [],
    hoverOnlyNodes: [],
    hoverOnlyEdges: [],
    hasMore: true,
    totalNodes: 0,
    totalEdges: 0,
    totalHoverNodes: 0,
    totalHoverEdges: 0,
    nodeSoftLimit:
      options.nodeSoftLimit ?? SYNTHESIS_CITATION_GRAPH_NODE_SOFT_LIMIT,
    edgeSoftLimit:
      options.edgeSoftLimit ?? SYNTHESIS_CITATION_GRAPH_EDGE_SOFT_LIMIT,
    status: "loading",
  };
}

function nodeId(node: GraphNode) {
  return node.id || node.node_id || "";
}

function edgeId(edge: GraphEdge) {
  return edge.id || edge.edge_id || "";
}

function mergeById<Item>(
  current: readonly Item[],
  patch: readonly Item[],
  getId: (item: Item) => string,
) {
  const result = [...current];
  const indexes = new Map(
    result.map((item, index) => [getId(item), index] as const),
  );
  let added = 0;
  for (const item of patch) {
    const id = getId(item);
    if (!id) continue;
    const index = indexes.get(id);
    if (index === undefined) {
      indexes.set(id, result.length);
      result.push(item);
      added += 1;
    } else {
      result[index] = item;
    }
  }
  return { items: result, added };
}

function rejectMerge<Node extends GraphNode, Edge extends GraphEdge>(
  window: SynthesisCitationGraphWindow<Node, Edge>,
  reason: SynthesisCitationGraphMergeResult<Node, Edge>["reason"],
): SynthesisCitationGraphMergeResult<Node, Edge> {
  return { accepted: false, reason, addedNodes: 0, addedEdges: 0, window };
}

function validatePatch<Node extends GraphNode, Edge extends GraphEdge>(
  window: SynthesisCitationGraphWindow<Node, Edge>,
  patch: SynthesisCitationGraphWindowPatch<Node, Edge>,
) {
  if (patch.generation !== window.generation) return "stale_generation";
  if (
    (window.graphHash && window.graphHash !== patch.graphHash) ||
    (window.querySignature && window.querySignature !== patch.querySignature)
  ) {
    return "basis_mismatch";
  }
  if (!patch.graphHash || !patch.querySignature) return "invalid_patch";
  return undefined;
}

function mergePatch<Node extends GraphNode, Edge extends GraphEdge>(
  window: SynthesisCitationGraphWindow<Node, Edge>,
  patch: SynthesisCitationGraphWindowPatch<Node, Edge>,
  advancePage: boolean,
): SynthesisCitationGraphMergeResult<Node, Edge> {
  const invalid = validatePatch(window, patch);
  if (invalid) return rejectMerge(window, invalid);
  const nodes = mergeById(window.nodes, patch.nodes, nodeId);
  const edges = mergeById(window.edges, patch.edges, edgeId);
  const hoverNodes = mergeById(
    window.hoverOnlyNodes,
    patch.hoverOnlyNodes || [],
    nodeId,
  );
  const hoverEdges = mergeById(
    window.hoverOnlyEdges,
    patch.hoverOnlyEdges || [],
    edgeId,
  );
  const hasMore = advancePage ? Boolean(patch.hasMore) : window.hasMore;
  const atSoftLimit =
    hasMore &&
    (nodes.items.length + hoverNodes.items.length >= window.nodeSoftLimit ||
      edges.items.length + hoverEdges.items.length >= window.edgeSoftLimit);
  return {
    accepted: true,
    addedNodes: nodes.added + hoverNodes.added,
    addedEdges: edges.added + hoverEdges.added,
    window: {
      ...window,
      graphHash: patch.graphHash,
      querySignature: patch.querySignature,
      nodes: nodes.items,
      edges: edges.items,
      hoverOnlyNodes: hoverNodes.items,
      hoverOnlyEdges: hoverEdges.items,
      nextCursor: advancePage ? patch.nextCursor : window.nextCursor,
      hasMore,
      totalNodes: patch.totalNodes ?? window.totalNodes,
      totalEdges: patch.totalEdges ?? window.totalEdges,
      totalHoverNodes: patch.totalHoverNodes ?? window.totalHoverNodes,
      totalHoverEdges: patch.totalHoverEdges ?? window.totalHoverEdges,
      status: advancePage
        ? atSoftLimit
          ? "paused"
          : hasMore
            ? "loading"
            : "complete"
        : window.status,
      error: undefined,
    },
  };
}

export function mergeSynthesisCitationGraphPage<
  Node extends GraphNode,
  Edge extends GraphEdge,
>(
  window: SynthesisCitationGraphWindow<Node, Edge>,
  page: SynthesisCitationGraphWindowPatch<Node, Edge>,
) {
  return mergePatch(window, page, true);
}

export function mergeSynthesisCitationGraphSlice<
  Node extends GraphNode,
  Edge extends GraphEdge,
>(
  window: SynthesisCitationGraphWindow<Node, Edge>,
  slice: SynthesisCitationGraphWindowPatch<Node, Edge>,
) {
  return mergePatch(window, slice, false);
}

export function continueSynthesisCitationGraphWindow<
  Node extends GraphNode,
  Edge extends GraphEdge,
>(window: SynthesisCitationGraphWindow<Node, Edge>) {
  if (window.status !== "paused") return window;
  return {
    ...window,
    nodeSoftLimit:
      window.nodeSoftLimit + SYNTHESIS_CITATION_GRAPH_NODE_SOFT_LIMIT,
    edgeSoftLimit:
      window.edgeSoftLimit + SYNTHESIS_CITATION_GRAPH_EDGE_SOFT_LIMIT,
    status: "loading" as const,
  };
}

export function failSynthesisCitationGraphWindow<
  Node extends GraphNode,
  Edge extends GraphEdge,
>(
  window: SynthesisCitationGraphWindow<Node, Edge>,
  code: string,
  reason?: string,
) {
  return {
    ...window,
    status: "failed" as const,
    error: { code, ...(reason ? { reason } : {}) },
  };
}

export function retrySynthesisCitationGraphWindow<
  Node extends GraphNode,
  Edge extends GraphEdge,
>(window: SynthesisCitationGraphWindow<Node, Edge>) {
  if (window.status !== "failed") return window;
  return { ...window, status: "loading" as const, error: undefined };
}
