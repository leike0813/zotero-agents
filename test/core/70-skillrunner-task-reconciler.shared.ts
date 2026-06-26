import { assert } from "chai";
import { handlers } from "../../src/handlers";
import type { JobRecord, JobState } from "../../src/jobQueue/manager";
import {
  reconcileSkillRunnerBackendTaskLedgerOnce,
  reconcileSkillRunnerMissingContextOnce,
  setSkillRunnerBackendReconcileFailureToastEmitterForTests,
  setSkillRunnerTaskLifecycleToastEmitterForTests,
  mapSkillRunnerBackendStatusToJobState,
  SkillRunnerTaskReconciler,
} from "../../src/modules/skillRunnerTaskReconciler";
import {
  getSkillRunnerBackendHealthState,
  markSkillRunnerBackendHealthFailure,
  markSkillRunnerBackendHealthSuccess,
  resetSkillRunnerBackendHealthRegistryForTests,
} from "../../src/modules/skillRunnerBackendHealthRegistry";
import {
  resetWorkflowTasks,
  listWorkflowTasks,
} from "../../src/modules/taskRuntime";
import {
  listTaskDashboardHistory,
  resetTaskDashboardHistory,
} from "../../src/modules/taskDashboardHistory";
import {
  appendRuntimeLog,
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  attachSkillRunnerRequestId,
  createSkillRunnerRun,
  getSkillRunnerRunRecordByRequest,
  listSkillRunnerRunRecords,
  recordSkillRunnerObserverFailure,
  updateSkillRunnerRunApplyState,
  updateSkillRunnerRunStateByRequest,
  updateSkillRunnerRunStateByRunKey,
} from "../../src/modules/skillRunnerRunStore";
import { resetSkillRunnerSessionSyncForTests } from "../../src/modules/skillRunnerSessionSyncManager";
import { resetSkillRunnerForegroundContinuationForTests } from "../../src/modules/skillRunnerForegroundContinuation";
import {
  getSkillRunnerAutoReplyObserverRuntimeForTests,
  resetSkillRunnerAutoReplyObserverForTests,
} from "../../src/modules/skillRunnerAutoReplyObserver";
import { setSkillRunnerInteractiveAutoReplyEnabledForTests } from "../../src/modules/skillRunnerInteractiveAutoReply";
import {
  initializeSequenceRunState,
  recordSequenceStepRequestCreated,
} from "../../src/modules/workflowExecution/sequenceStateStore";
import { getPref, setPref } from "../../src/utils/prefs";
import { rescanWorkflowRegistry } from "../../src/modules/workflowRuntime";
import {
  joinPath,
  workflowsPath,
} from "../workflow-literature-explainer/workflow-test-utils";

const TEST_SKILLRUNNER_BACKEND_ID = "remote-skillrunner";
const TEST_SKILLRUNNER_BASE_URL = "http://127.0.0.1:8031";
const TEST_WORKFLOW_ID = "debug-apply-single-result";

function createJsonResponse(payload: unknown, status = 200): Response {
  const text = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "ERROR",
    text: async () => text,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  } as unknown as Response;
}

function makeJob(args: {
  id: string;
  requestId: string;
  state: JobState;
  runId?: string;
  workflowId?: string;
  backendBaseUrl?: string;
  targetParentID?: number;
  role?: "single" | "sequence_step";
  sequenceRunId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
}): JobRecord {
  return {
    id: args.id,
    workflowId: args.workflowId || TEST_WORKFLOW_ID,
    request: {
      kind: "skillrunner.job.v1",
      skill_id: "debug-apply-contract",
      targetParentID: args.targetParentID,
      fetch_type: "result",
      poll: {
        interval_ms: 1,
        timeout_ms: 1000,
      },
    },
    meta: {
      runId: args.runId || `run-${args.requestId}`,
      workflowRunId: args.sequenceRunId,
      workflowLabel: "Debug Apply Single Result",
      taskName: "debug task",
      providerId: "skillrunner",
      backendId: TEST_SKILLRUNNER_BACKEND_ID,
      backendType: "skillrunner",
      backendBaseUrl:
        typeof args.backendBaseUrl === "string"
          ? args.backendBaseUrl
          : TEST_SKILLRUNNER_BASE_URL,
      requestKind: "skillrunner.job.v1",
      requestId: args.requestId,
      skillId: "debug-apply-contract",
      targetParentID: args.targetParentID,
      sequenceStepId: args.sequenceStepId,
      sequenceStepIndex: args.sequenceStepIndex,
      sequenceJobId: args.sequenceRunId,
      skillRunnerRequestReady: true,
      skillRunnerLifecycleState: args.state,
      skillRunnerSubmitPhase: "request_ready",
    },
    state: args.state,
    result: {
      status: args.state === "succeeded" ? "succeeded" : "deferred",
      requestId: args.requestId,
      fetchType: "result",
      backendStatus: args.state,
    },
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:01.000Z",
  };
}

function persistRun(args: {
  requestId: string;
  state: JobState;
  applyState?:
    | "idle"
    | "pending"
    | "running"
    | "succeeded"
    | "failed"
    | "skipped";
  includeRequestPayload?: boolean;
  backendBaseUrl?: string;
  targetParentID?: number;
  role?: "single" | "sequence_step";
  sequenceRunId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  providerOptions?: Record<string, unknown>;
  executionMode?: string;
  requestPayload?: unknown;
}) {
  const job = makeJob({
    id: `job-${args.requestId}`,
    requestId: args.requestId,
    state: args.state,
    backendBaseUrl: args.backendBaseUrl,
    targetParentID: args.targetParentID,
    role: args.role,
    sequenceRunId: args.sequenceRunId,
    sequenceStepId: args.sequenceStepId,
    sequenceStepIndex: args.sequenceStepIndex,
  });
  const requestPayload =
    args.includeRequestPayload === false
      ? undefined
      : typeof args.requestPayload === "undefined"
        ? job.request
        : args.requestPayload;
  const run = createSkillRunnerRun({
    backendId: TEST_SKILLRUNNER_BACKEND_ID,
    workflowId: job.workflowId,
    workflowRunId:
      args.sequenceRunId || String(job.meta.runId || `run-${args.requestId}`),
    jobId: job.id,
    taskName: String(job.meta.taskName || job.id),
    skillId: String(job.meta.skillId || "") || undefined,
    sequenceRunId: args.sequenceRunId,
    sequenceJobId: args.sequenceRunId,
    sequenceStepId: args.sequenceStepId,
    requestPayload,
    fetchType: "result",
    executionMode:
      args.executionMode === "interactive" ? "interactive" : "auto",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
  if (!run) {
    return;
  }
  const attached =
    attachSkillRunnerRequestId({
      runKey: run.runKey,
      requestId: args.requestId,
      updatedAt: job.updatedAt,
    }) || run;
  updateSkillRunnerRunStateByRunKey({
    runKey: attached.runKey,
    state: "request_ready",
    backendStatus: "running",
    updatedAt: job.updatedAt,
  });
  updateSkillRunnerRunStateByRequest({
    backendId: TEST_SKILLRUNNER_BACKEND_ID,
    requestId: args.requestId,
    state: args.state,
    updatedAt: "2026-06-20T00:00:01.500Z",
    eventType: "backend.snapshot",
  });
  if (args.applyState && args.applyState !== "idle") {
    updateSkillRunnerRunApplyState({
      backendId: TEST_SKILLRUNNER_BACKEND_ID,
      requestId: args.requestId,
      state: args.applyState,
      attempt: 0,
      maxAttempt: 5,
      updatedAt: "2026-06-20T00:00:01.600Z",
    });
  }
}

function installFetchRouter(
  routes: Record<string, unknown | ((url: string) => unknown)>,
  counts: Record<string, number> = {},
) {
  (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
    const raw = String(url);
    for (const [fragment, payload] of Object.entries(routes)) {
      if (!raw.includes(fragment)) {
        continue;
      }
      counts[fragment] = (counts[fragment] || 0) + 1;
      const resolved = typeof payload === "function" ? payload(raw) : payload;
      return createJsonResponse(resolved);
    }
    return createJsonResponse({ error: `unexpected route: ${raw}` }, 404);
  };
}

function setupSkillRunnerTaskReconcilerSuite() {
  const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
  const trackedReconcilers: SkillRunnerTaskReconciler[] = [];
  let previousContentDevRootEnv: string | undefined;
  let previousSkillDirPref = "";

  function createTrackedReconciler() {
    const reconciler = new SkillRunnerTaskReconciler();
    trackedReconcilers.push(reconciler);
    return reconciler;
  }

  beforeEach(async function () {
    const processEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    previousContentDevRootEnv = processEnv?.ZOTERO_AGENTS_CONTENT_DEV_ROOT;
    previousSkillDirPref = String(getPref("skillDir") || "");
    if (processEnv) {
      processEnv.ZOTERO_AGENTS_CONTENT_DEV_ROOT = process.cwd();
    }
    setPref("skillDir", joinPath(process.cwd(), "skills_builtin"));
    setDebugModeOverrideForTests(true);
    setPref(
      "backendsConfigJson",
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: TEST_SKILLRUNNER_BACKEND_ID,
            type: "skillrunner",
            baseUrl: TEST_SKILLRUNNER_BASE_URL,
            auth: { kind: "none" },
          },
        ],
      }),
    );
    resetPluginStateStoreForTests();
    resetWorkflowTasks();
    resetTaskDashboardHistory();
    clearRuntimeLogs();
    resetSkillRunnerBackendHealthRegistryForTests();
    resetSkillRunnerForegroundContinuationForTests();
    resetSkillRunnerAutoReplyObserverForTests();
    setSkillRunnerInteractiveAutoReplyEnabledForTests();
    await resetSkillRunnerSessionSyncForTests();
    setSkillRunnerBackendReconcileFailureToastEmitterForTests();
    setSkillRunnerTaskLifecycleToastEmitterForTests();
    await rescanWorkflowRegistry({ workflowsDir: workflowsPath() });
  });

  afterEach(async function () {
    for (const reconciler of trackedReconcilers.splice(0)) {
      await reconciler.resetForTests();
    }
    (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
    resetPluginStateStoreForTests();
    resetWorkflowTasks();
    resetTaskDashboardHistory();
    clearRuntimeLogs();
    resetSkillRunnerBackendHealthRegistryForTests();
    resetSkillRunnerForegroundContinuationForTests();
    resetSkillRunnerAutoReplyObserverForTests();
    setSkillRunnerInteractiveAutoReplyEnabledForTests();
    await resetSkillRunnerSessionSyncForTests();
    setSkillRunnerBackendReconcileFailureToastEmitterForTests();
    setSkillRunnerTaskLifecycleToastEmitterForTests();
    setPref("skillDir", previousSkillDirPref);
    setDebugModeOverrideForTests();
    const processEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    if (processEnv) {
      if (previousContentDevRootEnv === undefined) {
        delete processEnv.ZOTERO_AGENTS_CONTENT_DEV_ROOT;
      } else {
        processEnv.ZOTERO_AGENTS_CONTENT_DEV_ROOT = previousContentDevRootEnv;
      }
    }
  });

  return { createTrackedReconciler };
}

export function registerSkillRunnerTaskReconcilerStateRestoreTests() {
  describe("skillrunner recovery coordinator: state restore", function () {
    this.timeout(15000);
    const { createTrackedReconciler } = setupSkillRunnerTaskReconcilerSuite();

    it("maps backend statuses to canonical job states", function () {
      assert.equal(
        mapSkillRunnerBackendStatusToJobState("waiting_auth"),
        "waiting_auth",
      );
      assert.equal(mapSkillRunnerBackendStatusToJobState("unknown"), "running");
    });

    it("restores waiting runs without polling backend jobs", async function () {
      const counts: Record<string, number> = {};
      installFetchRouter(
        {
          "/v1/jobs/req-waiting": {
            request_id: "req-waiting",
            status: "succeeded",
          },
        },
        counts,
      );
      persistRun({
        requestId: "req-waiting",
        state: "waiting_user",
        executionMode: "interactive",
      });

      const reconciler = createTrackedReconciler();
      reconciler.start();
      markSkillRunnerBackendHealthFailure({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        error: new Error("offline"),
      });
      markSkillRunnerBackendHealthSuccess(TEST_SKILLRUNNER_BACKEND_ID);
      await reconciler.drain();

      const tasks = listWorkflowTasks();
      assert.equal(counts["/v1/jobs/req-waiting"] || 0, 0);
      assert.equal(tasks[0]?.state, "waiting_user");
      assert.equal(tasks[0]?.canReply, true);
    });

    it("hands running recovery runs to foreground continuation once", async function () {
      const counts: Record<string, number> = {};
      installFetchRouter(
        {
          "/v1/jobs/req-running": {
            request_id: "req-running",
            status: "waiting_user",
          },
        },
        counts,
      );
      persistRun({
        requestId: "req-running",
        state: "running",
        includeRequestPayload: false,
      });

      const reconciler = createTrackedReconciler();
      reconciler.start();
      markSkillRunnerBackendHealthFailure({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        error: new Error("offline"),
      });
      markSkillRunnerBackendHealthSuccess(TEST_SKILLRUNNER_BACKEND_ID);
      await reconciler.drain();

      const stored = getSkillRunnerRunRecordByRequest({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        requestId: "req-running",
      });
      assert.equal(counts["/v1/jobs/req-running"], 1);
      assert.equal(stored?.status, "waiting_user");
      assert.isFalse(
        listRuntimeLogs().some((entry) =>
          JSON.stringify(entry.details || {}).includes(
            "missing-request-payload",
          ),
        ),
      );
      assert.isFalse(
        listRuntimeLogs().some((entry) =>
          String(entry.stage || "").startsWith("recovery-owned-terminal-"),
        ),
      );
    });

    it("hands off detached running observer failures once and clears detached on success", async function () {
      const counts: Record<string, number> = {};
      installFetchRouter(
        {
          "/v1/jobs/req-detached-running": {
            request_id: "req-detached-running",
            status: "waiting_user",
          },
        },
        counts,
      );
      persistRun({
        requestId: "req-detached-running",
        state: "running",
        includeRequestPayload: false,
      });
      const before = getSkillRunnerRunRecordByRequest({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        requestId: "req-detached-running",
      });
      assert.isOk(before);
      recordSkillRunnerObserverFailure({
        runKey: before!.runKey,
        error: new Error("network detached"),
        source: "test",
        updatedAt: "2026-06-20T00:00:02.000Z",
      });

      await reconcileSkillRunnerMissingContextOnce({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        source: "startup",
      });

      const stored = getSkillRunnerRunRecordByRequest({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        requestId: "req-detached-running",
      });
      assert.equal(counts["/v1/jobs/req-detached-running"], 1);
      assert.equal(stored?.status, "waiting_user");
      assert.equal(stored?.observerState, "attached");
    });

    it("backs off detached handoff after a recoverable observer failure", async function () {
      const counts: Record<string, number> = {};
      installFetchRouter(
        {
          "/v1/jobs/req-detached-retry": () => {
            throw new Error("poll timeout");
          },
        },
        counts,
      );
      persistRun({
        requestId: "req-detached-retry",
        state: "running",
        includeRequestPayload: false,
      });
      const before = getSkillRunnerRunRecordByRequest({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        requestId: "req-detached-retry",
      });
      assert.isOk(before);
      recordSkillRunnerObserverFailure({
        runKey: before!.runKey,
        error: new Error("network detached"),
        source: "test",
        updatedAt: "2026-06-20T00:00:02.000Z",
      });

      await reconcileSkillRunnerMissingContextOnce({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        source: "startup",
      });
      await reconcileSkillRunnerMissingContextOnce({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        source: "backend-healthy",
      });

      const stored = getSkillRunnerRunRecordByRequest({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        requestId: "req-detached-retry",
      });
      assert.equal(counts["/v1/jobs/req-detached-retry"], 1);
      assert.equal(stored?.status, "running");
      assert.equal(stored?.observerState, "detached");
      assert.isTrue(
        listRuntimeLogs().some(
          (entry) =>
            entry.stage === "recovery-waiting-detached" &&
            (entry.details as { reason?: string } | undefined)?.reason ===
              "observer-detached-backoff",
        ),
      );
    });

    it("ignores stale persisted backend base urls during recovery", async function () {
      const counts: Record<string, number> = {};
      installFetchRouter(
        {
          "/v1/jobs/req-missing-backend": {
            request_id: "req-missing-backend",
            status: "succeeded",
          },
        },
        counts,
      );
      persistRun({
        requestId: "req-missing-backend",
        state: "running",
        backendBaseUrl: "",
      });

      await reconcileSkillRunnerMissingContextOnce({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        source: "startup",
      });

      const tasks = listWorkflowTasks();
      assert.isAtLeast(counts["/v1/jobs/req-missing-backend"] || 0, 1);
      assert.notEqual(tasks[0]?.state, "failed");
      assert.notInclude(tasks[0]?.error || "", "missing-backend-base-url");
      assert.isFalse(
        listRuntimeLogs().some(
          (entry) => entry.stage === "terminal-succeeded-missing-context",
        ),
      );
    });
  });
}

export function registerSkillRunnerTaskReconcilerForegroundHandoffTests() {
  describe("skillrunner recovery coordinator: foreground handoff", function () {
    this.timeout(15000);
    const { createTrackedReconciler } = setupSkillRunnerTaskReconcilerSuite();

    it("applies recovered terminal success through foreground continuation", async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Recovered Foreground Parent" },
      });
      const counts: Record<string, number> = {};
      installFetchRouter(
        {
          "/v1/jobs/req-terminal-success/result": {
            data: {
              apply_mode: "result",
              workflow_id: TEST_WORKFLOW_ID,
              run_key: "recovered",
              tag: "recovered-terminal-success",
            },
          },
          "/v1/jobs/req-terminal-success": {
            request_id: "req-terminal-success",
            status: "succeeded",
          },
        },
        counts,
      );
      persistRun({
        requestId: "req-terminal-success",
        state: "succeeded",
        applyState: "idle",
        targetParentID: parent.id,
      });

      await reconcileSkillRunnerMissingContextOnce({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        source: "startup",
      });

      const stored = getSkillRunnerRunRecordByRequest({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        requestId: "req-terminal-success",
      });
      assert.equal(counts["/v1/jobs/req-terminal-success"], 1);
      assert.equal(counts["/v1/jobs/req-terminal-success/result"], 1);
      assert.equal(stored?.status, "succeeded");
      assert.equal(stored?.apply.state, "succeeded");
      assert.isFalse(
        listRuntimeLogs().some((entry) =>
          /^(recovery-owned-terminal-|deferred-apply-)/.test(
            String(entry.stage || ""),
          ),
        ),
      );
    });

    it("does not retry ambiguous crashed apply states", async function () {
      const counts: Record<string, number> = {};
      installFetchRouter(
        {
          "/v1/jobs/req-apply-running": {
            request_id: "req-apply-running",
            status: "succeeded",
          },
        },
        counts,
      );
      persistRun({
        requestId: "req-apply-running",
        state: "succeeded",
        applyState: "running",
      });

      await reconcileSkillRunnerMissingContextOnce({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        source: "startup",
      });

      const stored = getSkillRunnerRunRecordByRequest({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        requestId: "req-apply-running",
      });
      assert.equal(counts["/v1/jobs/req-apply-running"] || 0, 0);
      assert.equal(stored?.status, "failed");
      assert.include(stored?.error || "", "unrecoverable-apply-running");
    });

    it("fires backend-healthy recovery handoff once for flagged backends", async function () {
      const counts: Record<string, number> = {};
      installFetchRouter(
        {
          "/v1/jobs/req-backend-healthy": {
            request_id: "req-backend-healthy",
            status: "waiting_user",
          },
        },
        counts,
      );
      const reconciler = createTrackedReconciler();
      reconciler.start();
      await reconciler.drain();
      persistRun({
        requestId: "req-backend-healthy",
        state: "running",
      });
      markSkillRunnerBackendHealthFailure({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        error: new Error("offline"),
      });
      markSkillRunnerBackendHealthFailure({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        error: new Error("offline"),
      });

      markSkillRunnerBackendHealthSuccess(TEST_SKILLRUNNER_BACKEND_ID);
      await reconciler.drain();

      assert.equal(counts["/v1/jobs/req-backend-healthy"], 1);
    });

    it("starts auto-reply observer when recovery restores an enabled waiting run", async function () {
      setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
      installFetchRouter({
        "/v1/jobs/req-auto-reply-waiting": {
          request_id: "req-auto-reply-waiting",
          status: "waiting_user",
        },
      });
      persistRun({
        requestId: "req-auto-reply-waiting",
        state: "running",
        executionMode: "interactive",
        requestPayload: {
          ...makeJob({
            id: "job-req-auto-reply-waiting",
            requestId: "req-auto-reply-waiting",
            state: "running",
          }).request,
          runtime_options: {
            execution_mode: "interactive",
            interactive_auto_reply: true,
          },
        },
      });

      await reconcileSkillRunnerMissingContextOnce({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        source: "startup",
      });

      assert.equal(
        getSkillRunnerAutoReplyObserverRuntimeForTests().inFlightCount,
        1,
      );
    });

    it("does not start auto-reply observer for detached waiting runs", async function () {
      setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
      installFetchRouter({
        "/v1/jobs/req-detached-waiting": {
          request_id: "req-detached-waiting",
          status: "waiting_user",
        },
      });
      persistRun({
        requestId: "req-detached-waiting",
        state: "waiting_user",
        executionMode: "interactive",
        requestPayload: {
          ...makeJob({
            id: "job-req-detached-waiting",
            requestId: "req-detached-waiting",
            state: "waiting_user",
          }).request,
          runtime_options: {
            execution_mode: "interactive",
            interactive_auto_reply: true,
          },
        },
      });
      const before = getSkillRunnerRunRecordByRequest({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        requestId: "req-detached-waiting",
      });
      assert.isOk(before);
      recordSkillRunnerObserverFailure({
        runKey: before!.runKey,
        error: new Error("network detached"),
        source: "test",
        updatedAt: "2026-06-20T00:00:02.000Z",
      });

      await reconcileSkillRunnerMissingContextOnce({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        source: "startup",
      });

      assert.equal(
        getSkillRunnerAutoReplyObserverRuntimeForTests().inFlightCount,
        0,
      );
    });

    it("dedupes backend-healthy sweeps while a sweep is still in flight", async function () {
      const counts: Record<string, number> = {};
      let releaseJob!: () => void;
      let jobEntered!: () => void;
      const jobGate = new Promise<void>((resolve) => {
        releaseJob = resolve;
      });
      const jobStarted = new Promise<void>((resolve) => {
        jobEntered = resolve;
      });
      (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
        const raw = String(url);
        if (raw.includes("/v1/jobs/req-backend-dedupe")) {
          counts.job = (counts.job || 0) + 1;
          jobEntered();
          await jobGate;
          return createJsonResponse({
            request_id: "req-backend-dedupe",
            status: "waiting_user",
          });
        }
        return createJsonResponse({ error: `unexpected route: ${raw}` }, 404);
      };
      const reconciler = createTrackedReconciler();
      reconciler.start();
      await reconciler.drain();
      persistRun({
        requestId: "req-backend-dedupe",
        state: "running",
        applyState: "idle",
      });

      markSkillRunnerBackendHealthFailure({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        error: new Error("offline"),
      });
      markSkillRunnerBackendHealthFailure({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        error: new Error("offline"),
      });
      markSkillRunnerBackendHealthSuccess(TEST_SKILLRUNNER_BACKEND_ID);
      await jobStarted;
      markSkillRunnerBackendHealthFailure({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        error: new Error("offline again"),
      });
      markSkillRunnerBackendHealthFailure({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        error: new Error("offline again"),
      });
      markSkillRunnerBackendHealthSuccess(TEST_SKILLRUNNER_BACKEND_ID);

      releaseJob();
      await reconciler.drain();

      assert.equal(counts.job, 1);
      assert.equal(
        listRuntimeLogs().filter(
          (entry) =>
            entry.stage === "recovery-sweep-finished" &&
            entry.phase === "backend-healthy",
        ).length,
        1,
      );
    });
  });
}

export function registerSkillRunnerTaskReconcilerLedgerReconcileTests() {
  describe("skillrunner recovery coordinator: ledger reconcile", function () {
    this.timeout(15000);
    setupSkillRunnerTaskReconcilerSuite();

    it("registers backend health tracking even when task ledger is empty", async function () {
      const result = await reconcileSkillRunnerBackendTaskLedgerOnce({
        backend: {
          id: TEST_SKILLRUNNER_BACKEND_ID,
          type: "skillrunner",
          baseUrl: TEST_SKILLRUNNER_BASE_URL,
          auth: { kind: "none" },
        },
        source: "startup",
      });

      assert.isTrue(result.ok);
      assert.equal(result.stage, "backend-task-ledger-reconcile-empty");
      assert.isOk(
        getSkillRunnerBackendHealthState(TEST_SKILLRUNNER_BACKEND_ID),
      );
    });

    it("emits ledger reconcile failure toasts with backend display identity", async function () {
      const toasts: Array<{
        backendId: string;
        displayName: string;
        text: string;
        dedupKey?: string;
      }> = [];
      setSkillRunnerBackendReconcileFailureToastEmitterForTests((payload) => {
        toasts.push(payload);
      });
      persistRun({
        requestId: "req-ledger-toast-failure",
        state: "running",
      });
      installFetchRouter({
        "/v1/jobs/req-ledger-toast-failure": () => {
          throw new Error("network offline");
        },
      });

      const result = await reconcileSkillRunnerBackendTaskLedgerOnce({
        backend: {
          id: TEST_SKILLRUNNER_BACKEND_ID,
          displayName: "Remote Runner",
          type: "skillrunner",
          baseUrl: TEST_SKILLRUNNER_BASE_URL,
          auth: { kind: "none" },
        },
        source: "startup",
      });

      assert.equal(result.ok, false);
      assert.lengthOf(toasts, 1);
      assert.equal(toasts[0].backendId, TEST_SKILLRUNNER_BACKEND_ID);
      assert.equal(toasts[0].displayName, "Remote Runner");
      assert.include(toasts[0].text, "Remote Runner");
      assert.include(toasts[0].dedupKey || "", TEST_SKILLRUNNER_BACKEND_ID);
    });

    it("suppresses ledger reconcile failure toasts for the managed local backend", async function () {
      const toasts: unknown[] = [];
      setSkillRunnerBackendReconcileFailureToastEmitterForTests((payload) => {
        toasts.push(payload);
      });
      const requestId = "req-local-ledger-toast-failure";
      const job = makeJob({
        id: `job-${requestId}`,
        requestId,
        state: "running",
      });
      const run = createSkillRunnerRun({
        backendId: "local-skillrunner-backend",
        workflowId: job.workflowId,
        workflowRunId: `run-${requestId}`,
        jobId: job.id,
        taskName: "debug task",
        skillId: "debug-apply-contract",
        requestPayload: job.request,
        fetchType: "result",
        executionMode: "auto",
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      });
      assert.isOk(run);
      attachSkillRunnerRequestId({
        runKey: run!.runKey,
        requestId,
        backendRequestId: requestId,
      });
      updateSkillRunnerRunStateByRequest({
        backendId: "local-skillrunner-backend",
        requestId,
        state: "running",
        updatedAt: "2026-06-20T00:00:01.500Z",
        eventType: "backend.snapshot",
      });
      installFetchRouter({
        [`/v1/jobs/${requestId}`]: () => {
          throw new Error("local runtime offline");
        },
      });

      const result = await reconcileSkillRunnerBackendTaskLedgerOnce({
        backend: {
          id: "local-skillrunner-backend",
          displayName: "Local Backend",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:29813",
          auth: { kind: "none" },
        },
        source: "startup",
      });

      assert.equal(result.ok, false);
      assert.lengthOf(toasts, 0);
    });

    it("keeps backend task ledger reconcile as one-shot terminal state repair", async function () {
      const counts: Record<string, number> = {};
      installFetchRouter(
        {
          "/v1/jobs/req-ledger-terminal": {
            request_id: "req-ledger-terminal",
            status: "failed",
            error: "backend failed",
          },
        },
        counts,
      );
      persistRun({
        requestId: "req-ledger-terminal",
        state: "running",
      });

      const result = await reconcileSkillRunnerBackendTaskLedgerOnce({
        backend: {
          id: TEST_SKILLRUNNER_BACKEND_ID,
          type: "skillrunner",
          baseUrl: TEST_SKILLRUNNER_BASE_URL,
          auth: { kind: "none" },
        },
        source: "startup",
        emitFailureToast: false,
      });

      const tasks = listWorkflowTasks();
      assert.equal(result.ok, true);
      assert.equal(counts["/v1/jobs/req-ledger-terminal"], 2);
      assert.equal(tasks[0]?.state, "failed");
      assert.equal(listTaskDashboardHistory()[0]?.state, "failed");
    });

    it("fails sequence step recovery when sequence state is unavailable", async function () {
      persistRun({
        requestId: "req-sequence-missing-state",
        state: "running",
        role: "sequence_step",
        sequenceRunId: "sequence-missing-state",
        sequenceStepId: "step-one",
        sequenceStepIndex: 0,
      });

      await reconcileSkillRunnerMissingContextOnce({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        source: "startup",
      });

      const stored = getSkillRunnerRunRecordByRequest({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        requestId: "req-sequence-missing-state",
      });
      assert.equal(stored?.status, "failed");
      assert.include(stored?.error || "", "missing-sequence-state");
    });

    it("hands sequence step recovery to foreground when sequence state exists", async function () {
      const counts: Record<string, number> = {};
      installFetchRouter(
        {
          "/v1/jobs/req-sequence-waiting": {
            request_id: "req-sequence-waiting",
            status: "waiting_user",
          },
        },
        counts,
      );
      initializeSequenceRunState({
        request: {
          kind: "skillrunner.sequence.v1",
          steps: [
            {
              id: "step-one",
              skill_id: "debug-apply-contract",
            },
          ],
          final_step_id: "step-one",
        } as any,
        backend: {
          id: TEST_SKILLRUNNER_BACKEND_ID,
          type: "skillrunner",
          baseUrl: TEST_SKILLRUNNER_BASE_URL,
          auth: { kind: "none" },
        },
        providerOptions: {},
        workflowId: TEST_WORKFLOW_ID,
        workflowLabel: "Debug Apply Single Result",
        workflowRunId: "sequence-existing-state",
        jobId: "sequence-existing-state",
      });
      recordSequenceStepRequestCreated({
        sequenceRunId: "sequence-existing-state",
        stepIndex: 0,
        requestId: "req-sequence-waiting",
      });
      persistRun({
        requestId: "req-sequence-waiting",
        state: "running",
        includeRequestPayload: false,
        role: "sequence_step",
        sequenceRunId: "sequence-existing-state",
        sequenceStepId: "step-one",
        sequenceStepIndex: 0,
      });

      await reconcileSkillRunnerMissingContextOnce({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
        source: "startup",
      });

      const stored = listSkillRunnerRunRecords({
        backendId: TEST_SKILLRUNNER_BACKEND_ID,
      }).find((record) => record.sequenceStepId === "step-one");
      assert.equal(counts["/v1/jobs/req-sequence-waiting"], 1);
      assert.equal(stored?.status, "waiting_user");
    });
  });
}
