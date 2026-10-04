import { parseDocument } from "yaml";
import {
  getPiCredentialRevision,
  getPiCredentialIdentityRevision,
  readPiCredential,
  subscribePiCredentialIdentityChange,
} from "./piCredentialStore";
import { resolvePiChatGPTAccess } from "./piChatGPTAuth";
import { PiModelStreamFailure } from "./piRuntime";
import { classifyPiEndpoint } from "./piProviderConfiguration";
import type {
  PiCatalog,
  PiCatalogModel,
  PiCatalogSourceState,
} from "../shared/piProviderContract";
export type { PiCatalog, PiCatalogModel } from "../shared/piProviderContract";
import { readRuntimeEnv } from "../platform/env";
import { joinPath } from "../utils/path";
import { resolveNativeAbortControllerConstructor } from "../utils/wait";
import {
  ensureRuntimeDirectoryStrict,
  getRuntimePersistencePaths,
  readRuntimeTextRange,
  statRuntimePath,
  replaceRuntimeTextFileAtomically,
} from "./runtimePersistence";
import { piModelCatalogSeed } from "../config/piModelCatalogSeed";
import { PI_RUNTIME_VERSION } from "../config/piRuntimeBuild";
import {
  normalizePiOfficialCatalog,
  normalizePiModelMetadata,
  mergePiModelOverlay,
  PI_CATALOG_SCHEMA_VERSION,
  PI_PUBLIC_CATALOG_MAX_BYTES,
  PI_PUBLIC_CATALOG_TIMEOUT_MS,
  PI_PUBLIC_CATALOG_INTERVAL_MS,
} from "./piModelCatalogData";

const CACHE_VERSION = 2;
const OVERLAY_LIMIT = 2 * 1024 * 1024;
const CACHE_LIMIT = 24 * 1024 * 1024;
const REASONING = new Set([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);
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
  "cost",
  "inputLimits",
  "thinkingLevelMap",
  "promptCache",
  "compat",
  "samplingParams",
  "authVariants",
]);
const ALLOWED_PROVIDER_KEYS = new Set(["api", "baseUrl", "models"]);
const CHATGPT_PROVIDER = "openai";
const CHATGPT_API = "openai-responses";
const CHATGPT_BASE_URL = "https://api.openai.com/v1";
const CHATGPT_MODEL_URL = CHATGPT_BASE_URL + "/models";
const LEGACY_CODEX_AUTH_VARIANT = "openai-codex";
type PublicSnapshot = {
  raw: unknown;
  revision: string;
  minimumPiVersion?: string;
  etag?: string;
  runtimeVersion: string;
  updatedAt: string;
};
type AccountSnapshot = {
  identityRevision: string;
  models: PiCatalogModel[];
  checkedAt: string;
  revision: string;
};
type Cache = {
  version: 2;
  epoch: number;
  current?: PublicSnapshot;
  previous?: PublicSnapshot;
  overlay?: string;
  accounts: Record<string, AccountSnapshot>;
  retired: string[];
  autoUpdate: boolean;
  checkedAt?: string;
};
type Flight = {
  controller: AbortController;
  promise: Promise<PiCatalog>;
  waiters: Set<object>;
  automatic: boolean;
};
type Owner = {
  root?: string;
  cache: Cache;
  loaded: Promise<void>;
  source: "seed" | "current" | "previous";
  status: PiCatalogSourceState["status"];
  error?: PiCatalogSourceState["error"];
  overlayStatus: PiCatalogSourceState["overlayStatus"];
  accountStatus: NonNullable<PiCatalogSourceState["accounts"]>;
  generation: Map<string, number>;
  closed: boolean;
  serial: Promise<unknown>;
  flights: Map<string, Flight>;
  listeners: Set<(catalog: PiCatalog) => void>;
  timer?: ReturnType<typeof setTimeout>;
};
const owners = new Map<string, Owner>();
let removeCredentialSubscription: (() => void) | undefined;
function string(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function positiveInt(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0)
    throw new Error("Invalid " + field);
  return Number(value);
}
function knownStringArray(value: unknown, allowed: Set<string>, field: string) {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string" && allowed.has(item))
  )
    throw new Error("Invalid " + field);
  return [...new Set(value)] as string[];
}
function cachePath(root?: string) {
  return joinPath(
    getRuntimePersistencePaths(root).cacheDir,
    "pi-model-catalog.json",
  );
}
function modelKey(model: PiCatalogModel) {
  return [model.provider, model.id, model.api, model.baseUrl].join("\n");
}
function seeded() {
  return normalizePiOfficialCatalog(piModelCatalogSeed, { source: "bundled" })
    .models;
}
function publicModels(snapshot: PublicSnapshot) {
  return normalizePiOfficialCatalog(snapshot.raw, {
    revision: snapshot.revision,
    minimumPiVersion: snapshot.minimumPiVersion,
  }).models;
}
async function boundedLocalRead(path: string, max: number) {
  const stat = await statRuntimePath(path);
  if (!stat.exists) return "";
  if (!stat.isFile || stat.size > max) throw new CatalogFailure("too_large");
  const value = await readRuntimeTextRange(path, 0, max + 1);
  if (new TextEncoder().encode(value).byteLength > max)
    throw new CatalogFailure("too_large");
  return value;
}
class CatalogFailure extends Error {
  constructor(readonly code: NonNullable<PiCatalogSourceState["error"]>) {
    super(code);
  }
}
function freshCache(): Cache {
  return {
    version: 2,
    epoch: 0,
    accounts: Object.create(null),
    retired: [],
    autoUpdate: true,
  };
}
function scopeGeneration(owner: Owner, scope: string) {
  return owner.generation.get(scope) || 0;
}
function detachFlight(owner: Owner, scope: string, flight: Flight) {
  if (owner.flights.get(scope) !== flight) return false;
  owner.flights.delete(scope);
  owner.generation.set(scope, scopeGeneration(owner, scope) + 1);
  flight.controller.abort();
  return true;
}
function resetCanceledFlightState(owner: Owner, scope: string) {
  if (owner.closed) return;
  if (scope === "public" && owner.status === "checking") {
    owner.status = owner.cache.current ? "idle" : "offline";
    owner.error = undefined;
    publish(owner);
    return;
  }
  if (scope.startsWith("account:")) {
    const id = scope.slice("account:".length);
    const status = owner.accountStatus[id];
    if (status?.status === "checking") {
      owner.accountStatus[id] = { ...status, status: "idle", error: undefined };
      publish(owner);
    }
  }
}
function invalidate(owner: Owner, scope: string) {
  const flight = owner.flights.get(scope);
  if (flight) {
    detachFlight(owner, scope, flight);
    resetCanceledFlightState(owner, scope);
  } else {
    owner.generation.set(scope, scopeGeneration(owner, scope) + 1);
  }
}
function currentChatGPTModels(
  owner: Owner,
  overlay: readonly PiCatalogModel[],
): PiCatalogModel[] {
  const result: PiCatalogModel[] = [];
  const overlayModels = overlay.filter((model) =>
    model.authVariants?.includes("chatgpt"),
  );
  for (const [id, discovery] of Object.entries(owner.cache.accounts)) {
    if (
      getPiCredentialIdentityRevision(id, "model-provider") ===
      discovery.identityRevision
    ) {
      for (const model of discovery.models) {
        const declared = overlayModels.find(
          (entry) =>
            entry.provider === model.provider &&
            entry.id === model.id &&
            entry.api === model.api &&
            entry.baseUrl === model.baseUrl,
        );
        if (!declared) {
          result.push(model);
          continue;
        }
        const merged = mergePiModelOverlay(
          [{ ...model, source: "official" }],
          [declared],
        )[0];
        result.push({
          ...merged,
          name: model.name,
          provider: model.provider,
          id: model.id,
          api: model.api,
          baseUrl: model.baseUrl,
          source: "discovered",
          credentialRef: model.credentialRef,
          authVariants: ["chatgpt"],
        });
      }
    }
  }
  return result;
}
function effective(owner: Owner): PiCatalog {
  const base = owner.cache.current
    ? publicModels(owner.cache.current)
    : seeded();
  const overlay = owner.cache.overlay
    ? normalizePiModelOverlay(owner.cache.overlay, base)
    : [];
  const models = [
    ...mergePiModelOverlay(
      base,
      overlay.filter((model) => !model.authVariants?.includes("chatgpt")),
    ),
    ...currentChatGPTModels(owner, overlay),
  ].map((model) =>
    !model.credentialRef && owner.cache.retired.includes(modelKey(model))
      ? { ...model, availability: "retired" as const }
      : model,
  );
  const accountIdentity = Object.entries(owner.cache.accounts)
    .filter(
      ([id, a]) =>
        getPiCredentialIdentityRevision(id, "model-provider") ===
        a.identityRevision,
    )
    .map(([id, a]) => id + ":" + a.revision)
    .sort()
    .join(",");
  return {
    revision: [
      "pi-catalog",
      PI_CATALOG_SCHEMA_VERSION,
      owner.cache.current?.revision || piModelCatalogSeed.revision,
      owner.cache.epoch,
      accountIdentity,
    ].join("|"),
    models,
    overlayStatus: overlay.length
      ? owner.overlayStatus === "refreshed"
        ? "refreshed"
        : "cached"
      : "none",
    state: {
      source: owner.source,
      revision: owner.cache.current?.revision || piModelCatalogSeed.revision,
      schemaVersion: PI_CATALOG_SCHEMA_VERSION,
      runtimeVersion: PI_RUNTIME_VERSION,
      status: owner.status,
      ...(owner.error ? { error: owner.error } : {}),
      checkedAt: owner.cache.checkedAt,
      updatedAt: owner.cache.current?.updatedAt,
      autoUpdate: owner.cache.autoUpdate,
      canRestore: !!owner.cache.previous,
      overlayStatus: owner.overlayStatus,
      accounts: { ...owner.accountStatus },
    },
  };
}
function publish(owner: Owner) {
  if (owner.closed) return;
  const catalog = effective(owner);
  for (const listener of owner.listeners) {
    try {
      listener(catalog);
    } catch {
      /* A view cannot change source admission. */
    }
  }
}
function cloneCache(owner: Owner): Cache {
  return JSON.parse(JSON.stringify(owner.cache));
}
function serial<T>(owner: Owner, operation: () => Promise<T>): Promise<T> {
  const next = owner.serial.then(operation, operation);
  owner.serial = next.catch(() => undefined);
  return next;
}
async function persist(
  owner: Owner,
  next: Cache,
  guard: () => boolean = () => !owner.closed,
) {
  if (!guard()) throw new CatalogFailure(owner.closed ? "closed" : "canceled");
  const raw = JSON.stringify(next);
  if (new TextEncoder().encode(raw).byteLength > CACHE_LIMIT)
    throw new CatalogFailure("too_large");
  if (!guard()) throw new CatalogFailure(owner.closed ? "closed" : "canceled");
  try {
    await ensureRuntimeDirectoryStrict(
      getRuntimePersistencePaths(owner.root).cacheDir,
    );
    if (!guard())
      throw new CatalogFailure(owner.closed ? "closed" : "canceled");
    await replaceRuntimeTextFileAtomically(cachePath(owner.root), raw);
  } catch (error) {
    throw error instanceof CatalogFailure
      ? error
      : new CatalogFailure("persistence");
  }
  if (!guard()) {
    // A late atomic IO completion cannot leave an obsolete candidate for restart.
    await replaceRuntimeTextFileAtomically(
      cachePath(owner.root),
      JSON.stringify(owner.cache),
    ).catch(() => undefined);
    throw new CatalogFailure(owner.closed ? "closed" : "canceled");
  }
  owner.cache = next;
}
function getOwner(root?: string): Owner {
  if (!removeCredentialSubscription)
    removeCredentialSubscription = subscribePiCredentialIdentityChange(
      (id, namespace) => {
        if (namespace !== "model-provider") return;
        for (const owner of owners.values()) {
          if (owner.closed) continue;
          invalidate(owner, "account:" + id);
          delete owner.accountStatus[id];
          publish(owner);
          if (owner.cache.accounts[id]) {
            void serial(owner, async () => {
              const next = cloneCache(owner);
              const observed = next.accounts[id];
              if (
                !observed ||
                observed.identityRevision ===
                  getPiCredentialIdentityRevision(id, "model-provider")
              )
                return;
              delete next.accounts[id];
              next.epoch++;
              await persist(owner, next);
              publish(owner);
            }).catch(() => undefined);
          }
        }
      },
    );
  const key = cachePath(root);
  const present = owners.get(key);
  if (present) return present;
  const owner: Owner = {
    root,
    cache: freshCache(),
    source: "seed",
    status: "offline",
    overlayStatus: "none",
    accountStatus: Object.create(null),
    generation: new Map(),
    closed: false,
    serial: Promise.resolve(),
    flights: new Map(),
    listeners: new Set(),
    loaded: Promise.resolve(),
  };
  owners.set(key, owner);
  owner.loaded = (async () => {
    let removedLegacyAccountFacts = false;
    try {
      const raw = await boundedLocalRead(key, CACHE_LIMIT);
      const parsed = JSON.parse(raw || "null");
      if (parsed?.version === CACHE_VERSION) {
        const cache: Cache = freshCache();
        cache.autoUpdate =
          typeof parsed.autoUpdate === "boolean" ? parsed.autoUpdate : true;
        cache.epoch =
          Number.isSafeInteger(parsed.epoch) && parsed.epoch >= 0
            ? parsed.epoch
            : 0;
        cache.checkedAt =
          typeof parsed.checkedAt === "string" &&
          Number.isFinite(Date.parse(parsed.checkedAt))
            ? parsed.checkedAt
            : undefined;
        cache.retired = Array.isArray(parsed.retired)
          ? parsed.retired
              .filter((x: unknown) => typeof x === "string" && x.length <= 4096)
              .slice(0, 20_000)
          : [];
        for (const field of ["current", "previous"] as const) {
          try {
            if (parsed[field]) {
              const snapshot = parsed[field] as PublicSnapshot;
              if (!string(snapshot.revision) || !string(snapshot.updatedAt))
                throw new Error("Invalid public cache");
              publicModels(snapshot);
              cache[field] = snapshot;
            }
          } catch {
            /* Try the other compatible slot. */
          }
        }
        if (!cache.current && cache.previous) {
          cache.current = cache.previous;
          cache.previous = undefined;
          owner.source = "previous";
        } else if (cache.current) owner.source = "current";
        if (
          typeof parsed.overlay === "string" &&
          new TextEncoder().encode(parsed.overlay).byteLength <= OVERLAY_LIMIT
        ) {
          try {
            const base = cache.current ? publicModels(cache.current) : seeded();
            mergePiModelOverlay(
              base,
              normalizePiModelOverlay(parsed.overlay, base).filter(
                (model) => !model.authVariants?.includes("chatgpt"),
              ),
            );
            cache.overlay = parsed.overlay;
            owner.overlayStatus = "cached";
          } catch {
            /* Invalid adopted declaration is not authority. */
          }
        }
        if (
          parsed.accounts &&
          typeof parsed.accounts === "object" &&
          !Array.isArray(parsed.accounts)
        )
          for (const [id, value] of Object.entries(parsed.accounts)) {
            try {
              const account = value as AccountSnapshot;
              if (!Array.isArray(account.models))
                throw new Error("Invalid account cache");
              const currentModels = account.models.filter(
                (model) => !isLegacyCodexModel(model),
              );
              if (currentModels.length !== account.models.length)
                removedLegacyAccountFacts = true;
              if (currentModels.length === 0 && account.models.length > 0)
                continue;
              if (
                getPiCredentialIdentityRevision(id, "model-provider") !==
                  account.identityRevision ||
                currentModels.length > 1000
              )
                continue;
              const models = validateAccountModels(currentModels, id);
              cache.accounts[id] = {
                identityRevision: account.identityRevision,
                models,
                checkedAt: string(account.checkedAt),
                revision: string(account.revision),
              };
              owner.accountStatus[id] = {
                checkedAt: string(account.checkedAt),
                status: "idle",
              };
            } catch {
              /* Invalid account observation does not establish visibility. */
            }
          }
        owner.cache = cache;
        if (removedLegacyAccountFacts) {
          cache.epoch++;
          await persist(owner, cache).catch(() => {
            owner.error = "persistence";
          });
        }
      } else if (parsed?.version === 1 && Array.isArray(parsed.models)) {
        const providers: Record<string, { models: unknown[] }> =
          Object.create(null);
        for (const model of parsed.models) {
          const { provider, source: _source, ...declaration } = model;
          // Version 1 stored unknown limits as zero in sanitized descriptions.
          // The declaration normalizer represents unknown limits by omission.
          if (declaration.contextWindow === 0) delete declaration.contextWindow;
          if (declaration.maxTokens === 0) delete declaration.maxTokens;
          (providers[provider] ||= { models: [] }).models.push(declaration);
        }
        const source = JSON.stringify({ providers });
        normalizePiModelOverlay(source);
        owner.cache.overlay = source;
        owner.overlayStatus = "cached";
      }
    } catch {
      owner.error = "invalid";
    }
  })();
  return owner;
}
export function defaultPiModelsOverlayPath(): string {
  const home = readRuntimeEnv("HOME") || readRuntimeEnv("USERPROFILE");
  return home ? joinPath(home, ".omp", "agent", "models.yml") : "";
}
export function normalizePiModelOverlay(
  source: string,
  base: readonly PiCatalogModel[] = seeded(),
): PiCatalogModel[] {
  if (new TextEncoder().encode(source).byteLength > OVERLAY_LIMIT)
    throw new Error("models.yml exceeds size limit");
  const doc = parseDocument(source, { uniqueKeys: true });
  if (doc.errors.length) throw new Error("Invalid models.yml syntax");
  const root = doc.toJS({ maxAliasCount: 0 }) as { providers?: unknown };
  if (
    !root ||
    typeof root !== "object" ||
    Array.isArray(root) ||
    Object.keys(root).some((key) => key !== "providers")
  )
    throw new Error("Unsupported models.yml field");
  const providers = root.providers;
  if (!providers || typeof providers !== "object" || Array.isArray(providers))
    throw new Error("models.yml must contain providers map");
  const result: PiCatalogModel[] = [],
    seen = new Set<string>();
  for (const [provider, entry] of Object.entries(providers)) {
    if (
      !provider.trim() ||
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry)
    )
      throw new Error("Invalid provider");
    const source = entry as Record<string, unknown>;
    const badProvider = Object.keys(source).find(
      (key) => !ALLOWED_PROVIDER_KEYS.has(key),
    );
    if (badProvider)
      throw new Error("Unsupported models.yml field: " + badProvider);
    if (!Array.isArray(source.models))
      throw new Error("Overlay provider requires models array");
    for (const item of source.models) {
      if (!item || typeof item !== "object" || Array.isArray(item))
        throw new Error("Invalid model");
      const raw = item as Record<string, unknown>;
      const bad = Object.keys(raw).find((key) => !ALLOWED_MODEL_KEYS.has(key));
      if (bad) throw new Error("Unsupported models.yml field: " + bad);
      const id = string(raw.id),
        key = provider + "\n" + id;
      if (!id || seen.has(key))
        throw new Error("Duplicate or missing overlay identity");
      seen.add(key);
      const original = base.find(
        (model) =>
          model.provider === provider &&
          model.id === id &&
          (!raw.baseUrl || model.baseUrl === string(raw.baseUrl)),
      );
      const api = raw.api || source.api || original?.api;
      if (api !== "openai-responses" && api !== "openai-completions")
        throw new Error("Overlay requires an explicit OpenAI API dialect");
      const baseUrl = classifyPiEndpoint(
        string(raw.baseUrl || source.baseUrl || original?.baseUrl),
      ).baseUrl;
      const authVariants: NonNullable<PiCatalogModel["authVariants"]> =
        raw.authVariants === undefined
          ? ["none", "api-key"]
          : (knownStringArray(
              raw.authVariants,
              new Set(["none", "api-key", "chatgpt"]),
              "authVariants",
            ) as NonNullable<PiCatalogModel["authVariants"]>);
      const chatGPTTarget = authVariants.includes("chatgpt");
      if (
        chatGPTTarget &&
        (authVariants.length !== 1 ||
          provider !== CHATGPT_PROVIDER ||
          raw.api !== CHATGPT_API ||
          raw.baseUrl !== CHATGPT_BASE_URL)
      )
        throw new Error(
          "ChatGPT overlay facts require an explicit official API target",
        );
      const metadataInput = {
        ...raw,
        ...(raw.cost &&
        typeof raw.cost === "object" &&
        original?.cost &&
        !chatGPTTarget
          ? { cost: { ...original.cost, ...raw.cost } }
          : {}),
      };
      const metadata = normalizePiModelMetadata(metadataInput);
      if (
        raw.supportsTools !== undefined &&
        typeof raw.supportsTools !== "boolean"
      )
        throw new Error("Invalid supportsTools");
      const reasoning = Array.isArray(raw.reasoning)
        ? knownStringArray(raw.reasoning, REASONING, "reasoning")
        : raw.reasoning === undefined || typeof raw.reasoning === "boolean"
          ? ["off"]
          : (() => {
              throw new Error("Invalid reasoning");
            })();
      const declaredFields = Object.keys(raw).filter(
        (key) =>
          ![
            "id",
            "api",
            "baseUrl",
            "cost",
            "compat",
            "promptCache",
            "thinkingLevelMap",
            "samplingParams",
          ].includes(key),
      );
      for (const field of [
        "cost",
        "compat",
        "promptCache",
        "thinkingLevelMap",
        "samplingParams",
      ])
        if (raw[field] && typeof raw[field] === "object")
          for (const key of Object.keys(raw[field] as object))
            declaredFields.push(field + "." + key);
      result.push({
        ...metadata,
        provider,
        id,
        name: string(raw.name) || id,
        api,
        baseUrl,
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
        declaredFields,
        authVariants,
        knowledge: {
          context: raw.contextWindow === undefined ? "unknown" : "known",
          output: raw.maxTokens === undefined ? "unknown" : "known",
          input: raw.input === undefined ? "unknown" : "known",
          tools:
            raw.supportsTools === undefined
              ? "unknown"
              : raw.supportsTools
                ? "known"
                : "unsupported",
          reasoning: raw.reasoning === undefined ? "unknown" : "known",
        },
        provenance: {
          source: "overlay",
          revision: "adopted",
          schemaVersion: PI_CATALOG_SCHEMA_VERSION,
        },
      });
    }
  }
  return result;
}
export async function loadPiModelCatalog(
  args: { root?: string } = {},
): Promise<PiCatalog> {
  const owner = getOwner(args.root);
  await owner.loaded;
  return effective(owner);
}
/** Wait for cache-load migration so startup can sequence it before owner recovery. */
export async function cleanupPiChatGPTLegacyCatalog(
  args: { root?: string } = {},
): Promise<PiCatalog> {
  const owner = getOwner(args.root);
  await owner.loaded;
  return effective(owner);
}
export function subscribePiModelCatalog(
  listener: (catalog: PiCatalog) => void,
  args: { root?: string } = {},
) {
  const owner = getOwner(args.root);
  owner.listeners.add(listener);
  return () => {
    owner.listeners.delete(listener);
  };
}
export async function refreshPiModelCatalog(
  args: { overlayPath?: string; root?: string; signal?: AbortSignal } = {},
): Promise<PiCatalog> {
  const owner = getOwner(args.root);
  await owner.loaded;
  return joinFlight(
    owner,
    "overlay",
    args.signal,
    false,
    async (controller, generation) => {
      try {
        const path = args.overlayPath || defaultPiModelsOverlayPath();
        const raw = path ? await boundedLocalRead(path, OVERLAY_LIMIT) : "";
        if (!raw) return effective(owner);
        return await serial(owner, async () => {
          const guard = () =>
            !owner.closed &&
            !controller.signal.aborted &&
            generation === scopeGeneration(owner, "overlay");
          if (!guard()) throw new CatalogFailure("canceled");
          const base = owner.cache.current
            ? publicModels(owner.cache.current)
            : seeded();
          mergePiModelOverlay(
            base,
            normalizePiModelOverlay(raw, base).filter(
              (model) => !model.authVariants?.includes("chatgpt"),
            ),
          );
          const next = cloneCache(owner);
          if (next.overlay !== raw) next.epoch++;
          next.overlay = raw;
          await persist(owner, next, guard);
          owner.overlayStatus = "refreshed";
          publish(owner);
          return effective(owner);
        });
      } catch (error) {
        if (!owner.closed && generation === scopeGeneration(owner, "overlay")) {
          owner.overlayStatus = "failed";
          publish(owner);
        }
        throw error;
      }
    },
  );
}
function failure(
  error: unknown,
  controller: AbortController,
  timedOut: boolean,
): NonNullable<PiCatalogSourceState["error"]> {
  return timedOut
    ? "timeout"
    : error instanceof CatalogFailure
      ? error.code
      : controller.signal.aborted
        ? "canceled"
        : "network";
}
function joinFlight(
  owner: Owner,
  scope: string,
  signal: AbortSignal | undefined,
  automatic: boolean,
  run: (controller: AbortController, generation: number) => Promise<PiCatalog>,
): Promise<PiCatalog> {
  if (owner.closed) return Promise.reject(new CatalogFailure("closed"));
  if (signal?.aborted) return Promise.reject(new CatalogFailure("canceled"));
  let flight = owner.flights.get(scope);
  if (!flight) {
    const Controller = resolveNativeAbortControllerConstructor();
    if (!Controller) return Promise.reject(new CatalogFailure("network"));
    const controller = new Controller(),
      generation = scopeGeneration(owner, scope);
    flight = {
      controller,
      waiters: new Set(),
      automatic,
      promise: Promise.resolve(undefined as unknown as PiCatalog),
    };
    owner.flights.set(scope, flight);
    const current = flight;
    flight.promise = Promise.resolve()
      .then(() => {
        if (
          owner.closed ||
          controller.signal.aborted ||
          generation !== scopeGeneration(owner, scope)
        )
          throw new CatalogFailure(owner.closed ? "closed" : "canceled");
        return run(controller, generation);
      })
      .finally(() => {
        if (owner.flights.get(scope) === current) owner.flights.delete(scope);
      });
  }
  if (!automatic) flight.automatic = false;
  const token = {};
  flight.waiters.add(token);
  const shared = flight;
  return new Promise((resolve, reject) => {
    const release = (cancelIfLast = false) => {
      shared.waiters.delete(token);
      signal?.removeEventListener("abort", aborted);
      if (
        cancelIfLast &&
        !shared.waiters.size &&
        detachFlight(owner, scope, shared)
      )
        resetCanceledFlightState(owner, scope);
    };
    const aborted = () => {
      release(true);
      reject(new CatalogFailure("canceled"));
    };
    signal?.addEventListener("abort", aborted, { once: true });
    shared.promise.then(
      (value) => {
        release();
        if (!signal?.aborted) resolve(value);
      },
      (error) => {
        release();
        if (!signal?.aborted) reject(error);
      },
    );
  });
}
async function readPublicResponse(response: Response, signal: AbortSignal) {
  if (!response.body) throw new CatalogFailure("invalid");
  if (
    Number(response.headers.get("content-length")) > PI_PUBLIC_CATALOG_MAX_BYTES
  ) {
    void response.body.cancel().catch(() => undefined);
    throw new CatalogFailure("too_large");
  }
  const reader =
      response.body.getReader() as ReadableStreamDefaultReader<Uint8Array>,
    decoder = new TextDecoder("utf-8", { fatal: true });
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  let raw = "",
    bytes = 0;
  try {
    for (;;) {
      if (signal.aborted) throw new CatalogFailure("canceled");
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > PI_PUBLIC_CATALOG_MAX_BYTES)
        throw new CatalogFailure("too_large");
      raw += decoder.decode(part.value, { stream: true });
    }
    raw += decoder.decode(new Uint8Array());
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      throw new CatalogFailure("invalid");
    }
  } catch (error) {
    throw error instanceof CatalogFailure
      ? error
      : new CatalogFailure(signal.aborted ? "canceled" : "invalid");
  } finally {
    signal.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }
}
export async function refreshPiPublicModelCatalog(
  args: {
    root?: string;
    signal?: AbortSignal;
    fetch?: typeof fetch;
    automatic?: boolean;
  } = {},
): Promise<PiCatalog> {
  const owner = getOwner(args.root);
  await owner.loaded;
  if (
    args.automatic &&
    (!owner.cache.autoUpdate ||
      Date.now() - Date.parse(owner.cache.checkedAt || "") <
        PI_PUBLIC_CATALOG_INTERVAL_MS)
  )
    return effective(owner);
  return joinFlight(
    owner,
    "public",
    args.signal,
    !!args.automatic,
    async (controller, generation) => {
      owner.status = "checking";
      owner.error = undefined;
      owner.cache.checkedAt = new Date().toISOString();
      publish(owner);
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, PI_PUBLIC_CATALOG_TIMEOUT_MS);
      const guard = () =>
        !owner.closed &&
        !controller.signal.aborted &&
        generation === scopeGeneration(owner, "public");
      const operation = (async () => {
        const url = new URL("https://pi.dev/api/models");
        url.searchParams.set("pi-version", PI_RUNTIME_VERSION);
        url.searchParams.set("types", "chat,image,classifier");
        const cached = owner.cache.current;
        const etag =
          cached?.runtimeVersion === PI_RUNTIME_VERSION
            ? cached.etag
            : undefined;
        let response = await (args.fetch || globalThis.fetch)(url, {
          headers: {
            accept: "application/json",
            ...(etag ? { "if-none-match": etag } : {}),
          },
          credentials: "omit",
          redirect: "error",
          signal: controller.signal,
        });
        if (response.status === 304 && (!cached || !etag))
          response = await (args.fetch || globalThis.fetch)(url, {
            headers: { accept: "application/json" },
            credentials: "omit",
            redirect: "error",
            signal: controller.signal,
          });
        if (response.status === 304 && cached && etag) {
          return serial(owner, async () => {
            await persist(owner, cloneCache(owner), guard);
            owner.status = "idle";
            owner.error = undefined;
            publish(owner);
            return effective(owner);
          });
        }
        if (!response.ok)
          throw new CatalogFailure(
            response.status === 404 ? "incompatible" : "network",
          );
        const raw = await readPublicResponse(response, controller.signal);
        const revision =
          response.headers.get("x-pi-model-catalog-revision") || "";
        const minimum =
          response.headers.get("x-pi-model-catalog-minimum-version") ||
          undefined;
        if (!revision || !minimum) throw new CatalogFailure("invalid");
        let snapshot;
        try {
          snapshot = normalizePiOfficialCatalog(raw, {
            revision,
            minimumPiVersion: minimum,
          });
        } catch (error) {
          throw new CatalogFailure(
            error instanceof Error &&
              error.message.toLowerCase().includes("incompatible")
              ? "incompatible"
              : "invalid",
          );
        }
        const candidate: PublicSnapshot = {
          raw,
          revision: snapshot.revision,
          minimumPiVersion: snapshot.minimumPiVersion,
          etag: response.headers.get("etag") || undefined,
          runtimeVersion: PI_RUNTIME_VERSION,
          updatedAt: new Date().toISOString(),
        };
        return serial(owner, async () => {
          if (!guard()) throw new CatalogFailure("canceled");
          // A candidate must also be composable with the adopted declarations.
          mergePiModelOverlay(
            snapshot.models,
            owner.cache.overlay
              ? normalizePiModelOverlay(
                  owner.cache.overlay,
                  snapshot.models,
                ).filter((model) => !model.authVariants?.includes("chatgpt"))
              : [],
          );
          const next = cloneCache(owner);
          if (
            next.current?.revision !== candidate.revision ||
            JSON.stringify(next.current.raw) !== JSON.stringify(raw)
          ) {
            next.previous = next.current;
            next.current = candidate;
            next.epoch++;
          } else
            next.current = { ...candidate, updatedAt: next.current.updatedAt };
          next.retired = [
            ...new Set([
              ...next.retired,
              ...snapshot.models
                .filter((m) => m.availability === "retired")
                .map(modelKey),
            ]),
          ];
          await persist(owner, next, guard);
          owner.source = "current";
          owner.status = "idle";
          owner.error = undefined;
          publish(owner);
          return effective(owner);
        });
      })();
      const abort = new Promise<never>((_, reject) =>
        controller.signal.addEventListener(
          "abort",
          () => reject(new CatalogFailure(timedOut ? "timeout" : "canceled")),
          { once: true },
        ),
      );
      try {
        return await Promise.race([operation, abort]);
      } catch (error) {
        if (!owner.closed && generation === scopeGeneration(owner, "public")) {
          owner.status = "failed";
          owner.error = failure(error, controller, timedOut);
          await serial(owner, () => persist(owner, cloneCache(owner))).catch(
            () => undefined,
          );
          publish(owner);
        }
        return effective(owner);
      } finally {
        clearTimeout(timer);
      }
    },
  );
}
export async function restorePiPreviousModelCatalog(
  args: { root?: string } = {},
): Promise<PiCatalog> {
  const owner = getOwner(args.root);
  await owner.loaded;
  invalidate(owner, "public");
  return serial(owner, async () => {
    if (!owner.cache.previous) throw new CatalogFailure("invalid");
    const previous = owner.cache.previous;
    publicModels(previous);
    const next = cloneCache(owner);
    next.previous = next.current;
    next.current = previous;
    next.autoUpdate = false;
    next.epoch++;
    await persist(owner, next);
    clearTimeout(owner.timer);
    owner.timer = undefined;
    owner.source = "previous";
    owner.status = "idle";
    owner.error = undefined;
    publish(owner);
    return effective(owner);
  });
}
export async function removePiModelOverlay(
  args: { root?: string } = {},
): Promise<PiCatalog> {
  const owner = getOwner(args.root);
  await owner.loaded;
  invalidate(owner, "overlay");
  return serial(owner, async () => {
    const next = cloneCache(owner);
    if (next.overlay !== undefined) next.epoch++;
    delete next.overlay;
    await persist(owner, next);
    owner.overlayStatus = "none";
    publish(owner);
    return effective(owner);
  });
}
function schedule(owner: Owner) {
  clearTimeout(owner.timer);
  if (owner.closed || !owner.cache.autoUpdate) return;
  const elapsed = Date.now() - Date.parse(owner.cache.checkedAt || "");
  const delay = Number.isFinite(elapsed)
    ? Math.max(1, PI_PUBLIC_CATALOG_INTERVAL_MS - elapsed)
    : 1;
  owner.timer = setTimeout(() => {
    owner.timer = undefined;
    void refreshPiPublicModelCatalog({
      root: owner.root,
      automatic: true,
    }).finally(() => schedule(owner));
  }, delay);
}
export async function setPiModelCatalogAutoUpdate(
  enabled: boolean,
  args: { root?: string } = {},
): Promise<PiCatalog> {
  const owner = getOwner(args.root);
  await owner.loaded;
  return serial(owner, async () => {
    const next = cloneCache(owner);
    next.autoUpdate = enabled;
    await persist(owner, next);
    if (!enabled) {
      clearTimeout(owner.timer);
      owner.timer = undefined;
      const flight = owner.flights.get("public");
      if (flight?.automatic) {
        invalidate(owner, "public");
        owner.status = "idle";
        owner.error = undefined;
      }
    } else schedule(owner);
    publish(owner);
    return effective(owner);
  });
}
export async function startPiModelCatalog(
  args: { root?: string } = {},
): Promise<PiCatalog> {
  const key = cachePath(args.root),
    prior = owners.get(key);
  if (prior?.closed) owners.delete(key);
  const owner = getOwner(args.root);
  await owner.loaded;
  // Loading and first paint are offline; network runs on the following task.
  schedule(owner);
  return effective(owner);
}
export async function shutdownPiModelCatalog(
  args: { root?: string; deadline?: number } = {},
) {
  const selected = args.root
    ? [owners.get(cachePath(args.root))].filter((x): x is Owner => !!x)
    : [...owners.values()];
  for (const owner of selected) {
    owner.closed = true;
    clearTimeout(owner.timer);
    owner.timer = undefined;
    for (const [scope, flight] of owner.flights) {
      owner.generation.set(scope, scopeGeneration(owner, scope) + 1);
      flight.controller.abort();
    }
    owner.listeners.clear();
  }
  if ([...owners.values()].every((owner) => owner.closed)) {
    removeCredentialSubscription?.();
    removeCredentialSubscription = undefined;
  }
  const deadline = args.deadline || Date.now() + 500;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.allSettled(selected.map((o) => o.serial)),
    new Promise((resolve) => {
      timer = setTimeout(resolve, Math.max(0, deadline - Date.now()));
    }),
  ]);
  clearTimeout(timer);
}
function isLegacyCodexModel(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const model = value as Record<string, unknown>;
  return (
    model.provider === "openai-codex" ||
    model.api === "openai-codex-responses" ||
    (Array.isArray(model.authVariants) &&
      model.authVariants.includes(LEGACY_CODEX_AUTH_VARIANT))
  );
}

function validateAccountModels(
  values: PiCatalogModel[],
  credentialId: string,
): PiCatalogModel[] {
  return values.map((model) => {
    if (
      !model ||
      model.provider !== CHATGPT_PROVIDER ||
      model.api !== CHATGPT_API ||
      model.baseUrl !== CHATGPT_BASE_URL ||
      model.source !== "discovered" ||
      model.credentialRef !== credentialId ||
      !model.authVariants?.includes("chatgpt") ||
      !string(model.id)
    )
      throw new Error("Invalid discovered model");
    const name = typeof model.name === "string" ? model.name : "";
    if (name.length > 256) throw new Error("Invalid discovered model name");
    const contextWindow = model.contextWindow
      ? positiveInt(model.contextWindow, "contextWindow")
      : 0;
    if (model.maxTokens !== 0) throw new Error("Invalid ChatGPT output limit");
    return {
      provider: CHATGPT_PROVIDER,
      id: string(model.id),
      name: name || string(model.id),
      api: CHATGPT_API,
      baseUrl: CHATGPT_BASE_URL,
      contextWindow,
      maxTokens: 0,
      input: ["text"],
      reasoning: ["off"],
      supportsTools: false,
      source: "discovered",
      credentialRef: credentialId,
      authVariants: ["chatgpt"],
      knowledge: {
        context: contextWindow ? "known" : "unknown",
        output: "unknown",
        input: "known",
        tools: "unknown",
        reasoning: "unknown",
      },
    };
  });
}

export async function removePiChatGPTCredentialModels(
  _catalog: PiCatalog,
  credentialId: string,
): Promise<PiCatalog> {
  const owner = getOwner();
  await owner.loaded;
  invalidate(owner, "account:" + credentialId);
  return serial(owner, async () => {
    const next = cloneCache(owner);
    delete next.accounts[credentialId];
    next.epoch++;
    await persist(owner, next);
    delete owner.accountStatus[credentialId];
    publish(owner);
    const result = effective(owner);
    return {
      ...result,
      models: result.models.filter(
        (model) => model.credentialRef !== credentialId,
      ),
    };
  });
}

export async function refreshPiChatGPTModelCatalog(
  _catalog: PiCatalog,
  args: {
    credentialId: string;
    signal: AbortSignal;
    fetch?: typeof fetch;
    resolveAccess?: typeof resolvePiChatGPTAccess;
    root?: string;
  },
): Promise<PiCatalog> {
  const owner = getOwner(args.root);
  await owner.loaded;
  const scope = "account:" + args.credentialId;
  return joinFlight(
    owner,
    scope,
    args.signal,
    false,
    async (controller, generation) => {
      owner.accountStatus[args.credentialId] = {
        ...owner.accountStatus[args.credentialId],
        status: "checking",
      };
      publish(owner);
      try {
        return await performPiChatGPTModelRefresh(
          owner,
          { ...args, signal: controller.signal },
          generation,
        );
      } catch (error) {
        if (!owner.closed && scopeGeneration(owner, scope) === generation) {
          owner.accountStatus[args.credentialId] = {
            ...owner.accountStatus[args.credentialId],
            status: "failed",
            error:
              error instanceof PiModelStreamFailure
                ? error.code
                : "provider_unavailable",
          };
          publish(owner);
        }
        throw error;
      }
    },
  );
}

async function performPiChatGPTModelRefresh(
  owner: Owner,
  args: {
    credentialId: string;
    signal: AbortSignal;
    fetch?: typeof fetch;
    resolveAccess?: typeof resolvePiChatGPTAccess;
    root?: string;
  },
  generation: number,
): Promise<PiCatalog> {
  try {
    const identityRevision = getPiCredentialIdentityRevision(
      args.credentialId,
      "model-provider",
    );
    if (!identityRevision) throw new PiModelStreamFailure("credential_missing");
    const access = await (args.resolveAccess || resolvePiChatGPTAccess)(
      args.credentialId,
      args.signal,
      undefined,
      { identityRevision },
    );
    const credentialRevision = getPiCredentialRevision(
      args.credentialId,
      "model-provider",
    );
    const resolved = await readPiCredential(args.credentialId);
    if (
      !resolved.ok ||
      resolved.material.kind !== "chatgpt" ||
      resolved.material.access !== access ||
      getPiCredentialRevision(args.credentialId, "model-provider") !==
        credentialRevision ||
      getPiCredentialIdentityRevision(args.credentialId, "model-provider") !==
        identityRevision
    )
      throw new PiModelStreamFailure("credential_missing");
    const response = await (args.fetch || globalThis.fetch)(CHATGPT_MODEL_URL, {
      headers: {
        Authorization: `Bearer ${access}`,
      },
      credentials: "omit",
      redirect: "error",
      signal: args.signal,
    });
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
    const cancel = () => {
      void reader.cancel().catch(() => undefined);
    };
    args.signal.addEventListener("abort", cancel, { once: true });
    let raw = "";
    let bytes = 0;
    try {
      for (;;) {
        if (args.signal.aborted)
          throw new PiModelStreamFailure(
            getPiCredentialIdentityRevision(
              args.credentialId,
              "model-provider",
            ) !== identityRevision
              ? "credential_missing"
              : "aborted",
          );
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 2 * 1024 * 1024)
          throw new PiModelStreamFailure("provider_http_error");
        raw += decoder.decode(part.value, { stream: true });
      }
      raw += decoder.decode(new Uint8Array());
    } finally {
      args.signal.removeEventListener("abort", cancel);
      cancel();
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
      const id = typeof item.slug === "string" ? item.slug : "";
      if (!id || id.trim() !== id || id.length > 128 || seen.has(id))
        throw new PiModelStreamFailure("provider_http_error");
      seen.add(id);
      const name =
        typeof item.display_name === "string" && item.display_name
          ? item.display_name
          : id;
      if (name.length > 256)
        throw new PiModelStreamFailure("provider_http_error");
      discovered.push({
        provider: CHATGPT_PROVIDER,
        id,
        name,
        api: CHATGPT_API,
        baseUrl: CHATGPT_BASE_URL,
        contextWindow:
          item.context_window === undefined
            ? 0
            : positiveInt(item.context_window, "contextWindow"),
        maxTokens: 0,
        input: ["text"],
        reasoning: ["off"],
        supportsTools: false,
        source: "discovered",
        credentialRef: args.credentialId,
        authVariants: ["chatgpt"],
      });
    }
    if (
      args.signal.aborted ||
      !credentialRevision ||
      !identityRevision ||
      getPiCredentialIdentityRevision(args.credentialId, "model-provider") !==
        identityRevision
    )
      throw new PiModelStreamFailure(
        getPiCredentialIdentityRevision(args.credentialId, "model-provider") !==
          identityRevision
          ? "credential_missing"
          : args.signal.aborted
            ? "aborted"
            : "credential_missing",
      );
    return await serial(owner, async () => {
      const guard = () =>
        !owner.closed &&
        !args.signal.aborted &&
        scopeGeneration(owner, "account:" + args.credentialId) === generation &&
        getPiCredentialIdentityRevision(args.credentialId, "model-provider") ===
          identityRevision;
      if (!guard())
        throw new PiModelStreamFailure(
          getPiCredentialIdentityRevision(
            args.credentialId,
            "model-provider",
          ) !== identityRevision
            ? "credential_missing"
            : args.signal.aborted
              ? "aborted"
              : "credential_missing",
        );
      const models = validateAccountModels(discovered, args.credentialId);
      const next = cloneCache(owner);
      const checkedAt = new Date().toISOString();
      next.accounts[args.credentialId] = {
        identityRevision,
        models,
        checkedAt,
        revision: String(next.epoch + 1),
      };
      next.epoch++;
      await persist(owner, next, guard);
      owner.accountStatus[args.credentialId] = { checkedAt, status: "idle" };
      publish(owner);
      return effective(owner);
    });
  } catch (error) {
    if (error instanceof PiModelStreamFailure) throw error;
    throw new PiModelStreamFailure(
      args.signal.aborted ? "aborted" : "provider_unavailable",
    );
  }
}
