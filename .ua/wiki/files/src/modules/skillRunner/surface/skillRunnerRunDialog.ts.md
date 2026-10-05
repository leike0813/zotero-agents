
# src/modules/skillRunner/surface/skillRunnerRunDialog.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/surface](../../../../../modules/src/modules/skillRunner/surface.md)
<!-- node: file:src/modules/skillRunner/surface/skillRunnerRunDialog.ts -->

SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。
源码：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts](../../../../../../../src/modules/skillRunner/surface/skillRunnerRunDialog.ts)

## 符号（20）
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:buildRunWorkspaceModel -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:dispatchSkillRunnerWorkspaceAction -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:enforceRunDialogStreamPoolForBackend -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:getSkillRunnerWorkspaceReadModel -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:getSkillRunnerWorkspaceSelectedOwner -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:handleRunDialogActionForEntry -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:listSkillRunnerWorkspaceTaskGroups -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:normalizeRunDialogPendingState -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:notifySkillRunnerWorkspacePublicationChange -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:projectSkillRunnerConversationEntriesToTranscriptItems -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:publishRunWorkspaceState -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:readSkillRunnerTranscriptRegion -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:readSkillRunnerWorkspaceOwnerDetails -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:refreshWorkspaceSnapshot -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:resolveRunWorkspaceTranscriptMessages -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:selectWorkspaceTask -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:shutdownRunDialogRuntime -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:startRunObserver -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:subscribeSkillRunnerWorkspaceChanges -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:toRunDialogConversationEntry -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [buildRunWorkspaceModel](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/buildRunWorkspaceModel.md) | 函数 | 1765–2099 | 复杂 | view-model、aggregation、ui、skillrunner | 1 | 从运行条目、任务台账与后端列表汇总出完整的工作区模型，是面板渲染的主要数据来源。 |
| dispatchSkillRunnerWorkspaceAction | 函数 | 4803–4864 | 中等 | event-handler、dispatch、entry-point、skillrunner | 0 | SkillRunner 工作区动作的统一分发入口，校验动作信封后路由到条目级处理器。 |
| [enforceRunDialogStreamPoolForBackend](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/enforceRunDialogStreamPoolForBackend.md) | 函数 | 4060–4088 | 中等 | concurrency、resource-management、event-stream | 2 | 对每个后端维持有界的事件流并发，超出时淘汰最久未聚焦或已降级的流。 |
| [getSkillRunnerWorkspaceReadModel](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/getSkillRunnerWorkspaceReadModel.md) | 函数 | 5400–5541 | 复杂 | view-model、ui、projection、skillrunner | 2 | 构建 SkillRunner 工作区的只读视图模型，包含任务分组、选中项、状态徽标与可执行动作。 |
| [getSkillRunnerWorkspaceSelectedOwner](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/getSkillRunnerWorkspaceSelectedOwner.md) | 函数 | 5249–5263 | 简单 | query、selection、assistant、skillrunner | 2 | 返回工作区当前选中的 owner 标识，供 surface 构造导航与详情区域时定位展示对象。 |
| [handleRunDialogActionForEntry](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/handleRunDialogActionForEntry.md) | 函数 | 3383–4024 | 复杂 | event-handler、ui、interaction、skillrunner | 1 | 处理单个运行条目的用户动作：回复、鉴权导入、权限批准、取消与重试，并把结果回写到后端。 |
| listSkillRunnerWorkspaceTaskGroups | 函数 | 5265–5276 | 简单 | query、view-model、ui | 1 | 列出工作区任务分组，供侧边栏导航与选中逻辑使用。 |
| [normalizeRunDialogPendingState](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/normalizeRunDialogPendingState.md) | 函数 | 1180–1283 | 复杂 | normalization、state、interaction、skillrunner | 1 | 把后端上报的 pending 交互规范化为统一结构，覆盖用户交互、鉴权与权限等各类待处理形态。 |
| notifySkillRunnerWorkspacePublicationChange | 函数 | 5195–5247 | 中等 | publication、event-handler、assistant | 1 | 把工作区变更映射为 Assistant Workspace 的发布类型并通知发布层刷新对应区域。 |
| [projectSkillRunnerConversationEntriesToTranscriptItems](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/projectSkillRunnerConversationEntriesToTranscriptItems.md) | 函数 | 5796–5964 | 复杂 | transcript、projection、ui、skillrunner | 1 | 把会话条目投影为 transcript item，按语义身份合并过程性消息并保留工具调用与中间步骤。 |
| publishRunWorkspaceState | 函数 | 2359–2388 | 中等 | publication、event-handler、ui | 1 | 把工作区状态发布给订阅者，并按变更签名判断是否需要触发实际渲染。 |
| readSkillRunnerTranscriptRegion | 函数 | 5974–6067 | 复杂 | transcript、pagination、ui、performance | 0 | 读取 transcript 区域的可见页内容，支撑冷启动分页读取而不要求先完成全量镜像。 |
| readSkillRunnerWorkspaceOwnerDetails | 函数 | 5601–5775 | 复杂 | view-model、details、ui、skillrunner | 0 | 读取当前选中 owner 的详情字段（后端、请求、状态、重试时间等）供详情抽屉展示。 |
| [refreshWorkspaceSnapshot](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/refreshWorkspaceSnapshot.md) | 函数 | 4568–4656 | 复杂 | refresh、state、ui、skillrunner | 2 | 刷新工作区快照：按刷新原因合并请求、重建模型并向订阅者发布变更。 |
| [resolveRunWorkspaceTranscriptMessages](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/resolveRunWorkspaceTranscriptMessages.md) | 函数 | 2241–2335 | 复杂 | transcript、ui、skillrunner | 1 | 解析工作区应展示的 transcript 消息集合，合并本地生成消息与后端历史并应用可见性边界。 |
| selectWorkspaceTask | 函数 | 4503–4566 | 中等 | ui、selection、state、transcript | 0 | 切换工作区选中任务，发布 owner 优先的空/加载快照并按需后台水合历史 transcript。 |
| shutdownRunDialogRuntime | 函数 | 4090–4121 | 中等 | lifecycle、shutdown、cleanup、skillrunner | 0 | 关闭运行工作台运行时：停止所有观察器、清理宿主状态并排空后台任务。 |
| startRunObserver | 函数 | 2654–3381 | 复杂 | event-stream、lifecycle、state、skillrunner | 0 | 为运行条目启动事件观察：接入后端事件流、维护 pending 交互、驱动工作区快照刷新，并在断流时按策略恢复。 |
| subscribeSkillRunnerWorkspaceChanges | 函数 | 5085–5092 | 简单 | event-handler、subscription、ui | 0 | 注册工作区变更订阅者，供侧边栏与发布层感知状态更新。 |
| toRunDialogConversationEntry | 函数 | 837–903 | 中等 | normalization、transcript、skillrunner | 1 | 把后端消息转换为工作台会话条目，规范角色、消息类型、重试次数与关联标识。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunInteractionFiles.ts](../../acp/skillRun/acpSkillRunInteractionFiles.ts.md) | src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantInteractionContract.ts](../../../shared/assistantInteractionContract.ts.md) | src/shared/assistantInteractionContract.ts | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [assistantMessageCounts.ts](../../assistant/publication/assistantMessageCounts.ts.md) | src/modules/assistant/publication/assistantMessageCounts.ts | Assistant 消息计数工具：创建、规整与克隆消息计数三元组，并提供执行开始/结束与逐条自增的计数维护入口。 |
| [assistantSidebarViewModel.ts](../../assistant/workspace/assistantSidebarViewModel.ts.md) | src/modules/assistant/workspace/assistantSidebarViewModel.ts | 侧边栏视图模型：构造 scope key 与 render hints，生成侧边栏快照并按区域剥离 transcript 数据以隔离重渲染。 |
| [assistantWorkspacePublication.ts](../../assistant/publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspaceTranscriptPublication.ts](../../assistant/publication/assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [displayName.ts](../../../backends/displayName.ts.md) | src/backends/displayName.ts | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [errors.ts](../../../providers/skillrunner/errors.ts.md) | src/providers/skillrunner/errors.ts | SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。 |
| [feedbackSeam.ts](../../workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [managementClient.ts](../../../providers/skillrunner/managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [runtimeCompatibility.ts](../../../utils/runtimeCompatibility.ts.md) | src/utils/runtimeCompatibility.ts | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [runtimeFileTransfer.ts](../../runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [skillRunnerAutoReplyObserver.ts](../run/skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerBackendHealthRegistry.ts](../connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerBackendToasts.ts](skillRunnerBackendToasts.ts.md) | src/modules/skillRunner/surface/skillRunnerBackendToasts.ts | 后端相关 toast 提示的构造与展示层：统一解析后端显示名、生成语义化提示文案与 payload，并区分插件托管的本地后端与外部后端。 |
| [skillRunnerForegroundContinuation.ts](../run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerHandshake.ts](../connection/skillRunnerHandshake.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshake.ts | SkillRunner 协议握手层：向后端查询其支持的能力与协议集合并做带 TTL 的缓存，同时提供执行前断言所需协议的校验函数。 |
| [skillRunnerHandshakeProtocol.ts](../connection/skillRunnerHandshakeProtocol.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts | 握手协议的契约层：定义请求/响应 schema id、已支持的协议常量集合，以及旧版后端的兼容能力合成与交互文件能力协商逻辑。 |
| [skillRunnerHostBridgePermissionRegistry.ts](../../hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts.md) | src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts | SkillRunner 侧的 Host Bridge 权限注册表：保存待审批权限请求、发布订阅通知并支持按请求 ID 结算。 |
| [skillRunnerManagementClientFactory.ts](../connection/skillRunnerManagementClientFactory.ts.md) | src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts | SkillRunner 管理客户端的构造工厂，把后端实例的 baseUrl 与管理鉴权的读取/持久化回调注入客户端，并统一本地化错误提示。 |
| [skillRunnerProviderStateMachine.ts](../run/skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRunSettlement.ts](../run/skillRunnerRunSettlement.ts.md) | src/modules/skillRunner/run/skillRunnerRunSettlement.ts | SkillRunner 运行的失败结算：把管理端响应与异常解析为语义化结论，按状态机规则将 run 标记为失败并停止对应的会话同步。 |
| [skillRunnerRunStore.ts](../run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [skillRunnerSessionSyncManager.ts](../run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [skillRunnerSidebarModel.ts](skillRunnerSidebarModel.ts.md) | src/modules/skillRunner/surface/skillRunnerSidebarModel.ts | SkillRunner 侧边栏的展示模型：把工作区任务按上下文相关性分组为运行中/已完成/待处理区块，并挑选应默认聚焦的任务键。 |
| [taskDashboardHistory.ts](../../taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskDashboardSnapshot.ts](../../taskDashboardSnapshot.ts.md) | src/modules/taskDashboardSnapshot.ts | Dashboard 快照的数据装配层：归一化后端实例、合并活动任务与历史任务行、把工作流提交队列中的排队单元投影为 Dashboard 行，并生成后端标签页键。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [window.ts](../../../utils/window.ts.md) | src/utils/window.ts | 判断窗口对象是否仍然存活（未 closed 且不是 dead wrapper），用于避免重复打开同一窗口。 |
| [workflowSubmissionQueue.ts](../../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [workflowSubmissionQueueContracts.ts](../../../jobQueue/workflowSubmissionQueueContracts.ts.md) | src/jobQueue/workflowSubmissionQueueContracts.ts | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |
| [ztoolkit.ts](../../../utils/ztoolkit.ts.md) | src/utils/ztoolkit.ts | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceActionRouter.ts](../../assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublicationHost.ts](../../assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceSidebar.ts](../../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [productionExecution.ts](../../workflow/productionExecution.ts.md) | src/modules/workflow/productionExecution.ts | 工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。 |
| [skillRunnerAsyncLifecycle.ts](../runtime/skillRunnerAsyncLifecycle.ts.md) | src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts | SkillRunner 异步子系统的统一停机编排：按固定顺序排空运行对话框、停止自动回复观察者与任务对账器、关闭会话同步并释放本地运行时租约，任一环节失败只记日志而不中断后续清理。 |
| [skillRunnerWorkspaceSurface.ts](skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| dispatchSkillRunnerWorkspaceAction | 函数 | 4803–4864 | SkillRunner 工作区动作的统一分发入口，校验动作信封后路由到条目级处理器。 |
| [getSkillRunnerWorkspaceReadModel](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/getSkillRunnerWorkspaceReadModel.md) | 函数 | 5400–5541 | 构建 SkillRunner 工作区的只读视图模型，包含任务分组、选中项、状态徽标与可执行动作。 |
| [getSkillRunnerWorkspaceSelectedOwner](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/getSkillRunnerWorkspaceSelectedOwner.md) | 函数 | 5249–5263 | 返回工作区当前选中的 owner 标识，供 surface 构造导航与详情区域时定位展示对象。 |
| listSkillRunnerWorkspaceTaskGroups | 函数 | 5265–5276 | 列出工作区任务分组，供侧边栏导航与选中逻辑使用。 |
| [projectSkillRunnerConversationEntriesToTranscriptItems](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/projectSkillRunnerConversationEntriesToTranscriptItems.md) | 函数 | 5796–5964 | 把会话条目投影为 transcript item，按语义身份合并过程性消息并保留工具调用与中间步骤。 |
| readSkillRunnerTranscriptRegion | 函数 | 5974–6067 | 读取 transcript 区域的可见页内容，支撑冷启动分页读取而不要求先完成全量镜像。 |
| readSkillRunnerWorkspaceOwnerDetails | 函数 | 5601–5775 | 读取当前选中 owner 的详情字段（后端、请求、状态、重试时间等）供详情抽屉展示。 |
| [refreshWorkspaceSnapshot](../../../../../symbols/src/modules/skillRunner/surface/skillRunnerRunDialog.ts/refreshWorkspaceSnapshot.md) | 函数 | 4568–4656 | 刷新工作区快照：按刷新原因合并请求、重建模型并向订阅者发布变更。 |
| selectWorkspaceTask | 函数 | 4503–4566 | 切换工作区选中任务，发布 owner 优先的空/加载快照并按需后台水合历史 transcript。 |
| shutdownRunDialogRuntime | 函数 | 4090–4121 | 关闭运行工作台运行时：停止所有观察器、清理宿主状态并排空后台任务。 |
| subscribeSkillRunnerWorkspaceChanges | 函数 | 5085–5092 | 注册工作区变更订阅者，供侧边栏与发布层感知状态更新。 |
