
# src/modules/workflow/settings/workflowSettings.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/settings](../../../../../modules/src/modules/workflow/settings.md)
<!-- node: file:src/modules/workflow/settings/workflowSettings.ts -->

工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。
源码：[src/modules/workflow/settings/workflowSettings.ts](../../../../../../../src/modules/workflow/settings/workflowSettings.ts)

## 符号（26）
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:applyRunOnceWorkflowSettingsDraft -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:buildWorkflowSettingsUiDescriptor -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:clearRunOnceWorkflowOverrides -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:clearWorkflowSettings -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:constrainSkillRunnerProviderOptionsByMode -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:getWorkflowSettings -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:getWorkflowSettingsDialogInitialState -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:getWorkflowSettingsReadDiagnosticsForTests -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:getWorkflowSettingsRevision -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:isWorkflowConfigurable -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:listProviderProfilesForWorkflow -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:listWorkflowSettingsRecord -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:normalizeProviderOptionsForUi -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:readSettingsRecordCached -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:rebaseWorkflowProviderOptionsForBackendChange -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:resetRunOnceOverridesForSettingsOpen -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:resetWorkflowSettingsReadDiagnosticsForTests -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:resolveSkillRunnerModeCapability -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:resolveWorkflowExecutionContext -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:resolveWorkflowExecutionOptionsPreview -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:savePersistentWorkflowSettingsDraft -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:setRunOnceWorkflowOverrides -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:toProviderSchemaEntries -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:toRunSchemaEntries -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:toWorkflowSchemaEntries -->
<!-- node: function:src/modules/workflow/settings/workflowSettings.ts:updateWorkflowSettings -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyRunOnceWorkflowSettingsDraft | 函数 | 1034–1039 | 简单 | settings、draft、run-once、apply | 1 | 将对话框草稿应用为一次性运行覆盖而不落盘。 |
| [buildWorkflowSettingsUiDescriptor](../../../../../symbols/src/modules/workflow/settings/workflowSettings.ts/buildWorkflowSettingsUiDescriptor.md) | 函数 | 824–984 | 中等 | settings、descriptor、ui、composition、backend | 2 | 构建工作流设置 UI 描述符：确定可选后端、Provider profile、参数与运行选项条目及可配置性判定。 |
| clearRunOnceWorkflowOverrides | 函数 | 1006–1008 | 简单 | settings、override、run-once、clear | 0 | 清除全部一次性运行覆盖。 |
| clearWorkflowSettings | 函数 | 607–615 | 简单 | settings、persistence、clear | 0 | 清除指定工作流的持久化设置记录。 |
| constrainSkillRunnerProviderOptionsByMode | 函数 | 456–501 | 简单 | skillrunner、provider-options、constraint | 1 | 按 SkillRunner 运行模式过滤与收敛 provider 运行时选项。 |
| getWorkflowSettings | 函数 | 573–578 | 简单 | settings、persistence、accessor | 0 | 读取指定工作流的持久化设置记录。 |
| getWorkflowSettingsDialogInitialState | 函数 | 1020–1025 | 简单 | settings、dialog、initial-state | 1 | 生成设置对话框的初始状态快照。 |
| getWorkflowSettingsReadDiagnosticsForTests | 函数 | 223–228 | 简单 | settings、diagnostics、test-only | 0 | 读取设置时的诊断计数（缓存命中、解析失败等）测试出口。 |
| getWorkflowSettingsRevision | 函数 | 218–221 | 简单 | settings、revision、concurrency | 0 | 返回当前设置修订号，供变更检测与并发写保护使用。 |
| isWorkflowConfigurable | 函数 | 986–996 | 简单 | predicate、settings、ui | 1 | 判断工作流是否存在可配置项，无可配置项时隐藏设置入口。 |
| listProviderProfilesForWorkflow | 函数 | 1041–1050 | 简单 | settings、provider、profile、listing | 0 | 列出工作流可用的 Provider profile 供后端选择。 |
| listWorkflowSettingsRecord | 函数 | 617–619 | 简单 | settings、listing、persistence | 0 | 列出全部工作流设置记录。 |
| normalizeProviderOptionsForUi | 函数 | 503–565 | 中等 | provider-options、normalization、ui、schema | 1 | 把 provider 运行时选项归一化为 UI 友好的 schema 条目，统一类型、默认值与本地化文本。 |
| readSettingsRecordCached | 函数 | 170–197 | 简单 | settings、cache、persistence、diagnostics | 1 | 带缓存的设置记录读取，命中缓存直接返回，否则解析持久化数据并记录读取诊断。 |
| [rebaseWorkflowProviderOptionsForBackendChange](../../../../../symbols/src/modules/workflow/settings/workflowSettings.ts/rebaseWorkflowProviderOptionsForBackendChange.md) | 函数 | 85–113 | 简单 | settings、provider-options、rebase、backend | 2 | 后端切换时重定基 Provider 运行时选项，丢弃已失效字段并按新后端能力补默认值。 |
| resetRunOnceOverridesForSettingsOpen | 函数 | 1010–1018 | 简单 | settings、override、reset | 0 | 打开设置对话框前重置一次性覆盖，避免脏状态泄漏。 |
| resetWorkflowSettingsReadDiagnosticsForTests | 函数 | 230–238 | 简单 | settings、diagnostics、test-only、reset | 0 | 重置设置读取诊断计数供测试隔离。 |
| resolveSkillRunnerModeCapability | 函数 | 364–411 | 简单 | skillrunner、capability、resolution | 0 | 解析 SkillRunner 模式下 provider 可用的能力集合，作为选项约束的依据。 |
| resolveWorkflowExecutionContext | 函数 | 1052–1134 | 中等 | settings、execution-context、resolution、backend、provider | 1 | 解析工作流执行上下文：确定后端、Provider、运行时选项、宿主访问范围与并发度。 |
| resolveWorkflowExecutionOptionsPreview | 函数 | 1136–1187 | 中等 | settings、preview、projection、ui | 1 | 生成设置选项的只读预览，用于菜单展示与执行前确认。 |
| savePersistentWorkflowSettingsDraft | 函数 | 1027–1032 | 简单 | settings、draft、persistence、save | 1 | 将对话框草稿写回持久化设置。 |
| setRunOnceWorkflowOverrides | 函数 | 998–1004 | 简单 | settings、override、run-once | 0 | 设置仅本次运行生效的临时选项覆盖。 |
| toProviderSchemaEntries | 函数 | 711–822 | 中等 | schema-adapter、provider-options、capability、ui | 1 | 结合后端与 provider 能力生成 provider 运行时选项的表单 schema 条目。 |
| toRunSchemaEntries | 函数 | 690–709 | 简单 | schema-adapter、run-options、ui | 1 | 把 Zotero 宿主访问与运行选项转换为统一表单条目。 |
| toWorkflowSchemaEntries | 函数 | 621–688 | 中等 | schema-adapter、workflow-params、ui | 1 | 把工作流参数 schema 转换为统一表单 schema 条目列表。 |
| updateWorkflowSettings | 函数 | 580–605 | 简单 | settings、persistence、mutation、merge | 1 | 合并写入工作流设置，校验修订号后序列化并刷新缓存。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpModelOptionFolding.ts](../../acp/chat/acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [dashboardWireContract.ts](../../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [displayName.ts](../../../backends/displayName.ts.md) | src/backends/displayName.ts | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [identity.ts](../../../backends/identity.ts.md) | src/backends/identity.ts | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [localization.ts](../../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [modelCatalog.ts](../../../providers/skillrunner/modelCatalog.ts.md) | src/providers/skillrunner/modelCatalog.ts | SkillRunner 模型目录：解析静态 manifest 与远端快照，展开 engine/provider/model 层级并把模型规格归一为 UI 与运行时可用形态。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [registry.ts](../../../providers/registry.ts.md) | src/providers/registry.ts | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |
| [skillRunnerInteractiveAutoReply.ts](../../skillRunner/run/skillRunnerInteractiveAutoReply.ts.md) | src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts | 交互式自动回复开关模块：解析用户偏好并判定某个 run 是否应启用自动回复，同时构造对应的请求载荷。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowParameterOptions.ts](workflowParameterOptions.ts.md) | src/modules/workflow/settings/workflowParameterOptions.ts | 工作流动态参数候选项的来源解析器，按参数声明的来源类型从 Synthesis sidecar 合约或 Zotero Host 能力 Broker 拉取可选值并附带诊断信息。 |
| [workflowRequestKind.ts](../catalog/workflowRequestKind.ts.md) | src/modules/workflow/catalog/workflowRequestKind.ts | 请求类型解析：按后端类型与显式声明判定一次工作流请求的 kind（ACP prompt、ACP skill run、SkillRunner sequence 或透传），是队列分派的输入。 |
| [workflowRuntime.ts](../catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowSettingsDomain.ts](workflowSettingsDomain.ts.md) | src/modules/workflow/settings/workflowSettingsDomain.ts | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |
| [workflowSettingsNormalizer.ts](workflowSettingsNormalizer.ts.md) | src/modules/workflow/settings/workflowSettingsNormalizer.ts | 针对已加载工作流目录的设置归一化层，在持久化设置与执行时选项中剥离陈旧字段并按当前已注册工作流集合补齐缺失配置。 |
| [workflowSettingsOptionLocalization.ts](workflowSettingsOptionLocalization.ts.md) | src/modules/workflow/settings/workflowSettingsOptionLocalization.ts | Provider 运行时选项与工作流运行选项的文案本地化，优先按 locale key 查表，缺失时回落到 schema 自带文本。 |
| [zoteroHostAccessOptions.ts](../../../workflows/zoteroHostAccessOptions.ts.md) | src/workflows/zoteroHostAccessOptions.ts | Zotero 宿主访问运行选项：解析 autoApproveZoteroWrites 声明，构造注入 SkillRunner 的 ZoteroHostAccess 运行时选项，并在旧后端不支持时降级为告警。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](../../workflowExecution/contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardReadonlyModel.ts](../../harness/dashboardReadonlyModel.ts.md) | src/modules/harness/dashboardReadonlyModel.ts | Dashboard 只读视图模型：聚合后端、任务历史、SkillRunner run 与工作流产品资产，产出各 surface 的行数据与签名，供 Harness Dashboard 渲染。 |
| [dashboardRuntime.ts](../../dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [dashboardSnapshot.ts](../../dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [hostBridgeWorkflowControl.ts](../../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [preparationSeam.ts](../../workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workflowDebugProbe.ts](../ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowExecute.ts](../ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowMenu.ts](../ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowSettingsDialog.ts](workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |
| [workflowSettingsWebDialog.ts](workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyRunOnceWorkflowSettingsDraft | 函数 | 1034–1039 | 将对话框草稿应用为一次性运行覆盖而不落盘。 |
| [buildWorkflowSettingsUiDescriptor](../../../../../symbols/src/modules/workflow/settings/workflowSettings.ts/buildWorkflowSettingsUiDescriptor.md) | 函数 | 824–984 | 构建工作流设置 UI 描述符：确定可选后端、Provider profile、参数与运行选项条目及可配置性判定。 |
| clearRunOnceWorkflowOverrides | 函数 | 1006–1008 | 清除全部一次性运行覆盖。 |
| clearWorkflowSettings | 函数 | 607–615 | 清除指定工作流的持久化设置记录。 |
| getWorkflowSettings | 函数 | 573–578 | 读取指定工作流的持久化设置记录。 |
| getWorkflowSettingsDialogInitialState | 函数 | 1020–1025 | 生成设置对话框的初始状态快照。 |
| getWorkflowSettingsReadDiagnosticsForTests | 函数 | 223–228 | 读取设置时的诊断计数（缓存命中、解析失败等）测试出口。 |
| getWorkflowSettingsRevision | 函数 | 218–221 | 返回当前设置修订号，供变更检测与并发写保护使用。 |
| isWorkflowConfigurable | 函数 | 986–996 | 判断工作流是否存在可配置项，无可配置项时隐藏设置入口。 |
| listProviderProfilesForWorkflow | 函数 | 1041–1050 | 列出工作流可用的 Provider profile 供后端选择。 |
| listWorkflowSettingsRecord | 函数 | 617–619 | 列出全部工作流设置记录。 |
| [rebaseWorkflowProviderOptionsForBackendChange](../../../../../symbols/src/modules/workflow/settings/workflowSettings.ts/rebaseWorkflowProviderOptionsForBackendChange.md) | 函数 | 85–113 | 后端切换时重定基 Provider 运行时选项，丢弃已失效字段并按新后端能力补默认值。 |
| resetRunOnceOverridesForSettingsOpen | 函数 | 1010–1018 | 打开设置对话框前重置一次性覆盖，避免脏状态泄漏。 |
| resetWorkflowSettingsReadDiagnosticsForTests | 函数 | 230–238 | 重置设置读取诊断计数供测试隔离。 |
| resolveWorkflowExecutionContext | 函数 | 1052–1134 | 解析工作流执行上下文：确定后端、Provider、运行时选项、宿主访问范围与并发度。 |
| resolveWorkflowExecutionOptionsPreview | 函数 | 1136–1187 | 生成设置选项的只读预览，用于菜单展示与执行前确认。 |
| savePersistentWorkflowSettingsDraft | 函数 | 1027–1032 | 将对话框草稿写回持久化设置。 |
| setRunOnceWorkflowOverrides | 函数 | 998–1004 | 设置仅本次运行生效的临时选项覆盖。 |
| updateWorkflowSettings | 函数 | 580–605 | 合并写入工作流设置，校验修订号后序列化并刷新缓存。 |
