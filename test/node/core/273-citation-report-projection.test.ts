import { strict as assert } from "node:assert";

import { renderCitationAnalysisMarkdown } from "../../../packages/synthesis-application/src/referenceProjection";
import { formatResearchBundleArtifact } from "../../../src/modules/researchBundleService";

const firstId = "550e8400-e29b-41d4-a716-446655440000";
const secondId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function references() {
  return {
    schema: "source_reference_artifact.v1",
    references: [
      {
        sourceReferenceId: firstId,
        extraction: { raw: "Doe, J. (2024). Context.", confidence: 0.9 },
        bibliography: {
          title: "Context paper",
          authors: ["Doe, Jane"],
          year: 2024,
        },
        matching: { citekey: "doe2024" },
      },
      {
        sourceReferenceId: secondId,
        extraction: null,
        bibliography: {
          title: "Tool paper",
          authors: ["Roe, John"],
          year: 2025,
        },
        matching: {},
      },
    ],
  };
}

function citation() {
  return {
    schema: "citation_analysis_artifact.v1",
    meta: {
      language: "en-US",
      scope: {
        section_title: "Introduction",
        line_start: 4,
        line_end: 19,
      },
      scope_source: "db",
      scope_decision: {
        selection_reason: "first stable section",
        covered_sections: ["Introduction"],
        fallback_from: null,
        fallback_reason: null,
      },
      mapping_reliability: "normal",
      reference_extraction: { status: "completed" },
    },
    summary: "The review compares context and tooling.",
    timeline: {
      early: {
        summary: "Early work established the context.",
        sourceReferenceIds: [firstId],
      },
      mid: { summary: "", sourceReferenceIds: [] },
      recent: {
        summary: "Recent tooling is available.",
        sourceReferenceIds: [secondId],
      },
    },
    items: [
      {
        sourceReferenceId: firstId,
        function: "background",
        role_in_context: "sets context",
        topic: "context",
        usage: "motivation",
        keywords: ["context"],
        summary: "Provides the context.",
        key_reference_reason: "central background source",
        confidence: 0.8,
        mentions: [
          {
            mention_id: "mention-1",
            marker: "[12]",
            style: "numeric",
            line_start: 8,
            line_end: 8,
            snippet: "prior work",
            ref_number_hint: 12,
            year_hint: 2024,
            surname_hint: "Doe",
            citation_label_hint: null,
            citekey_hint: "doe2024",
          },
        ],
      },
      {
        sourceReferenceId: secondId,
        function: "tooling",
        role_in_context: "implementation dependency",
        topic: null,
        usage: null,
        keywords: [],
        summary: "Provides the tool.",
        key_reference_reason: null,
        confidence: null,
        mentions: [
          {
            mention_id: "mention-2",
            marker: "(Roe, 2025)",
            style: "author_year",
            line_start: 16,
            line_end: 16,
            snippet: "tooling",
            ref_number_hint: null,
            year_hint: 2025,
            surname_hint: "Roe",
            citation_label_hint: null,
            citekey_hint: null,
          },
        ],
      },
    ],
    unresolved: [
      {
        mention_id: "mention-3",
        marker: "[?]",
        style: "numeric",
        line_start: 18,
        line_end: 18,
        snippet: "unresolved source",
        ref_number_hint: null,
        year_hint: null,
        surname_hint: null,
        citation_label_hint: null,
        citekey_hint: null,
        reason: "no matching reference",
      },
    ],
  };
}

describe("Synthesis Citation Markdown projection", function () {
  it("renders the complete canonical meta, evidence, timeline, and unresolved facts", function () {
    const markdown = renderCitationAnalysisMarkdown({
      citation: citation(),
      references: references(),
    });
    assert.match(markdown, /## Citation Signals In Review Scope/);
    assert.match(markdown, /The review compares context and tooling\./);
    assert.match(markdown, /- Section: Introduction/);
    assert.match(markdown, /- Lines: 4-19/);
    assert.match(markdown, /### Key References/);
    assert.match(
      markdown,
      /\[12\] Doe, Jane, 2024: Context paper \(Background\)/,
    );
    assert.match(markdown, /### By Function/);
    assert.match(markdown, /#### Tooling/);
    assert.match(markdown, /### Timeline Analysis/);
    assert.match(markdown, /#### Recent/);
    assert.match(markdown, /\[AY-1\] Roe, John, 2025: Tool paper/);
    assert.match(markdown, /### Unmapped Mentions/);
    assert.match(
      markdown,
      /- \[\?\] \(no matching reference\): unresolved source/,
    );
  });

  it("renders the same canonical semantics in Chinese without reading report_md", function () {
    const value = citation();
    value.meta.language = "zh-CN";
    const markdown = renderCitationAnalysisMarkdown({
      citation: value,
      references: references(),
    });
    assert.match(markdown, /## 文献综述章节引文线索/);
    assert.match(markdown, /### 总体总结/);
    assert.doesNotMatch(markdown, /report_md/);
  });

  it("lets Research Bundle use the Application projection for canonical Citation", function () {
    const result = formatResearchBundleArtifact(
      {
        artifact_type: "citation_analysis",
        status: "available",
        payload: citation(),
      },
      { referencesPayload: references() },
    );
    assert.ok(result);
    assert.match(result.text, /## Citation Signals In Review Scope/);
    assert.doesNotMatch(result.text, /report_md/);
  });
});
