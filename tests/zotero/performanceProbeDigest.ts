import {
  installTestPerformanceProbeHooksForTests,
  resetTestPerformanceProbeHooksForTests,
} from "../../src/modules/testPerformanceProbeBridge";
import {
  PI_RUNTIME_CAPACITY_OPTIONS,
  PI_RUNTIME_FOREGROUND_RESERVE,
} from "../../src/modules/piRuntimeLifecycle";
import {
  enableAcpRuntimePerformanceProfiler,
  resetAcpRuntimePerformanceProfilerForTests,
  snapshotAcpRuntimeProfiles,
} from "../../src/modules/acp/diagnostics/acpRuntimePerformanceProfiler";
import {
  ensureDiagnosticsDirectory,
  normalizeDiagnosticsString,
  readDiagnosticsEnv,
  resolveDefaultTestDiagnosticsOutputPath,
  writeDiagnosticsText,
} from "./testDiagnosticsOutput";

export type PerformanceProbePhase =
  | "test-start"
  | "pre-cleanup"
  | "post-background-cleanup"
  | "post-object-cleanup"
  | "domain-end";

type PerformanceProbeSpan = {
  name: string;
  domain: string;
  fullTitle: string;
  file: string;
  testIndex: number;
  ts: string;
  elapsedSinceRunStartMs: number;
  startedAt: string;
  durationMs: number;
  labels: Record<string, unknown>;
};

type PerformanceProbeSnapshot = {
  phase: PerformanceProbePhase;
  domain: string;
  fullTitle: string;
  file: string;
  testIndex: number;
  ts: string;
  elapsedSinceRunStartMs: number;
  metrics: {
    eventLoopLag: {
      lagMs: number;
    };
    hostResources: {
      library: {
        itemCount: number | null;
        noteCount: number | null;
        attachmentCount: number | null;
        collectionCount: number | null;
      };
      windows: {
        openWindowCount: number | null;
        dialogWindowCount: number | null;
        browserCount: number | null;
        frameCount: number | null;
      };
    };
  };
};

type PerformanceProbeState = {
  enabled: boolean;
  installed: boolean;
  runStartMs: number;
  testIndex: number;
  outputPath: string;
  flushed: boolean;
  currentMeta: {
    domain: string;
    fullTitle: string;
    file: string;
    testIndex: number;
  };
  snapshots: PerformanceProbeSnapshot[];
  spans: PerformanceProbeSpan[];
};

const INSTALL_FLAG = "__zs_zotero_performance_probe_digest_installed__";
const STATE_KEY = "__zs_zotero_performance_probe_digest_state__";
const CAPACITY_STATE_KEY = "__zs_pi_capacity_probe_state__";

type PerformanceRuntime = typeof globalThis & {
  [INSTALL_FLAG]?: boolean;
  [STATE_KEY]?: PerformanceProbeState;
  [CAPACITY_STATE_KEY]?: PiCapacityProbeState;
  Services?: {
    wm?: {
      getEnumerator?: (windowType?: string | null) => {
        hasMoreElements?: () => boolean;
        getNext?: () => unknown;
      };
    };
  };
  IOUtils?: unknown;
  PathUtils?: unknown;
};

function getRuntime() {
  return globalThis as PerformanceRuntime;
}

function parseFlag(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function isPerformanceProbeEnabled() {
  return parseFlag(readDiagnosticsEnv("ZOTERO_TEST_PERF_PROBE"));
}

function isRealZoteroRuntime() {
  const runtime = getRuntime();
  return (
    !!runtime.IOUtils && !!runtime.PathUtils && typeof Zotero !== "undefined"
  );
}

function resolveOutputPath() {
  return resolveDefaultTestDiagnosticsOutputPath({
    envName: "ZOTERO_TEST_PERF_PROBE_OUT",
    prefix: "zotero-performance-probe",
  });
}

function createDefaultState(): PerformanceProbeState {
  return {
    enabled: isPerformanceProbeEnabled(),
    installed: false,
    runStartMs: Date.now(),
    testIndex: 0,
    outputPath: resolveOutputPath(),
    flushed: false,
    currentMeta: {
      domain: "all",
      fullTitle: "",
      file: "",
      testIndex: 0,
    },
    snapshots: [],
    spans: [],
  };
}

function getState() {
  const runtime = getRuntime();
  if (!runtime[STATE_KEY]) {
    runtime[STATE_KEY] = createDefaultState();
  }
  return runtime[STATE_KEY] as PerformanceProbeState;
}

async function measureEventLoopLag() {
  const startedAt = Date.now();
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  return Date.now() - startedAt;
}

async function countLibraryItemsBySearch(args?: {
  field?: "itemType";
  operator?: "is";
  value?: string;
}) {
  if (!isRealZoteroRuntime() || typeof Zotero.Search !== "function") {
    return null;
  }
  try {
    const search = new Zotero.Search({
      libraryID: Zotero.Libraries.userLibraryID,
    });
    if (args?.field && args.operator && typeof args.value === "string") {
      search.addCondition(args.field, args.operator, args.value);
    }
    const results = await search.search();
    return Array.isArray(results) ? results.length : null;
  } catch {
    return null;
  }
}

function enumerateWindows() {
  const runtime = getRuntime();
  const windows: Array<
    Window & {
      document?: Document;
      location?: { href?: string };
    }
  > = [];
  try {
    const enumerator = runtime.Services?.wm?.getEnumerator?.(null);
    if (enumerator?.hasMoreElements && enumerator?.getNext) {
      while (enumerator.hasMoreElements()) {
        const next = enumerator.getNext();
        if (next && typeof next === "object") {
          windows.push(
            next as Window & {
              document?: Document;
              location?: { href?: string };
            },
          );
        }
      }
      return windows;
    }
  } catch {
    // ignore enumerator failures
  }
  try {
    const mains = Zotero.getMainWindows?.() || [];
    for (const win of mains) {
      if (win && typeof win === "object") {
        windows.push(
          win as Window & { document?: Document; location?: { href?: string } },
        );
      }
    }
  } catch {
    // ignore main window lookup failures
  }
  return windows;
}

function countElementsAcrossWindows(
  windows: Array<Window & { document?: Document }>,
  selector: string,
) {
  let total = 0;
  for (const win of windows) {
    try {
      total += win.document?.querySelectorAll(selector)?.length || 0;
    } catch {
      // ignore query failures
    }
  }
  return total;
}

async function buildHostResourceMetrics() {
  if (!isRealZoteroRuntime()) {
    return {
      library: {
        itemCount: null,
        noteCount: null,
        attachmentCount: null,
        collectionCount: null,
      },
      windows: {
        openWindowCount: null,
        dialogWindowCount: null,
        browserCount: null,
        frameCount: null,
      },
    };
  }
  const windows = enumerateWindows();
  const dialogWindowCount = windows.filter((win) => {
    const href = String(win.location?.href || "").toLowerCase();
    const root = String(
      win.document?.documentElement?.localName ||
        win.document?.documentElement?.tagName ||
        "",
    ).toLowerCase();
    return href.includes("dialog") || root === "dialog";
  }).length;
  let collectionCount: number | null = null;
  try {
    const getByLibrary = (
      Zotero.Collections as unknown as {
        getByLibrary?: (libraryID: number) => Array<unknown>;
      }
    ).getByLibrary;
    if (typeof getByLibrary === "function") {
      const collections = getByLibrary(Zotero.Libraries.userLibraryID);
      collectionCount = Array.isArray(collections) ? collections.length : null;
    }
  } catch {
    collectionCount = null;
  }
  return {
    library: {
      itemCount: await countLibraryItemsBySearch(),
      noteCount: await countLibraryItemsBySearch({
        field: "itemType",
        operator: "is",
        value: "note",
      }),
      attachmentCount: await countLibraryItemsBySearch({
        field: "itemType",
        operator: "is",
        value: "attachment",
      }),
      collectionCount,
    },
    windows: {
      openWindowCount: windows.length,
      dialogWindowCount,
      browserCount: countElementsAcrossWindows(windows, "browser"),
      frameCount: countElementsAcrossWindows(windows, "browser, iframe, frame"),
    },
  };
}

function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function splitHeadTail<T>(values: T[]) {
  const size = Math.max(1, Math.floor(values.length * 0.2));
  return {
    head: values.slice(0, size),
    tail: values.slice(values.length - size),
  };
}

function flattenNumericMetrics(
  value: unknown,
  prefix = "",
  target: Record<string, number> = {},
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    target[prefix] = value;
    return target;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return target;
  }
  for (const [key, child] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenNumericMetrics(child, nextPrefix, target);
  }
  return target;
}

function buildSummary(args: {
  snapshots: PerformanceProbeSnapshot[];
  spans: PerformanceProbeSpan[];
}) {
  const durationHeadVsTail = Array.from(
    args.spans.reduce((map, span) => {
      const entries = map.get(span.name) || [];
      entries.push(span);
      map.set(span.name, entries);
      return map;
    }, new Map<string, PerformanceProbeSpan[]>()),
  )
    .map(([name, spans]) => {
      const durations = spans.map((entry) => entry.durationMs);
      const { head, tail } = splitHeadTail(durations);
      return {
        name,
        count: durations.length,
        headAvg: average(head),
        tailAvg: average(tail),
        delta: average(tail) - average(head),
        p95: percentile(durations, 95),
        max: Math.max(...durations),
      };
    })
    .sort((left, right) => right.delta - left.delta);

  const lagByPhase = Array.from(
    args.snapshots.reduce((map, snapshot) => {
      const entries = map.get(snapshot.phase) || [];
      entries.push(snapshot.metrics.eventLoopLag.lagMs);
      map.set(snapshot.phase, entries);
      return map;
    }, new Map<PerformanceProbePhase, number[]>()),
  )
    .map(([phase, values]) => {
      const { head, tail } = splitHeadTail(values);
      return {
        phase,
        headAvg: average(head),
        tailAvg: average(tail),
        delta: average(tail) - average(head),
        p95: percentile(values, 95),
        max: Math.max(...values),
      };
    })
    .sort((left, right) => right.delta - left.delta);

  const resourceSeries = new Map<string, number[]>();
  for (const snapshot of args.snapshots) {
    const flattened = flattenNumericMetrics(snapshot.metrics.hostResources);
    for (const [metric, value] of Object.entries(flattened)) {
      const series = resourceSeries.get(metric) || [];
      series.push(value);
      resourceSeries.set(metric, series);
    }
  }
  const resourceHeadVsTail = Array.from(resourceSeries.entries())
    .map(([metric, values]) => {
      const { head, tail } = splitHeadTail(values);
      return {
        metric,
        headAvg: average(head),
        tailAvg: average(tail),
        delta: average(tail) - average(head),
        max: Math.max(...values),
      };
    })
    .sort((left, right) => right.delta - left.delta);

  const topSlowTests = [...args.spans]
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 20)
    .map((span) => ({
      name: span.name,
      durationMs: span.durationMs,
      domain: span.domain,
      fullTitle: span.fullTitle,
      file: span.file,
      testIndex: span.testIndex,
    }));

  const suspectRank = [
    ...durationHeadVsTail.map((entry) => ({
      kind: "span",
      metric: entry.name,
      score: Math.max(0, entry.delta) * 2 + entry.p95 + entry.max / 10,
      headAvg: entry.headAvg,
      tailAvg: entry.tailAvg,
      p95: entry.p95,
    })),
    ...lagByPhase.map((entry) => ({
      kind: "lag",
      metric: entry.phase,
      score: Math.max(0, entry.delta) * 5 + entry.p95 + entry.max / 10,
      headAvg: entry.headAvg,
      tailAvg: entry.tailAvg,
      p95: entry.p95,
    })),
    ...resourceHeadVsTail
      .filter((entry) => entry.delta > 0)
      .map((entry) => ({
        kind: "resource",
        metric: entry.metric,
        score: entry.delta * 3 + entry.max,
        headAvg: entry.headAvg,
        tailAvg: entry.tailAvg,
        p95: entry.max,
      })),
  ]
    .sort((left, right) => right.score - left.score)
    .slice(0, 20);

  return {
    snapshotCount: args.snapshots.length,
    spanCount: args.spans.length,
    durationHeadVsTail,
    durationGrowthBySpan: durationHeadVsTail,
    eventLoopLagHeadVsTail: lagByPhase,
    resourceHeadVsTail,
    topSlowTests,
    suspectRank,
  };
}

function buildSuspicions(summary: ReturnType<typeof buildSummary>) {
  return summary.suspectRank
    .filter((entry) => entry.score > 0)
    .map((entry) => ({
      kind: entry.kind,
      metric: entry.metric,
      score: entry.score,
      headAvg: entry.headAvg,
      tailAvg: entry.tailAvg,
      p95: entry.p95,
    }));
}

export function installZoteroPerformanceProbeDigest() {
  const runtime = getRuntime();
  if (runtime[INSTALL_FLAG]) {
    return;
  }
  runtime[INSTALL_FLAG] = true;
  const state = getState();
  state.installed = true;
  if (state.enabled) {
    enableAcpRuntimePerformanceProfiler();
  }
  installTestPerformanceProbeHooksForTests({
    enabled: state.enabled,
    recordSpan(args) {
      const current = getState();
      if (!current.enabled) {
        return;
      }
      current.spans.push({
        name: args.name,
        domain: current.currentMeta.domain,
        fullTitle: current.currentMeta.fullTitle,
        file: current.currentMeta.file,
        testIndex: current.currentMeta.testIndex,
        ts: new Date().toISOString(),
        elapsedSinceRunStartMs: Date.now() - current.runStartMs,
        startedAt: new Date(args.startedAt).toISOString(),
        durationMs: args.durationMs,
        labels: { ...(args.labels || {}) },
      });
    },
  });
}

export async function captureZoteroPerformanceSnapshot(
  phase: PerformanceProbePhase,
  args?: {
    domain?: string;
    fullTitle?: string;
    file?: string;
    testIndex?: number;
  },
) {
  const state = getState();
  if (!state.enabled) {
    return;
  }
  const lagMs = await measureEventLoopLag();
  const hostResources = await buildHostResourceMetrics();
  const testIndex =
    typeof args?.testIndex === "number" && Number.isFinite(args.testIndex)
      ? args.testIndex
      : state.testIndex;
  state.snapshots.push({
    phase,
    domain: normalizeDiagnosticsString(args?.domain) || "all",
    fullTitle: normalizeDiagnosticsString(args?.fullTitle),
    file: normalizeDiagnosticsString(args?.file),
    testIndex,
    ts: new Date().toISOString(),
    elapsedSinceRunStartMs: Date.now() - state.runStartMs,
    metrics: {
      eventLoopLag: { lagMs },
      hostResources,
    },
  });
}

export async function noteZoteroPerformanceProbeTestStart(args?: {
  domain?: string;
  fullTitle?: string;
  file?: string;
}) {
  const state = getState();
  if (!state.enabled) {
    return;
  }
  state.testIndex += 1;
  state.currentMeta = {
    domain: normalizeDiagnosticsString(args?.domain) || "all",
    fullTitle: normalizeDiagnosticsString(args?.fullTitle),
    file: normalizeDiagnosticsString(args?.file),
    testIndex: state.testIndex,
  };
  await captureZoteroPerformanceSnapshot("test-start", {
    ...state.currentMeta,
  });
}

export async function flushZoteroPerformanceProbeDigest() {
  const state = getState();
  if (!state.enabled || state.flushed) {
    return state.outputPath;
  }
  state.flushed = true;
  const summary = buildSummary({
    snapshots: state.snapshots,
    spans: state.spans,
  });
  const suspicions = buildSuspicions(summary);
  const runtimePerformanceProfiles = snapshotAcpRuntimeProfiles();
  const capacityRecord = getCapacityState()?.record;
  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      outputPath: state.outputPath,
      snapshotCount: state.snapshots.length,
      spanCount: state.spans.length,
      runStartMs: state.runStartMs,
    },
    snapshots: state.snapshots,
    spans: state.spans,
    summary,
    suspicions,
    ...(runtimePerformanceProfiles ? { runtimePerformanceProfiles } : {}),
    ...(capacityRecord ? { piCapacity: capacityRecord } : {}),
  };
  const outputPath = state.outputPath;
  const directory = outputPath.replace(/[\\/][^\\/]+$/, "");
  if (directory) {
    await ensureDiagnosticsDirectory(directory);
  }
  await writeDiagnosticsText(outputPath, JSON.stringify(payload, null, 2));
  return outputPath;
}

export function resetZoteroPerformanceProbeDigestForTests() {
  resetTestPerformanceProbeHooksForTests();
  resetAcpRuntimePerformanceProfilerForTests();
  resetPiCapacityProbeForTests();
  const runtime = getRuntime();
  runtime[STATE_KEY] = createDefaultState();
  runtime[INSTALL_FLAG] = false;
}

export function getZoteroPerformanceProbeStateForTests() {
  const state = getState();
  return {
    enabled: state.enabled,
    installed: state.installed,
    testIndex: state.testIndex,
    snapshotCount: state.snapshots.length,
    spanCount: state.spans.length,
    outputPath: state.outputPath,
    flushed: state.flushed,
  };
}

export type PiCapacityPhase = "warmup" | "idle" | "mixed" | "settle";
export type PiCapacityPlatform = "linux" | "windows";

/** Accepted limits for a Pi mixed-load capacity run. */
export const PI_CAPACITY_LIMITS = {
  lagP95Ms: 100,
  lagMaxMs: 1_000,
  foregroundAdmissionMs: 1_000,
  peakRssDeltaBytes: 1024 * 1024 * 1024,
  settledRssDeltaBytes: 256 * 1024 * 1024,
} as const;

/** Minimum wall-clock each phase must hold, in milliseconds. */
export const PI_CAPACITY_PHASE_MIN_MS: Record<PiCapacityPhase, number> = {
  warmup: 60_000,
  idle: 60_000,
  mixed: 900_000,
  settle: 120_000,
};

export type PiCapacityMeasurements = {
  lag: { sampleCount: number; p95Ms: number; maxMs: number };
  rss: {
    supported: boolean;
    baselineBytes: number | null;
    peakBytes: number | null;
    settledBytes: number | null;
    peakDeltaBytes: number | null;
    settledDeltaBytes: number | null;
  };
  load: { dispatched: number; completed: number; unexplainedFailures: number };
  admission: {
    sampleCount: number;
    foregroundMaxMs: number;
    overCapacityAdmissions: number;
  };
  completeness: {
    expected: number;
    observed: number;
    missing: number;
    starved: boolean;
  };
};

/** One candidate-bound capacity measurement consumed by the acceptance summary. */
export type PiCapacityPerformanceRecord = {
  kind: "performance";
  probe: "pi-runtime-capacity";
  /** Exploration records select a capacity; only a final record certifies one. */
  stage: "exploration" | "final";
  target: { platform: PiCapacityPlatform; zoteroMajor: number };
  candidate: { commit: string; xpiSha256: string };
  capacity: { total: number; background: number };
  workload: {
    /** True only when the run issued a forced GC; the gate requires false. */
    forcedGc: boolean;
    mixedForeground: number;
    mixedBackground: number;
  };
  phases: Array<{ phase: PiCapacityPhase; durationMs: number }>;
  measurements: PiCapacityMeasurements;
  violations: string[];
  passed: boolean;
};

type PiCapacityProbeState = {
  running: boolean;
  stage: PiCapacityPerformanceRecord["stage"];
  capacity: number;
  backgroundCapacity: number;
  target: PiCapacityPerformanceRecord["target"];
  candidate: PiCapacityPerformanceRecord["candidate"];
  forcedGc: boolean;
  mixedForeground: number;
  mixedBackground: number;
  sampleIntervalMs: number;
  residentBytesReader: () => number | null;
  timer?: ReturnType<typeof setInterval>;
  expectedAt: number;
  lagByPhase: Record<PiCapacityPhase, number[]>;
  rssSamples: number[];
  rssObserved: boolean;
  currentPhase?: PiCapacityPhase;
  phaseStartedAt: Partial<Record<PiCapacityPhase, number>>;
  phases: Array<{ phase: PiCapacityPhase; durationMs: number }>;
  baselineBytes: number | null;
  dispatched: number;
  completed: number;
  unexplainedFailures: number;
  expectedEvents: number;
  observedEvents: number;
  foregroundWaitsMs: number[];
  overCapacityAdmissions: number;
  record?: PiCapacityPerformanceRecord;
};

function getCapacityState() {
  return getRuntime()[CAPACITY_STATE_KEY];
}

/**
 * Fast resident-set-size reader. Node-backed tests read the current process;
 * the real host supplies a platform reader and missing bytes stay missing.
 */
function defaultResidentBytesReader(): number | null {
  const proc = (
    globalThis as { process?: { memoryUsage?: () => { rss?: number } } }
  ).process;
  const rss = proc?.memoryUsage?.().rss;
  if (typeof rss === "number" && Number.isFinite(rss)) return rss;
  const components = (globalThis as any).Components;
  const memory = components?.classes?.[
    "@mozilla.org/memory-reporter-manager;1"
  ]?.getService(components.interfaces.nsIMemoryReporterManager);
  const resident = memory?.residentFast;
  return typeof resident === "number" && Number.isFinite(resident)
    ? resident
    : null;
}

function readResidentBytes(state: PiCapacityProbeState): number | null {
  try {
    const value = state.residentBytesReader();
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function samplePiCapacity(state: PiCapacityProbeState) {
  const now = Date.now();
  const lag = Math.max(0, now - state.expectedAt);
  state.expectedAt = now + state.sampleIntervalMs;
  if (state.currentPhase) state.lagByPhase[state.currentPhase].push(lag);
  const rss = readResidentBytes(state);
  if (rss !== null) {
    state.rssSamples.push(rss);
    state.rssObserved = true;
  }
}

function buildPiCapacityMeasurements(
  state: PiCapacityProbeState,
  settledBytes: number | null,
): PiCapacityMeasurements {
  const mixed = state.lagByPhase.mixed;
  const lagSamples =
    mixed.length > 0 ? mixed : Object.values(state.lagByPhase).flat();
  const peakBytes = state.rssSamples.length
    ? Math.max(...state.rssSamples)
    : null;
  const baselineBytes = state.baselineBytes;
  const delta = (value: number | null) =>
    value !== null && baselineBytes !== null
      ? Math.max(0, value - baselineBytes)
      : null;
  const expected = state.expectedEvents;
  const observed = state.observedEvents;
  return {
    lag: {
      sampleCount: lagSamples.length,
      p95Ms: percentile(lagSamples, 95),
      maxMs: lagSamples.length ? Math.max(...lagSamples) : 0,
    },
    rss: {
      supported: state.rssObserved && baselineBytes !== null,
      baselineBytes,
      peakBytes,
      settledBytes,
      peakDeltaBytes: delta(peakBytes),
      settledDeltaBytes: delta(settledBytes),
    },
    load: {
      dispatched: state.dispatched,
      completed: state.completed,
      unexplainedFailures: state.unexplainedFailures,
    },
    admission: {
      sampleCount: state.foregroundWaitsMs.length,
      foregroundMaxMs: state.foregroundWaitsMs.length
        ? Math.max(...state.foregroundWaitsMs)
        : 0,
      overCapacityAdmissions: state.overCapacityAdmissions,
    },
    completeness: {
      expected,
      observed,
      missing: Math.max(0, expected - observed),
      starved: expected > 0 && observed === 0,
    },
  };
}

/** Applies the accepted capacity limits and names every violated limit. */
export function evaluatePiCapacityMeasurements(
  measurements: PiCapacityMeasurements,
): { violations: string[]; passed: boolean } {
  const violations: string[] = [];
  if (measurements.lag.sampleCount === 0)
    violations.push("lag_observation_missing");
  if (measurements.lag.p95Ms > PI_CAPACITY_LIMITS.lagP95Ms)
    violations.push("lag_p95_exceeded");
  if (measurements.lag.maxMs > PI_CAPACITY_LIMITS.lagMaxMs)
    violations.push("lag_stall_exceeded");
  const { rss } = measurements;
  if (
    !rss.supported ||
    rss.peakDeltaBytes === null ||
    rss.settledDeltaBytes === null
  ) {
    violations.push("rss_observation_missing");
  } else {
    if (rss.peakDeltaBytes > PI_CAPACITY_LIMITS.peakRssDeltaBytes)
      violations.push("peak_rss_exceeded");
    if (rss.settledDeltaBytes > PI_CAPACITY_LIMITS.settledRssDeltaBytes)
      violations.push("settled_rss_exceeded");
  }
  if (measurements.completeness.missing > 0) violations.push("event_loss");
  if (measurements.completeness.starved) violations.push("starvation");
  if (measurements.load.unexplainedFailures > 0)
    violations.push("unexplained_failure");
  if (measurements.admission.overCapacityAdmissions > 0)
    violations.push("over_capacity_admission");
  if (
    measurements.admission.foregroundMaxMs >
    PI_CAPACITY_LIMITS.foregroundAdmissionMs
  )
    violations.push("foreground_admission_stalled");
  return { violations, passed: violations.length === 0 };
}

/** Starts continuous lag and resident-set sampling for a capacity run. */
export function beginPiCapacityProbe(args: {
  stage?: PiCapacityPerformanceRecord["stage"];
  capacity: number;
  backgroundCapacity: number;
  target: PiCapacityPerformanceRecord["target"];
  candidate: PiCapacityPerformanceRecord["candidate"];
  /** The run declares whether it issued a forced GC; the gate requires false. */
  forcedGc?: boolean;
  sampleIntervalMs?: number;
  residentBytesReader?: () => number | null;
}) {
  const previous = getCapacityState();
  if (previous?.timer) clearInterval(previous.timer);
  const sampleIntervalMs = Math.max(
    250,
    Math.min(args.sampleIntervalMs ?? 1_000, 5_000),
  );
  const state: PiCapacityProbeState = {
    running: true,
    stage: args.stage === "final" ? "final" : "exploration",
    capacity: args.capacity,
    backgroundCapacity: args.backgroundCapacity,
    target: args.target,
    candidate: args.candidate,
    forcedGc: args.forcedGc === true,
    mixedForeground: 0,
    mixedBackground: 0,
    sampleIntervalMs,
    residentBytesReader: args.residentBytesReader ?? defaultResidentBytesReader,
    expectedAt: Date.now() + sampleIntervalMs,
    lagByPhase: { warmup: [], idle: [], mixed: [], settle: [] },
    rssSamples: [],
    rssObserved: false,
    phaseStartedAt: {},
    phases: [],
    baselineBytes: null,
    dispatched: 0,
    completed: 0,
    unexplainedFailures: 0,
    expectedEvents: 0,
    observedEvents: 0,
    foregroundWaitsMs: [],
    overCapacityAdmissions: 0,
  };
  state.timer = setInterval(() => samplePiCapacity(state), sampleIntervalMs);
  (state.timer as unknown as { unref?: () => void }).unref?.();
  getRuntime()[CAPACITY_STATE_KEY] = state;
}

/** Closes the current phase and opens the next one. */
export function markPiCapacityPhase(phase: PiCapacityPhase) {
  const state = getCapacityState();
  if (!state?.running) return;
  samplePiCapacity(state);
  const now = Date.now();
  if (state.currentPhase) {
    state.phases.push({
      phase: state.currentPhase,
      durationMs: now - (state.phaseStartedAt[state.currentPhase] ?? now),
    });
  }
  state.currentPhase = phase;
  state.phaseStartedAt[phase] = now;
  if (phase === "mixed") state.baselineBytes = readResidentBytes(state);
}

export function notePiCapacityDispatch(count = 1) {
  const state = getCapacityState();
  if (state?.running) state.dispatched += count;
}

export function notePiCapacityCompletion(
  args: { completed?: number; unexplainedFailure?: boolean } = {},
) {
  const state = getCapacityState();
  if (!state?.running) return;
  state.completed += args.completed ?? 1;
  if (args.unexplainedFailure) state.unexplainedFailures += 1;
}

/** Loaded workload events: what the run issued versus what it observed. */
export function notePiCapacityCompleteness(args: {
  expected: number;
  observed: number;
}) {
  const state = getCapacityState();
  if (!state?.running) return;
  state.expectedEvents += Math.max(0, args.expected);
  state.observedEvents += Math.max(0, args.observed);
}

/** Records an admitted production turn by lane during the mixed phase. */
export function notePiCapacityLane(lane: "foreground" | "background") {
  const state = getCapacityState();
  if (!state?.running) return;
  if (lane === "foreground") state.mixedForeground += 1;
  else state.mixedBackground += 1;
}

/**
 * Foreground admission wait recorded only while a reserved slot was free.
 * `activeCount` comes from the lifecycle so over-cap admission is observable.
 */
export function notePiCapacityAdmission(args: {
  foregroundWaitMs?: number;
  activeCount: number;
}) {
  const state = getCapacityState();
  if (!state?.running) return;
  if (args.foregroundWaitMs !== undefined)
    state.foregroundWaitsMs.push(Math.max(0, args.foregroundWaitMs));
  if (args.activeCount > state.capacity) state.overCapacityAdmissions += 1;
}

/** Stops sampling and freezes one candidate-bound performance record. */
export function stopPiCapacityProbe(): PiCapacityPerformanceRecord | undefined {
  const state = getCapacityState();
  if (!state) return undefined;
  if (!state.running) return state.record;
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = undefined;
  }
  samplePiCapacity(state);
  const now = Date.now();
  if (state.currentPhase) {
    state.phases.push({
      phase: state.currentPhase,
      durationMs: now - (state.phaseStartedAt[state.currentPhase] ?? now),
    });
    state.currentPhase = undefined;
  }
  const measurements = buildPiCapacityMeasurements(
    state,
    readResidentBytes(state),
  );
  const verdict = evaluatePiCapacityMeasurements(measurements);
  state.running = false;
  state.record = {
    kind: "performance",
    probe: "pi-runtime-capacity",
    stage: state.stage,
    target: state.target,
    candidate: state.candidate,
    capacity: { total: state.capacity, background: state.backgroundCapacity },
    workload: {
      forcedGc: state.forcedGc,
      mixedForeground: state.mixedForeground,
      mixedBackground: state.mixedBackground,
    },
    phases: state.phases,
    measurements,
    violations: verdict.violations,
    passed: verdict.passed,
  };
  return state.record;
}

export function resetPiCapacityProbeForTests() {
  const state = getCapacityState();
  if (state?.timer) clearInterval(state.timer);
  delete getRuntime()[CAPACITY_STATE_KEY];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isCount(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isNullableBytes(value: unknown): value is number | null {
  return value === null || isNonNegativeNumber(value);
}

function isValidPiCapacityMeasurements(
  value: unknown,
): value is PiCapacityMeasurements {
  if (!isPlainRecord(value)) return false;
  const { lag, rss, load, admission, completeness } = value;
  return (
    isPlainRecord(lag) &&
    isCount(lag.sampleCount) &&
    isNonNegativeNumber(lag.p95Ms) &&
    isNonNegativeNumber(lag.maxMs) &&
    isPlainRecord(rss) &&
    typeof rss.supported === "boolean" &&
    isNullableBytes(rss.baselineBytes) &&
    isNullableBytes(rss.peakBytes) &&
    isNullableBytes(rss.settledBytes) &&
    isNullableBytes(rss.peakDeltaBytes) &&
    isNullableBytes(rss.settledDeltaBytes) &&
    isPlainRecord(load) &&
    isCount(load.dispatched) &&
    isCount(load.completed) &&
    isCount(load.unexplainedFailures) &&
    isPlainRecord(admission) &&
    isCount(admission.sampleCount) &&
    isNonNegativeNumber(admission.foregroundMaxMs) &&
    isCount(admission.overCapacityAdmissions) &&
    isPlainRecord(completeness) &&
    isCount(completeness.expected) &&
    isCount(completeness.observed) &&
    isCount(completeness.missing) &&
    typeof completeness.starved === "boolean"
  );
}

/**
 * Independent sanity of the observed counts. A fabricated completeness or
 * admission sample cannot exceed the work the run actually dispatched and
 * completed, and derived totals must match their inputs.
 */
function countsConsistent(m: PiCapacityMeasurements) {
  const { load, admission, completeness } = m;
  return (
    completeness.observed <= completeness.expected &&
    completeness.expected <= load.dispatched &&
    completeness.observed <= load.completed &&
    completeness.missing === completeness.expected - completeness.observed &&
    completeness.starved ===
      (completeness.expected > 0 && completeness.observed === 0) &&
    load.completed <= load.dispatched &&
    load.unexplainedFailures <= load.completed &&
    admission.sampleCount > 0 &&
    admission.sampleCount <= load.dispatched &&
    admission.overCapacityAdmissions <= admission.sampleCount
  );
}

function sameViolations(left: unknown, right: string[]) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  );
}

const PI_CAPACITY_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const PI_CAPACITY_DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const PI_CAPACITY_PHASE_ORDER: PiCapacityPhase[] = [
  "warmup",
  "idle",
  "mixed",
  "settle",
];

function isPiCapacityIdentity(candidate: Record<string, unknown>) {
  return (
    typeof candidate.commit === "string" &&
    PI_CAPACITY_COMMIT_PATTERN.test(candidate.commit) &&
    typeof candidate.xpiSha256 === "string" &&
    PI_CAPACITY_DIGEST_PATTERN.test(candidate.xpiSha256)
  );
}

function isPiCapacityTarget(target: Record<string, unknown>) {
  return (
    (target.platform === "linux" || target.platform === "windows") &&
    target.zoteroMajor === 10
  );
}

function isPiCapacityCapacity(binding: Record<string, unknown>) {
  return (
    isFiniteNumber(binding.total) &&
    (PI_RUNTIME_CAPACITY_OPTIONS as readonly number[]).includes(
      binding.total,
    ) &&
    binding.background === binding.total - PI_RUNTIME_FOREGROUND_RESERVE
  );
}

function isPiCapacityWorkload(workload: unknown) {
  return (
    isPlainRecord(workload) &&
    workload.forcedGc === false &&
    isFiniteNumber(workload.mixedForeground) &&
    workload.mixedForeground > 0 &&
    isFiniteNumber(workload.mixedBackground) &&
    workload.mixedBackground > 0
  );
}

function isPiCapacityPhases(phases: unknown) {
  return (
    Array.isArray(phases) &&
    phases.length === PI_CAPACITY_PHASE_ORDER.length &&
    PI_CAPACITY_PHASE_ORDER.every((phase, index) => {
      const entry = phases[index];
      return (
        isPlainRecord(entry) &&
        entry.phase === phase &&
        isFiniteNumber(entry.durationMs) &&
        entry.durationMs >= PI_CAPACITY_PHASE_MIN_MS[phase]
      );
    })
  );
}

/**
 * Re-derives the verdict from measurements so the acceptance summary never
 * trusts a written `passed` value or an unrecognized record shape.
 */
export function validatePiCapacityPerformanceRecord(
  value: unknown,
):
  | { valid: true; record: PiCapacityPerformanceRecord }
  | { valid: false; reason: string } {
  if (
    !isPlainRecord(value) ||
    value.kind !== "performance" ||
    value.probe !== "pi-runtime-capacity"
  ) {
    return { valid: false, reason: "not_pi_capacity_performance_record" };
  }
  if (value.stage !== "exploration" && value.stage !== "final") {
    return { valid: false, reason: "stage_invalid" };
  }
  if (!isPlainRecord(value.target) || !isPiCapacityTarget(value.target)) {
    return { valid: false, reason: "target_invalid" };
  }
  if (
    !isPlainRecord(value.candidate) ||
    !isPiCapacityIdentity(value.candidate)
  ) {
    return { valid: false, reason: "identity_incomplete" };
  }
  if (!isPlainRecord(value.capacity) || !isPiCapacityCapacity(value.capacity)) {
    return { valid: false, reason: "capacity_invalid" };
  }
  if (!isPiCapacityWorkload(value.workload)) {
    return { valid: false, reason: "workload_invalid" };
  }
  if (!isPiCapacityPhases(value.phases)) {
    return { valid: false, reason: "phases_incomplete" };
  }
  if (!isValidPiCapacityMeasurements(value.measurements)) {
    return { valid: false, reason: "measurements_invalid" };
  }
  if (
    value.measurements.lag.sampleCount <= 0 ||
    value.measurements.admission.sampleCount <= 0 ||
    value.measurements.load.dispatched <= 0 ||
    !value.measurements.rss.supported
  ) {
    return { valid: false, reason: "measurements_insufficient" };
  }
  if (!countsConsistent(value.measurements)) {
    return { valid: false, reason: "counts_inconsistent" };
  }
  const record = value as unknown as PiCapacityPerformanceRecord;
  const verdict = evaluatePiCapacityMeasurements(record.measurements);
  if (
    record.passed !== verdict.passed ||
    !sameViolations(record.violations, verdict.violations)
  ) {
    return { valid: false, reason: "verdict_not_derived" };
  }
  return { valid: true, record };
}

export const __performanceProbeTestOnly = {
  buildSummary,
  buildPiCapacityMeasurements,
};
