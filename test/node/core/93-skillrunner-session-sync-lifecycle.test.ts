import { assert } from "chai";
import type { BackendInstance } from "../../../src/backends/types";
import {
  markSkillRunnerBackendHealthSuccess,
  resetSkillRunnerBackendHealthRegistryForTests,
} from "../../../src/modules/skillRunnerBackendHealthRegistry";
import {
  drainSkillRunnerSessionSyncForTests,
  ensureSkillRunnerSessionSync,
  getSkillRunnerSessionSyncRuntimeForTests,
  resetSkillRunnerSessionSyncForTests,
  setSkillRunnerSessionSyncDepsForTests,
  stopAllSkillRunnerSessionSync,
  subscribeSkillRunnerSessionState,
} from "../../../src/modules/skillRunnerSessionSyncManager";

describe("skillrunner session sync lifecycle", function () {
  const backend = {
    id: "skillrunner-test",
    type: "skillrunner",
    baseUrl: "http://127.0.0.1:8765",
    displayName: "SkillRunner Test",
  } as unknown as BackendInstance;

  beforeEach(function () {
    resetSkillRunnerBackendHealthRegistryForTests();
    markSkillRunnerBackendHealthSuccess(backend.id);
  });

  afterEach(async function () {
    resetSkillRunnerBackendHealthRegistryForTests();
    setSkillRunnerSessionSyncDepsForTests();
    await resetSkillRunnerSessionSyncForTests();
  });

  it("suppresses stale history side effects after stop and drain", async function () {
    const calls: string[] = [];
    let signalHistoryStart!: () => void;
    const historyStarted = new Promise<void>((resolve) => {
      signalHistoryStart = resolve;
    });
    let releaseHistory!: () => void;
    const historyGate = new Promise<void>((resolve) => {
      releaseHistory = resolve;
    });

    setSkillRunnerSessionSyncDepsForTests({
      buildManagementClient: () => ({
        listRunEventHistory: async () => {
          calls.push("history:start");
          signalHistoryStart();
          await historyGate;
          calls.push("history:end");
          return {
            events: [
              {
                seq: 1,
                type: "conversation.state.changed",
                data: { to: "waiting_user" },
              },
            ],
            cursor_ceiling: 1,
          };
        },
        streamRunEvents: async () => {
          throw new Error("session sync must not open background event stream");
        },
      }),
      markSkillRunnerBackendHealthSuccess: () => {
        calls.push("health:success");
      },
      markSkillRunnerBackendHealthFailure: () => {
        calls.push("health:failure");
      },
      appendRuntimeLog: () => {
        calls.push("log");
      },
      updateSkillRunnerRunStateByRequest: () => {
        calls.push("run-store");
        return null;
      },
      updateWorkflowTaskStateByRequest: () => {
        calls.push("task");
      },
      updateTaskDashboardHistoryStateByRequest: () => {
        calls.push("history-state");
      },
    });

    ensureSkillRunnerSessionSync({
      backend,
      requestId: "req-history-stop",
    });
    await historyStarted;
    assert.include(calls, "history:start");

    stopAllSkillRunnerSessionSync();
    releaseHistory();
    await drainSkillRunnerSessionSyncForTests();

    assert.notInclude(calls, "health:success");
    assert.notInclude(calls, "health:failure");
    assert.notInclude(calls, "run-store");
    assert.notInclude(calls, "task");
    assert.notInclude(calls, "history-state");
    assert.notInclude(calls, "log");
    assert.deepInclude(getSkillRunnerSessionSyncRuntimeForTests(), {
      sessionCount: 0,
      inflightTaskCount: 0,
    });
  });

  it("does not open a background event stream and releases after history sync", async function () {
    const calls: string[] = [];

    setSkillRunnerSessionSyncDepsForTests({
      buildManagementClient: () => ({
        listRunEventHistory: async () => {
          calls.push("history");
          return {
            events: [],
            cursor_ceiling: 0,
          };
        },
        streamRunEvents: async () => {
          calls.push("stream");
          throw new Error("session sync must not open background event stream");
        },
      }),
      markSkillRunnerBackendHealthSuccess: () => {
        calls.push("health:success");
      },
      markSkillRunnerBackendHealthFailure: () => {
        calls.push("health:failure");
      },
      appendRuntimeLog: () => {
        calls.push("log");
      },
      updateSkillRunnerRunStateByRequest: () => null,
      updateWorkflowTaskStateByRequest: () => undefined,
      updateTaskDashboardHistoryStateByRequest: () => undefined,
    });

    ensureSkillRunnerSessionSync({
      backend,
      requestId: "req-history-only",
    });
    await drainSkillRunnerSessionSyncForTests();

    assert.deepEqual(calls, ["history"]);
    assert.notInclude(calls, "stream");
    assert.notInclude(calls, "health:success");
    assert.notInclude(calls, "health:failure");
    assert.notInclude(calls, "log");
    assert.deepInclude(getSkillRunnerSessionSyncRuntimeForTests(), {
      sessionCount: 0,
      inflightTaskCount: 0,
    });
  });

  it("reuses the last event cursor across short history sync sessions", async function () {
    const fromSeqs: number[] = [];

    setSkillRunnerSessionSyncDepsForTests({
      buildManagementClient: () => ({
        listRunEventHistory: async (args: { fromSeq?: number }) => {
          fromSeqs.push(Number(args.fromSeq || 0));
          return {
            events: [
              {
                seq: 4,
                type: "conversation.state.changed",
                data: { to: "running" },
              },
            ],
            cursor_ceiling: 4,
          };
        },
        streamRunEvents: async () => {
          throw new Error("session sync must not open background event stream");
        },
      }),
      markSkillRunnerBackendHealthSuccess: () => undefined,
      markSkillRunnerBackendHealthFailure: () => undefined,
      appendRuntimeLog: () => undefined,
      updateSkillRunnerRunStateByRequest: () => null,
      updateWorkflowTaskStateByRequest: () => undefined,
      updateTaskDashboardHistoryStateByRequest: () => undefined,
    });

    ensureSkillRunnerSessionSync({
      backend,
      requestId: "req-cursor",
    });
    await drainSkillRunnerSessionSyncForTests();
    ensureSkillRunnerSessionSync({
      backend,
      requestId: "req-cursor",
    });
    await drainSkillRunnerSessionSyncForTests();

    assert.deepEqual(fromSeqs, [1, 5]);
  });

  it("resetForTests drains work and clears runtime caches", async function () {
    const unsubscribe = subscribeSkillRunnerSessionState({
      backendId: backend.id,
      requestId: "req-reset",
      listener: () => undefined,
    });

    ensureSkillRunnerSessionSync({
      backend,
      requestId: "req-reset",
    });
    await resetSkillRunnerSessionSyncForTests();

    assert.deepEqual(getSkillRunnerSessionSyncRuntimeForTests(), {
      sessionCount: 0,
      lastEventCursorCount: 0,
      listenerCount: 0,
      inflightTaskCount: 0,
      activeGenerationCount: 0,
    });
    unsubscribe();
  });
});
