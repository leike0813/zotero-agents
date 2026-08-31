import {
  type SynthesisConceptKbConceptStatus,
  type SynthesisConceptKbConfidence,
  type SynthesisConceptKbIndexResult,
  type SynthesisConceptKbQueryResult,
} from "./conceptKbCore.js";

export const SYNTHESIS_CONCEPT_KB_APPLICATION_CONTRACT_VERSION =
  "synthesis-concept-kb-application.v1" as const;

export const SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS = Object.freeze({
  concepts: 25_000,
  senses: 100_000,
  aliases: 250_000,
  relations: 250_000,
  reviewItems: 25_000,
  topicLinks: 250_000,
  proposals: 1_000,
  queryLabels: 100,
  perRowStrings: 256,
  string: 4096,
  jsonItems: 10_000,
} as const);

export type SynthesisConceptKbApplicationConcept = {
  conceptId: string;
  label: string;
  aliases: string[];
  conceptType: string;
  domain: string;
  status: SynthesisConceptKbConceptStatus;
  shortDefinition?: string;
  definition?: string;
  usageNote?: string;
  editorialNote?: string;
  senseIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptKbApplicationSense = {
  senseId: string;
  conceptId: string;
  label: string;
  aliases: string[];
  domain: string;
  shortDefinition?: string;
  definition?: string;
  disambiguation?: string;
  topicRelevance?: string;
  confidence: SynthesisConceptKbConfidence;
  sourceTopicIds: string[];
  evidence: unknown[];
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptKbApplicationAlias = {
  aliasId: string;
  alias: string;
  normalized: string;
  conceptId: string;
  senseId?: string;
  status: SynthesisConceptKbConceptStatus;
  confidence: SynthesisConceptKbConfidence;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptKbApplicationRelation = {
  relationId: string;
  sourceConceptId: string;
  targetConceptId: string;
  relation:
    | "used_by"
    | "uses"
    | "broader_than"
    | "narrower_than"
    | "related_to"
    | "contrasts_with"
    | "part_of"
    | "has_part";
  status: "suggested" | "confirmed" | "rejected";
  confidence: SynthesisConceptKbConfidence;
  provenance: unknown[];
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptKbApplicationProposal = {
  localId?: string;
  label: string;
  aliases: string[];
  conceptType: string;
  domain: string;
  shortDefinition: string;
  definition: string;
  disambiguation?: string;
  topicRelevance?: string;
  evidence: unknown[];
  relations: SynthesisConceptKbApplicationProposalRelation[];
  mergeHints: unknown[];
  confidence: SynthesisConceptKbConfidence;
};

export type SynthesisConceptKbApplicationProposalRelation = {
  targetConceptId: string;
  relation: SynthesisConceptKbApplicationRelation["relation"];
  confidence: SynthesisConceptKbConfidence;
  provenance: unknown[];
};

export type SynthesisConceptKbApplicationReviewItem = {
  reviewId: string;
  status: "open" | "approved" | "merged" | "rejected";
  reason: "low_confidence_concept" | "ambiguous_concept_match";
  topicId: string;
  topicPathId: string;
  label: string;
  confidence: SynthesisConceptKbConfidence;
  candidateConceptIds: string[];
  proposal: SynthesisConceptKbApplicationProposal;
  targetConceptId?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
};

export type SynthesisConceptKbApplicationTopicLink = {
  topicId: string;
  conceptId: string;
  senseId: string;
  label: string;
  relevance?: string;
  confidence: SynthesisConceptKbConfidence;
  source: "topic_synthesis_concept_cards" | "manual";
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptKbApplicationSnapshot = {
  concepts: SynthesisConceptKbApplicationConcept[];
  senses: SynthesisConceptKbApplicationSense[];
  aliases: SynthesisConceptKbApplicationAlias[];
  relations: SynthesisConceptKbApplicationRelation[];
  reviewItems: SynthesisConceptKbApplicationReviewItem[];
  topicLinks: SynthesisConceptKbApplicationTopicLink[];
};

export type SynthesisConceptKbApplicationState = {
  manifestHash: string | null;
  revision: number;
  indexHash: string | null;
  indexBasisHash: string | null;
  indexStale: boolean;
  conceptCount: number;
  senseCount: number;
  aliasCount: number;
  relationCount: number;
  reviewItemCount: number;
  topicLinkCount: number;
};

export type SynthesisConceptKbApplicationMutationStatus =
  | "committed"
  | "unchanged"
  | "not_found"
  | "basis_mismatch"
  | "concept_kb_busy"
  | "invalid_request"
  | "worker_failed"
  | "stopping";

export type SynthesisConceptKbApplicationMutationResult = {
  status: SynthesisConceptKbApplicationMutationStatus;
  manifestHash: string | null;
  revision: number;
  changedConceptIds: string[];
  reviewIds: string[];
  diagnostics: Array<{ code: string; severity: "warning" | "error" }>;
};

export type SynthesisConceptKbApplicationLoaded = {
  state: SynthesisConceptKbApplicationState;
  snapshot: SynthesisConceptKbApplicationSnapshot;
  index: SynthesisConceptKbIndexResult | null;
};

export class SynthesisConceptKbApplicationContractError extends Error {
  readonly code = "invalid_request" as const;

  constructor(readonly location: string) {
    super(`Invalid Concept KB application value at ${location}`);
    this.name = "SynthesisConceptKbApplicationContractError";
  }
}

const HASH = /^sha256:[a-f0-9]{64}$/;

function invalid(location: string): never {
  throw new SynthesisConceptKbApplicationContractError(location);
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

function string(value: unknown, location: string, optional = false) {
  if ((value === undefined || value === null || value === "") && optional) {
    return undefined;
  }
  if (typeof value !== "string") return invalid(location);
  const result = value.trim();
  if (
    !result ||
    result.length > SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.string
  ) {
    return invalid(location);
  }
  return result;
}

function hashOrNull(value: unknown, location: string) {
  if (value === null) return null;
  if (typeof value !== "string" || !HASH.test(value)) return invalid(location);
  return value;
}

function count(value: unknown, location: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    return invalid(location);
  return Number(value);
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  location: string,
): T {
  if (!allowed.includes(value as T)) return invalid(location);
  return value as T;
}

function jsonArray(value: unknown, location: string) {
  if (
    !Array.isArray(value) ||
    value.length > SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.jsonItems
  ) {
    return invalid(location);
  }
  try {
    const cloned = JSON.parse(JSON.stringify(value)) as unknown[];
    if (JSON.stringify(cloned) !== JSON.stringify(value)) invalid(location);
    return cloned;
  } catch {
    return invalid(location);
  }
}

function strings(value: unknown, location: string, max = 256) {
  if (!Array.isArray(value) || value.length > max) return invalid(location);
  const result = value.map((entry, index) =>
    string(entry, `${location}[${index}]`),
  ) as string[];
  if (new Set(result).size !== result.length) invalid(`${location}.unique`);
  return result;
}

const confidence = (value: unknown, location: string) =>
  enumValue(value, ["high", "medium", "low"] as const, location);
const conceptStatus = (value: unknown, location: string) =>
  enumValue(value, ["active", "review", "deprecated"] as const, location);

function concept(value: unknown, index: number) {
  const location = `conceptSnapshot.concepts[${index}]`;
  const row = object(value, location);
  exact(
    row,
    [
      "conceptId",
      "label",
      "aliases",
      "conceptType",
      "domain",
      "status",
      "shortDefinition",
      "definition",
      "usageNote",
      "editorialNote",
      "senseIds",
      "createdAt",
      "updatedAt",
    ],
    location,
  );
  return {
    conceptId: string(row.conceptId, `${location}.conceptId`)!,
    label: string(row.label, `${location}.label`)!,
    aliases: strings(row.aliases, `${location}.aliases`),
    conceptType: string(row.conceptType, `${location}.conceptType`)!,
    domain: string(row.domain, `${location}.domain`)!,
    status: conceptStatus(row.status, `${location}.status`),
    ...(string(row.shortDefinition, `${location}.shortDefinition`, true)
      ? {
          shortDefinition: string(
            row.shortDefinition,
            `${location}.shortDefinition`,
            true,
          ),
        }
      : {}),
    ...(string(row.definition, `${location}.definition`, true)
      ? { definition: string(row.definition, `${location}.definition`, true) }
      : {}),
    ...(string(row.usageNote, `${location}.usageNote`, true)
      ? { usageNote: string(row.usageNote, `${location}.usageNote`, true) }
      : {}),
    ...(string(row.editorialNote, `${location}.editorialNote`, true)
      ? {
          editorialNote: string(
            row.editorialNote,
            `${location}.editorialNote`,
            true,
          ),
        }
      : {}),
    senseIds: strings(
      row.senseIds,
      `${location}.senseIds`,
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.senses,
    ),
    ...(string(row.createdAt, `${location}.createdAt`, true)
      ? { createdAt: string(row.createdAt, `${location}.createdAt`, true) }
      : {}),
    ...(string(row.updatedAt, `${location}.updatedAt`, true)
      ? { updatedAt: string(row.updatedAt, `${location}.updatedAt`, true) }
      : {}),
  } satisfies SynthesisConceptKbApplicationConcept;
}

function sense(value: unknown, index: number) {
  const location = `conceptSnapshot.senses[${index}]`;
  const row = object(value, location);
  exact(
    row,
    [
      "senseId",
      "conceptId",
      "label",
      "aliases",
      "domain",
      "shortDefinition",
      "definition",
      "disambiguation",
      "topicRelevance",
      "confidence",
      "sourceTopicIds",
      "evidence",
      "createdAt",
      "updatedAt",
    ],
    location,
  );
  return {
    senseId: string(row.senseId, `${location}.senseId`)!,
    conceptId: string(row.conceptId, `${location}.conceptId`)!,
    label: string(row.label, `${location}.label`)!,
    aliases: strings(row.aliases, `${location}.aliases`),
    domain: string(row.domain, `${location}.domain`)!,
    ...(string(row.shortDefinition, `${location}.shortDefinition`, true)
      ? {
          shortDefinition: string(
            row.shortDefinition,
            `${location}.shortDefinition`,
            true,
          ),
        }
      : {}),
    ...(string(row.definition, `${location}.definition`, true)
      ? { definition: string(row.definition, `${location}.definition`, true) }
      : {}),
    ...(string(row.disambiguation, `${location}.disambiguation`, true)
      ? {
          disambiguation: string(
            row.disambiguation,
            `${location}.disambiguation`,
            true,
          ),
        }
      : {}),
    ...(string(row.topicRelevance, `${location}.topicRelevance`, true)
      ? {
          topicRelevance: string(
            row.topicRelevance,
            `${location}.topicRelevance`,
            true,
          ),
        }
      : {}),
    confidence: confidence(row.confidence, `${location}.confidence`),
    sourceTopicIds: strings(
      row.sourceTopicIds,
      `${location}.sourceTopicIds`,
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.concepts,
    ),
    evidence: jsonArray(row.evidence, `${location}.evidence`),
    ...(string(row.createdAt, `${location}.createdAt`, true)
      ? { createdAt: string(row.createdAt, `${location}.createdAt`, true) }
      : {}),
    ...(string(row.updatedAt, `${location}.updatedAt`, true)
      ? { updatedAt: string(row.updatedAt, `${location}.updatedAt`, true) }
      : {}),
  } satisfies SynthesisConceptKbApplicationSense;
}

function alias(value: unknown, index: number) {
  const location = `conceptSnapshot.aliases[${index}]`;
  const row = object(value, location);
  exact(
    row,
    [
      "aliasId",
      "alias",
      "normalized",
      "conceptId",
      "senseId",
      "status",
      "confidence",
      "createdAt",
      "updatedAt",
    ],
    location,
  );
  return {
    aliasId: string(row.aliasId, `${location}.aliasId`)!,
    alias: string(row.alias, `${location}.alias`)!,
    normalized: string(row.normalized, `${location}.normalized`)!,
    conceptId: string(row.conceptId, `${location}.conceptId`)!,
    ...(string(row.senseId, `${location}.senseId`, true)
      ? { senseId: string(row.senseId, `${location}.senseId`, true) }
      : {}),
    status: conceptStatus(row.status, `${location}.status`),
    confidence: confidence(row.confidence, `${location}.confidence`),
    ...(string(row.createdAt, `${location}.createdAt`, true)
      ? { createdAt: string(row.createdAt, `${location}.createdAt`, true) }
      : {}),
    ...(string(row.updatedAt, `${location}.updatedAt`, true)
      ? { updatedAt: string(row.updatedAt, `${location}.updatedAt`, true) }
      : {}),
  } satisfies SynthesisConceptKbApplicationAlias;
}

function relation(value: unknown, index: number) {
  const location = `conceptSnapshot.relations[${index}]`;
  const row = object(value, location);
  exact(
    row,
    [
      "relationId",
      "sourceConceptId",
      "targetConceptId",
      "relation",
      "status",
      "confidence",
      "provenance",
      "createdAt",
      "updatedAt",
    ],
    location,
  );
  return {
    relationId: string(row.relationId, `${location}.relationId`)!,
    sourceConceptId: string(
      row.sourceConceptId,
      `${location}.sourceConceptId`,
    )!,
    targetConceptId: string(
      row.targetConceptId,
      `${location}.targetConceptId`,
    )!,
    relation: enumValue(
      row.relation,
      [
        "used_by",
        "uses",
        "broader_than",
        "narrower_than",
        "related_to",
        "contrasts_with",
        "part_of",
        "has_part",
      ] as const,
      `${location}.relation`,
    ),
    status: enumValue(
      row.status,
      ["suggested", "confirmed", "rejected"] as const,
      `${location}.status`,
    ),
    confidence: confidence(row.confidence, `${location}.confidence`),
    provenance: jsonArray(row.provenance, `${location}.provenance`),
    ...(string(row.createdAt, `${location}.createdAt`, true)
      ? { createdAt: string(row.createdAt, `${location}.createdAt`, true) }
      : {}),
    ...(string(row.updatedAt, `${location}.updatedAt`, true)
      ? { updatedAt: string(row.updatedAt, `${location}.updatedAt`, true) }
      : {}),
  } satisfies SynthesisConceptKbApplicationRelation;
}

function proposal(
  value: unknown,
  location: string,
): SynthesisConceptKbApplicationProposal {
  const row = object(value, location);
  exact(
    row,
    [
      "localId",
      "label",
      "aliases",
      "conceptType",
      "domain",
      "shortDefinition",
      "definition",
      "disambiguation",
      "topicRelevance",
      "evidence",
      "relations",
      "mergeHints",
      "confidence",
    ],
    location,
  );
  return {
    ...(string(row.localId, `${location}.localId`, true)
      ? { localId: string(row.localId, `${location}.localId`, true) }
      : {}),
    label: string(row.label, `${location}.label`)!,
    aliases: strings(row.aliases, `${location}.aliases`),
    conceptType: string(row.conceptType, `${location}.conceptType`)!,
    domain: string(row.domain, `${location}.domain`)!,
    shortDefinition:
      string(row.shortDefinition, `${location}.shortDefinition`, true) || "",
    definition: string(row.definition, `${location}.definition`, true) || "",
    ...(string(row.disambiguation, `${location}.disambiguation`, true)
      ? {
          disambiguation: string(
            row.disambiguation,
            `${location}.disambiguation`,
            true,
          ),
        }
      : {}),
    ...(string(row.topicRelevance, `${location}.topicRelevance`, true)
      ? {
          topicRelevance: string(
            row.topicRelevance,
            `${location}.topicRelevance`,
            true,
          ),
        }
      : {}),
    evidence: jsonArray(row.evidence, `${location}.evidence`),
    relations: (() => {
      if (
        !Array.isArray(row.relations) ||
        row.relations.length > SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.relations
      ) {
        return invalid(`${location}.relations`);
      }
      return row.relations.map((entry, index) => {
        const relationLocation = `${location}.relations[${index}]`;
        const relationRow = object(entry, relationLocation);
        exact(
          relationRow,
          ["targetConceptId", "relation", "confidence", "provenance"],
          relationLocation,
        );
        return {
          targetConceptId: string(
            relationRow.targetConceptId,
            `${relationLocation}.targetConceptId`,
          )!,
          relation: enumValue(
            relationRow.relation,
            [
              "used_by",
              "uses",
              "broader_than",
              "narrower_than",
              "related_to",
              "contrasts_with",
              "part_of",
              "has_part",
            ] as const,
            `${relationLocation}.relation`,
          ),
          confidence: confidence(
            relationRow.confidence,
            `${relationLocation}.confidence`,
          ),
          provenance: jsonArray(
            relationRow.provenance,
            `${relationLocation}.provenance`,
          ),
        };
      });
    })(),
    mergeHints: jsonArray(row.mergeHints, `${location}.mergeHints`),
    confidence: confidence(row.confidence, `${location}.confidence`),
  };
}

function reviewItem(value: unknown, index: number) {
  const location = `conceptSnapshot.reviewItems[${index}]`;
  const row = object(value, location);
  exact(
    row,
    [
      "reviewId",
      "status",
      "reason",
      "topicId",
      "topicPathId",
      "label",
      "confidence",
      "candidateConceptIds",
      "proposal",
      "targetConceptId",
      "createdAt",
      "updatedAt",
      "resolvedAt",
    ],
    location,
  );
  return {
    reviewId: string(row.reviewId, `${location}.reviewId`)!,
    status: enumValue(
      row.status,
      ["open", "approved", "merged", "rejected"] as const,
      `${location}.status`,
    ),
    reason: enumValue(
      row.reason,
      ["low_confidence_concept", "ambiguous_concept_match"] as const,
      `${location}.reason`,
    ),
    topicId: string(row.topicId, `${location}.topicId`)!,
    topicPathId: string(row.topicPathId, `${location}.topicPathId`)!,
    label: string(row.label, `${location}.label`)!,
    confidence: confidence(row.confidence, `${location}.confidence`),
    candidateConceptIds: strings(
      row.candidateConceptIds,
      `${location}.candidateConceptIds`,
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.concepts,
    ),
    proposal: proposal(row.proposal, `${location}.proposal`),
    ...(string(row.targetConceptId, `${location}.targetConceptId`, true)
      ? {
          targetConceptId: string(
            row.targetConceptId,
            `${location}.targetConceptId`,
            true,
          ),
        }
      : {}),
    ...(string(row.createdAt, `${location}.createdAt`, true)
      ? { createdAt: string(row.createdAt, `${location}.createdAt`, true) }
      : {}),
    ...(string(row.updatedAt, `${location}.updatedAt`, true)
      ? { updatedAt: string(row.updatedAt, `${location}.updatedAt`, true) }
      : {}),
    ...(string(row.resolvedAt, `${location}.resolvedAt`, true)
      ? { resolvedAt: string(row.resolvedAt, `${location}.resolvedAt`, true) }
      : {}),
  } satisfies SynthesisConceptKbApplicationReviewItem;
}

function topicLink(value: unknown, index: number) {
  const location = `conceptSnapshot.topicLinks[${index}]`;
  const row = object(value, location);
  exact(
    row,
    [
      "topicId",
      "conceptId",
      "senseId",
      "label",
      "relevance",
      "confidence",
      "source",
      "createdAt",
      "updatedAt",
    ],
    location,
  );
  return {
    topicId: string(row.topicId, `${location}.topicId`)!,
    conceptId: string(row.conceptId, `${location}.conceptId`)!,
    senseId: string(row.senseId, `${location}.senseId`)!,
    label: string(row.label, `${location}.label`)!,
    ...(string(row.relevance, `${location}.relevance`, true)
      ? { relevance: string(row.relevance, `${location}.relevance`, true) }
      : {}),
    confidence: confidence(row.confidence, `${location}.confidence`),
    source: enumValue(
      row.source,
      ["topic_synthesis_concept_cards", "manual"] as const,
      `${location}.source`,
    ),
    ...(string(row.createdAt, `${location}.createdAt`, true)
      ? { createdAt: string(row.createdAt, `${location}.createdAt`, true) }
      : {}),
    ...(string(row.updatedAt, `${location}.updatedAt`, true)
      ? { updatedAt: string(row.updatedAt, `${location}.updatedAt`, true) }
      : {}),
  } satisfies SynthesisConceptKbApplicationTopicLink;
}

function unique<T>(rows: T[], id: (row: T) => string, location: string) {
  const ids = rows.map(id);
  if (new Set(ids).size !== ids.length) invalid(`${location}.unique`);
}

export function rebuildSynthesisConceptKbApplicationSnapshot(
  value: unknown,
): SynthesisConceptKbApplicationSnapshot {
  const row = object(value, "conceptSnapshot");
  exact(
    row,
    ["concepts", "senses", "aliases", "relations", "reviewItems", "topicLinks"],
    "conceptSnapshot",
  );
  const bounded = <T>(
    input: unknown,
    max: number,
    location: string,
    rebuild: (value: unknown, index: number) => T,
  ) => {
    if (!Array.isArray(input) || input.length > max) invalid(location);
    return input.map(rebuild);
  };
  const snapshot = {
    concepts: bounded(
      row.concepts,
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.concepts,
      "conceptSnapshot.concepts",
      concept,
    ),
    senses: bounded(
      row.senses,
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.senses,
      "conceptSnapshot.senses",
      sense,
    ),
    aliases: bounded(
      row.aliases,
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.aliases,
      "conceptSnapshot.aliases",
      alias,
    ),
    relations: bounded(
      row.relations,
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.relations,
      "conceptSnapshot.relations",
      relation,
    ),
    reviewItems: bounded(
      row.reviewItems,
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.reviewItems,
      "conceptSnapshot.reviewItems",
      reviewItem,
    ),
    topicLinks: bounded(
      row.topicLinks,
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.topicLinks,
      "conceptSnapshot.topicLinks",
      topicLink,
    ),
  };
  unique(
    snapshot.concepts,
    (entry) => entry.conceptId,
    "conceptSnapshot.concepts",
  );
  unique(snapshot.senses, (entry) => entry.senseId, "conceptSnapshot.senses");
  unique(snapshot.aliases, (entry) => entry.aliasId, "conceptSnapshot.aliases");
  unique(
    snapshot.relations,
    (entry) => entry.relationId,
    "conceptSnapshot.relations",
  );
  unique(
    snapshot.reviewItems,
    (entry) => entry.reviewId,
    "conceptSnapshot.reviewItems",
  );
  unique(
    snapshot.topicLinks,
    (entry) => `${entry.topicId}\n${entry.conceptId}\n${entry.senseId}`,
    "conceptSnapshot.topicLinks",
  );
  const concepts = new Set(snapshot.concepts.map((entry) => entry.conceptId));
  const senses = new Map(
    snapshot.senses.map((entry) => [entry.senseId, entry]),
  );
  for (const entry of snapshot.concepts) {
    if (
      entry.senseIds.some(
        (senseId) => senses.get(senseId)?.conceptId !== entry.conceptId,
      )
    ) {
      invalid(`conceptSnapshot.concepts.${entry.conceptId}.senseIds`);
    }
  }
  for (const entry of snapshot.senses)
    if (!concepts.has(entry.conceptId))
      invalid(`conceptSnapshot.senses.${entry.senseId}.conceptId`);
  for (const entry of snapshot.aliases) {
    if (!concepts.has(entry.conceptId))
      invalid(`conceptSnapshot.aliases.${entry.aliasId}.conceptId`);
    if (
      entry.senseId &&
      senses.get(entry.senseId)?.conceptId !== entry.conceptId
    )
      invalid(`conceptSnapshot.aliases.${entry.aliasId}.senseId`);
  }
  for (const entry of snapshot.relations)
    if (
      !concepts.has(entry.sourceConceptId) ||
      !concepts.has(entry.targetConceptId)
    )
      invalid(`conceptSnapshot.relations.${entry.relationId}.conceptId`);
  for (const entry of snapshot.topicLinks)
    if (
      !concepts.has(entry.conceptId) ||
      senses.get(entry.senseId)?.conceptId !== entry.conceptId
    )
      invalid(`conceptSnapshot.topicLinks.${entry.topicId}.conceptId`);
  for (const entry of snapshot.reviewItems)
    if (
      entry.candidateConceptIds.some((id) => !concepts.has(id)) ||
      (entry.targetConceptId && !concepts.has(entry.targetConceptId))
    )
      invalid(`conceptSnapshot.reviewItems.${entry.reviewId}.conceptId`);
  return {
    concepts: snapshot.concepts.sort((a, b) =>
      a.conceptId.localeCompare(b.conceptId),
    ),
    senses: snapshot.senses.sort((a, b) => a.senseId.localeCompare(b.senseId)),
    aliases: snapshot.aliases.sort((a, b) =>
      a.aliasId.localeCompare(b.aliasId),
    ),
    relations: snapshot.relations.sort((a, b) =>
      a.relationId.localeCompare(b.relationId),
    ),
    reviewItems: snapshot.reviewItems.sort((a, b) =>
      a.reviewId.localeCompare(b.reviewId),
    ),
    topicLinks: snapshot.topicLinks.sort(
      (a, b) =>
        a.topicId.localeCompare(b.topicId) ||
        a.conceptId.localeCompare(b.conceptId) ||
        a.senseId.localeCompare(b.senseId),
    ),
  };
}

export function rebuildSynthesisConceptKbApplicationReplaceRequest(
  value: unknown,
) {
  const row = object(value, "conceptReplace");
  exact(row, ["expectedManifestHash", "snapshot"], "conceptReplace");
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "conceptReplace.expectedManifestHash",
    ),
    snapshot: rebuildSynthesisConceptKbApplicationSnapshot(row.snapshot),
  };
}

export function rebuildSynthesisConceptKbApplicationIngestRequest(
  value: unknown,
) {
  const row = object(value, "conceptIngest");
  exact(
    row,
    ["expectedManifestHash", "topicId", "topicPathId", "proposals"],
    "conceptIngest",
  );
  if (
    !Array.isArray(row.proposals) ||
    row.proposals.length > SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.proposals
  )
    invalid("conceptIngest.proposals");
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "conceptIngest.expectedManifestHash",
    ),
    topicId: string(row.topicId, "conceptIngest.topicId")!,
    topicPathId: string(row.topicPathId, "conceptIngest.topicPathId")!,
    proposals: row.proposals.map((entry, index) =>
      proposal(entry, `conceptIngest.proposals[${index}]`),
    ),
  };
}

export function rebuildSynthesisConceptKbApplicationReviewRequest(
  value: unknown,
) {
  const row = object(value, "conceptReview");
  exact(
    row,
    ["expectedManifestHash", "reviewId", "action", "targetConceptId"],
    "conceptReview",
  );
  const action = enumValue(
    row.action,
    ["approve", "merge", "reject"] as const,
    "conceptReview.action",
  );
  const targetConceptId = string(
    row.targetConceptId,
    "conceptReview.targetConceptId",
    true,
  );
  if (action === "merge" && !targetConceptId)
    invalid("conceptReview.targetConceptId");
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "conceptReview.expectedManifestHash",
    ),
    reviewId: string(row.reviewId, "conceptReview.reviewId")!,
    action,
    ...(targetConceptId ? { targetConceptId } : {}),
  };
}

export function rebuildSynthesisConceptKbApplicationDisplayUpdateRequest(
  value: unknown,
) {
  const row = object(value, "conceptDisplayUpdate");
  exact(
    row,
    [
      "expectedManifestHash",
      "conceptId",
      "label",
      "shortDefinition",
      "definition",
      "usageNote",
      "editorialNote",
    ],
    "conceptDisplayUpdate",
  );
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "conceptDisplayUpdate.expectedManifestHash",
    ),
    conceptId: string(row.conceptId, "conceptDisplayUpdate.conceptId")!,
    label: string(row.label, "conceptDisplayUpdate.label")!,
    shortDefinition: string(
      row.shortDefinition,
      "conceptDisplayUpdate.shortDefinition",
      true,
    ),
    definition: string(row.definition, "conceptDisplayUpdate.definition", true),
    usageNote: string(row.usageNote, "conceptDisplayUpdate.usageNote", true),
    editorialNote: string(
      row.editorialNote,
      "conceptDisplayUpdate.editorialNote",
      true,
    ),
  };
}

export function rebuildSynthesisConceptKbApplicationDeleteRequest(
  value: unknown,
) {
  const row = object(value, "conceptDelete");
  exact(row, ["expectedManifestHash", "conceptIds"], "conceptDelete");
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "conceptDelete.expectedManifestHash",
    ),
    conceptIds: strings(
      row.conceptIds,
      "conceptDelete.conceptIds",
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.concepts,
    ),
  };
}

export function rebuildSynthesisConceptKbApplicationRebuildIndexRequest(
  value: unknown,
) {
  const row = object(value, "conceptRebuildIndex");
  exact(row, ["expectedManifestHash"], "conceptRebuildIndex");
  const expectedManifestHash = hashOrNull(
    row.expectedManifestHash,
    "conceptRebuildIndex.expectedManifestHash",
  );
  if (!expectedManifestHash)
    invalid("conceptRebuildIndex.expectedManifestHash");
  return { expectedManifestHash };
}

export function rebuildSynthesisConceptKbApplicationQueryRequest(
  value: unknown,
) {
  const row = object(value, "conceptQuery");
  exact(row, ["labels"], "conceptQuery");
  return {
    labels: strings(
      row.labels,
      "conceptQuery.labels",
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.queryLabels,
    ),
  };
}

export function rebuildSynthesisConceptKbApplicationState(
  value: unknown,
): SynthesisConceptKbApplicationState {
  const row = object(value, "conceptState");
  exact(
    row,
    [
      "manifestHash",
      "revision",
      "indexHash",
      "indexBasisHash",
      "indexStale",
      "conceptCount",
      "senseCount",
      "aliasCount",
      "relationCount",
      "reviewItemCount",
      "topicLinkCount",
    ],
    "conceptState",
  );
  if (typeof row.indexStale !== "boolean") invalid("conceptState.indexStale");
  return {
    manifestHash: hashOrNull(row.manifestHash, "conceptState.manifestHash"),
    revision: count(row.revision, "conceptState.revision"),
    indexHash: hashOrNull(row.indexHash, "conceptState.indexHash"),
    indexBasisHash: hashOrNull(
      row.indexBasisHash,
      "conceptState.indexBasisHash",
    ),
    indexStale: row.indexStale,
    conceptCount: count(row.conceptCount, "conceptState.conceptCount"),
    senseCount: count(row.senseCount, "conceptState.senseCount"),
    aliasCount: count(row.aliasCount, "conceptState.aliasCount"),
    relationCount: count(row.relationCount, "conceptState.relationCount"),
    reviewItemCount: count(row.reviewItemCount, "conceptState.reviewItemCount"),
    topicLinkCount: count(row.topicLinkCount, "conceptState.topicLinkCount"),
  };
}

export function rebuildSynthesisConceptKbApplicationMutationResult(
  value: unknown,
): SynthesisConceptKbApplicationMutationResult {
  const row = object(value, "conceptMutationResult");
  exact(
    row,
    [
      "status",
      "manifestHash",
      "revision",
      "changedConceptIds",
      "reviewIds",
      "diagnostics",
    ],
    "conceptMutationResult",
  );
  if (!Array.isArray(row.diagnostics))
    invalid("conceptMutationResult.diagnostics");
  return {
    status: enumValue(
      row.status,
      [
        "committed",
        "unchanged",
        "not_found",
        "basis_mismatch",
        "concept_kb_busy",
        "invalid_request",
        "worker_failed",
        "stopping",
      ] as const,
      "conceptMutationResult.status",
    ),
    manifestHash: hashOrNull(
      row.manifestHash,
      "conceptMutationResult.manifestHash",
    ),
    revision: count(row.revision, "conceptMutationResult.revision"),
    changedConceptIds: strings(
      row.changedConceptIds,
      "conceptMutationResult.changedConceptIds",
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.concepts,
    ),
    reviewIds: strings(
      row.reviewIds,
      "conceptMutationResult.reviewIds",
      SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.reviewItems,
    ),
    diagnostics: row.diagnostics.map((entry, index) => {
      const item = object(entry, `conceptMutationResult.diagnostics[${index}]`);
      exact(
        item,
        ["code", "severity"],
        `conceptMutationResult.diagnostics[${index}]`,
      );
      return {
        code: string(
          item.code,
          `conceptMutationResult.diagnostics[${index}].code`,
        )!,
        severity: enumValue(
          item.severity,
          ["warning", "error"] as const,
          `conceptMutationResult.diagnostics[${index}].severity`,
        ),
      };
    }),
  };
}

export type SynthesisConceptKbApplicationQueryResult =
  SynthesisConceptKbQueryResult;
