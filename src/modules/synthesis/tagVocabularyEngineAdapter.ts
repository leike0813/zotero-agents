import {
  SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
  SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
  SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
  rebuildSynthesisTagVocabularyIndexRequest,
  rebuildSynthesisTagVocabularyIndexResult,
  rebuildSynthesisTagVocabularyValidationRequest,
  rebuildSynthesisTagVocabularyValidationResult,
  type SynthesisTagVocabularyEngine,
  type SynthesisTagVocabularyEngineEntry,
} from "../../../packages/synthesis-engine/src/tagVocabulary";
import type {
  SynthesisTagIndexProjection,
  SynthesisTagProtocolAsset,
  SynthesisTagValidationWarning,
  SynthesisTagVocabularyEntry,
} from "./tagVocabulary";

type TagVocabularyInput = {
  entries: SynthesisTagVocabularyEntry[];
  aliases: Record<string, string>;
  abbrev: Record<string, string>;
  protocol: SynthesisTagProtocolAsset;
};

function engineEntry(
  entry: SynthesisTagVocabularyEntry,
): SynthesisTagVocabularyEngineEntry {
  const projected: SynthesisTagVocabularyEngineEntry = {
    tag: entry.tag,
    facet: entry.facet,
    aliases: [...(entry.aliases || [])],
    abbrev: [...(entry.abbrev || [])],
  };
  if (entry.note) {
    projected.note = entry.note;
  }
  if (entry.deprecated) {
    projected.deprecated = true;
  }
  if (entry.replacement) {
    projected.replacement = entry.replacement;
  }
  return projected;
}

function commonRequest(input: TagVocabularyInput) {
  return {
    contractVersion: SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
    entries: input.entries.map(engineEntry),
    aliases: { ...input.aliases },
    abbrev: { ...input.abbrev },
    protocol: {
      version: input.protocol.version || "1.0.0",
      tagPattern: input.protocol.tag_pattern,
      maxTagLength: input.protocol.max_tag_length,
      facets: [...input.protocol.facets],
    },
  };
}

export function validateSynthesisTagVocabularyWithEngine(args: {
  engine: SynthesisTagVocabularyEngine;
  input: TagVocabularyInput;
}): SynthesisTagValidationWarning[] {
  const request = rebuildSynthesisTagVocabularyValidationRequest({
    ...commonRequest(args.input),
    algorithmVersion: SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
  });
  const result = rebuildSynthesisTagVocabularyValidationResult(
    args.engine.validate(request),
    request,
  );
  return result.warnings.map((warning) => ({ ...warning }));
}

export function buildSynthesisTagVocabularyIndexWithEngine(args: {
  engine: SynthesisTagVocabularyEngine;
  input: TagVocabularyInput;
  sourceManifestHash: string;
  rebuiltAt: string;
}): SynthesisTagIndexProjection {
  const request = rebuildSynthesisTagVocabularyIndexRequest({
    ...commonRequest(args.input),
    algorithmVersion: SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
    sourceManifestHash: args.sourceManifestHash,
    rebuiltAt: args.rebuiltAt,
  });
  const result = rebuildSynthesisTagVocabularyIndexResult(
    args.engine.buildIndex(request),
    request,
  );
  return {
    schema_id: "synthesis.tag_index_projection",
    schema_version: result.schemaVersion,
    source_manifest_hash: result.sourceManifestHash,
    rebuilt_at: result.rebuiltAt,
    tags: [...result.tags],
    aliases: { ...result.aliases },
    abbrev: { ...result.abbrev },
    search: result.search.map((entry) => ({
      tag: entry.tag,
      normalized: entry.normalized,
      facet: entry.facet,
      aliases: [...entry.aliases],
      abbrev: [...entry.abbrev],
    })),
    validation_warnings: result.validationWarnings.map((warning) => ({
      ...warning,
    })),
  };
}
