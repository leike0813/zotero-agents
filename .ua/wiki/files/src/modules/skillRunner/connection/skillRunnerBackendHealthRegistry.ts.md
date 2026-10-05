
# src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/connection](../../../../../modules/src/modules/skillRunner/connection.md)
<!-- node: file:src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts -->

SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。
源码：[src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts](../../../../../../../src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts)

## 符号（9）
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts:getSkillRunnerBackendVisibilityState -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts:markSkillRunnerBackendHealthFailure -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts:markSkillRunnerBackendHealthSuccess -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts:pruneSkillRunnerBackendHealth -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts:registerSkillRunnerBackendForHealthTracking -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts:shouldAutoDisableSkillRunnerBackend -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts:shouldProbeSkillRunnerBackendNow -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts:subscribeSkillRunnerBackendHealth -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts:syncSkillRunnerBackendHealthForConfiguredBackends -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getSkillRunnerBackendVisibilityState | 函数 | 196–216 | 中等 | health-check、projection、ui | 1 | 综合配置开关与健康状态推导后端在 UI 中应呈现的可见性/可用性状态。 |
| markSkillRunnerBackendHealthFailure | 函数 | 350–388 | 中等 | health-check、state、backoff | 1 | 记录一次探针失败，累加失败计数、更新最后错误与时间戳并推进退避节奏。 |
| markSkillRunnerBackendHealthSuccess | 函数 | 322–348 | 中等 | health-check、state、skillrunner | 1 | 记录一次探针成功，清零失败计数、刷新最近成功时间并解除延迟探针。 |
| pruneSkillRunnerBackendHealth | 函数 | 418–438 | 简单 | registry、cleanup、memory | 0 | 清理长时间不再被访问或已停用追踪的后端条目，避免注册表无界增长。 |
| registerSkillRunnerBackendForHealthTracking | 函数 | 142–163 | 简单 | registry、health-check、skillrunner | 1 | 登记一个 SkillRunner 后端进入健康跟踪，初始化或复用其健康状态条目。 |
| shouldAutoDisableSkillRunnerBackend | 函数 | 277–292 | 简单 | health-check、policy、skillrunner | 0 | 当后端连续失败达到阈值且近期无成功记录时，建议将其自动禁用。 |
| shouldProbeSkillRunnerBackendNow | 函数 | 256–275 | 简单 | health-check、backoff、scheduling | 1 | 按指数退避与启用防抖判断某个后端此刻是否应当发起健康探针。 |
| subscribeSkillRunnerBackendHealth | 函数 | 440–447 | 简单 | event-handler、health-check、subscription | 0 | 注册健康状态变更订阅者，供 UI 与协调器感知探针结果。 |
| syncSkillRunnerBackendHealthForConfiguredBackends | 函数 | 223–254 | 中等 | registry、synchronization、health-check | 0 | 把注册表状态与当前已配置后端对齐：新增后端进入跟踪、移除的后端清理条目、配置禁用的后端直接标记为禁用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](../../workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [client.ts](../../../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [dashboardRuntime.ts](../../dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [dashboardSnapshot.ts](../../dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [managementClient.ts](../../../providers/skillrunner/managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [skillRunnerAutoReplyObserver.ts](../run/skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerBackendReachabilityCoordinator.ts](skillRunnerBackendReachabilityCoordinator.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts | 后端可达性探测的调度协调器：周期性扫描已配置后端、通过 management client 发起轻量探针，并把判定为长期不可达的后端自动禁用并弹出提示 toast。 |
| [skillRunnerLocalRuntimeManager.ts](../runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [skillRunnerRunDialog.ts](../surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerSessionSyncManager.ts](../run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [skillRunnerSsoFacts.ts](../../skillRunnerSsoFacts.ts.md) | src/modules/skillRunnerSsoFacts.ts | SkillRunner 运行时 SSOT 事实的单一事实源：把 provider 状态集合、终态集合、后端健康探测节奏、事件流连接/断连状态、托管本地后端身份等硬编码常量集中导出，供治理脚本与文档一致性校验读取。 |
| [skillRunnerTaskReconciler.ts](../run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workflowExecute.ts](../../workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getSkillRunnerBackendVisibilityState | 函数 | 196–216 | 综合配置开关与健康状态推导后端在 UI 中应呈现的可见性/可用性状态。 |
| markSkillRunnerBackendHealthFailure | 函数 | 350–388 | 记录一次探针失败，累加失败计数、更新最后错误与时间戳并推进退避节奏。 |
| markSkillRunnerBackendHealthSuccess | 函数 | 322–348 | 记录一次探针成功，清零失败计数、刷新最近成功时间并解除延迟探针。 |
| pruneSkillRunnerBackendHealth | 函数 | 418–438 | 清理长时间不再被访问或已停用追踪的后端条目，避免注册表无界增长。 |
| registerSkillRunnerBackendForHealthTracking | 函数 | 142–163 | 登记一个 SkillRunner 后端进入健康跟踪，初始化或复用其健康状态条目。 |
| shouldAutoDisableSkillRunnerBackend | 函数 | 277–292 | 当后端连续失败达到阈值且近期无成功记录时，建议将其自动禁用。 |
| shouldProbeSkillRunnerBackendNow | 函数 | 256–275 | 按指数退避与启用防抖判断某个后端此刻是否应当发起健康探针。 |
| subscribeSkillRunnerBackendHealth | 函数 | 440–447 | 注册健康状态变更订阅者，供 UI 与协调器感知探针结果。 |
| syncSkillRunnerBackendHealthForConfiguredBackends | 函数 | 223–254 | 把注册表状态与当前已配置后端对齐：新增后端进入跟踪、移除的后端清理条目、配置禁用的后端直接标记为禁用。 |
