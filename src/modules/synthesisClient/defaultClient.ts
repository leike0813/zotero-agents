import type { SynthesisClient } from "../../../packages/synthesis-contracts/src/index";
import {
  createDefaultLegacySynthesisClientComposition,
  invalidateDefaultLegacySynthesisService,
} from "./legacyComposition";

let defaultClient: SynthesisClient | undefined;
let legacyInvalidator: (() => void) | undefined;

export async function getDefaultSynthesisClient(): Promise<SynthesisClient> {
  if (!defaultClient) {
    const composition = await createDefaultLegacySynthesisClientComposition();
    defaultClient = composition.client;
    legacyInvalidator = composition.invalidate;
  }
  return defaultClient;
}

export async function getFreshDefaultSynthesisClient(): Promise<SynthesisClient> {
  invalidateDefaultSynthesisClient();
  await invalidateDefaultLegacySynthesisService();
  return getDefaultSynthesisClient();
}

export function resetDefaultSynthesisClientForTests() {
  invalidateDefaultSynthesisClient();
}

export function invalidateDefaultSynthesisClient() {
  defaultClient = undefined;
  legacyInvalidator?.();
  legacyInvalidator = undefined;
}
