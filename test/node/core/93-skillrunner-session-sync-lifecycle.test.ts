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
          calls.push("stream");
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

  it("suppresses stale stream disconnect side effects after stop and drain", async function () {
    const calls: string[] = [];
    let signalStreamStart!: () => void;
    const streamStarted = new Promise<void>((resolve) => {
      signalStreamStart = resolve;
    });
    let rejectStream!: (error?: unknown) => void;
    const streamGate = new Promise<never>((_resolve, reject) => {
      rejectStream = reject;
    });

    setSkillRunnerSessionSyncDepsForTests({
      buildManagementClient: () => ({
        listRunEventHistory: async () => ({
          events: [],
          cursor_ceiling: 0,
        }),
        streamRunEvents: async () => {
          calls.push("stream:start");
          signalStreamStart();
          return streamGate;
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
      requestId: "req-stream-stop",
    });
    await streamStarted;
    assert.include(calls, "stream:start");
    assert.include(calls, "health:success");

    stopAllSkillRunnerSessionSync();
    rejectStream(new Error("stream disconnected after stop"));
    await drainSkillRunnerSessionSyncForTests();

    assert.notInclude(calls, "health:failure");
    assert.notInclude(calls, "log");
    assert.deepInclude(getSkillRunnerSessionSyncRuntimeForTests(), {
      sessionCount: 0,
      inflightTaskCount: 0,
    });
  });

  it("backs off before replaying event history after a clean stream return", async function () {
    let historyCount = 0;
    let streamCount = 0;
    let signalStream!: () => void;
    const streamStarted = new Promise<void>((resolve) => {
      signalStream = resolve;
    });

    setSkillRunnerSessionSyncDepsForTests({
      buildManagementClient: () => ({
        listRunEventHistory: async () => {
          historyCount += 1;
          return {
            events: [],
            cursor_ceiling: 0,
          };
        },
        streamRunEvents: async () => {
          streamCount += 1;
          signalStream();
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
      requestId: "req-clean-return",
    });
    await streamStarted;
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(historyCount, 1);
    assert.equal(streamCount, 1);

    stopAllSkillRunnerSessionSync();
    await drainSkillRunnerSessionSyncForTests();
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
