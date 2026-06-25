import {
  ACP_SKILL_RUN_REQUEST_KIND,
  PASS_THROUGH_BACKEND_TYPE,
} from "../config/defaults";
import type { AcpSkillRunSummary } from "./acpSkillRunStore";
import type { WorkflowTaskRecord } from "./taskRuntime";

export type DashboardActiveTaskRow = WorkflowTaskRecord;

export function isAcpSkillRunTask(entry: {
  backendType?: string;
  requestKind?: string;
  id?: string;
}) {
  const backendType = String(entry.backendType || "").trim();
  const requestKind = String(entry.requestKind || "").trim();
  const taskId = String(entry.id || "").trim();
  return (
    backendType === "acp" &&
    (requestKind === ACP_SKILL_RUN_REQUEST_KIND ||
      taskId.startsWith("acp-skill-run:"))
  );
}

function isVisibleAcpSkillRun(run: AcpSkillRunSummary) {
  return (
    !run.removedAt &&
    !run.archivedAt &&
    run.status !== "succeeded" &&
    run.status !== "failed" &&
    run.status !== "canceled"
  );
}

export function getVisibleAcpSkillRunRequestIds(runs: AcpSkillRunSummary[]) {
  return new Set(
    (Array.isArray(runs) ? runs : [])
      .filter((run) => isVisibleAcpSkillRun(run))
      .map((run) => String(run.requestId || "").trim())
      .filter(Boolean),
  );
}

export function isVisibleDashboardActiveTask(
  entry: WorkflowTaskRecord,
  visibleAcpRequestIds: Set<string>,
) {
  if (entry.backendType === PASS_THROUGH_BACKEND_TYPE) {
    return false;
  }
  if (!isAcpSkillRunTask(entry)) {
    return true;
  }
  const requestId = String(entry.requestId || "").trim();
  if (!requestId) {
    return false;
  }
  return visibleAcpRequestIds.has(requestId);
}

export function filterDashboardActiveTasks(args: {
  activeTasks: WorkflowTaskRecord[];
  acpSkillRuns: AcpSkillRunSummary[];
}) {
  const visibleAcpRequestIds = getVisibleAcpSkillRunRequestIds(
    args.acpSkillRuns,
  );
  return (Array.isArray(args.activeTasks) ? args.activeTasks : []).filter(
    (entry) => isVisibleDashboardActiveTask(entry, visibleAcpRequestIds),
  );
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function resolveAcpSkillRunTaskState(run: AcpSkillRunSummary) {
  if (run.pendingPermission) {
    return "waiting_user";
  }
  return normalizeText(run.status) || "running";
}

export function projectDashboardActiveTasks(args: {
  activeTasks: WorkflowTaskRecord[];
  acpSkillRuns: AcpSkillRunSummary[];
}) {
  const acpRunByRequestId = new Map(
    (Array.isArray(args.acpSkillRuns) ? args.acpSkillRuns : [])
      .map((run) => [normalizeText(run.requestId), run] as const)
      .filter(([requestId]) => !!requestId),
  );
  return filterDashboardActiveTasks(args).map(
    (entry): DashboardActiveTaskRow => {
      if (!isAcpSkillRunTask(entry)) {
        return { ...entry };
      }
      const run = acpRunByRequestId.get(normalizeText(entry.requestId));
      if (!run) {
        return { ...entry };
      }
      return {
        ...entry,
        state: resolveAcpSkillRunTaskState(run) as WorkflowTaskRecord["state"],
        error: run.error || entry.error,
        updatedAt: normalizeText(run.updatedAt) || entry.updatedAt,
      };
    },
  );
}

export function countDashboardHumanAttentionTasks(args: {
  activeTasks: WorkflowTaskRecord[];
  acpSkillRuns: AcpSkillRunSummary[];
}) {
  return projectDashboardActiveTasks(args).filter((entry) => {
    const state = normalizeText(entry.state)
      .toLowerCase()
      .replace(/[-\s]+/g, "_");
    return state === "waiting_user" || state === "waiting_auth";
  }).length;
}
