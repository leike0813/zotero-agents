
# rebaseWorkflowProviderOptionsForBackendChange
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:rebaseWorkflowProviderOptionsForBackendChange -->

后端切换时重定基 Provider 运行时选项，丢弃已失效字段并按新后端能力补默认值。
类型：函数  
复杂度：简单  
入边数：2  
标签：settings、provider-options、rebase、backend  
所属文件：[src/modules/workflow/settings/workflowSettings.ts](../../../../../../files/src/modules/workflow/settings/workflowSettings.ts.md)
源码：[src/modules/workflow/settings/workflowSettings.ts:85](../../../../../../../../src/modules/workflow/settings/workflowSettings.ts#L85)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [openWorkflowSettingsDialog](../../../../../../files/src/modules/workflow/settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts:663–1161 | 打开工作流设置对话框：构建表单、绑定保存/一次性应用动作、响应后端变更重基并在关闭后刷新菜单。 |
| [openWorkflowSettingsWebDialog](../../../../../../files/src/modules/workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts:379–970 | 打开 Web 版工作流设置对话框：加载页面、向宿主注册动作处理器、接收结构化草稿变更并按需保存或一次性应用。 |

## 调用

该符号没有记录对外调用。
