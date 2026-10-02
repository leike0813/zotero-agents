
# src/modules/acp/chat/acpChatTranscriptMirror.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpChatTranscriptMirror.ts -->

ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。
源码：[src/modules/acp/chat/acpChatTranscriptMirror.ts](../../../../../../../src/modules/acp/chat/acpChatTranscriptMirror.ts)

## 符号（11）
<!-- node: function:src/modules/acp/chat/acpChatTranscriptMirror.ts:acpChatPreviewFromItem -->
<!-- node: function:src/modules/acp/chat/acpChatTranscriptMirror.ts:completeAcpChatActiveStreamingTextItems -->
<!-- node: function:src/modules/acp/chat/acpChatTranscriptMirror.ts:finalizeAcpChatStreamingItems -->
<!-- node: function:src/modules/acp/chat/acpChatTranscriptMirror.ts:handleAcpChatTranscriptSessionUpdate -->
<!-- node: function:src/modules/acp/chat/acpChatTranscriptMirror.ts:isLiveAcpChatSessionRuntime -->
<!-- node: function:src/modules/acp/chat/acpChatTranscriptMirror.ts:isTerminalPlanStatus -->
<!-- node: function:src/modules/acp/chat/acpChatTranscriptMirror.ts:normalizeToolCallState -->
<!-- node: function:src/modules/acp/chat/acpChatTranscriptMirror.ts:pushAcpChatTranscriptItem -->
<!-- node: function:src/modules/acp/chat/acpChatTranscriptMirror.ts:readAcpChatTranscriptMirrorPage -->
<!-- node: function:src/modules/acp/chat/acpChatTranscriptMirror.ts:upsertAcpChatStatusItem -->
<!-- node: function:src/modules/acp/chat/acpChatTranscriptMirror.ts:upsertToolCallItem -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acpChatPreviewFromItem | 函数 | 127–154 | 简单 | 投影、摘要、acp-chat | 0 | 从 conversation item 派生一行的预览文本，供 session 摘要列表使用。 |
| completeAcpChatActiveStreamingTextItems | 函数 | 435–444 | 简单 | streaming、transcript、turn 边界 | 0 | 在 owner 切换或 turn 边界处把活跃 streaming 文本项补全为稳定条目。 |
| finalizeAcpChatStreamingItems | 函数 | 422–433 | 简单 | transcript、streaming、收尾 | 0 | 收尾当前 streaming 文本项，标记流式结束并落盘。 |
| handleAcpChatTranscriptSessionUpdate | 函数 | 621–792 | 复杂 | acp-chat、transcript、事件分派、边界分类 | 0 | ACP session update 的总入口：按 transcript 边界分类决定是否切分 assistant 文本段，并把 tool call、plan、usage、permission 等分派到各自的镜像更新路径。 |
| isLiveAcpChatSessionRuntime | 函数 | 100–115 | 简单 | acp-chat、状态判定、transcript | 0 | 判定一个会话 runtime 是否处于 live（连接活跃）状态，决定 transcript 走增量更新还是分页读。 |
| isTerminalPlanStatus | 函数 | 156–174 | 简单 | 状态判定、plan、acp-chat | 0 | 判断 plan item 的状态是否已进入终态，终态 plan 不再重复刷新显示。 |
| normalizeToolCallState | 函数 | 515–531 | 简单 | 归一化、tool-call、状态 | 0 | 把 tool_call 的多种状态字段归一为统一状态枚举，供 UI 展示与排序。 |
| pushAcpChatTranscriptItem | 函数 | 390–401 | 简单 | transcript、追加、acp-chat | 0 | 向当前 owner 的镜像追加一条 conversation item，并同步写入持久化事件。 |
| readAcpChatTranscriptMirrorPage | 函数 | 493–513 | 中等 | 分页读取、transcript、缓存 | 1 | 从内存镜像按 limit 读取指定页 transcript item，命中缓存时直接返回，未命中走分页读。 |
| upsertAcpChatStatusItem | 函数 | 403–420 | 简单 | transcript、upsert、状态项 | 0 | 按 id upsert 一条 status item，重复上报时替换而非新增，保持 transcript 行身份稳定。 |
| upsertToolCallItem | 函数 | 547–615 | 复杂 | tool-call、upsert、transcript | 0 | 维护 tool_call item 的完整更新：按状态 rank 决定覆盖优先级，处理参数与输出的增量文本合并。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConversationTranscriptStore.ts](acpConversationTranscriptStore.ts.md) | src/modules/acp/chat/acpConversationTranscriptStore.ts | ACP Chat transcript 的落盘适配层：复用 skillRun 的 NDJSON transcript 引擎，以 AcpConversationItem 类型提供追加、批量入队、刷盘与分页/全量读取。 |
| [acpDiagnostics.ts](../diagnostics/acpDiagnostics.ts.md) | src/modules/acp/diagnostics/acpDiagnostics.ts | ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。 |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpToolCallDisplay.ts](../../../shared/acpToolCallDisplay.ts.md) | src/shared/acpToolCallDisplay.ts | ACP 工具调用的展示投影：把各后端异构的 tool call 载荷规整为统一的标题、状态、摘要与兼容性展示信息。 |
| [acpTranscriptBoundary.ts](../transport/acpTranscriptBoundary.ts.md) | src/modules/acp/transport/acpTranscriptBoundary.ts | ACP transcript 边界判定：按协议语义把 session update 分类为消息边界更新、语义更新与硬边界更新，供 Chat 与 Skills 两条路径共用。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantTranscriptMirrorStore.ts](../../assistant/publication/assistantTranscriptMirrorStore.ts.md) | src/modules/assistant/publication/assistantTranscriptMirrorStore.ts | Assistant Workspace 的 transcript 镜像仓库：按 owner 维护镜像条目、合并流式事件，并管理冷镜像 LRU 与后台水合。 |
| [assistantWorkspaceTranscriptPublication.ts](../../assistant/publication/assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatWorkspaceDataPlane.ts](acpChatWorkspaceDataPlane.ts.md) | src/modules/acp/chat/acpChatWorkspaceDataPlane.ts | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| completeAcpChatActiveStreamingTextItems | 函数 | 435–444 | 在 owner 切换或 turn 边界处把活跃 streaming 文本项补全为稳定条目。 |
| finalizeAcpChatStreamingItems | 函数 | 422–433 | 收尾当前 streaming 文本项，标记流式结束并落盘。 |
| handleAcpChatTranscriptSessionUpdate | 函数 | 621–792 | ACP session update 的总入口：按 transcript 边界分类决定是否切分 assistant 文本段，并把 tool call、plan、usage、permission 等分派到各自的镜像更新路径。 |
| isLiveAcpChatSessionRuntime | 函数 | 100–115 | 判定一个会话 runtime 是否处于 live（连接活跃）状态，决定 transcript 走增量更新还是分页读。 |
| pushAcpChatTranscriptItem | 函数 | 390–401 | 向当前 owner 的镜像追加一条 conversation item，并同步写入持久化事件。 |
| readAcpChatTranscriptMirrorPage | 函数 | 493–513 | 从内存镜像按 limit 读取指定页 transcript item，命中缓存时直接返回，未命中走分页读。 |
| upsertAcpChatStatusItem | 函数 | 403–420 | 按 id upsert 一条 status item，重复上报时替换而非新增，保持 transcript 行身份稳定。 |
