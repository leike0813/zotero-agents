
# callHostBridgeCapabilityAsMcpTool
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:callHostBridgeCapabilityAsMcpTool -->

以 MCP tool 形式调用 capability：参数校验、审批、执行、错误映射与结果压缩的完整链路。
类型：函数  
复杂度：复杂  
入边数：1  
标签：调用、mcp、权限审批、capability  
所属文件：[src/modules/hostBridge/mcp/zoteroMcpProtocol.ts](../../../../../../files/src/modules/hostBridge/mcp/zoteroMcpProtocol.ts.md)
源码：[src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:1181](../../../../../../../../src/modules/hostBridge/mcp/zoteroMcpProtocol.ts#L1181)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [handleZoteroMcpJsonRpc](../../../../../../files/src/modules/hostBridge/mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:1309–1502 | MCP JSON-RPC 总入口：解析方法、处理 tools/list 与 tools/call，并把内部异常统一映射为 JSON-RPC 错误。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeHostBridgeCapability](../../../hostBridgeCapabilityRegistry.ts/executeHostBridgeCapability.md) | src/modules/hostBridgeCapabilityRegistry.ts:3020–3052 | Host Bridge 能力统一执行入口：解析契约错误、查找 handler 并返回标准化的成功或失败响应。 |
