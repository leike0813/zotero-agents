import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import {
  SYNTHESIS_CONCEPT_KB_ALIAS_MAX,
  SYNTHESIS_CONCEPT_KB_CONCEPT_MAX,
  SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
  SYNTHESIS_CONCEPT_KB_INDEX_VERSION,
  SYNTHESIS_CONCEPT_KB_PER_CONCEPT_ALIAS_MAX,
  SYNTHESIS_CONCEPT_KB_QUERY_LABEL_MAX,
  SYNTHESIS_CONCEPT_KB_QUERY_VERSION,
  SYNTHESIS_CONCEPT_KB_SENSE_MAX,
  SYNTHESIS_CONCEPT_KB_STRING_MAX,
  createInProcessSynthesisConceptKbIndexEngine,
  rebuildSynthesisConceptKbIndexRequest,
  rebuildSynthesisConceptKbIndexResult,
  rebuildSynthesisConceptKbQueryRequest,
  rebuildSynthesisConceptKbQueryResult,
  type SynthesisConceptKbIndexRequest,
  type SynthesisConceptKbQueryRequest,
} from "../../packages/synthesis-engine/src/conceptKbIndex";

function sourceRows() {
  return {
    concepts: [
      {
        conceptId: "concept:vision:object-detection",
        label: "Object Detection",
        aliases: ["Detection"],
        conceptType: "task",
        domain: "computer vision",
        status: "active" as const,
        shortDefinition: "Find objects.",
        definition: "Detect and localize objects.",
      },
      {
        conceptId: "concept:vision:object-recognition",
        label: "Object Recognition",
        aliases: ["Recognition"],
        conceptType: "task",
        domain: "computer vision",
        status: "active" as const,
        shortDefinition: "Recognize objects.",
        definition: "Classify visible objects.",
      },
      {
        conceptId: "concept:vision:retired",
        label: "Retired Concept",
        aliases: [],
        conceptType: "task",
        domain: "computer vision",
        status: "deprecated" as const,
      },
    ],
    senses: [
      {
        senseId: "sense:object-detection",
        conceptId: "concept:vision:object-detection",
        label: "Object Detection",
        shortDefinition: "Sense short definition.",
        definition: "Sense definition.",
        confidence: "high" as const,
      },
      {
        senseId: "sense:object-recognition",
        conceptId: "concept:vision:object-recognition",
        label: "Object Recognition",
        shortDefinition: "Recognition sense.",
        definition: "Recognition sense definition.",
        confidence: "medium" as const,
      },
    ],
    aliases: [
      {
        aliasId: "alias:detection",
        alias: "Detection",
        normalized: "detection",
        conceptId: "concept:vision:object-detection",
        senseId: "sense:object-detection",
        status: "active" as const,
        confidence: "high" as const,
      },
      {
        aliasId: "alias:object-a",
        alias: "Object",
        normalized: "object",
        conceptId: "concept:vision:object-detection",
        senseId: "sense:object-detection",
        status: "active" as const,
        confidence: "medium" as const,
      },
      {
        aliasId: "alias:object-b",
        alias: "Object",
        normalized: "object",
        conceptId: "concept:vision:object-recognition",
        senseId: "sense:object-recognition",
        status: "active" as const,
        confidence: "high" as const,
      },
      {
        aliasId: "alias:weak",
        alias: "Weak Detection",
        normalized: "weak detection",
        conceptId: "concept:vision:object-detection",
        senseId: "sense:object-detection",
        status: "active" as const,
        confidence: "low" as const,
      },
    ],
  };
}

function indexRequest(): SynthesisConceptKbIndexRequest {
  return {
    contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_CONCEPT_KB_INDEX_VERSION,
    ...sourceRows(),
    sourceManifestHash: "sha256:concept-kb-basis",
    rebuiltAt: "2026-07-16T00:00:00.000Z",
  };
}

function queryRequest(): SynthesisConceptKbQueryRequest {
  return {
    contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_CONCEPT_KB_QUERY_VERSION,
    ...sourceRows(),
    labels: ["Object Detection", "Detection", "Object", "Missing"],
  };
}

describe("Synthesis Concept KB index engine", function () {
  it("canonically rebuilds strict requests and enforces production bounds", function () {
    assert.equal(
      SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
      "synthesis-concept-kb-index.v1",
    );
    assert.equal(SYNTHESIS_CONCEPT_KB_INDEX_VERSION, "concept-kb-index.v1");
    assert.equal(SYNTHESIS_CONCEPT_KB_QUERY_VERSION, "concept-kb-query.v1");
    assert.equal(SYNTHESIS_CONCEPT_KB_CONCEPT_MAX, 25_000);
    assert.equal(SYNTHESIS_CONCEPT_KB_SENSE_MAX, 100_000);
    assert.equal(SYNTHESIS_CONCEPT_KB_ALIAS_MAX, 250_000);
    assert.equal(SYNTHESIS_CONCEPT_KB_PER_CONCEPT_ALIAS_MAX, 256);
    assert.equal(SYNTHESIS_CONCEPT_KB_QUERY_LABEL_MAX, 100);
    assert.equal(SYNTHESIS_CONCEPT_KB_STRING_MAX, 4096);

    const rebuilt = rebuildSynthesisConceptKbIndexRequest({
      ...indexRequest(),
      ignored: true,
      concepts: indexRequest().concepts.map((concept) => ({
        ...concept,
        ignored: "discard",
      })),
    });
    assert.deepEqual(
      rebuilt.concepts.map((concept) => concept.conceptId),
      [
        "concept:vision:object-detection",
        "concept:vision:object-recognition",
        "concept:vision:retired",
      ],
    );
    assert.notProperty(
      rebuilt as unknown as Record<string, unknown>,
      "ignored",
    );
    assert.notProperty(
      rebuilt.concepts[0] as unknown as Record<string, unknown>,
      "ignored",
    );

    assert.throws(() =>
      rebuildSynthesisConceptKbIndexRequest({
        ...indexRequest(),
        concepts: [indexRequest().concepts[0], indexRequest().concepts[0]],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisConceptKbIndexRequest(indexRequest(), { conceptMax: 2 }),
    );
    assert.throws(() =>
      rebuildSynthesisConceptKbIndexRequest({
        ...indexRequest(),
        aliases: [
          {
            ...indexRequest().aliases[0],
            conceptId: "concept:missing",
          },
        ],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisConceptKbQueryRequest(
        { ...queryRequest(), labels: ["a", "b"] },
        { queryLabelMax: 1 },
      ),
    );
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    assert.throws(() => rebuildSynthesisConceptKbIndexRequest(cyclic));
  });

  it("preserves deterministic search, overlay, and exact query semantics", async function () {
    const engine = createInProcessSynthesisConceptKbIndexEngine();
    const index = await engine.buildIndex(indexRequest());
    assert.deepEqual(
      index.search.map((row) => row.conceptId),
      [
        "concept:vision:object-detection",
        "concept:vision:object-recognition",
        "concept:vision:retired",
      ],
    );
    assert.equal(
      index.search[0]?.normalized,
      "object detection detection find objects. detect and localize objects.",
    );
    assert.deepEqual(
      index.overlayEntries.map((entry) => entry.alias),
      ["Detection"],
    );
    assert.equal(
      index.overlayEntries[0]?.shortDefinition,
      "Sense short definition.",
    );

    const query = await engine.query(queryRequest());
    assert.deepEqual(query.matches, [
      {
        label: "Object Detection",
        exactConceptIds: ["concept:vision:object-detection"],
        aliasMatches: [],
        senseIds: ["sense:object-detection"],
        ambiguous: false,
      },
      {
        label: "Detection",
        exactConceptIds: [],
        aliasMatches: [
          {
            aliasId: "alias:detection",
            conceptId: "concept:vision:object-detection",
          },
        ],
        senseIds: ["sense:object-detection"],
        ambiguous: false,
      },
      {
        label: "Object",
        exactConceptIds: [],
        aliasMatches: [
          {
            aliasId: "alias:object-a",
            conceptId: "concept:vision:object-detection",
          },
          {
            aliasId: "alias:object-b",
            conceptId: "concept:vision:object-recognition",
          },
        ],
        senseIds: ["sense:object-detection", "sense:object-recognition"],
        ambiguous: true,
      },
      {
        label: "Missing",
        exactConceptIds: [],
        aliasMatches: [],
        senseIds: [],
        ambiguous: false,
      },
    ]);
  });

  it("rejects malformed results and supports checkpoint cancellation", async function () {
    const engine = createInProcessSynthesisConceptKbIndexEngine();
    const request = indexRequest();
    const result = await engine.buildIndex(request);
    assert.throws(() =>
      rebuildSynthesisConceptKbIndexResult(
        { ...result, sourceManifestHash: "sha256:wrong" },
        request,
      ),
    );
    assert.throws(() =>
      rebuildSynthesisConceptKbIndexResult(
        { ...result, overlayEntries: [] },
        request,
      ),
    );
    const query = await engine.query(queryRequest());
    assert.throws(() =>
      rebuildSynthesisConceptKbQueryResult(
        {
          ...query,
          matches: [query.matches[0], query.matches[0]],
        },
        queryRequest(),
      ),
    );

    const checkpoints: string[] = [];
    let cancellation: unknown;
    try {
      await createInProcessSynthesisConceptKbIndexEngine({
        checkpoint(checkpoint) {
          checkpoints.push(`${checkpoint.phase}:${checkpoint.processedCount}`);
          if (
            checkpoint.phase === "concepts" &&
            checkpoint.processedCount === 1
          ) {
            throw new Error("cancelled");
          }
        },
        checkpointInterval: 1,
      }).buildIndex(indexRequest());
    } catch (error) {
      cancellation = error;
    }
    assert.equal((cancellation as Error)?.message, "cancelled");
    assert.include(checkpoints, "start:0");
    assert.include(checkpoints, "concepts:1");
    assert.notInclude(checkpoints, "complete:11");
  });

  it("keeps the engine source environment-neutral", async function () {
    const source = await fs.readFile(
      path.resolve("packages/synthesis-engine/src/conceptKbIndex.ts"),
      "utf8",
    );
    for (const forbidden of [
      /from\s+["']node:/,
      /\bZotero\b/,
      /\bdocument\b/,
      /zotero-plugin-toolkit/,
      /from\s+["'][^"']*repository/,
      /from\s+["'][^"']*foundation/,
      /from\s+["'][^"']*runtime/,
    ]) {
      assert.notMatch(source, forbidden);
    }
  });
});
