# Topic Synthesis 结构化重构设计

## 目标

本轮重构把 `topic_synthesis` 从以 Markdown 阅读为中心，调整为以结构化
JSON artifact 为真源、以 Markdown 为兼容导出的形态。目标不是让插件重新
解释 citation graph，也不是在 host 侧新增 evidence pack，而是让
create/update topic synthesis skills 产出的内容更稳定、更可校验，并让 Synthesis
Workbench 能以交互式方式展示 topic synthesis。

## Skill 拆分

`topic_synthesis` 不再继续使用一个 `synthesize-topic` skill 同时处理
`create` 和 `update`。创建和更新的输入、上下文和输出约束差别较大，应拆成：

- `create-topic-synthesis`
- `update-topic-synthesis`

`create-topic-synthesis` 只接受 topic seed 和 language。它负责调用
`synthesis.list_topics` 做语义去重，必要时用 ACP interactive 让用户选择更新已
有 topic、继续创建、取消或修改 seed；之后产出新的 topic definition、resolver、
resolved paper set、结构化 sections 和 Markdown export。

`update-topic-synthesis` 接受 topic id、update reason、update scope、language
以及 host 提供的旧 structured artifact、metadata、resolver、resolved paper set
和 freshness/stale context。它可以输出全量替换，也可以输出 section patch。

两个 skill 的说明文档应使用中文重写。原因是本项目主要使用中文维护这些
synthesis 设计约束，中文 instruction 能减少低能力模型在复杂流程中误解
阶段边界、输出合同和禁止事项的概率。schema key、payload type、stable id、
命令名和最终 JSON 字段仍保持英文与机器可读格式。

## Skill Runtime 架构

`create-topic-synthesis` 和 `update-topic-synthesis` 采用同构的 package-local
Topic Synthesis Runtime，采用类似 `literature-digest` 的 gate + SQLite SSOT +
renderer 架构，但不照搬单篇论文 digest 的完整复杂度。为保证 skill 包自包含，
不再发布共享 `topic-synthesis-runtime` 包；两套 skill 各自携带 runtime scripts、
schemas、templates 与 references。

推荐目录形态：

```text
skills_builtin/create-topic-synthesis/
  scripts/gate_runtime.py
  scripts/stage_runtime.py
  scripts/runtime_db.py
  assets/schemas/
  assets/templates/
  references/
skills_builtin/update-topic-synthesis/
  scripts/gate_runtime.py
  scripts/stage_runtime.py
  scripts/runtime_db.py
  assets/schemas/
  assets/templates/
  references/
```

两个 skill 的 `SKILL.md` 负责定义入口差异：

- create：从 topic seed 和 language 开始，完成 duplicate check、definition、
  resolver、resolved paper set 和完整 synthesis。
- update：从 topic id、recommended update、language 和 host topic context 开始，
  只处理受影响范围，并输出 `update_full` 或 `update_patch`。

Runtime 的 SQLite 数据库是单次 skill run 的内部真源，不是插件 canonical assets
的替代品。正式持久化仍由 plugin `applyResult` 读取 result bundle 和 run
workspace section files 后完成。

状态机建议分为：

```text
stage_0_bootstrap
stage_1_topic_intent
stage_2_resolver
stage_3_paper_workset
stage_4_per_paper_analysis
stage_5_cross_paper_synthesis
stage_6_render_and_validate
stage_7_completed
```

create/update 共享后半段，但前半段入口不同：

- create 在 `stage_1_topic_intent` 执行 topic seed 解析、language 解析和 duplicate
  check。
- update 在 `stage_1_topic_intent` 固化 `TopicUpdateIntent`、旧 artifact metadata、
  base hashes 和 recommended update。
- create 必须经过 resolver proposal + `synthesis.resolve_resolver`。
- update 只有在 recommended update 或 update scope 指示 resolver/paper set 可能
  变化时才重新执行 resolver；否则复用 host topic context 中的 resolver 和
  resolved paper set。

Gate 纪律：

- 每次正式写库后必须重新运行 gate。
- agent 只能执行 gate 返回的 `next_action`。
- resolver 未验证前不得读取 paper artifacts。
- paper workset 未固化前不得写 per-paper analysis。
- per-paper analysis 未覆盖 required papers 前不得写 cross-paper synthesis。
- section outputs 未渲染和校验前不得输出 final bundle。
- repair / blocked 状态必须先修复 DB 状态，不能直接跳到 final JSON。

SQLite 至少需要承载：

- `runtime_inputs`：topic seed、mode、language、topic id、update reason/scope/mode。
- `workflow_state` / `action_receipts`：当前阶段、下一动作、已完成动作。
- `topic_intent`：create duplicate check 或 update intent 的固化结果。
- `topic_definition`：选定 definition、aliases、scope note。
- `resolver_candidates` 与 `selected_resolver`。
- `resolved_papers`：paper refs、match reasons、resolver diagnostics。
- `paper_artifacts`：digest/references/citation-analysis 的 locator、hash、可用状态。
- `paper_workset_batches`：逐篇或分批处理边界。
- `paper_analysis`：逐篇稳定分析，包括 contribution、method tags、year、
  limitations、timeline candidates、claim support candidates。
- `external_reference_rows`：从 references/citation-analysis 归一化出的库外文献行。
- `claim_candidates` / `timeline_events` / `external_literature_themes` /
  `coverage_diagnostics`。
- `section_outputs`：最终 section JSON 的结构化内容和路径。
- `artifact_registry`：最终 section manifest、Markdown export 和 stdout JSON 路径。

高度结构化内容应优先从 DB 渲染，而不是让 LLM 在最后一轮自由生成。例如
`timeline_events` 可以由 `paper_analysis.timeline_candidates` 聚合、去重、排序后
渲染；coverage 可以由 `paper_artifacts` 和 `resolved_papers` 计算；paper evidence
可以由 artifact locator 和 per-paper analysis 渲染。LLM 的主要职责应集中在：

- 逐篇 paper analysis 的语义抽取；
- claim synthesis；
- external literature themes；
- coverage/gaps 的解释性叙述；
- section prose 的语言质量。

脚本职责：

- 初始化 runtime DB；
- gate next action；
- 校验 payload schema；
- 写入和推进状态；
- 导出只读 workset / review view；
- 从 DB 渲染 section JSON、Markdown export 和 final stdout JSON；
- 校验 final bundle 不包含内嵌完整 Markdown、不包含 direct write 指令。

## 输出合同

最终 skill bundle 继续由 applyResult 持久化，agent 不直接写 Zotero note、
canonical index 或 mirror shard。

完成态 bundle 应包含：

- `kind: "topic_synthesis"`
- `operation: "create" | "update_full" | "update_patch"`
- `language`
- `base_hashes`
- `topic_definition`
- `topic_resolver`
- `resolved_paper_set`
- `resolver_diagnostics`
- `artifact_metadata`
- `analysis_manifest_path`

`create` / `update_full` 可以额外提供 `markdown_path` 作为 run workspace 中的
预览/兼容导出输入，但 canonical `current/export.md` 必须由 host 在完整
materialized artifact 之后统一渲染。`update_patch` 不要求也不应依赖
`markdown_path`。

完成态 bundle 不允许包含完整 `markdown` 字段。取消态 bundle 仍保持现有
`topic_synthesis_canceled` no-op 语义。

skill 不直接写完整 canonical structured artifact。它应把各 section 分别写入
run workspace，并写一个 section manifest：

```text
result/topic-analysis.json
result/topic-analysis/topic.json
result/topic-analysis/summary.json
result/topic-analysis/claims.json
result/topic-analysis/timeline-events.json
result/topic-analysis/paper-evidence.json
result/topic-analysis/external-literature-analysis.json
result/topic-analysis/coverage.json
result/topic-analysis/gaps.json
result/topic-analysis/source-artifacts.json
result/topic-analysis/diagnostics.json
```

Markdown 兼容导出建议写入：

```text
result/synthesis.md
```

`create` 和 `update_full` 必须提供完整 section manifest。`update_patch` 提供
section replacement patch manifest，只声明本次替换的 section 文件和 read-set
CAS 条件。applyResult 会把 patch 应用到当前 canonical sections，再校验并
materialize 出新的完整 current artifact。

## 结构化 artifact

applyResult 组装后的 canonical structured artifact 使用：

```json
{
  "schema_id": "synthesis.topic_synthesis_artifact",
  "schema_version": "2.0.0",
  "language": "zh-CN"
}
```

核心字段：

- `topic`：topic id、title、description、aliases。
- `summary`：面向 UI 卡片和详情页的短摘要、长摘要、关键结论。
- `claims`：跨文献结论，每条 claim 绑定库内 paper evidence。
- `timeline_events`：topic 发展事件或阶段，每条事件绑定库内 paper evidence。
- `paper_evidence`：resolved paper set 内库内论文的证据元数据和原始 digest
  工件引用。
- `external_literature_analysis`：库外文献分析章节。
- `coverage`：证据覆盖、缺失 artifact、可信度提示。
- `gaps`：研究空白和后续补充建议。
- `source_artifacts`：本次使用的 digest、references、citation analysis。
- `diagnostics`：生成限制和 schema/输入问题。
- `language`：用户选择或 skill 解析后的输出语言。

`claims` 和 `timeline_events` 的 evidence id 必须指向 `paper_evidence`。
库外 reference 不能作为主 timeline marker 或主 claim evidence。

`paper_evidence` 不保存完整 `digest-markdown` 正文。每个库内 paper evidence
应保存可由 host 解析的 `digest_ref`：

```json
{
  "paper_ref": "1:ABCD1234",
  "title": "Paper title",
  "year": "2024",
  "digest_ref": {
    "payload_type": "digest-markdown",
    "item_ref": "1:ABCD1234",
    "note_key": "NOTE1234",
    "payload_hash": "sha256:...",
    "artifact_updated_at": "2026-05-16T00:00:00Z"
  }
}
```

`digest_ref` 的目标是稳定打开原始 paper-level digest 工件，而不是在 topic
artifact 中复制一份 digest。若原始 digest 后续更新，topic artifact 通过
`payload_hash` 检测到 source changed，并在 UI 中提示。

## Section Patch

v1 支持 update skill 输出 section-level replacement patch。Patch 粒度限定在
section，不做 JSON Patch / JSON Merge Patch / JSON path 级别的细粒度编辑。
原因是 patch 主要由 agent 生成，字段级 patch 对低能力模型不稳定，且难以保证
跨 section 引用一致性。section replacement 更粗，但便于 schema 校验、回滚、
冲突判断和 deterministic materialization。

可 patch 的 sections：

- `summary`
- `claims`
- `timeline_events`
- `paper_evidence`
- `external_literature_analysis`
- `coverage`
- `gaps`
- `source_artifacts`
- `diagnostics`

`topic`、`topic_resolver`、`resolved_paper_set` 的变化默认要求
`update_full`，除非后续另行定义 resolver/paper-set patch 语义。

### Patch Manifest

`update_patch` 的 `analysis_manifest_path` 指向 patch manifest，例如：

```text
result/topic-analysis.patch.json
result/topic-analysis/claims.json
result/topic-analysis/coverage.json
```

Patch manifest 使用独立 schema：

```json
{
  "schema_id": "synthesis.topic_section_patch_manifest",
  "schema_version": "2.0.0",
  "operation": "update_patch",
  "topic_id": "object-detection",
  "language": "zh-CN",
  "created_at": "2026-05-16T00:00:00.000Z",
  "base": {
    "current_manifest_hash": "sha256:...",
    "current_artifact_hash": "sha256:...",
    "schema_version": "2.0.0",
    "read_section_hashes": {
      "paper_evidence": "sha256:...",
      "claims": "sha256:...",
      "coverage": "sha256:..."
    },
    "replace_section_hashes": {
      "claims": "sha256:...",
      "coverage": "sha256:..."
    }
  },
  "patch": {
    "mode": "section_replace",
    "changed_sections": ["claims", "coverage"],
    "unchanged_section_policy": "inherit_current",
    "sections": {
      "claims": {
        "path": "result/topic-analysis/claims.json",
        "hash": "sha256:...",
        "content_type": "json"
      },
      "coverage": {
        "path": "result/topic-analysis/coverage.json",
        "hash": "sha256:...",
        "content_type": "json"
      }
    }
  },
  "reason": {
    "update_reason": "artifact_changed",
    "scope": ["claims", "coverage"],
    "summary": "Digest changes affected claim confidence and coverage diagnostics."
  },
  "diagnostics": {
    "known_stale_sections": [],
    "requires_full_update": false
  }
}
```

`base.current_artifact_hash` 用于诊断和审计，但不是唯一 CAS 条件。正式冲突
判断以 `read_section_hashes` 为准：agent 读过或依赖过的 section 当前 hash
必须仍然匹配。这样可以允许无关 section 在并发更新后继续应用 patch。若任何
`read_section_hashes` 不匹配，host 必须拒绝 patch 并保存 local conflict
candidate 或提示重新 update。

`replace_section_hashes` 必须是 `read_section_hashes` 的子集。Agent 不能替换
自己未读取/未声明依赖的 section。`changed_sections`、`patch.sections` 和
`replace_section_hashes` 三者必须一致。

`update_patch` 的落盘规则：

```text
read current/manifest.json + current/sections/*.json
  -> verify schema major and language
  -> verify read_section_hashes CAS
  -> read changed section files
  -> verify changed section file hashes
  -> replace named sections
  -> validate full materialized structured artifact
  -> validate cross-section references
  -> render current/export.md from materialized artifact
  -> refresh metadata/hash/index
  -> persist full current/ directory, not patch-only artifact
```

Host apply 规则：

- `operation` 必须是 `update_patch`。
- `language` 必须等于当前 topic language；语言切换强制 `update_full`。
- `schema_version` major 必须与当前 artifact major 一致。
- `changed_sections` 只能来自 patchable section enum。
- `unchanged_section_policy` v1 固定为 `inherit_current`。
- 每个 changed section 必须声明 path、hash、content type。
- Host 必须重新计算 changed section file hash。
- Host 必须重新组装完整 artifact，并执行全量 schema / cross-ref 校验。
- Host 必须重新渲染 `current/export.md`；`update_patch` 不需要提供
  `markdown_path`。

允许 `update_patch` 的典型场景：

- digest / references / citation analysis 的局部变化影响 claims、coverage、
  external literature analysis 或 diagnostics。
- coverage / gaps / source_artifacts / diagnostics 局部修复。
- claims / timeline_events 局部重写，但仍必须通过全量 evidence ref 校验。

强制 `update_full` 的场景：

- resolver 改变。
- resolved paper set 改变。
- topic definition 实质改变。
- language 改变。
- schema major version 改变。
- patch manifest 声明 `diagnostics.requires_full_update: true`。
- Host 发现 full materialized artifact 或 cross-section 校验失败。

因此 UI 和 review input 永远读取完整 current artifact，不需要理解 patch。

## 语言选择

create/update workflow 都应提供 language 选项。默认值为 `auto`，表示由 skill
根据 topic seed 或旧 artifact 推断。显式语言建议使用 BCP-47 风格标签，例如：

- `zh-CN`
- `en-US`
- `auto`

language 应记录在：

- workflow 参数；
- skill final bundle；
- canonical structured artifact；
- canonical metadata；
- Markdown export metadata。

所有面向用户的 prose 字段、External Literature Analysis、claims、timeline 文本
和 Markdown export 应使用 resolved language。schema key、stable id、Zotero
item ref、hash、payload type 等保持语言无关。

## Update Intent 与预填提交

`update-topic-synthesis` 可以由用户直接裸调用，但更合理的入口是 topic 行根据
状态自动亮起 update action。这里不要让 workflow 表单承载全部 stale reason、
base hash、旧 artifact、changed sections 等内部细节，而是引入 host-owned
`TopicUpdateIntent`。

Topic 状态解析流程：

```text
scanTopicFreshness / topic state
  -> derive TopicUpdateIntent
  -> Workbench topic row shows Update / Complete / Repair action
  -> user clicks action
  -> workflow submit dialog opens with small prefilled parameters
  -> update skill calls synthesis.get_topic_context at job time
  -> context returns full current artifact, metadata, base hashes, and recommended_update
```

提交窗口只预填少量参数：

```json
{
  "topicId": "topic-alpha",
  "language": "auto",
  "updateScope": "auto",
  "updateMode": "auto",
  "updateReason": "artifact_changed"
}
```

字段含义：

- `topicId`：由 topic row 固定带入，用户通常不应修改。
- `language`：默认继承 topic 当前 language，没有则 `auto`。
- `updateScope`：默认 `auto`，可选 `claims`、`timeline`、
  `external_literature`、`coverage`、`full` 等。
- `updateMode`：默认 `auto`，由 host recommended update 与 skill 决定
  `update_patch` 或 `update_full`。
- `updateReason`：由 topic state 推导，主要用于解释和 prompt，不要求用户编辑。

完整上下文由 job-time MCP 提供：

```json
{
  "topic_id": "topic-alpha",
  "current_artifact": {},
  "metadata": {},
  "resolver": {},
  "resolved_paper_set": {},
  "freshness": {
    "freshness": "stale",
    "coverage": "partial",
    "reasons": []
  },
  "base_hashes": {},
  "recommended_update": {
    "reason": "artifact_changed",
    "scope": "claims",
    "mode": "update_patch",
    "changed_sections": ["claims", "paper_evidence", "coverage"],
    "allowed": true
  }
}
```

推荐映射规则：

- `artifact_changed` 且 digest 变化：patch `claims`、`paper_evidence`，必要时
  patch `timeline_events`。
- `artifact_changed` 且 references / citation-analysis 变化：patch
  `external_literature_analysis`、`coverage`、`source_artifacts`。
- `artifact_available`：patch 新 artifact 解锁的 sections。
- `artifact_missing`：patch `coverage` 和 `diagnostics`，并提示证据降级。
- `resolver_paper_set_changed`：默认 `update_full`。
- `graph_changed`：默认 patch `coverage` 和 `source_artifacts`；若同时影响
  resolved paper set，则 `update_full`。
- `dirty` 状态，例如 missing current files、missing metadata、invalid resolver、
  index hash mismatch：不静默执行 section patch，应显示 Repair/Rebuild，并默认
  `update_full` 或阻止自动 update。

Workbench action label：

- `fresh`：不显示主 update action，可提供 secondary Regenerate。
- `stale`：显示 Update。
- `partial/incomplete coverage`：显示 Complete。
- `dirty`：显示 Repair/Rebuild。

## 库外文献分析

库外文献来自 resolved library papers 的 `references-json` 和
`citation-analysis-json`。由于这些工件中库外文献信息通常较少，库外文献不
提升为一等主证据节点。Agent 需要单独生成
`external_literature_analysis`：

- `summary`：库外文献整体对 topic 的背景贡献。
- `themes`：按方法、数据集、理论来源、评价基准等主题分组。
- `representative_references`：代表性库外文献，保留 title、year、authors、
  DOI/URL/arXiv/raw key、信息完整度。
- `citation_contexts`：哪些库内 paper 引用了它们，以及引用语境。
- `contribution_to_topic`：这些库外文献如何解释 topic 的方法脉络。
- `limitations`：缺失元数据、低置信匹配、可能遗漏的关键文献。

UI 中该章节以分析叙述加结构化引用表展示，而不是只列清单。

## 持久化

applyResult 读取 `analysis_manifest_path` 和 section files 后，在 Synthesis
service 内执行组装、校验和写入。结构化 artifact 是 current topic artifact 的
真源；Markdown 是导出。

本轮重构不保留旧版 topic synthesis 的向后兼容语义。旧体系中的
`topics/<topicId>/current.md` 是展示真源，`topics/<topicId>/current.json`
则实际是 `synthesis.topic_artifact_metadata` 元数据 envelope。这个命名在 v2
中废弃，避免 `current.json` 同时被理解为 metadata 或 structured artifact。

v2 topic canonical 目录使用明确的 `current/` 子目录：

```text
synthesis/
  state/
    index.json
    topic-definitions.json
    resolvers.json
    resolved-paper-sets.json
    artifact-state.json
    deleted-topic-artifacts.json
    log.jsonl

  topics/<topicPathId>/
    current/
      manifest.json
      metadata.json
      artifact.json
      export.md
      sections/
        topic.json
        summary.json
        claims.json
        timeline-events.json
        paper-evidence.json
        external-literature-analysis.json
        coverage.json
        gaps.json
        source-artifacts.json
        diagnostics.json
```

各文件语义：

- `current/manifest.json`：当前 topic artifact 的入口文件，记录 section
  路径、section hash、assembled artifact hash、Markdown export hash、
  schema version、language、operation、created/updated time。
- `current/sections/*.json`：section 级真源。`section_patch` 只替换命名
  sections，未命名 sections 继承当前版本。
- `current/artifact.json`：由 sections 确定性组装出的完整结构化 artifact，
  供 UI、MCP read、review input 快速读取。
- `current/metadata.json`：host 管理的 topic 元数据和 projection 输入，
  不保存完整正文。
- `current/export.md`：Markdown 兼容导出，不再作为展示真源。

真源判定采用 `manifest.json + sections/*.json`。`artifact.json` 和
`export.md` 必须可由 manifest 指向的 sections 确定性重建；applyResult 写入时
应在同一 canonical 更新事务中校验并刷新这些 materialized assets。

`current/metadata.json` 需要记录：

- `manifest_hash`
- `structured_hash` / `artifact_hash`
- `markdown_hash` / `export_hash`
- `metadata_hash`
- `section_hashes`
- `bundle_hash`
- `paper_count`
- `external_literature_count`
- `language`
- `operation`
- `coverage_summary`
- `artifact_metadata`

Hash 术语固定如下：

- `manifest_hash`：canonicalized `current/manifest.json` hash。
- `structured_hash` / `artifact_hash`：canonicalized `current/artifact.json`
  hash。二者同义，面向旧命名和新命名时都必须指向同一内容。
- `markdown_hash` / `export_hash`：`current/export.md` 内容 hash。二者同义。
- `metadata_hash`：canonicalized `current/metadata.json` hash。
- `section_hashes`：每个 `current/sections/*.json` 的 canonical hash，写入
  `current/manifest.json`。
- `base_hashes`：create / update_full 的 bundle-level optimistic CAS 字段，
  应引用当前 manifest/artifact/export/metadata/index 等 host 提供的 hash。
- `read_section_hashes`：update_patch 的 read-set CAS 字段。Patch 冲突判断以
  它为准，而不是完整 artifact hash。

因此 apply 冲突规则是：

- `create` / `update_full`：使用 bundle-level `base_hashes` 与当前 hash 比较。
- `update_patch`：使用 patch manifest 的 `read_section_hashes` 与当前 section
  hash 比较。
- `current_artifact_hash` / `structured_hash` drift 只作为 patch 诊断信号；只要
  read set 仍匹配，非重叠 patch 可以继续应用。

旧 Markdown-only topic 不再作为 v2 topic 打开或兼容读取。若发现旧目录，只能
标记为 `legacy_invalid` / `needs_recreate`，并提示用户重新运行
`create-topic-synthesis` 生成 v2 current state。不得把旧 `current.md` 静默提升
为 v2 artifact，也不得把旧 `current.json` 解释为 v2 metadata。

## Synthesis Sync 与恢复

Canonical assets 仍是 Synthesis Layer 的真源。Zotero anchor 和 note shards
只是同步镜像和灾难恢复入口，不能覆盖已有 canonical assets，也不能成为
agent 或 workflow 直接写入的目标。

当前实现中同步尚未达到可用状态，主要有两个已确认问题：

- Zotero anchor 可以创建，但 note shard 创建失败。真实 runtime log 中的错误为
  `Error: 'title' is not a valid field for type 'note'`，说明 adapter 在创建
  Zotero note shard 时使用了 note item 不支持的 `title` 字段。
- 现有 mirror payload 范围过窄，只覆盖 `topic-definitions`、`resolvers`、
  `resolved-paper-sets`、`artifact-index` 和 `artifact-state` 等 state 文件，
  不覆盖 active topic 的 `current/` canonical assets。因此即使修复 note
  创建，也无法从 shards 恢复完整 topic synthesis 当前态。

本次设计目标是“完整当前态同步”。Mirror 应同步：

- state files：topic definitions、resolvers、resolved paper sets、artifact
  index、artifact state、deleted topic artifact state。
- active topic current assets：每个 active topic 的 `current/manifest.json`、
  `current/metadata.json`、`current/artifact.json`、`current/export.md` 和
  `current/sections/*.json`。

Mirror 不同步：

- local history versions；
- conflict candidates；
- ACP / SkillRunner run workspace；
- temporary files；
- `unified-citation-graph.json` 和 layout snapshots。

Citation graph 和 layouts 是可重建投影。若 canonical root 从 shards 恢复后缺少
graph/layout，Workbench 应提示或触发现有 graph rebuild/query 路径，而不是把
graph/layout 缺失视为 topic canonical corruption。

Mirror shard 需要使用稳定 asset identity，而不是依赖 Zotero note display title：

```json
{
  "asset_id": "topic:object-detection:current-export-md",
  "asset_path": "topics/object-detection/current/export.md",
  "content_type": "markdown"
}
```

建议的 asset identity：

- `state:index`
- `state:topic-definitions`
- `state:resolvers`
- `state:resolved-paper-sets`
- `state:artifact-state`
- `state:deleted-topic-artifacts`
- `topic:<topicId>:current-manifest`
- `topic:<topicId>:current-metadata`
- `topic:<topicId>:current-artifact`
- `topic:<topicId>:current-export-md`
- `topic:<topicId>:section:<sectionName>`

Mirror 应额外写入 manifest shard。Manifest shard 记录所有 data shards 的
`asset_id`、`asset_path`、`content_type`、seq/total、payload hash、encoded hash
和 note key。这样当本地 canonical root 缺失但 Zotero anchor 及 child note
shards 仍存在时，host 可以先读取 manifest shard，再校验并恢复 current state。

恢复规则：

- canonical assets 存在时，永远不自动从 shards 覆盖 canonical。
- base hash conflict candidate 只保存在本地，不进入 mirror。
- applyResult 成功写入 canonical 后刷新 mirror；mirror 失败不回滚 canonical，
  但必须记录 warning / diagnostic。
- conflict apply 不覆盖 current，也不刷新 mirror。
- 已有失败状态不做启动静默修复。Workbench 应在 mirror missing / degraded 时
  显示 Rebuild Mirror，由用户触发后从 canonical 重建 shards。
- canonical root 缺失且 valid shards 存在时，Workbench 可以显示 Recover from
  Shards，但必须二次确认。恢复只写入 current state/topic assets，不恢复历史
  版本或 conflict candidates。

### Recovery Safety Model

从 Zotero note shards 恢复 canonical assets 必须采用白名单和临时目录策略，避免
损坏本地文件系统或用不可信 shard 覆盖有效数据。

Path 和 identity 规则：

- `asset_path` 必须是 synthesis-root-relative path。
- 禁止绝对路径、drive prefix、UNC path、`..`、空 segment、重复分隔符和反斜杠
  绕过。
- 允许的 state asset 精确路径仅限：
  - `state/index.json`
  - `state/topic-definitions.json`
  - `state/resolvers.json`
  - `state/resolved-paper-sets.json`
  - `state/artifact-state.json`
  - `state/deleted-topic-artifacts.json`
- 允许的 topic asset 前缀仅限 `topics/<topicPathId>/current/`。
- `state/unified-citation-graph.json`、layout、history、run workspace 和临时文件
  不在 recover allowlist 内。
- `asset_id` 必须唯一。
- `asset_id` 与 `asset_path` 必须一致，例如
  `topic:x:section:claims` 只能写入
  `topics/x/current/sections/claims.json`。
- `content_type` 必须与目标路径后缀和资产类型匹配。

Manifest 和 shard 校验规则：

- manifest shard 必须列出全部 data shards。
- 每个 data shard 必须通过 `payload_hash`、`encoded_hash`、seq/total 和
  content type 校验。
- 缺 shard、重复 shard、hash mismatch、seq/total mismatch、unknown asset、
  duplicate `asset_id` 都使 recover plan 进入 invalid/degraded。
- 如果存在多个 manifest shard，只能选择最新且完整校验通过的 manifest。若多个
  manifest 都有效但内容不同，状态为 ambiguous/degraded，不能自动恢复，用户应
  先 rebuild mirror 或手工选择后续恢复策略。

恢复写入规则：

- canonical root 存在时，recover 永远不可执行；只能 rebuild mirror。
- canonical root 缺失时，confirmed recover 先写入临时目录。
- 所有 shard 解码、路径校验、hash 校验、manifest 校验和 canonical health check
  通过后，才允许原子 promote 到 synthesis root。
- promote 失败不得留下半恢复 current state；临时目录应保留诊断或清理。

计划中的 host/service action：

- `rebuildMirrorFromCanonical()`：canonical 健康时从本地 current assets 重建
  Zotero anchor、data shards 和 manifest shard。
- `recoverCanonicalFromMirror({ confirm: true })`：canonical root 缺失、manifest
  shard 与 data shards 校验通过时恢复 current assets。

计划中的 Workbench action：

- `rebuildSynthesisMirror`
- `recoverSynthesisFromMirror`

## Workbench 展示

Topic card 和 topic table 的 Open 操作进入 Topic Detail，而不是 Markdown
reader。Topic Detail 使用结构化研究工作台布局：

- 主阅读区：以左侧竖向 tabs 切换 Overview、Claims、External Literature、
  Coverage & Gaps。正文区域优先服务长文本阅读，避免把 synthesis prose 压成
  过矮的摘要条。
- 右侧：Evidence Explorer 常驻全高显示，并允许横向调整宽度；默认宽度为
  360px，最小宽度为 300px。
- 底部：水平 timeline 常驻主阅读区底部。Timeline 使用单轨水滴图钉 marker；
  图钉表示库内 paper 或 topic-level event/phase。密度较低时显示短 paper code，
  密度较高时隐藏 code，但保留 hover tooltip 和可访问标签。

Timeline marker 表示库内 paper 或 topic-level event/phase。Hover 显示标题、
年份和证据摘要。Click 打开临时 modal。Modal 默认展示由 host 通过
`paper_evidence.digest_ref` 解析出的原始 `digest-markdown` 工件原文，而不是
topic-local summary。Modal 同时展示相关 claims、citation context、source
freshness 和 Open Zotero Item action。

Modal 打开流程：

```text
click timeline marker
  -> web panel sends open paper digest action(topicId, paperRef/evidenceId)
  -> host reads structured topic artifact
  -> host resolves paper_evidence.digest_ref
  -> host reads current digest-markdown payload
  -> host compares current hash with digest_ref.payload_hash
  -> web panel renders digest markdown modal
```

如果 hash 匹配，modal 直接显示原始 digest。若 hash 不匹配，modal 仍可显示
当前 digest，但必须提示该 digest 已经不同于 synthesis 生成时使用的版本。若
digest 无法解析，modal 显示 unavailable 状态、paper metadata 和 provenance，
不能导致整个 Topic Detail 失败。

External Literature Analysis 是单独章节，展示分析性文字、主题分组、代表性
reference 表和 limitations。

视觉上应保持研究工作台风格：浅色中性背景、高对比文本、蓝色主操作、橙色
仅用于少量提醒；所有可点击元素有 hover/focus 状态，并支持 reduced motion。

Topic Detail 的首版实现应遵循
`artifact/topic_synthesis_detail_design_tokens_20260516.md` 中记录的设计
tokens。关键约束包括：

- 应用背景 `#eef3f8`、面板背景 `#ffffff`、主文本 `#172033`。
- Evidence Explorer 默认宽度 `360px`，可调整范围 `300px` 到 `560px`。
- 底部 timeline 高度 `108px`，时间坐标位于 timeline 基线下方。
- 水滴图钉使用高对比实色蓝：默认填充 `#2563eb`，选中填充 `#1d4ed8`，
  warning 填充 `#d97706`；不使用浅色或白色水滴作为主要状态。
- timeline pin 的校准偏移为 `-12px`，水滴尖端应视觉落在 timeline 基线上。
- 正文字体保持 `13px / 1.5` 的系统 UI 字体，避免在正文 synthesis prose 中使
  用过大的展示字体。

## 兼容边界

`getReviewInput` 继续返回 Markdown，以保证现有 review workflow 不断裂。同
时新增结构化 topic 内容，供后续 review workflow 直接消费 claims、timeline、
paper evidence 和 external literature analysis。

Unified Citation Graph 继续是确定性投影。Topic timeline 是解释性 synthesis
artifact 的内容，不写回 citation graph。

## Runtime Failure 与续跑模型

`create-topic-synthesis` 和 `update-topic-synthesis` 共享的 run-local SQLite DB
是 skill 执行期真源。Agent prompt 记忆、聊天上下文和已渲染临时文件都不能替代
runtime DB 的状态判断。

每个 stage 使用统一状态：

- `pending`
- `running`
- `completed`
- `failed_retryable`
- `failed_terminal`
- `canceled`

执行规则：

- 每个外部动作都必须写入 `action_receipts`，并使用 deterministic action id，
  保证重试和续跑幂等。
- 每次状态写入后必须重新运行 gate；skill 只能执行 gate 返回的 `next_action`。
- resume 时必须从 SQLite DB 重新计算当前 stage 和 next action，不得依赖 prompt
  记忆继续执行。
- 已 materialize 的 section、manifest、Markdown preview 和 final stdout JSON
  都必须进入 `artifact_registry`，记录 path、hash、schema/content type 和生成
  stage。
- final stdout JSON 只允许在 `stage_7_completed` 后输出。
- partial section、partial manifest、未校验 artifact、未登记 artifact registry 的
  文件都不能作为最终 bundle 返回。
- cancellation 输出保持 no-op：`topic_synthesis_canceled`。
- runtime DB schema version 不匹配时必须 terminal fail，不做猜测迁移。
- retryable error 只允许回到当前 stage 的 gate next action；terminal error 不允许
  静默重试或跳 stage。
- `update_patch` 在 runtime 内也必须记录 read sections、replace sections 和
  rendered patch manifest，避免 agent 在最后一步临时拼接 patch 合同。

## 分阶段 Roadmap

这个改动不要一次性横切所有模块。建议按阶段推进，每个阶段都形成可验证的
交付物，上一阶段没有通过时不要进入下一阶段的大范围实现。

### 阶段交付矩阵

| Phase | Goal | Main Deliverables | Required Tests | Exit Criteria | Explicitly Out of Scope |
| --- | --- | --- | --- | --- | --- |
| 0 | 冻结设计与验收边界 | 长设计文档、OpenSpec design/spec/tasks、UI tokens、sync/recovery 和 runtime 边界 | `openspec validate --strict` | 设计工件一致且可执行 | 源码实现、测试实现、UI 代码 |
| 1 | 合同、schema 与红灯测试 | final bundle、section manifest、section patch、current/ directory、mirror safety、runtime gate 测试 | schema / service / runtime tests 先红 | 失败点都是明确缺失行为 | 实现业务逻辑、真实 UI |
| 2 | Package-local runtime 与 skill 拆分 | 中文 create/update skill、包内 SQLite stages、renderer | runtime gate、SQLite、renderer tests | run workspace 能产出 manifest/stdout | canonical persistence、Zotero mirror |
| 3 | Host persistence | v2 `current/` 写入、section patch apply、host-rendered export、metadata/index | applyResult、conflict、non-overlap patch tests | current state 可读且 hash 一致 | recovery、完整 Topic Detail UI |
| 4 | Mirror/recovery 做实 | shard envelope、manifest shard、rebuild/recover、path safety | mirror/recovery/security smoke tests | 可重建完整当前态 | graph/layout/history/run workspace 同步 |
| 5 | Update intent 与 job-time context | `TopicUpdateIntent`、预填 workflow、`get_topic_context`、digest resolver DTO | UI model / MCP context tests | 用户只填简单参数，job context 完备 | 改 synthesis 合同、复杂 UI |
| 6 | Topic Detail UI | 左侧 tabs、主阅读区、右侧 Evidence Explorer、底部 timeline、digest modal | UI model/render tests + object-detection fixture review | 真实体量可读、可滚动、交互可用 | 修改底层持久化/skill 合同 |
| 7 | Review input 与回归收口 | Markdown compatibility、structured review input、回归测试 | build + workflow/UI/review/integration tests | 回归通过，可进入实现归档/发布前检查 | 新能力扩张 |

### Phase 0：冻结设计与验收边界

目标：把结构化 artifact、Topic Detail UI、sync/recovery、skill runtime 的设计
边界全部落盘，避免实现阶段继续扩大范围。

交付物：

- OpenSpec delta specs 与长设计文档保持一致。
- Topic Detail design tokens 已固定为首版 UI 实现基线。
- 明确本次 skill instruction 使用中文重写，机器字段保持英文。
- 明确 Zotero note shards 同步完整当前态，但不同步 graph/layout、历史版本和
  conflict candidates。

验收：

- `openspec validate redesign-topic-synthesis-structured-artifact --strict`
  通过。

Phase 0 handoff state：

- OpenSpec artifacts 已完整创建：proposal、design、delta specs、tasks。
- 严格校验通过：`openspec validate redesign-topic-synthesis-structured-artifact --strict`。
- Phase 1 边界已冻结：下一阶段只写合同、schema、service/runtime/UI model 的红灯
  测试，不进入业务逻辑、真实 UI 或 runtime 正文实现。
- Topic Detail design tokens 已作为 Phase 6 UI 实施输入，而不是 Phase 0 未完成项。

### Phase 1：合同、schema 与红灯测试

目标：先把结构化合同和运行时边界写成测试，避免后续实现靠 UI 观察判断正确性。

交付物：

- section manifest / section patch / final bundle schema tests。
- structured artifact validator tests：claims、timeline events 必须引用库内
  `paper_evidence`。
- language propagation tests。
- `paper_evidence.digest_ref` locator tests，禁止嵌入完整 digest 正文。
- sync foundation tests：`asset_id`、`asset_path`、`content_type`、manifest shard。
- runtime gate / SQLite / renderer 的最小红灯测试。

验收：

- 相关测试先失败在明确断言上，而不是编译错误或缺失 import。

### Phase 2：共享 Topic Synthesis Runtime 与中文 Skill 拆分

目标：先让 create/update skill 有稳定的 run-local 执行骨架，但暂不写入正式
canonical assets。

交付物：

- 为 `create-topic-synthesis` 与 `update-topic-synthesis` 分别提供包内
  `gate_runtime.py`、`stage_runtime.py`、`runtime_db.py`、schemas、templates、
  references。
- 拆分 `create-topic-synthesis` 与 `update-topic-synthesis`。
- 两个 skill 的 `SKILL.md` 用中文重写。
- Runtime 支持阶段：
  `stage_0_bootstrap`、`stage_1_topic_intent`、`stage_2_resolver`、
  `stage_3_paper_workset`、`stage_4_per_paper_analysis`、
  `stage_5_cross_paper_synthesis`、`stage_6_render_and_validate`、
  `stage_7_completed`。
- Renderer 从 SQLite 渲染 section JSON、section manifest、Markdown export 和
  final stdout JSON。

验收：

- create skill 能从 seed 走到完整 section manifest。
- update skill 能从 topic context 走到 `update_full` 或 `update_patch`。
- gate 能阻止跳过 resolver、paper workset、per-paper analysis 和 render validate。

### Phase 3：Host Persistence 与结构化 canonical assets

目标：让 plugin host 正式接收 runtime 产物，并把结构化 artifact 作为 UI 真源。

交付物：

- applyResult 读取 `analysis_manifest_path` 和 section files；`markdown_path` 仅
  作为 create / update_full 的可选 run-workspace 预览输入。
- create / update_full 组装完整 canonical structured artifact。
- update_patch 读取 current manifest/sections，执行 read-set CAS，替换 section，
  校验完整 materialized artifact 后再写 current。
- Host 在完整 materialized artifact 后统一渲染 canonical `current/export.md`。
- 持久化 v2 `current/manifest.json`、`current/sections/*.json`、
  `current/artifact.json`、`current/metadata.json`、`current/export.md` 与
  metadata/index hash。
- 旧 Markdown-only topic 标记为 `legacy_invalid` / `needs_recreate`，不做
  fallback 读取或批量迁移。

验收：

- structured hash、markdown hash、paper count、external literature count、
  language、coverage summary 正确进入 metadata/index-facing rows。
- base hash conflict 仍保存 local conflict candidate，不覆盖 current。

### Phase 4：Synthesis Mirror 与恢复做实

目标：把 Zotero anchor/note shard 从“概念镜像”变成可重建当前态的同步镜像。

交付物：

- 修复 Zotero note shard 创建，不再依赖 invalid note `title` field。
- shard envelope 和 manifest 增加 `asset_id`、`asset_path`、`content_type`。
- mirror payload 扩展为完整当前态：state assets + active topic `current/`
  assets。
- 写入 manifest shard。
- 实现 `rebuildMirrorFromCanonical()`。
- 实现 confirmed `recoverCanonicalFromMirror({ confirm: true })`。
- graph/layout 不进入 shards，恢复后作为可重建投影处理。

验收：

- 已有 anchor 无 shards / mirror degraded 时，可由 Workbench action 触发 rebuild。
- canonical root 缺失且 valid shards 存在时，可确认恢复 current assets。
- canonical root 存在时禁止 recover 覆盖。

### Phase 5：Update Intent、上下文预填与 MCP 能力

目标：让 update-topic-synthesis 的用户入口简单，但 job-time context 完备。

交付物：

- `TopicUpdateIntent` 从 freshness、coverage、stale reasons、dirty reasons 派生。
- topic row 显示 Update / Complete / Repair/Rebuild。
- workflow submit dialog 只预填 `topicId`、`language`、`updateScope`、
  `updateMode`、`updateReason`。
- `synthesis.get_topic_context` 返回 current artifact、metadata、resolver、
  resolved paper set、base hashes、freshness 和 `recommended_update`。
- 支持 paper digest locator 解析 DTO，供 Topic Detail modal 使用。

验收：

- stale/incomplete/dirty topic 的 action 和 recommended update 稳定可测。
- update skill 不需要用户手工传旧 artifact 正文或 stale reason 明细。

### Phase 6：Topic Detail UI 与交互展示

目标：把结构化 topic artifact 变成 Workbench 主展示，而不是 Markdown reader。

交付物：

- Topic card/table 主打开动作进入 structured Topic Detail。
- 主阅读区左侧 tabs：Overview、Claims、External Literature、Coverage & Gaps。
- 右侧可调宽 Evidence Explorer。
- 底部水平 timeline，使用 design tokens 中的水滴图钉和时间坐标。
- Hover marker 显示 title/year/evidence summary。
- Click marker 打开临时 modal，并通过 host 解析原始 `digest-markdown`。
- External Literature Analysis 以分析叙述 + themes + representative references 表展示。
- Markdown export/copy 保留为 secondary action。

验收：

- 真实 object-detection topic 体量下布局可读、可滚动、无明显遮挡。
- digest source hash mismatch 时 modal 能提示 source changed。
- legacy Markdown-only topic 不进入 v2 Topic Detail，只显示 needs-recreate 提示。

### Phase 7：Review Input、回归与发布前收口

目标：保证已有 review workflow、MCP、dashboard/synthesis workspace 不被新结构打断。

交付物：

- `getReviewInput` 继续提供 Markdown 字段。
- 同时暴露 structured topic artifact 内容，供未来 review workflow 使用。
- 更新 MCP review input tests。
- 补齐 synthesis tab UI、workflow contract、integration、Zotero runtime smoke 测试。

验收：

- `npm run build`
- `npm run test:node:core -- --grep "Synthesize topic workflow contract"`
- `npm run test:node:core -- --grep "Synthesis tab UI"`
- `npm run test:node:core -- --grep "Synthesis review input"`
- integration tests covering applyResult、topic snapshot rows、mirror rebuild/recover。

### 阶段依赖

```text
Phase 0
  -> Phase 1
  -> Phase 2
  -> Phase 3
  -> Phase 4
  -> Phase 5
  -> Phase 6
  -> Phase 7
```

Phase 4 可以在 Phase 3 的 canonical asset 写入路径稳定后并行开发一部分
foundation code，但 mirror payload 实现必须使用已冻结的
`topics/<topicPathId>/current/` active topic current asset 路径。
Phase 6 依赖 Phase 3 的 Topic Detail DTO 和 Phase 5 的 digest locator host action。
