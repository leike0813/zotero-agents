
# planWorkflowInput
<!-- node: function:src/workflows/workflowInputPlanning.ts:planWorkflowInput -->

工作流输入规划入口：读取选择集、应用计数与就绪度规则、分组并冻结为可执行计划。
类型：函数  
复杂度：复杂  
入边数：1  
标签：planning、workflow、entry-point、selection  
所属文件：[src/workflows/workflowInputPlanning.ts](../../../../files/src/workflows/workflowInputPlanning.ts.md)
源码：[src/workflows/workflowInputPlanning.ts:1120](../../../../../../src/workflows/workflowInputPlanning.ts#L1120)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [planWorkflowExecutionUnits](../../../../files/src/workflows/runtime.ts.md) | src/workflows/runtime.ts:850–889 | 按输入规划与选择集生成工作流执行单元列表，决定任务数、顺序与各自的选择子集。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveWorkflowHostContractVersion](../../../../files/src/workflows/workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts:387–405 | 解析宿主实际支持的 Workflow Host API 契约版本号，供输入规划选择上下文构造方式。 |
| [freezePlan](freezePlan.md) | src/workflows/workflowInputPlanning.ts:1084–1118 | 把规划结果冻结为不可变输入计划，并附上计数与跳过原因统计。 |
| [groupCandidates](groupCandidates.md) | src/workflows/workflowInputPlanning.ts:987–1074 | 按工作流声明的分组策略把候选聚为执行单元，并为每组派生任务名与选择上下文。 |
