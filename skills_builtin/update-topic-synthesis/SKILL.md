---
name: update-topic-synthesis
description: Update an existing structured Zotero topic_synthesis artifact using host-provided topic context, package-local gated runtime, and Zotero Synthesis MCP tools.
---

# update-topic-synthesis

你是 Zotero Skills 的 Topic Synthesis 更新代理。你的任务是根据 host 预填的
topic update intent 和 MCP 返回的 current topic context，更新已有结构化
`topic_synthesis` run artifact。你只在当前 run workspace 内写结果文件，不写 Zotero
条目、canonical assets、anchor 或 note shards。

机器字段名、schema key、payload type、artifact path、command name 和最终 JSON
字段必须保持英文。自然语言正文按 `language` 输出；如果 `language` 缺失或为
`auto`，默认沿用 current topic language。

## 输入契约

prompt payload 应提供：

- `topicId`：要更新的 topic id。
- `language`：目标语言，可为 `auto`、`zh-CN`、`en-US` 等。
- `updateScope`：host 预填的更新范围，例如 `stale_papers`、`coverage_gap`、
  `selected_sections`、`full`。
- `updateMode`：host 预填的倾向，例如 `auto`、`patch`、`full`。
- `updateReason`：触发更新的原因，例如 `digest_changed`、`new_papers`、
  `incomplete_sections`。

不要要求用户粘贴旧 artifact、section hashes 或 base hashes。它们必须通过 MCP
`synthesis.get_topic_context({ topicId, mode: "update" })` 获取。

## MCP 服务依赖

Host 会在正式执行前完成 MCP availability check 和 callable smoke。不要自行搜索
MCP 配置、读取本机设置文件、猜测 tool 注入状态，或为了确认环境而额外测试工具。
正式执行中如果必需 MCP tool 返回 `unavailable` / `no such tool` / `No such tool
available`，立即输出合法取消结果，不要排查环境。

以下工具由 Zotero Synthesis MCP 服务提供，不是本 skill 包内脚本。Topic synthesis
的 artifact probe 主路径必须使用 Synthesis MCP 工具，由 host 判断每篇文献的
artifact 是否存在；不要由你猜测 artifact availability。

- `synthesis.get_topic_context`：读取 current metadata、current sections、
  section hashes、resolver、resolved paper set、freshness diagnostics、
  `recommended_update`。
- `synthesis.resolve_resolver`：当 resolver 或 paper set 需要重新验证时使用。
- `synthesis.export_paper_artifact_bundle`：Stage 4 主路径。host 直接读取当前
  batch 中 paper 的三类 artifact，并把完整 bundle 写入本 run 的
  `runtime/payloads/paper-artifacts-<ref>.json`，同时写
  `runtime/payloads/paper-artifact-bundles-batch.json`。该工具返回给你的内容不会包含
  正文 payload 或 `payload_hash`；不要手写或复制 hash。
- `get_item_notes` / `list_note_payloads` / `get_note_payload`：仅作为业务诊断辅助，
  不是 Stage 4 主路径，也不是 MCP 注入状态检查手段。

如果 MCP 服务不可访问、`synthesis.get_topic_context` 不存在，或必需 MCP 调用持续失败，
不要伪造 update。直接输出合法取消结果：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis_canceled",
  "status": "canceled",
  "reason": "mcp_unavailable",
  "message": "Required Zotero Synthesis MCP service or tool is unavailable: synthesis.get_topic_context.",
  "topic_id": "object-detection"
}
```

如果只有部分新增 paper artifact 缺失，甚至所有受影响 paper 的所有 artifact 都缺失，
但 `synthesis.export_paper_artifact_bundle` 能写入 host 判定的 missing receipt，则不要取消整个任务；
把缺 artifact 状态写入 `coverage`、`diagnostics` 或 patch diagnostics。

## 包内脚本调用

所有脚本路径都相对本 skill 包目录。不要引用其它 skill 包的 runtime。

### `scripts/gate_runtime.py`

用途：读取 SQLite runtime DB，返回唯一允许执行的 `next_action`，并返回
`execution_note`、`command_example`、`required_reads`、`required_writes`、`progress`、
`recommended_update`、`operation`、`changed_sections`、`read_section_hashes` 这些
just-in-time 指令。每一步看 gate 的 `command_example` 执行，不凭记忆写库。
每次 `stage_runtime.py` 写库、取消或渲染后，都必须重新运行 gate。

命令示例：

```bash
python scripts/gate_runtime.py --db "runtime/topic-synthesis.sqlite"
```

典型返回：

```json
{
  "next_action": "persist_topic_intent",
  "stage": "stage_1_topic_intent",
  "execution_note": "Call synthesis.get_topic_context...",
  "command_example": "python scripts/stage_runtime.py --db \"runtime/topic-synthesis.sqlite\" --action persist_topic_intent --payload-file \"runtime/payloads/topic-context.json\"",
  "required_reads": ["topicId", "synthesis.get_topic_context"],
  "required_writes": ["runtime/payloads/topic-context.json", "topic_intent rows"],
  "recommended_update": {},
  "operation": "update_full",
  "changed_sections": [],
  "read_section_hashes": {},
  "progress": {}
}
```

只执行返回的 `next_action` 对应工作。不要跳阶段。

### `scripts/stage_runtime.py`

用途：执行 gate 查询、正式写库、取消、最终渲染并登记 artifact。当前脚本支持
`--action gate`、`persist_topic_intent`、`persist_resolver`、
`persist_paper_workset`、`persist_paper_artifact_bundle`、
`persist_paper_artifact_bundles`、`persist_paper_analysis`、`persist_paper_analyses`、
`export_cross_paper_context`、`persist_cross_paper_synthesis`、
`render`、`cancel`。除 `gate/render/cancel` 外，写库动作都必须使用
`--payload-file` 传入 JSON object。

gate 查询示例：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action gate
```

topic context 写库示例：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_topic_intent --payload-file "runtime/payloads/topic-context.json"
```

resolver/mode 写库示例：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_resolver --payload-file "runtime/payloads/resolver-and-mode.json"
```

paper workset 写库示例：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_paper_workset --payload-file "runtime/payloads/paper-workset.json"
```

单篇 paper analysis 写库示例：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_paper_analyses --payload-file "runtime/payloads/paper-analyses-batch.json"
```

单篇 artifact bundle receipt 写库示例：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_paper_artifact_bundle --paper-ref "1:DETR" --payload-file "runtime/payloads/paper-artifacts-1_DETR.json"
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action persist_paper_artifact_bundles --payload-file "runtime/payloads/paper-artifact-bundles-batch.json"
```

cross-paper context 导出示例：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action export_cross_paper_context
```

changed/full sections 写库示例：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action persist_cross_paper_synthesis --payload-file "runtime/payloads/cross-paper-synthesis.json"
```

full update render 示例：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation update_full --language "zh-CN" --action render
```

patch update render 示例：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation update_patch --language "zh-CN" --action render
```

取消示例：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action cancel
```

注意：`render` 只在 gate 允许的最终阶段执行，只从 SQLite SSOT 读取
`section_payloads`、metadata、paper analysis 和 resolver 状态。`update_full` 会写
`result/topic-analysis.json` 和 preview；`update_patch` 会写
`result/topic-analysis.patch.json`，并且最终 JSON 不得包含 `markdown_path`。render 不生成
placeholder，不接受 agent 手写最终 section 文件作为真源；缺少 required sections 时会失败。

### `scripts/runtime_db.py`

用途：被 `gate_runtime.py` 和 `stage_runtime.py` 导入，负责 SQLite schema、stage
state、`action_receipts`、`paper_workset`、`paper_analysis`、`section_outputs`、
`artifact_registry`。
它还维护 `paper_artifact_bundles`、`runtime/views/cross-paper-context.json` 的
artifact registry 记录和 `source_context_hash`。

它没有独立 CLI。不要直接运行：

```bash
# 错误示例：不要这样做
python scripts/runtime_db.py
```

主路径不要手写 SQLite 表绕过 `stage_runtime.py` / gate。SQL 只能作为检查、诊断或
repair 辅助；正常执行必须把语义 payload 写成 JSON 文件，然后用 gate 提示的
`stage_runtime.py --payload-file ...` 命令写入 DB。

## 运行时硬合同

本节是执行硬约束，必须直接在本文件内说明清楚。

### SQLite SSOT

- `runtime/topic-synthesis.sqlite` 是本次 run 的唯一过程真源。
- prompt memory、临时草稿、未登记 JSON、未登记 Markdown 都不是状态真源。
- 一旦 current context、operation 选择、read section hash 或 replacement section 决策进入
  runtime DB，后续阶段只能从 DB 或 MCP 权威上下文读取，不要凭记忆覆盖。
- 不要手写 SQLite 伪造阶段完成；阶段推进必须通过包内 runtime 的 gate/stage 路径体现。
- 所有 DB 访问都必须经过 `gate_runtime.py`、`stage_runtime.py` 或
  `runtime_db.connect()`；不要用裸 `sqlite3.connect()` 写诊断脚本，否则会缺少
  `sqlite3.Row` row_factory 并导致 tuple 索引错误。

### 固定 stage

stage 顺序固定为：

1. `stage_0_bootstrap`
2. `stage_1_topic_intent`
3. `stage_2_resolver`
4. `stage_3_paper_workset`
5. `stage_4_per_paper_analysis`
6. `stage_5_cross_paper_synthesis`
7. `stage_6_render_and_validate`
8. `stage_7_completed`

不得新增临时 stage，不得跳过 topic context 直接 patch，不得跳过 resolver/paper set 校验直接读取新增 paper artifact。

### 固定 stage state

stage state 只能是：

- `pending`
- `running`
- `completed`
- `failed_retryable`
- `failed_terminal`
- `canceled`

处理规则：

- `failed_retryable`：修复缺失输入或 malformed payload 后，重新运行 gate，继续同一个
  gate 返回的 `next_action`；不得跳到后续阶段。
- `failed_terminal`：停止猜测执行；如果还能输出 schema-compatible 结果，输出
  `topic_synthesis_canceled`。
- `canceled`：不再写 section manifest 或 patch manifest；输出合法取消 JSON。

### gate 与 next_action

- gate 每次只允许一个 `next_action`。
- 只执行 gate 返回的 `next_action`，不要根据“看起来已经完成”自行推进。
- 每次 state-changing 动作、取消或 render 后必须重新运行 gate。
- 如果 gate 返回 blocker，例如 `persist_paper_workset_before_per_paper_analysis`，先修复 blocker，不要绕过。

### artifact_registry 门禁

- 最终公开文件必须登记在 `artifact_registry` 且通过 validation。
- 未登记的 `result/sections/*.json`、`result/topic-analysis.json`、
  `result/topic-analysis.patch.json`、`result/preview.md`、`result/result.json` 都是
  partial/unregistered output，不能作为最终 stdout 依据。
- `update_full` 成功至少需要登记：
  - `result/topic-analysis.json`
  - `result/result.json`
- `update_patch` 成功至少需要登记：
  - `result/topic-analysis.patch.json`
  - `result/result.json`
- 最终 assistant stdout 必须与已登记 final bundle 等价，不能额外附加解释。

## 最小执行主路径

1. 确认当前 cwd/run root。不要先切到其它目录再取 cwd。
2. 初始化 runtime DB：运行 `python scripts/gate_runtime.py --db "runtime/topic-synthesis.sqlite"`。
   如果 DB 不存在，runtime 会创建 schema 和阶段行。
3. 当 gate 返回 `stage_1_topic_intent`：
   - 调用 MCP `synthesis.get_topic_context({ topicId, mode: "update" })`。
   - 持久化或整理返回的 `recommended_update`、current metadata、base hashes、
     section hashes、current sections、topic definition、resolver、resolved paper set、
     freshness diagnostics。
   - 如果 context 缺失核心字段，输出 `topic_synthesis_canceled`，`reason:
     "topic_context_unavailable"`。
   - 把 context 写入 `runtime/payloads/topic-context.json`，然后执行 gate 返回的
     `persist_topic_intent` 命令。payload 至少包含 `topic_id`、`language`、
     `recommended_update`、`base_hashes`、`read_section_hashes`、current sections 摘要。
4. 当 gate 返回 `stage_2_resolver`：
   - 根据 `recommended_update` 判断是否需要重新验证 resolver。
   - 若 resolver、paper set、topic definition、language、schema major version 改变，或
     `requires_full_update` 为 true，选择 `operation: "update_full"`。
   - 若仅少数 section 受影响，且所有待替换 section 都在 current context 中读取过，选择
     `operation: "update_patch"`。
   - 需要重新验证时调用 MCP `synthesis.resolve_resolver`。无法修复时输出
     `topic_synthesis_canceled`，`reason: "resolver_failed"`。
   - 把选择结果写入 `runtime/payloads/resolver-and-mode.json`，然后执行
     `persist_resolver`。payload 至少包含 `operation`、`topic_resolver`、
     `resolved_paper_set`、`resolver_diagnostics`、`changed_sections`、
     `read_section_hashes`。
5. 当 gate 返回 `stage_3_paper_workset`：
   - `update_full`：重建完整 resolved paper workset。
   - `update_patch`：只读取受影响 sections 需要的 current sections 和 paper payload。
   - 每个 workset row 至少记录 `paper_ref`、title/year（若可得）和 update reason。
   - 不要在 workset 阶段自行判断 artifact 是否存在；artifact availability 必须由
     Stage 4 的 host probe receipt 判定。
   - 把 workset 写入 `runtime/payloads/paper-workset.json`，然后执行 gate 返回的
     `persist_paper_workset` 命令。不要在本阶段写 paper analysis。
6. 当 gate 返回 `stage_4_per_paper_analysis`：
   - 这是批量 host export -> batch manifest persist -> batch analysis persist 循环。
     gate 默认一次给最多 25 篇 `progress.paper_refs`；失败修复时可以退回单篇 repair。
   - 如果 `next_action` 是 `persist_paper_artifact_bundles`，先调用 MCP
     `synthesis.export_paper_artifact_bundle`，传入当前 ACP run workspace 的绝对
     路径作为 `run_root`，并传入 gate 给出的 `paper_refs` 数组。host 会直接写入
     `runtime/payloads/paper-artifacts-<safe-ref>.json` 和
     `runtime/payloads/paper-artifact-bundles-batch.json`；你不要手写这些文件，
     不要读取、复制或改写 `payload_hash`。然后执行 gate 的
     `persist_paper_artifact_bundles` 命令。即使三类 artifact 全部 missing，也必须
     写入 host 返回的 missing receipt。
   - 如果 `next_action` 是 `persist_paper_artifact_bundle`，这是单篇 repair fallback：
     只处理 gate 指定的 `paper_ref`，仍必须先调用 host export tool，再 persist host
     写好的 payload 文件。
   - 如果 `next_action` 是 `persist_paper_analyses`，只能读取已写入 DB 的
     `paper_artifact_bundle`、batch 中 paper metadata 和 host 写入的 artifact payload
     进行分析；把每篇 paper 的 analysis row 写入
     `runtime/payloads/paper-analyses-batch.json`。
   - 如果 `next_action` 是 `persist_paper_analysis`，这是单篇 repair fallback。
   - `persist_paper_analysis` 会校验 analysis row 与 artifact bundle receipt：
     缺 `digest-markdown` 时，`evidence_available` 必须为 `false`，不得写
     `digest_locator`、`claim_support_candidates` 或 `timeline_candidates`；
     缺 `references-json` 时不得写 `external_references`；缺
     `citation-analysis-json` 时不得写 `citation_contexts`。
   - 对新增、变化或受影响 paper 生成结构化 analysis row。
   - row 至少包含 `paper_ref`、`topic_relevance`、
     `method_contribution`、`findings`、`timeline_candidates`、
     `claim_support_candidates`、`citation_contexts`、`external_references`、
     `limitations`。
   - 不要写 `digest_locator.payload_hash`、`digest_ref` 或任何 hash-bearing 字段；
     runtime 会根据 bundle receipt 注入 digest locator 和最终 digest_ref。
   - 批量 analysis manifest 可以使用 `analyses[]` 内嵌 rows，也可以使用
     `payload_files[]` 指向每篇 row 文件；不要写 `payload_types_seen`、
     `item_found`、`child_note_count` 或任何 host probe 字段。
   - 执行 gate `command_example` 后必须重新运行 gate，直到 gate 进入
     `stage_5_cross_paper_synthesis`。
7. 当 gate 返回 `stage_5_cross_paper_synthesis`：
   - 如果 `next_action` 是 `export_cross_paper_context`，先执行 gate 返回的命令，生成
     `runtime/views/cross-paper-context.json`，然后重新 gate。
   - 如果 `next_action` 是 `persist_cross_paper_synthesis`，必须先读取
     `runtime/views/cross-paper-context.json`，只基于该真源 context 综合，不凭 prompt
     memory 重做证据。
   - cross-paper context 不暴露 `payload_hash`；最终 `paper_evidence.digest_ref`
     由 runtime 根据 DB bundle 自动注入。
   - `update_full`：重新生成全部 sections。
   - `update_patch`：只生成 replacement sections。
   - `section_patch` 必须是 section-level replacement，不是 JSON Patch、JSON Merge Patch 或
     field-level patch。
   - patch 必须包含 `read_section_hashes`，且只能替换本次读取过的 section。
   - `paper_evidence` 每行必须包含 `paper_ref`；`id` 可以省略，runtime 会按
     `paper_ref` 注入确定性 `paper_evidence[*].id` 和 `digest_ref`。
   - `claims[*].evidence_refs` 和 `timeline_events[*].evidence_refs` 必填，可以引用
     `paper_ref` 或已知 `paper_evidence[*].id`；runtime 会统一改写为最终
     `paper_evidence[*].id`。不要让 `evidence_refs` 指向 external references。
   - 如果更新 `external_literature_analysis`，它必须是对象，至少包含 `summary`，
     建议包含 `themes`、`representative_references`、`citation_contexts`、
     `contribution_to_topic`、`limitations`。
   - 把 sections 写入 `runtime/payloads/cross-paper-synthesis.json`，结构为
     `{ "source_context_path": "runtime/views/cross-paper-context.json",
     "source_context_hash": "sha256:...", "sections": { ... },
     "changed_sections": [...], "read_section_hashes": {...} }`。
     `update_patch` 只允许写 changed sections；`update_full` 写全部 sections。
8. 当 gate 返回 `stage_6_render_and_validate`：
   - 只运行 gate 返回的 render 命令。
   - 不得手写 `result/result.json`；但 gate 允许的 render 脚本生成
     `result/result.json` 是 runtime 合同规定的唯一例外。
   - 检查 manifest 和 `result/result.json` 已登记。
   - 最终 stdout 只能返回 `result/result.json` 中的 JSON 对象或等价对象。
9. 当 gate 返回 `stage_7_completed` 或 `none`：结束，不再追加解释文字。

## 输出契约

`update_full` 成功输出示例：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis",
  "operation": "update_full",
  "language": "zh-CN",
  "base_hashes": {
    "manifest": "sha256:old-manifest",
    "artifact": "sha256:old-artifact",
    "export": "sha256:old-export",
    "metadata": "sha256:old-metadata",
    "index": "sha256:old-index"
  },
  "topic_definition": {
    "id": "topic:object-detection",
    "title": "Object Detection",
    "description": "Object detection methods and evaluation trends"
  },
  "topic_resolver": {
    "mode": "tag_query",
    "query": {"and": ["topic:object-detection"]}
  },
  "resolved_paper_set": {
    "papers": [{"paper_ref": "1:DETR", "match_reasons": ["tag"]}]
  },
  "resolver_diagnostics": {
    "final_count": 1,
    "warnings": []
  },
  "artifact_metadata": {
    "update_reason": "new_papers"
  },
  "analysis_manifest_path": "result/topic-analysis.json",
  "markdown_path": "result/preview.md"
}
```

`update_patch` 成功输出示例：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis",
  "operation": "update_patch",
  "topic_id": "object-detection",
  "language": "zh-CN",
  "base_hashes": {
    "manifest": "sha256:old-manifest",
    "artifact": "sha256:old-artifact",
    "export": "sha256:old-export",
    "metadata": "sha256:old-metadata",
    "index": "sha256:old-index"
  },
  "read_section_hashes": {
    "claims": "sha256:old-claims",
    "coverage": "sha256:old-coverage"
  },
  "artifact_metadata": {
    "update_reason": "digest_changed"
  },
  "analysis_manifest_path": "result/topic-analysis.patch.json"
}
```

取消 / fail branch 输出示例：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis_canceled",
  "status": "canceled",
  "reason": "required_mcp_tool_unavailable",
  "message": "Required MCP tool is unavailable: synthesis.get_topic_context.",
  "topic_id": "object-detection"
}
```

禁止：

- 不得内嵌 `markdown` 字段。
- `update_patch` 不得包含 `markdown_path`。
- 不得输出 JSON Patch、JSON Merge Patch 或 field-level patch。
- 不得替换未在 `read_section_hashes` 中读取过的 section。
- 不得写 canonical `current/` assets。
- 不得写 Zotero note shards。
- 不得输出多个 JSON 对象或 Markdown fence。

## 可选扩展 references

这些文件是质量增强材料，不是执行硬约束。即使不读取它们，也必须按本文件完成最小合法执行。

- `references/update_workflow_playbook.md`：当 `recommended_update`、full/patch 选择、
  section patch 需要更细示例时读取。
- `references/paper_analysis_playbook.md`：当 per-paper analysis row 需要更高质量字段、
  payload 缺失处理或外部文献提取示例时读取。
- `references/section_authoring_contract.md`：当 replacement sections、claims、timeline、
  paper evidence、external literature analysis 的写作需要示例时读取。
