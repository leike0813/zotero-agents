import type { BackendInstance } from "../backends/types";
import { listBackendInstancesSync } from "../backends/registry";
import { DEFAULT_BACKEND_TYPE } from "../config/defaults";
import type { JobRecord, JobState } from "../jobQueue/manager";
import { SkillRunnerClient } from "../providers/skillrunner/client";
import { maybeObserveSkillRunnerAutoReplyRun } from "./skillRunnerAutoReplyObserver";
import { executeWithProvider as executeWithProviderFromRegistry } from "../providers/registry";
import type {
  ProviderExecutionResult,
  SkillRunnerJobRequestV1,
  SkillRunnerSequenceRequestV1,
} from "../providers/contracts";
import { executeApplyResult } from "../workflows/runtime";
import { ZipBundleReader } from "../workflows/zipBundleReader";
import type { LoadedWorkflow } from "../workflows/types";
import { appendRuntimeLog } from "./runtimeLogManager";
import { collectSkillRunFeedbackSidecar } from "./skillRunFeedback";
import {
  createSkillRunnerRun,
  getSkillRunnerRunRecordByRequest,
  listSkillRunnerRunRecords,
  projectSkillRunnerRun,
  recordSkillRunnerObserverFailure,
  recordSkillRunnerProgress,
  updateSkillRunnerRunApplyState,
  updateSkillRunnerRunResult,
  updateSkillRunnerRunStateByRunKey,
  type SkillRunnerRunRecord,
} from "./skillRunnerRunStore";
import { isNonRecoverableSkillRunnerFailure } from "./skillRunnerRecoverableState";
import { buildSkillRunnerRunRecordRequestPayload } from "./skillRunnerInteractiveAutoReply";
import { isWaiting } from "./skillRunnerProviderStateMachine";
import {
  syncWorkflowTaskFromSkillRunnerProjection,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import { canWorkflowRunWithoutSelection } from "./workflowSelectionPolicy";
import {
  buildTempBundlePath,
  createDirectoryBundleReader,
  createUnavailableBundleReader,
  removeFileIfExists,
  writeBytes,
  type BundleReader,
} from "./workflowExecution/bundleIO";
import { createWorkflowResultContext } from "./workflowExecution/resultContext";
import { resolveTargetParentIDFromRequest } from "./workflowExecution/requestMeta";
import {
  applySequenceStepResultIfNeeded,
  buildSequenceResult,
  buildStepRequest,
  continueSkillRunnerSequence,
  matchesShortCircuitRule,
  outputsByStepFromState,
  resolveStepOutput,
  type ApplySequenceStepResult,
} from "./workflowExecution/sequenceRuntime";
import {
  getSequenceRunState,
  getSequenceRunStateByStepRequest,
  markSequenceRunTerminal,
  recordSequenceStepWaiting,
  recordSequenceStepSucceeded,
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
  const updated = updateSkillRunnerRunStateByRunKey({
    runKey: args.record.runKey,
    state: args.state,
    error: args.error,
    updatedAt,
    eventType:
      args.state === "succeeded" ||
      args.state === "failed" ||
      args.state === "canceled"
        ? "backend.terminal"
        : "backend.snapshot",
    eventPayload: {
      source: args.source,
      state: args.state,
    },
  });
  if (updated) {
    syncWorkflowTaskFromSkillRunnerProjection(
      projectSkillRunnerRun({ run: updated }),
    );
  }
}

async function createBundleReaderForRunResult(args: {
  result: Extract<ProviderExecutionResult, { status: "succeeded" }>;
  requestId: string;
}) {
  let bundlePath = "";
  let bundleReader: BundleReader = createUnavailableBundleReader(
    args.requestId,
  );
  if (args.result.bundleBytes?.length) {
    bundlePath = buildTempBundlePath(args.requestId);
    await writeBytes(bundlePath, args.result.bundleBytes);
    bundleReader = new ZipBundleReader(bundlePath);
  } else if (args.result.bundleDir) {
    bundleReader = createDirectoryBundleReader(args.result.bundleDir);
  }
  return { bundleReader, bundlePath };
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
  let bundlePath = "";
  try {
    const bundleResource = await createBundleReaderForRunResult({
      result: args.runResult,
      requestId: requestId || args.jobId || "skillrunner-run",
    });
    bundlePath = bundleResource.bundlePath;
    const resultContext = await createWorkflowResultContext({
      runResult: args.runResult,
      bundleReader: bundleResource.bundleReader,
      manifest: args.workflow.manifest,
    });
    args.runResult.resultJson = resultContext.resultJson;
    const applied = await executeApplyResult({
      workflow: args.workflow,
      parent: args.parent,
      bundleReader: bundleResource.bundleReader,
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
      bundleReader: bundleResource.bundleReader,
      jobId: args.jobId,
      sequenceStep: args.sequenceStep,
      appendRuntimeLog,
    });
    return applied;
  } finally {
    if (bundlePath) {
      await removeFileIfExists(bundlePath);
    }
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
  updateSkillRunnerRunApplyState({
    backendId: args.record.backendId,
    requestId: args.record.requestId || "",
    state: "running",
    updatedAt: nowIso(),
    eventType: "apply.started",
    eventPayload: {
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
    updateSkillRunnerRunResult({
      backendId: args.record.backendId,
      requestId: args.record.requestId || "",
      resultJson: runResult.resultJson,
      resultJsonPath: runResult.resultJsonPath,
      workspaceDir: runResult.workspaceDir,
      updatedAt: nowIso(),
      eventPayload: {
        source: args.source,
        foreground: true,
      },
    });
    updateSkillRunnerRunApplyState({
      backendId: args.record.backendId,
      requestId: args.record.requestId || "",
      state: "succeeded",
      attempt: 0,
      updatedAt: nowIso(),
      eventType: "apply.succeeded",
      eventPayload: {
        source: args.source,
        foreground: true,
      },
    });
  } catch (error) {
    const message = compactError(error);
    updateSkillRunnerRunApplyState({
      backendId: args.record.backendId,
      requestId: args.record.requestId || "",
      state: "failed",
      error: message,
      updatedAt: nowIso(),
      eventType: "apply.failed",
      eventPayload: {
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
  const runRecord = createSkillRunnerRun({
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
  });
  const nextRunRecord = runRecord
    ? recordSkillRunnerProgress({
        runKey: runRecord.runKey,
        event: args.event as any,
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

function shouldSkipFinalSequenceApply(args: {
  request: SkillRunnerSequenceRequestV1;
  result: Extract<ProviderExecutionResult, { status: "succeeded" }>;
}) {
  const finalStepId =
    normalizeString(args.result.sequence?.final_step_id) ||
    normalizeString(args.request.final_step_id);
  if (!finalStepId) {
    return false;
  }
  const finalStep = args.request.steps.find(
    (entry) => normalizeString(entry.id) === finalStepId,
  );
  return !!finalStep?.apply_result;
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
  updateSkillRunnerRunApplyState({
    backendId: args.backend.id,
    requestId: args.requestId,
    state: args.state,
    error: args.error,
    updatedAt: nowIso(),
    eventType:
      args.state === "running"
        ? "apply.started"
        : args.state === "succeeded"
          ? "apply.succeeded"
          : args.state === "failed"
            ? "apply.failed"
            : "apply.skipped",
    eventPayload: {
      source: args.source,
      foreground: true,
      sequenceRunId: args.sequenceState.sequenceRunId,
      workflowRunId: args.sequenceState.workflowRunId,
      reason: normalizeString(args.reason) || undefined,
    },
  });
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
    shouldSkipFinalSequenceApply({
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

function buildCurrentStepRequest(args: {
  record: SkillRunnerRunRecord;
  sequenceState: SequenceRunState;
  stepIndex: number;
}) {
  if (isRecord(args.record.requestPayload)) {
    return args.record.requestPayload as SkillRunnerJobRequestV1;
  }
  const step = args.sequenceState.request.steps[args.stepIndex];
  const outputsByStep = outputsByStepFromState(args.sequenceState);
  const previousStep = args.sequenceState.request.steps
    .slice(0, args.stepIndex)
    .reverse()
    .find((candidate) => outputsByStep.has(candidate.id));
  const reusableRequest = args.sequenceState.steps
    .slice(0, args.stepIndex)
    .reverse()
    .find((candidate) => normalizeString(candidate.requestId));
  return buildStepRequest({
    sequence: args.sequenceState.request,
    step,
    stepIndex: args.stepIndex,
    workflowRunId: args.sequenceState.workflowRunId,
    previousStepId: previousStep?.id || "",
    outputsByStep,
    backendType: args.sequenceState.backendType,
    workspaceRequestId: reusableRequest?.requestId,
  }) as SkillRunnerJobRequestV1;
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
  const output = resolveStepOutput(args.result);
  recordSequenceStepSucceeded({
    sequenceRunId: args.sequenceState.sequenceRunId,
    stepIndex,
    requestId,
    output,
    result: args.result,
  });
  updateSkillRunnerRunResult({
    backendId: args.record.backendId,
    requestId,
    resultJson: args.result.resultJson,
    resultJsonPath: args.result.resultJsonPath,
    workspaceDir: args.result.workspaceDir,
    updatedAt: nowIso(),
    eventPayload: {
      source: args.source,
      foreground: true,
      sequenceStepId: step.id,
      sequenceStepIndex: stepIndex,
    },
  });
  const stateAfterSucceeded =
    getSequenceRunState(args.sequenceState.sequenceRunId) || args.sequenceState;
  const stepRequest = buildCurrentStepRequest({
    record: args.record,
    sequenceState: stateAfterSucceeded,
    stepIndex,
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
  await applySequenceStepResultIfNeeded({
    state: stateAfterSucceeded,
    stepIndex,
    stepRequest,
    stepResult: args.result,
    output,
    backend: args.backend,
    appendRuntimeLog,
    applySequenceStepResult,
  });
  const latestState =
    getSequenceRunState(args.sequenceState.sequenceRunId) ||
    stateAfterSucceeded;
  const isFinal = step.id === latestState.request.final_step_id;
  const shortCircuited = matchesShortCircuitRule({ step, output });
  if (isFinal || shortCircuited) {
    markSequenceRunTerminal({
      sequenceRunId: latestState.sequenceRunId,
      status: "completed",
    });
    const terminalState =
      getSequenceRunState(latestState.sequenceRunId) || latestState;
    const sequenceResult = buildSequenceResult({
      finalResult: {
        ...args.result,
        resultJson: output,
      },
      workflowRunId: terminalState.workflowRunId,
      finalStepId: terminalState.request.final_step_id,
      outputsByStep: outputsByStepFromState(terminalState),
      shortCircuitStepId: shortCircuited ? step.id : undefined,
    });
    await applySequenceRootResultIfNeeded({
      record: args.record,
      backend: args.backend,
      sequenceState: terminalState,
      result: sequenceResult as Extract<
        ProviderExecutionResult,
        { status: "succeeded" }
      >,
      source: args.source,
    });
    return;
  }
  const continuationResult = await continueSkillRunnerSequence({
    sequenceRunId: latestState.sequenceRunId,
    startIndex: stepIndex + 1,
    backend: args.backend,
    providerOptions:
      latestState.providerOptions ||
      resolveContinuationProviderOptions({
        record: args.record,
        sequenceState: latestState,
      }),
    appendRuntimeLog,
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
    applySequenceStepResult,
    onProgress: (event) => {
      const persisted = persistContinuationStepJob({
        record: args.record,
        sequenceState:
          getSequenceRunState(latestState.sequenceRunId) || latestState,
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
      getSequenceRunState(latestState.sequenceRunId) || latestState;
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
  recordSequenceStepWaiting({
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
  markSequenceRunTerminal({
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
      recordSkillRunnerObserverFailure({
        runKey: record.runKey,
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
