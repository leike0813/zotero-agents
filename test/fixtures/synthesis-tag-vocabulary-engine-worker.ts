import { parentPort } from "node:worker_threads";
import {
  createInProcessSynthesisTagVocabularyEngine,
  rebuildSynthesisTagVocabularyIndexRequest,
  rebuildSynthesisTagVocabularyValidationRequest,
} from "../../packages/synthesis-engine/src/tagVocabulary.ts";

parentPort?.on(
  "message",
  (input: { validation: unknown; index: unknown }) => {
    const engine = createInProcessSynthesisTagVocabularyEngine();
    parentPort?.postMessage({
      validation: engine.validate(
        rebuildSynthesisTagVocabularyValidationRequest(input.validation),
      ),
      index: engine.buildIndex(
        rebuildSynthesisTagVocabularyIndexRequest(input.index),
      ),
    });
  },
);
