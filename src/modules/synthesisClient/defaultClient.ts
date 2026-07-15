import type { SynthesisClient } from "../../../packages/synthesis-contracts/src/index";
import { createInProcessSynthesisClient } from "./inProcessClient";

let defaultClient: SynthesisClient | undefined;
let legacyInvalidator: (() => void) | undefined;

export async function getDefaultSynthesisClient(): Promise<SynthesisClient> {
  if (!defaultClient) {
    const legacy = await import("../synthesis/service");
    legacyInvalidator = legacy.invalidateDefaultSynthesisService;
    defaultClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions(request) {
        return legacy
          .getDefaultSynthesisService()
          .listWorkflowTopicOptions(request);
      },
      reconcileSynthesisRuntimeWorkStateOnStartup() {
        return legacy
          .getDefaultSynthesisService()
          .reconcileSynthesisRuntimeWorkStateOnStartup();
      },
      async resetSynthesisDatabase(request) {
        return legacy
          .getDefaultSynthesisService()
          .resetSynthesisDatabase(request);
      },
      async consumeRelatedItemsSyncEcho(request) {
        return legacy
          .getDefaultSynthesisService()
          .consumeRelatedItemsSyncEcho(request);
      },
    });
  }
  return defaultClient;
}

export function resetDefaultSynthesisClientForTests() {
  invalidateDefaultSynthesisClient();
}

export function invalidateDefaultSynthesisClient() {
  defaultClient = undefined;
  legacyInvalidator?.();
  legacyInvalidator = undefined;
}
