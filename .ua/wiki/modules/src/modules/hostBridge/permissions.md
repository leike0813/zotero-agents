
# src/modules/hostBridge/permissions
> 目录聚合页：4 个文件、28 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts](../../../../files/src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts.md) | 文件 | 2 | ACP 会话侧的 Host Bridge 权限注册表：登记权限处理器并暂存待审批的 Host Bridge 工具调用。 |
| [src/modules/hostBridge/permissions/hostBridgePermissionManager.ts](../../../../files/src/modules/hostBridge/permissions/hostBridgePermissionManager.ts.md) | 文件 | 15 | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts](../../../../files/src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts.md) | 文件 | 5 | Host Bridge 写操作的自动授权登记处：签发、吊销与按 run 回收 write auto-approval grant，并判定某个 scope 是否落在自动放权范围内。 |
| [src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts](../../../../files/src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts.md) | 文件 | 6 | SkillRunner 侧的 Host Bridge 权限注册表：保存待审批权限请求、发布订阅通知并支持按请求 ID 结算。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 6 |
| [src/modules/hostBridge/server](server.md) | 1 |
| [src/utils](../../utils.md) | 1 |
