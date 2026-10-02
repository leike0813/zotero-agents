
# src/modules/taskRuntime.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/taskRuntime.ts -->

工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。
源码：[src/modules/taskRuntime.ts](../../../../../src/modules/taskRuntime.ts)

## 符号（21）
<!-- node: function:src/modules/taskRuntime.ts:buildWorkflowTaskRecordFromJob -->
<!-- node: function:src/modules/taskRuntime.ts:clearFinishedWorkflowTasks -->
<!-- node: function:src/modules/taskRuntime.ts:emitTasksChanged -->
<!-- node: function:src/modules/taskRuntime.ts:ensureSkillRunnerRunStoreTaskBridge -->
<!-- node: function:src/modules/taskRuntime.ts:filterWorkflowTaskByScope -->
<!-- node: function:src/modules/taskRuntime.ts:isPreReadySkillRunnerTerminalFailure -->
<!-- node: function:src/modules/taskRuntime.ts:isSkillRunnerJobReadyForTaskProjection -->
<!-- node: function:src/modules/taskRuntime.ts:isSkillRunnerProtocolJob -->
<!-- node: function:src/modules/taskRuntime.ts:listWorkflowTasks -->
<!-- node: function:src/modules/taskRuntime.ts:listWorkflowTaskSummaries -->
<!-- node: function:src/modules/taskRuntime.ts:normalizeTaskListLimit -->
<!-- node: function:src/modules/taskRuntime.ts:parsePersistedTaskRecord -->
<!-- node: function:src/modules/taskRuntime.ts:reconcileWorkflowTaskProjectionsOnStartup -->
<!-- node: function:src/modules/taskRuntime.ts:recordWorkflowTaskUpdate -->
<!-- node: function:src/modules/taskRuntime.ts:removeWorkflowTasksByBackendAndRequestIds -->
<!-- node: function:src/modules/taskRuntime.ts:resolveRequestIdFromJob -->
<!-- node: function:src/modules/taskRuntime.ts:resolveSkillRunnerLifecycleStateFromJob -->
<!-- node: function:src/modules/taskRuntime.ts:shouldFailRecoveredProjection -->
<!-- node: function:src/modules/taskRuntime.ts:subscribeWorkflowTaskChanges -->
<!-- node: function:src/modules/taskRuntime.ts:subscribeWorkflowTasks -->
<!-- node: function:src/modules/taskRuntime.ts:updateWorkflowTaskStateByRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildWorkflowTaskRecordFromJob | 函数 | 287–407 | 复杂 | projection、core、job-queue、exported | 0 | 把 JobQueue 的 Job 记录完整投影为 WorkflowTaskRecord，补齐后端、skill、进度与时间字段。 |
| clearFinishedWorkflowTasks | 函数 | 728–740 | 简单 | cleanup、state-machine、exported | 0 | 一次性清除所有已终态任务，保留运行中与等待用户任务。 |
| emitTasksChanged | 函数 | 409–420 | 简单 | event、notification、subscription | 0 | 广播任务集合已变更的通知，驱动 Dashboard、工具栏气泡与侧边栏刷新。 |
| ensureSkillRunnerRunStoreTaskBridge | 函数 | 422–431 | 简单 | bridge、skillrunner、sync | 0 | 确保 SkillRunner run store 与任务记录双向桥接已建立，避免事件流断开后状态漂移。 |
| filterWorkflowTaskByScope | 函数 | 660–683 | 简单 | filtering、scope、utility | 0 | 按后端、状态与 requestId 范围过滤任务列表，Dashboard 与工具栏共用同一谓词。 |
| isPreReadySkillRunnerTerminalFailure | 函数 | 199–207 | 简单 | classification、failure、skillrunner | 0 | 识别「尚未 ready 就失败」的 SkillRunner Job，这类任务不应被当作正常运行中任务。 |
| isSkillRunnerJobReadyForTaskProjection | 函数 | 209–224 | 简单 | projection、guard、skillrunner、exported | 0 | 判断 SkillRunner Job 是否已具备投影条件：必须拿到 provider 结果或已进入终态。 |
| isSkillRunnerProtocolJob | 函数 | 168–180 | 简单 | classification、skillrunner、utility | 0 | 判定 Job 是否走 SkillRunner 协议路径，作为后续状态映射的分支条件。 |
| listWorkflowTasks | 函数 | 636–646 | 简单 | read-model、cache、query、exported | 0 | 按条件列出工作流任务，内部复用有界快照缓存以降低 Dashboard 高频读取成本。 |
| listWorkflowTaskSummaries | 函数 | 685–720 | 简单 | projection、summary、performance、exported | 0 | 返回任务的轻量摘要列表，去除完整 record 以压缩跨进程传输体积。 |
| normalizeTaskListLimit | 函数 | 652–658 | 简单 | validation、limits、utility | 0 | 规范化任务列表条数上限，缺省或非法值回退到默认上限。 |
| parsePersistedTaskRecord | 函数 | 449–563 | 中等 | persistence、validation、parsing | 0 | 解析并校验持久化的任务记录 JSON，容忍旧版本字段缺失并补默认值。 |
| reconcileWorkflowTaskProjectionsOnStartup | 函数 | 882–919 | 简单 | reconciliation、startup、recovery、exported | 0 | 插件启动时对账持久化任务与 SkillRunner run 投影，修复中断后残留的孤儿任务。 |
| recordWorkflowTaskUpdate | 函数 | 593–634 | 中等 | write-path、persistence、core、exported | 0 | 写入或更新一条任务记录并同步持久化与活动索引，是所有任务变更的唯一入口。 |
| removeWorkflowTasksByBackendAndRequestIds | 函数 | 742–774 | 简单 | cleanup、backend、exported | 0 | 按后端与 requestId 集合删除任务，用于后端下线与运行记录清理场景。 |
| resolveRequestIdFromJob | 函数 | 151–162 | 简单 | resolution、request-id、compat | 0 | 从 Job meta 中解析出 requestId，覆盖 ACP、SkillRunner sequence 与本地运行三种来源。 |
| resolveSkillRunnerLifecycleStateFromJob | 函数 | 226–256 | 简单 | state-machine、mapping、skillrunner | 0 | 把 Job 状态经 provider 状态机映射为任务生命周期状态，是 SkillRunner 与统一任务模型之间的桥。 |
| shouldFailRecoveredProjection | 函数 | 871–880 | 简单 | recovery、reconciliation、failure | 0 | 判定启动对账中恢复出来的投影是否应直接置为失败，避免留下永远无法终止的任务。 |
| subscribeWorkflowTaskChanges | 函数 | 929–935 | 简单 | subscription、event、incremental、exported | 0 | 订阅单条任务的变更事件，供工具栏气泡与活动任务角标做增量更新。 |
| subscribeWorkflowTasks | 函数 | 921–927 | 简单 | subscription、event、exported | 0 | 订阅任务集合的整体变更，返回取消订阅函数。 |
| updateWorkflowTaskStateByRequest | 函数 | 776–862 | 中等 | state-machine、update、core、exported | 0 | 按 requestId 推进任务状态并处理对应副作用（SkillRunner 提交、持久化与广播）。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [manager.ts](../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [skillRunnerProviderStateMachine.ts](skillRunner/run/skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRunStore.ts](skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunPersistence.ts](acp/skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunRecovery.ts](acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillRunStore.ts](acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTaskProjection.ts](acp/skillRun/acpSkillRunTaskProjection.ts.md) | src/modules/acp/skillRun/acpSkillRunTaskProjection.ts | 把 ACP Skill run 摘要投影为统一的工作流任务行，使 skill run 能与普通工作流任务在同一 Dashboard/队列中呈现。 |
| [applySeam.ts](workflowExecution/applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [assistantWorkspaceSidebar.ts](assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [dashboardActions.ts](dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardActiveTasks.ts](dashboardActiveTasks.ts.md) | src/modules/dashboardActiveTasks.ts | Dashboard 活跃任务投影：按可见 scope 过滤 ACP skill run 与工作流任务，产出需要人工关注的任务计数。 |
| [dashboardRuntime.ts](dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [dashboardSnapshot.ts](dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [duplicateGuardSeam.ts](workflowExecution/duplicateGuardSeam.ts.md) | src/modules/workflowExecution/duplicateGuardSeam.ts | 工作流重复执行守卫：比对进行中的任务摘要与待执行单元的身份（任务名、目标父条目、输入单元），识别重复后阻止提交并给出可读原因。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeWorkflowControl.ts](hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [runSeam.ts](workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [skillRunnerForegroundContinuation.ts](skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerRunDialog.ts](skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerRunStore.ts](skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [skillRunnerSessionSyncManager.ts](skillRunner/run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [skillRunnerTaskReconciler.ts](skillRunner/run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [taskDashboardHistory.ts](taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskDashboardSnapshot.ts](taskDashboardSnapshot.ts.md) | src/modules/taskDashboardSnapshot.ts | Dashboard 快照的数据装配层：归一化后端实例、合并活动任务与历史任务行、把工作流提交队列中的排队单元投影为 Dashboard 行，并生成后端标签页键。 |
| [testRuntimeCleanup.ts](testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workspaceTab.ts](workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildWorkflowTaskRecordFromJob | 函数 | 287–407 | 把 JobQueue 的 Job 记录完整投影为 WorkflowTaskRecord，补齐后端、skill、进度与时间字段。 |
| clearFinishedWorkflowTasks | 函数 | 728–740 | 一次性清除所有已终态任务，保留运行中与等待用户任务。 |
| isSkillRunnerJobReadyForTaskProjection | 函数 | 209–224 | 判断 SkillRunner Job 是否已具备投影条件：必须拿到 provider 结果或已进入终态。 |
| listWorkflowTasks | 函数 | 636–646 | 按条件列出工作流任务，内部复用有界快照缓存以降低 Dashboard 高频读取成本。 |
| listWorkflowTaskSummaries | 函数 | 685–720 | 返回任务的轻量摘要列表，去除完整 record 以压缩跨进程传输体积。 |
| reconcileWorkflowTaskProjectionsOnStartup | 函数 | 882–919 | 插件启动时对账持久化任务与 SkillRunner run 投影，修复中断后残留的孤儿任务。 |
| recordWorkflowTaskUpdate | 函数 | 593–634 | 写入或更新一条任务记录并同步持久化与活动索引，是所有任务变更的唯一入口。 |
| removeWorkflowTasksByBackendAndRequestIds | 函数 | 742–774 | 按后端与 requestId 集合删除任务，用于后端下线与运行记录清理场景。 |
| subscribeWorkflowTaskChanges | 函数 | 929–935 | 订阅单条任务的变更事件，供工具栏气泡与活动任务角标做增量更新。 |
| subscribeWorkflowTasks | 函数 | 921–927 | 订阅任务集合的整体变更，返回取消订阅函数。 |
| updateWorkflowTaskStateByRequest | 函数 | 776–862 | 按 requestId 推进任务状态并处理对应副作用（SkillRunner 提交、持久化与广播）。 |
