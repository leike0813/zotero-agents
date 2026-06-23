import { assert } from "chai";
import type { JobRecord } from "../../src/jobQueue/manager";
import {
  cleanupTaskDashboardHistory,
  getTaskDashboardHistoryRetentionConfig,
  listTaskDashboardHistory,
  recordTaskDashboardHistoryFromJob,
  resetTaskDashboardHistory,
} from "../../src/modules/taskDashboardHistory";

function makeJob(args: {
  id: string;
  state: JobRecord["state"];
  backendType?: string;
  backendId?: string;
  engine?: string;
  requestId?: string;
  targetParentID?: number;
  updatedAt: string;
}) {
  const job: JobRecord = {
    id: args.id,
    workflowId: "tag-regulator",
    request: {},
    meta: {
      runId: "run-1",
      workflowLabel: "Tag Regulator",
      taskName: "paper-a",
      providerId: args.backendType ?? "generic-http",
      backendId: args.backendId ?? "generic-http-local",
      backendType: args.backendType ?? "generic-http",
      backendBaseUrl: "http://127.0.0.1:8030",
      engine: args.engine || "",
      targetParentID: args.targetParentID,
    },
    state: args.state,
    createdAt: "2026-03-08T00:00:00.000Z",
    updatedAt: args.updatedAt,
    result: args.requestId ? { requestId: args.requestId } : undefined,
  };
  return job;
}

describe("task dashboard history", function () {
  beforeEach(function () {
    resetTaskDashboardHistory();
  });

  it("records and updates task history by stable id", function () {
    recordTaskDashboardHistoryFromJob(
      makeJob({
        id: "job-1",
        state: "queued",
        engine: "gemini",
        updatedAt: "2026-03-08T00:00:00.000Z",
      }),
    );
    recordTaskDashboardHistoryFromJob(
      makeJob({
        id: "job-1",
        state: "succeeded",
        engine: "gemini",
        requestId: "req-1",
        updatedAt: "2026-03-08T00:00:02.000Z",
      }),
    );

    const history = listTaskDashboardHistory();
    assert.lengthOf(history, 1);
    assert.equal(history[0].id, "run-1:job-1");
    assert.equal(history[0].state, "succeeded");
    assert.equal(history[0].requestId, "req-1");
    assert.equal(history[0].backendId, "generic-http-local");
    assert.equal(history[0].engine, "gemini");
  });

  it("preserves targetParentID in persisted history records", function () {
    recordTaskDashboardHistoryFromJob(
      makeJob({
        id: "job-parent",
        state: "running",
        requestId: "req-parent",
        targetParentID: 456,
        updatedAt: "2026-03-08T00:00:03.000Z",
      }),
    );

    const history = listTaskDashboardHistory();
    assert.lengthOf(history, 1);
    assert.equal(history[0].targetParentID, 456);
  });

  it("accepts waiting_user state in persisted history records", function () {
    recordTaskDashboardHistoryFromJob(
      makeJob({
        id: "job-waiting",
        state: "waiting_user",
        engine: "gemini",
        requestId: "req-waiting",
        updatedAt: "2026-03-08T00:00:05.000Z",
      }),
    );

    const history = listTaskDashboardHistory();
    assert.lengthOf(history, 1);
    assert.equal(history[0].state, "waiting_user");
    assert.equal(history[0].requestId, "req-waiting");
  });

  it("skips pass-through provider records", function () {
    recordTaskDashboardHistoryFromJob(
      makeJob({
        id: "job-1",
        state: "succeeded",
        backendType: "pass-through",
        backendId: "pass-through-local",
        updatedAt: "2026-03-08T00:00:00.000Z",
      }),
    );
    assert.lengthOf(listTaskDashboardHistory(), 0);
  });

  it("drops expired entries older than 30 days", function () {
    const retentionMs = getTaskDashboardHistoryRetentionConfig().retentionMs;
    const oldDate = new Date(Date.now() - retentionMs - 24 * 60 * 60 * 1000).toISOString();
    recordTaskDashboardHistoryFromJob(
      makeJob({
        id: "job-1",
        state: "failed",
        updatedAt: oldDate,
      }),
    );

    const cleaned = cleanupTaskDashboardHistory();
    assert.equal(cleaned.before, 1);
    assert.equal(cleaned.after, 0);
    assert.lengthOf(listTaskDashboardHistory(), 0);
  });
});
