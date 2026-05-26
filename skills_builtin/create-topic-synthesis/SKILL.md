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
- 单篇分析只抽取事实，跨文献阶段才综合；跨文献综合必须回到已校验 paper units 和 evidence map。
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
9. 最终公开产物只能由 `validate_final_artifacts` 从已校验 JSON 工件生成；agent 不得手写或改写 `result/result.json`。
10. 最终 assistant 输出必须是合法业务 JSON 对象，不得追加解释、Markdown fence 或嵌入 markdown。

成功态最终 JSON 示例：

```json
{
  "kind": "topic_synthesis",
  "operation": "create",
  "language": "zh-CN",
  "base_hashes": {
    "manifest": "",
    "artifact": "",
    "export": "",
    "metadata": "",
    "index": "sha256:..."
  },
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
  "analysis_manifest_path": "result/topic-analysis.json",
  "concept_cards_proposal_path": "result/sidecars/concept-cards-proposal.json",
  "topic_graph_relation_proposals_path": "result/sidecars/topic-graph-relation-proposals.json"
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
- create 成功必须生成公开可消费产物：
  - `result/topic-analysis.json`
  - `result/result.json`
  - `result/sidecars/concept-cards-proposal.json`
  - `result/sidecars/topic-graph-relation-proposals.json`
  - `result/sections/*.json`
- 最终 JSON 不包含正文 Markdown、agent-authored hash、canonical asset path、Zotero note shard 或 anchor。
- Host apply 负责 canonical persistence 与导出渲染。

## zotero-bridge CLI 调用依赖

必需 CLI 调用：

- `./.zotero-bridge/bin/zotero-bridge synthesis list-topics --input '{}'`
- `./.zotero-bridge/bin/zotero-bridge synthesis get-library-index --input ...`
- `./.zotero-bridge/bin/zotero-bridge synthesis resolve-resolver --input ...`
- `./.zotero-bridge/bin/zotero-bridge synthesis get-citation-graph-metrics --input ...`
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

- 在调用任何 skill 脚本之前，先确认当前工作目录就是 ACP run workspace，不要 `cd` 到别处。
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
- `stage_3_graph_metrics`
- `stage_4_evidence_collection`
- `stage_5_paper_units`
- `stage_6_cross_paper_map`
- `stage_7_route_timeline`
- `stage_8_core_sections`
- `stage_9_kg_proposals`
- `stage_10_external_statistics_report`
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
- per-paper semantic analysis
- cross-paper evidence map 聚合
- taxonomy / timeline 分析
- claims / comparison / debates / gaps / review_outline 写作
- concept card proposal 语义抽取与 diagnostics
- topic graph relation proposal 语义判断与 diagnostics
- external literature / coverage / statistics / synthesis_report 写作
- final section JSON 写作

必须由脚本完成：

- gate 与状态推进
- SQLite 初始化
- action receipt
- schema 校验
- filtered artifact manifest 校验
- content file path/hash 校验
- digest locator 注入
- evidence id / evidence map 引用闭环校验
- cross-paper context 拼接
- final manifest/result bundle 生成

绝对禁止：

- 用临时脚本生成语义分析或最终 sections。
- 读取 raw/full artifact payload。
- 手写 `payload_hash`、`digest_ref`、`digest_locator`。
- digest_ref / digest_locator 由 runtime 会注入，LLM 不复制 hash。
- 缺 artifact 不是 blocker，但必须记录 missing payload 与 coverage caveat。
- 直接修改 SQLite。
- 把外部文献或 citation graph metrics 作为主 claim/timeline evidence。
- 不得把 metrics row 作为 claim/timeline evidence。

## 参数词表

Topic Synthesis 内容合同以 `references/topic_synthesis_content_contract.md` 与 schema 为准。

- `topicSeed`：用户提供的主题种子。
- `language`：自然语言输出语言。
- `run_root`：当前 ACP run workspace，脚本命令中使用 `.`。
- `db`：`runtime/topic-synthesis.sqlite`。
- `topic_definition`：包含 `id`、`title`、definition/scope 等 topic 定义。
- `duplicate_check`：基于 `./.zotero-bridge/bin/zotero-bridge synthesis list-topics --input '{}'` 的重复检查结果。
- `library_index_page`：`./.zotero-bridge/bin/zotero-bridge synthesis get-library-index --input ...` 的完整分页结果，必须包含 `papers[]`。
- library index page 必须包含 `has_more` 与 `index_hash`。
- persist_library_index_page 的 payload 必须包含 papers[]；不要只保存 cursor/hash metadata。
- 字段名必须是 `"papers"`。
- `resolver`：可复现的 topic resolver。
- `resolved_paper_set`：`./.zotero-bridge/bin/zotero-bridge synthesis resolve-resolver --input ...` 返回的库内论文集合。
- `paper_workset`：runtime 从 resolved paper set 派生的库内论文处理集。
- `citation_graph_metrics`：图指标 receipt；只做辅助排序和诊断。
- `filtered_artifact_manifest`：host 导出的 filtered digest/references/citation-analysis 文件清单。
- `paper_unit`：单篇论文语义分析 JSON 行。
- `cross_paper_evidence_map`：跨文献候选证据图。
- `evidence_map_refs`：最终 claims、timeline、taxonomy、comparison、debates、gaps 追溯到 evidence map candidate 的引用。
- `taxonomy`：研究路线分析 section。
- `timeline_events`：历史沿革分析 section，必须是 `{summary, events}`。
- `kg_proposals`：`persist_kg_proposals` 的组合 payload，包含 concept 与 topic graph 两类 proposal。
- `concept_cards_proposal`：agent-authored concept card proposal；只能描述待摄取概念、别名、定义、证据和 diagnostics，不写 canonical concept id。
- `concept_cards_proposal_path`：最终 bundle 中的 concept proposal sidecar 路径，固定为 `result/sidecars/concept-cards-proposal.json`。
- `topic_graph_relation_proposals`：agent-authored topic graph relation proposal；只能使用允许的 relation proposal type，不写 canonical edge id。
- `topic_graph_relation_proposals_path`：最终 bundle 中的 relation proposal sidecar 路径，固定为 `result/sidecars/topic-graph-relation-proposals.json`。
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
- `paper_unit.topic_relevance.level`：`core` / `related` / `peripheral` / `excluded`。
- Stage 6 `gap_candidates[].gap_type`：`library_coverage_gap` / `evidence_gap` / `method_gap` / `evaluation_gap` / `review_gap`。
- Final/core `gaps[].gap_type` 当前 runtime 接受：`research_gap` / `library_coverage_gap` / `evidence_gap` / `evaluation_gap`。
  schema 还描述了 `method_gap` / `engineering_gap` / `review_gap`，但当前 stage runtime 会拒绝这些值，执行时不要用于 final/core gaps。
- `gaps[].severity`：`low` / `medium` / `high` / `critical` / `unknown`。
- `coverage_verdict`：`sufficient` / `partial` / `insufficient` / `severely_missing` / `unknown`。
- `representative_references[].information_completeness`：`complete` / `partial` / `minimal` / `unknown`。
- `suggested_additions[].priority`：`high` / `medium` / `low` / `unknown`。
- `concept_cards_proposal.cards[].concept_type` 建议控制词表：`method_family` / `mechanism` / `task` / `benchmark` / `dataset` / `evaluation_axis` / `training_signal` / `theoretical_construct`。
- `topic_graph_relation_proposals.proposals[].proposal_type`：`broader_topic_candidate` / `related_topic_candidate` / `overlap_topic_candidate` / `contrast_topic_candidate`。

## 最小执行主路径

### 0. `confirm_runtime_setup`

调用：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation create --language "zh-CN" --action confirm_runtime_setup
```

作用：初始化 SQLite、固化 operation/language/run root，并进入 `stage_1_topic_context`。
执行纪律：每次先运行 gate，只执行 gate 返回的 `next_action` 和 `command_example`；
如果当前 action 失败，只修正当前 stage payload 后重试，不跳到后续 stage；需要取消时运行
`stage_runtime.py --action cancel`。

### 1. `persist_topic_context`

运行 `./.zotero-bridge/bin/zotero-bridge synthesis list-topics --input '{}'`，做 duplicate check。写：

```text
runtime/payloads/topic-context.json
```

然后执行 gate 返回的 persist 命令。payload 必须包含 `topic_definition.id` 与
`topic_definition.title`。
Duplicate check 只使用 topic 的 `title`、`description`、`aliases` 和明确元数据判断语义重复；
不要用全文相似度臆断重复。`topic_definition` 必须把 topic seed 转成可执行的知识窗口：
概念、范围边界、别名和领域位置都要足够具体，能约束后续 resolver。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_topic_context --payload-file "runtime/payloads/topic-context.json"
```

### 2. `persist_library_index_page` / `persist_resolver`

分页运行 `./.zotero-bridge/bin/zotero-bridge synthesis get-library-index --input ...`，每页完整保存 `papers[]`。
完成后设计 resolver，运行 `./.zotero-bridge/bin/zotero-bridge synthesis resolve-resolver --input ...`，写：

```text
runtime/payloads/resolver.json
```

runtime 从 resolver result 派生 paper workset。
必须分页读取完整 library index；每页 payload 至少保留 `papers[]`、`cursor`、`next_cursor`、
`has_more` 和 `index_hash`。Resolver 必须可复现，不能只写“相关论文若干”；
resolver query、include/exclude 约束和 diagnostics 都要匹配 Stage 1 的 topic 边界。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_library_index_page --payload-file "runtime/payloads/library-index-page-0.json"
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_resolver --payload-file "runtime/payloads/resolver.json"
```

### 3. `persist_citation_graph_metrics`

按 gate 给出的 paper refs 运行 `./.zotero-bridge/bin/zotero-bridge synthesis get-citation-graph-metrics --input ...`，写：

```text
runtime/payloads/citation-graph-metrics-batch.json
```

metrics 缺失不阻断，但必须进入 diagnostics。
Metrics 只能作为辅助结构信号：`core` / `foundation` 可影响背景脉络和路线排序；
`frontier` 可影响近期趋势；`isolated` 进入 coverage caveat；`external-heavy`
进入外部文献分析或 coverage diagnostics。不得因为 PageRank、in-degree 等指标较高就把论文写成 claim 或 milestone。

payload 顶层必须包含请求批次的 `paper_refs[]`，并保留 bridge 返回的 metrics 结果：

```json
{
  "paper_refs": ["1:ABC", "1:DEF"],
  "result": {
    "ok": true,
    "items": []
  }
}
```

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_citation_graph_metrics --payload-file "runtime/payloads/citation-graph-metrics-batch.json"
```

### 4. `persist_filtered_artifact_manifest`

按 gate 给出的 paper refs 批量调用：

```json
{
  "run_root": "<absolute current ACP run workspace>",
  "paper_refs": ["1:ABC", "1:DEF"]
}
```

`./.zotero-bridge/bin/zotero-bridge synthesis export-filtered-paper-artifacts --input ...` 会写 filtered files；stage runtime 读取：

```text
runtime/payloads/paper-artifacts-manifest.json
```

不要手写 artifact manifest。manifest 中每个 artifact status row 必须包含
`payload_types_seen[]`。若某个 artifact 缺失且 host 没有看到对应 payload type，
`payload_types_seen` 必须是空数组；如果 missing row 中包含自己的 `payload_type`，
runtime 会判定 manifest 自相矛盾。
缺 artifact 不是 blocker，但必须进入 diagnostics；agent 不复制 hash，不手写 artifact manifest，
只消费 host 写出的 manifest 和 filtered content files。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_filtered_artifact_manifest --payload-file "runtime/payloads/paper-artifacts-manifest.json"
```

### 5. `persist_paper_units`

LLM 读取 filtered content files，写：

```text
runtime/payloads/paper-units-batch.json
```

payload 顶层必须是 `analyses[]`，不是 `paper_units[]`。每个 analysis 必须包含
`paper_ref`、`evidence_available`、`bibliographic`、`topic_relevance`、
`research_problem`、`method_contribution`、`evaluation_context`、
`graph_metrics_interpretation`、`findings`、`limitations`、`taxonomy_hints`、
`timeline_candidates`、`claim_support_candidates`、`comparison_facts`、
`external_references`、`citation_contexts`、`missing_payloads`。

关键结构约束：

- `bibliographic.authors` 必须是数组；不要写 `creators`。
- `topic_relevance.level` 只能是 `core` / `related` / `peripheral` / `excluded`。
- `research_problem` 必须是 `{ "text": "...", "scope": "..." }`。
- `method_contribution` 必须是 `{ "route": "...", "mechanism": "...", "claimed_advantage": "...", "target_bottleneck": "..." }`。
- `evaluation_context` 必须是 `{ "datasets": [], "metrics": [], "baselines": [], "setting": "..." }`。
- 不要手写 `digest_locator`；digest 可用时 runtime 会注入。
- digest 缺失时 `evidence_available` 必须是 `false`，且 `claim_support_candidates` 与 `timeline_candidates` 必须为空数组。

语义目标：为后续研究路线、timeline、claim、comparison、debate、gap 和 external analysis
提供可组合证据。这里只做单篇事实抽取，不做跨论文优劣判断或领域总评。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_paper_units --payload-file "runtime/payloads/paper-units-batch.json"
```

### 6. `export_cross_paper_context` / `persist_cross_paper_evidence_map`

脚本导出：

```text
runtime/views/cross-paper-context.md
runtime/views/external-literature-context.md
runtime/views/cross-paper-context.manifest.json
runtime/views/cross-paper-evidence-index.json
```

LLM 写：

```text
runtime/payloads/cross-paper-evidence-map.json
```

语义目标：把已校验 paper units 聚合成 taxonomy/claim/debate/gap/review seeds。
本阶段产出候选证据网络，不写最终 section 正文。

payload 必须包含：

- `schema_id: "synthesis.cross_paper_evidence_map"` 与 `schema_version`。
- `evidence_limits` 对象。
- `taxonomy_candidates[]`，每项必须有 `id` 与 `paper_unit_refs[]`。
- `comparison_dimensions[]`，每项必须有 `id` 与 `coverage_refs[]`。
- `claim_candidates[]`，每项必须有 `id` 与 `supporting_paper_unit_refs[]`。
- `debate_candidates[]`，每项必须有 `id` 与非空 `evidence_type`。
- `gap_candidates[]`，其中 `gap_type` 只能是 `library_coverage_gap` / `evidence_gap` / `method_gap` / `evaluation_gap` / `review_gap`。
- `review_outline_seeds[]` 与 `diagnostics[]`。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action export_cross_paper_context
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_cross_paper_evidence_map --payload-file "runtime/payloads/cross-paper-evidence-map.json"
```

### 7. `persist_route_timeline`

读取 `references/step_07_taxonomy_timeline.md` 和已校验 evidence map，写：

```text
runtime/payloads/route-timeline-synthesis.json
```

payload 必须包含 `taxonomy` 与 `timeline_events`。

语义目标：`taxonomy` 回答“有哪些实质研究路线以及路线之间如何分化/互补/融合”，
`timeline_events` 回答“topic 如何按历史递进逻辑发展，哪些论文构成里程碑和转折点”。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_route_timeline --payload-file "runtime/payloads/route-timeline-synthesis.json"
```

### 8. `persist_core_sections`

读取 `references/step_08_core_sections.md`，写：

```text
runtime/payloads/core-analytical-sections.json
```

payload 必须包含 positioning、claims、comparison_matrix、debates、gaps、review_outline。

语义目标：把路线和历史分析转成可复用的核心综合结论。claims 说明 topic-level findings；
comparison 解释路线/方法的关键差异；debates 解释评价口径或立场张力；gaps 区分真实研究空白
和当前库内覆盖不足；review_outline 转化为写作骨架。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_core_sections --payload-file "runtime/payloads/core-analytical-sections.json"
```

### 9. `persist_kg_proposals`

读取 `references/step_09_kg_proposals.md`、已校验 route/timeline、core sections、cross-paper context 和 evidence map，写：

```text
runtime/payloads/kg-proposals.json
```

payload 必须包含 `concept_cards_proposal.cards[]`、`concept_cards_proposal.diagnostics[]`、
`topic_graph_relation_proposals.proposals[]` 与 `topic_graph_relation_proposals.diagnostics[]`。
relation proposal type 只允许 `broader_topic_candidate`、`related_topic_candidate`、
`overlap_topic_candidate`、`contrast_topic_candidate`；concept card 只能描述 proposal，
不能写 canonical concept id 或 canonical graph edge id。
runtime 会校验并物化两个必交 sidecar：

```text
result/sidecars/concept-cards-proposal.json
result/sidecars/topic-graph-relation-proposals.json
```

没有可靠 proposal 时也必须写空数组和 diagnostics，不能跳过本阶段。skill 只写 proposal，
不得写 canonical concept、sense、alias、topic graph node/edge、SQLite 或 Git sync metadata。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_kg_proposals --payload-file "runtime/payloads/kg-proposals.json"
```

### 10. `persist_external_statistics_report`

读取 `references/step_10_external_statistics_report.md` 和所有已校验 stage artifacts，
写 Stage 10 payload：

```text
runtime/payloads/external-statistics-report.json
```

payload 顶层必须是 `sections` object，只包含 Stage 10 首次生成的 section：
`topic`、`summary`、`paper_evidence`、`external_literature_analysis`、`coverage`、
`statistics`、`synthesis_report`、`evidence_map`、`source_artifacts`、`diagnostics`。
不要把前序已验证的 `taxonomy`、`timeline_events`、`positioning`、`claims`、
`comparison_matrix`、`debates`、`gaps`、`review_outline` 写入这个 payload；
runtime 会保真合并 Stage 7/8 已验证工件，并在 Stage 10 校验通过后物化
`result/sections/*.json`。
其中 `synthesis_report` 必须是带 `title` 的连续报告正文，并覆盖 topic definition/scope、research routes、historical progression、core findings、comparison/debates、gaps/coverage、external literature/collection suggestion；深度在本 stage 首次校验。

语义目标：external literature 判断库内覆盖相对 topic 应有范围的充分程度并给出入库建议；
statistics 解释 synthesis 的可靠性和覆盖结构；synthesis_report 把路线、历史、结论、争议、
缺口、外部文献和收集建议串成一篇连续知识报告。

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation create --language "zh-CN" --action persist_external_statistics_report --payload-file "runtime/payloads/external-statistics-report.json"
```

### 11. `validate_final_artifacts`

调用：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation create --language "zh-CN" --action validate_final_artifacts
```

脚本校验完整 artifact schema，并生成最终业务 JSON 工件：

```text
result/topic-analysis.json
result/result.json
```

### 12. `emit_final_json`

只读取 runtime 生成的最终业务 JSON 并作为最终响应输出：

```bash
Get-Content -Encoding UTF8 "result/result.json"
```

不要追加解释。

## 按需读取附录

只按 gate 返回的 `instruction_refs` 读取以下文档：

- [step_05_paper_units.md](references/step_05_paper_units.md)：paper unit 分析。
- [step_06_cross_paper_map.md](references/step_06_cross_paper_map.md)：cross-paper evidence map。
- [step_07_taxonomy_timeline.md](references/step_07_taxonomy_timeline.md)：taxonomy 与 timeline。
- [step_08_core_sections.md](references/step_08_core_sections.md)：claims、comparison、debates、gaps、review outline。
- [step_09_kg_proposals.md](references/step_09_kg_proposals.md)：concept card 与 topic graph relation proposal sidecar。
- [step_10_external_statistics_report.md](references/step_10_external_statistics_report.md)：external、coverage、statistics、report。
- [step_11_render_validate.md](references/step_11_render_validate.md)：final manifest/stdout。
- [topic_synthesis_content_contract.md](references/topic_synthesis_content_contract.md)：完整内容协议。
- [section_examples.md](references/section_examples.md)：合格内容示例与反例。
