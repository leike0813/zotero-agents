
# buildWorkflowSettingsUiDescriptor
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:buildWorkflowSettingsUiDescriptor -->

构建工作流设置 UI 描述符：确定可选后端、Provider profile、参数与运行选项条目及可配置性判定。
类型：函数  
复杂度：中等  
入边数：2  
标签：settings、descriptor、ui、composition、backend  
所属文件：[src/modules/workflow/settings/workflowSettings.ts](../../../../../../files/src/modules/workflow/settings/workflowSettings.ts.md)
源码：[src/modules/workflow/settings/workflowSettings.ts:824](../../../../../../../../src/modules/workflow/settings/workflowSettings.ts#L824)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveWorkflowExecutionContext](../../../../../../files/src/modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts:1052–1134 | 解析工作流执行上下文：确定后端、Provider、运行时选项、宿主访问范围与并发度。 |
| [openWorkflowSettingsWebDialog](../../../../../../files/src/modules/workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts:379–970 | 打开 Web 版工作流设置对话框：加载页面、向宿主注册动作处理器、接收结构化草稿变更并按需保存或一次性应用。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [toProviderSchemaEntries](../../../../../../files/src/modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts:711–822 | 结合后端与 provider 能力生成 provider 运行时选项的表单 schema 条目。 |
| [toRunSchemaEntries](../../../../../../files/src/modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts:690–709 | 把 Zotero 宿主访问与运行选项转换为统一表单条目。 |
| [toWorkflowSchemaEntries](../../../../../../files/src/modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts:621–688 | 把工作流参数 schema 转换为统一表单 schema 条目列表。 |
