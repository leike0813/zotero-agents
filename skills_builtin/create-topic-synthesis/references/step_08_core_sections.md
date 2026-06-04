# Step 08 Core Analytical Sections

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## Payload schema

写入 `runtime/payloads/core-analytical-sections.json`。完整约束以
`assets/schemas/core_analytical_sections.schema.json` 为准；语义解释见下文。

```json
{
  "positioning": {},
  "claims": [],
  "comparison_matrix": { "dimensions": [], "rows": [] },
  "debates": [],
  "gaps": [],
  "review_outline": {}
}
```

## 输出范围

本阶段写 `positioning`、`claims`、`comparison_matrix`、`debates`、`gaps` 和
`review_outline`，不要改写 taxonomy/timeline。

## 质量要求

- claim 必须有 rationale/analysis、`source_paper_refs`、confidence 和 limitation；runtime 会补齐 `evidence_refs` 与 `evidence_map_refs`。
- comparison matrix 必须按机制、瓶颈、评价场景、性能/效率权衡等可解释维度组织。
- debates 必须说明争议双方、评价口径、证据状态和当前判断。
- gaps 必须区分 research gap、library coverage gap、evidence gap、evaluation gap。

## 各 section 的内容合同

### `positioning`

说明 topic 的概念位置、所属学科/研究领域、与邻近 topic 的边界，以及它为什么值得被单独综合。
不要只写 “属于计算机视觉”；要说明它和上位领域、相邻任务、方法族之间的关系。

### `claims`

每条 claim 都应该是可被证据支撑的综合判断，而不是论文摘要。最低深度：

- 结论本身。
- 为什么这个结论成立。
- 哪些库内 paper evidence 支撑它。
- 适用边界和反例风险。
- 置信度，以及置信度为什么不是更高或更低。

### `comparison_matrix`

比较维度应来自 topic 的实质差异，例如方法机制、训练策略、数据依赖、评价基准、效率/性能权衡、
部署约束、泛化能力。不要只按论文年份或模型名称排列。

### `debates`

争议必须包含双方或多方立场、争议焦点、各自证据、评价口径和当前 synthesis 判断。
如果争议其实来自库内证据不足，应写成 coverage/gaps，而不是伪造领域争议。

### `gaps`

至少区分：

- `research_gap`：领域真实未解决问题。
- `library_coverage_gap`：当前 Zotero 库没有覆盖到的方向。
- `evidence_gap`：artifact 缺失、digest 不足、引用分析不足导致的证据缺口。
- `evaluation_gap`：缺少统一 benchmark、场景或评价指标。

枚举字段必须使用当前 runtime 接受的值：

- `gaps[].gap_type`：`research_gap` / `library_coverage_gap` / `evidence_gap` / `evaluation_gap`。
- `gaps[].severity`：`low` / `medium` / `high` / `critical` / `unknown`。

### `review_outline`

面向 Introduction / Related Work / Literature Review workflow。它应把 taxonomy、timeline、
claims、debates、gaps 转换为可写作的段落骨架：段落功能、核心论点、引用候选和证据来源。

## Claim 类型与深度

优先写以下类型的 synthesis-level claims：

- 概念/范式 claim：topic 如何重新定义问题或方法边界。
- 机制 claim：哪些机制反复出现并支撑路线分化。
- 趋势 claim：历史上研究重心如何迁移。
- 评价 claim：哪些 benchmark、指标或场景影响了结论。
- 限制 claim：当前证据支持到哪里，哪些场景还不能下结论。

claim 要避免“某论文提出某方法”这种 paper-level fact。合格 claim 应能回答：
这个判断跨越了哪些论文？为什么成立？证据在哪个范围内有效？有什么反例或不确定性？

## Comparison dimension 选择

比较矩阵的维度应当帮助读者理解路线差异。优先使用：

- target bottleneck：解决的瓶颈。
- core mechanism：核心机制。
- training/evaluation dependency：训练和评价依赖。
- deployment implication：部署影响。
- failure mode / limitation：主要失败模式。
- evidence strength：证据强弱和适用范围。

如果一个维度只会产生“高/中/低”或“有/无”的空表，应换成更能解释机制差异的维度。

## Debate 与 Gap 的区分

| 情况                                                 | 应写入                                                 |
| ---------------------------------------------------- | ------------------------------------------------------ |
| 多条路线对同一目标采用不同评价口径，证据各有优势     | `debates`                                              |
| 领域中确实尚未解决的问题                             | `gaps` 的 `research_gap`                               |
| 当前 Zotero 库没有覆盖到某条路线或背景               | `gaps` 的 `library_coverage_gap`                       |
| digest/references/citation artifact 缺失导致无法判断 | `gaps` 的 `evidence_gap` 或 diagnostics                |
| benchmark/指标不一致导致无法直接比较                 | 可同时进入 `debates` 与 `evaluation_gap`，但要说明区别 |

## 合格内容示例

```json
{
  "claims": [
    {
      "id": "claim:route-divergence-by-bottleneck",
      "text": "DETR-style object detection 的路线分化主要由训练稳定性、注意力计算和实时部署三个瓶颈驱动。",
      "analysis": "paper units 显示，denoising/dynamic query 工作集中处理 matching 稳定性，deformable/multi-scale attention 工作集中处理计算和小目标问题，real-time variants 则重新组织 encoder/decoder 以满足速度约束。",
      "source_paper_refs": ["1:detr", "1:deformable", "1:rtdetr"],
      "confidence": 0.82,
      "limitations": "对非 DETR 检测器的对照依赖外部文献，库内一手 digest 不足。"
    }
  ],
  "gaps": [
    {
      "id": "gap:traditional-detector-baseline",
      "gap_type": "library_coverage_gap",
      "title": "传统检测器一手背景不足",
      "description": "库内 resolved set 能覆盖 DETR-family 主线，但 Faster R-CNN、YOLO、FCOS 等对照路线缺少 digest，因此外部文献分析只能给出背景性判断。",
      "severity": "high",
      "recommended_action": "优先入库代表性传统检测器和 anchor-free detector 文献。"
    }
  ]
}
```

## 不合格反例

```json
{
  "claims": [
    {
      "id": "claim:good",
      "text": "这些论文都取得了很好的结果。",
      "evidence_refs": ["pe:1_a"]
    }
  ],
  "debates": [
    {
      "title": "是否应该继续研究这个 topic？",
      "current_judgment": "应该。"
    }
  ]
}
```

问题：claim 没有跨文献综合判断、原因和边界；debate 没有立场、评价轴和证据状态。

```json
{
  "claims": [
    {
      "id": "claim:convergence-is-central",
      "text": "Convergence efficiency remains a central DETR-family design pressure.",
      "analysis": "Multiple routes modify query initialization, attention sparsity, or decoder training to reduce cost.",
      "source_paper_refs": ["1:ABC12345"],
      "confidence": "medium",
      "limitations": "Mostly supported by detection benchmarks."
    }
  ]
}
```
