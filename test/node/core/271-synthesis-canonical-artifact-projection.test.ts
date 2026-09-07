import { assert } from "chai";
import { projectSynthesisReferencePayloads } from "../../../packages/synthesis-application/src/referenceProjection";
import { hashSynthesisContractCanonicalJson } from "../../../packages/synthesis-contracts/src/canonicalJson";
import { summarizeLibraryGeneratedArtifacts } from "../../../src/modules/libraryArtifactReadiness";

const sourceReferenceId = "550e8400-e29b-41d4-a716-446655440000";

function references() {
  return {
    schema: "source_reference_artifact.v1",
    references: [
      {
        sourceReferenceId,
        extraction: { raw: "Doe, J. (2024). Example.", confidence: 0.9 },
        bibliography: {
          title: "Example paper",
          authors: ["Doe, Jane"],
          year: 2024,
        },
        matching: { citekey: "doe2024" },
      },
    ],
  };
}

function citation() {
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
    items: [
      {
        sourceReferenceId,
        function: "background",
        role_in_context: "sets the context",
        topic: null,
        usage: null,
        keywords: [],
        summary: null,
        key_reference_reason: null,
        confidence: null,
        mentions: [],
      },
    ],
    unresolved: [],
  };
}

const item = {
  paperRef: "1:SOURCE",
  libraryId: 1,
  itemKey: "SOURCE",
  itemType: "journalArticle",
  title: "Source",
  year: "2025",
  date: "2025-01-01",
  creators: [],
  tags: [],
  collections: [],
  doi: "",
  arxiv: "",
  isbn: "",
  url: "",
  citekey: "source",
  dateAdded: "2025-01-01",
};

describe("Synthesis canonical literature artifact projection", function () {
  it("drops stale Citation evidence after a References-only write and restores it for the exact basis", async function () {
    const referencesPayload = references();
    const currentBasis = hashSynthesisContractCanonicalJson(referencesPayload);
    const baseNotes = [
      {
        key: "references",
        title: "References",
        updatedAt: "2026-09-07T00:00:00.000Z",
        noteKind: "references" as const,
        payload: referencesPayload,
        issue: null,
      },
      {
        key: "citation",
        title: "Citation Analysis",
        updatedAt: "2026-09-07T00:00:00.000Z",
        noteKind: "citation-analysis" as const,
        payload: citation(),
        issue: null,
        referencesBasis: currentBasis,
      },
    ];

    const summarize = (notes: typeof baseNotes) =>
      summarizeLibraryGeneratedArtifacts(notes);
    assert.isTrue(
      (await summarize(baseNotes)).artifacts.has("citation-analysis"),
    );

    const changedReferences = {
      ...referencesPayload,
      references: referencesPayload.references.map((entry) => ({
        ...entry,
        bibliography: { ...entry.bibliography, title: "Changed" },
      })),
    };
    const stale = await summarize([
      { ...baseNotes[0], payload: changedReferences },
      baseNotes[1],
    ]);
    assert.isFalse(stale.artifacts.has("citation-analysis"));

    const restored = await summarize([
      baseNotes[0],
      {
        ...baseNotes[1],
        referencesBasis: currentBasis,
      },
    ]);
    assert.isTrue(restored.artifacts.has("citation-analysis"));
  });

  it("retains opaque source IDs while deriving canonical content identity", function () {
    const result = projectSynthesisReferencePayloads({
      items: [item],
      sources: [
        {
          paperRef: item.paperRef,
          referencesArtifactHash: "sha256:references",
          referencesPayload: references(),
          citationAnalysisPayload: citation(),
        },
      ],
      timestamp: "2026-09-07T00:00:00.000Z",
    });
    assert.lengthOf(result.rawReferences, 1);
    assert.strictEqual(
      result.rawReferences[0].sourceReferenceId,
      sourceReferenceId,
    );
    assert.deepEqual(JSON.parse(result.rawReferences[0].rolesJson || "[]"), [
      { role: "background", count: 1 },
    ]);
    assert.match(result.rawReferences[0].canonicalReferenceId || "", /^cref:/);
  });

  it("rejects positional and wrapper citation aliases at the Application boundary", function () {
    const legacy = {
      items: [{ reference_index: 0, role: "background" }],
    };
    assert.throws(() =>
      projectSynthesisReferencePayloads({
        items: [item],
        sources: [
          {
            paperRef: item.paperRef,
            referencesArtifactHash: "sha256:references",
            referencesPayload: references(),
            citationAnalysisPayload: legacy,
          },
        ],
        timestamp: "2026-09-07T00:00:00.000Z",
      }),
    );
  });

  it("rejects a Citation runtime basis that no longer matches References", function () {
    assert.doesNotThrow(() =>
      projectSynthesisReferencePayloads({
        items: [item],
        sources: [
          {
            paperRef: item.paperRef,
            referencesArtifactHash: "sha256:references",
            referencesPayload: references(),
            citationAnalysisPayload: citation(),
            citationReferencesBasis:
              hashSynthesisContractCanonicalJson(references()),
          },
        ],
        timestamp: "2026-09-07T00:00:00.000Z",
      }),
    );
    assert.throws(() =>
      projectSynthesisReferencePayloads({
        items: [item],
        sources: [
          {
            paperRef: item.paperRef,
            referencesArtifactHash: "sha256:references",
            referencesPayload: references(),
            citationAnalysisPayload: citation(),
            citationReferencesBasis: "sha256:stale",
          },
        ],
        timestamp: "2026-09-07T00:00:00.000Z",
      }),
    );
  });
});
