import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { Worker } from "node:worker_threads";
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
        title: "Exact Work",
        normalizedTitle: "exact work",
        year: "2024",
        authors: ["Alpha"],
        acceptedBinding: false,
        stickyRepresentative: false,
        rawReferenceIds: ["raw:b"],
        rawHashes: ["hash:b"],
        rawReferences: ["Exact Work"],
        sourceRefs: ["1:B"],
        identifiers: [{ kind: "doi", value: "10.1000/exact" }],
        titleCandidates: [],
      },
      {
        canonicalReferenceId: "canonical:a",
        title: "Exact Work",
        normalizedTitle: "exact work",
        year: "2024",
        authors: ["Alpha"],
        acceptedBinding: false,
        stickyRepresentative: true,
        rawReferenceIds: ["raw:a"],
        rawHashes: ["hash:a"],
        rawReferences: ["Exact Work"],
        sourceRefs: ["1:A"],
        identifiers: [{ kind: "doi", value: "10.1000/exact" }],
        titleCandidates: [],
      },
    ],
  };
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

  it("preserves direct and worker structured-clone parity", async function () {
    const binding = bindingRequest();
    const dedupe = dedupeRequest();
    const direct = createInProcessSynthesisReferenceMatcherEngine();
    const expected = {
      binding: await direct.matchBindings(binding),
      dedupe: await direct.dedupeCanonicals(dedupe),
    };
    const worker = new Worker(
      new URL(
        "../fixtures/synthesis-reference-matcher-engine-worker.ts",
        import.meta.url,
      ),
      { execArgv: ["--import", "tsx"] },
    );
    const actual = await new Promise<unknown>((resolve, reject) => {
      worker.once("message", resolve);
      worker.once("error", reject);
      worker.postMessage({ binding, dedupe });
    });
    await worker.terminate();
    assert.deepEqual(actual, expected);
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
