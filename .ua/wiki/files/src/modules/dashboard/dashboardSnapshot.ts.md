
# src/modules/dashboard/dashboardSnapshot.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/dashboard](../../../../modules/src/modules/dashboard.md)
<!-- node: file:src/modules/dashboard/dashboardSnapshot.ts -->

Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。
源码：[src/modules/dashboard/dashboardSnapshot.ts](../../../../../../src/modules/dashboard/dashboardSnapshot.ts)

## 符号（21）
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:buildDashboardSnapshot -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:buildHomeWorkflowDocView -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:buildHomeWorkflowSummaries -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:buildLiteratureArtifactMigrationView -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:buildWorkflowOptionsView -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:dashboardSelectedSurfaceSignatureInput -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:filterWorkflowSubmitVisibleBackends -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:isAcpSkillRunnerTask -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:isBackendReconcileFlagged -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:localize -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:mapTaskRowWithMeta -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:mergeAcpBackendTaskRows -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:migrationDiagnosticToDashboardView -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:migrationRunToDashboardView -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:renderMarkdownFallback -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:renderMarkdownToSafeHtml -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:resolveBackendUnavailableMessageForDialog -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:resolveDashboardLiteratureMigrationService -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:resolveHomeWorkflowQuickRun -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:resolveStatusLabel -->
<!-- node: function:src/modules/dashboard/dashboardSnapshot.ts:sanitizeRenderedMarkdownHtml -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildDashboardSnapshot | 函数 | 1204–2839 | 复杂 | snapshot、projection、dashboard、wire-contract | 0 | Dashboard 快照构建入口：汇总后端、任务、日志、工作流目录、文献迁移、ACP 诊断等全部数据源，产出页面 wire snapshot。 |
| buildHomeWorkflowDocView | 函数 | 919–969 | 中等 | markdown、workflow、dashboard、view-model | 0 | 构造工作流文档视图，含 Markdown 渲染结果与来源 baseFileUri。 |
| buildHomeWorkflowSummaries | 函数 | 826–861 | 简单 | summary、workflow、dashboard、projection | 0 | 生成首页工作流摘要列表（最近运行、状态与快捷入口）。 |
| buildLiteratureArtifactMigrationView | 函数 | 1051–1202 | 复杂 | migration、view-model、dashboard、literature | 0 | 构造文献产物迁移视图：扫描结果、冲突项与继续/停止所需的进度信息。 |
| buildWorkflowOptionsView | 函数 | 758–824 | 中等 | workflow、form、view-model、dashboard | 0 | 构造工作流可选参数视图（表单字段、默认值与校验态）。 |
| dashboardSelectedSurfaceSignatureInput | 函数 | 174–232 | 中等 | signature、memoization、dashboard、optimization | 0 | 构造当前选中 surface 的 signature 输入，只包含该 surface 的可见内容与开合状态。 |
| filterWorkflowSubmitVisibleBackends | 函数 | 568–579 | 简单 | filtering、backend、workflow、dashboard | 0 | 筛出可发起工作流提交的后端，排除禁用与不支持类型。 |
| isAcpSkillRunnerTask | 函数 | 558–566 | 简单 | predicate、acp、skillrunner、task | 0 | 判定任务记录是否为经 ACP 发起的 SkillRunner 任务，用于任务分类与归并。 |
| isBackendReconcileFlagged | 函数 | 581–593 | 简单 | backend、reconciliation、status、dashboard | 0 | 判断后端是否被标记为需要重连，用于在页面上给出修复入口。 |
| localize | 函数 | 262–275 | 简单 | i18n、utility、dashboard、fallback | 0 | Dashboard 内部使用的本地化包装，缺失文案时回退到键名。 |
| mapTaskRowWithMeta | 函数 | 662–721 | 中等 | projection、task、dashboard、table-row | 0 | 把任务记录映射为带元信息的表格行，合并多后端来源并标注不可用后端。 |
| mergeAcpBackendTaskRows | 函数 | 640–660 | 简单 | merge、task、acp、dashboard | 0 | 合并 ACP 后端任务行与工作流任务行，消除重复项。 |
| migrationDiagnosticToDashboardView | 函数 | 1010–1035 | 简单 | projection、migration、diagnostics、dashboard | 0 | 把迁移诊断项投影为可读的 Dashboard 展示结构。 |
| migrationRunToDashboardView | 函数 | 971–1008 | 简单 | projection、migration、dashboard、view-model | 0 | 把迁移运行记录投影为 Dashboard 视图模型。 |
| renderMarkdownFallback | 函数 | 387–493 | 中等 | markdown、fallback、rendering、dashboard | 0 | 无 DOM 渲染器可用时的块级 Markdown fallback，保证非浏览器环境仍能产出可读文本。 |
| renderMarkdownToSafeHtml | 函数 | 495–525 | 简单 | markdown、sanitization、security、rendering | 0 | 用共享 document profile 渲染 Markdown 为安全 HTML，供 README 与工作流文档使用。 |
| resolveBackendUnavailableMessageForDialog | 函数 | 595–604 | 简单 | i18n、backend、error-handling、dashboard | 0 | 为不可用后端生成对话框提示文案，区分未配置与连接失败。 |
| resolveDashboardLiteratureMigrationService | 函数 | 1037–1049 | 简单 | resolution、migration、service、dashboard | 0 | 解析 Dashboard 侧的文献迁移服务句柄，缺失时给出明确错误码。 |
| resolveHomeWorkflowQuickRun | 函数 | 863–917 | 中等 | workflow、quick-run、dashboard、resolution | 0 | 解析首页快捷运行的可用性与缺失输入条件。 |
| resolveStatusLabel | 函数 | 606–630 | 简单 | i18n、status、task、dashboard | 0 | 把任务原始状态解析为本地化标签，并按优先级决定运行中/等待/失败/已取消的措辞。 |
| sanitizeRenderedMarkdownHtml | 函数 | 292–373 | 中等 | sanitization、security、markdown、xss | 0 | 净化渲染结果中的 HTML，清除脚本、事件属性与危险协议。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunStore.ts](../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTaskProjection.ts](../acp/skillRun/acpSkillRunTaskProjection.ts.md) | src/modules/acp/skillRun/acpSkillRunTaskProjection.ts | 把 ACP Skill run 摘要投影为统一的工作流任务行，使 skill run 能与普通工作流任务在同一 Dashboard/队列中呈现。 |
| [dashboardWireContract.ts](../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [debugMode.ts](../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [displayName.ts](../../backends/displayName.ts.md) | src/backends/displayName.ts | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [literatureArtifactMigration.ts](../literatureArtifactMigration.ts.md) | src/modules/literatureArtifactMigration.ts | 文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。 |
| [locale.ts](../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [localization.ts](../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [localizationGovernance.ts](../../utils/localizationGovernance.ts.md) | src/utils/localizationGovernance.ts | 本地化治理层：canonicalize locale、按语言回退链取值、识别未解析的原始文案，并集中产出托管本地运行时与 SkillRunner 后端相关的 toast 文案。 |
| [path.ts](../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeLogManager.ts](../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [skillRunnerBackendHealthRegistry.ts](../skillRunner/connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerManagementDialog.ts](../skillRunner/surface/skillRunnerManagementDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerManagementDialog.ts | SkillRunner 管理界面的 URL 构造工具：校验并规范化后端 baseUrl，补齐 /ui 路径，为管理面板提供安全的打开地址。 |
| [skillRunnerProviderStateMachine.ts](../skillRunner/run/skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [taskDashboardHistory.ts](../taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskDashboardSnapshot.ts](../taskDashboardSnapshot.ts.md) | src/modules/taskDashboardSnapshot.ts | Dashboard 快照的数据装配层：归一化后端实例、合并活动任务与历史任务行、把工作流提交队列中的排队单元投影为 Dashboard 行，并生成后端标签页键。 |
| [taskRuntime.ts](../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [triggerPolicy.ts](../../workflows/triggerPolicy.ts.md) | src/workflows/triggerPolicy.ts | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [workflowProductStore.ts](../workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |
| [workflowRuntime.ts](../workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowSettings.ts](../workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDomain.ts](../workflow/settings/workflowSettingsDomain.ts.md) | src/modules/workflow/settings/workflowSettingsDomain.ts | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |
| [workflowSubmissionQueue.ts](../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [workflowVisibility.ts](../workflow/catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardActions.ts](dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardRuntime.ts](dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildDashboardSnapshot | 函数 | 1204–2839 | Dashboard 快照构建入口：汇总后端、任务、日志、工作流目录、文献迁移、ACP 诊断等全部数据源，产出页面 wire snapshot。 |
| buildHomeWorkflowSummaries | 函数 | 826–861 | 生成首页工作流摘要列表（最近运行、状态与快捷入口）。 |
| filterWorkflowSubmitVisibleBackends | 函数 | 568–579 | 筛出可发起工作流提交的后端，排除禁用与不支持类型。 |
| isAcpSkillRunnerTask | 函数 | 558–566 | 判定任务记录是否为经 ACP 发起的 SkillRunner 任务，用于任务分类与归并。 |
| isBackendReconcileFlagged | 函数 | 581–593 | 判断后端是否被标记为需要重连，用于在页面上给出修复入口。 |
| localize | 函数 | 262–275 | Dashboard 内部使用的本地化包装，缺失文案时回退到键名。 |
| resolveBackendUnavailableMessageForDialog | 函数 | 595–604 | 为不可用后端生成对话框提示文案，区分未配置与连接失败。 |
| resolveDashboardLiteratureMigrationService | 函数 | 1037–1049 | 解析 Dashboard 侧的文献迁移服务句柄，缺失时给出明确错误码。 |
| resolveHomeWorkflowQuickRun | 函数 | 863–917 | 解析首页快捷运行的可用性与缺失输入条件。 |
