
# applyCandidateFilters
<!-- node: function:src/workflows/workflowInputPlanning.ts:applyCandidateFilters -->

应用 manifest 声明的候选过滤规则（kind、mime、计数、生成笔记就绪度）并累积跳过原因统计。
类型：函数  
复杂度：复杂  
入边数：1  
标签：planning、filtering、selection  
所属文件：[src/workflows/workflowInputPlanning.ts](../../../../files/src/workflows/workflowInputPlanning.ts.md)
源码：[src/workflows/workflowInputPlanning.ts:827](../../../../../../src/workflows/workflowInputPlanning.ts#L827)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [selectCandidates](selectCandidates.md) | src/workflows/workflowInputPlanning.ts:742–811 | 按选择计数规则在分组内挑选实际参与执行的候选，跳过项记录原因。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [filterArtifactConflicts](filterArtifactConflicts.md) | src/workflows/workflowInputPlanning.ts:503–539 | 剔除与已存在产物冲突的候选路径，并记录冲突原因供 UI 展示。 |
