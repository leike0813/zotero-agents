import { appendRuntimeLog } from "../../runtimeLogManager";
import { stopSessionSync } from "./skillRunnerSessionSyncManager";
import {
  isTerminal,
  isWaiting,
  normalizeStatus,
  normalizeStatusWithGuard,
  validateTransition,
  type SkillRunnerStateMachineViolation,
  type SkillRunnerProviderState,
} from "./skillRunnerProviderStateMachine";
import {
  applySkillRunnerRunEvent,
  buildSkillRunnerSingleRunKey,
  buildSkillRunnerSequenceRunKey,
  getSkillRunnerRunRecord,
} from "./skillRunnerRunStore";
import type { JobRecord, JobExecutionOutcome } from "../../../jobQueue/manager";
import type { ProviderProgressEvent } from "../../../providers/types";
import {
  coerceRecoverableSkillRunnerState,
  getSkillRunnerRequestIdFromJob,
  hasRecoverableSkillRunnerRequest,
  isNonRecoverableSkillRunnerFailure,
  isSkillRunnerRequestReadyForRecovery,
} from "./skillRunnerRecoverableState";
import { buildSkillRunnerRunRecordRequestPayload } from "./skillRunnerInteractiveAutoReply";
import { resolveSkillRunnerExecutionModeFromRequest } from "./skillRunnerExecutionMode";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  const text = normalizeString(value).toLowerCase();
  if (text === "true") {
    return true;
  }
  if (text === "false") {
    return false;
  }
  return undefined;
}

function messageFromResponse(response: Record<string, unknown>) {
  for (const key of ["message", "reason", "error", "detail"]) {
    const value = response[key];
    const text = normalizeString(value);
    if (text) {
      return text;
    }
    if (isObject(value)) {
      return JSON.stringify(value);
    }
  }
  return undefined;
}

export type SkillRunnerManagementResponseSemantic = {
  accepted?: boolean;
  status: SkillRunnerProviderState;
  terminalStatus?: Extract<
    SkillRunnerProviderState,
    "succeeded" | "failed" | "canceled"
  >;
  nonTerminalStatus?: Exclude<
    SkillRunnerProviderState,
    "succeeded" | "failed" | "canceled"
  >;
  message?: string;
  hasPendingField: boolean;
  hasPendingPayload: boolean;
  shouldClearPending: boolean;
};

export function resolveSkillRunnerManagementResponseSemantic(args: {
  response: unknown;
  fallbackStatus?: SkillRunnerProviderState;
}): SkillRunnerManagementResponseSemantic {
  const response = isObject(args.response) ? args.response : {};
  const status = normalizeStatus(
    response.status,
    args.fallbackStatus || "running",
  );
  const accepted = hasOwn(response, "accepted")
    ? normalizeBoolean(response.accepted)
    : undefined;
  const terminal = isTerminal(status)
    ? (status as Extract<
        SkillRunnerProviderState,
        "succeeded" | "failed" | "canceled"
      >)
    : undefined;
  const hasPendingField = hasOwn(response, "pending");
  const hasPendingPayload = isObject(response.pending);
  return {
    accepted,
    status,
    terminalStatus: terminal,
    nonTerminalStatus: terminal
      ? undefined
      : (status as Exclude<
          SkillRunnerProviderState,
          "succeeded" | "failed" | "canceled"
        >),
    message: messageFromResponse(response),
    hasPendingField,
    hasPendingPayload,
    shouldClearPending:
      !!terminal ||
      (!isWaiting(status) && (!hasPendingField || !hasPendingPayload)),
  };
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return normalizeString(error);
}

export function settleSkillRunnerRunAsFailed(args: {
  backendId?: string;
  backendType?: string;
  providerId?: string;
  workflowId?: string;
  runId?: string;
  jobId?: string;
  requestId: string;
  reason?: string;
  source: string;
  error?: unknown;
  updatedAt?: string;
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return {
      updatedActiveCount: 0,
      updatedHistoryCount: 0,
      updatedRun: false,
      stoppedSession: false,
    };
  }
  const backendId = normalizeString(args.backendId);
  const updatedAt = normalizeString(args.updatedAt) || new Date().toISOString();
  const error =
    normalizeString(args.reason) ||
    stringifyError(args.error) ||
    "SkillRunner run is unavailable";
  const updatedRun = !!applySkillRunnerRunEvent({
    type: "run.terminal_client_error",
    backendId,
    requestId,
    error,
    updatedAt,
    source: args.source,
    payload: {
      source: args.source,
      reason: error,
    },
  });
  stopSessionSync({
    backendId,
    requestId,
  });
  appendRuntimeLog({
    level: "warn",
    scope: "job",
    workflowId: normalizeString(args.workflowId) || undefined,
    backendId: backendId || undefined,
    backendType: normalizeString(args.backendType) || undefined,
    providerId: normalizeString(args.providerId) || "skillrunner",
    runId: normalizeString(args.runId) || undefined,
    jobId: normalizeString(args.jobId) || undefined,
    requestId,
    component: "skillrunner-run-settlement",
    operation: "settle-run-failed",
    phase: "terminal",
    stage: "skillrunner-run-terminal-client-error",
    message:
      "skillrunner request settled as failed after terminal run-level error",
    error: args.error,
    details: {
      source: args.source,
      reason: error,
      updatedRun,
    },
  });
  return {
    updatedActiveCount: 0,
    updatedHistoryCount: 0,
    updatedRun,
    stoppedSession: true,
  };
}

function resolveSkillRunnerFetchTypeFromRequest(request: unknown) {
  if (!isObject(request)) {
    return undefined;
  }
  return request.fetch_type === "result"
    ? "result"
    : request.fetch_type === "bundle"
      ? "bundle"
      : undefined;
}

function executionModeFromRequest(request: unknown) {
  return resolveSkillRunnerExecutionModeFromRequest(request, "auto") ===
    "interactive"
    ? "interactive"
    : "auto";
}

function applySkillRunnerProgressEvent(args: {
  runKey: string;
  backendId: string;
  event: ProviderProgressEvent;
  updatedAt: string;
}) {
  const event = args.event as Record<string, unknown>;
  const type = normalizeString(event.type);
  const requestId = normalizeString(event.requestId);
  const existing = getSkillRunnerRunRecord(args.runKey);
  if (type === "request-created") {
    return applySkillRunnerRunEvent({
      type: "request.created",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      updatedAt: args.updatedAt,
    });
  }
  if (type === "request-creating" || type === "sequence-step-started") {
    return applySkillRunnerRunEvent({
      type: "submit.request_creating",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "request-uploading") {
    return applySkillRunnerRunEvent({
      type: "submit.uploading",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "request-ready") {
    return applySkillRunnerRunEvent({
      type: "request.ready",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "sequence-step-deferred") {
    if (normalizeString(event.detachReason) === "observer_failure") {
      return applySkillRunnerRunEvent({
        type: "run.observer_detached",
        runKey: args.runKey,
        backendId: args.backendId,
        requestId: normalizeString(event.requestId) || existing?.requestId,
        error: normalizeString(event.error) || "observer failure",
        source: "sequence-step-deferred",
        updatedAt: args.updatedAt,
      });
    }
    return applySkillRunnerRunEvent({
      type: "backend.snapshot",
      runKey: args.runKey,
      backendId: args.backendId,
      state:
        normalizeString(event.backendStatus) === "queued" ||
        normalizeString(event.backendStatus) === "waiting_user" ||
        normalizeString(event.backendStatus) === "waiting_auth"
          ? (normalizeString(event.backendStatus) as any)
          : "running",
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "sequence-step-succeeded") {
    return applySkillRunnerRunEvent({
      type: "sequence.step.settled",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      status: "succeeded",
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "sequence-step-failed") {
    return applySkillRunnerRunEvent({
      type: "sequence.step.settled",
      runKey: args.runKey,
      backendId: args.backendId,
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
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      status: "canceled",
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  return applySkillRunnerRunEvent({
    type: "backend.snapshot",
    runKey: args.runKey,
    backendId: args.backendId,
    state: existing?.status || "running",
    updatedAt: args.updatedAt,
    payload: event,
  });
}

export function recordSingleSkillRunnerProgress(args: {
  job: JobRecord;
  event: ProviderProgressEvent;
  workflowRunId: string;
}) {
  const runKey = buildSkillRunnerSingleRunKey({
    workflowRunId: args.workflowRunId,
    jobId: args.job.id,
  });
  if (!runKey) {
    return null;
  }
  return applySkillRunnerProgressEvent({
    runKey,
    backendId: normalizeString(args.job.meta.backendId),
    event: args.event,
    updatedAt: new Date().toISOString(),
  });
}

export function recordSequenceStepSkillRunnerProgress(args: {
  event: ProviderProgressEvent;
  workflowId: string;
  backendId: string;
  providerOptions?: Record<string, unknown>;
  submissionId?: string;
  submissionUnitId?: string;
}) {
  const eventRecord = args.event as Record<string, unknown>;
  const workflowRunId = normalizeString(eventRecord.workflowRunId);
  const sequenceJobId = normalizeString(eventRecord.sequenceJobId);
  const sequenceStepId = normalizeString(eventRecord.sequenceStepId);
  const runKey = buildSkillRunnerSequenceRunKey({
    workflowRunId,
    sequenceJobId,
    sequenceStepId,
  });
  if (!runKey || !workflowRunId || !sequenceJobId || !sequenceStepId) {
    return null;
  }
  const stepRequest = isObject(eventRecord.sequenceStepRequest)
    ? eventRecord.sequenceStepRequest
    : {};
  const created = applySkillRunnerRunEvent({
    type: "submit.local_created",
    backendId: args.backendId,
    init: {
      runKey,
      backendId: args.backendId,
      workflowId: args.workflowId,
      workflowRunId,
      submissionId: args.submissionId,
      submissionUnitId: args.submissionUnitId,
      jobId: `${sequenceJobId}:${sequenceStepId}`,
      taskName:
        normalizeString(eventRecord.sequenceStepTaskName) ||
        `${args.workflowId} / ${sequenceStepId}`,
      skillId:
        normalizeString(eventRecord.sequenceStepSkillId) ||
        normalizeString(stepRequest.skill_id) ||
        undefined,
      sequenceRunId: workflowRunId,
      sequenceJobId,
      sequenceStepId,
      requestPayload: buildSkillRunnerRunRecordRequestPayload({
        request: stepRequest,
        providerOptions: args.providerOptions,
      }),
      fetchType: resolveSkillRunnerFetchTypeFromRequest(stepRequest),
      executionMode: executionModeFromRequest(stepRequest),
    },
  });
  if (!created) {
    return null;
  }
  return (
    applySkillRunnerProgressEvent({
      runKey,
      backendId: args.backendId,
      event: args.event,
      updatedAt: new Date().toISOString(),
    }) || created
  );
}

export function initializeSingleSkillRunnerRun(
  job: Pick<JobRecord, "id" | "workflowId" | "request" | "meta">,
) {
  return applySkillRunnerRunEvent({
    type: "submit.local_created",
    backendId: normalizeString(job.meta.backendId),
    init: {
      backendId: normalizeString(job.meta.backendId),
      workflowId: job.workflowId,
      workflowRunId: normalizeString(job.meta.runId),
      submissionId: normalizeString(job.meta.submissionId) || undefined,
      submissionUnitId: normalizeString(job.meta.submissionUnitId) || undefined,
      jobId: job.id,
      taskName: normalizeString(job.meta.taskName),
      skillId: normalizeString(job.meta.skillId) || undefined,
      requestPayload: buildSkillRunnerRunRecordRequestPayload({
        request: job.request,
        providerOptions: job.meta.providerOptions,
      }),
      fetchType: resolveSkillRunnerFetchTypeFromRequest(job.request),
      executionMode: executionModeFromRequest(job.request),
    },
  });
}

function appendDispatchStateWarning(
  job: JobRecord,
  violation?: SkillRunnerStateMachineViolation,
) {
  if (!violation) return;
  appendRuntimeLog({
    level: "warn",
    scope: "state-machine",
    workflowId: job.workflowId,
    backendId: normalizeString(job.meta.backendId) || undefined,
    backendType: normalizeString(job.meta.backendType) || undefined,
    providerId: normalizeString(job.meta.providerId) || undefined,
    runId: normalizeString(job.meta.runId) || undefined,
    jobId: job.id,
    requestId: getSkillRunnerRequestIdFromJob(job) || undefined,
    component: "skillrunner-run-settlement",
    operation: "state-machine-guard",
    phase: "running",
    stage: "state-machine-guard",
    message: "state machine guard degraded runtime state",
    details: violation,
  });
}

export function resolveSkillRunnerDispatchOutcome(
  job: JobRecord,
  outcome: JobExecutionOutcome,
): JobExecutionOutcome {
  if (outcome.result !== undefined) {
    const result = isObject(outcome.result) ? outcome.result : {};
    if (result.status !== "deferred") return outcome;
    const requestId =
      normalizeString(result.requestId) || getSkillRunnerRequestIdFromJob(job);
    const normalized = normalizeStatusWithGuard({
      value: result.backendStatus,
      fallback: "running",
      requestId: requestId || undefined,
    });
    appendDispatchStateWarning(job, normalized.violation);
    const transition = validateTransition({
      prev: job.state,
      next: normalized.status,
      requestId: requestId || undefined,
    });
    appendDispatchStateWarning(job, transition.violation);
    return {
      ...outcome,
      state: transition.ok ? transition.nextState : transition.prevState,
    };
  }
  const requestId = getSkillRunnerRequestIdFromJob(job);
  const ready = isSkillRunnerRequestReadyForRecovery(job);
  const terminal =
    !!requestId && isNonRecoverableSkillRunnerFailure(outcome.error);
  const metaPatch: JobExecutionOutcome["metaPatch"] = {
    skillRunnerSubmitError: stringifyError(outcome.error),
  };
  if (!ready) {
    metaPatch.skillRunnerLifecycleState = "failed";
    metaPatch.skillRunnerSubmitPhase =
      normalizeString(job.meta.skillRunnerSubmitPhase) ||
      (requestId ? "uploading" : "request_creating");
  }
  if (terminal) metaPatch.skillRunnerTerminalRunError = true;
  return {
    ...outcome,
    state:
      !terminal && hasRecoverableSkillRunnerRequest(job)
        ? coerceRecoverableSkillRunnerState(job.state)
        : "failed",
    metaPatch,
  };
}

export function settleSkillRunnerDispatchOutcome(
  job: JobRecord,
  outcome: JobExecutionOutcome,
) {
  const runKey = buildSkillRunnerSingleRunKey({
    workflowRunId: normalizeString(job.meta.runId),
    jobId: job.id,
  });
  const backendId = normalizeString(job.meta.backendId);
  const requestId = getSkillRunnerRequestIdFromJob(job);
  const source = "workflowExecution.dispatch";
  if (outcome.result === undefined) {
    const stage = job.meta.skillRunnerTerminalRunError
      ? "dispatch-failed-terminal-run"
      : job.state === "failed"
        ? "dispatch-failed"
        : "dispatch-failed-recoverable";
    appendRuntimeLog({
      level: job.state === "failed" ? "error" : "warn",
      scope: "job",
      workflowId: job.workflowId,
      backendId,
      backendType: normalizeString(job.meta.backendType) || undefined,
      providerId: normalizeString(job.meta.providerId) || undefined,
      runId: normalizeString(job.meta.runId) || undefined,
      jobId: job.id,
      requestId: requestId || undefined,
      component: "skillrunner-run-settlement",
      operation: stage,
      phase: job.state === "failed" ? "terminal" : "reconcile",
      stage,
      message: "SkillRunner dispatch failure classified",
      error: outcome.error,
      details: { preservedState: job.state },
    });
    if (!isSkillRunnerRequestReadyForRecovery(job)) {
      applySkillRunnerRunEvent({
        type: "submit.failed",
        runKey,
        backendId,
        requestId: requestId || undefined,
        error: job.error,
        updatedAt: job.updatedAt,
      });
      if (requestId) stopSessionSync({ backendId, requestId });
    } else if (job.meta.skillRunnerTerminalRunError) {
      settleSkillRunnerRunAsFailed({
        backendId,
        backendType: normalizeString(job.meta.backendType),
        providerId: normalizeString(job.meta.providerId),
        workflowId: job.workflowId,
        runId: normalizeString(job.meta.runId),
        jobId: job.id,
        requestId,
        source,
        error: outcome.error,
        updatedAt: job.updatedAt,
      });
    } else {
      applySkillRunnerRunEvent({
        type: "run.observer_detached",
        runKey,
        backendId,
        requestId,
        error: outcome.error,
        source,
        updatedAt: job.updatedAt,
      });
    }
    return;
  }
  const result = isObject(job.result) ? job.result : {};
  if (
    job.state === "succeeded" ||
    job.state === "failed" ||
    job.state === "canceled"
  ) {
    applySkillRunnerRunEvent({
      type: "backend.terminal",
      runKey,
      backendId,
      status: job.state,
      error: job.error,
      result: {
        resultJson: result.resultJson,
        resultJsonPath: normalizeString(result.resultJsonPath) || undefined,
        workspaceDir: normalizeString(result.workspaceDir) || undefined,
      },
      updatedAt: job.updatedAt,
      payload: { source, state: job.state },
    });
  } else if (requestId) {
    applySkillRunnerRunEvent({
      type: "backend.snapshot",
      backendId,
      requestId,
      state: job.state,
      backendStatus: job.state,
      error: job.error,
      updatedAt: job.updatedAt,
      payload: { source, state: job.state },
    });
  }
}
