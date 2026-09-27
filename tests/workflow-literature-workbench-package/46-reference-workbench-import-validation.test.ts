import { assert } from "chai";
import {
  parseImportedCitationArtifact,
  parseImportedReferencesArtifact,
  validateImportedCitationPayload,
  validateImportedReferencesPayload,
} from "../../workflows_builtin/literature-workbench-package/lib/importSchemas.mjs";

const references = {
  schema: "source_reference_artifact.v1",
  references: [
    {
      sourceReferenceId: "60ad30f3-109e-44a7-a94a-751c4608a77d",
      extraction: {
        raw: "Alice Zhang. Structured Reference. 2024.",
        confidence: 0.92,
      },
      bibliography: {
        title: "Structured Reference",
        authors: ["Alice Zhang"],
        year: 2024,
      },
      matching: { DOI: "10.1000/example" },
    },
  ],
};

const citation = {
  schema: "citation_analysis_artifact.v1",
  meta: {
    language: "en",
    scope: { section_title: "Results", line_start: 1, line_end: 8 },
    scope_source: null,
    scope_decision: {
      selection_reason: null,
      covered_sections: ["Results"],
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

describe("literature-workbench import schema validation", function () {
  it("retains the complete canonical artifact and explicit source identity", function () {
    assert.isTrue(validateImportedReferencesPayload(references).valid);
    assert.deepEqual(parseImportedReferencesArtifact(references), references);
    assert.isTrue(validateImportedCitationPayload(citation).valid);
    assert.deepEqual(parseImportedCitationArtifact(citation), citation);
  });

  for (const legacy of [
    references.references,
    { items: references.references },
    {
      version: 1,
      entry: "references.json",
      format: "json",
      references: references.references,
    },
  ]) {
    it("requires explicit migration for an alternate References shape", function () {
      assert.isFalse(validateImportedReferencesPayload(legacy).valid);
      assert.throws(() => parseImportedReferencesArtifact(legacy));
    });
  }

  it("rejects nested aliases, invalid confidence, and wrong schema versions", function () {
    for (const patch of [
      { matching: { doi: "10.1000/example" } },
      { extraction: { raw: "reference", confidence: 2 } },
      { bibliography: { title: "Reference", authors: [], year: "2024" } },
    ]) {
      assert.isFalse(
        validateImportedReferencesPayload({
          ...references,
          references: [{ ...references.references[0], ...patch }],
        }).valid,
      );
    }
    assert.isFalse(
      validateImportedReferencesPayload({ ...references, schema: "wrong.v1" })
        .valid,
    );
  });

  it("rejects writable derived Citation fields and legacy wrappers", function () {
    for (const input of [
      { citation_analysis: citation },
      { ...citation, report_md: "derived" },
      { ...citation, referencesBasis: "caller-basis" },
    ]) {
      assert.isFalse(validateImportedCitationPayload(input).valid);
      assert.throws(() => parseImportedCitationArtifact(input));
    }
  });
});
