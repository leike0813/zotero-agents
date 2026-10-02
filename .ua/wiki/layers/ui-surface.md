
# 页面与交互界面

宿主内嵌页面的渲染与交互：Dashboard、Synthesis 工作台与侧边栏 Assistant Workspace 的 Preact 区域与 controller、Zotero tab/工具栏/首选项等宿主 UI 构件、只读 Harness 页面，以及 src/shared 的跨边界 wire 契约与区域 memoization 工具。
> 本页由知识图谱分层 `layer:ui-surface` 生成，共 162 个文件级节点。

## 目录分布

| 目录 | 文件数 |
| --- | --- |
| [src/shared](../modules/src/shared.md) | 21 |
| [src/sidebar/components](../modules/src/sidebar/components.md) | 16 |
| [src/modules](../modules/src/modules.md) | 13 |
| [src/dashboard/components](../modules/src/dashboard/components.md) | 12 |
| [src/modules/harness](../modules/src/modules/harness.md) | 12 |
| [src/synthesis/components](../modules/src/synthesis/components.md) | 11 |
| [src/modules/assistant/publication](../modules/src/modules/assistant/publication.md) | 10 |
| [src/sidebar](../modules/src/sidebar.md) | 10 |
| [src/synthesis](../modules/src/synthesis.md) | 10 |
| [src/synthesis/components/reader](../modules/src/synthesis/components/reader.md) | 10 |
| [src/dashboard](../modules/src/dashboard.md) | 9 |
| [src/modules/assistant/workspace](../modules/src/modules/assistant/workspace.md) | 6 |
| [src/synthesis/components/registry](../modules/src/synthesis/components/registry.md) | 6 |
| [src/synthesis/components/reviewCenter](../modules/src/synthesis/components/reviewCenter.md) | 5 |
| [src/modules/dashboard](../modules/src/modules/dashboard.md) | 4 |
| [src](../modules/src.md) | 3 |
| [src/synthesis/components/graph](../modules/src/synthesis/components/graph.md) | 3 |
| [src/modules/preferences](../modules/src/modules/preferences.md) | 1 |

## 关键符号

本层中被其他节点引用较多、值得单独成页的符号。

| 符号 | 类型 | 复杂度 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- |
| [equalBySignature](../symbols/src/shared/regionEquality.ts/equalBySignature.md) | 函数 | 中等 | 25 | 按签名判定两个区域 selection 是否等价，为同引用、null 合并与同类型原值提供与 stringify 等价的快路径。 |
| [stableRegionSignature](../symbols/src/shared/regionEquality.ts/stableRegionSignature.md) | 函数 | 简单 | 5 | 为区域 selection 生成稳定字符串签名，序列化失败时降级为安全文本。 |
| [closeConceptBubble](../symbols/src/synthesis/components/reader/conceptOverlay.ts/closeConceptBubble.md) | 函数 | 简单 | 5 | 关闭并清理当前概念 hover 气泡及其定时器。 |
| [createSynthesisClientFromPort](../symbols/globals.md) | 函数 | 复杂 | 3 | 从 Port 构造完整 Synthesis 客户端：逐个实现 topic、artifact、concept、tag、reference、graph、sync 与 capability 方法，每个方法都做入参重建与结果归一化。 |
| [renderMarkdownIsland](../symbols/src/synthesis/components/reader/markdownIsland.ts/renderMarkdownIsland.md) | 函数 | 复杂 | 3 | markdown island 渲染入口：调用共享渲染器、缺渲染器时降级为纯文本，并附加概念、shortcode 与 digest 增强。 |
| [renderTopicTimeline](../symbols/src/shared/topicTimelineRenderer.ts/renderTopicTimeline.md) | 函数 | 复杂 | 2 | 时间线渲染入口：组装摘要、轴、聚类与事件轨道，返回可直接挂载的根节点。 |
| [reportCitationGraphCrashJournalPhase](../symbols/src/synthesis/components/citationGraphCrashReporter.ts/reportCitationGraphCrashJournalPhase.md) | 函数 | 简单 | 2 | 把图生命周期阶段转发给宿主注入的崩溃日志 bridge，是否保留由插件侧 recorder 决定。 |
| [narrowGraphSurfaceView](../symbols/src/synthesis/components/graph/graphModel.ts/narrowGraphSurfaceView.md) | 函数 | 复杂 | 2 | 把整个图表面 wire 槽位收窄为节点、边、过滤、窗口与诊断的组合视图。 |
| [evidenceForRef](../symbols/src/synthesis/components/reader/narrowing.ts/evidenceForRef.md) | 函数 | 中等 | 2 | 按 ref 变体集合在证据集合中定位匹配行，是引用反向链接的查找基础。 |
| [narrowTopicDetail](../symbols/src/synthesis/components/reader/narrowing.ts/narrowTopicDetail.md) | 函数 | 复杂 | 2 | 收窄整个 topic detail 载荷，产出 Reader 区域消费的全部分区投影。 |
| [RegistryActionButton](../symbols/src/synthesis/components/registry/controls.tsx/RegistryActionButton.md) | 函数 | 中等 | 2 | 动作按钮：处理 pending、禁用原因提示与点击派发。 |
| [ReviewCenterRegion](../symbols/src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx/ReviewCenterRegion.md) | 函数 | 复杂 | 2 | 审阅中心主区域：按 tab 装配工具栏与各类审阅表格，维护选择与批量操作状态。 |
| [useWindowedRows](../symbols/src/synthesis/components/windowedRows.tsx/useWindowedRows.md) | 函数 | 复杂 | 2 | 窗口化行 hook：监听容器滚动与尺寸变化，输出可见区间、偏移与总高度。 |
| [CitationGraphIsland](../symbols/src/synthesis/components/graph/sigmaIsland.ts/CitationGraphIsland.md) | 类 | 复杂 | 1 | 命令式 Sigma island：持有 graphology 模型与渲染器，按签名 diff 选择仅交互/增量合并/完整重建三条更新路径，并暴露选择、悬停、缩放与邻域展开接口。 |
| [mergePatch](../symbols/globals.md) | 函数 | 复杂 | 1 | 把一页 patch 合并进窗口：追加节点与边、更新 nextCursor 与 hasMore，并强制节点/边软上限。 |
| [renderTimelineClusters](../symbols/src/shared/topicTimelineRenderer.ts/renderTimelineClusters.md) | 函数 | 复杂 | 1 | 渲染按年份聚类的论文标记组，处理标签碰撞、密集年份与当前文献钉标。 |
| [projectAssistantWorkspacePanel](../symbols/src/sidebar/assistantPanelModel.js/projectAssistantWorkspacePanel.md) | 函数 | 复杂 | 1 | 面板投影总入口：把 ACP Chat / ACP Skills / SkillRunner 的原始 snapshot 归一化为各区域可直接消费的统一面板 DTO。 |
| [buildSyncLogLines](../symbols/src/synthesis/components/HomeRegion.tsx/buildSyncLogLines.md) | 函数 | 复杂 | 1 | 把同步诊断与操作日志整理为可读的时间线文本行。 |
| [projectSynthesisWorkbenchHomeSelection](../symbols/src/synthesis/components/HomeRegion.tsx/projectSynthesisWorkbenchHomeSelection.md) | 函数 | 复杂 | 1 | 由 wire 快照投影 Home 区域的完整 selection：洞察卡片、同步面板与热门主题网格。 |
| [SyncConflictPanel](../symbols/src/synthesis/components/HomeRegion.tsx/SyncConflictPanel.md) | 函数 | 复杂 | 1 | 渲染 WebDAV 冲突审阅面板，展示冲突资产的本地/远端哈希并提交解决动作。 |

## 文件清单

| 文件 | 类型 | 语言 | 摘要 |
| --- | --- | --- | --- |
| [src/dashboard/backendManagerApp.ts](../files/src/dashboard/backendManagerApp.ts.md) | 文件 | — | 后端管理对话框页面的 controller 与引导入口：持有宿主 postMessage 通道，把 BackendManagerSnapshot 投影成草稿与视图，并按"文本编辑不重渲染、结构编辑才重渲染"的规则驱动区域刷新。 |
| [src/dashboard/backendManagerRenderer.ts](../files/src/dashboard/backendManagerRenderer.ts.md) | 文件 | — | 后端管理对话框的 chrome renderer：在页面根容器下建立 header/body/footer 与两个预设对话框共五个 managed mount，每个 mount 挂独立 Preact root，使单个区域重渲染不会清空兄弟区域。 |
| [src/dashboard/components/AcpTraceReplayRegion.tsx](../files/src/dashboard/components/AcpTraceReplayRegion.tsx.md) | 文件 | — | Dashboard 的 ACP Trace & Replay 面板（Preact 区域）：上半部是语义 trace 录制器的源/限额配置与 arm-finish-cancel-save 生命周期，下半部是 replay profiler 的 trace 路径预检、阶段与节奏草稿、3×3 实测矩阵槽位及证据详情。 |
| [src/dashboard/components/BackendManagerRegion.tsx](../files/src/dashboard/components/BackendManagerRegion.tsx.md) | 文件 | — | 后端管理对话框的全部 Preact 区域组件：header/body/footer 主体区域加上 ACP 与通用 HTTP 两个预设对话框，负责后端行的命令、token、参数与环境变量编辑，以及 provider 预设的生成与落盘。 |
| [src/dashboard/components/BackendRegion.tsx](../files/src/dashboard/components/BackendRegion.tsx.md) | 文件 | — | Dashboard 的 Backend 面板：把旧实现中三套按后端类型分支的渲染器（generic / SkillRunner / ACP）合并为一个参数化区域，共享同一套任务表外壳，并附通用后端的绑定日志区与 SkillRunner 管理子视图。 |
| [src/dashboard/components/HomeRegion.tsx](../files/src/dashboard/components/HomeRegion.tsx.md) | 文件 | — | Dashboard 的 Home 面板：工作流气泡卡片、汇总统计、运行中任务表，以及点开某个工作流后的文档阅读视图，全部文案由 panel model 预先解析。 |
| [src/dashboard/components/MigrationsRegion.tsx](../files/src/dashboard/components/MigrationsRegion.tsx.md) | 文件 | — | Dashboard 的文献资产迁移面板：只读呈现 Dashboard-local 迁移 service 持有的扫描/应用/停止/继续生命周期，展示候选文献事实、决策、诊断与恢复提示，并提供复制诊断包。 |
| [src/dashboard/components/ProductsRegion.tsx](../files/src/dashboard/components/ProductsRegion.tsx.md) | 文件 | — | Dashboard 的产物（Products）面板：产物与 Skill 反馈分栏切换、可展开的产物文件树、代码/Markdown 预览（highlight.js 高亮 + 共享 Markdown renderer）以及反馈选择工具栏。 |
| [src/dashboard/components/RuntimeLogsRegion.tsx](../files/src/dashboard/components/RuntimeLogsRegion.tsx.md) | 文件 | — | Dashboard 的 Runtime Logs 面板：日志级别复选、后端/工作流多选下拉、诊断模式开关、上下文范围 chips、预算行、复制与清空操作，以及带详情面板的日志表。 |
| [src/dashboard/components/SkillrunnerAuditRegion.tsx](../files/src/dashboard/components/SkillrunnerAuditRegion.tsx.md) | 文件 | — | Dashboard 的 SkillRunner 连接审计面板（只读）：呈现 governor 指标卡、各维度计数条与近期事件表；唯一的交互是复制 JSON，由集成层通过 onCopyJson 回调完成，不产生任何 wire 动作。 |
| [src/dashboard/components/SynthesisSidecarRegion.tsx](../files/src/dashboard/components/SynthesisSidecarRegion.tsx.md) | 文件 | — | Dashboard 的 Synthesis Sidecar trace 面板：汇总卡、trace 搜索过滤、命令式 trace 表 island，以及因果 trace 详情面板（span 树 + 复制）。所有筛选与选中状态都是页面本地 UI state，不产生宿主往返。 |
| [src/dashboard/components/TabBarRegion.tsx](../files/src/dashboard/components/TabBarRegion.tsx.md) | 文件 | — | Dashboard 侧边栏标签条：按 system 与 backend 两个分组渲染标签项，展示不可用原因与不可用标签，并把点击回传为 onSelectTab。 |
| [src/dashboard/components/WorkflowOptionsRegion.tsx](../files/src/dashboard/components/WorkflowOptionsRegion.tsx.md) | 文件 | — | Dashboard 的工作流选项面板：内联工作流设置表单引擎，按 schema 渲染分区与字段，支持自定义 select、布尔开关、数值校验与 provider 条件字段的可见性判定。 |
| [src/dashboard/components/WorkflowSettingsDialogRegion.tsx](../files/src/dashboard/components/WorkflowSettingsDialogRegion.tsx.md) | 文件 | — | 独立的工作流设置对话框区域：复用 WorkflowOptionsRegion 的共享表单引擎渲染 schema 字段，并额外提供执行单元预览与宿主队列选项两张卡片。 |
| [src/dashboard/dashboardApp.ts](../files/src/dashboard/dashboardApp.ts.md) | 文件 | — | Dashboard 页面入口：负责引导启动、与宿主建立 postMessage 通道、发送 action，并把 DashboardSnapshot 投影为面板 DTO 后交给 chrome renderer 渲染。 |
| [src/dashboard/dashboardChromeRenderer.ts](../files/src/dashboard/dashboardChromeRenderer.ts.md) | 文件 | — | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |
| [src/dashboard/dashboardDomUtils.ts](../files/src/dashboard/dashboardDomUtils.ts.md) | 文件 | — | Dashboard 页面侧的 DOM 与格式化工具集：时间/字节格式化、HTML 转义、状态与日志级别的 badge class 映射、toast 提示与剪贴板复制；刻意不含任何区域语义，由 panel model 组合成视图数据。 |
| [src/dashboard/dashboardLabels.ts](../files/src/dashboard/dashboardLabels.ts.md) | 文件 | — | Dashboard 页面的宿主标签解析器：宿主标签优先，其次显式 fallback，最后回退到 key 本身；未解析的裸 task-dashboard-* key 视为未翻译。 |
| [src/dashboard/dashboardPanelModel.ts](../files/src/dashboard/dashboardPanelModel.ts.md) | 文件 | — | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |
| [src/dashboard/dashboardTypes.ts](../files/src/dashboard/dashboardTypes.ts.md) | 文件 | — | Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。 |
| [src/dashboard/workflowSettingsDialogApp.ts](../files/src/dashboard/workflowSettingsDialogApp.ts.md) | 文件 | — | 独立工作流设置对话框的页面入口：建立 workflow-settings-dialog postMessage 通道，接收宿主快照后投影为 selection 并交给对话框区域渲染。 |
| [src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts](../files/src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts.md) | 文件 | — | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [src/modules/assistant/publication/assistantMessageCounts.ts](../files/src/modules/assistant/publication/assistantMessageCounts.ts.md) | 文件 | — | Assistant 消息计数工具：创建、规整与克隆消息计数三元组，并提供执行开始/结束与逐条自增的计数维护入口。 |
| [src/modules/assistant/publication/assistantTranscriptMirrorStore.ts](../files/src/modules/assistant/publication/assistantTranscriptMirrorStore.ts.md) | 文件 | — | Assistant Workspace 的 transcript 镜像仓库：按 owner 维护镜像条目、合并流式事件，并管理冷镜像 LRU 与后台水合。 |
| [src/modules/assistant/publication/assistantTranscriptPageProjection.ts](../files/src/modules/assistant/publication/assistantTranscriptPageProjection.ts.md) | 文件 | — | Assistant transcript 分页投影：把镜像条目过滤为 UI 可见的一页，保持分页条数与游标语义稳定。 |
| [src/modules/assistant/publication/assistantTranscriptRenderingPreference.ts](../files/src/modules/assistant/publication/assistantTranscriptRenderingPreference.ts.md) | 文件 | — | transcript 分页虚拟化开关的读写封装，直接映射到插件首选项。 |
| [src/modules/assistant/publication/assistantWorkspacePublication.ts](../files/src/modules/assistant/publication/assistantWorkspacePublication.ts.md) | 文件 | — | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts](../files/src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts.md) | 文件 | — | 发布协调器：把 runtime 产出的发布请求按 owner 排队、去重与节流，并跟踪 ack 生命周期与 lane 占用。 |
| [src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts](../files/src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts.md) | 文件 | — | 集中构建 Assistant Workspace 全部展示标签的文案表，避免各区域散落 i18n 键拼接。 |
| [src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts](../files/src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts.md) | 文件 | — | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts](../files/src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts.md) | 文件 | — | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [src/modules/assistant/workspace/assistantPanelLabels.ts](../files/src/modules/assistant/workspace/assistantPanelLabels.ts.md) | 文件 | — | Assistant 面板标签文案表：集中声明各面板标题、按钮、空态与错误提示的本地化文本。 |
| [src/modules/assistant/workspace/assistantSidebarViewModel.ts](../files/src/modules/assistant/workspace/assistantSidebarViewModel.ts.md) | 文件 | — | 侧边栏视图模型：构造 scope key 与 render hints，生成侧边栏快照并按区域剥离 transcript 数据以隔离重渲染。 |
| [src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts](../files/src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts.md) | 文件 | — | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts](../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | 文件 | — | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [src/modules/assistant/workspace/assistantWorkspaceSidebar.ts](../files/src/modules/assistant/workspace/assistantWorkspaceSidebar.ts.md) | 文件 | — | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts](../files/src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts.md) | 文件 | — | 工作区 surface 骨架：提供 change kind 映射、owner 区域读取、owner 控件构造与排队导航条目列表等跨 domain 共用的最小 surface 能力。 |
| [src/modules/dashboard/dashboardActions.ts](../files/src/modules/dashboard/dashboardActions.ts.md) | 文件 | — | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [src/modules/dashboard/dashboardFrame.ts](../files/src/modules/dashboard/dashboardFrame.ts.md) | 文件 | — | Dashboard 页面框架 owner：创建 content browser 与 frame，登记挂载句柄并在卸载时移除 frame。 |
| [src/modules/dashboard/dashboardRuntime.ts](../files/src/modules/dashboard/dashboardRuntime.ts.md) | 文件 | — | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [src/modules/dashboard/dashboardSnapshot.ts](../files/src/modules/dashboard/dashboardSnapshot.ts.md) | 文件 | — | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [src/modules/dashboardActiveTasks.ts](../files/src/modules/dashboardActiveTasks.ts.md) | 文件 | — | Dashboard 活跃任务投影：按可见 scope 过滤 ACP skill run 与工作流任务，产出需要人工关注的任务计数。 |
| [src/modules/dashboardHost.ts](../files/src/modules/dashboardHost.ts.md) | 文件 | — | 任务 Dashboard 的宿主装配层：既支持在独立 Zotero 窗口中以 DialogHelper 打开，也支持挂载到外部传入的 embeddedRoot 容器，并把外部的选择动作转接给 Dashboard 运行时。 |
| [src/modules/dashboardToolbarButton.ts](../files/src/modules/dashboardToolbarButton.ts.md) | 文件 | — | Zotero 主窗口工具栏按钮的注入与维护模块，负责为 Dashboard、通用工作流和 SkillRunner 各自创建 XUL browser 按钮，并同步图标与待处理计数徽标。 |
| [src/modules/harness/assistantReadonlyPublication.ts](../files/src/modules/harness/assistantReadonlyPublication.ts.md) | 文件 | — | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [src/modules/harness/backendsReadonly.ts](../files/src/modules/harness/backendsReadonly.ts.md) | 文件 | — | 后端只读快照：从 prefs 读取 backends 配置并归一化为 Harness 专用形状，不做任何 id 重映射或引用同步。 |
| [src/modules/harness/dashboardReadonlyModel.ts](../files/src/modules/harness/dashboardReadonlyModel.ts.md) | 文件 | — | Dashboard 只读视图模型：聚合后端、任务历史、SkillRunner run 与工作流产品资产，产出各 surface 的行数据与签名，供 Harness Dashboard 渲染。 |
| [src/modules/harness/env.ts](../files/src/modules/harness/env.ts.md) | 文件 | — | Harness 环境变量解析器：只接受白名单内的三个路径变量，正确处理行内注释、引号与 export 前缀。 |
| [src/modules/harness/pluginStateReadonly.ts](../files/src/modules/harness/pluginStateReadonly.ts.md) | 文件 | — | 插件状态只读存储：以只读方式打开插件 SQLite 库，把 run、任务、请求与上下文表归一化为 Harness 可查询的行集合。 |
| [src/modules/harness/prefsReadonly.ts](../files/src/modules/harness/prefsReadonly.ts.md) | 文件 | — | 只读测试 Harness 中解析 Zotero prefs.js 的实现，按行解析 user prefs 与默认 prefs 并提供只读键值存储视图，供 UI Harness 在脱离 Zotero 宿主时读取插件首选项。 |
| [src/modules/harness/skillRunnerReadonlyProjection.ts](../files/src/modules/harness/skillRunnerReadonlyProjection.ts.md) | 文件 | — | SkillRunner 只读投影：把插件状态中的 run 记录与 sequence 状态投影成 Harness 可见的运行列表，附带状态语义与技能显示名。 |
| [src/modules/harness/sqliteReadonly.ts](../files/src/modules/harness/sqliteReadonly.ts.md) | 文件 | — | Harness 侧只读 SQLite 访问层：以 readOnly 模式打开 zoteroDB/plugin 数据文件，必要时先拷贝到临时目录，并提供符合 synthesis-repository `SqlAdapter` 契约的适配器。 |
| [src/modules/harness/synthesisReadonlyClient.ts](../files/src/modules/harness/synthesisReadonlyClient.ts.md) | 文件 | — | 组装 Harness 只读 Synthesis 客户端：安装只读 Zotero 宿主 mock，打开 zoteroDB/pluginDB，并把只读 Port 接到统一的 clientPortAdapter 上。 |
| [src/modules/harness/synthesisReadonlyPort.ts](../files/src/modules/harness/synthesisReadonlyPort.ts.md) | 文件 | — | Harness 只读 Synthesis Port 的核心实现：直接查询只读 SQLite，把 topic、concept、tag、review、citation graph 等工作台 Surface 投影为固定上限的内存结果，使 UI 能在无 sidecar 时渲染。 |
| [src/modules/harness/synthesisWorkbenchI18nEnvelope.ts](../files/src/modules/harness/synthesisWorkbenchI18nEnvelope.ts.md) | 文件 | — | 为只读 Harness 解析 locale 并读取 FTL 资源，构建与正式工作台一致的 i18n envelope，使 Harness 页面复用同一套文案键。 |
| [src/modules/harness/zoteroReadonlyLibraryAdapter.ts](../files/src/modules/harness/zoteroReadonlyLibraryAdapter.ts.md) | 文件 | — | 只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。 |
| [src/modules/helpCenterTab.ts](../files/src/modules/helpCenterTab.ts.md) | 文件 | — | 帮助中心标签页模块：在 Zotero 中创建内嵌 browser 标签页加载帮助页面，并通过向 frame 注入的 bridge 对象把在线文档打开、URL 跳转等能力暴露给页面。 |
| [src/modules/libraryArtifactsColumn.ts](../files/src/modules/libraryArtifactsColumn.ts.md) | 文件 | — | 为 Zotero 文献库列表注册「文献产物」与「文献评分」两个虚拟列，负责单元格数据供给、渲染、缓存与防抖刷新。 |
| [src/modules/markdownAttachmentOpenProbe.ts](../files/src/modules/markdownAttachmentOpenProbe.ts.md) | 文件 | — | Markdown 附件打开探针：拦截 Zotero 附件的双击/打开动作，识别出 Markdown 附件后转交给内置阅读器标签页。 |
| [src/modules/markdownAttachmentTab.ts](../files/src/modules/markdownAttachmentTab.ts.md) | 文件 | — | Markdown 附件阅读器标签页的完整实现：在 Zotero 标签中创建内嵌 browser 加载共享阅读器页面，把文档内容通过 bridge 注入，并在页面脚本加载失败时回退到内联独立 HTML。 |
| [src/modules/preferences/skillRunnerLocalRuntimePreferences.ts](../files/src/modules/preferences/skillRunnerLocalRuntimePreferences.ts.md) | 文件 | — | SkillRunner 本地运行时相关的偏好面板绑定，负责安装目录、版本、自动拉取与自动拉起等设置的读写与即时生效。 |
| [src/modules/preferenceScript.ts](../files/src/modules/preferenceScript.ts.md) | 文件 | — | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |
| [src/modules/sidebarBrowserHost.ts](../files/src/modules/sidebarBrowserHost.ts.md) | 文件 | — | Zotero 侧边栏内嵌页面的通用宿主构件：创建 browser/iframe 承载内容、提供外层容器并统一设置 flex 与尺寸样式，屏蔽 XUL 与 HTML 两种元素实现的差异。 |
| [src/modules/taskDashboardHistory.ts](../files/src/modules/taskDashboardHistory.ts.md) | 文件 | — | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [src/modules/taskDashboardSnapshot.ts](../files/src/modules/taskDashboardSnapshot.ts.md) | 文件 | — | Dashboard 快照的数据装配层：归一化后端实例、合并活动任务与历史任务行、把工作流提交队列中的排队单元投影为 Dashboard 行，并生成后端标签页键。 |
| [src/modules/workspaceTab.ts](../files/src/modules/workspaceTab.ts.md) | 文件 | — | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |
| [src/modules/workspaceToolbarTaskPopover.ts](../files/src/modules/workspaceToolbarTaskPopover.ts.md) | 文件 | — | Zotero 主窗口工具栏的任务气泡：用 XUL 元素实现悬停/点击展开的任务列表弹层，按状态渲染 LED 色调、显示可见任务行并支持直接打开对应工作台。 |
| [src/shared/acpToolCallDisplay.ts](../files/src/shared/acpToolCallDisplay.ts.md) | 文件 | — | ACP 工具调用的展示投影：把各后端异构的 tool call 载荷规整为统一的标题、状态、摘要与兼容性展示信息。 |
| [src/shared/assistantActionContract.ts](../files/src/shared/assistantActionContract.ts.md) | 文件 | — | Assistant Workspace 动作负载的编译期类型镜像：描述 shell/子页面与宿主之间每个 action 各自携带的 payload 字段，由 publication 侧的 drift guard 保证与运行时注册表同步。 |
| [src/shared/assistantInteractionContract.ts](../files/src/shared/assistantInteractionContract.ts.md) | 文件 | — | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [src/shared/assistantWireContract.ts](../files/src/shared/assistantWireContract.ts.md) | 文件 | — | Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。 |
| [src/shared/citationGraphStandalone.css](../files/src/shared/citationGraphStandalone.css.md) | 文件 | — | 独立 Citation Graph 入口页的样式表，定义图谱容器、工具栏、图例与响应式布局。 |
| [src/shared/citationGraphStandalone.ts](../files/src/shared/citationGraphStandalone.ts.md) | 文件 | — | 独立 Citation Graph 视图：不依赖 Sigma，直接用 SVG 渲染引用图谱，含外壳、空态、分位式布局投影、节点/边配色与重要性光晕，并提供悬停高亮与缩放。 |
| [src/shared/citationGraphVisualRules.ts](../files/src/shared/citationGraphVisualRules.ts.md) | 文件 | — | Citation Graph 的视觉规则单一事实源：缩放范围、节点基准尺寸与上限、重要性光晕配色、边样式，以及可见性投影、入度统计、重要性计算等纯函数。 |
| [src/shared/customSelect.tsx](../files/src/shared/customSelect.tsx.md) | 文件 | — | 插件各 HTML 页面共用的纯 DOM 下拉控件：Zotero 对话框窗口无法弹出原生 select 弹层，因此提供完全受控的单选与多选实现，保留被淘汰 vendor 组件的 .custom-select* class 契约。 |
| [src/shared/dashboardWireContract.ts](../files/src/shared/dashboardWireContract.ts.md) | 文件 | — | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [src/shared/hostBridgeAgentContract.ts](../files/src/shared/hostBridgeAgentContract.ts.md) | 文件 | — | 跨边界共享的 Host Bridge agent 契约常量：agent surface 版本与宿主协议标识的最小投影，插件运行时与发布脚本共用。 |
| [src/shared/hostBridgePluginSkillBundleContract.ts](../files/src/shared/hostBridgePluginSkillBundleContract.ts.md) | 文件 | — | Host Bridge 与插件之间 Skill bundle 的共享契约类型定义，约束 bundle 条目结构与校验函数在两侧保持一致。 |
| [src/shared/literatureScore.ts](../files/src/shared/literatureScore.ts.md) | 文件 | — | 文献评分的前端共享投影层：重导出 synthesis-contracts 的评分常量与类型，解析已存评分产物，并据此推导质量先验、质量快照与星级呈现。 |
| [src/shared/preactRegionMount.ts](../files/src/shared/preactRegionMount.ts.md) | 文件 | — | 与页面无关的 managed-region 挂载辅助：为按区域独立渲染的 Preact 页面创建并定位 managed mount 子节点，并给区域容器打上通用 data 属性。 |
| [src/shared/regionEquality.ts](../files/src/shared/regionEquality.ts.md) | 文件 | — | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [src/shared/synthesisCitationGraphWindow.ts](../files/src/shared/synthesisCitationGraphWindow.ts.md) | 文件 | — | Citation Graph 窗口模型：定义有界窗口状态（generation、cursor、hover-only 集合与总量计数）与严格的 patch 合并规则，是宿主与页面共享的图谱分页数据契约。 |
| [src/shared/synthesisGraphVendors.ts](../files/src/shared/synthesisGraphVendors.ts.md) | 文件 | — | 在页面入口处一次性组装 citation graph 所需的 graphology / Sigma 浏览器 vendor。 |
| [src/shared/synthesisWorkbenchI18nContract.ts](../files/src/shared/synthesisWorkbenchI18nContract.ts.md) | 文件 | — | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |
| [src/shared/synthesisWorkbenchWireContract.ts](../files/src/shared/synthesisWorkbenchWireContract.ts.md) | 文件 | — | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |
| [src/shared/topicTimelineRenderer.ts](../files/src/shared/topicTimelineRenderer.ts.md) | 文件 | — | 命令式的主题时间线渲染器：把论文与里程碑事件排布到年份轴上并产出可直接挂载的 DOM。 |
| [src/shared/topicTimelineStandalone.ts](../files/src/shared/topicTimelineStandalone.ts.md) | 文件 | — | 把主题时间线渲染器挂到 window 全局，供独立导出页在无宿主桥的情况下直接调用。 |
| [src/shared/zoteroRuntimeVersion.ts](../files/src/shared/zoteroRuntimeVersion.ts.md) | 文件 | — | 把 Zotero 版本号解析为受支持的主版本（7 / 9 / 10），用于兼容性分支与诊断输出。 |
| [src/sidebar/acpChildApp.js](../files/src/sidebar/acpChildApp.js.md) | 文件 | — | ACP 子应用页面的单行 esbuild 入口，只负责从 assistantWorkspaceAcpChild 引入并引导子运行时启动。 |
| [src/sidebar/assistantPanelModel.js](../files/src/sidebar/assistantPanelModel.js.md) | 文件 | — | Assistant Workspace 面板的纯投影模型：把工作区 snapshot 归一化为面板 DTO，包含状态/应用态语义、精确工作区字段、任务与分组、抽屉区块与空态 chrome。 |
| [src/sidebar/assistantPanelRenderer.js](../files/src/sidebar/assistantPanelRenderer.js.md) | 文件 | — | 面板 chrome 的命令式 DOM 渲染器：管理 toolbar/banner/plan 等托管挂载点、区域标记与 overlay 关闭，并向宿主派发面板 action。 |
| [src/sidebar/assistantRegionCollapse.ts](../files/src/sidebar/assistantRegionCollapse.ts.md) | 文件 | — | Assistant Workspace 区域折叠控制器：按区域可见性自动决定折叠阶段，并维护用户覆盖态，折叠只切换容器 class 与 data 属性。 |
| [src/sidebar/assistantTranscriptRenderer.js](../files/src/sidebar/assistantTranscriptRenderer.js.md) | 文件 | — | Transcript 区域的命令式渲染器：虚拟滚动窗口、分页缓存与 anchor 保持、工具调用活动分组、代码块装饰及底部粘滞逻辑都在此实现。 |
| [src/sidebar/assistantWorkspaceAcpChild.js](../files/src/sidebar/assistantWorkspaceAcpChild.js.md) | 文件 | — | Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。 |
| [src/sidebar/assistantWorkspaceApp.js](../files/src/sidebar/assistantWorkspaceApp.js.md) | 文件 | — | Assistant Workspace 侧边栏页面的构建入口，仅引入 shell 模块以触发其副作用完成挂载。 |
| [src/sidebar/assistantWorkspaceShell.js](../files/src/sidebar/assistantWorkspaceShell.js.md) | 文件 | — | Assistant Workspace 生产版 shell：管理三个标签页的子 iframe 装载、宿主 ready 握手与重试、快照发布缓存与 ACK 确认、surface 配置下发，以及抽屉开合与 payload scope 同步。 |
| [src/sidebar/components/ActionControls.tsx](../files/src/sidebar/components/ActionControls.tsx.md) | 文件 | — | 面板通用操作控件库：按钮、开关、执行展示模式切换与下拉选择器，供各 Workspace 区域按 DTO 中的 action 列表复用。 |
| [src/sidebar/components/BannerRegion.tsx](../files/src/sidebar/components/BannerRegion.tsx.md) | 文件 | — | Workspace 顶部横幅区域：渲染后端连接状态徽章与指示灯 LED，并把 banner 上可执行动作交给 ActionControls 派发。 |
| [src/sidebar/components/chromeRenderer.ts](../files/src/sidebar/components/chromeRenderer.ts.md) | 文件 | — | Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。 |
| [src/sidebar/components/ContextDrawerRegion.tsx](../files/src/sidebar/components/ContextDrawerRegion.tsx.md) | 文件 | — | 上下文抽屉区域：按 status axis 与任务分组展示工作区任务/队列任务，支持任务级 action 操作与折叠分组。 |
| [src/sidebar/components/DetailsDrawerRegion.tsx](../files/src/sidebar/components/DetailsDrawerRegion.tsx.md) | 文件 | — | 详情抽屉区域：把详情区块投影为分节条目渲染，并内嵌 Hint 区域呈现说明文本。 |
| [src/sidebar/components/EmptyStateRegion.tsx](../files/src/sidebar/components/EmptyStateRegion.tsx.md) | 文件 | — | 工作区空态区域组件，按 DTO 投影渲染无任务/无会话时的占位提示。 |
| [src/sidebar/components/HintRegion.tsx](../files/src/sidebar/components/HintRegion.tsx.md) | 文件 | — | 提示区域：渲染受限长度的提示文本、权限摘要与认证区块，把可点击动作通过 ActionControls 派发给宿主。 |
| [src/sidebar/components/MessageCountsRegion.tsx](../files/src/sidebar/components/MessageCountsRegion.tsx.md) | 文件 | — | 消息计数区域：展示 transcript 消息条数等统计数字，由 regionEquality 的计数比较输入控制更新。 |
| [src/sidebar/components/PermissionDrawerRegion.tsx](../files/src/sidebar/components/PermissionDrawerRegion.tsx.md) | 文件 | — | 权限请求抽屉区域：列出待审批的权限请求项及选项按钮，并组合 Hint 区域给出补充说明。 |
| [src/sidebar/components/PlanRegion.tsx](../files/src/sidebar/components/PlanRegion.tsx.md) | 文件 | — | 计划区域：渲染 Agent 给出的 plan 条目列表及其当前状态，并支持条目级操作。 |
| [src/sidebar/components/regionEquality.ts](../files/src/sidebar/components/regionEquality.ts.md) | 文件 | — | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |
| [src/sidebar/components/replyHistory.ts](../files/src/sidebar/components/replyHistory.ts.md) | 文件 | — | 回复输入历史模块：按 owner 记录已发送文本，支持上下键历史导航与光标首末行判定。 |
| [src/sidebar/components/ReplyRegion.tsx](../files/src/sidebar/components/ReplyRegion.tsx.md) | 文件 | — | 回复输入区域：承载 prompt 输入框、历史导航、token/用量计量与发送/中断操作。 |
| [src/sidebar/components/ToolbarRegion.tsx](../files/src/sidebar/components/ToolbarRegion.tsx.md) | 文件 | — | 工具栏区域：组合视图模式切换与面板级操作按钮，作为非 transcript 的固定 chrome 区域。 |
| [src/sidebar/components/TranscriptRegion.tsx](../files/src/sidebar/components/TranscriptRegion.tsx.md) | 文件 | — | Transcript 区域的 Preact 包装组件：管理 transcript 容器的 mount，并把手势交给命令式渲染器。 |
| [src/sidebar/components/ViewModeToggle.tsx](../files/src/sidebar/components/ViewModeToggle.tsx.md) | 文件 | — | 视图模式切换控件：在紧凑/完整等 transcript 展示模式之间切换并派发宿主动作。 |
| [src/sidebar/markdownParser.js](../files/src/sidebar/markdownParser.js.md) | 文件 | — | 侧边栏 Markdown 渲染入口：懒加载共享 markdown parser 并按 document profile 渲染消息正文。 |
| [src/sidebar/prototypeWorkspaceApp.js](../files/src/sidebar/prototypeWorkspaceApp.js.md) | 文件 | — | Harness 专用的原型工作台 shell：复用生产 shell 的子页面桥接与发布逻辑，把导航模型换成「Conversations / Skill Runs」双泳道加子标签切换，并渲染由生产样式表驱动的静态 mock 面板。 |
| [src/synthesis/components/ChromeRegion.tsx](../files/src/synthesis/components/ChromeRegion.tsx.md) | 文件 | — | Synthesis Workbench 页面的 chrome 区域：底部动作状态栏、后台任务弹层与 sidecar 运行指示。 |
| [src/synthesis/components/citationGraphCrashReporter.ts](../files/src/synthesis/components/citationGraphCrashReporter.ts.md) | 文件 | — | 把 citation graph 生命周期阶段转发到崩溃日志记录的薄桥接。 |
| [src/synthesis/components/ConceptsRegion.tsx](../files/src/synthesis/components/ConceptsRegion.tsx.md) | 文件 | — | Synthesis Workbench 的 concepts 表面：概念筛选工具栏、缓存状态行、批量选择条、概念表与内联评审面板。 |
| [src/synthesis/components/graph/graphModel.ts](../files/src/synthesis/components/graph/graphModel.ts.md) | 文件 | — | Citation graph 表面的模型层：wire 快照的防御式收窄、纯视图逻辑与签名计算。 |
| [src/synthesis/components/graph/GraphRegion.tsx](../files/src/synthesis/components/graph/GraphRegion.tsx.md) | 文件 | — | Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。 |
| [src/synthesis/components/graph/sigmaIsland.ts](../files/src/synthesis/components/graph/sigmaIsland.ts.md) | 文件 | — | Citation graph 表面的命令式 Sigma island，跨区域重渲染持有 graphology 模型与 Sigma 渲染器。 |
| [src/synthesis/components/HomeRegion.tsx](../files/src/synthesis/components/HomeRegion.tsx.md) | 文件 | — | Synthesis Workbench 的 home / overview 表面：库洞察卡片、WebDAV 同步面板与热门主题网格。 |
| [src/synthesis/components/reader/ArtifactReader.tsx](../files/src/synthesis/components/reader/ArtifactReader.tsx.md) | 文件 | — | artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。 |
| [src/synthesis/components/reader/conceptOverlay.ts](../files/src/synthesis/components/reader/conceptOverlay.ts.md) | 文件 | — | Reader 区域的概念覆盖机制：已渲染 markdown/分区内别名词元高亮、hover 气泡与报告概念导航投影。 |
| [src/synthesis/components/reader/DigestModal.tsx](../files/src/synthesis/components/reader/DigestModal.tsx.md) | 文件 | — | 论文 digest 模态：正文、大纲与导语块（来源变更警告 + 代表图）作为一个命令式 island 渲染。 |
| [src/synthesis/components/reader/EvidenceDrawer.tsx](../files/src/synthesis/components/reader/EvidenceDrawer.tsx.md) | 文件 | — | 证据浏览器与滑出抽屉：选中证据卡片、派生的声明/时间线/分类法反向链接。 |
| [src/synthesis/components/reader/markdownIsland.ts](../files/src/synthesis/components/reader/markdownIsland.ts.md) | 文件 | — | Reader 区域的命令式 markdown island：synthesis profile 渲染、纯文本回退与有界的概念/短码/digest 链接增强。 |
| [src/synthesis/components/reader/narrowing.ts](../files/src/synthesis/components/reader/narrowing.ts.md) | 文件 | — | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [src/synthesis/components/reader/ReaderRegion.tsx](../files/src/synthesis/components/reader/ReaderRegion.tsx.md) | 文件 | — | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |
| [src/synthesis/components/reader/sections.tsx](../files/src/synthesis/components/reader/sections.tsx.md) | 文件 | — | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |
| [src/synthesis/components/reader/TimelineIsland.tsx](../files/src/synthesis/components/reader/TimelineIsland.tsx.md) | 文件 | — | 主题时间线 island：仅在时间线数据签名或选中证据变化时重建共享命令式渲染器的产出 DOM。 |
| [src/synthesis/components/reader/values.ts](../files/src/synthesis/components/reader/values.ts.md) | 文件 | — | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |
| [src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx](../files/src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx.md) | 文件 | — | 注册表区域的规范修订（canonical revision）工作台组件集：负责规范行的合并、绑定校验、重定向与提案操作，以及规范详情抽屉和编辑抽屉的全部渲染。 |
| [src/synthesis/components/registry/controls.tsx](../files/src/synthesis/components/registry/controls.tsx.md) | 文件 | — | 注册表区域共享的原子控件集合：徽标、动作按钮、空态、筛选输入框、下拉选择和面板工具条。 |
| [src/synthesis/components/registry/IndexReviewDrawer.tsx](../files/src/synthesis/components/registry/IndexReviewDrawer.tsx.md) | 文件 | — | 注册表索引审阅抽屉：按待审条目类型分派引用匹配、规范修订与遗留清理三类审阅卡片，并收集用户的接受/拒绝/忽略决策。 |
| [src/synthesis/components/registry/RegistryRegion.tsx](../files/src/synthesis/components/registry/RegistryRegion.tsx.md) | 文件 | — | 注册表（Registry）主区域组件：装配索引表、canonical 工作台与审阅抽屉三个子区域，并提供缓存徽标、sidecar 命令和索引/工具筛选器。 |
| [src/synthesis/components/registry/RegistryTables.tsx](../files/src/synthesis/components/registry/RegistryTables.tsx.md) | 文件 | — | 注册表表格渲染层：包含索引表与“仅被引用条目”两张表的行、标题、状态、评分、父级展开与行内动作渲染。 |
| [src/synthesis/components/registry/registryTypes.ts](../files/src/synthesis/components/registry/registryTypes.ts.md) | 文件 | — | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |
| [src/synthesis/components/reviewCenter/reviewCenterProjection.ts](../files/src/synthesis/components/reviewCenter/reviewCenterProjection.ts.md) | 文件 | — | 审阅中心投影层：把 wire 快照与 registry 行投影成引用匹配行、清理行、概念行与话题图审阅行，并派生目标候选分组与整体选择 DTO。 |
| [src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx](../files/src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx.md) | 文件 | — | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [src/synthesis/components/reviewCenter/reviewCenterText.ts](../files/src/synthesis/components/reviewCenter/reviewCenterText.ts.md) | 文件 | — | 审阅中心文案与本地化辅助：枚举键解析、文案回退、状态色调与操作标签的集中投影。 |
| [src/synthesis/components/reviewCenter/reviewCenterWire.ts](../files/src/synthesis/components/reviewCenter/reviewCenterWire.ts.md) | 文件 | — | 审阅中心 wire 边界收窄：把宿主快照中的可选字段收窄为受控的合并目标与审阅快照形状。 |
| [src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx](../files/src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx.md) | 文件 | — | 审阅目标选择浮层：按分组展示引用、主题与概念候选，支持搜索过滤、锚定定位和选中回调。 |
| [src/synthesis/components/ShellRegion.tsx](../files/src/synthesis/components/ShellRegion.tsx.md) | 文件 | — | Synthesis Workbench 页面的侧栏与顶栏外壳：导航标签、库标识与折叠开关。 |
| [src/synthesis/components/TagsRegion.tsx](../files/src/synthesis/components/TagsRegion.tsx.md) | 文件 | — | Synthesis Workbench 的 tags 表面：词汇表、待定收件箱、导入面板与全部标签批量编辑操作。 |
| [src/synthesis/components/TopicGraphPanel.tsx](../files/src/synthesis/components/TopicGraphPanel.tsx.md) | 文件 | — | Topics 表面内嵌的主题关系图面板：模式工具栏、SVG 画布、检视器侧栏与关系评审面板。 |
| [src/synthesis/components/topicsControls.tsx](../files/src/synthesis/components/topicsControls.tsx.md) | 文件 | — | 话题区域共享控件：话题徽标、空态、宿主命令按钮、操作组和指标展示组件。 |
| [src/synthesis/components/TopicsRegion.tsx](../files/src/synthesis/components/TopicsRegion.tsx.md) | 文件 | — | Synthesis Workbench 的 artifacts 表面：搜索排序工具栏、图/列表/网格视图切换与主题关系图嵌入。 |
| [src/synthesis/components/topicsRegionData.ts](../files/src/synthesis/components/topicsRegionData.ts.md) | 文件 | — | 话题区域数据层：收窄话题产物与图节点/边 DTO、构建关系审阅队列、计算话题图布局坐标，并派生本地化枚举文本与状态色调。 |
| [src/synthesis/components/windowedRows.tsx](../files/src/synthesis/components/windowedRows.tsx.md) | 文件 | — | 窗口化（虚拟）行渲染基础设施：按滚动偏移计算可见区间、上下占位高度，并提供表格与网格两套 spacer 组件。 |
| [src/synthesis/registryProjection.ts](../files/src/synthesis/registryProjection.ts.md) | 文件 | — | 注册表区域选择态投影：把 wire 快照与本地 registry 行合成审阅选择 DTO，并提供空审阅状态的常量。 |
| [src/synthesis/standaloneGraphApp.ts](../files/src/synthesis/standaloneGraphApp.ts.md) | 文件 | — | 独立引用图谱页面的挂载入口：解析宿主快照、准备导出能力并把 GraphRegion 渲染到独立页面容器。 |
| [src/synthesis/standaloneGraphState.ts](../files/src/synthesis/standaloneGraphState.ts.md) | 文件 | — | 独立图谱页面的图状态归一化与更新：收敛 wire 快照为本地图状态并应用增量更新。 |
| [src/synthesis/standaloneTopicApp.ts](../files/src/synthesis/standaloneTopicApp.ts.md) | 文件 | — | 独立话题页面的挂载入口：组合 GraphRegion 与 ReaderRegion，只渲染所选话题所需的最小区域集合。 |
| [src/synthesis/synthesisExportProjection.ts](../files/src/synthesis/synthesisExportProjection.ts.md) | 文件 | — | 导出能力投影：把当前图选择与阅读器选择整理为可导出的 payload，供 standalone 与导出按钮复用。 |
| [src/synthesis/synthesisSurfaceProjection.ts](../files/src/synthesis/synthesisSurfaceProjection.ts.md) | 文件 | — | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [src/synthesis/synthesisWorkbenchApp.ts](../files/src/synthesis/synthesisWorkbenchApp.ts.md) | 文件 | — | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |
| [src/synthesis/synthesisWorkbenchChromeRenderer.ts](../files/src/synthesis/synthesisWorkbenchChromeRenderer.ts.md) | 文件 | — | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |
| [src/synthesis/synthesisWorkbenchPanelModel.ts](../files/src/synthesis/synthesisWorkbenchPanelModel.ts.md) | 文件 | — | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [src/synthesis/synthesisWorkbenchTypes.ts](../files/src/synthesis/synthesisWorkbenchTypes.ts.md) | 文件 | — | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |
| [src/synthesisWorkbenchApp.ts](../files/src/synthesisWorkbenchApp.ts.md) | 文件 | — | Synthesis 工作台页面 bundle 入口：注入图谱 vendor 后调用 bootstrapSynthesisWorkbench 启动工作台。 |
| [src/synthesisWorkbenchI18n.ts](../files/src/synthesisWorkbenchI18n.ts.md) | 文件 | — | Synthesis 工作台文案目录：以默认英文消息表为 SSOT，定义全部消息键，并把 sidecar 失败码投影为用户可读的失败卡片文案。 |
| [src/workspaceApp.ts](../files/src/workspaceApp.ts.md) | 文件 | — | Assistant Workspace 页面入口，初始化侧边栏/工作区 UI 控制器并注册宿主交互与事件绑定。 |

## 对其它分层的依赖

| 目标分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [插件外壳与核心运行时](plugin-core.md) | 87 | imports×87 |
| [Agent 协议与后端运行时](agent-runtime.md) | 57 | imports×57 |
| [工作流引擎与执行](workflow-engine.md) | 40 | imports×40 |
| [Synthesis 领域与侧车](synthesis-domain.md) | 12 | imports×12 |
| [构建、发布与工程配置](build-tooling.md) | 10 | imports×10 |
| [Zotero 宿主与 Bridge 集成](zotero-host.md) | 9 | imports×9 |

## 被其它分层依赖

| 来源分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [Agent 协议与后端运行时](agent-runtime.md) | 68 | imports×67、depends_on×1 |
| [构建、发布与工程配置](build-tooling.md) | 13 | imports×8、configures×5 |
| [插件外壳与核心运行时](plugin-core.md) | 13 | imports×10、configures×3 |
| [Synthesis 领域与侧车](synthesis-domain.md) | 9 | imports×9 |
| [工作流引擎与执行](workflow-engine.md) | 8 | imports×8 |
| [Zotero 宿主与 Bridge 集成](zotero-host.md) | 7 | imports×6、defines_schema×1 |
