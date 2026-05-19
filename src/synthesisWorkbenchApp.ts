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

type TopicDetailSection =
  | "overview"
  | "taxonomy"
  | "claims"
  | "references"
  | "compare"
  | "external"
  | "coverage"
  | "statistics"
  | "report";

type TopicDetailDto = {
  topicId: string;
  title: string;
  language?: string;
  updated_at?: string;
  markdown_export?: string;
  markdown_hash?: string;
  artifact_hash?: string;
  paper_count?: number;
  external_literature_count?: number;
  topic?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  positioning?: Record<string, unknown>;
  taxonomy?: Record<string, unknown>;
  comparison_matrix?: Record<string, unknown>;
  claims?: unknown[];
  timeline_events?: unknown[] | Record<string, unknown>;
  paper_evidence?: unknown[];
  external_literature_analysis?: Record<string, unknown>;
  debates?: unknown[];
  coverage?: Record<string, unknown>;
  statistics?: Record<string, unknown>;
  synthesis_report?: Record<string, unknown>;
  gaps?: unknown[];
  review_outline?: Record<string, unknown>;
  evidence_map?: Record<string, unknown>;
  source_artifacts?: unknown;
  diagnostics?: unknown;
};

type DigestModalState = {
  status: "loading" | "available" | "unavailable";
  evidence?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

const state: {
  snapshot: Snapshot | null;
  artifactReader?: ArtifactReaderDto;
  topicDetail?: TopicDetailDto;
  topicDetailSection: TopicDetailSection;
  selectedEvidenceId?: string;
  evidenceExplorerOpen: boolean;
  sidebarExpanded: boolean;
  explorerWidth: number;
  digestModal?: DigestModalState;
  sigma?: Sigma;
  sigmaResizeObserver?: ResizeObserver;
  graph?: Graph;
  hoveredNode?: string;
} = {
  snapshot: null,
  topicDetailSection: "overview",
  evidenceExplorerOpen: false,
  sidebarExpanded: false,
  explorerWidth: 360,
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

function iconSvg(name: "home" | "topics" | "graph" | "index" | "panel-open" | "panel-close") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const paths: Record<typeof name, string[]> = {
    home: [
      "M3.5 10.5 12 3.5l8.5 7",
      "M5.5 9.5V20h4.8v-5.7h3.4V20h4.8V9.5",
    ],
    topics: [
      "M7 4.5h8.5L19 8v11.5H7z",
      "M15.5 4.5V8H19",
      "M5 7.5H3v12h2",
      "M10 12h6",
      "M10 15h4",
    ],
    graph: [
      "M7 7.5 12 12l5-4.5",
      "M7 16.5 12 12l5 4.5",
      "M5.2 5.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6",
      "M18.8 5.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6",
      "M12 9.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6",
      "M5.2 14.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6",
      "M18.8 14.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6",
    ],
    index: [
      "M8 6h12",
      "M8 12h12",
      "M8 18h12",
      "M4 6h.01",
      "M4 12h.01",
      "M4 18h.01",
    ],
    "panel-open": [
      "M4 5h16v14H4z",
      "M9 5v14",
      "M13 9l3 3-3 3",
    ],
    "panel-close": [
      "M4 5h16v14H4z",
      "M9 5v14",
      "M16 9l-3 3 3 3",
    ],
  };
  paths[name].forEach((data) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", data);
    svg.appendChild(path);
  });
  return svg;
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
  if (tab === "reader") {
    return state.topicDetail?.title || state.artifactReader?.title || "Topic Detail";
  }
  if (tab === "artifacts") return "Topics";
  if (tab === "registry") return "Index";
  if (tab === "graph") return "Citation Graph";
  return "Home";
}

function renderShell(root: HTMLElement, snapshot: Snapshot) {
  clear(root);
  root.classList.toggle("sidebar-expanded", state.sidebarExpanded);
  root.classList.toggle("sidebar-collapsed", !state.sidebarExpanded);
  state.sigmaResizeObserver?.disconnect();
  state.sigmaResizeObserver = undefined;
  state.sigma?.kill();
  state.sigma = undefined;
  state.graph = undefined;

  const sidebar = el("aside", "sidebar");
  const brand = el("div", "brand brand-icon-only");
  const logo = document.createElement("img");
  logo.src = "../icons/favicon.png";
  logo.alt = "Zotero Skills";
  brand.appendChild(logo);
  const sidebarToggle = el(
    "button",
    "sidebar-collapse-toggle icon-only",
  );
  sidebarToggle.type = "button";
  sidebarToggle.title = state.sidebarExpanded ? "Collapse navigation" : "Expand navigation";
  sidebarToggle.setAttribute("aria-label", sidebarToggle.title);
  sidebarToggle.setAttribute("aria-expanded", state.sidebarExpanded ? "true" : "false");
  sidebarToggle.appendChild(iconSvg(state.sidebarExpanded ? "panel-close" : "panel-open"));
  sidebarToggle.addEventListener("click", () => {
    state.sidebarExpanded = !state.sidebarExpanded;
    render();
  });
  brand.appendChild(sidebarToggle);
  sidebar.appendChild(brand);
  const libraryLabel = el("div", "muted sidebar-library", `Library ${snapshot.libraryId}`);
  sidebar.appendChild(libraryLabel);
  const nav = el("div", "nav");
  [
    ["overview", "Home", "home"],
    ["artifacts", "Topics", "topics"],
    ["graph", "Graph", "graph"],
    ["registry", "Index", "index"],
  ].forEach(([tab, label, iconName]) => {
    const button = makeButton("", "selectTab", { tab }, snapshot.selectedTab === tab);
    button.title = label;
    button.setAttribute("aria-label", label);
    const icon = el("span", `nav-icon nav-icon-${iconName}`);
    icon.appendChild(iconSvg(iconName as "home" | "topics" | "graph" | "index"));
    button.appendChild(icon);
    button.appendChild(el("span", "nav-label", label));
    nav.appendChild(button);
  });
  sidebar.appendChild(nav);
  root.appendChild(sidebar);

  const content = el("main", "content");
  const topbar = el("div", "topbar");
  topbar.appendChild(el("h1", "", titleForTab(snapshot.selectedTab)));
  if (snapshot.selectedTab === "reader" && state.topicDetail) {
    topbar.appendChild(renderTopicDetailToolbar(state.topicDetail, snapshot));
  }
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
    if (state.topicDetail) {
      renderTopicDetail(main, snapshot);
    } else {
      renderArtifactReader(main, snapshot);
    }
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
      command: "openTopicArtifact",
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
    makeButton("Create Topic", "hostCommand", {
      command: "runSynthesizeTopic",
    }),
  );
  filters.appendChild(
    makeButton("Purge Deleted", "hostCommand", {
      command: "purgeDeletedTopicArtifacts",
    }),
  );
  panel.appendChild(renderPanelToolbar(filters));
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
              command: "openTopicArtifact",
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

function renderPanelToolbar(content: HTMLElement) {
  const header = el("div", "panel-header panel-toolbar");
  header.appendChild(content);
  return header;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function numberValue(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function recordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function recordValue(value: unknown) {
  return isRecord(value) ? value : {};
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => textValue(entry)).filter(Boolean)
    : [];
}

function objectEntries(value: unknown) {
  return isRecord(value)
    ? Object.entries(value).filter(([, entry]) => {
        if (Array.isArray(entry)) return entry.length > 0;
        if (isRecord(entry)) return Object.keys(entry).length > 0;
        return !!textValue(entry);
      })
    : [];
}

function hasStructuredContent(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return objectEntries(value).length > 0;
  return !!textValue(value);
}

function firstText(row: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = textValue(row[key]);
    if (value) {
      return value;
    }
  }
  return fallback;
}

function renderParagraphs(value: unknown) {
  const box = el("div", "topic-prose");
  if (Array.isArray(value)) {
    value.map((entry) => textValue(entry)).filter(Boolean).forEach((entry) => {
      box.appendChild(el("p", "", entry));
    });
    return box;
  }
  const text = textValue(value);
  if (text) {
    text.split(/\n{2,}/).map((entry) => entry.trim()).filter(Boolean).forEach((entry) => {
      box.appendChild(el("p", "", entry));
    });
  }
  return box;
}

function renderKeyValueList(value: Record<string, unknown>): HTMLElement {
  const list = el("div", "topic-kv-list");
  Object.entries(value).forEach(([key, raw]) => {
    const row = el("div", "topic-kv-row");
    row.appendChild(el("span", "muted", key.replace(/_/g, " ")));
    if (raw === null || raw === undefined) {
      row.appendChild(el("strong", "", "-"));
    } else if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
      row.appendChild(el("strong", "", String(raw)));
    } else if (Array.isArray(raw)) {
      const arrWrap = el("div", "kv-array-wrap");
      raw.forEach((item) => {
        arrWrap.appendChild(badge(typeof item === "object" ? JSON.stringify(item) : String(item)));
      });
      row.appendChild(arrWrap);
    } else if (typeof raw === "object") {
      const subList = el("div", "kv-sub-list");
      Object.entries(raw as Record<string, unknown>).forEach(([subK, subV]) => {
        const subRow = el("div", "kv-sub-row");
        subRow.appendChild(el("span", "muted", subK.replace(/_/g, " ") + ": "));
        subRow.appendChild(el("span", "", typeof subV === "object" ? JSON.stringify(subV) : String(subV)));
        subList.appendChild(subRow);
      });
      row.appendChild(subList);
    }
    list.appendChild(row);
  });
  return list;
}

function evidenceRows(detail: TopicDetailDto) {
  return recordArray(detail.paper_evidence);
}

function evidenceTitle(evidence: Record<string, unknown>, index = 0) {
  return firstText(
    evidence,
    ["title", "paper_title", "label", "paper_ref", "id"],
    `Paper ${index + 1}`,
  );
}

function evidenceCode(evidence: Record<string, unknown>, index = 0) {
  return firstText(evidence, ["short_id", "code", "label"], `P${index + 1}`);
}

function evidenceId(evidence: Record<string, unknown>) {
  return firstText(evidence, ["id", "paper_ref", "paperRef", "item_key", "itemKey"]);
}

function evidenceRefKeys(evidence: Record<string, unknown>) {
  return new Set(
    [
      evidenceId(evidence),
      textValue(evidence.paper_ref || evidence.paperRef),
      textValue(evidence.item_key || evidence.itemKey),
      textValue(evidence.id),
    ].filter(Boolean),
  );
}

function evidenceForRef(detail: TopicDetailDto, ref: unknown) {
  const id = textValue(ref);
  if (!id) {
    return undefined;
  }
  return evidenceRows(detail).find((row) => {
    const keys = evidenceRefKeys(row);
    if (keys.has(id)) return true;
    return Array.from(keys).some((key) => id.endsWith(key) || key.endsWith(id));
  });
}

function primaryEvidenceForEvent(detail: TopicDetailDto, event: Record<string, unknown>) {
  const refs = stringArray(event.evidence_refs);
  if (refs.length) {
    return evidenceForRef(detail, refs[0]);
  }
  const direct = firstText(event, ["paper_evidence_id", "evidence_id", "paper_ref"]);
  return direct ? evidenceForRef(detail, direct) : undefined;
}

function openDigestModal(evidence: Record<string, unknown>) {
  state.selectedEvidenceId = evidenceId(evidence);
  state.digestModal = { status: "loading", evidence };
  render();
  sendAction("hostCommand", {
    command: "resolveTopicPaperDigest",
    args: {
      topicId: state.topicDetail?.topicId,
      paper_ref: evidence.paper_ref || evidence.paperRef,
      digest_ref: evidence.digest_ref || evidence.digestRef,
    },
  });
}

function openEvidenceExplorer(evidenceIdValue?: string) {
  if (evidenceIdValue) {
    state.selectedEvidenceId = evidenceIdValue;
  }
  state.evidenceExplorerOpen = true;
  render();
}

function selectEvidenceRef(detail: TopicDetailDto, ref: unknown) {
  const evidence = evidenceForRef(detail, ref);
  if (evidence) {
    state.selectedEvidenceId = evidenceId(evidence);
  } else {
    state.selectedEvidenceId = textValue(ref) || undefined;
  }
  state.evidenceExplorerOpen = true;
  render();
}

function evidenceRefChips(detail: TopicDetailDto, refs: unknown, tone = "blue") {
  const chips = el("div", "evidence-chips");
  stringArray(refs).forEach((ref) => {
    const chip = el("button", `chip ${tone}`, ref);
    chip.type = "button";
    chip.title = `Inspect evidence ${ref}`;
    chip.addEventListener("click", () => selectEvidenceRef(detail, ref));
    chips.appendChild(chip);
  });
  return chips;
}

function traceChips(refs: unknown) {
  const chips = el("div", "evidence-chips");
  stringArray(refs).forEach((ref) => chips.appendChild(badge(ref, "purple")));
  return chips;
}

function renderEmptyStructuredState(label = "No structured data") {
  const empty = el("div", "structured-empty");
  empty.appendChild(el("strong", "", label));
  empty.appendChild(
    el("p", "muted", "This section was not materialized in the current structured artifact."),
  );
  return empty;
}

function renderContentCard(title: string, body?: Node | string, className = "content-card") {
  const card = el("section", className);
  card.appendChild(el("h3", "", title));
  if (typeof body === "string") {
    card.appendChild(renderParagraphs(body));
  } else if (body) {
    card.appendChild(body);
  }
  return card;
}

function renderTopicOverviewSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", "Overview"));
  
  const summaryText =
    detail.summary?.text ||
    detail.summary?.brief ||
    detail.summary?.summary ||
    detail.summary?.long_summary ||
    detail.positioning?.review_position;
    
  if (summaryText) {
    const summaryCard = el("div", "overview-summary-hero");
    summaryCard.appendChild(el("h3", "hero-title", "Synthesis Summary"));
    summaryCard.appendChild(renderParagraphs(summaryText));
    section.appendChild(summaryCard);
  }

  const positioning = detail.positioning || {};
  if (hasStructuredContent(positioning)) {
    const dash = el("div", "overview-dashboard");
    ["importance", "timeliness", "review_position", "concept_position", "why_synthesize"].forEach((key) => {
      const text = textValue(positioning[key]);
      if (text) {
        const metric = el("div", "dashboard-metric");
        metric.appendChild(el("div", "metric-label", key.replace(/_/g, " ")));
        metric.appendChild(el("div", "metric-value", text));
        dash.appendChild(metric);
      }
    });
    const boundary = positioning.scope_boundary;
    if (hasStructuredContent(boundary)) {
      const metric = el("div", "dashboard-metric span-2");
      metric.appendChild(el("div", "metric-label", "Scope Boundary"));
      metric.appendChild(renderKeyValueList(boundary as Record<string, unknown>));
      dash.appendChild(metric);
    }
    if (dash.childElementCount) section.appendChild(dash);
  }

  const outline = detail.review_outline || {};
  const outlineRows = [
    ...recordArray(outline.introduction_logic),
    ...recordArray(outline.related_work_logic),
    ...recordArray(outline.body_sections),
    ...recordArray(outline.sections),
  ];
  if (outlineRows.length) {
    const outlineSection = el("div", "overview-outline-section");
    outlineSection.appendChild(el("h3", "", "Review Outline"));
    
    const stepper = el("div", "outline-stepper");
    outlineRows.slice(0, 8).forEach((row, index) => {
      const step = el("div", "outline-step");
      
      const marker = el("div", "step-marker");
      marker.appendChild(el("span", "step-number", `${index + 1}`));
      step.appendChild(marker);
      
      const content = el("div", "step-content");
      content.appendChild(el("h4", "", firstText(row, ["title", "heading", "purpose", "id"], `Step ${index + 1}`)));
      
      const text = firstText(row, ["summary", "description", "purpose", "rationale"]);
      if (text) content.appendChild(el("p", "", text));
      
      const refs = stringArray(row.evidence_map_refs || row.source_section_refs);
      if (refs.length) {
        const foot = el("div", "step-footer");
        foot.appendChild(traceChips(refs));
        content.appendChild(foot);
      }
      
      step.appendChild(content);
      stepper.appendChild(step);
    });
    outlineSection.appendChild(stepper);
    section.appendChild(outlineSection);
  }

  if (section.childElementCount <= 1) {
    section.appendChild(renderEmptyStructuredState("No overview data"));
  }
  return section;
}

function renderTopicTaxonomySection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", "Taxonomy"));
  const taxonomy = detail.taxonomy || {};
  const summary = recordValue(taxonomy.summary);
  const summaryText = firstText(summary, ["text", "analysis", "overview"]);
  if (summaryText) {
    section.appendChild(renderContentCard("Route Synthesis", renderParagraphs(summaryText)));
  }
  const axis = firstText(taxonomy, ["primary_axis", "axis", "classification_axis"]);
  const rationale = firstText(taxonomy, ["axis_rationale", "rationale", "reason"]);
  if (axis || rationale) {
    const head = el("div", "taxonomy-head");
    if (axis) head.appendChild(badge(axis, "blue"));
    if (rationale) head.appendChild(renderParagraphs(rationale));
    section.appendChild(renderContentCard("Classification Axis", head));
  }
  const nodes = recordArray(taxonomy.nodes || taxonomy.categories || taxonomy.taxonomy_nodes);
  if (nodes.length) {
    const list = el("div", "taxonomy-list");
    nodes.forEach((node, index) => {
      const card = el("article", "taxonomy-list-item");
      
      const header = el("header", "taxonomy-item-header");
      const titleWrap = el("div", "taxonomy-item-title");
      titleWrap.appendChild(el("span", "claim-index", `T${index + 1}`));
      titleWrap.appendChild(el("h3", "", firstText(node, ["title", "label", "name", "id"], `Node ${index + 1}`)));
      header.appendChild(titleWrap);
      
      const maturity = firstText(node, ["maturity", "status", "development_stage"]);
      if (maturity) header.appendChild(badge(maturity, "purple"));
      card.appendChild(header);

      const text = firstText(node, ["description", "summary", "rationale", "definition"]);
      if (text) card.appendChild(el("p", "taxonomy-item-desc", text));
      
      const detailsWrap = el("div", "taxonomy-item-details");
      
      const probMech = el("div", "taxonomy-detail-group");
      const prob = firstText(node, ["core_problem", "problem", "target_problem"]);
      if (prob) {
          const pDiv = el("div", "taxonomy-detail-row");
          pDiv.appendChild(el("span", "muted", "Problem"));
          pDiv.appendChild(el("strong", "", prob));
          probMech.appendChild(pDiv);
      }
      const mech = firstText(node, ["mechanism", "technical_mechanism", "core_mechanism"]);
      if (mech) {
          const mDiv = el("div", "taxonomy-detail-row");
          mDiv.appendChild(el("span", "muted", "Mechanism"));
          mDiv.appendChild(el("strong", "", mech));
          probMech.appendChild(mDiv);
      }
      if (probMech.childElementCount) detailsWrap.appendChild(probMech);

      const prosCons = el("div", "taxonomy-detail-group pros-cons");
      const strengths = stringArray(node.strengths || node.advantages);
      if (strengths.length) {
          const sDiv = el("div", "taxonomy-detail-row");
          sDiv.appendChild(el("span", "muted", "Strengths"));
          const sList = el("ul", "taxonomy-bullet-list");
          strengths.forEach((st) => sList.appendChild(el("li", "pro-item", st)));
          sDiv.appendChild(sList);
          prosCons.appendChild(sDiv);
      }
      const limits = stringArray(node.limitations || node.weaknesses);
      if (limits.length) {
          const lDiv = el("div", "taxonomy-detail-row");
          lDiv.appendChild(el("span", "muted", "Limitations"));
          const lList = el("ul", "taxonomy-bullet-list");
          limits.forEach((lt) => lList.appendChild(el("li", "con-item", lt)));
          lDiv.appendChild(lList);
          prosCons.appendChild(lDiv);
      }
      if (prosCons.childElementCount) detailsWrap.appendChild(prosCons);
      
      if (detailsWrap.childElementCount) card.appendChild(detailsWrap);

      const refs = node.evidence_refs || node.paper_refs || node.paper_unit_refs;
      if (stringArray(refs).length) {
          const foot = el("footer", "taxonomy-item-footer");
          foot.appendChild(evidenceRefChips(detail, refs, "blue"));
          if (stringArray(node.evidence_map_refs).length) foot.appendChild(traceChips(node.evidence_map_refs));
          card.appendChild(foot);
      } else if (stringArray(node.evidence_map_refs).length) {
          const foot = el("footer", "taxonomy-item-footer");
          foot.appendChild(traceChips(node.evidence_map_refs));
          card.appendChild(foot);
      }
      list.appendChild(card);
    });
    section.appendChild(list);
  } else {
    section.appendChild(renderEmptyStructuredState("No taxonomy data"));
  }
  return section;
}

function topicTimelineEvents(detail: TopicDetailDto) {
  const timeline = detail.timeline_events;
  if (recordValue(timeline).events) {
    return recordArray(recordValue(timeline).events);
  }
  return recordArray(timeline);
}

function topicTimelineSummary(detail: TopicDetailDto) {
  const timeline = recordValue(detail.timeline_events);
  return recordValue(timeline.summary);
}

function renderTopicClaimsSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", "Claims"));
  const claims = recordArray(detail.claims);
  if (!claims.length) {
    section.appendChild(renderEmptyStructuredState("No claim data"));
    return section;
  }
  const list = el("div", "claims-list");
  claims.forEach((claim, index) => {
    const card = el("article", "claim-row");
    
    // Left column: Claim text and rationale
    const leftCol = el("div", "claim-content");
    const header = el("div", "claim-header");
    header.appendChild(el("span", "claim-index", firstText(claim, ["id"], `C${index + 1}`)));
    const strength = firstText(claim, ["strength", "claim_strength", "support_level"]);
    if (strength) {
        const tone = strength.toLowerCase() === "strong" ? "ok" : (strength.toLowerCase() === "weak" ? "warn" : "");
        header.appendChild(badge(strength, tone as any));
    }
    leftCol.appendChild(header);
    leftCol.appendChild(el("h3", "", firstText(claim, ["text", "claim", "title", "id"], `Claim ${index + 1}`)));
    
    const rationale = firstText(claim, ["analysis", "rationale", "support", "summary", "explanation"]);
    if (rationale) leftCol.appendChild(el("p", "", rationale));
    card.appendChild(leftCol);

    // Right column: Evidence cards
    const rightCol = el("div", "claim-evidence");
    const eRefs = stringArray(claim.evidence_refs || claim.paper_evidence_refs);
    if (eRefs.length) {
      rightCol.appendChild(el("h4", "evidence-group-title", "Supporting Evidence"));
      const eList = el("div", "claim-evidence-list");
      eRefs.forEach((ref) => {
        const rows = evidenceRows(detail);
        const ev = rows.find(r => evidenceRefKeys(r).has(ref));
        
        if (ev) {
            const eCard = el("button", "mini-evidence-card");
            eCard.type = "button";
            eCard.title = "View in Evidence Explorer";
            const id = evidenceId(ev);
            if (id) {
                eCard.addEventListener("click", () => {
                   openEvidenceExplorer(id);
                });
            }
            const code = evidenceCode(ev, Math.max(0, rows.findIndex(r => evidenceId(r) === id)));
            const title = evidenceTitle(ev, Math.max(0, rows.findIndex(r => evidenceId(r) === id)));
            eCard.appendChild(el("span", "evidence-code", code));
            eCard.appendChild(el("span", "evidence-title", title));
            eList.appendChild(eCard);
        } else {
            // Fallback to chip if not found in paper evidence
            eList.appendChild(badge(ref, "green"));
        }
      });
      rightCol.appendChild(eList);
    }
    
    const tRefs = stringArray(claim.evidence_map_refs);
    if (tRefs.length) {
       const tList = el("div", "claim-evidence-list");
       tRefs.forEach((r) => tList.appendChild(badge(r, "purple")));
       rightCol.appendChild(tList);
    }
    
    card.appendChild(rightCol);
    list.appendChild(card);
  });
  section.appendChild(list);
  return section;
}

function renderTopicReferencesSection(detail: TopicDetailDto) {
  const container = el("div", "references-section");
  
  const header = el("div", "references-header");
  const rows = evidenceRows(detail);
  
  const titleContainer = el("div", "references-title-row");
  titleContainer.appendChild(el("h3", "", `Associated Literature References (${rows.length})`));
  header.appendChild(titleContainer);
  
  const searchBar = el("div", "references-search-bar");
  const input = el("input", "references-search-input") as HTMLInputElement;
  input.type = "text";
  input.placeholder = "Search references by title, author, key, or summary...";
  searchBar.appendChild(input);
  header.appendChild(searchBar);
  container.appendChild(header);
  
  const grid = el("div", "references-grid");
  container.appendChild(grid);
  
  function updateGrid(filterText = "") {
    grid.innerHTML = "";
    const query = filterText.toLowerCase();
    
    rows.forEach((r, idx) => {
      const title = evidenceTitle(r, idx);
      const year = firstText(r, ["year", "publication_year"]) || "";
      const refKey = firstText(r, ["paper_ref", "paperRef"]) || "";
      const summary = firstText(r, ["summary", "evidence_summary", "topic_relevance", "rationale"]) || "";
      const code = evidenceCode(r, idx);
      const status = firstText(r, ["synthesis_role", "status", "freshness"]) || "";
      const isSelected = state.selectedEvidenceId === evidenceId(r);
      
      if (
        query &&
        !title.toLowerCase().includes(query) &&
        !year.toLowerCase().includes(query) &&
        !refKey.toLowerCase().includes(query) &&
        !summary.toLowerCase().includes(query) &&
        !code.toLowerCase().includes(query)
      ) {
        return;
      }
      
      const card = el("div", `reference-card${isSelected ? " active" : ""}`);
      
      const cardHead = el("div", "ref-card-head");
      const badgeContainer = el("div", "ref-badge-container");
      
      // Code Badge
      const codeEl = el("span", "ref-code-badge", code);
      badgeContainer.appendChild(codeEl);
      if (status) {
        badgeContainer.appendChild(badge(status, toneFor(status)));
      }
      cardHead.appendChild(badgeContainer);
      
      if (year) {
        cardHead.appendChild(el("span", "ref-year-label", year));
      }
      card.appendChild(cardHead);
      
      card.appendChild(el("h4", "ref-title", title));
      
      if (refKey) {
        card.appendChild(el("div", "ref-key-badge", refKey));
      }
      
      if (summary) {
        const sumText = summary.length > 130 ? summary.substring(0, 127) + "..." : summary;
        card.appendChild(el("p", "ref-summary", sumText));
      }
      
      card.addEventListener("click", () => {
        openEvidenceExplorer(evidenceId(r) || undefined);
      });
      
      grid.appendChild(card);
    });
    
    if (!grid.childElementCount) {
      grid.appendChild(renderEmptyStructuredState("No matching references found"));
    }
  }
  
  input.addEventListener("input", (e) => {
    updateGrid((e.target as HTMLInputElement).value);
  });
  
  updateGrid();
  
  return container;
}

function comparisonRows(matrix: Record<string, unknown>) {
  const rows = recordArray(matrix.rows || matrix.items);
  if (rows.length) return rows;
  const dimensions = recordArray(matrix.dimensions);
  return dimensions.length ? dimensions : [];
}

function renderMethodComparisonCard(row: Record<string, unknown>) {
  const methods = recordArray(row.methods_comparison || row.methods || row.entries);
  if (!methods.length) return undefined;
  return tableView(["Method", "AP", "FPS", "Epochs", "Backbone"], methods, (method) => [
    firstText(method, ["method", "name"], "-"),
    firstText(method, ["ap", "mAP"], "-"),
    firstText(method, ["fps", "speed"], "-"),
    firstText(method, ["epochs", "schedule"], "-"),
    firstText(method, ["backbone", "model"], "-"),
  ]);
}

function renderTopicCompareSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", "Compare"));
  const matrix = detail.comparison_matrix || {};
  const rows = comparisonRows(matrix);
  if (rows.length) {
    // 1. Extract all unique routes/methods to form columns
    const routeSet = new Set<string>();
    rows.forEach((r) => {
      recordArray(r.comparisons).forEach((c) => {
        const route = firstText(c, ["route", "method", "name"]);
        if (route && route !== "-") routeSet.add(route);
      });
    });
    const routes = Array.from(routeSet);

    // 2. Build the table
    const tableWrap = el("div", "matrix-table-wrap");
    const table = el("table", "matrix-table");
    
    // Header
    const thead = el("thead");
    const trHead = el("tr");
    trHead.appendChild(el("th", "matrix-th matrix-dim-col", "Dimension"));
    routes.forEach((route) => {
      trHead.appendChild(el("th", "matrix-th", route));
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Body
    const tbody = el("tbody");
    rows.forEach((r, i) => {
      const tr = el("tr");
      // Dimension column
      const tdDim = el("td", "matrix-td matrix-dim-col");
      const dimTitle = el("div", "matrix-dim-title");
      dimTitle.appendChild(el("span", "claim-index", `M${i + 1}`));
      dimTitle.appendChild(el("strong", "", firstText(r, ["name", "title", "dimension", "label", "id"], `Dimension ${i + 1}`)));
      tdDim.appendChild(dimTitle);
      const desc = firstText(r, ["description", "summary", "rationale"]);
      if (desc) tdDim.appendChild(el("p", "matrix-dim-desc", desc));
      
      const methodTable = renderMethodComparisonCard(r);
      if (methodTable) {
         tdDim.appendChild(methodTable);
      }
      
      tr.appendChild(tdDim);

      // Value columns
      const comps = recordArray(r.comparisons);
      routes.forEach((route) => {
        const td = el("td", "matrix-td");
        const match = comps.find((c) => firstText(c, ["route", "method", "name"]) === route);
        if (match) {
          const val = firstText(match, ["value", "result"], "-");
          td.appendChild(renderParagraphs(val));
          // Apply subtle coloring based on text content as a heuristic
          const lowerVal = val.toLowerCase();
          if (lowerVal.includes("high") || lowerVal.includes("strong") || lowerVal.includes("good") || lowerVal.includes("better")) {
             td.classList.add("highlight-positive");
          } else if (lowerVal.includes("low") || lowerVal.includes("weak") || lowerVal.includes("poor") || lowerVal.includes("worse") || lowerVal.includes("limited") || lowerVal.includes("high cost")) {
             td.classList.add("highlight-negative");
          }
        } else {
          td.appendChild(el("span", "muted", "-"));
        }
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    section.appendChild(tableWrap);
  } else {
    section.appendChild(renderEmptyStructuredState("No comparison matrix"));
  }
  const debates = recordArray(detail.debates);
  if (debates.length) {
    section.appendChild(el("h3", "", "Debates"));
    debates.forEach((debate, index) => {
      const card = el("article", "debate-card");
      card.appendChild(el("span", "claim-index", `D${index + 1}`));
      card.appendChild(el("h3", "", firstText(debate, ["name", "title", "text", "debate", "topic", "id"], `Debate ${index + 1}`)));
      const type = firstText(debate, ["evidence_type", "type"]);
      if (type) card.appendChild(badge(type, "orange"));
      const text = firstText(debate, ["synthesis_judgment", "summary", "description", "tension", "rationale"]);
      if (text) card.appendChild(el("p", "", text));
      if (stringArray(debate.evidence_refs).length) card.appendChild(evidenceRefChips(detail, debate.evidence_refs, "orange"));
      if (stringArray(debate.evidence_map_refs).length) card.appendChild(traceChips(debate.evidence_map_refs));
      section.appendChild(card);
    });
  }
  return section;
}

function renderTopicExternalSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  const external = detail.external_literature_analysis || {};
  section.appendChild(el("h2", "", "External Literature Analysis"));
  const summary = external.summary || external.contribution_to_topic;
  if (summary) {
    const hero = el("div", "overview-summary-hero");
    hero.appendChild(el("h3", "hero-title", "External Context"));
    hero.appendChild(renderParagraphs(summary));
    section.appendChild(hero);
  }
  const verdict = firstText(external, ["coverage_verdict", "coverage_judgment"]);
  const reason = firstText(external, ["coverage_reason", "reason", "limitations"]);
  if (verdict || reason) {
    const verdictCard = el("div", "coverage-verdict-card");
    if (verdict) {
      const line = el("div", "verdict-line");
      line.style.display = "flex";
      line.style.alignItems = "center";
      line.style.gap = "8px";
      line.appendChild(el("strong", "", "Coverage Verdict:"));
      line.appendChild(badge(verdict, toneFor(verdict)));
      verdictCard.appendChild(line);
    }
    if (reason) verdictCard.appendChild(renderParagraphs(reason));
    section.appendChild(verdictCard);
  }
  const themes = recordArray(external.themes);
  if (themes.length) {
    section.appendChild(el("h3", "", "Themes"));
    const grid = el("div", "topic-card-grid");
    themes.forEach((theme) => {
      const card = el("article", "external-theme-card");
      card.appendChild(el("strong", "", firstText(theme, ["title", "theme", "label", "id"], "Theme")));
      const text = firstText(theme, ["analysis", "summary", "description"]);
      if (text) card.appendChild(el("p", "", text));
      grid.appendChild(card);
    });
    section.appendChild(grid);
  }
  const references = recordArray(external.representative_references);
  if (references.length) {
    section.appendChild(el("h3", "", "Representative References"));
    section.appendChild(
      matrixTableView(["Reference", "Context", "Completeness"], references, (row) => {
        const titleStrong = el("strong", "", firstText(row, ["title", "label", "id"], "Reference"));
        const contextSpan = el("span", "muted", firstText(row, ["citation_context", "context", "reason"], "-"));
        const completenessSpan = el("span", "muted", firstText(row, ["information_completeness", "completeness", "status"], "-"));
        return [titleStrong, contextSpan, completenessSpan];
      }),
    );
  }
  if (external.limitations) {
    section.appendChild(renderContentCard("Limitations", renderParagraphs(external.limitations)));
  }
  const additions = recordArray(external.suggested_additions);
  if (additions.length) {
    section.appendChild(el("h3", "", "Suggested Additions"));
    section.appendChild(
      matrixTableView(["Candidate", "Reason", "Priority"], additions, (row) => {
        const titleStrong = el("strong", "", firstText(row, ["title", "label", "id"], "Candidate"));
        const reasonSpan = el("span", "", firstText(row, ["reason", "rationale", "why"], "-"));
        const pText = firstText(row, ["priority", "urgency"], "-");
        const priorityCell = pText.toLowerCase().includes("high")
          ? badge(pText, "warn")
          : el("span", "", pText);
        return [titleStrong, reasonSpan, priorityCell];
      }),
    );
  }
  if (section.childElementCount <= 1) {
    section.appendChild(renderEmptyStructuredState("No external literature data"));
  }
  return section;
}

function renderEvidenceMapSummary(detail: TopicDetailDto) {
  const map = detail.evidence_map || {};
  const card = renderContentCard("Evidence Map", undefined, "content-card evidence-map-summary");
  const rows = el("div", "topic-kv-list");
  [
    ["path", map.path],
    ["hash", map.hash],
    ["candidate ids", stringArray(map.candidate_ids).length || textValue(map.candidate_ids)],
  ].forEach(([key, value]) => {
    if (!textValue(value)) return;
    const row = el("div", "topic-kv-row");
    row.appendChild(el("span", "muted", String(key)));
    row.appendChild(el("strong", "", String(value)));
    rows.appendChild(row);
  });
  if (isRecord(map.candidate_counts)) {
    Object.entries(map.candidate_counts).forEach(([key, value]) => {
      const row = el("div", "topic-kv-row");
      row.appendChild(el("span", "muted", key));
      row.appendChild(el("strong", "", String(value ?? 0)));
      rows.appendChild(row);
    });
  }
  if (rows.childElementCount) card.appendChild(rows);
  else card.appendChild(renderEmptyStructuredState("No evidence map provenance"));
  return card;
}

function renderTopicCoverageSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", "Coverage"));
  if (hasStructuredContent(detail.coverage)) {
    const metric = el("div", "dashboard-metric span-2");
    metric.appendChild(el("div", "metric-label", "Coverage Status"));
    metric.appendChild(renderKeyValueList(detail.coverage || {}));
    const dash = el("div", "overview-dashboard");
    dash.appendChild(metric);
    section.appendChild(dash);
  }
  const gaps = recordArray(detail.gaps);
  if (gaps.length) {
    section.appendChild(el("h3", "", "Identified Gaps"));
    const gList = el("div", "claims-list");
    gaps.forEach((gap, i) => {
      const card = el("article", "claim-row");
      const leftCol = el("div", "claim-content");
      const header = el("div", "claim-header");
      header.appendChild(el("span", "claim-index", `G${i + 1}`));
      const type = firstText(gap, ["gap_type", "type"]);
      if (type) header.appendChild(badge(type, type === "library_coverage_gap" ? "orange" : "warn"));
      leftCol.appendChild(header);
      leftCol.appendChild(el("h3", "", firstText(gap, ["title", "gap", "id"], "Gap")));
      const text = firstText(gap, ["text", "description", "impact", "summary"]);
      if (text) leftCol.appendChild(el("p", "", text));
      card.appendChild(leftCol);
      gList.appendChild(card);
    });
    section.appendChild(gList);
  }
  section.appendChild(renderEvidenceMapSummary(detail));
  if (hasStructuredContent(detail.diagnostics)) {
    section.appendChild(renderContentCard("Diagnostics", renderKeyValueList(isRecord(detail.diagnostics) ? detail.diagnostics : { value: detail.diagnostics })));
  }
  if (hasStructuredContent(detail.source_artifacts)) {
    section.appendChild(renderContentCard("Source Artifacts", renderParagraphs(JSON.stringify(detail.source_artifacts, null, 2))));
  }
  if (section.childElementCount <= 2) {
    section.appendChild(renderEmptyStructuredState("No coverage data"));
  }
  return section;
}

function renderTopicStatisticsSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  section.appendChild(el("h2", "", "Statistics"));
  const stats = (detail.statistics || {}) as Record<string, unknown>;
  if (hasStructuredContent(stats)) {
    const dash = el("div", "overview-dashboard");
    const paperVal = stats.paper_count ?? detail.paper_count;
    const timeSpan = stats.time_span;
    const timeSpanVal = isRecord(timeSpan)
      ? `${timeSpan.earliest || timeSpan.start_year || "?"} - ${timeSpan.latest || timeSpan.end_year || "?"}`
      : textValue(timeSpan);
    [
      ["Papers", paperVal],
      ["Time span", timeSpanVal],
      ["Coverage Verdict", stats.coverage_verdict],
    ].forEach(([label, value]) => {
      if (!textValue(value)) return;
      const metric = el("div", "dashboard-metric");
      metric.appendChild(el("div", "metric-label", String(label)));
      metric.appendChild(el("div", "metric-value", String(value)));
      dash.appendChild(metric);
    });
    if (dash.childElementCount) section.appendChild(dash);

    const dash2 = el("div", "overview-dashboard");
    if (stats.route_coverage) {
      const rcCard = el("div", "dashboard-metric span-2");
      rcCard.appendChild(el("div", "metric-label", "Route Coverage"));
      rcCard.appendChild(
        renderKeyValueList(
          isRecord(stats.route_coverage) ? stats.route_coverage : { value: stats.route_coverage },
        ),
      );
      dash2.appendChild(rcCard);
    }

    const metricCard = el("div", "dashboard-metric span-2");
    metricCard.appendChild(el("div", "metric-label", "Full Statistics"));
    const filteredStats = { ...stats };
    delete filteredStats.route_coverage;
    delete filteredStats.coverage_verdict;
    delete filteredStats.time_span;
    delete filteredStats.paper_count;
    metricCard.appendChild(renderKeyValueList(filteredStats));
    dash2.appendChild(metricCard);

    section.appendChild(dash2);
  }
  if (hasStructuredContent(detail.coverage)) {
    section.appendChild(renderContentCard("Coverage", renderKeyValueList(detail.coverage || {})));
  }
  if (section.childElementCount <= 1) {
    section.appendChild(renderEmptyStructuredState("No statistics data"));
  }
  return section;
}

function renderTopicReportSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section topic-report-section");
  section.appendChild(el("h2", "", "Synthesis Report"));
  const report = detail.synthesis_report || {};
  const title = firstText(report, ["title", "heading"]);
  if (title) section.appendChild(el("h3", "", title));
  const body = firstText(report, ["body", "markdown", "text", "report"]);
  if (body) {
    section.appendChild(renderContentCard("Report Body", renderParagraphs(body), "report-card"));
  }
  const sourceChapters = isRecord(report.source_section_chapters)
    ? report.source_section_chapters
    : {};
  if (hasStructuredContent(sourceChapters)) {
    section.appendChild(renderContentCard("Source Chapters", renderKeyValueList(sourceChapters)));
  }
  if (section.childElementCount <= 1) {
    section.appendChild(renderEmptyStructuredState("No synthesis report"));
  }
  return section;
}

function renderTopicSection(detail: TopicDetailDto) {
  if (state.topicDetailSection === "taxonomy") return renderTopicTaxonomySection(detail);
  if (state.topicDetailSection === "claims") return renderTopicClaimsSection(detail);
  if (state.topicDetailSection === "references") return renderTopicReferencesSection(detail);
  if (state.topicDetailSection === "compare") return renderTopicCompareSection(detail);
  if (state.topicDetailSection === "external") return renderTopicExternalSection(detail);
  if (state.topicDetailSection === "coverage") return renderTopicCoverageSection(detail);
  if (state.topicDetailSection === "statistics") return renderTopicStatisticsSection(detail);
  if (state.topicDetailSection === "report") return renderTopicReportSection(detail);
  return renderTopicOverviewSection(detail);
}

function renderTopicTabs() {
  const tabs = el("nav", "topic-detail-tabs");
  const entries: Array<[TopicDetailSection, string]> = [
    ["overview", "Overview"],
    ["taxonomy", "Taxonomy"],
    ["claims", "Claims"],
    ["references", "References"],
    ["compare", "Compare"],
    ["external", "External"],
    ["coverage", "Coverage"],
    ["statistics", "Stats"],
    ["report", "Report"],
  ];
  entries.forEach(([id, label]) => {
    const button = el("button", state.topicDetailSection === id ? "active" : "", label);
    button.type = "button";
    button.addEventListener("click", () => {
      state.topicDetailSection = id;
      render();
    });
    tabs.appendChild(button);
  });
  return tabs;
}

function selectedEvidence(detail: TopicDetailDto) {
  const rows = evidenceRows(detail);
  if (!state.selectedEvidenceId) {
    return undefined;
  }
  return rows.find((row) => evidenceRefKeys(row).has(state.selectedEvidenceId || ""));
}

function derivedEvidenceLinks(detail: TopicDetailDto, evidence: Record<string, unknown>) {
  const keys = evidenceRefKeys(evidence);
  const matches = {
    claims: [] as string[],
    timeline: [] as string[],
    taxonomy: [] as string[],
  };
  recordArray(detail.claims).forEach((claim, index) => {
    const refs = stringArray(claim.evidence_refs || claim.paper_evidence_refs);
    if (refs.some((ref) => keys.has(ref))) {
      matches.claims.push(firstText(claim, ["id", "label", "text", "claim"], `C${index + 1}`));
    }
  });
  topicTimelineEvents(detail).forEach((event, index) => {
    const eventEvidence = primaryEvidenceForEvent(detail, event);
    if (eventEvidence && evidenceId(eventEvidence) === evidenceId(evidence)) {
      matches.timeline.push(firstText(event, ["id", "label", "title"], `T${index + 1}`));
    }
  });
  recordArray(detail.taxonomy?.nodes).forEach((node, index) => {
    const refs = stringArray(node.evidence_refs || node.paper_unit_refs || node.paper_refs);
    if (refs.some((ref) => keys.has(ref))) {
      matches.taxonomy.push(firstText(node, ["id", "label", "title", "name"], `N${index + 1}`));
    }
  });
  return matches;
}

function renderSelectedEvidenceCard(detail: TopicDetailDto, selected: Record<string, unknown>) {
  const card = el("div", "selected-evidence-card");
  const rows = evidenceRows(detail);
  const index = Math.max(0, rows.findIndex((row) => evidenceId(row) === evidenceId(selected)));
  const chipRow = el("div", "chip-row");
  chipRow.appendChild(badge("selected evidence", "blue"));
  const status = firstText(selected, ["status", "freshness", "source_status"]);
  if (status) chipRow.appendChild(badge(status, toneFor(status)));
  card.appendChild(chipRow);
  card.appendChild(el("span", "evidence-code", evidenceCode(selected, index)));
  card.appendChild(el("h2", "", evidenceTitle(selected, index)));
  const meta = [
    firstText(selected, ["year", "publication_year"]),
    firstText(selected, ["paper_ref", "paperRef", "item_key", "itemKey"]),
  ].filter(Boolean).join(" | ");
  if (meta) card.appendChild(el("p", "muted", meta));
  const summary = firstText(selected, ["summary", "evidence_summary", "topic_relevance", "rationale"]);
  if (summary) card.appendChild(renderParagraphs(summary));
  const links = derivedEvidenceLinks(detail, selected);
  const linkList = el("div", "evidence-stack");
  Object.entries(links).forEach(([kind, refs]) => {
    if (!refs.length) return;
    const row = el("div", "evidence-row");
    row.appendChild(el("strong", "", kind));
    row.appendChild(el("span", "muted", refs.join(", ")));
    linkList.appendChild(row);
  });
  if (linkList.childElementCount) card.appendChild(linkList);
  const open = el("button", "primary", "Open Digest Artifact");
  open.type = "button";
  open.addEventListener("click", () => openDigestModal(selected));
  card.appendChild(open);
  return card;
}

function renderEvidenceExplorer(detail: TopicDetailDto) {
  const explorer = el("aside", "evidence-explorer");
  const header = el("div", "explorer-head");
  header.appendChild(el("h2", "", "Evidence Explorer"));
  const close = el("button", "icon-button evidence-drawer-close", "Close");
  close.type = "button";
  close.title = "Close Evidence Explorer";
  close.addEventListener("click", () => {
    state.evidenceExplorerOpen = false;
    render();
  });
  header.appendChild(close);
  explorer.appendChild(header);
  const rows = evidenceRows(detail);
  if (!rows.length) {
    explorer.appendChild(el("div", "empty", "No paper evidence is linked."));
    return explorer;
  }
  const selected = selectedEvidence(detail);
  if (!selected) {
    const empty = el("div", "explorer-empty");
    empty.appendChild(el("strong", "", "No evidence selected"));
    empty.appendChild(
      el(
        "p",
        "muted",
        "Select evidence from a claim, taxonomy node, comparison row, or timeline marker.",
      ),
    );
    explorer.appendChild(empty);
    return explorer;
  }
  explorer.appendChild(renderSelectedEvidenceCard(detail, selected));
  return explorer;
}

function renderEvidenceDrawer(detail: TopicDetailDto) {
  const drawer = el("div", `evidence-drawer${state.evidenceExplorerOpen ? " open" : ""}`);
  drawer.setAttribute("aria-hidden", state.evidenceExplorerOpen ? "false" : "true");
  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) {
      state.evidenceExplorerOpen = false;
      render();
    }
  });
  const panel = el("div", "evidence-drawer-panel");
  panel.setAttribute("role", "complementary");
  panel.setAttribute("aria-label", "Evidence Explorer");
  panel.appendChild(renderEvidenceExplorer(detail));
  drawer.appendChild(panel);
  return drawer;
}

function numericYear(value: unknown) {
  const text = textValue(value).trim();
  if (!text) return NaN;

  const match4 = text.match(/\b(?:1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  if (match4) return Number(match4[0]);

  const matchCh = text.match(/(\d{2})年/);
  if (matchCh) {
    const year = Number(matchCh[1]);
    return year >= 50 ? 1900 + year : 2000 + year;
  }

  const matchPrefix = text.match(/^(\d{2})[-/]\d{1,2}\b/);
  if (matchPrefix) {
    const year = Number(matchPrefix[1]);
    if (year >= 20 && year <= 35) return 2000 + year;
  }

  const matchQuote = text.match(/['’](\d{2})\b/);
  if (matchQuote) {
    const year = Number(matchQuote[1]);
    return year >= 50 ? 1900 + year : 2000 + year;
  }

  return NaN;
}

type TimelineCluster = {
  key: string;
  label: string;
  left: number;
  items: TimelineItem[];
};

type TimelineItem = {
  key: string;
  kind: "paper" | "event";
  year: number;
  label: string;
  title: string;
  evidence?: Record<string, unknown>;
  event?: Record<string, unknown>;
  weight: number;
  tone: "paper" | "milestone" | "frontier" | "foundation" | "external" | "warning";
};

function timelineLeft(index: number, total: number, year: number, minYear: number, maxYear: number) {
  if (Number.isFinite(year) && Number.isFinite(minYear) && Number.isFinite(maxYear) && maxYear > minYear) {
    return ((year - minYear) / (maxYear - minYear)) * 100;
  }
  return total <= 1 ? 50 : (index / (total - 1)) * 100;
}

function timelineAxisTicks(minYear: number, maxYear: number): { label: string; left: number }[] {
  if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
    return [
      { label: "Start", left: 0 },
      { label: "End", left: 100 },
    ];
  }
  const span = Math.max(1, maxYear - minYear);
  let stepInterval = 1;
  if (span > 15 && span <= 30) stepInterval = 2;
  else if (span > 30 && span <= 75) stepInterval = 5;
  else if (span > 75 && span <= 150) stepInterval = 10;
  else if (span > 150) stepInterval = Math.ceil(span / 10);

  const ticks: { label: string; left: number }[] = [];
  for (let y = minYear; y <= maxYear; y += stepInterval) {
    ticks.push({
      label: String(y),
      left: ((y - minYear) / span) * 100,
    });
  }
  if (ticks.length > 0 && Math.round(ticks[ticks.length - 1].left) !== 100) {
    ticks.push({
      label: String(maxYear),
      left: 100,
    });
  }
  return ticks;
}

function evidenceYear(evidence: Record<string, unknown>) {
  return numericYear(
    evidence.year ||
      evidence.publication_year ||
      evidence.publicationYear ||
      evidence.date ||
      evidence.published_at,
  );
}

function eventYear(event: Record<string, unknown>) {
  return numericYear(event.year || event.date || event.publication_year || event.publicationYear);
}

function timelineItemSortKey(item: TimelineItem) {
  const evidence = item.evidence || {};
  const ref = firstText(evidence, ["paper_ref", "id"]);
  const itemKey = ref.includes(":") ? ref.split(":").pop() : ref;
  return (itemKey || item.key || item.label || item.title || "").toLowerCase();
}

function eventRefsPaper(event: Record<string, unknown>, evidence: Record<string, unknown>) {
  const keys = evidenceRefKeys(evidence);
  const refs = [
    ...stringArray(event.evidence_refs),
    ...stringArray(event.paper_evidence_refs),
    ...stringArray(event.paper_refs),
  ];
  const direct = firstText(event, ["paper_evidence_id", "evidence_id", "paper_ref"]);
  if (direct) refs.push(direct);
  return refs.some((ref) => keys.has(ref));
}

function metricNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function nestedMetric(evidence: Record<string, unknown>, key: string) {
  if (key in evidence) return evidence[key];
  for (const containerKey of ["graph_metrics", "metrics", "citation_graph_metrics"]) {
    const container = recordValue(evidence[containerKey]);
    if (key in container) return container[key];
  }
  return undefined;
}

function timelineWeight(evidence: Record<string, unknown> | undefined, event: Record<string, unknown> | undefined) {
  const explicit = metricNumber(event?.importance || event?.weight || evidence?.importance || evidence?.weight);
  if (Number.isFinite(explicit)) return Math.max(0.85, Math.min(1.35, 0.95 + explicit * 0.2));
  const foundation = metricNumber(nestedMetric(evidence || {}, "foundation_score"));
  const frontier = metricNumber(nestedMetric(evidence || {}, "frontier_score"));
  const score = Math.max(Number.isFinite(foundation) ? foundation : 0, Number.isFinite(frontier) ? frontier : 0);
  return event ? 1.22 : Math.max(0.9, Math.min(1.2, 0.92 + score * 0.22));
}

function timelineTone(evidence: Record<string, unknown> | undefined, event: Record<string, unknown> | undefined): TimelineItem["tone"] {
  const status = `${textValue(event?.status)} ${textValue(evidence?.status)} ${textValue(evidence?.freshness)}`;
  if (status.match(/stale|dirty|missing|incomplete/i)) return "warning";
  const roleHints = [
    ...stringArray(evidence?.synthesis_role_hints),
    ...stringArray(evidence?.role_hints),
    ...stringArray(nestedMetric(evidence || {}, "synthesis_role_hints")),
  ].join(" ");
  if (roleHints.match(/external-heavy|unresolved/i)) return "external";
  if (roleHints.match(/foundation|core/i)) return "foundation";
  if (roleHints.match(/frontier/i)) return "frontier";
  return event ? "milestone" : "paper";
}

function timelineItems(detail: TopicDetailDto) {
  const events = topicTimelineEvents(detail);
  const usedEvents = new Set<Record<string, unknown>>();
  const items: TimelineItem[] = evidenceRows(detail).map((evidence, index) => {
    const matchedEvent = events.find((event) => eventRefsPaper(event, evidence));
    if (matchedEvent) usedEvents.add(matchedEvent);
    const year = eventYear(matchedEvent || {}) || evidenceYear(evidence);
    const title = firstText(matchedEvent || {}, ["event", "title", "label", "summary"]) || evidenceTitle(evidence, index);
    return {
      key: `paper:${evidenceId(evidence) || index}`,
      kind: matchedEvent ? "event" : "paper",
      year,
      label: evidenceCode(evidence, index),
      title,
      evidence,
      event: matchedEvent,
      weight: timelineWeight(evidence, matchedEvent),
      tone: timelineTone(evidence, matchedEvent),
    };
  });
  events.forEach((event, index) => {
    if (usedEvents.has(event)) return;
    const year = eventYear(event);
    items.push({
      key: `event:${firstText(event, ["id", "label", "title"], String(index))}`,
      kind: "event",
      year,
      label: firstText(event, ["code", "short_id"], `E${index + 1}`),
      title: firstText(event, ["event", "title", "label", "summary"], `Event ${index + 1}`),
      event,
      weight: timelineWeight(undefined, event),
      tone: timelineTone(undefined, event),
    });
  });
  return items;
}

function renderTimelineClusters(
  detail: TopicDetailDto,
  items: TimelineItem[],
  minYear: number,
  maxYear: number,
) {
  const byYear = new Map<string, TimelineItem[]>();
  items.forEach((item, index) => {
    const year = item.year;
    const key = Number.isFinite(year) ? String(Math.floor(year)) : `phase-${index + 1}`;
    const list = byYear.get(key) || [];
    list.push(item);
    byYear.set(key, list);
  });
  const clusters: TimelineCluster[] = Array.from(byYear.entries()).map(([key, clusterItems], index, all) => {
    const year = Number(key);
    const title = firstText(clusterItems[0].event || {}, ["phase", "phase_title", "label", "title"]);
    return {
      key,
      label: Number.isFinite(year)
        ? ""
        : title || `Phase ${index + 1}`,
      left: timelineLeft(index, all.length, year, minYear, maxYear),
      items: clusterItems,
    };
  });
  const fragment = document.createDocumentFragment();
  clusters.forEach((cluster, clusterIndex, allClusters) => {
    const year = Number(cluster.key);
    const sortedItems = [...cluster.items].sort((left, right) =>
      timelineItemSortKey(left).localeCompare(timelineItemSortKey(right)),
    );
    sortedItems.forEach((item, itemIndex) => {
      const coordinate = Number.isFinite(year)
        ? year + (itemIndex + 0.5) / sortedItems.length
        : NaN;
      const left = Number.isFinite(coordinate)
        ? timelineLeft(clusterIndex, allClusters.length, coordinate, minYear, maxYear)
        : cluster.left;
      const phase = el("section", "timeline-phase");
      phase.style.left = `${left}%`;
      const title = el("div", "phase-title");
      if (cluster.label) {
        title.appendChild(el("strong", "", cluster.label));
      }
      phase.appendChild(title);
      const markerList = el("div", "marker-list");
      const evidence = item.evidence;
      const markerClasses = ["timeline-marker", `timeline-${item.kind}`, `timeline-tone-${item.tone}`];
      if (sortedItems.length > 4) markerClasses.push("too-dense");
      if (evidence && evidenceId(evidence) === state.selectedEvidenceId) markerClasses.push("selected");
      const marker = el("button", markerClasses.join(" "));
      marker.type = "button";
      marker.style.left = "0";
      marker.style.setProperty("--pin-scale", String(item.weight));
      marker.title = item.title;
      marker.setAttribute("aria-label", marker.title);
      const code = el("span", "timeline-code", item.label);
      marker.appendChild(code);
      const pin = el("span", "timeline-pin");
      pin.appendChild(el("span", "timeline-pin-body"));
      pin.appendChild(el("span", "timeline-pin-dot"));
      marker.appendChild(pin);
      marker.appendChild(el("span", "timeline-event-label", marker.title));
      if (evidence) {
        marker.addEventListener("click", () => {
          openEvidenceExplorer(evidenceId(evidence));
        });
      } else {
        marker.disabled = true;
      }
      markerList.appendChild(marker);
      phase.appendChild(markerList);
      fragment.appendChild(phase);
    });
  });
  return fragment;
}

function renderTopicTimeline(detail: TopicDetailDto) {
  const items = timelineItems(detail);
  items.sort((a, b) => {
    const aFinite = Number.isFinite(a.year);
    const bFinite = Number.isFinite(b.year);
    if (aFinite && bFinite) return a.year - b.year;
    if (aFinite) return -1;
    if (bFinite) return 1;
    return 0;
  });
  const rail = el("section", "topic-timeline");
  const head = el("div", "timeline-head");
  head.appendChild(el("strong", "", "Timeline"));

  // Legend
  const legend = el("div", "timeline-legend");
  
  const legEvent = el("div", "legend-item");
  const dotEvent = el("span", "legend-icon legend-icon-event");
  legEvent.appendChild(dotEvent);
  legEvent.appendChild(el("span", "legend-label", "Key Milestones"));
  legend.appendChild(legEvent);
  
  const legPaper = el("div", "legend-item");
  const dotPaper = el("span", "legend-icon legend-icon-paper");
  legPaper.appendChild(dotPaper);
  legPaper.appendChild(el("span", "legend-label", "Literature Papers"));
  legend.appendChild(legPaper);
  
  head.appendChild(legend);
  rail.appendChild(head);

  const summaryText = firstText(topicTimelineSummary(detail), ["text", "analysis", "overview"]);
  if (summaryText) {
    const summBlock = el("div", "timeline-summary");
    summBlock.appendChild(renderParagraphs(summaryText));
    rail.appendChild(summBlock);
  }

  const scroll = el("div", "timeline-scroll");
  const timeline = el("div", "horizontal-timeline");
  const trackInner = el("div", "timeline-inner-rail");

  const years = items
    .map((item) => item.year)
    .filter(Number.isFinite);
  const minYear = years.length ? Math.min(...years) : NaN;
  const maxYear = years.length ? Math.max(...years) + 1 : NaN;
  const axis = el("div", "time-axis");
  const ticks = timelineAxisTicks(minYear, maxYear);
  ticks.forEach((tick) => {
    const stepEl = el("span", "", tick.label);
    stepEl.style.position = "absolute";
    stepEl.style.left = `${tick.left}%`;
    stepEl.style.transform = "translateX(-50%)";
    axis.appendChild(stepEl);
  });
  trackInner.appendChild(axis);
  trackInner.appendChild(renderTimelineClusters(detail, items, minYear, maxYear));
  timeline.appendChild(trackInner);
  scroll.appendChild(timeline);
  rail.appendChild(scroll);
  return rail;
}

function renderTopicDetailToolbar(detail: TopicDetailDto, snapshot: Snapshot) {
  const topicId = detail.topicId || snapshot.reader?.topicId || "";
  const actions = el("div", "toolbar");
  actions.appendChild(badge(detail.language || "auto", "blue"));
  actions.appendChild(badge(`${numberValue(detail.paper_count)} papers`));
  actions.appendChild(badge(`${numberValue(detail.external_literature_count)} external refs`, "purple"));
  actions.appendChild(makeButton("Back to Topics", "selectTab", { tab: "artifacts" }));
  actions.appendChild(
    makeButton("Update", "hostCommand", {
      command: "submitTopicSynthesisUpdate",
      args: { topicId },
    }),
  );
  const copySummary = el("button", "", "Copy Summary");
  copySummary.type = "button";
  copySummary.addEventListener("click", () => {
    const summary = textValue(detail.summary?.brief || detail.summary?.summary || detail.title);
    void navigator.clipboard?.writeText(summary);
  });
  actions.appendChild(copySummary);
  actions.appendChild(
    makeButton("Markdown export", "hostCommand", {
      command: "openCanonicalMarkdown",
      args: { topicId },
    }),
  );
  actions.appendChild(
    makeButton("Open folder", "hostCommand", {
      command: "openSynthesisFolder",
      args: { topicId },
    }),
  );
  return actions;
}

function renderTopicDetail(main: HTMLElement, snapshot: Snapshot) {
  renderTopicDetailShell(main, snapshot);
}

function renderTopicDetailShell(root: HTMLElement, snapshot: Snapshot) {
  const detail = state.topicDetail;
  const app = el("div", "topic-detail-shell detail-shell-in-workbench");
  if (!detail) {
    app.appendChild(el("div", "empty", "No structured topic selected."));
    root.appendChild(app);
    return;
  }
  const body = el("section", "topic-detail");
  const workbench = el("div", "topic-detail-layout");
  workbench.appendChild(renderTopicTabs());
  const reader = el("main", "topic-reading-surface");
  reader.appendChild(renderTopicSection(detail));
  workbench.appendChild(reader);
  body.appendChild(workbench);
  body.appendChild(renderEvidenceDrawer(detail));
  body.appendChild(renderTopicTimeline(detail));
  app.appendChild(body);
  root.appendChild(app);
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
  const copy = el("button", "", "Copy Markdown");
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
  const filters = el("div", "filters");
  const search = el("input");
  search.placeholder = "Search";
  search.value = snapshot.registry.filters.search || "";
  search.addEventListener("input", () =>
    sendAction("setFilters", { registry: { search: search.value } }),
  );
  filters.appendChild(search);
  panel.appendChild(renderPanelToolbar(filters));
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

  const detail = el("aside", "panel details graph-control-drawer");
  detail.tabIndex = 0;
  detail.setAttribute("aria-label", "Graph controls");
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

function matrixTableView(
  headers: string[],
  rows: Array<Record<string, unknown>>,
  mapRow: (row: Record<string, unknown>) => Array<Node | unknown>,
) {
  if (!rows.length) {
    return el("div", "empty", "No rows.");
  }
  const wrap = el("div", "matrix-table-wrap");
  const table = el("table", "matrix-table");
  const thead = el("thead");
  const tr = el("tr");
  headers.forEach((header) => tr.appendChild(el("th", "matrix-th", header)));
  thead.appendChild(tr);
  table.appendChild(thead);
  const tbody = el("tbody");
  rows.forEach((row) => {
    const rowNode = el("tr");
    mapRow(row).forEach((cell) => {
      const td = el("td", "matrix-td");
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
  renderDigestModal(root as HTMLElement);
}

function buildDigestOutline(markdownNode: HTMLElement) {
  const headings = Array.from(
    markdownNode.querySelectorAll("h1, h2, h3, h4"),
  ) as HTMLElement[];
  if (!headings.length) {
    return undefined;
  }
  const outline = el("nav", "digest-outline");
  outline.setAttribute("aria-label", "Digest outline");
  outline.appendChild(el("strong", "", "Outline"));
  headings.forEach((heading, index) => {
    const id = `digest-heading-${index + 1}`;
    heading.id = id;
    const level = Number(heading.tagName.replace(/\D/g, "")) || 2;
    const link = el("a", `digest-outline-link depth-${Math.max(1, Math.min(4, level))}`, heading.textContent || `Section ${index + 1}`);
    link.href = `#${id}`;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      heading.scrollIntoView({ block: "start" });
    });
    outline.appendChild(link);
  });
  return outline;
}

function renderDigestModal(root: HTMLElement) {
  if (!state.digestModal) {
    return;
  }
  const overlay = el("div", "paper-digest-modal");
  const dialog = el("section", "paper-digest-dialog");
  const header = el("div", "paper-digest-header");
  const evidence = state.digestModal.evidence || {};
  header.appendChild(
    el(
      "strong",
      "",
      firstText(evidence, ["title", "paper_title", "label"], "Paper digest"),
    ),
  );
  const close = el("button", "", "Close");
  close.type = "button";
  close.addEventListener("click", () => {
    state.digestModal = undefined;
    render();
  });
  header.appendChild(close);
  dialog.appendChild(header);
  if (state.digestModal.status === "loading") {
    dialog.appendChild(el("div", "empty", "Loading digest artifact..."));
  } else {
    const result = state.digestModal.result || {};
    const content = el("div", "paper-digest-content");
    if (result.source_changed) {
      content.appendChild(
        el(
          "div",
          "digest-warning",
          "Digest source changed since this topic was synthesized.",
        ),
      );
    }
    const markdown = textValue(result.digest_markdown);
    if (markdown) {
      const digestBody = el("div", "paper-digest-body");
      const markdownNode = renderMarkdown(markdown);
      const outline = markdownNode instanceof HTMLElement ? buildDigestOutline(markdownNode) : undefined;
      if (outline) {
        digestBody.appendChild(outline);
      } else {
        digestBody.classList.add("no-outline");
      }
      const scrollBody = el("div", "digest-scroll-body");
      scrollBody.appendChild(markdownNode);
      digestBody.appendChild(scrollBody);
      content.appendChild(digestBody);
    } else {
      content.appendChild(
        el("div", "empty", textValue(result.status) || "Digest is unavailable."),
      );
    }
    dialog.appendChild(content);
  }
  overlay.appendChild(dialog);
  root.appendChild(overlay);
}

window.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key !== "Escape") {
    return;
  }
  if (state.digestModal) {
    state.digestModal = undefined;
    render();
    return;
  }
  if (state.evidenceExplorerOpen) {
    state.evidenceExplorerOpen = false;
    render();
  }
});

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
    state.topicDetail = undefined;
    state.digestModal = undefined;
    state.evidenceExplorerOpen = false;
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
  if (data.type === "synthesis:topic-detail") {
    state.topicDetail = data.payload || undefined;
    state.artifactReader = undefined;
    state.digestModal = undefined;
    state.evidenceExplorerOpen = false;
    if (state.snapshot) {
      state.snapshot = {
        ...state.snapshot,
        selectedTab: "reader",
        reader: {
          topicId: state.topicDetail?.topicId || "",
          previousTab: state.snapshot.reader?.previousTab || "artifacts",
        },
      };
    }
    render();
  }
  if (data.type === "synthesis:digest") {
    state.digestModal = {
      status: data.payload?.ok ? "available" : "unavailable",
      evidence: state.digestModal?.evidence,
      result: data.payload || {},
    };
    render();
  }
});

sendAction("ready");
render();
