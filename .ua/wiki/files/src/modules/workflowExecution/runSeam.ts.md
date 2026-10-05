
# src/modules/workflowExecution/runSeam.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/runSeam.ts -->

工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。
源码：[src/modules/workflowExecution/runSeam.ts](../../../../../../src/modules/workflowExecution/runSeam.ts)

## 符号（5）
<!-- node: function:src/modules/workflowExecution/runSeam.ts:applySkillRunnerProgressEvent -->
<!-- node: function:src/modules/workflowExecution/runSeam.ts:observeWorkflowRunTerminal -->
<!-- node: function:src/modules/workflowExecution/runSeam.ts:recordSequenceStepSkillRunnerProgress -->
<!-- node: function:src/modules/workflowExecution/runSeam.ts:requestSkillRunnerSubmitFocus -->
<!-- node: function:src/modules/workflowExecution/runSeam.ts:runWorkflowExecutionSeam -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applySkillRunnerProgressEvent | 函数 | 183–300 | 中等 | run-seam、progress、state-machine、skillrunner、logging | 1 | 将 SkillRunner 进度事件映射为工作流任务状态与日志，处理取消、失败与重试等终态。 |
| observeWorkflowRunTerminal | 函数 | 387–471 | 中等 | run-seam、terminal、observation、lifecycle | 1 | 观察工作流运行的终态事件，收尾任务记录、历史与 trace 并向订阅方发布结果。 |
| recordSequenceStepSkillRunnerProgress | 函数 | 322–385 | 中等 | run-seam、sequence、progress、state-store | 1 | 把序列步骤的 SkillRunner 进度记录到序列运行状态并通知订阅者。 |
| requestSkillRunnerSubmitFocus | 函数 | 123–144 | 简单 | run-seam、skillrunner、focus、ui | 0 | 请求 SkillRunner 运行对话框聚焦到对应请求，保证进度可见。 |
| [runWorkflowExecutionSeam](../../../../symbols/src/modules/workflowExecution/runSeam.ts/runWorkflowExecutionSeam.md) | 函数 | 473–1053 | 复杂 | seam、dispatch、orchestration、concurrency、lifecycle | 1 | 运行 seam 主入口：按并发度投递已准备执行单元到队列与 Provider，登记任务、前台聚焦与进度订阅，并在终态后完成清理。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeSemanticTraceRecorder.ts](../acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts | 语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。 |
| [acpSequenceStepLifecycle.ts](acpSequenceStepLifecycle.ts.md) | src/modules/workflowExecution/acpSequenceStepLifecycle.ts | ACP 序列步骤的生命周期适配器实现，在步骤应用结果确定后把 apply 状态写回 ACP Skill Run 并在结束时卸载控制器。 |
| [acpSkillRunForeground.ts](../acp/skillRun/acpSkillRunForeground.ts.md) | src/modules/acp/skillRun/acpSkillRunForeground.ts | 把指定 skill run 拉到前台：按执行模式选择 run、更新记录中的前台标记，并打开 Assistant Workspace 侧边栏。 |
| [acpSkillRunStore.ts](../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceSelection.ts](../acp/skillRun/acpSkillRunWorkspaceSelection.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |
| [contracts.ts](../../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [contracts.ts](contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [debugMode.ts](../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [localization.ts](../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [manager.ts](../../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [registry.ts](../../providers/registry.ts.md) | src/providers/registry.ts | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |
| [requestMeta.ts](requestMeta.ts.md) | src/modules/workflowExecution/requestMeta.ts | 从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。 |
| [runConcurrency.ts](runConcurrency.ts.md) | src/modules/workflowExecution/runConcurrency.ts | 工作流派发并发度解析：仅 SkillRunner 与通用 HTTP 这类全并行 Provider 允许按请求数并发，其余 Provider 强制串行。 |
| [runtimeLogManager.ts](../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [sequenceRuntime.ts](sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [sequenceStateStore.ts](sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [sequenceStepApply.ts](sequenceStepApply.ts.md) | src/modules/workflowExecution/sequenceStepApply.ts | 序列单步 apply 执行：构造结果上下文与 bundle reader 调用运行时 apply，并收集 Skill Run 反馈侧信息返回给序列状态机。 |
| [skillRunnerAutoReplyObserver.ts](../skillRunner/run/skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerExecutionMode.ts](../skillRunner/run/skillRunnerExecutionMode.ts.md) | src/modules/skillRunner/run/skillRunnerExecutionMode.ts | SkillRunner 执行模式解析：把请求中的模式字段规整为已知取值，并为缺省情形给出稳定的默认模式。 |
| [skillRunnerInteractiveAutoReply.ts](../skillRunner/run/skillRunnerInteractiveAutoReply.ts.md) | src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts | 交互式自动回复开关模块：解析用户偏好并判定某个 run 是否应启用自动回复，同时构造对应的请求载荷。 |
| [skillRunnerProgressMapping.ts](../skillRunner/run/skillRunnerProgressMapping.ts.md) | src/modules/skillRunner/run/skillRunnerProgressMapping.ts | 把 SkillRunner 事件流中的进度事件映射为 jobQueue 的 JobState、生命周期阶段与提交阶段，是后端事件语义与插件任务状态之间的翻译层。 |
| [skillRunnerRunStore.ts](../skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [skillRunnerSubmissionContext.ts](../skillRunner/run/skillRunnerSubmissionContext.ts.md) | src/modules/skillRunner/run/skillRunnerSubmissionContext.ts | 提交上下文小模块：归一化用户提交文本并解析对应的 Skill 展示名，供 run 记录与 UI 共用。 |
| [taskDashboardHistory.ts](../taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskRuntime.ts](../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [terminalResolution.ts](terminalResolution.ts.md) | src/modules/workflowExecution/terminalResolution.ts | 工作流作业终态解析：把 ACP SkillRun、SkillRunner run store 与序列状态三个来源的观测归一到统一的作业槽位状态和终态结论。 |
| [types.ts](../../providers/types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowRuntime.ts](../workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowSubmissionQueueContracts.ts](../../jobQueue/workflowSubmissionQueueContracts.ts.md) | src/jobQueue/workflowSubmissionQueueContracts.ts | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [productionExecution.ts](../workflow/productionExecution.ts.md) | src/modules/workflow/productionExecution.ts | 工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。 |
| [submissionSeam.ts](submissionSeam.ts.md) | src/modules/workflowExecution/submissionSeam.ts | 工作流提交接缝：把已准备好的工作流执行单元提交到宿主任务队列或直接执行路径，并汇总每个单元的执行与回填结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [runWorkflowExecutionSeam](../../../../symbols/src/modules/workflowExecution/runSeam.ts/runWorkflowExecutionSeam.md) | 函数 | 473–1053 | 运行 seam 主入口：按并发度投递已准备执行单元到队列与 Provider，登记任务、前台聚焦与进度订阅，并在终态后完成清理。 |
