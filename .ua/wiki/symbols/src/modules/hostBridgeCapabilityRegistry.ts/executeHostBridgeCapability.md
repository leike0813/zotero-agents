
# executeHostBridgeCapability
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:executeHostBridgeCapability -->

Host Bridge 能力统一执行入口：解析契约错误、查找 handler 并返回标准化的成功或失败响应。
类型：函数  
复杂度：中等  
入边数：2  
标签：能力注册、分派、host-bridge、入口点  
所属文件：[src/modules/hostBridgeCapabilityRegistry.ts](../../../../files/src/modules/hostBridgeCapabilityRegistry.ts.md)
源码：[src/modules/hostBridgeCapabilityRegistry.ts:3020](../../../../../../src/modules/hostBridgeCapabilityRegistry.ts#L3020)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [callHostBridgeCapabilityAsMcpTool](../hostBridge/mcp/zoteroMcpProtocol.ts/callHostBridgeCapabilityAsMcpTool.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:1181–1296 | 以 MCP tool 形式调用 capability：参数校验、审批、执行、错误映射与结果压缩的完整链路。 |
| [callCapability](../../../../files/src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:319–624 | 执行 capability 调用的完整链路：注册表解析、审批等待、Broker 调用、分页投影与错误映射。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [bridgeLibraryItems](../../../../files/src/modules/hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts:590–620 | 实现库条目列举能力：调用 Broker 精确分页并返回条目摘要与附件描述符。 |
| [executeMutationWithBridgeProjection](executeMutationWithBridgeProjection.md) | src/modules/hostBridgeCapabilityRegistry.ts:764–815 | 执行 canonical mutation 并把执行证据投影为 Bridge 的 operation 观察结果。 |
| [getHostBridgeCapability](getHostBridgeCapability.md) | src/modules/hostBridgeCapabilityRegistry.ts:2972–2990 | 按名称查询已注册能力的公开描述（名称、审批要求与 schema）。 |
