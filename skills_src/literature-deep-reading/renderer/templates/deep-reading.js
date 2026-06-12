const data = JSON.parse(
  document.getElementById("deep-reading-data").textContent,
);
const body = document.body;
const toc = document.querySelector("[data-toc]");
const conceptRail = document.querySelector("[data-concept-rail]");
const paper = document.querySelector("[data-paper]");
const readingFlow = document.querySelector("[data-reading-flow]");
const translationPaper = document.querySelector("[data-translation-paper]");
const side = document.querySelector("[data-side]");
const paperScroll = document.querySelector("[data-paper-scroll]");
const modal = document.querySelector("[data-digest-modal]");
const graphSection = document.querySelector("[data-citation-graph]");
const graphState = {
  search: "",
  showLibrary: true,
  showExternal: true,
  showLowSignal: false,
  hoveredId: "",
  hoverLabelId: "",
  selected: null,
};
let graphHoverClearTimer = 0;
let conceptBubbleTimer = 0;
let activeAnchor = "preface";

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
}
function cssEscape(value) {
  return window.CSS?.escape
    ? CSS.escape(String(value || ""))
    : String(value || "").replace(/"/g, '\\"');
}
function setMode(mode) {
  body.classList.remove(
    "mode-original",
    "mode-translated",
    "mode-compare",
    "mode-focus",
  );
  body.classList.add(`mode-${mode}`);
  document
    .querySelectorAll("[data-mode]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.mode === mode),
    );
}
function setImageSources(root) {
  root.querySelectorAll("img[data-image-src]").forEach((image) => {
    const key = image.getAttribute("data-image-src") || "";
    const item = data.images?.by_path?.[key] || data.images?.by_src?.[key];
    if (item?.data_uri) {
      image.src = item.data_uri;
    } else {
      image.replaceWith(
        Object.assign(document.createElement("p"), {
          className: "image-missing",
          textContent: `图像不可用：${key}`,
        }),
      );
    }
  });
}
function conceptId(concept) {
  return concept?.concept_id || concept?.id || concept?.label || "";
}
function conceptLabel(concept) {
  return (
    concept?.label || concept?.aliases?.[0] || conceptId(concept) || "Concept"
  );
}
function allConcepts() {
  return data.concepts?.concepts || [];
}
function conceptForTerm(term) {
  const normalized = String(term || "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  return (
    allConcepts().find((concept) =>
      [concept.label, ...(concept.aliases || [])]
        .map((value) =>
          String(value || "")
            .trim()
            .toLowerCase(),
        )
        .some(
          (label) =>
            label && (label === normalized || normalized.includes(label)),
        ),
    ) || null
  );
}
function closeConceptBubble() {
  if (conceptBubbleTimer) window.clearTimeout(conceptBubbleTimer);
  conceptBubbleTimer = 0;
  document.querySelectorAll(".concept-bubble").forEach((node) => node.remove());
}
function scheduleConceptBubbleClose() {
  if (conceptBubbleTimer) window.clearTimeout(conceptBubbleTimer);
  conceptBubbleTimer = window.setTimeout(closeConceptBubble, 120);
}
function showConceptBubble(anchor, concept) {
  closeConceptBubble();
  const bubble = document.createElement("div");
  bubble.className = "concept-bubble";
  bubble.innerHTML = `<strong>${esc(conceptLabel(concept))}</strong><div class="concept-bubble-meta">${concept.kind ? `<span class="chip">${esc(concept.kind)}</span>` : ""}${concept.status ? `<span class="chip">${esc(concept.status)}</span>` : ""}</div><p>${esc(concept.definition || concept.description || "当前概念只有标签，暂无定义。")}</p>`;
  bubble.addEventListener(
    "mouseenter",
    () => conceptBubbleTimer && window.clearTimeout(conceptBubbleTimer),
  );
  bubble.addEventListener("mouseleave", scheduleConceptBubbleClose);
  document.body.appendChild(bubble);
  const rect = anchor.getBoundingClientRect();
  bubble.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 312))}px`;
  bubble.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - bubble.offsetHeight - 12)}px`;
}
function renderConceptRail() {
  const concepts = allConcepts();
  if (!concepts.length) {
    conceptRail.style.display = "none";
    return;
  }
  conceptRail.innerHTML = `<div class="concept-rail-header"><strong>Concepts</strong><button type="button" class="concept-toggle" data-concept-toggle>${conceptRail.classList.contains("is-open") ? "收起" : "展开"}</button></div><div class="concept-list">${concepts.map((concept) => `<button type="button" class="concept-chip" data-concept-chip="${esc(conceptId(concept))}"><strong>${esc(conceptLabel(concept))}</strong><span>${esc(concept.kind || concept.status || "concept")}</span></button>`).join("")}</div>`;
  conceptRail
    .querySelector("[data-concept-toggle]")
    ?.addEventListener("click", () => {
      conceptRail.classList.toggle("is-open");
      renderConceptRail();
    });
  conceptRail.querySelectorAll("[data-concept-chip]").forEach((button) => {
    const concept = concepts.find(
      (item) => conceptId(item) === button.getAttribute("data-concept-chip"),
    );
    if (!concept) return;
    button.addEventListener("mouseenter", () =>
      showConceptBubble(button, concept),
    );
    button.addEventListener("mouseleave", scheduleConceptBubbleClose);
    button.addEventListener("focus", () => showConceptBubble(button, concept));
    button.addEventListener("blur", scheduleConceptBubbleClose);
  });
}
function applyConceptOverlay(root) {
  const aliases = allConcepts()
    .flatMap((concept) =>
      [concept.label, ...(concept.aliases || [])]
        .filter(Boolean)
        .map((alias) => ({ alias: String(alias), concept })),
    )
    .sort((a, b) => b.alias.length - a.alias.length);
  if (!aliases.length) return;
  const skipSelector =
    "a, pre, code, script, style, table, .math, .structured-references, .concept-mention, .concept-bubble, .citation-graph-section";
  const linked = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    if (!walker.currentNode.parentElement?.closest(skipSelector))
      nodes.push(walker.currentNode);
  }
  nodes.forEach((node) => {
    const text = node.nodeValue || "";
    const row = aliases.find(
      (item) =>
        !linked.has(conceptId(item.concept)) &&
        text.toLowerCase().includes(item.alias.toLowerCase()),
    );
    if (!row) return;
    const index = text.toLowerCase().indexOf(row.alias.toLowerCase());
    const span = document.createElement("span");
    span.className = "concept-mention";
    span.tabIndex = 0;
    span.dataset.conceptId = conceptId(row.concept);
    span.textContent = text.slice(index, index + row.alias.length);
    span.addEventListener("mouseenter", () =>
      showConceptBubble(span, row.concept),
    );
    span.addEventListener("mouseleave", scheduleConceptBubbleClose);
    span.addEventListener("focus", () => showConceptBubble(span, row.concept));
    span.addEventListener("blur", scheduleConceptBubbleClose);
    const fragment = document.createDocumentFragment();
    fragment.appendChild(document.createTextNode(text.slice(0, index)));
    fragment.appendChild(span);
    fragment.appendChild(
      document.createTextNode(text.slice(index + row.alias.length)),
    );
    node.parentNode?.replaceChild(fragment, node);
    linked.add(conceptId(row.concept));
  });
}
function renderNav() {
  toc.innerHTML = (data.navigation || [])
    .map(
      (item) =>
        `<a href="#${esc(item.anchor)}" data-anchor="${esc(item.anchor)}" class="level-${esc(item.level ?? 1)}">${esc(item.title)}</a>`,
    )
    .join("");
}
function renderPreface() {
  const root = document.querySelector("[data-preface]");
  const cards = data.preface?.cards || [];
  root.id = data.preface?.anchor || "preface";
  root.innerHTML = `<h1>${esc(data.preface?.title || "阅读前导读")}</h1><p class="kicker">${esc(data.preface?.goal || "")}</p><div class="preface-grid">${cards.map((card) => `<article class="preface-card"><h2>${esc(card.title)}</h2><p>${esc(card.body)}</p></article>`).join("")}</div>${(data.preface?.reading_path || []).length ? `<h2>阅读路线</h2><ul>${data.preface.reading_path.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}`;
}
function blockHtml(block, sideName) {
  return sideName === "translation"
    ? block.translation_html || ""
    : block.source_html || "";
}
function renderReading() {
  const blocks = data.reading_blocks || [];
  paper.innerHTML = blocks
    .map(
      (block) =>
        `<section class="source-block block-${esc(block.kind || "text")}" data-block-id="${esc(block.id || block.block_id)}" data-section-anchor="${esc(block.section_anchor || "")}">${blockHtml(block, "source")}</section>`,
    )
    .join("");
  readingFlow.innerHTML = blocks
    .map(
      (block) =>
        `<section class="aligned-block-pair block-${esc(block.kind || "text")}" data-block-id="${esc(block.id || block.block_id)}" data-section-anchor="${esc(block.section_anchor || "")}"><div class="aligned-source">${blockHtml(block, "source")}</div><div class="aligned-translation">${blockHtml(block, "translation")}</div></section>`,
    )
    .join("");
  translationPaper.innerHTML = blocks
    .map(
      (block) =>
        `<section class="translation-section block-${esc(block.kind || "text")}" data-block-id="${esc(block.id || block.block_id)}" data-section-anchor="${esc(block.section_anchor || "")}">${blockHtml(block, "translation")}</section>`,
    )
    .join("");
  [paper, readingFlow, translationPaper].forEach(setImageSources);
  applyConceptOverlay(paper);
  applyConceptOverlay(readingFlow);
}
function renderSummary() {
  const root = document.querySelector("[data-summary]");
  root.id = "summary";
  root.innerHTML = `<h1>Summary</h1>${(data.summary?.sections || []).map((section) => `<section class="summary-block"><h2>${esc(section.title)}</h2><p>${esc(section.body || section.markdown || "")}</p></section>`).join("")}`;
}
function referencesById() {
  return new Map(
    (data.references?.items || []).map((ref) => [ref.reference_id, ref]),
  );
}
function referenceTitle(referenceId) {
  const ref = referencesById().get(referenceId);
  return ref
    ? `${ref.reference_index ? `[${ref.reference_index}] ` : ""}${ref.title || ref.raw?.raw || referenceId}`
    : referenceId;
}
function renderInsight(insight) {
  if (!insight) return "";
  const questions = (insight.questions || []).filter(
    (item) => item.question || item.answer,
  );
  const roles = insight.citation_note?.reference_roles || [];
  const qaHtml = questions.length
    ? `<section><h2>可能的问题</h2>${questions.map((item) => `<div class="qa-item"><h3>${esc(item.question)}</h3><p>${esc(item.answer)}</p></div>`).join("")}</section>`
    : "";
  const citationHtml =
    insight.citation_note?.body || roles.length
      ? `<section><h2>引用线索</h2>${insight.citation_note?.body ? `<p>${esc(insight.citation_note.body)}</p>` : ""}${roles
          .slice(0, 5)
          .map(
            (role) =>
              `<details><summary>${esc(referenceTitle(role.reference_id))}</summary>${role.role ? `<p>${esc(role.role)}</p>` : ""}${role.note ? `<p>${esc(role.note)}</p>` : ""}</details>`,
          )
          .join("")}</section>`
      : "";
  return qaHtml + citationHtml;
}
function conceptChip(term) {
  const label = term?.label || term;
  const concept = conceptForTerm(label);
  return concept
    ? `<button type="button" class="chip side-concept-chip has-concept" data-side-concept="${esc(conceptId(concept))}">${esc(label)}</button>`
    : `<span class="chip">${esc(label)}</span>`;
}
function renderSide(anchor) {
  const navItem = (data.navigation || []).find(
    (item) => item.anchor === anchor,
  ) || { anchor, title: anchor };
  const insight = data.section_insights?.by_anchor?.[anchor] || {};
  const terms = insight.concepts?.length
    ? insight.concepts
    : data.preface?.concepts || [];
  side.innerHTML = `<section><h2>当前位置</h2><p>${esc(navItem.title || anchor)}</p></section><section><h2>阅读目标</h2><p>${esc(insight.reading_goal || data.preface?.goal || "")}</p></section><section><h2>相关概念</h2><div class="chips">${terms.map(conceptChip).join("")}</div></section>${(insight.misread_warnings || []).length ? `<section><h2>误读提醒</h2>${insight.misread_warnings.map((item) => `<p>${esc(item)}</p>`).join("")}</section>` : ""}${renderInsight(insight)}`;
  side.querySelectorAll("[data-side-concept]").forEach((button) => {
    const concept = allConcepts().find(
      (item) => conceptId(item) === button.getAttribute("data-side-concept"),
    );
    if (!concept) return;
    button.addEventListener("mouseenter", () =>
      showConceptBubble(button, concept),
    );
    button.addEventListener("mouseleave", scheduleConceptBubbleClose);
    button.addEventListener("click", () => showConceptBubble(button, concept));
  });
}
function openDigest(referenceId) {
  const ref = referencesById().get(referenceId);
  if (!ref?.digest_modal?.available) return;
  modal.hidden = false;
  modal.innerHTML = `<div class="digest-dialog"><button type="button" class="digest-close" data-close>关闭</button><h2>${esc(ref.digest_modal.title || ref.title)}</h2><pre>${esc(ref.digest_modal.markdown)}</pre></div>`;
  modal
    .querySelector("[data-close]")
    ?.addEventListener("click", () => (modal.hidden = true));
}
function renderReferences() {
  const sourceLabel =
    data.references?.references_source === "artifact"
      ? "structured references artifact"
      : "markdown fallback";
  return `<section class="structured-references" id="references"><div class="references-summary"><strong>References</strong><span>${esc(data.references?.reference_count || 0)} 篇 · ${esc(sourceLabel)}</span></div><div class="reference-list">${(data.references?.items || []).map((ref) => `<article class="reference-item"><span class="reference-index">${esc(ref.reference_index || "")}</span><div><p class="reference-title">${esc(ref.title || ref.raw?.raw || "Untitled reference")}</p><div class="reference-meta">${esc((ref.authors || []).join(", "))}</div>${ref.digest_note?.role_in_current_paper ? `<p class="reference-note">${esc(ref.digest_note.role_in_current_paper)}</p>` : ""}${ref.digest_modal?.available ? `<button type="button" class="digest-button" data-digest-ref="${esc(ref.reference_id)}">Digest</button>` : ""}</div><div class="reference-year">${esc(ref.year || "")}</div></article>`).join("")}</div></section>`;
}
function renderPostReading() {
  const root = document.querySelector("[data-post-reading]");
  root.innerHTML = renderReferences();
  root
    .querySelectorAll("[data-digest-ref]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        openDigest(button.dataset.digestRef),
      ),
    );
}
function graphNodesRaw() {
  return data.citation_graph?.snapshot?.nodes || [];
}
function graphEdgesRaw() {
  return data.citation_graph?.snapshot?.edges || [];
}
function graphNodeId(node) {
  return node.node_id || node.id || "";
}
function graphNodeKind(node) {
  const id = graphNodeId(node);
  if (id === data.citation_graph?.snapshot?.start_node_id) return "target";
  return (
    node.kind ||
    node.type ||
    (id.startsWith("zotero:item:") ? "library_paper" : "external_reference")
  );
}
function graphLayoutMap() {
  const raw = data.citation_graph?.layout?.nodes || [];
  if (Array.isArray(raw))
    return new Map(raw.map((item) => [item.node_id || item.id, item]));
  return new Map(
    Object.entries(raw).map(([id, item]) => [id, { node_id: id, ...item }]),
  );
}
function graphNeighbors(nodeId, edges) {
  const ids = new Set([nodeId]);
  edges.forEach((edge) => {
    if (edge.source === nodeId) ids.add(edge.target);
    if (edge.target === nodeId) ids.add(edge.source);
  });
  return ids;
}
function graphVisibleNode(node) {
  const kind = graphNodeKind(node);
  if (!graphState.showLowSignal && node.low_signal) return false;
  if (
    !graphState.showLibrary &&
    (kind === "library_paper" || kind === "target")
  )
    return false;
  if (!graphState.showExternal && kind === "external_reference") return false;
  const query = graphState.search.trim().toLowerCase();
  return (
    !query ||
    `${node.title || ""} ${node.year || ""} ${graphNodeId(node)}`
      .toLowerCase()
      .includes(query)
  );
}
function renderCitationGraph() {
  const layout = graphLayoutMap();
  const nodes = graphNodesRaw()
    .filter((node) => layout.has(graphNodeId(node)))
    .filter(graphVisibleNode);
  const visibleIds = new Set(nodes.map(graphNodeId));
  const edges = graphEdgesRaw().filter(
    (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
  );
  if (!nodes.length) {
    graphSection.innerHTML = `<h2 id="citation-graph">Citation Graph</h2><p>当前没有可用的图布局坐标。</p>`;
    return;
  }
  const points = nodes.map((node) => layout.get(graphNodeId(node)));
  const xs = points.map((p) => Number(p.x || 0));
  const ys = points.map((p) => Number(p.y || 0));
  const minX = Math.min(...xs) - 40;
  const maxX = Math.max(...xs) + 40;
  const minY = Math.min(...ys) - 40;
  const maxY = Math.max(...ys) + 40;
  const startId = data.citation_graph?.snapshot?.start_node_id || "";
  const pinnedId =
    graphState.selected?.kind === "node" ? graphState.selected.id : "";
  const activeId = pinnedId || graphState.hoveredId;
  const neighborIds = activeId ? graphNeighbors(activeId, edges) : new Set();
  const startOneHop = graphNeighbors(startId, edges);
  const edgeRows = edges
    .map((edge) => {
      const active =
        !activeId ||
        edge.source === activeId ||
        edge.target === activeId ||
        graphState.selected?.id === edge.edge_id;
      const s = layout.get(edge.source);
      const t = layout.get(edge.target);
      return `<line class="graph-edge ${active ? "is-active" : "is-muted"}" x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" data-edge-id="${esc(edge.edge_id || `${edge.source}-${edge.target}`)}"></line>`;
    })
    .join("");
  const nodeRows = nodes
    .map((node) => {
      const id = graphNodeId(node);
      const kind = graphNodeKind(node);
      const point = layout.get(id);
      const active = id === activeId || neighborIds.has(id);
      const baseSize =
        kind === "target" ? 8 : kind === "library_paper" ? 5.4 : 3.6;
      const oneHop = startOneHop.has(id);
      const showLabel =
        graphState.search ||
        (activeId &&
          oneHop &&
          (kind === "target" ||
            kind === "library_paper" ||
            graphState.hoverLabelId === id));
      return `<g><circle class="graph-node ${esc(kind)} ${active ? "is-active" : ""}" cx="${point.x}" cy="${point.y}" r="${baseSize}" data-node-id="${esc(id)}"><title>${esc(node.title || id)}</title></circle>${showLabel ? `<text class="graph-label" x="${Number(point.x) + baseSize + 4}" y="${Number(point.y) - baseSize - 3}">${esc(String(node.title || id).slice(0, 48))}</text>` : ""}</g>`;
    })
    .join("");
  graphSection.innerHTML = `<div class="citation-graph-header"><div><h2 id="citation-graph">Citation Graph</h2><p>基于 Host Bridge 固化布局的 2-hop 引用网络。</p></div><div class="graph-badges"><span class="graph-badge">${nodes.length} nodes</span><span class="graph-badge">${edges.length} edges</span></div></div><div class="graph-toolbar"><input type="search" data-graph-search placeholder="Search graph" value="${esc(graphState.search)}"><button type="button" data-graph-filter="library" class="${graphState.showLibrary ? "active" : ""}">Library</button><button type="button" data-graph-filter="external" class="${graphState.showExternal ? "active" : ""}">External</button><button type="button" data-graph-reset>Reset</button></div><div class="graph-legend"><span><i class="legend-dot target"></i>目标论文</span><span><i class="legend-dot library_paper"></i>库内文献</span><span><i class="legend-dot external_reference"></i>库外引用</span></div><div class="graph-layout"><div class="graph-canvas"><svg viewBox="${minX} ${minY} ${Math.max(1, maxX - minX)} ${Math.max(1, maxY - minY)}" preserveAspectRatio="xMidYMid meet">${edgeRows}${nodeRows}</svg></div><aside class="graph-detail">${graphDetailHtml()}</aside></div>`;
  graphSection
    .querySelector("[data-graph-search]")
    ?.addEventListener("input", (event) => {
      graphState.search = event.target.value || "";
      renderCitationGraph();
    });
  graphSection
    .querySelector('[data-graph-filter="library"]')
    ?.addEventListener("click", () => {
      graphState.showLibrary = !graphState.showLibrary;
      renderCitationGraph();
    });
  graphSection
    .querySelector('[data-graph-filter="external"]')
    ?.addEventListener("click", () => {
      graphState.showExternal = !graphState.showExternal;
      renderCitationGraph();
    });
  graphSection
    .querySelector("[data-graph-reset]")
    ?.addEventListener("click", () => {
      Object.assign(graphState, {
        search: "",
        showLibrary: true,
        showExternal: true,
        showLowSignal: false,
        hoveredId: "",
        hoverLabelId: "",
        selected: null,
      });
      renderCitationGraph();
    });
  graphSection.querySelectorAll("[data-node-id]").forEach((nodeEl) => {
    nodeEl.addEventListener("mouseenter", () =>
      updateGraphHover(nodeEl.getAttribute("data-node-id") || ""),
    );
    nodeEl.addEventListener("mouseleave", () =>
      scheduleGraphHoverClear(pinnedId),
    );
    nodeEl.addEventListener("click", () => {
      graphState.selected = {
        kind: "node",
        id: nodeEl.getAttribute("data-node-id") || "",
      };
      graphState.hoveredId = graphState.selected.id;
      graphState.hoverLabelId = "";
      renderCitationGraph();
    });
  });
}
function graphDetailHtml() {
  const nodes = new Map(
    graphNodesRaw().map((node) => [graphNodeId(node), node]),
  );
  if (!graphState.selected)
    return `<h3>Selection</h3><p class="muted">点击节点查看文献细节。</p>`;
  const node = nodes.get(graphState.selected.id);
  if (!node) return `<h3>Selection</h3><p class="muted">未找到所选节点。</p>`;
  const metrics = node.metrics || {};
  return `<h3>${esc(node.title || graphNodeId(node))}</h3><dl><dt>Type</dt><dd>${esc(graphNodeKind(node))}</dd><dt>Year</dt><dd>${esc(node.year || "-")}</dd><dt>In</dt><dd>${esc(metrics.internal_in_degree ?? "-")}</dd><dt>Out</dt><dd>${esc(metrics.internal_out_degree ?? "-")}</dd><dt>ID</dt><dd>${esc(graphNodeId(node))}</dd></dl>`;
}
function updateGraphHover(nodeId) {
  const edges = graphEdgesRaw();
  const pinnedId =
    graphState.selected?.kind === "node" ? graphState.selected.id : "";
  graphState.hoveredId = pinnedId || nodeId;
  graphState.hoverLabelId =
    pinnedId && graphNeighbors(pinnedId, edges).has(nodeId) ? nodeId : "";
  renderCitationGraph();
}
function scheduleGraphHoverClear(pinnedId) {
  if (graphHoverClearTimer) window.clearTimeout(graphHoverClearTimer);
  graphHoverClearTimer = window.setTimeout(() => {
    graphState.hoveredId = pinnedId || "";
    graphState.hoverLabelId = "";
    renderCitationGraph();
  }, 80);
}
function renderExtensions() {
  const root = document.querySelector("[data-extensions]");
  root.innerHTML = `<h1 id="extensions">Extensions</h1>${(data.extensions?.items || []).map((item) => `<article class="extension"><h2>${esc(item.title)}</h2><p>${esc(item.body || item.description || "")}</p></article>`).join("")}`;
}
function initScrollTracking() {
  const anchors = new Set((data.navigation || []).map((item) => item.anchor));
  const targets = [
    document.querySelector("[data-preface]"),
    document.querySelector("[data-summary]"),
    document.querySelector("[data-post-reading]"),
    graphSection,
    document.querySelector("[data-extensions]"),
    ...document.querySelectorAll("[data-section-anchor]"),
  ].filter(Boolean);
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const anchor =
        visible?.target?.dataset?.sectionAnchor ||
        visible?.target?.id ||
        activeAnchor;
      if (anchor && anchors.has(anchor) && anchor !== activeAnchor) {
        activeAnchor = anchor;
        document
          .querySelectorAll("[data-anchor]")
          .forEach((link) =>
            link.classList.toggle("active", link.dataset.anchor === anchor),
          );
        renderSide(anchor);
      }
    },
    { root: paperScroll, threshold: [0.08, 0.2, 0.45] },
  );
  targets.forEach((target) => observer.observe(target));
  document
    .querySelectorAll("[data-section-anchor]")
    .forEach((node) =>
      node.addEventListener("mouseenter", () =>
        renderSide(node.dataset.sectionAnchor),
      ),
    );
}
function init() {
  document.querySelector("[data-paper-title]").textContent =
    data.paper?.title || "Literature Deep Reading";
  document.querySelector("[data-paper-meta]").textContent =
    data.paper?.target_language || "";
  document
    .querySelectorAll("[data-mode]")
    .forEach((button) =>
      button.addEventListener("click", () => setMode(button.dataset.mode)),
    );
  renderNav();
  renderConceptRail();
  renderPreface();
  renderReading();
  renderSummary();
  renderPostReading();
  renderCitationGraph();
  renderExtensions();
  renderSide("preface");
  initScrollTracking();
  setMode("compare");
}
init();
