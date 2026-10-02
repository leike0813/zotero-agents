
# src/modules/assistant/workspace/assistantWorkspaceSidebar.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/workspace](../../../../../modules/src/modules/assistant/workspace.md)
<!-- node: file:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts -->

侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。
源码：[src/modules/assistant/workspace/assistantWorkspaceSidebar.ts](../../../../../../../src/modules/assistant/workspace/assistantWorkspaceSidebar.ts)

## 符号（30）
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:activateTarget -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:attachSkillRunnerToShell -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:buildSidebarButton -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:closeAssistantWorkspaceSidebar -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:commitAssistantWorkspaceTarget -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:deactivateTarget -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:dockAssistantWorkspaceShell -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:ensureAssistantWorkspaceBaselineInit -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:ensureAssistantWorkspaceShell -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:getAssistantWorkspaceReplayState -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:handleAssistantWorkspaceMessage -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:handleShellAction -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:installAssistantWorkspaceSidebarShell -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:installMessageBridge -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:installShellBridge -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:isAssistantWorkspaceSidebarOpen -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:logAssistantShellAction -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:logAssistantWorkspaceDebug -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:maybeShowAcpSkillWaitingToasts -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:mountLibraryPane -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:mountReaderPane -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:openAssistantWorkspaceSidebar -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:postShellMessage -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:removeAssistantWorkspaceSidebarShell -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:resolveAssistantWorkspaceAuditLogLevel -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:resolveTargetFromSource -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:runShellHandshakeTick -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:runSkillRunnerSidebarRefresh -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:scheduleSkillRunnerSidebarRefresh -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:toggleAssistantWorkspaceSidebar -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| activateTarget | 函数 | 1479–1584 | 中等 | activation、sidebar、workspace、orchestration | 0 | 激活指定侧边栏目标：完成停靠、挂载内容、切换激活态并推送初始快照。 |
| attachSkillRunnerToShell | 函数 | 1237–1263 | 简单 | shell、mount、skillrunner、sidebar | 0 | 把 SkillRunner 面板挂载进 shell 容器并完成尺寸与可见性接管。 |
| buildSidebarButton | 函数 | 411–439 | 简单 | ui、sidebar、dom、factory | 0 | 构造侧边栏按钮元素并挂载点击回调与可访问性属性。 |
| closeAssistantWorkspaceSidebar | 函数 | 1993–2003 | 简单 | sidebar、close、ui、lifecycle | 0 | 关闭 Assistant Workspace 侧边栏并停用当前目标。 |
| commitAssistantWorkspaceTarget | 函数 | 1372–1394 | 简单 | state-management、sidebar、target、assistant | 0 | 提交当前激活目标记录，作为后续 owner 切换的锚点。 |
| deactivateTarget | 函数 | 505–533 | 简单 | lifecycle、sidebar、cleanup、assistant | 0 | 停用当前侧边栏目标，释放其 DOM 引用与事件订阅。 |
| dockAssistantWorkspaceShell | 函数 | 1328–1370 | 简单 | dock、ui、sidebar、workspace | 0 | 把工作区 shell 停靠到 Zotero 侧边栏，处理展开 library/reader 面板等前置动作。 |
| ensureAssistantWorkspaceBaselineInit | 函数 | 813–839 | 简单 | initialization、publication、assistant、guard | 0 | 确保工作区基线初始化已完成，必要时触发一次基线发布。 |
| ensureAssistantWorkspaceShell | 函数 | 1300–1326 | 简单 | lifecycle、shell、initialization、sidebar | 0 | 确保 shell 容器与握手状态就绪，必要时重建。 |
| getAssistantWorkspaceReplayState | 函数 | 2015–2027 | 简单 | diagnostics、state-export、sidebar、assistant | 0 | 导出侧边栏重放状态，供诊断与测试断言使用。 |
| handleAssistantWorkspaceMessage | 函数 | 977–1062 | 中等 | event-handler、message-handler、router、assistant | 0 | 侧边栏消息总入口：按消息类型分派到 shell 动作、快照刷新与诊断命令。 |
| handleShellAction | 函数 | 1201–1227 | 简单 | event-handler、shell、action-dispatch、sidebar | 0 | 把 shell 动作映射为具体的侧边栏交互（切换、停靠、关闭）。 |
| [installAssistantWorkspaceSidebarShell](../../../../../symbols/src/modules/assistant/workspace/assistantWorkspaceSidebar.ts/installAssistantWorkspaceSidebarShell.md) | 函数 | 1586–1915 | 复杂 | lifecycle、sidebar、shell、wiring、bootstrap | 1 | 安装 Assistant Workspace 侧边栏 shell 的完整流程：建 DOM、装桥、握手、挂载 library/reader 区域并接入 action 路由。 |
| installMessageBridge | 函数 | 931–975 | 简单 | bridge、message-handler、wiring、assistant | 0 | 安装宿主消息桥，解析外部消息并转交 action 处理器。 |
| installShellBridge | 函数 | 841–906 | 中等 | bridge、shell、wiring、lifecycle | 0 | 在 shell 窗口与插件之间安装双向桥：消息监听、握手与 target 登记。 |
| isAssistantWorkspaceSidebarOpen | 函数 | 2005–2013 | 简单 | sidebar、state-query、ui、assistant | 0 | 查询侧边栏当前是否处于打开状态。 |
| logAssistantShellAction | 函数 | 1064–1097 | 简单 | logging、audit、shell、assistant | 0 | 把 shell action 写入审计日志并附带 tab 与 owner 上下文。 |
| logAssistantWorkspaceDebug | 函数 | 297–322 | 简单 | logging、debug、assistant、diagnostics | 0 | 按级别输出 Assistant Workspace 调试日志，统一补齐上下文前缀。 |
| maybeShowAcpSkillWaitingToasts | 函数 | 463–496 | 简单 | ui、toast、acp、skill-run、throttling | 0 | 在 skill run 进入等待状态时按节流策略弹出提示 toast。 |
| mountLibraryPane | 函数 | 1396–1433 | 简单 | mount、ui、library、sidebar | 0 | 在 shell 中挂载 library 面板容器并绑定区域尺寸。 |
| mountReaderPane | 函数 | 1435–1477 | 简单 | mount、ui、reader、sidebar | 0 | 在 shell 中挂载 reader 面板容器并绑定区域尺寸。 |
| openAssistantWorkspaceSidebar | 函数 | 1951–1991 | 简单 | sidebar、open、ui、workspace | 1 | 打开 Assistant Workspace 侧边栏，必要时先安装 shell。 |
| postShellMessage | 函数 | 586–678 | 中等 | bridge、post-message、shell、assistant | 0 | 向 shell 侧发送消息，附带 envelope 与序号并处理投递失败。 |
| removeAssistantWorkspaceSidebarShell | 函数 | 1917–1949 | 简单 | lifecycle、cleanup、sidebar、teardown | 1 | 卸载侧边栏 shell：拆除监听、停止计时器、清空 bridge target 并释放 DOM。 |
| resolveAssistantWorkspaceAuditLogLevel | 函数 | 267–279 | 简单 | logging、configuration、assistant、diagnostics | 0 | 解析审计日志级别，未显式配置时按调试模式推导。 |
| resolveTargetFromSource | 函数 | 557–584 | 简单 | resolution、sidebar、target、assistant | 0 | 从 action 载荷解析出目标侧边栏条目，区分 library、reader 与工作区三类来源。 |
| runShellHandshakeTick | 函数 | 774–797 | 简单 | handshake、shell、heartbeat、bridge | 0 | 执行一次 shell 握手心跳，向前端确认桥接就绪并处理超时重试。 |
| runSkillRunnerSidebarRefresh | 函数 | 1133–1161 | 简单 | refresh、skillrunner、sidebar、concurrency | 0 | 执行一次 SkillRunner 侧边栏刷新，带世代号防止过期结果覆盖新状态。 |
| scheduleSkillRunnerSidebarRefresh | 函数 | 1163–1199 | 简单 | scheduling、skillrunner、throttling、sidebar | 0 | 按节流窗口调度 SkillRunner 侧边栏刷新。 |
| toggleAssistantWorkspaceSidebar | 函数 | 2029–2069 | 简单 | sidebar、toggle、ui、workspace | 0 | 切换侧边栏开合状态，串联打开与关闭路径。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatWorkspaceSurface.ts](../../acp/chat/acpChatWorkspaceSurface.ts.md) | src/modules/acp/chat/acpChatWorkspaceSurface.ts | ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。 |
| [acpRuntimePerformanceProfiler.ts](../../acp/diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpSessionManager.ts](../../acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunStore.ts](../../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceSelection.ts](../../acp/skillRun/acpSkillRunWorkspaceSelection.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |
| [acpSkillsWorkspaceSurface.ts](../../acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantActionContract.ts](../../../shared/assistantActionContract.ts.md) | src/shared/assistantActionContract.ts | Assistant Workspace 动作负载的编译期类型镜像：描述 shell/子页面与宿主之间每个 action 各自携带的 payload 字段，由 publication 侧的 drift guard 保证与运行时注册表同步。 |
| [assistantExecutionDisplayPolicy.ts](../publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantSidebarViewModel.ts](assistantSidebarViewModel.ts.md) | src/modules/assistant/workspace/assistantSidebarViewModel.ts | 侧边栏视图模型：构造 scope key 与 render hints，生成侧边栏快照并按区域剥离 transcript 数据以隔离重渲染。 |
| [assistantWireContract.ts](../../../shared/assistantWireContract.ts.md) | src/shared/assistantWireContract.ts | Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。 |
| [assistantWorkspaceActionRouter.ts](assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublication.ts](../publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspacePublicationCoordinator.ts](../publication/assistantWorkspacePublicationCoordinator.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts | 发布协调器：把 runtime 产出的发布请求按 owner 排队、去重与节流，并跟踪 ack 生命周期与 lane 占用。 |
| [assistantWorkspacePublicationHost.ts](assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspacePublicationLabels.ts](../publication/assistantWorkspacePublicationLabels.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts | 集中构建 Assistant Workspace 全部展示标签的文案表，避免各区域散落 i18n 键拼接。 |
| [assistantWorkspacePublicationRuntime.ts](../publication/assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [backendManager.ts](../../workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [dashboardActiveTasks.ts](../../dashboardActiveTasks.ts.md) | src/modules/dashboardActiveTasks.ts | Dashboard 活跃任务投影：按可见 scope 过滤 ACP skill run 与工作流任务，产出需要人工关注的任务计数。 |
| [dashboardToolbarButton.ts](../../dashboardToolbarButton.ts.md) | src/modules/dashboardToolbarButton.ts | Zotero 主窗口工具栏按钮的注入与维护模块，负责为 Dashboard、通用工作流和 SkillRunner 各自创建 XUL browser 按钮，并同步图标与待处理计数徽标。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [feedbackSeam.ts](../../workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [package.json](../../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [sidebarBrowserHost.ts](../../sidebarBrowserHost.ts.md) | src/modules/sidebarBrowserHost.ts | Zotero 侧边栏内嵌页面的通用宿主构件：创建 browser/iframe 承载内容、提供外层容器并统一设置 flex 与尺寸样式，屏蔽 XUL 与 HTML 两种元素实现的差异。 |
| [skillRunnerProviderStateMachine.ts](../../skillRunner/run/skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRunDialog.ts](../../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerWorkspaceSurface.ts](../../skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [workflowSubmissionQueue.ts](../../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayProductionPorts.ts](../../acp/diagnostics/acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpSkillRunForeground.ts](../../acp/skillRun/acpSkillRunForeground.ts.md) | src/modules/acp/skillRun/acpSkillRunForeground.ts | 把指定 skill run 拉到前台：按执行模式选择 run、更新记录中的前台标记，并打开 Assistant Workspace 侧边栏。 |
| [assistantWorkspaceActionRouter.ts](assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublicationHost.ts](assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [markdownAttachmentTab.ts](../../markdownAttachmentTab.ts.md) | src/modules/markdownAttachmentTab.ts | Markdown 附件阅读器标签页的完整实现：在 Zotero 标签中创建内嵌 browser 加载共享阅读器页面，把文档内容通过 bridge 注入，并在页面脚本加载失败时回退到内联独立 HTML。 |
| [productionExecution.ts](../../workflow/productionExecution.ts.md) | src/modules/workflow/productionExecution.ts | 工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。 |
| [workspaceTab.ts](../../workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| closeAssistantWorkspaceSidebar | 函数 | 1993–2003 | 关闭 Assistant Workspace 侧边栏并停用当前目标。 |
| getAssistantWorkspaceReplayState | 函数 | 2015–2027 | 导出侧边栏重放状态，供诊断与测试断言使用。 |
| [installAssistantWorkspaceSidebarShell](../../../../../symbols/src/modules/assistant/workspace/assistantWorkspaceSidebar.ts/installAssistantWorkspaceSidebarShell.md) | 函数 | 1586–1915 | 安装 Assistant Workspace 侧边栏 shell 的完整流程：建 DOM、装桥、握手、挂载 library/reader 区域并接入 action 路由。 |
| isAssistantWorkspaceSidebarOpen | 函数 | 2005–2013 | 查询侧边栏当前是否处于打开状态。 |
| openAssistantWorkspaceSidebar | 函数 | 1951–1991 | 打开 Assistant Workspace 侧边栏，必要时先安装 shell。 |
| removeAssistantWorkspaceSidebarShell | 函数 | 1917–1949 | 卸载侧边栏 shell：拆除监听、停止计时器、清空 bridge target 并释放 DOM。 |
| resolveAssistantWorkspaceAuditLogLevel | 函数 | 267–279 | 解析审计日志级别，未显式配置时按调试模式推导。 |
| toggleAssistantWorkspaceSidebar | 函数 | 2029–2069 | 切换侧边栏开合状态，串联打开与关闭路径。 |
