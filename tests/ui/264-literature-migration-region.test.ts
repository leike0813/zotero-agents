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
    const selection: DashboardMigrationsSelection = {
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
        candidatePage: {
          cursor: "",
          nextCursor: "next-25",
          items: [
            {
              candidateId: "candidate-1",
              ordinal: 1,
              title: "Ready paper",
              classification: "ready",
              outcome: "preview",
              reasonCodes: [],
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
                    { label: "Unknown (2020)", hint: "#3 · 2020" },
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
          },
          query: {
            search: "",
            classification: "",
            reasonCode: "",
            disposition: "",
          },
          availableReasons: ["unresolved_linkage", "duplicate_reference"],
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
      selectedLabel: "Selected",
      verifiedLabel: "Verified",
      unresolvedLabel: "Unresolved",
      recoveredLabel: "Recovered",
      droppedLabel: "Dropped",
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
      dispositionLabels: {
        pending: "Pending",
        include: "Included",
        skip: "Skipped",
      },
      optionLabels: {
        keep_unresolved: "Keep as unresolved",
        merge_duplicates: "Merge duplicate references",
      },
      reasonLabels: {
        unresolved_linkage: "Unresolved linkage",
        duplicate_reference: "Duplicate reference",
      },
    };
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
    const next = Array.from(root.querySelectorAll("button")).find(
      (button) => button.textContent === "Next",
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
        payload: { runId: "run-1", cursor: "next-25" },
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
            candidatePage: {
              cursor: "",
              nextCursor: null,
              items: [],
              summary: {
                total: 0,
                unfilteredTotal: 0,
                ready: 0,
                reviewRequired: 0,
                blocked: 0,
                selected: 0,
              },
              query: {
                search: "",
                classification: "",
                reasonCode: "",
                disposition: "",
              },
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
});
