# Topic Synthesis Gate JIT 指令总览（2026-05-19）

本文档整理 `create-topic-synthesis` 与 `update-topic-synthesis` 两个 skill 包中
`scripts/gate_runtime.py` 实际会返回的 gate payload。目的不是替代 `SKILL.md`，而是帮助排查
agent 在长程执行中到底应该看到什么指令、什么时候会被 gate 打回、validate 前后应该检查什么。

对应源码：

- `skills_builtin/create-topic-synthesis/scripts/gate_runtime.py`
- `skills_builtin/update-topic-synthesis/scripts/gate_runtime.py`

## Gate Payload 结构

每次运行：

```powershell
python scripts/gate_runtime.py --db "runtime/topic-synthesis.sqlite"
```

gate 返回一个 JSON object，核心字段如下：

```json
{
  "status": "ready | blocked | failed_retryable | failed_terminal | canceled | completed",
  "stage": "stage_0_runtime_setup",
  "next_action": "confirm_runtime_setup",
  "core_instruction": "Hard rules: ...",
  "execution_note": "当前阶段的 just-in-time 指令",
  "command_example": "python scripts/stage_runtime.py ...",
  "required_reads": ["本阶段必须读取的输入或工具"],
  "required_writes": ["本阶段必须写出的文件或 receipt"],
  "instruction_refs": ["references/step_xx_*.md"],
  "schema_refs": ["assets/schemas/*.schema.json"],
  "progress": {}
}
```

`update-topic-synthesis` 的 gate payload 还会额外带：

```json
{
  "recommended_update": {},
  "operation": "update_full | update_patch",
  "changed_sections": [],
  "read_section_hashes": {}
}
```

## 每个 Gate 都会带的核心规则

`core_instruction` 固定为：

```text
Hard rules: execute only this gate's next_action/command_example; do not hand-write SQLite;
do not use temporary scripts to generate semantic content; do not copy or author hashes;
if an action fails, repair the current stage only and rerun gate; final stdout must be exactly result/result.json.
```

这段是防止 agent 在卡住后绕过状态机的最短规则摘要。每个 stage 的 `execution_note` 只补充当前动作的具体做法。

## 全局异常/阻塞分支

这些分支优先于正常 stage。

| 条件 | status | stage | next_action | command_example | 说明 |
| --- | --- | --- | --- | --- | --- |
| run 已取消 | `canceled` | `stage_11_completed` | `emit_topic_synthesis_canceled` | `python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action cancel` | 不再 render sections，输出合法 canceled JSON。 |
| 存在 terminal failure | `failed_terminal` | `stage_11_completed` | `stop` | 空 | 停止或输出 schema-compatible canceled。 |
| 存在 retryable failure | `failed_retryable` | `current_failed_retryable_stage` | `audit_runtime_integrity` | `python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action audit_runtime_integrity` | 先读失败 stage/error，然后修当前 stage payload。不要跳 stage。 |
| runtime integrity audit 失败 | `blocked` | `stage_0_runtime_setup` | `audit_runtime_integrity` | `python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action audit_runtime_integrity` | 结构性破坏，例如 stage 单调性、registry/hash、receipt 问题。必须通过 package-local action repair。 |

## Stage 0：Runtime Setup

| 字段 | create / update |
| --- | --- |
| `status` | `ready` |
| `stage` | `stage_0_runtime_setup` |
| `next_action` | `confirm_runtime_setup` |
| `instruction_refs` | `references/step_00_runtime_gate.md` |
| `schema_refs` | 无 |
| `required_reads` | create：`current working directory`, `input topicSeed/language`；update：`current working directory`, `input topicId/update mode/language` |
| `required_writes` | `runtime/topic-synthesis.sqlite runtime metadata` |

create 命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation "create" --language "zh-CN" --action confirm_runtime_setup
```

update 命令中的 `operation` 通常是 `update_full` 或 `update_patch`：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation "update_full" --language "zh-CN" --action confirm_runtime_setup
```

JIT 重点：初始化 run-local SQLite metadata，先锁定 operation/language，再做语义工作。

## Stage 1：Topic Context

| 字段 | create | update |
| --- | --- | --- |
| `status` | `ready` | `ready` |
| `stage` | `stage_1_topic_context` | `stage_1_topic_context` |
| `next_action` | `persist_topic_context` | `persist_topic_context` |
| `instruction_refs` | `references/step_01_topic_context.md` | 同 create |
| `schema_refs` | `assets/schemas/topic_context_payload.schema.json` | 同 create |
| `required_reads` | `topicSeed`, `language`, `synthesis.list_topics` | `topicId`, `updateScope`, `updateMode`, `synthesis.get_topic_context` |
| `required_writes` | `runtime/payloads/topic-context.json`, `topic_intent rows` | 同 create |

create JIT：

- 调 `synthesis.list_topics` 做 duplicate check。
- 定义 topic intent。
- 写 `runtime/payloads/topic-context.json`。
- 用 `--payload-file` 持久化。

update JIT：

- 调 `synthesis.get_topic_context`，要求包含 current context、recommended_update、current_hashes/base hashes、read section hashes、初始 operation decision。

命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_topic_context --payload-file "runtime/payloads/topic-context.json"
```

### Stage 1 Repair：topic_definition 缺失

如果 `topic_definition.id` 或 `topic_definition.title` 缺失，gate 返回：

| 字段 | 值 |
| --- | --- |
| `status` | `blocked` |
| `stage` | `stage_1_topic_context` |
| `next_action` | `repair_topic_definition` |
| `blocker` | `topic_definition_missing_id` |
| `command_example` | 仍然是 `persist_topic_context --payload-file "runtime/payloads/topic-context.json"` |

JIT 要求：把旧式 intent payload 映射成 `topic_definition`，至少包含 `id` 与 `title`，然后重跑 `persist_topic_context`。

## Stage 2：Resolver And Workset

### Create：完整 Library Index 分页

create 在 resolver 前必须先读完整 compact library index。

| 字段 | 值 |
| --- | --- |
| `status` | `ready` |
| `stage` | `stage_2_resolver_and_workset` |
| `next_action` | `persist_library_index_page` |
| `instruction_refs` | `references/step_02_resolver_workset.md` |
| `schema_refs` | 无 |
| `required_reads` | `MCP synthesis.get_library_index {...}`, `previous library_index_pages receipt chain` |
| `required_writes` | `runtime/payloads/library-index-page-<cursor>.json`, `library_index_pages receipt` |

命令示例：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_library_index_page --payload-file "runtime/payloads/library-index-page-0.json"
```

JIT 重点：

- `limit` 只是 page size，不代表全量 index。
- 必须继续分页直到 `has_more=false`。
- payload 必须包含 `papers[]`、`cursor/next_cursor`、`has_more`、`index_hash`。
- 只保存 cursor/hash metadata 会被 runtime 拒绝。
- 只有 resolver 设计确实需要全局 tag/collection 统计时才请求 `includeTags/includeCollections`。
- 不要常规请求 `includeItems`。

### Create / Update：persist_resolver

| 字段 | create | update |
| --- | --- | --- |
| `status` | `ready` | `ready` |
| `stage` | `stage_2_resolver_and_workset` | `stage_2_resolver_and_workset` |
| `next_action` | `persist_resolver` | `persist_resolver` |
| `instruction_refs` | `references/step_02_resolver_workset.md` | 同 create |
| `schema_refs` | `assets/schemas/resolver_manifest.schema.json` | 同 create |
| `required_reads` | `topic_intent`, `complete library_index_pages receipt`, `synthesis.resolve_resolver` | `recommended_update`, `current artifact sections`, `synthesis.resolve_resolver if needed` |
| `required_writes` | `runtime/payloads/resolver.json`, `topic_resolver rows` | 同 create |

create 命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_resolver --payload-file "runtime/payloads/resolver.json"
```

update JIT 额外强调：

- 选择 `update_full` 或 `update_patch`。
- resolver、paper set、language、schema major change 会强制 `update_full`。
- 持久化 resolver 与 mode diagnostics。

### Stage 2 Blocker：paper_workset 未完成

如果后续阶段需要 paper workset 但 `stage_2_resolver_and_workset` 未完成：

| 字段 | 值 |
| --- | --- |
| `status` | `blocked` |
| `stage` | `stage_2_resolver_and_workset` |
| `next_action` | `persist_resolver` |
| `blocker` | `paper_workset_not_completed` |

JIT：paper workset 由 `persist_resolver` 派生，缺失时重跑 resolver persistence。

## Stage 3：Citation Graph Metrics

| 字段 | create / update |
| --- | --- |
| `status` | `ready` |
| `stage` | `stage_3_graph_metrics` |
| `next_action` | `persist_citation_graph_metrics` |
| `instruction_refs` | `references/step_03_metrics_artifacts.md` |
| `schema_refs` | `assets/schemas/citation_graph_metrics_receipt.schema.json` |
| `required_reads` | `paper_workset batch`, `MCP synthesis.get_citation_graph_metrics {"paperRefs":[...],"sortBy":"foundation","limit":N}` |
| `required_writes` | `runtime/payloads/citation-graph-metrics-batch.json`, `citation_graph_metrics rows`, `citation graph metrics action receipt` |

命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_citation_graph_metrics --payload-file "runtime/payloads/citation-graph-metrics-batch.json"
```

JIT 重点：

- gate 每批最多 `BATCH_SIZE = 25` 篇。
- metrics 是 graph-derived auxiliary signal。
- 可用于 paper ordering、role hints、coverage/gaps、external-heavy diagnostics。
- 不得替代 digest evidence。

`progress` 会包含：

```json
{
  "paper_refs": ["..."],
  "batch_size": 25,
  "paper_count": 100,
  "metrics_receipt_count": 75,
  "missing_metric_refs": ["..."]
}
```

## Stage 4：Evidence Collection

| 字段 | create / update |
| --- | --- |
| `status` | `ready` |
| `stage` | `stage_4_evidence_collection` |
| `next_action` | `persist_filtered_artifact_manifest` |
| `instruction_refs` | `references/step_03_metrics_artifacts.md` |
| `schema_refs` | `assets/schemas/filtered_artifact_manifest.schema.json` |
| `required_reads` | `paper_workset batch`, `MCP synthesis.export_filtered_paper_artifacts {"run_root":"<absolute current run workspace>","paper_refs":[...]}` |
| `required_writes` | `runtime/payloads/paper-artifacts-manifest.json`, `runtime/payloads/artifacts/<safe-ref>/*`, `filtered artifact manifest receipt` |

命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_filtered_artifact_manifest --payload-file "runtime/payloads/paper-artifacts-manifest.json"
```

JIT 重点：

- 必须让 host MCP tool 写 `paper-artifacts-manifest.json` 和 filtered content files。
- `run_root` 必须是当前 ACP run workspace 的绝对路径。
- 不要手写 artifact 文件或 hash。
- 缺 artifact 不是 blocker，必须以 host manifest 的 missing 状态进入后续分析。

## Stage 5：Paper Units

| 字段 | create / update |
| --- | --- |
| `status` | `ready` |
| `stage` | `stage_5_paper_units` |
| `next_action` | `persist_paper_units` |
| `instruction_refs` | `references/step_04_paper_units.md` |
| `schema_refs` | `assets/schemas/paper_analysis_row.schema.json` |
| `required_reads` | `paper_workset batch`, `paper_artifact_bundle receipts` |
| `required_writes` | `runtime/payloads/paper-units-batch.json`, `runtime/views/cross-paper-evidence-index.json`, `paper_analysis rows` |

命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_paper_units --payload-file "runtime/payloads/paper-units-batch.json"
```

JIT 要求每篇 paper unit 至少覆盖：

- `bibliographic`
- `topic_relevance`
- `research_problem`
- `method_contribution`
- `evaluation_context`
- `findings`
- `limitations`
- `taxonomy_hints`
- `timeline_candidates`
- `claim_support_candidates`
- `comparison_facts`
- `external_references`
- `citation_contexts`
- `missing_payloads`

关键约束：

- Stage 5 是唯一 paper-level extraction 步骤。
- 读取 filtered artifact content files，而不是 raw/full payload。
- 不写 `payload_hash`、`digest_ref`、`digest_locator`。
- runtime 会注入 digest locator，避免 hash 经 LLM token 化。
- 不要用临时脚本生成语义分析。
- `comparison_facts` 必须只记录本 paper 自身事实，不得跨 paper 比较。
- digest 缺失时，`claim_support_candidates` / `timeline_candidates` 会受限。
- references/citation-analysis 缺失时，external/citation rows 会受限。

### Stage 5 Receipt Repair

如果 `paper_analysis` rows 存在，但 canonical stage receipt/state 不完整，gate 会仍返回：

| 字段 | 值 |
| --- | --- |
| `status` | `ready` |
| `stage` | `stage_5_paper_units` |
| `next_action` | `persist_paper_units` |
| `required_reads` | `paper_analysis rows` |
| `required_writes` | `canonical persist_paper_units receipt`, `stage_5_paper_units completed` |

命令仍是：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_paper_units --payload-file "runtime/payloads/paper-units-batch.json"
```

## Stage 6A：Export Cross-Paper Context

| 字段 | create / update |
| --- | --- |
| `status` | `ready` |
| `stage` | `stage_6_cross_paper_map` |
| `next_action` | `export_cross_paper_context` |
| `instruction_refs` | `references/step_05_cross_paper_map.md` |
| `schema_refs` | 无 |
| `required_reads` | `paper_workset rows`, `paper_artifact_bundles rows`, `paper_analysis rows` |
| `required_writes` | `runtime/views/cross-paper-context.md`, `runtime/views/external-literature-context.md`, `runtime/views/cross-paper-context.manifest.json`, `artifact_registry context hashes` |

命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action export_cross_paper_context
```

JIT 重点：

- 这是 deterministic context export。
- 主综合只读 `runtime/views/cross-paper-context.md`。
- 外部文献分析只读 `runtime/views/external-literature-context.md`。
- agent 应读取 markdown views 作为 LLM context。

## Stage 6B：Cross-Paper Evidence Map

| 字段 | create / update |
| --- | --- |
| `status` | `ready` |
| `stage` | `stage_6_cross_paper_map` |
| `next_action` | `persist_cross_paper_evidence_map` |
| `instruction_refs` | `references/step_05_cross_paper_map.md` |
| `schema_refs` | `assets/schemas/cross_paper_evidence_map.schema.json` |
| `required_reads` | `runtime/views/cross-paper-context.md`, `runtime/views/external-literature-context.md`, `runtime/views/cross-paper-context.manifest.json`, `runtime/views/cross-paper-evidence-index.json` |
| `required_writes` | `runtime/payloads/cross-paper-evidence-map.json`, `validated cross-paper evidence map receipt` |

命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_cross_paper_evidence_map --payload-file "runtime/payloads/cross-paper-evidence-map.json"
```

JIT 重点：

- 不要重做 paper-level extraction。
- 聚合 validated paper units。
- evidence map 应包含：
  - `taxonomy_candidates`
  - `comparison_dimensions`
  - `claim_candidates`
  - `debate_candidates`
  - `gap_candidates`
  - `review_outline_seeds`
- 缺失事实写 `unknown`。
- external literature 只做背景。
- 不要把 local coverage gap 推断为 field-wide gap。

## Stage 7：Route / Timeline Synthesis

| 字段 | create / update |
| --- | --- |
| `status` | `ready` |
| `stage` | `stage_7_route_timeline` |
| `next_action` | `persist_route_timeline` |
| `instruction_refs` | `references/step_06_taxonomy_timeline.md` |
| `schema_refs` | `assets/schemas/route_timeline_synthesis.schema.json` |
| `required_reads` | `references/step_06_taxonomy_timeline.md`, `references/section_examples.md`, `runtime/views/cross-paper-context.md`, `runtime/views/cross-paper-evidence-index.json`, `runtime/payloads/cross-paper-evidence-map.json` |
| `required_writes` | `runtime/payloads/route-timeline-synthesis.json`, `validated route/timeline synthesis receipt` |

命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_route_timeline --payload-file "runtime/payloads/route-timeline-synthesis.json"
```

JIT 重点：

- 先写 route/timeline synthesis，再写 final sections。
- payload 必须包含：
  - `taxonomy.summary`
  - `taxonomy.nodes`
  - `timeline_events.summary`
  - `timeline_events.events`
- `timeline_events` 必须是 object，不是 array。
- `taxonomy.summary` 与 `timeline_events.summary` 后续会作为 synthesis report 的上游章节。

## Stage 8：Core Analytical Sections

| 字段 | create / update |
| --- | --- |
| `status` | `ready` |
| `stage` | `stage_8_core_sections` |
| `next_action` | `persist_core_sections` |
| `instruction_refs` | `references/step_07_core_sections.md` |
| `schema_refs` | `assets/schemas/core_analytical_sections.schema.json` |
| `required_reads` | `references/step_07_core_sections.md`, `runtime/payloads/route-timeline-synthesis.json`, `runtime/views/cross-paper-context.md`, `runtime/views/external-literature-context.md`, `runtime/payloads/cross-paper-evidence-map.json` |
| `required_writes` | `runtime/payloads/core-analytical-sections.json`, `validated core analytical sections receipt` |

命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_core_sections --payload-file "runtime/payloads/core-analytical-sections.json"
```

JIT 重点：

- 写 `positioning`、`claims`、`comparison_matrix`、`debates`、`gaps`、`review_outline`。
- 不要在这里重写 `taxonomy` / `timeline_events`。
- 这些 sections 必须引用合法 `evidence_map_refs`。

## Stage 9：External / Statistics / Final Sections

| 字段 | create | update |
| --- | --- | --- |
| `status` | `ready` | `ready` |
| `stage` | `stage_9_external_statistics_report` | 同 create |
| `next_action` | `persist_external_statistics_report` | 同 create |
| `instruction_refs` | `references/step_08_external_statistics_report.md` | 同 create |
| `schema_refs` | `assets/schemas/topic_synthesis_artifact.schema.json` | 同 create |
| `required_reads` | `step_08`, `section_examples`, route/timeline payload, core sections payload, both context markdown files, evidence index, evidence map, `topic_intent`, `topic_resolver` | 以上内容，但末尾是 `current artifact sections`, `read_section_hashes` |
| `required_writes` | `result/sections/*.json`, `validated final artifacts` | 同 create |

create 命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation "create" --language "zh-CN" --action persist_external_statistics_report --payload-file "runtime/payloads/external-statistics-report.json"
```

update 命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation "update_full" --language "zh-CN" --action persist_external_statistics_report --payload-file "runtime/payloads/external-statistics-report.json"
```

JIT 重点：

- 开始组装 `result/sections/*.json`。
- 必须读取：
  - route/timeline synthesis
  - core analytical sections
  - both context markdown files
  - validated evidence map
- 必须保留前序已验证的 `taxonomy` 和 `timeline_events`。
- `synthesis_report.source_section_chapters.research_routes` 必须等于 `taxonomy.summary`。
- `synthesis_report.source_section_chapters.historical_progression` 必须等于 `timeline_events.summary`。
- `synthesis_report` 是连续报告，不是短 summary。
- `synthesis_report` 必须有非空 `title`。
- `synthesis_report.body` 必须覆盖：
  1. topic definition/scope
  2. research routes
  3. historical progression
  4. core findings
  5. comparison/debates
  6. gaps/coverage
  7. external literature/collection suggestions
- scripts 不生成语义 sections；agent 必须写 section JSON。

这是当前最容易在 `validate_final_artifacts` 被打回的阶段。建议 agent 在进入 Stage 10 前自检：

- `synthesis_report.title` 是否存在。
- `synthesis_report.body` 是否不是一段短摘要。
- `taxonomy.summary.text` 与 `timeline_events.summary.text` 是否有实质内容。
- `claims/timeline_events` 的 `evidence_refs` 是否都指向 `paper_evidence[*].id`。
- `evidence_map_refs` 是否都能在 `evidence_map.candidate_ids` 中找到。
- external literature 是否包含 coverage verdict、suggested additions、limitations。
- statistics 是否包含 paper count、coverage verdict、route coverage、external/suggested counts。

## Stage 10：Validate Final Artifacts

| 字段 | create | update |
| --- | --- | --- |
| `status` | `ready` | `ready` |
| `stage` | `stage_10_render_and_validate` | 同 create |
| `next_action` | `validate_final_artifacts` | 同 create |
| `instruction_refs` | `references/step_09_render_validate.md` | 同 create |
| `schema_refs` | `assets/schemas/topic_synthesis_artifact.schema.json` | 同 create |
| `required_reads` | `result/sections/*.json`, `paper_analysis rows`, `artifact metadata` | `result/sections/*.json`, `artifact metadata`, `read_section_hashes` |
| `required_writes` | `result/sections/*.json`, `result/topic-analysis.json`, `result/result.json` | `result/sections/*.json`, `result/topic-analysis*.json`, `result/result.json` |

create 命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation "create" --language "zh-CN" --action validate_final_artifacts
```

update 命令：

```powershell
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation "update_full" --language "zh-CN" --action validate_final_artifacts
```

validate 做的事：

- 读取 `result/sections/*.json`。
- 注入 runtime-owned digest refs。
- 执行 topic synthesis artifact schema 校验。
- 执行语义闭包校验。
- 生成/重写：
  - `result/topic-analysis.json` 或 `result/topic-analysis.patch.json`
  - `result/result.json`
- 注册 artifact registry。
- 成功后推进 `stage_10_render_and_validate` 与 `stage_11_completed`。

重要 repair 行为：

- 如果旧 `result/result.json`、`topic-analysis*.json` 或 final section 文件 hash 已污染，`validate_final_artifacts` 允许重新生成，不应被 pre-audit 卡死。
- 如果前序 stage receipt、artifact bundle、paper unit、evidence map 等结构性状态损坏，则仍会被 gate/audit 拦住。

## Stage 10 Blocker：Stage 4/5 Receipts 不完整

如果进入 render 前发现 Stage 4/5 rows 没有对应 package-local action receipts：

| 字段 | 值 |
| --- | --- |
| `status` | `blocked` |
| `stage` | `stage_10_render_and_validate` |
| `next_action` | `repair_stage4_action_receipts_before_render` |
| `blocker` | `stage4_action_receipts_incomplete` |
| `command_example` | `python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action audit_runtime_integrity` |

JIT：

- 重跑 gate 指向的 `persist_filtered_artifact_manifest` 和 `persist_paper_units`。
- 直接 SQLite rows 不是合法 state。

## Stage 11：Final Registration / Completion

### Final Artifacts Unregistered

如果 `stage_10` 完成但 `artifact_registry` 没有注册 final manifest/stdout：

| 字段 | 值 |
| --- | --- |
| `status` | `blocked` |
| `stage` | `stage_11_completed` |
| `next_action` | `register_validated_section_manifest_and_final_stdout` |
| `blocker` | `final_artifacts_unregistered` |
| `command_example` | 重新运行 `validate_final_artifacts` |

### Complete

如果 artifacts 已注册，但 `stage_11_completed` 尚未 completed：

| 字段 | 值 |
| --- | --- |
| `status` | `ready` |
| `stage` | `stage_11_completed` |
| `next_action` | `complete` |
| `command_example` | `Get-Content -Encoding UTF8 "result/result.json"` |
| `required_reads` | `result/result.json` |
| `required_writes` | `assistant final JSON only` |

### Completed

最终完成后：

| 字段 | 值 |
| --- | --- |
| `status` | `completed` |
| `stage` | `stage_11_completed` |
| `next_action` | `none` |
| `execution_note` | `Run is complete. Do not append explanation after final JSON.` |

## Update Gate 特有字段与语义

`update-topic-synthesis` 的 `action_payload()` 会在每次 gate 输出中加入：

- `recommended_update`
- `operation`
- `changed_sections`
- `read_section_hashes`

这些字段来自 SQLite meta，用来让 agent 在每一步持续看到 update 模式和 read-set CAS。

update 的主要差异：

1. Stage 1 读取 `synthesis.get_topic_context`，而不是 `synthesis.list_topics`。
2. Stage 2 需要选择 `update_full` 或 `update_patch`。
3. Stage 9 读取 `current artifact sections` 与 `read_section_hashes`。
4. Stage 10 可能写 `result/topic-analysis.patch.json`。
5. `update_patch` 只应替换 changed sections；触及重 section 或 schema/paper set/language 大变更时应使用 `update_full`。

## 最容易被 Validate 打回的点

结合最近的失败，以下点最值得在 Stage 9 后、Stage 10 前人工检查：

1. `synthesis_report.title` 缺失。
2. `synthesis_report.body` 只是一段短 summary。
3. `synthesis_report.body` 未覆盖七类维度，尤其是 external literature / collection suggestion。
4. `source_section_chapters.research_routes` 不是 `taxonomy.summary`。
5. `source_section_chapters.historical_progression` 不是 `timeline_events.summary`。
6. `timeline_events` 被写成数组，而不是 `{ summary, events }`。
7. `taxonomy.summary` 或 `timeline_events.summary` 只有壳，没有 `text/analysis/overview`。
8. `claims` / `timeline_events.events` 的 `evidence_refs` 指向 paper_ref，而不是 `paper_evidence[*].id`。
9. `evidence_map_refs` 引用了不存在的 candidate id。
10. `paper_evidence.digest_ref` 由 agent 手写或缺少 runtime 注入信息。
11. external references 被放入主 timeline/claim evidence。
12. `statistics` 缺 `paper_count`、`time_span`、`route_coverage`、`coverage_verdict`。

## 建议的 Debug 使用方式

1. 每次 agent 卡住时，先看当前 gate：

   ```powershell
   python scripts/gate_runtime.py --db "runtime/topic-synthesis.sqlite"
   ```

2. 如果返回 `failed_retryable`，不要让 agent猜测下一阶段；先跑：

   ```powershell
   python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action audit_runtime_integrity
   ```

3. 如果卡在 Stage 9/10，优先检查：

   - `result/sections/synthesis-report.json`
   - `result/sections/taxonomy.json`
   - `result/sections/timeline-events.json`
   - `result/sections/evidence-map.json`
   - `result/sections/paper-evidence.json`

4. 不要用临时脚本修语义内容；应该修改对应 JSON payload / section 文件，然后重新运行 gate 指向的 stage action。

