import {
  createSynthesisCitationGraphApplication,
  type SynthesisCitationGraphApplication,
} from "../../../packages/synthesis-application/src/citationGraphApplication.js";
import type { SynthesisRepositoryFoundationStore } from "../../../packages/synthesis-repository/src/index.js";
import type { SynthesisSidecarComputeWorkerPool } from "./computeWorkerPool.js";

export function createSynthesisSidecarCitationGraphApplication(options: {
  repository: SynthesisRepositoryFoundationStore;
  computePool: SynthesisSidecarComputeWorkerPool;
  now?: () => string;
  createOperationId?: () => string;
}): SynthesisCitationGraphApplication {
  return createSynthesisCitationGraphApplication({
    repository: options.repository,
    compute: {
      build: (request, runOptions) =>
        options.computePool.runCitationGraphBuild(request, runOptions),
      metrics: (request, runOptions) =>
        options.computePool.runCitationGraphMetrics(request, runOptions),
      layout: (request, runOptions) =>
        options.computePool.runCitationGraphLayout(request, runOptions),
    },
    now: options.now,
    createOperationId: options.createOperationId,
  });
}
