
# createScopedSynthesisReverseHostHandlers
<!-- node: function:src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:createScopedSynthesisReverseHostHandlers -->

在基础 handler 上叠加 library scope 与库修订号缓存，阻止跨库读取与过期快照复用。
类型：函数  
复杂度：复杂  
入边数：1  
标签：rpc-handler、scope、修订号、缓存  
所属文件：[src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts](../../../../../../files/src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts.md)
源码：[src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:295](../../../../../../../../src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts#L295)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createDefaultSynthesisReverseHostHandlers](../../../../../../files/src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:465–510 | 按依赖装配出默认的 scoped handler 集合，作为 sidecar RPC 的实际入口。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createSynthesisReverseHostHandlers](createSynthesisReverseHostHandlers.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:139–293 | 构造 reverse host 的基础 handler 集合，把 sidecar 回调分派到各 host port 并重建契约结果。 |
