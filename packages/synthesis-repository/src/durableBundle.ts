import type { SynthesisDurableBundleDraft } from "../../synthesis-contracts/src/durableBundle.js";
import {
  listSynthesisConceptAliases,
  listSynthesisConceptRelations,
  listSynthesisConceptReviewItems,
  listSynthesisConceptSenses,
  listSynthesisConcepts,
  listSynthesisTopicConceptLinks,
} from "./conceptKb.js";
import type { SqlAdapter, SqlRow } from "./index.js";
import { rebuildSynthesisReferenceMatchProposalRow } from "./referenceMatchingReview.js";
import {
  listSynthesisCanonicalReferences,
  listSynthesisReferenceBindings,
} from "./referenceRefresh.js";
import {
  getSynthesisTagProtocol,
  listSynthesisTagAbbrevs,
  listSynthesisTagAliases,
  listSynthesisTagVocabularyEntries,
} from "./tagVocabulary.js";
import {
  listSynthesisTopicGraphEdges,
  listSynthesisTopicGraphNodes,
  listSynthesisTopicGraphReviewItems,
} from "./topicGraph.js";

export type SynthesisDurableBundleRepositoryTopicBasis = {
  topicId: string;
  pathId: string;
  manifestHash: string;
  artifactHash: string;
  metadataHash: string;
  bundleHash: string;
};

export type SynthesisDurableBundleRepositoryState = {
  aggregateBasis: unknown;
  topicBases: SynthesisDurableBundleRepositoryTopicBasis[];
  drafts: SynthesisDurableBundleDraft[];
};

const clean = (value: unknown) => String(value ?? "").trim();
const optional = (value: unknown) => clean(value) || undefined;

function redirectFromRow(row: SqlRow) {
  return {
    fromCanonicalReferenceId: clean(row.from_canonical_reference_id),
    toCanonicalReferenceId: clean(row.to_canonical_reference_id),
    reason: optional(row.reason),
    diagnosticsJson: optional(row.diagnostics_json),
    createdAt: optional(row.created_at),
    updatedAt: optional(row.updated_at),
  };
}

function reviewFromRow(row: SqlRow) {
  return {
    reviewId: clean(row.review_id),
    sourceRef: clean(row.source_ref),
    canonicalReferenceId: clean(row.canonical_reference_id),
    status: clean(row.status),
    reason: clean(row.reason),
    payloadJson: clean(row.payload_json) || "{}",
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}

function topicBasisFromRow(
  row: SqlRow,
): SynthesisDurableBundleRepositoryTopicBasis {
  const result = {
    topicId: clean(row.topic_id),
    pathId: clean(row.path_id),
    manifestHash: clean(row.manifest_hash),
    artifactHash: clean(row.artifact_hash),
    metadataHash: clean(row.metadata_hash),
    bundleHash: clean(row.bundle_hash),
  };
  if (Object.values(result).some((value) => !value)) {
    throw new Error("repository_durable_topic_basis_invalid");
  }
  return result;
}

function draft(
  entityKind: SynthesisDurableBundleDraft["entityKind"],
  entityId: string,
  data: unknown,
  updatedAt?: string,
): SynthesisDurableBundleDraft {
  if (!clean(entityId)) throw new Error("repository_durable_entity_id_invalid");
  return {
    entityKind,
    entityId,
    schemaId: `synthesis.durable.${entityKind}`,
    data,
    ...(clean(updatedAt) ? { updatedAt: clean(updatedAt) } : {}),
  };
}

export function captureSynthesisDurableBundleRepositoryState(
  db: SqlAdapter,
): SynthesisDurableBundleRepositoryState {
  return db.transaction(() => {
    const drafts: SynthesisDurableBundleDraft[] = [];
    for (const row of listSynthesisConcepts(db))
      drafts.push(draft("concept", row.conceptId, row, row.updatedAt));
    for (const row of listSynthesisConceptSenses(db))
      drafts.push(draft("concept_sense", row.senseId, row, row.updatedAt));
    for (const row of listSynthesisConceptAliases(db))
      drafts.push(draft("concept_alias", row.aliasId, row, row.updatedAt));
    for (const row of listSynthesisConceptRelations(db))
      drafts.push(
        draft("concept_relation", row.relationId, row, row.updatedAt),
      );
    for (const row of listSynthesisConceptReviewItems(db))
      drafts.push(
        draft("concept_review_item", row.reviewId, row, row.updatedAt),
      );

    const links = new Map<string, unknown[]>();
    for (const row of listSynthesisTopicConceptLinks(db)) {
      links.set(row.topicId, [...(links.get(row.topicId) ?? []), row]);
    }
    for (const [topicId, rows] of [...links].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      drafts.push(
        draft("topic_concept_links", topicId, { topicId, links: rows }),
      );
    }

    for (const row of listSynthesisTopicGraphNodes(db))
      drafts.push(draft("topic_graph_node", row.topicId, row, row.updatedAt));
    for (const row of listSynthesisTopicGraphEdges(db))
      drafts.push(draft("topic_graph_edge", row.edgeId, row, row.updatedAt));
    for (const row of listSynthesisTopicGraphReviewItems(db))
      drafts.push(
        draft("topic_graph_review_item", row.reviewId, row, row.updatedAt),
      );

    for (const row of listSynthesisCanonicalReferences(db))
      drafts.push(
        draft(
          "canonical_reference",
          row.canonicalReferenceId,
          row,
          row.updatedAt,
        ),
      );
    for (const row of db
      .all(
        "SELECT * FROM synt_reference_redirect ORDER BY from_canonical_reference_id ASC",
      )
      .map(redirectFromRow)) {
      drafts.push(
        draft(
          "canonical_reference_redirect",
          row.fromCanonicalReferenceId,
          row,
          row.updatedAt,
        ),
      );
    }
    for (const row of listSynthesisReferenceBindings(db))
      drafts.push(
        draft("reference_binding", row.bindingId, row, row.updatedAt),
      );
    for (const row of db
      .all(
        "SELECT * FROM synt_reference_match_proposal ORDER BY proposal_id ASC",
      )
      .map(rebuildSynthesisReferenceMatchProposalRow)) {
      drafts.push(
        draft("reference_match_proposal", row.proposalId, row, row.updatedAt),
      );
    }
    for (const row of db
      .all(
        "SELECT * FROM synt_reference_revision_review ORDER BY review_id ASC",
      )
      .map(reviewFromRow)) {
      drafts.push(draft("review_item", row.reviewId, row, row.updatedAt));
    }

    const tagEntries = listSynthesisTagVocabularyEntries(db);
    if (tagEntries.length)
      drafts.push(
        draft("tag_vocabulary", "tag-vocabulary", { entries: tagEntries }),
      );
    const tagAliases = listSynthesisTagAliases(db);
    if (tagAliases.length)
      drafts.push(draft("tag_aliases", "tag-aliases", { aliases: tagAliases }));
    const tagAbbrevs = listSynthesisTagAbbrevs(db);
    if (tagAbbrevs.length)
      drafts.push(draft("tag_abbrev", "tag-abbrev", { abbrev: tagAbbrevs }));
    const tagProtocol = getSynthesisTagProtocol(db);
    if (tagProtocol)
      drafts.push(
        draft(
          "tag_protocol",
          "tag-protocol",
          tagProtocol,
          tagProtocol.updatedAt,
        ),
      );

    const topicBases = db
      .all("SELECT * FROM synt_topic_application_state ORDER BY topic_id ASC")
      .map(topicBasisFromRow);
    drafts.sort(
      (left, right) =>
        left.entityKind.localeCompare(right.entityKind) ||
        left.entityId.localeCompare(right.entityId),
    );
    const aggregateBasis = { topicBases, drafts };
    return { aggregateBasis, topicBases, drafts };
  });
}
