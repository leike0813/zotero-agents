import {
  getBundledModels,
  getBundledProviders,
} from "@oh-my-pi/pi-catalog/models";
import { parseDocument } from "yaml";
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
