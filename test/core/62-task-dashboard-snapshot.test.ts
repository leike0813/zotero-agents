import { assert } from "chai";
import type { BackendInstance } from "../../src/backends/types";
import { resolveBackendDisplayName } from "../../src/backends/displayName";
import {
  mergeDashboardTaskRows,
  normalizeDashboardBackends,
  normalizeDashboardTabKey,
} from "../../src/modules/taskDashboardSnapshot";
import type { TaskDashboardHistoryRecord } from "../../src/modules/taskDashboardHistory";
import type { WorkflowTaskRecord } from "../../src/modules/taskRuntime";

function makeBackend(id: string, type: string): BackendInstance {
  return {
    id,
    type,
    baseUrl: "http://127.0.0.1:8030",
    auth: { kind: "none" },
  };
}

function makeTask(args: {
  id: string;
  backendId: string;
  backendType: string;
  state: WorkflowTaskRecord["state"];
  updatedAt: string;
  requestId?: string;
  targetParentID?: number;
}): WorkflowTaskRecord {
  return {
    id: args.id,
    runId: "run-1",
    jobId: "job-1",
    requestId: args.requestId,
    workflowId: "wf",
    workflowLabel: "WF",
    taskName: "task",
    providerId: "skillrunner",
    backendId: args.backendId,
    backendType: args.backendType,
    backendBaseUrl: "http://127.0.0.1:8030",
    targetParentID: args.targetParentID,
    state: args.state,
    createdAt: "2026-03-09T00:00:00.000Z",
    updatedAt: args.updatedAt,
  };
}

function makeHistory(args: {
  id: string;
  backendId: string;
  backendType: string;
  state: WorkflowTaskRecord["state"];
  updatedAt: string;
  targetParentID?: number;
}): TaskDashboardHistoryRecord {
  return {
    ...makeTask({
      id: args.id,
      backendId: args.backendId,
      backendType: args.backendType,
      state: args.state,
      updatedAt: args.updatedAt,
      targetParentID: args.targetParentID,
    }),
    archivedAt: args.updatedAt,
  };
}

describe("task dashboard snapshot", function () {
  it("includes configured backends except pass-through", function () {
    const backends = normalizeDashboardBackends({
      configured: [makeBackend("skillrunner-primary", "skillrunner")],
      history: [
        makeHistory({
          id: "h-1",
          backendId: "generic-1",
          backendType: "generic-http",
          state: "failed",
          updatedAt: "2026-03-09T00:00:02.000Z",
        }),
      ],
      active: [
        makeTask({
          id: "a-1",
          backendId: "pass-through-local",
          backendType: "pass-through",
          state: "running",
          updatedAt: "2026-03-09T00:00:03.000Z",
        }),
      ],
    });
    assert.deepEqual(
      backends.map((entry) => `${entry.id}:${entry.type}`),
      ["skillrunner-primary:skillrunner"],
    );
  });

  it("merges running tasks over history rows for same task id", function () {
    const rows = mergeDashboardTaskRows({
      backendId: "skillrunner-primary",
      history: [
        makeHistory({
          id: "task-1",
          backendId: "skillrunner-primary",
          backendType: "skillrunner",
          state: "queued",
          updatedAt: "2026-03-09T00:00:01.000Z",
        }),
      ],
      active: [
        makeTask({
          id: "task-1",
          backendId: "skillrunner-primary",
          backendType: "skillrunner",
          state: "running",
          updatedAt: "2026-03-09T00:00:05.000Z",
          requestId: "req-1",
        }),
      ],
    });
    assert.lengthOf(rows, 1);
    assert.equal(rows[0].state, "running");
    assert.equal(rows[0].requestId, "req-1");
  });

  it("preserves targetParentID when merging active and history rows", function () {
    const rows = mergeDashboardTaskRows({
      backendId: "skillrunner-primary",
      history: [
        makeHistory({
          id: "task-1",
          backendId: "skillrunner-primary",
          backendType: "skillrunner",
          state: "queued",
          updatedAt: "2026-03-09T00:00:01.000Z",
          targetParentID: 111,
        }),
      ],
      active: [
        makeTask({
          id: "task-1",
          backendId: "skillrunner-primary",
          backendType: "skillrunner",
          state: "running",
          updatedAt: "2026-03-09T00:00:05.000Z",
          requestId: "req-1",
          targetParentID: 222,
        }),
      ],
    });
    assert.lengthOf(rows, 1);
    assert.equal(rows[0].targetParentID, 222);
  });

  it("normalizes invalid tab key back to home", function () {
    const normalized = normalizeDashboardTabKey({
      requestedTabKey: "backend:not-exists",
      backends: [makeBackend("skillrunner-primary", "skillrunner")],
    });
    assert.equal(normalized, "home");
  });

  it("keeps workflow-options tab key when requested", function () {
    const normalized = normalizeDashboardTabKey({
      requestedTabKey: "workflow-options",
      backends: [makeBackend("skillrunner-primary", "skillrunner")],
    });
    assert.equal(normalized, "workflow-options");
  });

  it("keeps products tab key when requested", function () {
    const normalized = normalizeDashboardTabKey({
      requestedTabKey: "products",
      backends: [makeBackend("skillrunner-primary", "skillrunner")],
    });
    assert.equal(normalized, "products");
  });

  it("maps managed local backend id to localized display name", function () {
    const displayName = resolveBackendDisplayName("local-skillrunner-backend");
    assert.notEqual(displayName, "local-skillrunner-backend");
    assert.isNotEmpty(displayName);
  });

  it("does not apply managed-local localization alias to legacy removed backend id", function () {
    const legacy = resolveBackendDisplayName("skillrunner-local");
    assert.equal(legacy, "skillrunner-local");
  });

  it("prefers configured displayName for non-managed backend ids", function () {
    const displayName = resolveBackendDisplayName(
      "backend-generic-http-local",
      "My Generic Backend",
    );
    assert.equal(displayName, "My Generic Backend");
  });
});
