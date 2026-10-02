
# buildGenericHttpRequest
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:buildGenericHttpRequest -->

构建通用 HTTP 单请求负载，注入已编译的模板变量与声明式请求体。
类型：函数  
复杂度：复杂  
入边数：2  
标签：workflow、compiler、request-building  
所属文件：[src/workflows/declarativeRequestCompiler.ts](../../../../files/src/workflows/declarativeRequestCompiler.ts.md)
源码：[src/workflows/declarativeRequestCompiler.ts:453](../../../../../../src/workflows/declarativeRequestCompiler.ts#L453)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildGenericHttpStepsRequest](../../../../files/src/workflows/declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts:577–649 | 构建通用 HTTP 多步骤序列负载，编译各步骤的请求体、提取路径与轮询参数。 |
| [compileDeclarativeRequest](compileDeclarativeRequest.md) | src/workflows/declarativeRequestCompiler.ts:651–704 | 声明式请求编译入口：按 request.kind 分派到对应构建器，并在返回前断言请求负载符合 provider 契约。 |

## 调用

该符号没有记录对外调用。
