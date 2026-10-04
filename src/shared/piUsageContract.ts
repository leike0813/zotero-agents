import type {
  PiAuthVariant,
  PiModelCompat,
  PiModelCost,
  PiModelCostRates,
  PiModelInputLimits,
  PiModelKnowledge,
  PiModelMetadata,
  PiModelSelectionSnapshot,
  PiReasoningLevel,
} from "./piProviderContract";
import { normalizePiModelMetadata } from "./piModelMetadata";

/**
 * Single calculation rule for every Pi cost estimate. A persisted estimate is
 * a historical fact: it is never recalculated against a later rate or a later
 * calculation version.
 */
export const PI_COST_CALCULATION_VERSION = 1;

/**
 * Why an invocation happened. Token and cost accounting never merges these: a
 * Conversation title and an automatic compaction are separate contributions to
 * the same owner.
 */
export type PiInvocationPurpose = "main" | "compaction" | "title";

/**
 * `unknown` is a first-class result. An absent rate or an absent usage fact is
 * not a zero cost, and a missing estimate must never be presented as free.
 */
export type PiCostState = "estimated" | "free" | "unknown";

/** Completeness of measurements reported for one physical provider request. */
export type PiUsageCompleteness = "complete" | "partial" | "unknown";

/** Exact token fields reported by a provider; omitted means unreported, not zero. */
export type PiUsageMeasurement = Readonly<{
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
  cacheWriteTokens?: number;
}>;
export type PiUsageMeasurementField = keyof PiUsageMeasurement;

/** Reads exact reported token fields from durable evidence without filling gaps. */
export function readPiUsageMeasurement(
  value: unknown,
): PiUsageMeasurement | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const source = value as Record<string, unknown>;
  const fields = {
    inputTokens: "inputTokens",
    outputTokens: "outputTokens",
    totalTokens: "totalTokens",
    cachedTokens: "cachedTokens",
    cacheWriteTokens: "cacheWriteTokens",
  } as const;
  const measurement: Partial<Record<keyof typeof fields, number>> = {};
  for (const [field, key] of Object.entries(fields) as Array<
    [keyof typeof fields, (typeof fields)[keyof typeof fields]]
  >) {
    const count = source[key];
    if (count === undefined) continue;
    if (typeof count !== "number" || !Number.isFinite(count) || count < 0)
      return;
    measurement[field] = count;
  }
  return measurement;
}

export type PiUsageTokens = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cacheWrite1h?: number;
  totalTokens: number;
};

/** SDK defaults contain zeros; positive token counts prove a reported measurement. */
export function hasPiReportedUsage(usage: PiUsageTokens): boolean {
  return [
    usage.input,
    usage.output,
    usage.cacheRead,
    usage.cacheWrite,
    usage.totalTokens,
  ].some((value) => Number.isFinite(value) && value > 0);
}

/** USD per million tokens. */
export type PiCostRates = PiModelCostRates;

export type PiCostTier = PiCostRates & { inputTokensAbove: number };

export type PiInvocationCost = {
  estimate: number | null;
  state: PiCostState;
  version: number;
};

const UNKNOWN_COST: PiInvocationCost = {
  estimate: null,
  state: "unknown",
  version: PI_COST_CALCULATION_VERSION,
};

function rate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function readRates(value: unknown): PiCostRates | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const input = rate(source.input);
  const output = rate(source.output);
  const cacheRead = rate(source.cacheRead);
  const cacheWrite = rate(source.cacheWrite);
  return input === null ||
    output === null ||
    cacheRead === null ||
    cacheWrite === null
    ? null
    : { input, output, cacheRead, cacheWrite };
}

function readTiers(value: unknown): PiCostTier[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const tiers: PiCostTier[] = [];
  for (const item of value) {
    const rates = readRates(item);
    const threshold = rate(
      (item as Record<string, unknown> | null)?.inputTokensAbove,
    );
    if (!rates || threshold === null) return null;
    tiers.push({ ...rates, inputTokensAbove: threshold });
  }
  return tiers;
}

/**
 * The declared price in the same flat shape the catalog and the selection
 * snapshot use. A complete declaration becomes usable pricing; a partial one
 * stays unknown, and `null` stays unknown rather than becoming a zero price.
 */
export function readPiFrozenPricing(value: unknown): PiModelCost | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const rates = readRates(source);
  const tiers = readTiers(source.tiers);
  return rates && tiers
    ? { ...rates, ...(tiers.length ? { tiers } : {}) }
    : null;
}

/**
 * The highest tier whose threshold the whole request reached applies to the
 * entire request; tiers are never split per token category.
 */
function applicableRates(
  pricing: PiModelCost,
  inputTokens: number,
): PiCostRates {
  let threshold = -1;
  let selected: PiCostRates = {
    input: pricing.input,
    output: pricing.output,
    cacheRead: pricing.cacheRead,
    cacheWrite: pricing.cacheWrite,
  };
  for (const tier of pricing.tiers ?? []) {
    if (tier.inputTokensAbove >= inputTokens) continue;
    if (tier.inputTokensAbove > threshold) {
      threshold = tier.inputTokensAbove;
      selected = tier;
    }
  }
  return selected;
}

/**
 * The one cost calculation. Unknown usage or absent rates stay unknown, so no
 * caller can publish a complete total that silently treats unknown work as
 * free.
 */
export function estimatePiInvocationCost(input: {
  tokens: PiUsageTokens;
  pricing: PiModelCost | null | undefined;
  usageKnown: boolean;
}): PiInvocationCost {
  if (!input.usageKnown || !input.pricing) return UNKNOWN_COST;
  const tokens = input.tokens;
  if (
    ![tokens.input, tokens.output, tokens.cacheRead, tokens.cacheWrite].every(
      (value) => Number.isFinite(value) && value >= 0,
    )
  )
    return UNKNOWN_COST;
  const longWrite = tokens.cacheWrite1h ?? 0;
  if (
    !Number.isFinite(longWrite) ||
    longWrite < 0 ||
    longWrite > tokens.cacheWrite
  )
    return UNKNOWN_COST;
  const rates = applicableRates(
    input.pricing,
    tokens.input + tokens.cacheRead + tokens.cacheWrite,
  );
  const estimate =
    (tokens.input * rates.input +
      tokens.output * rates.output +
      tokens.cacheRead * rates.cacheRead +
      (tokens.cacheWrite - longWrite) * rates.cacheWrite +
      longWrite * rates.input * 2) /
    1_000_000;
  const free =
    rates.input === 0 &&
    rates.output === 0 &&
    rates.cacheRead === 0 &&
    rates.cacheWrite === 0;
  return {
    estimate,
    state: free ? "free" : "estimated",
    version: PI_COST_CALCULATION_VERSION,
  };
}

/**
 * Safe provenance: which source version a fact came from, never the source
 * object, payload or endpoint that produced it.
 */
export type PiSafeProvenance = {
  source: string;
  revision: string;
  schemaVersion: number;
  minimumPiVersion?: string;
};

export type PiSafeModelMetadata = {
  availability?: string;
  knowledge?: Partial<
    Record<
      "context" | "output" | "input" | "tools" | "reasoning",
      PiModelKnowledge
    >
  >;
  thinkingLevelMap?: PiModelMetadata["thinkingLevelMap"];
  /** Per-million rates and tiers, kept verbatim in the declared flat shape. */
  cost?: PiModelCost;
  inputLimits?: PiModelInputLimits;
  compat?: PiModelCompat;
  promptCache?: { short?: number; long?: number };
  samplingParams?: Record<string, number>;
  authVariants?: readonly PiAuthVariant[];
  provenance?: PiSafeProvenance;
};

export type PiCanonicalSelection = Readonly<{
  /** Safe reference to the frozen binding; never a credential or endpoint. */
  selectionId?: string;
  bindingRevision?: number;
  configurationId: string;
  provider: string;
  modelId: string;
  api: string;
  reasoning: PiReasoningLevel;
  authVariant: PiAuthVariant;
  catalogRevision: string;
  adapterVersion: string;
  runtimeVersion: string;
  policy: Readonly<{
    contextWindow: number;
    maxTokens: number;
    input: readonly string[];
    supportsTools: boolean;
  }>;
  metadata?: PiSafeModelMetadata;
}>;

const MAX_SAFE_TEXT = 512;

function safeText(value: unknown): string | undefined {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_SAFE_TEXT
    ? value
    : undefined;
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function safeProvenance(value: unknown): PiSafeProvenance | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const source = value as Record<string, unknown>;
  const kind = safeText(source.source);
  const revision = safeText(source.revision);
  const schemaVersion = safeNumber(source.schemaVersion);
  if (
    !kind ||
    !["official", "overlay", "discovered", "retained"].includes(kind) ||
    !revision ||
    schemaVersion === undefined
  )
    return undefined;
  const minimum = safeText(source.minimumPiVersion);
  return {
    source: kind,
    revision,
    schemaVersion,
    ...(minimum ? { minimumPiVersion: minimum } : {}),
  };
}

function safeKnowledge(value: unknown): PiSafeModelMetadata["knowledge"] {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const source = value as Record<string, unknown>;
  const result: NonNullable<PiSafeModelMetadata["knowledge"]> = {};
  for (const key of [
    "context",
    "output",
    "input",
    "tools",
    "reasoning",
  ] as const) {
    const entry = source[key];
    if (entry === "known" || entry === "unsupported" || entry === "unknown")
      result[key] = entry;
  }
  return Object.keys(result).length ? result : undefined;
}

function safeAuthVariants(
  value: unknown,
): readonly PiAuthVariant[] | undefined {
  if (!Array.isArray(value) || !value.length || value.length > 8)
    return undefined;
  const variants: PiAuthVariant[] = [];
  for (const item of value) {
    if (
      item !== "none" &&
      item !== "api-key" &&
      item !== "chatgpt" &&
      item !== "openai-codex"
    )
      return undefined;
    if (!variants.includes(item)) variants.push(item);
  }
  return variants;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return Object.freeze(value);
}

/**
 * Canonical safe selection evidence, written once per turn. The endpoint and
 * the credential stay in the binding, the SDK objects and the whole directory
 * stay in the catalog, and nothing here is re-derivable from a later catalog
 * revision.
 */
export function projectPiCanonicalSelection(
  snapshot: PiModelSelectionSnapshot,
): PiCanonicalSelection {
  const canonical = readPiCanonicalSelection(snapshot);
  if (!canonical) throw new Error("pi_selection_incomplete");
  return canonical;
}

/**
 * The declared, project-understood facts of a selection.
 *
 * Object-valued fields are never cast through: they go through the catalog
 * normalizer, which is the single allowlist this project has for them, so an
 * untrusted canonical record cannot smuggle an unknown nested value (an
 * endpoint, a secret-bearing path) across the safe boundary. Only the enum and
 * bounded-scalar facts this module owns — knowledge, provenance, auth variants
 * — are projected here.
 */
function safeMetadata(value: unknown): PiSafeModelMetadata | null | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const source = value as Record<string, unknown>;
  const knowledge = safeKnowledge(source.knowledge);
  const authVariants = safeAuthVariants(source.authVariants);
  const provenance = safeProvenance(source.provenance);
  const availability = [
    "available",
    "unsupported",
    "retired",
    "missing",
  ].includes(String(source.availability))
    ? String(source.availability)
    : undefined;
  let declared: PiModelMetadata;
  try {
    declared = normalizePiModelMetadata(source);
  } catch {
    // A declared value this project does not understand is not a fact. It is
    // refused rather than filtered by shape, so the canonical record can only
    // ever hold normalized, project-known metadata.
    return null;
  }
  const result: PiSafeModelMetadata = {
    ...(declared.availability || availability
      ? { availability: declared.availability || availability! }
      : {}),
    ...(knowledge ? { knowledge } : {}),
    ...(declared.thinkingLevelMap
      ? { thinkingLevelMap: declared.thinkingLevelMap }
      : {}),
    ...(declared.cost ? { cost: declared.cost } : {}),
    ...(declared.inputLimits ? { inputLimits: declared.inputLimits } : {}),
    ...(declared.compat ? { compat: declared.compat } : {}),
    ...(declared.promptCache ? { promptCache: declared.promptCache } : {}),
    ...(declared.samplingParams
      ? { samplingParams: declared.samplingParams }
      : {}),
    ...(authVariants ? { authVariants } : {}),
    ...(provenance ? { provenance } : {}),
  };
  return Object.keys(result).length ? result : undefined;
}

/**
 * The single reader of canonical selection evidence. Every boundary that
 * accepts selection facts from storage goes through here, so a persisted fact
 * can never reintroduce an endpoint, a credential or a whole directory.
 */
export function readPiCanonicalSelection(
  value: unknown,
): PiCanonicalSelection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const configurationId = safeText(source.configurationId);
  const provider = safeText(source.provider);
  const modelId = safeText(source.modelId);
  const api = safeText(source.api);
  const authVariant = source.authVariant;
  const policy = source.policy;
  if (
    !configurationId ||
    !provider ||
    !modelId ||
    !api ||
    !["none", "api-key", "chatgpt", "openai-codex"].includes(
      String(authVariant),
    ) ||
    !policy ||
    typeof policy !== "object" ||
    Array.isArray(policy)
  )
    return null;
  const contextWindow = safeNumber(
    (policy as Record<string, unknown>).contextWindow,
  );
  const maxTokens = safeNumber((policy as Record<string, unknown>).maxTokens);
  const modalities = (policy as Record<string, unknown>).input;
  if (
    contextWindow === undefined ||
    maxTokens === undefined ||
    !Array.isArray(modalities) ||
    !modalities.every((item) => safeText(item))
  )
    return null;
  const reasoning = source.reasoning;
  if (!safeText(reasoning)) return null;
  const selectionId = safeText(source.selectionId);
  const bindingRevision = safeNumber(source.bindingRevision);
  const catalogRevision = safeText(source.catalogRevision);
  const adapterVersion = safeText(source.adapterVersion);
  const runtimeVersion = safeText(source.runtimeVersion);
  if (!catalogRevision || !adapterVersion || !runtimeVersion) return null;
  const metadata = safeMetadata(source.metadata);
  // Refused metadata means the record holds a value this project does not
  // understand; the selection is not safe to keep at all.
  if (metadata === null) return null;
  return deepFreeze({
    ...(selectionId ? { selectionId } : {}),
    ...(bindingRevision !== undefined ? { bindingRevision } : {}),
    configurationId,
    provider,
    modelId,
    api,
    reasoning: reasoning as PiReasoningLevel,
    authVariant: authVariant as PiAuthVariant,
    catalogRevision,
    adapterVersion,
    runtimeVersion,
    policy: {
      contextWindow,
      maxTokens,
      input: modalities.map((item) => String(item)),
      supportsTools: (policy as Record<string, unknown>).supportsTools === true,
    },
    ...(metadata ? { metadata } : {}),
  });
}

/**
 * The pricing a frozen selection actually applies. A custom or subscription
 * target never inherits public API pricing from a model identity alone.
 */
export function piCanonicalPricing(
  selection: PiCanonicalSelection | undefined,
): PiModelCost | null {
  return selection?.metadata?.cost
    ? readPiFrozenPricing(selection.metadata.cost)
    : null;
}

/** One persisted contribution to an owner's usage and cost aggregates. */
export type PiInvocationUsageEvidence = Readonly<{
  purpose: PiInvocationPurpose;
  /** Deduplication identity; absent only for legacy facts. */
  invocationId?: string;
  usageKnown: boolean;
  /** Older evidence has no completeness fact and remains unknown at projection. */
  completeness?: PiUsageCompleteness;
  /** Field-level provider measurements; an omitted key was not reported. */
  measurement?: PiUsageMeasurement;
  usage: PiUsageTokens;
  cost: PiInvocationCost;
}>;

/**
 * Aggregate cost that keeps its own incompleteness: a single unknown
 * contribution makes the total unknown rather than a smaller complete sum.
 */
export function aggregatePiInvocationCosts(
  contributions: readonly PiInvocationCost[],
): { total: number | null; unknownContributions: number } {
  let total = 0;
  let unknownContributions = 0;
  for (const cost of contributions) {
    if (cost.estimate === null) unknownContributions += 1;
    else total += cost.estimate;
  }
  return {
    total: unknownContributions ? null : total,
    unknownContributions,
  };
}

/**
 * Per-purpose totals. One aggregation feeds every owner view, so a
 * Conversation and a Skill Run can never disagree about the same fact.
 */
export type PiPurposeUsageTotals = Record<
  PiInvocationPurpose,
  PiUsageTokens & {
    cost: number;
    costUnknown: number;
    measurement: PiUsageMeasurement;
    unreported: Partial<Record<PiUsageMeasurementField, number>>;
    invocations: number;
    completeness: PiUsageCompleteness;
    /** Displayable scalar subtotal, including trusted legacy SDK totals. */
    visibleTotalTokens: number;
    /** Calls without a trustworthy total; the subtotal must not look final. */
    unknownTotalInvocations: number;
  }
>;

export type PiUsageDisplaySummary = {
  hasInvocations: boolean;
  knownSubtotal: number;
  unknownInvocations: number;
};

export type PiUsageOwnerDisplaySummary = {
  main: PiUsageDisplaySummary;
  compaction: PiUsageDisplaySummary;
  title: PiUsageDisplaySummary;
  owner: PiUsageDisplaySummary;
};

/** One source for the known subtotal/unknown-total policy used by both owners. */
export function summarizePiUsageForDisplay(
  totals: PiPurposeUsageTotals | undefined,
  options: { includeTitle?: boolean; legacyUnknown?: boolean } = {},
): PiUsageOwnerDisplaySummary {
  const purposeSummary = (
    purpose: PiInvocationPurpose,
  ): PiUsageDisplaySummary => {
    const contribution = totals?.[purpose];
    if (
      !contribution ||
      (options.legacyUnknown && contribution.invocations === 0)
    ) {
      return options.legacyUnknown
        ? { hasInvocations: true, knownSubtotal: 0, unknownInvocations: 1 }
        : { hasInvocations: false, knownSubtotal: 0, unknownInvocations: 0 };
    }
    return {
      hasInvocations: contribution.invocations > 0,
      knownSubtotal: contribution.visibleTotalTokens,
      unknownInvocations: contribution.unknownTotalInvocations,
    };
  };
  const main = purposeSummary("main");
  const compaction = purposeSummary("compaction");
  const title = purposeSummary("title");
  const ownerPurposes = options.includeTitle
    ? [main, compaction, title]
    : [main, compaction];
  return {
    main,
    compaction,
    title,
    owner: {
      hasInvocations: ownerPurposes.some((purpose) => purpose.hasInvocations),
      knownSubtotal: ownerPurposes.reduce(
        (sum, purpose) => sum + purpose.knownSubtotal,
        0,
      ),
      unknownInvocations: ownerPurposes.reduce(
        (sum, purpose) => sum + purpose.unknownInvocations,
        0,
      ),
    },
  };
}

const USAGE_MEASUREMENT_FIELDS: readonly PiUsageMeasurementField[] = [
  "inputTokens",
  "outputTokens",
  "totalTokens",
  "cachedTokens",
  "cacheWriteTokens",
];

/** Adds one canonical invocation without turning omitted fields into zero. */
export function addPiUsageMeasurement(
  purpose: PiPurposeUsageTotals[PiInvocationPurpose],
  measurement: PiUsageMeasurement | undefined,
  completeness: PiUsageCompleteness,
  usageKnown: boolean,
  legacyTotalTokens?: number,
): void {
  let measured = false;
  const measuredFields = { ...purpose.measurement };
  const unreported = { ...purpose.unreported };
  for (const field of USAGE_MEASUREMENT_FIELDS) {
    const value = measurement?.[field];
    if (value === undefined) {
      unreported[field] = (unreported[field] || 0) + 1;
      continue;
    }
    measured = true;
    measuredFields[field] = (measuredFields[field] || 0) + value;
  }
  const priorInvocations = purpose.invocations;
  purpose.invocations += 1;
  purpose.measurement = measuredFields;
  purpose.unreported = unreported;
  if (measurement?.totalTokens !== undefined) {
    purpose.visibleTotalTokens += measurement.totalTokens;
  } else if (
    measurement === undefined &&
    usageKnown &&
    typeof legacyTotalTokens === "number" &&
    Number.isFinite(legacyTotalTokens) &&
    legacyTotalTokens >= 0
  ) {
    // Older trusted SDK sources expose only canonical scalar usage. Preserve
    // that display contract while keeping the exact measurement absent.
    purpose.visibleTotalTokens += legacyTotalTokens;
  } else {
    purpose.unknownTotalInvocations += 1;
  }
  if (priorInvocations === 0) {
    purpose.completeness =
      !measured || !usageKnown || completeness === "unknown"
        ? "unknown"
        : completeness === "complete"
          ? "complete"
          : "partial";
  } else if (
    purpose.completeness !== "complete" ||
    !measured ||
    !usageKnown ||
    completeness !== "complete"
  ) {
    purpose.completeness =
      Object.keys(measuredFields).length === 0 ? "unknown" : "partial";
  }
}

export function emptyPiPurposeUsageTotals(): PiPurposeUsageTotals {
  const empty = () => ({
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: 0,
    costUnknown: 0,
    measurement: {},
    unreported: {},
    invocations: 0,
    completeness: "unknown" as const,
    visibleTotalTokens: 0,
    unknownTotalInvocations: 0,
  });
  return { main: empty(), compaction: empty(), title: empty() };
}

/**
 * The bounded safe usage view a Skill Run owner publishes: purpose totals and
 * cost completeness only, never a transcript or a re-derived rate.
 */
export type PiSkillRunUsageView = {
  main: number;
  compaction: number;
  cost: number;
  compactionCost: number;
  costUnknown: number;
  purposeTotals: PiPurposeUsageTotals;
};

export function piSkillRunUsageView(
  totals: PiPurposeUsageTotals,
): PiSkillRunUsageView {
  return {
    main: totals.main.totalTokens,
    compaction: totals.compaction.totalTokens,
    cost: totals.main.cost,
    compactionCost: totals.compaction.cost,
    costUnknown: totals.main.costUnknown + totals.compaction.costUnknown,
    purposeTotals: totals,
  };
}
