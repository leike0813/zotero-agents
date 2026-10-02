
# buildSkillRunnerJobRequest
<!-- node: function:src/workflows/declarativeRequestCompiler.ts:buildSkillRunnerJobRequest -->

构建 skillrunner.job.v1 请求负载：注入 skill、上传映射、运行时选项与来源附件引用。
类型：函数  
复杂度：复杂  
入边数：2  
标签：workflow、compiler、request-building、skillrunner  
所属文件：[src/workflows/declarativeRequestCompiler.ts](../../../../files/src/workflows/declarativeRequestCompiler.ts.md)
源码：[src/workflows/declarativeRequestCompiler.ts:248](../../../../../../src/workflows/declarativeRequestCompiler.ts#L248)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildSkillRunnerSequenceRequest](../../../../files/src/workflows/declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts:380–451 | 构建多步骤序列请求：按 manifest 步骤逐个编译子请求并保持步骤顺序稳定。 |
| [compileDeclarativeRequest](compileDeclarativeRequest.md) | src/workflows/declarativeRequestCompiler.ts:651–704 | 声明式请求编译入口：按 request.kind 分派到对应构建器，并在返回前断言请求负载符合 provider 契约。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveTaskName](../../../../files/src/workflows/declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts:222–246 | 解析最终任务名：优先使用模板渲染结果，否则回退到工作流标签或附件文件名。 |
| [resolveWorkflowParams](../../../../files/src/workflows/declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts:52–65 | 解析工作流参数：合并 manifest 默认值与运行期覆盖，保证参数为 JSON 安全值。 |
