
# getSkillRunnerWorkspaceSelectedOwner
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:getSkillRunnerWorkspaceSelectedOwner -->

返回工作区当前选中的 owner 标识，供 surface 构造导航与详情区域时定位展示对象。
类型：函数  
复杂度：简单  
入边数：2  
标签：query、selection、assistant、skillrunner  
所属文件：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md)
源码：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts:5249](../../../../../../../../src/modules/skillRunner/surface/skillRunnerRunDialog.ts#L5249)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [loadTranscriptPageForSource](../../../../../../files/src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:405–472 | 按 owner 请求指定 transcript 分页，区分冷读与缓存命中路径。 |
| [prepareSkillRunnerOwnerNavigation](../../../../../../files/src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts:407–495 | 准备 owner 导航结构：把任务分组映射为导航条目并标注需要 attention 的项。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [getSkillRunnerWorkspaceReadModel](getSkillRunnerWorkspaceReadModel.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:5400–5541 | 构建 SkillRunner 工作区的只读视图模型，包含任务分组、选中项、状态徽标与可执行动作。 |
