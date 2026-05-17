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
  | "claims"
  | "external_literature"
  | "coverage_gaps";

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
  claims?: unknown[];
  timeline_events?: unknown[];
  paper_evidence?: unknown[];
  external_literature_analysis?: Record<string, unknown>;
  coverage?: Record<string, unknown>;
  gaps?: unknown[];
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
  digestModal?: DigestModalState;
  sigma?: Sigma;
  sigmaResizeObserver?: ResizeObserver;
  graph?: Graph;
  hoveredNode?: string;
} = {
  snapshot: null,
  topicDetailSection: "overview",
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

function recordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => textValue(entry)).filter(Boolean)
    : [];
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

function renderKeyValueList(value: Record<string, unknown>) {
  const list = el("div", "topic-kv-list");
  Object.entries(value).forEach(([key, raw]) => {
    const row = el("div", "topic-kv-row");
    row.appendChild(el("span", "muted", key));
    const rendered =
      typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean"
        ? String(raw)
        : JSON.stringify(raw);
    row.appendChild(el("strong", "", rendered || "-"));
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

function evidenceForRef(detail: TopicDetailDto, ref: unknown) {
  const id = textValue(ref);
  if (!id) {
    return undefined;
  }
  return evidenceRows(detail).find((row) => evidenceId(row) === id);
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

function renderTopicSection(detail: TopicDetailDto) {
  const section = el("div", "topic-section");
  if (state.topicDetailSection === "overview") {
    section.appendChild(el("h2", "", "Overview"));
    section.appendChild(renderParagraphs(detail.summary?.brief || detail.summary?.summary));
    const takeaways = stringArray(detail.summary?.key_takeaways || detail.summary?.takeaways);
    if (takeaways.length) {
      const list = el("ul", "topic-bullet-list");
      takeaways.forEach((entry) => list.appendChild(el("li", "", entry)));
      section.appendChild(list);
    }
    const topic = detail.topic || {};
    const description = firstText(topic, ["description", "scope", "definition"]);
    if (description) {
      section.appendChild(el("h3", "", "Scope"));
      section.appendChild(renderParagraphs(description));
    }
    return section;
  }
  if (state.topicDetailSection === "claims") {
    section.appendChild(el("h2", "", "Claims"));
    recordArray(detail.claims).forEach((claim, index) => {
      const card = el("article", "claim-card");
      card.appendChild(el("span", "claim-index", `C${index + 1}`));
      card.appendChild(el("h3", "", firstText(claim, ["text", "claim", "title", "id"], `Claim ${index + 1}`)));
      const rationale = firstText(claim, ["rationale", "support", "summary"]);
      if (rationale) {
        card.appendChild(el("p", "", rationale));
      }
      const refs = stringArray(claim.evidence_refs);
      if (refs.length) {
        const chips = el("div", "evidence-chips");
        refs.forEach((ref) => chips.appendChild(badge(ref, "ok")));
        card.appendChild(chips);
      }
      section.appendChild(card);
    });
    return section;
  }
  if (state.topicDetailSection === "external_literature") {
    const external = detail.external_literature_analysis || {};
    section.appendChild(el("h2", "", "External Literature Analysis"));
    section.appendChild(renderParagraphs(external.summary || external.contribution_to_topic));
    const themes = recordArray(external.themes);
    if (themes.length) {
      section.appendChild(el("h3", "", "Themes"));
      themes.forEach((theme) => {
        const card = el("article", "external-theme");
        card.appendChild(el("strong", "", firstText(theme, ["title", "theme", "id"], "Theme")));
        const text = firstText(theme, ["analysis", "summary", "description"]);
        if (text) {
          card.appendChild(el("p", "", text));
        }
        section.appendChild(card);
      });
    }
    const references = recordArray(external.representative_references);
    if (references.length) {
      section.appendChild(el("h3", "", "Representative references"));
      section.appendChild(
        tableView(["Reference", "Context", "Completeness"], references, (row) => [
          firstText(row, ["title", "label", "id"], "Reference"),
          firstText(row, ["citation_context", "context", "reason"], "-"),
          firstText(row, ["information_completeness", "completeness", "status"], "-"),
        ]),
      );
    }
    const limitations = external.limitations;
    if (limitations) {
      section.appendChild(el("h3", "", "Limitations"));
      section.appendChild(renderParagraphs(limitations));
    }
    return section;
  }
  section.appendChild(el("h2", "", "Coverage & Gaps"));
  if (detail.coverage && Object.keys(detail.coverage).length) {
    section.appendChild(renderKeyValueList(detail.coverage));
  }
  const gaps = recordArray(detail.gaps);
  if (gaps.length) {
    section.appendChild(el("h3", "", "Gaps"));
    gaps.forEach((gap) => {
      const card = el("article", "gap-card");
      card.appendChild(el("strong", "", firstText(gap, ["title", "gap", "id"], "Gap")));
      const text = firstText(gap, ["description", "impact", "summary"]);
      if (text) {
        card.appendChild(el("p", "", text));
      }
      section.appendChild(card);
    });
  }
  return section;
}

function renderTopicTabs() {
  const tabs = el("nav", "topic-detail-tabs");
  const entries: Array<[TopicDetailSection, string]> = [
    ["overview", "Overview"],
    ["claims", "Claims"],
    ["external_literature", "External"],
    ["coverage_gaps", "Coverage"],
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

function renderEvidenceExplorer(detail: TopicDetailDto) {
  const explorer = el("aside", "evidence-explorer");
  explorer.appendChild(el("h2", "", "Evidence Explorer"));
  const rows = evidenceRows(detail);
  if (!rows.length) {
    explorer.appendChild(el("div", "empty", "No paper evidence is linked."));
    return explorer;
  }
  rows.forEach((evidence, index) => {
    const item = el(
      "button",
      state.selectedEvidenceId === evidenceId(evidence)
        ? "evidence-item selected"
        : "evidence-item",
    );
    item.type = "button";
    item.appendChild(el("span", "evidence-code", evidenceCode(evidence, index)));
    const body = el("span", "evidence-body");
    body.appendChild(el("strong", "", evidenceTitle(evidence, index)));
    body.appendChild(
      el(
        "span",
        "muted",
        [
          firstText(evidence, ["year", "publication_year"]),
          firstText(evidence, ["paper_ref", "item_key"]),
        ].filter(Boolean).join(" | "),
      ),
    );
    item.appendChild(body);
    item.addEventListener("click", () => openDigestModal(evidence));
    explorer.appendChild(item);
  });
  return explorer;
}

function numericYear(value: unknown) {
  const text = textValue(value);
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : NaN;
}

function timelinePosition(args: {
  index: number;
  total: number;
  year: number;
  minYear: number;
  maxYear: number;
}) {
  if (
    Number.isFinite(args.year) &&
    Number.isFinite(args.minYear) &&
    Number.isFinite(args.maxYear) &&
    args.maxYear > args.minYear
  ) {
    return 4 + ((args.year - args.minYear) / (args.maxYear - args.minYear)) * 92;
  }
  return args.total <= 1 ? 50 : 4 + (args.index / (args.total - 1)) * 92;
}

function renderTopicTimeline(detail: TopicDetailDto) {
  const events = recordArray(detail.timeline_events);
  const rail = el("section", "topic-timeline");
  const head = el("div", "timeline-head");
  head.appendChild(el("strong", "", "Timeline"));
  head.appendChild(el("span", "muted", "Library-paper evidence markers"));
  rail.appendChild(head);
  const scroll = el("div", "timeline-scroll");
  const track = el("div", "timeline-track");
  const years = events
    .map((event) => numericYear(event.year || event.date || event.publication_year))
    .filter(Number.isFinite);
  const minYear = years.length ? Math.min(...years) : NaN;
  const maxYear = years.length ? Math.max(...years) : NaN;
  events.forEach((event, index) => {
    const evidence = primaryEvidenceForEvent(detail, event);
    const year = numericYear(event.year || event.date || event.publication_year);
    const left = timelinePosition({
      index,
      total: events.length,
      year,
      minYear,
      maxYear,
    });
    const marker = el("button", "timeline-marker");
    marker.type = "button";
    marker.style.left = `${left}%`;
    marker.title = firstText(event, ["title", "label", "summary"], `Event ${index + 1}`);
    const code = el("span", "timeline-code", evidence ? evidenceCode(evidence, index) : `E${index + 1}`);
    marker.appendChild(code);
    const pin = el("span", "timeline-pin");
    pin.appendChild(el("span", "timeline-pin-body"));
    pin.appendChild(el("span", "timeline-pin-dot"));
    marker.appendChild(pin);
    marker.appendChild(el("span", "timeline-event-label", marker.title));
    if (evidence) {
      marker.addEventListener("click", () => openDigestModal(evidence));
    } else {
      marker.disabled = true;
    }
    track.appendChild(marker);
  });
  if (Number.isFinite(minYear) && Number.isFinite(maxYear)) {
    const start = el("span", "timeline-year start", String(minYear));
    const end = el("span", "timeline-year end", String(maxYear));
    track.appendChild(start);
    track.appendChild(end);
  }
  scroll.appendChild(track);
  rail.appendChild(scroll);
  return rail;
}

function renderTopicDetail(main: HTMLElement, snapshot: Snapshot) {
  const detail = state.topicDetail;
  const topicId = detail?.topicId || snapshot.reader?.topicId || "";
  const panel = el("div", "reader-panel topic-detail-panel immersive-reader");
  const header = el("div", "reader-header topic-detail-header");
  const titleGroup = el("div", "reader-title");
  titleGroup.appendChild(el("strong", "", detail?.title || topicId || "Topic Detail"));
  const meta = [
    detail?.updated_at ? `Updated ${detail.updated_at}` : "",
    detail?.paper_count ? `${detail.paper_count} papers` : "",
    detail?.external_literature_count
      ? `${detail.external_literature_count} external refs`
      : "",
    detail?.artifact_hash ? `Artifact ${detail.artifact_hash}` : "",
  ].filter(Boolean).join(" | ");
  if (meta) {
    titleGroup.appendChild(el("span", "muted", meta));
  }
  header.appendChild(titleGroup);
  const actions = el("div", "toolbar");
  actions.appendChild(makeButton("Back to Topics", "closeArtifactReader"));
  actions.appendChild(
    makeButton("Markdown export", "hostCommand", {
      command: "openCanonicalMarkdown",
      args: { topicId },
    }),
  );
  const copy = el("button", "", "Copy Markdown");
  copy.type = "button";
  copy.addEventListener("click", () => {
    const markdown = detail?.markdown_export || "";
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(markdown);
    } else {
      sendAction("hostCommand", {
        command: "copyTopicMarkdownExport",
        args: { topicId },
      });
    }
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
  if (!detail) {
    panel.appendChild(el("div", "empty", "No structured topic selected."));
    main.appendChild(panel);
    return;
  }
  const shell = el("div", "topic-detail");
  const workbench = el("div", "topic-detail-workbench");
  workbench.appendChild(renderTopicTabs());
  const reader = el("main", "topic-reading-surface");
  reader.appendChild(renderTopicSection(detail));
  workbench.appendChild(reader);
  workbench.appendChild(renderEvidenceExplorer(detail));
  shell.appendChild(workbench);
  shell.appendChild(renderTopicTimeline(detail));
  panel.appendChild(shell);
  main.appendChild(panel);
}

function renderArtifactReader(main: HTMLElement, snapshot: Snapshot) {
  if (state.topicDetail) {
    renderTopicDetail(main, snapshot);
    return;
  }
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
  renderDigestModal(root as HTMLElement);
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
    if (result.source_changed) {
      dialog.appendChild(
        el(
          "div",
          "digest-warning",
          "Digest source changed since this topic was synthesized.",
        ),
      );
    }
    const markdown = textValue(result.digest_markdown);
    if (markdown) {
      dialog.appendChild(renderMarkdown(markdown));
    } else {
      dialog.appendChild(
        el("div", "empty", textValue(result.status) || "Digest is unavailable."),
      );
    }
  }
  overlay.appendChild(dialog);
  root.appendChild(overlay);
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
    state.topicDetail = undefined;
    state.digestModal = undefined;
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
