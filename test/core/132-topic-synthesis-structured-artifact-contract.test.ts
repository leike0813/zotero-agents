import { assert } from "chai";
import Ajv from "ajv";
import { readFileSync } from "fs";

type AnyModule = Record<string, any> & { __loadError?: unknown };

async function importOptional(modulePath: string): Promise<AnyModule> {
  try {
    return (await import(modulePath)) as AnyModule;
  } catch (error) {
    return { __loadError: error };
  }
}

function requireExport(module: AnyModule, exportName: string) {
  assert.isUndefined(
    module.__loadError,
    `expected structured topic artifact module to load before checking ${exportName}: ${
      module.__loadError instanceof Error
        ? module.__loadError.message
        : String(module.__loadError)
    }`,
  );
  assert.isFunction(
    module[exportName],
    `expected synthesis structured artifact module to export ${exportName}`,
  );
  return module[exportName] as (...args: any[]) => any;
}

function topicArtifactSchema() {
  return JSON.parse(
    readFileSync(
      "skills_builtin/create-topic-synthesis/assets/schemas/topic_synthesis_artifact.schema.json",
      "utf8",
    ),
  );
}

function validateWithTopicArtifactSchema(value: unknown) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(topicArtifactSchema());
  const ok = validate(value);
  return {
    ok,
    errors:
      validate.errors?.map(
        (error) => `${error.instancePath} ${error.message}`,
      ) ?? [],
  };
}

function completeSidecars() {
  return {
    topic_interest_metadata: {
      path: "result/sidecars/topic-interest-metadata.json",
      hash: "sha256:topic-interest-metadata",
      content_type: "json",
      schema_id: "topic_interest_metadata.v1",
    },
    concept_cards_proposal: {
      path: "result/sidecars/concept-cards-proposal.json",
      hash: "sha256:concept-cards-proposal",
      content_type: "json",
      schema_id: "synthesis.concept_cards_proposal",
    },
    topic_graph_relation_proposals: {
      path: "result/sidecars/topic-graph-relation-proposals.json",
      hash: "sha256:topic-graph-relation-proposals",
      content_type: "json",
      schema_id: "synthesis.topic_graph_relation_proposals",
    },
  };
}

function completeSectionManifest(overrides: Record<string, unknown> = {}) {
  return {
    schema_id: "synthesis.topic_analysis_manifest",
    schema_version: "2.0.0",
    operation: "create",
    topic_id: "object-detection",
    language: "zh-CN",
    created_at: "2026-05-16T00:00:00.000Z",
    sidecars: completeSidecars(),
    sections: {
      topic: {
        path: "result/sections/topic.json",
        hash: "sha256:topic",
        content_type: "json",
      },
      summary: {
        path: "result/sections/summary.json",
        hash: "sha256:summary",
        content_type: "json",
      },
      claims: {
        path: "result/sections/claims.json",
        hash: "sha256:claims",
        content_type: "json",
      },
      positioning: {
        path: "result/sections/positioning.json",
        hash: "sha256:positioning",
        content_type: "json",
      },
      taxonomy: {
        path: "result/sections/taxonomy.json",
        hash: "sha256:taxonomy",
        content_type: "json",
      },
      comparison_matrix: {
        path: "result/sections/comparison-matrix.json",
        hash: "sha256:comparison",
        content_type: "json",
      },
      debates: {
        path: "result/sections/debates.json",
        hash: "sha256:debates",
        content_type: "json",
      },
      review_outline: {
        path: "result/sections/review-outline.json",
        hash: "sha256:outline",
        content_type: "json",
      },
      statistics: {
        path: "result/sections/statistics.json",
        hash: "sha256:statistics",
        content_type: "json",
      },
      synthesis_report: {
        path: "result/sections/synthesis-report.json",
        hash: "sha256:report",
        content_type: "json",
      },
      evidence_map: {
        path: "result/sections/evidence-map.json",
        hash: "sha256:evidence-map",
        content_type: "json",
      },
      timeline_events: {
        path: "result/sections/timeline-events.json",
        hash: "sha256:timeline",
        content_type: "json",
      },
      paper_evidence: {
        path: "result/sections/paper-evidence.json",
        hash: "sha256:evidence",
        content_type: "json",
      },
      external_literature_analysis: {
        path: "result/sections/external-literature-analysis.json",
        hash: "sha256:external",
        content_type: "json",
      },
      coverage: {
        path: "result/sections/coverage.json",
        hash: "sha256:coverage",
        content_type: "json",
      },
      gaps: {
        path: "result/sections/gaps.json",
        hash: "sha256:gaps",
        content_type: "json",
      },
      source_artifacts: {
        path: "result/sections/source-artifacts.json",
        hash: "sha256:sources",
        content_type: "json",
      },
      diagnostics: {
        path: "result/sections/diagnostics.json",
        hash: "sha256:diagnostics",
        content_type: "json",
      },
    },
    ...overrides,
  };
}

function sectionPatchManifest(overrides: Record<string, unknown> = {}) {
  return {
    schema_id: "synthesis.topic_section_patch_manifest",
    schema_version: "2.0.0",
    operation: "update_patch",
    topic_id: "object-detection",
    language: "zh-CN",
    created_at: "2026-05-16T00:00:00.000Z",
    sidecars: completeSidecars(),
    base: {
      current_manifest_hash: "sha256:current-manifest",
      current_artifact_hash: "sha256:current-artifact",
      read_section_hashes: {
        claims: "sha256:old-claims",
        coverage: "sha256:old-coverage",
      },
      replace_section_hashes: {
        claims: "sha256:old-claims",
      },
    },
    patch: {
      mode: "section_replace",
      changed_sections: ["claims"],
      unchanged_section_policy: "inherit_current",
      sections: {
        claims: {
          path: "result/sections/claims.json",
          hash: "sha256:new-claims",
          content_type: "json",
        },
      },
    },
    diagnostics: {
      requires_full_update: false,
    },
    ...overrides,
  };
}

function structuredArtifact(overrides: Record<string, unknown> = {}) {
  return {
    schema_id: "synthesis.topic_synthesis_artifact",
    schema_version: "2.0.0",
    language: "zh-CN",
    topic: {
      id: "object-detection",
      title: "Object Detection",
      definition:
        "Object detection locates and classifies object instances in images.",
      discipline: "Computer Science",
      research_field: "Computer Vision",
      aliases: ["detection", "visual object detection"],
      topic_granularity: "task",
      scope_boundary: {
        include: ["object detection models"],
        exclude: ["generic image classification"],
        gray_zone: ["instance segmentation appears only as adjacent context"],
      },
    },
    summary: {
      brief: "对象检测主题综合。",
      overview:
        "该示例说明对象检测从传统 pipeline 走向端到端集合预测的最小结构化综合。",
      key_takeaways: ["DETR 提供 query-based set prediction 的代表性里程碑。"],
      route_count: 1,
      timeline_span: { start_year: 2020, end_year: 2020 },
      coverage_verdict: "partial",
    },
    claims: [
      {
        id: "claim:detector-evolution",
        text: "检测器从手工 proposal 走向端到端集合预测。",
        analysis:
          "该判断来自 DETR 对集合预测的范式引入以及后续路线围绕查询、匹配和收敛展开的连续改进。",
        evidence_refs: ["paper:1:DETR"],
        evidence_map_refs: ["claim:detector-evolution"],
        confidence: 0.8,
        scope: "示例 fixture 的最小对象检测 topic。",
        limitations: ["示例 fixture 只包含一篇库内 evidence。"],
        review_usage: "可作为介绍 set prediction 检测范式的段落主题句。",
      },
    ],
    timeline_events: {
      summary: {
        text: "对象检测的示例历史线索以 DETR 为最小里程碑，体现了从 pipeline 检测走向集合预测的范式变化。",
      },
      events: [
        {
          id: "event:detr",
          year: 2020,
          label: "DETR",
          description:
            "DETR 将检测问题转化为集合预测，为后续 query-based 路线提供起点。",
          phase: "paradigm_shift",
          why_it_matters: "它证明检测可以被重新表述为集合预测问题。",
          progression_logic:
            "后续工作主要围绕收敛速度、小目标性能和部署效率修正 DETR 的初始瓶颈。",
          follow_on_effect:
            "后续路线围绕 query、matching 和 efficiency 继续扩展。",
          evidence_refs: ["paper:1:DETR"],
          evidence_map_refs: ["claim:detector-evolution"],
        },
      ],
    },
    positioning: {
      importance: "对象检测是视觉感知系统的基础任务之一。",
      timeliness: "Transformer 检测器路线仍在围绕效率和部署持续发展。",
      field_position:
        "该 topic 位于 computer vision detection 与 transformer vision models 的交叉处。",
      review_position:
        "可用于说明检测器从传统 pipeline 到 query-based set prediction 的方法迁移。",
      scope_boundary: {
        covered: "DETR-style set prediction 示例路线。",
        not_covered: "完整传统检测器历史。",
      },
      evidence_map_refs: ["claim:detector-evolution"],
    },
    taxonomy: {
      primary_axis: "method route",
      axis_rationale:
        "对象检测方法的关键差异主要体现在候选生成、查询机制和匹配策略。",
      summary: {
        text: "示例 taxonomy 只包含 end-to-end set prediction 一条路线，用于验证路线 summary 与节点细节可以共同表达技术路线版图。",
      },
      nodes: [
        {
          id: "tax:end-to-end",
          label: "End-to-end set prediction",
          definition: "用查询和集合匹配替代 proposal/NMS pipeline 的路线。",
          core_problem: "降低检测 pipeline 中手工组件和后处理依赖。",
          mechanism:
            "Transformer decoder query 与 Hungarian matching 建立预测集合和目标集合的一一对应。",
          representative_papers: ["paper:1:DETR"],
          main_contributions: ["证明 set prediction detection 可行。"],
          strengths: ["结构统一"],
          limitations: ["早期收敛慢"],
          maturity: "概念验证后进入效率优化阶段",
          relation_to_other_routes:
            "与 anchor/proposal 路线构成端到端建模对照。",
          review_angle:
            "可用于 Related Work 中解释 query-based detection 的范式起点。",
          paper_refs: ["1:DETR"],
          evidence_map_refs: ["tax:end-to-end"],
        },
      ],
    },
    comparison_matrix: {
      dimensions: ["problem addressed", "core mechanism"],
      rows: [
        {
          id: "cmp:detr",
          paper_ref: "1:DETR",
          values: {
            "problem addressed": "object detection pipeline",
            "core mechanism": "set prediction with transformers",
          },
          evidence_map_refs: ["cmp:detr"],
        },
      ],
    },
    debates: [],
    review_outline: {
      introduction_logic: [
        {
          id: "intro:detector-shift",
          purpose: "说明对象检测建模方式变化。",
          source_sections: ["topic", "claims"],
          candidate_citations: ["paper:1:DETR"],
          evidence_map_refs: ["claim:detector-evolution"],
        },
      ],
      related_work_logic: [
        {
          id: "rw:set-prediction",
          purpose: "按 set prediction route 组织最小 Related Work。",
          organization: "按方法路线组织。",
          source_sections: ["taxonomy", "timeline_events"],
          evidence_map_refs: ["tax:end-to-end"],
        },
      ],
      body_sections: [
        {
          id: "outline:intro",
          title: "Introduction",
          role: "定位对象检测方法迁移。",
        },
      ],
    },
    evidence_map: {
      path: "runtime/payloads/cross-paper-evidence-map.json",
      hash: "sha256:evidence-map",
      candidate_counts: {
        taxonomy_candidates: 1,
        comparison_dimensions: 1,
        claim_candidates: 1,
        debate_candidates: 0,
        gap_candidates: 0,
        review_outline_seeds: 1,
      },
      candidate_ids: ["claim:detector-evolution", "tax:end-to-end", "cmp:detr"],
    },
    paper_evidence: [
      {
        id: "paper:1:DETR",
        paper_ref: "1:DETR",
        title: "End-to-End Object Detection with Transformers",
        evidence_summary: "提出 object queries 与二分图匹配的端到端检测范式。",
        digest_ref: {
          paper_ref: "1:DETR",
          item_ref: "zotero://select/items/1_DETR",
          note_key: "NOTEDETR",
          payload_type: "digest-markdown",
          payload_hash: "sha256:digest",
          updated_at: "2026-05-10T00:00:00.000Z",
        },
      },
    ],
    external_literature_analysis: {
      summary: "外部文献提供方法脉络和背景约束。",
      themes: [
        {
          id: "theme:transformers",
          title: "Transformer 背景",
          analysis:
            "Transformer attention 为 DETR 的 query/key/value 建模提供方法背景。",
          related_topic_aspect: "解释 DETR 使用 transformer decoder 的来源。",
          reference_ids: ["external:vaswani2017"],
        },
      ],
      coverage_verdict: "partial",
      coverage_reason: "示例 fixture 只覆盖一个外部 Transformer 背景主题。",
      suggested_additions: [
        {
          title: "Faster R-CNN",
          reason: "补充 proposal/anchor pipeline 背景。",
          priority: "high",
        },
      ],
      representative_references: [
        {
          id: "external:vaswani2017",
          title: "Attention Is All You Need",
          cited_by_papers: ["paper:1:DETR"],
          why_relevant: "提供 Transformer attention 的基础概念。",
          information_completeness: "partial",
        },
      ],
      citation_contexts: [],
      contribution_to_topic: "说明 DETR 借用 Transformer 的建模基础。",
      limitations: "库外证据不直接支撑主结论。",
    },
    coverage: {
      paper_count: 1,
      paper_evidence_count: 1,
      digest_coverage: "1/1",
      references_coverage: "1/1",
      citation_analysis_coverage: "1/1",
      route_coverage_summary: "仅覆盖 set prediction 示例路线。",
      claim_coverage_summary: "唯一 claim 有一篇库内 evidence 支撑。",
      timeline_coverage_summary: "仅包含 2020 年 DETR 示例事件。",
      coverage_verdict: "partial",
      external_literature_count: 1,
      warnings: ["示例 fixture 不代表完整对象检测领域。"],
    },
    statistics: {
      paper_count: 1,
      evidence_paper_count: 1,
      time_span: {
        start_year: 2020,
        end_year: 2020,
      },
      route_count: 1,
      route_coverage: "仅覆盖 end-to-end set prediction 示例路线。",
      coverage_verdict: "partial",
      external_reference_count: 1,
      suggested_addition_count: 1,
      citation_graph_role_counts: {
        core: 1,
        foundation: 1,
        frontier: 0,
      },
    },
    synthesis_report: {
      title: "Object Detection Topic Synthesis",
      source_section_chapters: {
        research_routes: "taxonomy.summary",
        historical_progression: "timeline_events.summary",
      },
      body: "对象检测 topic 的核心是从图像中定位并识别目标实例。该示例 artifact 只包含 DETR 这一条库内证据，因此它只能展示端到端集合预测路线的最小综合形态。DETR 的意义在于把检测从 proposal、anchor 和 NMS 组成的 pipeline 转向 query-based set prediction；这一变化为后续关于查询设计、匹配稳定性、收敛速度和部署效率的研究提供了共同问题框架。由于 fixture 证据有限，任何关于全领域路线覆盖、外部文献充分性和长期历史演进的判断都必须标记为 partial。报告仍然明确保留 topic 定义、路线分析、时间递进、核心结论、比较争议、覆盖缺口和库外文献建议这些维度，使 host validator 能验证完整协议而不是只接受一段简短摘要。它还说明 taxonomy.summary 如何承担研究路线章节的上游真源，timeline_events.summary 如何承担历史沿革章节的上游真源，并通过 coverage、statistics 与 external_literature_analysis 标记当前库内证据的局限和下一步入库建议。",
    },
    gaps: [],
    source_artifacts: [],
    diagnostics: {
      warnings: [],
    },
    ...overrides,
  };
}

describe("Topic synthesis structured artifact contract", function () {
  it("accepts complete section manifests without run-workspace markdown preview inputs [inv.topics.manifest_sidecars]", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicAnalysisManifest = requireExport(
      module,
      "validateTopicAnalysisManifest",
    );

    const result = validateTopicAnalysisManifest(completeSectionManifest());

    assert.isTrue(result.ok, result.errors?.join("; "));
    assert.equal(result.manifest.operation, "create");
    assert.equal(result.manifest.language, "zh-CN");
    assert.notProperty(result.manifest, "markdown_path");
  });

  it("rejects complete section manifests that still declare markdown_path", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicAnalysisManifest = requireExport(
      module,
      "validateTopicAnalysisManifest",
    );

    const result = validateTopicAnalysisManifest(
      completeSectionManifest({ markdown_path: "result/preview.md" }),
    );

    assert.isFalse(result.ok);
    assert.include(result.errors.join("; "), "markdown_path");
  });

  it("accepts section patch manifests with read-set CAS and inherit-current unchanged sections", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicAnalysisManifest = requireExport(
      module,
      "validateTopicAnalysisManifest",
    );

    const result = validateTopicAnalysisManifest(sectionPatchManifest());

    assert.isTrue(result.ok, result.errors?.join("; "));
    assert.equal(result.manifest.operation, "update_patch");
    assert.deepEqual(result.manifest.patch.changed_sections, ["claims"]);
    assert.equal(
      result.manifest.patch.unchanged_section_policy,
      "inherit_current",
    );
  });

  it("rejects field-level patch payloads, replacement outside read set, and patch markdown dependencies", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicAnalysisManifest = requireExport(
      module,
      "validateTopicAnalysisManifest",
    );

    const result = validateTopicAnalysisManifest(
      sectionPatchManifest({
        markdown_path: "result/patch-preview.md",
        base: {
          current_manifest_hash: "sha256:current-manifest",
          current_artifact_hash: "sha256:current-artifact",
          read_section_hashes: {
            coverage: "sha256:old-coverage",
          },
          replace_section_hashes: {
            claims: "sha256:old-claims",
          },
        },
        patch: {
          mode: "json_patch",
          changed_sections: ["claims"],
          unchanged_section_policy: "inherit_current",
          operations: [{ op: "replace", path: "/claims/0/text", value: "bad" }],
          sections: {
            claims: {
              path: "result/sections/claims.json",
              hash: "sha256:new-claims",
              content_type: "json",
            },
          },
        },
      }),
    );

    assert.isFalse(result.ok);
    assert.match(
      result.errors.join("\n"),
      /section_replace|read_section_hashes|markdown/i,
    );
  });

  it("rejects embedded markdown and missing required section paths", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicAnalysisManifest = requireExport(
      module,
      "validateTopicAnalysisManifest",
    );
    const manifest = completeSectionManifest({
      markdown: "# embedded markdown is forbidden",
      sections: {
        ...completeSectionManifest().sections,
        claims: {
          hash: "sha256:claims",
          content_type: "json",
        },
      },
    });

    const result = validateTopicAnalysisManifest(manifest);

    assert.isFalse(result.ok);
    assert.match(result.errors.join("\n"), /markdown|claims.*path/i);
  });

  it("validates language propagation into the materialized structured artifact", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const result = validateTopicSynthesisArtifact(structuredArtifact(), {
      expectedLanguage: "zh-CN",
    });

    assert.isTrue(result.ok, result.errors?.join("; "));
    assert.equal(result.artifact.language, "zh-CN");
  });

  it("validates complete topic synthesis products with the package schema", function () {
    const result = validateWithTopicArtifactSchema(structuredArtifact());

    assert.isTrue(result.ok, result.errors.join("\n"));
  });

  it("rejects final reports without title or sufficient depth at the host boundary", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const missingTitle = validateTopicSynthesisArtifact(
      structuredArtifact({
        synthesis_report: {
          source_section_chapters: {
            research_routes: "taxonomy.summary",
            historical_progression: "timeline_events.summary",
          },
          body: "对象检测报告正文已经覆盖 topic 定义、研究路线、历史递进、核心结论、比较争议、覆盖缺口和库外文献建议，但缺少标题字段，因此不能进入持久化链路。该段文字故意写得足够长，用来确保失败原因来自 title，而不是 body 长度。".repeat(
            3,
          ),
        },
      }),
    );

    assert.isFalse(missingTitle.ok);
    assert.match(missingTitle.errors.join("\n"), /synthesis_report\.title/i);

    const shallowBody = validateTopicSynthesisArtifact(
      structuredArtifact({
        synthesis_report: {
          title: "Too Shallow",
          source_section_chapters: {
            research_routes: "taxonomy.summary",
            historical_progression: "timeline_events.summary",
          },
          body: "This report is deliberately too short and must be rejected.",
        },
      }),
    );

    assert.isFalse(shallowBody.ok);
    assert.match(shallowBody.errors.join("\n"), /synthesis_report body/i);
  });

  it("rejects final reports when required source dimensions are incomplete", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const result = validateTopicSynthesisArtifact(
      structuredArtifact({
        external_literature_analysis: {
          summary: "",
          themes: [],
          representative_references: [],
          suggested_additions: [],
        },
      }),
    );

    assert.isFalse(result.ok);
    assert.match(
      result.errors.join("\n"),
      /external literature|source dimensions/i,
    );
  });

  it("rejects shallow products at the package schema boundary", function () {
    const result = validateWithTopicArtifactSchema(
      structuredArtifact({
        taxonomy: {
          primary_axis: "method",
          axis_rationale: "thin axis",
          nodes: [{ id: "route:thin", label: "Thin route" }],
        },
        timeline_events: [
          {
            id: "event:thin",
            label: "Thin event",
          },
        ],
        external_literature_analysis: {
          summary: "External references exist.",
          themes: [],
          representative_references: [],
        },
        synthesis_report: {
          title: "Bad report",
          source_section_chapters: {
            research_routes: "taxonomy.nodes",
            historical_progression: "timeline_events.events",
          },
          body: "Too short.",
        },
      }),
    );

    assert.isFalse(result.ok);
    assert.match(
      result.errors.join("\n"),
      /taxonomy|timeline_events|coverage_verdict|source_section_chapters|body/i,
    );
  });

  it("computes documented manifest, artifact, export, metadata, and section hashes from canonical current files", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const computeTopicCurrentHashes = requireExport(
      module,
      "computeTopicCurrentHashes",
    );

    const hashes = computeTopicCurrentHashes({
      manifest: { schema_id: "synthesis.topic_current_manifest", sections: {} },
      artifact: structuredArtifact(),
      metadata: { topic_id: "object-detection", language: "zh-CN" },
      exportMarkdown: "# Object Detection\n",
      sections: {
        claims: [{ id: "claim:detector-evolution" }],
      },
    });

    assert.containsAllKeys(hashes, [
      "manifest_hash",
      "structured_hash",
      "artifact_hash",
      "markdown_hash",
      "export_hash",
      "metadata_hash",
      "section_hashes",
    ]);
    assert.equal(hashes.structured_hash, hashes.artifact_hash);
    assert.equal(hashes.markdown_hash, hashes.export_hash);
    assert.match(hashes.section_hashes.claims, /^sha256:/);
  });

  it("validates claims and timeline events against library paper evidence links", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const missingEvidence = structuredArtifact({
      claims: [
        {
          id: "claim:bad",
          text: "Unsupported claim",
          evidence_refs: ["paper:1:MISSING"],
        },
      ],
      timeline_events: {
        summary: { text: "Unsupported event summary." },
        events: [
          {
            id: "event:bad",
            year: 2026,
            label: "Unsupported event",
            description: "Unsupported event.",
            phase: "unsupported",
            progression_logic: "Unsupported event logic.",
            evidence_refs: ["external:vaswani2017"],
          },
        ],
      },
    });

    const result = validateTopicSynthesisArtifact(missingEvidence);

    assert.isFalse(result.ok);
    assert.match(
      result.errors.join("\n"),
      /paper_evidence|evidence_refs|external/i,
    );
  });

  it("requires digest_ref locators without embedding full digest bodies", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const result = validateTopicSynthesisArtifact(
      structuredArtifact({
        paper_evidence: [
          {
            id: "paper:1:DETR",
            paper_ref: "1:DETR",
            digest_markdown: "# Full digest body must not be embedded",
            digest_ref: {
              paper_ref: "1:DETR",
              payload_type: "digest-markdown",
            },
          },
        ],
      }),
    );

    assert.isFalse(result.ok);
    assert.match(
      result.errors.join("\n"),
      /digest_ref|digest_markdown|payload_hash/i,
    );
  });

  it("keeps external references inside external_literature_analysis instead of main timeline evidence nodes", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const result = validateTopicSynthesisArtifact(
      structuredArtifact({
        timeline_events: {
          summary: { text: "External-only event summary." },
          events: [
            {
              id: "event:external",
              year: 2017,
              label: "Transformer background",
              description: "External-only background event.",
              phase: "background",
              progression_logic: "External-only background logic.",
              evidence_refs: ["external:vaswani2017"],
            },
          ],
        },
      }),
    );

    assert.isFalse(result.ok);
    assert.match(
      result.errors.join("\n"),
      /external_literature_analysis|timeline|library paper/i,
    );
  });

  it("rejects shallow topic synthesis sections without route, timeline, external coverage, statistics, and report depth", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const result = validateTopicSynthesisArtifact(
      structuredArtifact({
        topic: {
          id: "object-detection",
          title: "Object Detection",
        },
        taxonomy: {
          primary_axis: "method",
          nodes: [{ id: "tax:thin", label: "Thin category" }],
        },
        claims: [
          {
            id: "claim:thin",
            text: "A shallow finding.",
            evidence_refs: ["paper:1:DETR"],
            evidence_map_refs: ["claim:detector-evolution"],
          },
        ],
        timeline_events: {
          summary: {},
          events: [
            {
              id: "event:thin",
              year: 2020,
              label: "A paper appeared",
              evidence_refs: ["paper:1:DETR"],
            },
          ],
        },
        external_literature_analysis: {
          summary: "External references exist.",
          themes: [],
          representative_references: [],
        },
        statistics: {},
        synthesis_report: {
          body: "Too short.",
        },
      }),
    );

    assert.isFalse(result.ok);
    assert.match(
      result.errors.join("\n"),
      /discipline|taxonomy route|analysis\/rationale|progression|coverage_verdict|statistics\.paper_count|synthesis_report/i,
    );
  });
});
