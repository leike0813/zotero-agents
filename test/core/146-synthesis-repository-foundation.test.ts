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
      "synt_dirty_event",
      "synt_job_state",
      "synt_review_item",
      "synt_literature_item",
      "synt_literature_identifier",
      "synt_zotero_binding",
      "synt_literature_redirect",
      "synt_artifact_state",
      "synt_reference_instance",
      "synt_reference_resolution",
      "synt_citation_node",
      "synt_citation_edge",
      "synt_citation_source_ownership",
      "synt_citation_incoming_group",
      "synt_citation_metrics_light",
      "synt_citation_metrics_complex",
      "synt_citation_layout_state",
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
      "idx_synt_literature_item_status_updated",
      "idx_synt_literature_identifier_kind_value",
      "idx_synt_zotero_binding_literature_status",
      "idx_synt_literature_redirect_from",
      "idx_synt_reference_instance_source",
      "idx_synt_reference_resolution_target_status",
      "idx_synt_citation_edge_source_status",
      "idx_synt_citation_edge_target_status",
      "idx_synt_citation_source_owner_source",
      "idx_synt_citation_incoming_target",
      "idx_synt_citation_metrics_complex_status_foundation",
      "idx_synt_citation_layout_view_status",
      "idx_synt_literature_matching_metadata_updated",
      "idx_synt_topic_interest_metadata_updated",
      "idx_synt_topic_discovery_hint_topic_status",
      "idx_synt_topic_discovery_hint_literature_status",
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
      "idx_synt_dirty_event_status_retry",
      "idx_synt_job_state_status_updated",
    ]);
    assert.match(
      repository.getSchemaVersion(),
      /^2026-05-29\.phase7-workbench-db-ui$/,
    );
  });

  it("rolls back repository transactions on failure", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    assert.throws(
      () =>
        repository.transaction(() => {
          repository.upsertLiteratureItem({
            literatureItemId: "lit:rollback",
            displayTitle: "Rollback Paper",
            normalizedTitle: "rollback paper",
            titleNormalizerVersion: "deterministic-v1",
            createdFrom: "test",
          });
          throw new Error("force rollback");
        }),
      /force rollback/,
    );

    assert.isNull(repository.getLiteratureItem("lit:rollback"));
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

    repository.upsertLiteratureItem({
      literatureItemId: "lit:reset",
      displayTitle: "Reset Candidate",
      normalizedTitle: "reset candidate",
      titleNormalizerVersion: "deterministic-v1",
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
    repository.upsertDirtyEvent({
      eventId: "dirty:reset",
      eventType: "reset-test",
      status: "queued",
    });
    repository.upsertJobProgress({
      jobName: "synthesis:reset-job",
      source: "update_queue",
      label: "Reset job",
      status: "running",
      processedCount: 1,
      totalCount: 2,
      progressMode: "determinate",
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

    assert.equal(repository.countRows("synt_literature_item"), 1);
    assert.equal(repository.countRows("synt_topic_graph_node"), 1);
    assert.equal(repository.countRows("synt_concept"), 1);
    assert.equal(repository.countRows("synt_tag_vocabulary_entry"), 1);
    assert.equal(repository.countRows("synt_review_item"), 1);
    assert.equal(repository.countRows("synt_dirty_event"), 1);
    assert.equal(repository.countRows("synt_job_state"), 1);
    assert.equal(repository.countRows("synt_citation_layout_state"), 1);

    const result = repository.resetSynthesisState();

    assert.deepInclude(result.deletedRowsByTable, {
      synt_literature_item: 1,
      synt_topic_graph_node: 1,
      synt_concept: 1,
      synt_tag_vocabulary_entry: 1,
      synt_review_item: 1,
      synt_dirty_event: 1,
      synt_job_state: 1,
      synt_citation_layout_state: 1,
    });
    assert.equal(result.resetAt, "2026-05-28T00:00:00.000Z");
    assert.equal(repository.countRows("synt_literature_item"), 0);
    assert.equal(repository.countRows("synt_topic_graph_node"), 0);
    assert.equal(repository.countRows("synt_concept"), 0);
    assert.equal(repository.countRows("synt_tag_vocabulary_entry"), 0);
    assert.equal(repository.countRows("synt_review_item"), 0);
    assert.equal(repository.countRows("synt_dirty_event"), 0);
    assert.equal(repository.countRows("synt_job_state"), 0);
    assert.equal(repository.countRows("synt_citation_layout_state"), 0);
    assert.equal(
      repository.getSchemaVersion(),
      "2026-05-29.phase7-workbench-db-ui",
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

  it("tracks Synthesis job progress lifecycle rows", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-28T00:00:00.000Z",
    });

    repository.upsertJobProgress({
      jobName: "synthesis:test-job",
      runId: "run:1",
      source: "update_queue",
      label: "Test job",
      status: "running",
      phase: "scan",
      phaseLabel: "Scanning",
      processedCount: 1,
      totalCount: 4,
      progressMode: "determinate",
    });

    assert.deepInclude(repository.listActiveJobProgress()[0], {
      jobName: "synthesis:test-job",
      runId: "run:1",
      source: "update_queue",
      label: "Test job",
      status: "running",
      phase: "scan",
      phaseLabel: "Scanning",
      processedCount: 1,
      totalCount: 4,
      progressMode: "determinate",
    });

    repository.completeJobProgress({
      jobName: "synthesis:test-job",
      runId: "run:1",
      source: "update_queue",
      label: "Test job",
      processedCount: 4,
      totalCount: 4,
      progressMode: "determinate",
    });

    assert.deepEqual(repository.listActiveJobProgress(), []);
    assert.equal(
      repository.listActiveJobProgress({ includeCompleted: true })[0]?.status,
      "completed",
    );

    repository.upsertJobProgress({
      jobName: "synthesis:stale-job",
      source: "update_queue",
      label: "Stale job",
      status: "running",
      heartbeatAt: "2026-05-27T00:00:00.000Z",
    });

    const stale = repository.clearStaleJobProgress({
      staleBefore: "2026-05-28T00:00:00.000Z",
    });

    assert.deepEqual(
      stale.map((row) => row.jobName),
      ["synthesis:stale-job"],
    );
    assert.equal(
      repository
        .listActiveJobProgress()
        .find((row) => row.jobName === "synthesis:stale-job")?.status,
      "failed_retryable",
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
    repository.upsertLiteratureItem({
      literatureItemId: "lit:service-reset",
      displayTitle: "Service Reset",
      normalizedTitle: "service reset",
      titleNormalizerVersion: "deterministic-v1",
    });

    const rejected = await service.resetSynthesisDatabase({
      confirmationText: "RESET",
    });

    assert.deepInclude(rejected, {
      ok: false,
      status: "confirmation_mismatch",
    });
    assert.equal(repository.countRows("synt_literature_item"), 1);
    assert.deepInclude(
      await service.resetSynthesisDatabase({
        confirmationText: ` ${SYNTHESIS_DATABASE_RESET_CONFIRMATION_TEXT} `,
      }),
      {
        ok: false,
        status: "confirmation_mismatch",
      },
    );
    assert.equal(repository.countRows("synt_literature_item"), 1);

    const accepted = await service.resetSynthesisDatabase({
      confirmationText: SYNTHESIS_DATABASE_RESET_CONFIRMATION_TEXT,
    });

    assert.deepInclude(accepted, {
      ok: true,
      status: "reset",
      resetAt: "2026-05-28T00:00:00.000Z",
    });
    assert.equal(accepted.deletedRowsByTable?.synt_literature_item, 1);
    assert.equal(repository.countRows("synt_literature_item"), 0);
  });

  it("stores typed Synthesis rows without plugin_task_rows payload_json", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.upsertLiteratureItem({
      literatureItemId: "lit:item",
      displayTitle: "Deformable DETR",
      normalizedTitle: "deformable detr",
      titleNormalizerVersion: "deterministic-v1",
      year: "2021",
      authorsJson: JSON.stringify(["Zhu"]),
      status: "active",
      createdFrom: "zotero-binding",
      confidence: "deterministic",
    });

    assert.deepInclude(repository.getLiteratureItem("lit:item"), {
      literatureItemId: "lit:item",
      displayTitle: "Deformable DETR",
      normalizedTitle: "deformable detr",
      titleNormalizerVersion: "deterministic-v1",
      status: "active",
      createdFrom: "zotero-binding",
    });
    assert.deepEqual(exportPluginStateStoreRowsForTests().rows, []);
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

  it("builds topic discovery hints as candidate-only state from metadata overlap", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.upsertLiteratureItem({
      literatureItemId: "lit:candidate",
      displayTitle: "Deformable DETR for Object Detection",
      normalizedTitle: "deformable detr for object detection",
      titleNormalizerVersion: "deterministic-v1",
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
    assert.equal(result.filtered, 1);
    assert.deepEqual(allHints.map((hint) => hint.literatureItemId).sort(), [
      "lit:candidate",
      "lit:excluded",
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
    assert.equal(repository.countRows("synt_topic_discovery_hint"), 2);
    assert.deepEqual(exportPluginStateStoreRowsForTests().rows, []);
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
          edgeStatus: "matched",
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
          edgeStatus: "matched",
          updatedAt: "2026-05-26T00:00:00.000Z",
        },
      ],
      incomingGroups: [
        {
          targetLiteratureItemId: "lit:target",
          sourceLiteratureItemId: "lit:source",
          edgeId: "edge:source-ref-1",
          referenceInstanceId: "ref:1",
          edgeStatus: "matched",
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
      edgeStatus: "matched",
      weight: 1,
    });
    assert.deepInclude(repository.listCitationLightMetrics()[1], {
      literatureItemId: "lit:target",
      incomingCount: 1,
      localDegree: 1,
      sourceStructureVersion: 1,
    });
  });

  it("synchronously projects Index state into citation structure and lightweight metrics", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.replaceIndexState({
      literatureItems: [
        {
          literatureItemId: "lit:source",
          displayTitle: "Source Paper",
          normalizedTitle: "source paper",
          titleNormalizerVersion: "deterministic-v1",
          status: "active",
        },
        {
          literatureItemId: "lit:target",
          displayTitle: "Target Paper",
          normalizedTitle: "target paper",
          titleNormalizerVersion: "deterministic-v1",
          status: "active",
        },
      ],
      zoteroBindings: [
        {
          libraryId: 1,
          itemKey: "SRC",
          literatureItemId: "lit:source",
          bindingStatus: "active",
        },
      ],
      referenceInstances: [
        {
          referenceInstanceId: "ref:matched",
          sourceLiteratureItemId: "lit:source",
          referenceIndex: 0,
        },
        {
          referenceInstanceId: "ref:unresolved",
          sourceLiteratureItemId: "lit:source",
          referenceIndex: 1,
        },
      ],
      referenceResolutions: [
        {
          resolutionId: "resolution:matched",
          referenceInstanceId: "ref:matched",
          sourceLiteratureItemId: "lit:source",
          targetLiteratureItemId: "lit:target",
          status: "matched",
        },
        {
          resolutionId: "resolution:unresolved",
          referenceInstanceId: "ref:unresolved",
          sourceLiteratureItemId: "lit:source",
          status: "unresolved",
        },
      ],
    });

    assert.sameMembers(
      repository.listCitationNodes().map((entry) => entry.literatureItemId),
      ["lit:source", "lit:target"],
    );
    assert.deepInclude(repository.listCitationNodes()[0], {
      literatureItemId: "lit:source",
      hasZoteroBinding: true,
    });
    assert.deepInclude(
      repository
        .listCitationEdges()
        .find((entry) => entry.referenceInstanceId === "ref:matched"),
      {
        sourceLiteratureItemId: "lit:source",
        targetLiteratureItemId: "lit:target",
        edgeStatus: "matched",
      },
    );
    assert.deepInclude(
      repository
        .listCitationEdges()
        .find((entry) => entry.referenceInstanceId === "ref:unresolved"),
      {
        sourceLiteratureItemId: "lit:source",
        edgeStatus: "unresolved",
      },
    );
    assert.deepInclude(
      repository
        .listCitationLightMetrics()
        .find((entry) => entry.literatureItemId === "lit:source"),
      {
        outgoingCount: 2,
        incomingCount: 0,
        matchedOutgoingCount: 1,
        unresolvedOutgoingCount: 1,
        localDegree: 2,
      },
    );
    assert.deepInclude(
      repository
        .listCitationLightMetrics()
        .find((entry) => entry.literatureItemId === "lit:target"),
      {
        outgoingCount: 0,
        incomingCount: 1,
        localDegree: 1,
      },
    );
  });

  it("applies Zotero deletion review actions and supersedes dependent reference reviews", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.upsertLiteratureItem({
      literatureItemId: "lit:deleted",
      displayTitle: "Deleted Paper",
      normalizedTitle: "deleted paper",
      titleNormalizerVersion: "deterministic-v1",
      status: "pending_delete_review",
    });
    repository.upsertZoteroBinding({
      libraryId: 1,
      itemKey: "AAA",
      literatureItemId: "lit:deleted",
      bindingStatus: "pending_delete_review",
    });
    repository.upsertArtifactState({
      literatureItemId: "lit:deleted",
      artifactType: "digest",
      status: "available",
    });
    repository.upsertReferenceInstance({
      referenceInstanceId: "ref:deleted-source",
      sourceLiteratureItemId: "lit:deleted",
      referenceIndex: 0,
    });
    repository.upsertReviewItem({
      reviewItemId: "review:p0-delete",
      reviewKind: "zotero_item_delete",
      priority: 0,
      status: "open",
      scopeKind: "zotero_binding",
      scopeRef: "1:AAA",
      payloadJson: JSON.stringify({ literature_item_id: "lit:deleted" }),
    });
    repository.upsertReviewItem({
      reviewItemId: "review:p1-ref",
      reviewKind: "reference_resolution",
      priority: 1,
      status: "blocked_by_upstream_review",
      scopeKind: "reference_instance",
      scopeRef: "ref:deleted-source",
      blockedByReviewItemId: "review:p0-delete",
      payloadJson: JSON.stringify({
        target_literature_item_id: "lit:target",
      }),
    });

    const result = repository.applyIndexReviewAction({
      reviewItemId: "review:p0-delete",
      action: "confirm_delete_item",
    });

    assert.deepEqual(result.indexSummary.affectedLiteratureItemIds, [
      "lit:deleted",
    ]);
    assert.deepEqual(result.indexSummary.affectedReferenceInstanceIds, [
      "ref:deleted-source",
    ]);
    assert.deepEqual(
      result.graphDirtyEffects.map((entry) => entry.eventType),
      ["citation_graph_structure_dirty"],
    );
    assert.include(
      result.diagnostics.map((entry) => entry.code),
      "index_summary_updated",
    );
    assert.equal(
      repository.listZoteroBindings()[0]?.bindingStatus,
      "deleted_confirmed",
    );
    assert.equal(
      repository.getLiteratureItem("lit:deleted")?.status,
      "unavailable",
    );
    assert.equal(repository.listArtifactStates()[0]?.status, "unavailable");
    assert.equal(
      repository
        .listReviewItems()
        .find((row) => row.reviewItemId === "review:p1-ref")?.status,
      "superseded",
    );
    assert.sameMembers(
      repository.listDirtyEvents().map((entry) => entry.eventType),
      ["index_review_action", "citation_graph_structure_dirty"],
    );
    assert.include(
      JSON.parse(
        repository.listDirtyEvents({ eventTypes: ["index_review_action"] })[0]
          ?.diagnosticsJson || "[]",
      ).map((entry: any) => entry.code),
      "index_review_action_applied",
    );
  });

  it("applies Zotero dedupe merge actions and retargets dependent reference reviews", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    for (const [id, title] of [
      ["lit:old", "Old Binding"],
      ["lit:survivor", "Survivor Binding"],
      ["lit:source", "Source Paper"],
    ]) {
      repository.upsertLiteratureItem({
        literatureItemId: id,
        displayTitle: title,
        normalizedTitle: title.toLowerCase(),
        titleNormalizerVersion: "deterministic-v1",
        status: "active",
      });
    }
    repository.upsertZoteroBinding({
      libraryId: 1,
      itemKey: "OLD",
      literatureItemId: "lit:old",
      bindingStatus: "active",
    });
    repository.upsertZoteroBinding({
      libraryId: 1,
      itemKey: "SURVIVE",
      literatureItemId: "lit:survivor",
      bindingStatus: "active",
    });
    repository.upsertReferenceInstance({
      referenceInstanceId: "ref:target-old",
      sourceLiteratureItemId: "lit:source",
      referenceIndex: 0,
    });
    repository.upsertReferenceResolution({
      resolutionId: "resolution:target-old",
      referenceInstanceId: "ref:target-old",
      sourceLiteratureItemId: "lit:source",
      targetLiteratureItemId: "lit:old",
      status: "matched",
    });
    repository.upsertReviewItem({
      reviewItemId: "review:p0-dedupe",
      reviewKind: "zotero_dedupe_candidate",
      priority: 0,
      status: "open",
      scopeKind: "identifier",
      scopeRef: "doi:10.1000/x",
      payloadJson: JSON.stringify({
        literature_item_id: "lit:old",
        surviving_literature_item_id: "lit:survivor",
      }),
    });
    repository.upsertReviewItem({
      reviewItemId: "review:p1-target",
      reviewKind: "reference_resolution",
      priority: 1,
      status: "blocked_by_upstream_review",
      scopeKind: "reference_instance",
      scopeRef: "ref:target-old",
      blockedByReviewItemId: "review:p0-dedupe",
      payloadJson: JSON.stringify({
        target_literature_item_id: "lit:old",
      }),
    });

    const result = repository.applyIndexReviewAction({
      reviewItemId: "review:p0-dedupe",
      action: "mark_as_dedupe_merge",
    });

    assert.deepEqual(result.indexSummary.affectedLiteratureItemIds, [
      "lit:old",
      "lit:survivor",
    ]);
    assert.sameMembers(
      result.graphDirtyEffects.map((entry) => entry.scopeRef),
      ["ref:target-old"],
    );
    assert.equal(repository.countRows("synt_literature_redirect"), 1);
    assert.equal(repository.getLiteratureItem("lit:old")?.status, "tombstoned");
    assert.equal(
      repository.listReferenceResolutions()[0]?.targetLiteratureItemId,
      "lit:survivor",
    );
    assert.deepInclude(repository.listCitationEdges()[0], {
      referenceInstanceId: "ref:target-old",
      targetLiteratureItemId: "lit:survivor",
      edgeStatus: "matched",
    });
    assert.deepInclude(
      repository
        .listCitationLightMetrics()
        .find((entry) => entry.literatureItemId === "lit:survivor"),
      {
        incomingCount: 1,
        localDegree: 1,
      },
    );
    const p1 = repository
      .listReviewItems()
      .find((row) => row.reviewItemId === "review:p1-target");
    assert.equal(p1?.status, "open");
    assert.equal(
      JSON.parse(p1?.payloadJson || "{}").target_literature_item_id,
      "lit:survivor",
    );
    assert.sameMembers(
      repository.listDirtyEvents().map((entry) => entry.eventType),
      ["index_review_action", "citation_graph_structure_dirty"],
    );
  });

  it("rolls back index review action domain facts, dirty effects, and diagnostics together", function () {
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });

    repository.upsertLiteratureItem({
      literatureItemId: "lit:old",
      displayTitle: "Old Binding",
      normalizedTitle: "old binding",
      titleNormalizerVersion: "deterministic-v1",
      status: "active",
    });
    repository.upsertLiteratureItem({
      literatureItemId: "lit:inactive-target",
      displayTitle: "Inactive Target",
      normalizedTitle: "inactive target",
      titleNormalizerVersion: "deterministic-v1",
      status: "inactive",
    });
    repository.upsertReviewItem({
      reviewItemId: "review:p0-dedupe",
      reviewKind: "zotero_dedupe_candidate",
      priority: 0,
      status: "open",
      scopeKind: "identifier",
      scopeRef: "doi:10.1000/x",
      payloadJson: JSON.stringify({
        literature_item_id: "lit:old",
        surviving_literature_item_id: "lit:inactive-target",
      }),
    });

    assert.throws(
      () =>
        repository.applyIndexReviewAction({
          reviewItemId: "review:p0-dedupe",
          action: "mark_as_dedupe_merge",
        }),
      /dedupe merge target literature item is not active/,
    );

    assert.equal(repository.getLiteratureItem("lit:old")?.status, "active");
    assert.equal(repository.listReviewItems()[0]?.status, "open");
    assert.equal(repository.countRows("synt_literature_redirect"), 0);
    assert.equal(repository.countRows("synt_dirty_event"), 0);
  });
});
