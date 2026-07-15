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
      async applyLiteratureDigestSidecar(request) {
        return legacy
          .getDefaultSynthesisService()
          .applyLiteratureDigestSidecar(request);
      },
      async applyTopicSynthesisResult(bundle, context) {
        return legacy
          .getDefaultSynthesisService()
          .applyTopicSynthesisResult(bundle, context);
      },
      async getTopicReport(request) {
        return legacy.getDefaultSynthesisService().getTopicReport(request);
      },
      async readPaperArtifacts(request) {
        return legacy.getDefaultSynthesisService().readPaperArtifacts(request);
      },
      async loadTagVocabulary() {
        return legacy.getDefaultSynthesisService().loadTagVocabulary();
      },
      async saveTagVocabulary(request) {
        const service = legacy.getDefaultSynthesisService();
        return service.saveTagVocabulary(
          request as Parameters<typeof service.saveTagVocabulary>[0],
        );
      },
      async exportTagVocabularyForRegulator() {
        return legacy
          .getDefaultSynthesisService()
          .exportTagVocabularyForRegulator();
      },
      async listStagedTagSuggestions() {
        return legacy.getDefaultSynthesisService().listStagedTagSuggestions();
      },
      async stageTagSuggestions(request) {
        const service = legacy.getDefaultSynthesisService();
        return service.stageTagSuggestions(
          request as Parameters<typeof service.stageTagSuggestions>[0],
        );
      },
      async discardStagedTagSuggestions(request) {
        const service = legacy.getDefaultSynthesisService();
        return service.discardStagedTagSuggestions(
          request as Parameters<typeof service.discardStagedTagSuggestions>[0],
        );
      },
      async replaceTagAuditRecords(request) {
        return legacy
          .getDefaultSynthesisService()
          .replaceTagAuditRecords(request);
      },
      async clearTagAuditRecord(request) {
        return legacy.getDefaultSynthesisService().clearTagAuditRecord(request);
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
