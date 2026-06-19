import { assert } from "chai";
import type { JobRecord } from "../../src/jobQueue/manager";
import {
  exportPluginStateStoreRowsForTests,
  getPluginRunStoreEntryByRequest,
  listPluginRunStoreEntries,
  resetPluginStateStoreForTests,
  upsertPluginRunStoreEntry,
} from "../../src/modules/pluginStateStore";
import {
  listAcpSkillRuns,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  listActiveWorkflowTasks,
  listWorkflowTasks,
  recordWorkflowTaskUpdate,
  resetWorkflowTasks,
} from "../../src/modules/taskRuntime";
import {
  listTaskDashboardHistory,
  recordTaskDashboardHistoryFromJob,
  resetTaskDashboardHistory,
} from "../../src/modules/taskDashboardHistory";
import {
  getSkillRunnerRunRecordByRequest,
  getSkillRunnerSequenceRootState,
  listSkillRunnerRunProjections,
  listSkillRunnerRunRecords,
  subscribeSkillRunnerRunStore,
  updateSkillRunnerRunStateByRequest,
} from "../../src/modules/skillRunnerRunStore";
import {
  initializeSequenceRunState,
  recordSequenceStepRequestCreated,
} from "../../src/modules/workflowExecution/sequenceStateStore";

describe("separated ACP and SkillRunner run stores", function () {
  beforeEach(function () {
    resetAcpSkillRunsForTests();
    resetWorkflowTasks();
    resetTaskDashboardHistory();
    resetPluginStateStoreForTests();
  });

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

    recordWorkflowTaskUpdate(job);

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
      },
      state: "running",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:01.000Z",
    };

    recordWorkflowTaskUpdate(job);
    recordTaskDashboardHistoryFromJob(job);

    let tasks = listWorkflowTasks();
    let activeTasks = listActiveWorkflowTasks();
    let projections = listSkillRunnerRunProjections();
    assert.lengthOf(tasks, 1);
    assert.lengthOf(activeTasks, 1);
    assert.lengthOf(projections, 1);
    assert.isUndefined(tasks[0].requestId);
    assert.equal(tasks[0].state, "running");
    assert.equal(tasks[0].skillRunnerLifecycleState, "request_creating");
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

    recordWorkflowTaskUpdate(createdOnlyJob);
    recordTaskDashboardHistoryFromJob(createdOnlyJob);

    tasks = listWorkflowTasks();
    activeTasks = listActiveWorkflowTasks();
    projections = listSkillRunnerRunProjections();
    assert.lengthOf(tasks, 1);
    assert.lengthOf(activeTasks, 1);
    assert.lengthOf(projections, 1);
    assert.equal(tasks[0].requestId, "sr-created-only");
    assert.equal(tasks[0].state, "running");
    assert.equal(tasks[0].skillRunnerLifecycleState, "uploading");
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

    recordWorkflowTaskUpdate(readyJob);
    recordTaskDashboardHistoryFromJob(readyJob);

    tasks = listWorkflowTasks();
    activeTasks = listActiveWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.lengthOf(activeTasks, 1);
    assert.equal(tasks[0].requestId, "sr-created-only");
    assert.equal(tasks[0].state, "running");
    assert.equal(tasks[0].skillRunnerLifecycleState, "request_ready");
    assert.isTrue(tasks[0].backendInteractive);
    assert.lengthOf(listSkillRunnerRunRecords(), 1);
    assert.lengthOf(listSkillRunnerRunProjections(), 1);
    assert.equal(listSkillRunnerRunRecords()[0].runKey, localRunKey);
    assert.equal(listTaskDashboardHistory()[0]?.requestId, "sr-created-only");

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

    recordWorkflowTaskUpdate(job);
    assert.equal(changeCount, 1);

    unsubscribe();
    recordWorkflowTaskUpdate({
      ...job,
      updatedAt: "2026-06-18T00:00:02.000Z",
    });
    assert.equal(changeCount, 1);
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
    recordWorkflowTaskUpdate(job);

    const updated = updateSkillRunnerRunStateByRequest({
      backendId: "skillrunner-local",
      requestId: "sr-req-stable-snapshot",
      state: "running",
      updatedAt: "2026-06-18T00:00:10.000Z",
      eventType: "backend.snapshot",
    });

    assert.equal(updated?.updatedAt, "2026-06-18T00:00:01.000Z");
    assert.equal(updated?.taskProjection.updatedAt, "2026-06-18T00:00:01.000Z");
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

    const root = listSkillRunnerRunRecords().find(
      (entry) => entry.runKey === "sequence:sequence-root-no-request-index",
    );
    assert.equal(root?.role, "sequence_root");
    assert.equal(root?.requestId, "");
    assert.isUndefined(root?.taskProjection.requestId);
    assert.isOk(getSkillRunnerSequenceRootState("sequence-root-no-request-index"));
    assert.isNull(
      getPluginRunStoreEntryByRequest({
        kind: "skillrunner",
        backendId: "skillrunner-local",
        requestId: "sr-sequence-root-step-request",
      }),
    );
  });

  it("rejects duplicate projectable SkillRunner runs for the same backend request", function () {
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
    recordWorkflowTaskUpdate(base);
    recordWorkflowTaskUpdate({
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
    assert.equal(runs[0].runKey, "local:workflow-run-duplicate:job-1:bundle_one");
    assert.equal(
      getSkillRunnerRunRecordByRequest({
        backendId: "skillrunner-local",
        requestId: "sr-duplicate-projectable",
      })?.runKey,
      "local:workflow-run-duplicate:job-1:bundle_one",
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
