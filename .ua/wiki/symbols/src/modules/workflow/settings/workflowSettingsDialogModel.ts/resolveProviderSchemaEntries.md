
# resolveProviderSchemaEntries
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:resolveProviderSchemaEntries -->

结合后端与 Provider 能力解析出最终可展示的 Provider 选项表单条目。
类型：函数  
复杂度：中等  
入边数：2  
标签：provider-options、capability、schema、resolution  
所属文件：[src/modules/workflow/settings/workflowSettingsDialogModel.ts](../../../../../../files/src/modules/workflow/settings/workflowSettingsDialogModel.ts.md)
源码：[src/modules/workflow/settings/workflowSettingsDialogModel.ts:218](../../../../../../../../src/modules/workflow/settings/workflowSettingsDialogModel.ts#L218)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [openWorkflowSettingsDialog](../../../../../../files/src/modules/workflow/settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts:663–1161 | 打开工作流设置对话框：构建表单、绑定保存/一次性应用动作、响应后端变更重基并在关闭后刷新菜单。 |
| [buildWorkflowSettingsDialogRenderModel](../../../../../../files/src/modules/workflow/settings/workflowSettingsDialogModel.ts.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts:301–339 | 组装对话框渲染模型：字段分组、当前值、Provider profile 与可运行性提示。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [fromProviderOptionSchema](fromProviderOptionSchema.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts:175–196 | 将 Provider 运行时选项 schema 条目转换为表单条目。 |
| [fromWorkflowParameterSchema](fromWorkflowParameterSchema.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts:148–173 | 将工作流参数 schema 转换为表单条目并附加本地化标签与默认值。 |
