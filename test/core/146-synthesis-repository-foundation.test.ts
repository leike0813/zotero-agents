import { assert } from "chai";
import {
  createSynthesisRepository,
  getSynthesisRepositoryDatabasePath,
} from "../../src/modules/synthesis/repository";
import {
  SYNTHESIS_DATABASE_RESET_CONFIRMATION_TEXT,
  createSynthesisService,
  getDefaultSynthesisService,
  resetDefaultSynthesisServiceForTests,
} from "../../src/modules/synthesis/service";
import {
  PLUGIN_TASK_DOMAIN_ACP,
  exportPluginStateStoreRowsForTests,
  resetPluginStateStoreForTests,
  upsertPluginTaskRequestEntry,
} from "../../src/modules/pluginStateStore";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import {
  applySynthesisUiAction,
  createDefaultSynthesisUiState,
} from "../../src/modules/synthesis/uiModel";

describe("Synthesis repository foundation", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
    resetDefaultSynthesisServiceForTests();
  });

  afterEach(function () {
    resetPluginStateStoreForTests();
    resetDefaultSynthesisServiceForTests();
  });

  it("uses the shared local state database path", function () {
    assert.match(
      getSynthesisRepositoryDatabasePath("C:/runtime").replace(/\\/g, "/"),
      /C:\/runtime\/state\/zotero-agents\.db$/,
    );
  });

  it("binds the default service repository to the persistence root, not data root", function () {
    const runtimeRoot = "C:/zs-runtime-default-service";
    const previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    const previousServices = (globalThis as { Services?: unknown }).Services;
    const zotero = (globalThis as { Zotero?: any }).Zotero;
    const previousPathToFile = zotero?.File?.pathToFile;
    const openedPaths: string[] = [];

    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = runtimeRoot;
    if (zotero?.File) {
      zotero.File.pathToFile = (filePath: string) => ({
        path: filePath,
        parent: { exists: () => true },
      });
    }
    (globalThis as { Services?: unknown }).Services = {
      storage: {
        openDatabase(file: { path?: string }) {
          openedPaths.push(String(file?.path || ""));
          return {
            createStatement() {
              throw new Error("unexpected SQL during service construction");
            },
            executeSimpleSQL() {
              throw new Error(
                "unexpected transaction during service construction",
              );
            },
          };
        },
      },
    };

    try {
      getDefaultSynthesisService();
      const expected = getRuntimePersistencePaths(runtimeRoot)
        .stateDbPath.replace(/\\/g, "/")
        .toLowerCase();
      assert.equal(openedPaths[0].replace(/\\/g, "/").toLowerCase(), expected);
      assert.notInclude(openedPaths[0].replace(/\\/g, "/"), "/data/state/");
    } finally {
      if (previousRoot === undefined) {
        delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      } else {
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
      }
      if (zotero?.File && previousPathToFile) {
        zotero.File.pathToFile = previousPathToFile;
      }
      (globalThis as { Services?: unknown }).Services = previousServices;
      resetDefaultSynthesisServiceForTests();
    }
  });

  it("applies idempotent migrations and creates required tables and indexes", function () {
    const repository = createSynthesisRepository();

    repository.initialize();
    repository.migrate();

    const schema = repository.inspectSchema();
    const names = schema.map((entry) => entry.name);
    assert.includeMembers(names, [
      "synt_schema_meta",
      "synt_operation",
      "synt_cache_basis",
      "synt_review_item",
      "synt_artifact_sidecar",
      "synt_raw_reference",
      "synt_canonical_reference",
      "synt_canonical_reference_redirect",
      "synt_reference_binding",
      "synt_citation_node",
      "synt_citation_edge",
      "synt_citation_source_ownership",
      "synt_citation_incoming_group",
      "synt_citation_metrics_light",
      "synt_citation_metrics_complex",
      "synt_citation_layout_state",
      "synt_related_items_sync_effect",
      "synt_literature_matching_metadata",
      "synt_topic_interest_metadata",
      "synt_topic_discovery_hint",
      "synt_topic_graph_node",
      "synt_topic_graph_edge",
      "synt_topic_graph_review_item",
      "synt_concept",
      "synt_concept_sense",
      "synt_concept_alias",
      "synt_concept_relation",
      "synt_concept_review_item",
      "synt_topic_concept_link",
      "synt_tag_vocabulary_entry",
      "synt_tag_alias",
      "synt_tag_abbrev",
      "synt_tag_protocol",
      "synt_tag_validation_warning",
      "idx_synt_operation_type_status_updated",
      "idx_synt_cache_basis_kind_status",
      "idx_synt_artifact_sidecar_source",
      "idx_synt_artifact_sidecar_hash",
      "idx_synt_raw_reference_source",
      "idx_synt_raw_reference_canonical_status",
      "idx_synt_canonical_reference_title",
      "idx_synt_reference_binding_target",
      "idx_synt_reference_binding_canonical",
      "idx_synt_citation_edge_source_status",
      "idx_synt_citation_edge_target_status",
      "idx_synt_citation_source_owner_source",
      "idx_synt_citation_incoming_target",
      "idx_synt_citation_metrics_complex_status_foundation",
      "idx_synt_citation_layout_view_status",
      "idx_synt_related_items_sync_effect_status",
      "idx_synt_related_items_sync_effect_pair",
      "idx_synt_literature_matching_metadata_updated",
      "idx_synt_topic_interest_metadata_updated",
      "idx_synt_topic_discovery_hint_topic_status",
      "idx_synt_topic_discovery_hint_source_status",
      "idx_synt_topic_discovery_hint_updated",
      "idx_synt_topic_graph_node_type_updated",
      "idx_synt_topic_graph_edge_source_status",
      "idx_synt_topic_graph_edge_target_status",
      "idx_synt_topic_graph_review_status_updated",
      "idx_synt_concept_status_updated",
      "idx_synt_concept_type_domain",
      "idx_synt_concept_sense_concept",
      "idx_synt_concept_alias_normalized_status",
      "idx_synt_concept_relation_source_status",
      "idx_synt_concept_review_status_updated",
      "idx_synt_topic_concept_link_topic",
      "idx_synt_tag_vocabulary_facet_updated",
      "idx_synt_tag_alias_tag",
      "idx_synt_tag_abbrev_value",
      "idx_synt_tag_validation_severity",
      "idx_synt_review_item_priority_status",
    ]);
    assert.notIncludeMembers(names, [
      "synt_dirty_event",
      "synt_job_state",
      "synt_work_item",
      "synt_work_run",
      "synt_work_queue_meta",
      "synt_registry_basis_meta",
      "synt_registry_rebuild_run",
      ["synt", "literature", "item"].join("_"),
      ["synt", "literature", "identifier"].join("_"),
      ["synt", "zotero", "binding"].join("_"),
      ["synt", "literature", "redirect"].join("_"),
      ["synt", "artifact", "state"].join("_"),
      ["synt", "reference", "instance"].join("_"),
      ["synt", "reference", "resolution"].join("_"),
      ["synt", "reference", "binding", "decision"].join("_"),
    ]);
    assert.equal(
      repository.getSchemaVersion(),
      "2026-06-01.sidecar-cache-hard-cut",
    );
  });

  it("rolls back repository transactions on failure", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    assert.throws(
      () =>
        repository.transaction(() => {
          repository.upsertArtifactSidecar({
            sourceRef: "1:ROLLBACK",
            libraryId: 1,
            itemKey: "ROLLBACK",
            artifactType: "references",
            status: "available",
            artifactHash: "sha256:rollback",
          });
          throw new Error("force rollback");
        }),
      /force rollback/,
    );

    assert.equal(repository.countRows("synt_artifact_sidecar"), 0);
  });

  it("resets Synthesis runtime tables while preserving schema metadata and non-Synthesis state", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-28T00:00:00.000Z",
    });
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId: "request:keep",
      backendId: "backend:keep",
      state: "queued",
      updatedAt: "2026-05-28T00:00:00.000Z",
      payload: JSON.stringify({ keep: true }),
    });

    repository.upsertArtifactSidecar({
      sourceRef: "1:RESET",
      libraryId: 1,
      itemKey: "RESET",
      artifactType: "references",
      status: "available",
      artifactHash: "sha256:reset",
    });
    repository.upsertTopicGraphNode({
      topicId: "topic:reset",
      title: "Reset Topic",
      nodeType: "topic",
      definitionStatus: "active",
    });
    repository.replaceConceptKbState({
      concepts: [
        {
          conceptId: "concept:reset",
          label: "Reset Concept",
          type: "method",
          domain: "test",
          status: "active",
        },
      ],
      senses: [],
      aliases: [],
      relations: [],
      reviewItems: [],
      topicLinks: [],
    });
    repository.replaceTagVocabularyState({
      entries: [
        {
          tag: "field:reset",
          facet: "field",
          note: "Reset tag",
        },
      ],
      aliases: [],
      abbrevs: [],
      protocol: {
        protocolId: "default",
        version: "1.0.0",
        tagPattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
        maxTagLength: 120,
        facetsJson: JSON.stringify(["field"]),
      },
      validationWarnings: [],
    });
    repository.upsertReviewItem({
      reviewItemId: "review:reset",
      reviewKind: "cleanup",
      priority: 0,
      status: "open",
    });
    repository.upsertOperation({
      operationId: "operation:reset",
      operationType: "reference_sidecar_refresh",
      label: "Reset job",
      status: "running",
      processedCount: 1,
      totalCount: 2,
      progressMode: "determinate",
    });
    repository.upsertCacheBasis({
      cacheKey: "citation-graph:library",
      cacheKind: "citation_graph",
      scopeKind: "library",
      scopeRef: "1",
      status: "stale",
      basisKind: "test",
      basisValue: "reset",
    });
    repository.upsertCitationGraphLayoutState({
      layoutKey: "workbench_overview:balanced",
      viewKey: "workbench_overview",
      preset: "balanced",
      graphHash: "sha256:graph",
      status: "ready",
      layoutJson:
        '{"graph_hash":"sha256:graph","layout_engine":"d3-force","layout_version":1,"preset":"balanced","params":{"link_distance":80,"charge":-140,"collision_radius":8,"iterations":400},"nodes":{},"layout_hash":"sha256:layout"}',
      diagnosticsJson: "[]",
    });

    assert.equal(repository.countRows("synt_artifact_sidecar"), 1);
    assert.equal(repository.countRows("synt_topic_graph_node"), 1);
    assert.equal(repository.countRows("synt_concept"), 1);
    assert.equal(repository.countRows("synt_tag_vocabulary_entry"), 1);
    assert.equal(repository.countRows("synt_review_item"), 1);
    assert.equal(repository.countRows("synt_operation"), 1);
    assert.equal(repository.countRows("synt_cache_basis"), 1);
    assert.equal(repository.countRows("synt_citation_layout_state"), 1);

    const result = repository.resetSynthesisState();

    assert.deepInclude(result.deletedRowsByTable, {
      synt_artifact_sidecar: 1,
      synt_topic_graph_node: 1,
      synt_concept: 1,
      synt_tag_vocabulary_entry: 1,
      synt_review_item: 1,
      synt_operation: 1,
      synt_cache_basis: 1,
      synt_citation_layout_state: 1,
    });
    assert.equal(result.resetAt, "2026-05-28T00:00:00.000Z");
    assert.equal(repository.countRows("synt_artifact_sidecar"), 0);
    assert.equal(repository.countRows("synt_topic_graph_node"), 0);
    assert.equal(repository.countRows("synt_concept"), 0);
    assert.equal(repository.countRows("synt_tag_vocabulary_entry"), 0);
    assert.equal(repository.countRows("synt_review_item"), 0);
    assert.equal(repository.countRows("synt_operation"), 0);
    assert.equal(repository.countRows("synt_cache_basis"), 0);
    assert.equal(repository.countRows("synt_citation_layout_state"), 0);
    assert.equal(
      repository.getSchemaVersion(),
      "2026-06-01.sidecar-cache-hard-cut",
    );
    assert.include(
      repository.inspectSchema().map((entry) => entry.name),
      "synt_schema_meta",
    );
    assert.deepEqual(
      exportPluginStateStoreRowsForTests().requests.map(
        (row) => row.request_id,
      ),
      ["request:keep"],
    );
  });

  it("tracks explicit operation lifecycle rows", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-28T00:00:00.000Z",
    });

    repository.upsertOperation({
      operationId: "operation:test",
      operationType: "reference_sidecar_refresh",
      label: "Test job",
      status: "running",
      phase: "scan",
      phaseLabel: "Scanning",
      processedCount: 1,
      totalCount: 4,
      progressMode: "determinate",
    });

    assert.deepInclude(repository.listOperations()[0], {
      operationId: "operation:test",
      operationType: "reference_sidecar_refresh",
      label: "Test job",
      status: "running",
      phase: "scan",
      phaseLabel: "Scanning",
      processedCount: 1,
      totalCount: 4,
      progressMode: "determinate",
    });

    repository.updateOperationStatus({
      operationId: "operation:test",
      status: "completed",
      processedCount: 4,
      totalCount: 4,
    });

    assert.deepEqual(repository.listOperations(), []);
    assert.equal(
      repository.listOperations({ includeCompleted: true })[0]?.status,
      "completed",
    );

    repository.upsertOperation({
      operationId: "operation:failed",
      operationType: "citation_graph_refresh",
      label: "Failed operation",
      status: "running",
    });
    repository.updateOperationStatus({
      operationId: "operation:failed",
      status: "failed",
      message: "explicit failure",
    });
    assert.equal(
      repository.listOperations({ includeCompleted: true })[0]?.status,
      "failed",
    );
  });

  it("requires the reset confirmation phrase before service reset", async function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-28T00:00:00.000Z",
    });
    const service = createSynthesisService({
      root: "C:/synthesis-reset-service",
      runtimeRoot: "C:/synthesis-reset-service",
      libraryId: 1,
      now: () => "2026-05-28T00:00:00.000Z",
      synthesisRepository: repository,
    });
    repository.upsertArtifactSidecar({
      sourceRef: "1:SERVICE",
      libraryId: 1,
      itemKey: "SERVICE",
      artifactType: "references",
      status: "available",
      artifactHash: "sha256:service",
    });

    const rejected = await service.resetSynthesisDatabase({
      confirmationText: "RESET",
    });

    assert.deepInclude(rejected, {
      ok: false,
      status: "confirmation_mismatch",
    });
    assert.equal(repository.countRows("synt_artifact_sidecar"), 1);
    assert.deepInclude(
      await service.resetSynthesisDatabase({
        confirmationText: ` ${SYNTHESIS_DATABASE_RESET_CONFIRMATION_TEXT} `,
      }),
      {
        ok: false,
        status: "confirmation_mismatch",
      },
    );
    assert.equal(repository.countRows("synt_artifact_sidecar"), 1);

    const accepted = await service.resetSynthesisDatabase({
      confirmationText: SYNTHESIS_DATABASE_RESET_CONFIRMATION_TEXT,
    });

    assert.deepInclude(accepted, {
      ok: true,
      status: "reset",
      resetAt: "2026-05-28T00:00:00.000Z",
    });
    assert.equal(accepted.deletedRowsByTable?.synt_artifact_sidecar, 1);
    assert.equal(repository.countRows("synt_artifact_sidecar"), 0);
  });

  it("stores minimal topic discovery metadata contracts as typed rows", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.upsertLiteratureMatchingMetadata({
      literatureItemId: "lit:source",
      keyTermsJson: JSON.stringify(["transformer", "DETR", "transformer"]),
      methodsJson: JSON.stringify(["attention", "set prediction"]),
      problemsJson: JSON.stringify(["object detection"]),
      datasetsJson: JSON.stringify(["COCO"]),
      excludeTermsJson: JSON.stringify(["speech recognition"]),
      sourceArtifactHash: "sha256:digest",
      metadataHash: "sha256:literature-metadata",
      diagnosticsJson: JSON.stringify([{ code: "metadata_valid" }]),
    });
    repository.upsertTopicInterestMetadata({
      topicId: "topic:detection",
      includeTermsJson: JSON.stringify(["object detection", "transformer"]),
      mustHaveTermsJson: JSON.stringify(["detection"]),
      methodsJson: JSON.stringify(["attention"]),
      excludeTermsJson: JSON.stringify(["speech"]),
      seedLiteratureItemIdsJson: JSON.stringify(["lit:source"]),
      sourceArtifactHash: "sha256:topic",
      metadataHash: "sha256:topic-metadata",
    });

    const literature = repository.getLiteratureMatchingMetadata("lit:source");
    const topic = repository.getTopicInterestMetadata("topic:detection");

    assert.equal(repository.countRows("synt_literature_matching_metadata"), 1);
    assert.equal(repository.countRows("synt_topic_interest_metadata"), 1);
    assert.deepEqual(JSON.parse(literature?.keyTermsJson || "[]"), [
      "transformer",
      "DETR",
    ]);
    assert.deepInclude(literature, {
      literatureItemId: "lit:source",
      schemaId: "literature_matching_metadata.v1",
      metadataHash: "sha256:literature-metadata",
      updatedAt: "2026-05-26T00:00:00.000Z",
    });
    assert.deepEqual(JSON.parse(topic?.includeTermsJson || "[]"), [
      "object detection",
      "transformer",
    ]);
    assert.deepEqual(JSON.parse(topic?.seedLiteratureItemIdsJson || "[]"), [
      "lit:source",
    ]);
    assert.deepInclude(topic, {
      topicId: "topic:detection",
      schemaId: "topic_interest_metadata.v1",
      sourceArtifactHash: "sha256:topic",
    });
    assert.deepEqual(
      repository
        .listLiteratureMatchingMetadata({ literatureItemIds: ["lit:source"] })
        .map((entry) => entry.literatureItemId),
      ["lit:source"],
    );
    assert.deepEqual(
      repository
        .listTopicInterestMetadata({ topicIds: ["topic:detection"] })
        .map((entry) => entry.topicId),
      ["topic:detection"],
    );
    assert.deepEqual(exportPluginStateStoreRowsForTests().rows, []);
  });

  it("builds topic discovery hints as candidate-only state from metadata overlap [inv.discovery.apply_time_token_overlap]", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.upsertLiteratureMatchingMetadata({
      literatureItemId: "lit:candidate",
      keyTermsJson: JSON.stringify(["object detection", "DETR"]),
      methodsJson: JSON.stringify(["attention"]),
      problemsJson: JSON.stringify(["detection"]),
      datasetsJson: JSON.stringify(["COCO"]),
    });
    repository.upsertLiteratureMatchingMetadata({
      literatureItemId: "lit:seed",
      keyTermsJson: JSON.stringify(["object detection"]),
    });
    repository.upsertLiteratureMatchingMetadata({
      literatureItemId: "lit:excluded",
      keyTermsJson: JSON.stringify(["object detection", "speech"]),
    });
    repository.upsertTopicInterestMetadata({
      topicId: "topic:detection",
      includeTermsJson: JSON.stringify(["object detection", "DETR"]),
      mustHaveTermsJson: JSON.stringify(["detection"]),
      methodsJson: JSON.stringify(["attention"]),
      excludeTermsJson: JSON.stringify(["speech"]),
      seedLiteratureItemIdsJson: JSON.stringify(["lit:seed"]),
    });

    const result = repository.rebuildTopicDiscoveryHints({
      topicIds: ["topic:detection"],
    });
    const openHints = repository.listTopicDiscoveryHints({
      topicIds: ["topic:detection"],
      statuses: ["open"],
    });
    const allHints = repository.listTopicDiscoveryHints({
      topicIds: ["topic:detection"],
    });

    assert.equal(result.scannedTopics, 1);
    assert.equal(result.scannedLiterature, 3);
    assert.equal(result.open, 1);
    assert.equal(result.rejected, 0);
    assert.deepEqual(allHints.map((hint) => hint.literatureItemId).sort(), [
      "lit:candidate",
    ]);
    assert.deepEqual(
      openHints.map((hint) => hint.literatureItemId),
      ["lit:candidate"],
    );
    assert.isAbove(openHints[0].score, 0);
    assert.equal(openHints[0].method, "metadata-overlap-v1");
    assert.deepInclude(JSON.parse(openHints[0].matchingFieldsJson || "{}"), {
      missing_must_have_terms: [],
      exclude_hits: [],
    });
    assert.equal(repository.countRows("synt_topic_discovery_hint"), 1);
    assert.deepEqual(exportPluginStateStoreRowsForTests().rows, []);
  });

  it("normalizes legacy topic discovery statuses to reject-only lifecycle states [inv.discovery.apply_time_only]", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.upsertTopicDiscoveryHint({
      hintId: "hint:filtered",
      topicId: "topic:detection",
      literatureItemId: "lit:filtered",
      score: 1,
      status: "filtered",
    });
    repository.upsertTopicDiscoveryHint({
      hintId: "hint:accepted",
      topicId: "topic:detection",
      literatureItemId: "lit:accepted",
      score: 1,
      status: "accepted",
    });

    assert.deepEqual(
      repository
        .listTopicDiscoveryHints({ topicIds: ["topic:detection"] })
        .map((hint) => [hint.literatureItemId, hint.status])
        .sort(),
      [
        ["lit:accepted", "open"],
        ["lit:filtered", "rejected"],
      ],
    );
    assert.deepEqual(
      repository
        .listTopicDiscoveryHints({ statuses: ["filtered"] })
        .map((hint) => hint.literatureItemId),
      ["lit:filtered"],
    );
    assert.deepEqual(
      repository
        .listTopicDiscoveryHints({ statuses: ["accepted"] })
        .map((hint) => hint.literatureItemId),
      ["lit:accepted"],
    );
  });

  it("preserves rejected topic discovery hints during rebuild [inv.discovery.rejected_suppression]", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.upsertLiteratureMatchingMetadata({
      literatureItemId: "lit:candidate",
      keyTermsJson: JSON.stringify(["object detection", "DETR"]),
      methodsJson: JSON.stringify(["attention"]),
      problemsJson: JSON.stringify(["detection"]),
    });
    repository.upsertTopicInterestMetadata({
      topicId: "topic:detection",
      includeTermsJson: JSON.stringify(["object detection", "DETR"]),
      mustHaveTermsJson: JSON.stringify(["detection"]),
      methodsJson: JSON.stringify(["attention"]),
    });
    repository.upsertTopicDiscoveryHint({
      hintId: "hint:rejected",
      topicId: "topic:detection",
      literatureItemId: "lit:candidate",
      score: 0.5,
      status: "rejected",
      createdAt: "2026-05-25T00:00:00.000Z",
    });

    const result = repository.rebuildTopicDiscoveryHints({
      topicIds: ["topic:detection"],
      timestamp: "2026-05-26T00:00:00.000Z",
    });
    const hints = repository.listTopicDiscoveryHints({
      topicIds: ["topic:detection"],
    });

    assert.equal(result.open, 0);
    assert.equal(result.rejected, 1);
    assert.deepEqual(
      hints.map((hint) => [hint.hintId, hint.literatureItemId, hint.status]),
      [["hint:rejected", "lit:candidate", "rejected"]],
    );
    assert.equal(hints[0].createdAt, "2026-05-25T00:00:00.000Z");
  });

  it("rejects and restores topic discovery hints without accept actions", async function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });
    const service = createSynthesisService({
      root: "C:/zs-topic-discovery-hints",
      libraryId: 1,
      synthesisRepository: repository,
      now: () => "2026-05-26T00:00:00.000Z",
    });
    repository.upsertTopicDiscoveryHint({
      hintId: "hint:reject-restore",
      topicId: "topic:detection",
      literatureItemId: "lit:candidate",
      score: 1,
      status: "open",
      createdAt: "2026-05-25T00:00:00.000Z",
    });

    const rejected = await service.rejectTopicDiscoveryHint({
      hintId: "hint:reject-restore",
    });
    const restored = await service.restoreTopicDiscoveryHint({
      hintId: "hint:reject-restore",
    });
    const rejectCommand = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "rejectTopicDiscoveryHint",
          args: { hintId: "hint:reject-restore" },
        },
      },
    );
    const restoreCommand = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "restoreTopicDiscoveryHint",
          args: { hintId: "hint:reject-restore" },
        },
      },
    );
    const invalidAccept = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "acceptTopicDiscoveryHint",
          args: { hintId: "hint:reject-restore" },
        },
      },
    );

    assert.isTrue(rejected.ok);
    assert.equal(rejected.hint?.status, "rejected");
    assert.isTrue(restored.ok);
    assert.equal(restored.hint?.status, "open");
    assert.equal(
      rejectCommand.hostCommand?.command,
      "rejectTopicDiscoveryHint",
    );
    assert.equal(rejectCommand.hostCommand?.args.hintId, "hint:reject-restore");
    assert.equal(
      restoreCommand.hostCommand?.command,
      "restoreTopicDiscoveryHint",
    );
    assert.isFalse(invalidAccept.handled);
    assert.equal(invalidAccept.reason, "unknown_host_command");
  });

  it("stores topic graph nodes, edges, and review items as runtime DB state", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.replaceTopicGraphState({
      nodes: [
        {
          topicId: "topic-a",
          title: "Alpha",
          aliasesJson: JSON.stringify(["A"]),
          nodeType: "materialized",
          definitionStatus: "has_synthesis",
          isRoot: true,
        },
        {
          topicId: "topic-b",
          title: "Beta",
          nodeType: "placeholder",
          definitionStatus: "placeholder",
        },
      ],
      edges: [
        {
          edgeId: "edge:related_to:topic-a:topic-b",
          sourceTopicId: "topic-a",
          targetTopicId: "topic-b",
          relation: "related_to",
          status: "suggested",
          provenanceJson: JSON.stringify([{ source: "test" }]),
        },
      ],
      reviewItems: [
        {
          reviewId: "review:related_to:topic-a:topic-b",
          status: "open",
          sourceTopicId: "topic-a",
          targetTopicId: "topic-b",
          relation: "related_to",
          evidenceRefsJson: JSON.stringify([{ section: "taxonomy" }]),
        },
      ],
    });

    assert.deepEqual(
      repository.listTopicGraphNodes().map((row) => row.topicId),
      ["topic-a", "topic-b"],
    );
    assert.equal(repository.listTopicGraphEdges()[0]?.status, "suggested");
    assert.deepEqual(
      repository
        .listTopicGraphReviewItems({ statuses: ["open"] })
        .map((row) => row.reviewId),
      ["review:related_to:topic-a:topic-b"],
    );
  });

  it("stores Concept KB records, review items, and topic links as runtime DB state", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.replaceConceptKbState({
      concepts: [
        {
          conceptId: "concept:cv:detr",
          label: "DETR",
          aliasesJson: JSON.stringify(["DETR", "DEtection TRansformer"]),
          conceptType: "model",
          domain: "computer vision",
          status: "active",
          senseIdsJson: JSON.stringify(["sense:cv:detr"]),
        },
      ],
      senses: [
        {
          senseId: "sense:cv:detr",
          conceptId: "concept:cv:detr",
          label: "DETR",
          aliasesJson: JSON.stringify(["DETR"]),
          domain: "computer vision",
          confidence: "high",
          sourceTopicIdsJson: JSON.stringify(["object-detection"]),
          evidenceJson: JSON.stringify([{ section: "taxonomy" }]),
        },
      ],
      aliases: [
        {
          aliasId: "alias:detr",
          alias: "DETR",
          normalized: "detr",
          conceptId: "concept:cv:detr",
          senseId: "sense:cv:detr",
          status: "active",
          confidence: "high",
        },
      ],
      relations: [
        {
          relationId: "relation:uses:concept:cv:detr:concept:cv:transformer",
          sourceConceptId: "concept:cv:detr",
          targetConceptId: "concept:cv:transformer",
          relation: "uses",
          status: "suggested",
          confidence: "medium",
          provenanceJson: JSON.stringify([{ source: "test" }]),
        },
      ],
      reviewItems: [
        {
          reviewId: "review:low:weak",
          status: "open",
          reason: "low_confidence_concept",
          topicId: "object-detection",
          topicPathId: "object-detection",
          label: "Weak Candidate",
          confidence: "low",
          candidateConceptIdsJson: JSON.stringify([]),
          proposalJson: JSON.stringify({ label: "Weak Candidate" }),
        },
      ],
      topicLinks: [
        {
          topicId: "object-detection",
          conceptId: "concept:cv:detr",
          senseId: "sense:cv:detr",
          label: "DETR",
          confidence: "high",
          source: "topic_synthesis_concept_cards",
        },
      ],
    });

    assert.equal(repository.countRows("synt_concept"), 1);
    assert.equal(repository.countRows("synt_concept_sense"), 1);
    assert.equal(repository.countRows("synt_concept_alias"), 1);
    assert.equal(repository.countRows("synt_concept_relation"), 1);
    assert.equal(repository.countRows("synt_concept_review_item"), 1);
    assert.equal(repository.countRows("synt_topic_concept_link"), 1);
    assert.deepInclude(repository.listConcepts()[0], {
      conceptId: "concept:cv:detr",
      label: "DETR",
      status: "active",
    });
    assert.deepEqual(
      JSON.parse(repository.listConceptSenses()[0]?.sourceTopicIdsJson || "[]"),
      ["object-detection"],
    );
    assert.deepEqual(
      repository
        .listTopicConceptLinks({ topicIds: ["object-detection"] })
        .map((row) => row.conceptId),
      ["concept:cv:detr"],
    );
    assert.deepEqual(
      repository
        .listConceptReviewItems({ statuses: ["open"] })
        .map((row) => row.reviewId),
      ["review:low:weak"],
    );
  });

  it("stores Tag Vocabulary rows, aliases, abbrevs, protocol, and validation state as runtime DB state", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.replaceTagVocabularyState({
      entries: [
        {
          tag: "field:object_detection",
          facet: "field",
          note: "Object detection",
          source: "manual",
          aliasesJson: JSON.stringify(["detection"]),
          abbrevJson: JSON.stringify(["OD"]),
          usageCount: 2,
        },
        {
          tag: "status:deprecated_sample",
          facet: "status",
          deprecated: true,
          replacement: "status:active_sample",
        },
      ],
      aliases: [
        {
          alias: "detection",
          tag: "field:object_detection",
        },
      ],
      abbrevs: [
        {
          abbrevKey: "od",
          abbrevValue: "OD",
        },
      ],
      protocol: {
        protocolId: "default",
        version: "1.0.0",
        tagPattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
        maxTagLength: 120,
        facetsJson: JSON.stringify(["field", "status"]),
      },
      validationWarnings: [
        {
          warningId: "tag-warning:missing-replacement",
          code: "missing_replacement",
          severity: "warning",
          tag: "status:deprecated_sample",
          message: "replacement missing",
        },
      ],
    });

    assert.equal(repository.countRows("synt_tag_vocabulary_entry"), 2);
    assert.equal(repository.countRows("synt_tag_alias"), 1);
    assert.equal(repository.countRows("synt_tag_abbrev"), 1);
    assert.equal(repository.countRows("synt_tag_protocol"), 1);
    assert.equal(repository.countRows("synt_tag_validation_warning"), 1);
    assert.deepEqual(
      repository.listTagVocabularyEntries().map((row) => row.tag),
      ["field:object_detection", "status:deprecated_sample"],
    );
    assert.equal(repository.listTagAbbrevs()[0]?.abbrevValue, "OD");
    assert.deepInclude(repository.getTagProtocol(), {
      protocolId: "default",
      maxTagLength: 120,
    });
    assert.deepEqual(
      repository.listTagValidationWarnings().map((row) => row.code),
      ["missing_replacement"],
    );
  });

  it("normalizes bounded pagination input", function () {
    const repository = createSynthesisRepository();

    assert.deepEqual(
      repository.paginate({
        cursor: "-1",
        limit: "999",
        defaultLimit: 25,
        maxLimit: 50,
      }),
      {
        cursor: 0,
        limit: 50,
        nextCursor: 50,
      },
    );
  });

  it("persists citation graph structure ownership and lightweight metrics", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.replaceCitationGraphState({
      nodes: [
        {
          literatureItemId: "lit:source",
          nodeStatus: "active",
          hasZoteroBinding: true,
          title: "Source Paper",
          year: "2024",
          summaryJson: JSON.stringify({ references_count: 1 }),
          updatedAt: "2026-05-26T00:00:00.000Z",
        },
        {
          literatureItemId: "lit:target",
          nodeStatus: "active",
          hasZoteroBinding: false,
          title: "Target Paper",
          year: "2023",
          summaryJson: "{}",
          updatedAt: "2026-05-26T00:00:00.000Z",
        },
      ],
      edges: [
        {
          edgeId: "edge:source-ref-1",
          sourceLiteratureItemId: "lit:source",
          targetLiteratureItemId: "lit:target",
          referenceInstanceId: "ref:1",
          resolutionId: "resolution:1",
          edgeStatus: "accepted",
          rolesJson: JSON.stringify([{ role: "background", count: 1 }]),
          weight: 1,
          createdAt: "2026-05-26T00:00:00.000Z",
          updatedAt: "2026-05-26T00:00:00.000Z",
        },
      ],
      sourceOwnership: [
        {
          sourceLiteratureItemId: "lit:source",
          edgeId: "edge:source-ref-1",
          referenceInstanceId: "ref:1",
          targetLiteratureItemId: "lit:target",
          edgeStatus: "accepted",
          updatedAt: "2026-05-26T00:00:00.000Z",
        },
      ],
      incomingGroups: [
        {
          targetLiteratureItemId: "lit:target",
          sourceLiteratureItemId: "lit:source",
          edgeId: "edge:source-ref-1",
          referenceInstanceId: "ref:1",
          edgeStatus: "accepted",
          updatedAt: "2026-05-26T00:00:00.000Z",
        },
      ],
      lightweightMetrics: [
        {
          literatureItemId: "lit:source",
          outgoingCount: 1,
          incomingCount: 0,
          matchedOutgoingCount: 1,
          unresolvedOutgoingCount: 0,
          ambiguousOutgoingCount: 0,
          localDegree: 1,
          sourceStructureVersion: 1,
          updatedAt: "2026-05-26T00:00:00.000Z",
        },
        {
          literatureItemId: "lit:target",
          outgoingCount: 0,
          incomingCount: 1,
          matchedOutgoingCount: 0,
          unresolvedOutgoingCount: 0,
          ambiguousOutgoingCount: 0,
          localDegree: 1,
          sourceStructureVersion: 1,
          updatedAt: "2026-05-26T00:00:00.000Z",
        },
      ],
    });

    assert.equal(repository.countRows("synt_citation_node"), 2);
    assert.equal(repository.countRows("synt_citation_edge"), 1);
    assert.equal(repository.countRows("synt_citation_source_ownership"), 1);
    assert.equal(repository.countRows("synt_citation_incoming_group"), 1);
    assert.equal(repository.countRows("synt_citation_metrics_light"), 2);
    assert.deepInclude(repository.listCitationNodes()[0], {
      literatureItemId: "lit:source",
      nodeStatus: "active",
      hasZoteroBinding: true,
      title: "Source Paper",
    });
    assert.deepInclude(repository.listCitationEdges()[0], {
      edgeId: "edge:source-ref-1",
      sourceLiteratureItemId: "lit:source",
      targetLiteratureItemId: "lit:target",
      referenceInstanceId: "ref:1",
      edgeStatus: "accepted",
      weight: 1,
    });
    assert.deepInclude(repository.listCitationLightMetrics()[1], {
      literatureItemId: "lit:target",
      incomingCount: 1,
      localDegree: 1,
      sourceStructureVersion: 1,
    });
  });

});
