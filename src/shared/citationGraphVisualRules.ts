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
export const CITATION_GRAPH_INTERACTION_NEIGHBOR_LIMIT = 100;
export const CITATION_GRAPH_INTERACTION_RING_RADIUS_PX = 28;
export const CITATION_GRAPH_INTERACTION_RING_GAP_PX = 22;
export const CITATION_GRAPH_INTERACTION_MIN_ARC_PX = 18;

export type CitationGraphVisualNode = {
  id: string;
  label?: string;
  kind: "library_paper" | "external_reference" | "unresolved_reference";
  low_signal?: boolean;
  visibility?: "default" | "hover_only";
  display_tier?: "library" | "shared_external" | "single_external";
  metrics?: {
    internal_in_degree?: number;
  };
};

export type CitationGraphVisualEdge = {
  id: string;
  source: string;
  target: string;
  primary_role?: string;
  mention_count?: number;
  visibility?: "default" | "hover_only";
};

export type CitationGraphVisualFilters = {
  topicId: string;
  nodeKinds: CitationGraphVisualNode["kind"][];
  showLowSignalReferences: boolean;
  role: string;
};

export type CitationGraphVisualTopicScope = {
  topicId: string;
  nodeIds: string[];
};

export type CitationGraphNodeImportance = {
  incomingDegree: number;
  percentile: number;
  halo: boolean;
};

function normalizedCitationMentionCount(edge: CitationGraphVisualEdge) {
  return Math.max(1, Math.floor(Number(edge.mention_count) || 1));
}

export function aggregateCitationGraphVisualEdges<
  Edge extends CitationGraphVisualEdge,
>(edges: readonly Edge[]): Array<Edge & { mention_count: number }> {
  const grouped = new Map<
    string,
    { representative: Edge; mentionCount: number }
  >();
  for (const edge of edges) {
    const key = `${edge.source}\u0000${edge.target}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        representative: edge,
        mentionCount: normalizedCitationMentionCount(edge),
      });
      continue;
    }
    current.mentionCount += normalizedCitationMentionCount(edge);
    if (edge.id.localeCompare(current.representative.id) < 0) {
      current.representative = edge;
    }
  }
  return Array.from(grouped.values())
    .map(({ representative, mentionCount }) => ({
      ...representative,
      mention_count: mentionCount,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function citationGraphIncomingCounts(
  nodeId: string,
  edges: readonly CitationGraphVisualEdge[],
  nodes?: readonly CitationGraphVisualNode[],
) {
  const sourceIds = new Set<string>();
  const nodeById = nodes
    ? new Map(nodes.map((node) => [node.id, node]))
    : undefined;
  let citationRecordCount = 0;
  for (const edge of edges) {
    if (edge.target !== nodeId) continue;
    if (!nodeById || nodeById.get(edge.source)?.kind === "library_paper") {
      sourceIds.add(edge.source);
    }
    citationRecordCount += normalizedCitationMentionCount(edge);
  }
  return {
    sourcePaperCount: sourceIds.size,
    citationRecordCount,
  };
}

export function selectCitationGraphInteractionEdges(args: {
  ownerIds: readonly string[];
  nodes: readonly CitationGraphVisualNode[];
  edges: readonly CitationGraphVisualEdge[];
  limitPerOwner?: number;
}) {
  const nodeById = new Map(args.nodes.map((node) => [node.id, node]));
  const edges = aggregateCitationGraphVisualEdges(args.edges);
  const limit = Math.max(
    0,
    Math.floor(args.limitPerOwner ?? CITATION_GRAPH_INTERACTION_NEIGHBOR_LIMIT),
  );
  const selected: typeof edges = [];
  const selectedIds = new Set<string>();
  for (const ownerId of args.ownerIds) {
    const ranked = edges
      .filter((edge) => edge.source === ownerId || edge.target === ownerId)
      .sort((left, right) => {
        const mentionDelta =
          normalizedCitationMentionCount(right) -
          normalizedCitationMentionCount(left);
        if (mentionDelta) return mentionDelta;
        const leftNeighbor =
          left.source === ownerId ? left.target : left.source;
        const rightNeighbor =
          right.source === ownerId ? right.target : right.source;
        const titleDelta = String(
          nodeById.get(leftNeighbor)?.label || leftNeighbor,
        ).localeCompare(
          String(nodeById.get(rightNeighbor)?.label || rightNeighbor),
        );
        return titleDelta || left.id.localeCompare(right.id);
      })
      .slice(0, limit);
    for (const edge of ranked) {
      if (selectedIds.has(edge.id)) continue;
      selectedIds.add(edge.id);
      selected.push(edge);
    }
  }
  return selected;
}

export function citationGraphInteractionOffsets(
  count: number,
  graphUnitsPerPixel: number,
) {
  const offsets: Array<{ x: number; y: number }> = [];
  const units = Math.max(Number.EPSILON, graphUnitsPerPixel);
  let remaining = Math.max(0, Math.floor(count));
  let ring = 0;
  while (remaining > 0) {
    const radiusPx =
      CITATION_GRAPH_INTERACTION_RING_RADIUS_PX +
      ring * CITATION_GRAPH_INTERACTION_RING_GAP_PX;
    const capacity = Math.max(
      1,
      Math.floor(
        (Math.PI * 2 * radiusPx) / CITATION_GRAPH_INTERACTION_MIN_ARC_PX,
      ),
    );
    const ringCount = Math.min(remaining, capacity);
    for (let index = 0; index < ringCount; index += 1) {
      const angle = (index / ringCount) * Math.PI * 2;
      const radius = radiusPx * units;
      offsets.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    remaining -= ringCount;
    ring += 1;
  }
  return offsets;
}

export function projectCitationGraphVisibility<
  Node extends CitationGraphVisualNode,
  Edge extends CitationGraphVisualEdge,
>(args: {
  nodes: Node[];
  edges: Edge[];
  filters?: Partial<CitationGraphVisualFilters>;
  topicScopes?: CitationGraphVisualTopicScope[];
}) {
  const { nodes, edges } = args;
  const filters: CitationGraphVisualFilters = {
    topicId: args.filters?.topicId || "all",
    nodeKinds:
      args.filters?.nodeKinds ||
      ([
        "library_paper",
        "external_reference",
        "unresolved_reference",
      ] as CitationGraphVisualNode["kind"][]),
    showLowSignalReferences:
      args.filters?.showLowSignalReferences === undefined
        ? true
        : args.filters.showLowSignalReferences,
    role: args.filters?.role || "all",
  };
  const selectedScope =
    filters.topicId === "all"
      ? undefined
      : args.topicScopes?.find((scope) => scope.topicId === filters.topicId);
  const topicSourceIds = new Set(selectedScope?.nodeIds || []);
  const topicScopedNodeIds = new Set(topicSourceIds);
  const isTopicScoped = filters.topicId !== "all";
  if (isTopicScoped) {
    for (const edge of edges) {
      if (topicSourceIds.has(edge.source) || topicSourceIds.has(edge.target)) {
        topicScopedNodeIds.add(edge.source);
        topicScopedNodeIds.add(edge.target);
      }
    }
  }

  const candidateNodes = nodes.filter(
    (node) =>
      filters.nodeKinds.includes(node.kind) &&
      (filters.showLowSignalReferences || !node.low_signal) &&
      (!isTopicScoped || topicScopedNodeIds.has(node.id)),
  );
  const candidateNodeById = new Map(
    candidateNodes.map((node) => [node.id, node]),
  );
  const candidateEdges = edges.filter(
    (edge) =>
      candidateNodeById.has(edge.source) &&
      candidateNodeById.has(edge.target) &&
      (!isTopicScoped ||
        topicSourceIds.has(edge.source) ||
        topicSourceIds.has(edge.target)) &&
      (filters.role === "all" || edge.primary_role === filters.role),
  );
  const visibleLibrarySourcesByExternal = new Map<string, Set<string>>();
  for (const edge of candidateEdges) {
    const source = candidateNodeById.get(edge.source);
    const target = candidateNodeById.get(edge.target);
    if (
      source?.kind !== "library_paper" ||
      !target ||
      target.kind === "library_paper"
    ) {
      continue;
    }
    const sources =
      visibleLibrarySourcesByExternal.get(target.id) || new Set<string>();
    sources.add(source.id);
    visibleLibrarySourcesByExternal.set(target.id, sources);
  }

  const defaultExternalIds = new Set<string>();
  const hoverOnlyExternalIds = new Set<string>();
  for (const [targetId, sourceIds] of visibleLibrarySourcesByExternal) {
    if (sourceIds.size >= 2) {
      defaultExternalIds.add(targetId);
    } else if (sourceIds.size === 1) {
      hoverOnlyExternalIds.add(targetId);
    }
  }
  const defaultNodes = candidateNodes
    .filter(
      (node) =>
        node.kind === "library_paper" || defaultExternalIds.has(node.id),
    )
    .map((node) =>
      node.kind === "library_paper"
        ? node
        : {
            ...node,
            visibility: "default" as const,
            display_tier: "shared_external" as const,
          },
    );
  const hoverOnlyNodes = candidateNodes
    .filter(
      (node) =>
        node.kind !== "library_paper" && hoverOnlyExternalIds.has(node.id),
    )
    .map((node) => ({
      ...node,
      visibility: "hover_only" as const,
      display_tier: "single_external" as const,
    }));
  const defaultNodeIds = new Set(defaultNodes.map((node) => node.id));
  const defaultEdges = candidateEdges
    .filter(
      (edge) =>
        defaultNodeIds.has(edge.source) &&
        defaultNodeIds.has(edge.target) &&
        (edge.visibility !== "hover_only" ||
          defaultExternalIds.has(edge.target)),
    )
    .map((edge) => ({ ...edge, visibility: "default" as const }));
  const hoverOnlyEdges = candidateEdges
    .filter(
      (edge) =>
        candidateNodeById.get(edge.source)?.kind === "library_paper" &&
        hoverOnlyExternalIds.has(edge.target),
    )
    .map((edge) => ({ ...edge, visibility: "hover_only" as const }));
  return { defaultNodes, defaultEdges, hoverOnlyNodes, hoverOnlyEdges };
}

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
