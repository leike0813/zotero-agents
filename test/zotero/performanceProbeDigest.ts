import {
  installTestPerformanceProbeHooksForTests,
  resetTestPerformanceProbeHooksForTests,
} from "../../src/modules/testPerformanceProbeBridge";
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

type PerformanceRuntime = typeof globalThis & {
  [INSTALL_FLAG]?: boolean;
  [STATE_KEY]?: PerformanceProbeState;
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
  field?: string;
  operator?: string;
  value?: string;
}) {
  if (!isRealZoteroRuntime() || typeof Zotero.Search !== "function") {
    return null;
  }
  try {
    const search = new Zotero.Search();
    search.libraryID = Zotero.Libraries.userLibraryID;
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

export const __performanceProbeTestOnly = {
  buildSummary,
};
