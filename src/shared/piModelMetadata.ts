import type {
  PiModelCompat,
  PiModelCost,
  PiModelCostRates,
  PiModelInputLimits,
  PiModelMetadata,
  PiReasoningLevel,
} from "./piProviderContract";
export const PI_MODEL_REASONING_LEVELS: readonly PiReasoningLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];
const LEVELS = PI_MODEL_REASONING_LEVELS;
const BOOL_COMPAT = new Set([
  "supportsStore",
  "supportsDeveloperRole",
  "supportsReasoningEffort",
  "supportsUsageInStreaming",
  "supportsFinishReason",
  "requiresToolResultName",
  "requiresAssistantAfterToolResult",
  "requiresThinkingAsText",
  "requiresReasoningContentOnAssistantMessages",
  "zaiToolStream",
  "supportsThinkingTokenBudget",
  "supportsOpenAIGrammarTools",
  "supportsMidConvoSystemMessages",
  "supportsMidConvoToolAdditions",
  "supportsStrictMode",
  "sendSessionAffinityHeaders",
  "supportsLongCacheRetention",
  "supportsAdditionalTools",
  "supportsToolSearch",
  "supportsExplicitPromptCacheMode",
  "supportsMaxOutputTokens",
  "supportsEagerToolInputStreaming",
  "supportsCacheControlOnTools",
  "supportsTemperature",
  "forceAdaptiveThinking",
  "allowEmptySignature",
  "supportsStrictTools",
  "supportsMidConvoEffort",
  "supportsMidConvoToolChanges",
]);
const ENUM_COMPAT: Record<string, readonly string[]> = {
  maxTokensField: ["max_completion_tokens", "max_tokens"],
  thinkingFormat: [
    "openai",
    "openrouter",
    "deepseek",
    "together",
    "baseten",
    "zai",
    "qwen",
    "chat-template",
    "qwen-chat-template",
    "string-thinking",
    "ant-ling",
  ],
  sessionAffinityFormat: ["openai", "openai-nosession", "openrouter"],
  cacheControlFormat: ["anthropic"],
  thinkingTokenBudgetField: [
    "thinking_token_budget",
    "thinking_budget",
    "thinking_budget_tokens",
  ],
};
export function piCatalogObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Invalid ${field}`);
  return value as Record<string, unknown>;
}
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
function rates(value: unknown): PiModelCostRates {
  const raw = piCatalogObject(value, "cost");
  return {
    input: number(raw.input, "cost.input"),
    output: number(raw.output, "cost.output"),
    cacheRead: number(raw.cacheRead, "cost.cacheRead"),
    cacheWrite: number(raw.cacheWrite, "cost.cacheWrite"),
  };
}
function cost(value: unknown): PiModelCost {
  const raw = piCatalogObject(value, "cost");
  const normalized: PiModelCost = rates(raw);
  if (raw.tiers !== undefined) {
    if (!Array.isArray(raw.tiers) || raw.tiers.length > 100)
      throw new Error("Invalid cost.tiers");
    const thresholds = new Set<number>();
    normalized.tiers = raw.tiers
      .map((value) => {
        const tier = piCatalogObject(value, "cost.tier");
        const threshold = number(
          tier.inputTokensAbove,
          "cost.inputTokensAbove",
        );
        if (thresholds.has(threshold))
          throw new Error("Duplicate cost threshold");
        thresholds.add(threshold);
        return { ...rates(tier), inputTokensAbove: threshold };
      })
      .sort((a, b) => a.inputTokensAbove - b.inputTokensAbove);
  }
  return normalized;
}
function limits(value: unknown): PiModelInputLimits {
  const raw = piCatalogObject(value, "inputLimits");
  const normalized: PiModelInputLimits = {};
  if (raw.maxRequestBytes !== undefined)
    normalized.maxRequestBytes = integer(
      raw.maxRequestBytes,
      "maxRequestBytes",
    );
  if (raw.images !== undefined) {
    const images = piCatalogObject(raw.images, "images");
    normalized.images = {};
    for (const key of ["maxPerMessage", "maxPerRequest"] as const)
      if (images[key] !== undefined)
        normalized.images[key] = integer(images[key], key);
    if (images.resize !== undefined) {
      const resize = piCatalogObject(images.resize, "resize");
      normalized.images.resize = {};
      for (const key of ["maxWidth", "maxHeight", "maxBytes"] as const)
        if (resize[key] !== undefined)
          normalized.images.resize[key] = integer(resize[key], key);
      if (resize.jpegQuality !== undefined) {
        normalized.images.resize.jpegQuality = number(
          resize.jpegQuality,
          "jpegQuality",
          true,
        );
        if (normalized.images.resize.jpegQuality > 100)
          throw new Error("Invalid jpegQuality");
      }
    }
  }
  return normalized;
}
function compat(value: unknown): {
  value: PiModelCompat;
  unsupported: boolean;
} {
  const raw = piCatalogObject(value, "compat");
  const result: PiModelCompat = {};
  let unsupported = false;
  for (const [key, value] of Object.entries(raw)) {
    if (BOOL_COMPAT.has(key)) result[key] = bool(value, `compat.${key}`);
    else if (ENUM_COMPAT[key]) {
      if (typeof value !== "string" || !ENUM_COMPAT[key].includes(value))
        throw new Error(`Invalid compat.${key}`);
      result[key] = value;
    } else if (key === "vllmPriority") {
      if (!Number.isSafeInteger(value)) throw new Error("Invalid vllmPriority");
      result[key] = value as number;
    } else if (key === "chatTemplateArgs" || key === "chatTemplateKwargs") {
      const args = piCatalogObject(value, key);
      const clean: Record<string, unknown> = {};
      for (const [name, arg] of Object.entries(args)) {
        if (["__proto__", "constructor", "prototype"].includes(name))
          throw new Error("Invalid template key");
        if (
          arg === null ||
          typeof arg === "string" ||
          typeof arg === "boolean" ||
          (typeof arg === "number" && Number.isFinite(arg))
        )
          clean[name] = arg;
        else {
          const variable = piCatalogObject(arg, "template variable");
          if (
            ![
              "thinking.enabled",
              "thinking.effort",
              "thinking.budget",
            ].includes(String(variable.$var))
          )
            throw new Error("Invalid template variable");
          clean[name] = {
            $var: variable.$var,
            ...(variable.omitWhenOff !== undefined
              ? { omitWhenOff: bool(variable.omitWhenOff, "omitWhenOff") }
              : {}),
          };
        }
      }
      result[key] = clean;
    } else if (
      [
        "allowedFallbackModels",
        "openRouterRouting",
        "vercelGatewayRouting",
      ].includes(key)
    ) {
      // These fields introduce routing/fallback behavior not admitted by this adapter.
      if (
        key === "allowedFallbackModels"
          ? !Array.isArray(value)
          : !value || typeof value !== "object" || Array.isArray(value)
      )
        throw new Error(`Invalid compat.${key}`);
      if (key !== "allowedFallbackModels" || (value as unknown[]).length)
        unsupported = true;
    } else unsupported = true;
  }
  return { value: result, unsupported };
}

export function normalizePiModelMetadata(
  raw: Record<string, unknown>,
): PiModelMetadata {
  const metadata: PiModelMetadata = {};
  if (raw.cost !== undefined) {
    const declared = piCatalogObject(raw.cost, "cost");
    // Official OpenRouter input uses -1 per token for dynamic router prices;
    // Pi converts that sentinel to per-million units. It is not a negative bill.
    const unknown = ["input", "output", "cacheRead", "cacheWrite"].some(
      (key) => declared[key] === -1_000_000,
    );
    if (unknown) {
      for (const key of ["input", "output", "cacheRead", "cacheWrite"])
        if (declared[key] !== -1_000_000) number(declared[key], `cost.${key}`);
      metadata.availability = "unsupported";
    } else metadata.cost = cost(raw.cost);
  }
  if (raw.inputLimits !== undefined)
    metadata.inputLimits = limits(raw.inputLimits);
  if (raw.thinkingLevelMap !== undefined) {
    const mapping = piCatalogObject(raw.thinkingLevelMap, "thinkingLevelMap");
    metadata.thinkingLevelMap = {};
    for (const [key, value] of Object.entries(mapping)) {
      if (!LEVELS.includes(key as PiReasoningLevel))
        throw new Error("Invalid thinkingLevelMap level");
      metadata.thinkingLevelMap[key as PiReasoningLevel] =
        value === null ? null : text(value, "thinkingLevelMap value");
    }
  }
  if (raw.promptCache !== undefined) {
    const cache = piCatalogObject(raw.promptCache, "promptCache");
    metadata.promptCache = {};
    for (const key of ["short", "long"] as const)
      if (cache[key] !== undefined)
        metadata.promptCache[key] = number(cache[key], `promptCache.${key}`);
  }
  if (raw.compat !== undefined) {
    const parsed = compat(raw.compat);
    metadata.compat = parsed.value;
    if (parsed.unsupported) metadata.availability = "unsupported";
  }
  if (raw.samplingParams !== undefined) {
    const sampling = piCatalogObject(raw.samplingParams, "samplingParams");
    metadata.samplingParams = {};
    const supported = new Set([
      "temperature",
      "top_p",
      "top_k",
      "min_p",
      "typical_p",
      "presence_penalty",
      "frequency_penalty",
      "repetition_penalty",
      "seed",
    ]);
    for (const [key, value] of Object.entries(sampling)) {
      if (!supported.has(key)) {
        metadata.availability = "unsupported";
        continue;
      }
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`Invalid samplingParams.${key}`);
      // Pi passes native request-body sampling keys through unchanged.
      // Penalties and seeds can legitimately be negative.
      metadata.samplingParams[key] = value;
    }
  }
  return metadata;
}
