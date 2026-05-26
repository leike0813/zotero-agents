import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  buildSynthesisKnowledgeGraphPaths,
  readProjectionRegistryState,
} from "../../src/modules/synthesis/foundation";
import { createSynthesisConceptKbService } from "../../src/modules/synthesis/conceptKb";
import {
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
} from "../../src/modules/runtimePersistence";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-concept-kb-"));
}

describe("Synthesis concept KB", function () {
  it("initializes canonical concept assets in an empty KG store", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({ root });

    const snapshot = await service.loadConceptKb();
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    assert.deepEqual(snapshot.concepts, []);
    for (const dirName of [
      "concepts",
      "senses",
      "aliases",
      "relations",
      "review",
      "tombstones",
    ]) {
      assert.isTrue(
        await runtimePathExists(path.join(paths.conceptsRoot, dirName)),
      );
    }
    assert.isTrue(
      await runtimePathExists(path.join(paths.conceptsRoot, "manifest.json")),
    );
  });

  it("writes, reads, and marks concept-kb-index stale for canonical concept records", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({
      root,
      now: () => "2026-05-25T00:00:00.000Z",
    });

    await service.saveConceptKb({
      transactionId: "concept-kb-save",
      concepts: [
        {
          concept_id: "concept:cv:detr",
          label: "DETR",
          aliases: ["DETR", "DEtection TRansformer"],
          concept_type: "model",
          domain: "computer vision",
          status: "active",
          short_definition: "End-to-end object detector.",
          definition: "Transformer-based object detection model.",
          sense_ids: ["sense:cv:detr"],
          created_at: "2026-05-25T00:00:00.000Z",
          updated_at: "2026-05-25T00:00:00.000Z",
        },
      ],
      senses: [
        {
          sense_id: "sense:cv:detr",
          concept_id: "concept:cv:detr",
          label: "DETR",
          aliases: ["DETR"],
          domain: "computer vision",
          short_definition: "End-to-end object detector.",
          definition: "Transformer-based object detection model.",
          confidence: "high",
          source_topic_ids: ["object-detection"],
          evidence: [],
          created_at: "2026-05-25T00:00:00.000Z",
          updated_at: "2026-05-25T00:00:00.000Z",
        },
      ],
      aliases: [
        {
          alias_id: "alias:detr",
          alias: "DETR",
          normalized: "detr",
          concept_id: "concept:cv:detr",
          sense_id: "sense:cv:detr",
          status: "active",
          confidence: "high",
          created_at: "2026-05-25T00:00:00.000Z",
          updated_at: "2026-05-25T00:00:00.000Z",
        },
      ],
    });

    const snapshot = await service.loadConceptKb();
    assert.deepEqual(
      snapshot.concepts.map((entry) => entry.concept_id),
      ["concept:cv:detr"],
    );
    assert.equal(snapshot.overlay_entries[0]?.alias, "DETR");

    const registry = await readProjectionRegistryState(root);
    assert.isTrue(registry.projections["concept-kb-index"].stale);
    assert.equal(
      registry.projections["concept-kb-index"].last_transaction_id,
      "concept-kb-save",
    );
  });

  it("ingests concept card proposals into concept, sense, alias, and topic link records", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({ root });

    const result = await service.ingestConceptCardProposals({
      topicId: "object-detection",
      topicPathId: "object-detection",
      transactionId: "concept-cards",
      payload: {
        schema_id: "synthesis.concept_cards_proposal",
        cards: [
          {
            label: "DETR",
            aliases: ["DEtection TRansformer"],
            concept_type: "method_family",
            domain: "computer vision",
            short_definition: "End-to-end object detector.",
            definition: "DETR formulates object detection as set prediction.",
            topic_relevance: "central method",
            confidence: 0.9,
            evidence: [{ section: "taxonomy" }],
          },
        ],
      },
    });

    assert.lengthOf(result.concepts, 1);
    assert.lengthOf(result.senses, 1);
    assert.lengthOf(result.aliases, 2);
    assert.lengthOf(result.topic_links, 1);

    const paths = buildSynthesisKnowledgeGraphPaths(root);
    assert.isTrue(
      await runtimePathExists(
        path.join(
          paths.topicsRoot,
          "object-detection",
          "current",
          "concepts.json",
        ),
      ),
    );
  });

  it("merges exact alias matches and downgrades low-confidence proposals to review diagnostics", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({ root });

    await service.ingestConceptCardProposals({
      topicId: "topic-a",
      payload: {
        cards: [
          {
            label: "Transformer",
            aliases: ["Transformer"],
            concept_type: "mechanism",
            domain: "deep learning",
            short_definition: "Sequence model architecture.",
            definition: "Self-attention architecture.",
            confidence: 0.9,
          },
        ],
      },
    });
    await service.ingestConceptCardProposals({
      topicId: "topic-b",
      payload: {
        cards: [
          {
            label: "Transformer",
            aliases: ["Transformer"],
            concept_type: "mechanism",
            domain: "deep learning",
            short_definition: "Same alias.",
            definition: "Same alias, new sense.",
            confidence: 0.9,
          },
          {
            label: "token=abc123 low concept",
            concept_type: "mechanism",
            domain: `${root}\\secret`,
            short_definition: "Weak.",
            definition: "Weak.",
            confidence: 0.2,
          },
        ],
      },
    });

    const snapshot = await service.loadConceptKb();
    assert.lengthOf(snapshot.concepts, 1);
    assert.isAtLeast(snapshot.senses.length, 1);
    assert.lengthOf(snapshot.review_items, 1);
    assert.equal(snapshot.review_items[0]?.reason, "low_confidence_concept");

    const diagnostics = await readRuntimeTextFile(
      buildSynthesisKnowledgeGraphPaths(root).diagnosticsLog,
    );
    assert.include(diagnostics, "low_confidence_concept");
    assert.notInclude(diagnostics, root);
    assert.notInclude(diagnostics, "abc123");
  });

  it("approves low-confidence concept review items as new concepts", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({
      root,
      now: () => "2026-05-25T00:00:00.000Z",
    });
    await service.ingestConceptCardProposals({
      topicId: "topic-low",
      topicPathId: "topic-low",
      payload: {
        cards: [
          {
            label: "Weak Candidate",
            concept_type: "mechanism",
            domain: "computer vision",
            short_definition: "Needs review.",
            definition: "A weak proposal.",
            confidence: 0.2,
          },
        ],
      },
    });
    const review = (await service.loadConceptKb()).review_items[0]!;

    const result = await service.applyConceptReviewAction({
      reviewId: review.review_id,
      action: "approve_create",
      transactionId: "approve-review",
    });

    assert.isUndefined(result.diagnostic);
    assert.equal(result.review_item?.status, "approved");
    const snapshot = await service.loadConceptKb();
    assert.deepEqual(
      snapshot.concepts.map((entry) => entry.label),
      ["Weak Candidate"],
    );
    assert.equal(snapshot.review_items[0]?.status, "approved");
    const registry = await readProjectionRegistryState(root);
    assert.isTrue(registry.projections["concept-kb-index"].stale);
  });

  it("queues ambiguous concept reviews and merges them into an existing concept", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({ root });
    await service.ingestConceptCardProposals({
      topicId: "seed",
      payload: {
        cards: [
          {
            label: "Object Detection",
            concept_type: "task",
            domain: "computer vision",
            short_definition: "Detect objects.",
            definition: "Detect objects.",
            confidence: 0.9,
          },
          {
            label: "Object Recognition",
            concept_type: "task",
            domain: "computer vision",
            short_definition: "Recognize objects.",
            definition: "Recognize objects.",
            confidence: 0.9,
          },
        ],
      },
    });
    await service.ingestConceptCardProposals({
      topicId: "topic-ambiguous",
      payload: {
        cards: [
          {
            label: "Object",
            concept_type: "task",
            domain: "computer vision",
            short_definition: "Ambiguous object concept.",
            definition: "Ambiguous object concept.",
            confidence: 0.9,
          },
        ],
      },
    });
    const queued = await service.loadConceptKb();
    const review = queued.review_items.find(
      (entry) => entry.reason === "ambiguous_concept_match",
    )!;

    assert.isOk(review);
    assert.isAtLeast(review.candidate_concept_ids.length, 2);

    const result = await service.applyConceptReviewAction({
      reviewId: review.review_id,
      action: "merge_into_existing",
      targetConceptId: review.candidate_concept_ids[0],
    });

    assert.isUndefined(result.diagnostic);
    assert.equal(result.review_item?.status, "merged");
    const snapshot = await service.loadConceptKb();
    const target = snapshot.concepts.find(
      (entry) => entry.concept_id === review.candidate_concept_ids[0],
    );
    assert.include(target?.sense_ids || [], result.sense?.sense_id);
    assert.equal(
      snapshot.review_items.find(
        (entry) => entry.review_id === review.review_id,
      )?.status,
      "merged",
    );
  });

  it("rejects concept review items without creating concept records", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({ root });
    await service.ingestConceptCardProposals({
      topicId: "topic-reject",
      payload: {
        cards: [
          {
            label: "Reject Me",
            concept_type: "mechanism",
            domain: "computer vision",
            short_definition: "Reject.",
            definition: "Reject.",
            confidence: 0.2,
          },
        ],
      },
    });
    const review = (await service.loadConceptKb()).review_items[0]!;

    const result = await service.applyConceptReviewAction({
      reviewId: review.review_id,
      action: "reject",
    });

    assert.equal(result.review_item?.status, "rejected");
    const snapshot = await service.loadConceptKb();
    assert.deepEqual(snapshot.concepts, []);
    assert.equal(snapshot.review_items[0]?.status, "rejected");
  });

  it("rebuilds concept-kb-index projection from canonical files after cache deletion", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({ root });
    await service.ingestConceptCardProposals({
      topicId: "topic-a",
      payload: {
        cards: [
          {
            label: "Object Detection",
            concept_type: "task",
            domain: "computer vision",
            short_definition: "Find objects.",
            definition: "Detect and localize visual objects.",
            confidence: 0.9,
          },
        ],
      },
    });

    const state = await service.rebuildConceptKbIndexProjection();
    assert.isFalse(state.stale);
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const indexPath = path.join(paths.stateRoot, "concept-kb-index.json");
    assert.isTrue(await runtimePathExists(indexPath));
    await removeRuntimePath(indexPath);

    const projection = await service.readConceptKbIndexProjection();
    assert.deepEqual(
      projection.concepts.map((entry) => entry.label),
      ["Object Detection"],
    );
  });

  it("writes sanitized diagnostics for malformed proposal sidecars", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({ root });

    await service.ingestConceptCardProposals({
      topicId: `${root}\\secret\\token=abc123`,
      transactionId: "concept-sensitive",
      payload: { cards_missing: true },
    });

    const diagnostics = await readRuntimeTextFile(
      buildSynthesisKnowledgeGraphPaths(root).diagnosticsLog,
    );
    assert.include(diagnostics, "invalid_concept_cards_payload");
    assert.notInclude(diagnostics, root);
    assert.notInclude(diagnostics, "abc123");
  });
});
