---
name: create-topic-synthesis-prepare
description: Prepare the context for create topic synthesis workflow. Use this skill when user wants to create a new topic. DO NOT invoke unless you can access to the Zotero library through zotero-bridge CLI.
---

<!-- 本文件由 skills_src/topic-synthesis 生成，请勿手工修改。 -->

# 创建主题综合准备

## 范围

Prepare the context for create topic synthesis workflow. Use this skill when user wants to create a new topic. DO NOT invoke unless you can access to the Zotero library through zotero-bridge CLI.

本包由 `skills_src/topic-synthesis/` 生成。执行时以包内 `SKILL.md`、
`scripts/` 和 `assets/schemas/` 作为当前技能的执行合同。

## 产品目标与质量标准

Topic Synthesis 是 Zotero 中的信息密集型 topic 知识窗口，也是 Introduction / Related Work 等写作 workflow 的上游证据材料。它的目标不是字段填空，也不是把论文摘要拼在一起，而是帮助用户理解一个 topic 的概念边界、研究路线、历史沿革、主要结论、争议、缺口、库内覆盖状态、库外补充方向和综述写作角度。

本技能的最低质量目标：

- topic intent 必须把 seed 转成稳定 topic identity：标题、别名、定义、纳入/排除范围都要能指导 resolver。
- duplicate check 只基于 Host topic list 中现有 topic 的 title、description、aliases 和 id，不能把宽泛相关主题误判为同一主题。
- resolver proposal 要可复现、边界清楚；runtime 负责执行 `resolvers resolve`、citation metrics 和 filtered artifact export，LLM 不手写 resolver result。
- 远程 SkillRunner profile 下 filtered artifact export 可能返回 bridge-download；按 runtime 写出的 `runtime/payloads/paper-artifacts-export-delivery.json` 执行 downloadCommand/unpackHint 后再继续。
- paper triage 必须保持 paper-local，为每篇 resolved paper 给出 relevance、quality、core_digest 和 caveats，不提前写跨文献综合。

## 必需运行输入

- .audit/<skill-namespace>/input_manifest.json
- runtime/input.json（兼容旧执行器，可选）

## 执行合同

- `scripts/gate.py` 是唯一面向执行代理的 CLI。
- 不要直接调用 `scripts/topic_synthesis_db.py`。
- 不要传入 stage 名称或 action 名称。
- 命令型 stage 只执行 gate 返回 JSON 的 `command` 字段，不写 JSON payload。
- payload 型 stage 需要把一个 JSON payload 写入 gate 指定的 `payload_path`，
  然后用 gate 返回 JSON 的 `submit_command` 提交。
- gate 返回的 `command` / `submit_command` 是执行真源；本文档中的命令模板只用于解释等价形态。

## zotero-bridge CLI 使用说明

Host Bridge CLI 的完整命令映射由内置 `zotero-bridge-cli` wrapper skill 维护。
使用 Zotero host 能力前，先阅读该 wrapper skill 及其生成的
`references/host-bridge-cli.md` 参考。

<!-- host-bridge-surface:topic-synthesis-fragment:start -->

Host Bridge CLI 使用说明由内置 `zotero-bridge-cli` wrapper skill 维护。
当前 topic synthesis 相关命令族摘要：`citation-graph get-layout`, `citation-graph get-metrics`, `citation-graph get-slice`, `citation-graph overview`, `citation-graph query-cluster`, `citation-graph rank-external-references`, `citation-graph rank-library-papers`, `citation-graph refresh-metrics`, `insights attention-queue`, `library-index get`, `paper-artifacts export-filtered`, `paper-artifacts manifest`, `paper-artifacts read`, `paper-artifacts resolve-topic-digest`, `reference-index get`, `resolvers resolve`, `topics find-by-paper-ref`, `topics get-context`, `topics get-report`, `topics get-review-input`, `topics list`。
使用 Host Bridge 能力前，先读取该 wrapper skill 及其 `references/host-bridge-cli.md` 生成映射参考。
不要绕过 Host Bridge 直接读取 Zotero DB/storage；除非用户明确要求 MCP 诊断，否则不要切换到 MCP。

<!-- host-bridge-surface:topic-synthesis-fragment:end -->

在 ACP run workspace 中，优先使用工作区注入的 Host Bridge shim：

- Windows：`.\.zotero-bridge\bin\zotero-bridge.cmd`
- POSIX：`./.zotero-bridge/bin/zotero-bridge`

只有找不到 workspace shim 时，才使用裸命令 `zotero-bridge`。无论使用哪种入口，
都只能通过 Host Bridge 合同读取 Zotero 数据；不要直接读取 Zotero DB/storage，
也不要在用户未要求 MCP 诊断时切换到 MCP。

## 运行状态

- SQLite 只保存 stage state 和必要的跨 stage 上下文。
- 跨 skill 业务状态来自 SQLite 与 handoff/files，不从 prompt 文本传递。
- 命令型入口 stage 负责处理本包的 runtime 初始化或状态校验。

## LLM 与脚本职责边界

必须由 LLM 完成：

- create topic intent 和 duplicate check 判断。
- resolver proposal 设计。
- per-paper triage：relevance、quality、core_digest、caveats。

必须由脚本/runtime 完成：

- 初始化 SQLite 和 stage state。
- 执行 resolver cascade：`resolvers resolve`、citation metrics、filtered artifact export。
- 远程 Host Bridge export 返回 bridge-download 时，写出 `runtime/payloads/paper-artifacts-export-delivery.json` 并要求 agent 执行 downloadCommand/unpackHint。
- 校验 create topic context、resolver proposal 和 paper triage payload。
- 生成 cross-paper context、external-literature context、source evidence index 和 prepare handoff。

绝对禁止：

- 手写 SQLite rows、handoff manifest 或 runtime-owned files。
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

先从运行器提供的 run workspace 启动 gate。不要 `cd` 到 skill package；
不要自行拼接 `runtime/topic-synthesis.sqlite`。gate JSON 返回的 `db_path`、
`command`、`submit_command` 和 runtime 文件路径是执行真源。

如果 gate 返回 `needs_payload: false`：

1. 确认 `stage` 是当前 `SKILL.md` 中的本地 stage。
2. 复制并执行 gate JSON 的 `command` 字段。
3. 命令成功后，立刻重新运行初始 gate。

如果 gate 返回 `needs_payload: true`：

1. 确认 `stage` 是当前 `SKILL.md` 中的本地 stage。
2. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
3. 按本 stage 的“上下文获取方式”执行 Host read 命令或读取 runtime 文件。
4. 只手写 `payload_path` 指向的 JSON payload，不写 runtime-owned 文件。
5. 复制并执行 gate JSON 的 `submit_command`。
6. submit 成功后，立刻重新运行初始 gate。

## 阶段

### stage_00_runtime_setup

- stage 类型：command
- 任务：初始化或校验新建运行的本地 SQLite 状态。
- 语义目标：让 runtime 锁定合法 ACP run workspace、初始化 SQLite，并把后续 stage 交给 gate 状态机。

本 stage 精确执行序列：

1. 在运行器提供的 run workspace 中启动 gate；不要 `cd` 到 skill package，不要自行拼接 `runtime/topic-synthesis.sqlite`。
2. 确认 gate JSON 的 `stage` 是 `stage_00_runtime_setup`。
3. 确认 `needs_payload` 是 `false`。
4. 复制并执行 gate JSON 的 `command` 字段。
5. command 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 确认当前目录是本次 ACP run workspace，SQLite 路径使用 gate 返回的 `db_path`。
2. 只执行 gate 返回的 command；这个 stage 不写 payload。
3. 命令成功后重新运行 gate，读取下一个 stage 指令。

质量检查：

- 不要把 prompt 里的历史状态当作真源；以 SQLite 和已登记文件为准。

常见错误：

- 不要在非 ACP run workspace 中尝试修补 Host Bridge artifact export。
- 不要跳过 setup 直接写 Stage 10 payload。

### stage_10_create_topic_context

- stage 类型：payload
- 任务：编写新建主题意图和重复检查判断。
- 语义目标：把 topic seed 转成稳定、可查重、可解析的创建意图。

本 stage 精确执行序列：

1. 在运行器提供的 run workspace 中启动 gate；不要 `cd` 到 skill package，不要自行拼接 `runtime/topic-synthesis.sqlite`。
2. 确认 gate JSON 的 `stage` 是 `stage_10_create_topic_context`。
3. 确认 `needs_payload` 是 `true`。
4. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
5. 按下面的“上下文获取方式”取得材料，只写当前 stage payload。
6. 手写且只手写 `runtime/payloads/create-topic-context.json`；不要写 runtime-owned 文件。
7. 复制并执行 gate JSON 的 `submit_command`。
8. submit 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 执行 topic list Host read command，读取现有 topic 的 title、description、aliases 和 id。
2. 用 topic title、aliases、definition 和 scope 明确主题边界。
3. 只根据已有 topic 的 title、description、aliases 判断重复风险。
4. 把判断写入 `payload_path`，再使用 gate 返回的 submit command 提交。

上下文获取方式：

- Host read：`<zotero-bridge> topics list --input '{}'`。用途：获取现有 topic 列表，用于 create duplicate check。
  说明：只根据返回 topic 的 title、description、aliases 和 id 判断是否同一主题；不要把相关主题直接判为 duplicate。

材料使用说明：

- topic list 只用于重复检查，不用于扩写最终综述。
- payload 路径：runtime/payloads/create-topic-context.json
- schema 文件：assets/schemas/stage-10-create-topic-context.schema.json

字段说明：

- `topic_title`：稳定、简短、适合作为 topic identity 的标题；不要写成问题句或临时搜索词。
- `aliases`：常见缩写、别名或同义主题名；没有时写空数组。
- `definition`：说明主题研究对象、核心问题和边界。
- `scope_include`：明确纳入的技术路线、任务、方法族或评价对象。
- `scope_exclude`：容易混淆但不属于本 topic 的邻近主题。
- `duplicate_status`：`none` 表示未发现重复；`possible_duplicate` 表示需谨慎；`duplicate` 表示已有同一主题；`unknown` 表示材料不足。
- `duplicate_candidate_ids`：只填写 Host topic list 中真实存在的候选 id。
- `duplicate_reason`：说明重复判断依据，不能只写“相似”。

硬性约束：

- 如果 `duplicate_status` 为 `duplicate`，这是 create prepare 的硬门禁失败：不要提交 resolver/workset 或任何后续 payload，不进入 Stage 20。
- 硬门禁失败时直接输出符合 `assets/output.schema.json` 的 `topic_synthesis_canceled` 最终业务对象，包含 `status: "canceled"`、`reason: "duplicate_topic"`、`message`、`topic_seed`，并在可确定时填 `duplicate_topic_id`；sequence runtime 会据此短路后续 steps。

质量检查：

- topic boundary 要能指导 resolver 设计。
- 重复判断要保守，不能把宽泛相关主题误判为同一 topic。

常见错误：

- 不要把 topic seed 原样复制成 definition。
- 不要引用尚未 resolver 的论文作为创建依据。

Payload JSON 示例（可提交结构样例）：

```json
{
  "topic_title": "DETR-style Object Detection",
  "aliases": ["DETR", "DETR-family detectors"],
  "definition": "继承 DETR 集合预测公式、object queries 和 transformer decoder 匹配机制的 query-based 目标检测方法族。",
  "scope_include": [
    "目标检测中的集合预测",
    "object queries",
    "DETR 收敛与 query 设计变体"
  ],
  "scope_exclude": ["通用 NLP transformer", "非检测任务的 vision transformer"],
  "duplicate_status": "none",
  "duplicate_candidate_ids": [],
  "duplicate_reason": "现有 topic 的标题和别名中没有表示同一 DETR-style object detection 方法族的条目。"
}
```

### stage_20_resolver_and_workset

- stage 类型：payload
- 任务：编写 resolver proposal；后续由 runtime 执行 resolver、图谱查询和 artifact 准备。
- 语义目标：设计紧凑 resolver proposal；runtime 负责 resolver、citation metrics 和 filtered artifact export cascade。

本 stage 精确执行序列：

1. 在运行器提供的 run workspace 中启动 gate；不要 `cd` 到 skill package，不要自行拼接 `runtime/topic-synthesis.sqlite`。
2. 确认 gate JSON 的 `stage` 是 `stage_20_resolver_and_workset`。
3. 确认 `needs_payload` 是 `true`。
4. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
5. 按下面的“上下文获取方式”取得材料，只写当前 stage payload。
6. 手写且只手写 `runtime/payloads/resolver-and-workset.json`；不要写 runtime-owned 文件。
7. 复制并执行 gate JSON 的 `submit_command`。
8. submit 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 执行 library index Host read command，必要时按返回 cursor 分页。
2. 从 library index 中识别 topic seed 对应的关键词、标签、citekey 或 paper_refs。
3. 优先写能复现的 resolver 条件；可用 `tag`、`collection_key`、`paper_refs` 单独或组合查询。
4. `combine` 默认 `union`，用于扩大召回；需要收窄到同时满足多个 selector 类型时，显式使用 `combine: intersection`。
5. 用 `resolver_reasoning` 说明为什么这个 resolver 能覆盖 topic 边界。
6. 提交后由 runtime 写 resolver result、metrics、artifact manifests 和 workset。
7. 远程 SkillRunner profile 下，filtered artifact export 可能返回 `delivery.mode="bridge-download"`；如果 submit 报 remote export delivery required，读取 `runtime/payloads/paper-artifacts-export-delivery.json`，执行其中的 `delivery.downloadCommand`，按 `delivery.unpackHint` 解包到 run workspace，再重新运行 gate/submit。

上下文获取方式：

- Host read：`<zotero-bridge> library-index get --input '{"cursor":0,"limit":200}'`。用途：读取 Synthesis sidecar cache 的文库索引，用于设计 resolver proposal。
  说明：如果返回 has_more/next_cursor，按同一 input shape 继续分页；该命令只辅助 resolver 设计，不代表 resolver result。

材料使用说明：

- library index 用于设计 resolver，不要从中手写 resolver result。
- payload 路径：runtime/payloads/resolver-and-workset.json
- schema 文件：assets/schemas/stage-20-resolver-and-workset.schema.json

字段说明：

- `resolver`：Host Bridge raw resolver payload；至少包含 `tag`、`collection_key`、`paper_refs` 之一，可选 `combine: union|intersection`。
- `resolver_reasoning`：说明检索条件、边界和可能遗漏，不写跨文献结论。
- `operation_intent`：create prepare 使用 `create`。

质量检查：

- resolver 要服务 topic 边界，而不是最大化召回所有相邻文献。
- 不要写 runtime 会生成的 resolver result、citation metrics 或 artifact manifest。
- 不要手写或猜测下载包内的 paper artifact manifest；只使用 Host Bridge 返回的 `delivery.downloadCommand` 和 `unpackHint`。

常见错误：

- 不要把 paper title 列表伪造成 resolver output。
- 不要在 resolver stage 做 paper triage。

Payload JSON 示例（可提交结构样例）：

```json
{
  "resolver": {
    "tag": {
      "and": ["object-detection", "detr"]
    },
    "combine": "union"
  },
  "resolver_reasoning": "该标签组合面向 DETR-family 目标检测论文，同时避开泛 transformer 论文。",
  "operation_intent": "create"
}
```

### stage_30_prepare_analysis_context

- stage 类型：payload
- 任务：为已解析的文献工作集编写轻量 paper triage 判断。
- 语义目标：为 resolver workset 中每篇文献写 paper-local triage，给后续 runtime context selection 提供可靠输入。

本 stage 精确执行序列：

1. 在运行器提供的 run workspace 中启动 gate；不要 `cd` 到 skill package，不要自行拼接 `runtime/topic-synthesis.sqlite`。
2. 确认 gate JSON 的 `stage` 是 `stage_30_prepare_analysis_context`。
3. 确认 `needs_payload` 是 `true`。
4. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
5. 按下面的“上下文获取方式”取得材料，只写当前 stage payload。
6. 手写且只手写 `runtime/payloads/prepare-analysis-context.json`；不要写 runtime-owned 文件。
7. 复制并执行 gate JSON 的 `submit_command`。
8. submit 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 先读取 `runtime/payloads/paper-artifacts-manifest-batch-1.json`。
2. 按 manifest 中每篇 paper 的 `artifacts[].content_file` 读取 digest、references 和 citation-analysis；当前 artifact 文件通常位于 `runtime/payloads/artifacts/`。
3. 逐篇阅读 digest、references 和 citation-analysis；每次判断只面向当前 paper。
4. 如果使用 subagent，先按 paper_ref 分配 artifacts，收回 assessment row 草案后由主 agent 统一检查并合并。
5. 按 gate 指令和 runtime audit 判断需要 triage 的 paper refs；create 通常覆盖所有 resolved papers，update 使用 gate 暴露的 `triage_required_refs`。
6. update 的 `triage_required_refs` 来自 updated resolver refs 与 saved triage refs 的覆盖缺口，不只是 resolver diff 中的 added refs。
7. 如果 update 没有可复用 triage，gate 会要求对 updated resolve 中全部 papers 写 assessment。
8. 每条 assessment 判断只限该 paper 与 topic 的关系。
9. 用 `core_digest` 提炼该 paper 对 topic window 的贡献。
10. 提交后由 runtime 根据 triage、filtered digest、references、citation-analysis 和 citation graph metrics 生成 cross-paper context、external-literature context、context manifest、source evidence index 和 prepare handoff。

上下文获取方式：

- Runtime read：`runtime/payloads/paper-artifacts-manifest-batch-1.json`。来源：Stage 20 submit 的 runtime resolver cascade。用途：读取每篇 resolved paper 的 artifact manifest，并按 `content_file` 定位 digest、references 和 citation-analysis。
- Runtime read：`runtime/payloads/artifacts/`。来源：Stage 20 submit 的 runtime resolver cascade。用途：读取 manifest 指向的过滤后 digest、references 和 citation-analysis，用于 paper-local triage。

材料使用说明：

- `runtime/payloads/paper-artifacts-manifest-batch-1.json` 是 artifact 索引真源；具体文件以每条 artifact 的 `content_file` 为准。
- `runtime/payloads/artifacts/` 中的 digest/references/citation-analysis 是判断依据；不要依赖大段附件路径。
- LLM 不手写 cross-paper context 或 external-literature context；这些 view 必须由 runtime 从已校验输入生成。
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

硬性约束：

- paper triage 必须由 LLM 逐篇阅读 runtime 导出的 paper artifacts 后手写判断；不得编写或运行脚本来批量抽取、归纳、评分或生成 `assessments`。
- 脚本只能执行 gate 返回的 runtime command；Stage 30 payload 的 relevance、quality、core_digest 和 caveats 必须来自 LLM 对单篇材料的判断。

Subagent 委派建议：

当 workset 包含多篇文献且执行环境支持 subagent 时，推荐把 paper triage 按 paper_ref 分批委派给 subagent；每个 subagent 只处理分配到的单篇或少量文献，主 agent 负责汇总为一个 `assessments[]` payload。

- 每个 subagent 只能读取分配给它的 paper artifact 和当前 topic context，不做跨文献综合。
- subagent 只返回 assessment row 草案，不写文件、不运行脚本、不调用 gate。
- 主 agent 必须检查每个 row 的 paper_ref、枚举值、理由和 core_digest，再写入 `runtime/payloads/prepare-analysis-context.json`。

委派 prompt 模板：

```text
你是 topic synthesis Stage 30 的 paper triage subagent。请只处理下面分配给你的 paper_ref 和对应 artifact 内容。

任务边界：
- 逐篇阅读分配的 digest、references 和 citation-analysis。
- 只判断该 paper 与当前 topic 的关系，不做跨文献综合。
- 不编写或运行脚本，不写文件，不调用 gate。
- 只返回 JSON 数组；数组中的每个对象必须是一个 assessment row。

当前 topic：
<topic_definition_or_scope>

分配的 paper artifacts：
<paper_ref_to_artifact_excerpt_or_path>

输出字段：
- paper_ref：必须使用分配给你的 paper_ref。
- relevance_level：core / related / external / irrelevant / unknown。
- relevance_reason：说明该 paper 与 topic 边界的关系。
- paper_quality_level：high / medium / low / unknown。
- paper_quality_reason：说明证据质量。
- core_digest：一到三句 paper-local 贡献摘要。
- caveats：数组，记录证据限制或适用边界。
```

质量检查：

- triage 阶段只抽取单篇事实，不写 taxonomy、timeline、claim 或 future directions。
- 每条 assessment 要能支撑后续 context selection。
- 不要把 references 或 citation-analysis 内容复制进 `core_digest`；runtime 会把它们分流到 external-literature context。

常见错误：

- payload 顶层必须是 `assessments`。

Payload JSON 示例（可提交结构样例）：

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
      "caveats": ["训练效率限制会影响后续改进工作的解释方式。"]
    }
  ]
}
```

## 输出合同

本技能正常输出一个用于 `prepare_analysis_context` 的 `topic_synthesis_handoff` JSON 对象；硬门禁或取消路径输出一个 `topic_synthesis_canceled` JSON 对象。

- 返回对象必须符合 `assets/output.schema.json`。
- 正常 handoff 输出的 handoff manifest path 用来标识本 skill 的持久化输出。
- canceled 输出必须包含 `status: "canceled"`、稳定 `reason` 和用户可读 `message`；workflow sequence 会把该 step output 作为最终结果并停止后续 steps。
- 大段正文和业务状态以 SQLite 与 runtime 文件为真源。

## 失败规则

- 如果 gate 返回 error JSON，停止当前技能。
- 不要手动修改 SQLite。
- 不要绕过 `gate.py` 调用内部 helper。
- 只依据 gate JSON、当前 stage 指令和当前 runtime 文件判断恢复方式。
