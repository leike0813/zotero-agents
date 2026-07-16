import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { Worker } from "node:worker_threads";
import {
  SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
  SYNTHESIS_TOPIC_GRAPH_INDEX_CHECKPOINT_INTERVAL,
  SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
  SYNTHESIS_TOPIC_GRAPH_INDEX_EDGE_MAX,
  SYNTHESIS_TOPIC_GRAPH_INDEX_NODE_MAX,
  SYNTHESIS_TOPIC_GRAPH_INDEX_SCHEMA_VERSION,
  SYNTHESIS_TOPIC_GRAPH_INDEX_STRING_MAX,
  createInProcessSynthesisTopicGraphIndexEngine,
  rebuildSynthesisTopicGraphIndexRequest,
  rebuildSynthesisTopicGraphIndexResult,
  type SynthesisTopicGraphIndexRequest,
} from "../../packages/synthesis-engine/src/topicGraphIndex";

function indexRequest(): SynthesisTopicGraphIndexRequest {
  return {
    contractVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
    sourceManifestHash: "sha256:topic-graph-basis",
    rebuiltAt: "2026-07-16T00:00:00.000Z",
    nodes: [
      {
        topicId: "topic-child",
        isRoot: false,
        level: "normal",
        definitionStatus: "has_synthesis",
      },
      {
        topicId: "topic-deleted",
        isRoot: false,
        level: "normal",
        definitionStatus: "deleted",
      },
      {
        topicId: "topic-free",
        isRoot: false,
        level: "normal",
        definitionStatus: "placeholder",
      },
      {
        topicId: "topic-root",
        isRoot: true,
        level: "normal",
        definitionStatus: "has_synthesis",
      },
      {
        topicId: "topic-top",
        isRoot: false,
        level: "top",
        definitionStatus: "has_synthesis",
      },
    ],
    edges: [
      {
        edgeId: "edge:broader:root:child",
        sourceTopicId: "topic-root",
        targetTopicId: "topic-child",
        relation: "broader_than",
        status: "confirmed",
      },
      {
        edgeId: "edge:related:root:free",
        sourceTopicId: "topic-root",
        targetTopicId: "topic-free",
        relation: "related_to",
        status: "confirmed",
      },
    ],
  };
}

describe("Synthesis Topic Graph index engine", function () {
  it("canonically rebuilds strict requests and enforces production bounds", function () {
    assert.equal(
      SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
      "synthesis-topic-graph-index.v1",
    );
    assert.equal(
      SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
      "topic-graph-index.v1",
    );
    assert.equal(SYNTHESIS_TOPIC_GRAPH_INDEX_SCHEMA_VERSION, "1.0.0");
    assert.equal(SYNTHESIS_TOPIC_GRAPH_INDEX_NODE_MAX, 25_000);
    assert.equal(SYNTHESIS_TOPIC_GRAPH_INDEX_EDGE_MAX, 100_000);
    assert.equal(SYNTHESIS_TOPIC_GRAPH_INDEX_STRING_MAX, 4096);
    assert.equal(SYNTHESIS_TOPIC_GRAPH_INDEX_CHECKPOINT_INTERVAL, 256);

    const request = indexRequest();
    const rebuilt = rebuildSynthesisTopicGraphIndexRequest({
      ...request,
      ignored: true,
      nodes: request.nodes.map((node) => ({ ...node, ignored: "discard" })),
    });
    assert.deepEqual(
      rebuilt.nodes.map((node) => node.topicId),
      ["topic-child", "topic-deleted", "topic-free", "topic-root", "topic-top"],
    );
    assert.notProperty(
      rebuilt as unknown as Record<string, unknown>,
      "ignored",
    );
    assert.notProperty(
      rebuilt.nodes[0] as unknown as Record<string, unknown>,
      "ignored",
    );

    assert.throws(() =>
      rebuildSynthesisTopicGraphIndexRequest({
        ...request,
        nodes: [request.nodes[0], request.nodes[0]],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTopicGraphIndexRequest({
        ...request,
        edges: [request.edges[0], request.edges[0]],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTopicGraphIndexRequest(request, { nodeMax: 4 }),
    );
    assert.throws(() =>
      rebuildSynthesisTopicGraphIndexRequest(request, { edgeMax: 1 }),
    );
    assert.throws(() =>
      rebuildSynthesisTopicGraphIndexRequest(request, { stringMax: 8 }),
    );
    assert.throws(() =>
      rebuildSynthesisTopicGraphIndexRequest({
        ...request,
        edges: [{ ...request.edges[0], relation: "invalid" }],
      }),
    );
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    assert.throws(() => rebuildSynthesisTopicGraphIndexRequest(cyclic));
  });

  it("preserves current root and unplaced placement semantics", async function () {
    const engine = createInProcessSynthesisTopicGraphIndexEngine();
    const base = indexRequest();
    const result = await engine.buildIndex(base);
    assert.deepEqual(result.roots, ["topic-root", "topic-top"]);
    assert.deepEqual(result.unplaced, ["topic-free"]);

    for (const status of [
      "suggested",
      "confirmed",
      "stale",
      "deleted",
    ] as const) {
      const indexed = await engine.buildIndex({
        ...base,
        edges: [
          {
            ...base.edges[0],
            targetTopicId: "topic-free",
            status,
          },
        ],
      });
      assert.deepEqual(indexed.unplaced, ["topic-child"], status);
    }
    const rejected = await engine.buildIndex({
      ...base,
      edges: [
        {
          ...base.edges[0],
          targetTopicId: "topic-free",
          status: "rejected",
        },
      ],
    });
    assert.deepEqual(rejected.unplaced, ["topic-child", "topic-free"]);
  });

  it("rejects malformed results and supports checkpoint cancellation", async function () {
    const request = indexRequest();
    const engine = createInProcessSynthesisTopicGraphIndexEngine();
    const result = await engine.buildIndex(request);
    const rebuilt = rebuildSynthesisTopicGraphIndexResult(
      { ...result, ignored: "discard" },
      request,
    );
    assert.notProperty(
      rebuilt as unknown as Record<string, unknown>,
      "ignored",
    );
    assert.throws(() =>
      rebuildSynthesisTopicGraphIndexResult(
        { ...result, sourceManifestHash: "sha256:wrong" },
        request,
      ),
    );
    assert.throws(() =>
      rebuildSynthesisTopicGraphIndexResult(
        { ...result, roots: [...result.roots].reverse() },
        request,
      ),
    );
    assert.throws(() =>
      rebuildSynthesisTopicGraphIndexResult(
        { ...result, unplaced: [...result.unplaced, ...result.unplaced] },
        request,
      ),
    );

    const checkpoints: string[] = [];
    let cancellation: unknown;
    try {
      await createInProcessSynthesisTopicGraphIndexEngine({
        checkpoint(checkpoint) {
          checkpoints.push(`${checkpoint.phase}:${checkpoint.processedCount}`);
          if (checkpoint.phase === "nodes" && checkpoint.processedCount === 1) {
            throw new Error("cancelled");
          }
        },
        checkpointInterval: 1,
      }).buildIndex(request);
    } catch (error) {
      cancellation = error;
    }
    assert.equal((cancellation as Error)?.message, "cancelled");
    assert.include(checkpoints, "start:0");
    assert.include(checkpoints, "nodes:1");
    assert.notInclude(checkpoints, "complete:7");
  });

  it("returns the same canonical result through the Node worker canary", async function () {
    const request = rebuildSynthesisTopicGraphIndexRequest(
      JSON.parse(JSON.stringify(indexRequest())),
    );
    const expected =
      await createInProcessSynthesisTopicGraphIndexEngine().buildIndex(request);
    const worker = new Worker(
      new URL(
        "../fixtures/synthesis-topic-graph-index-engine-worker.ts",
        import.meta.url,
      ),
      { execArgv: ["--import", "tsx"] },
    );
    try {
      const actual = await new Promise<unknown>((resolve, reject) => {
        worker.once("message", resolve);
        worker.once("error", reject);
        worker.postMessage(request);
      });
      assert.deepEqual(actual, expected);
    } finally {
      await worker.terminate();
    }
  });

  it("keeps the engine source environment-neutral", async function () {
    const source = await fs.readFile(
      path.resolve("packages/synthesis-engine/src/topicGraphIndex.ts"),
      "utf8",
    );
    for (const forbidden of [
      /from\s+["']node:/,
      /\bZotero\b/,
      /\bdocument\b/,
      /zotero-plugin-toolkit/,
      /from\s+["'][^"']*repository/,
      /from\s+["'][^"']*foundation/,
      /from\s+["'][^"']*runtime/,
    ]) {
      assert.notMatch(source, forbidden);
    }
  });
});
