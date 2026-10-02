
# groupCandidates
<!-- node: function:src/workflows/workflowInputPlanning.ts:groupCandidates -->

按工作流声明的分组策略把候选聚为执行单元，并为每组派生任务名与选择上下文。
类型：函数  
复杂度：复杂  
入边数：1  
标签：planning、grouping、workflow  
所属文件：[src/workflows/workflowInputPlanning.ts](../../../../files/src/workflows/workflowInputPlanning.ts.md)
源码：[src/workflows/workflowInputPlanning.ts:987](../../../../../../src/workflows/workflowInputPlanning.ts#L987)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [planWorkflowInput](planWorkflowInput.md) | src/workflows/workflowInputPlanning.ts:1120–1235 | 工作流输入规划入口：读取选择集、应用计数与就绪度规则、分组并冻结为可执行计划。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [selectCandidates](selectCandidates.md) | src/workflows/workflowInputPlanning.ts:742–811 | 按选择计数规则在分组内挑选实际参与执行的候选，跳过项记录原因。 |
