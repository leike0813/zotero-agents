import {
  getBundledModels,
  getBundledProviders,
} from "@oh-my-pi/pi-catalog/models";
import { parseDocument } from "yaml";
import { getPiCredentialRevision, readPiCredential } from "./piCredentialStore";
import { resolvePiOpenAICodexAccess } from "./piOpenAICodexAuth";
import { PiModelStreamFailure } from "./piRuntime";
import { classifyPiEndpoint } from "./piProviderConfiguration";
import type { PiCatalog, PiCatalogModel } from "../shared/piProviderContract";
export type { PiCatalog, PiCatalogModel } from "../shared/piProviderContract";
import { readRuntimeEnv } from "../platform/env";
import { joinPath } from "../utils/path";
import {
  ensureRuntimeDirectoryStrict,
  getRuntimePersistencePaths,
  readRuntimeTextFile,
  replaceRuntimeTextFileAtomically,
} from "./runtimePersistence";

const ALLOWED_MODEL_KEYS = new Set([
  "id",
  "name",
  "api",
  "baseUrl",
  "contextWindow",
  "maxTokens",
  "input",
  "reasoning",
  "supportsTools",
]);
const ALLOWED_PROVIDER_KEYS = new Set(["api", "baseUrl", "models"]);
const REASONING = new Set([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);
const CACHE_VERSION = 1;
const CATALOG_VERSION = "18.0.11";

function string(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function positiveInt(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0)
    throw new Error(`Invalid ${field}`);
  return Number(value);
}
function knownStringArray(
  value: unknown,
  allowed: Set<string>,
  field: string,
): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string" && allowed.has(item))
  )
    throw new Error(`Invalid ${field}`);
  return [...new Set(value)];
}
function endpoint(value: unknown): string {
  const raw = string(value);
  if (!raw) throw new Error("Overlay baseUrl is required");
  return classifyPiEndpoint(raw).baseUrl;
}

function bundledModels(): PiCatalogModel[] {
  const result: PiCatalogModel[] = [];
  for (const provider of getBundledProviders()) {
    for (const model of getBundledModels(provider)) {
      const efforts =
        (model as { thinking?: { efforts?: string[] } }).thinking?.efforts ||
        [];
      result.push({
        provider: string(model.provider),
        id: string(model.id),
        name: string(model.name),
        api: string(model.api),
        baseUrl: string(model.baseUrl),
        contextWindow: Number(model.contextWindow) || 0,
        maxTokens: Number(model.maxTokens) || 0,
        input: Array.isArray(model.input) ? model.input.map(String) : [],
        supportsTools: model.supportsTools === true,
        reasoning: model.reasoning
          ? [
              ...((model as { thinking?: { requiresEffort?: boolean } })
                .thinking?.requiresEffort
                ? []
                : ["off"]),
              ...efforts.filter((level) => REASONING.has(level)),
            ]
          : ["off"],
        source: "bundled",
      });
    }
  }
  return result;
}

export function normalizePiModelOverlay(source: string): PiCatalogModel[] {
  if (source.length > 2 * 1024 * 1024)
    throw new Error("models.yml exceeds size limit");
  const doc = parseDocument(source, { uniqueKeys: true });
  if (doc.errors.length) throw new Error("Invalid models.yml syntax");
  const root = doc.toJS({ maxAliasCount: 0 }) as unknown;
  if (
    !root ||
    typeof root !== "object" ||
    Array.isArray(root) ||
    Object.keys(root).some((key) => key !== "providers")
  )
    throw new Error("Unsupported models.yml field");
  const providers = (root as { providers?: unknown }).providers;
  if (!providers || typeof providers !== "object" || Array.isArray(providers))
    throw new Error("models.yml must contain providers map");
  const seen = new Set<string>();
  const bundled = new Set(
    bundledModels().map((model) => `${model.provider}\n${model.id}`),
  );
  const result: PiCatalogModel[] = [];
  for (const [provider, entry] of Object.entries(
    providers as Record<string, unknown>,
  )) {
    if (
      !provider.trim() ||
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry)
    )
      throw new Error("Invalid models.yml provider");
    const source = entry as Record<string, unknown>;
    const unsupportedProvider = Object.keys(source).find(
      (key) => !ALLOWED_PROVIDER_KEYS.has(key),
    );
    if (unsupportedProvider)
      throw new Error(`Unsupported models.yml field: ${unsupportedProvider}`);
    if (!Array.isArray(source.models))
      throw new Error("Overlay provider requires models array");
    for (const item of source.models) {
      if (!item || typeof item !== "object" || Array.isArray(item))
        throw new Error("Invalid models.yml model");
      const raw = item as Record<string, unknown>;
      const unsupported = Object.keys(raw).find(
        (key) => !ALLOWED_MODEL_KEYS.has(key),
      );
      if (unsupported)
        throw new Error(`Unsupported models.yml field: ${unsupported}`);
      const id = string(raw.id);
      if (!id) throw new Error("Overlay model id is required");
      const key = `${provider}\n${id}`;
      if (seen.has(key) || bundled.has(key))
        throw new Error(
          "Overlay model identity conflicts with bundled catalog",
        );
      seen.add(key);
      const api = raw.api || source.api;
      if (api !== "openai-responses" && api !== "openai-completions")
        throw new Error("Overlay requires an explicit OpenAI API dialect");
      const declaredReasoning = raw.reasoning;
      if (
        raw.supportsTools !== undefined &&
        typeof raw.supportsTools !== "boolean"
      )
        throw new Error("Invalid supportsTools");
      const reasoning = Array.isArray(declaredReasoning)
        ? knownStringArray(declaredReasoning, REASONING, "reasoning")
        : declaredReasoning === undefined ||
            typeof declaredReasoning === "boolean"
          ? ["off"]
          : (() => {
              throw new Error("Invalid reasoning");
            })();
      result.push({
        provider,
        id,
        name: string(raw.name) || id,
        api,
        baseUrl: endpoint(raw.baseUrl || source.baseUrl),
        contextWindow:
          raw.contextWindow === undefined
            ? 0
            : positiveInt(raw.contextWindow, "contextWindow"),
        maxTokens:
          raw.maxTokens === undefined
            ? 0
            : positiveInt(raw.maxTokens, "maxTokens"),
        input:
          raw.input === undefined
            ? []
            : knownStringArray(raw.input, new Set(["text", "image"]), "input"),
        supportsTools: raw.supportsTools === true,
        reasoning,
        source: "overlay",
      });
    }
  }
  return result;
}

function cachePath(root?: string): string {
  return joinPath(
    getRuntimePersistencePaths(root).cacheDir,
    "pi-model-catalog.json",
  );
}
async function revision(overlay: PiCatalogModel[]): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto digest is unavailable");
  const bytes = new TextEncoder().encode(
    JSON.stringify({ version: CATALOG_VERSION, overlay }),
  );
  const digest = new Uint8Array(await subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function defaultPiModelsOverlayPath(): string {
  const home = readRuntimeEnv("HOME") || readRuntimeEnv("USERPROFILE");
  return home ? joinPath(home, ".omp", "agent", "models.yml") : "";
}

export async function loadPiModelCatalog(
  args: { root?: string } = {},
): Promise<PiCatalog> {
  let overlay: PiCatalogModel[] = [];
  try {
    const raw = await readRuntimeTextFile(cachePath(args.root));
    const cache = JSON.parse(raw || "null") as {
      version?: unknown;
      models?: unknown;
    } | null;
    if (cache?.version === CACHE_VERSION && Array.isArray(cache.models)) {
      // Cache is treated as untrusted: reapply the same allowlist and conflict checks.
      const providers: Record<
        string,
        { api: string; baseUrl: string; models: unknown[] }
      > = Object.create(null);
      for (const model of cache.models as PiCatalogModel[]) {
        if (!model || typeof model.provider !== "string")
          throw new Error("Invalid cached model");
        const provider = (providers[model.provider] ||= {
          api: model.api,
          baseUrl: model.baseUrl,
          models: [],
        });
        provider.models.push({
          id: model.id,
          name: model.name,
          api: model.api,
          baseUrl: model.baseUrl,
          ...(model.contextWindow
            ? { contextWindow: model.contextWindow }
            : {}),
          ...(model.maxTokens ? { maxTokens: model.maxTokens } : {}),
          input: model.input,
          reasoning: model.reasoning,
          supportsTools: model.supportsTools,
        });
      }
      overlay = normalizePiModelOverlay(JSON.stringify({ providers }));
    }
  } catch {
    /* No valid cache; bundled metadata remains available. */
  }
  return {
    revision: await revision(overlay),
    models: [...bundledModels(), ...overlay],
    overlayStatus: overlay.length ? "cached" : "none",
  };
}

export async function refreshPiModelCatalog(
  args: { overlayPath?: string; root?: string } = {},
): Promise<PiCatalog> {
  const overlayPath = args.overlayPath || defaultPiModelsOverlayPath();
  if (!overlayPath) return loadPiModelCatalog(args);
  const raw = await readRuntimeTextFile(overlayPath);
  if (!raw) return loadPiModelCatalog(args);
  const overlay = normalizePiModelOverlay(raw);
  const rev = await revision(overlay);
  const path = cachePath(args.root);
  await ensureRuntimeDirectoryStrict(
    getRuntimePersistencePaths(args.root).cacheDir,
  );
  await replaceRuntimeTextFileAtomically(
    path,
    JSON.stringify({ version: CACHE_VERSION, models: overlay }),
  );
  return {
    revision: rev,
    models: [...bundledModels(), ...overlay],
    overlayStatus: "refreshed",
  };
}

export async function removePiCodexCredentialModels(
  catalog: PiCatalog,
  credentialId: string,
): Promise<PiCatalog> {
  const models = catalog.models.filter(
    (model) => model.credentialRef !== credentialId,
  );
  return { ...catalog, models, revision: await revision(models) };
}

export async function refreshPiCodexModelCatalog(
  catalog: PiCatalog,
  args: { credentialId: string; signal: AbortSignal; fetch?: typeof fetch },
): Promise<PiCatalog> {
  try {
    const access = await resolvePiOpenAICodexAccess(
      args.credentialId,
      args.signal,
    );
    const credentialRevision = getPiCredentialRevision(
      args.credentialId,
      "model-provider",
    );
    const resolved = await readPiCredential(args.credentialId);
    if (
      !resolved.ok ||
      resolved.material.kind !== "openai-codex" ||
      resolved.material.access !== access ||
      getPiCredentialRevision(args.credentialId, "model-provider") !==
        credentialRevision
    )
      throw new PiModelStreamFailure("credential_missing");
    const response = await (args.fetch || globalThis.fetch)(
      "https://chatgpt.com/backend-api/codex/models?client_version=0.158.0",
      {
        headers: {
          Authorization: `Bearer ${access}`,
          "ChatGPT-Account-ID": resolved.material.accountId,
          originator: "codex_cli_rs",
        },
        credentials: "omit",
        redirect: "error",
        signal: args.signal,
      },
    );
    if (!response.ok)
      throw new PiModelStreamFailure(
        response.status === 401 || response.status === 403
          ? "provider_auth_failed"
          : "provider_unavailable",
      );
    if (!response.body) throw new PiModelStreamFailure("provider_http_error");
    const reader =
      response.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let raw = "";
    let bytes = 0;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 2 * 1024 * 1024)
          throw new PiModelStreamFailure("provider_http_error");
        raw += decoder.decode(part.value, { stream: true });
      }
      raw += decoder.decode(new Uint8Array());
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const data = JSON.parse(raw) as { models?: unknown };
    if (!Array.isArray(data?.models) || data.models.length > 1000)
      throw new PiModelStreamFailure("provider_http_error");
    const seen = new Set<string>();
    const discovered: PiCatalogModel[] = [];
    for (const item of data.models) {
      if (!item || typeof item !== "object" || item.visibility !== "list")
        continue;
      const id = string(item.slug);
      if (!id || id.length > 128 || seen.has(id))
        throw new PiModelStreamFailure("provider_http_error");
      seen.add(id);
      const efforts: unknown[] = Array.isArray(item.supported_reasoning_levels)
        ? item.supported_reasoning_levels.map(
            (level: { effort?: unknown }) => level?.effort,
          )
        : [];
      discovered.push({
        provider: "openai-codex",
        id,
        name: string(item.display_name).slice(0, 256) || id,
        api: "openai-codex-responses",
        baseUrl: "https://chatgpt.com/backend-api",
        contextWindow:
          item.context_window === undefined
            ? 0
            : positiveInt(item.context_window, "contextWindow"),
        maxTokens:
          item.max_output_tokens === undefined
            ? 0
            : positiveInt(item.max_output_tokens, "maxTokens"),
        input:
          item.input_modalities === undefined
            ? []
            : knownStringArray(
                item.input_modalities,
                new Set(["text", "image"]),
                "input",
              ),
        reasoning: [
          ...new Set(
            efforts.filter(
              (level: unknown): level is string =>
                typeof level === "string" && REASONING.has(level),
            ),
          ),
        ],
        supportsTools: item.supports_tools === true,
        source: "discovered",
        credentialRef: args.credentialId,
      });
    }
    const models = [
      ...catalog.models.filter(
        (model) => model.credentialRef !== args.credentialId,
      ),
      ...discovered,
    ];
    const catalogRevision = await revision(models);
    if (
      args.signal.aborted ||
      !credentialRevision ||
      getPiCredentialRevision(args.credentialId, "model-provider") !==
        credentialRevision
    )
      throw new PiModelStreamFailure(
        args.signal.aborted ? "aborted" : "credential_missing",
      );
    return { ...catalog, models, revision: catalogRevision };
  } catch (error) {
    if (error instanceof PiModelStreamFailure) throw error;
    throw new PiModelStreamFailure(
      args.signal.aborted ? "aborted" : "provider_unavailable",
    );
  }
}
