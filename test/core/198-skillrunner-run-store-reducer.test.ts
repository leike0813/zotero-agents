import { assert } from "chai";
import {
  applySkillRunnerRunEvent,
  getSkillRunnerRunRecord,
  getSkillRunnerRunRecordByRequest,
  listSkillRunnerRunEvents,
  type SkillRunnerRunEvent,
} from "../../src/modules/skillRunnerRunStore";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";

const backendId = "reducer-backend";

function createdEvent(
  overrides: Partial<
    Extract<SkillRunnerRunEvent, { type: "submit.local_created" }>
  > = {},
): Extract<SkillRunnerRunEvent, { type: "submit.local_created" }> {
  return {
    type: "submit.local_created",
    backendId,
    init: {
      backendId,
      workflowId: "reducer-workflow",
      workflowRunId: "run-reducer",
      jobId: "job-reducer",
      taskName: "Reducer task",
    },
    ...overrides,
  };
}

describe("SkillRunner run store reducer", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
  });

  it("creates a run and appends one audit event", function () {
    const created = applySkillRunnerRunEvent(createdEvent());
    assert.equal(created?.runKey, "local:run-reducer:job-reducer");
    assert.equal(created?.status, "queued");
    assert.equal(created?.submitPhase, "pre_request");
    const events = listSkillRunnerRunEvents(created!.runKey);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, "submit.local_created");
  });

  it("attaches request identity through request.created", function () {
    const created = applySkillRunnerRunEvent(createdEvent());
    const updated = applySkillRunnerRunEvent({
      type: "request.created",
      runKey: created!.runKey,
      backendId,
      requestId: "request-1",
    });
    assert.equal(updated?.requestId, "request-1");
    assert.equal(updated?.status, "running");
    assert.equal(updated?.submitPhase, "created");
    assert.equal(updated?.observerState, "attached");
    assert.equal(
      getSkillRunnerRunRecordByRequest({ backendId, requestId: "request-1" })
        ?.runKey,
      created!.runKey,
    );
    assert.equal(listSkillRunnerRunEvents(created!.runKey).length, 2);
  });

  it("preserves request identity conflicts and keeps terminal guard", function () {
    const created = applySkillRunnerRunEvent(createdEvent());
    applySkillRunnerRunEvent({
      type: "request.created",
      runKey: created!.runKey,
      backendId,
      requestId: "request-1",
    });
    const conflict = applySkillRunnerRunEvent({
      type: "request.created",
      runKey: created!.runKey,
      backendId,
      requestId: "request-2",
    });
    assert.equal(conflict?.requestId, "request-1");

    applySkillRunnerRunEvent({
      type: "backend.terminal",
      runKey: created!.runKey,
      backendId,
      status: "failed",
      error: "provider failed",
    });
    const guarded = applySkillRunnerRunEvent({
      type: "backend.snapshot",
      runKey: created!.runKey,
      backendId,
      state: "running",
      backendStatus: "running",
    });
    assert.equal(guarded?.status, "failed");
    assert.equal(guarded?.error, "provider failed");
  });

  it("maps progress events to submit phases", function () {
    const created = applySkillRunnerRunEvent(createdEvent());
    const queued = applySkillRunnerRunEvent({
      type: "submit.request_creating",
      runKey: created!.runKey,
      backendId,
    });
    assert.equal(queued?.status, "queued");
    assert.equal(queued?.submitPhase, "creating");

    const uploading = applySkillRunnerRunEvent({
      type: "submit.uploading",
      runKey: created!.runKey,
      backendId,
    });
    assert.equal(uploading?.status, "running");
    assert.equal(uploading?.submitPhase, "uploading");

    const ready = applySkillRunnerRunEvent({
      type: "request.ready",
      runKey: created!.runKey,
      backendId,
    });
    assert.equal(ready?.status, "running");
    assert.equal(ready?.submitPhase, "request_ready");
  });

  it("keeps backend snapshot no-op timestamp stable", function () {
    const created = applySkillRunnerRunEvent(createdEvent(), {
      updatedAt: "2026-08-15T12:00:00.000Z",
    } as any);
    applySkillRunnerRunEvent({
      type: "request.created",
      runKey: created!.runKey,
      backendId,
      requestId: "request-1",
      updatedAt: "2026-08-15T12:00:00.000Z",
    });
    const snapshot = applySkillRunnerRunEvent({
      type: "backend.snapshot",
      runKey: created!.runKey,
      backendId,
      state: "running",
      backendStatus: "running",
      updatedAt: "2026-08-15T12:01:00.000Z",
    });
    assert.equal(snapshot?.updatedAt, "2026-08-15T12:01:00.000Z");
  });

  it("derives run failure from apply.failed", function () {
    const created = applySkillRunnerRunEvent(createdEvent());
    applySkillRunnerRunEvent({
      type: "request.created",
      runKey: created!.runKey,
      backendId,
      requestId: "request-1",
    });
    const updated = applySkillRunnerRunEvent({
      type: "apply.failed",
      runKey: created!.runKey,
      backendId,
      requestId: "request-1",
      error: "apply failed",
    });
    assert.equal(updated?.status, "failed");
    assert.equal(updated?.apply.state, "failed");
    assert.equal(updated?.apply.error, "apply failed");
  });

  it("merges result fields through result.fetched", function () {
    const created = applySkillRunnerRunEvent(createdEvent());
    applySkillRunnerRunEvent({
      type: "request.created",
      runKey: created!.runKey,
      backendId,
      requestId: "request-1",
    });
    const updated = applySkillRunnerRunEvent({
      type: "result.fetched",
      runKey: created!.runKey,
      backendId,
      requestId: "request-1",
      resultJson: { ok: true },
      resultJsonPath: "result.json",
      workspaceDir: "/tmp/workspace",
    });
    assert.deepEqual(updated?.result?.resultJson, { ok: true });
    assert.equal(updated?.result?.resultJsonPath, "result.json");
    assert.equal(updated?.result?.workspaceDir, "/tmp/workspace");
  });

  it("archives and deletes through lifecycle events", function () {
    const created = applySkillRunnerRunEvent(createdEvent());
    const archived = applySkillRunnerRunEvent({
      type: "run.archived",
      runKey: created!.runKey,
      backendId,
      archivedAt: "2026-08-15T13:00:00.000Z",
    });
    assert.equal(archived?.archivedAt, "2026-08-15T13:00:00.000Z");

    const deleted = applySkillRunnerRunEvent({
      type: "run.deleted",
      runKey: created!.runKey,
      backendId,
    });
    assert.isNull(deleted);
    assert.isNull(getSkillRunnerRunRecord(created!.runKey));
    assert.deepEqual(listSkillRunnerRunEvents(created!.runKey), []);
  });

  it("returns null for missing non-create runs without fabricating events", function () {
    const updated = applySkillRunnerRunEvent({
      type: "backend.snapshot",
      runKey: "local:missing-run:job",
      backendId,
      state: "running",
    });
    assert.isNull(updated);
    assert.deepEqual(listSkillRunnerRunEvents("local:missing-run:job"), []);
  });
});
