
# src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts -->

ACP Skill Run 权限请求的宿主注入门面：允许外部注册并设置权限请求处理器，从而把 UI 审批回路与队列实现解耦。
源码：[src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts)

## 符号（2）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts:registerAcpSkillRunPermissionRequestHandler -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts:setAcpSkillRunPermissionRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| registerAcpSkillRunPermissionRequestHandler | 函数 | 16–20 | 简单 | acp、权限、cache | 0 | 注册（或以 null 注销）Skill Run 权限请求处理器，使队列实现与具体审批 UI 解耦。 |
| setAcpSkillRunPermissionRequest | 函数 | 22–29 | 简单 | acp、权限、cache | 1 | 当前置的权限请求处理器时，把 pending 权限请求转发给已注册的处理器，缺失处理器时判定为拒绝。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayTargets.ts](../diagnostics/acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |
| [acpSkillRunPermissionQueue.ts](acpSkillRunPermissionQueue.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| registerAcpSkillRunPermissionRequestHandler | 函数 | 16–20 | 注册（或以 null 注销）Skill Run 权限请求处理器，使队列实现与具体审批 UI 解耦。 |
| setAcpSkillRunPermissionRequest | 函数 | 22–29 | 当前置的权限请求处理器时，把 pending 权限请求转发给已注册的处理器，缺失处理器时判定为拒绝。 |
