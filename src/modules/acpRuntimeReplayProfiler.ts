import { joinPath } from "../utils/path";
import {
  classifyAcpTranscriptSessionUpdate,
  type AcpTranscriptUpdateBoundary,
} from "./acpTranscriptBoundary";
import {
  acquireAcpRuntimeDiagnosticsMode,
  releaseAcpRuntimeDiagnosticsMode,
} from "./acpRuntimeDiagnosticsMode";
import {
  ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
  createAcpRuntimeMonotonicClock,
  type AcpRuntimeSemanticTraceDocument,
  type AcpRuntimeSemanticTraceEvent,
  type AcpRuntimeTraceOwner,
  type AcpRuntimeTraceSourceKind,
} from "./acpRuntimeSemanticTrace";
import { isAcpRuntimeReplayProfilerAvailable } from "./debugMode";
import {
  ACP_RUNTIME_REPLAY_PHASE_SLUG_MAX_LENGTH,
  buildAcpRuntimeReplayArtifactStem,
  createAcpRuntimeReplayOwnerIdentity,
  normalizeAcpRuntimeReplayPhase,
  slugAcpRuntimeReplayArtifactSegment,
} from "./acpRuntimeReplayIdentity";
import type { AcpRuntimeReplayLogicalTimePort } from "./acpRuntimeReplayLogicalTime";
import type {
  AcpRuntimeMetricName,
  AcpRuntimeProfileSnapshot,
} from "./acpRuntimePerformanceProfiler";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  moveRuntimePath,
  removeRuntimePath,
  writeRuntimeTextFile,
} from "./runtimePersistence";

export const ACP_RUNTIME_REPLAY_MATRIX_SCHEMA =
  "zotero-agents.acp-runtime-replay-matrix.v2" as const;
export const ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1 =
  "ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1" as const;

export type AcpRuntimeReplayCadence = "recorded" | "logical" | "burst";
export type AcpRuntimeReplaySurface =
  | "closed"
  | "open-inactive"
  | "target-active";
export type AcpRuntimeReplayRunRole = "warm-up" | "formal";

export type AcpRuntimeReplayApplyContext = {
  event: AcpRuntimeSemanticTraceEvent;
  owner: AcpRuntimeTraceOwner;
  transcriptBoundary?: AcpTranscriptUpdateBoundary;
};

export type AcpRuntimeReplayTarget = {
  sourceKind: AcpRuntimeTraceSourceKind;
  syntheticRootId: string;
  activate: () => Promise<void>;
  apply: (
    context: AcpRuntimeReplayApplyContext,
  ) => Promise<
    "applied" | "projected" | "consumed-noop" | "skipped" | "unknown"
  >;
  drain: () => Promise<{ ok: boolean; detail?: string }>;
  cleanup: () => Promise<void>;
};

export type AcpRuntimeReplayResult = {
  completion: "complete" | "incomplete";
  projectedEvents: number;
  consumedNoopEvents: number;
  appliedEvents: number;
  skippedEvents: number;
  unknownEvents: number;
  appliedBytes: number;
  projectedBytes: number;
  consumedNoopBytes: number;
  eventKinds: Record<
    string,
    {
      projected: number;
      consumedNoop: number;
      skipped: number;
      unknown: number;
      bytes: number;
    }
  >;
  schedulerLagMs: number;
  drain: {
    ok: boolean;
    state: "ok" | "failed" | "not-run";
    detail?: string;
  };
  warnings: string[];
};

export type AcpRuntimeReplayCancellationSignal =
  import("../utils/wait").CancellationSignal;

export type AcpRuntimeReplayLogicalRunPort = AcpRuntimeReplayLogicalTimePort & {
  registerOwner: (owner: AcpRuntimeTraceOwner) => void;
};

export function parseAcpRuntimeReplayCadence(
  value: unknown,
  fallback: AcpRuntimeReplayCadence = "recorded",
): AcpRuntimeReplayCadence {
  if (typeof value === "undefined" || value === null || value === "") {
    return fallback;
  }
  if (value === "recorded" || value === "logical" || value === "burst") {
    return value;
  }
  throw new Error(`Unsupported ACP replay cadence: ${String(value)}`);
}

type ReplayOptions = {
  trace: AcpRuntimeSemanticTraceDocument;
  target: AcpRuntimeReplayTarget;
  cadence: AcpRuntimeReplayCadence;
  logicalTime?: AcpRuntimeReplayLogicalRunPort;
  sleep?: (delayMs: number) => Promise<void>;
  now?: () => number;
  signal?: AcpRuntimeReplayCancellationSignal;
  onOwnerMapped?: (owner: AcpRuntimeTraceOwner) => void;
  onEventConsumed?: (args: {
    event: AcpRuntimeSemanticTraceEvent;
    disposition: "projected" | "consumed-noop" | "skipped" | "unknown";
    durationMs: number;
    bytes: number;
    transcriptBoundary?: AcpTranscriptUpdateBoundary;
  }) => void;
};

function payloadBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function eventOwnerKey(owner: AcpRuntimeTraceOwner) {
  return [
    owner.rootId,
    owner.conversationId,
    owner.workflowId,
    owner.workflowRunId,
    owner.jobId,
    owner.stageId,
    owner.requestId,
    owner.sessionId,
    owner.turnId,
  ]
    .map((entry) => String(entry || ""))
    .join("\n");
}

function createOwnerMapper(syntheticRootId: string) {
  const identity = createAcpRuntimeReplayOwnerIdentity(syntheticRootId);
  const owners = new Map<string, AcpRuntimeTraceOwner>();
  let nonce = 0;
  let conversationNonce = 0;
  let requestNonce = 0;
  return (owner: AcpRuntimeTraceOwner) => {
    const key = eventOwnerKey(owner);
    const existing = owners.get(key);
    if (existing) return existing;
    nonce += 1;
    const prefix = `${syntheticRootId}-${nonce}`;
    if (owner.conversationId) conversationNonce += 1;
    if (owner.requestId) requestNonce += 1;
    const mapped: AcpRuntimeTraceOwner = {
      rootId: syntheticRootId,
      ...(owner.conversationId
        ? {
            conversationId:
              conversationNonce === 1
                ? identity.chat.conversationId
                : `${syntheticRootId}-${conversationNonce}-conversation`,
          }
        : {}),
      ...(owner.workflowId ? { workflowId: `${prefix}-workflow` } : {}),
      ...(owner.workflowRunId
        ? { workflowRunId: `${prefix}-workflow-run` }
        : {}),
      ...(owner.jobId ? { jobId: `${prefix}-job` } : {}),
      ...(owner.stageId ? { stageId: `${prefix}-stage` } : {}),
      ...(owner.requestId
        ? {
            requestId:
              requestNonce === 1
                ? identity.workflow.requestId
                : `${syntheticRootId}-${requestNonce}-request`,
          }
        : {}),
      ...(owner.sessionId
        ? {
            sessionId:
              conversationNonce === 1
                ? identity.chat.sessionId
                : `${syntheticRootId}-${conversationNonce}-session`,
          }
        : {}),
      ...(owner.turnId ? { turnId: `${prefix}-turn` } : {}),
    };
    owners.set(key, mapped);
    return mapped;
  };
}

function notificationBoundary(event: AcpRuntimeSemanticTraceEvent) {
  if (event.kind !== "session-notification") return undefined;
  const payload = event.payload as {
    update?: { sessionUpdate?: unknown };
  };
  return classifyAcpTranscriptSessionUpdate(payload?.update?.sessionUpdate);
}

async function waitForReplayGap(args: {
  delayMs: number;
  sleep: (delayMs: number) => Promise<void>;
  signal?: AcpRuntimeReplayCancellationSignal;
}) {
  if (args.signal?.aborted) return false;
  if (!args.signal) {
    await args.sleep(args.delayMs);
    return true;
  }
  let aborted = false;
  let onAbort: (() => void) | undefined;
  const abort = new Promise<void>((resolve) => {
    onAbort = () => {
      aborted = true;
      resolve();
    };
    args.signal?.addEventListener("abort", onAbort, { once: true });
  });
  try {
    await Promise.race([args.sleep(args.delayMs), abort]);
  } finally {
    if (onAbort) args.signal.removeEventListener("abort", onAbort);
  }
  return !aborted && !args.signal.aborted;
}

export async function replayAcpRuntimeSemanticTrace(
  options: ReplayOptions,
): Promise<AcpRuntimeReplayResult> {
  if (options.trace.footer.completion !== "complete") {
    throw new Error("Incomplete ACP semantic traces cannot be replayed");
  }
  if (options.trace.header.sourceKind !== options.target.sourceKind) {
    throw new Error("ACP semantic trace source does not match replay target");
  }
  const sleep =
    options.sleep ||
    ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const now = options.now || createAcpRuntimeMonotonicClock();
  const mapOwner = createOwnerMapper(options.target.syntheticRootId);
  const result: AcpRuntimeReplayResult = {
    completion: "complete",
    projectedEvents: 0,
    consumedNoopEvents: 0,
    appliedEvents: 0,
    skippedEvents: 0,
    unknownEvents: 0,
    appliedBytes: 0,
    projectedBytes: 0,
    consumedNoopBytes: 0,
    eventKinds: {},
    schedulerLagMs: 0,
    drain: { ok: false, state: "not-run", detail: "not-run" },
    warnings: [],
  };
  let previousOffset = 0;
  for (const event of options.trace.events) {
    if (options.signal?.aborted) {
      result.completion = "incomplete";
      result.warnings.push("replay-aborted");
      break;
    }
    const gap = Math.max(0, event.monotonicOffsetMs - previousOffset);
    if (options.cadence === "recorded" && gap > 0) {
      const waitStarted = now();
      const completed = await waitForReplayGap({
        delayMs: gap,
        sleep,
        signal: options.signal,
      });
      if (!completed) {
        result.completion = "incomplete";
        result.warnings.push("replay-aborted");
        break;
      }
      result.schedulerLagMs += Math.max(0, now() - waitStarted - gap);
    }
    previousOffset = event.monotonicOffsetMs;
    try {
      if (options.cadence === "logical") {
        if (!options.logicalTime) {
          throw new Error("Logical replay requires a logical-time port");
        }
        await options.logicalTime.advanceTo(event.monotonicOffsetMs);
      }
      const owner = mapOwner(event.owner);
      options.logicalTime?.registerOwner(owner);
      try {
        options.onOwnerMapped?.(owner);
      } catch {
        // Profiling attribution is observational and cannot fail replay.
      }
      const consumedStartedAt = now();
      const disposition = await options.target.apply({
        event,
        owner,
        transcriptBoundary: notificationBoundary(event),
      });
      if (options.cadence === "logical") {
        await options.logicalTime?.captureAt(event.monotonicOffsetMs);
      }
      const normalizedDisposition =
        disposition === "applied" ? "projected" : disposition;
      const bytes = payloadBytes(event.payload);
      const kindSummary = (result.eventKinds[event.kind] ||= {
        projected: 0,
        consumedNoop: 0,
        skipped: 0,
        unknown: 0,
        bytes: 0,
      });
      kindSummary.bytes += bytes;
      try {
        options.onEventConsumed?.({
          event,
          disposition: normalizedDisposition,
          durationMs: Math.max(0, now() - consumedStartedAt),
          bytes,
          transcriptBoundary: notificationBoundary(event),
        });
      } catch {
        // Profiling attribution is observational and cannot fail replay.
      }
      if (normalizedDisposition === "projected") {
        kindSummary.projected += 1;
        result.projectedEvents += 1;
        result.appliedEvents += 1;
        result.projectedBytes += bytes;
        result.appliedBytes += bytes;
      } else if (normalizedDisposition === "consumed-noop") {
        kindSummary.consumedNoop += 1;
        result.consumedNoopEvents += 1;
        result.consumedNoopBytes += bytes;
        result.appliedEvents += 1;
        result.appliedBytes += bytes;
      } else if (normalizedDisposition === "skipped") {
        kindSummary.skipped += 1;
        result.skippedEvents += 1;
      } else {
        kindSummary.unknown += 1;
        result.unknownEvents += 1;
        result.completion = "incomplete";
        result.warnings.push(`unknown-event:${event.seq}`);
      }
    } catch (error) {
      result.completion = "incomplete";
      result.warnings.push(
        `consumer-failed:${event.seq}:${error instanceof Error ? error.message : String(error)}`,
      );
      break;
    }
  }
  if (options.cadence === "logical" && options.logicalTime) {
    try {
      const released =
        await options.logicalTime.releaseToNative(previousOffset);
      result.warnings.push(...released.warnings);
    } catch (error) {
      result.completion = "incomplete";
      result.warnings.push(
        `logical-release-failed:${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  try {
    const drained = await options.target.drain();
    result.drain = {
      ...drained,
      state: drained.ok ? "ok" : "failed",
    };
  } catch (error) {
    result.drain = {
      ok: false,
      state: "failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (!result.drain.ok) {
    result.completion = "incomplete";
    result.warnings.push(`drain-failed:${result.drain.detail || "unknown"}`);
    if (options.cadence === "logical" && options.logicalTime) {
      const fallback = await options.logicalTime.flushWriteBearing();
      result.warnings.push(...fallback.warnings);
    }
  }
  return result;
}

export type AcpRuntimeR2InputPort = {
  consumeFragment: (args: {
    requestId: string;
    fragment: Uint8Array;
    final: boolean;
    profileRequestId?: string;
  }) => Promise<void | { responseBytes?: number }>;
};

export type AcpRuntimeR2WorkloadResult = {
  version: typeof ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1;
  requests: number;
  fragments: number;
  bytes: number;
  inputBytes: number;
  responseBytes: number;
  maxConcurrency: number;
};

function splitBytes(bytes: Uint8Array, count: number) {
  const fragments: Uint8Array[] = [];
  for (let index = 0; index < count; index += 1) {
    const start = Math.floor((bytes.byteLength * index) / count);
    const end = Math.floor((bytes.byteLength * (index + 1)) / count);
    fragments.push(bytes.slice(start, end));
  }
  return fragments;
}

export async function runAcpRuntimeR2SyntheticWorkloadV1(args: {
  port: AcpRuntimeR2InputPort;
  sleep?: (delayMs: number) => Promise<void>;
  profileRequestId?: string;
}) {
  const sleep =
    args.sleep ||
    ((delayMs: number) =>
      new Promise((resolve) => setTimeout(resolve, delayMs)));
  const encoder = new TextEncoder();
  let requests = 0;
  let fragments = 0;
  let bytes = 0;
  let responseBytes = 0;
  let active = 0;
  let maxConcurrency = 0;
  const runRequest = async (
    requestId: string,
    fragmentCount: number,
    gapMs: number,
  ) => {
    requests += 1;
    active += 1;
    maxConcurrency = Math.max(maxConcurrency, active);
    const requestBytes = encoder.encode(
      `${JSON.stringify({ jsonrpc: "2.0", id: requestId, method: "health" })}\n`,
    );
    const chunks = splitBytes(requestBytes, fragmentCount);
    for (let index = 0; index < chunks.length; index += 1) {
      if (index > 0 && gapMs > 0) await sleep(gapMs);
      const fragment = chunks[index];
      fragments += 1;
      bytes += fragment.byteLength;
      const consumed = await args.port.consumeFragment({
        requestId,
        fragment,
        final: index === chunks.length - 1,
        profileRequestId: args.profileRequestId,
      });
      responseBytes += consumed?.responseBytes || 0;
    }
    active -= 1;
  };
  await runRequest("r2-single", 1, 0);
  await runRequest("r2-slow", 16, 5);
  await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      runRequest(`r2-burst-${index + 1}`, 2, 0),
    ),
  );
  return {
    version: ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1,
    requests,
    fragments,
    bytes,
    inputBytes: bytes,
    responseBytes,
    maxConcurrency,
  } satisfies AcpRuntimeR2WorkloadResult;
}

export type AcpRuntimeReplayProfileRecord = {
  surface: AcpRuntimeReplaySurface;
  role: AcpRuntimeReplayRunRole;
  runIndex: number;
  syntheticRootId: string;
  completion: "complete" | "incomplete";
  executionCompletion: "complete" | "incomplete";
  measurementCompletion: "complete" | "incomplete";
  acceptance: AcpRuntimeReplayAcceptance;
  measurement: AcpRuntimeReplayMeasurement;
  replay: AcpRuntimeReplayResult;
  r2: AcpRuntimeR2WorkloadResult;
  profile?: AcpRuntimeProfileSnapshot;
  failure?: AcpRuntimeReplayFailure;
};

export type AcpRuntimeReplayFailure = {
  phase:
    | "target-activation"
    | "workspace-prepare"
    | "profile"
    | "replay"
    | "drain"
    | "cleanup";
  detail: string;
};

export type AcpRuntimeReplayCurrentRun = {
  surface: AcpRuntimeReplaySurface;
  role: AcpRuntimeReplayRunRole;
  runIndex: number;
  matrixIndex: number;
  syntheticRootId: string;
  startedAt: string;
};

export type AcpRuntimeReplaySurfaceSummary = {
  surface: AcpRuntimeReplaySurface;
  completion: "pending" | "complete" | "incomplete";
  formalCount: number;
  elapsedMeanMs: number;
  elapsedMinMs: number;
  elapsedMaxMs: number;
  eventsPerSecond: number;
  mibPerSecond: number;
  records: AcpRuntimeReplayProfileRecord[];
};

export type AcpRuntimeReplayMeasurementState =
  | "captured"
  | "expected-zero"
  | "not-applicable"
  | "not-run"
  | "missing";

export type AcpRuntimeReplayMeasurement = {
  elapsedMs: number;
  timing: "wall-clock" | "synthetic-logical";
  families: Record<
    "transport" | "r1" | "r2" | "r3",
    { state: AcpRuntimeReplayMeasurementState; detail: string }
  >;
  warnings: string[];
};

export type AcpRuntimeReplayAcceptance = {
  state: "accepted" | "rejected";
  reasons: string[];
};

export type AcpRuntimeReplayMatrix = {
  schema: typeof ACP_RUNTIME_REPLAY_MATRIX_SCHEMA;
  createdAt: string;
  trace: {
    schema: typeof ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA;
    digest: string;
    sourceKind: AcpRuntimeTraceSourceKind;
    sampleName?: string;
  };
  cadence: AcpRuntimeReplayCadence;
  r2WorkloadVersion: typeof ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1;
  replayConfig: Record<string, string | number | boolean>;
  environment: {
    pluginVersion: string;
    zoteroVersion: string;
    platform: string;
  };
  completion: "complete" | "incomplete";
  executionCompletion: "complete" | "incomplete";
  measurementCompletion: "complete" | "incomplete";
  acceptance: AcpRuntimeReplayAcceptance;
  records: AcpRuntimeReplayProfileRecord[];
  warnings: string[];
};

function assertAcpRuntimeReplayPhaseProvenance(
  matrix: AcpRuntimeReplayMatrix,
  artifactStem?: string,
) {
  const phase = normalizeAcpRuntimeReplayPhase(matrix.replayConfig.phase);
  const phaseArtifactSlug = String(matrix.replayConfig.phaseArtifactSlug || "");
  const expectedSlug = phase.valid
    ? slugAcpRuntimeReplayArtifactSegment(
        phase.value,
        ACP_RUNTIME_REPLAY_PHASE_SLUG_MAX_LENGTH,
        "stage",
      )
    : "";
  const stemPhaseSlug = artifactStem
    ? String(artifactStem.split("__")[1] || "")
    : expectedSlug;
  if (
    !phase.valid ||
    phase.value !== matrix.replayConfig.phase ||
    !phaseArtifactSlug ||
    phaseArtifactSlug !== expectedSlug ||
    stemPhaseSlug !== expectedSlug
  ) {
    throw new Error("ACP replay phase provenance is incomplete");
  }
}

export type AcpRuntimeReplayWorkspacePort = {
  snapshot: () => Promise<unknown>;
  prepare: (args: {
    surface: AcpRuntimeReplaySurface;
    sourceKind: AcpRuntimeTraceSourceKind;
    syntheticRootId: string;
    signal?: AcpRuntimeReplayCancellationSignal;
  }) => Promise<{ ok: boolean; detail?: string }>;
  drain: (args: {
    surface: AcpRuntimeReplaySurface;
    sourceKind: AcpRuntimeTraceSourceKind;
    syntheticRootId: string;
    signal?: AcpRuntimeReplayCancellationSignal;
  }) => Promise<{
    ok: boolean;
    detail?: string;
    publication?: "acknowledged" | "expected-zero" | "not-applicable";
  }>;
  restore: (snapshot: unknown) => Promise<void>;
};

export type AcpRuntimeReplayProfilerPort = {
  start: (args: {
    surface: AcpRuntimeReplaySurface;
    sourceKind: AcpRuntimeTraceSourceKind;
    syntheticRootId: string;
  }) => Promise<void>;
  finish: () => Promise<unknown>;
  registerOwner?: (owner: AcpRuntimeTraceOwner) => void;
  recordSemanticEvent?: NonNullable<ReplayOptions["onEventConsumed"]>;
};

function metricValue(
  profile: AcpRuntimeProfileSnapshot | undefined,
  name: AcpRuntimeMetricName,
) {
  return (profile?.metrics || [])
    .filter((entry) => entry.name === name)
    .reduce(
      (sum, entry) =>
        sum +
        (entry.counter?.total ??
          entry.duration?.count ??
          entry.gauge?.max ??
          0),
      0,
    );
}

function metricDuration(
  profile: AcpRuntimeProfileSnapshot | undefined,
  name: AcpRuntimeMetricName,
) {
  return (profile?.metrics || [])
    .filter((entry) => entry.name === name && entry.duration)
    .reduce(
      (summary, entry) => ({
        count: summary.count + (entry.duration?.count || 0),
        totalMs: summary.totalMs + (entry.duration?.totalMs || 0),
        maxMs: Math.max(summary.maxMs, entry.duration?.maxMs || 0),
      }),
      { count: 0, totalMs: 0, maxMs: 0 },
    );
}

function evaluateReplayMeasurement(args: {
  profile?: AcpRuntimeProfileSnapshot;
  replay: AcpRuntimeReplayResult;
  r2: AcpRuntimeR2WorkloadResult;
  surface: AcpRuntimeReplaySurface;
  cadence: AcpRuntimeReplayCadence;
  stages: {
    workspacePrepared: boolean;
    profileStarted: boolean;
    replayRan: boolean;
    r2Ran: boolean;
  };
}) {
  const warnings: string[] = [];
  for (const warning of args.replay.warnings) {
    if (warning.startsWith("logical-timer-contamination:")) {
      warnings.push(`logical-measurement-incomplete:${warning}`);
    }
  }
  const semanticEvents = metricValue(args.profile, "semantic_event");
  const r1 = !args.stages.replayRan
    ? {
        state: "not-run" as const,
        detail: "semantic replay did not run",
      }
    : args.replay.completion === "complete" &&
        args.replay.appliedEvents > 0 &&
        semanticEvents === args.replay.appliedEvents
      ? {
          state: "captured" as const,
          detail: `${semanticEvents} semantic events measured`,
        }
      : {
          state: "missing" as const,
          detail: `${semanticEvents}/${args.replay.appliedEvents} semantic events measured`,
        };
  const r2Complete =
    args.r2.requests === 10 &&
    args.r2.fragments === 33 &&
    args.r2.inputBytes === 536 &&
    args.r2.maxConcurrency === 8 &&
    metricValue(args.profile, "host_input_fragment") === 33 &&
    metricValue(args.profile, "host_input_bytes") === 536 &&
    metricValue(args.profile, "host_request_duration") === 10 &&
    metricValue(args.profile, "host_request_inflight") === 8;
  const r2 = !args.stages.r2Ran
    ? {
        state: "not-run" as const,
        detail: "synthetic R2 workload did not run",
      }
    : r2Complete
      ? {
          state: "captured" as const,
          detail:
            "10 requests, 33 fragments, 536 input bytes, max concurrency 8",
        }
      : {
          state: "missing" as const,
          detail: "synthetic parser/input/response metrics are incomplete",
        };
  const r3Lifecycle = {
    prepare: metricValue(args.profile, "panel_prepare"),
    signature: metricValue(args.profile, "panel_signature"),
    post: (args.profile?.publicationLifecycles || []).length,
    shellForward: (args.profile?.publicationLifecycles || []).reduce(
      (total, entry) => total + entry.shellForward,
      0,
    ),
    childApply: (args.profile?.publicationLifecycles || []).reduce(
      (total, entry) => total + entry.childApply,
      0,
    ),
    renderAck: (args.profile?.publicationLifecycles || []).reduce(
      (total, entry) =>
        total +
        (entry.terminal?.outcome === "accepted" &&
        entry.acknowledgements.some(
          (ack) =>
            ack.stage === "render-complete" && ack.outcome === "accepted",
        )
          ? 1
          : 0),
      0,
    ),
  };
  const r3MetricCount = Object.values(r3Lifecycle).reduce(
    (total, value) => total + value,
    0,
  );
  const r3PublicationIdentityComplete =
    r3Lifecycle.post > 0 &&
    (args.profile?.publicationLifecycles || []).every(
      (entry) =>
        entry.post === 1 &&
        entry.shellForward === 1 &&
        entry.childApply === 1 &&
        entry.terminal?.outcome === "accepted" &&
        entry.acknowledgements.some(
          (ack) =>
            ack.stage === "render-complete" && ack.outcome === "accepted",
        ),
    );
  const r3Complete =
    r3Lifecycle.post > 0 &&
    r3Lifecycle.shellForward === r3Lifecycle.post &&
    r3Lifecycle.childApply === r3Lifecycle.post &&
    r3Lifecycle.renderAck === r3Lifecycle.post &&
    r3PublicationIdentityComplete;
  const r3 =
    !args.stages.workspacePrepared || !args.stages.profileStarted
      ? {
          state: "not-run" as const,
          detail: "Workspace publication measurement did not run",
        }
      : args.surface === "closed"
        ? {
            state:
              r3MetricCount === 0
                ? ("not-applicable" as const)
                : ("missing" as const),
            detail:
              r3MetricCount === 0
                ? "Workspace closed"
                : "unexpected R3 activity while Workspace closed",
          }
        : args.surface === "open-inactive"
          ? {
              state:
                r3MetricCount === 0
                  ? ("expected-zero" as const)
                  : ("missing" as const),
              detail:
                r3MetricCount === 0
                  ? "target surface inactive"
                  : "target R3 activity leaked into inactive surface",
            }
          : r3Complete
            ? {
                state: "captured" as const,
                detail: `${r3Lifecycle.post} publications completed host/shell/child/render acknowledgement`,
              }
            : {
                state: "missing" as const,
                detail: `${
                  !r3PublicationIdentityComplete && r3Lifecycle.post > 0
                    ? "publication identity mismatch"
                    : "incomplete publication lifecycle"
                } prepare=${r3Lifecycle.prepare} signature=${r3Lifecycle.signature} post=${r3Lifecycle.post} shell=${r3Lifecycle.shellForward} child=${r3Lifecycle.childApply} render=${r3Lifecycle.renderAck}`,
              };
  for (const [family, coverage] of Object.entries({ r1, r2, r3 })) {
    if (coverage.state === "missing")
      warnings.push(`${family}-measurement-missing:${coverage.detail}`);
    if (coverage.state === "not-run")
      warnings.push(`${family}-measurement-not-run:${coverage.detail}`);
  }
  if (args.profile?.measurement === "incomplete") {
    warnings.push(
      `profile-measurement-incomplete:metric-series-drops=${args.profile.metricSeriesDrops},publication-lifecycle-drops=${args.profile.publicationLifecycleDrops}`,
    );
  }
  if ((args.profile?.publicationDiagnostics || []).length > 0) {
    warnings.push(
      `publication-diagnostics:${args
        .profile!.publicationDiagnostics.map((entry) => entry.code)
        .join(",")}`,
    );
  }
  return {
    elapsedMs: Math.max(
      0,
      (args.profile?.finishedAtMs || 0) - (args.profile?.startedAtMs || 0),
    ),
    timing: args.cadence === "logical" ? "synthetic-logical" : "wall-clock",
    families: {
      transport: {
        state: "not-applicable",
        detail:
          "semantic replay starts no adapter, JSON-RPC transport, or backend",
      },
      r1,
      r2,
      r3,
    },
    warnings,
  } satisfies AcpRuntimeReplayMeasurement;
}

function evaluateReplayAcceptance(args: {
  sourceKind: AcpRuntimeTraceSourceKind;
  surface: AcpRuntimeReplaySurface;
  executionCompletion: "complete" | "incomplete";
  measurementCompletion: "complete" | "incomplete";
  profile?: AcpRuntimeProfileSnapshot;
}) {
  const reasons: string[] = [];
  if (args.executionCompletion !== "complete") {
    reasons.push("execution-incomplete");
  }
  if (args.measurementCompletion !== "complete") {
    reasons.push("measurement-incomplete");
  }
  if (args.surface === "target-active") {
    const lifecycles = args.profile?.publicationLifecycles || [];
    if (
      lifecycles.length === 0 ||
      lifecycles.some((entry) => entry.terminal?.outcome !== "accepted")
    ) {
      reasons.push("publication-lifecycle-incomplete");
    }
    const forbiddenMaterialization = (args.profile?.metrics || []).some(
      (entry) =>
        entry.labels.publicationCause === "steady-state" &&
        (entry.labels.materializationSource === "frontend-snapshot" ||
          entry.labels.materializationSource === "panel-snapshot") &&
        (entry.counter?.total ||
          entry.duration?.count ||
          entry.gauge?.max ||
          0) > 0,
    );
    if (forbiddenMaterialization) {
      reasons.push("forbidden-steady-materialization");
    }
    const steadyTranscriptSnapshot = lifecycles.some(
      (entry) =>
        entry.kind === "transcript" &&
        entry.publicationForm === "snapshot" &&
        entry.publicationCause === "steady-state",
    );
    if (steadyTranscriptSnapshot) {
      reasons.push("steady-transcript-snapshot");
    }
    if (
      lifecycles.some(
        (entry) =>
          entry.kind === "transcript" && entry.publicationCause === "rebase",
      )
    ) {
      reasons.push("automatic-transcript-rebase");
    }
    if (
      (args.profile?.metrics || []).some(
        (entry) =>
          entry.labels.renderPath === "recovery-full" &&
          (entry.counter?.total ||
            entry.duration?.count ||
            entry.gauge?.max ||
            0) > 0,
      )
    ) {
      reasons.push("renderer-recovery-full");
    }
    const postedBytes = metricValue(args.profile, "panel_post_bytes");
    const byteBudget =
      args.sourceKind === "acp-chat-conversation" ? 2_700_000 : 557_610;
    if (postedBytes > byteBudget) {
      reasons.push(`posted-bytes-exceeded:${postedBytes}>${byteBudget}`);
    }
  }
  return {
    state: reasons.length === 0 ? "accepted" : "rejected",
    reasons,
  } satisfies AcpRuntimeReplayAcceptance;
}

let replayMatrixNonce = 0;

export async function runAcpRuntimeReplayMatrix(args: {
  trace: AcpRuntimeSemanticTraceDocument;
  sampleName?: string;
  cadence: AcpRuntimeReplayCadence;
  replayConfig?: Record<string, string | number | boolean>;
  environment: AcpRuntimeReplayMatrix["environment"];
  createTarget: (args: {
    sourceKind: AcpRuntimeTraceSourceKind;
    syntheticRootId: string;
  }) => Promise<AcpRuntimeReplayTarget>;
  createLogicalTime?: (args: {
    surface: AcpRuntimeReplaySurface;
    sourceKind: AcpRuntimeTraceSourceKind;
    syntheticRootId: string;
    signal?: AcpRuntimeReplayCancellationSignal;
  }) =>
    | Promise<AcpRuntimeReplayLogicalRunPort>
    | AcpRuntimeReplayLogicalRunPort;
  workspace: AcpRuntimeReplayWorkspacePort;
  profiler: AcpRuntimeReplayProfilerPort;
  r2Port: AcpRuntimeR2InputPort;
  sleep?: (delayMs: number) => Promise<void>;
  now?: () => number;
  signal?: AcpRuntimeReplayCancellationSignal;
  onRecord?: (
    record: AcpRuntimeReplayProfileRecord,
    completed: number,
  ) => Promise<void> | void;
  onRecordStart?: (current: AcpRuntimeReplayCurrentRun) => Promise<void> | void;
}): Promise<AcpRuntimeReplayMatrix> {
  if (!isAcpRuntimeReplayProfilerAvailable()) {
    throw new Error("ACP replay profiler is unavailable");
  }
  if (args.trace.footer.completion !== "complete") {
    throw new Error("Incomplete ACP semantic traces cannot produce a matrix");
  }
  const phase = normalizeAcpRuntimeReplayPhase(args.replayConfig?.phase);
  if (!phase.valid) {
    throw new Error("ACP replay phase provenance is incomplete");
  }
  const phaseArtifactSlug = slugAcpRuntimeReplayArtifactSegment(
    phase.value,
    ACP_RUNTIME_REPLAY_PHASE_SLUG_MAX_LENGTH,
    "stage",
  );
  if (!acquireAcpRuntimeDiagnosticsMode("replaying")) {
    throw new Error("Another ACP runtime diagnostic mode is active");
  }
  const records: AcpRuntimeReplayProfileRecord[] = [];
  const warnings: string[] = [];
  const surfaces: AcpRuntimeReplaySurface[] = [
    "closed",
    "open-inactive",
    "target-active",
  ];
  replayMatrixNonce += 1;
  const matrixNonce = replayMatrixNonce;
  let ownerNonce = 0;
  let workspaceSnapshot: unknown;
  let hasWorkspaceSnapshot = false;
  let aborted = false;
  const emptyReplay = (warning: string): AcpRuntimeReplayResult => ({
    completion: "incomplete",
    projectedEvents: 0,
    consumedNoopEvents: 0,
    appliedEvents: 0,
    skippedEvents: 0,
    unknownEvents: 0,
    appliedBytes: 0,
    projectedBytes: 0,
    consumedNoopBytes: 0,
    eventKinds: {},
    schedulerLagMs: 0,
    drain: { ok: false, state: "not-run", detail: "not-run" },
    warnings: [warning],
  });
  const emptyR2 = (): AcpRuntimeR2WorkloadResult => ({
    version: ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1,
    requests: 0,
    fragments: 0,
    bytes: 0,
    inputBytes: 0,
    responseBytes: 0,
    maxConcurrency: 0,
  });
  try {
    try {
      workspaceSnapshot = await args.workspace.snapshot();
      hasWorkspaceSnapshot = true;
    } catch (error) {
      warnings.push(
        `workspace-snapshot-failed:${error instanceof Error ? error.message : String(error)}`,
      );
    }
    runLoop: for (const surface of surfaces) {
      for (const role of ["warm-up", "formal", "formal"] as const) {
        if (!hasWorkspaceSnapshot || args.signal?.aborted) {
          aborted = Boolean(args.signal?.aborted);
          break runLoop;
        }
        ownerNonce += 1;
        const syntheticRootId = `acp-replay-${matrixNonce}-${ownerNonce}`;
        const runIndex = records.filter(
          (entry) => entry.surface === surface,
        ).length;
        if (args.onRecordStart) {
          await args.onRecordStart({
            surface,
            role,
            runIndex,
            matrixIndex: records.length + 1,
            syntheticRootId,
            startedAt: new Date().toISOString(),
          });
        }
        let target: AcpRuntimeReplayTarget | undefined;
        let replay = emptyReplay("run-not-started");
        let r2 = emptyR2();
        let profile: AcpRuntimeProfileSnapshot | undefined;
        let profilerStarted = false;
        let profilerFinished = false;
        let logicalTime: AcpRuntimeReplayLogicalRunPort | undefined;
        let workspacePrepared = false;
        let replayRan = false;
        let r2Ran = false;
        let currentPhase: AcpRuntimeReplayFailure["phase"] =
          "target-activation";
        let failure: AcpRuntimeReplayFailure | undefined;
        const recordFailure = (
          phase: AcpRuntimeReplayFailure["phase"],
          error: unknown,
        ) => {
          const detail =
            error instanceof Error ? error.message : String(error || "unknown");
          replay.completion = "incomplete";
          if (!failure) {
            failure = { phase, detail };
          }
          replay.warnings.push(`${phase}-failed:${detail}`);
        };
        try {
          currentPhase = "target-activation";
          target = await args.createTarget({
            sourceKind: args.trace.header.sourceKind,
            syntheticRootId,
          });
          if (surface === "target-active") {
            await target.activate();
          }
          currentPhase = "workspace-prepare";
          const prepared = await args.workspace.prepare({
            surface,
            sourceKind: args.trace.header.sourceKind,
            syntheticRootId,
            signal: args.signal,
          });
          if (!prepared.ok) {
            recordFailure(
              "workspace-prepare",
              prepared.detail || "workspace-prepare-failed",
            );
          } else {
            workspacePrepared = true;
            currentPhase = "profile";
            await args.profiler.start({
              surface,
              sourceKind: args.trace.header.sourceKind,
              syntheticRootId,
            });
            profilerStarted = true;
            if (args.cadence === "logical") {
              if (!args.createLogicalTime) {
                throw new Error("Logical replay factory is unavailable");
              }
              logicalTime = await args.createLogicalTime({
                surface,
                sourceKind: args.trace.header.sourceKind,
                syntheticRootId,
                signal: args.signal,
              });
              await logicalTime.captureAt(0);
            }
            currentPhase = "replay";
            replayRan = true;
            r2Ran = true;
            const [replayResult, r2Result] = await Promise.allSettled([
              replayAcpRuntimeSemanticTrace({
                trace: args.trace,
                target,
                cadence: args.cadence,
                logicalTime,
                sleep: args.sleep,
                now: args.now,
                signal: args.signal,
                onOwnerMapped: args.profiler.registerOwner,
                onEventConsumed: args.profiler.recordSemanticEvent,
              }),
              runAcpRuntimeR2SyntheticWorkloadV1({
                port: args.r2Port,
                sleep: args.sleep,
                profileRequestId: syntheticRootId,
              }),
            ]);
            replay =
              replayResult.status === "fulfilled"
                ? replayResult.value
                : emptyReplay(
                    `replay-failed:${replayResult.reason instanceof Error ? replayResult.reason.message : String(replayResult.reason)}`,
                  );
            if (replayResult.status === "rejected") {
              recordFailure("replay", replayResult.reason);
            } else if (replay.drain.state === "failed") {
              recordFailure(
                "drain",
                replay.drain.detail || "target-drain-failed",
              );
            } else if (replay.completion === "incomplete") {
              recordFailure(
                "replay",
                replay.warnings[0] || "semantic-replay-incomplete",
              );
            }
            if (r2Result.status === "fulfilled") {
              r2 = r2Result.value;
            } else {
              recordFailure("replay", r2Result.reason);
            }
            currentPhase = "drain";
            const workspaceDrain = await args.workspace.drain({
              surface,
              sourceKind: args.trace.header.sourceKind,
              syntheticRootId,
              signal: args.signal,
            });
            if (!workspaceDrain.ok) {
              replay.drain = {
                ...workspaceDrain,
                state: "failed",
              };
              recordFailure(
                "drain",
                workspaceDrain.detail || "workspace-drain-failed",
              );
            }
          }
        } catch (error) {
          recordFailure(currentPhase, error);
        } finally {
          if (profilerStarted && !profilerFinished) {
            try {
              profile = (await args.profiler.finish()) as
                | AcpRuntimeProfileSnapshot
                | undefined;
              profilerFinished = true;
            } catch (error) {
              recordFailure("profile", error);
            }
          }
          if (target) {
            try {
              await target.cleanup();
            } catch (error) {
              recordFailure("cleanup", error);
            }
          }
          logicalTime?.dispose();
        }
        const executionCompletion =
          replay.completion === "complete" && replay.drain.ok
            ? "complete"
            : "incomplete";
        const measurement = evaluateReplayMeasurement({
          profile,
          replay,
          r2,
          surface,
          cadence: args.cadence,
          stages: {
            workspacePrepared,
            profileStarted: profilerStarted,
            replayRan,
            r2Ran,
          },
        });
        const measurementCompletion =
          measurement.warnings.length === 0 ? "complete" : "incomplete";
        const acceptance = evaluateReplayAcceptance({
          sourceKind: args.trace.header.sourceKind,
          surface,
          executionCompletion,
          measurementCompletion,
          profile,
        });
        const record: AcpRuntimeReplayProfileRecord = {
          surface,
          role,
          runIndex,
          syntheticRootId,
          completion:
            executionCompletion === "complete" &&
            measurementCompletion === "complete"
              ? "complete"
              : "incomplete",
          executionCompletion,
          measurementCompletion,
          acceptance,
          measurement,
          replay,
          r2,
          profile,
          ...(failure ? { failure } : {}),
        };
        records.push(record);
        warnings.push(
          ...replay.warnings.map((entry) => `${surface}:${role}:${entry}`),
          ...measurement.warnings.map((entry) => `${surface}:${role}:${entry}`),
        );
        if (args.onRecord) {
          try {
            await args.onRecord(record, records.length);
          } catch (error) {
            warnings.push(
              `progress-failed:${error instanceof Error ? error.message : String(error)}`,
            );
            break runLoop;
          }
        }
        if (args.signal?.aborted) {
          aborted = true;
          break runLoop;
        }
      }
    }
  } finally {
    try {
      if (hasWorkspaceSnapshot) {
        try {
          await args.workspace.restore(workspaceSnapshot);
        } catch (error) {
          warnings.push(
            `workspace-restore-failed:${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } finally {
      releaseAcpRuntimeDiagnosticsMode("replaying");
    }
  }
  if (aborted) warnings.push("matrix-aborted");
  return {
    schema: ACP_RUNTIME_REPLAY_MATRIX_SCHEMA,
    createdAt: new Date().toISOString(),
    trace: {
      schema: ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
      digest: args.trace.digest,
      sourceKind: args.trace.header.sourceKind,
      ...(args.sampleName ? { sampleName: args.sampleName } : {}),
    },
    cadence: args.cadence,
    r2WorkloadVersion: ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1,
    replayConfig: {
      ...(args.replayConfig || {}),
      phase: phase.value,
      phaseArtifactSlug,
      ...(args.cadence === "logical"
        ? { syntheticTiming: true, logicalSchedulerVersion: 1 }
        : {}),
    },
    environment: { ...args.environment },
    completion:
      records.length === 9 &&
      records.every(
        (entry) =>
          entry.executionCompletion === "complete" &&
          entry.measurementCompletion === "complete",
      )
        ? "complete"
        : "incomplete",
    executionCompletion:
      records.length === 9 &&
      records.every((entry) => entry.executionCompletion === "complete")
        ? "complete"
        : "incomplete",
    measurementCompletion:
      records.length === 9 &&
      records.every((entry) => entry.measurementCompletion === "complete")
        ? "complete"
        : "incomplete",
    acceptance: {
      state:
        records.length === 9 &&
        records
          .filter((entry) => entry.role === "formal")
          .every((entry) => entry.acceptance.state === "accepted")
          ? "accepted"
          : "rejected",
      reasons: Array.from(
        new Set(
          records
            .filter((entry) => entry.role === "formal")
            .flatMap((entry) => entry.acceptance.reasons),
        ),
      ),
    },
    records,
    warnings,
  };
}

export function projectAcpRuntimeReplaySurfaceSummaries(
  records: readonly AcpRuntimeReplayProfileRecord[],
): AcpRuntimeReplaySurfaceSummary[] {
  return (["closed", "open-inactive", "target-active"] as const).map(
    (surface) => {
      const formal = records.filter(
        (record) => record.surface === surface && record.role === "formal",
      );
      const elapsed = formal.map((record) => record.measurement.elapsedMs);
      const elapsedMeanMs =
        elapsed.reduce((sum, value) => sum + value, 0) /
        Math.max(1, elapsed.length);
      const events = formal.reduce(
        (sum, record) => sum + record.replay.appliedEvents,
        0,
      );
      const bytes = formal.reduce(
        (sum, record) => sum + record.replay.appliedBytes,
        0,
      );
      return {
        surface,
        completion:
          formal.length === 0
            ? "pending"
            : formal.length === 2 &&
                formal.every(
                  (record) =>
                    record.executionCompletion === "complete" &&
                    record.measurementCompletion === "complete",
                )
              ? "complete"
              : "incomplete",
        formalCount: formal.length,
        elapsedMeanMs,
        elapsedMinMs: elapsed.length ? Math.min(...elapsed) : 0,
        elapsedMaxMs: elapsed.length ? Math.max(...elapsed) : 0,
        eventsPerSecond:
          elapsedMeanMs > 0
            ? events / Math.max(1, formal.length) / (elapsedMeanMs / 1000)
            : 0,
        mibPerSecond:
          elapsedMeanMs > 0
            ? bytes /
              Math.max(1, formal.length) /
              1024 /
              1024 /
              (elapsedMeanMs / 1000)
            : 0,
        records: formal,
      };
    },
  );
}

export function assertAcpRuntimeReplayMatricesComparable(
  left: AcpRuntimeReplayMatrix,
  right: AcpRuntimeReplayMatrix,
) {
  assertAcpRuntimeReplayPhaseProvenance(left);
  assertAcpRuntimeReplayPhaseProvenance(right);
  const comparableReplayConfig = (
    config: AcpRuntimeReplayMatrix["replayConfig"],
  ) => {
    const {
      phase: _governanceStage,
      phaseArtifactSlug: _governanceStageSlug,
      ...executionConfig
    } = config;
    return executionConfig;
  };
  const leftKey = JSON.stringify([
    left.trace.digest,
    left.trace.sourceKind,
    left.cadence,
    left.r2WorkloadVersion,
    comparableReplayConfig(left.replayConfig),
  ]);
  const rightKey = JSON.stringify([
    right.trace.digest,
    right.trace.sourceKind,
    right.cadence,
    right.r2WorkloadVersion,
    comparableReplayConfig(right.replayConfig),
  ]);
  if (leftKey !== rightKey) {
    throw new Error("ACP replay matrices have incompatible provenance");
  }
  if (
    left.executionCompletion !== "complete" ||
    right.executionCompletion !== "complete" ||
    left.measurementCompletion !== "complete" ||
    right.measurementCompletion !== "complete" ||
    left.records.some(
      (entry) =>
        entry.role === "formal" &&
        (entry.executionCompletion !== "complete" ||
          entry.measurementCompletion !== "complete"),
    ) ||
    right.records.some(
      (entry) =>
        entry.role === "formal" &&
        (entry.executionCompletion !== "complete" ||
          entry.measurementCompletion !== "complete"),
    )
  ) {
    throw new Error("Incomplete ACP replay matrices cannot be compared");
  }
}

export function renderAcpRuntimeReplayMatrixMarkdown(
  matrix: AcpRuntimeReplayMatrix,
) {
  const formal = matrix.records.filter((record) => record.role === "formal");
  const surfaceSummary = projectAcpRuntimeReplaySurfaceSummaries(
    matrix.records,
  );
  const closedMean = surfaceSummary[0].elapsedMeanMs;
  const format = (value: number, digits = 1) =>
    Number.isFinite(value) ? value.toFixed(digits) : "n/a";
  const cell = (value: unknown) => String(value ?? "").replace(/\|/g, "\\|");
  const metricNames = Array.from(
    new Set(
      formal.flatMap((record) =>
        (record.profile?.metrics || []).map((metric) => metric.name),
      ),
    ),
  ).sort();
  const durationMetricNames = metricNames.filter((name) =>
    formal.some((record) =>
      (record.profile?.metrics || []).some(
        (metric) => metric.name === name && metric.duration,
      ),
    ),
  );
  const lines = [
    "# ACP Runtime Replay Matrix",
    "",
    `- Trace: \`${matrix.trace.digest}\``,
    `- Sample: \`${matrix.trace.sampleName || "trace"}\``,
    `- Stage: \`${String(matrix.replayConfig.phase || "")}\``,
    `- Source: \`${matrix.trace.sourceKind}\``,
    `- Cadence: \`${matrix.cadence}\``,
    `- Timing classification: \`${matrix.cadence === "logical" ? "synthetic-logical (non-comparable with recorded wall-clock timing)" : "wall-clock"}\``,
    `- R2 workload: \`${matrix.r2WorkloadVersion}\``,
    `- Execution completion: \`${matrix.executionCompletion}\``,
    `- Measurement completion: \`${matrix.measurementCompletion}\``,
    `- Acceptance: \`${matrix.acceptance.state}\`${matrix.acceptance.reasons.length ? ` (${matrix.acceptance.reasons.join(", ")})` : ""}`,
    "",
    "## Run coverage",
    "",
    `| Surface | Role | Run | Execution | Measurement | Acceptance | ${matrix.cadence === "logical" ? "Synthetic wall ms" : "Wall ms"} | Projected | No-op | Unknown | Drain | Transport | R1 | R2 | R3 | Failure |`,
    "| --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- |",
    ...matrix.records.map(
      (record) =>
        `| ${record.surface} | ${record.role} | ${record.runIndex} | ${record.executionCompletion} | ${record.measurementCompletion} | ${record.acceptance.state}${record.acceptance.reasons.length ? `: ${cell(record.acceptance.reasons.join(", "))}` : ""} | ${format(record.measurement.elapsedMs)} | ${record.replay.projectedEvents} | ${record.replay.consumedNoopEvents} | ${record.replay.unknownEvents} | ${record.replay.drain.state || (record.replay.drain.ok ? "ok" : "failed")} | ${record.measurement.families.transport.state} | ${record.measurement.families.r1.state} | ${record.measurement.families.r2.state} | ${record.measurement.families.r3.state} | ${record.failure ? `${record.failure.phase}: ${cell(record.failure.detail)}` : "—"} |`,
    ),
    "",
    "## Formal descriptive summary",
    "",
    matrix.cadence === "logical"
      ? "> Logical cadence preserves replay-owned timer semantics, but wall time, throughput, scheduler lag, event-loop drift, and wall-clock-dependent request duration are synthetic and non-comparable with recorded cadence."
      : "> Each surface has two formal observations. These values are descriptive; they are not significance estimates.",
    "",
    `| Surface | n | ${matrix.cadence === "logical" ? "Synthetic wall ms mean" : "Wall ms mean"} | Range ms | ${matrix.cadence === "logical" ? "Synthetic events/s" : "Events/s"} | ${matrix.cadence === "logical" ? "Synthetic MiB/s" : "MiB/s"} | Delta vs closed |`,
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...surfaceSummary.map(
      (entry) =>
        `| ${entry.surface} | ${entry.formalCount} | ${format(entry.elapsedMeanMs)} | ${format(entry.elapsedMinMs)}–${format(entry.elapsedMaxMs)} | ${format(entry.eventsPerSecond)} | ${format(entry.mibPerSecond, 3)} | ${closedMean > 0 ? `${format(((entry.elapsedMeanMs - closedMean) / closedMean) * 100)}%` : "n/a"} |`,
    ),
    "",
    "## Formal metric totals",
    "",
    "| Metric | Closed | Open inactive | Target active |",
    "| --- | ---: | ---: | ---: |",
    ...metricNames.map((name) => {
      const values = surfaceSummary.map((entry) => {
        const records = formal.filter(
          (record) => record.surface === entry.surface,
        );
        return (
          records.reduce(
            (sum, record) =>
              sum + metricValue(record.profile, name as AcpRuntimeMetricName),
            0,
          ) / Math.max(1, records.length)
        );
      });
      return `| ${name} | ${format(values[0])} | ${format(values[1])} | ${format(values[2])} |`;
    }),
    "",
    "## Formal duration summaries",
    "",
    "| Metric | Surface | Count mean | Total ms mean | Max ms |",
    "| --- | --- | ---: | ---: | ---: |",
    ...durationMetricNames.flatMap((name) =>
      surfaceSummary.map((entry) => {
        const records = formal.filter(
          (record) => record.surface === entry.surface,
        );
        const summaries = records.map((record) =>
          metricDuration(record.profile, name as AcpRuntimeMetricName),
        );
        const divisor = Math.max(1, summaries.length);
        return `| ${name} | ${entry.surface} | ${format(summaries.reduce((sum, value) => sum + value.count, 0) / divisor)} | ${format(summaries.reduce((sum, value) => sum + value.totalMs, 0) / divisor)} | ${format(summaries.reduce((maximum, value) => Math.max(maximum, value.maxMs), 0))} |`;
      }),
    ),
  ];
  if (matrix.warnings.length > 0) {
    lines.push(
      "",
      "## Warnings",
      "",
      ...matrix.warnings.map((entry) => `- ${entry}`),
    );
  }
  return `${lines.join("\n")}\n`;
}

export async function saveAcpRuntimeReplayMatrix(args: {
  matrix: AcpRuntimeReplayMatrix;
  root?: string;
  nowMs?: number;
}) {
  assertAcpRuntimeReplayPhaseProvenance(args.matrix);
  const paths = getRuntimePersistencePaths(args.root);
  const folder = joinPath(paths.runtimeRoot, "profiles", "acp-replay");
  await ensureRuntimeDirectory(folder);
  const stem = buildAcpRuntimeReplayArtifactStem({
    sampleName: args.matrix.trace.sampleName || "trace",
    phase: String(args.matrix.replayConfig.phase || "stage"),
    cadence: args.matrix.cadence,
    createdAtMs: args.nowMs,
  });
  assertAcpRuntimeReplayPhaseProvenance(args.matrix, stem);
  const files = [
    { extension: "json", content: `${JSON.stringify(args.matrix, null, 2)}\n` },
    {
      extension: "md",
      content: renderAcpRuntimeReplayMatrixMarkdown(args.matrix),
    },
  ];
  const saved: string[] = [];
  try {
    for (const file of files) {
      const targetPath = joinPath(folder, `${stem}.${file.extension}`);
      const temporaryPath = joinPath(folder, `.${stem}.${file.extension}.tmp`);
      await writeRuntimeTextFile(temporaryPath, file.content);
      await moveRuntimePath({
        sourcePath: temporaryPath,
        targetPath,
        overwrite: false,
      });
      saved.push(targetPath);
    }
  } catch (error) {
    await Promise.all(saved.map((entry) => removeRuntimePath(entry)));
    throw error;
  }
  return { folder, jsonPath: saved[0], markdownPath: saved[1] };
}
