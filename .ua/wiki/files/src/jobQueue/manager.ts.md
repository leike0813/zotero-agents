
# src/jobQueue/manager.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/jobQueue](../../../modules/src/jobQueue.md)
<!-- node: file:src/jobQueue/manager.ts -->

通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。
源码：[src/jobQueue/manager.ts](../../../../../src/jobQueue/manager.ts)

## 符号（2）
<!-- node: class:src/jobQueue/manager.ts:JobQueueManager -->
<!-- node: function:src/jobQueue/manager.ts:normalizeJobRecordMeta -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [JobQueueManager](../../../symbols/src/jobQueue/manager.ts/JobQueueManager.md) | 类 | 250–710 | 复杂 | queue、scheduler、state-machine、service、job-management | 1 | 作业队列管理器：负责任务记录的生命周期、并发上限、状态迁移与查询接口，是 Dashboard 任务视图的数据来源之一。 |
| normalizeJobRecordMeta | 函数 | 172–230 | 中等 | normalization、queue、utility、validation | 0 | 把任意来源的作业元数据规范化为固定形状，缺失字段补默认值、多余字段丢弃。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [diagnosticVerbosity.ts](../modules/diagnosticVerbosity.ts.md) | src/modules/diagnosticVerbosity.ts | 诊断日志的冗长输出开关，从运行时环境变量或测试 override 读取 verbose 标记，并提供统一的条件 console 输出入口。 |
| [runtimeLogManager.ts](../modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [skillRunnerProviderStateMachine.ts](../modules/skillRunner/run/skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRecoverableState.ts](../modules/skillRunner/run/skillRunnerRecoverableState.ts.md) | src/modules/skillRunner/run/skillRunnerRecoverableState.ts | 可恢复状态判定：判断哪些 SkillRunner 任务已具备恢复条件、哪些失败属于不可恢复，是重启恢复决策的最小判定单元。 |
| [skillRunnerRunSettlement.ts](../modules/skillRunner/run/skillRunnerRunSettlement.ts.md) | src/modules/skillRunner/run/skillRunnerRunSettlement.ts | SkillRunner 运行的失败结算：把管理端响应与异常解析为语义化结论，按状态机规则将 run 标记为失败并停止对应的会话同步。 |
| [skillRunnerRunStore.ts](../modules/skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](../modules/workflowExecution/contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [inspect-single-markdown-request.ts](../../scripts/inspect-single-markdown-request.ts.md) | scripts/inspect-single-markdown-request.ts | 调研脚本：重建 single-markdown 工作流请求的完整报文，包括 job queue 记录与 SkillRunner provider 的上传字段。 |
| [runSeam.ts](../modules/workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [skillRunnerForegroundContinuation.ts](../modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerProgressMapping.ts](../modules/skillRunner/run/skillRunnerProgressMapping.ts.md) | src/modules/skillRunner/run/skillRunnerProgressMapping.ts | 把 SkillRunner 事件流中的进度事件映射为 jobQueue 的 JobState、生命周期阶段与提交阶段，是后端事件语义与插件任务状态之间的翻译层。 |
| [skillRunnerRecoverableState.ts](../modules/skillRunner/run/skillRunnerRecoverableState.ts.md) | src/modules/skillRunner/run/skillRunnerRecoverableState.ts | 可恢复状态判定：判断哪些 SkillRunner 任务已具备恢复条件、哪些失败属于不可恢复，是重启恢复决策的最小判定单元。 |
| [skillRunnerRunStore.ts](../modules/skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [skillRunnerTaskReconciler.ts](../modules/skillRunner/run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [taskDashboardHistory.ts](../modules/taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskRuntime.ts](../modules/taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [JobQueueManager](../../../symbols/src/jobQueue/manager.ts/JobQueueManager.md) | 类 | 250–710 | 作业队列管理器：负责任务记录的生命周期、并发上限、状态迁移与查询接口，是 Dashboard 任务视图的数据来源之一。 |
| normalizeJobRecordMeta | 函数 | 172–230 | 把任意来源的作业元数据规范化为固定形状，缺失字段补默认值、多余字段丢弃。 |
