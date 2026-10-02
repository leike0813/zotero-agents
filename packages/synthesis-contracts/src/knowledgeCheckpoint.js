import { SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS, rebuildSynthesisConceptKbApplicationSnapshot, } from "./conceptKbApplication.js";
import { SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS, rebuildSynthesisTagVocabularyApplicationCandidate, } from "./tagVocabularyApplication.js";
import { SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS, rebuildSynthesisTopicGraphApplicationSnapshot, } from "./topicGraphApplication.js";
export const SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION = "synthesis-knowledge-checkpoint.v1";
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
});
export class SynthesisKnowledgeCheckpointContractError extends Error {
    location;
    code = "invalid_request";
    constructor(location) {
        super(`Invalid Synthesis knowledge checkpoint value at ${location}`);
        this.location = location;
        this.name = "SynthesisKnowledgeCheckpointContractError";
    }
}
const HASH = /^sha256:[a-f0-9]{64}$/;
function invalid(location) {
    throw new SynthesisKnowledgeCheckpointContractError(location);
}
function object(value, location) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return invalid(location);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
        invalid(location);
    return value;
}
function exact(value, fields, location) {
    const allowed = new Set(fields);
    if (Object.keys(value).some((field) => !allowed.has(field))) {
        invalid(`${location}.fields`);
    }
}
function hashOrNull(value, location) {
    if (value === null)
        return null;
    if (typeof value !== "string" || !HASH.test(value))
        return invalid(location);
    return value;
}
function hash(value, location) {
    const result = hashOrNull(value, location);
    if (result === null)
        return invalid(location);
    return result;
}
function nonNegativeInteger(value, location) {
    if (!Number.isSafeInteger(value) || Number(value) < 0) {
        return invalid(location);
    }
    return Number(value);
}
function receiptId(value, location) {
    if (typeof value !== "string" ||
        !value.trim() ||
        value.length > SYNTHESIS_KNOWLEDGE_CHECKPOINT_LIMITS.receiptId) {
        return invalid(location);
    }
    return value.trim();
}
export function rebuildSynthesisKnowledgeCheckpointBases(value) {
    const row = object(value, "knowledgeCheckpoint.bases");
    exact(row, ["tagRevision", "conceptManifest", "topicGraphManifest"], "knowledgeCheckpoint.bases");
    return {
        tagRevision: hashOrNull(row.tagRevision, "knowledgeCheckpoint.bases.tagRevision"),
        conceptManifest: hashOrNull(row.conceptManifest, "knowledgeCheckpoint.bases.conceptManifest"),
        topicGraphManifest: hashOrNull(row.topicGraphManifest, "knowledgeCheckpoint.bases.topicGraphManifest"),
    };
}
export function rebuildSynthesisKnowledgeCheckpointPayload(value) {
    const row = object(value, "knowledgeCheckpoint.payload");
    exact(row, ["tagVocabulary", "conceptKb", "topicGraph"], "knowledgeCheckpoint.payload");
    const rebuiltTagVocabulary = rebuildSynthesisTagVocabularyApplicationCandidate(row.tagVocabulary);
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
            invalid(`knowledgeCheckpoint.payload.tagVocabulary.entries.${entry.tag}.replacement`);
        }
    }
    return {
        tagVocabulary,
        conceptKb: rebuildSynthesisConceptKbApplicationSnapshot(row.conceptKb),
        topicGraph: rebuildSynthesisTopicGraphApplicationSnapshot(row.topicGraph),
    };
}
export function countSynthesisKnowledgeCheckpointPayload(payload) {
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
function rebuildCountFamily(value, expected, location) {
    const row = object(value, location);
    const fields = Object.keys(expected);
    exact(row, fields, location);
    const result = Object.fromEntries(fields.map((field) => [
        field,
        nonNegativeInteger(row[field], `${location}.${field}`),
    ]));
    for (const field of fields) {
        if (result[field] !== expected[field]) {
            invalid(`${location}.${field}`);
        }
    }
    return result;
}
export function rebuildSynthesisKnowledgeCheckpointCounts(value, payload) {
    const row = object(value, "knowledgeCheckpoint.counts");
    exact(row, ["tagVocabulary", "conceptKb", "topicGraph"], "knowledgeCheckpoint.counts");
    const expected = countSynthesisKnowledgeCheckpointPayload(payload);
    return {
        tagVocabulary: rebuildCountFamily(row.tagVocabulary, expected.tagVocabulary, "knowledgeCheckpoint.counts.tagVocabulary"),
        conceptKb: rebuildCountFamily(row.conceptKb, expected.conceptKb, "knowledgeCheckpoint.counts.conceptKb"),
        topicGraph: rebuildCountFamily(row.topicGraph, expected.topicGraph, "knowledgeCheckpoint.counts.topicGraph"),
    };
}
export function rebuildSynthesisKnowledgeCheckpoint(value) {
    const row = object(value, "knowledgeCheckpoint");
    exact(row, [
        "contractVersion",
        "bases",
        "payload",
        "counts",
        "checkpointHash",
        "generatedAt",
    ], "knowledgeCheckpoint");
    if (row.contractVersion !== SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION) {
        invalid("knowledgeCheckpoint.contractVersion");
    }
    const generatedAt = row.generatedAt;
    if (typeof generatedAt !== "string" ||
        !generatedAt ||
        Number.isNaN(Date.parse(generatedAt))) {
        invalid("knowledgeCheckpoint.generatedAt");
    }
    const payload = rebuildSynthesisKnowledgeCheckpointPayload(row.payload);
    return {
        contractVersion: SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION,
        bases: rebuildSynthesisKnowledgeCheckpointBases(row.bases),
        payload,
        counts: rebuildSynthesisKnowledgeCheckpointCounts(row.counts, payload),
        checkpointHash: hash(row.checkpointHash, "knowledgeCheckpoint.checkpointHash"),
        generatedAt,
    };
}
export function rebuildSynthesisKnowledgeCheckpointApplyRequest(value) {
    const row = object(value, "knowledgeCheckpointApply");
    exact(row, ["receiptId", "checkpointHash", "acknowledgeFullReplacement"], "knowledgeCheckpointApply");
    if (typeof row.acknowledgeFullReplacement !== "boolean") {
        invalid("knowledgeCheckpointApply.acknowledgeFullReplacement");
    }
    return {
        receiptId: receiptId(row.receiptId, "knowledgeCheckpointApply.receiptId"),
        checkpointHash: hash(row.checkpointHash, "knowledgeCheckpointApply.checkpointHash"),
        acknowledgeFullReplacement: row.acknowledgeFullReplacement,
    };
}
