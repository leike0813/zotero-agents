import {
  createSynthesisTopicGraphApplication,
  type SynthesisTopicGraphApplication,
} from "../../../packages/synthesis-application/src/topicGraphApplication.js";
import type { SynthesisRepositoryFoundationStore } from "../../../packages/synthesis-repository/src/index.js";
import type { SynthesisSidecarComputeWorkerPool } from "./computeWorkerPool.js";

export function createSynthesisSidecarTopicGraphApplication(options: {
  repository: SynthesisRepositoryFoundationStore;
  computePool: SynthesisSidecarComputeWorkerPool;
  now?: () => string;
}): SynthesisTopicGraphApplication {
  return createSynthesisTopicGraphApplication({
    repository: options.repository,
    compute: {
      buildIndex: (request, runOptions) =>
        options.computePool.runTopicGraphIndex(request, runOptions),
    },
    now: options.now,
  });
}
