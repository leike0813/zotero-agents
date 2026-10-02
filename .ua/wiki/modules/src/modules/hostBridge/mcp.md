
# src/modules/hostBridge/mcp
> 目录聚合页：2 个文件、39 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/hostBridge/mcp/zoteroMcpProtocol.ts](../../../../files/src/modules/hostBridge/mcp/zoteroMcpProtocol.ts.md) | 文件 | 16 | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |
| [src/modules/hostBridge/mcp/zoteroMcpServer.ts](../../../../files/src/modules/hostBridge/mcp/zoteroMcpServer.ts.md) | 文件 | 23 | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules/hostBridge/server](server.md) | 6 |
| [src/modules](../../modules.md) | 4 |
| [src/utils](../../utils.md) | 2 |
| [src/workflows](../../workflows.md) | 2 |
| [packages/synthesis-contracts/src](../../../packages/synthesis-contracts/src.md) | 1 |
| [src/modules/hostBridge/permissions](permissions.md) | 1 |
| [src/modules/hostBridge/workflow](workflow.md) | 1 |
| [src/modules/zoteroHost](../zoteroHost.md) | 1 |
