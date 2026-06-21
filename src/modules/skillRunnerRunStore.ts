import type { JobState } from "../jobQueue/manager";
import { DEFAULT_BACKEND_TYPE } from "../config/defaults";
import {
  appendPluginRunEventStoreEntry,
  clearPluginRunStore,
  clearPluginTaskRowEntries,
  countPluginTaskRowStates,
  deletePluginRunStoreEntry,
  deletePluginTaskRowEntry,
  deletePluginTaskRowEntriesByBackend,
  getPluginRunStoreEntry,
  getPluginRunStoreEntryByRequest,
  listPluginRunEventStoreEntries,
  listPluginRunStoreEntries,
  listPluginRunStoreEntriesFiltered,
  listPluginTaskRowEntriesFiltered,
  PLUGIN_TASK_DOMAIN_SKILLRUNNER,
  upsertPluginRunStoreEntry,
  upsertPluginTaskRowEntry,
} from "./pluginStateStore";
import { isActive, isTerminal } from "./skillRunnerProviderStateMachine";
import type { WorkflowTaskRecord } from "./taskRuntime";

export type SkillRunnerRunApplyState =
  | "idle"
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

const SKILLRUNNER_RUN_SCHEMA_VERSION = "2.0.0";
const SKILLRUNNER_PROJECTION_ACTIVE_SCOPE = "active";
const SKILLRUNNER_PROJECTION_HISTORY_SCOPE = "history";

export type SkillRunnerRunLifecycleState = JobState;
export type SkillRunnerLocalRunLifecycleState =
  | "pre_request_id"
  | "request_creating"
  | "uploading"
  | JobState;

export type SkillRunnerRunRecord = {
  schemaVersion: "2.0.0";
  runKey: string;
  localRunId?: string;
  role?: "single" | "sequence_root" | "sequence_step";
  projectable?: boolean;
  requestId?: string;
  backendId: string;
  backendType: string;
  backendBaseUrl?: string;
  providerId?: string;
  providerOptions?: Record<string, unknown>;
  workflowId: string;
  workflowLabel: string;
  workflowRunId?: string;
  runId: string;
  jobId: string;
  taskId: string;
  taskName: string;
  skillId?: string;
  skillName?: string;
  skillLabel?: string;
  requestKind?: string;
  requestPayload?: unknown;
  status: SkillRunnerLocalRunLifecycleState;
  backendStatus?: JobState;
  error?: string;
  submitPhase?: string;
  submitStartedAt?: string;
  submitTimeoutAt?: string;
  submitError?: string;
  executionMode?: "auto" | "interactive" | string;
  fetchType?: "bundle" | "result";
  apply: {
    state: SkillRunnerRunApplyState;
    attempt: number;
    maxAttempt?: number;
    nextRetryAt?: string;
    error?: string;
    updatedAt?: string;
  };
  result?: {
    resultJson?: unknown;
    resultJsonPath?: string;
    workspaceDir?: string;
  };
  sequence?: {
    sequenceRunId?: string;
    workflowRunId?: string;
    jobId?: string;
    stepId?: string;
    stepIndex?: number;
    finalStepId?: string;
  };
  taskProjection: WorkflowTaskRecord;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SkillRunnerRunProjectionListOptions = {
  activeOnly?: boolean;
  backendId?: string;
  requestId?: string;
  limit?: number;
};

export type SkillRunnerRunRecordListOptions = {
  backendId?: string;
  requestId?: string;
  limit?: number;
};

export type SkillRunnerRunStoreReadDiagnostics = {
  fullPayloadReadCount: number;
  fullPayloadQueryCount: number;
  lightweightProjectionReadCount: number;
  lightweightProjectionQueryCount: number;
  lightweightProjectionScopedReadCount: number;
  lightweightProjectionScopedQueryCount: number;
  lightweightProjectionUnscopedReadCount: number;
  lightweightProjectionUnscopedQueryCount: number;
  lightweightProjectionSummaryQueryCount: number;
  lightweightProjectionSummaryReadCount: number;
};

export type SkillRunnerRunProjectionStateCount = {
  state: JobState;
  count: number;
};

export type SkillRunnerRunEventType =
  | "submit.local_created"
  | "submit.request_creating"
  | "submit.uploading"
  | "submit.failed"
  | "request.created"
  | "request.ready"
  | "backend.snapshot"
  | "backend.terminal"
  | "run.terminal_client_error"
  | "result.fetched"
  | "apply.started"
  | "apply.succeeded"
  | "apply.failed"
  | "apply.skipped"
  | "sequence.step.started"
  | "sequence.step.settled"
  | "sequence.continued";

export type SkillRunnerRunEventRecord = {
  eventId: string;
  runKey: string;
  requestId?: string;
  backendId: string;
  type: SkillRunnerRunEventType;
  createdAt: string;
  payload?: unknown;
};

let eventCounter = 0;
const listeners = new Set<() => void>();
const projectionBackfillScopes = new Set<string>();
const readDiagnostics: SkillRunnerRunStoreReadDiagnostics = {
  fullPayloadReadCount: 0,
  fullPayloadQueryCount: 0,
  lightweightProjectionReadCount: 0,
  lightweightProjectionQueryCount: 0,
  lightweightProjectionScopedReadCount: 0,
  lightweightProjectionScopedQueryCount: 0,
  lightweightProjectionUnscopedReadCount: 0,
  lightweightProjectionUnscopedQueryCount: 0,
  lightweightProjectionSummaryQueryCount: 0,
  lightweightProjectionSummaryReadCount: 0,
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 0;
}

function isUnscopedHistoryProjectionRead(
  options: SkillRunnerRunProjectionListOptions,
) {
  return (
    options.activeOnly !== true &&
    !normalizeString(options.backendId) &&
    !normalizeString(options.requestId)
  );
}

function emitSkillRunnerRunStoreChanged() {
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch {
      // Store listeners are UI refresh hooks; one failing listener must not
      // prevent other workspaces from observing the updated run projection.
    }
  }
}

export function subscribeSkillRunnerRunStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSkillRunnerRunStoreReadDiagnosticsForTests() {
  return { ...readDiagnostics };
}

export function resetSkillRunnerRunStoreReadDiagnosticsForTests() {
  readDiagnostics.fullPayloadReadCount = 0;
  readDiagnostics.fullPayloadQueryCount = 0;
  readDiagnostics.lightweightProjectionReadCount = 0;
  readDiagnostics.lightweightProjectionQueryCount = 0;
  readDiagnostics.lightweightProjectionScopedReadCount = 0;
  readDiagnostics.lightweightProjectionScopedQueryCount = 0;
  readDiagnostics.lightweightProjectionUnscopedReadCount = 0;
  readDiagnostics.lightweightProjectionUnscopedQueryCount = 0;
  readDiagnostics.lightweightProjectionSummaryQueryCount = 0;
  readDiagnostics.lightweightProjectionSummaryReadCount = 0;
}

function nowIso() {
  return new Date().toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function nextEventId(runKey: string, type: string) {
  eventCounter += 1;
  return `${runKey}:${Date.now()}:${eventCounter}:${type}`;
}

export function buildSkillRunnerRunKey(args: {
  backendId?: string;
  requestId?: string;
  runId?: string;
  jobId?: string;
  localRunId?: string;
}) {
  const localRunId = normalizeString(args.localRunId);
  if (localRunId) {
    return buildSkillRunnerLocalRunKey(localRunId);
  }
  const backendId = normalizeString(args.backendId);
  const requestId = normalizeString(args.requestId);
  if (backendId && requestId) {
    return `${backendId}:${requestId}`;
  }
  const runId = normalizeString(args.runId);
  const jobId = normalizeString(args.jobId);
  return [backendId || "__skillrunner__", runId, jobId]
    .filter(Boolean)
    .join(":");
}

export function buildSkillRunnerLocalRunKey(localRunIdRaw: unknown) {
  const localRunId = normalizeString(localRunIdRaw);
  return localRunId ? `local:${localRunId}` : "";
}

function parseRecord(payload: string): SkillRunnerRunRecord | null {
  try {
    const parsed = JSON.parse(payload || "{}");
    if (!isObject(parsed)) {
      return null;
    }
    if (
      normalizeString(parsed.schemaVersion) !== SKILLRUNNER_RUN_SCHEMA_VERSION
    ) {
      return null;
    }
    const runKey = normalizeString(parsed.runKey);
    const requestId = normalizeString(parsed.requestId);
    const backendId = normalizeString(parsed.backendId);
    const statusRaw = normalizeString(parsed.status);
    if (!runKey || !statusRaw || statusRaw === "request_ready") {
      return null;
    }
    const status = statusRaw as SkillRunnerLocalRunLifecycleState;
    return {
      ...(parsed as SkillRunnerRunRecord),
      runKey,
      localRunId: normalizeString(parsed.localRunId) || undefined,
      requestId,
      backendId,
      status,
      backendStatus: normalizeString(parsed.backendStatus)
        ? (normalizeString(parsed.backendStatus) as JobState)
        : isTerminalRunLifecycleState(status)
          ? taskStateFromRunLifecycleState(status)
          : undefined,
    };
  } catch {
    return null;
  }
}

function parseEvent(payload: string): SkillRunnerRunEventRecord | null {
  try {
    const parsed = JSON.parse(payload || "{}");
    if (!isObject(parsed)) {
      return null;
    }
    const eventId = normalizeString(parsed.eventId);
    const runKey = normalizeString(parsed.runKey);
    const type = normalizeString(parsed.type) as SkillRunnerRunEventType;
    if (!eventId || !runKey || !type) {
      return null;
    }
    return parsed as SkillRunnerRunEventRecord;
  } catch {
    return null;
  }
}

function shouldAcceptStateTransition(
  previous: SkillRunnerRunRecord | undefined,
  next: SkillRunnerLocalRunLifecycleState,
) {
  if (!previous) {
    return true;
  }
  if (
    isTerminalRunLifecycleState(previous.status) &&
    !isTerminalRunLifecycleState(next)
  ) {
    return false;
  }
  return true;
}

function isTerminalRunLifecycleState(state: SkillRunnerLocalRunLifecycleState) {
  return (
    state !== "pre_request_id" &&
    state !== "request_creating" &&
    state !== "uploading" &&
    isTerminal(state)
  );
}

function taskStateFromRunLifecycleState(
  state: SkillRunnerLocalRunLifecycleState,
): JobState {
  return state === "pre_request_id" ||
    state === "request_creating" ||
    state === "uploading"
    ? "running"
    : state;
}

function isPreReadyRunLifecycleState(state: SkillRunnerLocalRunLifecycleState) {
  return (
    state === "pre_request_id" ||
    state === "request_creating" ||
    state === "uploading"
  );
}

function isWaitingRunLifecycleState(state: SkillRunnerLocalRunLifecycleState) {
  return state === "waiting_user" || state === "waiting_auth";
}

function buildProjectionCapabilities(args: {
  requestId?: string;
  status: SkillRunnerLocalRunLifecycleState;
}) {
  const requestAssigned = !!normalizeString(args.requestId);
  const backendInteractive =
    requestAssigned && !isPreReadyRunLifecycleState(args.status);
  const terminal = isTerminalRunLifecycleState(args.status);
  return {
    requestAssigned,
    backendInteractive,
    canOpenStream:
      backendInteractive &&
      !terminal &&
      !isWaitingRunLifecycleState(args.status),
    canCancelBackendRun: backendInteractive && !terminal,
    canReply: backendInteractive && isWaitingRunLifecycleState(args.status),
    canArchiveLocalRun: true,
  };
}

function recordToEntry(record: SkillRunnerRunRecord) {
  return {
    runKey: record.runKey,
    requestId: record.requestId || "",
    backendId: record.backendId,
    state: taskStateFromRunLifecycleState(record.status),
    updatedAt: record.updatedAt,
    payload: JSON.stringify(record),
  };
}

function isProjectableRunRecord(
  record: SkillRunnerRunRecord | null | undefined,
) {
  return (
    !!record && record.role !== "sequence_root" && record.projectable !== false
  );
}

function buildProjectionFromRecord(
  record: SkillRunnerRunRecord,
): WorkflowTaskRecord {
  return {
    ...record.taskProjection,
    localRunId: record.localRunId || record.taskProjection.localRunId,
    requestId: normalizeString(record.requestId) || undefined,
    skillName: record.skillName || record.taskProjection.skillName,
    skillLabel: record.skillLabel || record.taskProjection.skillLabel,
    skillId: record.skillId || record.taskProjection.skillId,
    state: taskStateFromRunLifecycleState(record.status),
    mainStatus: taskStateFromRunLifecycleState(record.status),
    backendStatus: record.backendStatus,
    skillRunnerLifecycleState: record.status,
    ...buildProjectionCapabilities({
      requestId: record.requestId,
      status: record.status,
    }),
    submitPhase: record.submitPhase,
    submitStartedAt: record.submitStartedAt,
    submitTimeoutAt: record.submitTimeoutAt,
    submitError: record.submitError,
    applyState: record.apply.state,
    applyError: record.apply.error,
    applyNextRetryAt: record.apply.nextRetryAt,
    resultJsonPath: record.result?.resultJsonPath,
    workspaceDir: record.result?.workspaceDir,
    role: record.role,
    error: record.error,
    updatedAt: record.updatedAt,
  };
}

function parseProjectionPayload(payload: string): WorkflowTaskRecord | null {
  try {
    const parsed = JSON.parse(payload || "{}");
    if (!isObject(parsed)) {
      return null;
    }
    const id = normalizeString(parsed.id);
    const runId = normalizeString(parsed.runId);
    const jobId = normalizeString(parsed.jobId);
    const workflowId = normalizeString(parsed.workflowId);
    const workflowLabel = normalizeString(parsed.workflowLabel);
    const taskName = normalizeString(parsed.taskName);
    const state = normalizeString(parsed.state) as JobState;
    const createdAt = normalizeString(parsed.createdAt);
    const updatedAt = normalizeString(parsed.updatedAt);
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
    return parsed as WorkflowTaskRecord;
  } catch {
    return null;
  }
}

function deleteSkillRunnerProjectionRows(runKey: string) {
  if (!runKey) {
    return;
  }
  deletePluginTaskRowEntry(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    runKey,
    SKILLRUNNER_PROJECTION_ACTIVE_SCOPE,
  );
  deletePluginTaskRowEntry(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    runKey,
    SKILLRUNNER_PROJECTION_HISTORY_SCOPE,
  );
}

function upsertSkillRunnerProjectionRows(record: SkillRunnerRunRecord) {
  if (!isProjectableRunRecord(record) || normalizeString(record.archivedAt)) {
    deleteSkillRunnerProjectionRows(record.runKey);
    return;
  }
  const projection = buildProjectionFromRecord(record);
  const row = {
    taskId: record.runKey,
    requestId: normalizeString(record.requestId),
    backendId: normalizeString(record.backendId),
    state: projection.state,
    updatedAt: projection.updatedAt,
    payload: JSON.stringify(projection),
  };
  upsertPluginTaskRowEntry(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    SKILLRUNNER_PROJECTION_HISTORY_SCOPE,
    row,
  );
  if (isActive(projection.state)) {
    upsertPluginTaskRowEntry(
      PLUGIN_TASK_DOMAIN_SKILLRUNNER,
      SKILLRUNNER_PROJECTION_ACTIVE_SCOPE,
      row,
    );
    return;
  }
  deletePluginTaskRowEntry(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    record.runKey,
    SKILLRUNNER_PROJECTION_ACTIVE_SCOPE,
  );
}

function buildProjectionBackfillScopeKey(
  scope: string,
  options: SkillRunnerRunProjectionListOptions,
) {
  const backendId = normalizeString(options.backendId);
  const requestId = normalizeString(options.requestId);
  if (!backendId && !requestId) {
    return "";
  }
  return [scope, backendId || "*", requestId || "*"].join(":");
}

function backfillProjectionRowsForScopedRead(
  scope: string,
  options: SkillRunnerRunProjectionListOptions,
) {
  const backfillKey = buildProjectionBackfillScopeKey(scope, options);
  if (!backfillKey || projectionBackfillScopes.has(backfillKey)) {
    return;
  }
  projectionBackfillScopes.add(backfillKey);
  const records = listSkillRunnerRunRecords({
    backendId: options.backendId,
    requestId: options.requestId,
  });
  for (const record of records) {
    upsertSkillRunnerProjectionRows(record);
  }
}

function findProjectableRunByRequest(args: {
  backendId?: string;
  requestId: string;
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return null;
  }
  const backendId = normalizeString(args.backendId);
  return (
    listSkillRunnerRunRecords({
      backendId: backendId || undefined,
      requestId,
    }).find(
      (record) =>
        isProjectableRunRecord(record) &&
        normalizeString(record.requestId) === requestId &&
        (!backendId || normalizeString(record.backendId) === backendId),
    ) || null
  );
}

export function getSkillRunnerRunRecord(runKeyRaw: string) {
  const entry = getPluginRunStoreEntry("skillrunner", runKeyRaw);
  if (entry) {
    readDiagnostics.fullPayloadReadCount += 1;
    readDiagnostics.fullPayloadQueryCount += 1;
  }
  return entry ? parseRecord(entry.payload) : null;
}

export function getSkillRunnerRunRecordByRequest(args: {
  backendId?: string;
  requestId: string;
}) {
  const projectable = findProjectableRunByRequest(args);
  if (projectable) {
    return projectable;
  }
  const exact = getSkillRunnerRunRecord(
    buildSkillRunnerRunKey({
      backendId: args.backendId,
      requestId: args.requestId,
    }),
  );
  if (isProjectableRunRecord(exact)) {
    return exact;
  }
  const entry = getPluginRunStoreEntryByRequest({
    kind: "skillrunner",
    backendId: args.backendId,
    requestId: args.requestId,
  });
  if (entry) {
    readDiagnostics.fullPayloadReadCount += 1;
    readDiagnostics.fullPayloadQueryCount += 1;
  }
  const matched = entry ? parseRecord(entry.payload) : null;
  if (isProjectableRunRecord(matched)) {
    return matched;
  }
  return null;
}

export function listSkillRunnerRunRecords(
  options: SkillRunnerRunRecordListOptions = {},
) {
  const limit = normalizeLimit(options.limit);
  const entries =
    options.backendId || options.requestId || limit
      ? listPluginRunStoreEntriesFiltered("skillrunner", {
          backendId: options.backendId,
          requestId: options.requestId,
          limit: limit || undefined,
        })
      : listPluginRunStoreEntries("skillrunner");
  readDiagnostics.fullPayloadQueryCount += 1;
  readDiagnostics.fullPayloadReadCount += entries.length;
  return entries
    .map((entry) => parseRecord(entry.payload))
    .filter((entry): entry is SkillRunnerRunRecord => !!entry);
}

export function listSkillRunnerRunEvents(runKey: string) {
  return listPluginRunEventStoreEntries({ kind: "skillrunner", runKey })
    .map((entry) => parseEvent(entry.payload))
    .filter((entry): entry is SkillRunnerRunEventRecord => !!entry);
}

export function appendSkillRunnerRunEvent(args: {
  runKey: string;
  requestId?: string;
  backendId?: string;
  type: SkillRunnerRunEventType;
  payload?: unknown;
  createdAt?: string;
}) {
  const runKey = normalizeString(args.runKey);
  if (!runKey) {
    return;
  }
  const event: SkillRunnerRunEventRecord = {
    eventId: nextEventId(runKey, args.type),
    runKey,
    requestId: normalizeString(args.requestId),
    backendId: normalizeString(args.backendId),
    type: args.type,
    createdAt: normalizeString(args.createdAt) || nowIso(),
    payload: args.payload,
  };
  appendPluginRunEventStoreEntry("skillrunner", {
    eventId: event.eventId,
    runKey: event.runKey,
    requestId: event.requestId || "",
    backendId: event.backendId,
    type: event.type,
    createdAt: event.createdAt,
    payload: JSON.stringify(event),
  });
}

export function upsertSkillRunnerRunRecord(
  update: SkillRunnerRunRecord,
  event?: {
    type: SkillRunnerRunEventType;
    payload?: unknown;
  },
) {
  const previous = getSkillRunnerRunRecord(update.runKey) || undefined;
  const status = shouldAcceptStateTransition(previous, update.status)
    ? update.status
    : previous?.status || update.status;
  const next: SkillRunnerRunRecord = {
    ...update,
    status,
    backendStatus: update.backendStatus || previous?.backendStatus,
    error: status === update.status ? update.error : previous?.error,
    taskProjection: {
      ...update.taskProjection,
      state: taskStateFromRunLifecycleState(status),
      mainStatus: taskStateFromRunLifecycleState(status),
      backendStatus: update.backendStatus || previous?.backendStatus,
      skillRunnerLifecycleState: status,
      error: status === update.status ? update.error : previous?.error,
      ...buildProjectionCapabilities({
        requestId: update.requestId,
        status,
      }),
      submitPhase: update.submitPhase,
      submitStartedAt: update.submitStartedAt,
      submitTimeoutAt: update.submitTimeoutAt,
      submitError: update.submitError,
      updatedAt: update.updatedAt,
    },
  };
  upsertPluginRunStoreEntry("skillrunner", recordToEntry(next));
  upsertSkillRunnerProjectionRows(next);
  if (event) {
    appendSkillRunnerRunEvent({
      runKey: next.runKey,
      requestId: next.requestId,
      backendId: next.backendId,
      type: event.type,
      payload: event.payload,
      createdAt: next.updatedAt,
    });
  }
  emitSkillRunnerRunStoreChanged();
  return next;
}

export function upsertSkillRunnerRunFromTask(
  task: WorkflowTaskRecord,
  args: {
    role?: SkillRunnerRunRecord["role"];
    projectable?: boolean;
    requestPayload?: unknown;
    providerOptions?: Record<string, unknown>;
    executionMode?: "auto" | "interactive" | string;
    fetchType?: "bundle" | "result";
    apply?: Partial<SkillRunnerRunRecord["apply"]>;
    result?: SkillRunnerRunRecord["result"];
    sequence?: Partial<NonNullable<SkillRunnerRunRecord["sequence"]>>;
    eventType?: SkillRunnerRunEventType;
    eventPayload?: unknown;
  } = {},
) {
  if (normalizeString(task.backendType) !== DEFAULT_BACKEND_TYPE) {
    return null;
  }
  const requestId = normalizeString(task.requestId);
  const localRunId =
    normalizeString(task.localRunId) || normalizeString(task.id);
  const runKey = buildSkillRunnerRunKey({
    backendId: task.backendId,
    requestId,
    runId: task.runId,
    jobId: task.jobId,
    localRunId,
  });
  if (!runKey) {
    return null;
  }
  const previous = getSkillRunnerRunRecord(runKey) || undefined;
  const role =
    args.role ||
    previous?.role ||
    (task.sequenceStepId ? "sequence_step" : "single");
  const projectable =
    typeof args.projectable === "boolean"
      ? args.projectable
      : previous?.projectable !== false;
  if (requestId && role !== "sequence_root" && projectable !== false) {
    const existingForRequest = findProjectableRunByRequest({
      backendId: task.backendId,
      requestId,
    });
    if (existingForRequest && existingForRequest.runKey !== runKey) {
      return existingForRequest;
    }
  }
  const nextStatusRaw = normalizeString(
    task.skillRunnerLifecycleState ||
      task.state ||
      previous?.status ||
      "running",
  );
  const status = (
    nextStatusRaw === "request_ready" ? "running" : nextStatusRaw
  ) as SkillRunnerLocalRunLifecycleState;
  const backendStatus =
    task.backendStatus ||
    previous?.backendStatus ||
    (isTerminalRunLifecycleState(status)
      ? taskStateFromRunLifecycleState(status)
      : undefined);
  const updatedAt = normalizeString(task.updatedAt) || nowIso();
  const record: SkillRunnerRunRecord = {
    schemaVersion: SKILLRUNNER_RUN_SCHEMA_VERSION,
    runKey,
    localRunId: localRunId || previous?.localRunId,
    role,
    projectable,
    requestId: requestId || previous?.requestId || undefined,
    backendId: normalizeString(task.backendId),
    backendType: normalizeString(task.backendType) || DEFAULT_BACKEND_TYPE,
    backendBaseUrl: normalizeString(task.backendBaseUrl) || undefined,
    providerId: normalizeString(task.providerId) || undefined,
    providerOptions: args.providerOptions || previous?.providerOptions,
    workflowId: normalizeString(task.workflowId),
    workflowLabel: normalizeString(task.workflowLabel) || task.workflowId,
    workflowRunId: normalizeString(task.workflowRunId) || undefined,
    runId: normalizeString(task.runId),
    jobId: normalizeString(task.jobId),
    taskId: normalizeString(task.id),
    taskName: normalizeString(task.taskName) || task.jobId,
    skillId: normalizeString(task.skillId) || previous?.skillId,
    skillName: normalizeString(task.skillName) || previous?.skillName,
    skillLabel: normalizeString(task.skillLabel) || previous?.skillLabel,
    requestKind: normalizeString(task.requestKind) || previous?.requestKind,
    requestPayload:
      typeof args.requestPayload === "undefined"
        ? previous?.requestPayload
        : args.requestPayload,
    status,
    backendStatus: backendStatus as JobState | undefined,
    error: normalizeString(task.error) || undefined,
    submitPhase: normalizeString(task.submitPhase) || previous?.submitPhase,
    submitStartedAt:
      normalizeString(task.submitStartedAt) || previous?.submitStartedAt,
    submitTimeoutAt:
      normalizeString(task.submitTimeoutAt) || previous?.submitTimeoutAt,
    submitError: normalizeString(task.submitError) || previous?.submitError,
    executionMode: args.executionMode || previous?.executionMode,
    fetchType: args.fetchType || previous?.fetchType,
    apply: {
      ...(previous?.apply || {
        state: "idle",
        attempt: 0,
      }),
      ...(args.apply || {}),
    },
    result: args.result || previous?.result,
    sequence:
      task.sequenceStepId ||
      task.workflowRunId ||
      args.sequence ||
      previous?.sequence
        ? {
            ...previous?.sequence,
            ...(args.sequence || {}),
            sequenceRunId:
              normalizeString(task.workflowRunId) ||
              normalizeString(args.sequence?.sequenceRunId) ||
              previous?.sequence?.sequenceRunId,
            workflowRunId: normalizeString(task.workflowRunId) || undefined,
            jobId:
              normalizeString(task.sequenceJobId) ||
              normalizeString(args.sequence?.jobId) ||
              previous?.sequence?.jobId,
            stepId: normalizeString(task.sequenceStepId) || undefined,
            stepIndex: task.sequenceStepIndex,
          }
        : previous?.sequence,
    taskProjection: {
      ...task,
      localRunId: localRunId || task.localRunId,
      requestId: requestId || previous?.requestId || undefined,
      state: taskStateFromRunLifecycleState(status),
      skillRunnerLifecycleState: status,
      updatedAt,
    },
    archivedAt: previous?.archivedAt,
    createdAt:
      previous?.createdAt || normalizeString(task.createdAt) || updatedAt,
    updatedAt,
  };
  return upsertSkillRunnerRunRecord(
    record,
    args.eventType
      ? { type: args.eventType, payload: args.eventPayload }
      : undefined,
  );
}

export function updateSkillRunnerRunStateByRequest(args: {
  backendId?: string;
  requestId: string;
  state: JobState;
  backendStatus?: JobState;
  error?: string;
  updatedAt?: string;
  eventType?: SkillRunnerRunEventType;
  eventPayload?: unknown;
}) {
  const existing = getSkillRunnerRunRecordByRequest({
    backendId: args.backendId,
    requestId: args.requestId,
  });
  if (!existing) {
    return null;
  }
  const nextError = normalizeString(args.error) || undefined;
  const nextStateRaw = normalizeString(args.state);
  const nextState = (
    nextStateRaw === "request_ready" ? "running" : nextStateRaw
  ) as JobState;
  const nextSubmitPhase =
    nextStateRaw === "request_ready" ? "request_ready" : existing.submitPhase;
  const nextBackendStatus =
    args.backendStatus ||
    (nextStateRaw === "request_ready"
      ? existing.backendStatus
      : isTerminal(nextState)
        ? nextState
        : existing.backendStatus);
  const stableBackendSnapshot =
    args.eventType === "backend.snapshot" &&
    existing.status === nextState &&
    normalizeString(existing.error) === normalizeString(nextError);
  const updatedAt = stableBackendSnapshot
    ? existing.updatedAt
    : normalizeString(args.updatedAt) || nowIso();
  return upsertSkillRunnerRunRecord(
    {
      ...existing,
      status: nextState,
      backendStatus: nextBackendStatus,
      error: nextError,
      submitPhase: nextSubmitPhase,
      taskProjection: {
        ...existing.taskProjection,
        state: nextState,
        mainStatus: nextState,
        backendStatus: nextBackendStatus,
        skillRunnerLifecycleState: nextState,
        submitPhase: nextSubmitPhase,
        error: nextError,
        updatedAt,
      },
      updatedAt,
    },
    args.eventType
      ? { type: args.eventType, payload: args.eventPayload }
      : undefined,
  );
}

export function updateSkillRunnerRunApplyState(args: {
  backendId?: string;
  requestId: string;
  state: SkillRunnerRunApplyState;
  attempt?: number;
  maxAttempt?: number;
  nextRetryAt?: string;
  error?: string;
  updatedAt?: string;
  eventType?: SkillRunnerRunEventType;
  eventPayload?: unknown;
}) {
  const existing = getSkillRunnerRunRecordByRequest({
    backendId: args.backendId,
    requestId: args.requestId,
  });
  if (!existing) {
    return null;
  }
  const updatedAt = normalizeString(args.updatedAt) || nowIso();
  const applyFailed = args.state === "failed";
  const nextBackendStatus =
    existing.backendStatus ||
    (isTerminalRunLifecycleState(existing.status)
      ? taskStateFromRunLifecycleState(existing.status)
      : undefined);
  const nextStatus = applyFailed ? "failed" : existing.status;
  return upsertSkillRunnerRunRecord(
    {
      ...existing,
      status: nextStatus,
      backendStatus: nextBackendStatus,
      error: applyFailed
        ? normalizeString(args.error) || existing.error
        : existing.error,
      apply: {
        state: args.state,
        attempt:
          typeof args.attempt === "number" && Number.isFinite(args.attempt)
            ? Math.floor(args.attempt)
            : existing.apply.attempt,
        maxAttempt: args.maxAttempt || existing.apply.maxAttempt,
        nextRetryAt: normalizeString(args.nextRetryAt) || undefined,
        error: normalizeString(args.error) || undefined,
        updatedAt,
      },
      taskProjection: {
        ...existing.taskProjection,
        state: taskStateFromRunLifecycleState(nextStatus),
        mainStatus: taskStateFromRunLifecycleState(nextStatus),
        backendStatus: nextBackendStatus,
        skillRunnerLifecycleState: nextStatus,
        error: applyFailed
          ? normalizeString(args.error) || existing.taskProjection.error
          : existing.taskProjection.error,
        updatedAt,
      },
      updatedAt,
    },
    args.eventType
      ? { type: args.eventType, payload: args.eventPayload }
      : undefined,
  );
}

export function updateSkillRunnerRunResult(args: {
  backendId?: string;
  requestId: string;
  resultJson?: unknown;
  resultJsonPath?: string;
  workspaceDir?: string;
  updatedAt?: string;
  eventPayload?: unknown;
}) {
  const existing = getSkillRunnerRunRecordByRequest({
    backendId: args.backendId,
    requestId: args.requestId,
  });
  if (!existing) {
    return null;
  }
  const updatedAt = normalizeString(args.updatedAt) || nowIso();
  const result = {
    resultJson:
      typeof args.resultJson === "undefined"
        ? existing.result?.resultJson
        : args.resultJson,
    resultJsonPath:
      normalizeString(args.resultJsonPath) || existing.result?.resultJsonPath,
    workspaceDir:
      normalizeString(args.workspaceDir) || existing.result?.workspaceDir,
  };
  return upsertSkillRunnerRunRecord(
    {
      ...existing,
      result,
      taskProjection: {
        ...existing.taskProjection,
        resultJsonPath: result.resultJsonPath,
        workspaceDir: result.workspaceDir,
        updatedAt,
      },
      updatedAt,
    },
    {
      type: "result.fetched",
      payload: args.eventPayload,
    },
  );
}

export function listSkillRunnerRunProjectionSummaries(
  options: SkillRunnerRunProjectionListOptions = {},
) {
  const scope = options.activeOnly
    ? SKILLRUNNER_PROJECTION_ACTIVE_SCOPE
    : SKILLRUNNER_PROJECTION_HISTORY_SCOPE;
  let entries = listPluginTaskRowEntriesFiltered(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    scope,
    {
      backendId: options.backendId,
      requestId: options.requestId,
      limit: normalizeLimit(options.limit) || undefined,
    },
  );
  if (entries.length === 0) {
    backfillProjectionRowsForScopedRead(scope, options);
    entries = listPluginTaskRowEntriesFiltered(
      PLUGIN_TASK_DOMAIN_SKILLRUNNER,
      scope,
      {
        backendId: options.backendId,
        requestId: options.requestId,
        limit: normalizeLimit(options.limit) || undefined,
      },
    );
  }
  readDiagnostics.lightweightProjectionQueryCount += 1;
  readDiagnostics.lightweightProjectionReadCount += entries.length;
  if (isUnscopedHistoryProjectionRead(options)) {
    readDiagnostics.lightweightProjectionUnscopedQueryCount += 1;
    readDiagnostics.lightweightProjectionUnscopedReadCount += entries.length;
  } else {
    readDiagnostics.lightweightProjectionScopedQueryCount += 1;
    readDiagnostics.lightweightProjectionScopedReadCount += entries.length;
  }
  return entries
    .map((entry) => parseProjectionPayload(entry.payload))
    .filter((entry): entry is WorkflowTaskRecord => !!entry);
}

export function listSkillRunnerRunProjections(
  options: SkillRunnerRunProjectionListOptions = {},
) {
  return listSkillRunnerRunProjectionSummaries(options);
}

export function countSkillRunnerRunProjectionStates(
  options: SkillRunnerRunProjectionListOptions = {},
): SkillRunnerRunProjectionStateCount[] {
  const scope = options.activeOnly
    ? SKILLRUNNER_PROJECTION_ACTIVE_SCOPE
    : SKILLRUNNER_PROJECTION_HISTORY_SCOPE;
  const rows = countPluginTaskRowStates(PLUGIN_TASK_DOMAIN_SKILLRUNNER, scope, {
    backendId: options.backendId,
    requestId: options.requestId,
  });
  readDiagnostics.lightweightProjectionSummaryQueryCount += 1;
  readDiagnostics.lightweightProjectionSummaryReadCount += rows.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  return rows.map((row) => ({
    state: row.state as JobState,
    count: row.count,
  }));
}

export function deleteSkillRunnerRunRecord(runKey: string) {
  const removed = deletePluginRunStoreEntry("skillrunner", runKey);
  if (removed) {
    deleteSkillRunnerProjectionRows(runKey);
    emitSkillRunnerRunStoreChanged();
  }
  return removed;
}

export function archiveSkillRunnerRunRecordByRequest(args: {
  backendId?: string;
  requestId: string;
  archivedAt?: string;
}) {
  const existing = getSkillRunnerRunRecordByRequest({
    backendId: args.backendId,
    requestId: args.requestId,
  });
  if (!existing) {
    return null;
  }
  const archivedAt = normalizeString(args.archivedAt) || nowIso();
  return upsertSkillRunnerRunRecord(
    {
      ...existing,
      archivedAt,
      updatedAt: archivedAt,
      taskProjection: {
        ...existing.taskProjection,
        updatedAt: archivedAt,
      },
    },
    {
      type: "backend.snapshot",
      payload: {
        archivedAt,
      },
    },
  );
}

export function archiveSkillRunnerRunRecordByRunKey(args: {
  runKey: string;
  archivedAt?: string;
}) {
  const existing = getSkillRunnerRunRecord(args.runKey);
  if (!existing) {
    return null;
  }
  const archivedAt = normalizeString(args.archivedAt) || nowIso();
  return upsertSkillRunnerRunRecord(
    {
      ...existing,
      archivedAt,
      updatedAt: archivedAt,
      taskProjection: {
        ...existing.taskProjection,
        updatedAt: archivedAt,
      },
    },
    {
      type: "backend.snapshot",
      payload: {
        archivedAt,
        source: "archive-local-run",
      },
    },
  );
}

export function deleteSkillRunnerRunRecordsByBackend(backendIdRaw: string) {
  const backendId = normalizeString(backendIdRaw);
  if (!backendId) {
    return 0;
  }
  let removed = 0;
  for (const record of listSkillRunnerRunRecords({ backendId })) {
    if (normalizeString(record.backendId) !== backendId) {
      continue;
    }
    removed += deletePluginRunStoreEntry("skillrunner", record.runKey) ? 1 : 0;
  }
  if (removed > 0) {
    deletePluginTaskRowEntriesByBackend(
      PLUGIN_TASK_DOMAIN_SKILLRUNNER,
      backendId,
    );
    emitSkillRunnerRunStoreChanged();
  }
  return removed;
}

export function resetSkillRunnerRunStoreForTests() {
  clearPluginRunStore("skillrunner");
  clearPluginTaskRowEntries(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    SKILLRUNNER_PROJECTION_ACTIVE_SCOPE,
  );
  clearPluginTaskRowEntries(
    PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    SKILLRUNNER_PROJECTION_HISTORY_SCOPE,
  );
  eventCounter = 0;
  projectionBackfillScopes.clear();
  resetSkillRunnerRunStoreReadDiagnosticsForTests();
  emitSkillRunnerRunStoreChanged();
}
