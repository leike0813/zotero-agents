import type {
  AcpSessionConfigCategory,
  AcpSessionConfigOption,
  AcpSessionConfigSelectOption,
  SessionModelState,
  SessionModeState,
} from "./acpProtocol";
import {
  foldAcpModelOptions,
  normalizeAcpEffortId,
  normalizeAcpModelOption,
  resolveAcpRawModelIdForSelection,
  type AcpSelectableOption,
} from "./acpModelOptionFolding";

export type AcpReasoningSource = "explicit" | "model-derived" | "none";

export type AcpRuntimeOptionsState = {
  modes: AcpSelectableOption[];
  currentModeId: string;
  rawModels: AcpSelectableOption[];
  currentRawModelId: string;
  displayModels: AcpSelectableOption[];
  currentDisplayModelId: string;
  reasoningEfforts: AcpSelectableOption[];
  currentReasoningEffortId: string;
  reasoningSource: AcpReasoningSource;
};

export type AcpRuntimeOptionsCacheLike = Partial<AcpRuntimeOptionsState>;

export type AcpRuntimeOptionsCurrentOverrides = Partial<{
  modeId: string;
  rawModelId: string;
  displayModelId: string;
  reasoningEffortId: string;
}>;

export type AcpSkillRuntimeSelection = {
  modeId?: string;
  modelId?: string;
  rawModelId?: string;
  reasoningEffort?: string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeCategory(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function optionCategory(option: AcpSessionConfigOption) {
  const category = normalizeCategory(option.category);
  if (category) {
    return category;
  }
  const id = normalizeCategory(option.id);
  if (id === "mode" || id === "model" || id === "thought_level") {
    return id;
  }
  if (id === "reasoning" || id === "reasoning_effort") {
    return "thought_level";
  }
  return "";
}

export function normalizeAcpSessionConfigOptions(
  value: unknown,
): AcpSessionConfigOption[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry): AcpSessionConfigOption | null => {
      const source =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {};
      const id = normalizeString(source.id);
      const name = normalizeString(source.name || id);
      const type = normalizeString(source.type);
      const currentValue = normalizeString(source.currentValue);
      if (!id || !name || !type) {
        return null;
      }
      const normalized: AcpSessionConfigOption = {
        id,
        name,
        type,
        currentValue,
        options: Array.isArray(source.options)
          ? (source.options as AcpSessionConfigOption["options"])
          : [],
      };
      const description = normalizeString(source.description);
      const category = normalizeString(source.category);
      if (description) {
        normalized.description = description;
      }
      if (category) {
        normalized.category = category;
      }
      return normalized;
    })
    .filter((entry): entry is AcpSessionConfigOption => entry !== null);
}

export function findAcpSessionConfigOptionByCategory(
  configOptions: AcpSessionConfigOption[] | null | undefined,
  category: AcpSessionConfigCategory,
) {
  const targetCategory = normalizeCategory(category);
  return (configOptions || []).find(
    (entry) =>
      normalizeString(entry.type).toLowerCase() === "select" &&
      optionCategory(entry) === targetCategory,
  );
}

function flattenSelectOptions(option: AcpSessionConfigOption) {
  const result: AcpSessionConfigSelectOption[] = [];
  for (const entry of Array.isArray(option.options) ? option.options : []) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const source = entry as Record<string, unknown>;
    if (Array.isArray(source.options)) {
      for (const nested of source.options) {
        if (!nested || typeof nested !== "object") {
          continue;
        }
        const nestedSource = nested as Record<string, unknown>;
        result.push({
          value: normalizeString(nestedSource.value || nestedSource.id),
          name: normalizeString(nestedSource.name || nestedSource.label),
          description: normalizeString(nestedSource.description) || undefined,
        });
      }
      continue;
    }
    result.push({
      value: normalizeString(source.value || source.id),
      name: normalizeString(source.name || source.label),
      description: normalizeString(source.description) || undefined,
    });
  }
  return result.filter((entry) => entry.value && entry.name);
}

function selectableOptionsFromConfigOption(
  option: AcpSessionConfigOption | undefined,
) {
  if (!option) {
    return [] as AcpSelectableOption[];
  }
  return flattenSelectOptions(option).map((entry) => ({
    id: entry.value,
    label: entry.name || entry.value,
    description: entry.description || undefined,
  }));
}

function normalizeSelectableOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as AcpSelectableOption[];
  }
  return value
    .map((entry) => {
      const source =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {};
      const id = normalizeString(source.id || source.value);
      const label = normalizeString(source.label || source.name || id);
      const description = normalizeString(source.description);
      return id && label
        ? {
            id,
            label,
            ...(description ? { description } : {}),
          }
        : null;
    })
    .filter((entry): entry is AcpSelectableOption => entry !== null);
}

function includeObservedCurrentOption(
  options: AcpSelectableOption[],
  currentIdRaw: unknown,
) {
  const currentId = normalizeString(currentIdRaw);
  if (!currentId || options.some((entry) => entry.id === currentId)) {
    return options;
  }
  return [...options, { id: currentId, label: currentId }];
}

function firstCurrentId(candidates: unknown[]) {
  for (const candidate of candidates) {
    const id = normalizeString(candidate);
    if (id) return id;
  }
  return "";
}

type AcpRuntimeModeStateInput = {
  currentModeId?: string | null;
  availableModes?: SessionModeState["availableModes"] | null;
};

type AcpRuntimeModelStateInput = {
  currentModelId?: string | null;
  availableModels?: SessionModelState["availableModels"] | null;
};

function selectableModeOptions(modes?: AcpRuntimeModeStateInput | null) {
  return Array.isArray(modes?.availableModes)
    ? modes.availableModes
        .map((entry) => ({
          id: normalizeString(entry.id),
          label: normalizeString(entry.name || entry.id),
          description: normalizeString(entry.description) || undefined,
        }))
        .filter((entry) => entry.id && entry.label)
    : [];
}

function selectableModelOptions(models?: AcpRuntimeModelStateInput | null) {
  return Array.isArray(models?.availableModels)
    ? models.availableModels
        .map(normalizeAcpModelOption)
        .filter((entry) => entry.id && entry.label)
    : [];
}

function selectCurrentId(
  options: AcpSelectableOption[],
  candidates: unknown[],
  fallbackToFirst: boolean,
) {
  for (const candidate of candidates) {
    const id = normalizeString(candidate);
    if (id && options.some((entry) => entry.id === id)) {
      return id;
    }
  }
  return fallbackToFirst ? options[0]?.id || "" : "";
}

export function normalizeAcpSkillRuntimeSelection(args: {
  options?: Record<string, unknown> | null;
  cache?: AcpRuntimeOptionsCacheLike | null;
}): AcpSkillRuntimeSelection {
  const options = args.options || {};
  const cache = args.cache || {};
  const modes = normalizeSelectableOptions(cache.modes);
  const displayModels = normalizeSelectableOptions(cache.displayModels);
  const rawModels = normalizeSelectableOptions(cache.rawModels);
  const reasoningEfforts = normalizeSelectableOptions(cache.reasoningEfforts);
  const selectCatalogMember = (
    catalog: AcpSelectableOption[],
    candidates: unknown[],
    normalize: (value: unknown) => string = normalizeString,
  ) => {
    for (const candidate of candidates) {
      const id = normalize(candidate);
      if (id && catalog.some((entry) => entry.id === id)) {
        return id;
      }
    }
    return "";
  };
  const modeId = selectCatalogMember(modes, [
    options.acpModeId,
    cache.currentModeId,
  ]);
  const modelId = selectCatalogMember(displayModels, [
    options.acpModelId,
    cache.currentDisplayModelId,
  ]);
  const reasoningEffort = selectCatalogMember(
    reasoningEfforts,
    [options.acpReasoningEffort, cache.currentReasoningEffortId],
    normalizeAcpEffortId,
  );
  const rawModelId = modelId
    ? resolveAcpRawModelIdForSelection({
        modelOptions: rawModels,
        displayModelId: modelId,
        effortId: reasoningEffort,
        currentRawModelId: selectCatalogMember(rawModels, [
          cache.currentRawModelId,
        ]),
      })
    : "";
  const verifiedRawModelId = rawModels.some((entry) => entry.id === rawModelId)
    ? rawModelId
    : "";
  return {
    ...(modeId ? { modeId } : {}),
    ...(modelId ? { modelId } : {}),
    ...(verifiedRawModelId ? { rawModelId: verifiedRawModelId } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
}

function hasSameOptionIds(
  left: AcpSelectableOption[],
  right: AcpSelectableOption[],
) {
  return (
    left.length === right.length &&
    left.every((entry, index) => entry.id === right[index]?.id)
  );
}

function inferCachedReasoningSource(args: {
  cache: AcpRuntimeOptionsCacheLike;
  foldedReasoning: AcpSelectableOption[];
  cachedReasoning: AcpSelectableOption[];
}): AcpReasoningSource {
  if (
    args.cache.reasoningSource === "explicit" ||
    args.cache.reasoningSource === "model-derived" ||
    args.cache.reasoningSource === "none"
  ) {
    return args.cache.reasoningSource;
  }
  return args.cachedReasoning.length > 0 &&
    hasSameOptionIds(args.cachedReasoning, args.foldedReasoning)
    ? "model-derived"
    : args.cachedReasoning.length > 0
      ? "explicit"
      : "none";
}

export function resolveAcpRuntimeOptionsState(args: {
  configOptions?: AcpSessionConfigOption[] | null;
  modes?: AcpRuntimeModeStateInput | null;
  models?: AcpRuntimeModelStateInput | null;
  cache?: AcpRuntimeOptionsCacheLike | null;
  overrides?: AcpRuntimeOptionsCurrentOverrides | null;
  fallbackToFirst?: boolean;
}): AcpRuntimeOptionsState {
  const normalized = normalizeAcpSessionConfigOptions(args.configOptions);
  const modeOption = findAcpSessionConfigOptionByCategory(normalized, "mode");
  const modelOption = findAcpSessionConfigOptionByCategory(normalized, "model");
  const reasoningOption = findAcpSessionConfigOptionByCategory(
    normalized,
    "thought_level",
  );
  const cache = args.cache || {};
  const overrides = args.overrides || {};
  const fallbackToFirst = args.fallbackToFirst !== false;

  const configModes = selectableOptionsFromConfigOption(modeOption);
  const legacyModes = selectableModeOptions(args.modes);
  const cachedModes = normalizeSelectableOptions(cache.modes);
  const modeCandidates = [
    overrides.modeId,
    modeOption?.currentValue,
    args.modes?.currentModeId,
    cache.currentModeId,
  ];
  const modes = includeObservedCurrentOption(
    configModes.length
      ? configModes
      : legacyModes.length
        ? legacyModes
        : cachedModes,
    firstCurrentId(modeCandidates.slice(1)),
  );
  const currentModeId = selectCurrentId(modes, modeCandidates, fallbackToFirst);

  const configModels = selectableOptionsFromConfigOption(modelOption);
  const legacyModels = selectableModelOptions(args.models);
  const cachedModels = normalizeSelectableOptions(cache.rawModels);
  const rawModelCandidates = [
    overrides.rawModelId,
    modelOption?.currentValue,
    args.models?.currentModelId,
    cache.currentRawModelId,
  ];
  const rawModels = includeObservedCurrentOption(
    configModels.length
      ? configModels
      : legacyModels.length
        ? legacyModels
        : cachedModels,
    firstCurrentId(rawModelCandidates.slice(1)),
  );
  let currentRawModelId = selectCurrentId(
    rawModels,
    rawModelCandidates,
    fallbackToFirst,
  );
  let folded = foldAcpModelOptions({
    modelOptions: rawModels,
    currentModelId: currentRawModelId,
  });
  const displayModelOverride = normalizeString(overrides.displayModelId);
  if (
    displayModelOverride &&
    folded.displayModelOptions.some(
      (entry) => entry.id === displayModelOverride,
    )
  ) {
    currentRawModelId = resolveAcpRawModelIdForSelection({
      modelOptions: rawModels,
      displayModelId: displayModelOverride,
      effortId: normalizeString(overrides.reasoningEffortId),
      currentRawModelId,
    });
    folded = foldAcpModelOptions({
      modelOptions: rawModels,
      currentModelId: currentRawModelId,
    });
  }

  const configReasoning = selectableOptionsFromConfigOption(reasoningOption);
  const cachedReasoning = normalizeSelectableOptions(cache.reasoningEfforts);
  const cachedReasoningSource = inferCachedReasoningSource({
    cache,
    foldedReasoning: folded.reasoningEffortOptions,
    cachedReasoning,
  });
  const reasoningSource: AcpReasoningSource =
    configReasoning.length || normalizeString(reasoningOption?.currentValue)
      ? "explicit"
      : cachedReasoning.length && cachedReasoningSource === "explicit"
        ? "explicit"
        : folded.reasoningEffortOptions.length
          ? "model-derived"
          : "none";
  const reasoningCandidates = [
    overrides.reasoningEffortId,
    reasoningOption?.currentValue,
    reasoningSource === "model-derived"
      ? folded.currentReasoningEffort?.id
      : undefined,
    cache.currentReasoningEffortId,
  ];
  const observedReasoningCandidates = reasoningCandidates.slice(1);
  const reasoningEfforts = includeObservedCurrentOption(
    reasoningSource === "explicit"
      ? configReasoning.length
        ? configReasoning
        : cachedReasoning
      : reasoningSource === "model-derived"
        ? folded.reasoningEffortOptions
        : [],
    firstCurrentId(observedReasoningCandidates),
  );
  const currentReasoningEffortId = selectCurrentId(
    reasoningEfforts,
    reasoningCandidates,
    fallbackToFirst,
  );

  return {
    modes,
    currentModeId,
    rawModels,
    currentRawModelId,
    displayModels: folded.displayModelOptions,
    currentDisplayModelId: folded.currentDisplayModel?.id || "",
    reasoningEfforts,
    currentReasoningEffortId,
    reasoningSource,
  };
}

export function buildAcpRuntimeOptionsStateFromConfigOptions(
  configOptions: AcpSessionConfigOption[] | null | undefined,
): AcpRuntimeOptionsState {
  return resolveAcpRuntimeOptionsState({ configOptions });
}

export function hasAcpRuntimeOptionSelectors(
  state: Partial<
    Pick<
      AcpRuntimeOptionsState,
      "modes" | "displayModels" | "rawModels" | "reasoningEfforts"
    >
  >,
) {
  return (
    (state.modes || []).length > 0 ||
    (state.displayModels || []).length > 0 ||
    (state.rawModels || []).length > 0 ||
    (state.reasoningEfforts || []).length > 0
  );
}
