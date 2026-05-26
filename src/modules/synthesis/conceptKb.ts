import { getBaseName, joinPath } from "../../utils/path";
import {
  ensureRuntimeDirectory,
  listRuntimeChildren,
  readRuntimeTextFile,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../runtimePersistence";
import {
  buildSynthesisKnowledgeGraphPaths,
  canonicalAssetFileName,
  hashCanonicalJson,
  initializeSynthesisKnowledgeGraphStore,
  readCanonicalJsonAsset,
  readProjectionRegistryState,
  recordProjectionRebuild,
  SynthesisSchemaRegistry,
  writeCanonicalDiagnostic,
  writeCanonicalTransaction,
  type CanonicalTransactionReceipt,
  type ProjectionState,
} from "./foundation";

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

type ServiceOptions = {
  root: string;
  now?: () => string;
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

function conceptFileName(conceptId: string) {
  return canonicalAssetFileName("concept", conceptId);
}

function senseFileName(senseId: string) {
  return canonicalAssetFileName("sense", senseId);
}

function aliasFileName(aliasId: string) {
  return canonicalAssetFileName("alias", aliasId);
}

function relationFileName(relationId: string) {
  return canonicalAssetFileName("relation", relationId);
}

function reviewFileName(reviewId: string) {
  return canonicalAssetFileName("review", reviewId);
}

function relativeTopicConceptLinksPath(topicPathId: string) {
  return `topics/${safeId(topicPathId, "topic")}/current/concepts.json`;
}

function relativeConceptPath(conceptId: string) {
  return `concepts/concepts/${conceptFileName(conceptId)}`;
}

function relativeSensePath(senseId: string) {
  return `concepts/senses/${senseFileName(senseId)}`;
}

function relativeAliasPath(aliasId: string) {
  return `concepts/aliases/${aliasFileName(aliasId)}`;
}

function relativeRelationPath(relationId: string) {
  return `concepts/relations/${relationFileName(relationId)}`;
}

function relativeReviewPath(reviewId: string) {
  return `concepts/review/${reviewFileName(reviewId)}`;
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

export function createSynthesisConceptKbService(options: ServiceOptions) {
  const root = cleanString(options.root);
  if (!root) {
    throw new Error("Synthesis concept KB service requires a storage root");
  }
  const now = options.now || nowIso;
  const registry = createRegistry();

  async function readAsset<T>(relativePath: string, schemaId: string) {
    return readCanonicalJsonAsset<T>({
      root,
      registry,
      relativePath,
      schemaId,
    });
  }

  async function ensureConceptStore() {
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    await Promise.all([
      ensureRuntimeDirectory(joinPath(paths.conceptsRoot, "concepts")),
      ensureRuntimeDirectory(joinPath(paths.conceptsRoot, "senses")),
      ensureRuntimeDirectory(joinPath(paths.conceptsRoot, "aliases")),
      ensureRuntimeDirectory(joinPath(paths.conceptsRoot, "relations")),
      ensureRuntimeDirectory(joinPath(paths.conceptsRoot, "review")),
      ensureRuntimeDirectory(joinPath(paths.conceptsRoot, "tombstones")),
    ]);
    if (
      !(await runtimePathExists(joinPath(paths.conceptsRoot, "manifest.json")))
    ) {
      await commitConceptState({
        concepts: [],
        senses: [],
        aliases: [],
        relations: [],
        transactionId: "concept-kb-init",
      });
    }
    return paths;
  }

  async function readDirAssets<T>(dirName: string, schemaId: string) {
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    const dir = joinPath(paths.conceptsRoot, dirName);
    await ensureRuntimeDirectory(dir);
    const rows: T[] = [];
    for (const child of await listRuntimeChildren(dir)) {
      if (!getBaseName(child).endsWith(".json")) {
        continue;
      }
      const parsed = await readAsset<T>(
        `concepts/${dirName}/${getBaseName(child)}`,
        schemaId,
      ).catch(() => null);
      if (parsed?.data) {
        rows.push(parsed.data);
      }
    }
    return rows;
  }

  async function readTopicConceptLinks(args: {
    topicPathId: string;
    topicId: string;
  }) {
    const parsed = await readAsset<SynthesisTopicConceptLinksAsset>(
      relativeTopicConceptLinksPath(args.topicPathId),
      SYNTHESIS_CONCEPT_TOPIC_LINKS_SCHEMA_ID,
    ).catch(() => null);
    return parsed?.data || { topic_id: args.topicId, links: [] };
  }

  async function readManifest(args: {
    concepts: SynthesisConcept[];
    senses: SynthesisConceptSense[];
    aliases: SynthesisConceptAlias[];
    relations: SynthesisConceptRelation[];
  }) {
    return (
      (
        await readAsset<SynthesisConceptManifest>(
          "concepts/manifest.json",
          SYNTHESIS_CONCEPT_MANIFEST_SCHEMA_ID,
        ).catch(() => null)
      )?.data ||
      buildManifest({
        ...args,
        updatedAt: now(),
      })
    );
  }

  async function loadConceptKb(): Promise<SynthesisConceptKbSnapshot> {
    await ensureConceptStore();
    const concepts = sortConcepts(
      await readDirAssets<SynthesisConcept>(
        "concepts",
        SYNTHESIS_CONCEPT_SCHEMA_ID,
      ),
    );
    const senses = sortSenses(
      await readDirAssets<SynthesisConceptSense>(
        "senses",
        SYNTHESIS_CONCEPT_SENSE_SCHEMA_ID,
      ),
    );
    const aliases = sortAliases(
      await readDirAssets<SynthesisConceptAlias>(
        "aliases",
        SYNTHESIS_CONCEPT_ALIAS_SCHEMA_ID,
      ),
    );
    const relations = sortRelations(
      await readDirAssets<SynthesisConceptRelation>(
        "relations",
        SYNTHESIS_CONCEPT_RELATION_SCHEMA_ID,
      ),
    );
    const reviewItems = sortReviewItems(
      await readDirAssets<SynthesisConceptReviewItem>(
        "review",
        SYNTHESIS_CONCEPT_REVIEW_ITEM_SCHEMA_ID,
      ),
    );
    const manifest = await readManifest({
      concepts,
      senses,
      aliases,
      relations,
    });
    const projectionState = await readProjectionRegistryState(root);
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
    const manifest = buildManifest({
      concepts,
      senses,
      aliases,
      relations,
      updatedAt: timestamp,
    });
    return writeCanonicalTransaction({
      root,
      registry,
      scope: "concepts",
      transactionId: args.transactionId,
      projectionTargets: [SYNTHESIS_CONCEPT_INDEX_TARGET],
      sourceManifestHash: manifest.manifest_hash,
      assets: [
        ...concepts.map((concept) => ({
          relativePath: relativeConceptPath(concept.concept_id),
          schemaId: SYNTHESIS_CONCEPT_SCHEMA_ID,
          data: concept,
        })),
        ...senses.map((sense) => ({
          relativePath: relativeSensePath(sense.sense_id),
          schemaId: SYNTHESIS_CONCEPT_SENSE_SCHEMA_ID,
          data: sense,
        })),
        ...aliases.map((alias) => ({
          relativePath: relativeAliasPath(alias.alias_id),
          schemaId: SYNTHESIS_CONCEPT_ALIAS_SCHEMA_ID,
          data: alias,
        })),
        ...relations.map((relation) => ({
          relativePath: relativeRelationPath(relation.relation_id),
          schemaId: SYNTHESIS_CONCEPT_RELATION_SCHEMA_ID,
          data: relation,
        })),
        ...reviewItems.map((reviewItem) => ({
          relativePath: relativeReviewPath(reviewItem.review_id),
          schemaId: SYNTHESIS_CONCEPT_REVIEW_ITEM_SCHEMA_ID,
          data: reviewItem,
        })),
        ...(args.topicLinks || []).map((entry) => ({
          relativePath: relativeTopicConceptLinksPath(entry.topicPathId),
          schemaId: SYNTHESIS_CONCEPT_TOPIC_LINKS_SCHEMA_ID,
          data: entry.data,
        })),
        {
          relativePath: "concepts/manifest.json",
          schemaId: SYNTHESIS_CONCEPT_MANIFEST_SCHEMA_ID,
          data: manifest,
        },
      ],
    });
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
    const existingLinks = await readTopicConceptLinks({ topicPathId, topicId });
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
      topicPathId: review.topic_path_id,
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

  async function rebuildConceptKbIndexProjection() {
    const snapshot = await loadConceptKb();
    const rebuiltAt = now();
    const projection: SynthesisConceptIndexProjection = {
      schema_id: "synthesis.concept_kb_index_projection",
      schema_version: SYNTHESIS_CONCEPT_INDEX_SCHEMA_VERSION,
      source_manifest_hash: snapshot.manifest.manifest_hash,
      rebuilt_at: rebuiltAt,
      concepts: snapshot.concepts,
      senses: snapshot.senses,
      aliases: snapshot.aliases,
      relations: snapshot.relations,
      review_items: snapshot.review_items,
      search: snapshot.concepts.map((concept) => ({
        concept_id: concept.concept_id,
        label: concept.label,
        normalized:
          `${concept.label} ${concept.aliases.join(" ")} ${concept.short_definition || ""} ${concept.definition || ""}`.toLowerCase(),
        concept_type: concept.concept_type,
        domain: concept.domain,
      })),
      overlay_entries: snapshot.overlay_entries,
      diagnostics: snapshot.diagnostics,
    };
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    await writeRuntimeTextFile(
      joinPath(paths.stateRoot, "concept-kb-index.json"),
      `${JSON.stringify(projection, null, 2)}\n`,
    );
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
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    const projectionPath = joinPath(paths.stateRoot, "concept-kb-index.json");
    try {
      const raw = await readRuntimeTextFile(projectionPath);
      return JSON.parse(raw) as SynthesisConceptIndexProjection;
    } catch {
      await rebuildConceptKbIndexProjection();
      const raw = await readRuntimeTextFile(projectionPath);
      return JSON.parse(raw) as SynthesisConceptIndexProjection;
    }
  }

  return {
    loadConceptKb,
    saveConceptKb,
    ingestConceptCardProposals,
    applyConceptReviewAction,
    updateConceptDisplayText,
    rebuildConceptKbIndexProjection,
    readConceptKbIndexProjection,
  };
}

export type SynthesisConceptKbService = ReturnType<
  typeof createSynthesisConceptKbService
>;
