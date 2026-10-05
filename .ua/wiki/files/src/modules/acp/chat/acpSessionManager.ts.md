
# src/modules/acp/chat/acpSessionManager.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpSessionManager.ts -->

ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。
源码：[src/modules/acp/chat/acpSessionManager.ts](../../../../../../../src/modules/acp/chat/acpSessionManager.ts)

## 符号（22）
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:archiveAcpConversation -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:bindAdapter -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:buildAcpDiagnosticsBundle -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:cancelAcpConversationPrompt -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:cloneSnapshotValue -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:connectAcpConversation -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:deleteActiveAcpConversation -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:enforceAcpChatLiveAdapterLimit -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:ensureAdapter -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:ensureInitialized -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:ensureSession -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:getOrCreateSessionRuntime -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:handleSessionUpdate -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:hydrateSnapshot -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:inspectAcpChatSessionTimers -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:pruneAcpChatSessionRuntimesForBackends -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:refreshAcpBackends -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:scheduleWorkspaceChange -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:sendAcpConversationPrompt -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:setAcpConversationModel -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:setAcpConversationReasoningEffort -->
<!-- node: function:src/modules/acp/chat/acpSessionManager.ts:shutdownAcpSessionManager -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| archiveAcpConversation | 函数 | 3200–3309 | 复杂 | 会话管理、持久化、acp-chat | 0 | 归档会话：先落盘 transcript 与状态，再从可见会话列表移除但保留可恢复记录。 |
| bindAdapter | 函数 | 1766–1848 | 复杂 | 连接管理、acp-chat、adapter | 0 | 把连接 adapter 绑定到会话 runtime：完成 attach 后的语义 trace 绑定、显示模式恢复与能力探测。 |
| buildAcpDiagnosticsBundle | 函数 | 3717–3772 | 中等 | 诊断、acp-chat、调试 | 1 | 汇总当前会话的诊断信息：adapter 状态、pending 权限、timer 巡检与 trace 开关。 |
| cancelAcpConversationPrompt | 函数 | 3094–3137 | 中等 | 取消、prompt、acp-chat | 0 | 取消当前 prompt：发出 cancel 请求并按 grace period 决定强停 adapter 的时机。 |
| cloneSnapshotValue | 函数 | 403–441 | 中等 | 快照、不可变性、工具函数 | 0 | 深拷贝快照中的可变结构，保证对外只读视图不会反向污染 runtime 内部状态。 |
| connectAcpConversation | 函数 | 2730–2770 | 中等 | 连接管理、会话生命周期、acp-chat | 1 | 连接当前选中的 ACP 会话：确保 session 与 adapter 就绪，并按需恢复 transcript 摘要。 |
| deleteActiveAcpConversation | 函数 | 3311–3386 | 复杂 | 会话管理、删除、acp-chat | 0 | 删除当前会话的持久化痕迹并断开 adapter，随后切回可用会话或新建空会话。 |
| enforceAcpChatLiveAdapterLimit | 函数 | 683–716 | 中等 | 内存治理、连接管理、acp-chat | 0 | 限制同时保持 live 的 ACP Chat adapter 数量，超限时关闭最旧的空闲连接以控制内存。 |
| ensureAdapter | 函数 | 1973–2174 | 复杂 | 连接管理、acp-chat、adapter | 0 | 确保会话具备可用的 ACP adapter：处理本地 placeholder 的 attach、远端重连与 attach 结果落地。 |
| ensureInitialized | 函数 | 443–477 | 中等 | 初始化、会话生命周期、acp-chat | 0 | 幂等初始化会话管理器：加载后端注册表、恢复持久化选择并准备默认 runtime。 |
| ensureSession | 函数 | 2283–2446 | 复杂 | 连接管理、协议处理、acp-chat | 0 | 确保远端 ACP session 存在并处于 new/loaded 状态，负责 initialize、session/new 与 capability 协商。 |
| getOrCreateSessionRuntime | 函数 | 598–652 | 中等 | 会话生命周期、惰性初始化、acp-chat | 0 | 按 backendId+conversationId 惰性创建会话 runtime，是所有会话操作的唯一入口。 |
| handleSessionUpdate | 函数 | 1594–1764 | 复杂 | 事件分派、acp-chat、协议处理 | 0 | ACP session/update 的领域分发入口：识别权限请求、可用命令、认证要求与消息事件，并路由到 transcript、workspace 与诊断路径。 |
| hydrateSnapshot | 函数 | 479–553 | 复杂 | 快照、持久化、hydrate | 0 | 把持久化快照 hydrate 进 runtime：恢复状态、transcript 摘要与消息计数，并标记为非 placeholder。 |
| inspectAcpChatSessionTimers | 函数 | 982–1136 | 复杂 | 诊断、定时器、acp-chat | 0 | 巡检所有会话的定时器：把 persist、workspace change、transcript 写入等挂起任务分类列出，供诊断与调试使用。 |
| pruneAcpChatSessionRuntimesForBackends | 函数 | 3774–3848 | 复杂 | 内存治理、清理、acp-chat | 0 | 按 backend 清理会话 runtime 与后台 transcript 镜像，释放内存并同步关闭 adapter。 |
| refreshAcpBackends | 函数 | 1195–1243 | 中等 | 后端管理、acp-chat、缓存 | 0 | 从后端注册表刷新可用 ACP backend 列表，并清理已失效实例的缓存。 |
| scheduleWorkspaceChange | 函数 | 956–980 | 中等 | 事件派发、合并节流、workspace | 0 | 调度 workspace change 合并发布；transcript 类更新与 chrome 类更新走不同合并窗口。 |
| sendAcpConversationPrompt | 函数 | 2833–3092 | 复杂 | prompt、流式消费、acp-chat | 0 | 发送一轮 prompt 的完整实现：注入宿主上下文、装配 adapter、流式消费并维护执行进度与 transcript 事件。 |
| setAcpConversationModel | 函数 | 3534–3585 | 中等 | 模型选择、状态同步、acp-chat | 0 | 切换会话模型，同步 raw/display 模型选择并把不可用状态回写为本地选项。 |
| setAcpConversationReasoningEffort | 函数 | 3587–3666 | 复杂 | 模型设置、推理强度、容错 | 0 | 切换会话推理强度，区分 applied / unavailable / fallback 三种结果并相应更新本地状态。 |
| shutdownAcpSessionManager | 函数 | 3850–3902 | 中等 | 生命周期、刷盘、acp-chat | 0 | 关闭管理器：刷盘所有挂起写入与 workspace change，断开全部 adapter 并停止定时器。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatDiagnosticAuditTrail.ts](../diagnostics/acpChatDiagnosticAuditTrail.ts.md) | src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts | ACP Chat 诊断审计轨迹：按 backendId+conversationId 组织 owner，把 warn/error 级诊断证据写入审计文件，并管理 owner 的激活、刷盘与丢弃。 |
| [acpChatSkillInjection.ts](acpChatSkillInjection.ts.md) | src/modules/acp/chat/acpChatSkillInjection.ts | ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。 |
| [acpChatTranscriptMirror.ts](acpChatTranscriptMirror.ts.md) | src/modules/acp/chat/acpChatTranscriptMirror.ts | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [acpChatWorkspaceDataPlane.ts](acpChatWorkspaceDataPlane.ts.md) | src/modules/acp/chat/acpChatWorkspaceDataPlane.ts | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [acpChatWorkspaceEmissionFacade.ts](acpChatWorkspaceEmissionFacade.ts.md) | src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts | ACP Chat workspace 事件发布面的宿主槽位模块：定义 emission 类型契约与 register/get 访问器，使 acpSessionManager 域核心无需运行时 import 数据面即可发布事件。 |
| [acpConnectionAdapter.ts](../transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpConversationHostBridgePermissionRegistry.ts](../../hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts.md) | src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts | ACP 会话侧的 Host Bridge 权限注册表：登记权限处理器并暂存待审批的 Host Bridge 工具调用。 |
| [acpConversationStore.ts](acpConversationStore.ts.md) | src/modules/acp/chat/acpConversationStore.ts | ACP Chat 会话状态的持久化事实源：负责会话索引与 conversation state 的读写删除、快照反序列化归一化，并协调 transcript 存储路径与 pluginStateStore 的 ACP 域记录。 |
| [acpConversationTranscriptStore.ts](acpConversationTranscriptStore.ts.md) | src/modules/acp/chat/acpConversationTranscriptStore.ts | ACP Chat transcript 的落盘适配层：复用 skillRun 的 NDJSON transcript 引擎，以 AcpConversationItem 类型提供追加、批量入队、刷盘与分页/全量读取。 |
| [acpDiagnosticRouter.ts](../diagnostics/acpDiagnosticRouter.ts.md) | src/modules/acp/diagnostics/acpDiagnosticRouter.ts | 诊断事件路由：把 Chat 与 Skills 两个 surface 的诊断条目投影为证据记录，按级别决定是否写入 runtime log 或转发到调试审计 sink。 |
| [acpDiagnostics.ts](../diagnostics/acpDiagnostics.ts.md) | src/modules/acp/diagnostics/acpDiagnostics.ts | ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。 |
| [acpExecutionProgress.ts](../transport/acpExecutionProgress.ts.md) | src/modules/acp/transport/acpExecutionProgress.ts | ACP 执行进度累计器：按会话统计执行阶段与消息计数，供 UI 显示「正在执行/已完成」进度并在恢复时还原。 |
| [acpModelOptionFolding.ts](acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [acpPermissionOptions.ts](../transport/acpPermissionOptions.ts.md) | src/modules/acp/transport/acpPermissionOptions.ts | ACP 权限选项语义：定义允许/拒绝等选项种类，并解析「自动批准」应对应哪个选项 ID。 |
| [acpPermissionQueue.ts](../skillRun/acpPermissionQueue.ts.md) | src/modules/acp/skillRun/acpPermissionQueue.ts | ACP 权限请求的 FIFO 队列：同一会话只暴露队首请求为 active，支持按 requestId 幂等入队、应答与整队取消。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpReasoningEffortFallback.ts](acpReasoningEffortFallback.ts.md) | src/modules/acp/chat/acpReasoningEffortFallback.ts | 推理强度设置的容错层：设置 thought_level 失败时识别特定后端的 -32602 参数错误，判定为可降级而非硬失败。 |
| [acpRuntimeReplayLogicalTime.ts](../diagnostics/acpRuntimeReplayLogicalTime.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts | 回放的逻辑时间源：把原生 setTimeout 包装为可检查、可取消、可按剩余时间恢复的逻辑定时器，使回放不再依赖真实墙钟等待。 |
| [acpRuntimeSemanticTraceRecorder.ts](../diagnostics/acpRuntimeSemanticTraceRecorder.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts | 语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。 |
| [acpSessionConfigOptions.ts](acpSessionConfigOptions.ts.md) | src/modules/acp/chat/acpSessionConfigOptions.ts | ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。 |
| [acpSilentTerminalAssistantCollector.ts](../transport/acpSilentTerminalAssistantCollector.ts.md) | src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts | 静默终态 assistant 文本收集器：在不产生可见 transcript 的场景下收集终局 assistant 文本，供结果校验使用。 |
| [acpStartupPromptPreambles.ts](../skillRun/acpStartupPromptPreambles.ts.md) | src/modules/acp/skillRun/acpStartupPromptPreambles.ts | ACP 会话启动提示前缀：解析内置指令文件并把宿主环境说明以可读前言形式插入首轮 prompt。 |
| [acpTranscriptBoundary.ts](../transport/acpTranscriptBoundary.ts.md) | src/modules/acp/transport/acpTranscriptBoundary.ts | ACP transcript 边界判定：按协议语义把 session update 分类为消息边界更新、语义更新与硬边界更新，供 Chat 与 Skills 两条路径共用。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantWorkspaceTranscriptPublication.ts](../../assistant/publication/assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [hostBridgeCliInjection.ts](../../hostBridge/cli/hostBridgeCliInjection.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInjection.ts | 把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。 |
| [hostBridgeServer.ts](../../hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [zoteroMcpServer.ts](../../hostBridge/mcp/zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatSkillInjection.ts](acpChatSkillInjection.ts.md) | src/modules/acp/chat/acpChatSkillInjection.ts | ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。 |
| [acpChatTranscriptMirror.ts](acpChatTranscriptMirror.ts.md) | src/modules/acp/chat/acpChatTranscriptMirror.ts | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [acpChatWorkspaceDataPlane.ts](acpChatWorkspaceDataPlane.ts.md) | src/modules/acp/chat/acpChatWorkspaceDataPlane.ts | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [acpChatWorkspaceEmissionFacade.ts](acpChatWorkspaceEmissionFacade.ts.md) | src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts | ACP Chat workspace 事件发布面的宿主槽位模块：定义 emission 类型契约与 register/get 访问器，使 acpSessionManager 域核心无需运行时 import 数据面即可发布事件。 |
| [acpChatWorkspaceSurface.ts](acpChatWorkspaceSurface.ts.md) | src/modules/acp/chat/acpChatWorkspaceSurface.ts | ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。 |
| [acpRuntimeReplayProductionPorts.ts](../diagnostics/acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpRuntimeReplayTargets.ts](../diagnostics/acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |
| [assistantWorkspaceActionRouter.ts](../../assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublicationHost.ts](../../assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceSidebar.ts](../../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [backendManager.ts](../../workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| archiveAcpConversation | 函数 | 3200–3309 | 归档会话：先落盘 transcript 与状态，再从可见会话列表移除但保留可恢复记录。 |
| buildAcpDiagnosticsBundle | 函数 | 3717–3772 | 汇总当前会话的诊断信息：adapter 状态、pending 权限、timer 巡检与 trace 开关。 |
| cancelAcpConversationPrompt | 函数 | 3094–3137 | 取消当前 prompt：发出 cancel 请求并按 grace period 决定强停 adapter 的时机。 |
| cloneSnapshotValue | 函数 | 403–441 | 深拷贝快照中的可变结构，保证对外只读视图不会反向污染 runtime 内部状态。 |
| connectAcpConversation | 函数 | 2730–2770 | 连接当前选中的 ACP 会话：确保 session 与 adapter 就绪，并按需恢复 transcript 摘要。 |
| deleteActiveAcpConversation | 函数 | 3311–3386 | 删除当前会话的持久化痕迹并断开 adapter，随后切回可用会话或新建空会话。 |
| sendAcpConversationPrompt | 函数 | 2833–3092 | 发送一轮 prompt 的完整实现：注入宿主上下文、装配 adapter、流式消费并维护执行进度与 transcript 事件。 |
| setAcpConversationModel | 函数 | 3534–3585 | 切换会话模型，同步 raw/display 模型选择并把不可用状态回写为本地选项。 |
| setAcpConversationReasoningEffort | 函数 | 3587–3666 | 切换会话推理强度，区分 applied / unavailable / fallback 三种结果并相应更新本地状态。 |
| shutdownAcpSessionManager | 函数 | 3850–3902 | 关闭管理器：刷盘所有挂起写入与 workspace change，断开全部 adapter 并停止定时器。 |
