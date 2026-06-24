import { getSkillRunnerModelCacheEntry } from "./modelCache";

type SkillRunnerManifestSnapshot = {
  version: string;
  file: string;
};

type SkillRunnerManifest = {
  engine: string;
  snapshots: SkillRunnerManifestSnapshot[];
};

type SkillRunnerModelEntry = {
  id: string;
  display_name: string;
  deprecated?: boolean;
  provider_id?: string;
  provider?: string;
  model?: string;
  supported_effort?: string[];
};

type SkillRunnerModelsSnapshot = {
  engine: string;
  version: string;
  models: SkillRunnerModelEntry[];
};

type SkillRunnerModelOption = {
  value: string;
  label: string;
};

type SkillRunnerModelCatalogScope = {
  backendId?: string;
  baseUrl?: string;
};

const DEFAULT_EFFORT = "default";

const SINGLE_PROVIDER_ENGINE_CANONICAL_PROVIDER_ID: Record<string, string> = {
  codex: "openai",
  gemini: "google",
  iflow: "iflowcn",
};

const MODEL_MANIFESTS: SkillRunnerManifest[] = [
  {
    engine: "codex",
    snapshots: [
      { version: "0.0.0", file: "models_0.0.0.json" },
      { version: "0.89.0", file: "models_0.89.0.json" },
      { version: "0.99.0", file: "models_0.99.0.json" },
      { version: "0.106.0", file: "models_0.106.0.json" },
    ],
  },
  {
    engine: "gemini",
    snapshots: [
      { version: "0.0.0", file: "models_0.0.0.json" },
      { version: "0.25.2", file: "models_0.25.2.json" },
      { version: "0.30.0", file: "models_0.30.0.json" },
    ],
  },
  {
    engine: "iflow",
    snapshots: [
      { version: "0.0.0", file: "models_0.0.0.json" },
      { version: "0.5.2", file: "models_0.5.2.json" },
      { version: "0.5.12", file: "models_0.5.12.json" },
      { version: "0.5.14", file: "models_0.5.14.json" },
    ],
  },
];

const MODEL_SNAPSHOTS: SkillRunnerModelsSnapshot[] = [
  {
    engine: "codex",
    version: "0.0.0",
    models: [
      {
        id: "gpt-5-codex",
        display_name: "GPT-5 Codex",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
    ],
  },
  {
    engine: "codex",
    version: "0.89.0",
    models: [
      {
        id: "gpt-5.1-codex-mini",
        display_name: "GPT-5.1 Codex Mini",
        supported_effort: ["default", "medium", "high"],
      },
      {
        id: "gpt-5.1-codex-max",
        display_name: "GPT-5.1 Codex Max",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
      {
        id: "gpt-5.2",
        display_name: "GPT-5.2",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
      {
        id: "gpt-5.2-codex",
        display_name: "GPT-5.2 Codex",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
    ],
  },
  {
    engine: "codex",
    version: "0.99.0",
    models: [
      {
        id: "gpt-5.1-codex-mini",
        display_name: "GPT-5.1 Codex Mini",
        supported_effort: ["default", "medium", "high"],
      },
      {
        id: "gpt-5.1-codex-max",
        display_name: "GPT-5.1 Codex Max",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
      {
        id: "gpt-5.2",
        display_name: "GPT-5.2",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
      {
        id: "gpt-5.2-codex",
        display_name: "GPT-5.2 Codex",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
      {
        id: "gpt-5.3-codex",
        display_name: "GPT-5.3 Codex",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
    ],
  },
  {
    engine: "codex",
    version: "0.106.0",
    models: [
      {
        id: "gpt-5.1-codex-mini",
        display_name: "GPT-5.1 Codex Mini",
        supported_effort: ["default", "medium", "high"],
      },
      {
        id: "gpt-5.1-codex-max",
        display_name: "GPT-5.1 Codex Max",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
      {
        id: "gpt-5.2",
        display_name: "GPT-5.2",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
      {
        id: "gpt-5.2-codex",
        display_name: "GPT-5.2 Codex",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
      {
        id: "gpt-5.3-codex",
        display_name: "GPT-5.3 Codex",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
      {
        id: "gpt-5.4",
        display_name: "GPT-5.4",
        supported_effort: ["default", "low", "medium", "high", "xhigh"],
      },
    ],
  },
  {
    engine: "gemini",
    version: "0.0.0",
    models: [
      { id: "gemini-3-pro-preview", display_name: "Gemini 3 Pro Preview" },
    ],
  },
  {
    engine: "gemini",
    version: "0.25.2",
    models: [
      { id: "gemini-3-pro-preview", display_name: "Gemini 3 Pro Preview" },
      { id: "gemini-3-flash-preview", display_name: "Gemini 3 Flash Preview" },
      { id: "gemini-2.5-pro", display_name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", display_name: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-flash-lite", display_name: "Gemini 2.5 Flash Lite" },
    ],
  },
  {
    engine: "gemini",
    version: "0.30.0",
    models: [
      { id: "gemini-3.1-pro-preview", display_name: "Gemini 3.1 Pro Preview" },
      { id: "gemini-3-flash-preview", display_name: "Gemini 3 Flash Preview" },
      { id: "gemini-2.5-pro", display_name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", display_name: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-flash-lite", display_name: "Gemini 2.5 Flash Lite" },
    ],
  },
  {
    engine: "iflow",
    version: "0.0.0",
    models: [{ id: "gpt-4", display_name: "GPT-4" }],
  },
  {
    engine: "iflow",
    version: "0.5.2",
    models: [
      { id: "glm-4.7", display_name: "GLM 4.7" },
      { id: "iflow-rome-30ba3b", display_name: "iFlow ROME 30BA3B" },
      { id: "deepseek-v3.2", display_name: "DeepSeek V3.2" },
      { id: "qwen3-coder-plus", display_name: "Qwen3 Coder Plus" },
      { id: "kimi-k2-thinking", display_name: "Kimi K2 Thinking" },
      { id: "minimax-m2.1", display_name: "MiniMax M2.1" },
      { id: "kimi-k2-0905", display_name: "Kimi K2 0905" },
    ],
  },
  {
    engine: "iflow",
    version: "0.5.12",
    models: [
      { id: "glm-4.7", display_name: "GLM 4.7" },
      { id: "iflow-rome-30ba3b", display_name: "iFlow ROME 30BA3B" },
      { id: "deepseek-v3.2", display_name: "DeepSeek V3.2" },
      { id: "glm-5", display_name: "GLM 5" },
      { id: "qwen3-coder-plus", display_name: "Qwen3 Coder Plus" },
      { id: "kimi-k2-thinking", display_name: "Kimi K2 Thinking" },
      { id: "minimax-m2.5", display_name: "MiniMax M2.5" },
      { id: "kimi-k2.5", display_name: "Kimi K2.5" },
      { id: "kimi-k2-0905", display_name: "Kimi K2 0905" },
    ],
  },
  {
    engine: "iflow",
    version: "0.5.14",
    models: [
      { id: "glm-4.7", display_name: "GLM 4.7" },
      { id: "iflow-rome-30ba3b", display_name: "iFlow ROME 30BA3B" },
      { id: "deepseek-v3.2", display_name: "DeepSeek V3.2" },
      { id: "glm-5", display_name: "GLM 5" },
      { id: "qwen3-coder-plus", display_name: "Qwen3 Coder Plus" },
      { id: "kimi-k2-thinking", display_name: "Kimi K2 Thinking" },
      { id: "minimax-m2.5", display_name: "MiniMax M2.5" },
      { id: "kimi-k2.5", display_name: "Kimi K2.5" },
      { id: "kimi-k2-0905", display_name: "Kimi K2 0905" },
    ],
  },
];

function compareSemver(a: string, b: string) {
  const aParts = String(a || "")
    .split(".")
    .map((entry) => Number(entry));
  const bParts = String(b || "")
    .split(".")
    .map((entry) => Number(entry));
  const maxLength = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLength; i++) {
    const aPart = Number.isFinite(aParts[i]) ? aParts[i] : 0;
    const bPart = Number.isFinite(bParts[i]) ? bParts[i] : 0;
    if (aPart === bPart) {
      continue;
    }
    return aPart > bPart ? 1 : -1;
  }
  return 0;
}

function dedupeStrings(values: string[]) {
  return Array.from(
    new Set(values.map((entry) => String(entry || "").trim()).filter(Boolean)),
  );
}

function normalizeSupportedEffort(raw: unknown) {
  const normalized = Array.isArray(raw)
    ? dedupeStrings(raw.map((entry) => String(entry || "").trim()))
    : [];
  if (normalized.includes(DEFAULT_EFFORT)) {
    return [
      DEFAULT_EFFORT,
      ...normalized.filter((entry) => entry !== DEFAULT_EFFORT),
    ];
  }
  if (normalized.length === 0) {
    return [DEFAULT_EFFORT];
  }
  return [DEFAULT_EFFORT, ...normalized];
}

function toModelOptions(args: {
  models: SkillRunnerModelEntry[];
  preferResolvedModelName?: boolean;
}) {
  const { models, preferResolvedModelName } = args;
  return models.map((entry) => ({
    value:
      preferResolvedModelName && resolveModelName(entry)
        ? resolveModelName(entry)
        : entry.id,
    label:
      entry.display_name ||
      (preferResolvedModelName && resolveModelName(entry)
        ? resolveModelName(entry)
        : entry.id),
  }));
}

function getLatestSnapshot(engine: string) {
  const manifest = MODEL_MANIFESTS.find((entry) => entry.engine === engine);
  if (!manifest || manifest.snapshots.length === 0) {
    return null;
  }
  const sorted = [...manifest.snapshots].sort((left, right) =>
    compareSemver(left.version, right.version),
  );
  const latest = sorted[sorted.length - 1];
  return (
    MODEL_SNAPSHOTS.find(
      (entry) => entry.engine === engine && entry.version === latest.version,
    ) || null
  );
}

function listStaticSkillRunnerEngines() {
  return MODEL_MANIFESTS.map((entry) => entry.engine);
}

function resolveCachedCatalog(scope?: SkillRunnerModelCatalogScope) {
  if (!scope) {
    return null;
  }
  const backendId = String(scope.backendId || "").trim();
  const baseUrl = String(scope.baseUrl || "").trim();
  if (!backendId && !baseUrl) {
    return null;
  }
  return getSkillRunnerModelCacheEntry({
    backendId,
    baseUrl,
  });
}

function resolveEngineModels(
  engine: string,
  scope?: SkillRunnerModelCatalogScope,
): SkillRunnerModelEntry[] {
  const normalizedEngine = String(engine || "").trim();
  if (!normalizedEngine) {
    return [];
  }
  const cached = resolveCachedCatalog(scope);
  if (cached) {
    const cachedModels = Array.isArray(cached.modelsByEngine[normalizedEngine])
      ? cached.modelsByEngine[normalizedEngine]
      : [];
    if (cachedModels.length > 0) {
      return cachedModels
        .map((entry) => ({
          id: String(entry.id || "").trim(),
          display_name: String(entry.display_name || "").trim(),
          deprecated: entry.deprecated === true,
          provider_id: String(entry.provider_id || "").trim() || undefined,
          provider: String(entry.provider || "").trim() || undefined,
          model: String(entry.model || "").trim() || undefined,
          supported_effort: normalizeSupportedEffort(entry.supported_effort),
        }))
        .filter((entry) => !!entry.id);
    }
  }
  const snapshot = getLatestSnapshot(normalizedEngine);
  if (!snapshot) {
    return [];
  }
  return snapshot.models
    .map((entry) => ({
      id: String(entry.id || "").trim(),
      display_name: String(entry.display_name || "").trim(),
      deprecated: entry.deprecated === true,
      provider_id: String(entry.provider_id || "").trim() || undefined,
      provider: String(entry.provider || "").trim() || undefined,
      model: String(entry.model || "").trim() || undefined,
      supported_effort: normalizeSupportedEffort(entry.supported_effort),
    }))
    .filter((entry) => !!entry.id);
}

function resolveModelProviderId(entry: SkillRunnerModelEntry) {
  const direct = String(entry.provider_id || "").trim();
  if (direct) {
    return direct;
  }
  const provider = String(entry.provider || "").trim();
  if (provider) {
    return provider;
  }
  return splitSkillRunnerModelId(entry.id)?.provider || "";
}

function resolveModelName(entry: SkillRunnerModelEntry) {
  const direct = String(entry.model || "").trim();
  if (direct) {
    return direct;
  }
  return splitSkillRunnerModelId(entry.id)?.model || "";
}

function isProviderScopedModelEntry(entry: SkillRunnerModelEntry) {
  return !!resolveModelProviderId(entry) && !!resolveModelName(entry);
}

function matchesModelEntry(args: {
  entry: SkillRunnerModelEntry;
  provider?: string;
  model: string;
}) {
  const normalizedModel = String(args.model || "").trim();
  const normalizedProvider = String(args.provider || "").trim();
  if (!normalizedModel) {
    return false;
  }
  const entryProvider = resolveModelProviderId(args.entry);
  const entryModel = resolveModelName(args.entry);
  const entryId = String(args.entry.id || "").trim();
  if (
    normalizedProvider &&
    entryProvider &&
    entryProvider !== normalizedProvider
  ) {
    return false;
  }
  if (normalizedModel === entryId) {
    return true;
  }
  if (entryModel && normalizedModel === entryModel) {
    return true;
  }
  return (
    !!entryProvider &&
    !!entryModel &&
    normalizedModel === `${entryProvider}/${entryModel}`
  );
}

function findModelEntry(args: {
  engine: string;
  provider?: string;
  model: string;
  scope?: SkillRunnerModelCatalogScope;
}) {
  const models = resolveEngineModels(args.engine, args.scope);
  return (
    models.find((entry) =>
      matchesModelEntry({
        entry,
        provider: args.provider,
        model: args.model,
      }),
    ) || null
  );
}

export function splitSkillRunnerModelId(value: string): {
  provider: string;
  model: string;
} | null {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }
  const index = normalized.indexOf("/");
  if (index <= 0 || index >= normalized.length - 1) {
    return null;
  }
  const provider = normalized.slice(0, index).trim();
  const model = normalized.slice(index + 1).trim();
  if (!provider || !model) {
    return null;
  }
  return {
    provider,
    model,
  };
}

export function splitSkillRunnerModelSpec(value: string): {
  provider: string;
  model: string;
  effort: string;
} | null {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }
  const atIndex = normalized.lastIndexOf("@");
  const base =
    atIndex > 0 && atIndex < normalized.length - 1
      ? normalized.slice(0, atIndex).trim()
      : normalized;
  const effort =
    atIndex > 0 && atIndex < normalized.length - 1
      ? normalized.slice(atIndex + 1).trim()
      : "";
  const providerModel = splitSkillRunnerModelId(base);
  if (providerModel) {
    return {
      provider: providerModel.provider,
      model: providerModel.model,
      effort,
    };
  }
  return {
    provider: "",
    model: base,
    effort,
  };
}

export function getSkillRunnerCanonicalProviderId(engine: string) {
  const normalizedEngine = String(engine || "").trim();
  return SINGLE_PROVIDER_ENGINE_CANONICAL_PROVIDER_ID[normalizedEngine] || "";
}

export function isSkillRunnerProviderScopedEngine(
  engine: string,
  scope?: SkillRunnerModelCatalogScope,
) {
  if (getSkillRunnerCanonicalProviderId(engine)) {
    return false;
  }
  const models = resolveEngineModels(engine, scope);
  return models.some((entry) => isProviderScopedModelEntry(entry));
}

export function listSkillRunnerEngines(scope?: SkillRunnerModelCatalogScope) {
  const cached = resolveCachedCatalog(scope);
  if (cached && cached.engines.length > 0) {
    return [...cached.engines];
  }
  return listStaticSkillRunnerEngines();
}

export function getDefaultSkillRunnerEngine(
  scope?: SkillRunnerModelCatalogScope,
) {
  const engines = listSkillRunnerEngines(scope);
  if (engines.includes("gemini")) {
    return "gemini";
  }
  return engines[0] || "";
}

export function listSkillRunnerModelProviders(
  engine: string,
  scope?: SkillRunnerModelCatalogScope,
) {
  const normalizedEngine = String(engine || "").trim();
  if (!normalizedEngine) {
    return [];
  }
  if (!isSkillRunnerProviderScopedEngine(normalizedEngine, scope)) {
    return [];
  }
  const models = resolveEngineModels(normalizedEngine, scope);
  return dedupeStrings(
    models.map((entry) => resolveModelProviderId(entry)).filter(Boolean),
  ).sort((left, right) => left.localeCompare(right));
}

export function getDefaultSkillRunnerModelProvider(
  engine: string,
  scope?: SkillRunnerModelCatalogScope,
) {
  const providers = listSkillRunnerModelProviders(engine, scope);
  return providers[0] || "";
}

export function listSkillRunnerModelOptions(
  engine: string,
  scope?: SkillRunnerModelCatalogScope,
): SkillRunnerModelOption[] {
  const models = resolveEngineModels(engine, scope);
  return toModelOptions({
    models,
    preferResolvedModelName: !isSkillRunnerProviderScopedEngine(engine, scope),
  }).filter((entry) => String(entry.value || "").trim());
}

export function listSkillRunnerModelOptionsForProvider(
  engine: string,
  provider: string,
  scope?: SkillRunnerModelCatalogScope,
): SkillRunnerModelOption[] {
  const normalizedEngine = String(engine || "").trim();
  if (!normalizedEngine) {
    return [];
  }
  if (!isSkillRunnerProviderScopedEngine(normalizedEngine, scope)) {
    return listSkillRunnerModelOptions(normalizedEngine, scope);
  }
  const normalizedProvider = String(provider || "").trim();
  if (!normalizedProvider) {
    return [];
  }
  const models = resolveEngineModels(normalizedEngine, scope);
  const seen = new Set<string>();
  const options: SkillRunnerModelOption[] = [];
  for (const entry of models) {
    const modelProvider = resolveModelProviderId(entry);
    if (modelProvider !== normalizedProvider) {
      continue;
    }
    const modelName = resolveModelName(entry);
    if (!modelName || seen.has(modelName)) {
      continue;
    }
    seen.add(modelName);
    options.push({
      value: modelName,
      label: entry.display_name || modelName,
    });
  }
  return options;
}

export function listSkillRunnerModelEffortOptions(args: {
  engine: string;
  provider?: string;
  model: string;
  scope?: SkillRunnerModelCatalogScope;
}) {
  const normalizedEngine = String(args.engine || "").trim();
  const normalizedModel = String(args.model || "").trim();
  if (!normalizedEngine || !normalizedModel) {
    return [DEFAULT_EFFORT];
  }
  const effectiveProvider = isSkillRunnerProviderScopedEngine(
    normalizedEngine,
    args.scope,
  )
    ? String(args.provider || "").trim()
    : getSkillRunnerCanonicalProviderId(normalizedEngine);
  const entry = findModelEntry({
    engine: normalizedEngine,
    provider: effectiveProvider,
    model: normalizedModel,
    scope: args.scope,
  });
  return normalizeSupportedEffort(entry?.supported_effort);
}

export function normalizeSkillRunnerEffort(args: {
  engine: string;
  provider?: string;
  model: string;
  effort: unknown;
  scope?: SkillRunnerModelCatalogScope;
}) {
  const supported = listSkillRunnerModelEffortOptions({
    engine: args.engine,
    provider: args.provider,
    model: args.model,
    scope: args.scope,
  });
  const requested = String(args.effort || "").trim() || DEFAULT_EFFORT;
  return supported.includes(requested) ? requested : DEFAULT_EFFORT;
}

export function normalizeSkillRunnerModelForProvider(args: {
  engine: string;
  provider: string;
  model: unknown;
  scope?: SkillRunnerModelCatalogScope;
}) {
  const normalizedEngine = String(args.engine || "").trim();
  const normalizedProvider = String(args.provider || "").trim();
  const normalizedModel = String(args.model || "").trim();
  if (!normalizedEngine || !normalizedProvider || !normalizedModel) {
    return "";
  }
  const models = resolveEngineModels(normalizedEngine, args.scope);
  for (const entry of models) {
    const entryId = String(entry.id || "").trim();
    const entryProvider = resolveModelProviderId(entry);
    const entryModel = resolveModelName(entry);
    if (!entryId || entryProvider !== normalizedProvider) {
      continue;
    }
    if (normalizedModel === entryId && entryModel) {
      return entryModel;
    }
    if (entryModel && normalizedModel === entryModel) {
      return entryModel;
    }
    if (entryModel && normalizedModel === `${entryProvider}/${entryModel}`) {
      return entryModel;
    }
  }
  return "";
}

export function resolveSkillRunnerModelNameForProvider(args: {
  engine: string;
  provider: string;
  model: unknown;
  scope?: SkillRunnerModelCatalogScope;
}) {
  return normalizeSkillRunnerModelForProvider(args);
}

export function normalizeSkillRunnerModel(
  engine: string,
  model: unknown,
  scope?: SkillRunnerModelCatalogScope,
) {
  const value = typeof model === "string" ? model.trim() : "";
  if (!value) {
    return "";
  }
  const entry = findModelEntry({
    engine,
    provider: getSkillRunnerCanonicalProviderId(engine),
    model: value,
    scope,
  });
  if (!entry) {
    const options = listSkillRunnerModelOptions(engine, scope);
    if (!options.some((option) => option.value === value)) {
      return "";
    }
    return value;
  }
  return resolveModelName(entry) || value;
}
