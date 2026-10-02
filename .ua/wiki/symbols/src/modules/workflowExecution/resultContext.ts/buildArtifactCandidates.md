
# buildArtifactCandidates
<!-- node: function:src/modules/workflowExecution/resultContext.ts:buildArtifactCandidates -->

组合基础路径、命名空间与文件名后缀，生成最终产物候选列表。
类型：函数  
复杂度：简单  
入边数：2  
标签：path-resolution、artifact、candidates  
所属文件：[src/modules/workflowExecution/resultContext.ts](../../../../../files/src/modules/workflowExecution/resultContext.ts.md)
源码：[src/modules/workflowExecution/resultContext.ts:329](../../../../../../../src/modules/workflowExecution/resultContext.ts#L329)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createWorkflowResultContext](createWorkflowResultContext.md) | src/modules/workflowExecution/resultContext.ts:442–578 | 构造工作流结果上下文：打开 bundle reader、定位并解析 result.json，并暴露按字段与产物路径读取的访问器。 |
| [tryReadResultJson](../../../../../files/src/modules/workflowExecution/resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts:373–440 | 按候选列表依次尝试读取并解析 result.json，失败时静默继续下一候选。 |

## 调用

该符号没有记录对外调用。
