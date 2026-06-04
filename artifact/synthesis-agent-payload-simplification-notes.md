# Synthesis Agent Payload 简化共识记录

本工件记录当前已经达成共识的 payload 简化方向，用于指导下一步修改
`create-topic-synthesis` / `update-topic-synthesis` 的 agent-facing schema、SKILL.md
和 runtime 合同。

## 总原则

- agent 只负责语义判断与综合写作，不负责 host/runtime 已知事实、工具回执、hash、locator、持久化主键和派生 provenance。
- 能由 title、Zotero metadata、artifact manifest、resolver result 或 runtime 状态确定的字段，不应要求 agent 填写。
- payload 应优先扁平化；字段名必须表达“agent 需要判断什么”，而不是暴露最终 artifact 内部结构。
- 对跨步骤依赖强、容易误填的字段，应转为 runtime 派生或 runtime 维护。
- create / update 的并发校验合同继续分裂：
  - `create`: 只检查目标 topic 当前不存在。
  - `update_full`: 使用 `base_hashes`。
  - `update_patch`: 使用 `read_section_hashes`。

## Create Stage 1: `persist_topic_context`

### 当前问题

当前 payload 要求 agent 写：

```json
{
  "topic_definition": {
    "id": "stable-topic-id",
    "title": "Topic Title"
  },
  "duplicate_check": {}
}
```

这里混合了两类职责：

- `topic_definition.id` 是持久化标识 / path-like key，不是 agent 的语义判断。
- `duplicate_check` 是简单判定结果，却用 nested object 暴露给 agent。

### 共识

`topic_definition.id` 不应由 agent 生成。agent 只应写 topic title、别名、定义、范围边界和重复判断语义。

topic id 应由 runtime/host 从 title 派生并规范化，例如 slugify、normalize、冲突处理或冲突拒绝。这样可以避免大小写、空格、标点、多语言 title、同义 title 和重复 topic 带来的一致性问题。

`duplicate_check` 可以展平成语义自明字段。

### 建议 agent-facing payload

```json
{
  "topic_title": "DETR-style Object Detection",
  "aliases": [],
  "definition": "",
  "scope_include": [],
  "scope_exclude": [],
  "duplicate_status": "none",
  "duplicate_candidate_ids": [],
  "duplicate_reason": "",
  "diagnostics": []
}
```

### 建议枚举

`duplicate_status`:

```text
none / possible_duplicate / duplicate / needs_user_confirmation
```

### Runtime 输出

runtime/host 负责物化：

```json
{
  "topic_definition": {
    "id": "detr-style-object-detection",
    "title": "DETR-style Object Detection",
    "aliases": [],
    "scope_boundary": {
      "include": [],
      "exclude": []
    }
  }
}
```

## Create Stage 2: `resolver_and_workset`

### 当前问题

当前 resolver manifest 同时包含：

- agent 设计的 resolver。
- host/runtime 执行 resolver 后得到的 `resolved_paper_set`。
- runtime 派生的 workset 相关信息。

这把“语义设计”和“工具执行回执”混在一个 agent payload 中。

### 共识

Stage 2 真正需要 agent 产生的只有 resolver 语义部分。

`library_index_page` 是 host 返回；`resolved_paper_set` 是 resolver 执行结果；`paper_workset`
是 runtime 派生。agent 不应手写这些执行结果。

### 建议 agent-facing payload

```json
{
  "resolver_queries": [],
  "include_constraints": [],
  "exclude_constraints": [],
  "resolver_reasoning": "",
  "diagnostics": []
}
```

runtime/host 负责执行 resolver，并保存：

```json
{
  "topic_resolver": {},
  "resolved_paper_set": {
    "papers": []
  },
  "resolver_diagnostics": {}
}
```

## Create Stage 3: `graph_metrics`

### 当前问题

当前 stage 暴露的是工具回执：

```json
{
  "paper_refs": [],
  "result": {}
}
```

### 共识

这一步不需要 agent 参与生成 payload。

metrics 获取、receipt 保存、缺失 diagnostics 都应由 runtime/host 完成。agent 只在后续语义分析中读取 metrics 解释，不应整理或提交 metrics receipt。

### 建议

Stage 3 改为 runtime-only action。

agent-facing contract 中只保留说明：

- graph metrics 是辅助信号。
- 不得把 metrics row 作为 claim/timeline evidence。
- metrics 可用于排序、role hints、coverage/gaps 和 external-heavy 诊断。

## Create Stage 4: `evidence_collection`

### 当前问题

当前 stage 暴露 filtered artifact manifest。

### 共识

这一步也不需要 agent 参与。

`filtered_artifact_manifest` 是 host export 的结果；agent 不应手写、不应修补，也不应维护 artifact availability。

### 建议

Stage 4 改为 runtime/host-only action。

agent 的第一个实质语义 payload 应从 Stage 5 开始，但 Stage 5 不再做完整
paper-level semantic analysis，而是做轻量 paper triage，为后续 runtime 组装
cross-paper context 提供排序依据。

## Create Stage 5: `paper_triage`

### 当前问题

当前 schema 要求 agent 写：

```json
{
  "paper_ref": "1:ABC",
  "evidence_available": true,
  "bibliographic": {},
  "topic_relevance": {},
  "research_problem": {},
  "method_contribution": {},
  "evaluation_context": {},
  "missing_payloads": []
}
```

其中部分字段不是 agent 职责：

- `evidence_available` 是 artifact availability 判断，应由 runtime 根据 manifest 派生。
- `bibliographic` 来自 Zotero metadata / library index，不应由 agent 重写。
- `missing_payloads` 来自 artifact manifest，不应由 agent 维护。
- `research_problem`、`method_contribution`、`evaluation_context`、
  `taxonomy_hints`、`claim_support_candidates` 等字段已经接近后续跨论文综合任务，
  让 agent 在 Stage 5 逐篇填写会造成重复阅读和重复分析。

更关键的问题是：Stage 5 原本承担“逐篇 paper 预分析”的职责，但后续 route/timeline、
core sections 和 external/statistics/report 都会基于 cross-paper context 再做一次综合分析。
如果 Stage 5 继续要求复杂单篇分析，随着库规模扩大，agent 工作量和 JSON payload 规模都会快速膨胀。

### 共识

Stage 5 应保留，但改造为轻量 paper triage / context routing 前置步骤。

agent 在这一步只做三件事：

1. 评价每篇论文和 topic 的 relevance。
2. 评价每篇论文作为本 topic synthesis 证据材料的质量。
3. 给每篇论文写一个一两句话的 `core_digest`。

agent 不参与算分、不参与筛选、不估算 token、不决定 full/context_digest 路由。
所有评分、阈值和筛选都由 runtime 根据确定性规则生成，筛选结果直接作为
cross-paper context 组装输入。

### 建议 agent-facing payload

```json
{
  "assessments": [
    {
      "paper_ref": "1:ABC",
      "relevance_level": "core",
      "relevance_reason": "",
      "paper_quality_level": "high",
      "paper_quality_reason": "",
      "core_digest": "",
      "diagnostics": []
    }
  ],
  "batch_diagnostics": []
}
```

### 枚举与字段语义

`relevance_level`:

```text
core / related / peripheral / excluded
```

`paper_quality_level`:

```text
high / medium / low / unknown
```

字段语义：

- `relevance_level`：论文与当前 topic 的关系强度。
- `relevance_reason`：为什么该论文属于或不属于当前 topic 的核心证据范围。
- `paper_quality_level`：该论文作为本 topic synthesis 证据材料的质量，不是泛泛评价论文优劣。
- `paper_quality_reason`：说明质量判断依据，例如实验充分性、方法清晰度、材料完整性、综述价值或证据局限。
- `core_digest`：一两句话概括这篇论文对当前 topic 的核心价值；低分论文在 cross-paper context 中可能只保留此字段。
- `diagnostics`：记录 artifact 不足、无法判断、疑似无关、文本噪声等问题。

### Subagent 委派策略

Stage 5 的任务天然适合并行。gate 给出的 instruction 应显式鼓励：

- 如果当前 agent 具备 subagent 能力，建议按 paper batch 委派 Stage 5。
- 每个 subagent 只处理指定 `paper_ref` 列表。
- subagent 不做 taxonomy、timeline、claims、comparison、debates、gaps 或 external literature 综合。
- subagent 只返回 `assessments[]`，且每个指定 `paper_ref` 有且只有一条 assessment。
- parent agent 负责合并 batch、去重、检查遗漏，并提交最终 payload。

建议 gate instruction 中给出的 subagent prompt skeleton：

```text
You are assessing a batch of papers for a Zotero topic synthesis run.
Topic: <topic title / definition / scope>
Paper refs to assess: <paper_ref list>

For each paper, read only the provided filtered artifacts and return one JSON
assessment. Do not write taxonomy, timeline, claims, comparisons, debates, gaps,
or external literature synthesis.

For each paper decide:
1. relevance_level: core / related / peripheral / excluded
2. relevance_reason: concise reason grounded in the paper artifact
3. paper_quality_level: high / medium / low / unknown, meaning quality as
   evidence for this topic synthesis
4. paper_quality_reason: concise evidence-quality rationale
5. core_digest: one or two sentences capturing this paper's topic-relevant value
6. diagnostics: array of caveats

Return only:
{
  "assessments": [...]
}
```

### Runtime 合并字段与确定性筛选

runtime/host 负责合并或派生：

```json
{
  "bibliographic": {},
  "evidence_available": true,
  "missing_payloads": [],
  "digest_locator": {},
  "payload_hash": "runtime-only"
}
```

其中 `digest_locator` 与 `payload_hash` 仍不得暴露给 agent-authored payload。

runtime 还负责根据 Stage 5 assessment、artifact availability 和 graph metrics 生成确定性
score 与 context selection。agent 不参与这些规则。

建议 runtime 生成：

```json
{
  "paper_scores": [
    {
      "paper_ref": "1:ABC",
      "score": 128,
      "relevance_score": 100,
      "quality_score": 20,
      "graph_role_bonus": 8,
      "artifact_availability_bonus": 0
    }
  ],
  "context_selection": {
    "core_analysis": {
      "full_context_paper_refs": [],
      "digest_only_paper_refs": [],
      "score_threshold": 0,
      "full_context_slot_count": 0
    },
    "external_literature": {
      "full_context_paper_refs": [],
      "digest_only_paper_refs": [],
      "score_threshold": 0,
      "full_context_slot_count": 0
    }
  }
}
```

### 双 cross-paper context 预算

当前系统实际存在两个 cross-paper context：

- `core_analysis` context：服务 taxonomy、timeline、claims、comparison、debates、gaps 和 report 主体。
- `external_literature` context：服务 external literature、coverage、statistics 和入库建议。

两者使用的单篇 full context 内容可能不同，因此应分别计算 full context slot 和 score threshold。

不需要每次动态估算单篇 full context token。可以从库内实际 digest / references /
citation-analysis artifact 抽样，离线校准常量，例如：

```json
{
  "core_analysis_full_context_tokens_per_paper": 6500,
  "external_literature_full_context_tokens_per_paper": 4200,
  "core_analysis_budget_tokens": 200000,
  "external_literature_budget_tokens": 200000,
  "safety_margin_ratio": 0.15
}
```

`core_digest` 不需要动态估算。提示词约束其长度为一两句话，即使上百篇论文的
`core_digest` 堆叠，也不是主要上下文压力。runtime 只需要设定 full context token
预算，并可保留固定安全余量。

### 确定性筛选规则

runtime 对所有 paper 都注入 metadata + `core_digest`。随后分别为
`core_analysis` 和 `external_literature` 选择 full context papers。

建议规则：

```text
usable_budget = budget_tokens * (1 - safety_margin_ratio)
full_context_slot_count = floor(usable_budget / full_context_tokens_per_paper)
```

然后按确定性 score 降序选择 full context papers，直到 slot 用完。阈值为最后一篇
进入 full context 的 paper score。

建议基础分：

```text
relevance_score:
core = 100
related = 65
peripheral = 25
excluded = 0

quality_score:
high = 20
medium = 10
low = 0
unknown = 5

graph_role_bonus:
foundation/core/frontier = 0..8
isolated = 0 或负向 caveat
```

graph metrics 仍只是辅助信号，不得压过 agent 对 topic relevance 的判断。
artifact availability bonus 也只能作为小幅确定性调整。

最终筛选结果直接作为组装 cross-paper context 的输入：

- 阈值以上 paper：注入 full context。
- 阈值以下 paper：只注入 metadata + `core_digest`。
- `excluded` paper 默认不进入 full context，但可以在 diagnostics 或 coverage caveat 中保留记录。

## Create Stage 6: `prepare_cross_paper_context`

### 当前问题

当前 Stage 6 名义上是 `cross_paper_map`，主路径执行：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action export_cross_paper_context
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action derive_cross_paper_evidence_map
```

现在已经不要求 agent 手写 `runtime/payloads/cross-paper-evidence-map.json`。
runtime 会根据已校验 paper set / paper units 派生所谓 `cross_paper_evidence_map`。

但如果这个 map 完全由 runtime 确定性生成，它本质上只能是 provenance 目录或索引，
而不可能是高质量语义 map。

runtime 可以可靠判断：

- paper 是否在 resolved paper set 中。
- `paper_ref` 对应哪个 runtime evidence id。
- paper 有哪些 artifacts。
- digest / references / citation-analysis 是否可用。
- 某个 final section 引用了哪些 paper。
- `source_paper_refs` 是否都合法。
- 最终 `evidence_refs` / `evidence_map_refs` 是否闭合。
- hash / locator / manifest 是否一致。

runtime 不能仅靠确定性逻辑可靠判断：

- 哪些论文共同支持某条真正的 claim。
- 哪些论文构成研究路线分化。
- 哪些论文构成历史转折。
- 哪些 evidence 之间存在 tension / debate。
- 某个 gap 是真实研究空白还是库内覆盖不足。
- 哪些外部文献暗示未覆盖方向。

这些都是语义判断，不应伪装成 runtime-derived semantic map。

### 共识

Stage 6 应重新界定为 runtime 的上下文组装与 provenance 编译阶段，而不是 agent 的跨论文分析阶段。

建议将概念拆成两类：

1. `cross_paper_provenance_index` / `source_paper_evidence_index`
   - runtime-only。
   - 确定性生成。
   - 作用是维护合法引用空间、paper/artifact/hash/locator 映射、final evidence closure。

2. `semantic_evidence_map`
   - 不作为独立 Stage 6 agent payload。
   - 由 Stage 7/8/10 的最终 section 内容反向编译。
   - 作用是表达 route / claim / timeline / debate / gap 与 source papers 之间的语义关系。

### 建议 Stage 6 职责

Stage 6 建议改名为：

```text
prepare_cross_paper_context
```

职责：

- 读取 Stage 5 paper triage 结果。
- 根据 deterministic score 生成 `paper_scores`。
- 分别为 `core_analysis` 和 `external_literature` 生成 `context_selection`。
- 对高分 paper 注入 full context。
- 对低分 paper 只注入 metadata + `core_digest`。
- 输出两个 context views：
  - `runtime/views/cross-paper-context.md`
  - `runtime/views/external-literature-context.md`
- 输出 provenance index：
  - `runtime/views/cross-paper-context.manifest.json`
  - `runtime/views/source-paper-evidence-index.json`
- 后续继续让 agent 只写 `source_paper_refs`。

### 建议 runtime 输出

```json
{
  "schema_id": "synthesis.cross_paper_context_preparation",
  "schema_version": "1.0.0",
  "paper_scores": [],
  "context_selection": {
    "core_analysis": {
      "full_context_paper_refs": [],
      "digest_only_paper_refs": [],
      "score_threshold": 0,
      "full_context_slot_count": 0
    },
    "external_literature": {
      "full_context_paper_refs": [],
      "digest_only_paper_refs": [],
      "score_threshold": 0,
      "full_context_slot_count": 0
    }
  },
  "provenance_index_path": "runtime/views/source-paper-evidence-index.json",
  "context_manifest_path": "runtime/views/cross-paper-context.manifest.json",
  "diagnostics": []
}
```

### Semantic evidence map 后置编译

不要让 agent 先写一个抽象 evidence map，再要求后续 sections 引用它。

更自然的合同是：

- Stage 7 写 taxonomy / timeline 时，在 route node / timeline event 上写 `source_paper_refs`。
- Stage 8 写 claims / comparison / debates / gaps / review_outline 时，在对应对象上写 `source_paper_refs`。
- Stage 10 写 external / coverage / statistics / report 时，在需要证据的位置写 `source_paper_refs`。
- runtime 校验这些 `source_paper_refs` 合法，并补齐 `evidence_refs`。
- runtime 从最终 sections 反向编译 `semantic_evidence_map`。

这样 agent 的任务是自然的：写结论时附证据来源。runtime 的任务是机械的：检查引用合法、
生成稳定 id、汇总 provenance、编译 map。

建议最终 artifact 中的 `evidence_map` 语义来源应来自 Stage 7/8/10 的 section 内容，而不是
Stage 6 runtime placeholder。

### 命名建议

当前 `cross_paper_evidence_map` 如果继续保留，容易误导 agent 以为 Stage 6 在做语义 map。
建议重命名：

```text
cross_paper_provenance_index
```

或：

```text
source_paper_evidence_index
```

真正的语义 map 建议命名为：

```text
semantic_evidence_map
```

并由最终 sections 编译得到。

## Create Stage 7/8: `persist_core_synthesis`

### 当前问题

当前主路径把核心跨论文综合拆成两个阶段：

- Stage 7 `persist_route_timeline`：写 `taxonomy` 与 `timeline_events`。
- Stage 8 `persist_core_sections`：写 `positioning`、`claims`、`comparison_matrix`、
  `debates`、`gaps`、`review_outline`。

这种拆分有明显跨步骤依赖：

- claims 依赖 taxonomy 路线。
- improvement / comparison 判断依赖 route 和 mechanism 分化。
- debates 往往来自路线之间的评价口径差异。
- gaps 依赖路线覆盖、timeline 演进和库内/证据覆盖。
- review_outline 必须综合 taxonomy、timeline、claims、debates 和 gaps。

强行分成两个 agent payload，会让 agent 在 Stage 8 重新回忆 Stage 7，容易造成重复、
断裂和引用不一致。

另外，`comparison_matrix` 对 agent 不自然。它要求 agent 同时决定 comparison dimensions、
rows、cells 和对齐关系，容易把语义分析变成表格填充。把它拆成 axes/rows 也只是把一个复杂问题
换成另一个复杂问题。

### 共识

Stage 7 和 Stage 8 应合并为一个核心综合 payload，建议命名为：

```text
persist_core_synthesis
```

agent 在同一个上下文中一次性写完：

- taxonomy / routes
- timeline
- positioning
- claims
- improvement dimensions
- debates
- gaps
- review outline

然后 runtime 一次校验、派生内部 id、补齐 evidence refs，并编译最终 artifact 需要的结构。

### Runtime 派生内部 id

agent 不应写内部 id。以下 id 均建议由 runtime 根据 label/title/text 派生：

- route id / taxonomy node id
- timeline event id
- claim id
- debate id
- gap id
- review outline paragraph id
- improvement dimension id

agent 只写语义字段，例如 `route_label`、`event_title`、`claim`、`gap_title`、
`source_paper_refs`。runtime 负责生成稳定 id，必要时用短 hash 或序号处理冲突。

### 废弃 agent-facing `comparison_matrix`

`comparison_matrix` 可以直接从 agent-facing payload 中弃掉。

替代方案是“改进维度分析”：agent 不构造矩阵，只分析这个 topic 中不同论文或路线沿哪些维度改进、
这些维度为什么重要、成熟度如何、证据范围和 caveat 是什么。

建议字段：

```json
{
  "improvement_dimension_summary": "",
  "improvement_dimensions": [
    {
      "dimension_label": "Training stability",
      "dimension_analysis": "",
      "representative_items": [],
      "source_paper_refs": [],
      "maturity": "developing",
      "caveat": ""
    }
  ]
}
```

`maturity` 枚举：

```text
emerging / developing / mature / contested / unknown
```

`improvement_dimensions[]` 可覆盖如：

- training stability
- attention / computation efficiency
- multi-scale representation
- data / supervision efficiency
- benchmark generalization
- deployment latency
- robustness / failure modes

最终 artifact 如果仍需要旧的 `comparison_matrix`，应由 runtime 从
`improvement_dimensions[]` 编译适配；但 agent 不再直接填写 `comparison_matrix`。

### 建议 agent-facing payload

```json
{
  "taxonomy_summary": "",
  "routes": [
    {
      "route_label": "",
      "route_definition": "",
      "core_problem": "",
      "mechanism_summary": "",
      "strengths": [],
      "limitations": [],
      "maturity": "developing",
      "relations_to_other_routes": [],
      "source_paper_refs": []
    }
  ],
  "timeline_summary": "",
  "timeline_events": [
    {
      "event_title": "",
      "event_type": "method_breakthrough",
      "phase": "",
      "description": "",
      "historical_role": "",
      "relation_to_previous": "",
      "source_paper_refs": []
    }
  ],
  "positioning": {
    "field_position": "",
    "topic_boundary": "",
    "neighboring_topics": [],
    "why_synthesize_separately": ""
  },
  "claims": [
    {
      "claim": "",
      "analysis": "",
      "source_paper_refs": [],
      "confidence": "medium",
      "limitations": ""
    }
  ],
  "improvement_dimension_summary": "",
  "improvement_dimensions": [
    {
      "dimension_label": "",
      "dimension_analysis": "",
      "representative_items": [],
      "source_paper_refs": [],
      "maturity": "unknown",
      "caveat": ""
    }
  ],
  "debates": [
    {
      "debate_title": "",
      "positions": [],
      "evaluation_axis": "",
      "evidence_state": "",
      "current_judgment": "",
      "source_paper_refs": []
    }
  ],
  "gaps": [
    {
      "gap_title": "",
      "gap_type": "research_gap",
      "description": "",
      "severity": "medium",
      "recommended_action": "",
      "source_paper_refs": []
    }
  ],
  "review_outline": {
    "outline_summary": "",
    "sections": []
  },
  "concept_candidate_labels": [],
  "diagnostics": []
}
```

建议枚举：

```text
route.maturity: emerging / developing / mature / declining / contested / unknown
timeline.event_type: definition_shift / method_breakthrough / scaling / benchmark_shift / deployment / critique / synthesis
claim.confidence: high / medium / low / unknown
gap.gap_type: research_gap / library_coverage_gap / evidence_gap / evaluation_gap
gap.severity: low / medium / high / critical / unknown
improvement_dimension.maturity: emerging / developing / mature / contested / unknown
```

### Timeline event 与 marker 编译

agent-facing payload 不出现 `marker_kind`，也不要求 agent 为绘图维护 marker。

在 agent-facing 合同中，`timeline_events[]` 只表示真正的历史事件或里程碑事件。也就是说：

- agent 填写的每条 `timeline_events[]` 都默认是 milestone 级事件。
- 普通论文不需要 agent 写成 event。
- timeline event 必须解释“为什么它改变了问题定义、方法范式、评价标准、路线成熟度或后续研究方向”。
- timeline event 必须有 `source_paper_refs`，用于说明哪些库内论文支撑这个里程碑判断。
- `phase` 是语义阶段标签，例如 `Paradigm establishment`、`Bottleneck decomposition`、
  `Deployment-oriented consolidation`；它服务历史叙事，不是绘图坐标。

runtime 负责把 timeline 语义事件编译成 UI 友好的 marker：

```json
{
  "timeline_events": {
    "summary": {
      "text": ""
    },
    "markers": [
      {
        "paper_evidence_id": "pe:1",
        "year": 2020,
        "kind": "milestone",
        "event_id": "event:2020-detr"
      },
      {
        "paper_evidence_id": "pe:2",
        "year": 2021,
        "kind": "paper"
      }
    ],
    "events": [
      {
        "id": "event:2020-detr",
        "title": "DETR establishes end-to-end set prediction",
        "phase": "Paradigm establishment",
        "paper_evidence_refs": ["pe:1"],
        "description": "",
        "historical_role": ""
      }
    ]
  }
}
```

`markers` 是前端 timeline 绘图的唯一输入。前端只需要：

1. 读取 `timeline_events.markers`。
2. 按 `year` 分组并计算坐标。
3. 按 `kind` 绘制普通 paper marker 或 milestone marker。

marker 最小字段：

```json
{
  "paper_evidence_id": "pe:1",
  "year": 2020,
  "kind": "paper",
  "event_id": null
}
```

`paper_title`、`event_title`、`phase` 不需要进入 marker；前端可以通过
`paper_evidence_id` 和 `event_id` 查详情。若为了渲染性能需要冗余 label，也应由 runtime
添加，不由 agent 填写。

marker 编译规则：

- 所有 resolved papers 默认都可以生成 `kind = paper` marker。
- 被 agent-authored `timeline_events[].source_paper_refs` 引用的 paper，生成
  `kind = milestone` marker，并附 runtime-derived `event_id`。
- `paper_evidence_id`、`event_id`、marker `year` 均由 runtime 从 paper evidence、
  source paper refs 和 bibliographic metadata 派生。
- runtime 负责按 `paper_evidence_id` 去重。
- 缺年份 paper 不要求 agent 修补；runtime 可生成 diagnostics，或按 UI 需要生成
  `missing_year` 分组。

### Runtime 输出适配

runtime 负责把这个扁平核心综合 payload 编译为最终 artifact 结构：

- `taxonomy.summary`
- `taxonomy.nodes`
- `timeline_events.summary`
- `timeline_events.events`
- `timeline_events.markers`
- `positioning`
- `claims`
- `comparison_matrix` 如仍需兼容旧 artifact，可由 `improvement_dimensions` 机械适配
- `debates`
- `gaps`
- `review_outline`
- `semantic_evidence_map`
- Stage 9 concept enrichment 输入所需的 `concept_candidate_labels`

runtime 同时负责：

- 派生所有内部 id。
- 校验 `source_paper_refs` 是否来自 resolved paper set。
- 补齐 `evidence_refs`。
- 从最终 sections 反向编译 `semantic_evidence_map`。
- 将 `improvement_dimensions` 保留为语义 section 或适配到旧 `comparison_matrix`。
- normalize / 去重 `concept_candidate_labels`，过滤空值和泛词，并查询 Concept KB / alias index，
  为 Stage 9 enrichment 提供可能的 existing concept candidates。

## Create Stage 9: `persist_kg_enrichment`

### 当前问题

原 Stage 9 `persist_kg_proposals` 要求 agent 一次性填写：

- `concept_cards[]`
- `topic_relations[]`
- `topic_interest`
- sidecar 相关 diagnostics

即使已经使用扁平 payload，它仍然混合了三类不同职责：

1. concept discovery：哪些概念值得进入 Concept KB 候选。
2. concept enrichment：给候选概念补 label、aliases、type、definition、disambiguation 等去重信号。
3. sidecar / matching metadata 物化：schema id、topic id、local id、wrapper、seed literature item ids、限额等。

其中 concept discovery 的自然时机其实是 Stage 7/8 的核心综合阶段。agent 在写 taxonomy、
claims、improvement dimensions、debates、gaps 时，最容易顺手识别哪些概念值得建卡。
如果等到 Stage 9 再从零想 concept cards，agent 容易遗漏，也会重复阅读前文。

同时，Concept KB 去重和 topic-paper matching 算法确实需要一部分语义字段，不能为了简化把
`label`、`aliases`、`definition`、`disambiguation`、`topic_relevance` 等关键特征删掉。

### 共识

Stage 9 应改造成 KG enrichment，而不是 sidecar schema 填写。

整体拆分：

```text
Stage 7/8: concept discovery
agent 只写 concept_candidate_labels[]

Stage 9: concept enrichment + topic matching terms
runtime 先查询 Concept KB / alias index，提供可能已有概念 candidates
agent 补全 concept details、topic relation candidates、topic matching terms
runtime 物化 sidecars
```

Stage 9 不应该让 agent 直接从数据库读。runtime/host 负责查询 Concept KB、Topic Graph
和 topic interest index，再把候选匹配上下文作为 gate instruction / runtime view 提供给 agent。

### Stage 7/8 concept discovery payload

在 `persist_core_synthesis` 中新增：

```json
{
  "concept_candidate_labels": [
    "Set prediction",
    "Hungarian matching",
    "Object queries",
    "Deformable attention"
  ]
}
```

这一步只做“发现哪些概念值得进入 Concept KB 候选”。

agent 不写：

- definition
- aliases
- concept type
- evidence
- confidence
- dedupe 信息
- canonical id

runtime 负责 normalize、去重、过滤空值/泛词，并查询 existing Concept KB candidates。

### Stage 9 agent-facing payload

```json
{
  "concept_details": [
    {
      "label": "Set prediction",
      "aliases": [],
      "concept_type": "method_family",
      "domain": "object detection",
      "definition": "",
      "disambiguation": "",
      "topic_relevance": "",
      "caveat": ""
    }
  ],
  "topic_relation_candidates": [
    {
      "relation_type": "broader_topic_candidate",
      "target_topic_title": "",
      "rationale": "",
      "source_section_refs": [],
      "source_paper_refs": [],
      "confidence": "medium",
      "caveat": ""
    }
  ],
  "topic_matching_terms": {
    "include_terms": [],
    "must_have_terms": [],
    "method_terms": [],
    "exclude_terms": []
  },
  "diagnostics": []
}
```

### Concept details 字段

保留：

- `label`
- `aliases`
- `concept_type`
- `domain`
- `definition`
- `disambiguation`
- `topic_relevance`
- `caveat`

移除：

- `source_paper_refs`
- `confidence`
- `local_id`
- `schema_id`
- `schema_version`
- `topic_id`
- `canonical_concept_id`
- `relations`
- `merge_hints`

理由：concept proposal 的重点是提供去重和概念补全所需的 lexical / semantic
disambiguation 信号。`source_paper_refs` 和 `confidence` 对当前 concept 去重质量帮助不大，
反而增加 agent 填写负担。是否进入 review、是否 merge，应由 runtime 根据 KB match
结果和规则决定。

`short_definition` 不要求 agent 填写；runtime 可从 `definition` 机械生成。

### Topic relation candidates 字段

`topic_relation_candidates[]` 仍保留，因为它服务 Topic Graph，不等同于 Concept KB。

保留：

- `relation_type`
- `target_topic_title`
- `rationale`
- `source_section_refs`
- `source_paper_refs`
- `confidence`
- `caveat`

这里 `source_paper_refs` 和 `confidence` 仍有意义，因为 topic relation 是语义关系 proposal，
需要说明依据和置信度。

`relation_type` 枚举：

```text
broader_topic_candidate / related_topic_candidate / overlap_topic_candidate / contrast_topic_candidate
```

### Topic matching terms 字段

保留：

```json
{
  "include_terms": [],
  "must_have_terms": [],
  "method_terms": [],
  "exclude_terms": []
}
```

移除：

```json
{
  "seed_paper_refs": []
}
```

`seed_paper_refs` 应由 runtime 根据 Stage 5/6 的 paper score、context selection 和 resolved paper set
生成。建议优先使用：

- Stage 5 relevance = `core` 的高质量 paper。
- Stage 6 `core_analysis.full_context_paper_refs`。
- score 排名前 N 的 papers。
- 排除 `excluded` 和 artifact 严重不足的 paper。

runtime 再把这些 paper refs 转成 `seed_literature_item_ids`，写入最终
`topic_interest_metadata`。

### Runtime 物化职责

runtime 负责物化三个 sidecars：

```text
result/sidecars/concept-cards-proposal.json
result/sidecars/topic-graph-relation-proposals.json
result/sidecars/topic-interest-metadata.json
```

runtime 注入或派生：

- `schema_id`
- `schema_version`
- `topic_id`
- concept `local_id`
- concept `short_definition`
- concept sidecar wrapper
- topic relation sidecar wrapper
- topic interest metadata wrapper
- `seed_literature_item_ids`
- maxItems 限制
- candidate KB matches / review status
- diagnostics / warnings

### Stage 9 一句话定义

Stage 9 不再是“填写 KG sidecar schema”，而是：

> 基于 Stage 7/8 已发现的 concept labels 和 runtime 提供的 KB match context，
> 补全 concept lexical/semantic disambiguation 信息，并提供 topic graph relation candidates
> 与 topic matching terms；sidecar 结构和 matching seeds 由 runtime 物化。

## 下一步实施建议

1. 先新增或调整 agent-facing stage payload schema，不急于改变最终 topic artifact 内部 section schema。
2. Stage 1 增加 runtime title-to-topic-id 派生逻辑，并把 duplicate_check 展平。
3. Stage 2 拆分 agent-authored resolver proposal 与 runtime resolver execution receipt。
4. Stage 3 / Stage 4 从 agent 主路径移出，改为 runtime-only gate action。
5. Stage 5 从复杂 paper unit analysis 改为轻量 paper triage，只要求 relevance、quality 和 `core_digest`。
6. 在 gate instruction 中加入 subagent 委派建议和 prompt skeleton。
7. Runtime 根据确定性 scoring rule 生成 `paper_scores` 与双 context `context_selection`。
8. 分别为 `core_analysis` 和 `external_literature` 使用校准后的 full context token 常量与阈值。
9. Stage 6 改为 `prepare_cross_paper_context`，输出 context views 与 provenance index，不再称为 semantic evidence map。
10. 将真正的 `semantic_evidence_map` 后置，由 Stage 7/8/10 的 section 内容和 `source_paper_refs` 反向编译。
11. 合并 Stage 7/8 为 `persist_core_synthesis`，一次提交 taxonomy、timeline、positioning、claims、improvement dimensions、debates、gaps 和 review outline。
12. 从 agent-facing payload 中废弃 `comparison_matrix`，改为 `improvement_dimension_summary` 与 `improvement_dimensions[]`。
13. Timeline marker 由 runtime 从 `timeline_events[]`、`source_paper_refs` 和 paper metadata 编译；
    agent-facing payload 不出现 `marker_kind`。
14. 在 `persist_core_synthesis` 中新增 `concept_candidate_labels[]`，作为 Stage 9 enrichment 输入。
15. Stage 9 改为 `persist_kg_enrichment`：agent 补全 `concept_details[]`、
    `topic_relation_candidates[]` 和 `topic_matching_terms`，不再填写 sidecar schema。
16. Runtime 根据 Stage 5/6 的排序和 context selection 派生 `seed_literature_item_ids`，
    不要求 agent 写 seed paper refs。
17. 修改 SKILL.md 和 demo，使 agent 明确知道：前四步主要是 runtime/host 准备，Stage 5 是轻量筛选，Stage 6 是 runtime context preparation，真正跨论文综合从 `persist_core_synthesis` 开始，KG 阶段只做 enrichment。
