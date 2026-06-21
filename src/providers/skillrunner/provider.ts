import {
  DEFAULT_BACKEND_TYPE,
  DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE,
  SKILLRUNNER_SEQUENCE_REQUEST_KIND,
} from "../../config/defaults";
import type { BackendInstance } from "../../backends/types";
import type {
  ProviderExecutionResult,
  SkillRunnerHttpStepsRequest,
  SkillRunnerJobRequestV1,
} from "../contracts";
import type {
  Provider,
  ProviderProgressEvent,
  ProviderSupportsArgs,
} from "../types";
import { appendRuntimeLog } from "../../modules/runtimeLogManager";
import {
  getDefaultSkillRunnerEngine,
  getSkillRunnerCanonicalProviderId,
  isSkillRunnerProviderScopedEngine,
  listSkillRunnerEngines,
  listSkillRunnerModelEffortOptions,
  listSkillRunnerModelOptions,
  listSkillRunnerModelOptionsForProvider,
  listSkillRunnerModelProviders,
  normalizeSkillRunnerEffort,
  normalizeSkillRunnerModelForProvider,
  normalizeSkillRunnerModel,
  resolveSkillRunnerModelNameForProvider,
  splitSkillRunnerModelSpec,
} from "./modelCatalog";
import { isSkillRunnerInteractiveAutoReplyEnabled } from "../../modules/skillRunnerInteractiveAutoReply";
import { SkillRunnerClient } from "./client";
import { ensureManagedLocalRuntimeForBackend } from "../../modules/skillRunnerLocalRuntimeManager";

function toBackendCatalogScope(backend?: BackendInstance) {
  return backend &&
    typeof backend.id === "string" &&
    typeof backend.baseUrl === "string"
    ? {
        backendId: backend.id,
        baseUrl: backend.baseUrl,
      }
    : undefined;
}

function normalizeNoCache(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }
  return false;
}

function normalizeBooleanOption(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return false;
}

function normalizePositiveInteger(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return undefined;
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function normalizeNonNegativeInteger(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return undefined;
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
}

export class SkillRunnerProvider implements Provider {
  readonly id = "skillrunner";

  private readonly staticClient?: SkillRunnerClient;

  constructor(args?: { baseUrl: string }) {
    if (args?.baseUrl) {
      this.staticClient = new SkillRunnerClient({ baseUrl: args.baseUrl });
    }
  }

  supports(args: ProviderSupportsArgs) {
    return (
      args.backend.type === DEFAULT_BACKEND_TYPE &&
      (args.requestKind ===
        DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE[DEFAULT_BACKEND_TYPE] ||
        args.requestKind === SKILLRUNNER_SEQUENCE_REQUEST_KIND)
    );
  }

  supportsRequestKind(requestKind: string) {
    return (
      requestKind ===
        DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE[DEFAULT_BACKEND_TYPE] ||
      requestKind === SKILLRUNNER_SEQUENCE_REQUEST_KIND
    );
  }

  getRuntimeOptionSchema() {
    const defaultEngine = getDefaultSkillRunnerEngine() || "gemini";
    const defaultModelProvider =
      getSkillRunnerCanonicalProviderId(defaultEngine) || "";
    return {
      engine: {
        type: "string" as const,
        title: "Engine",
        description: "Skill-Runner execution engine.",
        default: defaultEngine,
        enum: listSkillRunnerEngines(),
      },
      provider_id: {
        type: "string" as const,
        title: "Provider",
        description:
          "Model provider for the selected engine. Provider-aware engines require an explicit provider.",
        default: defaultModelProvider,
      },
      model: {
        type: "string" as const,
        title: "Model",
        description: "Optional model override for selected engine.",
        default: "",
      },
      effort: {
        type: "string" as const,
        title: "Effort",
        description:
          "Reasoning effort for the selected model. Unsupported models stay on default.",
        default: "default",
      },
      no_cache: {
        type: "boolean" as const,
        title: "Bypass Cache",
        description: "When true, force backend execution without cache.",
        default: false,
      },
      interactive_auto_reply: {
        type: "boolean" as const,
        title: "Auto Reply",
        description:
          "Interactive mode only. Automatically continue after waiting timeout.",
        default: false,
      },
      interactive_reply_timeout_sec: {
        type: "number" as const,
        title: "Auto Reply Timeout (sec)",
        description:
          "Interactive auto reply timeout in seconds. Empty means backend default.",
      },
      hard_timeout_seconds: {
        type: "number" as const,
        title: "Job Timeout (sec)",
        description:
          "Optional positive integer timeout in seconds. Empty means backend default.",
      },
    };
  }

  getRuntimeOptionEnumValues(args: {
    key: string;
    options: Record<string, unknown>;
    backend?: BackendInstance;
  }) {
    const backendContext =
      args.backend &&
      typeof args.backend.id === "string" &&
      typeof args.backend.baseUrl === "string"
        ? {
            backendId: args.backend.id,
            baseUrl: args.backend.baseUrl,
          }
        : undefined;
    if (args.key === "engine") {
      return listSkillRunnerEngines(backendContext);
    }
    const rawEngine = args.options.engine;
    const normalizedEngine =
      typeof rawEngine === "string" && rawEngine.trim()
        ? rawEngine.trim()
        : getDefaultSkillRunnerEngine();
    if (args.key === "provider_id") {
      if (
        !isSkillRunnerProviderScopedEngine(normalizedEngine, backendContext)
      ) {
        return [];
      }
      return listSkillRunnerModelProviders(normalizedEngine, backendContext);
    }
    if (args.key === "model") {
      if (isSkillRunnerProviderScopedEngine(normalizedEngine, backendContext)) {
        const modelProviderRaw = String(
          args.options.provider_id || args.options.model_provider || "",
        ).trim();
        const modelProvider = modelProviderRaw;
        if (!modelProvider) {
          return [];
        }
        return listSkillRunnerModelOptionsForProvider(
          normalizedEngine,
          modelProvider,
          backendContext,
        ).map((entry) => entry.value);
      }
      return listSkillRunnerModelOptions(normalizedEngine, backendContext).map(
        (entry) => entry.value,
      );
    }
    if (args.key === "effort") {
      const providerId = isSkillRunnerProviderScopedEngine(
        normalizedEngine,
        backendContext,
      )
        ? String(
            args.options.provider_id || args.options.model_provider || "",
          ).trim()
        : getSkillRunnerCanonicalProviderId(normalizedEngine);
      return listSkillRunnerModelEffortOptions({
        engine: normalizedEngine,
        provider: providerId,
        model: String(args.options.model || "").trim(),
        scope: backendContext,
      });
    }
    return [];
  }

  normalizeRuntimeOptions(options: unknown, backend?: BackendInstance) {
    const source =
      options && typeof options === "object" && !Array.isArray(options)
        ? (options as Record<string, unknown>)
        : {};
    const rawEngine = source.engine;
    const rawProviderId = source.provider_id;
    const rawLegacyModelProvider = source.model_provider;
    const rawModel = source.model;
    const rawEffort = source.effort;
    const rawNoCache = source.no_cache;
    const rawInteractiveAutoReply = source.interactive_auto_reply;
    const rawInteractiveReplyTimeout = source.interactive_reply_timeout_sec;
    const rawHardTimeoutSeconds = source.hard_timeout_seconds;
    const normalizedEngine =
      typeof rawEngine === "string" && rawEngine.trim()
        ? rawEngine.trim()
        : getDefaultSkillRunnerEngine() || "gemini";
    const backendContext = toBackendCatalogScope(backend);
    const rawModelText = String(rawModel || "").trim();
    const parsedRawModel = rawModelText
      ? splitSkillRunnerModelSpec(rawModelText)
      : null;
    const providerCandidates = listSkillRunnerModelProviders(
      normalizedEngine,
      backendContext,
    );
    const explicitProvider =
      typeof rawProviderId === "string"
        ? rawProviderId.trim()
        : typeof rawLegacyModelProvider === "string"
          ? rawLegacyModelProvider.trim()
          : "";
    const isProviderScoped = isSkillRunnerProviderScopedEngine(
      normalizedEngine,
      backendContext,
    );
    let normalizedProviderId = isProviderScoped
      ? (explicitProvider && providerCandidates.includes(explicitProvider)
          ? explicitProvider
          : "") ||
        (parsedRawModel &&
        parsedRawModel.provider &&
        providerCandidates.includes(parsedRawModel.provider)
          ? parsedRawModel.provider
          : "")
      : getSkillRunnerCanonicalProviderId(normalizedEngine) ||
        explicitProvider ||
        String(parsedRawModel?.provider || "").trim();

    let normalizedModel = "";
    if (isProviderScoped) {
      const rawModelName = parsedRawModel ? parsedRawModel.model : rawModelText;
      if (normalizedProviderId && rawModelName) {
        normalizedModel =
          normalizeSkillRunnerModelForProvider({
            engine: normalizedEngine,
            provider: normalizedProviderId,
            model: rawModelName,
            scope: backendContext,
          }) ||
          resolveSkillRunnerModelNameForProvider({
            engine: normalizedEngine,
            provider: normalizedProviderId,
            model: rawModelText,
            scope: backendContext,
          });
      }
      if (!normalizedModel && parsedRawModel) {
        normalizedProviderId =
          (parsedRawModel.provider &&
          providerCandidates.includes(parsedRawModel.provider)
            ? parsedRawModel.provider
            : "") || normalizedProviderId;
        if (normalizedProviderId) {
          normalizedModel =
            normalizeSkillRunnerModelForProvider({
              engine: normalizedEngine,
              provider: normalizedProviderId,
              model: parsedRawModel.model,
              scope: backendContext,
            }) || parsedRawModel.model;
        }
      }
    } else {
      normalizedModel = normalizeSkillRunnerModel(
        normalizedEngine,
        parsedRawModel ? parsedRawModel.model : rawModel,
        backendContext,
      );
    }
    const normalizedEffort = normalizeSkillRunnerEffort({
      engine: normalizedEngine,
      provider: normalizedProviderId,
      model: normalizedModel,
      effort:
        rawEffort ??
        (parsedRawModel && parsedRawModel.effort
          ? parsedRawModel.effort
          : "default"),
      scope: backendContext,
    });

    const normalizedNoCache = normalizeNoCache(rawNoCache);
    const normalizedInteractiveAutoReply =
      isSkillRunnerInteractiveAutoReplyEnabled()
        ? normalizeBooleanOption(rawInteractiveAutoReply)
        : undefined;
    const normalizedInteractiveReplyTimeout =
      isSkillRunnerInteractiveAutoReplyEnabled() &&
      normalizedInteractiveAutoReply === true
        ? normalizeNonNegativeInteger(rawInteractiveReplyTimeout)
        : undefined;
    const normalizedHardTimeout = normalizePositiveInteger(
      rawHardTimeoutSeconds,
    );
    if (typeof rawNoCache === "boolean") {
      return {
        engine: normalizedEngine,
        provider_id: normalizedProviderId,
        model: normalizedModel,
        effort: normalizedEffort,
        no_cache: normalizedNoCache,
        ...(typeof normalizedInteractiveAutoReply === "boolean"
          ? { interactive_auto_reply: normalizedInteractiveAutoReply }
          : {}),
        ...(typeof normalizedInteractiveReplyTimeout === "number"
          ? { interactive_reply_timeout_sec: normalizedInteractiveReplyTimeout }
          : {}),
        ...(typeof normalizedHardTimeout === "number"
          ? { hard_timeout_seconds: normalizedHardTimeout }
          : {}),
      };
    }
    if (typeof rawNoCache === "string") {
      return {
        engine: normalizedEngine,
        provider_id: normalizedProviderId,
        model: normalizedModel,
        effort: normalizedEffort,
        no_cache: normalizedNoCache,
        ...(typeof normalizedInteractiveAutoReply === "boolean"
          ? { interactive_auto_reply: normalizedInteractiveAutoReply }
          : {}),
        ...(typeof normalizedInteractiveReplyTimeout === "number"
          ? { interactive_reply_timeout_sec: normalizedInteractiveReplyTimeout }
          : {}),
        ...(typeof normalizedHardTimeout === "number"
          ? { hard_timeout_seconds: normalizedHardTimeout }
          : {}),
      };
    }
    return {
      engine: normalizedEngine,
      provider_id: normalizedProviderId,
      model: normalizedModel,
      effort: normalizedEffort,
      no_cache: normalizedNoCache,
      ...(typeof normalizedInteractiveAutoReply === "boolean"
        ? { interactive_auto_reply: normalizedInteractiveAutoReply }
        : {}),
      ...(typeof normalizedInteractiveReplyTimeout === "number"
        ? { interactive_reply_timeout_sec: normalizedInteractiveReplyTimeout }
        : {}),
      ...(typeof normalizedHardTimeout === "number"
        ? { hard_timeout_seconds: normalizedHardTimeout }
        : {}),
    };
  }

  private resolveBackend(args: { backend?: BackendInstance }) {
    if (args.backend) {
      return args.backend;
    }
    if (this.staticClient) {
      return null;
    }
    throw new Error(
      "SkillRunnerProvider requires backend config when baseUrl is not provided in constructor",
    );
  }

  async execute(args: {
    requestKind: string;
    request: unknown;
    backend?: BackendInstance;
    providerOptions?: Record<string, unknown>;
    onProgress?: (event: ProviderProgressEvent) => void;
  }): Promise<ProviderExecutionResult> {
    const backend = this.resolveBackend(args);
    if (backend && !this.supports({ requestKind: args.requestKind, backend })) {
      throw new Error(
        `Unsupported request kind/backend for SkillRunner: requestKind=${args.requestKind}, backendType=${backend.type}`,
      );
    }
    if (!backend && !this.supportsRequestKind(args.requestKind)) {
      throw new Error(
        `Unsupported request kind for SkillRunner: ${args.requestKind}`,
      );
    }
    const normalizedProviderOptions = this.normalizeRuntimeOptions(
      args.providerOptions || {},
      backend || undefined,
    );
    const backendId = backend?.id;
    const backendType = backend?.type || "skillrunner";
    if (backend && backend.type === "skillrunner") {
      const ensureResult = await ensureManagedLocalRuntimeForBackend(
        backend.id,
      );
      if (!ensureResult.ok) {
        throw new Error(
          `managed local runtime ensure failed: ${ensureResult.message}`,
        );
      }
    }
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId,
      backendType,
      providerId: this.id,
      component: "skillrunner-provider",
      operation: "execute",
      phase: "start",
      stage: "provider-execute-start",
      message: "skillrunner provider execute started",
      details: {
        requestKind: args.requestKind,
        engine: normalizedProviderOptions.engine,
        provider_id: normalizedProviderOptions.provider_id,
        model: normalizedProviderOptions.model,
      },
    });
    const client =
      this.staticClient ||
      new SkillRunnerClient({
        baseUrl: backend!.baseUrl,
        backendId,
      });
    try {
      let result: ProviderExecutionResult;
      if (
        args.request &&
        typeof args.request === "object" &&
        (args.request as { kind?: unknown }).kind === "http.steps"
      ) {
        result = await client.executeHttpSteps(
          args.request as SkillRunnerHttpStepsRequest,
          {
            onProgress: args.onProgress,
          },
        );
      } else {
        const request = args.request as SkillRunnerJobRequestV1;
        if (request.kind !== "skillrunner.job.v1") {
          throw new Error(
            `Unsupported skillrunner request payload kind: ${String(request.kind || "")}`,
          );
        }
        result = await client.executeSkillRunnerJob(
          request,
          normalizedProviderOptions,
          {
            onProgress: args.onProgress,
          },
        );
      }
      appendRuntimeLog({
        level: "info",
        scope: "provider",
        backendId,
        backendType,
        providerId: this.id,
        requestId: String(result.requestId || "").trim() || undefined,
        component: "skillrunner-provider",
        operation: "execute",
        phase: result.status === "deferred" ? "deferred" : "terminal",
        stage: "provider-execute-succeeded",
        message: "skillrunner provider execute succeeded",
        details: {
          status: result.status,
          fetchType: result.fetchType,
          backendStatus: (result as { backendStatus?: unknown }).backendStatus,
        },
      });
      return result;
    } catch (error) {
      appendRuntimeLog({
        level: "error",
        scope: "provider",
        backendId,
        backendType,
        providerId: this.id,
        component: "skillrunner-provider",
        operation: "execute",
        phase: "terminal",
        stage: "provider-execute-failed",
        message: "skillrunner provider execute failed",
        error,
      });
      throw error;
    }
  }
}
