
# getSkillRunnerWorkspaceReadModel
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:getSkillRunnerWorkspaceReadModel -->

构建 SkillRunner 工作区的只读视图模型，包含任务分组、选中项、状态徽标与可执行动作。
类型：函数  
复杂度：复杂  
入边数：2  
标签：view-model、ui、projection、skillrunner  
所属文件：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md)
源码：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts:5400](../../../../../../../../src/modules/skillRunner/surface/skillRunnerRunDialog.ts#L5400)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [getSkillRunnerWorkspaceSelectedOwner](getSkillRunnerWorkspaceSelectedOwner.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:5249–5263 | 返回工作区当前选中的 owner 标识，供 surface 构造导航与详情区域时定位展示对象。 |
| [readSkillRunnerWorkspaceRegions](../../../../../../files/src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts:298–391 | 读取 SkillRunner 工作区各托管区域的当前内容与签名，供共享 surface 组件做区域级比较。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildRunWorkspaceModel](buildRunWorkspaceModel.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:1765–2099 | 从运行条目、任务台账与后端列表汇总出完整的工作区模型，是面板渲染的主要数据来源。 |
