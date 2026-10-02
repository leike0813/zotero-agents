import { hashSynthesisEngineCanonicalJson } from "../../synthesis-engine/src/canonicalJson.js";
export function normalizeSynthesisKnowledgeCounts(values) {
    return Object.fromEntries(Object.entries(values)
        .map(([key, value]) => [key, Number.isSafeInteger(value) && value >= 0 ? value : 0])
        .sort(([left], [right]) => left.localeCompare(right)));
}
export function buildSynthesisKnowledgeSignature(counts, records) {
    return {
        counts: normalizeSynthesisKnowledgeCounts(counts),
        hash: hashSynthesisEngineCanonicalJson(records),
    };
}
