# Topic Synthesis Split Skill Instruction Migration Notes

本工件记录旧 `create-topic-synthesis` / `update-topic-synthesis` 指令中哪些内容可以吸收到新四 skill suite 中，以及吸收时如何转换。它是判断过程记录，不是运行时合同；最终合同以 `skills_src/topic-synthesis/contracts/stages.yaml`、payload schemas、handoff schema 和 runtime 为准。

## 迁移原则

- 只吸收语义标准、执行纪律和写作经验，不迁移旧接口形状。
- 所有旧 stage 编号、action 名、payload 路径和 wrapper 都必须转换为新 split suite 的字段。
- 新合同与旧指令冲突时，以新合同为准。
- 生成包保持单 `SKILL.md` 设计，不生成 stage reference markdown。

## 可吸收内容

| 旧内容 | 新归属 | 转换方式 |
| --- | --- | --- |
| gate 纪律：每次按 gate 指令执行，不手写 SQLite，不伪造 receipt/hash | 四个 skill 的执行合同与 command stage | 保留原则，改为 `scripts/gate.py --action run/submit` 的新入口 |
| Topic Synthesis 的质量目标：不是摘要拼接，而是解释概念边界、路线、演进、结论、争议、缺口和覆盖状态 | 四个 `SKILL.md` 的 stage 质量标准 | 压缩为各 stage 的 semantic goal / quality checks |
| create topic context 的稳定标题、别名、定义、范围、重复判断 | `stage_10_create_topic_context` | 转换为 `topic_title`、`aliases`、`definition`、`scope_include`、`scope_exclude`、`duplicate_*` |
| update topic context 的当前主题读取、hash/section awareness、更新范围判断 | `stage_10_update_topic_context` | 保留为 update skeleton 的输入判断，不承诺 update runtime 已端到端完成 |
| resolver proposal 应紧凑，runtime 负责 resolver、metrics、filtered artifacts cascade | `stage_20_resolver_and_workset` | 转换为 `resolver`、`resolver_reasoning`、`operation_intent` |
| paper triage 只做单篇判断，不写跨文献综合 | `stage_30_prepare_analysis_context` | 转换为 `assessments[]`，字段改为 `relevance_level/relevance_reason` 与 `paper_quality_level/paper_quality_reason` |
| taxonomy/timeline/claims/debates/gaps/review outline 的内容标准 | `stage_40_core_synthesis` | 保留语义，禁止带入 external literature context |
| concept details、topic relation candidates、matching terms 的用途 | `stage_50_kg_enrichment` | 保留字段语义，runtime 仍负责 sidecar materialization |
| coverage、reliability、external context summary、collection suggestions 的写作标准 | `stage_60_coverage_and_collection_suggestions` | 明确只在 finalize 使用 `external-literature-context.md` |
| final summary 应简明、面向用户理解 topic，不复制全部 section | `stage_70_summary` | 转换为 `summary_brief`、`summary_overview`、`key_takeaways` |

## 必须改写内容

| 旧内容 | 改写原因 | 新表达 |
| --- | --- | --- |
| `stage_0_runtime_setup` 到 `stage_12_completed` | 新 suite 使用四 skill 的 canonical stages | `stage_00_*`、`stage_10_*`、`stage_20_*`、`stage_30_*`、`stage_40_*`、`stage_50_*`、`stage_60_*`、`stage_70_*` |
| `scripts/stage_runtime.py` 与 `scripts/gate_runtime.py` | 新包入口是 `scripts/gate.py` | 只执行 gate 返回的 command/submit_command |
| `persist_topic_context`、`persist_resolver` 等 action 名 | 新 gate 使用 `--action run/submit` | 不把旧 action 名写入 `SKILL.md` |
| `runtime/payloads/topic-context.json`、`resolver-proposal.json`、`paper-triage-batch.json` | 新 payload path 已由 `stages.yaml` 固定 | 使用 `runtime/payloads/create-topic-context.json` 等新路径 |
| `analyses[]` paper triage wrapper | 新 schema 使用 `assessments[]` | 转换为 `assessments[]` |
| `summary` / `coverage` nested payload | 新 finalize schema 是 flat fields | 转换为 `coverage_verdict`、`coverage_reason`、`reliability_summary` 等 |

## 禁止迁移内容

- 禁止把旧 stage/action/fallback 文案原样复制到新 `SKILL.md`。
- 禁止把旧 `stage_6_cross_paper_map` / `stage_11_render_and_validate` 描述为新 agent-authored stage；这些职责现在由 runtime 或 finalize 输出路径承担。
- 禁止让 `topic-synthesis-core-enrichment` 读取 `runtime/views/external-literature-context.md`。该 context 属于 finalize 的 coverage、external context summary 和 collection suggestions。
- 禁止暗示 agent 可以手写 `result/final-output.candidate.json`、SQLite rows、hashes、handoff manifest 或 runtime-owned files。
