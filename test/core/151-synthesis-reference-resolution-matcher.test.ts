import { assert } from "chai";
import fs from "fs";
import path from "path";
import {
  buildReferenceMatcherIndex,
  dedupeCanonicalReferencesClustered,
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

  it("dedupes canonical references through cluster actions and keeps risky output review-only", function () {
    const result = dedupeCanonicalReferencesClustered([
      {
        canonicalReferenceId: "cref:attention-a",
        title: "Attention is all you need",
        year: "2017",
        authors: ["Ashish Vaswani", "Noam Shazeer"],
        rawReferenceIds: ["raw:a"],
        rawHashes: ["hash:a"],
      },
      {
        canonicalReferenceId: "cref:attention-b",
        title: "Attention is all you need",
        year: "2017",
        authors: ["Vaswani, A.", "Shazeer, N."],
        rawReferenceIds: ["raw:b"],
        rawHashes: ["hash:b"],
      },
      {
        canonicalReferenceId: "cref:attention-noisy",
        title:
          "Gomez Lukasz Kaiser and Illia Polosukhin Attention is all you need",
        year: "2017",
        authors: ["Ashish Vaswani"],
        rawReferenceIds: ["raw:c"],
        rawHashes: ["hash:c"],
      },
      {
        canonicalReferenceId: "cref:condconv-a",
        title:
          "CondConv: Conditionally Parameterized Convolutions for Efficient Inference",
        year: "2019",
        authors: ["Brandon Yang"],
        rawReferenceIds: ["raw:d"],
        rawHashes: ["hash:d"],
      },
      {
        canonicalReferenceId: "cref:condconv-b",
        title:
          "CondConv: Conditionally Parameterized Convolutions for Effcient Inference",
        year: "2019",
        authors: ["Brandon Yang"],
        rawReferenceIds: ["raw:e"],
        rawHashes: ["hash:e"],
      },
      {
        canonicalReferenceId: "cref:arxiv-a",
        title: "Identifier Matched Work",
        rawReferenceIds: ["raw:f"],
        rawHashes: ["hash:f"],
        identifiers: [{ kind: "arxiv", value: "2201.12345" }],
      },
      {
        canonicalReferenceId: "cref:arxiv-b",
        title: "Identifier Matched Work Extended",
        rawReferenceIds: ["raw:g"],
        rawHashes: ["hash:g"],
        identifiers: [{ kind: "arxiv", value: "2201.12345v2" }],
      },
      {
        canonicalReferenceId: "cref:panoptic-a",
        title: "Fully convolutional networks for panoptic segmentation",
        year: "2021",
        authors: ["Yanwei Li"],
        rawReferenceIds: ["raw:h"],
        rawHashes: ["hash:h"],
      },
      {
        canonicalReferenceId: "cref:panoptic-b",
        title:
          "Fully convolutional networks for panoptic segmentation with point-based supervision",
        year: "2021",
        authors: ["Yanwei Li"],
        rawReferenceIds: ["raw:i"],
        rawHashes: ["hash:i"],
      },
    ]);

    const redirects = result.actions.filter((action) => action.action === "redirect");
    const reviews = result.actions.filter((action) => action.action === "review");

    assert.isTrue(
      redirects.some((action) =>
        ["exact_normalized_title_year", "exact_compact_title_year"].includes(
          action.edgeType,
        ),
      ),
    );
    assert.isTrue(
      redirects.some((action) => action.edgeType === "identifier_exact"),
    );
    assert.isTrue(
      reviews.some((action) => action.edgeType === "contained_author_noise"),
    );
    assert.isTrue(
      reviews.some((action) => action.edgeType === "typo_equivalent_title"),
    );
    assert.isTrue(
      reviews.some((action) => action.edgeType === "contained_extension_risk"),
    );
    assert.isFalse(
      redirects.some((action) => action.edgeType === "contained_extension_risk"),
    );
    assert.isAtMost(result.counters.candidate_pair_count, 2000);
  });

  it("builds cluster-aware canonical dedupe actions with classified containment risks", function () {
    const result = dedupeCanonicalReferencesClustered([
      {
        canonicalReferenceId: "cref:doi-a",
        title: "Identifier Matched Work",
        rawReferenceIds: ["raw:a"],
        rawHashes: ["hash:a"],
        identifiers: [{ kind: "doi", value: "10.1000/example" }],
      },
      {
        canonicalReferenceId: "cref:doi-b",
        title: "Identifier Matched Work Extended",
        rawReferenceIds: ["raw:b"],
        rawHashes: ["hash:b"],
        identifiers: [{ kind: "doi", value: "https://doi.org/10.1000/example" }],
      },
      {
        canonicalReferenceId: "cref:typo-a",
        title: "CondConv: Conditionally Parameterized Convolutions for Efficient Inference",
        year: "2019",
        authors: ["Brandon Yang"],
        rawReferenceIds: ["raw:c"],
        rawHashes: ["hash:c"],
      },
      {
        canonicalReferenceId: "cref:typo-b",
        title: "CondConv: Conditionally Parameterized Convolutions for Effcient Inference",
        year: "2019",
        authors: ["Brandon Yang"],
        rawReferenceIds: ["raw:d"],
        rawHashes: ["hash:d"],
      },
      {
        canonicalReferenceId: "cref:biblio-a",
        title:
          "An image is worth 16x16 words: Transformers for image recognition at scale. arXiv preprint arXiv:2010.11929",
        year: "2021",
        authors: ["Alexey Dosovitskiy"],
        rawReferenceIds: ["raw:e"],
        rawHashes: ["hash:e"],
      },
      {
        canonicalReferenceId: "cref:biblio-b",
        title: "An image is worth 16x16 words: Transformers for image recognition at scale",
        year: "2021",
        authors: ["Alexey Dosovitskiy"],
        rawReferenceIds: ["raw:f"],
        rawHashes: ["hash:f"],
      },
      {
        canonicalReferenceId: "cref:author-a",
        title:
          "James Hays Pietro Perona Deva Ramanan Microsoft COCO: common objects in context",
        year: "2014",
        authors: ["James Hays", "Pietro Perona", "Deva Ramanan"],
        rawReferenceIds: ["raw:g"],
        rawHashes: ["hash:g"],
      },
      {
        canonicalReferenceId: "cref:author-b",
        title: "Microsoft COCO: common objects in context",
        year: "2014",
        authors: ["James Hays", "Pietro Perona", "Deva Ramanan"],
        rawReferenceIds: ["raw:h"],
        rawHashes: ["hash:h"],
      },
      {
        canonicalReferenceId: "cref:panoptic-a",
        title: "Fully convolutional networks for panoptic segmentation",
        year: "2021",
        authors: ["Yanwei Li"],
        rawReferenceIds: ["raw:i"],
        rawHashes: ["hash:i"],
      },
      {
        canonicalReferenceId: "cref:panoptic-b",
        title:
          "Fully convolutional networks for panoptic segmentation with point-based supervision",
        year: "2021",
        authors: ["Yanwei Li"],
        rawReferenceIds: ["raw:j"],
        rawHashes: ["hash:j"],
      },
    ]);

    assert.isTrue(
      result.actions.some(
        (action) =>
          action.action === "redirect" &&
          action.edgeType === "identifier_exact",
      ),
    );
    assert.isTrue(
      result.actions.some(
        (action) =>
          action.action === "review" &&
          action.edgeType === "typo_equivalent_title",
      ),
    );
    assert.isTrue(
      result.edges.some((edge) => edge.edgeType === "contained_bibliographic_noise"),
    );
    assert.isTrue(
      result.edges.some((edge) => edge.edgeType === "contained_author_noise"),
    );
    const extensionRisk = result.actions.find(
      (action) => action.edgeType === "contained_extension_risk",
    );
    assert.equal(extensionRisk?.action, "review");
    assert.include(extensionRisk?.riskSignals || [], "semantic_title_extension");
    assert.isFalse(
      result.actions.some(
        (action) =>
          action.action === "redirect" &&
          action.edgeType === "contained_extension_risk",
      ),
    );
    assert.isAtLeast(result.counters.cluster_count, 1);
    assert.isAtLeast(result.counters.extension_risk_edge_count, 1);
    for (const cluster of result.clusters) {
      for (const action of result.actions.filter(
        (entry) => entry.clusterId === cluster.clusterId,
      )) {
        assert.equal(
          action.targetCanonicalReferenceId,
          cluster.representativeCanonicalReferenceId,
        );
      }
    }
  });

  it("classifies real-world cluster edge cases and chooses clean representatives", function () {
    const result = dedupeCanonicalReferencesClustered([
      {
        canonicalReferenceId: "cref:perpixel-noisy",
        title:
          "Schwing, and Alexander Kirillov. Per-pixel classification is not all you need for semantic segmentation",
        year: "2021",
        rawReferenceIds: ["raw:perpixel-a"],
        rawHashes: ["hash:perpixel-a"],
      },
      {
        canonicalReferenceId: "cref:perpixel-clean",
        title:
          "Per-pixel classification is not all you need for semantic segmentation",
        year: "2021",
        rawReferenceIds: ["raw:perpixel-b"],
        rawHashes: ["hash:perpixel-b"],
      },
      {
        canonicalReferenceId: "cref:faster-a",
        title:
          "Faster R-CNN: Towards real-time object detection with region proposal networks",
        year: "2015",
        rawReferenceIds: ["raw:faster-a"],
        rawHashes: ["hash:faster-a"],
      },
      {
        canonicalReferenceId: "cref:faster-b",
        title:
          "Faster r-cnn: Towards real-time object detection with region proposal networks",
        year: "2017",
        rawReferenceIds: ["raw:faster-b"],
        rawHashes: ["hash:faster-b"],
      },
      {
        canonicalReferenceId: "cref:conditional-noisy",
        title:
          "Conditional detr for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp",
        year: "2021",
        rawReferenceIds: ["raw:conditional-a"],
        rawHashes: ["hash:conditional-a"],
      },
      {
        canonicalReferenceId: "cref:conditional-clean",
        title: "Conditional detr for fast training convergence",
        year: "2021",
        rawReferenceIds: ["raw:conditional-b"],
        rawHashes: ["hash:conditional-b"],
      },
    ]);

    const perpixelCluster = result.clusters.find((cluster) =>
      cluster.canonicalReferenceIds.includes("cref:perpixel-noisy"),
    );
    assert.equal(
      perpixelCluster?.representativeCanonicalReferenceId,
      "cref:perpixel-clean",
    );
    assert.isTrue(
      result.edges.some(
        (edge) =>
          edge.sourceCanonicalReferenceId === "cref:perpixel-clean" &&
          edge.targetCanonicalReferenceId === "cref:perpixel-noisy" &&
          edge.edgeType === "contained_author_noise",
      ),
    );

    const fasterCluster = result.clusters.find((cluster) =>
      cluster.canonicalReferenceIds.includes("cref:faster-a"),
    );
    assert.deepEqual(
      fasterCluster?.canonicalReferenceIds.sort(),
      ["cref:faster-a", "cref:faster-b"],
    );

    assert.isTrue(
      result.edges.some(
        (edge) =>
          edge.edgeType === "contained_bibliographic_noise" &&
          edge.sourceCanonicalReferenceId === "cref:conditional-clean" &&
          edge.targetCanonicalReferenceId === "cref:conditional-noisy",
      ),
    );
  });

  it("keeps representative selection quality-first instead of raw-count-first", function () {
    const result = dedupeCanonicalReferencesClustered([
      {
        canonicalReferenceId: "cref:noisy-heavy",
        title:
          "Attention is all you need. In Advances in neural information processing systems, pp",
        year: "2017",
        rawReferenceIds: Array.from({ length: 25 }, (_, index) => `raw:noisy:${index}`),
        rawHashes: Array.from({ length: 25 }, (_, index) => `hash:noisy:${index}`),
      },
      {
        canonicalReferenceId: "cref:clean",
        title: "Attention is all you need",
        year: "2017",
        rawReferenceIds: ["raw:clean"],
        rawHashes: ["hash:clean"],
      },
    ]);

    const cluster = result.clusters.find((entry) =>
      entry.canonicalReferenceIds.includes("cref:noisy-heavy"),
    );
    assert.equal(cluster?.representativeCanonicalReferenceId, "cref:clean");
    assert.include(cluster?.representativeRationale || [], "clean_title");
    for (const action of result.actions.filter(
      (entry) => entry.clusterId === cluster?.clusterId,
    )) {
      assert.equal(action.targetCanonicalReferenceId, "cref:clean");
    }
  });

  it("keeps existing redirect targets sticky unless strong retarget evidence exists", function () {
    const result = dedupeCanonicalReferencesClustered([
      {
        canonicalReferenceId: "cref:sticky",
        title: "Masked autoencoders are scalable vision learners",
        year: "2023",
        stickyRepresentative: true,
        rawReferenceIds: ["raw:sticky"],
        rawHashes: ["hash:sticky"],
      },
      {
        canonicalReferenceId: "cref:new-heavy",
        title:
          "Masked autoencoders are scalable vision learners. In Proceedings of the IEEE conference, pp",
        year: "2023",
        rawReferenceIds: Array.from({ length: 20 }, (_, index) => `raw:new:${index}`),
        rawHashes: Array.from({ length: 20 }, (_, index) => `hash:new:${index}`),
      },
    ]);

    const cluster = result.clusters.find((entry) =>
      entry.canonicalReferenceIds.includes("cref:sticky"),
    );
    assert.equal(cluster?.representativeCanonicalReferenceId, "cref:sticky");
    assert.include(cluster?.representativeRationale || [], "sticky_representative");
    assert.isFalse(
      result.actions.some((action) =>
        action.reasons.includes("representative_retarget_review"),
      ),
    );
  });

  it("prefers clean hyphenated titles over fused-token title variants", function () {
    const result = dedupeCanonicalReferencesClustered([
      {
        canonicalReferenceId: "cref:fused",
        title:
          "YOLOv7: Trainable bag-offreebies sets new state-of-the-art for real-time object detectors",
        year: "2023",
        authors: ["Wang"],
        identifiers: [{ kind: "citekey", value: "wang_yolov7-trainable_2023" }],
        rawReferenceIds: ["raw:fused"],
        rawHashes: ["hash:fused"],
      },
      {
        canonicalReferenceId: "cref:hyphenated",
        title:
          "YOLOv7: Trainable bag-of-freebies sets new state-of-the-art for real-time object detectors",
        year: "2023",
        authors: ["Wang"],
        identifiers: [{ kind: "citekey", value: "wang_yolov7-trainable_2023" }],
        rawReferenceIds: ["raw:hyphenated"],
        rawHashes: ["hash:hyphenated"],
      },
      {
        canonicalReferenceId: "cref:biblio",
        title:
          "YOLOv7: Trainable bag-offreebies sets new state-of-the-art for real-time object detectors. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp",
        year: "2023",
        authors: ["Wang"],
        identifiers: [{ kind: "citekey", value: "wang_yolov7-trainable_2023" }],
        rawReferenceIds: ["raw:biblio"],
        rawHashes: ["hash:biblio"],
      },
    ]);

    const cluster = result.clusters.find((entry) =>
      entry.canonicalReferenceIds.includes("cref:fused"),
    );
    assert.equal(cluster?.representativeCanonicalReferenceId, "cref:hyphenated");
    assert.equal(
      result.actions.filter(
        (action) =>
          action.clusterId === cluster?.clusterId &&
          action.edgeType === "contained_bibliographic_noise" &&
          action.sourceCanonicalReferenceId === "cref:biblio",
      ).length,
      1,
    );
    assert.isFalse(
      result.actions.some(
        (action) =>
          action.edgeType === "contained_bibliographic_noise" &&
          action.sourceCanonicalReferenceId === "cref:fused",
      ),
    );
  });

  it("classifies numeric venue suffixes as bibliographic noise and keeps the clean title representative", function () {
    const result = dedupeCanonicalReferencesClustered([
      {
        canonicalReferenceId: "cref:second-clean",
        title: "Second: Sparsely embedded convolutional detection",
        year: "2018",
        authors: ["Yan Yan"],
        rawReferenceIds: ["raw:second-a", "raw:second-b"],
        rawHashes: ["hash:second-a", "hash:second-b"],
      },
      {
        canonicalReferenceId: "cref:second-sensors",
        title: "Second: Sparsely embedded convolutional detection. Sensors 18(10), 3337",
        year: "2018",
        authors: ["Yan Yan"],
        rawReferenceIds: ["raw:second-c"],
        rawHashes: ["hash:second-c"],
      },
    ]);

    const cluster = result.clusters.find((entry) =>
      entry.canonicalReferenceIds.includes("cref:second-clean"),
    );
    assert.equal(cluster?.representativeCanonicalReferenceId, "cref:second-clean");
    assert.isTrue(
      result.edges.some(
        (edge) =>
          edge.edgeType === "contained_bibliographic_noise" &&
          edge.sourceCanonicalReferenceId === "cref:second-clean" &&
          edge.targetCanonicalReferenceId === "cref:second-sensors",
      ),
    );
  });

  it("does not let arXiv suffix identifiers outrank a clean duplicate representative", function () {
    const result = dedupeCanonicalReferencesClustered([
      {
        canonicalReferenceId: "cref:gold-clean",
        title: "Gold-yolo: Efficient object detector via gather-and-distribute mechanism",
        year: "2023",
        authors: ["Wang"],
        rawReferenceIds: ["raw:gold-a", "raw:gold-b"],
        rawHashes: ["hash:gold-a", "hash:gold-b"],
      },
      {
        canonicalReferenceId: "cref:gold-arxiv",
        title:
          "Gold-yolo: Efficient object detector via gather-and-distribute mechanism. arXiv preprint arXiv:2309.11331",
        year: "2023",
        authors: ["Wang"],
        rawReferenceIds: ["raw:gold-c"],
        rawHashes: ["hash:gold-c"],
      },
    ]);

    const cluster = result.clusters.find((entry) =>
      entry.canonicalReferenceIds.includes("cref:gold-clean"),
    );
    assert.equal(cluster?.representativeCanonicalReferenceId, "cref:gold-clean");
    assert.isTrue(
      result.edges.some((edge) => edge.edgeType === "contained_bibliographic_noise"),
    );
  });

  it("filters bare DOI-like canonical records before cluster matching", function () {
    const result = dedupeCanonicalReferencesClustered([
      {
        canonicalReferenceId: "cref:bare-doi",
        title: "//doi.org/10.1007/978-3-319-10602-1 48",
        identifiers: [{ kind: "doi", value: "10.1007/978-3-319-10602-1_48" }],
        rawReferenceIds: ["raw:doi"],
        rawHashes: ["hash:doi"],
      },
      {
        canonicalReferenceId: "cref:paper",
        title: "A clean title that should not absorb a bare DOI row",
        year: "2014",
        identifiers: [{ kind: "doi", value: "10.1007/978-3-319-10602-1_48" }],
        rawReferenceIds: ["raw:paper"],
        rawHashes: ["hash:paper"],
      },
    ]);

    assert.equal(result.counters.excluded_record_count, 1);
    assert.equal(result.edges.length, 0);
    assert.equal(result.actions.length, 0);
    assert.isTrue(
      result.diagnostics.some(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          (entry as { code?: string }).code === "cluster_dedupe_record_excluded" &&
          (entry as { canonical_reference_id?: string }).canonical_reference_id ===
            "cref:bare-doi",
      ),
    );
  });

  it("does not classify unknown venue-only containment as bibliographic noise", function () {
    const result = dedupeCanonicalReferencesClustered([
      {
        canonicalReferenceId: "cref:clean",
        title: "Robust object detection for small targets",
        year: "2024",
        rawReferenceIds: ["raw:clean"],
        rawHashes: ["hash:clean"],
      },
      {
        canonicalReferenceId: "cref:unknown-venue",
        title: "Robust object detection for small targets NeurIPS",
        year: "2024",
        rawReferenceIds: ["raw:venue"],
        rawHashes: ["hash:venue"],
      },
    ]);

    assert.isFalse(
      result.edges.some((edge) => edge.edgeType === "contained_bibliographic_noise"),
    );
    assert.isTrue(
      result.edges.some((edge) => edge.edgeType === "contained_extension_risk"),
    );
    assert.isFalse(
      result.actions.some(
        (action) =>
          action.action === "redirect" &&
          action.edgeType === "contained_extension_risk",
      ),
    );
  });

  it("keeps truncated author-like canonical records weak instead of redirecting them", function () {
    const result = dedupeCanonicalReferencesClustered([
      {
        canonicalReferenceId: "cref:authors",
        title: "Wang Li Zhang Chen",
        authors: ["Wang", "Li", "Zhang", "Chen"],
        rawReferenceIds: ["raw:authors"],
        rawHashes: ["hash:authors"],
      },
    ]);

    assert.equal(result.counters.weak_record_count, 1);
    assert.equal(result.actions.length, 0);
  });

  it("records clustered dedupe budget diagnostics without widening blocks", function () {
    const result = dedupeCanonicalReferencesClustered(
      [
        {
          canonicalReferenceId: "cref:a",
          title: "Shared Cluster Title",
          year: "2024",
          rawReferenceIds: ["raw:a"],
          rawHashes: ["hash:a"],
        },
        {
          canonicalReferenceId: "cref:b",
          title: "Shared Cluster Title",
          year: "2024",
          rawReferenceIds: ["raw:b"],
          rawHashes: ["hash:b"],
        },
        {
          canonicalReferenceId: "cref:c",
          title: "Shared Cluster Title",
          year: "2024",
          rawReferenceIds: ["raw:c"],
          rawHashes: ["hash:c"],
        },
      ],
      { maxBlockSize: 2, maxCandidatePairs: 10 },
    );

    assert.equal(result.counters.block_skipped_count, result.diagnostics.length);
    assert.isTrue(
      result.diagnostics.some(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          (entry as { code?: string }).code === "cluster_dedupe_block_skipped",
      ),
    );
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
