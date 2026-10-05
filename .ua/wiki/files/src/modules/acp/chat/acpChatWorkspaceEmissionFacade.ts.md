
# src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts -->

ACP Chat workspace 事件发布面的宿主槽位模块：定义 emission 类型契约与 register/get 访问器，使 acpSessionManager 域核心无需运行时 import 数据面即可发布事件。
源码：[src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts](../../../../../../../src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts)

## 符号（1）
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts:registerAcpChatWorkspaceEmission -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| registerAcpChatWorkspaceEmission | 函数 | 36–40 | 简单 | 宿主槽位、注册、解环 | 0 | 在模块加载期由数据面注册 emission 实现，替换全局宿主槽位。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatWorkspaceDataPlane.ts](acpChatWorkspaceDataPlane.ts.md) | src/modules/acp/chat/acpChatWorkspaceDataPlane.ts | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatWorkspaceDataPlane.ts](acpChatWorkspaceDataPlane.ts.md) | src/modules/acp/chat/acpChatWorkspaceDataPlane.ts | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| registerAcpChatWorkspaceEmission | 函数 | 36–40 | 在模块加载期由数据面注册 emission 实现，替换全局宿主槽位。 |
