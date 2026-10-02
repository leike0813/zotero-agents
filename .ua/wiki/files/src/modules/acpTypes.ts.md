
# src/modules/acpTypes.ts
所属分层：[Agent 协议与后端运行时](../../../layers/agent-runtime.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/acpTypes.ts -->

ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。
源码：[src/modules/acpTypes.ts](../../../../../src/modules/acpTypes.ts)

## 符号（5）
<!-- node: function:src/modules/acpTypes.ts:cloneAcpConversationItem -->
<!-- node: function:src/modules/acpTypes.ts:cloneAcpSelectableOption -->
<!-- node: function:src/modules/acpTypes.ts:createEmptyAcpConversationSnapshot -->
<!-- node: function:src/modules/acpTypes.ts:normalizeAcpPromptInterruptState -->
<!-- node: function:src/modules/acpTypes.ts:normalizeAcpStatus -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| cloneAcpConversationItem | 函数 | 549–559 | 简单 | acp、类型定义、utility | 1 | 深拷贝一条会话条目（消息、工具调用或状态），隔离跨边界修改。 |
| cloneAcpSelectableOption | 函数 | 536–547 | 简单 | acp、类型定义、utility | 0 | 深拷贝可选模式项，避免快照与后端上报对象共享引用。 |
| createEmptyAcpConversationSnapshot | 函数 | 445–506 | 中等 | acp、类型定义、factory | 0 | 构造空的 ACP 会话快照，包含状态、transcript 与计数等全量初始字段。 |
| normalizeAcpPromptInterruptState | 函数 | 25–37 | 简单 | acp、类型定义、validation | 0 | 规整 prompt 中断状态字段，非法值收敛为未中断。 |
| normalizeAcpStatus | 函数 | 508–534 | 简单 | acp、类型定义、validation | 0 | 规整会话状态到已知状态集合，剔除非法字段并补齐缺失默认值。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpPermissionOptions.ts](acp/transport/acpPermissionOptions.ts.md) | src/modules/acp/transport/acpPermissionOptions.ts | ACP 权限选项语义：定义允许/拒绝等选项种类，并解析「自动批准」应对应哪个选项 ID。 |
| [assistantMessageCounts.ts](assistant/publication/assistantMessageCounts.ts.md) | src/modules/assistant/publication/assistantMessageCounts.ts | Assistant 消息计数工具：创建、规整与克隆消息计数三元组，并提供执行开始/结束与逐条自增的计数维护入口。 |
| [hostBridgeProtocol.ts](hostBridge/server/hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [types.ts](../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatSkillInjection.ts](acp/chat/acpChatSkillInjection.ts.md) | src/modules/acp/chat/acpChatSkillInjection.ts | ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。 |
| [acpChatTranscriptMirror.ts](acp/chat/acpChatTranscriptMirror.ts.md) | src/modules/acp/chat/acpChatTranscriptMirror.ts | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [acpChatWorkspaceDataPlane.ts](acp/chat/acpChatWorkspaceDataPlane.ts.md) | src/modules/acp/chat/acpChatWorkspaceDataPlane.ts | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [acpChatWorkspaceSurface.ts](acp/chat/acpChatWorkspaceSurface.ts.md) | src/modules/acp/chat/acpChatWorkspaceSurface.ts | ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。 |
| [acpConnectionAdapter.ts](acp/transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpContextBuilder.ts](acp/chat/acpContextBuilder.ts.md) | src/modules/acp/chat/acpContextBuilder.ts | 构造随 prompt 发给 ACP Agent 的宿主上下文：当前选中条目、library 范围与 Reader 位置，统一收敛为 AcpHostContext 结构。 |
| [acpConversationHostBridgePermissionRegistry.ts](hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts.md) | src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts | ACP 会话侧的 Host Bridge 权限注册表：登记权限处理器并暂存待审批的 Host Bridge 工具调用。 |
| [acpConversationStore.ts](acp/chat/acpConversationStore.ts.md) | src/modules/acp/chat/acpConversationStore.ts | ACP Chat 会话状态的持久化事实源：负责会话索引与 conversation state 的读写删除、快照反序列化归一化，并协调 transcript 存储路径与 pluginStateStore 的 ACP 域记录。 |
| [acpConversationTranscriptStore.ts](acp/chat/acpConversationTranscriptStore.ts.md) | src/modules/acp/chat/acpConversationTranscriptStore.ts | ACP Chat transcript 的落盘适配层：复用 skillRun 的 NDJSON transcript 引擎，以 AcpConversationItem 类型提供追加、批量入队、刷盘与分页/全量读取。 |
| [acpDiagnosticRouter.ts](acp/diagnostics/acpDiagnosticRouter.ts.md) | src/modules/acp/diagnostics/acpDiagnosticRouter.ts | 诊断事件路由：把 Chat 与 Skills 两个 surface 的诊断条目投影为证据记录，按级别决定是否写入 runtime log 或转发到调试审计 sink。 |
| [acpDiagnostics.ts](acp/diagnostics/acpDiagnostics.ts.md) | src/modules/acp/diagnostics/acpDiagnostics.ts | ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。 |
| [acpPermissionQueue.ts](acp/skillRun/acpPermissionQueue.ts.md) | src/modules/acp/skillRun/acpPermissionQueue.ts | ACP 权限请求的 FIFO 队列：同一会话只暴露队首请求为 active，支持按 requestId 幂等入队、应答与整队取消。 |
| [acpRuntimeReplayTargets.ts](acp/diagnostics/acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |
| [acpSessionManager.ts](acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSidebarModel.ts](acp/chat/acpSidebarModel.ts.md) | src/modules/acp/chat/acpSidebarModel.ts | 构建 ACP Chat 侧边栏视图快照：解析会话状态标签与宿主上下文摘要，产出侧边栏消费的展示模型。 |
| [acpSkillRunExecutionSupport.ts](acp/skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunPermissionFacade.ts](acp/skillRun/acpSkillRunPermissionFacade.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts | ACP Skill Run 权限请求的宿主注入门面：允许外部注册并设置权限请求处理器，从而把 UI 审批回路与队列实现解耦。 |
| [acpSkillRunPersistence.ts](acp/skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunStore.ts](acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSyntheticConnectionAdapter.ts](acp/transport/acpSyntheticConnectionAdapter.ts.md) | src/modules/acp/transport/acpSyntheticConnectionAdapter.ts | 合成 ACP 连接适配器：用固定回放的 session update 序列替代真实后端进程，供回放诊断与测试驱动完整 UI 链路。 |
| [assistantWorkspaceActionRouter.ts](assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublicationHost.ts](assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceSidebar.ts](assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [hostBridgePermissionManager.ts](hostBridge/permissions/hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [skillRunnerHostBridgePermissionRegistry.ts](hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts.md) | src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts | SkillRunner 侧的 Host Bridge 权限注册表：保存待审批权限请求、发布订阅通知并支持按请求 ID 结算。 |
| [skillRunnerRunDialog.ts](skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [zoteroMcpServer.ts](hostBridge/mcp/zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| cloneAcpConversationItem | 函数 | 549–559 | 深拷贝一条会话条目（消息、工具调用或状态），隔离跨边界修改。 |
| cloneAcpSelectableOption | 函数 | 536–547 | 深拷贝可选模式项，避免快照与后端上报对象共享引用。 |
| createEmptyAcpConversationSnapshot | 函数 | 445–506 | 构造空的 ACP 会话快照，包含状态、transcript 与计数等全量初始字段。 |
| normalizeAcpPromptInterruptState | 函数 | 25–37 | 规整 prompt 中断状态字段，非法值收敛为未中断。 |
| normalizeAcpStatus | 函数 | 508–534 | 规整会话状态到已知状态集合，剔除非法字段并补齐缺失默认值。 |
