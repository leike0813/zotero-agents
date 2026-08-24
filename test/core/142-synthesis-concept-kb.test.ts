import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  buildSynthesisKnowledgeGraphPaths,
  readProjectionRegistryState,
} from "../../src/modules/synthesis/foundation";
import { createSynthesisConceptKbService } from "../../src/modules/synthesis/conceptKb";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import {
  createInProcessSynthesisConceptKbIndexEngine,
  type SynthesisConceptKbIndexEngine,
} from "../../packages/synthesis-engine/src/conceptKbIndex";
import {
  readRuntimeTextFile,
  runtimePathExists,
} from "../../src/modules/runtimePersistence";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-concept-kb-"));
}

function canonicalStoreText(root: string, kind: string) {
  return createSynthesisRepository({ runtimeRoot: root })
    .listCanonicalStoreRecords({ recordKinds: [kind] })
    .map((row) => row.payloadJson)
    .join("\n");
}

describe("Synthesis concept KB", function () {
  it("initializes Concept KB runtime state in SQLite without canonical assets", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({ root });

    const snapshot = await service.loadConceptKb();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const repository = createSynthesisRepository({ runtimeRoot: root });

    assert.deepEqual(snapshot.concepts, []);
    assert.equal(repository.countRows("synt_concept"), 0);
    assert.isFalse(
      await runtimePathExists(path.join(paths.conceptsRoot, "manifest.json")),
    );
  });

  it("writes and reads concept records from SQLite", async function () {
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
    const repository = createSynthesisRepository({ runtimeRoot: root });
    assert.deepEqual(
      snapshot.concepts.map((entry) => entry.concept_id),
      ["concept:cv:detr"],
    );
    assert.equal(snapshot.overlay_entries[0]?.alias, "DETR");
    assert.equal(repository.countRows("synt_concept"), 1);
    assert.equal(repository.countRows("synt_concept_sense"), 1);
    assert.equal(repository.countRows("synt_concept_alias"), 1);
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
    assert.lengthOf(result.aliases, 1);
    assert.lengthOf(result.topic_links, 1);

    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const repository = createSynthesisRepository({ runtimeRoot: root });
    assert.equal(repository.countRows("synt_topic_concept_link"), 1);
    assert.isFalse(
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

  it("exports Concept KB JSON only through an explicit checkpoint", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({
      root,
      now: () => "2026-05-25T00:00:00.000Z",
    });
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const manifestPath = path.join(paths.conceptsRoot, "manifest.json");

    await service.ingestConceptCardProposals({
      topicId: "object-detection",
      topicPathId: "object-detection",
      payload: {
        cards: [
          {
            label: "DETR",
            concept_type: "model",
            domain: "computer vision",
            short_definition: "End-to-end object detector.",
            definition: "Transformer-based object detection model.",
            confidence: 0.9,
          },
        ],
      },
    });

    assert.isFalse(await runtimePathExists(manifestPath));

    const checkpoint = await service.exportConceptKbCheckpoint({
      transactionId: "concept-kb-checkpoint",
    });
    const manifest = JSON.parse(await readRuntimeTextFile(manifestPath));

    assert.equal(checkpoint.transactionId, "concept-kb-checkpoint");
    assert.equal(manifest.schema_id, "synthesis.concept_manifest");
    assert.equal(manifest.data.concept_count, 1);
    assert.includeMembers(checkpoint.receipt.changed_assets, [
      "concepts/manifest.json",
    ]);
    assert.isTrue(
      checkpoint.receipt.changed_assets.some((asset) =>
        asset.startsWith("concepts/topic-links/topic_"),
      ),
    );
  });

  it("merges exact canonical label matches and downgrades low-confidence proposals to review diagnostics", async function () {
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

    const diagnostics = canonicalStoreText(root, "diagnostic");
    assert.include(diagnostics, "low_confidence_concept");
    assert.notInclude(diagnostics, root);
    assert.notInclude(diagnostics, "abc123");
  });

  it("preflights alias conflicts against the complete batch independent of proposal order", async function () {
    async function ingest(cards: unknown[]) {
      const root = await makeRuntimeRoot();
      const service = createSynthesisConceptKbService({ root });
      await service.ingestConceptCardProposals({
        topicId: "topic-batch",
        payload: { cards },
      });
      const snapshot = await service.loadConceptKb();
      return {
        concepts: snapshot.concepts.map((entry) => entry.label).sort(),
        reviews: snapshot.review_items
          .map((entry) => [entry.label, entry.reason])
          .sort(),
      };
    }
    const broader = {
      label: "Computer Vision",
      aliases: ["Object Detection"],
      concept_type: "field",
      domain: "computer vision",
      short_definition: "Visual computing field.",
      definition: "Research field covering visual perception.",
      confidence: 0.9,
    };
    const task = {
      label: "Object Detection",
      aliases: [],
      concept_type: "task",
      domain: "computer vision",
      short_definition: "Detect and localize objects.",
      definition: "A visual recognition task.",
      confidence: 0.9,
    };

    const forward = await ingest([broader, task]);
    const reverse = await ingest([task, broader]);

    assert.deepEqual(forward, reverse);
    assert.deepEqual(forward.concepts, []);
    assert.deepEqual(forward.reviews, [
      ["Computer Vision", "alias_conflict"],
      ["Object Detection", "alias_conflict"],
    ]);
  });

  it("audits structural alias conflicts and applies explicit keep/remove decisions without deleting concepts or senses", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({
      root,
      now: () => "2026-05-25T00:00:00.000Z",
    });
    await service.saveConceptKb({
      concepts: [
        {
          concept_id: "concept:cv:field",
          label: "Computer Vision",
          aliases: ["Object Detection", "Image Segmentation"],
          concept_type: "field",
          domain: "computer vision",
          status: "active",
          sense_ids: ["sense:cv:field"],
          created_at: "2026-05-25T00:00:00.000Z",
          updated_at: "2026-05-25T00:00:00.000Z",
        },
        {
          concept_id: "concept:cv:detection",
          label: "Object Detection",
          aliases: [],
          concept_type: "task",
          domain: "computer vision",
          status: "active",
          sense_ids: [],
          created_at: "2026-05-25T00:00:00.000Z",
          updated_at: "2026-05-25T00:00:00.000Z",
        },
        {
          concept_id: "concept:cv:segmentation",
          label: "Image Segmentation",
          aliases: [],
          concept_type: "task",
          domain: "computer vision",
          status: "active",
          sense_ids: [],
          created_at: "2026-05-25T00:00:00.000Z",
          updated_at: "2026-05-25T00:00:00.000Z",
        },
      ],
      senses: [
        {
          sense_id: "sense:cv:field",
          concept_id: "concept:cv:field",
          label: "Computer Vision",
          aliases: ["Object Detection", "Image Segmentation"],
          domain: "computer vision",
          short_definition: "Visual computing field.",
          definition: "Research field covering visual perception.",
          confidence: "high",
          source_topic_ids: ["topic-cv"],
          evidence: [],
          created_at: "2026-05-25T00:00:00.000Z",
          updated_at: "2026-05-25T00:00:00.000Z",
        },
      ],
      aliases: [
        {
          alias_id: "alias:object-detection",
          alias: "Object Detection",
          normalized: "object detection",
          concept_id: "concept:cv:field",
          sense_id: "sense:cv:field",
          status: "active",
          confidence: "high",
          created_at: "2026-05-25T00:00:00.000Z",
          updated_at: "2026-05-25T00:00:00.000Z",
        },
        {
          alias_id: "alias:image-segmentation",
          alias: "Image Segmentation",
          normalized: "image segmentation",
          concept_id: "concept:cv:field",
          sense_id: "sense:cv:field",
          status: "active",
          confidence: "high",
          created_at: "2026-05-25T00:00:00.000Z",
          updated_at: "2026-05-25T00:00:00.000Z",
        },
      ],
    });

    const audit = await service.auditConceptAliases();
    assert.equal(audit.created_review_count, 2);
    const reviews = (await service.loadConceptKb()).review_items;
    const keptReview = reviews.find(
      (entry) => entry.audit_alias?.alias === "Object Detection",
    )!;
    const removedReview = reviews.find(
      (entry) => entry.audit_alias?.alias === "Image Segmentation",
    )!;
    assert.equal(keptReview.reason, "alias_conflict");

    const kept = await service.applyConceptReviewAction({
      reviewId: keptReview.review_id,
      action: "keep_alias",
    });
    assert.equal(kept.review_item?.status, "approved");

    const result = await service.applyConceptReviewAction({
      reviewId: removedReview.review_id,
      action: "remove_alias",
    });

    assert.equal(result.review_item?.status, "rejected");
    const snapshot = await service.loadConceptKb();
    assert.lengthOf(snapshot.concepts, 3);
    assert.lengthOf(snapshot.senses, 1);
    assert.deepEqual(
      snapshot.aliases.map((entry) => entry.alias),
      ["Object Detection"],
    );
    assert.deepEqual(snapshot.concepts[0]?.aliases, ["Object Detection"]);
    assert.deepEqual(snapshot.senses[0]?.aliases, ["Object Detection"]);
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
    const repository = createSynthesisRepository({ runtimeRoot: root });
    assert.equal(repository.countRows("synt_concept"), 1);
    assert.equal(repository.countRows("synt_concept_review_item"), 1);
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

  it("deletes concepts and their dependent concept KB rows", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({
      root,
      now: () => "2026-05-25T00:00:00.000Z",
    });
    await service.ingestConceptCardProposals({
      topicId: "topic-delete",
      payload: {
        cards: [
          {
            label: "Delete Me",
            aliases: ["Remove Alias"],
            concept_type: "method",
            domain: "computer vision",
            short_definition: "Temporary concept.",
            definition: "Temporary concept.",
            confidence: 0.9,
          },
          {
            label: "Keep Me",
            aliases: ["Keep Alias"],
            concept_type: "method",
            domain: "computer vision",
            short_definition: "Persistent concept.",
            definition: "Persistent concept.",
            confidence: 0.9,
          },
        ],
      },
    });
    const before = await service.loadConceptKb();
    const deletedConcept = before.concepts.find(
      (entry) => entry.label === "Delete Me",
    )!;

    const result = await service.deleteConceptEntries({
      conceptIds: [deletedConcept.concept_id],
      transactionId: "delete-concept",
    });

    assert.deepEqual(result.deleted_concept_ids, [deletedConcept.concept_id]);
    assert.isUndefined(result.diagnostic);
    const snapshot = await service.loadConceptKb();
    assert.deepEqual(
      snapshot.concepts.map((entry) => entry.label),
      ["Keep Me"],
    );
    assert.notInclude(
      snapshot.aliases.map((entry) => entry.alias),
      "Remove Alias",
    );
    assert.deepEqual(
      snapshot.senses.map((entry) => entry.label),
      ["Keep Me"],
    );
    const repository = createSynthesisRepository({ runtimeRoot: root });
    assert.equal(repository.countRows("synt_concept"), 1);
    assert.equal(repository.countRows("synt_concept_sense"), 1);
    assert.equal(repository.countRows("synt_topic_concept_link"), 1);
  });

  it("rebuilds concept-kb-index projection explicitly and computes missing projection from SQLite", async function () {
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
    const indexPath = path.join(paths.sidecarRoot, "concept-kb-index.json");
    assert.isFalse(await runtimePathExists(indexPath));

    const projection = await service.readConceptKbIndexProjection();
    assert.deepEqual(
      projection.concepts.map((entry) => entry.label),
      ["Object Detection"],
    );
    assert.isFalse(await runtimePathExists(indexPath));
  });

  it("preserves projection registry and Concept KB rows when engine output is malformed", async function () {
    const root = await makeRuntimeRoot();
    const stable = createSynthesisConceptKbService({ root });
    await stable.ingestConceptCardProposals({
      topicId: "topic-stable",
      payload: {
        cards: [
          {
            label: "Stable Concept",
            aliases: ["Stable Alias"],
            concept_type: "task",
            domain: "computer vision",
            short_definition: "Stable.",
            definition: "Stable concept definition.",
            confidence: 0.9,
          },
        ],
      },
    });
    await stable.rebuildConceptKbIndexProjection();
    const before = await readProjectionRegistryState(root);
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const rowCount = repository.countRows("synt_concept");
    const defaultEngine = createInProcessSynthesisConceptKbIndexEngine();
    const malformed: SynthesisConceptKbIndexEngine = {
      async buildIndex(request) {
        return {
          ...(await defaultEngine.buildIndex(request)),
          overlayEntries: [],
        };
      },
      query(request) {
        return defaultEngine.query(request);
      },
    };
    const service = createSynthesisConceptKbService({
      root,
      repository,
      engine: malformed,
    });

    let failure: unknown;
    try {
      await service.rebuildConceptKbIndexProjection();
    } catch (error) {
      failure = error;
    }

    assert.instanceOf(failure, Error);
    assert.deepEqual(
      (await readProjectionRegistryState(root)).projections,
      before.projections,
    );
    assert.equal(repository.countRows("synt_concept"), rowCount);
  });

  it("preserves exact, alias, sense-candidate, and ambiguity query shapes", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisConceptKbService({ root });
    await service.ingestConceptCardProposals({
      topicId: "topic-query",
      payload: {
        cards: [
          {
            label: "Object Detection",
            aliases: ["Detection"],
            concept_type: "task",
            domain: "computer vision",
            short_definition: "Find objects.",
            definition: "Detect objects.",
            confidence: 0.9,
          },
        ],
      },
    });

    const result = await service.queryConceptKbCandidates({
      labels: ["Object Detection", "Detection", "Missing"],
    });

    assert.deepEqual(
      result.matches.map((match) => ({
        label: match.label,
        exact: match.exact_matches.length,
        aliases: match.alias_matches.length,
        senses: match.sense_candidates.length,
        ambiguous: match.ambiguous,
      })),
      [
        {
          label: "Object Detection",
          exact: 1,
          aliases: 0,
          senses: 1,
          ambiguous: false,
        },
        {
          label: "Detection",
          exact: 0,
          aliases: 1,
          senses: 1,
          ambiguous: false,
        },
        {
          label: "Missing",
          exact: 0,
          aliases: 0,
          senses: 0,
          ambiguous: false,
        },
      ],
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

    const diagnostics = canonicalStoreText(root, "diagnostic");
    assert.include(diagnostics, "invalid_concept_cards_payload");
    assert.notInclude(diagnostics, root);
    assert.notInclude(diagnostics, "abc123");
  });
});
