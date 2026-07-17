import type { SynthesisClient } from "../../../packages/synthesis-contracts/src/index";
import {
  createInProcessSynthesisConceptKbIndexEngine,
  createInProcessSynthesisReferenceMatcherEngine,
  createInProcessSynthesisTagVocabularyEngine,
  createInProcessSynthesisTopicGraphIndexEngine,
  createInProcessSynthesisTopicStructuredArtifactEngine,
} from "../../../packages/synthesis-engine/src/index";
import { createInProcessSynthesisCitationGraphBuildEngine } from "../../../packages/synthesis-engine/src/citationGraphBuild";
import { getRuntimePersistencePaths } from "../runtimePersistence";
import { createSynthesisSidecarCitationGraphLayoutEngine } from "../synthesis/sidecarCitationGraphLayoutEngineAdapter";
import { createSynthesisSidecarCitationGraphMetricsEngine } from "../synthesis/sidecarCitationGraphMetricsEngineAdapter";
import { createZoteroSynthesisHostReadPort } from "../synthesis/libraryAdapter";
import { createSynthesisHostExportDeliveryPort } from "../synthesis/exportDeliveryAdapter";
import { createZoteroSynthesisRepresentativeImageReadPort } from "../synthesis/representativeImageReadAdapter";
import { createZoteroSynthesisRelatedItemsEffectPort } from "../synthesis/relatedItemsEffectAdapter";
import {
  createZoteroSynthesisStagedTagBindingMigrationPort,
  createZoteroSynthesisTagEffectPort,
} from "../synthesis/tagEffectAdapter";
import { createPrefsConfiguredSynthesisWebDavSyncPort } from "../synthesis/webDavSyncAdapter";
import {
  createInProcessSynthesisClient,
  type LegacySynthesisPort,
} from "./inProcessClient";

type LegacyServiceInstance = ReturnType<
  (typeof import("../synthesis/service"))["createSynthesisService"]
>;

let defaultLegacyService: LegacyServiceInstance | undefined;
let defaultLegacyServiceAbortController: AbortController | undefined;

function configuredLibraryId() {
  const value = Number(
    (globalThis as { Zotero?: any }).Zotero?.Libraries?.userLibraryID || 1,
  );
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function createDefaultLegacyService(
  legacy: typeof import("../synthesis/service"),
) {
  if (defaultLegacyService) {
    return defaultLegacyService;
  }
  const libraryId = configuredLibraryId();
  const paths = getRuntimePersistencePaths();
  const abortController = new AbortController();
  defaultLegacyServiceAbortController = abortController;
  defaultLegacyService = legacy.createSynthesisService({
    root: paths.dataDir,
    runtimeRoot: paths.root,
    libraryId,
    hostReadPort: createZoteroSynthesisHostReadPort({ libraryId }),
    hostExportDeliveryPort: createSynthesisHostExportDeliveryPort(),
    hostRepresentativeImageReadPort:
      createZoteroSynthesisRepresentativeImageReadPort(),
    hostRelatedItemsEffectPort: createZoteroSynthesisRelatedItemsEffectPort(),
    hostStagedTagBindingMigrationPort:
      createZoteroSynthesisStagedTagBindingMigrationPort(),
    hostTagEffectPort: createZoteroSynthesisTagEffectPort(),
    citationGraphLayoutEngine: createSynthesisSidecarCitationGraphLayoutEngine({
      signal: abortController.signal,
    }),
    citationGraphMetricsEngine:
      createSynthesisSidecarCitationGraphMetricsEngine({
        signal: abortController.signal,
      }),
    citationGraphBuildEngine:
      createInProcessSynthesisCitationGraphBuildEngine(),
    referenceMatcherEngine: createInProcessSynthesisReferenceMatcherEngine(),
    tagVocabularyEngine: createInProcessSynthesisTagVocabularyEngine(),
    conceptKbIndexEngine: createInProcessSynthesisConceptKbIndexEngine(),
    topicGraphIndexEngine: createInProcessSynthesisTopicGraphIndexEngine(),
    topicStructuredArtifactEngine:
      createInProcessSynthesisTopicStructuredArtifactEngine({
        checkpoint() {
          if (abortController.signal.aborted) {
            throw abortController.signal.reason instanceof Error
              ? abortController.signal.reason
              : new Error("Synthesis runtime was invalidated");
          }
        },
      }),
    hostWebDavSyncPort: createPrefsConfiguredSynthesisWebDavSyncPort(),
    runtimeAbortSignal: abortController.signal,
  });
  return defaultLegacyService;
}

function createLegacyPort(
  resolveService: () => LegacyServiceInstance,
): LegacySynthesisPort {
  return {
    async listTopics(request) {
      return resolveService().listTopics(request);
    },
    async findTopicsByPaperRef(request) {
      return resolveService().findTopicsByPaperRef(request);
    },
    async getTopicContext(request, delivery) {
      return resolveService().getTopicContext(request, delivery);
    },
    async resolveResolver(request) {
      return resolveService().resolveResolver(request);
    },
    async queryCitationGraphCluster(request) {
      return resolveService().queryCitationGraphCluster(request);
    },
    async queryCitationGraph(request) {
      return resolveService().queryCitationGraph(request);
    },
    async getCitationGraphSlice(request) {
      return resolveService().getCitationGraphSlice(request);
    },
    async getCitationGraphLayout(request) {
      return resolveService().getCitationGraphLayout(request);
    },
    async getCitationGraphMetrics(request) {
      return resolveService().getCitationGraphMetrics(request);
    },
    async rankLibraryPapers(request) {
      return resolveService().rankLibraryPapers(request);
    },
    async refreshCitationGraphMetricsNow(request) {
      const service = resolveService();
      return service.refreshCitationGraphMetricsNow(
        request as Parameters<typeof service.refreshCitationGraphMetricsNow>[0],
      );
    },
    async getReferenceSidecarIndex(request) {
      return resolveService().getReferenceSidecarIndex(request);
    },
    async rankExternalReferences(request) {
      return resolveService().rankExternalReferences(request);
    },
    async getAttentionQueue(request) {
      return resolveService().getAttentionQueue(request);
    },
    async getPaperArtifactManifest(request) {
      return resolveService().getPaperArtifactManifest(request);
    },
    async exportFilteredPaperArtifacts(request, delivery) {
      return resolveService().exportFilteredPaperArtifacts(request, delivery);
    },
    async queryConceptKb(request) {
      return resolveService().queryConceptKb(request);
    },
    async getSchemas(request) {
      void request;
      return resolveService().getSchemas();
    },
    async getLibraryIndex(request) {
      return resolveService().getLibraryIndex(request);
    },
    async getReviewInput(request) {
      return resolveService().getReviewInput(request);
    },
    async debugSynthesisSnapshot(request) {
      return resolveService().debugSynthesisSnapshot(request);
    },
    async debugSynthesisCacheList(request) {
      return resolveService().debugSynthesisCacheList(request);
    },
    async debugSynthesisOperationsList(request) {
      return resolveService().debugSynthesisOperationsList(request);
    },
    async debugSynthesisProfilerList(request) {
      return resolveService().debugSynthesisProfilerList(request);
    },
    async debugSynthesisPaperInspect(request) {
      return resolveService().debugSynthesisPaperInspect(request);
    },
    async debugSynthesisTopicInspect(request) {
      return resolveService().debugSynthesisTopicInspect(request);
    },
    async debugSynthesisDiff(request) {
      return resolveService().debugSynthesisDiff(request);
    },
    async debugSynthesisCleanInstallReset(request) {
      return resolveService().debugSynthesisCleanInstallReset(request);
    },
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
    async deleteTopicArtifact(request) {
      return resolveService().deleteTopicArtifact(request);
    },
    async purgeDeletedTopicArtifacts() {
      return resolveService().purgeDeletedTopicArtifacts();
    },
    async rejectTopicDiscoveryHint(request) {
      return resolveService().rejectTopicDiscoveryHint(request);
    },
    async restoreTopicDiscoveryHint(request) {
      return resolveService().restoreTopicDiscoveryHint(request);
    },
    async rebuildTopicGraphIndex() {
      return resolveService().rebuildTopicGraphIndex();
    },
    async acceptTopicGraphRelation(request) {
      return resolveService().acceptTopicGraphRelation(request);
    },
    async rejectTopicGraphRelation(request) {
      return resolveService().rejectTopicGraphRelation(request);
    },
    async applyTopicGraphReviewAction(request) {
      return resolveService().applyTopicGraphReviewAction(request);
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
    async validateTagVocabulary() {
      return resolveService().validateTagVocabulary();
    },
    async rebuildTagVocabularyIndex() {
      return resolveService().rebuildTagVocabularyIndex();
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
    async updateStagedTagSuggestion(request) {
      return resolveService().updateStagedTagSuggestion(request);
    },
    async updateTagVocabularyEntry(request) {
      return resolveService().updateTagVocabularyEntry(request);
    },
    async deleteTagVocabularyEntry(request) {
      return resolveService().deleteTagVocabularyEntry(request);
    },
    async promoteStagedTagSuggestions(request) {
      return resolveService().promoteStagedTagSuggestions(request);
    },
    async discardStagedTagSuggestions(request) {
      return resolveService().discardStagedTagSuggestions(request);
    },
    async clearStagedTagSuggestions() {
      return resolveService().clearStagedTagSuggestions();
    },
    async previewTagVocabularyImport(request) {
      return resolveService().previewTagVocabularyImport(request.payload);
    },
    async applyTagVocabularyImport(request) {
      return resolveService().applyTagVocabularyImport(request);
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
    async syncWebDavNow() {
      return resolveService().syncWebDavNow();
    },
    async pauseWebDavSync() {
      return resolveService().pauseWebDavSync();
    },
    async resumeWebDavSync() {
      return resolveService().resumeWebDavSync();
    },
    async retryWebDavSync() {
      return resolveService().retryWebDavSync();
    },
    async resolveWebDavSyncConflict(request) {
      return resolveService().resolveWebDavSyncConflict(request);
    },
  };
}

export function invalidateDefaultLegacySynthesisService() {
  defaultLegacyServiceAbortController?.abort();
  defaultLegacyServiceAbortController = undefined;
  defaultLegacyService = undefined;
}

export async function createDefaultLegacySynthesisClientComposition(): Promise<{
  client: SynthesisClient;
  invalidate: () => void;
}> {
  const legacy = await import("../synthesis/service");
  const resolveService = () => createDefaultLegacyService(legacy);
  return {
    client: createInProcessSynthesisClient(createLegacyPort(resolveService)),
    invalidate: invalidateDefaultLegacySynthesisService,
  };
}

export async function createLegacyInProcessSynthesisClient(
  options: import("../synthesis/service").SynthesisServiceOptions,
): Promise<SynthesisClient> {
  const legacy = await import("../synthesis/service");
  const service = legacy.createSynthesisService(options);
  return createInProcessSynthesisClient(createLegacyPort(() => service));
}

export async function getDefaultLegacySynthesisServiceForTests() {
  const legacy = await import("../synthesis/service");
  return createDefaultLegacyService(legacy);
}

export function resetDefaultLegacySynthesisServiceForTests() {
  invalidateDefaultLegacySynthesisService();
}
