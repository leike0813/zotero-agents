
# loadMergedWorkflowManifests
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:loadMergedWorkflowManifests -->

加载并合并多个来源的工作流 manifest，处理同名覆盖、来源标记与失败隔离。
类型：函数  
复杂度：复杂  
入边数：1  
标签：workflow、loader、catalog、core  
所属文件：[src/modules/workflow/catalog/workflowRuntime.ts](../../../../../../files/src/modules/workflow/catalog/workflowRuntime.ts.md)
源码：[src/modules/workflow/catalog/workflowRuntime.ts:341](../../../../../../../../src/modules/workflow/catalog/workflowRuntime.ts#L341)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rescanWorkflowRegistry](rescanWorkflowRegistry.md) | src/modules/workflow/catalog/workflowRuntime.ts:551–619 | 重扫工作流目录并刷新注册表状态，把注册结果与错误摘要持久化供 UI 展示。 |

## 调用

该符号没有记录对外调用。
