import { getSynthesisConceptApplicationState, listSynthesisConceptAliases, listSynthesisConceptRelations, listSynthesisConceptReviewItems, listSynthesisConceptSenses, listSynthesisConcepts, listSynthesisTopicConceptLinks, replaceSynthesisConceptKbState, } from "./conceptKb.js";
import { getSynthesisTagApplicationState, getSynthesisTagProtocol, listSynthesisTagAbbrevs, listSynthesisTagAliases, listSynthesisTagValidationWarnings, listSynthesisTagVocabularyEntries, replaceSynthesisTagVocabularyState, } from "./tagVocabulary.js";
import { getSynthesisTopicGraphApplicationState, listSynthesisTopicGraphEdges, listSynthesisTopicGraphNodes, listSynthesisTopicGraphReviewItems, replaceSynthesisTopicGraphState, } from "./topicGraph.js";
function activeBases(db) {
    return {
        tagRevision: getSynthesisTagApplicationState(db)?.vocabularyHash ?? null,
        conceptManifest: getSynthesisConceptApplicationState(db)?.manifestHash ?? null,
        topicGraphManifest: getSynthesisTopicGraphApplicationState(db)?.manifestHash ?? null,
    };
}
function sameBases(left, right) {
    return (left.tagRevision === right.tagRevision &&
        left.conceptManifest === right.conceptManifest &&
        left.topicGraphManifest === right.topicGraphManifest);
}
export function captureSynthesisKnowledgeCheckpointRepositoryState(db) {
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
export function replaceSynthesisKnowledgeCheckpointRepositoryState(db, args) {
    return db.transaction(() => {
        if (!sameBases(activeBases(db), args.expectedBases))
            return false;
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
