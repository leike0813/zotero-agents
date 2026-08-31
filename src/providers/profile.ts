import { listBackendInstances } from "../backends/registry";
import type { BackendInstance } from "../backends/types";
import {
  ACP_PROMPT_REQUEST_KIND,
  ACP_SKILL_RUN_REQUEST_KIND,
  DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE,
  SKILLRUNNER_SEQUENCE_REQUEST_KIND,
} from "../config/defaults";
import {
  normalizeProviderRuntimeOptions,
  resolveProviderById,
} from "./registry";
import type { Provider, ProviderRuntimeOptionSchemaEntry } from "./types";
import {
  hasAcpProviderScopedModelOptions,
  parseAcpProviderModelId,
  resolveAcpDisplayModelIdForProviderSelection,
} from "../modules/acpModelOptionFolding";

export const PROVIDER_PROFILE_SCHEMA = "zotero-bridge.provider-profile.v1";
export const PROVIDER_PROFILE_DESCRIPTOR_SCHEMA =
  "zotero-bridge.provider-profile-descriptor.v1";

export type ProviderProfile = {
  schema: typeof PROVIDER_PROFILE_SCHEMA;
  backendId: string;
  providerOptions: Record<string, unknown>;
};

export type ProviderProfileDescriptor = {
  schema: typeof PROVIDER_PROFILE_DESCRIPTOR_SCHEMA;
  backend: {
    id: string;
    label: string;
    type: string;
    providerId: string;
    enabled: boolean;
    ready: boolean;
    unavailableReason?: string;
  };
  providerId: string;
  capabilities: {
    requestKinds: string[];
    features: string[];
  };
  catalog: {
    state: "ready" | "stale" | "unavailable";
    source: "backend-cache" | "none";
    refreshedAt?: string;
    revision?: string;
    diagnostics: Array<{
      code: string;
      message: string;
    }>;
  };
  options: Array<{
    key: string;
    type: ProviderRuntimeOptionSchemaEntry["type"];
    title: string;
    description: string;
    required: boolean;
    defaultValue?: unknown;
    enumValues?: string[];
    disabled?: boolean;
  }>;
};

export type ProviderProfileValidationSource =
  | "explicit"
  | "environment-default"
  | "host-default";

export class ProviderProfileError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ProviderProfileError";
    this.code = code;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isUnsafeKey(key: string) {
  return /(^|_)(auth|authorization|credential|credentials|endpoint|password|path|secret|token|url)(_|$)/i.test(
    key,
  );
}

function isUnsafeString(value: string) {
  const trimmed = value.trim();
  return (
    /^(?:https?|wss?|file):\/\//i.test(trimmed) ||
    /^(?:[A-Za-z]:[\\/]|\/|~[\\/]|\.\.?[\\/])/.test(trimmed)
  );
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function profileFingerprint(profile: ProviderProfile) {
  let hash = 2166136261;
  const input = stableJson(profile);
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function rejectUnsafeValue(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      rejectUnsafeValue(entry, `${path}[${index}]`),
    );
    return;
  }
  if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (isUnsafeKey(key)) {
        throw new ProviderProfileError(
          "invalid_provider_profile",
          `provider profile contains an unsafe field: ${path}.${key}`,
          { optionKey: key },
        );
      }
      rejectUnsafeValue(entry, `${path}.${key}`);
    }
    return;
  }
  if (typeof value === "string" && isUnsafeString(value)) {
    throw new ProviderProfileError(
      "invalid_provider_profile",
      `provider profile contains an unsafe value at ${path}`,
    );
  }
}

function providerForBackend(backend: BackendInstance) {
  try {
    return resolveProviderById(String(backend.type || "").trim());
  } catch {
    throw new ProviderProfileError(
      "provider_profile_provider_unavailable",
      `No provider is registered for backend type ${backend.type}`,
      { backendId: backend.id, backendType: backend.type },
    );
  }
}

function readiness(backend: BackendInstance) {
  if (backend.enabled === false) {
    return { ready: false, reason: "backend_disabled" };
  }
  const connectionStatus = backend.acp?.connectionTest?.status;
  if (connectionStatus === "failed") {
    return { ready: false, reason: "backend_connection_failed" };
  }
  return { ready: true };
}

function requestKindsForBackend(backend: BackendInstance) {
  const kinds = new Set<string>();
  const defaultKind = DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE[backend.type];
  if (defaultKind) kinds.add(defaultKind);
  if (backend.type === "acp") {
    kinds.add(ACP_PROMPT_REQUEST_KIND);
    kinds.add(ACP_SKILL_RUN_REQUEST_KIND);
    kinds.add(SKILLRUNNER_SEQUENCE_REQUEST_KIND);
  }
  if (backend.type === "skillrunner") {
    kinds.add("skillrunner.job.v1");
    kinds.add(SKILLRUNNER_SEQUENCE_REQUEST_KIND);
  }
  return [...kinds];
}

function catalogState(backend: BackendInstance) {
  if (backend.type !== "acp") {
    return {
      state: "ready" as const,
      source: "none" as const,
      diagnostics: [],
    };
  }
  const cache = backend.acp?.runtimeOptionsCache;
  if (!cache) {
    return {
      state: "unavailable" as const,
      source: "none" as const,
      diagnostics: [
        {
          code: "runtime_catalog_missing",
          message: "ACP runtime option catalog is unavailable.",
        },
      ],
    };
  }
  const diagnostics: Array<{ code: string; message: string }> = [];
  const refreshedAt = String(cache.refreshedAt || "").trim();
  const refreshedMs = refreshedAt ? Date.parse(refreshedAt) : NaN;
  if (!refreshedAt || !Number.isFinite(refreshedMs)) {
    diagnostics.push({
      code: "runtime_catalog_timestamp_missing",
      message: "ACP runtime option catalog has no valid refresh timestamp.",
    });
  } else if (Date.now() - refreshedMs > 24 * 60 * 60 * 1000) {
    diagnostics.push({
      code: "runtime_catalog_stale",
      message: "ACP runtime option catalog is older than 24 hours.",
    });
  }
  const displayModels = cache.displayModels || [];
  const rawModels = cache.rawModels || [];
  if (cache.status === "stale") {
    diagnostics.push({
      code: "runtime_catalog_stale",
      message: "ACP runtime option catalog is marked stale.",
    });
  } else if (cache.status === "unavailable") {
    diagnostics.push({
      code: "runtime_catalog_unavailable",
      message: "ACP runtime option catalog is marked unavailable.",
    });
  }
  for (const diagnostic of cache.diagnostics || []) {
    if (!diagnostics.some((entry) => entry.code === diagnostic.code)) {
      diagnostics.push({ ...diagnostic });
    }
  }
  if (
    hasAcpProviderScopedModelOptions(displayModels) &&
    rawModels.length === 0
  ) {
    diagnostics.push({
      code: "runtime_catalog_inconsistent",
      message:
        "ACP display models are provider-scoped but raw models are missing.",
    });
  }
  const rawProviders = new Set(
    rawModels
      .map((entry) => parseAcpProviderModelId(entry.id)?.provider)
      .filter((entry): entry is string => !!entry),
  );
  const displayProviders = new Set(
    displayModels
      .map((entry) => parseAcpProviderModelId(entry.id)?.provider)
      .filter((entry): entry is string => !!entry),
  );
  if (
    displayProviders.size > 0 &&
    [...displayProviders].some((provider) => !rawProviders.has(provider))
  ) {
    diagnostics.push({
      code: "runtime_catalog_inconsistent",
      message:
        "ACP display model providers are absent from the raw model catalog.",
    });
  }
  const state = diagnostics.some(
    (entry) => entry.code === "runtime_catalog_stale",
  )
    ? "stale"
    : diagnostics.length > 0
      ? "unavailable"
      : "ready";
  return {
    state: state as "ready" | "stale" | "unavailable",
    source: "backend-cache" as const,
    ...(refreshedAt ? { refreshedAt } : {}),
    ...(cache.revision || refreshedAt
      ? { revision: cache.revision || refreshedAt }
      : {}),
    diagnostics,
  };
}

function optionDescriptors(args: {
  provider: Provider;
  backend: BackendInstance;
  options: Record<string, unknown>;
}) {
  const schema = args.provider.getRuntimeOptionSchema?.() || {};
  return Object.entries(schema).map(([key, entry]) => {
    const enumValues = args.provider.getRuntimeOptionEnumValues?.({
      key,
      options: args.options,
      backend: args.backend,
    });
    return {
      key,
      type: entry.type,
      title: String(entry.title || key),
      description: String(entry.description || entry.title || key),
      required: false,
      ...(typeof entry.default !== "undefined"
        ? { defaultValue: entry.default }
        : {}),
      ...(enumValues?.length
        ? { enumValues }
        : entry.enum?.length
          ? { enumValues: [...entry.enum] }
          : {}),
      ...(entry.disabled ? { disabled: true } : {}),
    };
  });
}

export async function listProviderProfileBackends() {
  const backends = await listBackendInstances();
  return backends.map((backend) => {
    const provider = providerForBackend(backend);
    const state = readiness(backend);
    return {
      backendId: backend.id,
      label: backend.displayName || backend.id,
      backendType: backend.type,
      providerId: provider.id,
      enabled: backend.enabled !== false,
      ready: state.ready,
      ...(state.reason ? { unavailableReason: state.reason } : {}),
      capabilities: {
        requestKinds: requestKindsForBackend(backend),
      },
    };
  });
}

export async function describeProviderProfile(
  backendIdRaw: unknown,
): Promise<ProviderProfileDescriptor> {
  const backendId = String(backendIdRaw || "").trim();
  if (!backendId) {
    throw new ProviderProfileError(
      "invalid_provider_profile_request",
      "backendId is required",
    );
  }
  const backend = (await listBackendInstances()).find(
    (entry) => entry.id === backendId,
  );
  if (!backend) {
    throw new ProviderProfileError(
      "provider_profile_backend_not_found",
      `Backend not found: ${backendId}`,
      { backendId },
    );
  }
  const provider = providerForBackend(backend);
  const state = readiness(backend);
  const defaults = normalizeProviderRuntimeOptions({
    providerId: provider.id,
    options: {},
    backend,
  });
  return {
    schema: PROVIDER_PROFILE_DESCRIPTOR_SCHEMA,
    backend: {
      id: backend.id,
      label: backend.displayName || backend.id,
      type: backend.type,
      providerId: provider.id,
      enabled: backend.enabled !== false,
      ready: state.ready,
      ...(state.reason ? { unavailableReason: state.reason } : {}),
    },
    providerId: provider.id,
    capabilities: {
      requestKinds: requestKindsForBackend(backend),
      features: Object.keys(provider.getRuntimeOptionSchema?.() || {}),
    },
    catalog: catalogState(backend),
    options: optionDescriptors({ provider, backend, options: defaults }),
  };
}

function assertOptionType(
  key: string,
  value: unknown,
  entry: ProviderRuntimeOptionSchemaEntry,
) {
  if (typeof value !== entry.type) {
    throw new ProviderProfileError(
      "provider_profile_option_invalid",
      `Provider option ${key} must be ${entry.type}`,
      { optionKey: key, expectedType: entry.type },
    );
  }
}

export function validateProviderOptionsForBackend(args: {
  backend: BackendInstance;
  providerOptions: unknown;
}) {
  const providerOptions = args.providerOptions;
  if (!isRecord(providerOptions)) {
    throw new ProviderProfileError(
      "invalid_provider_profile",
      "providerProfile.providerOptions must be a JSON object",
    );
  }
  rejectUnsafeValue(providerOptions, "providerProfile.providerOptions");
  const provider = providerForBackend(args.backend);
  const optionSchema = provider.getRuntimeOptionSchema?.() || {};
  if (
    args.backend.type === "acp" &&
    !args.backend.acp?.runtimeOptionsCache &&
    Object.keys(providerOptions).some((key) =>
      [
        "acpModeId",
        "acpModelProvider",
        "acpModelId",
        "acpReasoningEffort",
      ].includes(key),
    )
  ) {
    throw new ProviderProfileError(
      "provider_profile_option_unavailable",
      "ACP runtime option catalog is unavailable for this backend",
      { backendId: args.backend.id, reason: "runtime_catalog_unavailable" },
    );
  }
  for (const [key, value] of Object.entries(providerOptions)) {
    const entry = optionSchema[key];
    if (!entry) {
      throw new ProviderProfileError(
        "provider_profile_option_unknown",
        `Unknown provider option: ${key}`,
        { backendId: args.backend.id, optionKey: key },
      );
    }
    assertOptionType(key, value, entry);
    if (entry.disabled) {
      throw new ProviderProfileError(
        "provider_profile_option_unavailable",
        `Provider option is unavailable: ${key}`,
        { backendId: args.backend.id, optionKey: key },
      );
    }
    const allowedValues =
      provider.getRuntimeOptionEnumValues?.({
        key,
        options: providerOptions,
        backend: args.backend,
      }) ||
      entry.enum ||
      [];
    if (
      typeof value === "string" &&
      allowedValues.length > 0 &&
      !allowedValues.includes(value)
    ) {
      throw new ProviderProfileError(
        "provider_profile_option_unavailable",
        `Provider option value is unavailable: ${key}`,
        { backendId: args.backend.id, optionKey: key, allowedValues },
      );
    }
  }
  const normalizedOptions = normalizeProviderRuntimeOptions({
    providerId: provider.id,
    options: providerOptions,
    backend: args.backend,
  });
  const acpProvider = String(providerOptions.acpModelProvider || "").trim();
  const acpModel = String(providerOptions.acpModelId || "").trim();
  const acpCache = args.backend.acp?.runtimeOptionsCache;
  const expectedAcpModel =
    args.backend.type === "acp" &&
    acpProvider &&
    acpModel &&
    acpCache &&
    hasAcpProviderScopedModelOptions(acpCache.displayModels || [])
      ? resolveAcpDisplayModelIdForProviderSelection({
          modelOptions: acpCache.displayModels || [],
          provider: acpProvider,
          modelId: acpModel,
          currentDisplayModelId: acpCache.currentDisplayModelId,
        })
      : "";
  for (const key of Object.keys(providerOptions)) {
    if (key === "acpModelProvider") {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(normalizedOptions, key)) {
      throw new ProviderProfileError(
        "provider_profile_option_unavailable",
        `Provider option could not be applied: ${key}`,
        { backendId: args.backend.id, optionKey: key },
      );
    }
    const requested = providerOptions[key];
    const applied = normalizedOptions[key];
    if (
      key === "acpModelId" &&
      expectedAcpModel &&
      typeof applied === "string" &&
      applied === expectedAcpModel
    ) {
      continue;
    }
    if (
      (typeof requested === "string" &&
        requested.trim() &&
        typeof applied === "string" &&
        (!applied.trim() || applied !== requested)) ||
      (typeof requested !== "object" && applied !== requested)
    ) {
      throw new ProviderProfileError(
        "provider_profile_option_unavailable",
        `Provider option value could not be applied: ${key}`,
        { backendId: args.backend.id, optionKey: key },
      );
    }
  }
  return normalizedOptions;
}

export async function validateProviderProfile(
  raw: unknown,
  source: ProviderProfileValidationSource = "explicit",
): Promise<{
  normalizedProfile: ProviderProfile;
  descriptor: ProviderProfileDescriptor;
  source: ProviderProfileValidationSource;
  profileFingerprint: string;
}> {
  if (!isRecord(raw)) {
    throw new ProviderProfileError(
      "invalid_provider_profile",
      "providerProfile must be a JSON object",
    );
  }
  const allowed = new Set(["schema", "backendId", "providerOptions"]);
  const unsupported = Object.keys(raw).filter((key) => !allowed.has(key));
  if (unsupported.length) {
    throw new ProviderProfileError(
      "invalid_provider_profile",
      `providerProfile contains unsupported fields: ${unsupported.join(", ")}`,
    );
  }
  const schema = String(raw.schema || "").trim();
  if (schema && schema !== PROVIDER_PROFILE_SCHEMA) {
    throw new ProviderProfileError(
      "invalid_provider_profile",
      `providerProfile.schema must be ${PROVIDER_PROFILE_SCHEMA}`,
    );
  }
  const backendId = String(raw.backendId || "").trim();
  if (!backendId) {
    throw new ProviderProfileError(
      "invalid_provider_profile",
      "providerProfile.backendId is required",
    );
  }
  const providerOptions =
    typeof raw.providerOptions === "undefined" ? {} : raw.providerOptions;
  if (!isRecord(providerOptions)) {
    throw new ProviderProfileError(
      "invalid_provider_profile",
      "providerProfile.providerOptions must be a JSON object",
    );
  }
  rejectUnsafeValue(providerOptions, "providerProfile.providerOptions");

  const backends = await listBackendInstances();
  const backend = backends.find((entry) => entry.id === backendId);
  if (!backend) {
    throw new ProviderProfileError(
      "provider_profile_backend_not_found",
      `Backend not found: ${backendId}`,
      { backendId },
    );
  }
  const ready = readiness(backend);
  if (!ready.ready) {
    throw new ProviderProfileError(
      "provider_profile_backend_unready",
      `Backend is not ready: ${backendId}`,
      { backendId, reason: ready.reason },
    );
  }
  const descriptor = await describeProviderProfile(backendId);
  const catalogSensitive =
    isRecord(providerOptions) &&
    Object.keys(providerOptions).some((key) =>
      [
        "acpModeId",
        "acpModelProvider",
        "acpModelId",
        "acpReasoningEffort",
      ].includes(key),
    );
  if (
    backend.type === "acp" &&
    catalogSensitive &&
    descriptor.catalog.state !== "ready"
  ) {
    throw new ProviderProfileError(
      "provider_profile_option_unavailable",
      "ACP runtime option catalog is not ready; refresh the backend catalog before dispatch",
      {
        backendId,
        catalogState: descriptor.catalog.state,
        diagnostics: descriptor.catalog.diagnostics,
      },
    );
  }
  const normalizedOptions = validateProviderOptionsForBackend({
    backend,
    providerOptions,
  });
  if (backend.type === "acp") {
    const requestedProvider = String(
      providerOptions.acpModelProvider || "",
    ).trim();
    const requestedModel = String(providerOptions.acpModelId || "").trim();
    if (requestedProvider && requestedModel) {
      normalizedOptions.acpModelProvider = requestedProvider;
      normalizedOptions.acpModelId =
        parseAcpProviderModelId(requestedModel)?.model || requestedModel;
    }
  }
  const normalizedProfile = {
    schema: PROVIDER_PROFILE_SCHEMA,
    backendId,
    providerOptions: normalizedOptions,
  } as ProviderProfile;
  return {
    normalizedProfile,
    descriptor,
    source,
    profileFingerprint: profileFingerprint(normalizedProfile),
  };
}
