export function largeManagedCitation() {
  const references = {
    schema: "source_reference_artifact.v1",
    references: Array.from({ length: 350 }, (_, index) => ({
      sourceReferenceId: `source-${index}`,
      extraction: null,
      bibliography: { title: "r".repeat(600), authors: [], year: null },
      matching: {},
    })),
  };
  const citation = {
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
    items: references.references.map(({ sourceReferenceId }) => ({
      sourceReferenceId,
      function: null,
      role_in_context: null,
      topic: null,
      usage: null,
      keywords: [],
      summary: "x".repeat(650),
      key_reference_reason: null,
      confidence: null,
      mentions: [],
    })),
    unresolved: [],
  };
  return { references, citation };
}
