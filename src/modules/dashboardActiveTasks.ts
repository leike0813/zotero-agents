import {
  ACP_SKILL_RUN_REQUEST_KIND,
  PASS_THROUGH_BACKEND_TYPE,
} from "../config/defaults";
import {
  isActiveAcpSkillRunStatus,
  type AcpSkillRunSummary,
} from "./acpSkillRunStore";
import { mapAcpSkillRunSummaryToWorkflowTask } from "./acpSkillRunTaskProjection";
import type { WorkflowTaskRecord } from "./taskRuntime";

export type DashboardActiveTaskRow = WorkflowTaskRecord;
export type DashboardActiveTaskScope = {
  backendId?: string;
  requestId?: string;
};

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
    !run.removedAt && !run.archivedAt && isActiveAcpSkillRunStatus(run.status)
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

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function matchesScope(
  entry: WorkflowTaskRecord,
  scope?: DashboardActiveTaskScope,
) {
  const backendId = normalizeText(scope?.backendId);
  if (backendId && normalizeText(entry.backendId) !== backendId) {
    return false;
  }
  const requestId = normalizeText(scope?.requestId);
  if (requestId && normalizeText(entry.requestId) !== requestId) {
    return false;
  }
  return true;
}

function normalizeLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.max(1, Math.floor(parsed));
}

function compareUpdatedDesc(
  left: WorkflowTaskRecord,
  right: WorkflowTaskRecord,
) {
  return normalizeText(right.updatedAt).localeCompare(
    normalizeText(left.updatedAt),
  );
}

export function filterDashboardActiveTasks(args: {
  activeTasks: WorkflowTaskRecord[];
  acpSkillRuns: AcpSkillRunSummary[];
  scope?: DashboardActiveTaskScope;
  limit?: number;
}) {
  return projectDashboardActiveTasks(args);
}

export function projectDashboardActiveTasks(args: {
  activeTasks: WorkflowTaskRecord[];
  acpSkillRuns: AcpSkillRunSummary[];
  scope?: DashboardActiveTaskScope;
  limit?: number;
}) {
  const rows: DashboardActiveTaskRow[] = [];
  for (const entry of Array.isArray(args.activeTasks) ? args.activeTasks : []) {
    if (entry.backendType === PASS_THROUGH_BACKEND_TYPE) {
      continue;
    }
    if (isAcpSkillRunTask(entry)) {
      continue;
    }
    if (matchesScope(entry, args.scope)) {
      rows.push({ ...entry });
    }
  }
  for (const run of Array.isArray(args.acpSkillRuns) ? args.acpSkillRuns : []) {
    if (!isVisibleAcpSkillRun(run)) {
      continue;
    }
    const row = mapAcpSkillRunSummaryToWorkflowTask(run);
    if (matchesScope(row, args.scope)) {
      rows.push(row);
    }
  }
  rows.sort(compareUpdatedDesc);
  const limit = normalizeLimit(args.limit);
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

export function countDashboardHumanAttentionTasks(args: {
  activeTasks: WorkflowTaskRecord[];
  acpSkillRuns: AcpSkillRunSummary[];
  scope?: DashboardActiveTaskScope;
}) {
  return projectDashboardActiveTasks(args).filter((entry) => {
    const state = normalizeText(entry.state)
      .toLowerCase()
      .replace(/[-\s]+/g, "_");
    return state === "waiting_user" || state === "waiting_auth";
  }).length;
}
