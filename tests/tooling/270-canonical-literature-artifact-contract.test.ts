import { assert } from "chai";
import {
  CANONICAL_ARTIFACT_MAX_BYTES,
  CITATION_ANALYSIS_ARTIFACT_SCHEMA,
  SOURCE_REFERENCE_ARTIFACT_SCHEMA,
  attachReferencesBasis,
  ensureSourceReferenceId,
  exportCanonicalCitationAnalysisArtifact,
  generateSourceReferenceId,
  parseCitationAnalysisArtifact,
  parseStoredCitationAnalysisArtifact,
  parseSourceReferenceArtifact,
  toCitationAnalysisInput,
  validateCitationAnalysisArtifact,
  validateCitationAgainstReferences,
  validateSourceReferenceArtifact,
  type CitationAnalysisArtifact,
  type SourceReferenceArtifact,
} from "../../packages/synthesis-contracts/src/sourceReferenceArtifact";

function sourceReferenceArtifact(): SourceReferenceArtifact {
  return {
    schema: SOURCE_REFERENCE_ARTIFACT_SCHEMA,
    references: [
      {
        sourceReferenceId: "550e8400-e29b-41d4-a716-446655440000",
        extraction: {
          raw: "Doe, J. (2024). Example paper.",
          confidence: 0.92,
        },
        bibliography: {
          title: "Example paper",
          authors: ["Doe, Jane"],
          year: 2024,
          publicationTitle: "Example Journal",
          volume: "12",
          issue: "3",
          pages: "10-19",
        },
        matching: {
          DOI: "10.1234/example",
          url: "https://example.test/paper",
        },
      },
    ],
  };
}

function citationArtifact(): CitationAnalysisArtifact {
  return {
    schema: CITATION_ANALYSIS_ARTIFACT_SCHEMA,
    meta: {
      language: "en",
      scope: {
        section_title: "Introduction",
        line_start: 1,
        line_end: 10,
      },
      scope_source: "document",
      scope_decision: {
        selection_reason: "selected introduction",
        covered_sections: ["Introduction"],
        fallback_from: null,
        fallback_reason: null,
      },
      mapping_reliability: "normal",
      reference_extraction: {
        status: "completed",
      },
    },
    summary: "The section establishes the motivation.",
    timeline: {
      early: { summary: "", sourceReferenceIds: [] },
      mid: { summary: "", sourceReferenceIds: [] },
      recent: {
        summary: "Recent evidence.",
        sourceReferenceIds: ["550e8400-e29b-41d4-a716-446655440000"],
      },
    },
    items: [
      {
        sourceReferenceId: "550e8400-e29b-41d4-a716-446655440000",
        function: "background",
        role_in_context: "supports the motivation",
        topic: "motivation",
        usage: "background",
        keywords: ["example"],
        summary: "The cited work establishes the motivation.",
        key_reference_reason: null,
        confidence: 0.9,
        mentions: [
          {
            mention_id: "mention-1",
            marker: "[1]",
            style: "numeric",
            line_start: 3,
            line_end: 3,
            snippet: "The prior work [1] establishes the motivation.",
            ref_number_hint: 1,
            year_hint: null,
            surname_hint: "Doe",
            citation_label_hint: null,
            citekey_hint: null,
          },
        ],
      },
    ],
    unresolved: [],
  };
}

describe("canonical literature artifact contract", function () {
  it("accepts the closed Source Reference shape", function () {
    const result = validateSourceReferenceArtifact(sourceReferenceArtifact());
    assert.isTrue(result.ok);
    assert.deepEqual(
      parseSourceReferenceArtifact(sourceReferenceArtifact()),
      sourceReferenceArtifact(),
    );
  });

  it("rejects aliases and unknown Source Reference fields", function () {
    const value = sourceReferenceArtifact() as unknown as Record<
      string,
      unknown
    >;
    const row = (value.references as Record<string, unknown>[])[0];
    row.author = ["Doe, Jane"];
    row.extra = "must fail";
    const result = validateSourceReferenceArtifact(value);
    assert.isFalse(result.ok);
    if (!result.ok) {
      assert.include(
        result.issues.map((issue) => issue.code),
        "schema_invalid",
      );
    }
  });

  it("rejects duplicate opaque Source Reference IDs", function () {
    const value = sourceReferenceArtifact();
    value.references.push(structuredClone(value.references[0]));
    const result = validateSourceReferenceArtifact(value);
    assert.isFalse(result.ok);
    if (!result.ok) {
      assert.include(
        result.issues.map((issue) => issue.code),
        "duplicate_source_reference_id",
      );
    }
  });

  it("keeps Citation function and role_in_context distinct and excludes projections", function () {
    const artifact = citationArtifact();
    assert.isTrue(validateCitationAnalysisArtifact(artifact).ok);
    const value = artifact as unknown as Record<string, unknown>;
    value.report_md = "derived report";
    const item = (value.items as Record<string, unknown>[])[0];
    item.citation_label = "[1]";
    item.reference = { title: "derived snapshot" };
    const result = validateCitationAnalysisArtifact(value);
    assert.isFalse(result.ok);
  });

  it("validates Citation sourceReferenceId linkage against the complete References set", function () {
    const artifact = citationArtifact();
    assert.isTrue(
      validateCitationAgainstReferences(artifact, sourceReferenceArtifact()).ok,
    );
    const unknownId = structuredClone(artifact);
    unknownId.items[0].sourceReferenceId = "missing-source-reference";
    const result = validateCitationAgainstReferences(
      unknownId,
      sourceReferenceArtifact(),
    );
    assert.isFalse(result.ok);
    if (!result.ok) {
      assert.include(
        result.issues.map((issue) => issue.code),
        "unknown_source_reference_id",
      );
    }
  });

  it("keeps runtime basis out of public Citation input and adds it only in storage", function () {
    const stored = attachReferencesBasis(
      citationArtifact(),
      "sha256:references",
    );
    assert.strictEqual(stored.referencesBasis, "sha256:references");
    assert.deepEqual(parseStoredCitationAnalysisArtifact(stored), stored);
    assert.deepEqual(toCitationAnalysisInput(stored), citationArtifact());
    assert.deepEqual(
      exportCanonicalCitationAnalysisArtifact(stored),
      citationArtifact(),
    );
    const publicResult = validateCitationAnalysisArtifact(stored);
    assert.isFalse(publicResult.ok);
  });

  it("allocates UUIDs only when an explicit opaque ID is absent", function () {
    const generated = generateSourceReferenceId();
    assert.match(
      generated,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    assert.strictEqual(
      ensureSourceReferenceId("retained-explicit-id"),
      "retained-explicit-id",
    );
    assert.strictEqual(
      ensureSourceReferenceId(undefined, () => "new-id"),
      "new-id",
    );
  });

  it("reports the Broker domain byte bound without applying the ToolResult gate", function () {
    assert.strictEqual(CANONICAL_ARTIFACT_MAX_BYTES, 1_048_576);
  });

  it("rejects values JSON.stringify would erase or cannot represent", function () {
    const withUndefined = sourceReferenceArtifact() as unknown as Record<
      string,
      unknown
    >;
    (withUndefined.references as Record<string, unknown>[])[0].legacy =
      undefined;
    assert.isFalse(validateSourceReferenceArtifact(withUndefined).ok);

    const cyclic = sourceReferenceArtifact() as unknown as Record<
      string,
      unknown
    >;
    (cyclic.references as unknown[]).push(cyclic);
    assert.isFalse(validateSourceReferenceArtifact(cyclic).ok);

    assert.isFalse(validateSourceReferenceArtifact(new Date()).ok);
  });
});
