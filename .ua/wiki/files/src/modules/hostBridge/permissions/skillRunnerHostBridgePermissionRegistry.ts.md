
# src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/permissions](../../../../../modules/src/modules/hostBridge/permissions.md)
<!-- node: file:src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts -->

SkillRunner 侧的 Host Bridge 权限注册表：保存待审批权限请求、发布订阅通知并支持按请求 ID 结算。
源码：[src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts](../../../../../../../src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts)

## 符号（6）
<!-- node: function:src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts:clonePermissionRequest -->
<!-- node: function:src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts:getSkillRunnerHostBridgePermissionRequest -->
<!-- node: function:src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts:resetSkillRunnerHostBridgePermissionRegistryForTests -->
<!-- node: function:src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts:resolveSkillRunnerHostBridgePermissionRequest -->
<!-- node: function:src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts:setSkillRunnerHostBridgePermissionRequest -->
<!-- node: function:src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts:subscribeSkillRunnerHostBridgePermissionRequests -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| clonePermissionRequest | 函数 | 26–42 | 简单 | host-bridge、权限、utility | 0 | 深拷贝权限请求，防止订阅方修改注册表中的原始对象。 |
| getSkillRunnerHostBridgePermissionRequest | 函数 | 88–96 | 简单 | host-bridge、权限、query | 0 | 按请求 ID 读取当前待审批权限请求，不存在时返回 undefined。 |
| resetSkillRunnerHostBridgePermissionRegistryForTests | 函数 | 137–141 | 简单 | host-bridge、权限、test | 0 | 清空注册表中的请求与订阅者，使测试从干净状态开始。 |
| resolveSkillRunnerHostBridgePermissionRequest | 函数 | 98–135 | 简单 | host-bridge、权限、cache | 0 | 按用户决议结算权限请求，返回结算后的终态请求对象。 |
| setSkillRunnerHostBridgePermissionRequest | 函数 | 63–86 | 简单 | host-bridge、权限、cache | 0 | 登记一条待审批权限请求并通知订阅方，重复请求按 ID 幂等替换。 |
| subscribeSkillRunnerHostBridgePermissionRequests | 函数 | 54–61 | 简单 | host-bridge、权限、event-handler | 0 | 订阅权限请求变化，返回取消订阅函数供 UI 卸载时释放。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgePermissionManager.ts](hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [skillRunnerRunDialog.ts](../../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getSkillRunnerHostBridgePermissionRequest | 函数 | 88–96 | 按请求 ID 读取当前待审批权限请求，不存在时返回 undefined。 |
| resetSkillRunnerHostBridgePermissionRegistryForTests | 函数 | 137–141 | 清空注册表中的请求与订阅者，使测试从干净状态开始。 |
| resolveSkillRunnerHostBridgePermissionRequest | 函数 | 98–135 | 按用户决议结算权限请求，返回结算后的终态请求对象。 |
| setSkillRunnerHostBridgePermissionRequest | 函数 | 63–86 | 登记一条待审批权限请求并通知订阅方，重复请求按 ID 幂等替换。 |
| subscribeSkillRunnerHostBridgePermissionRequests | 函数 | 54–61 | 订阅权限请求变化，返回取消订阅函数供 UI 卸载时释放。 |
