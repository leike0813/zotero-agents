import type { BackendInstance } from "../../backends/types";
import {
  loadBackendsRegistry,
  loadBackendsRegistrySync,
} from "../../backends/registry";
import { getPref, setPref } from "../../utils/prefs";
import { appendRuntimeLog } from "../../modules/runtimeLogManager";
import { resolveRuntimeHostCapabilities } from "../../utils/runtimeBridge";
import {
  BoundedWaitError,
  createCancellationController,
  resolveNativeAbortControllerConstructor,
  waitForBoundedPromise,
} from "../../utils/wait";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type SkillRunnerModelCacheModel = {
  id: string;
  display_name: string;
  deprecated?: boolean;
  provider_id?: string;
  provider?: string;
  model?: string;
  supported_effort?: string[];
};

export type SkillRunnerModelCacheEntry = {
  backendId: string;
  baseUrl: string;
  updatedAt: string;
  engines: string[];
  modelsByEngine: Record<string, SkillRunnerModelCacheModel[]>;
};

type SkillRunnerModelCacheDocument = {
  version: 1;
  entries: SkillRunnerModelCacheEntry[];
};

const SKILLRUNNER_MODEL_CACHE_PREF_KEY = "skillRunnerModelCacheJson";
const SKILLRUNNER_MODEL_CACHE_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const SKILLRUNNER_BACKEND_TYPE = "skillrunner";

let modelCacheRefreshTimer: ReturnType<typeof setInterval> | null = null;
let modelCacheRefreshClearTimer: typeof clearInterval = clearInterval;
let modelCacheRefreshLifetime = createCancellationController();

type ModelCacheRefreshResult = {
  ok: boolean;
  backendId: string;
  baseUrl: string;
  refreshedAt?: string;
  error?: string;
};

const modelCacheRefreshes = new Map<
  string,
  {
    identity: string;
    promise: Promise<ModelCacheRefreshResult>;
    cancel: () => void;
  }
>();

function normalizeBaseUrl(baseUrl: unknown) {
  return String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");
}

function toIsoNow() {
  return new Date().toISOString();
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function splitProviderModel(value: string): {
  provider: string;
  model: string;
} | null {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }
  const index = normalized.indexOf("/");
  if (index <= 0 || index >= normalized.length - 1) {
    return null;
  }
  const provider = normalized.slice(0, index).trim();
  const model = normalized.slice(index + 1).trim();
  if (!provider || !model) {
    return null;
  }
  return {
    provider,
    model,
  };
}

function normalizeSupportedEffort(raw: unknown) {
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const normalized = Array.from(
    new Set(raw.map((entry) => String(entry || "").trim()).filter(Boolean)),
  );
  return normalized.length > 0 ? normalized : undefined;
}

function readJsonOrThrow(response: Response, path: string) {
  return response.text().then((text) => {
    let parsed: unknown = {};
    if (text.trim()) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
    }
    if (!response.ok) {
      throw new Error(
        `SkillRunner model cache refresh failed: path=${path}, status=${response.status}, body=${JSON.stringify(parsed)}`,
      );
    }
    return parsed;
  });
}

function parseModelCacheEntry(raw: unknown): SkillRunnerModelCacheEntry | null {
  if (!isObjectRecord(raw)) {
    return null;
  }
  const backendId = String(raw.backendId || "").trim();
  const baseUrl = normalizeBaseUrl(raw.baseUrl);
  const updatedAt = String(raw.updatedAt || "").trim();
  const enginesRaw = Array.isArray(raw.engines) ? raw.engines : [];
  const engines = Array.from(
    new Set(
      enginesRaw.map((engine) => String(engine || "").trim()).filter(Boolean),
    ),
  );
  const modelsByEngineRaw = isObjectRecord(raw.modelsByEngine)
    ? raw.modelsByEngine
    : {};
  const modelsByEngine: Record<string, SkillRunnerModelCacheModel[]> = {};
  for (const [engine, modelsRaw] of Object.entries(modelsByEngineRaw)) {
    const normalizedEngine = String(engine || "").trim();
    if (!normalizedEngine || !Array.isArray(modelsRaw)) {
      continue;
    }
    const normalizedModels: SkillRunnerModelCacheModel[] = [];
    for (const modelRaw of modelsRaw) {
      if (!isObjectRecord(modelRaw)) {
        continue;
      }
      const parsedFromId = splitProviderModel(String(modelRaw.id || "").trim());
      const providerIdRaw = String(modelRaw.provider_id || "").trim();
      const providerRaw = String(modelRaw.provider || "").trim();
      const modelRawValue = String(modelRaw.model || "").trim();
      const providerId =
        providerIdRaw || providerRaw || parsedFromId?.provider || "";
      const provider =
        providerRaw || providerId || parsedFromId?.provider || "";
      const model = modelRawValue || parsedFromId?.model || "";
      const supportedEffort = normalizeSupportedEffort(
        modelRaw.supported_effort,
      );
      const id =
        String(modelRaw.id || "").trim() ||
        (providerId && model ? `${providerId}/${model}` : "");
      if (!id) {
        continue;
      }
      const displayName = String(
        modelRaw.display_name || modelRaw.displayName || "",
      ).trim();
      normalizedModels.push({
        id,
        display_name: displayName || id,
        deprecated: modelRaw.deprecated === true,
        ...(providerId ? { provider_id: providerId } : {}),
        ...(provider ? { provider } : {}),
        ...(model ? { model } : {}),
        ...(supportedEffort ? { supported_effort: supportedEffort } : {}),
      });
    }
    if (normalizedModels.length > 0) {
      modelsByEngine[normalizedEngine] = normalizedModels;
    }
  }

  if (!backendId || !baseUrl) {
    return null;
  }
  return {
    backendId,
    baseUrl,
    updatedAt: updatedAt || toIsoNow(),
    engines,
    modelsByEngine,
  };
}

function readModelCacheDocument(): SkillRunnerModelCacheDocument {
  const raw = String(getPref(SKILLRUNNER_MODEL_CACHE_PREF_KEY) || "").trim();
  if (!raw) {
    return {
      version: 1,
      entries: [],
    };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObjectRecord(parsed)) {
      return {
        version: 1,
        entries: [],
      };
    }
    const rows = Array.isArray(parsed.entries) ? parsed.entries : [];
    const entries = rows
      .map((entry) => parseModelCacheEntry(entry))
      .filter(Boolean) as SkillRunnerModelCacheEntry[];
    return {
      version: 1,
      entries,
    };
  } catch {
    return {
      version: 1,
      entries: [],
    };
  }
}

function writeModelCacheDocument(doc: SkillRunnerModelCacheDocument) {
  setPref(SKILLRUNNER_MODEL_CACHE_PREF_KEY, JSON.stringify(doc));
}

function buildSkillRunnerRequestHeaders(backend: BackendInstance) {
  const headers: Record<string, string> = {};
  if (isObjectRecord(backend.defaults?.headers)) {
    for (const [key, value] of Object.entries(backend.defaults!.headers!)) {
      if (typeof value !== "string") {
        continue;
      }
      headers[key] = value;
    }
  }
  const authKind = String(backend.auth?.kind || "").trim();
  if (authKind === "bearer") {
    const token = String(backend.auth?.token || "").trim();
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

function modelCacheBackendIdentity(backend: BackendInstance | undefined) {
  return backend
    ? JSON.stringify([
        backend.type,
        backend.enabled !== false,
        normalizeBaseUrl(backend.baseUrl),
        Object.entries(buildSkillRunnerRequestHeaders(backend)).sort(
          ([left], [right]) => left.localeCompare(right),
        ),
      ])
    : "";
}

function countModelsByEngine(
  modelsByEngine: Record<string, SkillRunnerModelCacheModel[]>,
) {
  return Object.values(modelsByEngine).reduce(
    (total, models) => total + models.length,
    0,
  );
}

function appendSkillRunnerModelCacheLog(args: {
  backend: BackendInstance;
  backendId: string;
  baseUrl: string;
  level: "info" | "warn" | "error";
  stage: string;
  message: string;
  startedAt: number;
  details?: Record<string, unknown>;
  error?: unknown;
}) {
  appendRuntimeLog({
    level: args.level,
    scope: "provider",
    backendId: args.backendId,
    backendType:
      String(args.backend.type || "").trim() || SKILLRUNNER_BACKEND_TYPE,
    providerId: "skillrunner",
    component: "skillrunner-model-cache",
    operation: "refresh-skillrunner-model-cache",
    stage: args.stage,
    message: args.message,
    transport: {
      method: "GET",
      path: "/v1/engines",
      duration: Math.max(0, Date.now() - args.startedAt),
    },
    details: {
      baseUrl: args.baseUrl,
      ...args.details,
    },
    error: args.error,
  });
}

function parseEnginesPayload(payload: unknown) {
  const enginesRaw =
    isObjectRecord(payload) && Array.isArray(payload.engines)
      ? payload.engines
      : Array.isArray(payload)
        ? payload
        : [];
  const engines = enginesRaw
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }
      if (isObjectRecord(entry)) {
        return String(entry.engine || entry.id || "").trim();
      }
      return "";
    })
    .filter(Boolean);
  return Array.from(new Set(engines));
}

function parseEngineModelsPayload(payload: unknown) {
  const modelsRaw =
    isObjectRecord(payload) && Array.isArray(payload.models)
      ? payload.models
      : Array.isArray(payload)
        ? payload
        : [];
  const models: SkillRunnerModelCacheModel[] = [];
  for (const row of modelsRaw) {
    if (!isObjectRecord(row)) {
      continue;
    }
    const id = String(row.id || "").trim();
    const parsedFromId = splitProviderModel(id);
    const providerIdRaw = String(row.provider_id || "").trim();
    const providerRaw = String(row.provider || "").trim();
    const modelRawValue = String(row.model || "").trim();
    const providerId =
      providerIdRaw || providerRaw || parsedFromId?.provider || "";
    const provider = providerRaw || providerId || parsedFromId?.provider || "";
    const model = modelRawValue || parsedFromId?.model || "";
    const supportedEffort = normalizeSupportedEffort(row.supported_effort);
    const normalizedId =
      id || (providerId && model ? `${providerId}/${model}` : "");
    if (!normalizedId) {
      continue;
    }
    models.push({
      id: normalizedId,
      display_name:
        String(row.display_name || row.displayName || "").trim() ||
        normalizedId,
      deprecated: row.deprecated === true,
      ...(providerId ? { provider_id: providerId } : {}),
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
      ...(supportedEffort ? { supported_effort: supportedEffort } : {}),
    });
  }
  return models;
}

export function listSkillRunnerModelCacheEntries() {
  return readModelCacheDocument().entries.map((entry) => ({
    ...entry,
    engines: [...entry.engines],
    modelsByEngine: Object.fromEntries(
      Object.entries(entry.modelsByEngine).map(([engine, models]) => [
        engine,
        models.map((model) => ({ ...model })),
      ]),
    ),
  }));
}

export function getSkillRunnerModelCacheEntry(args: {
  backendId?: string;
  baseUrl?: string;
}) {
  const backendId = String(args.backendId || "").trim();
  const baseUrl = normalizeBaseUrl(args.baseUrl);
  const entries = readModelCacheDocument().entries;
  if (!backendId && !baseUrl) {
    return null;
  }
  let matched = entries.filter((entry) => {
    if (backendId && entry.backendId !== backendId) {
      return false;
    }
    if (baseUrl && normalizeBaseUrl(entry.baseUrl) !== baseUrl) {
      return false;
    }
    return true;
  });
  if (matched.length === 0) {
    return null;
  }
  matched = matched.sort((left, right) =>
    String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")),
  );
  const best = matched[0];
  return {
    ...best,
    engines: [...best.engines],
    modelsByEngine: Object.fromEntries(
      Object.entries(best.modelsByEngine).map(([engine, models]) => [
        engine,
        models.map((model) => ({ ...model })),
      ]),
    ),
  };
}

export function upsertSkillRunnerModelCacheEntry(
  entry: SkillRunnerModelCacheEntry,
) {
  const normalized = parseModelCacheEntry(entry);
  if (!normalized) {
    throw new Error("invalid skillrunner model cache entry");
  }
  const current = readModelCacheDocument();
  const nextEntries = current.entries.filter(
    (row) => row.backendId !== normalized.backendId,
  );
  nextEntries.push({
    ...normalized,
    updatedAt: normalized.updatedAt || toIsoNow(),
  });
  writeModelCacheDocument({
    version: 1,
    entries: nextEntries,
  });
  return normalized;
}

export function clearSkillRunnerModelCache() {
  writeModelCacheDocument({
    version: 1,
    entries: [],
  });
}

export async function refreshSkillRunnerModelCacheForBackend(args: {
  backend: BackendInstance;
  fetchImpl?: FetchLike;
}) {
  const backend = args.backend;
  const baseUrl = normalizeBaseUrl(backend.baseUrl);
  const backendId = String(backend.id || "").trim();
  const startedAt = Date.now();
  if (!backendId || !baseUrl) {
    appendSkillRunnerModelCacheLog({
      backend,
      backendId,
      baseUrl,
      level: "warn",
      stage: "skillrunner-model-cache-refresh-invalid-backend",
      message:
        "SkillRunner model cache refresh requires backend id and baseUrl",
      startedAt,
    });
    return {
      ok: false,
      backendId,
      baseUrl,
      error: "backend id/baseUrl is required",
    };
  }
  if (String(backend.type || "").trim() !== SKILLRUNNER_BACKEND_TYPE) {
    appendSkillRunnerModelCacheLog({
      backend,
      backendId,
      baseUrl,
      level: "warn",
      stage: "skillrunner-model-cache-refresh-invalid-backend-type",
      message: "SkillRunner model cache refresh requires a skillrunner backend",
      startedAt,
      details: { backendType: backend.type },
    });
    return {
      ok: false,
      backendId,
      baseUrl,
      error: "backend type must be skillrunner",
    };
  }
  const fetchImpl =
    args.fetchImpl || (resolveRuntimeHostCapabilities().fetch as FetchLike);
  if (typeof fetchImpl !== "function") {
    appendSkillRunnerModelCacheLog({
      backend,
      backendId,
      baseUrl,
      level: "warn",
      stage: "skillrunner-model-cache-refresh-fetch-unavailable",
      message: "fetch() is unavailable in current runtime",
      startedAt,
    });
    return {
      ok: false,
      backendId,
      baseUrl,
      error: "fetch() is unavailable in current runtime",
    };
  }
  const headers = buildSkillRunnerRequestHeaders(backend);
  const readSavedIdentity = () =>
    modelCacheBackendIdentity(
      loadBackendsRegistrySync().backends.find(
        (entry) => entry.id === backendId,
      ),
    );
  // Draft refreshes are valid, but changes to their saved backend invalidate them.
  const savedIdentity = readSavedIdentity();
  const identity = JSON.stringify([
    modelCacheBackendIdentity(backend),
    savedIdentity,
  ]);
  const pending = modelCacheRefreshes.get(backendId);
  if (pending?.identity === identity) {
    return pending.promise;
  }
  pending?.cancel();
  const cancellation = createCancellationController();
  const NativeAbortController = resolveNativeAbortControllerConstructor();
  const transport = NativeAbortController ? new NativeAbortController() : null;
  const cancel = () => {
    cancellation.abort();
    transport?.abort();
  };
  const checkActive = () => {
    if (cancellation.signal.aborted || readSavedIdentity() !== savedIdentity) {
      cancel();
      throw new BoundedWaitError({
        kind: "canceled",
        phase: "skillrunner-model-cache-refresh",
      });
    }
  };
  const requestJson = async (path: string) => {
    checkActive();
    const response = await waitForBoundedPromise(
      fetchImpl(`${baseUrl}${path}`, {
        method: "GET",
        headers,
        ...(transport ? { signal: transport.signal } : {}),
      }),
      { signal: cancellation.signal, phase: "skillrunner-model-cache-request" },
    );
    checkActive();
    const payload = await waitForBoundedPromise(
      readJsonOrThrow(response, path),
      {
        signal: cancellation.signal,
        phase: "skillrunner-model-cache-body",
      },
    );
    checkActive();
    return payload;
  };
  const promise = performRefresh();
  const task = { identity, promise, cancel };
  modelCacheRefreshes.set(backendId, task);
  try {
    return await promise;
  } finally {
    if (modelCacheRefreshes.get(backendId) === task) {
      modelCacheRefreshes.delete(backendId);
    }
  }

  async function performRefresh(): Promise<ModelCacheRefreshResult> {
    appendSkillRunnerModelCacheLog({
      backend,
      backendId,
      baseUrl,
      level: "info",
      stage: "skillrunner-model-cache-refresh-started",
      message: "SkillRunner model cache refresh started",
      startedAt,
      details: {
        requestPaths: ["/v1/engines"],
        hasAuthorization: !!headers.authorization,
        headerKeys: Object.keys(headers).sort(),
      },
    });
    try {
      const enginesPayload = await requestJson("/v1/engines");
      const engines = parseEnginesPayload(enginesPayload);
      const modelsByEngine: Record<string, SkillRunnerModelCacheModel[]> = {};
      const requestPaths = ["/v1/engines"];
      for (const engine of engines) {
        const modelPath = `/v1/engines/${engine}/models`;
        requestPaths.push(modelPath);
        const payload = await requestJson(
          `/v1/engines/${encodeURIComponent(engine)}/models`,
        );
        modelsByEngine[engine] = parseEngineModelsPayload(payload);
      }
      const updatedAt = toIsoNow();
      checkActive();
      upsertSkillRunnerModelCacheEntry({
        backendId,
        baseUrl,
        updatedAt,
        engines,
        modelsByEngine,
      });
      appendSkillRunnerModelCacheLog({
        backend,
        backendId,
        baseUrl,
        level: "info",
        stage: "skillrunner-model-cache-refresh-ok",
        message: "SkillRunner model cache refreshed",
        startedAt,
        details: {
          refreshedAt: updatedAt,
          engines: engines.length,
          models: countModelsByEngine(modelsByEngine),
          requestPaths,
        },
      });
      return {
        ok: true,
        backendId,
        baseUrl,
        refreshedAt: updatedAt,
      };
    } catch (error) {
      appendSkillRunnerModelCacheLog({
        backend,
        backendId,
        baseUrl,
        level: "warn",
        stage: "skillrunner-model-cache-refresh-failed",
        message: String(error),
        startedAt,
        error,
      });
      return {
        ok: false,
        backendId,
        baseUrl,
        error: String(error),
      };
    }
  }
}

export async function refreshAllSkillRunnerModelCaches(args?: {
  fetchImpl?: FetchLike;
  listBackends?: () => Promise<BackendInstance[]>;
}) {
  const signal = modelCacheRefreshLifetime.signal;
  const listBackends =
    args?.listBackends ||
    (async () => {
      const loaded = await loadBackendsRegistry();
      if (loaded.fatalError) {
        throw new Error(loaded.fatalError);
      }
      return loaded.backends;
    });
  let backends: BackendInstance[] = [];
  try {
    backends = await waitForBoundedPromise(listBackends(), {
      signal,
      phase: "skillrunner-model-cache-backends",
    });
  } catch (error) {
    return {
      ok: false,
      refreshed: 0,
      failed: 0,
      results: [],
      error: String(error),
    };
  }
  const results = [];
  let refreshed = 0;
  let failed = 0;
  for (const listedBackend of backends) {
    if (signal.aborted) {
      break;
    }
    const backend = args?.listBackends
      ? listedBackend
      : loadBackendsRegistrySync().backends.find(
          (entry) => entry.id === listedBackend.id,
        );
    if (
      !backend ||
      String(backend.type || "").trim() !== SKILLRUNNER_BACKEND_TYPE
    ) {
      continue;
    }
    const result = await refreshSkillRunnerModelCacheForBackend({
      backend,
      fetchImpl: args?.fetchImpl,
    });
    results.push(result);
    if (result.ok) {
      refreshed += 1;
    } else {
      failed += 1;
    }
  }
  return {
    ok: !signal.aborted && failed === 0,
    refreshed,
    failed,
    results,
  };
}

export function startSkillRunnerModelCacheAutoRefresh(args?: {
  intervalMs?: number;
  refreshAll?: () => Promise<unknown>;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
}) {
  if (modelCacheRefreshTimer !== null) {
    return;
  }
  const refreshAll =
    args?.refreshAll || (() => refreshAllSkillRunnerModelCaches());
  const signal = modelCacheRefreshLifetime.signal;
  let running = false;
  const refresh = async () => {
    if (running || signal.aborted) {
      return;
    }
    running = true;
    try {
      await waitForBoundedPromise(refreshAll(), {
        signal,
        phase: "skillrunner-model-cache-auto-refresh",
      });
    } catch {
      // Refresh results carry diagnostics; scheduled failures must not escape.
    } finally {
      running = false;
    }
  };
  const intervalMs = Math.max(
    1,
    Number(args?.intervalMs || SKILLRUNNER_MODEL_CACHE_REFRESH_INTERVAL_MS),
  );
  const setIntervalFn = args?.setIntervalFn || setInterval;
  modelCacheRefreshClearTimer = args?.clearIntervalFn || clearInterval;
  void refresh();
  modelCacheRefreshTimer = setIntervalFn(refresh, intervalMs);
  const typedTimer = modelCacheRefreshTimer as unknown as {
    unref?: () => void;
  };
  if (typeof typedTimer.unref === "function") {
    typedTimer.unref();
  }
}

export function stopSkillRunnerModelCacheAutoRefresh() {
  if (modelCacheRefreshTimer !== null) {
    modelCacheRefreshClearTimer(modelCacheRefreshTimer);
    modelCacheRefreshTimer = null;
  }
  modelCacheRefreshLifetime.abort();
  modelCacheRefreshLifetime = createCancellationController();
  for (const task of modelCacheRefreshes.values()) {
    task.cancel();
  }
  modelCacheRefreshes.clear();
}
