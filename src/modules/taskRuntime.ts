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
  applyState?: "idle" | "pending" | "running" | "succeeded" | "failed" | "skipped";
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

export function isSkillRunnerJobReadyForTaskProjection(job: JobRecord) {
  if (!isSkillRunnerProtocolJob(job)) {
    return true;
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
  const skillRunnerLifecycleState = resolveSkillRunnerLifecycleStateFromJob(job);
  const skillRunnerReady =
    isSkillRunnerRequestReady(job) || hasProviderResultRequestId(job);
  const skillRunnerBackendInteractive = !!requestId && skillRunnerReady;
  const skillRunnerTerminal = isTerminal(skillRunnerLifecycleState || job.state);
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
      skillRunnerBackendInteractive && !skillRunnerTerminal && !skillRunnerWaiting,
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

function isFinishedState(state: JobState) {
  return isTerminal(state);
}

function skillRunnerRequestProjectionKey(record: WorkflowTaskRecord) {
  if (String(record.backendType || "").trim() !== DEFAULT_BACKEND_TYPE) {
    return "";
  }
  const requestId = String(record.requestId || "").trim();
  if (!requestId) {
    return "";
  }
  return `${String(record.backendId || "").trim()}:${requestId}`;
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
      return;
    }
  }
  records.set(projection.id, projection);
}

export function recordWorkflowTaskUpdate(job: JobRecord) {
  ensureHydratedFromStore();
  const record = buildWorkflowTaskRecordFromJob(job);
  if (
    String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE &&
    !isSkillRunnerJobReadyForTaskProjection(job)
  ) {
    taskRecords.delete(record.id);
    return;
  }
  taskRecords.set(record.id, record);
  if (String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE) {
    upsertSkillRunnerRunFromTask(record, {
      eventType: "backend.snapshot",
      eventPayload: {
        source: "taskRuntime.recordWorkflowTaskUpdate",
        state: record.state,
      },
    });
  }
  persistTaskRecordsToStore();
  emitTasksChanged();
}

export function listWorkflowTasks() {
  ensureHydratedFromStore();
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

export function clearFinishedWorkflowTasks() {
  ensureHydratedFromStore();
  let removed = false;
  for (const [id, record] of taskRecords.entries()) {
    if (!isFinishedState(record.state)) {
      continue;
    }
    taskRecords.delete(id);
    if (String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE) {
      deleteSkillRunnerRunRecord(
        buildSkillRunnerRunKey({
          backendId: record.backendId,
          requestId: record.requestId,
          runId: record.runId,
          jobId: record.jobId,
          localRunId: record.localRunId,
        }) ||
          buildSkillRunnerLocalRunKey(record.localRunId || record.id),
      );
    }
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
  backendType?: string;
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
  const backendType = String(args.backendType || "").trim();
  if (!backendType || backendType === DEFAULT_BACKEND_TYPE) {
    const storedRun = updateSkillRunnerRunStateByRequest({
      backendId,
      requestId,
      state: nextState,
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
  resetSkillRunnerRunStoreForTests();
}
