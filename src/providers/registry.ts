import type { BackendInstance } from "../backends/types";
import type { ProviderExecutionResult } from "./contracts";
import { AcpProvider } from "./acp/provider";
import { GenericHttpProvider } from "./generic-http/provider";
import { PassThroughProvider } from "./pass-through/provider";
import { appendRuntimeLog } from "../modules/runtimeLogManager";
import {
  ProviderRequestContractError,
  assertProviderRequestDispatchContract,
  assertRequestKindBackendCompatible,
  assertRequestKindProviderCompatible,
} from "./requestContracts";
import { SkillRunnerProvider } from "./skillrunner/provider";
import type {
  Provider,
  ProviderOrchestrationContext,
  ProviderProgressEvent,
} from "./types";

const providers: Provider[] = [
  new SkillRunnerProvider(),
  new AcpProvider(),
  new GenericHttpProvider(),
  new PassThroughProvider(),
];

export function registerProvider(provider: Provider) {
  const existingIndex = providers.findIndex(
    (entry) => entry.id === provider.id,
  );
  if (existingIndex >= 0) {
    providers.splice(existingIndex, 1, provider);
    return;
  }
  providers.push(provider);
}

export function listProviders() {
  return [...providers];
}

export function resolveProviderById(id: string) {
  const target = String(id || "").trim();
  const matched = providers.find((provider) => provider.id === target);
  if (!matched) {
    throw new Error(`Unknown provider: ${target}`);
  }
  return matched;
}

function normalizeWithSchema(
  rawOptions: unknown,
  schema: ReturnType<NonNullable<Provider["getRuntimeOptionSchema"]>>,
) {
  const source =
    rawOptions && typeof rawOptions === "object" && !Array.isArray(rawOptions)
      ? (rawOptions as Record<string, unknown>)
      : {};
  const normalized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(schema)) {
    const raw = source[key];
    const fallback = entry.default;
    if (entry.type === "boolean") {
      const value =
        typeof raw === "boolean"
          ? raw
          : typeof raw === "string"
            ? ["1", "true", "yes", "on"].includes(raw.toLowerCase())
            : typeof fallback === "boolean"
              ? fallback
              : false;
      normalized[key] = value;
      continue;
    }
    if (entry.type === "number") {
      const parsed =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
            ? Number(raw)
            : NaN;
      if (Number.isFinite(parsed)) {
        normalized[key] = parsed;
        continue;
      }
      if (typeof fallback === "number" && Number.isFinite(fallback)) {
        normalized[key] = fallback;
      }
      continue;
    }
    if (entry.type === "string") {
      if (typeof raw === "string") {
        normalized[key] = raw;
        continue;
      }
      if (typeof fallback === "string") {
        normalized[key] = fallback;
      }
    }
  }
  return normalized;
}

export function normalizeProviderRuntimeOptions(args: {
  providerId: string;
  options: unknown;
  backend?: BackendInstance;
}) {
  const provider = resolveProviderById(args.providerId);
  if (typeof provider.normalizeRuntimeOptions === "function") {
    return provider.normalizeRuntimeOptions(args.options, args.backend);
  }
  const schema = provider.getRuntimeOptionSchema?.() || {};
  return normalizeWithSchema(args.options, schema);
}

export function resolveProvider(args: {
  requestKind: string;
  backend: BackendInstance;
}) {
  const contract = assertRequestKindBackendCompatible({
    requestKind: args.requestKind,
    backendType: args.backend.type,
  });
  const matched = providers.find((provider) => provider.supports(args));
  if (!matched) {
    throw new ProviderRequestContractError({
      category: "provider_contract_error",
      reason: "provider_not_registered",
      requestKind: contract.requestKind,
      backendType: args.backend.type,
      providerId: contract.contract.providerType,
      detail: "matching provider instance not found",
    });
  }
  assertRequestKindProviderCompatible({
    requestKind: contract.requestKind,
    providerId: matched.id,
  });
  return matched;
}

export async function executeWithProvider(args: {
  requestKind: string;
  request: unknown;
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
  onProgress?: (event: ProviderProgressEvent) => void;
  orchestrationContext?: ProviderOrchestrationContext;
}): Promise<ProviderExecutionResult> {
  const provider = resolveProvider(args);
  assertProviderRequestDispatchContract({
    requestKind: args.requestKind,
    backendType: args.backend.type,
    providerId: provider.id,
    request: args.request,
  });
  appendRuntimeLog({
    level: "info",
    scope: "provider",
    backendId: args.backend.id,
    backendType: args.backend.type,
    providerId: provider.id,
    component: "provider-registry",
    operation: "dispatch",
    phase: "start",
    stage: "provider-dispatch-start",
    message: "provider dispatch started",
    details: {
      requestKind: args.requestKind,
    },
  });
  try {
    const result = await provider.execute(args);
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId: args.backend.id,
      backendType: args.backend.type,
      providerId: provider.id,
      requestId: String(result.requestId || "").trim() || undefined,
      component: "provider-registry",
      operation: "dispatch",
      phase: result.status === "deferred" ? "deferred" : "terminal",
      stage: "provider-dispatch-succeeded",
      message: "provider dispatch succeeded",
      details: {
        status: result.status,
        fetchType: result.fetchType,
      },
    });
    return result;
  } catch (error) {
    appendRuntimeLog({
      level: "error",
      scope: "provider",
      backendId: args.backend.id,
      backendType: args.backend.type,
      providerId: provider.id,
      component: "provider-registry",
      operation: "dispatch",
      phase: "terminal",
      stage: "provider-dispatch-failed",
      message: "provider dispatch failed",
      error,
    });
    throw error;
  }
}
