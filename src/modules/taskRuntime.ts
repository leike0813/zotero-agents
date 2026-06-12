import type { JobRecord, JobState } from "../jobQueue/manager";
import {
  ACP_BACKEND_TYPE,
  DEFAULT_BACKEND_TYPE,
  PASS_THROUGH_BACKEND_TYPE,
} from "../config/defaults";
import { isActive, isTerminal } from "./skillRunnerProviderStateMachine";
import {
  PLUGIN_TASK_DOMAIN_SKILLRUNNER,
  listPluginTaskRowEntries,
  replacePluginTaskRowEntries,
} from "./pluginStateStore";

export type WorkflowTaskRecord = {
  id: string;
  runId: string;
  jobId: string;
  requestId?: string;
  engine?: string;
  targetParentID?: number;
  workflowId: string;
  workflowLabel: string;
  taskName: string;
  inputUnitIdentity?: string;
  inputUnitLabel?: string;
  providerId?: string;
  requestKind?: string;
  backendId?: string;
  backendType?: string;
  backendBaseUrl?: string;
  state: JobState;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type TaskListener = (tasks: WorkflowTaskRecord[]) => void;

const taskRecords = new Map<string, WorkflowTaskRecord>();
const listeners = new Set<TaskListener>();
let hydratedFromStore = false;

const PREVIOUS_SESSION_INTERRUPTED_ERROR =
  "Task was left active by a previous Zotero plugin session and is no longer running in this session.";

function normalizeMetaString(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  return typeof value === "string" ? value.trim() : "";
}

function getTaskIdFromJob(job: JobRecord) {
  const runId = normalizeMetaString(job.meta, "runId");
  if (runId) {
    return `${runId}:${job.id}`;
  }
  return `${job.workflowId}:${job.id}:${job.createdAt}`;
}

function resolveRequestIdFromJob(job: JobRecord) {
  const fromMeta = normalizeMetaString(job.meta, "requestId");
  if (fromMeta) {
    return fromMeta;
  }
  const candidate = (job.result as { requestId?: unknown } | undefined)
    ?.requestId;
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }
  return "";
}

function resolveTargetParentIDFromJob(job: JobRecord) {
  const candidate = job.meta.targetParentID;
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? Math.floor(candidate)
    : undefined;
}

export function buildWorkflowTaskRecordFromJob(
  job: JobRecord,
): WorkflowTaskRecord {
  const runId =
    normalizeMetaString(job.meta, "runId") ||
    `${job.workflowId}:${job.createdAt}`;
  const workflowLabel =
    normalizeMetaString(job.meta, "workflowLabel") || job.workflowId;
  const taskName = normalizeMetaString(job.meta, "taskName") || job.id;
  const inputUnitIdentity = normalizeMetaString(job.meta, "inputUnitIdentity");
  const inputUnitLabel =
    normalizeMetaString(job.meta, "inputUnitLabel") || taskName;
  const requestId = resolveRequestIdFromJob(job);
  const engine = normalizeMetaString(job.meta, "engine");
  const providerId = normalizeMetaString(job.meta, "providerId");
  const requestKind = normalizeMetaString(job.meta, "requestKind");
  const backendId = normalizeMetaString(job.meta, "backendId");
  const backendType = normalizeMetaString(job.meta, "backendType");
  const backendBaseUrl = normalizeMetaString(job.meta, "backendBaseUrl");
  return {
    id: getTaskIdFromJob(job),
    runId,
    jobId: job.id,
    requestId: requestId || undefined,
    engine: engine || undefined,
    targetParentID: resolveTargetParentIDFromJob(job),
    workflowId: job.workflowId,
    workflowLabel,
    taskName,
    inputUnitIdentity: inputUnitIdentity || undefined,
    inputUnitLabel: inputUnitLabel || undefined,
    providerId: providerId || undefined,
    requestKind: requestKind || undefined,
    backendId: backendId || undefined,
    backendType: backendType || undefined,
    backendBaseUrl: backendBaseUrl || undefined,
    state: job.state,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function emitTasksChanged() {
  const snapshot = listWorkflowTasks();
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parsePersistedTaskRecord(raw: unknown): WorkflowTaskRecord | null {
  if (!isObject(raw)) {
    return null;
  }
  const id = String(raw.id || "").trim();
  const runId = String(raw.runId || "").trim();
  const jobId = String(raw.jobId || "").trim();
  const workflowId = String(raw.workflowId || "").trim();
  const workflowLabel = String(raw.workflowLabel || "").trim();
  const taskName = String(raw.taskName || "").trim();
  const state = String(raw.state || "").trim() as JobState;
  const createdAt = String(raw.createdAt || "").trim();
  const updatedAt = String(raw.updatedAt || "").trim();
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
  return {
    id,
    runId,
    jobId,
    requestId: String(raw.requestId || "").trim() || undefined,
    engine: String(raw.engine || "").trim() || undefined,
    targetParentID:
      typeof raw.targetParentID === "number" &&
      Number.isFinite(raw.targetParentID)
        ? Math.floor(raw.targetParentID)
        : undefined,
    workflowId,
    workflowLabel,
    taskName,
    inputUnitIdentity: String(raw.inputUnitIdentity || "").trim() || undefined,
    inputUnitLabel: String(raw.inputUnitLabel || "").trim() || undefined,
    providerId: String(raw.providerId || "").trim() || undefined,
    requestKind: String(raw.requestKind || "").trim() || undefined,
    backendId: String(raw.backendId || "").trim() || undefined,
    backendType: String(raw.backendType || "").trim() || undefined,
    backendBaseUrl: String(raw.backendBaseUrl || "").trim() || undefined,
    state,
    error: String(raw.error || "").trim() || undefined,
    createdAt,
    updatedAt,
  };
}

function ensureHydratedFromStore() {
  if (hydratedFromStore) {
    return;
  }
  hydratedFromStore = true;
  for (const row of listPluginTaskRowEntries(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    "active",
  )) {
    try {
      const parsed = parsePersistedTaskRecord(
        JSON.parse(String(row.payload || "{}")),
      );
      if (!parsed) {
        continue;
      }
      taskRecords.set(parsed.id, parsed);
    } catch {
      continue;
    }
  }
}

function persistTaskRecordsToStore() {
  replacePluginTaskRowEntries(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    "active",
    Array.from(taskRecords.values()).map((entry) => ({
      taskId: String(entry.id || "").trim(),
      requestId: String(entry.requestId || "").trim(),
      backendId: String(entry.backendId || "").trim(),
      state: String(entry.state || "").trim(),
      updatedAt: String(entry.updatedAt || "").trim(),
      payload: JSON.stringify(entry),
    })),
  );
}

function isFinishedState(state: JobState) {
  return isTerminal(state);
}

export function recordWorkflowTaskUpdate(job: JobRecord) {
  ensureHydratedFromStore();
  const record = buildWorkflowTaskRecordFromJob(job);
  taskRecords.set(record.id, record);
  persistTaskRecordsToStore();
  emitTasksChanged();
}

export function listWorkflowTasks() {
  ensureHydratedFromStore();
  return Array.from(taskRecords.values())
    .map((entry) => ({ ...entry }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listActiveWorkflowTasks() {
  return listWorkflowTasks().filter((entry) => isActive(entry.state));
}

export function clearFinishedWorkflowTasks() {
  ensureHydratedFromStore();
  let removed = false;
  for (const [id, record] of taskRecords.entries()) {
    if (!isFinishedState(record.state)) {
      continue;
    }
    taskRecords.delete(id);
    removed = true;
  }
  if (removed) {
    persistTaskRecordsToStore();
    emitTasksChanged();
  }
}

export function removeWorkflowTasksByBackendAndRequestIds(args: {
  backendId: string;
  requestIds: string[];
}) {
  ensureHydratedFromStore();
  const backendId = String(args.backendId || "").trim();
  const requestIdSet = new Set(
    (Array.isArray(args.requestIds) ? args.requestIds : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean),
  );
  if (!backendId || requestIdSet.size === 0) {
    return 0;
  }
  let removed = 0;
  for (const [id, record] of taskRecords.entries()) {
    if (String(record.backendId || "").trim() !== backendId) {
      continue;
    }
    const requestId = String(record.requestId || "").trim();
    if (!requestId || !requestIdSet.has(requestId)) {
      continue;
    }
    taskRecords.delete(id);
    removed += 1;
  }
  if (removed > 0) {
    persistTaskRecordsToStore();
    emitTasksChanged();
  }
  return removed;
}

export function updateWorkflowTaskStateByRequest(args: {
  backendId?: string;
  requestId: string;
  state: JobState;
  error?: string;
  updatedAt?: string;
}) {
  ensureHydratedFromStore();
  const requestId = String(args.requestId || "").trim();
  if (!requestId) {
    return 0;
  }
  const backendId = String(args.backendId || "").trim();
  const nextState = args.state;
  const nextError = String(args.error || "").trim() || undefined;
  const nextUpdatedAt =
    String(args.updatedAt || "").trim() || new Date().toISOString();
  let updated = 0;
  for (const [id, record] of taskRecords.entries()) {
    if (String(record.requestId || "").trim() !== requestId) {
      continue;
    }
    if (backendId && String(record.backendId || "").trim() !== backendId) {
      continue;
    }
    if (
      record.state === nextState &&
      String(record.error || "").trim() === String(nextError || "").trim()
    ) {
      continue;
    }
    taskRecords.set(id, {
      ...record,
      state: nextState,
      error: nextError,
      updatedAt: nextUpdatedAt,
    });
    updated += 1;
  }
  if (updated > 0) {
    persistTaskRecordsToStore();
    emitTasksChanged();
  }
  return updated;
}

function isRecoverableSkillRunnerProjection(record: WorkflowTaskRecord) {
  return (
    String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE &&
    !!String(record.backendId || "").trim() &&
    !!String(record.requestId || "").trim()
  );
}

function isAcpProjectionWithRequest(record: WorkflowTaskRecord) {
  return (
    String(record.backendType || "").trim() === ACP_BACKEND_TYPE &&
    !!String(record.requestId || "").trim()
  );
}

function shouldFailRecoveredProjection(record: WorkflowTaskRecord) {
  const backendType = String(record.backendType || "").trim();
  if (backendType === PASS_THROUGH_BACKEND_TYPE) {
    return true;
  }
  if (isRecoverableSkillRunnerProjection(record)) {
    return false;
  }
  if (isAcpProjectionWithRequest(record)) {
    return false;
  }
  return true;
}

export function reconcileWorkflowTaskProjectionsOnStartup() {
  ensureHydratedFromStore();
  const now = new Date().toISOString();
  const failedTaskIds: string[] = [];
  const preservedTaskIds: string[] = [];
  for (const [id, record] of taskRecords.entries()) {
    if (!isActive(record.state)) {
      continue;
    }
    if (!shouldFailRecoveredProjection(record)) {
      preservedTaskIds.push(id);
      continue;
    }
    taskRecords.set(id, {
      ...record,
      state: "failed",
      error: record.error || PREVIOUS_SESSION_INTERRUPTED_ERROR,
      updatedAt: now,
    });
    failedTaskIds.push(id);
  }
  if (failedTaskIds.length > 0) {
    persistTaskRecordsToStore();
    emitTasksChanged();
  }
  return {
    failedCount: failedTaskIds.length,
    preservedCount: preservedTaskIds.length,
    failedTaskIds,
    preservedTaskIds,
  };
}

export function subscribeWorkflowTasks(listener: TaskListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetWorkflowTasks() {
  ensureHydratedFromStore();
  taskRecords.clear();
  listeners.clear();
  hydratedFromStore = false;
  replacePluginTaskRowEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER, "active", []);
}
