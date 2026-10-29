import type {
  AcpSessionConfigCategory,
  AcpSessionConfigOption,
  AcpSessionConfigSelectOption,
  SessionModelState,
  SessionModeState,
} from "../../acpProtocol";
import { RequestError } from "../../acpProtocol";
import {
  normalizeAcpModelOption,
  type AcpSelectableOption,
} from "./acpModelOptionFolding";

export type AcpReasoningSource = "explicit" | "none";

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
          ? (
              source.options as NonNullable<AcpSessionConfigOption["options"]>
            ).map((entry) => {
              const group = entry as Record<string, unknown>;
              if (!Array.isArray(group.options)) {
                return {
                  ...group,
                  ...(normalizeString(group.providerId)
                    ? { providerId: normalizeString(group.providerId) }
                    : {}),
                  ...(normalizeString(group.providerLabel)
                    ? { providerLabel: normalizeString(group.providerLabel) }
                    : {}),
                  ...(normalizeString(group.modelIdentifier)
                    ? {
                        modelIdentifier: normalizeString(group.modelIdentifier),
                      }
                    : {}),
                } as AcpSessionConfigSelectOption;
              }
              return {
                ...group,
                options: group.options.map((nested) => {
                  const item = nested as Record<string, unknown>;
                  return {
                    ...item,
                    ...(normalizeString(item.providerId || group.providerId)
                      ? {
                          providerId: normalizeString(
                            item.providerId || group.providerId,
                          ),
                        }
                      : {}),
                    ...(normalizeString(
                      item.providerLabel ||
                        group.providerLabel ||
                        group.name ||
                        group.group,
                    )
                      ? {
                          providerLabel: normalizeString(
                            item.providerLabel ||
                              group.providerLabel ||
                              group.name ||
                              group.group,
                          ),
                        }
                      : {}),
                    ...(normalizeString(item.modelIdentifier)
                      ? {
                          modelIdentifier: normalizeString(
                            item.modelIdentifier,
                          ),
                        }
                      : {}),
                  };
                }),
              } as NonNullable<AcpSessionConfigOption["options"]>[number];
            })
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
  const matches = (configOptions || []).filter(
    (entry) =>
      normalizeString(entry.type).toLowerCase() === "select" &&
      optionCategory(entry) === targetCategory,
  );
  if (matches.length > 1) {
    // An ambiguous category must fail closed instead of silently picking one option.
    throw RequestError.invalidParams({
      details: `Multiple config options claim the "${targetCategory}" category: ${matches
        .map((entry) => normalizeString(entry.id))
        .join(", ")}`,
    });
  }
  return matches[0];
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
          providerId:
            normalizeString(nestedSource.providerId || source.providerId) ||
            undefined,
          providerLabel:
            normalizeString(
              nestedSource.providerLabel ||
                source.providerLabel ||
                source.name ||
                source.group,
            ) || undefined,
          modelIdentifier:
            normalizeString(nestedSource.modelIdentifier) || undefined,
        });
      }
      continue;
    }
    result.push({
      value: normalizeString(source.value || source.id),
      name: normalizeString(source.name || source.label),
      description: normalizeString(source.description) || undefined,
      providerId: normalizeString(source.providerId) || undefined,
      providerLabel: normalizeString(source.providerLabel) || undefined,
      modelIdentifier: normalizeString(source.modelIdentifier) || undefined,
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
  return flattenSelectOptions(option).map((entry) => {
    if (optionCategory(option) === "model") {
      return normalizeAcpModelOption({
        modelId: entry.value,
        name: entry.name || entry.value,
        description: entry.description,
        providerId: entry.providerId,
        providerLabel: entry.providerLabel,
        modelIdentifier: entry.modelIdentifier,
      });
    }
    return {
      id: entry.value,
      label: entry.name || entry.value,
      description: entry.description || undefined,
      ...(entry.providerId ? { providerId: entry.providerId } : {}),
      ...(entry.providerLabel ? { providerLabel: entry.providerLabel } : {}),
      ...(entry.modelIdentifier
        ? { modelIdentifier: entry.modelIdentifier }
        : {}),
    };
  });
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
            ...(normalizeString(source.providerId)
              ? { providerId: normalizeString(source.providerId) }
              : {}),
            ...(normalizeString(source.providerLabel)
              ? { providerLabel: normalizeString(source.providerLabel) }
              : {}),
            ...(normalizeString(source.modelIdentifier)
              ? { modelIdentifier: normalizeString(source.modelIdentifier) }
              : {}),
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

function selectCurrentId(candidates: unknown[]) {
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

export function normalizeAcpSkillRuntimeSelection(args: {
  options?: Record<string, unknown> | null;
}): AcpSkillRuntimeSelection {
  const options = args.options || {};
  const modeId = normalizeString(options.acpModeId);
  const modelId = normalizeString(options.acpModelId);
  const reasoningEffort = normalizeString(options.acpReasoningEffort);
  return {
    ...(modeId ? { modeId } : {}),
    ...(modelId ? { modelId, rawModelId: modelId } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
}

export function resolveAcpRuntimeOptionsState(args: {
  configOptions?: AcpSessionConfigOption[] | null;
  modes?: AcpRuntimeModeStateInput | null;
  models?: AcpRuntimeModelStateInput | null;
  cache?: AcpRuntimeOptionsCacheLike | null;
  overrides?: AcpRuntimeOptionsCurrentOverrides | null;
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
  const liveConfiguration =
    args.configOptions !== undefined ||
    args.models !== undefined ||
    args.modes !== undefined;
  const modes = modeOption
    ? selectableOptionsFromConfigOption(modeOption)
    : args.modes
      ? selectableModeOptions(args.modes)
      : liveConfiguration
        ? []
        : normalizeSelectableOptions(cache.modes);
  const rawModels = modelOption
    ? selectableOptionsFromConfigOption(modelOption)
    : args.models
      ? selectableModelOptions(args.models)
      : liveConfiguration
        ? []
        : normalizeSelectableOptions(cache.rawModels);
  const modeCurrent = modeOption
    ? modeOption.currentValue
    : args.modes
      ? args.modes.currentModeId
      : liveConfiguration
        ? ""
        : cache.currentModeId;
  const modelCurrent = modelOption
    ? modelOption.currentValue
    : args.models
      ? args.models.currentModelId
      : liveConfiguration
        ? ""
        : cache.currentRawModelId;
  const currentModeId = selectCurrentId([overrides.modeId, modeCurrent]);
  const currentRawModelId = selectCurrentId([
    overrides.rawModelId,
    overrides.displayModelId,
    modelCurrent,
  ]);
  const reasoningSource: AcpReasoningSource =
    reasoningOption ||
    (!liveConfiguration && cache.reasoningSource === "explicit")
      ? "explicit"
      : "none";
  const reasoningOptions = reasoningOption
    ? selectableOptionsFromConfigOption(reasoningOption)
    : reasoningSource === "explicit"
      ? normalizeSelectableOptions(cache.reasoningEfforts)
      : [];
  const reasoningCurrent = reasoningOption
    ? reasoningOption.currentValue
    : reasoningSource === "explicit"
      ? cache.currentReasoningEffortId
      : "";
  const currentReasoningEffortId =
    reasoningSource === "explicit"
      ? selectCurrentId([overrides.reasoningEffortId, reasoningCurrent])
      : "";
  const observedModels = includeObservedCurrentOption(rawModels, modelCurrent);
  return {
    modes: includeObservedCurrentOption(modes, modeCurrent),
    currentModeId,
    rawModels: observedModels,
    currentRawModelId,
    displayModels: observedModels.map((entry) => ({ ...entry })),
    currentDisplayModelId: currentRawModelId,
    reasoningEfforts: includeObservedCurrentOption(
      reasoningOptions,
      reasoningCurrent,
    ),
    currentReasoningEffortId,
    reasoningSource,
  };
}

export function buildAcpRuntimeOptionsStateFromConfigOptions(
  configOptions: AcpSessionConfigOption[] | null | undefined,
): AcpRuntimeOptionsState {
  return resolveAcpRuntimeOptionsState({ configOptions: configOptions || [] });
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
    (state.rawModels || []).length > 0 ||
    (state.reasoningEfforts || []).length > 0
  );
}
