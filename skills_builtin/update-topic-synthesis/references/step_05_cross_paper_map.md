# Step 05 Cross-Paper Evidence Map

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## 目的

Cross-paper evidence map 把 paper units 聚合为候选事实网络。它不是最终章节，而是后续
taxonomy、timeline、claims、debates、gaps 的候选池。

## 写作原则

- 只聚合已校验 paper units。
- 候选 id 必须稳定，例如 `route:query-based-transformer-detectors`。
- 每个候选必须引用 `pu:<paper-ref>`。
- 缺事实写 `unknown`，不要把库内覆盖不足推断为领域事实缺口。

## 与内容合同的关系

本阶段对应 `topic_synthesis_content_contract.md` 中的证据层级与 `evidence_map` 规则。
你的任务不是写最终结论，而是把跨论文可复用的“候选事实”整理成后续 section 可引用的中间层：

- `taxonomy_candidates`：候选研究路线、方法族、技术流派或评价场景。
- `timeline_candidates`：候选历史节点、阶段转折、里程碑论文或递进关系。
- `claim_candidates`：可以发展成主结论的跨论文判断。
- `comparison_candidates`：可用于比较矩阵的维度、对象和差异。
- `debate_candidates`：争议双方、张力来源、评价口径冲突。
- `gap_candidates`：研究空白、库内覆盖缺口、证据缺口、评价缺口。

主候选必须来自库内 paper units。外部文献、citation graph metrics 和 artifact availability
只能作为背景、排序或诊断信号，不能单独生成主 claim 或主 timeline 候选。

候选粒度应足够支撑后续正文写作。不要只写 “efficiency route” 这类标签；至少说明：

1. 这个候选解决什么问题。
2. 哪些论文支持它。
3. 它与其他候选有什么关系。
4. 后续适合进入 taxonomy、timeline、claims、debates、gaps 中的哪一类。

## 聚合策略

从 paper units 到 evidence map 的关键，是把“单篇事实”变成“可复用的跨文献候选”：

- 按共同问题聚合：多篇论文是否都在解决同一瓶颈，例如收敛慢、注意力成本、小目标表现、实时部署。
- 按机制聚合：是否共享 query selection、denoising training、multi-scale attention、hybrid encoder 等机制。
- 按证据收敛聚合：不同论文是否在相似 benchmark、任务或指标上支持同一判断。
- 按张力聚合：不同路线是否在 accuracy/speed、端到端纯度/工程复杂度、数据依赖/泛化之间形成 trade-off。
- 按覆盖缺口聚合：缺少哪些上游背景、对照路线、benchmark 或应用场景的一手文献。

候选不是最终正文。它应该像“证据路由表”：后续 taxonomy/timeline/claims 可以引用候选 id，
并继续展开分析。update patch 中若只替换部分 section，evidence map 仍要足够支撑被替换 section 的完整深度。

## 候选类型语义

- `taxonomy_candidates`：研究路线、方法族、技术流派、应用场景或评价维度的候选。要说明边界、共同机制和代表 paper units。
- `timeline_candidates`：历史阶段、里程碑、范式转折或评价标准变化。要说明“为什么这是历史节点”，而不只是年份。
- `claim_candidates`：可发展为 synthesis-level finding 的判断。必须至少有一个库内 paper unit 支持，最好有多个支持或限定范围。
- `comparison_candidates`：比较矩阵的维度和对象。维度必须解释实际差异，例如训练信号、计算路径、部署目标、benchmark。
- `debate_candidates`：立场张力或评价口径冲突。必须能说明双方依据。
- `gap_candidates`：分清真实研究空白、库内覆盖不足、artifact 缺失和评价缺口。
- `review_outline_seeds`：面向 Introduction/Related Work 的段落组织线索，通常来自 taxonomy、timeline 和 claims 的组合。

## 合格内容示例

```json
{
  "taxonomy_candidates": [
    {
      "id": "route:convergence-stabilization",
      "label": "Convergence and matching stabilization",
      "paper_unit_refs": ["pu:1:DETR2020", "pu:1:DNDETR2022", "pu:1:DABDETR2022"],
      "analysis": "这些论文共同围绕 DETR 早期 object-query matching 不稳定和训练轮次长的问题展开，分别从 denoising queries、dynamic anchor boxes 和 query initialization 提供更稳定的学习信号。",
      "downstream_use": ["taxonomy", "timeline_events", "claims", "comparison_matrix"]
    }
  ],
  "claim_candidates": [
    {
      "id": "claim:practicality-depends-on-stabilization",
      "paper_unit_refs": ["pu:1:DNDETR2022", "pu:1:DABDETR2022"],
      "claim": "DETR-style detectors 的实用化高度依赖 matching/query learning 的稳定化机制。",
      "scope": "适用于库内 DETR-family object detection papers。",
      "limitations": "缺少非 DETR real-time detector 的一手对照。"
    }
  ]
}
```

## 不合格反例

```json
{
  "taxonomy_candidates": [
    { "id": "route:2020", "label": "2020 methods", "paper_unit_refs": ["pu:1:DETR2020"] }
  ],
  "claim_candidates": [
    { "id": "claim:best", "claim": "这些方法都很好" }
  ]
}
```

问题：路线按年份而不是机制/问题聚合；claim 没有证据范围、原因和 paper-unit provenance；
候选无法支持后续 taxonomy、timeline 或综述写作。

```json
{
  "taxonomy_candidates": [
    {
      "id": "route:query-based-transformer-detectors",
      "label": "Query-based transformer detectors",
      "paper_unit_refs": ["pu:1:ABC12345"],
      "analysis": "This route formulates detection as set prediction."
    }
  ],
  "claim_candidates": [
    {
      "id": "claim:set-prediction-reframes-detection",
      "paper_unit_refs": ["pu:1:ABC12345"],
      "claim": "Set prediction reduces the need for hand-designed post-processing."
    }
  ]
}
```


