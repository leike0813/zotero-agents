
# src/modules/acp/chat/acpChatWorkspaceDataPlane.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts -->

ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。
源码：[src/modules/acp/chat/acpChatWorkspaceDataPlane.ts](../../../../../../../src/modules/acp/chat/acpChatWorkspaceDataPlane.ts)

## 符号（13）
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:buildAcpChatWorkspaceChange -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:emitSessionRuntimeSnapshot -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:getAcpChatTranscriptMirrorDiagnosticsForTests -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:getAcpChatWorkspaceOwnerNavigation -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:getAcpChatWorkspaceReadModel -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:getAcpConversationSnapshot -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:isForegroundSessionRuntime -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:projectAcpChatSessionSummary -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:publishSessionRuntimeWorkspaceChange -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:readAcpConversationTranscriptMirrorPage -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:readAcpConversationTranscriptPage -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:resolveAcpChatWorkspaceChangeKinds -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:scheduleAcpChatTranscriptHydrateForOwner -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpChatWorkspaceChange | 函数 | 299–331 | 中等 | workspace、事件载荷、acp-chat | 0 | 按 change kinds 组装 workspace change 载荷，区分 transcript 变更与 chrome 变更。 |
| emitSessionRuntimeSnapshot | 函数 | 382–409 | 中等 | 快照、节流、workspace | 0 | 发出会话快照，遵守 silent/display 模式与 live publish 节流策略。 |
| getAcpChatTranscriptMirrorDiagnosticsForTests | 函数 | 596–634 | 中等 | 诊断、测试支撑、transcript | 0 | 导出 transcript 镜像缓存的诊断快照（命中、淘汰、hydrate 状态），供测试断言。 |
| getAcpChatWorkspaceOwnerNavigation | 函数 | 140–202 | 中等 | 导航、读模型、acp-chat | 0 | 构造当前 owner 的导航读模型：会话列表、选中项与前后项指针，供侧边栏渲染。 |
| [getAcpChatWorkspaceReadModel](../../../../../symbols/src/modules/acp/chat/acpChatWorkspaceDataPlane.ts/getAcpChatWorkspaceReadModel.md) | 函数 | 204–285 | 复杂 | 读模型、workspace、投影 | 1 | 生成当前 owner 的完整 workspace read model，含 banner、toolbar、reply、permission 等区域的签名输入。 |
| getAcpConversationSnapshot | 函数 | 450–461 | 简单 | 快照、acp-chat、只读视图 | 0 | 返回当前选中会话的 conversation snapshot 副本，避免调用方直接改动内部状态。 |
| isForegroundSessionRuntime | 函数 | 287–297 | 简单 | 状态判定、workspace、acp-chat | 0 | 判定会话 runtime 是否为前台 owner，只有前台 owner 才允许触发 UI 侧更新。 |
| projectAcpChatSessionSummary | 函数 | 411–439 | 中等 | 投影、摘要、acp-chat | 0 | 把会话 runtime 投影为 session summary 条目，含标题、状态与消息计数。 |
| publishSessionRuntimeWorkspaceChange | 函数 | 368–380 | 简单 | workspace、事件发布、acp-chat | 0 | 发布某个 session runtime 的 workspace change，合并待处理 kinds 后通知订阅者。 |
| readAcpConversationTranscriptMirrorPage | 函数 | 494–538 | 中等 | 分页读取、transcript、缓存回落 | 0 | 优先从内存镜像读取 transcript 页；缓存未命中时回落到 indexed page read，保证首屏正确性不依赖缓存。 |
| readAcpConversationTranscriptPage | 函数 | 540–594 | 中等 | 分页读取、transcript、owner 隔离 | 0 | 按 owner 与页请求读取 transcript 页，并按 owner 维度区分 ACP Chat 的 backendId+conversationId 冷镜像缓存键。 |
| resolveAcpChatWorkspaceChangeKinds | 函数 | 342–360 | 简单 | workspace、事件分类、acp-chat | 0 | 把发布原因（publish reason）解析为具体的 change kinds 集合，未显式指定时按语义推导。 |
| scheduleAcpChatTranscriptHydrateForOwner | 函数 | 463–478 | 简单 | transcript、hydrate、缓存 | 0 | 为指定 owner 调度 transcript mirror hydrate；live/prompting owner 必须 pinned，不参与冷镜像 LRU 淘汰。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatTranscriptMirror.ts](acpChatTranscriptMirror.ts.md) | src/modules/acp/chat/acpChatTranscriptMirror.ts | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [acpChatWorkspaceEmissionFacade.ts](acpChatWorkspaceEmissionFacade.ts.md) | src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts | ACP Chat workspace 事件发布面的宿主槽位模块：定义 emission 类型契约与 register/get 访问器，使 acpSessionManager 域核心无需运行时 import 数据面即可发布事件。 |
| [acpConversationStore.ts](acpConversationStore.ts.md) | src/modules/acp/chat/acpConversationStore.ts | ACP Chat 会话状态的持久化事实源：负责会话索引与 conversation state 的读写删除、快照反序列化归一化，并协调 transcript 存储路径与 pluginStateStore 的 ACP 域记录。 |
| [acpConversationTranscriptStore.ts](acpConversationTranscriptStore.ts.md) | src/modules/acp/chat/acpConversationTranscriptStore.ts | ACP Chat transcript 的落盘适配层：复用 skillRun 的 NDJSON transcript 引擎，以 AcpConversationItem 类型提供追加、批量入队、刷盘与分页/全量读取。 |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantWorkspacePublication.ts](../../assistant/publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspaceTranscriptPublication.ts](../../assistant/publication/assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatWorkspaceEmissionFacade.ts](acpChatWorkspaceEmissionFacade.ts.md) | src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts | ACP Chat workspace 事件发布面的宿主槽位模块：定义 emission 类型契约与 register/get 访问器，使 acpSessionManager 域核心无需运行时 import 数据面即可发布事件。 |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getAcpChatTranscriptMirrorDiagnosticsForTests | 函数 | 596–634 | 导出 transcript 镜像缓存的诊断快照（命中、淘汰、hydrate 状态），供测试断言。 |
| getAcpChatWorkspaceOwnerNavigation | 函数 | 140–202 | 构造当前 owner 的导航读模型：会话列表、选中项与前后项指针，供侧边栏渲染。 |
| [getAcpChatWorkspaceReadModel](../../../../../symbols/src/modules/acp/chat/acpChatWorkspaceDataPlane.ts/getAcpChatWorkspaceReadModel.md) | 函数 | 204–285 | 生成当前 owner 的完整 workspace read model，含 banner、toolbar、reply、permission 等区域的签名输入。 |
| getAcpConversationSnapshot | 函数 | 450–461 | 返回当前选中会话的 conversation snapshot 副本，避免调用方直接改动内部状态。 |
| readAcpConversationTranscriptMirrorPage | 函数 | 494–538 | 优先从内存镜像读取 transcript 页；缓存未命中时回落到 indexed page read，保证首屏正确性不依赖缓存。 |
| readAcpConversationTranscriptPage | 函数 | 540–594 | 按 owner 与页请求读取 transcript 页，并按 owner 维度区分 ACP Chat 的 backendId+conversationId 冷镜像缓存键。 |
| scheduleAcpChatTranscriptHydrateForOwner | 函数 | 463–478 | 为指定 owner 调度 transcript mirror hydrate；live/prompting owner 必须 pinned，不参与冷镜像 LRU 淘汰。 |
