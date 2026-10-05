
# invokeSynthesisClientCapability
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:invokeSynthesisClientCapability -->

按能力名调用 SynthesisClient 方法，并对入参与结果做契约重建与边界裁剪。
类型：函数  
复杂度：复杂  
入边数：1  
标签：synthesis、rpc-代理、契约  
所属文件：[src/modules/hostBridgeCapabilityRegistry.ts](../../../../files/src/modules/hostBridgeCapabilityRegistry.ts.md)
源码：[src/modules/hostBridgeCapabilityRegistry.ts:2307](../../../../../../src/modules/hostBridgeCapabilityRegistry.ts#L2307)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [callSynthesisDebugClient](../../../../files/src/modules/hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts:2490–2582 | 为 debug 能力复用 SynthesisClient 调用路径，并附加调试模式的诊断包装。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applySynthesisOutputBoundary](applySynthesisOutputBoundary.md) | src/modules/hostBridgeCapabilityRegistry.ts:1696–1855 | 对 Synthesis 能力的输入与输出做边界裁剪与分页归一，防止超出契约页大小限制。 |
