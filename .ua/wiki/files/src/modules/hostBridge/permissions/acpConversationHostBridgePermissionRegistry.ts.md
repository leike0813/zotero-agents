
# src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/permissions](../../../../../modules/src/modules/hostBridge/permissions.md)
<!-- node: file:src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts -->

ACP 会话侧的 Host Bridge 权限注册表：登记权限处理器并暂存待审批的 Host Bridge 工具调用。
源码：[src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts](../../../../../../../src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts)

## 符号（2）
<!-- node: function:src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts:registerAcpConversationHostBridgePermissionHandler -->
<!-- node: function:src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts:setAcpConversationHostBridgePermissionRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| registerAcpConversationHostBridgePermissionHandler | 函数 | 22–36 | 简单 | host-bridge、权限、configuration | 0 | 注册（或注销）ACP 会话的 Host Bridge 权限处理器，解耦审批 UI 与调用方。 |
| setAcpConversationHostBridgePermissionRequest | 函数 | 38–53 | 简单 | host-bridge、权限、configuration | 0 | 暂存一条待审批的 Host Bridge 权限请求并通知处理器，缺失处理器时直接拒绝。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionManager.ts](../../acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [hostBridgePermissionManager.ts](hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| registerAcpConversationHostBridgePermissionHandler | 函数 | 22–36 | 注册（或注销）ACP 会话的 Host Bridge 权限处理器，解耦审批 UI 与调用方。 |
| setAcpConversationHostBridgePermissionRequest | 函数 | 38–53 | 暂存一条待审批的 Host Bridge 权限请求并通知处理器，缺失处理器时直接拒绝。 |
