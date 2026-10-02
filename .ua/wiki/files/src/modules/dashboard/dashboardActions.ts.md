
# src/modules/dashboard/dashboardActions.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/dashboard](../../../../modules/src/modules/dashboard.md)
<!-- node: file:src/modules/dashboard/dashboardActions.ts -->

Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。
源码：[src/modules/dashboard/dashboardActions.ts](../../../../../../src/modules/dashboard/dashboardActions.ts)

## 符号（6）
<!-- node: function:src/modules/dashboard/dashboardActions.ts:applyDashboardManagementStatus -->
<!-- node: function:src/modules/dashboard/dashboardActions.ts:clearWorkflowSettingsSaveTimer -->
<!-- node: function:src/modules/dashboard/dashboardActions.ts:compactError -->
<!-- node: function:src/modules/dashboard/dashboardActions.ts:createDashboardActionDispatcher -->
<!-- node: function:src/modules/dashboard/dashboardActions.ts:normalizeFilteredActive -->
<!-- node: function:src/modules/dashboard/dashboardActions.ts:normalizeFilteredHistory -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyDashboardManagementStatus | 函数 | 160–199 | 简单 | state-management、backend、dashboard、status | 0 | 把后端管理操作的结果状态（进行中/成功/失败）应用到 Dashboard 状态模型。 |
| clearWorkflowSettingsSaveTimer | 函数 | 217–236 | 简单 | debounce、timer、dashboard、cleanup | 0 | 清理工作流设置的保存防抖定时器，避免切换工作流后误写。 |
| compactError | 函数 | 138–146 | 简单 | error-handling、formatting、dashboard、utility | 0 | 把错误对象压缩为短字符串，避免把整段堆栈塞进页面状态。 |
| createDashboardActionDispatcher | 函数 | 262–1621 | 复杂 | factory、action-dispatch、dashboard、controller | 0 | 构造 Dashboard 动作分发器闭包：注册后端管理、工作流设置、任务筛选、日志与诊断等全部 action 处理逻辑。 |
| normalizeFilteredActive | 函数 | 247–260 | 简单 | filtering、normalization、dashboard、task | 0 | 规范化活跃任务筛选条件，裁剪非法状态与时间范围。 |
| normalizeFilteredHistory | 函数 | 238–245 | 简单 | filtering、normalization、dashboard、task | 0 | 规范化历史任务筛选条件。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunActions.ts](../acp/skillRun/acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunStore.ts](../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceSelection.ts](../acp/skillRun/acpSkillRunWorkspaceSelection.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |
| [assistantWorkspaceSidebar.ts](../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [dashboardActiveTasks.ts](../dashboardActiveTasks.ts.md) | src/modules/dashboardActiveTasks.ts | Dashboard 活跃任务投影：按可见 scope 过滤 ACP skill run 与工作流任务，产出需要人工关注的任务计数。 |
| [dashboardSnapshot.ts](dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [dashboardWireContract.ts](../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [debugMode.ts](../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [errors.ts](../../providers/skillrunner/errors.ts.md) | src/providers/skillrunner/errors.ts | SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。 |
| [filePicker.ts](../../platform/filePicker.ts.md) | src/platform/filePicker.ts | 跨运行时文件选择器：优先使用宿主提供的原生多选文件对话框，在不可用时回退到 toolkit 的 FilePicker，并负责挑选可用的 parent window。 |
| [fileSystem.ts](../../utils/fileSystem.ts.md) | src/utils/fileSystem.ts | 在系统文件管理器中打开指定目录，优先使用 nsIFile 的 launch，退化到 reveal，并在路径为空或不存在时抛出明确错误。 |
| [modelCache.ts](../../providers/skillrunner/modelCache.ts.md) | src/providers/skillrunner/modelCache.ts | SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。 |
| [package.json](../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [runtimeLogManager.ts](../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [skillRunnerManagementClientFactory.ts](../skillRunner/connection/skillRunnerManagementClientFactory.ts.md) | src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts | SkillRunner 管理客户端的构造工厂，把后端实例的 baseUrl 与管理鉴权的读取/持久化回调注入客户端，并统一本地化错误提示。 |
| [skillRunnerProviderStateMachine.ts](../skillRunner/run/skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRunSettlement.ts](../skillRunner/run/skillRunnerRunSettlement.ts.md) | src/modules/skillRunner/run/skillRunnerRunSettlement.ts | SkillRunner 运行的失败结算：把管理端响应与异常解析为语义化结论，按状态机规则将 run 标记为失败并停止对应的会话同步。 |
| [skillRunnerSessionSyncManager.ts](../skillRunner/run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [taskDashboardHistory.ts](../taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskDashboardSnapshot.ts](../taskDashboardSnapshot.ts.md) | src/modules/taskDashboardSnapshot.ts | Dashboard 快照的数据装配层：归一化后端实例、合并活动任务与历史任务行、把工作流提交队列中的排队单元投影为 Dashboard 行，并生成后端标签页键。 |
| [taskRuntime.ts](../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [workflowMenu.ts](../workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowProductStore.ts](../workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |
| [workflowSettings.ts](../workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialogModel.ts](../workflow/settings/workflowSettingsDialogModel.ts.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts | 设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。 |
| [workflowSettingsDomain.ts](../workflow/settings/workflowSettingsDomain.ts.md) | src/modules/workflow/settings/workflowSettingsDomain.ts | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |
| [workflowSubmissionQueue.ts](../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [workflowSubmissionQueueContracts.ts](../../jobQueue/workflowSubmissionQueueContracts.ts.md) | src/jobQueue/workflowSubmissionQueueContracts.ts | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |
| [workflowVisibility.ts](../workflow/catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |
| [zoteroRuntimeVersion.ts](../../shared/zoteroRuntimeVersion.ts.md) | src/shared/zoteroRuntimeVersion.ts | 把 Zotero 版本号解析为受支持的主版本（7 / 9 / 10），用于兼容性分支与诊断输出。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardRuntime.ts](dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| clearWorkflowSettingsSaveTimer | 函数 | 217–236 | 清理工作流设置的保存防抖定时器，避免切换工作流后误写。 |
| compactError | 函数 | 138–146 | 把错误对象压缩为短字符串，避免把整段堆栈塞进页面状态。 |
| createDashboardActionDispatcher | 函数 | 262–1621 | 构造 Dashboard 动作分发器闭包：注册后端管理、工作流设置、任务筛选、日志与诊断等全部 action 处理逻辑。 |
| normalizeFilteredActive | 函数 | 247–260 | 规范化活跃任务筛选条件，裁剪非法状态与时间范围。 |
| normalizeFilteredHistory | 函数 | 238–245 | 规范化历史任务筛选条件。 |
