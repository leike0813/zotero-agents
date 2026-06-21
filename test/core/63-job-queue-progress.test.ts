import { assert } from "chai";
import { JobQueueManager } from "../../src/jobQueue/manager";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";
import {
  listWorkflowTasks,
  recordWorkflowTaskUpdate,
  resetWorkflowTasks,
} from "../../src/modules/taskRuntime";

describe("job queue progress", function () {
  beforeEach(function () {
    clearRuntimeLogs();
    resetWorkflowTasks();
  });

  afterEach(function () {
    clearRuntimeLogs();
    resetWorkflowTasks();
  });

  it("writes requestId into running job meta through progress callback", async function () {
    const updates: Array<{
      state: string;
      requestId?: string;
    }> = [];
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async (job, runtime) => {
        runtime.reportProgress({
          type: "request-created",
          requestId: "req-progress-job-1",
        });
        return {
          status: "succeeded",
          requestId: "req-progress-job-1",
          fetchType: "result",
          resultJson: {
            ok: true,
          },
        };
      },
      onJobProgress: (job, event) => {
        if (event.type === "request-created") {
          const requestId = String(event.requestId || "").trim();
          if (requestId) {
            job.meta.requestId = requestId;
          }
        }
      },
      onJobUpdated: (job) => {
        recordWorkflowTaskUpdate(job);
        updates.push({
          state: job.state,
          requestId: String(job.meta.requestId || "").trim() || undefined,
        });
      },
    });

    const jobId = queue.enqueue({
      workflowId: "test-workflow",
      request: { ok: true },
      meta: {
        runId: "run-1",
      },
    });
    await queue.waitForIdle();

    const job = queue.getJob(jobId);
    assert.isOk(job);
    assert.equal(job!.state, "succeeded");
    assert.equal(String(job!.meta.requestId || ""), "req-progress-job-1");
    assert.deepEqual(
      updates.map((entry) => entry.state),
      ["queued", "running", "running", "succeeded"],
    );
    assert.equal(updates[2].requestId, "req-progress-job-1");
  });

  it("preserves typed core metadata through enqueue, progress, and deferred result", async function () {
    const updates: Array<{
      state: string;
      backendType?: string;
      providerId?: string;
      requestKind?: string;
      requestId?: string;
      sequenceStepIndex?: number;
      extensionValue?: unknown;
    }> = [];
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async (_job, runtime) => {
        runtime.reportProgress({
          type: "request-created",
          requestId: "req-core-meta-1",
        });
        return {
          status: "deferred",
          requestId: "req-core-meta-1",
          fetchType: "bundle",
          backendStatus: "waiting_user",
        };
      },
      onJobProgress: (job, event) => {
        const requestId = String(event.requestId || "").trim();
        if (requestId) {
          job.meta.requestId = requestId;
        }
      },
      onJobUpdated: (job) => {
        updates.push({
          state: job.state,
          backendType: String(job.meta.backendType || "").trim() || undefined,
          providerId: String(job.meta.providerId || "").trim() || undefined,
          requestKind: String(job.meta.requestKind || "").trim() || undefined,
          requestId: String(job.meta.requestId || "").trim() || undefined,
          sequenceStepIndex:
            typeof job.meta.sequenceStepIndex === "number"
              ? job.meta.sequenceStepIndex
              : undefined,
          extensionValue: job.meta.customWorkflowMeta,
        });
      },
    });

    const jobId = queue.enqueue({
      workflowId: "test-workflow",
      request: { ok: true },
      meta: {
        runId: " run-core ",
        workflowRunId: "workflow-run-1",
        providerId: "skillrunner",
        backendId: "backend-skillrunner",
        backendType: "skillrunner",
        backendBaseUrl: "http://127.0.0.1:8030",
        requestKind: "skillrunner.job.v1",
        sequenceStepId: "step-a",
        sequenceStepIndex: 2.8,
        customWorkflowMeta: {
          preserved: true,
        },
      },
    });
    await queue.waitForIdle();

    const job = queue.getJob(jobId);
    assert.isOk(job);
    assert.equal(job!.state, "waiting_user");
    assert.equal(job!.meta.runId, "run-core");
    assert.equal(job!.meta.requestId, "req-core-meta-1");
    assert.equal(job!.meta.sequenceStepIndex, 2);
    assert.deepEqual(job!.meta.customWorkflowMeta, {
      preserved: true,
    });
    assert.deepInclude(updates[updates.length - 1], {
      state: "waiting_user",
      backendType: "skillrunner",
      providerId: "skillrunner",
      requestKind: "skillrunner.job.v1",
      requestId: "req-core-meta-1",
      sequenceStepIndex: 2,
    });
  });

  it("maps deferred provider result to waiting_user state and releases queue idle", async function () {
    const updates: string[] = [];
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async () => ({
        status: "deferred",
        requestId: "req-deferred-1",
        fetchType: "bundle",
        backendStatus: "waiting_user",
      }),
      onJobUpdated: (job) => {
        updates.push(job.state);
      },
    });

    const jobId = queue.enqueue({
      workflowId: "test-workflow",
      request: { ok: true },
      meta: {
        runId: "run-1",
      },
    });
    await queue.waitForIdle();

    const job = queue.getJob(jobId);
    assert.isOk(job);
    assert.equal(job!.state, "waiting_user");
    assert.deepEqual(updates, ["queued", "running", "waiting_user"]);
  });

  it("degrades unknown deferred backend status to running", async function () {
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async () => ({
        status: "deferred",
        requestId: "req-degraded-1",
        fetchType: "bundle",
        backendStatus: "mystery_status",
      }),
    });

    const jobId = queue.enqueue({
      workflowId: "test-workflow",
      request: { ok: true },
      meta: {
        runId: "run-1",
      },
    });
    await queue.waitForIdle();

    const job = queue.getJob(jobId);
    assert.isOk(job);
    assert.equal(job!.state, "running");
  });

  it("maps terminal failed provider result to failed job state", async function () {
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async () => ({
        status: "failed",
        requestId: "req-terminal-failed-1",
        fetchType: "result",
        error: "backend failed",
      }),
    });

    const jobId = queue.enqueue({
      workflowId: "test-workflow",
      request: { ok: true },
      meta: {
        runId: "run-1",
      },
    });
    await queue.waitForIdle();

    const job = queue.getJob(jobId);
    assert.isOk(job);
    assert.equal(job!.state, "failed");
    assert.equal(job!.error, "backend failed");
  });

  it("maps terminal canceled provider result to canceled job state", async function () {
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async () => ({
        status: "canceled",
        requestId: "req-terminal-canceled-1",
        fetchType: "result",
        error: "backend canceled",
      }),
    });

    const jobId = queue.enqueue({
      workflowId: "test-workflow",
      request: { ok: true },
      meta: {
        runId: "run-1",
      },
    });
    await queue.waitForIdle();

    const job = queue.getJob(jobId);
    assert.isOk(job);
    assert.equal(job!.state, "canceled");
    assert.equal(job!.error, "backend canceled");
  });

  it("fails skillrunner job when dispatch times out before request id", async function () {
    const updates: Array<{
      state: string;
      requestId?: string;
      error?: string;
    }> = [];
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async () => {
        const error = new Error("SkillRunner HTTP request timed out");
        error.name = "SkillRunnerHttpTimeoutError";
        throw error;
      },
      onJobUpdated: (job) => {
        updates.push({
          state: job.state,
          requestId: String(job.meta.requestId || "").trim() || undefined,
          error: String(job.error || "").trim() || undefined,
        });
      },
    });

    const jobId = queue.enqueue({
      workflowId: "test-workflow",
      request: { ok: true },
      meta: {
        runId: "run-1",
        providerId: "skillrunner",
        backendType: "skillrunner",
        requestKind: "skillrunner.job.v1",
      },
    });
    await queue.waitForIdle();

    const job = queue.getJob(jobId);
    assert.isOk(job);
    assert.equal(job!.state, "failed");
    assert.equal(String(job!.meta.requestId || ""), "");
    assert.equal(job!.meta.skillRunnerLifecycleState, "failed");
    assert.equal(job!.meta.skillRunnerSubmitPhase, "request_creating");
    assert.deepEqual(
      updates.map((entry) => entry.state),
      ["queued", "running", "failed"],
    );
    assert.equal(updates[2].error, "SkillRunner HTTP request timed out");
    assert.isTrue(
      listRuntimeLogs().some(
        (entry) =>
          entry.stage === "dispatch-failed" && entry.requestId === undefined,
      ),
    );
  });

  it("fails request-created skillrunner job when dispatch fails before request-ready", async function () {
    const updates: Array<{
      state: string;
      requestId?: string;
      error?: string;
    }> = [];
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async (_job, runtime) => {
        runtime.reportProgress({
          type: "request-created",
          requestId: "req-recoverable-1",
        });
        throw new Error("backend polling temporarily failed");
      },
      onJobProgress: (job, event) => {
        if (event.type === "request-created") {
          const requestId = String(event.requestId || "").trim();
          if (requestId) {
            job.meta.requestId = requestId;
          }
        }
      },
      onJobUpdated: (job) => {
        updates.push({
          state: job.state,
          requestId: String(job.meta.requestId || "").trim() || undefined,
          error: String(job.error || "").trim() || undefined,
        });
      },
    });

    const jobId = queue.enqueue({
      workflowId: "test-workflow",
      request: { ok: true },
      meta: {
        runId: "run-1",
        providerId: "skillrunner",
        backendId: "backend-skillrunner-local",
        backendType: "skillrunner",
        requestKind: "skillrunner.job.v1",
      },
    });
    await queue.waitForIdle();

    const job = queue.getJob(jobId);
    assert.isOk(job);
    assert.equal(job!.state, "failed");
    assert.equal(String(job!.meta.requestId || ""), "req-recoverable-1");
    assert.equal(job!.error, "backend polling temporarily failed");
    assert.deepEqual(
      updates.map((entry) => entry.state),
      ["queued", "running", "running", "failed"],
    );
    assert.equal(updates[3].requestId, "req-recoverable-1");
    assert.equal(updates[3].error, "backend polling temporarily failed");
    assert.isUndefined(
      listWorkflowTasks().find(
        (entry) => entry.requestId === "req-recoverable-1",
      ),
    );
    assert.isTrue(
      listRuntimeLogs().some(
        (entry) =>
          entry.stage === "dispatch-failed-before-request-ready" &&
          entry.requestId === "req-recoverable-1",
      ),
    );
  });

  it("keeps request-ready skillrunner job non-terminal when later dispatch steps fail", async function () {
    const updates: Array<{
      state: string;
      requestId?: string;
      error?: string;
    }> = [];
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async (_job, runtime) => {
        runtime.reportProgress({
          type: "request-created",
          requestId: "req-recoverable-ready-1",
        });
        runtime.reportProgress({
          type: "request-ready",
          requestId: "req-recoverable-ready-1",
        });
        throw new Error("backend polling temporarily failed");
      },
      onJobProgress: (job, event) => {
        const requestId = String(event.requestId || "").trim();
        if (requestId) {
          job.meta.requestId = requestId;
        }
        if (event.type === "request-ready") {
          job.meta.skillRunnerRequestReady = true;
        }
      },
      onJobUpdated: (job) => {
        updates.push({
          state: job.state,
          requestId: String(job.meta.requestId || "").trim() || undefined,
          error: String(job.error || "").trim() || undefined,
        });
      },
    });

    const jobId = queue.enqueue({
      workflowId: "test-workflow",
      request: { ok: true },
      meta: {
        runId: "run-1",
        providerId: "skillrunner",
      },
    });
    await queue.waitForIdle();

    const job = queue.getJob(jobId);
    assert.isOk(job);
    assert.equal(job!.state, "running");
    assert.equal(String(job!.meta.requestId || ""), "req-recoverable-ready-1");
    assert.equal(job!.error, "backend polling temporarily failed");
    assert.deepEqual(
      updates.map((entry) => entry.state),
      ["queued", "running", "running", "running", "running"],
    );
    assert.equal(updates[4].requestId, "req-recoverable-ready-1");
    assert.equal(updates[4].error, "backend polling temporarily failed");
  });
});
