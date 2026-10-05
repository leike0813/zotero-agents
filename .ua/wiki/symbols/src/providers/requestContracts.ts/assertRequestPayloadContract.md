
# assertRequestPayloadContract
<!-- node: function:src/providers/requestContracts.ts:assertRequestPayloadContract -->

按请求 kind 断言负载通过对应校验函数，不通过时抛出带上下文的契约错误。
类型：函数  
复杂度：中等  
入边数：2  
标签：validation、contract、entry-point  
所属文件：[src/providers/requestContracts.ts](../../../../files/src/providers/requestContracts.ts.md)
源码：[src/providers/requestContracts.ts:744](../../../../../../src/providers/requestContracts.ts#L744)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [assertProviderRequestDispatchContract](assertProviderRequestDispatchContract.md) | src/providers/requestContracts.ts:761–797 | Provider 调度前的总契约断言：依次校验 kind 存在性、backend 兼容、provider 兼容与负载形状。 |
| [compileDeclarativeRequest](../../workflows/declarativeRequestCompiler.ts/compileDeclarativeRequest.md) | src/workflows/declarativeRequestCompiler.ts:651–704 | 声明式请求编译入口：按 request.kind 分派到对应构建器，并在返回前断言请求负载符合 provider 契约。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildContractErrorMessage](../../../../files/src/providers/requestContracts.ts.md) | src/providers/requestContracts.ts:603–622 | 把契约违规细节组装为可读错误消息，包含 kind、provider 与具体原因。 |
