import { getSkillRunnerTaskReconcilerRuntimeForTests } from "../../src/modules/skillRunnerTaskReconciler";
import { getSkillRunnerSessionSyncRuntimeForTests } from "../../src/modules/skillRunnerSessionSyncManager";
import { getSkillRunnerRunDialogRuntimeForTests } from "../../src/modules/skillRunnerRunDialog";
import { getManagedLocalRuntimeLoopStateForTests } from "../../src/modules/skillRunnerLocalRuntimeManager";
import { getSkillRunnerBackendHealthRegistryRuntimeForTests } from "../../src/modules/skillRunnerBackendHealthRegistry";
import { getRuntimeLogManagerSnapshotForTests } from "../../src/modules/runtimeLogManager";
import { getTrackedZoteroTestObjectIdsForTests } from "./objectCleanupHarness";
import { getLeakProbeTempArtifactSnapshotForTests } from "../../src/modules/testLeakProbeTempArtifacts";
import {
  ensureDiagnosticsDirectory,
  normalizeDiagnosticsString,
  readDiagnosticsEnv,
  resolveDefaultTestDiagnosticsOutputPath,
  writeDiagnosticsText,
} from "./testDiagnosticsOutput";

export type LeakProbePhase =
  | "test-start"
  | "pre-cleanup"
  | "post-background-cleanup"
  | "post-object-cleanup"
  | "domain-end";

type LeakProbeSnapshot = {
  phase: LeakProbePhase;
  testIndex: number;
  domain: string;
  fullTitle: string;
  file: string;
  ts: string;
  elapsedSinceRunStartMs: number;
  metrics: Record<string, unknown>;
};

type LeakProbeMetricSeriesPoint = {
  testIndex: number;
  phase: LeakProbePhase;
  value: number;
};

type LeakProbeState = {
  enabled: boolean;
  installed: boolean;
  runStartMs: number;
  testIndex: number;
  snapshots: LeakProbeSnapshot[];
  outputPath: string;
  flushed: boolean;
};

const INSTALL_FLAG = "__zs_zotero_leak_probe_digest_installed__";
const STATE_KEY = "__zs_zotero_leak_probe_digest_state__";

type LeakProbeRuntime = typeof globalThis & {
  [INSTALL_FLAG]?: boolean;
  [STATE_KEY]?: LeakProbeState;
};

function getRuntime() {
  return globalThis as LeakProbeRuntime;
}

function parseFlag(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function isLeakProbeEnabled() {
  return parseFlag(readDiagnosticsEnv("ZOTERO_TEST_LEAK_PROBE"));
}

function resolveOutputPath() {
  return resolveDefaultTestDiagnosticsOutputPath({
    envName: "ZOTERO_TEST_LEAK_PROBE_OUT",
    prefix: "zotero-leak-probe",
  });
}

function createDefaultState(): LeakProbeState {
  return {
    enabled: isLeakProbeEnabled(),
    installed: false,
    runStartMs: Date.now(),
    testIndex: 0,
    snapshots: [],
    outputPath: resolveOutputPath(),
    flushed: false,
  };
}

function getState() {
  const runtime = getRuntime();
  if (!runtime[STATE_KEY]) {
    runtime[STATE_KEY] = createDefaultState();
  }
  return runtime[STATE_KEY] as LeakProbeState;
}

function flattenMetrics(
  value: unknown,
  prefix = "",
  target: Record<string, number> = {},
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    target[prefix] = value;
    return target;
  }
  if (typeof value === "boolean") {
    target[prefix] = value ? 1 : 0;
    return target;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return target;
  }
  for (const [key, child] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenMetrics(child, nextPrefix, target);
  }
  return target;
}

function buildLeakProbeMetrics() {
  const objectCleanup = getTrackedZoteroTestObjectIdsForTests();
  const localRuntime = getManagedLocalRuntimeLoopStateForTests();
  return {
    reconciler: getSkillRunnerTaskReconcilerRuntimeForTests(),
    sessionSync: getSkillRunnerSessionSyncRuntimeForTests(),
    runDialog: getSkillRunnerRunDialogRuntimeForTests(),
    localRuntime,
    backendHealth: getSkillRunnerBackendHealthRegistryRuntimeForTests(),
    runtimeLogs: getRuntimeLogManagerSnapshotForTests(),
    objectCleanup: {
      trackedItemCount: objectCleanup.itemIds.length,
      trackedCollectionCount: objectCleanup.collectionIds.length,
    },
    tempArtifacts: getLeakProbeTempArtifactSnapshotForTests(),
  };
}

function collectMetricSeries(snapshots: LeakProbeSnapshot[]) {
  const series = new Map<string, LeakProbeMetricSeriesPoint[]>();
  for (const snapshot of snapshots) {
    const flattened = flattenMetrics(snapshot.metrics);
    for (const [metric, value] of Object.entries(flattened)) {
      const points = series.get(metric) || [];
      points.push({
        testIndex: snapshot.testIndex,
        phase: snapshot.phase,
        value,
      });
      series.set(metric, points);
    }
  }
  return series;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildSummary(snapshots: LeakProbeSnapshot[]) {
  const phaseCounts: Record<string, number> = {};
  for (const snapshot of snapshots) {
    phaseCounts[snapshot.phase] = (phaseCounts[snapshot.phase] || 0) + 1;
  }
  const postCleanupSnapshots = snapshots.filter(
    (snapshot) => snapshot.phase === "post-object-cleanup",
  );
  const series = collectMetricSeries(postCleanupSnapshots);
  const postCleanupResiduals: Array<{
    metric: string;
    residualCount: number;
    maxValue: number;
    lastValue: number;
  }> = [];
  const monotonicGrowthSignals: Array<{
    metric: string;
    increasingSteps: number;
    totalSteps: number;
    delta: number;
    headAvg: number;
    tailAvg: number;
  }> = [];
  const tailVsHeadComparison: Array<{
    metric: string;
    headAvg: number;
    tailAvg: number;
    delta: number;
    ratio: number | null;
  }> = [];
  const topGrowthWindows: Array<{
    metric: string;
    fromTestIndex: number;
    toTestIndex: number;
    delta: number;
    fromValue: number;
    toValue: number;
  }> = [];

  for (const [metric, points] of series.entries()) {
    if (points.length === 0) {
      continue;
    }
    const values = points.map((point) => point.value);
    const lastValue = values[values.length - 1];
    const maxValue = Math.max(...values);
    const residualCount = values.filter((value) => value > 0).length;
    if (residualCount > 0) {
      postCleanupResiduals.push({
        metric,
        residualCount,
        maxValue,
        lastValue,
      });
    }
    let increasingSteps = 0;
    for (let index = 1; index < values.length; index += 1) {
      if (values[index] > values[index - 1]) {
        increasingSteps += 1;
        topGrowthWindows.push({
          metric,
          fromTestIndex: points[index - 1].testIndex,
          toTestIndex: points[index].testIndex,
          delta: values[index] - values[index - 1],
          fromValue: values[index - 1],
          toValue: values[index],
        });
      }
    }
    const headSize = Math.max(1, Math.floor(values.length * 0.2));
    const tailSize = Math.max(1, Math.floor(values.length * 0.2));
    const headAvg = average(values.slice(0, headSize));
    const tailAvg = average(values.slice(values.length - tailSize));
    const delta = tailAvg - headAvg;
    const ratio = headAvg > 0 ? tailAvg / headAvg : tailAvg > 0 ? null : 1;
    tailVsHeadComparison.push({
      metric,
      headAvg,
      tailAvg,
      delta,
      ratio,
    });
    if (increasingSteps > 0 || delta > 0) {
      monotonicGrowthSignals.push({
        metric,
        increasingSteps,
        totalSteps: Math.max(0, values.length - 1),
        delta,
        headAvg,
        tailAvg,
      });
    }
  }

  const suspectRank = monotonicGrowthSignals
    .map((signal) => {
      const residual = postCleanupResiduals.find(
        (entry) => entry.metric === signal.metric,
      );
      const ratio =
        signal.headAvg > 0
          ? signal.tailAvg / signal.headAvg
          : signal.tailAvg > 0
            ? 10
            : 1;
      const score =
        (residual?.residualCount || 0) * 5 +
        signal.increasingSteps * 2 +
        Math.max(0, signal.delta) +
        Math.max(0, ratio - 1) * 3;
      return {
        metric: signal.metric,
        score,
        residualCount: residual?.residualCount || 0,
        increasingSteps: signal.increasingSteps,
        delta: signal.delta,
        headAvg: signal.headAvg,
        tailAvg: signal.tailAvg,
      };
    })
    .sort((left, right) => right.score - left.score);

  return {
    snapshotCount: snapshots.length,
    phaseCounts,
    postCleanupResiduals: postCleanupResiduals.sort(
      (left, right) => right.residualCount - left.residualCount,
    ),
    monotonicGrowthSignals: monotonicGrowthSignals.sort(
      (left, right) => right.delta - left.delta,
    ),
    topGrowthWindows: topGrowthWindows
      .sort((left, right) => right.delta - left.delta)
      .slice(0, 20),
    tailVsHeadComparison: tailVsHeadComparison.sort(
      (left, right) => right.delta - left.delta,
    ),
    suspectRank: suspectRank.slice(0, 20),
  };
}

function buildSuspicions(summary: ReturnType<typeof buildSummary>) {
  const suspicions: Array<Record<string, unknown>> = [];
  for (const entry of summary.suspectRank) {
    if (entry.score <= 0) {
      continue;
    }
    suspicions.push({
      metric: entry.metric,
      score: entry.score,
      reason: [
        entry.residualCount > 0 ? "post-cleanup residual" : "",
        entry.increasingSteps > 0 ? "monotonic growth" : "",
        entry.delta > 0 ? "tail heavier than head" : "",
      ].filter(Boolean),
      residualCount: entry.residualCount,
      increasingSteps: entry.increasingSteps,
      headAvg: entry.headAvg,
      tailAvg: entry.tailAvg,
    });
  }
  return suspicions;
}

export function installZoteroLeakProbeDigest() {
  const runtime = getRuntime();
  if (runtime[INSTALL_FLAG]) {
    return;
  }
  runtime[INSTALL_FLAG] = true;
  const state = getState();
  state.installed = true;
}

export function captureZoteroLeakProbeSnapshot(
  phase: LeakProbePhase,
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
  const testIndex =
    typeof args?.testIndex === "number" && Number.isFinite(args.testIndex)
      ? args.testIndex
      : state.testIndex;
  state.snapshots.push({
    phase,
    testIndex,
    domain: normalizeDiagnosticsString(args?.domain) || "all",
    fullTitle: normalizeDiagnosticsString(args?.fullTitle),
    file: normalizeDiagnosticsString(args?.file),
    ts: new Date().toISOString(),
    elapsedSinceRunStartMs: Date.now() - state.runStartMs,
    metrics: buildLeakProbeMetrics(),
  });
}

export function noteZoteroLeakProbeTestStart(args?: {
  domain?: string;
  fullTitle?: string;
  file?: string;
}) {
  const state = getState();
  if (!state.enabled) {
    return;
  }
  state.testIndex += 1;
  captureZoteroLeakProbeSnapshot("test-start", {
    ...args,
    testIndex: state.testIndex,
  });
}

export async function flushZoteroLeakProbeDigest() {
  const state = getState();
  if (!state.enabled || state.flushed) {
    return state.outputPath;
  }
  state.flushed = true;
  const summary = buildSummary(state.snapshots);
  const suspicions = buildSuspicions(summary);
  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      outputPath: state.outputPath,
      snapshotCount: state.snapshots.length,
      runStartMs: state.runStartMs,
    },
    snapshots: state.snapshots,
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

export function resetZoteroLeakProbeDigestForTests() {
  const runtime = getRuntime();
  runtime[STATE_KEY] = createDefaultState();
  runtime[INSTALL_FLAG] = false;
}

export function getZoteroLeakProbeStateForTests() {
  const state = getState();
  return {
    enabled: state.enabled,
    installed: state.installed,
    testIndex: state.testIndex,
    snapshotCount: state.snapshots.length,
    outputPath: state.outputPath,
    flushed: state.flushed,
  };
}

export const __leakProbeDigestTestOnly = {
  buildSummary,
  buildSuspicions,
  flattenMetrics,
};
