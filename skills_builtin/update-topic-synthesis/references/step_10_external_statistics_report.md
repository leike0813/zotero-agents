# Step 10 External Literature, Statistics, And Report

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## External Literature

外部文献不作为主 timeline/claim 证据，但必须分析：

1. 哪些外部研究、概念、方法与本 topic 密切相关。
2. 当前库内文献对 topic 应覆盖范围的覆盖程度。
3. 入库建议与建议入库文献清单。

`coverage_verdict` 使用 `sufficient`、`partial`、`insufficient`、`severely_missing` 或
`unknown`。

其他枚举字段：`representative_references[].information_completeness` 只能是
`complete`、`partial`、`minimal`、`unknown`；`suggested_additions[].priority`
只能是 `high`、`medium`、`low`、`unknown`。

外部文献分析不是参考文献列表。它至少需要回答：

- 哪些库外概念、经典方法、基础模型、benchmark 或综述与本 topic 有实质关系。
- 这些外部文献被库内论文如何引用：背景、方法来源、对比对象、评价基准、理论基础或批评对象。
- 当前库内 paper set 相对于 topic 应有范围的覆盖程度是什么，为什么。
- 哪些外部文献应优先入库，入库后能补哪类缺口。

代表性外部文献只需保留可追溯字段，例如 title、authors、year、被哪些库内论文引用、引用语境和推荐理由。
不要把外部文献提升为主 `paper_evidence`。

## Coverage rubric

- `sufficient`：库内 paper set 已覆盖 topic 的主要路线、关键阶段、核心 claim 和必要背景；新增入库只会改善细节。
- `partial`：库内能支撑 topic 主线，但某些路线、历史前史、对照方法、benchmark 或近期 frontier 缺少一手文献。
- `insufficient`：库内只能覆盖少数路线或少数年份，主 claim/timeline 需要大量 caveat。
- `severely_missing`：resolved set 与 topic 应有范围明显不匹配，当前 synthesis 只能作为初步线索。
- `unknown`：artifact 缺失或 resolver 诊断不足，无法给出可信判断。

coverage verdict 要同时参考：paper_count、年份跨度、route coverage、artifact availability、
citation graph role distribution、external-heavy/unresolved reference 规模，以及 external context 中的综述/基准/经典方法。
update patch 中如果替换 coverage、statistics 或 external analysis，必须重述 verdict 的依据，不能只更新单个数字。

## Statistics

至少包含 `paper_count`、`time_span`、`route_coverage`、`coverage_verdict`。可补充 artifact
availability、citation graph role distribution、external reference counts。

统计指标要服务于读者判断 synthesis 的可靠性，而不是堆数字。建议包含：

- 文献数量、年份跨度、主要阶段分布。
- taxonomy route coverage：哪些路线覆盖充分，哪些路线薄弱。
- artifact availability：digest、references、citation analysis 的可用/缺失状态。
- citation graph metrics 摘要：core/foundation/frontier/isolated/external-heavy 分布。
- external reference / unresolved reference 规模。
- coverage verdict 与一句解释。

统计解读必须回答“这些数字如何影响读者信任 synthesis”。例如：如果 digest coverage 高但 references coverage 低，
主 claim 可信度可较高，但 external literature analysis 应降级；如果 isolated paper 很多，说明 topic 可能混入弱相关分支。

## Synthesis Report

必须是连续正文。研究路线章节以上游 `taxonomy.summary` 为真源；历史章节以上游
`timeline_events.summary` 为真源。

报告正文不是把 JSON 字段机械拼接，也不是一段 brief summary，而是把结构化 section 转成可读的知识综合。必须包含非空 `title`，并覆盖以下 7 类内容维度：

1. Topic definition and scope：来自 `topic`、`summary`、`positioning`。
2. Research routes：必须以 `taxonomy.summary` 为真源，并覆盖主要 route。
3. Historical progression：必须以 `timeline_events.summary` 为真源。
4. Core findings：来自 `claims`、`comparison_matrix`、`debates`。
5. Comparison and debates：综合 `comparison_matrix` 与 `debates`，说明路线差异和争议。
6. Gaps and coverage：来自 `gaps`、`coverage`、`statistics`。
7. External literature and next collection：来自 `external_literature_analysis`。

报告正文要保持信息密度，避免泛泛背景介绍；每一段都应能回溯到结构化 section。
`persist_external_statistics_report` 会在 Stage 10 立即检查 report 标题、正文深度、段落形态和上述维度的来源完整性；不要等到最终 bundle 阶段才发现浅层报告。

## Stage 10 Payload

Stage 10 不直接手写最终 section 文件。请写：

```text
runtime/payloads/external-statistics-report.json
```

顶层结构：

```json
{
  "sections": {
    "topic": {},
    "summary": {},
    "paper_evidence": [],
    "external_literature_analysis": {},
    "coverage": {},
    "statistics": {},
    "synthesis_report": {},
    "evidence_map": {},
    "source_artifacts": [],
    "diagnostics": {}
  }
}
```

Stage 7 已验证 `taxonomy`、`timeline_events`；Stage 8 已验证 `positioning`、`claims`、
`comparison_matrix`、`debates`、`gaps`、`review_outline`。这些 section 不应出现在
Stage 10 payload 中，runtime 会从已登记工件中保真合并。Patch update 只需提交实际要替换的 Stage 10 section，但仍必须保持该 section 的完整语义深度。

## Report 写作建议

可按以下逻辑组织，但不要求固定标题：

1. 定义与范围：topic 是什么，属于哪个学科/研究领域，边界在哪里。
2. 研究路线：直接吸收并改写 `taxonomy.summary`，说明主要路线、机制差异和路线关系。
3. 历史递进：直接吸收并改写 `timeline_events.summary`，说明阶段、里程碑和当前趋势。
4. 核心发现与比较：综合 claims、comparison_matrix、debates，说明当前最有价值的判断。
5. 缺口与覆盖：综合 gaps、coverage、statistics，区分真实研究空白和库内覆盖不足。
6. 外部文献与入库建议：说明库外关联概念、覆盖判断和建议入库清单。

报告应像一篇压缩的知识综述，而不是 section 摘要清单。每段都要回答“这对理解 topic 有什么用”。
patch 模式若替换 report，替换后的 report 必须仍然覆盖全部七类内容维度。

## 合格内容示例

```json
{
  "external_literature_analysis": {
    "coverage_verdict": "partial",
    "coverage_reason": "库内文献覆盖 DETR-family 的 query-based 主线和效率路线，但传统 detector、anchor-free detector 和早期实时检测器主要只通过 references/citation context 出现。",
    "suggested_additions": [
      {
        "title": "Faster R-CNN",
        "priority": "high",
        "reason": "补足 proposal-based pipeline 背景，使 DETR 的端到端定位更清晰。"
      }
    ]
  },
  "statistics": {
    "coverage_verdict": "partial",
    "route_coverage": "DETR variants 覆盖充分，传统检测器和非 transformer real-time detector 覆盖不足。",
    "reliability_note": "主路线 claims 可由库内 digest 支撑；外部背景结论应保留 caveat。"
  }
}
```

## 不合格反例

```json
{
  "external_literature_analysis": {
    "summary": "外部文献很多。",
    "coverage_verdict": "sufficient"
  },
  "statistics": {
    "paper_count": 21
  },
  "synthesis_report": {
    "title": "Report",
    "body": "这个 topic 很重要，方法很多，未来还有很多工作。"
  }
}
```

问题：coverage verdict 没有理由；statistics 没有解释可靠性；report 没有覆盖研究路线、历史递进、
核心发现、争议、缺口、外部文献和入库建议。

```json
{
  "synthesis_report": {
    "title": "Object Detection Topic Synthesis Report",
    "body": "This topic is organized around three technical routes...",
    "source_section_chapters": {
      "research_routes": "taxonomy.summary",
      "historical_progression": "timeline_events.summary"
    }
  }
}
```
