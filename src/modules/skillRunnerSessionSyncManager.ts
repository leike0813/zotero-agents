import type { BackendInstance } from "../backends/types";
import { isSkillRunnerRunTerminalClientError } from "../providers/skillrunner/errors";
import { appendRuntimeLog } from "./runtimeLogManager";
import { buildSkillRunnerManagementClient } from "./skillRunnerManagementClientFactory";
import { updateTaskDashboardHistoryStateByRequest } from "./taskDashboardHistory";
import { isTerminal, normalizeStatus } from "./skillRunnerProviderStateMachine";
import {
  isSkillRunnerBackendAvailable,
  markSkillRunnerBackendHealthFailure,
  markSkillRunnerBackendHealthSuccess,
} from "./skillRunnerBackendHealthRegistry";
import { updateWorkflowTaskStateByRequest } from "./taskRuntime";
import { updateSkillRunnerRunStateByRequest } from "./skillRunnerRunStore";

type SessionLoopState = {
  requestId: string;
  backend: BackendInstance;
  stopped: boolean;
  started: boolean;
  eventCursor: number;
  retryDelayMs: number;
  generation: number;
  abortController?: AbortController;
};

type SessionSyncClient = ReturnType<typeof buildSkillRunnerManagementClient>;

type SessionSyncDeps = {
  buildManagementClient: (args: {
    backend: BackendInstance;
    localize: (key: string, fallback: string) => string;
  }) => SessionSyncClient;
  appendRuntimeLog: typeof appendRuntimeLog;
  updateTaskDashboardHistoryStateByRequest: typeof updateTaskDashboardHistoryStateByRequest;
  updateSkillRunnerRunStateByRequest: typeof updateSkillRunnerRunStateByRequest;
  updateWorkflowTaskStateByRequest: typeof updateWorkflowTaskStateByRequest;
  markSkillRunnerBackendHealthFailure: typeof markSkillRunnerBackendHealthFailure;
  markSkillRunnerBackendHealthSuccess: typeof markSkillRunnerBackendHealthSuccess;
};

const sessions = new Map<string, SessionLoopState>();
const lastEventCursorBySession = new Map<string, number>();
const sessionStateListeners = new Map<
  string,
  Set<(payload: SkillRunnerSessionStateUpdate) => void>
>();
const inflightTasks = new Set<Promise<void>>();
let nextSessionGeneration = 0;

const defaultSessionSyncDeps: SessionSyncDeps = {
  buildManagementClient: buildSkillRunnerManagementClient,
  appendRuntimeLog,
  updateTaskDashboardHistoryStateByRequest,
  updateSkillRunnerRunStateByRequest,
  updateWorkflowTaskStateByRequest,
  markSkillRunnerBackendHealthFailure,
  markSkillRunnerBackendHealthSuccess,
};

let sessionSyncDeps: SessionSyncDeps = defaultSessionSyncDeps;

export const SKILLRUNNER_EVENT_STREAM_CONNECT_SNAPSHOT = "running" as const;
export const SKILLRUNNER_EVENT_STREAM_DISCONNECT_STATES = [
  "waiting_user",
  "waiting_auth",
  "succeeded",
  "failed",
  "canceled",
] as const;

export type SkillRunnerSessionStateUpdate = {
  backendId: string;
  requestId: string;
  status: string;
  updatedAt?: string;
};

type SessionSyncRuntimeSnapshot = {
  sessionCount: number;
  lastEventCursorCount: number;
  listenerCount: number;
  inflightTaskCount: number;
  activeGenerationCount: number;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toSessionKey(backendId: string, requestId: string) {
  return `${normalizeString(backendId)}:${normalizeString(requestId)}`;
}

function resolveConversationStateChangedStatus(event: Record<string, unknown>) {
  const type = normalizeString(
    event.type || event.kind || event.event,
  ).toLowerCase();
  if (type !== "conversation.state.changed") {
    return "";
  }
  const data = isObject(event.data) ? event.data : undefined;
  return normalizeString(data?.to);
}

function isSessionActive(session: SessionLoopState) {
  const key = toSessionKey(session.backend.id, session.requestId);
  return (
    !session.stopped && sessions.get(key)?.generation === session.generation
  );
}

function trackInFlightTask(task: Promise<void>) {
  inflightTasks.add(task);
  void task.finally(() => {
    inflightTasks.delete(task);
  });
}

function spawnSessionTask(
  session: SessionLoopState,
  runner: () => Promise<void>,
) {
  if (!isSessionActive(session)) {
    return;
  }
  const task = Promise.resolve(runner()).catch(() => {
    // session sync runs in the background; failures are normalized in-loop
  });
  trackInFlightTask(task);
}

async function drainSessionSyncTasks() {
  while (inflightTasks.size > 0) {
    await Promise.allSettled(Array.from(inflightTasks));
  }
}

function stopSessionByKey(key: string) {
  const session = sessions.get(key);
  if (!session) {
    return;
  }
  if (session.eventCursor > 0) {
    lastEventCursorBySession.set(key, session.eventCursor);
  }
  session.stopped = true;
  session.abortController?.abort();
  session.generation += 1;
  sessions.delete(key);
}

function shouldDisconnectEventStream(status: string) {
  const normalized = normalizeStatus(status, "running");
  return (
    normalized === "waiting_user" ||
    normalized === "waiting_auth" ||
    isTerminal(normalized)
  );
}

function emitSessionStateChanged(payload: SkillRunnerSessionStateUpdate) {
  const key = toSessionKey(payload.backendId, payload.requestId);
  const listeners = sessionStateListeners.get(key);
  if (!listeners || listeners.size === 0) {
    return;
  }
  for (const listener of Array.from(listeners)) {
    try {
      listener(payload);
    } catch {
      // keep state loop alive for other listeners
    }
  }
}

function applyStateSnapshot(args: {
  session: SessionLoopState;
  status: unknown;
  updatedAt?: string;
}) {
  const normalized = normalizeStatus(args.status, "running");
  const backendId = normalizeString(args.session.backend.id);
  const requestId = normalizeString(args.session.requestId);
  const updated = sessionSyncDeps.updateSkillRunnerRunStateByRequest({
    backendId,
    requestId,
    state: normalized,
    updatedAt: args.updatedAt,
    eventType: "backend.snapshot",
    eventPayload: {
      source: "events",
      status: normalized,
    },
  });
  if (!updated) {
    return {
      backendId,
      requestId,
      status: normalized,
      updatedAt: args.updatedAt,
    };
  }
  const updatedRequestId = normalizeString(updated.requestId);
  if (!updatedRequestId) {
    return {
      backendId,
      requestId,
      status: normalized,
      updatedAt: args.updatedAt,
    };
  }
  const taskState = normalizeStatus(updated.status, normalized);
  sessionSyncDeps.updateWorkflowTaskStateByRequest({
    backendId: updated.backendId,
    backendType: "skillrunner",
    requestId: updatedRequestId,
    state: taskState,
    error: undefined,
    updatedAt: updated.updatedAt,
  });
  sessionSyncDeps.updateTaskDashboardHistoryStateByRequest({
    backendId: updated.backendId,
    requestId: updatedRequestId,
    state: taskState,
    error: undefined,
    updatedAt: updated.updatedAt,
  });
  const payload = {
    backendId: updated.backendId,
    requestId: updatedRequestId,
    status: taskState,
    updatedAt: updated.updatedAt,
  };
  emitSessionStateChanged(payload);
  return payload;
}

async function consumeEventHistory(
  session: SessionLoopState,
  client: SessionSyncClient,
) {
  const payload = await client.listRunEventHistory({
    requestId: session.requestId,
    fromSeq: session.eventCursor + 1,
    lane: "background",
    signal: session.abortController?.signal,
  });
  if (!isSessionActive(session)) {
    return;
  }
  let latestObservedStatus = "";
  for (const event of payload.events || []) {
    if (!isSessionActive(session)) {
      return;
    }
    if (!isObject(event)) {
      continue;
    }
    const seq = Number(event.seq || 0);
    if (Number.isFinite(seq) && seq > session.eventCursor) {
      session.eventCursor = Math.floor(seq);
    }
    const status = resolveConversationStateChangedStatus(event);
    if (!status) {
      continue;
    }
    const current = applyStateSnapshot({
      session,
      status,
      updatedAt: normalizeString(event.ts) || undefined,
    });
    latestObservedStatus = current.status;
  }
  const ceiling = Number(payload.cursor_ceiling || 0);
  if (Number.isFinite(ceiling) && ceiling > session.eventCursor) {
    session.eventCursor = Math.floor(ceiling);
  }
  if (shouldDisconnectEventStream(latestObservedStatus)) {
    stopSessionSync({
      backendId: session.backend.id,
      requestId: session.requestId,
    });
  }
}

async function streamEventLoop(session: SessionLoopState) {
  const backendId = normalizeString(session.backend.id);
  const requestId = normalizeString(session.requestId);
  const key = toSessionKey(backendId, requestId);
  const client = sessionSyncDeps.buildManagementClient({
    backend: session.backend,
    localize: (_key, fallback) => fallback,
  });
  if (!isSessionActive(session)) {
    return;
  }
  if (!isSkillRunnerBackendAvailable(backendId)) {
    stopSessionByKey(key);
    return;
  }
  try {
    await consumeEventHistory(session, client);
    stopSessionByKey(key);
  } catch (error) {
    if (!isSessionActive(session)) {
      return;
    }
    if (isSkillRunnerRunTerminalClientError(error)) {
      const updatedAt = new Date().toISOString();
      const message =
        error instanceof Error
          ? error.message
          : "SkillRunner request is unavailable";
      sessionSyncDeps.updateSkillRunnerRunStateByRequest({
        backendId,
        requestId,
        state: "failed",
        error: message,
        updatedAt,
        eventType: "run.terminal_client_error",
        eventPayload: {
          source: "events-history",
          reason: message,
        },
      });
      sessionSyncDeps.updateWorkflowTaskStateByRequest({
        backendId,
        backendType: "skillrunner",
        requestId,
        state: "failed",
        error: message,
        updatedAt,
      });
      sessionSyncDeps.updateTaskDashboardHistoryStateByRequest({
        backendId,
        requestId,
        state: "failed",
        error: message,
        updatedAt,
      });
      sessionSyncDeps.appendRuntimeLog({
        level: "warn",
        scope: "job",
        backendId,
        backendType: session.backend.type,
        requestId,
        component: "skillrunner-session-sync",
        operation: "events-history-terminal-run-error",
        phase: "terminal",
        stage: "events-history-terminal-run-error",
        message:
          "skillrunner events history sync stopped after terminal run-level error",
        error,
      });
      stopSessionByKey(key);
      return;
    }
    sessionSyncDeps.appendRuntimeLog({
      level: "debug",
      scope: "job",
      backendId,
      backendType: session.backend.type,
      requestId,
      component: "skillrunner-session-sync",
      operation: "events-history-sync-failed",
      phase: "reconcile",
      stage: "events-history-sync-failed",
      message: "skillrunner events history sync failed; releasing session sync",
      error,
    });
    stopSessionByKey(key);
  }
}

export function ensureSkillRunnerSessionSync(args: {
  backend: BackendInstance;
  requestId: string;
}) {
  const requestId = normalizeString(args.requestId);
  const backendId = normalizeString(args.backend.id);
  if (!requestId || !backendId) {
    return;
  }
  if (!isSkillRunnerBackendAvailable(backendId)) {
    return;
  }
  const key = toSessionKey(backendId, requestId);
  const existing = sessions.get(key);
  if (existing) {
    return;
  }
  const session: SessionLoopState = {
    requestId,
    backend: args.backend,
    stopped: false,
    started: false,
    eventCursor: Math.max(
      0,
      Math.floor(lastEventCursorBySession.get(key) || 0),
    ),
    retryDelayMs: 800,
    generation: ++nextSessionGeneration,
    abortController:
      typeof AbortController === "function" ? new AbortController() : undefined,
  };
  sessions.set(key, session);
  if (!session.started) {
    session.started = true;
    spawnSessionTask(session, async () => {
      await streamEventLoop(session);
    });
  }
}

export function stopSessionSync(args?: {
  backendId?: string;
  requestId?: string;
}) {
  const backendId = normalizeString(args?.backendId);
  const requestId = normalizeString(args?.requestId);
  for (const [key, session] of Array.from(sessions.entries())) {
    if (backendId && normalizeString(session.backend.id) !== backendId) {
      continue;
    }
    if (requestId && normalizeString(session.requestId) !== requestId) {
      continue;
    }
    stopSessionByKey(key);
  }
}

export function stopAllSkillRunnerSessionSync() {
  for (const key of Array.from(sessions.keys())) {
    stopSessionByKey(key);
  }
}

export async function drainSkillRunnerSessionSync() {
  await drainSessionSyncTasks();
}

export async function shutdownSkillRunnerSessionSync() {
  stopAllSkillRunnerSessionSync();
  await drainSkillRunnerSessionSync();
}

export async function drainSkillRunnerSessionSyncForTests() {
  await drainSkillRunnerSessionSync();
}

export async function resetSkillRunnerSessionSyncForTests() {
  await shutdownSkillRunnerSessionSync();
  lastEventCursorBySession.clear();
  sessionStateListeners.clear();
}

export function subscribeSkillRunnerSessionState(args: {
  backendId: string;
  requestId: string;
  listener: (payload: SkillRunnerSessionStateUpdate) => void;
}) {
  const backendId = normalizeString(args.backendId);
  const requestId = normalizeString(args.requestId);
  if (!backendId || !requestId) {
    return () => {};
  }
  const key = toSessionKey(backendId, requestId);
  const listeners = sessionStateListeners.get(key) || new Set();
  listeners.add(args.listener);
  sessionStateListeners.set(key, listeners);
  return () => {
    const current = sessionStateListeners.get(key);
    if (!current) {
      return;
    }
    current.delete(args.listener);
    if (current.size === 0) {
      sessionStateListeners.delete(key);
    }
  };
}

export function setSkillRunnerSessionSyncDepsForTests(
  overrides?: Partial<SessionSyncDeps>,
) {
  sessionSyncDeps = overrides
    ? {
        ...defaultSessionSyncDeps,
        ...overrides,
      }
    : defaultSessionSyncDeps;
}

export function getSkillRunnerSessionSyncRuntimeForTests(): SessionSyncRuntimeSnapshot {
  let listenerCount = 0;
  for (const listeners of sessionStateListeners.values()) {
    listenerCount += listeners.size;
  }
  const generations = new Set<number>();
  for (const session of sessions.values()) {
    generations.add(session.generation);
  }
  return {
    sessionCount: sessions.size,
    lastEventCursorCount: lastEventCursorBySession.size,
    listenerCount,
    inflightTaskCount: inflightTasks.size,
    activeGenerationCount: generations.size,
  };
}
