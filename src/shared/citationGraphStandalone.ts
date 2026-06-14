import Graph from "graphology";
import Sigma from "sigma";
import { drawDiscNodeHover } from "sigma/rendering";
import {
  CITATION_GRAPH_EDGE_SIZE,
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
  GRAPH_MAX_ZOOM_RATIO,
  GRAPH_MIN_ZOOM_RATIO,
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
  selectedElement?: CitationGraphSelectedElement;
  diagnostics?: unknown;
};

export type CitationGraphRenderOptions = {
  readonly?: boolean;
  labels?: Partial<Record<CitationGraphLabelKey, string>>;
};

type CitationGraphLabelKey =
  | "title"
  | "search"
  | "clear"
  | "selection"
  | "noSelection"
  | "noGraph"
  | "incoming"
  | "outgoing"
  | "importance"
  | "nodeSize"
  | "halo"
  | "library"
  | "external";

type RuntimeState = {
  renderer?: Sigma;
  graph?: Graph;
  hoveredNode?: string;
  hoverLabelNode?: string;
  hoverClearTimer?: number;
  search: string;
  selectedElement: CitationGraphSelectedElement;
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

function graphNodeColor(node: CitationGraphNode) {
  if (node.kind === "library_paper") return "#2563eb";
  if (node.display_tier === "single_external") return "#d97706";
  return "#65a30d";
}

function graphNodeImportanceColor(node: CitationGraphNode) {
  return node.kind === "library_paper" ? "#1d4ed8" : "#b45309";
}

function graphNodeSearchText(node: CitationGraphNode) {
  return `${node.title || ""} ${node.year || ""} ${node.id}`.toLowerCase();
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
  importance?: { incomingDegree: number; percentile: number; halo: boolean },
) {
  const base = graphNodeBaseSize(node);
  if (!importance || importance.incomingDegree <= 0) return base;
  const cap = graphNodeSizeCap(node);
  return Math.min(cap, base + (cap - base) * importance.percentile);
}

function graphNodeZIndex(
  node: CitationGraphNode,
  importance?: { halo: boolean },
) {
  const importanceZIndex = importance?.halo ? 8 : 0;
  if (node.kind === "library_paper") return Math.max(4, importanceZIndex);
  if (node.display_tier === "shared_external")
    return Math.max(2, importanceZIndex);
  if (node.visibility === "hover_only") return Math.max(1, importanceZIndex);
  return Math.max(2, importanceZIndex);
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
  const libraryNode = data.kind === "library_paper";
  const strong = libraryNode
    ? GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT
    : GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT;
  const soft = libraryNode
    ? GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT
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

function clampGraphCameraZoom(renderer: Sigma) {
  const camera = renderer.getCamera() as any;
  const state = camera?.getState?.();
  if (!state) return;
  const ratio = Number(state.ratio || 1);
  const nextRatio = Math.min(
    GRAPH_MAX_ZOOM_RATIO,
    Math.max(GRAPH_MIN_ZOOM_RATIO, ratio),
  );
  if (nextRatio !== ratio) {
    camera.setState({ ...state, ratio: nextRatio });
  }
}

function selectedGraphHoverNode(model: CitationGraphRenderModel, graph: Graph) {
  const selected = model.selectedElement;
  if (selected?.kind !== "node" || !graph.hasNode(selected.id))
    return undefined;
  return selected.id;
}

function cancelScheduledHoverClear(state: RuntimeState) {
  if (state.hoverClearTimer) {
    window.clearTimeout(state.hoverClearTimer);
    state.hoverClearTimer = undefined;
  }
}

function graphDetailHtml(
  model: CitationGraphRenderModel,
  selected: CitationGraphSelectedElement,
) {
  if (!selected) {
    return `<h3>Selection</h3><p class="muted">Select a node to inspect citation graph details.</p>`;
  }
  if (selected.kind === "edge") {
    const edge = model.edges.find((item) => item.id === selected.id);
    return `<h3>Edge</h3><dl><dt>Role</dt><dd>${escapeHtml(edge?.primary_role || "-")}</dd><dt>Source</dt><dd>${escapeHtml(edge?.source || "-")}</dd><dt>Target</dt><dd>${escapeHtml(edge?.target || "-")}</dd><dt>Mentions</dt><dd>${escapeHtml(edge?.mention_count ?? 0)}</dd></dl>`;
  }
  const node = model.nodes.find((item) => item.id === selected.id);
  if (!node)
    return `<h3>Selection</h3><p class="muted">Selected node was not found.</p>`;
  return `<h3>${escapeHtml(node.title || node.id)}</h3><dl><dt>Type</dt><dd>${escapeHtml(node.kind)}</dd><dt>Year</dt><dd>${escapeHtml(node.year || "-")}</dd><dt>In</dt><dd>${escapeHtml(node.metrics?.internal_in_degree ?? "-")}</dd><dt>Out</dt><dd>${escapeHtml(node.metrics?.internal_out_degree ?? "-")}</dd><dt>ID</dt><dd>${escapeHtml(node.id)}</dd></dl>`;
}

function renderShell(
  container: HTMLElement,
  model: CitationGraphRenderModel,
  options: CitationGraphRenderOptions,
  state: RuntimeState,
) {
  container.innerHTML = `<div class="zs-cg-header"><div><h2 id="citation-graph">${escapeHtml(label(options, "title", "Citation Graph"))}</h2><p>基于 Host Bridge 固化布局的引用网络。</p></div><div class="zs-cg-badges"><span>${model.nodes.length} nodes</span><span>${model.edges.length} edges</span></div></div><div class="zs-cg-toolbar"><input type="search" data-zs-cg-search placeholder="${escapeHtml(label(options, "search", "Search graph"))}" value="${escapeHtml(state.search)}"><button type="button" data-zs-cg-clear>${escapeHtml(label(options, "clear", "Clear"))}</button></div><div class="zs-cg-legend"><strong>Direction</strong><span><i style="background:${CITATION_GRAPH_INCOMING_EDGE_COLOR}"></i>${escapeHtml(label(options, "incoming", "Incoming"))}</span><span><i style="background:${CITATION_GRAPH_OUTGOING_EDGE_COLOR}"></i>${escapeHtml(label(options, "outgoing", "Outgoing"))}</span><strong>${escapeHtml(label(options, "importance", "Importance"))}</strong><span class="zs-cg-node-size"><i></i><i></i>${escapeHtml(label(options, "nodeSize", "Node size = incoming citations"))}</span><span class="zs-cg-node-size"><i class="is-halo"></i>${escapeHtml(label(options, "halo", "Halo = high-impact node"))}</span></div><div class="zs-cg-layout"><div class="zs-cg-stage" data-zs-cg-stage></div><aside class="zs-cg-detail" data-zs-cg-detail>${graphDetailHtml(model, state.selectedElement)}</aside></div>`;
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
  const state: RuntimeState = {
    search: "",
    selectedElement: drawableModel.selectedElement || null,
  };
  function draw() {
    state.renderer?.kill();
    renderShell(container, drawableModel, options, state);
    const stage = container.querySelector(
      "[data-zs-cg-stage]",
    ) as HTMLElement | null;
    const detail = container.querySelector(
      "[data-zs-cg-detail]",
    ) as HTMLElement | null;
    if (!stage) return;
    const graph = new Graph({ multi: false, type: "directed" });
    const importanceByNodeId = buildGraphNodeImportance(drawableModel);
    for (const node of drawableModel.nodes) {
      const importance = importanceByNodeId.get(node.id);
      graph.addNode(node.id, {
        title: node.title,
        label: "",
        x: node.x,
        y: node.y,
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
    for (const edge of drawableModel.edges) {
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
    const pinnedHoverNode = selectedGraphHoverNode(drawableModel, graph);
    state.hoveredNode = pinnedHoverNode;
    state.hoverLabelNode = undefined;
    const renderer = new Sigma(graph, stage, {
      allowInvalidContainer: true,
      enableEdgeEvents: true,
      renderEdgeLabels: false,
      defaultDrawNodeHover: drawGraphNodeHover,
      zIndex: true,
      nodeReducer(node: string, data: Record<string, unknown>) {
        const query = state.search.trim().toLowerCase();
        const searchActive = !!query;
        const searchMatch = String(data.searchable || "").includes(query);
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
            (data.kind === "library_paper" ||
              data.visibility === "hover_only"));
        return {
          ...data,
          color: searchMatch ? "#0ea5e9" : neighbor ? data.color : "#d3d8de",
          size: searchMatch
            ? Math.max(
                Number(data.size || 1) * 1.35,
                Number(data.size || 1) + 1,
              )
            : neighbor || data.visibility !== "hover_only"
              ? data.size
              : Math.max(1, Number(data.size || 1) * 0.6),
          zIndex: searchMatch
            ? Math.max(30, Number(data.zIndex || 0))
            : neighbor
              ? Math.max(10, Number(data.zIndex || 0))
              : Number(data.zIndex || 0),
          highlighted: Boolean(
            data.importanceHalo && (searchMatch || neighbor),
          ),
          importanceInteractive: activeHaloNode,
          label: showHoverLabel ? data.title : "",
        };
      },
      edgeReducer(edge: string, data: Record<string, unknown>) {
        const selectedEdgeId =
          state.selectedElement?.kind === "edge"
            ? state.selectedElement.id
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
    state.renderer = renderer;
    state.graph = graph;
    container.dataset.zsCgStatus = "ready";
    delete container.dataset.zsCgError;
    renderer.getCamera()?.on?.("updated", () => clampGraphCameraZoom(renderer));
    clampGraphCameraZoom(renderer);
    renderer.on("enterNode", ({ node }: { node: string }) => {
      const pinnedNode = selectedGraphHoverNode(drawableModel, graph);
      if (pinnedNode && node !== pinnedNode) {
        state.hoverLabelNode = graph.areNeighbors(node, pinnedNode)
          ? node
          : undefined;
        renderer.refresh();
        return;
      }
      cancelScheduledHoverClear(state);
      state.hoveredNode = node;
      state.hoverLabelNode = undefined;
      renderer.refresh();
    });
    renderer.on("leaveNode", () => {
      cancelScheduledHoverClear(state);
      const pinnedNode = selectedGraphHoverNode(drawableModel, graph);
      state.hoverClearTimer = window.setTimeout(() => {
        state.hoveredNode = pinnedNode;
        state.hoverLabelNode = undefined;
        renderer.refresh();
      }, 80);
    });
    renderer.on("clickNode", ({ node }: { node: string }) => {
      state.selectedElement = { kind: "node", id: node };
      drawableModel.selectedElement = state.selectedElement;
      state.hoveredNode = node;
      state.hoverLabelNode = undefined;
      if (detail)
        detail.innerHTML = graphDetailHtml(
          drawableModel,
          state.selectedElement,
        );
      renderer.refresh();
    });
    renderer.on("clickEdge", ({ edge }: { edge: string }) => {
      state.selectedElement = { kind: "edge", id: edge };
      drawableModel.selectedElement = state.selectedElement;
      if (detail)
        detail.innerHTML = graphDetailHtml(
          drawableModel,
          state.selectedElement,
        );
      renderer.refresh();
    });
    renderer.on("clickStage", () => {
      state.selectedElement = null;
      drawableModel.selectedElement = null;
      state.hoveredNode = undefined;
      state.hoverLabelNode = undefined;
      if (detail) detail.innerHTML = graphDetailHtml(drawableModel, null);
      renderer.refresh();
    });
    container
      .querySelector("[data-zs-cg-search]")
      ?.addEventListener("input", (event: Event) => {
        state.search = (event.target as HTMLInputElement).value || "";
        renderer.refresh();
      });
    container
      .querySelector("[data-zs-cg-clear]")
      ?.addEventListener("click", () => {
        state.search = "";
        const input = container.querySelector(
          "[data-zs-cg-search]",
        ) as HTMLInputElement | null;
        if (input) input.value = "";
        renderer.refresh();
      });
  }
  try {
    draw();
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
