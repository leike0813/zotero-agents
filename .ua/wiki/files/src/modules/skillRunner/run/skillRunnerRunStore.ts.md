
# src/modules/skillRunner/run/skillRunnerRunStore.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerRunStore.ts -->

SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。
源码：[src/modules/skillRunner/run/skillRunnerRunStore.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerRunStore.ts)

## 符号（13）
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:applySkillRunnerRunEvent -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:attachSkillRunnerRequestId -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:buildProjectionCapabilities -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:buildSkillRunnerRunKey -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:createSkillRunnerRun -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:getSkillRunnerRunRecordByRequest -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:listSkillRunnerRunProjectionSummaries -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:parseRecord -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:projectSkillRunnerRun -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:recordSkillRunnerProgress -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:settleSkillRunnerRun -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:shouldAcceptStatusTransition -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:updateSkillRunnerRunStateByRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [applySkillRunnerRunEvent](../../../../../symbols/src/modules/skillRunner/run/skillRunnerRunStore.ts/applySkillRunnerRunEvent.md) | 函数 | 845–1088 | 复杂 | skillrunner、events、state-machine、core | 2 | 事件应用内核：校验状态迁移合法性、更新 run 记录并派生对应的事件与投影副作用。 |
| attachSkillRunnerRequestId | 函数 | 1171–1216 | 中等 | skillrunner、persistence、recovery | 0 | 把 run 关联到 requestId，使同一请求下的多个 run 可被统一查询与恢复。 |
| buildProjectionCapabilities | 函数 | 1504–1530 | 简单 | skillrunner、projection、ui-projection、core | 1 | 根据 run 当前状态计算 UI 可用能力（可取消、可回复、可重试等），供面板决定按钮可用性。 |
| buildSkillRunnerRunKey | 函数 | 510–536 | 简单 | skillrunner、identity、core | 1 | 构造 run 唯一键，区分单 run、本地 run 与 sequence step run 三种归属。 |
| createSkillRunnerRun | 函数 | 1090–1169 | 中等 | skillrunner、persistence、state-machine | 0 | 创建一条 run 记录并初始化状态、submit 阶段与关联工作流信息。 |
| getSkillRunnerRunRecordByRequest | 函数 | 1397–1430 | 中等 | skillrunner、query、core | 0 | 按 requestId 查找 run 记录，是自动回复观察与恢复判定共用的查询入口。 |
| listSkillRunnerRunProjectionSummaries | 函数 | 1612–1644 | 中等 | skillrunner、projection、performance、core | 0 | 批量生成 run 列表摘要，避免为列表渲染加载完整事件流。 |
| parseRecord | 函数 | 625–688 | 中等 | skillrunner、parsing、compatibility | 1 | 解析持久化的 run 记录，容错旧格式字段并输出统一形状的内部记录。 |
| projectSkillRunnerRun | 函数 | 1532–1585 | 中等 | skillrunner、projection、view-model、core | 1 | 把 run 记录投影为对外 DTO，含状态语义、能力标记、消息计数与最近事件摘要。 |
| recordSkillRunnerProgress | 函数 | 1222–1317 | 复杂 | skillrunner、events、high-frequency、core | 0 | 记录一次进度事件并更新 run 的 apply 阶段，是 transcript 高频更新路径的写入入口。 |
| settleSkillRunnerRun | 函数 | 1347–1381 | 中等 | skillrunner、state-machine、core | 0 | 把 run 收敛到终态，记录结果与耗时并停止后续事件写入。 |
| shouldAcceptStatusTransition | 函数 | 723–734 | 简单 | skillrunner、validation、state-machine、core | 1 | 判定状态迁移是否合法，阻止回退到终态等破坏性变更。 |
| updateSkillRunnerRunStateByRequest | 函数 | 1681–1750 | 中等 | skillrunner、state-machine、events、core | 0 | 按 requestId 批量更新 run 状态并发布订阅通知，供外部模块驱动状态前进。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantMessageCounts.ts](../../assistant/publication/assistantMessageCounts.ts.md) | src/modules/assistant/publication/assistantMessageCounts.ts | Assistant 消息计数工具：创建、规整与克隆消息计数三元组，并提供执行开始/结束与逐条自增的计数维护入口。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [localization.ts](../../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [manager.ts](../../../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [pluginStateStore.ts](../../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [sequenceStateStore.ts](../../workflowExecution/sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [skillRunnerProviderStateMachine.ts](skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerSkillDisplayRegistry.ts](../surface/skillRunnerSkillDisplayRegistry.ts.md) | src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts | Skill 展示注册表：保存后端上报的 skill 展示名快照，避免每次渲染都往返后端。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../../../providers/types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |
| [workflowRuntime.ts](../../workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applySeam.ts](../../workflowExecution/applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [manager.ts](../../../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [runSeam.ts](../../workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [sequenceRuntime.ts](../../workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [skillRunnerAutoReplyObserver.ts](skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerForegroundContinuation.ts](skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerRunDialog.ts](../surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerRunSettlement.ts](skillRunnerRunSettlement.ts.md) | src/modules/skillRunner/run/skillRunnerRunSettlement.ts | SkillRunner 运行的失败结算：把管理端响应与异常解析为语义化结论，按状态机规则将 run 标记为失败并停止对应的会话同步。 |
| [skillRunnerSessionSyncManager.ts](skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [skillRunnerTaskReconciler.ts](skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [skillRunnerWorkspaceSurface.ts](../surface/skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |
| [taskDashboardHistory.ts](../../taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [terminalResolution.ts](../../workflowExecution/terminalResolution.ts.md) | src/modules/workflowExecution/terminalResolution.ts | 工作流作业终态解析：把 ACP SkillRun、SkillRunner run store 与序列状态三个来源的观测归一到统一的作业槽位状态和终态结论。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [applySkillRunnerRunEvent](../../../../../symbols/src/modules/skillRunner/run/skillRunnerRunStore.ts/applySkillRunnerRunEvent.md) | 函数 | 845–1088 | 事件应用内核：校验状态迁移合法性、更新 run 记录并派生对应的事件与投影副作用。 |
| buildSkillRunnerRunKey | 函数 | 510–536 | 构造 run 唯一键，区分单 run、本地 run 与 sequence step run 三种归属。 |
| getSkillRunnerRunRecordByRequest | 函数 | 1397–1430 | 按 requestId 查找 run 记录，是自动回复观察与恢复判定共用的查询入口。 |
| listSkillRunnerRunProjectionSummaries | 函数 | 1612–1644 | 批量生成 run 列表摘要，避免为列表渲染加载完整事件流。 |
| projectSkillRunnerRun | 函数 | 1532–1585 | 把 run 记录投影为对外 DTO，含状态语义、能力标记、消息计数与最近事件摘要。 |
