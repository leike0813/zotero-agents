import type { BackendInstance } from "../backends/types";
import {
  createAcpConnectionAdapter,
  type AcpConnectionAdapter,
  type AcpConnectionTransportSnapshot,
} from "./acpConnectionAdapter";
import type {
  AcpSessionConfigOption,
  SessionModelState,
  SessionModeState,
} from "./acpProtocol";
import {
  foldAcpModelOptions,
  normalizeAcpModelOption,
  type AcpSelectableOption,
} from "./acpModelOptionFolding";
import {
  buildAcpRuntimeOptionsStateFromConfigOptions,
  hasAcpRuntimeOptionSelectors,
} from "./acpSessionConfigOptions";
import {
  appendAcpSkillRunTransportAuditEvent,
  resolveAcpSkillRunAuditTrailFiles,
  shouldWriteDetailedAcpAuditArtifacts,
} from "./acpSkillRunAuditTrail";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
} from "./runtimePersistence";
import { joinPath } from "../utils/path";
import { appendRuntimeLog } from "./runtimeLogManager";

export type AcpBackendProbeResult = {
  ok: boolean;
  backend: BackendInstance;
  error?: string;
};

const ACP_BACKEND_RUNTIME_OPTIONS_PROBE_TIMEOUT_MS = 180_000;
const ACP_BACKEND_PROBE_DIAGNOSTIC_LIMIT = 12;
const ACP_BACKEND_PROBE_TEXT_TAIL_CHARS = 4_000;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return value.map((entry) => normalizeString(entry)).filter(Boolean);
}

function normalizeStringMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(
        ([key, entry]) =>
          [normalizeString(key), normalizeString(entry)] as const,
      )
      .filter(([key, entry]) => key && entry),
  );
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function fnv1a32(input: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function computeAcpBackendConfigFingerprint(backend: BackendInstance) {
  return `acp-${fnv1a32(
    stableJson({
      command: normalizeString(backend.command),
      args: normalizeStringArray(backend.args),
      env: normalizeStringMap(backend.env),
      agentFamily: normalizeString(backend.acp?.agentFamily),
      skillRoots: normalizeStringArray(backend.acp?.skillRoots),
    }),
  )}`;
}

export function isAcpBackendConnectionTestPassed(backend: BackendInstance) {
  const acp = backend.acp;
  const test = acp?.connectionTest;
  if (!test || test.status !== "passed") {
    return false;
  }
  return (
    normalizeString(test.configFingerprint) ===
    computeAcpBackendConfigFingerprint(backend)
  );
}

export function markAcpBackendConnectionState(
  backend: BackendInstance,
): BackendInstance {
  const test = backend.acp?.connectionTest;
  if (!test) {
    return backend;
  }
  const fingerprint = computeAcpBackendConfigFingerprint(backend);
  if (normalizeString(test.configFingerprint) === fingerprint) {
    return backend;
  }
  return {
    ...backend,
    acp: {
      ...(backend.acp || {}),
      connectionTest: {
        ...test,
        status: "stale",
        configFingerprint: normalizeString(test.configFingerprint),
        error: "ACP backend configuration changed; rerun connection test.",
      },
    },
  };
}

function normalizeModeOptions(modes?: SessionModeState | null) {
  const availableModes = Array.isArray(modes?.availableModes)
    ? modes!.availableModes
        .map((entry) => ({
          id: normalizeString(entry.id),
          label: normalizeString(entry.name || entry.id),
          description: normalizeString(entry.description) || undefined,
        }))
        .filter((entry) => entry.id && entry.label)
    : [];
  return {
    modeOptions: availableModes,
    currentModeId: normalizeString(modes?.currentModeId),
  };
}

export function buildAcpRuntimeOptionsCache(args: {
  configOptions?: AcpSessionConfigOption[] | null;
  modes?: SessionModeState | null;
  models?: SessionModelState | null;
  refreshedAt?: string;
}) {
  const configOptionState = buildAcpRuntimeOptionsStateFromConfigOptions(
    args.configOptions,
  );
  if (hasAcpRuntimeOptionSelectors(configOptionState)) {
    return {
      refreshedAt: args.refreshedAt || new Date().toISOString(),
      ...configOptionState,
    };
  }
  const modeState = normalizeModeOptions(args.modes);
  const rawModelOptions = Array.isArray(args.models?.availableModels)
    ? args
        .models!.availableModels.map(normalizeAcpModelOption)
        .filter((entry) => entry.id && entry.label)
    : ([] as AcpSelectableOption[]);
  const folded = foldAcpModelOptions({
    modelOptions: rawModelOptions,
    currentModelId: normalizeString(args.models?.currentModelId),
  });
  return {
    refreshedAt: args.refreshedAt || new Date().toISOString(),
    modes: modeState.modeOptions,
    currentModeId: modeState.currentModeId,
    rawModels: rawModelOptions,
    currentRawModelId: normalizeString(args.models?.currentModelId),
    displayModels: folded.displayModelOptions,
    currentDisplayModelId: folded.currentDisplayModel?.id || "",
    reasoningEfforts: folded.reasoningEffortOptions,
    currentReasoningEffortId: folded.currentReasoningEffort?.id || "",
  };
}

function selectRuntimeOptionsCache(args: {
  backend: BackendInstance;
  cache: NonNullable<BackendInstance["acp"]>["runtimeOptionsCache"];
}) {
  if (hasAcpRuntimeOptionSelectors(args.cache || {})) {
    return args.cache;
  }
  const existing = args.backend.acp?.runtimeOptionsCache;
  return existing && hasAcpRuntimeOptionSelectors(existing)
    ? existing
    : args.cache;
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

export async function probeAcpBackendRuntimeOptions(args: {
  backend: BackendInstance;
  createAdapter?: typeof createAcpConnectionAdapter;
  now?: () => string;
  timeoutMs?: number;
}): Promise<AcpBackendProbeResult> {
  const createAdapter = args.createAdapter || createAcpConnectionAdapter;
  const timestamp = args.now?.() || new Date().toISOString();
  const timeoutMs =
    args.timeoutMs || ACP_BACKEND_RUNTIME_OPTIONS_PROBE_TIMEOUT_MS;
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
  const workspaceDir = joinPath(root, "workspace");
  const runtimeDir = joinPath(root, "runtime");
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
    await ensureRuntimeDirectory(root);
    await ensureRuntimeDirectory(workspaceDir);
    await ensureRuntimeDirectory(runtimeDir);
    adapter = await createAdapter({
      backend: args.backend,
      agentWorkspaceDir: workspaceDir,
      sessionCwd: workspaceDir,
      workspaceDir,
      runtimeDir,
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
    });
    unsubscribers.push(
      adapter.onDiagnostics((entry) => {
        pushLimited(adapterDiagnostics, compactAdapterDiagnostic(entry));
      }),
      adapter.onClose((event) => {
        pushLimited(adapterCloseEvents, compactCloseEvent(event));
      }),
    );
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
    const selectedCache = selectRuntimeOptionsCache({
      backend: args.backend,
      cache,
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
        cache: summarizeAcpRuntimeOptionsCache(selectedCache),
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
          runtimeOptionsCache: selectedCache,
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
    await adapter?.close().catch(() => undefined);
  }
}
