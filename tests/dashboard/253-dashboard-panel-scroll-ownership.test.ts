import { assert } from "chai";

import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import { createDashboardChromeRenderer } from "../../src/dashboard/dashboardChromeRenderer";
import { projectDashboardPanel } from "../../src/dashboard/dashboardPanelModel";
import type {
  DashboardPageSnapshot,
  DashboardUiState,
} from "../../src/dashboard/dashboardTypes";

// Structural invariants of the scroll-ownership model and the sidebar tab
// grouping. These assert DOM structure only — never CSS values — so they stay
// stable across visual tuning.

function makeLabels(): Record<string, string> {
  return {
    tabHome: "Home",
    tabBackends: "Backends",
    noBackends: "No backends",
    backendUnavailableTag: "Unavailable",
    homeWorkflowTitle: "Workflows",
    homeWorkflowBuiltinBadge: "Built-in",
    homeWorkflowCoreBadge: "Core",
    homeWorkflowRunButton: "Run",
    homeWorkflowDocButton: "Docs",
    homeWorkflowSettingsButton: "Settings",
    homeSummaryTitle: "Summary",
    summaryTotal: "Total",
    summaryRunning: "Running",
    summarySucceeded: "Succeeded",
    summaryFailed: "Failed",
    summaryCanceled: "Canceled",
    runningTitle: "Running tasks",
    noRunning: "Nothing running",
    colTask: "Task",
    colWorkflow: "Workflow",
    colBackend: "Backend",
    colStatus: "Status",
    colUpdatedAt: "Updated",
    homeWorkflowDocMissingReadme: "No README",
    homeWorkflowDocBack: "Back",
  };
}

function makeSnapshot(
  overrides: Record<string, unknown> = {},
): DashboardPageSnapshot {
  return {
    generatedAt: "2026-09-11T00:00:00.000Z",
    title: "Tasks",
    labels: makeLabels(),
    selectedTabKey: "home",
    tabs: [
      { key: "home", label: "Home", group: "system" },
      { key: "runtime-logs", label: "Logs", group: "system" },
      { key: "backend:b1", label: "Backend One", group: "backend" },
      { key: "backend:b2", label: "Backend Two", group: "backend" },
    ],
    summary: { total: 9, running: 1, succeeded: 5, failed: 2, canceled: 1 },
    runningRows: [],
    homeWorkflows: [
      {
        workflowId: "wf-1",
        workflowLabel: "Workflow One",
        providerId: "p1",
        configurable: true,
        official: true,
        core: false,
        quickRunEnabled: true,
      },
    ],
    ...overrides,
  } as DashboardPageSnapshot;
}

function idleUi(): DashboardUiState {
  return { selectedTabKey: "" } as DashboardUiState;
}

describe("dashboard panel scroll ownership", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function renderPanel(snapshot: DashboardPageSnapshot) {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);
    const renderer = createDashboardChromeRenderer({
      root,
      sendAction: () => undefined,
      dispatchAction: () => undefined,
    });
    renderer.renderPanel(projectDashboardPanel(snapshot, idleUi()));
    return { root, renderer };
  }

  it("renders each tab group title before its own tabs", function () {
    const { root } = renderPanel(makeSnapshot());
    const groups = root.querySelectorAll(
      '[data-role="dashboard-tabbar"] .tab-group',
    );
    assert.lengthOf(groups, 2);
    for (const group of groups) {
      const first = group.firstElementChild;
      assert.isNotNull(first, "tab group must not be empty");
      assert.isTrue(
        first!.classList.contains("sidebar-title"),
        "group title must be the first child of its tab group",
      );
    }
    const systemGroup = root.querySelector('[data-tab-group="system"]');
    const backendGroup = root.querySelector('[data-tab-group="backend"]');
    assert.isNotNull(systemGroup);
    assert.isNotNull(backendGroup);
    assert.strictEqual(
      systemGroup!.querySelectorAll(".tab-btn").length,
      2,
      "system group holds exactly the system tabs",
    );
    assert.strictEqual(
      backendGroup!.querySelectorAll(".tab-btn").length,
      2,
      "backend group holds exactly the backend tabs",
    );
    // DOM order: system group precedes the divider, backend group follows it.
    assert.isTrue(
      Boolean(
        systemGroup!.nextElementSibling?.classList.contains("tab-divider"),
      ),
      "divider separates the two groups",
    );
  });

  it("keeps the home summary header outside the panel scroll region", function () {
    const { root } = renderPanel(makeSnapshot());
    const home = root.querySelector('[data-region-content="dashboard-home"]');
    assert.isNotNull(home);
    const scrollRegion = home!.querySelector(".zs-scroll-region");
    assert.isNotNull(
      scrollRegion,
      "home summary must own exactly one scroll region",
    );
    assert.lengthOf(home!.querySelectorAll(".zs-scroll-region"), 1);
    const title = home!.querySelector(".page-title");
    assert.isNotNull(title);
    assert.isNull(
      title!.closest(".zs-scroll-region"),
      "panel title must stay in the fixed zone",
    );
    assert.isNotNull(
      scrollRegion!.querySelector(".cards"),
      "summary cards scroll with the content",
    );
  });

  it("moves the workflow doc back entry into the fixed doc header", function () {
    const { root, renderer } = renderPanel(makeSnapshot());
    renderer.renderPanel(
      projectDashboardPanel(
        makeSnapshot({
          homeWorkflowDocView: {
            workflowId: "wf-1",
            workflowLabel: "Workflow One",
            markdown: "# Hello",
            html: "",
            baseFileUri: "",
          },
        }),
        { selectedTabKey: "home" } as DashboardUiState,
      ),
    );
    const home = root.querySelector('[data-region-content="dashboard-home"]');
    const back = home?.querySelector(".workflow-doc-header .zs-back-link");
    assert.isNotNull(
      back,
      "doc view must expose the back entry in the fixed header",
    );
    assert.isNull(
      home?.querySelector(".workflow-doc-footer"),
      "the old bottom-right footer is gone",
    );
    const header = home!.querySelector(".workflow-doc-header");
    assert.strictEqual(
      header!.firstElementChild,
      back!,
      "back entry is the first element of the doc header",
    );
  });
});
