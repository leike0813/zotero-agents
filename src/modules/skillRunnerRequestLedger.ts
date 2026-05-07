import type { JobRecord, JobState } from "../jobQueue/manager";
import {
  isTerminal,
  normalizeStatus,
  normalizeStatusWithGuard,
  type SkillRunnerProviderState,
} from "./skillRunnerProviderStateMachine";
import {
  PLUGIN_TASK_DOMAIN_SKILLRUNNER,
  deletePluginTaskRequestEntry,
  deletePluginTaskRequestEntriesByBackend,
  getPluginTaskRequestEntry,
  listPluginTaskRequestEntries,
  replacePluginTaskRequestEntries,
  upsertPluginTaskRequestEntry,
} from "./pluginStateStore";

export type SkillRunnerRequestSnapshot = SkillRunnerProviderState;

export type SkillRunnerRequestLedgerWriteSource = "events" | "jobs-terminal";

export type SkillRunnerRequestLedgerRecord = {
  requestId: string;
  snapshot: SkillRunnerRequestSnapshot;
  backendId: string;
  backendType: string;
  backendBaseUrl: string;
  providerId: string;
  workflowId: string;
  workflowLabel: string;
  runId: string;
  jobId: string;
  taskName: string;
  error?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  reconcileFlag?: boolean;
};

type SkillRunnerRequestLedgerListener = (
  records: SkillRunnerRequestLedgerRecord[],
) => void;

const listeners = new Set<SkillRunnerRequestLedgerListener>();

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function emitLedgerChanged() {
  const snapshot = listSkillRunnerRequestLedgerRecords();
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function parseRecord(raw: unknown): SkillRunnerRequestLedgerRecord | null {
  if (!isObject(raw)) {
    return null;
  }
  const requestId = normalizeString(raw.requestId);
  const backendId = normalizeString(raw.backendId);
  const backendType = normalizeString(raw.backendType);
  const backendBaseUrl = normalizeString(raw.backendBaseUrl);
  const providerId = normalizeString(raw.providerId);
  const workflowId = normalizeString(raw.workflowId);
  const workflowLabel = normalizeString(raw.workflowLabel) || workflowId;
  const runId = normalizeString(raw.runId);
  const jobId = normalizeString(raw.jobId);
  const taskName = normalizeString(raw.taskName) || jobId;
  const createdAt = normalizeString(raw.createdAt);
  const updatedAt = normalizeString(raw.updatedAt);
  const archivedAt = normalizeString(raw.archivedAt);
  if (
    !requestId ||
    !backendId ||
    !backendType ||
    !backendBaseUrl ||
    !providerId ||
    !workflowId ||
    !runId ||
    !jobId
  ) {
    return null;
  }
  const snapshot = normalizeStatus(raw.snapshot, "running");
  return {
    requestId,
    snapshot,
    backendId,
    backendType,
    backendBaseUrl,
    providerId,
    workflowId,
    workflowLabel,
    runId,
    jobId,
    taskName,
    reconcileFlag: raw.reconcileFlag === true,
    error: normalizeString(raw.error) || undefined,
    archivedAt: archivedAt || undefined,
    createdAt: createdAt || updatedAt || nowIso(),
    updatedAt: updatedAt || createdAt || nowIso(),
  };
}

function readRecordsMap() {
  const map = new Map<string, SkillRunnerRequestLedgerRecord>();
  for (const row of listPluginTaskRequestEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER)) {
    try {
      const parsed = JSON.parse(row.payload);
      const record = parseRecord(parsed);
      if (!record) {
        continue;
      }
      map.set(record.requestId, record);
    } catch {
      continue;
    }
  }
  return map;
}

function writeRecordsMap(map: Map<string, SkillRunnerRequestLedgerRecord>) {
  const entries = Array.from(map.values())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((entry) => ({
      requestId: entry.requestId,
      backendId: normalizeString(entry.backendId),
      state: normalizeString(entry.snapshot),
      updatedAt: normalizeString(entry.updatedAt) || nowIso(),
      payload: JSON.stringify(
        (({
          reconcileFlag,
          ...rest
        }) => {
          void reconcileFlag;
          return rest;
        })(entry),
      ),
    }));
  replacePluginTaskRequestEntries(PLUGIN_TASK_DOMAIN_SKILLRUNNER, entries);
}

function applySnapshotGuard(args: {
  source: SkillRunnerRequestLedgerWriteSource;
  current: SkillRunnerRequestSnapshot;
  nextRaw: unknown;
  requestId: string;
}) {
  const normalized = normalizeStatusWithGuard({
    value: args.nextRaw,
    fallback: args.current,
    requestId: args.requestId,
  }).status;
  if (args.source === "events") {
    if (isTerminal(args.current) && !isTerminal(normalized)) {
      return {
        accepted: false,
        next: args.current,
      };
    }
    return {
      accepted: true,
      next: normalized,
    };
  }
  if (!isTerminal(normalized)) {
    return {
      accepted: false,
      next: args.current,
    };
  }
  return {
    accepted: true,
    next: normalized,
  };
}

function resolveRequestIdFromJob(job: JobRecord) {
  const fromMeta = normalizeString(job.meta.requestId);
  if (fromMeta) {
    return fromMeta;
  }
  const fromResult = normalizeString((job.result as { requestId?: unknown })?.requestId);
  if (fromResult) {
    return fromResult;
  }
  return "";
}

export function listSkillRunnerRequestLedgerRecords(args?: { includeArchived?: boolean }) {
  const includeArchived = args?.includeArchived === true;
  return Array.from(readRecordsMap().values())
    .filter((entry) => includeArchived || !normalizeString(entry.archivedAt))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((entry) => ({ ...entry }));
}

export function getSkillRunnerRequestLedgerRecord(requestId: string) {
  const normalized = normalizeString(requestId);
  if (!normalized) {
    return null;
  }
  const cached = getPluginTaskRequestEntry(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    normalized,
  );
  if (!cached) {
    return null;
  }
  let record: SkillRunnerRequestLedgerRecord | null = null;
  try {
    record = parseRecord(JSON.parse(cached.payload));
  } catch {
    record = null;
  }
  return record ? { ...record } : null;
}

export function subscribeSkillRunnerRequestLedger(
  listener: SkillRunnerRequestLedgerListener,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function upsertSkillRunnerRequestLedgerRecord(
  input: SkillRunnerRequestLedgerRecord,
) {
  const requestId = normalizeString(input.requestId);
  if (!requestId) {
    return null;
  }
  const map = readRecordsMap();
  const previous = map.get(requestId);
  const next: SkillRunnerRequestLedgerRecord = {
    ...input,
    requestId,
    workflowLabel: normalizeString(input.workflowLabel) || normalizeString(input.workflowId),
    taskName: normalizeString(input.taskName) || normalizeString(input.jobId),
    snapshot: normalizeStatus(input.snapshot, previous?.snapshot || "running"),
    archivedAt: previous?.archivedAt || normalizeString(input.archivedAt) || undefined,
    createdAt: previous?.createdAt || normalizeString(input.createdAt) || nowIso(),
    updatedAt: normalizeString(input.updatedAt) || nowIso(),
  };
  map.set(requestId, next);
  upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_SKILLRUNNER, {
    requestId: next.requestId,
    backendId: next.backendId,
    state: next.snapshot,
    updatedAt: next.updatedAt,
    payload: JSON.stringify(
      (({
        reconcileFlag,
        ...rest
      }) => {
        void reconcileFlag;
        return rest;
      })(next),
    ),
  });
  emitLedgerChanged();
  return { ...next };
}

export function registerSkillRunnerRequestLedgerFromJob(args: {
  job: JobRecord;
  backendId: string;
  backendType: string;
  backendBaseUrl: string;
  providerId: string;
  workflowId: string;
  workflowLabel: string;
}) {
  const requestId = resolveRequestIdFromJob(args.job);
  if (!requestId) {
    return null;
  }
  const existing = getSkillRunnerRequestLedgerRecord(requestId);
  const snapshot = normalizeStatus(
    args.job.state,
    existing?.snapshot || "running",
  );
  return upsertSkillRunnerRequestLedgerRecord({
    requestId,
    snapshot,
    backendId: normalizeString(args.backendId),
    backendType: normalizeString(args.backendType),
    backendBaseUrl: normalizeString(args.backendBaseUrl),
    providerId: normalizeString(args.providerId),
    workflowId: normalizeString(args.workflowId),
    workflowLabel: normalizeString(args.workflowLabel) || normalizeString(args.workflowId),
    runId: normalizeString(args.job.meta.runId) || `${args.workflowId}:${args.job.createdAt}`,
    jobId: normalizeString(args.job.id),
    taskName: normalizeString(args.job.meta.taskName) || normalizeString(args.job.id),
    error: normalizeString(args.job.error) || existing?.error,
    createdAt: existing?.createdAt || args.job.createdAt || nowIso(),
    updatedAt: args.job.updatedAt || nowIso(),
  });
}

export function updateSkillRunnerRequestLedgerSnapshot(args: {
  requestId: string;
  source: SkillRunnerRequestLedgerWriteSource;
  status: unknown;
  updatedAt?: string;
  error?: string;
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return null;
  }
  const map = readRecordsMap();
  const current = map.get(requestId);
  if (!current) {
    return null;
  }
  const guarded = applySnapshotGuard({
    source: args.source,
    current: current.snapshot,
    nextRaw: args.status,
    requestId,
  });
  if (!guarded.accepted) {
    return { ...current };
  }
  const next: SkillRunnerRequestLedgerRecord = {
    ...current,
    snapshot: guarded.next,
    error: normalizeString(args.error) || undefined,
    updatedAt: normalizeString(args.updatedAt) || nowIso(),
  };
  map.set(requestId, next);
  upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_SKILLRUNNER, {
    requestId: next.requestId,
    backendId: next.backendId,
    state: next.snapshot,
    updatedAt: next.updatedAt,
    payload: JSON.stringify(
      (({
        reconcileFlag,
        ...rest
      }) => {
        void reconcileFlag;
        return rest;
      })(next),
    ),
  });
  emitLedgerChanged();
  return { ...next };
}

export function setSkillRunnerRequestLedgerReconcileFlag(args: {
  requestId: string;
  reconcileFlag: boolean;
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return null;
  }
  const map = readRecordsMap();
  const current = map.get(requestId);
  if (!current) {
    return null;
  }
  void args.reconcileFlag;
  return { ...current };
}

export function removeSkillRunnerRequestLedgerRecord(requestId: string) {
  const normalized = normalizeString(requestId);
  if (!normalized) {
    return false;
  }
  const removed = deletePluginTaskRequestEntry(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    normalized,
  );
  if (!removed) {
    return false;
  }
  emitLedgerChanged();
  return true;
}

export function removeSkillRunnerRequestLedgerRecordsByBackendId(
  backendIdRaw: string,
) {
  const backendId = normalizeString(backendIdRaw);
  if (!backendId) {
    return 0;
  }
  const before = listSkillRunnerRequestLedgerRecords({ includeArchived: true });
  const removed = before.filter(
    (entry) => normalizeString(entry.backendId) === backendId,
  ).length;
  deletePluginTaskRequestEntriesByBackend(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    backendId,
  );
  if (removed > 0) {
    emitLedgerChanged();
  }
  return removed;
}

export function archiveSkillRunnerRequestLedgerRecord(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return false;
  }
  const map = readRecordsMap();
  const current = map.get(requestId);
  if (!current) {
    return false;
  }
  const archivedAt = nowIso();
  const next: SkillRunnerRequestLedgerRecord = {
    ...current,
    archivedAt,
    updatedAt: archivedAt,
  };
  map.set(requestId, next);
  upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_SKILLRUNNER, {
    requestId: next.requestId,
    backendId: next.backendId,
    state: next.snapshot,
    updatedAt: next.updatedAt,
    payload: JSON.stringify(
      (({
        reconcileFlag,
        ...rest
      }) => {
        void reconcileFlag;
        return rest;
      })(next),
    ),
  });
  emitLedgerChanged();
  return true;
}

export function listSkillRunnerReconnectCandidates() {
  return listSkillRunnerRequestLedgerRecords().filter(
    (entry) => entry.snapshot === "running",
  );
}

export function resetSkillRunnerRequestLedgerForTests() {
  writeRecordsMap(new Map<string, SkillRunnerRequestLedgerRecord>());
  listeners.clear();
}

export function mapSkillRunnerLedgerSnapshotToJobState(
  snapshot: SkillRunnerRequestSnapshot,
): JobState {
  return normalizeStatus(snapshot, "running") as JobState;
}
