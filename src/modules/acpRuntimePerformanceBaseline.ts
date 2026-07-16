import {
  ACP_RUNTIME_PERFORMANCE_PROFILE_SCHEMA,
  type AcpRuntimeMetricLabels,
  type AcpRuntimeMetricName,
  type AcpRuntimeMetricSnapshot,
  type AcpRuntimePerformanceSnapshot,
  type AcpRuntimeProfileSnapshot,
} from "./acpRuntimePerformanceProfiler";

export const ACP_RUNTIME_GOVERNANCE_BASELINE_SCHEMA =
  "zotero-agents.acp-runtime-governance-baseline.v1" as const;

export type AcpRuntimeRiskGroupKey = "R1" | "R2" | "R3";
export type AcpRuntimeCaptureCompletion = "complete" | "incomplete";
export type AcpRuntimeCaptureWarning = {
  code: "active_profiles";
  count: number;
};

export type AcpRuntimeCaptureMetadata = {
  scenarioId: string;
  surfaceState: "closed" | "open-inactive" | "acp-active";
  runIndex: number;
  warmup: boolean;
};

export type AcpRuntimeCaptureEnvironment = {
  pluginVersion: string;
  zoteroVersion: string;
  zoteroMajor: 7 | 9 | "unknown";
  platform: string;
};

export type AcpRuntimeGovernanceMetricSummary = {
  name: AcpRuntimeMetricName;
  labels: AcpRuntimeMetricLabels;
  counter?: number;
  bytes?: number;
  gaugeCurrent?: number;
  gaugeMax?: number;
  durationCount?: number;
  durationTotalMs?: number;
  durationMaxMs?: number;
};

export type AcpRuntimeGovernanceGroupSummary = {
  key: AcpRuntimeRiskGroupKey;
  label: string;
  counters: number;
  bytes: number;
  gauges: number;
  durations: number;
  metrics: readonly AcpRuntimeGovernanceMetricSummary[];
};

export type AcpRuntimeGovernanceBaselineRecord = {
  schema: typeof ACP_RUNTIME_GOVERNANCE_BASELINE_SCHEMA;
  capture: {
    kind: "automated" | "zotero-host";
    phase: "before-governance" | "after-governance";
    measurement: "mechanism" | "real-host";
    scenarioId: string;
    surfaceState: AcpRuntimeCaptureMetadata["surfaceState"];
    runIndex: number;
    warmup: boolean;
    completion: AcpRuntimeCaptureCompletion;
  };
  environment: AcpRuntimeCaptureEnvironment;
  warnings: readonly AcpRuntimeCaptureWarning[];
  summary: { groups: readonly AcpRuntimeGovernanceGroupSummary[] };
  profilerSnapshot?: AcpRuntimePerformanceSnapshot;
};

export type BuildAcpRuntimeGovernanceBaselineRecordOptions = {
  kind: "automated" | "zotero-host";
  phase: "before-governance" | "after-governance";
  metadata: AcpRuntimeCaptureMetadata;
  environment: AcpRuntimeCaptureEnvironment;
  snapshot: AcpRuntimePerformanceSnapshot;
  completion: AcpRuntimeCaptureCompletion;
  warnings?: readonly AcpRuntimeCaptureWarning[];
};

export const ACP_RUNTIME_METRIC_RISK_GROUP: Readonly<
  Record<AcpRuntimeMetricName, AcpRuntimeRiskGroupKey>
> = {
  jsonrpc_message: "R1",
  adapter_trace: "R1",
  adapter_diagnostic: "R1",
  session_update: "R1",
  semantic_event: "R1",
  semantic_event_bytes: "R1",
  semantic_event_duration: "R1",
  diagnostic_run_upsert: "R1",
  run_persist: "R1",
  run_persist_bytes: "R1",
  run_persist_duration: "R1",
  state_store_write: "R1",
  state_store_write_duration: "R1",
  change_requested: "R1",
  change_emitted: "R1",
  change_coalesced: "R1",
  host_input_bytes: "R2",
  host_input_fragment: "R2",
  host_input_unavailable: "R2",
  host_input_duration: "R2",
  host_request_inflight: "R2",
  host_request_duration: "R2",
  host_response_bytes: "R2",
  panel_prepare: "R3",
  panel_requested: "R3",
  panel_dropped_before_build: "R3",
  panel_prepare_duration: "R3",
  panel_materialization: "R3",
  transcript_page_read: "R3",
  transcript_page_scan_items: "R3",
  transcript_page_read_duration: "R3",
  panel_signature: "R3",
  panel_signature_skip: "R3",
  panel_signature_bytes: "R3",
  panel_signature_duration: "R3",
  panel_post: "R3",
  panel_post_bytes: "R3",
  panel_post_duration: "R3",
  panel_shell_forward: "R3",
  panel_child_apply: "R3",
  panel_render_ack: "R3",
  panel_render_duration: "R3",
  panel_render_inserted_rows: "R3",
  panel_render_updated_rows: "R3",
  panel_render_removed_rows: "R3",
  panel_render_measured_rows: "R3",
  transport_queue_entries: "R1",
  transport_queue_bytes: "R1",
  transport_message_queue_entries: "R1",
  assistant_accumulator_chunks: "R1",
  assistant_accumulator_bytes: "R1",
  buffered_write_batch: "R1",
  buffered_write_bytes: "R1",
  buffered_write_duration: "R1",
  runtime_log_persist: "R1",
  runtime_log_persist_bytes: "R1",
  runtime_log_persist_duration: "R1",
  event_loop_drift: "R1",
  dropped_profile_start: "R1",
  dropped_metric_series: "R1",
};

const BYTE_METRICS = new Set<AcpRuntimeMetricName>([
  "run_persist_bytes",
  "host_input_bytes",
  "host_response_bytes",
  "panel_signature_bytes",
  "panel_post_bytes",
  "transport_queue_bytes",
  "assistant_accumulator_bytes",
  "buffered_write_bytes",
  "runtime_log_persist_bytes",
]);

const GROUP_LABELS: Readonly<Record<AcpRuntimeRiskGroupKey, string>> = {
  R1: "ACP event and persistence",
  R2: "Host Bridge request handling",
  R3: "Assistant Workspace publication",
};

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boundedInteger(value: unknown, minimum: number, maximum: number) {
  return Math.min(
    maximum,
    Math.max(minimum, Math.trunc(finiteNumber(value, minimum))),
  );
}

function sanitizeToken(
  value: unknown,
  maximumLength: number,
  fallback: string,
) {
  const normalized = String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, maximumLength);
  return normalized || fallback;
}

export function sanitizeAcpRuntimeCaptureMetadata(
  metadata: AcpRuntimeCaptureMetadata,
): AcpRuntimeCaptureMetadata {
  const surfaceState = ["closed", "open-inactive", "acp-active"].includes(
    metadata.surfaceState,
  )
    ? metadata.surfaceState
    : "closed";
  return {
    scenarioId: sanitizeToken(metadata.scenarioId, 64, "capture"),
    surfaceState,
    runIndex: boundedInteger(metadata.runIndex, 0, 9999),
    warmup: metadata.warmup === true,
  };
}

function sanitizeEnvironment(
  environment: AcpRuntimeCaptureEnvironment,
): AcpRuntimeCaptureEnvironment {
  return {
    pluginVersion: sanitizeToken(environment.pluginVersion, 32, "unknown"),
    zoteroVersion: sanitizeToken(environment.zoteroVersion, 32, "unknown"),
    zoteroMajor:
      environment.zoteroMajor === 7 || environment.zoteroMajor === 9
        ? environment.zoteroMajor
        : "unknown",
    platform: sanitizeToken(environment.platform, 24, "unknown"),
  };
}

function sanitizeLabels(labels: AcpRuntimeMetricLabels) {
  const result: AcpRuntimeMetricLabels = {};
  for (const key of [
    "updateClass",
    "changeKind",
    "surfaceState",
    "operationClass",
    "persistenceChannel",
    "semanticKind",
    "disposition",
    "publicationKind",
    "publicationCausality",
    "publicationPhase",
  ] as const) {
    const value = labels[key];
    if (value) {
      (result as Record<string, string>)[key] = value;
    }
  }
  return result;
}

function sanitizeMetric(metric: AcpRuntimeMetricSnapshot) {
  return {
    name: metric.name,
    labels: sanitizeLabels(metric.labels),
    ...(metric.counter
      ? { counter: { total: finiteNumber(metric.counter.total) } }
      : {}),
    ...(metric.duration
      ? {
          duration: {
            count: boundedInteger(
              metric.duration.count,
              0,
              Number.MAX_SAFE_INTEGER,
            ),
            totalMs: Math.max(0, finiteNumber(metric.duration.totalMs)),
            maxMs: Math.max(0, finiteNumber(metric.duration.maxMs)),
            buckets: metric.duration.buckets.map((value) =>
              boundedInteger(value, 0, Number.MAX_SAFE_INTEGER),
            ),
          },
        }
      : {}),
    ...(metric.gauge
      ? {
          gauge: {
            current: finiteNumber(metric.gauge.current),
            max: finiteNumber(metric.gauge.max),
          },
        }
      : {}),
  } satisfies AcpRuntimeMetricSnapshot;
}

function sanitizeProfile(
  profile: AcpRuntimeProfileSnapshot,
): AcpRuntimeProfileSnapshot {
  return {
    requestId: sanitizeToken(profile.requestId, 96, ""),
    displayMode: profile.displayMode,
    transport: profile.transport,
    zoteroMajor: profile.zoteroMajor,
    startedAtMs: finiteNumber(profile.startedAtMs),
    ...(typeof profile.finishedAtMs === "number"
      ? { finishedAtMs: finiteNumber(profile.finishedAtMs) }
      : {}),
    metrics: profile.metrics.map(sanitizeMetric),
  };
}

function sanitizeSnapshot(
  snapshot: AcpRuntimePerformanceSnapshot,
): AcpRuntimePerformanceSnapshot {
  return {
    schema: ACP_RUNTIME_PERFORMANCE_PROFILE_SCHEMA,
    generatedAtMs: finiteNumber(snapshot.generatedAtMs),
    limits: {
      activeProfiles: boundedInteger(snapshot.limits.activeProfiles, 0, 1024),
      completedProfiles: boundedInteger(
        snapshot.limits.completedProfiles,
        0,
        1024,
      ),
      metricSeriesPerProfile: boundedInteger(
        snapshot.limits.metricSeriesPerProfile,
        0,
        4096,
      ),
      durationBucketsMs: snapshot.limits.durationBucketsMs,
    },
    global: sanitizeProfile(snapshot.global),
    active: snapshot.active.map(sanitizeProfile),
    completed: snapshot.completed.map(sanitizeProfile),
  };
}

function metricKey(metric: Pick<AcpRuntimeMetricSnapshot, "name" | "labels">) {
  return `${metric.name}|${Object.entries(sanitizeLabels(metric.labels))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("|")}`;
}

export function summarizeAcpRuntimePerformanceSnapshot(
  snapshot: AcpRuntimePerformanceSnapshot,
) {
  const metricsByGroup = new Map<
    AcpRuntimeRiskGroupKey,
    Map<string, AcpRuntimeGovernanceMetricSummary>
  >((["R1", "R2", "R3"] as const).map((key) => [key, new Map()]));
  const profiles = [snapshot.global, ...snapshot.active, ...snapshot.completed];
  for (const profile of profiles) {
    for (const metric of profile.metrics) {
      const group = ACP_RUNTIME_METRIC_RISK_GROUP[metric.name];
      const target = metricsByGroup.get(group)!;
      const key = metricKey(metric);
      const existing = target.get(key) || {
        name: metric.name,
        labels: sanitizeLabels(metric.labels),
      };
      if (metric.counter) {
        const field = BYTE_METRICS.has(metric.name) ? "bytes" : "counter";
        existing[field] = (existing[field] || 0) + metric.counter.total;
      }
      if (metric.duration) {
        existing.durationCount =
          (existing.durationCount || 0) + metric.duration.count;
        existing.durationTotalMs =
          (existing.durationTotalMs || 0) + metric.duration.totalMs;
        existing.durationMaxMs = Math.max(
          existing.durationMaxMs || 0,
          metric.duration.maxMs,
        );
      }
      if (metric.gauge) {
        existing.gaugeCurrent = metric.gauge.current;
        existing.gaugeMax = Math.max(
          existing.gaugeMax || Number.NEGATIVE_INFINITY,
          metric.gauge.max,
        );
      }
      target.set(key, existing);
    }
  }

  return {
    groups: (["R1", "R2", "R3"] as const).map((key) => {
      const metrics = Array.from(metricsByGroup.get(key)!.values()).sort(
        (left, right) => metricKey(left).localeCompare(metricKey(right)),
      );
      return {
        key,
        label: GROUP_LABELS[key],
        counters: metrics.reduce(
          (total, metric) => total + (metric.counter || 0),
          0,
        ),
        bytes: metrics.reduce(
          (total, metric) => total + (metric.bytes || 0),
          0,
        ),
        gauges: metrics.reduce(
          (maximum, metric) => Math.max(maximum, metric.gaugeMax || 0),
          0,
        ),
        durations: metrics.reduce(
          (total, metric) => total + (metric.durationCount || 0),
          0,
        ),
        metrics,
      };
    }),
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

export function buildAcpRuntimeGovernanceBaselineRecord(
  options: BuildAcpRuntimeGovernanceBaselineRecordOptions,
): AcpRuntimeGovernanceBaselineRecord {
  const metadata = sanitizeAcpRuntimeCaptureMetadata(options.metadata);
  const snapshot = sanitizeSnapshot(options.snapshot);
  const warnings = (options.warnings || [])
    .filter((warning) => warning.code === "active_profiles")
    .map((warning) => ({
      code: "active_profiles" as const,
      count: boundedInteger(warning.count, 0, 1024),
    }));
  return deepFreeze({
    schema: ACP_RUNTIME_GOVERNANCE_BASELINE_SCHEMA,
    capture: {
      kind: options.kind,
      phase: options.phase,
      measurement: options.kind === "automated" ? "mechanism" : "real-host",
      ...metadata,
      completion: options.completion,
    },
    environment: sanitizeEnvironment(options.environment),
    warnings,
    summary: summarizeAcpRuntimePerformanceSnapshot(snapshot),
    ...(options.kind === "zotero-host" ? { profilerSnapshot: snapshot } : {}),
  });
}
