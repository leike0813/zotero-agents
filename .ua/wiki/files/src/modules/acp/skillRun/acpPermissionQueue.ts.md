
# src/modules/acp/skillRun/acpPermissionQueue.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpPermissionQueue.ts -->

ACP 权限请求的 FIFO 队列：同一会话只暴露队首请求为 active，支持按 requestId 幂等入队、应答与整队取消。
源码：[src/modules/acp/skillRun/acpPermissionQueue.ts](../../../../../../../src/modules/acp/skillRun/acpPermissionQueue.ts)

## 符号（1）
<!-- node: class:src/modules/acp/skillRun/acpPermissionQueue.ts:AcpPermissionQueue -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AcpPermissionQueue | 类 | 8–52 | 中等 | 队列、权限请求、取消、状态机 | 0 | 权限请求队列类：入队时按 requestId 去重（重复请求直接回 cancelled），resolveActive 后自动把下一条提升为 active，cancelAll 统一以 cancelled 结算全部请求。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunPermissionQueue.ts](acpSkillRunPermissionQueue.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [acpSkillRunState.ts](acpSkillRunState.ts.md) | src/modules/acp/skillRun/acpSkillRunState.ts | ACP Skill Run 的进程内可变状态集合：run 记录表、控制器注册表、按 run 划分的权限队列与 runtime catalog，以及当前选中项。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| AcpPermissionQueue | 类 | 8–52 | 权限请求队列类：入队时按 requestId 去重（重复请求直接回 cancelled），resolveActive 后自动把下一条提升为 active，cancelAll 统一以 cancelled 结算全部请求。 |
