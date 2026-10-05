
# src/modules/skillRunner/run/skillRunnerTaskReconciler.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerTaskReconciler.ts -->

任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。
源码：[src/modules/skillRunner/run/skillRunnerTaskReconciler.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerTaskReconciler.ts)

## 符号（9）
<!-- node: function:src/modules/skillRunner/run/skillRunnerTaskReconciler.ts:collectRequestIdsForBackend -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerTaskReconciler.ts:mapSkillRunnerBackendStatusToJobState -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerTaskReconciler.ts:purgeSkillRunnerBackendReconcileState -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerTaskReconciler.ts:reconcileSkillRunnerBackendTaskLedgerOnce -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerTaskReconciler.ts:reconcileTerminalStateIntoTaskLedger -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerTaskReconciler.ts:resolveDoubleConfirmedTerminalRunState -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerTaskReconciler.ts:shutdownSkillRunnerTaskReconciler -->
<!-- node: class:src/modules/skillRunner/run/skillRunnerTaskReconciler.ts:SkillRunnerTaskReconciler -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerTaskReconciler.ts:startSkillRunnerTaskReconciler -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectRequestIdsForBackend | 函数 | 212–240 | 中等 | reconciliation、query、aggregation | 1 | 汇总某后端在本地各台账中仍存在的 requestId 集合，作为向该后端对账的查询范围。 |
| mapSkillRunnerBackendStatusToJobState | 函数 | 270–277 | 简单 | mapping、state、job-queue | 1 | 把后端运行状态映射为 jobQueue 的 JobState。 |
| purgeSkillRunnerBackendReconcileState | 函数 | 1046–1108 | 中等 | cleanup、reconciliation、memory | 0 | 清理某后端的对账上下文与恢复退避状态，通常在后端被移除或禁用时调用。 |
| reconcileSkillRunnerBackendTaskLedgerOnce | 函数 | 319–507 | 复杂 | reconciliation、state、skillrunner、core | 0 | 执行一轮完整对账：扫描各后端运行状态、与本地台账比对、回写终态并清理失效上下文，同时推送必要的 toast 反馈。 |
| reconcileTerminalStateIntoTaskLedger | 函数 | 242–268 | 中等 | reconciliation、state、persistence | 1 | 把某个 requestId 的终态写入 jobQueue、工作流任务与 Dashboard 历史三处台账，保持本地视图一致。 |
| resolveDoubleConfirmedTerminalRunState | 函数 | 184–210 | 中等 | reconciliation、state、policy | 1 | 在多次查询一致确认后判定运行已进入终态，未达确认次数时保持不确定而不落盘。 |
| shutdownSkillRunnerTaskReconciler | 函数 | 1026–1029 | 简单 | lifecycle、shutdown、cleanup | 0 | 停止对账循环并等待在途后台任务结束，供插件关闭时调用。 |
| SkillRunnerTaskReconciler | 类 | 509–1010 | 复杂 | reconciliation、scheduler、state、skillrunner | 0 | 对账循环的核心类：按后端与 requestId 维护上下文，执行恢复扫描、决定恢复或转交策略，并管理后台对账任务的生成与排空。 |
| startSkillRunnerTaskReconciler | 函数 | 1014–1016 | 简单 | lifecycle、scheduler、entry-point | 0 | 启动对账循环，登记后台任务并进入周期性对账调度。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](../../../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [errors.ts](../../../providers/skillrunner/errors.ts.md) | src/providers/skillrunner/errors.ts | SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。 |
| [feedbackSeam.ts](../../workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [manager.ts](../../../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [sequenceStateStore.ts](../../workflowExecution/sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [skillRunnerAutoReplyObserver.ts](skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerBackendHealthRegistry.ts](../connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerBackendToasts.ts](../surface/skillRunnerBackendToasts.ts.md) | src/modules/skillRunner/surface/skillRunnerBackendToasts.ts | 后端相关 toast 提示的构造与展示层：统一解析后端显示名、生成语义化提示文案与 payload，并区分插件托管的本地后端与外部后端。 |
| [skillRunnerForegroundContinuation.ts](skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerProviderStateMachine.ts](skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRunSettlement.ts](skillRunnerRunSettlement.ts.md) | src/modules/skillRunner/run/skillRunnerRunSettlement.ts | SkillRunner 运行的失败结算：把管理端响应与异常解析为语义化结论，按状态机规则将 run 标记为失败并停止对应的会话同步。 |
| [skillRunnerRunStore.ts](skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [skillRunnerSessionSyncManager.ts](skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [taskDashboardHistory.ts](../../taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [workflowRuntime.ts](../../workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](../../workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [skillRunnerAsyncLifecycle.ts](../runtime/skillRunnerAsyncLifecycle.ts.md) | src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts | SkillRunner 异步子系统的统一停机编排：按固定顺序排空运行对话框、停止自动回复观察者与任务对账器、关闭会话同步并释放本地运行时租约，任一环节失败只记日志而不中断后续清理。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| mapSkillRunnerBackendStatusToJobState | 函数 | 270–277 | 把后端运行状态映射为 jobQueue 的 JobState。 |
| reconcileSkillRunnerBackendTaskLedgerOnce | 函数 | 319–507 | 执行一轮完整对账：扫描各后端运行状态、与本地台账比对、回写终态并清理失效上下文，同时推送必要的 toast 反馈。 |
| shutdownSkillRunnerTaskReconciler | 函数 | 1026–1029 | 停止对账循环并等待在途后台任务结束，供插件关闭时调用。 |
| SkillRunnerTaskReconciler | 类 | 509–1010 | 对账循环的核心类：按后端与 requestId 维护上下文，执行恢复扫描、决定恢复或转交策略，并管理后台对账任务的生成与排空。 |
| startSkillRunnerTaskReconciler | 函数 | 1014–1016 | 启动对账循环，登记后台任务并进入周期性对账调度。 |
