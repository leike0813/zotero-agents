
# filterArtifactConflicts
<!-- node: function:src/workflows/workflowInputPlanning.ts:filterArtifactConflicts -->

剔除与已存在产物冲突的候选路径，并记录冲突原因供 UI 展示。
类型：函数  
复杂度：复杂  
入边数：1  
标签：conflict-resolution、artifacts、planning  
所属文件：[src/workflows/workflowInputPlanning.ts](../../../../files/src/workflows/workflowInputPlanning.ts.md)
源码：[src/workflows/workflowInputPlanning.ts:503](../../../../../../src/workflows/workflowInputPlanning.ts#L503)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyCandidateFilters](applyCandidateFilters.md) | src/workflows/workflowInputPlanning.ts:827–924 | 应用 manifest 声明的候选过滤规则（kind、mime、计数、生成笔记就绪度）并累积跳过原因统计。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveArtifactTargetPath](../../../../files/src/workflows/workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts:464–493 | 解析产物在 Zotero 存储中的目标路径，规范化分隔符并限制在受管目录内。 |
