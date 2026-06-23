import { appendRuntimeLog } from "./runtimeLogManager";
import { stopSessionSync } from "./skillRunnerSessionSyncManager";
import { updateSkillRunnerRunStateByRequest } from "./skillRunnerRunStore";

function normalizeString(value: unknown) {
  return String(value || "").trim();
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
