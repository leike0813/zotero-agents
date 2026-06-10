import { assert } from "chai";
import {
  buildReviewWorkflowInput,
  projectCitationGraphSliceForReview,
} from "../../src/modules/synthesis/reviewInput";
import type { CitationGraph } from "../../src/modules/synthesis/citationGraph";

const graph: CitationGraph = {
  schema_id: "synthesis.unified_citation_graph",
  schema_version: "1.0.0",
  graph_hash:
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  nodes: [
    {
      node_id: "zotero:item:A",
      kind: "library_paper",
      target_state: "library",
      item_key: "A",
      library_id: 1,
      aliases: [],
      title: "Alpha",
    },
    {
      node_id: "zotero:item:B",
      kind: "library_paper",
      target_state: "library",
      item_key: "B",
      library_id: 1,
      aliases: [],
      title: "Beta",
    },
    {
      node_id: "zotero:item:C",
      kind: "library_paper",
      target_state: "library",
      item_key: "C",
      library_id: 1,
      aliases: [],
      title: "Gamma",
    },
  ],
  edges: [
    {
      edge_id: "edge-a-b",
      source: "zotero:item:A",
      target: "zotero:item:B",
      kind: "citation",
      mention_count: 1,
      primary_role: "background",
      aux_roles: [],
      role_evidence: [{ role: "background", count: 1 }],
      source_refs: ["zotero:item:A#ref:0"],
    },
    {
      edge_id: "edge-c-b",
      source: "zotero:item:C",
      target: "zotero:item:B",
      kind: "citation",
      mention_count: 1,
      primary_role: "method",
      aux_roles: [],
      role_evidence: [{ role: "method", count: 1 }],
      source_refs: ["zotero:item:C#ref:0"],
    },
  ],
  diagnostics: {
    promotions: [],
    duplicates: [],
  },
};

describe("Synthesis review input workflow DTO", function () {
  it("builds a normalized review input DTO from topic synthesis assets", function () {
    const input = buildReviewWorkflowInput({
      topic: {
        topic_id: "topic-alpha",
        title: "Alpha Topic",
        markdown: "# Alpha\n\nTimeline section",
        timeline: "Timeline section",
        metadata: { artifact_hash: "sha256:topic" },
        topic_definition: { id: "topic-alpha" },
        resolver: { mode: "tag_query", query: "topic:alpha" },
        structured_topic: {
          artifact: {
            schema_id: "synthesis.topic_synthesis_artifact",
            claims: [
              { id: "claim-1", text: "Alpha claim", evidence_refs: ["ev-a"] },
            ],
            timeline_events: {
              summary: { text: "Alpha timeline summary." },
              events: [
                { id: "event-1", year: "2024", evidence_refs: ["ev-a"] },
              ],
            },
            paper_evidence: [
              {
                id: "ev-a",
                paper_ref: "1:A",
                digest_ref: {
                  payload_type: "digest-markdown",
                  payload_hash: "sha256:digest-a",
                },
              },
            ],
            external_literature_analysis: { summary: "External context." },
            coverage: { status: "partial" },
            future_directions: [
              {
                id: "future-1",
                title: "Future direction.",
                source_paper_refs: ["1:A"],
              },
            ],
          },
          manifest: { schema_id: "synthesis.topic_analysis_manifest" },
          metadata: { artifact_hash: "sha256:topic" },
        },
      },
      resolved_paper_set: {
        papers: [
          { paper_ref: "1:B", match_reasons: ["tag"] },
          { paper_ref: "1:A", match_reasons: ["tag"] },
        ],
      },
      registry_rows: [
        {
          paper_ref: "1:A",
          title: "Alpha",
          artifactCoverage: "complete",
          missing_artifacts: [],
        },
        {
          paper_ref: "1:B",
          title: "Beta",
          artifactCoverage: "partial",
          missing_artifacts: ["citation_analysis"],
        },
      ],
      citation_graph: graph,
    });

    assert.equal(input.kind, "synthesis.review_workflow_input");
    assert.equal(input.topic.topic_id, "topic-alpha");
    assert.deepEqual(
      input.resolved_paper_set.papers.map((paper) => paper.paper_ref),
      ["1:A", "1:B"],
    );
    assert.deepEqual(
      input.registry_artifact_coverage.rows.map((row) => row.paper_ref),
      ["1:A", "1:B"],
    );
    assert.deepEqual(
      input.citation_graph_slice.edges.map((edge) => edge.edge_id),
      ["edge-a-b"],
    );
    assert.equal(input.topic_timeline.content, "Timeline section");
    assert.equal(input.topic.markdown, "# Alpha\n\nTimeline section");
    assert.deepEqual(
      input.structured_topic?.claims.map((claim: any) => claim.id),
      ["claim-1"],
    );
    assert.deepEqual(
      (input.structured_topic?.timeline_events as any).events.map(
        (event: any) => event.id,
      ),
      ["event-1"],
    );
    assert.deepEqual(
      input.structured_topic?.paper_evidence.map(
        (evidence: any) => evidence.id,
      ),
      ["ev-a"],
    );
    assert.equal(
      (input.structured_topic?.external_literature_analysis as any).summary,
      "External context.",
    );
    assert.equal((input.structured_topic?.coverage as any).status, "partial");
    assert.deepEqual(
      input.structured_topic?.future_directions.map(
        (direction: any) => direction.id,
      ),
      ["future-1"],
    );
    assert.notInclude(
      JSON.stringify(input.structured_topic),
      "digest_markdown",
    );
  });

  it("reports missing artifacts as diagnostics without blocking DTO construction", function () {
    const input = buildReviewWorkflowInput({
      topic: {
        topic_id: "topic-alpha",
        title: "Alpha Topic",
        markdown: "# Alpha",
      },
      resolved_paper_set: {
        papers: [{ paper_ref: "1:B" }],
      },
      registry_rows: [
        {
          paper_ref: "1:B",
          title: "Beta",
          artifactCoverage: "partial",
          missing_artifacts: ["digest", "citation_analysis"],
        },
      ],
      citation_graph: graph,
    });

    assert.deepEqual(
      input.missing_artifact_diagnostics.map((entry) => entry.artifact_type),
      ["citation_analysis", "digest"],
    );
    assert.equal(input.diagnostics.blocking.length, 0);
  });

  it("excludes later-phase graph fields from the DTO", function () {
    const input = buildReviewWorkflowInput({
      topic: {
        topic_id: "topic-alpha",
        title: "Alpha Topic",
        markdown: "# Alpha",
      },
      resolved_paper_set: {
        papers: [{ paper_ref: "1:A" }],
        method_lineage_graph: { nodes: [] },
        claim_conflict_graph: { nodes: [] },
        research_gap_graph: { nodes: [] },
      },
      registry_rows: [],
      citation_graph: {
        ...graph,
        method_lineage_graph: { nodes: [] },
        claim_conflict_graph: { nodes: [] },
      } as unknown as CitationGraph,
    });

    assert.notProperty(input as any, "method_lineage_graph");
    assert.notProperty(input as any, "claim_conflict_graph");
    assert.notProperty(input as any, "research_gap_graph");
    assert.notProperty(
      input.citation_graph_slice as any,
      "method_lineage_graph",
    );
  });

  it("projects citation graph slices for resolved library papers", function () {
    const slice = projectCitationGraphSliceForReview({
      graph,
      paperRefs: ["1:A", "1:B"],
    });

    assert.deepEqual(
      slice.nodes.map((node) => node.node_id),
      ["zotero:item:A", "zotero:item:B"],
    );
    assert.deepEqual(
      slice.edges.map((edge) => edge.edge_id),
      ["edge-a-b"],
    );
  });
});
