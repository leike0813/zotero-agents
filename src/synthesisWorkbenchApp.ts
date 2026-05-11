import Graph from "graphology";
import Sigma from "sigma";

declare const window: Window & typeof globalThis;
declare const document: Document;

type GraphNodeKind =
  | "library_paper"
  | "external_reference"
  | "unresolved_reference";

type GraphNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
  year?: string;
  x?: number;
  y?: number;
  low_signal?: boolean;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  primary_role?: string;
  mention_count?: number;
};

type Snapshot = {
  libraryId: number;
  selectedTab: "overview" | "artifacts" | "registry" | "graph";
  storage: Record<string, string>;
  preferences: Record<string, unknown>;
  sync?: { status?: string; diagnostics?: Array<Record<string, unknown>> };
  conflicts?: { candidates?: Array<Record<string, unknown>> };
  artifacts: {
    filters: Record<string, string>;
    rows: Array<Record<string, unknown>>;
    visibleRows: Array<Record<string, unknown>>;
  };
  registry: {
    filters: Record<string, string>;
    rows: Array<Record<string, unknown>>;
    visibleRows: Array<Record<string, unknown>>;
  };
  graph: {
    filters: {
      search: string;
      role: string;
      layoutPreset: string;
      nodeKinds: GraphNodeKind[];
      showLowSignalUnresolved: boolean;
    };
    graph_hash: string;
    layoutStatus: "missing" | "ready" | "dirty";
    layoutPreset: string;
    selectedElement?: { kind: "node" | "edge"; id: string };
    nodes: GraphNode[];
    edges: GraphEdge[];
    visibleNodes: GraphNode[];
    visibleEdges: GraphEdge[];
    diagnostics: Record<string, unknown>;
  };
};

const state: {
  snapshot: Snapshot | null;
  sigma?: Sigma;
  graph?: Graph;
  hoveredNode?: string;
} = {
  snapshot: null,
};

const colors: Record<GraphNodeKind, string> = {
  library_paper: "#1967b3",
  external_reference: "#b35300",
  unresolved_reference: "#657385",
};

function sendAction(action: string, payload: Record<string, unknown> = {}) {
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

function clear(node: Element) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function badge(text: unknown, tone = "") {
  return el("span", `badge ${tone}`, String(text || "-"));
}

function toneFor(value: unknown) {
  if (value === "ready" || value === "fresh" || value === "complete") {
    return "ok";
  }
  if (value === "missing" || value === "stale" || value === "dirty") {
    return "danger";
  }
  return "warn";
}

function makeButton(
  label: string,
  action: string,
  payload: Record<string, unknown> = {},
  active = false,
) {
  const button = el("button", active ? "active" : "", label);
  button.type = "button";
  button.addEventListener("click", () => sendAction(action, payload));
  return button;
}

function titleForTab(tab: Snapshot["selectedTab"]) {
  if (tab === "artifacts") return "Synthesis Artifacts";
  if (tab === "registry") return "Paper Registry";
  if (tab === "graph") return "Citation Graph";
  return "Synthesis Overview";
}

function renderShell(root: HTMLElement, snapshot: Snapshot) {
  clear(root);
  state.sigma?.kill();
  state.sigma = undefined;
  state.graph = undefined;

  const sidebar = el("aside", "sidebar");
  sidebar.appendChild(el("div", "brand", "Synthesis"));
  sidebar.appendChild(el("div", "muted", `Library ${snapshot.libraryId}`));
  const nav = el("div", "nav");
  [
    ["overview", "Overview"],
    ["artifacts", "Artifacts"],
    ["registry", "Registry"],
    ["graph", "Citation Graph"],
  ].forEach(([tab, label]) => {
    nav.appendChild(
      makeButton(
        label,
        "selectTab",
        { tab },
        snapshot.selectedTab === tab,
      ),
    );
  });
  sidebar.appendChild(nav);
  root.appendChild(sidebar);

  const content = el("main", "content");
  const topbar = el("div", "topbar");
  topbar.appendChild(el("h1", "", titleForTab(snapshot.selectedTab)));
  const toolbar = el("div", "toolbar");
  toolbar.appendChild(makeButton("Refresh", "refresh"));
  toolbar.appendChild(
    makeButton("Preferences", "hostCommand", { command: "openPreferences" }),
  );
  topbar.appendChild(toolbar);
  content.appendChild(topbar);
  const main = el("section", "main");
  renderCurrentView(main, snapshot);
  content.appendChild(main);
  root.appendChild(content);
}

function renderCurrentView(main: HTMLElement, snapshot: Snapshot) {
  if (snapshot.selectedTab === "artifacts") {
    renderArtifacts(main, snapshot);
  } else if (snapshot.selectedTab === "registry") {
    renderRegistry(main, snapshot);
  } else if (snapshot.selectedTab === "graph") {
    renderGraph(main, snapshot);
  } else {
    renderOverview(main, snapshot);
  }
}

function renderOverview(main: HTMLElement, snapshot: Snapshot) {
  const grid = el("div", "status-grid");
  [
    ["Storage root", snapshot.storage.rootState],
    ["Zotero anchor", snapshot.storage.anchorState],
    ["Mirror shards", snapshot.storage.mirrorState],
    ["Artifacts", snapshot.artifacts.rows.length],
    ["Registry rows", snapshot.registry.rows.length],
    ["Graph nodes", snapshot.graph.nodes.length],
    ["Graph layout", snapshot.graph.layoutStatus],
    ["Sync status", snapshot.sync?.status || "ready"],
    ["Conflict candidates", snapshot.conflicts?.candidates?.length || 0],
    ["Graph rebuild", snapshot.preferences.graphRebuildMode],
  ].forEach(([label, value]) => {
    const box = el("div", "status-box");
    box.appendChild(el("strong", "", String(label)));
    box.appendChild(el("span", "muted", String(value || "-")));
    grid.appendChild(box);
  });
  main.appendChild(grid);
}

function renderArtifacts(main: HTMLElement, snapshot: Snapshot) {
  const panel = el("div", "panel");
  const header = el("div", "panel-header");
  header.appendChild(el("strong", "", "Artifacts"));
  const filters = el("div", "filters");
  const search = el("input");
  search.placeholder = "Search";
  search.value = snapshot.artifacts.filters.search || "";
  search.addEventListener("input", () =>
    sendAction("setFilters", { artifacts: { search: search.value } }),
  );
  filters.appendChild(search);
  filters.appendChild(
    makeButton("Run synthesis", "hostCommand", {
      command: "runSynthesizeTopic",
    }),
  );
  header.appendChild(filters);
  panel.appendChild(header);
  panel.appendChild(
    tableView(
      ["Title", "Coverage", "Freshness", "Updated", "Action"],
      snapshot.artifacts.visibleRows,
      (row) => [
        row.title,
        badge(row.coverage, toneFor(row.coverage)),
        badge(row.freshness, toneFor(row.freshness)),
        row.updated_at || "-",
        makeButton("Open", "hostCommand", {
          command: "openCanonicalMarkdown",
          args: { topicId: row.id },
        }),
      ],
    ),
  );
  main.appendChild(panel);
}

function renderRegistry(main: HTMLElement, snapshot: Snapshot) {
  const panel = el("div", "panel");
  const header = el("div", "panel-header");
  header.appendChild(el("strong", "", "Registry"));
  const filters = el("div", "filters");
  const search = el("input");
  search.placeholder = "Search";
  search.value = snapshot.registry.filters.search || "";
  search.addEventListener("input", () =>
    sendAction("setFilters", { registry: { search: search.value } }),
  );
  filters.appendChild(search);
  header.appendChild(filters);
  panel.appendChild(header);
  panel.appendChild(
    tableView(["Title", "Year", "Readiness", "Coverage", "Missing"], snapshot.registry.visibleRows, (row) => [
      row.title,
      row.year || "-",
      badge(row.readiness, toneFor(row.readiness)),
      badge(row.coverage, toneFor(row.coverage)),
      Array.isArray(row.missing_artifacts) && row.missing_artifacts.length
        ? row.missing_artifacts.join(", ")
        : "-",
    ]),
  );
  main.appendChild(panel);
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

function renderGraph(main: HTMLElement, snapshot: Snapshot) {
  const shell = el("div", "graph-shell");
  const stage = el("div", "graph-stage");
  const canvas = el("div", "sigma-stage");
  stage.appendChild(canvas);
  shell.appendChild(stage);

  const detail = el("aside", "panel details");
  const header = el("div", "panel-header");
  header.appendChild(el("strong", "", "Graph Controls"));
  detail.appendChild(header);
  const controls = el("div", "details");
  controls.appendChild(renderGraphControls(snapshot));
  controls.appendChild(
    el(
      "p",
      "muted",
      `${snapshot.graph.visibleNodes.length} nodes, ${snapshot.graph.visibleEdges.length} edges`,
    ),
  );
  controls.appendChild(renderSelectedDetail(snapshot));
  detail.appendChild(controls);
  shell.appendChild(detail);
  main.appendChild(shell);

  if (!snapshot.graph.graph_hash || snapshot.graph.layoutStatus !== "ready") {
    const empty = el("div", "graph-empty");
    empty.appendChild(el("strong", "", "Graph snapshot unavailable"));
    empty.appendChild(
      el(
        "p",
        "muted",
        JSON.stringify(snapshot.graph.diagnostics || {}, null, 2),
      ),
    );
    empty.appendChild(
      makeButton("Rebuild graph", "hostCommand", {
        command: "manualRecomputeLayout",
        args: { reason: "graph_tab" },
      }),
    );
    stage.appendChild(empty);
    return;
  }
  renderSigmaGraph(canvas, snapshot);
}

function renderGraphControls(snapshot: Snapshot) {
  const wrap = el("div", "graph-controls");
  const filters = el("div", "filters");
  const search = el("input");
  search.placeholder = "Search node";
  search.value = snapshot.graph.filters.search || "";
  search.addEventListener("input", () => {
    sendAction("setFilters", { graph: { search: search.value } });
    focusSearch(search.value);
  });
  filters.appendChild(search);

  const role = selectControl(["all", ...roleOptions(snapshot)], snapshot.graph.filters.role, (value) =>
    sendAction("setFilters", { graph: { role: value } }),
  );
  filters.appendChild(role);
  filters.appendChild(
    makeButton("Rebuild graph", "hostCommand", {
      command: "manualRecomputeLayout",
      args: { reason: "user" },
    }),
  );
  wrap.appendChild(filters);

  const kinds = el("div", "filters");
  (["library_paper", "external_reference", "unresolved_reference"] as GraphNodeKind[]).forEach((kind) => {
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
    label.appendChild(document.createTextNode(kind.replace("_reference", "")));
    kinds.appendChild(label);
  });
  const unresolved = el("label", "checkbox-label");
  const unresolvedInput = document.createElement("input");
  unresolvedInput.type = "checkbox";
  unresolvedInput.checked = snapshot.graph.filters.showLowSignalUnresolved;
  unresolvedInput.addEventListener("change", () =>
    sendAction("setGraphView", {
      showLowSignalUnresolved: unresolvedInput.checked,
    }),
  );
  unresolved.appendChild(unresolvedInput);
  unresolved.appendChild(document.createTextNode("low-signal unresolved"));
  kinds.appendChild(unresolved);
  wrap.appendChild(kinds);

  const presets = el("div", "filters");
  ["compact", "balanced", "expanded"].forEach((preset) => {
    presets.appendChild(
      makeButton(
        preset,
        "setGraphView",
        { layoutPreset: preset },
        snapshot.graph.layoutPreset === preset,
      ),
    );
  });
  wrap.appendChild(presets);
  return wrap;
}

function renderSigmaGraph(container: HTMLElement, snapshot: Snapshot) {
  const graph = new Graph({ multi: false, type: "directed" });
  const visibleIds = new Set(snapshot.graph.visibleNodes.map((node) => node.id));
  for (const node of snapshot.graph.visibleNodes) {
    graph.addNode(node.id, {
      label: node.label,
      x: typeof node.x === "number" ? node.x : 0,
      y: typeof node.y === "number" ? node.y : 0,
      size: node.kind === "library_paper" ? 8 : 5,
      color: colors[node.kind],
      kind: node.kind,
    });
  }
  for (const edge of snapshot.graph.visibleEdges) {
    if (visibleIds.has(edge.source) && visibleIds.has(edge.target)) {
      graph.mergeDirectedEdgeWithKey(edge.id, edge.source, edge.target, {
        color: "#8a98a8",
        size: Math.max(1, Math.min(5, edge.mention_count || 1)),
        label: edge.primary_role || "",
      });
    }
  }

  state.graph = graph;
  const renderer = new Sigma(graph, container, {
    allowInvalidContainer: true,
    renderEdgeLabels: false,
    nodeReducer(node: string, data: Record<string, unknown>) {
      if (!state.hoveredNode) return data;
      const neighbor =
        node === state.hoveredNode || graph.areNeighbors(node, state.hoveredNode);
      return {
        ...data,
        color: neighbor ? data.color : "#d3d8de",
        zIndex: neighbor ? 1 : 0,
        label: neighbor ? data.label : "",
      };
    },
    edgeReducer(edge: string, data: Record<string, unknown>) {
      if (!state.hoveredNode) return data;
      const source = graph.source(edge);
      const target = graph.target(edge);
      const neighbor = source === state.hoveredNode || target === state.hoveredNode;
      return {
        ...data,
        hidden: !neighbor,
      };
    },
  } as any);
  state.sigma = renderer;
  renderer.on("enterNode", ({ node }: { node: string }) => {
    state.hoveredNode = node;
    renderer.refresh();
  });
  renderer.on("leaveNode", () => {
    state.hoveredNode = undefined;
    renderer.refresh();
  });
  renderer.on("clickNode", ({ node }: { node: string }) => {
    sendAction("setGraphView", { selectedElement: { kind: "node", id: node } });
  });
  renderer.on("clickEdge", ({ edge }: { edge: string }) => {
    sendAction("setGraphView", { selectedElement: { kind: "edge", id: edge } });
  });
}

function focusSearch(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized || !state.snapshot || !state.graph || !state.sigma) {
    return;
  }
  const match = state.snapshot.graph.visibleNodes.find((node) =>
    `${node.label} ${node.id}`.toLowerCase().includes(normalized),
  );
  if (!match || !state.graph.hasNode(match.id)) {
    return;
  }
  const attrs = state.graph.getNodeAttributes(match.id) as { x?: number; y?: number };
  state.sigma.getCamera().animate(
    { x: attrs.x || 0, y: attrs.y || 0, ratio: 0.35 },
    { duration: 250 },
  );
}

function renderSelectedDetail(snapshot: Snapshot) {
  const wrap = el("div", "selected-detail");
  wrap.appendChild(el("h3", "", "Selection"));
  const selected = snapshot.graph.selectedElement;
  if (!selected) {
    wrap.appendChild(el("pre", "", "No selection"));
    return wrap;
  }
  if (selected.kind === "node") {
    const node = snapshot.graph.nodes.find((entry) => entry.id === selected.id);
    wrap.appendChild(el("pre", "", JSON.stringify(node || selected, null, 2)));
    if (node?.kind === "library_paper") {
      wrap.appendChild(
        makeButton("Open Zotero item", "hostCommand", {
          command: "openZoteroItem",
          args: { nodeId: node.id },
        }),
      );
    }
    return wrap;
  }
  const edge = snapshot.graph.edges.find((entry) => entry.id === selected.id);
  wrap.appendChild(el("pre", "", JSON.stringify(edge || selected, null, 2)));
  return wrap;
}

function tableView(
  headers: string[],
  rows: Array<Record<string, unknown>>,
  mapRow: (row: Record<string, unknown>) => Array<Node | unknown>,
) {
  if (!rows.length) {
    return el("div", "empty", "No rows.");
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

function render() {
  const root = document.getElementById("app");
  if (!root) return;
  if (!state.snapshot) {
    clear(root);
    root.appendChild(el("div", "empty", "Loading Synthesis Workbench..."));
    return;
  }
  renderShell(root as HTMLElement, state.snapshot);
}

window.addEventListener("message", (event: MessageEvent) => {
  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }
  if (data.type === "synthesis:init" || data.type === "synthesis:snapshot") {
    state.snapshot = data.payload || null;
    render();
  }
});

sendAction("ready");
render();
