import { assert } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "../../package.json";
import { buildAcpSkillRunPanelSnapshot } from "../helpers/acpSkillRunWorkspaceHarness";
import type { JobRecord } from "../../src/jobQueue/manager";
import {
  getBackendsRegistryReadDiagnosticsForTests,
  loadBackendsRegistry,
  resetBackendsRegistryReadDiagnosticsForTests,
} from "../../src/backends/registry";
import {
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
  attachSkillRunnerRequestId,
  createSkillRunnerRun,
  getSkillRunnerRunStoreReadDiagnosticsForTests,
  resetSkillRunnerRunStoreReadDiagnosticsForTests,
  updateSkillRunnerRunStateByRequest,
  updateSkillRunnerRunStateByRunKey,
} from "../../src/modules/skillRunnerRunStore";
import {
  getWorkflowTaskReadDiagnosticsForTests,
  listActiveWorkflowTaskSummaries,
  recordWorkflowTaskUpdate,
  resetWorkflowTaskReadDiagnosticsForTests,
  resetWorkflowTasks,
  subscribeWorkflowTaskChanges,
  updateWorkflowTaskStateByRequest,
  type WorkflowTaskRecord,
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
import {
  mountTaskDashboardRuntime,
  resetTaskManagerDialogRuntimeForTests,
} from "../../src/modules/taskManagerDialog";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { resetAcpRuntimeReplayControllerForTests } from "../../src/modules/acpRuntimeReplayController";
import {
  getWorkflowSettings,
  getWorkflowSettingsReadDiagnosticsForTests,
  resetWorkflowSettingsReadDiagnosticsForTests,
} from "../../src/modules/workflowSettings";
import { serializeSettingsRecord } from "../../src/modules/workflowSettingsDomain";
import {
  appendRuntimeLog,
  clearRuntimeLogs,
} from "../../src/modules/runtimeLogManager";

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
    recordSkillRunnerRunFromJob(makeSkillRunnerJob(index, backendId));
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

function recordSkillRunnerRunFromJob(job: JobRecord) {
  const run = createSkillRunnerRun({
    backendId: String(job.meta.backendId || ""),
    workflowId: job.workflowId,
    workflowRunId: String(job.meta.workflowRunId || job.meta.runId || ""),
    jobId: job.id,
    taskName: String(job.meta.taskName || job.id),
    skillId: String(job.meta.skillId || "") || undefined,
    sequenceRunId:
      String(job.meta.sequenceRunId || job.meta.workflowRunId || "") ||
      undefined,
    sequenceJobId: String(job.meta.sequenceJobId || "") || undefined,
    sequenceStepId: String(job.meta.sequenceStepId || "") || undefined,
    requestPayload: job.request,
    fetchType: "result",
    executionMode:
      String(job.meta.executionMode || "") === "interactive"
        ? "interactive"
        : "auto",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
  if (!run) {
    return null;
  }
  const requestId = String(
    job.meta.requestId ||
      (job.result as { requestId?: unknown } | undefined)?.requestId ||
      "",
  ).trim();
  const attached = requestId
    ? attachSkillRunnerRequestId({
        runKey: run.runKey,
        requestId,
        updatedAt: job.updatedAt,
      }) || run
    : run;
  if (job.meta.skillRunnerRequestReady) {
    return (
      updateSkillRunnerRunStateByRunKey({
        runKey: attached.runKey,
        state: "request_ready",
        backendStatus: job.state,
        updatedAt: job.updatedAt,
      }) || attached
    );
  }
  return (
    updateSkillRunnerRunStateByRunKey({
      runKey: attached.runKey,
      state: job.state,
      backendStatus: job.state,
      updatedAt: job.updatedAt,
    }) || attached
  );
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
  let messageCallback: ((event: { data: unknown }) => void) | undefined;
  const alerts: string[] = [];
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
    addEventListener(
      type: string,
      callback: (event: { data: unknown }) => void,
    ) {
      if (type === "message") messageCallback = callback;
    },
    removeEventListener() {
      // no-op
    },
    alert(message: string) {
      alerts.push(message);
    },
  };
  return {
    root: root as unknown as HTMLElement,
    hostWindow: hostWindow as unknown as Window,
    frameWindow,
    alerts,
    dispatchAction(action: string, payload: Record<string, unknown>) {
      messageCallback?.({
        data: { type: "dashboard:action", action, payload },
      });
    },
    runInterval() {
      intervalCallback?.();
    },
  };
}

function replaceGlobalProperty(key: string, value: unknown) {
  const runtime = globalThis as Record<string, unknown>;
  const previous = Object.getOwnPropertyDescriptor(runtime, key);
  Object.defineProperty(runtime, key, {
    configurable: true,
    value,
    writable: true,
  });
  return () => {
    if (previous) Object.defineProperty(runtime, key, previous);
    else delete runtime[key];
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

  it("derives ACP active dashboard rows from run summaries and ignores carrier rows", function () {
    const staleCarrier: WorkflowTaskRecord = {
      id: "acp-skill-run:acp-projection-waiting",
      runId: "stale-run",
      jobId: "stale-job",
      requestId: "acp-projection-waiting",
      workflowId: "stale-workflow",
      workflowLabel: "Stale Workflow",
      taskName: "stale carrier task",
      providerId: "acp",
      requestKind: "acp.skill.run.v1",
      backendId: "acp-backend",
      backendType: "acp",
      backendBaseUrl: "",
      state: "running",
      createdAt: "2026-06-18T01:00:00.000Z",
      updatedAt: "2026-06-18T01:00:00.000Z",
    };
    const skillRunnerRow: WorkflowTaskRecord = {
      id: "skillrunner-task",
      runId: "skillrunner-run",
      jobId: "skillrunner-job",
      requestId: "skillrunner-request",
      workflowId: "skillrunner-workflow",
      workflowLabel: "SkillRunner Workflow",
      taskName: "SkillRunner Task",
      providerId: "skillrunner",
      requestKind: "skillrunner.job.v1",
      backendId: "skillrunner-backend",
      backendType: "skillrunner",
      backendBaseUrl: "",
      state: "running",
      createdAt: "2026-06-18T01:30:00.000Z",
      updatedAt: "2026-06-18T01:30:00.000Z",
    };

    const rows = projectDashboardActiveTasks({
      activeTasks: [staleCarrier, skillRunnerRow],
      acpSkillRuns: [
        {
          requestId: "acp-projection-waiting",
          status: "waiting_user",
          backendId: "acp-backend",
          backendType: "acp",
          workflowId: "derived-workflow",
          workflowLabel: "Derived Workflow",
          taskName: "derived ACP task",
          createdAt: "2026-06-18T02:00:00.000Z",
          updatedAt: "2026-06-18T02:00:00.000Z",
        },
        {
          requestId: "acp-projection-terminal",
          status: "succeeded",
          backendId: "acp-backend",
          backendType: "acp",
          workflowId: "terminal-workflow",
          workflowLabel: "Terminal Workflow",
          taskName: "terminal ACP task",
          createdAt: "2026-06-18T03:00:00.000Z",
          updatedAt: "2026-06-18T03:00:00.000Z",
        },
      ],
    });

    assert.sameMembers(
      rows.map((row) => row.requestId),
      ["acp-projection-waiting", "skillrunner-request"],
    );
    const acpRow = rows.find(
      (row) => row.requestId === "acp-projection-waiting",
    );
    assert.equal(acpRow?.state, "waiting_user");
    assert.equal(acpRow?.workflowId, "derived-workflow");
    assert.equal(acpRow?.taskName, "derived ACP task");
    assert.notEqual(acpRow?.taskName, staleCarrier.taskName);
  });

  it("applies dashboard active scope and limit after ACP and non-ACP merge", function () {
    const firstSkillRunnerRow: WorkflowTaskRecord = {
      id: "skillrunner-task-a",
      runId: "skillrunner-run-a",
      jobId: "skillrunner-job-a",
      requestId: "skillrunner-request-a",
      workflowId: "workflow-a",
      workflowLabel: "Workflow A",
      taskName: "Task A",
      providerId: "skillrunner",
      requestKind: "skillrunner.job.v1",
      backendId: "shared-backend",
      backendType: "skillrunner",
      backendBaseUrl: "",
      state: "running",
      createdAt: "2026-06-18T01:00:00.000Z",
      updatedAt: "2026-06-18T01:00:00.000Z",
    };
    const secondSkillRunnerRow: WorkflowTaskRecord = {
      ...firstSkillRunnerRow,
      id: "skillrunner-task-b",
      runId: "skillrunner-run-b",
      jobId: "skillrunner-job-b",
      requestId: "skillrunner-request-b",
      updatedAt: "2026-06-18T03:00:00.000Z",
    };

    const rows = projectDashboardActiveTasks({
      activeTasks: [firstSkillRunnerRow, secondSkillRunnerRow],
      acpSkillRuns: [
        {
          requestId: "acp-projection-retriable",
          status: "failed_retriable",
          backendId: "shared-backend",
          backendType: "acp",
          workflowId: "acp-workflow",
          workflowLabel: "ACP Workflow",
          taskName: "ACP retriable",
          createdAt: "2026-06-18T02:00:00.000Z",
          updatedAt: "2026-06-18T02:00:00.000Z",
        },
      ],
      scope: { backendId: "shared-backend" },
      limit: 2,
    });

    assert.deepEqual(
      rows.map((row) => row.requestId),
      ["skillrunner-request-b", "acp-projection-retriable"],
    );
    assert.equal(rows[1]?.state, "running");
  });

  it("reprojects waiting and failed-retriable ACP runs without taskRuntime carrier rows", function () {
    upsertAcpSkillRun({
      requestId: "acp-reproject-waiting",
      backendId: "acp-backend",
      backendType: "acp",
      status: "waiting_user",
      workflowId: "acp-workflow",
      workflowLabel: "ACP Workflow",
      taskName: "Waiting ACP",
    });
    upsertAcpSkillRun({
      requestId: "acp-reproject-retriable",
      backendId: "acp-backend",
      backendType: "acp",
      status: "failed_retriable",
      workflowId: "acp-workflow",
      workflowLabel: "ACP Workflow",
      taskName: "Retriable ACP",
    });

    assert.deepEqual(
      listActiveWorkflowTaskSummaries({ backendId: "acp-backend" }),
      [],
    );
    const rows = projectDashboardActiveTasks({
      activeTasks: listActiveWorkflowTaskSummaries({
        backendId: "acp-backend",
      }),
      acpSkillRuns: listAcpSkillRunSummaries({
        activeOnly: true,
        backendId: "acp-backend",
      }),
      scope: { backendId: "acp-backend" },
    });

    assert.sameMembers(
      rows.map((row) => row.requestId),
      ["acp-reproject-waiting", "acp-reproject-retriable"],
    );
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
    assert.isAbove(diagnostics.fullPayloadReadCount, 0);
    assert.isAbove(diagnostics.fullPayloadQueryCount, 0);
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

    recordSkillRunnerRunFromJob(preRequestJob);
    assert.lengthOf(
      listActiveWorkflowTaskSummaries({ backendId: "skillrunner-a" }),
      1,
    );

    recordSkillRunnerRunFromJob(readyJob);
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

  it("keeps SkillRunner sequence steps distinct when they share the root run id", function () {
    const rootRunId = "skillrunner-sequence-root-300";
    const makeSequenceStepJob = (args: {
      stepId: string;
      stepIndex: number;
      requestId: string;
      updatedAt: string;
    }): JobRecord => ({
      ...makeSkillRunnerJob(300 + args.stepIndex, "skillrunner-a"),
      id: `skillrunner-sequence-parent:${args.stepId}`,
      meta: {
        ...makeSkillRunnerJob(300 + args.stepIndex, "skillrunner-a").meta,
        runId: rootRunId,
        workflowRunId: rootRunId,
        jobId: `skillrunner-sequence-parent:${args.stepId}`,
        localRunId: `${rootRunId}:skillrunner-sequence-parent:${args.stepId}`,
        requestId: args.requestId,
        sequenceStepId: args.stepId,
        sequenceStepIndex: args.stepIndex,
        sequenceJobId: "skillrunner-sequence-parent",
        skillRunnerRequestReady: true,
        skillRunnerLifecycleState: "running",
      },
      result: {
        requestId: args.requestId,
      },
      state: "running",
      updatedAt: args.updatedAt,
    });

    recordSkillRunnerRunFromJob(
      makeSequenceStepJob({
        stepId: "first-step",
        stepIndex: 0,
        requestId: "skillrunner-sequence-request-1",
        updatedAt: "2026-06-18T06:00:00.000Z",
      }),
    );
    recordSkillRunnerRunFromJob(
      makeSequenceStepJob({
        stepId: "second-step",
        stepIndex: 1,
        requestId: "skillrunner-sequence-request-2",
        updatedAt: "2026-06-18T06:00:01.000Z",
      }),
    );

    const activeRows = listActiveWorkflowTaskSummaries({
      backendId: "skillrunner-a",
    });
    assert.lengthOf(activeRows, 2);
    assert.sameMembers(
      activeRows.map((row) => row.requestId),
      ["skillrunner-sequence-request-1", "skillrunner-sequence-request-2"],
    );
    assert.sameMembers(
      activeRows.map((row) => row.sequenceStepId),
      ["first-step", "second-step"],
    );
  });

  it("projects ACP sequence active rows from concrete step runs only", function () {
    const rootRunId = "acp-sequence-root-400";
    recordWorkflowTaskUpdate({
      id: "acp-sequence-root-job",
      workflowId: "literature-workbench",
      request: { kind: "skillrunner.sequence.v1" },
      meta: {
        runId: rootRunId,
        workflowLabel: "Literature Workbench",
        taskName: "Literature Sequence Root",
        providerId: "acp",
        backendId: "acp-backend",
        backendType: "acp",
        requestKind: "skillrunner.sequence.v1",
      },
      state: "running",
      createdAt: "2026-06-18T06:10:00.000Z",
      updatedAt: "2026-06-18T06:10:00.000Z",
    });
    upsertAcpSkillRun({
      requestId: "acp-sequence-request-1",
      backendId: "acp-backend",
      backendType: "acp",
      status: "running",
      runId: rootRunId,
      jobId: "acp-sequence-root-job:first-step",
      workflowId: "literature-workbench",
      workflowLabel: "Literature Workbench",
      taskName: "Literature Workbench / first-step",
      sequenceStepId: "first-step",
      sequenceStepIndex: 0,
      sequenceFinalStepId: "second-step",
      updatedAt: "2026-06-18T06:10:01.000Z",
    });
    upsertAcpSkillRun({
      requestId: "acp-sequence-request-2",
      backendId: "acp-backend",
      backendType: "acp",
      status: "waiting_user",
      runId: rootRunId,
      jobId: "acp-sequence-root-job:second-step",
      workflowId: "literature-workbench",
      workflowLabel: "Literature Workbench",
      taskName: "Literature Workbench / second-step",
      sequenceStepId: "second-step",
      sequenceStepIndex: 1,
      sequenceFinalStepId: "second-step",
      updatedAt: "2026-06-18T06:10:02.000Z",
    });

    const activeRows = projectDashboardActiveTasks({
      activeTasks: listActiveWorkflowTaskSummaries({
        backendId: "acp-backend",
      }),
      acpSkillRuns: listAcpSkillRunSummaries({ activeOnly: true }),
    });

    assert.lengthOf(activeRows, 2);
    assert.sameMembers(
      activeRows.map((row) => row.requestId),
      ["acp-sequence-request-1", "acp-sequence-request-2"],
    );
    assert.sameMembers(
      activeRows.map((row) => row.sequenceStepId),
      ["first-step", "second-step"],
    );
    assert.isTrue(activeRows.every((row) => row.role === "sequence_step"));
    assert.isFalse(
      activeRows.some((row) => row.jobId === "acp-sequence-root-job"),
    );
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

  it("refreshes runtime logs from summary plus at most 300 visible rows", async function () {
    await clearRuntimeLogs();
    for (let index = 0; index < 350; index += 1) {
      appendRuntimeLog({
        level: "info",
        scope: "provider",
        backendId: `runtime-backend-${index % 2}`,
        workflowId: "runtime-workflow",
        stage: `runtime-log-${index}`,
        message: `runtime log ${index}`,
      });
    }
    const harness = createDashboardRuntimeHarness();
    const runtime = await mountTaskDashboardRuntime({
      root: harness.root,
      hostWindow: harness.hostWindow,
      initialTabKey: "runtime-logs",
    });
    try {
      await flushDashboardRuntime();
      const initial = harness.frameWindow.posted.at(-1) as {
        payload?: {
          runtimeLogsView?: {
            totalEntries?: number;
            logs?: unknown[];
            filterOptions?: { backends?: unknown[]; workflows?: unknown[] };
          };
        };
      };
      assert.equal(initial.payload?.runtimeLogsView?.totalEntries, 350);
      assert.lengthOf(initial.payload?.runtimeLogsView?.logs || [], 300);
      assert.lengthOf(
        initial.payload?.runtimeLogsView?.filterOptions?.backends || [],
        2,
      );

      appendRuntimeLog({
        level: "warn",
        scope: "system",
        stage: "periodic-runtime-log",
        message: "periodic runtime log",
      });
      harness.runInterval();
      await flushDashboardRuntime();
      const refreshed = harness.frameWindow.posted.at(-1) as {
        payload?: { runtimeLogsView?: { totalEntries?: number } };
      };
      assert.equal(refreshed.payload?.runtimeLogsView?.totalEntries, 351);
    } finally {
      runtime.cleanup();
      await clearRuntimeLogs();
    }
  });

  it("keeps runtime log refreshes independent from full snapshots", function () {
    const source = readFileSync(
      join(process.cwd(), "src/modules/taskManagerDialog.ts"),
      "utf8",
    );
    const runtimeLogsBranch = source.slice(
      source.indexOf('resolvedSelectedTabKey === "runtime-logs"'),
      source.indexOf(
        'resolvedSelectedTabKey === "skillrunner-connection-audit"',
      ),
    );
    assert.include(runtimeLogsBranch, "getRuntimeLogSummary");
    assert.include(runtimeLogsBranch, "limit: 300");
    assert.notInclude(runtimeLogsBranch, "snapshotRuntimeLogs");
    const skipBlock = source.slice(
      source.indexOf("const shouldSkipRefresh"),
      source.indexOf("const enqueueRefresh"),
    );
    assert.notInclude(skipBlock, 'state.selectedTabKey === "runtime-logs"');
  });

  it("publishes a visible Replay failure when the host has no AbortController", async function () {
    setDebugModeOverrideForTests(true);
    resetAcpRuntimeReplayControllerForTests();
    const restoreAbortController = replaceGlobalProperty(
      "AbortController",
      undefined,
    );
    const harness = createDashboardRuntimeHarness();
    const runtime = await mountTaskDashboardRuntime({
      root: harness.root,
      hostWindow: harness.hostWindow,
      initialTabKey: "acp-trace-replay",
    });
    try {
      await flushDashboardRuntime();
      harness.dispatchAction("acp-replay-profiler-start", {
        tracePath: "/missing/complete-trace.ndjson",
        phase: "before-governance",
        cadence: "burst",
      });
      await flushDashboardRuntime();

      const views = harness.frameWindow.posted
        .map((message) => (message as any)?.payload?.acpReplayProfilerView)
        .filter(Boolean);
      assert.include(
        views.map((entry) => entry.state),
        "running",
      );
      assert.equal(views.at(-1)?.state, "failed");
      assert.isNotEmpty(views.at(-1)?.error || "");
      assert.deepEqual(harness.alerts, []);
    } finally {
      runtime.cleanup();
      restoreAbortController();
      resetAcpRuntimeReplayControllerForTests();
      await resetTaskManagerDialogRuntimeForTests();
      setDebugModeOverrideForTests();
    }
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
    assert.equal(diagnostics.lightweightProjectionScopedQueryCount, 0);
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
    assert.isAbove(diagnostics.fullPayloadReadCount, 0);
    assert.isAbove(diagnostics.fullPayloadQueryCount, 0);
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

  it("gates ACP Skills workspace observation with the execution display mode", function () {
    const source = readFileSync(
      join(process.cwd(), "src/modules/acpSkillRunnerOrchestrator.ts"),
      "utf8",
    );
    assert.include(source, "subscribeAssistantExecutionDisplayMode");
    assert.include(source, "isAssistantSilentExecutionMode()");
    assert.include(source, "workspaceActivityPromptActive");
    assert.include(source, "stopWorkspaceActivityHeartbeat()");
    assert.include(source, "unsubscribeExecutionDisplayMode()");
    assert.isBelow(
      source.indexOf(
        "isAssistantSilentExecutionMode()",
        source.indexOf("const startWorkspaceActivityHeartbeat"),
      ),
      source.indexOf(
        "void scanWorkspaceActivity()",
        source.indexOf("const startWorkspaceActivityHeartbeat"),
      ),
    );
  });
});
