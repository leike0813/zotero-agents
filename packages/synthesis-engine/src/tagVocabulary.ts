export const SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION =
  "synthesis-tag-vocabulary.v1" as const;
export const SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION =
  "tag-vocabulary-validation.v1" as const;
export const SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION =
  "tag-vocabulary-index.v1" as const;
export const SYNTHESIS_TAG_VOCABULARY_INDEX_SCHEMA_VERSION = "1.0.0" as const;

export const SYNTHESIS_TAG_VOCABULARY_ENTRY_MAX = 25_000;
export const SYNTHESIS_TAG_VOCABULARY_GLOBAL_ALIAS_MAX = 50_000;
export const SYNTHESIS_TAG_VOCABULARY_ABBREV_MAX = 10_000;
export const SYNTHESIS_TAG_VOCABULARY_FACET_MAX = 256;
export const SYNTHESIS_TAG_VOCABULARY_PER_ENTRY_ALIAS_MAX = 256;
export const SYNTHESIS_TAG_VOCABULARY_STRING_MAX = 4096;
export const SYNTHESIS_TAG_VOCABULARY_CHECKPOINT_INTERVAL = 256;

export type SynthesisTagVocabularyEngineEntry = {
  tag: string;
  facet: string;
  note?: string;
  deprecated?: boolean;
  replacement?: string;
  aliases: string[];
  abbrev: string[];
};

export type SynthesisTagVocabularyEngineProtocol = {
  version: string;
  tagPattern: string;
  maxTagLength: number;
  facets: string[];
};

export type SynthesisTagVocabularyWarning = {
  code: string;
  severity: "warning" | "error";
  tag?: string;
  message: string;
};

export type SynthesisTagVocabularyValidationRequest = {
  contractVersion: typeof SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION;
  entries: SynthesisTagVocabularyEngineEntry[];
  aliases: Record<string, string>;
  abbrev: Record<string, string>;
  protocol: SynthesisTagVocabularyEngineProtocol;
};

export type SynthesisTagVocabularyValidationResult = {
  contractVersion: typeof SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION;
  warnings: SynthesisTagVocabularyWarning[];
};

export type SynthesisTagVocabularyIndexRequest = Omit<
  SynthesisTagVocabularyValidationRequest,
  "algorithmVersion"
> & {
  algorithmVersion: typeof SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION;
  sourceManifestHash: string;
  rebuiltAt: string;
};

export type SynthesisTagVocabularyIndexSearchRow = {
  tag: string;
  normalized: string;
  facet: string;
  aliases: string[];
  abbrev: string[];
};

export type SynthesisTagVocabularyIndexResult = {
  contractVersion: typeof SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION;
  schemaVersion: typeof SYNTHESIS_TAG_VOCABULARY_INDEX_SCHEMA_VERSION;
  sourceManifestHash: string;
  rebuiltAt: string;
  tags: string[];
  aliases: Record<string, string>;
  abbrev: Record<string, string>;
  search: SynthesisTagVocabularyIndexSearchRow[];
  validationWarnings: SynthesisTagVocabularyWarning[];
};

export type SynthesisTagVocabularyCheckpoint = {
  phase: "start" | "entries" | "aliases" | "search" | "complete";
  processedCount: number;
  totalCount: number;
};

export type SynthesisTagVocabularyEngineOptions = {
  checkpoint?: (checkpoint: SynthesisTagVocabularyCheckpoint) => void;
  checkpointInterval?: number;
};

export interface SynthesisTagVocabularyEngine {
  validate(
    request: SynthesisTagVocabularyValidationRequest,
  ): SynthesisTagVocabularyValidationResult;
  buildIndex(
    request: SynthesisTagVocabularyIndexRequest,
  ): SynthesisTagVocabularyIndexResult;
}

export class SynthesisTagVocabularyContractError extends Error {
  readonly code = "invalid_request";

  constructor(message: string) {
    super(message);
    this.name = "SynthesisTagVocabularyContractError";
  }
}

export type SynthesisTagVocabularyContractBounds = {
  entryMax?: number;
  globalAliasMax?: number;
  abbrevMax?: number;
  facetMax?: number;
  perEntryAliasMax?: number;
  stringMax?: number;
};

type ResolvedBounds = {
  entryMax: number;
  globalAliasMax: number;
  abbrevMax: number;
  facetMax: number;
  perEntryAliasMax: number;
  stringMax: number;
};

function invalid(message: string): never {
  throw new SynthesisTagVocabularyContractError(message);
}

function resolveBounds(
  bounds: SynthesisTagVocabularyContractBounds = {},
): ResolvedBounds {
  return {
    entryMax: bounds.entryMax ?? SYNTHESIS_TAG_VOCABULARY_ENTRY_MAX,
    globalAliasMax:
      bounds.globalAliasMax ?? SYNTHESIS_TAG_VOCABULARY_GLOBAL_ALIAS_MAX,
    abbrevMax: bounds.abbrevMax ?? SYNTHESIS_TAG_VOCABULARY_ABBREV_MAX,
    facetMax: bounds.facetMax ?? SYNTHESIS_TAG_VOCABULARY_FACET_MAX,
    perEntryAliasMax:
      bounds.perEntryAliasMax ?? SYNTHESIS_TAG_VOCABULARY_PER_ENTRY_ALIAS_MAX,
    stringMax: bounds.stringMax ?? SYNTHESIS_TAG_VOCABULARY_STRING_MAX,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertJsonSafe(
  value: unknown,
  location = "request",
  seen = new Set<object>(),
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      invalid(`${location} must contain finite numbers`);
    }
    return;
  }
  if (typeof value !== "object" || value === undefined) {
    invalid(`${location} must be JSON-safe`);
  }
  const object = value as object;
  if (seen.has(object)) {
    invalid(`${location} must not contain cycles`);
  }
  seen.add(object);
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertJsonSafe(entry, `${location}[${index}]`, seen),
    );
  } else if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      assertJsonSafe(entry, `${location}.${key}`, seen);
    }
  } else {
    invalid(`${location} must contain plain objects`);
  }
  seen.delete(object);
}

function objectValue(value: unknown, location: string) {
  if (!isPlainObject(value)) {
    return invalid(`${location} must be an object`);
  }
  return value;
}

function arrayValue(value: unknown, location: string) {
  if (!Array.isArray(value)) {
    return invalid(`${location} must be an array`);
  }
  return value;
}

function cleanString(
  value: unknown,
  location: string,
  bounds: ResolvedBounds,
  options?: { optional?: false },
): string;
function cleanString(
  value: unknown,
  location: string,
  bounds: ResolvedBounds,
  options: { optional: true },
): string | undefined;
function cleanString(
  value: unknown,
  location: string,
  bounds: ResolvedBounds,
  options: { optional?: boolean } = {},
) {
  if (value === undefined && options.optional) {
    return undefined;
  }
  if (typeof value !== "string") {
    return invalid(`${location} must be a string`);
  }
  const cleaned = value.trim();
  if (!cleaned) {
    if (options.optional) {
      return undefined;
    }
    return invalid(`${location} must not be empty`);
  }
  if (cleaned.length > bounds.stringMax) {
    return invalid(`${location} exceeds the string bound`);
  }
  return cleaned;
}

function positiveInteger(value: unknown, location: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return invalid(`${location} must be a positive integer`);
  }
  return value;
}

function boundedString(
  value: unknown,
  location: string,
  bounds: ResolvedBounds,
) {
  if (typeof value !== "string" || !value) {
    return invalid(`${location} must be a non-empty string`);
  }
  if (value.length > bounds.stringMax) {
    return invalid(`${location} exceeds the string bound`);
  }
  return value;
}

function booleanValue(value: unknown, location: string) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    return invalid(`${location} must be a boolean`);
  }
  return value || undefined;
}

function normalizeStringArray(
  value: unknown,
  location: string,
  bounds: ResolvedBounds,
) {
  const input = value === undefined ? [] : arrayValue(value, location);
  if (input.length > bounds.perEntryAliasMax) {
    invalid(`${location} exceeds the collection bound`);
  }
  const output: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < input.length; index += 1) {
    const entry = cleanString(input[index], `${location}[${index}]`, bounds);
    if (seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    output.push(entry);
  }
  return output.sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" }),
  );
}

function rebuildEntry(
  value: unknown,
  index: number,
  bounds: ResolvedBounds,
): SynthesisTagVocabularyEngineEntry {
  const row = objectValue(value, `entries[${index}]`);
  const entry: SynthesisTagVocabularyEngineEntry = {
    tag: cleanString(row.tag, `entries[${index}].tag`, bounds),
    facet: cleanString(row.facet, `entries[${index}].facet`, bounds),
    aliases: normalizeStringArray(
      row.aliases,
      `entries[${index}].aliases`,
      bounds,
    ),
    abbrev: normalizeStringArray(
      row.abbrev,
      `entries[${index}].abbrev`,
      bounds,
    ),
  };
  const note = cleanString(row.note, `entries[${index}].note`, bounds, {
    optional: true,
  });
  const replacement = cleanString(
    row.replacement,
    `entries[${index}].replacement`,
    bounds,
    { optional: true },
  );
  const deprecated = booleanValue(
    row.deprecated,
    `entries[${index}].deprecated`,
  );
  if (note) {
    entry.note = note;
  }
  if (deprecated) {
    entry.deprecated = true;
  }
  if (replacement) {
    entry.replacement = replacement;
  }
  const normalizedSearchText =
    `${entry.tag} ${entry.note || ""} ${entry.aliases.join(" ")} ${entry.abbrev.join(" ")}`.toLowerCase();
  if (normalizedSearchText.length > bounds.stringMax) {
    invalid(`entries[${index}] search text exceeds the string bound`);
  }
  return entry;
}

function compareEntries(
  left: SynthesisTagVocabularyEngineEntry,
  right: SynthesisTagVocabularyEngineEntry,
) {
  return (
    left.facet.localeCompare(right.facet) ||
    left.tag.localeCompare(right.tag, "en", { sensitivity: "base" })
  );
}

function rebuildEntries(
  value: unknown,
  bounds: ResolvedBounds,
): SynthesisTagVocabularyEngineEntry[] {
  const input = arrayValue(value, "entries");
  if (input.length > bounds.entryMax) {
    invalid("entries exceeds the collection bound");
  }
  const entries = input.map((entry, index) =>
    rebuildEntry(entry, index, bounds),
  );
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.tag)) {
      invalid(`entries contains duplicate tag ${entry.tag}`);
    }
    seen.add(entry.tag);
  }
  return entries.sort(compareEntries);
}

function rebuildStringRecord(
  value: unknown,
  location: string,
  limit: number,
  bounds: ResolvedBounds,
  options: { lowercaseKeys?: boolean } = {},
) {
  const row = objectValue(value, location);
  const pairs = Object.entries(row);
  if (pairs.length > limit) {
    invalid(`${location} exceeds the collection bound`);
  }
  const output = new Map<string, string>();
  for (const [rawKey, rawValue] of pairs) {
    const cleanedKey = cleanString(rawKey, `${location} key`, bounds);
    const key = options.lowercaseKeys ? cleanedKey.toLowerCase() : cleanedKey;
    const entry = cleanString(rawValue, `${location}.${rawKey}`, bounds);
    if (output.has(key)) {
      invalid(`${location} contains duplicate canonical key ${key}`);
    }
    output.set(key, entry);
  }
  return Object.fromEntries(
    [...output.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function rebuildProtocol(
  value: unknown,
  bounds: ResolvedBounds,
): SynthesisTagVocabularyEngineProtocol {
  const row = objectValue(value, "protocol");
  const facets = normalizeStringArray(row.facets, "protocol.facets", {
    ...bounds,
    perEntryAliasMax: bounds.facetMax,
  });
  if (facets.length > bounds.facetMax) {
    invalid("protocol.facets exceeds the collection bound");
  }
  const tagPattern = cleanString(row.tagPattern, "protocol.tagPattern", bounds);
  try {
    new RegExp(tagPattern);
  } catch {
    invalid("protocol.tagPattern must be a valid regular expression");
  }
  return {
    version: cleanString(row.version, "protocol.version", bounds),
    tagPattern,
    maxTagLength: positiveInteger(row.maxTagLength, "protocol.maxTagLength"),
    facets,
  };
}

function rebuildCommonRequest(
  input: unknown,
  bounds: ResolvedBounds,
): Omit<SynthesisTagVocabularyValidationRequest, "algorithmVersion"> {
  assertJsonSafe(input);
  const row = objectValue(input, "request");
  if (row.contractVersion !== SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION) {
    invalid("contractVersion is invalid");
  }
  return {
    contractVersion: SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
    entries: rebuildEntries(row.entries, bounds),
    aliases: rebuildStringRecord(
      row.aliases,
      "aliases",
      bounds.globalAliasMax,
      bounds,
    ),
    abbrev: rebuildStringRecord(
      row.abbrev,
      "abbrev",
      bounds.abbrevMax,
      bounds,
      { lowercaseKeys: true },
    ),
    protocol: rebuildProtocol(row.protocol, bounds),
  };
}

export function rebuildSynthesisTagVocabularyValidationRequest(
  input: unknown,
  bounds: SynthesisTagVocabularyContractBounds = {},
): SynthesisTagVocabularyValidationRequest {
  const resolved = resolveBounds(bounds);
  const row = objectValue(input, "request");
  if (row.algorithmVersion !== SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION) {
    invalid("algorithmVersion is invalid");
  }
  return {
    ...rebuildCommonRequest(input, resolved),
    algorithmVersion: SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
  };
}

export function rebuildSynthesisTagVocabularyIndexRequest(
  input: unknown,
  bounds: SynthesisTagVocabularyContractBounds = {},
): SynthesisTagVocabularyIndexRequest {
  const resolved = resolveBounds(bounds);
  const row = objectValue(input, "request");
  if (row.algorithmVersion !== SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION) {
    invalid("algorithmVersion is invalid");
  }
  return {
    ...rebuildCommonRequest(input, resolved),
    algorithmVersion: SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
    sourceManifestHash: cleanString(
      row.sourceManifestHash,
      "sourceManifestHash",
      resolved,
    ),
    rebuiltAt: cleanString(row.rebuiltAt, "rebuiltAt", resolved),
  };
}

function checkpoint(
  options: SynthesisTagVocabularyEngineOptions,
  phase: SynthesisTagVocabularyCheckpoint["phase"],
  processedCount: number,
  totalCount: number,
) {
  options.checkpoint?.({ phase, processedCount, totalCount });
}

function shouldCheckpoint(
  processedCount: number,
  totalCount: number,
  interval: number,
) {
  return processedCount === totalCount || processedCount % interval === 0;
}

function facetFromTag(tag: string) {
  return tag.includes(":") ? tag.split(":")[0] : "";
}

function validateCanonicalRequest(
  request:
    | SynthesisTagVocabularyValidationRequest
    | SynthesisTagVocabularyIndexRequest,
  options: SynthesisTagVocabularyEngineOptions,
  includeBoundaryCheckpoints = true,
) {
  const warnings: SynthesisTagVocabularyWarning[] = [];
  const interval = Math.max(
    1,
    Math.floor(
      options.checkpointInterval ??
        SYNTHESIS_TAG_VOCABULARY_CHECKPOINT_INTERVAL,
    ),
  );
  const totalCount = request.entries.length;
  if (includeBoundaryCheckpoints) {
    checkpoint(options, "start", 0, totalCount);
  }
  for (const [key, value] of Object.entries(request.abbrev)) {
    if (!/^[a-z]+$/.test(key)) {
      warnings.push({
        code: "invalid_abbrev_key",
        severity: "error",
        tag: key,
        message: "Abbreviation registry keys must be lowercase letters.",
      });
    }
    if (!/^[A-Z][A-Za-z0-9]*$/.test(value)) {
      warnings.push({
        code: "invalid_abbrev_value",
        severity: "error",
        tag: key,
        message: "Abbreviation registry values must use canonical casing.",
      });
    }
  }
  const pattern = new RegExp(request.protocol.tagPattern);
  const allowedFacets = new Set(request.protocol.facets);
  const knownTags = new Set(request.entries.map((entry) => entry.tag));
  const seenLower = new Map<string, string>();
  for (let index = 0; index < request.entries.length; index += 1) {
    const entry = request.entries[index];
    const tag = entry.tag;
    const facet = entry.facet;
    if (!pattern.test(tag) || tag.length > request.protocol.maxTagLength) {
      warnings.push({
        code: "invalid_tag_format",
        severity: "error",
        tag,
        message: "Tag must match the configured TagVocab pattern.",
      });
    }
    if (!allowedFacets.has(facet)) {
      warnings.push({
        code: "unknown_facet",
        severity: "error",
        tag,
        message: "Tag facet is not allowed by the protocol.",
      });
    }
    if (facet && facetFromTag(tag) && facet !== facetFromTag(tag)) {
      warnings.push({
        code: "facet_mismatch",
        severity: "error",
        tag,
        message: "Entry facet must match the prefix before ':'.",
      });
    }
    const lower = tag.toLowerCase();
    const existing = seenLower.get(lower);
    if (existing && existing !== tag) {
      warnings.push({
        code: "case_duplicate",
        severity: "error",
        tag,
        message: "Tag duplicates another entry with different casing.",
      });
    }
    seenLower.set(lower, tag);
    const value = tag.includes(":") ? tag.split(":").slice(1).join(":") : tag;
    for (const segment of value.split("/").filter(Boolean)) {
      const expected = request.abbrev[segment.toLowerCase()];
      if (expected && segment !== expected) {
        warnings.push({
          code: "abbrev_case_error",
          severity: "error",
          tag,
          message: "Registered abbreviation segment uses non-canonical casing.",
        });
      }
    }
    if (
      entry.deprecated &&
      entry.replacement &&
      !knownTags.has(entry.replacement)
    ) {
      warnings.push({
        code: "missing_replacement",
        severity: "warning",
        tag,
        message: "Deprecated replacement tag is not present in the vocabulary.",
      });
    }
    const processedCount = index + 1;
    if (shouldCheckpoint(processedCount, totalCount, interval)) {
      checkpoint(options, "entries", processedCount, totalCount);
    }
  }
  let processedAliases = 0;
  const aliasTotal = Object.keys(request.aliases).length;
  for (const [alias, tag] of Object.entries(request.aliases)) {
    if (!knownTags.has(tag)) {
      warnings.push({
        code: "alias_target_missing",
        severity: "error",
        tag: alias,
        message: "Alias target is not present in the vocabulary.",
      });
    }
    processedAliases += 1;
    if (shouldCheckpoint(processedAliases, aliasTotal, interval)) {
      checkpoint(options, "aliases", processedAliases, aliasTotal);
    }
  }
  if (includeBoundaryCheckpoints) {
    checkpoint(options, "complete", totalCount, totalCount);
  }
  return warnings;
}

function computeValidation(
  request: SynthesisTagVocabularyValidationRequest,
  options: SynthesisTagVocabularyEngineOptions,
): SynthesisTagVocabularyValidationResult {
  return {
    contractVersion: SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
    warnings: validateCanonicalRequest(request, options),
  };
}

function computeIndex(
  request: SynthesisTagVocabularyIndexRequest,
  options: SynthesisTagVocabularyEngineOptions,
): SynthesisTagVocabularyIndexResult {
  const interval = Math.max(
    1,
    Math.floor(
      options.checkpointInterval ??
        SYNTHESIS_TAG_VOCABULARY_CHECKPOINT_INTERVAL,
    ),
  );
  checkpoint(options, "start", 0, request.entries.length);
  const warnings = validateCanonicalRequest(request, options, false);
  const tags = request.entries
    .filter((entry) => !entry.deprecated)
    .map((entry) => entry.tag)
    .sort((left, right) =>
      left.localeCompare(right, "en", { sensitivity: "base" }),
    );
  const search: SynthesisTagVocabularyIndexSearchRow[] = [];
  for (let index = 0; index < request.entries.length; index += 1) {
    const entry = request.entries[index];
    search.push({
      tag: entry.tag,
      normalized:
        `${entry.tag} ${entry.note || ""} ${entry.aliases.join(" ")} ${entry.abbrev.join(" ")}`.toLowerCase(),
      facet: entry.facet,
      aliases: [...entry.aliases],
      abbrev: [...entry.abbrev],
    });
    const processedCount = index + 1;
    if (shouldCheckpoint(processedCount, request.entries.length, interval)) {
      checkpoint(options, "search", processedCount, request.entries.length);
    }
  }
  checkpoint(
    options,
    "complete",
    request.entries.length,
    request.entries.length,
  );
  return {
    contractVersion: SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
    schemaVersion: SYNTHESIS_TAG_VOCABULARY_INDEX_SCHEMA_VERSION,
    sourceManifestHash: request.sourceManifestHash,
    rebuiltAt: request.rebuiltAt,
    tags,
    aliases: { ...request.aliases },
    abbrev: { ...request.abbrev },
    search,
    validationWarnings: warnings,
  };
}

function rebuildWarning(
  input: unknown,
  index: number,
  bounds: ResolvedBounds,
): SynthesisTagVocabularyWarning {
  const row = objectValue(input, `warnings[${index}]`);
  if (row.severity !== "warning" && row.severity !== "error") {
    invalid(`warnings[${index}].severity is invalid`);
  }
  const warning: SynthesisTagVocabularyWarning = {
    code: cleanString(row.code, `warnings[${index}].code`, bounds),
    severity: row.severity,
    message: cleanString(row.message, `warnings[${index}].message`, bounds),
  };
  const tag = cleanString(row.tag, `warnings[${index}].tag`, bounds, {
    optional: true,
  });
  if (tag) {
    warning.tag = tag;
  }
  return warning;
}

function rebuildWarnings(
  input: unknown,
  bounds: ResolvedBounds,
): SynthesisTagVocabularyWarning[] {
  return arrayValue(input, "warnings").map((warning, index) =>
    rebuildWarning(warning, index, bounds),
  );
}

function canonicalJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalJsonValue);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalJsonValue(value[key])]),
    );
  }
  return value;
}

function sameJson(left: unknown, right: unknown) {
  return (
    JSON.stringify(canonicalJsonValue(left)) ===
    JSON.stringify(canonicalJsonValue(right))
  );
}

export function rebuildSynthesisTagVocabularyValidationResult(
  input: unknown,
  requestInput: unknown,
  bounds: SynthesisTagVocabularyContractBounds = {},
): SynthesisTagVocabularyValidationResult {
  assertJsonSafe(input, "result");
  const resolved = resolveBounds(bounds);
  const request = rebuildSynthesisTagVocabularyValidationRequest(
    requestInput,
    bounds,
  );
  const row = objectValue(input, "result");
  if (
    row.contractVersion !== SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION ||
    row.algorithmVersion !== SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION
  ) {
    invalid("validation result version is invalid");
  }
  const rebuilt: SynthesisTagVocabularyValidationResult = {
    contractVersion: SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
    warnings: rebuildWarnings(row.warnings, resolved),
  };
  const expected = computeValidation(request, {});
  if (!sameJson(rebuilt, expected)) {
    invalid("validation result does not match the request");
  }
  return rebuilt;
}

function rebuildSearchRow(
  input: unknown,
  index: number,
  bounds: ResolvedBounds,
): SynthesisTagVocabularyIndexSearchRow {
  const row = objectValue(input, `search[${index}]`);
  return {
    tag: cleanString(row.tag, `search[${index}].tag`, bounds),
    normalized: boundedString(
      row.normalized,
      `search[${index}].normalized`,
      bounds,
    ),
    facet: cleanString(row.facet, `search[${index}].facet`, bounds),
    aliases: normalizeStringArray(
      row.aliases,
      `search[${index}].aliases`,
      bounds,
    ),
    abbrev: normalizeStringArray(row.abbrev, `search[${index}].abbrev`, bounds),
  };
}

export function rebuildSynthesisTagVocabularyIndexResult(
  input: unknown,
  requestInput: unknown,
  bounds: SynthesisTagVocabularyContractBounds = {},
): SynthesisTagVocabularyIndexResult {
  assertJsonSafe(input, "result");
  const resolved = resolveBounds(bounds);
  const request = rebuildSynthesisTagVocabularyIndexRequest(
    requestInput,
    bounds,
  );
  const row = objectValue(input, "result");
  if (
    row.contractVersion !== SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION ||
    row.algorithmVersion !== SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION ||
    row.schemaVersion !== SYNTHESIS_TAG_VOCABULARY_INDEX_SCHEMA_VERSION
  ) {
    invalid("index result version is invalid");
  }
  const tags = arrayValue(row.tags, "tags").map((tag, index) =>
    cleanString(tag, `tags[${index}]`, resolved),
  );
  const search = arrayValue(row.search, "search").map((entry, index) =>
    rebuildSearchRow(entry, index, resolved),
  );
  const rebuilt: SynthesisTagVocabularyIndexResult = {
    contractVersion: SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
    schemaVersion: SYNTHESIS_TAG_VOCABULARY_INDEX_SCHEMA_VERSION,
    sourceManifestHash: cleanString(
      row.sourceManifestHash,
      "sourceManifestHash",
      resolved,
    ),
    rebuiltAt: cleanString(row.rebuiltAt, "rebuiltAt", resolved),
    tags,
    aliases: rebuildStringRecord(
      row.aliases,
      "aliases",
      resolved.globalAliasMax,
      resolved,
    ),
    abbrev: rebuildStringRecord(
      row.abbrev,
      "abbrev",
      resolved.abbrevMax,
      resolved,
      { lowercaseKeys: true },
    ),
    search,
    validationWarnings: rebuildWarnings(row.validationWarnings, resolved),
  };
  const expected = computeIndex(request, {});
  if (!sameJson(rebuilt, expected)) {
    invalid("index result does not match the request");
  }
  return rebuilt;
}

export function createInProcessSynthesisTagVocabularyEngine(
  options: SynthesisTagVocabularyEngineOptions = {},
): SynthesisTagVocabularyEngine {
  return {
    validate(request) {
      const canonical = rebuildSynthesisTagVocabularyValidationRequest(request);
      return computeValidation(canonical, options);
    },
    buildIndex(request) {
      const canonical = rebuildSynthesisTagVocabularyIndexRequest(request);
      return computeIndex(canonical, options);
    },
  };
}
