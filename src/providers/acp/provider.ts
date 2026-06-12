import type { ProviderExecutionResult, AcpPromptRequestV1 } from "../contracts";
import type {
  Provider,
  ProviderExecuteArgs,
  ProviderSupportsArgs,
} from "../types";
import {
  ACP_BACKEND_TYPE,
  ACP_PROMPT_REQUEST_KIND,
  ACP_SKILL_RUN_REQUEST_KIND,
  SKILLRUNNER_SEQUENCE_REQUEST_KIND,
} from "../../config/defaults";
import { appendRuntimeLog } from "../../modules/runtimeLogManager";
import { executeAcpSkillRunnerJob } from "../../modules/acpSkillRunnerOrchestrator";
import {
  buildAcpFoldedModelGroups,
  hasAcpProviderScopedModelOptions,
  listAcpModelOptionsForProvider,
  listAcpModelProviderOptions,
  normalizeAcpProviderModelOptionsForRuntime,
  normalizeAcpEffortId,
  resolveAcpDisplayModelIdForProviderSelection,
} from "../../modules/acpModelOptionFolding";
import type { BackendInstance } from "../../backends/types";

export class AcpProvider implements Provider {
  readonly id = ACP_BACKEND_TYPE;

  getRuntimeOptionSchema() {
    return {
      acpModeId: {
        type: "string" as const,
        title: "ACP mode",
        description:
          "ACP session mode for this workflow run. Values come from the backend connection test cache.",
      },
      acpModelProvider: {
        type: "string" as const,
        title: "ACP provider",
        description:
          "Provider segment parsed from ACP model ids that use provider/model notation.",
      },
      acpModelId: {
        type: "string" as const,
        title: "ACP model",
        description:
          "Display model for this workflow run. Reasoning variants are folded into the reasoning option.",
      },
      acpReasoningEffort: {
        type: "string" as const,
        title: "Reasoning effort",
        description:
          "Reasoning effort derived from ACP model variants. The runner resolves it to the raw ACP model id before prompting.",
      },
      autoApproveAcpPermissions: {
        type: "boolean" as const,
        title: "Auto-approve ACP permission requests",
        description:
          "Automatically approve ACP backend tool permission requests for this ACP Skill run.",
        default: false,
      },
    };
  }

  getRuntimeOptionEnumValues(args: {
    key: string;
    options?: Record<string, unknown>;
    backend?: BackendInstance;
  }) {
    const backend = args.backend;
    const cache = backend?.acp?.runtimeOptionsCache;
    if (!backend || !cache) {
      return [];
    }
    const key = String(args.key || "").trim();
    if (key === "acpModeId") {
      return (cache.modes || []).map((mode) => mode.id);
    }
    if (key === "acpModelProvider") {
      return listAcpModelProviderOptions(cache.displayModels || []);
    }
    if (key === "acpModelId") {
      if (hasAcpProviderScopedModelOptions(cache.displayModels || [])) {
        return listAcpModelOptionsForProvider({
          modelOptions: cache.displayModels || [],
          provider: args.options?.acpModelProvider,
          displayModelId: args.options?.acpModelId,
          currentDisplayModelId: cache.currentDisplayModelId,
        });
      }
      return (cache.displayModels || []).map((model) => model.id);
    }
    if (key === "acpReasoningEffort") {
      const selectedModelId = resolveAcpDisplayModelIdForProviderSelection({
        modelOptions: cache.displayModels || [],
        provider: args.options?.acpModelProvider,
        modelId: args.options?.acpModelId,
        currentDisplayModelId: cache.currentDisplayModelId,
      });
      const group = buildAcpFoldedModelGroups(cache.rawModels || []).get(
        selectedModelId,
      );
      const variants = group?.variants || [];
      if (variants.length > 0) {
        return variants.map((variant) => variant.effortId);
      }
      const cachedEfforts = (cache.reasoningEfforts || []).map(
        (effort) => effort.id,
      );
      return cachedEfforts.length > 0 ? cachedEfforts : ["default"];
    }
    return [];
  }

  normalizeRuntimeOptions(options: unknown = {}, backend?: BackendInstance) {
    const cache = backend?.acp?.runtimeOptionsCache;
    const source =
      options && typeof options === "object" && !Array.isArray(options)
        ? (options as Record<string, unknown>)
        : {};
    const normalizedSource = normalizeAcpProviderModelOptionsForRuntime({
      modelOptions: cache?.displayModels || [],
      options: source,
      currentDisplayModelId: cache?.currentDisplayModelId,
    });
    const autoApproveAcpPermissions =
      normalizedSource.autoApproveAcpPermissions === true
        ? { autoApproveAcpPermissions: true }
        : {};
    if (!cache) {
      return autoApproveAcpPermissions;
    }
    const modeIds = new Set((cache.modes || []).map((entry) => entry.id));
    const modelGroups = buildAcpFoldedModelGroups(cache.rawModels || []);
    const modelIds = new Set([
      ...(cache.displayModels || []).map((entry) => entry.id),
      ...Array.from(modelGroups.keys()),
    ]);
    const selectedMode = String(
      normalizedSource.acpModeId || cache.currentModeId || "",
    ).trim();
    const selectedModel = String(
      normalizedSource.acpModelId || cache.currentDisplayModelId || "",
    ).trim();
    const selectedDisplayModel = resolveAcpDisplayModelIdForProviderSelection({
      modelOptions: cache.displayModels || [],
      provider: source.acpModelProvider,
      modelId: selectedModel,
      currentDisplayModelId: cache.currentDisplayModelId,
    });
    const model =
      (selectedDisplayModel && modelIds.has(selectedDisplayModel)
        ? selectedDisplayModel
        : "") ||
      cache.currentDisplayModelId ||
      Array.from(modelGroups.keys())[0] ||
      "";
    const group = modelGroups.get(model);
    const effortIds = new Set(
      (group?.variants || []).map((entry) => entry.effortId),
    );
    const normalizedEffort = normalizeAcpEffortId(
      normalizedSource.acpReasoningEffort,
    );
    const fallbackEffort =
      group && group.variants.length > 0
        ? normalizeAcpEffortId(cache.currentReasoningEffortId) ||
          group.variants[0]?.effortId ||
          ""
        : (cache.reasoningEfforts || []).length > 0
          ? normalizeAcpEffortId(cache.currentReasoningEffortId) ||
            normalizeAcpEffortId(cache.reasoningEfforts?.[0]?.id) ||
            ""
          : "";
    return {
      ...(selectedMode && modeIds.has(selectedMode)
        ? { acpModeId: selectedMode }
        : cache.currentModeId
          ? { acpModeId: cache.currentModeId }
          : {}),
      ...(model ? { acpModelId: model } : {}),
      ...(normalizedEffort && effortIds.has(normalizedEffort)
        ? { acpReasoningEffort: normalizedEffort }
        : fallbackEffort
          ? { acpReasoningEffort: fallbackEffort }
          : {}),
      ...autoApproveAcpPermissions,
    };
  }

  supports(args: ProviderSupportsArgs) {
    const backendType = String(args.backend.type || "").trim();
    const requestKind = String(args.requestKind || "").trim();
    return (
      backendType === ACP_BACKEND_TYPE &&
      (requestKind === ACP_PROMPT_REQUEST_KIND ||
        requestKind === ACP_SKILL_RUN_REQUEST_KIND ||
        requestKind === SKILLRUNNER_SEQUENCE_REQUEST_KIND)
    );
  }

  async execute(args: ProviderExecuteArgs): Promise<ProviderExecutionResult> {
    if (!this.supports(args)) {
      throw new Error(
        `Unsupported request kind/backend for AcpProvider: requestKind=${args.requestKind}, backendType=${args.backend.type}`,
      );
    }
    if (String(args.requestKind || "").trim() === ACP_SKILL_RUN_REQUEST_KIND) {
      return executeAcpSkillRunnerJob(args);
    }
    if (
      String(args.requestKind || "").trim() ===
      SKILLRUNNER_SEQUENCE_REQUEST_KIND
    ) {
      throw new Error(
        "skillrunner.sequence.v1 must be executed by workflow runtime orchestration",
      );
    }
    const request = args.request as AcpPromptRequestV1;
    const requestId = `acp-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId: args.backend.id,
      backendType: args.backend.type,
      providerId: this.id,
      requestId,
      component: "acp-provider",
      operation: "execute",
      phase: "terminal",
      stage: "provider-acp-dispatch-stubbed",
      message:
        "ACP provider routed prompt contract to phase-1 global chat surface",
      details: {
        requestKind: args.requestKind,
        hasHostContext: !!request.hostContext,
      },
    });
    return {
      status: "succeeded",
      requestId,
      fetchType: "result",
      resultJson: {
        kind: ACP_PROMPT_REQUEST_KIND,
        message: request.message,
        hostContext: request.hostContext || {},
        phase: "sidebar-global-chat",
      },
      responseJson: {
        kind: ACP_PROMPT_REQUEST_KIND,
        phase: "sidebar-global-chat",
      },
    };
  }
}
