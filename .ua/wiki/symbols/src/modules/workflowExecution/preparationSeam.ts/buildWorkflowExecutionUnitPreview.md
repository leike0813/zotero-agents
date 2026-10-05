
# buildWorkflowExecutionUnitPreview
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:buildWorkflowExecutionUnitPreview -->

构建执行单元预览描述，含任务名、输入规模与选项摘要供 UI 展示。
类型：函数  
复杂度：中等  
入边数：2  
标签：preparation、preview、projection、ui  
所属文件：[src/modules/workflowExecution/preparationSeam.ts](../../../../../files/src/modules/workflowExecution/preparationSeam.ts.md)
源码：[src/modules/workflowExecution/preparationSeam.ts:742](../../../../../../../src/modules/workflowExecution/preparationSeam.ts#L742)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeWorkflowFromCurrentSelection](../../workflow/ui/workflowExecute.ts/executeWorkflowFromCurrentSelection.md) | src/modules/workflow/ui/workflowExecute.ts:78–408 | 从当前选择执行工作流：校验可运行性、运行 preparation seam 生成执行单元、判重后提交，并处理跳过与错误反馈。 |
| [buildPreparedWorkflowUnitExecution](buildPreparedWorkflowUnitExecution.md) | src/modules/workflowExecution/preparationSeam.ts:813–886 | 将执行单元与对应请求组装为可运行的已准备执行对象。 |

## 调用

该符号没有记录对外调用。
