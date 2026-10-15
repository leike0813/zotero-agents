import type { BackendInstance } from "../../../backends/types";
import {
  createAcpConnectionAdapter,
  type AcpConnectionAdapter,
  type AcpConnectionTransportSnapshot,
} from "./acpConnectionAdapter";
import type {
  AcpSessionConfigOption,
  SessionModelState,
  SessionModeState,
} from "../../acpProtocol";
import {
  waitForBoundedPromise,
  type CancellationSignal,
} from "../../../utils/wait";
import {
  hasAcpRuntimeOptionSelectors,
  resolveAcpRuntimeOptionsState,
} from "../chat/acpSessionConfigOptions";
import {
  appendAcpSkillRunTransportAuditEvent,
  releaseAcpSkillRunAuditTrailWrites,
  resolveAcpSkillRunAuditTrailFiles,
  shouldWriteDetailedAcpAuditArtifacts,
} from "../skillRun/acpSkillRunAuditTrail";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
} from "../../runtimePersistence";
import { joinPath } from "../../../utils/path";
import { appendRuntimeLog } from "../../runtimeLogManager";
import { computeAcpBackendConfigFingerprint } from "../../../backends/identity";

export type AcpBackendProbeResult = {
  ok: boolean;
  backend: BackendInstance;
  error?: string;
};

const ACP_BACKEND_RUNTIME_OPTIONS_PROBE_TIMEOUT_MS = 180_000;
const ACP_BACKEND_PROBE_CLEANUP_TIMEOUT_MS = 1_000;
const ACP_BACKEND_PROBE_DIAGNOSTIC_LIMIT = 12;
const ACP_BACKEND_PROBE_TEXT_TAIL_CHARS = 4_000;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => normalizeString(entry)).filter(Boolean)
    : [];
}

function normalizeStringMap(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .map(([key, entry]) => [normalizeString(key), normalizeString(entry)])
          .filter(([key, entry]) => key && entry),
      )
    : {};
}

export function buildAcpRuntimeOptionsCache(args: {
  configOptions?: AcpSessionConfigOption[] | null;
  modes?: SessionModeState | null;
  models?: SessionModelState | null;
  refreshedAt?: string;
}) {
  const state = resolveAcpRuntimeOptionsState({
    configOptions: args.configOptions,
    modes: args.modes,
    models: args.models,
  });
  const refreshedAt = args.refreshedAt || new Date().toISOString();
  return {
    refreshedAt,
    revision: refreshedAt,
    source: "acp-probe" as const,
    status: "ready" as const,
    diagnostics: [],
    ...state,
  };
}

function preserveExistingRuntimeOptionsCache(backend: BackendInstance) {
  const existing = backend.acp?.runtimeOptionsCache;
  return existing && hasAcpRuntimeOptionSelectors(existing)
    ? existing
    : undefined;
}

function summarizeAcpRuntimeOptionsCache(
  cache: NonNullable<BackendInstance["acp"]>["runtimeOptionsCache"],
) {
  return {
    modes: Array.isArray(cache?.modes) ? cache.modes.length : 0,
    rawModels: Array.isArray(cache?.rawModels) ? cache.rawModels.length : 0,
    displayModels: Array.isArray(cache?.displayModels)
      ? cache.displayModels.length
      : 0,
    reasoningEfforts: Array.isArray(cache?.reasoningEfforts)
      ? cache.reasoningEfforts.length
      : 0,
    refreshedAt: normalizeString(cache?.refreshedAt),
  };
}

function appendAcpProbeLog(args: {
  backend: BackendInstance;
  level: "info" | "warn" | "error";
  stage: string;
  message: string;
  details?: Record<string, unknown>;
  error?: unknown;
}) {
  appendRuntimeLog({
    level: args.level,
    scope: "provider",
    backendId: normalizeString(args.backend.id),
    backendType: normalizeString(args.backend.type) || "acp",
    providerId: "acp",
    component: "acp-backend-probe",
    operation: "probe-acp-runtime-options",
    stage: args.stage,
    message: args.message,
    details: args.details,
    error: args.error,
  });
}

function tailProbeText(value: unknown) {
  const text = normalizeString(value);
  return text.length > ACP_BACKEND_PROBE_TEXT_TAIL_CHARS
    ? text.slice(text.length - ACP_BACKEND_PROBE_TEXT_TAIL_CHARS)
    : text;
}

function compactTransportSnapshot(
  snapshot?: AcpConnectionTransportSnapshot | null,
) {
  if (!snapshot) {
    return null;
  }
  const lifecycle = snapshot.transportLifecycle || null;
  const lifecycleRecord =
    lifecycle && typeof lifecycle === "object"
      ? (lifecycle as Record<string, unknown>)
      : {};
  return {
    commandLabel: snapshot.commandLabel,
    commandLine: snapshot.commandLine,
    exitCode: snapshot.exitCode,
    stdoutTail: tailProbeText(snapshot.stdoutText),
    stderrTail: tailProbeText(snapshot.stderrText),
    stdoutChars: normalizeString(snapshot.stdoutText).length,
    stderrChars: normalizeString(snapshot.stderrText).length,
    transportKind: lifecycleRecord.transportKind,
    lifecycleExitCode: lifecycleRecord.exitCode,
    lifecycleExitSource: lifecycleRecord.exitSource,
    lifecycleClosedAt: lifecycleRecord.closedAt,
    bridgePid: lifecycleRecord.bridgePid,
    childPid: lifecycleRecord.childPid,
    webSocketError: lifecycleRecord.webSocketError,
    webSocketClose: lifecycleRecord.webSocketClose,
    readError: lifecycleRecord.readError,
    lifecycle,
  };
}

function compactAdapterDiagnostic(entry: unknown) {
  if (!entry || typeof entry !== "object") {
    return entry || null;
  }
  const record = entry as Record<string, unknown>;
  return {
    ts: record.ts,
    kind: record.kind,
    level: record.level,
    stage: record.stage,
    message: record.message,
    detailTail: tailProbeText(record.detail),
    errorName: record.errorName,
    code: record.code,
    data: record.data,
    raw: compactTransportSnapshot(
      (record.raw || null) as AcpConnectionTransportSnapshot | null,
    ),
  };
}

function compactCloseEvent(event: unknown) {
  if (!event || typeof event !== "object") {
    return event || null;
  }
  const record = event as Record<string, unknown>;
  return {
    message: record.message,
    exitCode: record.exitCode,
    stdoutTail: tailProbeText(record.stdoutText),
    stderrTail: tailProbeText(record.stderrText),
    stdoutChars: normalizeString(record.stdoutText).length,
    stderrChars: normalizeString(record.stderrText).length,
    lifecycle: record.transportLifecycle || null,
  };
}

type AcpRuntimeOptionsCache = NonNullable<
  NonNullable<BackendInstance["acp"]>["runtimeOptionsCache"]
>;

function withDefaultReasoningCatalogEntry(args: {
  cache: ReturnType<typeof buildAcpRuntimeOptionsCache>;
  fingerprint: string;
  liveConfiguration: boolean;
}): AcpRuntimeOptionsCache {
  if (!args.liveConfiguration) {
    return args.cache;
  }
  const refreshedAt = normalizeString(args.cache.refreshedAt);
  return {
    ...args.cache,
    reasoningCatalogs: [
      {
        modelId: normalizeString(args.cache.currentRawModelId),
        modeId: normalizeString(args.cache.currentModeId),
        configFingerprint: args.fingerprint,
        revision: normalizeString(args.cache.revision) || refreshedAt,
        refreshedAt,
        reasoningSource: args.cache.reasoningSource,
        reasoningEfforts: (args.cache.reasoningEfforts || []).map((entry) => ({
          ...entry,
        })),
        currentReasoningEffortId: normalizeString(
          args.cache.currentReasoningEffortId,
        ),
      },
    ],
  };
}

export async function probeAcpBackendRuntimeOptions(args: {
  backend: BackendInstance;
  createAdapter?: typeof createAcpConnectionAdapter;
  now?: () => string;
  timeoutMs?: number;
  signal?: CancellationSignal;
}): Promise<AcpBackendProbeResult> {
  const createAdapter = args.createAdapter || createAcpConnectionAdapter;
  const timestamp = args.now?.() || new Date().toISOString();
  const timeoutMs =
    args.timeoutMs || ACP_BACKEND_RUNTIME_OPTIONS_PROBE_TIMEOUT_MS;
  // One total budget spans directory setup, launch, session and cleanup, so a
  // slow phase cannot borrow time from the next one.
  const deadline = Date.now() + timeoutMs;
  const remainingMs = () => Math.max(0, deadline - Date.now());
  const runBounded = <T>(
    promise: Promise<T>,
    phase: string,
    onLateFulfilled?: (value: T) => void | Promise<void>,
  ) =>
    waitForBoundedPromise(promise, {
      phase,
      timeoutMs: remainingMs(),
      signal: args.signal,
      ...(onLateFulfilled ? { onLateFulfilled } : {}),
    });
  const fingerprint = computeAcpBackendConfigFingerprint(args.backend);
  const paths = getRuntimePersistencePaths();
  const safeBackendId = normalizeString(args.backend.id).replace(
    /[^A-Za-z0-9_.-]+/g,
    "-",
  );
  const runRoot = joinPath(
    paths.tmpDir,
    "acp-backend-probe",
    safeBackendId || "backend",
  );
  const workspaceDir = joinPath(runRoot, "workspace");
  const runtimeDir = joinPath(runRoot, "runtime");
  const auditRuntimeDir = joinPath(runtimeDir, ".acp");
  const auditFiles = resolveAcpSkillRunAuditTrailFiles(auditRuntimeDir);
  const detailedAuditEnabled = shouldWriteDetailedAcpAuditArtifacts();
  let adapter: AcpConnectionAdapter | null = null;
  const adapterDiagnostics: unknown[] = [];
  const adapterCloseEvents: unknown[] = [];
  const unsubscribers: Array<() => void> = [];
  const pushLimited = (target: unknown[], value: unknown) => {
    target.push(value);
    while (target.length > ACP_BACKEND_PROBE_DIAGNOSTIC_LIMIT) {
      target.shift();
    }
  };
  appendAcpProbeLog({
    backend: args.backend,
    level: "info",
    stage: "acp-runtime-options-probe-started",
    message: "ACP backend runtime options probe started",
    details: {
      command: normalizeString(args.backend.command),
      argCount: normalizeStringArray(args.backend.args).length,
      envKeys: Object.keys(normalizeStringMap(args.backend.env)).sort(),
      workspaceDir,
      runtimeDir,
      auditFiles,
      configFingerprint: fingerprint,
    },
  });
  const fail = (error: unknown): AcpBackendProbeResult => {
    const message =
      error instanceof Error ? error.message : String(error || "unknown error");
    appendAcpProbeLog({
      backend: args.backend,
      level: "warn",
      stage: "acp-runtime-options-probe-failed",
      message,
      details: {
        workspaceDir,
        runtimeDir,
        auditFiles,
        configFingerprint: fingerprint,
        adapterDiagnostics,
        adapterCloseEvents,
        transportSnapshot: compactTransportSnapshot(
          adapter?.getTransportSnapshot?.() ||
            ((error as { transportSnapshot?: AcpConnectionTransportSnapshot })
              ?.transportSnapshot ??
              null),
        ),
      },
      error,
    });
    return {
      ok: false,
      error: message,
      backend: {
        ...args.backend,
        acp: {
          ...(args.backend.acp || {}),
          connectionTest: {
            status: "failed",
            testedAt: timestamp,
            configFingerprint: fingerprint,
            error: message,
          },
          runtimeOptionsCache: preserveExistingRuntimeOptionsCache(
            args.backend,
          ),
        },
      },
    };
  };
  let outcome: AcpBackendProbeResult;
  try {
    await runBounded(
      ensureRuntimeDirectory(runRoot),
      "ACP backend probe setup",
    );
    await runBounded(
      ensureRuntimeDirectory(workspaceDir),
      "ACP backend probe setup",
    );
    await runBounded(
      ensureRuntimeDirectory(runtimeDir),
      "ACP backend probe setup",
    );
    adapter = await runBounded(
      createAdapter({
        backend: args.backend,
        agentWorkspaceDir: workspaceDir,
        sessionCwd: workspaceDir,
        workspaceDir,
        runtimeDir,
        startup: {
          signal: args.signal,
          timeoutMs: remainingMs(),
        },
        diagnosticCapture: detailedAuditEnabled
          ? {
              bridgeAuditFile: auditFiles.bridge,
              onAuditEvent: (event) =>
                appendAcpSkillRunTransportAuditEvent({
                  requestId:
                    normalizeString(args.backend.id) || "acp-backend-probe",
                  runtimeDir: auditRuntimeDir,
                  event,
                }),
            }
          : undefined,
      }),
      "ACP backend adapter launch",
      // A launch that lands after the total budget must not leak a live adapter.
      (lateAdapter) =>
        waitForBoundedPromise(lateAdapter.close(), {
          phase: "ACP backend late adapter close",
          timeoutMs: ACP_BACKEND_PROBE_CLEANUP_TIMEOUT_MS,
        }).catch(() => undefined),
    );
    unsubscribers.push(
      adapter.onDiagnostics((entry) => {
        pushLimited(adapterDiagnostics, compactAdapterDiagnostic(entry));
      }),
      adapter.onClose((event) => {
        pushLimited(adapterCloseEvents, compactCloseEvent(event));
      }),
    );
    await runBounded(adapter.initialize(), "ACP backend initialize");
    const session = await runBounded(
      adapter.newSession(),
      "ACP backend session/new",
    );
    // A session that declares no runtime selectors says nothing about the
    // catalog, so the recorded one keeps serving the form.
    const liveConfiguration =
      session.configOptions != null ||
      session.modes != null ||
      session.models != null;
    const runtimeOptionsCache = liveConfiguration
      ? withDefaultReasoningCatalogEntry({
          cache: buildAcpRuntimeOptionsCache({
            configOptions: session.configOptions,
            modes: session.modes,
            models: session.models,
            refreshedAt: timestamp,
          }),
          fingerprint,
          liveConfiguration: true,
        })
      : preserveExistingRuntimeOptionsCache(args.backend) ||
        buildAcpRuntimeOptionsCache({ refreshedAt: timestamp });
    appendAcpProbeLog({
      backend: args.backend,
      level: "info",
      stage: "acp-runtime-options-probe-ok",
      message: "ACP backend runtime options cache refreshed",
      details: {
        sessionId: session.sessionId,
        workspaceDir,
        runtimeDir,
        configFingerprint: fingerprint,
        cache: summarizeAcpRuntimeOptionsCache(runtimeOptionsCache),
      },
    });
    outcome = {
      ok: true,
      backend: {
        ...args.backend,
        acp: {
          ...(args.backend.acp || {}),
          connectionTest: {
            status: "passed",
            testedAt: timestamp,
            configFingerprint: fingerprint,
          },
          runtimeOptionsCache,
        },
      },
    };
  } catch (error) {
    outcome = fail(error);
  } finally {
    for (const unsubscribe of unsubscribers.splice(0)) {
      try {
        unsubscribe();
      } catch {
        // ignore listener cleanup errors
      }
    }
    // Cleanup stays inside the total budget and never runs unbounded.
    await waitForBoundedPromise(adapter?.close() || Promise.resolve(), {
      phase: "ACP backend close",
      timeoutMs: Math.min(ACP_BACKEND_PROBE_CLEANUP_TIMEOUT_MS, remainingMs()),
    }).catch(() => undefined);
    await waitForBoundedPromise(
      releaseAcpSkillRunAuditTrailWrites(auditRuntimeDir),
      {
        phase: "ACP backend probe audit drain",
        timeoutMs: Math.min(
          ACP_BACKEND_PROBE_CLEANUP_TIMEOUT_MS,
          remainingMs(),
        ),
      },
    ).catch(() => undefined);
  }
  // Publication happens after cleanup: a cancellation or an expired budget that
  // landed during launch, session reading or cleanup must not publish a catalog.
  if (outcome.ok && (args.signal?.aborted || remainingMs() === 0)) {
    outcome = fail(
      args.signal?.aborted
        ? new Error("ACP backend runtime options probe canceled")
        : new Error("ACP backend runtime options probe timed out"),
    );
  }
  return outcome;
}
