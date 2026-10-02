
# src/modules/hostBridge/server/hostBridgeRouteContract.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/hostBridgeRouteContract.ts -->

Host Bridge 路由契约的纯类型定义：声明路由 admission 类别、匹配结果形态与响应回调签名，让路由实现与 server 之间保持单向依赖。
源码：[src/modules/hostBridge/server/hostBridgeRouteContract.ts](../../../../../../../src/modules/hostBridge/server/hostBridgeRouteContract.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeProtocol.ts](hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [runtimeHttpResponse.ts](runtimeHttpResponse.ts.md) | src/modules/hostBridge/server/runtimeHttpResponse.ts | Host Bridge HTTP 响应构造层：把 JSON、文本、空响应与文件响应统一准备成可直接写入 Zotero 输出流的字节载荷，并在内存拷贝与异步文件传输之间做统一的分块、超时与失败清理。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityRoutes.ts](routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeDiagnosticsRoutes.ts](routes/hostBridgeDiagnosticsRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts | Host Bridge 诊断路由：对外暴露 profile 体检、后端状态与运行选项缓存的只读视图，所有输出均做敏感字段脱敏。 |
| [hostBridgeFileRoutes.ts](routes/hostBridgeFileRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts | Host Bridge 文件路由：处理 Agent 的文件上传与下载，校验 file handle 租约、字节上限与内容类型，并把底层文件错误映射为统一响应。 |
| [hostBridgeServer.ts](hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeSynthesisRoutes.ts](routes/hostBridgeSynthesisRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts | Host Bridge Synthesis 路由：把 sidecar 的维护状态、缓存与索引状态暴露给 Agent，并支持经审批的缓存失效操作。 |
| [hostBridgeWorkflowActivityRoutes.ts](routes/hostBridgeWorkflowActivityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts | Host Bridge 工作流与活动路由：为 Agent 提供工作流目录、校验与提交、运行与队列管理、任务与权限查询、通知确认、provider profile 维护以及 skill run 触发。 |
