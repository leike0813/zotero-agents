import { getPref, setPref } from "../utils/prefs";
import {
  PI_RUNTIME_VERSION,
  PI_PROVIDER_ADAPTER_VERSION,
} from "../config/piRuntimeBuild";
import type { PiCatalog, PiCatalogModel } from "./piModelCatalog";
import type {
  PiReasoningLevel,
  PiProviderConfiguration,
  PiProviderConfigurationState,
  PiProviderDefaults,
  PiSelection,
  PiModelSelectionSnapshot,
  PiCredentialMetadata,
} from "../shared/piProviderContract";
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

function emptyState(): PiProviderConfigurationState {
  return { version: 1, configurations: [], defaults: {}, overlayPath: "" };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function isReasoning(value: unknown): value is PiReasoningLevel {
  return PI_REASONING_LEVELS.includes(value as PiReasoningLevel);
}

export function classifyPiEndpoint(raw: string): {
  baseUrl: string;
  requiresLocalNetwork: boolean;
} {
  const value = text(raw);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid Pi endpoint URL");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["http:", "https:"].includes(url.protocol)
  ) {
    throw new Error("Invalid Pi endpoint URL");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host.startsWith("::ffff:"))
    throw new Error("IPv4-mapped Pi endpoints are unsupported");
  const v4 = host.split(".").map(Number);
  const ipv4 =
    v4.length === 4 &&
    v4.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
  const local =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "::1" ||
    (host.includes(":") &&
      (host.startsWith("fe80:") ||
        host.startsWith("fc") ||
        host.startsWith("fd"))) ||
    (ipv4 &&
      (v4[0] === 10 ||
        v4[0] === 127 ||
        v4[0] === 0 ||
        (v4[0] === 172 && v4[1] >= 16 && v4[1] <= 31) ||
        (v4[0] === 192 && v4[1] === 168) ||
        (v4[0] === 169 && v4[1] === 254)));
  if (url.protocol !== "https:" && !local)
    throw new Error("Remote Pi endpoint requires HTTPS");
  return {
    baseUrl: url.toString().replace(/\/$/, ""),
    requiresLocalNetwork: local,
  };
}

function normalizeConfiguration(
  raw: PiProviderConfiguration,
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
    authVariant !== "openai-codex"
  )
    throw new Error("Invalid Pi auth variant");
  if (
    authVariant === "openai-codex" &&
    (text(raw.provider) !== "openai-codex" || text(raw.baseUrl))
  )
    throw new Error(
      "OpenAI Codex authentication requires the native Codex provider",
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
    configurations: parsed.configurations.map(normalizeConfiguration),
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
): PiProviderConfigurationState {
  const config = normalizeConfiguration(raw);
  const state = parseState();
  const index = state.configurations.findIndex(
    (entry) => entry.id === config.id,
  );
  const previous = index >= 0 ? state.configurations[index] : undefined;
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
      ]) !==
        JSON.stringify([
          config.provider,
          config.modelId,
          config.authVariant,
          config.credentialRef,
          config.baseUrl,
          config.api,
          config.reasoning,
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

function isSelectable(
  config: PiProviderConfiguration,
  credentials: readonly Pick<PiCredentialMetadata, "id" | "kind">[],
): boolean {
  return (
    config.enabled &&
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
  return catalog.models.find(
    (entry) =>
      entry.provider === config.provider &&
      entry.id === modelId &&
      (config.authVariant !== "openai-codex" ||
        (entry.source === "discovered" &&
          entry.credentialRef === config.credentialRef)),
  );
}

export function hasPiModelCapabilities(
  model: PiCatalogModel | undefined,
): model is PiCatalogModel {
  return (
    !!model &&
    model.contextWindow > 0 &&
    (model.maxTokens > 0 ||
      (model.api === "openai-codex-responses" && model.maxTokens === 0)) &&
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
    if (!found || !isSelectable(found, credentials))
      throw new Error("Pi selection is unavailable");
    selected = option;
    config = found;
    break;
  }
  if (!config)
    config = state.configurations.find((entry) => {
      const model = findPiCatalogModel(args.catalog, entry, entry.modelId);
      return (
        isSelectable(entry, credentials) &&
        hasPiModelCapabilities(model) &&
        model.reasoning.includes(entry.reasoning || "off")
      );
    });
  if (!config) throw new Error("No Pi provider configuration is available");
  const modelId = selected?.modelId || config.modelId;
  const model = findPiCatalogModel(args.catalog, config, modelId);
  if (!model) throw new Error("Pi model is absent from catalog");
  if (!hasPiModelCapabilities(model))
    throw new Error("Pi model has incomplete capabilities");
  const reasoning = selected?.reasoning || config.reasoning || "off";
  if (!isReasoning(reasoning) || !model.reasoning.includes(reasoning))
    throw new Error("Unsupported Pi reasoning level");
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
    api: config.api || model.api,
    baseUrl: config.baseUrl || model.baseUrl,
    reasoning,
    catalogRevision: args.catalog.revision,
    adapterVersion: PI_PROVIDER_ADAPTER_VERSION,
    runtimeVersion: PI_RUNTIME_VERSION,
    requiresLocalNetwork:
      config.requiresLocalNetwork ||
      (!!model.baseUrl &&
        classifyPiEndpoint(model.baseUrl).requiresLocalNetwork),
    policy,
  });
}
