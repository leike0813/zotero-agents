import { assert } from "chai";
import type { JobRecord } from "../../src/jobQueue/manager";
import {
  clearPluginTaskRowEntries,
  exportPluginStateStoreRowsForTests,
  getPluginRunStoreEntryByRequest,
  listPluginRunStoreEntries,
  PLUGIN_TASK_DOMAIN_SKILLRUNNER,
  resetPluginStateStoreForTests,
  upsertPluginRunStoreEntry,
} from "../../src/modules/pluginStateStore";
import {
  appendAcpSkillRunUserReply,
  listAcpSkillRuns,
  listAcpSkillRunSummaries,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  listActiveWorkflowTaskSummaries,
  listActiveWorkflowTasks,
  listWorkflowTasks,
  recordWorkflowTaskUpdate,
  resetWorkflowTasks,
  subscribeWorkflowTaskChanges,
  syncWorkflowTaskFromSkillRunnerProjection,
} from "../../src/modules/taskRuntime";
import {
  listTaskDashboardHistory,
  resetTaskDashboardHistory,
} from "../../src/modules/taskDashboardHistory";
import {
  attachSkillRunnerRequestId,
  createSkillRunnerRun,
  getSkillRunnerRunStoreReadDiagnosticsForTests,
  getSkillRunnerRunRecordByRequest,
  listSkillRunnerRunProjectionSummaries,
  listSkillRunnerRunProjections,
  listSkillRunnerRunRecords,
  projectSkillRunnerRun,
  recordSkillRunnerObserverFailure,
  recordSkillRunnerProgress,
  registerSkillRunnerSkillDisplaySnapshot,
  resetSkillRunnerRunStoreReadDiagnosticsForTests,
  subscribeSkillRunnerRunStore,
  updateSkillRunnerRunResult,
  updateSkillRunnerRunStateByRequest,
  updateSkillRunnerRunStateByRunKey,
} from "../../src/modules/skillRunnerRunStore";
import { resetBackendsRegistryReadDiagnosticsForTests } from "../../src/backends/registry";
import { clearSkillRunnerSkillDisplayRegistryMemoryForTests } from "../../src/modules/skillRunnerSkillDisplayRegistry";
import {
  getSequenceRunState,
  initializeSequenceRunState,
  recordSequenceStepRequestCreated,
} from "../../src/modules/workflowExecution/sequenceStateStore";
import { setPref } from "../../src/utils/prefs";

describe("separated ACP and SkillRunner run stores", function () {
  beforeEach(function () {
    resetAcpSkillRunsForTests();
    resetWorkflowTasks();
    resetTaskDashboardHistory();
    resetPluginStateStoreForTests();
  });

  function recordSkillRunnerRunFromJob(job: JobRecord) {
    const run = createSkillRunnerRun({
      backendId: String(job.meta.backendId || ""),
      workflowId: job.workflowId,
      workflowRunId: String(job.meta.workflowRunId || job.meta.runId || ""),
      jobId: job.id,
      taskName: String(job.meta.taskName || job.id),
      skillId: String(job.meta.skillId || "") || undefined,
      sequenceRunId: String(job.meta.sequenceRunId || "") || undefined,
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
    const result = job.result as
      | { backendStatus?: unknown; fetchType?: unknown }
      | undefined;
    let current = attached;
    if (!requestId && job.state === "running") {
      current =
        recordSkillRunnerProgress({
          runKey: current.runKey,
          event: {
            type: "request-creating",
          } as any,
          updatedAt: job.updatedAt,
        }) || current;
      return current;
    }
    if (requestId && job.meta.skillRunnerRequestReady) {
      current =
        updateSkillRunnerRunStateByRunKey({
          runKey: current.runKey,
          state: "request_ready",
          backendStatus: String(result?.backendStatus || job.state) as any,
          updatedAt: job.updatedAt,
        }) || current;
    }
    return (
      updateSkillRunnerRunStateByRunKey({
        runKey: current.runKey,
        state: job.state,
        backendStatus: String(result?.backendStatus || job.state) as any,
        updatedAt: job.updatedAt,
      }) || current
    );
  }

  afterEach(function () {
    resetAcpSkillRunsForTests();
    resetWorkflowTasks();
    resetTaskDashboardHistory();
    resetPluginStateStoreForTests();
  });

  it("keeps ACP and SkillRunner physical run stores independent", function () {
    upsertPluginRunStoreEntry("acp", {
      runKey: "acp-run-1",
      requestId: "acp-run-1",
      backendId: "opencode",
      state: "running",
      updatedAt: "2026-06-18T00:00:00.000Z",
      payload: JSON.stringify({ runKey: "acp-run-1" }),
    });
    upsertPluginRunStoreEntry("skillrunner", {
      runKey: "skillrunner-local:sr-req-1",
      requestId: "sr-req-1",
      backendId: "skillrunner-local",
      state: "running",
      updatedAt: "2026-06-18T00:00:01.000Z",
      payload: JSON.stringify({ runKey: "skillrunner-local:sr-req-1" }),
    });

    assert.deepEqual(
      listPluginRunStoreEntries("acp").map((entry) => entry.runKey),
      ["acp-run-1"],
    );
    assert.deepEqual(
      listPluginRunStoreEntries("skillrunner").map((entry) => entry.runKey),
      ["skillrunner-local:sr-req-1"],
    );
  });

  it("rejects non-ACP backend types at the ACP run-store facade", function () {
    assert.throws(() =>
      upsertAcpSkillRun({
        requestId: "sr-req-should-not-enter-acp",
        backendType: "skillrunner",
      }),
    );

    assert.lengthOf(listAcpSkillRuns(), 0);
  });

  it("preserves ACP sequence step index in run summaries", function () {
    upsertAcpSkillRun({
      requestId: "acp-sequence-step-2",
      backendId: "acp-backend",
      backendType: "acp",
      status: "running",
      workflowId: "literature-workbench",
      workflowLabel: "Literature Workbench",
      sequenceStepId: "step-2",
      sequenceStepIndex: 1,
      skillName: "Literature Analysis",
      skillId: "literature-analysis",
    });

    const [run] = listAcpSkillRuns();
    assert.equal(run.sequenceStepId, "step-2");
    assert.equal(run.sequenceStepIndex, 1);
  });

  it("projects SkillRunner tasks from the SkillRunner run store", function () {
    const job: JobRecord = {
      id: "job-1",
      workflowId: "workflow-debug-probe",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "debug-host-bridge-connectivity-probe",
      },
      meta: {
        runId: "workflow-run-1",
        workflowLabel: "Debug Probe",
        taskName: "debug-host-bridge-connectivity-probe",
        providerId: "skillrunner",
        backendId: "skillrunner-local",
        backendType: "skillrunner",
        backendBaseUrl: "http://127.0.0.1:8030",
        requestId: "sr-req-1",
        skillId: "debug-host-bridge-connectivity-probe",
      },
      state: "running",
      result: {
        requestId: "sr-req-1",
      },
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:01.000Z",
    };

    recordSkillRunnerRunFromJob(job);

    const runs = listSkillRunnerRunRecords();
    assert.lengthOf(runs, 1);
    assert.equal(runs[0].requestId, "sr-req-1");
    assert.equal(runs[0].skillId, "debug-host-bridge-connectivity-probe");

    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].requestId, "sr-req-1");
    assert.equal(tasks[0].skillId, "debug-host-bridge-connectivity-probe");

    const raw = exportPluginStateStoreRowsForTests();
    assert.lengthOf(raw.skillRunnerRuns, 1);
    assert.lengthOf(
      raw.rows.filter(
        (row: any) => row.domain === "skillrunner" && row.scope === "active",
      ),
      0,
    );
    assert.lengthOf(
      raw.rows.filter(
        (row: any) => row.domain === "skillrunner" && row.scope === "history",
      ),
      0,
    );
  });

  it("reads scoped SkillRunner projections from run records", function () {
    for (let index = 0; index < 6; index += 1) {
      const backendId = index % 2 === 0 ? "skillrunner-a" : "skillrunner-b";
      recordSkillRunnerRunFromJob({
        id: `job-${index}`,
        workflowId: "workflow-debug-probe",
        request: {
          kind: "skillrunner.job.v1",
          skill_id: "debug-host-bridge-connectivity-probe",
        },
        meta: {
          runId: `workflow-run-${index}`,
          workflowLabel: "Debug Probe",
          taskName: "debug-host-bridge-connectivity-probe",
          providerId: "skillrunner",
          backendId,
          backendType: "skillrunner",
          backendBaseUrl: "http://127.0.0.1:8030",
          requestId: `sr-projection-${index}`,
          skillId: "debug-host-bridge-connectivity-probe",
        },
        state: "running",
        result: {
          requestId: `sr-projection-${index}`,
        },
        createdAt: `2026-06-18T00:00:0${index}.000Z`,
        updatedAt: `2026-06-18T00:00:1${index}.000Z`,
      });
      if (index % 2 === 1) {
        updateSkillRunnerRunStateByRequest({
          backendId,
          requestId: `sr-projection-${index}`,
          state: "succeeded",
          updatedAt: `2026-06-18T00:01:1${index}.000Z`,
        });
      }
    }

    resetSkillRunnerRunStoreReadDiagnosticsForTests();

    const activeForA = listSkillRunnerRunProjectionSummaries({
      activeOnly: true,
      backendId: "skillrunner-a",
      limit: 2,
    });
    assert.lengthOf(activeForA, 2);
    assert.isTrue(
      activeForA.every((entry) => entry.backendId === "skillrunner-a"),
    );
    assert.isTrue(activeForA.every((entry) => entry.state === "running"));

    const selectedHistory = listSkillRunnerRunProjectionSummaries({
      backendId: "skillrunner-b",
      requestId: "sr-projection-3",
    });
    assert.lengthOf(selectedHistory, 1);
    assert.equal(selectedHistory[0].state, "succeeded");

    const activeTasks = listActiveWorkflowTaskSummaries({
      backendId: "skillrunner-a",
    });
    assert.isAtLeast(activeTasks.length, 2);
    assert.isTrue(
      activeTasks.every((entry) => entry.backendId === "skillrunner-a"),
    );

    const diagnostics = getSkillRunnerRunStoreReadDiagnosticsForTests();
    assert.isAtLeast(diagnostics.fullPayloadReadCount, 3);
    assert.isAtLeast(diagnostics.fullPayloadQueryCount, 3);
    assert.isAtLeast(diagnostics.lightweightProjectionReadCount, 3);
  });

  it("reads SkillRunner projections from run records for explicit scoped reads", function () {
    recordSkillRunnerRunFromJob({
      id: "job-legacy-projection",
      workflowId: "workflow-debug-probe",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "debug-host-bridge-connectivity-probe",
      },
      meta: {
        runId: "workflow-run-legacy-projection",
        workflowLabel: "Debug Probe",
        taskName: "debug-host-bridge-connectivity-probe",
        providerId: "skillrunner",
        backendId: "skillrunner-legacy",
        backendType: "skillrunner",
        backendBaseUrl: "http://127.0.0.1:8030",
        requestId: "sr-legacy-projection",
        skillId: "debug-host-bridge-connectivity-probe",
      },
      state: "running",
      result: {
        requestId: "sr-legacy-projection",
      },
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:01.000Z",
    });
    clearPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER, "active");
    clearPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER, "history");
    resetSkillRunnerRunStoreReadDiagnosticsForTests();

    assert.lengthOf(listSkillRunnerRunProjectionSummaries(), 1);
    assert.isAtLeast(
      getSkillRunnerRunStoreReadDiagnosticsForTests().fullPayloadReadCount,
      1,
    );

    const scoped = listSkillRunnerRunProjectionSummaries({
      backendId: "skillrunner-legacy",
    });
    assert.lengthOf(scoped, 1);
    assert.equal(scoped[0].requestId, "sr-legacy-projection");
    assert.isAtLeast(
      getSkillRunnerRunStoreReadDiagnosticsForTests().fullPayloadReadCount,
      2,
    );
  });

  it("returns ACP skill-run summaries without transcript or events", function () {
    upsertAcpSkillRun({
      requestId: "acp-summary-1",
      backendId: "acp-backend",
      backendType: "acp",
      status: "waiting_user",
      workflowId: "literature-workbench",
      workflowLabel: "Literature Workbench",
      taskName: "Review paper",
      skillId: "literature-analysis",
      event: {
        stage: "prompt",
        level: "info",
        message: "Waiting for user input",
      },
    });
    appendAcpSkillRunUserReply({
      requestId: "acp-summary-1",
      message: "Approved",
    });

    const [fullRun] = listAcpSkillRuns();
    assert.isAbove(fullRun.transcriptItems.length, 0);
    assert.isAbove(fullRun.events.length, 0);

    const [summary] = listAcpSkillRunSummaries({ activeOnly: true });
    assert.equal(summary.requestId, "acp-summary-1");
    assert.equal(summary.pendingPermission || null, null);
    assert.notProperty(summary as any, "transcriptItems");
    assert.notProperty(summary as any, "events");
    assert.notProperty(summary as any, "outputRevisions");
  });

  it("does not persist transient SkillRunner bundle locations in run results", function () {
    const job: JobRecord = {
      id: "job-bundle-result",
      workflowId: "debug-apply-single-bundle",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "debug-apply-bundle-probe",
      },
      meta: {
        runId: "workflow-run-bundle-result",
        workflowLabel: "Debug Bundle",
        taskName: "debug-apply-bundle-probe",
        providerId: "skillrunner",
        backendId: "skillrunner-local",
        backendType: "skillrunner",
        backendBaseUrl: "http://127.0.0.1:8030",
        requestId: "sr-bundle-result",
        skillId: "debug-apply-bundle-probe",
      },
      state: "running",
      result: {
        requestId: "sr-bundle-result",
      },
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:01.000Z",
    };

    recordSkillRunnerRunFromJob(job);
    updateSkillRunnerRunResult({
      backendId: "skillrunner-local",
      requestId: "sr-bundle-result",
      resultJson: { ok: true },
      resultJsonPath: "result/debug-apply-bundle-probe.1/result.json",
      workspaceDir: "/remote/workspace",
      bundleDir: "C:/tmp/extracted-bundle",
      updatedAt: "2026-06-18T00:00:02.000Z",
    } as Parameters<typeof updateSkillRunnerRunResult>[0] & {
      bundleDir: string;
    });

    const entry = getPluginRunStoreEntryByRequest({
      kind: "skillrunner",
      backendId: "skillrunner-local",
      requestId: "sr-bundle-result",
    });
    assert.isOk(entry);
    assert.notInclude(entry!.payload, "bundleDir");
    assert.notInclude(entry!.payload, "bundleBytes");
    assert.deepEqual(
      getSkillRunnerRunRecordByRequest({
        backendId: "skillrunner-local",
        requestId: "sr-bundle-result",
      })?.result,
      {
        resultJson: { ok: true },
        resultJsonPath: "result/debug-apply-bundle-probe.1/result.json",
        workspaceDir: "/remote/workspace",
      },
    );
  });

  it("projects SkillRunner pre-ready jobs without backend interaction", function () {
    const job: JobRecord = {
      id: "job-1",
      workflowId: "workflow-debug-probe",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "debug-host-bridge-connectivity-probe",
      },
      meta: {
        runId: "workflow-run-pre-ready",
        workflowLabel: "Debug Probe",
        taskName: "debug-host-bridge-connectivity-probe",
        providerId: "skillrunner",
        backendId: "skillrunner-local",
        backendType: "skillrunner",
        backendBaseUrl: "http://127.0.0.1:8030",
        skillId: "debug-host-bridge-connectivity-probe",
        executionMode: "interactive",
      },
      state: "running",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:01.000Z",
    };

    recordSkillRunnerRunFromJob(job);
    let tasks = listWorkflowTasks();
    let activeTasks = listActiveWorkflowTasks();
    let projections = listSkillRunnerRunProjections();
    assert.lengthOf(tasks, 1);
    assert.lengthOf(activeTasks, 1);
    assert.lengthOf(projections, 1);
    assert.isUndefined(tasks[0].requestId);
    assert.equal(tasks[0].state, "queued");
    assert.equal(tasks[0].skillRunnerLifecycleState, "queued");
    assert.equal(tasks[0].submitPhase, "creating");
    assert.isFalse(tasks[0].requestAssigned);
    assert.isFalse(tasks[0].backendInteractive);
    assert.isFalse(tasks[0].canOpenStream);
    assert.isFalse(tasks[0].canCancelBackendRun);
    assert.isFalse(tasks[0].canReply);
    assert.lengthOf(listTaskDashboardHistory(), 1);
    assert.lengthOf(listSkillRunnerRunRecords(), 1);
    const localRunKey = listSkillRunnerRunRecords()[0].runKey;

    const createdOnlyJob: JobRecord = {
      ...job,
      meta: {
        ...job.meta,
        requestId: "sr-created-only",
      },
      updatedAt: "2026-06-18T00:00:02.000Z",
    };

    recordSkillRunnerRunFromJob(createdOnlyJob);
    tasks = listWorkflowTasks();
    activeTasks = listActiveWorkflowTasks();
    projections = listSkillRunnerRunProjections();
    assert.lengthOf(tasks, 1);
    assert.lengthOf(activeTasks, 1);
    assert.lengthOf(projections, 1);
    assert.equal(tasks[0].requestId, "sr-created-only");
    assert.equal(tasks[0].state, "running");
    assert.equal(tasks[0].skillRunnerLifecycleState, "running");
    assert.equal(tasks[0].submitPhase, "created");
    assert.isTrue(tasks[0].requestAssigned);
    assert.isFalse(tasks[0].backendInteractive);
    assert.equal(listSkillRunnerRunRecords()[0].runKey, localRunKey);

    const readyJob: JobRecord = {
      ...createdOnlyJob,
      meta: {
        ...createdOnlyJob.meta,
        skillRunnerRequestReady: true,
      },
      updatedAt: "2026-06-18T00:00:03.000Z",
    };

    recordSkillRunnerRunFromJob(readyJob);
    tasks = listWorkflowTasks();
    activeTasks = listActiveWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.lengthOf(activeTasks, 1);
    assert.equal(tasks[0].requestId, "sr-created-only");
    assert.equal(tasks[0].state, "running");
    assert.equal(tasks[0].skillRunnerLifecycleState, "running");
    assert.equal(tasks[0].submitPhase, "request_ready");
    assert.isFalse(tasks[0].backendInteractive);
    assert.lengthOf(listSkillRunnerRunRecords(), 1);
    assert.lengthOf(listSkillRunnerRunProjections(), 1);
    assert.equal(listSkillRunnerRunRecords()[0].runKey, localRunKey);
    assert.equal(listTaskDashboardHistory()[0]?.requestId, "sr-created-only");

    const defensiveRequestReady = updateSkillRunnerRunStateByRequest({
      backendId: "skillrunner-local",
      requestId: "sr-created-only",
      state: "request_ready" as any,
      updatedAt: "2026-06-18T00:00:03.500Z",
      eventType: "backend.snapshot",
    });
    assert.equal(defensiveRequestReady?.runKey, localRunKey);
    assert.equal(defensiveRequestReady?.status, "running");
    assert.equal(defensiveRequestReady?.submitPhase, "request_ready");

    const waitingJob: JobRecord = {
      ...readyJob,
      state: "waiting_user",
      result: {
        status: "deferred",
        requestId: "sr-created-only",
        fetchType: "result",
        backendStatus: "waiting_user",
      },
      updatedAt: "2026-06-18T00:00:04.000Z",
    };

    recordSkillRunnerRunFromJob(waitingJob);

    tasks = listWorkflowTasks();
    assert.equal(tasks[0].state, "waiting_user");
    assert.equal(tasks[0].skillRunnerLifecycleState, "waiting_user");
    assert.isFalse(tasks[0].canReply);
    assert.equal(listSkillRunnerRunRecords()[0].status, "waiting_user");
    assert.equal(
      listSkillRunnerRunProjections()[0]?.submitPhase,
      "request_ready",
    );

    const terminal = updateSkillRunnerRunStateByRequest({
      backendId: "skillrunner-local",
      requestId: "sr-created-only",
      state: "succeeded",
      updatedAt: "2026-06-18T00:00:04.000Z",
      eventType: "backend.terminal",
    });
    assert.equal(terminal?.runKey, localRunKey);
    assert.equal(terminal?.status, "succeeded");
    assert.equal(listSkillRunnerRunProjections()[0]?.state, "succeeded");
  });

  it("notifies SkillRunner run-store listeners when projectable runs change", function () {
    let changeCount = 0;
    const unsubscribe = subscribeSkillRunnerRunStore(() => {
      changeCount += 1;
    });
    const job: JobRecord = {
      id: "job-1",
      workflowId: "workflow-debug-probe",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "debug-host-bridge-connectivity-probe",
      },
      meta: {
        runId: "workflow-run-pre-ready",
        workflowLabel: "Debug Probe",
        taskName: "debug-host-bridge-connectivity-probe",
        providerId: "skillrunner",
        backendId: "skillrunner-local",
        backendType: "skillrunner",
        backendBaseUrl: "http://127.0.0.1:8030",
        skillId: "debug-host-bridge-connectivity-probe",
      },
      state: "running",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:01.000Z",
    };

    recordSkillRunnerRunFromJob(job);
    assert.isAtLeast(changeCount, 1);
    const changeCountBeforeUnsubscribe = changeCount;

    unsubscribe();
    recordSkillRunnerRunFromJob({
      ...job,
      updatedAt: "2026-06-18T00:00:02.000Z",
    });
    assert.equal(changeCount, changeCountBeforeUnsubscribe);
  });

  it("bridges SkillRunner run-store updates to workflow task change subscribers", function () {
    const events: string[] = [];
    const unsubscribe = subscribeWorkflowTaskChanges((event) => {
      events.push(event.reason);
    });

    createSkillRunnerRun({
      backendId: "skillrunner-local",
      workflowId: "workflow-debug-probe",
      workflowRunId: "workflow-run-task-change-bridge",
      jobId: "job-1",
      taskName: "debug-host-bridge-connectivity-probe",
      skillId: "debug-host-bridge-connectivity-probe",
      fetchType: "result",
      executionMode: "auto",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    });

    unsubscribe();
    assert.include(events, "record-updated");
  });

  it("keeps detached active SkillRunner runs manually resumable when backend config exists", function () {
    setPref(
      "backendsConfigJson",
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "remote-skillrunner",
            type: "skillrunner",
            displayName: "Remote SkillRunner",
            baseUrl: "http://127.0.0.1:8030",
            auth: { kind: "none" },
          },
        ],
      }),
    );
    resetBackendsRegistryReadDiagnosticsForTests();
    const run = createSkillRunnerRun({
      backendId: "remote-skillrunner",
      workflowId: "workflow-debug-probe",
      workflowRunId: "workflow-run-detached-projection",
      jobId: "job-1",
      taskName: "debug-host-bridge-connectivity-probe",
      skillId: "debug-host-bridge-connectivity-probe",
      fetchType: "result",
      executionMode: "interactive",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    });
    assert.isOk(run);
    attachSkillRunnerRequestId({
      runKey: run!.runKey,
      requestId: "sr-detached-projection",
      updatedAt: "2026-06-18T00:00:01.000Z",
    });
    updateSkillRunnerRunStateByRequest({
      backendId: "remote-skillrunner",
      requestId: "sr-detached-projection",
      state: "request_ready" as any,
      backendStatus: "running",
      updatedAt: "2026-06-18T00:00:02.000Z",
      eventType: "backend.snapshot",
    });
    recordSkillRunnerObserverFailure({
      runKey: run!.runKey,
      error: new Error("network detached"),
      source: "test",
      updatedAt: "2026-06-18T00:00:03.000Z",
    });

    const tasks = listWorkflowTasks();
    assert.equal(tasks[0]?.observerState, "detached");
    assert.isTrue(tasks[0]?.canOpenStream);
    assert.isTrue(tasks[0]?.canCancelBackendRun);
    assert.isFalse(tasks[0]?.canReply);
  });

  it("keeps terminal SkillRunner runs backend-readable while disabling actions", function () {
    setPref(
      "backendsConfigJson",
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "remote-skillrunner-terminal",
            type: "skillrunner",
            displayName: "Remote SkillRunner",
            baseUrl: "http://127.0.0.1:8030",
            auth: { kind: "none" },
          },
        ],
      }),
    );
    resetBackendsRegistryReadDiagnosticsForTests();
    const run = createSkillRunnerRun({
      backendId: "remote-skillrunner-terminal",
      workflowId: "workflow-debug-probe",
      workflowRunId: "workflow-run-terminal-projection",
      jobId: "job-1",
      taskName: "debug-host-bridge-connectivity-probe",
      skillId: "debug-host-bridge-connectivity-probe",
      fetchType: "result",
      executionMode: "interactive",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    });
    assert.isOk(run);
    attachSkillRunnerRequestId({
      runKey: run!.runKey,
      requestId: "sr-terminal-projection",
      updatedAt: "2026-06-18T00:00:01.000Z",
    });
    updateSkillRunnerRunStateByRequest({
      backendId: "remote-skillrunner-terminal",
      requestId: "sr-terminal-projection",
      state: "request_ready" as any,
      backendStatus: "running",
      updatedAt: "2026-06-18T00:00:02.000Z",
      eventType: "backend.snapshot",
    });
    updateSkillRunnerRunStateByRequest({
      backendId: "remote-skillrunner-terminal",
      requestId: "sr-terminal-projection",
      state: "succeeded",
      backendStatus: "succeeded",
      updatedAt: "2026-06-18T00:00:03.000Z",
      eventType: "backend.snapshot",
    });

    const task = listWorkflowTasks().find(
      (entry) => entry.runKey === run!.runKey,
    );
    assert.equal(task?.state, "succeeded");
    assert.equal(task?.backendInteractive, true);
    assert.equal(task?.canOpenStream, false);
    assert.equal(task?.canCancelBackendRun, false);
    assert.equal(task?.canReply, false);
  });

  it("clears stale active task index after a targeted SkillRunner terminal projection sync", function () {
    const run = createSkillRunnerRun({
      backendId: "remote-skillrunner-active-sync",
      workflowId: "workflow-debug-probe",
      workflowRunId: "workflow-run-active-sync",
      jobId: "job-1",
      taskName: "debug-host-bridge-connectivity-probe",
      skillId: "debug-host-bridge-connectivity-probe",
      fetchType: "result",
      executionMode: "interactive",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    });
    assert.isOk(run);

    const initialRows = listWorkflowTasks();
    assert.equal(initialRows[0]?.runKey, run!.runKey);
    assert.equal(initialRows[0]?.state, "queued");
    assert.include(
      listActiveWorkflowTaskSummaries().map((entry) => entry.runKey),
      run!.runKey,
    );

    const updated = updateSkillRunnerRunStateByRunKey({
      runKey: run!.runKey,
      state: "succeeded",
      backendStatus: "succeeded",
      updatedAt: "2026-06-18T00:00:01.000Z",
      eventType: "backend.terminal",
    });
    assert.isOk(updated);

    assert.include(
      listActiveWorkflowTaskSummaries().map((entry) => entry.runKey),
      run!.runKey,
    );

    syncWorkflowTaskFromSkillRunnerProjection(
      projectSkillRunnerRun({ run: updated! }),
    );

    assert.notInclude(
      listActiveWorkflowTaskSummaries().map((entry) => entry.runKey),
      run!.runKey,
    );
    assert.equal(
      listWorkflowTasks().find((entry) => entry.runKey === run!.runKey)?.state,
      "succeeded",
    );
  });

  it("derives SkillRunner skillName from the persisted display registry snapshot", function () {
    registerSkillRunnerSkillDisplaySnapshot({
      "debug-display-skill": {
        skillId: "debug-display-skill",
        skillName: "Debug Display Skill",
      },
    });
    clearSkillRunnerSkillDisplayRegistryMemoryForTests();

    createSkillRunnerRun({
      backendId: "skillrunner-local",
      workflowId: "workflow-debug-probe",
      workflowRunId: "workflow-run-display-registry",
      jobId: "job-1",
      taskName: "fallback task name",
      skillId: "debug-display-skill",
      fetchType: "result",
      executionMode: "auto",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    });

    const projection = listSkillRunnerRunProjections()[0];
    const runEntry = listPluginRunStoreEntries("skillrunner").find(
      (entry) => entry.runKey === "local:workflow-run-display-registry:job-1",
    );
    assert.equal(projection?.skillName, "Debug Display Skill");
    assert.notInclude(runEntry?.payload || "", "Debug Display Skill");
  });

  it("keeps SkillRunner run updatedAt stable for same-state backend snapshots", function () {
    const job: JobRecord = {
      id: "job-1",
      workflowId: "workflow-debug-probe",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "debug-host-bridge-connectivity-probe",
      },
      meta: {
        runId: "workflow-run-1",
        workflowLabel: "Debug Probe",
        taskName: "debug-host-bridge-connectivity-probe",
        providerId: "skillrunner",
        backendId: "skillrunner-local",
        backendType: "skillrunner",
        requestId: "sr-req-stable-snapshot",
      },
      state: "running",
      result: {
        requestId: "sr-req-stable-snapshot",
      },
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:01.000Z",
    };
    recordSkillRunnerRunFromJob(job);

    const updated = updateSkillRunnerRunStateByRequest({
      backendId: "skillrunner-local",
      requestId: "sr-req-stable-snapshot",
      state: "running",
      updatedAt: "2026-06-18T00:00:10.000Z",
      eventType: "backend.snapshot",
    });

    assert.equal(updated?.updatedAt, "2026-06-18T00:00:01.000Z");
  });

  it("keeps SkillRunner sequence root out of the backend request index", function () {
    initializeSequenceRunState({
      request: {
        kind: "skillrunner.sequence.v1",
        steps: [
          {
            id: "bundle_one",
            skill_id: "debug-apply-bundle-probe",
            workspace: "new",
          },
        ],
        final_step_id: "bundle_one",
      } as any,
      backend: {
        id: "skillrunner-local",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8030",
        auth: { kind: "none" },
      },
      providerOptions: {},
      workflowId: "debug-apply-sequence-bundle",
      workflowLabel: "Debug: Apply Sequence Bundle",
      workflowRunId: "sequence-root-no-request-index",
      jobId: "job-1",
    });
    recordSequenceStepRequestCreated({
      sequenceRunId: "sequence-root-no-request-index",
      stepIndex: 0,
      requestId: "sr-sequence-root-step-request",
    });

    const root = listPluginRunStoreEntries("skillrunner").find(
      (entry) => entry.runKey === "sequence:sequence-root-no-request-index",
    );
    assert.equal(root?.requestId, "");
    assert.equal(root?.state, "running_step");
    assert.isOk(getSequenceRunState("sequence-root-no-request-index"));
    assert.isNull(
      getPluginRunStoreEntryByRequest({
        kind: "skillrunner",
        backendId: "skillrunner-local",
        requestId: "sr-sequence-root-step-request",
      }),
    );
  });

  it("rejects duplicate projectable runKeys for the same backend request", function () {
    const base: JobRecord = {
      id: "job-1:bundle_one",
      workflowId: "debug-apply-sequence-bundle",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "debug-apply-bundle-probe",
      },
      meta: {
        runId: "workflow-run-duplicate",
        workflowRunId: "sequence-run-duplicate",
        localRunId: "workflow-run-duplicate:job-1:bundle_one",
        workflowLabel: "Debug: Apply Sequence Bundle",
        taskName: "debug-apply-sequence-bundle / bundle_one",
        providerId: "skillrunner",
        backendId: "skillrunner-local",
        backendType: "skillrunner",
        backendBaseUrl: "http://127.0.0.1:8030",
        requestId: "sr-duplicate-projectable",
        requestKind: "skillrunner.job.v1",
        sequenceStepId: "bundle_one",
        sequenceStepIndex: 0,
        sequenceJobId: "job-1",
      },
      state: "running",
      result: {
        status: "deferred",
        requestId: "sr-duplicate-projectable",
        fetchType: "bundle",
        backendStatus: "running",
      },
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:01.000Z",
    };
    recordSkillRunnerRunFromJob(base);
    const firstRunKey = listSkillRunnerRunRecords()[0]?.runKey;
    resetSkillRunnerRunStoreReadDiagnosticsForTests();

    const duplicate = recordSkillRunnerRunFromJob({
      ...base,
      id: "job-1",
      meta: {
        ...base.meta,
        localRunId: "workflow-run-duplicate:job-1",
        taskName: "debug-apply-sequence-bundle",
        sequenceStepId: undefined,
        sequenceStepIndex: undefined,
      },
      updatedAt: "2026-06-18T00:00:02.000Z",
    });

    const runs = listSkillRunnerRunRecords().filter(
      (entry) => entry.requestId === "sr-duplicate-projectable",
    );
    assert.lengthOf(runs, 1);
    assert.equal(runs[0].runKey, firstRunKey);
    assert.equal(duplicate?.runKey, firstRunKey);
    assert.equal(
      getSkillRunnerRunStoreReadDiagnosticsForTests()
        .requestIdentityViolationCount,
      1,
    );
    assert.lengthOf(
      listSkillRunnerRunProjections().filter(
        (entry) => entry.requestId === "sr-duplicate-projectable",
      ),
      1,
    );
    assert.lengthOf(
      listWorkflowTasks().filter(
        (entry) => entry.requestId === "sr-duplicate-projectable",
      ),
      1,
    );
    assert.equal(
      getSkillRunnerRunRecordByRequest({
        backendId: "skillrunner-local",
        requestId: "sr-duplicate-projectable",
      })?.runKey,
      firstRunKey,
    );
  });

  it("keeps SkillRunner workflow task projection rows scoped by runKey before requestId", function () {
    recordSkillRunnerRunFromJob({
      id: "job-a",
      workflowId: "workflow-debug-probe",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "debug-probe",
      },
      meta: {
        runId: "workflow-run-merge",
        localRunId: "workflow-run-merge:job-a",
        workflowLabel: "Debug Probe",
        taskName: "Debug Probe / A",
        providerId: "skillrunner",
        backendId: "skillrunner-local",
        backendType: "skillrunner",
        backendBaseUrl: "http://127.0.0.1:8030",
        requestKind: "skillrunner.job.v1",
      },
      state: "running",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:01.000Z",
    });

    recordSkillRunnerRunFromJob({
      id: "job-b",
      workflowId: "workflow-debug-probe",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "debug-probe",
      },
      meta: {
        runId: "workflow-run-merge",
        localRunId: "workflow-run-merge:job-b",
        workflowLabel: "Debug Probe",
        taskName: "Debug Probe / B",
        providerId: "skillrunner",
        backendId: "skillrunner-local",
        backendType: "skillrunner",
        backendBaseUrl: "http://127.0.0.1:8030",
        requestKind: "skillrunner.job.v1",
      },
      state: "running",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:02.000Z",
    });

    const rows = listWorkflowTasks().filter(
      (entry) => entry.workflowRunId === "workflow-run-merge",
    );
    assert.sameMembers(
      rows.map((entry) => entry.runKey || ""),
      ["local:workflow-run-merge:job-a", "local:workflow-run-merge:job-b"],
    );
  });

  it("syncs ACP terminal task state without touching SkillRunner run store", function () {
    const job: JobRecord = {
      id: "job-1",
      workflowId: "workflow-debug-probe",
      request: {
        kind: "acp.skill.run.v1",
        skill_id: "debug-host-bridge-connectivity-probe",
      },
      meta: {
        runId: "workflow-run-1",
        workflowLabel: "Debug Probe",
        taskName: "debug-host-bridge-connectivity-probe",
        providerId: "skillrunner",
        backendId: "acp-backend",
        backendType: "acp",
        backendBaseUrl: "http://127.0.0.1:8031",
        requestId: "acp-skill-compatible-request",
        requestKind: "acp.skill.run.v1",
        skillId: "debug-host-bridge-connectivity-probe",
      },
      state: "running",
      result: {
        requestId: "acp-skill-compatible-request",
      },
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:01.000Z",
    };

    recordWorkflowTaskUpdate(job);
    upsertAcpSkillRun({
      requestId: "acp-skill-compatible-request",
      backendId: "acp-backend",
      backendType: "acp",
      status: "succeeded",
      updatedAt: "2026-06-18T00:00:02.000Z",
    });

    assert.lengthOf(listSkillRunnerRunRecords(), 0);
    assert.isNull(
      getPluginRunStoreEntryByRequest({
        kind: "skillrunner",
        backendId: "acp-backend",
        requestId: "acp-skill-compatible-request",
      }),
    );
    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].backendType, "acp");
    assert.equal(tasks[0].providerId, "skillrunner");
    assert.equal(tasks[0].state, "succeeded");
  });
});
