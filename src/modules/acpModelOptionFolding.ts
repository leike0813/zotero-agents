import type { AcpModelInfo } from "./acpProtocol";

export type AcpSelectableOption = {
  id: string;
  label: string;
  description?: string;
};

export type AcpModelEffortVariant = {
  raw: AcpSelectableOption;
  baseId: string;
  baseLabel: string;
  effortId: string;
};

export type AcpFoldedModelGroup = {
  baseId: string;
  baseLabel: string;
  variants: AcpModelEffortVariant[];
};

export const ACP_UNSCOPED_MODEL_PROVIDER = "Unscoped";

export const ACP_KNOWN_REASONING_EFFORT_ORDER = [
  "default",
  "low",
  "medium",
  "high",
  "xhigh",
];

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function parseAcpProviderModelId(value: unknown) {
  const id = normalizeString(value);
  const index = Math.max(id.lastIndexOf("/"), id.lastIndexOf(":"));
  if (index <= 0 || index >= id.length - 1) {
    return null;
  }
  return {
    provider: id.slice(0, index).trim(),
    model: id.slice(index + 1).trim(),
  };
}

export function hasAcpProviderScopedModelOptions(
  modelOptions: AcpSelectableOption[],
) {
  return modelOptions.some((entry) => !!parseAcpProviderModelId(entry.id));
}

function uniqueOrdered(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeString(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function providerForDisplayModelId(value: unknown) {
  return parseAcpProviderModelId(value)?.provider || "";
}

function modelForDisplayModelId(value: unknown) {
  return parseAcpProviderModelId(value)?.model || normalizeString(value);
}

export function resolveAcpModelProviderForSelection(args: {
  modelOptions: AcpSelectableOption[];
  provider?: unknown;
  displayModelId?: unknown;
  currentDisplayModelId?: unknown;
}) {
  const explicitProvider = normalizeString(args.provider);
  const providers = listAcpModelProviderOptions(args.modelOptions);
  if (explicitProvider && providers.includes(explicitProvider)) {
    return explicitProvider;
  }
  const fromSelected = providerForDisplayModelId(args.displayModelId);
  if (fromSelected && providers.includes(fromSelected)) {
    return fromSelected;
  }
  const selectedModel = normalizeString(args.displayModelId);
  if (
    selectedModel &&
    args.modelOptions.some(
      (entry) => entry.id === selectedModel && !parseAcpProviderModelId(entry.id),
    )
  ) {
    return ACP_UNSCOPED_MODEL_PROVIDER;
  }
  const fromCurrent = providerForDisplayModelId(args.currentDisplayModelId);
  if (fromCurrent && providers.includes(fromCurrent)) {
    return fromCurrent;
  }
  const currentModel = normalizeString(args.currentDisplayModelId);
  if (
    currentModel &&
    args.modelOptions.some(
      (entry) => entry.id === currentModel && !parseAcpProviderModelId(entry.id),
    )
  ) {
    return ACP_UNSCOPED_MODEL_PROVIDER;
  }
  return providers[0] || "";
}

export function listAcpModelProviderOptions(
  modelOptions: AcpSelectableOption[],
) {
  if (!hasAcpProviderScopedModelOptions(modelOptions)) {
    return [] as string[];
  }
  const providers = uniqueOrdered(
    modelOptions
      .map((entry) => providerForDisplayModelId(entry.id))
      .filter(Boolean),
  );
  const hasUnscoped = modelOptions.some(
    (entry) => !parseAcpProviderModelId(entry.id),
  );
  return hasUnscoped ? [...providers, ACP_UNSCOPED_MODEL_PROVIDER] : providers;
}

export function listAcpModelOptionsForProvider(args: {
  modelOptions: AcpSelectableOption[];
  provider?: unknown;
  displayModelId?: unknown;
  currentDisplayModelId?: unknown;
}) {
  if (!hasAcpProviderScopedModelOptions(args.modelOptions)) {
    return args.modelOptions.map((entry) => entry.id);
  }
  const provider = resolveAcpModelProviderForSelection({
    modelOptions: args.modelOptions,
    provider: args.provider,
    displayModelId: args.displayModelId,
    currentDisplayModelId: args.currentDisplayModelId,
  });
  if (provider === ACP_UNSCOPED_MODEL_PROVIDER) {
    return uniqueOrdered(
      args.modelOptions
        .filter((entry) => !parseAcpProviderModelId(entry.id))
        .map((entry) => entry.id),
    );
  }
  return uniqueOrdered(
    args.modelOptions
      .filter((entry) => providerForDisplayModelId(entry.id) === provider)
      .map((entry) => modelForDisplayModelId(entry.id)),
  );
}

export function resolveAcpDisplayModelIdForProviderSelection(args: {
  modelOptions: AcpSelectableOption[];
  provider?: unknown;
  modelId?: unknown;
  currentDisplayModelId?: unknown;
}) {
  const modelId = normalizeString(args.modelId);
  const requestedProvider = normalizeString(args.provider);
  if (!modelId && !requestedProvider) {
    return normalizeString(args.currentDisplayModelId);
  }
  if (!hasAcpProviderScopedModelOptions(args.modelOptions)) {
    return args.modelOptions.some((entry) => entry.id === modelId)
      ? modelId
      : normalizeString(args.currentDisplayModelId);
  }
  const modelIdIsFullProviderModel = !!parseAcpProviderModelId(modelId);
  if (
    (!requestedProvider || modelIdIsFullProviderModel) &&
    args.modelOptions.some((entry) => entry.id === modelId)
  ) {
    return modelId;
  }
  const provider = resolveAcpModelProviderForSelection({
    modelOptions: args.modelOptions,
    provider: args.provider,
    displayModelId: modelId,
    currentDisplayModelId: args.currentDisplayModelId,
  });
  if (provider === ACP_UNSCOPED_MODEL_PROVIDER) {
    const directUnscoped = args.modelOptions.some(
      (entry) => entry.id === modelId && !parseAcpProviderModelId(entry.id),
    );
    if (directUnscoped) {
      return modelId;
    }
    return (
      args.modelOptions.find((entry) => !parseAcpProviderModelId(entry.id))
        ?.id || normalizeString(args.currentDisplayModelId)
    );
  }
  const match = args.modelOptions.find((entry) => {
    const parsed = parseAcpProviderModelId(entry.id);
    return parsed?.provider === provider && parsed.model === modelId;
  });
  if (match) {
    return match.id;
  }
  return (
    args.modelOptions.find(
      (entry) => parseAcpProviderModelId(entry.id)?.provider === provider,
    )?.id || normalizeString(args.currentDisplayModelId)
  );
}

export function projectAcpProviderModelOptionsForUi(args: {
  modelOptions: AcpSelectableOption[];
  options: Record<string, unknown>;
  currentDisplayModelId?: unknown;
}) {
  const next: Record<string, unknown> = { ...args.options };
  if (!hasAcpProviderScopedModelOptions(args.modelOptions)) {
    delete next.acpModelProvider;
    return next;
  }
  const fullModelId = resolveAcpDisplayModelIdForProviderSelection({
    modelOptions: args.modelOptions,
    provider: next.acpModelProvider,
    modelId: next.acpModelId,
    currentDisplayModelId: args.currentDisplayModelId,
  });
  const provider = resolveAcpModelProviderForSelection({
    modelOptions: args.modelOptions,
    provider: next.acpModelProvider,
    displayModelId: fullModelId || next.acpModelId,
    currentDisplayModelId: args.currentDisplayModelId,
  });
  if (provider) {
    next.acpModelProvider = provider;
  }
  if (fullModelId) {
    next.acpModelId =
      provider === ACP_UNSCOPED_MODEL_PROVIDER
        ? fullModelId
        : modelForDisplayModelId(fullModelId);
  }
  return next;
}

export function normalizeAcpProviderModelOptionsForRuntime(args: {
  modelOptions: AcpSelectableOption[];
  options: Record<string, unknown>;
  currentDisplayModelId?: unknown;
}) {
  const next: Record<string, unknown> = { ...args.options };
  if (!hasAcpProviderScopedModelOptions(args.modelOptions)) {
    delete next.acpModelProvider;
    return next;
  }
  const fullModelId = resolveAcpDisplayModelIdForProviderSelection({
    modelOptions: args.modelOptions,
    provider: next.acpModelProvider,
    modelId: next.acpModelId,
    currentDisplayModelId: args.currentDisplayModelId,
  });
  if (fullModelId) {
    next.acpModelId = fullModelId;
  }
  delete next.acpModelProvider;
  return next;
}

export function normalizeAcpEffortId(value: unknown) {
  return normalizeString(value).toLowerCase().replace(/\s+/g, "-");
}

export function toAcpTitleCase(value: string) {
  return normalizeString(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stripKnownEffortSuffix(value: string, effortId: string) {
  const escaped = effortId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return normalizeString(value)
    .replace(new RegExp(`\\s*@\\s*${escaped}\\s*$`, "i"), "")
    .replace(new RegExp(`\\s*\\(\\s*${escaped}\\s*\\)\\s*$`, "i"), "")
    .replace(new RegExp(`\\s+-\\s+${escaped}\\s*$`, "i"), "")
    .replace(new RegExp(`[-_]${escaped}\\s*$`, "i"), "")
    .replace(new RegExp(`\\s+${escaped}\\s*$`, "i"), "")
    .trim();
}

export function parseAcpEffortFromModelText(value: string) {
  const text = normalizeString(value);
  const atMatch = /^(.*)@([A-Za-z][A-Za-z0-9_-]*)$/.exec(text);
  if (atMatch && atMatch[1].trim() && atMatch[2].trim()) {
    return {
      baseId: atMatch[1].trim(),
      effortId: normalizeAcpEffortId(atMatch[2]),
    };
  }

  const known = ACP_KNOWN_REASONING_EFFORT_ORDER.join("|");
  const bracketMatch = new RegExp(`^(.*)\\(\\s*(${known})\\s*\\)$`, "i").exec(text);
  if (bracketMatch && bracketMatch[1].trim()) {
    return {
      baseId: bracketMatch[1].trim(),
      effortId: normalizeAcpEffortId(bracketMatch[2]),
    };
  }

  const dashMatch = new RegExp(`^(.*)(?:\\s+-\\s+|[-_])(${known})$`, "i").exec(text);
  if (dashMatch && dashMatch[1].trim()) {
    return {
      baseId: dashMatch[1].trim(),
      effortId: normalizeAcpEffortId(dashMatch[2]),
    };
  }

  return null;
}

export function parseAcpModelEffortVariant(
  option: AcpSelectableOption,
): AcpModelEffortVariant | null {
  const parsed =
    parseAcpEffortFromModelText(option.id) ||
    parseAcpEffortFromModelText(option.label);
  if (!parsed) {
    return null;
  }
  const strippedLabel =
    stripKnownEffortSuffix(option.label, parsed.effortId) ||
    stripKnownEffortSuffix(parsed.baseId, parsed.effortId);
  return {
    raw: option,
    baseId: parsed.baseId,
    baseLabel: strippedLabel || parsed.baseId,
    effortId: parsed.effortId,
  };
}

function compareEffortIds(left: string, right: string) {
  const leftIndex = ACP_KNOWN_REASONING_EFFORT_ORDER.indexOf(left);
  const rightIndex = ACP_KNOWN_REASONING_EFFORT_ORDER.indexOf(right);
  if (leftIndex >= 0 || rightIndex >= 0) {
    return (leftIndex >= 0 ? leftIndex : 999) - (rightIndex >= 0 ? rightIndex : 999);
  }
  return left.localeCompare(right);
}

export function buildAcpFoldedModelGroups(modelOptions: AcpSelectableOption[]) {
  const grouped = new Map<string, AcpFoldedModelGroup>();
  for (const option of modelOptions) {
    const parsed = parseAcpModelEffortVariant(option);
    if (!parsed) {
      continue;
    }
    const existing = grouped.get(parsed.baseId);
    if (existing) {
      existing.variants.push(parsed);
    } else {
      grouped.set(parsed.baseId, {
        baseId: parsed.baseId,
        baseLabel: parsed.baseLabel,
        variants: [parsed],
      });
    }
  }

  for (const [baseId, group] of Array.from(grouped.entries())) {
    const uniqueEfforts = new Set(group.variants.map((entry) => entry.effortId));
    if (uniqueEfforts.size <= 1) {
      grouped.delete(baseId);
      continue;
    }
    group.variants = group.variants
      .slice()
      .sort((left, right) => compareEffortIds(left.effortId, right.effortId));
  }
  return grouped;
}

export function normalizeAcpModelOption(raw: AcpModelInfo): AcpSelectableOption {
  return {
    id: normalizeString(raw.modelId),
    label: normalizeString(raw.name || raw.modelId),
    description: normalizeString(raw.description) || undefined,
  };
}

export function foldAcpModelOptions(args: {
  modelOptions: AcpSelectableOption[];
  currentModelId?: string;
}) {
  const rawOptions = args.modelOptions.map((entry) => ({ ...entry }));
  const groups = buildAcpFoldedModelGroups(rawOptions);
  const displayModelOptions: AcpSelectableOption[] = [];
  const emittedGroups = new Set<string>();
  for (const option of rawOptions) {
    const parsed = parseAcpModelEffortVariant(option);
    if (parsed && groups.has(parsed.baseId)) {
      if (!emittedGroups.has(parsed.baseId)) {
        const group = groups.get(parsed.baseId);
        displayModelOptions.push({
          id: parsed.baseId,
          label: group?.baseLabel || parsed.baseLabel || parsed.baseId,
          description: option.description,
        });
        emittedGroups.add(parsed.baseId);
      }
      continue;
    }
    displayModelOptions.push({ ...option });
  }
  const currentRawId = normalizeString(args.currentModelId);
  const currentOption =
    rawOptions.find((entry) => entry.id === currentRawId) ||
    (currentRawId ? { id: currentRawId, label: currentRawId } : undefined);
  const currentParsed = currentOption
    ? parseAcpModelEffortVariant(currentOption)
    : null;
  const activeGroup =
    currentParsed && groups.has(currentParsed.baseId)
      ? groups.get(currentParsed.baseId)
      : null;
  const reasoningEffortOptions = activeGroup
    ? activeGroup.variants.map((entry) => ({
        id: entry.effortId,
        label: toAcpTitleCase(entry.effortId),
        description: entry.raw.description,
      }))
    : [];
  const currentDisplayModel =
    activeGroup
      ? displayModelOptions.find((entry) => entry.id === activeGroup.baseId) || {
          id: activeGroup.baseId,
          label: activeGroup.baseLabel,
        }
      : displayModelOptions.find((entry) => entry.id === currentRawId) ||
        currentOption;
  const currentReasoningEffort =
    reasoningEffortOptions.find((entry) => entry.id === currentParsed?.effortId) ||
    reasoningEffortOptions[0];
  return {
    displayModelOptions,
    reasoningEffortOptions,
    currentDisplayModel,
    currentReasoningEffort,
  };
}

export function resolveAcpRawModelIdForSelection(args: {
  modelOptions: AcpSelectableOption[];
  displayModelId: string;
  effortId?: string;
  currentRawModelId?: string;
}) {
  const displayId = normalizeString(args.displayModelId);
  if (!displayId) {
    return "";
  }
  const groups = buildAcpFoldedModelGroups(args.modelOptions);
  const group = groups.get(displayId);
  if (!group) {
    return args.modelOptions.find((entry) => entry.id === displayId)?.id || displayId;
  }
  const currentOption = args.modelOptions.find(
    (entry) => entry.id === normalizeString(args.currentRawModelId),
  );
  const currentVariant = currentOption
    ? parseAcpModelEffortVariant(currentOption)
    : null;
  const effortId =
    normalizeAcpEffortId(args.effortId) ||
    normalizeAcpEffortId(currentVariant?.effortId);
  const selected =
    group.variants.find((entry) => entry.effortId === effortId) ||
    group.variants.find((entry) => entry.effortId === "default") ||
    group.variants[0];
  return selected?.raw.id || displayId;
}
