---
name: zotero-librarian
description: 监督常驻 Zotero library。当 Hermes 执行持续监控、维护或 library 问题时使用。
---

# Zotero 图书管理员

## 目标

维护一个可信的 Zotero library 常驻视图，监督一次性的定时与交互操作，呈现可操作的变更并回答 library 问题。把有限研究判断委托给捆绑的 Generic Skills，把精确 Zotero 操作委托给捆绑的 CLI Skill。

## 输入

- 用户请求、随附的 cron 调用或显式 operator 指令。
- 匹配的 `zotero-bridge` 可执行文件、内嵌契约与可用的连接 profile。
- 可选的 `ZOTERO_LIBRARIAN_STATE_DIR`；否则状态位于 `$HERMES_HOME/zotero-librarian/state.sqlite`。
- 对于 workflow 提交：实时 workflow 与选择契约、已审阅的 workflow options、需要时独立校验的 provider profile、显式有界的并发选择，以及当前操作员授权。

## 自然语言输入

假定用户了解其库与研究目标，但不了解常驻服务、cron 布局、原生 workflow queue 或 CLI handle。在选择操作前把请求转化为一个有界的趟。

捕获：

| 槽位 | 含义 |
| --- | --- |
| 结果 | 答案、当前健康报告、较上趟的变化报告、run 监督、维护提案或 workflow 启动 |
| 范围 | 整个库、collection、所选 items、workflow、run、通知集合、Synthesis 队列或具名 maintenance 域 |
| 时间 | 当前一遍读取、与常驻 cache 比较，或已配置的周期性计划 |
| 报告阈值 | 每条观察、仅更改、仅 attention 或仅失败 |
| 交互 | 该趟是否可以询问用户、确认事件，或仅报告 |
| 状态更改 | 仅本地缓存、workflow 提交、Zotero mutation、维护或 apply-back |

路由常见措辞：

| 用户措辞 | 路由 | 必需边界 |
| --- | --- | --- |
| "What papers do I have about X?"（我有哪些关于 X 的论文？） | Generic Query，可选地使用常驻 index 做发现 | 实时证据支撑答案 |
| "我的库有什么变化？" | `index refresh` 加投影比较 | 说明先前/当前刷新边界 |
| “检查 workflows 是否健康” | `run watch` 与 `maintenance workflow-status` | 一趟；不循环等待 |
| “什么需要我注意？” | Notification/维护/Synthesis attention 读取 | Attention 是提案，不是补救 |
| "在这些论文上运行 workflow X" | 交互式 Generic/CLI 验证，然后单独授权的 submit | 实时选择/选项契约、provider 兼容性、有界并发与类型化准入结果 |
| “监视这个 run” | 必要时 `run register`，然后执行一遍 `run watch` | 需要真实的 `workflowRunId` |
| "每小时检查我的 workflows" | 解释计划边界 | Skill 不能创建或修改 cron |
| "Fix duplicates automatically"（自动修复重复项） | Maintenance 提案后接 Generic Curation | 绝不在定时趟中补救 |

当作用域、报告阈值、run/workflow 身份、计划假设、交互或状态变更权限会实质改变这趟扫描时提问。不要问项目内部术语。

安全默认值：

- 执行一遍并退出；
- 保持 Zotero 只读；
- 允许服务更新其本地投影或 journal；
- 报告 attention 而不补救；
- 面向用户的当前事实使用实时 Zotero 证据；
- 保持现有外部计划不变。

workflow 提交、事件确认、mutation、维护、apply-back、破坏性更改或创建/更改计划没有安全默认。

### 计划边界

服务是一遍式的。profile 包含随附的静态 cron 定义，但此 Skill 没有创建、编辑、启用、禁用或重排 cron 的命令。

当用户请求重复行为时：

1. 确定用户想要现在做一次性检查，还是指已配置的计划。
2. 按请求执行一次性遍历。
3. 报告外部调度器会调用哪个常驻操作与报告阈值。
4. 不要声称已安装或更改了节奏。
5. 若需要计划配置，将其作为外部 profile/operator 动作返回。

## 工作流

1. 将请求分类为有限研究任务或常驻操作：index、workflow catalog、被监视 run、notification、maintenance analysis、Synthesis attention 或定时趟。交互式 workflow 提交是有限任务，经 Generic 与 CLI 路由，即使常驻发现证据有助于选择它。
2. 对于有限查询、获取、分析、synthesis、整理或自有 workflow 执行，调用匹配的捆绑 Generic Skill。只添加驻留新鲜度证据；不要复述其 task 策略。
3. 对常驻工作，读取匹配的全面参考，并运行 `scripts/zotero_librarian_service.py` 的一个子命令。每次调用执行一次有界扫描并退出。
4. 仅将 `state.sqlite` 解读为 cache 与日志。在对外的答案、workflow 决策、交互或建议写入之前，通过实时 CLI 契约确认相关 Zotero 对象、workflow、run、permission、notification、Product 或 operation。
5. 对于交互式 Zotero 托管的 workflow，用 Generic 与 CLI 检查实时 workflow 契约，解析并验证确切选择，保持 workflow 选项与 provider-profile 验证分离，并在请求当前操作员授权前呈报已审阅的提交范围及其有界并发。
6. 通过 CLI 汇合点提交一次，并按返回的接纳契约分支。直接接纳时，保留真实的 `workflowRunId`。Host 队列接纳时，保留 `submissionId`，检查其不可变单元投影，仅用 `workflow queue list` 观察活跃队列，仅对待处理单元使用 `workflow queue cancel <queueId>`，并用 `run list --submission` 关联已接纳任务。
7. 返回 `zotero-librarian.operation-receipt.v1` 以及支撑面向用户结论所需的实时证据。遵循失败 receipt 恢复，不重放 submission 或写入。

对于 `index refresh`，让服务拥有整个快照会话与数据库边界。它把每个已接受的页写入非权威的暂存代次，对照那次精确快照校验终态快照完成证据，然后原子地提升该代次。提升成功前，搜索与 item 读取继续使用先前的当前代次。中断、过期、失配、资源受限或重启的快照返回失败且不删除缺席行；开启一次新的完整刷新，而不是恢复或重建旧会话。

## 常驻路由

服务域使用如下：

- `index refresh|search|item|stats` 维护并查询本地库投影；
- `workflow catalog-refresh|show` 维护本地 workflow 发现缓存；
- `run register|watch` 记录已知 workflow runs，并对每个非终态 run 执行一次状态检查；
- `notification sync|inbox|summary|ack` 维护并作用于轻量生命周期收件箱；
- `maintenance workflow-status|library-hygiene` 报告审查候选而不进行补救；
- `synthesis attention-queue` 报告排名的研究 attention，而不修改 Synthesis 状态。

源选择、文献评估、分析、synthesis 解读、策展提案、provider-profile 决策与自有 agent 交接使用 Generic Skills。精确命令 schema、handles、approvals、文件交付与恢复使用 CLI Skill。

对于交互式 Zotero 托管 workflow，用内置 CLI 契约描述并验证实时请求：

```sh
zotero-bridge workflow describe --workflow <workflow-id>
zotero-bridge workflow validate \
  --workflow <workflow-id> --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>'
```

检查返回的选择 refs、分开的 `inputs` 与 `validateSelection` 契约、规范化的 workflow 选项、provider 要求、候选分组与预期 unit/result 身份。通过其自身的 workflow-profile 命令验证任何 provider profile。仅在操作者明确授权该已审查的提交范围后，以所选的有界并发提交一次：

```sh
zotero-bridge workflow submit \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>' \
  --max-concurrency <bounded-count>
```

实时 Host planner 仍负责候选生成、过滤与不可变单元分组。`--max-concurrency` 只约束本次授权提交的原生准入；它不创建驻留 worker、不授权后续提交，也不证明 provider 容量。host 队列响应返回 `submissionId` 与逐单元队列投影，而不是虚构的 run handles。持续检查提交，直到已准入单元暴露真实的 task 或 run 身份，然后使用常规 run 平面进行执行交互、取消与终止证据。

Zotero 的原生队列是待处理 unit 的唯一所有者。待处理 unit 可通过其 `queueId` 取消；一旦准入，取消必须使用其真实 run handle 与常规 run 语义。原生槽位在终态执行与 apply-back 期间保持占用，因此队列的总体完成并不是所请求的 Product、artifact 或 Zotero 变更已存在的证据。必需的 workflow 选项、provider-profile 选择、无选择执行与自有模式使用继承的 Generic workflow 契约。

## 硬性约束

- 绝不直接读取或更改 Zotero 数据库或存储文件。
- 服务执行一次有界遍历，绝不使用通知等待或轮询循环。
- Cron 任务只读，绝不调用任何 workflow 提交命令。
- workflow 提交需要当前显式操作员对已审阅选择、options、provider profile 与有界并发的指令；有效 CLI 参数不替代 Zotero 侧 approval。
- 本地 `state.sqlite` 是唯一的常驻数据库。它不是当前 Zotero 状态的权威。
- 不要把先前的 approval、缓存结果或定时建议变成新写入。
- 在最终报告中保留 item keys、workflow run ID、notification ID、operation ID 与 artifact 引用。
- 在其关联动作处理完之前不要确认 notification；事件文本不是 reply、connect、approve、submit 或 mutate 的许可。
- 不要通过 watched runs 监控自有的 `agentRunId`；将其请求执行、校验、apply-back 与 receipt 恢复委托给 Generic。
- 不要从终态 workflow 状态推断 Product、artifact、item 变更或成功的维护结果。
- 不要自动补救重复、卫生、就绪、workflow 状态或 attention 候选。
- 不要用即席 SQL 或其他辅助修改 `state.sqlite`，也不要用不完整刷新替换可用状态。
- 不要将暂存行、活跃快照页、本地计数器或先前的完成回执当作提升证据。只有当前刷新匹配的 Host 签发终态证据才允许服务提升代次并移除该完整快照中缺席的行；完整的空快照可提升空的当前代次。
- 不要持久化或手工编辑 workflow 提交 payload、创建常驻的待处理 unit 队列、预留原生 unit，或维护重放日志。实时 workflow 验证与原生 submission projection 才是 workflow 控制事实。
- 已审阅的 selection/options/provider/concurrency 范围是输入证据，不是存储的 approval token。每次 submit 调用都需要当前授权。
- 响应不确定的排队提交或已接纳 unit 可能已改变远端状态。在另一次提交前检查原始 `submissionId` 与按 submission 过滤的任务。
- 不要交换 `submissionId`、`queueId` 与 `workflowRunId`。queue 取消只对待处理的 queue unit 有效；已准入工作属于 run 控制面。
- 不要声称服务创建或更改了 cron 计划。

## Receipt 契约

每次服务调用返回一个 `zotero-librarian.operation-receipt.v1` JSON 对象：

- `operation`：有界的 service 动作。
- `status`：`ok`、`unchanged`、`changed`、`attention` 或 `failed`。
- `generatedAt`：receipt 时间。
- `summary`：可选的人类可读边界。
- `data`：特定于操作的 结构化结果。
- `error`：存在于 `failed` 上，带 `code`、`message` 与可选的 `details`。

解释状态：

- `ok`：只读请求成功返回；它不意味着 Zotero 已变更。
- `unchanged`：投影、watch 或同步趟未发现可报告的 delta。
- `changed`：本地常驻状态更改或显式授权的远程操作已启动。
- `attention`：需要审阅，包括不确定的远端效果；它不是补救。
- `failed`：该趟无法完成，不得推断任何成功。

`[SILENT]` 仅在 `--quiet` 抑制 `unchanged` cron 结果时有效。它不是 JSON，不得用于交互式答案。

对于面向用户的结论，添加与论断相称的实时证据。仅凭缓存 receipt 不能证明当前库、workflow、run、Product、operation 或写入状态。

## 完成

当恰好一个有界遍返回有效 receipt、当前事实具有所需的实时确认、attention 有明确的下一个安全检查且未发生未授权或不安全重放时，常驻任务完成。

对于 workflow 提交，交互式准入步骤完成意味着 CLI 结果标识直接准入或保留原生 `submissionId`、unit 计数与 queue 链接。监督完成意味着每个请求的 unit 都有终态原生投影，并且每个已准入 run 的预期结果或失败都已被检查。聚合提交状态或终态 run 状态单独都不意味着所请求的研究输出已完成。

对于库答案，完成意味着继承的 Generic Skill 返回了其业务结果，且常驻 cache 证据仅用于发现或变更比较。

## 常驻报告检查清单

在报告一趟前确认：

- 操作名称与 receipt 状态被保留；
- 当本地发现影响了路由时说明缓存时间；
- 每个当前的 library、workflow、run、notification、Product 或 operation 主张都有实时证据；
- `ok`、`unchanged`、`changed`、`attention` 与 `failed` 按 receipt 契约解释；
- attention 候选不被描述为已确认缺陷或已完成的补救；
- 已启动 runs 不被描述为已完成的研究输出；
- queued、pending、admitted、failed 与 canceled units 在报告中保持可区分；
- 检查其原始 `submissionId` 与关联任务前，不确定的原生提交不得描述为失败或可安全重试；
- 本地文件与数据库路径不超出面向操作者的需求暴露；
- token 与连接秘密不存在；
- 审查仍在进行时点出下一个安全检查。

对交互式答案，陈述：

1. 运行了哪个单趟操作。
2. 哪个本地投影或日志状态改变了。
3. 检查了哪些实时 Zotero 证据。
4. 什么需要关注。
5. 明确未提交、未确认、未变更、未维护或未计划的内容。
6. 另一次趟是否需要新指令。

对于 cron 拥有的输出，只发出服务结果。`[SILENT]` 对 `unchanged` 即完整；不要用会破坏静默运作的解释性消息替换它。

对 Generic 交接，包含稳定 refs、新鲜度、常驻回执与有界研究目标。不要把常驻自动化策略复制进下游任务，也不要把本地缓存行当作其源证据。

## 失败处理

失败时，保留 operation 名称、receipt 错误、当前 submission/queue/run/event handle 与最后可用的本地状态。在重试任何服务支撑的操作前，重新查询受影响的实时资源。通过服务重建损坏的 cache，绝不做局部的 SQL 修复。对于不确定的直接 workflow 提交，在下一次调用前检查当前/最近的 workflow run。对于不确定的原生排队提交，在任何新提交前检查原始 `submissionId`、其不可变 unit 与按 submission 过滤的任务。本地状态失败绝不授权 Zotero mutation。

若 workflow 选择或选项验证失败，保留已审查的 refs 并报告失败；在验证另一次调用前，通过 Generic 获得明确的修正范围。选择基础失败结束该次获取，不完整的存储 ref 仍不可执行；两种失败都不授权从活动窗格替换输入。若 workflow 契约改变，停下并携更改后的要求返回 Generic。若原生单元变得不确定，保留其 `submissionId`、`queueId`、序号、源 refs 与暴露的任务身份，然后在任何新工作前调和该提交与实时 run 状态。

若意外的常驻状态妨碍安全监督，保留状态数据库并在安全处继续只读 operation。常驻状态绝不是原生队列准入的前提，也不得为强行打开提交路径而被删除或重写。

## LLM 与脚本职责

Agent 对工作分类、委派有限的研究任务、判断实时证据、决定何时需要当前的人类确认，并解释 receipts。服务拥有 SQLite schema 创建、常驻读取的有界 CLI 调用、原子的本地投影/journal 更新与 receipt 输出。Zotero 插件拥有原生 workflow 队列准入与待处理单元状态。捆绑的 Generic 与 CLI Skills 拥有研究、交互式提交与确切机制契约。不得在临时 shell、SQL 或 Python 代码中复现服务状态更改。

## 参考

- 在 index、workflow catalog、run、通知、库问题或计划工作之前阅读 [resident operations](references/resident-operations.md)。
- 在 workflow 模式选择、原生 queue 提交、并发、maintenance 建议、确认或任何权限边界之前，阅读 [automation policy](references/automation-policy.md)。
- 在判断时效性、修复本地状态、处理部分/失败 receipt、不确定结果或更改 profile 配置前，阅读[状态与恢复](references/state-and-recovery.md)。

### 连接 profile workspace 路由

- 不要计算或手工传入 workspace 路径。用服务 `--profile`、`ZOTERO_BRIDGE_PROFILE` 或平台 well-known profile 选择连接；常驻服务、cron 与 CLI 安装器共同遵循该选择。
- well-known profile 是默认 workspace，拥有现有的 `$HERMES_HOME/zotero-librarian/state.sqlite`。显式 profile 路由到其规范化路径 `workspaces/<sha256>/` workspace。
- 显式 profile 工作区从不共享 SQLite 行、workflow catalog 条目、被观察的 run、notification 或本地 `.zotero-bridge/bin` 安装。身份不包括 profile JSON 内容、端点值、token 与其他机密。
- 仅对活动工作区内的诊断路径使用 `--db`。将 `workspace_path_outside_profile`、profile 路径失败、不可用根与连接失败当作 fail-closed 错误；不要针对共享/默认路径重试。
- 工作区缓存不是 Zotero 的当前权威。profile 改变时保留现有 approval、队列、receipt、实时状态与当前事实规则。
