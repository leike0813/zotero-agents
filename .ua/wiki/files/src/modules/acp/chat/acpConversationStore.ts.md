
# src/modules/acp/chat/acpConversationStore.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpConversationStore.ts -->

ACP Chat 会话状态的持久化事实源：负责会话索引与 conversation state 的读写删除、快照反序列化归一化，并协调 transcript 存储路径与 pluginStateStore 的 ACP 域记录。
源码：[src/modules/acp/chat/acpConversationStore.ts](../../../../../../../src/modules/acp/chat/acpConversationStore.ts)

## 符号（11）
<!-- node: function:src/modules/acp/chat/acpConversationStore.ts:deleteAcpConversationState -->
<!-- node: function:src/modules/acp/chat/acpConversationStore.ts:listAcpChatSessions -->
<!-- node: function:src/modules/acp/chat/acpConversationStore.ts:loadAcpChatSessionIndex -->
<!-- node: function:src/modules/acp/chat/acpConversationStore.ts:loadAcpConversationState -->
<!-- node: function:src/modules/acp/chat/acpConversationStore.ts:normalizeSnapshotPayload -->
<!-- node: function:src/modules/acp/chat/acpConversationStore.ts:parsePendingPermissionRequest -->
<!-- node: function:src/modules/acp/chat/acpConversationStore.ts:readStoredAcpChatSessionIndex -->
<!-- node: function:src/modules/acp/chat/acpConversationStore.ts:renameAcpConversationState -->
<!-- node: function:src/modules/acp/chat/acpConversationStore.ts:resolveAcpChatRuntimePaths -->
<!-- node: function:src/modules/acp/chat/acpConversationStore.ts:saveAcpConversationState -->
<!-- node: function:src/modules/acp/chat/acpConversationStore.ts:writeAcpChatSessionIndex -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| deleteAcpConversationState | 函数 | 932–958 | 中等 | 持久化、删除、acp-chat | 0 | 删除单个会话的全部持久化痕迹：状态文件、索引条目与 pluginStateStore 记录。 |
| listAcpChatSessions | 函数 | 617–623 | 简单 | 会话管理、读模型、acp-chat | 1 | 列出全部会话，是 workspace 会话列表导航的唯一数据来源。 |
| loadAcpChatSessionIndex | 函数 | 579–607 | 中等 | 持久化、会话索引、acp-chat | 0 | 组装完整会话索引：合并磁盘索引与 pluginStateStore 记录，并清理 legacy 会话残留。 |
| loadAcpConversationState | 函数 | 698–751 | 中等 | 持久化、会话状态、acp-chat | 0 | 按 backendId+conversationId 载入单个会话状态，缺失时回落到 legacy 布局。 |
| normalizeSnapshotPayload | 函数 | 261–369 | 复杂 | 反序列化、归一化、acp-chat | 0 | 把磁盘上的 conversation snapshot 载荷归一化为强类型快照，修复缺失字段、状态枚举与选项结构。 |
| parsePendingPermissionRequest | 函数 | 187–236 | 中等 | 反序列化、权限请求、acp-chat | 0 | 从持久化载荷还原待审批权限请求，含 tool call 标题、选项与 raw 选项集合。 |
| readStoredAcpChatSessionIndex | 函数 | 532–564 | 中等 | 持久化、会话索引、容错 | 0 | 读取并归一化磁盘会话索引，索引缺失或损坏时返回空索引而不抛错。 |
| renameAcpConversationState | 函数 | 648–696 | 中等 | 会话管理、持久化、acp-chat | 0 | 重命名会话，同步更新状态文件、会话索引与消息计数派生值。 |
| resolveAcpChatRuntimePaths | 函数 | 371–393 | 中等 | 持久化、路径解析、acp-chat | 0 | 解析 ACP Chat 在运行时持久化目录下的会话索引、状态与 transcript 文件路径。 |
| saveAcpConversationState | 函数 | 789–930 | 复杂 | 持久化、会话状态、acp-chat | 0 | 保存会话状态：写状态文件、更新会话索引，并同步 pluginStateStore 的 ACP 域行记录与消息计数。 |
| writeAcpChatSessionIndex | 函数 | 487–530 | 中等 | 持久化、会话索引、原子写 | 0 | 原子写回会话索引文件，索引内容与 pluginStateStore 中的会话记录保持一致。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConversationTranscriptStore.ts](acpConversationTranscriptStore.ts.md) | src/modules/acp/chat/acpConversationTranscriptStore.ts | ACP Chat transcript 的落盘适配层：复用 skillRun 的 NDJSON transcript 引擎，以 AcpConversationItem 类型提供追加、批量入队、刷盘与分页/全量读取。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantMessageCounts.ts](../../assistant/publication/assistantMessageCounts.ts.md) | src/modules/assistant/publication/assistantMessageCounts.ts | Assistant 消息计数工具：创建、规整与克隆消息计数三元组，并提供执行开始/结束与逐条自增的计数维护入口。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [pluginStateStore.ts](../../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatWorkspaceDataPlane.ts](acpChatWorkspaceDataPlane.ts.md) | src/modules/acp/chat/acpChatWorkspaceDataPlane.ts | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| deleteAcpConversationState | 函数 | 932–958 | 删除单个会话的全部持久化痕迹：状态文件、索引条目与 pluginStateStore 记录。 |
| listAcpChatSessions | 函数 | 617–623 | 列出全部会话，是 workspace 会话列表导航的唯一数据来源。 |
| loadAcpChatSessionIndex | 函数 | 579–607 | 组装完整会话索引：合并磁盘索引与 pluginStateStore 记录，并清理 legacy 会话残留。 |
| loadAcpConversationState | 函数 | 698–751 | 按 backendId+conversationId 载入单个会话状态，缺失时回落到 legacy 布局。 |
| renameAcpConversationState | 函数 | 648–696 | 重命名会话，同步更新状态文件、会话索引与消息计数派生值。 |
| resolveAcpChatRuntimePaths | 函数 | 371–393 | 解析 ACP Chat 在运行时持久化目录下的会话索引、状态与 transcript 文件路径。 |
| saveAcpConversationState | 函数 | 789–930 | 保存会话状态：写状态文件、更新会话索引，并同步 pluginStateStore 的 ACP 域行记录与消息计数。 |
