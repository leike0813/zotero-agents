
# getVisibleLoadedWorkflowEntries
<!-- node: function:src/modules/workflow/catalog/workflowVisibility.ts:getVisibleLoadedWorkflowEntries -->

从已加载工作流注册表中筛出当前可见的条目。
类型：函数  
复杂度：简单  
入边数：2  
标签：workflow、catalog、filter  
所属文件：[src/modules/workflow/catalog/workflowVisibility.ts](../../../../../../files/src/modules/workflow/catalog/workflowVisibility.ts.md)
源码：[src/modules/workflow/catalog/workflowVisibility.ts:26](../../../../../../../../src/modules/workflow/catalog/workflowVisibility.ts#L26)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildWorkflowActionPopup](../../../../../../files/src/modules/workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts:268–375 | 重建工作流操作弹出面板：按显示顺序与可见性组装条目，附加后端/设置入口与官方包安装项。 |
| [triggerWorkflowFromUnifiedEntry](../../../../../../files/src/modules/workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts:233–266 | 统一触发入口：按策略判定是否需要选择上下文，随后执行工作流并反馈触发失败原因。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [isWorkflowVisible](../../../../../../files/src/modules/workflow/catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts:19–24 | 结合 debug_only 标记与全局 debug 开关判定工作流是否可见。 |
