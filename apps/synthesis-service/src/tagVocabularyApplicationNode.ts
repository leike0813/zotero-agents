import {
  createSynthesisTagVocabularyApplication,
  type SynthesisTagVocabularyApplication,
} from "../../../packages/synthesis-application/src/tagVocabularyApplication.js";
import type {
  SynthesisHostStagedTagBindingMigrationPort,
  SynthesisHostTagEffectPort,
} from "../../../packages/synthesis-contracts/src/tagEffect.js";
import type { SynthesisRepositoryFoundationStore } from "../../../packages/synthesis-repository/src/index.js";
import type { SynthesisSidecarComputeWorkerPool } from "./computeWorkerPool.js";

export function createSynthesisSidecarTagVocabularyApplication(options: {
  repository: SynthesisRepositoryFoundationStore;
  computePool: SynthesisSidecarComputeWorkerPool;
  tagEffectPort?: SynthesisHostTagEffectPort | null;
  bindingMigrationPort?: SynthesisHostStagedTagBindingMigrationPort | null;
  legacyLibraryId?: number;
  now?: () => string;
}): SynthesisTagVocabularyApplication {
  return createSynthesisTagVocabularyApplication({
    repository: options.repository,
    compute: {
      validate: (request, runOptions) =>
        options.computePool.runTagVocabularyValidation(request, runOptions),
      buildIndex: (request, runOptions) =>
        options.computePool.runTagVocabularyIndex(request, runOptions),
    },
    tagEffectPort: options.tagEffectPort,
    bindingMigrationPort: options.bindingMigrationPort,
    legacyLibraryId: options.legacyLibraryId,
    now: options.now,
  });
}
