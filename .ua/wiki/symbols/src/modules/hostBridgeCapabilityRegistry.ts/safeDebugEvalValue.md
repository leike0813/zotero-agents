
# safeDebugEvalValue
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:safeDebugEvalValue -->

对 debug eval 结果做安全投影：限制深度、截断长字符串并抹除本地路径。
类型：函数  
复杂度：复杂  
入边数：1  
标签：debug、脱敏、安全、投影  
所属文件：[src/modules/hostBridgeCapabilityRegistry.ts](../../../../files/src/modules/hostBridgeCapabilityRegistry.ts.md)
源码：[src/modules/hostBridgeCapabilityRegistry.ts:1906](../../../../../../src/modules/hostBridgeCapabilityRegistry.ts#L1906)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [debugZoteroEval](../../../../files/src/modules/hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts:2030–2107 | 在受限环境里执行调试表达式，捕获异常并对结果施加 JSON 体积上限。 |

## 调用

该符号没有记录对外调用。
