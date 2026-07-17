import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { Worker } from "node:worker_threads";
import {
  SYNTHESIS_CITATION_GRAPH_LAYOUT_EDGE_MAX,
  SYNTHESIS_CITATION_GRAPH_LAYOUT_NODE_MAX,
  createInProcessSynthesisCitationGraphLayoutEngine,
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphLayoutResult,
  type SynthesisCitationGraphLayoutRequest,
} from "../../packages/synthesis-engine/src/index";
import { buildUnifiedCitationGraph } from "../../src/modules/synthesis/citationGraph";
import {
  hashCanonicalJson,
  sha256,
} from "../../src/modules/synthesis/foundation";

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

function projectedLayoutHash(
  result: Awaited<
    ReturnType<
      ReturnType<
        typeof createInProcessSynthesisCitationGraphLayoutEngine
      >["compute"]
    >
  >,
) {
  const base = {
    graph_hash: result.graphHash,
    layout_engine: result.layoutEngine,
    layout_version: result.layoutVersion,
    algorithm: result.algorithm,
    preset: result.algorithm,
    params: result.params,
    nodes: Object.fromEntries(
      result.nodes.map((node) => [node.nodeId, { x: node.x, y: node.y }]),
    ),
  };
  return hashCanonicalJson(base);
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
    assert.equal(SYNTHESIS_CITATION_GRAPH_LAYOUT_NODE_MAX, 5000);
    assert.equal(SYNTHESIS_CITATION_GRAPH_LAYOUT_EDGE_MAX, 20000);
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
      layoutEngine: "d3-force",
      layoutVersion: 1.2,
      params: {
        link_distance: 180,
        charge: -520,
        collision_radius: 24,
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

  it("preserves force, radial, and components coordinates and layout hashes", async function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "Source",
          year: "2024",
          references: [
            { doi: "10.1000/target", title: "Target", year: "2020" },
          ],
        },
        {
          libraryId: 1,
          itemKey: "BBBB2222",
          title: "Isolated",
          year: "2019",
          references: [],
        },
      ],
    });
    const engine = createInProcessSynthesisCitationGraphLayoutEngine();
    const base = sampleRequest({ graphHash: graph.graph_hash });
    const expected = {
      force: {
        layoutHash:
          "sha256:064291513a71ed2e19fa4b17c8edb7dc34d2fd779bb85bad513714cc30497b14",
        isolated: { x: 226.897, y: -71.717 },
      },
      radial: {
        layoutHash:
          "sha256:aa3658b024035847c690b9374106ff74ed3a3526609db710751a7e5462b7965e",
        isolated: { x: -60.464, y: 55.39 },
      },
      components: {
        layoutHash:
          "sha256:f840bbb7caa2b619b6078be6bd0ce160d974cde2b0ec332a4af146c3f0353faa",
        isolated: { x: 180, y: 0 },
      },
    } as const;

    for (const algorithm of ["force", "radial", "components"] as const) {
      const result = await engine.compute({ ...base, algorithm });
      assert.equal(result.layoutVersion, 1.2);
      assert.deepEqual(
        result.nodes.find((node) => node.nodeId === "zotero:item:BBBB2222"),
        { nodeId: "zotero:item:BBBB2222", ...expected[algorithm].isolated },
      );
      assert.equal(projectedLayoutHash(result), expected[algorithm].layoutHash);
    }
  });

  it("keeps the engine package free of Host, runtime, and Node imports", async function () {
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
    assert.include(imports, "d3-force");
    assert.include(imports, "./citationGraphBuild.ts");
    assert.include(source, "synthesis-citation-graph-build-transfer.v1");
    for (const specifier of imports) {
      assert.notMatch(
        specifier,
        /^(?:node:|zotero-)|(?:repository|foundation|runtimePersistence|libraryAdapter|src\/modules)/,
      );
    }
  });

  it("returns the same canonical result through the Node worker canary", async function () {
    const request = rebuildSynthesisCitationGraphLayoutRequest(
      JSON.parse(JSON.stringify(sampleRequest({ algorithm: "components" }))),
    );
    const direct =
      await createInProcessSynthesisCitationGraphLayoutEngine().compute(
        request,
      );
    const worker = new Worker(
      new URL(
        "../fixtures/synthesis-citation-layout-engine-worker.ts",
        import.meta.url,
      ),
      { execArgv: ["--import", "tsx"] },
    );
    try {
      const response = await new Promise<{
        ok: boolean;
        result?: unknown;
      }>((resolve, reject) => {
        worker.once("message", resolve);
        worker.once("error", reject);
        worker.postMessage(request);
      });
      assert.equal(response.ok, true);
      assert.deepEqual(
        rebuildSynthesisCitationGraphLayoutResult(response.result, request),
        direct,
      );
    } finally {
      await worker.terminate();
    }
  });
});
