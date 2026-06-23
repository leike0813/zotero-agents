import type { BackendInstance } from "../backends/types";
import { listBackendInstancesSync } from "../backends/registry";
import { DEFAULT_BACKEND_TYPE } from "../config/defaults";
import { SkillRunnerClient } from "../providers/skillrunner/client";
import {
  getSkillRunnerHttpStatus,
  isSkillRunnerRunTerminalClientError,
} from "../providers/skillrunner/errors";
import {
  isSkillRunnerInteractiveAutoReplyEnabled,
  shouldEnableSkillRunnerAutoReplyForRun,
} from "./skillRunnerInteractiveAutoReply";
import {
  getSkillRunnerRunRecordByRequest,
  type SkillRunnerRunRecord,
} from "./skillRunnerRunStore";
import {
  isTerminal,
  normalizeStatus,
  type SkillRunnerProviderState,
} from "./skillRunnerProviderStateMachine";
import { appendRuntimeLog } from "./runtimeLogManager";
import { continueSkillRunnerForegroundRun } from "./skillRunnerForegroundContinuation";
import { isSkillRunnerBackendEnabled } from "./skillRunnerBackendHealthRegistry";

const AUTO_REPLY_OBSERVER_INTERVAL_MS = 15_000;

type AutoReplyStateClient = {
  getRunState(args: { requestId: string }): Promise<{ status?: unknown }>;
};

type AutoReplyContinuation = typeof continueSkillRunnerForegroundRun;

type ObserverContext = {
  key: string;
  backend: BackendInstance;
  requestId: string;
  source: string;
  startedAt: string;
  deadlineAt?: string;
  timeoutSeconds?: number;
  showTimer: boolean;
  timer?: ReturnType<typeof setTimeout>;
  uiTimer?: ReturnType<typeof setInterval>;
};

const observers = new Map<string, ObserverContext>();
const listeners = new Set<() => void>();

let clientFactoryForTests:
  | ((backend: BackendInstance) => AutoReplyStateClient)
  | undefined;
let continuationForTests: AutoReplyContinuation | undefined;
let intervalMsForTests: number | undefined;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function parseNonNegativeTimeoutSeconds(value: unknown) {
  const parsed = Number(String(value ?? "").trim());
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
}

function asPlainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function runtimeOptionsFromRecord(record: SkillRunnerRunRecord | null) {
  const requestPayload = asPlainObject(record?.requestPayload);
  const runtimeOptions = asPlainObject(requestPayload.runtime_options);
  return runtimeOptions;
}

function resolveAutoReplyTimeoutSeconds(record: SkillRunnerRunRecord) {
  const runtimeOptions = runtimeOptionsFromRecord(record);
  return parseNonNegativeTimeoutSeconds(
    runtimeOptions.interactive_reply_timeout_sec,
  );
}

function isRecoverySource(source: string) {
  return normalizeString(source).startsWith("recovery-");
}

function handoffOnlyContext(args: {
  backend: BackendInstance;
  requestId: string;
  source: string;
}): ObserverContext {
  return {
    key: observerKey({
      backendId: args.backend.id,
      requestId: args.requestId,
    }),
    backend: args.backend,
    requestId: args.requestId,
    source: args.source,
    startedAt: nowIso(),
    showTimer: false,
  };
}

function observerKey(args: { backendId?: string; requestId: string }) {
  return `${normalizeString(args.backendId) || "__skillrunner__"}:${normalizeString(args.requestId)}`;
}

function backendFromRecord(record: SkillRunnerRunRecord): BackendInstance {
  const backend = listBackendInstancesSync().find(
    (entry) => normalizeString(entry.id) === normalizeString(record.backendId),
  );
  if (backend) {
    return backend;
  }
  return {
    id: record.backendId,
    type: DEFAULT_BACKEND_TYPE,
    baseUrl: "",
    auth: { kind: "none" },
  };
}

function getRecord(args: { backendId?: string; requestId: string }) {
  return getSkillRunnerRunRecordByRequest({
    backendId: args.backendId,
    requestId: args.requestId,
  });
}

function isAutoReplyObservedRecord(
  record: SkillRunnerRunRecord | null,
): record is SkillRunnerRunRecord {
  if (
    !record ||
    normalizeString(record.archivedAt) ||
    normalizeStatus(record.status, "running") !== "waiting_user" ||
    record.observerState === "detached" ||
    isTerminal(normalizeStatus(record.status, "running"))
  ) {
    return false;
  }
  return shouldEnableSkillRunnerAutoReplyForRun({
    executionMode: record.executionMode,
    requestPayload: record.requestPayload,
  });
}

function buildClient(backend: BackendInstance): AutoReplyStateClient {
  if (clientFactoryForTests) {
    return clientFactoryForTests(backend);
  }
  return new SkillRunnerClient({
    baseUrl: backend.baseUrl,
    backendId: backend.id,
  });
}

function scheduleObserver(context: ObserverContext) {
  if (!observers.has(context.key)) {
    return;
  }
  const intervalMs = Math.max(
    0,
    intervalMsForTests ?? AUTO_REPLY_OBSERVER_INTERVAL_MS,
  );
  context.timer = setTimeout(() => {
    void runObserverTick(context.key);
  }, intervalMs);
}

function emitObserverStateChanged() {
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch {
      // Observer state listeners only drive UI refreshes; one failure must not
      // prevent other subscribers from seeing the latest countdown state.
    }
  }
}

export function subscribeSkillRunnerAutoReplyObserverState(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function scheduleCountdownUiTimer(context: ObserverContext) {
  if (!context.showTimer || !context.deadlineAt || context.uiTimer) {
    return;
  }
  context.uiTimer = setInterval(() => {
    if (!observers.has(context.key)) {
      if (context.uiTimer) {
        clearInterval(context.uiTimer);
        context.uiTimer = undefined;
      }
      return;
    }
    emitObserverStateChanged();
    if (Date.parse(context.deadlineAt || "") <= Date.now()) {
      if (context.uiTimer) {
        clearInterval(context.uiTimer);
        context.uiTimer = undefined;
      }
      emitObserverStateChanged();
    }
  }, 1_000);
}

export function stopSkillRunnerAutoReplyObserver(args: {
  backendId?: string;
  requestId: string;
}) {
  const key = observerKey(args);
  const context = observers.get(key);
  if (context?.timer) {
    clearTimeout(context.timer);
  }
  if (context?.uiTimer) {
    clearInterval(context.uiTimer);
  }
  observers.delete(key);
  if (context) {
    emitObserverStateChanged();
  }
}

function stopContext(context: ObserverContext) {
  stopSkillRunnerAutoReplyObserver({
    backendId: context.backend.id,
    requestId: context.requestId,
  });
}

async function handoff(context: ObserverContext, status: SkillRunnerProviderState) {
  stopContext(context);
  appendRuntimeLog({
    level: "info",
    scope: "job",
    backendId: context.backend.id,
    backendType: context.backend.type,
    providerId: "skillrunner",
    requestId: context.requestId,
    component: "skillrunner-auto-reply-observer",
    operation: "auto-reply-handoff",
    phase: context.source,
    stage: "auto-reply-handoff",
    message: "skillrunner auto-reply observer handed run to foreground continuation",
    details: { status },
  });
  const continuation = continuationForTests || continueSkillRunnerForegroundRun;
  await continuation({
    backend: context.backend,
    requestId: context.requestId,
    source: context.source,
    uiFocusPolicy: "none",
  });
}

async function runObserverTick(key: string) {
  const context = observers.get(key);
  if (!context) {
    return;
  }
  if (!isSkillRunnerBackendEnabled(context.backend.id)) {
    stopContext(context);
    return;
  }
  const latestRecord = getRecord({
    backendId: context.backend.id,
    requestId: context.requestId,
  });
  if (!isAutoReplyObservedRecord(latestRecord)) {
    stopContext(context);
    return;
  }
  try {
    const body = await buildClient(context.backend).getRunState({
      requestId: context.requestId,
    });
    const status = normalizeStatus(body.status, "running");
    if (status === "waiting_user") {
      scheduleObserver(context);
      return;
    }
    await handoff(context, status);
  } catch (error) {
    appendRuntimeLog({
      level: "warn",
      scope: "job",
      backendId: context.backend.id,
      backendType: context.backend.type,
      providerId: "skillrunner",
      requestId: context.requestId,
      component: "skillrunner-auto-reply-observer",
      operation: "auto-reply-observe-failed",
      phase: context.source,
      stage: "auto-reply-observe-failed",
      message: "skillrunner auto-reply observer state check failed",
      error,
    });
    stopContext(context);
  }
}

export function maybeObserveSkillRunnerAutoReplyRun(args: {
  backend?: BackendInstance;
  requestId: string;
  record?: SkillRunnerRunRecord | null;
  source?: string;
}) {
  if (!isSkillRunnerInteractiveAutoReplyEnabled()) {
    return false;
  }
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return false;
  }
  const record =
    args.record ||
    getRecord({
      backendId: args.backend?.id,
      requestId,
    });
  if (!isAutoReplyObservedRecord(record)) {
    return false;
  }
  const backend = args.backend || backendFromRecord(record);
  if (!normalizeString(backend.baseUrl)) {
    return false;
  }
  const key = observerKey({ backendId: backend.id, requestId });
  if (observers.has(key)) {
    return true;
  }
  const source = normalizeString(args.source) || "skillrunner-auto-reply-observer";
  const startedAt = nowIso();
  const timeoutSeconds = resolveAutoReplyTimeoutSeconds(record);
  const showTimer = !isRecoverySource(source) && typeof timeoutSeconds === "number";
  const context: ObserverContext = {
    key,
    backend,
    requestId,
    source,
    startedAt,
    deadlineAt: showTimer
      ? new Date(Date.parse(startedAt) + timeoutSeconds * 1000).toISOString()
      : undefined,
    timeoutSeconds: showTimer ? timeoutSeconds : undefined,
    showTimer,
  };
  observers.set(key, context);
  scheduleCountdownUiTimer(context);
  scheduleObserver(context);
  emitObserverStateChanged();
  return true;
}

async function queryAutoReplyState(args: {
  backend: BackendInstance;
  requestId: string;
}) {
  const body = await buildClient(args.backend).getRunState({
    requestId: args.requestId,
  });
  return normalizeStatus(body.status, "running");
}

export async function guardSkillRunnerAutoReplyBeforeUserReply(args: {
  backend: BackendInstance;
  requestId: string;
  source?: string;
}) {
  if (!isSkillRunnerInteractiveAutoReplyEnabled()) {
    return { action: "send" as const };
  }
  const record = getRecord({
    backendId: args.backend.id,
    requestId: args.requestId,
  });
  if (!isAutoReplyObservedRecord(record)) {
    return { action: "send" as const };
  }
  try {
    const status = await queryAutoReplyState(args);
    if (status === "waiting_user") {
      return { action: "send" as const };
    }
    await handoff(
      handoffOnlyContext({
        backend: args.backend,
        requestId: args.requestId,
        source: normalizeString(args.source) || "auto-reply-user-reply-preflight",
      }),
      status,
    );
    return { action: "handoff" as const, status };
  } catch {
    return { action: "send" as const };
  }
}

export async function reconcileSkillRunnerAutoReplyAfterReplyError(args: {
  backend: BackendInstance;
  requestId: string;
  error: unknown;
  source?: string;
}) {
  if (!isSkillRunnerInteractiveAutoReplyEnabled()) {
    return { action: "unhandled" as const };
  }
  const statusCode = getSkillRunnerHttpStatus(args.error);
  if (
    statusCode !== 409 &&
    !isSkillRunnerRunTerminalClientError(args.error)
  ) {
    return { action: "unhandled" as const };
  }
  const record = getRecord({
    backendId: args.backend.id,
    requestId: args.requestId,
  });
  if (!isAutoReplyObservedRecord(record)) {
    return { action: "unhandled" as const };
  }
  const status = await queryAutoReplyState(args);
  if (status === "waiting_user") {
    return { action: "still-waiting" as const, status };
  }
  await handoff(
    handoffOnlyContext({
      backend: args.backend,
      requestId: args.requestId,
      source: normalizeString(args.source) || "auto-reply-user-reply-race",
    }),
    status,
  );
  return { action: "handoff" as const, status };
}

export function getSkillRunnerAutoReplyObserverRuntimeForTests() {
  return {
    inFlightCount: observers.size,
    keys: Array.from(observers.keys()),
  };
}

export function getSkillRunnerAutoReplyObserverState(args: {
  backendId?: string;
  requestId: string;
}) {
  if (!isSkillRunnerInteractiveAutoReplyEnabled()) {
    return null;
  }
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return null;
  }
  const record = getRecord({
    backendId: args.backendId,
    requestId,
  });
  const autoReplyEnabled = shouldEnableSkillRunnerAutoReplyForRun({
    executionMode: record?.executionMode,
    requestPayload: record?.requestPayload,
  });
  if (!autoReplyEnabled) {
    return null;
  }
  const context = observers.get(
    observerKey({ backendId: args.backendId || record?.backendId, requestId }),
  );
  const remainingSeconds =
    context?.showTimer && context.deadlineAt
      ? Math.max(
          0,
          Math.ceil((Date.parse(context.deadlineAt) - Date.now()) / 1000),
        )
      : undefined;
  return {
    enabled: true,
    active: !!context,
    source: context?.source,
    startedAt: context?.startedAt,
    deadlineAt: context?.deadlineAt,
    timeoutSeconds: context?.timeoutSeconds,
    showTimer: context?.showTimer === true,
    remainingSeconds,
  };
}

function clearObservers() {
  for (const context of observers.values()) {
    if (context.timer) {
      clearTimeout(context.timer);
    }
    if (context.uiTimer) {
      clearInterval(context.uiTimer);
    }
  }
  observers.clear();
  emitObserverStateChanged();
}

export function shutdownSkillRunnerAutoReplyObserver() {
  clearObservers();
}

export async function runSkillRunnerAutoReplyObserverTickForTests(key: string) {
  await runObserverTick(key);
}

export function setSkillRunnerAutoReplyObserverRuntimeForTests(args?: {
  clientFactory?: (backend: BackendInstance) => AutoReplyStateClient;
  continuation?: AutoReplyContinuation;
  intervalMs?: number;
}) {
  clientFactoryForTests = args?.clientFactory;
  continuationForTests = args?.continuation;
  intervalMsForTests = args?.intervalMs;
}

export function resetSkillRunnerAutoReplyObserverForTests() {
  clearObservers();
  listeners.clear();
  clientFactoryForTests = undefined;
  continuationForTests = undefined;
  intervalMsForTests = undefined;
}
