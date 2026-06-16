import {
  canonicalAssetFileName,
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
  type SynthesisConceptAliasRecord,
  type SynthesisConceptRecord,
  type SynthesisConceptRelationRecord,
  type SynthesisConceptReviewItemRecord,
  type SynthesisConceptSenseRecord,
  type SynthesisRepository,
  type SynthesisTopicConceptLinkRecord,
} from "./repository";

export const SYNTHESIS_CONCEPT_INDEX_TARGET = "concept-kb-index";
export const SYNTHESIS_CONCEPT_SCHEMA_ID = "synthesis.concept";
export const SYNTHESIS_CONCEPT_SENSE_SCHEMA_ID = "synthesis.concept_sense";
export const SYNTHESIS_CONCEPT_ALIAS_SCHEMA_ID = "synthesis.concept_alias";
export const SYNTHESIS_CONCEPT_RELATION_SCHEMA_ID =
  "synthesis.concept_relation";
export const SYNTHESIS_CONCEPT_REVIEW_ITEM_SCHEMA_ID =
  "synthesis.concept_review_item";
export const SYNTHESIS_CONCEPT_TOPIC_LINKS_SCHEMA_ID =
  "synthesis.topic_concept_links";
export const SYNTHESIS_CONCEPT_MANIFEST_SCHEMA_ID =
  "synthesis.concept_manifest";
export const SYNTHESIS_CONCEPT_INDEX_SCHEMA_VERSION = "1.0.0";

export type SynthesisConceptStatus = "active" | "review" | "deprecated";
export type SynthesisConceptConfidence = "high" | "medium" | "low";
export type SynthesisConceptRelationType =
  | "used_by"
  | "uses"
  | "broader_than"
  | "narrower_than"
  | "related_to"
  | "contrasts_with"
  | "part_of"
  | "has_part";

export type SynthesisConcept = {
  concept_id: string;
  label: string;
  aliases: string[];
  concept_type: string;
  domain: string;
  status: SynthesisConceptStatus;
  short_definition?: string;
  definition?: string;
  usage_note?: string;
  editorial_note?: string;
  sense_ids: string[];
  created_at: string;
  updated_at: string;
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

export type SynthesisConceptSense = {
  sense_id: string;
  concept_id: string;
  label: string;
  aliases: string[];
  domain: string;
  short_definition: string;
  definition: string;
  disambiguation?: string;
  topic_relevance?: string;
  confidence: SynthesisConceptConfidence;
  source_topic_ids: string[];
  evidence: unknown[];
  created_at: string;
  updated_at: string;
};

export type SynthesisConceptAlias = {
  alias_id: string;
  alias: string;
  normalized: string;
  concept_id: string;
  sense_id?: string;
  status: SynthesisConceptStatus;
  confidence: SynthesisConceptConfidence;
  created_at: string;
  updated_at: string;
};

export type SynthesisConceptRelation = {
  relation_id: string;
  source_concept_id: string;
  target_concept_id: string;
  relation: SynthesisConceptRelationType;
  status: "suggested" | "confirmed" | "rejected";
  confidence: SynthesisConceptConfidence;
  provenance: unknown[];
  created_at: string;
  updated_at: string;
};

export type SynthesisConceptReviewStatus =
  | "open"
  | "approved"
  | "merged"
  | "rejected";

export type SynthesisConceptReviewItem = {
  review_id: string;
  status: SynthesisConceptReviewStatus;
  reason: "low_confidence_concept" | "ambiguous_concept_match";
  topic_id: string;
  topic_path_id: string;
  label: string;
  confidence: SynthesisConceptConfidence;
  candidate_concept_ids: string[];
  proposal: SynthesisConceptCardProposal;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  target_concept_id?: string;
};

export type SynthesisTopicConceptLink = {
  topic_id: string;
  concept_id: string;
  sense_id: string;
  label: string;
  relevance?: string;
  confidence: SynthesisConceptConfidence;
  source: "topic_synthesis_concept_cards" | "manual";
  created_at: string;
  updated_at: string;
};

export type SynthesisTopicConceptLinksAsset = {
  topic_id: string;
  links: SynthesisTopicConceptLink[];
};

export type SynthesisConceptManifest = {
  manifest_hash: string;
  concept_count: number;
  sense_count: number;
  alias_count: number;
  relation_count: number;
  updated_at: string;
  projection_target: typeof SYNTHESIS_CONCEPT_INDEX_TARGET;
};

export type SynthesisConceptDiagnostic = {
  code: string;
  message: string;
  label?: string;
  topic_id?: string;
  details?: unknown;
};

export type SynthesisConceptOverlayEntry = {
  concept_id: string;
  sense_id?: string;
  alias: string;
  label: string;
  short_definition?: string;
  definition?: string;
  confidence: SynthesisConceptConfidence;
};

export type SynthesisConceptKbSnapshot = {
  concepts: SynthesisConcept[];
  senses: SynthesisConceptSense[];
  aliases: SynthesisConceptAlias[];
  relations: SynthesisConceptRelation[];
  review_items: SynthesisConceptReviewItem[];
  manifest: SynthesisConceptManifest;
  projection?: ProjectionState;
  diagnostics: SynthesisConceptDiagnostic[];
  overlay_entries: SynthesisConceptOverlayEntry[];
};

export type SynthesisConceptIndexProjection = {
  schema_id: "synthesis.concept_kb_index_projection";
  schema_version: string;
  source_manifest_hash: string;
  rebuilt_at: string;
  concepts: SynthesisConcept[];
  senses: SynthesisConceptSense[];
  aliases: SynthesisConceptAlias[];
  relations: SynthesisConceptRelation[];
  review_items: SynthesisConceptReviewItem[];
  search: Array<{
    concept_id: string;
    label: string;
    normalized: string;
    concept_type: string;
    domain: string;
  }>;
  overlay_entries: SynthesisConceptOverlayEntry[];
  diagnostics: SynthesisConceptDiagnostic[];
};

export type SynthesisConceptCardProposal = {
  local_id?: string;
  label: string;
  aliases: string[];
  concept_type: string;
  domain: string;
  short_definition: string;
  definition: string;
  disambiguation?: string;
  topic_relevance?: string;
  evidence: unknown[];
  relations: unknown[];
  merge_hints: unknown[];
  confidence: SynthesisConceptConfidence;
};

export type SynthesisConceptProposalIngestResult = {
  concepts: SynthesisConcept[];
  senses: SynthesisConceptSense[];
  aliases: SynthesisConceptAlias[];
  topic_links: SynthesisTopicConceptLink[];
  diagnostics: SynthesisConceptDiagnostic[];
  receipt?: CanonicalTransactionReceipt;
};

export type SynthesisConceptReviewActionResult = {
  review_item?: SynthesisConceptReviewItem;
  concept?: SynthesisConcept;
  sense?: SynthesisConceptSense;
  aliases?: SynthesisConceptAlias[];
  topic_link?: SynthesisTopicConceptLink;
  diagnostic?: SynthesisConceptDiagnostic;
  receipt?: CanonicalTransactionReceipt;
};

export type SynthesisConceptDeleteResult = {
  deleted_concept_ids: string[];
  deleted_sense_ids: string[];
  deleted_alias_ids: string[];
  deleted_relation_ids: string[];
  updated_review_items: SynthesisConceptReviewItem[];
  deleted_topic_links: SynthesisTopicConceptLink[];
  diagnostic?: SynthesisConceptDiagnostic;
  receipt?: CanonicalTransactionReceipt;
};

type ServiceOptions = {
  root: string;
  now?: () => string;
  repository?: SynthesisRepository;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
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

function safeId(value: unknown, fallback = "concept") {
  return (
    cleanString(value)
      .toLowerCase()
      .replace(/\\/g, "/")
      .replace(/[^a-z0-9_.-]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

function normalizeAlias(value: unknown) {
  return cleanString(value).replace(/\s+/g, " ");
}

function normalizedAliasKey(value: unknown) {
  return normalizeAlias(value).toLowerCase();
}

function confidenceOf(value: unknown): SynthesisConceptConfidence {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 0.75) {
      return "high";
    }
    if (value <= 0.4) {
      return "low";
    }
    return "medium";
  }
  const confidence = cleanString(value).toLowerCase();
  if (confidence === "high" || confidence === "low") {
    return confidence;
  }
  return "medium";
}

function conceptIdFromLabel(label: string, domain: string) {
  return `concept:${safeId(domain || "global")}:${safeId(label)}`;
}

function senseIdFor(args: {
  conceptId: string;
  label: string;
  domain: string;
  definition: string;
}) {
  const suffix = hashCanonicalJson({
    label: normalizedAliasKey(args.label),
    domain: normalizedAliasKey(args.domain),
    definition: normalizedAliasKey(args.definition).slice(0, 120),
  }).slice("sha256:".length, "sha256:".length + 12);
  return `sense:${safeId(args.conceptId)}:${suffix}`;
}

function aliasIdFor(alias: string) {
  const suffix = hashCanonicalJson(normalizedAliasKey(alias)).slice(
    "sha256:".length,
    "sha256:".length + 12,
  );
  return `alias:${safeId(alias)}:${suffix}`;
}

function relationIdFor(args: {
  sourceConceptId: string;
  targetConceptId: string;
  relation: SynthesisConceptRelationType;
}) {
  return `relation:${args.relation}:${safeId(args.sourceConceptId)}:${safeId(args.targetConceptId)}`;
}

function reviewIdFor(args: {
  topicId: string;
  reason: string;
  proposal: SynthesisConceptCardProposal;
}) {
  const suffix = hashCanonicalJson({
    topic_id: args.topicId,
    reason: args.reason,
    label: normalizedAliasKey(args.proposal.label),
    domain: normalizedAliasKey(args.proposal.domain),
    definition: normalizedAliasKey(args.proposal.definition).slice(0, 120),
  }).slice("sha256:".length, "sha256:".length + 12);
  return `review:${safeId(args.topicId, "topic")}:${safeId(args.reason, "reason")}:${suffix}`;
}

function tokenize(value: unknown) {
  return normalizedAliasKey(value)
    .split(/[^a-z0-9]+/i)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 1);
}

function tokenOverlap(left: string, right: string) {
  const leftSet = new Set(tokenize(left));
  const rightSet = new Set(tokenize(right));
  if (!leftSet.size || !rightSet.size) {
    return 0;
  }
  let overlap = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.max(leftSet.size, rightSet.size);
}

function sortConcepts(concepts: SynthesisConcept[]) {
  return [...concepts].sort(
    (left, right) =>
      left.label.localeCompare(right.label) ||
      left.concept_id.localeCompare(right.concept_id),
  );
}

function sortSenses(senses: SynthesisConceptSense[]) {
  return [...senses].sort(
    (left, right) =>
      left.label.localeCompare(right.label) ||
      left.sense_id.localeCompare(right.sense_id),
  );
}

function sortAliases(aliases: SynthesisConceptAlias[]) {
  return [...aliases].sort(
    (left, right) =>
      left.normalized.localeCompare(right.normalized) ||
      left.alias_id.localeCompare(right.alias_id),
  );
}

function sortRelations(relations: SynthesisConceptRelation[]) {
  return [...relations].sort((left, right) =>
    left.relation_id.localeCompare(right.relation_id),
  );
}

function sortReviewItems(items: SynthesisConceptReviewItem[]) {
  return [...items].sort(
    (left, right) =>
      left.status.localeCompare(right.status) ||
      left.label.localeCompare(right.label) ||
      left.review_id.localeCompare(right.review_id),
  );
}

function buildManifest(args: {
  concepts: SynthesisConcept[];
  senses: SynthesisConceptSense[];
  aliases: SynthesisConceptAlias[];
  relations: SynthesisConceptRelation[];
  updatedAt: string;
}): SynthesisConceptManifest {
  return {
    manifest_hash: hashCanonicalJson({
      concepts: sortConcepts(args.concepts),
      senses: sortSenses(args.senses),
      aliases: sortAliases(args.aliases),
      relations: sortRelations(args.relations),
    }),
    concept_count: args.concepts.length,
    sense_count: args.senses.length,
    alias_count: args.aliases.length,
    relation_count: args.relations.length,
    updated_at: args.updatedAt,
    projection_target: SYNTHESIS_CONCEPT_INDEX_TARGET,
  };
}

function createRegistry() {
  const registry = new SynthesisSchemaRegistry();
  registry.registerDataSchema(SYNTHESIS_CONCEPT_SCHEMA_ID, {
    type: "object",
    required: [
      "concept_id",
      "label",
      "aliases",
      "concept_type",
      "domain",
      "status",
      "sense_ids",
      "created_at",
      "updated_at",
    ],
    additionalProperties: true,
    properties: {
      concept_id: { type: "string", minLength: 1 },
      label: { type: "string", minLength: 1 },
      aliases: { type: "array", items: { type: "string" } },
      concept_type: { type: "string" },
      domain: { type: "string" },
      status: { enum: ["active", "review", "deprecated"] },
      sense_ids: { type: "array", items: { type: "string" } },
      created_at: { type: "string" },
      updated_at: { type: "string" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_CONCEPT_SENSE_SCHEMA_ID, {
    type: "object",
    required: [
      "sense_id",
      "concept_id",
      "label",
      "aliases",
      "domain",
      "short_definition",
      "definition",
      "confidence",
      "source_topic_ids",
      "evidence",
      "created_at",
      "updated_at",
    ],
    additionalProperties: true,
    properties: {
      sense_id: { type: "string", minLength: 1 },
      concept_id: { type: "string", minLength: 1 },
      label: { type: "string", minLength: 1 },
      aliases: { type: "array", items: { type: "string" } },
      domain: { type: "string" },
      short_definition: { type: "string" },
      definition: { type: "string" },
      confidence: { enum: ["high", "medium", "low"] },
      source_topic_ids: { type: "array", items: { type: "string" } },
      evidence: { type: "array" },
      created_at: { type: "string" },
      updated_at: { type: "string" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_CONCEPT_ALIAS_SCHEMA_ID, {
    type: "object",
    required: [
      "alias_id",
      "alias",
      "normalized",
      "concept_id",
      "status",
      "confidence",
      "created_at",
      "updated_at",
    ],
    additionalProperties: true,
    properties: {
      alias_id: { type: "string", minLength: 1 },
      alias: { type: "string", minLength: 1 },
      normalized: { type: "string", minLength: 1 },
      concept_id: { type: "string", minLength: 1 },
      status: { enum: ["active", "review", "deprecated"] },
      confidence: { enum: ["high", "medium", "low"] },
      created_at: { type: "string" },
      updated_at: { type: "string" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_CONCEPT_RELATION_SCHEMA_ID, {
    type: "object",
    required: [
      "relation_id",
      "source_concept_id",
      "target_concept_id",
      "relation",
      "status",
      "confidence",
      "provenance",
      "created_at",
      "updated_at",
    ],
    additionalProperties: true,
    properties: {
      relation_id: { type: "string", minLength: 1 },
      source_concept_id: { type: "string", minLength: 1 },
      target_concept_id: { type: "string", minLength: 1 },
      relation: {
        enum: [
          "used_by",
          "uses",
          "broader_than",
          "narrower_than",
          "related_to",
          "contrasts_with",
          "part_of",
          "has_part",
        ],
      },
      status: { enum: ["suggested", "confirmed", "rejected"] },
      confidence: { enum: ["high", "medium", "low"] },
      provenance: { type: "array" },
      created_at: { type: "string" },
      updated_at: { type: "string" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_CONCEPT_REVIEW_ITEM_SCHEMA_ID, {
    type: "object",
    required: [
      "review_id",
      "status",
      "reason",
      "topic_id",
      "topic_path_id",
      "label",
      "confidence",
      "candidate_concept_ids",
      "proposal",
      "created_at",
      "updated_at",
    ],
    additionalProperties: true,
    properties: {
      review_id: { type: "string", minLength: 1 },
      status: { type: "string" },
      reason: { type: "string" },
      topic_id: { type: "string" },
      topic_path_id: { type: "string" },
      label: { type: "string" },
      confidence: { type: "string" },
      candidate_concept_ids: { type: "array" },
      proposal: { type: "object" },
      created_at: { type: "string" },
      updated_at: { type: "string" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_CONCEPT_TOPIC_LINKS_SCHEMA_ID, {
    type: "object",
    required: ["topic_id", "links"],
    additionalProperties: true,
    properties: {
      topic_id: { type: "string", minLength: 1 },
      links: { type: "array" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_CONCEPT_MANIFEST_SCHEMA_ID, {
    type: "object",
    required: [
      "manifest_hash",
      "concept_count",
      "sense_count",
      "alias_count",
      "relation_count",
      "updated_at",
      "projection_target",
    ],
    additionalProperties: true,
    properties: {
      manifest_hash: { type: "string" },
      concept_count: { type: "number" },
      sense_count: { type: "number" },
      alias_count: { type: "number" },
      relation_count: { type: "number" },
      updated_at: { type: "string" },
      projection_target: { type: "string" },
    },
  });
  return registry;
}

function normalizeProposal(
  input: unknown,
): SynthesisConceptCardProposal | null {
  if (!isRecord(input)) {
    return null;
  }
  const label = normalizeAlias(input.label);
  if (!label) {
    return null;
  }
  const aliases = normalizeStringList([
    label,
    ...(Array.isArray(input.aliases) ? input.aliases : []),
  ]);
  return {
    local_id: cleanString(input.local_id) || undefined,
    label,
    aliases,
    concept_type: cleanString(input.concept_type) || "concept",
    domain: cleanString(input.domain) || "general",
    short_definition:
      cleanString(input.short_definition) ||
      cleanString(input.definition).slice(0, 180),
    definition:
      cleanString(input.definition) || cleanString(input.short_definition),
    disambiguation: cleanString(input.disambiguation) || undefined,
    topic_relevance: cleanString(input.topic_relevance) || undefined,
    evidence: Array.isArray(input.evidence) ? input.evidence : [],
    relations: Array.isArray(input.relations) ? input.relations : [],
    merge_hints: Array.isArray(input.merge_hints) ? input.merge_hints : [],
    confidence: confidenceOf(input.confidence),
  };
}

function buildOverlayEntries(args: {
  concepts: SynthesisConcept[];
  senses: SynthesisConceptSense[];
  aliases: SynthesisConceptAlias[];
}) {
  const conceptsById = new Map(
    args.concepts.map((entry) => [entry.concept_id, entry]),
  );
  const sensesById = new Map(
    args.senses.map((entry) => [entry.sense_id, entry]),
  );
  const aliasesByNormalized = new Map<string, SynthesisConceptAlias[]>();
  for (const alias of args.aliases) {
    aliasesByNormalized.set(alias.normalized, [
      ...(aliasesByNormalized.get(alias.normalized) || []),
      alias,
    ]);
  }
  const entries: SynthesisConceptOverlayEntry[] = [];
  for (const alias of args.aliases) {
    if (alias.status !== "active" || alias.confidence === "low") {
      continue;
    }
    const matching = aliasesByNormalized.get(alias.normalized) || [];
    const uniqueConcepts = new Set(matching.map((entry) => entry.concept_id));
    if (uniqueConcepts.size > 1) {
      continue;
    }
    const concept = conceptsById.get(alias.concept_id);
    const sense = alias.sense_id ? sensesById.get(alias.sense_id) : undefined;
    if (!concept || concept.status !== "active") {
      continue;
    }
    entries.push({
      concept_id: concept.concept_id,
      sense_id: alias.sense_id,
      alias: alias.alias,
      label: concept.label,
      short_definition: sense?.short_definition || concept.short_definition,
      definition: sense?.definition || concept.definition,
      confidence: alias.confidence,
    });
  }
  return entries.sort(
    (left, right) =>
      right.alias.length - left.alias.length ||
      left.alias.localeCompare(right.alias),
  );
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

function parseJsonObjectText(value: unknown) {
  try {
    const parsed = JSON.parse(cleanString(value) || "{}");
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function conceptStatus(value: unknown): SynthesisConceptStatus {
  const normalized = cleanString(value);
  return normalized === "review" || normalized === "deprecated"
    ? normalized
    : "active";
}

function relationStatus(
  value: unknown,
): "suggested" | "confirmed" | "rejected" {
  const normalized = cleanString(value);
  return normalized === "confirmed" || normalized === "rejected"
    ? normalized
    : "suggested";
}

function reviewStatus(value: unknown): SynthesisConceptReviewStatus {
  const normalized = cleanString(value);
  if (
    normalized === "approved" ||
    normalized === "merged" ||
    normalized === "rejected"
  ) {
    return normalized;
  }
  return "open";
}

function conceptToRecord(concept: SynthesisConcept): SynthesisConceptRecord {
  return {
    conceptId: concept.concept_id,
    label: concept.label,
    aliasesJson: jsonArrayText(concept.aliases),
    conceptType: concept.concept_type,
    domain: concept.domain,
    status: concept.status,
    shortDefinition: concept.short_definition,
    definition: concept.definition,
    usageNote: concept.usage_note,
    editorialNote: concept.editorial_note,
    senseIdsJson: jsonArrayText(concept.sense_ids),
    createdAt: concept.created_at,
    updatedAt: concept.updated_at,
  };
}

function conceptFromRecord(record: SynthesisConceptRecord): SynthesisConcept {
  return {
    concept_id: record.conceptId,
    label: record.label,
    aliases: normalizeStringList(parseJsonArrayText(record.aliasesJson)),
    concept_type: record.conceptType || "concept",
    domain: record.domain || "general",
    status: conceptStatus(record.status),
    short_definition: record.shortDefinition,
    definition: record.definition,
    usage_note: record.usageNote,
    editorial_note: record.editorialNote,
    sense_ids: normalizeStringList(parseJsonArrayText(record.senseIdsJson)),
    created_at: record.createdAt || "",
    updated_at: record.updatedAt || "",
  };
}

function senseToRecord(
  sense: SynthesisConceptSense,
): SynthesisConceptSenseRecord {
  return {
    senseId: sense.sense_id,
    conceptId: sense.concept_id,
    label: sense.label,
    aliasesJson: jsonArrayText(sense.aliases),
    domain: sense.domain,
    shortDefinition: sense.short_definition,
    definition: sense.definition,
    disambiguation: sense.disambiguation,
    topicRelevance: sense.topic_relevance,
    confidence: sense.confidence,
    sourceTopicIdsJson: jsonArrayText(sense.source_topic_ids),
    evidenceJson: jsonArrayText(sense.evidence),
    createdAt: sense.created_at,
    updatedAt: sense.updated_at,
  };
}

function senseFromRecord(
  record: SynthesisConceptSenseRecord,
): SynthesisConceptSense {
  return {
    sense_id: record.senseId,
    concept_id: record.conceptId,
    label: record.label,
    aliases: normalizeStringList(parseJsonArrayText(record.aliasesJson)),
    domain: record.domain || "general",
    short_definition: record.shortDefinition || "",
    definition: record.definition || "",
    disambiguation: record.disambiguation,
    topic_relevance: record.topicRelevance,
    confidence: confidenceOf(record.confidence),
    source_topic_ids: normalizeStringList(
      parseJsonArrayText(record.sourceTopicIdsJson),
    ),
    evidence: parseJsonArrayText(record.evidenceJson),
    created_at: record.createdAt || "",
    updated_at: record.updatedAt || "",
  };
}

function aliasToRecord(
  alias: SynthesisConceptAlias,
): SynthesisConceptAliasRecord {
  return {
    aliasId: alias.alias_id,
    alias: alias.alias,
    normalized: alias.normalized,
    conceptId: alias.concept_id,
    senseId: alias.sense_id,
    status: alias.status,
    confidence: alias.confidence,
    createdAt: alias.created_at,
    updatedAt: alias.updated_at,
  };
}

function aliasFromRecord(
  record: SynthesisConceptAliasRecord,
): SynthesisConceptAlias {
  return {
    alias_id: record.aliasId,
    alias: record.alias,
    normalized: record.normalized,
    concept_id: record.conceptId,
    sense_id: record.senseId,
    status: conceptStatus(record.status),
    confidence: confidenceOf(record.confidence),
    created_at: record.createdAt || "",
    updated_at: record.updatedAt || "",
  };
}

function relationToRecord(
  relation: SynthesisConceptRelation,
): SynthesisConceptRelationRecord {
  return {
    relationId: relation.relation_id,
    sourceConceptId: relation.source_concept_id,
    targetConceptId: relation.target_concept_id,
    relation: relation.relation,
    status: relation.status,
    confidence: relation.confidence,
    provenanceJson: jsonArrayText(relation.provenance),
    createdAt: relation.created_at,
    updatedAt: relation.updated_at,
  };
}

function relationFromRecord(
  record: SynthesisConceptRelationRecord,
): SynthesisConceptRelation {
  return {
    relation_id: record.relationId,
    source_concept_id: record.sourceConceptId,
    target_concept_id: record.targetConceptId,
    relation:
      record.relation === "used_by" ||
      record.relation === "uses" ||
      record.relation === "broader_than" ||
      record.relation === "narrower_than" ||
      record.relation === "contrasts_with" ||
      record.relation === "part_of" ||
      record.relation === "has_part"
        ? record.relation
        : "related_to",
    status: relationStatus(record.status),
    confidence: confidenceOf(record.confidence),
    provenance: parseJsonArrayText(record.provenanceJson),
    created_at: record.createdAt || "",
    updated_at: record.updatedAt || "",
  };
}

function reviewItemToRecord(
  reviewItem: SynthesisConceptReviewItem,
): SynthesisConceptReviewItemRecord {
  return {
    reviewId: reviewItem.review_id,
    status: reviewItem.status,
    reason: reviewItem.reason,
    topicId: reviewItem.topic_id,
    topicPathId: reviewItem.topic_path_id,
    label: reviewItem.label,
    confidence: reviewItem.confidence,
    candidateConceptIdsJson: jsonArrayText(reviewItem.candidate_concept_ids),
    proposalJson: JSON.stringify(reviewItem.proposal || {}),
    targetConceptId: reviewItem.target_concept_id,
    createdAt: reviewItem.created_at,
    updatedAt: reviewItem.updated_at,
    resolvedAt: reviewItem.resolved_at,
  };
}

function reviewItemFromRecord(
  record: SynthesisConceptReviewItemRecord,
): SynthesisConceptReviewItem {
  return {
    review_id: record.reviewId,
    status: reviewStatus(record.status),
    reason:
      record.reason === "ambiguous_concept_match"
        ? "ambiguous_concept_match"
        : "low_confidence_concept",
    topic_id: record.topicId,
    topic_path_id: record.topicPathId,
    label: record.label,
    confidence: confidenceOf(record.confidence),
    candidate_concept_ids: normalizeStringList(
      parseJsonArrayText(record.candidateConceptIdsJson),
    ),
    proposal: normalizeProposal(parseJsonObjectText(record.proposalJson)) || {
      label: record.label,
      aliases: [],
      concept_type: "concept",
      domain: "general",
      short_definition: "",
      definition: "",
      evidence: [],
      relations: [],
      merge_hints: [],
      confidence: confidenceOf(record.confidence),
    },
    created_at: record.createdAt || "",
    updated_at: record.updatedAt || "",
    resolved_at: record.resolvedAt,
    target_concept_id: record.targetConceptId,
  };
}

function topicLinkToRecord(
  link: SynthesisTopicConceptLink,
): SynthesisTopicConceptLinkRecord {
  return {
    topicId: link.topic_id,
    conceptId: link.concept_id,
    senseId: link.sense_id,
    label: link.label,
    relevance: link.relevance,
    confidence: link.confidence,
    source: link.source,
    createdAt: link.created_at,
    updatedAt: link.updated_at,
  };
}

function topicLinkFromRecord(
  record: SynthesisTopicConceptLinkRecord,
): SynthesisTopicConceptLink {
  return {
    topic_id: record.topicId,
    concept_id: record.conceptId,
    sense_id: record.senseId,
    label: record.label,
    relevance: record.relevance,
    confidence: confidenceOf(record.confidence),
    source:
      record.source === "manual" ? "manual" : "topic_synthesis_concept_cards",
    created_at: record.createdAt || "",
    updated_at: record.updatedAt || "",
  };
}

function conceptProjectionFromSnapshot(args: {
  snapshot: SynthesisConceptKbSnapshot;
  rebuiltAt: string;
}): SynthesisConceptIndexProjection {
  return {
    schema_id: "synthesis.concept_kb_index_projection",
    schema_version: SYNTHESIS_CONCEPT_INDEX_SCHEMA_VERSION,
    source_manifest_hash: args.snapshot.manifest.manifest_hash,
    rebuilt_at: args.rebuiltAt,
    concepts: args.snapshot.concepts,
    senses: args.snapshot.senses,
    aliases: args.snapshot.aliases,
    relations: args.snapshot.relations,
    review_items: args.snapshot.review_items,
    search: args.snapshot.concepts.map((concept) => ({
      concept_id: concept.concept_id,
      label: concept.label,
      normalized:
        `${concept.label} ${concept.aliases.join(" ")} ${concept.short_definition || ""} ${concept.definition || ""}`.toLowerCase(),
      concept_type: concept.concept_type,
      domain: concept.domain,
    })),
    overlay_entries: args.snapshot.overlay_entries,
    diagnostics: args.snapshot.diagnostics,
  };
}

export function createSynthesisConceptKbService(options: ServiceOptions) {
  const root = cleanString(options.root);
  if (!root) {
    throw new Error("Synthesis concept KB service requires a storage root");
  }
  const now = options.now || nowIso;
  const repository =
    options.repository ||
    createSynthesisRepository({
      runtimeRoot: resolveSynthesisPersistenceRoot(root),
      now,
    });
  const registry = createRegistry();

  async function ensureConceptStore() {
    repository.initialize();
  }

  async function readTopicConceptLinks(args: { topicId: string }) {
    await ensureConceptStore();
    return {
      topic_id: args.topicId,
      links: repository
        .listTopicConceptLinks({ topicIds: [args.topicId] })
        .map(topicLinkFromRecord),
    };
  }

  async function readManifest(args: {
    concepts: SynthesisConcept[];
    senses: SynthesisConceptSense[];
    aliases: SynthesisConceptAlias[];
    relations: SynthesisConceptRelation[];
  }) {
    return buildManifest({
      ...args,
      updatedAt: now(),
    });
  }

  async function loadConceptKb(
    options: IndexRebuildOptions = {},
  ): Promise<SynthesisConceptKbSnapshot> {
    await ensureConceptStore();
    const concepts = sortConcepts(
      repository.listConcepts().map(conceptFromRecord),
    );
    await options.yieldControl?.();
    const senses = sortSenses(
      repository.listConceptSenses().map(senseFromRecord),
    );
    const aliases = sortAliases(
      repository.listConceptAliases().map(aliasFromRecord),
    );
    await options.yieldControl?.();
    const relations = sortRelations(
      repository.listConceptRelations().map(relationFromRecord),
    );
    const reviewItems = sortReviewItems(
      repository.listConceptReviewItems().map(reviewItemFromRecord),
    );
    await options.yieldControl?.();
    const manifest = await readManifest({
      concepts,
      senses,
      aliases,
      relations,
    });
    const projectionState = await readProjectionRegistryState(root);
    await options.yieldControl?.();
    return {
      concepts,
      senses,
      aliases,
      relations,
      review_items: reviewItems,
      manifest,
      projection: projectionState.projections[SYNTHESIS_CONCEPT_INDEX_TARGET],
      diagnostics: [],
      overlay_entries: buildOverlayEntries({ concepts, senses, aliases }),
    };
  }

  async function exportConceptKbCheckpoint(args?: { transactionId?: string }) {
    const snapshot = await loadConceptKb();
    const timestamp = now();
    const manifest = buildManifest({
      concepts: snapshot.concepts,
      senses: snapshot.senses,
      aliases: snapshot.aliases,
      relations: snapshot.relations,
      updatedAt: timestamp,
    });
    const linksByTopicId = new Map<string, SynthesisTopicConceptLink[]>();
    for (const link of repository
      .listTopicConceptLinks()
      .map(topicLinkFromRecord)) {
      linksByTopicId.set(link.topic_id, [
        ...(linksByTopicId.get(link.topic_id) || []),
        link,
      ]);
    }
    const topicLinkAssets = Array.from(linksByTopicId.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([topicId, links]) => ({
        topic_id: topicId,
        links: [...links].sort(
          (left, right) =>
            left.concept_id.localeCompare(right.concept_id) ||
            left.sense_id.localeCompare(right.sense_id),
        ),
      }));
    const result = await writeCanonicalTransaction({
      root,
      scope: "concepts",
      registry,
      transactionId: args?.transactionId,
      projectionTargets: [SYNTHESIS_CONCEPT_INDEX_TARGET],
      sourceManifestHash: manifest.manifest_hash,
      now: timestamp,
      assets: [
        ...snapshot.concepts.map((concept) => ({
          relativePath: `concepts/concepts/${canonicalAssetFileName(
            "concept",
            concept.concept_id,
          )}`,
          schemaId: SYNTHESIS_CONCEPT_SCHEMA_ID,
          data: concept,
        })),
        ...snapshot.senses.map((sense) => ({
          relativePath: `concepts/senses/${canonicalAssetFileName(
            "sense",
            sense.sense_id,
          )}`,
          schemaId: SYNTHESIS_CONCEPT_SENSE_SCHEMA_ID,
          data: sense,
        })),
        ...snapshot.aliases.map((alias) => ({
          relativePath: `concepts/aliases/${canonicalAssetFileName(
            "alias",
            alias.alias_id,
          )}`,
          schemaId: SYNTHESIS_CONCEPT_ALIAS_SCHEMA_ID,
          data: alias,
        })),
        ...snapshot.relations.map((relation) => ({
          relativePath: `concepts/relations/${canonicalAssetFileName(
            "relation",
            relation.relation_id,
          )}`,
          schemaId: SYNTHESIS_CONCEPT_RELATION_SCHEMA_ID,
          data: relation,
        })),
        ...snapshot.review_items.map((reviewItem) => ({
          relativePath: `concepts/review/${canonicalAssetFileName(
            "review",
            reviewItem.review_id,
          )}`,
          schemaId: SYNTHESIS_CONCEPT_REVIEW_ITEM_SCHEMA_ID,
          data: reviewItem,
        })),
        ...topicLinkAssets.map((asset) => ({
          relativePath: `concepts/topic-links/${canonicalAssetFileName(
            "topic",
            asset.topic_id,
          )}`,
          schemaId: SYNTHESIS_CONCEPT_TOPIC_LINKS_SCHEMA_ID,
          data: asset,
        })),
        {
          relativePath: "concepts/manifest.json",
          schemaId: SYNTHESIS_CONCEPT_MANIFEST_SCHEMA_ID,
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

  async function commitConceptState(args: {
    concepts: SynthesisConcept[];
    senses: SynthesisConceptSense[];
    aliases: SynthesisConceptAlias[];
    relations: SynthesisConceptRelation[];
    reviewItems?: SynthesisConceptReviewItem[];
    topicLinks?: Array<{
      topicPathId: string;
      data: SynthesisTopicConceptLinksAsset;
    }>;
    transactionId?: string;
  }) {
    const timestamp = now();
    const concepts = sortConcepts(args.concepts);
    const senses = sortSenses(args.senses);
    const aliases = sortAliases(args.aliases);
    const relations = sortRelations(args.relations);
    const reviewItems = sortReviewItems(args.reviewItems || []);
    const topicLinksByKey = new Map(
      repository
        .listTopicConceptLinks()
        .map(topicLinkFromRecord)
        .map((link) => [
          `${link.topic_id}:${link.concept_id}:${link.sense_id}`,
          link,
        ]),
    );
    for (const entry of args.topicLinks || []) {
      const topicId = entry.data.topic_id;
      for (const [key, link] of Array.from(topicLinksByKey.entries())) {
        if (link.topic_id === topicId) {
          topicLinksByKey.delete(key);
        }
      }
      for (const link of entry.data.links) {
        topicLinksByKey.set(
          `${link.topic_id}:${link.concept_id}:${link.sense_id}`,
          link,
        );
      }
    }
    const manifest = buildManifest({
      concepts,
      senses,
      aliases,
      relations,
      updatedAt: timestamp,
    });
    repository.replaceConceptKbState({
      concepts: concepts.map(conceptToRecord),
      senses: senses.map(senseToRecord),
      aliases: aliases.map(aliasToRecord),
      relations: relations.map(relationToRecord),
      reviewItems: reviewItems.map(reviewItemToRecord),
      topicLinks: Array.from(topicLinksByKey.values()).map(topicLinkToRecord),
    });
    const receipt: CanonicalTransactionReceipt = {
      schema_id: "synthesis.canonical_store_transaction_receipt",
      schema_version: "1.0.0",
      transaction_id:
        cleanString(args.transactionId) || `concept-kb-${timestamp}`,
      scope: "concepts",
      status: "committed",
      changed_assets: [],
      created_at: timestamp,
    };
    return { transactionId: receipt.transaction_id, receipt, manifest };
  }

  async function saveConceptKb(args: {
    concepts: SynthesisConcept[];
    senses?: SynthesisConceptSense[];
    aliases?: SynthesisConceptAlias[];
    relations?: SynthesisConceptRelation[];
    transactionId?: string;
  }) {
    const result = await commitConceptState({
      concepts: args.concepts,
      senses: args.senses || [],
      aliases: args.aliases || [],
      relations: args.relations || [],
      transactionId: args.transactionId,
    });
    return { transactionId: result.transactionId, receipt: result.receipt };
  }

  async function importConceptKbCheckpoint(args: {
    concepts?: SynthesisConcept[];
    senses?: SynthesisConceptSense[];
    aliases?: SynthesisConceptAlias[];
    relations?: SynthesisConceptRelation[];
    reviewItems?: SynthesisConceptReviewItem[];
    topicLinks?: SynthesisTopicConceptLinksAsset[];
    transactionId?: string;
  }) {
    const result = await commitConceptState({
      concepts: args.concepts || [],
      senses: args.senses || [],
      aliases: args.aliases || [],
      relations: args.relations || [],
      reviewItems: args.reviewItems || [],
      topicLinks: (args.topicLinks || []).map((data) => ({
        topicPathId: data.topic_id,
        data,
      })),
      transactionId: args.transactionId,
    });
    return { transactionId: result.transactionId, receipt: result.receipt };
  }

  async function writeConceptDiagnostic(
    diagnostic: SynthesisConceptDiagnostic,
    transactionId?: string,
  ) {
    await writeCanonicalDiagnostic({
      root,
      diagnostic: {
        scope: "concepts",
        transaction_id: transactionId,
        code: diagnostic.code,
        message: diagnostic.message,
        asset_path: "concepts/manifest.json",
        details: diagnostic,
        created_at: now(),
      },
    });
  }

  function conceptMatch(args: {
    proposal: SynthesisConceptCardProposal;
    concepts: SynthesisConcept[];
    aliases: SynthesisConceptAlias[];
  }) {
    const proposalAliases = args.proposal.aliases.map(normalizedAliasKey);
    const exact = args.aliases.find((alias) =>
      proposalAliases.includes(alias.normalized),
    );
    if (exact) {
      return { action: "merge" as const, conceptId: exact.concept_id };
    }
    const scored = args.concepts
      .map((concept) => ({
        concept,
        score: Math.max(
          tokenOverlap(args.proposal.label, concept.label),
          ...concept.aliases.map((alias) =>
            tokenOverlap(args.proposal.label, alias),
          ),
        ),
      }))
      .filter((entry) => entry.score >= 0.5)
      .sort((left, right) => right.score - left.score);
    if (scored.length > 1 && scored[0].score === scored[1].score) {
      return {
        action: "review" as const,
        diagnostics: {
          code: "ambiguous_concept_match",
          message: "Concept proposal matched multiple existing concepts.",
          label: args.proposal.label,
          details: scored.slice(0, 3).map((entry) => ({
            concept_id: entry.concept.concept_id,
            score: entry.score,
          })),
        },
      };
    }
    if (args.proposal.confidence === "low") {
      return {
        action: "review" as const,
        diagnostics: {
          code: "low_confidence_concept",
          message: "Low-confidence concept proposal requires review.",
          label: args.proposal.label,
        },
      };
    }
    return { action: "create" as const };
  }

  function candidateConceptIdsFromDiagnostic(
    diagnostic: SynthesisConceptDiagnostic,
  ) {
    const details = Array.isArray(diagnostic.details) ? diagnostic.details : [];
    return normalizeStringList(
      details.filter(isRecord).map((entry) => cleanString(entry.concept_id)),
    );
  }

  function createReviewItem(args: {
    proposal: SynthesisConceptCardProposal;
    diagnostic: SynthesisConceptDiagnostic;
    topicId: string;
    topicPathId: string;
    previous?: SynthesisConceptReviewItem;
    timestamp: string;
  }): SynthesisConceptReviewItem {
    const reason =
      args.diagnostic.code === "ambiguous_concept_match"
        ? "ambiguous_concept_match"
        : "low_confidence_concept";
    return {
      review_id:
        args.previous?.review_id ||
        reviewIdFor({
          topicId: args.topicId,
          reason,
          proposal: args.proposal,
        }),
      status: args.previous?.status || "open",
      reason,
      topic_id: args.topicId,
      topic_path_id: args.topicPathId,
      label: args.proposal.label,
      confidence: args.proposal.confidence,
      candidate_concept_ids: candidateConceptIdsFromDiagnostic(args.diagnostic),
      proposal: args.proposal,
      created_at: args.previous?.created_at || args.timestamp,
      updated_at: args.timestamp,
      resolved_at: args.previous?.resolved_at,
      target_concept_id: args.previous?.target_concept_id,
    };
  }

  async function ingestConceptCardProposals(args: {
    topicId: string;
    topicPathId?: string;
    payload: unknown;
    transactionId?: string;
  }): Promise<SynthesisConceptProposalIngestResult> {
    const topicId = cleanString(args.topicId);
    const topicPathId =
      cleanString(args.topicPathId) || safeId(topicId, "topic");
    const row = isRecord(args.payload) ? args.payload : {};
    const hasCardArray =
      Array.isArray(row.cards) ||
      Array.isArray(row.concepts) ||
      Array.isArray(row.proposals);
    const rawCards = Array.isArray(row.cards)
      ? row.cards
      : Array.isArray(row.concepts)
        ? row.concepts
        : Array.isArray(row.proposals)
          ? row.proposals
          : [];
    const proposals = rawCards
      .map((entry) => normalizeProposal(entry))
      .filter((entry): entry is SynthesisConceptCardProposal => Boolean(entry));
    const current = await loadConceptKb();
    const existingLinks = await readTopicConceptLinks({ topicId });
    const timestamp = now();
    const conceptsById = new Map(
      current.concepts.map((entry) => [entry.concept_id, entry]),
    );
    const sensesById = new Map(
      current.senses.map((entry) => [entry.sense_id, entry]),
    );
    const aliasesById = new Map(
      current.aliases.map((entry) => [entry.alias_id, entry]),
    );
    const relationsById = new Map(
      current.relations.map((entry) => [entry.relation_id, entry]),
    );
    const reviewItemsById = new Map(
      current.review_items.map((entry) => [entry.review_id, entry]),
    );
    const linksByKey = new Map(
      existingLinks.links.map((entry) => [
        `${entry.concept_id}:${entry.sense_id}`,
        entry,
      ]),
    );
    const diagnostics: SynthesisConceptDiagnostic[] = [];
    const touchedConcepts: SynthesisConcept[] = [];
    const touchedSenses: SynthesisConceptSense[] = [];
    const touchedAliases: SynthesisConceptAlias[] = [];
    const touchedReviewItems: SynthesisConceptReviewItem[] = [];

    if (!topicId) {
      diagnostics.push({
        code: "missing_topic_id",
        message: "Concept proposal ingestion requires a topic id.",
      });
    }
    if (!hasCardArray) {
      diagnostics.push({
        code: "invalid_concept_cards_payload",
        message:
          "Concept proposal sidecar must include cards, concepts, or proposals array.",
        topic_id: topicId,
      });
    }

    for (const proposal of proposals) {
      const match = conceptMatch({
        proposal,
        concepts: [...conceptsById.values()],
        aliases: [...aliasesById.values()],
      });
      if (match.action === "review") {
        diagnostics.push(match.diagnostics);
        const reviewId = reviewIdFor({
          topicId,
          reason: match.diagnostics.code,
          proposal,
        });
        const previous = reviewItemsById.get(reviewId);
        if (!previous || previous.status === "open") {
          const reviewItem = createReviewItem({
            proposal,
            diagnostic: match.diagnostics,
            topicId,
            topicPathId,
            previous,
            timestamp,
          });
          reviewItemsById.set(reviewItem.review_id, reviewItem);
          touchedReviewItems.push(reviewItem);
        }
        continue;
      }
      const conceptId =
        match.action === "merge"
          ? match.conceptId
          : conceptIdFromLabel(proposal.label, proposal.domain);
      const previousConcept = conceptsById.get(conceptId);
      const senseId = senseIdFor({
        conceptId,
        label: proposal.label,
        domain: proposal.domain,
        definition: proposal.definition,
      });
      const aliases = normalizeStringList([
        ...(previousConcept?.aliases || []),
        ...proposal.aliases,
      ]);
      const concept: SynthesisConcept = {
        concept_id: conceptId,
        label: previousConcept?.label || proposal.label,
        aliases,
        concept_type: previousConcept?.concept_type || proposal.concept_type,
        domain: previousConcept?.domain || proposal.domain,
        status: previousConcept?.status || "active",
        short_definition:
          previousConcept?.short_definition || proposal.short_definition,
        definition: previousConcept?.definition || proposal.definition,
        usage_note: previousConcept?.usage_note,
        editorial_note: previousConcept?.editorial_note,
        sense_ids: normalizeStringList([
          ...(previousConcept?.sense_ids || []),
          senseId,
        ]),
        created_at: previousConcept?.created_at || timestamp,
        updated_at: timestamp,
      };
      const previousSense = sensesById.get(senseId);
      const sense: SynthesisConceptSense = {
        sense_id: senseId,
        concept_id: conceptId,
        label: proposal.label,
        aliases: proposal.aliases,
        domain: proposal.domain,
        short_definition: proposal.short_definition,
        definition: proposal.definition,
        disambiguation: proposal.disambiguation,
        topic_relevance: proposal.topic_relevance,
        confidence: proposal.confidence,
        source_topic_ids: normalizeStringList([
          ...(previousSense?.source_topic_ids || []),
          topicId,
        ]),
        evidence: [...(previousSense?.evidence || []), ...proposal.evidence],
        created_at: previousSense?.created_at || timestamp,
        updated_at: timestamp,
      };
      conceptsById.set(conceptId, concept);
      sensesById.set(senseId, sense);
      touchedConcepts.push(concept);
      touchedSenses.push(sense);
      for (const aliasValue of proposal.aliases) {
        const alias = normalizeAlias(aliasValue);
        if (!alias) {
          continue;
        }
        const aliasId = aliasIdFor(alias);
        const previousAlias = aliasesById.get(aliasId);
        const aliasRecord: SynthesisConceptAlias = {
          alias_id: aliasId,
          alias,
          normalized: normalizedAliasKey(alias),
          concept_id: conceptId,
          sense_id: senseId,
          status: previousAlias?.status || "active",
          confidence: proposal.confidence,
          created_at: previousAlias?.created_at || timestamp,
          updated_at: timestamp,
        };
        aliasesById.set(aliasId, aliasRecord);
        touchedAliases.push(aliasRecord);
      }
      const link: SynthesisTopicConceptLink = {
        topic_id: topicId,
        concept_id: conceptId,
        sense_id: senseId,
        label: proposal.label,
        relevance: proposal.topic_relevance,
        confidence: proposal.confidence,
        source: "topic_synthesis_concept_cards",
        created_at:
          linksByKey.get(`${conceptId}:${senseId}`)?.created_at || timestamp,
        updated_at: timestamp,
      };
      linksByKey.set(`${conceptId}:${senseId}`, link);
    }

    for (const diagnostic of diagnostics) {
      await writeConceptDiagnostic(diagnostic, args.transactionId);
    }
    if (
      !touchedConcepts.length &&
      !touchedSenses.length &&
      !touchedAliases.length &&
      !touchedReviewItems.length
    ) {
      return {
        concepts: [],
        senses: [],
        aliases: [],
        topic_links: [],
        diagnostics,
      };
    }
    const result = await commitConceptState({
      concepts: [...conceptsById.values()],
      senses: [...sensesById.values()],
      aliases: [...aliasesById.values()],
      relations: [...relationsById.values()],
      reviewItems: [...reviewItemsById.values()],
      topicLinks: [
        {
          topicPathId,
          data: {
            topic_id: topicId,
            links: [...linksByKey.values()].sort(
              (left, right) =>
                left.label.localeCompare(right.label) ||
                left.concept_id.localeCompare(right.concept_id),
            ),
          },
        },
      ],
      transactionId: args.transactionId,
    });
    return {
      concepts: touchedConcepts,
      senses: touchedSenses,
      aliases: touchedAliases,
      topic_links: [...linksByKey.values()],
      diagnostics,
      receipt: result.receipt,
    };
  }

  async function applyConceptReviewAction(args: {
    reviewId: string;
    action: "approve_create" | "merge_into_existing" | "reject";
    targetConceptId?: string;
    transactionId?: string;
  }): Promise<SynthesisConceptReviewActionResult> {
    const reviewId = cleanString(args.reviewId);
    const snapshot = await loadConceptKb();
    const review = snapshot.review_items.find(
      (entry) => entry.review_id === reviewId,
    );
    if (!review) {
      return {
        diagnostic: {
          code: "concept_review_item_missing",
          message: "Concept review item does not exist.",
          details: { review_id: reviewId },
        },
      };
    }
    if (review.status !== "open") {
      return {
        review_item: review,
        diagnostic: {
          code: "concept_review_item_closed",
          message: "Concept review item is already resolved.",
          details: { review_id: review.review_id, status: review.status },
        },
      };
    }
    const timestamp = now();
    const conceptsById = new Map(
      snapshot.concepts.map((entry) => [entry.concept_id, entry]),
    );
    const sensesById = new Map(
      snapshot.senses.map((entry) => [entry.sense_id, entry]),
    );
    const aliasesById = new Map(
      snapshot.aliases.map((entry) => [entry.alias_id, entry]),
    );
    const reviewItemsById = new Map(
      snapshot.review_items.map((entry) => [entry.review_id, entry]),
    );
    const existingLinks = await readTopicConceptLinks({
      topicId: review.topic_id,
    });
    const linksByKey = new Map(
      existingLinks.links.map((entry) => [
        `${entry.concept_id}:${entry.sense_id}`,
        entry,
      ]),
    );

    let concept: SynthesisConcept | undefined;
    let sense: SynthesisConceptSense | undefined;
    let topicLink: SynthesisTopicConceptLink | undefined;
    const aliases: SynthesisConceptAlias[] = [];
    let resolvedStatus: SynthesisConceptReviewStatus = "rejected";
    let targetConceptId = cleanString(args.targetConceptId);

    if (args.action === "reject") {
      resolvedStatus = "rejected";
    } else {
      if (args.action === "merge_into_existing") {
        if (!targetConceptId || !conceptsById.has(targetConceptId)) {
          return {
            review_item: review,
            diagnostic: {
              code: "concept_review_target_missing",
              message:
                "Merge review action requires an existing target concept.",
              details: {
                review_id: review.review_id,
                target_concept_id: targetConceptId,
              },
            },
          };
        }
        resolvedStatus = "merged";
      } else {
        targetConceptId = conceptIdFromLabel(
          review.proposal.label,
          review.proposal.domain,
        );
        resolvedStatus = "approved";
      }
      const previousConcept = conceptsById.get(targetConceptId);
      const senseId = senseIdFor({
        conceptId: targetConceptId,
        label: review.proposal.label,
        domain: review.proposal.domain,
        definition: review.proposal.definition,
      });
      concept = {
        concept_id: targetConceptId,
        label: previousConcept?.label || review.proposal.label,
        aliases: normalizeStringList([
          ...(previousConcept?.aliases || []),
          ...review.proposal.aliases,
        ]),
        concept_type:
          previousConcept?.concept_type || review.proposal.concept_type,
        domain: previousConcept?.domain || review.proposal.domain,
        status: previousConcept?.status || "active",
        short_definition:
          previousConcept?.short_definition || review.proposal.short_definition,
        definition: previousConcept?.definition || review.proposal.definition,
        usage_note: previousConcept?.usage_note,
        editorial_note: previousConcept?.editorial_note,
        sense_ids: normalizeStringList([
          ...(previousConcept?.sense_ids || []),
          senseId,
        ]),
        created_at: previousConcept?.created_at || timestamp,
        updated_at: timestamp,
      };
      const previousSense = sensesById.get(senseId);
      sense = {
        sense_id: senseId,
        concept_id: targetConceptId,
        label: review.proposal.label,
        aliases: review.proposal.aliases,
        domain: review.proposal.domain,
        short_definition: review.proposal.short_definition,
        definition: review.proposal.definition,
        disambiguation: review.proposal.disambiguation,
        topic_relevance: review.proposal.topic_relevance,
        confidence: review.proposal.confidence,
        source_topic_ids: normalizeStringList([
          ...(previousSense?.source_topic_ids || []),
          review.topic_id,
        ]),
        evidence: [
          ...(previousSense?.evidence || []),
          ...review.proposal.evidence,
        ],
        created_at: previousSense?.created_at || timestamp,
        updated_at: timestamp,
      };
      conceptsById.set(concept.concept_id, concept);
      sensesById.set(sense.sense_id, sense);
      for (const aliasValue of review.proposal.aliases) {
        const alias = normalizeAlias(aliasValue);
        if (!alias) {
          continue;
        }
        const aliasId = aliasIdFor(alias);
        const previousAlias = aliasesById.get(aliasId);
        const aliasRecord: SynthesisConceptAlias = {
          alias_id: aliasId,
          alias,
          normalized: normalizedAliasKey(alias),
          concept_id: targetConceptId,
          sense_id: sense.sense_id,
          status: previousAlias?.status || "active",
          confidence: review.proposal.confidence,
          created_at: previousAlias?.created_at || timestamp,
          updated_at: timestamp,
        };
        aliasesById.set(aliasRecord.alias_id, aliasRecord);
        aliases.push(aliasRecord);
      }
      topicLink = {
        topic_id: review.topic_id,
        concept_id: targetConceptId,
        sense_id: sense.sense_id,
        label: review.proposal.label,
        relevance: review.proposal.topic_relevance,
        confidence: review.proposal.confidence,
        source: "topic_synthesis_concept_cards",
        created_at:
          linksByKey.get(`${targetConceptId}:${sense.sense_id}`)?.created_at ||
          timestamp,
        updated_at: timestamp,
      };
      linksByKey.set(`${targetConceptId}:${sense.sense_id}`, topicLink);
    }

    const resolvedReview: SynthesisConceptReviewItem = {
      ...review,
      status: resolvedStatus,
      updated_at: timestamp,
      resolved_at: timestamp,
      target_concept_id: targetConceptId || undefined,
    };
    reviewItemsById.set(resolvedReview.review_id, resolvedReview);
    const result = await commitConceptState({
      concepts: [...conceptsById.values()],
      senses: [...sensesById.values()],
      aliases: [...aliasesById.values()],
      relations: snapshot.relations,
      reviewItems: [...reviewItemsById.values()],
      topicLinks: [
        {
          topicPathId: review.topic_path_id,
          data: {
            topic_id: review.topic_id,
            links: [...linksByKey.values()].sort(
              (left, right) =>
                left.label.localeCompare(right.label) ||
                left.concept_id.localeCompare(right.concept_id),
            ),
          },
        },
      ],
      transactionId: args.transactionId,
    });
    return {
      review_item: resolvedReview,
      concept,
      sense,
      aliases,
      topic_link: topicLink,
      receipt: result.receipt,
    };
  }

  async function updateConceptDisplayText(args: {
    conceptId: string;
    fields: Partial<
      Pick<
        SynthesisConcept,
        "short_definition" | "definition" | "usage_note" | "editorial_note"
      >
    >;
    transactionId?: string;
  }) {
    const snapshot = await loadConceptKb();
    const timestamp = now();
    const concepts = snapshot.concepts.map((concept) => {
      if (concept.concept_id !== cleanString(args.conceptId)) {
        return concept;
      }
      return {
        ...concept,
        short_definition:
          "short_definition" in args.fields
            ? cleanString(args.fields.short_definition) || undefined
            : concept.short_definition,
        definition:
          "definition" in args.fields
            ? cleanString(args.fields.definition) || undefined
            : concept.definition,
        usage_note:
          "usage_note" in args.fields
            ? cleanString(args.fields.usage_note) || undefined
            : concept.usage_note,
        editorial_note:
          "editorial_note" in args.fields
            ? cleanString(args.fields.editorial_note) || undefined
            : concept.editorial_note,
        updated_at: timestamp,
      };
    });
    const result = await commitConceptState({
      concepts,
      senses: snapshot.senses,
      aliases: snapshot.aliases,
      relations: snapshot.relations,
      transactionId: args.transactionId,
    });
    return { transactionId: result.transactionId, receipt: result.receipt };
  }

  async function deleteConceptEntries(args: {
    conceptIds?: string[];
    conceptId?: string;
    transactionId?: string;
  }): Promise<SynthesisConceptDeleteResult> {
    const requestedIds = normalizeStringList([
      ...(Array.isArray(args.conceptIds) ? args.conceptIds : []),
      args.conceptId,
    ]);
    if (!requestedIds.length) {
      return {
        deleted_concept_ids: [],
        deleted_sense_ids: [],
        deleted_alias_ids: [],
        deleted_relation_ids: [],
        updated_review_items: [],
        deleted_topic_links: [],
        diagnostic: {
          code: "concept_delete_missing_id",
          message: "Concept deletion requires at least one concept id.",
        },
      };
    }
    const snapshot = await loadConceptKb();
    const existingIds = new Set(
      snapshot.concepts.map((concept) => concept.concept_id),
    );
    const deleteIds = new Set(
      requestedIds.filter((conceptId) => existingIds.has(conceptId)),
    );
    if (!deleteIds.size) {
      return {
        deleted_concept_ids: [],
        deleted_sense_ids: [],
        deleted_alias_ids: [],
        deleted_relation_ids: [],
        updated_review_items: [],
        deleted_topic_links: [],
        diagnostic: {
          code: "concept_delete_not_found",
          message: "No matching concept records were found to delete.",
          details: { concept_ids: requestedIds },
        },
      };
    }
    const timestamp = now();
    const deletedSenses = snapshot.senses.filter((sense) =>
      deleteIds.has(sense.concept_id),
    );
    const deletedSenseIds = new Set(
      deletedSenses.map((sense) => sense.sense_id),
    );
    const deletedAliases = snapshot.aliases.filter(
      (alias) =>
        deleteIds.has(alias.concept_id) ||
        (alias.sense_id ? deletedSenseIds.has(alias.sense_id) : false),
    );
    const deletedRelations = snapshot.relations.filter(
      (relation) =>
        deleteIds.has(relation.source_concept_id) ||
        deleteIds.has(relation.target_concept_id),
    );
    const updatedReviewItems = snapshot.review_items.map((item) => {
      const candidate_concept_ids = item.candidate_concept_ids.filter(
        (conceptId) => !deleteIds.has(conceptId),
      );
      const target_concept_id =
        item.target_concept_id && deleteIds.has(item.target_concept_id)
          ? undefined
          : item.target_concept_id;
      const changed =
        candidate_concept_ids.length !== item.candidate_concept_ids.length ||
        target_concept_id !== item.target_concept_id;
      return {
        ...item,
        candidate_concept_ids,
        target_concept_id,
        updated_at: changed ? timestamp : item.updated_at,
      };
    });
    const existingTopicLinks = repository
      .listTopicConceptLinks()
      .map(topicLinkFromRecord);
    const topicIds = new Set(existingTopicLinks.map((link) => link.topic_id));
    const deletedTopicLinks = existingTopicLinks.filter(
      (link) =>
        deleteIds.has(link.concept_id) || deletedSenseIds.has(link.sense_id),
    );
    const topicLinks = Array.from(topicIds)
      .map((topicId) => ({
        topicPathId: topicId,
        data: {
          topic_id: topicId,
          links: existingTopicLinks
            .filter((link) => link.topic_id === topicId)
            .filter(
              (link) =>
                !deleteIds.has(link.concept_id) &&
                !deletedSenseIds.has(link.sense_id),
            ),
        },
      }))
      .filter((entry) =>
        existingTopicLinks.some(
          (link) => link.topic_id === entry.data.topic_id,
        ),
      );
    const result = await commitConceptState({
      concepts: snapshot.concepts.filter(
        (concept) => !deleteIds.has(concept.concept_id),
      ),
      senses: snapshot.senses.filter(
        (sense) => !deleteIds.has(sense.concept_id),
      ),
      aliases: snapshot.aliases.filter(
        (alias) =>
          !deleteIds.has(alias.concept_id) &&
          !(alias.sense_id && deletedSenseIds.has(alias.sense_id)),
      ),
      relations: snapshot.relations.filter(
        (relation) =>
          !deleteIds.has(relation.source_concept_id) &&
          !deleteIds.has(relation.target_concept_id),
      ),
      reviewItems: updatedReviewItems,
      topicLinks,
      transactionId: args.transactionId,
    });
    return {
      deleted_concept_ids: Array.from(deleteIds).sort(),
      deleted_sense_ids: Array.from(deletedSenseIds).sort(),
      deleted_alias_ids: deletedAliases.map((alias) => alias.alias_id).sort(),
      deleted_relation_ids: deletedRelations
        .map((relation) => relation.relation_id)
        .sort(),
      updated_review_items: updatedReviewItems,
      deleted_topic_links: deletedTopicLinks,
      receipt: result.receipt,
    };
  }

  async function rebuildConceptKbIndexProjection(
    options: IndexRebuildOptions = {},
  ) {
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
    const snapshot = await loadConceptKb(options);
    await reportProgress(
      "build_projection",
      "Build projection",
      1,
      `${snapshot.concepts.length} concepts loaded`,
    );
    const rebuiltAt = now();
    const projection = conceptProjectionFromSnapshot({ snapshot, rebuiltAt });
    await options.yieldControl?.();
    await reportProgress("write_projection", "Write projection", 2);
    await options.yieldControl?.();
    await reportProgress("record_projection", "Record projection", 3);
    return recordProjectionRebuild({
      root,
      target: SYNTHESIS_CONCEPT_INDEX_TARGET,
      schemaVersion: SYNTHESIS_CONCEPT_INDEX_SCHEMA_VERSION,
      sourceManifestHash: snapshot.manifest.manifest_hash,
      diagnostics: projection.diagnostics,
      now: rebuiltAt,
    });
  }

  async function readConceptKbIndexProjection() {
    return conceptProjectionFromSnapshot({
      snapshot: await loadConceptKb(),
      rebuiltAt: now(),
    });
  }

  return {
    loadConceptKb,
    saveConceptKb,
    importConceptKbCheckpoint,
    ingestConceptCardProposals,
    applyConceptReviewAction,
    updateConceptDisplayText,
    deleteConceptEntries,
    exportConceptKbCheckpoint,
    rebuildConceptKbIndexProjection,
    readConceptKbIndexProjection,
  };
}

export type SynthesisConceptKbService = ReturnType<
  typeof createSynthesisConceptKbService
>;
