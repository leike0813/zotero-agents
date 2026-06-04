import { assert } from "chai";
import Ajv from "ajv";
import { execFileSync } from "child_process";
import fsSync from "fs";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { applyResult as applyTopicSynthesisResultHook } from "../../workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs";
import {
  buildSynthesisStoragePaths,
  hashCanonicalJson,
  hashMarkdown,
} from "../../src/modules/synthesis/foundation";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import {
  assembleTopicArtifact,
  validateTopicSynthesisArtifact,
} from "../../src/modules/synthesis/topicStructuredArtifact";

type JsonObject = Record<string, any>;

const DIGEST_MARKDOWN = [
  "# Digest: End-to-End Object Detection with Transformers",
  "",
  "## Core Contribution",
  "DETR formulates object detection as direct set prediction with object queries and bipartite matching.",
  "",
].join("\n");

function readSchema(pathValue: string) {
  return JSON.parse(require("fs").readFileSync(pathValue, "utf8"));
}

function validateWithSchema(schemaPath: string, value: unknown) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(readSchema(schemaPath));
  const ok = validate(value);
  return {
    ok,
    errors:
      validate.errors?.map(
        (error) => `${error.instancePath} ${error.message}`,
      ) ?? [],
  };
}

async function makeRoot(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function artifactNote(args: {
  payloadType: string;
  value: string;
  format?: "markdown" | "json";
}) {
  const format = args.format || "markdown";
  return {
    key: `${args.payloadType}-note`,
    title: args.payloadType,
    updatedAt: "2026-05-18T00:00:00.000Z",
    html: "",
    payloadBlocks: [
      {
        source: "embedded-image-attachment",
        sourceStorage: "embedded-image-attachment-v2",
        payloadType: args.payloadType,
        noteKind: "",
        version: "1",
        encoding: "embedded-image-attachment",
        encodedValue: "",
        estimatedSize: args.value.length,
        format,
        decodedText: args.value,
        markdown: format === "markdown" ? args.value : undefined,
        payload: format === "json" ? JSON.parse(args.value) : undefined,
        attachmentKey: `${args.payloadType}-attachment`,
      },
    ],
  };
}

function registryInputForDetr() {
  return {
    libraryId: 1,
    itemKey: "DETR",
    title: "End-to-End Object Detection with Transformers",
    year: "2020",
    itemType: "conferencePaper",
    tags: ["topic:object-detection"],
    collections: [],
    notes: [
      artifactNote({
        payloadType: "digest-markdown",
        value: DIGEST_MARKDOWN,
        format: "markdown",
      }),
      artifactNote({
        payloadType: "references-json",
        value: JSON.stringify({ references: [] }),
        format: "json",
      }),
      artifactNote({
        payloadType: "citation-analysis-json",
        value: JSON.stringify({
          report_md: "No external citation report in fixture.",
        }),
        format: "json",
      }),
    ],
  };
}

function baseSections(
  digestHash = hashMarkdown(DIGEST_MARKDOWN),
): Record<string, unknown> {
  return {
    topic: {
      id: "object-detection",
      title: "Object Detection",
      definition:
        "Object detection locates and classifies object instances in images, with this fixture focusing on query-based set prediction detectors.",
      discipline: "Computer Science",
      research_field: "Computer Vision",
      aliases: ["visual object detection", "DETR-style detection"],
      topic_granularity: "method_family",
      scope_boundary: {
        include: ["DETR-style object detection"],
        exclude: ["generic image classification"],
        gray_zone: ["instance segmentation appears only as adjacent context"],
      },
    },
    summary: {
      brief:
        "DETR-style detection reframes object detection as set prediction.",
      overview:
        "This fixture captures the minimum structured synthesis needed to test the protocol between skill output, host persistence, and Workbench topic detail rendering.",
      key_takeaways: [
        "Object queries and bipartite matching are the core modeling shift.",
        "The fixture intentionally covers one library paper to keep protocol assertions focused.",
      ],
      route_count: 1,
      timeline_span: { start_year: 2020, end_year: 2020 },
      coverage_verdict: "partial",
    },
    positioning: {
      importance:
        "Object detection is a core visual perception task, and DETR-style methods changed its modeling assumptions.",
      timeliness:
        "The query-based route remains relevant because later work continues to optimize convergence, efficiency, and deployment.",
      field_position:
        "The topic sits between object detection, transformer vision models, and efficient perception systems.",
      review_position:
        "The fixture can seed a Related Work paragraph about the shift from proposal pipelines to set prediction.",
      scope_boundary: {
        covered: "DETR-style set prediction detection.",
        not_covered:
          "The full history of anchor-based and anchor-free detectors.",
      },
      evidence_map_refs: ["pos:route-shift"],
    },
    taxonomy: {
      primary_axis: "technical route by bottleneck addressed",
      axis_rationale:
        "The fixture has one route because it exists to verify the protocol, but the route still carries the required analysis depth.",
      summary: {
        text: "The taxonomy contains one route: end-to-end set prediction. It explains how DETR replaces hand-designed proposals and NMS with object queries and bipartite matching. Even as a minimal fixture, the route summary can feed the synthesis report's research-routes chapter and remains distinct from timeline narration.",
        dominant_routes: ["route:set-prediction"],
        emerging_routes: [],
        route_relationships: [
          {
            from: "route:set-prediction",
            to: "route:traditional-pipelines",
            relation: "alternative",
            explanation:
              "Set prediction is framed as an alternative to proposal and post-processing heavy detection pipelines.",
          },
        ],
        main_tradeoffs: [
          "Conceptual simplicity and end-to-end training are traded against early convergence cost.",
        ],
        report_chapter_hint:
          "Use this as the synthesis_report research_routes source chapter.",
      },
      nodes: [
        {
          id: "route:set-prediction",
          label: "End-to-end set prediction",
          definition:
            "Detection is formulated as direct set prediction with object queries and Hungarian matching.",
          core_problem:
            "Traditional detection pipelines depend on proposal generation, anchor design, and NMS post-processing.",
          mechanism:
            "Transformer decoder queries predict object sets, and bipartite matching aligns predictions with ground truth.",
          representative_papers: ["pe:1_detr"],
          main_contributions: [
            "Established a coherent query-based detection route.",
          ],
          strengths: [
            "Unified formulation",
            "Reduced hand-designed post-processing",
          ],
          limitations: ["Early DETR variants are known for slow convergence."],
          maturity: "foundation route in this fixture",
          relation_to_other_routes:
            "Contrasts with proposal-driven pipelines and motivates later efficiency routes.",
          review_angle:
            "Use as the opening Related Work route for query-based object detection.",
          paper_refs: ["1:DETR"],
          evidence_map_refs: ["tax:set-prediction"],
        },
      ],
    },
    timeline_events: {
      summary: {
        text: "The timeline treats DETR as a minimal milestone: it establishes the set-prediction formulation in 2020 and creates the problem chain that later work addresses through convergence and efficiency improvements.",
        phases: [
          {
            id: "phase:paradigm-establishment",
            period: "2020",
            logic:
              "The field demonstrates end-to-end set prediction detection and exposes practical bottlenecks.",
          },
        ],
        milestone_event_refs: ["event:detr-2020"],
        report_chapter_hint:
          "Use this as the synthesis_report historical_progression source chapter.",
      },
      events: [
        {
          id: "event:detr-2020",
          year: 2020,
          label: "DETR establishes set-prediction detection",
          phase: "paradigm_shift",
          route_refs: ["route:set-prediction"],
          description:
            "DETR formulates object detection as set prediction with object queries and bipartite matching.",
          bottleneck_addressed:
            "It reduces dependence on proposal generation, anchor design, and post-processing.",
          why_it_matters:
            "It changes the subsequent research questions from candidate-box engineering to query learning and matching stability.",
          progression_logic:
            "Later work builds on this formulation to improve convergence, attention efficiency, and deployment.",
          follow_on_effect:
            "The set-prediction route becomes a recognizable family of query-based detectors.",
          evidence_refs: ["pe:1_detr"],
          evidence_map_refs: ["timeline:detr-2020"],
        },
      ],
    },
    claims: [
      {
        id: "claim:set-prediction-shift",
        text: "DETR-style detection shifts the central modeling unit from hand-designed proposals to learned object queries.",
        analysis:
          "The fixture claim is supported by DETR's direct set prediction formulation and its use of bipartite matching. This is a synthesis-level claim because it interprets the method as a route shift rather than restating a paper title.",
        evidence_refs: ["pe:1_detr"],
        evidence_map_refs: ["claim:set-prediction-shift"],
        confidence: 0.82,
        scope:
          "This claim is limited to the DETR-style object detection route.",
        limitations: [
          "The fixture contains one evidence paper, so broader detector history is partial.",
        ],
        review_usage:
          "Use as a topic sentence for a Related Work paragraph introducing query-based detection.",
      },
    ],
    comparison_matrix: {
      dimensions: ["target_bottleneck", "core_mechanism"],
      rows: [
        {
          id: "cmp:detr",
          route_ref: "route:set-prediction",
          paper_refs: ["pe:1_detr"],
          values: {
            target_bottleneck: "Hand-designed detection pipeline components.",
            core_mechanism: "Object queries and bipartite matching.",
          },
          evidence_map_refs: ["cmp:detr"],
        },
      ],
    },
    debates: [
      {
        id: "debate:end-to-end-practicality",
        title:
          "Whether end-to-end detection simplicity offsets early training cost",
        positions: [
          {
            stance:
              "End-to-end set prediction simplifies the detection pipeline and removes post-processing dependencies.",
            evidence_refs: ["pe:1_detr"],
          },
          {
            stance:
              "Early query-based detectors still face convergence and efficiency costs that later work must address.",
            evidence_refs: ["pe:1_detr"],
          },
        ],
        evaluation_axis: "Conceptual simplicity versus training practicality.",
        current_judgment:
          "The fixture supports the existence of the tradeoff but not a field-wide resolution.",
        uncertainty:
          "A full judgment would require additional later DETR variants and non-DETR baselines.",
        evidence_map_refs: ["debate:end-to-end-practicality"],
      },
    ],
    gaps: [
      {
        id: "gap:traditional-detector-background",
        gap_type: "library_coverage_gap",
        title: "Traditional detector background is under-covered",
        description:
          "The fixture validates protocol flow but lacks first-hand digests for Faster R-CNN, YOLO, and anchor-free detectors.",
        evidence_refs: [],
        evidence_map_refs: ["gap:traditional-detector-background"],
        severity: "high",
        recommended_action:
          "Add representative proposal-based and anchor-free detector papers before using this as a real review source.",
        not_field_wide_claim: true,
      },
    ],
    external_literature_analysis: {
      summary:
        "External literature in this fixture is represented as background context, not primary evidence.",
      themes: [
        {
          id: "ext:traditional-pipelines",
          title: "Traditional detection pipelines",
          analysis:
            "Proposal and anchor-based detectors form the comparison background needed to interpret DETR's route shift.",
          related_topic_aspect:
            "Explains why set prediction is presented as a modeling alternative.",
          reference_ids: ["external:faster-rcnn"],
        },
      ],
      representative_references: [
        {
          id: "external:faster-rcnn",
          title: "Faster R-CNN",
          year: 2015,
          authors: ["Ren", "He"],
          cited_by_papers: ["pe:1_detr"],
          why_relevant:
            "It stands in for the proposal-based detection pipeline that DETR contrasts against.",
          information_completeness: "minimal",
        },
      ],
      citation_contexts: [
        {
          citing_paper_ref: "pe:1_detr",
          reference_id: "external:faster-rcnn",
          usage:
            "Background comparison for non-end-to-end detection pipelines.",
        },
      ],
      coverage_verdict: "partial",
      coverage_reason:
        "The fixture has enough external context to test protocol fields but not enough to support full literature coverage.",
      suggested_additions: [
        {
          title: "Faster R-CNN",
          reason:
            "Add first-hand digest coverage for proposal-based detection.",
          priority: "high",
        },
      ],
      contribution_to_topic:
        "External literature explains the pipeline that query-based set prediction reacts against.",
      limitations:
        "External references are not used as primary evidence for claims or timeline events.",
    },
    coverage: {
      paper_count: 1,
      paper_evidence_count: 1,
      digest_coverage: "1/1",
      references_coverage: "1/1",
      citation_analysis_coverage: "1/1",
      route_coverage_summary: "One route is covered for protocol validation.",
      claim_coverage_summary: "The fixture claim has one evidence paper.",
      timeline_coverage_summary:
        "The fixture timeline has one milestone event.",
      external_literature_coverage_summary:
        "External literature coverage is intentionally minimal.",
      coverage_verdict: "partial",
      warnings: [
        "Fixture content should not be treated as a complete domain synthesis.",
      ],
    },
    statistics: {
      paper_count: 1,
      evidence_paper_count: 1,
      time_span: { start_year: 2020, end_year: 2020 },
      route_count: 1,
      route_coverage: "The fixture covers one set-prediction route.",
      coverage_verdict: "partial",
      external_reference_count: 1,
      suggested_addition_count: 1,
      citation_graph_role_counts: {
        core: 1,
        foundation: 1,
        frontier: 0,
        isolated: 0,
        "external-heavy": 0,
      },
      artifact_availability: {
        digest: { available: 1, missing: 0 },
        references: { available: 1, missing: 0 },
        citation_analysis: { available: 1, missing: 0 },
      },
    },
    review_outline: {
      introduction_logic: [
        {
          id: "intro:route-shift",
          purpose:
            "Explain why object detection can be introduced as a shift from pipeline engineering to set prediction.",
          source_sections: ["topic", "positioning", "claims"],
          candidate_citations: ["pe:1_detr"],
          evidence_map_refs: ["claim:set-prediction-shift"],
        },
      ],
      related_work_logic: [
        {
          id: "rw:set-prediction-route",
          purpose:
            "Organize Related Work around the query-based set-prediction route.",
          organization: "method route",
          source_sections: ["taxonomy", "timeline_events", "comparison_matrix"],
          candidate_citations: ["pe:1_detr"],
          evidence_map_refs: ["tax:set-prediction"],
        },
      ],
      body_sections: [
        {
          title: "Query-based set prediction",
          role: "Introduce the core DETR-style route and its implications.",
        },
      ],
    },
    synthesis_report: {
      title: "Object Detection Protocol Fixture Report",
      source_section_chapters: {
        research_routes: "taxonomy.summary",
        historical_progression: "timeline_events.summary",
      },
      body: "This fixture synthesis defines object detection through a narrow DETR-style set-prediction lens so that the skill, workflow, host, and Workbench contracts can be tested together. The research-route chapter is grounded in taxonomy.summary: it identifies end-to-end set prediction as the route that replaces hand-designed proposals and post-processing with object queries and bipartite matching. The historical-progress chapter is grounded in timeline_events.summary: it treats DETR as a 2020 milestone that establishes the route and creates the later problem chain around convergence, attention efficiency, and deployment. The claim, comparison, debate, gap, external literature, coverage, statistics, and review outline sections remain deliberately compact, but each preserves evidence references and diagnostics so downstream UI and writing workflows can consume the artifact without relying on Markdown or legacy fields.",
    },
    paper_evidence: [
      {
        id: "pe:1_detr",
        paper_ref: "1:DETR",
        title: "End-to-End Object Detection with Transformers",
        year: 2020,
        evidence_summary:
          "Introduces object queries and bipartite matching for direct set-prediction object detection.",
        digest_ref: {
          paper_ref: "1:DETR",
          note_key: "digest-markdown-note",
          payload_type: "digest-markdown",
          payload_hash: digestHash,
          updated_at: "2026-05-18T00:00:00.000Z",
        },
      },
    ],
    evidence_map: {
      path: "runtime/payloads/cross-paper-evidence-map.json",
      hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      candidate_counts: {
        taxonomy_candidates: 1,
        comparison_dimensions: 1,
        claim_candidates: 1,
        debate_candidates: 1,
        gap_candidates: 1,
        review_outline_seeds: 2,
      },
      candidate_ids: [
        "pos:route-shift",
        "tax:set-prediction",
        "timeline:detr-2020",
        "claim:set-prediction-shift",
        "cmp:detr",
        "debate:end-to-end-practicality",
        "gap:traditional-detector-background",
      ],
    },
    source_artifacts: [
      {
        paper_ref: "1:DETR",
        artifact_type: "digest",
        payload_type: "digest-markdown",
        status: "available",
        path: "runtime/payloads/paper-artifacts-1_DETR.json",
        hash: digestHash,
      },
    ],
    diagnostics: {
      warnings: ["Protocol fixture only contains one library evidence paper."],
      quality_flags: ["partial_coverage"],
      limitations: ["Not a real domain synthesis."],
    },
  };
}

function sectionFileName(section: string) {
  return `${section.replace(/_/g, "-")}.json`;
}

function createResultBundle(overrides: Record<string, unknown> = {}) {
  return {
    __SKILL_DONE__: true,
    kind: "topic_synthesis",
    operation: "create",
    language: "zh-CN",
    topic_definition: {
      id: "object-detection",
      title: "Object Detection",
    },
    resolver_manifest_path: "runtime/payloads/resolver.json",
    resolver_diagnostics: {
      final_count: 1,
      manifest_hash: "sha256:resolver",
    },
    artifact_metadata: {
      topic_id: "object-detection",
      depends_on: {
        papers: ["1:DETR"],
        artifacts: [
          "digest-markdown",
          "references-json",
          "citation-analysis-json",
        ],
      },
    },
    analysis_manifest_path: "result/topic-analysis.json",
    ...overrides,
  };
}

function createAnalysisManifest(sections: Record<string, unknown>) {
  return {
    schema_id: "synthesis.topic_analysis_manifest",
    schema_version: "2.0.0",
    operation: "create",
    topic_id: "object-detection",
    language: "zh-CN",
    sidecars: {
      topic_interest_metadata: {
        path: "result/sidecars/topic-interest-metadata.json",
        hash: hashCanonicalJson({
          schema: "topic_interest_metadata.v1",
          topic_id: "object-detection",
          include_terms: ["object detection", "DETR"],
          must_have_terms: ["object detection"],
          methods: ["DETR"],
          exclude_terms: [],
          seed_literature_item_ids: ["lit:detr"],
          diagnostics: [],
        }),
        content_type: "json",
        schema_id: "topic_interest_metadata.v1",
      },
      concept_cards_proposal: {
        path: "result/sidecars/concept-cards-proposal.json",
        hash: hashCanonicalJson({
          schema_id: "synthesis.concept_cards_proposal",
          schema_version: "1.0.0",
          cards: [],
          diagnostics: [],
        }),
        content_type: "json",
        schema_id: "synthesis.concept_cards_proposal",
      },
      topic_graph_relation_proposals: {
        path: "result/sidecars/topic-graph-relation-proposals.json",
        hash: hashCanonicalJson({
          schema_id: "synthesis.topic_graph_relation_proposals",
          schema_version: "1.0.0",
          source_topic_id: "object-detection",
          proposals: [],
          diagnostics: [],
        }),
        content_type: "json",
        schema_id: "synthesis.topic_graph_relation_proposals",
      },
    },
    sections: Object.fromEntries(
      Object.entries(sections).map(([section, value]) => [
        section,
        {
          path: `result/sections/${sectionFileName(section)}`,
          hash: hashCanonicalJson(value),
          content_type: "json",
        },
      ]),
    ),
  };
}

function createResolverManifest() {
  return {
    schema_id: "synthesis.topic_resolver_manifest",
    schema_version: "2.0.0",
    resolver: {
      mode: "tag_query",
      query: { and: ["topic:object-detection"] },
    },
    resolved_paper_set: {
      papers: [
        {
          paper_ref: "1:DETR",
          item_key: "DETR",
          match_reasons: ["fixture"],
        },
      ],
    },
    resolver_diagnostics: {
      final_count: 1,
    },
  };
}

async function writeJsonFile(
  root: string,
  relativePath: string,
  value: unknown,
) {
  const absolutePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(
    absolutePath,
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

async function createRunWorkspace(args: {
  sections: Record<string, unknown>;
  resultBundle?: Record<string, unknown>;
  analysisManifest?: Record<string, unknown>;
}) {
  const runRoot = await makeRoot("zs-topic-contract-run-");
  const analysisManifest =
    args.analysisManifest || createAnalysisManifest(args.sections);
  const resultBundle = args.resultBundle || createResultBundle();
  await writeJsonFile(runRoot, "result/result.json", resultBundle);
  await writeJsonFile(runRoot, "result/topic-analysis.json", analysisManifest);
  await writeJsonFile(
    runRoot,
    "runtime/payloads/resolver.json",
    createResolverManifest(),
  );
  await writeJsonFile(runRoot, "result/sidecars/concept-cards-proposal.json", {
    schema_id: "synthesis.concept_cards_proposal",
    schema_version: "1.0.0",
    cards: [],
    diagnostics: [],
  });
  await writeJsonFile(runRoot, "result/sidecars/topic-interest-metadata.json", {
    schema: "topic_interest_metadata.v1",
    topic_id: "object-detection",
    include_terms: ["object detection", "DETR"],
    must_have_terms: ["object detection"],
    methods: ["DETR"],
    exclude_terms: [],
    seed_literature_item_ids: ["lit:detr"],
    diagnostics: [],
  });
  await writeJsonFile(
    runRoot,
    "result/sidecars/topic-graph-relation-proposals.json",
    {
      schema_id: "synthesis.topic_graph_relation_proposals",
      schema_version: "1.0.0",
      source_topic_id: "object-detection",
      proposals: [],
      diagnostics: [],
    },
  );
  for (const [section, value] of Object.entries(args.sections)) {
    await writeJsonFile(
      runRoot,
      `result/sections/${sectionFileName(section)}`,
      value,
    );
  }
  return { runRoot, resultBundle, analysisManifest };
}

function resultContextForRunRoot(runRoot: string) {
  return {
    async resolveArtifact(args: {
      fieldName: string;
      rawPath: string;
      fallbackPath: string;
    }) {
      const relativePath = args.rawPath || args.fallbackPath;
      const text = await fs.readFile(path.join(runRoot, relativePath), "utf8");
      return {
        text,
        entryPath: relativePath,
        sourceKind: "local-path",
        sourcePath: path.join(runRoot, relativePath),
        candidates: [relativePath],
      };
    },
  };
}

async function readJsonFile<T = any>(pathValue: string): Promise<T> {
  return JSON.parse(await fs.readFile(pathValue, "utf8"));
}

async function applyRunWorkspace(args: {
  service: ReturnType<typeof createSynthesisService>;
  runRoot: string;
  resultBundle: Record<string, unknown>;
}) {
  return applyTopicSynthesisResultHook({
    runResult: { json: args.resultBundle },
    resultContext: resultContextForRunRoot(args.runRoot),
    runtime: {
      hostApi: {
        synthesis: {
          applyTopicSynthesisResult: args.service.applyTopicSynthesisResult,
        },
      },
    },
  });
}

function runCreateSkillFinalValidation(
  runRoot: string,
  sections: Record<string, unknown>,
) {
  const skillRoot = path.resolve("skills_builtin/create-topic-synthesis");
  const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");
  const candidateIds =
    (sections.evidence_map as JsonObject).candidate_ids || [];
  const python = process.env.PYTHON || "python";
  const setupScript = String.raw`
import json
import sys
from pathlib import Path

skill_root = Path(sys.argv[1])
db_path = Path(sys.argv[2])
run_root = Path(sys.argv[3])
digest_hash = sys.argv[4]
candidate_ids = json.loads(sys.argv[5])
sys.path.insert(0, str(skill_root / "scripts"))
import runtime_db as db

conn = db.connect(db_path)
db.set_meta(conn, "operation", "create")
db.set_meta(conn, "language", "zh-CN")
db.set_meta(conn, "base_hashes", {"manifest": "", "artifact": "", "export": "", "metadata": "", "index": ""})
db.set_meta(conn, "artifact_metadata", {
    "topic_id": "object-detection",
    "depends_on": {
        "papers": ["1:DETR"],
        "artifacts": ["digest-markdown", "references-json", "citation-analysis-json"],
    },
})
db.set_meta(conn, "cross_paper_evidence_map_candidate_ids", candidate_ids)
db.set_meta(conn, "cross_paper_evidence_map_path", "runtime/payloads/cross-paper-evidence-map.json")
db.set_meta(conn, "cross_paper_evidence_map_hash", "sha256:0000000000000000000000000000000000000000000000000000000000000000")
db.set_meta(conn, "cross_paper_evidence_map_candidate_counts", {"runtime_derived": len(candidate_ids)})
db.put_key_value(conn, "topic_intent", "topic_definition", {"id": "object-detection", "title": "Object Detection"})
db.put_key_value(conn, "topic_resolver", "resolver_diagnostics", {"final_count": 1, "warnings": []})
conn.execute(
    "insert or replace into paper_workset(paper_ref, value_json) values (?, ?)",
    ("1:DETR", json.dumps({
        "paper_ref": "1:DETR",
        "source": {
            "item_key": "DETR",
            "title": "End-to-End Object Detection with Transformers",
            "year": "2020",
        },
    }, ensure_ascii=False, sort_keys=True)),
)
bundle = {
    "paper_ref": "1:DETR",
    "artifacts": [
        {
            "artifact_type": "digest",
            "status": "available",
            "payload_type": "digest-markdown",
            "payload_hash": digest_hash,
            "note_key": "digest-markdown-note",
            "updated_at": "2026-05-18T00:00:00.000Z",
        },
        {"artifact_type": "references", "status": "available", "payload_type": "references-json"},
        {"artifact_type": "citation_analysis", "status": "available", "payload_type": "citation-analysis-json"},
    ],
}
conn.execute(
    "insert or replace into paper_artifact_bundles(paper_ref, bundle_json, created_at) values (?, ?, ?)",
    ("1:DETR", json.dumps(bundle, ensure_ascii=False, sort_keys=True), db.now_iso()),
)
conn.execute(
    "insert or replace into citation_graph_metrics(paper_ref, metrics_json, status, created_at) values (?, ?, ?, ?)",
    ("1:DETR", json.dumps({"paper_ref": "1:DETR", "status": "ready"}, ensure_ascii=False, sort_keys=True), "ready", db.now_iso()),
)
conn.execute(
    "insert or replace into paper_analysis(paper_ref, analysis_json) values (?, ?)",
    ("1:DETR", json.dumps({"paper_ref": "1:DETR", "topic_relevance": "fixture"}, ensure_ascii=False, sort_keys=True)),
)
conn.commit()
db.record_action_receipt(conn, action_name="persist_citation_graph_metrics", payload={}, result={"paper_refs": ["1:DETR"]})
db.record_action_receipt(conn, action_name="persist_filtered_artifact_manifest", payload={}, result={"paper_refs": ["1:DETR"]})
db.record_action_receipt(conn, action_name="persist_paper_units", payload={}, result={"paper_refs": ["1:DETR"]})
sidecars = [
    ("result/sidecars/concept-cards-proposal.json", "synthesis.concept_cards_proposal", {"schema_id": "synthesis.concept_cards_proposal", "schema_version": "1.0.0", "cards": [], "diagnostics": []}),
    ("result/sidecars/topic-interest-metadata.json", "topic_interest_metadata.v1", {"schema": "topic_interest_metadata.v1", "topic_id": "object-detection", "include_terms": ["object detection", "DETR"], "must_have_terms": ["object detection"], "methods": ["DETR"], "exclude_terms": [], "seed_literature_item_ids": ["lit:detr"], "diagnostics": []}),
    ("result/sidecars/topic-graph-relation-proposals.json", "synthesis.topic_graph_relation_proposals", {"schema_id": "synthesis.topic_graph_relation_proposals", "schema_version": "1.0.0", "source_topic_id": "object-detection", "proposals": [], "diagnostics": []}),
]
for relative_path, schema_id, value in sidecars:
    path = run_root / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    db.register_artifact(conn, path=relative_path, hash_value=db.sha256_file(path), content_type="json", schema_id=schema_id, stage="stage_9_kg_proposals", validated=True)
db.set_meta(conn, "concept_cards_proposal_path", "result/sidecars/concept-cards-proposal.json")
db.set_meta(conn, "topic_interest_metadata_path", "result/sidecars/topic-interest-metadata.json")
db.set_meta(conn, "topic_graph_relation_proposals_path", "result/sidecars/topic-graph-relation-proposals.json")
for stage in db.STAGES[:11]:
    db.set_stage_state(conn, stage, "completed")
db.set_stage_state(conn, "stage_11_render_and_validate", "running")
`;
  execFileSync(
    python,
    [
      "-c",
      setupScript,
      skillRoot,
      dbPath,
      runRoot,
      hashMarkdown(DIGEST_MARKDOWN),
      JSON.stringify(candidateIds),
    ],
    { cwd: process.cwd(), stdio: "pipe" },
  );
  const output = execFileSync(
    python,
    [
      path.join(skillRoot, "scripts/stage_runtime.py"),
      "--db",
      dbPath,
      "--run-root",
      runRoot,
      "--operation",
      "create",
      "--language",
      "zh-CN",
      "--action",
      "validate_final_artifacts",
    ],
    { cwd: skillRoot, encoding: "utf8", stdio: "pipe" },
  );
  return JSON.parse(output);
}

function captureCreateSkillFinalValidationError(
  runRoot: string,
  sections: Record<string, unknown>,
) {
  try {
    runCreateSkillFinalValidation(runRoot, sections);
    return "";
  } catch (error: any) {
    return [
      String(error?.stdout || ""),
      String(error?.stderr || ""),
      String(error?.message || ""),
    ].join("\n");
  }
}

function initializeCreateStageValidationDb(
  runRoot: string,
  sections: Record<string, unknown>,
) {
  const skillRoot = path.resolve("skills_builtin/create-topic-synthesis");
  const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");
  const candidateIds =
    (sections.evidence_map as JsonObject).candidate_ids || [];
  const python = process.env.PYTHON || "python";
  const setupScript = String.raw`
import json
import sys
from pathlib import Path

skill_root = Path(sys.argv[1])
db_path = Path(sys.argv[2])
digest_hash = sys.argv[3]
candidate_ids = json.loads(sys.argv[4])
sys.path.insert(0, str(skill_root / "scripts"))
import runtime_db as db

conn = db.connect(db_path)
db.set_meta(conn, "operation", "create")
db.set_meta(conn, "language", "zh-CN")
db.set_meta(conn, "base_hashes", {"manifest": "", "artifact": "", "export": "", "metadata": "", "index": ""})
db.set_meta(conn, "cross_paper_evidence_map_candidate_ids", candidate_ids)
db.set_meta(conn, "cross_paper_evidence_map_path", "runtime/payloads/cross-paper-evidence-map.json")
db.set_meta(conn, "cross_paper_evidence_map_hash", "sha256:0000000000000000000000000000000000000000000000000000000000000000")
db.set_meta(conn, "cross_paper_evidence_map_candidate_counts", {"runtime_derived": len(candidate_ids)})
db.put_key_value(conn, "topic_intent", "topic_definition", {"id": "object-detection", "title": "Object Detection"})
bundle = {
    "paper_ref": "1:DETR",
    "artifacts": [
        {
            "artifact_type": "digest",
            "status": "available",
            "payload_type": "digest-markdown",
            "payload_hash": digest_hash,
            "note_key": "digest-markdown-note",
            "updated_at": "2026-05-18T00:00:00.000Z",
        },
        {"artifact_type": "references", "status": "available", "payload_type": "references-json"},
        {"artifact_type": "citation_analysis", "status": "available", "payload_type": "citation-analysis-json"},
    ],
}
conn.execute(
    "insert or replace into paper_artifact_bundles(paper_ref, bundle_json, created_at) values (?, ?, ?)",
    ("1:DETR", json.dumps(bundle, ensure_ascii=False, sort_keys=True), db.now_iso()),
)
conn.commit()
`;
  execFileSync(
    python,
    [
      "-c",
      setupScript,
      skillRoot,
      dbPath,
      hashMarkdown(DIGEST_MARKDOWN),
      JSON.stringify(candidateIds),
    ],
    { cwd: process.cwd(), stdio: "pipe" },
  );
  return { skillRoot, dbPath };
}

function pickSections(sections: Record<string, unknown>, names: string[]) {
  const result: Record<string, unknown> = {};
  for (const name of names) {
    result[name] = JSON.parse(JSON.stringify(sections[name]));
  }
  return result;
}

function runCreateStageAction(args: {
  runRoot: string;
  dbPath: string;
  payloadPath: string;
  payload: unknown;
  action: string;
}) {
  const skillRoot = path.resolve("skills_builtin/create-topic-synthesis");
  const fullPayloadPath = path.join(args.runRoot, args.payloadPath);
  fsSync.mkdirSync(path.dirname(fullPayloadPath), { recursive: true });
  fsSync.writeFileSync(
    fullPayloadPath,
    `${JSON.stringify(args.payload, null, 2)}\n`,
    "utf8",
  );
  const python = process.env.PYTHON || "python";
  const output = execFileSync(
    python,
    [
      path.join(skillRoot, "scripts/stage_runtime.py"),
      "--db",
      args.dbPath,
      "--run-root",
      args.runRoot,
      "--operation",
      "create",
      "--language",
      "zh-CN",
      "--action",
      args.action,
      "--payload-file",
      args.payloadPath,
    ],
    { cwd: args.runRoot, encoding: "utf8", stdio: "pipe" },
  );
  return JSON.parse(output);
}

function captureCreateStageActionError(args: {
  runRoot: string;
  dbPath: string;
  payloadPath: string;
  payload: unknown;
  action: string;
}) {
  try {
    runCreateStageAction(args);
    return "";
  } catch (error: any) {
    return [
      String(error?.stdout || ""),
      String(error?.stderr || ""),
      String(error?.message || ""),
    ].join("\n");
  }
}

function routeTimelinePayload(sections: Record<string, unknown>) {
  return pickSections(sections, ["taxonomy", "timeline_events"]);
}

function coreSectionsPayload(sections: Record<string, unknown>) {
  return pickSections(sections, [
    "positioning",
    "claims",
    "comparison_matrix",
    "debates",
    "gaps",
    "review_outline",
  ]);
}

function stage9Payload(sections: Record<string, unknown>) {
  return {
    sections: pickSections(sections, [
      "topic",
      "summary",
      "external_literature_analysis",
      "coverage",
      "statistics",
      "synthesis_report",
      "source_artifacts",
      "diagnostics",
    ]),
  };
}

function assertValidOutputSchema(value: unknown) {
  const result = validateWithSchema(
    "skills_builtin/create-topic-synthesis/assets/output.schema.json",
    value,
  );
  assert.isTrue(result.ok, result.errors.join("; "));
}

function assertValidArtifactSchema(value: unknown) {
  const result = validateWithSchema(
    "skills_builtin/create-topic-synthesis/assets/schemas/topic_synthesis_artifact.schema.json",
    value,
  );
  assert.isTrue(result.ok, result.errors.join("; "));
  const hostResult = validateTopicSynthesisArtifact(value, {
    expectedLanguage: "zh-CN",
  });
  assert.isTrue(hostResult.ok, hostResult.errors.join("; "));
}

describe("Topic synthesis contract pipeline", function () {
  this.timeout(10000);

  it("rejects shallow route/timeline content at Stage 7 before final validation", async function () {
    const runRoot = await makeRoot("zs-topic-stage7-run-");
    const sections = baseSections();
    const { dbPath } = initializeCreateStageValidationDb(runRoot, sections);
    const invalid = routeTimelinePayload(sections);
    delete ((invalid.taxonomy as JsonObject).nodes[0] as JsonObject)
      .relation_to_other_routes;
    delete ((invalid.taxonomy as JsonObject).nodes[0] as JsonObject)
      .review_angle;

    const message = captureCreateStageActionError({
      runRoot,
      dbPath,
      action: "persist_route_timeline",
      payloadPath: "runtime/payloads/route-timeline-synthesis.json",
      payload: invalid,
    });

    assert.match(message, /route_relation|relation/i);
  });

  it("rejects shallow core analytical sections at Stage 8 before final validation", async function () {
    const runRoot = await makeRoot("zs-topic-stage8-run-");
    const sections = baseSections();
    const { dbPath } = initializeCreateStageValidationDb(runRoot, sections);
    runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_route_timeline",
      payloadPath: "runtime/payloads/route-timeline-synthesis.json",
      payload: routeTimelinePayload(sections),
    });
    const invalid = coreSectionsPayload(sections);
    delete ((invalid.claims as JsonObject[])[0] as JsonObject).analysis;

    const message = captureCreateStageActionError({
      runRoot,
      dbPath,
      action: "persist_core_sections",
      payloadPath: "runtime/payloads/core-analytical-sections.json",
      payload: invalid,
    });

    assert.match(message, /claim.*analysis|analysis\/rationale/i);
  });

  it("persists required-form KG proposal sidecars after core sections", async function () {
    const runRoot = await makeRoot("zs-topic-kg-proposals-run-");
    const sections = baseSections();
    const { dbPath } = initializeCreateStageValidationDb(runRoot, sections);
    runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_route_timeline",
      payloadPath: "runtime/payloads/route-timeline-synthesis.json",
      payload: routeTimelinePayload(sections),
    });
    runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_core_sections",
      payloadPath: "runtime/payloads/core-analytical-sections.json",
      payload: coreSectionsPayload(sections),
    });

    const result = runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_kg_proposals",
      payloadPath: "runtime/payloads/kg-proposals.json",
      payload: {
        schema_id: "synthesis.topic_synthesis_kg_proposals",
        schema_version: "1.0.0",
        concept_cards: [],
        topic_relations: [],
        topic_interest: {
          schema: "topic_interest_metadata.v1",
          topic_id: "object-detection",
          include_terms: ["object detection", "DETR"],
          must_have_terms: ["object detection"],
          methods: ["DETR"],
          exclude_terms: ["semantic segmentation"],
          seed_literature_item_ids: ["lit:detr"],
          diagnostics: ["explicit_stage9_metadata"],
        },
        diagnostics: ["no_reliable_concepts", "no_reliable_relations"],
      },
    });
    const conceptSidecar = await readJsonFile<JsonObject>(
      path.join(runRoot, "result/sidecars/concept-cards-proposal.json"),
    );
    const relationSidecar = await readJsonFile<JsonObject>(
      path.join(runRoot, "result/sidecars/topic-graph-relation-proposals.json"),
    );
    const topicInterestMetadata = await readJsonFile<JsonObject>(
      path.join(runRoot, "result/sidecars/topic-interest-metadata.json"),
    );

    assert.equal(
      result.result.concept_cards_proposal_path,
      "result/sidecars/concept-cards-proposal.json",
    );
    assert.equal(
      result.result.topic_interest_metadata_path,
      "result/sidecars/topic-interest-metadata.json",
    );
    assert.deepEqual(conceptSidecar.cards, []);
    assert.equal(relationSidecar.source_topic_id, "object-detection");
    assert.deepEqual(relationSidecar.proposals, []);
    assert.equal(topicInterestMetadata.schema, "topic_interest_metadata.v1");
    assert.deepEqual(topicInterestMetadata.methods, ["DETR"]);
    assert.notInclude(
      topicInterestMetadata.diagnostics as string[],
      "topic_interest_metadata_derived_from_topic_definition",
    );
  });

  it("rejects Stage 9 KG proposal payloads without topic interest metadata", async function () {
    const runRoot = await makeRoot("zs-topic-kg-proposals-missing-metadata-");
    const sections = baseSections();
    const { dbPath } = initializeCreateStageValidationDb(runRoot, sections);
    runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_route_timeline",
      payloadPath: "runtime/payloads/route-timeline-synthesis.json",
      payload: routeTimelinePayload(sections),
    });
    runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_core_sections",
      payloadPath: "runtime/payloads/core-analytical-sections.json",
      payload: coreSectionsPayload(sections),
    });

    const message = captureCreateStageActionError({
      runRoot,
      dbPath,
      action: "persist_kg_proposals",
      payloadPath: "runtime/payloads/kg-proposals.json",
      payload: {
        schema_id: "synthesis.topic_synthesis_kg_proposals",
        schema_version: "1.0.0",
        concept_cards_proposal: {
          cards: [],
          diagnostics: [],
        },
        topic_graph_relation_proposals: {
          proposals: [],
          diagnostics: [],
        },
      },
    });

    assert.match(message, /topic_interest_metadata/i);
  });

  it("prevalidates Stage 10 payload and materializes sections only after it passes", async function () {
    const runRoot = await makeRoot("zs-topic-stage9-run-");
    const sections = baseSections();
    const { dbPath } = initializeCreateStageValidationDb(runRoot, sections);
    runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_route_timeline",
      payloadPath: "runtime/payloads/route-timeline-synthesis.json",
      payload: routeTimelinePayload(sections),
    });
    runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_core_sections",
      payloadPath: "runtime/payloads/core-analytical-sections.json",
      payload: coreSectionsPayload(sections),
    });
    const invalid = stage9Payload(sections);
    (invalid.sections.synthesis_report as JsonObject).body = "Too shallow.";

    const message = captureCreateStageActionError({
      runRoot,
      dbPath,
      action: "persist_external_statistics_report",
      payloadPath: "runtime/payloads/external-statistics-report.json",
      payload: invalid,
    });

    assert.match(message, /synthesis_report body/i);
    try {
      await fs.access(
        path.join(runRoot, "result/sections/synthesis-report.json"),
      );
      assert.fail(
        "Stage 10 should not materialize section files after failed prevalidation",
      );
    } catch {
      // expected
    }

    const valid = runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_external_statistics_report",
      payloadPath: "runtime/payloads/external-statistics-report.json",
      payload: stage9Payload(sections),
    });

    assert.equal(valid.result.section_count, 18);
    const materialized = await readJsonFile<JsonObject>(
      path.join(runRoot, "result/sections/taxonomy.json"),
    );
    assert.equal(
      materialized.summary.text,
      (sections.taxonomy as JsonObject).summary.text,
    );
  });

  it("flows from skill output schema through apply hook, host persistence, and UI detail DTO", async function () {
    const root = await makeRoot("zs-topic-contract-root-");
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-18T00:00:00.000Z",
      registryInputs: [registryInputForDetr()],
    });
    const sections = baseSections();
    const analysisManifest = createAnalysisManifest(sections);
    const artifact = assembleTopicArtifact({
      manifest: analysisManifest,
      sections,
    }) as Record<string, unknown>;
    const { runRoot } = await createRunWorkspace({
      sections,
      analysisManifest,
    });

    const runtimeValidation = runCreateSkillFinalValidation(runRoot, sections);
    assert.equal(runtimeValidation.final_path, "result/result.json");
    const resultBundle = await readJsonFile<JsonObject>(
      path.join(runRoot, "result", "result.json"),
    );

    assert.notProperty(resultBundle, "base_hashes");
    assertValidOutputSchema(resultBundle);
    assertValidArtifactSchema(artifact);

    const applyResult = await applyRunWorkspace({
      service,
      runRoot,
      resultBundle,
    });
    const paths = buildSynthesisStoragePaths(root, "object-detection") as any;
    const persistedManifest = await readJsonFile<JsonObject>(
      paths.currentManifest,
    );
    const persistedArtifact = await readJsonFile<JsonObject>(
      paths.currentArtifact,
    );
    const persistedMetadataEnvelope = await readJsonFile<JsonObject>(
      paths.currentMetadata,
    );
    const exportMarkdown = await fs.readFile(
      paths.currentExportMarkdown,
      "utf8",
    );
    const persistedClaims = await readJsonFile<JsonObject>(
      path.join(paths.currentSectionsRoot, "claims.json"),
    );
    const detail = await service.readTopicDetail({
      topicId: "object-detection",
    });
    const snapshot = await service.getSynthesisSnapshot();
    const row = snapshot.artifacts.rows.find(
      (entry: any) => entry.id === "object-detection",
    );

    assert.equal((applyResult as any).status, "persisted");
    assert.equal(
      persistedArtifact.schema_id,
      "synthesis.topic_synthesis_artifact",
    );
    assert.equal(
      persistedArtifact.taxonomy.summary.text,
      (sections.taxonomy as any).summary.text,
    );
    assert.equal(
      persistedArtifact.timeline_events.summary.text,
      (sections.timeline_events as any).summary.text,
    );
    assert.include(exportMarkdown, "# Object Detection");
    assert.equal(persistedMetadataEnvelope.data.paper_count, 1);
    assert.equal(persistedMetadataEnvelope.data.external_literature_count, 1);
    assert.deepEqual(persistedClaims, sections.claims);
    assert.equal(detail.title, "Object Detection");
    assert.equal(
      detail.taxonomy.summary.text,
      (sections.taxonomy as any).summary.text,
    );
    assert.lengthOf(detail.timeline_events.events, 1);
    assert.equal(detail.claims[0].evidence_refs[0], "pe:1_detr");
    assert.equal(
      detail.paper_evidence[0].digest_ref.payload_hash,
      hashMarkdown(DIGEST_MARKDOWN),
    );
    assert.equal(
      detail.external_literature_analysis.coverage_verdict,
      "partial",
    );
    assert.equal(detail.statistics.paper_count, 1);
    assert.include(
      detail.synthesis_report.body,
      "skill, workflow, host, and Workbench contracts",
    );
    assert.isOk(row);
    assert.equal((row as any).paper_count, 1);
    assert.equal((row as any).external_literature_count, 0);
  });

  it("ignores legacy create base hashes when the target topic is absent", async function () {
    const root = await makeRoot("zs-topic-contract-root-");
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-18T00:00:00.000Z",
      registryInputs: [registryInputForDetr()],
    });
    const sections = baseSections();
    const resultBundle = createResultBundle({
      base_hashes: {
        manifest: "sha256:legacy-manifest",
        artifact: "sha256:legacy-artifact",
        export: "sha256:legacy-export",
        metadata: "sha256:legacy-metadata",
        index: "sha256:legacy-index",
      },
    });
    const { runRoot } = await createRunWorkspace({
      sections,
      resultBundle,
    });

    const applyResult = await applyRunWorkspace({
      service,
      runRoot,
      resultBundle,
    });

    assert.equal((applyResult as any).status, "persisted");
    assert.include(
      ((applyResult as any).warnings || []) as string[],
      "create_base_hashes_ignored",
    );
  });

  it("rejects create when the target topic already exists", async function () {
    const root = await makeRoot("zs-topic-contract-root-");
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-18T00:00:00.000Z",
      registryInputs: [registryInputForDetr()],
    });
    const sections = baseSections();
    const { runRoot, resultBundle } = await createRunWorkspace({ sections });
    await applyRunWorkspace({ service, runRoot, resultBundle });

    const duplicate = await service.applyTopicSynthesisResult(resultBundle, {
      resultContext: resultContextForRunRoot(runRoot),
    } as any);

    assert.equal(duplicate.ok, false);
    assert.equal((duplicate as any).status, "topic_exists");
    assert.equal((duplicate as any).topicId, "object-detection");
  });

  it("preserves section hashes between current manifest and persisted section files", async function () {
    const root = await makeRoot("zs-topic-contract-root-");
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-18T00:00:00.000Z",
      registryInputs: [registryInputForDetr()],
    });
    const sections = baseSections();
    const { runRoot, resultBundle } = await createRunWorkspace({ sections });

    await applyRunWorkspace({ service, runRoot, resultBundle });
    const paths = buildSynthesisStoragePaths(root, "object-detection") as any;
    const manifest = await readJsonFile<JsonObject>(paths.currentManifest);

    for (const [section, entry] of Object.entries(manifest.sections)) {
      const sectionPath = path.join(
        paths.currentSectionsRoot,
        sectionFileName(section),
      );
      const sectionValue = await readJsonFile(sectionPath);
      assert.equal(
        (entry as any).hash,
        hashCanonicalJson(sectionValue),
        `manifest hash should match ${section}`,
      );
    }
    assert.equal(
      manifest.section_hashes.taxonomy,
      hashCanonicalJson(sections.taxonomy),
    );
    assert.equal(
      manifest.section_hashes.timeline_events,
      hashCanonicalJson(sections.timeline_events),
    );
  });

  it("rejects an output-schema-valid product before persistence when UI-critical sections are incomplete", async function () {
    const root = await makeRoot("zs-topic-contract-root-");
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-18T00:00:00.000Z",
      registryInputs: [registryInputForDetr()],
    });
    const sections = baseSections();
    sections.taxonomy = {
      ...(sections.taxonomy as JsonObject),
      summary: {},
    };
    const { runRoot, resultBundle } = await createRunWorkspace({ sections });

    assertValidOutputSchema(resultBundle);
    try {
      runCreateSkillFinalValidation(runRoot, sections);
      assert.fail(
        "expected package-local validate_final_artifacts to reject incomplete taxonomy",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.message}\n${(error as any).stderr?.toString?.() || ""}`
          : String(error);
      assert.match(message, /taxonomy\.summary/i);
    }
    const hostValidation = validateTopicSynthesisArtifact(
      assembleTopicArtifact({
        manifest: createAnalysisManifest(sections),
        sections,
      }),
      { expectedLanguage: "zh-CN" },
    );
    assert.isFalse(hostValidation.ok);
    assert.match(hostValidation.errors.join("; "), /taxonomy\.summary/i);

    try {
      await applyRunWorkspace({ service, runRoot, resultBundle });
      assert.fail("expected invalid structured artifact to be rejected");
    } catch (error) {
      assert.match(
        error instanceof Error ? error.message : String(error),
        /invalid topic synthesis artifact|taxonomy\.summary/i,
      );
    }
    const paths = buildSynthesisStoragePaths(root, "object-detection") as any;
    try {
      await fs.stat(paths.currentArtifact);
      assert.fail("expected current artifact not to be written");
    } catch (error: any) {
      assert.equal(error?.code, "ENOENT");
    }
  });

  it("rejects final artifacts without synthesis_report title before writing final outputs", async function () {
    const sections = baseSections();
    delete (sections.synthesis_report as JsonObject).title;
    const { runRoot } = await createRunWorkspace({ sections });
    const before = await fs.readFile(
      path.join(runRoot, "result", "result.json"),
      "utf8",
    );

    const errorMessage = captureCreateSkillFinalValidationError(
      runRoot,
      sections,
    );

    assert.match(errorMessage, /synthesis_report\.title/i);
    const after = await fs.readFile(
      path.join(runRoot, "result", "result.json"),
      "utf8",
    );
    assert.equal(after, before);
  });

  it("rejects shallow synthesis_report bodies in package-local final validation", async function () {
    const sections = baseSections();
    (sections.synthesis_report as JsonObject).body =
      "This report mentions routes, history, findings, debates, gaps, coverage, and external literature, but remains too shallow.";
    const { runRoot } = await createRunWorkspace({ sections });

    const errorMessage = captureCreateSkillFinalValidationError(
      runRoot,
      sections,
    );

    assert.match(errorMessage, /synthesis_report body/i);
  });

  it("allows validate_final_artifacts to repair polluted final result files", async function () {
    const sections = baseSections();
    const { runRoot } = await createRunWorkspace({ sections });
    const first = runCreateSkillFinalValidation(runRoot, sections);
    assert.equal(first.final_path, "result/result.json");
    await fs.writeFile(
      path.join(runRoot, "result", "result.json"),
      '{"polluted":true}\n',
      "utf8",
    );
    await writeJsonFile(runRoot, "result/sections/synthesis-report.json", {
      ...(sections.synthesis_report as JsonObject),
      body: `${(sections.synthesis_report as JsonObject).body}\n\nThis repaired section update remains schema-valid and verifies that validate_final_artifacts can rewrite final section hashes without being blocked by old section_outputs receipts.`,
    });

    const repaired = runCreateSkillFinalValidation(runRoot, sections);
    const finalBundle = await readJsonFile<JsonObject>(
      path.join(runRoot, "result", "result.json"),
    );

    assert.equal(repaired.final_path, "result/result.json");
    assert.equal(finalBundle.kind, "topic_synthesis");
    assert.notProperty(finalBundle, "__SKILL_DONE__");
  });

  it("merges an update_patch product into the previously persisted structured artifact", async function () {
    const root = await makeRoot("zs-topic-contract-root-");
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-18T00:00:00.000Z",
      registryInputs: [registryInputForDetr()],
    });
    const sections = baseSections();
    const initial = await createRunWorkspace({ sections });
    const initialApply = await applyRunWorkspace({
      service,
      runRoot: initial.runRoot,
      resultBundle: initial.resultBundle,
    });
    const currentClaimHash = (initialApply as any).hashes?.["section:claims"];
    assert.isString(currentClaimHash);
    assert.match(currentClaimHash, /^sha256:[a-f0-9]{64}$/);

    const paths = buildSynthesisStoragePaths(root, "object-detection") as any;
    const currentManifest = await readJsonFile<JsonObject>(
      paths.currentManifest,
    );
    const changedClaims = [
      {
        ...(sections.claims as any[])[0],
        text: "DETR-style detection shifts object detection toward query-based set prediction and makes matching a central design object.",
        analysis:
          "The patch keeps the same evidence but updates the claim wording to verify section replacement without changing unrelated sections.",
      },
    ];
    const patchManifest = {
      schema_id: "synthesis.topic_section_patch_manifest",
      schema_version: "2.0.0",
      operation: "update_patch",
      topic_id: "object-detection",
      language: "zh-CN",
      sidecars: currentManifest.sidecars,
      base: {
        current_manifest_hash:
          currentManifest.manifest_hash || currentManifest.hash || "",
        current_artifact_hash: currentManifest.artifact_hash,
        read_section_hashes: {
          claims: currentClaimHash,
        },
        replace_section_hashes: {
          claims: currentClaimHash,
        },
      },
      patch: {
        mode: "section_replace",
        changed_sections: ["claims"],
        unchanged_section_policy: "inherit_current",
        sections: {
          claims: {
            path: "result/sections/claims.json",
            hash: hashCanonicalJson(changedClaims),
            content_type: "json",
          },
        },
      },
      diagnostics: {
        requires_full_update: false,
      },
    };
    const patchBundle = {
      __SKILL_DONE__: true,
      kind: "topic_synthesis",
      operation: "update_patch",
      topic_id: "object-detection",
      language: "zh-CN",
      read_section_hashes: {
        claims: currentClaimHash,
      },
      analysis_manifest_path: "result/topic-analysis.patch.json",
      artifact_metadata: {
        topic_id: "object-detection",
        update_reason: "contract_pipeline_patch_test",
      },
    };
    const runRoot = await makeRoot("zs-topic-contract-patch-run-");
    await writeJsonFile(runRoot, "result/result.json", patchBundle);
    await writeJsonFile(
      runRoot,
      "result/topic-analysis.patch.json",
      patchManifest,
    );
    await writeJsonFile(runRoot, "result/sections/claims.json", changedClaims);
    await writeJsonFile(
      runRoot,
      "result/sidecars/concept-cards-proposal.json",
      {
        schema_id: "synthesis.concept_cards_proposal",
        schema_version: "1.0.0",
        cards: [],
        diagnostics: [],
      },
    );
    await writeJsonFile(
      runRoot,
      "result/sidecars/topic-interest-metadata.json",
      {
        schema: "topic_interest_metadata.v1",
        topic_id: "object-detection",
        include_terms: ["object detection", "DETR"],
        must_have_terms: ["object detection"],
        methods: ["DETR"],
        exclude_terms: [],
        seed_literature_item_ids: ["lit:detr"],
        diagnostics: [],
      },
    );
    await writeJsonFile(
      runRoot,
      "result/sidecars/topic-graph-relation-proposals.json",
      {
        schema_id: "synthesis.topic_graph_relation_proposals",
        schema_version: "1.0.0",
        source_topic_id: "object-detection",
        proposals: [],
        diagnostics: [],
      },
    );

    const patchResult = await applyRunWorkspace({
      service,
      runRoot,
      resultBundle: patchBundle,
    });
    const nextManifest = await readJsonFile<JsonObject>(paths.currentManifest);
    const nextArtifact = await readJsonFile<JsonObject>(paths.currentArtifact);

    assert.equal((patchResult as any).status, "persisted");
    assert.equal(nextArtifact.claims[0].text, changedClaims[0].text);
    assert.equal(
      nextArtifact.taxonomy.summary.text,
      (sections.taxonomy as any).summary.text,
    );
    assert.notEqual(
      nextManifest.section_hashes.claims,
      currentManifest.section_hashes.claims,
    );
    assert.equal(
      nextManifest.section_hashes.taxonomy,
      currentManifest.section_hashes.taxonomy,
    );
  });
});
