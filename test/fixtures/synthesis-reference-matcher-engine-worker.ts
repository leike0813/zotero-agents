import { parentPort } from "node:worker_threads";
import {
  computeSynthesisReferenceBinding,
  computeSynthesisReferenceDedupe,
  rebuildSynthesisReferenceBindingRequest,
  rebuildSynthesisReferenceDedupeRequest,
} from "../../packages/synthesis-engine/src/referenceMatcher.ts";

parentPort?.on(
  "message",
  (input: {
    binding: unknown;
    dedupe: unknown;
  }) => {
    parentPort?.postMessage({
      binding: computeSynthesisReferenceBinding(
        rebuildSynthesisReferenceBindingRequest(input.binding),
      ),
      dedupe: computeSynthesisReferenceDedupe(
        rebuildSynthesisReferenceDedupeRequest(input.dedupe),
      ),
    });
  },
);
