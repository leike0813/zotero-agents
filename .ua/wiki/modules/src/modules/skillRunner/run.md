
# src/modules/skillRunner/run
> 目录聚合页：15 个文件、79 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/skillRunner/run/skillRunFeedback.ts](../../../../files/src/modules/skillRunner/run/skillRunFeedback.ts.md) | 文件 | 6 | Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。 |
| [src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts](../../../../files/src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts.md) | 文件 | 9 | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [src/modules/skillRunner/run/skillRunnerExecutionMode.ts](../../../../files/src/modules/skillRunner/run/skillRunnerExecutionMode.ts.md) | 文件 | 2 | SkillRunner 执行模式解析：把请求中的模式字段规整为已知取值，并为缺省情形给出稳定的默认模式。 |
| [src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts](../../../../files/src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | 文件 | 12 | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts](../../../../files/src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts.md) | 文件 | 4 | 交互式自动回复开关模块：解析用户偏好并判定某个 run 是否应启用自动回复，同时构造对应的请求载荷。 |
| [src/modules/skillRunner/run/skillRunnerProgressMapping.ts](../../../../files/src/modules/skillRunner/run/skillRunnerProgressMapping.ts.md) | 文件 | 3 | 把 SkillRunner 事件流中的进度事件映射为 jobQueue 的 JobState、生命周期阶段与提交阶段，是后端事件语义与插件任务状态之间的翻译层。 |
| [src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts](../../../../files/src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts.md) | 文件 | 4 | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [src/modules/skillRunner/run/skillRunnerRecoverableState.ts](../../../../files/src/modules/skillRunner/run/skillRunnerRecoverableState.ts.md) | 文件 | 3 | 可恢复状态判定：判断哪些 SkillRunner 任务已具备恢复条件、哪些失败属于不可恢复，是重启恢复决策的最小判定单元。 |
| [src/modules/skillRunner/run/skillRunnerRunIdentity.ts](../../../../files/src/modules/skillRunner/run/skillRunnerRunIdentity.ts.md) | 文件 | 2 | 按 workflowRunId:sequenceJobId:stepId 三段拼接生成 SkillRunner 序列步骤的本地 runId，任一环节缺失时返回空串。 |
| [src/modules/skillRunner/run/skillRunnerRunSettlement.ts](../../../../files/src/modules/skillRunner/run/skillRunnerRunSettlement.ts.md) | 文件 | 2 | SkillRunner 运行的失败结算：把管理端响应与异常解析为语义化结论，按状态机规则将 run 标记为失败并停止对应的会话同步。 |
| [src/modules/skillRunner/run/skillRunnerRunStateProjection.ts](../../../../files/src/modules/skillRunner/run/skillRunnerRunStateProjection.ts.md) | 文件 | 1 | 把运行状态与待处理 owner 投影为 UI 可直接消费的组合视图，包含等待归属方、是否应清除 pending 以及状态机违规信息。 |
| [src/modules/skillRunner/run/skillRunnerRunStore.ts](../../../../files/src/modules/skillRunner/run/skillRunnerRunStore.ts.md) | 文件 | 13 | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts](../../../../files/src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts.md) | 文件 | 8 | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [src/modules/skillRunner/run/skillRunnerSubmissionContext.ts](../../../../files/src/modules/skillRunner/run/skillRunnerSubmissionContext.ts.md) | 文件 | 1 | 提交上下文小模块：归一化用户提交文本并解析对应的 Skill 展示名，供 run 记录与 UI 共用。 |
| [src/modules/skillRunner/run/skillRunnerTaskReconciler.ts](../../../../files/src/modules/skillRunner/run/skillRunnerTaskReconciler.ts.md) | 文件 | 9 | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 13 |
| [src/modules/workflowExecution](../workflowExecution.md) | 11 |
| [src/backends](../../backends.md) | 9 |
| [src/providers/skillrunner](../../providers/skillrunner.md) | 7 |
| [src/jobQueue](../../jobQueue.md) | 5 |
| [src/config](../../config.md) | 4 |
| [src/modules/skillRunner/connection](connection.md) | 4 |
| [src/modules/workflow/catalog](../workflow/catalog.md) | 4 |
| [src/workflows](../../workflows.md) | 4 |
| [src/providers](../../providers.md) | 3 |
| [src/utils](../../utils.md) | 3 |
| [src/modules/skillRunner/surface](surface.md) | 2 |
| [src/modules/assistant/publication](../assistant/publication.md) | 1 |
