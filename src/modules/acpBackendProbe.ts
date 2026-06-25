import type { BackendInstance } from "../backends/types";
import {
  createAcpConnectionAdapter,
  type AcpConnectionAdapter,
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
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
} from "./runtimePersistence";
import { joinPath } from "../utils/path";

export type AcpBackendProbeResult = {
  ok: boolean;
  backend: BackendInstance;
  error?: string;
};

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

export async function probeAcpBackendRuntimeOptions(args: {
  backend: BackendInstance;
  createAdapter?: typeof createAcpConnectionAdapter;
  now?: () => string;
}): Promise<AcpBackendProbeResult> {
  const createAdapter = args.createAdapter || createAcpConnectionAdapter;
  const timestamp = args.now?.() || new Date().toISOString();
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
  let adapter: AcpConnectionAdapter | null = null;
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
    });
    await adapter.initialize();
    const session = await adapter.newSession();
    const cache = buildAcpRuntimeOptionsCache({
      configOptions: session.configOptions,
      modes: session.modes,
      models: session.models,
      refreshedAt: timestamp,
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
          runtimeOptionsCache: selectRuntimeOptionsCache({
            backend: args.backend,
            cache,
          }),
        },
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "unknown error");
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
    await adapter?.close().catch(() => undefined);
  }
}
