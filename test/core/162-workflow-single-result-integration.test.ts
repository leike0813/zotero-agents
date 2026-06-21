import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../../src/config/defaults";
import type { BackendInstance } from "../../src/backends/types";
import type { ProviderExecutionResult } from "../../src/providers/contracts";
import type { ProviderProgressEvent } from "../../src/providers/types";
import { SkillRunnerPollingTimeoutError } from "../../src/providers/skillrunner/errors";
import { SkillRunnerManagementClient } from "../../src/providers/skillrunner/managementClient";
import { continueSkillRunnerForegroundRun } from "../../src/modules/skillRunnerForegroundContinuation";
import { clearRuntimeLogs } from "../../src/modules/runtimeLogManager";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { resetWorkflowHostApiForTests } from "../../src/workflows/hostApi";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import type { LoadedWorkflow } from "../../src/workflows/types";
import { createLocalizedMessageFormatter } from "../../src/modules/workflowExecution/messageFormatter";
import { runWorkflowPreparationSeam } from "../../src/modules/workflowExecution/preparationSeam";
import { runWorkflowExecutionSeam } from "../../src/modules/workflowExecution/runSeam";
import { runWorkflowApplySeam } from "../../src/modules/workflowExecution/applySeam";
import type { PreparedWorkflowExecution } from "../../src/modules/workflowExecution/contracts";
import {
  buildWorkflowTaskRecordFromJob,
  listWorkflowTasks,
  recordWorkflowTaskUpdate,
  resetWorkflowTasks,
} from "../../src/modules/taskRuntime";
import {
  recordTaskDashboardHistoryFromJob,
  resetTaskDashboardHistory,
} from "../../src/modules/taskDashboardHistory";
import {
  getSkillRunnerRunRecordByRequest,
  resetSkillRunnerRunStoreForTests,
} from "../../src/modules/skillRunnerRunStore";
import {
  getAcpSkillRunRecord,
  resetAcpSkillRunsForTests,
} from "../../src/modules/acpSkillRunStore";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { createZipFromNamedFiles } from "../../src/providers/skillrunner/zipTransport";
import { workflowsPath } from "./workflow-test-utils";

const SINGLE_RESULT_WORKFLOW_ID = "debug-apply-single-result";
const SINGLE_BUNDLE_WORKFLOW_ID = "debug-apply-single-bundle";
const MANIFEST_BUNDLE_WORKFLOW_ID = "debug-apply-manifest-bundle";
const SEQUENCE_RESULT_WORKFLOW_ID = "debug-apply-sequence-result";
const SEQUENCE_BUNDLE_WORKFLOW_ID = "debug-apply-sequence-bundle";
const INTERACTIVE_CHOICE_WORKFLOW_ID = "debug-interactive-choice-probe";
const INTERACTIVE_THEN_RESULT_WORKFLOW_ID = "debug-interactive-then-result";
const SKILLRUNNER_BACKEND: BackendInstance = {
  id: "integration-skillrunner",
  type: "skillrunner",
  baseUrl: "http://127.0.0.1:8030",
  auth: { kind: "none" },
};
const ACP_BACKEND: BackendInstance = {
  id: "integration-acp",
  type: "acp",
  baseUrl: "local://integration-acp",
  auth: { kind: "none" },
};

type ProviderScenario = (args: {
  request: Record<string, unknown>;
  requestKind: string;
  onProgress?: (event: ProviderProgressEvent) => void;
}) => Promise<ProviderExecutionResult>;

type IntegrationRun = Awaited<ReturnType<typeof runDebugApplyWorkflow>>;
type DebugApplyProvider = "skillrunner" | "acp";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function createFakeWindow() {
  return {
    ZoteroPane: {
      getSelectedItems: () => [],
    },
    alert: () => undefined,
  } as unknown as _ZoteroTypes.MainWindow;
}

async function getDebugApplyWorkflow(workflowId = SINGLE_RESULT_WORKFLOW_ID) {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === workflowId,
  );
  assert.isOk(
    workflow,
    `expected ${workflowId}; loaded=${loaded.workflows
      .map((entry) => entry.manifest.id)
      .join(",")}`,
  );
  return workflow!;
}

function makeExecutionContext(args: {
  provider: DebugApplyProvider;
  requestKind?: string;
}): PreparedWorkflowExecution["executionContext"] {
  if (args.provider === "acp") {
    return {
      providerId: "acp",
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      providerOptions: {},
      workflowParams: {},
      runOptions: {},
      backend: ACP_BACKEND,
    };
  }
  return {
    providerId: "skillrunner",
    requestKind: args.requestKind || "skillrunner.job.v1",
    providerOptions: {},
    workflowParams: {},
    runOptions: {},
    backend: SKILLRUNNER_BACKEND,
  };
}

function buildResultJsonFromRequest(
  request: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
) {
  const parameter = isRecord(request.parameter) ? request.parameter : {};
  const fetchType = normalizeString(request.fetch_type) || "result";
  const stepId =
    normalizeString(parameter.step_id) ||
    normalizeString(request.id) ||
    (fetchType === "bundle" ? "bundle" : "result");
  return {
    kind: "debug_apply_contract_result",
    workflow_id:
      normalizeString(parameter.workflow_id) || SINGLE_RESULT_WORKFLOW_ID,
    step_id: stepId,
    apply_mode: fetchType,
    ...parameter,
    ...overrides,
  };
}

function makeTerminalSuccess(args: {
  request: Record<string, unknown>;
  requestId: string;
  provider: DebugApplyProvider;
  fetchType?: "result" | "bundle";
  manifestBundle?: boolean;
}): ProviderExecutionResult {
  const fetchType =
    args.fetchType || (normalizeString(args.request.fetch_type) === "bundle" ? "bundle" : "result");
  const manifestBundle = fetchType === "bundle" && args.manifestBundle === true;
  const resultJson = buildResultJsonFromRequest(args.request, {
    apply_mode: fetchType,
    ...(fetchType === "bundle"
      ? manifestBundle
        ? { artifact_manifest_path: "result/debug-apply-artifacts.json" }
        : { artifact_path: "result/debug-apply-artifact.txt" }
      : {}),
  });
  const artifactEntryPath = manifestBundle
    ? "result/manifest-artifacts/debug-apply-artifact.txt"
    : "result/debug-apply-artifact.txt";
  const bundleBytes =
    fetchType === "bundle"
      ? createZipFromNamedFiles([
          {
            name: "result/result.json",
            data: new TextEncoder().encode(JSON.stringify(resultJson)),
          },
          ...(manifestBundle
            ? [
                {
                  name: "result/debug-apply-artifacts.json",
                  data: new TextEncoder().encode(
                    JSON.stringify({
                      debug_apply_artifact: artifactEntryPath,
                    }),
                  ),
                },
              ]
            : []),
          {
            name: artifactEntryPath,
            data: new TextEncoder().encode(
              `${normalizeString(resultJson.workflow_id)}:${normalizeString(resultJson.step_id)}:bundle artifact`,
            ),
          },
        ])
      : undefined;
  return {
    status: "succeeded",
    requestId: args.requestId,
    fetchType,
    resultJson,
    ...(bundleBytes ? { bundleBytes } : {}),
    responseJson: {
      provider: args.provider,
      request_id: args.requestId,
      ...(fetchType === "bundle" ? { result_json_path: "result/result.json" } : {}),
    },
  };
}

function makeWaitingUserDetach(args: {
  requestId: string;
  fetchType?: "result" | "bundle";
  responseJson?: Record<string, unknown>;
}): ProviderExecutionResult {
  return {
    status: "deferred",
    requestId: args.requestId,
    fetchType: args.fetchType || "result",
    backendStatus: "waiting_user",
    detachReason: "waiting",
    continuationOwner: "foreground",
    responseJson: {
      request_id: args.requestId,
      status: "waiting_user",
      ...(args.responseJson || {}),
    },
  } as ProviderExecutionResult;
}

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

async function withMockedFetch<T>(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
  work: () => Promise<T>,
) {
  const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
  (globalThis as { fetch?: typeof fetch }).fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => handler(String(input), init)) as typeof fetch;
  try {
    return await work();
  } finally {
    (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
  }
}

async function waitForAsyncWork(turns = 4) {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
}

function makeInteractivePendingPayload(args: {
  interactionId: number;
  options?: Array<string | { label: string; value: string }>;
}) {
  const options = args.options || [
    { label: "Alpha", value: "alpha" },
    { label: "Beta", value: "beta" },
  ];
  return {
    pending_owner: "waiting_user",
    pending: {
      interaction_id: args.interactionId,
      kind: "choose_one",
      prompt: "Choose a debug continuation option.",
      ui_hints: {
        kind: "choose_one",
        prompt: "Choose a debug continuation option.",
        options,
      },
      ask_user: {
        kind: "choose_one",
        prompt: "Choose a debug continuation option.",
        options,
      },
    },
  };
}

function makeInteractiveChoiceResult(overrides: Record<string, unknown> = {}) {
  return {
    kind: "debug_interactive_choice_probe",
    ok: true,
    accepted_any_reply: true,
    message: "accepted debug choice",
    ...overrides,
  };
}

async function prepareDebugApplyWorkflow(args: {
  provider: DebugApplyProvider;
  workflowId?: string;
  requestKind?: string;
  workflow?: LoadedWorkflow;
}) {
  const workflow =
    args.workflow ||
    (await getDebugApplyWorkflow(args.workflowId || SINGLE_RESULT_WORKFLOW_ID));
  const messageFormatter = createLocalizedMessageFormatter();
  const executionContext = makeExecutionContext({
    provider: args.provider,
    requestKind: args.requestKind,
  });
  const preparation = await runWorkflowPreparationSeam(
    {
      win: createFakeWindow(),
      workflow,
      messageFormatter,
      suppressUiFeedback: true,
    },
    {
      resolveWorkflowExecutionContext: async () => executionContext,
      buildSelectionContext: async () => ({
        selectionType: "empty",
        items: { parents: [], attachments: [] },
      }),
      executeBuildRequests,
      alertWindow: () => undefined,
    },
  );
  assert.equal(preparation.status, "ready");
  if (preparation.status !== "ready") {
    throw new Error("single result preparation did not produce requests");
  }
  assert.lengthOf(preparation.prepared.requests, 1);
  return {
    workflow,
    messageFormatter,
    prepared: preparation.prepared,
    request: preparation.prepared.requests[0] as Record<string, unknown>,
  };
}

async function runDebugApplyWorkflow(args: {
  provider: DebugApplyProvider;
  workflowId?: string;
  requestKind?: string;
  scenario: ProviderScenario;
  applyDeps?: Parameters<typeof runWorkflowApplySeam>[1];
}) {
  const prepared = await prepareDebugApplyWorkflow({
    provider: args.provider,
    workflowId: args.workflowId,
    requestKind: args.requestKind,
  });
  const taskUpdates: Array<Record<string, any>> = [];
  const historyUpdates: Array<Record<string, any>> = [];
  const focusCalls: Array<Record<string, unknown>> = [];
  const assistantCalls: Array<Record<string, unknown>> = [];
  const selectedAcpRuns: string[] = [];
  const providerCalls: Array<{
    requestKind: string;
    backendType: string;
    request: Record<string, unknown>;
  }> = [];

  const runState = runWorkflowExecutionSeam(
    {
      prepared: prepared.prepared,
    },
    {
      executeWithProvider: async ({ request, requestKind, backend, onProgress }) => {
        const requestRecord = request as Record<string, unknown>;
        providerCalls.push({
          requestKind,
          backendType: normalizeString(backend.type),
          request: clone(requestRecord),
        });
        return args.scenario({
          request: requestRecord,
          requestKind,
          onProgress,
        });
      },
      recordWorkflowTaskUpdate: (job) => {
        taskUpdates.push(clone(job as unknown as Record<string, any>));
        recordWorkflowTaskUpdate(job);
      },
      recordTaskDashboardHistoryFromJob: (job) => {
        historyUpdates.push(clone(job as unknown as Record<string, any>));
        return recordTaskDashboardHistoryFromJob(job);
      },
      focusSkillRunnerWorkspace: (payload) => {
        focusCalls.push(payload as unknown as Record<string, unknown>);
        return Promise.resolve();
      },
      openAssistantWorkspaceSidebar: (payload) => {
        assistantCalls.push(payload as unknown as Record<string, unknown>);
        return Promise.resolve();
      },
      selectAcpSkillRun: (requestId) => {
        selectedAcpRuns.push(requestId);
      },
      getLoadedWorkflowEntries: () => [prepared.workflow],
    },
  );

  await runState.idlePromise;
  const applySummary = await runWorkflowApplySeam(
    {
      runState,
      messageFormatter: prepared.messageFormatter,
    },
    args.applyDeps || {},
  );

  return {
    ...prepared,
    runState,
    applySummary,
    taskUpdates,
    historyUpdates,
    focusCalls,
    assistantCalls,
    selectedAcpRuns,
    providerCalls,
  };
}

function getRequestParent(request: Record<string, unknown>) {
  const parentId = Number(request.targetParentID);
  assert.isTrue(Number.isFinite(parentId), "request targetParentID is required");
  const parent = Zotero.Items.get(parentId);
  assert.isOk(parent, `parent item ${parentId} should exist`);
  return parent!;
}

function getRequestTag(request: Record<string, unknown>) {
  const parameter = request.parameter as Record<string, unknown> | undefined;
  return normalizeString(parameter?.tag);
}

function assertParentHasTag(request: Record<string, unknown>) {
  const parent = getRequestParent(request);
  const tag = getRequestTag(request);
  assert.isNotEmpty(tag);
  assert.include(
    parent.getTags().map((entry) => entry.tag),
    tag,
  );
}

function assertParentDoesNotHaveTag(request: Record<string, unknown>) {
  const parent = getRequestParent(request);
  const tag = getRequestTag(request);
  if (!tag) {
    return;
  }
  assert.notInclude(
    parent.getTags().map((entry) => entry.tag),
    tag,
  );
}

function assertParentHasTags(
  request: Record<string, unknown>,
  expectedTags: string[],
) {
  const parent = getRequestParent(request);
  const tags = parent.getTags().map((entry) => entry.tag);
  for (const tag of expectedTags) {
    assert.include(tags, tag);
  }
}

function getParentAttachmentTitles(request: Record<string, unknown>) {
  const parent = getRequestParent(request);
  return parent
    .getAttachments()
    .map((id) => Zotero.Items.get(id))
    .filter(Boolean)
    .map((attachment) => normalizeString(attachment!.getField("title")));
}

function assertParentHasAttachmentTitles(
  request: Record<string, unknown>,
  expectedTitles: string[],
) {
  const titles = getParentAttachmentTitles(request);
  for (const title of expectedTitles) {
    assert.include(titles, title);
  }
}

function getDebugStepId(request: Record<string, unknown>) {
  const parameter = isRecord(request.parameter) ? request.parameter : {};
  return (
    normalizeString(parameter.step_id) ||
    normalizeString(request.id) ||
    "step"
  );
}

function latestTaskState(run: IntegrationRun) {
  return run.runState.queue.getJob(run.runState.jobIds[0])?.state;
}

function latestTaskError(run: IntegrationRun) {
  return run.runState.queue.getJob(run.runState.jobIds[0])?.error || "";
}

function findRequestReadyUpdate(run: IntegrationRun, requestId: string) {
  return run.taskUpdates.find(
    (entry) =>
      normalizeString(entry.meta?.requestId) === requestId &&
      entry.meta?.skillRunnerRequestReady === true &&
      entry.meta?.skillRunnerSubmitPhase === "request_ready",
  );
}

describe("workflow single-result behavior integration", function () {
  beforeEach(function () {
    clearRuntimeLogs();
    resetWorkflowTasks();
    resetTaskDashboardHistory();
    resetSkillRunnerRunStoreForTests();
    resetAcpSkillRunsForTests();
    resetPluginStateStoreForTests();
    resetWorkflowHostApiForTests();
    setDebugModeOverrideForTests(true);
  });

  afterEach(function () {
    clearRuntimeLogs();
    resetWorkflowTasks();
    resetTaskDashboardHistory();
    resetSkillRunnerRunStoreForTests();
    resetAcpSkillRunsForTests();
    resetPluginStateStoreForTests();
    resetWorkflowHostApiForTests();
    setDebugModeOverrideForTests();
  });

  it("runs the SkillRunner single-result happy path with task focus, request-ready projection, and apply", async function () {
    const requestId = "sr-single-result-happy";
    const run = await runDebugApplyWorkflow({
      provider: "skillrunner",
      scenario: async ({ request, onProgress }) => {
        onProgress?.({ type: "request-creating" });
        onProgress?.({ type: "request-created", requestId });
        onProgress?.({ type: "request-ready", requestId });
        return makeTerminalSuccess({
          request,
          requestId,
          provider: "skillrunner",
        });
      },
    });

    assert.equal(run.providerCalls[0]?.requestKind, "skillrunner.job.v1");
    assert.equal(run.applySummary.succeeded, 1);
    assert.equal(run.applySummary.failed, 0);
    assertParentHasTag(run.request);
    assert.isAtLeast(
      run.taskUpdates.filter((entry) => entry.state === "queued").length,
      1,
    );
    assert.isOk(findRequestReadyUpdate(run, requestId));
    assert.lengthOf(run.focusCalls, 1);
    assert.equal(run.focusCalls[0].selectionChanged, true);
    assert.include(normalizeString(run.focusCalls[0].taskId), "job-1");
    assert.isUndefined(run.focusCalls[0].requestId);
    assert.lengthOf(run.assistantCalls, 0);

    const stored = getSkillRunnerRunRecordByRequest({
      backendId: SKILLRUNNER_BACKEND.id,
      requestId,
    });
    assert.equal(stored?.status, "succeeded");
    assert.equal(stored?.apply.state, "succeeded");
    assert.equal(stored?.submitPhase, "request_ready");
  });

  it("runs the ACP Skills single-result happy path through request adaptation, selection, and apply", async function () {
    const requestId = "acp-single-result-happy";
    const run = await runDebugApplyWorkflow({
      provider: "acp",
      scenario: async ({ request, requestKind, onProgress }) => {
        assert.equal(requestKind, ACP_SKILL_RUN_REQUEST_KIND);
        onProgress?.({ type: "request-ready", requestId });
        return makeTerminalSuccess({
          request,
          requestId,
          provider: "acp",
        });
      },
    });

    assert.equal(run.request.kind, ACP_SKILL_RUN_REQUEST_KIND);
    assert.equal(run.providerCalls[0]?.backendType, "acp");
    assert.deepEqual(run.selectedAcpRuns, [requestId]);
    assert.lengthOf(run.assistantCalls, 0);
    assert.lengthOf(run.focusCalls, 0);
    assert.equal(run.applySummary.succeeded, 1);
    assert.equal(run.applySummary.failed, 0);
    assertParentHasTag(run.request);
  });

  it("runs the SkillRunner single-bundle happy path with request-ready projection and bundle apply", async function () {
    const requestId = "sr-single-bundle-happy";
    const run = await runDebugApplyWorkflow({
      provider: "skillrunner",
      workflowId: SINGLE_BUNDLE_WORKFLOW_ID,
      scenario: async ({ request, onProgress }) => {
        onProgress?.({ type: "request-creating" });
        onProgress?.({ type: "request-created", requestId });
        onProgress?.({ type: "request-ready", requestId });
        return makeTerminalSuccess({
          request,
          requestId,
          provider: "skillrunner",
          fetchType: "bundle",
        });
      },
    });

    assert.equal(run.providerCalls[0]?.requestKind, "skillrunner.job.v1");
    assert.equal(run.applySummary.succeeded, 1);
    assert.equal(run.applySummary.failed, 0);
    assert.isOk(findRequestReadyUpdate(run, requestId));
    assert.lengthOf(run.focusCalls, 1);
    assert.lengthOf(run.assistantCalls, 0);
    assertParentHasAttachmentTitles(run.request, [
      "bundle debug bundle artifact",
    ]);

    const stored = getSkillRunnerRunRecordByRequest({
      backendId: SKILLRUNNER_BACKEND.id,
      requestId,
    });
    assert.equal(stored?.status, "succeeded");
    assert.equal(stored?.apply.state, "succeeded");
    assert.equal(stored?.submitPhase, "request_ready");
  });

  it("runs the SkillRunner manifest-bundle workflow and applies the manifest-listed artifact", async function () {
    const requestId = "sr-manifest-bundle-happy";
    const run = await runDebugApplyWorkflow({
      provider: "skillrunner",
      workflowId: MANIFEST_BUNDLE_WORKFLOW_ID,
      scenario: async ({ request, onProgress }) => {
        onProgress?.({ type: "request-creating" });
        onProgress?.({ type: "request-created", requestId });
        onProgress?.({ type: "request-ready", requestId });
        return makeTerminalSuccess({
          request,
          requestId,
          provider: "skillrunner",
          fetchType: "bundle",
          manifestBundle: true,
        });
      },
    });

    assert.equal(run.request.kind, "skillrunner.job.v1");
    assert.equal(run.request.skill_id, "debug-apply-manifest-bundle-probe");
    assert.equal(run.request.fetch_type, "bundle");
    assert.equal(run.applySummary.succeeded, 1);
    assert.equal(run.applySummary.failed, 0);
    assert.isOk(findRequestReadyUpdate(run, requestId));
    assertParentHasAttachmentTitles(run.request, [
      "bundle debug bundle artifact",
    ]);

    const stored = getSkillRunnerRunRecordByRequest({
      backendId: SKILLRUNNER_BACKEND.id,
      requestId,
    });
    assert.equal(stored?.status, "succeeded");
    assert.equal(stored?.apply.state, "succeeded");
    assert.deepInclude(stored?.result?.resultJson as Record<string, unknown>, {
      artifact_manifest_path: "result/debug-apply-artifacts.json",
    });
  });

  it("runs the SkillRunner sequence-result happy path with foreground step apply", async function () {
    const run = await runDebugApplyWorkflow({
      provider: "skillrunner",
      workflowId: SEQUENCE_RESULT_WORKFLOW_ID,
      requestKind: "skillrunner.sequence.v1",
      scenario: async ({ request, requestKind, onProgress }) => {
        const stepId = getDebugStepId(request);
        const requestId = `sr-sequence-result-${stepId}`;
        assert.equal(requestKind, "skillrunner.job.v1");
        onProgress?.({ type: "request-created", requestId });
        onProgress?.({ type: "request-ready", requestId });
        return makeTerminalSuccess({
          request,
          requestId,
          provider: "skillrunner",
          fetchType: "result",
        });
      },
    });

    assert.equal(run.request.kind, "skillrunner.sequence.v1");
    assert.lengthOf(run.providerCalls, 2);
    assert.deepEqual(
      run.providerCalls.map((entry) => getDebugStepId(entry.request)),
      ["result_one", "result_two"],
    );
    assert.isOk(findRequestReadyUpdate(run, "sr-sequence-result-result_one"));
    assert.isOk(findRequestReadyUpdate(run, "sr-sequence-result-result_two"));
    assert.equal(run.applySummary.succeeded, 1);
    assert.equal(run.applySummary.failed, 0);
    assert.lengthOf(run.assistantCalls, 0);
    const resultFocusTaskIds = run.focusCalls.map((entry) =>
      normalizeString(entry.taskId),
    );
    assert.isTrue(
      resultFocusTaskIds.some((taskId) => taskId.endsWith(":result_one")),
    );
    assert.isTrue(
      resultFocusTaskIds.some((taskId) => taskId.endsWith(":result_two")),
    );
    assertParentHasTags(run.request, [
      `debug-workflow:${SEQUENCE_RESULT_WORKFLOW_ID}`,
      "debug-step:result_one",
      "debug-step:result_two",
    ]);
  });

  it("runs the SkillRunner sequence-bundle happy path with foreground step bundle apply", async function () {
    const run = await runDebugApplyWorkflow({
      provider: "skillrunner",
      workflowId: SEQUENCE_BUNDLE_WORKFLOW_ID,
      requestKind: "skillrunner.sequence.v1",
      scenario: async ({ request, requestKind, onProgress }) => {
        const stepId = getDebugStepId(request);
        const requestId = `sr-sequence-bundle-${stepId}`;
        assert.equal(requestKind, "skillrunner.job.v1");
        onProgress?.({ type: "request-created", requestId });
        onProgress?.({ type: "request-ready", requestId });
        return makeTerminalSuccess({
          request,
          requestId,
          provider: "skillrunner",
          fetchType: "bundle",
        });
      },
    });

    assert.equal(run.request.kind, "skillrunner.sequence.v1");
    assert.lengthOf(run.providerCalls, 2);
    assert.deepEqual(
      run.providerCalls.map((entry) => getDebugStepId(entry.request)),
      ["bundle_one", "bundle_two"],
    );
    assert.isOk(findRequestReadyUpdate(run, "sr-sequence-bundle-bundle_one"));
    assert.isOk(findRequestReadyUpdate(run, "sr-sequence-bundle-bundle_two"));
    assert.equal(run.applySummary.succeeded, 1);
    assert.equal(run.applySummary.failed, 0);
    assert.lengthOf(run.assistantCalls, 0);
    const bundleFocusTaskIds = run.focusCalls.map((entry) =>
      normalizeString(entry.taskId),
    );
    assert.isTrue(
      bundleFocusTaskIds.some((taskId) => taskId.endsWith(":bundle_one")),
    );
    assert.isTrue(
      bundleFocusTaskIds.some((taskId) => taskId.endsWith(":bundle_two")),
    );
    assertParentHasAttachmentTitles(run.request, [
      "bundle_one debug bundle artifact",
      "bundle_two debug bundle artifact",
    ]);
  });

  it("detaches the SkillRunner interactive choice workflow at waiting_user without applying", async function () {
    const requestId = "sr-interactive-choice-waiting";
    let applyCalls = 0;
    const run = await runDebugApplyWorkflow({
      provider: "skillrunner",
      workflowId: INTERACTIVE_CHOICE_WORKFLOW_ID,
      scenario: async ({ onProgress }) => {
        onProgress?.({ type: "request-creating" });
        onProgress?.({ type: "request-created", requestId });
        onProgress?.({ type: "request-ready", requestId });
        return makeWaitingUserDetach({
          requestId,
          responseJson: makeInteractivePendingPayload({
            interactionId: 41,
          }),
        });
      },
      applyDeps: {
        executeApplyResult: async () => {
          applyCalls += 1;
          throw new Error("waiting_user must not apply");
        },
      },
    });

    assert.equal(latestTaskState(run), "waiting_user");
    assert.equal(run.applySummary.succeeded, 0);
    assert.equal(run.applySummary.failed, 0);
    assert.equal(run.applySummary.pending, 1);
    assert.equal(applyCalls, 0);
    assert.isOk(findRequestReadyUpdate(run, requestId));
    assert.lengthOf(run.assistantCalls, 1);
    assert.lengthOf(run.focusCalls, 0);

    const visible = listWorkflowTasks().find(
      (task) => task.requestId === requestId,
    );
    assert.equal(visible?.state, "waiting_user");
    assert.equal(visible?.skillRunnerLifecycleState, "waiting_user");
    assert.equal(visible?.canReply, true);
    assert.equal(visible?.submitPhase, "request_ready");

    const stored = getSkillRunnerRunRecordByRequest({
      backendId: SKILLRUNNER_BACKEND.id,
      requestId,
    });
    assert.equal(stored?.status, "waiting_user");
    assert.equal(stored?.apply.state, "idle");
    assert.equal(stored?.submitPhase, "request_ready");
  });

  it("submits an interactive option value and foreground-continues the single choice result", async function () {
    const requestId = "sr-interactive-choice-reply";
    const run = await runDebugApplyWorkflow({
      provider: "skillrunner",
      workflowId: INTERACTIVE_CHOICE_WORKFLOW_ID,
      scenario: async ({ onProgress }) => {
        onProgress?.({ type: "request-creating" });
        onProgress?.({ type: "request-created", requestId });
        onProgress?.({ type: "request-ready", requestId });
        return makeWaitingUserDetach({
          requestId,
          responseJson: makeInteractivePendingPayload({
            interactionId: 42,
          }),
        });
      },
    });
    assert.equal(run.applySummary.pending, 1);

    const replyBodies: unknown[] = [];
    await withMockedFetch(
      async (url, init) => {
        if (url.endsWith(`/v1/jobs/${requestId}/interaction/reply`)) {
          replyBodies.push(JSON.parse(String(init?.body || "{}")));
          return createJsonResponse({
            accepted: true,
            request_id: requestId,
          });
        }
        if (url.endsWith(`/v1/jobs/${requestId}`)) {
          return createJsonResponse({
            request_id: requestId,
            status: "succeeded",
          });
        }
        if (url.endsWith(`/v1/jobs/${requestId}/result`)) {
          return createJsonResponse(
            makeInteractiveChoiceResult({
              message: "accepted beta",
            }),
          );
        }
        return createJsonResponse({ error: "unexpected mock fetch" }, 404);
      },
      async () => {
        const client = new SkillRunnerManagementClient({
          baseUrl: SKILLRUNNER_BACKEND.baseUrl,
        });
        await client.submitReply({
          requestId,
          payload: {
            mode: "interaction",
            interaction_id: 42,
            response: "beta",
          },
        });
        const outcome = await continueSkillRunnerForegroundRun({
          backend: SKILLRUNNER_BACKEND,
          requestId,
          source: "test.interactive-choice-reply",
        });
        assert.equal(outcome.status, "succeeded");
      },
    );
    await waitForAsyncWork();

    assert.deepEqual(replyBodies, [
      {
        mode: "interaction",
        interaction_id: 42,
        response: "beta",
      },
    ]);
    const stored = getSkillRunnerRunRecordByRequest({
      backendId: SKILLRUNNER_BACKEND.id,
      requestId,
    });
    assert.equal(stored?.status, "succeeded");
    assert.equal(stored?.apply.state, "succeeded");
    assert.deepInclude(stored?.result?.resultJson as Record<string, unknown>, {
      ok: true,
      accepted_any_reply: true,
    });
  });

  it("detaches an interactive-then-result sequence at waiting_user and resumes with result-step focus", async function () {
    const interactiveRequestId = "sr-interactive-then-result-interactive";
    const resultRequestId = "sr-interactive-then-result-result";
    const run = await runDebugApplyWorkflow({
      provider: "skillrunner",
      workflowId: INTERACTIVE_THEN_RESULT_WORKFLOW_ID,
      requestKind: "skillrunner.sequence.v1",
      scenario: async ({ request, requestKind, onProgress }) => {
        assert.equal(requestKind, "skillrunner.job.v1");
        assert.equal(getDebugStepId(request), "interactive");
        onProgress?.({ type: "request-created", requestId: interactiveRequestId });
        onProgress?.({ type: "request-ready", requestId: interactiveRequestId });
        return makeWaitingUserDetach({
          requestId: interactiveRequestId,
          responseJson: makeInteractivePendingPayload({
            interactionId: 43,
          }),
        });
      },
    });

    assert.equal(run.request.kind, "skillrunner.sequence.v1");
    assert.lengthOf(run.providerCalls, 1);
    assert.equal(getDebugStepId(run.providerCalls[0].request), "interactive");
    assert.equal(latestTaskState(run), "waiting_user");
    assert.equal(run.applySummary.pending, 1);
    assert.isUndefined(
      findRequestReadyUpdate(run, resultRequestId),
      "second step must not start before the user replies",
    );
    assertParentDoesNotHaveTag(run.request);

    const focusedStepTaskIds: string[] = [];
    const createdRequests: Array<Record<string, unknown>> = [];
    const replyBodies: unknown[] = [];
    await withMockedFetch(
      async (url, init) => {
        const method = normalizeString(init?.method).toUpperCase() || "GET";
        if (
          method === "POST" &&
          url.endsWith(`/v1/jobs/${interactiveRequestId}/interaction/reply`)
        ) {
          replyBodies.push(JSON.parse(String(init?.body || "{}")));
          return createJsonResponse({
            accepted: true,
            request_id: interactiveRequestId,
          });
        }
        if (url.endsWith(`/v1/jobs/${interactiveRequestId}`)) {
          return createJsonResponse({
            request_id: interactiveRequestId,
            status: "succeeded",
          });
        }
        if (url.endsWith(`/v1/jobs/${interactiveRequestId}/result`)) {
          return createJsonResponse(makeInteractiveChoiceResult());
        }
        if (method === "POST" && url.endsWith("/v1/jobs")) {
          const body = JSON.parse(String(init?.body || "{}"));
          createdRequests.push(body);
          assert.equal(body.parameter?.step_id, "result");
          return createJsonResponse({
            request_id: resultRequestId,
          });
        }
        if (
          method === "POST" &&
          url.endsWith(`/v1/jobs/${resultRequestId}/upload`)
        ) {
          return createJsonResponse({
            ok: true,
          });
        }
        if (url.endsWith(`/v1/jobs/${resultRequestId}`)) {
          return createJsonResponse({
            request_id: resultRequestId,
            status: "succeeded",
          });
        }
        if (url.endsWith(`/v1/jobs/${resultRequestId}/result`)) {
          return createJsonResponse(
            buildResultJsonFromRequest(
              (run.request as any).steps[1] as Record<string, unknown>,
              {
                workflow_id: INTERACTIVE_THEN_RESULT_WORKFLOW_ID,
                step_id: "result",
                apply_mode: "result",
              },
            ),
          );
        }
        return createJsonResponse(
          {
            error: `unexpected mock fetch: ${method} ${url}`,
          },
          404,
        );
      },
      async () => {
        const client = new SkillRunnerManagementClient({
          baseUrl: SKILLRUNNER_BACKEND.baseUrl,
        });
        await client.submitReply({
          requestId: interactiveRequestId,
          payload: {
            mode: "interaction",
            interaction_id: 43,
            response: "beta",
          },
        });
        const outcome = await continueSkillRunnerForegroundRun({
          backend: SKILLRUNNER_BACKEND,
          requestId: interactiveRequestId,
          source: "test.interactive-then-result-reply",
          uiFocusPolicy: "focus-started-step",
          onSequenceStepFocus: ({ job }) => {
            focusedStepTaskIds.push(job.id);
          },
        });
        assert.equal(outcome.status, "succeeded");
      },
    );
    await waitForAsyncWork();

    assert.deepEqual(replyBodies, [
      {
        mode: "interaction",
        interaction_id: 43,
        response: "beta",
      },
    ]);
    assert.lengthOf(createdRequests, 1);
    assert.isTrue(
      focusedStepTaskIds.some((taskId) => taskId.endsWith(":result")),
      "reply continuation should focus the result step task",
    );
    const resultTask = listWorkflowTasks().find(
      (task) => task.requestId === resultRequestId,
    );
    assert.equal(resultTask?.submitPhase, "request_ready");
    assertParentHasTags(run.request, [
      `debug-workflow:${INTERACTIVE_THEN_RESULT_WORKFLOW_ID}`,
      "debug-step:result",
    ]);
    const resultRecord = getSkillRunnerRunRecordByRequest({
      backendId: SKILLRUNNER_BACKEND.id,
      requestId: resultRequestId,
    });
    assert.equal(resultRecord?.status, "succeeded");
    assert.equal(resultRecord?.apply.state, "skipped");
  });

  for (const entry of [
    {
      title: "fails when SkillRunner create request times out before request-ready",
      requestId: "",
      scenario: async () => {
        const error = new Error("SkillRunner create timed out");
        error.name = "SkillRunnerHttpTimeoutError";
        throw error;
      },
      expectedState: "failed",
      expectRequestReady: false,
    },
    {
      title: "fails when SkillRunner upload fails before request-ready",
      requestId: "sr-upload-failed",
      scenario: async ({ onProgress }: Parameters<ProviderScenario>[0]) => {
        onProgress?.({ type: "request-creating" });
        onProgress?.({ type: "request-created", requestId: "sr-upload-failed" });
        onProgress?.({ type: "request-uploading", requestId: "sr-upload-failed" });
        throw new Error("upload failed");
      },
      expectedState: "failed",
      expectRequestReady: false,
    },
    {
      title: "fails when SkillRunner poll times out after request-ready",
      requestId: "sr-poll-timeout",
      scenario: async ({ onProgress }: Parameters<ProviderScenario>[0]) => {
        onProgress?.({ type: "request-creating" });
        onProgress?.({ type: "request-created", requestId: "sr-poll-timeout" });
        onProgress?.({ type: "request-ready", requestId: "sr-poll-timeout" });
        throw new SkillRunnerPollingTimeoutError({
          requestId: "sr-poll-timeout",
          timeoutMs: 10,
        });
      },
      expectedState: "failed",
      expectRequestReady: true,
    },
  ]) {
    it(entry.title, async function () {
      const run = await runDebugApplyWorkflow({
        provider: "skillrunner",
        scenario: entry.scenario,
      });

      assert.equal(latestTaskState(run), entry.expectedState);
      assert.equal(run.applySummary.succeeded, 0);
      assert.equal(run.applySummary.failed, 1);
      assert.lengthOf(run.applySummary.jobOutcomes, 1);
      assertParentDoesNotHaveTag(run.request);
      if (entry.expectRequestReady) {
        assert.isOk(findRequestReadyUpdate(run, entry.requestId));
      } else {
        assert.isUndefined(findRequestReadyUpdate(run, entry.requestId));
      }
      assert.match(latestTaskError(run), /timeout|upload failed|timed out/i);
    });
  }

  it("maps SkillRunner backend terminal failed and canceled outcomes without applying", async function () {
    for (const terminalStatus of ["failed", "canceled"] as const) {
      resetWorkflowTasks();
      resetTaskDashboardHistory();
      resetSkillRunnerRunStoreForTests();
      const requestId = `sr-terminal-${terminalStatus}`;
      const run = await runDebugApplyWorkflow({
        provider: "skillrunner",
        scenario: async ({ onProgress }) => {
          onProgress?.({ type: "request-creating" });
          onProgress?.({ type: "request-created", requestId });
          onProgress?.({ type: "request-ready", requestId });
          return {
            status: terminalStatus,
            requestId,
            fetchType: "result",
            backendStatus: terminalStatus,
            error:
              terminalStatus === "failed"
                ? "backend terminal failure"
                : undefined,
            responseJson: {
              request_id: requestId,
              status: terminalStatus,
            },
          } as ProviderExecutionResult;
        },
      });

      assert.equal(latestTaskState(run), terminalStatus);
      assert.equal(run.applySummary.succeeded, 0);
      assert.equal(run.applySummary.failed, 1);
      assert.equal(run.applySummary.jobOutcomes[0]?.succeeded, false);
      assertParentDoesNotHaveTag(run.request);
      assert.isOk(findRequestReadyUpdate(run, requestId));
    }
  });

  for (const provider of ["skillrunner", "acp"] as const) {
    it(`marks ${provider} single-result apply failure without rewriting provider success`, async function () {
      const requestId = `${provider}-apply-failed`;
      let applyCalls = 0;
      const run = await runDebugApplyWorkflow({
        provider,
        scenario: async ({ request, onProgress }) => {
          onProgress?.({ type: "request-ready", requestId });
          return makeTerminalSuccess({
            request,
            requestId,
            provider,
          });
        },
        applyDeps: {
          executeApplyResult: async () => {
            applyCalls += 1;
            throw new Error("apply exploded");
          },
        },
      });

      assert.equal(applyCalls, 1);
      assert.equal(latestTaskState(run), "succeeded");
      assert.equal(run.applySummary.succeeded, 0);
      assert.equal(run.applySummary.failed, 1);
      assert.match(run.applySummary.failureReasons[0] || "", /apply exploded/);
      assertParentDoesNotHaveTag(run.request);

      if (provider === "skillrunner") {
        const stored = getSkillRunnerRunRecordByRequest({
          backendId: SKILLRUNNER_BACKEND.id,
          requestId,
        });
        assert.equal(stored?.status, "failed");
        assert.equal(stored?.backendStatus, "succeeded");
        assert.equal(stored?.apply.state, "failed");
      } else {
        const stored = getAcpSkillRunRecord(requestId);
        assert.equal(stored?.status, "failed");
        assert.equal(stored?.backendStatus, "succeeded");
        assert.equal(stored?.applyResultState, "failed");
      }
      const visible = listWorkflowTasks().find((task) => task.requestId === requestId);
      assert.equal(visible?.state, "failed");
      assert.equal(visible?.backendStatus, "succeeded");
    });
  }

  it("persists request-ready single-result projection into the visible task list", async function () {
    const requestId = "sr-visible-request-ready";
    const run = await runDebugApplyWorkflow({
      provider: "skillrunner",
      scenario: async ({ request, onProgress }) => {
        onProgress?.({ type: "request-creating" });
        onProgress?.({ type: "request-created", requestId });
        onProgress?.({ type: "request-ready", requestId });
        return makeTerminalSuccess({
          request,
          requestId,
          provider: "skillrunner",
        });
      },
    });

    const visibleTasks = listWorkflowTasks();
    const visible = visibleTasks.find((task) => task.requestId === requestId);
    assert.isOk(visible);
    assert.equal(visible?.state, "succeeded");
    assert.equal(visible?.skillRunnerLifecycleState, "succeeded");
    assert.equal(visible?.requestAssigned, true);
    assert.equal(visible?.submitPhase, "request_ready");
    assert.equal(
      buildWorkflowTaskRecordFromJob(
        run.runState.queue.getJob(run.runState.jobIds[0]) as any,
      ).requestId,
      requestId,
    );
  });
});
