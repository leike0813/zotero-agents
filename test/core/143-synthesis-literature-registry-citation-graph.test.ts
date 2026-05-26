import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  buildSynthesisKnowledgeGraphPaths,
  buildSynthesisStoragePaths,
  readProjectionRegistryState,
} from "../../src/modules/synthesis/foundation";
import { createSynthesisLiteratureRegistryService } from "../../src/modules/synthesis/literatureRegistry";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import {
  readRuntimeTextFile,
  listRuntimeChildren,
  removeRuntimePath,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";
import { buildPaperRegistryRows } from "../../src/modules/synthesis/registry";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";

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
  });

  afterEach(function () {
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

  it("applies cleanup proposal approve, reject, and skip actions", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisLiteratureRegistryService({ root });
    await service.rebuildLiteratureRegistry({ registryInputs });
    const proposal = (await service.listCleanupProposals())[0];
    assert.isOk(proposal);

    await service.applyCleanupProposalAction({
      proposalId: proposal.proposal_id,
      action: "approve",
      transactionId: "cleanup-approve",
    });
    assert.equal(
      (await service.listCleanupProposals()).find(
        (entry) => entry.proposal_id === proposal.proposal_id,
      )?.status,
      "approved",
    );
  });

  it("serves cleanup review status from canonical records without projection rebuild", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
      now: () => "2026-05-25T00:00:00.000Z",
    });

    await service.runLiteratureRegistryJobNow();
    const before = await service.getSynthesisSnapshotInput();
    const proposal = before.registry.cleanupProposals.find(
      (entry) => entry.status === "open",
    );
    assert.isOk(proposal);
    assert.equal(proposal?.source_paper_title, "Attention Paper");
    assert.equal(proposal?.reference_raw, "Weak reference without identifiers");

    await service.applyCleanupProposalAction({
      proposalId: proposal!.proposal_id,
      action: "skip",
    });
    const after = await service.getSynthesisSnapshotInput();

    assert.isUndefined(
      after.registry.cleanupProposals.find(
        (entry) =>
          entry.proposal_id === proposal!.proposal_id &&
          entry.status === "open",
      ),
    );
    assert.equal(
      after.registry.cleanupProposals.find(
        (entry) => entry.proposal_id === proposal!.proposal_id,
      )?.status,
      "skipped",
    );
  });

  it("routes Synthesis service registry, graph, and metrics through canonical-backed projections", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
      now: () => "2026-05-25T00:00:00.000Z",
    });

    await service.runLiteratureRegistryJobNow();
    const graph = await service.queryCitationGraph();
    const registry = await service.getPaperRegistry({ limit: 10 });
    const metrics = await service.getCitationGraphMetrics({ limit: 10 });
    const slice = await service.getCitationGraphSlice({
      startNodeId: "zotero:item:AAA",
      depth: 1,
      maxNodes: 10,
      maxEdges: 10,
    });

    assert.isAtLeast(graph.nodes.length, 3);
    assert.equal(registry.total, 2);
    assert.isTrue(metrics.ok);
    assert.isTrue(slice.ok);
    assert.isOk(await service.readCitationGraphSnapshot());
  });

  it("falls back to latest legacy unified graph when canonical citation projection is empty", async function () {
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

    assert.deepEqual(
      graph.nodes.map((node) => node.node_id),
      ["zotero:item:LEGACY"],
    );
    assert.equal((graph.diagnostics as any).status, "legacy_projection_used");
    assert.deepEqual(
      snapshot.graph?.nodes.map((node) => node.id),
      ["zotero:item:LEGACY"],
    );
    assert.equal(
      (snapshot.graph?.diagnostics as any).status,
      "legacy_projection_used",
    );
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

    assert.equal(registry.total, 2);
    assert.isFalse(registry.diagnostics.projection_found);
    assert.include(
      registry.diagnostics.warnings,
      "literature registry projection is missing",
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

    const result = await service.runCitationGraphComplexMetricsWorker({
      timeBudgetMs: 1000,
    });
    const ready = await service.readCitationGraphSnapshot();

    assert.equal(result.completed, 1);
    assert.equal(ready?.metric_layers?.complex.status, "ready");
    assert.equal(ready?.metrics.graph_hash, ready?.graph.graph_hash);
  });

  it("marks citation graph layouts stale after structure changes and refreshes layouts on demand", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs,
    });
    await service.runLiteratureRegistryJobNow();
    const initial = await service.readCitationGraphSnapshot();
    assert.equal(initial?.layout_layers?.balanced.status, "ready");

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
    const stale = await updated.readCitationGraphSnapshot();
    const staleInput = await updated.getSynthesisSnapshotInput();

    assert.equal(stale?.layout_layers?.balanced.status, "stale");
    assert.equal(staleInput.graph?.layoutStatus, "dirty");
    assert.isOk(
      stale?.layouts?.balanced,
      "latest usable layout remains available while stale",
    );

    const result = await updated.runCitationGraphLayoutWorker({
      preset: "balanced",
      timeBudgetMs: 1000,
    });
    const ready = await updated.readCitationGraphSnapshot();

    assert.equal(result.completed, 1);
    assert.equal(ready?.layout_layers?.balanced.status, "ready");
    assert.equal(
      ready?.layout_layers?.balanced.source_graph_hash,
      ready?.graph.graph_hash,
    );
    assert.equal(ready?.metric_layers?.complex.status, "ready");
    assert.equal(ready?.layout_layers?.compact.status, "stale");
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

  it("records startup reconcile dirty events without parsing artifacts", async function () {
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

    assert.equal(state.startup_reconcile.state, "queued");
    assert.equal(state.startup_reconcile.dirty_count, 2);
    assert.lengthOf(events, 2);
    assert.isTrue(
      events.every(
        (event) =>
          event.event_type === "startup_reconcile_detected_dirty_items",
      ),
    );
  });

  it("writes sanitized diagnostics for missing cleanup proposals", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisLiteratureRegistryService({ root });

    try {
      await service.applyCleanupProposalAction({
        proposalId: `${root}\\secret\\token=abc123`,
        action: "reject",
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
