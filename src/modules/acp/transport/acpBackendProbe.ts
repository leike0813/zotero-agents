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
import { ACP_RUNTIME_OPTIONS_CACHE_TTL_MS } from "../chat/acpReasoningCatalog";
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
const ACP_BACKEND_TARGETED_PROBE_TIMEOUT_MS = 60_000;
const ACP_BACKEND_TARGETED_CLEANUP_TIMEOUT_MS = 1_000;
const ACP_REASONING_CATALOG_LIMIT = 16;
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

function buildProbeRunNonce() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function isStaleRuntimeOptionsRefreshedAt(value: unknown) {
  const ms = Date.parse(normalizeString(value));
  return (
    !Number.isFinite(ms) || Date.now() - ms > ACP_RUNTIME_OPTIONS_CACHE_TTL_MS
  );
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

function withProbeTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

export type AcpBackendProbeSelectedOptions = {
  acpModeId?: string;
  acpModelId?: string;
};

type AcpRuntimeOptionsCache = NonNullable<
  NonNullable<BackendInstance["acp"]>["runtimeOptionsCache"]
>;

type AcpReasoningCatalogEntry = NonNullable<
  AcpRuntimeOptionsCache["reasoningCatalogs"]
>[number];

function deriveSelectedRuntimeOptionsState(args: {
  configOptions: AcpSessionConfigOption[] | null;
  modes: SessionModeState | null;
  models: SessionModelState | null;
}) {
  return resolveAcpRuntimeOptionsState({
    ...(args.configOptions !== null
      ? { configOptions: args.configOptions }
      : {}),
    ...(args.modes !== null ? { modes: args.modes } : {}),
    ...(args.models !== null ? { models: args.models } : {}),
  });
}

function mergeAcpReasoningCatalogEntry(args: {
  existing: AcpRuntimeOptionsCache["reasoningCatalogs"];
  entry: AcpReasoningCatalogEntry;
  fingerprint: string;
  revision: string;
}) {
  const kept = (Array.isArray(args.existing) ? args.existing : []).filter(
    (entry) =>
      normalizeString(entry.configFingerprint) === args.fingerprint &&
      normalizeString(entry.revision) === args.revision &&
      !(
        normalizeString(entry.modelId) === args.entry.modelId &&
        normalizeString(entry.modeId) === args.entry.modeId
      ),
  );
  return [...kept, args.entry].slice(-ACP_REASONING_CATALOG_LIMIT);
}

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

async function probeAcpBackendSelectedContext(args: {
  backend: BackendInstance;
  adapter: AcpConnectionAdapter;
  selectedOptions: AcpBackendProbeSelectedOptions;
  signal?: CancellationSignal;
  deadline: number;
  timestamp: string;
  fingerprint: string;
  unsubscribers: Array<() => void>;
}): Promise<AcpBackendProbeResult> {
  const { adapter, backend, fingerprint, timestamp } = args;
  const selectedModeId = normalizeString(args.selectedOptions.acpModeId);
  const selectedModelId = normalizeString(args.selectedOptions.acpModelId);
  const runPhase = <T>(promise: Promise<T>, phase: string) =>
    waitForBoundedPromise(promise, {
      phase,
      timeoutMs: Math.max(0, args.deadline - Date.now()),
      signal: args.signal,
    });
  await runPhase(adapter.initialize(), "ACP backend initialize");
  let latestConfigOptions: AcpSessionConfigOption[] | null = null;
  let latestModes: SessionModeState | null = null;
  let latestModels: SessionModelState | null = null;
  const session = await runPhase(
    adapter.newSession(),
    "ACP backend session/new",
  );
  const sessionConfigOptions = session.configOptions || null;
  const sessionModes = session.modes || null;
  const sessionModels = session.models || null;
  latestConfigOptions = sessionConfigOptions;
  latestModes = sessionModes;
  latestModels = sessionModels;
  const sessionId = normalizeString(session.sessionId);
  let appliedModeId = "";
  let appliedModelId = "";
  // The adapter republishes every config setter response as a config_option_update,
  // so the latest snapshot describes the selected context after each setter. Backends
  // without config options still confirm native setters through these updates.
  args.unsubscribers.push(
    adapter.onUpdate((event) => {
      const eventSessionId = normalizeString(event?.sessionId);
      if (eventSessionId && eventSessionId !== sessionId) {
        return;
      }
      const update = event?.update as
        | {
            sessionUpdate?: string;
            configOptions?: AcpSessionConfigOption[] | null;
            currentModeId?: string | null;
            currentModelId?: string | null;
          }
        | undefined;
      const kind = normalizeString(update?.sessionUpdate);
      if (
        kind === "config_option_update" &&
        Array.isArray(update?.configOptions)
      ) {
        latestConfigOptions = update.configOptions;
        return;
      }
      if (kind === "current_mode_update") {
        latestModes = {
          ...(latestModes || { availableModes: [] }),
          currentModeId: normalizeString(update?.currentModeId),
        };
        return;
      }
      if (kind === "current_model_update") {
        latestModels = {
          ...(latestModels || { availableModels: [] }),
          currentModelId: normalizeString(update?.currentModelId),
        };
      }
    }),
  );
  const snapshot = () =>
    deriveSelectedRuntimeOptionsState({
      configOptions: latestConfigOptions,
      modes: latestModes,
      models: latestModels,
    });
  const observedConfiguration =
    latestConfigOptions !== null ||
    latestModes !== null ||
    latestModels !== null;
  const before = snapshot();
  if (
    selectedModeId &&
    selectedModeId !== before.currentModeId &&
    before.modes.some((entry) => entry.id === selectedModeId)
  ) {
    await runPhase(
      adapter.setMode({ sessionId, modeId: selectedModeId }),
      "ACP backend session/set_mode",
    );
    appliedModeId = selectedModeId;
  }
  const afterMode = snapshot();
  if (
    selectedModelId &&
    selectedModelId !== (appliedModelId || afterMode.currentRawModelId) &&
    afterMode.rawModels.some((entry) => entry.id === selectedModelId)
  ) {
    await runPhase(
      adapter.setModel({ sessionId, modelId: selectedModelId }),
      "ACP backend session/set_model",
    );
    appliedModelId = selectedModelId;
  }
  const confirmed = snapshot();
  const currentModelId = appliedModelId || confirmed.currentRawModelId;
  const currentModeId = appliedModeId || confirmed.currentModeId;
  const cacheBefore = backend.acp?.runtimeOptionsCache;
  // An absent runtime option cache, or one that expired or went stale, cannot
  // describe the backend any more, so the session snapshot replaces its defaults.
  const connectionFingerprint = normalizeString(
    backend.acp?.connectionTest?.configFingerprint,
  );
  const refreshDefaults =
    !cacheBefore ||
    (!normalizeString(cacheBefore.revision) &&
      !normalizeString(cacheBefore.refreshedAt)) ||
    isStaleRuntimeOptionsRefreshedAt(cacheBefore.refreshedAt) ||
    cacheBefore.status === "stale" ||
    cacheBefore.status === "unavailable" ||
    // A passed test for another configuration means the recorded mode and model
    // catalog belongs to that older configuration.
    (!!connectionFingerprint && connectionFingerprint !== fingerprint);
  const refreshedCache =
    refreshDefaults && observedConfiguration
      ? withDefaultReasoningCatalogEntry({
          cache: buildAcpRuntimeOptionsCache({
            configOptions: sessionConfigOptions,
            modes: sessionModes,
            models: sessionModels,
            refreshedAt: timestamp,
          }),
          fingerprint,
          liveConfiguration: true,
        })
      : null;
  const cache = refreshedCache || cacheBefore;
  // A session may omit a dimension the resolver keys its context on; the recorded
  // catalog value is then the only evidence for that part of the context.
  const modelId =
    selectedModelId ||
    currentModelId ||
    normalizeString(cache?.currentRawModelId);
  const modeId =
    selectedModeId || currentModeId || normalizeString(cache?.currentModeId);
  // A native setter leaves the captured snapshot describing the previous context;
  // its reasoning options only stay authoritative when it declares no reasoning axis.
  const staleOverride =
    (!!appliedModelId && appliedModelId !== confirmed.currentRawModelId) ||
    (!!appliedModeId && appliedModeId !== confirmed.currentModeId);
  const unresolved =
    !observedConfiguration ||
    (!!selectedModelId && currentModelId !== selectedModelId) ||
    (!!selectedModeId && currentModeId !== selectedModeId) ||
    (staleOverride && confirmed.reasoningSource !== "none");
  if (!cache || unresolved) {
    appendAcpProbeLog({
      backend,
      level: "warn",
      stage: "acp-runtime-options-targeted-probe-unresolved",
      message:
        "ACP backend did not confirm the selected model/mode configuration",
      details: { sessionId, modelId, modeId, configFingerprint: fingerprint },
    });
    return {
      ok: false,
      error: `ACP backend did not confirm the selected configuration (model="${modelId}", mode="${modeId}").`,
      backend,
    };
  }
  const revision =
    normalizeString(cache.revision) ||
    normalizeString(cache.refreshedAt) ||
    timestamp;
  const entry: AcpReasoningCatalogEntry = {
    modelId,
    modeId,
    configFingerprint: fingerprint,
    revision,
    refreshedAt: timestamp,
    reasoningSource: confirmed.reasoningSource,
    reasoningEfforts: confirmed.reasoningEfforts.map((effort) => ({
      ...effort,
    })),
    currentReasoningEffortId: confirmed.currentReasoningEffortId,
  };
  appendAcpProbeLog({
    backend,
    level: "info",
    stage: "acp-runtime-options-targeted-probe-ok",
    message: "ACP backend reasoning catalog entry refreshed",
    details: {
      sessionId,
      modelId,
      modeId,
      configFingerprint: fingerprint,
      reasoningSource: entry.reasoningSource,
      reasoningEfforts: entry.reasoningEfforts?.length || 0,
    },
  });
  return {
    ok: true,
    backend: {
      ...backend,
      acp: {
        ...(backend.acp || {}),
        runtimeOptionsCache: {
          ...cache,
          revision,
          reasoningCatalogs: mergeAcpReasoningCatalogEntry({
            existing: cache.reasoningCatalogs,
            entry,
            fingerprint,
            revision,
          }),
        },
      },
    },
  };
}

export async function probeAcpBackendRuntimeOptions(args: {
  backend: BackendInstance;
  createAdapter?: typeof createAcpConnectionAdapter;
  now?: () => string;
  timeoutMs?: number;
  selectedOptions?: AcpBackendProbeSelectedOptions;
  signal?: CancellationSignal;
}): Promise<AcpBackendProbeResult> {
  const createAdapter = args.createAdapter || createAcpConnectionAdapter;
  const timestamp = args.now?.() || new Date().toISOString();
  const targeted = !!args.selectedOptions;
  const timeoutMs =
    args.timeoutMs ||
    (targeted
      ? ACP_BACKEND_TARGETED_PROBE_TIMEOUT_MS
      : ACP_BACKEND_RUNTIME_OPTIONS_PROBE_TIMEOUT_MS);
  // Targeted probes run one total budget that starts before directory setup and launch.
  const deadline = targeted ? Date.now() + timeoutMs : Number.POSITIVE_INFINITY;
  const runSetup = <T>(
    promise: Promise<T>,
    phase: string,
    onLateFulfilled?: (value: T) => void | Promise<void>,
  ) =>
    targeted
      ? waitForBoundedPromise(promise, {
          phase,
          timeoutMs: Math.max(0, deadline - Date.now()),
          signal: args.signal,
          ...(onLateFulfilled ? { onLateFulfilled } : {}),
        })
      : promise;
  const fingerprint = computeAcpBackendConfigFingerprint(args.backend);
  const paths = getRuntimePersistencePaths();
  const safeBackendId = normalizeString(args.backend.id).replace(
    /[^A-Za-z0-9_.-]+/g,
    "-",
  );
  const root = joinPath(
    paths.tmpDir,
    "acp-backend-probe",
    safeBackendId || "backend",
  );
  // Concurrent form and connection-test owners target the same backend, so a
  // targeted probe must never share the full probe's workspace and runtime dirs.
  const runRoot = targeted
    ? joinPath(root, `targeted-${buildProbeRunNonce()}`)
    : root;
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
  try {
    await runSetup(ensureRuntimeDirectory(runRoot), "ACP backend probe setup");
    await runSetup(
      ensureRuntimeDirectory(workspaceDir),
      "ACP backend probe setup",
    );
    await runSetup(
      ensureRuntimeDirectory(runtimeDir),
      "ACP backend probe setup",
    );
    adapter = await runSetup(
      createAdapter({
        backend: args.backend,
        agentWorkspaceDir: workspaceDir,
        sessionCwd: workspaceDir,
        workspaceDir,
        runtimeDir,
        startup: targeted
          ? {
              signal: args.signal,
              timeoutMs: Math.max(0, deadline - Date.now()),
            }
          : undefined,
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
      (lateAdapter) => lateAdapter.close().catch(() => undefined),
    );
    unsubscribers.push(
      adapter.onDiagnostics((entry) => {
        pushLimited(adapterDiagnostics, compactAdapterDiagnostic(entry));
      }),
      adapter.onClose((event) => {
        pushLimited(adapterCloseEvents, compactCloseEvent(event));
      }),
    );
    if (args.selectedOptions) {
      return await probeAcpBackendSelectedContext({
        backend: args.backend,
        adapter,
        selectedOptions: args.selectedOptions,
        signal: args.signal,
        deadline,
        timestamp,
        fingerprint,
        unsubscribers,
      });
    }
    await withProbeTimeout(
      adapter.initialize(),
      timeoutMs,
      "ACP backend initialize",
    );
    const session = await withProbeTimeout(
      adapter.newSession(),
      timeoutMs,
      "ACP backend session/new",
    );
    const cache = buildAcpRuntimeOptionsCache({
      configOptions: session.configOptions,
      modes: session.modes,
      models: session.models,
      refreshedAt: timestamp,
    });
    const runtimeOptionsCache = withDefaultReasoningCatalogEntry({
      cache,
      fingerprint,
      liveConfiguration:
        session.configOptions != null ||
        session.modes != null ||
        session.models != null,
    });
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
        cache: summarizeAcpRuntimeOptionsCache(cache),
      },
    });
    return {
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
  } finally {
    for (const unsubscribe of unsubscribers.splice(0)) {
      try {
        unsubscribe();
      } catch {
        // ignore listener cleanup errors
      }
    }
    if (targeted) {
      // Cleanup uses the remaining total budget, capped to a small grace.
      await waitForBoundedPromise(adapter?.close() || Promise.resolve(), {
        phase: "ACP backend close",
        timeoutMs: Math.min(
          ACP_BACKEND_TARGETED_CLEANUP_TIMEOUT_MS,
          Math.max(0, deadline - Date.now()),
        ),
      }).catch(() => undefined);
      await waitForBoundedPromise(
        releaseAcpSkillRunAuditTrailWrites(auditRuntimeDir),
        {
          phase: "ACP backend probe audit drain",
          timeoutMs: Math.min(
            ACP_BACKEND_TARGETED_CLEANUP_TIMEOUT_MS,
            Math.max(0, deadline - Date.now()),
          ),
        },
      ).catch(() => undefined);
    } else {
      await adapter?.close().catch(() => undefined);
      await releaseAcpSkillRunAuditTrailWrites(auditRuntimeDir).catch(
        () => undefined,
      );
    }
  }
}
