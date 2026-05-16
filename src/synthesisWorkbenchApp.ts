import Graph from "graphology";
import Sigma from "sigma";

declare const window: Window &
  typeof globalThis & {
    markdownit?: (options?: Record<string, unknown>) => MarkdownItLike;
    texmath?: MarkdownItPlugin;
    katex?: unknown;
    __zoteroSkillsSynthesisWorkbenchBridge?: SynthesisWorkbenchBridge;
  };
declare const document: Document;

type MarkdownItPlugin = (...args: unknown[]) => unknown;

type MarkdownItLike = {
  use: (plugin: MarkdownItPlugin, options?: Record<string, unknown>) => MarkdownItLike;
  render: (source: string) => string;
};

type SynthesisWorkbenchBridge = {
  postMessage: (
    action: string,
    payload?: Record<string, unknown>,
  ) => Promise<unknown> | unknown;
};

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
  selectedTab: "overview" | "artifacts" | "registry" | "graph" | "reader";
  storage: Record<string, string>;
  preferences: Record<string, unknown>;
  sync?: { status?: string; diagnostics?: Array<Record<string, unknown>> };
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
  reader?: {
    topicId: string;
    previousTab: "overview" | "artifacts" | "registry" | "graph";
  };
};

type ArtifactReaderDto = {
  topicId: string;
  title: string;
  markdown: string;
  metadata?: Record<string, unknown>;
  hash?: string;
  updated_at?: string;
};

const state: {
  snapshot: Snapshot | null;
  artifactReader?: ArtifactReaderDto;
  sigma?: Sigma;
  sigmaResizeObserver?: ResizeObserver;
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
  if (tab === "reader") return state.artifactReader?.title || "Artifact Reader";
  if (tab === "artifacts") return "Topics";
  if (tab === "registry") return "Index";
  if (tab === "graph") return "Citation Graph";
  return "Home";
}

function renderShell(root: HTMLElement, snapshot: Snapshot) {
  clear(root);
  state.sigmaResizeObserver?.disconnect();
  state.sigmaResizeObserver = undefined;
  state.sigma?.kill();
  state.sigma = undefined;
  state.graph = undefined;

  const sidebar = el("aside", "sidebar");
  sidebar.appendChild(el("div", "brand", "Zotero Skills"));
  sidebar.appendChild(el("div", "muted", `Synthesis · Library ${snapshot.libraryId}`));
  const nav = el("div", "nav");
  [
    ["overview", "Home"],
    ["artifacts", "Topics"],
    ["graph", "Graph"],
    ["registry", "Index"],
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
  content.appendChild(topbar);
  const main = el("section", "main");
  renderCurrentView(main, snapshot);
  content.appendChild(main);
  root.appendChild(content);
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
  if (snapshot.selectedTab === "reader") {
    renderArtifactReader(main, snapshot);
  } else if (snapshot.selectedTab === "artifacts") {
    renderTopics(main, snapshot);
  } else if (snapshot.selectedTab === "registry") {
    renderIndex(main, snapshot);
  } else if (snapshot.selectedTab === "graph") {
    renderGraph(main, snapshot);
  } else {
    renderHome(main, snapshot);
  }
}

function topicPaperCount(row: Record<string, unknown>) {
  const value = Number(row.paper_count || 0);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function topicCompletion(row: Record<string, unknown>) {
  const value = Number(row.completion || 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.floor(value))) : 0;
}

function sortedTopTopics(snapshot: Snapshot) {
  return [...snapshot.artifacts.rows]
    .sort((left, right) =>
      topicPaperCount(right) - topicPaperCount(left) ||
      String(right.updated_at || "").localeCompare(String(left.updated_at || "")) ||
      String(left.title || "").localeCompare(String(right.title || "")),
    )
    .slice(0, 8);
}

function renderInsightCard(label: string, value: unknown, detail: string, tone = "") {
  const card = el("div", `insight-card ${tone}`.trim());
  card.appendChild(el("span", "insight-label", label));
  card.appendChild(el("strong", "insight-value", String(value || "0")));
  card.appendChild(el("span", "insight-detail", detail));
  return card;
}

function renderTopicCard(row: Record<string, unknown>) {
  const card = el("button", "topic-card");
  card.type = "button";
  card.addEventListener("click", () =>
    sendAction("hostCommand", {
      command: "openCanonicalMarkdown",
      args: { topicId: row.id },
    }),
  );
  const title = String(row.title || row.id || "Untitled topic");
  const summary = String(row.summary || row.markdown_preview || "").trim();
  const count = topicPaperCount(row);
  const completion = topicCompletion(row);
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
  fill.style.width = `${completion}%`;
  meter.appendChild(fill);
  card.appendChild(meter);
  const meta = el("div", "topic-card-meta");
  meta.appendChild(el("span", "", `${count} papers`));
  meta.appendChild(el("span", "", `${completion}% complete`));
  meta.appendChild(el("span", "", String(row.updated_at || "Not updated")));
  card.appendChild(meta);
  return card;
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
  grid.appendChild(
    renderInsightCard(
      "Sync",
      snapshot.sync?.status || "ready",
      `${snapshot.conflicts?.candidates?.length || 0} open conflicts`,
      "orange",
    ),
  );
  insights.appendChild(grid);
  shell.appendChild(insights);

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
    topicGrid.appendChild(el("div", "empty", "No synthesis topics yet."));
  } else {
    rows.forEach((row) => topicGrid.appendChild(renderTopicCard(row)));
  }
  topics.appendChild(topicGrid);
  shell.appendChild(topics);
  main.appendChild(shell);
}

function renderTopics(main: HTMLElement, snapshot: Snapshot) {
  const panel = el("div", "panel");
  const header = el("div", "panel-header");
  header.appendChild(el("strong", "", "Topics"));
  const filters = el("div", "filters");
  const search = el("input");
  search.placeholder = "Search";
  search.value = snapshot.artifacts.filters.search || "";
  search.addEventListener("input", () =>
    sendAction("setFilters", { artifacts: { search: search.value } }),
  );
  filters.appendChild(search);
  filters.appendChild(
    selectControl(["title", "paper_count", "updated_at"], snapshot.artifacts.filters.sort || "title", (value) =>
      sendAction("setFilters", { artifacts: { sort: value } }),
    ),
  );
  filters.appendChild(
    makeButton(
      "List",
      "setFilters",
      { artifacts: { viewMode: "list" } },
      snapshot.artifacts.filters.viewMode !== "grid",
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
    makeButton("Run synthesis", "hostCommand", {
      command: "runSynthesizeTopic",
    }),
  );
  filters.appendChild(
    makeButton("Purge Deleted", "hostCommand", {
      command: "purgeDeletedTopicArtifacts",
    }),
  );
  header.appendChild(filters);
  panel.appendChild(header);
  if (snapshot.artifacts.filters.viewMode === "grid") {
    const grid = el("div", "topic-grid panel-grid");
    snapshot.artifacts.visibleRows.forEach((row) => grid.appendChild(renderTopicCard(row)));
    panel.appendChild(grid);
  } else {
    panel.appendChild(
      tableView(
        ["Title", "Papers", "Completion", "Coverage", "Freshness", "Updated", "Action"],
        snapshot.artifacts.visibleRows,
        (row) => [
          titleWithSummary(String(row.title || ""), String(row.summary || row.markdown_preview || "")),
          topicPaperCount(row),
          `${topicCompletion(row)}%`,
          badge(row.coverage, toneFor(row.coverage)),
          badge(row.freshness, toneFor(row.freshness)),
          row.updated_at || "-",
          actionGroup([
            makeButton("Open", "hostCommand", {
              command: "openCanonicalMarkdown",
              args: { topicId: row.id },
            }),
            makeButton("Delete", "hostCommand", {
              command: "deleteTopicArtifact",
              args: { topicId: row.id },
            }),
          ]),
        ],
      ),
    );
  }
  if (snapshot.deletedArtifacts.count > 0) {
    const deleted = el(
      "p",
      "muted",
      `${snapshot.deletedArtifacts.count} deleted artifact(s) waiting for purge.`,
    );
    panel.appendChild(deleted);
  }
  main.appendChild(panel);
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

function getMarkdownParser() {
  if (typeof window.markdownit !== "function") {
    return null;
  }
  const parser = window.markdownit({
    html: false,
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

function renderMarkdown(markdown: string) {
  const parser = getMarkdownParser();
  if (!parser) {
    const pre = el("pre", "markdown-fallback");
    pre.textContent = markdown;
    return pre;
  }
  const body = el("article", "reader-body markdown-body");
  body.innerHTML = sanitizeRenderedMarkdown(parser.render(markdown));
  body.querySelectorAll("a[href]").forEach((anchor: Element) => {
    const href = anchor.getAttribute("href") || "";
    if (/^\s*javascript:/i.test(href)) {
      anchor.removeAttribute("href");
      return;
    }
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noreferrer noopener");
  });
  return body;
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

function renderArtifactReader(main: HTMLElement, snapshot: Snapshot) {
  const topicId = state.artifactReader?.topicId || snapshot.reader?.topicId || "";
  const reader = state.artifactReader;
  const panel = el("div", "reader-panel immersive-reader");
  const header = el("div", "reader-header");
  const titleGroup = el("div", "reader-title");
  titleGroup.appendChild(el("strong", "", reader?.title || topicId || "Artifact"));
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
  actions.appendChild(
    makeButton("Refresh", "hostCommand", {
      command: "openCanonicalMarkdown",
      args: { topicId },
    }),
  );
  const copy = el("button", "", "Copy markdown");
  copy.type = "button";
  copy.addEventListener("click", () => {
    void navigator.clipboard?.writeText(reader?.markdown || "");
  });
  actions.appendChild(copy);
  actions.appendChild(
    makeButton("Open folder", "hostCommand", {
      command: "openSynthesisFolder",
      args: { topicId },
    }),
  );
  header.appendChild(actions);
  panel.appendChild(header);
  if (!reader) {
    panel.appendChild(el("div", "empty", "No artifact selected."));
  } else {
    panel.appendChild(renderMarkdown(reader.markdown));
  }
  main.appendChild(panel);
}

function renderIndex(main: HTMLElement, snapshot: Snapshot) {
  const panel = el("div", "panel");
  const header = el("div", "panel-header");
  header.appendChild(el("strong", "", "Index"));
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
      title: node.label,
      label: "",
      x: typeof node.x === "number" ? node.x : 0,
      y: typeof node.y === "number" ? node.y : 0,
      size: node.kind === "library_paper" ? 7 : 2,
      color: colors[node.kind],
      kind: node.kind,
    });
  }
  for (const edge of snapshot.graph.visibleEdges) {
    if (visibleIds.has(edge.source) && visibleIds.has(edge.target)) {
      const targetKind = graph.getNodeAttribute(edge.target, "kind");
      graph.mergeDirectedEdgeWithKey(edge.id, edge.source, edge.target, {
        color: "#8a98a8",
        size:
          (targetKind === "library_paper" ? 1.15 : 0.35) *
          Math.max(1, Math.min(2, edge.mention_count || 1)),
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
      const showHoverLabel =
        node === state.hoveredNode ||
        (neighbor && data.kind === "library_paper");
      return {
        ...data,
        color: neighbor ? data.color : "#d3d8de",
        zIndex: neighbor ? 1 : 0,
        label: showHoverLabel ? data.title : "",
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
  if (typeof ResizeObserver !== "undefined") {
    state.sigmaResizeObserver = new ResizeObserver(() => {
      scheduleSigmaResize(renderer, container);
    });
    state.sigmaResizeObserver.observe(container);
  }
  scheduleSigmaResize(renderer, container);
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
    const loading = el("div", "loading-shell");
    loading.appendChild(el("div", "loading-spinner"));
    loading.appendChild(el("div", "loading-title", "Loading Synthesis Workbench"));
    loading.appendChild(
      el("div", "loading-subtitle", "Preparing Zotero bridge and library state..."),
    );
    root.appendChild(loading);
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
  if (data.type === "synthesis:artifact") {
    state.artifactReader = data.payload || undefined;
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
});

sendAction("ready");
render();
