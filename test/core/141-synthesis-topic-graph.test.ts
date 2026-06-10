import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { buildSynthesisKnowledgeGraphPaths } from "../../src/modules/synthesis/foundation";
import {
  createSynthesisTopicGraphService,
  deterministicTopicGraphEdgeId,
} from "../../src/modules/synthesis/topicGraph";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import {
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
} from "../../src/modules/runtimePersistence";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-topic-graph-"));
}

describe("Synthesis topic graph", function () {
  it("initializes topic graph runtime state in SQLite without canonical graph assets", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTopicGraphService({ root });

    const snapshot = await service.loadTopicGraph();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const repository = createSynthesisRepository({ runtimeRoot: root });

    assert.deepEqual(snapshot.nodes, []);
    assert.deepEqual(snapshot.edges, []);
    assert.equal(repository.countRows("synt_topic_graph_node"), 0);
    assert.equal(repository.countRows("synt_topic_graph_edge"), 0);
    assert.isFalse(
      await runtimePathExists(path.join(paths.topicGraphRoot, "manifest.json")),
    );
  });

  it("writes nodes and edges with deterministic ids into SQLite", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTopicGraphService({
      root,
      now: () => "2026-05-24T00:00:00.000Z",
    });
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const edgeId = deterministicTopicGraphEdgeId({
      relation: "related_to",
      sourceTopicId: "topic-z",
      targetTopicId: "topic-a",
    });

    await service.saveTopicGraph({
      transactionId: "topic-graph-write",
      nodes: [
        { topic_id: "topic-a", title: "Alpha", node_type: "materialized" },
        { topic_id: "topic-z", title: "Zeta", node_type: "placeholder" },
      ],
      edges: [
        {
          source_topic_id: "topic-z",
          target_topic_id: "topic-a",
          relation: "related_to",
          status: "suggested",
        },
      ],
    });

    const snapshot = await service.loadTopicGraph();
    assert.deepEqual(
      snapshot.nodes.map((node) => node.topic_id),
      ["topic-a", "topic-z"],
    );
    assert.equal(snapshot.edges[0]?.edge_id, edgeId);
    assert.equal(edgeId, "edge:related_to:topic-a:topic-z");
    assert.equal(repository.countRows("synt_topic_graph_node"), 2);
    assert.equal(repository.countRows("synt_topic_graph_edge"), 1);
  });

  it("exports topic graph JSON only through an explicit checkpoint", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTopicGraphService({
      root,
      now: () => "2026-05-24T00:00:00.000Z",
    });
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const manifestPath = path.join(paths.topicGraphRoot, "manifest.json");

    await service.saveTopicGraph({
      nodes: [
        { topic_id: "topic-a", title: "Alpha", node_type: "materialized" },
      ],
      edges: [],
    });

    assert.isFalse(await runtimePathExists(manifestPath));

    const checkpoint = await service.exportTopicGraphCheckpoint({
      transactionId: "topic-graph-checkpoint",
    });
    const manifest = JSON.parse(await readRuntimeTextFile(manifestPath));

    assert.equal(checkpoint.transactionId, "topic-graph-checkpoint");
    assert.equal(manifest.schema_id, "synthesis.topic_graph_manifest");
    assert.equal(manifest.data.node_count, 1);
    assert.includeMembers(checkpoint.receipt.changed_assets, [
      "topic-graph/manifest.json",
    ]);
    assert.isTrue(
      checkpoint.receipt.changed_assets.some((asset) =>
        asset.startsWith("topic-graph/nodes/topic_"),
      ),
    );
  });

  it("ingests broader, related, overlap, and contrast proposals safely", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTopicGraphService({ root });
    await service.upsertMaterializedTopic({
      transactionId: "topic-source",
      topicId: "topic-child",
      title: "Child",
    });
    for (const [topicId, title] of [
      ["topic-parent", "Parent"],
      ["topic-grandchild", "Grandchild"],
      ["topic-peer", "Peer"],
      ["topic-overlap", "Overlap"],
      ["topic-contrast", "Contrast"],
    ]) {
      await service.upsertMaterializedTopic({
        transactionId: `topic-target-${topicId}`,
        topicId,
        title,
      });
    }

    const result = await service.ingestRelationProposals({
      sourceTopicId: "topic-child",
      transactionId: "topic-proposals",
      payload: {
        schema_id: "synthesis.topic_graph_relation_proposals",
        proposals: [
          {
            relation_type: "target_is_broader_topic_candidate",
            target_topic_id: "topic-parent",
            target_title: "Parent",
          },
          {
            relation_type: "target_is_narrower_topic_candidate",
            target_topic_id: "topic-grandchild",
            target_title: "Grandchild",
          },
          {
            relation_type: "related_topic_candidate",
            target_topic_id: "topic-peer",
          },
          {
            relation_type: "overlap_topic_candidate",
            target_topic_id: "topic-overlap",
          },
          {
            relation_type: "contrast_topic_candidate",
            target_topic_id: "topic-contrast",
          },
        ],
      },
    });

    assert.lengthOf(result.accepted_edges, 5);
    const snapshot = await service.loadTopicGraph();
    const broaderEdges = snapshot.edges.filter(
      (edge) => edge.relation === "broader_than",
    );
    assert.deepInclude(
      broaderEdges.map((edge) => ({
        source_topic_id: edge.source_topic_id,
        target_topic_id: edge.target_topic_id,
        relation: edge.relation,
      })),
      {
        source_topic_id: "topic-parent",
        target_topic_id: "topic-child",
        relation: "broader_than",
      },
    );
    assert.deepInclude(
      broaderEdges.map((edge) => ({
        source_topic_id: edge.source_topic_id,
        target_topic_id: edge.target_topic_id,
        relation: edge.relation,
      })),
      {
        source_topic_id: "topic-child",
        target_topic_id: "topic-grandchild",
        relation: "broader_than",
      },
    );
    assert.includeMembers(
      snapshot.edges.map((edge) => edge.relation),
      ["related_to", "overlaps_with", "contrasts_with"],
    );
    assert.includeMembers(
      snapshot.nodes.map((node) => node.topic_id),
      [
        "topic-parent",
        "topic-grandchild",
        "topic-peer",
        "topic-overlap",
        "topic-contrast",
      ],
    );
  });

  it("does not create placeholder nodes for unknown relation targets", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTopicGraphService({ root });
    await service.upsertMaterializedTopic({
      transactionId: "topic-source",
      topicId: "topic-child",
      title: "Child",
    });

    const result = await service.ingestRelationProposals({
      sourceTopicId: "topic-child",
      transactionId: "topic-proposals",
      payload: {
        schema_id: "synthesis.topic_graph_relation_proposals",
        proposals: [
          {
            relation_type: "related_topic_candidate",
            target_topic_id: "future-topic",
          },
        ],
      },
    });

    assert.lengthOf(result.accepted_edges, 0);
    assert.deepEqual(
      result.diagnostics.map((entry) => entry.code),
      ["unknown_target_topic"],
    );
    const snapshot = await service.loadTopicGraph();
    assert.notInclude(
      snapshot.nodes.map((node) => node.topic_id),
      "future-topic",
    );
  });

  it("marks and purges topic relation proposals when a topic is deleted", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTopicGraphService({
      root,
      now: () => "2026-05-24T02:00:00.000Z",
    });
    await service.importTopicGraphCheckpoint({
      nodes: [
        {
          topic_id: "topic-a",
          title: "A",
          aliases: [],
          node_type: "materialized",
          definition_status: "deleted",
          created_at: "2026-05-24T00:00:00.000Z",
          updated_at: "2026-05-24T00:00:00.000Z",
        },
        {
          topic_id: "topic-b",
          title: "B",
          aliases: [],
          node_type: "materialized",
          definition_status: "has_synthesis",
          created_at: "2026-05-24T00:00:00.000Z",
          updated_at: "2026-05-24T00:00:00.000Z",
        },
        {
          topic_id: "topic-c",
          title: "C",
          aliases: [],
          node_type: "materialized",
          definition_status: "has_synthesis",
          created_at: "2026-05-24T00:00:00.000Z",
          updated_at: "2026-05-24T00:00:00.000Z",
        },
      ],
      edges: [
        {
          edge_id: "edge:related_to:topic-a:topic-b",
          source_topic_id: "topic-a",
          target_topic_id: "topic-b",
          relation: "related_to",
          status: "confirmed",
          provenance: [],
          evidence_refs: [],
          created_at: "2026-05-24T00:00:00.000Z",
          updated_at: "2026-05-24T00:00:00.000Z",
        },
        {
          edge_id: "edge:related_to:topic-b:topic-c",
          source_topic_id: "topic-b",
          target_topic_id: "topic-c",
          relation: "related_to",
          status: "confirmed",
          provenance: [],
          evidence_refs: [],
          created_at: "2026-05-24T00:00:00.000Z",
          updated_at: "2026-05-24T00:00:00.000Z",
        },
      ],
      reviewItems: [
        {
          review_id: "review:related_to:topic-a:topic-b",
          status: "open",
          source_topic_id: "topic-a",
          target_topic_id: "topic-b",
          relation: "related_to",
          provenance: [],
          evidence_refs: [],
          created_at: "2026-05-24T00:00:00.000Z",
          updated_at: "2026-05-24T00:00:00.000Z",
        },
        {
          review_id: "review:related_to:topic-b:topic-c",
          status: "open",
          source_topic_id: "topic-b",
          target_topic_id: "topic-c",
          relation: "related_to",
          provenance: [],
          evidence_refs: [],
          created_at: "2026-05-24T00:00:00.000Z",
          updated_at: "2026-05-24T00:00:00.000Z",
        },
      ],
    });

    const marked = await service.markTopicRelationsDeleted("topic-a");
    let snapshot = await service.loadTopicGraph();

    assert.equal(marked.deleted_edges, 1);
    assert.equal(marked.deleted_review_items, 1);
    assert.equal(
      snapshot.edges.find(
        (edge) => edge.edge_id === "edge:related_to:topic-a:topic-b",
      )?.status,
      "deleted",
    );
    assert.equal(
      snapshot.review_items.find(
        (item) => item.review_id === "review:related_to:topic-a:topic-b",
      )?.status,
      "deleted",
    );
    assert.equal(
      snapshot.edges.find(
        (edge) => edge.edge_id === "edge:related_to:topic-b:topic-c",
      )?.status,
      "confirmed",
    );

    const purged = await service.purgeDeletedTopicRelations(["topic-a"]);
    snapshot = await service.loadTopicGraph();

    assert.equal(purged.purged_nodes, 1);
    assert.equal(purged.purged_edges, 1);
    assert.equal(purged.purged_review_items, 1);
    assert.notInclude(
      snapshot.nodes.map((node) => node.topic_id),
      "topic-a",
    );
    assert.deepEqual(
      snapshot.edges.map((edge) => edge.edge_id),
      ["edge:related_to:topic-b:topic-c"],
    );
    assert.deepEqual(
      snapshot.review_items.map((item) => item.review_id),
      ["review:related_to:topic-b:topic-c"],
    );
  });

  it("rejects self edges, broader cycles, and agent overwrite of user decisions", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTopicGraphService({ root });
    await service.saveTopicGraph({
      nodes: [
        { topic_id: "topic-a", title: "A", node_type: "materialized" },
        { topic_id: "topic-b", title: "B", node_type: "materialized" },
      ],
      edges: [
        {
          source_topic_id: "topic-a",
          target_topic_id: "topic-b",
          relation: "broader_than",
          status: "confirmed",
        },
      ],
    });

    const result = await service.ingestRelationProposals({
      sourceTopicId: "topic-a",
      payload: {
        proposals: [
          {
            proposal_type: "related_topic_candidate",
            target_topic_id: "topic-a",
          },
          {
            proposal_type: "target_is_broader_topic_candidate",
            target_topic_id: "topic-b",
          },
          {
            proposal_type: "target_is_broader_topic_candidate",
            target_topic_id: "topic-a",
          },
        ],
      },
    });

    assert.deepEqual(result.diagnostics.map((entry) => entry.code).sort(), [
      "broader_cycle_rejected",
      "self_edge_rejected",
      "self_edge_rejected",
    ]);
    const snapshot = await service.loadTopicGraph();
    assert.lengthOf(snapshot.edges, 1);
    assert.equal(snapshot.edges[0]?.status, "confirmed");

    const preserved = await service.ingestRelationProposals({
      sourceTopicId: "topic-b",
      payload: {
        proposals: [
          {
            proposal_type: "target_is_broader_topic_candidate",
            target_topic_id: "topic-a",
          },
        ],
      },
    });
    assert.deepEqual(
      preserved.diagnostics.map((entry) => entry.code),
      ["user_decision_preserved"],
    );
  });

  it("ignores deleted broader edges when checking proposal cycles", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTopicGraphService({
      root,
      now: () => "2026-05-24T00:00:00.000Z",
    });
    await service.saveTopicGraph({
      transactionId: "seed-deleted-reverse-broader-edge",
      nodes: [
        {
          topic_id: "computer-vision",
          title: "Computer Vision",
          node_type: "materialized",
        },
        {
          topic_id: "object-detection",
          title: "Object Detection",
          node_type: "materialized",
        },
      ],
      edges: [
        {
          source_topic_id: "object-detection",
          target_topic_id: "computer-vision",
          relation: "broader_than",
          status: "deleted",
        },
      ],
    });

    const result = await service.ingestRelationProposals({
      sourceTopicId: "computer-vision",
      payload: {
        proposals: [
          {
            relation_type: "target_is_narrower_topic_candidate",
            target_topic_id: "object-detection",
            confidence: 0.92,
          },
        ],
      },
    });

    assert.notInclude(
      result.diagnostics.map((entry) => entry.code),
      "broader_cycle_rejected",
    );
    assert.deepEqual(
      result.accepted_edges.map((edge) => [
        edge.source_topic_id,
        edge.target_topic_id,
        edge.relation,
        edge.status,
      ]),
      [
        [
          "computer-vision",
          "object-detection",
          "broader_than",
          "suggested",
        ],
      ],
    );
  });

  it("accepts and rejects suggested edges through canonical review decisions", async function () {
    const root = await makeRuntimeRoot();
    const graph = createSynthesisTopicGraphService({
      root,
      now: () => "2026-05-24T00:00:00.000Z",
    });
    await graph.saveTopicGraph({
      transactionId: "seed-suggested-edge",
      nodes: [
        { topic_id: "topic-a", title: "A", node_type: "materialized" },
        { topic_id: "topic-b", title: "B", node_type: "placeholder" },
        { topic_id: "topic-c", title: "C", node_type: "placeholder" },
      ],
      edges: [
        {
          source_topic_id: "topic-a",
          target_topic_id: "topic-b",
          relation: "related_to",
          status: "suggested",
          provenance: [{ source: "agent" }],
          evidence_refs: [{ section: "taxonomy" }],
        },
        {
          source_topic_id: "topic-a",
          target_topic_id: "topic-c",
          relation: "contrasts_with",
          status: "suggested",
        },
      ],
    });
    const service = createSynthesisService({ root, libraryId: 1 });
    const initial = await graph.loadTopicGraph();
    const relatedEdge = initial.edges.find(
      (edge) => edge.relation === "related_to",
    )!;
    const contrastEdge = initial.edges.find(
      (edge) => edge.relation === "contrasts_with",
    )!;

    const accepted = await service.acceptTopicGraphRelation({
      edgeId: relatedEdge.edge_id,
    });
    const rejected = await service.rejectTopicGraphRelation({
      edgeId: contrastEdge.edge_id,
    });

    assert.isUndefined(accepted.diagnostic);
    assert.isUndefined(rejected.diagnostic);
    const snapshot = await graph.loadTopicGraph();
    const acceptedEdge = snapshot.edges.find(
      (edge) => edge.edge_id === relatedEdge.edge_id,
    );
    const rejectedEdge = snapshot.edges.find(
      (edge) => edge.edge_id === contrastEdge.edge_id,
    );
    assert.equal(acceptedEdge?.status, "confirmed");
    assert.deepEqual(acceptedEdge?.provenance, [{ source: "agent" }]);
    assert.deepEqual(acceptedEdge?.evidence_refs, [{ section: "taxonomy" }]);
    assert.equal(rejectedEdge?.status, "rejected");

    const preserved = await graph.ingestRelationProposals({
      sourceTopicId: "topic-a",
      payload: {
        proposals: [
          {
            proposal_type: "related_topic_candidate",
            target_topic_id: "topic-b",
          },
          {
            proposal_type: "contrast_topic_candidate",
            target_topic_id: "topic-c",
          },
        ],
      },
    });
    assert.deepEqual(
      preserved.diagnostics.map((entry) => entry.code),
      ["user_decision_preserved", "user_decision_preserved"],
    );
  });

  it("queues low-confidence relation proposals for review before creating suggested edges", async function () {
    const root = await makeRuntimeRoot();
    const graph = createSynthesisTopicGraphService({
      root,
      now: () => "2026-05-24T00:00:00.000Z",
    });
    await graph.upsertMaterializedTopic({
      topicId: "topic-source",
      title: "Source",
    });
    await graph.upsertMaterializedTopic({
      topicId: "topic-target",
      title: "Target",
    });

    const queued = await graph.ingestRelationProposals({
      sourceTopicId: "topic-source",
      payload: {
        proposals: [
          {
            proposal_type: "related_topic_candidate",
            target_topic_id: "topic-target",
            target_title: "Target",
            confidence: 0.2,
            evidence_refs: [{ section: "weak" }],
          },
        ],
      },
    });

    assert.lengthOf(queued.accepted_edges, 0);
    assert.lengthOf(queued.review_items, 1);
    let snapshot = await graph.loadTopicGraph();
    assert.lengthOf(snapshot.edges, 0);
    assert.equal(snapshot.review_items[0]?.status, "open");

    const service = createSynthesisService({ root, libraryId: 1 });
    const approved = await service.applyTopicGraphReviewAction({
      reviewId: snapshot.review_items[0]!.review_id,
      action: "approve_suggested",
    });

    assert.isUndefined(approved.diagnostic);
    snapshot = await graph.loadTopicGraph();
    assert.equal(snapshot.review_items[0]?.status, "approved");
    assert.equal(snapshot.edges[0]?.status, "suggested");
    assert.deepEqual(snapshot.edges[0]?.evidence_refs, [{ section: "weak" }]);
  });

  it("rejects topic graph review items without creating edges", async function () {
    const root = await makeRuntimeRoot();
    const graph = createSynthesisTopicGraphService({ root });
    await graph.upsertMaterializedTopic({
      topicId: "topic-source",
      title: "Source",
    });
    await graph.upsertMaterializedTopic({
      topicId: "topic-target",
      title: "Target",
    });
    await graph.ingestRelationProposals({
      sourceTopicId: "topic-source",
      payload: {
        proposals: [
          {
            proposal_type: "contrast_topic_candidate",
            target_topic_id: "topic-target",
            confidence: 0.1,
          },
        ],
      },
    });
    const reviewId = (await graph.loadTopicGraph()).review_items[0]!.review_id;

    await createSynthesisService({
      root,
      libraryId: 1,
    }).applyTopicGraphReviewAction({ reviewId, action: "reject" });

    const snapshot = await graph.loadTopicGraph();
    assert.equal(snapshot.review_items[0]?.status, "rejected");
    assert.lengthOf(snapshot.edges, 0);
  });

  it("returns diagnostics for invalid topic graph review decisions", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({ root, libraryId: 1 });
    const missing = await service.acceptTopicGraphRelation({
      edgeId: "edge:missing",
    });

    assert.equal(missing.diagnostic?.code, "topic_graph_edge_missing");

    const graph = createSynthesisTopicGraphService({ root });
    await graph.saveTopicGraph({
      edges: [
        {
          source_topic_id: "topic-a",
          target_topic_id: "topic-b",
          relation: "related_to",
          status: "confirmed",
        },
      ],
    });
    const edgeId = (await graph.loadTopicGraph()).edges[0]!.edge_id;
    const alreadyConfirmed = await service.rejectTopicGraphRelation({ edgeId });
    assert.equal(
      alreadyConfirmed.diagnostic?.code,
      "topic_graph_edge_not_suggested",
    );
  });

  it("rebuilds topic-graph-index projection from canonical files after cache deletion", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTopicGraphService({ root });
    await service.upsertMaterializedTopic({
      topicId: "topic-root",
      title: "Root",
      isRoot: true,
      level: "top",
    });
    await service.upsertMaterializedTopic({
      topicId: "topic-free",
      title: "Free",
    });

    const state = await service.rebuildTopicGraphIndexProjection();
    assert.isFalse(state.stale);
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const projectionPath = path.join(paths.stateRoot, "topic-graph-index.json");
    assert.isTrue(await runtimePathExists(projectionPath));
    await removeRuntimePath(projectionPath);

    const projection = await service.readTopicGraphIndexProjection();
    assert.deepEqual(projection.roots, ["topic-root"]);
    assert.deepEqual(projection.unplaced, ["topic-free"]);
  });

  it("writes sanitized diagnostics for malformed sidecars", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisTopicGraphService({ root });

    await service.ingestRelationProposals({
      sourceTopicId: `${root}\\secret\\token=abc123`,
      transactionId: "topic-sensitive",
      payload: { proposals: "not-array" },
    });

    const diagnostics = await readRuntimeTextFile(
      buildSynthesisKnowledgeGraphPaths(root).diagnosticsLog,
    );
    assert.notInclude(diagnostics, root);
    assert.notInclude(diagnostics, "abc123");
    assert.match(diagnostics, /path:|invalid_proposals_payload/);
  });
});
