const data = JSON.parse(
  document.getElementById("deep-reading-data").textContent,
);
const body = document.body;
const shell = document.querySelector(".shell");
const toc = document.querySelector("[data-toc]");
const conceptRail = document.querySelector("[data-concept-rail]");
const paper = document.querySelector("[data-paper]");
const readingFlow = document.querySelector("[data-reading-flow]");
const translationPaper = document.querySelector("[data-translation-paper]");
const appendixReading = document.querySelector("[data-appendix-reading]");
const appendixPaper = document.querySelector("[data-appendix-paper]");
const appendixReadingFlow = document.querySelector(
  "[data-appendix-reading-flow]",
);
const appendixTranslationPaper = document.querySelector(
  "[data-appendix-translation-paper]",
);
const side = document.querySelector("[data-side]");
const paperScroll = document.querySelector("[data-paper-scroll]");
const modal = document.querySelector("[data-digest-modal]");
const graphSection = document.querySelector("[data-citation-graph]");
let conceptBubbleTimer = 0;
let activeAnchor = "preface";
let scrollUpdateFrame = 0;
let scheduleActiveAnchorUpdate = () => {};
const viewerEnvironment = detectConstrainedViewer();
let activeReferenceView = data.references?.default_view || "item";
const labels = data.labels || {};
const RESPONSIVE_THRESHOLDS = {
  collapseConceptRail: 2050,
  collapseToc: 1840,
  disableCompare: 1580,
};

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
function label(key, fallback) {
  return labels[key] || fallback;
}
function markdownInline(value) {
  return esc(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
function headingId(text, index) {
  const normalized = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `digest-heading-${normalized || index}`;
}
function digestHeadings(markdown) {
  const headings = [];
  String(markdown || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const match = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
      if (match) {
        headings.push({
          level: match[1].length,
          title: match[2],
          id: headingId(match[2], headings.length + 1),
        });
      }
    });
  return headings;
}
function renderMarkdown(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const parts = [];
  let paragraph = [];
  let list = [];
  let inCode = false;
  let codeLines = [];
  const headings = digestHeadings(markdown);
  let headingIndex = 0;
  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) parts.push(`<p>${markdownInline(text)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) {
      parts.push(
        `<ul>${list.map((item) => `<li>${markdownInline(item)}</li>`).join("")}</ul>`,
      );
      list = [];
    }
  };
  lines.forEach((line) => {
    if (/^```/.test(line.trim())) {
      if (inCode) {
        parts.push(`<pre><code>${esc(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeLines.push(line);
      return;
    }
    const heading = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(4, Math.max(2, heading[1].length + 1));
      const id =
        headings[headingIndex]?.id || headingId(heading[2], headingIndex + 1);
      headingIndex += 1;
      parts.push(`<h${level} id="${esc(id)}">${esc(heading[2])}</h${level}>`);
      return;
    }
    const listItem = /^\s*[-*]\s+(.+)$/.exec(line);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
      return;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      return;
    }
    paragraph.push(line.trim());
  });
  flushParagraph();
  flushList();
  if (inCode)
    parts.push(`<pre><code>${esc(codeLines.join("\n"))}</code></pre>`);
  return parts.join("");
}
function renderDigestOutline(markdown) {
  const headings = digestHeadings(markdown);
  if (!headings.length) return "";
  return `<nav class="digest-outline" aria-label="Digest outline"><strong>Outline</strong>${headings
    .map(
      (heading) =>
        `<a class="digest-outline-link depth-${esc(heading.level)}" href="#${esc(heading.id)}">${esc(heading.title)}</a>`,
    )
    .join("")}</nav>`;
}
function setMode(mode) {
  if (mode === "compare" && body.classList.contains("compare-disabled")) {
    mode = "original";
  }
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
  window.setTimeout(scheduleActiveAnchorUpdate, 0);
}
function viewportWidth() {
  return window.innerWidth || document.documentElement.clientWidth || 0;
}
function canOpenConceptRail() {
  return viewportWidth() > RESPONSIVE_THRESHOLDS.collapseConceptRail;
}
function syncResponsiveLayout() {
  const width = viewportWidth();
  if (
    width <= RESPONSIVE_THRESHOLDS.collapseConceptRail &&
    conceptRail?.classList.contains("is-open")
  ) {
    conceptRail.classList.remove("is-open");
    shell?.classList.remove("concept-rail-open");
    renderConceptRail();
  }
  body.classList.toggle(
    "toc-collapsed",
    width <= RESPONSIVE_THRESHOLDS.collapseToc,
  );
  const compareDisabled = width <= RESPONSIVE_THRESHOLDS.disableCompare;
  body.classList.toggle("compare-disabled", compareDisabled);
  document.querySelectorAll('[data-mode="compare"]').forEach((button) => {
    button.disabled = compareDisabled;
    button.setAttribute("aria-disabled", compareDisabled ? "true" : "false");
  });
  if (compareDisabled && body.classList.contains("mode-compare")) {
    setMode("original");
  }
  window.setTimeout(scheduleActiveAnchorUpdate, 0);
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
    shell?.classList.remove("concept-rail-open");
    return;
  }
  const isOpen = conceptRail.classList.contains("is-open");
  shell?.classList.toggle("concept-rail-open", isOpen);
  conceptRail.innerHTML = `<div class="concept-rail-header"><strong>${esc(label("concepts", "Concepts"))}</strong><button type="button" class="concept-toggle" data-concept-toggle>${conceptRail.classList.contains("is-open") ? "收起" : "展开"}</button></div><div class="concept-list">${concepts.map((concept) => `<button type="button" class="concept-chip" data-concept-chip="${esc(conceptId(concept))}"><strong>${esc(conceptLabel(concept))}</strong><span>${esc(concept.kind || concept.status || "concept")}</span></button>`).join("")}</div>`;
  conceptRail
    .querySelector("[data-concept-toggle]")
    ?.addEventListener("click", () => {
      if (!conceptRail.classList.contains("is-open") && !canOpenConceptRail()) {
        conceptRail.classList.remove("is-open");
        shell?.classList.remove("concept-rail-open");
        return;
      }
      conceptRail.classList.toggle("is-open");
      shell?.classList.toggle(
        "concept-rail-open",
        conceptRail.classList.contains("is-open"),
      );
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
  toc.querySelectorAll("[data-anchor]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const anchor = link.getAttribute("data-anchor") || "";
      if (!anchor) return;
      const target = targetForAnchor(anchor);
      if (!target) return;
      event.preventDefault();
      scrollElementForTarget(target).scrollIntoView({
        block: "start",
        inline: "nearest",
      });
      window.setTimeout(scheduleActiveAnchorUpdate, 0);
    });
  });
}
function referenceDigestByPaperRef() {
  const rows = [
    ...(data.references?.item_view?.items || []),
    ...timelineDigestRows(),
  ];
  const byRef = new Map();
  rows.forEach((ref) => {
    if (!ref?.digest_modal?.available) return;
    [ref.bound_paper_ref, ref.paper_ref, ref.zotero_item_key]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .forEach((key) => byRef.set(key, ref.reference_id));
  });
  return byRef;
}
function timelineDigestRows() {
  return (data.preface?.topic_timeline?.items || [])
    .filter((item) => item?.kind === "paper" && item?.digest_modal?.available)
    .map((item) => ({
      ...item,
      reference_id:
        item.digest_reference_id ||
        `timeline:${item.paper_ref || item.item_key}`,
      title:
        item.title || item.paper_ref || label("paper_digest", "Paper digest"),
      bound_paper_ref: item.paper_ref || "",
      zotero_item_key: item.item_key || "",
      digest_modal: item.digest_modal,
    }));
}
function timelineTargetPaperRef(timeline) {
  return (
    timeline?.target?.paper_ref ||
    data.paper?.paper_ref ||
    data.paper?.paperRef ||
    ""
  );
}
function timelineTargetItemKey(timeline) {
  const ref = timelineTargetPaperRef(timeline);
  return (
    timeline?.target?.item_key ||
    data.paper?.item_key ||
    data.paper?.itemKey ||
    (ref.includes(":") ? ref.split(":").pop() : "")
  );
}
function timelineRenderer() {
  return window.ZoteroSkillsTopicTimeline;
}
function renderPrefaceTimelineNode(timeline) {
  if (!timeline?.available) return null;
  const renderer = timelineRenderer();
  if (!renderer?.renderTopicTimeline) return null;
  const digestByRef = referenceDigestByPaperRef();
  const papers = [];
  const events = [];
  (timeline.items || []).forEach((item, index) => {
    const year = Number(item?.year);
    if (!Number.isFinite(year)) return;
    if ((item.kind || "paper") === "event") {
      events.push({
        key: item.key || `event:${year}:${index}`,
        year,
        label: item.label || String(year),
        title: item.title || item.description || `Milestone ${index + 1}`,
        order: index,
        weight: Number(item.pin_scale) || 1.24,
        tone: item.tone || "milestone",
        descriptions: [item.description || item.summary || item.title].filter(
          Boolean,
        ),
      });
      return;
    }
    const paperRef = item.paper_ref || item.paperRef || "";
    const itemKey =
      item.item_key ||
      item.itemKey ||
      (paperRef.includes(":") ? paperRef.split(":").pop() : "");
    const digestReferenceId =
      item.digest_reference_id ||
      digestByRef.get(paperRef) ||
      digestByRef.get(itemKey) ||
      "";
    papers.push({
      key: item.key || `paper:${paperRef || index}`,
      year,
      label: item.label || `P${index + 1}`,
      title: item.title || paperRef || `Paper ${index + 1}`,
      order: index,
      weight: Number(item.pin_scale) || 1,
      tone: item.tone === "current" ? "paper" : item.tone || "paper",
      paperRef,
      itemKey,
      digestReferenceId,
    });
  });
  if (!papers.length) return null;
  return renderer.renderTopicTimeline(
    {
      summary: timeline.summary || "",
      papers,
      events,
    },
    {
      labels: {
        title: label("topic_timeline", "Topic Timeline"),
        milestones: label("timeline_milestones", "Milestones"),
        papers: label("timeline_papers", "Papers"),
        currentPaper: label("timeline_current_paper", "Current Paper"),
        empty: label("timeline_empty", "No dated topic papers"),
      },
      className: "preface-topic-timeline",
      currentPaperRef: timelineTargetPaperRef(timeline),
      currentItemKey: timelineTargetItemKey(timeline),
      currentPaperClass: "timeline-current-paper",
      currentPaperPinScale: 1.5,
      currentPaperPinColor: "red",
      canClickPaper: (paper) => Boolean(paper.digestReferenceId),
      disableUnclickablePapers: false,
      onPaperClick: (paper) => {
        if (paper.digestReferenceId) openDigest(paper.digestReferenceId);
      },
    },
  );
}
function renderReadingGuide(preface) {
  const pathItems = preface?.reading_path || [];
  const questions = (preface?.questions || []).filter(
    (item) => item?.question || item?.answer,
  );
  if (!pathItems.length && !questions.length) return "";
  const pathHtml = pathItems.length
    ? `<section><h3>${esc(label("reading_path", "Reading Path"))}</h3><ul>${pathItems.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></section>`
    : "";
  const questionHtml = questions.length
    ? `<section><h3>${esc(label("reading_questions", "Questions to Keep in Mind"))}</h3>${questions.map((item) => `<article class="preface-question"><strong>${esc(item.question || "")}</strong>${item.answer ? `<p>${esc(item.answer)}</p>` : ""}</article>`).join("")}</section>`
    : "";
  return `<section class="reading-guide"><h2>${esc(label("reading_guide", "Reading Guide"))}</h2>${pathHtml}${questionHtml}</section>`;
}
function renderPreface() {
  const root = document.querySelector("[data-preface]");
  const cards = data.preface?.cards || [];
  root.id = data.preface?.anchor || "preface";
  root.innerHTML = `<h1>${esc(data.preface?.title || "阅读前导读")}</h1><p class="kicker">${esc(data.preface?.goal || "")}</p><div class="preface-grid">${cards.map((card) => `<article class="preface-card"><h2>${esc(card.title)}</h2><p>${esc(card.body)}</p></article>`).join("")}</div>`;
  const timelineNode = renderPrefaceTimelineNode(data.preface?.topic_timeline);
  if (timelineNode) root.appendChild(timelineNode);
  root.insertAdjacentHTML("beforeend", renderReadingGuide(data.preface));
}
function blockHtml(block, sideName) {
  return sideName === "translation"
    ? block.translation_html || ""
    : block.source_html || "";
}
function renderReadingRegion(blocks, sourceRoot, compareRoot, translationRoot) {
  sourceRoot.innerHTML = blocks
    .map(
      (block) =>
        `<section class="source-block block-${esc(block.kind || "text")}" data-block-id="${esc(block.id || block.block_id)}" data-section-anchor="${esc(block.section_anchor || "")}">${blockHtml(block, "source")}</section>`,
    )
    .join("");
  compareRoot.innerHTML = blocks
    .map(
      (block) =>
        `<section class="aligned-block-pair block-${esc(block.kind || "text")}" data-block-id="${esc(block.id || block.block_id)}" data-section-anchor="${esc(block.section_anchor || "")}"><div class="aligned-source">${blockHtml(block, "source")}</div><div class="aligned-translation">${blockHtml(block, "translation")}</div></section>`,
    )
    .join("");
  translationRoot.innerHTML = blocks
    .map(
      (block) =>
        `<section class="translation-section block-${esc(block.kind || "text")}" data-block-id="${esc(block.id || block.block_id)}" data-section-anchor="${esc(block.section_anchor || "")}">${blockHtml(block, "translation")}</section>`,
    )
    .join("");
  [sourceRoot, compareRoot, translationRoot].forEach(setImageSources);
  applyConceptOverlay(sourceRoot);
  applyConceptOverlay(compareRoot);
}
function renderReading() {
  renderReadingRegion(
    data.reading_blocks || [],
    paper,
    readingFlow,
    translationPaper,
  );
  const appendixBlocks = data.appendix_reading_blocks || [];
  if (appendixBlocks.length) {
    appendixReading.hidden = false;
    renderReadingRegion(
      appendixBlocks,
      appendixPaper,
      appendixReadingFlow,
      appendixTranslationPaper,
    );
  } else {
    appendixReading.hidden = true;
  }
}
function renderSummary() {
  const root = document.querySelector("[data-summary]");
  root.id = "summary";
  root.innerHTML = `<h1>${esc(label("summary", "Summary"))}</h1>${(data.summary?.sections || []).map((section) => `<section class="summary-block"><h2>${esc(section.title)}</h2><p>${esc(section.body || section.markdown || "")}</p></section>`).join("")}`;
}
function referencesById() {
  const refs = [
    ...(data.references?.raw_view?.items || []),
    ...(data.references?.items || []),
    ...(data.references?.item_view?.items || []),
    ...timelineDigestRows(),
  ];
  return new Map(refs.map((ref) => [ref.reference_id, ref]));
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
    ? `<section><h2>${esc(label("possible_questions", "Questions to Consider"))}</h2>${questions.map((item) => `<div class="qa-item"><h3>${esc(item.question)}</h3><p>${esc(item.answer)}</p></div>`).join("")}</section>`
    : "";
  const citationHtml =
    insight.citation_note?.body || roles.length
      ? `<section><h2>${esc(label("citation_clues", "Citation Clues"))}</h2>${insight.citation_note?.body ? `<p>${esc(insight.citation_note.body)}</p>` : ""}${roles
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
  side.innerHTML = `<section><h2>${esc(label("current_position", "Current Position"))}</h2><p>${esc(navItem.title || anchor)}</p></section><section><h2>${esc(label("reading_goal", "Reading Goal"))}</h2><p>${esc(insight.reading_goal || data.preface?.goal || "")}</p></section><section><h2>${esc(label("related_concepts", "Related Concepts"))}</h2><div class="chips">${terms.map(conceptChip).join("")}</div></section>${(insight.misread_warnings || []).length ? `<section><h2>${esc(label("misread_warnings", "Misreading Warnings"))}</h2>${insight.misread_warnings.map((item) => `<p>${esc(item)}</p>`).join("")}</section>` : ""}${renderInsight(insight)}`;
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
function setActiveAnchor(anchor) {
  if (!anchor) return;
  const changed = activeAnchor !== anchor;
  activeAnchor = anchor;
  document
    .querySelectorAll("[data-anchor]")
    .forEach((link) =>
      link.classList.toggle("active", link.dataset.anchor === anchor),
    );
  if (changed) renderSide(anchor);
}
function activeReadingContainers() {
  if (body.classList.contains("mode-original")) return [paper, appendixPaper];
  if (body.classList.contains("mode-translated"))
    return [translationPaper, appendixTranslationPaper];
  return [readingFlow, appendixReadingFlow];
}
function targetForAnchor(anchor) {
  if (anchor === "preface") return document.querySelector("[data-preface]");
  if (anchor === "summary") return document.querySelector("[data-summary]");
  if (anchor === "references")
    return document.querySelector("[data-post-reading]");
  if (anchor === "citation-graph") return graphSection;
  if (anchor === "extensions")
    return document.querySelector("[data-extensions]");
  for (const container of activeReadingContainers()) {
    const target = container?.querySelector(
      `[data-section-anchor="${cssEscape(anchor)}"]`,
    );
    if (target) return target;
  }
  return null;
}
function scrollElementForTarget(node) {
  const rect = node.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) return node;
  return (
    Array.from(node.children || []).find((item) => {
      const childRect = item.getBoundingClientRect();
      const childStyle = window.getComputedStyle(item);
      return (
        childRect.width > 0 &&
        childRect.height > 0 &&
        childStyle.display !== "none" &&
        childStyle.visibility !== "hidden"
      );
    }) || node
  );
}
function closeDigest() {
  modal.hidden = true;
  modal.innerHTML = "";
}
function openDigest(referenceId) {
  const ref = referencesById().get(referenceId);
  if (!ref?.digest_modal?.available) return;
  const result = ref.digest_modal.result || {};
  const markdown = result.digest_markdown || ref.digest_modal.markdown || "";
  const image = result.representative_image || {};
  const imageHtml =
    image.status === "available" &&
    /^data:image\//i.test(String(image.data_url || ""))
      ? `<figure class="digest-representative-image"><img src="${esc(image.data_url)}" alt="${esc(image.alt || image.caption || label("representative_image", "Representative image"))}" loading="lazy"${Number(image.width) > 0 ? ` width="${esc(image.width)}"` : ""}${Number(image.height) > 0 ? ` height="${esc(image.height)}"` : ""}>${image.caption || image.alt ? `<figcaption>${esc(image.caption || image.alt)}</figcaption>` : ""}</figure>`
      : "";
  const warningHtml = result.source_changed
    ? '<div class="digest-warning">Digest source changed since this topic was synthesized.</div>'
    : "";
  const outlineHtml = renderDigestOutline(markdown);
  modal.className = "paper-digest-modal";
  modal.hidden = false;
  modal.innerHTML = `<section class="paper-digest-dialog"><div class="paper-digest-header"><strong>${esc(ref.digest_modal.title || ref.title || label("paper_digest", "Paper digest"))}</strong><button type="button" data-close>${esc(label("close", "Close"))}</button></div><div class="paper-digest-content">${markdown ? `<div class="paper-digest-body${outlineHtml ? "" : " no-outline"}">${outlineHtml}<div class="digest-scroll-body"><div class="digest-modal-intro">${warningHtml}${imageHtml}</div><div class="markdown-body">${renderMarkdown(markdown)}</div></div></div>` : `<div class="empty">${esc(result.status || label("digest_unavailable", "Digest is unavailable."))}</div>`}</div></section>`;
  modal.querySelector("[data-close]")?.addEventListener("click", closeDigest);
}
function referenceSourceLabel(source) {
  return source === "markdown"
    ? label("markdown_references", "markdown references")
    : source || label("raw_references", "raw");
}
function renderReferenceItem(ref, view) {
  if (view === "raw") {
    const rawMarkdown =
      ref.raw_markdown || (typeof ref.raw === "string" ? ref.raw : "");
    return `<article class="reference-item reference-raw-view"><span class="reference-index">${esc(ref.reference_index || "")}</span><pre class="reference-raw-markdown">${esc(rawMarkdown)}</pre></article>`;
  }
  const rawText =
    typeof ref.raw === "string"
      ? ref.raw
      : ref.raw?.raw ||
        ref.raw?.reference_title ||
        ref.raw?.referenceTitle ||
        "";
  const title = ref.title || rawText || "Untitled reference";
  const meta = (ref.authors || []).join(", ");
  const libraryBound = view === "item" && ref.binding_status === "library";
  const hasDigest = Boolean(ref.digest_modal?.available);
  const classes = [
    "reference-item",
    "reference-item-view",
    libraryBound ? "is-library-bound" : "",
    hasDigest ? "has-digest" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const badges =
    view === "item"
      ? `<div class="reference-badges">${libraryBound ? `<span class="reference-badge library">${esc(label("library_item", "Library item"))}</span>` : `<span class="reference-badge muted">${esc(label("no_library_binding", "No library binding"))}</span>`}${ref.bound_paper_ref ? `<span class="reference-badge">${esc(ref.bound_paper_ref)}</span>` : ""}</div>`
      : "";
  const note =
    view === "item" && ref.digest_note?.role_in_current_paper
      ? `<p class="reference-note">${esc(ref.digest_note.role_in_current_paper)}</p>`
      : "";
  const content = `<span class="reference-index">${esc(ref.reference_index || "")}</span><div><p class="reference-title">${esc(title)}</p><div class="reference-meta">${esc(meta)}</div>${badges}${note}</div><div class="reference-year">${esc(ref.year || "")}</div>`;
  return hasDigest
    ? `<button type="button" class="${esc(classes)}" data-digest-ref="${esc(ref.reference_id)}">${content}</button>`
    : `<article class="${esc(classes)}">${content}</article>`;
}
function renderReferences() {
  const itemView = data.references?.item_view || { items: [] };
  const rawView = data.references?.raw_view || {
    items: data.references?.items || [],
    source: data.references?.references_source || "none",
  };
  const itemAvailable = (itemView.items || []).length > 0;
  const forcedRaw = viewerEnvironment.constrained || !itemAvailable;
  const activeView = forcedRaw
    ? "raw"
    : activeReferenceView === "raw"
      ? "raw"
      : "item";
  const viewData = activeView === "item" ? itemView : rawView;
  const controls = forcedRaw
    ? ""
    : `<div class="reference-view-toggle" role="tablist" aria-label="${esc(label("references_view", "References view"))}"><button type="button" data-reference-view="item" aria-selected="${activeView === "item"}">${esc(label("item", "Item"))}</button><button type="button" data-reference-view="raw" aria-selected="${activeView === "raw"}">${esc(label("raw", "Raw"))}</button></div>`;
  const sourceLabel =
    activeView === "item"
      ? label("reference_index", "reference index")
      : referenceSourceLabel(viewData.source);
  return `<section class="structured-references reference-view-${esc(activeView)}" id="references" data-reference-active-view="${esc(activeView)}"><div class="references-summary"><div><strong>${esc(label("references", "References"))}</strong><span>${esc(viewData.reference_count || (viewData.items || []).length || 0)} ${esc(label("paper_count_unit", "papers"))} · ${esc(sourceLabel)}</span></div>${controls}</div><div class="reference-list">${(viewData.items || []).map((ref) => renderReferenceItem(ref, activeView)).join("")}</div></section>`;
}
function renderPostReading() {
  const root = document.querySelector("[data-post-reading]");
  root.innerHTML = renderReferences();
  root.querySelectorAll("[data-reference-view]").forEach((button) =>
    button.addEventListener("click", () => {
      activeReferenceView = button.dataset.referenceView || "item";
      renderPostReading();
    }),
  );
  root
    .querySelectorAll("[data-digest-ref]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        openDigest(button.dataset.digestRef),
      ),
    );
}

function scriptTagText(value) {
  return String(value || "").replace(/<\/script/gi, "<\\/script");
}
function jsonScriptText(value) {
  return JSON.stringify(value || {})
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
function detectConstrainedViewer() {
  const userAgent = String(navigator.userAgent || "");
  const href = String(location.href || "");
  const protocol = String(location.protocol || "");
  const referrer = String(document.referrer || "");
  const uriLike = [href, protocol, referrer].join(" ");
  let embeddedViewer = false;
  try {
    embeddedViewer = window.self !== window.top;
  } catch (_error) {
    embeddedViewer = true;
  }
  const zoteroDetected =
    /\bZotero\b/i.test(userAgent) ||
    typeof globalThis.Zotero !== "undefined" ||
    /\b(?:zotero:|chrome:\/\/zotero|resource:\/\/zotero)\b/i.test(uriLike);
  const hostViewerDetected = zoteroDetected || embeddedViewer;
  let iframeSrcdocSupported = false;
  try {
    iframeSrcdocSupported = "srcdoc" in document.createElement("iframe");
  } catch (_error) {
    iframeSrcdocSupported = false;
  }
  return {
    zoteroDetected: hostViewerDetected,
    constrained: hostViewerDetected || !iframeSrcdocSupported,
    forceGraphFallback: hostViewerDetected || !iframeSrcdocSupported,
  };
}
function applyViewerEnvironment() {
  body.classList.toggle(
    "zotero-viewer-detected",
    viewerEnvironment.zoteroDetected,
  );
  body.classList.toggle(
    "constrained-viewer-detected",
    viewerEnvironment.constrained && !viewerEnvironment.zoteroDetected,
  );
}
function setViewerWarningVisible(visible) {
  const warning = document.querySelector("[data-zotero-viewer-warning]");
  if (!warning) return;
  warning.classList.toggle("is-visible", visible);
  warning.classList.toggle("is-hidden", !visible);
  warning.setAttribute("aria-hidden", visible ? "false" : "true");
  if (visible) {
    warning.setAttribute("role", "alert");
    warning.textContent = label(
      "viewer_warning",
      "Open this HTML in a browser for the full interactive experience.",
    );
    warning.style.setProperty("display", "flex", "important");
    warning.style.setProperty("visibility", "visible", "important");
    warning.style.setProperty("opacity", "1", "important");
    return;
  }
  warning.removeAttribute("role");
  warning.style.removeProperty("display");
  warning.style.removeProperty("visibility");
  warning.style.removeProperty("opacity");
}
function showViewerWarningForGraphFallback() {
  viewerEnvironment.constrained = true;
  if (viewerEnvironment.zoteroDetected) {
    body.classList.add("zotero-viewer-detected");
    body.classList.remove("constrained-viewer-detected");
    return;
  }
  body.classList.add("constrained-viewer-detected");
}
function renderCitationGraphFallback(reason) {
  showViewerWarningForGraphFallback();
  setViewerWarningVisible(true);
  const renderer = window.ZoteroSkillsCitationGraph?.renderCitationGraph;
  const model = data.citation_graph?.model || { nodes: [], edges: [] };
  if (!renderer) {
    graphSection.dataset.zsCgStatus = "failed";
    graphSection.dataset.zsCgError = reason || "renderer_unavailable";
    if (!graphSection.querySelector("[data-static-citation-graph]")) {
      graphSection.innerHTML = `<h2 id="citation-graph">${esc(label("citation_graph", "Citation Graph"))}</h2><p>${esc(label("graph_fallback_note", "The citation graph renderer is unavailable. Open this HTML in a system browser for the full interactive view."))}</p>`;
    }
    return;
  }
  graphSection.dataset.zsCgFallback = "standalone";
  if (reason) graphSection.dataset.zsCgFallbackReason = reason;
  renderer(graphSection, model, {
    readonly: true,
    labels: {
      title: label("citation_graph", "Citation Graph"),
      noGraph: "当前没有可用的图布局坐标。",
      direction: "引用方向",
      incoming: "指向当前节点",
      outgoing: "从当前节点指出",
      importance: "引用重要性",
      nodeSize: "节点大小 = 入站引用数",
      halo: "光环 = 可见节点中高被引项",
      currentPaper: "当前论文",
      scope: "当前论文 2 跳引用邻域",
    },
  });
}
function synthesisCitationGraphHtml(envelope, assets) {
  const locale = envelope?.i18n?.locale || envelope?.locale || "en-US";
  return [
    "<!doctype html>",
    `<html lang="${esc(locale)}">`,
    "<head>",
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    "<style>",
    String(assets.synthesisCss || ""),
    "\nhtml,body,#app{height:100%;margin:0;overflow:hidden}.synthesis-root.standalone-graph-export-root{display:block;width:100%;height:100vh;min-height:0}.standalone-graph-export-main{width:100%;height:100vh;min-height:0}.standalone-graph-export-main .graph-shell{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);height:100vh;min-height:0}.standalone-graph-export-main .graph-stage{height:auto;min-height:0}",
    "</style>",
    "</head>",
    '<body class="synthesis-standalone-export">',
    '<div id="app" class="synthesis-root"></div>',
    "<script>",
    `window.__zoteroSkillsSynthesisGraphExport=${jsonScriptText(envelope)};`,
    "<\/script>",
    "<script>",
    scriptTagText(assets.synthesisThemeJs),
    "<\/script>",
    "<script>",
    scriptTagText(assets.synthesisAppJs),
    "<\/script>",
    "</body>",
    "</html>",
  ].join("\n");
}
function renderCitationGraph() {
  if (!data.citation_graph?.available) {
    if (graphSection) {
      graphSection.hidden = true;
      graphSection.innerHTML = "";
    }
    return;
  }
  if (graphSection) graphSection.hidden = false;
  const envelope = data.citation_graph?.synthesis_export_envelope;
  const assets = window.__ZoteroSkillsDeepReadingCitationGraphAssets || {};
  if (viewerEnvironment.forceGraphFallback) {
    renderCitationGraphFallback(
      viewerEnvironment.zoteroDetected
        ? "zotero_viewer_detected"
        : "constrained_viewer_detected",
    );
    return;
  }
  if (
    !envelope ||
    !assets.synthesisAppJs ||
    !assets.synthesisCss ||
    !graphSection
  ) {
    renderCitationGraphFallback("synthesis_assets_unavailable");
    return;
  }
  graphSection.dataset.zsCgStatus = "initializing";
  delete graphSection.dataset.zsCgError;
  delete graphSection.dataset.zsCgFallback;
  graphSection.innerHTML = `<iframe class="citation-graph-synthesis-frame" title="${esc(label("citation_graph", "Citation Graph"))}" data-citation-graph-synthesis-frame></iframe>`;
  const frame = graphSection.querySelector(
    "[data-citation-graph-synthesis-frame]",
  );
  if (!frame) {
    renderCitationGraphFallback("synthesis_frame_unavailable");
    return;
  }
  let settled = false;
  function fallback(reason) {
    if (settled) return;
    settled = true;
    viewerEnvironment.constrained = true;
    body.classList.add("constrained-viewer-detected");
    renderCitationGraphFallback(reason);
  }
  function confirmSynthesisGraphReady(attempt = 0) {
    window.setTimeout(() => {
      if (settled) return;
      const doc = frame.contentDocument;
      if (doc?.querySelector(".graph-shell")) {
        settled = true;
        graphSection.dataset.zsCgStatus = "ready";
        setViewerWarningVisible(false);
        return;
      }
      if (attempt < 40) {
        confirmSynthesisGraphReady(attempt + 1);
        return;
      }
      if (!doc?.querySelector(".graph-shell")) {
        fallback("synthesis_graph_shell_missing");
        return;
      }
    }, 100);
  }
  frame.addEventListener("load", () => confirmSynthesisGraphReady());
  try {
    frame.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-popups",
    );
    frame.srcdoc = synthesisCitationGraphHtml(envelope, assets);
    confirmSynthesisGraphReady();
  } catch (error) {
    fallback(error?.message || "synthesis_frame_failed");
  }
}
function renderExtensions() {
  const root = document.querySelector("[data-extensions]");
  root.innerHTML = `<h1 id="extensions">${esc(label("extensions", "Extensions"))}</h1>${(data.extensions?.items || []).map((item) => `<article class="extension"><h2>${esc(item.title)}</h2><p>${esc(item.body || item.description || "")}</p></article>`).join("")}`;
}
function initScrollTracking() {
  const anchors = new Set((data.navigation || []).map((item) => item.anchor));

  function rectFor(node) {
    if (!node) return false;
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
    const child = Array.from(node.children || []).find((item) => {
      const childRect = item.getBoundingClientRect();
      const childStyle = window.getComputedStyle(item);
      return (
        childRect.width > 0 &&
        childRect.height > 0 &&
        childStyle.display !== "none" &&
        childStyle.visibility !== "hidden"
      );
    });
    return child ? child.getBoundingClientRect() : rect;
  }

  function isVisible(node) {
    if (!node) return false;
    const rect = rectFor(node);
    const style = window.getComputedStyle(node);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  }

  function anchorForTarget(node) {
    if (node.dataset?.sectionAnchor) return node.dataset.sectionAnchor;
    if (node.dataset?.preface !== undefined) return "preface";
    if (node.dataset?.summary !== undefined) return "summary";
    if (node.dataset?.postReading !== undefined) return "references";
    if (node.dataset?.citationGraph !== undefined) return "citation-graph";
    if (node.dataset?.extensions !== undefined) return "extensions";
    return node.id || "";
  }

  function currentTargets() {
    const readingTargets = activeReadingContainers().flatMap((container) =>
      Array.from(container?.querySelectorAll("[data-section-anchor]") || []),
    );
    return [
      document.querySelector("[data-preface]"),
      ...readingTargets,
      document.querySelector("[data-summary]"),
      document.querySelector("[data-post-reading]"),
      graphSection,
      document.querySelector("[data-extensions]"),
    ].filter((node) => isVisible(node) && anchors.has(anchorForTarget(node)));
  }

  function updateActiveAnchor() {
    scrollUpdateFrame = 0;
    const rootRect = paperScroll.getBoundingClientRect();
    const activationLine =
      rootRect.top + Math.min(180, Math.max(80, rootRect.height * 0.28));
    const visibleTargets = currentTargets()
      .map((node) => ({ node, rect: rectFor(node) }))
      .filter(
        (item) =>
          item.rect.bottom >= rootRect.top + 8 &&
          item.rect.top <= rootRect.bottom - 8,
      );
    if (!visibleTargets.length) return;
    const beforeLine = visibleTargets
      .filter((item) => item.rect.top <= activationLine)
      .sort((a, b) => b.rect.top - a.rect.top);
    const selected =
      beforeLine[0] ||
      visibleTargets.sort((a, b) => a.rect.top - b.rect.top)[0];
    setActiveAnchor(anchorForTarget(selected.node));
  }

  scheduleActiveAnchorUpdate = function () {
    if (scrollUpdateFrame) return;
    scrollUpdateFrame = window.requestAnimationFrame(updateActiveAnchor);
  };

  paperScroll.addEventListener("scroll", scheduleActiveAnchorUpdate, {
    passive: true,
  });
  window.addEventListener("resize", () => {
    syncResponsiveLayout();
    scheduleActiveAnchorUpdate();
  });
  document
    .querySelectorAll("[data-section-anchor]")
    .forEach((node) =>
      node.addEventListener("mouseenter", () =>
        renderSide(node.dataset.sectionAnchor),
      ),
    );
  setActiveAnchor(activeAnchor);
  scheduleActiveAnchorUpdate();
}
function init() {
  body.classList.add("js-ready");
  applyViewerEnvironment();
  setViewerWarningVisible(viewerEnvironment.constrained);
  document.querySelector("[data-paper-title]").textContent =
    data.paper?.title || "Literature Deep Reading";
  document.querySelector("[data-paper-meta]").textContent =
    data.paper?.target_language || "";
  document
    .querySelectorAll("[data-mode]")
    .forEach((button) =>
      button.addEventListener("click", () => setMode(button.dataset.mode)),
    );
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeDigest();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeDigest();
  });
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
  syncResponsiveLayout();
  setMode("compare");
}
init();
