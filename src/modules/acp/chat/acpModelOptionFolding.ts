import type { AcpModelInfo } from "../../acpProtocol";

export type AcpSelectableOption = {
  id: string;
  label: string;
  description?: string;
  providerId?: string;
  providerLabel?: string;
  modelIdentifier?: string;
};

export const ACP_UNSCOPED_MODEL_PROVIDER = "Unscoped";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

const structuredModelValue = /^m:([^:]+):([^:]+):(?:u|v:([^:]*))$/;

function decodeModelSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseAcpProviderModelId(
  value: unknown,
  metadata?: { providerId?: string | null; modelIdentifier?: string | null },
) {
  const id = normalizeString(value);
  const structured = structuredModelValue.exec(id);
  const slash = id.indexOf("/");
  const provider =
    normalizeString(metadata?.providerId) ||
    (structured
      ? decodeModelSegment(structured[1])
      : slash > 0
        ? id.slice(0, slash)
        : "");
  if (!provider) return null;
  const model =
    normalizeString(metadata?.modelIdentifier) ||
    (structured
      ? decodeModelSegment(structured[2])
      : slash > 0 && id.slice(0, slash) === provider
        ? id.slice(slash + 1)
        : id);
  return model ? { provider, model } : null;
}

function providerForOption(option: AcpSelectableOption) {
  return (
    parseAcpProviderModelId(option.id, option)?.provider ||
    ACP_UNSCOPED_MODEL_PROVIDER
  );
}

export function hasAcpProviderScopedModelOptions(
  modelOptions: AcpSelectableOption[],
) {
  return modelOptions.some(
    (entry) => !!parseAcpProviderModelId(entry.id, entry),
  );
}

export function listAcpModelProviderOptions(
  modelOptions: AcpSelectableOption[],
) {
  return hasAcpProviderScopedModelOptions(modelOptions)
    ? [...new Set(modelOptions.map(providerForOption))]
    : [];
}

export function resolveAcpModelProviderForSelection(args: {
  modelOptions: AcpSelectableOption[];
  provider?: unknown;
  displayModelId?: unknown;
  currentDisplayModelId?: unknown;
}) {
  const explicit = normalizeString(args.provider);
  if (explicit) return explicit;
  const modelId =
    normalizeString(args.displayModelId) ||
    normalizeString(args.currentDisplayModelId);
  const selected = args.modelOptions.find((entry) => entry.id === modelId);
  return selected ? providerForOption(selected) : "";
}

export function listAcpModelOptionsForProvider(args: {
  modelOptions: AcpSelectableOption[];
  provider?: unknown;
  displayModelId?: unknown;
  currentDisplayModelId?: unknown;
}) {
  const provider = resolveAcpModelProviderForSelection(args);
  return args.modelOptions
    .filter((entry) => !provider || providerForOption(entry) === provider)
    .map((entry) => entry.id);
}

export function resolveAcpDisplayModelIdForProviderSelection(args: {
  modelOptions: AcpSelectableOption[];
  provider?: unknown;
  modelId?: unknown;
  currentDisplayModelId?: unknown;
}) {
  const modelId = normalizeString(args.modelId);
  const provider = normalizeString(args.provider);
  const target =
    modelId || (!provider ? normalizeString(args.currentDisplayModelId) : "");
  return (
    args.modelOptions.find(
      (entry) =>
        entry.id === target &&
        (!provider || providerForOption(entry) === provider),
    )?.id || ""
  );
}

export function projectAcpProviderModelOptionsForUi(args: {
  modelOptions: AcpSelectableOption[];
  options: Record<string, unknown>;
  currentDisplayModelId?: unknown;
}) {
  const next = { ...args.options };
  const modelId = normalizeString(next.acpModelId);
  if (!normalizeString(next.acpModelProvider) && modelId) {
    const selected = args.modelOptions.find((entry) => entry.id === modelId);
    if (selected && hasAcpProviderScopedModelOptions(args.modelOptions)) {
      next.acpModelProvider = providerForOption(selected);
    }
  }
  return next;
}

export function normalizeAcpProviderModelOptionsForRuntime(args: {
  modelOptions: AcpSelectableOption[];
  options: Record<string, unknown>;
  currentDisplayModelId?: unknown;
}) {
  const next = { ...args.options };
  delete next.acpModelProvider;
  return next;
}

export function normalizeAcpEffortId(value: unknown) {
  return normalizeString(value);
}

export function normalizeAcpModelOption(
  raw: AcpModelInfo,
): AcpSelectableOption {
  const id = normalizeString(raw.modelId);
  const parsed = parseAcpProviderModelId(id, raw);
  const providerId = normalizeString(raw.providerId) || parsed?.provider;
  const providerLabel = normalizeString(raw.providerLabel) || providerId;
  const modelIdentifier = normalizeString(raw.modelIdentifier) || parsed?.model;
  return {
    id,
    label: normalizeString(raw.name) || id,
    description: normalizeString(raw.description) || undefined,
    ...(providerId ? { providerId } : {}),
    ...(providerLabel ? { providerLabel } : {}),
    ...(modelIdentifier ? { modelIdentifier } : {}),
  };
}
