import {
  canonicalSynthesisTopicJsonText,
  canonicalSynthesisTopicSectionFileName,
  computeSynthesisTopicCurrentHashes,
} from "../../../packages/synthesis-application/src/topicCanonical";

export function computeTopicCurrentHashes(args: {
  manifest: unknown;
  artifact: unknown;
  metadata: unknown;
  sections: Record<string, unknown>;
}) {
  const hashes = computeSynthesisTopicCurrentHashes(args);
  return {
    manifest_hash: hashes.manifestHash,
    structured_hash: hashes.structuredHash,
    artifact_hash: hashes.artifactHash,
    metadata_hash: hashes.metadataHash,
    section_hashes: hashes.sectionHashes,
  };
}

export function canonicalSectionFileName(section: string) {
  return canonicalSynthesisTopicSectionFileName(section);
}

export function canonicalJsonText(value: unknown) {
  return canonicalSynthesisTopicJsonText(value);
}
