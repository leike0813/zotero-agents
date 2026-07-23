---
name: zotero-librarian
description: 监管常驻 Zotero 文献库。Hermes 执行持续监控、维护或文献库问答时使用。
---

# Zotero 驻留文献馆员

## 目标

维护可信的 Zotero 文献库常驻视图，监管单次定时与交互操作，呈现可处理的变化，并回答文献库问题。有边界的研究判断委托给随附 Generic Skills，精确 Zotero 操作委托给随附 CLI Skill。

## 输入

- 用户请求、随附 cron 调用或操作员的明确指令。
- 相匹配的 `zotero-bridge` 可执行文件、内嵌合同及可用连接 profile。
- 可选的 `ZOTERO_LIBRARIAN_STATE_DIR`；否则状态位于 `$HERMES_HOME/zotero-librarian/state.sqlite`。
- 提交工作流时，还需已审阅 plan 的绝对路径及操作员当前授权。

## 自然语言输入理解

假设用户了解他们的文献库和研究目标，但不了解驻留服务、cron布局、计划登记或CLIhandles。在选择操作之前，将请求转换为一次有界传递。

捕获：

|插槽|意义|
| --- | --- |
|结果|答案、当前运行状况报告、自上次通过报告以来的更改、运行监督、维护建议或 workflow 启动|
|范围 |整个库、集合、所选项目、workflow、运行、通知集、Synthesis 队列或命名维护域 |
|时间 |当前的一次性读取、与常驻缓存的比较或已配置的重复计划 |
|举报门槛|每一次观察，只有改变，只有关注，或者只有失败 |
|互动 |单次执行是否可以询问用户、确认事件或仅报告 |
|状态变化 |仅本地缓存、workflow 提交、Zotero 变更、维护或apply-back |

路由常用写法：

|用户措辞 |路线 |所需边界|
| --- | --- | --- |
| “我有什么关于 X 的文件？” | Generic 查询，可选择使用常驻索引进行发现 |活生生的证据支持了答案|
| “我的文献库发生了什么变化？” | `index refresh` 加投影对比 |说明上一个/当前刷新边界 |
| “检查workflows是否健康”| `run watch` 和 `maintenance workflow-status` |一通；没有等待循环|
| “什么需要我注意？” |通知/维护/Synthesis注意阅读 |注意是建议，而不是补救|
| “在这些论文上运行 workflow X” |互动计划再单独授权提交|当前 selection 契约和不可变的计划身份 |
| “监控这次运行” |必要时`run register`，然后通过一个`run watch` |需要真实的`workflowRunId` |
| “每小时检查我的workflows” |解释时间表边界 | Skill 无法创建或修改cron |
| “自动修复重复项” |维护建议Generic 整理|切勿根据定时单次执行进行补救|

询问范围、报告阈值、运行/workflow 身份、计划假设、交互或状态更改权限何时会对单次执行产生重大改变。不要询问项目内部术语。

安全默认值：

- 执行一次并退出；
- 保持 Zotero 只读；
- 允许服务更新其本地投影或日志；
- 报告关注但未采取补救措施；
- 使用当前 Zotero 证据来了解用户面临的当前事实；
- 保持现有的外部时间表不变。

workflow 提交、事件确认、写入变更、维护、apply-back、破坏性更改或创建/更改时间表没有安全默认值。

### 定时调度边界

该服务是一次性的。 profile 包含附带的静态 cron 定义，但此 Skill 没有用于创建、编辑、启用、禁用或重新安排 cron 的命令。

当用户要求重复行为时：

1. 确定他们是否想要立即进行一次性检查或参考已配置的计划。
2. 根据要求执行一次性单次执行。
3. 报告外部调度程序将调用哪个驻留操作和报告阈值。
4. 请勿声称安装或更改了节奏。
5. 如果需要计划配置，请将其作为外部profile/操作员操作返回。

## 工作流

1. 将请求分类为有边界的研究任务，或以下常驻操作之一：index、工作流 catalog/plan/submit、受监控 run、通知、维护分析、Synthesis attention 或定时 pass。
2. 对有边界的查询、获取、分析、综合、整理或 Agent 自主工作流执行，调用相应的随附 Generic Skill。只补充常驻新鲜度证据，不复述其任务政策。
3. 对常驻工作，阅读相应的完整 reference，并运行 `scripts/zotero_librarian_service.py` 的一个子命令。每次调用执行一个有边界的 pass 后退出。
4. 只把 `state.sqlite` 视为缓存和日志。在给出外部可见答案、作出工作流决策、进行交互或提出写入前，通过实时 CLI 合同确认相关 Zotero 对象、工作流、run、permission、通知、Product 或 operation。
5. 对于交互式 Zotero 管理的 workflow，创建一个绝对计划文件，检查其实时合约派生选择 refs、workflow ID、plan ID、digest和条目计数，然后请求该确切的不可变文件的当前操作员授权。
6. 仅提交已注册审核的计划，编号为`--allow-submit`；使用默认并发`1`，除非操作员明确批准更大的有界值。该服务仅启动待处理条目，记录返回的 `workflowRunId` 值，并因不确定的影响而停止。
7. 返回 `zotero-librarian.operation-receipt.v1`，以及支持面向用户结论所需的实时证据。按失败 receipt 的恢复规则处理，不得重放提交或写入。

## 驻留路由

按以下方式使用服务领域：

- `index refresh|search|item|stats` 维护和查询本地文献库 projection；
- `workflow catalog-refresh|show` 维护本地工作流发现缓存；
- `workflow plan|submit` 准备并启动已审阅的 Zotero 托管工作流任务；
- `run register|watch` 记录已知工作流 run，并对每个非终态 run 执行一次状态检查；
- `notification sync|inbox|summary|ack` 维护轻量生命周期 inbox，并对其采取动作；
- `maintenance workflow-status|library-hygiene` 报告审阅候选项，但不执行修复；
- `synthesis attention-queue` 报告排序后的研究关注事项，但不修改 Synthesis 状态。

来源选择、文献评估、分析、综合解释、整理 proposal、provider profile 决策和 Agent 自主 handoff 使用 Generic Skills；精确命令 schema、handle、approval、文件交付与恢复使用 CLI Skill。

对于交互式 Zotero 管理工作流，将已验证计划写入绝对路径：

```sh
scripts/zotero_librarian_service.py workflow plan \
  --workflow <workflow-id> --from-context \
  --output <absolute-plan.json>
```

检查返回的selection ref、输入单元、`planId`、`planDigest`、workflow 合约摘要、条目和绝对计划路径。只有在操作员明确授权启动经过严格审查的计划后，才能提交相同的文件：

```sh
scripts/zotero_librarian_service.py workflow submit \
  --plan <absolute-plan.json> --allow-submit
```

该服务使用 workflow 的当前 selection 契约：attachment workflow 保留选定的附件，parent-item workflow 将子项规范化为父项，不支持的选择/选项/provider要求将被拒绝进行Generic 处理。该计划为每个经过验证的选择记录一个条目和`defaultConcurrency: 1`。 `workflow submit --concurrency <n>` 在当前通道中最多启动指定数量的 pending 条目并报告 `remaining`；它从不重播已启动或未知的条目，并且不授权后续执行。 Provider-profile选择或自有执行模式使用继承的 Generic workflow 合约而不是驻留计划助手。

## 硬约束

- 绝不直接读取或修改 Zotero 数据库或存储文件。
- 服务执行一次有边界的操作，绝不使用通知等待或轮询循环。
- Cron jobs 只读，绝不调用 `workflow submit`。
- 工作流提交需要针对已审阅计划的当前明确操作员指令和 `--allow-submit`；该标志记录边界，但不取代 Zotero 端 approval。
- 本地 `state.sqlite` 是唯一的常驻数据库，但不是当前 Zotero 状态的权威。
- 不得将过去的 approval、缓存结果或已计划的 proposal 转化为新的写入。
- 在最终报告中保留 item keys、workflow run IDs、notification IDs、operation IDs 与 artifact references。
- 关联动作处理完之前不得确认通知；event 文本不构成回复、连接、批准、提交或修改的权限。
- 不得通过 watched run 监控 Agent 自主的 `agentRunId`；其请求执行、校验、apply-back 和 receipt 恢复应委托给 Generic。
- 不得从工作流终态推断 Product、artifact、条目变更或维护成功结果。
- 不得自动修复 duplicate、hygiene、readiness、workflow-status 或 attention 候选项。
- 不得使用临时 SQL 或其他 helper 修改 `state.sqlite`，也不得用不完整 refresh 替换可用状态。
- 不要手动编辑 workflow 计划。任何路径、摘要、workflow 合同或选择不匹配在远程提交之前都会失败。
- 计划是经过审查的输入证据，而不是存储的批准令牌。每次提交调用都需要当前授权。
- 处于 `launching` 或 `unknown` 状态的条目可能已更改远程状态。切勿自动重播。
- 请勿声称该服务创建或更改了 cron 时间表。

## Receipt 合同

每个服务调用都会返回一个 `zotero-librarian.operation-receipt.v1` JSON 对象：

- `operation`：有界服务动作。
- `status`：`ok`、`unchanged`、`changed`、`attention` 或 `failed`。
- `generatedAt`：receipt时间。
- `summary`：可选的人类可读边界。
- `data`：操作特定的结构化结果。
- `error`：存在于`failed`，带有`code`、`message`，以及可选的`details`。

解读状态：

- `ok`：只读请求成功返回；这并不意味着 Zotero 发生了变化。
- `unchanged`：投影、监视或同步过程未发现可报告的增量。
- `changed`：本地驻留状态发生变化或启动了明确授权的远程操作。
- `attention`：需要审核，包括不确定的远程影响；这不是补救措施。
- `failed`：传递无法完成，不应推断成功。

仅当 `[SILENT]` 抑制 `--quiet` cron 结果时，`unchanged` 才有效。它不是 JSON，并且不得用于交互式答案。

对于面向用户的结论，添加适合该主张的实时证据。单独的缓存receipt无法证明当前库、workflow、运行、Product、操作或写入状态。

## 完成条件

当恰好一个有界单次执行返回有效的receipt，当前事实具有所需的实时确认，注意力具有明确的下一个安全检查，并且没有发生未经授权或不安全的重放时，驻留任务就完成了。

对于 workflow 提交，完成单次执行意味着receipt标识已启动的条目、剩余的待处理条目或需要注意的未知条目。这并不意味着 workflow 结果或请求的研究输出已完成。

对于库答案，完成意味着继承的 Generic Skill 返回其业务结果，并且常驻缓存证据仅用于发现或更改比较。

## 驻留报告清单

在报告通过之前，请确认：

- 保留操作名称和receipt状态；
- 当本地发现影响路由时，说明缓存时间；
- 每个当前库，workflow，运行，通知，Product，或操作声明都有活生生的证据；
- `ok`、`unchanged`、`changed`、`attention`、`failed`按照receipt合约解释；
- 注意候选者未被描述为已确认的缺陷或已完成的补救措施；
- 已启动的运行并不被描述为已完成的研究成果；
- 未知的提交条目不会被描述为失败或可以安全重试；
- 本地计划、文件和数据库路径不会超出面向操作员的需求；
- 不存在令牌和连接秘密；
- 当审查仍然存在时，将命名下一次安全实时检查。

对于交互式答案，请说明：

1. 运行了什么一次性操作。
2. 本地投影或日志状态发生了哪些变化。
3. 检查了哪些现场 Zotero 证据。
4. 需要注意什么。
5. 故意不提交、确认、写入变更、维护或安排的内容。
6. 下一轮执行是否需要新的指令。

对于cron拥有的输出，仅发出服务结果。 `[SILENT]` 对于`unchanged` 来说是完整的；不要用妨碍安静操作的解释性消息代替它。

对于到Generic 的移交，包括稳定的refs、新鲜度、常驻receipt和有界研究目标。不要将驻留自动化策略复制到下游任务中或将本地缓存行视为其源证据。

## 失败处理

失败时，保留 operation 名称、receipt 错误、当前 plan/run/event handle 和最后可用的本地状态。重试任何服务支持的动作前，重新查询受影响的实时资源。损坏缓存必须通过服务重建，绝不能局部修补 SQL。工作流提交结果不确定时，启动另一条目前先检查当前/近期工作流 run 和 watched 状态。本地状态失败绝不授权 Zotero 变更。

如果计划身份验证失败，请勿手动修复JSON；根据当前的实时环境创建新计划。如果 workflow 合同验证发生变化，请将计划标记为不可用并返回Generic 或准备新计划。如果条目变为`unknown`，则停止批处理，保留其序号和项目refs，并在任何新工作之前协调实时最近运行。

如果意外的驻留状态阻止安全提交，请保留状态数据库并在安全的情况下继续只读操作。不要删除未知记录以强制打开提交路径。

## LLM 与脚本职责

Agent 负责工作分类、委托有边界的研究任务、判断实时证据、决定何时需要当前人工确认，以及解释 receipt。服务负责 SQLite schema 创建、有边界 CLI 调用、本地 projection/journal 原子更新、plan 序列化与 receipt 输出。随附 Generic 和 CLI Skills 分别拥有研究合同与精确机制合同。不得用临时 shell、SQL 或 Python 代码复现服务的状态变更。

## 参考资料

- 执行 index、工作流 catalog、run、通知、文献库问答或定时工作前，阅读[常驻操作](references/resident-operations.md)。
- 选择工作流模式、计划、提交、并发、维护提案、确认处理 或处理任何权限边界前，阅读[自动化政策](references/automation-policy.md)。
- 判断新鲜度、修复本地状态、处理部分/失败 receipt、不确定结果或更改 profile 配置前，阅读[状态与恢复](references/state-and-recovery.md)。
