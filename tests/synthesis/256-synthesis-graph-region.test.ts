import { assert } from "chai";
import { h, render } from "preact";

import {
  captureRegionSubtrees,
  assertRegionSubtreesPreserved,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
} from "../../src/synthesisWorkbenchI18n";
import {
  GRAPH_MAX_ZOOM_RATIO,
  GRAPH_MIN_ZOOM_RATIO,
} from "../../src/shared/citationGraphVisualRules";
import {
  defaultGraphDetailLabels,
  GraphRegion,
  type SynthesisGraphRegionSelection,
} from "../../src/synthesis/components/graph/GraphRegion";
import {
  narrowGraphSurfaceView,
  type SynthesisGraphSurfaceView,
  type SynthesisGraphText,
} from "../../src/synthesis/components/graph/graphModel";
import {
  CitationGraphIsland,
  createCitationGraphIsland,
  type CitationGraphIslandView,
  type CitationGraphVendors,
} from "../../src/synthesis/components/graph/sigmaIsland";

describe("graph detail localization", function () {
  it("uses injected labels and preserves count substitution", function () {
    const labels = defaultGraphDetailLabels((key, args) =>
      formatSynthesisWorkbenchMessage(
        key === "synthesis-column-title"
          ? "测试标题"
          : SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
        args,
      ),
    );
    assert.equal(labels.fieldTitle, "测试标题");
    assert.include(labels.citationsOutgoingTemplate, "{count}");
    assert.notInclude(labels.citationsOutgoingTemplate, "%count%");
  });
});

// Fake graphology/Sigma vendors (jsdom has no WebGL).

class FakeGraph {
  nodes = new Map<string, Record<string, unknown>>();
  edges = new Map<
    string,
    { source: string; target: string; attributes: Record<string, unknown> }
  >();
  addNodeCalls = 0;
  mergeNodeCalls = 0;

  constructor(public options: unknown) {}

  forEachNode(callback: (id: string, attrs: Record<string, unknown>) => void) {
    for (const [id, attrs] of Array.from(this.nodes.entries())) {
      callback(id, attrs);
    }
  }

  forEachEdge(callback: (id: string) => void) {
    for (const id of Array.from(this.edges.keys())) callback(id);
  }

  hasNode(id: string) {
    return this.nodes.has(id);
  }

  hasEdge(id: string) {
    return this.edges.has(id);
  }

  addNode(id: string, attrs: Record<string, unknown>) {
    this.addNodeCalls += 1;
    this.nodes.set(id, { ...attrs });
  }

  dropNode(id: string) {
    this.nodes.delete(id);
    for (const [edgeId, edge] of Array.from(this.edges.entries())) {
      if (edge.source === id || edge.target === id) this.edges.delete(edgeId);
    }
  }

  dropEdge(id: string) {
    this.edges.delete(id);
  }

  mergeNodeAttributes(id: string, attrs: Record<string, unknown>) {
    this.mergeNodeCalls += 1;
    Object.assign(this.nodes.get(id)!, attrs);
  }

  mergeEdgeAttributes(id: string, attrs: Record<string, unknown>) {
    Object.assign(this.edges.get(id)!.attributes, attrs);
  }

  addDirectedEdgeWithKey(
    id: string,
    source: string,
    target: string,
    attrs: Record<string, unknown>,
  ) {
    this.edges.set(id, { source, target, attributes: { ...attrs } });
  }

  mergeDirectedEdgeWithKey(
    id: string,
    source: string,
    target: string,
    attrs: Record<string, unknown>,
  ) {
    if (this.edges.has(id)) this.mergeEdgeAttributes(id, attrs);
    else this.addDirectedEdgeWithKey(id, source, target, attrs);
  }

  getNodeAttribute(id: string, name: string) {
    return this.nodes.get(id)?.[name];
  }

  getNodeAttributes(id: string) {
    return this.nodes.get(id)!;
  }

  setNodeAttribute(id: string, name: string, value: unknown) {
    this.nodes.get(id)![name] = value;
  }

  areNeighbors(a: string, b: string) {
    for (const edge of this.edges.values()) {
      if (
        (edge.source === a && edge.target === b) ||
        (edge.source === b && edge.target === a)
      ) {
        return true;
      }
    }
    return false;
  }

  source(id: string) {
    return this.edges.get(id)!.source;
  }

  target(id: string) {
    return this.edges.get(id)!.target;
  }
}

class FakeCamera {
  state = { x: 0.5, y: 0.5, ratio: 1, angle: 0 };
  private listeners: Array<() => void> = [];

  getState() {
    return this.state;
  }

  setState(patch: Partial<typeof this.state>) {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener();
  }

  on(_event: "updated", callback: () => void) {
    this.listeners.push(callback);
  }
}

class FakeSigma {
  static instances: FakeSigma[] = [];

  graph: FakeGraph;
  container: HTMLElement;
  settings: Record<string, unknown>;
  camera = new FakeCamera();
  refreshCount = 0;
  resizeCount = 0;
  setGraphCount = 0;
  killed = false;
  canvas: HTMLElement;
  private handlers = new Map<string, Array<(payload: never) => void>>();

  constructor(
    graph: FakeGraph,
    container: HTMLElement,
    settings: Record<string, unknown>,
  ) {
    this.graph = graph;
    this.container = container;
    this.settings = settings;
    this.canvas = document.createElement("div");
    this.canvas.className = "sigma-canvas";
    container.appendChild(this.canvas);
    FakeSigma.instances.push(this);
  }

  refresh() {
    this.refreshCount += 1;
  }

  resize() {
    this.resizeCount += 1;
  }

  setGraph(graph: FakeGraph) {
    this.graph = graph;
    this.setGraphCount += 1;
  }

  getCamera() {
    return this.camera;
  }

  getContainer() {
    return this.container;
  }

  on(event: string, callback: (payload: never) => void) {
    const list = this.handlers.get(event) || [];
    list.push(callback);
    this.handlers.set(event, list);
  }

  emit(event: string, payload: unknown) {
    for (const callback of this.handlers.get(event) || []) {
      callback(payload as never);
    }
  }

  kill() {
    this.killed = true;
  }
}

function makeVendors(): CitationGraphVendors {
  FakeSigma.instances = [];
  return {
    Graph: FakeGraph as unknown as CitationGraphVendors["Graph"],
    Sigma: FakeSigma as unknown as CitationGraphVendors["Sigma"],
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const t: SynthesisGraphText = (key, vars) =>
  formatSynthesisWorkbenchMessage(
    SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key] || String(key),
    vars,
  );

function rawGraph(overrides: Record<string, unknown> = {}) {
  return {
    filters: {
      search: "",
      role: "all",
      topicId: "all",
      layoutAlgorithm: "force",
      neighborhoodDepth: 1,
      nodeKinds: [
        "library_paper",
        "external_reference",
        "unresolved_reference",
      ],
      showLowSignalReferences: true,
    },
    graph_hash: "gh-1",
    layoutStatus: "ready",
    layoutAlgorithm: "force",
    topicScopes: [],
    nodes: [
      { id: "A", label: "Alpha Paper", kind: "library_paper", x: 1, y: 2 },
      {
        id: "B",
        label: "Beta Reference",
        kind: "external_reference",
        x: 10,
        y: 5,
        display_tier: "shared_external",
      },
    ],
    edges: [
      {
        id: "e1",
        source: "A",
        target: "B",
        primary_role: "background",
        mention_count: 2,
      },
    ],
    hoverOnlyNodes: [],
    hoverOnlyEdges: [],
    visibleNodes: [
      { id: "A", label: "Alpha Paper", kind: "library_paper", x: 1, y: 2 },
      {
        id: "B",
        label: "Beta Reference",
        kind: "external_reference",
        x: 10,
        y: 5,
        display_tier: "shared_external",
      },
    ],
    visibleEdges: [
      {
        id: "e1",
        source: "A",
        target: "B",
        primary_role: "background",
        mention_count: 2,
      },
    ],
    diagnostics: {
      cache_status: "ready",
      library_node_count: 1,
      shared_external_count: 1,
    },
    window: {
      hasMore: false,
      totalNodes: 2,
      totalEdges: 1,
      totalHoverNodes: 0,
      totalHoverEdges: 0,
      loadedNodes: 2,
      loadedEdges: 1,
      querySignature: "qs-1",
      status: "complete",
      roleOptions: [],
    },
    ...overrides,
  };
}

function makeSelection(
  graphOverrides: Record<string, unknown> = {},
  selectionOverrides: Partial<SynthesisGraphRegionSelection> = {},
): SynthesisGraphRegionSelection {
  return {
    view: narrowGraphSurfaceView(rawGraph(graphOverrides), 1),
    standaloneExport: false,
    standaloneGraphOnly: false,
    debugLayoutDetails: false,
    labels: defaultGraphDetailLabels(),
    ...selectionOverrides,
  };
}

function makeIslandView(
  view: SynthesisGraphSurfaceView,
  overrides: Partial<CitationGraphIslandView> = {},
): CitationGraphIslandView {
  return {
    visibleNodes: view.visibleNodes,
    visibleEdges: view.visibleEdges,
    graphHash: view.graphHash,
    layoutAlgorithm: view.layoutAlgorithm,
    querySignature: view.window?.querySignature || "",
    searchQuery: "",
    surfaceActive: true,
    ...overrides,
  };
}

function flushPreact(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("synthesis graph region (src/synthesis/components/graph)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function renderRegion(
    selection: SynthesisGraphRegionSelection,
    vendors: CitationGraphVendors = makeVendors(),
  ) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const actions: Array<{ action: string; payload: Record<string, unknown> }> =
      [];
    render(
      h(GraphRegion, {
        selection,
        t,
        vendors,
        onAction: (action, payload) => {
          actions.push({ action, payload: payload || {} });
        },
      }),
      container,
    );
    return { container, actions };
  }

  it("renders the graph shell: stage, sigma island, zoom overlay, legend, control drawer", function () {
    const { container } = renderRegion(makeSelection());
    assert.ok(container.querySelector(".graph-shell"), "graph shell exists");
    assert.ok(container.querySelector(".graph-stage"), "graph stage exists");
    const stage = container.querySelector(".sigma-stage");
    assert.ok(stage, "sigma stage exists");
    assert.notOk(stage!.classList.contains("is-inactive"), "stage active");
    assert.ok(
      stage!.querySelector(".sigma-canvas"),
      "fake sigma renderer mounted into the stage",
    );
    const slider = container.querySelector<HTMLInputElement>(
      ".graph-zoom-overlay input.graph-zoom-slider",
    );
    assert.ok(slider, "zoom slider exists");
    const badge = container.querySelector(".graph-scope-badge");
    assert.equal(
      badge?.textContent,
      t("synthesis-graph-scope-all"),
      "scope badge shows the full-graph label",
    );
    assert.ok(
      container.querySelector(".graph-stage > .citation-graph-legend"),
      "legend renders inside the stage when drawable",
    );
    const drawer = container.querySelector(".graph-control-drawer");
    assert.ok(drawer, "control drawer exists");
    assert.ok(
      drawer!.querySelector('input[data-synthesis-control-key="graph.search"]'),
      "search input carries the control key",
    );
    const shown = container.querySelector(".graph-shown-count");
    assert.equal(
      shown?.textContent,
      t("synthesis-graph-shown-count", { nodes: 2, edges: 1 }),
    );
    assert.isNull(
      container.querySelector(".graph-selection-drawer"),
      "no selection drawer without a selected element",
    );
  });

  it("dispatches layout, node-kind and cache actions with legacy payloads", async function () {
    const { container, actions } = renderRegion(makeSelection());
    const layoutButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        ".graph-control-group button",
      ),
    ).filter((button) =>
      ["Force", "Radial", "Components"].includes(button.textContent || ""),
    );
    layoutButtons[1].click();
    await flushPreact();
    assert.deepEqual(actions[0], {
      action: "setGraphView",
      payload: { layoutAlgorithm: "radial" },
    });

    const kindInputs = Array.from(
      container.querySelectorAll<HTMLInputElement>(
        '.graph-control-group input[type="checkbox"]',
      ),
    );
    kindInputs[1].checked = false;
    kindInputs[1].dispatchEvent(new window.Event("change", { bubbles: true }));
    await flushPreact();
    assert.deepEqual(actions[1], {
      action: "setGraphView",
      payload: { nodeKinds: ["library_paper", "unresolved_reference"] },
    });

    const rebuildButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find(
      (button) =>
        button.textContent === t("synthesis-action-rebuild-graph-cache"),
    );
    rebuildButton!.click();
    await flushPreact();
    assert.deepEqual(actions[2], {
      action: "hostCommand",
      payload: {
        command: "rebuildCitationGraphCacheNow",
        args: { reason: "user" },
      },
    });
  });

  it("commits the search draft through setFilters only on submit", async function () {
    const { container, actions } = renderRegion(makeSelection());
    const input = container.querySelector<HTMLInputElement>(
      'input[data-synthesis-control-key="graph.search"]',
    )!;
    input.value = "alpha";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flushPreact();
    assert.deepEqual(actions, [], "typing stays local");
    input.dispatchEvent(
      new window.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    await flushPreact();
    assert.deepEqual(actions, [
      { action: "setFilters", payload: { graph: { search: "alpha" } } },
    ]);
  });

  it("renders window progress and emits continue/retry window actions", async function () {
    const paused = rawGraph({
      window: {
        ...rawGraph().window,
        status: "paused",
        loadedNodes: 1,
        loadedEdges: 0,
      },
    });
    const { container, actions } = renderRegion(
      makeSelection({}, { view: narrowGraphSurfaceView(paused, 1) }),
    );
    const progress = container.querySelector(".graph-window-progress");
    assert.ok(progress, "window progress renders");
    assert.equal(
      (progress as HTMLElement).dataset.status,
      "paused",
      "progress carries the window status",
    );
    const continueButton = Array.from(
      progress!.querySelectorAll<HTMLButtonElement>("button"),
    ).find(
      (button) =>
        button.textContent === t("synthesis-action-continue-graph-loading"),
    );
    continueButton!.click();
    await flushPreact();
    assert.deepEqual(actions, [{ action: "continueGraphWindow", payload: {} }]);
  });

  it("shows the selection drawer and expands neighborhoods with legacy payloads", async function () {
    const selection = makeSelection({
      selectedElement: { kind: "node", id: "A" },
    });
    const { container, actions } = renderRegion(selection);
    const drawer = container.querySelector(".graph-selection-drawer");
    assert.ok(drawer, "selection drawer renders for a node selection");
    assert.ok(
      drawer!.textContent!.includes("Alpha Paper"),
      "drawer shows the selected node title",
    );
    const expandButtons = drawer!.querySelectorAll<HTMLButtonElement>(
      ".graph-neighborhood-actions button",
    );
    assert.equal(expandButtons.length, 3, "three expansion directions");
    expandButtons[0].click();
    await flushPreact();
    assert.deepEqual(actions, [
      {
        action: "expandGraphNeighborhood",
        payload: { nodeId: "A", direction: "incoming" },
      },
    ]);
  });

  it("renders the empty state and emits the graph_tab rebuild command", async function () {
    const { container, actions } = renderRegion(
      makeSelection({
        graph_hash: "",
        nodes: [],
        edges: [],
        visibleNodes: [],
        visibleEdges: [],
        diagnostics: {},
      }),
    );
    assert.ok(container.querySelector(".graph-empty"), "empty state renders");
    assert.ok(
      container
        .querySelector(".sigma-stage")!
        .classList.contains("is-inactive"),
      "sigma stage stays inactive",
    );
    const rebuild = container.querySelector<HTMLButtonElement>(
      ".graph-empty .empty-state-actions button",
    );
    assert.ok(rebuild, "rebuild action renders");
    rebuild!.click();
    await flushPreact();
    assert.deepEqual(actions, [
      {
        action: "hostCommand",
        payload: {
          command: "rebuildCitationGraphCacheNow",
          args: { reason: "graph_tab" },
        },
      },
    ]);
  });

  it("preserves region subtree and sigma identity across an equal-props re-render", function () {
    const vendors = makeVendors();
    const selection = makeSelection({
      selectedElement: { kind: "node", id: "A" },
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onAction = () => {};
    render(h(GraphRegion, { selection, t, vendors, onAction }), container);
    const captured = captureRegionSubtrees({ graph: container });
    const sigma = FakeSigma.instances[0];

    // Deep-equal but freshly built props: memo must skip the re-render.
    render(
      h(GraphRegion, {
        selection: makeSelection({
          selectedElement: { kind: "node", id: "A" },
        }),
        t,
        vendors,
        onAction,
      }),
      container,
    );
    assertRegionSubtreesPreserved({ graph: container }, captured);
    assert.strictEqual(
      FakeSigma.instances[0],
      sigma,
      "sigma renderer instance persists",
    );
    assert.equal(FakeSigma.instances.length, 1, "no renderer was recreated");
  });
});

// ---------------------------------------------------------------------------
// Island merge/diff semantics (fake graphology model)
// ---------------------------------------------------------------------------

describe("citation graph sigma island", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function makeIsland() {
    const vendors = makeVendors();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const selections: Array<
      SynthesisGraphRegionSelection["view"]["selectedElement"] | null
    > = [];
    const island = createCitationGraphIsland(host, vendors, {
      onSelectElement: (element) => selections.push(element),
      t,
    });
    return { island, host, vendors, selections };
  }

  it("merges incremental graph pages: node identity, positions and stale drops", function () {
    const { island } = makeIsland();
    const base = makeSelection().view;
    island.update(makeIslandView(base));
    const graph = island.getGraph() as unknown as FakeGraph;
    const sigma = FakeSigma.instances[0];
    assert.ok(graph.hasNode("A") && graph.hasNode("B"), "initial model built");
    assert.equal(graph.getNodeAttribute("A", "x"), 1);

    // Second page of the same window (same query signature + graph hash):
    // adds C without coordinates, drops B, and re-links A -> C.
    const page = narrowGraphSurfaceView(
      rawGraph({
        nodes: [
          { id: "A", label: "Alpha Paper", kind: "library_paper" },
          { id: "C", label: "Gamma Reference", kind: "external_reference" },
        ],
        edges: [
          { id: "e2", source: "A", target: "C", primary_role: "baseline" },
        ],
        visibleNodes: [
          { id: "A", label: "Alpha Paper", kind: "library_paper" },
          { id: "C", label: "Gamma Reference", kind: "external_reference" },
        ],
        visibleEdges: [
          { id: "e2", source: "A", target: "C", primary_role: "baseline" },
        ],
      }),
      1,
    );
    island.update(makeIslandView(page));
    assert.strictEqual(
      island.getGraph(),
      graph,
      "merge keeps the graphology instance",
    );
    assert.equal(sigma.setGraphCount, 0, "renderer graph was not swapped");
    assert.isFalse(graph.hasNode("B"), "stale node dropped");
    assert.isFalse(graph.hasEdge("e1"), "stale edge dropped");
    assert.isTrue(graph.hasNode("C"), "page node added");
    assert.isTrue(graph.hasEdge("e2"), "page edge added");
    assert.equal(
      graph.getNodeAttribute("A", "x"),
      1,
      "existing node position preserved",
    );
    const cx = Number(graph.getNodeAttribute("C", "x"));
    const cy = Number(graph.getNodeAttribute("C", "y"));
    assert.ok(
      Number.isFinite(cx) && Number.isFinite(cy) && (cx !== 0 || cy !== 0),
      "coordinate-less page node lands near its anchor",
    );
    assert.isAbove(sigma.refreshCount, 0, "merge repaints");
  });

  it("interaction-only updates repaint without mutating the model", function () {
    const { island } = makeIsland();
    const base = makeSelection().view;
    island.update(makeIslandView(base));
    const graph = island.getGraph() as unknown as FakeGraph;
    const sigma = FakeSigma.instances[0];
    graph.addNodeCalls = 0;
    graph.mergeNodeCalls = 0;
    const refreshBefore = sigma.refreshCount;

    const interacted = narrowGraphSurfaceView(
      rawGraph({ selectedElement: { kind: "node", id: "A" } }),
      1,
    );
    island.update(makeIslandView(interacted));
    assert.equal(graph.addNodeCalls, 0, "no nodes added");
    assert.equal(graph.mergeNodeCalls, 0, "no attributes merged");
    assert.equal(sigma.setGraphCount, 0, "graph not swapped");
    assert.isAbove(sigma.refreshCount, refreshBefore, "interaction repaints");
  });

  it("rebuilds on a new basis, keeps the camera unless the layout changed", function () {
    const { island } = makeIsland();
    const base = makeSelection().view;
    island.update(makeIslandView(base));
    const sigma = FakeSigma.instances[0];
    sigma.camera.setState({ ratio: 1.5 });

    // Same layout, new graph basis, changed label (model signature changes,
    // layout signature does not): camera survives the rebuild.
    const relabeled = rawGraph({
      graph_hash: "gh-2",
      window: { ...rawGraph().window, querySignature: "qs-2" },
    });
    (relabeled.nodes as Array<Record<string, unknown>>)[0].label = "Alpha II";
    (relabeled.visibleNodes as Array<Record<string, unknown>>)[0].label =
      "Alpha II";
    const sameLayout = narrowGraphSurfaceView(relabeled, 1);
    island.update(makeIslandView(sameLayout));
    assert.equal(sigma.setGraphCount, 1, "renderer reuses via setGraph");
    assert.equal(sigma.camera.getState().ratio, 1.5, "camera preserved");

    // New basis AND a different layout: camera resets to the framed default.
    const newLayout = narrowGraphSurfaceView(
      rawGraph({
        graph_hash: "gh-3",
        layoutAlgorithm: "radial",
        filters: { ...rawGraph().filters, layoutAlgorithm: "radial" },
        window: { ...rawGraph().window, querySignature: "qs-3" },
      }),
      1,
    );
    island.update(makeIslandView(newLayout));
    assert.equal(
      sigma.setGraphCount,
      2,
      "second rebuild goes through setGraph",
    );
    assert.equal(
      sigma.camera.getState().ratio,
      1,
      "camera reset on layout change",
    );
  });

  it("clicks translate into setGraphView selection intents", function () {
    const { island, selections } = makeIsland();
    island.update(makeIslandView(makeSelection().view));
    const sigma = FakeSigma.instances[0];
    sigma.emit("clickNode", { node: "A" });
    sigma.emit("clickStage", {});
    assert.deepEqual(selections, [{ kind: "node", id: "A" }, null]);
    island.destroy();
  });

  it("synchronizes the zoom slider with the camera and clamps the ratio", function () {
    const { island } = makeIsland();
    island.update(makeIslandView(makeSelection().view));
    const slider = document.createElement("input");
    slider.type = "range";
    island.attachZoomSlider(slider);
    const sigma = FakeSigma.instances[0];

    sigma.camera.setState({ ratio: GRAPH_MAX_ZOOM_RATIO });
    assert.equal(slider.value, "0", "max zoom maps to slider origin");
    sigma.camera.setState({ ratio: GRAPH_MIN_ZOOM_RATIO });
    assert.equal(slider.value, "100", "min zoom maps to slider end");

    slider.value = "0";
    slider.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.equal(
      sigma.camera.getState().ratio,
      GRAPH_MAX_ZOOM_RATIO,
      "slider drag applies the max ratio",
    );

    sigma.camera.setState({ ratio: 99 });
    assert.equal(
      sigma.camera.getState().ratio,
      GRAPH_MAX_ZOOM_RATIO,
      "out-of-range ratios clamp on camera update",
    );
  });

  it("a committed search query focuses the first matching node label", function () {
    const { island } = makeIsland();
    const base = makeSelection().view;
    island.update(makeIslandView(base, { searchQuery: "alpha" }));
    const sigma = FakeSigma.instances[0];
    const reducer = sigma.settings.nodeReducer as (
      node: string,
      data: Record<string, unknown>,
    ) => Record<string, unknown>;
    const graph = island.getGraph() as unknown as FakeGraph;
    const reduced = reducer("A", graph.getNodeAttributes("A"));
    assert.equal(reduced.label, "Alpha Paper", "match renders its label");
    const other = reducer("B", graph.getNodeAttributes("B"));
    assert.notEqual(other.label, "Beta Reference", "non-match keeps no label");
  });
});
