import {
  createSynthesisConceptKbApplication,
  type SynthesisConceptKbApplication,
} from "../../../packages/synthesis-application/src/conceptKbApplication.js";
import type { SynthesisRepositoryFoundationStore } from "../../../packages/synthesis-repository/src/index.js";
import type { SynthesisSidecarComputeWorkerPool } from "./computeWorkerPool.js";

export function createSynthesisSidecarConceptKbApplication(options: {
  repository: SynthesisRepositoryFoundationStore;
  computePool: SynthesisSidecarComputeWorkerPool;
  now?: () => string;
}): SynthesisConceptKbApplication {
  return createSynthesisConceptKbApplication({
    repository: options.repository,
    compute: {
      buildIndex: (request, runOptions) =>
        options.computePool.runConceptKbIndex(request, runOptions),
      query: (request, runOptions) =>
        options.computePool.runConceptKbQuery(request, runOptions),
    },
    now: options.now,
  });
}
