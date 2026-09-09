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
import type { SynthesisWorkbenchSnapshot } from "../../src/shared/synthesisWorkbenchWireContract";
import {
  ReviewCenterRegion,
  type SynthesisReviewCenterActionSender,
  type SynthesisWorkbenchReviewCenterSelection,
} from "../../src/synthesis/components/reviewCenter/ReviewCenterRegion";
import type { SynthesisReviewCenterText } from "../../src/synthesis/components/reviewCenter/reviewCenterText";
import { projectSynthesisReviewCenterSelection } from "../../src/synthesis/components/reviewCenter/reviewCenterProjection";

const t: SynthesisReviewCenterText = (key, args = {}) =>
  formatSynthesisWorkbenchMessage(
    SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
    args,
  );

function makeSnapshot(
  overrides: {
    reviews?: Partial<SynthesisWorkbenchSnapshot["reviews"]["filters"]>;
    actions?: SynthesisWorkbenchSnapshot["actions"];
  } = {},
): SynthesisWorkbenchSnapshot {
  return {
    libraryId: 1,
    selectedTab: "reviews",
    actions: overrides.actions || { inFlight: [], warnings: [] },
    maintenance: {
      summary: null,
      backgroundJobs: {
        rows: [],
        activeCount: 0,
        submittedCount: 0,
        queuedCount: 0,
        runningCount: 0,
        waitingCount: 0,
        failedCount: 0,
      },
    },
    storage: { rootState: "ready" },
    preferences: {
      sourceWatchEnabled: true,
      registryAutoRebuild: true,
      graphRebuildMode: "auto",
      stalenessScanEnabled: true,
      debounceMs: 500,
      startupHashCheck: true,
    },
    sync: {
      status: "ready",
      diagnostics: [],
      allowedActions: [],
      requiresConfirmation: false,
    },
    conflicts: { candidates: [] },
    deletedArtifacts: { count: 0, rows: [] },
    artifacts: {
      filters: {
        search: "",
        sourceMaterials: "all",
        freshness: "all",
        sort: "title",
        viewMode: "list",
      },
      rows: [],
      visibleRows: [],
    },
    registry: {
      filters: {
        activeIndexTool: "none",
        search: "",
        scope: "library",
        artifactCoverage: "all",
        bindingStatus: "all",
        canonicalSearch: "",
        canonicalBinding: "all",
        canonicalGraph: "all",
        canonicalRedirects: "all",
        canonicalProposals: "all",
        canonicalDuplicates: "all",
        reviewDrawerOpen: false,
        reviewDrawerIndex: 0,
        expandedSourceRefs: [],
      },
      rows: [
        {
          paper_ref: "1:PAR",
          title: "Parent Paper",
          literature_item_id: "lit-1",
          references: [
            { reference_instance_id: "ref-1", title: "Source Reference" },
          ],
        },
        {
          paper_ref: "1:XYZ",
          title: "Current Target Paper",
          literature_item_id: "lit-2",
          references: [],
        },
      ],
      visibleRows: [],
      cleanupProposals: [
        {
          proposal_id: "c1",
          review_kind: "canonical_revision",
          status: "open",
          reference_title: "Old Canonical",
          source_paper_title: "Parent Paper",
          reason: "stale redirect",
          updated_at: "2026-09-03",
        },
        {
          proposal_id: "c2",
          review_kind: "zotero_item_delete",
          status: "open",
          reference_title: "Doomed ref",
          source_paper_title: "Parent Paper",
          updated_at: "2026-09-04",
        },
      ],
      matchProposals: [
        {
          proposal_id: "p1",
          kind: "zotero_binding",
          status: "open",
          confidence: "high",
          reasons: "score",
          updated_at: "2026-09-01",
          source_raw_reference_ids: ["ref-1"],
          target_item_key: "XYZ",
          target_library_id: 1,
          evidence: { target: { title: "Candidate Target" } },
        },
        {
          proposal_id: "p2",
          kind: "canonical_merge",
          status: "open",
          confidence: "review",
          reasons: "",
          updated_at: "2026-09-02",
          source_canonical_reference_id: "cr-src",
          target_canonical_reference_id: "cr-dst",
        },
      ],
      matchTargetCandidates: [
        {
          kind: "zotero_item",
          libraryId: 1,
          itemKey: "XYZ",
          title: "Current Target Paper",
        },
        {
          kind: "zotero_item",
          libraryId: 1,
          itemKey: "QWE",
          title: "Alpha Candidate",
          year: "2024",
        },
        {
          kind: "canonical_reference",
          canonicalReferenceId: "cr-1",
          title: "Beta Canonical",
          bindingStatus: "accepted",
        },
      ],
      canonicalRows: [],
      visibleCanonicalRows: [],
      canonicalDiagnostics: [],
      cacheStatus: {
        cache_key: "reference-sidecar:library",
        status: "ready",
        diagnostics: [],
        allowedActions: [],
      },
    },
    reviews: {
      filters: {
        activeTab: "reference_matching",
        search: "",
        status: "open",
        kind: "all",
        confidence: "all",
        ...overrides.reviews,
      },
      summary: {
        openCount: 0,
        indexCount: 0,
        referenceMatchingCount: 0,
        conceptCount: 0,
        topicGraphCount: 0,
      },
    },
    tags: {
      filters: {
        search: "",
        facet: "all",
        status: "all",
        view: "vocabulary",
        stagedSearch: "",
        stagedFacet: "all",
        selectedStagedTags: [],
        selectedVocabularyTags: [],
        density: "compact",
        expandedRows: {},
        importDraft: "",
      },
      facets: [],
      rows: [],
      visibleRows: [],
      stagedRows: [],
      visibleStagedRows: [],
      stagedCount: 0,
      stagedFacets: [],
      validationWarnings: [],
      projection: { target: "", stale: false, diagnostics: [] },
      manifest: {},
      importDraft: "",
    },
    topicGraph: {
      filters: { mode: "hierarchy", search: "" },
      nodes: [
        { topic_id: "t1", title: "Topic One" },
        { topic_id: "t2", title: "Topic Two" },
      ],
      edges: [
        {
          edge_id: "e1",
          source_topic_id: "t1",
          target_topic_id: "t2",
          relation: "related_to",
          status: "suggested",
          confidence: 0.8,
          evidence_refs: ["paper:1"],
        },
      ],
      reviewItems: [
        {
          review_id: "tr1",
          source_topic_id: "t1",
          target_topic_id: "t2",
          relation: "narrower_than",
          status: "open",
          reason: "",
        },
      ],
      visibleNodes: [],
      visibleEdges: [],
      inspector: null,
      manifest: {},
      projection: { target: "", stale: false, diagnostics: [] },
      diagnostics: [],
    },
    concepts: {
      filters: {
        search: "",
        conceptType: "all",
        status: "all",
        topicId: "all",
        overlayEnabled: false,
        reviewMergeTargets: {},
      },
      rows: [
        { concept_id: "c1", label: "Concept One" },
        { concept_id: "c2", label: "Concept Two" },
      ],
      visibleRows: [],
      senses: [],
      aliases: [],
      relations: [],
      reviewItems: [
        {
          review_id: "cr1",
          label: "Concept Alpha",
          reason: "new_concept",
          status: "open",
          confidence: "high",
          topic_id: "t1",
          candidate_concept_ids: ["c1", "c2"],
        },
        {
          review_id: "cr2",
          label: "Concept Beta",
          reason: "alias_conflict",
          status: "open",
          topic_id: "t2",
        },
      ],
      overlayEntries: [],
      conceptTypes: [],
      projection: { target: "", stale: false, diagnostics: [] },
      manifest: {},
      diagnostics: [],
    },
    graph: {
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
      nodeKinds: [
        "library_paper",
        "external_reference",
        "unresolved_reference",
      ],
      showLowSignalReferences: true,
      topicScopes: [],
      nodes: [],
      edges: [],
      hoverOnlyNodes: [],
      hoverOnlyEdges: [],
      diagnostics: {},
      window: {
        hasMore: false,
        totalNodes: 0,
        totalEdges: 0,
        totalHoverNodes: 0,
        totalHoverEdges: 0,
        loadedNodes: 0,
        loadedEdges: 0,
        querySignature: "qs-1",
        status: "complete",
        roleOptions: [],
      },
      visibleNodes: [],
      visibleEdges: [],
    },
    reader: { topicId: "", previousTab: "artifacts" },
    hostCommands: [],
  };
}

function project(
  snapshot: SynthesisWorkbenchSnapshot,
): SynthesisWorkbenchReviewCenterSelection {
  return projectSynthesisReviewCenterSelection(snapshot, t, []);
}

describe("synthesis review center region (src/synthesis/components/reviewCenter)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function flushPreact(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function renderRegion(selection: SynthesisWorkbenchReviewCenterSelection) {
    const actions: Array<{ action: string; payload: Record<string, unknown> }> =
      [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onAction: SynthesisReviewCenterActionSender = (action, payload) => {
      actions.push({ action, payload: payload || {} });
    };
    const rerender = (next: SynthesisWorkbenchReviewCenterSelection) =>
      render(
        h(ReviewCenterRegion, { selection: next, t, onAction }),
        container,
      );
    rerender(selection);
    return { container, actions, onAction, rerender };
  }

  function buttonsIn(root: ParentNode, selector = "button") {
    return Array.from(root.querySelectorAll<HTMLButtonElement>(selector));
  }

  function buttonByText(root: ParentNode, text: string) {
    return buttonsIn(root).find(
      (button) => button.textContent?.trim() === text,
    );
  }

  function changeSelect(select: HTMLSelectElement, value: string) {
    select.value = value;
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  }

  it("renders the toolbar and the reference matching table", function () {
    const { container } = renderRegion(project(makeSnapshot()));
    const toolbar = container.querySelector(".review-center-toolbar")!;
    assert.ok(toolbar, "toolbar exists");
    const tabs = buttonsIn(toolbar, ".segmented button");
    assert.equal(tabs.length, 3);
    assert.ok(tabs[0].classList.contains("active"));
    const search = toolbar.querySelector<HTMLInputElement>("input")!;
    assert.equal(search.placeholder, "Search reviews");
    const selects = toolbar.querySelectorAll("select");
    assert.equal(selects.length, 3, "status + kind + confidence selects");

    const wrap = container.querySelector(
      '[data-synthesis-surface="reference-review-table"]',
    )!;
    assert.ok(wrap, "reference review table surface exists");
    assert.ok(wrap.querySelector(".reference-review-bulk-actions"));
    const headers = wrap.querySelectorAll("thead th");
    assert.equal(headers.length, 9, "selection column + 8 content columns");
    const rows = wrap.querySelectorAll("tbody tr");
    assert.equal(rows.length, 4, "2 match proposals + 2 cleanup rows");
    // Proposal row: context titles resolved through the registry lookup.
    const firstCells = rows[0].querySelectorAll("td");
    assert.equal(firstCells[1].textContent, "Source Reference");
    assert.equal(firstCells[2].textContent, "Current Target Paper");
    assert.equal(firstCells[3].textContent, "Parent Paper");
    // open zotero_binding row: Accept / Reject / Manual target.
    const firstActions = buttonsIn(firstCells[8]);
    assert.deepEqual(
      firstActions.map((button) => button.textContent?.trim()),
      ["Accept", "Reject", "Manual target"],
    );
    // canonical_merge row also offers Reverse & accept.
    const secondActions = buttonsIn(rows[1].querySelectorAll("td")[8]);
    assert.deepEqual(
      secondActions.map((button) => button.textContent?.trim()),
      ["Accept", "Reverse & accept", "Reject", "Manual target"],
    );
    // cleanup rows: canonical revision has actions, others point to the index.
    const cleanupActions = rows[2].querySelectorAll("td")[8];
    assert.deepEqual(
      buttonsIn(cleanupActions).map((button) => button.textContent?.trim()),
      ["Accept", "Reject"],
    );
    assert.ok(
      rows[3]
        .querySelectorAll("td")[8]
        .textContent?.includes("Managed in Index Review"),
    );
  });

  it("dispatches setFilters for tabs, search and selects", function () {
    const { container, actions } = renderRegion(project(makeSnapshot()));
    const toolbar = container.querySelector(".review-center-toolbar")!;
    buttonsIn(toolbar, ".segmented button")[1].click();
    const search = toolbar.querySelector<HTMLInputElement>("input")!;
    search.value = "foo";
    search.dispatchEvent(new window.Event("input", { bubbles: true }));
    const selects = toolbar.querySelectorAll<HTMLSelectElement>("select");
    changeSelect(selects[0], "accepted");
    changeSelect(selects[1], "canonical_merge");
    changeSelect(selects[2], "high");
    assert.deepEqual(actions, [
      { action: "setFilters", payload: { reviews: { activeTab: "concepts" } } },
      { action: "setFilters", payload: { reviews: { search: "foo" } } },
      { action: "setFilters", payload: { reviews: { status: "accepted" } } },
      {
        action: "setFilters",
        payload: { reviews: { kind: "canonical_merge" } },
      },
      { action: "setFilters", payload: { reviews: { confidence: "high" } } },
    ]);
  });

  it("queues reference decisions locally and applies them as one batch hostCommand", async function () {
    const { container, actions, rerender } = renderRegion(
      project(makeSnapshot()),
    );
    const wrap = container.querySelector(
      '[data-synthesis-surface="reference-review-table"]',
    )!;
    const applyButton = wrap.querySelector<HTMLButtonElement>(
      ".reference-review-pending-controls > button",
    )!;
    assert.isTrue(applyButton.disabled, "apply disabled without pending");

    const firstRow = wrap.querySelector("tbody tr")!;
    buttonByText(firstRow, "Accept")!.click();
    assert.equal(actions.length, 0, "queueing stays local");
    await flushPreact();
    assert.ok(
      firstRow
        .querySelector(".review-status-stack")!
        .textContent?.includes("Pending Accept"),
      "pending badge rendered",
    );
    assert.isFalse(applyButton.disabled);

    buttonByText(wrap, "Accept all")!.click();
    await flushPreact();
    assert.equal(
      wrap.querySelectorAll(".review-status-stack .review-pending-badge")
        .length,
      2,
      "both proposals pending",
    );

    applyButton.click();
    assert.deepEqual(actions, [
      {
        action: "hostCommand",
        payload: {
          command: "applyReferenceMatchProposalActions",
          args: {
            decisions: [
              { proposalId: "p1", action: "accept" },
              { proposalId: "p2", action: "accept" },
            ],
          },
        },
      },
    ]);

    // The host echo completing the batch clears the local pending badges.
    const completed = project(
      makeSnapshot({
        actions: {
          inFlight: [],
          warnings: [],
          lastCompleted: {
            key: "applyReferenceMatchProposalActions",
            command: "applyReferenceMatchProposalActions",
            status: "completed",
            label: "Apply",
            completed_at: "2026-09-05T00:00:00.000Z",
          },
        },
      }),
    );
    rerender(completed);
    await flushPreact();
    assert.equal(
      container.querySelectorAll(".review-status-stack .review-pending-badge")
        .length,
      0,
      "pending badges cleared after completion echo",
    );
  });

  it("cancels a pending decision locally", async function () {
    const { container, actions } = renderRegion(project(makeSnapshot()));
    const wrap = container.querySelector(
      '[data-synthesis-surface="reference-review-table"]',
    )!;
    const firstRow = wrap.querySelector("tbody tr")!;
    buttonByText(firstRow, "Accept")!.click();
    await flushPreact();
    const cancel = buttonByText(firstRow, "Cancel pending")!;
    assert.ok(cancel, "cancel pending button appears");
    cancel.click();
    await flushPreact();
    assert.notOk(buttonByText(firstRow, "Cancel pending"));
    assert.equal(actions.length, 0, "cancel never reaches the host");
  });

  it("drives row selection checkboxes and selected-only bulk queueing", async function () {
    const { container } = renderRegion(project(makeSnapshot()));
    const wrap = container.querySelector(
      '[data-synthesis-surface="reference-review-table"]',
    )!;
    const rows = wrap.querySelectorAll("tbody tr");
    rows[1]
      .querySelector<HTMLInputElement>(".review-selection-cell input")!
      .click();
    await flushPreact();
    buttonByText(wrap, "Accept selected")!.click();
    await flushPreact();
    const pendingBadges = wrap.querySelectorAll(
      ".review-status-stack .review-pending-badge",
    );
    assert.equal(pendingBadges.length, 1, "only the selected row queued");
    assert.ok(
      rows[1]
        .querySelector(".review-status-stack")!
        .textContent?.includes("Pending Accept"),
    );

    // Select-all header checkbox selects every visible proposal row.
    const headerCheckbox = wrap.querySelector<HTMLInputElement>(
      "thead .review-selection-cell input",
    )!;
    assert.isFalse(headerCheckbox.checked);
    headerCheckbox.click();
    await flushPreact();
    const rowCheckboxes = wrap.querySelectorAll<HTMLInputElement>(
      "tbody .review-selection-cell input",
    );
    assert.ok(rowCheckboxes[0].checked && rowCheckboxes[1].checked);
  });

  it("opens the manual target picker, excludes the current target and queues manual_target", async function () {
    const { container, actions } = renderRegion(project(makeSnapshot()));
    const wrap = container.querySelector(
      '[data-synthesis-surface="reference-review-table"]',
    )!;
    const firstRow = wrap.querySelector("tbody tr")!;
    buttonByText(firstRow, "Manual target")!.click();
    await flushPreact();
    const overlay = container.querySelector(".reference-target-overlay")!;
    assert.ok(overlay, "overlay rendered inside the region");
    const popover = overlay.querySelector(".reference-target-popover")!;
    assert.equal(
      popover.getAttribute("data-proposal-id"),
      "p1",
      "popover bound to the proposal",
    );
    // Only the zotero_item candidate that is not the current target remains.
    const candidateRows = popover.querySelectorAll<HTMLButtonElement>(
      ".reference-target-row",
    );
    assert.equal(candidateRows.length, 1);
    assert.equal(
      candidateRows[0].getAttribute("data-reference-target-key"),
      "zotero:1:QWE",
    );
    assert.equal(
      candidateRows[0].querySelector(".reference-target-title")!.textContent,
      "Alpha Candidate (2024)",
    );
    candidateRows[0].click();
    await flushPreact();
    assert.isNull(
      container.querySelector(".reference-target-overlay"),
      "picking a target closes the picker",
    );
    assert.ok(
      firstRow
        .querySelector(".review-status-stack")!
        .textContent?.includes("Pending Manual target: Alpha Candidate (2024)"),
    );

    wrap
      .querySelector<HTMLButtonElement>(
        ".reference-review-pending-controls > button",
      )!
      .click();
    assert.deepEqual(actions, [
      {
        action: "hostCommand",
        payload: {
          command: "applyReferenceMatchProposalActions",
          args: {
            decisions: [
              {
                proposalId: "p1",
                action: "manual_target",
                target: { kind: "zotero_item", libraryId: 1, itemKey: "QWE" },
                targetLabel: "Alpha Candidate (2024)",
              },
            ],
          },
        },
      },
    ]);
  });

  it("closes the manual target picker on Escape and on overlay click", async function () {
    const { container } = renderRegion(project(makeSnapshot()));
    const firstRow = container.querySelector("tbody tr")!;
    buttonByText(firstRow, "Manual target")!.click();
    await flushPreact();
    const overlay = container.querySelector<HTMLElement>(
      ".reference-target-overlay",
    )!;
    overlay.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await flushPreact();
    assert.isNull(container.querySelector(".reference-target-overlay"));

    buttonByText(firstRow, "Manual target")!.click();
    await flushPreact();
    const overlayAgain = container.querySelector<HTMLElement>(
      ".reference-target-overlay",
    )!;
    overlayAgain.click();
    await flushPreact();
    assert.isNull(container.querySelector(".reference-target-overlay"));
  });

  it("renders the canonical-merge picker with only legal canonical candidates", async function () {
    const { container } = renderRegion(project(makeSnapshot()));
    const rows = container.querySelectorAll("tbody tr");
    buttonByText(rows[1], "Manual target")!.click();
    await flushPreact();
    const popover = container.querySelector(".reference-target-popover")!;
    const candidateRows = popover.querySelectorAll<HTMLButtonElement>(
      ".reference-target-row",
    );
    // canonical_merge proposals only accept canonical_reference candidates
    // that are neither the merge source nor the current target.
    assert.equal(candidateRows.length, 1);
    assert.equal(
      candidateRows[0].getAttribute("data-reference-target-key"),
      "canonical:cr-1",
    );
    assert.ok(
      candidateRows[0].querySelector(".reference-target-binding-pill.accepted"),
      "binding pill rendered for bound candidates",
    );
  });

  it("dispatches concept review actions including merge target selection", async function () {
    const { container, actions } = renderRegion(
      project(makeSnapshot({ reviews: { activeTab: "concepts" } })),
    );
    const table = container.querySelector(".review-concepts-table")!;
    assert.ok(table, "concepts table rendered");
    const rows = table.querySelectorAll("tbody tr");
    assert.equal(rows.length, 2);
    // Candidate pills resolve display names through the concept rows.
    const pills = rows[0].querySelectorAll(".concept-candidate-pill");
    assert.deepEqual(
      Array.from(pills).map((pill) => pill.textContent),
      ["Concept One", "Concept Two"],
    );

    buttonByText(rows[0], "Approve")!.click();
    // Alias conflict rows offer keep/remove instead of approve/merge.
    buttonByText(rows[1], "Keep Alias")!.click();
    assert.deepEqual(actions, [
      {
        action: "hostCommand",
        payload: {
          command: "applyConceptReviewAction",
          args: { reviewId: "cr1", action: "approve_create" },
        },
      },
      {
        action: "hostCommand",
        payload: {
          command: "applyConceptReviewAction",
          args: { reviewId: "cr2", action: "keep_alias" },
        },
      },
    ]);

    // Merge expansion is local; the target select dispatches setFilters.
    buttonByText(rows[0], "Merge")!.click();
    assert.equal(actions.length, 2, "merge toggle stays local");
    await flushPreact();
    const mergeField = rows[0].querySelector(".review-card-field-inline")!;
    assert.ok(mergeField, "merge target row expanded");
    const mergeSelect = mergeField.querySelector<HTMLSelectElement>("select")!;
    assert.equal(mergeSelect.value, "c1", "defaults to the first candidate");
    changeSelect(mergeSelect, "c2");
    assert.deepEqual(actions[2], {
      action: "setFilters",
      payload: { concepts: { reviewMergeTargets: { cr1: "c2" } } },
    });
    // Without an echo, the in-flight merge applies the resolved target (c1).
    buttonByText(mergeField, "Apply merge")!.click();
    assert.deepEqual(actions[3], {
      action: "hostCommand",
      payload: {
        command: "applyConceptReviewAction",
        args: {
          reviewId: "cr1",
          action: "merge_into_existing",
          targetConceptId: "c1",
        },
      },
    });
  });

  it("dispatches topic graph review actions for edges and review items", function () {
    const { container, actions } = renderRegion(
      project(makeSnapshot({ reviews: { activeTab: "topic_graph" } })),
    );
    const table = container.querySelector(".review-topic-graph-table")!;
    assert.ok(table, "topic graph table rendered");
    const rows = table.querySelectorAll("tbody tr");
    assert.equal(rows.length, 2, "one edge row + one review item row");
    assert.deepEqual(
      Array.from(rows[0].querySelectorAll("td"))
        .slice(0, 3)
        .map((cell) => cell.textContent),
      ["Topic One", t("synthesis-relation-related-to"), "Topic Two"],
    );
    const pills = rows[0].querySelectorAll(".review-pill");
    assert.equal(pills.length, 1);
    assert.equal(pills[0].getAttribute("title"), "paper:1");

    buttonByText(rows[0], "Accept")!.click();
    buttonByText(rows[0], "Reject")!.click();
    buttonByText(rows[1], "Approve")!.click();
    assert.deepEqual(actions, [
      {
        action: "hostCommand",
        payload: {
          command: "acceptTopicGraphRelation",
          args: { edgeId: "e1" },
        },
      },
      {
        action: "hostCommand",
        payload: {
          command: "rejectTopicGraphRelation",
          args: { edgeId: "e1" },
        },
      },
      {
        action: "hostCommand",
        payload: {
          command: "applyTopicGraphReviewAction",
          args: { reviewId: "tr1", action: "approve_suggested" },
        },
      },
    ]);
  });

  it("hides canonical revision actions optimistically until a failure echo", async function () {
    const { container, actions, rerender } = renderRegion(
      project(makeSnapshot()),
    );
    const wrap = container.querySelector(
      '[data-synthesis-surface="reference-review-table"]',
    )!;
    const cleanupRow = wrap.querySelectorAll("tbody tr")[2];
    buttonByText(cleanupRow, "Accept")!.click();
    assert.deepEqual(actions, [
      {
        action: "hostCommand",
        payload: {
          command: "applyCanonicalRevisionReviewAction",
          args: { reviewItemId: "c1", action: "accept" },
        },
      },
    ]);
    await flushPreact();
    assert.notOk(
      buttonByText(cleanupRow, "Accept"),
      "optimistically resolved row hides its actions",
    );
    assert.ok(
      cleanupRow.textContent?.includes("Managed by Canonical Revision"),
    );

    // A failed echo for the same operation restores the actions.
    rerender(
      project(
        makeSnapshot({
          actions: {
            inFlight: [],
            warnings: [],
            lastFailed: {
              key: "applyCanonicalRevisionReviewAction:c1",
              command: "applyCanonicalRevisionReviewAction",
              status: "failed",
              label: "Apply",
            },
          },
        }),
      ),
    );
    await flushPreact();
    assert.ok(
      buttonByText(cleanupRow, "Accept"),
      "failure echo restores the action buttons",
    );
  });

  it("renders the empty states of all three tabs", function () {
    const emptySnapshot = makeSnapshot();
    const source = project(emptySnapshot);
    const emptySelection: SynthesisWorkbenchReviewCenterSelection = {
      ...source,
      referenceMatching: { rows: [], cleanupRows: [] },
      concepts: { ...source.concepts, rows: [] },
      topicGraph: { rows: [] },
    };
    const { container, rerender } = renderRegion(emptySelection);
    const emptyIndex = container.querySelector(
      '[data-synthesis-surface="reference-review-table"]',
    )!;
    assert.ok(emptyIndex.classList.contains("empty-state"));
    assert.equal(
      emptyIndex.querySelector(".empty-state-title")?.textContent,
      "No index reviews",
    );

    rerender({
      ...emptySelection,
      filters: { ...emptySelection.filters, activeTab: "concepts" },
    });
    assert.equal(
      container.querySelector(".empty-state-title")?.textContent,
      "No concept reviews",
    );

    rerender({
      ...emptySelection,
      filters: { ...emptySelection.filters, activeTab: "topic_graph" },
    });
    assert.equal(
      container.querySelector(".empty-state-title")?.textContent,
      "No topic graph reviews",
    );
  });

  it("keeps the region subtree identity when an equal selection re-renders", async function () {
    const { container, rerender } = renderRegion(project(makeSnapshot()));
    // Local state must survive an equal-but-fresh selection.
    const firstRow = container.querySelector("tbody tr")!;
    buttonByText(firstRow, "Accept")!.click();
    await flushPreact();
    const regions = { reviewCenter: container };
    const captured = captureRegionSubtrees(regions);

    rerender(project(makeSnapshot()));
    assertRegionSubtreesPreserved(regions, captured);
    assert.ok(
      firstRow
        .querySelector(".review-status-stack")!
        .textContent?.includes("Pending Accept"),
      "local pending state survives an equal re-render",
    );

    // A visible change (parent item title) re-renders the region.
    const changed = makeSnapshot();
    changed.registry.rows[0] = {
      ...(changed.registry.rows[0] as Record<string, unknown>),
      title: "Parent Paper Renamed",
    } as never;
    rerender(project(changed));
    const cells = container
      .querySelectorAll("tbody tr")[0]
      .querySelectorAll("td");
    assert.equal(cells[3].textContent, "Parent Paper Renamed");
  });
});
