
# src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts -->

SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。
源码：[src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts)

## 符号（4）
<!-- node: function:src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts:normalizeEventKind -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts:normalizeStatusWithGuard -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts:validateEventOrder -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts:validateTransition -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| normalizeEventKind | 函数 | 125–153 | 简单 | state-machine、normalization、event-ordering | 1 | 把后端事件类型规范化为内部事件类别，未知类型回退为不透明类别以便记录。 |
| normalizeStatusWithGuard | 函数 | 181–204 | 简单 | state-machine、normalization、validation | 1 | 规范化后端上报的状态字符串，并在无法识别时保留守卫 violation 而非静默吞掉。 |
| validateEventOrder | 函数 | 263–345 | 中等 | state-machine、validation、event-ordering | 0 | 按事件类别校验到达顺序（如终态后不得再出现进行中事件），并识别与当前状态冲突的事件种类。 |
| validateTransition | 函数 | 219–261 | 中等 | state-machine、validation、skillrunner | 1 | 校验从当前状态到目标状态的转移是否合法，非法时返回状态机 violation 描述。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applySeam.ts](../../workflowExecution/applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [assistantWorkspaceSidebar.ts](../../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [client.ts](../../../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [contracts.ts](../../../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardSnapshot.ts](../../dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [manager.ts](../../../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [skillRunnerAutoReplyObserver.ts](skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerForegroundContinuation.ts](skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerRecoverableState.ts](skillRunnerRecoverableState.ts.md) | src/modules/skillRunner/run/skillRunnerRecoverableState.ts | 可恢复状态判定：判断哪些 SkillRunner 任务已具备恢复条件、哪些失败属于不可恢复，是重启恢复决策的最小判定单元。 |
| [skillRunnerRunDialog.ts](../surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerRunSettlement.ts](skillRunnerRunSettlement.ts.md) | src/modules/skillRunner/run/skillRunnerRunSettlement.ts | SkillRunner 运行的失败结算：把管理端响应与异常解析为语义化结论，按状态机规则将 run 标记为失败并停止对应的会话同步。 |
| [skillRunnerRunStateProjection.ts](skillRunnerRunStateProjection.ts.md) | src/modules/skillRunner/run/skillRunnerRunStateProjection.ts | 把运行状态与待处理 owner 投影为 UI 可直接消费的组合视图，包含等待归属方、是否应清除 pending 以及状态机违规信息。 |
| [skillRunnerRunStore.ts](skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [skillRunnerSessionSyncManager.ts](skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [skillRunnerSsoFacts.ts](../../skillRunnerSsoFacts.ts.md) | src/modules/skillRunnerSsoFacts.ts | SkillRunner 运行时 SSOT 事实的单一事实源：把 provider 状态集合、终态集合、后端健康探测节奏、事件流连接/断连状态、托管本地后端身份等硬编码常量集中导出，供治理脚本与文档一致性校验读取。 |
| [skillRunnerTaskReconciler.ts](skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [taskDashboardHistory.ts](../../taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| normalizeEventKind | 函数 | 125–153 | 把后端事件类型规范化为内部事件类别，未知类型回退为不透明类别以便记录。 |
| normalizeStatusWithGuard | 函数 | 181–204 | 规范化后端上报的状态字符串，并在无法识别时保留守卫 violation 而非静默吞掉。 |
| validateEventOrder | 函数 | 263–345 | 按事件类别校验到达顺序（如终态后不得再出现进行中事件），并识别与当前状态冲突的事件种类。 |
| validateTransition | 函数 | 219–261 | 校验从当前状态到目标状态的转移是否合法，非法时返回状态机 violation 描述。 |
