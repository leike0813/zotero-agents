
# src/modules/hostBridge/permissions/hostBridgePermissionManager.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/permissions](../../../../../modules/src/modules/hostBridge/permissions.md)
<!-- node: file:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts -->

Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。
源码：[src/modules/hostBridge/permissions/hostBridgePermissionManager.ts](../../../../../../../src/modules/hostBridge/permissions/hostBridgePermissionManager.ts)

## 符号（15）
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:getHostBridgeApprovalRequirement -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:getHostBridgePermissionProjection -->
<!-- node: class:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:HostBridgePermissionError -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:listHostBridgePendingPermissions -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:parseHostBridgePermissionScope -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:permissionChannelFromScope -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:permissionOptions -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:registerPermissionProjection -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:requestAcpRunScopedPermission -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:requestGlobalPermissionWithPrompt -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:requestHostBridgePermission -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:requestHostBridgePermissionForRequirement -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:requestScopedPermission -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:resolvePermissionProjection -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:withTimeout -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getHostBridgeApprovalRequirement | 函数 | 508–546 | 中等 | 审批、合约、capability | 0 | 由 capability 合约推导审批需求（是否需要审批、要求级别与提示信息）。 |
| getHostBridgePermissionProjection | 函数 | 309–312 | 简单 | 审批、查询、权限 | 0 | 按 ID 读取单条待审批投影。 |
| HostBridgePermissionError | 类 | 101–121 | 简单 | 错误类型、权限、审批 | 0 | 权限流程异常时抛出的类型化错误，区分拒绝、超时与通道不可用。 |
| listHostBridgePendingPermissions | 函数 | 303–307 | 简单 | 审批、查询、权限 | 0 | 列出全部待审批的 Host Bridge 权限请求。 |
| parseHostBridgePermissionScope | 函数 | 552–570 | 简单 | 解析、作用域、权限 | 0 | 解析权限 scope 字符串，非法或缺失时降级为受限作用域。 |
| permissionChannelFromScope | 函数 | 216–230 | 简单 | 作用域、通道选择、权限 | 0 | 由权限 scope 决定审批走 ACP 会话通道还是全局通道。 |
| permissionOptions | 函数 | 152–167 | 简单 | 审批、脱敏、权限 | 0 | 组装审批请求的展示选项，裁剪敏感字段并补齐能力名称与影响范围说明。 |
| registerPermissionProjection | 函数 | 257–287 | 简单 | 审批、投影、权限 | 0 | 注册一条待审批投影，供 UI 与 Agent 查询未决审批。 |
| requestAcpRunScopedPermission | 函数 | 485–506 | 简单 | 审批、acp、run-scope | 0 | 为 ACP run 作用域请求权限，将审批绑定到具体 run 身份。 |
| requestGlobalPermissionWithPrompt | 函数 | 314–385 | 中等 | 审批、全局权限、对话框 | 0 | 发起全局权限请求并弹出确认对话，支持超时与取消后的清理。 |
| requestHostBridgePermission | 函数 | 572–623 | 中等 | 审批、入口点、权限 | 0 | 按 scope 选择审批通道并等待用户决策，返回允许/拒绝/超时结果。 |
| requestHostBridgePermissionForRequirement | 函数 | 625–636 | 简单 | 审批、权限、host-bridge | 0 | 依据既定审批需求发起请求，跳过重复推导以保证审批语义一致。 |
| requestScopedPermission | 函数 | 426–483 | 中等 | 审批、作用域、权限 | 0 | 在指定会话作用域内发起权限请求，作用域不匹配时拒绝以免跨会话放权。 |
| resolvePermissionProjection | 函数 | 289–301 | 简单 | 审批、投影、权限 | 0 | 按审批 ID 解析并移除一条待审批投影，重复解析返回空。 |
| withTimeout | 函数 | 176–190 | 简单 | 超时、审批、工具函数 | 0 | 为审批等待过程附加超时，超时后拒绝并清理挂起状态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConversationHostBridgePermissionRegistry.ts](acpConversationHostBridgePermissionRegistry.ts.md) | src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts | ACP 会话侧的 Host Bridge 权限注册表：登记权限处理器并暂存待审批的 Host Bridge 工具调用。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [hostBridgeProtocol.ts](../server/hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [hostBridgeWriteAutoApprovalRegistry.ts](hostBridgeWriteAutoApprovalRegistry.ts.md) | src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts | Host Bridge 写操作的自动授权登记处：签发、吊销与按 run 回收 write auto-approval grant，并判定某个 scope 是否落在自动放权范围内。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [skillRunnerHostBridgePermissionRegistry.ts](skillRunnerHostBridgePermissionRegistry.ts.md) | src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts | SkillRunner 侧的 Host Bridge 权限注册表：保存待审批权限请求、发布订阅通知并支持按请求 ID 结算。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityRegistry.ts](../../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeCapabilityRoutes.ts](../server/routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeServer.ts](../server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeSynthesisRoutes.ts](../server/routes/hostBridgeSynthesisRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts | Host Bridge Synthesis 路由：把 sidecar 的维护状态、缓存与索引状态暴露给 Agent，并支持经审批的缓存失效操作。 |
| [hostBridgeWorkflowActivityRoutes.ts](../server/routes/hostBridgeWorkflowActivityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts | Host Bridge 工作流与活动路由：为 Agent 提供工作流目录、校验与提交、运行与队列管理、任务与权限查询、通知确认、provider profile 维护以及 skill run 触发。 |
| [hostBridgeWorkflowControl.ts](../workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [hostBridgeWriteAutoApprovalRegistry.ts](hostBridgeWriteAutoApprovalRegistry.ts.md) | src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts | Host Bridge 写操作的自动授权登记处：签发、吊销与按 run 回收 write auto-approval grant，并判定某个 scope 是否落在自动放权范围内。 |
| [zoteroMcpServer.ts](../mcp/zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getHostBridgeApprovalRequirement | 函数 | 508–546 | 由 capability 合约推导审批需求（是否需要审批、要求级别与提示信息）。 |
| getHostBridgePermissionProjection | 函数 | 309–312 | 按 ID 读取单条待审批投影。 |
| HostBridgePermissionError | 类 | 101–121 | 权限流程异常时抛出的类型化错误，区分拒绝、超时与通道不可用。 |
| listHostBridgePendingPermissions | 函数 | 303–307 | 列出全部待审批的 Host Bridge 权限请求。 |
| parseHostBridgePermissionScope | 函数 | 552–570 | 解析权限 scope 字符串，非法或缺失时降级为受限作用域。 |
| requestHostBridgePermission | 函数 | 572–623 | 按 scope 选择审批通道并等待用户决策，返回允许/拒绝/超时结果。 |
| requestHostBridgePermissionForRequirement | 函数 | 625–636 | 依据既定审批需求发起请求，跳过重复推导以保证审批语义一致。 |
