
# src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts -->

SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。
源码：[src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts)

## 符号（8）
<!-- node: function:src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:applyStateSnapshot -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:consumeEventHistory -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:ensureSkillRunnerSessionSync -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:shouldDisconnectEventStream -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:shutdownSkillRunnerSessionSync -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:stopSessionSync -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:streamEventLoop -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:subscribeSkillRunnerSessionState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyStateSnapshot | 函数 | 181–241 | 中等 | synchronization、state、snapshot | 1 | 把后端返回的会话状态快照写入本地会话记录，作为事件流恢复的基线。 |
| consumeEventHistory | 函数 | 243–289 | 中等 | synchronization、event-stream、state | 1 | 消费快照之后的历史事件以补齐期间遗漏的状态变化，按事件顺序应用并跳过已覆盖部分。 |
| ensureSkillRunnerSessionSync | 函数 | 380–420 | 中等 | lifecycle、synchronization、entry-point、skillrunner | 0 | 确保指定会话存在一条活跃同步：已存在则复用，否则创建会话记录、加载快照并启动事件流循环。 |
| shouldDisconnectEventStream | 函数 | 157–164 | 简单 | state、predicate、event-stream | 1 | 判断会话是否已进入需要断开事件流的终止状态集合。 |
| shutdownSkillRunnerSessionSync | 函数 | 449–452 | 简单 | lifecycle、shutdown、skillrunner | 1 | 停止所有会话同步并等待后台任务收尾，用于插件关闭流程。 |
| stopSessionSync | 函数 | 422–437 | 简单 | lifecycle、cleanup、skillrunner | 1 | 停止单个会话的同步，关闭事件流并从活跃映射中移除。 |
| [streamEventLoop](../../../../../symbols/src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts/streamEventLoop.md) | 函数 | 291–378 | 复杂 | event-stream、loop、synchronization、skillrunner | 1 | 会话事件流的主循环：持续读取 SSE 帧、更新会话状态、发出变更通知，并在断流或终止态时按策略决定重连或退出。 |
| subscribeSkillRunnerSessionState | 函数 | 464–488 | 中等 | event-handler、subscription、skillrunner | 0 | 注册会话状态变更订阅者，并立即回放当前会话状态供调用方初始化。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [errors.ts](../../../providers/skillrunner/errors.ts.md) | src/providers/skillrunner/errors.ts | SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [skillRunnerBackendHealthRegistry.ts](../connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerManagementClientFactory.ts](../connection/skillRunnerManagementClientFactory.ts.md) | src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts | SkillRunner 管理客户端的构造工厂，把后端实例的 baseUrl 与管理鉴权的读取/持久化回调注入客户端，并统一本地化错误提示。 |
| [skillRunnerProviderStateMachine.ts](skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRunStore.ts](skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [taskDashboardHistory.ts](../../taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](../../workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [skillRunnerAsyncLifecycle.ts](../runtime/skillRunnerAsyncLifecycle.ts.md) | src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts | SkillRunner 异步子系统的统一停机编排：按固定顺序排空运行对话框、停止自动回复观察者与任务对账器、关闭会话同步并释放本地运行时租约，任一环节失败只记日志而不中断后续清理。 |
| [skillRunnerRunDialog.ts](../surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerRunSettlement.ts](skillRunnerRunSettlement.ts.md) | src/modules/skillRunner/run/skillRunnerRunSettlement.ts | SkillRunner 运行的失败结算：把管理端响应与异常解析为语义化结论，按状态机规则将 run 标记为失败并停止对应的会话同步。 |
| [skillRunnerSsoFacts.ts](../../skillRunnerSsoFacts.ts.md) | src/modules/skillRunnerSsoFacts.ts | SkillRunner 运行时 SSOT 事实的单一事实源：把 provider 状态集合、终态集合、后端健康探测节奏、事件流连接/断连状态、托管本地后端身份等硬编码常量集中导出，供治理脚本与文档一致性校验读取。 |
| [skillRunnerTaskReconciler.ts](skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureSkillRunnerSessionSync | 函数 | 380–420 | 确保指定会话存在一条活跃同步：已存在则复用，否则创建会话记录、加载快照并启动事件流循环。 |
| shutdownSkillRunnerSessionSync | 函数 | 449–452 | 停止所有会话同步并等待后台任务收尾，用于插件关闭流程。 |
| stopSessionSync | 函数 | 422–437 | 停止单个会话的同步，关闭事件流并从活跃映射中移除。 |
| subscribeSkillRunnerSessionState | 函数 | 464–488 | 注册会话状态变更订阅者，并立即回放当前会话状态供调用方初始化。 |
