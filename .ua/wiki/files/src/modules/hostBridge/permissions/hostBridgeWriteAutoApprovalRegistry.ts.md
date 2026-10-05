
# src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/permissions](../../../../../modules/src/modules/hostBridge/permissions.md)
<!-- node: file:src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts -->

Host Bridge 写操作的自动授权登记处：签发、吊销与按 run 回收 write auto-approval grant，并判定某个 scope 是否落在自动放权范围内。
源码：[src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts](../../../../../../../src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts)

## 符号（5）
<!-- node: function:src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts:isHostBridgeWriteAutoApprovalScope -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts:issueHostBridgeWriteAutoApprovalGrant -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts:randomGrantId -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts:registerAcpSkillRunAutoApprovalResolver -->
<!-- node: function:src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts:revokeHostBridgeWriteAutoApprovalGrantsForRun -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| isHostBridgeWriteAutoApprovalScope | 函数 | 81–101 | 简单 | scope-判定、授权、权限 | 0 | 判断某个 scope 是否属于允许自动放权的写操作范围，非写操作一律拒绝自动放权。 |
| issueHostBridgeWriteAutoApprovalGrant | 函数 | 41–58 | 简单 | 授权、grant、权限 | 0 | 签发写操作自动授权 grant，绑定 scope 与过期时间并返回可核验的凭据。 |
| randomGrantId | 函数 | 21–33 | 简单 | id-生成、安全、grant | 0 | 生成不可猜测的授权 grant ID，供审批记录与回执引用。 |
| registerAcpSkillRunAutoApprovalResolver | 函数 | 75–79 | 简单 | 注册、acp、授权 | 0 | 注册 ACP skill run 的自动授权解析器，run 结束时据此回收授权。 |
| revokeHostBridgeWriteAutoApprovalGrantsForRun | 函数 | 64–73 | 简单 | 回收、授权、run-scope | 0 | 按 ACP run 回收其名下全部 grant，防止授权跨 run 残留。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgePermissionManager.ts](hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunStore.ts](../../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [hostBridgeCapabilityRoutes.ts](../server/routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeCliInjection.ts](../cli/hostBridgeCliInjection.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInjection.ts | 把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。 |
| [hostBridgePermissionManager.ts](hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [hostBridgeServer.ts](../server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isHostBridgeWriteAutoApprovalScope | 函数 | 81–101 | 判断某个 scope 是否属于允许自动放权的写操作范围，非写操作一律拒绝自动放权。 |
| issueHostBridgeWriteAutoApprovalGrant | 函数 | 41–58 | 签发写操作自动授权 grant，绑定 scope 与过期时间并返回可核验的凭据。 |
| registerAcpSkillRunAutoApprovalResolver | 函数 | 75–79 | 注册 ACP skill run 的自动授权解析器，run 结束时据此回收授权。 |
| revokeHostBridgeWriteAutoApprovalGrantsForRun | 函数 | 64–73 | 按 ACP run 回收其名下全部 grant，防止授权跨 run 残留。 |
