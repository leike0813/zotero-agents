
# executeMutationWithBridgeProjection
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:executeMutationWithBridgeProjection -->

执行 canonical mutation 并把执行证据投影为 Bridge 的 operation 观察结果。
类型：函数  
复杂度：中等  
入边数：2  
标签：mutation、canonical、投影  
所属文件：[src/modules/hostBridgeCapabilityRegistry.ts](../../../../files/src/modules/hostBridgeCapabilityRegistry.ts.md)
源码：[src/modules/hostBridgeCapabilityRegistry.ts:764](../../../../../../src/modules/hostBridgeCapabilityRegistry.ts#L764)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeBridgeStoredAttachmentMutation](../../../../files/src/modules/hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts:1115–1211 | 执行 stored attachment 导入的完整链路：预检、managed staging、审批后再准备并最终提交写入。 |
| [executeHostBridgeCapability](executeHostBridgeCapability.md) | src/modules/hostBridgeCapabilityRegistry.ts:3020–3052 | Host Bridge 能力统一执行入口：解析契约错误、查找 handler 并返回标准化的成功或失败响应。 |

## 调用

该符号没有记录对外调用。
