import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  buildSynthesisKnowledgeGraphPaths,
  buildSynthesisStoragePaths,
  readProjectionRegistryState,
} from "../../src/modules/synthesis/foundation";
import { createSynthesisLiteratureRegistryService } from "../../src/modules/synthesis/literatureRegistry";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import {
  readRuntimeTextFile,
  listRuntimeChildren,
  removeRuntimePath,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";
import { buildPaperRegistryRows } from "../../src/modules/synthesis/registry";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import {
  applySynthesisUiAction,
  createDefaultSynthesisUiState,
} from "../../src/modules/synthesis/uiModel";
import {
  getSynthesisJobProfilerDatabasePath,
  readSynthesisJobProfilerSnapshotForTests,
  resetSynthesisJobProfilerForTests,
} from "../../src/modules/synthesis/jobProfiler";

async function waitFor(predicate: () => Promise<boolean> | boolean) {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail("timed out waiting for condition");
}

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-literature-registry-"));
}

const registryInputs = [
  {
    libraryId: 1,
    itemKey: "AAA",
    title: "Attention Paper",
    year: "2020",
    itemType: "journalArticle",
    creators: ["Vaswani"],
    doi: "10.1000/aaa",
    citekey: "vaswani2020",
    tags: ["model:transformer"],
    collections: ["deep-learning"],
    notes: [
      {
        key: "N1",
        title: "References",
        html: "",
        payloadBlocks: [
          {
            payloadType: "references-json",
            version: "1",
            format: "json",
            payload: {
              references: [
                {
                  title: "Detection Transformer",
                  year: "2021",
                  authors: ["Carion"],
                  doi: "10.1000/bbb",
                  roles: ["method"],
                },
                { raw: "Weak reference without identifiers" },
              ],
            },
          },
          {
            payloadType: "citation-analysis-json",
            version: "1",
            format: "json",
            payload: {
              citations: [{ reference_index: 0, roles: ["baseline"] }],
            },
          },
        ],
      },
    ],
  },
  {
    libraryId: 1,
    itemKey: "BBB",
    title: "Detection Transformer",
    year: "2021",
    itemType: "conferencePaper",
    creators: ["Carion"],
    doi: "10.1000/bbb",
    citekey: "carion2021",
    tags: [],
    collections: [],
    notes: [],
  },
] as any[];

describe("Synthesis literature registry and citation graph", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
    resetSynthesisJobProfilerForTests();
  });

  afterEach(function () {
    setDebugModeOverrideForTests();
    resetSynthesisJobProfilerForTests();
    resetPluginStateStoreForTests();
  });

  it("computes independent paper registry facet hashes", async function () {
    const [base] = buildPaperRegistryRows([registryInputs[0]]);
    const [metadataChanged] = buildPaperRegistryRows([
      {
        ...registryInputs[0],
        title: "Attention Paper Revised",
      },
    ]);

    assert.containsAllKeys(base.facets, [
      "identity",
      "metadata",
      "artifact",
      "reference",
      "readiness",
      "topic_usage",
    ]);
    assert.notEqual(
      base.facets.metadata.hash,
      metadataChanged.facets.metadata.hash,
    );
    assert.equal(
      base.facets.artifact.hash,
      metadataChanged.facets.artifact.hash,
    );
    assert.equal(
      base.facets.reference.hash,
      metadataChanged.facets.reference.hash,
    );
  });

  it("initializes citation graph canonical directories and manifest", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisLiteratureRegistryService({ root });

    const snapshot = await service.loadLiteratureRegistry();
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    assert.deepEqual(snapshot.papers, []);
    for (const dir of [
      "papers",
      "reference-instances",
      "reference-resolutions",
      "contexts",
      "works",
      "work-redirects",
      "cleanup-proposals",
    ]) {
      assert.isTrue(
        await runtimePathExists(path.join(paths.citationGraphRoot, dir)),
      );
    }
    assert.isTrue(
      await runtimePathExists(
        path.join(paths.citationGraphRoot, "manifest.json"),
      ),
    );
  });

  it("rebuilds canonical records and marks registry and graph projections stale", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisLiteratureRegistryService({
      root,
      now: () => "2026-05-25T00:00:00.000Z",
    });

    const result = await service.rebuildLiteratureRegistry({
      registryInputs,
      transactionId: "literature-registry-test",
    });
    const snapshot = await service.loadLiteratureRegistry();

    assert.equal(result.manifest.paper_count, 2);
    assert.equal(snapshot.reference_instances.length, 2);
    assert.equal(snapshot.reference_resolutions[0]?.status, "matched");
    assert.include(
      snapshot.reference_resolutions.map((row) => row.status),
      "unmatched",
    );
    assert.isAtLeast(snapshot.cleanup_proposals.length, 1);

    const registry = await readProjectionRegistryState(root);
    assert.isFalse(
      registry.projections["literature-registry-index"].stale,
      "projection rebuild clears literature stale flag",
    );
    assert.isFalse(registry.projections["citation-graph-index"].stale);
  });

  it("resolves references by identity signals without literature matching metadata", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisLiteratureRegistryService({
      root,
      now: () => "2026-05-25T00:00:00.000Z",
    });

    await service.rebuildLiteratureRegistry({
      registryInputs: [
        {
          libraryId: 1,
          itemKey: "SRC",
          title: "Source Paper",
          year: "2024",
          itemType: "journalArticle",
          creators: ["Source"],
          notes: [
            {
              key: "N-refs",
              title: "References",
              html: "",
              payloadBlocks: [
                {
                  payloadType: "references-json",
                  version: "1",
                  format: "json",
                  payload: {
                    references: [
                      {
                        title: "CiteKey Target",
                        year: "2022",
                        authors: ["Target"],
                        citekey: "target2022",
                      },
                      {
                        title: "Title Year Author Target",
                        year: "2023",
                        authors: ["Ada Lovelace"],
                      },
                      {
                        title: "Weak Title Only Target",
                        year: "2024",
                        authors: ["Different Author"],
                      },
                      {
                        title: "Raw Arxiv Target",
                        raw: "Available as arXiv:2201.12345.",
                      },
                      {
                        title:
                          "Dabdetr: Dynamic Anchor Boxes are Better Queries for DETR",
                        year: "2022",
                        authors: ["Shilong Zhang"],
                      },
                      {
                        title:
                          "YOLACT++: Better real-time instance segmentation",
                        year: "2020",
                        authors: ["Daniel Bolya", "Chong Zhou"],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
        {
          libraryId: 1,
          itemKey: "CK",
          title: "CiteKey Target",
          year: "2022",
          itemType: "conferencePaper",
          creators: ["Target"],
          citekey: "target2022",
          notes: [],
        },
        {
          libraryId: 1,
          itemKey: "ARX",
          title: "Arxiv Target",
          year: "2022",
          itemType: "preprint",
          creators: ["Ada Lovelace"],
          arxiv: "2201.12345",
          notes: [],
        },
        {
          libraryId: 1,
          itemKey: "TYA",
          title: "Title Year Author Target",
          year: "2023",
          itemType: "conferencePaper",
          creators: ["Ada Lovelace"],
          notes: [],
        },
        {
          libraryId: 1,
          itemKey: "DAB",
          title: "DAB-DETR: Dynamic Anchor Boxes are Better Queries for DETR",
          year: "2022",
          itemType: "conferencePaper",
          creators: ["Shilong Zhang", "Xiaokang Chen"],
          notes: [],
        },
        {
          libraryId: 1,
          itemKey: "WEAK",
          title: "Weak Title Only Target",
          year: "2024",
          itemType: "conferencePaper",
          creators: ["Grace Hopper"],
          notes: [],
        },
        {
          libraryId: 1,
          itemKey: "YOLACT",
          title: "YOLACT: Real-time Instance Segmentation",
          year: "2019",
          itemType: "conferencePaper",
          creators: ["Daniel Bolya", "Chong Zhou"],
          notes: [],
        },
      ] as any[],
      transactionId: "reference-identity-resolution",
    });

    const snapshot = await service.loadLiteratureRegistry();
    const instanceByTitle = new Map(
      snapshot.reference_instances.map((instance) => [
        instance.title,
        instance,
      ]),
    );
    const resolutionForTitle = (title: string) =>
      snapshot.reference_resolutions.find(
        (resolution) =>
          resolution.reference_instance_id ===
          instanceByTitle.get(title)?.reference_instance_id,
      );

    assert.deepInclude(resolutionForTitle("CiteKey Target"), {
      status: "matched",
      target_paper_ref: "1:CK",
      confidence: "deterministic",
    });
    assert.deepInclude(resolutionForTitle("Title Year Author Target"), {
      status: "matched",
      target_paper_ref: "1:TYA",
      confidence: "deterministic",
    });
    assert.deepInclude(resolutionForTitle("Raw Arxiv Target"), {
      status: "matched",
      target_paper_ref: "1:ARX",
      confidence: "deterministic",
    });
    assert.deepInclude(
      resolutionForTitle(
        "Dabdetr: Dynamic Anchor Boxes are Better Queries for DETR",
      ),
      {
        status: "matched",
        target_paper_ref: "1:DAB",
        confidence: "deterministic",
      },
    );
    assert.deepInclude(resolutionForTitle("Weak Title Only Target"), {
      status: "matched",
      target_paper_ref: "1:WEAK",
      confidence: "deterministic",
    });
    assert.notEqual(
      resolutionForTitle("YOLACT++: Better real-time instance segmentation")
        ?.status,
      "matched",
    );
    assert.isAtLeast(snapshot.cleanup_proposals.length, 1);
  });

  it("persists literature registry facts into typed SQLite repository rows", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });
    const service = createSynthesisLiteratureRegistryService({
      root,
      repository,
      now: () => "2026-05-26T00:00:00.000Z",
    });

    await service.rebuildLiteratureRegistry({
      registryInputs,
      transactionId: "literature-registry-sqlite-sync",
    });

    assert.equal(repository.countRows("synt_literature_item"), 3);
    assert.isAtLeast(repository.countRows("synt_literature_identifier"), 5);
    assert.equal(repository.countRows("synt_zotero_binding"), 2);
    assert.equal(repository.countRows("synt_artifact_state"), 6);
    assert.equal(repository.countRows("synt_reference_instance"), 2);
    assert.equal(repository.countRows("synt_reference_resolution"), 2);
    assert.equal(repository.countRows("synt_review_item"), 1);
  });

  it("opens Zotero deletion P0 reviews when an indexed binding disappears", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });
    const registry = createSynthesisLiteratureRegistryService({
      root,
      repository,
      now: () => "2026-05-26T00:00:00.000Z",
    });

    await registry.rebuildLiteratureRegistry({ registryInputs });
    await registry.rebuildLiteratureRegistry({
      registryInputs: [registryInputs[1]],
      transactionId: "literature-registry-delete-review",
    });

    const review = repository
      .listReviewItems({ reviewKind: "zotero_item_delete" })
      .find((row) => row.status === "open");
    assert.isOk(review);
    assert.equal(review?.priority, 0);
    assert.deepInclude(JSON.parse(review?.payloadJson || "{}"), {
      paper_ref: "1:AAA",
    });

    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
      now: () => "2026-05-26T00:00:00.000Z",
    });
    const snapshot = await service.getSynthesisSnapshotInput();
    const uiReview = snapshot.registry.cleanupProposals.find(
      (entry) => entry.kind === "zotero_item_delete",
    );
    assert.equal(uiReview?.status, "open");
    assert.equal(uiReview?.priority, 0);

    await service.applyCleanupProposalAction({
      proposalId: uiReview!.proposal_id,
      action: "keep_for_now",
    });
    const after = await service.getSynthesisSnapshotInput();
    assert.isUndefined(
      after.registry.cleanupProposals.find(
        (entry) =>
          entry.proposal_id === uiReview!.proposal_id &&
          entry.status === "open",
      ),
    );
    assert.equal(
      after.registry.cleanupProposals.find(
        (entry) => entry.proposal_id === uiReview!.proposal_id,
      )?.status,
      "deferred",
    );
  });

  it("opens Zotero dedupe P0 reviews for duplicate strong identifiers", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({
      now: () => "2026-05-26T00:00:00.000Z",
    });
    const service = createSynthesisLiteratureRegistryService({
      root,
      repository,
      now: () => "2026-05-26T00:00:00.000Z",
    });

    await service.rebuildLiteratureRegistry({
      registryInputs: [
        ...registryInputs,
        {
          ...registryInputs[1],
          itemKey: "CCC",
          title: "Detection Transformer Duplicate",
        },
      ],
    });

    const review = repository
      .listReviewItems({ reviewKind: "zotero_dedupe_candidate" })
      .find((row) => row.status === "open");
    assert.isOk(review);
    assert.equal(review?.priority, 0);
    const payload = JSON.parse(review?.payloadJson || "{}");
    assert.equal(payload.identifier_key, "doi:10.1000/bbb");
    assert.lengthOf(payload.candidates, 2);
  });

  it("uses short stable citation canonical asset filenames for long reference-derived identities", async function () {
    const root = await makeRuntimeRoot();
    const longReferenceTitle = [
      "Proceedings of the IEEE International Conference on Computer Vision",
      "pages 5561-5569",
      "a very long reference title that would otherwise exceed Windows path limits",
      "with additional subtitle fragments and punctuation",
    ].join(" ");
    const service = createSynthesisLiteratureRegistryService({ root });

    await service.rebuildLiteratureRegistry({
      registryInputs: [
        {
          ...registryInputs[0],
          notes: [
            {
              key: "N-long",
              title: "References",
              html: "",
              payloadBlocks: [
                {
                  payloadType: "references-json",
                  version: "1",
                  format: "json",
                  payload: {
                    references: [
                      {
                        title: longReferenceTitle,
                        year: "2017",
                        authors: ["Long Author Name"],
                        roles: ["background"],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        } as any,
      ],
      transactionId: "long-reference-assets",
    });

    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const workFiles = await listRuntimeChildren(
      path.join(paths.citationGraphRoot, "works"),
    );
    const referenceFiles = await listRuntimeChildren(
      path.join(paths.citationGraphRoot, "reference-instances"),
    );

    assert.isAtLeast(workFiles.length, 1);
    assert.isTrue(
      workFiles.every(
        (entry) => path.basename(entry).length <= "work_".length + 24 + 5,
      ),
      "work asset filenames stay bounded",
    );
    assert.isTrue(
      referenceFiles.every(
        (entry) => path.basename(entry).length <= "refinst_".length + 24 + 5,
      ),
      "reference instance filenames stay bounded",
    );
  });

  it("keeps work identity stable when BBT citeKey changes", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisLiteratureRegistryService({ root });

    await service.rebuildLiteratureRegistry({ registryInputs });
    const before = await service.loadLiteratureRegistry();
    await service.rebuildLiteratureRegistry({
      registryInputs: registryInputs.map((input) =>
        input.itemKey === "AAA"
          ? { ...input, citekey: "vaswani2020changed" }
          : input,
      ),
    });
    const after = await service.loadLiteratureRegistry();

    assert.deepEqual(
      after.works.map((work) => work.work_id).sort(),
      before.works.map((work) => work.work_id).sort(),
    );
    assert.equal(
      after.papers.find((paper) => paper.item_key === "AAA")?.citekey,
      "vaswani2020changed",
    );
  });

  it("rebuilds citation graph projection from canonical records after state deletion", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisLiteratureRegistryService({ root });
    await service.rebuildLiteratureRegistry({ registryInputs });
    const first = await service.readCitationGraphProjection();
    assert.equal(first?.graph.nodes.length, 3);
    assert.deepEqual(first?.backend, {
      kind: "json-dto",
      sqlite: false,
      fts: false,
      bm25: false,
    });

    const paths = buildSynthesisKnowledgeGraphPaths(root);
    await removeRuntimePath(
      path.join(paths.stateRoot, "citation-graph-index.json"),
    );
    assert.isNull(await service.readCitationGraphProjection());

    const rebuilt = await service.rebuildCitationGraphProjection();
    assert.equal(
      rebuilt.citationProjection.graph.graph_hash,
      first?.graph.graph_hash,
    );
    assert.equal(
      rebuilt.citationProjection.metrics.graph_hash,
      rebuilt.citationProjection.graph.graph_hash,
    );
    const stateFiles = await listRuntimeChildren(paths.stateRoot);
    assert.isFalse(
      stateFiles.some((entry) => entry.endsWith(".sqlite")),
      "SQLite projection backend remains deferred",
    );
  });

  it("applies reference resolution cleanup decisions", async function () {
    const scenarios = [
      {
        name: "create index item",
        action: "confirm_literature_item" as const,
        proposalStatus: "resolved",
        resolutionStatus: "matched",
        graphEdgeStatus: "matched",
      },
      {
        name: "match existing literature item",
        action: "match_existing_literature_item" as const,
        targetPaperRef: "1:BBB",
        proposalStatus: "resolved",
        resolutionStatus: "matched",
        graphEdgeStatus: "matched",
      },
      {
        name: "ignore reference",
        action: "ignore_reference_instance" as const,
        proposalStatus: "resolved",
        resolutionStatus: "ignored",
        graphEdgeStatus: "ignored",
      },
      {
        name: "defer reference",
        action: "defer_reference_resolution" as const,
        proposalStatus: "deferred",
        resolutionStatus: "unmatched",
        graphEdgeStatus: "unresolved",
      },
    ];

    for (const scenario of scenarios) {
      const root = await makeRuntimeRoot();
      const repository = createSynthesisRepository();
      const service = createSynthesisLiteratureRegistryService({
        root,
        repository,
      });
      await service.rebuildLiteratureRegistry({ registryInputs });
      const proposal = (await service.listCleanupProposals())[0];
      assert.isOk(proposal, scenario.name);

      await service.applyCleanupProposalAction({
        proposalId: proposal.proposal_id,
        action: scenario.action,
        targetPaperRef: scenario.targetPaperRef,
        transactionId: `cleanup-${scenario.action}`,
      });
      const snapshot = await service.loadLiteratureRegistry();
      const updatedProposal = snapshot.cleanup_proposals.find(
        (entry) => entry.proposal_id === proposal.proposal_id,
      );
      const updatedResolution = snapshot.reference_resolutions.find(
        (entry) =>
          entry.reference_instance_id === proposal.reference_instance_id,
      );

      assert.equal(updatedProposal?.status, scenario.proposalStatus);
      assert.equal(updatedResolution?.status, scenario.resolutionStatus);
      assert.sameMembers(
        repository.listDirtyEvents().map((entry) => entry.eventType),
        [
          "reference_resolution_review_action",
          "citation_graph_structure_dirty",
        ],
      );
      assert.include(
        JSON.parse(
          repository.listDirtyEvents({
            eventTypes: ["reference_resolution_review_action"],
          })[0]?.diagnosticsJson || "[]",
        ).map((entry: any) => entry.code),
        "index_summary_updated",
      );
      const graphEdge = repository
        .listCitationEdges()
        .find(
          (entry) =>
            entry.referenceInstanceId === proposal.reference_instance_id,
        );
      assert.equal(graphEdge?.edgeStatus, scenario.graphEdgeStatus);
      if (scenario.action === "match_existing_literature_item") {
        const targetBinding = repository
          .listZoteroBindings()
          .find((entry) => `${entry.libraryId}:${entry.itemKey}` === "1:BBB");
        assert.equal(
          graphEdge?.targetLiteratureItemId,
          targetBinding?.literatureItemId,
        );
      }
      if (scenario.action === "ignore_reference_instance") {
        assert.isUndefined(graphEdge?.targetLiteratureItemId);
      }
      assert.equal(repository.countRows("synt_review_item"), 1, scenario.name);

      if (scenario.action === "match_existing_literature_item") {
        assert.equal(updatedResolution?.target_paper_ref, "1:BBB");
      }
      if (scenario.action === "confirm_literature_item") {
        assert.isOk(updatedResolution?.target_work_id);
      }
      if (scenario.action === "ignore_reference_instance") {
        assert.isUndefined(updatedResolution?.target_paper_ref);
        assert.isUndefined(updatedResolution?.target_work_id);
        assert.include(
          repository
            .listReferenceFacts()
            .map((entry) => entry.resolutionStatus),
          "ignored",
        );
      }
    }
  });

  it("does not surface canonical cleanup proposals in Workbench cleanup UI", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
      now: () => "2026-05-25T00:00:00.000Z",
    });

    await service.runLiteratureRegistryJobNow();
    const snapshot = await service.getSynthesisSnapshotInput();

    assert.deepEqual(snapshot.registry.cleanupProposals, []);
    assert.isTrue(
      snapshot.registry.rows.some(
        (row) => row.paper_ref === "1:AAA" && row.index_scope === "library",
      ),
    );
  });

  it("routes Synthesis service graph, slice, and metrics reads through SQLite rows", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
      now: () => "2026-05-25T00:00:00.000Z",
    });

    await service.runLiteratureRegistryJobNow();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    await removeRuntimePath(
      path.join(paths.stateRoot, "citation-graph-index.json"),
    );
    const graph = await service.queryCitationGraph();
    const registry = await service.getPaperRegistry({ limit: 10 });
    const metrics = await service.getCitationGraphMetrics({ limit: 10 });
    const slice = await service.getCitationGraphSlice({
      startNodeId: "zotero:item:AAA",
      depth: 1,
      maxNodes: 10,
      maxEdges: 10,
    });

    assert.isAtLeast(graph.nodes.length, 2);
    assert.isAtLeast((graph as any).hover_only_nodes?.length || 0, 1);
    assert.equal((graph.diagnostics as any).storage, "sqlite");
    assert.equal(registry.total, 2);
    assert.equal(registry.diagnostics.storage, "sqlite");
    assert.isTrue(metrics.ok);
    assert.isTrue(slice.ok);
    const snapshot = await service.getSynthesisSnapshotInput();
    assert.isAtLeast(snapshot.graph?.nodes.length || 0, 3);
    assert.equal((snapshot.graph?.diagnostics as any).storage, "sqlite");
  });

  it("refreshes Workbench citation graph layout from SQLite without projection JSON", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
      now: () => "2026-05-25T00:00:00.000Z",
    });

    await service.runLiteratureRegistryJobNow();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    await removeRuntimePath(
      path.join(paths.stateRoot, "citation-graph-index.json"),
    );
    const graphState = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "selectTab",
      payload: { tab: "graph" },
    }).state;
    const before = await service.getSynthesisSnapshotInput(graphState);

    assert.isAtLeast(before.graph?.nodes.length || 0, 3);
    assert.equal(before.graph?.layoutStatus, "missing");
    assert.isFalse(
      (before.graph?.nodes || []).some((node) => typeof node.x === "number"),
    );

    const result = await service.runCitationGraphLayoutWorker({
      preset: "balanced",
      timeBudgetMs: 1000,
    });
    const after = await service.getSynthesisSnapshotInput(graphState);

    assert.equal(result.completed, 1);
    assert.equal(after.graph?.layoutStatus, "ready");
    assert.isTrue(
      (after.graph?.nodes || []).some(
        (node) => typeof node.x === "number" && typeof node.y === "number",
      ),
    );
    const debug = await service.debugSynthesisWorkerRun({
      worker: "citationGraphLayout",
      preset: "balanced",
      timeBudgetMs: 1000,
    });
    assert.equal(debug.worker, "citationGraphLayout");
    assert.equal((debug.result as { skipped?: string }).skipped, "ready");
  });

  it("serves paper registry reads from SQLite after projection JSON is removed", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
      now: () => "2026-05-25T00:00:00.000Z",
    });

    await service.runLiteratureRegistryJobNow();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    await removeRuntimePath(
      path.join(paths.stateRoot, "literature-registry-index.json"),
    );

    const registry = await service.getPaperRegistry({ limit: 10 });

    assert.equal(registry.total, 2);
    assert.equal(registry.rows[0].title, "Attention Paper");
    assert.deepEqual(registry.rows[0].tags, ["model:transformer"]);
    assert.equal(registry.rows[0].artifacts.references.status, "available");
    assert.equal(registry.diagnostics.storage, "sqlite");
    assert.deepEqual(registry.diagnostics.recommended_commands, []);

    const snapshot = await service.getSynthesisSnapshot();
    assert.deepEqual(
      snapshot.registry.visibleRows.map((row) => row.paper_ref),
      ["1:AAA", "1:BBB"],
    );
    const source = snapshot.registry.rows.find(
      (row) => row.paper_ref === "1:AAA" && row.index_scope === "library",
    );
    assert.equal(source?.reference_count, 2);
    assert.equal(source?.references?.[0]?.target_paper_ref, "1:BBB");

    const referencedState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: { registry: { literature: "reference-only" } },
      },
    ).state;
    const referencedSnapshot =
      await service.getSynthesisSnapshot(referencedState);
    assert.equal(referencedSnapshot.registry.visibleRows.length, 1);
    assert.isTrue(
      referencedSnapshot.registry.visibleRows.every(
        (row) => row.index_scope === "referenced",
      ),
    );
    assert.notInclude(
      referencedSnapshot.registry.visibleRows.map((row) => row.paper_ref),
      "1:BBB",
    );
  });

  it("does not fall back to legacy unified graph for Workbench graph reads", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [],
      now: () => "2026-05-25T00:00:00.000Z",
    });
    await service.runLiteratureRegistryJobNow();
    const legacyGraph = {
      schema_id: "synthesis.unified_citation_graph",
      schema_version: "1.0.0",
      nodes: [
        {
          node_id: "zotero:item:LEGACY",
          kind: "library_paper",
          title: "Legacy graph paper",
          year: "2020",
        },
      ],
      edges: [],
      diagnostics: {},
      graph_hash: "sha256:legacy-graph",
    };
    const storagePaths = buildSynthesisStoragePaths(root);
    await writeRuntimeTextFile(
      storagePaths.unifiedCitationGraph,
      `${JSON.stringify(
        {
          schema_id: "synthesis.unified_citation_graph_projection",
          schema_version: "1.0.0",
          created_at: "2026-05-25T00:00:00.000Z",
          updated_at: "2026-05-25T00:00:00.000Z",
          data: legacyGraph,
        },
        null,
        2,
      )}\n`,
    );

    const graph = await service.queryCitationGraph();
    const snapshot = await service.getSynthesisSnapshotInput();

    assert.deepEqual(graph.nodes, []);
    assert.notEqual(
      (graph.diagnostics as any).status,
      "legacy_projection_used",
    );
    assert.deepEqual(snapshot.graph?.nodes, []);
    assert.equal((snapshot.graph?.diagnostics as any).storage, "sqlite");
  });

  it("serves paper registry reads without synchronously rebuilding missing projections", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
      literatureJobDebounceMs: 10000,
    });

    const registry = await service.getPaperRegistry({ limit: 10 });
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const paperFiles = await listRuntimeChildren(
      path.join(paths.citationGraphRoot, "papers"),
    );
    const jobStatePath = path.join(
      paths.stateRoot,
      "literature-registry-job-state.json",
    );

    assert.equal(registry.total, 0);
    assert.isFalse(registry.diagnostics.projection_found);
    assert.include(
      registry.diagnostics.warnings,
      "literature registry SQLite rows are missing",
    );
    assert.deepEqual(registry.diagnostics.recommended_commands, [
      "runLiteratureRegistryJobNow",
    ]);
    assert.include(
      registry.diagnostics.read_hints.map(
        (hint: { code: string }) => hint.code,
      ),
      "paper_registry_projection_missing",
    );
    assert.isFalse(await runtimePathExists(jobStatePath));
    assert.deepEqual(paperFiles, []);
  });

  it("does not scan a library adapter from paper registry read fallback", async function () {
    const root = await makeRuntimeRoot();
    let registryInputCalls = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      libraryAdapter: {
        async getRegistryInputs() {
          registryInputCalls += 1;
          throw new Error("read path must not scan registry inputs");
        },
        async getCitationGraphInputs() {
          throw new Error("read path must not scan citation graph inputs");
        },
        async getLibraryIndex() {
          return {
            libraryId: 1,
            papers: [],
            tags: [],
            collections: [],
            has_more: false,
            returned: 0,
            total_papers: 0,
            index_hash: "",
            page_hash: "",
            diagnostics: [],
          };
        },
        async readPaperArtifacts() {
          return { artifacts: [], diagnostics: [] };
        },
      },
    });
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const jobStatePath = path.join(
      paths.stateRoot,
      "literature-registry-job-state.json",
    );

    const registry = await service.getPaperRegistry({ limit: 10 });

    assert.equal(registryInputCalls, 0);
    assert.equal(registry.total, 0);
    assert.isFalse(registry.diagnostics.projection_found);
    assert.deepEqual(registry.diagnostics.recommended_commands, [
      "runLiteratureRegistryJobNow",
    ]);
    assert.isFalse(await runtimePathExists(jobStatePath));
  });

  it("keeps Workbench snapshot reads from scanning literature freshness sources", async function () {
    const root = await makeRuntimeRoot();
    let registryInputCalls = 0;
    let citationInputCalls = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      libraryAdapter: {
        async getRegistryInputs() {
          registryInputCalls += 1;
          throw new Error("snapshot read must not scan registry inputs");
        },
        async getCitationGraphInputs() {
          citationInputCalls += 1;
          throw new Error("snapshot read must not scan citation graph inputs");
        },
        async getLibraryIndex() {
          return {
            libraryId: 1,
            papers: [],
            tags: [],
            collections: [],
            has_more: false,
            returned: 0,
            total_papers: 0,
            index_hash: "",
            page_hash: "",
            diagnostics: [],
          };
        },
        async readPaperArtifacts() {
          return { artifacts: [], diagnostics: [] };
        },
      },
      literatureJobDebounceMs: 20,
    });
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const jobStatePath = path.join(
      paths.stateRoot,
      "literature-registry-job-state.json",
    );

    const snapshot = await service.getSynthesisSnapshotInput();
    await new Promise((resolve) => setTimeout(resolve, 40));

    assert.equal(registryInputCalls, 0);
    assert.equal(citationInputCalls, 0);
    assert.equal(snapshot.registry.literatureJob?.queue_state, "missing");
    assert.isFalse(await runtimePathExists(jobStatePath));
  });

  it("keeps Workbench snapshot reads side-effect free for literature jobs", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
      literatureJobDebounceMs: 20,
    });
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const jobStatePath = path.join(
      paths.stateRoot,
      "literature-registry-job-state.json",
    );
    const citationIndexPath = path.join(
      paths.stateRoot,
      "citation-graph-index.json",
    );

    const snapshot = await service.getSynthesisSnapshot();
    await new Promise((resolve) => setTimeout(resolve, 40));

    assert.equal(snapshot.registry.literatureJob?.queue_state, "missing");
    assert.isFalse(await runtimePathExists(jobStatePath));
    assert.isFalse(await runtimePathExists(citationIndexPath));
    assert.equal(
      (await listRuntimeChildren(path.join(paths.citationGraphRoot, "papers")))
        .length,
      0,
    );
  });

  it("tracks literature freshness and runs background rebuild jobs", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
      literatureJobDebounceMs: 20,
      now: () => new Date().toISOString(),
    });

    const missing = await service.loadLiteratureJobState();
    assert.equal(missing.queue_state, "missing");

    const queued = await service.queueLiteratureRegistryRebuild();
    assert.equal(queued.queue_state, "queued");
    await waitFor(async () => {
      const state = await service.loadLiteratureJobState();
      return state.queue_state === "ready";
    });
    const ready = await service.loadLiteratureJobState();
    const snapshot = await service.loadLiteratureRegistry();
    assert.equal(ready.queue_state, "ready");
    assert.equal(
      ready.projection_manifest_hash,
      snapshot.manifest.manifest_hash,
    );

    const changed = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        ...registryInputs,
        {
          libraryId: 1,
          itemKey: "CCC",
          title: "New Source Paper",
          year: "2022",
          itemType: "journalArticle",
          creators: [],
          tags: [],
          collections: [],
          notes: [],
        } as any,
      ],
      literatureJobDebounceMs: 20,
    });
    const stale = await changed.loadLiteratureJobState();
    assert.equal(stale.queue_state, "stale");
  });

  it("keeps latest usable projection across retryable literature job failures", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
      literatureJobRetryDelaysMs: [20],
    });
    await service.runLiteratureRegistryJobNow();
    const first = await service.readCitationGraphSnapshot();
    assert.isOk(first);
    let calls = 0;
    const failing = createSynthesisService({
      root,
      libraryId: 1,
      literatureJobRetryDelaysMs: [20],
      libraryAdapter: {
        getRegistryInputs: async () => {
          calls += 1;
          if (calls <= 2) {
            throw new Error(`${root}\\secret\\token=abc123`);
          }
          return registryInputs;
        },
        getCitationGraphInputs: async () => [],
        getLibraryIndex: async () => ({
          libraryId: 1,
          papers: [],
          tags: [],
          collections: [],
          diagnostics: { warnings: [] },
        }),
        readPaperArtifacts: async () => ({ artifacts: [], diagnostics: [] }),
      },
    });

    const failed = await failing.runLiteratureRegistryJobNow();
    assert.equal(failed.queue_state, "failed_retryable");
    assert.equal(failed.retry_attempt, 1);
    assert.isString(failed.next_retry_at);
    assert.isOk(await failing.readCitationGraphSnapshot());
    assert.notInclude(JSON.stringify(failed), root);
    assert.notInclude(JSON.stringify(failed), "abc123");

    await waitFor(async () => {
      const state = await failing.loadLiteratureJobState();
      return state.queue_state === "ready";
    });
  });

  it("processes paper-scoped dirty events with bounded incremental registry worker", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
    });
    await service.runLiteratureRegistryJobNow();
    const updated = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: registryInputs.map((input) =>
        input.itemKey === "AAA"
          ? { ...input, title: "Attention Paper Updated", notes: [] }
          : input,
      ),
    });
    await updated.recordSynthesisUpdateEvent({
      eventType: "zotero_item_updated",
      source: "test",
      scope: { kind: "zotero_item", ref: "AAA" },
    });

    const result = await updated.runPaperRegistryIncrementalWorker({
      batchLimit: 1,
      timeBudgetMs: 1000,
    });
    const snapshot = await updated.loadLiteratureRegistry();
    const projectionRegistry = await readProjectionRegistryState(root);

    assert.equal(result.completed, 1);
    assert.equal(
      snapshot.papers.find((paper) => paper.item_key === "AAA")?.title,
      "Attention Paper Updated",
    );
    assert.equal(
      snapshot.papers.find((paper) => paper.item_key === "BBB")?.title,
      "Detection Transformer",
    );
    assert.equal(
      snapshot.reference_instances.filter(
        (reference) => reference.source_paper_ref === "1:AAA",
      ).length,
      0,
    );
    assert.isTrue(
      projectionRegistry.projections["literature-registry-index"].stale,
    );
    assert.isTrue(projectionRegistry.projections["citation-graph-index"].stale);
    assert.include(
      (await updated.listSynthesisUpdateEvents()).map(
        (event) => event.event_type,
      ),
      "citation_graph_structure_dirty",
    );
  });

  it("incrementally refreshes citation structure ownership and lightweight metrics", async function () {
    const root = await makeRuntimeRoot();
    const cccInput = {
      ...registryInputs[0],
      itemKey: "CCC",
      title: "Transformer Survey",
      doi: "10.1000/ccc",
      citekey: "survey2022",
      notes: [
        {
          key: "N3",
          title: "References",
          html: "",
          payloadBlocks: [
            {
              payloadType: "references-json",
              version: "1",
              format: "json",
              payload: {
                references: [
                  {
                    title: "Detection Transformer",
                    year: "2021",
                    authors: ["Carion"],
                    doi: "10.1000/bbb",
                    roles: ["survey"],
                  },
                ],
              },
            },
          ],
        },
      ],
    } as any;
    const initialInputs = [...registryInputs, cccInput];
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: initialInputs,
    });
    await service.runLiteratureRegistryJobNow();
    const initial = await service.readCitationGraphSnapshot();
    assert.isOk(initial);
    assert.isTrue(
      initial!.graph.edges.some(
        (edge) =>
          edge.source === "zotero:item:AAA" &&
          edge.target === "zotero:item:BBB",
      ),
    );
    assert.isTrue(
      initial!.graph.edges.some(
        (edge) =>
          edge.source === "zotero:item:CCC" &&
          edge.target === "zotero:item:BBB",
      ),
    );

    const updated = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: initialInputs.map((input) =>
        input.itemKey === "AAA" ? { ...input, notes: [] } : input,
      ),
    });
    await updated.recordSynthesisUpdateEvent({
      eventType: "zotero_item_updated",
      source: "test",
      scope: { kind: "zotero_item", ref: "AAA" },
    });
    await updated.runPaperRegistryIncrementalWorker({
      batchLimit: 1,
      timeBudgetMs: 1000,
    });
    const structureResult = await updated.runCitationGraphStructureWorker({
      batchLimit: 1,
      timeBudgetMs: 1000,
    });
    const projection = await updated.readCitationGraphSnapshot();
    const events = await updated.listSynthesisUpdateEvents();

    assert.equal(structureResult.completed, 1);
    assert.isOk(projection?.structure);
    assert.lengthOf(
      projection!.structure!.ownership.source_paper_edges["1:AAA"].edge_ids,
      0,
    );
    assert.isTrue(
      projection!.graph.edges.some(
        (edge) =>
          edge.source === "zotero:item:CCC" &&
          edge.target === "zotero:item:BBB",
      ),
      "unrelated source-paper edge remains in the graph",
    );
    assert.isAtLeast(
      projection!.metric_layers!.lightweight.counts["zotero:item:CCC"].outgoing,
      1,
    );
    assert.equal(projection!.metric_layers!.complex.status, "stale");
    assert.include(
      events.map((event) => event.event_type),
      "citation_graph_complex_metrics_dirty",
    );
  });

  it("refreshes complex citation metrics from latest usable structure", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
    });
    await service.runLiteratureRegistryJobNow();
    await service.recordSynthesisUpdateEvent({
      eventType: "citation_graph_structure_dirty",
      source: "test",
      scope: { kind: "paper", ref: "1:AAA" },
    });
    await service.runCitationGraphStructureWorker({
      batchLimit: 1,
      timeBudgetMs: 1000,
    });
    const stale = await service.readCitationGraphSnapshot();
    assert.equal(stale?.metric_layers?.complex.status, "stale");
    const staleMetrics = await service.getCitationGraphMetrics({ limit: 10 });
    assert.equal(staleMetrics.status, "stale");
    assert.include(
      staleMetrics.diagnostics.warnings,
      "citation graph complex metrics are missing; using lightweight metrics",
    );

    const result = await service.runCitationGraphComplexMetricsWorker({
      timeBudgetMs: 1000,
    });
    const ready = await service.getCitationGraphMetrics({ limit: 10 });
    const projectionAfterWorker = await service.readCitationGraphSnapshot();

    assert.equal(result.completed, 1);
    assert.equal(ready.status, "ready");
    assert.isTrue(ready.diagnostics.metrics_found);
    assert.isFalse(ready.diagnostics.stale);
    assert.isAtLeast(ready.items[0]?.foundation_score || 0, 0);
    assert.equal(projectionAfterWorker?.metric_layers?.complex.status, "stale");
  });

  it("keeps layout refresh UI-driven and separate from complex metrics updates", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
    });
    await service.runLiteratureRegistryJobNow();
    const graphState = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "selectTab",
      payload: { tab: "graph" },
    }).state;
    const initial = await service.getSynthesisSnapshotInput(graphState);
    assert.equal(initial.graph?.layoutStatus, "missing");
    await service.runCitationGraphLayoutWorker({
      preset: "balanced",
      timeBudgetMs: 1000,
    });
    const initialReady = await service.getSynthesisSnapshotInput(graphState);
    assert.equal(initialReady.graph?.layoutStatus, "ready");

    const updated = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: registryInputs.map((input) =>
        input.itemKey === "AAA" ? { ...input, notes: [] } : input,
      ),
    });
    await updated.recordSynthesisUpdateEvent({
      eventType: "zotero_item_updated",
      source: "test",
      scope: { kind: "zotero_item", ref: "AAA" },
    });
    await updated.runPaperRegistryIncrementalWorker({
      batchLimit: 1,
      timeBudgetMs: 1000,
    });
    await updated.runCitationGraphStructureWorker({
      batchLimit: 1,
      timeBudgetMs: 1000,
    });
    const staleInput = await updated.getSynthesisSnapshotInput(graphState);

    assert.equal(staleInput.graph?.layoutStatus, "dirty");
    assert.isOk(
      staleInput.graph?.nodes.some((node) => typeof node.x === "number"),
      "latest usable layout remains available while stale",
    );

    const result = await updated.runCitationGraphLayoutWorker({
      preset: "balanced",
      timeBudgetMs: 1000,
    });
    const ready = await updated.getSynthesisSnapshotInput(graphState);

    assert.equal(result.completed, 1);
    assert.equal(ready.graph?.layoutStatus, "ready");
    assert.isTrue(
      ready.graph?.nodes.some(
        (node) => typeof node.x === "number" && typeof node.y === "number",
      ),
    );
    const metrics = await updated.getCitationGraphMetrics({ limit: 10 });
    assert.equal(
      metrics.status,
      "stale",
      "layout refresh must not recompute complex metrics",
    );
  });

  it("keeps citation graph read APIs from writing layout projection state", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
    });
    await service.runLiteratureRegistryJobNow();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const projectionPath = path.join(
      paths.stateRoot,
      "citation-graph-index.json",
    );
    const before = await readRuntimeTextFile(projectionPath);

    await service.queryCitationGraph();
    await service.getCitationGraphMetrics({ limit: 10 });
    await service.getCitationGraphSlice({
      startNodeId: "zotero:item:AAA",
      depth: 1,
      maxNodes: 10,
      maxEdges: 10,
    });
    const after = await readRuntimeTextFile(projectionPath);

    assert.equal(after, before);
  });

  it("does not process dirty events while synthesis updates are paused", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
    });
    await service.pauseSynthesisUpdates();
    await service.recordSynthesisUpdateEvent({
      eventType: "digest_applied",
      source: "test",
      scope: { kind: "zotero_item", ref: "AAA" },
    });

    const result = await service.runPaperRegistryIncrementalWorker({
      batchLimit: 1,
    });
    const events = await service.listSynthesisUpdateEvents();

    assert.equal(result.skipped, "paused");
    assert.equal(events[0]?.status, "queued");
  });

  it("hydrates literature matching metadata cache from dirty item digest payload", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      registryInputs: [
        {
          ...registryInputs[0],
          notes: [
            {
              ...(registryInputs[0] as any).notes[0],
              payloadBlocks: [
                ...((registryInputs[0] as any).notes[0].payloadBlocks || []),
                {
                  payloadType: "literature-matching-metadata-json",
                  version: "1",
                  format: "json",
                  payload: {
                    schema: "literature_matching_metadata.v1",
                    key_terms: ["object query", "set prediction"],
                    methods: ["Hungarian matching"],
                    problems: ["object detection"],
                    datasets: ["COCO"],
                    exclude_terms: ["speech recognition"],
                  },
                },
              ],
            },
          ],
        },
      ] as any[],
      synthesisRepository: repository,
    });
    await service.recordSynthesisUpdateEvent({
      eventType: "literature_matching_metadata_changed",
      source: "test",
      scope: { kind: "zotero_item", ref: "AAA" },
    });

    const result = await service.runPaperRegistryIncrementalWorker({
      batchLimit: 1,
    });
    const rows = repository.listLiteratureMatchingMetadata();

    assert.equal(result.completed, 1);
    assert.lengthOf(rows, 1);
    assert.deepEqual(JSON.parse(rows[0]!.keyTermsJson || "[]"), [
      "object query",
      "set prediction",
    ]);
  });

  it("does not process citation structure events while synthesis updates are paused", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
    });
    await service.pauseSynthesisUpdates();
    await service.recordSynthesisUpdateEvent({
      eventType: "citation_graph_structure_dirty",
      source: "test",
      scope: { kind: "paper", ref: "1:AAA" },
    });

    const result = await service.runCitationGraphStructureWorker({
      batchLimit: 1,
    });
    const events = await service.listSynthesisUpdateEvents();

    assert.equal(result.skipped, "paused");
    assert.equal(events[0]?.status, "queued");
  });

  it("returns an explicit rebuild diagnostic for unsafe dirty scopes", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
    });
    await service.recordSynthesisUpdateEvent({
      eventType: "digest_applied",
      source: "test",
      scope: { kind: "library", ref: "1" },
    });

    const result = await service.runPaperRegistryIncrementalWorker({
      batchLimit: 1,
    });
    const event = (await service.listSynthesisUpdateEvents())[0];

    assert.equal(result.processed, 1);
    assert.equal(event?.status, "failed_permanent");
    assert.include(
      result.diagnostics.map((diagnostic) => diagnostic.code),
      "unsafe_dirty_scope_requires_explicit_rebuild",
    );
  });

  it("skips unknown startup reconcile fingerprints on an empty Synthesis DB", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
    });

    const state = await service.runSynthesisStartupReconcile({
      batchLimit: 10,
    });
    const events = await service.listSynthesisUpdateEvents();

    assert.equal(state.startup_reconcile.state, "ready");
    assert.equal(state.startup_reconcile.dirty_count, 0);
    assert.lengthOf(events, 0);
  });

  it("records startup reconcile dirty events for known DB papers", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const seeded = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      registryInputs,
      synthesisRepository: repository,
    });
    await seeded.rebuildLiteratureRegistry();
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      registryInputs: [
        { ...registryInputs[0], title: "Attention Paper Updated" },
        registryInputs[1],
      ],
      synthesisRepository: repository,
    });

    const state = await service.runSynthesisStartupReconcile({
      batchLimit: 10,
    });
    const events = await service.listSynthesisUpdateEvents();

    assert.equal(state.startup_reconcile.state, "queued");
    assert.equal(state.startup_reconcile.dirty_count, 1);
    assert.lengthOf(events, 1);
    assert.isTrue(
      events.every(
        (event) =>
          event.event_type === "startup_reconcile_detected_dirty_items",
      ),
    );
  });

  it("keeps startup reconcile profiler no-op when debug mode is off", async function () {
    setDebugModeOverrideForTests(false);
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const seeded = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      registryInputs,
      synthesisRepository: repository,
    });
    await seeded.rebuildLiteratureRegistry();
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      registryInputs: [
        { ...registryInputs[0], title: "Attention Paper Updated" },
        registryInputs[1],
      ],
      synthesisRepository: repository,
    });

    const state = await service.runSynthesisStartupReconcile({
      batchLimit: 10,
    });
    const snapshot = await readSynthesisJobProfilerSnapshotForTests(root);
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    assert.equal(state.startup_reconcile.state, "queued");
    assert.lengthOf(snapshot.runs, 0);
    assert.lengthOf(snapshot.phases, 0);
    assert.isFalse(
      await runtimePathExists(path.join(paths.stateRoot, "debug")),
    );
  });

  it("records debug profiler rows for startup reconcile in an independent store", async function () {
    setDebugModeOverrideForTests(true);
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const seeded = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      registryInputs,
      synthesisRepository: repository,
      now: () => "2026-05-27T00:00:00.000Z",
    });
    await seeded.rebuildLiteratureRegistry();
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      registryInputs: [
        { ...registryInputs[0], title: "Attention Paper Updated" },
        registryInputs[1],
      ],
      synthesisRepository: repository,
      now: () => "2026-05-27T00:00:00.000Z",
    });

    const state = await service.runSynthesisStartupReconcile({
      batchLimit: 10,
    });
    const snapshot = await readSynthesisJobProfilerSnapshotForTests(root);
    const [run] = snapshot.runs;
    const counters = JSON.parse(run.counters_json);

    assert.equal(state.startup_reconcile.state, "queued");
    assert.equal(
      snapshot.databasePath,
      getSynthesisJobProfilerDatabasePath(root),
    );
    assert.lengthOf(snapshot.runs, 1);
    assert.equal(run.job_name, "synthesis.startup_reconcile");
    assert.equal(run.trigger, "startup_reconcile");
    assert.equal(run.status, "queued");
    assert.equal(run.batch_limit, 10);
    assert.equal(run.processed_count, 2);
    assert.equal(run.failed_count, 0);
    assert.equal(counters.fingerprint_count, 2);
    assert.equal(counters.dirty_count, 1);
    assert.sameMembers(
      snapshot.phases.map((phase) => phase.phase_name),
      ["compute_delta", "load_existing_rows", "load_input_rows"],
    );
  });

  it("writes sanitized diagnostics for missing cleanup proposals", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisLiteratureRegistryService({ root });

    try {
      await service.applyCleanupProposalAction({
        proposalId: `${root}\\secret\\token=abc123`,
        action: "ignore_reference_instance",
        transactionId: "cleanup-sensitive",
      });
      assert.fail("expected cleanup action to fail");
    } catch (error) {
      assert.instanceOf(error, Error);
    }

    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const diagnostics = await readRuntimeTextFile(paths.diagnosticsLog);
    assert.include(diagnostics, "cleanup_proposal_missing");
    assert.notInclude(diagnostics, "token=abc123");
    assert.notInclude(diagnostics, root);
  });
});
