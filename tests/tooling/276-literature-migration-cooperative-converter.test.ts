import { assert } from "chai";
import { CanonicalLiteratureArtifactValidationError } from "../../packages/synthesis-contracts/src/sourceReferenceArtifact";
import {
  convertLegacyArtifactSet,
  convertLegacyArtifactSetAsync,
  resolveLiteratureArtifactMigrationConversion,
  resolveLiteratureArtifactMigrationConversionAsync,
  type LegacyArtifactSetInput,
} from "../../src/modules/literatureArtifactMigration/converter";

const deterministicOptions = {
  idFactory: (() => {
    let index = 0;
    return () => `source-${++index}`;
  })(),
};

function baseInput(): LegacyArtifactSetInput {
  return {
    libraryId: 1,
    parentRef: { libraryId: 1, key: "PARENT" },
    references: [
      { title: "Alpha", year: 2024, authors: ["Ada"] },
      { title: "Alpha", year: 2024, authors: ["Ada"] },
    ],
  };
}

describe("cooperative literature artifact migration converter", function () {
  it("keeps an oversized citation review blocked after duplicate merging", function () {
    const references = Array.from({ length: 2 }, () => ({
      title: "Alpha",
      year: 2024,
      authors: ["Ada"],
    }));
    const plan = convertLegacyArtifactSet(
      {
        ...baseInput(),
        references,
        citation: {
          mentions: Array.from({ length: 6000 }, (_, index) => ({
            mention_id: `mention-${index}`,
            raw_citation: `citation-${index}`,
            snippet: "x".repeat(220),
          })),
        },
        canonicalNotes: [
          {
            ref: { libraryId: 1, key: "BROKEN" },
            noteKind: "references",
            revision: "broken-1",
            payload: { schema: "invalid" },
          },
        ],
      },
      deterministicOptions,
    );
    assert.include(plan.reasonCodes, "invalid_canonical_artifact");
    assert.include(plan.reasonCodes, "duplicate_reference");
    assert.isTrue(plan.sourceCanonicalInvalid);
    assert.doesNotThrow(() =>
      resolveLiteratureArtifactMigrationConversion(plan, [
        { reasonCode: "duplicate_reference", kind: "merge_duplicates" },
      ]),
    );
    const resolved = resolveLiteratureArtifactMigrationConversion(plan, [
      { reasonCode: "duplicate_reference", kind: "merge_duplicates" },
    ]);
    assert.equal(resolved.classification, "blocked");
    assert.include(resolved.reasonCodes, "invalid_canonical_artifact");
  });

  it("keeps a known invalid Citation blocked while completing duplicate merging", function () {
    const conversion = convertLegacyArtifactSet(
      {
        ...baseInput(),
        citation: {
          summary: "x".repeat(65_537),
          mentions: [{ raw_citation: "Example (2024)" }],
        },
      },
      deterministicOptions,
    );
    assert.include(conversion.reasonCodes, "duplicate_reference");
    assert.include(conversion.reasonCodes, "invalid_canonical_artifact");

    const resolved = resolveLiteratureArtifactMigrationConversion(conversion, [
      { reasonCode: "duplicate_reference", kind: "merge_duplicates" },
    ]);

    assert.equal(resolved.classification, "blocked");
    assert.notInclude(resolved.reasonCodes, "duplicate_reference");
    assert.include(resolved.reasonCodes, "invalid_canonical_artifact");
  });

  it("matches synchronous and asynchronous conversion for empty sources and reports", async function () {
    const input: LegacyArtifactSetInput = {
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      references: [],
      citation: {
        summary: "",
        report_md: "report text".repeat(10_000),
        items: [],
      },
    };
    const sync = convertLegacyArtifactSet(input, deterministicOptions);
    const asyncResult = await convertLegacyArtifactSetAsync(
      input,
      deterministicOptions,
      async () => Promise.resolve(),
    );

    assert.equal(sync.classification, "ready");
    assert.equal(asyncResult.classification, sync.classification);
    assert.deepEqual(asyncResult.references, sync.references);
    assert.deepEqual(asyncResult.citation, sync.citation);
    assert.equal(asyncResult.citation?.summary, "");
  });

  it("drops only the selected unresolved mentions from a known invalid Citation", function () {
    const conversion = convertLegacyArtifactSet(
      {
        ...baseInput(),
        citation: {
          summary: "x".repeat(65_537),
          mentions: [{ rawCitation: "Unknown (2020)" }],
        },
      },
      deterministicOptions,
    );
    assert.include(conversion.reasonCodes, "unresolved_linkage");
    assert.include(conversion.reasonCodes, "invalid_canonical_artifact");

    const resolved = resolveLiteratureArtifactMigrationConversion(conversion, [
      { reasonCode: "unresolved_linkage", kind: "drop_unresolved" },
    ]);

    assert.equal(resolved.droppedCount, conversion.droppedCount + 1);
    assert.equal(resolved.citation?.unresolved.length, 0);
    assert.include(resolved.reasonCodes, "invalid_canonical_artifact");
    assert.equal(resolved.classification, "blocked");
  });

  it("propagates citation schema failures for atomic service rollback", function () {
    const conversion = convertLegacyArtifactSet(
      {
        ...baseInput(),
        citation: {
          items: [
            {
              title: "Alpha",
              year: 2024,
              authors: ["Ada"],
              mentions: [{ snippet: "mention" }],
            },
          ],
        },
      },
      deterministicOptions,
    );
    if (!conversion.citation) throw new Error("expected converted Citation");
    conversion.citation.summary = 42 as unknown as string;
    assert.throws(
      () =>
        resolveLiteratureArtifactMigrationConversion(conversion, [
          { reasonCode: "duplicate_reference", kind: "merge_duplicates" },
        ]),
      CanonicalLiteratureArtifactValidationError,
    );
  });

  it("resolves only the selected linkage reason's affected mentions", function () {
    const conversion = convertLegacyArtifactSet(
      baseInput(),
      deterministicOptions,
    );
    conversion.reasonCodes = ["unresolved_linkage", "ambiguous_linkage"];
    conversion.classification = "review_required";
    conversion.citation = {
      schema: "citation_analysis_artifact.v1",
      meta: {
        language: "",
        scope: { section_title: null, line_start: null, line_end: null },
        scope_source: null,
        scope_decision: {
          selection_reason: "",
          covered_sections: [],
          fallback_from: null,
          fallback_reason: "",
        },
        mapping_reliability: "normal",
        reference_extraction: { status: "completed" },
      },
      summary: "",
      timeline: {
        early: { summary: "", sourceReferenceIds: [] },
        mid: { summary: "", sourceReferenceIds: [] },
        recent: { summary: "", sourceReferenceIds: [] },
      },
      items: [],
      unresolved: [
        {
          mention_id: "unresolved",
          marker: null,
          style: null,
          line_start: null,
          line_end: null,
          snippet: null,
          ref_number_hint: null,
          year_hint: null,
          surname_hint: null,
          citation_label_hint: null,
          citekey_hint: null,
          reason: "unresolved_linkage",
        },
        {
          mention_id: "ambiguous",
          marker: null,
          style: null,
          line_start: null,
          line_end: null,
          snippet: null,
          ref_number_hint: null,
          year_hint: null,
          surname_hint: null,
          citation_label_hint: null,
          citekey_hint: null,
          reason: "ambiguous_linkage",
        },
      ],
    };
    const resolved = resolveLiteratureArtifactMigrationConversion(conversion, [
      { reasonCode: "unresolved_linkage", kind: "drop_unresolved" },
    ]);
    assert.include(resolved.reasonCodes, "ambiguous_linkage");
    assert.equal(resolved.citation?.unresolved.length, 1);
  });

  it("cooperates while converting references and stops when the caller stops", async function () {
    const input: LegacyArtifactSetInput = {
      ...baseInput(),
      references: Array.from({ length: 6000 }, (_, index) => ({
        title: `Paper ${index}`,
        year: 2000 + (index % 25),
        authors: [`Author ${index}`],
      })),
    };
    let heartbeatCount = 0;
    const asyncPlan = await convertLegacyArtifactSetAsync(
      input,
      {
        idFactory: (() => {
          let index = 0;
          return () => `source-${++index}`;
        })(),
      },
      async () => {
        heartbeatCount += 1;
        await Promise.resolve();
      },
    );
    const syncPlan = convertLegacyArtifactSet(input, {
      idFactory: (() => {
        let index = 0;
        return () => `source-${++index}`;
      })(),
    });
    assert.isAtLeast(heartbeatCount, 2);
    assert.deepEqual(asyncPlan, syncPlan);

    let stopped = false;
    try {
      await convertLegacyArtifactSetAsync(input, {}, async () => {
        stopped = true;
        throw new Error("stopped");
      });
      assert.fail("expected cooperative stop");
    } catch (error) {
      assert.equal((error as Error).message, "stopped");
    }
    assert.isTrue(stopped);
  });

  it("cooperates while applying resolutions and preserves compactable citations", async function () {
    const conversion = convertLegacyArtifactSet(
      {
        ...baseInput(),
        references: Array.from({ length: 120 }, () => ({
          title: "Alpha",
          year: 2024,
          authors: ["Ada"],
        })),
        citation: {
          items: [
            {
              title: "Alpha",
              year: 2024,
              authors: ["Ada"],
              mentions: Array.from({ length: 1200 }, (_, index) => ({
                snippet: `marker ${index} ` + "x".repeat(1200),
              })),
            },
          ],
        },
      },
      deterministicOptions,
    );
    let yields = 0;
    const asyncResolved =
      await resolveLiteratureArtifactMigrationConversionAsync(
        conversion,
        [{ reasonCode: "duplicate_reference", kind: "merge_duplicates" }],
        async () => {
          yields += 1;
          await Promise.resolve();
        },
      );
    const syncResolved = resolveLiteratureArtifactMigrationConversion(
      conversion,
      [{ reasonCode: "duplicate_reference", kind: "merge_duplicates" }],
    );
    assert.isAtLeast(yields, 1);
    assert.deepEqual(asyncResolved, syncResolved);
    assert.isNotNull(asyncResolved.citation);
  });
});
