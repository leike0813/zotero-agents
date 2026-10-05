
# src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server/routes](../../../../../../modules/src/modules/hostBridge/server/routes.md)
<!-- node: file:src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts -->

Host Bridge 诊断路由：对外暴露 profile 体检、后端状态与运行选项缓存的只读视图，所有输出均做敏感字段脱敏。
源码：[src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts](../../../../../../../../src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts)

## 符号（8）
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts:diagnoseProfile -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts:getBackendStatus -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts:inspectProfile -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts:loadBackendSummaries -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts:matchHostBridgeDiagnosticsRoute -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts:redactHostBridgeDiagnosticText -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts:summarizeBackend -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts:summarizeRuntimeOptionsCache -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| diagnoseProfile | 函数 | 178–206 | 简单 | profile、诊断、可操作性 | 0 | 汇总 profile 诊断结论，给出可执行的修复提示。 |
| getBackendStatus | 函数 | 218–255 | 简单 | 后端、状态、诊断 | 0 | 返回后端连接状态与最近错误的脱敏视图。 |
| inspectProfile | 函数 | 134–176 | 中等 | profile、诊断、host-bridge | 0 | 检查当前 Host Bridge profile 的完整性与可达性，缺失项逐条列出。 |
| loadBackendSummaries | 函数 | 104–120 | 简单 | 后端、诊断、容错 | 0 | 加载全部已注册后端的诊断摘要，单个后端异常不影响整体。 |
| matchHostBridgeDiagnosticsRoute | 函数 | 257–303 | 简单 | 路由匹配、诊断、host-bridge | 1 | 把请求路径映射到诊断处理器。 |
| redactHostBridgeDiagnosticText | 函数 | 34–49 | 简单 | 脱敏、安全、诊断 | 0 | 对诊断文本中的 token、路径等敏感片段做脱敏，避免经诊断端点外泄。 |
| summarizeBackend | 函数 | 66–102 | 中等 | 后端、脱敏、诊断 | 0 | 把后端注册表条目投影为脱敏的诊断摘要（类型、可用性、错误原因）。 |
| summarizeRuntimeOptionsCache | 函数 | 51–64 | 简单 | 缓存、状态、诊断 | 0 | 汇总运行选项缓存的状态与条目数，不暴露缓存内容细节。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgePagination.ts](../hostBridgePagination.ts.md) | src/modules/hostBridge/server/hostBridgePagination.ts | Host Bridge 通用分页与游标实现：基于内容指纹的稳定游标解码、行分页与长文本分块，保证翻页过程中结果集不漂移。 |
| [hostBridgeProtocol.ts](../hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [hostBridgeRouteContract.ts](../hostBridgeRouteContract.ts.md) | src/modules/hostBridge/server/hostBridgeRouteContract.ts | Host Bridge 路由契约的纯类型定义：声明路由 admission 类别、匹配结果形态与响应回调签名，让路由实现与 server 之间保持单向依赖。 |
| [hostHttpRequestReader.ts](../hostHttpRequestReader.ts.md) | src/modules/hostBridge/server/hostHttpRequestReader.ts | 有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。 |
| [registry.ts](../../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [types.ts](../../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeServer.ts](../hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| matchHostBridgeDiagnosticsRoute | 函数 | 257–303 | 把请求路径映射到诊断处理器。 |
| redactHostBridgeDiagnosticText | 函数 | 34–49 | 对诊断文本中的 token、路径等敏感片段做脱敏，避免经诊断端点外泄。 |
