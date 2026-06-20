import type { BackendInstance } from "../backends/types";
import { DEFAULT_BACKEND_TYPE } from "../config/defaults";
import type { JobRecord, JobState } from "../jobQueue/manager";
import { SkillRunnerClient } from "../providers/skillrunner/client";
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
  getSkillRunnerRunRecordByRequest,
  updateSkillRunnerRunApplyState,
  updateSkillRunnerRunResult,
  updateSkillRunnerRunStateByRequest,
  upsertSkillRunnerRunFromTask,
  type SkillRunnerRunRecord,
} from "./skillRunnerRunStore";
import { isWaiting } from "./skillRunnerProviderStateMachine";
import {
  buildWorkflowTaskRecordFromJob,
  recordWorkflowTaskUpdate,
  updateWorkflowTaskStateByRequest,
} from "./taskRuntime";
import {
  recordTaskDashboardHistoryFromJob,
  updateTaskDashboardHistoryStateByRequest,
} from "./taskDashboardHistory";
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
import {
  mapSkillRunnerProgressLifecycle,
  mapSkillRunnerSequenceStepProgressState,
  mapSkillRunnerSubmitPhase,
} from "./skillRunnerProgressMapping";

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
      result: Extract<ProviderExecutionResult, { status: "failed" | "canceled" }>;
    };

type ContinuationUiFocusPolicy =
  | "none"
  | "focus-started-step";

type ContinuationSequenceStepFocusHandler = (args: {
  job: JobRecord;
  event: Record<string, unknown>;
}) => void;

function shouldFocusContinuationStep(args: {
  policy?: ContinuationUiFocusPolicy;
  event: Record<string, unknown>;
  job: JobRecord;
}) {
  const policy = args.policy || "none";
  const eventType = normalizeString(args.event.type);
  if (
    eventType === "sequence-step-started" &&
    policy === "focus-started-step"
  ) {
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
    getLoadedWorkflowEntries().find((entry) => entry.manifest.id === normalized) ||
    null;
  if (workflow) {
    return workflow;
  }
  await rescanWorkflowRegistry();
  workflow =
    getLoadedWorkflowEntries().find((entry) => entry.manifest.id === normalized) ||
    null;
  return workflow;
}

function resolveFetchType(args: {
  record: SkillRunnerRunRecord;
  request?: unknown;
}) {
  if (args.record.fetchType === "result" || args.record.fetchType === "bundle") {
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
  const timeoutMs = Number(request.poll.timeout_ms);
  return {
    ...(Number.isFinite(intervalMs) ? { interval_ms: intervalMs } : {}),
    ...(Number.isFinite(timeoutMs) ? { timeout_ms: timeoutMs } : {}),
  };
}

function backendFromRecord(record: SkillRunnerRunRecord): BackendInstance {
  return {
    id: record.backendId,
    type: record.backendType || DEFAULT_BACKEND_TYPE,
    baseUrl: record.backendBaseUrl || "",
  };
}

function setRequestState(args: {
  record: SkillRunnerRunRecord;
  state: JobState;
  error?: string;
  source: string;
}) {
  const updatedAt = nowIso();
  updateWorkflowTaskStateByRequest({
    backendId: args.record.backendId,
    backendType: args.record.backendType || DEFAULT_BACKEND_TYPE,
    requestId: args.record.requestId || "",
    state: args.state,
    error: args.error,
    updatedAt,
  });
  updateTaskDashboardHistoryStateByRequest({
    backendId: args.record.backendId,
    requestId: args.record.requestId || "",
    state: args.state,
    error: args.error,
    updatedAt,
  });
  updateSkillRunnerRunStateByRequest({
    backendId: args.record.backendId,
    requestId: args.record.requestId || "",
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
}

async function createBundleReaderForRunResult(args: {
  result: Extract<ProviderExecutionResult, { status: "succeeded" }>;
  requestId: string;
}) {
  let bundlePath = "";
  let bundleReader: BundleReader = createUnavailableBundleReader(args.requestId);
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
    runId: args.record.runId,
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
  const request = args.record.requestPayload;
  const targetParentID =
    args.record.taskProjection.targetParentID ||
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
      bundleDir: runResult.bundleDir,
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
  if (!stepId) {
    return null;
  }
  const requestId = normalizeString(args.event.requestId);
  const sequenceStepIndex = normalizeSequenceStepIndex(
    args.event.sequenceStepIndex,
  );
  const taskName =
    normalizeString(args.event.sequenceStepTaskName) ||
    `${args.sequenceState.workflowLabel || args.sequenceState.workflowId} / ${stepId}`;
  const now = nowIso();
  const lifecycle = mapSkillRunnerProgressLifecycle(args.event);
  const submitPhase = mapSkillRunnerSubmitPhase(args.event);
  const job: JobRecord = {
    id: `${args.sequenceState.jobId}:${stepId}`,
    workflowId: args.sequenceState.workflowId,
    request: args.event.sequenceStepRequest || args.sequenceState.request,
    meta: {
      index: sequenceStepIndex,
      runId: args.record.runId || args.sequenceState.workflowRunId,
      workflowRunId: args.sequenceState.workflowRunId,
      workflowLabel: args.sequenceState.workflowLabel,
      jobId: `${args.sequenceState.jobId}:${stepId}`,
      localRunId: `${args.record.runId || args.sequenceState.workflowRunId}:${args.sequenceState.jobId}:${stepId}`,
      requestId: requestId || undefined,
      requestKind: "skillrunner.job.v1",
      backendId: args.backend.id,
      backendType: args.backend.type,
      backendBaseUrl: args.backend.baseUrl,
      providerId: args.record.providerId || "skillrunner",
      taskName,
      inputUnitLabel: taskName,
      targetParentID: resolveTargetParentIDFromRequest(
        args.sequenceState.request,
      ),
      skillId: normalizeString(args.event.sequenceStepSkillId) || undefined,
      sequenceStepId: stepId,
      sequenceStepIndex,
      sequenceJobId:
        normalizeString(args.event.sequenceJobId) || args.sequenceState.jobId,
      skillRunnerRequestReady:
        args.event.type === "request-ready" ||
        args.event.type === "sequence-step-deferred" ||
        args.event.type === "sequence-step-succeeded",
      skillRunnerLifecycleState: lifecycle || undefined,
      skillRunnerSubmitPhase: submitPhase || undefined,
      skillRunnerSubmitStartedAt: now,
    },
    state: mapSkillRunnerSequenceStepProgressState(args.event),
    error: normalizeString(args.event.error) || undefined,
    createdAt: now,
    updatedAt: now,
  };
  return job;
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
  recordWorkflowTaskUpdate(job);
  recordTaskDashboardHistoryFromJob(job);
  const task = buildWorkflowTaskRecordFromJob(job);
  upsertSkillRunnerRunFromTask(task, {
    role: "sequence_step",
    requestPayload: job.request,
    providerOptions: args.sequenceState.providerOptions,
    fetchType: resolveFetchType({
      record: args.record,
      request: job.request,
    }),
    sequence: {
      sequenceRunId: args.sequenceState.sequenceRunId,
      workflowRunId: args.sequenceState.workflowRunId,
      jobId: args.sequenceState.jobId,
      stepId: normalizeString(args.event.sequenceStepId) || undefined,
      stepIndex: normalizeSequenceStepIndex(args.event.sequenceStepIndex),
      finalStepId: args.sequenceState.finalStepId,
    },
    eventType: "backend.snapshot",
    eventPayload: {
      source: "skillRunnerForegroundContinuation",
      eventType: normalizeString(args.event.type),
    },
  });
  return job;
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
      runId: args.sequenceState.workflowRunId || args.record.runId,
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
    bundleDir: args.result.bundleDir,
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
  const applySequenceStepResult: ApplySequenceStepResult = async (stepApply) => {
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
        runId: args.record.runId,
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
    getSequenceRunState(args.sequenceState.sequenceRunId) || stateAfterSucceeded;
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
    providerOptions: latestState.providerOptions || args.record.providerOptions,
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
      const job = persistContinuationStepJob({
        record: args.record,
        sequenceState:
          getSequenceRunState(latestState.sequenceRunId) || latestState,
        backend: args.backend,
        event: event as Record<string, unknown>,
      });
      if (
        job &&
        shouldFocusContinuationStep({
          policy: args.uiFocusPolicy,
          event: event as Record<string, unknown>,
          job,
        })
      ) {
        args.onSequenceStepFocus?.({
          job,
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

const foregroundContinuationInFlight = new Map<string, Promise<ContinuationOutcome>>();

function resolveForegroundContinuationKey(args: {
  backendId?: string;
  requestId: string;
}) {
  return `${normalizeString(args.backendId) || "__skillrunner__"}:${normalizeString(args.requestId)}`;
}

async function continueSkillRunnerForegroundRunNow(args: {
  backend?: BackendInstance;
  requestId: string;
  source?: string;
  uiFocusPolicy?: ContinuationUiFocusPolicy;
  onSequenceStepFocus?: ContinuationSequenceStepFocusHandler;
}): Promise<ContinuationOutcome> {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const record = getSkillRunnerRunRecordByRequest({
    backendId: args.backend?.id,
    requestId,
  });
  if (!record) {
    throw new Error(`SkillRunner run record not found: ${requestId}`);
  }
  const backend = args.backend || backendFromRecord(record);
  if (!normalizeString(backend.baseUrl)) {
    throw new Error(`SkillRunner backend baseUrl is unavailable: ${backend.id}`);
  }
  const source = normalizeString(args.source) || "skillRunnerForegroundContinuation";
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
