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
} from "../../src/shared/synthesisWorkbenchI18nContract";
import {
  ConceptsRegion,
  createConceptDisplayNameResolver,
  projectConceptReviewItemView,
  projectConceptRowView,
  type ConceptsRegionProps,
  type SynthesisWorkbenchConceptsSelection,
} from "../../src/synthesis/components/ConceptsRegion";

// Gap keys the region resolves through the injected t (integration adds them
// to the i18n SSOT); the test merge map plays the integration role.
const EXTRA_MESSAGES: Record<string, string> = {
  "synthesis-confirm-delete-concepts": "Delete %count% concept(s)?",
  "synthesis-concepts-select-row": "Select %label%",
};

function translate(key: string, vars?: Record<string, unknown>): string {
  const template =
    EXTRA_MESSAGES[key] ||
    (SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES as Record<string, string>)[key] ||
    key;
  return formatSynthesisWorkbenchMessage(template, vars);
}

const WIRE_ROWS = [
  {
    concept_id: "c1",
    label: "Graph Neural Networks",
    short_definition: "Neural networks operating on graph structures",
    concept_type: "method",
    domain: "Machine Learning",
    aliases: ["GNN", "graph network"],
    status: "active",
  },
  {
    concept_id: "c2",
    label: "Attention",
    definition: "Attention mechanism",
    concept_type: "topic",
    domain: "",
    aliases: [],
    status: "review",
  },
];

const WIRE_REVIEW_ITEM = {
  review_id: "rv-1",
  label: "Graph Networks",
  short_definition: "A proposed concept",
  reason: "new_concept",
  status: "open",
  confidence: "high",
  concept_type: "method",
  domain: "Machine Learning",
  topic_id: "topic-1",
  topic_relevance: "0.9",
  candidate_concept_ids: ["c1"],
};

function makeSelection(
  overrides: Partial<SynthesisWorkbenchConceptsSelection> = {},
): SynthesisWorkbenchConceptsSelection {
  const resolveLabel = createConceptDisplayNameResolver(WIRE_ROWS);
  return {
    search: "",
    conceptType: "all",
    status: "all",
    overlayEnabled: false,
    conceptTypes: ["method", "topic"],
    projectionStale: false,
    rowCount: WIRE_ROWS.length,
    rows: WIRE_ROWS.map(projectConceptRowView),
    reviewItems: [projectConceptReviewItemView(WIRE_REVIEW_ITEM, resolveLabel)],
    reviewMergeTargets: {},
    pendingOperationKeys: [],
    ...overrides,
  };
}

describe("synthesis concepts region (src/synthesis/components/ConceptsRegion)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
    (window as unknown as { confirm: (message?: string) => boolean }).confirm =
      () => true;
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function flushPreact(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function renderRegion(selection: SynthesisWorkbenchConceptsSelection) {
    const actions: Array<{ action: string; payload: Record<string, unknown> }> =
      [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onAction: ConceptsRegionProps["onAction"] = (action, payload) => {
      actions.push({ action, payload: payload || {} });
    };
    const props: ConceptsRegionProps = { selection, t: translate, onAction };
    render(h(ConceptsRegion, props), container);
    return { container, actions, onAction };
  }

  function dispatchChange(element: Element, value: string) {
    (element as HTMLInputElement | HTMLSelectElement).value = value;
    element.dispatchEvent(new window.Event("change", { bubbles: true }));
  }

  function filterSelects(container: HTMLElement) {
    return container.querySelectorAll<HTMLSelectElement>(".filters select");
  }

  it("renders filters, cache status, the concept table and the review panel", function () {
    const { container } = renderRegion(makeSelection());
    const search = container.querySelector<HTMLInputElement>(
      '.filters input[data-synthesis-control-key="concepts.search"]',
    );
    assert.ok(search, "search input exists");
    assert.equal(search!.placeholder, "Search concepts");

    const selects = filterSelects(container);
    assert.equal(selects.length, 2, "type and status filter selects");
    const typeOptions = Array.from(selects[0].options).map(
      (option) => option.value,
    );
    assert.deepEqual(typeOptions, ["all", "method", "topic"]);
    const statusOptions = Array.from(selects[1].options).map(
      (option) => option.textContent,
    );
    assert.deepEqual(statusOptions, ["All", "Active", "Review", "Deprecated"]);

    const overlayButton = container.querySelector<HTMLButtonElement>(
      ".panel-toolbar .filters button",
    );
    assert.equal(overlayButton!.textContent, "Overlay Off");
    assert.isNotOk(overlayButton!.classList.contains("active"));

    const statusBadge = container.querySelector(".details .badge")!;
    assert.ok(statusBadge.classList.contains("ok"));
    assert.equal(statusBadge.textContent, "Concept cache ready");
    assert.equal(
      container.querySelector(".details .muted")!.textContent,
      "2 concepts",
    );

    const table = container.querySelector("table.concept-table")!;
    assert.ok(table, "concept table exists");
    assert.equal(table.querySelectorAll("thead th").length, 8);
    const rows = table.querySelectorAll("tbody tr.concept-row");
    assert.equal(rows.length, 2);
    const firstRow = rows[0];
    assert.equal(
      firstRow.querySelector(".concept-row-label")!.textContent,
      "Graph Neural Networks",
    );
    assert.equal(
      firstRow.querySelector(".concept-definition-cell")!.textContent,
      "Neural networks operating on graph structures",
    );
    const typeCells = firstRow.querySelectorAll(".concept-cell-center");
    assert.equal(typeCells[0].textContent, "Method");
    const aliasPills = firstRow.querySelectorAll(".concept-alias-pill");
    assert.equal(aliasPills.length, 2);
    assert.equal(aliasPills[0].textContent, "GNN");
    // Second row: empty domain and alias list render the "-" placeholder.
    assert.equal(
      rows[1].querySelectorAll(".concept-cell-center")[1].textContent,
      "-",
    );
    assert.ok(rows[1].querySelector(".concept-alias-cell .muted"));

    const reviewPanel = container.querySelector(
      "section.concept-review-panel.inline-review-panel",
    );
    assert.ok(reviewPanel, "inline review panel rendered");
    assert.equal(
      reviewPanel!.querySelector(".review-drawer-header strong")!.textContent,
      "Concept review",
    );
    assert.equal(
      reviewPanel!.querySelector(".review-card-title strong")!.textContent,
      "Review proposal",
    );
    const candidatePills = reviewPanel!.querySelectorAll(
      ".concept-candidate-pill",
    );
    assert.equal(candidatePills.length, 1);
    assert.equal(candidatePills[0].textContent, "Graph Neural Networks");
    assert.equal(candidatePills[0].getAttribute("title"), "c1");
    const detailRows = reviewPanel!.querySelectorAll(
      ".review-card-metadata .detail-row",
    );
    assert.equal(detailRows.length, 6);
  });

  it("emits setFilters and setConceptOverlay actions from the toolbar", function () {
    const { container, actions } = renderRegion(makeSelection());
    const search = container.querySelector<HTMLInputElement>(
      '.filters input[data-synthesis-control-key="concepts.search"]',
    )!;
    search.value = "graph";
    search.dispatchEvent(new window.Event("input", { bubbles: true }));

    const selects = filterSelects(container);
    dispatchChange(selects[0], "method");
    dispatchChange(selects[1], "review");

    container
      .querySelector<HTMLButtonElement>(".panel-toolbar .filters button")!
      .click();

    assert.deepEqual(actions, [
      { action: "setFilters", payload: { concepts: { search: "graph" } } },
      {
        action: "setFilters",
        payload: { concepts: { conceptType: "method" } },
      },
      { action: "setFilters", payload: { concepts: { status: "review" } } },
      { action: "setConceptOverlay", payload: { enabled: true } },
    ]);
  });

  it("deletes a single concept through hostCommand after confirmation", function () {
    const confirms: string[] = [];
    (window as unknown as { confirm: (message?: string) => boolean }).confirm =
      (message?: string) => {
        confirms.push(String(message));
        return true;
      };
    const { container, actions } = renderRegion(makeSelection());
    const deleteButton = container.querySelector<HTMLButtonElement>(
      "tbody tr.concept-row .concept-action-cell button",
    )!;
    deleteButton.click();
    assert.deepEqual(confirms, ["Delete 1 concept(s)?"]);
    assert.deepEqual(actions, [
      {
        action: "hostCommand",
        payload: {
          command: "deleteConceptEntry",
          args: { conceptIds: ["c1"] },
        },
      },
    ]);
  });

  it("does not dispatch the delete hostCommand when confirmation is cancelled", function () {
    (window as unknown as { confirm: (message?: string) => boolean }).confirm =
      () => false;
    const { container, actions } = renderRegion(makeSelection());
    container
      .querySelector<HTMLButtonElement>(
        "tbody tr.concept-row .concept-action-cell button",
      )!
      .click();
    assert.deepEqual(actions, []);
  });

  it("tracks bulk selection locally and deletes the selected set", async function () {
    const { container, actions } = renderRegion(makeSelection());
    const bulkBar = container.querySelector(".concept-bulk-bar")!;
    assert.ok(bulkBar, "bulk bar rendered when rows are visible");
    const selectAll = bulkBar.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    assert.isNotOk(selectAll.checked);
    const deleteSelected = bulkBar.querySelector<HTMLButtonElement>("button")!;
    assert.isTrue(deleteSelected.disabled, "disabled until a selection exists");
    assert.equal(
      bulkBar.querySelector(".muted")!.textContent,
      "Select concepts for bulk actions",
    );

    selectAll.click();
    await flushPreact();
    assert.isTrue(selectAll.checked);
    assert.isFalse(deleteSelected.disabled);
    assert.equal(
      bulkBar.querySelector(".muted")!.textContent,
      "2 concept(s) selected",
    );
    assert.deepEqual(actions, [], "selection never hits the host");

    deleteSelected.click();
    assert.deepEqual(actions, [
      {
        action: "hostCommand",
        payload: {
          command: "deleteConceptEntry",
          args: { conceptIds: ["c1", "c2"] },
        },
      },
    ]);

    // Unchecking one row drops the select-all state.
    const rowCheckbox = container.querySelector<HTMLInputElement>(
      'tbody tr.concept-row .concept-selection-cell input[type="checkbox"]',
    )!;
    assert.isTrue(rowCheckbox.checked);
    rowCheckbox.click();
    await flushPreact();
    assert.isFalse(selectAll.checked);
    assert.equal(
      bulkBar.querySelector(".muted")!.textContent,
      "1 concept(s) selected",
    );
  });

  it("dispatches review actions with the frozen applyConceptReviewAction payload", async function () {
    const { container, actions, onAction } = renderRegion(makeSelection());
    const reviewPanel = container.querySelector(".concept-review-panel")!;
    const actionButtons = reviewPanel.querySelectorAll<HTMLButtonElement>(
      ".action-group button",
    );
    const labels = Array.from(actionButtons).map(
      (button) => button.textContent,
    );
    assert.deepEqual(labels, ["Approve as New", "Merge", "Reject"]);
    const mergeButton = actionButtons[1];
    assert.isTrue(
      mergeButton.disabled,
      "merge stays disabled until a target is selected",
    );

    const mergeSelect = reviewPanel.querySelector<HTMLSelectElement>(
      ".concept-review-summary select",
    )!;
    dispatchChange(mergeSelect, "c1");
    assert.deepEqual(actions, [
      {
        action: "setFilters",
        payload: { concepts: { reviewMergeTargets: { "rv-1": "c1" } } },
      },
    ]);

    // The host echoes the merge target back through the selection.
    render(
      h(ConceptsRegion, {
        selection: makeSelection({ reviewMergeTargets: { "rv-1": "c1" } }),
        t: translate,
        onAction,
      }),
      container,
    );
    await flushPreact();
    const mergeButtonAfter = container.querySelectorAll<HTMLButtonElement>(
      ".concept-review-panel .action-group button",
    )[1];
    assert.isFalse(mergeButtonAfter.disabled);
    mergeButtonAfter.click();
    assert.deepEqual(actions[1], {
      action: "hostCommand",
      payload: {
        command: "applyConceptReviewAction",
        args: {
          reviewId: "rv-1",
          action: "merge_into_existing",
          targetConceptId: "c1",
        },
      },
    });

    container
      .querySelectorAll<HTMLButtonElement>(
        ".concept-review-panel .action-group button",
      )[0]!
      .click();
    assert.deepEqual(actions[2], {
      action: "hostCommand",
      payload: {
        command: "applyConceptReviewAction",
        args: { reviewId: "rv-1", action: "approve_create" },
      },
    });
  });

  it("renders alias-audit review items with keep/remove alias actions", function () {
    const aliasItem = projectConceptReviewItemView(
      { ...WIRE_REVIEW_ITEM, review_id: "rv-2", reason: "alias_conflict" },
      createConceptDisplayNameResolver(WIRE_ROWS),
    );
    const { container, actions } = renderRegion(
      makeSelection({ reviewItems: [aliasItem] }),
    );
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      ".concept-review-panel .action-group button",
    );
    const labels = Array.from(buttons).map((button) => button.textContent);
    assert.deepEqual(labels, ["Keep Alias", "Remove Alias"]);
    buttons[0].click();
    buttons[1].click();
    assert.deepEqual(actions, [
      {
        action: "hostCommand",
        payload: {
          command: "applyConceptReviewAction",
          args: { reviewId: "rv-2", action: "keep_alias" },
        },
      },
      {
        action: "hostCommand",
        payload: {
          command: "applyConceptReviewAction",
          args: { reviewId: "rv-2", action: "remove_alias" },
        },
      },
    ]);
  });

  it("navigates and collapses the review panel with local state only", async function () {
    const second = projectConceptReviewItemView(
      { ...WIRE_REVIEW_ITEM, review_id: "rv-2", label: "Second proposal" },
      createConceptDisplayNameResolver(WIRE_ROWS),
    );
    const { container, actions } = renderRegion(
      makeSelection({
        reviewItems: [
          projectConceptReviewItemView(
            WIRE_REVIEW_ITEM,
            createConceptDisplayNameResolver(WIRE_ROWS),
          ),
          second,
        ],
      }),
    );
    const header = container.querySelector(".review-drawer-header")!;
    assert.equal(header.querySelector(".muted")!.textContent, "1 / 2");
    const controls = header.querySelectorAll<HTMLButtonElement>(
      ".review-drawer-controls button",
    );
    controls[1].click();
    await flushPreact();
    assert.equal(
      container.querySelector(".review-drawer-header .muted")!.textContent,
      "2 / 2",
    );
    assert.equal(
      container.querySelector(".concept-review-summary-value strong")!
        .textContent,
      "Second proposal",
    );
    // Wrap-around: next from the last item returns to the first.
    controls[1].click();
    await flushPreact();
    assert.equal(
      container.querySelector(".review-drawer-header .muted")!.textContent,
      "1 / 2",
    );
    assert.deepEqual(actions, [], "review navigation never hits the host");

    controls[2].click();
    await flushPreact();
    const panel = container.querySelector(".concept-review-panel")!;
    assert.ok(panel.classList.contains("is-collapsed"));
    assert.isNull(panel.querySelector(".review-card"));
    assert.deepEqual(actions, []);
  });

  it("renders the empty states for empty and filtered-out concept lists", function () {
    const empty = renderRegion(
      makeSelection({ rows: [], rowCount: 0, reviewItems: [] }),
    );
    const emptyState = empty.container.querySelector(".empty-state")!;
    assert.ok(emptyState.classList.contains("empty-state-info"));
    assert.equal(
      emptyState.querySelector(".empty-state-title")!.textContent,
      "No concepts indexed yet",
    );
    assert.isNull(empty.container.querySelector(".concept-bulk-bar"));
    assert.isNull(empty.container.querySelector(".concept-review-panel"));

    const filtered = renderRegion(
      makeSelection({ rows: [], rowCount: 5, reviewItems: [] }),
    );
    const filteredState = filtered.container.querySelector(".empty-state")!;
    assert.ok(filteredState.classList.contains("empty-state-default"));
    assert.equal(
      filteredState.querySelector(".empty-state-title")!.textContent,
      "No concepts match the current filters",
    );
  });

  it("marks pending host commands busy without dispatching", function () {
    const { container, actions } = renderRegion(
      makeSelection({
        pendingOperationKeys: ["applyConceptReviewAction:rv-1"],
      }),
    );
    const approve = container.querySelector<HTMLButtonElement>(
      ".concept-review-panel .action-group button",
    )!;
    assert.isTrue(approve.disabled);
    assert.equal(approve.getAttribute("aria-busy"), "true");
    assert.ok(approve.querySelector(".button-spinner"));
    approve.click();
    assert.deepEqual(actions, [], "a disabled pending button never dispatches");
  });

  it("keeps subtree identity and local selection state across equal re-renders", async function () {
    const { container, onAction } = renderRegion(makeSelection());
    const selectAll = container.querySelector<HTMLInputElement>(
      '.concept-bulk-bar input[type="checkbox"]',
    )!;
    selectAll.click();
    await flushPreact();
    const captured = captureRegionSubtrees({ concepts: container });

    // Same visible content, fresh object graph: nothing is rebuilt and the
    // component-local selection survives.
    render(
      h(ConceptsRegion, {
        selection: makeSelection(),
        t: translate,
        onAction,
      }),
      container,
    );
    await flushPreact();
    assertRegionSubtreesPreserved({ concepts: container }, captured);
    assert.isTrue(
      container.querySelector<HTMLInputElement>(
        '.concept-bulk-bar input[type="checkbox"]',
      )!.checked,
      "local selection survives an equal-props re-render",
    );

    // A visible change (stale projection badge) rebuilds the region.
    render(
      h(ConceptsRegion, {
        selection: makeSelection({ projectionStale: true }),
        t: translate,
        onAction,
      }),
      container,
    );
    await flushPreact();
    const badge = container.querySelector(".details .badge")!;
    assert.ok(badge.classList.contains("warn"));
    assert.equal(badge.textContent, "Concept cache stale");
  });
});
