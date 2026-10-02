
# src/modules/acp/chat
> 目录聚合页：14 个文件、111 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/acp/chat/acpBackendPresets.ts](../../../../files/src/modules/acp/chat/acpBackendPresets.ts.md) | 文件 | 10 | ACP 后端预设目录：维护内置 Agent 后端（命令、参数、请求类型、显示名）的定义与解析，供后端管理器和连接层复用。 |
| [src/modules/acp/chat/acpChatSkillInjection.ts](../../../../files/src/modules/acp/chat/acpChatSkillInjection.ts.md) | 文件 | 8 | ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。 |
| [src/modules/acp/chat/acpChatTranscriptMirror.ts](../../../../files/src/modules/acp/chat/acpChatTranscriptMirror.ts.md) | 文件 | 11 | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [src/modules/acp/chat/acpChatWorkspaceDataPlane.ts](../../../../files/src/modules/acp/chat/acpChatWorkspaceDataPlane.ts.md) | 文件 | 13 | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts](../../../../files/src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts.md) | 文件 | 1 | ACP Chat workspace 事件发布面的宿主槽位模块：定义 emission 类型契约与 register/get 访问器，使 acpSessionManager 域核心无需运行时 import 数据面即可发布事件。 |
| [src/modules/acp/chat/acpChatWorkspaceSurface.ts](../../../../files/src/modules/acp/chat/acpChatWorkspaceSurface.ts.md) | 文件 | 7 | ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。 |
| [src/modules/acp/chat/acpContextBuilder.ts](../../../../files/src/modules/acp/chat/acpContextBuilder.ts.md) | 文件 | 3 | 构造随 prompt 发给 ACP Agent 的宿主上下文：当前选中条目、library 范围与 Reader 位置，统一收敛为 AcpHostContext 结构。 |
| [src/modules/acp/chat/acpConversationStore.ts](../../../../files/src/modules/acp/chat/acpConversationStore.ts.md) | 文件 | 11 | ACP Chat 会话状态的持久化事实源：负责会话索引与 conversation state 的读写删除、快照反序列化归一化，并协调 transcript 存储路径与 pluginStateStore 的 ACP 域记录。 |
| [src/modules/acp/chat/acpConversationTranscriptStore.ts](../../../../files/src/modules/acp/chat/acpConversationTranscriptStore.ts.md) | 文件 | 5 | ACP Chat transcript 的落盘适配层：复用 skillRun 的 NDJSON transcript 引擎，以 AcpConversationItem 类型提供追加、批量入队、刷盘与分页/全量读取。 |
| [src/modules/acp/chat/acpModelOptionFolding.ts](../../../../files/src/modules/acp/chat/acpModelOptionFolding.ts.md) | 文件 | 8 | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [src/modules/acp/chat/acpReasoningEffortFallback.ts](../../../../files/src/modules/acp/chat/acpReasoningEffortFallback.ts.md) | 文件 | 2 | 推理强度设置的容错层：设置 thought_level 失败时识别特定后端的 -32602 参数错误，判定为可降级而非硬失败。 |
| [src/modules/acp/chat/acpSessionConfigOptions.ts](../../../../files/src/modules/acp/chat/acpSessionConfigOptions.ts.md) | 文件 | 7 | ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。 |
| [src/modules/acp/chat/acpSessionManager.ts](../../../../files/src/modules/acp/chat/acpSessionManager.ts.md) | 文件 | 22 | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [src/modules/acp/chat/acpSidebarModel.ts](../../../../files/src/modules/acp/chat/acpSidebarModel.ts.md) | 文件 | 3 | 构建 ACP Chat 侧边栏视图快照：解析会话状态标签与宿主上下文摘要，产出侧边栏消费的展示模型。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 21 |
| [src/modules/assistant/publication](../assistant/publication.md) | 15 |
| [src/modules/acp/diagnostics](diagnostics.md) | 7 |
| [src/modules/acp/skillRun](skillRun.md) | 7 |
| [src/modules/acp/transport](transport.md) | 7 |
| [src/backends](../../backends.md) | 6 |
| [src/utils](../../utils.md) | 5 |
| [src/config](../../config.md) | 2 |
| [src/modules/hostBridge/cli](../hostBridge/cli.md) | 2 |
| [src/modules/assistant/workspace](../assistant/workspace.md) | 1 |
| [src/modules/hostBridge/mcp](../hostBridge/mcp.md) | 1 |
| [src/modules/hostBridge/permissions](../hostBridge/permissions.md) | 1 |
| [src/modules/hostBridge/server](../hostBridge/server.md) | 1 |
| [src/modules/workflow/catalog](../workflow/catalog.md) | 1 |
| [src/shared](../../shared.md) | 1 |
