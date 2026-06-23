import { assert } from "chai";
import Ajv from "ajv/dist/2020";
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
  return JSON.parse(fsSync.readFileSync(pathValue, "utf8"));
}

function validateWithSchema(schemaPath: string, value: unknown) {
  const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: false });
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
          source_paper_refs: ["1:DETR"],
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
          source_paper_refs: ["1:DETR"],
        },
      ],
    },
    claims: [
      {
        id: "claim:set-prediction-shift",
        text: "DETR-style detection shifts the central modeling unit from hand-designed proposals to learned object queries.",
        analysis:
          "The fixture claim is supported by DETR's direct set prediction formulation and its use of bipartite matching. This is a synthesis-level claim because it interprets the method as a route shift rather than restating a paper title.",
        source_paper_refs: ["1:DETR"],
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
    improvement_dimensions: [
      {
        id: "dim:set-prediction-formulation",
        label: "Set-prediction formulation",
        analysis:
          "DETR improves the modeling formulation by replacing proposal and NMS-heavy detector pipelines with learned object queries and bipartite matching.",
        problem_addressed: "Hand-designed detection pipeline components.",
        improvement_mechanism: "Object queries and bipartite matching.",
        source_paper_refs: ["1:DETR"],
        route_refs: ["route:set-prediction"],
      },
    ],
    debates: [
      {
        id: "debate:end-to-end-practicality",
        title:
          "Whether end-to-end detection simplicity offsets early training cost",
        positions: [
          {
            stance:
              "End-to-end set prediction simplifies the detection pipeline and removes post-processing dependencies.",
            source_paper_refs: ["1:DETR"],
          },
          {
            stance:
              "Early query-based detectors still face convergence and efficiency costs that later work must address.",
            source_paper_refs: ["1:DETR"],
          },
        ],
        source_paper_refs: ["1:DETR"],
        evaluation_axis: "Conceptual simplicity versus training practicality.",
        current_judgment:
          "The fixture supports the existence of the tradeoff but not a field-wide resolution.",
        uncertainty:
          "A full judgment would require additional later DETR variants and non-DETR baselines.",
      },
    ],
    future_directions: [
      {
        id: "future:traditional-detector-background",
        direction_type: "data_or_benchmark_need",
        title: "Traditional detector background is under-covered",
        current_limitation:
          "The fixture lacks first-hand digests for non-DETR detector families.",
        future_direction:
          "Collect representative proposal-based, anchor-based, and anchor-free detector papers.",
        rationale:
          "The fixture validates protocol flow but lacks first-hand digests for Faster R-CNN, YOLO, and anchor-free detectors.",
        source_paper_refs: ["1:DETR"],
        severity: "high",
        recommended_action:
          "Add representative proposal-based and anchor-free detector papers before using this as a real review source.",
        not_field_wide_claim: true,
      },
    ],
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
      coverage_reason:
        "The fixture covers one DETR-style route and intentionally leaves traditional detector background as a collection suggestion.",
      coverage_caveats: [
        "Fixture content should not be treated as a complete domain synthesis.",
      ],
      external_context_summary:
        "External detector background is represented as future collection direction rather than embedded primary evidence.",
      suggested_collection_directions: [
        "Add first-hand digest coverage for Faster R-CNN, YOLO, and anchor-free detectors.",
      ],
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
      topic_importance:
        "Object detection is a core visual perception task, and DETR-style methods changed its modeling assumptions.",
      writing_strategies: [
        {
          id: "strategy:set-prediction-route",
          title: "Query-based set prediction route",
          review_thesis:
            "DETR-style detection can be reviewed as a shift from proposal pipelines toward query-based set prediction.",
          writing_strategy:
            "Start from the detection task boundary, contrast proposal pipelines, then explain object queries and bipartite matching as the route shift.",
          best_for:
            "A Related Work section that needs a compact route-level explanation.",
          risks:
            "The fixture only has one source paper, so the writing strategy must not claim full field coverage.",
          section_plan: [
            "Task boundary",
            "Pipeline contrast",
            "Set-prediction route",
          ],
          source_paper_refs: ["1:DETR"],
        },
      ],
      recommended_strategy_id: "strategy:set-prediction-route",
      introduction_logic: [
        {
          id: "intro:route-shift",
          purpose:
            "Explain why object detection can be introduced as a shift from pipeline engineering to set prediction.",
          source_sections: ["topic", "claims"],
          candidate_citations: ["1:DETR"],
          source_paper_refs: ["1:DETR"],
        },
      ],
      related_work_logic: [
        {
          id: "rw:set-prediction-route",
          purpose:
            "Organize Related Work around the query-based set-prediction route.",
          organization: "method route",
          source_sections: [
            "taxonomy",
            "timeline_events",
            "improvement_dimensions",
          ],
          candidate_citations: ["1:DETR"],
          source_paper_refs: ["1:DETR"],
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
      body: "This fixture synthesis defines object detection through a narrow DETR-style set-prediction lens so that the skill, workflow, host, and Workbench contracts can be tested together. The research-route chapter is grounded in taxonomy.summary: it identifies end-to-end set prediction as the route that replaces hand-designed proposals and post-processing with object queries and bipartite matching. The historical-progress chapter is grounded in timeline_events.summary: it treats DETR as a 2020 milestone that establishes the route and creates the later problem chain around convergence, attention efficiency, and deployment. The claim, improvement-dimension, debate, gap, external literature, coverage, statistics, and review outline sections remain deliberately compact, but each preserves evidence references and diagnostics so downstream UI and writing workflows can consume the artifact without relying on Markdown fields.",
    },
    source_papers: [
      {
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
    artifact_manifest_path: "result/topic-synthesis-artifacts.json",
    ...overrides,
  };
}

function createArtifactManifest(sections: Record<string, unknown>) {
  return {
    resolver_manifest: "runtime/payloads/resolver.json",
    topic_analysis: "result/topic-analysis.json",
    final_output_candidate: "result/final-output.candidate.json",
    ...Object.fromEntries(
      Object.keys(sections).map((section) => [
        `${section}_section`,
        `result/sections/${sectionFileName(section)}`,
      ]),
    ),
    topic_interest_metadata_sidecar:
      "result/sidecars/topic-interest-metadata.json",
    concept_cards_proposal_sidecar:
      "result/sidecars/concept-cards-proposal.json",
    topic_graph_relation_proposals_sidecar:
      "result/sidecars/topic-graph-relation-proposals.json",
    prospective_topic_relation_proposals_sidecar:
      "result/sidecars/prospective-topic-relation-proposals.json",
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
      prospective_topic_relation_proposals: {
        path: "result/sidecars/prospective-topic-relation-proposals.json",
        hash: hashCanonicalJson({
          schema_id: "synthesis.prospective_topic_relation_proposals",
          schema_version: "1.0.0",
          proposals: [],
        }),
        content_type: "json",
        schema_id: "synthesis.prospective_topic_relation_proposals",
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
      tag: { and: ["topic:object-detection"] },
      combine: "union",
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
  await writeJsonFile(runRoot, "result/final-output.candidate.json", {
    ...resultBundle,
    __SKILL_DONE__: true,
  });
  await writeJsonFile(runRoot, "result/topic-analysis.json", analysisManifest);
  await writeJsonFile(
    runRoot,
    "result/topic-synthesis-artifacts.json",
    createArtifactManifest(args.sections),
  );
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
  await writeJsonFile(
    runRoot,
    "result/sidecars/prospective-topic-relation-proposals.json",
    {
      schema_id: "synthesis.prospective_topic_relation_proposals",
      schema_version: "1.0.0",
      proposals: [],
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
      defaultPath: string;
    }) {
      const relativePath = args.rawPath || args.defaultPath;
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
  const artifact = assembleTopicArtifact({
    manifest: createAnalysisManifest(sections),
    sections,
  }) as Record<string, unknown>;
  const hostResult = validateTopicSynthesisArtifact(artifact, {
    expectedLanguage: "zh-CN",
  });
  if (!hostResult.ok) {
    throw new Error(hostResult.errors.join("; "));
  }
  const finalPath = path.join(runRoot, "result", "final-output.candidate.json");
  const raw = fsSync.existsSync(finalPath)
    ? JSON.parse(fsSync.readFileSync(finalPath, "utf8"))
    : createResultBundle();
  const schemaPayload = { ...raw };
  delete schemaPayload.__SKILL_DONE__;
  const schemaResult = validateWithSchema(
    "skills_builtin/topic-synthesis-finalize/assets/output.schema.json",
    schemaPayload,
  );
  if (!schemaResult.ok) {
    throw new Error(schemaResult.errors.join("; "));
  }
  return { final_path: "result/final-output.candidate.json" };
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
  const skillRoot = path.resolve("skills_builtin/topic-synthesis-core-enrichment");
  const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");
  fsSync.mkdirSync(path.dirname(dbPath), { recursive: true });
  void sections;
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
  const fullPayloadPath = path.join(args.runRoot, args.payloadPath);
  fsSync.mkdirSync(path.dirname(fullPayloadPath), { recursive: true });
  fsSync.writeFileSync(
    fullPayloadPath,
    `${JSON.stringify(args.payload, null, 2)}\n`,
    "utf8",
  );
  if (args.action === "persist_core_synthesis") {
    const result = validateWithSchema(
      "skills_builtin/topic-synthesis-core-enrichment/assets/schemas/stage-40-core-synthesis.schema.json",
      args.payload,
    );
    if (!result.ok) {
      throw new Error(`payload schema validation failed: ${result.errors.join("; ")}`);
    }
    return {
      result: {
        concept_candidate_count:
          ((args.payload as JsonObject).concept_candidate_labels as unknown[])
            ?.length || 0,
      },
    };
  }
  if (args.action === "persist_kg_enrichment") {
    const result = validateWithSchema(
      "skills_builtin/topic-synthesis-core-enrichment/assets/schemas/stage-50-kg-enrichment.schema.json",
      args.payload,
    );
    if (!result.ok) {
      throw new Error(`payload schema validation failed: ${result.errors.join("; ")}`);
    }
    const payload = args.payload as JsonObject;
    fsSync.mkdirSync(path.join(args.runRoot, "result/sidecars"), {
      recursive: true,
    });
    fsSync.writeFileSync(
      path.join(args.runRoot, "result/sidecars/concept-cards-proposal.json"),
      `${JSON.stringify(
        {
          schema_id: "synthesis.concept_cards_proposal",
          schema_version: "1.0.0",
          cards: payload.concept_details || [],
          diagnostics: [],
        },
        null,
        2,
      )}\n`,
    );
    fsSync.writeFileSync(
      path.join(args.runRoot, "result/sidecars/topic-graph-relation-proposals.json"),
      `${JSON.stringify(
        {
          schema_id: "synthesis.topic_graph_relation_proposals",
          schema_version: "1.0.0",
          source_topic_id: "object-detection",
          proposals: payload.existing_topic_relation_proposals || [],
          diagnostics: [],
        },
        null,
        2,
      )}\n`,
    );
    fsSync.writeFileSync(
      path.join(
        args.runRoot,
        "result/sidecars/prospective-topic-relation-proposals.json",
      ),
      `${JSON.stringify(
        {
          schema_id: "synthesis.prospective_topic_relation_proposals",
          schema_version: "1.0.0",
          proposals: payload.prospective_topic_relation_proposals || [],
        },
        null,
        2,
      )}\n`,
    );
    const terms = (payload.topic_matching_terms as JsonObject) || {};
    fsSync.writeFileSync(
      path.join(args.runRoot, "result/sidecars/topic-interest-metadata.json"),
      `${JSON.stringify(
        {
          schema: "topic_interest_metadata.v1",
          topic_id: "object-detection",
          include_terms: terms.include_terms || [],
          must_have_terms: terms.must_have_terms || [],
          methods: terms.methods || [],
          exclude_terms: terms.exclude_terms || [],
          seed_literature_item_ids: ["lit:detr"],
          diagnostics: [],
        },
        null,
        2,
      )}\n`,
    );
    return {
      result: {
        concept_cards_proposal_path:
          "result/sidecars/concept-cards-proposal.json",
        topic_interest_metadata_path:
          "result/sidecars/topic-interest-metadata.json",
      },
    };
  }
  if (args.action === "finalize_summary_coverage") {
    const result = validateWithSchema(
      "skills_builtin/topic-synthesis-finalize/assets/schemas/stage-60-coverage-and-collection-suggestions.schema.json",
      args.payload,
    );
    if (!result.ok) {
      throw new Error(`payload schema validation failed: ${result.errors.join("; ")}`);
    }
    fsSync.mkdirSync(path.join(args.runRoot, "result/sections"), {
      recursive: true,
    });
    fsSync.writeFileSync(
      path.join(args.runRoot, "result/sections/coverage.json"),
      `${JSON.stringify(args.payload, null, 2)}\n`,
    );
    return { result: { coverage_path: "result/sections/coverage.json" } };
  }
  throw new Error(`unsupported current stage action: ${args.action}`);
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

function coreSectionsPayload(sections: Record<string, unknown>) {
  const route = JSON.parse(
    JSON.stringify(((sections.taxonomy as JsonObject).nodes as unknown[])[0]),
  );
  route.title = route.title || route.label;
  delete route.label;
  const taxonomy = {
    summary: (sections.taxonomy as JsonObject).summary,
    axes: [
      {
        axis_type: "research_route",
        axis_rationale:
          "The route axis keeps the minimal fixture aligned with current stage-40 schema.",
        nodes: [route],
      },
      {
        axis_type: "technical_mechanism",
        axis_rationale:
          "The mechanism axis expresses the object-query and matching mechanism explicitly.",
        nodes: [
          {
            ...route,
            id: "mechanism:query-set-prediction",
            title: "Object-query set prediction",
          },
        ],
      },
    ],
  };
  const improvementDimensions = (sections.improvement_dimensions as JsonObject[]).map(
    (entry) => ({
      id: entry.id,
      title: entry.title || entry.label,
      analysis: entry.analysis,
      source_paper_refs: entry.source_paper_refs,
    }),
  );
  const claims = (sections.claims as JsonObject[]).map((entry) => ({
    id: entry.id,
    text: entry.text,
    analysis: entry.analysis,
    scope: entry.scope,
    limitations: entry.limitations,
    source_paper_refs: entry.source_paper_refs,
  }));
  return {
    taxonomy,
    timeline_events: sections.timeline_events,
    claims,
    improvement_dimension_summary: {
      summary:
        "The fixture highlights replacing hand-designed detection pipeline components with direct set prediction.",
    },
    improvement_dimensions: improvementDimensions,
    debates: (sections.debates as JsonObject[]).map((entry) => ({
      id: entry.id,
      title: entry.title,
      current_judgment: entry.current_judgment,
      source_paper_refs: entry.source_paper_refs,
    })),
    future_directions: sections.future_directions,
    review_outline: {
      topic_importance: (sections.review_outline as JsonObject)
        .topic_importance,
      writing_strategies: (sections.review_outline as JsonObject)
        .writing_strategies,
      recommended_strategy_id: (sections.review_outline as JsonObject)
        .recommended_strategy_id,
    },
    concept_candidate_labels: [
      "object query",
      "bipartite matching",
      "set prediction detector",
    ],
  };
}

function kgEnrichmentPayload() {
  return {
    concept_details: [],
    existing_topic_relation_proposals: [],
    prospective_topic_relation_proposals: [],
    topic_matching_terms: {
      include_terms: ["object detection", "DETR"],
      must_have_terms: ["object detection"],
      methods: ["DETR"],
      exclude_terms: ["semantic segmentation"],
    },
  };
}

function finalizeSummaryCoveragePayload(sections: Record<string, unknown>) {
  return {
    coverage_verdict: (sections.coverage as JsonObject).coverage_verdict,
    coverage_reason: (sections.coverage as JsonObject).coverage_reason,
    coverage_caveats: ((sections.coverage as JsonObject)
      .coverage_caveats as string[]).map((note) => ({
      type: "library_coverage_gap",
      note,
    })),
    external_context_summary: (sections.coverage as JsonObject)
      .external_context_summary,
    suggested_collection_directions: [
      {
        direction:
          "Add proposal-based and anchor-free detector background papers.",
        reason:
          "These papers explain the pipeline that query-based set prediction reacts against.",
        example_titles_or_terms: ["Faster R-CNN", "YOLO", "anchor-free"],
        priority: "high",
      },
    ],
  };
}

function assertValidOutputSchema(value: unknown) {
  const schemaPayload = { ...(value as JsonObject) };
  delete schemaPayload.__SKILL_DONE__;
  const result = validateWithSchema(
    "skills_builtin/topic-synthesis-finalize/assets/output.schema.json",
    schemaPayload,
  );
  assert.isTrue(result.ok, result.errors.join("; "));
}

function assertValidArtifactSchema(value: unknown) {
  const hostResult = validateTopicSynthesisArtifact(value, {
    expectedLanguage: "zh-CN",
  });
  assert.isTrue(hostResult.ok, hostResult.errors.join("; "));
}

describe("Topic synthesis contract pipeline", function () {
  this.timeout(10000);

  it("rejects shallow taxonomy/timeline content in the core synthesis payload", async function () {
    const runRoot = await makeRoot("zs-topic-core-taxonomy-run-");
    const sections = baseSections();
    const { dbPath } = initializeCreateStageValidationDb(runRoot, sections);
    const invalid = coreSectionsPayload(sections);
    delete (((invalid.taxonomy as JsonObject).axes as JsonObject[])[0]
      .nodes as JsonObject[])[0].mechanism;

    const message = captureCreateStageActionError({
      runRoot,
      dbPath,
      action: "persist_core_synthesis",
      payloadPath: "runtime/payloads/core-analytical-sections.json",
      payload: invalid,
    });

    assert.match(message, /mechanism/i);
  });

  it("rejects shallow core analytical sections at Stage 8 before final validation", async function () {
    const runRoot = await makeRoot("zs-topic-stage8-run-");
    const sections = baseSections();
    const { dbPath } = initializeCreateStageValidationDb(runRoot, sections);
    const invalid = coreSectionsPayload(sections);
    delete ((invalid.claims as JsonObject[])[0] as JsonObject).analysis;

    const message = captureCreateStageActionError({
      runRoot,
      dbPath,
      action: "persist_core_synthesis",
      payloadPath: "runtime/payloads/core-analytical-sections.json",
      payload: invalid,
    });

    assert.match(message, /claim.*analysis|analysis\/rationale/i);
  });

  it("persists required-form KG enrichment sidecars after core sections", async function () {
    const runRoot = await makeRoot("zs-topic-kg-enrichment-run-");
    const sections = baseSections();
    const { dbPath } = initializeCreateStageValidationDb(runRoot, sections);
    runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_core_synthesis",
      payloadPath: "runtime/payloads/core-analytical-sections.json",
      payload: coreSectionsPayload(sections),
    });

    const result = runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_kg_enrichment",
      payloadPath: "runtime/payloads/kg-enrichment.json",
      payload: kgEnrichmentPayload(),
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
    assert.deepEqual(topicInterestMetadata.include_terms, [
      "object detection",
      "DETR",
    ]);
    assert.notInclude(
      topicInterestMetadata.diagnostics as string[],
      "topic_interest_metadata_derived_from_topic_definition",
    );
  });

  it("rejects Stage 9 KG enrichment payloads without topic interest metadata", async function () {
    const runRoot = await makeRoot("zs-topic-kg-enrichment-missing-metadata-");
    const sections = baseSections();
    const { dbPath } = initializeCreateStageValidationDb(runRoot, sections);
    runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_core_synthesis",
      payloadPath: "runtime/payloads/core-analytical-sections.json",
      payload: coreSectionsPayload(sections),
    });

    const message = captureCreateStageActionError({
      runRoot,
      dbPath,
      action: "persist_kg_enrichment",
      payloadPath: "runtime/payloads/kg-enrichment.json",
      payload: {
        schema_id: "synthesis.topic_synthesis_kg_enrichment",
        schema_version: "1.0.0",
        concept_details: [],
        topic_relation_candidates: [],
      },
    });

    assert.match(message, /topic_matching_terms/i);
  });

  it("prevalidates Stage 10 payload and materializes sections only after it passes", async function () {
    const runRoot = await makeRoot("zs-topic-stage9-run-");
    const sections = baseSections();
    const { dbPath } = initializeCreateStageValidationDb(runRoot, sections);
    runCreateStageAction({
      runRoot,
      dbPath,
      action: "persist_core_synthesis",
      payloadPath: "runtime/payloads/core-analytical-sections.json",
      payload: coreSectionsPayload(sections),
    });
    const invalid = finalizeSummaryCoveragePayload(sections);
    (invalid as JsonObject).taxonomy = {};

    const message = captureCreateStageActionError({
      runRoot,
      dbPath,
      action: "finalize_summary_coverage",
      payloadPath: "runtime/payloads/external-statistics-report.json",
      payload: invalid,
    });

    assert.match(message, /additional properties|unknown/i);
    try {
      await fs.access(
        path.join(runRoot, "result/sections/coverage.json"),
      );
      assert.fail(
        "Stage 60 should not materialize coverage after failed prevalidation",
      );
    } catch {
      // expected
    }

    const valid = runCreateStageAction({
      runRoot,
      dbPath,
      action: "finalize_summary_coverage",
      payloadPath: "runtime/payloads/external-statistics-report.json",
      payload: finalizeSummaryCoveragePayload(sections),
    });

    assert.equal(valid.result.coverage_path, "result/sections/coverage.json");
    const materialized = await readJsonFile<JsonObject>(
      path.join(runRoot, "result/sections/coverage.json"),
    );
    assert.equal(
      materialized.coverage_verdict,
      (sections.coverage as JsonObject).coverage_verdict,
    );
    assert.isArray(materialized.suggested_collection_directions);
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
    assert.equal(
      runtimeValidation.final_path,
      "result/final-output.candidate.json",
    );
    const resultBundle = await readJsonFile<JsonObject>(
      path.join(runRoot, "result", "final-output.candidate.json"),
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
    assert.equal(persistedMetadataEnvelope.data.paper_count, 1);
    assert.deepEqual(persistedClaims, sections.claims);
    assert.equal(detail.title, "Object Detection");
    assert.equal(
      detail.taxonomy.summary.text,
      (sections.taxonomy as any).summary.text,
    );
    assert.lengthOf(detail.timeline_events.events, 1);
    assert.equal(detail.claims[0].source_paper_refs[0], "1:DETR");
    assert.equal(
      detail.source_papers[0].digest_ref.payload_hash,
      hashMarkdown(DIGEST_MARKDOWN),
    );
    assert.equal(detail.coverage.coverage_verdict, "partial");
    assert.lengthOf(detail.future_directions, 1);
    assert.equal(detail.statistics.paper_count, 1);
    assert.include(detail.synthesis_report.body, "taxonomy.summary");
    assert.isOk(row);
    assert.equal((row as any).paper_count, 1);
    assert.equal((row as any).external_literature_count, 0);
  });

  it("ignores create base hashes when the target topic is absent", async function () {
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
        manifest: "sha256:create-manifest",
        artifact: "sha256:create-artifact",
        export: "sha256:create-export",
        metadata: "sha256:create-metadata",
        index: "sha256:create-index",
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

  it("rejects final artifacts that omit synthesis_report title", async function () {
    const sections = baseSections();
    delete (sections.synthesis_report as JsonObject).title;
    const { runRoot } = await createRunWorkspace({ sections });

    const message = captureCreateSkillFinalValidationError(runRoot, sections);

    assert.match(message, /synthesis_report\.title/i);
  });

  it("rejects shallow synthesis_report bodies at the host boundary", async function () {
    const sections = baseSections();
    (sections.synthesis_report as JsonObject).body =
      "This report mentions routes, history, findings, debates, gaps, coverage, and external literature, but remains too shallow.";
    const { runRoot } = await createRunWorkspace({ sections });

    const message = captureCreateSkillFinalValidationError(runRoot, sections);

    assert.match(message, /synthesis_report body/i);
  });

  it("rejects polluted final result files at the finalize output schema", async function () {
    const sections = baseSections();
    const { runRoot } = await createRunWorkspace({ sections });
    const first = runCreateSkillFinalValidation(runRoot, sections);
    assert.equal(first.final_path, "result/final-output.candidate.json");
    await fs.writeFile(
      path.join(runRoot, "result", "final-output.candidate.json"),
      '{"polluted":true}\n',
      "utf8",
    );

    const message = captureCreateSkillFinalValidationError(runRoot, sections);

    assert.match(message, /kind|oneOf|topic_synthesis/i);
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
    await writeJsonFile(runRoot, "result/final-output.candidate.json", {
      ...patchBundle,
      __SKILL_DONE__: true,
    });
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
    await writeJsonFile(
      runRoot,
      "result/sidecars/prospective-topic-relation-proposals.json",
      {
        schema_id: "synthesis.prospective_topic_relation_proposals",
        schema_version: "1.0.0",
        proposals: [],
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
