import fs from "node:fs";
import path from "node:path";
import {
  SynthesisClientError,
  type SynthesisClient,
  type SynthesisSidecarProductionClientCapability,
} from "../../packages/synthesis-contracts/src";
import {
  readSynthesisProductionSurfaceCorpora,
  type SynthesisProductionSurfaceCorpus,
} from "../../scripts/synthesisProductionSurfaceCorpora";
import type { SynthesisProductionRouteHarness } from "./synthesisProductionRouteHarness";
import {
  captureSynthesisProductionRouteDurableState,
  waitForSynthesisProductionRouteEvidence,
  waitForSynthesisProductionRouteReceipt,
} from "./synthesisProductionRouteHarness";

const ROOT = path.resolve(import.meta.dirname, "../..");

type OperationManifest = {
  access: Record<
    SynthesisSidecarProductionClientCapability,
    "read" | "mutation"
  >;
  policyDefaults: {
    requestPlane: "control" | "transfer";
    resultPlane: "control" | "locator" | "delivery";
    workModel: "bounded" | "receipt";
    receipt: "inline" | "public-maintenance-operation";
  };
  policyOverrides: Partial<
    Record<
      SynthesisSidecarProductionClientCapability,
      Partial<OperationManifest["policyDefaults"]>
    >
  >;
};

export type SynthesisProductionRouteScenario = {
  operation: SynthesisSidecarProductionClientCapability;
  prelude?: (client: SynthesisClient) => Promise<void>;
  invoke: (client: SynthesisClient) => Promise<unknown>;
  assertSemantic: (outcome: SynthesisProductionRouteScenarioOutcome) => void;
};

export type SynthesisProductionRouteScenarioOutcome =
  | { kind: "result"; value: unknown }
  | { kind: "stable-error"; code: string };

type BaselineScenarioExpectations = {
  resultTypes: {
    boolean: SynthesisSidecarProductionClientCapability[];
    array: SynthesisSidecarProductionClientCapability[];
  };
  stableErrors: Partial<
    Record<SynthesisSidecarProductionClientCapability, string>
  >;
};

function readBaselineScenarioExpectations(): BaselineScenarioExpectations {
  const fixture = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "test/fixtures/synthesis-sidecar-migration/main-e210997a-production-observables.v1.json",
      ),
      "utf8",
    ),
  ) as { productionRouteScenario?: BaselineScenarioExpectations };
  if (!fixture.productionRouteScenario) {
    throw new Error("production route baseline expectations missing");
  }
  return fixture.productionRouteScenario;
}

function assertExpectedSemantic(args: {
  operation: SynthesisSidecarProductionClientCapability;
  outcome: SynthesisProductionRouteScenarioOutcome;
  expectedError?: string;
  resultType: "object" | "array" | "boolean";
  receipt: boolean;
}) {
  if (args.expectedError) {
    if (
      args.outcome.kind !== "stable-error" ||
      args.outcome.code !== args.expectedError
    ) {
      throw new Error(
        `production route outcome mismatch for ${args.operation}: expected ${args.expectedError}`,
      );
    }
    return;
  }
  if (args.outcome.kind !== "result") {
    throw new Error(
      `production route unexpected error for ${args.operation}: ${args.outcome.code}`,
    );
  }
  const value = args.outcome.value;
  const actualType = Array.isArray(value) ? "array" : typeof value;
  if (actualType !== args.resultType) {
    throw new Error(
      `production route result type mismatch for ${args.operation}: ${actualType}`,
    );
  }
  if (
    args.resultType === "object" &&
    (!value || Object.keys(value as Record<string, unknown>).length === 0)
  ) {
    throw new Error(`production route empty result for ${args.operation}`);
  }
  if (args.receipt) {
    const receipt = value as Record<string, unknown>;
    if (
      receipt.schema !== "synthesis.maintenance_operation.v1" ||
      !["completed", "failed", "canceled", "timed_out"].includes(
        String(receipt.status || ""),
      )
    ) {
      throw new Error(
        `production route receipt terminal mismatch for ${args.operation}`,
      );
    }
  }
}

const literatureApplyRequest = {
  libraryId: 1,
  itemKey: "SCENARIO1",
  paperRef: "1:SCENARIO1",
  itemType: "journalArticle",
  title: "Production route scenario",
  year: "2026",
  date: "2026-08-02",
  creators: ["Scenario Author"],
  tags: [],
  collections: [],
  doi: "",
  arxiv: "",
  isbn: "",
  url: "",
  citekey: "scenario2026",
  dateAdded: "2026-08-02T00:00:00.000Z",
};

const GROUPED_INVOCATIONS: Record<
  SynthesisSidecarProductionClientCapability,
  (client: SynthesisClient) => Promise<unknown>
> = {
  "client.listTopics": (client) => client.topics.list({}),
  "client.findTopicsByPaperRef": (client) =>
    client.topics.findByPaperRef({ paperRef: "1:SCENARIO1" }),
  "client.getTopicContext": (client) =>
    client.topics.getContext({ topicId: "topic:missing" }),
  "client.resolveResolver": (client) =>
    client.topics.resolveResolver({ paper_refs: ["1:SCENARIO1"] }),
  "client.queryCitationGraphCluster": (client) => client.graph.queryCluster({}),
  "client.queryCitationGraph": (client) => client.graph.getOverview({}),
  "client.getCitationGraphSlice": (client) =>
    client.graph.getSlice({ paperRef: "1:SCENARIO1", depth: 1 }),
  "client.getCitationGraphLayout": (client) =>
    client.graph.getPersistedLayout({ scope: "full", algorithm: "force" }),
  "client.getCitationGraphMetrics": (client) =>
    client.graph.getMetrics({ limit: 10 }),
  "client.rankLibraryPapers": (client) =>
    client.graph.rankLibraryPapers({ limit: 10 }),
  "client.refreshCitationGraphMetricsNow": (client) =>
    client.graph.refreshMetricsNow({}),
  "client.startCitationGraphUpdate": (client) => client.graph.startUpdate({}),
  "client.getReferenceSidecarIndex": (client) =>
    client.references.getSidecarIndex({}),
  "client.rankExternalReferences": (client) =>
    client.references.rankExternalReferences({}),
  "client.getAttentionQueue": (client) =>
    client.references.getAttentionQueue({}),
  "client.startReferenceSidecarRefresh": (client) =>
    client.references.startRefresh({}),
  "client.getPaperArtifactManifest": (client) =>
    client.artifacts.getManifest({}),
  "client.exportFilteredPaperArtifacts": (client) =>
    client.artifacts.exportFiltered({ paper_refs: [] }),
  "client.queryConceptKb": (client) => client.concepts.query({}),
  "client.getSchemas": (client) => client.maintenance.getSchemas({}),
  "client.getPublicMaintenanceOperation": (client) =>
    client.maintenance.getOperation({ operation_id: "maintenance:missing" }),
  "client.controlPublicMaintenanceOperation": (client) =>
    client.maintenance.controlOperation({
      action: "cancel",
      operation_id: "maintenance:missing",
    }),
  "client.getLibraryIndex": (client) => client.libraryIndex.getPage({}),
  "client.getReviewInput": (client) => client.workflowReview.getInput({}),
  "client.debugSynthesisSnapshot": (client) => client.debug.snapshot({}),
  "client.debugSynthesisCacheList": (client) => client.debug.listCache({}),
  "client.debugSynthesisOperationsList": (client) =>
    client.debug.listOperations({}),
  "client.debugSynthesisProfilerList": (client) =>
    client.debug.listProfiler({}),
  "client.debugSynthesisPaperInspect": (client) =>
    client.debug.inspectPaper({ paperRef: "1:SCENARIO1" }),
  "client.debugSynthesisTopicInspect": (client) =>
    client.debug.inspectTopic({ topicId: "topic:missing" }),
  "client.debugSynthesisDiff": (client) => client.debug.diff({}),
  "client.debugSynthesisCleanInstallReset": (client) =>
    client.debug.cleanInstallReset({ dryRun: true }),
  "client.listWorkflowTopicOptions": (client) =>
    client.topics.listWorkflowOptions({ filter: "all" }),
  "client.reconcileSynthesisRuntimeWorkStateOnStartup": (client) =>
    client.system.reconcileRuntimeWorkOnStartup(),
  "client.resetSynthesisDatabase": (client) =>
    client.maintenance.resetDatabase({ confirmationText: "not-confirmed" }),
  "client.consumeRelatedItemsSyncEcho": (client) =>
    client.notifications.consumeRelatedItemsSyncEcho({
      libraryId: 1,
      itemKey: "SCENARIO1",
    }),
  "client.applyLiteratureDigestSidecar": (client) =>
    client.workflowApply.applyLiteratureDigestSidecar(literatureApplyRequest),
  "client.applyTopicSynthesisResult": (client) =>
    client.workflowApply.applyTopicSynthesisResult({ bundle: {}, assets: [] }),
  "client.getTopicReport": (client) =>
    client.topics.getTopicReport({ topicId: "topic:missing" }),
  "client.deleteTopicArtifact": (client) =>
    client.topics.deleteTopicArtifact({ topicId: "topic:missing" }),
  "client.purgeDeletedTopicArtifacts": (client) =>
    client.topics.purgeDeletedTopicArtifacts(),
  "client.rejectTopicDiscoveryHint": (client) =>
    client.topics.rejectTopicDiscoveryHint({ hintId: "hint:missing" }),
  "client.restoreTopicDiscoveryHint": (client) =>
    client.topics.restoreTopicDiscoveryHint({ hintId: "hint:missing" }),
  "client.rebuildTopicGraphIndex": (client) =>
    client.topicGraph.rebuildTopicGraphIndex(),
  "client.acceptTopicGraphRelation": (client) =>
    client.topicGraph.acceptTopicGraphRelation({ edgeId: "edge:missing" }),
  "client.rejectTopicGraphRelation": (client) =>
    client.topicGraph.rejectTopicGraphRelation({ edgeId: "edge:missing" }),
  "client.applyTopicGraphReviewAction": (client) =>
    client.topicGraph.applyTopicGraphReviewAction({
      reviewId: "review:missing",
      action: "reject",
    }),
  "client.readPaperArtifacts": (client) =>
    client.artifacts.readPaperArtifacts({ paper_refs: ["1:SCENARIO1"] }),
  "client.initializeBuiltinTagPolicy": (client) =>
    client.tags.initializeBuiltinTagPolicy(),
  "client.isBuiltinTagPolicyInitialized": (client) =>
    client.tags.isBuiltinTagPolicyInitialized(),
  "client.loadTagVocabulary": (client) => client.tags.loadTagVocabulary(),
  "client.saveTagVocabulary": (client) =>
    client.tags.saveTagVocabulary({
      entries: [{ tag: "topic:scenario", facet: "topic" }],
    }),
  "client.validateTagVocabulary": (client) =>
    client.tags.validateTagVocabulary(),
  "client.rebuildTagVocabularyIndex": (client) =>
    client.tags.rebuildTagVocabularyIndex(),
  "client.exportTagVocabularyForRegulator": (client) =>
    client.tags.exportTagVocabularyForRegulator(),
  "client.listStagedTagSuggestions": (client) =>
    client.tags.listStagedTagSuggestions(),
  "client.stageTagSuggestions": (client) =>
    client.tags.stageTagSuggestions({
      entries: [
        { tag: "method:scenario", facet: "method" },
        { tag: "method:discard", facet: "method" },
      ],
    }),
  "client.updateStagedTagSuggestion": (client) =>
    client.tags.updateStagedTagSuggestion({
      originalTag: "method:scenario",
      tag: "method:scenario-updated",
      facet: "method",
      note: "fixture",
      sourceFlow: "production-route",
      parentBindings: [],
    }),
  "client.updateTagVocabularyEntry": (client) =>
    client.tags.updateTagVocabularyEntry({
      originalTag: "topic:scenario",
      tag: "topic:scenario-updated",
      facet: "topic",
      note: "fixture",
    }),
  "client.deleteTagVocabularyEntry": (client) =>
    client.tags.deleteTagVocabularyEntry({
      originalTag: "topic:scenario-updated",
    }),
  "client.promoteStagedTagSuggestions": (client) =>
    client.tags.promoteStagedTagSuggestions({
      tags: ["method:scenario-updated"],
    }),
  "client.discardStagedTagSuggestions": (client) =>
    client.tags.discardStagedTagSuggestions({ tags: ["method:discard"] }),
  "client.clearStagedTagSuggestions": (client) =>
    client.tags.clearStagedTagSuggestions(),
  "client.previewTagVocabularyImport": (client) =>
    client.tags.previewTagVocabularyImport({ payload: "{}" }),
  "client.applyTagVocabularyImport": (client) =>
    client.tags.applyTagVocabularyImport({
      payload: "{}",
      action: "merge-non-conflicting",
    }),
  "client.replaceTagAuditRecords": (client) =>
    client.tags.replaceTagAuditRecords({ libraryId: 1, entries: [] }),
  "client.clearTagAuditRecord": (client) =>
    client.tags.clearTagAuditRecord({ libraryId: 1, itemKey: "SCENARIO1" }),
  "client.getSynthesisWorkbenchChromeInput": (client) =>
    client.workbench.readChrome({ state: {} }),
  "client.getSynthesisWorkbenchSurfaceInput": (client) =>
    client.workbench.readSurface({ surface: "home", state: {} }),
  "client.getSynthesisBackgroundJobRows": (client) =>
    client.workbench.readProgress(),
  "client.readTopicDetail": (client) =>
    client.workbench.readTopicDetail({ topicId: "topic:missing" }),
  "client.resolveTopicPaperDigest": (client) =>
    client.artifacts.resolveTopicPaperDigest({
      topicId: "topic:missing",
      paperRef: "1:SCENARIO1",
    }),
  "client.recomputeCitationGraphLayout": (client) =>
    client.graph.recomputeCitationGraphLayout({ algorithm: "force" }),
  "client.rebuildCitationGraphCacheNow": (client) =>
    client.graph.rebuildCitationGraphCacheNow(),
  "client.refreshCitationGraphCacheIncrementalNow": (client) =>
    client.graph.refreshCitationGraphCacheIncrementalNow(),
  "client.retryCitationGraphCacheRebuild": (client) =>
    client.graph.retryCitationGraphCacheRebuild(),
  "client.refreshReferenceSidecarNow": (client) =>
    client.references.refreshReferenceSidecarNow(),
  "client.retryReferenceSidecarRefresh": (client) =>
    client.references.retryReferenceSidecarRefresh(),
  "client.runAdvancedReferenceMatchingNow": (client) =>
    client.references.runAdvancedReferenceMatchingNow(),
  "client.retryAdvancedReferenceMatching": (client) =>
    client.references.retryAdvancedReferenceMatching(),
  "client.applyCanonicalRevisionReviewAction": (client) =>
    client.references.applyCanonicalRevisionReviewAction({
      reviewItemId: "review:missing",
      action: "reject",
    }),
  "client.applyReferenceMatchProposalAction": (client) =>
    client.references.applyReferenceMatchProposalAction({
      proposalId: "proposal:missing",
      action: "reject",
    }),
  "client.applyReferenceMatchProposalActions": (client) =>
    client.references.applyReferenceMatchProposalActions({
      decisions: [{ proposalId: "proposal:missing", action: "reject" }],
    }),
  "client.mergeEffectiveCanonicalReference": (client) =>
    client.references.mergeEffectiveCanonicalReference({
      sourceEffectiveCanonicalId: "canonical:source",
      targetEffectiveCanonicalId: "canonical:target",
    }),
  "client.applyCanonicalRevisionMergeRequests": (client) =>
    client.references.applyCanonicalRevisionMergeRequests({
      requests: [
        {
          sourceEffectiveCanonicalId: "canonical:source",
          targetEffectiveCanonicalId: "canonical:target",
        },
      ],
    }),
  "client.updateCanonicalReferenceMetadata": (client) =>
    client.references.updateCanonicalReferenceMetadata({
      canonicalReferenceId: "canonical:missing",
      patch: { title: "Scenario title" },
    }),
  "client.archiveCanonicalReference": (client) =>
    client.references.archiveCanonicalReference({
      canonicalReferenceId: "canonical:missing",
    }),
  "client.rebuildConceptKbIndex": (client) =>
    client.concepts.rebuildConceptKbIndex(),
  "client.updateConceptDisplayText": (client) =>
    client.concepts.updateConceptDisplayText({
      conceptId: "concept:missing",
      fields: { definition: "Scenario definition" },
    }),
  "client.applyConceptReviewAction": (client) =>
    client.concepts.applyConceptReviewAction({
      reviewId: "review:missing",
      action: "reject",
    }),
  "client.deleteConceptEntries": (client) =>
    client.concepts.deleteConceptEntries({ conceptIds: ["concept:missing"] }),
  "client.syncWebDavNow": (client) => client.sync.webDav.runNow(),
  "client.pauseWebDavSync": (client) => client.sync.webDav.pause(),
  "client.resumeWebDavSync": (client) => client.sync.webDav.resume(),
  "client.retryWebDavSync": (client) => client.sync.webDav.retry(),
  "client.resolveWebDavSyncConflict": (client) =>
    client.sync.webDav.resolveConflict({ action: "skip" }),
};

export function readSynthesisProductionRouteInventory() {
  const corpora = readSynthesisProductionSurfaceCorpora(ROOT);
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json",
      ),
      "utf8",
    ),
  ) as OperationManifest;
  const corpusOperations = corpora.flatMap(({ id: surface, corpus }) =>
    corpus.operations.map((operation) => ({
      surface,
      operation: operation.id as SynthesisSidecarProductionClientCapability,
      access: operation.access,
    })),
  );
  return { corpora, manifest, corpusOperations };
}

export function createSynthesisProductionRouteScenarios() {
  const { manifest, corpusOperations } =
    readSynthesisProductionRouteInventory();
  const expectations = readBaselineScenarioExpectations();
  const errors: string[] = [];
  const operationIds = corpusOperations.map(({ operation }) => operation);
  const duplicates = operationIds.filter(
    (operation, index) => operationIds.indexOf(operation) !== index,
  );
  for (const duplicate of new Set(duplicates)) {
    errors.push(`duplicate corpus operation: ${duplicate}`);
  }
  for (const { operation, access } of corpusOperations) {
    if (manifest.access[operation] !== access) {
      errors.push(`manifest access mismatch: ${operation}`);
    }
    if (!GROUPED_INVOCATIONS[operation]) {
      errors.push(`grouped scenario missing: ${operation}`);
    }
  }
  for (const operation of Object.keys(GROUPED_INVOCATIONS)) {
    if (
      !operationIds.includes(
        operation as SynthesisSidecarProductionClientCapability,
      )
    ) {
      errors.push(`grouped scenario outside corpus: ${operation}`);
    }
  }
  for (const operation of Object.keys(manifest.access)) {
    if (
      !operationIds.includes(
        operation as SynthesisSidecarProductionClientCapability,
      )
    ) {
      errors.push(`manifest operation outside corpus: ${operation}`);
    }
  }
  const classified = new Set([
    ...expectations.resultTypes.boolean,
    ...expectations.resultTypes.array,
    ...Object.keys(expectations.stableErrors),
  ]);
  for (const operation of classified) {
    if (
      !operationIds.includes(
        operation as SynthesisSidecarProductionClientCapability,
      )
    ) {
      errors.push(`baseline scenario outside corpus: ${operation}`);
    }
  }
  if (errors.length) {
    throw new Error(errors.sort().join("\n"));
  }
  return corpusOperations.map(({ operation }) => ({
    operation,
    invoke: GROUPED_INVOCATIONS[operation],
    assertSemantic: (outcome: SynthesisProductionRouteScenarioOutcome) => {
      const policy = {
        ...manifest.policyDefaults,
        ...(manifest.policyOverrides[operation] || {}),
      };
      assertExpectedSemantic({
        operation,
        outcome,
        expectedError: expectations.stableErrors[operation],
        resultType: expectations.resultTypes.boolean.includes(operation)
          ? "boolean"
          : expectations.resultTypes.array.includes(operation)
            ? "array"
            : "object",
        receipt: policy.receipt === "public-maintenance-operation",
      });
    },
  })) satisfies SynthesisProductionRouteScenario[];
}

export async function executeSynthesisProductionRouteScenarios(
  harness: SynthesisProductionRouteHarness,
) {
  const scenarios = createSynthesisProductionRouteScenarios();
  const { manifest } = readSynthesisProductionRouteInventory();
  const observations: Array<{
    operation: SynthesisSidecarProductionClientCapability;
    outcome: SynthesisProductionRouteScenarioOutcome;
  }> = [];
  for (const scenario of scenarios) {
    await scenario.prelude?.(harness.client);
    const wireOffset = harness.recorder.wire.length;
    const hostOffset = harness.recorder.hostCalls.length;
    const observationOffset = harness.observations().length;
    const durableBefore = captureSynthesisProductionRouteDurableState(
      harness.root,
    );
    let outcome: SynthesisProductionRouteScenarioOutcome;
    try {
      outcome = {
        kind: "result",
        value: await scenario.invoke(harness.client),
      };
    } catch (error) {
      if (!(error instanceof SynthesisClientError)) throw error;
      outcome = { kind: "stable-error", code: error.code };
    }
    const primaryCalls = harness.recorder.wire
      .slice(wireOffset)
      .filter((sample) => sample.capability.startsWith("client."));
    if (
      primaryCalls.length !== 1 ||
      primaryCalls[0].capability !== scenario.operation
    ) {
      throw new Error(
        `production route mismatch for ${scenario.operation}: ${primaryCalls
          .map(({ capability }) => capability)
          .join(",")}`,
      );
    }
    if (
      outcome.kind === "result" &&
      outcome.value &&
      typeof outcome.value === "object" &&
      (outcome.value as Record<string, unknown>).schema ===
        "synthesis.maintenance_operation.v1" &&
      ["pending", "running"].includes(
        String((outcome.value as Record<string, unknown>).status || ""),
      ) &&
      typeof (outcome.value as Record<string, unknown>).operation_id ===
        "string"
    ) {
      const operationId = String(
        (outcome.value as Record<string, unknown>).operation_id,
      );
      outcome = {
        kind: "result",
        value: await waitForSynthesisProductionRouteReceipt({
          operationId,
          attempts: 400,
          getOperation: (candidate) =>
            harness.client.maintenance.getOperation({
              operation_id: candidate,
            }),
        }),
      };
    }
    scenario.assertSemantic(outcome);
    const queryTerminals = await waitForSynthesisProductionRouteEvidence({
      read: () => harness.observations(),
      offset: observationOffset,
      attempts: 20,
      intervalMs: 10,
      matches: (event) =>
        event.boundary === "operation" &&
        event.phase === "query-terminal" &&
        event.identities?.capability === scenario.operation,
    });
    if (!queryTerminals.length) {
      throw new Error(
        `production route SQL observation missing: ${scenario.operation}`,
      );
    }
    if (manifest.access[scenario.operation] === "read") {
      if (
        queryTerminals.some(
          (event) =>
            event.metrics?.sqlWriteCount !== 0 ||
            !Number.isSafeInteger(event.metrics?.sqlQueryCount),
        )
      ) {
        throw new Error(
          `read scenario SQL observation invalid: ${scenario.operation}`,
        );
      }
      const durableAfter = captureSynthesisProductionRouteDurableState(
        harness.root,
      );
      if (JSON.stringify(durableAfter) !== JSON.stringify(durableBefore)) {
        throw new Error(
          `read scenario changed durable state: ${scenario.operation}`,
        );
      }
      const unauthorizedEffects = harness.recorder.hostCalls
        .slice(hostOffset)
        .filter(({ capability }) => capability.startsWith("effects."));
      if (unauthorizedEffects.length) {
        throw new Error(
          `read scenario emitted Host effects: ${scenario.operation}`,
        );
      }
    }
    observations.push({ operation: scenario.operation, outcome });
  }
  const actual = observations.map(({ operation }) => operation);
  const expected = scenarios.map(({ operation }) => operation);
  if (
    actual.length !== expected.length ||
    new Set(actual).size !== expected.length ||
    actual.some((operation, index) => operation !== expected[index])
  ) {
    throw new Error("production route scenario coverage is not one-to-one");
  }
  return observations;
}

export function productionRoutePolicy(
  operation: SynthesisSidecarProductionClientCapability,
) {
  const { manifest } = readSynthesisProductionRouteInventory();
  return {
    ...manifest.policyDefaults,
    ...(manifest.policyOverrides[operation] || {}),
    access: manifest.access[operation],
  };
}

export type SynthesisProductionSurfaceCorpusOperation =
  SynthesisProductionSurfaceCorpus["operations"][number];
