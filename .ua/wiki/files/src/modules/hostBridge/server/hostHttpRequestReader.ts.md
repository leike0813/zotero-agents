
# src/modules/hostBridge/server/hostHttpRequestReader.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/hostHttpRequestReader.ts -->

有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。
源码：[src/modules/hostBridge/server/hostHttpRequestReader.ts](../../../../../../../src/modules/hostBridge/server/hostHttpRequestReader.ts)

## 符号（13）
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:beginHostHttpRequestRead -->
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:decodeUtf8Body -->
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:findHeaderSeparator -->
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:getComponents -->
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:getMainThread -->
<!-- node: class:src/modules/hostBridge/server/hostHttpRequestReader.ts:HostHttpRequestReadError -->
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:hostHttpUtf8ByteLength -->
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:parseFraming -->
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:parseHostHttpJsonBody -->
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:parseHostHttpPath -->
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:parseHostHttpRequestBytes -->
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:parseHttpHeaders -->
<!-- node: function:src/modules/hostBridge/server/hostHttpRequestReader.ts:resolveAsyncInputStream -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [beginHostHttpRequestRead](../../../../../symbols/src/modules/hostBridge/server/hostHttpRequestReader.ts/beginHostHttpRequestRead.md) | 函数 | 352–698 | 复杂 | 请求读取、有界读取、入口点、http | 1 | 开始有界读取一个 HTTP 请求：施加字节上限与超时、解析分帧、组装完整请求对象，是 Host Bridge 传输层的唯一读取入口。 |
| decodeUtf8Body | 函数 | 179–188 | 简单 | 解码、utf-8、http | 0 | 按 UTF-8 解码请求体，解码错误时给出明确失败。 |
| findHeaderSeparator | 函数 | 165–177 | 简单 | 解析、http、字节流 | 0 | 在字节流中定位头结束分隔符并返回其位置。 |
| getComponents | 函数 | 94–104 | 简单 | 沙箱兼容、components、http | 0 | 获取沙箱中的 Components 句柄；运行环境不提供时立即失败而非静默降级。 |
| getMainThread | 函数 | 106–117 | 简单 | 沙箱兼容、线程、http | 0 | 解析主线程对象，供在正确线程上下文创建流对象。 |
| HostHttpRequestReadError | 类 | 45–56 | 简单 | 错误类型、请求读取、http | 0 | 请求读取失败时抛出的类型化错误，携带可返回给客户端的错误码。 |
| hostHttpUtf8ByteLength | 函数 | 235–239 | 简单 | utf-8、工具函数、http | 0 | 计算字符串的 UTF-8 字节长度，用于与 Content-Length 比对。 |
| parseFraming | 函数 | 269–319 | 中等 | 分帧、http、安全 | 0 | 判定请求采用 Content-Length 还是 chunked 帧，并校验各自分帧合法性。 |
| parseHostHttpJsonBody | 函数 | 241–244 | 简单 | json、解析、http | 0 | 把请求体解析为 JSON 对象，解析失败抛出读取错误。 |
| parseHostHttpPath | 函数 | 143–163 | 简单 | 解析、请求行、http | 0 | 解析请求行中的路径与查询串，非法路径或不可解码字符被拒绝。 |
| parseHostHttpRequestBytes | 函数 | 205–233 | 简单 | 解析、http、入口 | 0 | 从完整请求字节解析出请求行、头与 body，供测试与内部复用。 |
| parseHttpHeaders | 函数 | 190–203 | 简单 | 解析、http-头、http | 1 | 把原始头字段解析为大小写不敏感的映射。 |
| resolveAsyncInputStream | 函数 | 321–339 | 简单 | 流、socket、沙箱兼容 | 0 | 从连接解析异步输入流，兼容不同的 socket 类型。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityRoutes.ts](routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeDiagnosticsRoutes.ts](routes/hostBridgeDiagnosticsRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts | Host Bridge 诊断路由：对外暴露 profile 体检、后端状态与运行选项缓存的只读视图，所有输出均做敏感字段脱敏。 |
| [hostBridgeFileRoutes.ts](routes/hostBridgeFileRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts | Host Bridge 文件路由：处理 Agent 的文件上传与下载，校验 file handle 租约、字节上限与内容类型，并把底层文件错误映射为统一响应。 |
| [hostBridgePagination.ts](hostBridgePagination.ts.md) | src/modules/hostBridge/server/hostBridgePagination.ts | Host Bridge 通用分页与游标实现：基于内容指纹的稳定游标解码、行分页与长文本分块，保证翻页过程中结果集不漂移。 |
| [hostBridgeServer.ts](hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeSynthesisRoutes.ts](routes/hostBridgeSynthesisRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts | Host Bridge Synthesis 路由：把 sidecar 的维护状态、缓存与索引状态暴露给 Agent，并支持经审批的缓存失效操作。 |
| [hostBridgeWorkflowActivityRoutes.ts](routes/hostBridgeWorkflowActivityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts | Host Bridge 工作流与活动路由：为 Agent 提供工作流目录、校验与提交、运行与队列管理、任务与权限查询、通知确认、provider profile 维护以及 skill run 触发。 |
| [synthesisReverseHostEndpoint.ts](../../synthesis/reverseHost/synthesisReverseHostEndpoint.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts | 反向宿主 HTTP 端点：在 loopback 上自建最小 HTTP 服务器，解析 `/synthesis/v1/host-call` 请求并转交 broker 处置，同时提供无 socket 的纯函数请求处理入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [beginHostHttpRequestRead](../../../../../symbols/src/modules/hostBridge/server/hostHttpRequestReader.ts/beginHostHttpRequestRead.md) | 函数 | 352–698 | 开始有界读取一个 HTTP 请求：施加字节上限与超时、解析分帧、组装完整请求对象，是 Host Bridge 传输层的唯一读取入口。 |
| HostHttpRequestReadError | 类 | 45–56 | 请求读取失败时抛出的类型化错误，携带可返回给客户端的错误码。 |
| hostHttpUtf8ByteLength | 函数 | 235–239 | 计算字符串的 UTF-8 字节长度，用于与 Content-Length 比对。 |
| parseHostHttpJsonBody | 函数 | 241–244 | 把请求体解析为 JSON 对象，解析失败抛出读取错误。 |
| parseHostHttpPath | 函数 | 143–163 | 解析请求行中的路径与查询串，非法路径或不可解码字符被拒绝。 |
| parseHostHttpRequestBytes | 函数 | 205–233 | 从完整请求字节解析出请求行、头与 body，供测试与内部复用。 |
