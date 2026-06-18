import { assert } from "chai";
import { handlers } from "../../src/handlers";
import type { JobRecord } from "../../src/jobQueue/manager";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import {
  reconcileSkillRunnerBackendTaskLedgerOnce,
  setSkillRunnerBackendReconcileFailureToastEmitterForTests,
  setSkillRunnerTaskLifecycleToastEmitterForTests,
  mapSkillRunnerBackendStatusToJobState,
  SkillRunnerTaskReconciler,
} from "../../src/modules/skillRunnerTaskReconciler";
import {
  getSkillRunnerBackendHealthState,
  resetSkillRunnerBackendHealthRegistryForTests,
} from "../../src/modules/skillRunnerBackendHealthRegistry";
import {
  registerDeferredWorkflowCompletion,
  resetDeferredWorkflowCompletionTrackerForTests,
  setDeferredWorkflowCompletionTrackerDepsForTests,
} from "../../src/modules/workflowExecution/deferredCompletionTracker";
import {
  getAcpSkillRunRecord,
  resetAcpSkillRunsForTests,
} from "../../src/modules/acpSkillRunStore";
import {
  getSequenceRunState,
  initializeSequenceRunState,
  recordSequenceStepRequestCreated,
} from "../../src/modules/workflowExecution/sequenceStateStore";
import {
  resetWorkflowTasks,
  listWorkflowTasks,
  recordWorkflowTaskUpdate,
} from "../../src/modules/taskRuntime";
import {
  getSkillRunnerSessionSyncRuntimeForTests,
  resetSkillRunnerSessionSyncForTests,
} from "../../src/modules/skillRunnerSessionSyncManager";
import {
  listTaskDashboardHistory,
  recordTaskDashboardHistoryFromJob,
} from "../../src/modules/taskDashboardHistory";
import { clearRuntimeLogs, listRuntimeLogs } from "../../src/modules/runtimeLogManager";
import {
  PLUGIN_TASK_DOMAIN_SKILLRUNNER,
  listPluginTaskContextEntries,
  replacePluginTaskContextEntries,
  resetPluginStateStoreForTests,
  upsertPluginTaskContextEntry,
} from "../../src/modules/pluginStateStore";
import { getPref, setPref } from "../../src/utils/prefs";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { rescanWorkflowRegistry } from "../../src/modules/workflowRuntime";
import { isFullTestMode } from "../zotero/testMode";
import {
  joinPath,
  mkTempDir,
  workflowsPath,
  writeUtf8,
} from "../workflow-literature-explainer/workflow-test-utils";

const TEST_SKILLRUNNER_BACKEND_ID = "remote-skillrunner";
const TEST_SKILLRUNNER_BASE_URL = "http://127.0.0.1:8031";
const itFullOnly = isFullTestMode() ? it : it.skip;

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

function createBinaryResponse(payload: Uint8Array, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "ERROR",
    text: async () => "",
    arrayBuffer: async () =>
      payload.buffer.slice(
        payload.byteOffset,
        payload.byteOffset + payload.byteLength,
      ),
  } as unknown as Response;
}

function concatBytes(chunks: Uint8Array[]) {
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function writeUint16LE(value: number, out: number[]) {
  out.push(value & 0xff, (value >> 8) & 0xff);
}

function writeUint32LE(value: number, out: number[]) {
  out.push(
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff,
  );
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function utf8Bytes(input: string) {
  return new TextEncoder().encode(input);
}

async function getLiteratureExplainerWorkflow() {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "literature-explainer",
  );
  assert.isOk(
    workflow,
    `workflow literature-explainer not found; loaded=${loaded.workflows.map((entry) => entry.manifest.id).join(",")}`,
  );
  return workflow!;
}

function createZipFromNamedFiles(entries: Array<{ name: string; data: Uint8Array }>) {
  const ZIP_UTF8_FILENAME_FLAG = 0x0800;
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = utf8Bytes(entry.name);
    const crc = crc32(entry.data);
    const localHeader: number[] = [];
    writeUint32LE(0x04034b50, localHeader);
    writeUint16LE(20, localHeader);
    writeUint16LE(ZIP_UTF8_FILENAME_FLAG, localHeader);
    writeUint16LE(0, localHeader);
    writeUint16LE(0, localHeader);
    writeUint16LE(0, localHeader);
    writeUint32LE(crc, localHeader);
    writeUint32LE(entry.data.length, localHeader);
    writeUint32LE(entry.data.length, localHeader);
    writeUint16LE(nameBytes.length, localHeader);
    writeUint16LE(0, localHeader);
    const localBlock = concatBytes([
      new Uint8Array(localHeader),
      nameBytes,
      entry.data,
    ]);
    localChunks.push(localBlock);

    const centralHeader: number[] = [];
    writeUint32LE(0x02014b50, centralHeader);
    writeUint16LE(20, centralHeader);
    writeUint16LE(20, centralHeader);
    writeUint16LE(ZIP_UTF8_FILENAME_FLAG, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint32LE(crc, centralHeader);
    writeUint32LE(entry.data.length, centralHeader);
    writeUint32LE(entry.data.length, centralHeader);
    writeUint16LE(nameBytes.length, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint32LE(0, centralHeader);
    writeUint32LE(offset, centralHeader);
    centralChunks.push(concatBytes([new Uint8Array(centralHeader), nameBytes]));
    offset += localBlock.length;
  }
  const localData = concatBytes(localChunks);
  const centralData = concatBytes(centralChunks);
  const eocd: number[] = [];
  writeUint32LE(0x06054b50, eocd);
  writeUint16LE(0, eocd);
  writeUint16LE(0, eocd);
  writeUint16LE(entries.length, eocd);
  writeUint16LE(entries.length, eocd);
  writeUint32LE(centralData.length, eocd);
  writeUint32LE(localData.length, eocd);
  writeUint16LE(0, eocd);
  return concatBytes([localData, centralData, new Uint8Array(eocd)]);
}

function isListRunsProbeUrl(url: string) {
  return /\/v1\/system\/ping(?:\?|$)/.test(String(url || ""));
}

function makeDeferredJob(args?: {
  id?: string;
  requestId?: string;
  runId?: string;
  state?: JobRecord["state"];
  fetchType?: "bundle" | "result";
  targetParentID?: number | null;
}): JobRecord {
  const jobId = args?.id || "job-1";
  const requestId = args?.requestId || "req-1";
  const runId = args?.runId || "run-1";
  const state = args?.state || "waiting_user";
  const fetchType = args?.fetchType || "bundle";
  const targetParentID =
    typeof args?.targetParentID === "number"
      ? args.targetParentID
      : args?.targetParentID === null
        ? null
        : 123;
  return {
    id: jobId,
    workflowId: "literature-explainer",
    request:
      typeof targetParentID === "number" ? { targetParentID } : {},
    meta: {
      runId,
      taskName: "paper.md",
      workflowLabel: "Literature Explainer",
      requestId,
      backendId: TEST_SKILLRUNNER_BACKEND_ID,
      backendType: "skillrunner",
      backendBaseUrl: TEST_SKILLRUNNER_BASE_URL,
      providerId: "skillrunner",
      ...(typeof targetParentID === "number" ? { targetParentID } : {}),
    },
    state,
    createdAt: "2026-03-12T00:00:00.000Z",
    updatedAt: "2026-03-12T00:00:01.000Z",
    result: {
      status: "deferred",
      requestId,
      fetchType,
      backendStatus: state,
    },
  };
}

function makeDashboardJob(args: {
  id: string;
  runId: string;
  requestId: string;
  state: JobRecord["state"];
  backendId: string;
  backendBaseUrl: string;
  workflowId?: string;
}) {
  return {
    id: args.id,
    workflowId: args.workflowId || "literature-explainer",
    request: { targetParentID: 123 },
    meta: {
      runId: args.runId,
      taskName: args.id,
      workflowLabel: "Literature Explainer",
      requestId: args.requestId,
      backendId: args.backendId,
      backendType: "skillrunner",
      backendBaseUrl: args.backendBaseUrl,
      providerId: "skillrunner",
      targetParentID: 123,
    },
    state: args.state,
    createdAt: "2026-03-12T00:00:00.000Z",
    updatedAt: "2026-03-12T00:00:01.000Z",
    result: {
      requestId: args.requestId,
    },
  } as JobRecord;
}

function forceApplyRetryDueNow(reconciler: SkillRunnerTaskReconciler) {
  const runtime = reconciler as unknown as {
    contexts?: Map<string, Record<string, unknown>>;
  };
  for (const context of runtime.contexts?.values?.() || []) {
    context.nextApplyRetryAt = "1970-01-01T00:00:00.000Z";
  }
  const persisted = listPluginTaskContextEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER);
  replacePluginTaskContextEntries(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    persisted.map((entry) => {
      let payload = {} as Record<string, unknown>;
      try {
        payload = JSON.parse(String(entry.payload || "{}")) as Record<string, unknown>;
      } catch {
        payload = {};
      }
      payload.nextApplyRetryAt = "1970-01-01T00:00:00.000Z";
      return {
        contextId: entry.contextId,
        requestId: entry.requestId,
        backendId: entry.backendId,
        state: entry.state,
        updatedAt: new Date().toISOString(),
        payload: JSON.stringify(payload),
      };
    }),
  );
}

function setupSkillRunnerTaskReconcilerSuite() {
  const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
  const trackedReconcilers: SkillRunnerTaskReconciler[] = [];

  function createTrackedReconciler() {
    const reconciler = new SkillRunnerTaskReconciler();
    trackedReconcilers.push(reconciler);
    return reconciler;
  }

  beforeEach(function () {
    setPref("skillRunnerRequestLedgerJson", "");
    setPref("skillRunnerDeferredTasksJson", "");
    setPref("taskDashboardHistoryJson", "");
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
    clearRuntimeLogs();
    resetSkillRunnerBackendHealthRegistryForTests();
    resetDeferredWorkflowCompletionTrackerForTests();
    resetAcpSkillRunsForTests();
    setDeferredWorkflowCompletionTrackerDepsForTests({
      emitWorkflowJobToasts: () => undefined,
      emitWorkflowFinishSummary: () => undefined,
      appendRuntimeLog: () => undefined,
    });
  });

  afterEach(async function () {
    for (const reconciler of trackedReconcilers.splice(0)) {
      await reconciler.resetForTests();
    }
    (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
    setPref("skillRunnerRequestLedgerJson", "");
    setPref("skillRunnerDeferredTasksJson", "");
    setPref("taskDashboardHistoryJson", "");
    resetPluginStateStoreForTests();
    resetWorkflowTasks();
    clearRuntimeLogs();
    resetSkillRunnerBackendHealthRegistryForTests();
    resetDeferredWorkflowCompletionTrackerForTests();
    resetAcpSkillRunsForTests();
    setDeferredWorkflowCompletionTrackerDepsForTests();
    setSkillRunnerBackendReconcileFailureToastEmitterForTests();
    setSkillRunnerTaskLifecycleToastEmitterForTests();
    await resetSkillRunnerSessionSyncForTests();
  });

  return { createTrackedReconciler };
}

export function registerSkillRunnerTaskReconcilerStateRestoreTests() {
  describe("skillrunner task reconciler: state restore", function () {
    const { createTrackedReconciler } = setupSkillRunnerTaskReconcilerSuite();

  it("maps backend status to local job state one-to-one", function () {
    assert.equal(mapSkillRunnerBackendStatusToJobState("queued"), "queued");
    assert.equal(mapSkillRunnerBackendStatusToJobState("running"), "running");
    assert.equal(
      mapSkillRunnerBackendStatusToJobState("waiting_user"),
      "waiting_user",
    );
    assert.equal(
      mapSkillRunnerBackendStatusToJobState("waiting_auth"),
      "waiting_auth",
    );
    assert.equal(mapSkillRunnerBackendStatusToJobState("succeeded"), "succeeded");
    assert.equal(mapSkillRunnerBackendStatusToJobState("failed"), "failed");
    assert.equal(mapSkillRunnerBackendStatusToJobState("canceled"), "canceled");
    assert.equal(
      mapSkillRunnerBackendStatusToJobState("unknown-status", "running"),
      "running",
    );
  });

  it("registers deferred task and clears persisted record after terminal reconcile", async function () {
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-1")) {
        return createJsonResponse({
          request_id: "req-1",
          status: "failed",
          error: "mock terminal failure",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Deferred Apply Retry Success Parent" },
    });
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: parent.id,
        runtime_options: {
          execution_mode: "interactive",
        },
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob(),
    });

    const persistedBefore = listPluginTaskContextEntries(
      PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    );
    assert.isTrue(
      persistedBefore.some((entry) => entry.requestId === "req-1"),
    );

    await reconciler.reconcilePending();

    const persistedAfter = listPluginTaskContextEntries(
      PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    );
    assert.lengthOf(persistedAfter, 0);
    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].state, "failed");
    assert.equal(tasks[0].requestId, "req-1");
  });

  it("restores pending contexts from sqlite store on start", async function () {
    const record = {
      id: `${TEST_SKILLRUNNER_BACKEND_ID}:req-restore-1`,
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: { kind: "skillrunner.job.v1", targetParentID: 123 },
      backendId: TEST_SKILLRUNNER_BACKEND_ID,
      backendType: "skillrunner",
      backendBaseUrl: TEST_SKILLRUNNER_BASE_URL,
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      runId: "run-restore-1",
      jobId: "job-restore-1",
      taskName: "paper.md",
      targetParentID: 123,
      requestId: "req-restore-1",
      fetchType: "bundle",
      state: "waiting_user",
      createdAt: "2026-03-12T00:00:00.000Z",
      updatedAt: "2026-03-12T00:00:00.000Z",
    };
    upsertPluginTaskContextEntry(PLUGIN_TASK_DOMAIN_SKILLRUNNER, {
      contextId: String(record.id),
      requestId: String(record.requestId),
      backendId: String(record.backendId),
      state: String(record.state),
      updatedAt: String(record.updatedAt),
      payload: JSON.stringify(record),
    });

    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (url.endsWith("/v1/jobs/req-restore-1")) {
        return createJsonResponse({
          request_id: "req-restore-1",
          status: "waiting_user",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    reconciler.start();
    await reconciler.reconcilePending();
    reconciler.stop();

    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].jobId, "job-restore-1");
    assert.equal(tasks[0].state, "waiting_user");
    assert.equal(tasks[0].requestId, "req-restore-1");
  });

  it("degrades persisted unknown state to running on restore", async function () {
    const unknownRecord = {
      id: `${TEST_SKILLRUNNER_BACKEND_ID}:req-restore-unknown`,
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: { kind: "skillrunner.job.v1", targetParentID: 123 },
      backendId: TEST_SKILLRUNNER_BACKEND_ID,
      backendType: "skillrunner",
      backendBaseUrl: TEST_SKILLRUNNER_BASE_URL,
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      runId: "run-restore-unknown",
      jobId: "job-restore-unknown",
      taskName: "paper.md",
      targetParentID: 123,
      requestId: "req-restore-unknown",
      fetchType: "bundle",
      state: "unknown_status",
      createdAt: "2026-03-12T00:00:00.000Z",
      updatedAt: "2026-03-12T00:00:00.000Z",
    };
    upsertPluginTaskContextEntry(PLUGIN_TASK_DOMAIN_SKILLRUNNER, {
      contextId: String(unknownRecord.id),
      requestId: String(unknownRecord.requestId),
      backendId: String(unknownRecord.backendId),
      state: String(unknownRecord.state),
      updatedAt: String(unknownRecord.updatedAt),
      payload: JSON.stringify(unknownRecord),
    });

    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (url.endsWith("/v1/jobs/req-restore-unknown")) {
        return createJsonResponse({
          request_id: "req-restore-unknown",
          status: "running",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    reconciler.start();
    await reconciler.reconcilePending();
    reconciler.stop();

    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].state, "running");
    assert.equal(tasks[0].requestId, "req-restore-unknown");
  });

  it("updates persisted non-terminal context state from observed backend state", async function () {
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-observed-waiting")) {
        return createJsonResponse({
          request_id: "req-observed-waiting",
          status: "waiting_user",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: 123,
        runtime_options: {
          execution_mode: "interactive",
        },
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-observed-waiting",
        requestId: "req-observed-waiting",
        state: "running",
        fetchType: "result",
      }),
    });

    await reconciler.reconcilePending();
    const persisted = listPluginTaskContextEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER);
    const matched = persisted.find(
      (entry) => entry.requestId === "req-observed-waiting",
    );
    assert.isOk(matched);
    const payload = JSON.parse(String(matched?.payload || "{}")) as {
      state?: string;
    };
    assert.equal(payload.state, "waiting_user");
  });

  it("backs off unchanged queued reconcile while preserving visible task rows", async function () {
    let jobStateFetchCount = 0;
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-queued-backoff")) {
        jobStateFetchCount += 1;
        return createJsonResponse({
          request_id: "req-queued-backoff",
          status: "queued",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    const job = makeDeferredJob({
      id: "job-queued-backoff",
      requestId: "req-queued-backoff",
      state: "queued",
      fetchType: "result",
    });
    recordWorkflowTaskUpdate(job);
    recordTaskDashboardHistoryFromJob(job);
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: 123,
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job,
    });

    await reconciler.reconcilePending();
    await reconciler.reconcilePending();

    assert.equal(jobStateFetchCount, 1);
    const tasks = listWorkflowTasks();
    assert.lengthOf(tasks, 1);
    assert.equal(tasks[0].requestId, "req-queued-backoff");
    assert.equal(tasks[0].state, "queued");
    assert.deepInclude(getSkillRunnerSessionSyncRuntimeForTests(), {
      sessionCount: 0,
    });
  });

  it("preserves existing non-terminal context when a request-created job later reports local failed state", async function () {
    const reconciler = createTrackedReconciler();
    const runningJob = makeDeferredJob({
      id: "job-recoverable-existing",
      requestId: "req-recoverable-existing",
      runId: "run-recoverable-existing",
      state: "running",
      fetchType: "result",
    });
    runningJob.result = {
      requestId: "req-recoverable-existing",
    };
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: 123,
        runtime_options: {
          execution_mode: "auto",
        },
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: runningJob,
    });

    const failedJob = {
      ...runningJob,
      state: "failed" as const,
      error: "poll request disconnected",
      updatedAt: "2026-03-12T00:00:02.000Z",
      result: {
        requestId: "req-recoverable-existing",
      },
    };
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: 123,
        runtime_options: {
          execution_mode: "auto",
        },
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: failedJob,
    });

    const persisted = listPluginTaskContextEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER);
    const matched = persisted.find(
      (entry) => entry.requestId === "req-recoverable-existing",
    );
    assert.isOk(matched);
    assert.equal(matched?.state, "running");
    const payload = JSON.parse(String(matched?.payload || "{}")) as {
      state?: string;
      error?: string;
    };
    assert.equal(payload.state, "running");
    assert.equal(payload.error, "poll request disconnected");
  });

  });
}

export function registerSkillRunnerTaskReconcilerApplyBundleRetryTests() {
  describe("skillrunner task reconciler: apply bundle retry", function () {
    const { createTrackedReconciler } = setupSkillRunnerTaskReconcilerSuite();

  it("applies interactive bundle success to the parent note using backend-shaped result bundle", async function () {
    this.timeout(5000);
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Interactive Bundle Apply Parent" },
    });
    const notePath = "artifacts/note.3dcbb6ddcea81cb8.md";
    const markdown = "# Interactive Bundle Note\n\n- Created from reconciler bundle apply\n";
    const bundleBytes = createZipFromNamedFiles([
      {
        name: "result/result.json",
        data: utf8Bytes(
          JSON.stringify({
            status: "success",
            data: {
              note_path: notePath,
              provenance: {
                generated_at: "2026-04-05T08:05:58Z",
                input_hash: "sha256:3dcbb6ddcea81cb8",
                model: "pymupdf4llm",
              },
              warnings: [],
              error: null,
            },
            artifacts: [notePath],
            error: null,
          }),
        ),
      },
      {
        name: notePath,
        data: utf8Bytes(markdown),
      },
    ]);

    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-bundle-note")) {
        return createJsonResponse({
          request_id: "req-bundle-note",
          status: "succeeded",
        });
      }
      if (url.endsWith("/v1/jobs/req-bundle-note/bundle")) {
        return createBinaryResponse(bundleBytes);
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: parent.id,
        runtime_options: {
          execution_mode: "interactive",
        },
        fetch_type: "bundle",
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-bundle-note",
        requestId: "req-bundle-note",
        state: "running",
        fetchType: "bundle",
        targetParentID: parent.id,
      }),
    });

    await reconciler.reconcilePending();

    const noteIds = parent.getNotes();
    assert.lengthOf(noteIds, 1);
    const note = Zotero.Items.get(noteIds[0])!;
    assert.equal(note.parentItemID, parent.id);
    assert.match(note.getNote(), /data-zs-note-kind="conversation-note"/);
    assert.match(note.getNote(), /data-zs-payload-anchor="conversation-note-markdown"/);
    assert.include(note.getNote(), "Interactive Bundle Note");

    const persisted = listPluginTaskContextEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER);
    assert.lengthOf(persisted, 0);

    const applyLog = listRuntimeLogs({
      requestId: "req-bundle-note",
      operation: "reconcile-owned-terminal-apply",
      order: "asc",
    })[0] as { details?: Record<string, unknown> } | undefined;
    assert.isOk(applyLog);
    assert.equal(String(applyLog?.details?.fetchType || ""), "bundle");
    assert.equal(Number(applyLog?.details?.targetParentID || 0), parent.id);
    assert.isAtLeast(
      listRuntimeLogs({
        requestId: "req-bundle-note",
        operation: "deferred-bundle-fetch-succeeded",
        order: "asc",
      }).length,
      1,
    );
  });

  it("applies interactive bundle success for a real literature-explainer built request", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Interactive Bundle Real Request Parent" },
    });
    const sourceDir = await mkTempDir("zotero-skills-literature-explainer-reconcile");
    const mdPath = joinPath(sourceDir, "paper.md");
    await writeUtf8(mdPath, "# Real Request Source");
    const attachment = await handlers.attachment.createFromPath({
      parent,
      path: mdPath,
      title: "paper.md",
      mimeType: "text/markdown",
    });
    const selectionContext = await buildSelectionContext([attachment]);
    const workflow = await getLiteratureExplainerWorkflow();
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext,
      executionOptions: {
        providerOptions: {
          engine: "gemini",
        },
      },
    })) as Array<{
      kind: string;
      skill_id?: string;
      targetParentID?: number;
      taskName?: string;
      runtime_options?: {
        execution_mode?: string;
      };
      fetch_type?: string;
    }>;

    assert.lengthOf(requests, 1);
    const request = requests[0];
    assert.equal(request.kind, "skillrunner.job.v1");
    assert.equal(request.skill_id, "literature-explainer");
    assert.equal(request.targetParentID, parent.id);
    assert.equal(request.taskName, "paper.md");
    assert.equal(request.runtime_options?.execution_mode, "interactive");

    const notePath = "artifacts/note.real-request.md";
    const markdown =
      "# Real Request Bundle Note\n\n- Created from a real executeBuildRequests payload\n";
    const bundleBytes = createZipFromNamedFiles([
      {
        name: "result/result.json",
        data: utf8Bytes(
          JSON.stringify({
            status: "success",
            data: {
              note_path: notePath,
              warnings: [],
              error: null,
            },
            artifacts: [notePath],
            error: null,
          }),
        ),
      },
      {
        name: notePath,
        data: utf8Bytes(markdown),
      },
    ]);

    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-real-built-bundle")) {
        return createJsonResponse({
          request_id: "req-real-built-bundle",
          status: "succeeded",
        });
      }
      if (url.endsWith("/v1/jobs/req-real-built-bundle/bundle")) {
        return createBinaryResponse(bundleBytes);
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: workflow.manifest.id,
      workflowLabel: workflow.manifest.label || workflow.manifest.id,
      requestKind: request.kind,
      request: {
        ...request,
        fetch_type: "bundle",
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-real-built-bundle",
        requestId: "req-real-built-bundle",
        state: "running",
        fetchType: "bundle",
        targetParentID: parent.id,
      }),
    });

    const noteCountBefore = parent.getNotes().length;
    await reconciler.reconcilePending();

    const noteIds = parent.getNotes();
    assert.equal(noteIds.length, noteCountBefore + 1);
    const note = Zotero.Items.get(noteIds[noteIds.length - 1])!;
    assert.equal(Number(note.parentItemID || 0), parent.id);
    assert.match(note.getNote(), /data-zs-note-kind="conversation-note"/);
    assert.include(note.getNote(), "Real Request Bundle Note");

    const applyLog = listRuntimeLogs({
      requestId: "req-real-built-bundle",
      operation: "reconcile-owned-terminal-apply",
      order: "asc",
    })[0] as { details?: Record<string, unknown> } | undefined;
    assert.isOk(applyLog);
    assert.equal(Number(applyLog?.details?.targetParentID || 0), parent.id);
  });

  it("retries deferred apply after transient result fetch failure and then clears context", async function () {
    let resultAttempts = 0;
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-retry-success")) {
        return createJsonResponse({
          request_id: "req-retry-success",
          status: "succeeded",
        });
      }
      if (url.endsWith("/v1/jobs/req-retry-success/result")) {
        resultAttempts += 1;
        if (resultAttempts === 1) {
          return createJsonResponse({ detail: "transient fetch failure" }, 500);
        }
        return createJsonResponse({
          note_path: "",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Deferred Apply Retry Success Parent" },
    });
    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: parent.id,
        runtime_options: {
          execution_mode: "interactive",
        },
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-retry-success",
        requestId: "req-retry-success",
        fetchType: "result",
        targetParentID: parent.id,
      }),
    });

    await reconciler.reconcilePending();
    let persisted = listPluginTaskContextEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER);
    assert.lengthOf(persisted, 1);
    let payload = JSON.parse(String(persisted[0]?.payload || "{}")) as {
      applyAttempt?: number;
    };
    assert.equal(payload.applyAttempt, 1);

    forceApplyRetryDueNow(reconciler);
    await reconciler.reconcilePending();
    persisted = listPluginTaskContextEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER);
    assert.lengthOf(persisted, 0);
    assert.isAtLeast(resultAttempts, 2);
  });

  it("applies no-selection deferred success when workflow allows empty selection", async function () {
    await rescanWorkflowRegistry();
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-no-selection-success")) {
        return createJsonResponse({
          request_id: "req-no-selection-success",
          status: "succeeded",
        });
      }
      if (url.endsWith("/v1/jobs/req-no-selection-success/result")) {
        return createJsonResponse({
          ok: true,
          checks: [],
          connection: {},
          diagnostics: {},
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "debug-host-bridge-connectivity-probe",
      workflowLabel: "Debug: Host Bridge Connectivity Probe",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "debug-host-bridge-connectivity-probe",
        fetch_type: "result",
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-no-selection-success",
        requestId: "req-no-selection-success",
        state: "running",
        fetchType: "result",
        targetParentID: null,
      }),
    });

    await reconciler.reconcilePending();

    const persisted = listPluginTaskContextEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER);
    assert.lengthOf(persisted, 0);
    const applyLog = listRuntimeLogs({
      requestId: "req-no-selection-success",
      operation: "reconcile-owned-terminal-apply",
      order: "asc",
    })[0] as { details?: Record<string, unknown> } | undefined;
    assert.isOk(applyLog);
    assert.equal(String(applyLog?.details?.fetchType || ""), "result");
    assert.notProperty(applyLog?.details || {}, "targetParentID");
  });

  it("keeps deferred apply parent guard for workflows that require selection", async function () {
    await rescanWorkflowRegistry();
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-parent-required")) {
        return createJsonResponse({
          request_id: "req-parent-required",
          status: "succeeded",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "literature-explainer",
        fetch_type: "result",
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-parent-required",
        requestId: "req-parent-required",
        state: "running",
        fetchType: "result",
        targetParentID: null,
      }),
    });

    await reconciler.reconcilePending();

    const persisted = listPluginTaskContextEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER);
    assert.lengthOf(persisted, 1);
    const payload = JSON.parse(String(persisted[0]?.payload || "{}")) as {
      applyAttempt?: number;
      lastApplyError?: string;
    };
    assert.equal(payload.applyAttempt, 1);
    assert.include(String(payload.lastApplyError || ""), "target parent");
  });

  it("emits succeeded toast when interactive task reaches terminal succeeded and apply completes", async function () {
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-toast-succeeded")) {
        return createJsonResponse({
          request_id: "req-toast-succeeded",
          status: "succeeded",
        });
      }
      if (url.endsWith("/v1/jobs/req-toast-succeeded/result")) {
        return createJsonResponse({
          note_path: "",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const toasts: Array<{ state: string; text: string; type: string }> = [];
    setSkillRunnerTaskLifecycleToastEmitterForTests((payload) => {
      toasts.push(payload);
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Toast Succeeded Parent" },
    });
    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: parent.id,
        runtime_options: {
          execution_mode: "interactive",
        },
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-toast-succeeded",
        requestId: "req-toast-succeeded",
        state: "running",
        fetchType: "result",
        targetParentID: parent.id,
      }),
    });

    await reconciler.reconcilePending();
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0].state, "succeeded");
    assert.equal(toasts[0].type, "success");
    assert.include(toasts[0].text, "Literature Explainer");
    assert.include(toasts[0].text, "paper.md");
  });

  it("replays deferred summary after reconciler settles terminal success before tracker registration", async function () {
    const trackerStages: string[] = [];
    const deferredJobToasts: any[] = [];
    const summaries: Array<{ succeeded: number; failed: number; skipped: number }> = [];
    setDeferredWorkflowCompletionTrackerDepsForTests({
      emitWorkflowJobToasts: (payload) => {
        deferredJobToasts.push(payload);
      },
      emitWorkflowFinishSummary: (payload) => {
        summaries.push({
          succeeded: payload.succeeded,
          failed: payload.failed,
          skipped: payload.skipped,
        });
      },
      appendRuntimeLog: (entry) => {
        trackerStages.push(String(entry.stage || ""));
      },
    });

    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-race-summary")) {
        return createJsonResponse({
          request_id: "req-race-summary",
          status: "succeeded",
        });
      }
      if (url.endsWith("/v1/jobs/req-race-summary/result")) {
        return createJsonResponse({
          note_path: "",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const toasts: Array<{ state: string; text: string; type: string }> = [];
    setSkillRunnerTaskLifecycleToastEmitterForTests((payload) => {
      toasts.push(payload);
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Deferred Summary Replay Parent" },
    });
    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: parent.id,
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-race-summary",
        requestId: "req-race-summary",
        state: "running",
        fetchType: "result",
        targetParentID: parent.id,
      }),
    });

    await reconciler.reconcilePending();

    assert.include(trackerStages, "deferred-outcome-buffered-before-register");
    assert.notInclude(trackerStages, "deferred-run-summary-emitted");
    assert.lengthOf(deferredJobToasts, 0);
    assert.lengthOf(summaries, 0);
    assert.lengthOf(
      toasts,
      0,
      "buffered settle should suppress fallback lifecycle toast before registration",
    );

    const registered = registerDeferredWorkflowCompletion({
      runId: "run-1",
      win: {} as _ZoteroTypes.MainWindow,
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      totalJobs: 1,
      skipped: 0,
      succeeded: 0,
      failed: 0,
      failureReasons: [],
      pendingJobs: [
        {
          index: 0,
          taskLabel: "paper.md",
          succeeded: true,
          terminalState: "succeeded",
          jobId: "job-race-summary",
          requestId: "req-race-summary",
        },
      ],
      messageFormatter: {
        summary: () => "",
        failureReasonsTitle: "Failure reasons:",
        overflow: () => "",
        unknownError: "unknown error",
        startToast: () => "",
        waitingToast: () => "",
        jobToastSuccess: () => "",
        jobToastFailed: () => "",
        jobToastCanceled: () => "",
      } as any,
    });

    assert.isTrue(registered);
    assert.include(trackerStages, "deferred-outcome-replayed-after-register");
    assert.include(trackerStages, "deferred-run-summary-emitted");
    assert.lengthOf(deferredJobToasts, 0);
    assert.deepEqual(summaries, [
      {
        succeeded: 1,
        failed: 0,
        skipped: 0,
      },
    ]);
    assert.lengthOf(toasts, 0);
  });

  it("prompts post-register reconcile only for the requested auto run and preserves its target parent", async function () {
    const trackerStages: string[] = [];
    const summaries: Array<{ succeeded: number; failed: number; skipped: number }> = [];
    setDeferredWorkflowCompletionTrackerDepsForTests({
      emitWorkflowJobToasts: () => undefined,
      emitWorkflowFinishSummary: (payload) => {
        summaries.push({
          succeeded: payload.succeeded,
          failed: payload.failed,
          skipped: payload.skipped,
        });
      },
      appendRuntimeLog: (entry) => {
        trackerStages.push(String(entry.stage || ""));
      },
    });

    const firstParent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Prompt Reconcile Parent First" },
    });
    const secondParent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Prompt Reconcile Parent Second" },
    });

    let firstRequestPolls = 0;
    let secondRequestPolls = 0;
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-prompt-first")) {
        firstRequestPolls += 1;
        return createJsonResponse({
          request_id: "req-prompt-first",
          status: "running",
        });
      }
      if (url.endsWith("/v1/jobs/req-prompt-second")) {
        secondRequestPolls += 1;
        return createJsonResponse({
          request_id: "req-prompt-second",
          status: "succeeded",
        });
      }
      if (url.endsWith("/v1/jobs/req-prompt-second/result")) {
        return createJsonResponse({
          note_path: "",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: firstParent.id,
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-prompt-first",
        requestId: "req-prompt-first",
        runId: "run-prompt-first",
        state: "running",
        fetchType: "result",
        targetParentID: firstParent.id,
      }),
    });
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: secondParent.id,
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-prompt-second",
        requestId: "req-prompt-second",
        runId: "run-prompt-second",
        state: "running",
        fetchType: "result",
        targetParentID: secondParent.id,
      }),
    });

    const registered = registerDeferredWorkflowCompletion({
      runId: "run-prompt-second",
      win: {} as _ZoteroTypes.MainWindow,
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      totalJobs: 1,
      skipped: 0,
      succeeded: 0,
      failed: 0,
      failureReasons: [],
      pendingJobs: [
        {
          index: 0,
          taskLabel: "paper.md",
          succeeded: true,
          terminalState: "succeeded",
          jobId: "job-prompt-second",
          requestId: "req-prompt-second",
        },
      ],
      messageFormatter: {
        summary: () => "",
        failureReasonsTitle: "Failure reasons:",
        overflow: () => "",
        unknownError: "unknown error",
        startToast: () => "",
        waitingToast: () => "",
        jobToastSuccess: () => "",
        jobToastFailed: () => "",
        jobToastCanceled: () => "",
      } as any,
    });

    assert.isTrue(registered);
    await reconciler.promptReconcileRequests({
      backendId: TEST_SKILLRUNNER_BACKEND_ID,
      requestIds: ["req-prompt-second"],
      source: "post-register",
    });

    assert.equal(firstRequestPolls, 0);
    assert.isAtLeast(secondRequestPolls, 1);
    assert.include(trackerStages, "deferred-run-summary-emitted");
    assert.deepEqual(summaries, [
      {
        succeeded: 1,
        failed: 0,
        skipped: 0,
      },
    ]);

    const secondApplyLog = listRuntimeLogs({
      requestId: "req-prompt-second",
      operation: "reconcile-owned-terminal-apply",
      order: "asc",
    })[0] as { details?: Record<string, unknown> } | undefined;
    assert.isOk(secondApplyLog);
    assert.equal(Number(secondApplyLog?.details?.targetParentID || 0), secondParent.id);
    assert.equal(String(secondApplyLog?.details?.source || ""), "post-register");

    const firstApplyLogs = listRuntimeLogs({
      requestId: "req-prompt-first",
      operation: "reconcile-owned-terminal-apply",
      order: "asc",
    });
    assert.lengthOf(firstApplyLogs, 0);
  });

  it("applies SkillRunner sequence step results in reconciler and continues the next step without ACP store pollution", async function () {
    this.timeout(8000);
    await rescanWorkflowRegistry();
    const backend = {
      id: TEST_SKILLRUNNER_BACKEND_ID,
      type: "skillrunner" as const,
      baseUrl: TEST_SKILLRUNNER_BASE_URL,
      auth: { kind: "none" as const },
    };
    const sequenceRunId = "workflow-run-sequence-reconcile";
    const sequenceRequest = {
      kind: "skillrunner.sequence.v1" as const,
      taskName: "Debug Sequence",
      runtime_options: {
        execution_mode: "interactive",
      },
      steps: [
        {
          id: "emit",
          skill_id: "debug-sequence-probe-emit",
          fetch_type: "bundle" as const,
          workspace: "new" as const,
          parameter: {
            probe_id: "linear",
          },
          apply_result: {
            workflow_id: "debug-sequence-linear-probe",
            on_failure: "fail_sequence" as const,
          },
        },
        {
          id: "check",
          skill_id: "debug-sequence-probe-check",
          fetch_type: "result" as const,
          workspace: "reuse-workflow" as const,
          parameter: {
            probe_id: "linear",
          },
        },
      ],
      final_step_id: "check",
    };
    initializeSequenceRunState({
      request: sequenceRequest,
      backend,
      providerOptions: { engine: "gemini" },
      workflowId: "debug-sequence-linear-probe",
      workflowLabel: "Debug: Sequence Linear Probe",
      workflowRunId: sequenceRunId,
      jobId: "job-sequence-root",
    });
    recordSequenceStepRequestCreated({
      sequenceRunId,
      stepIndex: 0,
      requestId: "req-sequence-emit",
    });

    const bundleBytes = createZipFromNamedFiles([
      {
        name: "result/debug-sequence-probe-emit.1/result.json",
        data: utf8Bytes(
          JSON.stringify({
            status: "ok",
            probe_id: "linear",
            checks: ["emit"],
          }),
        ),
      },
    ]);
    const createPayloads: unknown[] = [];
    let emitStatePolls = 0;
    let checkStatePolls = 0;
    (globalThis as { fetch?: typeof fetch }).fetch = async (
      url: string,
      init?: RequestInit,
    ) => {
      const urlText = String(url || "");
      if (isListRunsProbeUrl(urlText)) {
        return createJsonResponse({ data: [] });
      }
      if (
        urlText.endsWith("/v1/jobs") &&
        String(init?.method || "").toUpperCase() === "POST"
      ) {
        createPayloads.push(JSON.parse(String(init?.body || "{}")));
        return createJsonResponse({ request_id: "req-sequence-check" });
      }
      if (urlText.endsWith("/v1/jobs/req-sequence-check/upload")) {
        return createJsonResponse({ ok: true });
      }
      if (urlText.endsWith("/v1/jobs/req-sequence-check")) {
        checkStatePolls += 1;
        return createJsonResponse({
          request_id: "req-sequence-check",
          status: "running",
        });
      }
      if (urlText.endsWith("/v1/jobs/req-sequence-emit")) {
        emitStatePolls += 1;
        return createJsonResponse({
          request_id: "req-sequence-emit",
          status: "succeeded",
        });
      }
      if (urlText.endsWith("/v1/jobs/req-sequence-emit/bundle")) {
        return createBinaryResponse(bundleBytes);
      }
      return createJsonResponse({ error: `unexpected route: ${urlText}` }, 404);
    };

    const firstStepJob = makeDeferredJob({
      id: "job-sequence-root:emit",
      runId: sequenceRunId,
      requestId: "req-sequence-emit",
      state: "running",
      fetchType: "bundle",
      targetParentID: null,
    });
    firstStepJob.workflowId = "debug-sequence-linear-probe";
    firstStepJob.request = {
      kind: "skillrunner.job.v1",
      skill_id: "debug-sequence-probe-emit",
      fetch_type: "bundle",
      runtime_options: {
        execution_mode: "interactive",
      },
      parameter: {
        probe_id: "linear",
      },
    };
    firstStepJob.meta = {
      ...firstStepJob.meta,
      workflowLabel: "Debug: Sequence Linear Probe",
      workflowRunId: sequenceRunId,
      taskName: "Debug Sequence / emit",
      sequenceStepId: "emit",
      sequenceStepIndex: 0,
      sequenceStepSkillId: "debug-sequence-probe-emit",
    } as JobRecord["meta"];

    const reconciler = createTrackedReconciler();
    recordWorkflowTaskUpdate(firstStepJob);
    recordTaskDashboardHistoryFromJob(firstStepJob);
    reconciler.registerFromJob({
      workflowId: "debug-sequence-linear-probe",
      workflowLabel: "Debug: Sequence Linear Probe",
      requestKind: "skillrunner.job.v1",
      request: firstStepJob.request,
      backend,
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: firstStepJob,
    });

    await reconciler.reconcilePending();

    assert.isAtLeast(emitStatePolls, 2);
    assert.isAtLeast(checkStatePolls, 1);
    assert.lengthOf(createPayloads, 1);
    const checkCreatePayload = createPayloads[0] as {
      runtime_options?: Record<string, unknown>;
    };
    assert.deepInclude(checkCreatePayload.runtime_options || {}, {
      execution_mode: "interactive",
    });
    assert.deepEqual(checkCreatePayload.runtime_options?.workspace, {
      mode: "reuse",
      request_id: "req-sequence-emit",
    });

    const sequenceState = getSequenceRunState(sequenceRunId);
    assert.equal(sequenceState?.status, "waiting_recovery");
    assert.equal(sequenceState?.steps[0]?.status, "succeeded");
    assert.equal(sequenceState?.steps[0]?.applyResult?.status, "succeeded");
    assert.equal(
      sequenceState?.steps[0]?.applyResult?.workflowId,
      "debug-sequence-linear-probe",
    );
    assert.equal(sequenceState?.steps[1]?.requestId, "req-sequence-check");
    assert.equal(sequenceState?.steps[1]?.status, "deferred");

    const persistedContexts = listPluginTaskContextEntries(
      PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    );
    assert.isTrue(
      persistedContexts.some((entry) => entry.requestId === "req-sequence-check"),
    );
    assert.isFalse(
      persistedContexts.some((entry) => entry.requestId === "req-sequence-emit"),
    );
    assert.isNull(getAcpSkillRunRecord("req-sequence-emit"));
    assert.isNull(getAcpSkillRunRecord("req-sequence-check"));
  });

  it("falls back to interval retry after post-register apply failure without duplicating deferred summary", async function () {
    const trackerStages: string[] = [];
    const summaries: Array<{ succeeded: number; failed: number; skipped: number }> = [];
    setDeferredWorkflowCompletionTrackerDepsForTests({
      emitWorkflowJobToasts: () => undefined,
      emitWorkflowFinishSummary: (payload) => {
        summaries.push({
          succeeded: payload.succeeded,
          failed: payload.failed,
          skipped: payload.skipped,
        });
      },
      appendRuntimeLog: (entry) => {
        trackerStages.push(String(entry.stage || ""));
      },
    });

    let resultFetchCount = 0;
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-post-register-retry")) {
        return createJsonResponse({
          request_id: "req-post-register-retry",
          status: "succeeded",
        });
      }
      if (url.endsWith("/v1/jobs/req-post-register-retry/result")) {
        resultFetchCount += 1;
        if (resultFetchCount === 1) {
          return createJsonResponse({ detail: "transient apply failure" }, 500);
        }
        return createJsonResponse({
          note_path: "",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Prompt Retry Parent" },
    });
    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: parent.id,
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-post-register-retry",
        requestId: "req-post-register-retry",
        runId: "run-post-register-retry",
        state: "running",
        fetchType: "result",
        targetParentID: parent.id,
      }),
    });

    const registered = registerDeferredWorkflowCompletion({
      runId: "run-post-register-retry",
      win: {} as _ZoteroTypes.MainWindow,
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      totalJobs: 1,
      skipped: 0,
      succeeded: 0,
      failed: 0,
      failureReasons: [],
      pendingJobs: [
        {
          index: 0,
          taskLabel: "paper.md",
          succeeded: true,
          terminalState: "succeeded",
          jobId: "job-post-register-retry",
          requestId: "req-post-register-retry",
        },
      ],
      messageFormatter: {
        summary: () => "",
        failureReasonsTitle: "Failure reasons:",
        overflow: () => "",
        unknownError: "unknown error",
        startToast: () => "",
        waitingToast: () => "",
        jobToastSuccess: () => "",
        jobToastFailed: () => "",
        jobToastCanceled: () => "",
      } as any,
    });

    assert.isTrue(registered);
    await reconciler.promptReconcileRequests({
      backendId: TEST_SKILLRUNNER_BACKEND_ID,
      requestIds: ["req-post-register-retry"],
      source: "post-register",
    });

    assert.equal(resultFetchCount, 1);
    assert.notInclude(trackerStages, "deferred-run-summary-emitted");
    forceApplyRetryDueNow(reconciler);
    await reconciler.reconcilePending();

    assert.equal(resultFetchCount, 2);
    assert.deepEqual(summaries, [
      {
        succeeded: 1,
        failed: 0,
        skipped: 0,
      },
    ]);
    assert.lengthOf(
      trackerStages.filter((stage) => stage === "deferred-run-summary-emitted"),
      1,
    );

    const failedLog = listRuntimeLogs({
      requestId: "req-post-register-retry",
      operation: "deferred-apply-failed",
      order: "asc",
    })[0] as { details?: Record<string, unknown> } | undefined;
    assert.isOk(failedLog);
    assert.equal(String(failedLog?.details?.source || ""), "post-register");

    const applyLog = listRuntimeLogs({
      requestId: "req-post-register-retry",
      operation: "reconcile-owned-terminal-apply",
      order: "desc",
    })[0] as { details?: Record<string, unknown> } | undefined;
    assert.isOk(applyLog);
    assert.equal(String(applyLog?.details?.source || ""), "interval");
  });

  });
}

export function registerSkillRunnerTaskReconcilerLedgerReconcileTests() {
  describe("skillrunner task reconciler: ledger reconcile", function () {
    const { createTrackedReconciler } = setupSkillRunnerTaskReconcilerSuite();

  it("emits failed toast when interactive task reaches terminal failed", async function () {
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-toast-failed")) {
        return createJsonResponse({
          request_id: "req-toast-failed",
          status: "failed",
          error: "backend failed",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const toasts: Array<{ state: string; text: string; type: string }> = [];
    setSkillRunnerTaskLifecycleToastEmitterForTests((payload) => {
      toasts.push(payload);
    });

    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: 123,
        runtime_options: {
          execution_mode: "interactive",
        },
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-toast-failed",
        requestId: "req-toast-failed",
        state: "running",
        fetchType: "result",
      }),
    });

    await reconciler.reconcilePending();
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0].state, "failed");
    assert.equal(toasts[0].type, "error");
    assert.include(toasts[0].text, "Literature Explainer");
    assert.include(toasts[0].text, "backend failed");
  });

  it("emits canceled toast when interactive task reaches terminal canceled", async function () {
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-toast-canceled")) {
        return createJsonResponse({
          request_id: "req-toast-canceled",
          status: "canceled",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const toasts: Array<{ state: string; text: string; type: string }> = [];
    setSkillRunnerTaskLifecycleToastEmitterForTests((payload) => {
      toasts.push(payload);
    });

    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: 123,
        runtime_options: {
          execution_mode: "interactive",
        },
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-toast-canceled",
        requestId: "req-toast-canceled",
        state: "running",
        fetchType: "result",
      }),
    });

    await reconciler.reconcilePending();
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0].state, "canceled");
    assert.equal(toasts[0].type, "default");
    assert.include(toasts[0].text, "Literature Explainer");
    assert.include(toasts[0].text, "paper.md");
  });

  it("stops apply retries after limit and drops deferred context", async function () {
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        return createJsonResponse({
          data: [],
        });
      }
      if (url.endsWith("/v1/jobs/req-retry-exhausted")) {
        return createJsonResponse({
          request_id: "req-retry-exhausted",
          status: "succeeded",
        });
      }
      if (url.endsWith("/v1/jobs/req-retry-exhausted/result")) {
        return createJsonResponse({ detail: "always fail" }, 500);
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: 123,
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-retry-exhausted",
        requestId: "req-retry-exhausted",
        fetchType: "result",
      }),
    });

    for (let i = 0; i < 6; i += 1) {
      await reconciler.reconcilePending();
      forceApplyRetryDueNow(reconciler);
    }

    const persisted = listPluginTaskContextEntries(
      PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    );
    assert.lengthOf(persisted, 0);
    const tasks = listWorkflowTasks();
    assert.equal(tasks[0]?.state, "succeeded");
  });

  it("reconciles backend task ledger and preserves missing request ids as failed", async function () {
    recordWorkflowTaskUpdate(
      makeDashboardJob({
        id: "active-missing",
        runId: "run-active-missing",
        requestId: "req-missing",
        state: "running",
        backendId: "remote-skillrunner",
        backendBaseUrl: "http://127.0.0.1:8031",
      }),
    );
    recordWorkflowTaskUpdate(
      makeDashboardJob({
        id: "active-live",
        runId: "run-active-live",
        requestId: "req-live",
        state: "running",
        backendId: "remote-skillrunner",
        backendBaseUrl: "http://127.0.0.1:8031",
      }),
    );
    recordTaskDashboardHistoryFromJob(
      makeDashboardJob({
        id: "history-missing",
        runId: "run-history-missing",
        requestId: "req-missing",
        state: "failed",
        backendId: "remote-skillrunner",
        backendBaseUrl: "http://127.0.0.1:8031",
      }),
    );
    recordTaskDashboardHistoryFromJob(
      makeDashboardJob({
        id: "history-live",
        runId: "run-history-live",
        requestId: "req-live",
        state: "succeeded",
        backendId: "remote-skillrunner",
        backendBaseUrl: "http://127.0.0.1:8031",
      }),
    );
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (url.endsWith("/v1/jobs/req-missing")) {
        return createJsonResponse({ detail: "not found" }, 404);
      }
      if (url.endsWith("/v1/jobs/req-live")) {
        return createJsonResponse({
          request_id: "req-live",
          status: "running",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const result = await reconcileSkillRunnerBackendTaskLedgerOnce({
      backend: {
        id: "remote-skillrunner",
        displayName: "Remote SkillRunner",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8031",
        auth: { kind: "none" },
      },
      source: "startup",
    });

    assert.isTrue(result.ok);
    assert.include(result.missingRequestIds, "req-missing");
    assert.notInclude(result.missingRequestIds, "req-live");
    assert.equal(result.removedActiveCount, 0);
    assert.equal(result.removedHistoryCount, 0);
    const activeRows = listWorkflowTasks();
    assert.sameMembers(
      activeRows.map((entry) => String(entry.requestId || "")),
      ["req-missing", "req-live"],
    );
    assert.equal(
      activeRows.find((entry) => entry.requestId === "req-missing")?.state,
      "failed",
    );
    const historyRows = listTaskDashboardHistory({
      backendId: "remote-skillrunner",
    });
    assert.sameMembers(
      historyRows.map((entry) => String(entry.requestId || "")),
      ["req-missing", "req-live"],
    );
    assert.equal(
      historyRows.find((entry) => entry.requestId === "req-missing")?.state,
      "failed",
    );
  });

  it("reconciles running task to terminal failed after double-confirming backend terminal state", async function () {
    recordWorkflowTaskUpdate(
      makeDashboardJob({
        id: "active-terminal-failed",
        runId: "run-active-terminal-failed",
        requestId: "req-terminal-failed",
        state: "running",
        backendId: "remote-skillrunner",
        backendBaseUrl: "http://127.0.0.1:8031",
      }),
    );
    recordTaskDashboardHistoryFromJob(
      makeDashboardJob({
        id: "history-terminal-failed",
        runId: "run-history-terminal-failed",
        requestId: "req-terminal-failed",
        state: "running",
        backendId: "remote-skillrunner",
        backendBaseUrl: "http://127.0.0.1:8031",
      }),
    );
    const toasts: Array<{ state: string; text: string; type: string }> = [];
    setSkillRunnerTaskLifecycleToastEmitterForTests((payload) => {
      toasts.push(payload);
    });
    let pollCount = 0;
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (url.endsWith("/v1/jobs/req-terminal-failed")) {
        pollCount += 1;
        return createJsonResponse({
          request_id: "req-terminal-failed",
          status: "failed",
          error: "backend hard terminated",
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const result = await reconcileSkillRunnerBackendTaskLedgerOnce({
      backend: {
        id: "remote-skillrunner",
        displayName: "Remote SkillRunner",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8031",
        auth: { kind: "none" },
      },
      source: "startup",
    });

    assert.isTrue(result.ok);
    assert.isAtLeast(pollCount, 2);
    const task = listWorkflowTasks().find(
      (entry) => entry.requestId === "req-terminal-failed",
    );
    assert.isOk(task);
    assert.equal(task?.state, "failed");
    assert.equal(task?.error, "backend hard terminated");
    const historyRows = listTaskDashboardHistory({
      backendId: "remote-skillrunner",
      requestId: "req-terminal-failed",
    });
    assert.lengthOf(historyRows, 1);
    assert.equal(historyRows[0].state, "failed");
    assert.equal(historyRows[0].error, "backend hard terminated");
    assert.lengthOf(toasts, 1);
    assert.equal(toasts[0].state, "failed");
    assert.equal(toasts[0].type, "error");
  });

  it("keeps running task unchanged when double-confirm terminal check is not stable", async function () {
    recordWorkflowTaskUpdate(
      makeDashboardJob({
        id: "active-terminal-unstable",
        runId: "run-active-terminal-unstable",
        requestId: "req-terminal-unstable",
        state: "running",
        backendId: "remote-skillrunner",
        backendBaseUrl: "http://127.0.0.1:8031",
      }),
    );
    recordTaskDashboardHistoryFromJob(
      makeDashboardJob({
        id: "history-terminal-unstable",
        runId: "run-history-terminal-unstable",
        requestId: "req-terminal-unstable",
        state: "running",
        backendId: "remote-skillrunner",
        backendBaseUrl: "http://127.0.0.1:8031",
      }),
    );
    const toasts: Array<{ state: string; text: string; type: string }> = [];
    setSkillRunnerTaskLifecycleToastEmitterForTests((payload) => {
      toasts.push(payload);
    });
    let pollCount = 0;
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (url.endsWith("/v1/jobs/req-terminal-unstable")) {
        pollCount += 1;
        return createJsonResponse({
          request_id: "req-terminal-unstable",
          status: pollCount === 1 ? "failed" : "running",
          error: pollCount === 1 ? "transient terminal report" : null,
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const result = await reconcileSkillRunnerBackendTaskLedgerOnce({
      backend: {
        id: "remote-skillrunner",
        displayName: "Remote SkillRunner",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8031",
        auth: { kind: "none" },
      },
      source: "startup",
    });

    assert.isTrue(result.ok);
    assert.equal(pollCount, 2);
    const task = listWorkflowTasks().find(
      (entry) => entry.requestId === "req-terminal-unstable",
    );
    assert.isOk(task);
    assert.equal(task?.state, "running");
    const historyRows = listTaskDashboardHistory({
      backendId: "remote-skillrunner",
      requestId: "req-terminal-unstable",
    });
    assert.lengthOf(historyRows, 1);
    assert.equal(historyRows[0].state, "running");
    assert.lengthOf(toasts, 0);
  });

  itFullOnly("reports toast when backend reconcile fails due to communication error", async function () {
    recordTaskDashboardHistoryFromJob(
      makeDashboardJob({
        id: "history-live",
        runId: "run-history-live",
        requestId: "req-live",
        state: "succeeded",
        backendId: "remote-skillrunner",
        backendBaseUrl: "http://127.0.0.1:8031",
      }),
    );
    const toasts: string[] = [];
    setSkillRunnerBackendReconcileFailureToastEmitterForTests((payload) => {
      toasts.push(payload.text);
    });
    (globalThis as { fetch?: typeof fetch }).fetch = async () => {
      throw new Error("network down");
    };

    const result = await reconcileSkillRunnerBackendTaskLedgerOnce({
      backend: {
        id: "remote-skillrunner",
        displayName: "Remote SkillRunner",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8031",
        auth: { kind: "none" },
      },
      source: "startup",
      emitFailureToast: true,
    });

    assert.isFalse(result.ok);
    assert.lengthOf(toasts, 1);
    assert.include(toasts[0], "Remote SkillRunner");
  });

  itFullOnly("throttles repeated backend-reconcile-failed logs when backend is unreachable", async function () {
    let networkDown = true;
    (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
      if (isListRunsProbeUrl(url)) {
        if (networkDown) {
          throw new TypeError("NetworkError when attempting to fetch resource.");
        }
        return createJsonResponse({
          data: [],
        });
      }
      return createJsonResponse({ error: "unexpected route" }, 404);
    };

    const reconciler = createTrackedReconciler();
    reconciler.registerFromJob({
      workflowId: "literature-explainer",
      workflowLabel: "Literature Explainer",
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        targetParentID: 123,
      },
      backend: {
        id: TEST_SKILLRUNNER_BACKEND_ID,
        type: "skillrunner",
        baseUrl: TEST_SKILLRUNNER_BASE_URL,
        auth: { kind: "none" },
      },
      providerId: "skillrunner",
      providerOptions: { engine: "gemini" },
      job: makeDeferredJob({
        id: "job-reconcile-throttle",
        requestId: "req-reconcile-throttle",
        state: "running",
        fetchType: "result",
      }),
    });

    await reconciler.reconcilePending();
    await reconciler.reconcilePending();
    let failedLogs = listRuntimeLogs({
      operation: "backend-health-probe-failed",
      backendId: TEST_SKILLRUNNER_BACKEND_ID,
      order: "asc",
    });
    assert.lengthOf(failedLogs, 1);

    networkDown = true;
    await reconciler.reconcilePending();
    failedLogs = listRuntimeLogs({
      operation: "backend-health-probe-failed",
      backendId: TEST_SKILLRUNNER_BACKEND_ID,
      order: "asc",
    });
    assert.lengthOf(failedLogs, 1);
  });

  it("degrades reconcile poll frequency after sustained failures and restores after recovery", async function () {
    let networkDown = true;
    let fetchCount = 0;
    const previousBackendsPref = String(getPref("backendsConfigJson") || "");
    setPref(
      "backendsConfigJson",
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: TEST_SKILLRUNNER_BACKEND_ID,
            displayName: "Local Backend",
            type: "skillrunner",
            baseUrl: TEST_SKILLRUNNER_BASE_URL,
            auth: { kind: "none" },
          },
        ],
      }),
    );
    const dateNowDescriptor = Object.getOwnPropertyDescriptor(Date, "now");
    let fakeNow = Date.now();
    Object.defineProperty(Date, "now", {
      configurable: true,
      value: () => fakeNow,
    });
    try {
      (globalThis as { fetch?: typeof fetch }).fetch = async (url: string) => {
        if (isListRunsProbeUrl(url)) {
          fetchCount += 1;
          if (networkDown) {
            throw new TypeError("NetworkError when attempting to fetch resource.");
          }
          return createJsonResponse({
            data: [],
          });
        }
        if (url.endsWith("/v1/jobs/req-reconcile-backoff")) {
          return createJsonResponse({
            request_id: "req-reconcile-backoff",
            status: "running",
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      };

      const reconciler = createTrackedReconciler();
      reconciler.registerFromJob({
        workflowId: "literature-explainer",
        workflowLabel: "Literature Explainer",
        requestKind: "skillrunner.job.v1",
        request: {
          kind: "skillrunner.job.v1",
          targetParentID: 123,
        },
        backend: {
          id: TEST_SKILLRUNNER_BACKEND_ID,
          type: "skillrunner",
          baseUrl: TEST_SKILLRUNNER_BASE_URL,
          auth: { kind: "none" },
        },
        providerId: "skillrunner",
        providerOptions: { engine: "gemini" },
        job: makeDeferredJob({
          id: "job-reconcile-backoff",
          requestId: "req-reconcile-backoff",
          state: "waiting_user",
          fetchType: "result",
        }),
      });

      const key = TEST_SKILLRUNNER_BACKEND_ID;

      await reconciler.reconcilePending();
      assert.isAtLeast(fetchCount, 1);
      let health = getSkillRunnerBackendHealthState(key);
      assert.isOk(health);
      assert.equal(health?.backoffLevel, 1);
      assert.isFalse(health?.reconcileFlag);
      assert.isTrue((health?.nextProbeAt || 0) > fakeNow);
      const countAfterFirstProbe = fetchCount;
      await reconciler.reconcilePending();
      assert.equal(fetchCount, countAfterFirstProbe);

      fakeNow = (health?.nextProbeAt || fakeNow) + 1;
      await reconciler.reconcilePending();
      assert.isAbove(fetchCount, countAfterFirstProbe);
      const countAfterSecondProbe = fetchCount;
      health = getSkillRunnerBackendHealthState(key);
      assert.equal(health?.backoffLevel, 2);
      assert.isTrue(health?.reconcileFlag);

      fakeNow = (health?.nextProbeAt || fakeNow) + 1;
      await reconciler.reconcilePending();
      assert.isAbove(fetchCount, countAfterSecondProbe);
      const countAfterThirdProbe = fetchCount;
      health = getSkillRunnerBackendHealthState(key);
      assert.equal(health?.backoffLevel, 2);

      await reconciler.reconcilePending();
      assert.equal(fetchCount, countAfterThirdProbe);

      fakeNow = (health?.nextProbeAt || fakeNow) + 1;
      networkDown = false;
      await reconciler.reconcilePending();
      assert.isAbove(fetchCount, countAfterThirdProbe);
      health = getSkillRunnerBackendHealthState(key);
      assert.equal(health?.backoffLevel, 0);
      assert.isFalse(health?.reconcileFlag);
    } finally {
      if (dateNowDescriptor) {
        Object.defineProperty(Date, "now", dateNowDescriptor);
      }
      setPref("backendsConfigJson", previousBackendsPref);
    }
  });
  });
}
