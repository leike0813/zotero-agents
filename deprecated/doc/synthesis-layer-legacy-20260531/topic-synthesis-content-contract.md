# Topic Synthesis 内容合同

本文档定义 `topic_synthesis` 的内容协议，作为后续修改
`create-topic-synthesis` / `update-topic-synthesis` workflow、Skill Runtime、
结构化 schema、Synthesis Workbench 前端展示和下游文献综述写作 workflow 的共同真源。

Workflow 产物、manifest sidecars 与 host apply 边界见
[`workflow-artifact-contracts.md`](./workflow-artifact-contracts.md)。本文只规定正文
artifact 的内容质量和结构语义。

`topic_synthesis` 的目标不是生成一份普通 Markdown 摘要，而是把一个 Zotero
文献库中与某个 topic 相关的论文、引用关系、外部参考文献和研究脉络，压缩成一个
信息充分、准确、角度丰富、信息密度高、易理解、可交互、可复用的知识聚合窗口。

## 1. 总体目标

Topic Synthesis 同时服务两个场景：

1. 在 Zotero 中作为高质量文献知识窗口，帮助用户快速理解一个 topic 的概念、
   范围、技术路线、历史沿革、核心结论、争议、空白和证据覆盖状态。
2. 作为 Introduction / Related Work / Literature Review workflow 的上游输入，
   为后续写作提供稳定、可溯源、可引用、可转化为段落的结构化材料。

因此，Topic Synthesis 必须同时具备：

- **结构化真源**：每个 section 都能被前端精确展示和交互。
- **证据约束**：主结论和 timeline 只能由库内 `paper_evidence` 支撑。
- **综述可用性**：每个主要 section 都能转化为综述写作中的一类段落或论证。
- **质量诊断**：明确区分 topic 的真实研究空白、库内覆盖不足和 artifact 缺失。
- **连续报告**：除结构化 section 外，还要提供一份可阅读的 synthesis 报告正文。

不合格输出的典型形态：

- 只有分类名称，没有路线分析。
- timeline 只是按年份列论文，没有历史递进逻辑。
- claim 只有短句，没有论证、边界和限制。
- external literature analysis 只有一段泛泛 summary。
- coverage 只有 paper count，没有判断当前库是否足以代表 topic。
- 前端能显示卡片，但用户读完仍不知道该 topic 的研究内容、技术路线和可写综述角度。

## 2. 证据层级与引用规则

Topic Synthesis 的证据层级分为三类。

第一类是**库内论文证据**。它来自 resolved paper set 中的 Zotero library papers，
并通过 digest artifact、per-paper analysis 和 `paper_evidence` 进入主合成。主
`claims`、`timeline_events`、`taxonomy`、`comparison_matrix`、`debates`、`gaps`
中的关键判断必须能追溯到这类证据。

第二类是**库外文献证据**。它主要来自库内论文的 `references-json` 和
`citation-analysis-json`。库外文献不能直接作为主 claim 或主 timeline evidence，
但可以用于解释研究背景、概念来源、方法脉络、外部依赖和库内覆盖缺口。

第三类是**图指标和统计信号**。例如 citation graph metrics、in/out degree、
PageRank、foundation/frontier role hints、artifact availability 和 route coverage。
这些信号可以影响组织顺序、重要性排序和 coverage/gaps 诊断，但不能替代 digest
证据。

示例：

```json
{
  "claim": "DETR 系列完成了从端到端可行性验证到实时部署的路线扩展。",
  "allowed_evidence": ["pe:1_eimsdeu3", "pe:1_cbjwe4jx"],
  "not_allowed_as_primary_evidence": ["external:vaswani2017", "metrics:foundation_score"],
  "usage_note": "Transformer 原始论文可用于 external_literature_analysis，citation graph metrics 可用于说明 DETR 是 foundation paper，但 claim 本身仍必须由库内 paper evidence 支撑。"
}
```

## 3. Artifact 顶层结构

`topic_synthesis` artifact 使用分层内容合同。本文描述的是完整表达能力，不表示每个 skill provider、每次 update patch 都必须生成所有 rich sections。Workbench 和下游 workflow 必须能读取低于 full-rich 级别的 artifact，并通过 `diagnostics` 解释缺失或降级。

### 3.1 Version Header

每个 artifact 顶层应包含版本元数据，用于让 reader 判断兼容性和迁移策略：

```json
{
  "schema_id": "synthesis.topic_synthesis.v1",
  "schema_version": "1.0.0",
  "content_contract_version": "2026-05",
  "generated_by_skill": "create-topic-synthesis@...",
  "compatible_readers": ["synthesis-workbench>=2026-05"]
}
```

规则：

- `schema_id` 标识结构族，不因字段微调改变。
- `schema_version` 使用语义化版本；breaking section shape 变化必须递增 major。
- `content_contract_version` 标识本文档约定的内容层级和质量要求。
- Reader 遇到较旧 minor 版本应 best-effort 读取；遇到不兼容 major 版本应显示 diagnostics，而不是静默当作损坏 artifact。
- `update-topic-synthesis` patch 不要求把旧 artifact 全量迁移到最新 rich contract；它只需保证 touched sections 满足目标 schema，并保留未触及 sections。

### 3.2 Section Levels

完整 rich artifact 可以包含以下 section：

```text
topic
summary
positioning
taxonomy
timeline_events
claims
comparison_matrix
debates
gaps
external_literature_analysis
coverage
statistics
review_outline
synthesis_report
paper_evidence
evidence_map
source_artifacts
diagnostics
```

其中分层如下：

- **Core required**：`topic`、`summary`、`paper_evidence`、`source_artifacts`、`diagnostics`。这些 section 是 Workbench 最低可读性和可追溯性边界。
- **Analysis recommended**：`positioning`、`taxonomy`、`timeline_events`、`claims`、`coverage`。这些 section 是高质量 synthesis 的主要分析层，但旧 artifact 或局部 update 可以通过 diagnostics 标记未覆盖。
- **Optional rich sections**：`comparison_matrix`、`debates`、`gaps`、`external_literature_analysis`、`statistics`、`review_outline`。它们提升综述可用性，但不应让 reader 因缺失而拒绝整个 artifact。
- **Derived / export-oriented**：`synthesis_report`。它是人类连续阅读视图，不是结构化事实源。
- `paper_evidence`、`evidence_map`、`source_artifacts`、`diagnostics` 偏机器溯源；其它 section 是内容层。
- Markdown export 只是兼容视图，不是展示真源。

### 3.3 Evidence Reference Namespace

Artifact 内所有可引用 ID 必须位于显式命名空间。除 `pe:` 外，同一个 artifact 内不得复用相同 ID 指向不同对象。

| Prefix | Owner | 用途 |
| --- | --- | --- |
| `pe:` | `paper_evidence` | 库内 paper evidence row |
| `pos:` | `positioning` / `evidence_map` | 研究定位相关 evidence map entry |
| `tax:` | `taxonomy` | taxonomy route/node |
| `timeline:` | `timeline_events` | timeline event |
| `claim:` | `claims` | claim |
| `cmp:` | `comparison_matrix` | comparison row |
| `debate:` | `debates` | debate |
| `gap:` | `gaps` | gap |
| `rw:` | `review_outline` | review outline unit |
| `external:` | `external_literature_analysis` | 库外文献分析项 |
| `metrics:` | `statistics` / graph metrics | 指标或统计诊断；不得作为主 claim 证据 |

`evidence_refs` 主要引用 `pe:*`。`evidence_map_refs` 可以引用 section-owned IDs 或 `evidence_map.candidate_ids` 中存在的 ID。Reader 遇到 orphan ref 时应保留 artifact 可读，显示 validation warning；update workflow 应修复 orphan ref 或在 `diagnostics` 说明无法修复的原因。

## 4. `topic`：概念、定义与范围

### 目标

`topic` 负责回答“这个 topic 到底是什么”。它应明确 topic 的概念定义、学科归属、
研究领域、常见别名、相关但不等价的概念、范围边界和排除项。

### 分析要求

必须包含：

- `id`：稳定 topic id。
- `title`：用户可读标题。
- `definition`：概念定义，不超过 1–2 段。
- `discipline`：所属学科，例如 Computer Science、Biomedicine。
- `research_field`：更具体领域，例如 Computer Vision、Information Retrieval。
- `aliases`：同义名、缩写、常见变体。
- `scope_boundary`：纳入范围、排除范围、灰区。
- `topic_granularity`：该 topic 是方法族、任务、问题、应用场景还是理论概念。

### 粒度

定义应足够具体，避免把 topic 写成过大的学科领域。例如“Object Detection”可以是
任务级 topic；“DETR-style object detection”是方法族 topic；“Deformable
attention for detection”是机制级 topic。Skill 必须说明当前 synthesis 实际落在哪个粒度。

### 示例

```json
{
  "id": "detr-style-object-detection",
  "title": "DETR-style Object Detection",
  "definition": "本 topic 指以 object queries、集合预测和二分图匹配为核心的目标检测方法族。它关注如何用端到端预测替代传统 proposal、anchor 和 NMS pipeline，并围绕收敛效率、小目标表现、实时部署和多模态/3D 扩展形成若干研究路线。",
  "discipline": "Computer Science",
  "research_field": "Computer Vision",
  "aliases": ["Detection Transformer", "DETR variants", "Query-based detection"],
  "topic_granularity": "method_family",
  "scope_boundary": {
    "include": [
      "DETR 及其 query-based detection variants",
      "围绕 matching、query、attention、real-time deployment 的 DETR 改进"
    ],
    "exclude": [
      "泛化的 CNN object detection survey",
      "只使用 transformer backbone 但不采用 query/set prediction 的检测器"
    ],
    "gray_zone": [
      "YOLO/anchor-free 方法仅在与 DETR 路线比较或外部背景中出现"
    ]
  }
}
```

## 5. `summary`：高密度入口摘要

### 目标

`summary` 是 Workbench topic card、detail header 和快速阅读入口。它不负责完整论证，
但必须高度压缩 topic 的核心内容。

### 分析要求

建议包含：

- `brief`：1–2 句极短摘要。
- `overview`：一段 150–300 字左右的主题概览。
- `key_takeaways`：3–7 条最重要结论。
- `route_count` / `timeline_span` / `coverage_verdict`：给前端快速展示。

### 粒度

摘要不应重复 topic definition，而应说明“这个 topic 的研究脉络大概是什么、当前库
能告诉用户什么、最重要的判断是什么”。

### 示例

```json
{
  "brief": "DETR-style object detection 已从端到端可行性验证发展为覆盖高精度、实时和 3D 场景的方法族。",
  "overview": "库内文献显示，DETR 系列的核心演进围绕三个瓶颈展开：原始 DETR 的训练收敛慢、小目标性能弱和部署效率不足。后续工作分别通过可变形注意力、去噪训练、动态 query、混合编码器和轻量化/NAS 等路线推进，使 query-based detection 从概念验证走向工程可用。",
  "key_takeaways": [
    "query + matching 是该方法族的共同建模核心。",
    "收敛效率改进是 DETR 实用化的关键转折点。",
    "实时 DETR 路线说明端到端检测已不再只是高成本研究模型。",
    "3D 和多视角扩展表明该范式具有跨场景迁移潜力。"
  ],
  "route_count": 5,
  "timeline_span": {"start_year": 2020, "end_year": 2026},
  "coverage_verdict": "partial"
}
```

## 6. `positioning`：研究定位与综述价值

### 目标

`positioning` 说明这个 topic 为什么值得被综合，当前研究处在什么位置，它对于后续
文献综述写作有什么价值。

### 分析要求

必须回答：

- topic 为什么重要？
- 当前是否仍然活跃？
- 它和上位领域、相邻 topic 的关系是什么？
- 这份 synthesis 可以支持什么样的 review angle？
- 当前库内材料是否足以支撑一个可靠综述？

### 示例

```json
{
  "importance": "DETR-style detection 重新定义了目标检测 pipeline 的基本建模方式，将问题从 proposal generation 与 NMS 后处理转向集合预测。",
  "timeliness": "2020 年之后该路线持续活跃，近期工作从训练效率进一步转向实时部署、轻量化和基础模型特征利用。",
  "field_position": "它位于 object detection、transformer vision models 和 efficient perception systems 的交叉处。",
  "review_position": "适合组织成一篇围绕 query-based detection 演进的 Related Work 小节，也可作为检测器从 CNN pipeline 到 transformer set prediction 的 Introduction 背景。",
  "scope_boundary": {
    "covered": "DETR variants and detection-transformer route",
    "not_covered": "完整 anchor-based / anchor-free detector history"
  },
  "evidence_map_refs": ["pos:route-shift", "pos:real-time-frontier"]
}
```

## 7. `taxonomy`：研究路线分析

### 目标

`taxonomy` 是 Topic Synthesis 的核心 section 之一。它不是简单分类表，而是对 topic
内部主要研究路线的技术分析。

### 分析要求

`taxonomy` 必须包含一个 section-level `summary` 字段。这个字段不是路线卡片的摘要拼接，
而是要把所有 route nodes 串联起来，给出对 topic 技术版图的整体判断。它应回答：

- 这个 topic 主要由哪些技术路线共同构成。
- 各路线之间是并行、递进、互补、替代还是竞争关系。
- 哪些路线是当前主流，哪些路线是基础路线、成熟路线、边缘路线或新兴路线。
- 各路线之间的核心 trade-off 是什么，例如性能 vs. 训练成本、精度 vs. 实时性、
  通用范式 vs. 任务特化。
- 从综述写作角度，应如何把这些路线组织成一章连续论述。

必须先说明分类轴为什么合理，再给出每条研究路线。每条路线至少包括：

- route 定义。
- 试图解决的核心问题。
- 核心技术机制。
- 代表论文。
- 主要贡献。
- 优势。
- 局限。
- 成熟度或发展状态。
- 与其他路线的关系。
- 可用于综述写作的段落角度。

### 推荐路线层次

路线不应过粗，也不应把每篇论文都当作一条路线。合理粒度通常是：

- 一组论文共享同一个核心瓶颈或机制。
- 路线内部能描述出递进关系。
- 路线之间有比较意义。

### 示例

```json
{
  "primary_axis": "technical route by bottleneck addressed",
  "axis_rationale": "DETR 系列论文的主要差异不在任务定义，而在它们分别针对收敛速度、注意力计算、query 表征、实时部署和跨场景扩展等瓶颈提出机制。",
  "summary": {
    "text": "DETR-style object detection 的路线版图可以理解为围绕 query-based set prediction 实用化瓶颈展开的多线并进。注意力效率路线首先解决全局 attention 的计算和小目标问题，收敛加速路线随后集中处理 matching 不稳定和训练周期过长，高性能组合路线把这些机制整合为强 baseline，实时部署路线则说明该范式开始进入工程可用阶段。跨场景扩展路线不是独立替代前几条路线，而是把 query-based detection 的表示方式迁移到 3D、多视角和复杂感知任务中。因此，这个 topic 的核心不是单一方法取代另一种方法，而是同一范式在效率、学习信号、系统集成和部署约束上的逐层补强。",
    "dominant_routes": ["route:attention-efficiency", "route:convergence-acceleration", "route:high-performance-integration"],
    "emerging_routes": ["route:real-time-deployment", "route:cross-scenario-extension"],
    "route_relationships": [
      {
        "from": "route:attention-efficiency",
        "to": "route:convergence-acceleration",
        "relation": "complementary",
        "explanation": "前者降低特征交互成本，后者稳定 object query 的学习过程。"
      }
    ],
    "main_tradeoffs": [
      "更强的 query/matching 机制通常提升性能和收敛速度，但也增加训练 pipeline 复杂度。",
      "实时部署路线强调速度和工程简洁性，可能牺牲部分高精度组合模型中的复杂机制。"
    ],
    "report_chapter_hint": "可作为 synthesis_report 中“主要研究路线”章节的直接上游材料。"
  },
  "nodes": [
    {
      "id": "route:convergence-acceleration",
      "label": "Convergence acceleration",
      "definition": "针对原始 DETR 训练慢、匹配不稳定的问题，通过去噪训练、动态 anchor query 和改进 query selection 缩短训练周期。",
      "core_problem": "原始 DETR 需要很长训练周期，早期 query-object matching 不稳定。",
      "mechanism": "用 denoising queries、anchor-like dynamic query 或 improved matching supervision 给 decoder 提供更稳定的学习信号。",
      "representative_papers": ["pe:1_nxligkf5", "pe:1_iy3fmwqm", "pe:1_hplz65z2"],
      "main_contributions": [
        "把 DETR 训练从 500 epoch 级别压缩到 12–50 epoch 级别。",
        "让 query-based detector 更接近传统检测器的训练成本。"
      ],
      "strengths": ["训练稳定性提升", "更容易与强 backbone 结合"],
      "limitations": ["机制组合复杂", "部分方法仍依赖大量 tricks 或预训练"],
      "maturity": "成熟路线，已成为后续高性能 DETR variants 的基础组件。",
      "relation_to_other_routes": "与 attention efficiency route 互补；前者优化学习信号，后者优化特征交互成本。",
      "review_angle": "可作为 Related Work 中解释 DETR 实用化转折的核心段落。",
      "evidence_map_refs": ["tax:convergence-acceleration"]
    }
  ]
}
```

## 8. `timeline_events`：历史沿革与递进逻辑

### 目标

`timeline_events` 是 Topic Synthesis 的另一个核心 section。它从时间维度解释研究
如何发展，而不是简单列出每年发生了什么。

### 分析要求

目标合同中，`timeline_events` 不应只是 event array，而应包含 section-level
`summary` 与 `events`。`summary` 负责把所有 event/phase 串联成历史递进分析，
`events` 负责提供可交互 timeline marker 的结构化节点。若当前实现仍暂时使用数组，
也应在后续迁移中把这一层 summary 补为一等字段。

`timeline_events.summary` 至少应说明：

- topic 的发展大致经历了哪些阶段。
- 每个阶段解决了前一阶段留下的什么问题。
- 哪些论文是范式转折或路线合流的里程碑。
- 发展逻辑是线性递进、分叉并行，还是多条路线周期性合流。
- 当前阶段相对于早期阶段的主要变化和仍未解决的问题。
- 这段分析如何转化为 `synthesis_report` 中的“历史沿革与递进逻辑”章节。

每个事件或阶段必须说明：

- 时间点或时间段。
- 代表论文或论文组。
- 当时要解决的瓶颈。
- 具体推进了什么。
- 为什么是里程碑。
- 它如何影响后续研究。
- 它和 `taxonomy` 中哪条路线对应。

### 事件 vs 阶段

单篇里程碑论文可以是 event；多篇论文共同形成的技术转向可以是 phase。前端可以将
phase 作为 timeline 分组，将 event 作为 marker。

### 示例

```json
{
  "summary": {
    "text": "DETR-style detection 的时间线可以分为三个阶段。第一阶段是 2020 年左右的范式建立：DETR 把目标检测改写为集合预测问题，但留下训练慢、小目标弱和部署成本高等问题。第二阶段是 2021–2022 年的瓶颈拆解：Deformable DETR 解决 attention 和多尺度问题，DAB-DETR、DN-DETR 等工作处理 query 初始化、matching 稳定性和训练收敛。第三阶段是 2022 年后的系统化与部署阶段：DINO 等方法整合多种机制形成强 baseline，RT-DETR 和轻量化 variants 则把 query-based detection 推向实时和工程场景。这个递进逻辑说明，该 topic 的发展不是简单逐年刷榜，而是围绕端到端检测范式的实用化约束持续拆解和重组。",
    "phases": [
      {
        "id": "phase:paradigm-establishment",
        "period": "2020",
        "logic": "证明 set-prediction detection 可行，同时暴露训练和效率瓶颈。"
      },
      {
        "id": "phase:bottleneck-decomposition",
        "period": "2021-2022",
        "logic": "围绕 attention、query、matching 和 convergence 分别提出机制修补。"
      },
      {
        "id": "phase:system-and-deployment",
        "period": "2022-",
        "logic": "将机制组合为高性能系统，并向实时部署和跨场景应用扩展。"
      }
    ],
    "milestone_event_refs": ["event:detr-2020", "event:deformable-detr-2021", "event:dino-2022"],
    "report_chapter_hint": "可作为 synthesis_report 中“历史沿革和递进逻辑”章节的直接上游材料。"
  },
  "events": [
    {
      "id": "event:detr-2020",
      "year": 2020,
      "label": "DETR establishes set-prediction detection",
      "phase": "paradigm_shift",
      "route_refs": ["route:query-based-detection"],
      "description": "DETR 将目标检测建模为集合预测问题，用 object queries 与 Hungarian matching 替代 proposal 和 NMS。",
      "bottleneck_addressed": "传统检测 pipeline 依赖候选框生成、anchor 设计和后处理。",
      "why_it_matters": "它证明了端到端目标检测的可行性，并把后续研究焦点转向 query 表征、matching 稳定性和 transformer feature interaction。",
      "progression_logic": "后续 Deformable DETR 处理注意力计算和小目标问题，DN-DETR/DAB-DETR 处理训练收敛和 query 表征问题，DINO 将这些机制组合为高性能系统。",
      "follow_on_effect": "形成 query-based detection 主线，并扩展到 3D、实时检测和轻量化部署。",
      "evidence_refs": ["pe:1_eimsdeu3"],
      "evidence_map_refs": ["timeline:detr-2020"]
    }
  ]
}
```

## 9. `claims`：主要综合结论

### 目标

`claims` 给出跨文献综合后的主要判断。它不是论文摘要，也不是事实摘录，而是基于多个
paper evidence 得出的 synthesis-level finding。

### 分析要求

每条 claim 至少包含：

- `text`：结论。
- `analysis`：为什么可以得出这个结论。
- `evidence_refs`：库内 evidence。
- `evidence_map_refs`：cross-paper evidence map candidate。
- `confidence`：置信度。
- `scope`：适用范围。
- `limitations`：限制、反例、证据不足。
- `review_usage`：可如何用于综述写作。

### 示例

```json
[
  {
    "id": "claim:detr-practicality-shift",
    "text": "DETR-style detectors 的研究重心已经从证明端到端检测可行，转向如何让 query-based detection 在训练成本、实时性和部署谱系上可用。",
    "analysis": "原始 DETR 提供集合预测范式，但其训练周期和小目标表现限制了实用性。后续 Deformable DETR、DN-DETR、DINO、RT-DETR 和轻量化路线分别围绕注意力、匹配、query selection 和实时编码器解决这些瓶颈，显示该 topic 的主线已从 paradigm proposal 转入 system optimization。",
    "evidence_refs": ["pe:1_eimsdeu3", "pe:1_5hbhawiv", "pe:1_nxligkf5", "pe:1_hplz65z2", "pe:1_cbjwe4jx"],
    "evidence_map_refs": ["claim:detr-practicality-shift"],
    "confidence": 0.86,
    "scope": "适用于库内 DETR-style object detection 文献；不等价于所有 object detection 方法的发展趋势。",
    "limitations": [
      "库内传统 CNN/anchor-free detector 文献不足，因此不能完整评价 DETR 与非 DETR 路线的全局竞争关系。"
    ],
    "review_usage": "可作为 Related Work 中从原始 DETR 过渡到 efficient/real-time DETR variants 的主题句。"
  }
]
```

## 10. `comparison_matrix`：比较维度与方法对照

### 目标

`comparison_matrix` 将不同路线或代表方法放在同一组维度下比较，帮助用户理解“这些
方法到底差在哪里”。

### 分析要求

比较维度应围绕可解释的研究问题，而不是只列 AP/FPS。建议包含：

- 目标瓶颈。
- 核心机制。
- 输入/输出假设。
- 训练策略。
- 计算复杂度或部署成本。
- 评价场景。
- 相对优势。
- 局限。

### 示例

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
        "main_limitation": "机制复杂度高，后续仍需与 denoising/query selection 结合。"
      },
      "evidence_map_refs": ["cmp:deformable-detr"]
    }
  ]
}
```

## 11. `debates`：争议、张力和评价口径

### 目标

`debates` 记录 topic 内部尚未完全解决的争议或张力。它应帮助用户理解为什么文献之间
可能得出不同结论。

### 分析要求

每个 debate 至少说明：

- 争议问题。
- 不同立场。
- 各自证据。
- 评价口径差异。
- 当前 synthesis 的判断。
- 仍然不确定的原因。

### 示例

```json
[
  {
    "id": "debate:end-to-end-vs-real-time",
    "title": "端到端建模收益是否足以抵消部署复杂度？",
    "positions": [
      {
        "stance": "end-to-end architecture improves conceptual simplicity and removes NMS",
        "evidence_refs": ["pe:1_eimsdeu3", "pe:1_hplz65z2"]
      },
      {
        "stance": "real-time deployment still requires carefully engineered hybrid encoders and model scaling",
        "evidence_refs": ["pe:1_cbjwe4jx", "pe:1_8838ah6p"]
      }
    ],
    "evaluation_axis": "accuracy-speed tradeoff under hardware-specific inference settings",
    "current_judgment": "端到端建模已经不再天然低效，但实时性依赖具体系统设计，不能仅由 architecture family 推断。",
    "uncertainty": "不同论文使用的硬件、输入尺寸和预训练设置不完全一致。",
    "evidence_map_refs": ["debate:end-to-end-vs-real-time"]
  }
]
```

## 12. `gaps`：研究空白与覆盖缺口

### 目标

`gaps` 必须区分真实研究空白和当前 Zotero 库的覆盖不足。不能把“库里没有”直接写成
“领域没有”。

### Gap 类型

建议使用：

- `research_gap`：文献显示该问题真实未解决。
- `library_coverage_gap`：当前库缺文献，无法判断或覆盖不充分。
- `evidence_gap`：artifact 缺失或 digest 信息不足。
- `method_gap`：方法机制尚未充分探索。
- `evaluation_gap`：缺少统一 benchmark、跨场景评估或公平对比。
- `engineering_gap`：部署、鲁棒性、可维护性、系统集成不足。

### 示例

```json
[
  {
    "id": "gap:cross-hardware-real-time",
    "gap_type": "evaluation_gap",
    "title": "实时 DETR 的跨硬件可比性不足",
    "description": "库内实时检测论文通常报告特定 GPU、输入尺寸和推理设置下的 FPS，难以直接比较不同模型的真实部署收益。",
    "evidence_refs": ["pe:1_cbjwe4jx", "pe:1_8838ah6p"],
    "evidence_map_refs": ["gap:cross-hardware-real-time"],
    "severity": "medium",
    "review_usage": "可用于 Related Work 末尾说明现有实时检测评价仍缺少统一协议。",
    "not_field_wide_claim": false
  },
  {
    "id": "gap:traditional-detector-background",
    "gap_type": "library_coverage_gap",
    "title": "库内传统检测器背景覆盖不足",
    "description": "当前 resolved set 主要是 DETR variants，缺少 Faster R-CNN、YOLO、FCOS 等非 DETR 路线的一手 digest，因此不能充分评价 DETR 与其他检测范式的长期关系。",
    "evidence_refs": [],
    "evidence_map_refs": ["gap:traditional-detector-background"],
    "severity": "high",
    "recommended_action": "补充代表性传统检测器和 anchor-free detector 文献。"
  }
]
```

## 13. `external_literature_analysis`：库外文献分析

### 目标

这是当前最需要强化的 section。它不只是列出 references，而是分析库外文献如何构成
topic 的背景、概念来源、方法脉络和覆盖缺口。

### 分析要求

至少包含：

1. 哪些库外研究、概念、方法与本 topic 密切相关。
2. 这些外部文献被哪些库内 paper 引用，引用语境是什么。
3. 当前库内文献相对于该 topic 应覆盖的范围，覆盖到什么程度。
4. 半定性覆盖结论：`sufficient`、`partial`、`insufficient`、
   `severely_missing`、`unknown`。
5. 下一步入库建议和建议入库文献清单。

### 覆盖档位

- `sufficient`：库内文献覆盖主要路线、关键里程碑和必要外部背景。
- `partial`：能支持当前 topic 的核心路线，但缺少若干背景或相邻路线。
- `insufficient`：只能覆盖局部路线，难以形成可靠综述。
- `severely_missing`：缺少关键奠基文献或主路线，当前 synthesis 只能作为探索草稿。
- `unknown`：artifact 信息不足，无法判断。

### 示例

```json
{
  "summary": "库外文献主要集中在三类：目标检测传统 pipeline、Transformer/attention 基础、以及 COCO/ImageNet/Objects365 等数据与评估基础设施。",
  "themes": [
    {
      "id": "ext:traditional-detectors",
      "title": "Traditional detector pipeline",
      "analysis": "Faster R-CNN、YOLO 和 anchor-free detector 构成 DETR 路线的主要对照背景。库内 DETR paper 常通过这些工作说明 proposal、anchor、NMS 或 real-time baseline 的历史位置。",
      "related_topic_aspect": "解释 DETR 为何强调端到端集合预测。"
    },
    {
      "id": "ext:transformer-attention",
      "title": "Transformer and efficient attention",
      "analysis": "Transformer 原始论文提供 query-key-value attention 基础；efficient attention 相关工作为可变形/稀疏注意力路线提供背景。",
      "related_topic_aspect": "解释 DETR variants 中 attention 机制改造的来源。"
    }
  ],
  "representative_references": [
    {
      "id": "external:faster-rcnn",
      "title": "Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks",
      "year": 2015,
      "authors": ["Ren", "He", "Girshick", "Sun"],
      "cited_by_papers": ["pe:1_eimsdeu3", "pe:1_cbjwe4jx"],
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
  "coverage_reason": "库内文献足以覆盖 DETR variants 主线，但传统检测器、anchor-free detector 和早期 real-time detector 的一手 digest 缺失。",
  "suggested_additions": [
    {
      "title": "Faster R-CNN",
      "reason": "补充 proposal/RPN pipeline 的基础背景。",
      "priority": "high"
    },
    {
      "title": "YOLO / YOLOv3 / YOLOv5 representative papers",
      "reason": "补充实时检测对照路线。",
      "priority": "high"
    }
  ],
  "limitations": "references-json 和 citation-analysis-json 只能提供引用层面的线索；库外文献未读取 digest 时不能作为主结论证据。"
}
```

## 14. `coverage`：证据覆盖与质量状态

### 目标

`coverage` 说明当前 synthesis 的证据基础是否可靠。它偏质量诊断，不直接承担综合报告
正文。

### 分析要求

应包含：

- resolved papers 数量。
- 有 digest 的论文数量。
- 缺失 references/citation analysis 的情况。
- 主 claim 覆盖情况。
- route 覆盖情况。
- timeline 年份覆盖情况。
- 外部文献覆盖情况。
- 主要风险提示。

### 示例

```json
{
  "paper_count": 21,
  "paper_evidence_count": 20,
  "digest_coverage": "20/21",
  "references_coverage": "18/21",
  "citation_analysis_coverage": "17/21",
  "route_coverage_summary": "覆盖 query-based、attention efficiency、convergence acceleration、real-time deployment 和 3D expansion，但传统 detector 对照不足。",
  "claim_coverage_summary": "6 条主 claim 均有至少 2 篇库内 evidence 支撑，3D expansion claim 证据较弱。",
  "timeline_coverage_summary": "2020–2026 覆盖较完整，2020 前背景文献不足。",
  "coverage_verdict": "partial",
  "warnings": [
    "传统检测器和 anchor-free detector 一手文献不足。",
    "部分实时检测结果依赖硬件设置，跨论文比较置信度有限。"
  ]
}
```

## 15. `statistics`：统计指标

### 目标

`statistics` 给前端和下游 workflow 提供可直接展示、排序、过滤或诊断的 topic-level
指标。

### 必备指标

- `paper_count`
- `evidence_paper_count`
- `time_span`
- `route_count`
- `route_coverage`
- `coverage_verdict`
- `external_reference_count`
- `suggested_addition_count`
- `citation_graph_role_counts`

### 示例

```json
{
  "paper_count": 21,
  "evidence_paper_count": 20,
  "time_span": {"start_year": 2020, "end_year": 2026},
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
    "digest": {"available": 20, "missing": 1},
    "references": {"available": 18, "missing": 3},
    "citation_analysis": {"available": 17, "missing": 4}
  }
}
```

## 16. `review_outline`：面向综述写作的骨架

### 目标

`review_outline` 将 synthesis 转化为写作结构，尤其服务 Manuscript Literature
Framing、Related Work 和 survey writing。

### 分析要求

它应指出：

- Introduction 可使用哪些背景链条。
- Related Work 可按哪些 taxonomy / method line 组织。
- 哪些 claim 可以作为段落主题句。
- 哪些 debates/gaps 可作为段尾评价。
- 哪些引用候选适合进入正文。

### 示例

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
      "organization": "按技术路线组织：attention efficiency、convergence acceleration、query design、real-time deployment、3D expansion。",
      "source_sections": ["taxonomy", "timeline_events", "comparison_matrix"],
      "evidence_map_refs": ["tax:convergence-acceleration", "tax:real-time-detr"]
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

## 17. `synthesis_report`：连续正文报告

### 目标

`synthesis_report` 是面向人类阅读的连续正文。它不是 Markdown export 的替代品，也不是结构化事实源，而是将已有结构化分析串成一篇短报告。Reader 不应依赖 `synthesis_report` 反向恢复 taxonomy、timeline、claims 或 evidence facts。

### 分析要求

报告应覆盖：

1. topic 定义与范围。
2. 主要研究路线。
   - 该章节应引用 `taxonomy` 的 section id 或 `taxonomy.summary` 作为上游。
   - 可以重写为更自然的报告语言，但不得引入与 taxonomy nodes 冲突的新路线事实。
   - 如果 `taxonomy` 缺失或降级，应在 `source_section_chapters` 和 `diagnostics` 中说明。
3. 历史沿革和递进逻辑。
   - 该章节应引用 `timeline_events` 的 section id 或 `timeline_events.summary` 作为上游。
   - 可以根据报告节奏压缩，但不得引入与 timeline events 冲突的新里程碑事实。
   - 如果 `timeline_events` 缺失或降级，应在 `source_section_chapters` 和 `diagnostics` 中说明。
4. 核心结论。
5. 主要比较与争议。
6. gaps 和覆盖限制。
7. 外部文献与建议入库方向。

也就是说，`synthesis_report` 是 derived narrative view。它应记录自己的来源 section，但不要求 `taxonomy.summary`、`timeline_events.summary` 和 report 段落逐句强一致。冲突检测以结构化 section 为准；report 冲突时应重写 report，而不是反向修改结构化事实。

### 粒度

建议 800–1800 中文字，取决于 topic 规模。小 topic 可以更短，但必须是连续论述，
不能是 bullet list 或 JSON dump。

### 示例

```json
{
  "title": "DETR-style Object Detection Synthesis Report",
  "source_section_chapters": {
    "research_routes": {"section": "taxonomy", "source": "taxonomy.summary"},
    "historical_progression": {"section": "timeline_events", "source": "timeline_events.summary"}
  },
  "body": "DETR-style object detection 的核心问题，是能否把目标检测从由 proposal、anchor 和 NMS 组成的工程 pipeline，转化为端到端的集合预测问题。原始 DETR 给出了这一范式的第一个清晰答案：用 object queries 表示候选目标，用 Hungarian matching 建立预测集合和目标集合之间的一一对应，从而把检测问题统一到 transformer sequence modeling 框架下。这个转向的重要性不只在于去掉后处理，而在于它改变了后续研究的问题结构：研究者不再只问如何设计更好的候选框，而是转向 query 如何初始化、matching 如何稳定、attention 如何高效、模型如何在实时场景中部署。\n\n从研究路线看，库内文献大致形成五条主线。第一条是注意力效率路线，以 Deformable DETR 为代表，试图解决原始全局 attention 收敛慢和小目标性能弱的问题。第二条是收敛加速路线，通过 denoising training、dynamic anchor query 和 improved query selection 稳定早期匹配过程。第三条是高性能组合路线，将多种机制整合为 DINO 等强系统。第四条是实时部署路线，以 RT-DETR 和轻量化 DETR variants 为代表，说明 query-based detector 已经进入工程可用阶段。第五条是跨场景扩展路线，将 DETR 范式迁移到 3D、多视角和其他感知任务。\n\n这条历史线索显示，DETR 的发展并不是简单的性能竞赛，而是围绕同一个范式瓶颈不断拆解问题：先证明端到端检测可行，再解决训练成本，再处理效率和部署，最后扩展到更复杂场景。当前库内证据足以支持 DETR variants 主线的综合，但对传统 detector、anchor-free detector 和更早实时检测路线的一手覆盖不足，因此外部文献分析建议补充 Faster R-CNN、YOLO 系列和 FCOS 等代表性工作。"
}
```

## 18. `paper_evidence`、`evidence_map`、`source_artifacts` 与 `diagnostics`

### `paper_evidence`

`paper_evidence` 是主证据索引。它只包含库内 resolved paper set 中的论文，并保存
可由 host 打开原始 digest 的 `digest_ref`，不得嵌入 digest 正文。

```json
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
```

#### Deleted / Merged Paper Evidence

Topic artifact 是 historical snapshot。Registry cache 中的 Zotero item deletion、duplicate merge 或 literature redirect 不得后台直接改写 artifact 正文，也不得静默删除 `claims`、`timeline_events`、`taxonomy` 中已经存在的 `pe:*` 引用。

当 source check 发现 `paper_evidence` 引用的 paper 已删除、tombstoned 或 merge 到 survivor 时：

- artifact 仍可读取；
- 对应 `pe:*` row 应保留原始 `paper_ref`、title、year 和 digest_ref 等历史上下文；
- source check diagnostic 应报告：
  - `evidence_missing` / `paper_deleted`：目标 paper 已不可定位；
  - `evidence_redirected`：目标 paper merge/redirect 到 survivor；
  - `artifact_missing`：paper 存在但 required artifact 缺失；
- UI 应把受影响 evidence 标记为 affected/stale evidence，而不是隐藏相关 claim；
- `update-topic-synthesis` 负责在显式 update 中删除、替换、重写或接受 redirect 后的 evidence。

如果 runtime 能提供 redirect target，`paper_evidence` 可以增加非破坏性 metadata：

```json
{
  "id": "pe:1_eimsdeu3",
  "paper_ref": "1:EIMSDEU3",
  "evidence_status": "redirected",
  "redirect_target_ref": "1:CBJWE4JX",
  "source_check_reason": "zotero_duplicate_merge"
}
```

### `evidence_map`

`evidence_map` 连接 Stage 5 cross-paper evidence map 与最终 sections。前端通常不直接
展示完整 evidence map，但 workflow 和 validator 要用它检查引用闭环。

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

### `source_artifacts`

`source_artifacts` 记录本次使用了哪些 digest、references、citation analysis 和 metrics。
它主要服务 freshness、debug 和可追溯性。

### `diagnostics`

`diagnostics` 记录生成限制、缺失 artifact、质量警告、降级路径和不应被误读为领域事实
的内容。

```json
{
  "warnings": [
    "3 papers lack citation-analysis-json; external literature analysis may miss citation context.",
    "Traditional detector background is a library coverage gap, not a field-wide research gap."
  ],
  "quality_flags": ["external_literature_partial", "comparison_hardware_inconsistent"]
}
```

## 19. Workflow 与前端实现约束

### Workflow / Skill

后续 workflow 修改应遵循：

- Stage 4 per-paper analysis 必须抽取路线、timeline、claim、debate、gap 和外部文献信号。
- Stage 5 cross-paper context 必须支持生成研究路线分析和历史递进逻辑。
- final section authoring 应优先生成结构化 sections；`synthesis_report` 若存在，应声明来源 section，而不是成为事实源。
- final section authoring 必须满足当前 artifact 的 `schema_version` 和 section level，再通过 schema/runtime 校验。
- `update-topic-synthesis` 做 section patch 时，若触及 `taxonomy`、`timeline_events`、
  `claims`、`external_literature_analysis`、`statistics` 或 `synthesis_report`，
  必须满足该 section 当前 schema level。若上下文不足以维持 rich depth，应降低该 section 的 `completeness` 或写入 `diagnostics`，不得伪造同等深度。
- `update-topic-synthesis` patch 必须保留未触及 section，不要求顺手迁移整个旧 artifact 到最新 rich contract。
- `topic_interest_metadata`、`concept_cards_proposal`、
  `topic_graph_relation_proposals` 是 manifest sidecars，不属于正文 section，不应为满足
  discovery 或 KG proposal 需求而污染人类可读 artifact。
- final result bundle 的 canonical sidecar 入口是 `analysis_manifest_path` 指向的
  manifest `sidecars` 对象；旧顶层 sidecar path 字段仅为 legacy fallback。

### Frontend

前端展示应优先围绕用户理解组织，而不是机械展示 JSON：

- `topic/summary/positioning`：作为 detail header 和 overview。
- `taxonomy`：先展示路线综合 summary，再以研究路线卡片/路线图展示各 node。
- `timeline_events`：先展示历史递进 summary，再以 timeline 展示 event marker；
  click/hover 应显示事件分析，而不只是标题。
- `claims`：作为可筛选的主要结论列表，支持 evidence drill-down。
- `external_literature_analysis`：作为独立阅读区域，不应压缩成一个小列表。
- `statistics/coverage`：作为指标区和质量诊断区。
- `synthesis_report`：作为连续阅读模式，可用于 copy/export。

### 下游写作 workflow

Manuscript Literature Framing / Review Writing 不应直接把 `synthesis_report` 当成最终
Related Work，而应把它作为高质量背景材料，再结合用户 manuscript context 重新组织。

## 20. 验收标准

一个可读的最低 artifact 必须满足 core required sections：用户能看到 topic 定义、summary、可追溯 paper evidence、source artifact 状态和 diagnostics。

一个 full-rich Topic Synthesis 应满足：

- 用户能在 3 分钟内通过 summary、taxonomy 和 timeline 理解 topic 的主线。
- 用户即使不展开全部 route/event nodes，也能通过 `taxonomy.summary` 和
  `timeline_events.summary` 理解技术路线版图与历史递进逻辑。
- 用户能通过 claims 和 comparison 理解主要结论和方法差异。
- 用户能通过 external literature analysis 知道还缺哪些关键库外文献。
- 用户能通过 statistics/coverage 判断当前 synthesis 是否足以支撑写作。
- 下游 writing workflow 能从 review_outline、claims、taxonomy、timeline 和
  synthesis_report 中抽取可用段落材料。

如果一个 section 可以被替换为“若干短标题 + 若干 paper refs”而不损失信息，说明它没有
达到本内容合同要求。
