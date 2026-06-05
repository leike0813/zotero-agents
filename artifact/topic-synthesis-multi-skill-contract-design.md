# Topic Synthesis Multi-Skill Contract Design

## 1. 总体目标

将 topic synthesis workflow 拆成四个围绕同一个运行状态执行的 skill group：

1. `create-topic-synthesis-prepare`
2. `update-topic-synthesis-prepare`
3. `topic-synthesis-core-enrichment`
4. `topic-synthesis-finalize`

四个发布态 skill 共享同一个 ACP run workspace、同一个 SQLite DB、同一套文件合同。所有跨 skill 传递的信息必须写入 SQLite 或文件；handoff manifest 负责登记跨 skill 的最小完成状态和关键 artifact 指针。后续 workflow 多 skill 编排只负责按顺序启动这些 skill，不负责携带业务状态。

四个 skill 必须作为一个 topic synthesis skill suite 子项目统一开发。`skills_src/topic-synthesis/` 是开发态真源；`skills_builtin/` 下的四个 skill 发布包是渲染产物。发布包必须自包含自己的 `SKILL.md`、`scripts/`、schemas 和必要 references，但这些文件不手工维护。

## 2. 共享运行合同

### 2.1 Run Root / DB

固定运行根：

```text
<run_root>/
```

固定 SQLite：

```text
runtime/topic-synthesis.sqlite
```

固定规则：

- `run_root` 只能由 prepare skill 的 Stage 0 runtime 根据 DB 路径锁定并写入 SQLite。
- 后续 skill 不接收 agent 编造的 `run_root`。
- 所有 stage state、receipt、artifact hash、handoff 状态都以 SQLite 为真源。
- 所有语义 payload 以 run workspace JSON 文件为真源。
- agent prompt 不传递跨 skill 业务状态；后续 skill 只通过 gate/runtime 读取 DB 和文件。

### 2.2 Suite Source / Rendered Packages

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
      create-topic-context.schema.json
      update-topic-context.schema.json
      resolver-proposal.schema.json
      paper-triage.schema.json
      core-synthesis.schema.json
      kg-enrichment.schema.json
      summary-coverage.schema.json
  runtime/
    topic_synthesis_runtime/
      common/
      create_prepare/
      update_prepare/
      core_enrichment/
      finalize/
  templates/
    create-topic-synthesis-prepare/
    update-topic-synthesis-prepare/
    topic-synthesis-core-enrichment/
    topic-synthesis-finalize/
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
- renderer 从 suite source 生成每个发布包的 `SKILL.md`、`scripts/`、`assets/schemas/` 和必要 references。
- 发布态 skill 仍必须符合普通 skill package 标准：包内文件足以独立执行当前 skill，不依赖 agent 读取 suite source。
- 共享合同、schema、路径常量、stage 映射和 stdout envelope 只在 suite source 维护一次。
- agent-facing 文档由模板渲染，仍然只暴露当前 skill 的局部 step/action。
- 测试围绕 suite source 组织，覆盖 shared contract、renderer 输出、单包自包含性和跨 skill handoff workflow。

### 2.3 Rendered Runtime Ownership

每个发布态 skill 按 skill package 标准携带自己的 `scripts/`：

```text
create-topic-synthesis-prepare/scripts/
update-topic-synthesis-prepare/scripts/
topic-synthesis-core-enrichment/scripts/
topic-synthesis-finalize/scripts/
```

每个 skill 至少包含：

```text
scripts/gate_runtime.py
scripts/stage_runtime.py
```

脚本边界：

- `gate_runtime.py` 只返回当前 skill 的下一步、下一 action、agent 需要读取的本地说明和 schema。
- `stage_runtime.py` 只接受当前 skill 的 public actions。
- 发布包内的 scripts 由 renderer 从 suite runtime source 生成或复制。
- 共享 DB schema、文件路径常量和轻量工具函数在 suite source 中维护；发布包只携带当前 skill 所需的最小本地副本。
- 发布包之间不得要求人工同步同一份大段 runtime 内容。
- 每个脚本必须能从任意工作目录调用，并通过自身文件位置、传入 DB path 或 manifest path 稳定定位 run workspace 与 Zotero bridge 相关路径。
- 脚本路径处理必须跨平台，使用 `pathlib`/等价路径 API，不拼接硬编码分隔符。
- skill 运行说明只描述当前有效合同，不暴露旧字段、历史阶段或兼容 fallback。

### 2.4 Global Stage Is Internal

SQLite 内部 stage 使用全局编号：

```text
stage_0_runtime_setup
stage_1_topic_context
stage_2_resolver_and_workset
stage_3_prepare_analysis_context
stage_4_core_synthesis
stage_5_kg_enrichment
stage_6_finalize_summary_coverage
stage_7_validate_and_output
stage_8_completed
```

全局 stage 是 DB/runtime/orchestrator 内部状态。agent-facing `SKILL.md` 和 gate output 只暴露当前 skill 的局部 step 名称与 action。

局部 step 映射：

```text
create-topic-synthesis-prepare:
  step_0_runtime_setup      -> stage_0_runtime_setup
  step_1_topic_context      -> stage_1_topic_context
  step_2_resolver           -> stage_2_resolver_and_workset
  step_3_analysis_context   -> stage_3_prepare_analysis_context

update-topic-synthesis-prepare:
  step_0_runtime_setup      -> stage_0_runtime_setup
  step_1_topic_context      -> stage_1_topic_context
  step_2_resolver           -> stage_2_resolver_and_workset
  step_3_analysis_context   -> stage_3_prepare_analysis_context

topic-synthesis-core-enrichment:
  step_1_core_synthesis     -> stage_4_core_synthesis
  step_2_kg_enrichment      -> stage_5_kg_enrichment

topic-synthesis-finalize:
  step_1_prepare_report     -> stage_6_finalize_summary_coverage runtime prelude
  step_2_summary_coverage   -> stage_6_finalize_summary_coverage agent payload
  step_3_validate_output    -> stage_7_validate_and_output
```

gate output 示例：

```json
{
  "step": "core_synthesis",
  "next_action": "persist_core_synthesis",
  "instruction_refs": ["SKILL.md#step-1-core-synthesis"],
  "schema_refs": ["assets/schemas/core-synthesis.schema.json"]
}
```

### 2.5 Handoff Contract

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

handoff manifest 只保存路径、hash、stage completion、diagnostics，不保存大正文。

manifest 示例：

```json
{
  "schema_id": "synthesis.skill_handoff",
  "schema_version": "1.0.0",
  "handoff": "prepare_analysis_context",
  "completed_stage": "stage_3_prepare_analysis_context",
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

## 3. Skill 1: `create-topic-synthesis-prepare`

### 3.1 Scope

用于 create workflow 的前置准备。负责 topic 定义、重复检查、resolver proposal、paper workset、graph metrics、filtered artifacts、paper triage 和 cross-paper context preparation。

agent 只需要知道本 skill 的四个局部 step：

```text
step_0_runtime_setup
step_1_topic_context
step_2_resolver
step_3_analysis_context
```

### Step 0: `step_0_runtime_setup`

任务：初始化 run-local SQLite。

agent 做：

- 只执行 gate 返回的 setup command。
- 不写 JSON payload。
- 不传 `run_root`。

runtime 做：

- 根据 DB 路径锁定 `run_root`。
- 初始化 SQLite tables、stage states、runtime metadata。
- 写入 `operation=create`、`language`。

agent-facing payload：无。

action：

```text
confirm_runtime_setup
```

### Step 1: `step_1_topic_context`

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

action：

```text
persist_topic_context
```

### Step 2: `step_2_resolver`

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

action：

```text
persist_resolver
```

### Step 3: `step_3_analysis_context`

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
- 若仍有 missing triage paper，stage 保持 running，gate 给下一批。
- 所有 paper triage 完成后，同一 action 级联：
  - 计算 deterministic paper scores。
  - 生成 core/external context selection。
  - 写 `runtime/views/cross-paper-context.md`。
  - 写 `runtime/views/external-literature-context.md`。
  - 写 `runtime/views/cross-paper-context.manifest.json`。
  - 写 `runtime/views/source-paper-evidence-index.json`。
  - 写 `runtime/handoff/prepare-analysis-context.json`。
  - stdout 输出 `topic_synthesis_handoff` envelope。
  - 推进到 `stage_4_core_synthesis`。

action：

```text
persist_analysis_context
```

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

## 4. Skill 2: `update-topic-synthesis-prepare`

### 4.1 Scope

用于 update workflow 的前置准备。与 create prepare 共用 DB/file contract；发布包携带由 suite renderer 生成的自包含 runtime scripts。Stage 1 使用 update CAS 语义。

agent 只需要知道本 skill 的四个局部 step：

```text
step_0_runtime_setup
step_1_topic_context
step_2_resolver
step_3_analysis_context
```

### Step 0: `step_0_runtime_setup`

agent-facing payload：无。

runtime 做：

- 锁定 `run_root`。
- 初始化 DB。
- 写入 `operation=update_full` 或 `operation=update_patch`。
- 写入 language / update parameters。

action：

```text
confirm_runtime_setup
```

### Step 1: `step_1_topic_context`

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

action：

```text
persist_topic_context
```

### Step 2: `step_2_resolver`

任务：agent 设计 resolver；runtime 完成 resolver cascade 并处理 update CAS。

agent-facing payload 同 create prepare Step 2。

runtime 做：

- 编译 proposal 为 Host Bridge input。
- 调 `resolve-resolver`。
- 写 resolver result、paper workset、graph metrics、filtered artifact receipts。
- 对 `update_patch` 执行 CAS 边界校验。
- 如果 resolver / paper set / language / schema 变化超出 patch 边界，runtime 阻断本 action。

action：

```text
persist_resolver
```

### Step 3: `step_3_analysis_context`

任务：轻量 paper triage + runtime context preparation。

agent-facing payload 同 create prepare Step 3。

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

## 5. Skill 3: `topic-synthesis-core-enrichment`

### 5.1 Scope

该 skill 需要干净上下文，只读取 prepare handoff 输出的 context views 和 DB，不接触 topic context、resolver 或 host artifact export 的准备细节。

负责：

```text
step_1_core_synthesis
step_2_kg_enrichment
```

### Step 1: `step_1_core_synthesis`

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
- 推进到 `stage_5_kg_enrichment`。

action：

```text
persist_core_synthesis
```

### Step 2: `step_2_kg_enrichment`

任务：agent 做 KG enrichment，不写 sidecar wrapper。

agent 做：

- 基于 Stage 4 `concept_candidate_labels[]` 和 runtime/host 提供的 match context，补全 concept details。
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
- 推进到 `stage_6_finalize_summary_coverage`。

action：

```text
persist_kg_enrichment
```

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

## 6. Skill 4: `topic-synthesis-finalize`

### 6.1 Scope

该 skill 需要干净上下文，负责最终报告成文后的 summary/coverage 收尾，以及 runtime final validation/output candidate。

负责：

```text
step_1_prepare_report
step_2_summary_coverage
step_3_validate_output
```

关键规则：

- summary 必须最后做。
- runtime 先根据前序 sections 和固定模板拼装 synthesis report body。
- agent 只能基于已成文的 report body 写 summary / coverage / reliability。
- agent 不直接写完整 synthesis report。

### Step 1: `step_1_prepare_report`

任务：runtime-only final report body preparation。

agent 做：

- 只执行 gate 返回的 prepare action。
- 不写 JSON payload。

runtime 做：

- 读取 Stage 4 core sections。
- 读取 Stage 5 sidecars。
- 读取 source paper evidence index。
- 查询/计算 statistics。
- 根据固定模板拼装 report body，不含最终 summary 或仅含 placeholder。
- 写：

```text
runtime/views/synthesis-report-body.md
runtime/views/finalize-context.manifest.json
```

action：

```text
prepare_finalize_context
```

### Step 2: `step_2_summary_coverage`

任务：agent 基于已成文 report body 写最终 summary/coverage。

agent 做：

- 读取 `runtime/views/synthesis-report-body.md`。
- 读取 `runtime/views/finalize-context.manifest.json`。
- 基于已成文 report body 写最终 summary。
- 写 coverage interpretation、reliability caveats、external context summary、collection suggestions。
- 不写 statistics 数字。
- 可在 collection suggestions / coverage caveats 中写 `source_paper_refs`。

payload：

```json
{
  "summary": {
    "brief": "",
    "overview": "",
    "key_takeaways": []
  },
  "coverage": {
    "coverage_verdict": "partial",
    "reason": ""
  },
  "reliability_caveats": [],
  "external_context_summary": {
    "summary": ""
  },
  "collection_suggestions": [],
  "diagnostics": []
}
```

runtime 做：

- 校验 summary/coverage payload。
- 将 summary 插入 final synthesis report template。
- 物化 final sections：
  - `summary`
  - `coverage`
  - `external_literature_analysis`
  - `statistics`
  - `synthesis_report`
  - `paper_evidence`
  - `source_artifacts`
  - `semantic_evidence_map`
- 从 final sections 的 `source_paper_refs` 反向编译 `semantic_evidence_map`。
- 推进到 `stage_7_validate_and_output`。

action：

```text
finalize_summary_coverage
```

### Step 3: `step_3_validate_output`

任务：runtime-only final validation + candidate output。

agent 做：

- 只执行 validate action。
- 最后读取 candidate JSON，并原样作为 stdout 输出。
- 不手写 final output。
- 不追加解释或 Markdown fence。

runtime 做：

- 校验 `result/sections/*.json`。
- 校验 sidecars、artifact registry hashes、evidence closure。
- 校验 operation-specific manifest shape。
- 写：
  - `result/topic-analysis.json` 或 patch manifest
  - `result/final-output.candidate.json`
  - `runtime/handoff/finalize-output.json`
- 标记 `stage_7_validate_and_output` completed。
- gate 进入 `stage_8_completed`。

action：

```text
validate_final_artifacts
```

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

## 7. Source-to-Package Render Contract

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
- 每个发布包的 `SKILL.md` 只描述当前 skill 的局部 step，不泄露全局 stage graph 作为 agent 操作指南。
- 每个发布包的 `scripts/` 可以独立运行，不要求 runtime import `skills_src/topic-synthesis/`。
- 每个发布包的 schema 与 suite `contracts/payload-schemas/` 保持一致。
- 每个发布包的 stdout envelope schema 与 suite `contracts/stdout-envelope.schema.json` 保持一致。
- 每个发布包的 handoff manifest schema 与 suite `contracts/handoff.schema.json` 保持一致。
- renderer 输出应可重复；相同 suite source 生成相同发布包内容。
- renderer 应避免复制不属于该 skill 的长说明，防止 agent 在局部 skill 中看到无关字段或步骤。

禁止：

- 在 `skills_builtin/` 中手工修补生成内容作为长期方案。
- 让发布包在运行时依赖 agent 读取 suite source。
- 让四个发布包各自维护同一份 schema、stage map 或 DB path 常量。
- 为兼容历史单体 skill 在发布包里保留旧 stage、旧字段或 fallback 说明。

测试分层：

```text
contract tests:
  validate suite schemas, stage map, handoff envelope, DB schema

renderer tests:
  render packages into temp dir, compare expected package structure, check idempotence

rendered-package tests:
  run each rendered gate/stage script from non-package cwd
  validate package-local schema refs resolve
  validate package does not import suite source at runtime

workflow tests:
  simulate prepare -> core-enrichment -> finalize handoff chain against one SQLite DB
```

## 8. Skill Group Boundary Summary

### `create-topic-synthesis-prepare`

输入：

- workflow parameter: `topicSeed`, `language`
- host: topic list / library index / resolver / graph metrics / artifacts

输出：

- DB stage up to `stage_3_prepare_analysis_context`
- `runtime/handoff/prepare-analysis-context.json`
- cross-paper context views
- stdout `topic_synthesis_handoff` envelope

### `update-topic-synthesis-prepare`

输入：

- workflow parameter: `topicId`, `updateScope`, `updateMode`, `updateReason`, `language`
- host: topic context / library index / resolver / graph metrics / artifacts

输出：

- DB stage up to `stage_3_prepare_analysis_context`
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

## 9. Agent-Facing Payload Summary

Only these payloads are agent-authored:

```text
create-topic-synthesis-prepare:
- topic-context.json
- resolver-proposal.json
- analysis-context batch payload

update-topic-synthesis-prepare:
- topic-context.json
- resolver-proposal.json
- analysis-context batch payload

topic-synthesis-core-enrichment:
- core-synthesis.json
- kg-enrichment.json

topic-synthesis-finalize:
- summary-coverage.json
```

Runtime-only local steps:

```text
create-topic-synthesis-prepare:
- step_0_runtime_setup

update-topic-synthesis-prepare:
- step_0_runtime_setup

topic-synthesis-finalize:
- step_1_prepare_report
- step_3_validate_output
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

## 10. Validation Contract

每个 skill 的 gate/runtime 必须支持以下最小验证：

- renderer 输出的四个发布包结构完整，且与 suite source 无漂移。
- 发布包内 scripts 不 import `skills_src/topic-synthesis/`。
- 从任意当前目录调用，仍能定位 skill script、DB、run workspace 和 Zotero bridge。
- gate output 只包含当前 skill 的局部 step/action，不要求 agent 理解全局 stage graph。
- public action 只接受当前 step 的 agent-facing schema。
- runtime-only step 不接受 agent-authored business payload。
- 非最终 skill 完成时同时写 handoff manifest、登记 SQLite、stdout 输出 compact handoff envelope。
- final skill stdout 只输出 final `topic_synthesis` envelope，不输出 handoff envelope。
- 所有跨 skill artifact path 必须有 hash，并可由下游 skill 重新校验。
- 修改 suite source 后必须通过 renderer 重新生成发布包，并通过 rendered-package tests。

## 11. Open Questions For Follow-up

1. `persist_analysis_context` 是否作为 Step 3 唯一 public action 名称，还是改成 `persist_paper_triage` 并让 runtime 级联 context preparation。
2. Stage 6 的 summary payload 是否保持 nested `summary` / `coverage`，还是进一步改成 flat `summary_brief` / `coverage_verdict`。
3. `cross_paper_evidence_map` 文件名是否彻底迁移为 `source-paper-evidence-index.json` + final `semantic_evidence_map`。

---
