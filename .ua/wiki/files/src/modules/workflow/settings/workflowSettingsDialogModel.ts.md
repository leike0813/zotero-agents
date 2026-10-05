
# src/modules/workflow/settings/workflowSettingsDialogModel.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/settings](../../../../../modules/src/modules/workflow/settings.md)
<!-- node: file:src/modules/workflow/settings/workflowSettingsDialogModel.ts -->

设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。
源码：[src/modules/workflow/settings/workflowSettingsDialogModel.ts](../../../../../../../src/modules/workflow/settings/workflowSettingsDialogModel.ts)

## 符号（10）
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:buildWorkflowHostOptionsDraft -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:buildWorkflowSettingsDialogDraft -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:buildWorkflowSettingsDialogRenderModel -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:collectSchemaValues -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:fromProviderOptionSchema -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:fromWorkflowParameterSchema -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:isWorkflowSettingsStructuralRefreshChange -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:normalizeWorkflowSettingsDraftChangeOrigin -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:resolveProviderSchemaEntries -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDialogModel.ts:resolveWorkflowSettingsDialogLayout -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildWorkflowHostOptionsDraft | 函数 | 351–369 | 简单 | dialog、host-options、draft、normalization | 1 | 构建 Host 队列选项草稿并归一化并发度上限。 |
| buildWorkflowSettingsDialogDraft | 函数 | 422–471 | 中等 | dialog、draft、composition | 1 | 汇总收集值生成完整设置草稿，区分持久化字段与一次性运行字段。 |
| buildWorkflowSettingsDialogRenderModel | 函数 | 301–339 | 简单 | dialog、view-model、composition | 1 | 组装对话框渲染模型：字段分组、当前值、Provider profile 与可运行性提示。 |
| [collectSchemaValues](../../../../../symbols/src/modules/workflow/settings/workflowSettingsDialogModel.ts/collectSchemaValues.md) | 函数 | 371–420 | 中等 | dialog、form-values、collection、coercion | 2 | 从表单控件收集全部字段值并按 schema 类型做转换与缺省填充。 |
| [fromProviderOptionSchema](../../../../../symbols/src/modules/workflow/settings/workflowSettingsDialogModel.ts/fromProviderOptionSchema.md) | 函数 | 175–196 | 简单 | schema-adapter、provider-options、localization | 2 | 将 Provider 运行时选项 schema 条目转换为表单条目。 |
| [fromWorkflowParameterSchema](../../../../../symbols/src/modules/workflow/settings/workflowSettingsDialogModel.ts/fromWorkflowParameterSchema.md) | 函数 | 148–173 | 简单 | schema-adapter、workflow-params、localization | 2 | 将工作流参数 schema 转换为表单条目并附加本地化标签与默认值。 |
| isWorkflowSettingsStructuralRefreshChange | 函数 | 26–45 | 简单 | dialog、predicate、structural-refresh | 0 | 判定草稿变更是否属于需重建表单结构的结构性刷新。 |
| normalizeWorkflowSettingsDraftChangeOrigin | 函数 | 20–24 | 简单 | dialog、normalization、change-origin | 0 | 将草稿变更来源归一化为 choice 或 text 两类。 |
| [resolveProviderSchemaEntries](../../../../../symbols/src/modules/workflow/settings/workflowSettingsDialogModel.ts/resolveProviderSchemaEntries.md) | 函数 | 218–299 | 中等 | provider-options、capability、schema、resolution | 2 | 结合后端与 Provider 能力解析出最终可展示的 Provider 选项表单条目。 |
| resolveWorkflowSettingsDialogLayout | 函数 | 117–132 | 简单 | dialog、layout、resolution | 0 | 解析对话框布局（容器选择、字段分区与单元预览呈现方式）。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpModelOptionFolding.ts](../../acp/chat/acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [modelCatalog.ts](../../../providers/skillrunner/modelCatalog.ts.md) | src/providers/skillrunner/modelCatalog.ts | SkillRunner 模型目录：解析静态 manifest 与远端快照，展开 engine/provider/model 层级并把模型规格归一为 UI 与运行时可用形态。 |
| [registry.ts](../../../providers/registry.ts.md) | src/providers/registry.ts | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../../../providers/types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowSettingsDomain.ts](workflowSettingsDomain.ts.md) | src/modules/workflow/settings/workflowSettingsDomain.ts | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |
| [workflowSettingsOptionLocalization.ts](workflowSettingsOptionLocalization.ts.md) | src/modules/workflow/settings/workflowSettingsOptionLocalization.ts | Provider 运行时选项与工作流运行选项的文案本地化，优先按 locale key 查表，缺失时回落到 schema 自带文本。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [preparationSeam.ts](../../workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [workflowSettingsDialog.ts](workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |
| [workflowSettingsWebDialog.ts](workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildWorkflowHostOptionsDraft | 函数 | 351–369 | 构建 Host 队列选项草稿并归一化并发度上限。 |
| buildWorkflowSettingsDialogDraft | 函数 | 422–471 | 汇总收集值生成完整设置草稿，区分持久化字段与一次性运行字段。 |
| buildWorkflowSettingsDialogRenderModel | 函数 | 301–339 | 组装对话框渲染模型：字段分组、当前值、Provider profile 与可运行性提示。 |
| [collectSchemaValues](../../../../../symbols/src/modules/workflow/settings/workflowSettingsDialogModel.ts/collectSchemaValues.md) | 函数 | 371–420 | 从表单控件收集全部字段值并按 schema 类型做转换与缺省填充。 |
| isWorkflowSettingsStructuralRefreshChange | 函数 | 26–45 | 判定草稿变更是否属于需重建表单结构的结构性刷新。 |
| normalizeWorkflowSettingsDraftChangeOrigin | 函数 | 20–24 | 将草稿变更来源归一化为 choice 或 text 两类。 |
| [resolveProviderSchemaEntries](../../../../../symbols/src/modules/workflow/settings/workflowSettingsDialogModel.ts/resolveProviderSchemaEntries.md) | 函数 | 218–299 | 结合后端与 Provider 能力解析出最终可展示的 Provider 选项表单条目。 |
| resolveWorkflowSettingsDialogLayout | 函数 | 117–132 | 解析对话框布局（容器选择、字段分区与单元预览呈现方式）。 |
