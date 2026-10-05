
# collectSchemaValues
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:collectSchemaValues -->

从表单控件收集全部字段值并按 schema 类型做转换与缺省填充。
类型：函数  
复杂度：中等  
入边数：2  
标签：dialog、form-values、collection、coercion  
所属文件：[src/modules/workflow/settings/workflowSettingsDialogModel.ts](../../../../../../files/src/modules/workflow/settings/workflowSettingsDialogModel.ts.md)
源码：[src/modules/workflow/settings/workflowSettingsDialogModel.ts:371](../../../../../../../../src/modules/workflow/settings/workflowSettingsDialogModel.ts#L371)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [openWorkflowSettingsDialog](../../../../../../files/src/modules/workflow/settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts:663–1161 | 打开工作流设置对话框：构建表单、绑定保存/一次性应用动作、响应后端变更重基并在关闭后刷新菜单。 |
| [buildWorkflowSettingsDialogDraft](../../../../../../files/src/modules/workflow/settings/workflowSettingsDialogModel.ts.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts:422–471 | 汇总收集值生成完整设置草稿，区分持久化字段与一次性运行字段。 |

## 调用

该符号没有记录对外调用。
