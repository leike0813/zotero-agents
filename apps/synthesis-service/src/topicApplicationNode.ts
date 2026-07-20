import {
  createSynthesisTopicApplication,
  type SynthesisTopicApplication,
  type SynthesisTopicCanonicalStore,
} from "../../../packages/synthesis-application/src/index.js";
import type { SynthesisRepositoryFoundationStore } from "../../../packages/synthesis-repository/src/index.js";
import type { SynthesisSidecarComputeWorkerPool } from "./computeWorkerPool.js";

export function createSynthesisSidecarTopicApplication(options: {
  canonicalStore: SynthesisTopicCanonicalStore;
  repository: SynthesisRepositoryFoundationStore;
  computePool: SynthesisSidecarComputeWorkerPool;
  now?: () => string;
  createOperationId?: (topicId: string) => string;
}): SynthesisTopicApplication {
  return createSynthesisTopicApplication({
    canonicalStore: options.canonicalStore,
    repository: options.repository,
    engine: {
      validateManifest: (request) =>
        options.computePool.runTopicManifestValidation(request),
      assembleArtifact: (request) =>
        options.computePool.runTopicArtifactAssembly(request),
      validateArtifact: (request) =>
        options.computePool.runTopicArtifactValidation(request),
      applySectionPatch: (request) =>
        options.computePool.runTopicSectionPatch(request),
    },
    now: options.now,
    createOperationId: options.createOperationId,
  });
}
