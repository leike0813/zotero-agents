export const ACP_RUNTIME_PERFORMANCE_PROFILE_SCHEMA =
  "zotero-agents.acp-runtime-performance-profile.v1" as const;

const MAX_ACTIVE_PROFILES = 8;
const MAX_COMPLETED_PROFILES = 8;
const MAX_METRIC_SERIES = 128;
const DRIFT_INTERVAL_MS = 100;
const DURATION_BUCKETS_MS = [
  1, 4, 8, 16, 33, 50, 100, 250, 500, 1000, 5000,
] as const;

export type AcpRuntimeMetricName =
  | "jsonrpc_message"
  | "adapter_trace"
  | "adapter_diagnostic"
  | "session_update"
  | "diagnostic_run_upsert"
  | "run_persist"
  | "run_persist_bytes"
  | "run_persist_duration"
  | "state_store_write"
  | "state_store_write_duration"
  | "change_requested"
  | "change_emitted"
  | "change_coalesced"
  | "host_input_bytes"
  | "host_input_fragment"
  | "host_input_unavailable"
  | "host_input_duration"
  | "host_request_inflight"
  | "host_request_duration"
  | "host_response_bytes"
  | "panel_prepare"
  | "panel_prepare_duration"
  | "transcript_page_read"
  | "transcript_page_scan_items"
  | "transcript_page_read_duration"
  | "panel_signature"
  | "panel_signature_bytes"
  | "panel_signature_duration"
  | "panel_post"
  | "panel_post_duration"
  | "transport_queue_entries"
  | "transport_queue_bytes"
  | "transport_message_queue_entries"
  | "assistant_accumulator_chunks"
  | "assistant_accumulator_bytes"
  | "buffered_write_batch"
  | "buffered_write_bytes"
  | "buffered_write_duration"
  | "runtime_log_persist"
  | "runtime_log_persist_bytes"
  | "runtime_log_persist_duration"
  | "event_loop_drift"
  | "dropped_profile_start"
  | "dropped_metric_series";

export type AcpRuntimeMetricLabels = Partial<{
  updateClass:
    | "request"
    | "response"
    | "notification"
    | "assistant-message"
    | "assistant-thought"
    | "tool-call"
    | "tool-update"
    | "plan"
    | "usage-status"
    | "other";
  changeKind:
    | "run"
    | "transcript"
    | "progress"
    | "runtime-options"
    | "archive"
    | "global"
    | "other";
  surfaceState: "closed" | "open-inactive" | "acp-active";
  operationClass:
    | "enqueue"
    | "dequeue"
    | "file"
    | "library"
    | "mutation"
    | "workflow"
    | "diagnostic"
    | "panel"
    | "other";
  persistenceChannel:
    | "run"
    | "event"
    | "transcript"
    | "audit"
    | "runtime-log"
    | "other";
}>;

export type AcpRuntimeProfileContext = {
  requestId: string;
  displayMode: "live" | "boundary" | "silent";
  transport: "stdio" | "websocket" | "unknown";
  zoteroMajor: 7 | 9 | "unknown";
};

export type AcpRuntimeMetricSnapshot = {
  name: AcpRuntimeMetricName;
  labels: AcpRuntimeMetricLabels;
  counter?: { total: number };
  duration?: {
    count: number;
    totalMs: number;
    maxMs: number;
    buckets: readonly number[];
  };
  gauge?: { current: number; max: number };
};

export type AcpRuntimeProfileSnapshot = AcpRuntimeProfileContext & {
  startedAtMs: number;
  finishedAtMs?: number;
  metrics: readonly AcpRuntimeMetricSnapshot[];
};

export type AcpRuntimePerformanceSnapshot = {
  schema: typeof ACP_RUNTIME_PERFORMANCE_PROFILE_SCHEMA;
  generatedAtMs: number;
  limits: {
    activeProfiles: number;
    completedProfiles: number;
    metricSeriesPerProfile: number;
    durationBucketsMs: typeof DURATION_BUCKETS_MS;
  };
  global: AcpRuntimeProfileSnapshot;
  active: readonly AcpRuntimeProfileSnapshot[];
  completed: readonly AcpRuntimeProfileSnapshot[];
};

type MetricSeries = {
  name: AcpRuntimeMetricName;
  labels: AcpRuntimeMetricLabels;
  kind: "counter" | "duration" | "gauge";
  total: number;
  count: number;
  max: number;
  buckets: number[];
};

type ProfileState = AcpRuntimeProfileContext & {
  startedAtMs: number;
  finishedAtMs?: number;
  metrics: Map<string, MetricSeries>;
};

type TimerHandle = unknown;
type ProfilerTestOptions = {
  now?: () => number;
  setTimer?: (callback: () => void, delayMs: number) => TimerHandle;
  clearTimer?: (timer: TimerHandle) => void;
};

type ProfilerState = {
  global: ProfileState;
  active: Map<string, ProfileState>;
  completed: ProfileState[];
  timer: TimerHandle | null;
  expectedDriftAtMs: number;
};

let enabled = false;
let state: ProfilerState | null = null;
let testOptions: ProfilerTestOptions = {};

function isProfilerDebugModeEnabled() {
  if (typeof __debug_mode__ !== "undefined") {
    return __debug_mode__;
  }
  return (
    (
      globalThis as typeof globalThis & {
        __zs_debug_mode_override_for_tests__?: boolean;
      }
    ).__zs_debug_mode_override_for_tests__ === true
  );
}

function safeNow() {
  try {
    const value = (
      testOptions.now || (() => globalThis.performance?.now?.() ?? Date.now())
    )();
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function setProfilerTimer(callback: () => void, delayMs: number) {
  try {
    return (testOptions.setTimer || ((fn, delay) => setTimeout(fn, delay)))(
      callback,
      delayMs,
    );
  } catch {
    return null;
  }
}

function clearProfilerTimer(timer: TimerHandle | null) {
  if (timer === null) {
    return;
  }
  try {
    (
      testOptions.clearTimer ||
      ((value) => clearTimeout(value as ReturnType<typeof setTimeout>))
    )(timer);
  } catch {
    // Profiler cleanup must never affect the host operation.
  }
}

function createProfile(
  context: AcpRuntimeProfileContext,
  startedAtMs = safeNow(),
): ProfileState {
  return {
    ...context,
    requestId: String(context.requestId || "").trim(),
    startedAtMs,
    metrics: new Map(),
  };
}

function createState(): ProfilerState {
  return {
    global: createProfile({
      requestId: "",
      displayMode: "silent",
      transport: "unknown",
      zoteroMajor: "unknown",
    }),
    active: new Map(),
    completed: [],
    timer: null,
    expectedDriftAtMs: 0,
  };
}

function normalizeLabels(labels: AcpRuntimeMetricLabels = {}) {
  const result: AcpRuntimeMetricLabels = {};
  for (const key of [
    "updateClass",
    "changeKind",
    "surfaceState",
    "operationClass",
    "persistenceChannel",
  ] as const) {
    const value = labels[key];
    if (value) {
      (result as Record<string, string>)[key] = value;
    }
  }
  return result;
}

function seriesKey(name: AcpRuntimeMetricName, labels: AcpRuntimeMetricLabels) {
  return `${name}|${Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("|")}`;
}

function resolveProfile(requestIdRaw?: string | null) {
  if (!enabled || !state) {
    return null;
  }
  const requestId = String(requestIdRaw || "").trim();
  return requestId ? state.active.get(requestId) || null : state.global;
}

function getOrCreateSeries(
  profile: ProfileState,
  name: AcpRuntimeMetricName,
  labelsRaw: AcpRuntimeMetricLabels,
  kind: MetricSeries["kind"],
) {
  const labels = normalizeLabels(labelsRaw);
  const key = seriesKey(name, labels);
  const existing = profile.metrics.get(key);
  if (existing) {
    return existing.kind === kind ? existing : null;
  }
  if (profile.metrics.size >= MAX_METRIC_SERIES) {
    return null;
  }
  const series: MetricSeries = {
    name,
    labels,
    kind,
    total: 0,
    count: 0,
    max: 0,
    buckets: DURATION_BUCKETS_MS.map(() => 0),
  };
  profile.metrics.set(key, series);
  return series;
}

function recordSafely(work: () => void) {
  if (!enabled || !isProfilerDebugModeEnabled()) {
    return;
  }
  try {
    work();
  } catch {
    // Profiling is observational and must never affect runtime behavior.
  }
}

function scheduleDriftProbe() {
  if (!enabled || !state || state.active.size === 0 || state.timer !== null) {
    return;
  }
  const current = safeNow();
  state.expectedDriftAtMs = current + DRIFT_INTERVAL_MS;
  state.timer = setProfilerTimer(() => {
    if (!state) {
      return;
    }
    state.timer = null;
    const drift = Math.max(0, safeNow() - state.expectedDriftAtMs);
    observeAcpRuntimeDuration(null, "event_loop_drift", {}, drift);
    scheduleDriftProbe();
  }, DRIFT_INTERVAL_MS);
}

function stopDriftProbe() {
  if (!state) {
    return;
  }
  clearProfilerTimer(state.timer);
  state.timer = null;
  state.expectedDriftAtMs = 0;
}

export function enableAcpRuntimePerformanceProfiler() {
  if (!isProfilerDebugModeEnabled()) {
    return false;
  }
  if (!enabled) {
    enabled = true;
    state = createState();
  }
  return true;
}

export function disableAcpRuntimePerformanceProfiler() {
  stopDriftProbe();
  enabled = false;
  state = null;
}

export function isAcpRuntimePerformanceProfilerEnabled() {
  return enabled && isProfilerDebugModeEnabled();
}

export function startAcpRuntimeProfile(context: AcpRuntimeProfileContext) {
  recordSafely(() => {
    if (!state) {
      return;
    }
    const requestId = String(context.requestId || "").trim();
    if (!requestId || state.active.has(requestId)) {
      return;
    }
    if (state.active.size >= MAX_ACTIVE_PROFILES) {
      incrementAcpRuntimeMetric(null, "dropped_profile_start");
      return;
    }
    state.active.set(requestId, createProfile({ ...context, requestId }));
    scheduleDriftProbe();
  });
}

export function finishAcpRuntimeProfile(requestIdRaw: string) {
  recordSafely(() => {
    if (!state) {
      return;
    }
    const requestId = String(requestIdRaw || "").trim();
    const profile = state.active.get(requestId);
    if (!profile) {
      return;
    }
    state.active.delete(requestId);
    profile.finishedAtMs = safeNow();
    state.completed.push(profile);
    if (state.completed.length > MAX_COMPLETED_PROFILES) {
      state.completed.splice(
        0,
        state.completed.length - MAX_COMPLETED_PROFILES,
      );
    }
    if (state.active.size === 0) {
      stopDriftProbe();
    }
  });
}

export function incrementAcpRuntimeMetric(
  requestId: string | null | undefined,
  name: AcpRuntimeMetricName,
  labels: AcpRuntimeMetricLabels = {},
  delta = 1,
) {
  recordSafely(() => {
    const profile = resolveProfile(requestId);
    if (!profile) {
      return;
    }
    const series = getOrCreateSeries(profile, name, labels, "counter");
    if (series) {
      series.total += Number.isFinite(delta) ? delta : 0;
    }
  });
}

export function observeAcpRuntimeDuration(
  requestId: string | null | undefined,
  name: AcpRuntimeMetricName,
  labels: AcpRuntimeMetricLabels = {},
  durationMs = 0,
) {
  recordSafely(() => {
    const profile = resolveProfile(requestId);
    if (!profile) {
      return;
    }
    const series = getOrCreateSeries(profile, name, labels, "duration");
    if (!series) {
      return;
    }
    const duration = Math.max(0, Number.isFinite(durationMs) ? durationMs : 0);
    series.count += 1;
    series.total += duration;
    series.max = Math.max(series.max, duration);
    const bucketIndex = DURATION_BUCKETS_MS.findIndex(
      (upperBound) => duration <= upperBound,
    );
    series.buckets[
      bucketIndex >= 0 ? bucketIndex : series.buckets.length - 1
    ] += 1;
  });
}

export function observeAcpRuntimeGauge(
  requestId: string | null | undefined,
  name: AcpRuntimeMetricName,
  labels: AcpRuntimeMetricLabels = {},
  value = 0,
) {
  recordSafely(() => {
    const profile = resolveProfile(requestId);
    if (!profile) {
      return;
    }
    const series = getOrCreateSeries(profile, name, labels, "gauge");
    if (!series) {
      return;
    }
    const normalized = Number.isFinite(value) ? value : 0;
    series.total = normalized;
    series.max = Math.max(series.max, normalized);
  });
}

function metricSnapshot(series: MetricSeries): AcpRuntimeMetricSnapshot {
  const base = {
    name: series.name,
    labels: { ...series.labels },
  };
  if (series.kind === "counter") {
    return { ...base, counter: { total: series.total } };
  }
  if (series.kind === "gauge") {
    return {
      ...base,
      gauge: { current: series.total, max: series.max },
    };
  }
  return {
    ...base,
    duration: {
      count: series.count,
      totalMs: series.total,
      maxMs: series.max,
      buckets: [...series.buckets],
    },
  };
}

function profileSnapshot(profile: ProfileState): AcpRuntimeProfileSnapshot {
  return {
    requestId: profile.requestId,
    displayMode: profile.displayMode,
    transport: profile.transport,
    zoteroMajor: profile.zoteroMajor,
    startedAtMs: profile.startedAtMs,
    ...(typeof profile.finishedAtMs === "number"
      ? { finishedAtMs: profile.finishedAtMs }
      : {}),
    metrics: Array.from(profile.metrics.values(), metricSnapshot),
  };
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return value;
}

export function snapshotAcpRuntimeProfiles():
  | AcpRuntimePerformanceSnapshot
  | undefined {
  if (!enabled || !state || !isProfilerDebugModeEnabled()) {
    return undefined;
  }
  try {
    return deepFreeze({
      schema: ACP_RUNTIME_PERFORMANCE_PROFILE_SCHEMA,
      generatedAtMs: safeNow(),
      limits: {
        activeProfiles: MAX_ACTIVE_PROFILES,
        completedProfiles: MAX_COMPLETED_PROFILES,
        metricSeriesPerProfile: MAX_METRIC_SERIES,
        durationBucketsMs: DURATION_BUCKETS_MS,
      },
      global: profileSnapshot(state.global),
      active: Array.from(state.active.values(), profileSnapshot),
      completed: state.completed.map(profileSnapshot),
    });
  } catch {
    return undefined;
  }
}

export function configureAcpRuntimePerformanceProfilerForTests(
  options: ProfilerTestOptions = {},
) {
  testOptions = { ...options };
}

export function resetAcpRuntimePerformanceProfilerForTests() {
  disableAcpRuntimePerformanceProfiler();
  testOptions = {};
}
