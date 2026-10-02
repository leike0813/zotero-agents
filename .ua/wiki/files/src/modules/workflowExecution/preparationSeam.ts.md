
# src/modules/workflowExecution/preparationSeam.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/preparationSeam.ts -->

工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。
源码：[src/modules/workflowExecution/preparationSeam.ts](../../../../../../src/modules/workflowExecution/preparationSeam.ts)

## 符号（9）
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:adaptRequestsForExecutionContext -->
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:buildPreparedWorkflowBatchExecution -->
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:buildPreparedWorkflowUnitExecution -->
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:buildWorkflowExecutionUnitPreview -->
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:collectSkillRunnerSkillIdsFromRequests -->
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:injectSkillRunnerHostBridgeRuntimeEnv -->
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:resolveSkillRunnerSkillDisplayById -->
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:resolveSkippedUnitsFromNoValidInputError -->
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:runWorkflowPreparationSeam -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| adaptRequestsForExecutionContext | 函数 | 93–136 | 简单 | preparation、request、adaptation、execution-context | 1 | 按解析出的执行上下文调整构建好的请求，注入后端标识与运行选项。 |
| buildPreparedWorkflowBatchExecution | 函数 | 888–968 | 中等 | preparation、batch、aggregation、statistics | 1 | 汇总多个已准备执行对象为批量执行计划并计算可执行/跳过统计。 |
| [buildPreparedWorkflowUnitExecution](../../../../symbols/src/modules/workflowExecution/preparationSeam.ts/buildPreparedWorkflowUnitExecution.md) | 函数 | 813–886 | 中等 | preparation、composition、execution-unit | 2 | 将执行单元与对应请求组装为可运行的已准备执行对象。 |
| [buildWorkflowExecutionUnitPreview](../../../../symbols/src/modules/workflowExecution/preparationSeam.ts/buildWorkflowExecutionUnitPreview.md) | 函数 | 742–811 | 中等 | preparation、preview、projection、ui | 2 | 构建执行单元预览描述，含任务名、输入规模与选项摘要供 UI 展示。 |
| collectSkillRunnerSkillIdsFromRequests | 函数 | 237–259 | 简单 | preparation、skillrunner、collection、skill-id | 1 | 从请求集合中收集全部 Skill ID 供展示名解析使用。 |
| injectSkillRunnerHostBridgeRuntimeEnv | 函数 | 184–219 | 简单 | preparation、skillrunner、host-bridge、environment | 0 | 为 SkillRunner 请求注入 Host Bridge 运行环境变量，构造失败时转为可诊断错误。 |
| resolveSkillRunnerSkillDisplayById | 函数 | 281–318 | 简单 | preparation、skillrunner、localization、fallback | 1 | 按 Skill ID 解析展示名称，缺失时回落到 ID 本身。 |
| resolveSkippedUnitsFromNoValidInputError | 函数 | 320–340 | 简单 | preparation、input-planning、error-handling、diagnostics | 1 | 从“无有效输入”错误中还原被跳过的执行单元，供 UI 展示明细。 |
| [runWorkflowPreparationSeam](../../../../symbols/src/modules/workflowExecution/preparationSeam.ts/runWorkflowPreparationSeam.md) | 函数 | 366–740 | 复杂 | seam、preparation、input-planning、validation、orchestration | 1 | preparation seam 主入口：解析执行上下文、规划执行单元、构建请求、校验必填参数并返回已准备执行结果或带诊断的失败。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunRequestAdapter.ts](../acp/skillRun/acpSkillRunRequestAdapter.ts.md) | src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts | 请求适配器：把 SkillRunner 风格的 job 记录转换为统一的 ACP skill run 请求对象，屏蔽两种后端形态的差异。 |
| [contracts.ts](../../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [contracts.ts](contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [diagnosticVerbosity.ts](../diagnosticVerbosity.ts.md) | src/modules/diagnosticVerbosity.ts | 诊断日志的冗长输出开关，从运行时环境变量或测试 override 读取 verbose 标记，并提供统一的条件 console 输出入口。 |
| [errorMeta.ts](../../workflows/errorMeta.ts.md) | src/workflows/errorMeta.ts | 工作流 hook 失败元数据：把 hook 名、工作流标识与能力来源挂到异常对象上，供诊断层读取并生成可读的失败摘要。 |
| [feedbackPolicy.ts](feedbackPolicy.ts.md) | src/modules/workflowExecution/feedbackPolicy.ts | 工作流通知策略的单一判定点，按 manifest 的 execution.feedback.showNotifications 决定是否展示完成通知。 |
| [feedbackSeam.ts](feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [localization.ts](../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [messageFormatter.ts](messageFormatter.ts.md) | src/modules/workflowExecution/messageFormatter.ts | 工作流消息本地化格式化器：先查 addon locale 资源，缺失时回落到调用方提供的 fallback 文案，并组装出符合 WorkflowMessageFormatter 契约的格式化函数。 |
| [pluginSkillRegistry.ts](../workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [runtime.ts](../../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [runtimeLogManager.ts](../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [triggerPolicy.ts](../../workflows/triggerPolicy.ts.md) | src/workflows/triggerPolicy.ts | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowExecuteMessage.ts](workflowExecuteMessage.ts.md) | src/modules/workflowExecution/workflowExecuteMessage.ts | 工作流执行消息与 toast 文案的构建层：把执行结果、错误与队列进度组装成可本地化的展示文案。 |
| [workflowInputPlanning.ts](../../workflows/workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [workflowSettings.ts](../workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialogModel.ts](../workflow/settings/workflowSettingsDialogModel.ts.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts | 设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。 |
| [workflowSettingsDomain.ts](../workflow/settings/workflowSettingsDomain.ts.md) | src/modules/workflow/settings/workflowSettingsDomain.ts | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |
| [zoteroHostAccessOptions.ts](../../workflows/zoteroHostAccessOptions.ts.md) | src/workflows/zoteroHostAccessOptions.ts | Zotero 宿主访问运行选项：解析 autoApproveZoteroWrites 声明，构造注入 SkillRunner 的 ZoteroHostAccess 运行时选项，并在旧后端不支持时降级为告警。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeWorkflowControl.ts](../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [productionExecution.ts](../workflow/productionExecution.ts.md) | src/modules/workflow/productionExecution.ts | 工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。 |
| [submissionSeam.ts](submissionSeam.ts.md) | src/modules/workflowExecution/submissionSeam.ts | 工作流提交接缝：把已准备好的工作流执行单元提交到宿主任务队列或直接执行路径，并汇总每个单元的执行与回填结果。 |
| [workflowExecute.ts](../workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildPreparedWorkflowBatchExecution | 函数 | 888–968 | 汇总多个已准备执行对象为批量执行计划并计算可执行/跳过统计。 |
| [buildPreparedWorkflowUnitExecution](../../../../symbols/src/modules/workflowExecution/preparationSeam.ts/buildPreparedWorkflowUnitExecution.md) | 函数 | 813–886 | 将执行单元与对应请求组装为可运行的已准备执行对象。 |
| [buildWorkflowExecutionUnitPreview](../../../../symbols/src/modules/workflowExecution/preparationSeam.ts/buildWorkflowExecutionUnitPreview.md) | 函数 | 742–811 | 构建执行单元预览描述，含任务名、输入规模与选项摘要供 UI 展示。 |
| [runWorkflowPreparationSeam](../../../../symbols/src/modules/workflowExecution/preparationSeam.ts/runWorkflowPreparationSeam.md) | 函数 | 366–740 | preparation seam 主入口：解析执行上下文、规划执行单元、构建请求、校验必填参数并返回已准备执行结果或带诊断的失败。 |
