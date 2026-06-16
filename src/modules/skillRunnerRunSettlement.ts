import { appendRuntimeLog } from "./runtimeLogManager";
import { stopSessionSync } from "./skillRunnerSessionSyncManager";
import { updateSkillRunnerRequestLedgerSnapshot } from "./skillRunnerRequestLedger";
import {
  upsertTaskDashboardHistoryFromTaskRecord,
  updateTaskDashboardHistoryStateByRequest,
} from "./taskDashboardHistory";
import {
  listWorkflowTasks,
  updateWorkflowTaskStateByRequest,
} from "./taskRuntime";

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
      updatedLedger: false,
      stoppedSession: false,
    };
  }
  const backendId = normalizeString(args.backendId);
  const updatedAt = normalizeString(args.updatedAt) || new Date().toISOString();
  const error =
    normalizeString(args.reason) ||
    stringifyError(args.error) ||
    "SkillRunner run is unavailable";
  const updatedActiveCount = updateWorkflowTaskStateByRequest({
    backendId,
    requestId,
    state: "failed",
    error,
    updatedAt,
  });
  let updatedHistoryCount = updateTaskDashboardHistoryStateByRequest({
    backendId,
    requestId,
    state: "failed",
    error,
    updatedAt,
  });
  if (updatedHistoryCount === 0) {
    const activeProjection = listWorkflowTasks().find((entry) => {
      if (normalizeString(entry.requestId) !== requestId) {
        return false;
      }
      return !backendId || normalizeString(entry.backendId) === backendId;
    });
    if (activeProjection) {
      upsertTaskDashboardHistoryFromTaskRecord({
        ...activeProjection,
        state: "failed",
        error,
        updatedAt,
      });
      updatedHistoryCount = 1;
    }
  }
  const updatedLedger = !!updateSkillRunnerRequestLedgerSnapshot({
    requestId,
    source: "jobs-terminal",
    status: "failed",
    error,
    updatedAt,
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
      updatedActiveCount,
      updatedHistoryCount,
      updatedLedger,
    },
  });
  return {
    updatedActiveCount,
    updatedHistoryCount,
    updatedLedger,
    stoppedSession: true,
  };
}
