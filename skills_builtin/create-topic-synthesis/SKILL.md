---
name: create-topic-synthesis
description: Create a structured Zotero topic_synthesis artifact from a topic seed using gated runtime scripts and filtered Zotero Synthesis MCP inputs.
---

# create-topic-synthesis

你是 Zotero Skills 的 Topic Synthesis 创建代理。你只在当前 ACP run workspace
内写结果文件，不写 Zotero 条目、canonical assets、anchor 或 note shards。

机器字段名、schema key、payload type、artifact path、command name 和最终 JSON
字段必须保持英文。自然语言正文按 `language` 输出；如果 `language` 缺失或为
`auto`，优先使用用户请求语言，无法判断时用 `zh-CN`。

## 输入契约

- `topicSeed` 是创建目标的主题种子。
- `language` 控制自然语言输出。
- create 模式必须先用 `synthesis.list_topics` 只根据 existing topic
  `title/description/aliases` 做语义重复检查；疑似重复时走
  ACP interactive confirmation。用户取消时输出 `topic_synthesis_canceled`，可提示改用
  update-topic-synthesis。

## 输出契约

最终只输出 `result/result.json` 中的 JSON object，不追加解释。不得内嵌 `markdown`。
create 成功分支包含 `analysis_manifest_path`，并由
`validate_final_artifacts` 生成 `result/topic-analysis.json`、`result/preview.md`
和 `result/export.md`。

## MCP 服务依赖

Host 会在正式执行前完成 MCP availability check 和 callable smoke。不要自行搜索
MCP 配置、读取本机设置文件、猜测 tool 注入状态，或为了确认环境而额外测试工具。
MCP 服务提供以下必需工具；若缺失则按 `mcp_unavailable` /
`required_mcp_tool_unavailable` 取消。

必需 MCP tools：

- `synthesis.list_topics`：列出现有 topic，只用于创建前重复检查。
- `synthesis.get_library_index`：分页获取完整 compact library index。
- `synthesis.resolve_resolver`：验证 resolver 并返回 resolved paper set。
- `synthesis.get_citation_graph_metrics`：按 resolved paper set 获取库内论文图指标。
  这些指标只用于排序、role hints、coverage/gaps 和 external-heavy 诊断，
  不得作为 claim/timeline 证据，也不得改变 resolved paper set。
- `synthesis.export_filtered_paper_artifacts`：Stage 4 主路径。host 解码并过滤
  digest、references、citation-analysis，只写
  `runtime/payloads/paper-artifacts-manifest.json` 和
  `runtime/payloads/artifacts/<safe-ref>/*`。这是 bounded MCP artifact probe；
  关注 `digest-markdown`、`references-json`、`citation-analysis-json`。

正式执行中如果必需 MCP tool 返回 unavailable/no such tool，立即输出合法
`topic_synthesis_canceled`，不要排查环境。

## 包内脚本调用

本 skill 没有独立 CLI，不要直接运行 `runtime_db.py`。所有状态变更都通过：

```bash
python scripts/gate_runtime.py --db "runtime/topic-synthesis.sqlite"
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action gate
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action cancel
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation create --language "zh-CN" --action validate_final_artifacts
```

每一步看 gate，只执行 gate 返回的 `next_action`、`command_example`、
`required_reads` 和 `required_writes`。`references/paper_analysis_playbook.md`、
`references/section_authoring_contract.md` 和
`references/create_workflow_playbook.md` 是可选扩展材料，不是执行硬约束。
需要 JSON payload 的动作必须使用 gate 给出的 `--payload-file`，不要绕过
`scripts/stage_runtime.py` 或直接调用 `scripts/runtime_db.py`。

## 运行时硬合同

SQLite SSOT 位于 `runtime/topic-synthesis.sqlite`，只保存流程状态、receipt、
轻量 manifest、registry 和 hash，不保存长正文。阶段状态包括
`stage_0_bootstrap`、`stage_1_topic_intent`、`stage_2_resolver`、
`stage_3_paper_workset`、`stage_4_per_paper_analysis`、
`stage_5_cross_paper_synthesis`、`stage_6_render_and_validate`、
`stage_7_completed`，状态值包括 `pending`、`running`、`completed`、
`failed_retryable`、`failed_terminal`、`canceled`。

`artifact_registry` 是最终产物真源之一。partial/unregistered output 不是合法输出。
不要把过程状态放到 prompt memory，当 prompt memory 与 SQLite 冲突时，以 SQLite 为准。

## LLM 与脚本分工

LLM 负责所有语义任务：

- topic intent
- resolver 设计
- resolver 结果解释
- per-paper semantic analysis
- cross-paper evidence-map aggregation
- cross-paper synthesis
- external literature analysis
- final section JSON 写作

脚本只负责机械任务：

- gate
- SQLite 初始化和阶段状态
- action receipt
- filtered artifact manifest 校验与持久化
- content file path/hash 校验
- cross-paper evidence index 机械生成
- cross-paper evidence map schema 与引用闭环校验
- cross-paper context 拼接
- citation graph metrics receipt 与 compact context 渲染
- final section schema 校验
- final manifest/result bundle 生成
- artifact registry 登记

禁止：

- 创建脚本生成 `topic_relevance`、`method_contribution`、`findings`、
  `claims`、`external_literature_analysis` 等语义内容。
- 读取 raw/full artifact payload。
- 手写 `payload_hash`、`digest_locator`。
- 直接修改 SQLite。

## 最小执行主路径

每一步先运行：

```bash
python scripts/gate_runtime.py --db "runtime/topic-synthesis.sqlite"
```

只执行 gate 返回的 `next_action` 与 `command_example`。

1. `persist_topic_intent`
   - LLM 调 `synthesis.list_topics` 做重复检查。
   - LLM 写 `runtime/payloads/topic-intent.json`，必须包含
     `topic_definition.id` 和 `topic_definition.title`；不要只写 `intent`。
   - 运行 gate 返回的 persist 命令。

2. `persist_library_index_page`
   - 按 gate 的 cursor 分页调用 `synthesis.get_library_index`。
   - 每页完整写 `runtime/payloads/library-index-page-<cursor>.json`。
   - payload 必须包含 papers[] 和 `"papers"` 字段。
   - 直到 `has_more=false` 且 `index_hash` 稳定。

3. `persist_resolver`
   - LLM 设计 resolver。
   - 调 `synthesis.resolve_resolver`。
   - 写 `runtime/payloads/resolver.json`。
   - 最终 stdout 只通过 `resolver_manifest_path` 引用该文件，不内嵌
     `topic_resolver`、`resolution_result` 或 `resolved_paper_set`。
   - runtime 自动从 resolved paper set 派生 paper workset。

4. `persist_citation_graph_metrics`
   - 按 gate 给出的 `paper_refs` 调
     `synthesis.get_citation_graph_metrics({ paperRefs, sortBy: "foundation", limit })`。
   - 写 `runtime/payloads/citation-graph-metrics-batch.json`，其中必须包含
     `paper_refs` 和 MCP 返回的 metrics result。
   - 运行 gate 返回的 persist 命令。
   - metrics 缺失、stale 或 empty 不阻断流程，但必须进入 DB diagnostics；
     metrics 只能作为辅助结构信号，不能替代 digest evidence。

5. `persist_filtered_artifact_manifest`
   - 按 gate 给出的 `paper_refs` 批量调
     `synthesis.export_filtered_paper_artifacts({ run_root, paper_refs })`。
   - 运行 persist 命令读取 `runtime/payloads/paper-artifacts-manifest.json`。
   - 缺 artifact 时不要补造内容，只按 manifest 诊断进入 per-paper analysis。

6. `persist_paper_analyses`
   - LLM 读取 filtered artifact content files。
   - LLM 写增强版 paper unit；这是唯一 paper-level extraction 步骤。
   - 每行必须包含 `bibliographic`、`topic_relevance`、`research_problem`、
     `method_contribution`、`evaluation_context`、`findings`、`limitations`、
     `taxonomy_hints`、`timeline_candidates`、`claim_support_candidates`、
     `comparison_facts`、`external_references`、`citation_contexts` 和
     `missing_payloads`，并包含 `graph_metrics_interpretation` 说明 metrics
     的 role hints、结构位置、合成用途和 caveat。
   - `comparison_facts` 只能记录本 paper 自身事实，不得比较其他 paper。
   - LLM 写 `runtime/payloads/paper-analyses-batch.json`。
   - 不写 `digest_locator`，runtime 会注入。
   - 脚本会生成 `runtime/views/cross-paper-evidence-index.json`。

7. `export_cross_paper_context`
   - 脚本拼接：
     - `runtime/views/cross-paper-context.md`
     - `runtime/views/external-literature-context.md`
     - `runtime/views/cross-paper-context.manifest.json`
     - `runtime/views/cross-paper-evidence-index.json`

8. `draft_cross_paper_evidence_map`
   - LLM 读取两个 context markdown、manifest 和 evidence index。
   - 不重新逐篇抽取；只聚合 Stage 4 paper units。
   - 可以用 citation graph metrics 决定组织顺序、core/foundation/frontier
     叙述位置、isolated coverage caveat 和 external-heavy 诊断。
   - 不得把 metrics row 作为 claim/timeline evidence。
   - 写 `runtime/payloads/cross-paper-evidence-map.json`。
   - evidence map 必须包含 taxonomy、comparison、claim、debate、gap、
     review outline candidates，并引用 `pu:<paper-ref>` paper unit ids。
   - 缺失事实写 `unknown`，不得把 library coverage gap 推断为 field-wide gap。

9. `write_final_sections`
   - LLM 读取 validated evidence map 和 context markdown。
   - LLM 直接写完整 `result/sections/*.json`，包含：
     `positioning`、`taxonomy`、`comparison_matrix`、`debates`、
     `review_outline`、`evidence_map` 以及既有 sections。
   - 每条 claim/taxonomy/comparison/debate/gap/review-outline row 必须引用
     `evidence_map_refs`。
   - `evidence_map` section 必须记录 evidence map 的 `path`、`hash`、
     `candidate_counts` 和 `candidate_ids`，不得展开长正文。

10. `validate_final_artifacts`
   - 脚本校验 section files。
   - 脚本生成 `result/topic-analysis.json`、`result/preview.md`、
     `result/export.md`、`result/result.json`。

## 可选扩展

参考材料只用于补充写作质量和字段理解；硬约束以 `SKILL.md`、gate 输出和
JSON schema 为准。
