# 自动化政策

## 权限矩阵

| 动作 | Cron | 交互式常驻请求 | 所需证据 |
| --- | --- | --- | --- |
| 刷新本地 index/catalog | 允许 | 允许 | Receipt 及 refresh/change 计数 |
| 搜索本地 projection | job 声明时允许 | 允许 | 缓存新鲜度；对外部主张还需实时确认 |
| 读取实时文献库/Synthesis 状态 | 允许单次有界 pass | 允许 | 返回的 ref 与新鲜度事实 |
| 监控已注册 run 或同步通知 | 允许单次有界 pass | 允许 | Run/event ID 与 receipt |
| 生成 hygiene、workflow-status 或 attention proposal | 允许 | 允许 | 候选原因与下一项实时检查 |
| 校验 Zotero 托管工作流 | 随附 cron 不执行 | 允许通过 Generic/CLI 执行 | 当前 selection、workflow/options 校验、provider 兼容性 |
| 提交工作流 | 禁止 | 仅允许提交已审阅的当前 scope | 操作员当前指令、有界 concurrency、Zotero approval 路径 |
| 执行 Agent 自主 handoff | 禁止 | 委托给 Generic | Handoff 合同、本地校验、apply receipt |
| 修改 Zotero 或应用 Agent 输出 | 禁止 | 使用 Generic/CLI 合同 | 当前请求、精确 target/effect、Zotero 端 approval |
| 破坏性维护 | 禁止 | 需要当前目标级人工决策 | 诊断、proposal、approval、事后状态 |

本地缓存与 journal 写入属于常驻记账，不构成修改 Zotero 的权限。既往 approval、观察到的 native submission、pending 工作流、缓存候选项或定时 proposal 都不能升级为新的写入授权。

## workflow 执行模式与委托

根据实时描述选择工作流所有权。Zotero-managed execution 使用 Generic 任务策略及精确 CLI join point；Zotero 插件的 native queue 负责 pending-unit ordering、有界 admission 和 slot 生命周期。admitted runs 可以注册并监控。provider-profile 决策、workflow options、source grouping 判断及有边界的研究解释，均属于继承的 Generic 任务 Skill。

工作流声明支持 Agent 自主执行时，将整个 handoff 委托给 Generic：准备/检查请求、执行语义工作、校验每项结果、应用映射并检查持久 apply receipt。常驻 watched run 和通知不监管 `agentRunId`。

即使存在缓存 catalog 条目，也必须使用实时工作流发现。缓存定义可辅助选择，但不能确定当前执行模式、backend 兼容性、permission 或结果 schema。

## Native submission 与 queue supervision

通过随附 CLI 描述并校验当前请求：

```sh
zotero-bridge workflow describe --workflow <workflow-id>
zotero-bridge workflow validate \
  --workflow <workflow-id> --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>'
```

检查精确 selection refs、彼此分离的 `inputs` 与 `validateSelection` contract、workflow ID、必需 options、provider 要求、candidate-production rules、不可变 unit grouping、预期输出和 approval boundary。如果 selection 为空、过时或包含意外对象，更正实时 Zotero selection 并重新校验。不得在本地重建 prepared units，也不得把 cached catalog data 表述为实时校验。

操作员对该精确审阅 scope 和有界 concurrency 授权后，仅提交一次：

```sh
zotero-bridge workflow submit \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>' \
  --max-concurrency <bounded-count>
```

有效参数记录当前审阅 scope，但不能替代 Zotero 侧 approval。Host 会在 admission 前重新校验实时 workflow contract 与 selection。读取返回的 `admission` 分支：direct admission 时保留 `workflowRunId`；host-queue admission 时保留 `submissionId`、计数、queue links 和不可变 unit projections。初始响应在表达 pending work 时，不得虚构 run handle。

对 queued work，将 `workflow submission get <submissionId>` 用作 aggregate admission record。使用 `workflow queue list` 观察 active units，仅使用 `workflow queue cancel <queueId>` 取消仍处于 pending 的 unit。unit 一旦 admitted，使用 `run list --submission <submissionId>` 将其与 task 关联，并监督真实 run。后续新 submission 需要新的当前指令；不得把原始授权视为无限期授权，也不得重播 admission effect 不确定的 unit。

## Provider profile 与并发

workflow selection 与 options 不编码 backend provider profile。若工作流需要 backend 所有的 provider 选项，应使用 Generic 列出/描述 backend profile，将 provider JSON 与工作流输入分开校验，并通过汇合两者的精确 CLI 合同提交。连接 profile 与 provider profile 是不同概念。

交互式提交默认 concurrency 为一。更高的 `--max-concurrency` 最多并行 admit 相应数量的 native units；必须在考虑 backend/provider 限额、成本、unit 独立性、apply-back 时长和监控能力后明确批准。该 bound 只属于本次已接受 submission，不授权未来工作。

分别记录返回的 `submissionId`、每个 unit 的 `queueId`，以及每个 admitted task 或 `workflowRunId`。pending units 已经属于被接受的 native submission；它们不需要常驻层重新启动，也不能解释为失败。如果 admission 状态不确定，在进行另一调用前检查原始 submission 和 submission-filtered task list。

## Cron 与维护

每个随附 cron 均只读 Zotero 且只执行单次 pass。它可以更新 `state.sqlite`、发出 attention，并在无可报告变化时输出 `[SILENT]`；不能等待、请求 approval、submit、apply、凭假设确认事件、调用用户选择的脚本或写入任意路径。

Workflow-status triage 识别需要审阅的 watched run。Library hygiene 当前识别标题重复候选项。Synthesis attention 报告实时排序条目。这些都属于诊断和 proposal。修复前必须调用合适的 Generic 任务、重新读取当前对象、解释 effect 并获得当前授权。

Synthesis cache、index、sidecar、graph 或 metric 的维护遵循 Generic Synthesis 与 CLI 合同。队列为空或本地 projection 过期，不足以构成修改派生状态的理由。

## 交互与报告

对于等待中的 run，回复或连接前先检查实时 `skillRunId` 和声明动作。permission ID 在 CLI 中只供观察；approval 仍位于有 scope 的 Zotero UI。只有通知事件要求或隐含的后续动作已实际处理后，才确认该事件。

报告 attention 时给出原因、item/run/event 标识符、必要时的缓存新鲜度，以及下一项安全实时检查。区分 proposal 与已启动 run、已启动 run 与终态结果，并区分终态结果与已验证的 Product、artifact 或 Zotero 变更。失败 receipt 保留稳定错误码，并说明重试前需要进行的实时重读。

## 自然语言自动化决策

驻留请求经常使用操作性语言，而不指定实际的权限边界。使用以下决策模型。

### “看这个 workflow”

确定：

- 用户是否提供`workflowRunId`，或者必须注册已知的运行？
- 他们想要进行一次当前状态检查还是参考现有时间表？
- 哪些状态或事件是可报告的？
- 是否允许交互，或者单次执行应该只报告？
- 预期输出是否需要运行状态之外的Product/artifact验证？

政策：

- 仅注册真正的 Zotero 管理的 workflow 运行。
- 执行一次 `run watch` 遍。
- 使用实时运行命令进行交互。
- 在完成之前不要等待、休眠或轮询。
- 请勿将自有的`agentRunId`放置在观看的跑步中。
- 不要仅仅因为运行已结束而确认通知。

### “当有事情需要注意时告诉我”

确定：

- 哪些领域重要：失败/停滞的运行、未处理的事件、重复的候选者、Synthesis 注意力，还是所有这些？
- 用户想要每个候选者还是只想要一个阈值？
- 这是当前报告还是现有的定期计划？

政策：

- 运行有限的注意力产生通道。
- 保留每个候选项的理由和身份。
- 将`attention`视为已完成的提案/报告。
- 请勿自动修改、重新提交、修复或确认。
- 使用Generic 任务策略进行任何后续研究或管理。

### “保持我的文献库清洁”

这种措辞永远不够写入变更权威。

将其转换为：

1. 声明的诊断域。
2. 一次性候选项报告。
3. 实时重读候选对象。
4. Generic 整理提案。
5. 单独的当前目标级别决策。
6. 如果获得批准，则经过验证的写入和耐用receipt。

预定的文献库整理单次执行目前可以识别重复标题的候选者。重复的标题不是重复的证明，也不能选择幸存者。

### “每晚进行分析”

分开：

- 有限 workflow 选择和验证；
- 操作员批准的 validation/submission scope；
- 外部时间表配置；
- 每次运行监控；
- 输出验证。

常驻服务无法安装或修改cron。已发送的cron作业故意不提交workflows。将请求的节奏报告为外部配置需求；不要修改 cron 文件或暗示时间表存在。

### “回答我文献库的问题”

使用常驻索引进行发现或更改比较，然后将有界答案委托给Generic 查询。现场确认当前事实。不要将仅缓存结论公开为当前 Zotero 状态。

### “自动修复失败的地方”

拒绝暗示的一揽子权威。不同的故障可能代表：

- 无远程影响；
- 成功的远程效果但失去响应；
- 部分 native admission；
- 缺少 Product 或 artifact；
- provider 不可用；
- 拒绝许可；
- 陈旧的局部投影；
- 破坏性的整理模糊性。

对故障进行分类并返回下一个安全检查。切勿将“自动”一词变成写入变更或重放权限。

## Native submission authority 生命周期

### 准备

只有满足以下条件，Zotero-managed request 才能进入授权审阅：

- 实时 workflow 描述可用；
- 实时描述分别公开 execution-input 与 candidate-production contracts；
- 原始当前 selection 已解析，且不存在常驻层 candidate 或 grouping 推断；
- 完整 selection 通过实时 workflow 校验；
- 必需 workflow options 已显式提供并校验；
- provider 要求已识别，并通过独立 profile contract 校验；
- 受支持的执行模式是 Zotero-managed；
- 预期 Products、artifacts、实时变更及交互点已知；
- 拟定 concurrency 是该请求的有限正整数 bound。

审阅记录应区分：

- workflow identity 与 outcome；
- 精确 selected refs 或声明的 no-selection 形式；
- workflow options；
- provider profile identity 与已校验 provider JSON；
- candidate-selection 与不可变 grouping 行为；
- 拟定 native admission bound；
- 预期 unit-to-source 关联；
- 预期 run 与 output evidence。

### 审阅

操作员审阅：

- workflow outcome；
- 精确 selected refs；
- execution member 与 grouping contract；
- candidate selection 与 validation contract；
- 预期 native units 数量或形态；
- 预期 provider/execution boundary；
- workflow options 及其 scope effect；
- 本次 accepted submission 的 concurrency；
- 预期 run/result evidence；
- Zotero-side approval 时机。

审阅不会创建 queue entries，也不会创建持久授权。任何所需变更都要依据当前实时上下文重新校验。

### 授权

权限必须是当前且 invocation-specific：

- 用户指令必须指向已审阅的 workflow、selection、options 和 provider scope。
- concurrency 大于一时，该有界值必须属于已审阅 effect。
- 先前 submission 不授权另一次 submission。
- 已 accepted native submission 中的 pending unit 不需要新的常驻启动决策。
- 增加 concurrency 必须在调用前经过显式考虑与授权。
- Zotero-side approval 保持独立。

不得在常驻状态中持久化“approved”标志，否则会把过去决策转化为可复用权限。

### 再次校验

远程提交前：

- 重新描述 workflow；
- 确认 execution mode；
- 解析当前 selection；
- 校验完整 selection 与 workflow options；
- 重新校验独立选择的 provider profile；
- 保持精确 JSON binding，不得把 provider 字段移动到 workflow options；
- 确认预期 unit grouping 与 output contracts；
- 确认已授权 concurrency bound。

任何不匹配都必须在远程 effect 发生前 fail closed。

### 通过 Zotero admit

只提交一次已审阅请求。随后：

1. 先读取 `admission`，再选择监控命令族。
2. direct admission 时，保留返回的 task identity 与 `workflowRunId`。
3. host-queue admission 时，保留 `submissionId`、unit counts、queue links 和每个不可变 `queueId`。
4. 检查 submission projection 中的 pending、admitted、terminal、failed 和 canceled units。
5. 通过 submission lineage filter 关联 admitted tasks。
6. 仅在目标 unit 仍为 pending 时使用 queue cancellation。
7. 只有在真实 run handle 存在后，才使用 run cancellation 或 interaction。
8. 在完整 supervision 期间，将 source refs 与 expected outputs 绑定到每个 unit。

Zotero 插件负责 pending-unit ordering、admission 与 slot release。常驻 profile 不预留 units、不启动下一条 entry，也不运行 replay worker。

### 监督与报告

交互式 submission evidence 应说明：

- direct 或 host-queue admission；
- queued 时的 `submissionId`；
- aggregate unit counts 与 links；
- 不可变 unit identities；
- 存在时的 admitted task 与 run identities；
- 请求取消 pending unit 时的 cancellation receipt；
- 存在时的 uncertain transport 或 state evidence。

监督报告应区分：

- 已被 native queue 接受的 pending units；
- admission 前已取消的 units；
- admitted 或 running tasks；
- terminal successful tasks；
- terminal failed tasks；
- Product、artifact 或 live-change 验证尚未完成的 tasks。

这些证据证明 observed native admission 与 execution state，但不能证明 output quality、Product delivery、Zotero writeback 或用户研究 outcome 已完成。

## Provider、options 与不支持的 submissions

交互式路径向 Host validation 发送一个已审阅请求，并把 candidate production 与不可变 grouping 委托给实时 workflow contract。以下情况交给 Generic：

- 必需 workflow options 需要语义选择或澄清；
- 必须选择或校验 provider profile；
- workflow 使用 Agent 自主执行；
- 需要 no-selection execution；
- 任务需要自定义 result handling 或 apply-back。

不得删除必需 options、静默选择默认 provider、把 Agent 自主 workflow 转换为 Zotero-managed workflow，也不得在本地重建 Host 的 prepared units。

## 并发决策

默认 concurrency 一是安全边界，而不是性能偶然。所选数值会成为该 submission 的 native queue admission bound。

仅在以下情况下增加并发性：

- 条目是独立的；
- provider/backend容量已知；
- 预期成本是可以接受的；
- 监控可以区分每次运行；
- submission lineage 能把每个 admitted unit 与 source identity 关联；
- 一个人的失败并不意味着另一个人的失败；
- 操作员授权该 submission 的精确 bound。

在以下情况下不要增加并发性：

- 选择重叠；
- 写入可能会发生冲突；
- provider配额不确定；
- 可能需要运行交互；
- apply-back 可能让 native slots 保持占用的时长存在重大差异；
- workflow 结果顺序很重要；
- 较早 submission 的状态未知。

concurrency 值只适用于当前 submit call。它配置 Zotero 的 native queue；不会创建常驻 queue worker、预留本地 entries，也不授权未来 submissions。pending native units 已经是 accepted work，不得通过重新提交来模拟进度。

## Cron决策模型

随附 cron拥有节奏；该服务负责一次单次执行。将这些责任分开。

克朗可能：

- 刷新本地投影；
- 比较状态；
- 观看已知运行一次；
- 同步轻量级通知；
- 生成 workflow-状态、整理或attention 报告；
- 为 `[SILENT]` 发出 `unchanged`。

克朗可能不会：

- 提交或重新提交 workflow；
- 执行自有交接；
- 确认事件而不处理操作；
- 写入变更 Zotero；
- 应用结果；
- 进行破坏性维护；
- 等待交互；
- 创建另一个时间表。

如果用户请求新的节奏，请报告：

- 预期的服务命令；
- 读/写权限；
- 期望的报告阈值；
- 外部调度要求。

请勿将编辑 profile 计划作为普通 Skill 执行的一部分。

## Attention 与升级 playbook

### 等待运行

1. 读取实时运行状态。
2. 解析当前的`skillRunId`。
3. 检查已声明的操作。
4. 报告所需的交互。
5. 仅在匹配的Generic/CLI合同下回复或连接。
6. 处理完毕后确认相关通知。

### 运行失败

1. 保留运行 ID 和 workflow ID。
2. 检查结构化故障和预期输出。
3. 判断是否存在Product/artifact。
4. 单独的provider故障、workflow 故障、丢失输出和 Zotero 应用故障。
5. 将有限语义重试决策路由至Generic。
6. 不要从通知中重新提交。

### 未知提交

1. 保留返回或先前观察到的 `submissionId`、unit `queueId`、selection refs 与结构化 error。
2. 在寻找替代操作前检查 native submission projection。
3. 通过 submission-filtered task discovery 与真实 run state 关联 admitted work。
4. 将 admitted runs 与 watched state 对齐，但不得把 watched-run journal 视为 queue authority。
5. 不得重播 admission effect 仍不确定的 selection 或任何 unit。
6. 只有证明早先调用未创建 accepted submission 或 admitted task，并取得新授权后，才可创建新 submission。

### 文献库整理候选项

1. 保留候选项原因和项目refs。
2. 读取两个活动对象。
3. 确定它们是否重复、版本或误报。
4. 将提案构建委托给 Curation。
5. 需要精确的破坏力。

### Synthesis attention

1. 检查实时关注条目。
2. 解决模型的同一性和新鲜度。
3. 将解释委托给GenericSynthesis。
4. 单独诊断维护。
5. 不要仅从队列成员身份改变派生状态。

## 报告语言

用途：

> 一次运行检查发现有两次运行需要审查。未提交或重试任何 workflow。

用途：

> native submission 的响应不确定。我已保留其 submission 与 unit handles，并在任何替代调用之前停止。必须先对齐原始 submission projection 与关联 tasks，才能创建新的 submission。

用途：

> 每周整理任务发现了三个重复标题的组。这些是审查候选者，而不是确认的重复者。

不要使用：

- “持续监控”以进行一次性检查；
- 对 cached validation 或 resident state 使用“已批准”；
- 关注提案“固定”；
- “已完成”表示输出未经验证的终端运行；
- 当没有配置外部计划时为“已计划”；
- 当远程效果未知时“安全重试”。
