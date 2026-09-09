import { assert } from "chai";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  captureRegionSubtrees,
  assertRegionSubtreesPreserved,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import type { DashboardSnapshot } from "../../src/shared/dashboardWireContract";
import { createDashboardChromeRenderer } from "../../src/dashboard/dashboardChromeRenderer";
import {
  dashboardHomeEqualityInput,
  dashboardTabBarEqualityInput,
  projectDashboardPanel,
} from "../../src/dashboard/dashboardPanelModel";
import { equalBySignature } from "../../src/shared/regionEquality";
import type {
  DashboardPageSnapshot,
  DashboardUiState,
} from "../../src/dashboard/dashboardTypes";

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

function installSharedMarkdownRenderer() {
  for (const file of [
    "addon/content/shared/vendor/markdown-it/markdown-it.min.js",
    "addon/content/shared/markdown-renderer.js",
  ]) {
    const source = readFileSync(
      fileURLToPath(new URL(`../../${file}`, import.meta.url)),
      "utf8",
    );
    const runner = new Function("window", "document", "globalThis", source) as (
      window: unknown,
      document: unknown,
      globalThis: unknown,
    ) => void;
    runner.call(window, window, document, window);
  }
}

function makeSnapshot(
  overrides: Partial<DashboardSnapshot> = {},
): DashboardPageSnapshot {
  return {
    generatedAt: "2026-09-04T00:00:00.000Z",
    title: "Tasks",
    labels: makeLabels(),
    selectedTabKey: "home",
    tabs: [
      { key: "home", label: "Home", group: "system" },
      { key: "runtime-logs", label: "Logs", group: "system" },
      { key: "backend:b1", label: "Backend One", group: "backend" },
      {
        key: "backend:b2",
        label: "Backend Two",
        group: "backend",
        disabled: true,
        disabledReason: "offline",
      },
    ],
    summary: { total: 9, running: 1, succeeded: 5, failed: 2, canceled: 1 },
    runningRows: [
      {
        id: "task-1",
        workflowId: "wf-1",
        workflowLabel: "Workflow One",
        backendId: "b1",
        backendType: "acp",
        backendLabel: "Backend One",
        taskName: "Run workflow",
        state: "running",
        stateSemantics: {
          normalized: "running",
          terminal: false,
          waiting: false,
        },
        stateLabel: "Running",
        runKey: "rk-1",
        requestId: "req-1",
        requestKind: "acp-skill-run",
        createdAt: "2026-09-04T00:00:00.000Z",
        updatedAt: "2026-09-04T00:01:00.000Z",
      },
    ],
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
      {
        workflowId: "wf-2",
        workflowLabel: "Workflow Two",
        providerId: "p2",
        configurable: false,
        official: false,
        core: true,
        quickRunEnabled: false,
        quickRunDisabledReason: "needs input",
      },
    ],
    ...overrides,
  };
}

function idleUi(): DashboardUiState {
  return { selectedTabKey: "" } as DashboardUiState;
}

describe("dashboard chrome scaffold (src/dashboard)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function renderPanelIntoRoot(
    panel: ReturnType<typeof projectDashboardPanel>,
  ) {
    const actions: Array<{ action: string; payload: unknown }> = [];
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);
    const renderer = createDashboardChromeRenderer({
      root,
      sendAction: (action, payload) => {
        actions.push({ action, payload: payload || {} });
      },
      dispatchAction: (action, payload) => {
        actions.push({ action, payload: payload || {} });
      },
    });
    renderer.renderPanel(panel);
    return { root, actions, renderer };
  }

  it("renders the tab bar with system/backend groups and disabled backend state", function () {
    const { root } = renderPanelIntoRoot(
      projectDashboardPanel(makeSnapshot(), idleUi()),
    );
    const tabbar = root.querySelector('[data-role="dashboard-tabbar"]');
    assert.ok(tabbar, "tabbar container exists");
    const buttons = tabbar!.querySelectorAll("button.tab-btn");
    assert.equal(buttons.length, 4);
    assert.ok(
      buttons[0].classList.contains("active"),
      "selected system tab is active",
    );
    const disabled = tabbar!.querySelector("button.tab-btn.disabled");
    assert.ok(disabled, "disabled backend tab carries .disabled");
    assert.equal(
      disabled!.querySelector(".tab-disabled-tag")?.textContent,
      "Unavailable",
    );
    assert.equal(disabled!.getAttribute("title"), "offline");
    assert.equal(tabbar!.querySelectorAll(".tab-divider").length, 1);
  });

  it("tab click updates local state and emits the legacy select-tab action", function () {
    const ui = idleUi();
    const panel = projectDashboardPanel(makeSnapshot(), ui);
    const uiPatches: Array<{ selectedTabKey?: string }> = [];
    const actions: Array<{ action: string; payload: unknown }> = [];
    const root = document.createElement("div");
    document.body.appendChild(root);
    const renderer = createDashboardChromeRenderer({
      root,
      sendAction: (action, payload) => {
        actions.push({ action, payload: payload || {} });
      },
      dispatchAction: (action, payload) => {
        actions.push({ action, payload: payload || {} });
      },
      onUiChange: (patch) => uiPatches.push(patch),
    });
    renderer.renderPanel(panel);
    const buttons = root.querySelectorAll<HTMLButtonElement>("button.tab-btn");
    buttons[1].click();
    assert.deepEqual(uiPatches, [{ selectedTabKey: "runtime-logs" }]);
    assert.deepEqual(actions, [
      { action: "select-tab", payload: { tabKey: "runtime-logs" } },
    ]);
    // Disabled backend tabs never emit.
    buttons[3].click();
    assert.equal(actions.length, 1);
  });

  it("renders the home surface: bubbles, summary cards and the running table", function () {
    const { root, actions } = renderPanelIntoRoot(
      projectDashboardPanel(makeSnapshot(), idleUi()),
    );
    const main = root.querySelector('[data-role="dashboard-main"]');
    assert.ok(main, "main container exists");

    const bubbles = main!.querySelectorAll(".workflow-bubble");
    assert.equal(bubbles.length, 2);
    assert.ok(bubbles[0].querySelector(".workflow-bubble-official-badge"));
    assert.ok(bubbles[1].querySelector(".workflow-bubble-core-badge"));
    const disabledRun = bubbles[1].querySelector<HTMLButtonElement>(
      ".workflow-bubble-run-btn",
    );
    assert.isTrue(disabledRun!.disabled);
    assert.equal(disabledRun!.getAttribute("title"), "needs input");
    const disabledSettings = bubbles[1].querySelector<HTMLButtonElement>(
      ".workflow-bubble-actions .btn:last-child",
    );
    assert.isTrue(disabledSettings!.disabled);

    assert.equal(main!.querySelectorAll(".cards .card").length, 5);

    const rows = main!.querySelectorAll(".home-running-table-wrap tbody tr");
    assert.equal(rows.length, 1);
    assert.ok(rows[0].classList.contains("clickable"));
    (rows[0] as HTMLElement).click();
    assert.deepEqual(actions, [
      {
        action: "open-running-task",
        payload: {
          taskId: "task-1",
          backendId: "b1",
          backendType: "acp",
          runKey: "rk-1",
          requestId: "req-1",
          requestKind: "acp-skill-run",
        },
      },
    ]);

    // Bubble actions keep the legacy action names and payload shapes.
    (
      bubbles[0].querySelector(".workflow-bubble-run-btn") as HTMLButtonElement
    ).click();
    (
      bubbles[0]
        .querySelector(".workflow-bubble-icon-doc")!
        .closest("button") as HTMLButtonElement
    ).click();
    assert.deepEqual(
      actions.slice(1).map((entry) => [entry.action, entry.payload]),
      [
        ["run-home-workflow", { workflowId: "wf-1" }],
        ["open-home-workflow-doc", { workflowId: "wf-1" }],
      ],
    );
  });

  it("renders the workflow document view with trusted HTML and a back action", function () {
    const { root, actions } = renderPanelIntoRoot(
      projectDashboardPanel(
        makeSnapshot({
          homeWorkflowDocView: {
            workflowId: "wf-1",
            workflowLabel: "Workflow One",
            html: "<p>doc-body</p>",
            markdown: "doc-body",
            baseFileUri: "file:///tmp/wf-1",
            missingReadme: false,
          },
        }),
        idleUi(),
      ),
    );
    const content = root.querySelector(".workflow-doc-content");
    assert.ok(content, "doc content exists");
    assert.equal(content!.getAttribute("data-workflow-id"), "wf-1");
    assert.equal(content!.innerHTML, "<p>doc-body</p>");
    const back = root.querySelector<HTMLButtonElement>(
      ".workflow-doc-footer .btn",
    );
    assert.ok(back);
    back!.click();
    assert.deepEqual(actions, [
      { action: "close-home-workflow-doc", payload: {} },
    ]);
  });

  it("renders workflow README Markdown through the document renderer contract", function () {
    installSharedMarkdownRenderer();
    const markdown = [
      "# Title",
      "",
      "[Jump](#workflow-doc-heading-title)",
      "",
      "[Guide](docs/guide.md)",
      "",
      "![Figure](images/figure.png)",
      "",
      '<script>alert("bad")</script>',
      '<a href="javascript:alert(1)" onclick="bad()">Bad</a>',
    ].join("\n");

    const snapshot = makeSnapshot({
      homeWorkflowDocView: {
        workflowId: "wf-1",
        workflowLabel: "Workflow One",
        html: "<p>fallback</p>",
        markdown,
        baseFileUri: "file:///tmp/workflows/wf-1/README.md",
        missingReadme: false,
      },
    });
    const { root, renderer } = renderPanelIntoRoot(
      projectDashboardPanel(snapshot, idleUi()),
    );
    const content = root.querySelector(".workflow-doc-content")!;
    assert.ok(
      content.querySelector('h1[id="workflow-doc-heading-title"]'),
      "shared renderer adds the requested heading prefix",
    );
    const localAnchor = Array.from(content.querySelectorAll("a")).find(
      (anchor) => anchor.textContent === "Jump",
    );
    assert.equal(
      localAnchor?.getAttribute("href"),
      "#workflow-doc-heading-title",
    );
    assert.equal(
      content.querySelector("a[href$='/docs/guide.md']")?.getAttribute("href"),
      "file:///tmp/workflows/wf-1/docs/guide.md",
    );
    assert.equal(
      content.querySelector("img")?.getAttribute("src"),
      "file:///tmp/workflows/wf-1/images/figure.png",
    );
    assert.notInclude(content.innerHTML, "<script");
    assert.notInclude(content.innerHTML, "onclick");
    assert.notInclude(content.innerHTML, "javascript:");
    renderer.renderPanel(
      projectDashboardPanel(
        {
          ...snapshot,
          homeWorkflowDocView: {
            ...snapshot.homeWorkflowDocView!,
            missingReadme: true,
          },
        },
        idleUi(),
      ),
    );
    assert.isNull(root.querySelector(".workflow-doc-content img"));
    assert.ok(root.querySelector(".workflow-doc-content .empty"));
    renderer.renderPanel(projectDashboardPanel(snapshot, idleUi()));
    assert.ok(root.querySelector(".workflow-doc-content img"));
  });

  it("keeps region subtree identity when an equal panel re-renders", function () {
    const panelA = projectDashboardPanel(makeSnapshot(), idleUi());
    const { root, renderer } = renderPanelIntoRoot(panelA);
    const regions = {
      tabbar: root.querySelector('[data-region-mount="tabbar"]')!,
      home: root.querySelector('[data-region-mount="home"]')!,
    };
    const captured = captureRegionSubtrees(regions);

    // Same visible content, fresh object graph: no region node is rebuilt.
    const panelB = projectDashboardPanel(makeSnapshot(), idleUi());
    renderer.renderPanel(panelB);
    assertRegionSubtreesPreserved(regions, captured);

    // A visible change (summary count) rebuilds home but not the tab bar.
    const panelC = projectDashboardPanel(
      makeSnapshot({
        summary: {
          total: 10,
          running: 1,
          succeeded: 5,
          failed: 2,
          canceled: 1,
        },
      }),
      idleUi(),
    );
    renderer.renderPanel(panelC);
    const tabbarNodes = captureRegionSubtrees({ tabbar: regions.tabbar });
    assertRegionSubtreesPreserved({ tabbar: regions.tabbar }, tabbarNodes);
    assert.equal(
      regions.home.querySelector(".cards .card .card-value")?.textContent,
      "10",
    );
  });

  it("region selectors isolate unrelated high-frequency fields", function () {
    const base = makeSnapshot();
    const changedSummary = makeSnapshot({
      summary: { total: 99, running: 2, succeeded: 5, failed: 2, canceled: 1 },
    });
    const panelA = projectDashboardPanel(base, idleUi());
    const panelB = projectDashboardPanel(changedSummary, idleUi());
    assert.isTrue(
      equalBySignature(
        dashboardTabBarEqualityInput(panelA),
        dashboardTabBarEqualityInput(panelB),
      ),
      "summary counts must not enter the tab bar selection",
    );
    assert.isFalse(
      equalBySignature(
        dashboardHomeEqualityInput(panelA),
        dashboardHomeEqualityInput(panelB),
      ),
      "summary counts are home-surface content",
    );
  });

  it("optimistic tab selection overrides the snapshot until the next apply", function () {
    const snapshot = makeSnapshot();
    const optimistic = projectDashboardPanel(snapshot, {
      selectedTabKey: "runtime-logs",
    });
    assert.equal(optimistic.selectedTabKey, "runtime-logs");
    assert.isNull(optimistic.home, "non-home surfaces have no home selection");
    const settled = projectDashboardPanel(snapshot, idleUi());
    assert.equal(settled.selectedTabKey, "home");
    assert.ok(settled.home);
  });
});
