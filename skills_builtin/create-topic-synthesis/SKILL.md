---
name: create-topic-synthesis
description: Create a structured Zotero topic_synthesis artifact from a topic seed using the zotero-bridge CLI, package-local SQLite gate scripts, and schema-validated JSON stage artifacts.
---

# create-topic-synthesis

本 skill 运行于 ACP 后台自动化场景。stdout 只能输出一个 JSON 对象。
需要读取 Zotero/Synthesis host 数据时，使用 `zotero-bridge synthesis <subcommand> --input ...`。
如果正式执行中必需的 `zotero-bridge synthesis` 调用不可用或返回失败错误，立即输出合法 `topic_synthesis_canceled`。

## 产品目标与质量标准

Topic Synthesis 是 Zotero 中的信息密集型 topic 知识窗口，也是 Introduction /
Related Work 等写作 workflow 的上游证据材料。它的目标不是字段填空，也不是把论文摘要拼在一起，
而是帮助用户理解一个 topic 的概念边界、研究路线、历史沿革、主要结论、争议、
缺口、库内覆盖状态、库外补充方向和综述写作角度。

最低质量目标：

- 用户读完 `summary`、`taxonomy`、`timeline_events`、`claims`、`external_literature_analysis`、
  `statistics` 和 `synthesis_report` 后，应能说清这个 topic 属于哪个学科/研究领域、
  核心问题是什么、主要技术路线如何分化、关键论文如何推动演进。
- `taxonomy` 是研究路线分析，不是标签表；必须解释每条路线解决什么问题、采用什么机制、
  有哪些代表论文、路线之间是什么关系。
- `timeline_events` 是历史递进逻辑，不是年份列表；必须说明里程碑论文、阶段转折、
  前后工作的延续/修正/融合关系。
- `claims` 是 synthesis-level finding，不是单篇论文结论；每条 claim 都要说明成立原因、
  证据范围、适用边界和置信度。
- `external_literature_analysis` 要判断库外概念/方法/综述/benchmark 与 topic 的关系、
  当前库内覆盖档位，以及下一步建议入库文献。
- `statistics` 要解释 synthesis 可靠性和覆盖结构，而不只是列数字。
- `synthesis_report` 要把结构化 sections 串成连续报告正文，可直接作为用户理解 topic
  和撰写综述时的高密度材料。

内容生成原则：

- 先理解 topic，再写字段；字段服务于“理解 topic”和“支持综述写作”。
- 单篇分析只抽取事实，跨文献阶段才综合；跨文献综合必须回到已校验 triage rows 和 evidence map。
- 库内 paper evidence 支撑主 claim/timeline；库外/外部文献用于背景、覆盖判断和入库建议。
- coverage/gaps 要区分领域真实空白、库内覆盖不足、artifact 证据不足和评价口径缺口。
- 语言要信息密集、可追溯、具体到技术路线/评价场景/方法机制/证据范围。

## 核心执行指令

这部分是 gate 返回的 `core_instruction` 的完整等价内容。它只保留跨阶段都必须反复遵守的规则。

1. 先读 `SKILL.md`，不要预读整个 `references/` 目录。
2. 首次进入和每次正式写入/校验 JSON 工件后，都必须重新运行 `scripts/gate_runtime.py`。
3. 每一步看 gate，只执行 gate 返回的动作。
4. 只执行 gate 返回的 `next_action`，不得跳 stage。
5. 同时遵守 gate 返回的 `next_action`、`command_example`、`instruction_refs`、`schema_refs`、`core_instruction` 和 `execution_note`。
6. SQLite 只保存流程状态、action receipt、manifest、hash、progress 和 artifact_registry；语义内容真源是 run workspace 中的 JSON 工件。
7. 所有语义判断结果必须先整理为结构化 JSON，再通过 `scripts/stage_runtime.py <next_action>` 校验、登记和推进。
   需要写入 payload 的动作都必须使用 `--payload-file`。
8. 不要直接写 SQLite 表来伪造阶段完成；阶段推进必须由对应脚本动作成功写入 receipt。
9. 最终公开产物只能由 `validate_final_artifacts` 从已校验 JSON 工件生成；agent 不得手写或改写 `result/final-output.candidate.json`。
10. 最终 assistant 输出必须是合法业务 JSON 对象，不得追加解释、Markdown fence 或嵌入 markdown。

成功态最终 JSON 示例：

```json
{
  "kind": "topic_synthesis",
  "operation": "create",
  "language": "zh-CN",
  "topic_definition": {
    "id": "detr-style-object-detection",
    "title": "DETR-style Object Detection"
  },
  "resolver_manifest_path": "runtime/payloads/resolver.json",
  "resolver_diagnostics": {
    "final_count": 21,
    "warnings": []
  },
  "artifact_metadata": {},
  "analysis_manifest_path": "result/topic-analysis.json"
}
```

取消态最终 JSON 示例：

```json
{
  "kind": "topic_synthesis_canceled",
  "status": "canceled",
  "reason": "required_zotero_bridge_call_unavailable",
  "message": "Required zotero-bridge synthesis command is unavailable.",
  "topic_seed": "object detection"
}
```

## 输入输出硬契约

- 输入只读取 prompt payload 中的 `topicSeed` 与 `language`。
- `topicSeed` 是创建目标的主题种子。
- `language` 控制自然语言输出；缺失或为 `auto` 时优先使用用户请求语言，无法判断时使用 `zh-CN`。
- 创建前必须通过 `./.zotero-bridge/bin/zotero-bridge synthesis list-topics --input '{}'` 读取 existing topics，
  只根据 topic 的 `title/description/aliases` 做语义重复检查。
- 疑似重复时按 ACP interactive confirmation 处理；用户取消时输出 `topic_synthesis_canceled`。
- 最终 JSON 不得内嵌 `markdown`。
- create 成功的最终响应只包含合法业务 JSON 对象。
- create 成功 stdout 只包含 create schema 允许字段，不携带 update conflict metadata。
- create 的 host apply precondition 只有目标 topic 的 canonical identity 当前不存在；若 topic 已存在，host 必须拒绝并返回 `topic_exists` 或 `duplicate_topic`，不得降级为 update。
- create 成功必须生成公开可消费产物：
  - `result/topic-analysis.json`
  - `result/final-output.candidate.json`
  - `result/sidecars/topic-interest-metadata.json`
  - `result/sidecars/concept-cards-proposal.json`
  - `result/sidecars/topic-graph-relation-proposals.json`
  - `result/sections/*.json`
- 最终 JSON 只保留公开业务 schema 字段，不包含正文 Markdown 或 host/runtime 管理的内部 provenance metadata。
- sidecars 固定路径写入，但由 `result/topic-analysis.json` 的 `sidecars` manifest 对象公开；final stdout 不逐一列出 sidecar path。
- Host apply 负责 canonical persistence 与导出渲染。

## zotero-bridge CLI 调用依赖

必需 CLI 调用：

- `./.zotero-bridge/bin/zotero-bridge synthesis list-topics --input '{}'`
- `./.zotero-bridge/bin/zotero-bridge synthesis get-library-index --input ...`
- `./.zotero-bridge/bin/zotero-bridge synthesis resolve-resolver --input ...`
- `./.zotero-bridge/bin/zotero-bridge synthesis query-concept-kb --input ...`
- `./.zotero-bridge/bin/zotero-bridge synthesis get-citation-graph-metrics --input ...`
- `./.zotero-bridge/bin/zotero-bridge synthesis query-citation-graph-cluster --input ...`
- `./.zotero-bridge/bin/zotero-bridge synthesis export-filtered-paper-artifacts --input ...`

正式执行中如果必需 `./.zotero-bridge/bin/zotero-bridge synthesis <subcommand>` 调用返回 command not found、
unavailable/no such tool、`capability_not_found`、`bridge_unavailable` 或非零退出码，立即输出合法
`topic_synthesis_canceled`，不要排查环境。`synthesis.get_citation_graph_metrics`
返回 missing/stale/empty 不是 blocker，但必须写入 diagnostics；metrics 只用于排序、
role hints、coverage/gaps 和 external-heavy 诊断，不能替代 digest evidence。
`synthesis.export_filtered_paper_artifacts` 是 bounded artifact probe，只导出
`digest-markdown`、`references-json`、`citation-analysis-json` 的过滤结果到 run-local
文件，不通过 CLI stdout 返回大正文。

## 运行时硬合同

本节也是 SQLite 运行时状态真源。

- gate 返回的相对命令默认在 ACP run workspace 执行；Stage 0 会从 DB 真实路径锁定 run root。
- SQLite 路径固定为 `runtime/topic-synthesis.sqlite`。
- `scripts/runtime_db.py` 没有独立 CLI，不要直接运行；所有状态变化通过 gate/stage runtime 完成。
- 阶段状态只允许 `pending`、`running`、`completed`、`failed_retryable`、`failed_terminal`、`canceled`。
- partial/unregistered output 不是合法输出。
- SQLite 保存：
  - runtime inputs
  - stage states
  - action receipts
  - artifact_registry
  - manifest/hash/progress metadata
- SQLite 不保存：
  - digest 正文
  - references 原文
  - citation report 正文
  - taxonomy/claims/report 等语义正文
- 语义内容以 JSON 文件为真源，由 stage runtime 校验 schema 后登记 hash。
- 当 prompt memory 与 SQLite 或已登记 artifact 冲突时，以 SQLite/artifact registry 为准。

## 状态机与 Gate 纪律

状态机阶段固定为：

- `stage_0_runtime_setup`
- `stage_1_topic_context`
- `stage_2_resolver_and_workset`
- `stage_5_paper_triage`
- `stage_6_cross_paper_map`
- `stage_7_cross_paper_evidence`
- `stage_8_core_synthesis`
- `stage_9_kg_enrichment`
- `stage_10_summary_coverage`
- `stage_11_render_and_validate`
- `stage_12_completed`

执行纪律：

- 首次进入先运行：

```bash
python scripts/gate_runtime.py --db "runtime/topic-synthesis.sqlite"
```

等价 gate 入口：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action gate
```

取消入口：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action cancel
```

- 每次正式写入/校验后都必须重新运行 gate。
- gate 返回 blocker 或 repair 路径时，先修复当前 stage，不能跳到后续 stage。
- 只有 gate 进入 repair 路径时才允许参考 SQL 诊断；正常主路径禁止手写 SQLite。
- gate 返回的 `schema_refs` 是当前动作必须满足的 schema 列表。

## LLM 与脚本职责边界

必须由 LLM 完成：

- topic intent
- duplicate check 判断
- resolver 设计
- per-paper triage
- cross-paper evidence map 聚合
- taxonomy / timeline 分析
- claims / comparison / debates / gaps / review_outline 写作
- concept card proposal 语义抽取与 diagnostics
- topic graph relation proposal 语义判断与 diagnostics
- final summary / coverage / reliability / collection guidance 写作
- final section JSON 写作

必须由脚本完成：

- gate 与状态推进
- SQLite 初始化
- resolver cascade：执行 Host Bridge resolver、graph metrics 查询与 filtered artifact export
- action receipt
- schema 校验
- artifact provenance metadata 校验
- digest provenance metadata 注入
- evidence id / evidence map 引用闭环校验
- cross-paper context 拼接
- final manifest/result bundle 生成

绝对禁止：

- 用临时脚本生成语义分析或最终 sections。
- 读取 raw/full artifact payload。
- 手写 host/runtime 管理的 artifact provenance metadata。
- 这些 metadata 由 runtime 注入；LLM 只写当前 stage schema 要求的语义字段。
- 缺 artifact 不是 blocker，但必须记录 missing payload 与 coverage caveat。
- 直接修改 SQLite。
- 把外部文献或 citation graph metrics 作为主 claim/timeline evidence。
- 不得把 metrics row 作为 claim/timeline evidence。

## 参数词表

Topic Synthesis 内容合同以 `references/topic_synthesis_content_contract.md` 与 schema 为准。

- `topicSeed`：用户提供的主题种子。
- `language`：自然语言输出语言。
- `run_root`：Stage 0 从 DB 真实路径锁定的 ACP run workspace。
- `db`：`runtime/topic-synthesis.sqlite`。
- `topic_title`：agent 为新 topic 写出的标题；runtime 用它建立后续持久化 topic key。
- `duplicate_status`：基于 `./.zotero-bridge/bin/zotero-bridge synthesis list-topics --input '{}'` 的重复检查判断。
- `resolver_proposal`：agent 为 topic 写出的可复现 resolver proposal，顶层包含 host canonical `resolver`。
- `resolver_manifest`：runtime 调用 Host Bridge `resolve-resolver` 后生成的执行回执。
- `resolved_paper_set`：Host Bridge `resolve-resolver` 返回的库内论文集合，由 runtime 保存。
- `paper_workset`：runtime 从 resolved paper set 派生的库内论文处理集。
- `resolver_cascade`：runtime 在 Stage 2 内部完成的 resolver、graph metrics 与 filtered artifact export 级联。
- `paper_triage`：单篇论文相关性、质量和核心摘要 JSON 行。
- `cross_paper_evidence_map`：runtime 维护的跨文献候选证据图；主路径不由 agent 手写。
- `source_paper_refs`：agent 在 route/timeline/core/Stage 10 payload 中写的扁平论文来源引用；runtime 用它派生 `evidence_refs` 与 `evidence_map_refs`。
- `evidence_refs`：runtime 根据 `source_paper_refs` 生成的 `paper_evidence` 引用。
- `evidence_map_refs`：runtime 根据 `source_paper_refs` 生成的 evidence map candidate 引用。
- `taxonomy`：研究路线分析 section。
- `timeline_events`：历史沿革分析 section，必须是 `{summary, events}`。
- `kg_enrichment`：`persist_kg_enrichment` 的组合 payload，包含 `concept_details[]`、`topic_relation_candidates[]` 与 `topic_matching_terms`。
- `concept_details`：agent-authored concept enrichment 数组；描述 label、aliases、concept type、domain、definition、disambiguation、topic relevance 和 caveat。
- `topic_matching_terms`：agent-authored topic discovery terms；用于后续发现和匹配，不进入正文 section。
- `topic_relation_candidates`：agent-authored topic graph relation candidate 数组；只能使用允许的 relation type。
- `sidecars`：由 runtime 渲染进 final manifest 的 sidecar 索引；列出 topic interest metadata、concept proposal 与 relation proposal 的固定路径、hash、content type 和 schema id。
- `result/sections/*.json`：最终 section 内容真源。
- `analysis_manifest_path`：最终 topic-analysis manifest 路径。
- `coverage_verdict`：覆盖判断，至少用于 external literature、coverage 和 statistics。

## 枚举值速查

执行中遇到以下字段时必须直接使用列出的值，不要临时创造同义枚举。

- `operation`：create skill 只允许 `create`。
- final `kind`：成功为 `topic_synthesis`；取消为 `topic_synthesis_canceled`。
- final canceled `status`：只允许 `canceled`。
- stage state：`pending` / `running` / `completed` / `failed_retryable` / `failed_terminal` / `canceled`。
- `artifact_type`：`digest` / `references` / `citation_analysis`。
- `payload_type`：`digest-markdown` / `references-json` / `citation-analysis-json`。
- artifact `status`：`available` / `missing` / `decode_error` / `unsupported`。
- `topic.topic_granularity`：`method_family` / `task` / `problem` / `application_scenario` / `theory_concept` / `mechanism` / `dataset_or_benchmark` / `mixed`。
- `paper_triage.topic_relevance.level`：`core` / `related` / `peripheral` / `excluded`。
- `paper_triage.paper_quality.level`：`high` / `medium` / `low` / `unknown`。
- Stage 6 `gap_candidates[].gap_type`：`library_coverage_gap` / `evidence_gap` / `method_gap` / `evaluation_gap` / `review_gap`。
- Final/core `gaps[].gap_type` 当前 runtime 接受：`research_gap` / `library_coverage_gap` / `evidence_gap` / `evaluation_gap`。
  schema 还描述了 `method_gap` / `engineering_gap` / `review_gap`，但当前 stage runtime 会拒绝这些值，执行时不要用于 final/core gaps。
- `gaps[].severity`：`low` / `medium` / `high` / `critical` / `unknown`。
- `coverage_verdict`：`sufficient` / `partial` / `insufficient` / `severely_missing` / `unknown`。
- `representative_references[].information_completeness`：`complete` / `partial` / `minimal` / `unknown`。
- `suggested_additions[].priority`：`high` / `medium` / `low` / `unknown`。
- `concept_details[].concept_type` 建议控制词表：`method_family` / `mechanism` / `task` / `benchmark` / `dataset` / `evaluation_axis` / `training_signal` / `theoretical_construct`。
- `topic_relation_candidates[].relation_type`：`broader_topic_candidate` / `related_topic_candidate` / `overlap_topic_candidate` / `contrast_topic_candidate`。

## 最小执行主路径

### 0. `confirm_runtime_setup`

调用：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --operation create --language "zh-CN" --action confirm_runtime_setup
```

作用：初始化 SQLite，从 DB 路径锁定 run root，固化 operation/language，并进入 `stage_1_topic_context`。
执行纪律：每次先运行 gate，只执行 gate 返回的 `next_action` 和 `command_example`；
如果当前 action 失败，只修正当前 stage payload 后重试，不跳到后续 stage；需要取消时运行
`stage_runtime.py --action cancel`。

### 1. `persist_topic_context`

运行 `./.zotero-bridge/bin/zotero-bridge synthesis list-topics --input '{}'`，做 duplicate check。写：

```text
runtime/payloads/topic-context.json
```

Schema skeleton：

```json
{
  "topic_title": "DETR-style Object Detection",
  "aliases": [],
  "definition": "Query-based object detection methods derived from DETR.",
  "scope_include": [],
  "scope_exclude": [],
  "duplicate_status": "none",
  "duplicate_candidate_ids": [],
  "duplicate_reason": "",
  "diagnostics": []
}
```

然后执行 gate 返回的 persist 命令。payload 必须包含 `topic_title` 与
`duplicate_status`，并按 schema 填写 aliases、definition、scope 和 duplicate
判断字段。
Duplicate check 只使用 topic 的 `title`、`description`、`aliases` 和明确元数据判断语义重复；
不要用全文相似度臆断重复。Stage 1 payload 必须把 topic seed 转成可执行的知识窗口：
概念、范围边界、别名和领域位置都要足够具体，能约束后续 resolver。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_topic_context --payload-file "runtime/payloads/topic-context.json"
```

### 2. `persist_resolver`

如需库内标签、collection 或条目概览，可只读调用
`./.zotero-bridge/bin/zotero-bridge synthesis get-library-index --input ...`
辅助设计 resolver。若需要全库 title，必须从 `cursor=0`、`limit=250` 分页读取到
`has_more=false`；每个 `papers[]` 行包含 title 和该文献 tags。若需要全库 tags 列表，
读取时传 `includeTags:true` 并使用返回的顶层 `tags[]`。这些读取只作为上下文，不写入
Stage 2 payload。

Stage 2 payload 只写 resolver proposal：

```text
runtime/payloads/resolver-proposal.json
```

Schema skeleton：

```json
{
  "resolver": {
    "mode": "tag_query",
    "query": { "and": ["object-detection", "detr"] }
  },
  "resolver_reasoning": "",
  "operation_intent": "create",
  "diagnostics": []
}
```

runtime 会把 proposal 编译为 Host Bridge resolver 输入，并在一次 Stage 2 action 中级联完成：
执行 resolver、写 `runtime/payloads/resolver.json`、派生 paper workset、查询 citation graph metrics、
导出 filtered paper artifacts，并写入 resolver cascade receipts。Resolver 必须可复现，不能只写
“相关论文若干”；resolver query、include/exclude 约束和 diagnostics 都要匹配 Stage 1 的 topic 边界。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_resolver --payload-file "runtime/payloads/resolver-proposal.json"
```

metrics 缺失不阻断，但必须进入 diagnostics。
Metrics 只能作为辅助结构信号：`core` / `foundation` 可影响背景脉络和路线排序；
`frontier` 可影响近期趋势；`isolated` 进入 coverage caveat；`external-heavy`
进入外部文献分析或 coverage diagnostics。不得因为 PageRank、in-degree 等指标较高就把论文写成 claim 或 milestone。

### 3. `persist_paper_triage`

LLM 读取 filtered content files，写：

```text
runtime/payloads/paper-triage-batch.json
```

Schema skeleton：

```json
{
  "analyses": [
    {
      "paper_ref": "1:ABC",
      "topic_relevance": { "level": "core", "reason": "" },
      "paper_quality": { "level": "high", "reason": "" },
      "core_digest": "",
      "caveats": [],
      "diagnostics": []
    }
  ]
}
```

payload 顶层必须是 `analyses[]`。每个 row 只做单篇 triage：判断 topic relevance、paper quality，
并写一到两句 `core_digest`。`topic_relevance.level` 只能是 `core` / `related` /
`peripheral` / `excluded`；`paper_quality.level` 只能是 `high` / `medium` / `low` /
`unknown`。这里不做跨论文综合判断。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_paper_triage --payload-file "runtime/payloads/paper-triage-batch.json"
```

### 6. `export_cross_paper_context` / `derive_cross_paper_evidence_map`

脚本导出：

```text
runtime/views/cross-paper-context.md
runtime/views/external-literature-context.md
runtime/views/cross-paper-context.manifest.json
runtime/views/cross-paper-evidence-index.json
```

LLM 不写 `runtime/payloads/cross-paper-evidence-map.json`。runtime 会从已校验 triage rows
派生跨论文 evidence map、候选 ids 和最终 `evidence_map` section。后续 Stage 7/8/10
payload 只需要在相关对象上写 `source_paper_refs`；runtime 会补齐 `evidence_refs` 与
`evidence_map_refs`。

语义目标：固定 triage provenance 和候选 id 空间，避免 agent 手工维护跨步骤 evidence map。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action export_cross_paper_context
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action derive_cross_paper_evidence_map
```

### 7. `persist_core_synthesis`

读取 `references/step_08_core_synthesis.md`，写：

```text
runtime/payloads/core-analytical-sections.json
```

Schema skeleton：

```json
{
  "taxonomy": { "summary": {}, "nodes": [] },
  "timeline_events": { "summary": {}, "events": [] },
  "positioning": {},
  "claims": [],
  "improvement_dimension_summary": {},
  "improvement_dimensions": [],
  "concept_candidate_labels": [],
  "debates": [],
  "gaps": [],
  "review_outline": {}
}
```

payload 必须包含 taxonomy、timeline_events、positioning、claims、
improvement_dimension_summary、improvement_dimensions、concept_candidate_labels、debates、gaps、
review_outline。需要证据的对象使用 `source_paper_refs`。

语义目标：把路线、历史和核心分析写成一个完整综合 payload。claims 说明 topic-level findings；
improvement_dimensions 解释路线/方法的关键差异；debates 解释评价口径或立场张力；gaps 区分真实研究空白
和当前库内覆盖不足；review_outline 转化为写作骨架。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_core_synthesis --payload-file "runtime/payloads/core-analytical-sections.json"
```

### 8. `persist_kg_enrichment`

读取 `references/step_09_kg_enrichment.md`、已校验 core synthesis、cross-paper context 和 evidence map，写：

```text
runtime/payloads/kg-enrichment.json
```

Schema skeleton：

```json
{
  "schema_id": "synthesis.topic_synthesis_kg_enrichment",
  "schema_version": "1.0.0",
  "concept_details": [],
  "topic_relation_candidates": [],
  "topic_matching_terms": {
    "include_terms": [],
    "must_have_terms": [],
    "methods": [],
    "exclude_terms": [],
    "diagnostics": []
  },
  "diagnostics": []
}
```

payload 必须包含 `concept_details[]`、`topic_relation_candidates[]` 和 `topic_matching_terms`。
`topic_relation_candidates[].relation_type` 只允许 `broader_topic_candidate`、
`related_topic_candidate`、`overlap_topic_candidate`、`contrast_topic_candidate`。runtime 会校验并物化：

```text
result/sidecars/concept-cards-proposal.json
result/sidecars/topic-graph-relation-proposals.json
result/sidecars/topic-interest-metadata.json
```

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_kg_enrichment --payload-file "runtime/payloads/kg-enrichment.json"
```

### 9. `finalize_summary_coverage`

读取 `references/step_10_summary_coverage.md` 和所有已校验 stage artifacts，
写 Stage 10 payload：

```text
runtime/payloads/external-statistics-report.json
```

Schema skeleton：

```json
{
  "summary": { "text": "" },
  "coverage": { "coverage_verdict": "partial", "reason": "" },
  "reliability_caveats": [],
  "external_context_summary": { "summary": "" },
  "collection_suggestions": [],
  "diagnostics": []
}
```

payload 写最终解释：summary prose、coverage verdict/reason、reliability caveats、
external context summary 和 collection suggestions。runtime 会合并已验证 core synthesis，
派生 evidence/provenance，并物化 `result/sections/*.json`。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --operation create --language "zh-CN" --action finalize_summary_coverage --payload-file "runtime/payloads/external-statistics-report.json"
```

### 11. `validate_final_artifacts`

调用：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --operation create --language "zh-CN" --action validate_final_artifacts
```

脚本校验完整 artifact schema，并生成最终业务 JSON 工件：

```text
result/topic-analysis.json
result/sidecars/topic-interest-metadata.json
result/sidecars/concept-cards-proposal.json
result/sidecars/topic-graph-relation-proposals.json
result/final-output.candidate.json
```

### 12. `emit_final_json`

只读取 runtime 生成的最终业务 JSON 并作为最终响应输出：

```bash
Get-Content -Encoding UTF8 "result/final-output.candidate.json"
```

不要追加解释。

## 按需读取附录

只按 gate 返回的 `instruction_refs` 读取以下文档：

- [step_05_paper_triage.md](references/step_05_paper_triage.md)：paper triage 分析。
- [step_06_cross_paper_map.md](references/step_06_cross_paper_map.md)：cross-paper evidence map。
- [step_07_taxonomy_timeline.md](references/step_07_taxonomy_timeline.md)：taxonomy 与 timeline。
- [step_08_core_synthesis.md](references/step_08_core_synthesis.md)：core synthesis。
- [step_09_kg_enrichment.md](references/step_09_kg_enrichment.md)：KG enrichment。
- [step_10_summary_coverage.md](references/step_10_summary_coverage.md)：summary coverage。
- [step_11_render_validate.md](references/step_11_render_validate.md)：final manifest/stdout。
- [topic_synthesis_content_contract.md](references/topic_synthesis_content_contract.md)：完整内容协议。
- [section_examples.md](references/section_examples.md)：合格内容示例与反例。
