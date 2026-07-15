import { assert } from "chai";
import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";

const ROOT_DIR = process.cwd();
const INVENTORY_FILE = path.join(
  ROOT_DIR,
  "doc/synthesis-layer/contracts/service-api-migration.yaml",
);
const CHECKER_FILE = path.join(
  ROOT_DIR,
  "scripts/check-synthesis-service-boundary.ts",
);
const FIXTURE_ROOT = path.join(
  ROOT_DIR,
  "test/fixtures/synthesis-sidecar-migration",
);

async function loadBoundaryChecker() {
  assert.isTrue(
    fs.existsSync(INVENTORY_FILE),
    "the service API migration inventory must exist",
  );
  assert.isTrue(
    fs.existsSync(CHECKER_FILE),
    "the reusable synthesis boundary checker must exist",
  );
  return import("../../scripts/check-synthesis-service-boundary");
}

describe("Synthesis sidecar migration boundary", function () {
  it("keeps the service API inventory synchronized with the public return surface", async function () {
    const checker = await loadBoundaryChecker();
    const report = checker.inspectSynthesisServiceBoundary();

    assert.deepEqual(report.missingMethods, []);
    assert.deepEqual(report.unknownMethods, []);
    assert.lengthOf(report.publicMethods, 128);
    assert.equal(report.publicMethods.length, report.inventory.methods.length);
    assert.notInclude(report.publicMethods, "warmSynthesisWorkbenchSurfaces");
    assert.notInclude(
      report.inventory.methods.map((method) => method.name),
      "warmSynthesisWorkbenchSurfaces",
    );
    const rawInventory = parseYaml(fs.readFileSync(INVENTORY_FILE, "utf8")) as {
      method_groups: Array<{ id: string }>;
    };
    assert.notInclude(
      rawInventory.method_groups.map((group) => group.id),
      "workbench_warmup",
    );
  });

  it("assigns every public method a valid category, capability, and disposition", async function () {
    const checker = await loadBoundaryChecker();
    const report = checker.inspectSynthesisServiceBoundary();

    assert.deepEqual(report.invalidMethods, []);
    assert.deepEqual(report.contractViolations, []);
    for (const method of report.inventory.methods) {
      assert.match(method.name, /^[A-Za-z][A-Za-z0-9]*$/);
      assert.match(method.category, /^(query|command|host_effect|debug)$/);
      assert.match(
        method.disposition,
        /^(client_capability|host_capability|internal|remove)$/,
      );
      assert.isNotEmpty(method.target_capability);
    }
  });

  it("prevents direct full-service consumer growth outside migration composition", async function () {
    const checker = await loadBoundaryChecker();
    const report = checker.inspectSynthesisServiceBoundary();

    assert.deepEqual(report.missingConsumers, []);
    assert.deepEqual(report.unknownConsumers, []);
    assert.deepEqual(report.directConsumers, [
      "src/modules/synthesisClient/legacyComposition.ts",
    ]);
    assert.deepEqual(
      report.inventory.direct_consumers.map((consumer) => consumer.path).sort(),
      report.directConsumers,
    );
    const libraryIndex = report.inventory.methods.find(
      (method) => method.name === "getLibraryIndex",
    );
    assert.equal(libraryIndex?.disposition, "client_capability");
    assert.equal(libraryIndex?.target_capability, "library_index");

    const workbench = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesisWorkbenchTab.ts"),
      "utf8",
    );
    const synthesisClientContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/client.ts"),
      "utf8",
    );
    const contractIndex = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/index.ts"),
      "utf8",
    );
    const serviceSource = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesis/service.ts"),
      "utf8",
    );
    const representativeImageHelper = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesis/digestRepresentativeImage.ts"),
      "utf8",
    );
    const representativeImageAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/representativeImageReadAdapter.ts",
      ),
      "utf8",
    );
    const legacyComposition = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesisClient/legacyComposition.ts"),
      "utf8",
    );
    const readonlyComposition = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/harness/synthesisReadonlyClient.ts"),
      "utf8",
    );
    assert.notMatch(workbench, /synthesis\/service["']/);

    const hostBridge = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/hostBridgeCapabilityRegistry.ts"),
      "utf8",
    );
    const mcpProtocol = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/zoteroMcpProtocol.ts"),
      "utf8",
    );
    assert.notMatch(hostBridge, /synthesis\/service["']/);
    assert.notMatch(hostBridge, /\bresolveSynthesisService\b/);
    assert.include(hostBridge, "getDefaultSynthesisClient");
    assert.notMatch(mcpProtocol, /synthesis\/service["']/);
    assert.notMatch(mcpProtocol, /\bTOOL_REGISTRY\b/);
    assert.notMatch(mcpProtocol, /\bcallSynthesisService\b/);
    assert.notMatch(mcpProtocol, /\bsynthesisTool\b/);
    assert.isFalse(
      fs.existsSync(path.join(ROOT_DIR, "src/modules/synthesis/mcpService.ts")),
    );
    assert.notMatch(
      workbench,
      /\b(?:getDefaultSynthesisService|invalidateDefaultSynthesisService)\b/,
    );
    assert.include(
      synthesisClientContract,
      "readonly sync: SynthesisSyncClient",
    );
    assert.include(contractIndex, 'export * from "./sync"');
    assert.include(contractIndex, 'export * from "./debug"');
    assert.include(contractIndex, 'export * from "./libraryIndex"');
    assert.include(contractIndex, 'export * from "./workflowReview"');
    assert.include(contractIndex, 'export * from "./hostRead"');
    assert.include(contractIndex, 'export * from "./representativeImageRead"');
    assert.include(contractIndex, 'export * from "./relatedItemsEffect"');
    assert.notInclude(serviceSource, "createZoteroSynthesisLibraryAdapter");
    assert.notInclude(
      serviceSource,
      "libraryAdapter?: SynthesisLibraryAdapter",
    );
    assert.notInclude(serviceSource, "getDefaultSynthesisService");
    assert.notInclude(serviceSource, "invalidateDefaultSynthesisService");
    assert.notInclude(serviceSource, "readZoteroItemField");
    assert.notInclude(serviceSource, "zoteroCreatorsFromItem");
    assert.notInclude(serviceSource, "zoteroTagsFromItem");
    assert.notInclude(serviceSource, "zoteroCollectionsFromItem");
    assert.include(legacyComposition, "createZoteroSynthesisHostReadPort");
    assert.include(legacyComposition, "hostReadPort");
    assert.include(
      legacyComposition,
      "createZoteroSynthesisRepresentativeImageReadPort",
    );
    assert.include(legacyComposition, "hostRepresentativeImageReadPort");
    assert.notInclude(readonlyComposition, "hostRepresentativeImageReadPort");
    assert.include(
      legacyComposition,
      "createZoteroSynthesisRelatedItemsEffectPort",
    );
    assert.include(legacyComposition, "hostRelatedItemsEffectPort");
    assert.notInclude(readonlyComposition, "hostRelatedItemsEffectPort");
    assert.include(serviceSource, "hostRepresentativeImageReadPort");
    assert.notInclude(
      serviceSource,
      "createZoteroSynthesisRepresentativeImageReadPort",
    );
    assert.notInclude(serviceSource, "resolveDigestRepresentativeImageForUi");
    for (const forbidden of [
      "runtimePersistence",
      "readRuntimeBytes",
      "globalThis",
      "Zotero",
      "getFilePathAsync",
    ]) {
      assert.notInclude(representativeImageHelper, forbidden);
    }
    assert.include(
      representativeImageAdapter,
      "rebuildSynthesisHostRepresentativeImageReadRequest",
    );
    assert.include(representativeImageAdapter, "readRuntimeBytes");
    assert.include(representativeImageAdapter, "statRuntimePath");
    assert.notInclude(serviceSource, "type RelatedItemsSyncHost");
    assert.notInclude(serviceSource, "createDefaultRelatedItemsSyncHost");
    assert.notInclude(serviceSource, "zoteroItemByLibraryAndKey");
    assert.notInclude(workbench, ".getSynthesisWorkbenchChromeInput");
    assert.notInclude(workbench, ".getSynthesisWorkbenchSurfaceInput");
    assert.notInclude(workbench, ".resolveTopicPaperDigest");
    assert.match(workbench, /client\.workbench\s*\.readChrome/);
    assert.match(workbench, /client\.workbench\s*\.readSurface/);
    assert.match(workbench, /client\.workbench\s*\.readTopicDetail/);
    assert.match(workbench, /client\.workbench\s*\.readPaperDigest/);
    assert.match(workbench, /client\.workbench\s*\.readProgress/);
    assert.match(workbench, /client\.topics\s*\.getTopicReport/);
    assert.match(workbench, /client\.topics\s*\.deleteTopicArtifact/);
    assert.match(workbench, /client\.topics\s*\.purgeDeletedTopicArtifacts/);
    assert.match(workbench, /client\.topics\s*\.rejectTopicDiscoveryHint/);
    assert.match(workbench, /client\.topics\s*\.restoreTopicDiscoveryHint/);
    assert.match(workbench, /client\.graph\s*\.recomputeCitationGraphLayout/);
    assert.match(workbench, /client\.graph\s*\.rebuildCitationGraphCacheNow/);
    assert.match(
      workbench,
      /client\.graph\s*\.refreshCitationGraphCacheIncrementalNow/,
    );
    assert.match(workbench, /client\.graph\s*\.retryCitationGraphCacheRebuild/);
    assert.match(
      workbench,
      /client\.references\s*\.refreshReferenceSidecarNow/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.retryReferenceSidecarRefresh/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.runAdvancedReferenceMatchingNow/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.retryAdvancedReferenceMatching/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.applyCanonicalRevisionReviewAction/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.applyReferenceMatchProposalAction/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.applyReferenceMatchProposalActions/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.mergeEffectiveCanonicalReference/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.applyCanonicalRevisionMergeRequests/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.updateCanonicalReferenceMetadata/,
    );
    assert.match(workbench, /client\.references\s*\.archiveCanonicalReference/);
    assert.match(workbench, /client\.concepts\s*\.rebuildConceptKbIndex/);
    assert.match(workbench, /client\.concepts\s*\.updateConceptDisplayText/);
    assert.match(workbench, /client\.concepts\s*\.applyConceptReviewAction/);
    assert.match(workbench, /client\.concepts\s*\.deleteConceptEntries/);
    assert.match(workbench, /client\.topicGraph\s*\.rebuildTopicGraphIndex/);
    assert.match(workbench, /client\.topicGraph\s*\.acceptTopicGraphRelation/);
    assert.match(workbench, /client\.topicGraph\s*\.rejectTopicGraphRelation/);
    assert.match(
      workbench,
      /client\.topicGraph\s*\.applyTopicGraphReviewAction/,
    );
    for (const [transport, method] of [
      ["git", "runNow"],
      ["git", "pause"],
      ["git", "resume"],
      ["git", "retry"],
      ["git", "resolveConflict"],
      ["webDav", "runNow"],
      ["webDav", "pause"],
      ["webDav", "resume"],
      ["webDav", "retry"],
      ["webDav", "resolveConflict"],
    ]) {
      assert.match(
        workbench,
        new RegExp(`client\\.sync\\s*\\.${transport}\\s*\\.${method}`),
      );
    }
    assert.match(workbench, /client\.tags\s*\.validateTagVocabulary/);
    assert.match(workbench, /client\.tags\s*\.rebuildTagVocabularyIndex/);
    assert.match(workbench, /client\.tags\s*\.exportTagVocabularyForRegulator/);
    assert.match(workbench, /client\.tags\s*\.promoteStagedTagSuggestions/);
    assert.match(workbench, /client\.tags\s*\.discardStagedTagSuggestions/);
    assert.match(workbench, /client\.tags\s*\.clearStagedTagSuggestions/);
    assert.match(workbench, /client\.tags\s*\.updateStagedTagSuggestion/);
    assert.match(workbench, /client\.tags\s*\.updateTagVocabularyEntry/);
    assert.match(workbench, /client\.tags\s*\.deleteTagVocabularyEntry/);
    assert.match(workbench, /client\.tags\s*\.previewTagVocabularyImport/);
    assert.match(workbench, /client\.tags\s*\.applyTagVocabularyImport/);
    for (const method of [
      "recomputeCitationGraphLayout",
      "rebuildCitationGraphCacheNow",
      "refreshCitationGraphCacheIncrementalNow",
      "retryCitationGraphCacheRebuild",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(`getDefaultSynthesisService\\(\\)\\.${method}`),
      );
    }
    for (const method of [
      "refreshReferenceSidecarNow",
      "retryReferenceSidecarRefresh",
      "runAdvancedReferenceMatchingNow",
      "retryAdvancedReferenceMatching",
      "applyCanonicalRevisionReviewAction",
      "applyReferenceMatchProposalAction",
      "applyReferenceMatchProposalActions",
      "mergeEffectiveCanonicalReference",
      "applyCanonicalRevisionMergeRequests",
      "updateCanonicalReferenceMetadata",
      "archiveCanonicalReference",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(`getDefaultSynthesisService\\(\\)\\.${method}`),
      );
    }
    for (const method of [
      "rebuildConceptKbIndex",
      "updateConceptDisplayText",
      "applyConceptReviewAction",
      "deleteConceptEntries",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(`getDefaultSynthesisService\\(\\)\\.${method}`),
      );
    }
    for (const method of [
      "deleteTopicArtifact",
      "purgeDeletedTopicArtifacts",
      "rejectTopicDiscoveryHint",
      "restoreTopicDiscoveryHint",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(
          `(?:getDefaultSynthesisService\\(\\)\\s*\\.|\\bservice\\.)${method}`,
        ),
      );
    }
    for (const method of [
      "rebuildTopicGraphIndex",
      "acceptTopicGraphRelation",
      "rejectTopicGraphRelation",
      "applyTopicGraphReviewAction",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(
          `(?:getDefaultSynthesisService\\(\\)\\s*\\.|\\bservice\\.)${method}`,
        ),
      );
    }
    for (const method of [
      "validateTagVocabulary",
      "rebuildTagVocabularyIndex",
      "exportTagVocabularyForRegulator",
      "previewTagVocabularyImport",
      "applyTagVocabularyImport",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(
          `(?:getDefaultSynthesisService\\(\\)\\s*\\.|\\bservice\\.)${method}`,
        ),
      );
    }
    const stagedBulkRegion = workbench.slice(
      workbench.indexOf(
        'result.hostCommand?.command === "promoteStagedTagSuggestions"',
      ),
      workbench.indexOf(
        'result.hostCommand?.command === "applyTagVocabularyImport"',
      ),
    );
    for (const method of [
      "promoteStagedTagSuggestions",
      "discardStagedTagSuggestions",
      "clearStagedTagSuggestions",
    ]) {
      assert.notMatch(
        stagedBulkRegion,
        new RegExp(
          `(?:getDefaultSynthesisService\\(\\)\\s*\\.|\\bservice\\.)${method}`,
        ),
      );
    }
    const stagedUpdateRegion = workbench.slice(
      workbench.indexOf(
        'result.hostCommand?.command === "updateStagedTagSuggestion"',
      ),
      workbench.indexOf(
        'result.hostCommand?.command === "updateTagVocabularyEntry"',
      ),
    );
    assert.notMatch(
      stagedUpdateRegion,
      /(?:getDefaultSynthesisService\(\)\s*\.|\bservice\.)(?:stageTagSuggestions|discardStagedTagSuggestions)/,
    );
    const vocabularyEntryMutationRegion = workbench.slice(
      workbench.indexOf(
        'result.hostCommand?.command === "updateTagVocabularyEntry"',
      ),
      workbench.indexOf(
        'result.hostCommand?.command === "promoteStagedTagSuggestions"',
      ),
    );
    assert.notMatch(
      vocabularyEntryMutationRegion,
      /(?:getDefaultSynthesisService\(\)|\bservice\.|\.)(?:loadTagVocabulary|saveTagVocabulary)/,
    );
    assert.notMatch(
      workbench,
      /getDefaultSynthesisService\(\)\.getTopicReport/,
    );
    assert.notInclude(workbench, ".warmSynthesisWorkbenchSurfaces");
    const progressRefreshBlock = workbench.slice(
      workbench.indexOf("async function refreshWorkbenchCommandProgress"),
      workbench.indexOf("function runWorkbenchCommandOnce"),
    );
    assert.notInclude(progressRefreshBlock, ".getSynthesisBackgroundJobRows");

    const clientContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/client.ts"),
      "utf8",
    );
    const workbenchContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/workbench.ts"),
      "utf8",
    );
    const graphContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/graph.ts"),
      "utf8",
    );
    const referencesContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/references.ts"),
      "utf8",
    );
    const topicsContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/topics.ts"),
      "utf8",
    );
    const conceptsContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/concepts.ts"),
      "utf8",
    );
    const topicGraphContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/topicGraph.ts"),
      "utf8",
    );
    const tagsContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/tags.ts"),
      "utf8",
    );
    assert.include(topicsContract, "getTopicReport(");
    assert.include(topicsContract, "deleteTopicArtifact(");
    assert.include(topicsContract, "purgeDeletedTopicArtifacts()");
    assert.include(topicsContract, "rejectTopicDiscoveryHint(");
    assert.include(topicsContract, "restoreTopicDiscoveryHint(");
    assert.include(topicsContract, "SynthesisTopicArtifactDeleteRequest");
    assert.include(topicsContract, "SynthesisTopicDiscoveryHintRequest");
    assert.notMatch(
      topicsContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions/,
    );
    assert.notInclude(workbenchContract, "getTopicReport(");
    assert.include(workbenchContract, "readProgress()");
    assert.include(clientContract, "graph: SynthesisGraphClient");
    assert.include(graphContract, "recomputeCitationGraphLayout(");
    assert.include(graphContract, "rebuildCitationGraphCacheNow()");
    assert.include(graphContract, "refreshCitationGraphCacheIncrementalNow()");
    assert.include(graphContract, "retryCitationGraphCacheRebuild()");
    assert.notMatch(
      graphContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions/,
    );
    assert.include(clientContract, "references: SynthesisReferencesClient");
    assert.include(clientContract, "concepts: SynthesisConceptsClient");
    assert.include(clientContract, "topicGraph: SynthesisTopicGraphClient");
    assert.include(referencesContract, "refreshReferenceSidecarNow()");
    assert.include(referencesContract, "retryReferenceSidecarRefresh()");
    assert.include(referencesContract, "runAdvancedReferenceMatchingNow()");
    assert.include(referencesContract, "retryAdvancedReferenceMatching()");
    assert.include(referencesContract, "applyCanonicalRevisionReviewAction(");
    assert.include(referencesContract, "applyReferenceMatchProposalAction(");
    assert.include(referencesContract, "applyReferenceMatchProposalActions(");
    assert.include(referencesContract, "mergeEffectiveCanonicalReference(");
    assert.include(referencesContract, "applyCanonicalRevisionMergeRequests(");
    assert.include(referencesContract, "updateCanonicalReferenceMetadata(");
    assert.include(referencesContract, "archiveCanonicalReference(");
    assert.include(
      referencesContract,
      "SynthesisCanonicalReferenceMetadataPatch",
    );
    assert.include(referencesContract, '"manual_target"');
    assert.include(referencesContract, 'kind: "zotero_item"');
    assert.include(referencesContract, 'kind: "canonical_reference"');
    assert.notMatch(
      referencesContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions/,
    );
    assert.include(conceptsContract, "rebuildConceptKbIndex()");
    assert.include(conceptsContract, "updateConceptDisplayText(");
    assert.include(conceptsContract, "applyConceptReviewAction(");
    assert.include(conceptsContract, "deleteConceptEntries(");
    assert.include(conceptsContract, '"merge_into_existing"');
    assert.include(conceptsContract, "short_definition?: string");
    assert.notMatch(
      conceptsContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions/,
    );
    assert.include(topicGraphContract, "rebuildTopicGraphIndex()");
    assert.include(topicGraphContract, "acceptTopicGraphRelation(");
    assert.include(topicGraphContract, "rejectTopicGraphRelation(");
    assert.include(topicGraphContract, "applyTopicGraphReviewAction(");
    assert.include(topicGraphContract, '"approve_suggested"');
    assert.notMatch(
      topicGraphContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions/,
    );
    assert.include(clientContract, "tags: SynthesisTagsClient");
    assert.include(tagsContract, "validateTagVocabulary()");
    assert.include(tagsContract, "rebuildTagVocabularyIndex()");
    assert.include(tagsContract, "exportTagVocabularyForRegulator()");
    assert.include(tagsContract, "SynthesisTagSelectionRequest");
    assert.include(tagsContract, "SynthesisTagCommandResult");
    assert.include(tagsContract, "SynthesisStagedTagUpdateRequest");
    assert.include(tagsContract, "updateStagedTagSuggestion(");
    assert.include(tagsContract, "SynthesisTagVocabularyEntryUpdateRequest");
    assert.include(tagsContract, "SynthesisTagVocabularyEntryDeleteRequest");
    assert.include(tagsContract, "updateTagVocabularyEntry(");
    assert.include(tagsContract, "deleteTagVocabularyEntry(");
    assert.include(tagsContract, "promoteStagedTagSuggestions(");
    assert.include(tagsContract, "discardStagedTagSuggestions(");
    assert.include(tagsContract, "clearStagedTagSuggestions()");
    assert.notMatch(
      tagsContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions|clipboard/,
    );
    assert.notMatch(
      `${clientContract}\n${workbenchContract}`,
      /prewarm|warmSynthesis|onPhase|fullSnapshot/,
    );
  });

  it("records reviewable schema, canonical ownership, and bounded DTO fixtures [inv.runtime.single_production_owner]", function () {
    const schemaPath = path.join(FIXTURE_ROOT, "schema-baseline.json");
    const canonicalPath = path.join(FIXTURE_ROOT, "canonical-topic-tree.json");
    const dtoPath = path.join(FIXTURE_ROOT, "bounded-dto-baseline.json");
    for (const fixturePath of [schemaPath, canonicalPath, dtoPath]) {
      assert.isTrue(fs.existsSync(fixturePath), `${fixturePath} must exist`);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
    const dto = JSON.parse(fs.readFileSync(dtoPath, "utf8"));
    assert.equal(schema.database, "state/synthesis.db");
    assert.includeMembers(schema.tables, [
      "synt_operation",
      "synt_cache_basis",
      "synt_canonical_reference",
    ]);
    assert.equal(canonical.canonical_source, "topic_current_files");
    assert.equal(canonical.zotero_note_role, "mirror");
    assert.isAtMost(dto.reference_artifact_page.items.length, 50);
    assert.equal(dto.reference_artifact_page.page.limit, 50);
  });

  it("keeps active docs explicit about current process and Topic ownership", function () {
    const readme = fs.readFileSync(
      path.join(ROOT_DIR, "doc/synthesis-layer/README.md"),
      "utf8",
    );
    const storage = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "doc/synthesis-layer/library-ssot-and-sidecar-cache.md",
      ),
      "utf8",
    );
    const runtime = fs.readFileSync(
      path.join(ROOT_DIR, "doc/synthesis-layer/runtime-and-rebuild.md"),
      "utf8",
    );

    assert.include(readme, "Topic canonical current files are the SSOT");
    assert.include(
      storage,
      "| Topic canonical current files and source manifests |",
    );
    assert.include(storage, "| Zotero Topic note shards |");
    assert.notInclude(
      storage,
      "No external process requirement just to keep a local index current.",
    );
    assert.include(runtime, "The current implementation runs inside");
    assert.include(
      runtime,
      "synthesis_sidecar_service_stage1_refactor_plan_20260715.md",
    );
  });

  it("registers the migration-safe single-owner invariant", function () {
    const contract = parseYaml(
      fs.readFileSync(
        path.join(ROOT_DIR, "doc/synthesis-layer/contracts/invariants.yaml"),
        "utf8",
      ),
    ) as {
      invariants: Array<{
        id: string;
        test_refs?: Array<{ file: string; marker: string }>;
      }>;
    };
    const invariant = contract.invariants.find(
      (entry) => entry.id === "inv.runtime.single_production_owner",
    );
    assert.exists(invariant);
    assert.deepInclude(invariant?.test_refs || [], {
      file: "test/core/168-synthesis-sidecar-boundary.test.ts",
      marker: "[inv.runtime.single_production_owner]",
      kind: "static_guard",
    });
  });
});
