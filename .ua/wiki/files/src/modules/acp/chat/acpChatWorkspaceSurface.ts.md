
# src/modules/acp/chat/acpChatWorkspaceSurface.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpChatWorkspaceSurface.ts -->

ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。
源码：[src/modules/acp/chat/acpChatWorkspaceSurface.ts](../../../../../../../src/modules/acp/chat/acpChatWorkspaceSurface.ts)

## 符号（7）
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceSurface.ts:acpChatHint -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceSurface.ts:acpChatTranscriptPageKey -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceSurface.ts:isPureAcpChatBackgroundChange -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceSurface.ts:mapAcpChatWorkspaceChangeKinds -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceSurface.ts:readAcpChatTranscriptRegion -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceSurface.ts:readAcpChatWorkspaceRegions -->
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceSurface.ts:shouldPublishAcpChatWorkspaceChange -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acpChatHint | 函数 | 165–185 | 简单 | projection、hint、acp、chat | 0 | 构造 ACP Chat 提示区内容，覆盖等待审批、等待用户输入与后端异常三类语义。 |
| acpChatTranscriptPageKey | 函数 | 60–67 | 简单 | transcript、cache-key、acp、utility | 0 | 生成 ACP Chat transcript 分页缓存键，按 owner（backend + conversation）与页码隔离。 |
| isPureAcpChatBackgroundChange | 函数 | 101–110 | 简单 | acp、filtering、publication、optimization | 0 | 判定一次 conversation 变化是否属于纯后台变化（不触及 transcript 与交互区域），用于跳过前端发布。 |
| mapAcpChatWorkspaceChangeKinds | 函数 | 152–163 | 简单 | acp、mapping、publication、adapter | 0 | 将 conversation 变化种类映射为统一的 publication kinds 集合。 |
| readAcpChatTranscriptRegion | 函数 | 206–246 | 简单 | transcript、projection、acp、isolation | 0 | 单独读取 ACP Chat 的 transcript 区域，与其它区域解耦以保证 transcript-only 更新不重建 chrome。 |
| readAcpChatWorkspaceRegions | 函数 | 248–508 | 复杂 | acp、projection、workspace、regions、snapshot | 0 | 读取 ACP Chat 工作区全部区域的可见内容（transcript、toolbar、banner、hint、reply、drawer 等），作为发布快照的唯一来源。 |
| shouldPublishAcpChatWorkspaceChange | 函数 | 112–142 | 简单 | acp、publication、decision、optimization | 0 | 按变化种类与当前 owner 决定是否需要发布工作区快照，避免无意义的前端更新。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantWorkspacePublication.ts](../../assistant/publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspacePublicationRuntime.ts](../../assistant/publication/assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [assistantWorkspaceSurfaceSkeleton.ts](../../assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts | 工作区 surface 骨架：提供 change kind 映射、owner 区域读取、owner 控件构造与排队导航条目列表等跨 domain 共用的最小 surface 能力。 |
| [assistantWorkspaceTranscriptPublication.ts](../../assistant/publication/assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceActionRouter.ts](../../assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublicationHost.ts](../../assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceSidebar.ts](../../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| acpChatTranscriptPageKey | 函数 | 60–67 | 生成 ACP Chat transcript 分页缓存键，按 owner（backend + conversation）与页码隔离。 |
| isPureAcpChatBackgroundChange | 函数 | 101–110 | 判定一次 conversation 变化是否属于纯后台变化（不触及 transcript 与交互区域），用于跳过前端发布。 |
| mapAcpChatWorkspaceChangeKinds | 函数 | 152–163 | 将 conversation 变化种类映射为统一的 publication kinds 集合。 |
| readAcpChatWorkspaceRegions | 函数 | 248–508 | 读取 ACP Chat 工作区全部区域的可见内容（transcript、toolbar、banner、hint、reply、drawer 等），作为发布快照的唯一来源。 |
| shouldPublishAcpChatWorkspaceChange | 函数 | 112–142 | 按变化种类与当前 owner 决定是否需要发布工作区快照，避免无意义的前端更新。 |
