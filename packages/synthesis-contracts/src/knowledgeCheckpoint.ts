import {
  SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS,
  rebuildSynthesisConceptKbApplicationSnapshot,
  type SynthesisConceptKbApplicationSnapshot,
} from "./conceptKbApplication.js";
import {
  SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS,
  rebuildSynthesisTagVocabularyApplicationCandidate,
  type SynthesisTagVocabularyApplicationCandidate,
} from "./tagVocabularyApplication.js";
import {
  SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS,
  rebuildSynthesisTopicGraphApplicationSnapshot,
  type SynthesisTopicGraphApplicationSnapshot,
} from "./topicGraphApplication.js";

export const SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION =
  "synthesis-knowledge-checkpoint.v1" as const;

export const SYNTHESIS_KNOWLEDGE_CHECKPOINT_LIMITS = Object.freeze({
  tagEntries: SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.entries,
  tagAliases: SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.aliases,
  tagAbbrev: SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.abbrev,
  concepts: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.concepts,
  conceptSenses: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.senses,
  conceptAliases: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.aliases,
  conceptRelations: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.relations,
  conceptReviewItems: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.reviewItems,
  conceptTopicLinks: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.topicLinks,
  topicGraphNodes: SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.nodes,
  topicGraphEdges: SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.edges,
  topicGraphReviewItems: SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.reviewItems,
  receiptId: 256,
} as const);

export type SynthesisKnowledgeCheckpointBases = {
  tagRevision: string | null;
  conceptManifest: string | null;
  topicGraphManifest: string | null;
};

export type SynthesisKnowledgeCheckpointPayload = {
  tagVocabulary: SynthesisTagVocabularyApplicationCandidate;
  conceptKb: SynthesisConceptKbApplicationSnapshot;
  topicGraph: SynthesisTopicGraphApplicationSnapshot;
};

export type SynthesisKnowledgeCheckpointCounts = {
  tagVocabulary: {
    entries: number;
    aliases: number;
    abbrev: number;
    protocol: 1;
  };
  conceptKb: {
    concepts: number;
    senses: number;
    aliases: number;
    relations: number;
    reviewItems: number;
    topicLinks: number;
  };
  topicGraph: {
    nodes: number;
    edges: number;
    reviewItems: number;
  };
};

export type SynthesisKnowledgeCheckpoint = {
  contractVersion: typeof SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION;
  bases: SynthesisKnowledgeCheckpointBases;
  payload: SynthesisKnowledgeCheckpointPayload;
  counts: SynthesisKnowledgeCheckpointCounts;
  checkpointHash: string;
  generatedAt: string;
};

export type SynthesisKnowledgeCheckpointFamilyDiff = {
  added: number;
  updated: number;
  deleted: number;
};

export type SynthesisKnowledgeCheckpointDiff = {
  tagVocabulary: {
    entries: SynthesisKnowledgeCheckpointFamilyDiff;
    aliases: SynthesisKnowledgeCheckpointFamilyDiff;
    abbrev: SynthesisKnowledgeCheckpointFamilyDiff;
    protocol: SynthesisKnowledgeCheckpointFamilyDiff;
  };
  conceptKb: {
    concepts: SynthesisKnowledgeCheckpointFamilyDiff;
    senses: SynthesisKnowledgeCheckpointFamilyDiff;
    aliases: SynthesisKnowledgeCheckpointFamilyDiff;
    relations: SynthesisKnowledgeCheckpointFamilyDiff;
    reviewItems: SynthesisKnowledgeCheckpointFamilyDiff;
    topicLinks: SynthesisKnowledgeCheckpointFamilyDiff;
  };
  topicGraph: {
    nodes: SynthesisKnowledgeCheckpointFamilyDiff;
    edges: SynthesisKnowledgeCheckpointFamilyDiff;
    reviewItems: SynthesisKnowledgeCheckpointFamilyDiff;
  };
};

export type SynthesisKnowledgeCheckpointUserDecisionOverride = {
  domain: "tagVocabulary" | "conceptKb" | "topicGraph";
  family: "entries" | "relations" | "reviewItems" | "topicLinks" | "edges";
  id: string;
  currentDecision: string;
  nextDecision: string | null;
};

export type SynthesisKnowledgeCheckpointPreview = {
  receiptId: string;
  checkpointHash: string;
  capturedBases: SynthesisKnowledgeCheckpointBases;
  diff: SynthesisKnowledgeCheckpointDiff;
  userDecisionOverrides: SynthesisKnowledgeCheckpointUserDecisionOverride[];
};

export type SynthesisKnowledgeCheckpointApplyRequest = {
  receiptId: string;
  checkpointHash: string;
  acknowledgeFullReplacement: boolean;
};

export class SynthesisKnowledgeCheckpointContractError extends Error {
  readonly code = "invalid_request" as const;

  constructor(readonly location: string) {
    super(`Invalid Synthesis knowledge checkpoint value at ${location}`);
    this.name = "SynthesisKnowledgeCheckpointContractError";
  }
}

const HASH = /^sha256:[a-f0-9]{64}$/;

function invalid(location: string): never {
  throw new SynthesisKnowledgeCheckpointContractError(location);
}

function object(value: unknown, location: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalid(location);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(location);
  return value as Record<string, unknown>;
}

function exact(
  value: Record<string, unknown>,
  fields: readonly string[],
  location: string,
) {
  const allowed = new Set(fields);
  if (Object.keys(value).some((field) => !allowed.has(field))) {
    invalid(`${location}.fields`);
  }
}

function hashOrNull(value: unknown, location: string) {
  if (value === null) return null;
  if (typeof value !== "string" || !HASH.test(value)) return invalid(location);
  return value;
}

function hash(value: unknown, location: string) {
  const result = hashOrNull(value, location);
  if (result === null) return invalid(location);
  return result;
}

function nonNegativeInteger(value: unknown, location: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    return invalid(location);
  }
  return Number(value);
}

function receiptId(value: unknown, location: string) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > SYNTHESIS_KNOWLEDGE_CHECKPOINT_LIMITS.receiptId
  ) {
    return invalid(location);
  }
  return value.trim();
}

export function rebuildSynthesisKnowledgeCheckpointBases(
  value: unknown,
): SynthesisKnowledgeCheckpointBases {
  const row = object(value, "knowledgeCheckpoint.bases");
  exact(
    row,
    ["tagRevision", "conceptManifest", "topicGraphManifest"],
    "knowledgeCheckpoint.bases",
  );
  return {
    tagRevision: hashOrNull(
      row.tagRevision,
      "knowledgeCheckpoint.bases.tagRevision",
    ),
    conceptManifest: hashOrNull(
      row.conceptManifest,
      "knowledgeCheckpoint.bases.conceptManifest",
    ),
    topicGraphManifest: hashOrNull(
      row.topicGraphManifest,
      "knowledgeCheckpoint.bases.topicGraphManifest",
    ),
  };
}

export function rebuildSynthesisKnowledgeCheckpointPayload(
  value: unknown,
): SynthesisKnowledgeCheckpointPayload {
  const row = object(value, "knowledgeCheckpoint.payload");
  exact(
    row,
    ["tagVocabulary", "conceptKb", "topicGraph"],
    "knowledgeCheckpoint.payload",
  );
  const rebuiltTagVocabulary =
    rebuildSynthesisTagVocabularyApplicationCandidate(row.tagVocabulary);
  const tagVocabulary = {
    ...rebuiltTagVocabulary,
    entries: rebuiltTagVocabulary.entries.map((entry) => ({
      ...entry,
      usageCount: entry.usageCount ?? 0,
    })),
  };
  const tagIds = new Set(tagVocabulary.entries.map((entry) => entry.tag));
  for (const [alias, target] of Object.entries(tagVocabulary.aliases)) {
    if (!tagIds.has(target)) {
      invalid(`knowledgeCheckpoint.payload.tagVocabulary.aliases.${alias}`);
    }
  }
  for (const entry of tagVocabulary.entries) {
    if (entry.replacement && !tagIds.has(entry.replacement)) {
      invalid(
        `knowledgeCheckpoint.payload.tagVocabulary.entries.${entry.tag}.replacement`,
      );
    }
  }
  return {
    tagVocabulary,
    conceptKb: rebuildSynthesisConceptKbApplicationSnapshot(row.conceptKb),
    topicGraph: rebuildSynthesisTopicGraphApplicationSnapshot(row.topicGraph),
  };
}

export function countSynthesisKnowledgeCheckpointPayload(
  payload: SynthesisKnowledgeCheckpointPayload,
): SynthesisKnowledgeCheckpointCounts {
  return {
    tagVocabulary: {
      entries: payload.tagVocabulary.entries.length,
      aliases: Object.keys(payload.tagVocabulary.aliases).length,
      abbrev: Object.keys(payload.tagVocabulary.abbrev).length,
      protocol: 1,
    },
    conceptKb: {
      concepts: payload.conceptKb.concepts.length,
      senses: payload.conceptKb.senses.length,
      aliases: payload.conceptKb.aliases.length,
      relations: payload.conceptKb.relations.length,
      reviewItems: payload.conceptKb.reviewItems.length,
      topicLinks: payload.conceptKb.topicLinks.length,
    },
    topicGraph: {
      nodes: payload.topicGraph.nodes.length,
      edges: payload.topicGraph.edges.length,
      reviewItems: payload.topicGraph.reviewItems.length,
    },
  };
}

function rebuildCountFamily<const T extends Record<string, number>>(
  value: unknown,
  expected: T,
  location: string,
): T {
  const row = object(value, location);
  const fields = Object.keys(expected);
  exact(row, fields, location);
  const result = Object.fromEntries(
    fields.map((field) => [
      field,
      nonNegativeInteger(row[field], `${location}.${field}`),
    ]),
  ) as T;
  for (const field of fields) {
    if (result[field] !== expected[field]) {
      invalid(`${location}.${field}`);
    }
  }
  return result;
}

export function rebuildSynthesisKnowledgeCheckpointCounts(
  value: unknown,
  payload: SynthesisKnowledgeCheckpointPayload,
): SynthesisKnowledgeCheckpointCounts {
  const row = object(value, "knowledgeCheckpoint.counts");
  exact(
    row,
    ["tagVocabulary", "conceptKb", "topicGraph"],
    "knowledgeCheckpoint.counts",
  );
  const expected = countSynthesisKnowledgeCheckpointPayload(payload);
  return {
    tagVocabulary: rebuildCountFamily(
      row.tagVocabulary,
      expected.tagVocabulary,
      "knowledgeCheckpoint.counts.tagVocabulary",
    ),
    conceptKb: rebuildCountFamily(
      row.conceptKb,
      expected.conceptKb,
      "knowledgeCheckpoint.counts.conceptKb",
    ),
    topicGraph: rebuildCountFamily(
      row.topicGraph,
      expected.topicGraph,
      "knowledgeCheckpoint.counts.topicGraph",
    ),
  };
}

export function rebuildSynthesisKnowledgeCheckpoint(
  value: unknown,
): SynthesisKnowledgeCheckpoint {
  const row = object(value, "knowledgeCheckpoint");
  exact(
    row,
    [
      "contractVersion",
      "bases",
      "payload",
      "counts",
      "checkpointHash",
      "generatedAt",
    ],
    "knowledgeCheckpoint",
  );
  if (row.contractVersion !== SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION) {
    invalid("knowledgeCheckpoint.contractVersion");
  }
  const generatedAt = row.generatedAt;
  if (
    typeof generatedAt !== "string" ||
    !generatedAt ||
    Number.isNaN(Date.parse(generatedAt))
  ) {
    invalid("knowledgeCheckpoint.generatedAt");
  }
  const payload = rebuildSynthesisKnowledgeCheckpointPayload(row.payload);
  return {
    contractVersion: SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION,
    bases: rebuildSynthesisKnowledgeCheckpointBases(row.bases),
    payload,
    counts: rebuildSynthesisKnowledgeCheckpointCounts(row.counts, payload),
    checkpointHash: hash(
      row.checkpointHash,
      "knowledgeCheckpoint.checkpointHash",
    ),
    generatedAt,
  };
}

export function rebuildSynthesisKnowledgeCheckpointApplyRequest(
  value: unknown,
): SynthesisKnowledgeCheckpointApplyRequest {
  const row = object(value, "knowledgeCheckpointApply");
  exact(
    row,
    ["receiptId", "checkpointHash", "acknowledgeFullReplacement"],
    "knowledgeCheckpointApply",
  );
  if (typeof row.acknowledgeFullReplacement !== "boolean") {
    invalid("knowledgeCheckpointApply.acknowledgeFullReplacement");
  }
  return {
    receiptId: receiptId(row.receiptId, "knowledgeCheckpointApply.receiptId"),
    checkpointHash: hash(
      row.checkpointHash,
      "knowledgeCheckpointApply.checkpointHash",
    ),
    acknowledgeFullReplacement: row.acknowledgeFullReplacement,
  };
}
