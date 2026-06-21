import { assert } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "../../package.json";
import type { JobRecord } from "../../src/jobQueue/manager";
import {
  getBackendsRegistryReadDiagnosticsForTests,
  loadBackendsRegistry,
  resetBackendsRegistryReadDiagnosticsForTests,
} from "../../src/backends/registry";
import {
  buildAcpSkillRunPanelSnapshot,
  getAcpSkillRunSummaryDiagnosticsForTests,
  listAcpSkillRunSummaries,
  resetAcpSkillRunSummaryDiagnosticsForTests,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  countDashboardHumanAttentionTasks,
  projectDashboardActiveTasks,
} from "../../src/modules/dashboardActiveTasks";
import {
  getSkillRunnerRunStoreReadDiagnosticsForTests,
  resetSkillRunnerRunStoreReadDiagnosticsForTests,
  updateSkillRunnerRunStateByRequest,
} from "../../src/modules/skillRunnerRunStore";
import {
  getWorkflowTaskReadDiagnosticsForTests,
  listActiveWorkflowTaskSummaries,
  recordWorkflowTaskUpdate,
  resetWorkflowTaskReadDiagnosticsForTests,
  resetWorkflowTasks,
  subscribeWorkflowTaskChanges,
  updateWorkflowTaskStateByRequest,
} from "../../src/modules/taskRuntime";
import {
  listTaskDashboardHistory,
  resetTaskDashboardHistory,
  summarizeTaskDashboardHistoryScope,
} from "../../src/modules/taskDashboardHistory";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import {
  getBackgroundRefreshReadDiagnosticsForTests,
  recordBackgroundRefreshRead,
  resetBackgroundRefreshGovernanceForTests,
} from "../../src/modules/backgroundRefreshGovernance";
import { mountTaskDashboardRuntime } from "../../src/modules/taskManagerDialog";
import {
  getWorkflowSettings,
  getWorkflowSettingsReadDiagnosticsForTests,
  resetWorkflowSettingsReadDiagnosticsForTests,
} from "../../src/modules/workflowSettings";
import { serializeSettingsRecord } from "../../src/modules/workflowSettingsDomain";

function makeSkillRunnerJob(index: number, backendId: string): JobRecord {
  return {
    id: `governance-job-${index}`,
    workflowId: "workflow-debug-probe",
    request: {
      kind: "skillrunner.job.v1",
      skill_id: "debug-host-bridge-connectivity-probe",
    },
    meta: {
      runId: `governance-run-${index}`,
      workflowLabel: "Debug Probe",
      taskName: "debug-host-bridge-connectivity-probe",
      providerId: "skillrunner",
      backendId,
      backendType: "skillrunner",
      backendBaseUrl: "http://127.0.0.1:8030",
      requestId: `governance-request-${index}`,
      skillId: "debug-host-bridge-connectivity-probe",
    },
    state: "running",
    result: {
      requestId: `governance-request-${index}`,
    },
    createdAt: `2026-06-18T00:${String(index).padStart(2, "0")}:00.000Z`,
    updatedAt: `2026-06-18T00:${String(index).padStart(2, "0")}:01.000Z`,
  };
}

function makeGenericJob(index: number): JobRecord {
  return {
    id: `generic-governance-job-${index}`,
    workflowId: "generic-workflow",
    request: {
      kind: "generic.http.v1",
    },
    meta: {
      runId: `generic-governance-run-${index}`,
      workflowLabel: "Generic Workflow",
      taskName: "Generic task",
      providerId: "generic-http",
      backendId: "generic-backend",
      backendType: "generic-http",
      requestId: `generic-governance-request-${index}`,
    },
    state: "running",
    result: {
      requestId: `generic-governance-request-${index}`,
    },
    createdAt: `2026-06-18T03:${String(index).padStart(2, "0")}:00.000Z`,
    updatedAt: `2026-06-18T03:${String(index).padStart(2, "0")}:01.000Z`,
  };
}

function seedSkillRunnerRuns(count: number) {
  for (let index = 0; index < count; index += 1) {
    const backendId = index % 2 === 0 ? "skillrunner-a" : "skillrunner-b";
    recordWorkflowTaskUpdate(makeSkillRunnerJob(index, backendId));
    if (index % 3 === 0) {
      updateSkillRunnerRunStateByRequest({
        backendId,
        requestId: `governance-request-${index}`,
        state: "succeeded",
        updatedAt: `2026-06-18T01:${String(index).padStart(2, "0")}:00.000Z`,
      });
    }
  }
}

function setPluginPref(key: string, value: unknown) {
  Zotero.Prefs.set(`${config.prefsPrefix}.${key}`, value, true);
}

function seedBackendsPref() {
  setPluginPref(
    "backendsConfigJson",
    JSON.stringify({
      schemaVersion: 2,
      backends: [
        {
          id: "skillrunner-a",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        {
          id: "skillrunner-b",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8031",
          auth: { kind: "none" },
        },
      ],
    }),
  );
}

function createDashboardRuntimeHarness() {
  let intervalCallback: (() => void) | undefined;
  const frameWindow = {
    posted: [] as unknown[],
    postMessage(message: unknown) {
      this.posted.push(message);
    },
  };
  const frame = {
    contentWindow: frameWindow,
    style: {} as Record<string, string>,
    setAttribute() {
      // no-op
    },
    addEventListener() {
      // load is not needed; mountTaskDashboardRuntime also refreshes on init.
    },
    remove() {
      // no-op
    },
  };
  const document = {
    createElement() {
      return frame;
    },
  };
  const root = {
    innerHTML: "",
    ownerDocument: document,
    appendChild() {
      // no-op
    },
  };
  const hostWindow = {
    document,
    setInterval(callback: () => void) {
      intervalCallback = callback;
      return 1;
    },
    clearInterval() {
      // no-op
    },
    setTimeout(callback: () => void) {
      return setTimeout(callback, 0) as unknown as number;
    },
    clearTimeout(timer: number) {
      clearTimeout(timer as unknown as ReturnType<typeof setTimeout>);
    },
    addEventListener() {
      // no-op
    },
    removeEventListener() {
      // no-op
    },
    alert() {
      // no-op
    },
  };
  return {
    root: root as unknown as HTMLElement,
    hostWindow: hostWindow as unknown as Window,
    frameWindow,
    runInterval() {
      intervalCallback?.();
    },
  };
}

async function flushDashboardRuntime() {
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("background refresh governance", function () {
  beforeEach(function () {
    resetAcpSkillRunsForTests();
    resetWorkflowTasks();
    resetTaskDashboardHistory();
    resetPluginStateStoreForTests();
    resetBackgroundRefreshGovernanceForTests();
    resetBackendsRegistryReadDiagnosticsForTests();
    resetWorkflowSettingsReadDiagnosticsForTests();
    resetWorkflowTaskReadDiagnosticsForTests();
    resetAcpSkillRunSummaryDiagnosticsForTests();
  });

  afterEach(function () {
    resetAcpSkillRunsForTests();
    resetWorkflowTasks();
    resetTaskDashboardHistory();
    resetPluginStateStoreForTests();
    resetBackgroundRefreshGovernanceForTests();
    resetBackendsRegistryReadDiagnosticsForTests();
    resetWorkflowSettingsReadDiagnosticsForTests();
    resetWorkflowTaskReadDiagnosticsForTests();
    resetAcpSkillRunSummaryDiagnosticsForTests();
  });

  it("keeps dashboard, sidebar, and popover summary reads off full SkillRunner payloads", function () {
    seedSkillRunnerRuns(36);
    updateSkillRunnerRunStateByRequest({
      backendId: "skillrunner-b",
      requestId: "governance-request-1",
      state: "waiting_user",
      updatedAt: "2026-06-18T02:00:00.000Z",
    });
    upsertAcpSkillRun({
      requestId: "acp-governance-waiting",
      backendId: "acp-backend",
      backendType: "acp",
      status: "waiting_user",
      workflowId: "literature-workbench",
      workflowLabel: "Literature Workbench",
      taskName: "ACP waiting run",
    });

    resetSkillRunnerRunStoreReadDiagnosticsForTests();

    const dashboardActiveRows = projectDashboardActiveTasks({
      activeTasks: listActiveWorkflowTaskSummaries(),
      acpSkillRuns: listAcpSkillRunSummaries({ activeOnly: true }),
    });
    const dashboardHistorySummary = summarizeTaskDashboardHistoryScope();
    const sidebarWaitingCount = countDashboardHumanAttentionTasks({
      activeTasks: listActiveWorkflowTaskSummaries(),
      acpSkillRuns: listAcpSkillRunSummaries({ activeOnly: true }),
    });
    const popoverRows = projectDashboardActiveTasks({
      activeTasks: listActiveWorkflowTaskSummaries({ limit: 6 }),
      acpSkillRuns: listAcpSkillRunSummaries({
        activeOnly: true,
        limit: 6,
      }),
    }).slice(0, 6);

    assert.isAbove(dashboardActiveRows.length, 0);
    assert.isAbove(dashboardHistorySummary.total, 0);
    assert.isAtLeast(sidebarWaitingCount, 1);
    assert.isAtMost(popoverRows.length, 6);
    const diagnostics = getSkillRunnerRunStoreReadDiagnosticsForTests();
    assert.equal(diagnostics.fullPayloadReadCount, 0);
    assert.equal(diagnostics.fullPayloadQueryCount, 0);
    assert.equal(diagnostics.lightweightProjectionUnscopedReadCount, 0);
    assert.equal(diagnostics.lightweightProjectionUnscopedQueryCount, 0);
    assert.isAbove(diagnostics.lightweightProjectionSummaryQueryCount, 0);
    assert.isAbove(diagnostics.lightweightProjectionReadCount, 0);
  });

  it("caches backend registry and workflow settings parsing by raw preference text", async function () {
    seedBackendsPref();
    setPluginPref(
      "workflowSettingsJson",
      serializeSettingsRecord({
        "workflow-debug-probe": {
          backendId: "skillrunner-a",
          workflowParams: { language: "zh-CN" },
        },
      }),
    );

    resetBackendsRegistryReadDiagnosticsForTests();
    await loadBackendsRegistry();
    await loadBackendsRegistry();
    const backendDiagnostics = getBackendsRegistryReadDiagnosticsForTests();
    assert.equal(backendDiagnostics.parseCount, 1);
    assert.equal(backendDiagnostics.cacheHitCount, 1);

    resetWorkflowSettingsReadDiagnosticsForTests();
    assert.equal(
      getWorkflowSettings("workflow-debug-probe").backendId,
      "skillrunner-a",
    );
    assert.equal(
      getWorkflowSettings("workflow-debug-probe").backendId,
      "skillrunner-a",
    );
    const workflowDiagnostics = getWorkflowSettingsReadDiagnosticsForTests();
    assert.equal(workflowDiagnostics.parseCount, 1);
    assert.isAtLeast(workflowDiagnostics.cacheHitCount, 1);
  });

  it("uses active indexes for task and ACP summaries instead of completed-record scans", function () {
    for (let index = 0; index < 48; index += 1) {
      recordWorkflowTaskUpdate({
        ...makeGenericJob(index),
        state: "succeeded",
      });
      upsertAcpSkillRun({
        requestId: `acp-completed-${index}`,
        backendId: "acp-backend",
        backendType: "acp",
        status: "succeeded",
        workflowId: "literature-workbench",
        workflowLabel: "Literature Workbench",
        taskName: "completed ACP run",
      });
    }
    recordWorkflowTaskUpdate(makeGenericJob(100));
    upsertAcpSkillRun({
      requestId: "acp-active",
      backendId: "acp-backend",
      backendType: "acp",
      status: "waiting_user",
      workflowId: "literature-workbench",
      workflowLabel: "Literature Workbench",
      taskName: "active ACP run",
    });

    resetWorkflowTaskReadDiagnosticsForTests();
    resetAcpSkillRunSummaryDiagnosticsForTests();

    const activeTasks = listActiveWorkflowTaskSummaries();
    const activeAcpRuns = listAcpSkillRunSummaries({ activeOnly: true });

    assert.equal(activeTasks.length, 1);
    assert.equal(activeAcpRuns.length, 1);
    const taskDiagnostics = getWorkflowTaskReadDiagnosticsForTests();
    assert.equal(taskDiagnostics.fullTaskRecordScanCount, 0);
    assert.equal(taskDiagnostics.activeIndexScanCount, 1);
    assert.equal(taskDiagnostics.taskRecordCandidateReadCount, 1);
    const acpDiagnostics = getAcpSkillRunSummaryDiagnosticsForTests();
    assert.equal(acpDiagnostics.fullRunRecordScanCount, 0);
    assert.equal(acpDiagnostics.activeIndexScanCount, 1);
    assert.equal(acpDiagnostics.runCandidateReadCount, 1);
  });

  it("migrates SkillRunner pre-request rows to request canonical rows and clears terminal active state", function () {
    const preRequestJob: JobRecord = {
      ...makeSkillRunnerJob(200, "skillrunner-a"),
      id: "skillrunner-pre-request-job",
      meta: {
        ...makeSkillRunnerJob(200, "skillrunner-a").meta,
        localRunId: "skillrunner-local-run-200",
        requestId: "",
        skillRunnerLifecycleState: "request_creating",
      },
      result: {},
      state: "running",
      updatedAt: "2026-06-18T05:00:00.000Z",
    };
    const readyJob: JobRecord = {
      ...preRequestJob,
      id: "skillrunner-request-ready-job",
      meta: {
        ...preRequestJob.meta,
        requestId: "skillrunner-request-ready-200",
        skillRunnerRequestReady: true,
        skillRunnerLifecycleState: "running",
      },
      result: {
        requestId: "skillrunner-request-ready-200",
      },
      updatedAt: "2026-06-18T05:00:01.000Z",
    };

    recordWorkflowTaskUpdate(preRequestJob);
    assert.lengthOf(
      listActiveWorkflowTaskSummaries({ backendId: "skillrunner-a" }),
      1,
    );

    recordWorkflowTaskUpdate(readyJob);
    const activeReadyRows = listActiveWorkflowTaskSummaries({
      backendId: "skillrunner-a",
    });
    assert.lengthOf(activeReadyRows, 1);
    assert.equal(
      activeReadyRows[0]?.requestId,
      "skillrunner-request-ready-200",
    );

    updateWorkflowTaskStateByRequest({
      backendId: "skillrunner-a",
      backendType: "skillrunner",
      requestId: "skillrunner-request-ready-200",
      state: "succeeded",
      updatedAt: "2026-06-18T05:00:02.000Z",
    });

    const activeAfterTerminal = listActiveWorkflowTaskSummaries({
      backendId: "skillrunner-a",
    });
    assert.lengthOf(activeAfterTerminal, 0);
  });

  it("bounds ACP Skills panel summaries while preserving selected run details", function () {
    for (let index = 0; index < 120; index += 1) {
      const createdAt = `2026-06-18T${String(4 + Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00.000Z`;
      upsertAcpSkillRun({
        requestId: `acp-panel-${index}`,
        backendId: "acp-backend",
        backendType: "acp",
        status: "succeeded",
        workflowId: "literature-workbench",
        workflowLabel: "Literature Workbench",
        taskName: `completed ACP run ${index}`,
        createdAt,
        updatedAt: createdAt,
        event: {
          stage: "complete",
          level: "info",
          message: `ACP panel event ${index}`,
          ts: createdAt,
        },
      });
    }

    resetWorkflowTaskReadDiagnosticsForTests();
    resetAcpSkillRunSummaryDiagnosticsForTests();

    const snapshot = buildAcpSkillRunPanelSnapshot({
      selectedRequestId: "acp-panel-0",
    });
    const selectedSummary = snapshot.runs.find(
      (run) => run.requestId === "acp-panel-0",
    );

    assert.isAtMost(snapshot.runs.length, 100);
    assert.isTrue(snapshot.drawer?.truncated);
    assert.include(snapshot.drawer?.notice || "", "Dashboard");
    assert.equal(snapshot.selectedRun?.requestId, "acp-panel-0");
    assert.isAbove(snapshot.selectedRun?.events.length || 0, 0);
    assert.isOk(selectedSummary);
    assert.notProperty(selectedSummary as Record<string, unknown>, "events");
    assert.notProperty(
      selectedSummary as Record<string, unknown>,
      "transcriptItems",
    );
    assert.equal(
      getWorkflowTaskReadDiagnosticsForTests().fullTaskRecordScanCount,
      0,
    );
  });

  it("gates unchanged dashboard home periodic ticks before metadata counts or model builds", async function () {
    seedBackendsPref();
    seedSkillRunnerRuns(24);
    const harness = createDashboardRuntimeHarness();
    const runtime = await mountTaskDashboardRuntime({
      root: harness.root,
      hostWindow: harness.hostWindow,
      initialTabKey: "home",
    });
    await flushDashboardRuntime();

    resetSkillRunnerRunStoreReadDiagnosticsForTests();
    resetBackendsRegistryReadDiagnosticsForTests();
    resetBackgroundRefreshGovernanceForTests();
    harness.runInterval();
    await flushDashboardRuntime();
    runtime.cleanup();

    const reads = getBackgroundRefreshReadDiagnosticsForTests();
    assert.deepInclude(
      reads.map((entry) => entry.readShape),
      "dirty-gate",
    );
    assert.notDeepInclude(
      reads.map((entry) => entry.readShape),
      "metadata-count",
    );
    assert.notDeepInclude(
      reads.map((entry) => entry.readShape),
      "model-build",
    );
    assert.notDeepInclude(
      reads.map((entry) => entry.readShape),
      "active-summary",
    );
    const runDiagnostics = getSkillRunnerRunStoreReadDiagnosticsForTests();
    assert.equal(runDiagnostics.fullPayloadReadCount, 0);
    assert.equal(runDiagnostics.lightweightProjectionUnscopedReadCount, 0);
    assert.equal(runDiagnostics.lightweightProjectionSummaryQueryCount, 0);
    assert.equal(getBackendsRegistryReadDiagnosticsForTests().parseCount, 0);
  });

  it("broadcasts task changes to UI listeners without constructing a full task snapshot", function () {
    seedSkillRunnerRuns(24);
    resetSkillRunnerRunStoreReadDiagnosticsForTests();

    let received = 0;
    const unsubscribe = subscribeWorkflowTaskChanges((event) => {
      if (event.reason === "record-updated") {
        received += 1;
      }
    });
    recordWorkflowTaskUpdate(makeGenericJob(99));
    unsubscribe();

    assert.equal(received, 1);
    const diagnostics = getSkillRunnerRunStoreReadDiagnosticsForTests();
    assert.equal(diagnostics.fullPayloadReadCount, 0);
    assert.equal(diagnostics.fullPayloadQueryCount, 0);
    assert.equal(diagnostics.lightweightProjectionUnscopedReadCount, 0);
    assert.equal(diagnostics.lightweightProjectionUnscopedQueryCount, 0);
  });

  it("keeps backend-tab refresh scoped to the selected backend projection rows", function () {
    seedSkillRunnerRuns(20);
    resetSkillRunnerRunStoreReadDiagnosticsForTests();

    const activeRows = listActiveWorkflowTaskSummaries({
      backendId: "skillrunner-b",
    });
    const historyRows = listTaskDashboardHistory({
      backendId: "skillrunner-b",
    });

    assert.isAbove(activeRows.length, 0);
    assert.isAbove(historyRows.length, 0);
    assert.isTrue(
      [...activeRows, ...historyRows].every(
        (entry) => entry.backendId === "skillrunner-b",
      ),
    );
    const diagnostics = getSkillRunnerRunStoreReadDiagnosticsForTests();
    assert.equal(diagnostics.fullPayloadReadCount, 0);
    assert.equal(diagnostics.fullPayloadQueryCount, 0);
    assert.equal(diagnostics.lightweightProjectionUnscopedReadCount, 0);
    assert.equal(diagnostics.lightweightProjectionUnscopedQueryCount, 0);
  });

  it("records scoped dashboard refresh read shapes for governance diagnostics", function () {
    recordBackgroundRefreshRead({
      owner: "task-dashboard-refresh",
      surface: "home",
      scopeKey: "dashboard-home",
      readShape: "history-summary",
    });
    recordBackgroundRefreshRead({
      owner: "task-dashboard-refresh",
      surface: "backend",
      scopeKey: "skillrunner-b",
      readShape: "scoped-history-rows",
    });

    const diagnostics = getBackgroundRefreshReadDiagnosticsForTests();
    assert.deepInclude(
      diagnostics.map((entry) => entry.readShape),
      "history-summary",
    );
    assert.deepInclude(
      diagnostics.map((entry) => entry.readShape),
      "scoped-history-rows",
    );
  });

  it("requires long-lived setInterval sites to declare refresh governance", function () {
    const root = process.cwd();
    const files = [
      "src/modules/acpSkillRunnerOrchestrator.ts",
      "src/modules/hostBridgeServer.ts",
      "src/modules/skillRunnerBackendReachabilityCoordinator.ts",
      "src/modules/skillRunnerLocalRuntimeManager.ts",
      "src/modules/synthesisWorkbenchTab.ts",
      "src/modules/taskManagerDialog.ts",
      "src/modules/workspaceTab.ts",
      "src/modules/workspaceToolbarTaskPopover.ts",
    ];
    const owners = [
      "acp-workspace-activity",
      "host-bridge-supervisor",
      "skillrunner-backend-reachability",
      "managed-local-runtime-heartbeat",
      "managed-local-runtime-status-reconcile",
      "managed-local-runtime-auto-ensure",
      "synthesis-command-progress",
      "synthesis-workbench-handshake",
      "task-dashboard-refresh",
      "workspace-tab-handshake",
      "workspace-toolbar-task-popover-refresh",
    ];

    const source = files
      .map((file) => readFileSync(join(root, file), "utf8"))
      .join("\n");
    const intervalCount = (source.match(/setInterval\(/g) || []).length;
    const policyCount = (
      source.match(/registerBackgroundRefreshTimer\(/g) || []
    ).length;

    assert.equal(policyCount, intervalCount);
    for (const owner of owners) {
      assert.include(source, `owner: "${owner}"`);
    }
  });
});
