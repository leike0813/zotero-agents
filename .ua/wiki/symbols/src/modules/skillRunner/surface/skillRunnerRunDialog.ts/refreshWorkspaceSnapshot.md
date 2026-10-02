
# refreshWorkspaceSnapshot
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:refreshWorkspaceSnapshot -->

刷新工作区快照：按刷新原因合并请求、重建模型并向订阅者发布变更。
类型：函数  
复杂度：复杂  
入边数：2  
标签：refresh、state、ui、skillrunner  
所属文件：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md)
源码：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts:4568](../../../../../../../../src/modules/skillRunner/surface/skillRunnerRunDialog.ts#L4568)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [selectWorkspaceTask](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:4503–4566 | 切换工作区选中任务，发布 owner 优先的空/加载快照并按需后台水合历史 transcript。 |
| [startRunObserver](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:2654–3381 | 为运行条目启动事件观察：接入后端事件流、维护 pending 交互、驱动工作区快照刷新，并在断流时按策略恢复。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [notifySkillRunnerWorkspacePublicationChange](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:5195–5247 | 把工作区变更映射为 Assistant Workspace 的发布类型并通知发布层刷新对应区域。 |
| [publishRunWorkspaceState](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:2359–2388 | 把工作区状态发布给订阅者，并按变更签名判断是否需要触发实际渲染。 |
