import {
  createSynthesisKnowledgeCheckpointApplication,
  type SynthesisKnowledgeCheckpointApplicationRepository,
} from "../../../packages/synthesis-application/src/knowledgeCheckpointApplication.js";
import {
  readSynthesisConceptKbApplicationSnapshot,
  synthesisConceptKbStateRecordsFromSnapshot,
} from "../../../packages/synthesis-application/src/conceptKbApplication.js";
import {
  readSynthesisTagVocabularyApplicationCandidate,
  synthesisTagVocabularyStateRecordsFromCandidate,
} from "../../../packages/synthesis-application/src/tagVocabularyApplication.js";
import {
  readSynthesisTopicGraphApplicationSnapshot,
  synthesisTopicGraphStateRecordsFromSnapshot,
} from "../../../packages/synthesis-application/src/topicGraphApplication.js";
import type { SynthesisRepositoryFoundationStore } from "../../../packages/synthesis-repository/src/index.js";

export function createSynthesisSidecarKnowledgeCheckpointApplication(options: {
  repository: SynthesisRepositoryFoundationStore;
  now?: () => string;
  createReceiptId?: () => string;
}) {
  const now = options.now ?? (() => new Date().toISOString());
  const repository: SynthesisKnowledgeCheckpointApplicationRepository = {
    captureKnowledgeState() {
      const captured = options.repository.captureKnowledgeCheckpointState();
      return {
        bases: captured.bases,
        payload: {
          tagVocabulary: readSynthesisTagVocabularyApplicationCandidate({
            listTagVocabularyEntries: () => captured.tagVocabulary.entries,
            listTagAliases: () => captured.tagVocabulary.aliases,
            listTagAbbrevs: () => captured.tagVocabulary.abbrevs,
            getTagProtocol: () => captured.tagVocabulary.protocol,
          }),
          conceptKb: readSynthesisConceptKbApplicationSnapshot({
            listConcepts: () => captured.conceptKb.concepts,
            listConceptSenses: () => captured.conceptKb.senses,
            listConceptAliases: () => captured.conceptKb.aliases,
            listConceptRelations: () => captured.conceptKb.relations,
            listConceptReviewItems: () => captured.conceptKb.reviewItems,
            listTopicConceptLinks: () => captured.conceptKb.topicLinks,
          }),
          topicGraph: readSynthesisTopicGraphApplicationSnapshot({
            listTopicGraphNodes: () => captured.topicGraph.nodes,
            listTopicGraphEdges: () => captured.topicGraph.edges,
            listTopicGraphReviewItems: () => captured.topicGraph.reviewItems,
          }),
        },
      };
    },
    replaceKnowledgeState(args) {
      const timestamp = now();
      return options.repository.replaceKnowledgeCheckpointState({
        expectedBases: args.expectedBases,
        nextBases: args.nextBases,
        tagVocabulary: synthesisTagVocabularyStateRecordsFromCandidate(
          args.payload.tagVocabulary,
          timestamp,
        ),
        conceptKb: synthesisConceptKbStateRecordsFromSnapshot(
          args.payload.conceptKb,
        ),
        topicGraph: synthesisTopicGraphStateRecordsFromSnapshot(
          args.payload.topicGraph,
        ),
        now: timestamp,
      });
    },
  };
  return createSynthesisKnowledgeCheckpointApplication({
    repository,
    now,
    createReceiptId: options.createReceiptId,
  });
}
