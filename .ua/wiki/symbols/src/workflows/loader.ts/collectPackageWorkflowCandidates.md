
# collectPackageWorkflowCandidates
<!-- node: function:src/workflows/loader.ts:collectPackageWorkflowCandidates -->

扫描工作流包内的单个工作流目录，产出候选工作流及其诊断。
类型：函数  
复杂度：复杂  
入边数：1  
标签：loader、filesystem、scan  
所属文件：[src/workflows/loader.ts](../../../../files/src/workflows/loader.ts.md)
源码：[src/workflows/loader.ts:575](../../../../../../src/workflows/loader.ts#L575)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [loadWorkflowManifests](loadWorkflowManifests.md) | src/workflows/loader.ts:973–1149 | 加载入口：扫描工作流与工作流包来源，加载 hook 与本地化资源，返回已加载工作流集合与全部诊断。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [collectSingleWorkflowCandidate](../../../../files/src/workflows/loader.ts.md) | src/workflows/loader.ts:630–661 | 从单个 manifest 文件路径构造工作流候选，解析失败时转为错误级诊断而非抛出。 |
