import {
  createSynthesisReferenceRefreshApplication,
  type SynthesisReferenceRefreshApplication,
} from "../../../packages/synthesis-application/src/referenceRefreshApplication.js";
import type { SynthesisRepositoryFoundationStore } from "../../../packages/synthesis-repository/src/index.js";

export function createSynthesisSidecarReferenceRefreshApplication(options: {
  repository: SynthesisRepositoryFoundationStore;
  now?: () => string;
  createPreparationId?: () => string;
}): SynthesisReferenceRefreshApplication {
  return createSynthesisReferenceRefreshApplication(options);
}
