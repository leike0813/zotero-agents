import {
  ACP_SKILL_RUN_REQUEST_KIND,
  PASS_THROUGH_BACKEND_TYPE,
} from "../config/defaults";
import type { AcpSkillRunRecord } from "./acpSkillRunStore";
import type { WorkflowTaskRecord } from "./taskRuntime";

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

function isVisibleAcpSkillRun(run: AcpSkillRunRecord) {
  return (
    !run.removedAt &&
    !run.archivedAt &&
    run.status !== "succeeded" &&
    run.status !== "failed" &&
    run.status !== "canceled"
  );
}

export function getVisibleAcpSkillRunRequestIds(runs: AcpSkillRunRecord[]) {
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
  acpSkillRuns: AcpSkillRunRecord[];
}) {
  const visibleAcpRequestIds = getVisibleAcpSkillRunRequestIds(args.acpSkillRuns);
  return (Array.isArray(args.activeTasks) ? args.activeTasks : []).filter((entry) =>
    isVisibleDashboardActiveTask(entry, visibleAcpRequestIds),
  );
}
