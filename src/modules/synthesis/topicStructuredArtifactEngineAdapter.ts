import {
  SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
  SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
  SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
  SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
  SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
  rebuildSynthesisTopicArtifactAssemblyRequest,
  rebuildSynthesisTopicArtifactAssemblyResult,
  rebuildSynthesisTopicArtifactValidationRequest,
  rebuildSynthesisTopicArtifactValidationResult,
  rebuildSynthesisTopicManifestValidationRequest,
  rebuildSynthesisTopicManifestValidationResult,
  rebuildSynthesisTopicSectionPatchRequest,
  rebuildSynthesisTopicSectionPatchResult,
  type SynthesisTopicJsonObject,
  type SynthesisTopicJsonValue,
  type SynthesisTopicStructuredArtifactEngine,
} from "../../../packages/synthesis-engine/src/topicStructuredArtifact";

function jsonValue(value: unknown) {
  return value as SynthesisTopicJsonValue;
}

function jsonObject(value: Record<string, unknown>) {
  return value as SynthesisTopicJsonObject;
}

export async function validateTopicAnalysisManifestWithEngine(args: {
  engine: SynthesisTopicStructuredArtifactEngine;
  manifest: unknown;
}) {
  const request = rebuildSynthesisTopicManifestValidationRequest({
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
    manifest: jsonValue(args.manifest),
  });
  const result = rebuildSynthesisTopicManifestValidationResult(
    await args.engine.validateManifest(request),
    request,
  );
  return {
    ...result,
    ...(args.manifest && typeof args.manifest === "object"
      ? { manifest: args.manifest as Record<string, unknown> }
      : {}),
  };
}

export async function assembleTopicArtifactWithEngine(args: {
  engine: SynthesisTopicStructuredArtifactEngine;
  manifest: Record<string, unknown>;
  sections: Record<string, unknown>;
}) {
  const request = rebuildSynthesisTopicArtifactAssemblyRequest({
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
    manifest: jsonObject(args.manifest),
    sections: args.sections as Record<string, SynthesisTopicJsonValue>,
  });
  return rebuildSynthesisTopicArtifactAssemblyResult(
    await args.engine.assembleArtifact(request),
    request,
  ).artifact as Record<string, unknown>;
}

export async function validateTopicSynthesisArtifactWithEngine(args: {
  engine: SynthesisTopicStructuredArtifactEngine;
  artifact: unknown;
  expectedLanguage?: string;
}) {
  const request = rebuildSynthesisTopicArtifactValidationRequest({
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
    artifact: jsonValue(args.artifact),
    ...(args.expectedLanguage
      ? { expectedLanguage: args.expectedLanguage }
      : {}),
  });
  const result = rebuildSynthesisTopicArtifactValidationResult(
    await args.engine.validateArtifact(request),
    request,
  );
  return {
    ...result,
    ...(args.artifact && typeof args.artifact === "object"
      ? { artifact: args.artifact as Record<string, unknown> }
      : {}),
  };
}

export async function applyTopicSectionPatchWithEngine(args: {
  engine: SynthesisTopicStructuredArtifactEngine;
  currentManifest: Record<string, unknown>;
  currentSections?: Record<string, unknown>;
  patchManifest: Record<string, unknown>;
  changedSections: Record<string, unknown>;
}) {
  const request = rebuildSynthesisTopicSectionPatchRequest({
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
    currentManifest: jsonObject(args.currentManifest),
    currentSections: (args.currentSections || {}) as Record<
      string,
      SynthesisTopicJsonValue
    >,
    patchManifest: jsonObject(args.patchManifest),
    changedSections: args.changedSections as Record<
      string,
      SynthesisTopicJsonValue
    >,
  });
  const result = rebuildSynthesisTopicSectionPatchResult(
    await args.engine.applySectionPatch(request),
    request,
  );
  if (result.status !== "applied") {
    return result;
  }
  return {
    status: "applied" as const,
    sections: result.sections as Record<string, unknown>,
    nextManifest: {
      ...args.currentManifest,
      section_hashes: result.nextSectionHashes,
    },
  };
}
