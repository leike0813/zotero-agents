
# compileDeclarativeRequest
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:compileDeclarativeRequest -->

声明式请求编译入口：按 request.kind 分派到对应构建器，并在返回前断言请求负载符合 provider 契约。
类型：函数  
复杂度：复杂  
入边数：1  
标签：workflow、compiler、entry-point、dispatch  
所属文件：[src/workflows/declarativeRequestCompiler.ts](../../../../files/src/workflows/declarativeRequestCompiler.ts.md)
源码：[src/workflows/declarativeRequestCompiler.ts:651](../../../../../../src/workflows/declarativeRequestCompiler.ts#L651)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeBuildRequests](../../../../files/src/workflows/runtime.ts.md) | src/workflows/runtime.ts:891–1210 | 执行单元的 build 阶段主循环：逐单元编译声明式请求、调用 hook 构建请求并汇总 build 结果与失败原因。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [assertRequestPayloadContract](../../providers/requestContracts.ts/assertRequestPayloadContract.md) | src/providers/requestContracts.ts:744–759 | 按请求 kind 断言负载通过对应校验函数，不通过时抛出带上下文的契约错误。 |
| [buildGenericHttpRequest](buildGenericHttpRequest.md) | src/workflows/declarativeRequestCompiler.ts:453–540 | 构建通用 HTTP 单请求负载，注入已编译的模板变量与声明式请求体。 |
| [buildSkillRunnerJobRequest](buildSkillRunnerJobRequest.md) | src/workflows/declarativeRequestCompiler.ts:248–372 | 构建 skillrunner.job.v1 请求负载：注入 skill、上传映射、运行时选项与来源附件引用。 |
