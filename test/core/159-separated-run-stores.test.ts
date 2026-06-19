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
  listSkillRunnerRunProjections,
  listSkillRunnerRunRecords,
  updateSkillRunnerRunStateByRequest,
} from "../../src/modules/skillRunnerRunStore";

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

  it("does not project SkillRunner jobs before request-ready", function () {
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

    assert.deepEqual(listWorkflowTasks(), []);
    assert.deepEqual(listTaskDashboardHistory(), []);
    assert.deepEqual(listSkillRunnerRunRecords(), []);
    assert.deepEqual(listSkillRunnerRunProjections(), []);

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

    assert.deepEqual(listWorkflowTasks(), []);
    assert.deepEqual(listTaskDashboardHistory(), []);
    assert.deepEqual(listSkillRunnerRunRecords(), []);
    assert.deepEqual(listSkillRunnerRunProjections(), []);

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

    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].requestId, "sr-created-only");
    assert.lengthOf(listSkillRunnerRunRecords(), 1);
    assert.lengthOf(listSkillRunnerRunProjections(), 1);
    assert.equal(listTaskDashboardHistory()[0]?.requestId, "sr-created-only");
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
