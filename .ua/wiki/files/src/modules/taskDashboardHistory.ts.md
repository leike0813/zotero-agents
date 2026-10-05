
# src/modules/taskDashboardHistory.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/taskDashboardHistory.ts -->

Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。
源码：[src/modules/taskDashboardHistory.ts](../../../../../src/modules/taskDashboardHistory.ts)

## 符号（13）
<!-- node: function:src/modules/taskDashboardHistory.ts:addStateToTaskDashboardHistorySummary -->
<!-- node: function:src/modules/taskDashboardHistory.ts:cleanupTaskDashboardHistory -->
<!-- node: function:src/modules/taskDashboardHistory.ts:createEmptyTaskDashboardHistorySummary -->
<!-- node: function:src/modules/taskDashboardHistory.ts:listTaskDashboardHistory -->
<!-- node: function:src/modules/taskDashboardHistory.ts:pruneExpiredRecords -->
<!-- node: function:src/modules/taskDashboardHistory.ts:recordTaskDashboardHistoryFromJob -->
<!-- node: function:src/modules/taskDashboardHistory.ts:recordTaskDashboardHistoryFromTaskRecord -->
<!-- node: function:src/modules/taskDashboardHistory.ts:removeTaskDashboardHistoryByBackendAndRequestIds -->
<!-- node: function:src/modules/taskDashboardHistory.ts:summarizeTaskDashboardHistory -->
<!-- node: function:src/modules/taskDashboardHistory.ts:summarizeTaskDashboardHistoryScope -->
<!-- node: function:src/modules/taskDashboardHistory.ts:updateTaskDashboardHistoryStateByRequest -->
<!-- node: function:src/modules/taskDashboardHistory.ts:upsertTaskDashboardHistoryFromTaskRecord -->
<!-- node: function:src/modules/taskDashboardHistory.ts:writeHistoryRecords -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| addStateToTaskDashboardHistorySummary | 函数 | 324–357 | 简单 | summary、aggregation、state-machine | 0 | 把单条历史记录的终态累加进汇总，并处理终态时只保留最近一条的矛盾情况。 |
| cleanupTaskDashboardHistory | 函数 | 143–155 | 简单 | retention、maintenance、exported | 0 | 按当前保留策略触发历史清理并返回被删除的记录数。 |
| createEmptyTaskDashboardHistorySummary | 函数 | 311–322 | 简单 | summary、aggregation、utility | 0 | 构造全零状态计数的历史汇总对象，作为累加的初始累加器。 |
| listTaskDashboardHistory | 函数 | 86–141 | 中等 | read-model、filtering、dashboard、exported | 0 | Dashboard 历史列表主入口：合并活动任务与已归档记录，按后端与状态过滤后返回带摘要的排序结果。 |
| pruneExpiredRecords | 函数 | 71–80 | 简单 | retention、pruning、utility | 0 | 按时间戳与保留窗口裁剪历史记录数组，避免无界增长。 |
| recordTaskDashboardHistoryFromJob | 函数 | 238–250 | 简单 | projection、archive、job-queue、exported | 0 | 从 JobQueue 的 Job 记录投影出历史记录，pass-through 类型任务直接跳过。 |
| recordTaskDashboardHistoryFromTaskRecord | 函数 | 252–285 | 简单 | projection、archive、skillrunner、exported | 0 | 把工作流任务记录转成归档历史条目，并复用 run store 状态补齐运行态信息。 |
| removeTaskDashboardHistoryByBackendAndRequestIds | 函数 | 157–186 | 简单 | cleanup、pruning、backend、exported | 0 | 后端被删除时按 backendId + requestId 精确摘除对应历史记录。 |
| summarizeTaskDashboardHistory | 函数 | 359–367 | 简单 | summary、aggregation、dashboard、exported | 0 | 汇总全量历史的状态分布与总数，供 Dashboard 首页概览使用。 |
| summarizeTaskDashboardHistoryScope | 函数 | 369–394 | 简单 | summary、aggregation、scoped、exported | 0 | 在指定后端范围内做同样的状态分布汇总，用于后端维度的历史视图。 |
| updateTaskDashboardHistoryStateByRequest | 函数 | 188–232 | 中等 | state-machine、update、history、exported | 0 | 按 requestId 把历史记录推进到新状态并刷新时间戳，供运行中任务回写。 |
| upsertTaskDashboardHistoryFromTaskRecord | 函数 | 287–309 | 简单 | upsert、archive、idempotent、exported | 0 | 按任务 id 幂等写入或更新历史条目，避免同一任务重复归档。 |
| writeHistoryRecords | 函数 | 58–69 | 简单 | persistence、storage、utility | 0 | 把历史记录数组写回插件首选项的 JSON 存储，是本模块唯一的持久化出口。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [manager.ts](../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [skillRunnerProviderStateMachine.ts](skillRunner/run/skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRunStore.ts](skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [taskRetentionPolicy.ts](taskRetentionPolicy.ts.md) | src/modules/taskRetentionPolicy.ts | 任务记录保留策略的单一事实源，导出统一的保留时长常量，供 Host Bridge operation store、Dashboard history 等持久化层共同引用。 |
| [taskRuntime.ts](taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardActions.ts](dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardRuntime.ts](dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [dashboardSnapshot.ts](dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [hostBridgeWorkflowControl.ts](hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [runSeam.ts](workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [skillRunnerRunDialog.ts](skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerSessionSyncManager.ts](skillRunner/run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [skillRunnerTaskReconciler.ts](skillRunner/run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [taskDashboardSnapshot.ts](taskDashboardSnapshot.ts.md) | src/modules/taskDashboardSnapshot.ts | Dashboard 快照的数据装配层：归一化后端实例、合并活动任务与历史任务行、把工作流提交队列中的排队单元投影为 Dashboard 行，并生成后端标签页键。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| cleanupTaskDashboardHistory | 函数 | 143–155 | 按当前保留策略触发历史清理并返回被删除的记录数。 |
| listTaskDashboardHistory | 函数 | 86–141 | Dashboard 历史列表主入口：合并活动任务与已归档记录，按后端与状态过滤后返回带摘要的排序结果。 |
| recordTaskDashboardHistoryFromJob | 函数 | 238–250 | 从 JobQueue 的 Job 记录投影出历史记录，pass-through 类型任务直接跳过。 |
| recordTaskDashboardHistoryFromTaskRecord | 函数 | 252–285 | 把工作流任务记录转成归档历史条目，并复用 run store 状态补齐运行态信息。 |
| removeTaskDashboardHistoryByBackendAndRequestIds | 函数 | 157–186 | 后端被删除时按 backendId + requestId 精确摘除对应历史记录。 |
| summarizeTaskDashboardHistory | 函数 | 359–367 | 汇总全量历史的状态分布与总数，供 Dashboard 首页概览使用。 |
| summarizeTaskDashboardHistoryScope | 函数 | 369–394 | 在指定后端范围内做同样的状态分布汇总，用于后端维度的历史视图。 |
| updateTaskDashboardHistoryStateByRequest | 函数 | 188–232 | 按 requestId 把历史记录推进到新状态并刷新时间戳，供运行中任务回写。 |
| upsertTaskDashboardHistoryFromTaskRecord | 函数 | 287–309 | 按任务 id 幂等写入或更新历史条目，避免同一任务重复归档。 |
