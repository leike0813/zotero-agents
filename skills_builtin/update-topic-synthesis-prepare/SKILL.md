---
name: update-topic-synthesis-prepare
description: 为更新主题综合运行准备当前主题上下文、resolver、文献工作集和分析上下文。
---

<!-- 本文件由 skills_src/topic-synthesis 生成，请勿手工修改。 -->

# 更新主题综合准备

## 范围

为更新主题综合运行准备当前主题上下文、resolver、文献工作集和分析上下文。

本包由 `skills_src/topic-synthesis/` 生成。执行时以包内 `SKILL.md`、
`scripts/` 和 `assets/schemas/` 作为当前技能的执行合同。

## 产品目标与质量标准

Topic Synthesis 是 Zotero 中的信息密集型 topic 知识窗口，也是 Introduction / Related Work 等写作 workflow 的上游证据材料。它的目标不是字段填空，也不是把论文摘要拼在一起，而是帮助用户理解一个 topic 的概念边界、研究路线、历史沿革、主要结论、争议、缺口、库内覆盖状态、库外补充方向和综述写作角度。

本技能的最低质量目标：

- topic context 必须忠实保留 Host 返回的 topic id、definition、hashes、section hashes 和 recommended_update。
- update assessment 只判断当前 update scope，说明 full/patch/unknown 的原因和 changed sections。
- resolver proposal 仍要服务既有 topic 的边界，不能把 create duplicate check 逻辑套到 update。
- update path 当前保持 skeleton 边界：只写本 skill schema 接受的准备 payload，不承诺后续完整 update runtime 已实现。

## 必需运行输入

- runtime/input.json

## 执行合同

- `scripts/gate.py` 是唯一面向执行代理的 CLI。
- 不要直接调用 `scripts/topic_synthesis_db.py`。
- 不要传入 stage 名称或 action 名称。
- 命令型 stage 只执行 gate 返回 JSON 的 `command` 字段，不写 JSON payload。
- payload 型 stage 需要把一个 JSON payload 写入 gate 指定的 `payload_path`，
  然后用 gate 返回 JSON 的 `submit_command` 提交。
- gate 返回的 `command` / `submit_command` 是执行真源；本文档中的命令模板只用于解释等价形态。

## zotero-bridge CLI 使用说明

在 ACP run workspace 中优先使用工作区注入的 Host Bridge shim；只有 shim 不存在时才回退到环境中的裸命令 `zotero-bridge`。不要把插件内部 binary 路径写入 payload、日志或最终产物。

本说明中的 `<zotero-bridge>` 表示以下解析顺序：

1. Windows：如果存在 `.\.zotero-bridge\bin\zotero-bridge.cmd`，使用它。
2. POSIX：如果存在 `./.zotero-bridge/bin/zotero-bridge`，使用它。
3. 如果工作区没有注入 shim，才使用裸命令 `zotero-bridge`。

需要确认 Host Bridge 状态时先运行：

```bash
<zotero-bridge> status
<zotero-bridge> manifest
```

本 suite 的 agent-authored payload stage 只需要这些 Host read 命令：

```bash
<zotero-bridge> synthesis list-topics --input '{}'
<zotero-bridge> synthesis get-topic-context --input '{"topicId":"<topic_id>"}'
<zotero-bridge> synthesis get-library-index --input '{"cursor":0,"limit":200}'
```

Stage 20 payload 提交后，resolver、citation metrics 和 filtered artifact export 由 runtime 调用 Host Bridge cascade 完成；agent 不要手写 resolver result、metrics manifest 或 artifact manifest。

如果工作区 shim 和裸命令都不可用、capability missing 或返回非零退出码，不要伪造 Host 数据，也不要切换到 MCP。当前 payload stage 可以在 `diagnostics` 中记录不可用原因；如果无法继续满足当前 skill output contract，则停止并输出 gate/error 指定的合法 JSON。

## 运行状态

- SQLite 是 stage state、receipt、artifact registry 和 handoff registry 的真源。
- 跨 skill 业务状态来自 SQLite 与 handoff/files，不从 prompt 文本传递。
- 命令型入口 stage 负责处理本包的 runtime 初始化或状态校验。

## LLM 与脚本职责边界

必须由 LLM 完成：

- 读取 Host topic context 后写 update scope 判断。
- resolver proposal 设计。
- per-paper triage：relevance、quality、core_digest、caveats、diagnostics。

必须由脚本/runtime 完成：

- 初始化或校验 SQLite、stage state、action receipts、artifact registry 和 hashes。
- 执行 resolver cascade：`resolve-resolver`、citation metrics、filtered artifact export。
- 校验并登记 update topic context、resolver proposal 和 paper triage payload。
- 生成 cross-paper context、external-literature context、source evidence index 和 prepare handoff；深度 update diff/patch 语义后续单独完善。

绝对禁止：

- 手写 SQLite rows、hashes、handoff manifest 或 runtime-owned files。
- 用临时脚本生成语义分析 payload。
- 把 citation metrics 或外部文献当作 core claim/timeline 的主 evidence。
- 修改 gate 返回的 command 或 submit command 来跳 stage。

## 阶段循环

1. 运行 gate，读取返回 JSON。
2. 只处理返回 JSON 中的当前 `stage`，不得跳 stage。
3. command stage 执行返回 JSON 的 `command` 字段。
4. payload stage 先按返回 JSON 的 `required_reads` 获取材料，再写 `payload_path`，最后执行 `submit_command`。
5. 每次 command 或 submit 成功后，都必须重新运行 gate。
6. gate 返回 `stage: "completed"` 时，输出其中的 `output` 对象作为本技能结果。

## 严格执行顺序

每个 stage 都按 gate JSON 驱动执行。不要根据记忆跳 stage。

初始 gate：

```bash
python scripts/gate.py --db "runtime/topic-synthesis.sqlite"
```

如果 gate 返回 `needs_payload: false`：

1. 确认 `stage` 是当前 `SKILL.md` 中的本地 stage。
2. 复制并执行 gate JSON 的 `command` 字段。
3. 等价命令模板是：

```bash
python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action run
```

4. 命令成功后，立刻重新运行初始 gate。

如果 gate 返回 `needs_payload: true`：

1. 确认 `stage` 是当前 `SKILL.md` 中的本地 stage。
2. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
3. 按本 stage 的“上下文获取方式”执行 Host read 命令或读取 runtime 文件。
4. 只手写 `payload_path` 指向的 JSON payload，不写 runtime-owned 文件。
5. 复制并执行 gate JSON 的 `submit_command`。
6. 等价命令模板是：

```bash
python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action submit --payload "<payload_path>"
```

7. submit 成功后，立刻重新运行初始 gate。

## 阶段

### stage_00_runtime_setup

- stage 类型：command
- 任务：初始化或校验更新运行的本地 SQLite 状态。
- 语义目标：让 runtime 锁定合法 ACP run workspace、初始化 SQLite，并把后续 stage 交给 gate 状态机。

本 stage 精确执行序列：

1. 在 ACP run workspace 中运行 gate：`python scripts/gate.py --db "runtime/topic-synthesis.sqlite"`。
2. 确认 gate JSON 的 `stage` 是 `stage_00_runtime_setup`。
3. 确认 `needs_payload` 是 `false`。
4. 复制并执行 gate JSON 的 `command` 字段；等价模板是 `python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action run`。
5. command 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 确认当前目录是本次 ACP run workspace，SQLite 路径使用 gate 返回的 `db_path`。
2. 只执行 gate 返回的 command；这个 stage 不写 payload。
3. 命令成功后重新运行 gate，读取下一个 stage 指令。

质量检查：

- 不要手写 SQLite、receipt、artifact registry、hash 或 handoff。
- 不要把 prompt 里的历史状态当作真源；以 SQLite 和已登记文件为准。

常见错误：

- 不要在非 ACP run workspace 中尝试修补 Host Bridge artifact export。
- 不要跳过 setup 直接写 Stage 10 payload。

### stage_10_update_topic_context

- stage 类型：payload
- 任务：读取当前主题上下文，并编写紧凑的更新判断。
- 语义目标：读取既有 topic 状态并判断本次更新应是 full update、patch update 还是暂时不确定。

本 stage 精确执行序列：

1. 在 ACP run workspace 中运行 gate：`python scripts/gate.py --db "runtime/topic-synthesis.sqlite"`。
2. 确认 gate JSON 的 `stage` 是 `stage_10_update_topic_context`。
3. 确认 `needs_payload` 是 `true`。
4. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
5. 按下面的“上下文获取方式”取得材料，只写当前 stage payload。
6. 手写且只手写 `runtime/payloads/update-topic-context.json`；不要写 runtime-owned 文件。
7. 复制并执行 gate JSON 的 `submit_command`；等价模板是 `python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action submit --payload "<payload_path>"`。
8. submit 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 从 `runtime/input.json` 找到目标 topic id；执行 topic context Host read command。
2. 读取返回的 topic definition、当前 artifact hashes、section hashes 和 recommended_update。
3. 判断哪些 section 需要重算或补充，写入 `changed_sections`。
4. 把判断写入 `payload_path`，再使用 gate 返回的 submit command 提交。

上下文获取方式：

- Host read：`<zotero-bridge> synthesis get-topic-context --input '{"topicId":"<topic_id>"}'`。用途：获取既有 topic 的当前定义、section hashes、artifact hashes 和推荐更新信息。
  说明：`<topic_id>` 来自 `runtime/input.json` 或 gate/input payload；不要自行发明 topic id。

材料使用说明：

- topic context 是既有 topic 的当前状态，不是新建 topic seed。
- payload 路径：runtime/payloads/update-topic-context.json
- schema 文件：assets/schemas/stage-10-update-topic-context.schema.json

字段说明：

- `topic_context`：保留 Host 给出的 topic id、definition、hashes、section hashes 和 recommended_update；不要自行发明 hash。
- `update_assessment`：说明 operation、changed_sections 和选择理由。
- `diagnostics`：记录 Host context 缺字段、hash 不完整、更新范围不明确等诊断。

质量检查：

- update path 当前仍是 split suite skeleton；只写当前 schema 接受的判断，不承诺后续完整 update workflow。
- 不要把 create 的 duplicate check 逻辑套到 update topic context。

常见错误：

- 不要删除或改写 Host 提供的 topic_id。
- 不要把 `unknown` 当作成功更新策略，只在证据不足时使用。

Payload JSON 示例：

```json
{
  "topic_context": {
    "topic_id": "existing-topic-id",
    "topic_definition": {
      "title": "DETR-style Object Detection"
    },
    "current_hashes": {},
    "section_hashes": {},
    "recommended_update": {}
  },
  "update_assessment": {
    "operation": "update_full",
    "changed_sections": ["taxonomy", "claims"],
    "reason": "当前 topic context 显示核心分析 sections 需要重新生成。"
  },
  "diagnostics": []
}
```

### stage_20_resolver_and_workset

- stage 类型：payload
- 任务：编写 resolver proposal；后续由 runtime 执行 resolver、图谱查询和 artifact 准备。
- 语义目标：设计紧凑 resolver proposal；runtime 负责 resolver、citation metrics 和 filtered artifact export cascade。

本 stage 精确执行序列：

1. 在 ACP run workspace 中运行 gate：`python scripts/gate.py --db "runtime/topic-synthesis.sqlite"`。
2. 确认 gate JSON 的 `stage` 是 `stage_20_resolver_and_workset`。
3. 确认 `needs_payload` 是 `true`。
4. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
5. 按下面的“上下文获取方式”取得材料，只写当前 stage payload。
6. 手写且只手写 `runtime/payloads/resolver-and-workset.json`；不要写 runtime-owned 文件。
7. 复制并执行 gate JSON 的 `submit_command`；等价模板是 `python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action submit --payload "<payload_path>"`。
8. submit 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 执行 library index Host read command，必要时按返回 cursor 分页。
2. 从 library index 中识别 topic seed 对应的关键词、标签、citekey 或 paper_refs。
3. 优先写能复现的 resolver 条件；只有已有明确文献集合时才使用 explicit `paper_refs`。
4. 用 `resolver_reasoning` 说明为什么这个 resolver 能覆盖 topic 边界。
5. 提交后由 runtime 写 resolver result、metrics、artifact manifests 和 workset。

上下文获取方式：

- Host read：`<zotero-bridge> synthesis get-library-index --input '{"cursor":0,"limit":200}'`。用途：读取 Synthesis sidecar cache 的文库索引，用于设计 resolver proposal。
  说明：如果返回 has_more/next_cursor，按同一 input shape 继续分页；该命令只辅助 resolver 设计，不代表 resolver result。

材料使用说明：

- library index 用于设计 resolver，不要从中手写 resolver result。
- payload 路径：runtime/payloads/resolver-and-workset.json
- schema 文件：assets/schemas/stage-20-resolver-and-workset.schema.json

字段说明：

- `resolver`：Host Bridge resolver input proposal；必须有 `mode`，并包含 `query` 或 `paper_refs`。
- `resolver_reasoning`：说明检索条件、边界和可能遗漏，不写跨文献结论。
- `operation_intent`：create prepare 使用 `create`；update prepare 可使用 `update_full` 或 `update_patch`。
- `diagnostics`：记录 library index 为空、标签歧义、显式 paper_refs 不完整等情况。

质量检查：

- resolver 要服务 topic 边界，而不是最大化召回所有相邻文献。
- 不要写 runtime 会生成的 resolver result、citation metrics 或 artifact manifest。

常见错误：

- 不要把 paper title 列表伪造成 resolver output。
- 不要在 resolver stage 做 paper triage。

Payload JSON 示例：

```json
{
  "resolver": {
    "mode": "tag_query",
    "query": {
      "and": ["object-detection", "detr"]
    }
  },
  "resolver_reasoning": "该标签组合面向 DETR-family 目标检测论文，同时避开泛 transformer 论文。",
  "operation_intent": "create",
  "diagnostics": []
}
```

### stage_30_prepare_analysis_context

- stage 类型：payload
- 任务：为已解析的文献工作集编写轻量 paper triage 判断。
- 语义目标：为 resolver workset 中每篇文献写 paper-local triage，给后续 runtime context selection 提供可靠输入。

本 stage 精确执行序列：

1. 在 ACP run workspace 中运行 gate：`python scripts/gate.py --db "runtime/topic-synthesis.sqlite"`。
2. 确认 gate JSON 的 `stage` 是 `stage_30_prepare_analysis_context`。
3. 确认 `needs_payload` 是 `true`。
4. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
5. 按下面的“上下文获取方式”取得材料，只写当前 stage payload。
6. 手写且只手写 `runtime/payloads/prepare-analysis-context.json`；不要写 runtime-owned 文件。
7. 复制并执行 gate JSON 的 `submit_command`；等价模板是 `python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action submit --payload "<payload_path>"`。
8. submit 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 读取 runtime 导出的 filtered paper artifacts。
2. 每篇 resolved paper 写一条 assessment；判断只限该 paper 与 topic 的关系。
3. 用 `core_digest` 提炼该 paper 对 topic window 的贡献。
4. 提交后由 runtime 生成 cross-paper context、external-literature context、source evidence index 和 prepare handoff。

上下文获取方式：

- Runtime read：`runtime/views/filtered-paper-artifacts/`。来源：Stage 20 submit 的 runtime resolver cascade。用途：读取每篇 resolved paper 的过滤后 digest、references 和 citation-analysis，用于 paper-local triage。

材料使用说明：

- `runtime/views/filtered-paper-artifacts/` 中的 digest/references/citation-analysis 是判断依据；不要依赖大段附件路径。
- payload 路径：runtime/payloads/prepare-analysis-context.json
- schema 文件：assets/schemas/stage-30-prepare-analysis-context.schema.json

字段说明：

- `assessments`：一篇 resolved paper 一条 assessment，`paper_ref` 必须来自当前 workset。
- `relevance_level`：`core` 是主题核心证据；`related` 是相关背景或变体；`external` 主要用于覆盖/补充判断；`irrelevant` 是误召回；`unknown` 是材料不足。
- `relevance_reason`：说明该 paper 与 topic 边界的关系。
- `paper_quality_level`：评价可用证据质量，不等于引用量排序。
- `paper_quality_reason`：说明实验、方法、综述、benchmark 或证据完整性。
- `core_digest`：一到三句说明该 paper 对 topic 的贡献，保持 paper-local。
- `caveats`：记录训练效率、实验范围、artifact 缺失、适用边界等限制。
- `diagnostics`：记录 artifact 缺失、无法判断、疑似误召回等诊断。

质量检查：

- triage 阶段只抽取单篇事实，不写 taxonomy、timeline、claim 或 gaps。
- 每条 assessment 要能支撑后续 context selection。

常见错误：

- 不要使用旧单体 paper-triage wrapper；当前 payload 顶层必须是 `assessments`。
- 不要手写 source evidence ids、hashes 或 evidence refs。

Payload JSON 示例：

```json
{
  "assessments": [
    {
      "paper_ref": "1:DETR2020",
      "relevance_level": "core",
      "relevance_reason": "该论文把 object-query set prediction 建立为本 topic 的基线公式。",
      "paper_quality_level": "high",
      "paper_quality_reason": "该论文给出模型公式，并提供支撑该路线的 benchmark evidence。",
      "core_digest": "提出面向目标检测的 transformer-based set prediction，使 object queries 与 bipartite matching 成为后续 DETR-family 工作的核心概念。",
      "caveats": ["训练效率限制会影响后续改进工作的解释方式。"],
      "diagnostics": []
    }
  ]
}
```

## 输出合同

本技能输出一个用于 `prepare_analysis_context` 的 `topic_synthesis_handoff` JSON 对象。

- 返回对象必须符合 `assets/output.schema.json`。
- handoff manifest path 和 hash 用来标识本 skill 的持久化输出。
- 大段正文、业务状态和 hashes 仍以 SQLite 与文件为真源。

## 失败规则

- 如果 gate 返回 error JSON，停止当前技能。
- 不要手动修改 SQLite。
- 不要手动生成由 runtime 管理的 hashes。
- 不要绕过 `gate.py` 调用内部 helper。
- 不要基于旧字段、旧 stage 或历史路径猜测恢复方式。
