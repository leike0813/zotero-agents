# Topic Synthesis Multi-Skill Contract Design

## 1. 总体目标

将 topic synthesis workflow 拆成四个围绕同一个运行状态执行的 skill group：

1. `create-topic-synthesis-prepare`
2. `update-topic-synthesis-prepare`
3. `topic-synthesis-core-enrichment`
4. `topic-synthesis-finalize`

四个发布态 skill 共享同一个 ACP run workspace、同一个 SQLite DB、同一套文件合同。所有跨 skill 传递的信息必须写入 SQLite 或文件；handoff manifest 负责登记跨 skill 的最小完成状态和关键 artifact 指针。后续 workflow 多 skill 编排只负责按顺序启动这些 skill，不负责携带业务状态。

四个 skill 必须作为一个 topic synthesis skill suite 子项目统一开发。`skills_src/topic-synthesis/` 是开发态真源；`skills_builtin/` 下的四个 skill 发布包是渲染产物。发布包必须自包含自己的单一 agent-facing `SKILL.md`、`scripts/` 和 schema assets，但这些文件不手工维护。

## 2. 统一名词

### 2.1 Stage

`stage` 是唯一 canonical workflow unit。一个 stage 必须是 agent 显式介入的执行边界。

agent 介入分两类：

- command-only stage：agent 必须执行脚本命令，但不写 payload。
- payload stage：agent 必须阅读材料、做语义判断，并提交 payload。

只有 `stage_00_runtime_setup` 与 `stage_00_runtime_state_check` 是 command-only stages。其它 stage 都必须要求 agent-authored payload。

`stage_00_runtime_setup` 只用于 create/update prepare skills，用来创建或锁定本次运行的 DB 与 `run_root`。`stage_00_runtime_state_check` 只用于 downstream skills，用来确认既有 DB、handoff 与 artifact 状态，不得创建新 run、重写 `run_root` 或改写上游业务状态。

以下内容不得称为 stage：

- report body preparation
- final artifact validation
- candidate output rendering
- handoff manifest writing
- artifact hash verification
- state completion marker
- 任意脚本内部级联

这些都是 `scripts/gate.py` 的 runtime internal operation。

### 2.2 Agent-Facing Vocabulary

agent-facing 合同不再引入 stage 之外的流程单位，也不再为脚本提交另起动词名。完成态通过 handoff envelope 或 final output envelope 表达，不作为 stage。

gate 给 agent 的内容只包含：

- 当前 canonical stage
- stage 的任务说明
- 是否需要 payload
- 需要读取的文件/host context
- payload schema
- 应执行的脚本命令
- stage 完成后产生的 handoff 或 final output

## 3. Suite Source / Rendered Packages

开发态真源：

```text
skills_src/topic-synthesis/
  contracts/
    paths.yaml
    stages.yaml
    handoff.schema.json
    stdout-envelope.schema.json
    db-schema.sql
    payload-schemas/
      stage-10-create-topic-context.schema.json
      stage-10-update-topic-context.schema.json
      stage-20-resolver-and-workset.schema.json
      stage-30-prepare-analysis-context.schema.json
      stage-40-core-synthesis.schema.json
      stage-50-kg-enrichment.schema.json
      stage-60-coverage-and-collection-suggestions.schema.json
      stage-70-summary.schema.json
  runtime/
    topic_synthesis_runtime/
      common/
      create_prepare/
      update_prepare/
      core_enrichment/
      finalize/
  templates/
    fragments/
      frontmatter.md.j2
      scope.md.j2
      execution-contract.md.j2
      runtime-state.md.j2
      stage-loop.md.j2
      output-contract.md.j2
      failure-rules.md.j2
    create-topic-synthesis-prepare/
      SKILL.md.j2
    update-topic-synthesis-prepare/
      SKILL.md.j2
    topic-synthesis-core-enrichment/
      SKILL.md.j2
    topic-synthesis-finalize/
      SKILL.md.j2
  renderer/
    render_topic_synthesis_skills.*
  tests/
    fixtures/
    contract/
    rendered-package/
    workflow/
```

发布态渲染目标：

```text
skills_builtin/create-topic-synthesis-prepare/
skills_builtin/update-topic-synthesis-prepare/
skills_builtin/topic-synthesis-core-enrichment/
skills_builtin/topic-synthesis-finalize/
```

固定规则：

- `skills_src/topic-synthesis/` 是四个 skill 的唯一开发 SSOT。
- `skills_builtin/create-topic-synthesis-prepare/`、`skills_builtin/update-topic-synthesis-prepare/`、`skills_builtin/topic-synthesis-core-enrichment/`、`skills_builtin/topic-synthesis-finalize/` 是 generated packages；原则上不手工编辑。
- renderer 从 suite source 生成每个发布包的单一 `SKILL.md`、`scripts/` 和 `assets/schemas/`。
- 发布态 skill 必须符合普通 skill package 标准：包内文件足以独立执行当前 skill，不依赖 agent 读取 suite source。
- 共享合同、schema、路径常量、stage 列表和 stdout envelope 只在 suite source 维护一次。
- agent-facing 文档由模板渲染，只暴露当前 skill 的 canonical stages。
- 测试围绕 suite source 组织，覆盖 shared contract、renderer 输出、单包自包含性和跨 skill handoff workflow。

## 4. 共享运行合同

### 4.1 Run Root / DB

固定运行根：

```text
<run_root>/
```

固定 SQLite：

```text
runtime/topic-synthesis.sqlite
```

固定规则：

- `run_root` 只能由 `stage_00_runtime_setup` 通过 `scripts/gate.py` 根据 DB 路径锁定并写入 SQLite。
- 后续 skill 不接收 agent 编造的 `run_root`。
- 所有 stage state、receipt、artifact hash、handoff 状态都以 SQLite 为真源。
- 所有语义 payload 以 run workspace JSON 文件为真源。
- agent prompt 不传递跨 skill 业务状态；后续 skill 只通过 `scripts/gate.py` 读取 DB 和文件。

### 4.2 Rendered Runtime Ownership

每个发布态 skill 按 skill package 标准携带自己的 `scripts/`：

```text
create-topic-synthesis-prepare/scripts/
update-topic-synthesis-prepare/scripts/
topic-synthesis-core-enrichment/scripts/
topic-synthesis-finalize/scripts/
```

每个 skill 至少包含：

```text
scripts/gate.py
scripts/topic_synthesis_db.py
```

脚本边界：

- `gate.py` 是唯一 agent-facing CLI。
- `gate.py` 根据 DB 当前状态返回当前 stage 的说明，或接收当前 stage payload 并推进运行状态。
- `gate.py` 不接收 stage 名称参数；当前 stage 只能从 DB 推断。
- `gate.py` 不暴露额外命令名给 agent。
- `topic_synthesis_db.py` 只提供 SQLite schema、state、receipt、artifact registry、handoff 的内部接口。
- `topic_synthesis_db.py` 不是 agent-facing CLI。
- 发布包内 scripts 由 renderer 从 suite runtime source 生成或复制。
- 共享 DB schema、文件路径常量和轻量工具函数在 suite source 中维护；发布包只携带当前 skill 所需的最小本地副本。
- 发布包之间不得要求人工同步同一份大段 runtime 内容。
- 每个脚本必须能从任意工作目录调用，并通过自身文件位置、传入 DB path 或 manifest path 稳定定位 run workspace 与 Zotero bridge 相关路径。
- 脚本路径处理必须跨平台，使用 `pathlib`/等价路径 API，不拼接硬编码分隔符。
- skill 运行说明只描述当前有效合同，不暴露旧字段、历史阶段或兼容 fallback。

### 4.3 Gate CLI Contract

`scripts/gate.py` 是 agent 唯一需要执行的脚本。

读取当前 stage：

```powershell
uv run --project="$HOME/.ar" --locked -- python scripts/gate.py --db runtime/topic-synthesis.sqlite
```

提交 payload：

```powershell
uv run --project="$HOME/.ar" --locked -- python scripts/gate.py --db runtime/topic-synthesis.sqlite --payload runtime/payloads/<stage-payload>.json
```

初次启动可传 workflow 参数；这些参数只允许用于 `stage_00_runtime_setup`：

```powershell
uv run --project="$HOME/.ar" --locked -- python scripts/gate.py --db runtime/topic-synthesis.sqlite --input runtime/input.json
```

gate output 示例：

```json
{
  "stage": "stage_40_core_synthesis",
  "stage_kind": "payload",
  "needs_payload": true,
  "task": "Write the core synthesis from prepared cross-paper context.",
  "required_reads": [
    "runtime/handoff/prepare-analysis-context.json",
    "runtime/views/cross-paper-context.md",
    "runtime/views/external-literature-context.md",
    "runtime/views/source-paper-evidence-index.json"
  ],
  "payload_schema": "assets/schemas/stage-40-core-synthesis.schema.json",
  "payload_path": "runtime/payloads/core-synthesis.json",
  "submit_command": "uv run --project=\"$HOME/.ar\" --locked -- python scripts/gate.py --db runtime/topic-synthesis.sqlite --payload runtime/payloads/core-synthesis.json"
}
```

command-only stage output 示例：

```json
{
  "stage": "stage_00_runtime_setup",
  "stage_kind": "command",
  "needs_payload": false,
  "task": "Initialize or verify the run-local SQLite state.",
  "command": "uv run --project=\"$HOME/.ar\" --locked -- python scripts/gate.py --db runtime/topic-synthesis.sqlite --input runtime/input.json"
}
```

downstream state-check output 示例：

```json
{
  "stage": "stage_00_runtime_state_check",
  "stage_kind": "command",
  "needs_payload": false,
  "task": "Verify the existing topic synthesis runtime state and handoff prerequisites.",
  "command": "uv run --project=\"$HOME/.ar\" --locked -- python scripts/gate.py --db runtime/topic-synthesis.sqlite"
}
```

规则：

- 不传 `--payload` 时，`gate.py` 读取 DB 并返回当前 stage 指令。
- 如果当前 stage 是 `stage_00_runtime_setup`，`gate.py` 执行初始化或验证，然后返回下一个需要 agent 介入的 stage 指令。
- 如果当前 stage 是 `stage_00_runtime_state_check`，`gate.py` 验证既有 DB、handoff 和 required artifacts，然后返回下一个需要 agent 介入的 stage 指令。
- 传 `--payload` 时，`gate.py` 校验 payload 属于当前 stage，写 DB/文件，执行该 stage 后续 runtime internal operations，然后返回下一个 stage 指令、handoff envelope 或 final output envelope。
- 如果当前 skill 已完成，`gate.py` 输出对应 skill 的 stdout envelope。
- 如果当前状态无效，`gate.py` 输出稳定 error JSON，不让 agent 猜测恢复路径。

### 4.4 Canonical Stage Set

全局 canonical stages：

```text
stage_00_runtime_setup
stage_00_runtime_state_check
stage_10_create_topic_context
stage_10_update_topic_context
stage_20_resolver_and_workset
stage_30_prepare_analysis_context
stage_40_core_synthesis
stage_50_kg_enrichment
stage_60_coverage_and_collection_suggestions
stage_70_summary
```

stage 分布：

```text
create-topic-synthesis-prepare:
  stage_00_runtime_setup
  stage_10_create_topic_context
  stage_20_resolver_and_workset
  stage_30_prepare_analysis_context

update-topic-synthesis-prepare:
  stage_00_runtime_setup
  stage_10_update_topic_context
  stage_20_resolver_and_workset
  stage_30_prepare_analysis_context

topic-synthesis-core-enrichment:
  stage_00_runtime_state_check
  stage_40_core_synthesis
  stage_50_kg_enrichment

topic-synthesis-finalize:
  stage_00_runtime_state_check
  stage_60_coverage_and_collection_suggestions
  stage_70_summary
```

编号规则：

- `00` 是每个发布态 skill 的 command-only entry stage。Prepare skills 使用 `stage_00_runtime_setup`；downstream skills 使用 `stage_00_runtime_state_check`。
- `10-30` 是 create/update prepare。
- `40-50` 是 core enrichment。
- `60-70` 是 finalize。
- 十位递增保留未来插入空间。

两个 `00` stage 的语义固定分开：

- `stage_00_runtime_setup`：只用于 create/update prepare skills，创建/锁定 DB、写入 operation/language/input metadata、固定 `run_root`。
- `stage_00_runtime_state_check`：只用于 core-enrichment/finalize skills，验证 DB、上游 handoff、required artifacts、artifact hashes 和 contract version。它可以写 entry receipt 或 diagnostics，但不能创建新 run、重写 `run_root` 或改写上游业务状态。

## 5. Handoff Contract

非最终 skill 完成后必须同时：

1. 写 handoff manifest 到磁盘。
2. 将 handoff manifest 登记到 SQLite。
3. 以 compact stdout envelope 作为 skill output 返回给 skill runner / 编排层。

handoff manifest 固定路径：

```text
runtime/handoff/prepare-analysis-context.json
runtime/handoff/core-enrichment.json
```

finalize skill 写最终 output manifest，但它的 stdout 是最终业务输出，不是 handoff：

```text
runtime/handoff/finalize-output.json
result/final-output.candidate.json
```

handoff manifest 只保存路径、hash、stage、diagnostics，不保存大正文。

manifest 示例：

```json
{
  "schema_id": "synthesis.skill_handoff",
  "schema_version": "1.0.0",
  "handoff": "prepare_analysis_context",
  "stage": "stage_30_prepare_analysis_context",
  "db_path": "runtime/topic-synthesis.sqlite",
  "artifacts": {
    "resolver_manifest": {
      "path": "runtime/payloads/resolver.json",
      "hash": "sha256:..."
    },
    "cross_paper_context": {
      "path": "runtime/views/cross-paper-context.md",
      "hash": "sha256:..."
    },
    "external_literature_context": {
      "path": "runtime/views/external-literature-context.md",
      "hash": "sha256:..."
    },
    "source_paper_evidence_index": {
      "path": "runtime/views/source-paper-evidence-index.json",
      "hash": "sha256:..."
    }
  },
  "diagnostics": []
}
```

非最终 skill stdout envelope 示例：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis_handoff",
  "handoff": "prepare_analysis_context",
  "operation": "create",
  "db_path": "runtime/topic-synthesis.sqlite",
  "handoff_manifest_path": "runtime/handoff/prepare-analysis-context.json",
  "handoff_manifest_hash": "sha256:...",
  "next_skill_id": "topic-synthesis-core-enrichment",
  "diagnostics": []
}
```

stdout envelope 只用于告诉编排层当前 skill 已完成、下一 skill 是什么、handoff manifest 在哪里。业务状态真源仍然是 SQLite 和文件。

## 6. Skill 1: `create-topic-synthesis-prepare`

### 6.1 Scope

用于 create workflow 的前置准备。负责 topic 定义、重复检查、resolver proposal、paper workset、graph metrics、filtered artifacts、paper triage 和 cross-paper context preparation。

### `stage_00_runtime_setup`

stage kind：command-only。

agent 做：

- 执行 `gate.py` 返回的初始化命令。
- 不写 JSON payload。
- 不传 `run_root`。

runtime 做：

- 根据 DB 路径锁定 `run_root`。
- 初始化 SQLite tables、stage states、runtime metadata。
- 写入 `operation=create`、`language`。
- 返回 `stage_10_create_topic_context` 指令。

agent-facing payload：无。

### `stage_10_create_topic_context`

任务：create topic intent 与 duplicate check。

agent 做：

- 只读调用 host topic list。
- 根据 topic title / description / aliases 判断重复。
- 写扁平 topic intent。

payload：

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

runtime 做：

- 校验 payload schema。
- 派生内部 canonical topic identity。
- 写入 topic intent、duplicate diagnostics。
- 登记 topic context receipt。
- 返回 `stage_20_resolver_and_workset` 指令。

### `stage_20_resolver_and_workset`

任务：agent 设计 resolver；runtime 完成 resolver cascade。

agent 做：

- 可只读调用 `get-library-index` 辅助 resolver 设计。
- 如果需要全库 title，分页到 `has_more=false`。
- 如果需要全库 tags，传 `includeTags:true`，读取顶层 `tags[]`。
- 只写 resolver proposal。

payload：

```json
{
  "resolver": {
    "mode": "tag_query",
    "query": {
      "and": ["object-detection", "detr"]
    }
  },
  "resolver_reasoning": "",
  "operation_intent": "create",
  "diagnostics": []
}
```

runtime 做：

- 编译 proposal 为 Host Bridge input。
- 调 `resolve-resolver`。
- 写 `runtime/payloads/resolver.json`。
- 派生 `paper_workset`。
- 查询 citation graph metrics。
- 导出 filtered paper artifacts。
- 写 resolver cascade receipts。
- 返回 `stage_30_prepare_analysis_context` 指令。

### `stage_30_prepare_analysis_context`

任务：轻量 paper triage + runtime context preparation。

agent 做：

- 读取 filtered artifact content files。
- 对每篇 paper 写轻量 triage。
- 可按 batch/subagent 并行。
- 不做 taxonomy、timeline、claim、debate、gap。

payload：

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
      "caveats": [],
      "diagnostics": []
    }
  ]
}
```

runtime 做：

- 校验 `paper_ref` 属于 `paper_workset`。
- 将 triage 编译为内部 paper analysis rows。
- 注入 digest/artifact/provenance metadata。
- 若仍有 missing triage paper，保持当前 stage，gate 给下一批。
- 所有 paper triage 完成后级联：
  - 计算 deterministic paper scores。
  - 生成 core/external context selection。
  - 写 `runtime/views/cross-paper-context.md`。
  - 写 `runtime/views/external-literature-context.md`。
  - 写 `runtime/views/cross-paper-context.manifest.json`。
  - 写 `runtime/views/source-paper-evidence-index.json`。
  - 写 `runtime/handoff/prepare-analysis-context.json`。
  - stdout 输出 `topic_synthesis_handoff` envelope。

skill output：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis_handoff",
  "handoff": "prepare_analysis_context",
  "operation": "create",
  "db_path": "runtime/topic-synthesis.sqlite",
  "handoff_manifest_path": "runtime/handoff/prepare-analysis-context.json",
  "handoff_manifest_hash": "sha256:...",
  "next_skill_id": "topic-synthesis-core-enrichment",
  "diagnostics": []
}
```

## 7. Skill 2: `update-topic-synthesis-prepare`

### 7.1 Scope

用于 update workflow 的前置准备。与 create prepare 共用 DB/file contract；发布包携带由 suite renderer 生成的自包含 runtime scripts。`stage_10_update_topic_context` 使用 update CAS 语义。

### `stage_00_runtime_setup`

stage kind：command-only。

agent-facing payload：无。

runtime 做：

- 锁定 `run_root`。
- 初始化 DB。
- 写入 `operation=update_full` 或 `operation=update_patch`。
- 写入 language / update parameters。
- 返回 `stage_10_update_topic_context` 指令。

### `stage_10_update_topic_context`

任务：读取 current topic context 与 update CAS basis。

agent 做：

- 调 `get-topic-context`。
- 将 host response 放入 `topic_context`。
- 只写轻量 `update_assessment`。

payload：

```json
{
  "topic_context": {
    "topic_id": "existing-topic-id",
    "topic_definition": {},
    "current_hashes": {},
    "section_hashes": {},
    "recommended_update": {}
  },
  "update_assessment": {
    "operation": "update_full",
    "changed_sections": [],
    "reason": ""
  },
  "diagnostics": []
}
```

runtime 做：

- 从 `topic_context` 派生 topic definition。
- 写入 current context。
- 派生 `base_hashes`、`read_section_hashes`、`recommended_update`。
- 固化 update mode decision。
- 登记 receipt。
- 返回 `stage_20_resolver_and_workset` 指令。

### `stage_20_resolver_and_workset`

任务：agent 设计 resolver；runtime 完成 resolver cascade 并处理 update CAS。

agent-facing payload 同 create prepare `stage_20_resolver_and_workset`。

runtime 做：

- 编译 proposal 为 Host Bridge input。
- 调 `resolve-resolver`。
- 写 resolver result、paper workset、graph metrics、filtered artifact receipts。
- 对 `update_patch` 执行 CAS 边界校验。
- 如果 resolver / paper set / language / schema 变化超出 patch 边界，runtime 阻断本次提交。
- 返回 `stage_30_prepare_analysis_context` 指令。

### `stage_30_prepare_analysis_context`

任务：轻量 paper triage + runtime context preparation。

agent-facing payload 同 create prepare `stage_30_prepare_analysis_context`。

runtime 完成后写同一 handoff manifest：

```text
runtime/handoff/prepare-analysis-context.json
```

skill output：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis_handoff",
  "handoff": "prepare_analysis_context",
  "operation": "update_full",
  "db_path": "runtime/topic-synthesis.sqlite",
  "handoff_manifest_path": "runtime/handoff/prepare-analysis-context.json",
  "handoff_manifest_hash": "sha256:...",
  "next_skill_id": "topic-synthesis-core-enrichment",
  "diagnostics": []
}
```

## 8. Skill 3: `topic-synthesis-core-enrichment`

### 8.1 Scope

该 skill 需要干净上下文，只读取 prepare handoff 输出的 context views 和 DB，不接触 topic context、resolver 或 host artifact export 的准备细节。

### `stage_00_runtime_state_check`

stage kind：command-only。

agent-facing payload：无。

runtime 做：

- 验证 `runtime/topic-synthesis.sqlite` 存在。
- 验证 `runtime/handoff/prepare-analysis-context.json` 存在并匹配 hash。
- 验证 required context views 可读。
- 写 core-enrichment entry receipt 或 diagnostics。
- 返回 `stage_40_core_synthesis` 指令。

### `stage_40_core_synthesis`

任务：agent 一次写核心综合。

agent 做：

- 读取：
  - `runtime/handoff/prepare-analysis-context.json`
  - `runtime/views/cross-paper-context.md`
  - `runtime/views/external-literature-context.md`
  - `runtime/views/source-paper-evidence-index.json`
- 写 taxonomy、timeline、positioning、claims、improvement dimensions、debates、gaps、review outline。
- 写 `concept_candidate_labels[]`。
- 在需要证据的位置写 `source_paper_refs`。

payload：

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

runtime 做：

- 校验 required sections。
- 校验 `source_paper_refs` 属于 resolved paper set。
- 注入 runtime evidence refs。
- 物化 core section files。
- 登记 `core_analytical_sections_hash`。
- 为 KG enrichment 生成 concept candidate context。
- 返回 `stage_50_kg_enrichment` 指令。

### `stage_50_kg_enrichment`

任务：agent 做 KG enrichment，不写 sidecar wrapper。

agent 做：

- 基于 `concept_candidate_labels[]` 和 runtime/host 提供的 match context，补全 concept details。
- 写 topic relation candidates。
- 写 topic matching terms。

payload：

```json
{
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

runtime 做：

- 校验 payload schema。
- 物化：
  - `result/sidecars/concept-cards-proposal.json`
  - `result/sidecars/topic-graph-relation-proposals.json`
  - `result/sidecars/topic-interest-metadata.json`
- 登记 sidecar artifacts。
- 写 `runtime/handoff/core-enrichment.json`。
- stdout 输出 `topic_synthesis_handoff` envelope。

skill output：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis_handoff",
  "handoff": "core_enrichment",
  "operation": "create",
  "db_path": "runtime/topic-synthesis.sqlite",
  "handoff_manifest_path": "runtime/handoff/core-enrichment.json",
  "handoff_manifest_hash": "sha256:...",
  "next_skill_id": "topic-synthesis-finalize",
  "diagnostics": []
}
```

## 9. Skill 4: `topic-synthesis-finalize`

### 9.1 Scope

该 skill 需要干净上下文，负责 coverage / reliability / collection suggestions 收尾、确定性渲染 synthesis report、最后基于成文 report 写 summary，并由 runtime final validation/output candidate。

关键规则：

- summary 必须最后做。
- `stage_60_coverage_and_collection_suggestions` 不写 summary。
- `stage_60_coverage_and_collection_suggestions` 完成后，`gate.py` 立即级联渲染 synthesis report。
- `stage_70_summary` 只能基于已渲染的 synthesis report 写 summary。
- agent 不写 statistics 数字、source artifacts、semantic evidence map 或完整 synthesis report。

### `stage_00_runtime_state_check`

stage kind：command-only。

agent-facing payload：无。

runtime 做：

- 验证 `runtime/topic-synthesis.sqlite` 存在。
- 验证 `runtime/handoff/core-enrichment.json` 存在并匹配 hash。
- 验证 core sections、sidecars、source paper evidence index 可读。
- 查询/计算 graph statistics。
- 写 `runtime/views/finalize-context.manifest.json`。
- 写 finalize entry receipt 或 diagnostics。
- 返回 `stage_60_coverage_and_collection_suggestions` 指令。

### `stage_60_coverage_and_collection_suggestions`

任务：agent 基于 core synthesis、external context 和 graph statistics 写 coverage / reliability interpretation 与 collection suggestions。

agent 做：

- 读取 `runtime/views/finalize-context.manifest.json`。
- 读取 core sections、external context summary 和 graph statistics view。
- 写 coverage verdict 与 reason。
- 写 reliability summary / caveats。
- 写 external context 的简要判断。
- 写 suggested collection directions。
- 不写 summary。
- 不写 statistics 数字。
- 不写 external reference ids、canonical external references、bibliography 或 citation contexts。
- 可在 coverage caveats / collection directions 中写 `source_paper_refs`。

payload：

```json
{
  "coverage_verdict": "partial",
  "coverage_reason": "",
  "reliability_summary": "",
  "coverage_caveats": [],
  "external_context_summary": "",
  "suggested_collection_directions": [
    {
      "direction": "",
      "reason": "",
      "example_titles_or_terms": [],
      "priority": "medium"
    }
  ],
  "diagnostics": []
}
```

`coverage_verdict` 枚举：

```text
sufficient / partial / insufficient / severely_missing / unknown
```

`suggested_collection_directions[].priority` 枚举：

```text
high / medium / low / unknown
```

runtime 做：

- 校验 coverage / collection payload。
- 写入 coverage、external_literature_analysis、statistics、collection suggestion 相关 rows/sections。
- 从 graph / canonical 层确定性生成 statistics 数字；graph 缺失或 stale 时写 runtime caveat，不要求 agent 补数字。
- 根据固定模板渲染 synthesis report。
- 写：

```text
runtime/views/synthesis-report.md
runtime/views/synthesis-report.manifest.json
result/sections/synthesis_report.json
```

- 返回 `stage_70_summary` 指令。

### `stage_70_summary`

任务：agent 基于已渲染 synthesis report 写最终 summary。

agent 做：

- 读取 `runtime/views/synthesis-report.md`。
- 读取 `runtime/views/synthesis-report.manifest.json`。
- 基于已成文 synthesis report 写用户可读 summary。
- 不新增 coverage、collection suggestions 或 statistics。
- 不改写 synthesis report。

payload：

```json
{
  "summary_brief": "",
  "summary_overview": "",
  "key_takeaways": [],
  "diagnostics": []
}
```

runtime 做：

- 校验 summary payload。
- 物化 `summary` section。
- 将 summary 与已渲染 synthesis report 关联到 final output manifest。
- 物化或校验 final sections：
  - `summary`
  - `coverage`
  - `external_literature_analysis`
  - `statistics`
  - `synthesis_report`
  - `paper_evidence`
  - `source_artifacts`
  - `semantic_evidence_map`
- 从 final sections 的 `source_paper_refs` 反向编译 `semantic_evidence_map`。
- 校验 `result/sections/*.json`。
- 校验 sidecars、artifact registry hashes、evidence closure。
- 校验 operation-specific manifest shape。
- 写：
  - `result/topic-analysis.json` 或 patch manifest
  - `result/final-output.candidate.json`
  - `runtime/handoff/finalize-output.json`
- stdout 输出 final `topic_synthesis` envelope。

final skill output：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis",
  "operation": "create",
  "analysis_manifest_path": "result/topic-analysis.json",
  "candidate_output_path": "result/final-output.candidate.json",
  "diagnostics": []
}
```

编排器职责：

- 捕获 stdout。
- 校验 output schema。
- 校验 create/update_full/update_patch precondition。
- 校验通过后写 accepted：

```text
result/result.json
```

## 10. Source-to-Package Render Contract

renderer 是开发态 suite 到发布态 skill packages 的唯一出口。

renderer inputs：

```text
skills_src/topic-synthesis/contracts/
skills_src/topic-synthesis/runtime/
skills_src/topic-synthesis/templates/
```

renderer outputs：

```text
skills_builtin/create-topic-synthesis-prepare/
skills_builtin/update-topic-synthesis-prepare/
skills_builtin/topic-synthesis-core-enrichment/
skills_builtin/topic-synthesis-finalize/
```

renderer 必须保证：

- 每个发布包只包含当前 skill 运行所需的说明、schema、脚本和 reference。
- 每个发布包的 `SKILL.md` 只描述当前 skill 的 canonical stages，不泄露全局 stage graph 作为 agent 操作指南。
- 每个发布包的 `scripts/` 可以独立运行，不要求 runtime import `skills_src/topic-synthesis/`。
- 每个发布包的 schema 与 suite `contracts/payload-schemas/` 保持一致。
- 每个发布包的 stdout envelope schema 与 suite `contracts/stdout-envelope.schema.json` 保持一致。
- 每个发布包的 handoff manifest schema 与 suite `contracts/handoff.schema.json` 保持一致。
- renderer 输出应可重复；相同 suite source 生成相同发布包内容。
- renderer 应避免复制不属于该 skill 的长说明，防止 agent 在局部 skill 中看到无关字段或阶段。

禁止：

- 在 `skills_builtin/` 中手工修补生成内容作为长期方案。
- 让发布包在运行时依赖 agent 读取 suite source。
- 让四个发布包各自维护同一份 schema、stage list 或 DB path 常量。
- 为兼容历史单体 skill 在发布包里保留旧 stage、旧字段或 fallback 说明。

测试分层：

```text
contract tests:
  validate suite schemas, stage list, handoff envelope, DB schema

renderer tests:
  render packages into temp dir, compare expected package structure, check idempotence

rendered-package tests:
  run each rendered gate.py from non-package cwd
  validate package-local schema refs resolve
  validate package does not import suite source at runtime

workflow tests:
  simulate prepare -> core-enrichment -> finalize handoff chain against one SQLite DB
```

## 11. SKILL.md Render Template Contract

发布态每个 skill 使用单一 agent-facing `SKILL.md`。公共规则在 suite source 的 template fragments 中维护，渲染时展开到当前 skill 的 `SKILL.md`；agent 运行时不需要读取 `references/` 或 suite source。

### 11.1 Published Package Shape

每个发布包的 agent-facing 内容固定为：

```text
SKILL.md
scripts/gate.py
scripts/topic_synthesis_db.py
assets/schemas/<current-skill-stage-schemas>.json
```

默认不生成 `references/`。如果未来某个 skill 确实需要大体量只读材料，必须单独证明它不能由 gate output、schema、DB view 或 runtime artifact 承载，并且 `SKILL.md` 必须写明读取时机。

### 11.2 Template Source Layout

`skills_src/topic-synthesis/templates/fragments/` 维护公共片段：

```text
frontmatter.md.j2
scope.md.j2
execution-contract.md.j2
runtime-state.md.j2
stage-loop.md.j2
output-contract.md.j2
failure-rules.md.j2
```

四个 skill 各有一个 `SKILL.md.j2`，只负责选择当前 skill 的 scope、stages、payload schema refs 和 output envelope。公共片段不得在四个 skill 模板中复制粘贴。

### 11.3 Rendered SKILL.md Skeleton

每个渲染后的 `SKILL.md` 使用同一章节骨架：

```text
Frontmatter
Title
Scope
Required Runtime Inputs
Execution Contract
Runtime State
Stage Loop
Stages
Output Contract
Failure Rules
```

章节含义：

- `Scope`：当前 skill 做什么、不做什么、读取哪个上游 handoff、输出哪个 handoff 或 final envelope。
- `Required Runtime Inputs`：当前 skill 启动前必须存在的 DB、handoff、views 或 workflow input；只写当前 skill 需要的输入。
- `Execution Contract`：只调用 `scripts/gate.py`；不调用内部 DB helper；不传 stage/action 参数；当前 stage 只能由 DB 推断。
- `Runtime State`：SQLite、payload files、handoff manifest 和 runtime artifacts 的真源关系。
- `Stage Loop`：agent 如何按 gate output 执行 command-only stage 或 payload stage。
- `Stages`：只列当前 skill 的 canonical stages。
- `Output Contract`：当前 skill 完成时 stdout envelope 与关键文件路径。
- `Failure Rules`：gate 返回 error JSON 时停止，不猜测恢复路径，不手改 DB，不绕过 gate。

### 11.4 Public Fragments

`execution-contract.md.j2` 固定表达：

- `scripts/gate.py` 是唯一 agent-facing CLI。
- agent 不传 stage 名称、不传 action 名称。
- command-only stage 只执行 gate command，不写 payload。
- payload stage 只写 gate 指定的 payload path，并只按 gate 指定 command 提交。

`runtime-state.md.j2` 固定表达：

- SQLite 是 stage state、receipt、artifact registry、handoff registry 的真源。
- 跨 skill 业务状态只来自 SQLite 和 handoff/files，不从 prompt 传递。
- prepare skills 可以通过 `stage_00_runtime_setup` 固定 `run_root`。
- downstream skills 只能通过 `stage_00_runtime_state_check` 验证既有状态。

`stage-loop.md.j2` 固定表达：

1. Run gate without payload to get the current instruction.
2. If `needs_payload` is false, run the returned command and read the next instruction.
3. If `needs_payload` is true, read only the files listed by gate.
4. Write exactly one JSON payload to `payload_path`.
5. Submit that payload with `submit_command`.
6. Repeat until gate returns a handoff envelope or final output envelope.

`output-contract.md.j2` 固定表达：

- 非最终 skill 输出 compact `topic_synthesis_handoff` envelope。
- final skill 输出 final `topic_synthesis` envelope。
- 大正文、业务状态和 hashes 的真源仍然是 DB 和文件，不是 stdout。

`failure-rules.md.j2` 固定表达：

- 如果 gate 输出 error JSON，停止当前 skill。
- 不手动修改 SQLite。
- 不手动生成 handoff hashes。
- 不绕过 `gate.py` 调用内部 helper。
- 不基于旧字段、旧 stage 或历史 fallback 猜测恢复路径。

### 11.5 Skill-Specific Template Content

每个 skill 的 `SKILL.md.j2` 只注入当前 skill 的局部内容：

- skill name / description。
- 当前 skill 的 scope。
- required runtime inputs。
- 当前 skill 的 stage 列表。
- 每个 stage 的 `stage id`、`stage kind`、agent task、required reads、payload path、schema ref、payload skeleton、runtime after submit、next transition。
- 当前 skill 的 stdout envelope。

四个 skill 的 `SKILL.md` 不展示完整全局 workflow 图。允许写一个局部 handoff 关系，例如“consume prepare handoff, emit core-enrichment handoff”，但不要求 agent 理解四个 skill 的全局编排。

### 11.6 Forbidden SKILL.md Content

发布态 `SKILL.md` 不得包含：

- action 名称或 action-to-stage 映射。
- runtime-only stage、completed marker stage 或 validate-only stage。
- 旧单体 skill 的 stage 名称、字段、兼容 fallback 或迁移说明。
- host bridge 内部 capability schema，除非它就是当前 agent-facing payload schema。
- 不属于当前 skill 的 stage 说明。
- 全局四 skill 编排图作为 agent 操作指南。
- 通过枚举隐藏字段来教育 agent “不要写某字段”的说明。

隐藏字段、runtime-computed fields 和 unknown fields 由 schema 与 runtime validation 处理。`SKILL.md` 只展示 agent 当前必须写的字段、读取材料和提交命令；不要暴露 agent 不需要知道的内部字段名。

## 12. Skill Group Boundary Summary

### `create-topic-synthesis-prepare`

输入：

- workflow parameter: `topicSeed`, `language`
- host: topic list / library index / resolver / graph metrics / artifacts

输出：

- DB state through `stage_30_prepare_analysis_context`
- `runtime/handoff/prepare-analysis-context.json`
- cross-paper context views
- stdout `topic_synthesis_handoff` envelope

### `update-topic-synthesis-prepare`

输入：

- workflow parameter: `topicId`, `updateScope`, `updateMode`, `updateReason`, `language`
- host: topic context / library index / resolver / graph metrics / artifacts

输出：

- DB state through `stage_30_prepare_analysis_context`
- update CAS basis in SQLite
- `runtime/handoff/prepare-analysis-context.json`
- stdout `topic_synthesis_handoff` envelope

### `topic-synthesis-core-enrichment`

输入：

- `runtime/handoff/prepare-analysis-context.json`
- context views
- SQLite paper/workset/provenance state

输出：

- core sections
- KG sidecars
- `runtime/handoff/core-enrichment.json`
- stdout `topic_synthesis_handoff` envelope

### `topic-synthesis-finalize`

输入：

- `runtime/handoff/core-enrichment.json`
- final section files / sidecars / DB metadata

输出：

- final sections
- `result/topic-analysis.json`
- `result/final-output.candidate.json`
- `runtime/handoff/finalize-output.json`
- stdout final `topic_synthesis` envelope

## 13. Agent-Facing Payload Summary

Only these payloads are agent-authored:

```text
create-topic-synthesis-prepare:
- stage_10_create_topic_context payload
- stage_20_resolver_and_workset payload
- stage_30_prepare_analysis_context batch payload

update-topic-synthesis-prepare:
- stage_10_update_topic_context payload
- stage_20_resolver_and_workset payload
- stage_30_prepare_analysis_context batch payload

topic-synthesis-core-enrichment:
- stage_40_core_synthesis payload
- stage_50_kg_enrichment payload

topic-synthesis-finalize:
- stage_60_coverage_and_collection_suggestions payload
- stage_70_summary payload
```

Command-only stages:

```text
stage_00_runtime_setup
stage_00_runtime_state_check
```

Not agent-authored:

```text
run_root
topic id
base_hashes / read_section_hashes
resolver result
paper_workset
citation graph metrics
artifact manifests
artifact availability
digest locators
cross-paper provenance index
evidence ids / evidence refs
semantic evidence map
statistics
synthesis report body
final output candidate
result/result.json
handoff manifest hashes
```

## 14. Validation Contract

每个 skill 的 gate/runtime 必须支持以下最小验证：

- renderer 输出的四个发布包结构完整，且与 suite source 无漂移。
- 每个发布包默认只有一个 agent-facing `SKILL.md`；不得要求 agent 读取 suite source 或模板 fragments。
- 渲染后的 `SKILL.md` 只包含当前 skill 的 stages、payload schemas 和 output contract。
- 发布包内 scripts 不 import `skills_src/topic-synthesis/`。
- 从任意当前目录调用，仍能定位 skill script、DB、run workspace 和 Zotero bridge。
- gate output 只包含当前 skill 的 canonical stage，不要求 agent 理解全局 stage graph。
- `gate.py` 不接受 stage 名称参数；当前 stage 只能从 DB 推断。
- payload submit 只接受当前 stage 的 agent-facing schema。
- 只有 `stage_00_runtime_setup` 与 `stage_00_runtime_state_check` 可以不接受 agent-authored business payload。
- `stage_00_runtime_state_check` 必须在 handoff、DB path、run id、run_root、contract version 或 required upstream artifacts 不匹配时 fail closed，并输出稳定 error JSON。
- 非最终 skill 完成时同时写 handoff manifest、登记 SQLite、stdout 输出 compact handoff envelope。
- final skill stdout 只输出 final `topic_synthesis` envelope，不输出 handoff envelope。
- 所有跨 skill artifact path 必须有 hash，并可由下游 skill 重新校验。
- 修改 suite source 后必须通过 renderer 重新生成发布包，并通过 rendered-package tests。

## 15. Open Questions For Follow-up

1. `cross_paper_evidence_map` 文件名是否彻底迁移为 `source-paper-evidence-index.json` + final `semantic_evidence_map`。

---
