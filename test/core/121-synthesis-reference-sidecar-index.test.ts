import { assert } from "chai";
import {
  listNotePayloadBlocks,
  renderPayloadBlock,
} from "../../src/modules/notePayloadCodec";
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
  const html = [
    `<div><h1>${args.visible || args.key}</h1>`,
    renderPayloadBlock({
      payloadType: args.payloadType,
      payload: args.payload,
      payloadFormat: args.payloadFormat,
    }),
    "</div>",
  ].join("\n");
  return {
    key: args.key,
    title: args.key,
    updatedAt: "2026-05-10T12:00:00.000Z",
    html,
    payloadBlocks: listNotePayloadBlocks(html).map((block) => ({
      ...block,
      source: "embedded-image-attachment" as const,
      sourceStorage: "embedded-image-attachment-v2" as const,
      payloadStorageVersion: 2,
      anchorStatus: "present" as const,
      attachmentKey: `${args.key}-ATTACHMENT`,
    })),
  };
}

function literatureScore(overallScore = 80, confidence = 0.75) {
  return {
    literature_score: {
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
        score: overallScore,
        confidence,
        summary: `${dimensionKey} assessment`,
      })),
    },
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
          payload: { references: [{ title: "Ref" }] },
        }),
        note({
          key: "C1",
          payloadType: "citation-analysis-json",
          payload: { citations: [{ role: "background" }] },
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

  it("hashes decoded payload content and ignores visible note HTML", function () {
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

  it("records duplicate payload diagnostics while selecting deterministic candidates", function () {
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

    assert.equal(row.artifacts.digest.note_key, "D1");
    assert.includeDeepMembers(row.diagnostics, [
      {
        code: "duplicate_payload_candidates",
        artifact_type: "digest",
        message: "2 valid candidates found for digest",
      },
    ]);
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
        payload: { references: [] },
      }),
      note({
        key: "C1",
        payloadType: "citation-analysis-json",
        payload: { citation_analysis: { report_md: "## Report" } },
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

  it("plans a dedicated local SQLite database path", function () {
    assert.match(
      buildSynthesisLayerDbPath("C:/runtime").replace(/\\/g, "/"),
      /C:\/runtime\/state\/synthesis\.db$/,
    );
  });
});
