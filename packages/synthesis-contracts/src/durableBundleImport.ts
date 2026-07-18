import {
  SYNTHESIS_DURABLE_BUNDLE_LIMITS,
  SYNTHESIS_DURABLE_ENTITY_KINDS,
  type SynthesisDurableAssetEnvelope,
  type SynthesisDurableEntityKind,
} from "./durableBundle.js";

export const SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION = "1.0.0";
export const SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_ID =
  "synthesis.durable_sync_index" as const;

export type SynthesisDurableLiveEntityKind = Exclude<
  SynthesisDurableEntityKind,
  "tombstone"
>;

export type SynthesisDurableSyncIndexEntry = {
  entity_id: string;
  entity_kind: SynthesisDurableLiveEntityKind;
  path: string;
  last_synced_hash: string;
  last_exported_hash?: string;
  last_imported_hash?: string;
  last_run_id?: string;
  updated_at: string;
};

export type SynthesisDurableSyncIndex = {
  schema_id: typeof SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_ID;
  schema_version: typeof SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION;
  updated_at: string;
  entities: Record<string, SynthesisDurableSyncIndexEntry>;
};

export type SynthesisDurableImportFact = {
  entityKind: SynthesisDurableEntityKind;
  entityId: string;
  path: string;
  hash: string;
};

export type SynthesisDurableImportConflict = {
  entityKind: SynthesisDurableLiveEntityKind;
  entityId: string;
  path: string;
  reason: "both_changed";
  baseHash: string;
  localHash: string;
  remoteHash: string;
};

export type SynthesisDurableImportClassification = {
  additions: number;
  updates: number;
  unbasedUpdates: number;
  unchanged: number;
  tombstones: number;
  conflicts: SynthesisDurableImportConflict[];
};

export type SynthesisDurableImportDiagnostic = {
  code: string;
  severity: "error";
  path?: string;
  entityKind?: SynthesisDurableEntityKind;
  entityId?: string;
};

export type SynthesisDurableImportPreview =
  SynthesisDurableImportClassification & {
    ok: boolean;
    manifestHash?: string;
    receiptId?: string;
    diagnostics: SynthesisDurableImportDiagnostic[];
  };

export type SynthesisDurableImportApplyRequest = {
  receiptId: string;
  manifestHash: string;
  acknowledgeUnbasedUpdates: boolean;
};

export type SynthesisDurableImportApplyResult = {
  status: "committed";
  manifestHash: string;
  imported: number;
};

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const LIVE_KINDS = new Set<SynthesisDurableEntityKind>(
  SYNTHESIS_DURABLE_ENTITY_KINDS.filter((kind) => kind !== "tombstone"),
);
const INDEX_FIELDS = ["schema_id", "schema_version", "updated_at", "entities"];
const ENTRY_FIELDS = [
  "entity_id",
  "entity_kind",
  "path",
  "last_synced_hash",
  "last_exported_hash",
  "last_imported_hash",
  "last_run_id",
  "updated_at",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function exactFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[] = allowed,
) {
  const keys = Object.keys(value);
  if (
    keys.some((key) => !allowed.includes(key)) ||
    required.some((key) => !keys.includes(key))
  ) {
    throw new Error("durable_sync_index_fields_invalid");
  }
}

function cleanString(value: unknown) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.string) {
    throw new Error("durable_import_string_invalid");
  }
  return result;
}

function hash(value: unknown, optional = false) {
  if (optional && value === undefined) return undefined;
  const result = cleanString(value);
  if (!HASH_PATTERN.test(result))
    throw new Error("durable_import_hash_invalid");
  return result;
}

export function synthesisDurableEntityKey(
  entityKind: SynthesisDurableEntityKind,
  entityId: string,
) {
  return `${entityKind}:${entityId}`;
}

function safePath(value: unknown) {
  const path = cleanString(value);
  if (
    path.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("durable_import_path_invalid");
  }
  return path;
}

export function rebuildSynthesisDurableSyncIndex(
  value: unknown,
): SynthesisDurableSyncIndex {
  if (!isRecord(value)) throw new Error("durable_sync_index_invalid");
  exactFields(value, INDEX_FIELDS);
  if (
    value.schema_id !== SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_ID ||
    value.schema_version !== SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION ||
    typeof value.updated_at !== "string" ||
    !isRecord(value.entities)
  ) {
    throw new Error("durable_sync_index_invalid");
  }
  const rows = Object.entries(value.entities);
  if (rows.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.entries) {
    throw new Error("durable_sync_index_limit_exceeded");
  }
  const entities: Record<string, SynthesisDurableSyncIndexEntry> = {};
  for (const [key, raw] of rows.sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (!isRecord(raw)) throw new Error("durable_sync_index_entry_invalid");
    exactFields(raw, ENTRY_FIELDS, [
      "entity_id",
      "entity_kind",
      "path",
      "last_synced_hash",
      "updated_at",
    ]);
    const entityKind = raw.entity_kind as SynthesisDurableEntityKind;
    if (!LIVE_KINDS.has(entityKind)) {
      throw new Error("durable_sync_index_entity_kind_invalid");
    }
    const entityId = cleanString(raw.entity_id);
    if (key !== synthesisDurableEntityKey(entityKind, entityId)) {
      throw new Error("durable_sync_index_key_invalid");
    }
    entities[key] = {
      entity_id: entityId,
      entity_kind: entityKind as SynthesisDurableLiveEntityKind,
      path: safePath(raw.path),
      last_synced_hash: hash(raw.last_synced_hash)!,
      ...(raw.last_exported_hash !== undefined
        ? { last_exported_hash: hash(raw.last_exported_hash)! }
        : {}),
      ...(raw.last_imported_hash !== undefined
        ? { last_imported_hash: hash(raw.last_imported_hash)! }
        : {}),
      ...(raw.last_run_id !== undefined
        ? { last_run_id: cleanString(raw.last_run_id) }
        : {}),
      updated_at: typeof raw.updated_at === "string" ? raw.updated_at : "",
    };
  }
  return {
    schema_id: SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_ID,
    schema_version: SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION,
    updated_at: value.updated_at,
    entities,
  };
}

const IDENTITY_FIELD: Partial<Record<SynthesisDurableLiveEntityKind, string>> =
  {
    concept: "conceptId",
    concept_sense: "senseId",
    concept_alias: "aliasId",
    concept_relation: "relationId",
    concept_review_item: "reviewId",
    topic_concept_links: "topicId",
    topic_graph_node: "topicId",
    topic_graph_edge: "edgeId",
    topic_graph_review_item: "reviewId",
    canonical_reference: "canonicalReferenceId",
    canonical_reference_redirect: "fromCanonicalReferenceId",
    reference_binding: "bindingId",
    reference_match_proposal: "proposalId",
    review_item: "reviewItemId",
    topic_interest_metadata: "topicId",
    topic_discovery_hint: "hintId",
    related_items_sync_effect: "effectId",
  };

const AGGREGATE_IDENTITIES: Partial<
  Record<SynthesisDurableLiveEntityKind, string>
> = {
  tag_vocabulary: "tag-vocabulary",
  tag_aliases: "tag-aliases",
  tag_abbrev: "tag-abbrev",
  tag_protocol: "tag-protocol",
};

const REQUIRED_STRING_FIELDS: Partial<
  Record<SynthesisDurableLiveEntityKind, readonly string[]>
> = {
  concept: ["conceptId", "label", "conceptType", "domain", "status"],
  concept_sense: ["senseId", "conceptId", "label", "domain", "confidence"],
  concept_alias: [
    "aliasId",
    "alias",
    "normalized",
    "conceptId",
    "status",
    "confidence",
  ],
  concept_relation: [
    "relationId",
    "sourceConceptId",
    "targetConceptId",
    "relation",
    "status",
    "confidence",
  ],
  concept_review_item: [
    "reviewId",
    "status",
    "reason",
    "topicId",
    "topicPathId",
    "label",
    "confidence",
  ],
  topic_graph_node: ["topicId", "title", "nodeType"],
  topic_graph_edge: [
    "edgeId",
    "sourceTopicId",
    "targetTopicId",
    "relation",
    "status",
  ],
  topic_graph_review_item: [
    "reviewId",
    "status",
    "sourceTopicId",
    "targetTopicId",
    "relation",
  ],
  canonical_reference: ["canonicalReferenceId"],
  canonical_reference_redirect: [
    "fromCanonicalReferenceId",
    "toCanonicalReferenceId",
  ],
  reference_binding: ["bindingId", "canonicalReferenceId", "status"],
  reference_match_proposal: [
    "proposalId",
    "kind",
    "status",
    "sourceCanonicalReferenceId",
  ],
  review_item: ["reviewItemId", "reviewKind", "status"],
  topic_interest_metadata: [
    "topicId",
    "schemaId",
    "includeTermsJson",
    "mustHaveTermsJson",
    "methodsJson",
    "excludeTermsJson",
    "seedLiteratureItemIdsJson",
  ],
  topic_discovery_hint: [
    "hintId",
    "topicId",
    "literatureItemId",
    "method",
    "matchingFieldsJson",
    "status",
  ],
  tag_protocol: ["protocolId", "version", "tagPattern", "facetsJson"],
  related_items_sync_effect: [
    "effectId",
    "operationId",
    "sourceItemKey",
    "targetItemKey",
    "action",
    "status",
  ],
};

function validateObjectRows(value: unknown, required: readonly string[]) {
  if (!Array.isArray(value)) {
    throw new Error("durable_import_payload_invalid");
  }
  for (const row of value) {
    if (!isRecord(row)) throw new Error("durable_import_payload_invalid");
    for (const field of required) payloadString(row[field]);
  }
}

function payloadString(value: unknown) {
  try {
    return cleanString(value);
  } catch {
    throw new Error("durable_import_payload_invalid");
  }
}

function validatePayloadScalars(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) validatePayloadScalars(entry);
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("durable_import_payload_invalid");
    }
    return;
  }
  for (const [field, entry] of Object.entries(value)) {
    if (field.endsWith("Json")) {
      if (typeof entry !== "string") {
        throw new Error("durable_import_payload_invalid");
      }
      try {
        JSON.parse(entry);
      } catch {
        throw new Error("durable_import_payload_invalid");
      }
    } else {
      validatePayloadScalars(entry);
    }
  }
}

function validateLivePayload(
  kind: SynthesisDurableLiveEntityKind,
  data: Record<string, unknown>,
) {
  validatePayloadScalars(data);
  for (const field of REQUIRED_STRING_FIELDS[kind] ?? []) {
    payloadString(data[field]);
  }
  if (
    kind === "review_item" &&
    (!Number.isInteger(data.priority) || Number(data.priority) < 0)
  ) {
    throw new Error("durable_import_payload_invalid");
  }
  if (kind === "topic_concept_links") {
    const topicId = payloadString(data.topicId);
    validateObjectRows(data.links, [
      "topicId",
      "conceptId",
      "senseId",
      "label",
      "confidence",
      "source",
    ]);
    if (
      (data.links as Array<Record<string, unknown>>).some(
        (row) => row.topicId !== topicId,
      )
    ) {
      throw new Error("durable_import_identity_mismatch");
    }
  }
  if (kind === "tag_vocabulary") {
    validateObjectRows(data.entries, ["tag", "facet"]);
  }
  if (kind === "tag_aliases") {
    validateObjectRows(data.aliases, ["alias", "tag"]);
  }
  if (kind === "tag_abbrev") {
    validateObjectRows(data.abbrev, ["abbrevKey", "abbrevValue"]);
  }
  if (
    kind === "tag_protocol" &&
    (!Number.isInteger(data.maxTagLength) || Number(data.maxTagLength) <= 0)
  ) {
    throw new Error("durable_import_payload_invalid");
  }
  if (kind === "topic_discovery_hint" && typeof data.score !== "number") {
    throw new Error("durable_import_payload_invalid");
  }
  if (
    kind === "related_items_sync_effect" &&
    (!Number.isInteger(data.sourceLibraryId) ||
      !Number.isInteger(data.targetLibraryId))
  ) {
    throw new Error("durable_import_payload_invalid");
  }
}

function normalizeLiveEnvelope(
  envelope: SynthesisDurableAssetEnvelope,
): SynthesisDurableAssetEnvelope {
  if (envelope.entity_kind === "tombstone") {
    throw new Error("tombstone_apply_unsupported");
  }
  const kind = envelope.entity_kind as SynthesisDurableLiveEntityKind;
  if (envelope.schema_id !== `synthesis.durable.${kind}`) {
    throw new Error("durable_import_schema_invalid");
  }
  if (!isRecord(envelope.data))
    throw new Error("durable_import_payload_invalid");
  validateLivePayload(kind, envelope.data);
  const aggregateId = AGGREGATE_IDENTITIES[kind];
  if (aggregateId && envelope.entity_id !== aggregateId) {
    throw new Error("durable_import_identity_mismatch");
  }
  if (kind === "tag_vocabulary" && !Array.isArray(envelope.data.entries))
    throw new Error("durable_import_payload_invalid");
  if (kind === "tag_aliases" && !Array.isArray(envelope.data.aliases))
    throw new Error("durable_import_payload_invalid");
  if (kind === "tag_abbrev" && !Array.isArray(envelope.data.abbrev))
    throw new Error("durable_import_payload_invalid");
  if (kind === "topic_current_asset") {
    const relativePath = safePath(envelope.data.relative_path);
    if (
      typeof envelope.data.content !== "string" ||
      !relativePath.startsWith("topics/") ||
      !relativePath.includes("/current/") ||
      (!relativePath.endsWith(".json") && !relativePath.endsWith(".md")) ||
      relativePath.includes("/assets/") ||
      relativePath.endsWith(".metadata.json") ||
      relativePath.endsWith(".html")
    ) {
      throw new Error("durable_import_topic_asset_invalid");
    }
    const parts = relativePath.split("/");
    if (envelope.data.topic_id !== parts[1]) {
      throw new Error("durable_import_identity_mismatch");
    }
    const expected = `topic-asset:${parts[1]}:${parts.slice(1).join("/")}`;
    if (envelope.entity_id !== expected) {
      throw new Error("durable_import_identity_mismatch");
    }
  } else {
    const identityField = IDENTITY_FIELD[kind];
    if (
      identityField &&
      cleanString(envelope.data[identityField]) !== envelope.entity_id
    ) {
      throw new Error("durable_import_identity_mismatch");
    }
  }
  return JSON.parse(JSON.stringify(envelope)) as SynthesisDurableAssetEnvelope;
}

export function normalizeSynthesisDurableImportEntries(
  entries: readonly SynthesisDurableAssetEnvelope[],
) {
  const normalized = entries
    .map(normalizeLiveEnvelope)
    .sort(
      (left, right) =>
        left.entity_kind.localeCompare(right.entity_kind) ||
        left.entity_id.localeCompare(right.entity_id),
    );
  const keys = new Set<string>();
  for (const entry of normalized) {
    const key = synthesisDurableEntityKey(entry.entity_kind, entry.entity_id);
    if (keys.has(key)) throw new Error("durable_import_identity_duplicate");
    keys.add(key);
  }
  return normalized;
}

export function classifySynthesisDurableImportFacts(args: {
  remote: readonly SynthesisDurableImportFact[];
  localHashes: Readonly<Record<string, string>>;
  index: SynthesisDurableSyncIndex;
}): SynthesisDurableImportClassification {
  let additions = 0;
  let updates = 0;
  let unbasedUpdates = 0;
  let unchanged = 0;
  let tombstones = 0;
  const conflicts: SynthesisDurableImportConflict[] = [];
  for (const fact of [...args.remote].sort(
    (left, right) =>
      left.entityKind.localeCompare(right.entityKind) ||
      left.entityId.localeCompare(right.entityId),
  )) {
    if (fact.entityKind === "tombstone") {
      tombstones += 1;
      continue;
    }
    const key = synthesisDurableEntityKey(fact.entityKind, fact.entityId);
    const localHash = args.localHashes[key] ?? "";
    const baseHash = args.index.entities[key]?.last_synced_hash ?? "";
    if (!localHash) {
      additions += 1;
    } else if (localHash === fact.hash) {
      unchanged += 1;
    } else if (!baseHash) {
      unbasedUpdates += 1;
    } else if (localHash !== baseHash && fact.hash !== baseHash) {
      conflicts.push({
        entityKind: fact.entityKind,
        entityId: fact.entityId,
        path: fact.path,
        reason: "both_changed",
        baseHash,
        localHash,
        remoteHash: fact.hash,
      });
    } else {
      updates += 1;
    }
  }
  return {
    additions,
    updates,
    unbasedUpdates,
    unchanged,
    tombstones,
    conflicts,
  };
}
