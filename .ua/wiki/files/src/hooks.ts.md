
# src/hooks.ts
所属分层：[插件外壳与核心运行时](../../layers/plugin-core.md)  
所属目录：[src](../../modules/src.md)
<!-- node: file:src/hooks.ts -->

插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。
源码：[src/hooks.ts](../../../../src/hooks.ts)

## 符号（19）
<!-- node: function:src/hooks.ts:beginContentPackageInstallProgressToast -->
<!-- node: function:src/hooks.ts:createStartupProgressToast -->
<!-- node: function:src/hooks.ts:ensureStartupRuntimePreflight -->
<!-- node: function:src/hooks.ts:ensureWorkflowRegistryAndMenu -->
<!-- node: function:src/hooks.ts:getRuntimeToolkit -->
<!-- node: function:src/hooks.ts:hostBridgeCliStartupPromptMessage -->
<!-- node: function:src/hooks.ts:initializeSynthesisBuiltinTagsOnStartup -->
<!-- node: function:src/hooks.ts:installOfficialWorkflowPackageWithProgress -->
<!-- node: function:src/hooks.ts:onMainWindowLoad -->
<!-- node: function:src/hooks.ts:onNotify -->
<!-- node: function:src/hooks.ts:onPrefsEvent -->
<!-- node: function:src/hooks.ts:onShutdown -->
<!-- node: function:src/hooks.ts:onStartup -->
<!-- node: function:src/hooks.ts:promptOfficialWorkflowPackageUpdateOnStartup -->
<!-- node: function:src/hooks.ts:registerLibraryArtifactsNotifierObserver -->
<!-- node: function:src/hooks.ts:registerZoteroPaneStylesheet -->
<!-- node: function:src/hooks.ts:runShutdownStepWithTimeout -->
<!-- node: function:src/hooks.ts:scheduleHostBridgeCliInstallPrompt -->
<!-- node: function:src/hooks.ts:unregisterLibraryArtifactsNotifierObserver -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| beginContentPackageInstallProgressToast | 函数 | 395–435 | 简单 | ui、progress、toast、startup | 0 | 弹出内容包安装进度 toast，暴露更新/完成回调并在失败时给出错误提示。 |
| createStartupProgressToast | 函数 | 747–774 | 简单 | ui、progress、toast、startup | 0 | 创建统一的启动进度 toast 句柄，供各启动阶段复用同一 UI 反馈通道。 |
| ensureStartupRuntimePreflight | 函数 | 358–382 | 简单 | startup、preflight、diagnostics、validation | 0 | 执行启动期运行时预检，收集环境、进程控制与启动配置问题并缓存诊断信息。 |
| ensureWorkflowRegistryAndMenu | 函数 | 780–812 | 简单 | workflow、menu、registry、startup | 0 | 确保工作流注册表已加载，并向 Zotero 菜单注入工作流入口菜单项。 |
| getRuntimeToolkit | 函数 | 715–740 | 简单 | utility、runtime、lazy-init、toolkit | 0 | 惰性获取并缓存运行时 toolkit，缺失时抛出带阶段信息的错误。 |
| hostBridgeCliStartupPromptMessage | 函数 | 591–622 | 简单 | host-bridge、i18n、prompt、cli | 0 | 构造 Host Bridge CLI 安装引导文案，区分缺失二进制与版本过旧两种情况。 |
| initializeSynthesisBuiltinTagsOnStartup | 函数 | 934–951 | 简单 | startup、synthesis、initialization、tags | 0 | 启动时确保 Synthesis 内置标签已写入插件状态存储，缺失则补齐。 |
| installOfficialWorkflowPackageWithProgress | 函数 | 437–465 | 简单 | workflow、installation、progress、error-handling | 0 | 在进度 toast 反馈下安装官方内置工作流包，失败时保留错误码与阶段信息。 |
| onMainWindowLoad | 函数 | 953–1031 | 中等 | lifecycle、window、startup、ui | 0 | 主窗口加载完成后注入面板、注册通知 observer 并准备侧边栏与 Dashboard 环境。 |
| onNotify | 函数 | 1279–1310 | 简单 | event-handler、notification、zotero、forwarding | 0 | 处理 Zotero 通知事件，过滤出与插件相关的前台通知并转发到内部通知中枢。 |
| onPrefsEvent | 函数 | 1335–1942 | 复杂 | event-handler、prefs、router、hot-reload、dispatch | 0 | 首选项变更总入口：按 pref key 分发到样式、通知、jobQueue、工作流、backend 等子系统的热更新处理。 |
| onShutdown | 函数 | 1170–1273 | 中等 | lifecycle、shutdown、cleanup、orchestration | 0 | 插件关闭流程：逐步停用运行时 owner、注销 observer 与菜单、释放 sidecar 与 bridge 资源。 |
| onStartup | 函数 | 814–932 | 中等 | lifecycle、entry-point、startup、orchestration | 0 | 插件启动主流程：完成预检、ztoolkit 初始化、样式注入、工作流注册表与菜单构建，并记录分阶段启动错误。 |
| promptOfficialWorkflowPackageUpdateOnStartup | 函数 | 467–570 | 中等 | startup、workflow、prompt、update | 0 | 启动时比对内置工作流包版本并在有新版本时提示用户更新，处理确认、跳过与失败分支。 |
| registerLibraryArtifactsNotifierObserver | 函数 | 1041–1074 | 简单 | event-handler、observer、lifecycle、zotero | 0 | 注册 Zotero 文献库产物通知 observer，驱动后续的集成刷新。 |
| registerZoteroPaneStylesheet | 函数 | 291–342 | 中等 | lifecycle、stylesheet、ui、startup | 0 | 向 Zotero 主窗口注入 zoteroPane.css 样式表并记录句柄，供卸载时移除。 |
| runShutdownStepWithTimeout | 函数 | 1111–1168 | 中等 | lifecycle、shutdown、timeout、diagnostics | 0 | 以超时上限执行单个关闭步骤，失败或超时都记录诊断而不阻塞其余清理。 |
| scheduleHostBridgeCliInstallPrompt | 函数 | 624–660 | 简单 | host-bridge、scheduling、prompt、startup | 0 | 在启动后择机提示安装 Host Bridge CLI，内置去重标记避免重复打扰。 |
| unregisterLibraryArtifactsNotifierObserver | 函数 | 1076–1096 | 简单 | lifecycle、cleanup、observer | 0 | 卸载文献库产物通知 observer，避免关闭插件后回调残留。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpSessionManager.ts](modules/acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunActions.ts](modules/acp/skillRun/acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunAuditTrail.ts](modules/acp/skillRun/acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpSkillRunStore.ts](modules/acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpWebSocketBridgeService.ts](modules/acp/transport/acpWebSocketBridgeService.ts.md) | src/modules/acp/transport/acpWebSocketBridgeService.ts | ACP WebSocket Bridge sidecar 服务：定位预编译桥接二进制并在本地拉起 WebSocket 端点，为浏览器侧后端提供替代进程内 NDJSON 的连接路径。 |
| [assistantExecutionDisplayPolicy.ts](modules/assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantWorkspaceSidebar.ts](modules/assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [backendManager.ts](modules/workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [citationGraphCrashJournal.ts](modules/synthesis/debug/citationGraphCrashJournal.ts.md) | src/modules/synthesis/debug/citationGraphCrashJournal.ts | Citation Graph 构建崩溃日志（crash journal）的读写模块：把构建期崩溃的诊断片段以有界 journal 形式落盘，供 System E2E 测试与 debug 模式回溯定位失败根因。 |
| [command.ts](platform/command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [contentPackageSubscription.ts](modules/workflow/catalog/contentPackageSubscription.ts.md) | src/modules/workflow/catalog/contentPackageSubscription.ts | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
| [dashboardHost.ts](modules/dashboardHost.ts.md) | src/modules/dashboardHost.ts | 任务 Dashboard 的宿主装配层：既支持在独立 Zotero 窗口中以 DialogHelper 打开，也支持挂载到外部传入的 embeddedRoot 容器，并把外部的选择动作转接给 Dashboard 运行时。 |
| [dashboardToolbarButton.ts](modules/dashboardToolbarButton.ts.md) | src/modules/dashboardToolbarButton.ts | Zotero 主窗口工具栏按钮的注入与维护模块，负责为 Dashboard、通用工作流和 SkillRunner 各自创建 XUL browser 按钮，并同步图标与待处理计数徽标。 |
| [debugMode.ts](modules/debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaultClient.ts](modules/synthesisClient/defaultClient.ts.md) | src/modules/synthesisClient/defaultClient.ts | 默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。 |
| [diagnosticVerbosity.ts](modules/diagnosticVerbosity.ts.md) | src/modules/diagnosticVerbosity.ts | 诊断日志的冗长输出开关，从运行时环境变量或测试 override 读取 verbose 标记，并提供统一的条件 console 输出入口。 |
| [docsUrl.ts](utils/docsUrl.ts.md) | src/utils/docsUrl.ts | 帮助中心文档链接构造：按用户 locale 选择 GitHub Pages 或本地站点基址，处理 zh-CN 前缀拼接与 debug 模式下的本地回退。 |
| [env.ts](platform/env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [feedbackSeam.ts](modules/workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [fileSystem.ts](utils/fileSystem.ts.md) | src/utils/fileSystem.ts | 在系统文件管理器中打开指定目录，优先使用 nsIFile 的 launch，退化到 reveal，并在路径为空或不存在时抛出明确错误。 |
| [helpCenterTab.ts](modules/helpCenterTab.ts.md) | src/modules/helpCenterTab.ts | 帮助中心标签页模块：在 Zotero 中创建内嵌 browser 标签页加载帮助页面，并通过向 frame 注入的 bridge 对象把在线文档打开、URL 跳转等能力暴露给页面。 |
| [hostBridgeCliInstaller.ts](modules/hostBridge/cli/hostBridgeCliInstaller.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstaller.ts | Host Bridge CLI 安装器：按平台从打包资产中解析预编译二进制，校验并落盘到运行时持久化目录，同时处理 Windows 命令解析差异。 |
| [hostBridgeCliInstallPrompt.ts](modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts | Host Bridge CLI 的安装提示流程：探测 CLI 是否可用、组装提示文案与用户交互入口，并驱动用户进入安装流程。 |
| [hostBridgePluginSkillBundle.ts](modules/hostBridge/cli/hostBridgePluginSkillBundle.ts.md) | src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts | 构建随插件分发的 Host Bridge agent skill 包：以 contracts/host-bridge/surfaces.json 为事实源生成 skill 内容，并用 SHA-256 摘要判断是否需要重新物化。 |
| [hostBridgeProfileStore.ts](modules/hostBridge/cli/hostBridgeProfileStore.ts.md) | src/modules/hostBridge/cli/hostBridgeProfileStore.ts | Host Bridge CLI 的 well-known profile 存储：按平台解析 profile 根目录，并把连接所需的 token、端口与主机信息写成 Agent 可发现的 profile 文件。 |
| [hostBridgeServer.ts](modules/hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [identity.ts](backends/identity.ts.md) | src/backends/identity.ts | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [index.ts](../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [itemObserver.ts](modules/synthesis/itemObserver.ts.md) | src/modules/synthesis/itemObserver.ts | 监听 Zotero 条目与子笔记变更，识别文献评分等 managed note 变更并发出 Synthesis 读模型失效通知。 |
| [libraryArtifactsColumn.ts](modules/libraryArtifactsColumn.ts.md) | src/modules/libraryArtifactsColumn.ts | 为 Zotero 文献库列表注册「文献产物」与「文献评分」两个虚拟列，负责单元格数据供给、渲染、缓存与防抖刷新。 |
| [locale.ts](utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [markdownAttachmentOpenProbe.ts](modules/markdownAttachmentOpenProbe.ts.md) | src/modules/markdownAttachmentOpenProbe.ts | Markdown 附件打开探针：拦截 Zotero 附件的双击/打开动作，识别出 Markdown 附件后转交给内置阅读器标签页。 |
| [modelCache.ts](providers/skillrunner/modelCache.ts.md) | src/providers/skillrunner/modelCache.ts | SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。 |
| [preferenceScript.ts](modules/preferenceScript.ts.md) | src/modules/preferenceScript.ts | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |
| [prefs.ts](utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [processControl.ts](platform/processControl.ts.md) | src/platform/processControl.ts | 子进程控制：启动、信号投递与终止回收策略，把 platform/command 的执行结果转成可取消、可等待的进程句柄。 |
| [registry.ts](backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [runtimeBridge.ts](utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimeCompatibility.ts](utils/runtimeCompatibility.ts.md) | src/utils/runtimeCompatibility.ts | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [runtimeFileRangeReader.ts](modules/runtimeFileRangeReader.ts.md) | src/modules/runtimeFileRangeReader.ts | 在 Zotero 沙箱中按字节区间读取大文件的读取器，配合 runtimeFileRangeProtocol 与 worker 实现分段读取，避免一次性载入造成内存峰值。 |
| [runtimeLogManager.ts](modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [runtimePersistenceGovernance.ts](modules/runtimePersistenceGovernance.ts.md) | src/modules/runtimePersistenceGovernance.ts | 运行时持久化治理：集中执行配额、保留期限与清理策略，串联 pluginStateStore、任务保留策略与 workflow 产品存储，控制插件落盘数据的增长。 |
| [selectionSample.ts](modules/workflow/ui/selectionSample.ts.md) | src/modules/workflow/ui/selectionSample.ts | 调试用选区采样工具：在 Zotero 菜单中注册「采样当前选区」入口，读取 Zotero SelectionContext 后写入临时文件，供工作流输入物化问题排查。 |
| [skillRunnerAsyncLifecycle.ts](modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts.md) | src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts | SkillRunner 异步子系统的统一停机编排：按固定顺序排空运行对话框、停止自动回复观察者与任务对账器、关闭会话同步并释放本地运行时租约，任一环节失败只记日志而不中断后续清理。 |
| [skillRunnerBackendHealthRegistry.ts](modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerBackendReachabilityCoordinator.ts](modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts | 后端可达性探测的调度协调器：周期性扫描已配置后端、通过 management client 发起轻量探针，并把判定为长期不可达的后端自动禁用并弹出提示 toast。 |
| [skillRunnerLocalDeployDebugDialog.ts](modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts | 本地运行时部署调试对话框：把调试日志条目渲染为可读列表，支持复制单条详情或整段控制台文本，便于排查一键部署失败。 |
| [skillRunnerLocalRuntimeManager.ts](modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [skillRunnerTaskReconciler.ts](modules/skillRunner/run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [syncRuntimeCleanup.ts](modules/synthesis/syncRuntimeCleanup.ts.md) | src/modules/synthesis/syncRuntimeCleanup.ts | Synthesis 同步运行期残留的清理入口：在 sidecar 生命周期结束或首选项关闭后清掉旧的同步临时目录，避免磁盘堆积。 |
| [synthesisProductionOwner.ts](modules/synthesis/production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisReverseHostHandlers.ts](modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |
| [synthesisWorkbenchTab.ts](modules/synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [taskRuntime.ts](modules/taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [webDavSyncPrefs.ts](modules/synthesis/webDavSyncPrefs.ts.md) | src/modules/synthesis/webDavSyncPrefs.ts | WebDAV 同步首选项的配置读写与状态投影：校验配置、暴露配置状态、执行连接测试并统一生成诊断信息。 |
| [workflowDebugProbe.ts](modules/workflow/ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowEditorHost.ts](modules/workflow/ui/workflowEditorHost.ts.md) | src/modules/workflow/ui/workflowEditorHost.ts | 工作流编辑器宿主：在 Zotero 窗口中打开内嵌 HTML 编辑器面板，承载工作流节点编辑，并把 legacy 文献产物负载通过迁移转换器升级为现行 schema。 |
| [workflowMenu.ts](modules/workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowPackageDiagnostics.ts](modules/workflow/catalog/workflowPackageDiagnostics.ts.md) | src/modules/workflow/catalog/workflowPackageDiagnostics.ts | 工作流包诊断通道：在 debug 模式或诊断详细级别下，把工作流运行时可用能力摘要与 hook 诊断信息写入 runtimeLog，并按诊断级别选择 console 通道输出。 |
| [workflowProductStore.ts](modules/workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |
| [workflowRuntime.ts](modules/workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowRuntimeBridge.ts](modules/workflow/catalog/workflowRuntimeBridge.ts.md) | src/modules/workflow/catalog/workflowRuntimeBridge.ts | 工作流运行时桥：向工作流包暴露一个极小的宿主能力面（appendRuntimeLog 与 showToast），同时写入 globalThis 与 addon 对象，供工作流包在无 import 权限下调用宿主。 |
| [workflowSubmissionQueue.ts](jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [workspaceTab.ts](modules/workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |
| [zoteroHostNativeMutations.ts](modules/zoteroHost/zoteroHostNativeMutations.ts.md) | src/modules/zoteroHost/zoteroHostNativeMutations.ts | Zotero 宿主原生 mutation 执行层：把已审批的写操作落到原生 transaction 与 Zotero API，覆盖元数据创建、附件写入等 canonical mutation 路径。 |
| [zoteroMcpServer.ts](modules/hostBridge/mcp/zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |
| [ztoolkit.ts](utils/ztoolkit.ts.md) | src/utils/ztoolkit.ts | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [addon.ts](addon.ts.md) | src/addon.ts | 插件基类：持有运行时数据（env、ztoolkit、locale、prefs、已加载工作流）、生命周期 hooks 集合与对外 api 容器。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureWorkflowRegistryAndMenu | 函数 | 780–812 | 确保工作流注册表已加载，并向 Zotero 菜单注入工作流入口菜单项。 |
| initializeSynthesisBuiltinTagsOnStartup | 函数 | 934–951 | 启动时确保 Synthesis 内置标签已写入插件状态存储，缺失则补齐。 |
| promptOfficialWorkflowPackageUpdateOnStartup | 函数 | 467–570 | 启动时比对内置工作流包版本并在有新版本时提示用户更新，处理确认、跳过与失败分支。 |
