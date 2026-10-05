
# assertProviderRequestDispatchContract
<!-- node: function:src/providers/requestContracts.ts:assertProviderRequestDispatchContract -->

Provider 调度前的总契约断言：依次校验 kind 存在性、backend 兼容、provider 兼容与负载形状。
类型：函数  
复杂度：复杂  
入边数：1  
标签：validation、contract、entry-point、dispatch  
所属文件：[src/providers/requestContracts.ts](../../../../files/src/providers/requestContracts.ts.md)
源码：[src/providers/requestContracts.ts:761](../../../../../../src/providers/requestContracts.ts#L761)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeWithProvider](../../../../files/src/providers/registry.ts.md) | src/providers/registry.ts:155–221 | 经 provider 执行请求的主入口：完成 kind/backend/provider 三重契约校验、运行时选项归一、调用 execute 并归一执行结果。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [assertRequestKindProviderCompatible](../../../../files/src/providers/requestContracts.ts.md) | src/providers/requestContracts.ts:717–742 | 断言请求 kind 与目标 provider 兼容，阻止跨 provider 误派发。 |
| [assertRequestKindSupported](../../../../files/src/providers/requestContracts.ts.md) | src/providers/requestContracts.ts:665–687 | 断言请求 kind 在全局已知集合内，未知 kind 立即拒绝。 |
| [assertRequestPayloadContract](assertRequestPayloadContract.md) | src/providers/requestContracts.ts:744–759 | 按请求 kind 断言负载通过对应校验函数，不通过时抛出带上下文的契约错误。 |
