import type { BackendInstance } from "../backends/types";
import { listBackendInstancesSync } from "../backends/registry";
import { DEFAULT_BACKEND_TYPE } from "../config/defaults";
import type { JobRecord, JobState } from "../jobQueue/manager";
import { SkillRunnerClient } from "../providers/skillrunner/client";
import { maybeObserveSkillRunnerAutoReplyRun } from "./skillRunnerAutoReplyObserver";
import { executeWithProvider as executeWithProviderFromRegistry } from "../providers/registry";
import type { ProviderExecutionResult } from "../providers/contracts";
import { executeApplyResult } from "../workflows/runtime";
import type { LoadedWorkflow } from "../workflows/types";
import { appendRuntimeLog } from "./runtimeLogManager";
import { collectSkillRunFeedbackSidecar } from "./skillRunFeedback";
import {
  applySkillRunnerRunEvent,
  getSkillRunnerRunRecordByRequest,
  listSkillRunnerRunRecords,
  projectSkillRunnerRun,
  type SkillRunnerRunRecord,
} from "./skillRunnerRunStore";
import { isNonRecoverableSkillRunnerFailure } from "./skillRunnerRecoverableState";
import { buildSkillRunnerRunRecordRequestPayload } from "./skillRunnerInteractiveAutoReply";
import { isWaiting } from "./skillRunnerProviderStateMachine";
import {
  syncWorkflowTaskFromSkillRunnerProjection,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import { canWorkflowRunWithoutSelection } from "../workflows/triggerPolicy";
import { openRunResultBundleReader } from "./workflowExecution/bundleIO";
import { createWorkflowResultContext } from "./workflowExecution/resultContext";
import { resolveTargetParentIDFromRequest } from "./workflowExecution/requestMeta";
import {
  acceptCompletedSequenceStep,
  sequenceTerminalStepOwnsApply,
  type ApplySequenceStepResult,
} from "./workflowExecution/sequenceRuntime";
import {
  applySequenceRunEvent,
  getSequenceRunState,
  getSequenceRunStateByStepRequest,
  type SequenceRunState,
} from "./workflowExecution/sequenceStateStore";
import { executeSequenceStepApply } from "./workflowExecution/sequenceStepApply";
import {
  getLoadedWorkflowEntries,
  rescanWorkflowRegistry,
} from "./workflowRuntime";

type ContinuationOutcome =
  | {
      status: "waiting";
      result: Extract<ProviderExecutionResult, { status: "deferred" }>;
    }
  | {
      status: "succeeded";
      result: Extract<ProviderExecutionResult, { status: "succeeded" }>;
    }
  | {
      status: "failed" | "canceled";
      result: Extract<
        ProviderExecutionResult,
        { status: "failed" | "canceled" }
      >;
    };

type ContinuationUiFocusPolicy = "none" | "focus-started-step";

type ContinuationSequenceStepFocusHandler = (args: {
  job: JobRecord;
  taskRecord: WorkflowTaskRecord;
  runRecord: SkillRunnerRunRecord | null;
  runKey: string;
  event: Record<string, unknown>;
}) => void;

function shouldFocusContinuationStep(args: {
  policy?: ContinuationUiFocusPolicy;
  event: Record<string, unknown>;
  job: JobRecord;
}) {
  const policy = args.policy || "none";
  const eventType = normalizeString(args.event.type);
  if (eventType === "request-created" && policy === "focus-started-step") {
    return true;
  }
  return false;
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function compactError(error: unknown) {
  return error instanceof Error
    ? error.message
    : normalizeString(error) || "unknown error";
}

async function resolveWorkflow(workflowId: string) {
  const normalized = normalizeString(workflowId);
  if (!normalized) {
    return null;
  }
  let workflow =
    getLoadedWorkflowEntries().find(
      (entry) => entry.manifest.id === normalized,
    ) || null;
  if (workflow) {
    return workflow;
  }
  await rescanWorkflowRegistry();
  workflow =
    getLoadedWorkflowEntries().find(
      (entry) => entry.manifest.id === normalized,
    ) || null;
  return workflow;
}

function resolveFetchType(args: {
  record: SkillRunnerRunRecord;
  request?: unknown;
}) {
  if (
    args.record.fetchType === "result" ||
    args.record.fetchType === "bundle"
  ) {
    return args.record.fetchType;
  }
  if (isRecord(args.request) && args.request.fetch_type === "result") {
    return "result";
  }
  return "bundle";
}

function resolvePollOptions(request: unknown) {
  if (!isRecord(request) || !isRecord(request.poll)) {
    return undefined;
  }
  const intervalMs = Number(request.poll.interval_ms);
  return {
    ...(Number.isFinite(intervalMs) ? { interval_ms: intervalMs } : {}),
  };
}

function backendFromRecord(record: SkillRunnerRunRecord): BackendInstance {
  const backend = listBackendInstancesSync().find(
    (entry) => normalizeString(entry.id) === normalizeString(record.backendId),
  );
  if (backend) {
    return backend;
  }
  return {
    id: record.backendId,
    type: DEFAULT_BACKEND_TYPE,
    baseUrl: "",
  };
}

function cloneProviderOptions(value: unknown) {
  return isRecord(value) ? { ...value } : undefined;
}

function resolveContinuationProviderOptions(args: {
  record: SkillRunnerRunRecord;
  sequenceState: SequenceRunState;
}) {
  const requestPayload = isRecord(args.record.requestPayload)
    ? args.record.requestPayload
    : {};
  const recordOptions = cloneProviderOptions(requestPayload.providerOptions);
  const stateOptions = cloneProviderOptions(args.sequenceState.providerOptions);
  if (!recordOptions && !stateOptions) {
    return undefined;
  }
  return {
    ...(recordOptions || {}),
    ...(stateOptions || {}),
  };
}

function resolveContinuationTargetParentID(args: {
  record: SkillRunnerRunRecord;
  sequenceState: SequenceRunState;
}) {
  return (
    resolveTargetParentIDFromRequest(args.record.requestPayload) ??
    resolveTargetParentIDFromRequest(args.sequenceState.request) ??
    undefined
  );
}

function buildContinuationBaseMeta(args: {
  record: SkillRunnerRunRecord;
  sequenceState: SequenceRunState;
}) {
  const providerOptions = resolveContinuationProviderOptions(args);
  const requestPayload = isRecord(args.record.requestPayload)
    ? args.record.requestPayload
    : {};
  return {
    providerId: "skillrunner",
    providerOptions,
    engine: normalizeString(providerOptions?.engine) || undefined,
    inputUnitIdentity:
      normalizeString(requestPayload.inputUnitIdentity) || undefined,
    targetParentID: resolveContinuationTargetParentID(args),
  };
}

function resolveExecutionModeFromRequest(request: unknown) {
  const payload = isRecord(request) ? request : {};
  const runtimeOptions = isRecord(payload.runtime_options)
    ? payload.runtime_options
    : {};
  return normalizeString(runtimeOptions.execution_mode) === "interactive"
    ? "interactive"
    : "auto";
}

function setRequestState(args: {
  record: SkillRunnerRunRecord;
  state: JobState;
  error?: string;
  source: string;
}) {
  const updatedAt = nowIso();
  const updated = applySkillRunnerRunEvent(
    args.state === "succeeded" ||
      args.state === "failed" ||
      args.state === "canceled"
      ? {
          type: "backend.terminal",
          runKey: args.record.runKey,
          backendId: args.record.backendId,
          status: args.state as "succeeded" | "failed" | "canceled",
          error: args.error,
          updatedAt,
          payload: {
            source: args.source,
            state: args.state,
          },
        }
      : {
          type: "backend.snapshot",
          runKey: args.record.runKey,
          backendId: args.record.backendId,
          state: args.state,
          error: args.error,
          updatedAt,
          payload: {
            source: args.source,
            state: args.state,
          },
        },
  );
  if (updated) {
    syncWorkflowTaskFromSkillRunnerProjection(
      projectSkillRunnerRun({ run: updated }),
    );
  }
}

function buildTerminalRunResult(args: {
  record: SkillRunnerRunRecord;
  backend: BackendInstance;
  result: Extract<ProviderExecutionResult, { status: "succeeded" }>;
}) {
  return {
    ...args.result,
    backendId: args.backend.id,
    backendType: args.backend.type,
    runId: args.record.workflowRunId,
    jobId: args.record.jobId,
  } as Extract<ProviderExecutionResult, { status: "succeeded" }> &
    Record<string, unknown>;
}

async function applyWorkflowResult(args: {
  workflow: LoadedWorkflow;
  parent: Zotero.Item | number | string | null;
  request: unknown;
  runResult: Extract<ProviderExecutionResult, { status: "succeeded" }> &
    Record<string, unknown>;
  jobId: string;
  sequenceStep?: {
    id: string;
    index: number;
    workflowId: string;
    skillId: string;
    finalStep: boolean;
    phase: "sequence-step";
  };
}) {
  const requestId = normalizeString(args.runResult.requestId);
  let bundleResource:
    | Awaited<ReturnType<typeof openRunResultBundleReader>>
    | undefined;
  try {
    bundleResource = await openRunResultBundleReader({
      result: args.runResult,
      requestId: requestId || args.jobId || "skillrunner-run",
    });
    const bundleReader = bundleResource.bundleReader;
    const resultContext = await createWorkflowResultContext({
      runResult: args.runResult,
      bundleReader,
      manifest: args.workflow.manifest,
    });
    args.runResult.resultJson = resultContext.resultJson;
    const applied = await executeApplyResult({
      workflow: args.workflow,
      parent: args.parent,
      bundleReader,
      resultContext,
      request: args.request,
      runResult: args.runResult,
      sequenceStep: args.sequenceStep,
    });
    await collectSkillRunFeedbackSidecar({
      workflow: args.workflow,
      request: args.request,
      runResult: args.runResult,
      resultContext,
      bundleReader,
      jobId: args.jobId,
      sequenceStep: args.sequenceStep,
      appendRuntimeLog,
    });
    return applied;
  } finally {
    await bundleResource?.dispose();
  }
}

async function applySingleTerminalSuccess(args: {
  record: SkillRunnerRunRecord;
  backend: BackendInstance;
  result: Extract<ProviderExecutionResult, { status: "succeeded" }>;
  source: string;
}) {
  const workflow = await resolveWorkflow(args.record.workflowId);
  if (!workflow) {
    throw new Error(`workflow not found for apply: ${args.record.workflowId}`);
  }
  const request = isRecord(args.record.requestPayload)
    ? args.record.requestPayload
    : {};
  const targetParentID =
    resolveTargetParentIDFromRequest(args.record.requestPayload) ||
    resolveTargetParentIDFromRequest(request);
  const parent = targetParentID || null;
  if (!parent && !canWorkflowRunWithoutSelection(workflow.manifest)) {
    throw new Error(
      `workflow '${workflow.manifest.id}' requires a selection for applyResult`,
    );
  }
  const runResult = buildTerminalRunResult({
    record: args.record,
    backend: args.backend,
    result: args.result,
  });
  applySkillRunnerRunEvent({
    type: "apply.started",
    backendId: args.record.backendId,
    requestId: args.record.requestId || "",
    updatedAt: nowIso(),
    source: args.source,
    payload: {
      source: args.source,
      foreground: true,
    },
  });
  try {
    await applyWorkflowResult({
      workflow,
      parent,
      request,
      runResult,
      jobId: args.record.jobId,
    });
    applySkillRunnerRunEvent({
      type: "result.fetched",
      backendId: args.record.backendId,
      requestId: args.record.requestId || "",
      resultJson: runResult.resultJson,
      resultJsonPath: runResult.resultJsonPath,
      workspaceDir: runResult.workspaceDir,
      updatedAt: nowIso(),
      payload: {
        source: args.source,
        foreground: true,
      },
    });
    applySkillRunnerRunEvent({
      type: "apply.succeeded",
      backendId: args.record.backendId,
      requestId: args.record.requestId || "",
      attempt: 0,
      updatedAt: nowIso(),
      source: args.source,
      payload: {
        source: args.source,
        foreground: true,
      },
    });
  } catch (error) {
    const message = compactError(error);
    applySkillRunnerRunEvent({
      type: "apply.failed",
      backendId: args.record.backendId,
      requestId: args.record.requestId || "",
      error: message,
      updatedAt: nowIso(),
      source: args.source,
      payload: {
        source: args.source,
        foreground: true,
      },
    });
    throw error;
  }
}

function normalizeSequenceStepIndex(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
}

function buildContinuationStepJob(args: {
  record: SkillRunnerRunRecord;
  sequenceState: SequenceRunState;
  backend: BackendInstance;
  event: Record<string, unknown>;
}) {
  const stepId = normalizeString(args.event.sequenceStepId);
  const stepIndex = normalizeSequenceStepIndex(args.event.sequenceStepIndex);
  const step =
    typeof stepIndex === "number"
      ? args.sequenceState.request.steps[stepIndex]
      : undefined;
  if (!stepId || typeof stepIndex !== "number" || !step) {
    return null;
  }
  const stepRequest = isRecord(args.event.sequenceStepRequest)
    ? args.event.sequenceStepRequest
    : {};
  const baseMeta = buildContinuationBaseMeta(args);
  const createdAt = nowIso();
  return {
    id: `${args.sequenceState.jobId}:${stepId}`,
    workflowId: args.sequenceState.workflowId,
    request: stepRequest,
    meta: {
      ...baseMeta,
      runId: args.sequenceState.workflowRunId,
      workflowRunId: args.sequenceState.workflowRunId,
      workflowLabel:
        normalizeString(args.sequenceState.workflowLabel) ||
        args.sequenceState.workflowId,
      taskName:
        normalizeString(args.event.sequenceStepTaskName) ||
        `${args.sequenceState.workflowLabel || args.sequenceState.workflowId} / ${stepId}`,
      skillId: normalizeString(args.event.sequenceStepSkillId) || step.skill_id,
      skillName: normalizeString(args.event.sequenceStepSkillName) || undefined,
      sequenceJobId: args.sequenceState.jobId,
      sequenceStepId: stepId,
      sequenceStepIndex: stepIndex,
      sequenceStepSkillId:
        normalizeString(args.event.sequenceStepSkillId) || step.skill_id,
      sequenceStepSkillName:
        normalizeString(args.event.sequenceStepSkillName) || undefined,
      requestKind: "skillrunner.job.v1",
      requestId: normalizeString(args.event.requestId) || undefined,
      backendId: args.backend.id,
      backendType: args.backend.type,
      executionMode: resolveExecutionModeFromRequest(stepRequest),
      skillRunnerRequestReady:
        normalizeString(args.event.type) === "request-ready" ||
        !!normalizeString(args.event.requestId),
      skillRunnerSubmitPhase:
        normalizeString(args.event.type) === "request-ready"
          ? "request_ready"
          : undefined,
    },
    state: "running",
    createdAt,
    updatedAt: createdAt,
  } satisfies JobRecord;
}

function applyContinuationStepProgressEvent(args: {
  record: SkillRunnerRunRecord;
  backend: BackendInstance;
  event: Record<string, unknown>;
  updatedAt: string;
}) {
  const event = args.event;
  const type = normalizeString(event.type);
  const requestId = normalizeString(event.requestId) || args.record.requestId;
  if (type === "request-created") {
    return applySkillRunnerRunEvent({
      type: "request.created",
      runKey: args.record.runKey,
      backendId: args.record.backendId,
      requestId: normalizeString(event.requestId),
      updatedAt: args.updatedAt,
    });
  }
  if (type === "request-creating" || type === "sequence-step-started") {
    return applySkillRunnerRunEvent({
      type: "submit.request_creating",
      runKey: args.record.runKey,
      backendId: args.record.backendId,
      requestId,
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "request-uploading") {
    return applySkillRunnerRunEvent({
      type: "submit.uploading",
      runKey: args.record.runKey,
      backendId: args.record.backendId,
      requestId,
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "request-ready") {
    return applySkillRunnerRunEvent({
      type: "request.ready",
      runKey: args.record.runKey,
      backendId: args.record.backendId,
      requestId,
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "sequence-step-deferred") {
    if (normalizeString(event.detachReason) === "observer_failure") {
      return applySkillRunnerRunEvent({
        type: "run.observer_detached",
        runKey: args.record.runKey,
        backendId: args.record.backendId,
        requestId: normalizeString(event.requestId) || args.record.requestId,
        error: normalizeString(event.error) || "observer failure",
        source: "sequence-step-deferred",
        updatedAt: args.updatedAt,
      });
    }
    return applySkillRunnerRunEvent({
      type: "backend.snapshot",
      runKey: args.record.runKey,
      backendId: args.record.backendId,
      state:
        normalizeString(event.backendStatus) === "queued" ||
        normalizeString(event.backendStatus) === "waiting_user" ||
        normalizeString(event.backendStatus) === "waiting_auth"
          ? (normalizeString(event.backendStatus) as JobState)
          : "running",
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "sequence-step-succeeded") {
    return applySkillRunnerRunEvent({
      type: "sequence.step.settled",
      runKey: args.record.runKey,
      backendId: args.record.backendId,
      requestId,
      status: "succeeded",
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "sequence-step-failed") {
    return applySkillRunnerRunEvent({
      type: "sequence.step.settled",
      runKey: args.record.runKey,
      backendId: args.record.backendId,
      requestId,
      status: "failed",
      error: normalizeString(event.error) || undefined,
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "sequence-step-canceled") {
    return applySkillRunnerRunEvent({
      type: "sequence.step.settled",
      runKey: args.record.runKey,
      backendId: args.record.backendId,
      requestId,
      status: "canceled",
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  return applySkillRunnerRunEvent({
    type: "backend.snapshot",
    runKey: args.record.runKey,
    backendId: args.record.backendId,
    state: args.record.status,
    updatedAt: args.updatedAt,
    payload: event,
  });
}

function persistContinuationStepJob(args: {
  record: SkillRunnerRunRecord;
  sequenceState: SequenceRunState;
  backend: BackendInstance;
  event: Record<string, unknown>;
}) {
  const job = buildContinuationStepJob(args);
  if (!job) {
    return null;
  }
  const runRecord = applySkillRunnerRunEvent({
    type: "submit.local_created",
    backendId: args.backend.id,
    updatedAt: job.updatedAt,
    init: {
      backendId: args.backend.id,
      workflowId: args.sequenceState.workflowId,
      workflowRunId: args.sequenceState.workflowRunId,
      jobId: job.id,
      taskName: normalizeString(job.meta.taskName) || job.id,
      skillId: normalizeString(job.meta.skillId) || undefined,
      sequenceRunId: args.sequenceState.sequenceRunId,
      sequenceJobId: args.sequenceState.jobId,
      sequenceStepId: normalizeString(args.event.sequenceStepId) || undefined,
      requestPayload: buildSkillRunnerRunRecordRequestPayload({
        request: job.request,
        providerOptions: resolveContinuationProviderOptions({
          record: args.record,
          sequenceState: args.sequenceState,
        }),
      }),
      fetchType: resolveFetchType({
        record: args.record,
        request: job.request,
      }),
      executionMode: resolveExecutionModeFromRequest(job.request),
      updatedAt: job.updatedAt,
    },
  });
  const nextRunRecord = runRecord
    ? applyContinuationStepProgressEvent({
        record: runRecord,
        backend: args.backend,
        event: args.event,
        updatedAt: job.updatedAt,
      }) || runRecord
    : null;
  const taskRecord = nextRunRecord
    ? projectSkillRunnerRun({ run: nextRunRecord })
    : null;
  const runKey = normalizeString(nextRunRecord?.runKey || taskRecord?.runKey);
  return {
    job,
    taskRecord: taskRecord || {
      id: job.id,
      runId: args.sequenceState.workflowRunId,
      jobId: job.id,
      workflowId: args.sequenceState.workflowId,
      workflowLabel:
        normalizeString(args.sequenceState.workflowLabel) ||
        args.sequenceState.workflowId,
      taskName: normalizeString(job.meta.taskName) || job.id,
      backendId: args.backend.id,
      backendType: args.backend.type,
      state: "running",
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
    runRecord: nextRunRecord,
    runKey,
  };
}

export function buildSkillRunnerForegroundContinuationStepJobForTests(args: {
  record: SkillRunnerRunRecord;
  sequenceState: SequenceRunState;
  backend: BackendInstance;
  event: Record<string, unknown>;
}) {
  return buildContinuationStepJob(args);
}

function updateSequenceRootApplyState(args: {
  backend: BackendInstance;
  requestId: string;
  sequenceState: SequenceRunState;
  state: "running" | "succeeded" | "failed" | "skipped";
  source: string;
  error?: string;
  reason?: string;
}) {
  applySkillRunnerRunEvent(
    args.state === "running"
      ? {
          type: "apply.started",
          backendId: args.backend.id,
          requestId: args.requestId,
          updatedAt: nowIso(),
          source: args.source,
          payload: {
            source: args.source,
            foreground: true,
            sequenceRunId: args.sequenceState.sequenceRunId,
            workflowRunId: args.sequenceState.workflowRunId,
            reason: normalizeString(args.reason) || undefined,
          },
        }
      : args.state === "succeeded"
        ? {
            type: "apply.succeeded",
            backendId: args.backend.id,
            requestId: args.requestId,
            updatedAt: nowIso(),
            source: args.source,
            payload: {
              source: args.source,
              foreground: true,
              sequenceRunId: args.sequenceState.sequenceRunId,
              workflowRunId: args.sequenceState.workflowRunId,
              reason: normalizeString(args.reason) || undefined,
            },
          }
        : args.state === "failed"
          ? {
              type: "apply.failed",
              backendId: args.backend.id,
              requestId: args.requestId,
              error: args.error,
              updatedAt: nowIso(),
              source: args.source,
              payload: {
                source: args.source,
                foreground: true,
                sequenceRunId: args.sequenceState.sequenceRunId,
                workflowRunId: args.sequenceState.workflowRunId,
                reason: normalizeString(args.reason) || undefined,
              },
            }
          : {
              type: "apply.skipped",
              backendId: args.backend.id,
              requestId: args.requestId,
              error: args.error,
              updatedAt: nowIso(),
              source: args.source,
              payload: {
                source: args.source,
                foreground: true,
                sequenceRunId: args.sequenceState.sequenceRunId,
                workflowRunId: args.sequenceState.workflowRunId,
                reason: normalizeString(args.reason) || undefined,
              },
            },
  );
}

async function applySequenceRootResultIfNeeded(args: {
  record: SkillRunnerRunRecord;
  backend: BackendInstance;
  sequenceState: SequenceRunState;
  result: Extract<ProviderExecutionResult, { status: "succeeded" }>;
  source: string;
}) {
  const resultRequestId = normalizeString(args.result.requestId);
  if (
    sequenceTerminalStepOwnsApply({
      request: args.sequenceState.request,
      result: args.result,
    })
  ) {
    updateSequenceRootApplyState({
      backend: args.backend,
      requestId: resultRequestId,
      sequenceState: args.sequenceState,
      state: "skipped",
      source: args.source,
      reason: "final-step-owns-apply-result",
    });
    return;
  }
  updateSequenceRootApplyState({
    backend: args.backend,
    requestId: resultRequestId,
    sequenceState: args.sequenceState,
    state: "running",
    source: args.source,
  });
  try {
    const workflow = await resolveWorkflow(args.sequenceState.workflowId);
    if (!workflow) {
      throw new Error(
        `sequence workflow not found for apply: ${args.sequenceState.workflowId}`,
      );
    }
    const parent =
      resolveTargetParentIDFromRequest(args.sequenceState.request) || null;
    if (!parent && !canWorkflowRunWithoutSelection(workflow.manifest)) {
      throw new Error(
        `workflow '${workflow.manifest.id}' requires a selection for applyResult`,
      );
    }
    const runResult = {
      ...args.result,
      backendId: args.backend.id,
      backendType: args.backend.type,
      runId: args.sequenceState.workflowRunId || args.record.workflowRunId,
      jobId: args.sequenceState.jobId,
    } as Extract<ProviderExecutionResult, { status: "succeeded" }> &
      Record<string, unknown>;
    await applyWorkflowResult({
      workflow,
      parent,
      request: args.sequenceState.request,
      runResult,
      jobId: args.sequenceState.jobId,
    });
    updateSequenceRootApplyState({
      backend: args.backend,
      requestId: resultRequestId,
      sequenceState: args.sequenceState,
      state: "succeeded",
      source: args.source,
    });
  } catch (error) {
    const message = compactError(error);
    updateSequenceRootApplyState({
      backend: args.backend,
      requestId: resultRequestId,
      sequenceState: args.sequenceState,
      state: "failed",
      error: message,
      source: args.source,
    });
    throw error;
  }
}

async function applySequenceTerminalStep(args: {
  record: SkillRunnerRunRecord;
  backend: BackendInstance;
  sequenceState: SequenceRunState;
  result: Extract<ProviderExecutionResult, { status: "succeeded" }>;
  source: string;
  uiFocusPolicy?: ContinuationUiFocusPolicy;
  onSequenceStepFocus?: ContinuationSequenceStepFocusHandler;
}) {
  const requestId = normalizeString(args.result.requestId);
  const stepIndex = args.sequenceState.steps.findIndex(
    (step) => normalizeString(step.requestId) === requestId,
  );
  const step = args.sequenceState.request.steps[stepIndex];
  if (stepIndex < 0 || !step) {
    return;
  }
  applySkillRunnerRunEvent({
    type: "result.fetched",
    backendId: args.record.backendId,
    requestId,
    resultJson: args.result.resultJson,
    resultJsonPath: args.result.resultJsonPath,
    workspaceDir: args.result.workspaceDir,
    updatedAt: nowIso(),
    payload: {
      source: args.source,
      foreground: true,
      sequenceStepId: step.id,
      sequenceStepIndex: stepIndex,
    },
  });
  const applySequenceStepResult: ApplySequenceStepResult = async (
    stepApply,
  ) => {
    const applyWorkflow = await resolveWorkflow(stepApply.applyWorkflowId);
    if (!applyWorkflow) {
      throw new Error(
        `sequence step apply workflow not found: ${stepApply.applyWorkflowId}`,
      );
    }
    return executeSequenceStepApply({
      workflow: applyWorkflow,
      parent:
        resolveTargetParentIDFromRequest(stepApply.sequenceRequest) || null,
      request: stepApply.stepRequest,
      runResult: {
        ...stepApply.stepResult,
        resultJson: stepApply.output,
        backendId: args.backend.id,
        backendType: args.backend.type,
        runId: args.record.workflowRunId,
        sequence: {
          workflow_run_id: stepApply.workflowRunId,
          final_step_id: stepApply.sequenceRequest.final_step_id,
          steps: stepApply.sequenceSteps,
        },
      },
      sequenceStep: {
        id: stepApply.step.id,
        index: stepApply.stepIndex,
        workflowId: stepApply.applyWorkflowId,
        skillId: stepApply.step.skill_id,
        finalStep: stepApply.finalStep,
        phase: "sequence-step",
      },
    });
  };
  const continuationResult = await acceptCompletedSequenceStep({
    sequenceRunId: args.sequenceState.sequenceRunId,
    stepIndex,
    stepResult: args.result,
    backend: args.backend,
    providerOptions:
      args.sequenceState.providerOptions ||
      resolveContinuationProviderOptions({
        record: args.record,
        sequenceState: args.sequenceState,
      }),
    appendRuntimeLog,
    applySequenceStepResult,
    executeWithProvider: ({
      requestKind,
      request,
      backend,
      providerOptions,
      onProgress,
      orchestrationContext,
    }) =>
      executeWithProviderFromRegistry({
        requestKind,
        request,
        backend,
        providerOptions: providerOptions || {},
        onProgress,
        orchestrationContext,
      }),
    onProgress: (event) => {
      const persisted = persistContinuationStepJob({
        record: args.record,
        sequenceState:
          getSequenceRunState(args.sequenceState.sequenceRunId) ||
          args.sequenceState,
        backend: args.backend,
        event: event as Record<string, unknown>,
      });
      if (
        persisted &&
        shouldFocusContinuationStep({
          policy: args.uiFocusPolicy,
          event: event as Record<string, unknown>,
          job: persisted.job,
        })
      ) {
        args.onSequenceStepFocus?.({
          job: persisted.job,
          taskRecord: persisted.taskRecord,
          runRecord: persisted.runRecord,
          runKey: persisted.runKey,
          event: event as Record<string, unknown>,
        });
      }
    },
  });
  if (continuationResult.status === "succeeded") {
    const terminalState =
      getSequenceRunState(args.sequenceState.sequenceRunId) ||
      args.sequenceState;
    await applySequenceRootResultIfNeeded({
      record: args.record,
      backend: args.backend,
      sequenceState: terminalState,
      result: continuationResult,
      source: args.source,
    });
  }
}

function markSequenceDeferred(args: {
  record: SkillRunnerRunRecord;
  sequenceState: SequenceRunState;
  result: Extract<ProviderExecutionResult, { status: "deferred" }>;
}) {
  const stepIndex = args.sequenceState.steps.findIndex(
    (step) => normalizeString(step.requestId) === args.result.requestId,
  );
  if (stepIndex < 0) {
    return;
  }
  applySequenceRunEvent({
    type: "sequence.step.waiting",
    sequenceRunId: args.sequenceState.sequenceRunId,
    stepIndex,
    requestId: args.result.requestId,
    result: args.result,
  });
}

function markSequenceTerminalFailure(args: {
  sequenceState: SequenceRunState;
  status: "failed" | "canceled";
  error?: string;
}) {
  applySequenceRunEvent({
    type: "sequence.run.terminal",
    sequenceRunId: args.sequenceState.sequenceRunId,
    status: args.status,
    error: args.error,
  });
}

const foregroundContinuationInFlight = new Map<
  string,
  Promise<ContinuationOutcome>
>();

function resolveForegroundContinuationKey(args: {
  backendId?: string;
  requestId: string;
}) {
  return `${normalizeString(args.backendId) || "__skillrunner__"}:${normalizeString(args.requestId)}`;
}

function findContinuationRunRecord(args: {
  backendId?: string;
  requestId: string;
}) {
  return (
    getSkillRunnerRunRecordByRequest({
      backendId: args.backendId,
      requestId: args.requestId,
    }) ||
    listSkillRunnerRunRecords({ requestId: args.requestId, limit: 1 })[0] ||
    null
  );
}

async function continueSkillRunnerForegroundRunNow(args: {
  backend?: BackendInstance;
  record?: SkillRunnerRunRecord;
  requestId: string;
  source?: string;
  uiFocusPolicy?: ContinuationUiFocusPolicy;
  onSequenceStepFocus?: ContinuationSequenceStepFocusHandler;
}): Promise<ContinuationOutcome> {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const record =
    args.record ||
    findContinuationRunRecord({
      backendId: args.backend?.id,
      requestId,
    });
  if (!record) {
    throw new Error(`SkillRunner run record not found: ${requestId}`);
  }
  const backend = args.backend || backendFromRecord(record);
  if (!normalizeString(backend.baseUrl)) {
    throw new Error(
      `SkillRunner backend baseUrl is unavailable: ${backend.id}`,
    );
  }
  const source =
    normalizeString(args.source) || "skillRunnerForegroundContinuation";
  const request = record.requestPayload;
  const fetchType = resolveFetchType({ record, request });
  const client = new SkillRunnerClient({
    baseUrl: backend.baseUrl,
    backendId: backend.id,
  });
  setRequestState({
    record,
    state: "running",
    source,
  });
  let result: ProviderExecutionResult;
  try {
    result = await client.settleExistingRun({
      requestId,
      fetchType,
      poll: resolvePollOptions(request),
      skillId: record.skillId,
    });
  } catch (error) {
    const message = compactError(error);
    if (!isNonRecoverableSkillRunnerFailure(error)) {
      applySkillRunnerRunEvent({
        type: "run.observer_detached",
        runKey: record.runKey,
        backendId: record.backendId,
        requestId: record.requestId,
        error,
        source,
      });
      appendRuntimeLog({
        level: "warn",
        scope: "job",
        workflowId: record.workflowId,
        backendId: record.backendId,
        backendType: DEFAULT_BACKEND_TYPE,
        providerId: "skillrunner",
        runId: record.workflowRunId,
        jobId: record.jobId,
        requestId,
        component: "skillrunner-foreground-continuation",
        operation: "observer-failure-detached",
        phase: source,
        stage: "observer-failure-detached",
        message:
          "skillrunner foreground continuation detached after recoverable observer failure",
        error,
      });
      return {
        status: "waiting",
        result: {
          status: "deferred",
          requestId,
          fetchType,
          backendStatus: "running",
          detachReason: "observer_failure",
          continuationOwner: "recovery",
        },
      };
    }
    setRequestState({
      record,
      state: "failed",
      error: message,
      source,
    });
    const sequenceState = getSequenceRunStateByStepRequest(requestId);
    if (sequenceState) {
      markSequenceTerminalFailure({
        sequenceState,
        status: "failed",
        error: message,
      });
    }
    throw error;
  }
  const sequenceState = getSequenceRunStateByStepRequest(requestId);
  if (result.status === "deferred") {
    if (isWaiting(result.backendStatus)) {
      setRequestState({
        record,
        state: result.backendStatus,
        source,
      });
      if (sequenceState) {
        markSequenceDeferred({
          record,
          sequenceState,
          result,
        });
      }
      if (result.backendStatus === "waiting_user") {
        const latestRecord =
          getSkillRunnerRunRecordByRequest({
            backendId: backend.id,
            requestId,
          }) || record;
        maybeObserveSkillRunnerAutoReplyRun({
          backend,
          requestId,
          record: latestRecord,
          source: `${source}:waiting`,
        });
      }
      return { status: "waiting", result };
    }
    setRequestState({
      record,
      state: result.backendStatus,
      source,
    });
    return { status: "waiting", result };
  }
  if (result.status === "failed" || result.status === "canceled") {
    const error = result.status === "failed" ? result.error : undefined;
    setRequestState({
      record,
      state: result.status,
      error,
      source,
    });
    if (sequenceState) {
      markSequenceTerminalFailure({
        sequenceState,
        status: result.status,
        error,
      });
    }
    return { status: result.status, result };
  }
  setRequestState({
    record,
    state: "succeeded",
    source,
  });
  const succeededResult = result as Extract<
    ProviderExecutionResult,
    { status: "succeeded" }
  >;
  if (sequenceState) {
    await applySequenceTerminalStep({
      record,
      backend,
      sequenceState,
      result: succeededResult,
      source,
      uiFocusPolicy: args.uiFocusPolicy,
      onSequenceStepFocus: args.onSequenceStepFocus,
    });
    return { status: "succeeded", result: succeededResult };
  }
  await applySingleTerminalSuccess({
    record,
    backend,
    result: succeededResult,
    source,
  });
  return { status: "succeeded", result: succeededResult };
}

export async function continueSkillRunnerForegroundRun(args: {
  backend?: BackendInstance;
  record?: SkillRunnerRunRecord;
  requestId: string;
  source?: string;
  uiFocusPolicy?: ContinuationUiFocusPolicy;
  onSequenceStepFocus?: ContinuationSequenceStepFocusHandler;
}): Promise<ContinuationOutcome> {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const key = resolveForegroundContinuationKey({
    backendId: args.backend?.id,
    requestId,
  });
  const existing = foregroundContinuationInFlight.get(key);
  if (existing) {
    return existing;
  }
  const task = continueSkillRunnerForegroundRunNow({
    ...args,
    requestId,
  }).finally(() => {
    foregroundContinuationInFlight.delete(key);
  });
  foregroundContinuationInFlight.set(key, task);
  return task;
}

export function getSkillRunnerForegroundContinuationRuntimeForTests() {
  return {
    inFlightCount: foregroundContinuationInFlight.size,
    inFlightKeys: Array.from(foregroundContinuationInFlight.keys()),
  };
}

export function resetSkillRunnerForegroundContinuationForTests() {
  foregroundContinuationInFlight.clear();
}
