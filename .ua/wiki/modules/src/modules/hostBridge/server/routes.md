
# src/modules/hostBridge/server/routes
> 目录聚合页：5 个文件、63 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts](../../../../../files/src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts.md) | 文件 | 11 | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts](../../../../../files/src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts.md) | 文件 | 8 | Host Bridge 诊断路由：对外暴露 profile 体检、后端状态与运行选项缓存的只读视图，所有输出均做敏感字段脱敏。 |
| [src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts](../../../../../files/src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts.md) | 文件 | 4 | Host Bridge 文件路由：处理 Agent 的文件上传与下载，校验 file handle 租约、字节上限与内容类型，并把底层文件错误映射为统一响应。 |
| [src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts](../../../../../files/src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts.md) | 文件 | 5 | Host Bridge Synthesis 路由：把 sidecar 的维护状态、缓存与索引状态暴露给 Agent，并支持经审批的缓存失效操作。 |
| [src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts](../../../../../files/src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts.md) | 文件 | 35 | Host Bridge 工作流与活动路由：为 Agent 提供工作流目录、校验与提交、运行与队列管理、任务与权限查询、通知确认、provider profile 维护以及 skill run 触发。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules/hostBridge/server](../server.md) | 22 |
| [src/modules/hostBridge/permissions](../permissions.md) | 4 |
| [src/modules](../../../modules.md) | 3 |
| [src/backends](../../../backends.md) | 2 |
| [src/modules/hostBridge/workflow](../workflow.md) | 2 |
| [packages/synthesis-contracts/src](../../../../packages/synthesis-contracts/src.md) | 1 |
| [src/modules/synthesisClient](../../synthesisClient.md) | 1 |
| [src/modules/zoteroHost](../../zoteroHost.md) | 1 |
| [src/workflows](../../../workflows.md) | 1 |
