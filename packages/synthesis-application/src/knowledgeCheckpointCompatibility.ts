import { hashSynthesisEngineCanonicalJson } from "../../synthesis-engine/src/canonicalJson.js";

export function normalizeSynthesisKnowledgeCounts(
  values: Record<string, number>,
) {
  return Object.fromEntries(
    Object.entries(values)
      .map(
        ([key, value]) =>
          [key, Number.isSafeInteger(value) && value >= 0 ? value : 0] as [
            string,
            number,
          ],
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  ) as Record<string, number>;
}

export function buildSynthesisKnowledgeSignature(
  counts: Record<string, number>,
  records: unknown,
) {
  return {
    counts: normalizeSynthesisKnowledgeCounts(counts),
    hash: hashSynthesisEngineCanonicalJson(records),
  };
}
