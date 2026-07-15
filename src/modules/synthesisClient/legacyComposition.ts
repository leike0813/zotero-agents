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
    async getSynthesisBackgroundJobRows() {
      return resolveService().getSynthesisBackgroundJobRows();
    },
    async readTopicDetail(request) {
      return resolveService().readTopicDetail(request);
    },
    async resolveTopicPaperDigest(request) {
      return resolveService().resolveTopicPaperDigest(request);
    },
    async recomputeCitationGraphLayout(request) {
      return resolveService().recomputeCitationGraphLayout(request);
    },
    async rebuildCitationGraphCacheNow() {
      return resolveService().rebuildCitationGraphCacheNow();
    },
    async refreshCitationGraphCacheIncrementalNow() {
      return resolveService().refreshCitationGraphCacheIncrementalNow();
    },
    async retryCitationGraphCacheRebuild() {
      return resolveService().retryCitationGraphCacheRebuild();
    },
    async refreshReferenceSidecarNow() {
      return resolveService().refreshReferenceSidecarNow();
    },
    async retryReferenceSidecarRefresh() {
      return resolveService().retryReferenceSidecarRefresh();
    },
    async runAdvancedReferenceMatchingNow() {
      return resolveService().runAdvancedReferenceMatchingNow();
    },
    async retryAdvancedReferenceMatching() {
      return resolveService().retryAdvancedReferenceMatching();
    },
    async applyCanonicalRevisionReviewAction(request) {
      return resolveService().applyCanonicalRevisionReviewAction(request);
    },
    async applyReferenceMatchProposalAction(request) {
      return resolveService().applyReferenceMatchProposalAction(request);
    },
    async applyReferenceMatchProposalActions(request) {
      return resolveService().applyReferenceMatchProposalActions(request);
    },
    async mergeEffectiveCanonicalReference(request) {
      return resolveService().mergeEffectiveCanonicalReference(request);
    },
    async applyCanonicalRevisionMergeRequests(request) {
      return resolveService().applyCanonicalRevisionMergeRequests(request);
    },
    async updateCanonicalReferenceMetadata(request) {
      return resolveService().updateCanonicalReferenceMetadata(request);
    },
    async archiveCanonicalReference(request) {
      return resolveService().archiveCanonicalReference(request);
    },
    async rebuildConceptKbIndex() {
      return resolveService().rebuildConceptKbIndex();
    },
    async updateConceptDisplayText(request) {
      return resolveService().updateConceptDisplayText(request);
    },
    async applyConceptReviewAction(request) {
      return resolveService().applyConceptReviewAction(request);
    },
    async deleteConceptEntries(request) {
      return resolveService().deleteConceptEntries(request);
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
