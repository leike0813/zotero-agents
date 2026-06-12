import type { JobRecord } from "../jobQueue/manager";
import { PASS_THROUGH_BACKEND_TYPE } from "../config/defaults";
import {
  buildWorkflowTaskRecordFromJob,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import {
  isKnownStatus,
  normalizeStatus,
} from "./skillRunnerProviderStateMachine";
import {
  PLUGIN_TASK_DOMAIN_SKILLRUNNER,
  listPluginTaskRowEntries,
  replacePluginTaskRowEntries,
} from "./pluginStateStore";
import { getTaskHistoryRetentionConfig } from "./taskRetentionPolicy";

export type TaskDashboardHistoryRecord = WorkflowTaskRecord & {
  archivedAt: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isPassThroughTask(record: WorkflowTaskRecord) {
  if (record.backendType === PASS_THROUGH_BACKEND_TYPE) {
    return true;
  }
  if (record.providerId === PASS_THROUGH_BACKEND_TYPE) {
    return true;
  }
  return false;
}

function parseHistoryRecord(raw: unknown): TaskDashboardHistoryRecord | null {
  if (!isObject(raw)) {
    return null;
  }
  const id = String(raw.id || "").trim();
  const runId = String(raw.runId || "").trim();
  const jobId = String(raw.jobId || "").trim();
  const workflowId = String(raw.workflowId || "").trim();
  const workflowLabel = String(raw.workflowLabel || "").trim();
  const taskName = String(raw.taskName || "").trim();
  const state = String(raw.state || "").trim();
  const createdAt = String(raw.createdAt || "").trim();
  const updatedAt = String(raw.updatedAt || "").trim();
  const archivedAt = String(raw.archivedAt || "").trim();
  if (
    !id ||
    !runId ||
    !jobId ||
    !workflowId ||
    !workflowLabel ||
    !taskName ||
    !state ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }
  if (!isKnownStatus(state)) {
    return null;
  }
  return {
    id,
    runId,
    jobId,
    workflowId,
    workflowLabel,
    taskName,
    state: normalizeStatus(state) as WorkflowTaskRecord["state"],
    requestId: String(raw.requestId || "").trim() || undefined,
    engine: String(raw.engine || "").trim() || undefined,
    targetParentID:
      typeof raw.targetParentID === "number" &&
      Number.isFinite(raw.targetParentID)
        ? Math.floor(raw.targetParentID)
        : undefined,
    inputUnitIdentity: String(raw.inputUnitIdentity || "").trim() || undefined,
    inputUnitLabel: String(raw.inputUnitLabel || "").trim() || undefined,
    providerId: String(raw.providerId || "").trim() || undefined,
    requestKind: String(raw.requestKind || "").trim() || undefined,
    backendId: String(raw.backendId || "").trim() || undefined,
    backendType: String(raw.backendType || "").trim() || undefined,
    backendBaseUrl: String(raw.backendBaseUrl || "").trim() || undefined,
    error: String(raw.error || "").trim() || undefined,
    createdAt,
    updatedAt,
    archivedAt: archivedAt || updatedAt,
  };
}

function readHistoryRecords(): TaskDashboardHistoryRecord[] {
  const normalized: TaskDashboardHistoryRecord[] = [];
  for (const row of listPluginTaskRowEntries(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    "history",
  )) {
    try {
      const parsedRecord = parseHistoryRecord(
        JSON.parse(String(row.payload || "{}")),
      );
      if (!parsedRecord) {
        continue;
      }
      normalized.push(parsedRecord);
    } catch {
      continue;
    }
  }
  return normalized;
}

function writeHistoryRecords(records: TaskDashboardHistoryRecord[]) {
  replacePluginTaskRowEntries(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    "history",
    records.map((entry) => ({
      taskId: String(entry.id || "").trim(),
      requestId: String(entry.requestId || "").trim(),
      backendId: String(entry.backendId || "").trim(),
      state: String(entry.state || "").trim(),
      updatedAt: String(entry.updatedAt || "").trim(),
      payload: JSON.stringify(entry),
    })),
  );
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
}) {
  const backendId = String(args?.backendId || "").trim();
  const backendType = String(args?.backendType || "").trim();
  const workflowId = String(args?.workflowId || "").trim();
  const requestId = String(args?.requestId || "").trim();
  return readHistoryRecords()
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
  if (isPassThroughTask(record)) {
    return null;
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

export function summarizeTaskDashboardHistory(
  records: TaskDashboardHistoryRecord[],
) {
  const summary = {
    total: records.length,
    queued: 0,
    running: 0,
    waiting_user: 0,
    waiting_auth: 0,
    succeeded: 0,
    failed: 0,
    canceled: 0,
  };
  for (const record of records) {
    switch (normalizeStatus(record.state)) {
      case "queued":
        summary.queued += 1;
        break;
      case "running":
        summary.running += 1;
        break;
      case "waiting_user":
        summary.waiting_user += 1;
        break;
      case "waiting_auth":
        summary.waiting_auth += 1;
        break;
      case "succeeded":
        summary.succeeded += 1;
        break;
      case "failed":
        summary.failed += 1;
        break;
      case "canceled":
        summary.canceled += 1;
        break;
    }
  }
  return summary;
}
