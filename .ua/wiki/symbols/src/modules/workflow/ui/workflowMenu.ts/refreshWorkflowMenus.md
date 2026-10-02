
# refreshWorkflowMenus
<!-- node: function:src/modules/workflow/ui/workflowMenu.ts:refreshWorkflowMenus -->

刷新所有已打开窗口的工作流菜单与弹出面板内容。
类型：函数  
复杂度：简单  
入边数：3  
标签：menu、refresh、ui  
所属文件：[src/modules/workflow/ui/workflowMenu.ts](../../../../../../files/src/modules/workflow/ui/workflowMenu.ts.md)
源码：[src/modules/workflow/ui/workflowMenu.ts:410](../../../../../../../../src/modules/workflow/ui/workflowMenu.ts#L410)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [installOfficialWorkflowPackageWithProgress](../../../../../../files/src/hooks.ts.md) | src/hooks.ts:437–465 | 在进度 toast 反馈下安装官方内置工作流包，失败时保留错误码与阶段信息。 |
| [onPrefsEvent](../../../../../../files/src/hooks.ts.md) | src/hooks.ts:1335–1942 | 首选项变更总入口：按 pref key 分发到样式、通知、jobQueue、工作流、backend 等子系统的热更新处理。 |
| [openWorkflowSettingsDialog](../../../../../../files/src/modules/workflow/settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts:663–1161 | 打开工作流设置对话框：构建表单、绑定保存/一次性应用动作、响应后端变更重基并在关闭后刷新菜单。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ensureWorkflowMenuForWindow](ensureWorkflowMenuForWindow.md) | src/modules/workflow/ui/workflowMenu.ts:377–408 | 为指定窗口确保工作流菜单已安装且指向当前目录状态。 |
