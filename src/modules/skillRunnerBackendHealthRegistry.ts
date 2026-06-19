type SkillRunnerBackendHealthListener = (
  backendId: string,
  state: SkillRunnerBackendHealthState,
) => void;

export type SkillRunnerBackendHealthState = {
  backendId: string;
  reachable: boolean;
  reconcileFlag: boolean;
  reachabilityMode: "normal" | "recovery_needed" | "idle_probing";
  failureStreak: number;
  backoffLevel: number;
  nextProbeAt: number;
  lastError?: string;
  updatedAt: string;
};

const listeners = new Set<SkillRunnerBackendHealthListener>();
const states = new Map<string, SkillRunnerBackendHealthState>();
export const SKILLRUNNER_BACKEND_PROBE_BACKOFF_STEPS_MS = [
  15000,
  30000,
  60000,
  120000,
] as const;
export const SKILLRUNNER_BACKEND_PROBE_FAILURE_THRESHOLD_FOR_GATE = 2;
export const SKILLRUNNER_BACKEND_PROBE_SUCCESS_THRESHOLD_FOR_RECOVERY = 1;

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function emit(backendId: string) {
  const state = states.get(backendId);
  if (!state) {
    return;
  }
  const snapshot = { ...state };
  for (const listener of listeners) {
    listener(backendId, snapshot);
  }
}

function ensureState(backendIdRaw: unknown) {
  const backendId = normalizeString(backendIdRaw);
  if (!backendId) {
    return null;
  }
  const current = states.get(backendId);
  if (current) {
    return current;
  }
  const next: SkillRunnerBackendHealthState = {
    backendId,
    reachable: true,
    reconcileFlag: false,
    reachabilityMode: "normal",
    failureStreak: 0,
    backoffLevel: 0,
    nextProbeAt: 0,
    updatedAt: nowIso(),
  };
  states.set(backendId, next);
  return next;
}

export function registerSkillRunnerBackendForHealthTracking(backendId: string) {
  const normalized = normalizeString(backendId);
  const existed = normalized ? states.has(normalized) : false;
  const state = ensureState(backendId);
  if (!state) {
    return null;
  }
  if (!existed) {
    emit(state.backendId);
  }
  return { ...state };
}

export function listSkillRunnerBackendHealthStates() {
  return Array.from(states.values()).map((entry) => ({ ...entry }));
}

export function getSkillRunnerBackendHealthState(backendId: string) {
  const normalized = normalizeString(backendId);
  if (!normalized) {
    return null;
  }
  const state = states.get(normalized);
  return state ? { ...state } : null;
}

export function isSkillRunnerBackendReconcileFlagged(backendId: string) {
  const normalized = normalizeString(backendId);
  if (!normalized) {
    return false;
  }
  const state = states.get(normalized);
  if (!state) {
    return true;
  }
  return state.reconcileFlag === true || state.reachable !== true;
}

export function shouldProbeSkillRunnerBackendNow(backendId: string, now = Date.now()) {
  const state = ensureState(backendId);
  if (!state) {
    return false;
  }
  if (state.reachabilityMode === "normal") {
    return false;
  }
  if (state.nextProbeAt <= 0) {
    return true;
  }
  return now >= state.nextProbeAt;
}

export function markSkillRunnerBackendHealthSuccess(backendId: string) {
  const state = ensureState(backendId);
  if (!state) {
    return null;
  }
  const changed =
    state.reachable !== true ||
    state.reconcileFlag !== false ||
    state.reachabilityMode !== "normal" ||
    state.backoffLevel !== 0 ||
    state.failureStreak !== 0 ||
    state.lastError !== undefined;
  state.reachable = true;
  state.reconcileFlag = false;
  state.reachabilityMode = "normal";
  state.failureStreak = 0;
  state.backoffLevel = 0;
  state.nextProbeAt = 0;
  state.lastError = undefined;
  state.updatedAt = nowIso();
  if (changed) {
    emit(state.backendId);
  }
  return { ...state };
}

export function markSkillRunnerBackendHealthFailure(args: {
  backendId: string;
  error?: unknown;
}) {
  const state = ensureState(args.backendId);
  if (!state) {
    return null;
  }
  const previousFlag = state.reconcileFlag;
  const previousReachable = state.reachable;
  const nextFailureStreak = state.failureStreak + 1;
  const nextLevel = Math.min(
    SKILLRUNNER_BACKEND_PROBE_BACKOFF_STEPS_MS.length - 1,
    state.backoffLevel + 1,
  );
  const shouldFlag =
    nextFailureStreak >= SKILLRUNNER_BACKEND_PROBE_FAILURE_THRESHOLD_FOR_GATE;
  state.reachable = !shouldFlag ? previousReachable : false;
  state.reconcileFlag = shouldFlag;
  state.reachabilityMode = "idle_probing";
  state.failureStreak = nextFailureStreak;
  state.backoffLevel = nextLevel;
  state.nextProbeAt =
    Date.now() + SKILLRUNNER_BACKEND_PROBE_BACKOFF_STEPS_MS[nextLevel];
  state.lastError = normalizeString(
    args.error && typeof args.error === "object" && "message" in args.error
      ? (args.error as { message?: unknown }).message
      : args.error,
  ) || undefined;
  state.updatedAt = nowIso();
  if (
    previousFlag !== state.reconcileFlag ||
    previousReachable !== state.reachable
  ) {
    emit(state.backendId);
  }
  return { ...state };
}

export function markSkillRunnerBackendRecoveryNeeded(args: {
  backendId: string;
  error?: unknown;
}) {
  const state = ensureState(args.backendId);
  if (!state) {
    return null;
  }
  const changed = state.reachabilityMode === "normal";
  state.reachabilityMode = "recovery_needed";
  state.nextProbeAt =
    Date.now() + SKILLRUNNER_BACKEND_PROBE_BACKOFF_STEPS_MS[0];
  state.lastError =
    normalizeString(
      args.error && typeof args.error === "object" && "message" in args.error
        ? (args.error as { message?: unknown }).message
        : args.error,
    ) || state.lastError;
  state.updatedAt = nowIso();
  if (changed) {
    emit(state.backendId);
  }
  return { ...state };
}

export function untrackSkillRunnerBackendHealth(backendId: string) {
  const normalized = normalizeString(backendId);
  if (!normalized) {
    return false;
  }
  return states.delete(normalized);
}

export function pruneSkillRunnerBackendHealth(activeBackendIds: Iterable<string>) {
  const active = new Set<string>();
  for (const id of activeBackendIds) {
    const normalized = normalizeString(id);
    if (!normalized) {
      continue;
    }
    active.add(normalized);
  }
  const removed: string[] = [];
  for (const backendId of states.keys()) {
    if (active.has(backendId)) {
      continue;
    }
    states.delete(backendId);
    removed.push(backendId);
  }
  return removed;
}

export function subscribeSkillRunnerBackendHealth(
  listener: SkillRunnerBackendHealthListener,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSkillRunnerBackendHealthRegistryRuntimeForTests() {
  let flaggedBackendCount = 0;
  let failureBackoffEntryCount = 0;
  for (const state of states.values()) {
    if (state.reconcileFlag) {
      flaggedBackendCount += 1;
    }
    if (state.failureStreak > 0 || state.backoffLevel > 0) {
      failureBackoffEntryCount += 1;
    }
  }
  return {
    trackedBackendCount: states.size,
    flaggedBackendCount,
    failureBackoffEntryCount,
    listenerCount: listeners.size,
  };
}

export function resetSkillRunnerBackendHealthRegistryForTests() {
  states.clear();
  listeners.clear();
}
