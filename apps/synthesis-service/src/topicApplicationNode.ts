import {
  createSynthesisTopicApplication,
  type SynthesisTopicApplication,
  type SynthesisTopicCanonicalStore,
} from "../../../packages/synthesis-application/src/index.js";
import { createInProcessSynthesisTopicStructuredArtifactEngine } from "../../../packages/synthesis-engine/src/index.js";
import type { SynthesisRepositoryFoundationStore } from "../../../packages/synthesis-repository/src/index.js";

export function createSynthesisSidecarTopicApplication(options: {
  canonicalStore: SynthesisTopicCanonicalStore;
  repository: SynthesisRepositoryFoundationStore;
  now?: () => string;
  createOperationId?: (topicId: string) => string;
}): SynthesisTopicApplication {
  return createSynthesisTopicApplication({
    canonicalStore: options.canonicalStore,
    repository: options.repository,
    engine: createInProcessSynthesisTopicStructuredArtifactEngine(),
    now: options.now,
    createOperationId: options.createOperationId,
  });
}
