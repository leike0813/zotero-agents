import { assert } from "chai";
import { h, render } from "preact";
import { MigrationsRegion } from "../../src/dashboard/components/MigrationsRegion";
import type { DashboardMigrationsSelection } from "../../src/dashboard/components/MigrationsRegion";
import { projectDashboardPanel } from "../../src/dashboard/dashboardPanelModel";
import type { DashboardUiState } from "../../src/dashboard/dashboardTypes";
import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";

function buildMigrationsSelection(
  patch?: Partial<DashboardMigrationsSelection>,
): DashboardMigrationsSelection {
  return {
    view: {
      migrationId: "literature-artifacts",
      definitionVersion: 7,
      availability: "available",
      availabilityReason: "",
      libraryId: 1,
      activeRun: {
        runId: "run-1",
        operationId: "op-1",
        migrationId: "literature-artifacts",
        definitionVersion: 7,
        libraryId: 1,
        state: "preview",
        reason: "",
        processedCount: 0,
        remainingCount: 1,
        setCount: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        terminalAt: "",
        diagnostics: [],
      },
      activeOperationId: "op-1",
      activeRunId: "",
      progress: null,
      primaryDiagnostic: null,
      candidatePage: {
        page: 0,
        pageSize: 25,
        pageCount: 2,
        items: [
          {
            candidateId: "candidate-1",
            ordinal: 1,
            title: "Ready paper",
            classification: "ready",
            outcome: "preview",
            reasonCodes: [],
            diagnostics: [],
            verifiedCount: 1,
            unresolvedCount: 0,
            recoveredCount: 0,
            droppedCount: 0,
            selected: true,
            disposition: "include",
            issues: [],
          },
          {
            candidateId: "candidate-2",
            ordinal: 2,
            title: "Review paper",
            classification: "review_required",
            outcome: "preview",
            reasonCodes: ["unresolved_linkage"],
            diagnostics: ["citation item linkage is unresolved"],
            verifiedCount: 1,
            unresolvedCount: 1,
            recoveredCount: 0,
            droppedCount: 0,
            selected: false,
            disposition: "pending",
            issues: [
              {
                issueId: "issue-linkage",
                reasonCode: "unresolved_linkage",
                status: "pending",
                detail: "unresolved_linkage",
                affectedItems: [
                  {
                    label: "Unknown (2020)",
                    hint: "#3 · 2020",
                    detail: "The full snippet of the unresolved citation mention.",
                  },
                ],
                selectedOptionId: "",
                options: [
                  {
                    optionId: "keep-unresolved",
                    kind: "keep_unresolved",
                    dataLoss: false,
                  },
                ],
              },
            ],
          },
          {
            candidateId: "candidate-3",
            ordinal: 3,
            title: "Blocked paper",
            classification: "blocked",
            outcome: "preview",
            reasonCodes: ["duplicate_reference"],
            diagnostics: ["duplicate reference evidence"],
            verifiedCount: 1,
            unresolvedCount: 0,
            recoveredCount: 0,
            droppedCount: 0,
            selected: false,
            disposition: "pending",
            issues: [
              {
                issueId: "issue-duplicate",
                reasonCode: "duplicate_reference",
                status: "pending",
                detail: "duplicate_reference",
                affectedItems: [
                  {
                    label: "Later copy",
                    hint: "First copy",
                    detail: "DOI:10.0000/example",
                  },
                ],
                selectedOptionId: "",
                options: [
                  {
                    optionId: "merge-duplicates",
                    kind: "merge_duplicates",
                    dataLoss: false,
                  },
                ],
              },
            ],
          },
        ],
        summary: {
          total: 28,
          unfilteredTotal: 28,
          ready: 26,
          reviewRequired: 1,
          blocked: 1,
          selected: 26,
          filteredSelected: 26,
          filteredSelectable: 26,
        },
        query: {
          search: "",
          classification: "",
          reasonCode: "",
          disposition: "",
        },
        availableReasons: ["unresolved_linkage", "duplicate_reference"],
        batchActions: [
          {
            reasonCode: "unresolved_linkage",
            pendingCount: 1,
            kinds: [
              { kind: "keep_unresolved", dataLoss: false },
              { kind: "drop_unresolved", dataLoss: true },
            ],
          },
          {
            reasonCode: "duplicate_reference",
            pendingCount: 1,
            kinds: [
              { kind: "merge_duplicates", dataLoss: false },
              { kind: "skip_candidate", dataLoss: false },
            ],
          },
        ],
      },
      history: [],
    },
    pageTitle: "Migrations",
    migrationTitle: "No preview",
    unavailableText: "Unavailable",
    scanLabel: "Scan",
    applyLabel: "Apply",
    stopLabel: "Stop",
    continueLabel: "Continue",
    copyDiagnosticBundleLabel: "Copy diagnostic bundle",
    reviewLabel: "Review",
    readyLabel: "Ready",
    blockedLabel: "Blocked",
    historyTitle: "History",
    emptyHistoryText: "Empty",
    candidateLabel: "Set",
    progressLabel: "Progress",
    attentionLabel: "Attention",
    previousLabel: "Previous",
    nextLabel: "Next",
    firstLabel: "First page",
    lastLabel: "Last page",
    pageLabel: "Page",
    selectedLabel: "Selected",
    verifiedLabel: "Verified",
    unresolvedLabel: "Unresolved",
    recoveredLabel: "Recovered",
    droppedLabel: "Dropped",
    verifiedHint: "References that were converted and validated.",
    unresolvedHint: "Citation mentions without a matching reference.",
    recoveredHint: "References recovered only from citation snapshots.",
    droppedHint: "Entries discarded for missing title or invalid year.",
    batchLabel: "Batch decisions",
    batchHint: "Apply to every undecided issue of this kind in the current filter.",
    diagnosticsLabel: "Diagnostic details",
    duplicateOfLabel: "Duplicates",
    searchPlaceholder: "Search candidates",
    allLabel: "All",
    classificationFilterLabel: "Classification",
    reasonFilterLabel: "Issue",
    dispositionFilterLabel: "Disposition",
    detailsLabel: "Details",
    closeLabel: "Close",
    approveLabel: "Approve and include",
    skipLabel: "Skip this set",
    issuesLabel: "Issues",
    filteredLabel: "Filtered",
    diagnosticTitle: "Primary diagnostic",
    diagnosticCauseLabel: "Cause",
    diagnosticOperationLabel: "Operation",
    diagnosticOperationIdLabel: "Operation ID",
    diagnosticAttemptIdLabel: "Attempt ID",
    diagnosticPhaseLabel: "Phase",
    diagnosticEffectPhaseLabel: "Effect phase",
    diagnosticRecoveryLabel: "Recovery",
    diagnosticAffectedLabel: "Affected",
    diagnosticResidualLabel: "Residual",
    diagnosticUnavailableText: "Authority evidence unavailable",
    diagnosticRetryHint: "Retry the same operation after checking the cause.",
    diagnosticFreshScanHint: "Run a fresh scan before retrying.",
    diagnosticManualRepairHint: "Manual repair is required before retrying.",
    dispositionLabels: {
      pending: "Pending",
      include: "Included",
      skip: "Skipped",
    },
    outcomeLabels: {
      preview: "Pending",
      applied: "Applied",
      skipped: "Skipped",
      changed_since_scan: "Changed since scan",
      repair_required: "Repair required",
      blocked: "Blocked",
      failed: "Failed",
    },
    runStateLabels: {
      preview: "Pending",
      applying: "Applying",
      completed: "Completed",
      completed_with_attention: "Attention required",
      failed: "Failed",
    },
    optionLabels: {
      keep_unresolved: "Keep as unresolved",
      drop_unresolved: "Discard unresolved mentions",
      merge_duplicates: "Merge duplicate references",
      skip_candidate: "Skip this set",
    },
    reasonLabels: {
      unresolved_linkage: "Unresolved linkage",
      duplicate_reference: "Duplicate reference",
    },
    ...patch,
  };
}

describe("Dashboard literature migration region", function () {
  it("uses an unknown non-actionable version when the host view is absent", function () {
    const panel = projectDashboardPanel(
      {
        generatedAt: "2026-01-01T00:00:00.000Z",
        title: "Tasks",
        labels: {},
        selectedTabKey: "migrations",
        tabs: [{ key: "migrations", label: "Migrations", group: "system" }],
        summary: { total: 0, running: 0, succeeded: 0, failed: 0, canceled: 0 },
        runningRows: [],
        homeWorkflows: [],
      },
      { selectedTabKey: "" } as DashboardUiState,
    );

    assert.equal(panel.views.migrations?.view.definitionVersion, 0);
    assert.equal(panel.views.migrations?.view.activeRun, null);
  });

  it("renders bounded candidate facts and sends only runtime-issued refs", async function () {
    const environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
    const root = document.createElement("div");
    const actions: Array<{ action: string; payload: Record<string, unknown> }> =
      [];
    const selection = buildMigrationsSelection();
    const failedActions: Array<{
      action: string;
      payload: Record<string, unknown>;
    }> = [];
    render(
      h(MigrationsRegion, {
        selection,
        onAction: (action, payload) =>
          actions.push({
            action,
            payload: (payload || {}) as Record<string, unknown>,
          }),
      }),
      root,
    );
    const checkboxes = root.querySelectorAll<HTMLInputElement>(
      '.dashboard-migration-candidate input[type="checkbox"]',
    );
    assert.lengthOf(checkboxes, 3);
    assert.isTrue(checkboxes[0].checked);
    assert.isFalse(checkboxes[1].checked);
    assert.isTrue(checkboxes[1].disabled);
    assert.isTrue(checkboxes[2].disabled);
    checkboxes[0].click();
    assert.isNull(
      root.querySelector('[data-role="migration-detail-drawer"]'),
      "checkbox toggle must not open the detail drawer",
    );
    // jsdom does not fire change for checkboxes in a detached tree.
    checkboxes[0].dispatchEvent(
      new document.defaultView!.Event("change", { bubbles: true }),
    );
    const search = root.querySelector<HTMLInputElement>(
      '[data-role="migration-search"]',
    );
    assert.exists(search);
    search!.value = "review";
    search!.dispatchEvent(
      new document.defaultView!.Event("input", { bubbles: true }),
    );
    assert.isNull(root.querySelector('[data-action="migration-open-detail"]'));
    const articles = root.querySelectorAll<HTMLElement>(
      ".dashboard-migration-candidate",
    );
    assert.lengthOf(articles, 3);
    articles[1]!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const drawer = root.querySelector('[data-role="migration-detail-drawer"]');
    assert.exists(drawer);
    assert.include(drawer!.textContent || "", "Review paper");
    const issueItems = drawer!.querySelectorAll(
      ".dashboard-migration-issue-items li",
    );
    assert.lengthOf(issueItems, 1);
    assert.include(issueItems[0]!.textContent || "", "Unknown (2020)");
    articles[2]!.dispatchEvent(
      new document.defaultView!.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.include(drawer!.textContent || "", "Blocked paper");
    articles[1]!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const resolution = drawer!.querySelector<HTMLButtonElement>(
      '[data-option-id="keep-unresolved"]',
    );
    assert.exists(resolution);
    resolution!.click();
    const apply = Array.from(root.querySelectorAll("button")).find(
      (button) => button.textContent === "Apply",
    );
    assert.exists(apply);
    apply?.click();
    const next = root.querySelector<HTMLButtonElement>(
      '[data-role="migration-next-page"]',
    );
    assert.exists(next);
    next?.click();
    assert.deepEqual(actions, [
      {
        action: "literature-migration-set-selection",
        payload: {
          scanOperationId: "op-1",
          candidateId: "candidate-1",
          selected: false,
        },
      },
      {
        action: "literature-migration-set-candidate-query",
        payload: {
          search: "review",
          classification: "",
          reasonCode: "",
          disposition: "",
        },
      },
      {
        action: "literature-migration-resolve-issue",
        payload: {
          scanOperationId: "op-1",
          candidateId: "candidate-2",
          issueId: "issue-linkage",
          optionId: "keep-unresolved",
        },
      },
      {
        action: "literature-migration-apply",
        payload: {
          scanOperationId: "op-1",
          migrationId: "literature-artifacts",
          definitionVersion: 7,
        },
      },
      {
        action: "literature-migration-list-receipts",
        payload: { runId: "run-1", page: 1 },
      },
    ]);
    assert.notInclude(root.textContent || "", "sourceReferenceId");
    assert.notInclude(root.textContent || "", "parentRef");
    render(
      h(MigrationsRegion, {
        selection: JSON.parse(JSON.stringify(selection)),
        onAction: () => assert.fail("render must not dispatch migration work"),
      }),
      root,
    );
    assert.strictEqual(
      Array.from(root.querySelectorAll("button")).find(
        (button) => button.textContent === "Apply",
      ),
      apply,
    );
    render(
      h(MigrationsRegion, {
        selection: {
          ...selection,
          view: {
            ...selection.view,
            availability: "busy",
            activeRunId: "run-1",
            progress: {
              phase: "scanning",
              completed: 4,
              total: 10,
              candidateCount: 2,
            },
          },
        },
        onAction: () => assert.fail("progress refresh must not dispatch work"),
      }),
      root,
    );
    const progress = root.querySelector(
      '.dashboard-migration-progress [role="progressbar"]',
    );
    assert.equal(progress?.getAttribute("aria-valuenow"), "4");
    assert.equal(progress?.getAttribute("aria-valuemax"), "10");
    assert.include(root.textContent || "", "4/10");
    const busyScan = Array.from(root.querySelectorAll("button")).find(
      (button) => button.textContent === selection.scanLabel,
    );
    assert.isTrue(busyScan?.classList.contains("is-busy"));
    assert.equal(busyScan?.getAttribute("aria-busy"), "true");
    assert.equal(
      root.querySelector(".dashboard-migrations")?.getAttribute("aria-busy"),
      "true",
    );
    assert.isTrue(
      root.querySelector<HTMLInputElement>('[data-role="migration-search"]')
        ?.disabled,
    );

    const failedRun = {
      ...selection.view.activeRun!,
      state: "failed" as const,
      reason: "apply_failed",
      processedCount: 1,
      remainingCount: 1,
      terminalAt: "2026-01-01T00:01:00.000Z",
      diagnostics: ["mutation:execution_failed"],
    };
    render(
      h(MigrationsRegion, {
        selection: {
          ...selection,
          view: {
            ...selection.view,
            availability: "available",
            activeRun: failedRun,
            activeOperationId: failedRun.operationId,
            activeRunId: "",
            progress: null,
            primaryDiagnostic: {
              candidateId: "candidate-1",
              ordinal: 1,
              outcome: "failed",
              operationId: "set-op-1",
              authorityState: "terminal",
              operation: "managed_note.apply_parent_set",
              attemptId: "attempt-1",
              status: "failed",
              code: "execution_failed",
              phase: "compensation",
              effectPhase: "commit",
              recovery: "retry_same_operation",
              message: "managed note payload is ambiguous",
              affectedCount: 2,
              residualCount: 0,
              diagnostics: ["mutation:execution_failed"],
            },
            candidatePage: {
              ...selection.view.candidatePage,
              page: 0,
              pageSize: 25,
              pageCount: 1,
              items: [
                {
                  ...selection.view.candidatePage.items[0]!,
                  outcome: "failed",
                  diagnostics: ["mutation:execution_failed", "phase:commit"],
                  selected: false,
                  disposition: "pending",
                },
              ],
            },
            history: [failedRun],
          },
        },
        onAction: (action, payload) =>
          failedActions.push({
            action,
            payload: (payload || {}) as Record<string, unknown>,
          }),
      }),
      root,
    );
    assert.lengthOf(
      root.querySelectorAll(
        '.dashboard-migration-candidate input[type="checkbox"]',
      ),
      0,
    );
    assert.include(root.textContent || "", "Failed");
    assert.include(root.textContent || "", "mutation:execution_failed");
    const diagnostic = root.querySelector(
      '[data-role="migration-primary-diagnostic"]',
    );
    assert.exists(diagnostic);
    assert.include(
      diagnostic!.textContent || "",
      "managed note payload is ambiguous",
    );
    assert.include(diagnostic!.textContent || "", "execution_failed");
    assert.include(diagnostic!.textContent || "", "compensation");
    assert.include(diagnostic!.textContent || "", "commit");
    assert.include(diagnostic!.textContent || "", "retry_same_operation");
    assert.include(diagnostic!.textContent || "", "set-op-1");
    assert.include(
      diagnostic!.textContent || "",
      "Retry the same operation after checking the cause.",
    );
    assert.exists(
      Array.from(root.querySelectorAll("button")).find(
        (button) => button.textContent === selection.continueLabel,
      ),
    );
    const copyDiagnostics = Array.from(root.querySelectorAll("button")).find(
      (button) => button.textContent === selection.copyDiagnosticBundleLabel,
    );
    assert.exists(copyDiagnostics);
    copyDiagnostics?.click();
    assert.deepEqual(failedActions, [
      {
        action: "literature-migration-copy-diagnostics",
        payload: { runId: failedRun.runId },
      },
    ]);
    assert.exists(root.querySelector('[data-role="migration-history-list"]'));
    assert.exists(root.querySelector('[data-role="migration-run-detail"]'));
    render(
      h(MigrationsRegion, {
        selection: {
          ...selection,
          view: {
            ...selection.view,
            definitionVersion: 2,
            availability: "unavailable",
            activeRun: null,
            activeOperationId: "",
            activeRunId: "",
            progress: null,
            primaryDiagnostic: null,
            candidatePage: {
              page: 0,
              pageSize: 25,
              pageCount: 0,
              items: [],
              summary: {
                total: 0,
                unfilteredTotal: 0,
                ready: 0,
                reviewRequired: 0,
                blocked: 0,
                selected: 0,
                filteredSelected: 0,
                filteredSelectable: 0,
              },
              query: {
                search: "",
                classification: "",
                reasonCode: "",
                disposition: "",
              },
              batchActions: [],
              availableReasons: [],
            },
          },
        },
        onAction: () => assert.fail("opening an empty view must not scan"),
      }),
      root,
    );
    assert.isTrue(root.textContent?.includes(selection.pageTitle));
    const scan = Array.from(root.querySelectorAll("button")).find(
      (button) => button.textContent === selection.scanLabel,
    );
    assert.isTrue(scan?.disabled);
    assert.isNull(root.querySelector(".dashboard-migrations-version"));
    assert.isUndefined(
      Array.from(root.querySelectorAll("button")).find(
        (button) => button.textContent === selection.applyLabel,
      ),
    );
    render(null, root);
    restoreSidebarDomGlobals();
    environment.dom.window.close();
  });

  it("renders a tri-state select-all checkbox and dispatches the filter selection", async function () {
    const environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
    const root = document.createElement("div");
    const actions: Array<{ action: string; payload: Record<string, unknown> }> =
      [];
    const summary = (filteredSelected: number) => ({
      total: 28,
      unfilteredTotal: 28,
      ready: 26,
      reviewRequired: 1,
      blocked: 1,
      selected: filteredSelected,
      filteredSelected,
      filteredSelectable: 26,
    });
    const renderWith = (filteredSelected: number) => {
      const base = buildMigrationsSelection().view;
      render(
        h(MigrationsRegion, {
          selection: buildMigrationsSelection({
            view: {
              ...base,
              candidatePage: {
                ...base.candidatePage,
                summary: summary(filteredSelected),
              },
            },
          }),
          onAction: (action, payload) =>
            actions.push({
              action,
              payload: (payload || {}) as Record<string, unknown>,
            }),
        }),
        root,
      );
      return root.querySelector<HTMLInputElement>(
        '[data-role="migration-select-all"]',
      )!;
    };

    const indeterminateBox = renderWith(13);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.isFalse(indeterminateBox.checked);
    assert.isTrue(indeterminateBox.indeterminate);

    // jsdom does not fire change for checkboxes in a detached tree.
    indeterminateBox.click();
    indeterminateBox.dispatchEvent(
      new document.defaultView!.Event("change", { bubbles: true }),
    );
    assert.deepEqual(actions, [
      {
        action: "literature-migration-set-filter-selection",
        payload: {
          scanOperationId: "op-1",
          selected: indeterminateBox.checked,
        },
      },
    ]);

    // The host re-renders after a bulk deselect: nothing is selected anymore.
    const emptyBox = renderWith(0);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.isFalse(emptyBox.checked);
    assert.isFalse(emptyBox.indeterminate);
    emptyBox.click();
    emptyBox.dispatchEvent(
      new document.defaultView!.Event("change", { bubbles: true }),
    );
    assert.deepEqual(actions[1], {
      action: "literature-migration-set-filter-selection",
      payload: { scanOperationId: "op-1", selected: true },
    });

    // The host re-renders after a bulk select: the box is fully checked.
    const fullBox = renderWith(26);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.isTrue(fullBox.checked);
    assert.isFalse(fullBox.indeterminate);
    fullBox.click();
    fullBox.dispatchEvent(
      new document.defaultView!.Event("change", { bubbles: true }),
    );
    assert.deepEqual(actions[2], {
      action: "literature-migration-set-filter-selection",
      payload: { scanOperationId: "op-1", selected: false },
    });
    render(null, root);
    restoreSidebarDomGlobals();
    environment.dom.window.close();
  });

  it("only shows the select-all checkbox in the preview state", async function () {
    const environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
    const root = document.createElement("div");
    const activeRun = buildMigrationsSelection().view.activeRun!;
    render(
      h(MigrationsRegion, {
        selection: buildMigrationsSelection({
          view: {
            ...buildMigrationsSelection().view,
            activeRun: { ...activeRun, state: "completed" },
          },
        }),
        onAction: () => assert.fail("terminal view must not bulk select"),
      }),
      root,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.isNull(
      root.querySelector('[data-role="migration-select-all"]'),
      "terminal runs do not offer bulk selection",
    );

    render(
      h(MigrationsRegion, {
        selection: buildMigrationsSelection({
          view: {
            ...buildMigrationsSelection().view,
            availability: "busy",
            activeRunId: "run-1",
            progress: {
              phase: "scanning",
              completed: 1,
              total: 3,
              candidateCount: 1,
            },
          },
        }),
        onAction: () => assert.fail("busy view must not bulk select"),
      }),
      root,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    const busyBox = root.querySelector<HTMLInputElement>(
      '[data-role="migration-select-all"]',
    );
    assert.exists(busyBox);
    assert.isTrue(busyBox!.disabled);
    render(null, root);
    restoreSidebarDomGlobals();
    environment.dom.window.close();
  });

  it("dispatches bounded page jumps and renders the filtered range text", async function () {
    const environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
    const root = document.createElement("div");
    const actions: Array<{ action: string; payload: Record<string, unknown> }> =
      [];
    const base = buildMigrationsSelection().view.candidatePage;
    render(
      h(MigrationsRegion, {
        selection: buildMigrationsSelection({
          view: {
            ...buildMigrationsSelection().view,
            candidatePage: {
              ...base,
              page: 1,
              pageSize: 25,
              pageCount: 3,
              items: base.items.slice(0, 2),
              summary: { ...base.summary, total: 51 },
            },
          },
        }),
        onAction: (action, payload) =>
          actions.push({
            action,
            payload: (payload || {}) as Record<string, unknown>,
          }),
      }),
      root,
    );
    const range = root.querySelector(
      '[data-role="migration-page-range"]',
    )?.textContent;
    assert.include(range, "26");
    assert.include(range, "27");
    assert.include(range, "51");

    const first = root.querySelector<HTMLButtonElement>(
      '[data-role="migration-first-page"]',
    );
    const prev = root.querySelector<HTMLButtonElement>(
      '[data-role="migration-prev-page"]',
    );
    const next = root.querySelector<HTMLButtonElement>(
      '[data-role="migration-next-page"]',
    );
    const last = root.querySelector<HTMLButtonElement>(
      '[data-role="migration-last-page"]',
    );
    assert.isFalse(first!.disabled);
    assert.isFalse(prev!.disabled);
    assert.isFalse(next!.disabled);
    assert.isFalse(last!.disabled);

    prev!.click();
    next!.click();
    last!.click();
    first!.click();
    const pageInput = root.querySelector<HTMLInputElement>(
      '[data-role="migration-page-input"]',
    );
    assert.exists(pageInput);
    assert.equal(pageInput!.value, "2");
    pageInput!.value = "3";
    pageInput!.dispatchEvent(
      new document.defaultView!.Event("input", { bubbles: true }),
    );
    pageInput!.value = "99";
    pageInput!.dispatchEvent(
      new document.defaultView!.Event("input", { bubbles: true }),
    );
    assert.deepEqual(actions, [
      { action: "literature-migration-list-receipts", payload: { runId: "run-1", page: 0 } },
      { action: "literature-migration-list-receipts", payload: { runId: "run-1", page: 2 } },
      { action: "literature-migration-list-receipts", payload: { runId: "run-1", page: 2 } },
      { action: "literature-migration-list-receipts", payload: { runId: "run-1", page: 0 } },
      { action: "literature-migration-list-receipts", payload: { runId: "run-1", page: 2 } },
      { action: "literature-migration-list-receipts", payload: { runId: "run-1", page: 2 } },
    ]);
    render(null, root);
    restoreSidebarDomGlobals();
    environment.dom.window.close();
  });

  it("hides row diagnostics, compacts facts, and renders batch decisions", async function () {
    const environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
    const root = document.createElement("div");
    const actions: Array<{ action: string; payload: Record<string, unknown> }> =
      [];
    const selection = buildMigrationsSelection();
    render(
      h(MigrationsRegion, {
        selection,
        onAction: (action, payload) =>
          actions.push({
            action,
            payload: (payload || {}) as Record<string, unknown>,
          }),
      }),
      root,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const list = root.querySelector(".dashboard-migrations-candidates");
    assert.exists(list);
    assert.isNull(
      list!.querySelector(".dashboard-migration-diagnostics"),
      "candidate rows must not expose raw diagnostics",
    );
    assert.notInclude(list!.textContent || "", "duplicate reference evidence");
    assert.notInclude(
      list!.textContent || "",
      "citation item linkage is unresolved",
    );

    const facts = root.querySelectorAll(
      ".dashboard-migration-candidate .dashboard-migration-facts",
    );
    assert.lengthOf(facts[0]!.querySelectorAll("span"), 1);
    assert.lengthOf(facts[1]!.querySelectorAll("span"), 2);
    assert.notInclude(facts[0]!.textContent || "", "0");

    const batchButtons = root.querySelectorAll<HTMLButtonElement>(
      '[data-role="migration-batch-resolve"]',
    );
    assert.lengthOf(batchButtons, 4);
    const batchGroups = root.querySelectorAll(".dashboard-migration-batch-group");
    assert.lengthOf(batchGroups, 2);
    const mergeAll = Array.from(batchButtons).find(
      (button) => button.dataset.kind === "merge_duplicates",
    )!;
    assert.include(mergeAll.textContent || "", "×1");
    assert.isTrue(mergeAll.classList.contains("is-success"));
    const mergeGroup = mergeAll.closest(".dashboard-migration-batch-group")!;
    assert.include(
      mergeGroup.querySelector(".dashboard-migration-batch-reason")!
        .textContent || "",
      "Duplicate reference",
    );
    const dropAll = Array.from(batchButtons).find(
      (button) => button.dataset.kind === "drop_unresolved",
    )!;
    assert.isTrue(dropAll.classList.contains("is-warning"));
    const skipAll = Array.from(batchButtons).find(
      (button) => button.dataset.kind === "skip_candidate",
    )!;
    assert.isTrue(skipAll.classList.contains("is-danger"));
    mergeAll.click();
    assert.deepEqual(actions, [
      {
        action: "literature-migration-resolve-issues-bulk",
        payload: {
          scanOperationId: "op-1",
          reasonCode: "duplicate_reference",
          kind: "merge_duplicates",
        },
      },
    ]);

    const articles = root.querySelectorAll<HTMLElement>(
      ".dashboard-migration-candidate",
    );
    articles[2]!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const drawer = root.querySelector('[data-role="migration-detail-drawer"]')!;
    const expandable = drawer.querySelector(
      ".dashboard-migration-issue-item",
    ) as HTMLDetailsElement | null;
    assert.exists(expandable);
    assert.include(
      expandable!.querySelector("summary")!.textContent || "",
      "Duplicates: First copy",
    );
    assert.include(
      expandable!.querySelector("p")!.textContent || "",
      "DOI:10.0000/example",
    );
    const drawerDiagnostics = drawer.querySelector(
      ".dashboard-migration-drawer-diagnostics",
    ) as HTMLDetailsElement | null;
    assert.exists(drawerDiagnostics);
    assert.isFalse(drawerDiagnostics!.open);
    assert.include(
      drawerDiagnostics!.textContent || "",
      "duplicate reference evidence",
    );

    const mergeOption = drawer.querySelector<HTMLButtonElement>(
      '[data-option-id="merge-duplicates"]',
    )!;
    assert.isTrue(mergeOption.classList.contains("is-success"));
    assert.isFalse(mergeOption.classList.contains("is-selected"));

    // A resolved issue shows a prominent selected state on the chosen option.
    const resolvedSelection = buildMigrationsSelection();
    const resolvedIssue =
      resolvedSelection.view.candidatePage.items[2]!.issues[0]!;
    resolvedIssue.selectedOptionId = "merge-duplicates";
    resolvedIssue.status = "resolved";
    render(
      h(MigrationsRegion, {
        selection: resolvedSelection,
        onAction: () => {},
      }),
      root,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const selectedOption = root.querySelector<HTMLButtonElement>(
      '[data-option-id="merge-duplicates"]',
    )!;
    assert.isTrue(selectedOption.classList.contains("is-selected"));
    render(null, root);
    restoreSidebarDomGlobals();
    environment.dom.window.close();
  });

  it("keeps the detail drawer open across pagination", async function () {
    const environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
    const root = document.createElement("div");
    const selection = buildMigrationsSelection();
    render(h(MigrationsRegion, { selection, onAction: () => {} }), root);
    const articles = root.querySelectorAll<HTMLElement>(
      ".dashboard-migration-candidate",
    );
    articles[1]!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.exists(root.querySelector('[data-role="migration-detail-drawer"]'));
    assert.isTrue(
      root
        .querySelectorAll(".dashboard-migration-candidate")[1]!
        .classList.contains("is-selected"),
    );

    // The host re-renders with another page that lacks the selected candidate.
    render(
      h(MigrationsRegion, {
        selection: {
          ...selection,
          view: {
            ...selection.view,
            candidatePage: {
              ...selection.view.candidatePage,
              page: 1,
              items: [],
            },
          },
        },
        onAction: () => {},
      }),
      root,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const drawer = root.querySelector('[data-role="migration-detail-drawer"]');
    assert.exists(drawer, "pagination must not close the detail drawer");
    assert.include(drawer!.textContent || "", "Review paper");
    render(null, root);
    restoreSidebarDomGlobals();
    environment.dom.window.close();
  });
});
