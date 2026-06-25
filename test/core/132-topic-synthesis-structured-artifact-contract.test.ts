import { assert } from "chai";

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
    prospective_topic_relation_proposals: {
      path: "result/sidecars/prospective-topic-relation-proposals.json",
      hash: "sha256:prospective-topic-relation-proposals",
      content_type: "json",
      schema_id: "synthesis.prospective_topic_relation_proposals",
    },
  };
}

const COMPLETE_SECTIONS = [
  "topic",
  "summary",
  "taxonomy",
  "improvement_dimensions",
  "claims",
  "timeline_events",
  "source_papers",
  "debates",
  "coverage",
  "future_directions",
  "review_outline",
  "statistics",
  "synthesis_report",
  "source_artifacts",
  "diagnostics",
];

function sectionEntry(section: string) {
  return {
    path: `result/sections/${section.replace(/_/g, "-")}.json`,
    hash: `sha256:${section}`,
    content_type: "json",
  };
}

function completeSectionManifest(overrides: Record<string, unknown> = {}) {
  return {
    schema_id: "synthesis.topic_analysis_manifest",
    schema_version: "3.0.0",
    operation: "create",
    topic_id: "object-detection",
    language: "zh-CN",
    created_at: "2026-05-16T00:00:00.000Z",
    sidecars: completeSidecars(),
    sections: Object.fromEntries(
      COMPLETE_SECTIONS.map((section) => [section, sectionEntry(section)]),
    ),
    ...overrides,
  };
}

function sectionPatchManifest(overrides: Record<string, unknown> = {}) {
  return {
    schema_id: "synthesis.topic_section_patch_manifest",
    schema_version: "3.0.0",
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
    schema_version: "3.0.0",
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
          source_paper_refs: ["1:DETR"],
          main_contributions: ["证明 set prediction detection 可行。"],
          strengths: ["结构统一"],
          limitations: ["早期收敛慢"],
          maturity: "概念验证后进入效率优化阶段",
          relation_to_other_routes:
            "与 anchor/proposal 路线构成端到端建模对照。",
          review_angle:
            "可用于 Related Work 中解释 query-based detection 的范式起点。",
        },
      ],
    },
    improvement_dimensions: [
      {
        id: "dim:detr",
        label: "Set prediction formulation",
        analysis:
          "DETR 用 object queries 与 Hungarian matching 将对象检测改写为集合预测问题。",
        trajectory: "后续路线继续优化 query 设计、匹配稳定性和效率。",
        source_paper_refs: ["1:DETR"],
      },
    ],
    claims: [
      {
        id: "claim:detector-evolution",
        text: "检测器从手工 proposal 走向端到端集合预测。",
        analysis:
          "该判断来自 DETR 对集合预测的范式引入以及后续路线围绕查询、匹配和收敛展开的连续改进。",
        source_paper_refs: ["1:DETR"],
        confidence: 0.8,
        scope: "示例 fixture 的最小对象检测 topic。",
        limitations: ["示例 fixture 只包含一篇库内 source paper。"],
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
          source_paper_refs: ["1:DETR"],
        },
      ],
    },
    source_papers: [
      {
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
    debates: [],
    coverage: {
      paper_count: 1,
      paper_evidence_count: 1,
      digest_coverage: "1/1",
      references_coverage: "1/1",
      citation_analysis_coverage: "1/1",
      route_coverage_summary: "仅覆盖 set prediction 示例路线。",
      claim_coverage_summary: "唯一 claim 有一篇库内 source paper 支撑。",
      timeline_coverage_summary: "仅包含 2020 年 DETR 示例事件。",
      coverage_verdict: "partial",
      coverage_reason: "示例 fixture 只覆盖一条库内证据路线。",
      coverage_caveats: ["示例 fixture 不代表完整对象检测领域。"],
      external_context_summary:
        "库外背景只作为后续补充方向，不作为主证据内嵌到 artifact。",
      suggested_collection_directions: [
        "补充 Faster R-CNN、YOLO 和 anchor-free detector 的 digest。",
      ],
      warnings: ["示例 fixture 不代表完整对象检测领域。"],
    },
    future_directions: [
      {
        id: "future:background",
        title: "补充传统检测器背景",
        rationale:
          "当前 fixture 只覆盖 DETR，真实综述需要 proposal、anchor 和 anchor-free 检测器作为对照。",
        source_paper_refs: ["1:DETR"],
        priority: "high",
      },
    ],
    review_outline: {
      topic_importance:
        "对象检测是视觉感知系统的基础任务，DETR-style route 体现了从 pipeline 到 set prediction 的建模迁移。",
      writing_strategies: [
        {
          id: "strategy:set-prediction",
          title: "Set prediction route",
          review_thesis:
            "用 DETR 作为最小里程碑解释 query-based object detection 的路线起点。",
          writing_strategy:
            "先界定任务，再说明传统 pipeline 的约束，最后引出 object queries 与 bipartite matching。",
          best_for: "介绍 query-based detection 的 Related Work 小节。",
          risks: "证据范围窄，不能外推为完整对象检测史。",
          section_plan: ["Background", "Route shift", "Limitations"],
          source_paper_refs: ["1:DETR"],
        },
      ],
      recommended_strategy_id: "strategy:set-prediction",
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
      body: "对象检测 topic 的核心是从图像中定位并识别目标实例。该示例 artifact 只包含 DETR 这一条库内证据，因此它只能展示端到端集合预测路线的最小综合形态。DETR 的意义在于把检测从 proposal、anchor 和 NMS 组成的 pipeline 转向 query-based set prediction；这一变化为后续关于查询设计、匹配稳定性、收敛速度和部署效率的研究提供了共同问题框架。由于 fixture 证据有限，任何关于全领域路线覆盖、外部文献充分性和长期历史演进的判断都必须标记为 partial。报告仍然明确保留 topic 定义、路线分析、时间递进、核心结论、比较争议、覆盖缺口和后续入库方向这些维度，使 host validator 能验证完整协议而不是只接受一段简短摘要。它还说明 taxonomy.summary 如何承担研究路线章节的上游真源，timeline_events.summary 如何承担历史沿革章节的上游真源，并通过 coverage、statistics 与 future_directions 标记当前库内证据的局限和下一步入库建议。",
    },
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
    assert.containsAllKeys(result.manifest.sections, COMPLETE_SECTIONS);
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

  it("rejects legacy complete sections removed from the current contract", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicAnalysisManifest = requireExport(
      module,
      "validateTopicAnalysisManifest",
    );
    const manifest = completeSectionManifest({
      sections: {
        ...completeSectionManifest().sections,
        positioning: sectionEntry("positioning"),
        gaps: sectionEntry("gaps"),
      },
    });

    const result = validateTopicAnalysisManifest(manifest);

    assert.isFalse(result.ok);
    assert.match(result.errors.join("\n"), /positioning|gaps/);
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

  it("validates complete topic synthesis products at the current host boundary", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const result = validateTopicSynthesisArtifact(structuredArtifact());

    assert.isTrue(result.ok, result.errors?.join("\n"));
  });

  it("accepts improvement dimensions and runtime timeline markers", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );
    const artifact = structuredArtifact({
      timeline_events: {
        summary: {
          text: "对象检测的示例历史线索以 DETR 为最小里程碑，体现了从 pipeline 检测走向集合预测的范式变化。",
        },
        events: [
          {
            id: "event:detr",
            year: 2020,
            label: "DETR",
            description: "DETR 将检测问题转化为集合预测。",
            phase: "paradigm_shift",
            progression_logic:
              "后续工作围绕 query、matching 和 efficiency 展开。",
            follow_on_effect: "形成 query-based detection 的后续改进链条。",
            source_paper_refs: ["1:DETR"],
          },
        ],
        markers: [
          {
            id: "tm:1",
            kind: "milestone",
            event_id: "event:detr",
            source_paper_ref: "1:DETR",
            year: 2020,
            label: "DETR",
          },
        ],
      },
      improvement_dimensions: [
        {
          id: "dim:set-prediction",
          label: "Set prediction formulation",
          analysis: "DETR 的主要改进是把检测重写为集合预测问题。",
          trajectory: "后续路线继续优化 query 设计、匹配稳定性和效率。",
          source_paper_refs: ["1:DETR"],
        },
      ],
    });

    const result = validateTopicSynthesisArtifact(artifact);

    assert.isTrue(result.ok, result.errors?.join("; "));
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
        future_directions: [],
        coverage: {
          paper_count: 1,
          coverage_verdict: "partial",
        },
      }),
    );

    assert.isFalse(result.ok);
    assert.match(result.errors.join("\n"), /coverage|future_directions/i);
  });

  it("rejects shallow products at the current host boundary", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const result = validateTopicSynthesisArtifact(
      structuredArtifact({
        taxonomy: {
          primary_axis: "method",
          axis_rationale: "thin axis",
          nodes: [{ id: "route:thin", label: "Thin route" }],
        },
        timeline_events: {
          summary: {},
          events: [
            {
              id: "event:thin",
              label: "Thin event",
            },
          ],
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
      /taxonomy|timeline_events|source_section_chapters|body/i,
    );
  });

  it("computes documented manifest, artifact, metadata, and section hashes from canonical current files", async function () {
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
      sections: {
        claims: [{ id: "claim:detector-evolution" }],
      },
    });

    assert.containsAllKeys(hashes, [
      "manifest_hash",
      "structured_hash",
      "artifact_hash",
      "metadata_hash",
      "section_hashes",
    ]);
    assert.equal(hashes.structured_hash, hashes.artifact_hash);
    assert.notProperty(hashes, "markdown_hash");
    assert.notProperty(hashes, "export_hash");
    assert.match(hashes.section_hashes.claims, /^sha256:/);
  });

  it("validates claims and timeline events against source paper links", async function () {
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
          analysis: "Unsupported claim analysis.",
          source_paper_refs: ["1:MISSING"],
          scope: "Unsupported scope.",
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
            source_paper_refs: ["external:vaswani2017"],
          },
        ],
      },
    });

    const result = validateTopicSynthesisArtifact(missingEvidence);

    assert.isFalse(result.ok);
    assert.match(
      result.errors.join("\n"),
      /source_papers|source_paper_refs|missing/i,
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
        source_papers: [
          {
            paper_ref: "1:DETR",
            digest_markdown: "# Full digest body must not be embedded",
            digest_ref: {
              paper_ref: "1:DETR",
              payload_type: "wrong-type",
            },
          },
        ],
      }),
    );

    assert.isFalse(result.ok);
    assert.match(result.errors.join("\n"), /digest_ref|digest-markdown/i);
  });

  it("rejects legacy evidence maps and external timeline evidence nodes", async function () {
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const result = validateTopicSynthesisArtifact(
      structuredArtifact({
        claims: [
          {
            id: "claim:legacy",
            text: "Legacy evidence claim",
            analysis: "Legacy evidence claim analysis.",
            source_paper_refs: ["1:DETR"],
            evidence_refs: ["paper:1:DETR"],
            scope: "Legacy evidence scope.",
          },
        ],
        evidence_map: {
          candidate_ids: ["claim:legacy"],
        },
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
              source_paper_refs: ["external:vaswani2017"],
            },
          ],
        },
      }),
    );

    assert.isFalse(result.ok);
    assert.match(
      result.errors.join("\n"),
      /evidence_refs|evidence_map|source_papers/i,
    );
  });

  it("rejects shallow topic synthesis sections without route, timeline, coverage, statistics, and report depth", async function () {
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
            source_paper_refs: ["1:DETR"],
          },
        ],
        timeline_events: {
          summary: {},
          events: [
            {
              id: "event:thin",
              year: 2020,
              label: "A paper appeared",
              source_paper_refs: ["1:DETR"],
            },
          ],
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
      /discipline|taxonomy route|analysis\/rationale|progression|statistics\.paper_count|synthesis_report/i,
    );
  });
});
