
# src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server/routes](../../../../../../modules/src/modules/hostBridge/server/routes.md)
<!-- node: file:src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts -->

Host Bridge 文件路由：处理 Agent 的文件上传与下载，校验 file handle 租约、字节上限与内容类型，并把底层文件错误映射为统一响应。
源码：[src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts](../../../../../../../../src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts)

## 符号（4）
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts:downloadFile -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts:fileErrorResponse -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts:matchHostBridgeFileRoute -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts:uploadFile -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| downloadFile | 函数 | 41–88 | 中等 | 下载、file-handle、路由 | 0 | 处理文件下载请求：校验 handle 与租约后以二进制响应回传内容。 |
| fileErrorResponse | 函数 | 21–39 | 简单 | 错误映射、文件、响应 | 0 | 把文件相关错误映射为结构化响应，区分非法 ID、租约冲突与超限。 |
| matchHostBridgeFileRoute | 函数 | 164–181 | 简单 | 路由匹配、文件、host-bridge | 1 | 把请求路径与方法匹配到文件处理器。 |
| uploadFile | 函数 | 90–162 | 中等 | 上传、文件注册、安全 | 0 | 处理文件上传请求：施加大小上限、写入暂存区并登记为带租约的 file handle。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeFileRegistry.ts](../hostBridgeFileRegistry.ts.md) | src/modules/hostBridge/server/hostBridgeFileRegistry.ts | Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。 |
| [hostBridgeProtocol.ts](../hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [hostBridgeRouteContract.ts](../hostBridgeRouteContract.ts.md) | src/modules/hostBridge/server/hostBridgeRouteContract.ts | Host Bridge 路由契约的纯类型定义：声明路由 admission 类别、匹配结果形态与响应回调签名，让路由实现与 server 之间保持单向依赖。 |
| [hostHttpRequestReader.ts](../hostHttpRequestReader.ts.md) | src/modules/hostBridge/server/hostHttpRequestReader.ts | 有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。 |
| [runtimeHttpResponse.ts](../runtimeHttpResponse.ts.md) | src/modules/hostBridge/server/runtimeHttpResponse.ts | Host Bridge HTTP 响应构造层：把 JSON、文本、空响应与文件响应统一准备成可直接写入 Zotero 输出流的字节载荷，并在内存拷贝与异步文件传输之间做统一的分块、超时与失败清理。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeServer.ts](../hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| matchHostBridgeFileRoute | 函数 | 164–181 | 把请求路径与方法匹配到文件处理器。 |
