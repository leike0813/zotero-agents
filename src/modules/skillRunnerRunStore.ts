import type { JobState } from "../jobQueue/manager";
import { DEFAULT_BACKEND_TYPE } from "../config/defaults";
import {
  appendPluginRunEventStoreEntry,
  clearPluginRunStore,
  deletePluginRunStoreEntry,
  getPluginRunStoreEntry,
  getPluginRunStoreEntryByRequest,
  listPluginRunEventStoreEntries,
  listPluginRunStoreEntries,
  upsertPluginRunStoreEntry,
} from "./pluginStateStore";
import { isTerminal } from "./skillRunnerProviderStateMachine";
import type { WorkflowTaskRecord } from "./taskRuntime";

export type SkillRunnerRunApplyState =
  | "idle"
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

export type SkillRunnerRunLifecycleState = "request_ready" | JobState;
export type SkillRunnerLocalRunLifecycleState =
  | "pre_request_id"
  | "request_creating"
  | "uploading"
  | "request_ready"
  | JobState;

export type SkillRunnerRunRecord = {
  schemaVersion: "1.0.0";
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
    bundleDir?: string;
  };
  sequence?: {
    rootRunKey?: string;
    sequenceRunId?: string;
    workflowRunId?: string;
    jobId?: string;
    stepId?: string;
    stepIndex?: number;
    finalStepId?: string;
    previousRequestId?: string;
    nextStepIndex?: number;
    status?: string;
    state?: unknown;
  };
  reconcile?: {
    lastObservedState?: JobState;
    lastObservedAt?: string;
    nextReconcileAt?: string;
    reconcileBackoffMs?: number;
  };
  stateEvents?: unknown[];
  taskProjection: WorkflowTaskRecord;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
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
  | "sequence.continued"
  | "sequence.state.updated";

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

function normalizeString(value: unknown) {
  return String(value || "").trim();
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
    const runKey = normalizeString(parsed.runKey);
    const requestId = normalizeString(parsed.requestId);
    const backendId = normalizeString(parsed.backendId);
    const status = normalizeString(
      parsed.status,
    ) as SkillRunnerLocalRunLifecycleState;
    if (!runKey || !status) {
      return null;
    }
    return {
      ...(parsed as SkillRunnerRunRecord),
      runKey,
      localRunId: normalizeString(parsed.localRunId) || undefined,
      requestId,
      backendId,
      status,
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
  if (isTerminalRunLifecycleState(previous.status) && !isTerminalRunLifecycleState(next)) {
    return false;
  }
  return true;
}

function isTerminalRunLifecycleState(state: SkillRunnerLocalRunLifecycleState) {
  return (
    state !== "pre_request_id" &&
    state !== "request_creating" &&
    state !== "uploading" &&
    state !== "request_ready" &&
    isTerminal(state)
  );
}

function taskStateFromRunLifecycleState(
  state: SkillRunnerLocalRunLifecycleState,
): JobState {
  return state === "pre_request_id" ||
    state === "request_creating" ||
    state === "uploading" ||
    state === "request_ready"
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
    listSkillRunnerRunRecords().find(
      (record) =>
        isProjectableRunRecord(record) &&
        normalizeString(record.requestId) === requestId &&
        (!backendId || normalizeString(record.backendId) === backendId),
    ) || null
  );
}

export function getSkillRunnerRunRecord(runKeyRaw: string) {
  const entry = getPluginRunStoreEntry("skillrunner", runKeyRaw);
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
  const matched = entry ? parseRecord(entry.payload) : null;
  if (isProjectableRunRecord(matched)) {
    return matched;
  }
  return null;
}

export function listSkillRunnerRunRecords() {
  return listPluginRunStoreEntries("skillrunner")
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
    error: status === update.status ? update.error : previous?.error,
    taskProjection: {
      ...update.taskProjection,
      state: taskStateFromRunLifecycleState(status),
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
    reconcile?: SkillRunnerRunRecord["reconcile"];
    stateEvents?: unknown[];
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
  const localRunId = normalizeString(task.localRunId) || normalizeString(task.id);
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
  const status = (
    args.eventType === "request.ready"
      ? "request_ready"
      : previous?.status === "request_ready" &&
          args.eventType === "backend.snapshot" &&
          isObject(args.eventPayload) &&
          normalizeString(args.eventPayload.source) ===
            "taskRuntime.recordWorkflowTaskUpdate"
        ? "request_ready"
        : task.skillRunnerLifecycleState || task.state
  ) as SkillRunnerLocalRunLifecycleState;
  const updatedAt = normalizeString(task.updatedAt) || nowIso();
  const record: SkillRunnerRunRecord = {
    schemaVersion: "1.0.0",
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
    error: normalizeString(task.error) || undefined,
    submitPhase: normalizeString(task.submitPhase) || previous?.submitPhase,
    submitStartedAt:
      normalizeString(task.submitStartedAt) || previous?.submitStartedAt,
    submitTimeoutAt:
      normalizeString(task.submitTimeoutAt) || previous?.submitTimeoutAt,
    submitError:
      normalizeString(task.submitError) || previous?.submitError,
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
    reconcile: args.reconcile || previous?.reconcile,
    stateEvents: args.stateEvents || previous?.stateEvents,
    taskProjection: {
      ...task,
      localRunId: localRunId || task.localRunId,
      requestId: requestId || previous?.requestId || undefined,
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
  const stableBackendSnapshot =
    args.eventType === "backend.snapshot" &&
    existing.status === args.state &&
    normalizeString(existing.error) === normalizeString(nextError);
  const updatedAt = stableBackendSnapshot
    ? existing.updatedAt
    : normalizeString(args.updatedAt) || nowIso();
  return upsertSkillRunnerRunRecord(
    {
      ...existing,
      status: args.state,
      error: nextError,
      taskProjection: {
        ...existing.taskProjection,
        state: args.state,
        skillRunnerLifecycleState: args.state,
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
  return upsertSkillRunnerRunRecord(
    {
      ...existing,
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
  bundleDir?: string;
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
    ...(existing.result || {}),
    resultJson:
      typeof args.resultJson === "undefined"
        ? existing.result?.resultJson
        : args.resultJson,
    resultJsonPath:
      normalizeString(args.resultJsonPath) ||
      existing.result?.resultJsonPath,
    workspaceDir:
      normalizeString(args.workspaceDir) || existing.result?.workspaceDir,
    bundleDir: normalizeString(args.bundleDir) || existing.result?.bundleDir,
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

function sequenceStatusToJobState(statusRaw: unknown): JobState {
  const status = normalizeString(statusRaw);
  if (status === "completed") {
    return "succeeded";
  }
  if (status === "failed") {
    return "failed";
  }
  if (status === "canceled") {
    return "canceled";
  }
  if (status === "waiting_recovery") {
    return "running";
  }
  return "running";
}

export function upsertSkillRunnerSequenceRootState(
  state: Record<string, unknown>,
) {
  const sequenceRunId =
    normalizeString(state.sequenceRunId) ||
    normalizeString(state.workflowRunId);
  if (!sequenceRunId) {
    return null;
  }
  const runKey = `sequence:${sequenceRunId}`;
  const previous = getSkillRunnerRunRecord(runKey) || undefined;
  const updatedAt = normalizeString(state.updatedAt) || nowIso();
  const createdAt =
    previous?.createdAt || normalizeString(state.createdAt) || updatedAt;
  const backendId = normalizeString(state.backendId);
  const workflowId = normalizeString(state.workflowId);
  const workflowLabel = normalizeString(state.workflowLabel) || workflowId;
  const jobId = normalizeString(state.jobId) || sequenceRunId;
  const status = sequenceStatusToJobState(state.status);
  const record: SkillRunnerRunRecord = {
    schemaVersion: "1.0.0",
    runKey,
    role: "sequence_root",
    projectable: false,
    requestId: undefined,
    backendId,
    backendType: normalizeString(state.backendType) || DEFAULT_BACKEND_TYPE,
    providerOptions: isObject(state.providerOptions)
      ? { ...state.providerOptions }
      : previous?.providerOptions,
    workflowId,
    workflowLabel,
    workflowRunId: normalizeString(state.workflowRunId) || sequenceRunId,
    runId: sequenceRunId,
    jobId,
    taskId: runKey,
    taskName: workflowLabel || jobId,
    status,
    error: normalizeString(state.error) || undefined,
    apply: previous?.apply || {
      state: "idle",
      attempt: 0,
    },
    sequence: {
      ...previous?.sequence,
      sequenceRunId,
      workflowRunId: normalizeString(state.workflowRunId) || sequenceRunId,
      finalStepId: normalizeString(state.finalStepId) || undefined,
      status: normalizeString(state.status) || undefined,
      state,
    },
    taskProjection:
      previous?.taskProjection ||
      ({
        id: runKey,
        workflowId,
        workflowLabel,
        workflowRunId: normalizeString(state.workflowRunId) || sequenceRunId,
        runId: sequenceRunId,
        jobId,
        taskName: workflowLabel || jobId,
        backendId,
        backendType: normalizeString(state.backendType) || DEFAULT_BACKEND_TYPE,
        requestId: undefined,
        state: status,
        createdAt,
        updatedAt,
      } as WorkflowTaskRecord),
    archivedAt: previous?.archivedAt,
    createdAt,
    updatedAt,
  };
  return upsertSkillRunnerRunRecord(record, {
    type: "sequence.state.updated",
    payload: state,
  });
}

export function getSkillRunnerSequenceRootState(sequenceRunIdRaw: string) {
  const sequenceRunId = normalizeString(sequenceRunIdRaw);
  if (!sequenceRunId) {
    return null;
  }
  return (
    getSkillRunnerRunRecord(`sequence:${sequenceRunId}`)?.sequence?.state ||
    null
  );
}

export function getSkillRunnerSequenceRootStateByStepRequest(
  requestIdRaw: string,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return null;
  }
  for (const record of listSkillRunnerRunRecords()) {
    const state = record.sequence?.state;
    if (!isObject(state) || !Array.isArray(state.steps)) {
      continue;
    }
    if (
      state.steps.some(
        (step) =>
          isObject(step) && normalizeString(step.requestId) === requestId,
      )
    ) {
      return state;
    }
  }
  return null;
}

export function listSkillRunnerRunProjections() {
  return listSkillRunnerRunRecords()
    .filter(
      (record) =>
        !normalizeString(record.archivedAt) &&
        record.projectable !== false &&
        record.role !== "sequence_root",
    )
    .map((record) => ({
      ...record.taskProjection,
      localRunId: record.localRunId || record.taskProjection.localRunId,
      requestId: normalizeString(record.requestId) || undefined,
      state: taskStateFromRunLifecycleState(record.status),
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
    }));
}

export function deleteSkillRunnerRunRecord(runKey: string) {
  const removed = deletePluginRunStoreEntry("skillrunner", runKey);
  if (removed) {
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
  for (const record of listSkillRunnerRunRecords()) {
    if (normalizeString(record.backendId) !== backendId) {
      continue;
    }
    removed += deletePluginRunStoreEntry("skillrunner", record.runKey) ? 1 : 0;
  }
  if (removed > 0) {
    emitSkillRunnerRunStoreChanged();
  }
  return removed;
}

export function resetSkillRunnerRunStoreForTests() {
  clearPluginRunStore("skillrunner");
  eventCounter = 0;
  emitSkillRunnerRunStoreChanged();
}
