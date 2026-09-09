import { assert } from "chai";

import {
  captureRegionSubtrees,
  assertRegionSubtreesPreserved,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import {
  bootstrapDashboardApp,
  createDashboardController,
} from "../../src/dashboard/dashboardApp";
import { createDashboardChromeRenderer } from "../../src/dashboard/dashboardChromeRenderer";
import { projectDashboardPanel } from "../../src/dashboard/dashboardPanelModel";
import type {
  DashboardPageSnapshot,
  DashboardUiState,
} from "../../src/dashboard/dashboardTypes";

const MAIN_REGION_MOUNTS = [
  "home",
  "products",
  "workflow-options",
  "runtime-logs",
  "synthesis-sidecar",
  "skillrunner-audit",
  "acp-trace-replay",
  "backend",
] as const;

const TAB_KEYS = [
  "home",
  "products",
  "workflow-options",
  "runtime-logs",
  "synthesis-sidecar",
  "skillrunner-connection-audit",
  "acp-trace-replay",
  "backend:b1",
] as const;

const MOUNT_BY_TAB_KEY: Record<string, string> = {
  home: "home",
  products: "products",
  "workflow-options": "workflow-options",
  "runtime-logs": "runtime-logs",
  "synthesis-sidecar": "synthesis-sidecar",
  "skillrunner-connection-audit": "skillrunner-audit",
  "acp-trace-replay": "acp-trace-replay",
  "backend:b1": "backend",
};

function makeSnapshot(
  overrides: Partial<DashboardPageSnapshot> = {},
): DashboardPageSnapshot {
  return {
    generatedAt: "2026-09-05T00:00:00.000Z",
    title: "Tasks",
    labels: {
      tabHome: "Home",
      noHistory: "No runs yet",
      runtimeLogsClearConfirm: "",
    },
    selectedTabKey: "home",
    tabs: [
      { key: "home", label: "Home", group: "system" },
      { key: "products", label: "Products", group: "system" },
      { key: "workflow-options", label: "Options", group: "system" },
      { key: "runtime-logs", label: "Logs", group: "system" },
      { key: "synthesis-sidecar", label: "Sidecar", group: "system" },
      { key: "skillrunner-connection-audit", label: "Audit", group: "system" },
      { key: "acp-trace-replay", label: "Replay", group: "system" },
      { key: "backend:b1", label: "B1", group: "backend" },
    ],
    summary: { total: 1, running: 1, succeeded: 0, failed: 0, canceled: 0 },
    runningRows: [],
    homeWorkflows: [],
    productStorageView: { section: "products", products: [] },
    workflowOptionsView: {
      workflows: [],
      selectedWorkflowId: "",
      saveState: "idle",
    },
    runtimeLogsView: {
      filters: {},
      diagnosticMode: false,
      totalEntries: 0,
      budget: {
        maxEntries: 1000,
        maxBytes: 1024,
        estimatedBytes: 0,
        droppedEntries: 0,
        droppedByReason: { entry_limit: 0, byte_budget: 0, expired: 0 },
        retentionMode: "fifo",
        maxImportantEntries: 100,
        importantEntryCount: 0,
      },
      logs: [],
      selectedEntryIds: [],
      filterOptions: { backends: [], workflows: [] },
    },
    synthesisSidecarView: {
      traceSnapshot: {
        eventCount: 1,
        traces: [
          {
            traceId: "trace-1",
            active: false,
            startedAtMs: 1000,
            updatedAtMs: 2000,
            droppedCount: 0,
            events: [
              {
                spanId: "trace-1-root",
                parentSpanId: "",
                attempt: 0,
                phase: "run-started",
                boundary: "runtime",
                outcome: "succeeded",
                code: "",
                operation: "op-trace-1",
                capability: "library.search",
                factsJson: "",
              },
            ],
          },
        ],
      },
    },
    skillRunnerConnectionAuditView: {
      generatedAt: "2026-09-05T00:00:00.000Z",
      governor: { status: "idle" },
    },
    backendView: {
      backendId: "b1",
      backendType: "custom",
      backendBaseUrl: "http://localhost:9000",
      title: "B1",
      rows: [],
      emptyRowsText: "No runs",
      logRows: [],
    },
    ...overrides,
  };
}

function idleUi(): DashboardUiState {
  return {
    selectedTabKey: "",
    synthesisSidecar: { traceFilter: "", selectedTraceId: "" },
    backendTaskScrollTopByTabKey: Object.create(null) as Record<string, number>,
    homeWorkflowDocScroll: { workflowId: "", scrollTop: 0 },
  };
}

describe("dashboard A2c integration (src/dashboard)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function createWiredApp() {
    const sentActions: Array<{ action: string; payload: unknown }> = [];
    let renderCount = 0;
    const root = document.createElement("div");
    document.body.appendChild(root);
    const controller = createDashboardController({
      sendAction: (action, payload) => {
        sentActions.push({ action, payload: payload || {} });
      },
      renderPanel: (panel) => {
        renderCount += 1;
        renderer.renderPanel(panel);
      },
    });
    const renderer = createDashboardChromeRenderer({
      root,
      sendAction: (action, payload) => {
        sentActions.push({ action, payload: payload || {} });
      },
      dispatchAction: (action, payload) => controller.dispatch(action, payload),
      onUiChange: (patch) => controller.applyUiPatch(patch),
      onTaskTableScroll: (scrollKey, scrollTop) =>
        controller.recordBackendTaskScroll(scrollKey, scrollTop),
      taskTableScrollTop: (scrollKey) =>
        controller.backendTaskScrollTop(scrollKey),
      onHomeWorkflowDocScroll: (workflowId, scrollTop) =>
        controller.recordHomeWorkflowDocScroll(workflowId, scrollTop),
      homeWorkflowDocScrollTop: (workflowId) =>
        controller.homeWorkflowDocScrollTop(workflowId),
    });
    return {
      sentActions,
      root,
      controller,
      renderer,
      getRenderCount: () => renderCount,
    };
  }

  function mainMounts(root: HTMLElement) {
    const mounts: Record<string, Element> = {};
    for (const name of MAIN_REGION_MOUNTS) {
      const mount = root.querySelector(`[data-region-mount="${name}"]`);
      assert.ok(mount, `mount exists: ${name}`);
      mounts[name] = mount!;
    }
    return mounts;
  }

  it("mounts each surface mutually exclusively under main as the selected tab changes", function () {
    const { root, renderer } = createWiredApp();
    const snapshot = makeSnapshot();
    for (const tabKey of TAB_KEYS) {
      const ui = idleUi();
      ui.selectedTabKey = tabKey;
      renderer.renderPanel(projectDashboardPanel(snapshot, ui));
      const mounts = mainMounts(root);
      const expectedMount = MOUNT_BY_TAB_KEY[tabKey];
      for (const [name, mount] of Object.entries(mounts)) {
        if (name === expectedMount) {
          assert.ok(
            mount.childNodes.length > 0,
            `selected tab ${tabKey} renders region ${name}`,
          );
        } else {
          assert.equal(
            mount.childNodes.length,
            0,
            `tab ${tabKey} leaves region ${name} empty`,
          );
        }
      }
    }
  });

  it("keeps every region subtree identity when an equal snapshot re-renders", function () {
    const { root, renderer } = createWiredApp();
    const ui = idleUi();
    ui.selectedTabKey = "synthesis-sidecar";
    renderer.renderPanel(projectDashboardPanel(makeSnapshot(), ui));
    const mounts = mainMounts(root);
    const captured = captureRegionSubtrees(mounts);
    renderer.renderPanel(projectDashboardPanel(makeSnapshot(), ui));
    assertRegionSubtreesPreserved(mounts, captured);
  });

  it("routes a tab click through optimistic UI state, host action and re-render", function () {
    const { root, controller, sentActions } = createWiredApp();
    controller.applySnapshot(makeSnapshot());
    const buttons = root.querySelectorAll<HTMLButtonElement>("button.tab-btn");
    const productsTab = Array.from(buttons).find(
      (button) => button.textContent === "Products",
    );
    assert.ok(productsTab, "products tab button exists");
    productsTab!.click();
    assert.equal(controller.state.ui.selectedTabKey, "products");
    assert.deepEqual(sentActions, [
      { action: "select-tab", payload: { tabKey: "products" } },
    ]);
    const productsMount = root.querySelector('[data-region-mount="products"]')!;
    assert.ok(productsMount.childNodes.length > 0);
    const homeMount = root.querySelector('[data-region-mount="home"]')!;
    assert.equal(homeMount.childNodes.length, 0);
  });

  it("restores the latest workflow README scroll after close and reopen, but not for another workflow", function () {
    const { root, controller, sentActions, getRenderCount } = createWiredApp();
    const workflowDoc = (workflowId: string) => ({
      workflowId,
      workflowLabel: workflowId === "wf-1" ? "Workflow One" : "Workflow Two",
      html: `<p>${workflowId}</p>`,
      markdown: `# ${workflowId}`,
      baseFileUri: `file:///tmp/${workflowId}/README.md`,
      missingReadme: false,
    });

    controller.applySnapshot(
      makeSnapshot({ homeWorkflowDocView: workflowDoc("wf-1") }),
    );
    const firstContent = root.querySelector(
      ".workflow-doc-content",
    ) as HTMLElement;
    const renderCountBeforeScroll = getRenderCount();
    firstContent.scrollTop = 137;
    firstContent.dispatchEvent(new window.Event("scroll"));
    assert.equal(getRenderCount(), renderCountBeforeScroll);
    assert.deepEqual(sentActions, []);

    controller.applySnapshot(makeSnapshot({ homeWorkflowDocView: undefined }));
    controller.applySnapshot(
      makeSnapshot({ homeWorkflowDocView: workflowDoc("wf-1") }),
    );
    const reopenedContent = root.querySelector(
      ".workflow-doc-content",
    ) as HTMLElement;
    assert.equal(reopenedContent.scrollTop, 137);

    const docNodes = captureRegionSubtrees({ doc: reopenedContent });
    controller.applySnapshot(
      makeSnapshot({ homeWorkflowDocView: workflowDoc("wf-1") }),
    );
    assertRegionSubtreesPreserved(
      { doc: root.querySelector(".workflow-doc-content")! },
      docNodes,
    );

    controller.applySnapshot(
      makeSnapshot({ homeWorkflowDocView: workflowDoc("wf-2") }),
    );
    const changedOwnerContent = root.querySelector(
      ".workflow-doc-content",
    ) as HTMLElement;
    assert.equal(changedOwnerContent.scrollTop, 0);
  });

  it("keeps synthesis sidecar UI intents local to the controller", function () {
    const { controller, sentActions } = createWiredApp();
    controller.applySnapshot(
      makeSnapshot({ selectedTabKey: "synthesis-sidecar" }),
    );

    controller.dispatch("synthesis-sidecar-set-trace-filter", {
      filter: "op-",
    });
    assert.equal(sentActions.length, 0, "trace filter stays off the host wire");
    assert.equal(controller.state.ui.synthesisSidecar.traceFilter, "op-");

    controller.dispatch("synthesis-sidecar-select-trace", {
      traceId: "trace-1",
    });
    assert.equal(sentActions.length, 0, "trace selection stays local");
    assert.equal(
      controller.state.ui.synthesisSidecar.selectedTraceId,
      "trace-1",
    );

    controller.dispatch("open-running-task", { taskId: "task-1" });
    assert.deepEqual(sentActions, [
      { action: "open-running-task", payload: { taskId: "task-1" } },
    ]);
  });

  it("writes back the effective selected trace without a host round-trip", function () {
    const { controller, root } = createWiredApp();
    controller.applySnapshot(
      makeSnapshot({ selectedTabKey: "synthesis-sidecar" }),
    );
    assert.equal(
      controller.state.ui.synthesisSidecar.selectedTraceId,
      "trace-1",
      "projection fallback selection syncs into UI state",
    );
    controller.dispatch("synthesis-sidecar-select-trace", { traceId: "gone" });
    assert.equal(
      controller.state.ui.synthesisSidecar.selectedTraceId,
      "trace-1",
      "unknown selection resolves back to the visible trace",
    );
    const detail = root.querySelector(
      '[data-region-mount="synthesis-sidecar"] [data-trace-id="trace-1"]',
    );
    assert.ok(detail, "detail pane renders the effective trace");
  });

  it("disposes the bootstrap listener and ignores host snapshots after disposal", function () {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);

    const dispose = bootstrapDashboardApp();
    window.dispatchEvent(
      new window.MessageEvent("message", {
        data: { type: "dashboard:snapshot", payload: makeSnapshot() },
      }),
    );
    const homeMount = root.querySelector('[data-region-mount="home"]');
    assert.ok(homeMount?.firstChild, "bootstrap renders a host snapshot");

    dispose();
    assert.isNull(homeMount?.firstChild, "dispose clears rendered regions");

    window.dispatchEvent(
      new window.MessageEvent("message", {
        data: { type: "dashboard:snapshot", payload: makeSnapshot() },
      }),
    );
    assert.isNull(
      homeMount?.firstChild,
      "a late host snapshot does not render after disposal",
    );
    root.remove();
  });
});
