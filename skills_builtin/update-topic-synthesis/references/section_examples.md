# Section Examples

本文件是可选扩展材料，也是 `topic_synthesis_content_contract.md` 的派生速查表；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。
它提供合格内容示例和常见反例，帮助你在写 section JSON 时快速对齐字段结构、分析粒度和语义深度。

所有示例里的 `pe:*` 必须替换为本次 runtime 注入的真实 `paper_evidence.id`；
所有 `evidence_map_refs` 必须引用本次已校验的 cross-paper evidence map candidate。

## 枚举字段速查

- `topic_granularity`：`method_family` / `task` / `problem` / `application_scenario` / `theory_concept` / `mechanism` / `dataset_or_benchmark` / `mixed`。
- `coverage_verdict`：`sufficient` / `partial` / `insufficient` / `severely_missing` / `unknown`。
- `gaps[].gap_type`：`research_gap` / `library_coverage_gap` / `evidence_gap` / `evaluation_gap`。
- `gaps[].severity`：`low` / `medium` / `high` / `critical` / `unknown`。
- `representative_references[].information_completeness`：`complete` / `partial` / `minimal` / `unknown`。
- `suggested_additions[].priority`：`high` / `medium` / `low` / `unknown`。
- `concept_cards[].concept_type`：`method_family` / `mechanism` / `task` / `benchmark` / `dataset` / `evaluation_axis` / `training_signal` / `theoretical_construct`。
- `topic_relations[].proposal_type`：`broader_topic_candidate` / `related_topic_candidate` / `overlap_topic_candidate` / `contrast_topic_candidate`。

## Topic

```json
{
  "id": "detr-style-object-detection",
  "title": "DETR-style Object Detection",
  "definition": "本 topic 指以 object queries、集合预测和二分图匹配为核心的目标检测方法族。",
  "discipline": "Computer Science",
  "research_field": "Computer Vision",
  "aliases": [
    "Detection Transformer",
    "DETR variants",
    "Query-based detection"
  ],
  "topic_granularity": "method_family",
  "scope_boundary": {
    "include": ["DETR 及其 query-based detection variants"],
    "exclude": ["泛化的 CNN object detection survey"],
    "gray_zone": ["YOLO/anchor-free 方法仅在比较或外部背景中出现"]
  }
}
```

## Summary

```json
{
  "brief": "DETR-style object detection 已从端到端可行性验证发展为覆盖高精度、实时和跨场景扩展的方法族。",
  "overview": "库内文献显示，该 topic 的核心演进围绕训练收敛、小目标表现、注意力效率和部署效率展开。",
  "key_takeaways": [
    "query + matching 是共同建模核心。",
    "收敛效率改进是 DETR 实用化的关键转折。",
    "实时部署路线说明端到端检测已进入工程可用阶段。"
  ],
  "route_count": 5,
  "timeline_span": { "start_year": 2020, "end_year": 2026 },
  "coverage_verdict": "partial"
}
```

## Positioning

```json
{
  "importance": "DETR-style detection 重新定义了目标检测 pipeline 的基本建模方式。",
  "timeliness": "2020 年之后该路线持续活跃，近期工作从训练效率转向实时部署和跨场景扩展。",
  "field_position": "它位于 object detection、vision transformers 和 efficient perception systems 的交叉处。",
  "review_position": "适合组织成 query-based detection 演进的 Related Work 小节。",
  "scope_boundary": {
    "covered": "DETR variants and detection-transformer route",
    "not_covered": "完整 anchor-based / anchor-free detector history"
  },
  "evidence_map_refs": ["pos:route-shift"]
}
```

## Taxonomy

```json
{
  "primary_axis": "technical route by bottleneck addressed",
  "axis_rationale": "DETR 系列主要围绕收敛速度、注意力计算、query 表征、实时部署和跨场景扩展等瓶颈分化。",
  "summary": {
    "text": "DETR-style object detection 的路线版图可以理解为围绕 query-based set prediction 实用化瓶颈展开的多线并进。注意力效率路线解决全局 attention 的计算和小目标问题，收敛加速路线稳定 object query 学习过程，高性能组合路线整合多种机制，实时部署路线则把该范式推向工程可用。",
    "dominant_routes": [
      "route:attention-efficiency",
      "route:convergence-acceleration"
    ],
    "emerging_routes": ["route:real-time-deployment"],
    "route_relationships": [
      {
        "from": "route:attention-efficiency",
        "to": "route:convergence-acceleration",
        "relation": "complementary",
        "explanation": "前者优化特征交互成本，后者优化学习信号。"
      }
    ],
    "main_tradeoffs": ["性能与训练复杂度之间存在权衡。"],
    "report_chapter_hint": "可作为 synthesis_report 中“主要研究路线”章节的上游材料。"
  },
  "nodes": [
    {
      "id": "route:convergence-acceleration",
      "label": "Convergence acceleration",
      "definition": "通过去噪训练、动态 anchor query 和改进 query selection 缩短 DETR 训练周期。",
      "core_problem": "原始 DETR 训练慢，早期 query-object matching 不稳定。",
      "mechanism": "用 denoising queries 或 dynamic query 给 decoder 提供更稳定的学习信号。",
      "representative_papers": ["pe:1_nxligkf5", "pe:1_hplz65z2"],
      "main_contributions": ["把 DETR 训练成本显著压缩。"],
      "strengths": ["训练稳定性提升"],
      "limitations": ["机制组合复杂"],
      "maturity": "mature",
      "relation_to_other_routes": "与 attention efficiency route 互补。",
      "review_angle": "可用于解释 DETR 实用化转折。",
      "evidence_map_refs": ["tax:convergence-acceleration"]
    }
  ]
}
```

## Timeline Events

```json
{
  "summary": {
    "text": "DETR-style detection 的时间线可以分为三个阶段：2020 年左右建立 set-prediction 范式；2021-2022 年围绕 attention、query 和 matching 拆解瓶颈；2022 年后进入系统化、高性能组合和实时部署阶段。",
    "phases": [
      {
        "id": "phase:paradigm-establishment",
        "period": "2020",
        "logic": "证明 set-prediction detection 可行，同时暴露训练和效率瓶颈。"
      }
    ],
    "milestone_event_refs": ["event:detr-2020"],
    "report_chapter_hint": "可作为 synthesis_report 中“历史沿革和递进逻辑”章节的上游材料。"
  },
  "events": [
    {
      "id": "event:detr-2020",
      "year": 2020,
      "label": "DETR establishes set-prediction detection",
      "phase": "paradigm_shift",
      "route_refs": ["route:query-based-detection"],
      "description": "DETR 将目标检测建模为集合预测问题。",
      "bottleneck_addressed": "传统检测 pipeline 依赖候选框生成、anchor 设计和后处理。",
      "why_it_matters": "它把后续研究焦点转向 query 表征、matching 稳定性和 transformer feature interaction。",
      "progression_logic": "后续工作分别处理注意力、小目标、训练收敛和实时部署问题。",
      "follow_on_effect": "形成 query-based detection 主线。",
      "evidence_refs": ["pe:1_eimsdeu3"],
      "evidence_map_refs": ["timeline:detr-2020"]
    }
  ]
}
```

## Claims

```json
[
  {
    "id": "claim:detr-practicality-shift",
    "text": "DETR-style detectors 的研究重心已经从证明端到端检测可行，转向训练成本、实时性和部署谱系上的实用化。",
    "analysis": "原始 DETR 提供集合预测范式，但训练周期和小目标表现限制实用性；后续路线分别围绕注意力、匹配、query selection 和实时编码器解决这些瓶颈。",
    "evidence_refs": ["pe:1_eimsdeu3", "pe:1_5hbhawiv"],
    "evidence_map_refs": ["claim:detr-practicality-shift"],
    "confidence": 0.86,
    "scope": "适用于库内 DETR-style object detection 文献。",
    "limitations": ["库内传统 CNN/anchor-free detector 文献不足。"],
    "review_usage": "可作为 Related Work 中从原始 DETR 过渡到 efficient/real-time variants 的主题句。"
  }
]
```

## Comparison Matrix

```json
{
  "dimensions": [
    "target_bottleneck",
    "core_mechanism",
    "training_dependency",
    "deployment_implication",
    "main_limitation"
  ],
  "rows": [
    {
      "id": "cmp:deformable-detr",
      "route_ref": "route:attention-efficiency",
      "paper_refs": ["pe:1_5hbhawiv"],
      "values": {
        "target_bottleneck": "原始 DETR 全局 attention 收敛慢、小目标性能弱。",
        "core_mechanism": "multi-scale deformable attention 只采样少量关键位置。",
        "training_dependency": "仍需较强 backbone 和多尺度训练设置。",
        "deployment_implication": "提升训练效率，但不直接面向实时部署。",
        "main_limitation": "机制复杂度较高。"
      },
      "evidence_map_refs": ["cmp:deformable-detr"]
    }
  ]
}
```

## Debates

```json
[
  {
    "id": "debate:end-to-end-vs-real-time",
    "title": "端到端建模收益是否足以抵消部署复杂度？",
    "positions": [
      {
        "stance": "end-to-end architecture improves conceptual simplicity and removes NMS",
        "evidence_refs": ["pe:1_eimsdeu3"]
      },
      {
        "stance": "real-time deployment still requires carefully engineered hybrid encoders and scaling",
        "evidence_refs": ["pe:1_cbjwe4jx"]
      }
    ],
    "evaluation_axis": "accuracy-speed tradeoff under hardware-specific inference settings",
    "current_judgment": "端到端建模不再天然低效，但实时性依赖具体系统设计。",
    "uncertainty": "不同论文使用的硬件、输入尺寸和预训练设置不完全一致。",
    "evidence_map_refs": ["debate:end-to-end-vs-real-time"]
  }
]
```

## Gaps

```json
[
  {
    "id": "gap:traditional-detector-background",
    "gap_type": "library_coverage_gap",
    "title": "库内传统检测器背景覆盖不足",
    "description": "当前 resolved set 主要是 DETR variants，缺少 Faster R-CNN、YOLO、FCOS 等非 DETR 路线的一手 digest。",
    "evidence_refs": [],
    "evidence_map_refs": ["gap:traditional-detector-background"],
    "severity": "high",
    "recommended_action": "补充代表性传统检测器和 anchor-free detector 文献。"
  }
]
```

## External Literature Analysis

```json
{
  "summary": "库外文献主要集中在传统检测 pipeline、Transformer/attention 基础、以及 COCO/ImageNet 等评估基础设施。",
  "themes": [
    {
      "id": "ext:traditional-detectors",
      "title": "Traditional detector pipeline",
      "analysis": "Faster R-CNN、YOLO 和 anchor-free detector 构成 DETR 路线的主要对照背景。",
      "related_topic_aspect": "解释 DETR 为何强调端到端集合预测。"
    }
  ],
  "representative_references": [
    {
      "id": "external:faster-rcnn",
      "title": "Faster R-CNN",
      "year": 2015,
      "authors": ["Ren", "He"],
      "cited_by_papers": ["pe:1_eimsdeu3"],
      "why_relevant": "提供 proposal-based detection pipeline 的关键背景。",
      "information_completeness": "partial"
    }
  ],
  "citation_contexts": [
    {
      "citing_paper_ref": "pe:1_eimsdeu3",
      "reference_id": "external:faster-rcnn",
      "usage": "作为传统检测 pipeline 的代表性对照。"
    }
  ],
  "coverage_verdict": "partial",
  "coverage_reason": "库内文献足以覆盖 DETR variants 主线，但传统检测器和早期 real-time detector 的一手 digest 缺失。",
  "suggested_additions": [
    {
      "title": "Faster R-CNN",
      "reason": "补充 proposal/RPN pipeline 的基础背景。",
      "priority": "high"
    }
  ],
  "limitations": "库外文献未读取 digest 时不能作为主结论证据。"
}
```

## Coverage

```json
{
  "paper_count": 21,
  "paper_evidence_count": 20,
  "digest_coverage": "20/21",
  "references_coverage": "18/21",
  "citation_analysis_coverage": "17/21",
  "route_coverage_summary": "覆盖 query-based、attention efficiency、convergence acceleration 和 real-time deployment，但传统 detector 对照不足。",
  "claim_coverage_summary": "主要 claim 均有至少 2 篇库内 evidence 支撑。",
  "timeline_coverage_summary": "2020-2026 覆盖较完整，2020 前背景文献不足。",
  "coverage_verdict": "partial",
  "warnings": ["传统检测器和 anchor-free detector 一手文献不足。"]
}
```

## Statistics

```json
{
  "paper_count": 21,
  "evidence_paper_count": 20,
  "time_span": { "start_year": 2020, "end_year": 2026 },
  "route_count": 5,
  "route_coverage": "核心 DETR variants 路线覆盖较完整，传统检测器背景不足。",
  "coverage_verdict": "partial",
  "external_reference_count": 186,
  "suggested_addition_count": 7,
  "citation_graph_role_counts": {
    "core": 4,
    "foundation": 3,
    "frontier": 5,
    "isolated": 1,
    "external-heavy": 6
  },
  "artifact_availability": {
    "digest": { "available": 20, "missing": 1 },
    "references": { "available": 18, "missing": 3 },
    "citation_analysis": { "available": 17, "missing": 4 }
  }
}
```

## Review Outline

```json
{
  "introduction_logic": [
    {
      "id": "intro:from-pipeline-to-set-prediction",
      "purpose": "解释为什么目标检测需要从 proposal pipeline 转向端到端集合预测。",
      "source_sections": ["topic", "positioning", "claims"],
      "candidate_citations": ["pe:1_eimsdeu3", "external:faster-rcnn"],
      "evidence_map_refs": ["claim:detr-practicality-shift"]
    }
  ],
  "related_work_logic": [
    {
      "id": "rw:detr-route-taxonomy",
      "organization": "按技术路线组织：attention efficiency、convergence acceleration、query design、real-time deployment。",
      "source_sections": ["taxonomy", "timeline_events", "comparison_matrix"],
      "evidence_map_refs": ["tax:convergence-acceleration"]
    }
  ],
  "body_sections": [
    {
      "title": "Training efficiency and matching stabilization",
      "role": "解释 DETR 从概念验证到实用化的关键技术转折。"
    }
  ]
}
```

## Synthesis Report

```json
{
  "title": "DETR-style Object Detection Synthesis Report",
  "source_section_chapters": {
    "research_routes": "taxonomy.summary",
    "historical_progression": "timeline_events.summary"
  },
  "body": "DETR-style object detection 的核心问题，是能否把目标检测从由 proposal、anchor 和 NMS 组成的工程 pipeline，转化为端到端的集合预测问题。研究路线大致形成注意力效率、收敛加速、高性能组合、实时部署和跨场景扩展五条主线。历史上，该方向先证明 set-prediction detection 可行，再逐步解决训练成本、小目标表现、部署效率和跨场景迁移问题。当前库内证据足以支持 DETR variants 主线的综合，但对传统 detector 和 anchor-free detector 的一手覆盖不足。"
}
```

## Paper Evidence

```json
[
  {
    "id": "pe:1_eimsdeu3",
    "paper_ref": "1:EIMSDEU3",
    "title": "End-to-End Object Detection with Transformers",
    "year": 2020,
    "evidence_summary": "提出 object queries + bipartite matching 的端到端检测范式。",
    "digest_ref": {
      "payload_type": "digest-markdown",
      "note_key": "NOTE123",
      "payload_hash": "sha256:..."
    }
  }
]
```

## Evidence Map

```json
{
  "path": "runtime/payloads/cross-paper-evidence-map.json",
  "hash": "sha256:...",
  "candidate_counts": {
    "taxonomy_candidates": 5,
    "claim_candidates": 8,
    "debate_candidates": 3,
    "gap_candidates": 4
  },
  "candidate_ids": [
    "tax:convergence-acceleration",
    "claim:detr-practicality-shift",
    "gap:traditional-detector-background"
  ]
}
```

## Source Artifacts

```json
[
  {
    "type": "digest-markdown",
    "paper_ref": "1:EIMSDEU3",
    "status": "available",
    "path": "runtime/payloads/paper-artifacts-1_EIMSDEU3.json"
  },
  {
    "type": "citation_graph_metrics",
    "status": "available",
    "path": "runtime/payloads/citation-graph-metrics-batch.json"
  }
]
```

## Diagnostics

```json
{
  "warnings": [
    {
      "code": "library_coverage_gap",
      "message": "传统检测器背景覆盖不足。",
      "affected_sections": ["external_literature_analysis", "coverage", "gaps"]
    }
  ],
  "missing_artifacts": [
    {
      "paper_ref": "1:ABC12345",
      "artifact_type": "citation_analysis",
      "impact": "external literature analysis confidence reduced"
    }
  ],
  "quality_notes": [
    "Claims and timeline use only library paper evidence.",
    "External references are used only for background and collection suggestions."
  ]
}
```

## KG Proposal Sidecars

KG proposal sidecars 是 final manifest 的必交可空旁路产物，不是 structured topic artifact
section。Completed manifest 应在 `sidecars` 中引用：

```json
{
  "sidecars": {
    "topic_interest_metadata": {
      "path": "result/sidecars/topic-interest-metadata.json",
      "hash": "sha256:...",
      "content_type": "json",
      "schema_id": "topic_interest_metadata.v1"
    },
    "concept_cards_proposal": {
      "path": "result/sidecars/concept-cards-proposal.json",
      "hash": "sha256:...",
      "content_type": "json",
      "schema_id": "synthesis.concept_cards_proposal"
    },
    "topic_graph_relation_proposals": {
      "path": "result/sidecars/topic-graph-relation-proposals.json",
      "hash": "sha256:...",
      "content_type": "json",
      "schema_id": "synthesis.topic_graph_relation_proposals"
    }
  }
}
```

`result/sidecars/concept-cards-proposal.json` 合格示例：

```json
{
  "schema_id": "synthesis.concept_cards_proposal",
  "schema_version": "1.0.0",
  "topic_id": "detr-style-object-detection",
  "cards": [
    {
      "local_id": "concept:set-prediction",
      "label": "Set prediction",
      "aliases": ["bipartite matching prediction", "object-query matching"],
      "concept_type": "method_family",
      "domain": "object detection",
      "short_definition": "A detection formulation that predicts a globally matched set of objects.",
      "definition": "在本 topic 中，set prediction 指用 object queries 和 bipartite matching 替代 proposal/NMS pipeline 的检测范式。",
      "disambiguation": "不要与泛化的 sequence set prediction 合并，除非上下文明确是 object detection matching。",
      "topic_relevance": "它解释了 DETR-style detection 的路线边界和后续 convergence 改进的共同问题。",
      "evidence": {
        "paper_refs": ["pe:1_eimsdeu3"],
        "evidence_map_refs": ["claim:detr-practicality-shift"]
      },
      "merge_hints": ["set prediction", "Hungarian matching detection"],
      "confidence": 0.88
    }
  ],
  "diagnostics": []
}
```

`result/sidecars/topic-graph-relation-proposals.json` 合格示例：

```json
{
  "schema_id": "synthesis.topic_graph_relation_proposals",
  "schema_version": "1.0.0",
  "source_topic_id": "detr-style-object-detection",
  "proposals": [
    {
      "proposal_type": "broader_topic_candidate",
      "target_topic_title": "Object Detection",
      "rationale": "当前 topic 限定为 DETR-style detection，而 target 覆盖更广泛的检测任务和非 transformer baseline。",
      "evidence": {
        "section_refs": ["positioning", "gaps:traditional-detector-background"],
        "paper_refs": ["pe:1_eimsdeu3"]
      },
      "confidence": 0.82
    }
  ],
  "diagnostics": []
}
```

空 proposal 也是合格输出，只要写明 diagnostics：

```json
{
  "concept_cards_proposal": {
    "schema_id": "synthesis.concept_cards_proposal",
    "schema_version": "1.0.0",
    "cards": [],
    "diagnostics": [
      {
        "code": "no_stable_concept_candidates",
        "message": "No concept recurs across enough evidence-backed sections."
      }
    ]
  },
  "topic_graph_relation_proposals": {
    "schema_id": "synthesis.topic_graph_relation_proposals",
    "schema_version": "1.0.0",
    "proposals": [],
    "diagnostics": [
      {
        "code": "insufficient_topic_context",
        "message": "No neighboring topic has enough boundary evidence for a relation proposal."
      }
    ]
  }
}
```

## 常见反例速查

以下片段能通过人眼看到“有字段”，但不能支撑高质量 Topic Synthesis：

```json
{
  "taxonomy": {
    "summary": { "text": "本 topic 包含很多方法。" },
    "nodes": [
      { "id": "route:paper-a", "label": "Paper A method" },
      { "id": "route:paper-b", "label": "Paper B method" }
    ]
  },
  "timeline_events": {
    "summary": { "text": "这些论文从 2020 年发展到 2025 年。" },
    "events": [
      { "id": "event:2020", "year": 2020, "description": "发表了一篇论文。" }
    ]
  },
  "claims": [
    {
      "id": "claim:important",
      "text": "该方向很重要。",
      "analysis": "很多论文都研究了它。"
    }
  ],
  "external_literature_analysis": {
    "summary": "外部文献很多。",
    "coverage_verdict": "sufficient"
  },
  "synthesis_report": {
    "title": "Report",
    "body": "这个 topic 很重要，方法很多，未来还有很多工作。"
  },
  "concept_cards_proposal": {
    "cards": [{ "label": "DETR", "canonical_concept_id": "concept:detr" }]
  },
  "topic_graph_relation_proposals": {
    "proposals": [
      {
        "proposal_type": "related_topic_candidate",
        "canonical_edge_id": "edge:related_to:detr:transformer",
        "target_topic_title": "Transformer",
        "rationale": "名称相似。"
      }
    ]
  }
}
```

问题：

- taxonomy 没有研究路线边界、机制、路线关系和 trade-off。
- timeline 没有历史递进逻辑、里程碑角色和后续影响。
- claim 没有 synthesis-level finding、证据范围、边界和置信度。
- external literature 没有说明库外概念/方法与 topic 的关系，也没有入库建议。
- synthesis report 没有把 topic definition、research routes、historical progression、core findings、
  comparison/debates、gaps/coverage、external literature 串成连续报告。
- concept/relation proposal 被错误写进 structured sections，而不是 `result/sidecars/`。
- 缺失 manifest `sidecars.concept_cards_proposal` 或 `sidecars.topic_graph_relation_proposals` 会破坏 final manifest 合同。
- KG proposal 不得写 `canonical_concept_id` 或 `canonical_edge_id`；canonical 摄取由插件 apply 阶段完成。
- 不能因为 sidecar “必交可空”就跳过文件；无候选时也要写空数组和 diagnostics。
