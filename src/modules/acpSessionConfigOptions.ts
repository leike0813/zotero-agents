import type {
  AcpSessionConfigCategory,
  AcpSessionConfigOption,
  AcpSessionConfigSelectOption,
} from "./acpProtocol";
import {
  foldAcpModelOptions,
  type AcpSelectableOption,
} from "./acpModelOptionFolding";

export type AcpRuntimeOptionsState = {
  modes: AcpSelectableOption[];
  currentModeId: string;
  rawModels: AcpSelectableOption[];
  currentRawModelId: string;
  displayModels: AcpSelectableOption[];
  currentDisplayModelId: string;
  reasoningEfforts: AcpSelectableOption[];
  currentReasoningEffortId: string;
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

export function buildAcpRuntimeOptionsStateFromConfigOptions(
  configOptions: AcpSessionConfigOption[] | null | undefined,
): AcpRuntimeOptionsState {
  const normalized = normalizeAcpSessionConfigOptions(configOptions);
  const modeOption = findAcpSessionConfigOptionByCategory(normalized, "mode");
  const modelOption = findAcpSessionConfigOptionByCategory(normalized, "model");
  const reasoningOption = findAcpSessionConfigOptionByCategory(
    normalized,
    "thought_level",
  );
  const modes = selectableOptionsFromConfigOption(modeOption);
  const rawModels = selectableOptionsFromConfigOption(modelOption);
  const folded = foldAcpModelOptions({
    modelOptions: rawModels,
    currentModelId: normalizeString(modelOption?.currentValue),
  });
  const reasoningEfforts = selectableOptionsFromConfigOption(reasoningOption);
  const currentReasoningEffortId =
    normalizeString(reasoningOption?.currentValue) ||
    folded.currentReasoningEffort?.id ||
    "";
  return {
    modes,
    currentModeId: normalizeString(modeOption?.currentValue),
    rawModels,
    currentRawModelId: normalizeString(modelOption?.currentValue),
    displayModels: folded.displayModelOptions,
    currentDisplayModelId: folded.currentDisplayModel?.id || "",
    reasoningEfforts:
      reasoningEfforts.length > 0
        ? reasoningEfforts
        : folded.reasoningEffortOptions,
    currentReasoningEffortId,
  };
}

export function hasAcpRuntimeOptionSelectors(
  state: Partial<
    Pick<AcpRuntimeOptionsState, "modes" | "displayModels" | "rawModels">
  >,
) {
  return (
    (state.modes || []).length > 0 ||
    (state.displayModels || []).length > 0 ||
    (state.rawModels || []).length > 0
  );
}
