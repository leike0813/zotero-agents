import {
  SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
  SYNTHESIS_CONCEPT_KB_INDEX_VERSION,
  SYNTHESIS_CONCEPT_KB_QUERY_VERSION,
  rebuildSynthesisConceptKbIndexRequest,
  rebuildSynthesisConceptKbIndexResult,
  rebuildSynthesisConceptKbQueryRequest,
  rebuildSynthesisConceptKbQueryResult,
  type SynthesisConceptKbIndexEngine,
} from "../../../packages/synthesis-engine/src/conceptKbIndex";
import type {
  SynthesisConcept,
  SynthesisConceptAlias,
  SynthesisConceptOverlayEntry,
  SynthesisConceptSense,
} from "./conceptKb";

type ConceptKbSource = {
  concepts: SynthesisConcept[];
  senses: SynthesisConceptSense[];
  aliases: SynthesisConceptAlias[];
};

function engineSource(source: ConceptKbSource) {
  return {
    concepts: source.concepts.map((concept) => ({
      conceptId: concept.concept_id,
      label: concept.label,
      aliases: [...concept.aliases],
      conceptType: concept.concept_type,
      domain: concept.domain,
      status: concept.status,
      ...(concept.short_definition
        ? { shortDefinition: concept.short_definition }
        : {}),
      ...(concept.definition ? { definition: concept.definition } : {}),
    })),
    senses: source.senses.map((sense) => ({
      senseId: sense.sense_id,
      conceptId: sense.concept_id,
      label: sense.label,
      ...(sense.short_definition
        ? { shortDefinition: sense.short_definition }
        : {}),
      ...(sense.definition ? { definition: sense.definition } : {}),
      confidence: sense.confidence,
    })),
    aliases: source.aliases.map((alias) => ({
      aliasId: alias.alias_id,
      alias: alias.alias,
      normalized: alias.normalized,
      conceptId: alias.concept_id,
      ...(alias.sense_id ? { senseId: alias.sense_id } : {}),
      status: alias.status,
      confidence: alias.confidence,
    })),
  };
}

export async function buildSynthesisConceptKbIndexWithEngine(args: {
  engine: SynthesisConceptKbIndexEngine;
  source: ConceptKbSource;
  sourceManifestHash: string;
  rebuiltAt: string;
}) {
  const request = rebuildSynthesisConceptKbIndexRequest({
    contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_CONCEPT_KB_INDEX_VERSION,
    ...engineSource(args.source),
    sourceManifestHash: args.sourceManifestHash,
    rebuiltAt: args.rebuiltAt,
  });
  const result = rebuildSynthesisConceptKbIndexResult(
    await args.engine.buildIndex(request),
    request,
  );
  return {
    schemaVersion: result.schemaVersion,
    sourceManifestHash: result.sourceManifestHash,
    rebuiltAt: result.rebuiltAt,
    search: result.search.map((row) => ({
      concept_id: row.conceptId,
      label: row.label,
      normalized: row.normalized,
      concept_type: row.conceptType,
      domain: row.domain,
    })),
    overlayEntries: result.overlayEntries.map(
      (entry): SynthesisConceptOverlayEntry => ({
        concept_id: entry.conceptId,
        ...(entry.senseId ? { sense_id: entry.senseId } : {}),
        alias: entry.alias,
        label: entry.label,
        ...(entry.shortDefinition
          ? { short_definition: entry.shortDefinition }
          : {}),
        ...(entry.definition ? { definition: entry.definition } : {}),
        confidence: entry.confidence,
      }),
    ),
  };
}

export async function querySynthesisConceptKbWithEngine(args: {
  engine: SynthesisConceptKbIndexEngine;
  source: ConceptKbSource;
  labels: string[];
}) {
  const request = rebuildSynthesisConceptKbQueryRequest({
    contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_CONCEPT_KB_QUERY_VERSION,
    ...engineSource(args.source),
    labels: args.labels,
  });
  const result = rebuildSynthesisConceptKbQueryResult(
    await args.engine.query(request),
    request,
  );
  const conceptsById = new Map(
    args.source.concepts.map((concept) => [concept.concept_id, concept]),
  );
  const aliasesById = new Map(
    args.source.aliases.map((alias) => [alias.alias_id, alias]),
  );
  const sensesById = new Map(
    args.source.senses.map((sense) => [sense.sense_id, sense]),
  );
  return {
    labels: result.matches.map((match) => match.label),
    matches: result.matches.map((match) => ({
      label: match.label,
      exact_matches: match.exactConceptIds.map(
        (conceptId) => conceptsById.get(conceptId)!,
      ),
      alias_matches: match.aliasMatches.map((entry) => ({
        alias: aliasesById.get(entry.aliasId)!,
        concept: conceptsById.get(entry.conceptId) || null,
      })),
      sense_candidates: match.senseIds.map(
        (senseId) => sensesById.get(senseId)!,
      ),
      ambiguous: match.ambiguous,
    })),
  };
}
