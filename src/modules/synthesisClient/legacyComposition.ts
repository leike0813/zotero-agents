import type { SynthesisClient } from "../../../packages/synthesis-contracts/src/index";
import {
  createInProcessSynthesisClient,
  type LegacySynthesisPort,
} from "./inProcessClient";

type LegacyServiceInstance = ReturnType<
  (typeof import("../synthesis/service"))["createSynthesisService"]
>;

function createLegacyPort(
  resolveService: () => LegacyServiceInstance,
): LegacySynthesisPort {
  return {
    async listWorkflowTopicOptions(request) {
      return resolveService().listWorkflowTopicOptions(request);
    },
    reconcileSynthesisRuntimeWorkStateOnStartup() {
      return resolveService().reconcileSynthesisRuntimeWorkStateOnStartup();
    },
    async resetSynthesisDatabase(request) {
      return resolveService().resetSynthesisDatabase(request);
    },
    async consumeRelatedItemsSyncEcho(request) {
      return resolveService().consumeRelatedItemsSyncEcho(request);
    },
    async applyLiteratureDigestSidecar(request) {
      return resolveService().applyLiteratureDigestSidecar(request);
    },
    async applyTopicSynthesisResult(bundle, context) {
      return resolveService().applyTopicSynthesisResult(bundle, context);
    },
    async getTopicReport(request) {
      return resolveService().getTopicReport(request);
    },
    async readPaperArtifacts(request) {
      return resolveService().readPaperArtifacts(request);
    },
    async loadTagVocabulary() {
      return resolveService().loadTagVocabulary();
    },
    async saveTagVocabulary(request) {
      const service = resolveService();
      return service.saveTagVocabulary(
        request as Parameters<typeof service.saveTagVocabulary>[0],
      );
    },
    async exportTagVocabularyForRegulator() {
      return resolveService().exportTagVocabularyForRegulator();
    },
    async listStagedTagSuggestions() {
      return resolveService().listStagedTagSuggestions();
    },
    async stageTagSuggestions(request) {
      const service = resolveService();
      return service.stageTagSuggestions(
        request as Parameters<typeof service.stageTagSuggestions>[0],
      );
    },
    async discardStagedTagSuggestions(request) {
      const service = resolveService();
      return service.discardStagedTagSuggestions(
        request as Parameters<typeof service.discardStagedTagSuggestions>[0],
      );
    },
    async replaceTagAuditRecords(request) {
      return resolveService().replaceTagAuditRecords(request);
    },
    async clearTagAuditRecord(request) {
      return resolveService().clearTagAuditRecord(request);
    },
    async getSynthesisWorkbenchChromeInput(state) {
      return resolveService().getSynthesisWorkbenchChromeInput(
        state as Parameters<
          LegacyServiceInstance["getSynthesisWorkbenchChromeInput"]
        >[0],
      );
    },
    async getSynthesisWorkbenchSurfaceInput(surface, state) {
      return resolveService().getSynthesisWorkbenchSurfaceInput(
        surface,
        state as Parameters<
          LegacyServiceInstance["getSynthesisWorkbenchSurfaceInput"]
        >[1],
      );
    },
    async readTopicDetail(request) {
      return resolveService().readTopicDetail(request);
    },
    async resolveTopicPaperDigest(request) {
      return resolveService().resolveTopicPaperDigest(request);
    },
  };
}

export async function createDefaultLegacySynthesisClientComposition(): Promise<{
  client: SynthesisClient;
  invalidate: () => void;
}> {
  const legacy = await import("../synthesis/service");
  return {
    client: createInProcessSynthesisClient(
      createLegacyPort(legacy.getDefaultSynthesisService),
    ),
    invalidate: legacy.invalidateDefaultSynthesisService,
  };
}

export async function createLegacyInProcessSynthesisClient(
  options: import("../synthesis/service").SynthesisServiceOptions,
): Promise<SynthesisClient> {
  const legacy = await import("../synthesis/service");
  const service = legacy.createSynthesisService(options);
  return createInProcessSynthesisClient(createLegacyPort(() => service));
}
