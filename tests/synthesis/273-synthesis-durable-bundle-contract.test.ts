import { assert } from "chai";
import {
  canonicalizeSynthesisContractJson,
  hashSynthesisContractCanonicalJson,
} from "../../packages/synthesis-contracts/src/canonicalJson";
import { createSynthesisDurableBundleCodec } from "../../packages/synthesis-contracts/src/durableBundle";

describe("Synthesis durable bundle contract", function () {
  it("groups a large same-kind draft set deterministically", function () {
    const codec = createSynthesisDurableBundleCodec({
      canonicalizeJson: canonicalizeSynthesisContractJson,
      hashCanonicalJson: hashSynthesisContractCanonicalJson,
    });
    const drafts = Array.from({ length: 1_000 }, (_, index) => ({
      entityKind: "concept_alias" as const,
      entityId: `alias-${String(index).padStart(4, "0")}`,
      schemaId: "synthesis.concept_alias",
      data: { index },
    }));

    const first = codec.buildExport({
      drafts,
      generatedAt: "2026-09-12T00:00:00.000Z",
    });
    const second = codec.buildExport({
      drafts,
      generatedAt: "2026-09-12T00:00:00.000Z",
    });

    assert.lengthOf(first.entries, drafts.length);
    assert.strictEqual(first.manifestText, second.manifestText);
    assert.deepEqual(
      first.assets.map((asset) => asset.text),
      second.assets.map((asset) => asset.text),
    );
  });
});
