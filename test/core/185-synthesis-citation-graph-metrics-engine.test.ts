import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
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
  const graph = sampleGraph();
  return {
    ...rebuildSynthesisCitationGraphMetricsRequest({
      graphHash: graph.graph_hash,
      nodes: graph.nodes.map((node) => ({
        nodeId: node.node_id,
        kind: node.kind,
        ...(node.library_id ? { libraryId: node.library_id } : {}),
        ...(node.item_key ? { itemKey: node.item_key } : {}),
        ...(node.title ? { title: node.title } : {}),
        ...(node.year ? { year: node.year } : {}),
      })),
      edges: graph.edges.map((edge) => ({
        edgeId: edge.edge_id,
        source: edge.source,
        target: edge.target,
        mentionCount: edge.mention_count,
      })),
    }),
    ...overrides,
  };
}

describe("Synthesis Citation Graph metrics engine", function () {
  this.timeout(20_000);

  it("canonically rebuilds requests with metrics-specific graph limits", function () {
    assert.equal(SYNTHESIS_CITATION_GRAPH_COMPUTE_NODE_MAX, 10_000);
    assert.equal(SYNTHESIS_CITATION_GRAPH_COMPUTE_EDGE_MAX, 20000);
    assert.equal(SYNTHESIS_CITATION_GRAPH_LAYOUT_NODE_MAX, 20_000);
    assert.equal(SYNTHESIS_CITATION_GRAPH_LAYOUT_EDGE_MAX, 80_000);
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

  it("preserves metrics v2 values, roles, and diagnostics", async function () {
    const request = sampleRequest();
    const result =
      await createInProcessSynthesisCitationGraphMetricsEngine().compute(
        request,
      );
    const byId = new Map(
      result.libraryNodeMetrics.map((metric) => [metric.nodeId, metric]),
    );

    assert.equal(result.metricsVersion, 2);
    assert.equal(result.graphYear, 2024);
    assert.deepEqual(result.diagnostics, {
      libraryNodeCount: 5,
      externalReferenceCount: 1,
      unresolvedReferenceCount: 1,
      componentCount: 3,
      isolatedLibraryNodeCount: 2,
      missingYearCount: 0,
    });
    assert.deepInclude(byId.get("zotero:item:B"), {
      paperRef: "1:B",
      internalInDegree: 2,
      internalPagerank: 0.402985,
      foundationScore: 0.9,
      frontierScore: 0.566667,
      synthesisRoleHints: ["core", "foundation", "frontier"],
    });
    assert.deepInclude(byId.get("zotero:item:D"), {
      componentId: "component:002",
      componentSize: 1,
      isIsolated: true,
      foundationScore: 0.1,
      frontierScore: 0.183333,
      synthesisRoleHints: ["isolated"],
    });
    assert.deepInclude(byId.get("zotero:item:E"), {
      componentId: "component:003",
      isIsolated: true,
      frontierScore: 0.55,
      synthesisRoleHints: ["frontier", "isolated"],
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
    assert.notInclude(imports, "d3-force");
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
});
