import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import {
  SYNTHESIS_CITATION_GRAPH_LAYOUT_EDGE_MAX,
  SYNTHESIS_CITATION_GRAPH_LAYOUT_NODE_MAX,
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphLayoutResult,
  type SynthesisCitationGraphLayoutRequest,
} from "../../packages/synthesis-engine/src/index";
import { sha256 } from "../../src/modules/synthesis/foundation";

function initialCoordinate(nodeId: string, axis: "x" | "y") {
  const hex = sha256(`${nodeId}:force:${axis}`).slice(
    "sha256:".length,
    "sha256:".length + 8,
  );
  return (Number.parseInt(hex, 16) / 0xffffffff - 0.5) * 100;
}

function sampleRequest(
  overrides: Partial<SynthesisCitationGraphLayoutRequest> = {},
): SynthesisCitationGraphLayoutRequest {
  return {
    graphHash:
      "sha256:4b273285fb026b2da2880d696563291e748356d189ec08da4a09b6b4bf920e45",
    algorithm: "force",
    nodes: [
      {
        nodeId: "zotero:item:AAAA1111",
        kind: "library_paper",
        title: "Source",
        year: "2024",
        initialX: initialCoordinate("zotero:item:AAAA1111", "x"),
        initialY: initialCoordinate("zotero:item:AAAA1111", "y"),
      },
      {
        nodeId: "ref:doi:10.1000/target",
        kind: "external_reference",
        title: "Target",
        year: "2020",
        initialX: initialCoordinate("ref:doi:10.1000/target", "x"),
        initialY: initialCoordinate("ref:doi:10.1000/target", "y"),
      },
      {
        nodeId: "zotero:item:BBBB2222",
        kind: "library_paper",
        title: "Isolated",
        year: "2019",
        initialX: initialCoordinate("zotero:item:BBBB2222", "x"),
        initialY: initialCoordinate("zotero:item:BBBB2222", "y"),
      },
    ],
    edges: [
      {
        edgeId:
          "edge:sha256:9f6ea8e1bfb26737737780dbb10780e3933c08ce017dc03411c649cd7f6fbcda",
        source: "zotero:item:AAAA1111",
        target: "ref:doi:10.1000/target",
      },
    ],
    ...overrides,
  };
}

describe("Synthesis Citation Graph layout engine", function () {
  it("canonically rebuilds requests and discards unknown JSON-safe fields", function () {
    const rebuilt = rebuildSynthesisCitationGraphLayoutRequest({
      ...sampleRequest(),
      ignored: { safe: true },
      nodes: [...sampleRequest().nodes]
        .reverse()
        .map((node) => ({ ...node, ignored: "safe" })),
      edges: sampleRequest().edges.map((edge) => ({
        ...edge,
        ignored: 1,
      })),
    });

    assert.deepEqual(
      rebuilt.nodes.map((node) => node.nodeId),
      [
        "ref:doi:10.1000/target",
        "zotero:item:AAAA1111",
        "zotero:item:BBBB2222",
      ],
    );
    assert.notProperty(
      rebuilt as unknown as Record<string, unknown>,
      "ignored",
    );
    assert.notProperty(
      rebuilt.nodes[0] as unknown as Record<string, unknown>,
      "ignored",
    );
    assert.deepEqual(rebuilt.edges, sampleRequest().edges);
  });

  it("rejects non-JSON, invalid, duplicate, dangling, and oversized requests", function () {
    assert.equal(SYNTHESIS_CITATION_GRAPH_LAYOUT_NODE_MAX, 20_000);
    assert.equal(SYNTHESIS_CITATION_GRAPH_LAYOUT_EDGE_MAX, 80_000);
    const request = sampleRequest();
    const invalid: unknown[] = [
      { ...request, ignored: () => undefined },
      { ...request, graphHash: "not-a-hash" },
      { ...request, algorithm: "legacy" },
      { ...request, nodes: [...request.nodes, request.nodes[0]] },
      { ...request, edges: [...request.edges, request.edges[0]] },
      {
        ...request,
        edges: [{ edgeId: "edge:missing", source: "missing", target: "also" }],
      },
      {
        ...request,
        nodes: Array.from(
          { length: SYNTHESIS_CITATION_GRAPH_LAYOUT_NODE_MAX + 1 },
          (_, index) => ({
            nodeId: `node:${index}`,
            kind: "library_paper",
            initialX: 0,
            initialY: 0,
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
            initialX: 0,
            initialY: 0,
          },
          {
            nodeId: "node:b",
            kind: "library_paper",
            initialX: 0,
            initialY: 0,
          },
        ],
        edges: Array.from(
          { length: SYNTHESIS_CITATION_GRAPH_LAYOUT_EDGE_MAX + 1 },
          (_, index) => ({
            edgeId: `edge:${index}`,
            source: "node:a",
            target: "node:b",
          }),
        ),
      },
    ];

    for (const value of invalid) {
      assert.throws(() => rebuildSynthesisCitationGraphLayoutRequest(value));
    }
  });

  it("canonically rebuilds results and validates the complete node set", function () {
    const request = rebuildSynthesisCitationGraphLayoutRequest(sampleRequest());
    const value = {
      graphHash: request.graphHash,
      algorithm: request.algorithm,
      layoutEngine: "forceatlas2-rust",
      layoutVersion: 2,
      params: {
        theta: 0.5,
        ka: 1,
        kg: 1,
        kr: 1,
        lin_log: "false",
        strong_gravity: "false",
        prevent_overlapping: 100,
        speed: 0.01,
        node_radius: 24,
        iterations: 700,
        isolated_radius: 72,
        isolated_gap: 96,
        ignored: "safe",
      },
      nodes: request.nodes
        .map((node, index) => ({
          nodeId: node.nodeId,
          x: index + 0.25,
          y: index - 0.5,
          ignored: true,
        }))
        .reverse(),
      ignored: true,
    };
    const rebuilt = rebuildSynthesisCitationGraphLayoutResult(value, request);

    assert.deepEqual(
      rebuilt.nodes.map((node) => node.nodeId),
      request.nodes.map((node) => node.nodeId),
    );
    assert.notProperty(
      rebuilt as unknown as Record<string, unknown>,
      "ignored",
    );
    assert.notProperty(
      rebuilt.nodes[0] as unknown as Record<string, unknown>,
      "ignored",
    );
    for (const nodes of [
      value.nodes.slice(1),
      [...value.nodes, { nodeId: "extra", x: 0, y: 0 }],
      value.nodes.map((node, index) =>
        index === 0 ? { ...node, x: Number.NaN } : node,
      ),
      value.nodes.map((node, index) =>
        index === 0 ? { ...node, nodeId: value.nodes[1].nodeId } : node,
      ),
    ]) {
      assert.throws(() =>
        rebuildSynthesisCitationGraphLayoutResult({ ...value, nodes }, request),
      );
    }
  });

  it("keeps the contract package free of layout runtimes and environment imports", async function () {
    const sourceRoot = path.resolve("packages/synthesis-engine/src");
    const source = (
      await Promise.all(
        (await fs.readdir(sourceRoot))
          .filter((name) => name.endsWith(".ts"))
          .map((name) => fs.readFile(path.join(sourceRoot, name), "utf8")),
      )
    ).join("\n");

    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    assert.notInclude(imports, "d3-force");
    assert.notInclude(source, "forceSimulation(");
    assert.notInclude(
      source,
      "createInProcessSynthesisCitationGraphLayoutEngine",
    );
    assert.notInclude(source, "computeSynthesisCitationGraphLayout(");
    assert.include(imports, "./citationGraphBuild.ts");
    assert.include(source, "synthesis-citation-graph-build-transfer.v1");
    for (const specifier of imports) {
      assert.notMatch(
        specifier,
        /^(?:node:|zotero-)|(?:repository|foundation|runtimePersistence|libraryAdapter|src\/modules)/,
      );
    }
  });
});
