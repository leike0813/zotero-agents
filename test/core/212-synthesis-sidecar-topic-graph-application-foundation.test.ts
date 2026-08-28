import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS,
  rebuildSynthesisTopicGraphApplicationIngestRequest,
  rebuildSynthesisTopicGraphApplicationSnapshot,
  rebuildSynthesisTopicGraphApplicationState,
} from "../../packages/synthesis-contracts/src/topicGraphApplication";
import { createSynthesisTopicGraphApplication } from "../../packages/synthesis-application/src/topicGraphApplication";
import { createInProcessSynthesisTopicGraphIndexEngine } from "../../packages/synthesis-engine/src/topicGraphIndex";
import {
  SYNTHESIS_TOPIC_GRAPH_APPLICATION_REPOSITORY_SCHEMA_VERSION,
  SYNTHESIS_TOPIC_GRAPH_APPLICATION_TABLES,
} from "../../packages/synthesis-repository/src/topicGraph";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";
import { openSynthesisNodeSqliteAdapter } from "../../apps/synthesis-service/src/repositoryNodeSqlite";

const PROFILE_ID = "8".repeat(64);
const DATA_ROOT_ID = "b".repeat(64);

const node = (topicId: string, title = topicId) => ({
  topicId,
  title,
  aliases: [],
  nodeType: "materialized" as const,
  definitionStatus: "has_synthesis" as const,
  isRoot: false,
  level: "normal" as const,
  paperCount: 0,
});

const proposal = (
  targetTopicId: string,
  type:
    | "target_is_broader_topic_candidate"
    | "target_is_narrower_topic_candidate"
    | "related_topic_candidate"
    | "overlap_topic_candidate"
    | "contrast_topic_candidate" = "related_topic_candidate",
  confidence = 0.9,
) => ({
  type,
  targetTopicId,
  confidence,
  provenance: [{ source: "test" }],
  evidenceRefs: [{ itemKey: "ABCD1234" }],
});

const graphEdge = (sourceTopicId: string, targetTopicId: string) => ({
  edgeId: `edge:broader_than:${sourceTopicId.replace(":", "_")}:${targetTopicId.replace(":", "_")}`,
  sourceTopicId,
  targetTopicId,
  relation: "broader_than" as const,
  status: "suggested" as const,
  provenance: [],
  evidenceRefs: [],
});

const compute = () => {
  const engine = createInProcessSynthesisTopicGraphIndexEngine();
  return {
    buildIndex: (request: Parameters<typeof engine.buildIndex>[0]) =>
      engine.buildIndex(request),
  };
};

describe("Synthesis sidecar Topic Graph application foundation", function () {
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("strictly rebuilds bounded Topic Graph DTOs", function () {
    assert.equal(SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.nodes, 25_000);
    assert.equal(SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.edges, 100_000);
    assert.equal(
      rebuildSynthesisTopicGraphApplicationState({
        manifestHash: null,
        revision: 0,
        indexHash: null,
        indexBasisHash: null,
        indexStale: true,
        nodeCount: 0,
        edgeCount: 0,
        reviewItemCount: 0,
      }).revision,
      0,
    );
    assert.throws(() =>
      rebuildSynthesisTopicGraphApplicationIngestRequest({
        expectedManifestHash: null,
        sourceTopicId: "topic:one",
        proposals: [proposal("topic:two")],
        unknown: true,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTopicGraphApplicationSnapshot({
        nodes: [node("topic:duplicate"), node("topic:duplicate", "Other")],
        edges: [],
        reviewItems: [],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTopicGraphApplicationSnapshot({
        nodes: [node("topic:one")],
        edges: [
          {
            edgeId: "edge:related_to:topic_one:topic_missing",
            sourceTopicId: "topic:one",
            targetTopicId: "topic:missing",
            relation: "related_to",
            status: "suggested",
            provenance: [],
            evidenceRefs: [],
          },
        ],
        reviewItems: [],
      }),
    );
  });

  it("persists proposals, decisions, index and restart state", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-graph-app-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-18T00:00:00.000Z",
    });
    const application = createSynthesisTopicGraphApplication({
      repository: repository.store,
      compute: compute(),
      now: () => "2026-07-18T00:00:00.000Z",
    });

    const replaced = await application.replaceSnapshot({
      expectedManifestHash: null,
      snapshot: {
        nodes: [
          { ...node("topic:one", "One"), isRoot: true },
          node("topic:two", "Two"),
        ],
        edges: [],
        reviewItems: [],
      },
    });
    assert.equal(replaced.status, "committed");
    const ingested = await application.ingestProposals({
      expectedManifestHash: replaced.manifestHash,
      sourceTopicId: "topic:one",
      proposals: [proposal("topic:two")],
    });
    assert.equal(ingested.status, "committed");
    assert.deepInclude(application.load().snapshot.edges[0], {
      sourceTopicId: "topic:one",
      targetTopicId: "topic:two",
      relation: "related_to",
      status: "suggested",
    });
    const confirmed = await application.decideRelation({
      expectedManifestHash: ingested.manifestHash,
      edgeId: application.load().snapshot.edges[0]!.edgeId,
      status: "confirmed",
    });
    assert.equal(confirmed.status, "committed");
    const rebuilt = await application.rebuildIndex({
      expectedManifestHash: confirmed.manifestHash,
    });
    assert.equal(rebuilt.status, "committed");
    assert.deepEqual(application.readIndex()?.roots, ["topic:one"]);
    assert.isFalse(application.inspect().indexStale);

    await application.shutdown();
    repository.close();
    const reopened = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.equal(
      reopened.store.getTopicGraphApplicationState()?.manifestHash,
      confirmed.manifestHash,
    );
    assert.lengthOf(reopened.store.listTopicGraphNodes(), 2);
    assert.lengthOf(reopened.store.listTopicGraphEdges(), 1);
    assert.isFalse(reopened.store.getTopicGraphApplicationState()?.indexStale);
    reopened.close();
  });

  it("preserves unsafe and user-decided relations while reviewing low confidence", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-policy-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const application = createSynthesisTopicGraphApplication({
      repository: repository.store,
      compute: compute(),
    });
    let result = await application.replaceSnapshot({
      expectedManifestHash: null,
      snapshot: {
        nodes: [node("topic:one"), node("topic:two"), node("topic:three")],
        edges: [],
        reviewItems: [],
      },
    });
    for (const edges of [
      [{ ...graphEdge("topic:one", "topic:two"), edgeId: "edge:unstable" }],
      [
        graphEdge("topic:one", "topic:two"),
        graphEdge("topic:two", "topic:one"),
      ],
    ]) {
      let invalidCandidate: unknown;
      try {
        await application.replaceSnapshot({
          expectedManifestHash: result.manifestHash,
          snapshot: {
            nodes: [node("topic:one"), node("topic:two")],
            edges,
            reviewItems: [],
          },
        });
      } catch (error) {
        invalidCandidate = error;
      }
      assert.instanceOf(invalidCandidate, Error);
      assert.equal(application.inspect().manifestHash, result.manifestHash);
    }
    result = await application.ingestProposals({
      expectedManifestHash: result.manifestHash,
      sourceTopicId: "topic:one",
      proposals: [proposal("topic:two", "target_is_narrower_topic_candidate")],
    });
    const firstEdge = application.load().snapshot.edges[0]!;
    result = await application.decideRelation({
      expectedManifestHash: result.manifestHash,
      edgeId: firstEdge.edgeId,
      status: "confirmed",
    });
    const preserved = await application.ingestProposals({
      expectedManifestHash: result.manifestHash,
      sourceTopicId: "topic:one",
      proposals: [
        proposal("topic:two", "target_is_narrower_topic_candidate"),
        proposal("topic:one"),
        proposal("topic:missing"),
      ],
    });
    assert.equal(preserved.status, "unchanged");
    assert.sameMembers(
      preserved.diagnostics.map((row) => row.code),
      ["user_decision_preserved", "self_edge_rejected", "unknown_target_topic"],
    );
    const cycle = await application.ingestProposals({
      expectedManifestHash: result.manifestHash,
      sourceTopicId: "topic:two",
      proposals: [proposal("topic:one", "target_is_narrower_topic_candidate")],
    });
    assert.equal(cycle.status, "unchanged");
    assert.equal(cycle.diagnostics[0]?.code, "broader_cycle_rejected");
    const reviewed = await application.ingestProposals({
      expectedManifestHash: result.manifestHash,
      sourceTopicId: "topic:one",
      proposals: [proposal("topic:three", "related_topic_candidate", 0.2)],
    });
    assert.equal(reviewed.status, "committed");
    assert.lengthOf(application.load().snapshot.reviewItems, 1);
    assert.lengthOf(application.load().snapshot.edges, 1);
    const approved = await application.review({
      expectedManifestHash: reviewed.manifestHash,
      reviewId: application.load().snapshot.reviewItems[0]!.reviewId,
      action: "approve_suggested",
    });
    assert.equal(approved.status, "committed");
    assert.equal(
      application
        .load()
        .snapshot.edges.find((row) => row.relation === "related_to")?.status,
      "suggested",
    );
    await application.shutdown();
    repository.close();
  });

  it("marks and purges deleted topic relations under manifest CAS", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-delete-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const application = createSynthesisTopicGraphApplication({
      repository: repository.store,
      compute: compute(),
    });
    let result = await application.replaceSnapshot({
      expectedManifestHash: null,
      snapshot: {
        nodes: [
          { ...node("topic:one"), definitionStatus: "deleted" as const },
          node("topic:two"),
        ],
        edges: [
          {
            edgeId: "edge:related_to:topic_one:topic_two",
            sourceTopicId: "topic:one",
            targetTopicId: "topic:two",
            relation: "related_to",
            status: "suggested",
            provenance: [],
            evidenceRefs: [],
          },
        ],
        reviewItems: [
          {
            reviewId: "review:related_to:topic_one:topic_two",
            status: "open",
            sourceTopicId: "topic:one",
            targetTopicId: "topic:two",
            relation: "related_to",
            provenance: [],
            evidenceRefs: [],
          },
        ],
      },
    });
    assert.equal(
      (
        await application.markTopicRelationsDeleted({
          expectedManifestHash: `sha256:${"0".repeat(64)}`,
          topicId: "topic:one",
        })
      ).status,
      "basis_mismatch",
    );
    result = await application.markTopicRelationsDeleted({
      expectedManifestHash: result.manifestHash,
      topicId: "topic:one",
    });
    assert.equal(application.load().snapshot.edges[0]?.status, "deleted");
    const purged = await application.purgeDeletedTopicRelations({
      expectedManifestHash: result.manifestHash,
      topicIds: ["topic:one"],
    });
    assert.equal(purged.status, "committed");
    assert.lengthOf(application.load().snapshot.nodes, 1);
    assert.lengthOf(application.load().snapshot.edges, 0);
    assert.lengthOf(application.load().snapshot.reviewItems, 0);
    await application.shutdown();
    repository.close();
  });

  it("rolls back the complete aggregate when a row write fails", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-rollback-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const application = createSynthesisTopicGraphApplication({
      repository: repository.store,
      compute: compute(),
    });
    const initial = await application.replaceSnapshot({
      expectedManifestHash: null,
      snapshot: { nodes: [node("topic:one")], edges: [], reviewItems: [] },
    });
    const fault = openSynthesisNodeSqliteAdapter(repository.paths.databasePath);
    fault.adapter.run(
      `CREATE TRIGGER reject_topic_graph_edge BEFORE INSERT ON synt_topic_graph_edge BEGIN SELECT RAISE(ABORT, 'test_fault'); END`,
    );
    let failure: unknown;
    try {
      await application.replaceSnapshot({
        expectedManifestHash: initial.manifestHash,
        snapshot: {
          nodes: [node("topic:one"), node("topic:two")],
          edges: [
            {
              edgeId: "edge:related_to:topic_one:topic_two",
              sourceTopicId: "topic:one",
              targetTopicId: "topic:two",
              relation: "related_to",
              status: "suggested",
              provenance: [],
              evidenceRefs: [],
            },
          ],
          reviewItems: [],
        },
      });
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, Error);
    assert.equal(application.inspect().manifestHash, initial.manifestHash);
    assert.deepEqual(
      application.load().snapshot.nodes.map((row) => row.topicId),
      ["topic:one"],
    );
    assert.lengthOf(application.load().snapshot.edges, 0);
    fault.adapter.run(`DROP TRIGGER reject_topic_graph_edge`);
    fault.close();
    await application.shutdown();
    repository.close();
  });

  it("preserves last-good index and drains active computation", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-last-good-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const healthy = createSynthesisTopicGraphApplication({
      repository: repository.store,
      compute: compute(),
    });
    const created = await healthy.replaceSnapshot({
      expectedManifestHash: null,
      snapshot: { nodes: [node("topic:one")], edges: [], reviewItems: [] },
    });
    await healthy.rebuildIndex({ expectedManifestHash: created.manifestHash });
    const lastGood = repository.store.getTopicGraphApplicationState();
    await healthy.shutdown();

    const failing = createSynthesisTopicGraphApplication({
      repository: repository.store,
      compute: { buildIndex: async () => ({ malformed: true }) as never },
    });
    assert.equal(
      (
        await failing.rebuildIndex({
          expectedManifestHash: created.manifestHash,
        })
      ).status,
      "worker_failed",
    );
    assert.equal(
      repository.store.getTopicGraphApplicationState()?.indexHash,
      lastGood?.indexHash,
    );
    await failing.shutdown();

    const supersededManifest = `sha256:${"d".repeat(64)}`;
    const superseding = createSynthesisTopicGraphApplication({
      repository: repository.store,
      compute: {
        buildIndex: async (request) => {
          repository.store.replaceTopicGraphApplicationState({
            expectedManifestHash: request.sourceManifestHash,
            manifestHash: supersededManifest,
            state: {
              nodes: repository.store.listTopicGraphNodes(),
              edges: repository.store.listTopicGraphEdges(),
              reviewItems: repository.store.listTopicGraphReviewItems(),
            },
            now: "2026-07-18T00:00:00.000Z",
          });
          return createInProcessSynthesisTopicGraphIndexEngine().buildIndex(
            request,
          );
        },
      },
    });
    assert.equal(
      (
        await superseding.rebuildIndex({
          expectedManifestHash: created.manifestHash,
        })
      ).status,
      "basis_mismatch",
    );
    assert.equal(
      repository.store.getTopicGraphApplicationState()?.indexHash,
      lastGood?.indexHash,
    );
    await superseding.shutdown();

    const draining = createSynthesisTopicGraphApplication({
      repository: repository.store,
      compute: {
        buildIndex: async (_request, options) =>
          await new Promise((_resolve, reject) =>
            options?.signal?.addEventListener(
              "abort",
              () =>
                reject(
                  Object.assign(new Error("canceled"), {
                    code: "worker_canceled",
                  }),
                ),
              { once: true },
            ),
          ),
      },
    });
    const pending = draining.rebuildIndex({
      expectedManifestHash: supersededManifest,
    });
    await draining.shutdown();
    assert.equal((await pending).status, "stopping");
    assert.equal(
      (
        await draining.upsert({
          expectedManifestHash: supersededManifest,
          nodes: [node("topic:two")],
          edges: [],
        })
      ).status,
      "stopping",
    );
    repository.close();
  });

  it("installs an independently versioned Topic Graph table family", function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-schema-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.equal(
      SYNTHESIS_TOPIC_GRAPH_APPLICATION_REPOSITORY_SCHEMA_VERSION,
      "synthesis-topic-graph-application-repository.v2",
    );
    assert.includeMembers(
      [...SYNTHESIS_TOPIC_GRAPH_APPLICATION_TABLES],
      [
        "synt_topic_graph_application_state",
        "synt_topic_graph_node",
        "synt_topic_graph_edge",
        "synt_topic_graph_review_item",
      ],
    );
    assert.equal(repository.snapshot().mode, "isolated_shadow");
    repository.close();
  });

  it("keeps the Rust Topic Graph owner typed and represented in the parity corpus", function () {
    const projectRoot = path.resolve(process.cwd());
    const source = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs",
      ),
      "utf8",
    );
    const repository = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs",
      ),
      "utf8",
    );
    const corpus = JSON.parse(
      fs.readFileSync(
        path.join(
          projectRoot,
          "packages/synthesis-contracts/contract-set/synthesis-tag-concept-topic-graph-application-parity-v1/corpus.json",
        ),
        "utf8",
      ),
    );
    assert.include(source, "pub trait TopicGraphComputePort");
    assert.include(source, "pub fn decide_relation");
    assert.include(source, "pub fn purge_deleted");
    assert.include(repository, "pub struct TopicGraphReplacement");
    assert.notInclude(repository, "list_topic_graph_application_rows");
    assert.include(corpus.coverage.topicGraph, "cycle_review_delete_reopen");
  });
});
