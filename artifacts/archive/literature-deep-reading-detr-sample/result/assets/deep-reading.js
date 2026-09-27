const data = JSON.parse(document.getElementById("data").textContent);
const body = document.body;
const conceptRail = document.querySelector("[data-concept-rail]");
const toc = document.querySelector("[data-toc]");
const preface = document.querySelector("[data-preface]");
const paper = document.querySelector("[data-paper]");
const translationPaper = document.querySelector("[data-translation-paper]");
const summary = document.querySelector("[data-summary]");
const postReading = document.querySelector("[data-post-reading]");
const side = document.querySelector("[data-side]");
const graphSection = document.querySelector("[data-citation-graph]");
const extensions = document.querySelector("[data-extensions]");
const paperScroll = document.querySelector("[data-paper-scroll]");
const graphState = { search: "", showLibrary: true, showExternal: true, showLowSignal: false, hoveredId: "", hoverLabelId: "", selected: null };
let graphHoverClearTimer = 0;
const GRAPH_LIBRARY_BASE_NODE_SIZE = 4.6;
const GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE = 3;
const GRAPH_SINGLE_EXTERNAL_BASE_NODE_SIZE = 2;
const GRAPH_LIBRARY_NODE_SIZE_CAP = 8;
const GRAPH_EXTERNAL_NODE_SIZE_CAP = 4.8;
const GRAPH_IMPORTANCE_HALO_TOP_RATIO = 0.1;
const GRAPH_IMPORTANCE_HALO_MAX = 8;
const GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT = "rgba(37, 99, 235, 0.52)";
const GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT = "rgba(37, 99, 235, 0.22)";
const GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT = "rgba(180, 83, 9, 0.56)";
const GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT_SOFT = "rgba(180, 83, 9, 0.22)";
const CITATION_GRAPH_INCOMING_EDGE_COLOR = "#d97706";
const CITATION_GRAPH_OUTGOING_EDGE_COLOR = "#7c3aed";
const CITATION_GRAPH_START_NODE_COLOR = "#dc2626";
const GRAPH_NODE_COLORS = {
  library_paper: "#1967b3",
  external_reference: "#7a861f"
};
let conceptOverlayEnabled = data.concepts?.enabled !== false;
let conceptBubbleTimer = 0;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function escapeRegex(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function setMode(mode) {
  body.classList.remove("mode-original", "mode-translated", "mode-compare", "mode-focus");
  body.classList.add(`mode-${mode}`);
  document.querySelectorAll("[data-mode]").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
}
function sectionByAnchor(anchor) {
  return (data.sections || []).find(section => section.anchor === anchor) || null;
}
function extensionByAnchor(anchor) {
  return (data.extensions || []).find(extension => extension.anchor === anchor) || null;
}
function navReadingAid(item) {
  if (item.kind === "preface") return data.preface?.reading_aid || {};
  if (item.kind === "summary") return data.summary?.reading_aid || {};
  if (item.kind === "extension") return extensionByAnchor(item.anchor)?.reading_aid || {};
  if (item.kind === "citation_graph") return data.extensions?.find(ext => ext.id === "extension-graph")?.reading_aid || {};
  return sectionByAnchor(item.anchor)?.reading_aid || {};
}
function conceptForTerm(term) {
  const normalized = String(term || "").trim().toLowerCase();
  if (!normalized) return null;
  return (data.concepts?.concepts || []).find(concept => {
    const labels = [concept.label, ...(concept.aliases || [])].map(value => String(value || "").trim().toLowerCase()).filter(Boolean);
    return labels.some(label => label === normalized || normalized.includes(label) || label.includes(normalized));
  }) || null;
}
function conceptChipHtml(term) {
  const concept = conceptForTerm(term);
  if (!concept) return `<span class="chip side-concept-chip">${esc(term)}</span>`;
  return `<button type="button" class="chip side-concept-chip has-concept" data-side-concept-id="${esc(concept.id)}">${esc(term)}</button>`;
}
function bindSideConceptChips() {
  side.querySelectorAll("[data-side-concept-id]").forEach(button => {
    const concept = (data.concepts?.concepts || []).find(item => item.id === button.getAttribute("data-side-concept-id"));
    if (!concept) return;
    const open = () => showConceptBubble(button, concept);
    button.addEventListener("mouseenter", open);
    button.addEventListener("focus", open);
    button.addEventListener("mouseleave", scheduleConceptBubbleClose);
    button.addEventListener("blur", scheduleConceptBubbleClose);
    button.addEventListener("click", () => {
      const mention = paper.querySelector(`[data-concept-id="${CSS.escape(concept.id)}"]`);
      if (mention) mention.scrollIntoView({ block: "center" });
      showConceptBubble(button, concept);
    });
  });
}
function renderInsight(insight) {
  if (!insight) return "";
  const citationRefs = (insight.citation_references || []).filter(ref => ref.title || ref.summary);
  const citationHtml = insight.citation_note || citationRefs.length ? `
    <section>
      <h2>引用线索</h2>
      ${insight.citation_note ? `<p>${esc(insight.citation_note)}</p>` : ""}
      ${citationRefs.slice(0, 4).map(ref => `
        <details>
          <summary>${esc(ref.ref)} ${esc(ref.title || "引用文献")}</summary>
          ${ref.keywords ? `<p>${esc(ref.keywords)}</p>` : ""}
          ${ref.summary ? `<p>${esc(ref.summary)}</p>` : ""}
        </details>
      `).join("")}
    </section>
  ` : "";
  const qaHtml = (insight.questions || []).length ? `
    <section>
      <h2>可能的问题</h2>
      ${insight.questions.map(item => `
        <div class="qa-item" id="${esc(item.id)}">
          <h3>${esc(item.question)}</h3>
          <p>${esc(item.answer)}</p>
        </div>
      `).join("")}
    </section>
  ` : "";
  return qaHtml + citationHtml;
}
function renderSide(item) {
  const aid = navReadingAid(item);
  const extra = aid.extra ? JSON.stringify(aid.extra, null, 2) : "";
  const insight = data.section_insights?.by_anchor?.[item.anchor];
  side.innerHTML = `
    <section><h2>当前位置</h2><p>${esc(item.title)}</p></section>
    <section><h2>阅读目标</h2><p>${esc(aid.goal || "")}</p></section>
    <section><h2>相关概念</h2><div class="chips">${(aid.terms || []).map(t => conceptChipHtml(t)).join("")}</div></section>
    <section><h2>误读提醒</h2><p>${esc(aid.pitfall || "")}</p></section>
    ${renderInsight(insight)}
    ${extra ? `<section><h2>拓展上下文</h2><div class="extra">${esc(extra)}</div></section>` : ""}
  `;
  bindSideConceptChips();
}
function renderExtensions() {
  extensions.innerHTML = data.extensions.map(ext => `
    <article class="extension" id="${esc(ext.anchor)}">
      <h2>${esc(ext.title)}</h2>
      <p>${esc(ext.translation)}</p>
    </article>
  `).join("");
}
function conceptLabel(concept) {
  return concept?.label || concept?.aliases?.[0] || concept?.id || "Concept";
}
function renderConceptRail() {
  const concepts = data.concepts?.concepts || [];
  if (!conceptRail || !concepts.length) {
    if (conceptRail) conceptRail.style.display = "none";
    return;
  }
  conceptRail.classList.toggle("is-open", conceptOverlayEnabled && conceptRail.classList.contains("is-open"));
  conceptRail.innerHTML = `
    <div class="concept-rail-header">
      <strong>Concepts</strong>
      <button type="button" class="concept-toggle ${conceptOverlayEnabled ? "" : "is-off"}" data-concept-toggle>${conceptRail.classList.contains("is-open") ? "收起" : "展开"}</button>
    </div>
    <div class="concept-list">
      ${concepts.map(concept => `
        <button type="button" class="concept-chip" data-concept-chip="${esc(concept.id)}">
          <strong>${esc(conceptLabel(concept))}</strong>
          <span>${esc(concept.kind || concept.status || "concept")}</span>
        </button>
      `).join("")}
    </div>
  `;
  conceptRail.querySelector("[data-concept-toggle]")?.addEventListener("click", () => {
    conceptOverlayEnabled = true;
    conceptRail.classList.toggle("is-open");
    renderConceptRail();
    rerenderPaper();
  });
  conceptRail.querySelectorAll("[data-concept-chip]").forEach(button => {
    const concept = concepts.find(item => item.id === button.getAttribute("data-concept-chip"));
    if (!concept) return;
    const open = () => showConceptBubble(button, concept);
    button.addEventListener("mouseenter", open);
    button.addEventListener("focus", open);
    button.addEventListener("mouseleave", scheduleConceptBubbleClose);
    button.addEventListener("blur", scheduleConceptBubbleClose);
    button.addEventListener("click", () => {
      const mention = paper.querySelector(`[data-concept-id="${CSS.escape(concept.id)}"]`);
      if (mention) mention.scrollIntoView({ block: "center" });
      showConceptBubble(button, concept);
    });
  });
}
function closeConceptBubble() {
  if (conceptBubbleTimer) window.clearTimeout(conceptBubbleTimer);
  conceptBubbleTimer = 0;
  document.querySelectorAll(".concept-bubble").forEach(node => node.remove());
}
function scheduleConceptBubbleClose() {
  if (conceptBubbleTimer) window.clearTimeout(conceptBubbleTimer);
  conceptBubbleTimer = window.setTimeout(closeConceptBubble, 120);
}
function showConceptBubble(anchor, concept) {
  closeConceptBubble();
  const bubble = document.createElement("div");
  bubble.className = "concept-bubble";
  bubble.setAttribute("role", "dialog");
  const aliases = (concept.aliases || []).filter(alias => alias && alias !== concept.label).slice(0, 3);
  bubble.innerHTML = `
    <strong>${esc(conceptLabel(concept))}</strong>
    <div class="concept-bubble-meta">
      ${concept.kind ? `<span class="chip">${esc(concept.kind)}</span>` : ""}
      ${concept.status ? `<span class="chip">${esc(concept.status)}</span>` : ""}
      ${aliases.map(alias => `<span class="chip">${esc(alias)}</span>`).join("")}
    </div>
    <p>${esc(concept.definition || concept.description || "当前概念只有标签，暂无定义。")}</p>
  `;
  bubble.addEventListener("mouseenter", () => {
    if (conceptBubbleTimer) window.clearTimeout(conceptBubbleTimer);
  });
  bubble.addEventListener("mouseleave", scheduleConceptBubbleClose);
  document.body.appendChild(bubble);
  const rect = anchor.getBoundingClientRect();
  bubble.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 312))}px`;
  bubble.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - bubble.offsetHeight - 12)}px`;
}
function applyConceptOverlay(root) {
  if (!conceptOverlayEnabled) return;
  const concepts = data.concepts?.concepts || [];
  const aliasRows = [];
  concepts.forEach(concept => {
    (concept.aliases || [concept.label]).forEach(alias => {
      const clean = String(alias || "").trim();
      if (clean.length >= 3) aliasRows.push({ alias: clean, concept });
    });
  });
  aliasRows.sort((left, right) => right.alias.length - left.alias.length);
  if (!aliasRows.length) return;
  const pattern = new RegExp(`\\b(${aliasRows.map(row => escapeRegex(row.alias)).join("|")})\\b`, "gi");
  const byAlias = new Map(aliasRows.map(row => [row.alias.toLowerCase(), row.concept]));
  const skipSelector = "a, pre, code, script, style, table, .katex, .math, .structured-references, .concept-mention, .concept-bubble, .citation-graph-section";
  const linked = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest(skipSelector)) continue;
    if (node.nodeValue && pattern.test(node.nodeValue)) textNodes.push(node);
    pattern.lastIndex = 0;
  }
  textNodes.forEach(textNode => {
    const text = textNode.nodeValue || "";
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    text.replace(pattern, (match, _alias, offset) => {
      const concept = byAlias.get(match.toLowerCase());
      if (!concept || linked.has(concept.id)) return match;
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
      const span = document.createElement("span");
      span.className = "concept-mention";
      span.tabIndex = 0;
      span.dataset.conceptId = concept.id;
      span.textContent = match;
      const open = () => showConceptBubble(span, concept);
      span.addEventListener("mouseenter", open);
      span.addEventListener("focus", open);
      span.addEventListener("mouseleave", scheduleConceptBubbleClose);
      span.addEventListener("blur", scheduleConceptBubbleClose);
      fragment.appendChild(span);
      linked.add(concept.id);
      lastIndex = offset + match.length;
      return match;
    });
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.parentNode?.replaceChild(fragment, textNode);
  });
}
function paragraphsHtml(text) {
  return String(text || "")
    .split(/\n\s*\n/g)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => `<p>${esc(part)}</p>`)
    .join("");
}
function blockSourceHtml(block) {
  const html = marked.parse(block.source_markdown || "");
  if (block.kind !== "heading") return html;
  return html.replace(/<(h[1-6])([^>]*)>/i, `<$1$2 id="${esc(block.section_anchor || block.id)}">`);
}
function blockTranslationHtml(block) {
  const tag = block.kind === "heading" ? (String(block.source_markdown || "").startsWith("# ") ? "h1" : "h2") : "";
  if (tag) return `<${tag} id="zh-${esc(block.section_anchor || block.id)}">${esc(block.translation || "")}</${tag}>`;
  if (block.kind === "formula" || block.kind === "table" || block.kind === "image") return marked.parse(block.translation || "");
  return paragraphsHtml(block.translation || "");
}
function renderPreface() {
  if (!preface || !data.preface) return;
  const cards = data.preface.cards || [];
  preface.id = data.preface.anchor || "preface";
  preface.innerHTML = `
    <h1>${esc(data.preface.title || "Preface")}</h1>
    <p class="kicker">${esc(data.preface.subtitle || "")}</p>
    <div class="preface-grid">
      ${cards.map(card => `
        <article class="preface-card">
          <h2>${esc(card.title)}</h2>
          <p>${esc(card.body)}</p>
        </article>
      `).join("")}
    </div>
    ${(data.preface.reading_path || []).length ? `
      <h2>阅读路线</h2>
      <ul>${data.preface.reading_path.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
    ` : ""}
    ${(data.preface.takeaways || []).length ? `
      <h2>主题提示</h2>
      <ul>${data.preface.takeaways.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
    ` : ""}
  `;
}
function renderReadingFlow() {
  const blocks = data.reading_blocks || [];
  paper.innerHTML = blocks.map(block => `
    <section class="aligned-block-pair block-${esc(block.kind || "text")}" data-block-id="${esc(block.id)}" data-section-anchor="${esc(block.section_anchor || "")}">
      <div class="aligned-source">${blockSourceHtml(block)}</div>
      <div class="aligned-translation">${blockTranslationHtml(block)}</div>
    </section>
  `).join("");
}
function renderTranslationPaper() {
  const blocks = data.reading_blocks || [];
  translationPaper.innerHTML = blocks.map(block => `
    <section class="translation-section" data-translation-anchor="${esc(block.section_anchor || block.id)}">
      ${blockTranslationHtml(block)}
    </section>
  `).join("");
}
function renderSummary() {
  if (!summary || !data.summary) return;
  summary.id = data.summary.anchor || "summary";
  summary.innerHTML = `
    <h1>${esc(data.summary.title || "Summary")}</h1>
    <p class="kicker">${data.summary.source === "digest_artifact" ? "基于 literature-digest artifact 生成。" : "未找到 digest artifact，使用简短 fallback 总结。"}</p>
    ${(data.summary.sections || []).map(section => `
      <section class="summary-block">
        <h2>${esc(section.title)}</h2>
        <div>${marked.parse(section.markdown || "")}</div>
      </section>
    `).join("")}
  `;
}
function renderPostReading() {
  if (!postReading) return;
  postReading.innerHTML = marked.parse(data.post_reading_markdown || "");
  data.sections.forEach(section => {
    const heading = [...postReading.querySelectorAll("h1,h2,h3,h4")].find(el => el.textContent.trim() === section.title);
    if (heading) heading.id = section.anchor;
  });
  renderStructuredReferences(postReading);
}
function buildParallelSections() {
  // Block pairs are aligned by construction.
}
function referenceDetailRows(ref) {
  const rows = [];
  const fields = [
    ["venue", "Venue"],
    ["doi", "DOI"],
    ["url", "URL"],
    ["arxiv", "arXiv"],
    ["citeKey", "CiteKey"],
    ["matchStatus", "Match"],
    ["raw", "Raw"]
  ];
  fields.forEach(([key, label]) => {
    if (ref[key]) rows.push(`<dt>${esc(label)}</dt><dd>${esc(ref[key])}</dd>`);
  });
  if (ref.extra) rows.push(`<dt>Extra</dt><dd>${esc(JSON.stringify(ref.extra, null, 2))}</dd>`);
  return rows;
}
function renderStructuredReferences(root = document) {
  if (data.references_source !== "artifact" || !data.references || !Array.isArray(data.references.references)) return;
  const refs = data.references.references;
  const sectionIndex = data.sections.findIndex(section => section.title === "References");
  if (sectionIndex < 0) return;
  const section = data.sections[sectionIndex];
  const heading = root.querySelector(`#${CSS.escape(section.anchor)}`);
  if (!heading) return;
  const nextSection = data.sections.slice(sectionIndex + 1).map(item => root.querySelector(`#${CSS.escape(item.anchor)}`)).find(Boolean) || null;
  while (heading.nextSibling && heading.nextSibling !== nextSection) {
    heading.nextSibling.remove();
  }
  const panel = document.createElement("section");
  panel.className = "structured-references";
  panel.innerHTML = `
    <div class="references-summary">
      <strong>结构化参考文献</strong>
      <span>${refs.length} 篇</span>
    </div>
    <div class="reference-list">
      ${refs.map(ref => {
        const detailRows = referenceDetailRows(ref);
        return `
          <article class="reference-item">
            <span class="reference-index">${esc(ref.id || ("ref-" + ref.index))}</span>
            <div>
              <p class="reference-title">${esc(ref.title || ref.raw || "Untitled reference")}</p>
              <div class="reference-meta">${esc(ref.authors || "Unknown authors")}</div>
            </div>
            <div class="reference-year">${esc(ref.year || "")}</div>
            ${detailRows.length ? `<details class="reference-details"><summary>补充字段</summary><dl>${detailRows.join("")}</dl></details>` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
  heading.parentNode.insertBefore(panel, nextSection);
}
function graphNodes() {
  return data.citation_graph?.snapshot?.nodes || [];
}
function graphEdges() {
  return data.citation_graph?.snapshot?.edges || [];
}
function graphViewBox() {
  const box = data.citation_graph?.layout?.view_box || {};
  return {
    minX: Number(box.min_x ?? 0),
    minY: Number(box.min_y ?? 0),
    width: Number(box.width ?? 460),
    height: Number(box.height ?? 460)
  };
}
function graphLayoutNode(nodeId) {
  return data.citation_graph?.layout?.nodes?.[nodeId] || { x: 230, y: 230, depth: 2 };
}
function graphNodeId(node) {
  return node.node_id || node.id || "";
}
function graphNodeTitle(node) {
  return node.title || graphNodeId(node);
}
function graphNodeVisible(node) {
  if (!graphState.showLowSignal && node.low_signal) return false;
  if (!graphState.showLibrary && node.kind === "library_paper") return false;
  if (!graphState.showExternal && node.kind !== "library_paper") return false;
  return true;
}
function graphNodeMatches(node) {
  const query = graphState.search.trim().toLowerCase();
  if (!query) return false;
  return `${graphNodeTitle(node)} ${node.year || ""} ${graphNodeId(node)}`.toLowerCase().includes(query);
}
function graphNeighbors(nodeId, edges) {
  const ids = new Set([nodeId]);
  edges.forEach(edge => {
    if (edge.source === nodeId) ids.add(edge.target);
    if (edge.target === nodeId) ids.add(edge.source);
  });
  return ids;
}
function graphIncomingDegree(node, fallbackIncomingDegrees) {
  const metrics = node.metrics || {};
  const metricDegree = Number(metrics.internal_in_degree);
  if (Number.isFinite(metricDegree)) return Math.max(0, Math.floor(metricDegree));
  return fallbackIncomingDegrees.get(graphNodeId(node)) || 0;
}
function graphFallbackIncomingDegrees(nodes, edges) {
  const ids = new Set(nodes.map(graphNodeId));
  const incoming = new Map();
  edges.forEach(edge => {
    if (ids.has(edge.target)) incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
  });
  return incoming;
}
function graphNodeBaseSize(node) {
  if (node.kind === "library_paper") return GRAPH_LIBRARY_BASE_NODE_SIZE;
  if (node.display_tier === "single_external") return GRAPH_SINGLE_EXTERNAL_BASE_NODE_SIZE;
  return GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE;
}
function graphNodeSizeCap(node) {
  return node.kind === "library_paper" ? GRAPH_LIBRARY_NODE_SIZE_CAP : GRAPH_EXTERNAL_NODE_SIZE_CAP;
}
function graphNodeColor(node, importance) {
  if (importance?.halo) {
    if (node.kind === "library_paper") return "#2f7df6";
    if (node.display_tier === "single_external") return "#c4ca5d";
    return "#94a51f";
  }
  if (node.display_tier === "single_external") return "#b6bd74";
  return GRAPH_NODE_COLORS[node.kind] || GRAPH_NODE_COLORS.external_reference;
}
function graphNodeZIndex(node, importance) {
  const importanceZIndex = importance?.halo ? 8 : 0;
  if (node.kind === "library_paper") return Math.max(4, importanceZIndex);
  if (node.display_tier === "shared_external") return Math.max(2, importanceZIndex);
  if (node.visibility === "hover_only") return Math.max(1, importanceZIndex);
  return Math.max(2, importanceZIndex);
}
function buildGraphNodeImportance(nodes, edges) {
  const fallbackIncomingDegrees = graphFallbackIncomingDegrees(nodes, edges);
  const entries = nodes
    .map(node => ({ node, incomingDegree: graphIncomingDegree(node, fallbackIncomingDegrees) }))
    .filter(entry => entry.incomingDegree > 0);
  const degreeRanks = Array.from(new Set(entries.map(entry => entry.incomingDegree))).sort((left, right) => left - right);
  const rankByDegree = new Map(degreeRanks.map((degree, index) => [
    degree,
    degreeRanks.length <= 1 ? 1 : index / (degreeRanks.length - 1)
  ]));
  const haloCount = Math.min(
    GRAPH_IMPORTANCE_HALO_MAX,
    Math.max(1, Math.ceil(entries.length * GRAPH_IMPORTANCE_HALO_TOP_RATIO))
  );
  const haloNodeIds = new Set(entries
    .slice()
    .sort((left, right) =>
      right.incomingDegree - left.incomingDegree ||
      graphNodeId(left.node).localeCompare(graphNodeId(right.node))
    )
    .slice(0, haloCount)
    .map(entry => graphNodeId(entry.node)));
  return new Map(entries.map(entry => [
    graphNodeId(entry.node),
    {
      incomingDegree: entry.incomingDegree,
      percentile: rankByDegree.get(entry.incomingDegree) || 0,
      halo: haloNodeIds.has(graphNodeId(entry.node))
    }
  ]));
}
function graphNodeSize(node, importance) {
  const base = graphNodeBaseSize(node);
  if (!importance || importance.incomingDegree <= 0) return base;
  const cap = graphNodeSizeCap(node);
  return Math.min(cap, base + (cap - base) * importance.percentile);
}
function graphSearchText(node) {
  return `${graphNodeTitle(node)} ${node.year || ""} ${graphNodeId(node)} ${(node.aliases || []).join(" ")} ${(node.metrics?.synthesis_role_hints || []).join(" ")}`.toLowerCase();
}
function graphNodeMatchesSearchText(text, query) {
  const normalized = query.trim().toLowerCase();
  return !!normalized && String(text || "").includes(normalized);
}
function graphNodeVisual(node, importance, stateInfo) {
  const nodeId = graphNodeId(node);
  const baseSize = graphNodeSize(node, importance);
  const isStartNode = nodeId === stateInfo.startNodeId;
  const withinStartOneHop = Number(graphLayoutNode(nodeId).depth ?? 2) <= 1;
  const baseColor = isStartNode ? CITATION_GRAPH_START_NODE_COLOR : graphNodeColor(node, importance);
  const query = graphState.search.trim();
  const searchActive = !!query;
  const searchMatch = graphNodeMatchesSearchText(graphSearchText(node), query);
  if (!stateInfo.activeNodeId) {
    return {
      color: searchActive ? (searchMatch ? "#0ea5e9" : "#d3d8de") : baseColor,
      size: searchActive && searchMatch ? Math.max(baseSize * 1.35, baseSize + 1) : baseSize,
      zIndex: searchActive && searchMatch
        ? Math.max(30, graphNodeZIndex(node, importance))
        : isStartNode
          ? Math.max(12, graphNodeZIndex(node, importance))
          : graphNodeZIndex(node, importance),
      highlighted: Boolean(importance?.halo && (!searchActive || searchMatch)),
      label: searchActive && searchMatch ? graphNodeTitle(node) : "",
      active: false
    };
  }
  const neighbor = stateInfo.neighborIds.has(nodeId);
  const directlyHovered = nodeId === graphState.hoveredId;
  const activeNode = nodeId === stateInfo.activeNodeId;
  const activeNodeIsStart = stateInfo.activeNodeId === stateInfo.startNodeId;
  const selectedStart = graphState.selected?.kind === "node" && graphState.selected.id === stateInfo.startNodeId;
  const startOneHop = isStartNode || stateInfo.startOneHopIds.has(nodeId);
  const libraryTitleFromStart = activeNodeIsStart && startOneHop && node.kind === "library_paper";
  const activeLibraryTitle = activeNode && startOneHop && node.kind === "library_paper";
  const externalTitleFromPinnedStart =
    selectedStart &&
    startOneHop &&
    node.kind !== "library_paper" &&
    nodeId === stateInfo.hoverLabelId;
  const showHoverLabel =
    searchMatch ||
    (withinStartOneHop &&
      (isStartNode ||
        libraryTitleFromStart ||
        activeLibraryTitle ||
        externalTitleFromPinnedStart));
  return {
    color: searchActive && searchMatch ? "#0ea5e9" : neighbor ? baseColor : "#d3d8de",
    size: searchActive && searchMatch
      ? Math.max(baseSize * 1.35, baseSize + 1)
      : neighbor || node.visibility !== "hover_only"
        ? baseSize
        : Math.max(1, baseSize * 0.6),
    zIndex: searchActive && searchMatch
      ? Math.max(30, graphNodeZIndex(node, importance))
      : neighbor
        ? Math.max(10, graphNodeZIndex(node, importance))
        : isStartNode
          ? Math.max(12, graphNodeZIndex(node, importance))
          : graphNodeZIndex(node, importance),
    highlighted: Boolean(importance?.halo && (searchMatch || neighbor)),
    label: showHoverLabel ? graphNodeTitle(node) : "",
    active: activeNode || nodeId === graphState.selected?.id
  };
}
function graphHaloSvg(node, point, visual) {
  if (!visual.highlighted) return "";
  const library = node.kind === "library_paper";
  const soft = library ? GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT_SOFT : GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT_SOFT;
  const strong = library ? GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT : GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT;
  const radius = Math.max(5, visual.size) + 3;
  return `
    <circle class="graph-importance-halo-soft" cx="${point.x}" cy="${point.y}" r="${radius + 1}" stroke="${soft}" stroke-width="4"></circle>
    <circle class="graph-importance-halo" cx="${point.x}" cy="${point.y}" r="${radius}" stroke="${strong}" stroke-width="2"></circle>
  `;
}
function graphEdgeVisible(edge, activeNodeId, activeEdgeId) {
  if (activeEdgeId === edge.edge_id) return true;
  if (!activeNodeId) return false;
  return edge.source === activeNodeId || edge.target === activeNodeId;
}
function graphEdgeColor(edge, activeNodeId) {
  return activeNodeId && edge.target === activeNodeId
    ? CITATION_GRAPH_INCOMING_EDGE_COLOR
    : CITATION_GRAPH_OUTGOING_EDGE_COLOR;
}
function graphSelectedHoverNode(nodes) {
  if (graphState.selected?.kind !== "node") return "";
  const selectedId = graphState.selected.id || "";
  return nodes.some(node => graphNodeId(node) === selectedId) ? selectedId : "";
}
function cancelGraphHoverClear() {
  if (graphHoverClearTimer) {
    window.clearTimeout(graphHoverClearTimer);
    graphHoverClearTimer = 0;
  }
}
function scheduleGraphHoverClear(pinnedNodeId) {
  cancelGraphHoverClear();
  graphHoverClearTimer = window.setTimeout(() => {
    graphHoverClearTimer = 0;
    graphState.hoveredId = pinnedNodeId || "";
    graphState.hoverLabelId = "";
    renderCitationGraph();
  }, 80);
}
function updateGraphHover(nodeId) {
  const visibleNodes = graphNodes().filter(graphNodeVisible);
  const pinnedNode = graphSelectedHoverNode(visibleNodes);
  const currentEdges = graphEdges().filter(edge => {
    const ids = new Set(visibleNodes.map(graphNodeId));
    return ids.has(edge.source) && ids.has(edge.target);
  });
  cancelGraphHoverClear();
  let nextHovered = nodeId;
  let nextHoverLabel = "";
  if (pinnedNode && nodeId !== pinnedNode) {
    nextHovered = pinnedNode;
    nextHoverLabel = graphNeighbors(pinnedNode, currentEdges).has(nodeId) ? nodeId : "";
  }
  if (graphState.hoveredId === nextHovered && graphState.hoverLabelId === nextHoverLabel) return;
  graphState.hoveredId = nextHovered;
  graphState.hoverLabelId = nextHoverLabel;
  renderCitationGraph();
}
function graphDetailHtml() {
  const nodesById = new Map(graphNodes().map(node => [graphNodeId(node), node]));
  if (!graphState.selected) {
    return `<h3>Selection</h3><p class="muted">点击节点或连线查看引用细节。</p>`;
  }
  if (graphState.selected.kind === "edge") {
    const edge = graphEdges().find(item => item.edge_id === graphState.selected.id);
    if (!edge) return `<h3>Selection</h3><p class="muted">未找到所选连线。</p>`;
    return `
      <h3>${esc(edge.primary_role || "citation")}</h3>
      <dl>
        <dt>Source</dt><dd>${esc(nodesById.get(edge.source)?.title || edge.source)}</dd>
        <dt>Target</dt><dd>${esc(nodesById.get(edge.target)?.title || edge.target)}</dd>
        <dt>Mentions</dt><dd>${esc(edge.mention_count || 0)}</dd>
        <dt>ID</dt><dd>${esc(edge.edge_id)}</dd>
      </dl>
    `;
  }
  const node = nodesById.get(graphState.selected.id);
  if (!node) return `<h3>Selection</h3><p class="muted">未找到所选节点。</p>`;
  const metrics = node.metrics || {};
  return `
    <h3>${esc(graphNodeTitle(node))}</h3>
    <dl>
      <dt>Type</dt><dd>${esc(node.kind || "-")}</dd>
      <dt>Year</dt><dd>${esc(node.year || "-")}</dd>
      <dt>In</dt><dd>${esc(metrics.internal_in_degree ?? "-")}</dd>
      <dt>Out</dt><dd>${esc(metrics.internal_out_degree ?? "-")}</dd>
      <dt>Role</dt><dd>${esc((metrics.synthesis_role_hints || []).join(", ") || "-")}</dd>
      <dt>ID</dt><dd>${esc(graphNodeId(node))}</dd>
    </dl>
  `;
}
function renderCitationGraph() {
  if (!graphSection) return;
  const snapshot = data.citation_graph?.snapshot || {};
  const diagnostics = snapshot.diagnostics || {};
  const viewBox = graphViewBox();
  const nodes = graphNodes().filter(graphNodeVisible);
  const visibleIds = new Set(nodes.map(graphNodeId));
  const edges = graphEdges().filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  const pinnedNodeId = graphSelectedHoverNode(nodes);
  const activeNodeId = pinnedNodeId || graphState.hoveredId;
  const activeEdgeId = graphState.selected?.kind === "edge" ? graphState.selected.id : "";
  const neighborIds = activeNodeId ? graphNeighbors(activeNodeId, edges) : new Set();
  const startId = snapshot.start_node_id || "zotero:item:EIMSDEU3";
  const startOneHopIds = graphNeighbors(startId, edges);
  const importanceByNodeId = buildGraphNodeImportance(nodes, edges);
  const stateInfo = { activeNodeId, activeEdgeId, neighborIds, hoverLabelId: graphState.hoverLabelId, startNodeId: startId, startOneHopIds };
  const svgEdges = edges.filter(edge => graphEdgeVisible(edge, activeNodeId, activeEdgeId)).map(edge => {
    const source = graphLayoutNode(edge.source);
    const target = graphLayoutNode(edge.target);
    const color = graphEdgeColor(edge, activeNodeId);
    const marker = color === CITATION_GRAPH_INCOMING_EDGE_COLOR ? "graph-arrow-in" : "graph-arrow-out";
    return `<line class="graph-edge" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="${color}" marker-end="url(#${marker})" data-edge-id="${esc(edge.edge_id)}"></line>`;
  }).join("");
  const nodeRows = nodes.map(node => {
    const nodeId = graphNodeId(node);
    const point = graphLayoutNode(nodeId);
    const importance = importanceByNodeId.get(nodeId);
    const visual = graphNodeVisual(node, importance, stateInfo);
    const label = visual.label;
    return `
      <g data-z-index="${visual.zIndex}">
        ${graphHaloSvg(node, point, visual)}
        <circle class="graph-node ${visual.active ? "is-active" : ""}" cx="${point.x}" cy="${point.y}" r="${visual.size}" fill="${visual.color}" data-node-id="${esc(nodeId)}"></circle>
        ${label ? `<text class="graph-label" x="${point.x + visual.size + 4}" y="${point.y - visual.size - 3}">${esc(label.slice(0, 42))}</text>` : ""}
      </g>
    `;
  });
  const svgNodes = nodeRows.sort((left, right) => {
    const leftZ = Number((left.match(/data-z-index="([^"]+)"/) || [])[1] || 0);
    const rightZ = Number((right.match(/data-z-index="([^"]+)"/) || [])[1] || 0);
    return leftZ - rightZ;
  }).join("");
  const truncated = diagnostics.truncated ? `<span class="graph-badge warn">truncated</span>` : "";
  graphSection.innerHTML = `
    <div class="citation-graph-header">
      <div>
        <h2 id="${esc(data.citation_graph?.anchor || "citation-graph")}">Citation Graph</h2>
        <p>以 DETR 为中心的 2-hop 引用网络。节点和连线来自固化 snapshot。</p>
      </div>
      <div class="graph-badges">
        <span class="graph-badge">${esc(nodes.length)} nodes</span>
        <span class="graph-badge">${esc(edges.length)} edges</span>
        ${truncated}
      </div>
    </div>
    <div class="graph-toolbar">
      <input type="search" data-graph-search placeholder="Search graph" value="${esc(graphState.search)}">
      <button type="button" data-graph-filter="library" class="${graphState.showLibrary ? "active" : ""}">Library</button>
      <button type="button" data-graph-filter="external" class="${graphState.showExternal ? "active" : ""}">External</button>
      <button type="button" data-graph-filter="low" class="${graphState.showLowSignal ? "active" : ""}">Low signal</button>
      <button type="button" data-graph-reset>Reset</button>
    </div>
    <div class="graph-legend" aria-label="Citation graph legend">
      <span class="graph-legend-item"><span class="graph-legend-dot" style="background:${CITATION_GRAPH_START_NODE_COLOR}"></span>目标论文</span>
      <span class="graph-legend-item"><span class="graph-legend-dot" style="background:${GRAPH_NODE_COLORS.library_paper}"></span>库内文献</span>
      <span class="graph-legend-item"><span class="graph-legend-dot" style="background:${GRAPH_NODE_COLORS.external_reference}"></span>库外引用</span>
      <span class="graph-legend-item"><span class="graph-legend-halo"></span>高引用权重</span>
      <span class="graph-legend-item"><span class="graph-legend-line" style="background:${CITATION_GRAPH_INCOMING_EDGE_COLOR}"></span>指向当前节点</span>
      <span class="graph-legend-item"><span class="graph-legend-line" style="background:${CITATION_GRAPH_OUTGOING_EDGE_COLOR}"></span>当前节点引用</span>
    </div>
    <div class="graph-layout">
      <div class="graph-canvas">
        <svg viewBox="${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="2-hop citation graph">
          <defs>
            <marker id="graph-arrow-in" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="${CITATION_GRAPH_INCOMING_EDGE_COLOR}"></path>
            </marker>
            <marker id="graph-arrow-out" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="${CITATION_GRAPH_OUTGOING_EDGE_COLOR}"></path>
            </marker>
          </defs>
          ${svgEdges}
          ${svgNodes}
        </svg>
      </div>
      <aside class="graph-detail">${graphDetailHtml()}</aside>
    </div>
  `;
  graphSection.querySelector("[data-graph-search]")?.addEventListener("input", event => {
    graphState.search = event.target.value || "";
    renderCitationGraph();
  });
  graphSection.querySelector('[data-graph-filter="library"]')?.addEventListener("click", () => {
    graphState.showLibrary = !graphState.showLibrary;
    renderCitationGraph();
  });
  graphSection.querySelector('[data-graph-filter="external"]')?.addEventListener("click", () => {
    graphState.showExternal = !graphState.showExternal;
    renderCitationGraph();
  });
  graphSection.querySelector('[data-graph-filter="low"]')?.addEventListener("click", () => {
    graphState.showLowSignal = !graphState.showLowSignal;
    renderCitationGraph();
  });
  graphSection.querySelector("[data-graph-reset]")?.addEventListener("click", () => {
    graphState.search = "";
    graphState.showLibrary = true;
    graphState.showExternal = true;
    graphState.showLowSignal = false;
    graphState.hoveredId = "";
    graphState.hoverLabelId = "";
    graphState.selected = null;
    renderCitationGraph();
  });
  graphSection.querySelectorAll("[data-node-id]").forEach(node => {
    node.addEventListener("mouseenter", () => {
      updateGraphHover(node.getAttribute("data-node-id") || "");
    });
    node.addEventListener("mouseleave", () => {
      graphState.hoverLabelId = "";
      scheduleGraphHoverClear(graphSelectedHoverNode(graphNodes().filter(graphNodeVisible)));
    });
    node.addEventListener("click", () => {
      const nodeId = node.getAttribute("data-node-id") || "";
      cancelGraphHoverClear();
      graphState.selected = { kind: "node", id: nodeId };
      graphState.hoveredId = nodeId;
      graphState.hoverLabelId = "";
      renderCitationGraph();
    });
  });
  const graphCanvas = graphSection.querySelector(".graph-canvas");
  graphCanvas?.addEventListener("pointermove", event => {
    const node = event.target?.closest?.("[data-node-id]");
    if (node) {
      updateGraphHover(node.getAttribute("data-node-id") || "");
      return;
    }
    scheduleGraphHoverClear(graphSelectedHoverNode(graphNodes().filter(graphNodeVisible)));
  });
  graphCanvas?.addEventListener("mouseleave", () => {
    scheduleGraphHoverClear(graphSelectedHoverNode(graphNodes().filter(graphNodeVisible)));
  });
  graphCanvas?.addEventListener("click", event => {
    if (event.target?.closest?.("[data-node-id], [data-edge-id]")) return;
    cancelGraphHoverClear();
    graphState.hoveredId = "";
    graphState.hoverLabelId = "";
    graphState.selected = null;
    renderCitationGraph();
  });
  graphSection.querySelectorAll("[data-edge-id]").forEach(edge => {
    edge.addEventListener("click", () => {
      cancelGraphHoverClear();
      graphState.selected = { kind: "edge", id: edge.getAttribute("data-edge-id") || "" };
      graphState.hoveredId = "";
      graphState.hoverLabelId = "";
      renderCitationGraph();
    });
  });
}
function renderMath() {
  if (typeof renderMathInElement !== "function") return;
  [preface, paper, translationPaper, summary, postReading].filter(Boolean).forEach(root => renderMathInElement(root, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\\\(", right: "\\\\)", display: false },
      { left: "\\\\[", right: "\\\\]", display: true }
    ],
    throwOnError: false,
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"]
  }));
}
function rerenderPaper() {
  closeConceptBubble();
  renderReadingFlow();
  renderPostReading();
  renderMath();
  applyConceptOverlay(paper);
  buildParallelSections();
}
marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: false });
renderConceptRail();
renderPreface();
rerenderPaper();
renderTranslationPaper();
renderSummary();
renderMath();
renderCitationGraph();
toc.innerHTML = (data.navigation || data.sections || []).map(item => `<a href="#${esc(item.anchor)}" data-anchor="${esc(item.anchor)}" class="level-${esc(item.nav_level ?? 1)}">${esc(item.title)}</a>`).join("");
renderExtensions();
let current = (data.navigation || data.sections || [])[0];
renderSide(current);

const headingByAnchor = new Map((data.navigation || data.sections || []).map(item => [item.anchor, document.getElementById(item.anchor)]));
function updateCurrent() {
  const navigation = data.navigation || data.sections || [];
  let best = navigation[0];
  let bestTop = -Infinity;
  for (const item of navigation) {
    const el = headingByAnchor.get(item.anchor);
    if (!el) continue;
    const top = el.getBoundingClientRect().top;
    if (top <= 120 && top > bestTop) {
      best = item;
      bestTop = top;
    }
  }
  current = best;
  document.querySelectorAll("[data-anchor]").forEach(link => link.classList.toggle("active", link.dataset.anchor === best.anchor));
  renderSide(best);
}
paperScroll.addEventListener("scroll", updateCurrent, { passive: true });
window.addEventListener("scroll", updateCurrent, { passive: true });
document.querySelectorAll("[data-mode]").forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
const hashMode = location.hash.startsWith("#mode=") ? location.hash.slice("#mode=".length) : null;
const initialMode = new URLSearchParams(location.search).get("mode") || hashMode;
setMode(["original", "translated", "compare", "focus"].includes(initialMode) ? initialMode : "compare");
updateCurrent();
