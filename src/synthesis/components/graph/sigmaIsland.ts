// Imperative Sigma island for the citation graph surface.
//
// The island owns the graphology model and the Sigma renderer across region
// re-renders (legacy preserveGraphSurfaceWhileRebuildingRoot, app.ts:2268):
// update() diffs by data identity and never recreates the renderer unless the
// host element is gone. Three update paths mirror the legacy syncSigmaGraph
// (:14923):
//   1. same model signature -> layout-only attribute pass + interaction sync
//      + refresh (the interaction-only channel, legacy :15721/:14096);
//   2. same query signature + graph basis hash -> incremental graph-page merge
//      (legacy mergeSigmaGraphPage, :14827) preserving node positions;
//   3. otherwise a full model rebuild, reusing the live renderer via
//      setGraph; the camera survives and only resets when the layout
//      signature changed.
//
// Vendors (graphology Graph + Sigma) are injected: page bundles under
// src/synthesis/** may not import npm modules, so the integration entry (or
// the B2c standalone export page) passes them explicitly or exposes them as
// window.__synthesisCitationGraphVendors before bootstrap.

import {
  aggregateCitationGraphVisualEdges,
  buildCitationGraphNodeImportance,
  citationGraphFallbackOffsets,
  citationGraphNodeSize,
  CITATION_GRAPH_EDGE_SIZE,
  CITATION_GRAPH_INCOMING_EDGE_COLOR,
  CITATION_GRAPH_OUTGOING_EDGE_COLOR,
  GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK,
  GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK_SOFT,
  GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT,
  GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT_SOFT,
  GRAPH_LIBRARY_IMPORTANCE_HALO_DARK,
  GRAPH_LIBRARY_IMPORTANCE_HALO_DARK_SOFT,
  GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT,
  GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT,
  GRAPH_MAX_ZOOM_RATIO,
  GRAPH_MIN_ZOOM_RATIO,
  GRAPH_ZOOM_SLIDER_MAX,
  type CitationGraphNodeImportance,
} from "../../../shared/citationGraphVisualRules";
import {
  graphEdgeRoleLabel,
  graphNodeBaseColor,
  graphNodeMatchesSearchText,
  graphNodeSearchText,
  isCurrentPaperGraphNode,
  sigmaGraphLayoutSignature,
  sigmaGraphModelSignature,
  type SynthesisGraphEdge,
  type SynthesisGraphElement,
  type SynthesisGraphLayoutAlgorithm,
  type SynthesisGraphNode,
  type SynthesisGraphText,
} from "./graphModel";

// ---------------------------------------------------------------------------
// Vendor injection
// ---------------------------------------------------------------------------

export type CitationGraphModel = {
  forEachNode(
    callback: (nodeId: string, attributes: Record<string, unknown>) => void,
  ): void;
  forEachEdge(callback: (edgeId: string) => void): void;
  hasNode(nodeId: string): boolean;
  hasEdge(edgeId: string): boolean;
  addNode(nodeId: string, attributes: Record<string, unknown>): void;
  dropNode(nodeId: string): void;
  dropEdge(edgeId: string): void;
  mergeNodeAttributes(
    nodeId: string,
    attributes: Record<string, unknown>,
  ): void;
  mergeEdgeAttributes(
    edgeId: string,
    attributes: Record<string, unknown>,
  ): void;
  addDirectedEdgeWithKey(
    edgeId: string,
    source: string,
    target: string,
    attributes: Record<string, unknown>,
  ): void;
  mergeDirectedEdgeWithKey(
    edgeId: string,
    source: string,
    target: string,
    attributes: Record<string, unknown>,
  ): void;
  getNodeAttribute(nodeId: string, name: string): unknown;
  getNodeAttributes(nodeId: string): Record<string, unknown>;
  setNodeAttribute(nodeId: string, name: string, value: unknown): void;
  areNeighbors(source: string, target: string): boolean;
  source(edgeId: string): string;
  target(edgeId: string): string;
};

export type CitationGraphCamera = {
  getState(): { x: number; y: number; ratio: number; angle: number };
  setState(
    state: Partial<{ x: number; y: number; ratio: number; angle: number }>,
  ): void;
  on(event: "updated", callback: () => void): void;
};

export type CitationGraphRenderer = {
  refresh(): void;
  resize(): void;
  setGraph(graph: CitationGraphModel): void;
  getCamera(): CitationGraphCamera;
  getContainer(): HTMLElement;
  on(
    event: "enterNode" | "leaveNode" | "clickNode" | "clickEdge" | "clickStage",
    callback: (payload: { node?: string; edge?: string }) => void,
  ): void;
  viewportToGraph?(point: { x: number; y: number }): { x: number; y: number };
  kill(): void;
};

export type CitationGraphNodeHoverDrawer = (
  context: CanvasRenderingContext2D,
  data: Record<string, unknown>,
  settings: Record<string, unknown>,
) => void;

export type CitationGraphVendors = {
  Graph: new (options: {
    multi: boolean;
    type: "directed";
  }) => CitationGraphModel;
  Sigma: new (
    graph: CitationGraphModel,
    container: HTMLElement,
    settings: Record<string, unknown>,
  ) => CitationGraphRenderer;
  drawDiscNodeHover?: CitationGraphNodeHoverDrawer;
};

declare const window: Window &
  typeof globalThis & {
    __synthesisCitationGraphVendors?: CitationGraphVendors;
  };

/** Vendor fallback for entry points that expose the bundle via window. */
export function resolveCitationGraphVendors():
  | CitationGraphVendors
  | undefined {
  return typeof window === "undefined"
    ? undefined
    : window.__synthesisCitationGraphVendors;
}

// ---------------------------------------------------------------------------
// Island view
// ---------------------------------------------------------------------------

export type CitationGraphIslandView = {
  // visibleNodes / visibleEdges of the (possibly page-merged) window.
  visibleNodes: SynthesisGraphNode[];
  visibleEdges: SynthesisGraphEdge[];
  graphHash: string;
  layoutAlgorithm: SynthesisGraphLayoutAlgorithm;
  querySignature: string;
  selectedElement?: SynthesisGraphElement;
  // Committed search query (legacy graphSearchDraft ?? filters.search).
  searchQuery: string;
  // Standalone graph export focus node (legacy standaloneGraphFocusNodeId).
  focusNodeId?: string;
  // Whether the graph surface is the visible tab; gates scheduled resizes.
  surfaceActive: boolean;
};

export type CitationGraphIslandHooks = {
  onSelectElement: (element: SynthesisGraphElement | null) => void;
  // Edge role labels render through the region's t() resolver.
  t: SynthesisGraphText;
};

type NodeAttributes = Record<string, unknown>;

const HOVER_CLEAR_DELAY_MS = 80;

function clampGraphZoomRatio(value: unknown): number {
  const ratio = Number(value);
  if (!Number.isFinite(ratio)) return 1;
  return Math.min(GRAPH_MAX_ZOOM_RATIO, Math.max(GRAPH_MIN_ZOOM_RATIO, ratio));
}

/** Legacy graphZoomSliderValueFromRatio (:14167). */
export function graphZoomSliderValueFromRatio(ratio: unknown): string {
  const clamped = clampGraphZoomRatio(ratio);
  const progress =
    (GRAPH_MAX_ZOOM_RATIO - clamped) /
    (GRAPH_MAX_ZOOM_RATIO - GRAPH_MIN_ZOOM_RATIO);
  return String(Math.round(progress * GRAPH_ZOOM_SLIDER_MAX));
}

/** Legacy graphZoomRatioFromSliderValue (:14175). */
export function graphZoomRatioFromSliderValue(value: unknown): number {
  const progress = Math.min(
    1,
    Math.max(0, Number(value) / GRAPH_ZOOM_SLIDER_MAX || 0),
  );
  return (
    GRAPH_MAX_ZOOM_RATIO -
    progress * (GRAPH_MAX_ZOOM_RATIO - GRAPH_MIN_ZOOM_RATIO)
  );
}

function graphUsesDarkTheme(): boolean {
  const root = document.documentElement;
  const explicitTheme = root?.getAttribute("data-zs-theme");
  if (explicitTheme === "dark") return true;
  if (explicitTheme === "light") return false;
  return Boolean(window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
}

/** Legacy drawGraphImportanceHalo (:14594). */
function drawGraphImportanceHalo(
  context: CanvasRenderingContext2D,
  data: {
    x: number;
    y: number;
    size: number;
    kind?: unknown;
    currentPaperNode?: unknown;
  },
): void {
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

// ---------------------------------------------------------------------------
// Island
// ---------------------------------------------------------------------------

export class CitationGraphIsland {
  private readonly container: HTMLElement;
  private readonly vendors: CitationGraphVendors;
  private hooks: CitationGraphIslandHooks;
  private view: CitationGraphIslandView | null = null;
  private graph: CitationGraphModel | null = null;
  private renderer: CitationGraphRenderer | null = null;
  private modelSignature = "";
  private layoutSignature = "";
  private querySignature = "";
  private basisHash = "";
  private pointerHoveredNode: string | undefined;
  private focusedLabelNode: string | undefined;
  private hoverClearTimer: number | undefined;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame: number | undefined;
  private resizePending = false;
  private zoomSlider: HTMLInputElement | null = null;

  constructor(
    container: HTMLElement,
    vendors: CitationGraphVendors,
    hooks: CitationGraphIslandHooks,
  ) {
    this.container = container;
    this.vendors = vendors;
    this.hooks = hooks;
  }

  setHooks(hooks: CitationGraphIslandHooks): void {
    this.hooks = hooks;
  }

  /** Exposed for diagnostics/tests; the model identity is stable across merges. */
  getGraph(): CitationGraphModel | null {
    return this.graph;
  }

  getRenderer(): CitationGraphRenderer | null {
    return this.renderer;
  }

  /**
   * Legacy syncSigmaGraph (:14923). Diffs by model/layout/query/basis
   * identity; falls back to a full rebuild only when the basis changed.
   */
  update(view: CitationGraphIslandView): void {
    this.view = view;
    const modelSignature = sigmaGraphModelSignature(view);
    const layoutSignature = sigmaGraphLayoutSignature(view);
    if (this.renderer && this.graph && this.modelSignature === modelSignature) {
      // Interaction-only channel: no model mutation, just layout drift,
      // interaction state sync and a repaint (legacy :14927-14944).
      if (this.layoutSignature !== layoutSignature) {
        this.applyLayout(view, this.graph);
        this.layoutSignature = layoutSignature;
      }
      const preserveTransientHover =
        this.querySignature === view.querySignature &&
        this.basisHash === view.graphHash;
      this.syncInteractionState(this.graph, preserveTransientHover);
      this.querySignature = view.querySignature;
      this.basisHash = view.graphHash;
      this.reconcileSearchFocus();
      this.renderer.refresh();
      this.scheduleResize();
      return;
    }
    if (
      this.renderer &&
      this.graph &&
      view.querySignature &&
      this.querySignature === view.querySignature &&
      this.basisHash === view.graphHash
    ) {
      // Incremental graph-page merge (legacy mergeSigmaGraphPage, :14827).
      this.mergeGraphPage(view);
      this.modelSignature = modelSignature;
      this.layoutSignature = layoutSignature;
      this.reconcileSearchFocus();
      this.renderer.refresh();
      this.scheduleResize();
      return;
    }
    this.rebuild(view, modelSignature, layoutSignature);
  }

  /**
   * Committed-query reconciliation (legacy focusSearch :15210 +
   * refreshGraphSearchHighlight :14475, folded into the render-driven
   * update): when the committed query changes, focus the first visible match
   * so its label renders; an empty query clears the focus.
   */
  private reconciledQuery: string | undefined;

  private reconcileSearchFocus(): void {
    const query = this.view?.searchQuery || "";
    if (this.reconciledQuery === query) return;
    this.reconciledQuery = query;
    this.focusedLabelNode = undefined;
    const normalized = query.trim().toLowerCase();
    if (!normalized || !this.view || !this.graph) return;
    const match = this.view.visibleNodes.find(
      (node) =>
        graphNodeSearchText(node).includes(normalized) &&
        this.graph?.hasNode(node.id),
    );
    if (match && this.graph.hasNode(match.id)) {
      this.focusedLabelNode = match.id;
    }
  }

  /** Legacy setGraphSurfaceActive resize flush (:2280). */
  setSurfaceActive(active: boolean): void {
    if (this.view) {
      this.view = { ...this.view, surfaceActive: active };
    }
    if (active && this.resizePending) {
      this.scheduleResize();
    }
  }

  /**
   * Zoom overlay seam: the region owns the slider DOM; the island keeps it in
   * sync with the camera and applies slider drags (legacy :14138-14227).
   */
  attachZoomSlider(slider: HTMLInputElement): void {
    this.zoomSlider = slider;
    slider.addEventListener("input", this.handleSliderInput);
    this.syncZoomSlider();
  }

  detachZoomSlider(slider: HTMLInputElement): void {
    if (this.zoomSlider !== slider) return;
    slider.removeEventListener("input", this.handleSliderInput);
    this.zoomSlider = null;
  }

  private handleSliderInput = (): void => {
    const renderer = this.renderer;
    const slider = this.zoomSlider;
    if (!renderer || !slider) return;
    const camera = renderer.getCamera();
    const state = camera.getState();
    camera.setState({
      ...state,
      ratio: clampGraphZoomRatio(graphZoomRatioFromSliderValue(slider.value)),
    });
    renderer.refresh();
    this.syncZoomSlider();
  };

  destroy(): void {
    this.cancelScheduledHoverClear();
    if (this.resizeFrame !== undefined) {
      window.cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = undefined;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.zoomSlider = null;
    this.renderer?.kill();
    this.renderer = null;
    this.graph = null;
  }

  // -- internals --------------------------------------------------------------

  private syncZoomSlider(): void {
    const slider = this.zoomSlider;
    const renderer = this.renderer;
    if (!slider || !renderer) return;
    slider.value = graphZoomSliderValueFromRatio(
      renderer.getCamera().getState().ratio,
    );
  }

  private clampCameraZoom(): void {
    const renderer = this.renderer;
    if (!renderer) return;
    const camera = renderer.getCamera();
    const state = camera.getState();
    if (!state) return;
    const ratio = clampGraphZoomRatio(state.ratio);
    if (ratio !== state.ratio) {
      camera.setState({ ...state, ratio });
      renderer.refresh();
    }
    this.syncZoomSlider();
  }

  /** Legacy scheduleSigmaResize (:2645), gated on surface visibility. */
  private scheduleResize(): void {
    this.resizePending = true;
    if (
      !this.view?.surfaceActive ||
      !this.renderer ||
      this.resizeFrame !== undefined
    ) {
      return;
    }
    this.resizeFrame = window.requestAnimationFrame(() => {
      this.resizeFrame = undefined;
      const renderer = this.renderer;
      if (!this.view?.surfaceActive || !renderer) return;
      const rect = this.container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      this.resizePending = false;
      renderer.resize();
      renderer.refresh();
    });
  }

  private cancelScheduledHoverClear(): void {
    if (this.hoverClearTimer !== undefined) {
      window.clearTimeout(this.hoverClearTimer);
      this.hoverClearTimer = undefined;
    }
  }

  private scheduleHoverClear(
    renderer: CitationGraphRenderer,
    graph: CitationGraphModel,
  ): void {
    this.cancelScheduledHoverClear();
    this.hoverClearTimer = window.setTimeout(() => {
      this.hoverClearTimer = undefined;
      if (this.renderer !== renderer || this.graph !== graph) return;
      this.pointerHoveredNode = undefined;
      renderer.refresh();
    }, HOVER_CLEAR_DELAY_MS);
  }

  private selectedNodeId(graph: CitationGraphModel): string | undefined {
    const selected = this.view?.selectedElement;
    if (selected?.kind !== "node" || !graph.hasNode(selected.id)) {
      return undefined;
    }
    return selected.id;
  }

  /** Legacy syncGraphInteractionState (:14756). */
  private syncInteractionState(
    graph: CitationGraphModel,
    preserveTransientHover: boolean,
  ): void {
    const previousPointerNode = preserveTransientHover
      ? this.pointerHoveredNode
      : undefined;
    this.pointerHoveredNode =
      previousPointerNode && graph.hasNode(previousPointerNode)
        ? previousPointerNode
        : undefined;
    this.focusedLabelNode =
      this.focusedLabelNode && graph.hasNode(this.focusedLabelNode)
        ? this.focusedLabelNode
        : undefined;
  }

  private isCurrentPaperNode(node: SynthesisGraphNode): boolean {
    return isCurrentPaperGraphNode(node, this.view?.focusNodeId);
  }

  private nodeColor(node: SynthesisGraphNode): string {
    if (this.isCurrentPaperNode(node)) return "#dc2626";
    if (node.display_tier === "single_external") return "#b6bd74";
    return graphNodeBaseColor(node.kind);
  }

  private nodeImportanceColor(node: SynthesisGraphNode): string {
    if (this.isCurrentPaperNode(node)) return "#ef4444";
    if (node.kind === "library_paper") return "#2f7df6";
    if (node.display_tier === "single_external") return "#c4ca5d";
    return "#94a51f";
  }

  private nodeZIndex(
    node: SynthesisGraphNode,
    importance?: CitationGraphNodeImportance,
  ): number {
    if (this.isCurrentPaperNode(node)) return 18;
    const importanceZIndex = importance?.halo ? 8 : 0;
    if (node.kind === "library_paper") return Math.max(4, importanceZIndex);
    if (node.display_tier === "shared_external") {
      return Math.max(2, importanceZIndex);
    }
    if (node.visibility === "hover_only") return Math.max(1, importanceZIndex);
    return Math.max(2, importanceZIndex);
  }

  private nodeAttributes(
    node: SynthesisGraphNode,
    importance: CitationGraphNodeImportance | undefined,
    fallbackPosition?: { x: number; y: number },
  ): NodeAttributes {
    const currentPaperNode = this.isCurrentPaperNode(node);
    return {
      title: node.label,
      label: "",
      x: typeof node.x === "number" ? node.x : fallbackPosition?.x || 0,
      y: typeof node.y === "number" ? node.y : fallbackPosition?.y || 0,
      size: citationGraphNodeSize(node, importance, currentPaperNode),
      color:
        importance?.halo || currentPaperNode
          ? this.nodeImportanceColor(node)
          : this.nodeColor(node),
      zIndex: this.nodeZIndex(node, importance),
      highlighted: importance?.halo || currentPaperNode || false,
      importanceHalo: importance?.halo || currentPaperNode || false,
      importanceInteractive: false,
      currentPaperNode,
      incomingDegree: importance?.incomingDegree || 0,
      kind: node.kind,
      visibility: node.visibility || "default",
      display_tier: node.display_tier || "library",
      searchable: graphNodeSearchText(node),
    };
  }

  private edgeAttributes(edge: SynthesisGraphEdge): NodeAttributes {
    return {
      type: "arrow",
      hidden: true,
      color: CITATION_GRAPH_OUTGOING_EDGE_COLOR,
      size: CITATION_GRAPH_EDGE_SIZE,
      label: edge.primary_role
        ? graphEdgeRoleLabel(this.hooks.t, edge.primary_role)
        : "",
      zIndex: 0,
      visibility: edge.visibility || "default",
    };
  }

  private applyLayout(
    view: CitationGraphIslandView,
    graph: CitationGraphModel,
  ): void {
    for (const node of view.visibleNodes) {
      if (!graph.hasNode(node.id)) continue;
      if (typeof node.x === "number" && Number.isFinite(node.x)) {
        graph.setNodeAttribute(node.id, "x", node.x);
      }
      if (typeof node.y === "number" && Number.isFinite(node.y)) {
        graph.setNodeAttribute(node.id, "y", node.y);
      }
    }
  }

  /** Legacy citationGraphUnitsPerPixel (:14695). */
  private unitsPerPixel(graph: CitationGraphModel): number {
    const renderer = this.renderer;
    if (renderer?.viewportToGraph) {
      const first = renderer.viewportToGraph({ x: 0, y: 0 });
      const second = renderer.viewportToGraph({ x: 1, y: 0 });
      const units = Math.hypot(second.x - first.x, second.y - first.y);
      if (Number.isFinite(units) && units > 0) return units;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    graph.forEachNode((_nodeId, attributes) => {
      const x = Number(attributes.x);
      if (!Number.isFinite(x)) return;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    });
    const width = Math.max(1, this.container.clientWidth || 800);
    const span = maxX > minX ? maxX - minX : 1;
    return span / width;
  }

  /** Legacy citationGraphMissingNodePositions (:14882). */
  private missingNodePositions(
    view: CitationGraphIslandView,
    graph: CitationGraphModel,
    edges: readonly SynthesisGraphEdge[],
  ): Map<string, { x: number; y: number }> {
    const nodeIds = new Set(view.visibleNodes.map((node) => node.id));
    const missingByAnchor = new Map<string, string[]>();
    for (const node of view.visibleNodes) {
      if (
        graph.hasNode(node.id) ||
        (typeof node.x === "number" && typeof node.y === "number")
      ) {
        continue;
      }
      const anchorId = edges
        .filter((edge) => edge.source === node.id || edge.target === node.id)
        .map((edge) => (edge.source === node.id ? edge.target : edge.source))
        .find(
          (candidate) => nodeIds.has(candidate) && graph.hasNode(candidate),
        );
      if (!anchorId) continue;
      const pending = missingByAnchor.get(anchorId) || [];
      pending.push(node.id);
      missingByAnchor.set(anchorId, pending);
    }
    const positions = new Map<string, { x: number; y: number }>();
    const unitsPerPixel = this.unitsPerPixel(graph);
    for (const [anchorId, missingIds] of missingByAnchor) {
      const anchor = graph.getNodeAttributes(anchorId);
      const offsets = citationGraphFallbackOffsets(
        missingIds.length,
        unitsPerPixel,
      );
      missingIds.sort().forEach((nodeId, index) => {
        positions.set(nodeId, {
          x: Number(anchor.x || 0) + offsets[index].x,
          y: Number(anchor.y || 0) + offsets[index].y,
        });
      });
    }
    return positions;
  }

  /** Legacy mergeSigmaGraphPage (:14827). */
  private mergeGraphPage(view: CitationGraphIslandView): void {
    const graph = this.graph;
    if (!graph) return;
    const desiredNodeIds = new Set(view.visibleNodes.map((node) => node.id));
    const visualEdges = aggregateCitationGraphVisualEdges(view.visibleEdges);
    const desiredEdgeIds = new Set(visualEdges.map((edge) => edge.id));
    graph.forEachEdge((edgeId) => {
      if (!desiredEdgeIds.has(edgeId)) graph.dropEdge(edgeId);
    });
    graph.forEachNode((nodeId) => {
      if (!desiredNodeIds.has(nodeId)) graph.dropNode(nodeId);
    });
    const importanceByNodeId = buildCitationGraphNodeImportance(
      view.visibleNodes,
      visualEdges,
    );
    const fallbackPositions = this.missingNodePositions(
      view,
      graph,
      visualEdges,
    );
    for (const node of view.visibleNodes) {
      const existingPosition = graph.hasNode(node.id)
        ? {
            x: Number(graph.getNodeAttribute(node.id, "x") || 0),
            y: Number(graph.getNodeAttribute(node.id, "y") || 0),
          }
        : fallbackPositions.get(node.id);
      const attributes = this.nodeAttributes(
        node,
        importanceByNodeId.get(node.id),
        existingPosition,
      );
      if (graph.hasNode(node.id)) {
        graph.mergeNodeAttributes(node.id, attributes);
      } else {
        graph.addNode(node.id, attributes);
      }
    }
    for (const edge of visualEdges) {
      if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
      const attributes = this.edgeAttributes(edge);
      if (graph.hasEdge(edge.id)) {
        graph.mergeEdgeAttributes(edge.id, attributes);
      } else {
        graph.addDirectedEdgeWithKey(
          edge.id,
          edge.source,
          edge.target,
          attributes,
        );
      }
    }
    this.syncInteractionState(graph, true);
  }

  private rebuild(
    view: CitationGraphIslandView,
    modelSignature: string,
    layoutSignature: string,
  ): void {
    this.cancelScheduledHoverClear();
    // Legacy :14989: the renderer survives rebuilds; the camera only resets
    // when the layout actually changed, so compare against the previous
    // layout signature before storing the new one.
    const layoutChanged =
      Boolean(this.layoutSignature) && this.layoutSignature !== layoutSignature;
    const graph = new this.vendors.Graph({ multi: false, type: "directed" });
    const visualEdges = aggregateCitationGraphVisualEdges(view.visibleEdges);
    const importanceByNodeId = buildCitationGraphNodeImportance(
      view.visibleNodes,
      visualEdges,
    );
    const visibleIds = new Set(view.visibleNodes.map((node) => node.id));
    for (const node of view.visibleNodes) {
      graph.addNode(
        node.id,
        this.nodeAttributes(node, importanceByNodeId.get(node.id)),
      );
    }
    for (const edge of visualEdges) {
      if (visibleIds.has(edge.source) && visibleIds.has(edge.target)) {
        graph.mergeDirectedEdgeWithKey(
          edge.id,
          edge.source,
          edge.target,
          this.edgeAttributes(edge),
        );
      }
    }

    this.syncInteractionState(graph, false);
    this.graph = graph;
    this.modelSignature = modelSignature;
    this.layoutSignature = layoutSignature;
    this.querySignature = view.querySignature;
    this.basisHash = view.graphHash;
    this.reconcileSearchFocus();

    if (this.renderer) {
      this.renderer.setGraph(graph);
      if (layoutChanged) {
        this.renderer
          .getCamera()
          .setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 });
      }
      this.scheduleResize();
      return;
    }

    const renderer = new this.vendors.Sigma(graph, this.container, {
      allowInvalidContainer: true,
      enableEdgeEvents: false,
      renderEdgeLabels: false,
      defaultDrawNodeHover: (
        context: CanvasRenderingContext2D,
        data: Record<string, unknown>,
        settings: Record<string, unknown>,
      ) => this.drawNodeHover(context, data, settings),
      zIndex: true,
      nodeReducer: (node: string, data: Record<string, unknown>) =>
        this.nodeReducer(node, data),
      edgeReducer: (edge: string, data: Record<string, unknown>) =>
        this.edgeReducer(edge, data),
    });
    this.renderer = renderer;
    const camera = renderer.getCamera();
    camera.on("updated", () => this.clampCameraZoom());
    this.clampCameraZoom();
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleResize();
      });
      this.resizeObserver.observe(this.container);
    }
    this.scheduleResize();
    renderer.on("enterNode", ({ node }) => {
      if (!this.graph || !node) return;
      this.cancelScheduledHoverClear();
      this.pointerHoveredNode = node;
      renderer.refresh();
    });
    renderer.on("leaveNode", () => {
      if (!this.graph) return;
      this.scheduleHoverClear(renderer, this.graph);
    });
    renderer.on("clickNode", ({ node }) => {
      if (!this.graph || !node) return;
      this.cancelScheduledHoverClear();
      this.pointerHoveredNode = node;
      renderer.refresh();
      this.hooks.onSelectElement({ kind: "node", id: node });
    });
    renderer.on("clickEdge", ({ edge }) => {
      if (!edge) return;
      this.cancelScheduledHoverClear();
      this.pointerHoveredNode = undefined;
      renderer.refresh();
      this.hooks.onSelectElement({ kind: "edge", id: edge });
    });
    renderer.on("clickStage", () => {
      if (!this.graph) return;
      this.cancelScheduledHoverClear();
      this.pointerHoveredNode = undefined;
      this.focusedLabelNode = undefined;
      renderer.refresh();
      this.hooks.onSelectElement(null);
    });
  }

  private drawNodeHover(
    context: CanvasRenderingContext2D,
    data: Record<string, unknown>,
    settings: Record<string, unknown>,
  ): void {
    if (data.importanceHalo) {
      drawGraphImportanceHalo(context, {
        x: Number(data.x || 0),
        y: Number(data.y || 0),
        size: Number(data.size || 1),
        kind: data.kind,
        currentPaperNode: data.currentPaperNode,
      });
      if (!data.importanceInteractive) return;
    }
    this.vendors.drawDiscNodeHover?.(context, data, settings);
  }

  /** Legacy Sigma nodeReducer (:15015). */
  private nodeReducer(
    node: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const graph = this.graph;
    if (!graph) return data;
    const query = this.view?.searchQuery || "";
    const searchActive = Boolean(query.trim());
    const searchMatch = graphNodeMatchesSearchText(data.searchable, query);
    const currentPaperNode = Boolean(data.currentPaperNode);
    const selectedNode = this.selectedNodeId(graph);
    const pointerNode =
      this.pointerHoveredNode && graph.hasNode(this.pointerHoveredNode)
        ? this.pointerHoveredNode
        : undefined;
    const ownerIds = Array.from(
      new Set([selectedNode, pointerNode].filter((id): id is string => !!id)),
    );
    if (!ownerIds.length) {
      if (!searchActive) return data;
      return {
        ...data,
        color: searchMatch
          ? "#0ea5e9"
          : currentPaperNode
            ? data.color
            : "#d3d8de",
        size: searchMatch
          ? Math.max(Number(data.size || 1) * 1.35, Number(data.size || 1) + 1)
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
    const neighbor = ownerIds.some(
      (ownerId) => node === ownerId || graph.areNeighbors(node, ownerId),
    );
    const activeHaloNode = Boolean(data.importanceHalo && node === pointerNode);
    const showHoverLabel =
      searchMatch ||
      node === this.focusedLabelNode ||
      node === pointerNode ||
      // Keep the selected owner visible while a continuation page or a
      // pointer hover temporarily owns a second node.  The selected label is
      // the stable interaction anchor; hiding it when pointer state survives
      // a page merge leaves the owner blank until Sigma emits another enter
      // event for the physical canvas position.
      node === selectedNode;
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
        : node === pointerNode || node === selectedNode
          ? Math.max(
              data.kind === "library_paper" ? 24 : 12,
              Number(data.zIndex || 0),
            )
          : neighbor
            ? Math.max(
                data.visibility === "hover_only" ? 3 : 10,
                Number(data.zIndex || 0),
              )
            : Number(data.zIndex || 0),
      highlighted: Boolean(
        currentPaperNode || (data.importanceHalo && (searchMatch || neighbor)),
      ),
      importanceInteractive: activeHaloNode,
      label: showHoverLabel ? data.title : "",
    };
  }

  /** Legacy Sigma edgeReducer (:15104). */
  private edgeReducer(
    edge: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const graph = this.graph;
    if (!graph) return data;
    const selected = this.view?.selectedElement;
    const selectedEdgeId = selected?.kind === "edge" ? selected.id : undefined;
    const source = graph.source(edge);
    const target = graph.target(edge);
    const selectedNode = this.selectedNodeId(graph);
    const pointerNode =
      this.pointerHoveredNode && graph.hasNode(this.pointerHoveredNode)
        ? this.pointerHoveredNode
        : undefined;
    const connectedToSelectedNode = selectedNode
      ? source === selectedNode || target === selectedNode
      : false;
    const connectedToPointerNode = pointerNode
      ? source === pointerNode || target === pointerNode
      : false;
    const selectedEdge = selectedEdgeId === edge;
    const visible =
      connectedToSelectedNode || connectedToPointerNode || selectedEdge;
    const directionOwner = connectedToPointerNode
      ? pointerNode
      : connectedToSelectedNode
        ? selectedNode
        : undefined;
    const directionColor =
      directionOwner && target === directionOwner
        ? CITATION_GRAPH_INCOMING_EDGE_COLOR
        : CITATION_GRAPH_OUTGOING_EDGE_COLOR;
    return {
      ...data,
      hidden: !visible,
      color: directionColor,
      size: CITATION_GRAPH_EDGE_SIZE,
      zIndex: visible ? 20 : 0,
    };
  }
}

export function createCitationGraphIsland(
  container: HTMLElement,
  vendors: CitationGraphVendors,
  hooks: CitationGraphIslandHooks,
): CitationGraphIsland {
  return new CitationGraphIsland(container, vendors, hooks);
}
