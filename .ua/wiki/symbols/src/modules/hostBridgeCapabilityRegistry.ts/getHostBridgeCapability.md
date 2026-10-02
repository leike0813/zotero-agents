
# getHostBridgeCapability
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:getHostBridgeCapability -->

按名称查询已注册能力的公开描述（名称、审批要求与 schema）。
类型：函数  
复杂度：简单  
入边数：3  
标签：能力注册、查询、host-bridge  
所属文件：[src/modules/hostBridgeCapabilityRegistry.ts](../../../../files/src/modules/hostBridgeCapabilityRegistry.ts.md)
源码：[src/modules/hostBridgeCapabilityRegistry.ts:2972](../../../../../../src/modules/hostBridgeCapabilityRegistry.ts#L2972)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [mcpInputSchemaForCapability](../../../../files/src/modules/hostBridge/mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:909–922 | 由 capability 合约推导出对应的 MCP tool 入参 schema。 |
| [callCapability](../../../../files/src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:319–624 | 执行 capability 调用的完整链路：注册表解析、审批等待、Broker 调用、分页投影与错误映射。 |
| [executeHostBridgeCapability](executeHostBridgeCapability.md) | src/modules/hostBridgeCapabilityRegistry.ts:3020–3052 | Host Bridge 能力统一执行入口：解析契约错误、查找 handler 并返回标准化的成功或失败响应。 |

## 调用

该符号没有记录对外调用。
