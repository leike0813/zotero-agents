
# ensureWorkflowMenuForWindow
<!-- node: function:src/modules/workflow/ui/workflowMenu.ts:ensureWorkflowMenuForWindow -->

为指定窗口确保工作流菜单已安装且指向当前目录状态。
类型：函数  
复杂度：简单  
入边数：2  
标签：menu、window、lifecycle、idempotent  
所属文件：[src/modules/workflow/ui/workflowMenu.ts](../../../../../../files/src/modules/workflow/ui/workflowMenu.ts.md)
源码：[src/modules/workflow/ui/workflowMenu.ts:377](../../../../../../../../src/modules/workflow/ui/workflowMenu.ts#L377)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ensureWorkflowRegistryAndMenu](../../../../../../files/src/hooks.ts.md) | src/hooks.ts:780–812 | 确保工作流注册表已加载，并向 Zotero 菜单注入工作流入口菜单项。 |
| [refreshWorkflowMenus](refreshWorkflowMenus.md) | src/modules/workflow/ui/workflowMenu.ts:410–415 | 刷新所有已打开窗口的工作流菜单与弹出面板内容。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildWorkflowActionPopup](../../../../../../files/src/modules/workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts:268–375 | 重建工作流操作弹出面板：按显示顺序与可见性组装条目，附加后端/设置入口与官方包安装项。 |
