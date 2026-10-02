
# src/modules/workflow/settings/backendManager.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/settings](../../../../../modules/src/modules/workflow/settings.md)
<!-- node: file:src/modules/workflow/settings/backendManager.ts -->

后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。
源码：[src/modules/workflow/settings/backendManager.ts](../../../../../../../src/modules/workflow/settings/backendManager.ts)

## 符号（23）
<!-- node: function:src/modules/workflow/settings/backendManager.ts:appendBackendRow -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:appendProviderSection -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:buildBackendManagerLabels -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:buildBackendManagerSnapshot -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:buildSkillRunnerHealthSnapshot -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:collectBackendsFromDialog -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:collectBackendsFromDraftRows -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:confirmBackendManagerClose -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:createAcpPresetMenu -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:createBackendManagerActionBar -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:createBackendManagerDomDraftSignature -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:createChoiceControl -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:ensureTableSkeleton -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:getBackendRowActionKindsForType -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:installBackendManagerBeforeUnloadPrompt -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:openBackendManagerDialog -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:persistBackendsConfig -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:readPersistedManagementAuthByBackendId -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:resolveAcpBackendFromRow -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:resolveSkillRunnerBackendFromRow -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:setAcpBackendRowBusy -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:setChoiceControlOptions -->
<!-- node: function:src/modules/workflow/settings/backendManager.ts:triggerSilentModelCacheRefreshForAddedSkillRunnerBackends -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendBackendRow | 函数 | 925–977 | 中等 | dom、table、backend-config | 0 | 按后端类型组装一行完整的表格行：字段控件、状态芯片与操作按钮。 |
| appendProviderSection | 函数 | 979–1074 | 中等 | dom、provider、backend-config | 0 | 按 provider 类型追加对应的配置区（ACP 预设、SkillRunner 端点或通用 HTTP 字段）。 |
| buildBackendManagerLabels | 函数 | 2274–2425 | 复杂 | i18n、labels、backend-config | 0 | 构建后端管理器所需的全部本地化文案集合，界面文案不在渲染处散落。 |
| buildBackendManagerSnapshot | 函数 | 2491–2555 | 中等 | snapshot、backend-config、read-model | 0 | 为对话框生成后端列表、状态与运行时环境的整体快照，供渲染与比对复用。 |
| buildSkillRunnerHealthSnapshot | 函数 | 2427–2445 | 简单 | health、skillrunner、snapshot | 0 | 汇总 SkillRunner 后端的健康与可达性状态，供状态芯片着色。 |
| collectBackendsFromDialog | 函数 | 1602–1766 | 复杂 | collection、backend-config、normalization、exported | 0 | 遍历对话框所有表格行收集后端草稿，并归一化类型与内部 id。 |
| collectBackendsFromDraftRows | 函数 | 1806–1961 | 复杂 | collection、backend-config、draft、exported | 0 | 从内存草稿行收集后端配置，供保存前的内存态提交路径使用。 |
| confirmBackendManagerClose | 函数 | 1228–1248 | 简单 | guard、dialog、dirty-check | 0 | 关闭前检测未保存改动并通过确认对话框拦截，避免静默丢失配置。 |
| createAcpPresetMenu | 函数 | 441–530 | 中等 | dom、menu、acp、preset | 0 | 构建 ACP 预设菜单，把内置与用户自定义预设组织为可点击的菜单项。 |
| createBackendManagerActionBar | 函数 | 1094–1140 | 中等 | dom、toolbar、backend-config | 0 | 构建对话框底部操作栏：保存、添加、刷新模型与关闭等按钮。 |
| createBackendManagerDomDraftSignature | 函数 | 1197–1217 | 简单 | signature、dirty-check、backend-config | 0 | 为当前 DOM 草稿生成签名，用于判断是否存在未保存改动。 |
| createChoiceControl | 函数 | 363–439 | 中等 | dom、component、form | 0 | 构建可编辑下拉选择控件（含触发器与选项列表），是后端类型/请求类型选择器的基础组件。 |
| ensureTableSkeleton | 函数 | 1142–1181 | 简单 | dom、table、layout | 0 | 确保后端表格骨架（表头与空态占位行）存在且列宽一致。 |
| getBackendRowActionKindsForType | 函数 | 833–842 | 简单 | backend-config、capabilities、dom、exported | 0 | 按后端类型返回该行可用的操作按钮种类集合，驱动行尾按钮渲染。 |
| installBackendManagerBeforeUnloadPrompt | 函数 | 1250–1267 | 简单 | lifecycle、guard、backend-config | 0 | 在对话框窗口安装 beforeunload 提示，防止误关导致草稿丢失。 |
| openBackendManagerDialog | 函数 | 2580–2959 | 复杂 | dialog、entry-point、backend-config、exported | 0 | 后端管理器的主入口：创建窗口与表格、装载现有配置、安装未保存守卫并接管全部交互。 |
| persistBackendsConfig | 函数 | 2052–2168 | 中等 | persistence、backend-config、side-effects、exported | 0 | 把后端列表写入首选项 JSON 与后端注册表，并触发菜单与 UI 刷新。 |
| readPersistedManagementAuthByBackendId | 函数 | 1969–2014 | 中等 | persistence、authentication、backend-config | 0 | 按后端 id 读取已持久化的管理面鉴权信息，避免对话框重新输入凭据。 |
| resolveAcpBackendFromRow | 函数 | 1402–1464 | 中等 | parsing、backend-config、acp | 0 | 从表格行解析 ACP 后端实例，含命令、参数、环境变量与运行时选项。 |
| resolveSkillRunnerBackendFromRow | 函数 | 1318–1373 | 中等 | parsing、backend-config、skillrunner | 0 | 从表格行解析出完整的 SkillRunner 后端实例，含 baseUrl、鉴权与运行时配置。 |
| setAcpBackendRowBusy | 函数 | 793–831 | 简单 | dom、state、acp | 0 | 切换 ACP 行内操作按钮的忙碌态与禁用态，避免探测期间重复点击。 |
| setChoiceControlOptions | 函数 | 304–361 | 中等 | dom、component、state | 0 | 重填选择控件的选项并保持当前选中值，尽量减少 DOM 重建。 |
| triggerSilentModelCacheRefreshForAddedSkillRunnerBackends | 函数 | 2016–2050 | 简单 | cache、skillrunner、side-effects | 0 | 为新增的 SkillRunner 后端静默触发一次模型缓存刷新，不打断保存流程。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendPresets.ts](../../acp/chat/acpBackendPresets.ts.md) | src/modules/acp/chat/acpBackendPresets.ts | ACP 后端预设目录：维护内置 Agent 后端（命令、参数、请求类型、显示名）的定义与解析，供后端管理器和连接层复用。 |
| [acpBackendProbe.ts](../../acp/transport/acpBackendProbe.ts.md) | src/modules/acp/transport/acpBackendProbe.ts | ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。 |
| [acpSessionManager.ts](../../acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [command.ts](../../../platform/command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [dashboardWireContract.ts](../../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [diagnosticVerbosity.ts](../../diagnosticVerbosity.ts.md) | src/modules/diagnosticVerbosity.ts | 诊断日志的冗长输出开关，从运行时环境变量或测试 override 读取 verbose 标记，并提供统一的条件 console 输出入口。 |
| [genericHttpBackendPresets.ts](genericHttpBackendPresets.ts.md) | src/modules/workflow/settings/genericHttpBackendPresets.ts | 通用 HTTP Provider 的内置后端预设表（如 MinerU 官方服务），提供预设查询以及从预设派生后端草稿的构造逻辑。 |
| [identity.ts](../../../backends/identity.ts.md) | src/backends/identity.ts | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [modelCache.ts](../../../providers/skillrunner/modelCache.ts.md) | src/providers/skillrunner/modelCache.ts | SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。 |
| [package.json](../../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [skillRunnerBackendHealthRegistry.ts](../../skillRunner/connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerBackendReachabilityCoordinator.ts](../../skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts | 后端可达性探测的调度协调器：周期性扫描已配置后端、通过 management client 发起轻量探针，并把判定为长期不可达的后端自动禁用并弹出提示 toast。 |
| [skillRunnerManagementDialog.ts](../../skillRunner/surface/skillRunnerManagementDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerManagementDialog.ts | SkillRunner 管理界面的 URL 构造工具：校验并规范化后端 baseUrl，补齐 /ui 路径，为管理面板提供安全的打开地址。 |
| [skillRunnerSessionSyncManager.ts](../../skillRunner/run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [skillRunnerTaskReconciler.ts](../../skillRunner/run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [window.ts](../../../utils/window.ts.md) | src/utils/window.ts | 判断窗口对象是否仍然存活（未 closed 且不是 dead wrapper），用于避免重复打开同一窗口。 |
| [workflowMenu.ts](../ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workspaceTab.ts](../../workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceSidebar.ts](../../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeWorkflowControl.ts](../../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [workflowSettingsWebDialog.ts](workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| collectBackendsFromDialog | 函数 | 1602–1766 | 遍历对话框所有表格行收集后端草稿，并归一化类型与内部 id。 |
| collectBackendsFromDraftRows | 函数 | 1806–1961 | 从内存草稿行收集后端配置，供保存前的内存态提交路径使用。 |
| getBackendRowActionKindsForType | 函数 | 833–842 | 按后端类型返回该行可用的操作按钮种类集合，驱动行尾按钮渲染。 |
| openBackendManagerDialog | 函数 | 2580–2959 | 后端管理器的主入口：创建窗口与表格、装载现有配置、安装未保存守卫并接管全部交互。 |
| persistBackendsConfig | 函数 | 2052–2168 | 把后端列表写入首选项 JSON 与后端注册表，并触发菜单与 UI 刷新。 |
