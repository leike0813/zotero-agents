import { assert } from "chai";
import { SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { inspectSynthesisTagSurfaceParity } from "../../scripts/check-synthesis-tag-surface-parity";

const OWNED = [
  "client.applyTagVocabularyImport", "client.clearStagedTagSuggestions", "client.clearTagAuditRecord",
  "client.deleteTagVocabularyEntry", "client.discardStagedTagSuggestions", "client.exportTagVocabularyForRegulator",
  "client.initializeBuiltinTagPolicy", "client.isBuiltinTagPolicyInitialized", "client.listStagedTagSuggestions",
  "client.loadTagVocabulary", "client.previewTagVocabularyImport", "client.promoteStagedTagSuggestions",
  "client.rebuildTagVocabularyIndex", "client.replaceTagAuditRecords", "client.saveTagVocabulary",
  "client.stageTagSuggestions", "client.updateStagedTagSuggestion", "client.updateTagVocabularyEntry",
  "client.validateTagVocabulary",
] as const;

describe("Synthesis native Tag surface", () => {
  it("admits exactly the complete fixture-backed Tag roster", () => {
    assert.deepEqual(inspectSynthesisTagSurfaceParity(), { ok: true, operations: 19, errors: [] });
    for (const capability of OWNED) assert.include(SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES, capability);
  });
});
