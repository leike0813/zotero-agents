import { assert } from "chai";
import { JobQueueManager } from "../../src/jobQueue/manager";
import { clearRuntimeLogs } from "../../src/modules/runtimeLogManager";
import {
  recordWorkflowTaskUpdate,
  resetWorkflowTasks,
} from "../../src/modules/taskRuntime";

describe("job queue progress", function () {
  it("publishes stored raw outcomes and releases capacity after settlement observer failure", async function () {
    const result = { payload: [1, 2, 3] };
    const settled: string[] = [];
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async (_job, runtime) => {
        runtime.reportProgress({ type: "identity", requestId: "request-1" });
        return {
          state: "waiting_user",
          result,
          metaPatch: { taskName: "settled task" },
        };
      },
      onJobProgress: (job, event) => {
        job.meta.requestId = String(event.requestId);
      },
      onJobSettled: (job) => {
        const stored = queue.getJob(job.id)!;
        assert.strictEqual(stored.result, result);
        assert.equal(stored.state, "waiting_user");
        assert.equal(stored.meta.requestId, "request-1");
        assert.equal(stored.meta.taskName, "settled task");
        assert.equal(stored.meta.extensionValue, "retained");
        settled.push(job.id);
        throw new Error("settlement observer unavailable");
      },
    });
    const ids = [0, 1].map(() =>
      queue.enqueue({
        workflowId: "neutral-outcome",
        request: {},
        meta: { extensionValue: "retained" },
      }),
    );
    await queue.waitForIdle();
    assert.deepEqual(settled, ids);
    for (const id of ids) {
      assert.equal(queue.getJob(id)?.state, "waiting_user");
      assert.isUndefined(queue.getJob(id)?.error);
    }
  });

  beforeEach(function () {
    clearRuntimeLogs();
    resetWorkflowTasks();
  });

  afterEach(function () {
    clearRuntimeLogs();
    resetWorkflowTasks();
  });

  it("stores succeeded outcome and writes requestId into running job meta through progress callback", async function () {
    const updates: Array<{
      state: string;
      requestId?: string;
    }> = [];
    const result = {
      status: "succeeded",
      requestId: "req-progress-job-1",
      fetchType: "result",
      resultJson: {
        ok: true,
      },
    };
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async (_job, runtime) => {
        runtime.reportProgress({
          type: "request-created",
          requestId: "req-progress-job-1",
        });
        return {
          state: "succeeded",
          result,
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
    assert.deepEqual(job!.result, result);
    assert.equal(String(job!.meta.requestId || ""), "req-progress-job-1");
    assert.deepEqual(
      updates.map((entry) => entry.state),
      ["queued", "running", "running", "succeeded"],
    );
    assert.equal(updates[2].requestId, "req-progress-job-1");
  });

  it("preserves typed core metadata through enqueue, progress, and deferred outcome", async function () {
    const updates: Array<{
      state: string;
      backendType?: string;
      providerId?: string;
      requestKind?: string;
      requestId?: string;
      sequenceStepIndex?: number;
      extensionValue?: unknown;
    }> = [];
    const result = {
      status: "deferred",
      requestId: "req-core-meta-1",
      fetchType: "bundle",
      backendStatus: "waiting_user",
    };
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async (_job, runtime) => {
        runtime.reportProgress({
          type: "request-created",
          requestId: "req-core-meta-1",
        });
        return {
          state: "waiting_user",
          result,
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
    assert.deepEqual(job!.result, result);
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

  it("settles waiting_user outcome and releases queue idle", async function () {
    const updates: string[] = [];
    const result = {
      status: "deferred",
      requestId: "req-deferred-1",
      fetchType: "bundle",
      backendStatus: "waiting_user",
    };
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async () => ({ state: "waiting_user", result }),
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
    assert.deepEqual(job!.result, result);
    assert.deepEqual(updates, ["queued", "running", "waiting_user"]);
  });

  it("stores failed outcome without replacing its raw result", async function () {
    const result = {
      status: "failed",
      requestId: "req-terminal-failed-1",
      fetchType: "result",
      error: "backend failed",
    };
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async () => ({
        state: "failed",
        result,
        error: result.error,
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
    assert.deepEqual(job!.result, result);
  });

  it("stores canceled outcome without replacing its raw result", async function () {
    const result = {
      status: "canceled",
      requestId: "req-terminal-canceled-1",
      fetchType: "result",
      error: "backend canceled",
    };
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async () => ({
        state: "canceled",
        result,
        error: result.error,
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
    assert.deepEqual(job!.result, result);
  });

  it("fails a rejected executor and continues with the next job", async function () {
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: async (job) => {
        if (job.request === "reject") {
          throw new Error("executor rejected");
        }
        return {
          state: "succeeded",
          result: { ok: true },
        };
      },
    });
    const rejectedId = queue.enqueue({
      workflowId: "neutral-reject",
      request: "reject",
      meta: { runId: "run-reject" },
    });
    const completedId = queue.enqueue({
      workflowId: "neutral-reject",
      request: "complete",
      meta: { runId: "run-complete" },
    });
    await queue.waitForIdle();

    assert.equal(queue.getJob(rejectedId)?.state, "failed");
    assert.equal(queue.getJob(rejectedId)?.error, "executor rejected");
    assert.equal(queue.getJob(completedId)?.state, "succeeded");
    assert.deepEqual(queue.getJob(completedId)?.result, { ok: true });
  });
});
