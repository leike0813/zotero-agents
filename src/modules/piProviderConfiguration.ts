import { getPref, setPref } from "../utils/prefs";
import {
  PI_RUNTIME_VERSION,
  PI_PROVIDER_ADAPTER_VERSION,
} from "../config/piRuntimeBuild";
import { classifyPiEndpoint } from "../utils/endpoint";
import { scanPiCredentialReferences } from "../shared/piCredentialReferenceScan";
import {
  PI_API_AUTH_VARIANTS,
  PI_PROVIDER_EXECUTION_APIS,
  type PiExecutionApi,
} from "../shared/piProviderContract";
import type { PiCatalog, PiCatalogModel } from "./piModelCatalog";
import { commitPiCredentialChange } from "./piCredentialStore";
import type {
  PiConnectionRemoval,
  PiCredentialMetadata,
  PiModelAvailability,
  PiModelConfiguration,
  PiModelKnowledge,
  PiModelMetadata,
  PiModelSelectionSnapshot,
  PiProviderConnection,
  PiProviderConfigurationState,
  PiProviderDefaults,
  PiReasoningLevel,
  PiSelection,
} from "../shared/piProviderContract";
// Re-exported so existing catalog imports keep one entry point while the
// classifier itself stays a Zotero-free leaf.
export { classifyPiEndpoint } from "../utils/endpoint";
export type {
  PiReasoningLevel,
  PiAuthVariant,
  PiApiDialect,
  PiConnectionRemoval,
  PiModelAvailability,
  PiModelConfiguration,
  PiProviderConnection,
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
/** Bumped only when a card's admitted description identity changes. */
const MODEL_BINDING_REVISION = 1;

const MCP_SOURCE_PREF = "piMcpSourceRegistryJson";
const WEB_SOURCE_PREF = "piWebSourcesJson";

type ConnectionBinding = NonNullable<PiProviderConnection["binding"]>;
type ModelBinding = NonNullable<PiModelConfiguration["binding"]>;
type Target = { api: PiExecutionApi; baseUrl: string };

const PROVIDER_PRIMARY_API = PI_PROVIDER_EXECUTION_APIS;
const EXECUTION_APIS = new Set<string>(Object.keys(PI_API_AUTH_VARIANTS));

/**
 * Narrow a declared API to one this project can execute. A directory row naming
 * any other API — a hosted provider with no adapter here — is refused rather
 * than routed to a stream that does not exist.
 */
function executionApiOf(value: unknown): PiExecutionApi | undefined {
  const api = text(value);
  return EXECUTION_APIS.has(api) ? (api as PiExecutionApi) : undefined;
}

/**
 * A structured report for a saved document this owner cannot read. Callers
 * branch on `code`; the message is for a person, never for control flow.
 */
export class PiProviderConfigurationFailure extends Error {
  constructor(readonly code: "document_invalid" | "document_incompatible") {
    super(
      code === "document_invalid"
        ? "The saved Pi configuration document is damaged"
        : "The saved Pi configuration document is not a current document",
    );
    this.name = "PiProviderConfigurationFailure";
  }
}

const RETIRED_AVAILABILITY = new Set(["retired", "unsupported"]);
const CHATGPT_PROVIDER = "openai";
const CHATGPT_API = "openai-responses";
const CHATGPT_BASE_URL = "https://api.openai.com/v1";

function emptyState(): PiProviderConfigurationState {
  return {
    version: 2,
    connections: [],
    configurations: [],
    defaults: {},
    overlayPath: "",
  };
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

function normalizeConnectionBinding(raw: ConnectionBinding): ConnectionBinding {
  const api = executionApiOf(raw?.api);
  if (
    !raw ||
    typeof raw !== "object" ||
    !Number.isSafeInteger(raw.revision) ||
    raw.revision < 1 ||
    !api
  )
    throw new Error(
      api
        ? "Invalid Pi connection binding"
        : "Pi connection target names an API this build cannot execute",
    );
  return {
    revision: raw.revision,
    api,
    baseUrl: classifyPiEndpoint(text(raw.baseUrl)).baseUrl,
  };
}

function normalizeModelBinding(raw: ModelBinding): ModelBinding {
  if (
    !raw ||
    typeof raw !== "object" ||
    !Number.isSafeInteger(raw.revision) ||
    raw.revision < 1
  )
    throw new Error("Invalid Pi model binding");
  return {
    revision: raw.revision,
    ...(raw.model ? { model: retainedModel(raw.model) } : {}),
  };
}

/**
 * A saved connection keeps the target it was accepted with. A directory refresh
 * can change descriptions but never redirects a credential, so only an accepted
 * endpoint change produces a new binding revision.
 */
function resolveConnectionBinding(args: {
  raw: PiProviderConnection;
  previous?: PiProviderConnection;
  endpoint?: { baseUrl: string };
  model?: PiCatalogModel;
}): ConnectionBinding | undefined {
  const { raw, previous, endpoint, model } = args;
  // A persisted binding is the versioned record of an already accepted target;
  // it survives a re-read of the same connection. An unusable record is not
  // fatal for a connection that declares its own endpoint.
  const kept =
    previous?.binding ||
    (raw.binding ? readPersistedConnectionBinding(raw.binding) : undefined);
  if (endpoint) {
    const api = executionApiOf(raw.api);
    if (!api) return kept;
    const baseUrl = endpoint.baseUrl;
    if (kept && kept.api === api && kept.baseUrl === baseUrl) return kept;
    return {
      revision: Math.max(BINDING_REVISION, (kept?.revision || 0) + 1),
      api,
      baseUrl,
    };
  }
  if (raw.binding) return normalizeConnectionBinding(raw.binding);
  if (kept) return kept;
  const modelApi = executionApiOf(model?.api);
  if (model && modelApi)
    return {
      revision: BINDING_REVISION,
      api: modelApi,
      baseUrl: model.baseUrl,
    };
  return undefined;
}

function readPersistedConnectionBinding(
  raw: ConnectionBinding,
): ConnectionBinding | undefined {
  try {
    return normalizeConnectionBinding(raw);
  } catch {
    return undefined;
  }
}

/** The identity a card's admitted description is bound to. */
function descriptionIdentity(model: PiCatalogModel): string {
  return [model.provider, model.id, model.api, model.baseUrl].join("\n");
}

/**
 * A card's binding revision names the description identity it admitted, not the
 * directory revision that refreshed its facts: an applicable test result stays
 * valid across a directory update and is invalidated by a different target,
 * model or calling option.
 */
function resolveModelBinding(args: {
  raw: PiModelConfiguration;
  previous?: PiModelConfiguration;
  model?: PiCatalogModel;
  target?: Target;
}): ModelBinding | undefined {
  const { raw, previous, model, target } = args;
  const kept =
    previous?.binding ||
    (raw.binding ? readPersistedModelBinding(raw.binding) : undefined);
  const persisted = kept
    ? { ...kept }
    : raw.binding
      ? normalizeModelBinding(raw.binding)
      : undefined;
  if (
    !model ||
    !target ||
    model.api !== target.api ||
    model.baseUrl !== target.baseUrl
  )
    return persisted;
  const description = savedDescription(model, kept?.model);
  return {
    revision:
      kept?.model &&
      descriptionIdentity(kept.model) === descriptionIdentity(description)
        ? kept.revision
        : Math.max(MODEL_BINDING_REVISION, (kept?.revision || 0) + 1),
    model: description,
  };
}

function readPersistedModelBinding(
  raw: ModelBinding,
): ModelBinding | undefined {
  try {
    return normalizeModelBinding(raw);
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
  connection: PiProviderConnection,
  target: Target,
): boolean {
  if (model.api !== target.api || model.baseUrl !== target.baseUrl)
    return false;
  // A subscription or account target never inherits public API facts from a
  // matching model identity.
  if (
    model.authVariants &&
    !model.authVariants.includes(connection.authVariant)
  )
    return false;
  if (
    connection.authVariant === "chatgpt" &&
    model.credentialRef !== connection.credentialRef
  )
    return false;
  return true;
}

function frozenMetadata(
  model: PiCatalogModel,
  connection: PiProviderConnection,
  target: Target,
  listed: boolean,
): PiModelMetadata {
  const applies = declaresForTarget(model, connection, target);
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

function normalizeConnection(
  raw: PiProviderConnection,
  options: {
    previous?: PiProviderConnection;
    endpoint?: { baseUrl: string };
    model?: PiCatalogModel;
  } = {},
): PiProviderConnection {
  if (!raw || typeof raw !== "object") throw new Error("Invalid Pi connection");
  const id = text(raw.id);
  if (
    !/^[A-Za-z0-9._-]{1,128}$/.test(id) ||
    ["__proto__", "constructor", "prototype"].includes(id)
  )
    throw new Error("Pi connection ID is required");
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
  const baseUrl = text(raw.baseUrl);
  const endpoint = baseUrl ? classifyPiEndpoint(baseUrl) : undefined;
  if (raw.api !== undefined && !executionApiOf(raw.api))
    throw new Error("Pi connection names an API this build cannot execute");
  // A custom endpoint is only meaningful with an explicit dialect: the
  // provider default describes the public API, not a host the user typed.
  if (endpoint && !raw.api)
    throw new Error("Custom Pi endpoint requires an API dialect");
  const binding = resolveConnectionBinding({
    raw,
    previous: options.previous,
    endpoint,
    model: options.model,
  });
  return {
    id,
    label: text(raw.label),
    provider: text(raw.provider),
    authVariant,
    credentialRef:
      authVariant === "none" ? undefined : text(raw.credentialRef) || undefined,
    enabled: raw.enabled === true,
    baseUrl: endpoint?.baseUrl,
    api: endpoint ? raw.api : undefined,
    requiresLocalNetwork: endpoint?.requiresLocalNetwork || false,
    ...(endpoint?.requiresLocalNetwork &&
    raw.localNetworkApprovedOrigin === new URL(endpoint.baseUrl).origin
      ? { localNetworkApprovedOrigin: raw.localNetworkApprovedOrigin }
      : {}),
    // A connection that cannot name its original target keeps that fact
    // until a target is accepted, which is exactly what a binding is.
    ...(!binding && raw.repairRequired === true
      ? { repairRequired: true }
      : {}),
    ...(binding ? { binding } : {}),
  };
}

function normalizeModelConfiguration(
  raw: PiModelConfiguration,
  options: {
    previous?: PiModelConfiguration;
    connection?: PiProviderConnection;
    catalog?: CatalogLike;
  } = {},
): PiModelConfiguration {
  if (!raw || typeof raw !== "object")
    throw new Error("Invalid Pi model configuration");
  const id = text(raw.id);
  if (
    !/^[A-Za-z0-9._-]{1,128}$/.test(id) ||
    ["__proto__", "constructor", "prototype"].includes(id)
  )
    throw new Error("Pi model configuration ID is required");
  const connectionId = text(raw.connectionId);
  if (!connectionId)
    throw new Error("Pi model configuration requires a connection");
  if (raw.reasoning !== undefined && !isReasoning(raw.reasoning))
    throw new Error("Invalid Pi reasoning level");
  const connection = options.connection;
  const modelId = text(raw.modelId);
  const model =
    options.catalog && connection
      ? findPiCatalogModel(options.catalog, connection, modelId)
      : undefined;
  const binding = resolveModelBinding({
    raw,
    previous: options.previous,
    model,
    target: connection ? configuredTarget(connection) : undefined,
  });
  return {
    id,
    connectionId,
    modelId,
    enabled: raw.enabled === true,
    reasoning: raw.reasoning,
    ...(binding ? { binding } : {}),
  };
}

function parseState(): PiProviderConfigurationState {
  const raw = text(getPref("piProviderConfigurationJson"));
  if (!raw) return emptyState();
  let parsed: PiProviderConfigurationState;
  try {
    parsed = JSON.parse(raw) as PiProviderConfigurationState;
  } catch {
    throw new PiProviderConfigurationFailure("document_invalid");
  }
  if (
    parsed.version !== 2 ||
    !Array.isArray(parsed.connections) ||
    !Array.isArray(parsed.configurations)
  )
    throw new PiProviderConfigurationFailure("document_incompatible");
  const connections = parsed.connections.map((entry) =>
    normalizeConnection(entry),
  );
  const byId = new Map(connections.map((entry) => [entry.id, entry]));
  const configurations = parsed.configurations.map((entry) => {
    const connectionId = text((entry as PiModelConfiguration).connectionId);
    const connection = byId.get(connectionId);
    if (!connection)
      throw new Error("Pi model configuration requires a connection");
    return normalizeModelConfiguration(entry, { connection });
  });
  const defaults: PiProviderDefaults = {};
  for (const key of PI_DEFAULT_KEYS) {
    const selection = parsed.defaults?.[key];
    if (!selection) continue;
    if (selection.reasoning !== undefined && !isReasoning(selection.reasoning))
      throw new Error("Invalid Pi reasoning level");
    const configurationId = text(selection.configurationId);
    if (!configurationId) continue;
    defaults[key] = {
      configurationId,
      reasoning: selection.reasoning,
    };
  }
  return {
    version: 2,
    connections,
    configurations,
    defaults,
    overlayPath: text(parsed.overlayPath),
  };
}

/**
 * A saved document that this owner cannot read is reported, never reset. There
 * is no migration and no compatibility reader for an unreleased shape, so an
 * incompatible or damaged document is a configuration error the user has to
 * resolve; silently replacing it would destroy configuration the user still has.
 */
export function loadPiProviderConfigurationState(): PiProviderConfigurationState {
  return parseState();
}

function save(
  state: PiProviderConfigurationState,
): PiProviderConfigurationState {
  setPref("piProviderConfigurationJson", JSON.stringify(state));
  return state;
}

/**
 * Saving a connection never requires a model and never touches defaults. A
 * retained default keeps pointing at its card; whether that card can currently
 * run is answered by {@link resolvePiModelAvailability}, not by dropping the
 * reference.
 */
export function upsertPiProviderConnection(
  raw: PiProviderConnection,
): PiProviderConfigurationState {
  const state = parseState();
  const index = state.connections.findIndex(
    (entry) => entry.id === text(raw.id),
  );
  const previous = index >= 0 ? state.connections[index] : undefined;
  const connection = normalizeConnection(raw, { previous });
  if (index < 0) state.connections.push(connection);
  else state.connections[index] = connection;
  return save(state);
}

export function upsertPiModelConfiguration(
  raw: PiModelConfiguration,
  catalog?: CatalogLike,
): PiProviderConfigurationState {
  const state = parseState();
  let connection = state.connections.find(
    (entry) => entry.id === text(raw.connectionId),
  );
  if (!connection)
    throw new Error("Pi model configuration requires a connection");
  // A card's description is admitted against one target, so the connection is
  // bound to that same target in the same save. A directory refresh afterwards
  // can then only refresh facts, never move where this connection points.
  if (!configuredTarget(connection)) {
    const adopted = normalizeConnection(connection, {
      previous: connection,
      model: catalog
        ? findPiCatalogModel(catalog, connection, text(raw.modelId))
        : undefined,
    });
    if (adopted.binding) {
      connection = adopted;
      const connectionIndex = state.connections.findIndex(
        (entry) => entry.id === connection!.id,
      );
      if (connectionIndex >= 0) state.connections[connectionIndex] = adopted;
    }
  }
  const index = state.configurations.findIndex(
    (entry) => entry.id === text(raw.id),
  );
  const previous = index >= 0 ? state.configurations[index] : undefined;
  const configuration = normalizeModelConfiguration(raw, {
    previous,
    connection,
    catalog,
  });
  if (index < 0) state.configurations.push(configuration);
  else state.configurations[index] = configuration;
  return save(state);
}

function clearPurposeReferences(
  state: PiProviderConfigurationState,
  configurationIds: readonly string[],
): string[] {
  const removed = new Set(configurationIds);
  const cleared: string[] = [];
  for (const key of PI_DEFAULT_KEYS) {
    const selection = state.defaults[key];
    if (selection && removed.has(selection.configurationId)) {
      delete state.defaults[key];
      cleared.push(key);
    }
  }
  return cleared;
}

/**
 * A card removal clears only the purposes that named it. The connection, its
 * authentication and every other card stay exactly as they are.
 */
export function removePiModelConfiguration(
  idRaw: string,
): PiProviderConfigurationState {
  const id = text(idRaw);
  const state = parseState();
  if (!state.configurations.some((entry) => entry.id === id)) return state;
  state.configurations = state.configurations.filter(
    (entry) => entry.id !== id,
  );
  clearPurposeReferences(state, [id]);
  return save(state);
}

/**
 * Connection removal is an explicit operation with a reported impact. It
 * removes the connection's cards and the purposes that named them, keeps an
 * independently owned ChatGPT registration, and releases an API key only once
 * no connection, MCP source or Web source still names it.
 */
export async function removePiProviderConnection(
  idRaw: string,
): Promise<PiConnectionRemoval> {
  const id = text(idRaw);
  const removal: PiConnectionRemoval = {
    removedModelConfigurationIds: [],
    clearedDefaultKeys: [],
    releasedCredentialIds: [],
    retainedCredentialIds: [],
  };
  const state = parseState();
  const connection = state.connections.find((entry) => entry.id === id);
  if (!connection) return removal;
  removal.removedModelConfigurationIds = state.configurations
    .filter((entry) => entry.connectionId === id)
    .map((entry) => entry.id);
  state.connections = state.connections.filter((entry) => entry.id !== id);
  state.configurations = state.configurations.filter(
    (entry) => entry.connectionId !== id,
  );
  removal.clearedDefaultKeys = clearPurposeReferences(
    state,
    removal.removedModelConfigurationIds,
  );

  const credentialId = text(connection.credentialRef);
  // A ChatGPT registration is owned by the auth owner, not by this connection,
  // so removing a connection never releases it.
  if (!credentialId || connection.authVariant === "chatgpt") {
    save(state);
    return removal;
  }
  const external = scanPiCredentialReferences([
    JSON.stringify({ version: 2, connections: state.connections }),
    getPref(MCP_SOURCE_PREF),
    getPref(WEB_SOURCE_PREF),
  ]);
  // An unreadable source document is not evidence that nothing else uses the
  // key, so a credential is kept rather than released on incomplete evidence.
  if (!external.complete || external.referenced.has(credentialId)) {
    save(state);
    removal.retainedCredentialIds.push(credentialId);
    return removal;
  }
  // One coordinated commit: the document and the release land together, and the
  // identity is published once after both.
  await commitPiCredentialChange({
    release: {
      id: credentialId,
      namespace: "model-provider",
      expected: { kind: connection.authVariant },
    },
    apply: () => {
      save(state);
    },
  });
  removal.releasedCredentialIds.push(credentialId);
  return removal;
}

function configuredTarget(
  connection: PiProviderConnection,
): Target | undefined {
  if (connection.binding)
    return {
      api: connection.binding.api,
      baseUrl: connection.binding.baseUrl,
    };
  if (connection.baseUrl && connection.api)
    return { api: connection.api, baseUrl: connection.baseUrl };
  return undefined;
}

function targetOf(
  connection: PiProviderConnection,
  model: PiCatalogModel,
): Target {
  const api = executionApiOf(model.api);
  if (!api) throw new Error("Pi model names an API this build cannot execute");
  return (
    configuredTarget(connection) || {
      api,
      baseUrl: model.baseUrl,
    }
  );
}

/**
 * The model a card actually uses. A directory entry is always preferred while
 * it describes the target this connection is bound to. An entry republished for
 * another target never replaces the bound description, so a remote endpoint
 * change cannot invalidate facts a saved connection still has.
 */
function effectiveModel(
  catalog: CatalogLike,
  connection: PiProviderConnection,
  card: PiModelConfiguration,
): { model: PiCatalogModel; listed: boolean } | undefined {
  const present = catalog.models.find(
    (entry) =>
      entry.provider === connection.provider && entry.id === card.modelId,
  );
  const bound = boundModelOf(connection, card);
  const model = findPiCatalogModel(catalog, connection, card.modelId);
  if (model && (!bound || describesBoundTarget(model, connection)))
    return {
      model:
        bound && describesBoundTarget(model, connection)
          ? mergeSavedFacts(model, bound).model
          : model,
      listed: true,
    };
  // A listed entry that belongs to another credential is an account fact, not a
  // missing model, and never falls back to a retained description.
  if (!model && (present || connection.authVariant === "chatgpt"))
    return undefined;
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
  connection: PiProviderConnection,
): boolean {
  const binding = connection.binding;
  if (!binding) return true;
  return model.api === binding.api && model.baseUrl === binding.baseUrl;
}

function boundModelOf(
  connection: PiProviderConnection,
  card: PiModelConfiguration,
): PiCatalogModel | undefined {
  const bound = card.binding?.model;
  if (
    !bound ||
    bound.provider !== connection.provider ||
    bound.id !== card.modelId ||
    !hasPiModelCapabilities(bound) ||
    // An account discovery stays bound to the credential that produced it.
    (connection.authVariant === "chatgpt" &&
      bound.credentialRef !== connection.credentialRef)
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
 * Offline capture. The first resolution of a card against the effective
 * directory records the target this connection is already using. A connection
 * that declares its own endpoint already has one; a connection with neither is
 * never re-derived from a directory row the user did not point it at.
 */
function captureConnectionBinding(
  connection: PiProviderConnection,
  model: PiCatalogModel | undefined,
): PiProviderConnection {
  if (connection.binding || !model) return connection;
  const adopted = normalizeConnection(connection, {
    previous: connection,
    endpoint: { baseUrl: model.baseUrl },
  });
  if (!adopted.binding) return connection;
  try {
    const state = parseState();
    const index = state.connections.findIndex(
      (entry) => entry.id === connection.id,
    );
    if (index < 0 || state.connections[index].binding) return connection;
    state.connections[index] = {
      ...state.connections[index],
      binding: adopted.binding,
    };
    save(state);
    return state.connections[index];
  } catch {
    // An unreadable document is never overwritten just to record a binding.
    return adopted;
  }
}

type ResolvedCard = {
  connection: PiProviderConnection;
  card: PiModelConfiguration;
  model: PiCatalogModel;
  listed: boolean;
  target: Target;
  reasoning: PiReasoningLevel;
};

function unavailable(reason: string): PiModelAvailability {
  return { usable: false, reason };
}

/**
 * Resolve a card to everything a turn needs, or return the reason it cannot run.
 * The target is always the connection's own accepted endpoint or the one it was
 * bound with; a directory row never becomes a target on its own.
 */
function resolveCard(
  state: PiProviderConfigurationState,
  card: PiModelConfiguration,
  catalog: CatalogLike,
  credentials: readonly Pick<PiCredentialMetadata, "id" | "kind">[],
  reasoningOverride?: PiReasoningLevel,
  modelIdOverride?: string,
): ResolvedCard | string {
  const connection = state.connections.find(
    (entry) => entry.id === card.connectionId,
  );
  if (!connection) return "Pi model configuration requires a connection";
  if (connection.repairRequired)
    return "Pi connection requires an explicit target repair";
  if (!connection.enabled) return "Pi connection is disabled";
  if (!card.enabled) return "Pi model configuration is disabled";
  if (!connection.provider) return "Pi connection has no provider";
  // A turn-level override names a model on this card's own connection, so it
  // can never retarget a different connection.
  const modelId = text(modelIdOverride) || card.modelId;
  if (!modelId) return "Pi model configuration has no model";
  const selected: PiModelConfiguration = { ...card, modelId };
  if (connection.authVariant !== "none") {
    const credentialRef = text(connection.credentialRef);
    if (
      !credentialRef ||
      !credentials.some(
        (credential) =>
          credential.id === credentialRef &&
          credential.kind === connection.authVariant,
      )
    )
      return "Pi connection has no usable credential";
  }
  const found = effectiveModel(catalog, connection, selected);
  if (!found) return "Pi model is absent from catalog";
  if (!hasPiModelCapabilities(found.model))
    return "Pi model has incomplete capabilities";
  if (RETIRED_AVAILABILITY.has(found.model.availability || ""))
    return `Pi model is ${found.model.availability}`;
  const bound = captureConnectionBinding(connection, found.model);
  const reasoning = reasoningOverride ?? card.reasoning ?? "off";
  if (!isReasoning(reasoning) || !reasoningSupported(found.model, reasoning))
    return "Unsupported Pi reasoning level";
  return {
    connection: bound,
    card: selected,
    model: found.model,
    listed: found.listed,
    target: targetOf(bound, found.model),
    reasoning,
  };
}

/**
 * Whether one saved card can run right now, and why not when it cannot. This is
 * how a retained default stays visible after an edit: the reference survives
 * and carries this reason instead of being silently dropped.
 */
export function resolvePiModelAvailability(args: {
  configurationId: string;
  catalog: Pick<PiCatalog, "revision" | "models">;
  credentials?: readonly Pick<PiCredentialMetadata, "id" | "kind">[];
  reasoning?: PiReasoningLevel;
}): PiModelAvailability {
  const state = loadPiProviderConfigurationState();
  const card = state.configurations.find(
    (entry) => entry.id === text(args.configurationId),
  );
  if (!card) return unavailable("Pi model configuration is not saved");
  const resolved = resolveCard(
    state,
    card,
    args.catalog,
    args.credentials || [],
    args.reasoning,
  );
  return typeof resolved === "string"
    ? unavailable(resolved)
    : { usable: true };
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
    const card = state.configurations.find(
      (entry) => entry.id === selection.configurationId,
    );
    if (!card) throw new Error("Pi default configuration is unavailable");
    if (selection.reasoning !== undefined && !isReasoning(selection.reasoning))
      throw new Error("Invalid Pi reasoning level");
    const resolved = resolveCard(
      state,
      card,
      { models: catalog.models },
      credentials,
      selection.reasoning,
    );
    if (typeof resolved === "string")
      throw new Error(
        resolved.includes("reasoning")
          ? "Unsupported Pi reasoning level"
          : "Pi default configuration is unavailable",
      );
    next[key] = {
      configurationId: card.id,
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

/**
 * The identity a card's evidence must still match to stay applicable.
 *
 * It is deliberately blind to presentation: renaming a connection or a card
 * keeps every applicable result. It changes exactly when the captured
 * invocation would differ — a different card or model, a changed target, a
 * changed authentication identity, or changed calling options. Callers combine
 * it with the credential identity revision so a key rotation invalidates the
 * result even though no configuration field changed.
 */
export function piModelConfigurationBindingIdentity(args: {
  configurationId: string;
  state?: PiProviderConfigurationState;
}): string | undefined {
  const state = args.state || loadPiProviderConfigurationState();
  const card = state.configurations.find(
    (entry) => entry.id === text(args.configurationId),
  );
  if (!card) return undefined;
  const connection = state.connections.find(
    (entry) => entry.id === card.connectionId,
  );
  if (!connection) return undefined;
  return [
    connection.id,
    connection.binding?.revision || 0,
    connection.authVariant,
    text(connection.credentialRef),
    card.id,
    card.binding?.revision || 0,
    card.modelId,
    card.reasoning || "off",
  ].join("#");
}

/**
 * The saved cards a model picker may offer, with the display name this owner
 * owns. Two cards can name the same model on different connections, so the
 * connection label is part of the name whenever the connection has one.
 */
export function listPiModelConfigurationChoices(
  args: {
    state?: PiProviderConfigurationState;
    includeDisabled?: boolean;
  } = {},
): {
  id: string;
  connectionId: string;
  modelId: string;
  label: string;
  enabled: boolean;
  purposes: string[];
}[] {
  const state = args.state || loadPiProviderConfigurationState();
  const connections = new Map(
    state.connections.map((entry) => [entry.id, entry]),
  );
  return state.configurations
    .filter(
      (card) =>
        args.includeDisabled ||
        (card.enabled && connections.get(card.connectionId)?.enabled !== false),
    )
    .map((card) => {
      const connection = connections.get(card.connectionId);
      const label = text(connection?.label);
      return {
        id: card.id,
        connectionId: card.connectionId,
        modelId: card.modelId,
        label: label ? `${label} · ${card.modelId}` : card.modelId,
        enabled: card.enabled,
        purposes: PI_DEFAULT_KEYS.filter(
          (key) => state.defaults[key]?.configurationId === card.id,
        ),
      };
    });
}

/**
 * Save a connection and its plaintext secret as one owner operation.
 *
 * The document is read and the connection validated before any secret exists,
 * so a configuration this owner refuses never leaves a credential behind. A
 * document write that fails after the secret was written restores the previous
 * credential state, or removes the new one, so a failed save never orphans a key
 * that no connection references.
 *
 * A ChatGPT registration is owned by the auth owner and is never written here.
 */
export async function savePiProviderConnection(input: {
  connection: PiProviderConnection;
  /**
   * The effective directory. A connection that declares no target of its own
   * accepts the provider's public target from here at save time, so the saved
   * connection is already bound and does not stay unbound until a card happens
   * to resolve.
   */
  catalog?: CatalogLike;
  /** Omitted keeps the stored secret; an explicit empty string clears it. */
  secret?: string;
  secretLabel?: string;
  signal?: AbortSignal;
}): Promise<{
  state: PiProviderConfigurationState;
  credential?: PiCredentialMetadata;
}> {
  const raw = input.connection;
  if (input.secret !== undefined && raw.authVariant === "chatgpt")
    throw new Error(
      "ChatGPT registration is not saved through a connection secret",
    );
  if (input.secret !== undefined && raw.authVariant === "none")
    throw new Error("A keyless connection has no secret to save");
  // Validate against the authoritative document first: nothing is written when
  // this owner cannot accept the connection at all.
  const state = parseState();
  const index = state.connections.findIndex(
    (entry) => entry.id === text(raw.id),
  );
  const previous = index >= 0 ? state.connections[index] : undefined;
  const credentialRef = text(raw.credentialRef);
  if (input.secret !== undefined && !credentialRef)
    throw new Error("Pi connection requires a credential reference");
  const connection = normalizeConnection(
    { ...raw, credentialRef: credentialRef || undefined },
    { previous, model: publicTargetOf(input.catalog, raw) },
  );
  if (input.signal?.aborted) throw new Error("Pi connection save canceled");

  if (input.secret === undefined || !credentialRef)
    return { state: saveConnection(state, connection, index) };

  const label = text(input.secretLabel) || connection.label || credentialRef;
  if (input.secret === "") {
    await commitPiCredentialChange({
      release: { id: credentialRef, namespace: "model-provider" },
      signal: input.signal,
      apply: () => {
        saveConnection(state, keylessConnection(connection), index);
      },
    });
    return {
      state: loadPiProviderConfigurationState(),
    };
  }
  // One coordinated commit: the credential and this document land inside the
  // credential owner's single serialized write, and identity is published once
  // after both succeeded. A rejected document leaves no orphan key.
  const credential = await commitPiCredentialChange({
    credential: {
      id: credentialRef,
      label,
      material: { kind: "api-key", secret: input.secret },
      namespace: "model-provider",
    },
    signal: input.signal,
    apply: () => {
      saveConnection(state, connection, index);
    },
  });
  return { state: loadPiProviderConfigurationState(), credential };
}

/**
 * The provider's public target, taken from its public directory row. A public
 * row is one that names no credential, so an account discovery can never become
 * a connection's default target. When several public rows disagree, the
 * provider's primary API wins and the model id breaks the remaining tie, so the
 * same directory always yields the same saved target.
 */
function publicTargetOf(
  catalog: CatalogLike | undefined,
  connection: PiProviderConnection,
): PiCatalogModel | undefined {
  if (!catalog || !text(connection.provider)) return undefined;
  const publicRows = catalog.models.filter(
    (row) =>
      row.provider === text(connection.provider) &&
      !text(row.credentialRef) &&
      !!executionApiOf(row.api),
  );
  if (!publicRows.length) return undefined;
  const primary = PROVIDER_PRIMARY_API[text(connection.provider)];
  return [...publicRows].sort((left, right) => {
    if (primary) {
      const rank = (row: PiCatalogModel) => (row.api === primary ? 0 : 1);
      const delta = rank(left) - rank(right);
      if (delta) return delta;
    }
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  })[0];
}

function keylessConnection(
  connection: PiProviderConnection,
): PiProviderConnection {
  return {
    ...connection,
    authVariant: "none",
    credentialRef: undefined,
  };
}

function saveConnection(
  state: PiProviderConfigurationState,
  connection: PiProviderConnection,
  index: number,
): PiProviderConfigurationState {
  if (index < 0) state.connections.push(connection);
  else state.connections[index] = connection;
  return save(state);
}

export function findPiCatalogModel(
  catalog: Pick<PiCatalog, "models">,
  connection: PiProviderConnection,
  modelId: string,
): PiCatalogModel | undefined {
  return catalog.models.find((entry) => {
    if (entry.provider !== connection.provider || entry.id !== modelId)
      return false;
    if (connection.authVariant === "chatgpt")
      return (
        entry.source === "discovered" &&
        entry.api === CHATGPT_API &&
        entry.baseUrl === CHATGPT_BASE_URL &&
        entry.credentialRef === connection.credentialRef &&
        entry.authVariants?.includes("chatgpt") === true
      );
    if (entry.credentialRef) return false;
    return (
      !entry.authVariants || entry.authVariants.includes(connection.authVariant)
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

/**
 * Freeze the model a selection names. Precedence is explicit run override,
 * saved owner selection, kind default, then general default. A missing
 * selection is a configuration error: neither a directory row nor the first
 * available card is ever chosen on the user's behalf.
 */
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
  for (const option of options) {
    if (!option) continue;
    const card = state.configurations.find(
      (entry) => entry.id === option.configurationId,
    );
    if (!card) throw new Error("Pi model configuration is not saved");
    const connection = state.connections.find(
      (entry) => entry.id === card.connectionId,
    );
    if (connection?.repairRequired)
      throw new Error("Pi connection requires an explicit target repair");
    const resolved = resolveCard(
      state,
      card,
      args.catalog,
      credentials,
      option.reasoning,
      option.modelId,
    );
    if (typeof resolved === "string") throw new Error(resolved);
    return freezeSelection(resolved, args.catalog.revision);
  }
  throw new Error("No Pi provider configuration is available");
}

function freezeSelection(
  resolved: ResolvedCard,
  catalogRevision: string,
): PiModelSelectionSnapshot {
  const { connection, card, model, listed, target, reasoning } = resolved;
  const policy = Object.freeze({
    contextWindow: model.contextWindow,
    maxTokens: model.maxTokens,
    input: Object.freeze([...model.input]),
    supportsTools: model.supportsTools === true,
  });
  return Object.freeze({
    connectionId: connection.id,
    connectionLabel: connection.label,
    configurationId: card.id,
    provider: connection.provider,
    modelId: card.modelId,
    authVariant: connection.authVariant,
    credentialRef: connection.credentialRef,
    api: target.api,
    baseUrl: target.baseUrl,
    reasoning,
    catalogRevision,
    adapterVersion: PI_PROVIDER_ADAPTER_VERSION,
    runtimeVersion: PI_RUNTIME_VERSION,
    requiresLocalNetwork:
      connection.requiresLocalNetwork ||
      classifyPiEndpoint(target.baseUrl).requiresLocalNetwork,
    ...(connection.binding
      ? { bindingRevision: connection.binding.revision }
      : {}),
    ...(card.binding ? { modelBindingRevision: card.binding.revision } : {}),
    selectionId: [
      connection.id,
      connection.binding?.revision || 0,
      card.id,
      card.binding?.revision || 0,
      card.modelId,
      reasoning,
      catalogRevision,
    ].join("#"),
    metadata: frozenMetadata(model, connection, target, listed),
    policy,
  });
}
