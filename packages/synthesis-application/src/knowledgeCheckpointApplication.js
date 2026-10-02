import { SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION, countSynthesisKnowledgeCheckpointPayload, rebuildSynthesisKnowledgeCheckpoint, rebuildSynthesisKnowledgeCheckpointApplyRequest, rebuildSynthesisKnowledgeCheckpointBases, rebuildSynthesisKnowledgeCheckpointPayload, } from "../../synthesis-contracts/src/knowledgeCheckpoint.js";
import { canonicalizeSynthesisEngineJson, hashSynthesisEngineCanonicalJson, } from "../../synthesis-engine/src/canonicalJson.js";
import { hashSynthesisConceptKbSnapshot } from "./conceptKbApplication.js";
import { hashSynthesisTagVocabularyApplicationCandidate } from "./tagVocabularyApplication.js";
import { hashSynthesisTopicGraphSnapshot, validateSynthesisTopicGraphCandidate, } from "./topicGraphApplication.js";
export class SynthesisKnowledgeCheckpointApplicationError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = "SynthesisKnowledgeCheckpointApplicationError";
    }
}
const clone = (value) => JSON.parse(JSON.stringify(value));
function defaultReceiptId() {
    const randomUuid = globalThis.crypto?.randomUUID;
    if (typeof randomUuid === "function")
        return `receipt:${randomUuid.call(globalThis.crypto)}`;
    return `receipt:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}
function canonicalEqual(left, right) {
    return (canonicalizeSynthesisEngineJson(left) ===
        canonicalizeSynthesisEngineJson(right));
}
export function hashSynthesisKnowledgeCheckpointPayload(bases, payload) {
    return hashSynthesisEngineCanonicalJson({
        contractVersion: SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION,
        bases,
        payload,
    });
}
function derivedBases(payload) {
    return {
        tagRevision: hashSynthesisTagVocabularyApplicationCandidate(payload.tagVocabulary),
        conceptManifest: hashSynthesisConceptKbSnapshot(payload.conceptKb),
        topicGraphManifest: hashSynthesisTopicGraphSnapshot(payload.topicGraph),
    };
}
function normalizeCapture(value) {
    const payload = rebuildSynthesisKnowledgeCheckpointPayload(value.payload);
    validateSynthesisTopicGraphCandidate(payload.topicGraph);
    const bases = rebuildSynthesisKnowledgeCheckpointBases(value.bases);
    return { bases, payload };
}
function verifyCheckpoint(value) {
    const checkpoint = rebuildSynthesisKnowledgeCheckpoint(value);
    validateSynthesisTopicGraphCandidate(checkpoint.payload.topicGraph);
    normalizeCapture({ bases: checkpoint.bases, payload: checkpoint.payload });
    if (checkpoint.checkpointHash !==
        hashSynthesisKnowledgeCheckpointPayload(checkpoint.bases, checkpoint.payload)) {
        throw new SynthesisKnowledgeCheckpointApplicationError("checkpoint_hash_mismatch");
    }
    return checkpoint;
}
function indexed(rows, id) {
    return new Map(rows.map((row) => [id(row), row]));
}
function diffRows(currentRows, nextRows, id) {
    const current = indexed(currentRows, id);
    const next = indexed(nextRows, id);
    let added = 0;
    let updated = 0;
    let deleted = 0;
    for (const [key, row] of next) {
        const previous = current.get(key);
        if (!previous)
            added += 1;
        else if (!canonicalEqual(previous, row))
            updated += 1;
    }
    for (const key of current.keys())
        if (!next.has(key))
            deleted += 1;
    return { added, updated, deleted };
}
function recordRows(record) {
    return Object.entries(record).map(([key, value]) => ({ key, value }));
}
export function diffSynthesisKnowledgeCheckpointPayload(current, next) {
    return {
        tagVocabulary: {
            entries: diffRows(current.tagVocabulary.entries, next.tagVocabulary.entries, (row) => row.tag),
            aliases: diffRows(recordRows(current.tagVocabulary.aliases), recordRows(next.tagVocabulary.aliases), (row) => row.key),
            abbrev: diffRows(recordRows(current.tagVocabulary.abbrev), recordRows(next.tagVocabulary.abbrev), (row) => row.key),
            protocol: diffRows([current.tagVocabulary.protocol], [next.tagVocabulary.protocol], () => "default"),
        },
        conceptKb: {
            concepts: diffRows(current.conceptKb.concepts, next.conceptKb.concepts, (row) => row.conceptId),
            senses: diffRows(current.conceptKb.senses, next.conceptKb.senses, (row) => row.senseId),
            aliases: diffRows(current.conceptKb.aliases, next.conceptKb.aliases, (row) => row.aliasId),
            relations: diffRows(current.conceptKb.relations, next.conceptKb.relations, (row) => row.relationId),
            reviewItems: diffRows(current.conceptKb.reviewItems, next.conceptKb.reviewItems, (row) => row.reviewId),
            topicLinks: diffRows(current.conceptKb.topicLinks, next.conceptKb.topicLinks, (row) => `${row.topicId}\n${row.conceptId}\n${row.senseId}`),
        },
        topicGraph: {
            nodes: diffRows(current.topicGraph.nodes, next.topicGraph.nodes, (row) => row.topicId),
            edges: diffRows(current.topicGraph.edges, next.topicGraph.edges, (row) => row.edgeId),
            reviewItems: diffRows(current.topicGraph.reviewItems, next.topicGraph.reviewItems, (row) => row.reviewId),
        },
    };
}
function decisionOverrides(current, next) {
    const result = [];
    const pushChanged = (args) => {
        const nextRows = indexed(args.nextRows, args.id);
        for (const row of args.currentRows) {
            if (!args.decisions.has(row.status))
                continue;
            const nextRow = nextRows.get(args.id(row));
            if (nextRow && canonicalEqual(row, nextRow))
                continue;
            result.push({
                domain: args.domain,
                family: args.family,
                id: args.id(row),
                currentDecision: row.status,
                nextDecision: nextRow?.status ?? null,
            });
        }
    };
    const nextTags = indexed(next.tagVocabulary.entries, (row) => row.tag);
    for (const row of current.tagVocabulary.entries) {
        const nextRow = nextTags.get(row.tag);
        if (nextRow && canonicalEqual(row, nextRow))
            continue;
        result.push({
            domain: "tagVocabulary",
            family: "entries",
            id: row.tag,
            currentDecision: "active_entry",
            nextDecision: nextRow ? "active_entry" : null,
        });
    }
    pushChanged({
        domain: "conceptKb",
        family: "relations",
        currentRows: current.conceptKb.relations,
        nextRows: next.conceptKb.relations,
        id: (row) => row.relationId,
        decisions: new Set(["confirmed", "rejected"]),
    });
    pushChanged({
        domain: "conceptKb",
        family: "reviewItems",
        currentRows: current.conceptKb.reviewItems,
        nextRows: next.conceptKb.reviewItems,
        id: (row) => row.reviewId,
        decisions: new Set(["approved", "merged", "rejected"]),
    });
    const nextLinks = indexed(next.conceptKb.topicLinks, (row) => `${row.topicId}\n${row.conceptId}\n${row.senseId}`);
    for (const row of current.conceptKb.topicLinks) {
        if (row.source !== "manual")
            continue;
        const id = `${row.topicId}\n${row.conceptId}\n${row.senseId}`;
        const nextRow = nextLinks.get(id);
        if (nextRow && canonicalEqual(row, nextRow))
            continue;
        result.push({
            domain: "conceptKb",
            family: "topicLinks",
            id,
            currentDecision: "manual",
            nextDecision: nextRow?.source ?? null,
        });
    }
    pushChanged({
        domain: "topicGraph",
        family: "edges",
        currentRows: current.topicGraph.edges,
        nextRows: next.topicGraph.edges,
        id: (row) => row.edgeId,
        decisions: new Set(["confirmed", "rejected"]),
    });
    pushChanged({
        domain: "topicGraph",
        family: "reviewItems",
        currentRows: current.topicGraph.reviewItems,
        nextRows: next.topicGraph.reviewItems,
        id: (row) => row.reviewId,
        decisions: new Set(["approved", "rejected", "deleted"]),
    });
    return result.sort((left, right) => left.domain.localeCompare(right.domain) ||
        left.family.localeCompare(right.family) ||
        left.id.localeCompare(right.id));
}
export function createSynthesisKnowledgeCheckpointApplication(options) {
    const now = options.now ?? (() => new Date().toISOString());
    const createReceiptId = options.createReceiptId ?? defaultReceiptId;
    let stopping = false;
    let active = null;
    let receipt = null;
    const run = async (operation) => {
        if (stopping) {
            throw new SynthesisKnowledgeCheckpointApplicationError("stopping");
        }
        if (active) {
            throw new SynthesisKnowledgeCheckpointApplicationError("checkpoint_busy");
        }
        const task = Promise.resolve().then(operation);
        active = task;
        try {
            return await task;
        }
        finally {
            if (active === task)
                active = null;
        }
    };
    const buildCheckpoint = () => run(async () => {
        const capture = normalizeCapture(await options.repository.captureKnowledgeState());
        const checkpoint = {
            contractVersion: SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION,
            bases: capture.bases,
            payload: capture.payload,
            counts: countSynthesisKnowledgeCheckpointPayload(capture.payload),
            checkpointHash: hashSynthesisKnowledgeCheckpointPayload(capture.bases, capture.payload),
            generatedAt: now(),
        };
        return verifyCheckpoint(checkpoint);
    });
    const previewImport = (value) => run(async () => {
        receipt = null;
        const checkpoint = verifyCheckpoint(value);
        const current = normalizeCapture(await options.repository.captureKnowledgeState());
        const receiptId = createReceiptId();
        rebuildSynthesisKnowledgeCheckpointApplyRequest({
            receiptId,
            checkpointHash: checkpoint.checkpointHash,
            acknowledgeFullReplacement: true,
        });
        receipt = {
            receiptId,
            checkpoint: clone(checkpoint),
            capturedBases: clone(current.bases),
        };
        return {
            receiptId,
            checkpointHash: checkpoint.checkpointHash,
            capturedBases: current.bases,
            diff: diffSynthesisKnowledgeCheckpointPayload(current.payload, checkpoint.payload),
            userDecisionOverrides: decisionOverrides(current.payload, checkpoint.payload),
        };
    });
    const applyImport = (value) => run(async () => {
        const currentReceipt = receipt;
        receipt = null;
        const request = rebuildSynthesisKnowledgeCheckpointApplyRequest(value);
        if (!request.acknowledgeFullReplacement) {
            throw new SynthesisKnowledgeCheckpointApplicationError("full_replacement_acknowledgement_required");
        }
        if (!currentReceipt ||
            currentReceipt.receiptId !== request.receiptId ||
            currentReceipt.checkpoint.checkpointHash !== request.checkpointHash) {
            throw new SynthesisKnowledgeCheckpointApplicationError("receipt_invalid");
        }
        const derived = derivedBases(currentReceipt.checkpoint.payload);
        const nextBases = {
            tagRevision: currentReceipt.checkpoint.bases.tagRevision ?? derived.tagRevision,
            conceptManifest: currentReceipt.checkpoint.bases.conceptManifest ??
                derived.conceptManifest,
            topicGraphManifest: currentReceipt.checkpoint.bases.topicGraphManifest ??
                derived.topicGraphManifest,
        };
        const committed = await options.repository.replaceKnowledgeState({
            expectedBases: currentReceipt.capturedBases,
            nextBases,
            payload: currentReceipt.checkpoint.payload,
        });
        if (!committed) {
            throw new SynthesisKnowledgeCheckpointApplicationError("basis_superseded");
        }
        return { status: "committed", bases: nextBases };
    });
    const discardImport = (receiptId) => {
        if (!receipt ||
            (receiptId !== undefined && receipt.receiptId !== receiptId)) {
            return false;
        }
        receipt = null;
        return true;
    };
    const stopAdmission = () => {
        stopping = true;
        receipt = null;
    };
    const shutdown = async () => {
        stopAdmission();
        if (active)
            await active.catch(() => undefined);
    };
    return {
        buildCheckpoint,
        verifyCheckpoint: (value) => run(() => clone(verifyCheckpoint(value))),
        previewImport,
        applyImport,
        discardImport,
        stopAdmission,
        shutdown,
    };
}
