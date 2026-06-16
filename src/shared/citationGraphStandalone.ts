import {
  CITATION_GRAPH_INCOMING_EDGE_COLOR,
  CITATION_GRAPH_OUTGOING_EDGE_COLOR,
  GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT,
  GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT_SOFT,
  GRAPH_EXTERNAL_NODE_SIZE_CAP,
  GRAPH_IMPORTANCE_HALO_MAX,
  GRAPH_IMPORTANCE_HALO_TOP_RATIO,
  GRAPH_LIBRARY_BASE_NODE_SIZE,
  GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT,
  GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT,
  GRAPH_LIBRARY_NODE_SIZE_CAP,
  GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE,
  GRAPH_SINGLE_EXTERNAL_BASE_NODE_SIZE,
} from "./citationGraphVisualRules";

export type CitationGraphNodeKind = "library_paper" | "external_reference";

export type CitationGraphNode = {
  id: string;
  title: string;
  kind: CitationGraphNodeKind;
  year?: string;
  x: number;
  y: number;
  low_signal?: boolean;
  visibility?: "default" | "hover_only";
  display_tier?: "library" | "shared_external" | "single_external";
  is_focus?: boolean;
  focus_role?: string;
  metrics?: {
    internal_in_degree?: number;
    internal_out_degree?: number;
  };
};

export type CitationGraphEdge = {
  id: string;
  source: string;
  target: string;
  primary_role?: string;
  mention_count?: number;
  visibility?: "default" | "hover_only";
};

export type CitationGraphSelectedElement =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;

export type CitationGraphRenderModel = {
  nodes: CitationGraphNode[];
  edges: CitationGraphEdge[];
  start_node_id?: string;
  selectedElement?: CitationGraphSelectedElement;
  diagnostics?: unknown;
};

export type CitationGraphRenderOptions = {
  readonly?: boolean;
  labels?: Partial<Record<CitationGraphLabelKey, string>>;
};

type CitationGraphLabelKey =
  | "title"
  | "noGraph"
  | "direction"
  | "incoming"
  | "outgoing"
  | "importance"
  | "nodeSize"
  | "halo"
  | "currentPaper"
  | "scope";

type RuntimeState = {
  hoveredNode?: string;
  hoverClearTimer?: number;
};

type GraphNodeImportance = {
  incomingDegree: number;
  percentile: number;
  halo: boolean;
};

function text(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ] || ch,
  );
}

function label(
  options: CitationGraphRenderOptions,
  key: CitationGraphLabelKey,
  fallback: string,
) {
  return options.labels?.[key] || fallback;
}

function isCurrentPaperNode(
  node: CitationGraphNode,
  model: CitationGraphRenderModel,
) {
  return Boolean(
    node.is_focus ||
    node.focus_role === "current_paper" ||
    (model.start_node_id && node.id === model.start_node_id),
  );
}

function graphNodeColor(
  node: CitationGraphNode,
  model: CitationGraphRenderModel,
) {
  if (isCurrentPaperNode(node, model)) return "#dc2626";
  if (node.kind === "library_paper") return "#2563eb";
  if (node.display_tier === "single_external") return "#d97706";
  return "#65a30d";
}

function graphNodeImportanceColor(
  node: CitationGraphNode,
  model: CitationGraphRenderModel,
) {
  if (isCurrentPaperNode(node, model)) return "#ef4444";
  if (node.kind === "library_paper") return "#2f7df6";
  if (node.display_tier === "single_external") return "#c4ca5d";
  return "#94a51f";
}

function graphNodeBaseSize(node: CitationGraphNode) {
  if (node.kind === "library_paper") return GRAPH_LIBRARY_BASE_NODE_SIZE;
  if (node.display_tier === "shared_external")
    return GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE;
  if (node.display_tier === "single_external")
    return GRAPH_SINGLE_EXTERNAL_BASE_NODE_SIZE;
  return 2.5;
}

function graphNodeSizeCap(node: CitationGraphNode) {
  return node.kind === "library_paper"
    ? GRAPH_LIBRARY_NODE_SIZE_CAP
    : GRAPH_EXTERNAL_NODE_SIZE_CAP;
}

function fallbackGraphIncomingDegrees(model: CitationGraphRenderModel) {
  const visibleIds = new Set(model.nodes.map((node) => node.id));
  const incoming = new Map<string, number>();
  model.edges.forEach((edge) => {
    if (visibleIds.has(edge.target)) {
      incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
    }
  });
  return incoming;
}

function graphNodeIncomingDegree(
  node: CitationGraphNode,
  fallbackIncomingDegrees: Map<string, number>,
) {
  const metricDegree = node.metrics?.internal_in_degree;
  if (typeof metricDegree === "number" && Number.isFinite(metricDegree)) {
    return Math.max(0, Math.floor(metricDegree));
  }
  return fallbackIncomingDegrees.get(node.id) || 0;
}

function buildGraphNodeImportance(model: CitationGraphRenderModel) {
  const fallbackIncomingDegrees = fallbackGraphIncomingDegrees(model);
  const entries = model.nodes
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

function graphNodeSize(
  node: CitationGraphNode,
  model: CitationGraphRenderModel,
  importance?: GraphNodeImportance,
) {
  const multiplier = isCurrentPaperNode(node, model) ? 1.5 : 1;
  const base = graphNodeBaseSize(node);
  if (!importance || importance.incomingDegree <= 0) return base * multiplier;
  const cap = graphNodeSizeCap(node);
  return (
    Math.min(cap, base + (cap - base) * importance.percentile) * multiplier
  );
}

function haloColors(node: CitationGraphNode, model: CitationGraphRenderModel) {
  if (isCurrentPaperNode(node, model)) {
    return {
      strong: "rgba(220, 38, 38, 0.62)",
      soft: "rgba(220, 38, 38, 0.2)",
    };
  }
  if (node.kind === "library_paper") {
    return {
      strong: GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT,
      soft: GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT,
    };
  }
  return {
    strong: GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT,
    soft: GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT_SOFT,
  };
}

function cancelScheduledHoverClear(state: RuntimeState) {
  if (state.hoverClearTimer) {
    window.clearTimeout(state.hoverClearTimer);
    state.hoverClearTimer = undefined;
  }
}

function renderShell(
  container: HTMLElement,
  model: CitationGraphRenderModel,
  options: CitationGraphRenderOptions,
) {
  container.innerHTML = [
    '<div class="zs-cg-shell">',
    '<div class="zs-cg-legend" aria-label="Citation graph legend">',
    `<strong>${escapeHtml(label(options, "direction", "Citation direction"))}</strong>`,
    `<span><i class="zs-cg-edge-swatch is-incoming"></i>${escapeHtml(label(options, "incoming", "Incoming to selected"))}</span>`,
    `<span><i class="zs-cg-edge-swatch is-outgoing"></i>${escapeHtml(label(options, "outgoing", "Outgoing from selected"))}</span>`,
    `<strong>${escapeHtml(label(options, "importance", "Citation importance"))}</strong>`,
    `<span class="zs-cg-node-size"><i></i><i></i>${escapeHtml(label(options, "nodeSize", "Node size = incoming citations"))}</span>`,
    `<span class="zs-cg-node-size"><i class="is-halo"></i>${escapeHtml(label(options, "halo", "Halo = top cited visible nodes"))}</span>`,
    `<span class="zs-cg-node-size"><i class="is-current-paper"></i>${escapeHtml(label(options, "currentPaper", "Current paper"))}</span>`,
    "</div>",
    '<div class="zs-cg-stage" data-zs-cg-stage>',
    `<div class="zs-cg-scope-badge">${escapeHtml(label(options, "scope", "Current paper 2-hop citation neighborhood"))}</div>`,
    '<div class="zs-cg-status-badge">SVG fallback</div>',
    "</div>",
    "</div>",
  ].join("");
}

function renderEmpty(
  container: HTMLElement,
  options: CitationGraphRenderOptions,
  message: string,
  status: "empty" | "failed" = "empty",
) {
  container.dataset.zsCgStatus = status;
  if (status === "failed") container.dataset.zsCgError = message;
  else delete container.dataset.zsCgError;
  container.innerHTML = `<div class="zs-cg-empty"><h2 id="citation-graph">${escapeHtml(label(options, "title", "Citation Graph"))}</h2><p>${escapeHtml(message)}</p></div>`;
}

function quantile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * ratio)),
  );
  return sorted[index] ?? 0;
}

function svgPointProjector(nodes: CitationGraphNode[], stage: HTMLElement) {
  const rect = stage.getBoundingClientRect();
  const width = Math.max(
    320,
    Math.floor(rect.width || stage.clientWidth || 640),
  );
  const height = Math.max(
    320,
    Math.floor(rect.height || stage.clientHeight || 500),
  );
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const fullMinX = Math.min(...xs);
  const fullMaxX = Math.max(...xs);
  const fullMinY = Math.min(...ys);
  const fullMaxY = Math.max(...ys);
  const coreMinX = quantile(xs, 0.05);
  const coreMaxX = quantile(xs, 0.95);
  const coreMinY = quantile(ys, 0.05);
  const coreMaxY = quantile(ys, 0.95);
  const useCoreX =
    fullMaxX - fullMinX > Math.max(1, (coreMaxX - coreMinX) * 1.8);
  const useCoreY =
    fullMaxY - fullMinY > Math.max(1, (coreMaxY - coreMinY) * 1.8);
  const minX = useCoreX ? coreMinX : fullMinX;
  const maxX = useCoreX ? coreMaxX : fullMaxX;
  const minY = useCoreY ? coreMinY : fullMinY;
  const maxY = useCoreY ? coreMaxY : fullMaxY;
  const padding = Math.max(32, Math.min(width, height) * 0.08);
  const graphWidth = Math.max(1, maxX - minX);
  const graphHeight = Math.max(1, maxY - minY);
  const scale = Math.min(
    (width - padding * 2) / graphWidth,
    (height - padding * 2) / graphHeight,
  );
  const usedWidth = graphWidth * scale;
  const usedHeight = graphHeight * scale;
  const offsetX = (width - usedWidth) / 2;
  const offsetY = (height - usedHeight) / 2;
  return {
    width,
    height,
    project(node: CitationGraphNode) {
      const x = Math.min(maxX, Math.max(minX, node.x));
      const y = Math.min(maxY, Math.max(minY, node.y));
      return {
        x: offsetX + (x - minX) * scale,
        y: offsetY + (maxY - y) * scale,
      };
    },
  };
}

function truncateTitle(title: string) {
  return title.length > 56 ? `${title.slice(0, 53)}...` : title;
}

function renderSvgCitationGraph(
  container: HTMLElement,
  model: CitationGraphRenderModel,
  options: CitationGraphRenderOptions,
  state: RuntimeState,
) {
  renderShell(container, model, options);
  const stage = container.querySelector(
    "[data-zs-cg-stage]",
  ) as HTMLElement | null;
  if (!stage) return;
  const graphStage = stage;

  const importanceByNodeId = buildGraphNodeImportance(model);
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();
  for (const edge of model.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  function connectedToActive(edge: CitationGraphEdge, activeNode: string) {
    return edge.source === activeNode || edge.target === activeNode;
  }

  function redrawStage() {
    const projector = svgPointProjector(model.nodes, graphStage);
    const activeNode = state.hoveredNode;
    const edgeHtml = model.edges
      .map((edge) => {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        if (!source || !target) return "";
        const sourcePoint = projector.project(source);
        const targetPoint = projector.project(target);
        const active = activeNode ? connectedToActive(edge, activeNode) : false;
        const color =
          activeNode && edge.target === activeNode
            ? CITATION_GRAPH_INCOMING_EDGE_COLOR
            : CITATION_GRAPH_OUTGOING_EDGE_COLOR;
        return `<line class="graph-edge${active ? " is-active" : ""}" x1="${sourcePoint.x.toFixed(2)}" y1="${sourcePoint.y.toFixed(2)}" x2="${targetPoint.x.toFixed(2)}" y2="${targetPoint.y.toFixed(2)}" stroke="${color}" stroke-width="${active ? 1.8 : 0.75}" stroke-opacity="${active ? 0.72 : activeNode ? 0.08 : 0.16}" marker-end="url(#zs-cg-arrow)" />`;
      })
      .join("");
    const nodeHtml = model.nodes
      .map((node) => {
        const point = projector.project(node);
        const importance = importanceByNodeId.get(node.id);
        const currentPaper = isCurrentPaperNode(node, model);
        const baseSize = graphNodeSize(node, model, importance);
        const radius = Math.max(4, baseSize * 1.75);
        const neighbor = activeNode
          ? node.id === activeNode ||
            Boolean(adjacency.get(activeNode)?.has(node.id))
          : false;
        const faded = Boolean(activeNode && !neighbor && !currentPaper);
        const color =
          importance?.halo || currentPaper
            ? graphNodeImportanceColor(node, model)
            : graphNodeColor(node, model);
        const labelVisible =
          node.id === activeNode ||
          (neighbor && node.kind === "library_paper") ||
          (currentPaper && !activeNode);
        const showHalo = importance?.halo || currentPaper;
        const halo = showHalo
          ? (() => {
              const colors = haloColors(node, model);
              return [
                `<circle class="graph-node-halo is-soft" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${(radius + 6).toFixed(2)}" fill="none" stroke="${colors.soft}" stroke-width="4" opacity="${faded ? 0.28 : 1}" />`,
                `<circle class="graph-node-halo" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${(radius + 4).toFixed(2)}" fill="none" stroke="${colors.strong}" stroke-width="2" opacity="${faded ? 0.28 : 1}" />`,
              ].join("");
            })()
          : "";
        const title = escapeHtml(node.title || node.id);
        const labelText =
          labelVisible && title
            ? `<text class="graph-node-label" x="${(point.x + radius + 5).toFixed(2)}" y="${(point.y + 4).toFixed(2)}">${escapeHtml(truncateTitle(node.title || node.id))}</text>`
            : "";
        return `${halo}<circle class="graph-node${node.kind === "library_paper" ? " is-library" : " is-external"}${neighbor ? " is-active" : ""}${currentPaper ? " is-current-paper" : ""}" data-node-id="${escapeHtml(node.id)}" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${radius.toFixed(2)}" fill="${color}" opacity="${faded ? 0.28 : 0.96}"><title>${title}</title></circle>${labelText}`;
      })
      .join("");
    graphStage.innerHTML = [
      `<div class="zs-cg-scope-badge">${escapeHtml(label(options, "scope", "Current paper 2-hop citation neighborhood"))}</div>`,
      '<div class="zs-cg-status-badge">SVG fallback</div>',
      `<svg class="zs-cg-svg" viewBox="0 0 ${projector.width} ${projector.height}" role="img" aria-label="${escapeHtml(label(options, "title", "Citation Graph"))}">`,
      "<defs>",
      '<marker id="zs-cg-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">',
      `<path d="M0,0 L8,4 L0,8 Z" fill="${CITATION_GRAPH_OUTGOING_EDGE_COLOR}" opacity="0.7"></path>`,
      "</marker>",
      "</defs>",
      `<g class="graph-edges">${edgeHtml}</g>`,
      `<g class="graph-nodes">${nodeHtml}</g>`,
      "</svg>",
    ].join("");

    const nodeElements = graphStage.querySelectorAll(
      "[data-node-id]",
    ) as NodeListOf<SVGElement>;
    nodeElements.forEach((nodeEl: SVGElement) => {
      nodeEl.addEventListener("mouseenter", () => {
        const nodeId = nodeEl.dataset.nodeId;
        cancelScheduledHoverClear(state);
        state.hoverClearTimer = window.setTimeout(() => {
          state.hoveredNode = nodeId;
          redrawStage();
        }, 60);
      });
      nodeEl.addEventListener("mouseleave", () => {
        cancelScheduledHoverClear(state);
        state.hoverClearTimer = window.setTimeout(() => {
          state.hoveredNode = undefined;
          redrawStage();
        }, 80);
      });
    });
  }

  redrawStage();
  container.dataset.zsCgStatus = "ready";
  delete container.dataset.zsCgError;
}

export function renderCitationGraph(
  container: HTMLElement,
  model: CitationGraphRenderModel,
  options: CitationGraphRenderOptions = {},
) {
  if (!container) return;
  container.dataset.zsCgStatus = "initializing";
  delete container.dataset.zsCgError;
  const drawableNodes = model.nodes.filter(
    (node) => Number.isFinite(node.x) && Number.isFinite(node.y),
  );
  if (!drawableNodes.length) {
    renderEmpty(
      container,
      options,
      label(options, "noGraph", "当前没有可用的图布局坐标。"),
    );
    return;
  }
  const drawableIds = new Set(drawableNodes.map((node) => node.id));
  const drawableModel = {
    ...model,
    nodes: drawableNodes,
    edges: model.edges.filter(
      (edge) => drawableIds.has(edge.source) && drawableIds.has(edge.target),
    ),
  };
  try {
    renderSvgCitationGraph(container, drawableModel, options, {});
  } catch (error) {
    const message = `Citation graph renderer failed: ${text((error as Error)?.message, "unknown error")}`;
    renderEmpty(container, options, message, "failed");
  }
}

declare global {
  interface Window {
    ZoteroSkillsCitationGraph?: {
      renderCitationGraph: typeof renderCitationGraph;
    };
  }
}

if (typeof window !== "undefined") {
  window.ZoteroSkillsCitationGraph = { renderCitationGraph };
}
