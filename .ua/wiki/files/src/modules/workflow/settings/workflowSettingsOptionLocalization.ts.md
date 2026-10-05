
# src/modules/workflow/settings/workflowSettingsOptionLocalization.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/settings](../../../../../modules/src/modules/workflow/settings.md)
<!-- node: file:src/modules/workflow/settings/workflowSettingsOptionLocalization.ts -->

Provider 运行时选项与工作流运行选项的文案本地化，优先按 locale key 查表，缺失时回落到 schema 自带文本。
源码：[src/modules/workflow/settings/workflowSettingsOptionLocalization.ts](../../../../../../../src/modules/workflow/settings/workflowSettingsOptionLocalization.ts)

## 符号（2）
<!-- node: function:src/modules/workflow/settings/workflowSettingsOptionLocalization.ts:localizeProviderRuntimeOptionText -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsOptionLocalization.ts:localizeWorkflowRunOptionText -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| localizeProviderRuntimeOptionText | 函数 | 109–125 | 简单 | localization、provider-options、i18n | 0 | 本地化 Provider 运行时选项的标题、描述与占位符文本。 |
| localizeWorkflowRunOptionText | 函数 | 127–149 | 简单 | localization、run-options、i18n | 0 | 本地化工作流运行选项文案，包含 Zotero 写入自动批准等枚举值。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [types.ts](../../../providers/types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |
| [zoteroHostAccessOptions.ts](../../../workflows/zoteroHostAccessOptions.ts.md) | src/workflows/zoteroHostAccessOptions.ts | Zotero 宿主访问运行选项：解析 autoApproveZoteroWrites 声明，构造注入 SkillRunner 的 ZoteroHostAccess 运行时选项，并在旧后端不支持时降级为告警。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflowSettings.ts](workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialogModel.ts](workflowSettingsDialogModel.ts.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts | 设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| localizeProviderRuntimeOptionText | 函数 | 109–125 | 本地化 Provider 运行时选项的标题、描述与占位符文本。 |
| localizeWorkflowRunOptionText | 函数 | 127–149 | 本地化工作流运行选项文案，包含 Zotero 写入自动批准等枚举值。 |
