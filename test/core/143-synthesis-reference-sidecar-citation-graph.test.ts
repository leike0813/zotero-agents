import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import {
  maybeStartSynthesisJobProfileRun,
  readSynthesisJobProfilerSnapshotForTests,
  resetSynthesisJobProfilerForTests,
} from "../../src/modules/synthesis/jobProfiler";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-sidecar-cache-"));
}

function makeService(args: {
  root: string;
  repository?: ReturnType<typeof createSynthesisRepository>;
  registryInputs?: any[];
  citationGraphPapers?: any[];
  libraryAdapter?: any;
}) {
  const repository =
    args.repository || createSynthesisRepository({ runtimeRoot: args.root });
  const service = createSynthesisService({
    root: args.root,
    runtimeRoot: args.root,
    libraryId: 1,
    synthesisRepository: repository,
    registryInputs: args.registryInputs || [],
    citationGraphPapers: args.citationGraphPapers,
    libraryAdapter: args.libraryAdapter,
  });
  return { service, repository };
}

describe("Synthesis sidecar cache hard cut", function () {
  it("flushes profiler run and phase starts before a run finishes", async function () {
    const root = await makeRuntimeRoot();
    resetSynthesisJobProfilerForTests(root);

    const profileRun = maybeStartSynthesisJobProfileRun({
      root,
      jobName: "synthesis:test-profiler",
      trigger: "test",
      debugEnabled: true,
    });
    profileRun.phase("long_phase");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const running = await readSynthesisJobProfilerSnapshotForTests(root);
    assert.equal(running.runs[0]?.status, "running");
    assert.include(
      running.phases.map((phase) => phase.phase_name),
      "long_phase:start",
    );

    await profileRun.finish({ status: "completed" });
    const completed = await readSynthesisJobProfilerSnapshotForTests(root);
    assert.equal(completed.runs[0]?.status, "completed");
    assert.notInclude(
      completed.phases.map((phase) => phase.phase_name),
      "long_phase:start",
    );
  });

  it("direct-writes digest sidecar facts without starting graph refresh", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({ root });

    const result = await service.applyLiteratureDigestSidecar({
      libraryId: 1,
      itemKey: "AAA",
      title: "Attention Paper",
      year: "2020",
      citekey: "attention2020",
      digest: { noteKey: "NDIGEST", content: "# Digest\n\nBody" },
      references: {
        noteKey: "NREFS",
        references: [{ title: "Detection Transformer", year: "2021" }],
      },
      citationAnalysis: { noteKey: "NCITE", payloadHash: "sha256:cite" },
      literatureMatchingMetadata: {
        schema: "literature_matching_metadata.v1",
        key_terms: ["transformer"],
        methods: ["attention"],
        problems: ["sequence modeling"],
        datasets: [],
        exclude_terms: [],
      },
    });

    assert.equal(result.status, "sidecar_applied");
    assert.equal(repository.listRawReferences().length, 1);
    assert.equal(repository.listReferenceFacts()[0]?.resolutionStatus, "unbound");
    assert.equal(repository.listArtifactSidecars().length, 3);
    assert.equal(repository.listOperations({ includeCompleted: true }).length, 0);
    assert.equal(
      repository.listCacheBasis({ cacheKinds: ["citation_graph"] })[0]?.status,
      "stale",
    );

    const registry = await service.getReferenceSidecarIndex({
      sourceRefs: ["1:AAA"],
    });
    assert.equal(registry.rows[0]?.paper_ref, "1:AAA");
    assert.equal(registry.rows[0]?.artifactCoverage, "complete");
  });

  it("skips deterministic invalid references during sidecar ingestion [inv.reference.quality_gate_before_identity]", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({ root });

    const result = await service.applyLiteratureDigestSidecar({
      libraryId: 1,
      itemKey: "AAA",
      title: "Attention Paper",
      year: "2020",
      citekey: "attention2020",
      digest: { noteKey: "NDIGEST", content: "# Digest\n\nBody" },
      references: {
        noteKey: "NREFS",
        references: [
          {
            title: "https://doi.org/10.1007/978-3-319-10602-1_48",
            raw: "https://doi.org/10.1007/978-3-319-10602-1_48",
          },
          {
            title: "Sensors 18(10), 3337",
            raw: "Sensors 18(10), 3337",
          },
          {
            title:
              "Conditional DETR for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp",
            year: "2021",
            raw:
              "Conditional DETR for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp. 2021.",
          },
          {
            title: "Layer normalization",
            year: "2016",
            raw:
              "Lei Jimmy Ba, Jamie Ryan Kiros, and Geoffrey E. Hinton. Layer normalization. arXiv preprint arXiv:1607.06450, 2016.",
          },
        ],
      },
      citationAnalysis: { noteKey: "NCITE", payloadHash: "sha256:cite" },
    });

    const rawReferences = repository.listRawReferences();
    assert.equal(result.reference_count, 2);
    assert.equal(rawReferences.length, 2);
    assert.sameMembers(
      rawReferences.map((row) => row.parsedTitle),
      [
        "Conditional DETR for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp",
        "Layer normalization",
      ],
    );
    assert.equal(repository.listCanonicalReferences().length, 2);
    assert.include(
      JSON.parse(rawReferences[0]?.diagnosticsJson || "[]")
        .map((entry: { code?: string }) => entry.code)
        .concat(
          JSON.parse(rawReferences[1]?.diagnosticsJson || "[]").map(
            (entry: { code?: string }) => entry.code,
          ),
        ),
      "bibliographic_suffix_in_title",
    );
  });

  it("persists explicit reference matching decisions as graph-affecting state", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({
      root,
      registryInputs: [
        {
          libraryId: 1,
          itemKey: "AAA",
          title: "Attention Paper",
          year: "2020",
          notes: [],
        },
        {
          libraryId: 1,
          itemKey: "BBB",
          title: "Detection Transformer",
          year: "2021",
          notes: [],
        },
      ],
    });

    await service.applyLiteratureDigestSidecar({
      libraryId: 1,
      itemKey: "BBB",
      title: "Detection Transformer",
      year: "2021",
      citekey: "detr2021",
      digest: { noteKey: "TDIGEST", content: "# Target" },
      references: { noteKey: "TREFS", references: [] },
      citationAnalysis: { noteKey: "TCITE", payloadHash: "sha256:target" },
    });
    const applied = await service.applyReferenceMatchingSidecar({
      libraryId: 1,
      itemKey: "AAA",
      title: "Attention Paper",
      year: "2020",
      citekey: "attention2020",
      references: [{ title: "Detection Transformer", citekey: "detr2021" }],
      matchedItems: [
        {
          libraryId: 1,
          itemKey: "BBB",
          title: "Detection Transformer",
          year: "2021",
          citekey: "detr2021",
        },
      ],
    });

    assert.equal(applied.matched_count, 1);
    assert.equal(repository.listReferenceBindings().length, 1);
    await service.rebuildCitationGraphCacheNow();
    assert.equal(repository.listCitationEdges()[0]?.edgeStatus, "accepted");
    const graph = await service.readCitationGraphSnapshot();
    assert.equal(
      graph.nodes.find((node) => node.node_id === "zotero:item:AAA")?.title,
      "Attention Paper",
    );
    assert.equal(
      repository.getCacheBasis("citation-graph:library")?.status,
      "ready",
    );
  });

  it("reads Zotero titles for sidecar-only index rows", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    repository.upsertArtifactSidecar({
      sourceRef: "1:AAA",
      libraryId: 1,
      itemKey: "AAA",
      artifactType: "references",
      status: "available",
      artifactHash: "sha256:refs",
    });
    const { service } = makeService({
      root,
      repository,
      libraryAdapter: {
        async getRegistryInputs() {
          return [];
        },
        async getRegistryInputForItem() {
          return {
            libraryId: 1,
            itemKey: "AAA",
            title: "Zotero Library Title",
            year: "2024",
            notes: [],
          };
        },
      },
    });

    const index = await service.getReferenceSidecarIndex({
      sourceRefs: ["1:AAA"],
    });

    assert.equal(index.rows[0]?.title, "Zotero Library Title");
  });

  it("runs explicit cache refresh with progress and preserves last-good cache on failure", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const citationGraphPapers = [
      {
        libraryId: 1,
        itemKey: "AAA",
        title: "Attention Paper",
        year: "2020",
        citekey: "attention2020",
        references: [{ title: "Detection Transformer", citekey: "detr2021" }],
      },
      {
        libraryId: 1,
        itemKey: "BBB",
        title: "Detection Transformer",
        year: "2021",
        citekey: "detr2021",
        references: [],
      },
    ];
    const { service } = makeService({ root, repository, citationGraphPapers });
    let progressCalls = 0;

    const ready = await service.refreshReferenceSidecarNow({
      onProgress: () => {
        progressCalls += 1;
      },
    });
    assert.equal(
      repository.getCacheBasis("citation-graph:library")?.status,
      "stale",
    );
    assert.equal(repository.listCitationEdges().length, 0);

    await service.rebuildCitationGraphCacheNow();

    assert.equal(ready.status, "ready");
    assert.isAtLeast(progressCalls, 3);
    assert.equal(repository.getCacheBasis("reference-sidecar:library")?.status, "ready");
    assert.equal(repository.getCacheBasis("citation-graph:library")?.status, "ready");

    const failing = makeService({
      root,
      repository,
      libraryAdapter: {
        getRegistryInputs: async () => [],
        getLibraryIndex: async () => ({
          libraryId: 1,
          papers: [],
          tags: [],
          collections: [],
          diagnostics: [],
        }),
        getCitationGraphInputs: async () => [],
        readPaperArtifacts: async () => ({ artifacts: [], diagnostics: [] }),
        scanArtifactSidecars: async () => {
          throw new Error("forced scan failure");
        },
      },
    }).service;
    const failed = await failing.refreshReferenceSidecarNow();

    assert.equal(failed.status, "ready");
    assert.equal(repository.getCacheBasis("reference-sidecar:library")?.status, "ready");
    assert.equal(repository.getCacheBasis("citation-graph:library")?.status, "ready");
  });

  it("profiles reference sidecar and citation graph rebuild phases", async function () {
    const root = await makeRuntimeRoot();
    resetSynthesisJobProfilerForTests(root);
    const { service } = makeService({
      root,
      citationGraphPapers: [
        {
          libraryId: 1,
          itemKey: "AAA",
          title: "Attention Paper",
          references: [{ title: "Detection Transformer" }],
        },
      ],
    });

    await service.refreshReferenceSidecarNow();
    await service.rebuildCitationGraphCacheNow();

    const snapshot = await readSynthesisJobProfilerSnapshotForTests(root);
    const runNames = snapshot.runs.map((run) => run.job_name);
    assert.include(runNames, "synthesis:reference-sidecar");
    assert.include(runNames, "synthesis:citation-graph-cache");

    const graphRun = snapshot.runs.find(
      (run) => run.job_name === "synthesis:citation-graph-cache",
    );
    assert.equal(graphRun?.status, "completed");
    assert.includeMembers(
      snapshot.phases
        .filter((phase) => phase.run_id === graphRun?.run_id)
        .map((phase) => phase.phase_name),
      [
        "load_sidecar_inputs",
        "load_source_metadata",
        "build_graph_records",
        "replace_graph_cache",
        "hash_and_commit",
      ],
    );
  });

  it("does not surface stale failed sidecar operations after a ready cache basis", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({
      root,
      citationGraphPapers: [
        {
          libraryId: 1,
          itemKey: "AAA",
          title: "Attention Paper",
          references: [{ title: "Detection Transformer" }],
        },
      ],
    });

    await service.refreshReferenceSidecarNow();
    repository.upsertOperation({
      operationId: "old-reference-sidecar-failed",
      operationType: "reference_sidecar_refresh",
      libraryId: 1,
      status: "failed",
      label: "Reference sidecar refresh",
      progressMode: "indeterminate",
      diagnosticsJson: JSON.stringify([{ code: "legacy_failed_state" }]),
      completedAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
    });

    const snapshot = await service.getSynthesisSnapshot();

    assert.equal(snapshot.registry.cacheStatus.status, "ready");
    assert.isFalse(
      snapshot.maintenance.backgroundJobs.rows.some(
        (row) =>
          row.source === "reference_sidecar_refresh" &&
          row.status === "failed",
      ),
    );
  });

  it("keeps MCP-style reads side-effect free for operations and cache rows", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({ root });

    await service.getReferenceSidecarIndex({ sourceRefs: ["1:MISSING"] });
    await service.getCitationGraphMetrics({ paperRefs: ["1:MISSING"] });

    assert.equal(repository.listOperations({ includeCompleted: true }).length, 0);
    assert.equal(repository.listCacheBasis().length, 0);
  });

  it("does not scan the Zotero library or write sidecar rows during service startup", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    let scans = 0;

    createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      libraryAdapter: {
        getRegistryInputs: async () => {
          scans += 1;
          return [];
        },
        getLibraryIndex: async () => {
          scans += 1;
          return {
            libraryId: 1,
            papers: [],
            tags: [],
            collections: [],
            diagnostics: [],
          };
        },
        getCitationGraphInputs: async () => {
          scans += 1;
          return [];
        },
        readPaperArtifacts: async () => {
          scans += 1;
          return { artifacts: [], diagnostics: [] };
        },
      },
    });

    assert.equal(scans, 0);
    assert.equal(repository.listOperations({ includeCompleted: true }).length, 0);
    assert.equal(repository.listCacheBasis().length, 0);
  });

  it("runs related-items sync only as an explicit provenance-protected operation", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({ root });
    const relations = new Set<string>();
    const stats = { reads: 0, adds: 0, removes: 0 };

    await service.applyReferenceMatchingSidecar({
      libraryId: 1,
      itemKey: "AAA",
      title: "Attention Paper",
      citekey: "attention2020",
      references: [{ title: "Detection Transformer", citekey: "detr2021" }],
      matchedItems: [
        {
          libraryId: 1,
          itemKey: "BBB",
          title: "Detection Transformer",
          citekey: "detr2021",
        },
      ],
    });

    const result = await service.syncRelatedItemsNow({
      host: {
        hasRelatedItem(args) {
          stats.reads += 1;
          return relations.has(`${args.sourceItemKey}->${args.targetItemKey}`);
        },
        addRelatedItem(args) {
          stats.adds += 1;
          relations.add(`${args.sourceItemKey}->${args.targetItemKey}`);
        },
        removeRelatedItem(args) {
          stats.removes += 1;
          relations.delete(`${args.sourceItemKey}->${args.targetItemKey}`);
        },
      },
    });

    assert.equal(result.added, 1);
    assert.equal(stats.reads, 1);
    assert.equal(stats.adds, 1);
    assert.equal(stats.removes, 0);
    assert.equal(
      repository.listRelatedItemsSyncEffects()[0]?.status,
      "pending_external_write",
    );
    assert.equal(
      repository.listOperations({ includeCompleted: true })[0]?.operationType,
      "related_items_sync",
    );
  });
});
