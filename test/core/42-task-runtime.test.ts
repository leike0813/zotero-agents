import { assert } from "chai";
import type { JobRecord, JobState } from "../../src/jobQueue/manager";
import {
  clearFinishedWorkflowTasks,
  listActiveWorkflowTasks,
  listWorkflowTasks,
  recordWorkflowTaskUpdate,
  reconcileWorkflowTaskProjectionsOnStartup,
  resetWorkflowTasks,
} from "../../src/modules/taskRuntime";
import {
  attachSkillRunnerRequestId,
  createSkillRunnerRun,
} from "../../src/modules/skillRunnerRunStore";

function makeJob(args: {
  id: string;
  state: JobState;
  createdAt: string;
  updatedAt: string;
  runId?: string;
  workflowLabel?: string;
  taskName?: string;
  inputUnitIdentity?: string;
  inputUnitLabel?: string;
  providerId?: string;
  backendId?: string;
  backendType?: string;
  backendBaseUrl?: string;
  engine?: string;
  requestId?: string;
  targetParentID?: number;
  error?: string;
}) {
  const job: JobRecord = {
    id: args.id,
    workflowId: "literature-analysis",
    request: {},
    meta: {
      runId: args.runId || "run-1",
      workflowLabel: args.workflowLabel || "Literature Digest",
      taskName: args.taskName || "paper.md",
      inputUnitIdentity: args.inputUnitIdentity || "",
      inputUnitLabel: args.inputUnitLabel || "",
      providerId: args.providerId ?? "generic-http",
      backendId: args.backendId ?? "generic-http-local",
      backendType: args.backendType ?? "generic-http",
      backendBaseUrl: args.backendBaseUrl ?? "http://127.0.0.1:8030",
      engine: args.engine ?? "",
      targetParentID: args.targetParentID,
    },
    state: args.state,
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
  };
  if (args.requestId) {
    job.result = {
      requestId: args.requestId,
    };
  }
  if (args.error) {
    job.error = args.error;
  }
  return job;
}

describe("task runtime", function () {
  beforeEach(function () {
    resetWorkflowTasks();
  });

  afterEach(function () {
    resetWorkflowTasks();
  });

  it("updates task state using runId + jobId as stable key", function () {
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-1",
        state: "queued",
        createdAt: "2026-02-10T01:00:00.000Z",
        updatedAt: "2026-02-10T01:00:00.000Z",
        runId: "run-a",
        taskName: "attachment-a.md",
      }),
    );
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-1",
        state: "running",
        createdAt: "2026-02-10T01:00:00.000Z",
        updatedAt: "2026-02-10T01:00:01.000Z",
        runId: "run-a",
        taskName: "attachment-a.md",
      }),
    );
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-1",
        state: "succeeded",
        createdAt: "2026-02-10T01:00:00.000Z",
        updatedAt: "2026-02-10T01:00:02.000Z",
        runId: "run-a",
        taskName: "attachment-a.md",
      }),
    );

    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].id, "run-a:job-1");
    assert.equal(tasks[0].taskName, "attachment-a.md");
    assert.equal(tasks[0].workflowLabel, "Literature Digest");
    assert.equal(tasks[0].state, "succeeded");
    assert.equal(tasks[0].providerId, "generic-http");
    assert.equal(tasks[0].backendId, "generic-http-local");
    assert.equal(tasks[0].backendType, "generic-http");
  });

  it("clears finished tasks and keeps active tasks", function () {
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-1",
        state: "running",
        createdAt: "2026-02-10T01:00:00.000Z",
        updatedAt: "2026-02-10T01:00:01.000Z",
        runId: "run-a",
        taskName: "running.md",
      }),
    );
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-2",
        state: "failed",
        createdAt: "2026-02-10T01:00:00.000Z",
        updatedAt: "2026-02-10T01:00:02.000Z",
        runId: "run-a",
        taskName: "failed.md",
        error: "failed",
      }),
    );
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-3",
        state: "succeeded",
        createdAt: "2026-02-10T01:00:00.000Z",
        updatedAt: "2026-02-10T01:00:03.000Z",
        runId: "run-a",
        taskName: "succeeded.md",
      }),
    );

    clearFinishedWorkflowTasks();
    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].id, "run-a:job-1");
    assert.equal(tasks[0].state, "running");
  });

  it("lists active tasks with input identity metadata", function () {
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-1",
        state: "queued",
        createdAt: "2026-02-10T01:00:00.000Z",
        updatedAt: "2026-02-10T01:00:00.000Z",
        runId: "run-a",
        taskName: "paper-a.pdf",
        inputUnitIdentity: "attachment-key:ABC123",
        inputUnitLabel: "paper-a.pdf",
      }),
    );
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-2",
        state: "running",
        createdAt: "2026-02-10T01:01:00.000Z",
        updatedAt: "2026-02-10T01:01:01.000Z",
        runId: "run-a",
        taskName: "paper-b.pdf",
        inputUnitIdentity: "attachment-key:DEF456",
        inputUnitLabel: "paper-b.pdf",
      }),
    );
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-3",
        state: "succeeded",
        createdAt: "2026-02-10T01:02:00.000Z",
        updatedAt: "2026-02-10T01:02:02.000Z",
        runId: "run-a",
        taskName: "paper-c.pdf",
        inputUnitIdentity: "attachment-key:GHI789",
      }),
    );
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-4",
        state: "waiting_user",
        createdAt: "2026-02-10T01:03:00.000Z",
        updatedAt: "2026-02-10T01:03:01.000Z",
        runId: "run-a",
        taskName: "paper-d.pdf",
        inputUnitIdentity: "attachment-key:JKL000",
        inputUnitLabel: "paper-d.pdf",
      }),
    );

    const active = listActiveWorkflowTasks();
    assert.lengthOf(active, 3);
    assert.sameMembers(
      active.map((entry) => entry.inputUnitIdentity),
      [
        "attachment-key:ABC123",
        "attachment-key:DEF456",
        "attachment-key:JKL000",
      ],
    );
    assert.sameMembers(
      active.map((entry) => entry.inputUnitLabel),
      ["paper-a.pdf", "paper-b.pdf", "paper-d.pdf"],
    );
  });

  it("captures provider requestId from job execution result", function () {
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-1",
        state: "succeeded",
        createdAt: "2026-02-10T01:00:00.000Z",
        updatedAt: "2026-02-10T01:00:02.000Z",
        runId: "run-a",
        taskName: "attachment-a.md",
        requestId: "request-123",
      }),
    );

    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].requestId, "request-123");
  });

  it("captures engine metadata from job meta", function () {
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-1",
        state: "running",
        createdAt: "2026-02-10T01:00:00.000Z",
        updatedAt: "2026-02-10T01:00:01.000Z",
        runId: "run-a",
        taskName: "attachment-a.md",
        engine: "codex",
      }),
    );
    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].engine, "codex");
  });

  it("captures targetParentID metadata from job meta", function () {
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-1",
        state: "running",
        createdAt: "2026-02-10T01:00:00.000Z",
        updatedAt: "2026-02-10T01:00:01.000Z",
        runId: "run-a",
        taskName: "attachment-a.md",
        targetParentID: 321,
      }),
    );
    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].targetParentID, 321);
  });

  it("prefers requestId from job meta during running phase", function () {
    const runningJob = makeJob({
      id: "job-1",
      state: "running",
      createdAt: "2026-02-10T01:00:00.000Z",
      updatedAt: "2026-02-10T01:00:01.000Z",
      runId: "run-a",
      taskName: "attachment-a.md",
    });
    runningJob.meta.requestId = "request-running-1";
    recordWorkflowTaskUpdate(runningJob);

    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].requestId, "request-running-1");
    assert.equal(tasks[0].state, "running");
  });

  it("fails orphan active projections restored on startup", function () {
    recordWorkflowTaskUpdate(
      makeJob({
        id: "job-orphan",
        state: "running",
        createdAt: "2026-02-10T01:00:00.000Z",
        updatedAt: "2026-02-10T01:00:01.000Z",
        runId: "run-orphan",
        taskName: "orphan.md",
        backendId: "",
        backendType: "",
      }),
    );

    const result = reconcileWorkflowTaskProjectionsOnStartup();

    assert.equal(result.failedCount, 1);
    assert.deepEqual(listActiveWorkflowTasks(), []);
    const task = listWorkflowTasks()[0];
    assert.equal(task.state, "failed");
    assert.include(task.error || "", "previous Zotero plugin session");
  });

  it("reads SkillRunner request projections from the run store", function () {
    const run = createSkillRunnerRun({
      backendId: "skillrunner-backend",
      workflowId: "literature-analysis",
      workflowRunId: "run-skillrunner",
      jobId: "job-skillrunner",
      taskName: "backend.md",
      skillId: "literature-analysis",
      createdAt: "2026-02-10T01:00:00.000Z",
      updatedAt: "2026-02-10T01:00:00.000Z",
    });
    assert.isOk(run);
    attachSkillRunnerRequestId({
      runKey: run!.runKey,
      requestId: "request-skillrunner",
      updatedAt: "2026-02-10T01:00:01.000Z",
    });

    const result = reconcileWorkflowTaskProjectionsOnStartup();

    assert.equal(result.failedCount, 0);
    assert.equal(result.preservedCount, 1);
    assert.equal(
      listActiveWorkflowTasks()[0]?.requestId,
      "request-skillrunner",
    );
  });
});
