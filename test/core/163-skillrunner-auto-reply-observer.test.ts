import { assert } from "chai";
import type { JobRecord } from "../../src/jobQueue/manager";
import { SkillRunnerHttpError } from "../../src/providers/skillrunner/errors";
import {
  getSkillRunnerAutoReplyObserverRuntimeForTests,
  getSkillRunnerAutoReplyObserverState,
  guardSkillRunnerAutoReplyBeforeUserReply,
  maybeObserveSkillRunnerAutoReplyRun,
  reconcileSkillRunnerAutoReplyAfterReplyError,
  resetSkillRunnerAutoReplyObserverForTests,
  runSkillRunnerAutoReplyObserverTickForTests,
  setSkillRunnerAutoReplyObserverRuntimeForTests,
  shutdownSkillRunnerAutoReplyObserver,
  subscribeSkillRunnerAutoReplyObserverState,
  stopSkillRunnerAutoReplyObserver,
} from "../../src/modules/skillRunnerAutoReplyObserver";
import { setSkillRunnerInteractiveAutoReplyEnabledForTests } from "../../src/modules/skillRunnerInteractiveAutoReply";
import {
  resetPluginStateStoreForTests,
} from "../../src/modules/pluginStateStore";
import { resetWorkflowTasks } from "../../src/modules/taskRuntime";
import {
  archiveSkillRunnerRunRecordByRequest,
  attachSkillRunnerRequestId,
  createSkillRunnerRun,
  getSkillRunnerRunRecordByRequest,
  recordSkillRunnerObserverFailure,
  updateSkillRunnerRunStateByRequest,
  updateSkillRunnerRunStateByRunKey,
} from "../../src/modules/skillRunnerRunStore";
import {
  buildSkillRunnerRunRecordRequestPayload,
} from "../../src/modules/skillRunnerInteractiveAutoReply";
import {
  resetTaskDashboardHistory,
} from "../../src/modules/taskDashboardHistory";

const backend = {
  id: "skillrunner-local",
  type: "skillrunner" as const,
  baseUrl: "http://127.0.0.1:8030",
  auth: { kind: "none" as const },
};

function waitingJob(requestId = "sr-auto-reply"): JobRecord {
  return {
    id: "job-auto-reply",
    workflowId: "debug-interactive-choice-probe",
    request: {
      kind: "skillrunner.job.v1",
      skill_id: "debug-interactive-choice-probe",
      runtime_options: {
        execution_mode: "interactive",
      },
    },
    meta: {
      runId: "run-auto-reply",
      workflowLabel: "Debug Interactive",
      taskName: "debug-interactive-choice-probe",
      providerId: "skillrunner",
      providerOptions: {
        interactive_auto_reply: true,
        interactive_reply_timeout_sec: 30,
      },
      backendId: backend.id,
      backendType: backend.type,
      backendBaseUrl: backend.baseUrl,
      requestKind: "skillrunner.job.v1",
      requestId,
      skillId: "debug-interactive-choice-probe",
      executionMode: "interactive",
      skillRunnerLifecycleState: "waiting_user",
      skillRunnerRequestReady: true,
    },
    state: "waiting_user",
    result: {
      requestId,
      status: "deferred",
      backendStatus: "waiting_user",
    },
    createdAt: "2026-06-21T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:01.000Z",
  };
}

function recordWaitingRun(requestId = "sr-auto-reply") {
  const job = waitingJob(requestId);
  const requestPayload = buildSkillRunnerRunRecordRequestPayload({
    request: job.request,
    providerOptions: job.meta.providerOptions,
  });
  const run = createSkillRunnerRun({
    backendId: backend.id,
    workflowId: job.workflowId,
    workflowRunId: String(job.meta.runId || ""),
    jobId: job.id,
    taskName: String(job.meta.taskName || job.id),
    skillId: String(job.meta.skillId || "") || undefined,
    requestPayload,
    fetchType: "result",
    executionMode: "interactive",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
  if (!run) {
    return null;
  }
  const attached =
    attachSkillRunnerRequestId({
      runKey: run.runKey,
      requestId,
      updatedAt: job.updatedAt,
    }) || run;
  updateSkillRunnerRunStateByRunKey({
    runKey: attached.runKey,
    state: "request_ready",
    backendStatus: "running",
    updatedAt: job.updatedAt,
  });
  return updateSkillRunnerRunStateByRunKey({
    runKey: attached.runKey,
    state: "waiting_user",
    backendStatus: "waiting_user",
    updatedAt: job.updatedAt,
  });
}

describe("SkillRunner auto-reply observer", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
    resetWorkflowTasks();
    resetTaskDashboardHistory();
    resetSkillRunnerAutoReplyObserverForTests();
    setSkillRunnerInteractiveAutoReplyEnabledForTests();
  });

  afterEach(function () {
    resetSkillRunnerAutoReplyObserverForTests();
    setSkillRunnerInteractiveAutoReplyEnabledForTests();
    resetWorkflowTasks();
    resetTaskDashboardHistory();
    resetPluginStateStoreForTests();
  });

  it("does not observe waiting runs while the feature switch is disabled", function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(false);
    recordWaitingRun();

    const started = maybeObserveSkillRunnerAutoReplyRun({
      backend,
      requestId: "sr-auto-reply",
      source: "test",
    });

    assert.isFalse(started);
    assert.equal(
      getSkillRunnerAutoReplyObserverRuntimeForTests().inFlightCount,
      0,
    );
  });

  it("does not observe detached waiting runs", function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
    const run = recordWaitingRun("sr-detached-waiting");
    assert.isOk(run);
    recordSkillRunnerObserverFailure({
      runKey: run!.runKey,
      error: new Error("network detached"),
      source: "test",
    });

    const started = maybeObserveSkillRunnerAutoReplyRun({
      backend,
      requestId: "sr-detached-waiting",
      source: "test",
    });

    assert.isFalse(started);
    assert.equal(
      getSkillRunnerAutoReplyObserverRuntimeForTests().inFlightCount,
      0,
    );
  });

  it("hands a resumed auto-reply run to foreground continuation", async function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
    recordWaitingRun();
    const handoffs: string[] = [];
    setSkillRunnerAutoReplyObserverRuntimeForTests({
      intervalMs: 1_000_000,
      clientFactory: () => ({
        getRunState: async () => ({ status: "running" }),
      }),
      continuation: async ({ requestId }) => {
        handoffs.push(requestId);
        return { status: "succeeded", result: { status: "succeeded" } as any };
      },
    });

    const started = maybeObserveSkillRunnerAutoReplyRun({
      backend,
      requestId: "sr-auto-reply",
      source: "test",
    });
    assert.isTrue(started);

    await runSkillRunnerAutoReplyObserverTickForTests(
      "skillrunner-local:sr-auto-reply",
    );

    assert.deepEqual(handoffs, ["sr-auto-reply"]);
    assert.equal(
      getSkillRunnerAutoReplyObserverRuntimeForTests().inFlightCount,
      0,
    );
  });

  it("exposes active observer runtime state with a foreground countdown", function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
    recordWaitingRun("sr-countdown");
    const record = getSkillRunnerRunRecordByRequest({
      backendId: backend.id,
      requestId: "sr-countdown",
    });
    const requestPayload = record?.requestPayload as any;
    assert.isUndefined(requestPayload?.providerOptions);
    assert.equal(
      requestPayload?.runtime_options?.interactive_auto_reply,
      true,
    );
    assert.equal(
      requestPayload?.runtime_options?.interactive_reply_timeout_sec,
      30,
    );
    let notifications = 0;
    const unsubscribe = subscribeSkillRunnerAutoReplyObserverState(() => {
      notifications += 1;
    });
    setSkillRunnerAutoReplyObserverRuntimeForTests({
      intervalMs: 1_000_000,
      clientFactory: () => ({
        getRunState: async () => ({ status: "waiting_user" }),
      }),
    });

    maybeObserveSkillRunnerAutoReplyRun({
      backend,
      requestId: "sr-countdown",
      source: "workflowExecution.runSeam.job-waiting",
    });

    const state = getSkillRunnerAutoReplyObserverState({
      backendId: backend.id,
      requestId: "sr-countdown",
    });
    assert.equal(state?.enabled, true);
    assert.equal(state?.active, true);
    assert.equal(state?.source, "workflowExecution.runSeam.job-waiting");
    assert.equal(state?.showTimer, true);
    assert.equal(state?.timeoutSeconds, 30);
    assert.isAtLeast(state?.remainingSeconds || 0, 1);
    assert.isAtLeast(notifications, 1);
    unsubscribe();
  });

  it("hides countdown for recovery-started observers", function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
    recordWaitingRun("sr-recovery");
    setSkillRunnerAutoReplyObserverRuntimeForTests({
      intervalMs: 1_000_000,
      clientFactory: () => ({
        getRunState: async () => ({ status: "waiting_user" }),
      }),
    });

    maybeObserveSkillRunnerAutoReplyRun({
      backend,
      requestId: "sr-recovery",
      source: "recovery-waiting:startup",
    });

    const state = getSkillRunnerAutoReplyObserverState({
      backendId: backend.id,
      requestId: "sr-recovery",
    });
    assert.equal(state?.active, true);
    assert.equal(state?.showTimer, false);
    assert.isUndefined(state?.remainingSeconds);
  });

  it("stops observer on explicit reply success cleanup", function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
    recordWaitingRun("sr-reply-success");
    setSkillRunnerAutoReplyObserverRuntimeForTests({
      intervalMs: 1_000_000,
      clientFactory: () => ({
        getRunState: async () => ({ status: "waiting_user" }),
      }),
    });
    maybeObserveSkillRunnerAutoReplyRun({
      backend,
      requestId: "sr-reply-success",
      source: "test",
    });

    stopSkillRunnerAutoReplyObserver({
      backendId: backend.id,
      requestId: "sr-reply-success",
    });

    assert.equal(
      getSkillRunnerAutoReplyObserverRuntimeForTests().inFlightCount,
      0,
    );
  });

  it("stops observer when local run is terminal before the next tick", async function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
    recordWaitingRun("sr-local-terminal");
    let queries = 0;
    setSkillRunnerAutoReplyObserverRuntimeForTests({
      intervalMs: 1_000_000,
      clientFactory: () => ({
        getRunState: async () => {
          queries += 1;
          return { status: "waiting_user" };
        },
      }),
    });
    maybeObserveSkillRunnerAutoReplyRun({
      backend,
      requestId: "sr-local-terminal",
      source: "test",
    });
    updateSkillRunnerRunStateByRequest({
      backendId: backend.id,
      requestId: "sr-local-terminal",
      state: "succeeded",
      updatedAt: "2026-06-21T00:00:02.000Z",
    });

    await runSkillRunnerAutoReplyObserverTickForTests(
      "skillrunner-local:sr-local-terminal",
    );

    assert.equal(queries, 0);
    assert.equal(
      getSkillRunnerAutoReplyObserverRuntimeForTests().inFlightCount,
      0,
    );
  });

  it("stops observer when local run is archived before the next tick", async function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
    recordWaitingRun("sr-archived");
    setSkillRunnerAutoReplyObserverRuntimeForTests({
      intervalMs: 1_000_000,
      clientFactory: () => ({
        getRunState: async () => ({ status: "waiting_user" }),
      }),
    });
    maybeObserveSkillRunnerAutoReplyRun({
      backend,
      requestId: "sr-archived",
      source: "test",
    });
    archiveSkillRunnerRunRecordByRequest({
      backendId: backend.id,
      requestId: "sr-archived",
    });

    await runSkillRunnerAutoReplyObserverTickForTests(
      "skillrunner-local:sr-archived",
    );

    assert.equal(
      getSkillRunnerAutoReplyObserverRuntimeForTests().inFlightCount,
      0,
    );
  });

  it("stops observer when backend state query fails", async function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
    recordWaitingRun("sr-query-failed");
    setSkillRunnerAutoReplyObserverRuntimeForTests({
      intervalMs: 1_000_000,
      clientFactory: () => ({
        getRunState: async () => {
          throw new Error("network offline");
        },
      }),
    });
    maybeObserveSkillRunnerAutoReplyRun({
      backend,
      requestId: "sr-query-failed",
      source: "test",
    });

    await runSkillRunnerAutoReplyObserverTickForTests(
      "skillrunner-local:sr-query-failed",
    );

    assert.equal(
      getSkillRunnerAutoReplyObserverRuntimeForTests().inFlightCount,
      0,
    );
  });

  it("shutdown clears all observer timers", function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
    recordWaitingRun("sr-shutdown");
    setSkillRunnerAutoReplyObserverRuntimeForTests({
      intervalMs: 1_000_000,
      clientFactory: () => ({
        getRunState: async () => ({ status: "waiting_user" }),
      }),
    });
    maybeObserveSkillRunnerAutoReplyRun({
      backend,
      requestId: "sr-shutdown",
      source: "test",
    });

    shutdownSkillRunnerAutoReplyObserver();

    assert.equal(
      getSkillRunnerAutoReplyObserverRuntimeForTests().inFlightCount,
      0,
    );
  });

  it("preflights user reply and skips sending when backend already resumed", async function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
    recordWaitingRun("sr-preflight");
    const handoffs: string[] = [];
    setSkillRunnerAutoReplyObserverRuntimeForTests({
      clientFactory: () => ({
        getRunState: async () => ({ status: "succeeded" }),
      }),
      continuation: async ({ requestId }) => {
        handoffs.push(requestId);
        return { status: "succeeded", result: { status: "succeeded" } as any };
      },
    });

    const result = await guardSkillRunnerAutoReplyBeforeUserReply({
      backend,
      requestId: "sr-preflight",
      source: "test-preflight",
    });

    assert.equal(result.action, "handoff");
    assert.deepEqual(handoffs, ["sr-preflight"]);
  });

  it("keeps waiting state when late reply fails but backend is still waiting", async function () {
    setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
    recordWaitingRun("sr-still-waiting");
    setSkillRunnerAutoReplyObserverRuntimeForTests({
      clientFactory: () => ({
        getRunState: async () => ({ status: "waiting_user" }),
      }),
    });

    const result = await reconcileSkillRunnerAutoReplyAfterReplyError({
      backend,
      requestId: "sr-still-waiting",
      error: new SkillRunnerHttpError({
        message: "conflict",
        status: 409,
      }),
      source: "test-reply-error",
    });

    assert.equal(result.action, "still-waiting");
  });
});
