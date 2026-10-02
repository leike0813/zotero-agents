
# 工作流引擎与执行

声明式工作流引擎：工作流包加载与 manifest 合约、Workflow Host API 组合与输入物化、触发策略与执行子模块、任务运行时投影，以及工作流与 Skill 使用的 JSON Schema 定义。
> 本页由知识图谱分层 `layer:workflow-engine` 生成，共 86 个文件级节点。

## 目录分布

| 目录 | 文件数 |
| --- | --- |
| [src/workflows](../modules/src/workflows.md) | 26 |
| [src/modules/workflowExecution](../modules/src/modules/workflowExecution.md) | 23 |
| [src/modules/workflow/settings](../modules/src/modules/workflow/settings.md) | 10 |
| [src/modules/workflow/catalog](../modules/src/modules/workflow/catalog.md) | 9 |
| [src/schemas/skill](../modules/src/schemas/skill.md) | 7 |
| [src/modules/workflow/ui](../modules/src/modules/workflow/ui.md) | 5 |
| [src/schemas](../modules/src/schemas.md) | 4 |
| [src/modules](../modules/src/modules.md) | 1 |
| [src/modules/workflow](../modules/src/modules/workflow.md) | 1 |

## 关键符号

本层中被其他节点引用较多、值得单独成页的符号。

| 符号 | 类型 | 复杂度 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- |
| [parseWorkflowManifestFromText](../symbols/src/workflows/loaderContracts.ts/parseWorkflowManifestFromText.md) | 函数 | 复杂 | 2 | 解析并校验工作流 manifest 文本，返回规范化 manifest 或带诊断的错误。 |
| [parseWorkflowPackageManifestFromText](../symbols/src/workflows/loaderContracts.ts/parseWorkflowPackageManifestFromText.md) | 函数 | 复杂 | 1 | 解析并校验工作流包 manifest 文本，含官方内容声明与默认配置。 |

## 文件清单

| 文件 | 类型 | 语言 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/taskRuntime.ts](../files/src/modules/taskRuntime.ts.md) | 文件 | — | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [src/modules/workflow/catalog/builtinWorkflowSync.ts](../files/src/modules/workflow/catalog/builtinWorkflowSync.ts.md) | 文件 | — | 内置工作流目录同步：比对 workflows_builtin 随插件分发的定义与本地已安装工作流，按版本与内容摘要判定升级、跳过或失败，并经 runtimeBridge 把变更投到 Workflow Host。 |
| [src/modules/workflow/catalog/contentPackageSubscription.ts](../files/src/modules/workflow/catalog/contentPackageSubscription.ts.md) | 文件 | — | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
| [src/modules/workflow/catalog/pluginSkillRegistry.ts](../files/src/modules/workflow/catalog/pluginSkillRegistry.ts.md) | 文件 | — | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [src/modules/workflow/catalog/workflowPackageDiagnostics.ts](../files/src/modules/workflow/catalog/workflowPackageDiagnostics.ts.md) | 文件 | — | 工作流包诊断通道：在 debug 模式或诊断详细级别下，把工作流运行时可用能力摘要与 hook 诊断信息写入 runtimeLog，并按诊断级别选择 console 通道输出。 |
| [src/modules/workflow/catalog/workflowProductStore.ts](../files/src/modules/workflow/catalog/workflowProductStore.ts.md) | 文件 | — | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |
| [src/modules/workflow/catalog/workflowRequestKind.ts](../files/src/modules/workflow/catalog/workflowRequestKind.ts.md) | 文件 | — | 请求类型解析：按后端类型与显式声明判定一次工作流请求的 kind（ACP prompt、ACP skill run、SkillRunner sequence 或透传），是队列分派的输入。 |
| [src/modules/workflow/catalog/workflowRuntime.ts](../files/src/modules/workflow/catalog/workflowRuntime.ts.md) | 文件 | — | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [src/modules/workflow/catalog/workflowRuntimeBridge.ts](../files/src/modules/workflow/catalog/workflowRuntimeBridge.ts.md) | 文件 | — | 工作流运行时桥：向工作流包暴露一个极小的宿主能力面（appendRuntimeLog 与 showToast），同时写入 globalThis 与 addon 对象，供工作流包在无 import 权限下调用宿主。 |
| [src/modules/workflow/catalog/workflowVisibility.ts](../files/src/modules/workflow/catalog/workflowVisibility.ts.md) | 文件 | — | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |
| [src/modules/workflow/productionExecution.ts](../files/src/modules/workflow/productionExecution.ts.md) | 文件 | — | 工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。 |
| [src/modules/workflow/settings/backendManager.ts](../files/src/modules/workflow/settings/backendManager.ts.md) | 文件 | — | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [src/modules/workflow/settings/genericHttpBackendPresets.ts](../files/src/modules/workflow/settings/genericHttpBackendPresets.ts.md) | 文件 | — | 通用 HTTP Provider 的内置后端预设表（如 MinerU 官方服务），提供预设查询以及从预设派生后端草稿的构造逻辑。 |
| [src/modules/workflow/settings/workflowParameterOptions.ts](../files/src/modules/workflow/settings/workflowParameterOptions.ts.md) | 文件 | — | 工作流动态参数候选项的来源解析器，按参数声明的来源类型从 Synthesis sidecar 合约或 Zotero Host 能力 Broker 拉取可选值并附带诊断信息。 |
| [src/modules/workflow/settings/workflowSettings.ts](../files/src/modules/workflow/settings/workflowSettings.ts.md) | 文件 | — | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [src/modules/workflow/settings/workflowSettingsDialog.ts](../files/src/modules/workflow/settings/workflowSettingsDialog.ts.md) | 文件 | — | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |
| [src/modules/workflow/settings/workflowSettingsDialogModel.ts](../files/src/modules/workflow/settings/workflowSettingsDialogModel.ts.md) | 文件 | — | 设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。 |
| [src/modules/workflow/settings/workflowSettingsDomain.ts](../files/src/modules/workflow/settings/workflowSettingsDomain.ts.md) | 文件 | — | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |
| [src/modules/workflow/settings/workflowSettingsNormalizer.ts](../files/src/modules/workflow/settings/workflowSettingsNormalizer.ts.md) | 文件 | — | 针对已加载工作流目录的设置归一化层，在持久化设置与执行时选项中剥离陈旧字段并按当前已注册工作流集合补齐缺失配置。 |
| [src/modules/workflow/settings/workflowSettingsOptionLocalization.ts](../files/src/modules/workflow/settings/workflowSettingsOptionLocalization.ts.md) | 文件 | — | Provider 运行时选项与工作流运行选项的文案本地化，优先按 locale key 查表，缺失时回落到 schema 自带文本。 |
| [src/modules/workflow/settings/workflowSettingsWebDialog.ts](../files/src/modules/workflow/settings/workflowSettingsWebDialog.ts.md) | 文件 | — | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |
| [src/modules/workflow/ui/selectionSample.ts](../files/src/modules/workflow/ui/selectionSample.ts.md) | 文件 | — | 调试用选区采样工具：在 Zotero 菜单中注册「采样当前选区」入口，读取 Zotero SelectionContext 后写入临时文件，供工作流输入物化问题排查。 |
| [src/modules/workflow/ui/workflowDebugProbe.ts](../files/src/modules/workflow/ui/workflowDebugProbe.ts.md) | 文件 | — | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [src/modules/workflow/ui/workflowEditorHost.ts](../files/src/modules/workflow/ui/workflowEditorHost.ts.md) | 文件 | — | 工作流编辑器宿主：在 Zotero 窗口中打开内嵌 HTML 编辑器面板，承载工作流节点编辑，并把 legacy 文献产物负载通过迁移转换器升级为现行 schema。 |
| [src/modules/workflow/ui/workflowExecute.ts](../files/src/modules/workflow/ui/workflowExecute.ts.md) | 文件 | — | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [src/modules/workflow/ui/workflowMenu.ts](../files/src/modules/workflow/ui/workflowMenu.ts.md) | 文件 | — | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [src/modules/workflowExecution/acpSequenceStepLifecycle.ts](../files/src/modules/workflowExecution/acpSequenceStepLifecycle.ts.md) | 文件 | — | ACP 序列步骤的生命周期适配器实现，在步骤应用结果确定后把 apply 状态写回 ACP Skill Run 并在结束时卸载控制器。 |
| [src/modules/workflowExecution/applyDiagnostics.ts](../files/src/modules/workflowExecution/applyDiagnostics.ts.md) | 文件 | — | 工作流 apply 阶段诊断信息的归一化，限制 warning 数量与 code 长度上限，输出结构化且有界的诊断记录。 |
| [src/modules/workflowExecution/applySeam.ts](../files/src/modules/workflowExecution/applySeam.ts.md) | 文件 | — | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [src/modules/workflowExecution/artifactManifest.ts](../files/src/modules/workflowExecution/artifactManifest.ts.md) | 文件 | — | 工作流执行产物清单：归一化执行产生的文件/笔记产物条目，形成可校验的 artifact manifest，供结果上下文与 Attachment 导入消费。 |
| [src/modules/workflowExecution/bundleIO.ts](../files/src/modules/workflowExecution/bundleIO.ts.md) | 文件 | — | 运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。 |
| [src/modules/workflowExecution/contracts.ts](../files/src/modules/workflowExecution/contracts.ts.md) | 文件 | — | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [src/modules/workflowExecution/duplicateGuardSeam.ts](../files/src/modules/workflowExecution/duplicateGuardSeam.ts.md) | 文件 | — | 工作流重复执行守卫：比对进行中的任务摘要与待执行单元的身份（任务名、目标父条目、输入单元），识别重复后阻止提交并给出可读原因。 |
| [src/modules/workflowExecution/feedbackPolicy.ts](../files/src/modules/workflowExecution/feedbackPolicy.ts.md) | 文件 | — | 工作流通知策略的单一判定点，按 manifest 的 execution.feedback.showNotifications 决定是否展示完成通知。 |
| [src/modules/workflowExecution/feedbackSeam.ts](../files/src/modules/workflowExecution/feedbackSeam.ts.md) | 文件 | — | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [src/modules/workflowExecution/messageFormatter.ts](../files/src/modules/workflowExecution/messageFormatter.ts.md) | 文件 | — | 工作流消息本地化格式化器：先查 addon locale 资源，缺失时回落到调用方提供的 fallback 文案，并组装出符合 WorkflowMessageFormatter 契约的格式化函数。 |
| [src/modules/workflowExecution/preparationSeam.ts](../files/src/modules/workflowExecution/preparationSeam.ts.md) | 文件 | — | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [src/modules/workflowExecution/requestMeta.ts](../files/src/modules/workflowExecution/requestMeta.ts.md) | 文件 | — | 从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。 |
| [src/modules/workflowExecution/resultContext.ts](../files/src/modules/workflowExecution/resultContext.ts.md) | 文件 | — | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |
| [src/modules/workflowExecution/resultEnvelope.ts](../files/src/modules/workflowExecution/resultEnvelope.ts.md) | 文件 | — | 解包 SkillRunner 返回结果的外层信封，识别带有 success_source / repair_level / artifacts 等特征字段时取出内部 data，否则按 result 嵌套逐层下探。 |
| [src/modules/workflowExecution/runConcurrency.ts](../files/src/modules/workflowExecution/runConcurrency.ts.md) | 文件 | — | 工作流派发并发度解析：仅 SkillRunner 与通用 HTTP 这类全并行 Provider 允许按请求数并发，其余 Provider 强制串行。 |
| [src/modules/workflowExecution/runSeam.ts](../files/src/modules/workflowExecution/runSeam.ts.md) | 文件 | — | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [src/modules/workflowExecution/sequenceRuntime.ts](../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | 文件 | — | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [src/modules/workflowExecution/sequenceStateStore.ts](../files/src/modules/workflowExecution/sequenceStateStore.ts.md) | 文件 | — | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [src/modules/workflowExecution/sequenceStepApply.ts](../files/src/modules/workflowExecution/sequenceStepApply.ts.md) | 文件 | — | 序列单步 apply 执行：构造结果上下文与 bundle reader 调用运行时 apply，并收集 Skill Run 反馈侧信息返回给序列状态机。 |
| [src/modules/workflowExecution/submissionSeam.ts](../files/src/modules/workflowExecution/submissionSeam.ts.md) | 文件 | — | 工作流提交接缝：把已准备好的工作流执行单元提交到宿主任务队列或直接执行路径，并汇总每个单元的执行与回填结果。 |
| [src/modules/workflowExecution/terminalResolution.ts](../files/src/modules/workflowExecution/terminalResolution.ts.md) | 文件 | — | 工作流作业终态解析：把 ACP SkillRun、SkillRunner run store 与序列状态三个来源的观测归一到统一的作业槽位状态和终态结论。 |
| [src/modules/workflowExecution/valuePath.ts](../files/src/modules/workflowExecution/valuePath.ts.md) | 文件 | — | 工作流执行期的通用取值工具：比较原始值相等性并按点分路径安全读取对象属性。 |
| [src/modules/workflowExecution/workflowExecuteMessage.ts](../files/src/modules/workflowExecution/workflowExecuteMessage.ts.md) | 文件 | — | 工作流执行消息与 toast 文案的构建层：把执行结果、错误与队列进度组装成可本地化的展示文案。 |
| [src/schemas/selectionContextSchema.ts](../files/src/schemas/selectionContextSchema.ts.md) | 文件 | — | Selection Context 的 JSON Schema 定义，约束 Broker 锁定选择上下文的数据结构。 |
| [src/schemas/skill/skill_input_schema.schema.json](../files/src/schemas/skill/skill_input_schema.schema.json.md) | 配置 | — | Skill 输入的 JSON Schema：校验 Skill 声明的输入对象结构，并用 x-input-source 注解区分 file 与 inline 两种入参来源。 |
| [src/schemas/skill/skill_input_schema.schema.json](../files/src/schemas/skill/skill_input_schema.schema.json.md) | 模式 | — | $defs.inputProperty：单个输入参数的注解约定，声明 x-input-source（file / inline）与可选 extensions 扩展名过滤。 |
| [src/schemas/skill/skill_output_schema.schema.json](../files/src/schemas/skill/skill_output_schema.schema.json.md) | 配置 | — | Skill 输出的 JSON Schema：用 x-type 与 x-role 注解约束产物类型（artifact / artifact-manifest / file），并以条件分支强制 manifest 必带角色。 |
| [src/schemas/skill/skill_output_schema.schema.json](../files/src/schemas/skill/skill_output_schema.schema.json.md) | 模式 | — | $defs.outputProperty：单个输出字段的注解约定，x-type 取 artifact / artifact-manifest / file，并以 if/then 分支要求产物类输出必须带 x-role。 |
| [src/schemas/skill/skill_parameter_schema.schema.json](../files/src/schemas/skill/skill_parameter_schema.schema.json.md) | 配置 | — | Skill 参数包（parameters 段）的最小 JSON Schema：仅要求 type 为 object，并允许 properties 下的每个参数项自由声明。 |
| [src/schemas/skill/skill_runner_manifest.schema.json](../files/src/schemas/skill/skill_runner_manifest.schema.json.md) | 配置 | — | Skill Runner manifest 的 JSON Schema：约束 Skill 包的 id、执行模式、引擎白名单、入口与 MCP 依赖，是 ACP Skill 装配与运行请求校验的结构事实源。 |
| [src/schemas/skill/skill_runner_manifest.schema.json](../files/src/schemas/skill/skill_runner_manifest.schema.json.md) | 模式 | — | $defs.engine：Skill 可用执行引擎的枚举（codex / claude / gemini / opencode / qwen），同时约束 engines 与 unsupported_engines 两个属性。 |
| [src/schemas/workflow-package.schema.json](../files/src/schemas/workflow-package.schema.json.md) | 配置 | — | 工作流包 manifest 的 JSON Schema，定义包标识、版本、入口 workflow 与目录布局等字段约束。 |
| [src/schemas/workflow.schema.json](../files/src/schemas/workflow.schema.json.md) | 配置 | — | 单个工作流定义的 JSON Schema，完整描述 task/step 声明、输入物化、输入输出契约与构建策略等结构。 |
| [src/schemas/zoteroHostMutationSchemas.ts](../files/src/schemas/zoteroHostMutationSchemas.ts.md) | 文件 | — | Zotero 宿主变更的 JSON Schema 契约：定义 note detail、managed note 写入、文献产物 upsert 与各 mutation 操作的输入/预览/执行结果 schema 及其按操作索引的映射表。 |
| [src/workflows/archive.ts](../files/src/workflows/archive.ts.md) | 文件 | — | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [src/workflows/bibliography.ts](../files/src/workflows/bibliography.ts.md) | 文件 | — | 工作流参考文献渲染 owner：按 bibliography 格式调用 Zotero 内置 export translator 渲染书目，并规范化格式选项与 portable ref 输入。 |
| [src/workflows/clipboard.ts](../files/src/workflows/clipboard.ts.md) | 文件 | — | 工作流剪贴板 owner：优先解析 Gecko 剪贴板、次选 navigator.clipboard，并提供纯内存 adapter 作为降级实现，统一的读写限额与取消语义在此收敛。 |
| [src/workflows/declarativeRequestCompiler.ts](../files/src/workflows/declarativeRequestCompiler.ts.md) | 文件 | — | 声明式请求编译器：把工作流 manifest 的 request 声明与当前选择集编译为各 provider 的具体请求负载，含任务名模板、附件选择与多步骤 HTTP 序列。 |
| [src/workflows/errorMeta.ts](../files/src/workflows/errorMeta.ts.md) | 文件 | — | 工作流 hook 失败元数据：把 hook 名、工作流标识与能力来源挂到异常对象上，供诊断层读取并生成可读的失败摘要。 |
| [src/workflows/file.ts](../files/src/workflows/file.ts.md) | 文件 | — | 工作流文件能力 API：基于 runtimePersistence 统一的文件读写、原子写入、目录遍历与移动删除，并接入平台文件选择器，路径与错误均按 Workflow Host 契约规范化。 |
| [src/workflows/helpers.ts](../files/src/workflows/helpers.ts.md) | 文件 | — | 工作流 hook 辅助层：为用户编写的 hook 提供条目解析、路径处理与产物就绪判定等安全封装。 |
| [src/workflows/hostApi.ts](../files/src/workflows/hostApi.ts.md) | 文件 | — | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [src/workflows/loader.ts](../files/src/workflows/loader.ts.md) | 文件 | — | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [src/workflows/loaderContracts.ts](../files/src/workflows/loaderContracts.ts.md) | 文件 | — | 工作流 manifest 契约：基于 JSON Schema 校验 manifest 形状，并补充选择计数、输入规划与序列步骤等跨字段语义校验。 |
| [src/workflows/localization.ts](../files/src/workflows/localization.ts.md) | 文件 | — | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [src/workflows/manifestContract.ts](../files/src/workflows/manifestContract.ts.md) | 文件 | — | 工作流 manifest 契约投影：把 manifest 中的执行模式、资源要求、provider 需求、结果证据与选择规则投影为可对外发布的稳定契约。 |
| [src/workflows/packageHookBundler.ts](../files/src/workflows/packageHookBundler.ts.md) | 文件 | — | 工作流包 hook 打包器：收集工作流包声明的 hook 脚本与其依赖资源，生成可分发的 bundle 目录结构。 |
| [src/workflows/runtime.ts](../files/src/workflows/runtime.ts.md) | 文件 | — | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [src/workflows/triggerPolicy.ts](../files/src/workflows/triggerPolicy.ts.md) | 文件 | — | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [src/workflows/types.ts](../files/src/workflows/types.ts.md) | 文件 | — | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [src/workflows/workflowHostContract.ts](../files/src/workflows/workflowHostContract.ts.md) | 文件 | — | Workflow Host API 契约：以候选 manifest 声明期望的能力面，检查实际实现的缺失、冗余与形状偏差，并解析契约版本。 |
| [src/workflows/workflowHostErrorContract.ts](../files/src/workflows/workflowHostErrorContract.ts.md) | 文件 | — | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |
| [src/workflows/workflowHostOwners.ts](../files/src/workflows/workflowHostOwners.ts.md) | 文件 | — | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [src/workflows/workflowInputMaterialization.ts](../files/src/workflows/workflowInputMaterialization.ts.md) | 文件 | — | 工作流输入物化：把声明的输入文件复制到受管工作区，规范化并去重文件名，拒绝 Windows 保留设备名，然后返回可供后续处理的可信路径。 |
| [src/workflows/workflowInputPlanning.ts](../files/src/workflows/workflowInputPlanning.ts.md) | 文件 | — | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [src/workflows/workflowLoggingOwner.ts](../files/src/workflows/workflowLoggingOwner.ts.md) | 文件 | — | 工作流日志 owner：绑定 workflowId/runId 等运行身份，把结构化日志请求校验为严格 JSON 并脱敏 token 与本机路径后写入 runtime log。 |
| [src/workflows/workflowNoteImagePreparation.ts](../files/src/workflows/workflowNoteImagePreparation.ts.md) | 文件 | — | 笔记图片准备：解码并校验 base64 图片、推断 MIME、按有界尺寸与 token 化引用生成 prepared image，供后续在原生事务中导入为笔记附件。 |
| [src/workflows/workflowStoredAttachmentImport.ts](../files/src/workflows/workflowStoredAttachmentImport.ts.md) | 文件 | — | 已存附件的受管暂存：规范化伴随文件相对路径、拒绝越界与重复项，在创建 Zotero attachment 之前完成校验并返回带 cleanup 的暂存句柄。 |
| [src/workflows/zipBundleReader.ts](../files/src/workflows/zipBundleReader.ts.md) | 文件 | — | zip bundle 读取：解析工作流/内容包 zip 归档，校验条目路径安全后解出文件树，并配合泄漏探针清理解包临时目录。 |
| [src/workflows/zoteroHostAccessOptions.ts](../files/src/workflows/zoteroHostAccessOptions.ts.md) | 文件 | — | Zotero 宿主访问运行选项：解析 autoApproveZoteroWrites 声明，构造注入 SkillRunner 的 ZoteroHostAccess 运行时选项，并在旧后端不支持时降级为告警。 |

## 对其它分层的依赖

| 目标分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [插件外壳与核心运行时](plugin-core.md) | 157 | imports×157 |
| [Agent 协议与后端运行时](agent-runtime.md) | 71 | imports×67、defines_schema×4 |
| [Zotero 宿主与 Bridge 集成](zotero-host.md) | 27 | imports×27 |
| [Synthesis 领域与侧车](synthesis-domain.md) | 10 | imports×10 |
| [页面与交互界面](ui-surface.md) | 8 | imports×8 |
| [构建、发布与工程配置](build-tooling.md) | 7 | imports×7 |

## 被其它分层依赖

| 来源分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [Agent 协议与后端运行时](agent-runtime.md) | 59 | imports×59 |
| [Zotero 宿主与 Bridge 集成](zotero-host.md) | 55 | imports×55 |
| [页面与交互界面](ui-surface.md) | 40 | imports×40 |
| [插件外壳与核心运行时](plugin-core.md) | 25 | imports×25 |
| [构建、发布与工程配置](build-tooling.md) | 14 | imports×13、configures×1 |
| [Synthesis 领域与侧车](synthesis-domain.md) | 7 | imports×7 |
