import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { createSynthesisSidecarComputeWorkerPool } from "../../apps/synthesis-service/src/computeWorkerPool";
import {
  SYNTHESIS_REFERENCE_MATCHER_BINDING_INPUT_MAX,
  SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
  SYNTHESIS_REFERENCE_MATCHER_DEDUPE_INPUT_MAX,
  SYNTHESIS_REFERENCE_MATCHER_LIBRARY_PAPER_MAX,
  buildReferenceMatcherIndex,
  computeSynthesisReferenceBinding,
  computeSynthesisReferenceDedupe,
  createInProcessSynthesisReferenceMatcherEngine,
  dedupeCanonicalReferencesClustered,
  normalizeSynthesisLiteratureTitle,
  rebuildSynthesisReferenceBindingRequest,
  rebuildSynthesisReferenceBindingResult,
  rebuildSynthesisReferenceDedupeRequest,
  rebuildSynthesisReferenceDedupeResult,
  resolveReferenceWithPolicy,
  type SynthesisReferenceBindingRequest,
  type SynthesisReferenceDedupeRequest,
} from "../../packages/synthesis-engine/src/referenceMatcher";
import { hashCanonicalJson } from "../../src/modules/synthesis/foundation";

function bindingRequest(): SynthesisReferenceBindingRequest {
  return {
    contractVersion: "synthesis-reference-matcher.v1",
    algorithmVersion: "reference-binding.v1",
    policyId: "production",
    papers: [
      {
        paperRef: "1:B",
        itemKey: "B",
        title: "Other Work",
        year: "2020",
        authors: ["Beta"],
        identifiers: [],
      },
      {
        paperRef: "1:A",
        itemKey: "A",
        title: "Exact Work",
        year: "2024",
        authors: ["Alpha"],
        identifiers: [{ kind: "doi", value: "10.1000/exact" }],
      },
    ],
    references: [
      {
        canonicalReferenceId: "canonical:2",
        reference: {
          referenceInstanceId: "raw:2",
          title: "Other Work",
          year: "2020",
          authors: ["Beta"],
        },
      },
      {
        canonicalReferenceId: "canonical:1",
        reference: {
          referenceInstanceId: "raw:1",
          title: "Exact Work",
          rawReference: "doi:10.1000/exact",
        },
      },
    ],
  };
}

function dedupeRequest(): SynthesisReferenceDedupeRequest {
  return {
    contractVersion: "synthesis-reference-matcher.v1",
    algorithmVersion: "canonical-cluster-dedupe.v1",
    canonicals: [
      {
        canonicalReferenceId: "canonical:b",
        title: "Exact Reference Matching Work",
        normalizedTitle: "exact reference matching work",
        year: "2024",
        authors: ["Alpha"],
        acceptedBinding: false,
        stickyRepresentative: false,
        rawReferenceIds: ["raw:b"],
        rawHashes: ["hash:b"],
        rawReferences: ["Exact Reference Matching Work"],
        sourceRefs: ["1:B"],
        identifiers: [{ kind: "doi", value: "10.1000/exact" }],
        titleCandidates: [],
      },
      {
        canonicalReferenceId: "canonical:a",
        title: "Exact Reference Matching Work",
        normalizedTitle: "exact reference matching work",
        year: "2024",
        authors: ["Alpha"],
        acceptedBinding: false,
        stickyRepresentative: true,
        rawReferenceIds: ["raw:a"],
        rawHashes: ["hash:a"],
        rawReferences: ["Exact Reference Matching Work"],
        sourceRefs: ["1:A"],
        identifiers: [{ kind: "doi", value: "10.1000/exact" }],
        titleCandidates: [],
      },
    ].map((row) => ({
      normalizedTitle: "",
      year: "",
      authors: [],
      acceptedBinding: false,
      stickyRepresentative: false,
      rawReferenceIds: [],
      rawHashes: [],
      rawReferences: [],
      sourceRefs: [],
      identifiers: [],
      titleCandidates: [],
      ...row,
    })),
  };
}

function complexDedupeRequest(): SynthesisReferenceDedupeRequest {
  const rows = [
    [
      "cref:typo-a",
      "CondConv: Conditionally Parameterized Convolutions for Efficient Inference",
      ["Brandon Yang"],
    ],
    [
      "cref:typo-b",
      "CondConv: Conditionally Parameterized Convolutions for Effcient Inference",
      ["Brandon Yang"],
    ],
    [
      "cref:biblio-a",
      "An image is worth 16x16 words: Transformers for image recognition at scale. arXiv preprint arXiv:2010.11929",
      ["Alexey Dosovitskiy"],
    ],
    [
      "cref:biblio-b",
      "An image is worth 16x16 words: Transformers for image recognition at scale",
      ["Alexey Dosovitskiy"],
    ],
    [
      "cref:author-a",
      "James Hays Pietro Perona Deva Ramanan Microsoft COCO: common objects in context",
      ["James Hays", "Pietro Perona", "Deva Ramanan"],
    ],
    [
      "cref:author-b",
      "Microsoft COCO: common objects in context",
      ["James Hays", "Pietro Perona", "Deva Ramanan"],
    ],
    [
      "cref:panoptic-a",
      "Fully convolutional networks for panoptic segmentation",
      ["Yanwei Li"],
    ],
    [
      "cref:panoptic-b",
      "Fully convolutional networks for panoptic segmentation with point-based supervision",
      ["Yanwei Li"],
    ],
  ] as const;
  return {
    contractVersion: "synthesis-reference-matcher.v1",
    algorithmVersion: "canonical-cluster-dedupe.v1",
    canonicals: rows.map(([canonicalReferenceId, title, authors], index) => ({
      canonicalReferenceId,
      title,
      year:
        index < 2 ? "2019" : index < 6 ? (index < 4 ? "2021" : "2014") : "2021",
      authors: [...authors],
      acceptedBinding: false,
      stickyRepresentative: false,
      rawReferenceIds: [`raw:${index}`],
      rawHashes: [`hash:${index}`],
      rawReferences: [title],
      sourceRefs: [`1:${index}`],
      identifiers: [],
      titleCandidates: [],
    })),
  };
}

function boundaryDedupeRequest(): SynthesisReferenceDedupeRequest {
  return rebuildSynthesisReferenceDedupeRequest({
    contractVersion: "synthesis-reference-matcher.v1",
    algorithmVersion: "canonical-cluster-dedupe.v1",
    canonicals: [
      {
        canonicalReferenceId: "cref:sticky",
        title: "Masked autoencoders are scalable vision learners",
        year: "2023",
        stickyRepresentative: true,
        rawReferenceIds: ["raw:sticky"],
        rawHashes: ["hash:sticky"],
      },
      {
        canonicalReferenceId: "cref:sticky-noisy",
        title:
          "Masked autoencoders are scalable vision learners. In Proceedings of the IEEE conference, pp",
        year: "2023",
        acceptedBinding: true,
        rawReferenceIds: ["raw:sticky-noisy"],
        rawHashes: ["hash:sticky-noisy"],
      },
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
        title:
          "Second: Sparsely embedded convolutional detection. Sensors 18(10), 3337",
        year: "2018",
        authors: ["Yan Yan"],
        rawReferenceIds: ["raw:second-c"],
        rawHashes: ["hash:second-c"],
      },
      {
        canonicalReferenceId: "cref:venue-clean",
        title: "Robust object detection for small targets",
        year: "2024",
        rawReferenceIds: ["raw:venue-clean"],
        rawHashes: ["hash:venue-clean"],
      },
      {
        canonicalReferenceId: "cref:venue-extra",
        title: "Robust object detection for small targets NeurIPS",
        year: "2024",
        rawReferenceIds: ["raw:venue-extra"],
        rawHashes: ["hash:venue-extra"],
      },
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
    ].map((row) => ({
      normalizedTitle: "",
      year: "",
      authors: [],
      acceptedBinding: false,
      stickyRepresentative: false,
      rawReferenceIds: [],
      rawHashes: [],
      rawReferences: [],
      sourceRefs: [],
      identifiers: [],
      titleCandidates: [],
      ...row,
    })),
  });
}

function titleCandidateDedupeRequest(): SynthesisReferenceDedupeRequest {
  return rebuildSynthesisReferenceDedupeRequest({
    contractVersion: "synthesis-reference-matcher.v1",
    algorithmVersion: "canonical-cluster-dedupe.v1",
    canonicals: [
      {
        canonicalReferenceId: "cref:candidate-a",
        title: "Smith Jones Proceedings IEEE 2022 pp 1 9",
        year: "2022",
        authors: ["A. Smith", "B. Jones"],
        rawReferenceIds: ["raw:candidate-a"],
        titleCandidates: [
          {
            title: "A Clean Canonical Title for Reliable Matching",
            year: "2022",
            authors: ["A. Smith", "B. Jones"],
            identifiers: [{ kind: "doi", value: "10.1000/candidate" }],
            rawReferenceIds: ["raw:candidate-a"],
            source: "raw_reference",
            frequency: 4,
          },
        ],
      },
      {
        canonicalReferenceId: "cref:candidate-b",
        title: "A Clean Canonical Title for Reliable Matching",
        year: "2022",
        authors: ["A. Smith", "B. Jones"],
        rawReferenceIds: ["raw:candidate-b"],
        identifiers: [{ kind: "doi", value: "10.1000/candidate" }],
      },
    ].map((row) => ({
      normalizedTitle: "",
      year: "",
      authors: [],
      acceptedBinding: false,
      stickyRepresentative: false,
      rawReferenceIds: [],
      rawHashes: [],
      rawReferences: [],
      sourceRefs: [],
      identifiers: [],
      titleCandidates: [],
      ...row,
    })),
  });
}

describe("Synthesis Reference Matcher engine", function () {
  it("canonically rebuilds strict bounded binding and dedupe requests", function () {
    assert.equal(
      SYNTHESIS_REFERENCE_MATCHER_CONTRACT_VERSION,
      "synthesis-reference-matcher.v1",
    );
    assert.equal(SYNTHESIS_REFERENCE_MATCHER_LIBRARY_PAPER_MAX, 25_000);
    assert.equal(SYNTHESIS_REFERENCE_MATCHER_BINDING_INPUT_MAX, 750_000);
    assert.equal(SYNTHESIS_REFERENCE_MATCHER_DEDUPE_INPUT_MAX, 750_000);

    const binding = rebuildSynthesisReferenceBindingRequest({
      ...bindingRequest(),
      ignored: true,
      papers: bindingRequest().papers.map((paper) => ({
        ...paper,
        ignored: "discard",
      })),
    });
    assert.deepEqual(
      binding.papers.map((paper) => paper.paperRef),
      ["1:A", "1:B"],
    );
    assert.notProperty(binding, "ignored");
    assert.notProperty(binding.papers[0], "ignored");

    const dedupe = rebuildSynthesisReferenceDedupeRequest({
      ...dedupeRequest(),
      ignored: true,
    });
    assert.deepEqual(
      dedupe.canonicals.map((row) => row.canonicalReferenceId),
      ["canonical:a", "canonical:b"],
    );
    assert.notProperty(dedupe, "ignored");

    const unicodeBinding = rebuildSynthesisReferenceBindingRequest({
      ...bindingRequest(),
      papers: [
        ...bindingRequest().papers,
        {
          paperRef: "1:\ue000",
          authors: [],
          identifiers: [],
        },
        {
          paperRef: "1:😀",
          authors: [],
          identifiers: [],
        },
      ],
    });
    assert.deepEqual(
      unicodeBinding.papers.map((paper) => paper.paperRef),
      ["1:A", "1:B", "1:😀", "1:\ue000"],
    );
    assert.equal(
      normalizeSynthesisLiteratureTitle("ＦＡＳＴ Café"),
      "fast café",
    );

    assert.throws(() =>
      rebuildSynthesisReferenceBindingRequest({
        ...bindingRequest(),
        references: [
          bindingRequest().references[0],
          bindingRequest().references[0],
        ],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisReferenceDedupeRequest(dedupeRequest(), {
        dedupeInputMax: 1,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisReferenceDedupeRequest({
        ...dedupeRequest(),
        canonicals: [
          {
            ...dedupeRequest().canonicals[0],
            titleCandidates: [
              {
                title: "Unsafe frequency",
                source: "input",
                frequency: Number.MAX_SAFE_INTEGER + 1,
              },
            ],
          },
        ],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisReferenceBindingRequest(
        {
          ...bindingRequest(),
          papers: [{ ...bindingRequest().papers[0], title: "\u0000" }],
        },
        { libraryPaperMax: 1 },
      ),
    );
  });

  it("preserves binding, clustered dedupe, and canonical hash semantics", function () {
    const binding = bindingRequest();
    const bindingResult = computeSynthesisReferenceBinding(binding);
    const canonicalBinding = rebuildSynthesisReferenceBindingRequest(binding);
    const oldIndex = buildReferenceMatcherIndex(canonicalBinding.papers);
    const expected = canonicalBinding.references.map((entry) => ({
      canonicalReferenceId: entry.canonicalReferenceId,
      result: resolveReferenceWithPolicy(
        entry.reference,
        oldIndex,
        canonicalBinding.policyId,
      ),
    }));
    assert.deepEqual(
      bindingResult.matches,
      JSON.parse(JSON.stringify(expected)),
    );

    const dedupe = dedupeRequest();
    const dedupeResult = computeSynthesisReferenceDedupe(dedupe);
    assert.deepEqual(
      {
        clusters: dedupeResult.clusters,
        edges: dedupeResult.edges,
        actions: dedupeResult.actions,
        diagnostics: dedupeResult.diagnostics,
        counters: dedupeResult.counters,
      },
      JSON.parse(
        JSON.stringify(dedupeCanonicalReferencesClustered(dedupe.canonicals)),
      ),
    );
    assert.equal(
      hashCanonicalJson({ b: 2, a: 1 }),
      "sha256:43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
    );
  });

  it("rejects malformed results and supports checkpoint cancellation", async function () {
    const binding = bindingRequest();
    const bindingResult = computeSynthesisReferenceBinding(binding);
    assert.throws(() =>
      rebuildSynthesisReferenceBindingResult(
        {
          ...bindingResult,
          matches: bindingResult.matches.slice(1),
        },
        binding,
      ),
    );
    const dedupe = dedupeRequest();
    const dedupeResult = computeSynthesisReferenceDedupe(dedupe);
    assert.throws(() =>
      rebuildSynthesisReferenceDedupeResult(
        {
          ...dedupeResult,
          contractVersion: "invalid",
        },
        dedupe,
      ),
    );

    const engine = createInProcessSynthesisReferenceMatcherEngine({
      bindingCheckpoint(checkpoint) {
        if (checkpoint.phase === "references") {
          throw new Error("cancelled");
        }
      },
      checkpointInterval: 1,
    });
    let rejected = false;
    try {
      await engine.matchBindings(binding);
    } catch (error) {
      rejected = String(error).includes("cancelled");
    }
    assert.isTrue(rejected);
  });

  it("preserves direct and Rust worker canonical parity", async function () {
    const binding = bindingRequest();
    const dedupe = dedupeRequest();
    const complexDedupe = complexDedupeRequest();
    const boundaryDedupe = boundaryDedupeRequest();
    const titleCandidateDedupe = titleCandidateDedupeRequest();
    const direct = createInProcessSynthesisReferenceMatcherEngine();
    const expected = {
      binding: await direct.matchBindings(binding),
      dedupe: await direct.dedupeCanonicals(dedupe),
      complexDedupe: await direct.dedupeCanonicals(complexDedupe),
      boundaryDedupe: await direct.dedupeCanonicals(boundaryDedupe),
      titleCandidateDedupe: await direct.dedupeCanonicals(titleCandidateDedupe),
    };
    const pool = createSynthesisSidecarComputeWorkerPool();
    try {
      const actual = {
        binding: await pool.runReferenceBinding(binding),
        dedupe: await pool.runReferenceCanonicalDedupe(dedupe),
        complexDedupe: await pool.runReferenceCanonicalDedupe(complexDedupe),
        boundaryDedupe: await pool.runReferenceCanonicalDedupe(boundaryDedupe),
        titleCandidateDedupe:
          await pool.runReferenceCanonicalDedupe(titleCandidateDedupe),
      };
      for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
        assert.deepEqual(actual[key], expected[key], `${key} parity`);
      }
    } finally {
      await pool.shutdown();
    }
  });

  it("keeps the matcher engine source environment-neutral", async function () {
    const source = await fs.readFile(
      path.join(
        process.cwd(),
        "packages/synthesis-engine/src/referenceMatcher.ts",
      ),
      "utf8",
    );
    for (const forbidden of [
      /from\s+["']node:/,
      /\bZotero\b/,
      /zotero-plugin-toolkit/,
      /from\s+["'][^"']*repository/,
      /from\s+["'][^"']*foundation/,
    ]) {
      assert.notMatch(source, forbidden);
    }
  });
});
