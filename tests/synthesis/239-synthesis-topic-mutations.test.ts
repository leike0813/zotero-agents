import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDefaultSynthesisUiState } from "../../src/modules/synthesis/uiModel";
import { toSynthesisWorkbenchReadState } from "../../src/modules/synthesisClient/workbenchUiAdapter";
import type {
  SynthesisTopicApplyRequest,
  SynthesisTopicPlanActionDto,
  SynthesisTopicPlanApplyRequest,
  SynthesisTopicRelationProposalDto,
} from "../../packages/synthesis-contracts/src";
import {
  SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE as EXECUTABLE,
  startSynthesisProductionRouteHarness,
  type SynthesisProductionRouteHarness,
} from "../helpers/synthesisProductionRouteHarness";

const SOURCE_PAPER_REF = "1:MUTATION";

function workbenchState() {
  return toSynthesisWorkbenchReadState(createDefaultSynthesisUiState());
}

function planRequest(args: {
  baseGraphHash: string;
  libraryIndexHash: string;
  topicActions: SynthesisTopicPlanActionDto[];
}): SynthesisTopicPlanApplyRequest {
  return {
    kind: "topic_plan",
    operation: "reconcile",
    base_graph_hash: args.baseGraphHash,
    library_index_hash: args.libraryIndexHash,
    topic_actions: args.topicActions,
    relation_proposals: [] as SynthesisTopicRelationProposalDto[],
    recommended_updates: [],
  };
}

/**
 * Topic apply fixture: one materialized Topic carrying three Concept cards
 * (two committed, one pending review) plus the requested Topic Graph relation
 * proposals. The artifact contract requires every section, but the content
 * stays bounded because the observable contract is Concept and Topic Graph
 * mutation state, not Topic prose.
 */
function topicApplyRequest(
  topicId: string,
  relationProposals: Array<Record<string, unknown>> = [],
  opts: {
    operation?: "create" | "update_full" | "update_patch";
    baseHashes?: Record<string, string>;
    overview?: string;
  } = {},
): SynthesisTopicApplyRequest {
  const title = "Mutation Topic";
  const definition = "A durable Topic mutation fixture.";
  const operation = opts.operation ?? "create";
  const sections: Record<string, unknown> = {
    topic: {
      id: topicId,
      title,
      definition,
      discipline: "Information Science",
      scope: "Topic mutation coverage",
    },
    summary: { overview: opts.overview ?? "A bounded mutation fixture." },
    taxonomy: {
      summary: { text: "One bounded route." },
      nodes: [
        {
          id: "route:mutation",
          definition: "Durable mutation route",
          core_problem: "Preserve mutation facts",
          mechanism: "Transactional repository and canonical storage",
          source_paper_refs: [SOURCE_PAPER_REF],
          strengths: ["durable"],
          limitations: ["fixture scope"],
          maturity: "validated",
        },
      ],
    },
    improvement_dimensions: [
      {
        id: "dimension:mutation",
        analysis: "Mutations preserve committed and refused state.",
        source_paper_refs: [SOURCE_PAPER_REF],
      },
    ],
    claims: [
      {
        id: "claim:mutation",
        text: "Topic mutation state is durable.",
        analysis: "Repository and canonical state survive process reopen.",
        scope: "Mutation fixture",
        source_paper_refs: [SOURCE_PAPER_REF],
      },
    ],
    timeline_events: {
      summary: { text: "Create, decide, and reopen." },
      events: [
        {
          id: "event:mutation",
          description: "The mutation is exercised through the public route.",
          phase: "validation",
          source_paper_refs: [SOURCE_PAPER_REF],
        },
      ],
    },
    source_papers: [
      {
        paper_ref: SOURCE_PAPER_REF,
        digest_ref: {
          paper_ref: SOURCE_PAPER_REF,
          payload_type: "digest-markdown",
        },
      },
    ],
    debates: [],
    statistics: {
      paper_count: 1,
      time_span: { start_year: 2026, end_year: 2026 },
      route_coverage: "One fixture route",
      coverage_verdict: "partial",
    },
    coverage: {
      coverage_verdict: "partial",
      coverage_reason: "One bounded fixture source.",
      coverage_caveats: ["Fixture scope."],
      external_context_summary: "Outside this fixture.",
      suggested_collection_directions: [],
    },
    future_directions: [
      { id: "future:mutation", source_paper_refs: [SOURCE_PAPER_REF] },
    ],
    review_outline: {
      topic_importance: "Durable mutations protect user-controlled state.",
      writing_strategies: [
        {
          id: "strategy:mutation",
          title: "Mutation",
          review_thesis: "State remains coherent across decisions.",
          writing_strategy: "Follow the transitions in storage order.",
          best_for: "Persistence review",
          risks: "Fixture scope",
          section_plan: ["Create", "Decide", "Reopen"],
          source_paper_refs: [SOURCE_PAPER_REF],
        },
      ],
      recommended_strategy_id: "strategy:mutation",
    },
    synthesis_report: {
      title: "Mutation Route",
      source_section_chapters: {
        research_routes: "taxonomy.summary",
        historical_progression: "timeline_events.summary",
      },
      body: "This bounded report records a Topic mutation lifecycle through the real authenticated sidecar route. It creates a durable Topic artifact, commits Concept and Topic Graph decisions against the identifiers the public surface returned, refuses one stale revision, and reopens the process against the same repository and canonical root to confirm that every committed decision survived. The fixture keeps its literature claims narrow because the observable contract under test is storage ownership and transition safety rather than synthesis prose quality.",
    },
    source_artifacts: [
      {
        paper_ref: SOURCE_PAPER_REF,
        artifact_type: "digest",
        payload_type: "digest-markdown",
        status: "available",
        hash: "sha256:mutation-fixture-digest",
      },
      {
        paper_ref: SOURCE_PAPER_REF,
        artifact_type: "references",
        payload_type: "references-json",
        status: "available",
        hash: "sha256:mutation-fixture-references",
      },
      {
        paper_ref: SOURCE_PAPER_REF,
        artifact_type: "citation_analysis",
        payload_type: "citation-analysis-json",
        status: "available",
        hash: "sha256:mutation-fixture-citation-analysis",
      },
    ],
    diagnostics: { warnings: [] },
  };
  const conceptCard = (label: string, confidence: "high" | "low") => ({
    label,
    aliases: [],
    concept_type: "method",
    domain: "information-science",
    short_definition: `Short definition for ${label}.`,
    definition: `Definition for ${label}.`,
    topic_relevance: "Supports the Topic mutation fixture.",
    confidence,
    evidence: [{ paper_ref: SOURCE_PAPER_REF }],
    relations: [],
  });
  const sidecars: Record<string, unknown> = {
    concept_cards_proposal: {
      schema_id: "synthesis.concept_cards_proposal",
      schema_version: "1.0.0",
      cards: [
        conceptCard("Mutation concept", "high"),
        conceptCard("Neighbor concept", "high"),
        conceptCard("Pending review concept", "low"),
      ],
    },
    topic_graph_relation_proposals: {
      schema_id: "synthesis.topic_graph_relation_proposals",
      proposals: relationProposals,
    },
    topic_interest_metadata: {
      schema: "topic_interest_metadata.v1",
      topic_id: topicId,
      include_terms: ["topic mutation"],
    },
    prospective_topic_relation_proposals: {
      schema_id: "synthesis.prospective_topic_relation_proposals",
      proposals: [],
    },
  };
  const sectionAssets = Object.entries(sections).map(([name, value]) => ({
    id: `asset/section/${name}`,
    mediaType: "application/json" as const,
    text: JSON.stringify(value),
  }));
  const sidecarAssets = Object.entries(sidecars).map(([name, value]) => ({
    id: `asset/sidecar/${name}`,
    mediaType: "application/json" as const,
    text: JSON.stringify(value),
  }));
  return {
    bundle: {
      kind: "topic_synthesis",
      operation,
      mode: "create",
      language: "en",
      topic_definition: { id: topicId, title, definition },
      artifact_manifest_path: "asset/artifact-manifest",
      ...(opts.baseHashes ? { base_hashes: opts.baseHashes } : {}),
      artifact_metadata: {
        runtime: "split-skill",
        topic_id: topicId,
        depends_on: {
          papers: [SOURCE_PAPER_REF],
          artifacts: ["digest-markdown"],
        },
      },
    },
    assets: [
      {
        id: "asset/artifact-manifest",
        mediaType: "application/json",
        text: JSON.stringify({
          topic_analysis: "asset/manifest",
          resolver_manifest: "asset/resolver",
        }),
      },
      {
        id: "asset/manifest",
        mediaType: "application/json",
        text: JSON.stringify({
          schema_id: "synthesis.topic_analysis_manifest",
          schema_version: "3.0.0",
          operation: "create",
          topic_id: topicId,
          language: "en",
          ...(operation === "update_patch"
            ? {
                patch: {
                  sections: {
                    summary: {
                      path: "asset/section/summary",
                      content_type: "json",
                    },
                  },
                },
              }
            : {
                sections: Object.fromEntries(
                  Object.keys(sections).map((name) => [
                    name,
                    { path: `asset/section/${name}`, content_type: "json" },
                  ]),
                ),
              }),
          sidecars:
            operation === "update_patch"
              ? {}
              : Object.fromEntries(
                  Object.keys(sidecars).map((name) => [
                    name,
                    {
                      path: `asset/sidecar/${name}`,
                      content_type: "json",
                      schema_id: `fixture.${name}`,
                    },
                  ]),
                ),
        }),
      },
      ...(operation === "update_patch"
        ? sectionAssets.filter((asset) => asset.id === "asset/section/summary")
        : sectionAssets),
      {
        id: "asset/resolver",
        mediaType: "application/json",
        text: JSON.stringify({
          resolver: {
            paper_refs: [SOURCE_PAPER_REF],
            collection_key: [],
            combine: "union",
          },
          resolved_paper_set: { papers: [{ paper_ref: SOURCE_PAPER_REF }] },
        }),
      },
      ...(operation === "update_patch" ? [] : sidecarAssets),
    ],
  } as unknown as SynthesisTopicApplyRequest;
}

async function planningBasis(harness: SynthesisProductionRouteHarness) {
  const context = await harness.client.topics.getPlanningContext();
  return {
    baseGraphHash: String(context.topic_graph.manifest.manifest_hash ?? ""),
    libraryIndexHash: String(context.library.index_hash),
  };
}

async function plannedNode(
  harness: SynthesisProductionRouteHarness,
  topicId: string,
) {
  const context = await harness.client.topics.getPlanningContext();
  const nodes = context.topic_graph.nodes as Array<Record<string, any>>;
  return nodes.find((node) => node.topic_id === topicId);
}

const TERMINAL_MAINTENANCE = new Set([
  "completed",
  "failed",
  "canceled",
  "timed_out",
  "not_found",
]);

async function settleMaintenance(
  harness: SynthesisProductionRouteHarness,
  operationId: string,
) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const operation = await harness.client.maintenance.getOperation({
      operation_id: operationId,
    });
    if (TERMINAL_MAINTENANCE.has(operation.status)) return operation;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail("the maintenance operation never reached a terminal status");
}

describe("Synthesis topic mutation routes", function () {
  this.timeout(180_000);

  it("commits a valid topic plan, refuses a stale planned revision, and keeps the planned topic across reopen", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-plan-"));
    const plannedId = "topic:planned-alpha";
    let harness = await startSynthesisProductionRouteHarness({
      id: "topic-plan-apply",
      root,
    });
    try {
      const seeded =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest("topic-plan-seed"),
        );
      assert.equal(seeded.status, "persisted");
      const basis = await planningBasis(harness);
      assert.isNotEmpty(basis.baseGraphHash, "planning graph hash");
      assert.isNotEmpty(basis.libraryIndexHash, "planning library hash");

      const created = await harness.client.workflowApply.applyTopicPlan(
        planRequest({
          ...basis,
          topicActions: [
            {
              action: "create",
              topic_id: plannedId,
              title: "Planned Alpha",
              definition: "First planned definition.",
              resolver: { paper_refs: [SOURCE_PAPER_REF], combine: "union" },
              aliases: ["Planned alias"],
            },
          ],
        }),
      );
      assert.equal(created.status, "persisted");
      assert.isNotNull(created.receipt);
      assert.equal(created.coverage_stale, false);

      const createdNode = await plannedNode(harness, plannedId);
      assert.deepInclude(createdNode ?? {}, {
        topic_id: plannedId,
        title: "Planned Alpha",
        definition: "First planned definition.",
        node_type: "placeholder",
        definition_status: "placeholder",
      });
      assert.deepInclude(createdNode?.planning ?? {}, {
        lifecycle: "planned",
        revision: 1,
      });
      const plannedOptions = await harness.client.topics.listWorkflowOptions({
        filter: "planned",
      });
      const plannedOption = plannedOptions.options.find(
        (option) => option.value === plannedId,
      );
      assert.deepInclude(plannedOption?.meta ?? {}, {
        kind: "synthesis.planned-topic",
        lifecycle: "planned",
        revision: 1,
      });

      // A plan stays a plan: it materializes no Topic and no paper membership.
      const listed = await harness.client.topics.list({
        cursor: "",
        limit: 25,
      });
      assert.notInclude(
        listed.topics.map((topic) => topic.topic_id),
        plannedId,
      );
      const found = await harness.client.topics.findByPaperRef({
        paper_refs: [SOURCE_PAPER_REF],
      });
      assert.notInclude(
        found.topics.map((row) => row.topic_id),
        plannedId,
      );

      const updated = await harness.client.workflowApply.applyTopicPlan(
        planRequest({
          ...(await planningBasis(harness)),
          topicActions: [
            {
              action: "update",
              topic_id: plannedId,
              definition: "Second planned definition.",
              revision: 1,
            },
          ],
        }),
      );
      assert.equal(updated.status, "persisted");
      const updatedNode = await plannedNode(harness, plannedId);
      assert.equal(updatedNode?.definition, "Second planned definition.");
      assert.equal(updatedNode?.planning.revision, 2);
      assert.equal(updatedNode?.title, "Planned Alpha", "title is inherited");

      const stale = await harness.client.workflowApply.applyTopicPlan(
        planRequest({
          ...(await planningBasis(harness)),
          topicActions: [
            {
              action: "update",
              topic_id: plannedId,
              definition: "Stale definition.",
              revision: 1,
            },
          ],
        }),
      );
      assert.equal(stale.status, "conflict");
      assert.deepEqual(
        stale.diagnostics.map((diagnostic) => diagnostic.code),
        ["topic_revision_conflict"],
      );
      assert.isNull(stale.receipt, "a refused plan commits nothing");
      const afterConflict = await plannedNode(harness, plannedId);
      assert.equal(afterConflict?.definition, "Second planned definition.");
      assert.equal(afterConflict?.planning.revision, 2);
    } finally {
      await harness.stop();
    }

    harness = await startSynthesisProductionRouteHarness({
      id: "topic-plan-reopen",
      root,
    });
    try {
      const reopened = await plannedNode(harness, plannedId);
      assert.deepInclude(reopened?.planning ?? {}, {
        lifecycle: "planned",
        revision: 2,
      });
      assert.equal(reopened?.definition, "Second planned definition.");
      const reopenedOptions = await harness.client.topics.listWorkflowOptions({
        filter: "planned",
      });
      assert.include(
        reopenedOptions.options.map((option) => option.value),
        plannedId,
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("commits Concept patch, review decision and delete against real concept ids", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-concept-"));
    const harness = await startSynthesisProductionRouteHarness({
      id: "concept-mutation",
      root,
    });
    try {
      const applied =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest("topic-concept-mutation"),
        );
      assert.equal(applied.status, "persisted");

      const state = workbenchState();
      const initial = await harness.client.workbench.readSurface({
        surface: "concepts",
        state,
      });
      const concept = initial.concepts.concepts.find(
        (entry) => entry.label === "Mutation concept",
      );
      const neighbor = initial.concepts.concepts.find(
        (entry) => entry.label === "Neighbor concept",
      );
      assert.isDefined(concept, "committed concept is projected");
      assert.isDefined(neighbor, "neighbor concept is projected");
      assert.lengthOf(initial.concepts.reviewItems, 1);
      const review = initial.concepts.reviewItems[0];
      assert.equal(review.status, "open");
      assert.equal(review.label, "Pending review concept");

      const patched = await harness.client.concepts.updateConceptDisplayText({
        conceptId: concept.concept_id,
        fields: { short_definition: "Patched short definition." },
      });
      assert.equal(patched.status, "committed");
      assert.include(patched.changedConceptIds, concept.concept_id);

      const afterPatch = await harness.client.workbench.readSurface({
        surface: "concepts",
        state,
      });
      const patchedConcept = afterPatch.concepts.concepts.find(
        (entry) => entry.concept_id === concept.concept_id,
      );
      assert.deepInclude(patchedConcept ?? {}, {
        label: "Mutation concept",
        concept_type: "method",
        domain: "information-science",
        short_definition: "Patched short definition.",
        definition: "Definition for Mutation concept.",
      });

      const decided = await harness.client.concepts.applyConceptReviewAction({
        reviewId: review.review_id,
        action: "reject",
      });
      assert.equal(decided.status, "committed");
      assert.include(decided.reviewIds, review.review_id);
      const openReviews = await harness.client.workbench.readSurface({
        surface: "review",
        state: {
          ...state,
          reviews: { ...state.reviews, activeTab: "concepts", status: "open" },
        },
      });
      assert.lengthOf(openReviews.concepts.reviewItems, 0);
      const rejectedReviews = await harness.client.workbench.readSurface({
        surface: "review",
        state: {
          ...state,
          reviews: {
            ...state.reviews,
            activeTab: "concepts",
            status: "rejected",
          },
        },
      });
      assert.equal(
        rejectedReviews.concepts.reviewItems.find(
          (item) => item.review_id === review.review_id,
        )?.status,
        "rejected",
      );

      const deleted = await harness.client.concepts.deleteConceptEntries({
        conceptIds: [concept.concept_id],
      });
      assert.equal(deleted.status, "committed");
      const afterDelete = await harness.client.workbench.readSurface({
        surface: "concepts",
        state,
      });
      assert.notInclude(
        afterDelete.concepts.concepts.map((entry) => entry.concept_id),
        concept.concept_id,
      );
      const survivingNeighbor = afterDelete.concepts.concepts.find(
        (entry) => entry.concept_id === neighbor.concept_id,
      );
      assert.deepInclude(survivingNeighbor ?? {}, {
        label: "Neighbor concept",
        short_definition: "Short definition for Neighbor concept.",
      });
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("commits topic graph relation and review decisions against real ids and keeps them across reopen", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-graph-"));
    const topicId = "topic-graph-source";
    const plannedRelated = "topic:planned-related";
    const plannedOverlap = "topic:planned-overlap";
    const plannedBroader = "topic:planned-broader";
    let harness = await startSynthesisProductionRouteHarness({
      id: "topic-graph-mutation",
      root,
    });
    try {
      const seededTopic =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest("topic-graph-seed"),
        );
      assert.equal(seededTopic.status, "persisted");
      const seeded = await harness.client.workflowApply.applyTopicPlan(
        planRequest({
          ...(await planningBasis(harness)),
          topicActions: [
            {
              action: "create",
              topic_id: plannedRelated,
              title: "Planned Related",
              definition: "Relation target for a confirmed edge.",
              resolver: { paper_refs: [SOURCE_PAPER_REF], combine: "union" },
            },
            {
              action: "create",
              topic_id: plannedOverlap,
              title: "Planned Overlap",
              definition: "Relation target for a rejected edge.",
              resolver: { paper_refs: [SOURCE_PAPER_REF], combine: "union" },
            },
            {
              action: "create",
              topic_id: plannedBroader,
              title: "Planned Broader",
              definition: "Relation source for an approved review.",
              resolver: { paper_refs: [SOURCE_PAPER_REF], combine: "union" },
            },
          ],
        }),
      );
      assert.equal(seeded.status, "persisted");
      const applied =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest(topicId, [
            {
              relation_type: "related_topic_candidate",
              target_topic_id: plannedRelated,
              target_topic_title: "Planned Related",
              confidence: 0.8,
              rationale: "Shares the fixture route.",
              source_paper_refs: [SOURCE_PAPER_REF],
            },
            {
              relation_type: "overlap_topic_candidate",
              target_topic_id: plannedOverlap,
              target_topic_title: "Planned Overlap",
              confidence: 0.7,
              provenance: ["Shares overlapping evidence."],
              source_paper_refs: [SOURCE_PAPER_REF],
            },
            {
              relation_type: "target_is_broader_topic_candidate",
              target_topic_id: plannedBroader,
              target_topic_title: "Planned Broader",
              confidence: 0.3,
              provenance: ["Broader relation fixture."],
              source_paper_refs: [SOURCE_PAPER_REF],
            },
          ]),
        );
      assert.equal(applied.status, "persisted");

      const state = workbenchState();
      const initial = await harness.client.workbench.readSurface({
        surface: "topics",
        state,
      });
      const relatedEdge = initial.topicGraph.edges.find(
        (edge) => edge.relation === "related_to",
      );
      const overlapEdge = initial.topicGraph.edges.find(
        (edge) => edge.relation === "overlaps_with",
      );
      const graphReview = initial.topicGraph.reviewItems[0];
      assert.deepInclude(relatedEdge ?? {}, {
        relation: "related_to",
        status: "suggested",
      });
      assert.deepInclude(overlapEdge ?? {}, {
        relation: "overlaps_with",
        status: "suggested",
      });
      assert.deepInclude(relatedEdge?.provenance ?? [], {
        quote_or_summary: "Shares the fixture route.",
      });
      assert.deepInclude(graphReview ?? {}, {
        relation: "broader_than",
        status: "open",
        source_topic_id: plannedBroader,
        target_topic_id: topicId,
      });

      const accepted = await harness.client.topicGraph.acceptTopicGraphRelation(
        {
          edgeId: relatedEdge?.edge_id ?? "",
        },
      );
      assert.equal(accepted.status, "committed");
      assert.include(accepted.changedEdgeIds, relatedEdge?.edge_id ?? "");
      const rejected = await harness.client.topicGraph.rejectTopicGraphRelation(
        {
          edgeId: overlapEdge?.edge_id ?? "",
        },
      );
      assert.equal(rejected.status, "committed");
      assert.include(rejected.changedEdgeIds, overlapEdge?.edge_id ?? "");
      const approved =
        await harness.client.topicGraph.applyTopicGraphReviewAction({
          reviewId: graphReview?.review_id ?? "",
          action: "approve_suggested",
        });
      assert.equal(approved.status, "committed");
      assert.include(approved.reviewIds, graphReview?.review_id ?? "");

      const decided = await harness.client.workbench.readSurface({
        surface: "topics",
        state,
      });
      const decidedStatus = (edgeId?: string) =>
        decided.topicGraph.edges.find((edge) => edge.edge_id === edgeId)
          ?.status;
      assert.equal(decidedStatus(relatedEdge?.edge_id), "confirmed");
      assert.equal(decidedStatus(overlapEdge?.edge_id), "rejected");
      assert.equal(
        decided.topicGraph.edges.find(
          (edge) =>
            edge.relation === "broader_than" &&
            edge.source_topic_id === plannedBroader &&
            edge.target_topic_id === topicId,
        )?.status,
        "confirmed",
        "approving a review confirms its relation",
      );
      const openGraphReviews = await harness.client.workbench.readSurface({
        surface: "review",
        state: {
          ...state,
          reviews: {
            ...state.reviews,
            activeTab: "topic_graph",
            status: "open",
          },
        },
      });
      assert.lengthOf(openGraphReviews.topicGraph.reviewItems, 0);
    } finally {
      await harness.stop();
    }

    harness = await startSynthesisProductionRouteHarness({
      id: "topic-graph-reopen",
      root,
    });
    try {
      const reopened = await harness.client.workbench.readSurface({
        surface: "topics",
        state: workbenchState(),
      });
      const reopenedStatuses = reopened.topicGraph.edges.map((edge) => [
        edge.relation,
        edge.status,
      ]);
      assert.deepInclude(reopenedStatuses, ["related_to", "confirmed"]);
      assert.deepInclude(reopenedStatuses, ["overlaps_with", "rejected"]);
      assert.deepInclude(reopenedStatuses, ["broader_than", "confirmed"]);
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("merges a pending Concept into an existing concept and refuses unknown ids without changing facts", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-concept-merge-"));
    const harness = await startSynthesisProductionRouteHarness({
      id: "concept-merge",
      root,
    });
    try {
      const applied =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest("topic-concept-merge"),
        );
      assert.equal(applied.status, "persisted");
      const state = workbenchState();
      const initial = await harness.client.workbench.readSurface({
        surface: "concepts",
        state,
      });
      const target = initial.concepts.concepts.find(
        (entry) => entry.label === "Mutation concept",
      );
      assert.isDefined(target, "committed concept is projected");
      assert.lengthOf(initial.concepts.reviewItems, 1);
      const review = initial.concepts.reviewItems[0];
      assert.equal(review.label, "Pending review concept");

      const merged = await harness.client.concepts.applyConceptReviewAction({
        reviewId: review.review_id,
        action: "merge_into_existing",
        targetConceptId: target.concept_id,
      });
      assert.equal(merged.status, "committed");
      assert.include(merged.changedConceptIds, target.concept_id);
      assert.include(merged.reviewIds, review.review_id);

      const afterMerge = await harness.client.workbench.readSurface({
        surface: "concepts",
        state,
      });
      const mergedAlias = afterMerge.concepts.aliases.find(
        (alias) => alias.alias === "Pending review concept",
      );
      assert.isDefined(mergedAlias, "merged source label becomes an alias");
      assert.equal(mergedAlias?.concept_id, target.concept_id);
      const openAfterMerge = await harness.client.workbench.readSurface({
        surface: "review",
        state: {
          ...state,
          reviews: { ...state.reviews, activeTab: "concepts", status: "open" },
        },
      });
      assert.lengthOf(openAfterMerge.concepts.reviewItems, 0);
      const mergedReview = await harness.client.workbench.readSurface({
        surface: "review",
        state: {
          ...state,
          reviews: { ...state.reviews, activeTab: "concepts", status: "all" },
        },
      });
      assert.equal(
        mergedReview.concepts.reviewItems.find(
          (item) => item.review_id === review.review_id,
        )?.status,
        "merged",
      );

      // Unknown ids are refused and leave every committed fact untouched.
      const factsBefore = {
        targetDefinition: afterMerge.concepts.concepts.find(
          (entry) => entry.concept_id === target.concept_id,
        )?.definition,
        conceptIds: afterMerge.concepts.concepts
          .map((entry) => entry.concept_id)
          .sort(),
        aliasCount: afterMerge.concepts.aliases.length,
      };
      const expectNotFound = async (operation: () => Promise<unknown>) => {
        try {
          await operation();
          assert.fail("an unknown id must be refused");
        } catch (error) {
          assert.equal(
            (error as { details?: { sidecarCode?: string } })?.details
              ?.sidecarCode,
            "not_found",
          );
        }
      };
      await expectNotFound(() =>
        harness.client.concepts.updateConceptDisplayText({
          conceptId: "concept:missing",
          fields: { short_definition: "should not apply" },
        }),
      );
      await expectNotFound(() =>
        harness.client.concepts.deleteConceptEntries({
          conceptIds: ["concept:missing"],
        }),
      );
      await expectNotFound(() =>
        harness.client.topicGraph.acceptTopicGraphRelation({
          edgeId: "edge:missing",
        }),
      );
      const unchanged = await harness.client.workbench.readSurface({
        surface: "concepts",
        state,
      });
      assert.equal(
        unchanged.concepts.concepts.find(
          (entry) => entry.concept_id === target.concept_id,
        )?.definition,
        factsBefore.targetDefinition,
        "unknown ids do not alter the target definition",
      );
      assert.deepEqual(
        unchanged.concepts.concepts.map((entry) => entry.concept_id).sort(),
        factsBefore.conceptIds,
        "unknown ids do not add or remove concepts",
      );
      assert.equal(unchanged.concepts.aliases.length, factsBefore.aliasCount);
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("marks a planned topic stale and back to planned and reads planning context facts", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-plan-stale-"));
    const plannedId = "topic:planned-lifecycle";
    const harness = await startSynthesisProductionRouteHarness({
      id: "plan-stale",
      root,
    });
    try {
      await harness.client.workflowApply.applyTopicSynthesisResult(
        topicApplyRequest("topic-plan-lifecycle-seed"),
      );
      const created = await harness.client.workflowApply.applyTopicPlan(
        planRequest({
          ...(await planningBasis(harness)),
          topicActions: [
            {
              action: "create",
              topic_id: plannedId,
              title: "Planned Lifecycle",
              definition: "Lifecycle fixture definition.",
              resolver: { paper_refs: [SOURCE_PAPER_REF], combine: "union" },
            },
          ],
        }),
      );
      assert.equal(created.status, "persisted");

      const stalePlan = await harness.client.workflowApply.applyTopicPlan(
        planRequest({
          ...(await planningBasis(harness)),
          topicActions: [{ action: "mark_stale", topic_id: plannedId }],
        }),
      );
      assert.equal(stalePlan.status, "persisted");
      const staleNode = await plannedNode(harness, plannedId);
      assert.equal(staleNode?.planning?.lifecycle, "stale");
      assert.equal(staleNode?.definition_status, "stale");
      assert.equal(
        staleNode?.planning?.revision,
        1,
        "stale keeps its revision",
      );
      assert.equal(
        staleNode?.definition,
        "Lifecycle fixture definition.",
        "deprecating preserves the definition",
      );
      const plannedOptions = await harness.client.topics.listWorkflowOptions({
        filter: "planned",
      });
      assert.notInclude(
        plannedOptions.options.map((option) => option.value),
        plannedId,
        "a stale node leaves the planned filter",
      );

      const reactivated = await harness.client.workflowApply.applyTopicPlan(
        planRequest({
          ...(await planningBasis(harness)),
          topicActions: [{ action: "reactivate", topic_id: plannedId }],
        }),
      );
      assert.equal(reactivated.status, "persisted");
      const reactivatedNode = await plannedNode(harness, plannedId);
      assert.equal(reactivatedNode?.planning?.lifecycle, "planned");
      assert.equal(reactivatedNode?.definition_status, "placeholder");
      assert.include(
        (
          await harness.client.topics.listWorkflowOptions({ filter: "planned" })
        ).options.map((option) => option.value),
        plannedId,
      );

      // Planning context projects the planned node and a coherent manifest.
      const context = await harness.client.topics.getPlanningContext();
      assert.equal(context.schema_id, "synthesis.topic_planning_context");
      assert.isNotEmpty(
        (context.topic_graph.manifest as Record<string, any>).manifest_hash,
      );
      const graphNode = (
        context.topic_graph.nodes as Array<Record<string, any>>
      ).find((node) => node.topic_id === plannedId);
      assert.deepInclude(graphNode?.planning ?? {}, {
        lifecycle: "planned",
        revision: 1,
      });
      const topicRow = (context.topics as Array<Record<string, any>>).find(
        (row) => row.topic_id === plannedId,
      );
      assert.equal(topicRow?.node_type, "placeholder");
      assert.equal(topicRow?.planning?.lifecycle, "planned");
      assert.lengthOf(context.topic_graph.reviewItems, 0);
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("updates a Topic in full and by patch, preserving untouched sections and refusing a stale base", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-update-"));
    const topicId = "topic-update";
    const harness = await startSynthesisProductionRouteHarness({
      id: "topic-update",
      root,
    });
    const overview = async () => {
      const context = await harness.client.topics.getContext({
        topicId,
        view: "semantic",
      });
      return context.semantic.summary.overview;
    };
    const claimText = async () => {
      const context = await harness.client.topics.getContext({
        topicId,
        view: "semantic",
      });
      return context.semantic.claims[0].text;
    };
    try {
      const created =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest(topicId),
        );
      assert.equal(created.status, "persisted");
      assert.equal(await overview(), "A bounded mutation fixture.");
      assert.equal(await claimText(), "Topic mutation state is durable.");

      // A stale base must be refused without writing the edited section.
      const stale =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest(topicId, [], {
            operation: "update_full",
            overview: "Refused stale overview.",
            baseHashes: {
              manifest: "sha256:stale-manifest",
              artifact: created.hashes.artifact,
              metadata: created.hashes.metadata,
            },
          }),
        );
      assert.equal(stale.status, "conflict");
      assert.isNotOk(stale.receipt, "a refused update commits nothing");
      assert.equal(
        await overview(),
        "A bounded mutation fixture.",
        "a stale update writes no section",
      );

      // A matching base updates the edited section and preserves the others.
      const updated =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest(topicId, [], {
            operation: "update_full",
            overview: "Updated overview.",
            baseHashes: created.hashes,
          }),
        );
      assert.equal(updated.status, "persisted");
      assert.equal(await overview(), "Updated overview.");
      assert.equal(
        await claimText(),
        "Topic mutation state is durable.",
        "an untouched section survives a full update",
      );

      // A patch touches only the named section and inherits the rest.
      const patched =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest(topicId, [], {
            operation: "update_patch",
            overview: "Patched overview.",
          }),
        );
      assert.equal(patched.status, "persisted");
      assert.equal(await overview(), "Patched overview.");
      assert.equal(
        await claimText(),
        "Topic mutation state is durable.",
        "an untouched section survives a patch",
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("lists, finds and reads a materialized Topic across list, find, semantic context and options", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-query-"));
    const topicId = "topic-query";
    const harness = await startSynthesisProductionRouteHarness({
      id: "topic-query",
      root,
    });
    try {
      const topicIds = [topicId, "topic-query-b", "topic-query-a"];
      for (const id of topicIds) {
        const applied =
          await harness.client.workflowApply.applyTopicSynthesisResult(
            topicApplyRequest(id),
          );
        assert.equal(applied.status, "persisted");
      }
      const listed = await harness.client.topics.list({
        cursor: "",
        limit: 25,
      });
      let cursor = "";
      const pagedIds: string[] = [];
      for (let pageIndex = 0; pageIndex < topicIds.length; pageIndex++) {
        const page = await harness.client.topics.list({ cursor, limit: 1 });
        assert.lengthOf(page.topics, 1);
        assert.equal(page.total, topicIds.length);
        pagedIds.push(page.topics[0].topic_id);
        const hasMore = pageIndex < topicIds.length - 1;
        assert.equal(page.has_more, hasMore);
        if (hasMore) {
          assert.isNotEmpty(page.next_cursor);
          assert.notEqual(page.next_cursor, cursor);
        } else {
          assert.equal(page.next_cursor, "");
        }
        cursor = page.next_cursor;
      }
      assert.sameMembers(pagedIds, topicIds);
      assert.equal(new Set(pagedIds).size, topicIds.length);
      assert.deepEqual(
        pagedIds,
        listed.topics.map((topic) => topic.topic_id),
        "pagination preserves the unpaged ordering",
      );
      for (let index = 1; index < listed.topics.length; index++) {
        const previous = listed.topics[index - 1];
        const current = listed.topics[index];
        assert.isTrue(
          previous.updated_at > current.updated_at ||
            (previous.updated_at === current.updated_at &&
              previous.topic_id < current.topic_id),
          "topics sort by update time descending, then id ascending",
        );
      }
      const row = listed.topics.find((topic) => topic.topic_id === topicId);
      assert.isDefined(row, "a materialized topic is listed");
      assert.equal(row?.paper_count, 1);
      assert.equal(row?.freshness, "fresh");
      assert.equal(row?.missing_sections.length, 0);

      const found = await harness.client.topics.findByPaperRef({
        paper_refs: [SOURCE_PAPER_REF],
      });
      const match = found.topics.find((topic) => topic.topic_id === topicId);
      assert.isDefined(
        match,
        "a materialized topic is found by its source paper",
      );
      assert.deepInclude(match?.matched_paper_refs ?? [], SOURCE_PAPER_REF);

      const context = await harness.client.topics.getContext({
        topicId,
        view: "semantic",
      });
      assert.equal(context.topic_id, topicId);
      assert.equal(context.semantic.topic_definition.title, "Mutation Topic");
      assert.deepInclude(context.semantic.source_papers[0], {
        paper_ref: SOURCE_PAPER_REF,
      });

      const options = await harness.client.topics.listWorkflowOptions({
        filter: "all",
      });
      const option = options.options.find((entry) => entry.value === topicId);
      assert.deepInclude(option?.meta ?? {}, {
        kind: "synthesis.topic",
        topicId,
      });
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("projects contract-shaped four-view Topic context and a report through the public route", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-context-"));
    const topicId = "topic-context";
    const harness = await startSynthesisProductionRouteHarness({
      id: "topic-context",
      root,
    });
    try {
      const untriagedRef = "1:UNTRIAGED";
      const emptyTriageRef = "1:EMPTYTRIAGE";
      const triage = {
        relevance_level: "core",
        relevance_reason: "Direct evidence for the mutation boundary.",
        core_digest: "Tracks the persistence of a committed mutation.",
        caveats: ["One synthetic source."],
      };
      const request = topicApplyRequest(topicId);
      for (const asset of request.assets) {
        if (asset.id === "asset/section/source_papers") {
          const [paper] = JSON.parse(asset.text);
          asset.text = JSON.stringify([
            { ...paper, triage },
            {
              paper_ref: untriagedRef,
              digest_ref: { ...paper.digest_ref, paper_ref: untriagedRef },
              caveats: ["Not a triage assessment."],
            },
            {
              paper_ref: emptyTriageRef,
              digest_ref: { ...paper.digest_ref, paper_ref: emptyTriageRef },
              triage: {},
            },
          ]);
        } else if (asset.id === "asset/resolver") {
          const resolver = JSON.parse(asset.text);
          resolver.resolver.paper_refs.push(untriagedRef, emptyTriageRef);
          resolver.resolved_paper_set.papers.push(
            { paper_ref: untriagedRef, caveats: ["Not a triage assessment."] },
            { paper_ref: emptyTriageRef },
          );
          asset.text = JSON.stringify(resolver);
        } else if (asset.id === "asset/section/source_artifacts") {
          const artifacts = JSON.parse(asset.text);
          asset.text = JSON.stringify([
            ...artifacts,
            ...[untriagedRef, emptyTriageRef].flatMap((paper_ref) =>
              artifacts.map((artifact: Record<string, unknown>) => ({
                ...artifact,
                paper_ref,
              })),
            ),
          ]);
        } else if (asset.id === "asset/section/statistics") {
          const statistics = JSON.parse(asset.text);
          statistics.paper_count = 3;
          asset.text = JSON.stringify(statistics);
        }
      }
      const applied =
        await harness.client.workflowApply.applyTopicSynthesisResult(request);
      assert.equal(applied.status, "persisted");

      const digest = await harness.client.topics.getContext({
        topicId,
        view: "digest",
      });
      assert.equal(digest.view, "digest");
      assert.equal(digest.digest.topic_id, topicId);
      assert.equal(digest.digest.title, "Mutation Topic");
      assert.isNotEmpty(digest.digest.updated_at);
      assert.equal(digest.digest.paper_count, 3);
      assert.isNumber(digest.digest.external_literature_count);
      assert.isObject(digest.digest.summary);

      const audit = await harness.client.topics.getContext({
        topicId,
        view: "audit",
      });
      assert.equal(audit.audit.topic_id, topicId);
      assert.equal(audit.audit.language, "en");
      assert.isNotEmpty(audit.audit.paths);
      assert.equal(audit.audit.current_hashes.manifest.length > 0, true);
      assert.isObject(audit.audit.current_manifest);
      assert.isObject(audit.audit.current_metadata);
      assert.isObject(audit.audit.section_hashes);
      assert.isObject(audit.audit.source_paper_triage);
      assert.deepEqual(audit.audit.source_paper_triage, {
        [SOURCE_PAPER_REF]: { paper_ref: SOURCE_PAPER_REF, ...triage },
      });
      assert.equal(audit.audit.source_materials.status, "complete");

      const semantic = await harness.client.topics.getContext({
        topicId,
        view: "semantic",
      });
      assert.equal(semantic.semantic.topic_definition.title, "Mutation Topic");

      const full = await harness.client.topics.getContext({
        topicId,
        view: "full",
      });
      assert.equal(full.view, "full");
      assert.isObject(full.digest);
      assert.isObject(full.semantic);
      assert.isObject(full.audit);
      assert.deepEqual(full.audit.source_paper_triage, {
        [SOURCE_PAPER_REF]: { paper_ref: SOURCE_PAPER_REF, ...triage },
      });

      const report = await harness.client.topics.getTopicReport({ topicId });
      assert.equal(report.ok, true);
      assert.equal(report.status, "available");
      assert.equal(report.format, "markdown");
      assert.isNotEmpty(report.markdown);
      // source.artifactPath is a portable canonical identifier, never a host path.
      const artifactPath = report.source?.artifactPath ?? "";
      assert.match(
        artifactPath,
        /^topics\/[A-Za-z0-9-]+\/current\/artifact\.json$/,
      );
      assert.notMatch(artifactPath, /(^\/)|^[A-Za-z]:|\.\./);
      assert.isObject(report.metadata);
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("rebuilds the concept KB through the real route and reads back label, alias and sense facts", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-concept-rebuild-"));
    const harness = await startSynthesisProductionRouteHarness({
      id: "concept-rebuild",
      root,
    });
    try {
      const applied =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest("topic-concept-rebuild"),
        );
      assert.equal(applied.status, "persisted");
      const state = workbenchState();
      const surface = await harness.client.workbench.readSurface({
        surface: "concepts",
        state,
      });
      const target = surface.concepts.concepts.find(
        (entry) => entry.label === "Mutation concept",
      );
      const review = surface.concepts.reviewItems[0];
      assert.isDefined(target, "committed concept is projected");
      assert.equal(review.label, "Pending review concept");

      // Rebuild the index through the real process and wait for its terminal.
      const rebuild = await harness.client.concepts.rebuildConceptKbIndex();
      const settled = await settleMaintenance(harness, rebuild.operation_id);
      assert.equal(
        settled.status,
        "completed",
        "the concept KB index rebuild completes",
      );

      // The freshly built index answers a label query with real sense facts.
      const byLabel = await harness.client.concepts.query({
        label: "Mutation concept",
      });
      assert.notInclude(
        byLabel.diagnostics.map((diagnostic) => diagnostic.code),
        "concept_kb_index_unavailable",
        "the query reads the rebuilt index",
      );
      const labelMatch = byLabel.matches.find(
        (match) => match.label === "Mutation concept",
      );
      assert.isDefined(labelMatch, "the committed label is queryable");
      assert.include(labelMatch?.exactConceptIds ?? [], target.concept_id);
      assert.isNotEmpty(
        labelMatch?.senseIds ?? [],
        "the committed label resolves a sense",
      );
      assert.equal(labelMatch?.ambiguous, false);

      // Merging the pending review makes its label a durable alias; rebuild
      // again and read the alias back as a real concept resolution.
      const merged = await harness.client.concepts.applyConceptReviewAction({
        reviewId: review.review_id,
        action: "merge_into_existing",
        targetConceptId: target.concept_id,
      });
      assert.equal(merged.status, "committed");
      const aliasRebuild =
        await harness.client.concepts.rebuildConceptKbIndex();
      const aliasSettled = await settleMaintenance(
        harness,
        aliasRebuild.operation_id,
      );
      assert.equal(aliasSettled.status, "completed");

      const byAlias = await harness.client.concepts.query({
        label: "Pending review concept",
      });
      const aliasMatch = byAlias.matches.find(
        (match) => match.label === "Pending review concept",
      );
      assert.isDefined(aliasMatch, "the merged label resolves as an alias");
      assert.include(
        aliasMatch?.aliasMatches.map((alias) => alias.conceptId) ?? [],
        target.concept_id,
        "the alias points at the merged concept",
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("rebuilds the topic graph index through the real route and reads back index placement", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tgraph-rebuild-"));
    const topicId = "topic-graph-rebuild";
    const plannedId = "topic:planned-target";
    const harness = await startSynthesisProductionRouteHarness({
      id: "topic-graph-rebuild",
      root,
    });
    try {
      const seeded =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest("topic-graph-seed"),
        );
      assert.equal(seeded.status, "persisted");
      const planned = await harness.client.workflowApply.applyTopicPlan(
        planRequest({
          ...(await planningBasis(harness)),
          topicActions: [
            {
              action: "create",
              topic_id: plannedId,
              title: "Planned Target",
              definition: "Index placement target.",
              resolver: { paper_refs: [SOURCE_PAPER_REF], combine: "union" },
            },
          ],
        }),
      );
      assert.equal(planned.status, "persisted");
      const applied =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest(topicId, [
            {
              relation_type: "related_topic_candidate",
              target_topic_id: plannedId,
              target_topic_title: "Planned Target",
              confidence: 0.8,
              rationale: "Shares the fixture route.",
              source_paper_refs: [SOURCE_PAPER_REF],
            },
          ]),
        );
      assert.equal(applied.status, "persisted");

      // Rebuild the index through the real process and wait for its terminal.
      const rebuild = await harness.client.topicGraph.rebuildTopicGraphIndex();
      const settled = await settleMaintenance(harness, rebuild.operation_id);
      assert.equal(
        settled.status,
        "completed",
        "the topic graph index rebuild completes",
      );

      // Index placement readback: the rebuilt index is current and serves the
      // materialized node and its relation.
      const after = await harness.client.topics.getPlanningContext();
      assert.equal(
        after.topic_graph.projection.stale,
        false,
        "the rebuilt index is no longer stale",
      );
      assert.isNotEmpty(
        after.topic_graph.manifest.manifest_hash,
        "the rebuilt index has a manifest",
      );
      assert.isAtLeast(after.topic_graph.manifest.node_count, 1);
      const nodeIds = (
        after.topic_graph.nodes as Array<Record<string, any>>
      ).map((node) => node.topic_id);
      assert.include(nodeIds, topicId, "the rebuilt index reads back the node");
      assert.include(
        nodeIds,
        plannedId,
        "the rebuilt index reads back the plan",
      );
      const relatedEdges = (
        after.topic_graph.edges as Array<Record<string, any>>
      ).filter((edge) => edge.relation === "related_to");
      assert.isNotEmpty(
        relatedEdges,
        "the rebuilt index reads back the relation edge",
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
