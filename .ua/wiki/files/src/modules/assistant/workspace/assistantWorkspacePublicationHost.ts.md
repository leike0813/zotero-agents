
# src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/workspace](../../../../../modules/src/modules/assistant/workspace.md)
<!-- node: file:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts -->

发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。
源码：[src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts](../../../../../../../src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts)

## 符号（35）
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:acpChatWorkspaceSurfaceContext -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:activateSkillRunnerWorkspaceSurface -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:assistantWorkspaceAcpRuntimeConfiguration -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:assistantWorkspaceDiagnosticsReadinessDetail -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:assistantWorkspacePublicationMetricLabels -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:clearAcpChatBackendRefreshBoundary -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:clearAssistantWorkspaceInitPublicationState -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:clearAssistantWorkspaceReadyTabs -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:deactivateWorkspacePublicationRuntime -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:forceAssistantWorkspaceDiagnosticsPublication -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:hasPublishedChildBaselineInit -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:hasPublishedWorkspaceBaselineInit -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:inspectAssistantWorkspaceDiagnosticsPublication -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:inspectAssistantWorkspaceDiagnosticsPublicationLanes -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:inspectAssistantWorkspaceReplayPostSnapshotTimer -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:isPureAcpSkillRunBackgroundChange -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:markChildBaselineInitPublished -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:markWorkspaceBaselineInitPublished -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:postAssistantWorkspacePublicationConfiguration -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:postInitialSnapshotForActiveTab -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:postSnapshotForTab -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:preloadAcpChatBackendsForWorkspaceInit -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:publishAssistantWorkspaceStatePulse -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:readAssistantWorkspaceServiceStatus -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:recordWorkspacePublicationAck -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:recordWorkspacePublicationRenderObservation -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:registerWorkspacePublication -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:runAcpChatBackendRefreshBoundary -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:scheduleAcpChatBackendRefreshBoundary -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:scheduleAcpChatPublications -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:scheduleAcpSkillRunPublications -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:schedulePostSnapshot -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:scheduleSkillRunnerPublications -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:setAssistantWorkspaceExecutionDisplayMode -->
<!-- node: function:src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:transcriptRebasePageRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acpChatWorkspaceSurfaceContext | 函数 | 365–377 | 简单 | context、acp、chat、workspace | 0 | 解析当前 ACP Chat surface 上下文（owner 与 backend 范围）。 |
| activateSkillRunnerWorkspaceSurface | 函数 | 514–537 | 简单 | activation、skillrunner、publication、workspace | 0 | 激活 SkillRunner 工作区 surface 并触发首次快照发布。 |
| assistantWorkspaceAcpRuntimeConfiguration | 函数 | 608–615 | 简单 | configuration、acp、publication、runtime | 0 | 构造 ACP 运行时相关的发布配置（profiler 开关、schema 版本与采样参数）。 |
| assistantWorkspaceDiagnosticsReadinessDetail | 函数 | 1090–1114 | 简单 | diagnostics、readiness、publication、observability | 0 | 生成发布链路的就绪度明细，标注每个 lane 的首发完成情况。 |
| assistantWorkspacePublicationMetricLabels | 函数 | 346–363 | 简单 | metrics、labels、publication、diagnostics | 0 | 构造发布相关指标的标签集合，保持低基数以便基线可比。 |
| clearAcpChatBackendRefreshBoundary | 函数 | 488–495 | 简单 | cleanup、acp、chat、scheduling | 0 | 解除 ACP Chat 后端刷新边界，恢复常规刷新节奏。 |
| clearAssistantWorkspaceInitPublicationState | 函数 | 213–238 | 简单 | state-management、publication、reset、assistant | 0 | 重置工作区初始化发布状态，避免复用过期基线。 |
| clearAssistantWorkspaceReadyTabs | 函数 | 191–211 | 简单 | state-management、publication、reset、assistant | 0 | 清理已就绪的 tab 标记，强制下次切换走完整初始化。 |
| deactivateWorkspacePublicationRuntime | 函数 | 178–189 | 简单 | lifecycle、publication、cleanup、assistant | 0 | 停用当前工作区发布运行时，释放 owner 状态与订阅。 |
| forceAssistantWorkspaceDiagnosticsPublication | 函数 | 1161–1234 | 中等 | diagnostics、publication、debug、forcing | 0 | 强制触发一次诊断用发布，绕过常规去重与节流。 |
| hasPublishedChildBaselineInit | 函数 | 269–281 | 简单 | state-management、publication、guard、assistant | 1 | 查询子面板基线初始化是否已发布过。 |
| hasPublishedWorkspaceBaselineInit | 函数 | 240–250 | 简单 | state-management、publication、guard、assistant | 0 | 查询工作区基线初始化是否已发布过。 |
| inspectAssistantWorkspaceDiagnosticsPublication | 函数 | 1116–1159 | 简单 | diagnostics、publication、snapshot、observability | 0 | 汇总工作区发布诊断快照，供调试面板与 E2E 断言使用。 |
| inspectAssistantWorkspaceDiagnosticsPublicationLanes | 函数 | 1050–1088 | 简单 | diagnostics、publication、inspection、observability | 0 | 自检各发布 lane 的占用与排队情况，定位发布拥塞。 |
| inspectAssistantWorkspaceReplayPostSnapshotTimer | 函数 | 724–852 | 中等 | diagnostics、timer、publication、inspection | 0 | 自检快照重放定时器状态，用于诊断发布延迟来源。 |
| isPureAcpSkillRunBackgroundChange | 函数 | 116–127 | 简单 | filtering、acp、publication、optimization | 0 | 判定 skill run 变化是否纯后台（不触及任何可见区域），以跳过发布。 |
| markChildBaselineInitPublished | 函数 | 283–299 | 简单 | state-management、publication、assistant | 0 | 标记子面板基线初始化已发布。 |
| markWorkspaceBaselineInitPublished | 函数 | 252–267 | 简单 | state-management、publication、assistant | 0 | 标记工作区基线初始化已发布。 |
| postAssistantWorkspacePublicationConfiguration | 函数 | 617–627 | 简单 | publication、configuration、post-message、assistant | 0 | 向宿主投递发布相关的运行配置（schema 版本与开关）。 |
| postInitialSnapshotForActiveTab | 函数 | 629–640 | 简单 | publication、initialization、snapshot、assistant | 0 | 向当前活动 tab 投递初始快照，触发前端首屏渲染。 |
| postSnapshotForTab | 函数 | 539–593 | 中等 | publication、snapshot、post-message、assistant | 0 | 把当前快照投递到指定 tab，并附带发布序号供前端去重。 |
| preloadAcpChatBackendsForWorkspaceInit | 函数 | 455–474 | 简单 | prefetch、acp、chat、performance | 0 | 在工作区初始化期间预取 ACP Chat 后端列表，缩短首屏等待。 |
| publishAssistantWorkspaceStatePulse | 函数 | 642–698 | 中等 | publication、state、optimization、assistant | 0 | 发布一次轻量状态脉冲，只更新状态类区域而不重建 transcript。 |
| readAssistantWorkspaceServiceStatus | 函数 | 91–104 | 简单 | status、diagnostics、assistant、service | 0 | 读取工作区依赖服务（ACP、SkillRunner、sidecar）的可用状态。 |
| recordWorkspacePublicationAck | 函数 | 898–989 | 中等 | publication、ack、latency、diagnostics | 1 | 记录宿主对某次发布的回执，更新 ack 阶段与时延统计。 |
| recordWorkspacePublicationRenderObservation | 函数 | 991–1038 | 中等 | publication、rendering、observation、diagnostics | 1 | 记录前端渲染观测值，验证 DOM identity 不变量是否被破坏。 |
| registerWorkspacePublication | 函数 | 316–344 | 简单 | publication、registry、lifecycle、assistant | 0 | 注册一条工作区发布记录并纳入生命周期裁剪，防止无界增长。 |
| runAcpChatBackendRefreshBoundary | 函数 | 433–453 | 简单 | refresh、acp、chat、throttling | 0 | 在边界窗口内执行 ACP Chat 后端刷新，避免刷新风暴打断 transcript 渲染。 |
| scheduleAcpChatBackendRefreshBoundary | 函数 | 476–486 | 简单 | scheduling、acp、chat、throttling | 0 | 为 ACP Chat 后端刷新划定边界，避免刷新风暴打断 transcript。 |
| scheduleAcpChatPublications | 函数 | 406–423 | 简单 | scheduling、acp、chat、publication | 0 | 把 ACP Chat 快照变化合入发布调度队列。 |
| scheduleAcpSkillRunPublications | 函数 | 129–139 | 简单 | scheduling、acp、skill-run、publication | 1 | 把 skill run 快照变化合入发布调度队列。 |
| schedulePostSnapshot | 函数 | 710–722 | 简单 | scheduling、snapshot、publication、assistant | 0 | 把快照投递合入微任务/定时调度，避免同步连发。 |
| scheduleSkillRunnerPublications | 函数 | 145–155 | 简单 | scheduling、skillrunner、publication | 1 | 把 SkillRunner 快照变化合入发布调度队列。 |
| setAssistantWorkspaceExecutionDisplayMode | 函数 | 854–896 | 简单 | display-mode、presentation、assistant、settings | 0 | 切换工作区执行态的展示模式（紧凑/完整），仅影响非 transcript 区域。 |
| transcriptRebasePageRequest | 函数 | 157–176 | 简单 | transcript、pagination、rebase、assistant | 0 | 构造 transcript 重基分页请求，用于 owner 切换或数据变更后的游标重置。 |

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
| [assistantExecutionDisplayPolicy.ts](../publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantTranscriptRenderingPreference.ts](../publication/assistantTranscriptRenderingPreference.ts.md) | src/modules/assistant/publication/assistantTranscriptRenderingPreference.ts | transcript 分页虚拟化开关的读写封装，直接映射到插件首选项。 |
| [assistantWireContract.ts](../../../shared/assistantWireContract.ts.md) | src/shared/assistantWireContract.ts | Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。 |
| [assistantWorkspacePublication.ts](../publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspacePublicationLabels.ts](../publication/assistantWorkspacePublicationLabels.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts | 集中构建 Assistant Workspace 全部展示标签的文案表，避免各区域散落 i18n 键拼接。 |
| [assistantWorkspacePublicationRuntime.ts](../publication/assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [assistantWorkspaceSidebar.ts](assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [hostBridgeServer.ts](../../hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [sidebarBrowserHost.ts](../../sidebarBrowserHost.ts.md) | src/modules/sidebarBrowserHost.ts | Zotero 侧边栏内嵌页面的通用宿主构件：创建 browser/iframe 承载内容、提供外层容器并统一设置 flex 与尺寸样式，屏蔽 XUL 与 HTML 两种元素实现的差异。 |
| [skillRunnerRunDialog.ts](../../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerWorkspaceSurface.ts](../../skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceActionRouter.ts](assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspaceSidebar.ts](assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| acpChatWorkspaceSurfaceContext | 函数 | 365–377 | 解析当前 ACP Chat surface 上下文（owner 与 backend 范围）。 |
| assistantWorkspaceAcpRuntimeConfiguration | 函数 | 608–615 | 构造 ACP 运行时相关的发布配置（profiler 开关、schema 版本与采样参数）。 |
| assistantWorkspacePublicationMetricLabels | 函数 | 346–363 | 构造发布相关指标的标签集合，保持低基数以便基线可比。 |
| clearAcpChatBackendRefreshBoundary | 函数 | 488–495 | 解除 ACP Chat 后端刷新边界，恢复常规刷新节奏。 |
| clearAssistantWorkspaceInitPublicationState | 函数 | 213–238 | 重置工作区初始化发布状态，避免复用过期基线。 |
| clearAssistantWorkspaceReadyTabs | 函数 | 191–211 | 清理已就绪的 tab 标记，强制下次切换走完整初始化。 |
| deactivateWorkspacePublicationRuntime | 函数 | 178–189 | 停用当前工作区发布运行时，释放 owner 状态与订阅。 |
| forceAssistantWorkspaceDiagnosticsPublication | 函数 | 1161–1234 | 强制触发一次诊断用发布，绕过常规去重与节流。 |
| hasPublishedChildBaselineInit | 函数 | 269–281 | 查询子面板基线初始化是否已发布过。 |
| hasPublishedWorkspaceBaselineInit | 函数 | 240–250 | 查询工作区基线初始化是否已发布过。 |
| inspectAssistantWorkspaceDiagnosticsPublication | 函数 | 1116–1159 | 汇总工作区发布诊断快照，供调试面板与 E2E 断言使用。 |
| inspectAssistantWorkspaceDiagnosticsPublicationLanes | 函数 | 1050–1088 | 自检各发布 lane 的占用与排队情况，定位发布拥塞。 |
| inspectAssistantWorkspaceReplayPostSnapshotTimer | 函数 | 724–852 | 自检快照重放定时器状态，用于诊断发布延迟来源。 |
| isPureAcpSkillRunBackgroundChange | 函数 | 116–127 | 判定 skill run 变化是否纯后台（不触及任何可见区域），以跳过发布。 |
| markChildBaselineInitPublished | 函数 | 283–299 | 标记子面板基线初始化已发布。 |
| markWorkspaceBaselineInitPublished | 函数 | 252–267 | 标记工作区基线初始化已发布。 |
| postAssistantWorkspacePublicationConfiguration | 函数 | 617–627 | 向宿主投递发布相关的运行配置（schema 版本与开关）。 |
| postInitialSnapshotForActiveTab | 函数 | 629–640 | 向当前活动 tab 投递初始快照，触发前端首屏渲染。 |
| preloadAcpChatBackendsForWorkspaceInit | 函数 | 455–474 | 在工作区初始化期间预取 ACP Chat 后端列表，缩短首屏等待。 |
| publishAssistantWorkspaceStatePulse | 函数 | 642–698 | 发布一次轻量状态脉冲，只更新状态类区域而不重建 transcript。 |
| readAssistantWorkspaceServiceStatus | 函数 | 91–104 | 读取工作区依赖服务（ACP、SkillRunner、sidecar）的可用状态。 |
| recordWorkspacePublicationAck | 函数 | 898–989 | 记录宿主对某次发布的回执，更新 ack 阶段与时延统计。 |
| recordWorkspacePublicationRenderObservation | 函数 | 991–1038 | 记录前端渲染观测值，验证 DOM identity 不变量是否被破坏。 |
| registerWorkspacePublication | 函数 | 316–344 | 注册一条工作区发布记录并纳入生命周期裁剪，防止无界增长。 |
| scheduleAcpChatBackendRefreshBoundary | 函数 | 476–486 | 为 ACP Chat 后端刷新划定边界，避免刷新风暴打断 transcript。 |
| scheduleAcpChatPublications | 函数 | 406–423 | 把 ACP Chat 快照变化合入发布调度队列。 |
| scheduleAcpSkillRunPublications | 函数 | 129–139 | 把 skill run 快照变化合入发布调度队列。 |
| schedulePostSnapshot | 函数 | 710–722 | 把快照投递合入微任务/定时调度，避免同步连发。 |
| scheduleSkillRunnerPublications | 函数 | 145–155 | 把 SkillRunner 快照变化合入发布调度队列。 |
| setAssistantWorkspaceExecutionDisplayMode | 函数 | 854–896 | 切换工作区执行态的展示模式（紧凑/完整），仅影响非 transcript 区域。 |
| transcriptRebasePageRequest | 函数 | 157–176 | 构造 transcript 重基分页请求，用于 owner 切换或数据变更后的游标重置。 |
