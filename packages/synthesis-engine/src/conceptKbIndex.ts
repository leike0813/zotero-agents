import { compareSynthesisContractStrings } from "../../synthesis-contracts/src/canonicalJson.js";

export const SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION =
  "synthesis-concept-kb-index.v1" as const;
export const SYNTHESIS_CONCEPT_KB_INDEX_VERSION =
  "concept-kb-index.v1" as const;
export const SYNTHESIS_CONCEPT_KB_QUERY_VERSION =
  "concept-kb-query.v1" as const;
export const SYNTHESIS_CONCEPT_KB_INDEX_SCHEMA_VERSION = "1.0.0" as const;

export const SYNTHESIS_CONCEPT_KB_CONCEPT_MAX = 25_000;
export const SYNTHESIS_CONCEPT_KB_SENSE_MAX = 100_000;
export const SYNTHESIS_CONCEPT_KB_ALIAS_MAX = 250_000;
export const SYNTHESIS_CONCEPT_KB_PER_CONCEPT_ALIAS_MAX = 256;
export const SYNTHESIS_CONCEPT_KB_QUERY_LABEL_MAX = 100;
export const SYNTHESIS_CONCEPT_KB_STRING_MAX = 4096;
export const SYNTHESIS_CONCEPT_KB_CHECKPOINT_INTERVAL = 256;

type SynthesisConceptKbSource = {
  concepts: SynthesisConceptKbIndexConcept[];
  senses: SynthesisConceptKbIndexSense[];
  aliases: SynthesisConceptKbIndexAlias[];
};

export type SynthesisConceptKbIndexCheckpoint = {
  phase: "start" | "concepts" | "senses" | "aliases" | "labels" | "complete";
  processedCount: number;
  totalCount: number;
};

export type SynthesisConceptKbIndexEngineOptions = {
  checkpoint?: (checkpoint: SynthesisConceptKbIndexCheckpoint) => void;
  checkpointInterval?: number;
};

export interface SynthesisConceptKbIndexEngine {
  buildIndex(
    request: SynthesisConceptKbIndexRequest,
  ): Promise<SynthesisConceptKbIndexResult>;
  query(
    request: SynthesisConceptKbQueryRequest,
  ): Promise<SynthesisConceptKbQueryResult>;
}

export class SynthesisConceptKbIndexContractError extends Error {
  readonly code = "invalid_request";

  constructor(message: string) {
    super(message);
    this.name = "SynthesisConceptKbIndexContractError";
  }
}

export type SynthesisConceptKbIndexContractBounds = {
  conceptMax?: number;
  senseMax?: number;
  aliasMax?: number;
  perConceptAliasMax?: number;
  queryLabelMax?: number;
  stringMax?: number;
};

type ResolvedBounds = {
  conceptMax: number;
  senseMax: number;
  aliasMax: number;
  perConceptAliasMax: number;
  queryLabelMax: number;
  stringMax: number;
};

function invalid(message: string): never {
  throw new SynthesisConceptKbIndexContractError(message);
}

function resolveBounds(
  bounds: SynthesisConceptKbIndexContractBounds = {},
): ResolvedBounds {
  return {
    conceptMax: bounds.conceptMax ?? SYNTHESIS_CONCEPT_KB_CONCEPT_MAX,
    senseMax: bounds.senseMax ?? SYNTHESIS_CONCEPT_KB_SENSE_MAX,
    aliasMax: bounds.aliasMax ?? SYNTHESIS_CONCEPT_KB_ALIAS_MAX,
    perConceptAliasMax:
      bounds.perConceptAliasMax ?? SYNTHESIS_CONCEPT_KB_PER_CONCEPT_ALIAS_MAX,
    queryLabelMax: bounds.queryLabelMax ?? SYNTHESIS_CONCEPT_KB_QUERY_LABEL_MAX,
    stringMax: bounds.stringMax ?? SYNTHESIS_CONCEPT_KB_STRING_MAX,
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
  location: string,
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

function requiredString(
  value: unknown,
  location: string,
  bounds: ResolvedBounds,
) {
  if (typeof value !== "string") {
    return invalid(`${location} must be a string`);
  }
  const cleaned = value.trim();
  if (!cleaned) {
    return invalid(`${location} must not be empty`);
  }
  if (cleaned.length > bounds.stringMax) {
    return invalid(`${location} exceeds the string bound`);
  }
  return cleaned;
}

function optionalString(
  value: unknown,
  location: string,
  bounds: ResolvedBounds,
) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return requiredString(value, location, bounds);
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

function stringArray(
  value: unknown,
  location: string,
  max: number,
  bounds: ResolvedBounds,
  options: { preserveOrder?: boolean } = {},
) {
  const rows = arrayValue(value, location);
  if (rows.length > max) {
    return invalid(`${location} exceeds its collection bound`);
  }
  const result: string[] = [];
  const seen = new Set<string>();
  rows.forEach((entry, index) => {
    const rebuilt = requiredString(entry, `${location}[${index}]`, bounds);
    if (seen.has(rebuilt)) {
      invalid(`${location} contains duplicate values`);
    }
    seen.add(rebuilt);
    result.push(rebuilt);
  });
  return options.preserveOrder
    ? result
    : result.sort(compareSynthesisContractStrings);
}

function conceptStatus(
  value: unknown,
  location: string,
): SynthesisConceptKbConceptStatus {
  if (value === "active" || value === "review" || value === "deprecated") {
    return value;
  }
  return invalid(`${location} is invalid`);
}

function confidence(
  value: unknown,
  location: string,
): SynthesisConceptKbConfidence {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return invalid(`${location} is invalid`);
}

function rebuildConcept(
  input: unknown,
  index: number,
  bounds: ResolvedBounds,
): SynthesisConceptKbIndexConcept {
  const row = objectValue(input, `concepts[${index}]`);
  const rebuilt: SynthesisConceptKbIndexConcept = {
    conceptId: requiredString(
      row.conceptId,
      `concepts[${index}].conceptId`,
      bounds,
    ),
    label: requiredString(row.label, `concepts[${index}].label`, bounds),
    aliases: stringArray(
      row.aliases,
      `concepts[${index}].aliases`,
      bounds.perConceptAliasMax,
      bounds,
      { preserveOrder: true },
    ),
    conceptType: requiredString(
      row.conceptType,
      `concepts[${index}].conceptType`,
      bounds,
    ),
    domain: requiredString(row.domain, `concepts[${index}].domain`, bounds),
    status: conceptStatus(row.status, `concepts[${index}].status`),
  };
  const shortDefinition = optionalString(
    row.shortDefinition,
    `concepts[${index}].shortDefinition`,
    bounds,
  );
  const definition = optionalString(
    row.definition,
    `concepts[${index}].definition`,
    bounds,
  );
  if (shortDefinition) {
    rebuilt.shortDefinition = shortDefinition;
  }
  if (definition) {
    rebuilt.definition = definition;
  }
  return rebuilt;
}

function rebuildSense(
  input: unknown,
  index: number,
  bounds: ResolvedBounds,
): SynthesisConceptKbIndexSense {
  const row = objectValue(input, `senses[${index}]`);
  const rebuilt: SynthesisConceptKbIndexSense = {
    senseId: requiredString(row.senseId, `senses[${index}].senseId`, bounds),
    conceptId: requiredString(
      row.conceptId,
      `senses[${index}].conceptId`,
      bounds,
    ),
    label: requiredString(row.label, `senses[${index}].label`, bounds),
    confidence: confidence(row.confidence, `senses[${index}].confidence`),
  };
  const shortDefinition = optionalString(
    row.shortDefinition,
    `senses[${index}].shortDefinition`,
    bounds,
  );
  const definition = optionalString(
    row.definition,
    `senses[${index}].definition`,
    bounds,
  );
  if (shortDefinition) {
    rebuilt.shortDefinition = shortDefinition;
  }
  if (definition) {
    rebuilt.definition = definition;
  }
  return rebuilt;
}

function rebuildAlias(
  input: unknown,
  index: number,
  bounds: ResolvedBounds,
): SynthesisConceptKbIndexAlias {
  const row = objectValue(input, `aliases[${index}]`);
  const rebuilt: SynthesisConceptKbIndexAlias = {
    aliasId: requiredString(row.aliasId, `aliases[${index}].aliasId`, bounds),
    alias: requiredString(row.alias, `aliases[${index}].alias`, bounds),
    normalized: requiredString(
      row.normalized,
      `aliases[${index}].normalized`,
      bounds,
    ),
    conceptId: requiredString(
      row.conceptId,
      `aliases[${index}].conceptId`,
      bounds,
    ),
    status: conceptStatus(row.status, `aliases[${index}].status`),
    confidence: confidence(row.confidence, `aliases[${index}].confidence`),
  };
  const senseId = optionalString(
    row.senseId,
    `aliases[${index}].senseId`,
    bounds,
  );
  if (senseId) {
    rebuilt.senseId = senseId;
  }
  return rebuilt;
}

function uniqueIds<T>(rows: T[], idOf: (row: T) => string, location: string) {
  const seen = new Set<string>();
  for (const row of rows) {
    const id = idOf(row);
    if (seen.has(id)) {
      invalid(`${location} contains duplicate identifiers`);
    }
    seen.add(id);
  }
}

function rebuildSource(
  row: Record<string, unknown>,
  bounds: ResolvedBounds,
): SynthesisConceptKbSource {
  const rawConcepts = arrayValue(row.concepts, "concepts");
  const rawSenses = arrayValue(row.senses, "senses");
  const rawAliases = arrayValue(row.aliases, "aliases");
  if (rawConcepts.length > bounds.conceptMax) {
    invalid("concepts exceeds its collection bound");
  }
  if (rawSenses.length > bounds.senseMax) {
    invalid("senses exceeds its collection bound");
  }
  if (rawAliases.length > bounds.aliasMax) {
    invalid("aliases exceeds its collection bound");
  }
  const concepts = rawConcepts
    .map((entry, index) => rebuildConcept(entry, index, bounds))
    .sort(
      (left, right) =>
        compareSynthesisContractStrings(left.label, right.label) ||
        compareSynthesisContractStrings(left.conceptId, right.conceptId),
    );
  const senses = rawSenses
    .map((entry, index) => rebuildSense(entry, index, bounds))
    .sort(
      (left, right) =>
        compareSynthesisContractStrings(left.label, right.label) ||
        compareSynthesisContractStrings(left.senseId, right.senseId),
    );
  const aliases = rawAliases
    .map((entry, index) => rebuildAlias(entry, index, bounds))
    .sort(
      (left, right) =>
        compareSynthesisContractStrings(left.normalized, right.normalized) ||
        compareSynthesisContractStrings(left.aliasId, right.aliasId),
    );
  uniqueIds(concepts, (entry) => entry.conceptId, "concepts");
  uniqueIds(senses, (entry) => entry.senseId, "senses");
  uniqueIds(aliases, (entry) => entry.aliasId, "aliases");

  const conceptsById = new Set(concepts.map((entry) => entry.conceptId));
  const sensesById = new Map(senses.map((entry) => [entry.senseId, entry]));
  for (const sense of senses) {
    if (!conceptsById.has(sense.conceptId)) {
      invalid(`sense ${sense.senseId} references a missing concept`);
    }
  }
  for (const alias of aliases) {
    if (!conceptsById.has(alias.conceptId)) {
      invalid(`alias ${alias.aliasId} references a missing concept`);
    }
    if (alias.senseId) {
      const sense = sensesById.get(alias.senseId);
      if (!sense || sense.conceptId !== alias.conceptId) {
        invalid(`alias ${alias.aliasId} references an invalid sense`);
      }
    }
  }
  return { concepts, senses, aliases };
}

export function rebuildSynthesisConceptKbIndexRequest(
  input: unknown,
  bounds: SynthesisConceptKbIndexContractBounds = {},
): SynthesisConceptKbIndexRequest {
  assertJsonSafe(input, "request");
  const resolved = resolveBounds(bounds);
  const row = objectValue(input, "request");
  if (
    row.contractVersion !== SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION ||
    row.algorithmVersion !== SYNTHESIS_CONCEPT_KB_INDEX_VERSION
  ) {
    invalid("index request version is invalid");
  }
  return {
    contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_CONCEPT_KB_INDEX_VERSION,
    ...rebuildSource(row, resolved),
    sourceManifestHash: requiredString(
      row.sourceManifestHash,
      "sourceManifestHash",
      resolved,
    ),
    rebuiltAt: requiredString(row.rebuiltAt, "rebuiltAt", resolved),
  };
}

export function rebuildSynthesisConceptKbQueryRequest(
  input: unknown,
  bounds: SynthesisConceptKbIndexContractBounds = {},
): SynthesisConceptKbQueryRequest {
  assertJsonSafe(input, "request");
  const resolved = resolveBounds(bounds);
  const row = objectValue(input, "request");
  if (
    row.contractVersion !== SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION ||
    row.algorithmVersion !== SYNTHESIS_CONCEPT_KB_QUERY_VERSION
  ) {
    invalid("query request version is invalid");
  }
  return {
    contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_CONCEPT_KB_QUERY_VERSION,
    ...rebuildSource(row, resolved),
    labels: stringArray(
      row.labels,
      "labels",
      resolved.queryLabelMax,
      resolved,
      { preserveOrder: true },
    ),
  };
}

function checkpoint(
  options: SynthesisConceptKbIndexEngineOptions,
  phase: SynthesisConceptKbIndexCheckpoint["phase"],
  processedCount: number,
  totalCount: number,
  force = false,
) {
  const interval = Math.max(
    1,
    Math.floor(
      options.checkpointInterval ?? SYNTHESIS_CONCEPT_KB_CHECKPOINT_INTERVAL,
    ),
  );
  if (force || processedCount % interval === 0) {
    options.checkpoint?.({ phase, processedCount, totalCount });
  }
}

function normalizedKey(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function computeIndex(
  request: SynthesisConceptKbIndexRequest,
  options: SynthesisConceptKbIndexEngineOptions,
): SynthesisConceptKbIndexResult {
  const totalCount =
    request.concepts.length + request.senses.length + request.aliases.length;
  let processedCount = 0;
  checkpoint(options, "start", 0, totalCount, true);

  const search = request.concepts.map((concept) => {
    processedCount += 1;
    checkpoint(options, "concepts", processedCount, totalCount);
    return {
      conceptId: concept.conceptId,
      label: concept.label,
      normalized:
        `${concept.label} ${concept.aliases.join(" ")} ${concept.shortDefinition || ""} ${concept.definition || ""}`.toLowerCase(),
      conceptType: concept.conceptType,
      domain: concept.domain,
    };
  });
  const conceptsById = new Map(
    request.concepts.map((entry) => [entry.conceptId, entry]),
  );
  const sensesById = new Map(
    request.senses.map((entry) => {
      processedCount += 1;
      checkpoint(options, "senses", processedCount, totalCount);
      return [entry.senseId, entry] as const;
    }),
  );
  const aliasesByNormalized = new Map<string, SynthesisConceptKbIndexAlias[]>();
  for (const alias of request.aliases) {
    processedCount += 1;
    checkpoint(options, "aliases", processedCount, totalCount);
    aliasesByNormalized.set(alias.normalized, [
      ...(aliasesByNormalized.get(alias.normalized) || []),
      alias,
    ]);
  }
  const overlayEntries: SynthesisConceptKbOverlayEntry[] = [];
  for (const alias of request.aliases) {
    if (alias.status !== "active" || alias.confidence === "low") {
      continue;
    }
    const matching = aliasesByNormalized.get(alias.normalized) || [];
    if (new Set(matching.map((entry) => entry.conceptId)).size > 1) {
      continue;
    }
    const concept = conceptsById.get(alias.conceptId);
    const sense = alias.senseId ? sensesById.get(alias.senseId) : undefined;
    if (!concept || concept.status !== "active") {
      continue;
    }
    const entry: SynthesisConceptKbOverlayEntry = {
      conceptId: concept.conceptId,
      alias: alias.alias,
      label: concept.label,
      confidence: alias.confidence,
    };
    if (alias.senseId) {
      entry.senseId = alias.senseId;
    }
    const shortDefinition = sense?.shortDefinition || concept.shortDefinition;
    const definition = sense?.definition || concept.definition;
    if (shortDefinition) {
      entry.shortDefinition = shortDefinition;
    }
    if (definition) {
      entry.definition = definition;
    }
    overlayEntries.push(entry);
  }
  overlayEntries.sort(
    (left, right) =>
      right.alias.length - left.alias.length ||
      compareSynthesisContractStrings(left.alias, right.alias),
  );
  checkpoint(options, "complete", totalCount, totalCount, true);
  return {
    contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_CONCEPT_KB_INDEX_VERSION,
    schemaVersion: SYNTHESIS_CONCEPT_KB_INDEX_SCHEMA_VERSION,
    sourceManifestHash: request.sourceManifestHash,
    rebuiltAt: request.rebuiltAt,
    search,
    overlayEntries,
  };
}

function computeQuery(
  request: SynthesisConceptKbQueryRequest,
  options: SynthesisConceptKbIndexEngineOptions,
): SynthesisConceptKbQueryResult {
  const totalCount =
    request.concepts.length +
    request.senses.length +
    request.aliases.length +
    request.labels.length;
  let processedCount = 0;
  checkpoint(options, "start", 0, totalCount, true);
  const conceptsByKey = new Map<string, SynthesisConceptKbIndexConcept[]>();
  for (const concept of request.concepts) {
    processedCount += 1;
    checkpoint(options, "concepts", processedCount, totalCount);
    const key = normalizedKey(concept.label);
    conceptsByKey.set(key, [...(conceptsByKey.get(key) || []), concept]);
  }
  for (const sense of request.senses) {
    processedCount += 1;
    checkpoint(options, "senses", processedCount, totalCount);
  }
  const aliasesByKey = new Map<string, SynthesisConceptKbIndexAlias[]>();
  for (const alias of request.aliases) {
    processedCount += 1;
    checkpoint(options, "aliases", processedCount, totalCount);
    const key = normalizedKey(alias.alias);
    aliasesByKey.set(key, [...(aliasesByKey.get(key) || []), alias]);
  }
  const matches = request.labels.map((label) => {
    processedCount += 1;
    checkpoint(options, "labels", processedCount, totalCount);
    const key = normalizedKey(label);
    const exactConceptIds = (conceptsByKey.get(key) || []).map(
      (concept) => concept.conceptId,
    );
    const aliasMatches = (aliasesByKey.get(key) || []).map((alias) => ({
      aliasId: alias.aliasId,
      conceptId: alias.conceptId,
    }));
    const candidateConceptIds = new Set([
      ...exactConceptIds,
      ...aliasMatches.map((entry) => entry.conceptId),
    ]);
    const senseIds = request.senses
      .filter((sense) => candidateConceptIds.has(sense.conceptId))
      .map((sense) => sense.senseId);
    return {
      label,
      exactConceptIds,
      aliasMatches,
      senseIds,
      ambiguous: candidateConceptIds.size > 1,
    };
  });
  checkpoint(options, "complete", totalCount, totalCount, true);
  return {
    contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_CONCEPT_KB_QUERY_VERSION,
    matches,
  };
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function rebuildSearchRow(
  input: unknown,
  index: number,
  bounds: ResolvedBounds,
): SynthesisConceptKbIndexSearchRow {
  const row = objectValue(input, `search[${index}]`);
  return {
    conceptId: requiredString(
      row.conceptId,
      `search[${index}].conceptId`,
      bounds,
    ),
    label: requiredString(row.label, `search[${index}].label`, bounds),
    normalized: boundedString(
      row.normalized,
      `search[${index}].normalized`,
      bounds,
    ),
    conceptType: requiredString(
      row.conceptType,
      `search[${index}].conceptType`,
      bounds,
    ),
    domain: requiredString(row.domain, `search[${index}].domain`, bounds),
  };
}

function rebuildOverlayEntry(
  input: unknown,
  index: number,
  bounds: ResolvedBounds,
): SynthesisConceptKbOverlayEntry {
  const row = objectValue(input, `overlayEntries[${index}]`);
  const rebuilt: SynthesisConceptKbOverlayEntry = {
    conceptId: requiredString(
      row.conceptId,
      `overlayEntries[${index}].conceptId`,
      bounds,
    ),
    alias: requiredString(row.alias, `overlayEntries[${index}].alias`, bounds),
    label: requiredString(row.label, `overlayEntries[${index}].label`, bounds),
    confidence: confidence(
      row.confidence,
      `overlayEntries[${index}].confidence`,
    ),
  };
  const senseId = optionalString(
    row.senseId,
    `overlayEntries[${index}].senseId`,
    bounds,
  );
  const shortDefinition = optionalString(
    row.shortDefinition,
    `overlayEntries[${index}].shortDefinition`,
    bounds,
  );
  const definition = optionalString(
    row.definition,
    `overlayEntries[${index}].definition`,
    bounds,
  );
  if (senseId) {
    rebuilt.senseId = senseId;
  }
  if (shortDefinition) {
    rebuilt.shortDefinition = shortDefinition;
  }
  if (definition) {
    rebuilt.definition = definition;
  }
  return rebuilt;
}

export function rebuildSynthesisConceptKbIndexResult(
  input: unknown,
  requestInput: unknown,
  bounds: SynthesisConceptKbIndexContractBounds = {},
): SynthesisConceptKbIndexResult {
  assertJsonSafe(input, "result");
  const resolved = resolveBounds(bounds);
  const request = rebuildSynthesisConceptKbIndexRequest(requestInput, bounds);
  const row = objectValue(input, "result");
  if (
    row.contractVersion !== SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION ||
    row.algorithmVersion !== SYNTHESIS_CONCEPT_KB_INDEX_VERSION ||
    row.schemaVersion !== SYNTHESIS_CONCEPT_KB_INDEX_SCHEMA_VERSION
  ) {
    invalid("index result version is invalid");
  }
  const rebuilt: SynthesisConceptKbIndexResult = {
    contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_CONCEPT_KB_INDEX_VERSION,
    schemaVersion: SYNTHESIS_CONCEPT_KB_INDEX_SCHEMA_VERSION,
    sourceManifestHash: requiredString(
      row.sourceManifestHash,
      "sourceManifestHash",
      resolved,
    ),
    rebuiltAt: requiredString(row.rebuiltAt, "rebuiltAt", resolved),
    search: arrayValue(row.search, "search").map((entry, index) =>
      rebuildSearchRow(entry, index, resolved),
    ),
    overlayEntries: arrayValue(row.overlayEntries, "overlayEntries").map(
      (entry, index) => rebuildOverlayEntry(entry, index, resolved),
    ),
  };
  if (!sameJson(rebuilt, computeIndex(request, {}))) {
    invalid("index result does not match the request");
  }
  return rebuilt;
}

function rebuildQueryMatch(
  input: unknown,
  index: number,
  bounds: ResolvedBounds,
): SynthesisConceptKbQueryMatch {
  const row = objectValue(input, `matches[${index}]`);
  const aliasMatches = arrayValue(
    row.aliasMatches,
    `matches[${index}].aliasMatches`,
  ).map((entry, aliasIndex) => {
    const alias = objectValue(
      entry,
      `matches[${index}].aliasMatches[${aliasIndex}]`,
    );
    return {
      aliasId: requiredString(
        alias.aliasId,
        `matches[${index}].aliasMatches[${aliasIndex}].aliasId`,
        bounds,
      ),
      conceptId: requiredString(
        alias.conceptId,
        `matches[${index}].aliasMatches[${aliasIndex}].conceptId`,
        bounds,
      ),
    };
  });
  if (typeof row.ambiguous !== "boolean") {
    invalid(`matches[${index}].ambiguous must be boolean`);
  }
  return {
    label: requiredString(row.label, `matches[${index}].label`, bounds),
    exactConceptIds: stringArray(
      row.exactConceptIds,
      `matches[${index}].exactConceptIds`,
      bounds.conceptMax,
      bounds,
      { preserveOrder: true },
    ),
    aliasMatches,
    senseIds: stringArray(
      row.senseIds,
      `matches[${index}].senseIds`,
      bounds.senseMax,
      bounds,
      { preserveOrder: true },
    ),
    ambiguous: row.ambiguous,
  };
}

export function rebuildSynthesisConceptKbQueryResult(
  input: unknown,
  requestInput: unknown,
  bounds: SynthesisConceptKbIndexContractBounds = {},
): SynthesisConceptKbQueryResult {
  assertJsonSafe(input, "result");
  const resolved = resolveBounds(bounds);
  const request = rebuildSynthesisConceptKbQueryRequest(requestInput, bounds);
  const row = objectValue(input, "result");
  if (
    row.contractVersion !== SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION ||
    row.algorithmVersion !== SYNTHESIS_CONCEPT_KB_QUERY_VERSION
  ) {
    invalid("query result version is invalid");
  }
  const rebuilt: SynthesisConceptKbQueryResult = {
    contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_CONCEPT_KB_QUERY_VERSION,
    matches: arrayValue(row.matches, "matches").map((entry, index) =>
      rebuildQueryMatch(entry, index, resolved),
    ),
  };
  if (!sameJson(rebuilt, computeQuery(request, {}))) {
    invalid("query result does not match the request");
  }
  return rebuilt;
}

export function createInProcessSynthesisConceptKbIndexEngine(
  options: SynthesisConceptKbIndexEngineOptions = {},
): SynthesisConceptKbIndexEngine {
  return {
    async buildIndex(request) {
      const canonical = rebuildSynthesisConceptKbIndexRequest(request);
      return computeIndex(canonical, options);
    },
    async query(request) {
      const canonical = rebuildSynthesisConceptKbQueryRequest(request);
      return computeQuery(canonical, options);
    },
  };
}
import type {
  SynthesisConceptKbConceptStatus,
  SynthesisConceptKbConfidence,
  SynthesisConceptKbIndexAlias,
  SynthesisConceptKbIndexConcept,
  SynthesisConceptKbIndexRequest,
  SynthesisConceptKbIndexResult,
  SynthesisConceptKbIndexSearchRow,
  SynthesisConceptKbIndexSense,
  SynthesisConceptKbOverlayEntry,
  SynthesisConceptKbQueryAliasMatch,
  SynthesisConceptKbQueryMatch,
  SynthesisConceptKbQueryRequest,
  SynthesisConceptKbQueryResult,
} from "../../synthesis-contracts/src/conceptKbCore.js";

export type {
  SynthesisConceptKbConceptStatus,
  SynthesisConceptKbConfidence,
  SynthesisConceptKbIndexAlias,
  SynthesisConceptKbIndexConcept,
  SynthesisConceptKbIndexRequest,
  SynthesisConceptKbIndexResult,
  SynthesisConceptKbIndexSearchRow,
  SynthesisConceptKbIndexSense,
  SynthesisConceptKbOverlayEntry,
  SynthesisConceptKbQueryAliasMatch,
  SynthesisConceptKbQueryMatch,
  SynthesisConceptKbQueryRequest,
  SynthesisConceptKbQueryResult,
};
