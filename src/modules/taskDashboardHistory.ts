import type { JobRecord } from "../jobQueue/manager";
import {
  DEFAULT_BACKEND_TYPE,
  PASS_THROUGH_BACKEND_TYPE,
} from "../config/defaults";
import {
  buildWorkflowTaskRecordFromJob,
  isSkillRunnerJobReadyForTaskProjection,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import { normalizeStatus } from "./skillRunnerProviderStateMachine";
import { getTaskHistoryRetentionConfig } from "./taskRetentionPolicy";
import {
  countSkillRunnerRunProjectionStates,
  listSkillRunnerRunProjections,
  upsertSkillRunnerRunFromTask,
} from "./skillRunnerRunStore";

export type TaskDashboardHistoryRecord = WorkflowTaskRecord & {
  archivedAt: string;
};

export type TaskDashboardHistorySummary = {
  total: number;
  queued: number;
  running: number;
  waiting_user: number;
  waiting_auth: number;
  succeeded: number;
  failed: number;
  canceled: number;
};

const historyRecords = new Map<string, TaskDashboardHistoryRecord>();

function isPassThroughTask(record: WorkflowTaskRecord) {
  if (record.backendType === PASS_THROUGH_BACKEND_TYPE) {
    return true;
  }
  if (record.providerId === PASS_THROUGH_BACKEND_TYPE) {
    return true;
  }
  return false;
}

function readHistoryRecords(): TaskDashboardHistoryRecord[] {
  return Array.from(historyRecords.values()).map((record) => ({ ...record }));
}

function skillRunnerHistoryKey(record: TaskDashboardHistoryRecord) {
  if (String(record.backendType || "").trim() !== DEFAULT_BACKEND_TYPE) {
    return record.id;
  }
  return String(record.runKey || "").trim();
}

function writeHistoryRecords(records: TaskDashboardHistoryRecord[]) {
  historyRecords.clear();
  for (const record of records) {
    if (String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE) {
      continue;
    }
    historyRecords.set(record.id, { ...record });
  }
}

function pruneExpiredRecords(records: TaskDashboardHistoryRecord[]) {
  const threshold = Date.now() - getTaskHistoryRetentionConfig().retentionMs;
  return records.filter((record) => {
    const ts = Date.parse(record.updatedAt || record.archivedAt || "");
    if (!Number.isFinite(ts)) {
      return true;
    }
    return ts >= threshold;
  });
}

export function getTaskDashboardHistoryRetentionConfig() {
  return getTaskHistoryRetentionConfig();
}

export function listTaskDashboardHistory(args?: {
  backendId?: string;
  backendType?: string;
  workflowId?: string;
  requestId?: string;
  limit?: number;
}) {
  const backendId = String(args?.backendId || "").trim();
  const backendType = String(args?.backendType || "").trim();
  const workflowId = String(args?.workflowId || "").trim();
  const requestId = String(args?.requestId || "").trim();
  const byId = new Map<string, TaskDashboardHistoryRecord>();
  for (const record of readHistoryRecords()) {
    const key = skillRunnerHistoryKey(record);
    if (key) {
      byId.set(key, record);
    }
  }
  for (const projection of listSkillRunnerRunProjections({
    backendId,
    requestId,
    limit: args?.limit,
  })) {
    const record = {
      ...projection,
      archivedAt: projection.updatedAt,
    };
    const key = skillRunnerHistoryKey(record);
    if (key) {
      byId.set(key, record);
    }
  }
  const rows = Array.from(byId.values())
    .filter((record) => {
      if (backendId && record.backendId !== backendId) {
        return false;
      }
      if (backendType && record.backendType !== backendType) {
        return false;
      }
      if (workflowId && record.workflowId !== workflowId) {
        return false;
      }
      if (requestId && record.requestId !== requestId) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((record) => ({ ...record }));
  const limit =
    typeof args?.limit === "number" && Number.isFinite(args.limit)
      ? Math.max(0, Math.floor(args.limit))
      : 0;
  return limit ? rows.slice(0, limit) : rows;
}

export function cleanupTaskDashboardHistory() {
  const before = readHistoryRecords();
  const after = pruneExpiredRecords(before);
  if (after.length !== before.length) {
    writeHistoryRecords(after);
  }
  return {
    before: before.length,
    after: after.length,
  };
}

export function removeTaskDashboardHistoryByBackendAndRequestIds(args: {
  backendId: string;
  requestIds: string[];
}) {
  const backendId = String(args.backendId || "").trim();
  const requestIdSet = new Set(
    (Array.isArray(args.requestIds) ? args.requestIds : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean),
  );
  if (!backendId || requestIdSet.size === 0) {
    return 0;
  }
  const before = readHistoryRecords();
  const after = before.filter((record) => {
    if (String(record.backendId || "").trim() !== backendId) {
      return true;
    }
    const requestId = String(record.requestId || "").trim();
    if (!requestId) {
      return true;
    }
    return !requestIdSet.has(requestId);
  });
  const removed = before.length - after.length;
  if (removed > 0) {
    writeHistoryRecords(after);
  }
  return removed;
}

export function updateTaskDashboardHistoryStateByRequest(args: {
  backendId?: string;
  requestId: string;
  state: WorkflowTaskRecord["state"];
  error?: string;
  updatedAt?: string;
}) {
  const requestId = String(args.requestId || "").trim();
  if (!requestId) {
    return 0;
  }
  const backendId = String(args.backendId || "").trim();
  const nextState = normalizeStatus(args.state) as WorkflowTaskRecord["state"];
  const nextError = String(args.error || "").trim() || undefined;
  const nextUpdatedAt =
    String(args.updatedAt || "").trim() || new Date().toISOString();
  const before = readHistoryRecords();
  let updated = 0;
  const after = before.map((record) => {
    if (String(record.requestId || "").trim() !== requestId) {
      return record;
    }
    if (backendId && String(record.backendId || "").trim() !== backendId) {
      return record;
    }
    if (
      record.state === nextState &&
      String(record.error || "").trim() === String(nextError || "").trim()
    ) {
      return record;
    }
    updated += 1;
    return {
      ...record,
      state: nextState,
      error: nextError,
      updatedAt: nextUpdatedAt,
      archivedAt: nextUpdatedAt,
    };
  });
  if (updated > 0) {
    writeHistoryRecords(after);
  }
  return updated;
}

export function resetTaskDashboardHistory() {
  writeHistoryRecords([]);
}

export function recordTaskDashboardHistoryFromJob(job: JobRecord) {
  const record = buildWorkflowTaskRecordFromJob(job);
  if (
    String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE &&
    !isSkillRunnerJobReadyForTaskProjection(job)
  ) {
    return null;
  }
  return recordTaskDashboardHistoryFromTaskRecord(record);
}

export function recordTaskDashboardHistoryFromTaskRecord(
  record: WorkflowTaskRecord,
) {
  if (isPassThroughTask(record)) {
    return null;
  }
  if (String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE) {
    if (!String(record.requestId || "").trim()) {
      return null;
    }
    const runRecord = upsertSkillRunnerRunFromTask(record, {
      eventType: "backend.snapshot",
      eventPayload: {
        source: "taskDashboardHistory.recordTaskDashboardHistoryFromTaskRecord",
        state: record.state,
      },
    });
    return {
      ...record,
      runKey: runRecord?.runKey || record.runKey,
      archivedAt: new Date().toISOString(),
    };
  }
  const current = pruneExpiredRecords(readHistoryRecords());
  const nextById = new Map<string, TaskDashboardHistoryRecord>();
  for (const row of current) {
    nextById.set(row.id, row);
  }
  const now = new Date().toISOString();
  nextById.set(record.id, {
    ...record,
    archivedAt: now,
  });
  const next = Array.from(nextById.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  writeHistoryRecords(next);
  return {
    ...record,
    archivedAt: now,
  };
}

export function upsertTaskDashboardHistoryFromTaskRecord(
  record: WorkflowTaskRecord,
) {
  if (isPassThroughTask(record)) {
    return null;
  }
  if (String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE) {
    if (!String(record.requestId || "").trim()) {
      return null;
    }
    const runRecord = upsertSkillRunnerRunFromTask(record, {
      eventType: "backend.snapshot",
      eventPayload: {
        source: "taskDashboardHistory.upsertTaskDashboardHistoryFromTaskRecord",
        state: record.state,
      },
    });
    return {
      ...record,
      runKey: runRecord?.runKey || record.runKey,
      archivedAt: new Date().toISOString(),
    };
  }
  const now = new Date().toISOString();
  const entry: TaskDashboardHistoryRecord = {
    ...record,
    archivedAt: now,
  };
  historyRecords.set(entry.id, { ...entry });
  return { ...entry };
}

function createEmptyTaskDashboardHistorySummary(): TaskDashboardHistorySummary {
  return {
    total: 0,
    queued: 0,
    running: 0,
    waiting_user: 0,
    waiting_auth: 0,
    succeeded: 0,
    failed: 0,
    canceled: 0,
  };
}

function addStateToTaskDashboardHistorySummary(
  summary: TaskDashboardHistorySummary,
  stateRaw: unknown,
  countRaw = 1,
) {
  const count = Math.max(0, Math.floor(Number(countRaw) || 0));
  if (count <= 0) {
    return;
  }
  summary.total += count;
  switch (normalizeStatus(String(stateRaw || ""))) {
    case "queued":
      summary.queued += count;
      break;
    case "running":
      summary.running += count;
      break;
    case "waiting_user":
      summary.waiting_user += count;
      break;
    case "waiting_auth":
      summary.waiting_auth += count;
      break;
    case "succeeded":
      summary.succeeded += count;
      break;
    case "failed":
      summary.failed += count;
      break;
    case "canceled":
      summary.canceled += count;
      break;
  }
}

export function summarizeTaskDashboardHistory(
  records: TaskDashboardHistoryRecord[],
) {
  const summary = createEmptyTaskDashboardHistorySummary();
  for (const record of records) {
    addStateToTaskDashboardHistorySummary(summary, record.state);
  }
  return summary;
}

export function summarizeTaskDashboardHistoryScope(args?: {
  backendId?: string;
  requestId?: string;
}) {
  const backendId = String(args?.backendId || "").trim();
  const requestId = String(args?.requestId || "").trim();
  const summary = {
    ...createEmptyTaskDashboardHistorySummary(),
  };
  for (const record of historyRecords.values()) {
    if (backendId && String(record.backendId || "").trim() !== backendId) {
      continue;
    }
    if (requestId && String(record.requestId || "").trim() !== requestId) {
      continue;
    }
    addStateToTaskDashboardHistorySummary(summary, record.state);
  }
  for (const row of countSkillRunnerRunProjectionStates({
    backendId,
    requestId,
  })) {
    addStateToTaskDashboardHistorySummary(summary, row.state, row.count);
  }
  return summary;
}
