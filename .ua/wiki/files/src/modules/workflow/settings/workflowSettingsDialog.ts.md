
# src/modules/workflow/settings/workflowSettingsDialog.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/settings](../../../../../modules/src/modules/workflow/settings.md)
<!-- node: file:src/modules/workflow/settings/workflowSettingsDialog.ts -->

基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。
源码：[src/modules/workflow/settings/workflowSettingsDialog.ts](../../../../../../../src/modules/workflow/settings/workflowSettingsDialog.ts)

## 符号（6）
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialog.ts:createChoiceControl -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialog.ts:openWorkflowSettingsDialog -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialog.ts:pickWorkflowIdForSettings -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialog.ts:renderSchemaFields -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialog.ts:setChoiceControlOptions -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialog.ts:setProfileSelectOptions -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createChoiceControl | 函数 | 119–200 | 中等 | dialog、form-control、choice、xhtml | 0 | 构建枚举/布尔/多选类表单控件的 XHTML 元素与选择处理逻辑。 |
| openWorkflowSettingsDialog | 函数 | 663–1161 | 复杂 | dialog、entry-point、ui、settings、event-wiring | 0 | 打开工作流设置对话框：构建表单、绑定保存/一次性应用动作、响应后端变更重基并在关闭后刷新菜单。 |
| pickWorkflowIdForSettings | 函数 | 580–661 | 中等 | dialog、workflow、selection、resolution | 0 | 为设置对话框解析目标工作流，必要时引导用户从可配置工作流中选择。 |
| renderSchemaFields | 函数 | 332–515 | 中等 | dialog、form-rendering、schema、events | 0 | 按 schema 条目渲染参数、Provider 选项与运行选项表单字段并绑定输入事件。 |
| setChoiceControlOptions | 函数 | 202–264 | 中等 | dialog、form-control、refresh、choice | 0 | 重填选择控件的候选项并保持已选值，避免后端切换后残留失效选项。 |
| setProfileSelectOptions | 函数 | 530–551 | 简单 | dialog、provider、profile、refresh | 0 | 更新 Provider profile 下拉项并同步当前选择。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpModelOptionFolding.ts](../../acp/chat/acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [displayName.ts](../../../backends/displayName.ts.md) | src/backends/displayName.ts | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [localization.ts](../../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [window.ts](../../../utils/window.ts.md) | src/utils/window.ts | 判断窗口对象是否仍然存活（未 closed 且不是 dead wrapper），用于避免重复打开同一窗口。 |
| [workflowMenu.ts](../ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowSettings.ts](workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialogModel.ts](workflowSettingsDialogModel.ts.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts | 设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。 |
| [workflowVisibility.ts](../catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| openWorkflowSettingsDialog | 函数 | 663–1161 | 打开工作流设置对话框：构建表单、绑定保存/一次性应用动作、响应后端变更重基并在关闭后刷新菜单。 |
