# Topic Synthesis Split Skill Suite 正式合同

本文定义 topic synthesis split skill suite 的当前实现合同。合同范围覆盖开发态真源、发布包结构、stage 执行协议、Host Bridge 读取、runtime 产物、handoff、最终 artifact、workflow apply 和详情页展示的数据形态。

## 目标

Topic synthesis 的目标是把 Zotero 文库中的一组相关论文组织成可持续维护的研究主题。产物不是论文摘要拼接，而是面向主题层的综合分析：说明主题边界、方法路线、关键 claims、演进脉络、争议、覆盖缺口、后续收藏方向和综述写作角度。

质量标准：

- 主题边界清晰，能区分核心问题、相邻方向和当前证据覆盖范围。
- 论文证据可追踪，所有面向论文的业务对象通过 `source_paper_refs` 指向 `source_papers`。
- Core synthesis 聚焦库内已解析论文，Finalize 负责覆盖判断、外部文献上下文摘要和最终报告。
- 运行产物由 runtime 生成；agent 只写 gate 指定的 payload。
- 最终输出必须可被 Host apply 持久化，并可被 topic details 页面直接展示。

## 开发态真源与发布包

开发态真源位于 `skills_src/topic-synthesis/`。

核心目录：

- `contracts/paths.yaml`：开发态与发布态路径约定。
- `contracts/stages.yaml`：四个 skill、stage 顺序、payload 路径、required reads 和输出类型。
- `contracts/stage-guidance.yaml`：中文 stage 指令、字段语义、质量标准和示例。
- `contracts/payload-schemas/*.schema.json`：agent-authored payload schema。
- `contracts/handoff.schema.json`：runtime handoff manifest schema。
- `contracts/stdout-envelope.schema.json`：business stdout envelope schema。
- `runtime/topic_synthesis_runtime/`：package-local runtime source。
- `renderer/render_topic_synthesis_skills.ts`：发布包 renderer。
- `SKILL.md.j2` 与 `templates/fragments/*.md.j2`：单文件指令模板。

发布包位于 `skills_builtin/`：

- `create-topic-synthesis-prepare`
- `update-topic-synthesis-prepare`
- `topic-synthesis-core-enrichment`
- `topic-synthesis-finalize`

每个发布包只暴露一个 agent-facing `SKILL.md`，并携带当前 skill 需要的 `scripts/`、`assets/schemas/`、`input.schema.json`、`parameter.schema.json`、`runner.json` 和 `output.schema.json`。

## Package Schema 合同

每个发布包的可执行元数据位于 `assets/runner.json`。`runner.json.schemas` 指向三个 schema：

- `assets/input.schema.json`
- `assets/parameter.schema.json`
- `assets/output.schema.json`

当前 split skill 的 `input.schema.json` 是空对象合同，workflow 参数通过 `parameter.schema.json` 进入 skill：

| Skill | Parameter required fields | Optional fields |
| --- | --- | --- |
| `create-topic-synthesis-prepare` | `topicSeed` | `language` |
| `update-topic-synthesis-prepare` | `topicId` | 无 |
| `topic-synthesis-core-enrichment` | 无 | `topicSeed`、`topicId`、`language` |
| `topic-synthesis-finalize` | 无 | `topicSeed`、`topicId`、`language` |

`output.schema.json` 是业务输出 schema。ACP final branch 使用的 `__SKILL_DONE__` 是运行器完成信号，不属于业务 output schema。

非最终 skill output：

| Skill | `kind` | `handoff` | `operation` | `next_skill_id` |
| --- | --- | --- | --- | --- |
| `create-topic-synthesis-prepare` | `topic_synthesis_handoff` | `prepare_analysis_context` | `create` | `topic-synthesis-core-enrichment` |
| `update-topic-synthesis-prepare` | `topic_synthesis_handoff` | `prepare_analysis_context` | `update_full` / `update_patch` | `topic-synthesis-core-enrichment` |
| `topic-synthesis-core-enrichment` | `topic_synthesis_handoff` | `core_enrichment` | `create` / `update_full` / `update_patch` | `topic-synthesis-finalize` |

非最终 output 必须包含：

- `kind`
- `handoff`
- `operation`
- `db_path`
- `handoff_manifest_path`
- `next_skill_id`

Finalize output 支持两类业务结果：

- 完成结果：`kind: "topic_synthesis"`，`operation: "create" | "update_full" | "update_patch"`。
- 取消结果：`kind: "topic_synthesis_canceled"`，`status: "canceled"`。

完成结果必须包含：

- `kind`
- `operation`
- `language`
- `topic_definition`
- `resolver_manifest_path`
- `analysis_manifest_path`
- `candidate_output_path`

取消结果必须包含：

- `kind`
- `status`
- `reason`
- `message`

## 运行工作区

合法 ACP run workspace 形态：

```text
runtime/acp/skill-runs/acp-skill-*
```

运行根目录内的关键路径：

- `runtime/input.json`：workflow 输入。
- `runtime/topic-synthesis.sqlite`：stage state 与必要上下文。
- `runtime/payloads/*.json`：agent 按 gate 指令写入的 payload。
- `runtime/views/*.md|*.json`：runtime 生成的上下文视图。
- `runtime/handoff/*.json`：runtime 生成的 skill handoff。
- `result/sections/*.json`：Host apply 使用的 structured sections。
- `result/sidecars/*.json`：Host apply 使用的 sidecar proposals。
- `result/topic-analysis.json`：完整 topic analysis manifest。
- `result/final-output.candidate.json`：最终 business candidate。

Agent 可写文件：

- `runtime/input.json`
- gate JSON 返回的 `runtime/payloads/*.json`

Runtime 负责生成并覆盖 runtime-owned 产物：SQLite、views、handoff、sidecars、sections、manifest 和 final candidate。

## Gate 执行协议

每个 skill 都通过 `scripts/gate.py` 驱动。`SKILL.md` 中的命令使用通用裸 `python`，具体执行环境可按本机 agent 配置包装。

初始 gate：

```bash
python scripts/gate.py --db runtime/topic-synthesis.sqlite --input runtime/input.json
```

后续 gate：

```bash
python scripts/gate.py --db runtime/topic-synthesis.sqlite
```

Command stage：

1. 运行 gate。
2. 确认 gate JSON 中 `needs_payload` 为 `false`。
3. 执行 gate JSON 中的 `command`。
4. 重新运行 gate。

Payload stage：

1. 运行 gate。
2. 读取 gate JSON 中的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
3. 执行 `SKILL.md` 对应 stage 写明的 Host read command 或读取 runtime 文件。
4. 只写 `payload_path` 指向的 JSON payload。
5. 执行 gate JSON 中的 `submit_command`。
6. 重新运行 gate。

通用 run/submit 形态：

```bash
python scripts/gate.py --db runtime/topic-synthesis.sqlite --action run
python scripts/gate.py --db runtime/topic-synthesis.sqlite --action submit --payload runtime/payloads/<stage>.json
```

## Zotero Bridge 命令解析

在 ACP run workspace 中，`zotero-bridge` 命令按以下顺序解析：

1. 工作区注入的 `.zotero-bridge/bin/zotero-bridge.cmd`
2. 工作区注入的 `.zotero-bridge/bin/zotero-bridge`
3. `PATH` 中的 `zotero-bridge`

可用性自检：

```bash
zotero-bridge status
zotero-bridge manifest
```

本 suite 涉及的 Host read commands：

```bash
zotero-bridge topics list --input '{}'
zotero-bridge library-index get --input '{"cursor":0,"limit":200}'
zotero-bridge topics get-context --input '{"topicId":"<topic_id>"}'
```

Resolver cascade 由 runtime 在 Stage 20 submit 后执行，包含 resolver、citation graph metrics 和 filtered paper artifact export。

## Skill 边界

### `create-topic-synthesis-prepare`

输入：`operation=create`，`topicSeed`。

输出：`topic_synthesis_handoff`，handoff 为 `prepare_analysis_context`，下一 skill 为 `topic-synthesis-core-enrichment`。

Stages：

- `stage_00_runtime_setup`：初始化运行状态。
- `stage_10_create_topic_context`：读取 Host topic list，写入 create topic context。
- `stage_20_resolver_and_workset`：读取 Host library index，写入 resolver/workset payload；runtime 执行 resolver cascade。
- `stage_30_prepare_analysis_context`：基于 filtered artifacts 写入 paper triage；runtime 生成 prepare handoff 与 context views。

### `update-topic-synthesis-prepare`

输入：`operation=update_full` 或 `operation=update_patch`，`topicId`。

输出：`topic_synthesis_handoff`，handoff 为 `prepare_analysis_context`，下一 skill 为 `topic-synthesis-core-enrichment`。

Stages：

- `stage_00_runtime_setup`：校验运行状态。
- `stage_10_update_topic_context`：从 `runtime/input.json` 读取 topic id，调用 `get-topic-context`，写入 update topic context。
- `stage_20_resolver_and_workset`：读取 Host library index，写入 resolver/workset payload；runtime 执行 resolver cascade。
- `stage_30_prepare_analysis_context`：基于 filtered artifacts 写入 paper triage；runtime 生成 prepare handoff 与 context views。

### `topic-synthesis-core-enrichment`

输入：prepare handoff、SQLite state、core context views。

输出：`topic_synthesis_handoff`，handoff 为 `core_enrichment`，下一 skill 为 `topic-synthesis-finalize`。

Stages：

- `stage_00_runtime_state_check`：校验上游 state 与必需 runtime 文件。
- `stage_40_core_synthesis`：读取 `cross-paper-context.md` 与 `source-paper-evidence-index.json`，写入 taxonomy、timeline、positioning、claims、dimensions、debates、gaps、review outline 和 candidate concept labels。
- `stage_50_kg_enrichment`：读取 concept candidate context，写入 concept details、topic relation proposals 和 matching terms；runtime 生成 sidecars 与 core handoff。

Core skill 只读取核心论文上下文，不读取 external literature context。

### `topic-synthesis-finalize`

输入：core handoff、finalize context、external literature context。

输出：最终 `topic_synthesis` business candidate。

Stages：

- `stage_00_runtime_state_check`：校验 core handoff 与 finalize 所需 runtime 文件。
- `stage_60_coverage_and_collection_suggestions`：读取 external literature context 与 finalize context manifest，写入 coverage verdict、coverage reason、reliability summary、coverage caveats、external context summary 和 suggested collection directions。
- `stage_70_summary`：读取 core handoff、coverage payload 与 finalize context manifest，写入 summary brief、summary overview 和 key takeaways；runtime 生成完整 sections、sidecars、topic manifest 和 final candidate。

## Context Views

Prepare runtime 生成四类 context view：

- `runtime/views/cross-paper-context.md`：供 core synthesis 使用，包含 workset selection 摘要、citation graph metrics 摘要、paper triage、每篇 paper 的核心 digest 片段。
- `runtime/views/external-literature-context.md`：供 finalize 使用，包含 references table、citation analysis report 和外部覆盖线索。
- `runtime/views/source-paper-evidence-index.json`：供 agent 核对可引用的 `paper_ref`，payload 中通过 `source_paper_refs` 引用这些 `paper_ref`。
- `runtime/views/cross-paper-context.manifest.json`：runtime 内部辅助 manifest，记录 context paths、selection constants、paper artifact availability 和 reference/citation report presence。

Core synthesis 使用 `cross-paper-context.md` 与 `source-paper-evidence-index.json`。Finalize 使用 `external-literature-context.md` 与 `finalize-context.manifest.json`。

## Handoff 合同

Handoff manifest schema：`synthesis.skill_handoff`。

必需字段：

- `schema_id`
- `schema_version`
- `handoff`
- `stage`
- `db_path`
- `artifacts`

`db_path` 固定为：

```text
runtime/topic-synthesis.sqlite
```

Handoff 类型：

- `prepare_analysis_context`
- `core_enrichment`
- `finalize_output`

Business stdout envelope：

- 非最终 skill 输出 `kind: "topic_synthesis_handoff"`，并提供 `handoff_manifest_path` 与 `next_skill_id`。
- Finalize skill 输出 `kind: "topic_synthesis"`，并提供 `analysis_manifest_path` 与 `candidate_output_path`。

## Payload 合同

Agent-authored payload 均位于 `runtime/payloads/`，并由当前 stage 对应的 `assets/schemas/*.schema.json` 校验。Payload schema 是 agent-facing 语义输入的机器真源；正式文档只记录字段地图和语义边界。

| Stage | Payload path | Schema asset | Required top-level fields |
| --- | --- | --- | --- |
| `stage_10_create_topic_context` | `runtime/payloads/create-topic-context.json` | `assets/schemas/stage-10-create-topic-context.schema.json` | `topic_title`、`aliases`、`definition`、`scope_include`、`scope_exclude`、`duplicate_status`、`duplicate_candidate_ids`、`duplicate_reason` |
| `stage_10_update_topic_context` | `runtime/payloads/update-topic-context.json` | `assets/schemas/stage-10-update-topic-context.schema.json` | `topic_context`、`update_assessment` |
| `stage_20_resolver_and_workset` | `runtime/payloads/resolver-and-workset.json` | `assets/schemas/stage-20-resolver-and-workset.schema.json` | `resolver`、`resolver_reasoning`、`operation_intent` |
| `stage_30_prepare_analysis_context` | `runtime/payloads/prepare-analysis-context.json` | `assets/schemas/stage-30-prepare-analysis-context.schema.json` | `assessments` |
| `stage_40_core_synthesis` | `runtime/payloads/core-synthesis.json` | `assets/schemas/stage-40-core-synthesis.schema.json` | `taxonomy`、`timeline_events`、`positioning`、`claims`、`improvement_dimension_summary`、`improvement_dimensions`、`concept_candidate_labels`、`debates`、`gaps`、`review_outline` |
| `stage_50_kg_enrichment` | `runtime/payloads/kg-enrichment.json` | `assets/schemas/stage-50-kg-enrichment.schema.json` | `concept_details`、`existing_topic_relation_proposals`、`prospective_topic_relation_proposals`、`topic_matching_terms` |
| `stage_60_coverage_and_collection_suggestions` | `runtime/payloads/coverage-and-collection-suggestions.json` | `assets/schemas/stage-60-coverage-and-collection-suggestions.schema.json` | `coverage_verdict`、`coverage_reason`、`reliability_summary`、`coverage_caveats`、`external_context_summary`、`suggested_collection_directions` |
| `stage_70_summary` | `runtime/payloads/summary.json` | `assets/schemas/stage-70-summary.schema.json` | `summary_brief`、`summary_overview`、`key_takeaways` |

Payload 只表达语义判断和结构化业务内容。SQLite、handoff、context views、sidecars、sections、manifest、final candidate 均由 runtime 写入。

### Stage Payload 语义

`stage_10_create_topic_context`：

- `topic_title`：稳定主题标题。
- `aliases`：主题别名、缩写或常见写法。
- `definition`：主题定义，说明研究对象与方法边界。
- `scope_include`：明确纳入的方向、方法或问题。
- `scope_exclude`：明确排除的相邻方向。
- `duplicate_status`：与已有 topic 的重复判断，取值为 `none`、`possible_duplicate`、`duplicate` 或 `unknown`。
- `duplicate_candidate_ids`：来自 `list-topics` 的候选 topic id。
- `duplicate_reason`：重复判断理由。

`stage_10_update_topic_context`：

- `topic_context.topic_id`：Host topic id。
- `topic_context.topic_definition`：Host 返回的当前主题定义。
- `topic_context.recommended_update`：Host 返回的更新建议。
- `update_assessment.operation`：本次更新操作，取值为 `update_full`、`update_patch` 或 `unknown`。
- `update_assessment.changed_sections`：本次关注的 section。
- `update_assessment.reason`：更新判断理由。

`stage_20_resolver_and_workset`：

- `resolver.mode`：resolver 模式。
- `resolver.query`：查询型 resolver 输入。
- `resolver.paper_refs`：显式 workset 输入。
- `resolver_reasoning`：选择 resolver 的理由。
- `operation_intent`：本次运行意图，取值为 `create`、`update_full`、`update_patch` 或 `unknown`。

`stage_30_prepare_analysis_context`：

- `assessments[].paper_ref`：resolver workset 中的 paper ref。
- `assessments[].relevance_level`：相关性等级，取值为 `core`、`related`、`external`、`irrelevant` 或 `unknown`。
- `assessments[].relevance_reason`：相关性判断理由。
- `assessments[].paper_quality_level`：论文质量等级，取值为 `high`、`medium`、`low` 或 `unknown`。
- `assessments[].paper_quality_reason`：质量判断理由。
- `assessments[].core_digest`：供 core context 使用的短摘要。
- `assessments[].caveats`：证据使用注意事项。

`stage_40_core_synthesis`：

- `taxonomy`：主题内部路线或概念结构。
- `timeline_events`：主题演进事件。
- `positioning`：主题定位、边界和相邻方向关系。
- `claims`：topic-level claims。
- `improvement_dimension_summary`：改进维度总览。
- `improvement_dimensions`：具体改进维度。
- `concept_candidate_labels`：可进入概念卡片候选的标签。
- `debates`：争议或分歧。
- `gaps`：覆盖缺口或研究空白。
- `review_outline`：综述写作结构。

`stage_40_core_synthesis` 中需要引用论文的对象使用 `source_paper_refs`，引用值来自 `runtime/views/source-paper-evidence-index.json`。

`stage_50_kg_enrichment`：

- `concept_details`：概念候选的定义、别名、层级或关联说明。
- `existing_topic_relation_proposals`：与已有 topic 的关系候选，使用 `target_topic_id`、`relation_type`、`confidence`、`rationale` 和 `source_paper_refs`。
- `prospective_topic_relation_proposals`：可创建或后续关联的 prospective topic。
- `topic_matching_terms`：后续匹配 topic 或论文时使用的 include/must-have/method/exclude terms。

`stage_60_coverage_and_collection_suggestions`：

- `coverage_verdict`：覆盖判断，取值为 `sufficient`、`partial`、`insufficient`、`severely_missing` 或 `unknown`。
- `coverage_reason`：覆盖判断理由。
- `reliability_summary`：当前综合结论可靠性摘要。
- `coverage_caveats`：覆盖判断注意事项。
- `external_context_summary`：对 external literature context 的摘要。
- `suggested_collection_directions`：建议补充收藏方向，每条包含 `direction`、`reason`、`example_titles_or_terms` 和 `priority`。

`stage_70_summary`：

- `summary_brief`：短摘要。
- `summary_overview`：面向用户的主题总览。
- `key_takeaways`：关键结论列表。

### 证据引用字段

Agent-facing 论文引用字段为：

```json
{
  "source_paper_refs": ["1:DETR2020"]
}
```

`source_paper_refs` 引用 `runtime/views/source-paper-evidence-index.json` 中可用的 `paper_ref`。Host apply 后，持久化 artifact 中的文献表为 `source_papers`。

`source_papers` 条目包含：

- `paper_ref`
- `item_key`
- `title`
- `year`
- `summary`
- `synthesis_role`
- `quality`
- `digest_ref`

业务 sections 中需要关联论文的对象通过 `source_paper_refs` 指向 `source_papers[].paper_ref`。

## 最终 Artifact 合同

Finalize runtime 生成：

- `result/topic-analysis.json`
- `result/final-output.candidate.json`
- `result/sections/*.json`
- `result/sidecars/*.json`

### Final Candidate Schema

`result/final-output.candidate.json` 的完成结果业务形态：

```json
{
  "kind": "topic_synthesis",
  "operation": "create",
  "language": "zh-CN",
  "topic_definition": {
    "id": "topic-id",
    "title": "Topic title"
  },
  "resolver_manifest_path": "runtime/payloads/resolver.json",
  "analysis_manifest_path": "result/topic-analysis.json",
  "candidate_output_path": "result/final-output.candidate.json"
}
```

取消结果业务形态：

```json
{
  "kind": "topic_synthesis_canceled",
  "status": "canceled",
  "reason": "duplicate_topic",
  "message": "当前输入对应已有 topic。"
}
```

### Topic Analysis Manifest Schema

`result/topic-analysis.json` 是 Host apply 的 structured manifest。Create 与 `update_full` manifest 必须包含：

- `schema_id`
- `operation`
- `language`
- `topic_definition`
- `sections`
- `sidecars`

Create 与 `update_full` 产物使用完整 section 集：

- `topic`
- `summary`
- `positioning`
- `taxonomy`
- `improvement_dimension_summary`
- `improvement_dimensions`
- `claims`
- `timeline_events`
- `source_papers`
- `external_literature_analysis`
- `debates`
- `coverage`
- `gaps`
- `review_outline`
- `statistics`
- `synthesis_report`
- `source_artifacts`
- `diagnostics`

Sidecars：

- `topic_interest_metadata`
- `concept_cards_proposal`
- `topic_graph_relation_proposals`
- `prospective_topic_relation_proposals`

Manifest section entry 形态：

```json
{
  "path": "result/sections/summary.json",
  "content_type": "json"
}
```

Manifest sidecar entry 形态：

```json
{
  "path": "result/sidecars/concept-cards-proposal.json",
  "content_type": "json",
  "schema_id": "synthesis.concept_cards_proposal"
}
```

### Section Schema Map

每个 section 文件都是 JSON 对象。Host apply 要求 required sections 存在；UI 根据 section key 读取可展示字段。

| Section | Path | 主要内容 |
| --- | --- | --- |
| `topic` | `result/sections/topic.json` | topic id、title、aliases、definition、scope、operation |
| `summary` | `result/sections/summary.json` | `summary_brief`、`summary_overview`、`key_takeaways` |
| `positioning` | `result/sections/positioning.json` | 主题定位、边界和相邻方向 |
| `taxonomy` | `result/sections/taxonomy.json` | taxonomy summary 与 nodes；nodes 可带 `source_paper_refs` |
| `improvement_dimension_summary` | `result/sections/improvement_dimension_summary.json` | 改进维度总览 |
| `improvement_dimensions` | `result/sections/improvement_dimensions.json` | 改进维度 rows；rows 可带 `source_paper_refs` |
| `claims` | `result/sections/claims.json` | claims rows；rows 必须通过 `source_paper_refs` 指向 source papers |
| `timeline_events` | `result/sections/timeline_events.json` | timeline summary 与 events；events 可带 `source_paper_refs` |
| `source_papers` | `result/sections/source_papers.json` | 持久化文献表 |
| `external_literature_analysis` | `result/sections/external_literature_analysis.json` | external context summary、coverage caveats、collection directions |
| `debates` | `result/sections/debates.json` | debates rows；rows 可带 `source_paper_refs` |
| `coverage` | `result/sections/coverage.json` | coverage verdict、reason、reliability summary、caveats |
| `gaps` | `result/sections/gaps.json` | gaps rows；rows 可带 `source_paper_refs` |
| `review_outline` | `result/sections/review_outline.json` | 综述写作结构 |
| `statistics` | `result/sections/statistics.json` | source paper 数、section 数、coverage 状态等统计 |
| `synthesis_report` | `result/sections/synthesis_report.json` | 最终 synthesis report 正文，正文位于 `body` |
| `source_artifacts` | `result/sections/source_artifacts.json` | resolver 与 runtime view 路径索引 |
| `diagnostics` | `result/sections/diagnostics.json` | 运行状态与业务级提示 |

### Source Papers Schema

`source_papers` 是持久化文献表。每个条目包含：

- `paper_ref`
- `item_key`
- `title`
- `year`
- `summary`
- `synthesis_role`
- `quality`
- `digest_ref`

`digest_ref` 至少能定位来源论文：

```json
{
  "paper_ref": "1:DETR2020",
  "payload_type": "digest-markdown"
}
```

业务 section 中所有 `source_paper_refs` 必须指向 `source_papers[].paper_ref`。

### Sidecar Schema Map

Sidecars 是 Host 后续操作建议，不直接作为主要阅读正文。

| Sidecar | Path | `schema_id` | 主要内容 |
| --- | --- | --- | --- |
| `topic_interest_metadata` | `result/sidecars/topic-interest-metadata.json` | `topic_interest_metadata.v1` | topic interest、coverage、language、source count |
| `concept_cards_proposal` | `result/sidecars/concept-cards-proposal.json` | `synthesis.concept_cards_proposal` | concept card 候选 |
| `topic_graph_relation_proposals` | `result/sidecars/topic-graph-relation-proposals.json` | `synthesis.topic_graph_relation_proposals` | 与已有 topic 的图谱关系候选 |
| `prospective_topic_relation_proposals` | `result/sidecars/prospective-topic-relation-proposals.json` | `synthesis.prospective_topic_relation_proposals` | prospective topic 关系候选 |

## Host Apply 与持久化

Host apply 接收 finalize runtime 生成的 final candidate，并从 candidate 指向的 manifest 与 section files 组装 topic artifact。

Create 与 `update_full` apply 的关键检查：

- `kind` 为 `topic_synthesis`。
- `operation` 与 workflow 请求一致。
- Manifest 完整列出 required sections 与 sidecars。
- 每个 manifest entry 指向 JSON 文件。
- `source_papers` 存在并包含可引用的 `paper_ref`。
- 业务 sections 中的 `source_paper_refs` 均指向存在的 `source_papers[].paper_ref`。
- Digest 正文不嵌入 topic artifact；artifact 只保存 digest locator。

持久化 topic artifact 位于 synthesis data root 的 `data/topics/` 下。Topic details、review input 和 markdown export 均读取当前 structured artifact。

## Topic Details UI

Topic details 页面围绕当前 structured artifact 展示：

- 顶部 overview：主题状态、语言、source paper 数、coverage verdict。
- 左侧 section navigation。
- 中间阅读区：overview、claims、taxonomy、timeline、coverage、gaps、review outline、synthesis report。
- Source paper chips：通过 `source_paper_refs` 解析到 `source_papers`。
- Source paper list：展示 `source_papers`，并提供 digest modal 入口。

UI 不展示 runtime 内部 artifact/provenance 区块。缺少可选 section 时使用稳定空态。

## Workflow 合同

`create-topic-synthesis` workflow 使用 `skillrunner.sequence.v1`：

1. `create-topic-synthesis-prepare`
2. `topic-synthesis-core-enrichment`
3. `topic-synthesis-finalize`

`update-topic-synthesis` workflow 使用 `skillrunner.sequence.v1`：

1. `update-topic-synthesis-prepare`
2. `topic-synthesis-core-enrichment`
3. `topic-synthesis-finalize`

Prepare step 创建 run workspace。Core 与 finalize 使用 `workspace: "reuse-workflow"` 共享同一个 workspace，但 ACP provider 会为每个 step 分配独立的 runner-owned `result/<skillId>.n/result.json` 与 `.audit/<skillId>.n/input_manifest.json`，避免后续 step 覆盖前序 step 的 result/audit 文件。Sequence result 使用 `final_step_id: "finalize"`，最终 Host apply 读取 finalize step record 中的 `resultJsonPath` / final candidate。

## Renderer 合同

Renderer 从 `skills_src/topic-synthesis/` 生成四个发布包。

约束：

- 发布包不读取 `skills_src/`。
- 每个 skill 只包含自身 stage、输入、payload、输出和 required reads。
- `SKILL.md` 使用中文；JSON key、stage id、schema path、CLI command 和文件路径保持英文。
- Payload 示例来自 schema/guidance，并必须匹配当前 payload schema。
- Core skill 指令只包含 core context reads。
- Finalize skill 指令包含 external literature context reads。

## 最小验证集合

推荐验证：

```bash
npx tsx node_modules/mocha/bin/mocha "test/core/153-topic-synthesis-suite-renderer.test.ts" "test/core/155-topic-synthesis-split-runtime.test.ts" --require test/setup/zotero-mock.ts
npx tsx node_modules/mocha/bin/mocha "test/core/129-synthesis-layer-integration.test.ts" --require test/setup/zotero-mock.ts
npx tsc --noEmit
```

验证重点：

- Renderer 输出单 `SKILL.md` 发布包。
- Payload examples 匹配 schema。
- Split runtime 能生成 prepare/core handoff 和 final candidate。
- Final artifact 通过 Host manifest/artifact validation。
- `source_papers` 与 `source_paper_refs` 引用关系正确。
- Topic details DTO 和 UI 使用当前 source paper 数据结构。
