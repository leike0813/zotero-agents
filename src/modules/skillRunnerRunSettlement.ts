import { appendRuntimeLog } from "./runtimeLogManager";
import { stopSessionSync } from "./skillRunnerSessionSyncManager";
import {
  isTerminal,
  isWaiting,
  normalizeStatus,
  type SkillRunnerProviderState,
} from "./skillRunnerProviderStateMachine";
import { updateSkillRunnerRunStateByRequest } from "./skillRunnerRunStore";

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
  const updatedRun = !!updateSkillRunnerRunStateByRequest({
    backendId,
    requestId,
    state: "failed",
    error,
    updatedAt,
    eventType: "run.terminal_client_error",
    eventPayload: {
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
    message: "skillrunner request settled as failed after terminal run-level error",
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
