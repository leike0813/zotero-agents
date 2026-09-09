import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import {
  SYNTHESIS_TAG_VOCABULARY_ABBREV_MAX,
  SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
  SYNTHESIS_TAG_VOCABULARY_ENTRY_MAX,
  SYNTHESIS_TAG_VOCABULARY_FACET_MAX,
  SYNTHESIS_TAG_VOCABULARY_GLOBAL_ALIAS_MAX,
  SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
  SYNTHESIS_TAG_VOCABULARY_PER_ENTRY_ALIAS_MAX,
  SYNTHESIS_TAG_VOCABULARY_STRING_MAX,
  SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
  createInProcessSynthesisTagVocabularyEngine,
  rebuildSynthesisTagVocabularyIndexRequest,
  rebuildSynthesisTagVocabularyIndexResult,
  rebuildSynthesisTagVocabularyValidationRequest,
  rebuildSynthesisTagVocabularyValidationResult,
  type SynthesisTagVocabularyIndexRequest,
  type SynthesisTagVocabularyValidationRequest,
} from "../../packages/synthesis-engine/src/tagVocabulary";

function validationRequest(): SynthesisTagVocabularyValidationRequest {
  return {
    contractVersion: SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
    entries: [
      {
        tag: "status:retired",
        facet: "status",
        deprecated: true,
        replacement: "status:missing",
        aliases: [],
        abbrev: [],
      },
      {
        tag: "model:dl/CNN",
        facet: "model",
        note: "model",
        aliases: ["deep learning"],
        abbrev: ["DL", "CNN"],
      },
      {
        tag: "field:vision",
        facet: "topic",
        aliases: [],
        abbrev: [],
      },
    ],
    aliases: {
      vision: "field:missing",
    },
    abbrev: {
      cnn: "CNN",
      dl: "DL",
      "bad-key": "lower",
    },
    protocol: {
      version: "1.0.0",
      tagPattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
      maxTagLength: 120,
      facets: [
        "field",
        "topic",
        "method",
        "model",
        "ai_task",
        "data",
        "tool",
        "status",
      ],
    },
  };
}

function indexRequest(): SynthesisTagVocabularyIndexRequest {
  return {
    ...validationRequest(),
    algorithmVersion: SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
    sourceManifestHash: "sha256:tag-vocabulary-basis",
    rebuiltAt: "2026-07-16T00:00:00.000Z",
  };
}

describe("Synthesis Tag Vocabulary engine", function () {
  it("canonically rebuilds strict requests and enforces production bounds", function () {
    assert.equal(
      SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
      "synthesis-tag-vocabulary.v1",
    );
    assert.equal(
      SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
      "tag-vocabulary-validation.v1",
    );
    assert.equal(
      SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
      "tag-vocabulary-index.v1",
    );
    assert.equal(SYNTHESIS_TAG_VOCABULARY_ENTRY_MAX, 25_000);
    assert.equal(SYNTHESIS_TAG_VOCABULARY_GLOBAL_ALIAS_MAX, 50_000);
    assert.equal(SYNTHESIS_TAG_VOCABULARY_ABBREV_MAX, 10_000);
    assert.equal(SYNTHESIS_TAG_VOCABULARY_FACET_MAX, 256);
    assert.equal(SYNTHESIS_TAG_VOCABULARY_PER_ENTRY_ALIAS_MAX, 256);
    assert.equal(SYNTHESIS_TAG_VOCABULARY_STRING_MAX, 4096);

    const rebuilt = rebuildSynthesisTagVocabularyValidationRequest({
      ...validationRequest(),
      ignored: true,
      entries: validationRequest().entries.map((entry) => ({
        ...entry,
        ignored: "discard",
      })),
    });
    assert.deepEqual(
      rebuilt.entries.map((entry) => entry.tag),
      ["model:dl/CNN", "status:retired", "field:vision"],
    );
    assert.notProperty(rebuilt as Record<string, unknown>, "ignored");
    assert.notProperty(
      rebuilt.entries[0] as unknown as Record<string, unknown>,
      "ignored",
    );

    assert.throws(() =>
      rebuildSynthesisTagVocabularyValidationRequest({
        ...validationRequest(),
        entries: [
          validationRequest().entries[0],
          validationRequest().entries[0],
        ],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTagVocabularyValidationRequest(validationRequest(), {
        entryMax: 2,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTagVocabularyValidationRequest({
        ...validationRequest(),
        entries: [
          {
            ...validationRequest().entries[0],
            note: "x".repeat(SYNTHESIS_TAG_VOCABULARY_STRING_MAX + 1),
          },
        ],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTagVocabularyValidationRequest({
        ...validationRequest(),
        entries: [
          {
            tag: "field:vision",
            facet: "field",
            note: "n".repeat(3000),
            aliases: ["a".repeat(2000)],
            abbrev: [],
          },
        ],
      }),
    );
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    assert.throws(() => rebuildSynthesisTagVocabularyValidationRequest(cyclic));
  });

  it("preserves deterministic TagVocab warnings and index projection semantics", function () {
    const engine = createInProcessSynthesisTagVocabularyEngine();
    const validation = engine.validate(validationRequest());
    assert.deepEqual(
      validation.warnings.map((warning) => [warning.code, warning.tag]),
      [
        ["invalid_abbrev_key", "bad-key"],
        ["invalid_abbrev_value", "bad-key"],
        ["abbrev_case_error", "model:dl/CNN"],
        ["missing_replacement", "status:retired"],
        ["facet_mismatch", "field:vision"],
        ["alias_target_missing", "vision"],
      ],
    );
    assert.deepEqual(
      rebuildSynthesisTagVocabularyValidationResult(
        {
          ...validation,
          ignored: true,
          warnings: validation.warnings.map((warning) => ({
            ...warning,
            ignored: true,
          })),
        },
        validationRequest(),
      ),
      validation,
    );

    const index = engine.buildIndex(indexRequest());
    assert.deepEqual(index.tags, ["field:vision", "model:dl/CNN"]);
    assert.deepEqual(index.aliases, { vision: "field:missing" });
    assert.deepEqual(index.abbrev, {
      "bad-key": "lower",
      cnn: "CNN",
      dl: "DL",
    });
    assert.deepEqual(
      index.search.map((entry) => entry.tag),
      ["model:dl/CNN", "status:retired", "field:vision"],
    );
    assert.equal(
      index.search.find((entry) => entry.tag === "model:dl/CNN")?.normalized,
      "model:dl/cnn model deep learning cnn dl",
    );
  });

  it("rejects malformed results and supports checkpoint cancellation", function () {
    const request = indexRequest();
    const result =
      createInProcessSynthesisTagVocabularyEngine().buildIndex(request);
    assert.throws(() =>
      rebuildSynthesisTagVocabularyIndexResult(
        {
          ...result,
          sourceManifestHash: "sha256:wrong",
        },
        request,
      ),
    );
    assert.throws(() =>
      rebuildSynthesisTagVocabularyIndexResult(
        {
          ...result,
          tags: result.tags.slice(1),
        },
        request,
      ),
    );

    const checkpoints: string[] = [];
    assert.throws(() =>
      createInProcessSynthesisTagVocabularyEngine({
        checkpoint(checkpoint) {
          checkpoints.push(`${checkpoint.phase}:${checkpoint.processedCount}`);
          if (
            checkpoint.phase === "entries" &&
            checkpoint.processedCount === 1
          ) {
            throw new Error("cancelled");
          }
        },
        checkpointInterval: 1,
      }).validate(validationRequest()),
    );
    assert.include(checkpoints, "start:0");
    assert.include(checkpoints, "entries:1");
    assert.notInclude(checkpoints, "complete:3");
  });

  it("keeps the engine source environment-neutral", async function () {
    const source = await fs.readFile(
      path.resolve("packages/synthesis-engine/src/tagVocabulary.ts"),
      "utf8",
    );
    for (const forbidden of [
      /from\s+["']node:/,
      /\bZotero\b/,
      /zotero-plugin-toolkit/,
      /from\s+["'][^"']*repository/,
      /from\s+["'][^"']*foundation/,
      /from\s+["'][^"']*runtime/,
    ]) {
      assert.notMatch(source, forbidden);
    }
  });
});
