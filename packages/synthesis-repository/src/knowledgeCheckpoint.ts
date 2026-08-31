import {
  getSynthesisConceptApplicationState,
  listSynthesisConceptAliases,
  listSynthesisConceptRelations,
  listSynthesisConceptReviewItems,
  listSynthesisConceptSenses,
  listSynthesisConcepts,
  listSynthesisTopicConceptLinks,
  replaceSynthesisConceptKbState,
  type SynthesisConceptKbStateRecords,
} from "./conceptKb.js";
import type { SqlAdapter } from "./index.js";
import {
  getSynthesisTagApplicationState,
  getSynthesisTagProtocol,
  listSynthesisTagAbbrevs,
  listSynthesisTagAliases,
  listSynthesisTagValidationWarnings,
  listSynthesisTagVocabularyEntries,
  replaceSynthesisTagVocabularyState,
  type SynthesisTagProtocolRecord,
  type SynthesisTagVocabularyStateRecords,
} from "./tagVocabulary.js";
import {
  getSynthesisTopicGraphApplicationState,
  listSynthesisTopicGraphEdges,
  listSynthesisTopicGraphNodes,
  listSynthesisTopicGraphReviewItems,
  replaceSynthesisTopicGraphState,
  type SynthesisTopicGraphStateRecords,
} from "./topicGraph.js";

export type SynthesisKnowledgeCheckpointRepositoryBases = {
  tagRevision: string | null;
  conceptManifest: string | null;
  topicGraphManifest: string | null;
};

export type SynthesisKnowledgeCheckpointRepositoryState = {
  bases: SynthesisKnowledgeCheckpointRepositoryBases;
  tagVocabulary: Omit<SynthesisTagVocabularyStateRecords, "protocol"> & {
    protocol: SynthesisTagProtocolRecord | null;
  };
  conceptKb: SynthesisConceptKbStateRecords;
  topicGraph: SynthesisTopicGraphStateRecords;
};

export type SynthesisKnowledgeCheckpointRepositoryReplacement = {
  expectedBases: SynthesisKnowledgeCheckpointRepositoryBases;
  nextBases: {
    tagRevision: string;
    conceptManifest: string;
    topicGraphManifest: string;
  };
  tagVocabulary: SynthesisTagVocabularyStateRecords;
  conceptKb: SynthesisConceptKbStateRecords;
  topicGraph: SynthesisTopicGraphStateRecords;
  now: string;
};

function activeBases(
  db: SqlAdapter,
): SynthesisKnowledgeCheckpointRepositoryBases {
  return {
    tagRevision: getSynthesisTagApplicationState(db)?.vocabularyHash ?? null,
    conceptManifest:
      getSynthesisConceptApplicationState(db)?.manifestHash ?? null,
    topicGraphManifest:
      getSynthesisTopicGraphApplicationState(db)?.manifestHash ?? null,
  };
}

function sameBases(
  left: SynthesisKnowledgeCheckpointRepositoryBases,
  right: SynthesisKnowledgeCheckpointRepositoryBases,
) {
  return (
    left.tagRevision === right.tagRevision &&
    left.conceptManifest === right.conceptManifest &&
    left.topicGraphManifest === right.topicGraphManifest
  );
}

export function captureSynthesisKnowledgeCheckpointRepositoryState(
  db: SqlAdapter,
): SynthesisKnowledgeCheckpointRepositoryState {
  return db.transaction(() => ({
    bases: activeBases(db),
    tagVocabulary: {
      entries: listSynthesisTagVocabularyEntries(db),
      aliases: listSynthesisTagAliases(db),
      abbrevs: listSynthesisTagAbbrevs(db),
      protocol: getSynthesisTagProtocol(db),
      warnings: listSynthesisTagValidationWarnings(db),
    },
    conceptKb: {
      concepts: listSynthesisConcepts(db),
      senses: listSynthesisConceptSenses(db),
      aliases: listSynthesisConceptAliases(db),
      relations: listSynthesisConceptRelations(db),
      reviewItems: listSynthesisConceptReviewItems(db),
      topicLinks: listSynthesisTopicConceptLinks(db),
    },
    topicGraph: {
      nodes: listSynthesisTopicGraphNodes(db),
      edges: listSynthesisTopicGraphEdges(db),
      reviewItems: listSynthesisTopicGraphReviewItems(db),
    },
  }));
}

export function replaceSynthesisKnowledgeCheckpointRepositoryState(
  db: SqlAdapter,
  args: SynthesisKnowledgeCheckpointRepositoryReplacement,
) {
  return db.transaction(() => {
    if (!sameBases(activeBases(db), args.expectedBases)) return false;

    const tagCommitted = replaceSynthesisTagVocabularyState(db, {
      expectedVocabularyHash: args.expectedBases.tagRevision,
      vocabularyHash: args.nextBases.tagRevision,
      state: args.tagVocabulary,
      now: args.now,
    });
    if (!tagCommitted)
      throw new Error("knowledge_checkpoint_tag_basis_changed");

    const conceptCommitted = replaceSynthesisConceptKbState(db, {
      expectedManifestHash: args.expectedBases.conceptManifest,
      manifestHash: args.nextBases.conceptManifest,
      state: args.conceptKb,
      now: args.now,
    });
    if (conceptCommitted === null) {
      throw new Error("knowledge_checkpoint_concept_basis_changed");
    }

    const topicGraphCommitted = replaceSynthesisTopicGraphState(db, {
      expectedManifestHash: args.expectedBases.topicGraphManifest,
      manifestHash: args.nextBases.topicGraphManifest,
      state: args.topicGraph,
      now: args.now,
    });
    if (topicGraphCommitted === null) {
      throw new Error("knowledge_checkpoint_topic_graph_basis_changed");
    }
    return true;
  });
}
