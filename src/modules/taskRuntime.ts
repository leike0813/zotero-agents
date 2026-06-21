import type { JobRecord, JobState } from "../jobQueue/manager";
import {
  ACP_BACKEND_TYPE,
  DEFAULT_BACKEND_TYPE,
  PASS_THROUGH_BACKEND_TYPE,
} from "../config/defaults";
import {
  isActive,
  isTerminal,
  isWaiting,
} from "./skillRunnerProviderStateMachine";
import {
  buildSkillRunnerRunKey,
  buildSkillRunnerLocalRunKey,
  deleteSkillRunnerRunRecord,
  listSkillRunnerRunProjections,
  resetSkillRunnerRunStoreForTests,
  updateSkillRunnerRunStateByRequest,
  upsertSkillRunnerRunFromTask,
} from "./skillRunnerRunStore";

export type WorkflowTaskRecord = {
  id: string;
  localRunId?: string;
  runId: string;
  jobId: string;
  requestId?: string;
  skillName?: string;
  skillLabel?: string;
  skillId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  sequenceJobId?: string;
  workflowRunId?: string;
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
  mainStatus?: JobState;
  backendStatus?: string;
  skillRunnerLifecycleState?:
    | "pre_request_id"
    | "request_creating"
    | "uploading"
    | JobState;
  requestAssigned?: boolean;
  backendInteractive?: boolean;
  canOpenStream?: boolean;
  canCancelBackendRun?: boolean;
  canReply?: boolean;
  canArchiveLocalRun?: boolean;
  submitPhase?: string;
  submitStartedAt?: string;
  submitTimeoutAt?: string;
  submitError?: string;
  applyState?:
    | "idle"
    | "pending"
    | "running"
    | "succeeded"
    | "failed"
    | "skipped";
  applyError?: string;
  applyNextRetryAt?: string;
  resultJsonPath?: string;
  workspaceDir?: string;
  role?: "single" | "sequence_root" | "sequence_step";
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type TaskListener = (tasks: WorkflowTaskRecord[]) => void;

export type WorkflowTaskChangeEvent = {
  taskId?: string;
  requestId?: string;
  backendId?: string;
  state?: JobState;
  reason: "record-updated" | "records-removed" | "records-reset";
};

type TaskChangeListener = (event: WorkflowTaskChangeEvent) => void;

export type WorkflowTaskListOptions = {
  activeOnly?: boolean;
  backendId?: string;
  requestId?: string;
  limit?: number;
};

const taskRecords = new Map<string, WorkflowTaskRecord>();
const activeTaskRecordIds = new Set<string>();
const listeners = new Set<TaskListener>();
const changeListeners = new Set<TaskChangeListener>();
let hydratedFromStore = false;

const workflowTaskReadDiagnostics = {
  summaryQueryCount: 0,
  fullTaskRecordScanCount: 0,
  activeIndexScanCount: 0,
  taskRecordCandidateReadCount: 0,
};

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

function resolveLocalRunIdFromJob(job: JobRecord) {
  return normalizeMetaString(job.meta, "localRunId") || getTaskIdFromJob(job);
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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSkillRunnerProtocolJob(job: JobRecord) {
  if (String(job.meta.backendType || "").trim() !== DEFAULT_BACKEND_TYPE) {
    return false;
  }
  const requestKind = normalizeMetaString(job.meta, "requestKind");
  if (requestKind === "skillrunner.job.v1") {
    return true;
  }
  if (isObjectRecord(job.request)) {
    return String(job.request.kind || "").trim() === "skillrunner.job.v1";
  }
  return false;
}

function hasProviderResultRequestId(job: JobRecord) {
  const result = job.result;
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return false;
  }
  return typeof (result as { requestId?: unknown }).requestId === "string"
    ? !!String((result as { requestId?: unknown }).requestId || "").trim()
    : false;
}

function isSkillRunnerRequestReady(job: JobRecord) {
  return (
    job.meta.skillRunnerRequestReady === true ||
    String(job.meta.skillRunnerRequestReady || "").trim() === "true"
  );
}

function isPreReadySkillRunnerTerminalFailure(job: JobRecord) {
  return (
    isSkillRunnerProtocolJob(job) &&
    isTerminal(job.state) &&
    !!resolveRequestIdFromJob(job) &&
    !isSkillRunnerRequestReady(job) &&
    !hasProviderResultRequestId(job)
  );
}

export function isSkillRunnerJobReadyForTaskProjection(job: JobRecord) {
  if (!isSkillRunnerProtocolJob(job)) {
    return true;
  }
  if (isPreReadySkillRunnerTerminalFailure(job)) {
    return false;
  }
  if (isSkillRunnerRequestReady(job)) {
    return true;
  }
  return (
    hasProviderResultRequestId(job) ||
    !!resolveLocalRunIdFromJob(job) ||
    !!resolveRequestIdFromJob(job)
  );
}

function resolveSkillRunnerLifecycleStateFromJob(
  job: JobRecord,
): WorkflowTaskRecord["skillRunnerLifecycleState"] | undefined {
  if (!isSkillRunnerProtocolJob(job)) {
    return undefined;
  }
  const explicit = normalizeMetaString(job.meta, "skillRunnerLifecycleState");
  if (
    explicit === "pre_request_id" ||
    explicit === "request_creating" ||
    explicit === "uploading"
  ) {
    return explicit;
  }
  if (isTerminal(job.state)) {
    return job.state;
  }
  if (isWaiting(job.state)) {
    return job.state;
  }
  if (isSkillRunnerRequestReady(job)) {
    return "running";
  }
  if (hasProviderResultRequestId(job)) {
    return job.state;
  }
  if (resolveRequestIdFromJob(job)) {
    return "uploading";
  }
  return job.state === "queued" ? "pre_request_id" : "request_creating";
}

function resolveOptionalIntegerFromJobMeta(job: JobRecord, key: string) {
  const value = job.meta[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.floor(value);
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
  const localRunId = resolveLocalRunIdFromJob(job);
  const skillName = normalizeMetaString(job.meta, "skillName");
  const skillLabel = normalizeMetaString(job.meta, "skillLabel");
  const skillId = normalizeMetaString(job.meta, "skillId");
  const sequenceStepId = normalizeMetaString(job.meta, "sequenceStepId");
  const sequenceStepIndex = resolveOptionalIntegerFromJobMeta(
    job,
    "sequenceStepIndex",
  );
  const sequenceJobId = normalizeMetaString(job.meta, "sequenceJobId");
  const workflowRunId = normalizeMetaString(job.meta, "workflowRunId");
  const engine = normalizeMetaString(job.meta, "engine");
  const providerId = normalizeMetaString(job.meta, "providerId");
  const requestKind = normalizeMetaString(job.meta, "requestKind");
  const backendId = normalizeMetaString(job.meta, "backendId");
  const backendType = normalizeMetaString(job.meta, "backendType");
  const backendBaseUrl = normalizeMetaString(job.meta, "backendBaseUrl");
  const skillRunnerLifecycleState =
    resolveSkillRunnerLifecycleStateFromJob(job);
  const skillRunnerReady =
    isSkillRunnerRequestReady(job) || hasProviderResultRequestId(job);
  const skillRunnerBackendInteractive = !!requestId && skillRunnerReady;
  const skillRunnerTerminal = isTerminal(
    skillRunnerLifecycleState || job.state,
  );
  const skillRunnerWaiting = isWaiting(skillRunnerLifecycleState || job.state);
  const skillRunnerSubmitPhase =
    normalizeMetaString(job.meta, "skillRunnerSubmitPhase") ||
    (isSkillRunnerRequestReady(job) ? "request_ready" : "");
  return {
    id: getTaskIdFromJob(job),
    localRunId: localRunId || undefined,
    runId,
    jobId: job.id,
    requestId: requestId || undefined,
    skillName: skillName || undefined,
    skillLabel: skillLabel || undefined,
    skillId: skillId || undefined,
    sequenceStepId: sequenceStepId || undefined,
    sequenceStepIndex,
    sequenceJobId: sequenceJobId || undefined,
    workflowRunId: workflowRunId || undefined,
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
    skillRunnerLifecycleState,
    requestAssigned: !!requestId,
    backendInteractive: skillRunnerBackendInteractive,
    canOpenStream:
      skillRunnerBackendInteractive &&
      !skillRunnerTerminal &&
      !skillRunnerWaiting,
    canCancelBackendRun: skillRunnerBackendInteractive && !skillRunnerTerminal,
    canReply: skillRunnerBackendInteractive && skillRunnerWaiting,
    canArchiveLocalRun: true,
    submitPhase: skillRunnerSubmitPhase || undefined,
    submitStartedAt:
      normalizeMetaString(job.meta, "skillRunnerSubmitStartedAt") || undefined,
    submitTimeoutAt:
      normalizeMetaString(job.meta, "skillRunnerSubmitTimeoutAt") || undefined,
    submitError:
      normalizeMetaString(job.meta, "skillRunnerSubmitError") || undefined,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function emitTasksChanged(event: WorkflowTaskChangeEvent) {
  for (const listener of Array.from(changeListeners)) {
    listener({ ...event });
  }
  if (listeners.size === 0) {
    return;
  }
  const snapshot = listWorkflowTasks();
  for (const listener of Array.from(listeners)) {
    listener(snapshot);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveSkillRunnerFetchTypeFromJob(job: JobRecord) {
  const result = isObject(job.result) ? job.result : {};
  const responseJson = isObject(result.responseJson) ? result.responseJson : {};
  const request = isObject(job.request) ? job.request : {};
  const raw =
    result.fetchType ||
    result.fetch_type ||
    responseJson.fetch_type ||
    request.fetch_type;
  return raw === "result" ? "result" : raw === "bundle" ? "bundle" : undefined;
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
    localRunId: String(raw.localRunId || "").trim() || undefined,
    runId,
    jobId,
    requestId: String(raw.requestId || "").trim() || undefined,
    skillName: String(raw.skillName || "").trim() || undefined,
    skillLabel: String(raw.skillLabel || "").trim() || undefined,
    skillId: String(raw.skillId || "").trim() || undefined,
    sequenceStepId: String(raw.sequenceStepId || "").trim() || undefined,
    sequenceStepIndex:
      typeof raw.sequenceStepIndex === "number" &&
      Number.isFinite(raw.sequenceStepIndex)
        ? Math.floor(raw.sequenceStepIndex)
        : undefined,
    sequenceJobId: String(raw.sequenceJobId || "").trim() || undefined,
    workflowRunId: String(raw.workflowRunId || "").trim() || undefined,
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
    skillRunnerLifecycleState:
      (String(raw.skillRunnerLifecycleState || "").trim() as
        | WorkflowTaskRecord["skillRunnerLifecycleState"]
        | "") || undefined,
    requestAssigned:
      typeof raw.requestAssigned === "boolean"
        ? raw.requestAssigned
        : !!String(raw.requestId || "").trim(),
    backendInteractive:
      typeof raw.backendInteractive === "boolean"
        ? raw.backendInteractive
        : !!String(raw.requestId || "").trim(),
    canOpenStream:
      typeof raw.canOpenStream === "boolean"
        ? raw.canOpenStream
        : !!String(raw.requestId || "").trim(),
    canCancelBackendRun:
      typeof raw.canCancelBackendRun === "boolean"
        ? raw.canCancelBackendRun
        : !!String(raw.requestId || "").trim(),
    canReply:
      typeof raw.canReply === "boolean"
        ? raw.canReply
        : !!String(raw.requestId || "").trim(),
    canArchiveLocalRun:
      typeof raw.canArchiveLocalRun === "boolean"
        ? raw.canArchiveLocalRun
        : true,
    submitPhase: String(raw.submitPhase || "").trim() || undefined,
    submitStartedAt: String(raw.submitStartedAt || "").trim() || undefined,
    submitTimeoutAt: String(raw.submitTimeoutAt || "").trim() || undefined,
    submitError: String(raw.submitError || "").trim() || undefined,
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
  for (const projection of listSkillRunnerRunProjections()) {
    mergeSkillRunnerProjection(taskRecords, projection);
  }
}

function persistTaskRecordsToStore() {
  // SkillRunner rows are now derived from SkillRunnerRunStore. Other task rows
  // remain process-local here; backend-specific stores own persistence.
}

function syncTaskRecordActiveIndex(id: string, record?: WorkflowTaskRecord) {
  if (record && isActive(record.state)) {
    activeTaskRecordIds.add(id);
  } else {
    activeTaskRecordIds.delete(id);
  }
}

function setTaskRecord(id: string, record: WorkflowTaskRecord) {
  taskRecords.set(id, record);
  syncTaskRecordActiveIndex(id, record);
}

function deleteTaskRecord(id: string) {
  const removed = taskRecords.delete(id);
  activeTaskRecordIds.delete(id);
  return removed;
}

function clearTaskRecords() {
  taskRecords.clear();
  activeTaskRecordIds.clear();
}

function isFinishedState(state: JobState) {
  return isTerminal(state);
}

function isSkillRunnerWorkflowTaskRecord(record: WorkflowTaskRecord) {
  return String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE;
}

function skillRunnerRequestProjectionKey(record: WorkflowTaskRecord) {
  if (!isSkillRunnerWorkflowTaskRecord(record)) {
    return "";
  }
  const requestId = String(record.requestId || "").trim();
  if (!requestId) {
    return "";
  }
  return `${String(record.backendId || "").trim()}:${requestId}`;
}

function getSkillRunnerLocalIdentityValues(record: WorkflowTaskRecord) {
  const isSequenceStep =
    String(record.role || "").trim() === "sequence_step" ||
    !!String(record.sequenceStepId || "").trim();
  return new Set(
    [
      record.localRunId,
      record.id,
      record.jobId,
      isSequenceStep ? "" : record.runId,
    ]
      .map((entry) => String(entry || "").trim())
      .filter(Boolean),
  );
}

function hasSharedSkillRunnerLocalIdentity(
  a: WorkflowTaskRecord,
  b: WorkflowTaskRecord,
) {
  if (
    !isSkillRunnerWorkflowTaskRecord(a) ||
    !isSkillRunnerWorkflowTaskRecord(b)
  ) {
    return false;
  }
  const aBackendId = String(a.backendId || "").trim();
  const bBackendId = String(b.backendId || "").trim();
  if (aBackendId && bBackendId && aBackendId !== bBackendId) {
    return false;
  }
  const aValues = getSkillRunnerLocalIdentityValues(a);
  if (aValues.size === 0) {
    return false;
  }
  for (const value of getSkillRunnerLocalIdentityValues(b)) {
    if (aValues.has(value)) {
      return true;
    }
  }
  return false;
}

function deleteRecordFromMap(
  records: Map<string, WorkflowTaskRecord>,
  id: string,
) {
  if (records === taskRecords) {
    return deleteTaskRecord(id);
  }
  return records.delete(id);
}

function pruneStaleSkillRunnerLocalRows(
  records: Map<string, WorkflowTaskRecord>,
  canonical: WorkflowTaskRecord,
  keepId?: string,
) {
  if (
    !isSkillRunnerWorkflowTaskRecord(canonical) ||
    !String(canonical.requestId || "").trim()
  ) {
    return 0;
  }
  let removed = 0;
  for (const [id, existing] of Array.from(records.entries())) {
    if (id === keepId || id === canonical.id) {
      continue;
    }
    if (!isSkillRunnerWorkflowTaskRecord(existing)) {
      continue;
    }
    const existingRequestId = String(existing.requestId || "").trim();
    if (existingRequestId === String(canonical.requestId || "").trim()) {
      continue;
    }
    if (!hasSharedSkillRunnerLocalIdentity(existing, canonical)) {
      continue;
    }
    if (deleteRecordFromMap(records, id)) {
      removed += 1;
    }
  }
  return removed;
}

function mergeSkillRunnerProjection(
  records: Map<string, WorkflowTaskRecord>,
  projection: WorkflowTaskRecord,
) {
  const projectionKey = skillRunnerRequestProjectionKey(projection);
  if (projectionKey) {
    for (const [id, existing] of records.entries()) {
      if (skillRunnerRequestProjectionKey(existing) !== projectionKey) {
        continue;
      }
      records.set(id, {
        ...existing,
        ...projection,
        id: existing.id,
        runId: existing.runId,
        jobId: existing.jobId,
      });
      if (records === taskRecords) {
        syncTaskRecordActiveIndex(id, records.get(id));
      }
      pruneStaleSkillRunnerLocalRows(records, projection, id);
      return;
    }
    for (const [id, existing] of records.entries()) {
      if (
        String(existing.requestId || "").trim() ||
        !hasSharedSkillRunnerLocalIdentity(existing, projection)
      ) {
        continue;
      }
      records.set(id, {
        ...existing,
        ...projection,
        id: existing.id,
        runId: existing.runId,
        jobId: existing.jobId,
      });
      if (records === taskRecords) {
        syncTaskRecordActiveIndex(id, records.get(id));
      }
      pruneStaleSkillRunnerLocalRows(records, projection, id);
      return;
    }
  }
  records.set(projection.id, projection);
  if (records === taskRecords) {
    syncTaskRecordActiveIndex(projection.id, projection);
  }
  pruneStaleSkillRunnerLocalRows(records, projection, projection.id);
}

export function recordWorkflowTaskUpdate(job: JobRecord) {
  const record = buildWorkflowTaskRecordFromJob(job);
  if (
    String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE &&
    !isSkillRunnerJobReadyForTaskProjection(job)
  ) {
    const removedTask = deleteTaskRecord(record.id);
    const removedRun = deleteSkillRunnerRunRecord(
      buildSkillRunnerRunKey({
        backendId: record.backendId,
        requestId: record.requestId,
        runId: record.runId,
        jobId: record.jobId,
        localRunId: record.localRunId,
      }) || buildSkillRunnerLocalRunKey(record.localRunId || record.id),
    );
    if (removedTask || removedRun) {
      persistTaskRecordsToStore();
      emitTasksChanged({
        taskId: record.id,
        requestId: record.requestId,
        backendId: record.backendId,
        state: record.state,
        reason: "records-removed",
      });
    }
    return;
  }
  if (String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE) {
    pruneStaleSkillRunnerLocalRows(taskRecords, record, record.id);
  }
  setTaskRecord(record.id, record);
  if (String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE) {
    upsertSkillRunnerRunFromTask(record, {
      requestPayload: job.request,
      providerOptions: isObjectRecord(job.meta.providerOptions)
        ? { ...job.meta.providerOptions }
        : undefined,
      executionMode:
        normalizeMetaString(job.meta, "executionMode") || undefined,
      fetchType: resolveSkillRunnerFetchTypeFromJob(job),
      eventType: "backend.snapshot",
      eventPayload: {
        source: "taskRuntime.recordWorkflowTaskUpdate",
        state: record.state,
      },
    });
  }
  persistTaskRecordsToStore();
  emitTasksChanged({
    taskId: record.id,
    requestId: record.requestId,
    backendId: record.backendId,
    state: record.state,
    reason: "record-updated",
  });
}

export function listWorkflowTasks() {
  ensureHydratedFromStore();
  workflowTaskReadDiagnostics.fullTaskRecordScanCount += 1;
  workflowTaskReadDiagnostics.taskRecordCandidateReadCount += taskRecords.size;
  const merged = new Map(taskRecords);
  for (const projection of listSkillRunnerRunProjections()) {
    mergeSkillRunnerProjection(merged, projection);
  }
  return Array.from(merged.values())
    .map((entry) => ({ ...entry }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listActiveWorkflowTasks() {
  return listWorkflowTasks().filter((entry) => isActive(entry.state));
}

function normalizeTaskListLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 0;
}

function filterWorkflowTaskByScope(
  entry: WorkflowTaskRecord,
  options: WorkflowTaskListOptions,
) {
  if (options.activeOnly && !isActive(entry.state)) {
    return false;
  }
  const backendId = String(options.backendId || "").trim();
  if (backendId && String(entry.backendId || "").trim() !== backendId) {
    return false;
  }
  const requestId = String(options.requestId || "").trim();
  if (requestId && String(entry.requestId || "").trim() !== requestId) {
    return false;
  }
  return true;
}

export function listWorkflowTaskSummaries(
  options: WorkflowTaskListOptions = {},
) {
  workflowTaskReadDiagnostics.summaryQueryCount += 1;
  const merged = new Map<string, WorkflowTaskRecord>();
  const candidates = options.activeOnly
    ? Array.from(activeTaskRecordIds.values())
        .map((id) => taskRecords.get(id))
        .filter((entry): entry is WorkflowTaskRecord => !!entry)
    : Array.from(taskRecords.values());
  if (options.activeOnly) {
    workflowTaskReadDiagnostics.activeIndexScanCount += 1;
  } else {
    workflowTaskReadDiagnostics.fullTaskRecordScanCount += 1;
  }
  workflowTaskReadDiagnostics.taskRecordCandidateReadCount += candidates.length;
  for (const record of candidates) {
    if (filterWorkflowTaskByScope(record, options)) {
      merged.set(record.id, record);
    }
  }
  for (const projection of listSkillRunnerRunProjections({
    activeOnly: options.activeOnly,
    backendId: options.backendId,
    requestId: options.requestId,
    limit: options.limit,
  })) {
    mergeSkillRunnerProjection(merged, projection);
  }
  const limit = normalizeTaskListLimit(options.limit);
  const rows = Array.from(merged.values())
    .map((entry) => ({ ...entry }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return limit ? rows.slice(0, limit) : rows;
}

export function listActiveWorkflowTaskSummaries(
  options: Omit<WorkflowTaskListOptions, "activeOnly"> = {},
) {
  return listWorkflowTaskSummaries({ ...options, activeOnly: true });
}

export function clearFinishedWorkflowTasks() {
  ensureHydratedFromStore();
  let removed = false;
  for (const [id, record] of taskRecords.entries()) {
    if (!isFinishedState(record.state)) {
      continue;
    }
    deleteTaskRecord(id);
    if (String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE) {
      deleteSkillRunnerRunRecord(
        buildSkillRunnerRunKey({
          backendId: record.backendId,
          requestId: record.requestId,
          runId: record.runId,
          jobId: record.jobId,
          localRunId: record.localRunId,
        }) || buildSkillRunnerLocalRunKey(record.localRunId || record.id),
      );
    }
    removed = true;
  }
  if (removed) {
    persistTaskRecordsToStore();
    emitTasksChanged({ reason: "records-removed" });
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
    deleteTaskRecord(id);
    removed += 1;
  }
  if (removed > 0) {
    persistTaskRecordsToStore();
    emitTasksChanged({
      backendId,
      reason: "records-removed",
    });
  }
  return removed;
}

export function updateWorkflowTaskStateByRequest(args: {
  backendId?: string;
  backendType?: string;
  requestId: string;
  state: JobState;
  backendStatus?: string;
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
  const backendType = String(args.backendType || "").trim();
  if (!backendType || backendType === DEFAULT_BACKEND_TYPE) {
    const storedRun = updateSkillRunnerRunStateByRequest({
      backendId,
      requestId,
      state: nextState,
      backendStatus: args.backendStatus as JobState | undefined,
      error: nextError,
      updatedAt: nextUpdatedAt,
      eventType: isTerminal(nextState)
        ? "backend.terminal"
        : "backend.snapshot",
      eventPayload: {
        source: "taskRuntime.updateWorkflowTaskStateByRequest",
        state: nextState,
      },
    });
    if (storedRun) {
      mergeSkillRunnerProjection(taskRecords, storedRun.taskProjection);
      pruneStaleSkillRunnerLocalRows(taskRecords, storedRun.taskProjection);
      updated += 1;
    }
  }
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
    setTaskRecord(id, {
      ...record,
      state: nextState,
      mainStatus: nextState,
      backendStatus: args.backendStatus || record.backendStatus,
      error: nextError,
      updatedAt: nextUpdatedAt,
    });
    updated += 1;
  }
  if (updated > 0) {
    persistTaskRecordsToStore();
    emitTasksChanged({
      requestId,
      backendId: backendId || undefined,
      state: nextState,
      reason: "record-updated",
    });
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
    setTaskRecord(id, {
      ...record,
      state: "failed",
      error: record.error || PREVIOUS_SESSION_INTERRUPTED_ERROR,
      updatedAt: now,
    });
    if (String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE) {
      upsertSkillRunnerRunFromTask(
        {
          ...record,
          state: "failed",
          error: record.error || PREVIOUS_SESSION_INTERRUPTED_ERROR,
          updatedAt: now,
        },
        {
          eventType: "backend.terminal",
          eventPayload: {
            source: "taskRuntime.reconcileWorkflowTaskProjectionsOnStartup",
          },
        },
      );
    }
    failedTaskIds.push(id);
  }
  if (failedTaskIds.length > 0) {
    persistTaskRecordsToStore();
    emitTasksChanged({ reason: "record-updated" });
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

export function subscribeWorkflowTaskChanges(listener: TaskChangeListener) {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

export function resetWorkflowTasks() {
  ensureHydratedFromStore();
  clearTaskRecords();
  listeners.clear();
  changeListeners.clear();
  hydratedFromStore = false;
  resetWorkflowTaskReadDiagnosticsForTests();
  resetSkillRunnerRunStoreForTests();
}

export function getWorkflowTaskReadDiagnosticsForTests() {
  return { ...workflowTaskReadDiagnostics };
}

export function resetWorkflowTaskReadDiagnosticsForTests() {
  workflowTaskReadDiagnostics.summaryQueryCount = 0;
  workflowTaskReadDiagnostics.fullTaskRecordScanCount = 0;
  workflowTaskReadDiagnostics.activeIndexScanCount = 0;
  workflowTaskReadDiagnostics.taskRecordCandidateReadCount = 0;
}
