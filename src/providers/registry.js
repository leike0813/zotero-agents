import { AcpProvider } from "./acp/provider";
import { BuiltinPiProvider } from "./builtin-pi/provider";
import { GenericHttpProvider } from "./generic-http/provider";
import { PassThroughProvider } from "./pass-through/provider";
import { appendRuntimeLog } from "../modules/runtimeLogManager";
import { ProviderRequestContractError, assertProviderRequestDispatchContract, assertRequestKindBackendCompatible, assertRequestKindProviderCompatible, } from "./requestContracts";
import { SkillRunnerProvider } from "./skillrunner/provider";
let providers = null;
function createDefaultProviders() {
    const providers = [
        new SkillRunnerProvider(),
        new AcpProvider(),
        new GenericHttpProvider(),
        new PassThroughProvider(),
    ];
    // Compile-time Pi entry: the measurement-only control build excludes the
    // Built-in Pi provider and its whole module graph.
    if (typeof __PI_RUNTIME_ENABLED__ === "undefined" || __PI_RUNTIME_ENABLED__) {
        providers.push(new BuiltinPiProvider());
    }
    return providers;
}
function getProviders() {
    if (!providers) {
        providers = createDefaultProviders();
    }
    return providers;
}
export function registerProvider(provider) {
    const providerList = getProviders();
    const existingIndex = providerList.findIndex((entry) => entry.id === provider.id);
    if (existingIndex >= 0) {
        providerList.splice(existingIndex, 1, provider);
        return;
    }
    providerList.push(provider);
}
export function listProviders() {
    return [...getProviders()];
}
export function resolveProviderById(id) {
    const target = String(id || "").trim();
    const matched = getProviders().find((provider) => provider.id === target);
    if (!matched) {
        throw new Error(`Unknown provider: ${target}`);
    }
    return matched;
}
function normalizeWithSchema(rawOptions, schema) {
    const source = rawOptions && typeof rawOptions === "object" && !Array.isArray(rawOptions)
        ? rawOptions
        : {};
    const normalized = {};
    for (const [key, entry] of Object.entries(schema)) {
        const raw = source[key];
        const fallback = entry.default;
        if (entry.type === "boolean") {
            const value = typeof raw === "boolean"
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
            const parsed = typeof raw === "number"
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
export function normalizeProviderRuntimeOptions(args) {
    const provider = resolveProviderById(args.providerId);
    if (typeof provider.normalizeRuntimeOptions === "function") {
        return provider.normalizeRuntimeOptions(args.options, args.backend);
    }
    const schema = provider.getRuntimeOptionSchema?.() || {};
    return normalizeWithSchema(args.options, schema);
}
export function resolveProvider(args) {
    const contract = assertRequestKindBackendCompatible({
        requestKind: args.requestKind,
        backendType: args.backend.type,
    });
    const matched = getProviders().find((provider) => provider.supports(args));
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
export async function executeWithProvider(args) {
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
    }
    catch (error) {
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
