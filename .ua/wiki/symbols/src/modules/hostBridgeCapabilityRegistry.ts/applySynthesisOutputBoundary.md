
# applySynthesisOutputBoundary
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:applySynthesisOutputBoundary -->

对 Synthesis 能力的输入与输出做边界裁剪与分页归一，防止超出契约页大小限制。
类型：函数  
复杂度：复杂  
入边数：1  
标签：输出边界、契约、synthesis、裁剪  
所属文件：[src/modules/hostBridgeCapabilityRegistry.ts](../../../../files/src/modules/hostBridgeCapabilityRegistry.ts.md)
源码：[src/modules/hostBridgeCapabilityRegistry.ts:1696](../../../../../../src/modules/hostBridgeCapabilityRegistry.ts#L1696)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [invokeSynthesisClientCapability](invokeSynthesisClientCapability.md) | src/modules/hostBridgeCapabilityRegistry.ts:2307–2384 | 按能力名调用 SynthesisClient 方法，并对入参与结果做契约重建与边界裁剪。 |

## 调用

该符号没有记录对外调用。
