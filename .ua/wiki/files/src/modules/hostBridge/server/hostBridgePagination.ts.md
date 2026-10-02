
# src/modules/hostBridge/server/hostBridgePagination.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/hostBridgePagination.ts -->

Host Bridge 通用分页与游标实现：基于内容指纹的稳定游标解码、行分页与长文本分块，保证翻页过程中结果集不漂移。
源码：[src/modules/hostBridge/server/hostBridgePagination.ts](../../../../../../../src/modules/hostBridge/server/hostBridgePagination.ts)

## 符号（7）
<!-- node: function:src/modules/hostBridge/server/hostBridgePagination.ts:chunkHostBridgeText -->
<!-- node: function:src/modules/hostBridge/server/hostBridgePagination.ts:decodeCursor -->
<!-- node: class:src/modules/hostBridge/server/hostBridgePagination.ts:HostBridgeCursorError -->
<!-- node: function:src/modules/hostBridge/server/hostBridgePagination.ts:paginateHostBridgeRequestRows -->
<!-- node: function:src/modules/hostBridge/server/hostBridgePagination.ts:paginateHostBridgeRows -->
<!-- node: function:src/modules/hostBridge/server/hostBridgePagination.ts:requestRowKey -->
<!-- node: function:src/modules/hostBridge/server/hostBridgePagination.ts:stableValue -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| chunkHostBridgeText | 函数 | 258–287 | 中等 | 文本分块、有界输出、分页 | 0 | 把长文本按有界窗口分块并保留块序，供 Agent 分次读取。 |
| decodeCursor | 函数 | 83–114 | 简单 | 游标、校验、分页 | 0 | 解码并校验分页游标，结构非法或与请求参数不符时抛出 cursor 错误。 |
| HostBridgeCursorError | 类 | 21–32 | 简单 | 错误类型、游标、分页 | 0 | 游标非法、被篡改或与当前查询不匹配时抛出的类型化错误。 |
| paginateHostBridgeRequestRows | 函数 | 239–256 | 简单 | 分页、请求项、host-bridge | 0 | 以请求项为单位分页，适配审批与队列等请求形态的资源列表。 |
| [paginateHostBridgeRows](../../../../../symbols/src/modules/hostBridge/server/hostBridgePagination.ts/paginateHostBridgeRows.md) | 函数 | 122–206 | 复杂 | 分页、游标、核心逻辑 | 1 | 对结果行做基于游标的稳定分页，输出页内容、下一页游标与是否还有更多。 |
| requestRowKey | 函数 | 216–237 | 简单 | 行键、分页、规范化 | 0 | 从请求项中提取稳定行键，缺失时退化为内容指纹。 |
| stableValue | 函数 | 51–64 | 简单 | 规范化、确定性、分页 | 0 | 把任意值规范化为稳定可比较的字符串，保证游标计算确定性。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostHttpRequestReader.ts](hostHttpRequestReader.ts.md) | src/modules/hostBridge/server/hostHttpRequestReader.ts | 有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。 |
| [notePayloadCodec.ts](../../zoteroHost/notePayloadCodec.ts.md) | src/modules/zoteroHost/notePayloadCodec.ts | 受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityRegistry.ts](../../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeCapabilityRoutes.ts](routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeDiagnosticsRoutes.ts](routes/hostBridgeDiagnosticsRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts | Host Bridge 诊断路由：对外暴露 profile 体检、后端状态与运行选项缓存的只读视图，所有输出均做敏感字段脱敏。 |
| [hostBridgeServer.ts](hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeWorkflowActivityRoutes.ts](routes/hostBridgeWorkflowActivityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts | Host Bridge 工作流与活动路由：为 Agent 提供工作流目录、校验与提交、运行与队列管理、任务与权限查询、通知确认、provider profile 维护以及 skill run 触发。 |
| [zoteroMcpProtocol.ts](../mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| chunkHostBridgeText | 函数 | 258–287 | 把长文本按有界窗口分块并保留块序，供 Agent 分次读取。 |
| HostBridgeCursorError | 类 | 21–32 | 游标非法、被篡改或与当前查询不匹配时抛出的类型化错误。 |
| paginateHostBridgeRequestRows | 函数 | 239–256 | 以请求项为单位分页，适配审批与队列等请求形态的资源列表。 |
| [paginateHostBridgeRows](../../../../../symbols/src/modules/hostBridge/server/hostBridgePagination.ts/paginateHostBridgeRows.md) | 函数 | 122–206 | 对结果行做基于游标的稳定分页，输出页内容、下一页游标与是否还有更多。 |
