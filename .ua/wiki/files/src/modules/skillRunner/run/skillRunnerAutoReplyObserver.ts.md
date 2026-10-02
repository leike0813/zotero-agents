
# src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts -->

SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。
源码：[src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts)

## 符号（9）
<!-- node: function:src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts:getSkillRunnerAutoReplyObserverState -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts:guardSkillRunnerAutoReplyBeforeUserReply -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts:handoff -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts:isAutoReplyObservedRecord -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts:maybeObserveSkillRunnerAutoReplyRun -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts:reconcileSkillRunnerAutoReplyAfterReplyError -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts:runObserverTick -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts:scheduleObserver -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts:stopSkillRunnerAutoReplyObserver -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getSkillRunnerAutoReplyObserverState | 函数 | 465–507 | 中等 | skillrunner、auto-reply、diagnostics、ui-projection | 0 | 汇总观察器状态快照，供 UI 展示与测试断言当前托管的 run 列表。 |
| guardSkillRunnerAutoReplyBeforeUserReply | 函数 | 388–421 | 中等 | skillrunner、auto-reply、validation、core | 0 | 用户回复前的守卫：若自动回复已接管该 run 则阻止并发回复，避免同一轮产生两次提交。 |
| handoff | 函数 | 248–275 | 中等 | skillrunner、auto-reply、orchestration | 0 | 执行交接：调用前台续跑把 run 推进到下一轮，并在交接后解除观察占用。 |
| isAutoReplyObservedRecord | 函数 | 139–155 | 简单 | skillrunner、auto-reply、validation | 1 | 判定 run 记录是否处于可被自动回复观察的状态，避免对终态 run 建立观察。 |
| maybeObserveSkillRunnerAutoReplyRun | 函数 | 323–376 | 中等 | skillrunner、auto-reply、orchestration、core | 0 | 观察入口：判定某个 run 是否已进入自动回复等待态，并按需启动或复用观察实例。 |
| reconcileSkillRunnerAutoReplyAfterReplyError | 函数 | 423–456 | 中等 | skillrunner、auto-reply、error-handling、core | 0 | 回复失败后的对账：确认后端真实状态并决定恢复自动回复观察或结束观察。 |
| runObserverTick | 函数 | 277–321 | 中等 | skillrunner、auto-reply、state-machine | 0 | 观察器单次心跳：拉取最新 run 状态、推进倒计时并在满足条件时触发续跑交接。 |
| scheduleObserver | 函数 | 167–178 | 简单 | skillrunner、auto-reply、scheduling | 1 | 安排下一次观察心跳，保证同一 run 不会同时存在多个待执行定时器。 |
| stopSkillRunnerAutoReplyObserver | 函数 | 223–239 | 简单 | skillrunner、auto-reply、cleanup、core | 0 | 停止指定 run 的观察，清理计时器并从状态中移除，幂等可重复调用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](../../../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [errors.ts](../../../providers/skillrunner/errors.ts.md) | src/providers/skillrunner/errors.ts | SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [skillRunnerBackendHealthRegistry.ts](../connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerForegroundContinuation.ts](skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerInteractiveAutoReply.ts](skillRunnerInteractiveAutoReply.ts.md) | src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts | 交互式自动回复开关模块：解析用户偏好并判定某个 run 是否应启用自动回复，同时构造对应的请求载荷。 |
| [skillRunnerProviderStateMachine.ts](skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRunStore.ts](skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runSeam.ts](../../workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [skillRunnerAsyncLifecycle.ts](../runtime/skillRunnerAsyncLifecycle.ts.md) | src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts | SkillRunner 异步子系统的统一停机编排：按固定顺序排空运行对话框、停止自动回复观察者与任务对账器、关闭会话同步并释放本地运行时租约，任一环节失败只记日志而不中断后续清理。 |
| [skillRunnerForegroundContinuation.ts](skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerRunDialog.ts](../surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerTaskReconciler.ts](skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getSkillRunnerAutoReplyObserverState | 函数 | 465–507 | 汇总观察器状态快照，供 UI 展示与测试断言当前托管的 run 列表。 |
| guardSkillRunnerAutoReplyBeforeUserReply | 函数 | 388–421 | 用户回复前的守卫：若自动回复已接管该 run 则阻止并发回复，避免同一轮产生两次提交。 |
| maybeObserveSkillRunnerAutoReplyRun | 函数 | 323–376 | 观察入口：判定某个 run 是否已进入自动回复等待态，并按需启动或复用观察实例。 |
| reconcileSkillRunnerAutoReplyAfterReplyError | 函数 | 423–456 | 回复失败后的对账：确认后端真实状态并决定恢复自动回复观察或结束观察。 |
| stopSkillRunnerAutoReplyObserver | 函数 | 223–239 | 停止指定 run 的观察，清理计时器并从状态中移除，幂等可重复调用。 |
