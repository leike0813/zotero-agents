import { assert } from "chai";
import type { JsonValue, ManagedNoteKind } from "../../src/workflows/types";
import {
  buildReferenceSidecarIndexRow,
  buildSynthesisLayerDbPath,
  PAPER_ARTIFACT_TYPES,
} from "../../src/modules/synthesis/registry";
import { readArtifactsFromRegistryInputs } from "../../src/modules/synthesis/libraryAdapter";

function note(args: {
  key: string;
  payloadType: string;
  payload: unknown;
  payloadFormat?: "json" | "text";
  visible?: string;
}) {
  const noteKind = (
    {
      "digest-markdown": "digest",
      "references-json": "references",
      "citation-analysis-json": "citation-analysis",
      "literature-score-json": "literature-score",
    } as const
  )[args.payloadType];
  return {
    key: args.key,
    title: args.visible || args.key,
    updatedAt: "2026-05-10T12:00:00.000Z",
    noteKind: noteKind as ManagedNoteKind,
    payload: (noteKind === "digest"
      ? { markdown: args.payload }
      : args.payload) as JsonValue,
    issue: null,
  };
}

function referencesArtifact(title = "Ref") {
  return {
    schema: "source_reference_artifact.v1",
    references: [
      {
        sourceReferenceId: "source-ref-one",
        extraction: null,
        bibliography: { title, authors: [], year: null },
        matching: {},
      },
    ],
  };
}

function citationArtifact() {
  return {
    schema: "citation_analysis_artifact.v1",
    meta: {
      language: "en",
      scope: { section_title: null, line_start: null, line_end: null },
      scope_source: null,
      scope_decision: {
        selection_reason: null,
        covered_sections: [],
        fallback_from: null,
        fallback_reason: null,
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
    unresolved: [],
  };
}

function literatureScore(overallScore = 80, confidence = 0.75) {
  return {
    schema: "literature_score.v1",
    rubric_id: "literature-analysis-rubric.v1",
    paper_type: "empirical",
    paper_type_reason: "The paper reports an empirical study.",
    overall_score: overallScore,
    confidence,
    confidence_adjusted_score: 72,
    dimensions: [
      "methodological_rigor",
      "evidence_completeness",
      "reproducibility",
      "innovation_signals",
      "research_impact_potential",
      "writing_quality",
    ].map((dimensionKey) => ({
      dimension_key: dimensionKey,
      name: dimensionKey,
      configured_weight: 1 / 6,
      effective_weight: 1 / 6,
      raw_score: 8,
      applicable_max_score: 10,
      score: overallScore,
      confidence,
      summary: `${dimensionKey} assessment`,
      criteria: [
        {
          criterion_key: `${dimensionKey}.criterion`,
          name: "Criterion",
          status: "scored",
          score: 8,
          max_score: 10,
          reason: "Supported",
          evidence: [],
        },
      ],
    })),
  };
}

describe("Synthesis Reference Sidecar Index", function () {
  it("builds index rows from Zotero source DTOs and derived artifact payloads [inv.ids.paper_ref_format]", function () {
    const row = buildReferenceSidecarIndexRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      year: "2024",
      itemType: "journalArticle",
      tags: ["topic:test"],
      collections: ["COLL1"],
      notes: [
        note({
          key: "D1",
          payloadType: "digest-markdown",
          payload: "# Digest\n\nBody",
          payloadFormat: "text",
        }),
        note({
          key: "R1",
          payloadType: "references-json",
          payload: referencesArtifact(),
        }),
        note({
          key: "C1",
          payloadType: "citation-analysis-json",
          payload: citationArtifact(),
        }),
        note({
          key: "S1",
          payloadType: "literature-score-json",
          payload: literatureScore(),
        }),
      ],
    });

    assert.equal(row.paper_ref, "1:ABCD1234");
    assert.equal(row.artifactCoverage, "complete");
    assert.equal(row.artifacts.digest.status, "available");
    assert.equal(row.artifacts.references.status, "available");
    assert.equal(row.artifacts.citation_analysis.status, "available");
    assert.equal(row.artifacts.literature_score.status, "available");
    assert.deepEqual(PAPER_ARTIFACT_TYPES, [
      "digest",
      "references",
      "citation_analysis",
      "literature_score",
    ]);
    assert.match(row.artifacts.digest.hash || "", /^sha256:[a-f0-9]{64}$/);
    assert.deepEqual(row.tags, ["topic:test"]);
    assert.deepEqual(row.collections, ["COLL1"]);
  });

  it("hashes semantic payload independently of the note title", function () {
    const first = buildReferenceSidecarIndexRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [
        note({
          key: "D1",
          payloadType: "digest-markdown",
          payload: "# Digest\n\nBody",
          payloadFormat: "text",
          visible: "Visible A",
        }),
      ],
    });
    const second = buildReferenceSidecarIndexRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [
        note({
          key: "D1",
          payloadType: "digest-markdown",
          payload: "# Digest\n\nBody",
          payloadFormat: "text",
          visible: "Visible B",
        }),
      ],
    });

    assert.equal(first.artifacts.digest.hash, second.artifacts.digest.hash);
  });

  it("treats current digest payload notes as available digest artifacts", function () {
    const input = {
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [
        note({
          key: "DLEGACY",
          payloadType: "digest-markdown",
          payload: "# Digest\n\nVisible digest body",
          payloadFormat: "text",
        }),
      ],
    };

    const row = buildReferenceSidecarIndexRow(input);
    const read = readArtifactsFromRegistryInputs([input], {
      paper_ref: "1:ABCD1234",
      artifact_types: ["digest"],
    });

    assert.equal(row.artifacts.digest.status, "available");
    assert.equal(row.artifacts.digest.note_key, "DLEGACY");
    assert.equal(read.artifacts[0]?.status, "available");
    assert.equal(read.artifacts[0]?.note_key, "DLEGACY");
  });

  it("reports duplicate candidates without selecting a note", function () {
    const row = buildReferenceSidecarIndexRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [
        note({
          key: "D2",
          payloadType: "digest-markdown",
          payload: "# Digest 2",
          payloadFormat: "text",
        }),
        note({
          key: "D1",
          payloadType: "digest-markdown",
          payload: "# Digest 1",
          payloadFormat: "text",
        }),
      ],
    });

    assert.equal(row.artifacts.digest.status, "error");
    assert.notProperty(row.artifacts.digest, "note_key");
    assert.isTrue(
      row.diagnostics.some(
        (entry) => entry.code === "duplicate_payload_candidates",
      ),
    );
  });

  it("marks rows partial when required artifacts are missing", function () {
    const row = buildReferenceSidecarIndexRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [],
    });

    assert.equal(row.artifactCoverage, "missing");
    assert.deepEqual(
      row.diagnostics.map((entry) => entry.code),
      [
        "payload_missing",
        "payload_missing",
        "payload_missing",
        "payload_missing",
      ],
    );
  });

  it("keeps the reference facet score-independent while score state affects artifact coverage and row hash", function () {
    const commonNotes = [
      note({
        key: "D1",
        payloadType: "digest-markdown",
        payload: "# Digest",
        payloadFormat: "text",
      }),
      note({
        key: "R1",
        payloadType: "references-json",
        payload: referencesArtifact(),
      }),
      note({
        key: "C1",
        payloadType: "citation-analysis-json",
        payload: citationArtifact(),
      }),
    ];
    const missing = buildReferenceSidecarIndexRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: commonNotes,
    });
    const available = buildReferenceSidecarIndexRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [
        ...commonNotes,
        note({
          key: "S1",
          payloadType: "literature-score-json",
          payload: literatureScore(90, 0.8),
        }),
      ],
    });
    const invalid = buildReferenceSidecarIndexRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [
        ...commonNotes,
        note({
          key: "S1",
          payloadType: "literature-score-json",
          payload: { literature_score: { schema: "literature_score.v1" } },
        }),
      ],
    });

    assert.equal(missing.artifactCoverage, "partial");
    assert.equal(available.artifactCoverage, "complete");
    assert.equal(invalid.artifactCoverage, "partial");
    assert.equal(invalid.artifacts.literature_score.status, "error");
    assert.equal(
      missing.facets.reference.hash,
      available.facets.reference.hash,
    );
    assert.equal(
      invalid.facets.reference.hash,
      available.facets.reference.hash,
    );
    assert.notEqual(
      missing.facets.artifact.hash,
      available.facets.artifact.hash,
    );
    assert.notEqual(missing.row_hash, available.row_hash);
  });

  it("reads all four artifact types by default and preserves explicit filtering", function () {
    const input = {
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [
        note({
          key: "S1",
          payloadType: "literature-score-json",
          payload: literatureScore(),
        }),
      ],
    };

    const all = readArtifactsFromRegistryInputs([input], {
      paper_ref: "1:ABCD1234",
    });
    const scoreOnly = readArtifactsFromRegistryInputs([input], {
      paper_ref: "1:ABCD1234",
      artifact_types: ["literature_score"],
    });

    assert.deepEqual(
      all.artifacts.map((artifact) => artifact.artifact_type),
      PAPER_ARTIFACT_TYPES,
    );
    assert.deepEqual(
      scoreOnly.artifacts.map((artifact) => artifact.artifact_type),
      ["literature_score"],
    );
    assert.equal(scoreOnly.artifacts[0]?.status, "available");
  });

  it("carries Citation basis as runtime provenance beside the public payload", function () {
    const citation = citationArtifact();
    const read = readArtifactsFromRegistryInputs(
      [
        {
          libraryId: 1,
          itemKey: "ABCD1234",
          title: "Paper",
          notes: [
            {
              key: "C1",
              noteKind: "citation-analysis",
              payload: citation,
              provenance: { referencesBasis: `sha256:${"a".repeat(64)}` },
            },
          ],
        },
      ],
      { paper_ref: "1:ABCD1234", artifact_types: ["citation_analysis"] },
    );
    assert.equal(
      read.artifacts[0]?.referencesBasis,
      `sha256:${"a".repeat(64)}`,
    );
    assert.notProperty(read.artifacts[0]?.payload as object, "referencesBasis");
  });

  it("plans a dedicated local SQLite database path", function () {
    assert.match(
      buildSynthesisLayerDbPath("C:/runtime").replace(/\\/g, "/"),
      /C:\/runtime\/state\/synthesis\.db$/,
    );
  });
});
