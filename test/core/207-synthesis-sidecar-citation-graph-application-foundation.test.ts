import { assert } from "chai";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  rebuildSynthesisCitationGraphApplicationLayoutRequest,
  rebuildSynthesisCitationGraphApplicationInspectResult,
  rebuildSynthesisCitationGraphApplicationMetricsRequest,
  rebuildSynthesisCitationGraphApplicationMutationResult,
  rebuildSynthesisCitationGraphApplicationRebuildRequest,
  rebuildSynthesisCitationGraphApplicationSliceRequest,
} from "../../packages/synthesis-contracts/src/citationGraphApplication";
import {
  createSynthesisCitationGraphApplication,
  type SynthesisCitationGraphApplicationCompute,
} from "../../packages/synthesis-application/src/citationGraphApplication";
import { computeSynthesisCitationGraphMetrics } from "../../packages/synthesis-engine/src/index";
import {
  SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
  computeSynthesisCitationGraphBuild,
} from "../../packages/synthesis-engine/src/citationGraphBuild";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";
import { openSynthesisNodeSqliteAdapter } from "../../apps/synthesis-service/src/repositoryNodeSqlite";
import { createSynthesisSidecarComputeWorkerPool } from "../../apps/synthesis-service/src/computeWorkerPool";
import { createSynthesisSidecarCitationGraphApplication } from "../../apps/synthesis-service/src/citationGraphApplicationNode";

const PROFILE_ID = "c".repeat(64);
const DATA_ROOT_ID = "d".repeat(64);
const layoutPool = createSynthesisSidecarComputeWorkerPool();

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "zs-graph-application-"));
}

function buildInput(title = "Alpha") {
  return {
    contractVersion: SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
    scope: { kind: "full", sourceIds: ["paper:a", "paper:b"] },
    rolePriority: ["background"],
    libraryNodes: [
      {
        nodeId: "paper:a",
        title,
        year: "2020",
        authors: ["A"],
        aliases: [],
      },
      {
        nodeId: "paper:b",
        title: "Beta",
        year: "2024",
        authors: ["B"],
        aliases: [],
      },
    ],
    references: [
      {
        referenceId: "reference:1",
        edgeId: "edge:1",
        sourceId: "paper:a",
        targetId: "paper:b",
        targetKind: "library_paper",
        targetAuthors: ["B"],
        targetAliases: [],
        roles: ["background"],
        weight: 1,
      },
    ],
  };
}

function buildInputWithSingleSourceExternal() {
  const input = buildInput();
  return {
    ...input,
    references: [
      ...input.references,
      {
        referenceId: "reference:external",
        edgeId: "edge:0-external",
        sourceId: "paper:a",
        targetId: "external:reference",
        targetKind: "external_reference" as const,
        targetTitle: "Single-source external",
        targetAuthors: [],
        targetAliases: [],
        roles: ["background"],
        weight: 1,
      },
    ],
  };
}

const compute: SynthesisCitationGraphApplicationCompute = {
  async build(request) {
    return computeSynthesisCitationGraphBuild(request);
  },
  async metrics(request) {
    return computeSynthesisCitationGraphMetrics(request);
  },
  async layout(request) {
    return layoutPool.runCitationGraphLayout(request);
  },
};

describe("Synthesis sidecar Citation Graph application foundation", function () {
  this.timeout(15_000);
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  after(async function () {
    await layoutPool.shutdown();
  });

  it("strictly rebuilds full-only mutation and bounded read requests", function () {
    assert.deepEqual(
      rebuildSynthesisCitationGraphApplicationSliceRequest({
        rootNodeId: "paper:a",
      }),
      {
        rootNodeId: "paper:a",
        depth: 1,
        direction: "both",
        roleFilter: [],
        includeLowSignal: false,
        maxNodes: 80,
        maxEdges: 160,
      },
    );
    assert.deepEqual(
      rebuildSynthesisCitationGraphApplicationMetricsRequest({}),
      { cursor: "", limit: 25, sortBy: "foundation", paperRefs: [] },
    );
    assert.deepEqual(
      rebuildSynthesisCitationGraphApplicationLayoutRequest({
        preset: "force",
      }),
      {
        preset: "force",
        scope: { kind: "full" },
        maxNodes: 200,
        maxEdges: 500,
      },
    );
    assert.throws(() =>
      rebuildSynthesisCitationGraphApplicationSliceRequest({
        rootNodeId: "paper:a",
        depth: 3,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisCitationGraphApplicationMetricsRequest({ limit: 101 }),
    );
    assert.throws(() =>
      rebuildSynthesisCitationGraphApplicationLayoutRequest({
        preset: "force",
        unknown: true,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisCitationGraphApplicationRebuildRequest({
        expectedGraphHash: null,
        force: false,
        input: {
          ...buildInput(),
          scope: { kind: "source_slice", sourceIds: [] },
        },
      }),
    );
    assert.deepEqual(
      rebuildSynthesisCitationGraphApplicationInspectResult({
        graphHash: null,
        inputHash: null,
        metricsHash: null,
        nodeCount: 0,
        edgeCount: 0,
        metricsReady: false,
        layoutPresets: [],
      }),
      {
        graphHash: null,
        inputHash: null,
        metricsHash: null,
        nodeCount: 0,
        edgeCount: 0,
        metricsReady: false,
        layoutPresets: [],
      },
    );
    assert.throws(() =>
      rebuildSynthesisCitationGraphApplicationMutationResult({
        status: "promoted",
        graphHash: null,
        inputHash: null,
        metricsHash: null,
        warnings: [],
        unknown: true,
      }),
    );
  });

  it("creates, reads, rejects stale basis, recomputes layout, and persists", async function () {
    const root = tempRoot();
    roots.push(root);
    const first = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    const application = createSynthesisCitationGraphApplication({
      repository: first.store,
      compute,
      now: () => "2026-07-17T12:00:00.000Z",
    });

    const created = await application.rebuildFull({
      expectedGraphHash: null,
      force: false,
      input: buildInput(),
    });
    assert.equal(created.status, "promoted");
    assert.match(created.graphHash, /^sha256:/);
    assert.isTrue(application.inspect().metricsReady);
    assert.deepInclude(application.inspect(), { nodeCount: 2, edgeCount: 1 });

    const unchanged = await application.rebuildFull({
      expectedGraphHash: created.graphHash,
      force: false,
      input: buildInput(),
    });
    assert.equal(unchanged.status, "unchanged");
    const mismatch = await application.rebuildFull({
      expectedGraphHash: "sha256:" + "0".repeat(64),
      force: true,
      input: buildInput("Changed"),
    });
    assert.equal(mismatch.status, "basis_mismatch");
    assert.equal(application.inspect().graphHash, created.graphHash);

    const slice = application.readSlice({ rootNodeId: "paper:a" });
    assert.deepEqual(
      slice.nodes.map((node) => node.literatureItemId),
      ["paper:a", "paper:b"],
    );
    assert.deepEqual(
      slice.nodes.map((node) => JSON.parse(node.authorsJson || "[]")),
      [["A"], ["B"]],
    );
    assert.deepEqual(
      slice.edges.map((edge) => edge.edgeId),
      ["edge:1"],
    );
    const metrics = application.readMetrics({ limit: 1 });
    assert.equal(metrics.returned, 1);
    assert.isTrue(metrics.hasMore);

    const layout = await application.recomputeLayout({
      preset: "force",
      scope: { kind: "full" },
      maxNodes: 200,
      maxEdges: 500,
    });
    assert.equal(layout.status, "promoted");
    assert.isTrue(application.readLayout({ preset: "force" }).ready);

    first.close();
    const second = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const reopened = createSynthesisCitationGraphApplication({
      repository: second.store,
      compute,
    });
    assert.equal(reopened.inspect().graphHash, created.graphHash);
    assert.equal(reopened.readMetrics({ limit: 100 }).total, 2);
    assert.deepEqual(reopened.readMetrics({ limit: 1 }), metrics);
    assert.isTrue(reopened.readLayout({ preset: "force" }).ready);
    assert.deepEqual(
      reopened
        .readSlice({ rootNodeId: "paper:a" })
        .nodes.map((node) => JSON.parse(node.authorsJson || "[]")),
      [["A"], ["B"]],
    );
    second.close();
  });

  it("retains single-source external rows while excluding them from layout input", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const layoutInputs: Array<{ nodeIds: string[]; edgeIds: string[] }> = [];
    const application = createSynthesisCitationGraphApplication({
      repository: repository.store,
      compute: {
        ...compute,
        async layout(request, options) {
          layoutInputs.push({
            nodeIds: request.nodes.map((node) => node.nodeId),
            edgeIds: request.edges.map((edge) => edge.edgeId),
          });
          return compute.layout(request, options);
        },
      },
    });

    const created = await application.rebuildFull({
      expectedGraphHash: null,
      force: false,
      input: buildInputWithSingleSourceExternal(),
    });
    assert.equal(created.status, "promoted");
    const slice = application.readSlice({
      rootNodeId: "paper:a",
      includeLowSignal: true,
    });
    assert.include(
      slice.nodes.map((node) => node.literatureItemId),
      "external:reference",
    );
    assert.include(
      slice.edges.map((edge) => edge.edgeId),
      "edge:0-external",
    );

    const layout = await application.recomputeLayout({
      preset: "force",
      scope: { kind: "full" },
      maxNodes: 200,
      maxEdges: 500,
    });
    assert.equal(layout.status, "promoted");
    const explicitLayout = await application.recomputeLayout({
      preset: "radial",
      scope: {
        kind: "explicit",
        nodeIds: ["paper:a", "reference:external"],
      },
      maxNodes: 200,
      maxEdges: 500,
    });
    assert.equal(explicitLayout.status, "promoted");
    const sliceLayout = await application.recomputeLayout({
      preset: "components",
      scope: {
        kind: "slice",
        rootNodeId: "paper:a",
        depth: 1,
        direction: "both",
      },
      maxNodes: 200,
      maxEdges: 500,
    });
    assert.equal(sliceLayout.status, "promoted");
    const boundedSliceLayout = await application.recomputeLayout({
      preset: "force",
      scope: {
        kind: "slice",
        rootNodeId: "paper:a",
        depth: 1,
        direction: "both",
      },
      maxNodes: 2,
      maxEdges: 1,
    });
    assert.equal(boundedSliceLayout.status, "promoted");
    assert.deepEqual(layoutInputs, [
      { nodeIds: ["paper:a", "paper:b"], edgeIds: ["edge:1"] },
      { nodeIds: ["paper:a"], edgeIds: [] },
      { nodeIds: ["paper:a", "paper:b"], edgeIds: ["edge:1"] },
      { nodeIds: ["paper:a", "paper:b"], edgeIds: ["edge:1"] },
    ]);
    repository.close();
  });

  it("fails competing mutation immediately while reads remain responsive", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const application = createSynthesisCitationGraphApplication({
      repository: repository.store,
      compute: {
        ...compute,
        async build(request) {
          await blocked;
          return computeSynthesisCitationGraphBuild(request);
        },
      },
    });
    const first = application.rebuildFull({
      expectedGraphHash: null,
      force: false,
      input: buildInput(),
    });
    await Promise.resolve();
    const busy = await application.refreshMetrics({ expectedGraphHash: null });
    assert.equal(busy.status, "graph_application_busy");
    assert.isNull(application.inspect().graphHash);
    release();
    assert.equal((await first).status, "promoted");
    repository.close();
  });

  it("preserves last-good structure across build failure and reports post-commit metrics warning", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    const application = createSynthesisCitationGraphApplication({
      repository: repository.store,
      compute,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    const first = await application.rebuildFull({
      expectedGraphHash: null,
      force: false,
      input: buildInput(),
    });
    assert.equal(first.status, "promoted");

    const buildFailure = createSynthesisCitationGraphApplication({
      repository: repository.store,
      compute: {
        ...compute,
        async build() {
          throw Object.assign(new Error("crashed"), {
            code: "worker_crashed",
          });
        },
      },
    });
    const failed = await buildFailure.rebuildFull({
      expectedGraphHash: first.graphHash,
      force: true,
      input: buildInput("Changed"),
    });
    assert.equal(failed.status, "worker_failed");
    assert.equal(buildFailure.inspect().graphHash, first.graphHash);

    const metricsFailure = createSynthesisCitationGraphApplication({
      repository: repository.store,
      compute: {
        ...compute,
        async metrics() {
          throw Object.assign(new Error("timeout"), {
            code: "worker_timeout",
          });
        },
      },
      now: () => "2026-07-17T12:01:00.000Z",
    });
    const promoted = await metricsFailure.rebuildFull({
      expectedGraphHash: first.graphHash,
      force: true,
      input: buildInput("Committed"),
    });
    assert.equal(promoted.status, "promoted");
    assert.include(promoted.warnings, "citation_graph_metrics_refresh_failed");
    assert.notEqual(promoted.graphHash, first.graphHash);
    assert.isFalse(metricsFailure.inspect().metricsReady);
    assert.equal(
      metricsFailure.readSlice({ rootNodeId: "paper:a" }).nodes.length,
      2,
    );
    repository.close();
  });

  it("normalizes worker busy, timeout, crash, and invalid-result failures without graph writes", async function () {
    const scenarios: Array<{
      name: string;
      expected: "worker_busy" | "worker_failed";
      build: SynthesisCitationGraphApplicationCompute["build"];
    }> = [
      {
        name: "busy",
        expected: "worker_busy",
        async build() {
          throw Object.assign(new Error("busy"), { code: "worker_busy" });
        },
      },
      {
        name: "timeout",
        expected: "worker_failed",
        async build() {
          throw Object.assign(new Error("timeout"), {
            code: "worker_timeout",
          });
        },
      },
      {
        name: "crash",
        expected: "worker_failed",
        async build() {
          throw Object.assign(new Error("crash"), {
            code: "worker_crashed",
          });
        },
      },
      {
        name: "invalid result",
        expected: "worker_failed",
        async build() {
          return {} as ReturnType<typeof computeSynthesisCitationGraphBuild>;
        },
      },
    ];

    for (const scenario of scenarios) {
      const root = tempRoot();
      roots.push(root);
      const repository = openSynthesisSidecarIsolatedRepository({
        profileRuntimeRoot: root,
        profileId: PROFILE_ID,
        dataRootId: DATA_ROOT_ID,
      });
      const application = createSynthesisCitationGraphApplication({
        repository: repository.store,
        compute: { ...compute, build: scenario.build },
      });
      const result = await application.rebuildFull({
        expectedGraphHash: null,
        force: false,
        input: buildInput(),
      });
      assert.equal(result.status, scenario.expected, scenario.name);
      assert.isNull(application.inspect().graphHash, scenario.name);
      assert.deepEqual(repository.store.listCitationNodes(), [], scenario.name);
      repository.close();
    }
  });

  it("rolls back a failed full replacement and preserves the last-good graph", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    const application = createSynthesisCitationGraphApplication({
      repository: repository.store,
      compute,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    const first = await application.rebuildFull({
      expectedGraphHash: null,
      force: false,
      input: buildInput(),
    });
    assert.equal(first.status, "promoted");

    const triggerConnection = openSynthesisNodeSqliteAdapter(
      repository.paths.databasePath,
    );
    triggerConnection.adapter.run(`CREATE TRIGGER fail_graph_replace
      BEFORE INSERT ON synt_citation_node
      WHEN NEW.literature_item_id='paper:b'
      BEGIN SELECT RAISE(ABORT, 'forced graph replacement failure'); END`);
    triggerConnection.close();

    const failed = await application.rebuildFull({
      expectedGraphHash: first.graphHash,
      force: true,
      input: buildInput("Changed"),
    });
    assert.equal(failed.status, "repair_required");
    assert.equal(application.inspect().graphHash, first.graphHash);
    assert.equal(
      repository.store
        .listCitationNodes()
        .find((row) => row.literatureItemId === "paper:a")?.title,
      "Alpha",
    );
    repository.close();
  });

  it("discards superseded metrics and layout projections without changing last-good rows", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    const application = createSynthesisCitationGraphApplication({
      repository: repository.store,
      compute,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    const created = await application.rebuildFull({
      expectedGraphHash: null,
      force: false,
      input: buildInput(),
    });
    await application.recomputeLayout({ preset: "force" });
    const state = repository.store.getCitationGraphApplicationState();
    const metricsBefore = repository.store.listCitationComplexMetrics();
    const layoutBefore = repository.store.listCitationGraphLayouts();
    const supersededHash = `sha256:${"f".repeat(64)}`;

    assert.isFalse(
      repository.store.promoteCitationGraphComplexMetrics({
        expectedGraphHash: supersededHash,
        metricsHash: supersededHash,
        records: [],
        now: "2026-07-17T12:01:00.000Z",
      }),
    );
    assert.isFalse(
      repository.store.promoteCitationGraphLayout({
        expectedGraphHash: supersededHash,
        record: {
          layoutKey: "superseded:force",
          viewKey: "superseded",
          preset: "force",
          graphHash: supersededHash,
          status: "ready",
          layoutJson: "{}",
        },
        now: "2026-07-17T12:01:00.000Z",
      }),
    );
    assert.equal(state?.graphHash, created.graphHash);
    assert.deepEqual(
      repository.store.listCitationComplexMetrics(),
      metricsBefore,
    );
    assert.deepEqual(repository.store.listCitationGraphLayouts(), layoutBefore);
    repository.close();
  });

  it("stops admission and drains active compute before repository closure", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const application = createSynthesisCitationGraphApplication({
      repository: repository.store,
      compute: {
        ...compute,
        build(request, options) {
          return new Promise((resolve, reject) => {
            const abort = () =>
              reject(
                Object.assign(new Error("canceled"), {
                  code: "worker_canceled",
                }),
              );
            if (options?.signal?.aborted) abort();
            else
              options?.signal?.addEventListener("abort", abort, {
                once: true,
              });
            void request;
            void resolve;
          });
        },
      },
    });
    const active = application.rebuildFull({
      expectedGraphHash: null,
      force: false,
      input: buildInput(),
    });
    await Promise.resolve();
    await application.shutdown();
    assert.equal((await active).status, "stopping");
    assert.equal(
      (
        await application.rebuildFull({
          expectedGraphHash: null,
          force: false,
          input: buildInput(),
        })
      ).status,
      "stopping",
    );
    repository.close();
    const reopened = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.isNull(reopened.store.getCitationGraphApplicationState());
    reopened.close();
  });

  it("runs the private composition through real Node SQLite and the native compute worker", async function () {
    execFileSync(
      process.execPath,
      [
        path.resolve("node_modules/typescript/bin/tsc"),
        "-p",
        path.resolve("apps/synthesis-service/tsconfig.build.json"),
      ],
      { cwd: path.resolve("."), stdio: "pipe" },
    );
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const pool = createSynthesisSidecarComputeWorkerPool();
    const application = createSynthesisSidecarCitationGraphApplication({
      repository: repository.store,
      computePool: pool,
    });
    const result = await application.rebuildFull({
      expectedGraphHash: null,
      force: false,
      input: buildInput(),
    });
    assert.equal(result.status, "promoted");
    assert.isTrue(application.inspect().metricsReady);
    assert.equal(
      (
        await application.recomputeLayout({
          preset: "components",
          scope: { kind: "full" },
          maxNodes: 200,
          maxEdges: 500,
        })
      ).status,
      "promoted",
    );
    await application.shutdown();
    repository.close();
    await pool.shutdown();
  });

  it("keeps the Rust Citation Graph owner typed and represented in the parity corpus", function () {
    const projectRoot = path.resolve(process.cwd());
    const source = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs",
      ),
      "utf8",
    );
    const repository = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs",
      ),
      "utf8",
    );
    const corpus = JSON.parse(
      fs.readFileSync(
        path.join(
          projectRoot,
          "packages/synthesis-contracts/contract-set/synthesis-citation-reference-application-parity-v1/corpus.json",
        ),
        "utf8",
      ),
    );
    assert.include(source, "pub trait CitationGraphComputePort");
    assert.include(source, "pub fn rebuild_full");
    assert.include(repository, "pub struct CitationGraphReplacement");
    assert.notInclude(repository, "list_citation_application_rows");
    assert.include(corpus.coverage.citationGraph, "busy_cancel_drain_reopen");
  });
});
