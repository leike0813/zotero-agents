import { getPref, setPref } from "../utils/prefs";
import {
  PI_RUNTIME_VERSION,
  PI_PROVIDER_ADAPTER_VERSION,
} from "../config/piRuntimeBuild";
import { classifyPiEndpoint } from "../utils/endpoint";
import type { PiCatalog, PiCatalogModel } from "./piModelCatalog";
import type {
  PiModelKnowledge,
  PiModelMetadata,
  PiReasoningLevel,
  PiProviderConfiguration,
  PiProviderConfigurationState,
  PiProviderDefaults,
  PiSelection,
  PiModelSelectionSnapshot,
  PiCredentialMetadata,
} from "../shared/piProviderContract";
// Re-exported so existing catalog imports keep one entry point while the
// classifier itself stays a Zotero-free leaf.
export { classifyPiEndpoint } from "../utils/endpoint";
export type {
  PiReasoningLevel,
  PiAuthVariant,
  PiApiDialect,
  PiProviderConfiguration,
  PiProviderDefaults,
  PiSelection,
  PiProviderConfigurationState,
  PiModelSelectionSnapshot,
} from "../shared/piProviderContract";

export const PI_REASONING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

const PI_DEFAULT_KEYS = [
  "global",
  "conversation",
  "skillRun",
  "auxiliary",
] as const;

/** Bumped only when an accepted connection target changes. */
const BINDING_REVISION = 1;

type Binding = NonNullable<PiProviderConfiguration["binding"]>;

const RETIRED_AVAILABILITY = new Set(["retired", "unsupported"]);
const CHATGPT_PROVIDER = "openai";
const CHATGPT_API = "openai-responses";
const CHATGPT_BASE_URL = "https://api.openai.com/v1";

function emptyState(): PiProviderConfigurationState {
  return { version: 1, configurations: [], defaults: {}, overlayPath: "" };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function isReasoning(value: unknown): value is PiReasoningLevel {
  return PI_REASONING_LEVELS.includes(value as PiReasoningLevel);
}

type CatalogLike = Pick<PiCatalog, "models">;

function clone<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => clone(item)) as T;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value))
    result[key] = clone(nested);
  return result as T;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

/**
 * A bound description is a copy, not the directory entry: it stays usable when
 * the directory drops the model, and it is marked retained so it is never read
 * as a fresh public or account discovery.
 */
function retainedModel(model: PiCatalogModel): PiCatalogModel {
  const provider = text(model.provider);
  const id = text(model.id);
  const api = text(model.api);
  if (!provider || !id || !api) throw new Error("Invalid Pi model description");
  return {
    ...clone(metadataFacts(model)),
    provider,
    id,
    name: text(model.name) || id,
    api,
    baseUrl: classifyPiEndpoint(text(model.baseUrl)).baseUrl,
    contextWindow: Number(model.contextWindow) || 0,
    maxTokens: Number(model.maxTokens) || 0,
    input: Array.isArray(model.input) ? model.input.map(String) : [],
    supportsTools: model.supportsTools === true,
    reasoning: Array.isArray(model.reasoning)
      ? model.reasoning.map(String)
      : [],
    source: "retained",
    ...(text(model.credentialRef)
      ? { credentialRef: text(model.credentialRef) }
      : {}),
  };
}

/**
 * The description a binding stores. A description assembled from a silent
 * directory entry and a verified saved fact records the fact base those
 * restored facts came from, so a later read never presents them as the current
 * directory's own declaration.
 */
function retainedModelWithFactBase(
  model: PiCatalogModel,
  factBase: PiModelMetadata["provenance"] | undefined,
): PiCatalogModel {
  const retained = retainedModel(model);
  return factBase ? { ...retained, provenance: clone(factBase) } : retained;
}

function normalizeBinding(raw: Binding): Binding {
  if (
    !raw ||
    typeof raw !== "object" ||
    !Number.isSafeInteger(raw.revision) ||
    raw.revision < 1 ||
    !text(raw.api)
  )
    throw new Error("Invalid Pi connection binding");
  return {
    revision: raw.revision,
    api: text(raw.api),
    baseUrl: classifyPiEndpoint(text(raw.baseUrl)).baseUrl,
    ...(raw.model ? { model: retainedModel(raw.model) } : {}),
  };
}

/**
 * A saved connection keeps the target it was accepted with. A directory refresh
 * can change descriptions but never redirects a credential, so only an accepted
 * endpoint change produces a new binding revision.
 */
function resolveBinding(args: {
  raw: PiProviderConfiguration;
  previous?: PiProviderConfiguration;
  endpoint?: { baseUrl: string };
  model?: PiCatalogModel;
}): Binding | undefined {
  const { raw, previous, endpoint, model } = args;
  // A persisted binding is the versioned record of an already accepted target;
  // it survives a re-read of the same connection. An unusable record is not
  // fatal for a connection that declares its own endpoint.
  const kept =
    previous?.binding ||
    (raw.binding ? readPersistedBinding(raw.binding) : undefined);
  if (endpoint) {
    const api = text(raw.api);
    const baseUrl = endpoint.baseUrl;
    if (kept && kept.api === api && kept.baseUrl === baseUrl)
      return {
        ...kept,
        ...(model ? { model: savedDescription(model, kept.model) } : {}),
      };
    return {
      revision: Math.max(BINDING_REVISION, (kept?.revision || 0) + 1),
      api,
      baseUrl,
      ...(model ? { model: savedDescription(model, kept?.model) } : {}),
    };
  }
  if (raw.binding) return normalizeBinding(raw.binding);
  if (kept) return kept;
  if (model)
    return {
      revision: BINDING_REVISION,
      api: model.api,
      baseUrl: model.baseUrl,
      model: retainedModel(model),
    };
  return undefined;
}

function readPersistedBinding(raw: Binding): Binding | undefined {
  try {
    return normalizeBinding(raw);
  } catch {
    return undefined;
  }
}

/**
 * Refresh a stored description without letting a directory that is silent about
 * a verified fact replace it. The restored parts keep the provenance of the
 * fact base they came from.
 */
function savedDescription(
  model: PiCatalogModel,
  saved: PiCatalogModel | undefined,
): PiCatalogModel {
  if (
    !saved ||
    saved.provider !== model.provider ||
    saved.id !== model.id ||
    saved.api !== model.api ||
    saved.baseUrl !== model.baseUrl
  )
    return retainedModel(model);
  const merged = mergeSavedFacts(model, saved);
  return retainedModelWithFactBase(merged.model, merged.factBase);
}

function metadataFacts(model: PiCatalogModel): PiModelMetadata {
  const facts: PiModelMetadata = {};
  if (model.availability) facts.availability = model.availability;
  if (model.type) facts.type = model.type;
  if (model.knowledge) facts.knowledge = clone(model.knowledge);
  if (model.cost) facts.cost = clone(model.cost);
  if (model.promptCache) facts.promptCache = clone(model.promptCache);
  if (model.inputLimits) facts.inputLimits = clone(model.inputLimits);
  if (model.thinkingLevelMap)
    facts.thinkingLevelMap = clone(model.thinkingLevelMap);
  if (model.compat) facts.compat = clone(model.compat);
  if (model.samplingParams) facts.samplingParams = clone(model.samplingParams);
  if (model.provenance) facts.provenance = clone(model.provenance);
  if (model.declaredFields) facts.declaredFields = [...model.declaredFields];
  if (model.authVariants) facts.authVariants = [...model.authVariants];
  return facts;
}

/**
 * Unknown stays unknown: a missing declaration never becomes a known
 * capability, and a fact published for another connection target is not a fact
 * about this one.
 */
function knowledgeOf(
  model: PiCatalogModel,
  applies: boolean,
): NonNullable<PiModelMetadata["knowledge"]> {
  const unknown: PiModelKnowledge = "unknown";
  if (!applies)
    return {
      context: unknown,
      output: unknown,
      input: unknown,
      tools: unknown,
      reasoning: unknown,
    };
  return {
    context:
      model.knowledge?.context ?? (model.contextWindow > 0 ? "known" : unknown),
    output:
      model.knowledge?.output ?? (model.maxTokens > 0 ? "known" : unknown),
    input:
      model.knowledge?.input ?? (model.input.length > 0 ? "known" : unknown),
    tools: model.knowledge?.tools ?? (model.supportsTools ? "known" : unknown),
    reasoning:
      model.knowledge?.reasoning ??
      (model.reasoning.length > 0 ? "known" : unknown),
  };
}

function declaresForTarget(
  model: PiCatalogModel,
  config: PiProviderConfiguration,
  target: { api: string; baseUrl: string },
): boolean {
  if (model.api !== target.api || model.baseUrl !== target.baseUrl)
    return false;
  // A subscription or account target never inherits public API facts from a
  // matching model identity.
  if (model.authVariants && !model.authVariants.includes(config.authVariant))
    return false;
  if (
    config.authVariant === "chatgpt" &&
    model.credentialRef !== config.credentialRef
  )
    return false;
  return true;
}

function frozenMetadata(
  model: PiCatalogModel,
  config: PiProviderConfiguration,
  target: { api: string; baseUrl: string },
  listed: boolean,
): PiModelMetadata {
  const applies = declaresForTarget(model, config, target);
  const facts = metadataFacts(model);
  const availability = RETIRED_AVAILABILITY.has(model.availability || "")
    ? model.availability
    : listed
      ? model.availability
      : "missing";
  return deepFreeze({
    ...(applies ? facts : {}),
    ...(availability ? { availability } : {}),
    knowledge: knowledgeOf(model, applies),
  });
}

function normalizeConfiguration(
  raw: PiProviderConfiguration,
  options: { previous?: PiProviderConfiguration; catalog?: CatalogLike } = {},
): PiProviderConfiguration {
  if (!raw || typeof raw !== "object")
    throw new Error("Invalid Pi configuration");
  const id = text(raw.id);
  if (
    !/^[A-Za-z0-9._-]{1,128}$/.test(id) ||
    ["__proto__", "constructor", "prototype"].includes(id)
  )
    throw new Error("Pi configuration ID is required");
  const authVariant = raw.authVariant;
  if (
    authVariant !== "none" &&
    authVariant !== "api-key" &&
    authVariant !== "chatgpt"
  )
    throw new Error("Invalid Pi auth variant");
  if (
    authVariant === "chatgpt" &&
    (text(raw.provider) !== CHATGPT_PROVIDER ||
      (raw.api !== undefined && raw.api !== CHATGPT_API) ||
      (text(raw.baseUrl) !== "" &&
        classifyPiEndpoint(text(raw.baseUrl)).baseUrl !== CHATGPT_BASE_URL) ||
      (raw.binding !== undefined &&
        (raw.binding.api !== CHATGPT_API ||
          classifyPiEndpoint(text(raw.binding.baseUrl)).baseUrl !==
            CHATGPT_BASE_URL)))
  )
    throw new Error(
      "ChatGPT authentication requires the official OpenAI Responses target",
    );
  if (raw.reasoning !== undefined && !isReasoning(raw.reasoning))
    throw new Error("Invalid Pi reasoning level");
  const baseUrl = text(raw.baseUrl);
  const endpoint = baseUrl ? classifyPiEndpoint(baseUrl) : undefined;
  if (
    endpoint &&
    raw.api !== "openai-responses" &&
    raw.api !== "openai-completions"
  )
    throw new Error("Custom Pi endpoint requires an API dialect");
  const model =
    options.catalog && raw.provider
      ? findPiCatalogModel(
          options.catalog,
          raw as PiProviderConfiguration,
          text(raw.modelId),
        )
      : undefined;
  const binding = resolveBinding({
    raw,
    previous: options.previous,
    endpoint,
    model,
  });
  return {
    id,
    label: text(raw.label),
    provider: text(raw.provider),
    modelId: text(raw.modelId),
    authVariant,
    credentialRef:
      authVariant === "none" ? undefined : text(raw.credentialRef) || undefined,
    enabled: raw.enabled === true,
    baseUrl: endpoint?.baseUrl,
    api: endpoint ? raw.api : undefined,
    reasoning: raw.reasoning,
    requiresLocalNetwork: endpoint?.requiresLocalNetwork || false,
    // A configuration that cannot name its original target keeps that fact
    // until a target is accepted, which is exactly what a binding is.
    ...(!binding && raw.repairRequired === true
      ? { repairRequired: true }
      : {}),
    ...(binding ? { binding } : {}),
  };
}

function parseState(): PiProviderConfigurationState {
  const raw = text(getPref("piProviderConfigurationJson"));
  if (!raw) return emptyState();
  const parsed = JSON.parse(raw) as PiProviderConfigurationState;
  if (parsed.version !== 1 || !Array.isArray(parsed.configurations))
    throw new Error("Invalid Pi config version");
  const defaults: PiProviderDefaults = {};
  for (const key of PI_DEFAULT_KEYS) {
    const selection = parsed.defaults?.[key];
    if (!selection) continue;
    if (selection.reasoning !== undefined && !isReasoning(selection.reasoning))
      throw new Error("Invalid Pi reasoning level");
    defaults[key] = {
      configurationId: text(selection.configurationId),
      modelId: text(selection.modelId) || undefined,
      reasoning: selection.reasoning,
    };
  }
  return {
    version: 1,
    configurations: parsed.configurations.map((entry) =>
      normalizeConfiguration(entry),
    ),
    defaults,
    overlayPath: text(parsed.overlayPath),
  };
}

export function loadPiProviderConfigurationState(): PiProviderConfigurationState {
  try {
    return parseState();
  } catch {
    return emptyState();
  }
}

function save(
  state: PiProviderConfigurationState,
): PiProviderConfigurationState {
  setPref("piProviderConfigurationJson", JSON.stringify(state));
  return state;
}

export function upsertPiProviderConfiguration(
  raw: PiProviderConfiguration,
  catalog?: CatalogLike,
): PiProviderConfigurationState {
  const state = parseState();
  const index = state.configurations.findIndex(
    (entry) => entry.id === text(raw.id),
  );
  const previous = index >= 0 ? state.configurations[index] : undefined;
  const config = normalizeConfiguration(raw, { previous, catalog });
  if (index < 0) state.configurations.push(config);
  else state.configurations[index] = config;
  if (
    !config.enabled ||
    !config.provider ||
    !config.modelId ||
    (previous &&
      JSON.stringify([
        previous.provider,
        previous.modelId,
        previous.authVariant,
        previous.credentialRef,
        previous.baseUrl,
        previous.api,
        previous.reasoning,
        previous.binding?.revision,
      ]) !==
        JSON.stringify([
          config.provider,
          config.modelId,
          config.authVariant,
          config.credentialRef,
          config.baseUrl,
          config.api,
          config.reasoning,
          config.binding?.revision,
        ]))
  ) {
    for (const key of PI_DEFAULT_KEYS) {
      if (state.defaults[key]?.configurationId === config.id)
        delete state.defaults[key];
    }
  }
  return save(state);
}

export function deletePiProviderConfiguration(
  idRaw: string,
): PiProviderConfigurationState {
  const id = text(idRaw);
  const state = parseState();
  state.configurations = state.configurations.filter(
    (entry) => entry.id !== id,
  );
  for (const key of PI_DEFAULT_KEYS) {
    if (state.defaults[key]?.configurationId === id) delete state.defaults[key];
  }
  return save(state);
}

/**
 * Capture the connection target of every saved configuration before the first
 * official directory refresh replaces the public base. The original target
 * comes from the configuration itself or from the directory that was in effect
 * at that moment; a configuration with neither is never re-derived from the
 * new directory — it is disabled and reported so the user repairs it explicitly.
 */
export function migratePiProviderBindings(catalog: CatalogLike): {
  state: PiProviderConfigurationState;
  requiresRepair: string[];
} {
  const state = parseState();
  const requiresRepair: string[] = [];
  state.configurations = state.configurations.map((config) => {
    if (config.binding || config.repairRequired) return config;
    const migrated = normalizeConfiguration(config, {
      previous: config,
      catalog,
    });
    if (migrated.binding) return migrated;
    // The original target is unknown. The configuration, its credential and its
    // existing selections stay exactly as they are and remain visible; only a
    // new turn is blocked until the user accepts a target.
    requiresRepair.push(config.id);
    return { ...config, repairRequired: true };
  });
  return { state: save(state), requiresRepair };
}

function isSelectable(
  config: PiProviderConfiguration,
  credentials: readonly Pick<PiCredentialMetadata, "id" | "kind">[],
): boolean {
  return (
    config.enabled &&
    !config.repairRequired &&
    !!config.provider &&
    !!config.modelId &&
    (config.authVariant === "none"
      ? !!config.baseUrl
      : credentials.some(
          (credential) =>
            credential.id === config.credentialRef &&
            credential.kind === config.authVariant,
        ))
  );
}

function targetOf(
  config: PiProviderConfiguration,
  model: PiCatalogModel,
): { api: string; baseUrl: string } {
  return {
    api: config.binding?.api || config.api || model.api,
    baseUrl: config.binding?.baseUrl || config.baseUrl || model.baseUrl,
  };
}

/**
 * The model a configuration actually uses. A directory entry is always
 * preferred while it describes the target this connection is bound to. An entry
 * republished for another target never replaces the bound description, so a
 * remote endpoint change cannot invalidate facts a saved connection still has.
 */
function effectiveModel(
  catalog: CatalogLike,
  config: PiProviderConfiguration,
  modelId: string,
): { model: PiCatalogModel; listed: boolean } | undefined {
  const present = catalog.models.find(
    (entry) => entry.provider === config.provider && entry.id === modelId,
  );
  const bound = boundModelOf(config, modelId);
  const model = findPiCatalogModel(catalog, config, modelId);
  if (model && (!bound || describesBoundTarget(model, config)))
    return {
      model:
        bound && describesBoundTarget(model, config)
          ? mergeSavedFacts(model, bound).model
          : model,
      listed: true,
    };
  // A listed entry that belongs to another credential is an account fact, not a
  // missing model, and never falls back to a retained description.
  if (!model && (present || config.authVariant === "chatgpt")) return undefined;
  if (bound) return { model: bound, listed: false };
  return undefined;
}

function isUnknown(knowledge: PiModelKnowledge | undefined): boolean {
  return knowledge === undefined || knowledge === "unknown";
}

/**
 * A saved verified fact outlives a directory update that is silent about it: a
 * source that cannot state tools, the output ceiling, image input or reasoning
 * has not revoked what an earlier source verified for this same target. Only a
 * positive verified fact is restored — an old "no tools" is not promoted into
 * a claim, and request-shaping declarations are never resurrected from a
 * superseded source.
 */
function mergeSavedFacts(
  listed: PiCatalogModel,
  saved: PiCatalogModel,
): { model: PiCatalogModel; factBase: PiModelMetadata["provenance"] } {
  const merged: PiCatalogModel = { ...listed };
  let factBase: PiModelMetadata["provenance"];
  if (isUnknown(listed.knowledge?.context) && saved.contextWindow > 0) {
    merged.contextWindow = saved.contextWindow;
    factBase = saved.provenance;
  }
  if (isUnknown(listed.knowledge?.output) && saved.maxTokens > 0) {
    merged.maxTokens = saved.maxTokens;
    factBase = saved.provenance;
  }
  if (isUnknown(listed.knowledge?.input) && saved.input.length > 0) {
    merged.input = [...saved.input];
    factBase = saved.provenance;
  }
  if (isUnknown(listed.knowledge?.tools) && saved.supportsTools === true) {
    merged.supportsTools = true;
    factBase = saved.provenance;
  }
  if (isUnknown(listed.knowledge?.reasoning) && saved.reasoning.length > 0) {
    merged.reasoning = [...saved.reasoning];
    factBase = saved.provenance;
  }
  // The retained fact restores what this connection may run with; it never
  // rewrites what the current directory states. An axis the directory is silent
  // about stays unknown there, and the fact base is what the frozen binding
  // records for the restored part.
  return {
    model: { ...merged, knowledge: knowledgeOf(listed, true) },
    factBase,
  };
}

function describesBoundTarget(
  model: PiCatalogModel,
  config: PiProviderConfiguration,
): boolean {
  const binding = config.binding;
  if (!binding) return true;
  return model.api === binding.api && model.baseUrl === binding.baseUrl;
}

function boundModelOf(
  config: PiProviderConfiguration,
  modelId: string,
): PiCatalogModel | undefined {
  const bound = config.binding?.model;
  if (
    !bound ||
    bound.provider !== config.provider ||
    bound.id !== modelId ||
    !hasPiModelCapabilities(bound) ||
    // An account discovery stays bound to the credential that produced it.
    (config.authVariant === "chatgpt" &&
      bound.credentialRef !== config.credentialRef)
  )
    return undefined;
  return bound;
}

function reasoningSupported(
  model: PiCatalogModel,
  reasoning: PiReasoningLevel,
): boolean {
  if (!model.reasoning.includes(reasoning)) return false;
  // A level the frozen thinking map marks unsupported is refused rather than
  // silently clamped by the SDK.
  return model.thinkingLevelMap?.[reasoning] !== null;
}

/**
 * Offline capture. The first resolution against the effective directory
 * records the target this connection is already using; the pre-adoption
 * migration has already bound every saved connection, so a capture here only
 * ever adopts the directory the user is acting on right now.
 */
function captureBinding(
  config: PiProviderConfiguration,
  catalog: CatalogLike,
): PiProviderConfiguration {
  if (config.binding) return config;
  const adopted = normalizeConfiguration(config, { previous: config, catalog });
  if (!adopted.binding) return config;
  try {
    const state = parseState();
    const index = state.configurations.findIndex(
      (entry) => entry.id === config.id,
    );
    if (index < 0 || state.configurations[index].binding) return config;
    state.configurations[index] = {
      ...state.configurations[index],
      binding: adopted.binding,
    };
    save(state);
    return state.configurations[index];
  } catch {
    // An unreadable document is never overwritten just to record a binding.
    return adopted;
  }
}

export function setPiProviderDefaults(
  defaults: PiProviderDefaults,
  credentials: readonly Pick<PiCredentialMetadata, "id" | "kind">[],
  catalog: Pick<PiCatalog, "models">,
): PiProviderConfigurationState {
  const state = parseState();
  const next: PiProviderDefaults = {};
  for (const key of PI_DEFAULT_KEYS) {
    const selection = defaults[key];
    if (!selection) continue;
    const config = state.configurations.find(
      (entry) => entry.id === selection.configurationId,
    );
    const model = config
      ? findPiCatalogModel(catalog, config, selection.modelId || config.modelId)
      : undefined;
    if (
      !config ||
      !isSelectable(config, credentials) ||
      !hasPiModelCapabilities(model)
    )
      throw new Error("Pi default configuration is unavailable");
    if (selection.reasoning !== undefined && !isReasoning(selection.reasoning))
      throw new Error("Invalid Pi reasoning level");
    if (
      !model.reasoning.includes(
        selection.reasoning || config.reasoning || "off",
      )
    )
      throw new Error("Unsupported Pi reasoning level");
    next[key] = {
      configurationId: config.id,
      modelId: text(selection.modelId) || undefined,
      reasoning: selection.reasoning,
    };
  }
  state.defaults = next;
  return save(state);
}

export function setPiOverlayPath(
  pathRaw: string,
): PiProviderConfigurationState {
  const state = parseState();
  state.overlayPath = text(pathRaw);
  return save(state);
}

export function findPiCatalogModel(
  catalog: Pick<PiCatalog, "models">,
  config: PiProviderConfiguration,
  modelId: string,
): PiCatalogModel | undefined {
  return catalog.models.find((entry) => {
    if (entry.provider !== config.provider || entry.id !== modelId)
      return false;
    if (config.authVariant === "chatgpt")
      return (
        entry.source === "discovered" &&
        entry.api === CHATGPT_API &&
        entry.baseUrl === CHATGPT_BASE_URL &&
        entry.credentialRef === config.credentialRef &&
        entry.authVariants?.includes("chatgpt") === true
      );
    if (entry.credentialRef) return false;
    return (
      !entry.authVariants || entry.authVariants.includes(config.authVariant)
    );
  });
}

export function hasPiModelCapabilities(
  model: PiCatalogModel | undefined,
): model is PiCatalogModel {
  return (
    !!model &&
    model.contextWindow > 0 &&
    (model.maxTokens > 0 ||
      (model.authVariants?.includes("chatgpt") === true &&
        model.maxTokens === 0)) &&
    model.input.includes("text")
  );
}

export function resolvePiModelSelection(args: {
  kind: "conversation" | "skillRun";
  catalog: Pick<PiCatalog, "revision" | "models">;
  credentials?: readonly Pick<PiCredentialMetadata, "id" | "kind">[];
  explicit?: PiSelection;
  ownerSelection?: PiSelection;
}): PiModelSelectionSnapshot {
  const state = loadPiProviderConfigurationState();
  const credentials = args.credentials || [];
  const options = [
    args.explicit,
    args.ownerSelection,
    state.defaults[args.kind],
    state.defaults.global,
  ];
  let selected: PiSelection | undefined;
  let config: PiProviderConfiguration | undefined;
  for (const option of options) {
    if (!option) continue;
    const found = state.configurations.find(
      (entry) => entry.id === option.configurationId,
    );
    if (found?.repairRequired)
      throw new Error("Pi connection requires an explicit target repair");
    if (!found || !isSelectable(found, credentials))
      throw new Error("Pi selection is unavailable");
    selected = option;
    config = found;
    break;
  }
  if (!config)
    config = state.configurations.find((entry) => {
      const found = effectiveModel(args.catalog, entry, entry.modelId);
      return (
        isSelectable(entry, credentials) &&
        !!found &&
        hasPiModelCapabilities(found.model) &&
        reasoningSupported(found.model, entry.reasoning || "off")
      );
    });
  if (!config) throw new Error("No Pi provider configuration is available");
  const modelId = selected?.modelId || config.modelId;
  const found = effectiveModel(args.catalog, config, modelId);
  if (!found) throw new Error("Pi model is absent from catalog");
  const model = found.model;
  if (!hasPiModelCapabilities(model))
    throw new Error("Pi model has incomplete capabilities");
  if (RETIRED_AVAILABILITY.has(model.availability || ""))
    throw new Error(`Pi model is ${model.availability}`);
  const reasoning = selected?.reasoning || config.reasoning || "off";
  if (!isReasoning(reasoning) || !reasoningSupported(model, reasoning))
    throw new Error("Unsupported Pi reasoning level");
  const bound = captureBinding(config, args.catalog);
  const target = targetOf(bound, model);
  const policy = Object.freeze({
    contextWindow: model.contextWindow,
    maxTokens: model.maxTokens,
    input: Object.freeze([...model.input]),
    supportsTools: model.supportsTools === true,
  });
  return Object.freeze({
    configurationId: config.id,
    configurationLabel: config.label,
    provider: config.provider,
    modelId,
    authVariant: config.authVariant,
    credentialRef: config.credentialRef,
    api: target.api,
    baseUrl: target.baseUrl,
    reasoning,
    catalogRevision: args.catalog.revision,
    adapterVersion: PI_PROVIDER_ADAPTER_VERSION,
    runtimeVersion: PI_RUNTIME_VERSION,
    requiresLocalNetwork:
      config.requiresLocalNetwork ||
      classifyPiEndpoint(target.baseUrl).requiresLocalNetwork,
    ...(bound.binding ? { bindingRevision: bound.binding.revision } : {}),
    selectionId: [
      bound.id,
      bound.binding?.revision || 0,
      modelId,
      reasoning,
      args.catalog.revision,
    ].join("#"),
    metadata: frozenMetadata(model, config, target, found.listed),
    policy,
  });
}
