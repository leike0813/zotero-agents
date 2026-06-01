import { assert } from "chai";
import fs from "fs";
import path from "path";
import {
  buildReferenceMatcherIndex,
  evaluateReferenceResolutionFixture,
  extractReferenceIdentifiersFromText,
  normalizeReferenceIdentifier,
  resolveReferenceWithPolicy,
  type ReferenceResolutionFixture,
} from "../../src/modules/synthesis/referenceMatcher";
import { buildReviewSeedData } from "../../.agents/skills/synthesis-reference-resolution-harness/scripts/build_review_seed";
import {
  emptyReviewState,
  exportReviewedGoldLabels,
  validateDecisionInput,
} from "../../.agents/skills/synthesis-reference-resolution-harness/scripts/serve_review";

const fixtureRoot = path.resolve(
  process.cwd(),
  "test/fixtures/synthesis-reference-resolution/current-library-v1",
);

function readFixtureJson<T>(fileName: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(fixtureRoot, fileName), "utf8"),
  ) as T;
}

function loadFixture(): ReferenceResolutionFixture {
  return {
    library: readFixtureJson("library.json"),
    references: readFixtureJson("references.json"),
    goldLabels: readFixtureJson("gold-labels.json"),
    dangerPairs: readFixtureJson("danger-pairs.json"),
  } as ReferenceResolutionFixture;
}

function loadReviewedFixture(): ReferenceResolutionFixture {
  return {
    library: readFixtureJson("library.json"),
    references: readFixtureJson("references.json"),
    goldLabels: readFixtureJson("gold-labels.reviewed.json"),
    dangerPairs: readFixtureJson("danger-pairs.json"),
  } as ReferenceResolutionFixture;
}

describe("Synthesis reference resolution matcher", function () {
  this.timeout(10000);

  it("keeps the current-library gold fixture complete and sanitized", function () {
    const metadata = readFixtureJson<{
      library_count: number;
      reference_count: number;
      gold_label_count: number;
    }>("metadata.json");
    const fixture = loadFixture();
    const referenceIds = new Set(
      fixture.references.references.map(
        (reference) => reference.reference_instance_id,
      ),
    );
    const itemKeys = new Set(
      fixture.library.papers.map((paper) => paper.item_key || paper.itemKey),
    );

    assert.equal(metadata.library_count, 55);
    assert.equal(metadata.reference_count, 2279);
    assert.equal(metadata.gold_label_count, 2279);
    assert.equal(fixture.library.papers.length, metadata.library_count);
    assert.equal(
      fixture.references.references.length,
      metadata.reference_count,
    );
    assert.equal(fixture.goldLabels.labels.length, metadata.gold_label_count);
    assert.equal(
      fixture.goldLabels.labels.filter((label) =>
        referenceIds.has(label.reference_instance_id),
      ).length,
      fixture.goldLabels.labels.length,
    );
    assert.equal(
      fixture.goldLabels.labels.filter(
        (label) =>
          label.target_item_key && !itemKeys.has(label.target_item_key),
      ).length,
      0,
    );

    const serialized = [
      "metadata.json",
      "library.json",
      "references.json",
      "gold-labels.json",
      "danger-pairs.json",
    ]
      .map((fileName) =>
        fs.readFileSync(path.join(fixtureRoot, fileName), "utf8"),
      )
      .join("\n");
    assert.notMatch(serialized, /(?:[A-Z]:\\|\/Users\/|AppData|Bearer\s+)/i);
    assert.notInclude(serialized, "ZOTERO_BRIDGE_TOKEN");
    assert.lengthOf(fixture.dangerPairs?.pairs || [], 4);
  });

  it("normalizes DOI, arXiv DOI, arXiv URL, and raw arXiv identifiers", function () {
    assert.deepEqual(
      normalizeReferenceIdentifier(
        "doi",
        "https://doi.org/10.48550/arXiv.2201.12345",
      ),
      { kind: "doi", value: "10.48550/arxiv.2201.12345" },
    );

    const extracted = extractReferenceIdentifiersFromText(
      "Preprint doi:10.48550/arXiv.2201.12345; arXiv:2201.12345v2; https://arxiv.org/abs/2201.12345",
    );
    assert.deepInclude(extracted, {
      kind: "doi",
      value: "10.48550/arxiv.2201.12345",
    });
    assert.deepInclude(extracted, { kind: "arxiv", value: "2201.12345" });
  });

  it("uses layered policies for strong identifiers, title evidence, compact titles, and review suggestions [inv.review.queue_bounded]", function () {
    const index = buildReferenceMatcherIndex([
      {
        paperRef: "1:ARXIV",
        itemKey: "ARXIV",
        title: "Arxiv Target",
        year: "2022",
        authors: ["Ada Lovelace"],
        arxiv: "2201.12345",
      },
      {
        paperRef: "1:HYBRID",
        itemKey: "HYBRID",
        title: "DETRs with Hybrid Matching",
        year: "2023",
        authors: ["Tianhe Ren", "Shilong Zhang"],
      },
      {
        paperRef: "1:DAB",
        itemKey: "DAB",
        title: "DAB-DETR: Dynamic Anchor Boxes are Better Queries for DETR",
        year: "2022",
        authors: ["Shilong Zhang", "Xiaokang Chen"],
      },
      {
        paperRef: "1:YOLACT",
        itemKey: "YOLACT",
        title: "YOLACT: Real-time Instance Segmentation",
        year: "2019",
        authors: ["Daniel Bolya", "Chong Zhou"],
      },
    ]);

    assert.deepInclude(
      resolveReferenceWithPolicy(
        {
          title: "A preprint",
          rawReference: "See arXiv:2201.12345 for details.",
        },
        index,
        "policy-a",
      ),
      {
        status: "matched",
        targetPaperRef: "1:ARXIV",
        confidence: "deterministic",
      },
    );
    assert.deepInclude(
      resolveReferenceWithPolicy(
        {
          title: "DETRs with Hybrid Matching",
          year: "2022",
          authors: ["Shilong Zhang"],
        },
        index,
        "policy-b",
      ),
      {
        status: "matched",
        targetPaperRef: "1:HYBRID",
        confidence: "deterministic",
      },
    );
    assert.deepInclude(
      resolveReferenceWithPolicy(
        {
          title: "Dabdetr: Dynamic Anchor Boxes are Better Queries for DETR",
          year: "2022",
          authors: ["Shilong Zhang"],
        },
        index,
        "policy-c",
      ),
      {
        status: "matched",
        targetPaperRef: "1:DAB",
        confidence: "deterministic",
      },
    );

    const nearNeighbor = resolveReferenceWithPolicy(
      {
        title: "YOLACT++: Better real-time instance segmentation",
        year: "2020",
        authors: ["Daniel Bolya", "Chong Zhou"],
      },
      index,
      "policy-d",
    );
    assert.equal(nearNeighbor.status, "suggested");
    assert.equal(nearNeighbor.confidence, "low");
    assert.isUndefined(nearNeighbor.targetPaperRef);
    assert.isTrue(
      nearNeighbor.suggestedCandidates.some(
        (candidate) =>
          candidate.paperRef === "1:YOLACT" && candidate.itemKey === "YOLACT",
      ),
    );
  });

  it("uses strong compact title exact matches without treating year or authors as negative evidence", function () {
    const index = buildReferenceMatcherIndex([
      {
        paperRef: "1:FASTERRCNN",
        itemKey: "M3AU5AC9",
        title:
          "Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks",
        year: "2017",
        authors: ["Shaoqing Ren"],
      },
      {
        paperRef: "1:CENTER",
        itemKey: "J6DSFFBH",
        title: "Center-based 3D Object Detection and Tracking",
        year: "2021",
        authors: ["Tianwei Yin"],
      },
    ]);

    assert.deepInclude(
      resolveReferenceWithPolicy(
        {
          title:
            "Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks",
          year: "2015",
          authors: ["Ren"],
        },
        index,
        "production",
      ),
      {
        status: "matched",
        targetPaperRef: "1:FASTERRCNN",
        confidence: "deterministic",
      },
    );

    const symbolNoiseResult = resolveReferenceWithPolicy(
      {
        title: "Center- ¨ based 3d object detection and tracking",
        year: "2020",
      },
      index,
      "production",
    );
    assert.deepInclude(symbolNoiseResult, {
      status: "matched",
      targetPaperRef: "1:CENTER",
      confidence: "deterministic",
    });
    assert.include(
      symbolNoiseResult.suggestedCandidates[0]?.reasons || [],
      "strong_compact_title_exact",
    );
  });

  it("strips bibliographic suffixes before strong title matching", function () {
    const index = buildReferenceMatcherIndex([
      {
        paperRef: "1:CONDITIONAL",
        itemKey: "W4CDLU28",
        title: "Conditional DETR for Fast Training Convergence",
        year: "2021",
        authors: ["Depu Meng"],
      },
      {
        paperRef: "1:DETRS-YOLO",
        itemKey: "CBJWE4JX",
        title: "DETRs Beat YOLOs on Real-time Object Detection",
        year: "2024",
        authors: ["Yiming Zhao"],
      },
    ]);

    for (const [title, targetPaperRef] of [
      [
        "Conditional DETR for Fast Training Convergence. In Proceedings of the IEEE/CVF International Conference on Computer Vision, pp. 3651-3660",
        "1:CONDITIONAL",
      ],
      [
        "DETRs beat YOLOs on real-time object detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, 2024",
        "1:DETRS-YOLO",
      ],
    ] as const) {
      const result = resolveReferenceWithPolicy({ title }, index, "production");
      assert.deepInclude(result, {
        status: "matched",
        targetPaperRef,
        confidence: "deterministic",
      });
      assert.include(
        result.suggestedCandidates[0]?.reasons || [],
        "stripped_strong_compact_title_exact",
      );
    }
  });

  it("does not auto-match strong compact title collisions", function () {
    const index = buildReferenceMatcherIndex([
      {
        paperRef: "1:LEFT",
        itemKey: "LEFT",
        title: "Alpha-Beta Detection",
        year: "2022",
        authors: ["Ada Lovelace"],
      },
      {
        paperRef: "1:RIGHT",
        itemKey: "RIGHT",
        title: "Alpha Beta Detection",
        year: "2023",
        authors: ["Grace Hopper"],
      },
    ]);

    const result = resolveReferenceWithPolicy(
      { title: "Alpha Beta Detection" },
      index,
      "production",
    );
    assert.equal(result.status, "ambiguous");
    assert.isUndefined(result.targetPaperRef);
  });

  it("does not auto-match known dangerous near-neighbor titles", function () {
    const index = buildReferenceMatcherIndex([
      {
        paperRef: "1:MOTR",
        itemKey: "KSM65VAD",
        title: "MOTR: end-to-end multiple-object tracking with transformer",
        year: "2022",
        authors: ["Zhang", "Wang"],
      },
      {
        paperRef: "1:SAM",
        itemKey: "8WM66ZL3",
        title: "Segment Anything",
        year: "2023",
        authors: ["Kirillov", "Mintun"],
      },
      {
        paperRef: "1:SPARSE-DETR",
        itemKey: "29IBKEUR",
        title:
          "Sparse DETR: efficient end-to-end object detection with learnable sparsity",
        year: "2022",
        authors: ["Roh", "Shin"],
      },
    ]);

    for (const reference of [
      {
        title: "Transtrack: Multiple object tracking with transformer",
        year: "2021",
        authors: ["Zhang", "Wang"],
      },
      {
        title: "Fast Segment Anything",
        year: "2023",
        authors: ["Kirillov", "Mintun"],
      },
      {
        title:
          "Sparse R-CNN: End-to-end object detection with learnable proposals",
        year: "2021",
        authors: ["Roh", "Shin"],
      },
    ]) {
      assert.notEqual(
        resolveReferenceWithPolicy(reference, index, "policy-d").status,
        "matched",
        reference.title,
      );
    }
  });

  it("evaluates the experiment matrix without danger-set false positives", function () {
    const fixture = loadFixture();
    const baseline = evaluateReferenceResolutionFixture(fixture, "baseline");
    const production = evaluateReferenceResolutionFixture(
      fixture,
      "production",
    );

    assert.equal(production.total, 2279);
    assert.equal(production.dangerFalsePositive, 0);
    assert.isAtLeast(production.truePositive, baseline.truePositive);
    assert.isAtLeast(
      production.candidateAt3Recall,
      production.candidateAt1Recall,
    );
  });

  it("evaluates reviewed gold labels with high recall and no false positives [inv.reference.precision_first]", function () {
    const result = evaluateReferenceResolutionFixture(
      loadReviewedFixture(),
      "production",
    );

    assert.equal(result.total, 2279);
    assert.equal(result.falsePositive, 0);
    assert.equal(result.dangerFalsePositive, 0);
    assert.equal(result.precision, 1);
    assert.isAtLeast(result.recall, 0.97);
  });

  it("builds interactive review seeds with confirmed and candidate edges", function () {
    const seed = buildReviewSeedData({
      fixture: "memory",
      generatedAt: "2026-05-29T00:00:00.000Z",
      sourceLabels: "trusted.json",
      library: {
        papers: [
          {
            paperRef: "1:TARGET",
            itemKey: "TARGET",
            literatureItemId: "lit:target",
            title: "Exact Target",
            year: "2024",
            authors: ["Ada Lovelace"],
            identifiers: [{ kind: "citekey", value: "trusted_target_2024" }],
          },
          {
            paperRef: "1:DAB",
            itemKey: "DAB",
            literatureItemId: "lit:dab",
            title: "DAB-DETR: Dynamic Anchor Boxes are Better Queries for DETR",
            year: "2022",
            authors: ["Shilong Liu"],
          },
          {
            paperRef: "1:MOTR",
            itemKey: "MOTR",
            literatureItemId: "lit:motr",
            title: "MOTR: end-to-end multiple-object tracking with transformer",
            year: "2022",
            authors: ["Zhang", "Wang"],
          },
        ],
      },
      references: {
        references: [
          {
            reference_instance_id: "ref:trusted",
            source_item_key: "TARGET",
            parsed_title: "Exact Target",
            year: "2024",
            authors: ["Ada Lovelace"],
          },
          {
            reference_instance_id: "ref:candidate",
            source_item_key: "TARGET",
            parsed_title:
              "Dabdetr: Dynamic Anchor Boxes are Better Queries for DETR",
            year: "2022",
            authors: ["Shilong Liu"],
          },
          {
            reference_instance_id: "ref:danger",
            source_item_key: "TARGET",
            parsed_title:
              "Transtrack: Multiple object tracking with transformer",
            year: "2021",
            authors: ["Zhang", "Wang"],
          },
        ],
      },
      trustedLabels: {
        labels: [
          {
            reference_instance_id: "ref:trusted",
            label: "match",
            target_item_key: "TARGET",
            target_literature_item_id: "lit:target",
          },
        ],
      },
      dangerPairs: {
        pairs: [
          {
            reference_title: "Transtrack",
            candidate_item_key: "MOTR",
          },
        ],
      },
    });

    assert.equal(seed.references.length, 3);
    assert.equal(
      seed.edges.filter((edge) => edge.kind === "confirmed").length,
      1,
    );
    assert.deepInclude(
      seed.edges.map((edge) => ({
        reference_instance_id: edge.reference_instance_id,
        target_item_key: edge.target_item_key,
        kind: edge.kind,
      })),
      {
        reference_instance_id: "ref:candidate",
        target_item_key: "DAB",
        kind: "candidate",
      },
    );
    assert.isFalse(
      seed.edges.some(
        (edge) =>
          edge.reference_instance_id === "ref:danger" &&
          edge.target_item_key === "MOTR" &&
          edge.kind === "confirmed",
      ),
    );
  });

  it("validates review decisions and exports reviewed labels without overwriting gold", function () {
    const seed = buildReviewSeedData({
      fixture: "memory",
      library: {
        papers: [
          {
            paperRef: "1:TARGET",
            itemKey: "TARGET",
            literatureItemId: "lit:target",
            title: "Exact Target",
            year: "2024",
            authors: ["Ada Lovelace"],
          },
        ],
      },
      references: {
        references: [
          {
            reference_instance_id: "ref:one",
            source_item_key: "TARGET",
            parsed_title: "Exact Target",
            year: "2024",
            authors: ["Ada Lovelace"],
          },
        ],
      },
    });

    const { referenceId, decision } = validateDecisionInput(seed, {
      reference_instance_id: "ref:one",
      label: "match",
      target_item_key: "TARGET",
      evidence: ["human_review"],
      rationale: "reviewed",
    });
    const reviewState = emptyReviewState();
    reviewState.decisions[referenceId] = decision;
    const exported = exportReviewedGoldLabels(seed, reviewState);

    assert.equal(
      exported.schema,
      "synthesis.reference_resolution_gold_labels.reviewed.v1",
    );
    assert.equal(exported.labels.length, 1);
    assert.deepInclude(exported.labels[0], {
      reference_instance_id: "ref:one",
      label: "match",
      target_item_key: "TARGET",
      target_literature_item_id: "lit:target",
    });
  });
});
