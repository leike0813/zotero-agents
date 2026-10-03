import type {
  PiCatalogModel,
  PiModelInputLimits,
  PiOfficialCatalogSnapshot,
  PiReasoningLevel,
} from "../shared/piProviderContract";
import { PI_RUNTIME_VERSION } from "../config/piRuntimeBuild";
import { classifyPiEndpoint } from "../utils/endpoint";

import {
  piCatalogObject,
  normalizePiModelMetadata,
  PI_MODEL_REASONING_LEVELS as LEVELS,
} from "../shared/piModelMetadata";
export {
  piCatalogObject,
  normalizePiModelMetadata,
} from "../shared/piModelMetadata";
function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 1024)
    throw new Error(`Invalid ${field}`);
  return value.trim();
}
function number(value: unknown, field: string, positive = false): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (positive ? value <= 0 : value < 0)
  )
    throw new Error(`Invalid ${field}`);
  return value;
}
function integer(value: unknown, field: string): number {
  const result = number(value, field, true);
  if (!Number.isSafeInteger(result)) throw new Error(`Invalid ${field}`);
  return result;
}
function bool(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`Invalid ${field}`);
  return value;
}

export const PI_CATALOG_SCHEMA_VERSION = 1;
export const PI_PUBLIC_CATALOG_MAX_BYTES = 8 * 1024 * 1024;
export const PI_PUBLIC_CATALOG_TIMEOUT_MS = 30_000;
export const PI_PUBLIC_CATALOG_INTERVAL_MS = 4 * 60 * 60 * 1000;
export const PI_SUPPORTED_CATALOG_APIS = new Set([
  "openai-responses",
  "openai-completions",
  "anthropic-messages",
  "google-generative-ai",
  "openai-codex-responses",
]);
export function normalizePiCatalogEndpoint(value: unknown): string {
  return classifyPiEndpoint(text(value, "baseUrl")).baseUrl;
}
export function isPiCatalogVersionCompatible(
  minimum: string | undefined,
  runtimeVersion = PI_RUNTIME_VERSION,
): boolean {
  if (!minimum) return true;
  const parse = (value: string) =>
    /^(\d+)\.(\d+)\.(\d+)$/.exec(value)?.slice(1).map(Number);
  const min = parse(minimum),
    runtime = parse(runtimeVersion);
  if (!min || !runtime) return false;
  for (let i = 0; i < 3; i++)
    if (runtime[i] !== min[i]) return runtime[i] > min[i];
  return true;
}

export function normalizePiOfficialCatalog(
  value: unknown,
  options: {
    revision?: string;
    minimumPiVersion?: string;
    runtimeVersion?: string;
    source?: "bundled" | "official";
  } = {},
): PiOfficialCatalogSnapshot {
  const raw = piCatalogObject(value, "catalog");
  const envelope = raw.schemaVersion !== undefined;
  if (envelope && raw.schemaVersion !== PI_CATALOG_SCHEMA_VERSION)
    throw new Error("Incompatible catalog schema");
  const revision = text(
    options.revision || (envelope ? raw.revision : undefined),
    "catalog revision",
  );
  const minimum =
    options.minimumPiVersion || (envelope ? raw.minimumPiVersion : undefined);
  if (minimum !== undefined && typeof minimum !== "string")
    throw new Error("Invalid minimumPiVersion");
  if (
    !isPiCatalogVersionCompatible(
      minimum as string | undefined,
      options.runtimeVersion,
    )
  )
    throw new Error("Incompatible Pi runtime");
  const data = envelope ? raw.models : raw;
  const entries: { provider: string; value: unknown }[] = [];
  if (Array.isArray(data))
    for (const item of data)
      entries.push({
        provider: text(piCatalogObject(item, "model").provider, "provider"),
        value: item,
      });
  else
    for (const [provider, models] of Object.entries(
      piCatalogObject(data, "providers"),
    )) {
      text(provider, "provider");
      const list = Array.isArray(models)
        ? models
        : Object.values(piCatalogObject(models, "provider models"));
      for (const item of list) entries.push({ provider, value: item });
    }
  if (entries.length > 20_000) throw new Error("Invalid model count");
  const seen = new Set<string>();
  const models: PiCatalogModel[] = [];
  for (const entry of entries) {
    const model = piCatalogObject(entry.value, "model");
    const id = text(model.id, "id");
    const api = text(model.api, "api");
    if (model.provider !== undefined && model.provider !== entry.provider)
      throw new Error("Invalid provider identity");
    const modelType =
      model.type === undefined ? "chat" : text(model.type, "type");
    const key = `${entry.provider}\n${modelType}\n${id}`;
    if (seen.has(key)) throw new Error("Duplicate model identity");
    seen.add(key);
    const metadata = normalizePiModelMetadata(model);
    if (modelType !== "chat") continue;
    const contextWindow =
      model.contextWindow === undefined
        ? 0
        : integer(model.contextWindow, "contextWindow");
    const maxTokens =
      model.maxTokens === undefined ? 0 : integer(model.maxTokens, "maxTokens");
    if (
      model.input !== undefined &&
      (!Array.isArray(model.input) ||
        !model.input.every((x) => x === "text" || x === "image"))
    )
      throw new Error("Invalid input");
    const supportsTools =
      model.supportsTools === undefined
        ? false
        : bool(model.supportsTools, "supportsTools");
    const reasoning =
      model.reasoning === undefined
        ? undefined
        : bool(model.reasoning, "reasoning");
    let availableLevels = reasoning ? [...LEVELS] : ["off"];
    availableLevels = availableLevels.filter(
      (level) =>
        metadata.thinkingLevelMap?.[level as PiReasoningLevel] !== null &&
        (!(level === "xhigh" || level === "max") ||
          metadata.thinkingLevelMap?.[level] !== undefined),
    );
    const retired =
      model.disabled === undefined ? false : bool(model.disabled, "disabled");
    if (model.headers !== undefined) {
      const headers = piCatalogObject(model.headers, "headers");
      if (Object.values(headers).some((x) => typeof x !== "string"))
        throw new Error("Invalid headers");
      if (Object.keys(headers).length) metadata.availability = "unsupported";
    }
    models.push({
      ...metadata,
      provider: entry.provider,
      id,
      name: text(model.name || id, "name"),
      api,
      baseUrl:
        model.baseUrl === "" ? "" : normalizePiCatalogEndpoint(model.baseUrl),
      contextWindow,
      maxTokens,
      input: [...new Set((model.input || []) as string[])],
      supportsTools,
      reasoning: availableLevels,
      source: options.source || "official",
      type: "chat",
      availability: retired
        ? "retired"
        : metadata.availability ||
          (PI_SUPPORTED_CATALOG_APIS.has(api) && model.baseUrl
            ? "available"
            : "unsupported"),
      knowledge: {
        context: contextWindow ? "known" : "unknown",
        output: maxTokens ? "known" : "unknown",
        input: model.input === undefined ? "unknown" : "known",
        tools:
          model.supportsTools === undefined
            ? "unknown"
            : supportsTools
              ? "known"
              : "unsupported",
        reasoning: reasoning === undefined ? "unknown" : "known",
      },
      authVariants:
        api === "openai-codex-responses" ? ["openai-codex"] : ["api-key"],
      provenance: {
        source: "official",
        revision,
        schemaVersion: PI_CATALOG_SCHEMA_VERSION,
        ...(minimum ? { minimumPiVersion: minimum as string } : {}),
      },
    });
  }
  return {
    revision,
    schemaVersion: PI_CATALOG_SCHEMA_VERSION,
    ...(minimum ? { minimumPiVersion: minimum as string } : {}),
    models,
  };
}

export function mergePiModelOverlay(
  base: readonly PiCatalogModel[],
  overlay: readonly PiCatalogModel[],
): PiCatalogModel[] {
  const models = [...base];
  for (const declared of overlay) {
    const index = models.findIndex(
      (model) =>
        model.provider === declared.provider &&
        model.id === declared.id &&
        model.baseUrl === declared.baseUrl &&
        model.api === declared.api &&
        model.source !== "discovered",
    );
    if (index < 0) {
      models.push(declared);
      continue;
    }
    const original = models[index];
    const patch: Record<string, unknown> = {};
    for (const key of declared.declaredFields || []) {
      if (key.includes(".")) {
        const [field, subkey] = key.split(".");
        const originalFields = (original as Record<string, unknown>)[field] as
          | Record<string, unknown>
          | undefined;
        const declaredFields = (declared as Record<string, unknown>)[field] as
          | Record<string, unknown>
          | undefined;
        patch[field] = {
          ...originalFields,
          ...(patch[field] as object | undefined),
          [subkey]: declaredFields?.[subkey],
        };
      } else patch[key] = declared[key as keyof PiCatalogModel];
    }
    for (const key of ["contextWindow", "maxTokens"] as const)
      if (
        patch[key] !== undefined &&
        original[key] > 0 &&
        Number(patch[key]) > original[key]
      )
        throw new Error(`Overlay widens ${key}`);
    if (declared.inputLimits && original.inputLimits) {
      const pairs = [
        [
          declared.inputLimits.maxRequestBytes,
          original.inputLimits.maxRequestBytes,
        ],
        [
          declared.inputLimits.images?.maxPerMessage,
          original.inputLimits.images?.maxPerMessage,
        ],
        [
          declared.inputLimits.images?.maxPerRequest,
          original.inputLimits.images?.maxPerRequest,
        ],
        [
          declared.inputLimits.images?.resize?.maxWidth,
          original.inputLimits.images?.resize?.maxWidth,
        ],
        [
          declared.inputLimits.images?.resize?.maxHeight,
          original.inputLimits.images?.resize?.maxHeight,
        ],
        [
          declared.inputLimits.images?.resize?.maxBytes,
          original.inputLimits.images?.resize?.maxBytes,
        ],
        [
          declared.inputLimits.images?.resize?.jpegQuality,
          original.inputLimits.images?.resize?.jpegQuality,
        ],
      ];
      if (
        pairs.some(
          ([next, current]) =>
            next !== undefined && current !== undefined && next > current,
        )
      )
        throw new Error("Overlay widens inputLimits");
    }
    if (patch.inputLimits) {
      const narrowed = patch.inputLimits as PiModelInputLimits;
      patch.inputLimits = {
        ...original.inputLimits,
        ...narrowed,
        ...(narrowed.images
          ? {
              images: {
                ...original.inputLimits?.images,
                ...narrowed.images,
                ...(narrowed.images.resize
                  ? {
                      resize: {
                        ...original.inputLimits?.images?.resize,
                        ...narrowed.images.resize,
                      },
                    }
                  : {}),
              },
            }
          : {}),
      };
    }
    const knowledge = { ...original.knowledge! };
    for (const [field, fact] of [
      ["contextWindow", "context"],
      ["maxTokens", "output"],
      ["input", "input"],
      ["reasoning", "reasoning"],
      ["supportsTools", "tools"],
    ] as const)
      if (declared.declaredFields?.includes(field))
        knowledge[fact] = declared.knowledge![fact];
    models[index] = {
      ...original,
      ...patch,
      source: "overlay",
      provenance: declared.provenance,
      knowledge,
      availability: original.availability,
    };
  }
  return models;
}
