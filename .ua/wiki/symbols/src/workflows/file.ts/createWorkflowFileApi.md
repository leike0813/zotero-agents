
# createWorkflowFileApi
<!-- node: function:src/workflows/file.ts:createWorkflowFileApi -->

创建工作流文件 API，绑定统一持久化适配器、选择器与路径工具。
类型：函数  
复杂度：复杂  
入边数：1  
标签：factory、filesystem、api、exported  
所属文件：[src/workflows/file.ts](../../../../files/src/workflows/file.ts.md)
源码：[src/workflows/file.ts:245](../../../../../../src/workflows/file.ts#L245)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createWorkflowHostApi](../hostApi.ts/createWorkflowHostApi.md) | src/workflows/hostApi.ts:98–685 | 装配并返回 Workflow Host API v12 实例，版本与各 owner 一并校验。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [assertWorkflowCallNotCanceled](../../../../files/src/workflows/workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts:556–566 | 检查调用方取消信号，已取消时立即抛 canceled 错误。 |
