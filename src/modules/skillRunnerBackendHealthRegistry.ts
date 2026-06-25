type SkillRunnerBackendHealthListener = (
  backendId: string,
  state: SkillRunnerBackendHealthState,
) => void;

export type SkillRunnerBackendReachabilityStatus =
  | "disabled"
  | "unknown"
  | "probing"
  | "reachable"
  | "unreachable";

export type SkillRunnerBackendHealthState = {
  backendId: string;
  status: SkillRunnerBackendReachabilityStatus;
  reachable: boolean;
  lastReachableAt?: string;
  lastProbeAt?: string;
  nextProbeAt?: number;
  firstUnreachableAt?: string;
  failureStreak: number;
  backoffLevel: number;
  lastError?: string;
  updatedAt: string;
};

export type SkillRunnerBackendVisibilityState = {
  backendId: string;
  enabled: boolean;
  reachable: boolean;
  status: SkillRunnerBackendReachabilityStatus;
  unavailable: boolean;
  disabled: boolean;
  lastReachableAt?: string;
  lastProbeAt?: string;
  lastError?: string;
};

const listeners = new Set<SkillRunnerBackendHealthListener>();
const states = new Map<string, SkillRunnerBackendHealthState>();

export const SKILLRUNNER_BACKEND_PROBE_BACKOFF_STEPS_MS = [
  15000, 30000, 60000, 120000, 300000, 600000,
] as const;
export const SKILLRUNNER_BACKEND_PROBE_TICK_MS = 60000;
export const SKILLRUNNER_BACKEND_ENABLE_PROBE_DEBOUNCE_MS = 1000;
export const SKILLRUNNER_BACKEND_AUTO_DISABLE_AFTER_MS = 6 * 60 * 60 * 1000;
export const SKILLRUNNER_BACKEND_RECENT_SUCCESS_SKIP_MS = 60 * 1000;
export const SKILLRUNNER_BACKEND_FAILURES_BEFORE_UNREACHABLE = 2;

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function errorText(error: unknown) {
  return (
    normalizeString(
      error && typeof error === "object" && "message" in error
        ? (error as { message?: unknown }).message
        : error,
    ) || undefined
  );
}

function cloneState(state: SkillRunnerBackendHealthState) {
  return { ...state };
}

function emit(backendId: string) {
  const state = states.get(backendId);
  if (!state) {
    return;
  }
  const snapshot = cloneState(state);
  for (const listener of listeners) {
    listener(backendId, snapshot);
  }
}

function createState(
  backendId: string,
  status: SkillRunnerBackendReachabilityStatus,
): SkillRunnerBackendHealthState {
  const now = nowIso();
  return {
    backendId,
    status,
    reachable: status === "reachable",
    firstUnreachableAt:
      status === "unknown" || status === "unreachable" ? now : undefined,
    failureStreak: 0,
    backoffLevel: 0,
    nextProbeAt: status === "unknown" ? 0 : undefined,
    updatedAt: now,
  };
}

function ensureState(
  backendIdRaw: unknown,
  status: SkillRunnerBackendReachabilityStatus = "unknown",
) {
  const backendId = normalizeString(backendIdRaw);
  if (!backendId) {
    return null;
  }
  const current = states.get(backendId);
  if (current) {
    return current;
  }
  const next = createState(backendId, status);
  states.set(backendId, next);
  return next;
}

function setDisabledState(state: SkillRunnerBackendHealthState) {
  state.status = "disabled";
  state.reachable = false;
  state.nextProbeAt = undefined;
  state.lastError = undefined;
  state.updatedAt = nowIso();
}

function setUnknownState(state: SkillRunnerBackendHealthState) {
  const now = nowIso();
  state.status = "unknown";
  state.reachable = false;
  state.nextProbeAt = 0;
  state.firstUnreachableAt = state.firstUnreachableAt || now;
  state.updatedAt = now;
}

export function isSkillRunnerBackendConfigEnabled(backend: {
  enabled?: unknown;
}) {
  return backend.enabled !== false;
}

export function registerSkillRunnerBackendForHealthTracking(
  backendId: string,
  options?: { enabled?: boolean },
) {
  const normalized = normalizeString(backendId);
  const existed = normalized ? states.has(normalized) : false;
  const enabled = options?.enabled !== false;
  const state = ensureState(backendId, enabled ? "unknown" : "disabled");
  if (!state) {
    return null;
  }
  const before = JSON.stringify(state);
  if (!enabled) {
    setDisabledState(state);
  } else if (state.status === "disabled") {
    setUnknownState(state);
  }
  if (!existed || before !== JSON.stringify(state)) {
    emit(state.backendId);
  }
  return cloneState(state);
}

export function listSkillRunnerBackendHealthStates() {
  return Array.from(states.values()).map(cloneState);
}

export function getSkillRunnerBackendHealthState(backendId: string) {
  const normalized = normalizeString(backendId);
  if (!normalized) {
    return null;
  }
  const state = states.get(normalized);
  return state ? cloneState(state) : null;
}

export function isSkillRunnerBackendEnabled(backendId: string) {
  const normalized = normalizeString(backendId);
  if (!normalized) {
    return false;
  }
  const state = states.get(normalized);
  return state ? state.status !== "disabled" : true;
}

export function isSkillRunnerBackendReachable(backendId: string) {
  const normalized = normalizeString(backendId);
  if (!normalized) {
    return false;
  }
  const state = states.get(normalized);
  return state?.status === "reachable" && state.reachable === true;
}

export function getSkillRunnerBackendVisibilityState(
  backendId: string,
): SkillRunnerBackendVisibilityState {
  const normalized = normalizeString(backendId);
  const state = normalized ? states.get(normalized) : undefined;
  const status = state?.status || "unknown";
  const enabled = status !== "disabled";
  const reachable =
    enabled && state?.reachable === true && status === "reachable";
  return {
    backendId: normalized,
    enabled,
    reachable,
    status,
    unavailable: !reachable,
    disabled: !enabled,
    lastReachableAt: state?.lastReachableAt,
    lastProbeAt: state?.lastProbeAt,
    lastError: state?.lastError,
  };
}

export function isSkillRunnerBackendAvailable(backendId: string) {
  const visibility = getSkillRunnerBackendVisibilityState(backendId);
  return visibility.enabled && visibility.reachable;
}

export function syncSkillRunnerBackendHealthForConfiguredBackends(
  backends: Iterable<{
    id?: unknown;
    type?: unknown;
    enabled?: unknown;
  }>,
  options?: {
    prune?: boolean;
  },
) {
  const activeSkillRunnerIds: string[] = [];
  for (const backend of backends) {
    if (normalizeString(backend.type) !== "skillrunner") {
      continue;
    }
    const backendId = normalizeString(backend.id);
    if (!backendId) {
      continue;
    }
    activeSkillRunnerIds.push(backendId);
    registerSkillRunnerBackendForHealthTracking(backendId, {
      enabled: backend.enabled !== false,
    });
  }
  const removed = options?.prune
    ? pruneSkillRunnerBackendHealth(activeSkillRunnerIds)
    : [];
  return {
    tracked: activeSkillRunnerIds,
    removed,
  };
}

export function shouldProbeSkillRunnerBackendNow(
  backendId: string,
  now = Date.now(),
) {
  const state = ensureState(backendId);
  if (!state || state.status === "disabled" || state.status === "probing") {
    return false;
  }
  if (
    state.lastReachableAt &&
    now - Date.parse(state.lastReachableAt) <
      SKILLRUNNER_BACKEND_RECENT_SUCCESS_SKIP_MS
  ) {
    return false;
  }
  if (!state.nextProbeAt || state.nextProbeAt <= 0) {
    return true;
  }
  return now >= state.nextProbeAt;
}

export function shouldAutoDisableSkillRunnerBackend(
  backendId: string,
  now = Date.now(),
) {
  const state = states.get(normalizeString(backendId));
  if (!state || state.status === "disabled") {
    return false;
  }
  const anchor =
    Date.parse(state.lastReachableAt || "") ||
    Date.parse(state.firstUnreachableAt || "") ||
    0;
  return (
    anchor > 0 && now - anchor >= SKILLRUNNER_BACKEND_AUTO_DISABLE_AFTER_MS
  );
}

export function markSkillRunnerBackendProbeStarted(backendId: string) {
  const state = ensureState(backendId);
  if (!state || state.status === "disabled") {
    return null;
  }
  state.status = "probing";
  state.reachable = false;
  state.lastProbeAt = nowIso();
  state.updatedAt = state.lastProbeAt;
  emit(state.backendId);
  return cloneState(state);
}

export function deferSkillRunnerBackendProbe(args: {
  backendId: string;
  delayMs?: number;
}) {
  const state = ensureState(args.backendId);
  if (!state || state.status === "disabled") {
    return null;
  }
  state.status = state.reachable ? "reachable" : "unknown";
  state.nextProbeAt = Date.now() + Math.max(0, Number(args.delayMs || 0));
  state.updatedAt = nowIso();
  emit(state.backendId);
  return cloneState(state);
}

export function markSkillRunnerBackendHealthSuccess(backendId: string) {
  const state = ensureState(backendId);
  if (!state) {
    return null;
  }
  if (state.status === "disabled") {
    return cloneState(state);
  }
  const changed =
    state.status !== "reachable" ||
    state.reachable !== true ||
    state.backoffLevel !== 0 ||
    state.failureStreak !== 0 ||
    state.lastError !== undefined;
  state.status = "reachable";
  state.reachable = true;
  state.failureStreak = 0;
  state.backoffLevel = 0;
  state.nextProbeAt = undefined;
  state.lastError = undefined;
  state.lastReachableAt = nowIso();
  state.updatedAt = state.lastReachableAt;
  if (changed) {
    emit(state.backendId);
  }
  return cloneState(state);
}

export function markSkillRunnerBackendHealthFailure(args: {
  backendId: string;
  error?: unknown;
}) {
  const state = ensureState(args.backendId);
  if (!state || state.status === "disabled") {
    return null;
  }
  const now = nowIso();
  const nextFailureStreak = state.failureStreak + 1;
  const nextLevel = Math.min(
    SKILLRUNNER_BACKEND_PROBE_BACKOFF_STEPS_MS.length - 1,
    state.backoffLevel + 1,
  );
  const confirmedUnreachable =
    nextFailureStreak >= SKILLRUNNER_BACKEND_FAILURES_BEFORE_UNREACHABLE;
  if (confirmedUnreachable) {
    state.status = "unreachable";
    state.reachable = false;
  } else if (state.lastReachableAt) {
    state.status = "reachable";
    state.reachable = true;
  } else {
    state.status = "unknown";
    state.reachable = false;
  }
  state.failureStreak = nextFailureStreak;
  state.backoffLevel = nextLevel;
  state.lastProbeAt = now;
  if (confirmedUnreachable) {
    state.firstUnreachableAt = state.firstUnreachableAt || now;
  }
  state.nextProbeAt =
    Date.now() + SKILLRUNNER_BACKEND_PROBE_BACKOFF_STEPS_MS[nextLevel];
  state.lastError = errorText(args.error);
  state.updatedAt = now;
  emit(state.backendId);
  return cloneState(state);
}

export function markSkillRunnerBackendDisabled(backendId: string) {
  const state = ensureState(backendId, "disabled");
  if (!state) {
    return null;
  }
  setDisabledState(state);
  emit(state.backendId);
  return cloneState(state);
}

export function markSkillRunnerBackendEnabledForProbe(backendId: string) {
  const state = ensureState(backendId, "unknown");
  if (!state) {
    return null;
  }
  setUnknownState(state);
  emit(state.backendId);
  return cloneState(state);
}

export function untrackSkillRunnerBackendHealth(backendId: string) {
  const normalized = normalizeString(backendId);
  if (!normalized) {
    return false;
  }
  return states.delete(normalized);
}

export function pruneSkillRunnerBackendHealth(
  activeBackendIds: Iterable<string>,
) {
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
  let unavailableBackendCount = 0;
  let failureBackoffEntryCount = 0;
  for (const state of states.values()) {
    if (state.status !== "reachable") {
      unavailableBackendCount += 1;
    }
    if (state.failureStreak > 0 || state.backoffLevel > 0) {
      failureBackoffEntryCount += 1;
    }
  }
  return {
    trackedBackendCount: states.size,
    flaggedBackendCount: unavailableBackendCount,
    unavailableBackendCount,
    failureBackoffEntryCount,
    listenerCount: listeners.size,
  };
}

export function resetSkillRunnerBackendHealthRegistryForTests() {
  states.clear();
  listeners.clear();
}
