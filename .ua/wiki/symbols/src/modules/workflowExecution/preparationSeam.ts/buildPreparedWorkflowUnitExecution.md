
# buildPreparedWorkflowUnitExecution
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:buildPreparedWorkflowUnitExecution -->

将执行单元与对应请求组装为可运行的已准备执行对象。
类型：函数  
复杂度：中等  
入边数：2  
标签：preparation、composition、execution-unit  
所属文件：[src/modules/workflowExecution/preparationSeam.ts](../../../../../files/src/modules/workflowExecution/preparationSeam.ts.md)
源码：[src/modules/workflowExecution/preparationSeam.ts:813](../../../../../../../src/modules/workflowExecution/preparationSeam.ts#L813)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildPreparedWorkflowBatchExecution](../../../../../files/src/modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts:888–968 | 汇总多个已准备执行对象为批量执行计划并计算可执行/跳过统计。 |
| [submitPreparedWorkflowUnits](../../../../../files/src/modules/workflowExecution/submissionSeam.ts.md) | src/modules/workflowExecution/submissionSeam.ts:128–262 | 把一批已准备工作流单元提交到宿主队列或直连执行路径，处理排队、批次提交与整体执行结果汇总。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildWorkflowExecutionUnitPreview](buildWorkflowExecutionUnitPreview.md) | src/modules/workflowExecution/preparationSeam.ts:742–811 | 构建执行单元预览描述，含任务名、输入规模与选项摘要供 UI 展示。 |
