import {
  hashCanonicalJson,
  readProjectionRegistryState,
  recordProjectionRebuild,
  resolveSynthesisPersistenceRoot,
  SynthesisSchemaRegistry,
  writeCanonicalTransaction,
  writeCanonicalDiagnostic,
  type CanonicalTransactionReceipt,
  type ProjectionState,
} from "./foundation";
import {
  createSynthesisRepository,
  type SynthesisRepository,
  type SynthesisTagAbbrevRecord,
  type SynthesisTagAliasRecord,
  type SynthesisTagProtocolRecord,
  type SynthesisTagStagedSuggestionRecord,
  type SynthesisTagValidationWarningRecord,
  type SynthesisTagVocabularyEntryRecord,
} from "./repository";
import type {
  SynthesisHostItemRef,
  SynthesisStagedTagUpdateRequest,
  SynthesisTagVocabularyEntryDeleteRequest,
  SynthesisTagVocabularyEntryUpdateRequest,
} from "../../../packages/synthesis-contracts/src/index";
import {
  rebuildSynthesisHostItemRef,
  rebuildSynthesisHostItemRefs,
  synthesisHostItemRefKey,
} from "../../../packages/synthesis-contracts/src/index";
import {
  SYNTHESIS_TAG_VOCABULARY_INDEX_SCHEMA_VERSION,
  createInProcessSynthesisTagVocabularyEngine,
  type SynthesisTagVocabularyEngine,
} from "../../../packages/synthesis-engine/src/tagVocabulary";
import {
  buildSynthesisTagVocabularyIndexWithEngine,
  validateSynthesisTagVocabularyWithEngine,
} from "./tagVocabularyEngineAdapter";
import {
  hasInitializedBuiltinTagPolicy,
  isBuiltinStatusTag,
  protectBuiltinStatusProtocol,
  protectBuiltinTagVocabularyEntries,
} from "./builtinTagPolicy";

export const SYNTHESIS_TAG_INDEX_TARGET = "tag-index";
export const SYNTHESIS_TAG_VOCABULARY_SCHEMA_ID = "synthesis.tag_vocabulary";
export const SYNTHESIS_TAG_ALIASES_SCHEMA_ID = "synthesis.tag_aliases";
export const SYNTHESIS_TAG_ABBREV_SCHEMA_ID = "synthesis.tag_abbrev";
export const SYNTHESIS_TAG_PROTOCOL_SCHEMA_ID = "synthesis.tag_protocol";
export const SYNTHESIS_TAG_MANIFEST_SCHEMA_ID = "synthesis.tag_manifest";
export const SYNTHESIS_TAG_INDEX_SCHEMA_VERSION =
  SYNTHESIS_TAG_VOCABULARY_INDEX_SCHEMA_VERSION;
export const TAGVOCAB_PROTOCOL_VERSION = "1.0.0";
export const TAGVOCAB_TAG_PATTERN_SOURCE = "^[a-z_]+:[a-zA-Z0-9/_.-]+$";
export const TAGVOCAB_MAX_TAG_LENGTH = 120;

export const SYNTHESIS_TAG_FACETS = [
  "field",
  "topic",
  "method",
  "model",
  "ai_task",
  "data",
  "tool",
  "status",
] as const;

export type SynthesisTagFacet = (typeof SYNTHESIS_TAG_FACETS)[number];

export type SynthesisTagVocabularyEntry = {
  tag: string;
  facet: SynthesisTagFacet | string;
  note?: string;
  source?: string;
  deprecated?: boolean;
  replacement?: string;
  aliases?: string[];
  abbrev?: string[];
  usage_count?: number;
  last_synced_at?: string;
};

export type SynthesisTagAliasesAsset = {
  aliases: Record<string, string>;
};

export type SynthesisTagAbbrevAsset = {
  abbrevs?: Record<string, string>;
  abbrev?: Record<string, string>;
};

export type SynthesisTagProtocolAsset = {
  version?: string;
  tag_pattern: string;
  max_tag_length: number;
  facets: string[];
};

type IndexRebuildOptions = {
  yieldControl?: () => Promise<void>;
  reportProgress?: (progress: {
    phase: string;
    phaseLabel: string;
    processedCount: number;
    totalCount: number;
    message?: string;
  }) => void | Promise<void>;
};

export type SynthesisTagManifestAsset = {
  manifest_hash: string;
  entry_count: number;
  tag_count?: number;
  active_count: number;
  updated_at: string;
  source_protocol_version?: string;
  projection_target: typeof SYNTHESIS_TAG_INDEX_TARGET;
};

export type SynthesisTagVocabularyAsset = {
  version?: string;
  updated_at?: string;
  facets?: string[];
  tags?: SynthesisTagVocabularyEntry[];
  entries?: SynthesisTagVocabularyEntry[];
  abbrevs?: Record<string, string>;
  tag_count?: number;
};

export type SynthesisTagValidationWarning = {
  code: string;
  severity: "warning" | "error";
  tag?: string;
  message: string;
};

export type SynthesisTagImportConflict = {
  tag: string;
  local: SynthesisTagVocabularyEntry;
  imported: SynthesisTagVocabularyEntry;
};

export type SynthesisTagImportPreview = {
  action: "preview";
  builtins: SynthesisTagImportConflict[];
  additions: SynthesisTagVocabularyEntry[];
  unchanged: SynthesisTagVocabularyEntry[];
  conflicts: SynthesisTagImportConflict[];
  warnings: SynthesisTagValidationWarning[];
};

export type SynthesisTagImportAction =
  | "keep-local"
  | "use-imported"
  | "merge-non-conflicting";

export type SynthesisTagIndexProjection = {
  schema_id: "synthesis.tag_index_projection";
  schema_version: string;
  source_manifest_hash: string;
  rebuilt_at: string;
  tags: string[];
  aliases: Record<string, string>;
  abbrev: Record<string, string>;
  search: Array<{
    tag: string;
    normalized: string;
    facet: string;
    aliases: string[];
    abbrev: string[];
  }>;
  validation_warnings: SynthesisTagValidationWarning[];
};

export type SynthesisTagVocabularySnapshot = {
  entries: SynthesisTagVocabularyEntry[];
  aliases: Record<string, string>;
  abbrev: Record<string, string>;
  protocol: SynthesisTagProtocolAsset;
  manifest: SynthesisTagManifestAsset;
  validation_warnings: SynthesisTagValidationWarning[];
  projection?: ProjectionState;
  import_preview?: SynthesisTagImportPreview;
};

export type SynthesisTagStagedSuggestion = {
  tag: string;
  facet: string;
  note?: string;
  source_flow?: string;
  parent_bindings?: SynthesisHostItemRef[];
  created_at?: string;
  updated_at?: string;
};

type ServiceOptions = {
  root: string;
  now?: () => string;
  repository?: SynthesisRepository;
  engine?: SynthesisTagVocabularyEngine;
};

const DEFAULT_PROTOCOL: SynthesisTagProtocolAsset = {
  version: TAGVOCAB_PROTOCOL_VERSION,
  tag_pattern: TAGVOCAB_TAG_PATTERN_SOURCE,
  max_tag_length: TAGVOCAB_MAX_TAG_LENGTH,
  facets: [...SYNTHESIS_TAG_FACETS],
};

type NormalizedVocabularyPayload = {
  entries: SynthesisTagVocabularyEntry[];
  abbrev: Record<string, string>;
  protocol?: SynthesisTagProtocolAsset;
  version?: string;
  updatedAt?: string;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeStringList(values: unknown) {
  return Array.from(
    new Set(
      Array.isArray(values)
        ? values.map((entry) => cleanString(entry)).filter(Boolean)
        : [],
    ),
  ).sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" }),
  );
}

function facetFromTag(tag: string) {
  return tag.includes(":") ? tag.split(":")[0] : "";
}

function normalizeFacet(value: unknown, tag: string) {
  const facet = cleanString(value) || facetFromTag(tag);
  return facet;
}

function normalizeTagEntry(input: unknown): SynthesisTagVocabularyEntry | null {
  if (typeof input === "string") {
    const tag = cleanString(input);
    return tag ? { tag, facet: facetFromTag(tag), source: "import" } : null;
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const row = input as Record<string, unknown>;
  const tag = cleanString(row.tag);
  if (!tag) {
    return null;
  }
  const usage = Number(row.usage_count ?? row.usageCount ?? 0);
  return {
    tag,
    facet: normalizeFacet(row.facet, tag),
    note: cleanString(row.note) || undefined,
    source: cleanString(row.source) || undefined,
    deprecated: Boolean(row.deprecated),
    replacement:
      cleanString(row.replacement || row.replaced_by || row.replacedBy) ||
      undefined,
    aliases: normalizeStringList(row.aliases),
    abbrev: normalizeStringList(row.abbrev || row.abbreviations),
    usage_count: Number.isFinite(usage) ? Math.max(0, Math.floor(usage)) : 0,
    last_synced_at:
      cleanString(row.last_synced_at || row.lastSyncedAt) || undefined,
  };
}

function serializeTagEntry(
  entry: SynthesisTagVocabularyEntry,
): SynthesisTagVocabularyEntry {
  const serialized: SynthesisTagVocabularyEntry = {
    tag: cleanString(entry.tag),
    facet: normalizeFacet(entry.facet, entry.tag),
  };
  const source = cleanString(entry.source);
  const note = cleanString(entry.note);
  if (source) {
    serialized.source = source;
  }
  if (note) {
    serialized.note = note;
  }
  if (entry.deprecated) {
    serialized.deprecated = true;
  }
  return serialized;
}

function sortEntries(entries: SynthesisTagVocabularyEntry[]) {
  return [...entries].sort(
    (left, right) =>
      cleanString(left.facet).localeCompare(cleanString(right.facet)) ||
      left.tag.localeCompare(right.tag, "en", { sensitivity: "base" }),
  );
}

function dedupeEntries(entries: SynthesisTagVocabularyEntry[]) {
  const byTag = new Map<string, SynthesisTagVocabularyEntry>();
  for (const entry of entries) {
    const tag = cleanString(entry.tag);
    if (!tag || byTag.has(tag)) {
      continue;
    }
    byTag.set(tag, {
      ...entry,
      tag,
      facet: normalizeFacet(entry.facet, tag),
      aliases: normalizeStringList(entry.aliases),
      abbrev: normalizeStringList(entry.abbrev),
      usage_count: Math.max(0, Math.floor(Number(entry.usage_count || 0))),
    });
  }
  return sortEntries(Array.from(byTag.values()));
}

function normalizeAbbrevRegistry(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [
        cleanString(key).toLowerCase(),
        cleanString(entry),
      ])
      .filter(([key, entry]) => key && entry)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizeVocabularyPayload(
  input: unknown,
): NormalizedVocabularyPayload {
  const row =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const entries: unknown[] = Array.isArray(input)
    ? input
    : Array.isArray(row.tags)
      ? row.tags
      : Array.isArray(row.entries)
        ? row.entries
        : [];
  const facets = normalizeStringList(row.facets);
  const protocolInput =
    row.protocol && typeof row.protocol === "object"
      ? row.protocol
      : facets.length ||
          cleanString(row.tag_pattern || row.tagPattern) ||
          Number(row.max_tag_length || row.maxTagLength)
        ? {
            version: row.version,
            facets,
            tag_pattern: row.tag_pattern,
            tagPattern: row.tagPattern,
            max_tag_length: row.max_tag_length,
            maxTagLength: row.maxTagLength,
          }
        : undefined;
  return {
    entries: dedupeEntries(
      entries
        .map((entry) => normalizeTagEntry(entry))
        .filter((entry): entry is SynthesisTagVocabularyEntry =>
          Boolean(entry),
        ),
    ),
    abbrev: normalizeAbbrevRegistry(
      row.abbrevs || row.abbrev || row.abbreviations,
    ),
    protocol: protocolInput ? validateProtocolShape(protocolInput) : undefined,
    version: cleanString(row.version) || undefined,
    updatedAt: cleanString(row.updated_at || row.updatedAt) || undefined,
  };
}

function normalizeRecordMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [cleanString(key), cleanString(entry)])
      .filter(([key, entry]) => key && entry)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function validateProtocolShape(input: unknown): SynthesisTagProtocolAsset {
  const row = input && typeof input === "object" ? (input as any) : {};
  const max = Number(
    row.max_tag_length || row.maxTagLength || TAGVOCAB_MAX_TAG_LENGTH,
  );
  const facets = normalizeStringList(row.facets);
  return {
    version: cleanString(row.version) || TAGVOCAB_PROTOCOL_VERSION,
    tag_pattern:
      cleanString(row.tag_pattern || row.tagPattern) ||
      TAGVOCAB_TAG_PATTERN_SOURCE,
    max_tag_length:
      Number.isFinite(max) && max > 0
        ? Math.floor(max)
        : TAGVOCAB_MAX_TAG_LENGTH,
    facets: facets.length ? facets : [...SYNTHESIS_TAG_FACETS],
  };
}

function buildVocabularyAsset(args: {
  entries: SynthesisTagVocabularyEntry[];
  abbrev: Record<string, string>;
  protocol: SynthesisTagProtocolAsset;
  updatedAt: string;
}): SynthesisTagVocabularyAsset {
  return {
    version: cleanString(args.protocol.version) || TAGVOCAB_PROTOCOL_VERSION,
    updated_at: args.updatedAt,
    facets: [...args.protocol.facets],
    tags: args.entries.map((entry) => serializeTagEntry(entry)),
    abbrevs: args.abbrev,
    tag_count: args.entries.length,
  };
}

function buildManifest(args: {
  entries: SynthesisTagVocabularyEntry[];
  aliases: Record<string, string>;
  abbrev: Record<string, string>;
  protocol: SynthesisTagProtocolAsset;
  updatedAt: string;
}): SynthesisTagManifestAsset {
  const active = args.entries.filter((entry) => !entry.deprecated);
  const vocabulary = buildVocabularyAsset({
    entries: args.entries,
    abbrev: args.abbrev,
    protocol: args.protocol,
    updatedAt: args.updatedAt,
  });
  return {
    manifest_hash: hashCanonicalJson({
      vocabulary,
      aliases: args.aliases,
      protocol: args.protocol,
    }),
    entry_count: args.entries.length,
    tag_count: args.entries.length,
    active_count: active.length,
    updated_at: args.updatedAt,
    source_protocol_version:
      cleanString(args.protocol.version) || TAGVOCAB_PROTOCOL_VERSION,
    projection_target: SYNTHESIS_TAG_INDEX_TARGET,
  };
}

function createRegistry() {
  const registry = new SynthesisSchemaRegistry();
  registry.registerDataSchema(SYNTHESIS_TAG_VOCABULARY_SCHEMA_ID, {
    type: "object",
    anyOf: [{ required: ["tags"] }, { required: ["entries"] }],
    additionalProperties: true,
    properties: {
      version: { type: "string" },
      updated_at: { type: "string" },
      facets: { type: "array", items: { type: "string" } },
      tags: { type: "array" },
      entries: { type: "array" },
      abbrevs: { type: "object" },
      tag_count: { type: "number" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_TAG_ALIASES_SCHEMA_ID, {
    type: "object",
    required: ["aliases"],
    additionalProperties: true,
    properties: {
      aliases: { type: "object" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_TAG_ABBREV_SCHEMA_ID, {
    type: "object",
    additionalProperties: true,
    properties: {
      abbrevs: { type: "object" },
      abbrev: { type: "object" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_TAG_PROTOCOL_SCHEMA_ID, {
    type: "object",
    required: ["tag_pattern", "max_tag_length", "facets"],
    additionalProperties: true,
    properties: {
      version: { type: "string" },
      tag_pattern: { type: "string" },
      max_tag_length: { type: "number" },
      facets: { type: "array", items: { type: "string" } },
    },
  });
  registry.registerDataSchema(SYNTHESIS_TAG_MANIFEST_SCHEMA_ID, {
    type: "object",
    required: [
      "manifest_hash",
      "entry_count",
      "active_count",
      "updated_at",
      "projection_target",
    ],
    additionalProperties: true,
    properties: {
      manifest_hash: { type: "string" },
      entry_count: { type: "number" },
      tag_count: { type: "number" },
      active_count: { type: "number" },
      updated_at: { type: "string" },
      source_protocol_version: { type: "string" },
      projection_target: { type: "string" },
    },
  });
  return registry;
}

function entriesEqual(
  left: SynthesisTagVocabularyEntry,
  right: SynthesisTagVocabularyEntry,
) {
  return hashCanonicalJson(left) === hashCanonicalJson(right);
}

function parseImportPayload(payload: unknown) {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return payload
        .split(/\r?\n/)
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter(Boolean);
    }
  }
  return payload;
}

function buildImportPreview(args: {
  engine: SynthesisTagVocabularyEngine;
  local: SynthesisTagVocabularyEntry[];
  imported: SynthesisTagVocabularyEntry[];
  aliases: Record<string, string>;
  abbrev: Record<string, string>;
  protocol: SynthesisTagProtocolAsset;
}): SynthesisTagImportPreview {
  const localByTag = new Map(args.local.map((entry) => [entry.tag, entry]));
  const additions: SynthesisTagVocabularyEntry[] = [];
  const unchanged: SynthesisTagVocabularyEntry[] = [];
  const conflicts: SynthesisTagImportConflict[] = [];
  const builtins: SynthesisTagImportConflict[] = [];
  for (const imported of args.imported) {
    const local = localByTag.get(imported.tag);
    if (isBuiltinStatusTag(imported.tag)) {
      if (local) {
        builtins.push({ tag: imported.tag, local, imported });
      }
      continue;
    }
    if (!local) {
      additions.push(imported);
    } else if (entriesEqual(local, imported)) {
      unchanged.push(imported);
    } else {
      conflicts.push({ tag: imported.tag, local, imported });
    }
  }
  const warnings = validateSynthesisTagVocabularyWithEngine({
    engine: args.engine,
    input: {
      entries: dedupeEntries([...args.local, ...args.imported]),
      aliases: args.aliases,
      abbrev: args.abbrev,
      protocol: args.protocol,
    },
  });
  return {
    action: "preview",
    builtins: builtins.sort((left, right) => left.tag.localeCompare(right.tag)),
    additions: sortEntries(additions),
    unchanged: sortEntries(unchanged),
    conflicts: conflicts.sort((left, right) =>
      left.tag.localeCompare(right.tag),
    ),
    warnings,
  };
}

function jsonArrayText(values: unknown[]) {
  return JSON.stringify(Array.isArray(values) ? values : []);
}

function parseJsonArrayText(value: unknown) {
  try {
    const parsed = JSON.parse(cleanString(value) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function tagEntryToRecord(
  entry: SynthesisTagVocabularyEntry,
): SynthesisTagVocabularyEntryRecord {
  return {
    tag: entry.tag,
    facet: cleanString(entry.facet),
    note: entry.note,
    source: entry.source,
    deprecated: entry.deprecated,
    replacement: entry.replacement,
    aliasesJson: jsonArrayText(entry.aliases || []),
    abbrevJson: jsonArrayText(entry.abbrev || []),
    usageCount: entry.usage_count,
    lastSyncedAt: entry.last_synced_at,
  };
}

function tagEntryFromRecord(
  record: SynthesisTagVocabularyEntryRecord,
): SynthesisTagVocabularyEntry {
  return normalizeTagEntry({
    tag: record.tag,
    facet: record.facet,
    note: record.note,
    source: record.source,
    deprecated: record.deprecated,
    replacement: record.replacement,
    aliases: parseJsonArrayText(record.aliasesJson),
    abbrev: parseJsonArrayText(record.abbrevJson),
    usage_count: record.usageCount,
    last_synced_at: record.lastSyncedAt,
  })!;
}

function tagAliasRecords(
  aliases: Record<string, string>,
): SynthesisTagAliasRecord[] {
  return Object.entries(normalizeRecordMap(aliases)).map(([alias, tag]) => ({
    alias: cleanString(alias),
    tag: cleanString(tag),
  }));
}

function tagAliasesFromRecords(records: SynthesisTagAliasRecord[]) {
  return Object.fromEntries(
    records
      .map((entry) => [cleanString(entry.alias), cleanString(entry.tag)])
      .filter(([alias, tag]) => alias && tag)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function tagAbbrevRecords(
  abbrev: Record<string, string>,
): SynthesisTagAbbrevRecord[] {
  return Object.entries(normalizeAbbrevRegistry(abbrev)).map(
    ([abbrevKey, abbrevValue]) => ({
      abbrevKey,
      abbrevValue,
    }),
  );
}

function tagAbbrevFromRecords(records: SynthesisTagAbbrevRecord[]) {
  return Object.fromEntries(
    records
      .map((entry) => [
        cleanString(entry.abbrevKey).toLowerCase(),
        cleanString(entry.abbrevValue),
      ])
      .filter(([key, value]) => key && value)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function tagProtocolToRecord(
  protocol: SynthesisTagProtocolAsset,
): SynthesisTagProtocolRecord {
  return {
    protocolId: "default",
    version: protocol.version,
    tagPattern: protocol.tag_pattern,
    maxTagLength: protocol.max_tag_length,
    facetsJson: jsonArrayText(protocol.facets),
  };
}

function tagProtocolFromRecord(
  record: SynthesisTagProtocolRecord | null,
): SynthesisTagProtocolAsset {
  if (!record) {
    return DEFAULT_PROTOCOL;
  }
  return validateProtocolShape({
    version: record.version,
    tag_pattern: record.tagPattern,
    max_tag_length: record.maxTagLength,
    facets: parseJsonArrayText(record.facetsJson),
  });
}

function tagWarningId(warning: SynthesisTagValidationWarning) {
  return `tag-warning:${hashCanonicalJson(warning).slice("sha256:".length, "sha256:".length + 16)}`;
}

function tagWarningToRecord(
  warning: SynthesisTagValidationWarning,
): SynthesisTagValidationWarningRecord {
  return {
    warningId: tagWarningId(warning),
    code: warning.code,
    severity: warning.severity,
    tag: warning.tag,
    message: warning.message,
  };
}

function tagWarningFromRecord(
  record: SynthesisTagValidationWarningRecord,
): SynthesisTagValidationWarning {
  return {
    code: record.code,
    severity: record.severity === "error" ? "error" : "warning",
    tag: record.tag,
    message: record.message,
  };
}

function normalizeParentBindings(values: unknown) {
  return rebuildSynthesisHostItemRefs(values, "parentBindings");
}

function parentBindingsJson(values: unknown) {
  return jsonArrayText(normalizeParentBindings(values));
}

function parentBindingsFromJson(value: unknown) {
  return normalizeParentBindings(parseJsonArrayText(value));
}

function inspectStoredParentBindings(value: unknown) {
  let entries: unknown[] = [];
  let invalidCount = 0;
  try {
    const parsed = JSON.parse(cleanString(value) || "[]");
    if (Array.isArray(parsed)) {
      entries = parsed;
    } else {
      invalidCount += 1;
    }
  } catch {
    invalidCount += 1;
  }
  const stable: SynthesisHostItemRef[] = [];
  const legacyItemIds: number[] = [];
  for (const entry of entries) {
    if (Number.isSafeInteger(entry) && Number(entry) > 0) {
      legacyItemIds.push(Number(entry));
      continue;
    }
    try {
      stable.push(rebuildSynthesisHostItemRef(entry, "storedParentBinding"));
    } catch {
      invalidCount += 1;
    }
  }
  return {
    stable: rebuildSynthesisHostItemRefs(stable, "storedParentBindings"),
    legacyItemIds: Array.from(new Set(legacyItemIds)).sort(
      (left, right) => left - right,
    ),
    invalidCount,
  };
}

function stagedSuggestionToRecord(
  entry: SynthesisTagStagedSuggestion,
): SynthesisTagStagedSuggestionRecord {
  const tag = cleanString(entry.tag);
  return {
    tag,
    facet: normalizeFacet(entry.facet, tag),
    note: cleanString(entry.note) || undefined,
    sourceFlow: cleanString(entry.source_flow) || "tag-regulator-suggest",
    parentBindingsJson: parentBindingsJson(entry.parent_bindings || []),
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

function stagedSuggestionFromRecord(
  record: SynthesisTagStagedSuggestionRecord,
): SynthesisTagStagedSuggestion {
  const tag = cleanString(record.tag);
  return {
    tag,
    facet: normalizeFacet(record.facet, tag),
    note: cleanString(record.note) || undefined,
    source_flow: cleanString(record.sourceFlow) || "tag-regulator-suggest",
    parent_bindings: parentBindingsFromJson(record.parentBindingsJson),
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function mergeStagedSuggestion(
  existing: SynthesisTagStagedSuggestion | null,
  input: SynthesisTagStagedSuggestion,
  timestamp: string,
): SynthesisTagStagedSuggestion {
  const tag = cleanString(input.tag || existing?.tag);
  return {
    tag,
    facet: normalizeFacet(input.facet || existing?.facet, tag),
    note: cleanString(input.note) || cleanString(existing?.note) || undefined,
    source_flow:
      cleanString(input.source_flow) ||
      cleanString(existing?.source_flow) ||
      "tag-regulator-suggest",
    parent_bindings: normalizeParentBindings([
      ...(existing?.parent_bindings || []),
      ...(input.parent_bindings || []),
    ]),
    created_at: existing?.created_at || timestamp,
    updated_at: timestamp,
  };
}

export function createSynthesisTagVocabularyService(options: ServiceOptions) {
  const root = cleanString(options.root);
  if (!root) {
    throw new Error("Synthesis tag vocabulary service requires a storage root");
  }
  const now = options.now || nowIso;
  const engine =
    options.engine || createInProcessSynthesisTagVocabularyEngine();
  const repository =
    options.repository ||
    createSynthesisRepository({
      runtimeRoot: resolveSynthesisPersistenceRoot(root),
      now,
    });
  const registry = createRegistry();

  async function commitAssets(args: {
    entries: SynthesisTagVocabularyEntry[];
    aliases?: Record<string, string>;
    abbrev?: Record<string, string>;
    protocol?: SynthesisTagProtocolAsset;
    transactionId?: string;
  }) {
    const timestamp = now();
    repository.initialize();
    const existingEntries = repository
      .listTagVocabularyEntries()
      .map(tagEntryFromRecord);
    const entries = dedupeEntries(
      protectBuiltinTagVocabularyEntries(args.entries, existingEntries),
    );
    const aliases = normalizeRecordMap(args.aliases || {});
    const abbrev = normalizeAbbrevRegistry(args.abbrev || {});
    const protocol = protectBuiltinStatusProtocol(
      validateProtocolShape(args.protocol || DEFAULT_PROTOCOL),
    );
    const warnings = validateSynthesisTagVocabularyWithEngine({
      engine,
      input: { entries, aliases, abbrev, protocol },
    });
    const errors = warnings.filter((entry) => entry.severity === "error");
    if (errors.length) {
      await writeCanonicalDiagnostic({
        root,
        diagnostic: {
          scope: "tags",
          code: "tag_vocabulary_validation_failed",
          message: "tag vocabulary validation failed",
          asset_path: "tags/vocabulary.json",
          details: { warnings },
          created_at: timestamp,
        },
      });
      throw new Error(
        `tag vocabulary validation failed: ${errors.map((entry) => entry.code).join(", ")}`,
      );
    }
    repository.replaceTagVocabularyState({
      entries: entries.map(tagEntryToRecord),
      aliases: tagAliasRecords(aliases),
      abbrevs: tagAbbrevRecords(abbrev),
      protocol: tagProtocolToRecord(protocol),
      validationWarnings: warnings.map(tagWarningToRecord),
    });
    const manifest = buildManifest({
      entries,
      aliases,
      abbrev,
      protocol,
      updatedAt: timestamp,
    });
    const receipt: CanonicalTransactionReceipt = {
      schema_id: "synthesis.canonical_store_transaction_receipt",
      schema_version: "1.0.0",
      transaction_id:
        cleanString(args.transactionId) || `tag-vocabulary-${timestamp}`,
      scope: "tags",
      status: "committed",
      changed_assets: [],
      created_at: timestamp,
    };
    return { transactionId: receipt.transaction_id, receipt, manifest };
  }

  async function initializeIfMissing() {
    repository.initialize();
    const protocolRecord = repository.getTagProtocol();
    if (!protocolRecord) {
      await commitAssets({
        entries: [],
        aliases: {},
        abbrev: {},
        protocol: DEFAULT_PROTOCOL,
        transactionId: "tag-vocabulary-init",
      });
      return;
    }
    const entries = dedupeEntries(
      repository.listTagVocabularyEntries().map(tagEntryFromRecord),
    );
    const protocol = tagProtocolFromRecord(protocolRecord);
    const protectedEntries = dedupeEntries(
      protectBuiltinTagVocabularyEntries(entries),
    );
    const protectedProtocol = protectBuiltinStatusProtocol(protocol);
    if (
      hashCanonicalJson({ entries, protocol }) ===
      hashCanonicalJson({
        entries: protectedEntries,
        protocol: protectedProtocol,
      })
    ) {
      return;
    }
    await commitAssets({
      entries: protectedEntries,
      aliases: tagAliasesFromRecords(repository.listTagAliases()),
      abbrev: tagAbbrevFromRecords(repository.listTagAbbrevs()),
      protocol: protectedProtocol,
      transactionId: "tag-vocabulary-builtin-policy-upgrade",
    });
  }

  async function initializeBuiltinTagPolicy() {
    await initializeIfMissing();
    return loadTagVocabulary();
  }

  function isBuiltinTagPolicyInitialized() {
    repository.initialize();
    const protocolRecord = repository.getTagProtocol();
    if (!protocolRecord) {
      return false;
    }
    return hasInitializedBuiltinTagPolicy({
      entries: repository.listTagVocabularyEntries().map(tagEntryFromRecord),
      protocol: tagProtocolFromRecord(protocolRecord),
    });
  }

  async function loadTagVocabulary(
    options: IndexRebuildOptions = {},
  ): Promise<SynthesisTagVocabularySnapshot> {
    await initializeIfMissing();
    const entries = dedupeEntries(
      repository.listTagVocabularyEntries().map(tagEntryFromRecord),
    );
    await options.yieldControl?.();
    const aliasMap = normalizeRecordMap(
      tagAliasesFromRecords(repository.listTagAliases()),
    );
    const abbrevMap = normalizeAbbrevRegistry(
      tagAbbrevFromRecords(repository.listTagAbbrevs()),
    );
    const normalizedProtocol = tagProtocolFromRecord(
      repository.getTagProtocol(),
    );
    await options.yieldControl?.();
    const manifest = buildManifest({
      entries,
      aliases: aliasMap,
      abbrev: abbrevMap,
      protocol: normalizedProtocol,
      updatedAt: now(),
    });
    const currentWarnings = repository
      .listTagValidationWarnings()
      .map(tagWarningFromRecord);
    const projectionState = await readProjectionRegistryState(root);
    await options.yieldControl?.();
    return {
      entries,
      aliases: aliasMap,
      abbrev: abbrevMap,
      protocol: normalizedProtocol,
      manifest,
      validation_warnings: currentWarnings.length
        ? currentWarnings
        : validateSynthesisTagVocabularyWithEngine({
            engine,
            input: {
              entries,
              aliases: aliasMap,
              abbrev: abbrevMap,
              protocol: normalizedProtocol,
            },
          }),
      projection: projectionState.projections[SYNTHESIS_TAG_INDEX_TARGET],
    };
  }

  async function saveTagVocabulary(args: {
    entries: SynthesisTagVocabularyEntry[];
    aliases?: Record<string, string>;
    abbrev?: Record<string, string>;
    protocol?: SynthesisTagProtocolAsset;
    transactionId?: string;
  }): Promise<{
    transactionId: string;
    receipt: CanonicalTransactionReceipt;
  }> {
    const result = await commitAssets(args);
    return { transactionId: result.transactionId, receipt: result.receipt };
  }

  async function exportTagVocabularyCheckpoint(args?: {
    transactionId?: string;
  }) {
    const snapshot = await loadTagVocabulary();
    const timestamp = now();
    const vocabulary = buildVocabularyAsset({
      entries: snapshot.entries,
      abbrev: snapshot.abbrev,
      protocol: snapshot.protocol,
      updatedAt: timestamp,
    });
    const manifest = buildManifest({
      entries: snapshot.entries,
      aliases: snapshot.aliases,
      abbrev: snapshot.abbrev,
      protocol: snapshot.protocol,
      updatedAt: timestamp,
    });
    const result = await writeCanonicalTransaction({
      root,
      scope: "tags",
      registry,
      transactionId: args?.transactionId,
      projectionTargets: [SYNTHESIS_TAG_INDEX_TARGET],
      sourceManifestHash: manifest.manifest_hash,
      now: timestamp,
      assets: [
        {
          relativePath: "tags/vocabulary.json",
          schemaId: SYNTHESIS_TAG_VOCABULARY_SCHEMA_ID,
          data: vocabulary,
        },
        {
          relativePath: "tags/aliases.json",
          schemaId: SYNTHESIS_TAG_ALIASES_SCHEMA_ID,
          data: { aliases: snapshot.aliases },
        },
        {
          relativePath: "tags/abbrev.json",
          schemaId: SYNTHESIS_TAG_ABBREV_SCHEMA_ID,
          data: { abbrevs: snapshot.abbrev },
        },
        {
          relativePath: "tags/protocol.json",
          schemaId: SYNTHESIS_TAG_PROTOCOL_SCHEMA_ID,
          data: snapshot.protocol,
        },
        {
          relativePath: "tags/manifest.json",
          schemaId: SYNTHESIS_TAG_MANIFEST_SCHEMA_ID,
          data: manifest,
        },
      ],
    });
    return {
      transactionId: result.transactionId,
      receipt: result.receipt,
      manifest,
    };
  }

  async function validateTagVocabulary(args?: {
    entries?: SynthesisTagVocabularyEntry[];
    aliases?: Record<string, string>;
    abbrev?: Record<string, string>;
    protocol?: SynthesisTagProtocolAsset;
  }) {
    const current = await loadTagVocabulary();
    return validateSynthesisTagVocabularyWithEngine({
      engine,
      input: {
        entries: dedupeEntries(args?.entries || current.entries),
        aliases: normalizeRecordMap(args?.aliases || current.aliases),
        abbrev: normalizeRecordMap(args?.abbrev || current.abbrev),
        protocol: validateProtocolShape(args?.protocol || current.protocol),
      },
    });
  }

  async function listStagedTagSuggestions() {
    await initializeIfMissing();
    return repository
      .listTagStagedSuggestions()
      .map(stagedSuggestionFromRecord);
  }

  function inspectLegacyStagedParentBindings() {
    repository.initialize();
    const records = repository.listTagStagedSuggestions();
    const itemIds = new Set<number>();
    let invalidCount = 0;
    let affectedRows = 0;
    for (const record of records) {
      const inspected = inspectStoredParentBindings(record.parentBindingsJson);
      if (inspected.legacyItemIds.length || inspected.invalidCount) {
        affectedRows += 1;
      }
      inspected.legacyItemIds.forEach((itemId) => itemIds.add(itemId));
      invalidCount += inspected.invalidCount;
    }
    return {
      affectedRows,
      itemIds: Array.from(itemIds).sort((left, right) => left - right),
      invalidCount,
    };
  }

  function migrateLegacyStagedParentBindings(args: {
    resolved: Array<{ itemId: number; ref: SynthesisHostItemRef }>;
  }) {
    repository.initialize();
    const resolved = new Map(
      args.resolved.map((entry) => [entry.itemId, entry.ref]),
    );
    return repository.transaction(() => {
      let migratedRows = 0;
      let resolvedBindings = 0;
      let droppedBindings = 0;
      for (const record of repository.listTagStagedSuggestions()) {
        const inspected = inspectStoredParentBindings(
          record.parentBindingsJson,
        );
        if (!inspected.legacyItemIds.length && !inspected.invalidCount) {
          continue;
        }
        const refs = new Map(
          inspected.stable.map((ref) => [synthesisHostItemRefKey(ref), ref]),
        );
        for (const itemId of inspected.legacyItemIds) {
          const ref = resolved.get(itemId);
          if (ref) {
            refs.set(synthesisHostItemRefKey(ref), ref);
            resolvedBindings += 1;
          } else {
            droppedBindings += 1;
          }
        }
        droppedBindings += inspected.invalidCount;
        repository.upsertTagStagedSuggestion({
          ...record,
          parentBindingsJson: parentBindingsJson(Array.from(refs.values())),
        });
        migratedRows += 1;
      }
      return { migratedRows, resolvedBindings, droppedBindings };
    });
  }

  async function stageTagSuggestions(args: {
    entries: Array<{
      tag: string;
      facet?: string;
      note?: string;
      source_flow?: string;
      parent_bindings?: SynthesisHostItemRef[];
    }>;
  }) {
    await initializeIfMissing();
    const timestamp = now();
    const staged = repository
      .listTagStagedSuggestions()
      .map(stagedSuggestionFromRecord);
    const byLower = new Map(
      staged.map((entry) => [entry.tag.toLowerCase(), entry]),
    );
    const written: SynthesisTagStagedSuggestion[] = [];
    for (const raw of Array.isArray(args.entries) ? args.entries : []) {
      const tag = cleanString(raw?.tag);
      if (!tag) {
        continue;
      }
      const merged = mergeStagedSuggestion(
        byLower.get(tag.toLowerCase()) || null,
        {
          tag,
          facet: normalizeFacet(raw?.facet, tag),
          note: cleanString(raw?.note) || undefined,
          source_flow: cleanString(raw?.source_flow) || "tag-regulator-suggest",
          parent_bindings: normalizeParentBindings(raw?.parent_bindings || []),
        },
        timestamp,
      );
      repository.upsertTagStagedSuggestion(stagedSuggestionToRecord(merged));
      byLower.set(tag.toLowerCase(), merged);
      written.push(merged);
    }
    return {
      staged: written.sort((left, right) =>
        left.tag.localeCompare(right.tag, "en", { sensitivity: "base" }),
      ),
    };
  }

  async function updateStagedTagSuggestion(
    args: SynthesisStagedTagUpdateRequest,
  ) {
    await initializeIfMissing();
    const timestamp = now();
    return repository.transaction(() => {
      const staged = repository
        .listTagStagedSuggestions()
        .map(stagedSuggestionFromRecord);
      const requestedTag = cleanString(args.tag);
      const requestedLower = requestedTag.toLowerCase();
      const targetCandidates = staged.filter(
        (entry) => entry.tag.toLowerCase() === requestedLower,
      );
      const target =
        targetCandidates.find((entry) => entry.tag === requestedTag) ||
        targetCandidates[0] ||
        null;
      const merged = mergeStagedSuggestion(
        target,
        {
          tag: requestedTag,
          facet: cleanString(args.facet),
          note: cleanString(args.note) || undefined,
          source_flow: cleanString(args.sourceFlow),
          parent_bindings: normalizeParentBindings(args.parentBindings),
        },
        timestamp,
      );
      repository.removeTagStagedSuggestions([args.originalTag, requestedTag]);
      repository.upsertTagStagedSuggestion(stagedSuggestionToRecord(merged));
      return { staged: merged };
    });
  }

  function replaceValidatedTagVocabularyState(args: {
    entries: SynthesisTagVocabularyEntryRecord[];
    aliases: SynthesisTagAliasRecord[];
    abbrevs: SynthesisTagAbbrevRecord[];
    protocol: SynthesisTagProtocolRecord;
  }) {
    const entries = args.entries.map(tagEntryFromRecord);
    const aliases = tagAliasesFromRecords(args.aliases);
    const abbrev = tagAbbrevFromRecords(args.abbrevs);
    const protocol = tagProtocolFromRecord(args.protocol);
    const warnings = validateSynthesisTagVocabularyWithEngine({
      engine,
      input: { entries, aliases, abbrev, protocol },
    });
    const errors = warnings.filter((entry) => entry.severity === "error");
    if (errors.length) {
      throw new Error(
        `tag vocabulary validation failed: ${errors
          .map((entry) => entry.code)
          .join(", ")}`,
      );
    }
    repository.replaceTagVocabularyStateInCurrentTransaction({
      entries: args.entries,
      aliases: args.aliases,
      abbrevs: args.abbrevs,
      protocol: args.protocol,
      validationWarnings: warnings.map(tagWarningToRecord),
    });
  }

  async function updateTagVocabularyEntry(
    args: SynthesisTagVocabularyEntryUpdateRequest,
  ) {
    await initializeIfMissing();
    const originalTag = cleanString(args.originalTag);
    const targetTag = cleanString(args.tag);
    const facet = cleanString(args.facet);
    const note = cleanString(args.note) || undefined;
    const timestamp = now();
    return repository.transaction(() => {
      const entries = repository.listTagVocabularyEntries();
      const original = entries.find((entry) => entry.tag === originalTag);
      if (!original) {
        return {
          mutated: false as const,
          diagnostic: {
            code: "tag_vocabulary_entry_not_found",
            message: "The Tag Vocabulary entry to update was not found.",
            details: { originalTag },
          },
        };
      }
      const targetLower = targetTag.toLowerCase();
      const conflict = entries.find(
        (entry) =>
          entry.tag !== original.tag && entry.tag.toLowerCase() === targetLower,
      );
      if (conflict) {
        return {
          mutated: false as const,
          diagnostic: {
            code: "tag_vocabulary_entry_conflict",
            message: "Another Tag Vocabulary entry already uses that tag.",
            details: { originalTag, targetTag, conflictingTag: conflict.tag },
          },
        };
      }

      const renamed = targetTag !== original.tag;
      const nextEntries = entries.map((entry) => {
        if (entry.tag === original.tag) {
          return {
            ...entry,
            tag: targetTag,
            facet,
            note,
            updatedAt: timestamp,
          };
        }
        if (renamed && entry.replacement === original.tag) {
          return {
            ...entry,
            replacement: targetTag,
            updatedAt: timestamp,
          };
        }
        return entry;
      });
      const nextAliases = repository
        .listTagAliases()
        .map((entry) =>
          renamed && entry.tag === original.tag
            ? { ...entry, tag: targetTag, updatedAt: timestamp }
            : entry,
        );
      const abbrevs = repository.listTagAbbrevs();
      const protocol = repository.getTagProtocol();
      if (!protocol) {
        throw new Error("Tag Vocabulary protocol is unavailable");
      }
      replaceValidatedTagVocabularyState({
        entries: nextEntries,
        aliases: nextAliases,
        abbrevs,
        protocol,
      });
      return {
        mutated: true as const,
        updated: tagEntryFromRecord(
          nextEntries.find((entry) => entry.tag === targetTag)!,
        ),
      };
    });
  }

  async function deleteTagVocabularyEntry(
    args: SynthesisTagVocabularyEntryDeleteRequest,
  ) {
    await initializeIfMissing();
    const originalTag = cleanString(args.originalTag);
    const timestamp = now();
    return repository.transaction(() => {
      const entries = repository.listTagVocabularyEntries();
      if (!entries.some((entry) => entry.tag === originalTag)) {
        return { mutated: false as const, deleted: [] as string[] };
      }
      const nextEntries = entries
        .filter((entry) => entry.tag !== originalTag)
        .map((entry) =>
          entry.replacement === originalTag
            ? { ...entry, replacement: undefined, updatedAt: timestamp }
            : entry,
        );
      const nextAliases = repository
        .listTagAliases()
        .filter((entry) => entry.tag !== originalTag);
      const abbrevs = repository.listTagAbbrevs();
      const protocol = repository.getTagProtocol();
      if (!protocol) {
        throw new Error("Tag Vocabulary protocol is unavailable");
      }
      replaceValidatedTagVocabularyState({
        entries: nextEntries,
        aliases: nextAliases,
        abbrevs,
        protocol,
      });
      return { mutated: true as const, deleted: [originalTag] };
    });
  }

  async function promoteStagedTagSuggestions(args: { tags: string[] }) {
    await initializeIfMissing();
    const requested = normalizeStringList(args.tags);
    if (!requested.length) {
      return { promoted: [] as string[], skipped: [] as string[] };
    }
    const current = await loadTagVocabulary();
    const existingLower = new Set(
      current.entries.map((entry) => entry.tag.toLowerCase()),
    );
    const staged = repository
      .listTagStagedSuggestions({ tags: requested })
      .map(stagedSuggestionFromRecord);
    const promotedEntries: SynthesisTagVocabularyEntry[] = [];
    const skipped: string[] = [];
    for (const entry of staged) {
      if (existingLower.has(entry.tag.toLowerCase())) {
        skipped.push(entry.tag);
        continue;
      }
      promotedEntries.push({
        tag: entry.tag,
        facet: normalizeFacet(entry.facet, entry.tag),
        note: entry.note,
        source: entry.source_flow || "tag-regulator-suggest",
        deprecated: false,
      });
      existingLower.add(entry.tag.toLowerCase());
    }
    if (promotedEntries.length) {
      await saveTagVocabulary({
        entries: [...current.entries, ...promotedEntries],
        aliases: current.aliases,
        abbrev: current.abbrev,
        protocol: current.protocol,
        transactionId: `tag-staged-promote-${now()}`,
      });
    }
    const promoted = promotedEntries.map((entry) => entry.tag);
    repository.removeTagStagedSuggestions(promoted);
    return { promoted, skipped };
  }

  async function discardStagedTagSuggestions(args: { tags: string[] }) {
    await initializeIfMissing();
    const removed = repository
      .removeTagStagedSuggestions(args.tags)
      .map(stagedSuggestionFromRecord);
    return { discarded: removed.map((entry) => entry.tag) };
  }

  async function clearStagedTagSuggestions() {
    await initializeIfMissing();
    const removed = repository
      .clearTagStagedSuggestions()
      .map(stagedSuggestionFromRecord);
    return { discarded: removed.map((entry) => entry.tag) };
  }

  async function previewImport(payload: unknown) {
    const current = await loadTagVocabulary();
    const imported = normalizeVocabularyPayload(parseImportPayload(payload));
    const importedAbbrev = {
      ...current.abbrev,
      ...imported.abbrev,
    };
    return buildImportPreview({
      engine,
      local: current.entries,
      imported: imported.entries,
      aliases: current.aliases,
      abbrev: importedAbbrev,
      protocol: imported.protocol || current.protocol,
    });
  }

  async function applyImport(args: {
    payload: unknown;
    action: SynthesisTagImportAction;
    transactionId?: string;
  }) {
    const current = await loadTagVocabulary();
    const imported = normalizeVocabularyPayload(
      parseImportPayload(args.payload),
    );
    const preview = await previewImport(args.payload);
    let entries = current.entries;
    let abbrev = current.abbrev;
    let protocol = current.protocol;
    if (args.action === "use-imported") {
      const localOnly = current.entries.filter(
        (entry) =>
          !imported.entries.some((candidate) => candidate.tag === entry.tag),
      );
      entries = dedupeEntries([...localOnly, ...imported.entries]);
      abbrev = { ...current.abbrev, ...imported.abbrev };
      protocol = imported.protocol || current.protocol;
    } else if (args.action === "merge-non-conflicting") {
      const importedBuiltins = imported.entries.filter((entry) =>
        isBuiltinStatusTag(entry.tag),
      );
      const importedBuiltinTags = new Set(
        importedBuiltins.map((entry) => entry.tag),
      );
      entries = dedupeEntries([
        ...current.entries.filter(
          (entry) => !importedBuiltinTags.has(entry.tag),
        ),
        ...preview.additions,
        ...importedBuiltins,
      ]);
      abbrev = { ...current.abbrev, ...imported.abbrev };
      protocol = imported.protocol || current.protocol;
    }
    return saveTagVocabulary({
      entries,
      aliases: current.aliases,
      abbrev,
      protocol,
      transactionId: args.transactionId,
    });
  }

  async function rebuildTagIndexProjection(options: IndexRebuildOptions = {}) {
    const totalCount = 4;
    const reportProgress = async (
      phase: string,
      phaseLabel: string,
      processedCount: number,
      message?: string,
    ) =>
      options.reportProgress?.({
        phase,
        phaseLabel,
        processedCount,
        totalCount,
        message,
      });
    await reportProgress("load_source", "Load source", 0);
    const snapshot = await loadTagVocabulary(options);
    await reportProgress(
      "build_projection",
      "Build projection",
      1,
      `${snapshot.entries.length} tag entries loaded`,
    );
    const rebuiltAt = now();
    const projection = buildSynthesisTagVocabularyIndexWithEngine({
      engine,
      input: {
        entries: snapshot.entries,
        aliases: snapshot.aliases,
        abbrev: snapshot.abbrev,
        protocol: snapshot.protocol,
      },
      sourceManifestHash: snapshot.manifest.manifest_hash,
      rebuiltAt,
    });
    await options.yieldControl?.();
    await reportProgress("write_projection", "Write projection", 2);
    await options.yieldControl?.();
    await reportProgress("record_projection", "Record projection", 3);
    return recordProjectionRebuild({
      root,
      target: SYNTHESIS_TAG_INDEX_TARGET,
      schemaVersion: SYNTHESIS_TAG_INDEX_SCHEMA_VERSION,
      sourceManifestHash: snapshot.manifest.manifest_hash,
      diagnostics: snapshot.validation_warnings,
      now: rebuiltAt,
    });
  }

  async function readTagIndexProjection() {
    const snapshot = await loadTagVocabulary();
    return buildSynthesisTagVocabularyIndexWithEngine({
      engine,
      input: {
        entries: snapshot.entries,
        aliases: snapshot.aliases,
        abbrev: snapshot.abbrev,
        protocol: snapshot.protocol,
      },
      sourceManifestHash: snapshot.manifest.manifest_hash,
      rebuiltAt: now(),
    });
  }

  async function exportTagVocabularyForRegulator() {
    const snapshot = await loadTagVocabulary();
    return snapshot.entries
      .filter((entry) => !entry.deprecated)
      .map((entry) => entry.tag)
      .filter(Boolean)
      .sort((left, right) =>
        left.localeCompare(right, "en", { sensitivity: "base" }),
      );
  }

  return {
    initializeBuiltinTagPolicy,
    isBuiltinTagPolicyInitialized,
    loadTagVocabulary,
    saveTagVocabulary,
    exportTagVocabularyCheckpoint,
    validateTagVocabulary,
    listStagedTagSuggestions,
    inspectLegacyStagedParentBindings,
    migrateLegacyStagedParentBindings,
    stageTagSuggestions,
    updateStagedTagSuggestion,
    updateTagVocabularyEntry,
    deleteTagVocabularyEntry,
    promoteStagedTagSuggestions,
    discardStagedTagSuggestions,
    clearStagedTagSuggestions,
    previewImport,
    applyImport,
    rebuildTagIndexProjection,
    readTagIndexProjection,
    exportTagVocabularyForRegulator,
  };
}

export type SynthesisTagVocabularyService = ReturnType<
  typeof createSynthesisTagVocabularyService
>;
