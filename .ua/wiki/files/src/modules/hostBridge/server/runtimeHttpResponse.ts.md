
# src/modules/hostBridge/server/runtimeHttpResponse.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/runtimeHttpResponse.ts -->

Host Bridge HTTP 响应构造层：把 JSON、文本、空响应与文件响应统一准备成可直接写入 Zotero 输出流的字节载荷，并在内存拷贝与异步文件传输之间做统一的分块、超时与失败清理。
源码：[src/modules/hostBridge/server/runtimeHttpResponse.ts](../../../../../../../src/modules/hostBridge/server/runtimeHttpResponse.ts)

## 符号（7）
<!-- node: function:src/modules/hostBridge/server/runtimeHttpResponse.ts:beginAsyncMemoryCopy -->
<!-- node: function:src/modules/hostBridge/server/runtimeHttpResponse.ts:beginNodeMemoryCopy -->
<!-- node: function:src/modules/hostBridge/server/runtimeHttpResponse.ts:prepareEmptyHttpResponse -->
<!-- node: function:src/modules/hostBridge/server/runtimeHttpResponse.ts:prepareRuntimeFileHttpResponse -->
<!-- node: function:src/modules/hostBridge/server/runtimeHttpResponse.ts:prepareRuntimeHttpResponse -->
<!-- node: function:src/modules/hostBridge/server/runtimeHttpResponse.ts:prepareText -->
<!-- node: function:src/modules/hostBridge/server/runtimeHttpResponse.ts:writeRuntimeHttpResponse -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| beginAsyncMemoryCopy | 函数 | 300–414 | 复杂 | 文件传输、分块、异步调度、错误处理 | 0 | 在没有 Node 流 API 的宿主中，用分片调度与写入确认机制把内存响应体逐步写入输出流，并处理失败清理。 |
| beginNodeMemoryCopy | 函数 | 239–277 | 中等 | 文件传输、分块、运行时适配 | 1 | 在支持 Node 兼容 API 的运行时中，用分块流把内存响应体复制到输出流并返回完成与中止句柄。 |
| prepareEmptyHttpResponse | 函数 | 108–132 | 简单 | utility、http-response、响应构造 | 0 | 构造无正文的 HTTP 响应载荷，用于仅返回状态码与头的场景。 |
| prepareRuntimeFileHttpResponse | 函数 | 193–213 | 中等 | http-response、文件传输、响应构造 | 0 | 构造以文件为正文的 HTTP 响应，只写 header 并交由后续的异步文件传输补齐 body。 |
| prepareRuntimeHttpResponse | 函数 | 134–150 | 简单 | http-response、运行时适配、分派 | 0 | 按运行时能力把 JSON、文本或空响应统一分派到对应的 prepare 函数。 |
| prepareText | 函数 | 65–89 | 简单 | utility、http-response、编码、序列化 | 1 | 将任意文本值编码为带 Content-Type 与 Content-Length 的内存 HTTP 响应载荷。 |
| writeRuntimeHttpResponse | 函数 | 426–447 | 中等 | http-response、文件传输、utility | 0 | 把已准备好的内存或文件响应写入输出流，统一处理关闭、失败上报与中止信号。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimeFileTransfer.ts](../../runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeFileRoutes.ts](routes/hostBridgeFileRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts | Host Bridge 文件路由：处理 Agent 的文件上传与下载，校验 file handle 租约、字节上限与内容类型，并把底层文件错误映射为统一响应。 |
| [hostBridgeRouteContract.ts](hostBridgeRouteContract.ts.md) | src/modules/hostBridge/server/hostBridgeRouteContract.ts | Host Bridge 路由契约的纯类型定义：声明路由 admission 类别、匹配结果形态与响应回调签名，让路由实现与 server 之间保持单向依赖。 |
| [hostBridgeServer.ts](hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [synthesisReverseHostEndpoint.ts](../../synthesis/reverseHost/synthesisReverseHostEndpoint.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts | 反向宿主 HTTP 端点：在 loopback 上自建最小 HTTP 服务器，解析 `/synthesis/v1/host-call` 请求并转交 broker 处置，同时提供无 socket 的纯函数请求处理入口。 |
| [zoteroMcpServer.ts](../mcp/zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimeFileTransfer.ts](../../runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| prepareEmptyHttpResponse | 函数 | 108–132 | 构造无正文的 HTTP 响应载荷，用于仅返回状态码与头的场景。 |
| prepareRuntimeFileHttpResponse | 函数 | 193–213 | 构造以文件为正文的 HTTP 响应，只写 header 并交由后续的异步文件传输补齐 body。 |
| prepareRuntimeHttpResponse | 函数 | 134–150 | 按运行时能力把 JSON、文本或空响应统一分派到对应的 prepare 函数。 |
| writeRuntimeHttpResponse | 函数 | 426–447 | 把已准备好的内存或文件响应写入输出流，统一处理关闭、失败上报与中止信号。 |
