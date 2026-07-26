import { assert } from "chai";
import type { BackendInstance } from "../../src/backends/types";
import { resolveBackendDisplayName } from "../../src/backends/displayName";
import {
  mergeDashboardTaskRows,
  normalizeDashboardBackends,
  normalizeDashboardTabKey,
  projectDashboardQueuedRows,
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

  it("keeps SkillRunner connection audit tab only when both gates are enabled", function () {
    const backends = [makeBackend("skillrunner-primary", "skillrunner")];
    assert.equal(
      normalizeDashboardTabKey({
        requestedTabKey: "skillrunner-connection-audit",
        backends,
        debugModeEnabled: true,
        skillRunnerConnectionAuditEnabled: true,
      }),
      "skillrunner-connection-audit",
    );
    for (const gates of [
      { debugModeEnabled: false, skillRunnerConnectionAuditEnabled: true },
      { debugModeEnabled: true, skillRunnerConnectionAuditEnabled: false },
      { debugModeEnabled: false, skillRunnerConnectionAuditEnabled: false },
    ]) {
      assert.equal(
        normalizeDashboardTabKey({
          requestedTabKey: "skillrunner-connection-audit",
          backends,
          ...gates,
        }),
        "home",
      );
    }
  });

  it("normalizes ACP recorder and replay diagnostics into one debug surface", function () {
    const backends = [makeBackend("skillrunner-primary", "skillrunner")];
    for (const args of [
      { acpTraceRecorderEnabled: true },
      { acpReplayProfilerEnabled: true },
    ]) {
      assert.equal(
        normalizeDashboardTabKey({
          requestedTabKey: "acp-trace-replay",
          backends,
          debugModeEnabled: true,
          ...args,
        }),
        "acp-trace-replay",
      );
    }
    for (const [legacyKey, flag] of [
      ["acp-trace-recorder", "acpTraceRecorderEnabled"],
      ["acp-replay-profiler", "acpReplayProfilerEnabled"],
    ] as const) {
      assert.equal(
        normalizeDashboardTabKey({
          requestedTabKey: legacyKey,
          backends,
          debugModeEnabled: true,
          [flag]: true,
        }),
        "acp-trace-replay",
      );
    }
    for (const args of [
      { debugModeEnabled: false, acpTraceRecorderEnabled: true },
      { debugModeEnabled: true },
    ]) {
      assert.equal(
        normalizeDashboardTabKey({
          requestedTabKey: "acp-trace-replay",
          backends,
          ...args,
        }),
        "home",
      );
    }
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

  it("projects only matching backend Host queue rows without provider identities", function () {
    const rows = projectDashboardQueuedRows({
      backend: {
        ...makeBackend("acp-a", "acp"),
        displayName: "ACP A",
      },
      queuedStateLabel: "Queued",
      queued: [
        {
          queueId: "queue-1",
          submissionId: "submission-1",
          unitId: "unit-1",
          unitOrder: 0,
          workflowId: "workflow-a",
          workflowLabel: "Workflow A",
          taskName: "Paper A",
          backendType: "acp",
          backendId: "acp-a",
          createdAt: "2026-07-23T00:00:00.000Z",
          canCancel: true,
        },
        {
          queueId: "queue-2",
          submissionId: "submission-2",
          unitId: "unit-2",
          unitOrder: 0,
          workflowId: "workflow-b",
          workflowLabel: "Workflow B",
          taskName: "Paper B",
          backendType: "skillrunner",
          backendId: "skillrunner-b",
          createdAt: "2026-07-23T00:00:01.000Z",
          canCancel: true,
        },
      ] as any,
    });
    assert.lengthOf(rows, 1);
    assert.equal(rows[0].id, "host-queue:queue-1");
    assert.equal(rows[0].queueId, "queue-1");
    assert.notProperty(rows[0], "requestId");
    assert.notProperty(rows[0], "runKey");
    assert.notProperty(rows[0], "jobId");
  });
});
