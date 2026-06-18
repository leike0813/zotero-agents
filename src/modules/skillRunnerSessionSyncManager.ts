import type { BackendInstance } from "../backends/types";
import { isSkillRunnerRunTerminalClientError } from "../providers/skillrunner/errors";
import { appendRuntimeLog } from "./runtimeLogManager";
import { buildSkillRunnerManagementClient } from "./skillRunnerManagementClientFactory";
import { updateTaskDashboardHistoryStateByRequest } from "./taskDashboardHistory";
import {
  updateSkillRunnerRequestLedgerSnapshot,
} from "./skillRunnerRequestLedger";
import { isTerminal, normalizeStatus } from "./skillRunnerProviderStateMachine";
import {
  isSkillRunnerBackendReconcileFlagged,
  markSkillRunnerBackendHealthFailure,
  markSkillRunnerBackendHealthSuccess,
} from "./skillRunnerBackendHealthRegistry";
import { updateWorkflowTaskStateByRequest } from "./taskRuntime";
import { delay } from "../utils/runtimeCompatibility";

type SessionLoopState = {
  requestId: string;
  backend: BackendInstance;
  stopped: boolean;
  started: boolean;
  eventCursor: number;
  retryDelayMs: number;
  generation: number;
};

type SessionSyncClient = ReturnType<typeof buildSkillRunnerManagementClient>;

type SessionSyncDeps = {
  buildManagementClient: (args: {
    backend: BackendInstance;
    localize: (key: string, fallback: string) => string;
  }) => SessionSyncClient;
  appendRuntimeLog: typeof appendRuntimeLog;
  updateTaskDashboardHistoryStateByRequest: typeof updateTaskDashboardHistoryStateByRequest;
  updateSkillRunnerRequestLedgerSnapshot: typeof updateSkillRunnerRequestLedgerSnapshot;
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
  updateSkillRunnerRequestLedgerSnapshot,
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

async function sleep(ms: number) {
  if (ms <= 0) {
    return;
  }
  await delay(ms);
}

function toSessionKey(backendId: string, requestId: string) {
  return `${normalizeString(backendId)}:${normalizeString(requestId)}`;
}

function resolveConversationStateChangedStatus(event: Record<string, unknown>) {
  const type = normalizeString(event.type || event.kind || event.event).toLowerCase();
  if (type !== "conversation.state.changed") {
    return "";
  }
  const data = isObject(event.data) ? event.data : undefined;
  return normalizeString(data?.to);
}

function isSessionActive(session: SessionLoopState) {
  const key = toSessionKey(session.backend.id, session.requestId);
  return !session.stopped && sessions.get(key)?.generation === session.generation;
}

function trackInFlightTask(task: Promise<void>) {
  inflightTasks.add(task);
  void task.finally(() => {
    inflightTasks.delete(task);
  });
}

function spawnSessionTask(session: SessionLoopState, runner: () => Promise<void>) {
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
  const updated = sessionSyncDeps.updateSkillRunnerRequestLedgerSnapshot({
    requestId,
    source: "events",
    status: normalized,
    updatedAt: args.updatedAt,
  });
  if (!updated) {
    return {
      backendId,
      requestId,
      status: normalized,
      updatedAt: args.updatedAt,
    };
  }
  sessionSyncDeps.updateWorkflowTaskStateByRequest({
    backendId: updated.backendId,
    requestId: updated.requestId,
    state: updated.snapshot,
    error: undefined,
    updatedAt: updated.updatedAt,
  });
  sessionSyncDeps.updateTaskDashboardHistoryStateByRequest({
    backendId: updated.backendId,
    requestId: updated.requestId,
    state: updated.snapshot,
    error: undefined,
    updatedAt: updated.updatedAt,
  });
  const payload = {
    backendId: updated.backendId,
    requestId: updated.requestId,
    status: updated.snapshot,
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
  while (isSessionActive(session)) {
    if (isSkillRunnerBackendReconcileFlagged(backendId)) {
      stopSessionByKey(key);
      return;
    }
    try {
      await consumeEventHistory(session, client);
      if (!isSessionActive(session)) {
        return;
      }
      sessionSyncDeps.markSkillRunnerBackendHealthSuccess(backendId);
      await client.streamRunEvents({
        requestId,
        cursor: session.eventCursor,
        onFrame: (frame) => {
          if (!isSessionActive(session)) {
            return;
          }
          if (frame.event === "snapshot" && isObject(frame.data)) {
            const cursor = Number(frame.data.cursor || 0);
            if (Number.isFinite(cursor) && cursor > session.eventCursor) {
              session.eventCursor = Math.floor(cursor);
            }
            return;
          }
          if (frame.event !== "chat_event" || !isObject(frame.data)) {
            return;
          }
          const seq = Number(frame.data.seq || 0);
          if (Number.isFinite(seq) && seq > session.eventCursor) {
            session.eventCursor = Math.floor(seq);
          }
          const status = resolveConversationStateChangedStatus(
            frame.data as Record<string, unknown>,
          );
          if (!status) {
            return;
          }
          const current = applyStateSnapshot({
            session,
            status,
            updatedAt:
              normalizeString((frame.data as Record<string, unknown>).ts) ||
              undefined,
          });
          if (current.status === "running") {
            return;
          }
          if (shouldDisconnectEventStream(current.status)) {
            stopSessionByKey(key);
          }
        },
      });
      if (!isSessionActive(session)) {
        return;
      }
      await sleep(session.retryDelayMs);
      if (!isSessionActive(session)) {
        return;
      }
      session.retryDelayMs = Math.min(30000, session.retryDelayMs * 2);
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
        sessionSyncDeps.updateSkillRunnerRequestLedgerSnapshot({
          requestId,
          source: "jobs-terminal",
          status: "failed",
          error: message,
          updatedAt,
        });
        sessionSyncDeps.updateWorkflowTaskStateByRequest({
          backendId,
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
          operation: "events-stream-terminal-run-error",
          phase: "terminal",
          stage: "events-stream-terminal-run-error",
          message:
            "skillrunner events stream stopped after terminal run-level error",
          error,
        });
        stopSessionByKey(key);
        return;
      }
      sessionSyncDeps.markSkillRunnerBackendHealthFailure({
        backendId,
        error,
      });
      sessionSyncDeps.appendRuntimeLog({
        level: "warn",
        scope: "job",
        backendId,
        backendType: session.backend.type,
        requestId,
        component: "skillrunner-session-sync",
        operation: "events-stream-disconnected",
        phase: "reconcile",
        stage: "events-stream-disconnected",
        message: "skillrunner events stream disconnected; stopping current request stream",
        error,
      });
      stopSessionByKey(key);
      if (!isSessionActive(session)) {
        return;
      }
      await sleep(session.retryDelayMs);
      if (!isSessionActive(session)) {
        return;
      }
      session.retryDelayMs = Math.min(30000, session.retryDelayMs * 2);
      return;
    }
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
  if (isSkillRunnerBackendReconcileFlagged(backendId)) {
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
    eventCursor: Math.max(0, Math.floor(lastEventCursorBySession.get(key) || 0)),
    retryDelayMs: 800,
    generation: ++nextSessionGeneration,
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
