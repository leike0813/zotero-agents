import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { execFileSync } from "node:child_process";
import { Worker } from "node:worker_threads";
import { createSynthesisSidecarComputeWorkerPool } from "../../apps/synthesis-service/src/computeWorkerPool";
import {
  SYNTHESIS_CITATION_GRAPH_COMPUTE_EDGE_MAX,
  SYNTHESIS_CITATION_GRAPH_COMPUTE_NODE_MAX,
  SYNTHESIS_CITATION_GRAPH_LAYOUT_EDGE_MAX,
  SYNTHESIS_CITATION_GRAPH_LAYOUT_NODE_MAX,
  createInProcessSynthesisCitationGraphMetricsEngine,
  rebuildSynthesisCitationGraphMetricsRequest,
  rebuildSynthesisCitationGraphMetricsResult,
  type SynthesisCitationGraphMetricsRequest,
} from "../../packages/synthesis-engine/src/index";
import { buildUnifiedCitationGraph } from "../../src/modules/synthesis/citationGraph";
import {
  buildCitationGraphMetricsEngineRequest,
  projectCitationGraphMetricsEngineResult,
} from "../../src/modules/synthesis/citationGraphMetricsEngineAdapter";

function sampleGraph() {
  return buildUnifiedCitationGraph({
    papers: [
      {
        libraryId: 1,
        itemKey: "A",
        title: "Foundation Paper",
        year: "2018",
        references: [
          { title: "Middle Paper", year: "2022", authors: ["B"] },
          { title: "External", year: "2010", authors: ["X"] },
          { raw: "unresolved" },
        ],
      },
      {
        libraryId: 1,
        itemKey: "B",
        title: "Middle Paper",
        year: "2022",
        authors: ["B"],
      },
      {
        libraryId: 1,
        itemKey: "C",
        title: "Frontier Paper",
        year: "2024",
        authors: ["C"],
        references: [{ title: "Middle Paper", year: "2022", authors: ["B"] }],
      },
      {
        libraryId: 1,
        itemKey: "D",
        title: "Old Isolated Paper",
        year: "2020",
      },
      {
        libraryId: 1,
        itemKey: "E",
        title: "Recent Isolated Paper",
        year: "2024",
      },
    ],
  });
}

function sampleRequest(
  overrides: Partial<SynthesisCitationGraphMetricsRequest> = {},
) {
  return {
    ...buildCitationGraphMetricsEngineRequest(sampleGraph()),
    ...overrides,
  };
}

describe("Synthesis Citation Graph metrics engine", function () {
  this.timeout(20_000);

  before(function () {
    execFileSync(
      "cargo",
      [
        "+1.92.0",
        "build",
        "--workspace",
        "--locked",
        "--manifest-path",
        path.resolve("native/synthesis-sidecar/Cargo.toml"),
      ],
      { stdio: "pipe" },
    );
  });

  it("canonically rebuilds requests and shares bounded graph limits", function () {
    assert.equal(SYNTHESIS_CITATION_GRAPH_COMPUTE_NODE_MAX, 5000);
    assert.equal(SYNTHESIS_CITATION_GRAPH_COMPUTE_EDGE_MAX, 20000);
    assert.equal(
      SYNTHESIS_CITATION_GRAPH_LAYOUT_NODE_MAX,
      SYNTHESIS_CITATION_GRAPH_COMPUTE_NODE_MAX,
    );
    assert.equal(
      SYNTHESIS_CITATION_GRAPH_LAYOUT_EDGE_MAX,
      SYNTHESIS_CITATION_GRAPH_COMPUTE_EDGE_MAX,
    );
    const request = sampleRequest();
    const rebuilt = rebuildSynthesisCitationGraphMetricsRequest({
      ...request,
      ignored: { safe: true },
      nodes: [...request.nodes]
        .reverse()
        .map((node) => ({ ...node, ignored: true })),
      edges: [...request.edges]
        .reverse()
        .map((edge) => ({ ...edge, ignored: true })),
    });

    assert.deepEqual(
      rebuilt.nodes.map((node) => node.nodeId),
      [...request.nodes].map((node) => node.nodeId).sort(),
    );
    assert.deepEqual(
      rebuilt.edges.map((edge) => edge.edgeId),
      [...request.edges].map((edge) => edge.edgeId).sort(),
    );
    assert.notProperty(rebuilt as Record<string, unknown>, "ignored");
    assert.notProperty(rebuilt.nodes[0] as Record<string, unknown>, "ignored");
  });

  it("rejects invalid, duplicate, dangling, non-finite, and oversized requests", function () {
    const request = sampleRequest();
    const invalid: unknown[] = [
      { ...request, ignored: () => undefined },
      { ...request, graphHash: "invalid" },
      {
        ...request,
        nodes: [...request.nodes, request.nodes[0]],
      },
      {
        ...request,
        nodes: request.nodes.map((node, index) =>
          index === 0 ? { ...node, kind: "unknown" } : node,
        ),
      },
      {
        ...request,
        edges: [...request.edges, request.edges[0]],
      },
      {
        ...request,
        edges: [
          {
            edgeId: "edge:missing",
            source: "missing",
            target: "also",
            mentionCount: 1,
          },
        ],
      },
      {
        ...request,
        edges: request.edges.map((edge, index) =>
          index === 0 ? { ...edge, mentionCount: Number.NaN } : edge,
        ),
      },
      {
        ...request,
        nodes: Array.from(
          { length: SYNTHESIS_CITATION_GRAPH_COMPUTE_NODE_MAX + 1 },
          (_, index) => ({
            nodeId: `node:${index}`,
            kind: "library_paper" as const,
            libraryId: 1,
            itemKey: `K${index}`,
          }),
        ),
        edges: [],
      },
      {
        ...request,
        nodes: [
          {
            nodeId: "node:a",
            kind: "library_paper",
            libraryId: 1,
            itemKey: "A",
          },
          {
            nodeId: "node:b",
            kind: "library_paper",
            libraryId: 1,
            itemKey: "B",
          },
        ],
        edges: Array.from(
          { length: SYNTHESIS_CITATION_GRAPH_COMPUTE_EDGE_MAX + 1 },
          (_, index) => ({
            edgeId: `edge:${index}`,
            source: "node:a",
            target: "node:b",
            mentionCount: 1,
          }),
        ),
      },
    ];

    for (const value of invalid) {
      assert.throws(() => rebuildSynthesisCitationGraphMetricsRequest(value));
    }
  });

  it("preserves metrics v2 values, roles, diagnostics, and application hash", async function () {
    const graph = sampleGraph();
    const request = buildCitationGraphMetricsEngineRequest(graph);
    const result =
      await createInProcessSynthesisCitationGraphMetricsEngine().compute(
        request,
      );
    const projected = projectCitationGraphMetricsEngineResult(request, result);
    const byId = new Map(
      projected.library_node_metrics.map((metric) => [metric.node_id, metric]),
    );

    assert.equal(
      projected.metrics_hash,
      "sha256:fac6371fc5ec31845060bd7bdeab90a7afd38e86f937cb4765587f0b8307076d",
    );
    assert.equal(projected.metrics_version, 2);
    assert.equal(projected.graph_year, 2024);
    assert.deepEqual(projected.diagnostics, {
      library_node_count: 5,
      external_reference_count: 1,
      unresolved_reference_count: 1,
      component_count: 3,
      isolated_library_node_count: 2,
      missing_year_count: 0,
    });
    assert.deepInclude(byId.get("zotero:item:B"), {
      paper_ref: "1:B",
      internal_in_degree: 2,
      internal_pagerank: 0.402985,
      foundation_score: 0.9,
      frontier_score: 0.566667,
      synthesis_role_hints: ["core", "foundation", "frontier"],
    });
    assert.deepInclude(byId.get("zotero:item:D"), {
      component_id: "component:002",
      component_size: 1,
      is_isolated: true,
      foundation_score: 0.1,
      frontier_score: 0.183333,
      synthesis_role_hints: ["isolated"],
    });
    assert.deepInclude(byId.get("zotero:item:E"), {
      component_id: "component:003",
      is_isolated: true,
      frontier_score: 0.55,
      synthesis_role_hints: ["frontier", "isolated"],
    });
  });

  it("canonically rebuilds results and requires the complete library-node set", async function () {
    const request = sampleRequest();
    const result =
      await createInProcessSynthesisCitationGraphMetricsEngine().compute(
        request,
      );
    const rebuilt = rebuildSynthesisCitationGraphMetricsResult(
      {
        ...result,
        ignored: true,
        libraryNodeMetrics: [...result.libraryNodeMetrics]
          .reverse()
          .map((metric) => ({ ...metric, ignored: true })),
      },
      request,
    );
    assert.deepEqual(rebuilt, result);
    assert.notProperty(rebuilt as Record<string, unknown>, "ignored");
    assert.notProperty(
      rebuilt.libraryNodeMetrics[0] as Record<string, unknown>,
      "ignored",
    );

    for (const libraryNodeMetrics of [
      result.libraryNodeMetrics.slice(1),
      [
        ...result.libraryNodeMetrics,
        { ...result.libraryNodeMetrics[0], nodeId: "extra" },
      ],
      result.libraryNodeMetrics.map((metric, index) =>
        index === 0 ? { ...metric, foundationScore: Number.NaN } : metric,
      ),
      result.libraryNodeMetrics.map((metric, index) =>
        index === 0
          ? { ...metric, nodeId: result.libraryNodeMetrics[1].nodeId }
          : metric,
      ),
    ]) {
      assert.throws(() =>
        rebuildSynthesisCitationGraphMetricsResult(
          { ...result, libraryNodeMetrics },
          request,
        ),
      );
    }
  });

  it("keeps metrics computation process-portable and checkpoint-cancellable", async function () {
    const source = await fs.readFile(
      path.resolve("packages/synthesis-engine/src/index.ts"),
      "utf8",
    );
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    assert.include(imports, "d3-force");
    assert.isFalse(
      imports.some((specifier) =>
        /^(?:node:|.*(?:src\/modules\/synthesis|repository|zotero-plugin))/.test(
          specifier,
        ),
      ),
    );

    const checkpoints: string[] = [];
    const request = sampleRequest();
    let error: unknown;
    try {
      await createInProcessSynthesisCitationGraphMetricsEngine({
        checkpoint(checkpoint) {
          checkpoints.push(`${checkpoint.phase}:${checkpoint.iteration ?? ""}`);
          if (checkpoint.phase === "pagerank" && checkpoint.iteration === 2) {
            throw new Error("cancelled");
          }
        },
      }).compute(request);
    } catch (caught) {
      error = caught;
    }
    assert.instanceOf(error, Error);
    assert.equal((error as Error).message, "cancelled");
    assert.include(checkpoints, "start:");
    assert.include(checkpoints, "pagerank:2");
    assert.notInclude(checkpoints, "complete:");
  });

  it("returns the same canonical result through the Node worker canary", async function () {
    const request = rebuildSynthesisCitationGraphMetricsRequest(
      JSON.parse(JSON.stringify(sampleRequest())),
    );
    const direct =
      await createInProcessSynthesisCitationGraphMetricsEngine().compute(
        request,
      );
    const worker = new Worker(
      new URL(
        "../fixtures/synthesis-citation-metrics-engine-worker.ts",
        import.meta.url,
      ),
      { execArgv: ["--import", "tsx"] },
    );
    try {
      const response = await new Promise<{ ok: boolean; result?: unknown }>(
        (resolve, reject) => {
          worker.once("message", resolve);
          worker.once("error", reject);
          worker.postMessage(request);
        },
      );
      assert.equal(response.ok, true);
      assert.deepEqual(
        rebuildSynthesisCitationGraphMetricsResult(response.result, request),
        direct,
      );
    } finally {
      await worker.terminate();
    }
  });

  it("returns the same canonical result through the Rust worker backend", async function () {
    const request = rebuildSynthesisCitationGraphMetricsRequest(
      JSON.parse(JSON.stringify(sampleRequest())),
    );
    const direct =
      await createInProcessSynthesisCitationGraphMetricsEngine().compute(
        request,
      );
    const pool = createSynthesisSidecarComputeWorkerPool();
    try {
      assert.deepEqual(await pool.runCitationGraphMetrics(request), direct);
    } finally {
      await pool.shutdown();
    }
  });
});
