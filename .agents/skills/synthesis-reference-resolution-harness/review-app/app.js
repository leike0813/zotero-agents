const state = {
  seed: null,
  reviewState: null,
  currentSource: "",
  selectedReference: "",
  referenceFilter: "all",
  sourceQuery: "",
  paperQuery: "",
};

const els = {
  fixtureLabel: document.querySelector("#fixtureLabel"),
  saveStatus: document.querySelector("#saveStatus"),
  exportButton: document.querySelector("#exportButton"),
  sourceSearch: document.querySelector("#sourceSearch"),
  paperSearch: document.querySelector("#paperSearch"),
  sourceList: document.querySelector("#sourceList"),
  referenceList: document.querySelector("#referenceList"),
  paperList: document.querySelector("#paperList"),
  edgeLayer: document.querySelector("#edgeLayer"),
  edgeEmpty: document.querySelector("#edgeEmpty"),
  currentSourceTitle: document.querySelector("#currentSourceTitle"),
  sourceStats: document.querySelector("#sourceStats"),
};

function text(value) {
  return String(value || "").trim();
}

function itemKeyOf(paper) {
  return text(paper.itemKey || paper.item_key);
}

function literatureItemIdOf(paper) {
  return text(paper.literatureItemId || paper.literature_item_id);
}

function sourceKeyOf(reference) {
  return text(reference.source_item_key || reference.sourceItemKey);
}

function referenceTitle(reference) {
  return text(
    reference.parsed_title || reference.parsedTitle || reference.title,
  );
}

function paperTitle(paper) {
  return text(paper.title);
}

function authors(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean).join("; ") : "";
}

function byItemKey() {
  return new Map(state.seed.papers.map((paper) => [itemKeyOf(paper), paper]));
}

function byEdgeId() {
  return new Map(state.seed.edges.map((edge) => [edge.id, edge]));
}

function decisionFor(referenceId) {
  return state.reviewState.decisions[referenceId] || null;
}

function effectiveStatus(reference) {
  const decision = decisionFor(reference.reference_instance_id);
  if (decision) {
    return decision.label === "match" ? "confirmed" : "reviewed";
  }
  return reference.seed_status;
}

function setStatus(message) {
  els.saveStatus.textContent = message;
}

function setSelectedReference(referenceId) {
  state.selectedReference = referenceId;
  render();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `request failed: ${path}`);
  }
  return data;
}

async function saveDecision(referenceId, patch) {
  const existing = decisionFor(referenceId) || {};
  const payload = {
    reference_instance_id: referenceId,
    label: patch.label || existing.label || "external_or_missing",
    target_item_key: patch.target_item_key ?? existing.target_item_key ?? "",
    target_literature_item_id:
      patch.target_literature_item_id ??
      existing.target_literature_item_id ??
      "",
    rejected_target_item_keys:
      patch.rejected_target_item_keys ??
      existing.rejected_target_item_keys ??
      [],
    evidence: patch.evidence || existing.evidence || ["human_review"],
    rationale: patch.rationale || existing.rationale || "human review",
  };
  try {
    setStatus("Saving");
    const result = await api("/api/decision", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    state.reviewState = result.state;
    setStatus("Saved");
    render();
  } catch (error) {
    setStatus(error.message);
    console.error(error);
  }
}

function rejectEdge(referenceId, targetItemKey) {
  const existing = decisionFor(referenceId) || {};
  const rejected = Array.from(
    new Set([...(existing.rejected_target_item_keys || []), targetItemKey]),
  );
  const wasCurrentMatch = existing.target_item_key === targetItemKey;
  return saveDecision(referenceId, {
    label: wasCurrentMatch
      ? "external_or_missing"
      : existing.label || "external_or_missing",
    target_item_key: wasCurrentMatch ? "" : existing.target_item_key || "",
    target_literature_item_id: wasCurrentMatch
      ? ""
      : existing.target_literature_item_id || "",
    rejected_target_item_keys: rejected,
    evidence: ["human_review", "rejected_candidate"],
    rationale: "candidate rejected during manual review",
  });
}

function confirmEdge(referenceId, targetItemKey) {
  const paper = byItemKey().get(targetItemKey);
  if (!paper) return;
  return saveDecision(referenceId, {
    label: "match",
    target_item_key: targetItemKey,
    target_literature_item_id: literatureItemIdOf(paper),
    evidence: ["human_review", "confirmed_edge"],
    rationale: "manually confirmed in reference resolution review UI",
  });
}

function markReference(referenceId, label) {
  return saveDecision(referenceId, {
    label,
    target_item_key: "",
    target_literature_item_id: "",
    evidence: ["human_review", `marked_${label}`],
    rationale: `manually marked as ${label}`,
  });
}

function sourcePapers() {
  const query = state.sourceQuery.toLowerCase();
  return state.seed.source_papers.filter((paper) => {
    const haystack =
      `${paper.title} ${paper.year} ${paper.item_key}`.toLowerCase();
    return !query || haystack.includes(query);
  });
}

function referencesForCurrentSource() {
  return state.seed.references
    .filter((reference) => sourceKeyOf(reference) === state.currentSource)
    .filter((reference) => {
      if (state.referenceFilter === "all") return true;
      if (state.referenceFilter === "unresolved") {
        return effectiveStatus(reference) === "unresolved";
      }
      if (state.referenceFilter === "candidate") {
        return effectiveStatus(reference) === "candidate";
      }
      if (state.referenceFilter === "confirmed") {
        return effectiveStatus(reference) === "confirmed";
      }
      return true;
    });
}

function seedEdgeFor(referenceId, targetItemKey) {
  return byEdgeId().get(`${referenceId}::${targetItemKey}`) || null;
}

function manualEdge(referenceId, targetItemKey, kind = "confirmed") {
  const paper = byItemKey().get(targetItemKey);
  return {
    id: `${referenceId}::${targetItemKey}`,
    reference_instance_id: referenceId,
    target_item_key: targetItemKey,
    target_literature_item_id: literatureItemIdOf(paper || {}),
    kind,
    confidence: kind === "confirmed" ? "high" : "review",
    score: kind === "confirmed" ? 1 : 0,
    evidence: ["human_review"],
    reason:
      kind === "confirmed" ? "human confirmed edge" : "human rejected edge",
    source: "human-review",
  };
}

function effectiveEdgesForReference(reference) {
  const referenceId = reference.reference_instance_id;
  const decision = decisionFor(referenceId);
  const rejected = new Set(decision?.rejected_target_item_keys || []);
  const edgeMap = byEdgeId();
  const result = new Map();

  for (const id of [
    ...(reference.confirmed_edges || []),
    ...(reference.candidate_edges || []),
  ]) {
    const edge = edgeMap.get(id);
    if (!edge) continue;
    if (rejected.has(edge.target_item_key)) {
      result.set(edge.target_item_key, {
        ...edge,
        kind: "rejected",
        source: `${edge.source}+human-review`,
      });
      continue;
    }
    result.set(edge.target_item_key, edge);
  }

  if (decision?.target_item_key) {
    const existing =
      seedEdgeFor(referenceId, decision.target_item_key) ||
      manualEdge(referenceId, decision.target_item_key);
    result.set(decision.target_item_key, {
      ...existing,
      kind: decision.label === "match" ? "confirmed" : "candidate",
      confidence: decision.label === "match" ? "high" : "review",
      evidence: Array.from(
        new Set([...(existing.evidence || []), ...(decision.evidence || [])]),
      ),
      reason: decision.rationale || existing.reason,
      source: `${existing.source}+human-review`,
    });
  }

  return Array.from(result.values()).sort((left, right) => {
    const rank = { confirmed: 0, candidate: 1, rejected: 2 };
    return (
      rank[left.kind] - rank[right.kind] ||
      right.score - left.score ||
      left.target_item_key.localeCompare(right.target_item_key)
    );
  });
}

function relevantPaperKeys() {
  const keys = new Set();
  for (const reference of referencesForCurrentSource()) {
    for (const edge of effectiveEdgesForReference(reference)) {
      keys.add(edge.target_item_key);
    }
  }
  return keys;
}

function papersForPanel() {
  const query = state.paperQuery.toLowerCase();
  const relevant = relevantPaperKeys();
  return [...state.seed.papers]
    .filter((paper) => {
      const identifiers = (paper.identifiers || [])
        .map((identifier) => identifier.value)
        .join(" ");
      const haystack =
        `${paperTitle(paper)} ${paper.year} ${authors(paper.authors)} ${identifiers} ${itemKeyOf(paper)}`.toLowerCase();
      return !query || haystack.includes(query);
    })
    .sort((left, right) => {
      const a = relevant.has(itemKeyOf(left)) ? 0 : 1;
      const b = relevant.has(itemKeyOf(right)) ? 0 : 1;
      return a - b || paperTitle(left).localeCompare(paperTitle(right));
    });
}

function renderSources() {
  const rows = sourcePapers();
  els.sourceList.innerHTML = "";
  for (const paper of rows) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `source-card ${paper.item_key === state.currentSource ? "active" : ""}`;
    button.innerHTML = `
      <div class="title">${paper.title}</div>
      <div class="meta">${paper.year || "n.d."} · ${paper.reference_count} refs</div>
      <div class="badge-row">
        <span class="badge confirmed">${paper.confirmed_count} linked</span>
        <span class="badge candidate">${paper.candidate_count} candidates</span>
      </div>
    `;
    button.addEventListener("click", () => {
      state.currentSource = paper.item_key;
      const first = state.seed.references.find(
        (reference) => sourceKeyOf(reference) === state.currentSource,
      );
      state.selectedReference = first?.reference_instance_id || "";
      render();
    });
    els.sourceList.append(button);
  }
}

function renderReferences() {
  const references = referencesForCurrentSource();
  const source = state.seed.source_papers.find(
    (paper) => paper.item_key === state.currentSource,
  );
  els.currentSourceTitle.textContent = source?.title || "References";
  els.sourceStats.textContent = source
    ? `${source.reference_count} references · ${source.confirmed_count} linked · ${source.candidate_count} candidates`
    : "";
  els.referenceList.innerHTML = "";
  if (!references.length) {
    els.referenceList.innerHTML = `<div class="empty-state">No references in this filter</div>`;
    return;
  }
  for (const reference of references) {
    const decision = decisionFor(reference.reference_instance_id);
    const card = document.createElement("article");
    card.className = `reference-card ${reference.reference_instance_id === state.selectedReference ? "active" : ""}`;
    card.tabIndex = 0;
    card.draggable = true;
    card.dataset.referenceId = reference.reference_instance_id;
    card.innerHTML = `
      <div class="title">#${reference.reference_index + 1} ${referenceTitle(reference) || "Untitled reference"}</div>
      <div class="meta">${reference.year || "n.d."} · ${authors(reference.authors)}</div>
      <div class="raw">${text(reference.raw_reference)}</div>
      <div class="badge-row">
        <span class="badge ${effectiveStatus(reference)}">${decision ? decision.label : reference.seed_status}</span>
        ${(decision?.rejected_target_item_keys || []).map((itemKey) => `<span class="badge rejected">rejected ${itemKey}</span>`).join("")}
      </div>
      <div class="edge-actions">
        ${effectiveEdgesForReference(reference)
          .map(
            (edge) => `
              <button type="button" data-confirm-edge="${edge.target_item_key}">${edge.kind === "confirmed" ? "Keep" : "Confirm"} ${edge.target_item_key}</button>
              <button type="button" data-reject-edge="${edge.target_item_key}">Reject ${edge.target_item_key}</button>
            `,
          )
          .join("")}
      </div>
      <div class="action-row">
        <button type="button" data-mark="external_or_missing">External</button>
        <button type="button" data-mark="ambiguous">Ambiguous</button>
        <button type="button" data-mark="ignore">Ignore</button>
      </div>
    `;
    card.addEventListener("click", () =>
      setSelectedReference(reference.reference_instance_id),
    );
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        setSelectedReference(reference.reference_instance_id);
      }
    });
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData(
        "text/reference-id",
        reference.reference_instance_id,
      );
      setSelectedReference(reference.reference_instance_id);
    });
    card.querySelectorAll("[data-confirm-edge]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        confirmEdge(
          reference.reference_instance_id,
          button.dataset.confirmEdge,
        );
      });
    });
    card.querySelectorAll("[data-reject-edge]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        rejectEdge(reference.reference_instance_id, button.dataset.rejectEdge);
      });
    });
    card.querySelectorAll("[data-mark]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        markReference(reference.reference_instance_id, button.dataset.mark);
      });
    });
    els.referenceList.append(card);
  }
  requestAnimationFrame(renderEdges);
}

function renderPapers() {
  const rows = papersForPanel();
  const relevant = relevantPaperKeys();
  els.paperList.innerHTML = "";
  for (const paper of rows) {
    const itemKey = itemKeyOf(paper);
    const card = document.createElement("article");
    card.className = `paper-card ${relevant.has(itemKey) ? "active" : ""}`;
    card.tabIndex = 0;
    card.dataset.itemKey = itemKey;
    card.innerHTML = `
      <div class="title">${paperTitle(paper)}</div>
      <div class="meta">${paper.year || "n.d."} · ${authors(paper.authors)}</div>
      <div class="badge-row">
        <span class="badge">${itemKey}</span>
        ${(paper.identifiers || [])
          .filter((identifier) => identifier.kind === "citekey")
          .map(
            (identifier) =>
              `<span class="badge candidate">${identifier.value}</span>`,
          )
          .join("")}
      </div>
      <div class="action-row">
        <button type="button" data-connect="${itemKey}">Connect</button>
      </div>
    `;
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("drop-target");
    });
    card.addEventListener("dragleave", () =>
      card.classList.remove("drop-target"),
    );
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("drop-target");
      const referenceId =
        event.dataTransfer.getData("text/reference-id") ||
        state.selectedReference;
      if (referenceId) confirmEdge(referenceId, itemKey);
    });
    card.querySelector("[data-connect]").addEventListener("click", () => {
      if (state.selectedReference)
        confirmEdge(state.selectedReference, itemKey);
    });
    els.paperList.append(card);
  }
  requestAnimationFrame(renderEdges);
}

function escapeSelector(value) {
  return window.CSS?.escape
    ? CSS.escape(value)
    : String(value).replace(/["\\]/g, "\\$&");
}

function renderEdges() {
  els.edgeLayer.innerHTML = "";
  const references = referencesForCurrentSource();
  const width = els.edgeLayer.clientWidth || 180;
  const height = els.edgeLayer.clientHeight || 400;
  els.edgeLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const stageRect = els.edgeLayer.getBoundingClientRect();
  let rendered = 0;

  for (const reference of references) {
    const referenceEl = els.referenceList.querySelector(
      `[data-reference-id="${escapeSelector(reference.reference_instance_id)}"]`,
    );
    if (!referenceEl) continue;
    const referenceRect = referenceEl.getBoundingClientRect();
    const y1 = referenceRect.top + referenceRect.height / 2 - stageRect.top;
    const referenceVisible = y1 >= -80 && y1 <= height + 80;
    if (!referenceVisible) continue;

    for (const edge of effectiveEdgesForReference(reference)) {
      const paperEl = els.paperList.querySelector(
        `[data-item-key="${escapeSelector(edge.target_item_key)}"]`,
      );
      if (!paperEl) continue;
      const paperRect = paperEl.getBoundingClientRect();
      const y2 = paperRect.top + paperRect.height / 2 - stageRect.top;
      const paperVisible = y2 >= -80 && y2 <= height + 80;
      if (!paperVisible) continue;

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute(
        "d",
        `M 8 ${y1} C ${width * 0.4} ${y1}, ${width * 0.6} ${y2}, ${width - 8} ${y2}`,
      );
      path.setAttribute(
        "class",
        `edge-line ${edge.kind} ${
          reference.reference_instance_id === state.selectedReference
            ? "selected"
            : "ambient"
        }`,
      );
      path.setAttribute(
        "aria-label",
        `${edge.kind} edge from ${reference.reference_instance_id} to ${edge.target_item_key}`,
      );
      path.addEventListener("click", () =>
        edge.kind === "candidate"
          ? confirmEdge(edge.reference_instance_id, edge.target_item_key)
          : rejectEdge(edge.reference_instance_id, edge.target_item_key),
      );
      els.edgeLayer.append(path);
      rendered += 1;
    }
  }

  els.edgeEmpty.style.display = rendered ? "none" : "grid";
}

function render() {
  if (!state.seed) return;
  renderSources();
  renderReferences();
  renderPapers();
  renderEdges();
}

async function init() {
  const result = await api("/api/review");
  state.seed = result.seed;
  state.reviewState = result.state;
  state.currentSource = state.seed.source_papers[0]?.item_key || "";
  state.selectedReference =
    state.seed.references.find(
      (reference) => sourceKeyOf(reference) === state.currentSource,
    )?.reference_instance_id || "";
  els.fixtureLabel.textContent = result.paths.fixture;
  render();
}

document.querySelectorAll("[data-ref-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .querySelectorAll("[data-ref-filter]")
      .forEach((entry) => entry.classList.remove("active"));
    button.classList.add("active");
    state.referenceFilter = button.dataset.refFilter;
    render();
  });
});

els.sourceSearch.addEventListener("input", () => {
  state.sourceQuery = els.sourceSearch.value;
  renderSources();
});

els.paperSearch.addEventListener("input", () => {
  state.paperQuery = els.paperSearch.value;
  renderPapers();
});

els.referenceList.addEventListener("scroll", () =>
  requestAnimationFrame(renderEdges),
);
els.paperList.addEventListener("scroll", () =>
  requestAnimationFrame(renderEdges),
);

els.exportButton.addEventListener("click", async () => {
  setStatus("Exporting");
  const result = await api("/api/export", { method: "POST" });
  setStatus(`Exported ${result.summary.reference_count} labels`);
});

window.addEventListener("resize", renderEdges);

init().catch((error) => {
  setStatus(error.message);
  console.error(error);
});
