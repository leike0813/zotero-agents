
# src/modules/workflow/settings/workflowSettingsDomain.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/settings](../../../../../modules/src/modules/workflow/settings.md)
<!-- node: file:src/modules/workflow/settings/workflowSettingsDomain.ts -->

工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。
源码：[src/modules/workflow/settings/workflowSettingsDomain.ts](../../../../../../../src/modules/workflow/settings/workflowSettingsDomain.ts)

## 符号（15）
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:assertRequiredWorkflowParameters -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:buildWorkflowSettingsDialogInitialState -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:coerceBySchemaType -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:createWorkflowSettingsDocument -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:listMissingRequiredWorkflowParameters -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:mergeExecutionOptions -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:normalizeHostQueueMaxConcurrency -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:normalizeSavedWorkflowSettings -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:normalizeWorkflowParamsBySchema -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:parseExecutionOptionsPatch -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:parseSettingsRecord -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:parseWorkflowHostOptions -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:parseWorkflowSettingsEntry -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:rebaseProviderOptionsForBackendChange -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:serializeSettingsRecord -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertRequiredWorkflowParameters | 函数 | 363–383 | 简单 | validation、assertion、workflow-params | 0 | 断言必填参数齐备，缺失时抛出带参数名的错误。 |
| buildWorkflowSettingsDialogInitialState | 函数 | 443–471 | 简单 | settings、dialog、initial-state | 0 | 基于归一化后的设置构建对话框初始状态。 |
| coerceBySchemaType | 函数 | 225–264 | 简单 | coercion、schema、validation | 1 | 按 schema 声明的类型强制转换表单输入值。 |
| createWorkflowSettingsDocument | 函数 | 212–219 | 简单 | settings、document、schema-version | 0 | 创建带 schema 版本号的设置文档骨架。 |
| listMissingRequiredWorkflowParameters | 函数 | 345–361 | 简单 | validation、workflow-params、missing、listing | 1 | 列出缺失的必填工作流参数，供 UI 定位。 |
| mergeExecutionOptions | 函数 | 385–414 | 简单 | merge、execution-options、precedence | 0 | 合并多层执行选项（默认值、持久化设置、一次性覆盖），后者优先。 |
| normalizeHostQueueMaxConcurrency | 函数 | 54–84 | 简单 | normalization、host-options、concurrency、validation | 1 | 归一化 Host 队列最大并发度，越界或非法值回落到默认值。 |
| normalizeSavedWorkflowSettings | 函数 | 434–441 | 简单 | normalization、settings、cleanup | 1 | 对已保存设置做一次整体归一化，消除陈旧后端与失效 provider 字段。 |
| normalizeWorkflowParamsBySchema | 函数 | 266–327 | 中等 | normalization、workflow-params、schema | 0 | 按参数 schema 归一化工作流参数：类型转换、默认值填充与未知键剔除。 |
| [parseExecutionOptionsPatch](../../../../../symbols/src/modules/workflow/settings/workflowSettingsDomain.ts/parseExecutionOptionsPatch.md) | 函数 | 206–210 | 简单 | parsing、execution-options、patch | 2 | 解析外部传入的执行选项补丁，剔除未声明字段。 |
| parseSettingsRecord | 函数 | 190–204 | 简单 | parsing、settings、record | 0 | 解析完整设置记录，得到按工作流 ID 索引的选项集合。 |
| parseWorkflowHostOptions | 函数 | 86–116 | 简单 | parsing、host-options、persistence | 1 | 解析并归一化持久化的 Host 队列选项。 |
| parseWorkflowSettingsEntry | 函数 | 145–175 | 简单 | parsing、settings、validation | 1 | 解析单条设置条目，过滤未知字段并归一化选项结构。 |
| rebaseProviderOptionsForBackendChange | 函数 | 122–143 | 简单 | provider-options、rebase、backend、capability | 0 | 在后端切换时按新后端能力重定基 Provider 选项。 |
| serializeSettingsRecord | 函数 | 221–223 | 简单 | settings、serialization、persistence | 0 | 将设置记录序列化为可持久化的文档结构。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](../../../providers/types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroHostAccessOptions.ts](../../../workflows/zoteroHostAccessOptions.ts.md) | src/workflows/zoteroHostAccessOptions.ts | Zotero 宿主访问运行选项：解析 autoApproveZoteroWrites 声明，构造注入 SkillRunner 的 ZoteroHostAccess 运行时选项，并在旧后端不支持时降级为告警。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardSnapshot.ts](../../dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [hostBridgeWorkflowControl.ts](../../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [preparationSeam.ts](../../workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [workflowExecute.ts](../ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowSettings.ts](workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialogModel.ts](workflowSettingsDialogModel.ts.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts | 设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。 |
| [workflowSettingsNormalizer.ts](workflowSettingsNormalizer.ts.md) | src/modules/workflow/settings/workflowSettingsNormalizer.ts | 针对已加载工作流目录的设置归一化层，在持久化设置与执行时选项中剥离陈旧字段并按当前已注册工作流集合补齐缺失配置。 |
| [workflowSettingsWebDialog.ts](workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertRequiredWorkflowParameters | 函数 | 363–383 | 断言必填参数齐备，缺失时抛出带参数名的错误。 |
| buildWorkflowSettingsDialogInitialState | 函数 | 443–471 | 基于归一化后的设置构建对话框初始状态。 |
| createWorkflowSettingsDocument | 函数 | 212–219 | 创建带 schema 版本号的设置文档骨架。 |
| listMissingRequiredWorkflowParameters | 函数 | 345–361 | 列出缺失的必填工作流参数，供 UI 定位。 |
| mergeExecutionOptions | 函数 | 385–414 | 合并多层执行选项（默认值、持久化设置、一次性覆盖），后者优先。 |
| normalizeHostQueueMaxConcurrency | 函数 | 54–84 | 归一化 Host 队列最大并发度，越界或非法值回落到默认值。 |
| normalizeSavedWorkflowSettings | 函数 | 434–441 | 对已保存设置做一次整体归一化，消除陈旧后端与失效 provider 字段。 |
| normalizeWorkflowParamsBySchema | 函数 | 266–327 | 按参数 schema 归一化工作流参数：类型转换、默认值填充与未知键剔除。 |
| [parseExecutionOptionsPatch](../../../../../symbols/src/modules/workflow/settings/workflowSettingsDomain.ts/parseExecutionOptionsPatch.md) | 函数 | 206–210 | 解析外部传入的执行选项补丁，剔除未声明字段。 |
| parseSettingsRecord | 函数 | 190–204 | 解析完整设置记录，得到按工作流 ID 索引的选项集合。 |
| rebaseProviderOptionsForBackendChange | 函数 | 122–143 | 在后端切换时按新后端能力重定基 Provider 选项。 |
| serializeSettingsRecord | 函数 | 221–223 | 将设置记录序列化为可持久化的文档结构。 |
