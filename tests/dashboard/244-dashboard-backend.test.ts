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
  BackendRegion,
  isDashboardTaskTerminal,
  type BackendRegionProps,
  type DashboardBackendSelection,
  type DashboardBackendTaskRow,
} from "../../src/dashboard/components/BackendRegion";

type CapturedAction = { action: string; payload: Record<string, unknown> };

function makeTaskRow(
  overrides: Partial<DashboardBackendTaskRow> = {},
): DashboardBackendTaskRow {
  return {
    id: "task-1",
    taskName: "Run workflow",
    workflowLabel: "Workflow One",
    engine: "",
    statusText: "Running",
    statusClass: "status running is-accent",
    requestId: "req-1",
    runKey: "",
    queueId: "",
    requestKind: "",
    terminal: false,
    updatedAtText: "2026-09-04 00:01",
    ...overrides,
  };
}

function makeSelection(
  overrides: Partial<DashboardBackendSelection> = {},
): DashboardBackendSelection {
  return {
    present: true,
    emptyText: "No history",
    kind: "generic",
    backendId: "b1",
    backendType: "generic",
    title: "Backend One",
    subview: "runs",
    managementUiUrl: "",
    scrollKey: "backend:b1",
    labels: {
      openDiagnostics: "Open diagnostics",
      viewTask: "View task",
      openRun: "Open Run",
      cancelRun: "Cancel Run",
      cancelQueued: "Cancel queued workflow unit",
      closeManagement: "Close management",
      openManagementExternal: "Open externally",
      refreshModelCache: "Refresh models",
      openManagement: "Open management",
      managementLoadFailed: "Management failed to load",
      managementLoading: "Loading management…",
    },
    selectedLogTaskId: "",
    taskTable: {
      panelClassName: "",
      columns: ["Task", "Workflow", "Status", "Request", "Updated", "Actions"],
      emptyText: "No tasks",
      selectedId: "",
      rows: [],
    },
    logs: null,
    ...overrides,
  };
}

function renderRegion(selection: DashboardBackendSelection) {
  const actions: CapturedAction[] = [];
  const container = document.createElement("div");
  document.body.appendChild(container);
  const onAction: BackendRegionProps["onAction"] = (action, payload) => {
    actions.push({ action, payload });
  };
  render(h(BackendRegion, { selection, onAction }), container);
  return { container, actions, onAction };
}

describe("dashboard backend region (src/dashboard/components/BackendRegion)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  it("renders the empty state when no backend view is present", function () {
    const { container } = renderRegion(
      makeSelection({ present: false, emptyText: "No history" }),
    );
    const region = container.querySelector(
      '[data-region-content="dashboard-backend"]',
    );
    assert.ok(region);
    assert.equal(region!.querySelector(".empty")!.textContent, "No history");
    assert.isNull(region!.querySelector(".toolbar"));
  });

  it("renders the generic backend: toolbar, task table, bound-log section", function () {
    const selection = makeSelection({
      selectedLogTaskId: "task-1",
      taskTable: {
        panelClassName: "",
        columns: [
          "Task",
          "Workflow",
          "Status",
          "Request",
          "Updated",
          "Actions",
        ],
        emptyText: "No tasks",
        selectedId: "task-1",
        rows: [makeTaskRow()],
      },
      logs: {
        title: "Logs",
        boundTaskText: "Task: task-1",
        boundRequestIdText: "Request: req-1",
        boundJobIdText: "Job: -",
        emptyText: "No logs",
        columns: [
          "Time",
          "Level",
          "Stage",
          "Scope",
          "Message",
          "Request",
          "Job",
        ],
        rows: [
          {
            id: "log-1",
            timeText: "2026-09-04 00:00",
            levelText: "ERROR",
            levelBadgeClass: "log-level-badge log-level-badge--error",
            stage: "run",
            scope: "core",
            message: "boom",
            requestId: "req-1",
            jobId: "",
          },
        ],
        selectedLogEntryId: "log-1",
        detailTitle: "Detail",
        detailText: '{\n  "error": "boom"\n}',
      },
    });
    const { container, actions } = renderRegion(selection);

    assert.equal(
      container.querySelector(".toolbar .page-title")!.textContent,
      "Backend One",
    );
    const diagnostics =
      container.querySelector<HTMLButtonElement>(".toolbar > .btn")!;
    assert.isFalse(diagnostics.disabled);

    const wrap = container.querySelector(".backend-task-table-wrap")!;
    assert.ok(wrap);
    const rows = wrap.querySelectorAll("tbody tr");
    assert.equal(rows.length, 1);
    assert.ok(rows[0].classList.contains("clickable"));
    assert.ok(rows[0].classList.contains("selected"));
    assert.ok(rows[0].querySelector(".status.running.is-accent"));

    // Bound-log section.
    const bound = container.querySelectorAll(".bound-task-item");
    assert.equal(bound.length, 3);
    assert.equal(bound[0].textContent, "Task: task-1");
    const logRow = container.querySelector(".logs-table tbody tr")!;
    assert.ok(logRow.classList.contains("selected"));
    assert.ok(logRow.querySelector(".log-level-badge--error"));
    assert.equal(
      container.querySelector(".log-detail pre")!.textContent,
      '{\n  "error": "boom"\n}',
    );

    // Actions keep the legacy names and payload shapes.
    (rows[0] as HTMLElement).click();
    assert.deepEqual(actions[0], {
      action: "select-log-task",
      payload: { backendId: "b1", taskId: "task-1" },
    });
    (logRow as HTMLElement).click();
    assert.deepEqual(actions[1], {
      action: "select-log-entry",
      payload: { backendId: "b1", logEntryId: "log-1" },
    });
    diagnostics.click();
    assert.deepEqual(actions[2], {
      action: "open-log-diagnostics",
      payload: { backendId: "b1", taskId: "task-1" },
    });
  });

  it("disables generic diagnostics without a selected log task", function () {
    const { container, actions } = renderRegion(makeSelection());
    const diagnostics =
      container.querySelector<HTMLButtonElement>(".toolbar > .btn")!;
    assert.isTrue(diagnostics.disabled);
    diagnostics.click();
    assert.equal(actions.length, 0);
    assert.equal(
      container.querySelector(".panel .empty")!.textContent,
      "No tasks",
    );
  });

  it("generic acp rows with a skillrunner job offer open-run/cancel-run", function () {
    const selection = makeSelection({
      backendType: "acp",
      taskTable: {
        panelClassName: "",
        columns: [
          "Task",
          "Workflow",
          "Status",
          "Request",
          "Updated",
          "Actions",
        ],
        emptyText: "No tasks",
        selectedId: "",
        rows: [
          makeTaskRow({ requestKind: "skillrunner.job.v1", terminal: true }),
          makeTaskRow({ id: "task-2", requestKind: "other" }),
        ],
      },
    });
    const { container, actions } = renderRegion(selection);
    const rows = container.querySelectorAll(
      ".backend-task-table-wrap tbody tr",
    );
    const firstButtons =
      rows[0].querySelectorAll<HTMLButtonElement>(".actions-wrap .btn");
    // view task + open run + cancel run.
    assert.equal(firstButtons.length, 3);
    assert.isTrue(firstButtons[2].disabled, "terminal run cannot be canceled");
    firstButtons[1].click();
    firstButtons[2].click();
    assert.deepEqual(actions, [
      { action: "open-run", payload: { backendId: "b1", requestId: "req-1" } },
    ]);
    // Rows without the skillrunner job kind only get the view-task button.
    assert.equal(rows[1].querySelectorAll(".actions-wrap .btn").length, 1);
  });

  it("renders the skillrunner runs subview with queue/run actions", function () {
    const selection = makeSelection({
      kind: "skillrunner",
      backendType: "skillrunner",
      taskTable: {
        panelClassName: "skillrunner-task-panel",
        columns: [
          "Task",
          "Workflow",
          "Engine",
          "Status",
          "Request",
          "Updated",
          "Actions",
        ],
        emptyText: "No tasks",
        selectedId: "",
        rows: [
          makeTaskRow({
            id: "queued-1",
            queueId: "queue-1",
            requestId: "",
            engine: "hermes",
          }),
          makeTaskRow({ id: "run-1", runKey: "rk-1", engine: "" }),
          makeTaskRow({ id: "bare-1", requestId: "", runKey: "" }),
        ],
      },
    });
    const { container, actions } = renderRegion(selection);

    const panel = container.querySelector(".panel.skillrunner-task-panel")!;
    assert.ok(panel, "skillrunner table panel class");
    const rows = panel.querySelectorAll("tbody tr");
    assert.ok(rows[0].classList.contains("host-queued-workflow-row"));
    assert.isNotOk(rows[0].classList.contains("clickable"));
    assert.equal(rows[0].querySelectorAll("td")[2].textContent, "hermes");
    // Engine falls back to "-" for the skillrunner variant.
    assert.equal(rows[1].querySelectorAll("td")[2].textContent, "-");

    const queuedCancel = rows[0].querySelector<HTMLButtonElement>(
      ".actions-wrap .btn.icon-btn",
    )!;
    assert.equal(
      queuedCancel.getAttribute("aria-label"),
      "Cancel queued workflow unit",
    );
    queuedCancel.click();
    assert.deepEqual(actions[0], {
      action: "cancel-queued-workflow-unit",
      payload: { queueId: "queue-1" },
    });

    const runButtons =
      rows[1].querySelectorAll<HTMLButtonElement>(".actions-wrap .btn");
    runButtons[0].click();
    runButtons[1].click();
    assert.deepEqual(actions[1], {
      action: "open-run",
      payload: { backendId: "b1", runKey: "rk-1" },
    });
    assert.deepEqual(actions[2], {
      action: "cancel-run",
      payload: { backendId: "b1", requestId: "req-1" },
    });

    // A row with no queueId/runKey/requestId renders the empty marker.
    assert.equal(rows[2].querySelector(".actions-wrap")!.textContent, "-");

    // Toolbar actions.
    const toolbarButtons = container.querySelectorAll<HTMLButtonElement>(
      ".toolbar .toolbar-actions .btn",
    );
    assert.equal(toolbarButtons.length, 2);
    toolbarButtons[0].click();
    toolbarButtons[1].click();
    assert.deepEqual(actions[3], {
      action: "refresh-model-cache",
      payload: { backendId: "b1" },
    });
    assert.deepEqual(actions[4], {
      action: "open-management",
      payload: { backendId: "b1" },
    });
  });

  it("hosts the skillrunner management subview and requests the mount", async function () {
    const selection = makeSelection({
      kind: "skillrunner",
      backendType: "skillrunner",
      subview: "management",
      managementUiUrl: "http://127.0.0.1:9000/manage",
    });
    const { container, actions } = renderRegion(selection);

    const mount = container.querySelector<HTMLElement>(
      '[data-zs-role="skillrunner-management-dashboard-host"]',
    );
    assert.ok(mount, "management mount host exists");
    assert.equal(mount!.dataset.backendId, "b1");
    assert.equal(
      mount!.dataset.managementUiUrl,
      "http://127.0.0.1:9000/manage",
    );
    assert.ok(mount!.querySelector(".management-host-loading"));
    assert.isNull(
      container.querySelector(".backend-task-table-wrap"),
      "management subview replaces the task table",
    );

    // Preact flushes useEffect via afterNextFrame, whose setTimeout fallback
    // path (no global rAF at module load) costs ~35ms before the deferred
    // mount-management-host setTimeout(0) fires.
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.deepEqual(actions, [
      {
        action: "mount-management-host",
        payload: {
          backendId: "b1",
          managementUiUrl: "http://127.0.0.1:9000/manage",
        },
      },
    ]);

    const toolbarButtons = container.querySelectorAll<HTMLButtonElement>(
      ".toolbar .toolbar-actions .btn",
    );
    toolbarButtons[0].click();
    toolbarButtons[1].click();
    assert.deepEqual(actions[1], {
      action: "show-runs",
      payload: { backendId: "b1" },
    });
    assert.deepEqual(actions[2], {
      action: "open-management-external",
      payload: { backendId: "b1" },
    });
  });

  it("shows the management error banner when no URL is available", async function () {
    const { container, actions } = renderRegion(
      makeSelection({
        kind: "skillrunner",
        backendType: "skillrunner",
        subview: "management",
        managementUiUrl: "",
      }),
    );
    assert.ok(container.querySelector(".management-host-panel .error-banner"));
    assert.isNull(
      container.querySelector(
        '[data-zs-role="skillrunner-management-dashboard-host"]',
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(actions.length, 0, "no mount request without a URL");
  });

  it("renders the acp backend: open-acp-skill-runs toolbar and requestId run actions", function () {
    const selection = makeSelection({
      kind: "acp",
      backendType: "acp",
      taskTable: {
        panelClassName: "skillrunner-task-panel",
        columns: [
          "Task",
          "Workflow",
          "Engine",
          "Status",
          "Request",
          "Updated",
          "Actions",
        ],
        emptyText: "No tasks",
        selectedId: "",
        rows: [makeTaskRow({ requestId: "req-9" })],
      },
    });
    const { container, actions } = renderRegion(selection);

    // Engine falls back to "ACP" for this variant.
    const row = container.querySelector(".backend-task-table-wrap tbody tr")!;
    assert.equal(row.querySelectorAll("td")[2].textContent, "ACP");

    const openRuns =
      container.querySelector<HTMLButtonElement>(".toolbar > .btn")!;
    openRuns.click();
    assert.deepEqual(actions[0], {
      action: "open-acp-skill-runs",
      payload: {},
    });

    const rowButtons =
      row.querySelectorAll<HTMLButtonElement>(".actions-wrap .btn");
    assert.equal(rowButtons.length, 2);
    rowButtons[0].click();
    rowButtons[1].click();
    assert.deepEqual(actions[1], {
      action: "open-run",
      payload: { backendId: "b1", requestId: "req-9" },
    });
    assert.deepEqual(actions[2], {
      action: "cancel-run",
      payload: { backendId: "b1", requestId: "req-9" },
    });
  });

  it("keeps region subtree identity when an equal selection re-renders", function () {
    const actions: CapturedAction[] = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onAction: BackendRegionProps["onAction"] = (action, payload) => {
      actions.push({ action, payload });
    };
    const regions = { backend: container };

    render(
      h(BackendRegion, { selection: makeSelection(), onAction }),
      container,
    );
    const captured = captureRegionSubtrees(regions);

    // Same visible content, fresh object graph: nothing is rebuilt.
    render(
      h(BackendRegion, { selection: makeSelection(), onAction }),
      container,
    );
    assertRegionSubtreesPreserved(regions, captured);

    // A visible change (a new row) rebuilds the region.
    render(
      h(BackendRegion, {
        selection: makeSelection({
          taskTable: {
            panelClassName: "",
            columns: [
              "Task",
              "Workflow",
              "Status",
              "Request",
              "Updated",
              "Actions",
            ],
            emptyText: "No tasks",
            selectedId: "",
            rows: [makeTaskRow()],
          },
        }),
        onAction,
      }),
      container,
    );
    assert.equal(
      container.querySelectorAll(".backend-task-table-wrap tbody tr").length,
      1,
    );
  });

  it("isDashboardTaskTerminal mirrors the legacy terminal-status rule", function () {
    assert.isTrue(isDashboardTaskTerminal("running", { terminal: true }));
    assert.isFalse(isDashboardTaskTerminal("succeeded", { terminal: false }));
    assert.isTrue(isDashboardTaskTerminal("Failed", null));
    assert.isTrue(isDashboardTaskTerminal("canceled", undefined));
    assert.isFalse(isDashboardTaskTerminal("running", null));
  });
});
