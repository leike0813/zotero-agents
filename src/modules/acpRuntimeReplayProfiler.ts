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
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  moveRuntimePath,
  removeRuntimePath,
  writeRuntimeTextFile,
} from "./runtimePersistence";

export const ACP_RUNTIME_REPLAY_MATRIX_SCHEMA =
  "zotero-agents.acp-runtime-replay-matrix.v1" as const;
export const ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1 =
  "ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1" as const;

export type AcpRuntimeReplayCadence = "recorded" | "burst";
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
  apply: (
    context: AcpRuntimeReplayApplyContext,
  ) => Promise<"applied" | "skipped" | "unknown">;
  drain: () => Promise<{ ok: boolean; detail?: string }>;
  cleanup: () => Promise<void>;
};

export type AcpRuntimeReplayResult = {
  completion: "complete" | "incomplete";
  appliedEvents: number;
  skippedEvents: number;
  unknownEvents: number;
  appliedBytes: number;
  schedulerLagMs: number;
  drain: { ok: boolean; detail?: string };
  warnings: string[];
};

type ReplayOptions = {
  trace: AcpRuntimeSemanticTraceDocument;
  target: AcpRuntimeReplayTarget;
  cadence: AcpRuntimeReplayCadence;
  sleep?: (delayMs: number) => Promise<void>;
  now?: () => number;
  signal?: AbortSignal;
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
  const owners = new Map<string, AcpRuntimeTraceOwner>();
  let nonce = 0;
  return (owner: AcpRuntimeTraceOwner) => {
    const key = eventOwnerKey(owner);
    const existing = owners.get(key);
    if (existing) return existing;
    nonce += 1;
    const prefix = `${syntheticRootId}-${nonce}`;
    const mapped: AcpRuntimeTraceOwner = {
      rootId: syntheticRootId,
      ...(owner.conversationId
        ? { conversationId: `${prefix}-conversation` }
        : {}),
      ...(owner.workflowId ? { workflowId: `${prefix}-workflow` } : {}),
      ...(owner.workflowRunId
        ? { workflowRunId: `${prefix}-workflow-run` }
        : {}),
      ...(owner.jobId ? { jobId: `${prefix}-job` } : {}),
      ...(owner.stageId ? { stageId: `${prefix}-stage` } : {}),
      ...(owner.requestId ? { requestId: `${prefix}-request` } : {}),
      ...(owner.sessionId ? { sessionId: `${prefix}-session` } : {}),
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
    appliedEvents: 0,
    skippedEvents: 0,
    unknownEvents: 0,
    appliedBytes: 0,
    schedulerLagMs: 0,
    drain: { ok: false, detail: "not-drained" },
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
      await sleep(gap);
      result.schedulerLagMs += Math.max(0, now() - waitStarted - gap);
    }
    previousOffset = event.monotonicOffsetMs;
    try {
      const disposition = await options.target.apply({
        event,
        owner: mapOwner(event.owner),
        transcriptBoundary: notificationBoundary(event),
      });
      if (disposition === "applied") {
        result.appliedEvents += 1;
        result.appliedBytes += payloadBytes(event.payload);
      } else if (disposition === "skipped") {
        result.skippedEvents += 1;
      } else {
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
  try {
    result.drain = await options.target.drain();
  } catch (error) {
    result.drain = {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (!result.drain.ok) {
    result.completion = "incomplete";
    result.warnings.push(`drain-failed:${result.drain.detail || "unknown"}`);
  }
  return result;
}

export type AcpRuntimeR2InputPort = {
  consumeFragment: (args: {
    requestId: string;
    fragment: Uint8Array;
    final: boolean;
  }) => Promise<void>;
};

export type AcpRuntimeR2WorkloadResult = {
  version: typeof ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1;
  requests: number;
  fragments: number;
  bytes: number;
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
}) {
  const sleep =
    args.sleep ||
    ((delayMs: number) =>
      new Promise((resolve) => setTimeout(resolve, delayMs)));
  const encoder = new TextEncoder();
  let requests = 0;
  let fragments = 0;
  let bytes = 0;
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
      await args.port.consumeFragment({
        requestId,
        fragment,
        final: index === chunks.length - 1,
      });
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
    maxConcurrency,
  } satisfies AcpRuntimeR2WorkloadResult;
}

export type AcpRuntimeReplayProfileRecord = {
  surface: AcpRuntimeReplaySurface;
  role: AcpRuntimeReplayRunRole;
  runIndex: number;
  syntheticRootId: string;
  completion: "complete" | "incomplete";
  replay: AcpRuntimeReplayResult;
  r2: AcpRuntimeR2WorkloadResult;
  profile: unknown;
};

export type AcpRuntimeReplayMatrix = {
  schema: typeof ACP_RUNTIME_REPLAY_MATRIX_SCHEMA;
  createdAt: string;
  trace: {
    schema: typeof ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA;
    digest: string;
    sourceKind: AcpRuntimeTraceSourceKind;
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
  records: AcpRuntimeReplayProfileRecord[];
  warnings: string[];
};

export type AcpRuntimeReplayWorkspacePort = {
  snapshot: () => Promise<unknown>;
  prepare: (args: {
    surface: AcpRuntimeReplaySurface;
    sourceKind: AcpRuntimeTraceSourceKind;
    syntheticRootId: string;
  }) => Promise<{ ok: boolean; detail?: string }>;
  restore: (snapshot: unknown) => Promise<void>;
};

export type AcpRuntimeReplayProfilerPort = {
  start: (args: {
    surface: AcpRuntimeReplaySurface;
    sourceKind: AcpRuntimeTraceSourceKind;
    syntheticRootId: string;
  }) => Promise<void>;
  finish: () => Promise<unknown>;
};

export async function runAcpRuntimeReplayMatrix(args: {
  trace: AcpRuntimeSemanticTraceDocument;
  cadence: AcpRuntimeReplayCadence;
  replayConfig?: Record<string, string | number | boolean>;
  environment: AcpRuntimeReplayMatrix["environment"];
  createTarget: (args: {
    sourceKind: AcpRuntimeTraceSourceKind;
    syntheticRootId: string;
  }) => Promise<AcpRuntimeReplayTarget>;
  workspace: AcpRuntimeReplayWorkspacePort;
  profiler: AcpRuntimeReplayProfilerPort;
  r2Port: AcpRuntimeR2InputPort;
  sleep?: (delayMs: number) => Promise<void>;
  now?: () => number;
  signal?: AbortSignal;
}): Promise<AcpRuntimeReplayMatrix> {
  if (!isAcpRuntimeReplayProfilerAvailable()) {
    throw new Error("ACP replay profiler is unavailable");
  }
  if (args.trace.footer.completion !== "complete") {
    throw new Error("Incomplete ACP semantic traces cannot produce a matrix");
  }
  if (!acquireAcpRuntimeDiagnosticsMode("replaying")) {
    throw new Error("Another ACP runtime diagnostic mode is active");
  }
  const workspaceSnapshot = await args.workspace.snapshot();
  const records: AcpRuntimeReplayProfileRecord[] = [];
  const warnings: string[] = [];
  const surfaces: AcpRuntimeReplaySurface[] = [
    "closed",
    "open-inactive",
    "target-active",
  ];
  let ownerNonce = 0;
  try {
    for (const surface of surfaces) {
      for (const role of ["warm-up", "formal", "formal"] as const) {
        ownerNonce += 1;
        const syntheticRootId = `acp-replay-${ownerNonce}`;
        const target = await args.createTarget({
          sourceKind: args.trace.header.sourceKind,
          syntheticRootId,
        });
        const prepared = await args.workspace.prepare({
          surface,
          sourceKind: args.trace.header.sourceKind,
          syntheticRootId,
        });
        let replay: AcpRuntimeReplayResult;
        let r2: AcpRuntimeR2WorkloadResult;
        let profile: unknown;
        if (!prepared.ok) {
          replay = {
            completion: "incomplete",
            appliedEvents: 0,
            skippedEvents: 0,
            unknownEvents: 0,
            appliedBytes: 0,
            schedulerLagMs: 0,
            drain: prepared,
            warnings: [`prepare-drain-failed:${prepared.detail || "unknown"}`],
          };
          r2 = {
            version: ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1,
            requests: 0,
            fragments: 0,
            bytes: 0,
            maxConcurrency: 0,
          };
          profile = undefined;
        } else {
          await args.profiler.start({
            surface,
            sourceKind: args.trace.header.sourceKind,
            syntheticRootId,
          });
          try {
            [replay, r2] = await Promise.all([
              replayAcpRuntimeSemanticTrace({
                trace: args.trace,
                target,
                cadence: args.cadence,
                sleep: args.sleep,
                now: args.now,
                signal: args.signal,
              }),
              runAcpRuntimeR2SyntheticWorkloadV1({
                port: args.r2Port,
                sleep: args.sleep,
              }),
            ]);
          } finally {
            profile = await args.profiler.finish();
          }
        }
        await target.cleanup();
        const completion =
          replay.completion === "complete" && replay.drain.ok
            ? "complete"
            : "incomplete";
        records.push({
          surface,
          role,
          runIndex: records.filter((entry) => entry.surface === surface).length,
          syntheticRootId,
          completion,
          replay,
          r2,
          profile,
        });
        warnings.push(
          ...replay.warnings.map((entry) => `${surface}:${role}:${entry}`),
        );
      }
    }
  } finally {
    try {
      await args.workspace.restore(workspaceSnapshot);
    } finally {
      releaseAcpRuntimeDiagnosticsMode("replaying");
    }
  }
  return {
    schema: ACP_RUNTIME_REPLAY_MATRIX_SCHEMA,
    createdAt: new Date().toISOString(),
    trace: {
      schema: ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
      digest: args.trace.digest,
      sourceKind: args.trace.header.sourceKind,
    },
    cadence: args.cadence,
    r2WorkloadVersion: ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1,
    replayConfig: { ...(args.replayConfig || {}) },
    environment: { ...args.environment },
    completion:
      records.length === 9 &&
      records.every((entry) => entry.completion === "complete")
        ? "complete"
        : "incomplete",
    records,
    warnings,
  };
}

export function assertAcpRuntimeReplayMatricesComparable(
  left: AcpRuntimeReplayMatrix,
  right: AcpRuntimeReplayMatrix,
) {
  const leftKey = JSON.stringify([
    left.trace.digest,
    left.trace.sourceKind,
    left.cadence,
    left.r2WorkloadVersion,
    left.replayConfig,
  ]);
  const rightKey = JSON.stringify([
    right.trace.digest,
    right.trace.sourceKind,
    right.cadence,
    right.r2WorkloadVersion,
    right.replayConfig,
  ]);
  if (leftKey !== rightKey) {
    throw new Error("ACP replay matrices have incompatible provenance");
  }
  if (
    left.completion !== "complete" ||
    right.completion !== "complete" ||
    left.records.some(
      (entry) => entry.role === "formal" && entry.completion !== "complete",
    ) ||
    right.records.some(
      (entry) => entry.role === "formal" && entry.completion !== "complete",
    )
  ) {
    throw new Error("Incomplete ACP replay matrices cannot be compared");
  }
}

export function renderAcpRuntimeReplayMatrixMarkdown(
  matrix: AcpRuntimeReplayMatrix,
) {
  const lines = [
    "# ACP Runtime Replay Matrix",
    "",
    `- Trace: \`${matrix.trace.digest}\``,
    `- Source: \`${matrix.trace.sourceKind}\``,
    `- Cadence: \`${matrix.cadence}\``,
    `- R2 workload: \`${matrix.r2WorkloadVersion}\``,
    `- Completion: \`${matrix.completion}\``,
    "",
    "| Surface | Role | Run | Completion | Applied | Unknown | Bytes | Lag ms | Drain |",
    "| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | --- |",
    ...matrix.records.map(
      (record) =>
        `| ${record.surface} | ${record.role} | ${record.runIndex} | ${record.completion} | ${record.replay.appliedEvents} | ${record.replay.unknownEvents} | ${record.replay.appliedBytes} | ${record.replay.schedulerLagMs} | ${record.replay.drain.ok ? "ok" : "failed"} |`,
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
  const paths = getRuntimePersistencePaths(args.root);
  const folder = joinPath(paths.runtimeRoot, "profiles", "acp-replay");
  await ensureRuntimeDirectory(folder);
  const stem = `acp-replay-${new Date(args.nowMs ?? Date.now())
    .toISOString()
    .replace(/[:.]/g, "-")}`;
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
