
# src/modules/workflowExecution/sequenceStateStore.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/sequenceStateStore.ts -->

序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。
源码：[src/modules/workflowExecution/sequenceStateStore.ts](../../../../../../src/modules/workflowExecution/sequenceStateStore.ts)

## 符号（12）
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:applySequenceRunEvent -->
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:cloneProviderResult -->
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:getSequenceRunState -->
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:getSequenceRunStateByStepRequest -->
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:getSequenceStepIndexByRequestId -->
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:initializeSequenceRunState -->
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:listSequenceRunStates -->
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:parseProviderResult -->
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:parseState -->
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:parseStep -->
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:resolveStepApplyFailureMode -->
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:subscribeSequenceRunStateStore -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applySequenceRunEvent | 函数 | 572–779 | 复杂 | state-store、event-reducer、state-machine、persistence、subscription | 0 | 序列运行事件归约器：按事件类型更新 run 与 step 状态并持久化、广播变更。 |
| cloneProviderResult | 函数 | 224–260 | 简单 | state-store、clone、immutability | 1 | 深拷贝 Provider 结果以避免状态间共享可变引用。 |
| getSequenceRunState | 函数 | 824–832 | 简单 | state-store、accessor、state | 1 | 按运行 ID 读取序列运行状态。 |
| getSequenceRunStateByStepRequest | 函数 | 851–864 | 简单 | state-store、lookup、step、state | 0 | 按步骤请求 ID 定位所属的序列运行状态。 |
| getSequenceStepIndexByRequestId | 函数 | 866–874 | 简单 | state-store、lookup、step、index | 0 | 按请求 ID 解析步骤在序列中的索引。 |
| initializeSequenceRunState | 函数 | 781–822 | 简单 | state-store、initialization、persistence、state | 1 | 初始化并持久化一次序列运行状态，必要时从已有条目恢复。 |
| listSequenceRunStates | 函数 | 843–849 | 简单 | state-store、listing、state | 0 | 列出全部序列运行状态条目。 |
| parseProviderResult | 函数 | 153–222 | 中等 | parsing、state-store、provider-result、persistence | 1 | 解析持久化的 Provider 结果载荷，还原输出、错误与可恢复状态字段。 |
| [parseState](../../../../symbols/src/modules/workflowExecution/sequenceStateStore.ts/parseState.md) | 函数 | 315–373 | 中等 | parsing、state-store、state、persistence | 2 | 解析完整序列运行状态，缺失字段按默认结构补齐。 |
| parseStep | 函数 | 281–313 | 简单 | parsing、state-store、step、validation | 1 | 解析序列步骤状态条目并校验必填字段。 |
| resolveStepApplyFailureMode | 函数 | 507–513 | 简单 | state-store、apply、failure-mode、resolution | 1 | 解析步骤 apply 失败的模式（可重试、需人工介入或终态失败）。 |
| subscribeSequenceRunStateStore | 函数 | 834–841 | 简单 | state-store、subscription、observer | 0 | 订阅序列状态变更并返回取消订阅函数。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](../../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [pluginStateStore.ts](../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [skillRunnerSubmissionContext.ts](../skillRunner/run/skillRunnerSubmissionContext.ts.md) | src/modules/skillRunner/run/skillRunnerSubmissionContext.ts | 提交上下文小模块：归一化用户提交文本并解析对应的 Skill 展示名，供 run 记录与 UI 共用。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [valuePath.ts](valuePath.ts.md) | src/modules/workflowExecution/valuePath.ts | 工作流执行期的通用取值工具：比较原始值相等性并按点分路径安全读取对象属性。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunRecovery.ts](../acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillRunStore.ts](../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [hostBridgeWorkflowControl.ts](../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [runSeam.ts](runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [sequenceRuntime.ts](sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [skillRunnerForegroundContinuation.ts](../skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerRunStore.ts](../skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [skillRunnerTaskReconciler.ts](../skillRunner/run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [terminalResolution.ts](terminalResolution.ts.md) | src/modules/workflowExecution/terminalResolution.ts | 工作流作业终态解析：把 ACP SkillRun、SkillRunner run store 与序列状态三个来源的观测归一到统一的作业槽位状态和终态结论。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applySequenceRunEvent | 函数 | 572–779 | 序列运行事件归约器：按事件类型更新 run 与 step 状态并持久化、广播变更。 |
| getSequenceRunState | 函数 | 824–832 | 按运行 ID 读取序列运行状态。 |
| getSequenceRunStateByStepRequest | 函数 | 851–864 | 按步骤请求 ID 定位所属的序列运行状态。 |
| getSequenceStepIndexByRequestId | 函数 | 866–874 | 按请求 ID 解析步骤在序列中的索引。 |
| initializeSequenceRunState | 函数 | 781–822 | 初始化并持久化一次序列运行状态，必要时从已有条目恢复。 |
| listSequenceRunStates | 函数 | 843–849 | 列出全部序列运行状态条目。 |
| resolveStepApplyFailureMode | 函数 | 507–513 | 解析步骤 apply 失败的模式（可重试、需人工介入或终态失败）。 |
| subscribeSequenceRunStateStore | 函数 | 834–841 | 订阅序列状态变更并返回取消订阅函数。 |
