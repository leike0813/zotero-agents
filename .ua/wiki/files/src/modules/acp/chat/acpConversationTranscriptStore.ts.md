
# src/modules/acp/chat/acpConversationTranscriptStore.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpConversationTranscriptStore.ts -->

ACP Chat transcript 的落盘适配层：复用 skillRun 的 NDJSON transcript 引擎，以 AcpConversationItem 类型提供追加、批量入队、刷盘与分页/全量读取。
源码：[src/modules/acp/chat/acpConversationTranscriptStore.ts](../../../../../../../src/modules/acp/chat/acpConversationTranscriptStore.ts)

## 符号（5）
<!-- node: function:src/modules/acp/chat/acpConversationTranscriptStore.ts:appendAcpChatTranscriptEvent -->
<!-- node: function:src/modules/acp/chat/acpConversationTranscriptStore.ts:enqueueAcpChatTranscriptEvent -->
<!-- node: function:src/modules/acp/chat/acpConversationTranscriptStore.ts:readAcpChatTranscriptPage -->
<!-- node: function:src/modules/acp/chat/acpConversationTranscriptStore.ts:readFullAcpChatTranscript -->
<!-- node: function:src/modules/acp/chat/acpConversationTranscriptStore.ts:resolveAcpChatTranscriptPaths -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendAcpChatTranscriptEvent | 函数 | 28–46 | 简单 | transcript、追加、持久化 | 0 | 追加一条 transcript 事件并返回最新元数据，item 类型按 AcpConversationItem 做一次投影转换。 |
| enqueueAcpChatTranscriptEvent | 函数 | 48–70 | 简单 | transcript、缓冲写、性能 | 1 | 把单个事件包装成批量入队提交给缓冲写协调器，避免高频流式更新直接打盘。 |
| readAcpChatTranscriptPage | 函数 | 76–90 | 简单 | 分页读取、transcript、持久化 | 0 | 按页请求读取 transcript item，缓存未命中时直接走索引分页读。 |
| readFullAcpChatTranscript | 函数 | 92–102 | 简单 | transcript、hydrate、持久化 | 0 | 读取完整 transcript 条目集合及事件序号，供 mirror hydrate 使用。 |
| resolveAcpChatTranscriptPaths | 函数 | 24–26 | 简单 | 路径解析、transcript、acp-chat | 1 | 解析 Chat 会话的 transcript 存储路径，直接复用 skillRun 的路径规则以保持两套 transcript 同源。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunStore.ts](../skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTranscriptStore.ts](../skillRun/acpSkillRunTranscriptStore.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts | ACP Skill Run transcript 的磁盘存储层：把 transcript 事件追加写入 NDJSON 日志、维护可增量重建的索引，并按页读取历史条目。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatTranscriptMirror.ts](acpChatTranscriptMirror.ts.md) | src/modules/acp/chat/acpChatTranscriptMirror.ts | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [acpChatWorkspaceDataPlane.ts](acpChatWorkspaceDataPlane.ts.md) | src/modules/acp/chat/acpChatWorkspaceDataPlane.ts | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [acpConversationStore.ts](acpConversationStore.ts.md) | src/modules/acp/chat/acpConversationStore.ts | ACP Chat 会话状态的持久化事实源：负责会话索引与 conversation state 的读写删除、快照反序列化归一化，并协调 transcript 存储路径与 pluginStateStore 的 ACP 域记录。 |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| appendAcpChatTranscriptEvent | 函数 | 28–46 | 追加一条 transcript 事件并返回最新元数据，item 类型按 AcpConversationItem 做一次投影转换。 |
| enqueueAcpChatTranscriptEvent | 函数 | 48–70 | 把单个事件包装成批量入队提交给缓冲写协调器，避免高频流式更新直接打盘。 |
| readAcpChatTranscriptPage | 函数 | 76–90 | 按页请求读取 transcript item，缓存未命中时直接走索引分页读。 |
| readFullAcpChatTranscript | 函数 | 92–102 | 读取完整 transcript 条目集合及事件序号，供 mirror hydrate 使用。 |
| resolveAcpChatTranscriptPaths | 函数 | 24–26 | 解析 Chat 会话的 transcript 存储路径，直接复用 skillRun 的路径规则以保持两套 transcript 同源。 |
