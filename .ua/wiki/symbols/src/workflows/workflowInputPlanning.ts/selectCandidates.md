
# selectCandidates
<!-- node: function:src/workflows/workflowInputPlanning.ts:selectCandidates -->

按选择计数规则在分组内挑选实际参与执行的候选，跳过项记录原因。
类型：函数  
复杂度：复杂  
入边数：1  
标签：planning、selection、filtering  
所属文件：[src/workflows/workflowInputPlanning.ts](../../../../files/src/workflows/workflowInputPlanning.ts.md)
源码：[src/workflows/workflowInputPlanning.ts:742](../../../../../../src/workflows/workflowInputPlanning.ts#L742)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [groupCandidates](groupCandidates.md) | src/workflows/workflowInputPlanning.ts:987–1074 | 按工作流声明的分组策略把候选聚为执行单元，并为每组派生任务名与选择上下文。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyCandidateFilters](applyCandidateFilters.md) | src/workflows/workflowInputPlanning.ts:827–924 | 应用 manifest 声明的候选过滤规则（kind、mime、计数、生成笔记就绪度）并累积跳过原因统计。 |
