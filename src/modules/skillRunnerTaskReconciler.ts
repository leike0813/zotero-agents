import type { BackendInstance } from "../backends/types";
import { resolveBackendDisplayName } from "../backends/displayName";
import type { JobRecord, JobState } from "../jobQueue/manager";
import { SkillRunnerClient } from "../providers/skillrunner/client";
import { resolveSkillRunnerBackendCommunicationFailedToastText } from "../utils/localizationGovernance";
import { executeApplyResult } from "../workflows/runtime";
import { ZipBundleReader } from "../workflows/zipBundleReader";
import type {
  ProviderExecutionResult,
  SkillRunnerJobRequestV1,
} from "../providers/contracts";
import {
  buildTempBundlePath,
  createUnavailableBundleReader,
  removeFileIfExists,
  writeBytes,
} from "./workflowExecution/bundleIO";
import { appendRuntimeLog } from "./runtimeLogManager";
import {
  getLoadedWorkflowEntries,
  rescanWorkflowRegistry,
} from "./workflowRuntime";
import {
  listTaskDashboardHistory,
  recordTaskDashboardHistoryFromJob,
  removeTaskDashboardHistoryByBackendAndRequestIds,
  updateTaskDashboardHistoryStateByRequest,
} from "./taskDashboardHistory";
import {
  buildWorkflowTaskRecordFromJob,
  listActiveWorkflowTasks,
  recordWorkflowTaskUpdate,
  removeWorkflowTasksByBackendAndRequestIds,
  type WorkflowTaskRecord,
  updateWorkflowTaskStateByRequest,
} from "./taskRuntime";
import { showWorkflowToast } from "./workflowExecution/feedbackSeam";
import { localizeWorkflowText } from "./workflowExecution/messageFormatter";
import { resolveTargetParentIDFromRequest } from "./workflowExecution/requestMeta";
import { createWorkflowResultContext } from "./workflowExecution/resultContext";
import {
  applySequenceStepResultIfNeeded,
  continueSkillRunnerSequence,
  matchesShortCircuitRule,
  resolveStepOutput,
} from "./workflowExecution/sequenceRuntime";
import {
  getSequenceRunState,
  getSequenceRunStateByStepRequest,
  markSequenceRunTerminal,
  recordSequenceStepSucceeded,
  type SequenceRunState,
} from "./workflowExecution/sequenceStateStore";
import { executeSequenceStepApply } from "./workflowExecution/sequenceStepApply";
import { canWorkflowRunWithoutSelection } from "./workflowSelectionPolicy";
import {
  isTerminal,
  isWaiting,
  normalizeStatus,
  normalizeStatusWithGuard,
  validateEventOrder,
  validateTransition,
  type SkillRunnerStateEvent,
  type SkillRunnerStateMachineViolation,
} from "./skillRunnerProviderStateMachine";
import {
  coerceRecoverableSkillRunnerState,
  isRecoverableSkillRunnerDispatchFailure,
} from "./skillRunnerRecoverableState";
import {
  getSkillRunnerHttpStatus,
  isSkillRunnerRunTerminalClientError,
} from "../providers/skillrunner/errors";
import { settleSkillRunnerRunAsFailed } from "./skillRunnerRunSettlement";
import {
  stopSessionSync,
  stopAllSkillRunnerSessionSync,
} from "./skillRunnerSessionSyncManager";
import { loadBackendsRegistry } from "../backends/registry";
import { buildSkillRunnerManagementClient } from "./skillRunnerManagementClientFactory";
import {
  hasSkillRunnerConnectionActivityForBackend,
  isSkillRunnerConnectionSkippedError,
  hasSkillRunnerPhysicalConnectionDebt,
} from "./skillRunnerConnectionGovernor";
import {
  getSkillRunnerBackendHealthState,
  isSkillRunnerBackendReconcileFlagged,
  markSkillRunnerBackendHealthFailure,
  markSkillRunnerBackendHealthSuccess,
  markSkillRunnerBackendRecoveryNeeded,
  pruneSkillRunnerBackendHealth,
  registerSkillRunnerBackendForHealthTracking,
  shouldProbeSkillRunnerBackendNow,
} from "./skillRunnerBackendHealthRegistry";
import {
  resolveSkillRunnerExecutionModeFromRequest,
  type SkillRunnerExecutionMode,
} from "./skillRunnerExecutionMode";
import { settleDeferredWorkflowCompletion } from "./workflowExecution/deferredCompletionTracker";
import {
  deleteSkillRunnerRunRecordsByBackend,
  listSkillRunnerRunRecords,
  type SkillRunnerRunRecord,
  updateSkillRunnerRunApplyState,
  updateSkillRunnerRunResult,
  upsertSkillRunnerRunFromTask,
} from "./skillRunnerRunStore";

type DeferredResultLike = {
  status?: unknown;
  requestId?: unknown;
  fetchType?: unknown;
  backendStatus?: unknown;
};

type MissingContextCandidate = {
  backendId: string;
  backendType: string;
  backendBaseUrl: string;
  requestId: string;
  workflowLabel: string;
  taskName: string;
};

type ReconcileContext = {
  id: string;
  workflowId: string;
  workflowLabel: string;
  requestKind: string;
  request: unknown;
  backendId: string;
  backendType: string;
  backendBaseUrl: string;
  providerId: string;
  providerOptions: Record<string, unknown>;
  runId: string;
  jobId: string;
  workflowRunId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  sequenceJobId?: string;
  sequenceStepSkillId?: string;
  taskName: string;
  inputUnitIdentity?: string;
  inputUnitLabel?: string;
  targetParentID?: number;
  requestId: string;
  executionMode: SkillRunnerExecutionMode;
  fetchType: "bundle" | "result";
  state: JobState;
  events: SkillRunnerStateEvent[];
  applyAttempt: number;
  applyMaxAttempt: number;
  nextApplyRetryAt?: string;
  lastApplyError?: string;
  error?: string;
  lastObservedState?: JobState;
  lastObservedAt?: string;
  nextReconcileAt?: string;
  reconcileBackoffMs?: number;
  createdAt: string;
  updatedAt: string;
};

type ReconcileDispatchSource = "interval" | "post-register";

type PendingPromptReconcile = {
  backendId?: string;
  requestId: string;
  source: ReconcileDispatchSource;
};

const POLL_INTERVAL_MS = 3000;
const BACKEND_RECONCILE_FAILURE_LOG_THROTTLE_MS = 60000;
const APPLY_MAX_ATTEMPTS = 5;
const APPLY_RETRY_BASE_MS = 1000;
const APPLY_RETRY_MAX_MS = 30000;
const RECONCILE_BACKOFF_INITIAL_MS = 3000;
const RECONCILE_BACKOFF_MAX_MS = 30000;

export type SkillRunnerBackendTaskLedgerReconcileSource =
  | "startup"
  | "local-runtime-up";

export type SkillRunnerBackendTaskLedgerReconcileResult = {
  ok: boolean;
  source: SkillRunnerBackendTaskLedgerReconcileSource;
  backendId: string;
  stage: string;
  message: string;
  checkedRequestIds: string[];
  missingRequestIds: string[];
  removedActiveCount: number;
  removedHistoryCount: number;
};

type BackendReconcileFailureToastPayload = {
  backendId: string;
  displayName: string;
  source: SkillRunnerBackendTaskLedgerReconcileSource;
  text: string;
};

type SkillRunnerTaskLifecycleToastPayload = {
  state: "waiting_user" | "waiting_auth" | "succeeded" | "failed" | "canceled";
  text: string;
  type: "default" | "success" | "error";
};

let backendReconcileFailureToastEmitter: (
  payload: BackendReconcileFailureToastPayload,
) => void = (payload) => {
  showWorkflowToast({
    text: payload.text,
    type: "error",
    semantic: "error",
  });
};

let skillRunnerTaskLifecycleToastEmitter: (
  payload: SkillRunnerTaskLifecycleToastPayload,
) => void = (payload) => {
  showWorkflowToast({
    text: payload.text,
    type: payload.type,
    semantic:
      payload.state === "waiting_user" || payload.state === "waiting_auth"
        ? "waiting"
        : payload.state === "canceled"
          ? "canceled"
          : payload.state === "succeeded"
            ? "success"
            : "error",
  });
};

export function setSkillRunnerBackendReconcileFailureToastEmitterForTests(
  emitter?: (payload: BackendReconcileFailureToastPayload) => void,
) {
  backendReconcileFailureToastEmitter =
    emitter ||
    ((payload) => {
      showWorkflowToast({
        text: payload.text,
        type: "error",
        semantic: "error",
      });
    });
}

export function setSkillRunnerTaskLifecycleToastEmitterForTests(
  emitter?: (payload: SkillRunnerTaskLifecycleToastPayload) => void,
) {
  skillRunnerTaskLifecycleToastEmitter =
    emitter ||
    ((payload) => {
      showWorkflowToast({
        text: payload.text,
        type: payload.type,
        semantic:
          payload.state === "waiting_user" || payload.state === "waiting_auth"
            ? "waiting"
            : payload.state === "canceled"
              ? "canceled"
              : payload.state === "succeeded"
                ? "success"
                : "error",
      });
    });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeSequenceStepIndex(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
}

function mapSequenceStepProgressState(
  event: Record<string, unknown>,
): JobState {
  const type = normalizeString(event.type);
  if (type === "sequence-step-succeeded") {
    return "succeeded";
  }
  if (type === "sequence-step-canceled") {
    return "canceled";
  }
  if (type === "sequence-step-failed") {
    return "failed";
  }
  if (type === "sequence-step-deferred") {
    const backendStatus = normalizeString(event.backendStatus);
    if (
      backendStatus === "queued" ||
      backendStatus === "waiting_user" ||
      backendStatus === "waiting_auth"
    ) {
      return backendStatus;
    }
  }
  return "running";
}

function normalizeInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function computeApplyRetryDelayMs(attempt: number) {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const delay = APPLY_RETRY_BASE_MS * 2 ** (safeAttempt - 1);
  return Math.min(APPLY_RETRY_MAX_MS, delay);
}

function isDeferredApplyContractError(error: unknown) {
  const message = normalizeString(
    error && typeof error === "object" && "message" in error
      ? (error as { message?: unknown }).message
      : error,
  ).toLowerCase();
  if (!message) {
    return false;
  }
  return (
    message.includes("artifact not found") ||
    message.includes("result json is unavailable") ||
    message.includes("invalid result json") ||
    message.includes("did not expose resultjson")
  );
}

function extractHttpStatusFromError(error: unknown) {
  const structured = getSkillRunnerHttpStatus(error);
  if (structured !== undefined) {
    return structured;
  }
  const message = normalizeString(
    error && typeof error === "object" && "message" in error
      ? (error as { message?: unknown }).message
      : error,
  );
  if (!message) {
    return 0;
  }
  const matched =
    message.match(/HTTP\s+(\d{3})\b/i) || message.match(/status=(\d{3})\b/i);
  if (!matched) {
    return 0;
  }
  const parsed = Number(matched[1]);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.floor(parsed);
}

function collectRequestIdsForBackend(backendId: string) {
  const normalizedBackendId = normalizeString(backendId);
  if (!normalizedBackendId) {
    return [] as string[];
  }
  const requestIds = new Set<string>();
  for (const row of listActiveWorkflowTasks()) {
    if (normalizeString(row.backendId) !== normalizedBackendId) {
      continue;
    }
    const requestId = normalizeString(row.requestId);
    if (!requestId) {
      continue;
    }
    requestIds.add(requestId);
  }
  for (const row of listTaskDashboardHistory({
    backendId: normalizedBackendId,
  })) {
    const requestId = normalizeString(row.requestId);
    if (!requestId) {
      continue;
    }
    requestIds.add(requestId);
  }
  return Array.from(requestIds.values());
}

type TerminalJobState = Extract<JobState, "succeeded" | "failed" | "canceled">;

type TaskLedgerRow = {
  id: string;
  runId: string;
  jobId: string;
  requestId?: string;
  workflowId: string;
  workflowLabel: string;
  taskName: string;
  inputUnitIdentity?: string;
  inputUnitLabel?: string;
  providerId?: string;
  backendId?: string;
  backendType?: string;
  backendBaseUrl?: string;
  state: JobState;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

function resolveTerminalJobState(value: unknown): TerminalJobState | "" {
  const normalized = normalizeStatus(value, "running");
  if (
    normalized === "succeeded" ||
    normalized === "failed" ||
    normalized === "canceled"
  ) {
    return normalized;
  }
  return "";
}

async function resolveDoubleConfirmedTerminalRunState(args: {
  client: SkillRunnerClient;
  requestId: string;
  firstStatus?: unknown;
  firstError?: unknown;
}) {
  let firstStatus = args.firstStatus;
  let firstError = args.firstError;
  if (firstStatus === undefined) {
    const firstRunState = await args.client.getRunState({
      requestId: args.requestId,
    });
    firstStatus = firstRunState.status;
    firstError = firstRunState.error;
  }
  const firstState = resolveTerminalJobState(firstStatus);
  if (!firstState) {
    return null;
  }
  const normalizedFirstError = normalizeString(firstError) || undefined;
  let second: Awaited<ReturnType<SkillRunnerClient["getRunState"]>>;
  try {
    second = await args.client.getRunState({
      requestId: args.requestId,
    });
  } catch {
    return null;
  }
  const secondState = resolveTerminalJobState(second.status);
  if (!secondState || secondState !== firstState) {
    return null;
  }
  return {
    state: secondState,
    error: normalizeString(second.error) || normalizedFirstError || undefined,
  };
}

function buildJobRecordFromTaskLedgerRow(args: {
  row: TaskLedgerRow;
  state: JobState;
  error?: string;
}) {
  const nextError = normalizeString(args.error) || undefined;
  const requestId = normalizeString(args.row.requestId) || undefined;
  return {
    id: args.row.jobId,
    workflowId: args.row.workflowId,
    request: {},
    meta: {
      runId: args.row.runId,
      workflowLabel: args.row.workflowLabel,
      taskName: args.row.taskName,
      inputUnitIdentity: args.row.inputUnitIdentity,
      inputUnitLabel: args.row.inputUnitLabel,
      providerId: args.row.providerId,
      backendId: args.row.backendId,
      backendType: args.row.backendType,
      backendBaseUrl: args.row.backendBaseUrl,
      requestId,
      index: 0,
    },
    state: args.state,
    error: nextError,
    result: {
      requestId,
    },
    createdAt: args.row.createdAt,
    updatedAt: nowIso(),
  } satisfies JobRecord;
}

function emitTerminalToastFromTaskLedgerRow(args: {
  row: TaskLedgerRow;
  state: TerminalJobState;
  error?: string;
}) {
  const taskLabel =
    normalizeString(args.row.taskName) ||
    normalizeString(args.row.requestId) ||
    normalizeString(args.row.jobId);
  if (args.state === "succeeded") {
    skillRunnerTaskLifecycleToastEmitter({
      state: "succeeded",
      text: localizeWorkflowText(
        "workflow-execute-toast-job-success",
        `Workflow ${args.row.workflowLabel} job 1/1 succeeded: ${taskLabel}`,
        {
          workflowLabel: args.row.workflowLabel,
          taskLabel,
          index: 1,
          total: 1,
        },
      ),
      type: "success",
    });
    return;
  }
  if (args.state === "failed") {
    const reason =
      normalizeString(args.error) ||
      localizeWorkflowText("workflow-execute-unknown-error", "unknown error");
    skillRunnerTaskLifecycleToastEmitter({
      state: "failed",
      text: localizeWorkflowText(
        "workflow-execute-toast-job-failed",
        `Workflow ${args.row.workflowLabel} job 1/1 failed: ${taskLabel} (${reason})`,
        {
          workflowLabel: args.row.workflowLabel,
          taskLabel,
          index: 1,
          total: 1,
          reason,
        },
      ),
      type: "error",
    });
    return;
  }
  skillRunnerTaskLifecycleToastEmitter({
    state: "canceled",
    text: localizeWorkflowText(
      "workflow-execute-toast-job-canceled",
      `Workflow ${args.row.workflowLabel} job 1/1 canceled: ${taskLabel}`,
      {
        workflowLabel: args.row.workflowLabel,
        taskLabel,
        index: 1,
        total: 1,
      },
    ),
    type: "default",
  });
}

function reconcileTerminalStateIntoTaskLedger(args: {
  backendId: string;
  requestId: string;
  state: TerminalJobState;
  error?: string;
}) {
  const normalizedBackendId = normalizeString(args.backendId);
  const normalizedRequestId = normalizeString(args.requestId);
  if (!normalizedBackendId || !normalizedRequestId) {
    return {
      updatedActiveCount: 0,
      updatedHistoryCount: 0,
    };
  }

  const activeRows = listActiveWorkflowTasks().filter((entry) => {
    return (
      normalizeString(entry.backendId) === normalizedBackendId &&
      normalizeString(entry.requestId) === normalizedRequestId
    );
  });
  let updatedActiveCount = 0;
  for (const row of activeRows) {
    if (
      row.state === args.state &&
      normalizeString(row.error) === normalizeString(args.error)
    ) {
      continue;
    }
    recordWorkflowTaskUpdate(
      buildJobRecordFromTaskLedgerRow({
        row,
        state: args.state,
        error: args.error,
      }),
    );
    updatedActiveCount += 1;
  }
  if (updatedActiveCount > 0) {
    emitTerminalToastFromTaskLedgerRow({
      row: activeRows[0],
      state: args.state,
      error: args.error,
    });
  }

  const historyRows = listTaskDashboardHistory({
    backendId: normalizedBackendId,
    requestId: normalizedRequestId,
  });
  let updatedHistoryCount = 0;
  for (const row of historyRows) {
    if (
      row.state === args.state &&
      normalizeString(row.error) === normalizeString(args.error)
    ) {
      continue;
    }
    recordTaskDashboardHistoryFromJob(
      buildJobRecordFromTaskLedgerRow({
        row,
        state: args.state,
        error: args.error,
      }),
    );
    updatedHistoryCount += 1;
  }

  return {
    updatedActiveCount,
    updatedHistoryCount,
  };
}

function appendStateMachineWarning(args: {
  workflowId?: string;
  jobId?: string;
  requestId?: string;
  violation?: SkillRunnerStateMachineViolation;
}) {
  if (!args.violation) {
    return;
  }
  appendRuntimeLog({
    level: "warn",
    scope: "state-machine",
    workflowId: args.workflowId,
    backendId: undefined,
    backendType: undefined,
    providerId: undefined,
    runId: undefined,
    jobId: args.jobId,
    requestId: args.requestId,
    component: "skillrunner-reconciler",
    operation: "state-machine-guard",
    phase: "reconcile",
    stage: "state-machine-guard",
    message: "state machine guard degraded runtime state",
    details: args.violation,
  });
}

export function mapSkillRunnerBackendStatusToJobState(
  status: unknown,
  fallback: JobState = "running",
): JobState {
  return normalizeStatus(status, fallback);
}

function resolveFetchTypeForContext(args: {
  request: unknown;
  deferred: DeferredResultLike;
  existing?: ReconcileContext;
}) {
  const requestFetchType =
    args.request &&
    typeof args.request === "object" &&
    !Array.isArray(args.request)
      ? normalizeString((args.request as { fetch_type?: unknown }).fetch_type)
      : "";
  if (requestFetchType === "result") {
    return "result" as const;
  }
  if (requestFetchType === "bundle") {
    return "bundle" as const;
  }
  const deferredFetchType = normalizeString(args.deferred.fetchType);
  if (deferredFetchType === "result") {
    return "result" as const;
  }
  if (deferredFetchType === "bundle") {
    return "bundle" as const;
  }
  if (args.existing?.fetchType === "result") {
    return "result" as const;
  }
  return "bundle" as const;
}

function resolveExecutionModeForContext(args: {
  request: unknown;
  existing?: ReconcileContext;
}) {
  return resolveSkillRunnerExecutionModeFromRequest(
    args.request,
    args.existing?.executionMode || "auto",
  );
}

function isTerminalState(state: JobState) {
  return isTerminal(state);
}

function parseContext(raw: unknown): ReconcileContext | null {
  if (!isObject(raw)) {
    return null;
  }
  const id = normalizeString(raw.id);
  const workflowId = normalizeString(raw.workflowId);
  const workflowLabel = normalizeString(raw.workflowLabel);
  const requestKind = normalizeString(raw.requestKind);
  const backendId = normalizeString(raw.backendId);
  const backendType = normalizeString(raw.backendType);
  const backendBaseUrl = normalizeString(raw.backendBaseUrl);
  const providerId = normalizeString(raw.providerId);
  const runId = normalizeString(raw.runId);
  const jobId = normalizeString(raw.jobId);
  const taskName = normalizeString(raw.taskName);
  const requestId = normalizeString(raw.requestId);
  const createdAt = normalizeString(raw.createdAt);
  const updatedAt = normalizeString(raw.updatedAt);
  const fetchType =
    normalizeString(raw.fetchType) === "result" ? "result" : "bundle";
  const executionMode = resolveSkillRunnerExecutionModeFromRequest(
    raw.request,
    normalizeString(raw.executionMode) === "interactive"
      ? "interactive"
      : "auto",
  );
  const state = normalizeStatusWithGuard({
    value: raw.state,
    fallback: "running",
    requestId,
  }).status;
  const applyAttempt = normalizeInteger(raw.applyAttempt, 0);
  const applyMaxAttempt = Math.max(
    1,
    normalizeInteger(raw.applyMaxAttempt, APPLY_MAX_ATTEMPTS),
  );
  const nextApplyRetryAt = normalizeString(raw.nextApplyRetryAt) || undefined;
  const lastApplyError = normalizeString(raw.lastApplyError) || undefined;
  const lastObservedStateRaw = normalizeString(raw.lastObservedState);
  const lastObservedState = lastObservedStateRaw
    ? normalizeStatus(lastObservedStateRaw, state)
    : undefined;
  const lastObservedAt = normalizeString(raw.lastObservedAt) || undefined;
  const nextReconcileAt = normalizeString(raw.nextReconcileAt) || undefined;
  const reconcileBackoffMsRaw =
    typeof raw.reconcileBackoffMs === "number" &&
    Number.isFinite(raw.reconcileBackoffMs)
      ? Math.floor(raw.reconcileBackoffMs)
      : 0;
  const events = Array.isArray(raw.events)
    ? raw.events
        .filter((entry) => isObject(entry))
        .map((entry) => ({
          kind: normalizeString(entry.kind),
          status: normalizeString(entry.status) || undefined,
        }))
    : [];
  if (
    !id ||
    !workflowId ||
    !requestKind ||
    !backendId ||
    !backendType ||
    !backendBaseUrl ||
    !providerId ||
    !runId ||
    !jobId ||
    !taskName ||
    !requestId ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }
  return {
    id,
    workflowId,
    workflowLabel: workflowLabel || workflowId,
    requestKind,
    request: raw.request,
    backendId,
    backendType,
    backendBaseUrl,
    providerId,
    providerOptions: isObject(raw.providerOptions)
      ? { ...raw.providerOptions }
      : {},
    runId,
    jobId,
    taskName,
    inputUnitIdentity: normalizeString(raw.inputUnitIdentity) || undefined,
    inputUnitLabel: normalizeString(raw.inputUnitLabel) || undefined,
    targetParentID:
      typeof raw.targetParentID === "number" &&
      Number.isFinite(raw.targetParentID)
        ? Math.floor(raw.targetParentID)
        : undefined,
    requestId,
    executionMode,
    fetchType,
    state,
    events,
    applyAttempt,
    applyMaxAttempt,
    nextApplyRetryAt,
    lastApplyError,
    error: normalizeString(raw.error) || undefined,
    lastObservedState,
    lastObservedAt,
    nextReconcileAt,
    reconcileBackoffMs:
      reconcileBackoffMsRaw > 0
        ? Math.min(RECONCILE_BACKOFF_MAX_MS, reconcileBackoffMsRaw)
        : undefined,
    createdAt,
    updatedAt,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function parseIsoTime(value?: string) {
  const parsed = Date.parse(normalizeString(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function contextToJobRecord(context: ReconcileContext): JobRecord {
  const requestRecord = isObject(context.request)
    ? (context.request as Record<string, unknown>)
    : {};
  const skillId =
    normalizeString(context.sequenceStepSkillId) ||
    normalizeString(requestRecord.skill_id);
  const resultPayload: Record<string, unknown> = {
    requestId: context.requestId,
  };
  if (!isTerminalState(context.state)) {
    resultPayload.status = "deferred";
    resultPayload.fetchType = context.fetchType;
    resultPayload.backendStatus = context.state;
  } else {
    resultPayload.status = "succeeded";
    resultPayload.fetchType = context.fetchType;
  }
  return {
    id: context.jobId,
    workflowId: context.workflowId,
    request: context.request,
    meta: {
      runId: context.runId,
      workflowRunId: context.workflowRunId,
      workflowLabel: context.workflowLabel,
      taskName: context.taskName,
      inputUnitIdentity: context.inputUnitIdentity,
      inputUnitLabel: context.inputUnitLabel,
      targetParentID: context.targetParentID,
      providerId: context.providerId,
      backendId: context.backendId,
      backendType: context.backendType,
      backendBaseUrl: context.backendBaseUrl,
      requestKind: context.requestKind,
      requestId: context.requestId,
      skillId: skillId || undefined,
      skillName: skillId || undefined,
      executionMode: context.executionMode,
      index:
        typeof context.sequenceStepIndex === "number"
          ? context.sequenceStepIndex
          : 0,
      sequenceStepId: context.sequenceStepId,
      sequenceStepIndex: context.sequenceStepIndex,
      sequenceJobId: context.sequenceJobId,
      sequenceStepSkillId: context.sequenceStepSkillId,
    },
    state: context.state,
    error: context.error,
    result: resultPayload,
    createdAt: context.createdAt,
    updatedAt: context.updatedAt,
  };
}

function persistContextToSkillRunnerRunStore(
  context: ReconcileContext,
  eventType:
    | "request.ready"
    | "backend.snapshot"
    | "backend.terminal"
    | "run.terminal_client_error"
    | undefined = undefined,
  eventPayload?: unknown,
) {
  const job = contextToJobRecord(context);
  upsertSkillRunnerRunFromTask(buildWorkflowTaskRecordFromJob(job), {
    requestPayload: context.request,
    providerOptions: context.providerOptions,
    executionMode: context.executionMode,
    fetchType: context.fetchType,
    apply: {
      state:
        context.nextApplyRetryAt || context.lastApplyError
          ? "failed"
          : context.state === "succeeded"
            ? "pending"
            : "idle",
      attempt: context.applyAttempt,
      maxAttempt: context.applyMaxAttempt,
      nextRetryAt: context.nextApplyRetryAt,
      error: context.lastApplyError,
      updatedAt: context.updatedAt,
    },
    reconcile: {
      lastObservedState: context.lastObservedState,
      lastObservedAt: context.lastObservedAt,
      nextReconcileAt: context.nextReconcileAt,
      reconcileBackoffMs: context.reconcileBackoffMs,
    },
    stateEvents: context.events,
    eventType,
    eventPayload,
  });
}

function runRecordToReconcileContext(
  record: SkillRunnerRunRecord,
): ReconcileContext | null {
  if (record.role === "sequence_root" || record.projectable === false) {
    return null;
  }
  const requestId = normalizeString(record.requestId);
  if (!requestId || !record.requestPayload) {
    return null;
  }
  const status =
    record.status === "request_ready"
      ? "running"
      : normalizeStatus(record.status, "running");
  const shouldRestore =
    !isTerminalState(status) ||
    (status === "succeeded" &&
      record.apply.state !== "succeeded" &&
      record.apply.state !== "skipped");
  if (!shouldRestore) {
    return null;
  }
  const sequenceRunId = normalizeString(record.sequence?.sequenceRunId);
  const sequenceState = sequenceRunId ? getSequenceRunState(sequenceRunId) : null;
  return {
    id: record.runKey,
    workflowId: record.workflowId,
    workflowLabel: record.workflowLabel || record.workflowId,
    requestKind: record.requestKind || "skillrunner.job.v1",
    request: record.requestPayload,
    backendId: record.backendId,
    backendType: record.backendType,
    backendBaseUrl: record.backendBaseUrl || "",
    providerId: record.providerId || "skillrunner",
    providerOptions: record.providerOptions || {},
    runId: record.runId,
    jobId: record.jobId,
    workflowRunId: record.workflowRunId || record.sequence?.workflowRunId,
    sequenceStepId: record.sequence?.stepId,
    sequenceStepIndex: record.sequence?.stepIndex,
    sequenceJobId:
      record.sequence?.jobId || sequenceState?.jobId || undefined,
    sequenceStepSkillId: record.skillId,
    taskName: record.taskName,
    inputUnitIdentity: record.taskProjection.inputUnitIdentity,
    inputUnitLabel: record.taskProjection.inputUnitLabel,
    targetParentID: record.taskProjection.targetParentID,
    requestId,
    executionMode:
      record.executionMode === "interactive" ? "interactive" : "auto",
    fetchType: record.fetchType || "bundle",
    state: status,
    events: Array.isArray(record.stateEvents)
      ? (record.stateEvents as SkillRunnerStateEvent[])
      : [],
    applyAttempt: record.apply.attempt || 0,
    applyMaxAttempt: record.apply.maxAttempt || APPLY_MAX_ATTEMPTS,
    nextApplyRetryAt: record.apply.nextRetryAt,
    lastApplyError: record.apply.error,
    error: record.error,
    lastObservedState: record.reconcile?.lastObservedState,
    lastObservedAt: record.reconcile?.lastObservedAt,
    nextReconcileAt: record.reconcile?.nextReconcileAt,
    reconcileBackoffMs: record.reconcile?.reconcileBackoffMs,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function readStoredRunContexts() {
  return listSkillRunnerRunRecords()
    .map((record) => runRecordToReconcileContext(record))
    .filter((entry): entry is ReconcileContext => !!entry);
}

function writeContextsToRunStore(records: ReconcileContext[]) {
  for (const record of records) {
    persistContextToSkillRunnerRunStore(record);
  }
}

async function resolveWorkflow(workflowId: string) {
  let workflow = getLoadedWorkflowEntries().find(
    (entry) => entry.manifest.id === workflowId,
  );
  if (workflow) {
    return workflow;
  }
  await rescanWorkflowRegistry();
  workflow = getLoadedWorkflowEntries().find(
    (entry) => entry.manifest.id === workflowId,
  );
  return workflow || null;
}

function sanitizeResultNamespaceSegment(value: unknown) {
  return (
    normalizeString(value)
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "skill"
  );
}

function getSequenceStepIndexByRequest(args: {
  sequenceState: SequenceRunState;
  requestId: string;
}) {
  const requestId = normalizeString(args.requestId);
  return args.sequenceState.steps.findIndex(
    (step) => normalizeString(step.requestId) === requestId,
  );
}

function resolveSequenceStepResultJsonPath(args: {
  sequenceState: SequenceRunState;
  stepIndex: number;
}) {
  const step = args.sequenceState.request.steps[args.stepIndex];
  if (!step) {
    return "";
  }
  const skillSegment = sanitizeResultNamespaceSegment(step.skill_id);
  let occurrence = 0;
  for (let index = 0; index <= args.stepIndex; index += 1) {
    const candidate = args.sequenceState.request.steps[index];
    if (sanitizeResultNamespaceSegment(candidate?.skill_id) === skillSegment) {
      occurrence += 1;
    }
  }
  return `result/${skillSegment}.${Math.max(1, occurrence)}/result.json`;
}

function resolveSingleRunResultJsonPathFromRequest(request: unknown) {
  const skillId = normalizeString(
    (request as { skill_id?: unknown; skillId?: unknown } | undefined)
      ?.skill_id ||
      (request as { skill_id?: unknown; skillId?: unknown } | undefined)
        ?.skillId,
  );
  return skillId
    ? `result/${sanitizeResultNamespaceSegment(skillId)}.1/result.json`
    : "";
}

function parentEntryPath(value: string) {
  const normalized = normalizeString(value).replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

async function resolveBackendForContext(context: ReconcileContext) {
  const backendId = normalizeString(context.backendId);
  if (backendId) {
    try {
      const registry = await loadBackendsRegistry();
      const matched = registry.backends.find(
        (entry) => normalizeString(entry.id) === backendId,
      );
      if (matched) {
        return matched;
      }
    } catch {
      // Fall back to the persisted context below.
    }
  }
  return {
    id: context.backendId,
    type: context.backendType,
    baseUrl: context.backendBaseUrl,
    auth: { kind: "none" },
  } as BackendInstance;
}

export async function reconcileSkillRunnerBackendTaskLedgerOnce(args: {
  backend: BackendInstance;
  source: SkillRunnerBackendTaskLedgerReconcileSource;
  emitFailureToast?: boolean;
}): Promise<SkillRunnerBackendTaskLedgerReconcileResult> {
  const backendId = normalizeString(args.backend.id);
  const source = args.source;
  const baseUrl = normalizeString(args.backend.baseUrl);
  const backendType = normalizeString(args.backend.type);
  if (!backendId || backendType !== "skillrunner") {
    return {
      ok: true,
      source,
      backendId,
      stage: "backend-task-ledger-reconcile-skip",
      message: "backend task ledger reconcile skipped",
      checkedRequestIds: [],
      missingRequestIds: [],
      removedActiveCount: 0,
      removedHistoryCount: 0,
    };
  }
  const requestIds = collectRequestIdsForBackend(backendId);
  if (requestIds.length === 0) {
    return {
      ok: true,
      source,
      backendId,
      stage: "backend-task-ledger-reconcile-empty",
      message: "no task ledger entries to reconcile",
      checkedRequestIds: [],
      missingRequestIds: [],
      removedActiveCount: 0,
      removedHistoryCount: 0,
    };
  }
  const missingRequestIds: string[] = [];
  const terminalConfirmedByRequestId = new Map<
    string,
    {
      state: TerminalJobState;
      error?: string;
    }
  >();
  try {
    const client = new SkillRunnerClient({
      baseUrl,
      backendId,
    });
    for (const requestId of requestIds) {
      try {
        const terminalRunState = await resolveDoubleConfirmedTerminalRunState({
          client,
          requestId,
        });
        if (terminalRunState) {
          terminalConfirmedByRequestId.set(requestId, terminalRunState);
        }
      } catch (error) {
        const status = extractHttpStatusFromError(error);
        if (isSkillRunnerRunTerminalClientError(error) || status === 404) {
          missingRequestIds.push(requestId);
          settleSkillRunnerRunAsFailed({
            backendId,
            backendType,
            providerId: "skillrunner",
            requestId,
            reason: `SkillRunner request is unavailable: status=${status || "unknown"}`,
            source: `backend-task-ledger-reconcile:${source}`,
            error,
          });
          continue;
        }
        throw error;
      }
    }
    const removedActiveCount = 0;
    const removedHistoryCount = 0;
    let reconciledTerminalActiveCount = 0;
    let reconciledTerminalHistoryCount = 0;
    const reconciledTerminalRequestIds: string[] = [];
    for (const [
      requestId,
      terminalState,
    ] of terminalConfirmedByRequestId.entries()) {
      const reconciled = reconcileTerminalStateIntoTaskLedger({
        backendId,
        requestId,
        state: terminalState.state,
        error: terminalState.error,
      });
      if (
        reconciled.updatedActiveCount > 0 ||
        reconciled.updatedHistoryCount > 0
      ) {
        reconciledTerminalRequestIds.push(requestId);
      }
      reconciledTerminalActiveCount += reconciled.updatedActiveCount;
      reconciledTerminalHistoryCount += reconciled.updatedHistoryCount;
    }
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId,
      backendType,
      providerId: "skillrunner",
      component: "skillrunner-reconciler",
      operation: "backend-task-ledger-reconcile",
      phase: source,
      stage: "backend-task-ledger-reconcile-finished",
      message: "backend task ledger reconcile finished",
      details: {
        source,
        checkedRequestIds: requestIds,
        missingRequestIds,
        removedActiveCount,
        removedHistoryCount,
        reconciledTerminalRequestIds,
        reconciledTerminalActiveCount,
        reconciledTerminalHistoryCount,
      },
    });
    return {
      ok: true,
      source,
      backendId,
      stage: "backend-task-ledger-reconcile-finished",
      message: "backend task ledger reconcile finished",
      checkedRequestIds: requestIds,
      missingRequestIds,
      removedActiveCount,
      removedHistoryCount,
    };
  } catch (error) {
    const displayName = resolveBackendDisplayName(
      backendId,
      args.backend.displayName,
    );
    const toastText = resolveSkillRunnerBackendCommunicationFailedToastText(
      displayName || backendId,
    );
    appendRuntimeLog({
      level: "error",
      scope: "provider",
      backendId,
      backendType,
      providerId: "skillrunner",
      component: "skillrunner-reconciler",
      operation: "backend-task-ledger-reconcile",
      phase: source,
      stage: "backend-task-ledger-reconcile-failed",
      message: "backend task ledger reconcile failed",
      error,
      details: {
        source,
        checkedRequestIds: requestIds,
      },
    });
    if (args.emitFailureToast !== false) {
      try {
        backendReconcileFailureToastEmitter({
          backendId,
          displayName: displayName || backendId,
          source,
          text: toastText,
        });
      } catch {
        // keep toast reporting best-effort
      }
    }
    return {
      ok: false,
      source,
      backendId,
      stage: "backend-task-ledger-reconcile-failed",
      message:
        normalizeString(
          error && typeof error === "object" && "message" in error
            ? (error as { message?: unknown }).message
            : error,
        ) || "backend task ledger reconcile failed",
      checkedRequestIds: requestIds,
      missingRequestIds: [],
      removedActiveCount: 0,
      removedHistoryCount: 0,
    };
  }
}

export class SkillRunnerTaskReconciler {
  private readonly contexts = new Map<string, ReconcileContext>();

  private readonly reportedViolationKeysByContext = new Map<
    string,
    Set<string>
  >();

  private readonly backendReconcileFailureLogUntilByBackend = new Map<
    string,
    number
  >();

  private readonly pendingPromptReconciles = new Map<
    string,
    PendingPromptReconcile
  >();

  private timer: ReturnType<typeof setInterval> | undefined;

  private isReconciling = false;

  private runGeneration = 0;

  private running = false;

  private readonly inflightTasks = new Set<Promise<void>>();

  private isGenerationActive(generation: number) {
    return this.running && this.runGeneration === generation;
  }

  private spawnBackgroundTask(
    _label: string,
    generation: number,
    runner: () => Promise<void>,
  ) {
    if (!this.isGenerationActive(generation)) {
      return;
    }
    const task = Promise.resolve(runner()).catch(() => {
      // keep fire-and-forget background tasks non-fatal
    });
    this.inflightTasks.add(task);
    void task.finally(() => {
      this.inflightTasks.delete(task);
    });
  }

  private async drainInFlightTasks() {
    while (this.inflightTasks.size > 0) {
      await Promise.allSettled(Array.from(this.inflightTasks));
    }
  }

  private applySnapshotToTaskStores(args: {
    context: ReconcileContext;
    state: JobState;
    error?: string;
    updatedAt?: string;
  }) {
    const updatedAt = normalizeString(args.updatedAt) || nowIso();
    updateWorkflowTaskStateByRequest({
      backendId: args.context.backendId,
      backendType: "skillrunner",
      requestId: args.context.requestId,
      state: args.state,
      error: args.error,
      updatedAt,
    });
    updateTaskDashboardHistoryStateByRequest({
      backendId: args.context.backendId,
      requestId: args.context.requestId,
      state: args.state,
      error: args.error,
      updatedAt,
    });
  }

  private resetReconcileCadence(context: ReconcileContext) {
    context.lastObservedState = undefined;
    context.lastObservedAt = undefined;
    context.nextReconcileAt = undefined;
    context.reconcileBackoffMs = undefined;
  }

  private shouldSkipByReconcileCadence(
    context: ReconcileContext,
    source: ReconcileDispatchSource,
  ) {
    const nextApplyRetryAt = parseIsoTime(context.nextApplyRetryAt);
    if (nextApplyRetryAt > Date.now()) {
      return true;
    }
    if (source !== "interval") {
      return false;
    }
    const nextAt = parseIsoTime(context.nextReconcileAt);
    return nextAt > Date.now();
  }

  private updateReconcileCadence(
    context: ReconcileContext,
    observedState: JobState,
  ) {
    if (isTerminalState(observedState)) {
      this.resetReconcileCadence(context);
      return;
    }
    const unchanged = context.lastObservedState === observedState;
    const previousBackoff = unchanged
      ? context.reconcileBackoffMs || RECONCILE_BACKOFF_INITIAL_MS
      : 0;
    const nextBackoff = unchanged
      ? Math.min(RECONCILE_BACKOFF_MAX_MS, previousBackoff * 2)
      : RECONCILE_BACKOFF_INITIAL_MS;
    context.lastObservedState = observedState;
    context.lastObservedAt = nowIso();
    context.reconcileBackoffMs = nextBackoff;
    context.nextReconcileAt = new Date(Date.now() + nextBackoff).toISOString();
  }

  private updateReconcileFailureCadence(context: ReconcileContext) {
    const previousBackoff =
      context.reconcileBackoffMs || RECONCILE_BACKOFF_INITIAL_MS;
    const nextBackoff = Math.min(
      RECONCILE_BACKOFF_MAX_MS,
      Math.max(RECONCILE_BACKOFF_INITIAL_MS, previousBackoff * 2),
    );
    context.reconcileBackoffMs = nextBackoff;
    context.nextReconcileAt = new Date(Date.now() + nextBackoff).toISOString();
  }

  private buildMissingContextCandidates() {
    const existingKeys = new Set<string>();
    for (const context of this.contexts.values()) {
      const requestId = normalizeString(context.requestId);
      const backendId = normalizeString(context.backendId);
      if (!requestId || !backendId) {
        continue;
      }
      existingKeys.add(`${backendId}:${requestId}`);
    }
    const candidates = new Map<string, MissingContextCandidate>();
    for (const row of listActiveWorkflowTasks()) {
      if (normalizeString(row.backendType) !== "skillrunner") {
        continue;
      }
      if (normalizeStatus(row.state, "running") !== "running") {
        continue;
      }
      const backendId = normalizeString(row.backendId);
      const requestId = normalizeString(row.requestId);
      const backendBaseUrl = normalizeString(row.backendBaseUrl);
      if (!backendId || !requestId || !backendBaseUrl) {
        continue;
      }
      const key = `${backendId}:${requestId}`;
      if (existingKeys.has(key)) {
        continue;
      }
      candidates.set(key, {
        backendId,
        backendType: normalizeString(row.backendType) || "skillrunner",
        backendBaseUrl,
        requestId,
        workflowLabel:
          normalizeString(row.workflowLabel) || normalizeString(row.workflowId),
        taskName:
          normalizeString(row.taskName) ||
          normalizeString(row.jobId) ||
          requestId,
      });
    }
    return Array.from(candidates.values());
  }

  private async reconcileMissingContextCandidate(
    candidate: MissingContextCandidate,
    generation?: number,
  ) {
    if (
      typeof generation === "number" &&
      !this.isGenerationActive(generation)
    ) {
      return;
    }
    if (isSkillRunnerBackendReconcileFlagged(candidate.backendId)) {
      return;
    }
    if (!getSkillRunnerBackendHealthState(candidate.backendId)) {
      return;
    }
    const client = new SkillRunnerClient({
      baseUrl: candidate.backendBaseUrl,
      backendId: candidate.backendId,
    });
    const runState = await client.getRunState({
      requestId: candidate.requestId,
    });
    if (
      typeof generation === "number" &&
      !this.isGenerationActive(generation)
    ) {
      return;
    }
    const observed = normalizeStatusWithGuard({
      value: runState.status,
      fallback: "running",
      requestId: candidate.requestId,
    });
    if (!isTerminal(observed.status)) {
      const updatedAt = nowIso();
      const nextState = normalizeStatus(observed.status, "running");
      const nextError = normalizeString(runState.error) || undefined;
      updateWorkflowTaskStateByRequest({
        backendId: candidate.backendId,
        backendType: "skillrunner",
        requestId: candidate.requestId,
        state: nextState,
        error: nextError,
        updatedAt,
      });
      updateTaskDashboardHistoryStateByRequest({
        backendId: candidate.backendId,
        requestId: candidate.requestId,
        state: nextState,
        error: nextError,
        updatedAt,
      });
      return;
    }
    const confirmedTerminal = await resolveDoubleConfirmedTerminalRunState({
      client,
      requestId: candidate.requestId,
      firstStatus: runState.status,
      firstError: runState.error,
    });
    if (
      typeof generation === "number" &&
      !this.isGenerationActive(generation)
    ) {
      return;
    }
    if (!confirmedTerminal) {
      return;
    }
    const terminalState = normalizeStatus(confirmedTerminal.state, "running");
    const terminalError = normalizeString(confirmedTerminal.error) || undefined;
    updateWorkflowTaskStateByRequest({
      backendId: candidate.backendId,
      backendType: "skillrunner",
      requestId: candidate.requestId,
      state: terminalState,
      error: terminalError,
      updatedAt: nowIso(),
    });
    updateTaskDashboardHistoryStateByRequest({
      backendId: candidate.backendId,
      requestId: candidate.requestId,
      state: terminalState,
      error: terminalError,
      updatedAt: nowIso(),
    });
    if (terminalState === "succeeded") {
      appendRuntimeLog({
        level: "warn",
        scope: "job",
        workflowId: undefined,
        backendId: candidate.backendId,
        backendType: candidate.backendType,
        providerId: "skillrunner",
        requestId: candidate.requestId,
        component: "skillrunner-reconciler",
        operation: "terminal-succeeded-missing-context",
        phase: "terminal",
        stage: "terminal-succeeded-missing-context",
        message:
          "terminal succeeded but apply skipped due to missing recoverable context",
        details: {
          reason: "missing-context",
          workflowLabel: candidate.workflowLabel,
          taskName: candidate.taskName,
        },
      });
      showWorkflowToast({
        type: "default",
        semantic: "waiting",
        text: localizeWorkflowText(
          "workflow-execute-toast-missing-context-apply-skipped",
          "Task completed, but context was missing after restart so result could not be applied automatically. Please rerun this task.",
        ),
      });
    }
  }

  private async reconcileMissingContextRunningTasks(generation?: number) {
    if (
      typeof generation === "number" &&
      !this.isGenerationActive(generation)
    ) {
      return;
    }
    const candidates = this.buildMissingContextCandidates();
    for (const candidate of candidates) {
      if (
        typeof generation === "number" &&
        !this.isGenerationActive(generation)
      ) {
        return;
      }
      try {
        await this.reconcileMissingContextCandidate(candidate, generation);
      } catch (error) {
        if (
          typeof generation === "number" &&
          !this.isGenerationActive(generation)
        ) {
          return;
        }
        if (isSkillRunnerRunTerminalClientError(error)) {
          settleSkillRunnerRunAsFailed({
            backendId: candidate.backendId,
            backendType: candidate.backendType,
            providerId: "skillrunner",
            requestId: candidate.requestId,
            reason: `SkillRunner request is unavailable: status=${extractHttpStatusFromError(error) || "unknown"}`,
            source: "missing-context-reconcile",
            error,
          });
          continue;
        }
        appendRuntimeLog({
          level: "warn",
          scope: "job",
          backendId: candidate.backendId,
          backendType: candidate.backendType,
          providerId: "skillrunner",
          requestId: candidate.requestId,
          component: "skillrunner-reconciler",
          operation: "missing-context-reconcile-failed",
          phase: "reconcile",
          stage: "missing-context-reconcile-failed",
          message: "missing-context running task reconcile failed; will retry",
          error,
        });
      }
    }
  }

  private ensureRunningSessionSync(context: ReconcileContext) {
    stopSessionSync({
      backendId: context.backendId,
      requestId: context.requestId,
    });
  }

  private logTransitionViolation(
    context: ReconcileContext,
    violation?: SkillRunnerStateMachineViolation,
  ) {
    appendStateMachineWarning({
      workflowId: context.workflowId,
      jobId: context.jobId,
      requestId: context.requestId,
      violation,
    });
  }

  private trackEvent(context: ReconcileContext, event: SkillRunnerStateEvent) {
    context.events.push(event);
    if (context.events.length > 40) {
      context.events = context.events.slice(-40);
    }
    const violations = validateEventOrder({
      events: context.events,
      requestId: context.requestId,
    });
    if (violations.length === 0) {
      return;
    }
    const reported =
      this.reportedViolationKeysByContext.get(context.id) || new Set<string>();
    for (const violation of violations) {
      const key = `${violation.ruleId}:${violation.eventKind || ""}:${violation.prevState || ""}:${violation.nextState || ""}`;
      if (reported.has(key)) {
        continue;
      }
      reported.add(key);
      this.logTransitionViolation(context, violation);
    }
    this.reportedViolationKeysByContext.set(context.id, reported);
  }

  private async refreshTrackedBackendHealth(generation?: number) {
    if (
      typeof generation === "number" &&
      !this.isGenerationActive(generation)
    ) {
      return;
    }
    let loadedBackends: BackendInstance[] = [];
    try {
      const loaded = await loadBackendsRegistry();
      if (
        typeof generation === "number" &&
        !this.isGenerationActive(generation)
      ) {
        return;
      }
      if (!loaded.fatalError) {
        loadedBackends = loaded.backends.filter(
          (entry) => normalizeString(entry.type) === "skillrunner",
        );
      }
    } catch {
      loadedBackends = [];
    }
    const backendIds = new Set<string>();
    for (const backend of loadedBackends) {
      const backendId = normalizeString(backend.id);
      if (!backendId) {
        continue;
      }
      backendIds.add(backendId);
      registerSkillRunnerBackendForHealthTracking(backendId);
    }
    const prunedBackendIds = pruneSkillRunnerBackendHealth(backendIds.values());
    for (const backendId of prunedBackendIds) {
      this.backendReconcileFailureLogUntilByBackend.delete(backendId);
      stopSessionSync({
        backendId,
      });
    }
    for (const backendId of backendIds.values()) {
      if (
        typeof generation === "number" &&
        !this.isGenerationActive(generation)
      ) {
        return;
      }
      if (!shouldProbeSkillRunnerBackendNow(backendId, Date.now())) {
        continue;
      }
      if (
        hasSkillRunnerConnectionActivityForBackend(backendId) ||
        hasSkillRunnerPhysicalConnectionDebt(backendId)
      ) {
        continue;
      }
      const backend = loadedBackends.find(
        (entry) => normalizeString(entry.id) === backendId,
      );
      if (!backend || !normalizeString(backend.baseUrl)) {
        continue;
      }
      try {
        const client = buildSkillRunnerManagementClient({
          backend,
          localize: (_key: string, fallback: string) => fallback,
        });
        await client.probeReachability();
        if (
          typeof generation === "number" &&
          !this.isGenerationActive(generation)
        ) {
          return;
        }
        const previousFlagged = isSkillRunnerBackendReconcileFlagged(backendId);
        markSkillRunnerBackendHealthSuccess(backendId);
        this.backendReconcileFailureLogUntilByBackend.delete(backendId);
        if (previousFlagged) {
          for (const context of this.contexts.values()) {
            if (normalizeString(context.backendId) !== backendId) {
              continue;
            }
            this.ensureRunningSessionSync(context);
          }
        }
      } catch (error) {
        if (isSkillRunnerConnectionSkippedError(error)) {
          continue;
        }
        if (
          typeof generation === "number" &&
          !this.isGenerationActive(generation)
        ) {
          return;
        }
        const backoff = markSkillRunnerBackendHealthFailure({
          backendId,
          error,
        });
        const now = Date.now();
        const throttleUntil =
          this.backendReconcileFailureLogUntilByBackend.get(backendId) || 0;
        if (now >= throttleUntil) {
          this.backendReconcileFailureLogUntilByBackend.set(
            backendId,
            now + BACKEND_RECONCILE_FAILURE_LOG_THROTTLE_MS,
          );
          appendRuntimeLog({
            level: "warn",
            scope: "job",
            backendId,
            backendType: "skillrunner",
            component: "skillrunner-reconciler",
            operation: "backend-health-probe-failed",
            phase: "reconcile",
            stage: "backend-health-probe-failed",
            message:
              "backend reachability probe failed; backend may be reconcile-gated",
            error,
            details: {
              failureStreak: backoff?.failureStreak,
              reconcileFlag: backoff?.reconcileFlag,
              backoffLevel: backoff?.backoffLevel,
              nextProbeAt:
                (backoff?.nextProbeAt || 0) > 0
                  ? new Date(backoff?.nextProbeAt || 0).toISOString()
                  : undefined,
            },
          });
        }
      }
    }
  }

  start() {
    if (this.timer) {
      return;
    }
    this.running = true;
    this.runGeneration += 1;
    const generation = this.runGeneration;
    const persisted = readStoredRunContexts();
    for (const context of persisted) {
      this.contexts.set(context.id, context);
      recordWorkflowTaskUpdate(contextToJobRecord(context));
      recordTaskDashboardHistoryFromJob(contextToJobRecord(context));
    }
    this.timer = setInterval(() => {
      this.spawnBackgroundTask("interval-reconcile", generation, async () => {
        await this.reconcilePending(generation);
      });
    }, POLL_INTERVAL_MS);
    const timerLike = this.timer as unknown as { unref?: () => void };
    if (typeof timerLike.unref === "function") {
      timerLike.unref();
    }
    this.spawnBackgroundTask("startup-reconcile", generation, async () => {
      await this.reconcilePending(generation);
    });
  }

  stop() {
    this.running = false;
    this.runGeneration += 1;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    stopAllSkillRunnerSessionSync();
  }

  async resetForTests() {
    this.stop();
    await this.drainInFlightTasks();
    this.contexts.clear();
    this.reportedViolationKeysByContext.clear();
    this.backendReconcileFailureLogUntilByBackend.clear();
    this.pendingPromptReconciles.clear();
    writeContextsToRunStore([]);
  }

  getRuntimeSnapshotForTests() {
    return {
      running: this.running,
      runGeneration: this.runGeneration,
      inflightTaskCount: this.inflightTasks.size,
      contextCount: this.contexts.size,
      pendingPromptReconcileCount: this.pendingPromptReconciles.size,
      backendFailureThrottleCount:
        this.backendReconcileFailureLogUntilByBackend.size,
      isReconciling: this.isReconciling,
      timerActive: !!this.timer,
    };
  }

  purgeBackendContexts(backendIdRaw: string) {
    const backendId = normalizeString(backendIdRaw);
    if (!backendId) {
      return 0;
    }
    let removed = 0;
    for (const [contextId, context] of this.contexts.entries()) {
      if (normalizeString(context.backendId) !== backendId) {
        continue;
      }
      this.contexts.delete(contextId);
      this.reportedViolationKeysByContext.delete(contextId);
      removed += 1;
    }
    if (removed > 0) {
      writeContextsToRunStore(Array.from(this.contexts.values()));
    }
    stopSessionSync({
      backendId,
    });
    return removed;
  }

  purgeRequestContext(args: { backendId?: string; requestId: string }) {
    const backendId = normalizeString(args.backendId);
    const requestId = normalizeString(args.requestId);
    if (!requestId) {
      return 0;
    }
    let removed = 0;
    for (const [contextId, context] of this.contexts.entries()) {
      if (backendId && normalizeString(context.backendId) !== backendId) {
        continue;
      }
      if (normalizeString(context.requestId) !== requestId) {
        continue;
      }
      this.contexts.delete(contextId);
      this.reportedViolationKeysByContext.delete(contextId);
      removed += 1;
    }
    if (removed > 0) {
      writeContextsToRunStore(Array.from(this.contexts.values()));
    }
    stopSessionSync({
      backendId,
      requestId,
    });
    return removed;
  }

  registerFromJob(args: {
    workflowId: string;
    workflowLabel: string;
    requestKind: string;
    request: unknown;
    backend: BackendInstance;
    providerId: string;
    providerOptions?: Record<string, unknown>;
    job: JobRecord;
  }) {
    if (normalizeString(args.backend.type) !== "skillrunner") {
      return;
    }
    if (args.job.meta.skillRunnerTerminalRunError) {
      return;
    }
    const deferred = (args.job.result || {}) as DeferredResultLike;
    const requestId =
      normalizeString(deferred.requestId) ||
      normalizeString(args.job.meta.requestId);
    if (!requestId) {
      return;
    }
    const existingContextId = `${normalizeString(args.backend.id)}:${requestId}`;
    const existing = this.contexts.get(existingContextId);
    const localFailedAfterExistingActiveContext =
      !!existing && !isTerminal(existing.state) && args.job.state === "failed";
    const recoverableDispatchFailure =
      localFailedAfterExistingActiveContext ||
      isRecoverableSkillRunnerDispatchFailure({
        ...args.job,
        meta: {
          ...args.job.meta,
          providerId:
            normalizeString(args.providerId) ||
            normalizeString(args.job.meta.providerId) ||
            undefined,
        },
        result: {
          ...(isObject(args.job.result) ? args.job.result : {}),
          requestId,
        },
      });
    const observedStatusRaw = recoverableDispatchFailure
      ? existing && !isTerminal(existing.state)
        ? existing.state
        : coerceRecoverableSkillRunnerState(args.job.state)
      : normalizeString(deferred.status) === "deferred"
        ? deferred.backendStatus
        : args.job.state;
    const normalized = normalizeStatusWithGuard({
      value: observedStatusRaw,
      fallback: existing?.state || args.job.state,
      requestId,
    });
    appendStateMachineWarning({
      workflowId: args.workflowId,
      jobId: args.job.id,
      requestId,
      violation: normalized.violation,
    });
    const transition = validateTransition({
      prev: existing?.state || args.job.state,
      next: normalized.status,
      requestId,
    });
    appendStateMachineWarning({
      workflowId: args.workflowId,
      jobId: args.job.id,
      requestId,
      violation: transition.violation,
    });
    const transitionState = transition.ok
      ? transition.nextState
      : transition.prevState;
    const state =
      existing && isTerminal(existing.state) && !isTerminal(transitionState)
        ? existing.state
        : transitionState;
    const contextId = existingContextId;
    const context: ReconcileContext = {
      id: contextId,
      workflowId:
        normalizeString(args.workflowId) || existing?.workflowId || "",
      workflowLabel:
        normalizeString(args.workflowLabel) ||
        normalizeString(args.workflowId) ||
        existing?.workflowLabel ||
        "",
      requestKind:
        normalizeString(args.requestKind) || existing?.requestKind || "",
      request:
        typeof args.request === "undefined" ? existing?.request : args.request,
      backendId: normalizeString(args.backend.id) || existing?.backendId || "",
      backendType:
        normalizeString(args.backend.type) || existing?.backendType || "",
      backendBaseUrl:
        normalizeString(args.backend.baseUrl) || existing?.backendBaseUrl || "",
      providerId:
        normalizeString(args.providerId) || existing?.providerId || "",
      providerOptions:
        args.providerOptions && isObject(args.providerOptions)
          ? { ...args.providerOptions }
          : existing?.providerOptions || {},
      runId:
        normalizeString(args.job.meta.runId) ||
        existing?.runId ||
        `${args.workflowId}:${args.job.createdAt}`,
      jobId: normalizeString(args.job.id) || existing?.jobId || "",
      workflowRunId:
        normalizeString(args.job.meta.workflowRunId) ||
        existing?.workflowRunId ||
        undefined,
      sequenceStepId:
        normalizeString(args.job.meta.sequenceStepId) ||
        existing?.sequenceStepId ||
        undefined,
      sequenceStepIndex:
        normalizeSequenceStepIndex(args.job.meta.sequenceStepIndex) ??
        existing?.sequenceStepIndex,
      sequenceJobId:
        normalizeString(args.job.meta.sequenceJobId) ||
        existing?.sequenceJobId ||
        undefined,
      sequenceStepSkillId:
        normalizeString(args.job.meta.sequenceStepSkillId) ||
        normalizeString(args.job.meta.skillId) ||
        existing?.sequenceStepSkillId ||
        undefined,
      taskName:
        normalizeString(args.job.meta.taskName) ||
        normalizeString(args.job.id) ||
        existing?.taskName ||
        "",
      inputUnitIdentity:
        normalizeString(args.job.meta.inputUnitIdentity) ||
        existing?.inputUnitIdentity ||
        undefined,
      inputUnitLabel:
        normalizeString(args.job.meta.inputUnitLabel) ||
        existing?.inputUnitLabel ||
        undefined,
      targetParentID:
        typeof args.job.meta.targetParentID === "number"
          ? Math.floor(args.job.meta.targetParentID)
          : existing?.targetParentID,
      requestId,
      executionMode: resolveExecutionModeForContext({
        request:
          typeof args.request === "undefined"
            ? existing?.request
            : args.request,
        existing,
      }),
      fetchType: resolveFetchTypeForContext({
        request: args.request,
        deferred,
        existing,
      }),
      state,
      events: existing?.events || [],
      applyAttempt: existing?.applyAttempt || 0,
      applyMaxAttempt: existing?.applyMaxAttempt || APPLY_MAX_ATTEMPTS,
      nextApplyRetryAt: existing?.nextApplyRetryAt,
      lastApplyError: existing?.lastApplyError,
      error: normalizeString(args.job.error) || existing?.error,
      lastObservedState: existing?.lastObservedState,
      lastObservedAt: existing?.lastObservedAt,
      nextReconcileAt: existing?.nextReconcileAt,
      reconcileBackoffMs: existing?.reconcileBackoffMs,
      createdAt: existing?.createdAt || args.job.createdAt,
      updatedAt: nowIso(),
    };
    if (
      !existing ||
      existing.state !== state ||
      isWaiting(state) ||
      isTerminalState(state)
    ) {
      this.resetReconcileCadence(context);
    }
    if (recoverableDispatchFailure) {
      appendRuntimeLog({
        level: "warn",
        scope: "job",
        workflowId: context.workflowId,
        backendId: context.backendId,
        backendType: context.backendType,
        providerId: context.providerId,
        runId: context.runId,
        jobId: context.jobId,
        requestId: context.requestId,
        component: "skillrunner-reconciler",
        operation: "recoverable-dispatch-failure-preserved-nonterminal",
        phase: "reconcile",
        stage: "recoverable-dispatch-failure-preserved-nonterminal",
        message:
          "preserved non-terminal context after request-created local dispatch failure",
        details: {
          previousState: existing?.state,
          incomingState: args.job.state,
          preservedState: context.state,
        },
      });
    }
    if (!existing) {
      this.trackEvent(context, {
        kind: "request-created",
      });
    }
    if (normalizeString(deferred.status) === "deferred" && !existing) {
      this.trackEvent(context, {
        kind: "deferred",
      });
    }
    if (
      isWaiting(state) &&
      (!existing || !isWaiting(normalizeStatus(existing.state, "running")))
    ) {
      this.trackEvent(context, {
        kind: "waiting",
        status: state,
      });
    }
    this.contexts.set(context.id, context);
    writeContextsToRunStore(Array.from(this.contexts.values()));
    persistContextToSkillRunnerRunStore(
      context,
      existing ? "backend.snapshot" : "request.ready",
      {
        source: "skillRunnerTaskReconciler.registerFromJob",
        state,
        requestReady: true,
      },
    );
    registerSkillRunnerBackendForHealthTracking(context.backendId);
    this.ensureRunningSessionSync(context);
    if (
      isWaiting(state) &&
      (!existing || !isWaiting(normalizeStatus(existing.state, "running")))
    ) {
      this.showWaitingToast(context, state);
    }
  }

  private showWaitingToast(
    context: ReconcileContext,
    state: "waiting_user" | "waiting_auth",
  ) {
    skillRunnerTaskLifecycleToastEmitter({
      state,
      text: localizeWorkflowText(
        "workflow-execute-toast-waiting",
        `Workflow ${context.workflowLabel} is waiting for backend input. pending=1`,
        {
          workflowLabel: context.workflowLabel,
          pendingJobs: 1,
        },
      ),
      type: "default",
    });
    appendRuntimeLog({
      level: "info",
      scope: "job",
      workflowId: context.workflowId,
      backendId: context.backendId,
      backendType: context.backendType,
      providerId: context.providerId,
      runId: context.runId,
      jobId: context.jobId,
      requestId: context.requestId,
      component: "skillrunner-reconciler",
      operation: "backend-waiting",
      phase: "waiting",
      stage: "backend-waiting",
      message: `backend entered ${state}`,
    });
  }

  private showTerminalToast(
    context: ReconcileContext,
    state: "succeeded" | "failed" | "canceled",
  ) {
    const taskLabel = normalizeString(context.taskName) || context.requestId;
    if (state === "succeeded") {
      skillRunnerTaskLifecycleToastEmitter({
        state,
        text: localizeWorkflowText(
          "workflow-execute-toast-job-success",
          `Workflow ${context.workflowLabel} job 1/1 succeeded: ${taskLabel}`,
          {
            workflowLabel: context.workflowLabel,
            taskLabel,
            index: 1,
            total: 1,
          },
        ),
        type: "success",
      });
      return;
    }
    if (state === "failed") {
      const reason =
        normalizeString(context.error) ||
        localizeWorkflowText("workflow-execute-unknown-error", "unknown error");
      skillRunnerTaskLifecycleToastEmitter({
        state,
        text: localizeWorkflowText(
          "workflow-execute-toast-job-failed",
          `Workflow ${context.workflowLabel} job 1/1 failed: ${taskLabel} (${reason})`,
          {
            workflowLabel: context.workflowLabel,
            taskLabel,
            index: 1,
            total: 1,
            reason,
          },
        ),
        type: "error",
      });
      return;
    }
    skillRunnerTaskLifecycleToastEmitter({
      state,
      text: localizeWorkflowText(
        "workflow-execute-toast-job-canceled",
        `Workflow ${context.workflowLabel} job 1/1 canceled: ${taskLabel}`,
        {
          workflowLabel: context.workflowLabel,
          taskLabel,
          index: 1,
          total: 1,
        },
      ),
      type: "default",
    });
  }

  private settleSequenceWorkflowCompletionIfNeeded(args: {
    context: ReconcileContext;
    terminalState: "succeeded" | "failed" | "canceled";
    reason?: string;
  }) {
    let sequenceState = getSequenceRunStateByStepRequest(
      args.context.requestId,
    );
    if (!sequenceState) {
      return {
        sequence: false,
        terminal: false,
        handled: false,
      };
    }
    const sequenceRunId = normalizeString(sequenceState.sequenceRunId);
    if (
      args.terminalState !== "succeeded" &&
      sequenceRunId &&
      sequenceState.status !== "failed" &&
      sequenceState.status !== "canceled"
    ) {
      markSequenceRunTerminal({
        sequenceRunId,
        status: args.terminalState === "canceled" ? "canceled" : "failed",
        error: args.reason,
      });
      sequenceState =
        getSequenceRunState(sequenceRunId) || sequenceState;
    }
    const sequenceTerminalState =
      sequenceState.status === "completed"
        ? "succeeded"
        : sequenceState.status === "failed"
          ? "failed"
          : sequenceState.status === "canceled"
            ? "canceled"
            : undefined;
    if (!sequenceTerminalState || !sequenceRunId) {
      return {
        sequence: true,
        terminal: false,
        handled: true,
      };
    }
    const completion = settleDeferredWorkflowCompletion({
      runId: args.context.runId,
      requestId: sequenceRunId,
      succeeded: sequenceTerminalState === "succeeded",
      terminalState: sequenceTerminalState,
      reason:
        sequenceTerminalState === "succeeded"
          ? undefined
          : sequenceState.error || args.reason,
    });
    return {
      sequence: true,
      terminal: true,
      handled: completion.handled,
    };
  }

  private buildSequenceContinuationStepJob(args: {
    context: ReconcileContext;
    sequenceState: SequenceRunState;
    backend: BackendInstance;
    event: Record<string, unknown>;
  }): JobRecord | null {
    const stepId = normalizeString(args.event.sequenceStepId);
    if (!stepId) {
      return null;
    }
    const requestId = normalizeString(args.event.requestId);
    const workflowRunId =
      normalizeString(args.event.workflowRunId) ||
      normalizeString(args.sequenceState.workflowRunId);
    const sequenceStepIndex = normalizeSequenceStepIndex(
      args.event.sequenceStepIndex,
    );
    const skillId = normalizeString(args.event.sequenceStepSkillId);
    const taskName =
      normalizeString(args.event.sequenceStepTaskName) ||
      `${args.sequenceState.workflowLabel || args.sequenceState.workflowId} / ${stepId}`;
    const now = nowIso();
    return {
      id: `${args.sequenceState.jobId}:${stepId}`,
      workflowId: args.sequenceState.workflowId,
      request: args.event.sequenceStepRequest || args.sequenceState.request,
      meta: {
        index:
          typeof sequenceStepIndex === "number" ? sequenceStepIndex : undefined,
        runId: args.context.runId,
        workflowRunId: workflowRunId || undefined,
        workflowLabel: args.sequenceState.workflowLabel,
        jobId: `${args.sequenceState.jobId}:${stepId}`,
        requestId: requestId || undefined,
        requestKind: "skillrunner.job.v1",
        backendId: args.backend.id,
        backendType: args.backend.type,
        backendBaseUrl: args.backend.baseUrl,
        providerId: args.context.providerId,
        taskName,
        inputUnitLabel: taskName,
        targetParentID: resolveTargetParentIDFromRequest(
          args.sequenceState.request,
        ),
        skillId: skillId || undefined,
        sequenceStepId: stepId,
        sequenceStepIndex,
        sequenceJobId: args.sequenceState.jobId,
      },
      state: mapSequenceStepProgressState(args.event),
      error: normalizeString(args.event.error) || undefined,
      createdAt: now,
      updatedAt: now,
    };
  }

  private handleSequenceContinuationProgress(args: {
    context: ReconcileContext;
    sequenceState: SequenceRunState;
    backend: BackendInstance;
    event: Record<string, unknown>;
  }) {
    if (!normalizeString(args.event.sequenceStepId)) {
      return;
    }
    const stepJob = this.buildSequenceContinuationStepJob(args);
    if (!stepJob) {
      return;
    }
    recordWorkflowTaskUpdate(stepJob);
    recordTaskDashboardHistoryFromJob(stepJob);
    const eventType = normalizeString(args.event.type);
    if (eventType === "request-created") {
      return;
    }
    if (
      eventType === "request-ready" ||
      eventType === "sequence-step-deferred" ||
      eventType === "sequence-step-succeeded"
    ) {
      this.registerFromJob({
        workflowId: args.sequenceState.workflowId,
        workflowLabel:
          args.sequenceState.workflowLabel || args.sequenceState.workflowId,
        requestKind: "skillrunner.job.v1",
        request: stepJob.request,
        backend: args.backend,
        providerId: args.context.providerId,
        providerOptions:
          args.sequenceState.providerOptions || args.context.providerOptions,
        job: stepJob,
      });
    }
  }

  private async applySequenceStepSideEffect(args: {
    context: ReconcileContext;
    sequenceState: SequenceRunState;
    stepIndex: number;
    stepRequest: SkillRunnerJobRequestV1;
    stepResult: Extract<ProviderExecutionResult, { status: "succeeded" }> &
      Record<string, unknown>;
    output: unknown;
    backend: BackendInstance;
  }) {
    const step = args.sequenceState.request.steps[args.stepIndex];
    if (!step) {
      return;
    }
    if (!step.apply_result) {
      updateSkillRunnerRunApplyState({
        backendId: args.context.backendId,
        requestId: args.context.requestId,
        state: "skipped",
        attempt: args.context.applyAttempt,
        maxAttempt: args.context.applyMaxAttempt,
        updatedAt: nowIso(),
        eventType: "apply.skipped",
        eventPayload: {
          source: "skillRunnerTaskReconciler.applySequenceStepSideEffect",
          stepId: step.id,
          stepIndex: args.stepIndex,
        },
      });
      return;
    }
    updateSkillRunnerRunApplyState({
      backendId: args.context.backendId,
      requestId: args.context.requestId,
      state: "running",
      attempt: args.context.applyAttempt,
      maxAttempt: args.context.applyMaxAttempt,
      updatedAt: nowIso(),
      eventType: "apply.started",
      eventPayload: {
        source: "skillRunnerTaskReconciler.applySequenceStepSideEffect",
        stepId: step.id,
        stepIndex: args.stepIndex,
      },
    });
    const applyState: SequenceRunState = {
      ...args.sequenceState,
      request: {
        ...args.sequenceState.request,
        steps: args.sequenceState.request.steps.map((candidate, index) =>
          index === args.stepIndex && candidate.apply_result
            ? {
                ...candidate,
                apply_result: {
                  ...candidate.apply_result,
                  on_failure: "continue" as const,
                },
              }
            : candidate,
        ),
      },
    };
    try {
      await applySequenceStepResultIfNeeded({
        state: applyState,
        stepIndex: args.stepIndex,
        stepRequest: args.stepRequest,
        stepResult: args.stepResult,
        output: args.output,
        backend: args.backend,
        appendRuntimeLog,
        applySequenceStepResult: async (stepApply) => {
          const applyWorkflow = await resolveWorkflow(
            stepApply.applyWorkflowId,
          );
          if (!applyWorkflow) {
            throw new Error(
              `sequence step apply workflow not found: ${stepApply.applyWorkflowId}`,
            );
          }
          return executeSequenceStepApply({
            workflow: applyWorkflow,
            parent:
              resolveTargetParentIDFromRequest(stepApply.sequenceRequest) ||
              null,
            request: stepApply.stepRequest,
            runResult: {
              ...stepApply.stepResult,
              resultJson: stepApply.output,
              backendId: args.backend.id,
              backendType: args.backend.type,
              runId: args.context.runId,
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
        },
      });
      const latest =
        getSequenceRunState(args.sequenceState.sequenceRunId) ||
        args.sequenceState;
      const applyResult = latest.steps[args.stepIndex]?.applyResult;
      updateSkillRunnerRunApplyState({
        backendId: args.context.backendId,
        requestId: args.context.requestId,
        state:
          applyResult?.status === "failed"
            ? "failed"
            : applyResult?.status === "skipped"
              ? "skipped"
              : "succeeded",
        attempt: args.context.applyAttempt,
        maxAttempt: args.context.applyMaxAttempt,
        error: applyResult?.error,
        updatedAt: nowIso(),
        eventType:
          applyResult?.status === "failed"
            ? "apply.failed"
            : applyResult?.status === "skipped"
              ? "apply.skipped"
              : "apply.succeeded",
        eventPayload: {
          source: "skillRunnerTaskReconciler.applySequenceStepSideEffect",
          stepId: step.id,
          stepIndex: args.stepIndex,
        },
      });
    } catch (error) {
      const message =
        normalizeString(
          error && typeof error === "object" && "message" in error
            ? (error as { message?: unknown }).message
            : error,
        ) || "sequence step apply failed";
      updateSkillRunnerRunApplyState({
        backendId: args.context.backendId,
        requestId: args.context.requestId,
        state: "failed",
        attempt: args.context.applyAttempt + 1,
        maxAttempt: args.context.applyMaxAttempt,
        error: message,
        updatedAt: nowIso(),
        eventType: "apply.failed",
        eventPayload: {
          source: "skillRunnerTaskReconciler.applySequenceStepSideEffect",
          stepId: step.id,
          stepIndex: args.stepIndex,
        },
      });
    }
  }

  private async applySequenceTerminalSuccessContext(args: {
    context: ReconcileContext;
    client: SkillRunnerClient;
    sequenceState: SequenceRunState;
    generation?: number;
    stateJson?: unknown;
  }) {
    const stepIndex = getSequenceStepIndexByRequest({
      sequenceState: args.sequenceState,
      requestId: args.context.requestId,
    });
    const step = args.sequenceState.request.steps[stepIndex];
    if (stepIndex < 0 || !step) {
      return false;
    }
    const resultJsonPath = resolveSequenceStepResultJsonPath({
      sequenceState: args.sequenceState,
      stepIndex,
    });
    const runResult = {
      status: "succeeded" as const,
      requestId: args.context.requestId,
      fetchType: args.context.fetchType,
      resultJsonPath,
      resultArtifactBasePath: parentEntryPath(resultJsonPath),
      backendId: args.context.backendId,
      backendType: args.context.backendType,
      runId: args.context.runId,
      jobId: args.context.jobId,
    } as Extract<ProviderExecutionResult, { status: "succeeded" }> &
      Record<string, unknown>;
    let bundlePath = "";
    try {
      let bundleReader = createUnavailableBundleReader(args.context.requestId);
      if (args.context.fetchType === "bundle") {
        const bundleBytes = await args.client.fetchRunBundle({
          requestId: args.context.requestId,
        });
        if (
          typeof args.generation === "number" &&
          !this.isGenerationActive(args.generation)
        ) {
          return true;
        }
        runResult.bundleBytes = bundleBytes;
        bundlePath = buildTempBundlePath(args.context.requestId);
        await writeBytes(bundlePath, bundleBytes);
        const zipReader = new ZipBundleReader(bundlePath);
        bundleReader = zipReader;
        runResult.bundleDir = await zipReader.getExtractedDir();
      } else {
        const normalized = await args.client.fetchRunResultPayload({
          requestId: args.context.requestId,
          stateJson: args.stateJson,
        });
        runResult.resultJson = normalized.resultJson;
        runResult.responseJson = normalized.responseJson;
        runResult.workspaceDir = normalized.workspaceDir;
      }
      const resultContext = await createWorkflowResultContext({
        runResult,
        bundleReader,
        manifest: {
          result: {
            expects: {
              result_json: resultJsonPath,
            },
          },
        },
      });
      runResult.resultJson = resultContext.resultJson;
      const output = resolveStepOutput(runResult);
      recordSequenceStepSucceeded({
        sequenceRunId: args.sequenceState.sequenceRunId,
        stepIndex,
        requestId: args.context.requestId,
        output,
        result: runResult,
      });
      updateSkillRunnerRunResult({
        backendId: args.context.backendId,
        requestId: args.context.requestId,
        resultJson: resultContext.resultJson,
        resultJsonPath:
          typeof runResult.resultJsonPath === "string"
            ? runResult.resultJsonPath
            : undefined,
        workspaceDir:
          typeof runResult.workspaceDir === "string"
            ? runResult.workspaceDir
            : undefined,
        bundleDir:
          typeof runResult.bundleDir === "string"
            ? runResult.bundleDir
            : undefined,
        updatedAt: nowIso(),
        eventPayload: {
          source:
            "skillRunnerTaskReconciler.applySequenceTerminalSuccessContext",
          fetchType: args.context.fetchType,
          stepId: step.id,
          stepIndex,
        },
      });
      const backend = await resolveBackendForContext(args.context);
      const isFinalOrShortCircuit =
        step.id === args.sequenceState.request.final_step_id ||
        matchesShortCircuitRule({ step, output });
      if (isFinalOrShortCircuit) {
        markSequenceRunTerminal({
          sequenceRunId: args.sequenceState.sequenceRunId,
          status: "completed",
        });
      } else {
        const continuationResult = await continueSkillRunnerSequence({
          sequenceRunId: args.sequenceState.sequenceRunId,
          startIndex: stepIndex + 1,
          backend,
          providerOptions: args.sequenceState.providerOptions,
          appendRuntimeLog,
          executeWithProvider: ({
            request,
            backend,
            providerOptions,
            onProgress,
          }) => {
            const client = new SkillRunnerClient({
              baseUrl: backend.baseUrl,
              backendId: backend.id,
            });
            return client.executeSkillRunnerJob(
              request as SkillRunnerJobRequestV1,
              providerOptions || {},
              { onProgress },
            );
          },
          onProgress: (event) => {
            this.handleSequenceContinuationProgress({
              context: args.context,
              sequenceState:
                getSequenceRunState(args.sequenceState.sequenceRunId) ||
                args.sequenceState,
              backend,
              event: event as Record<string, unknown>,
            });
          },
        });
        if (continuationResult.status === "deferred") {
          this.enqueuePromptReconcileRequests({
            backendId: backend.id,
            requestIds: [continuationResult.requestId],
            source: "post-register",
          });
        }
      }
      void this.applySequenceStepSideEffect({
        context: args.context,
        sequenceState:
          getSequenceRunState(args.sequenceState.sequenceRunId) ||
          args.sequenceState,
        stepIndex,
        stepRequest: args.context.request as SkillRunnerJobRequestV1,
        stepResult: runResult,
        output,
        backend,
      }).catch((error) => {
        appendRuntimeLog({
          level: "error",
          scope: "job",
          workflowId: args.context.workflowId,
          backendId: args.context.backendId,
          backendType: args.context.backendType,
          providerId: args.context.providerId,
          runId: args.context.runId,
          jobId: args.context.jobId,
          requestId: args.context.requestId,
          component: "skillrunner-reconciler",
          operation: "sequence-step-apply-side-effect-failed",
          phase: "terminal",
          stage: "sequence-step-apply-side-effect-failed",
          message: "sequence step side-effect apply failed after settlement",
          error,
          details: {
            stepId: step.id,
            stepIndex,
          },
        });
      });
      return true;
    } finally {
      if (bundlePath) {
        await removeFileIfExists(bundlePath);
      }
    }
  }

  private async applyTerminalSuccessContext(
    context: ReconcileContext,
    client: SkillRunnerClient,
    source: ReconcileDispatchSource,
    generation?: number,
    stateJson?: unknown,
  ) {
    const sequenceState = getSequenceRunStateByStepRequest(context.requestId);
    if (sequenceState) {
      const handled = await this.applySequenceTerminalSuccessContext({
        context,
        client,
        sequenceState,
        generation,
        stateJson,
      });
      if (handled) {
        return;
      }
    }
    const workflow = await resolveWorkflow(context.workflowId);
    if (
      typeof generation === "number" &&
      !this.isGenerationActive(generation)
    ) {
      return;
    }
    if (!workflow) {
      throw new Error(`workflow not found for apply: ${context.workflowId}`);
    }
    const targetParentID =
      context.targetParentID ||
      resolveTargetParentIDFromRequest(context.request);
    const applyParent =
      typeof targetParentID === "number" && targetParentID > 0
        ? targetParentID
        : null;
    if (!applyParent && !canWorkflowRunWithoutSelection(workflow.manifest)) {
      throw new Error("cannot resolve target parent for deferred apply");
    }
    const applyDetails =
      applyParent === null
        ? {
            executionMode: context.executionMode,
            fetchType: context.fetchType,
            source,
          }
        : {
            executionMode: context.executionMode,
            fetchType: context.fetchType,
            source,
            targetParentID: applyParent,
          };
    const fetchDetails =
      applyParent === null
        ? { source }
        : { source, targetParentID: applyParent };
    let bundlePath = "";
    try {
      appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: context.workflowId,
        backendId: context.backendId,
        backendType: context.backendType,
        providerId: context.providerId,
        runId: context.runId,
        jobId: context.jobId,
        requestId: context.requestId,
        component: "skillrunner-reconciler",
        operation: "deferred-apply-start",
        phase: "terminal",
        stage: "deferred-apply-start",
        message: "deferred terminal applyResult started",
        details: applyDetails,
      });
      updateSkillRunnerRunApplyState({
        backendId: context.backendId,
        requestId: context.requestId,
        state: "running",
        attempt: context.applyAttempt,
        maxAttempt: context.applyMaxAttempt,
        updatedAt: nowIso(),
        eventType: "apply.started",
        eventPayload: {
          source: "skillRunnerTaskReconciler.applyTerminalSuccessContext",
          fetchType: context.fetchType,
        },
      });
      const runResult: Record<string, unknown> = {
        status: "succeeded",
        requestId: context.requestId,
        fetchType: context.fetchType,
      };
      const resultJsonPath = resolveSingleRunResultJsonPathFromRequest(
        context.request,
      );
      if (resultJsonPath) {
        runResult.resultJsonPath = resultJsonPath;
        runResult.resultArtifactBasePath = parentEntryPath(resultJsonPath);
      }
      let bundleReader = createUnavailableBundleReader(context.requestId);
      if (context.fetchType === "bundle") {
        appendRuntimeLog({
          level: "info",
          scope: "job",
          workflowId: context.workflowId,
          backendId: context.backendId,
          backendType: context.backendType,
          providerId: context.providerId,
          runId: context.runId,
          jobId: context.jobId,
          requestId: context.requestId,
          component: "skillrunner-reconciler",
          operation: "deferred-bundle-fetch-start",
          phase: "terminal",
          stage: "deferred-bundle-fetch-start",
          message: "deferred bundle fetch started",
          details: fetchDetails,
        });
        const bundleBytes = await client.fetchRunBundle({
          requestId: context.requestId,
        });
        if (
          typeof generation === "number" &&
          !this.isGenerationActive(generation)
        ) {
          return;
        }
        runResult.bundleBytes = bundleBytes;
        bundlePath = buildTempBundlePath(context.requestId);
        await writeBytes(bundlePath, bundleBytes);
        if (
          typeof generation === "number" &&
          !this.isGenerationActive(generation)
        ) {
          return;
        }
        const zipReader = new ZipBundleReader(bundlePath);
        bundleReader = zipReader;
        runResult.bundleDir = await zipReader.getExtractedDir();
        appendRuntimeLog({
          level: "info",
          scope: "job",
          workflowId: context.workflowId,
          backendId: context.backendId,
          backendType: context.backendType,
          providerId: context.providerId,
          runId: context.runId,
          jobId: context.jobId,
          requestId: context.requestId,
          component: "skillrunner-reconciler",
          operation: "deferred-bundle-fetch-succeeded",
          phase: "terminal",
          stage: "deferred-bundle-fetch-succeeded",
          message: "deferred bundle fetch succeeded",
          details: fetchDetails,
        });
      } else {
        const normalized = await client.fetchRunResultPayload({
          requestId: context.requestId,
          stateJson,
        });
        runResult.resultJson = normalized.resultJson;
        runResult.resultJsonPath = normalized.resultJsonPath;
        runResult.workspaceDir = normalized.workspaceDir;
        runResult.responseJson = normalized.responseJson;
        if (
          typeof generation === "number" &&
          !this.isGenerationActive(generation)
        ) {
          return;
        }
      }
      const resultContext = await createWorkflowResultContext({
        runResult,
        bundleReader,
        manifest: workflow.manifest,
      });
      runResult.resultJson = resultContext.resultJson;
      updateSkillRunnerRunResult({
        backendId: context.backendId,
        requestId: context.requestId,
        resultJson: resultContext.resultJson,
        resultJsonPath:
          typeof runResult.resultJsonPath === "string"
            ? runResult.resultJsonPath
            : undefined,
        workspaceDir:
          typeof runResult.workspaceDir === "string"
            ? runResult.workspaceDir
            : undefined,
        bundleDir:
          typeof runResult.bundleDir === "string"
            ? runResult.bundleDir
            : undefined,
        updatedAt: nowIso(),
        eventPayload: {
          source: "skillRunnerTaskReconciler.applyTerminalSuccessContext",
          fetchType: context.fetchType,
        },
      });
      await executeApplyResult({
        workflow,
        parent: applyParent,
        bundleReader,
        resultContext,
        request: context.request,
        runResult,
      });
      if (
        typeof generation === "number" &&
        !this.isGenerationActive(generation)
      ) {
        return;
      }
      appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: context.workflowId,
        backendId: context.backendId,
        backendType: context.backendType,
        providerId: context.providerId,
        runId: context.runId,
        jobId: context.jobId,
        requestId: context.requestId,
        component: "skillrunner-reconciler",
        operation: "reconcile-owned-terminal-apply",
        phase: "terminal",
        stage: "reconcile-owned-terminal-apply",
        message:
          "reconciler executed terminal applyResult for recoverable request",
        details: applyDetails,
      });
      appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: context.workflowId,
        backendId: context.backendId,
        backendType: context.backendType,
        providerId: context.providerId,
        runId: context.runId,
        jobId: context.jobId,
        requestId: context.requestId,
        component: "skillrunner-reconciler",
        operation: "deferred-apply-succeeded",
        phase: "terminal",
        stage: "deferred-apply-succeeded",
        message: "deferred applyResult succeeded",
        details:
          applyParent === null
            ? { fetchType: context.fetchType, source }
            : {
                fetchType: context.fetchType,
                source,
                targetParentID: applyParent,
              },
      });
      updateSkillRunnerRunApplyState({
        backendId: context.backendId,
        requestId: context.requestId,
        state: "succeeded",
        attempt: 0,
        maxAttempt: context.applyMaxAttempt,
        updatedAt: nowIso(),
        eventType: "apply.succeeded",
        eventPayload: {
          source: "skillRunnerTaskReconciler.applyTerminalSuccessContext",
          fetchType: context.fetchType,
        },
      });
    } finally {
      if (bundlePath) {
        await removeFileIfExists(bundlePath);
      }
    }
  }

  private async reconcileOneContext(
    context: ReconcileContext,
    source: ReconcileDispatchSource,
    generation?: number,
  ) {
    if (
      typeof generation === "number" &&
      !this.isGenerationActive(generation)
    ) {
      return;
    }
    const client = new SkillRunnerClient({
      baseUrl: context.backendBaseUrl,
      backendId: context.backendId,
    });
    const previousState = context.state;
    const backendFailureKey =
      normalizeString(context.backendId) || "__unknown_backend__";
    try {
      const runState = await client.getRunState({
        requestId: context.requestId,
      });
      if (
        typeof generation === "number" &&
        !this.isGenerationActive(generation)
      ) {
        return;
      }
      markSkillRunnerBackendHealthSuccess(context.backendId);
      this.backendReconcileFailureLogUntilByBackend.delete(backendFailureKey);
      const observed = normalizeStatusWithGuard({
        value: runState.status,
        fallback: context.state,
        requestId: context.requestId,
      });
      this.logTransitionViolation(context, observed.violation);
      if (!isTerminalState(observed.status)) {
        const nextObservedState = normalizeStatus(
          observed.status,
          context.state,
        );
        const stateChanged = nextObservedState !== context.state;
        if (nextObservedState !== context.state) {
          context.state = nextObservedState;
          context.updatedAt = nowIso();
        }
        if (stateChanged) {
          this.resetReconcileCadence(context);
        }
        this.updateReconcileCadence(context, nextObservedState);
        writeContextsToRunStore(Array.from(this.contexts.values()));
        if (nextObservedState === "running") {
          this.ensureRunningSessionSync(context);
        } else {
          stopSessionSync({
            backendId: context.backendId,
            requestId: context.requestId,
          });
        }
        return;
      }
      this.resetReconcileCadence(context);
      const confirmedTerminal = await resolveDoubleConfirmedTerminalRunState({
        client,
        requestId: context.requestId,
        firstStatus: runState.status,
        firstError: runState.error,
      });
      if (
        typeof generation === "number" &&
        !this.isGenerationActive(generation)
      ) {
        return;
      }
      if (!confirmedTerminal) {
        return;
      }
      const normalized = normalizeStatusWithGuard({
        value: confirmedTerminal.state,
        fallback: context.state,
        requestId: context.requestId,
      });
      this.logTransitionViolation(context, normalized.violation);
      const transition = validateTransition({
        prev: previousState,
        next: normalized.status,
        requestId: context.requestId,
      });
      this.logTransitionViolation(context, transition.violation);
      const nextState = transition.ok
        ? transition.nextState
        : transition.prevState;
      const nextError = normalizeString(runState.error) || undefined;
      const changed =
        nextState !== previousState || nextError !== context.error;
      context.state = nextState;
      context.error = nextError;
      context.updatedAt = nowIso();
      persistContextToSkillRunnerRunStore(context, "backend.terminal", {
        source: "jobs-terminal",
        status: nextState,
        error: nextError,
      });
      this.applySnapshotToTaskStores({
        context,
        state: nextState,
        error: nextError,
        updatedAt: context.updatedAt,
      });
      if (changed) {
        recordWorkflowTaskUpdate(contextToJobRecord(context));
        recordTaskDashboardHistoryFromJob(contextToJobRecord(context));
        writeContextsToRunStore(Array.from(this.contexts.values()));
      }
      if (!isTerminalState(nextState)) {
        return;
      }
      this.trackEvent(context, {
        kind: "terminal",
        status: nextState,
      });
      if (nextState === "succeeded") {
        if (context.nextApplyRetryAt) {
          const retryTs = Date.parse(context.nextApplyRetryAt);
          if (Number.isFinite(retryTs) && retryTs > Date.now()) {
            writeContextsToRunStore(Array.from(this.contexts.values()));
            return;
          }
        }
        try {
          await this.applyTerminalSuccessContext(
            context,
            client,
            source,
            generation,
            runState,
          );
          if (
            typeof generation === "number" &&
            !this.isGenerationActive(generation)
          ) {
            return;
          }
          context.applyAttempt = 0;
          context.nextApplyRetryAt = undefined;
          context.nextReconcileAt = undefined;
          context.lastApplyError = undefined;
          const sequenceCompletion =
            this.settleSequenceWorkflowCompletionIfNeeded({
              context,
              terminalState: "succeeded",
            });
          if (sequenceCompletion.sequence) {
            if (
              sequenceCompletion.terminal &&
              !sequenceCompletion.handled
            ) {
              this.showTerminalToast(context, "succeeded");
            }
          } else {
            this.trackEvent(context, {
              kind: "apply-succeeded",
              status: nextState,
            });
            const deferredCompletion = settleDeferredWorkflowCompletion({
              runId: context.runId,
              requestId: context.requestId,
              succeeded: true,
              terminalState: "succeeded",
            });
            if (!deferredCompletion.handled) {
              this.showTerminalToast(context, "succeeded");
            }
          }
        } catch (error) {
          const contractFailure = isDeferredApplyContractError(error);
          context.applyAttempt = contractFailure
            ? Math.max(context.applyAttempt + 1, context.applyMaxAttempt)
            : context.applyAttempt + 1;
          context.lastApplyError = normalizeString(
            error && typeof error === "object" && "message" in error
              ? (error as { message?: unknown }).message
              : error,
          );
          context.updatedAt = nowIso();
          const willRetry =
            !contractFailure && context.applyAttempt < context.applyMaxAttempt;
          if (willRetry) {
            const delayMs = computeApplyRetryDelayMs(context.applyAttempt);
            context.nextApplyRetryAt = new Date(
              Date.now() + delayMs,
            ).toISOString();
            context.nextReconcileAt = context.nextApplyRetryAt;
          } else {
            context.nextApplyRetryAt = undefined;
            context.nextReconcileAt = undefined;
          }
          updateSkillRunnerRunApplyState({
            backendId: context.backendId,
            requestId: context.requestId,
            state: "failed",
            attempt: context.applyAttempt,
            maxAttempt: context.applyMaxAttempt,
            nextRetryAt: context.nextApplyRetryAt,
            error: context.lastApplyError,
            updatedAt: context.updatedAt,
            eventType: "apply.failed",
            eventPayload: {
              source: "skillRunnerTaskReconciler.reconcileOneContext",
              retry: willRetry,
              contractFailure,
            },
          });
          appendRuntimeLog({
            level: "error",
            scope: "job",
            workflowId: context.workflowId,
            backendId: context.backendId,
            backendType: context.backendType,
            providerId: context.providerId,
            runId: context.runId,
            jobId: context.jobId,
            requestId: context.requestId,
            component: "skillrunner-reconciler",
            operation: "deferred-apply-failed",
            phase: willRetry ? "retry" : "terminal",
            attempt: context.applyAttempt,
            stage: "deferred-apply-failed",
            message: contractFailure
              ? "deferred applyResult failed due to a result contract error"
              : "deferred applyResult failed",
            error,
            details: {
              attempt: context.applyAttempt,
              maxAttempt: context.applyMaxAttempt,
              nextRetryAt: context.nextApplyRetryAt,
              source,
              targetParentID: context.targetParentID,
              retry: willRetry,
              contractFailure,
            },
          });
          if (!willRetry) {
            this.trackEvent(context, {
              kind: "apply-exhausted",
              status: nextState,
            });
            appendRuntimeLog({
              level: "error",
              scope: "job",
              workflowId: context.workflowId,
              backendId: context.backendId,
              backendType: context.backendType,
              providerId: context.providerId,
              runId: context.runId,
              jobId: context.jobId,
              requestId: context.requestId,
              component: "skillrunner-reconciler",
              operation: "deferred-apply-exhausted",
              phase: "terminal",
              attempt: context.applyAttempt,
              stage: "deferred-apply-exhausted",
              message: contractFailure
                ? "deferred apply stopped after a non-retryable result contract error"
                : "deferred apply retries exhausted",
              details: {
                attempt: context.applyAttempt,
                maxAttempt: context.applyMaxAttempt,
                source,
                targetParentID: context.targetParentID,
                contractFailure,
              },
            });
            this.contexts.delete(context.id);
            this.reportedViolationKeysByContext.delete(context.id);
            stopSessionSync({
              backendId: context.backendId,
              requestId: context.requestId,
            });
            const deferredCompletion = settleDeferredWorkflowCompletion({
              runId: context.runId,
              requestId: context.requestId,
              succeeded: false,
              terminalState: "failed",
              reason:
                context.lastApplyError ||
                localizeWorkflowText(
                  "workflow-execute-unknown-error",
                  "unknown error",
                ),
            });
            if (!deferredCompletion.handled) {
              this.showTerminalToast(context, "failed");
            }
            writeContextsToRunStore(Array.from(this.contexts.values()));
            return;
          }
          writeContextsToRunStore(Array.from(this.contexts.values()));
          return;
        }
      } else if (nextState === "failed" || nextState === "canceled") {
        const reason =
          nextState === "failed"
            ? context.error ||
              localizeWorkflowText(
                "workflow-execute-unknown-error",
                "unknown error",
              )
            : "canceled";
        const sequenceCompletion =
          this.settleSequenceWorkflowCompletionIfNeeded({
            context,
            terminalState: nextState,
            reason,
          });
        if (sequenceCompletion.sequence) {
          if (sequenceCompletion.terminal && !sequenceCompletion.handled) {
            this.showTerminalToast(context, nextState);
          }
        } else {
          const deferredCompletion = settleDeferredWorkflowCompletion({
            runId: context.runId,
            requestId: context.requestId,
            succeeded: false,
            terminalState: nextState,
            reason,
          });
          if (!deferredCompletion.handled) {
            this.showTerminalToast(context, nextState);
          }
        }
      }
      this.contexts.delete(context.id);
      this.reportedViolationKeysByContext.delete(context.id);
      stopSessionSync({
        backendId: context.backendId,
        requestId: context.requestId,
      });
      writeContextsToRunStore(Array.from(this.contexts.values()));
    } catch (error) {
      if (
        typeof generation === "number" &&
        !this.isGenerationActive(generation)
      ) {
        return;
      }
      if (isSkillRunnerRunTerminalClientError(error)) {
        const status = extractHttpStatusFromError(error);
        context.state = "failed";
        context.error = `SkillRunner request is unavailable: status=${status || "unknown"}`;
        context.updatedAt = nowIso();
        settleSkillRunnerRunAsFailed({
          backendId: context.backendId,
          backendType: context.backendType,
          providerId: context.providerId,
          workflowId: context.workflowId,
          runId: context.runId,
          jobId: context.jobId,
          requestId: context.requestId,
          reason: context.error,
          source: `context-reconcile:${source}`,
          error,
          updatedAt: context.updatedAt,
        });
        this.contexts.delete(context.id);
        this.reportedViolationKeysByContext.delete(context.id);
        writeContextsToRunStore(Array.from(this.contexts.values()));
        return;
      }
      const errorName = normalizeString((error as { name?: unknown })?.name);
      if (
        errorName === "SkillRunnerHttpTimeoutError" ||
        errorName === "SkillRunnerConnectionTimeoutError"
      ) {
        markSkillRunnerBackendRecoveryNeeded({
          backendId: context.backendId,
          error,
        });
      }
      this.updateReconcileFailureCadence(context);
      writeContextsToRunStore(Array.from(this.contexts.values()));
      const health = getSkillRunnerBackendHealthState(context.backendId);
      const now = Date.now();
      const throttleUntil =
        this.backendReconcileFailureLogUntilByBackend.get(backendFailureKey) ||
        0;
      if (now < throttleUntil) {
        return;
      }
      this.backendReconcileFailureLogUntilByBackend.set(
        backendFailureKey,
        now + BACKEND_RECONCILE_FAILURE_LOG_THROTTLE_MS,
      );
      appendRuntimeLog({
        level: "warn",
        scope: "job",
        workflowId: context.workflowId,
        backendId: context.backendId,
        backendType: context.backendType,
        providerId: context.providerId,
        runId: context.runId,
        jobId: context.jobId,
        requestId: context.requestId,
        component: "skillrunner-reconciler",
        operation: "backend-reconcile-failed",
        phase: "reconcile",
        stage: "backend-reconcile-failed",
        message: "backend reconcile step failed; will retry",
        error,
        details: {
          backoffLevel: health?.backoffLevel,
          nextAllowedAt:
            (health?.nextProbeAt || 0) > 0
              ? new Date(health?.nextProbeAt || 0).toISOString()
              : undefined,
          source,
          targetParentID: context.targetParentID,
        },
      });
    }
  }

  private async reconcileTrackedContexts(
    entries: ReconcileContext[],
    source: ReconcileDispatchSource,
    generation?: number,
  ) {
    for (const context of entries) {
      if (
        typeof generation === "number" &&
        !this.isGenerationActive(generation)
      ) {
        return;
      }
      if (this.shouldSkipByReconcileCadence(context, source)) {
        if (normalizeStatus(context.state, "running") === "running") {
          this.ensureRunningSessionSync(context);
        } else {
          stopSessionSync({
            backendId: context.backendId,
            requestId: context.requestId,
          });
        }
        continue;
      }
      if (normalizeStatus(context.state, "running") === "running") {
        this.ensureRunningSessionSync(context);
      } else {
        stopSessionSync({
          backendId: context.backendId,
          requestId: context.requestId,
        });
      }
      await this.reconcileOneContext(context, source, generation);
    }
  }

  private async refreshContextBackendHealthForPrompt(
    context: ReconcileContext,
    generation?: number,
  ) {
    if (
      typeof generation === "number" &&
      !this.isGenerationActive(generation)
    ) {
      return;
    }
    if (
      getSkillRunnerBackendHealthState(context.backendId) &&
      !isSkillRunnerBackendReconcileFlagged(context.backendId)
    ) {
      return;
    }
    try {
      const client = buildSkillRunnerManagementClient({
        backend: {
          id: context.backendId,
          type: context.backendType,
          baseUrl: context.backendBaseUrl,
          auth: { kind: "none" },
        } as BackendInstance,
        localize: (_key: string, fallback: string) => fallback,
      });
      await client.probeReachability();
      if (
        typeof generation === "number" &&
        !this.isGenerationActive(generation)
      ) {
        return;
      }
      markSkillRunnerBackendHealthSuccess(context.backendId);
      this.backendReconcileFailureLogUntilByBackend.delete(context.backendId);
    } catch (error) {
      markSkillRunnerBackendHealthFailure({
        backendId: context.backendId,
        error,
      });
    }
  }

  private enqueuePromptReconcileRequests(args: {
    backendId?: string;
    requestIds: string[];
    source: ReconcileDispatchSource;
  }) {
    for (const requestId of args.requestIds) {
      const key = `${args.backendId || "*"}:${requestId}`;
      this.pendingPromptReconciles.set(key, {
        backendId: args.backendId,
        requestId,
        source: args.source,
      });
    }
  }

  private async flushPromptReconcileQueue(generation?: number) {
    if (
      typeof generation === "number" &&
      !this.isGenerationActive(generation)
    ) {
      return;
    }
    if (this.isReconciling || this.pendingPromptReconciles.size === 0) {
      return;
    }
    const pending = Array.from(this.pendingPromptReconciles.values());
    this.pendingPromptReconciles.clear();
    this.isReconciling = true;
    try {
      const contexts = pending
        .map((entry) => {
          if (entry.backendId) {
            return this.contexts.get(`${entry.backendId}:${entry.requestId}`);
          }
          return Array.from(this.contexts.values()).find(
            (context) => normalizeString(context.requestId) === entry.requestId,
          );
        })
        .filter((entry): entry is ReconcileContext => !!entry);
      if (contexts.length === 0) {
        appendRuntimeLog({
          level: "warn",
          scope: "workflow-trigger",
          component: "skillrunner-reconciler",
          operation: "post-register-reconcile-context-missing",
          phase: "reconcile",
          stage: "post-register-reconcile-context-missing",
          message:
            "post-register reconcile could not find any recoverable contexts",
          details: {
            requestIds: pending.map((entry) => entry.requestId),
            backendIds: pending.map((entry) => entry.backendId || ""),
          },
        });
      }
      await this.reconcileTrackedContexts(
        contexts,
        "post-register",
        generation,
      );
    } finally {
      this.isReconciling = false;
      if (
        this.pendingPromptReconciles.size > 0 &&
        (typeof generation !== "number" || this.isGenerationActive(generation))
      ) {
        if (typeof generation === "number") {
          this.spawnBackgroundTask("prompt-flush", generation, async () => {
            await this.flushPromptReconcileQueue(generation);
          });
        } else {
          void this.flushPromptReconcileQueue();
        }
      }
    }
  }

  async promptReconcileRequests(args: {
    backendId?: string;
    requestIds: string[];
    source?: ReconcileDispatchSource;
  }) {
    const backendId = normalizeString(args.backendId) || undefined;
    const requestIds = Array.isArray(args.requestIds)
      ? args.requestIds.map((entry) => normalizeString(entry)).filter(Boolean)
      : [];
    if (requestIds.length === 0) {
      return;
    }
    const source = args.source || "post-register";
    appendRuntimeLog({
      level: "info",
      scope: "workflow-trigger",
      backendId,
      backendType: "skillrunner",
      providerId: "skillrunner",
      component: "skillrunner-reconciler",
      operation: "post-register-reconcile-requested",
      phase: "reconcile",
      stage: "post-register-reconcile-requested",
      message: "post-register reconcile requested",
      details: {
        requestIds,
        backendId,
      },
    });
    this.enqueuePromptReconcileRequests({
      backendId,
      requestIds,
      source,
    });
    void this.flushPromptReconcileQueue().catch((error) => {
      appendRuntimeLog({
        level: "warn",
        scope: "workflow-trigger",
        backendId,
        backendType: "skillrunner",
        providerId: "skillrunner",
        component: "skillrunner-reconciler",
        operation: "post-register-reconcile-flush-failed",
        phase: "reconcile",
        stage: "post-register-reconcile-flush-failed",
        message: "post-register reconcile flush failed",
        error,
        details: {
          requestIds,
          backendId,
        },
      });
    });
  }

  async reconcilePending(generation?: number) {
    if (
      typeof generation === "number" &&
      !this.isGenerationActive(generation)
    ) {
      return;
    }
    if (this.isReconciling) {
      return;
    }
    this.isReconciling = true;
    try {
      await this.refreshTrackedBackendHealth(generation);
      const entries = Array.from(this.contexts.values());
      await this.reconcileTrackedContexts(entries, "interval", generation);
      if (
        typeof generation === "number" &&
        !this.isGenerationActive(generation)
      ) {
        return;
      }
      await this.reconcileMissingContextRunningTasks(generation);
    } finally {
      this.isReconciling = false;
      if (
        this.pendingPromptReconciles.size > 0 &&
        (typeof generation !== "number" || this.isGenerationActive(generation))
      ) {
        if (typeof generation === "number") {
          this.spawnBackgroundTask("prompt-flush", generation, async () => {
            await this.flushPromptReconcileQueue(generation);
          });
        } else {
          void this.flushPromptReconcileQueue();
        }
      }
    }
  }

  async drain() {
    await this.drainInFlightTasks();
  }
}

const defaultReconciler = new SkillRunnerTaskReconciler();

export function startSkillRunnerTaskReconciler() {
  defaultReconciler.start();
}

export function stopSkillRunnerTaskReconciler() {
  defaultReconciler.stop();
}

export async function drainSkillRunnerTaskReconciler() {
  await defaultReconciler.drain();
}

export async function shutdownSkillRunnerTaskReconciler() {
  defaultReconciler.stop();
  await defaultReconciler.drain();
}

export async function resetSkillRunnerTaskReconcilerForTests() {
  await defaultReconciler.resetForTests();
}

export function getSkillRunnerTaskReconcilerRuntimeForTests() {
  return defaultReconciler.getRuntimeSnapshotForTests();
}

export function registerSkillRunnerRunForSettlement(args: {
  workflowId: string;
  workflowLabel: string;
  requestKind: string;
  request: unknown;
  backend: BackendInstance;
  providerId: string;
  providerOptions?: Record<string, unknown>;
  job: JobRecord;
}) {
  defaultReconciler.registerFromJob(args);
}

export function purgeSkillRunnerRunByRequest(args: {
  backendId?: string;
  requestId: string;
}) {
  return defaultReconciler.purgeRequestContext(args);
}

export async function promptSkillRunnerTaskReconcileRequests(args: {
  backendId?: string;
  requestIds: string[];
  source?: ReconcileDispatchSource;
}) {
  await defaultReconciler.promptReconcileRequests(args);
}

export function registerSkillRunnerDeferredRun(args: {
  workflowId: string;
  workflowLabel: string;
  requestKind: string;
  request: unknown;
  backend: BackendInstance;
  providerId: string;
  providerOptions?: Record<string, unknown>;
  job: JobRecord;
}) {
  registerSkillRunnerRunForSettlement(args);
}

export function purgeSkillRunnerBackendReconcileState(backendIdRaw: string) {
  const backendId = normalizeString(backendIdRaw);
  if (!backendId) {
    return {
      backendId,
      removedContexts: 0,
      removedActive: 0,
      removedHistory: 0,
      removedRuns: 0,
    };
  }
  const requestIdSet = new Set<string>();
  for (const row of listActiveWorkflowTasks()) {
    if (normalizeString(row.backendId) !== backendId) {
      continue;
    }
    const requestId = normalizeString(row.requestId);
    if (!requestId) {
      continue;
    }
    requestIdSet.add(requestId);
  }
  for (const row of listTaskDashboardHistory({ backendId })) {
    const requestId = normalizeString(row.requestId);
    if (!requestId) {
      continue;
    }
    requestIdSet.add(requestId);
  }
  for (const record of listSkillRunnerRunRecords()) {
    if (normalizeString(record.backendId) !== backendId) {
      continue;
    }
    const requestId = normalizeString(record.requestId);
    if (!requestId) {
      continue;
    }
    requestIdSet.add(requestId);
  }
  const requestIds = Array.from(requestIdSet.values());
  const removedActive = removeWorkflowTasksByBackendAndRequestIds({
    backendId,
    requestIds,
  });
  const removedHistory = removeTaskDashboardHistoryByBackendAndRequestIds({
    backendId,
    requestIds,
  });
  const removedContextsInMemory =
    defaultReconciler.purgeBackendContexts(backendId);
  const removedRuns = deleteSkillRunnerRunRecordsByBackend(backendId);
  return {
    backendId,
    removedContexts: removedContextsInMemory,
    removedActive,
    removedHistory,
    removedRuns,
  };
}
