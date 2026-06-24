import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import {
  SYNTHESIS_ALLOWED_CITATION_FUNCTIONS,
  createSynthesisService,
} from "../../src/modules/synthesis/service";
import {
  listNotePayloadBlocks,
  renderPayloadBlock,
} from "../../src/modules/notePayloadCodec";
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
  registryInputs?: any[] | null;
  citationGraphPapers?: any[];
  libraryAdapter?: any;
  relatedItemsSyncHost?: any;
}) {
  const repository =
    args.repository || createSynthesisRepository({ runtimeRoot: args.root });
  const service = createSynthesisService({
    root: args.root,
    runtimeRoot: args.root,
    libraryId: 1,
    synthesisRepository: repository,
    registryInputs:
      args.registryInputs === null ? undefined : args.registryInputs || [],
    citationGraphPapers: args.citationGraphPapers,
    libraryAdapter: args.libraryAdapter,
    relatedItemsSyncHost: args.relatedItemsSyncHost,
  });
  return { service, repository };
}

function embeddedPayloadBlocks(args: Parameters<typeof renderPayloadBlock>[0]) {
  const html = renderPayloadBlock(args);
  return {
    html,
    payloadBlocks: listNotePayloadBlocks(html).map((block) => ({
      ...block,
      source: "embedded-image-attachment",
      sourceStorage: "embedded-image-attachment",
    })),
  };
}

describe("Synthesis sidecar cache hard cut", function () {
  it("keeps the citation role allowlist aligned with literature-analysis runtime", async function () {
    const runtimeSource = await fs.readFile(
      path.join(
        process.cwd(),
        "skills_builtin/literature-analysis/scripts/analysis_runtime/deterministic_core.py",
      ),
      "utf8",
    );
    const allowedBlock = runtimeSource.match(
      /ALLOWED_CITATION_FUNCTIONS\s*=\s*\{([\s\S]*?)\}/,
    );
    assert.isNotNull(allowedBlock);
    const runtimeValues = Array.from(
      allowedBlock?.[1].matchAll(/"([^"]+)"/g) || [],
      (match) => match[1],
    ).sort();

    assert.deepEqual(
      [...SYNTHESIS_ALLOWED_CITATION_FUNCTIONS].sort(),
      runtimeValues,
    );
    assert.include(runtimeValues, "uncategorized");
  });

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

  it("direct-writes digest sidecar facts and skips graph bootstrap when missing", async function () {
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
    assert.equal(
      repository.listReferenceFacts()[0]?.resolutionStatus,
      "unbound",
    );
    assert.equal(repository.listArtifactSidecars().length, 3);
    const operations = repository.listOperations({ includeCompleted: true });
    assert.notInclude(
      operations.map((operation) => operation.operationType),
      "citation_graph_cache_incremental_refresh",
    );
    assert.notInclude(
      operations.map((operation) => operation.operationType),
      "related_items_sync",
    );
    const graphBasis = repository.getCacheBasis("citation-graph:library");
    assert.equal(graphBasis?.status, "stale");
    assert.include(graphBasis?.diagnosticsJson || "", "1:AAA");
    assert.include(
      graphBasis?.diagnosticsJson || "",
      "citation_graph_cache_stale_delta",
    );
    const relatedBasis = repository.getCacheBasis("related-items-sync:global");
    assert.equal(relatedBasis?.status, "stale");
    assert.include(relatedBasis?.diagnosticsJson || "", "1:AAA");
    assert.include(
      relatedBasis?.diagnosticsJson || "",
      "related_items_sync_stale_delta",
    );

    const registry = await service.getReferenceSidecarIndex({
      sourceRefs: ["1:AAA"],
    });
    assert.equal(registry.rows[0]?.paper_ref, "1:AAA");
    assert.equal(registry.rows[0]?.artifactCoverage, "complete");
  });

  it("treats unchanged literature-analysis reruns as sidecar governance no-ops", async function () {
    const root = await makeRuntimeRoot();
    let tick = 0;
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => `2026-06-15T00:00:0${tick++}.000Z`,
    });
    const { service } = makeService({ root, repository });
    const input = {
      libraryId: 1,
      itemKey: "AAA",
      title: "Attention Paper",
      year: "2020",
      digest: { noteKey: "NDIGEST", content: "# Digest\n\nBody" },
      references: {
        noteKey: "NREFS",
        references: [{ title: "Detection Transformer", year: "2021" }],
      },
      citationAnalysis: { noteKey: "NCITE", payloadHash: "sha256:cite" },
      matchedReferences: [{ title: "Detection Transformer", itemKey: "BBB" }],
    };

    await service.applyLiteratureDigestSidecar(input);
    const graphBasis = repository.getCacheBasis("citation-graph:library");
    const relatedBasis = repository.getCacheBasis("related-items-sync:global");

    const rerun = await service.applyLiteratureDigestSidecar(input);

    assert.equal((rerun as { unchanged?: boolean }).unchanged, true);
    assert.equal(
      repository.getCacheBasis("citation-graph:library")?.updatedAt,
      graphBasis?.updatedAt,
    );
    assert.equal(
      repository.getCacheBasis("related-items-sync:global")?.updatedAt,
      relatedBasis?.updatedAt,
    );
    assert.lengthOf(
      repository.listRawReferences({
        sourceRefs: ["1:AAA"],
        statuses: ["stale"],
      }),
      0,
    );
  });

  it("persists best-effort citation roles from literature-analysis apply", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({ root });

    await service.applyLiteratureDigestSidecar({
      libraryId: 1,
      itemKey: "AAA",
      title: "Attention Paper",
      year: "2020",
      digest: { noteKey: "NDIGEST", content: "# Digest\n\nBody" },
      references: {
        noteKey: "NREFS",
        references: [
          { id: "ref-1", title: "Background Paper", year: "2021" },
          { id: "ref-2", title: "Method Paper", year: "2022" },
          { id: "ref-3", title: "Tool Paper", year: "2023" },
        ],
      },
      citationAnalysis: {
        noteKey: "NCITE",
        payloadHash: "sha256:cite",
        payload: {
          citation_analysis: {
            items: [
              { ref_index: 0, function: "background" },
              { ref_index: 1, function: "method" },
              { ref_index: 2, function: "uncategorized" },
            ],
          },
        },
      },
    });

    const rawRoles = repository
      .listRawReferences()
      .map((row) =>
        JSON.parse(row.rolesJson || "[]").map(
          (entry: { role?: string }) => entry.role,
        ),
      );
    assert.deepEqual(rawRoles, [["background"], ["unknown"], ["unknown"]]);

    await service.rebuildCitationGraphCacheNow();
    const edgeRoles = repository
      .listCitationEdges()
      .map((edge) =>
        JSON.parse(edge.rolesJson || "[]").map(
          (entry: { role?: string }) => entry.role,
        ),
      );
    assert.deepEqual(edgeRoles, [["background"], ["unknown"], ["unknown"]]);
  });

  it("refreshes reference sidecars with citation roles from Zotero citation analysis artifacts", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({
      root,
      registryInputs: [
        {
          libraryId: 1,
          itemKey: "AAA",
          title: "Attention Paper",
          year: "2020",
          notes: [
            {
              key: "NREFS",
              title: "References",
              html: renderPayloadBlock({
                payloadType: "references-json",
                payload: {
                  references: [
                    { id: "ref-1", title: "Baseline Paper", year: "2021" },
                    { id: "ref-2", title: "Dataset Paper", year: "2022" },
                    { id: "ref-3", title: "Generic Paper", year: "2023" },
                  ],
                },
              }),
            },
            {
              key: "NCITE",
              title: "Citation Analysis",
              html: renderPayloadBlock({
                payloadType: "citation-analysis-json",
                payload: {
                  citation_analysis: {
                    items: [
                      { ref_index: 0, function: "baseline" },
                      { ref_index: 1, function: "dataset" },
                      { ref_index: 2, function: "citation" },
                    ],
                  },
                },
              }),
            },
          ],
        },
      ],
    });

    await service.refreshReferenceSidecarNow();
    const rawRoles = repository
      .listRawReferences()
      .map((row) =>
        JSON.parse(row.rolesJson || "[]").map(
          (entry: { role?: string }) => entry.role,
        ),
      );
    assert.deepEqual(rawRoles, [["baseline"], ["dataset"], ["unknown"]]);

    await service.rebuildCitationGraphCacheNow();
    assert.deepEqual(
      repository
        .listCitationEdges()
        .map((edge) => JSON.parse(edge.rolesJson || "[]")[0]?.role),
      ["baseline", "dataset", "unknown"],
    );
  });

  it("verifies incomplete visible Index rows against current Zotero artifacts", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({
      root,
      libraryAdapter: {
        async getRegistryInputs() {
          throw new Error("full registry scan must not be used");
        },
        async getRegistryInputsPage() {
          return [
            {
              libraryId: 1,
              itemKey: "AAA",
              title: "Current Paper",
              notes: [],
            },
          ];
        },
        async getRegistryInputForItem() {
          return {
            libraryId: 1,
            itemKey: "AAA",
            title: "Current Paper",
            notes: [
              {
                key: "REFS",
                title: "References",
                ...embeddedPayloadBlocks({
                  payloadType: "references-json",
                  payload: { references: [{ title: "Actual Reference" }] },
                }),
              },
            ],
          };
        },
      },
    });
    repository.upsertArtifactSidecar({
      sourceRef: "1:AAA",
      libraryId: 1,
      itemKey: "AAA",
      artifactType: "references",
      status: "missing",
      artifactHash: "",
      locatorJson: "{}",
      diagnosticsJson: "[]",
      scannedAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    });

    const input = await service.getSynthesisWorkbenchSurfaceInput("index");
    const row = input.registry?.rows?.[0];

    assert.equal(row?.paper_ref, "1:AAA");
    assert.equal(row?.artifactCoverage, "partial");
    assert.notInclude(row?.missing_artifacts || [], "references");
  });

  it("keeps sidecar artifact diagnostics and locators consistent with cached artifact status", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const { service } = makeService({
      root,
      repository,
      libraryAdapter: {
        async getRegistryInputsPage() {
          return [
            {
              libraryId: 1,
              itemKey: "AAA",
              title: "Current Paper",
              notes: [],
            },
          ];
        },
        async getRegistryInputForItem() {
          return null;
        },
      },
    });
    repository.upsertArtifactSidecar({
      sourceRef: "1:AAA",
      libraryId: 1,
      itemKey: "AAA",
      artifactType: "digest",
      status: "available",
      artifactHash: "sha256:digest",
      locatorJson: JSON.stringify({
        note_key: "NDIGEST",
        note_title: "Digest",
        payload_type: "digest-markdown",
      }),
      diagnosticsJson: "[]",
      scannedAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    });
    repository.upsertArtifactSidecar({
      sourceRef: "1:AAA",
      libraryId: 1,
      itemKey: "AAA",
      artifactType: "references",
      status: "available",
      artifactHash: "sha256:refs",
      locatorJson: JSON.stringify({
        note_key: "NREFS",
        note_title: "References",
        payload_type: "references-json",
      }),
      diagnosticsJson: "[]",
      scannedAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    });
    repository.upsertArtifactSidecar({
      sourceRef: "1:AAA",
      libraryId: 1,
      itemKey: "AAA",
      artifactType: "citation_analysis",
      status: "available",
      artifactHash: "sha256:cite",
      locatorJson: JSON.stringify({
        note_key: "NCITE",
        note_title: "Citation Analysis",
        payload_type: "citation-analysis-json",
      }),
      diagnosticsJson: "[]",
      scannedAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    });

    const index = await service.getReferenceSidecarIndex({ limit: 1 });
    const row = index.rows[0];

    assert.equal(row?.artifactCoverage, "complete");
    assert.deepEqual(row?.diagnostics || [], []);
    assert.equal(row?.artifacts.digest.note_key, "NDIGEST");
    assert.equal(row?.artifacts.references.note_title, "References");
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
            title: "None",
            raw: "Arandjelovic, R.",
          },
          {
            title:
              "Conditional DETR for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp",
            year: "2021",
            raw: "Conditional DETR for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp. 2021.",
          },
          {
            title: "Layer normalization",
            year: "2016",
            raw: "Lei Jimmy Ba, Jamie Ryan Kiros, and Geoffrey E. Hinton. Layer normalization. arXiv preprint arXiv:1607.06450, 2016.",
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

  it("returns nested reference facts only when reference rows are requested", async function () {
    const root = await makeRuntimeRoot();
    const { service } = makeService({
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
    await service.applyReferenceMatchingSidecar({
      libraryId: 1,
      itemKey: "AAA",
      title: "Attention Paper",
      year: "2020",
      references: [
        { title: "Detection Transformer", year: "2021" },
        { title: "External Reference", year: "2022" },
      ],
      matchedItems: [
        {
          libraryId: 1,
          itemKey: "BBB",
          title: "Detection Transformer",
          year: "2021",
        },
      ],
    });

    const defaultIndex = await service.getReferenceSidecarIndex({
      sourceRefs: ["1:AAA"],
    });
    assert.notProperty(defaultIndex.rows[0] || {}, "references");

    const index = await service.getReferenceSidecarIndex({
      sourceRefs: ["1:AAA"],
      includeReferences: true,
      referenceSourceRefs: ["1:AAA"],
    });
    const references = index.rows[0]?.references || [];
    assert.lengthOf(references, 2);
    assert.equal(references[0]?.reference_index, 0);
    assert.equal(references[0]?.target_paper_ref, "1:BBB");
    assert.equal(references[0]?.target_binding, "library");
    assert.equal(references[0]?.binding_status, "accepted");
    assert.equal(index.rows[0]?.reference_count, 2);

    const filtered = await service.getReferenceSidecarIndex({
      sourceRefs: ["1:AAA"],
      rawReferenceIds: [references[0].reference_instance_id],
    });
    assert.lengthOf(filtered.rows[0]?.references || [], 1);
    assert.equal(
      filtered.rows[0]?.references?.[0]?.reference_instance_id,
      references[0].reference_instance_id,
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
    const { service } = makeService({
      root,
      repository,
      registryInputs: null,
      citationGraphPapers,
    });
    let progressCalls = 0;

    const ready = await service.refreshReferenceSidecarNow({
      onProgress: () => {
        progressCalls += 1;
      },
    });

    assert.equal(ready.status, "ready");
    assert.isAtLeast(progressCalls, 3);
    assert.equal(
      repository.getCacheBasis("reference-sidecar:library")?.status,
      "ready",
    );
    const graphBasis = repository.getCacheBasis("citation-graph:library");
    assert.equal(graphBasis?.status, "stale");
    assert.include(graphBasis?.diagnosticsJson || "", "1:AAA");
    assert.include(
      graphBasis?.diagnosticsJson || "",
      "citation_graph_cache_stale_delta",
    );
    const relatedBasis = repository.getCacheBasis("related-items-sync:global");
    assert.equal(relatedBasis?.status, "stale");
    assert.include(relatedBasis?.diagnosticsJson || "", "1:AAA");
    assert.include(
      relatedBasis?.diagnosticsJson || "",
      "related_items_sync_stale_delta",
    );
    const operationTypes = repository
      .listOperations({ includeCompleted: true })
      .map((operation) => operation.operationType);
    assert.notInclude(
      operationTypes,
      "citation_graph_cache_incremental_refresh",
    );
    assert.notInclude(operationTypes, "related_items_sync");

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
    assert.equal(
      repository.getCacheBasis("reference-sidecar:library")?.status,
      "ready",
    );
    assert.equal(
      repository.getCacheBasis("citation-graph:library")?.status,
      "stale",
    );
  });

  it("refreshes citation graph source slices without replacing unrelated rows", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({
      root,
      registryInputs: [
        { libraryId: 1, itemKey: "AAA", title: "Source A", notes: [] },
        { libraryId: 1, itemKey: "BBB", title: "Target B", notes: [] },
        { libraryId: 1, itemKey: "CCC", title: "Source C", notes: [] },
        { libraryId: 1, itemKey: "DDD", title: "Target D", notes: [] },
        { libraryId: 1, itemKey: "EEE", title: "Target E", notes: [] },
      ],
    });

    await service.applyReferenceMatchingSidecar({
      libraryId: 1,
      itemKey: "AAA",
      title: "Source A",
      references: [{ title: "Target B", citekey: "b" }],
      matchedItems: [
        { libraryId: 1, itemKey: "BBB", title: "Target B", citekey: "b" },
      ],
    });
    await service.applyReferenceMatchingSidecar({
      libraryId: 1,
      itemKey: "CCC",
      title: "Source C",
      references: [{ title: "Target D", citekey: "d" }],
      matchedItems: [
        { libraryId: 1, itemKey: "DDD", title: "Target D", citekey: "d" },
      ],
    });
    await service.rebuildCitationGraphCacheNow();

    assert.sameMembers(
      repository
        .listCitationEdges({ statuses: ["accepted"] })
        .map(
          (edge) =>
            `${edge.sourceLiteratureItemId}->${edge.targetLiteratureItemId}`,
        ),
      ["1:AAA->1:BBB", "1:CCC->1:DDD"],
    );

    await service.applyReferenceMatchingSidecar({
      libraryId: 1,
      itemKey: "AAA",
      title: "Source A",
      references: [{ title: "Target E", citekey: "e" }],
      matchedItems: [
        { libraryId: 1, itemKey: "EEE", title: "Target E", citekey: "e" },
      ],
    });

    assert.equal(
      repository.getCacheBasis("citation-graph:library")?.status,
      "ready",
    );
    assert.sameMembers(
      repository
        .listCitationEdges({ statuses: ["accepted"] })
        .map(
          (edge) =>
            `${edge.sourceLiteratureItemId}->${edge.targetLiteratureItemId}`,
        ),
      ["1:AAA->1:EEE", "1:CCC->1:DDD"],
    );
    assert.equal(
      repository.listCitationLightMetrics({ literatureItemIds: ["1:EEE"] })[0]
        ?.incomingCount,
      1,
    );
    assert.equal(
      repository
        .listOperations({ includeCompleted: true })
        .some(
          (operation) =>
            operation.operationType ===
            "citation_graph_cache_incremental_refresh",
        ),
      true,
    );
  });

  it("cascades sidecar binding changes across shared external canonical slices", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({
      root,
      registryInputs: [
        { libraryId: 1, itemKey: "AAA", title: "Source A", notes: [] },
        { libraryId: 1, itemKey: "BBB", title: "Shared Target", notes: [] },
        { libraryId: 1, itemKey: "CCC", title: "Source C", notes: [] },
      ],
    });

    await service.applyReferenceMatchingSidecar({
      libraryId: 1,
      itemKey: "AAA",
      title: "Source A",
      references: [{ title: "Shared Target", year: "2020" }],
    });
    await service.applyReferenceMatchingSidecar({
      libraryId: 1,
      itemKey: "CCC",
      title: "Source C",
      references: [{ title: "Shared Target", year: "2020" }],
    });
    await service.rebuildCitationGraphCacheNow();

    const initialEdges = repository.listCitationEdges();
    const sharedExternalTarget = initialEdges[0]?.targetLiteratureItemId;
    assert.match(sharedExternalTarget || "", /^cref:/);
    assert.sameMembers(
      initialEdges.map(
        (edge) =>
          `${edge.sourceLiteratureItemId}->${edge.targetLiteratureItemId}`,
      ),
      [`1:AAA->${sharedExternalTarget}`, `1:CCC->${sharedExternalTarget}`],
    );

    await service.applyReferenceMatchingSidecar({
      libraryId: 1,
      itemKey: "AAA",
      title: "Source A",
      references: [{ title: "Shared Target", year: "2020" }],
      matchedItems: [
        {
          libraryId: 1,
          itemKey: "BBB",
          title: "Shared Target",
          year: "2020",
        },
      ],
    });

    assert.equal(
      repository.getCacheBasis("citation-graph:library")?.status,
      "ready",
    );
    assert.sameMembers(
      repository
        .listCitationEdges({
          sourceLiteratureItemIds: ["1:AAA", "1:CCC"],
          statuses: ["accepted"],
        })
        .map(
          (edge) =>
            `${edge.sourceLiteratureItemId}->${edge.targetLiteratureItemId}`,
        ),
      ["1:AAA->1:BBB", "1:CCC->1:BBB"],
    );
    assert.lengthOf(
      repository.listCitationEdges({
        targetLiteratureItemIds: [sharedExternalTarget || ""],
      }),
      0,
    );
  });

  it("runs manual stale graph cache incremental refresh from cache basis delta metadata", async function () {
    const root = await makeRuntimeRoot();
    const relations = new Set<string>();
    const stats = { reads: 0, adds: 0, removes: 0 };
    const relatedItemsSyncHost = {
      hasRelatedItem(args: any) {
        stats.reads += 1;
        return relations.has(`${args.sourceItemKey}->${args.targetItemKey}`);
      },
      addRelatedItem(args: any) {
        stats.adds += 1;
        relations.add(`${args.sourceItemKey}->${args.targetItemKey}`);
      },
      removeRelatedItem(args: any) {
        stats.removes += 1;
        relations.delete(`${args.sourceItemKey}->${args.targetItemKey}`);
      },
    };
    const { service, repository } = makeService({
      root,
      registryInputs: [
        { libraryId: 1, itemKey: "AAA", title: "Source A", notes: [] },
        { libraryId: 1, itemKey: "BBB", title: "Target B", notes: [] },
      ],
      relatedItemsSyncHost,
    });

    await service.applyReferenceMatchingSidecar({
      libraryId: 1,
      itemKey: "AAA",
      title: "Source A",
      references: [{ title: "Target B", citekey: "b" }],
      matchedItems: [
        { libraryId: 1, itemKey: "BBB", title: "Target B", citekey: "b" },
      ],
    });
    await service.rebuildCitationGraphCacheNow();
    const rebuildCount = repository
      .listOperations({ includeCompleted: true })
      .filter(
        (operation) =>
          operation.operationType === "citation_graph_cache_rebuild",
      ).length;
    const relatedSyncCount = repository
      .listOperations({ includeCompleted: true })
      .filter(
        (operation) => operation.operationType === "related_items_sync",
      ).length;
    repository.upsertCacheBasis({
      cacheKey: "citation-graph:library",
      cacheKind: "citation_graph",
      scopeKind: "library",
      scopeRef: "1",
      status: "stale",
      basisKind: "test",
      basisValue: "manual-stale",
      sourceHash: "sha256:stale",
      diagnosticsJson: JSON.stringify([
        {
          code: "citation_graph_cache_stale_delta",
          severity: "info",
          reason: "test",
          source_refs: ["1:AAA"],
          changed_canonical_ids: [],
          changed_binding_canonical_ids: [],
          changed_redirect_canonical_ids: [],
        },
      ]),
      updatedAt: new Date().toISOString(),
    });

    const result = await service.refreshCitationGraphCacheIncrementalNow();

    assert.equal(result.status, "completed");
    assert.deepEqual(result.affected_source_refs, ["1:AAA"]);
    assert.equal((result as any).related_items_sync?.processed, 1);
    assert.equal((result as any).related_items_sync?.failed, 0);
    assert.equal(
      repository.getCacheBasis("citation-graph:library")?.status,
      "ready",
    );
    assert.equal(
      repository
        .listOperations({ includeCompleted: true })
        .filter(
          (operation) =>
            operation.operationType === "citation_graph_cache_rebuild",
        ).length,
      rebuildCount,
    );
    assert.include(
      repository
        .listOperations({ includeCompleted: true })
        .map((operation) => operation.operationType),
      "citation_graph_cache_incremental_refresh",
    );
    const relatedSyncOperations = repository
      .listOperations({ includeCompleted: true })
      .filter((operation) => operation.operationType === "related_items_sync");
    assert.lengthOf(relatedSyncOperations, relatedSyncCount + 1);
    assert.isTrue(
      relatedSyncOperations.some(
        (operation) =>
          operation.scopeKind === "source_ref" &&
          operation.scopeRef === "1:AAA",
      ),
    );
    assert.isAtLeast(stats.reads, 1);
  });

  it("profiles reference sidecar and citation graph rebuild phases", async function () {
    const root = await makeRuntimeRoot();
    resetSynthesisJobProfilerForTests(root);
    const { service } = makeService({
      root,
      registryInputs: null,
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
      registryInputs: null,
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
          row.source === "reference_sidecar_refresh" && row.status === "failed",
      ),
    );
  });

  it("keeps MCP-style reads side-effect free for operations and cache rows", async function () {
    const root = await makeRuntimeRoot();
    const { service, repository } = makeService({ root });

    await service.getReferenceSidecarIndex({ sourceRefs: ["1:MISSING"] });
    await service.getCitationGraphMetrics({ paperRefs: ["1:MISSING"] });

    assert.equal(
      repository.listOperations({ includeCompleted: true }).length,
      0,
    );
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
    assert.equal(
      repository.listOperations({ includeCompleted: true }).length,
      0,
    );
    assert.equal(repository.listCacheBasis().length, 0);
  });

  it("runs related-items sync from accepted sidecar edges without graph bootstrap", async function () {
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
    const rerun = await service.syncRelatedItemsNow({
      host: {
        hasRelatedItem(args) {
          stats.reads += 1;
          return relations.has(`${args.sourceItemKey}->${args.targetItemKey}`);
        },
        addRelatedItem(args) {
          stats.adds += 1;
          relations.add(`${args.sourceItemKey}->${args.targetItemKey}`);
        },
      },
    });
    assert.equal(rerun.added, 0);
    assert.equal(rerun.existing, 1);
    assert.equal(stats.reads, 2);
    assert.equal(stats.adds, 1);
    assert.equal(
      repository.listRelatedItemsSyncEffects()[0]?.status,
      "already_existed",
    );
    assert.equal(
      repository.listOperations({ includeCompleted: true })[0]?.operationType,
      "related_items_sync",
    );
  });
});
