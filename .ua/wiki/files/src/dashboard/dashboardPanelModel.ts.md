
# src/dashboard/dashboardPanelModel.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/dashboard](../../../modules/src/dashboard.md)
<!-- node: file:src/dashboard/dashboardPanelModel.ts -->

Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。
源码：[src/dashboard/dashboardPanelModel.ts](../../../../../src/dashboard/dashboardPanelModel.ts)

## 符号（10）
<!-- node: function:src/dashboard/dashboardPanelModel.ts:projectBackend -->
<!-- node: function:src/dashboard/dashboardPanelModel.ts:projectDashboardPanel -->
<!-- node: function:src/dashboard/dashboardPanelModel.ts:projectHome -->
<!-- node: function:src/dashboard/dashboardPanelModel.ts:projectProductsSelection -->
<!-- node: function:src/dashboard/dashboardPanelModel.ts:projectRuntimeLogs -->
<!-- node: function:src/dashboard/dashboardPanelModel.ts:projectSkillrunnerAudit -->
<!-- node: function:src/dashboard/dashboardPanelModel.ts:projectTab -->
<!-- node: function:src/dashboard/dashboardPanelModel.ts:projectTabBar -->
<!-- node: function:src/dashboard/dashboardPanelModel.ts:projectViews -->
<!-- node: function:src/dashboard/dashboardPanelModel.ts:projectWorkflowOptions -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| projectBackend | 函数 | 1079–1227 | 复杂 | projection、backend | 0 | 投影 Backend 面板：按后端类型选中的标签页、任务表数据、日志区与加载失败占位。 |
| projectDashboardPanel | 函数 | 1611–1640 | 中等 | projection、entry-point | 0 | 面板投影总入口：DashboardSnapshot + 本地 UI 状态 → DashboardPanel DTO。 |
| projectHome | 函数 | 179–242 | 复杂 | projection、home | 0 | 投影 Home 面板：工作流气泡、汇总统计、运行中任务行，以及是否处于文档阅读视图。 |
| projectProductsSelection | 函数 | 304–439 | 复杂 | projection、products | 0 | 投影产物面板：分栏（产物/反馈）、选中产物、文件树、预览内容与工具栏文案。 |
| projectRuntimeLogs | 函数 | 523–658 | 复杂 | projection、runtime-logs | 0 | 投影 Runtime Logs 面板：筛选器、诊断模式、预算行、日志行与详情面板的可见数据。 |
| projectSkillrunnerAudit | 函数 | 925–1072 | 复杂 | projection、audit | 0 | 投影 SkillRunner 连接审计：governor 指标卡、各维度计数行与近期事件行，全部文案已解析。 |
| projectTab | 函数 | 101–117 | 简单 | projection、navigation | 0 | 把宿主 tab 行投影为 TabView：标签、图标 class、可用性标记与禁用原因。 |
| projectTabBar | 函数 | 119–131 | 简单 | projection、navigation | 0 | 投影整个标签条 selection：分组标题、空态文案与 tab 列表。 |
| projectViews | 函数 | 1229–1609 | 复杂 | projection、dispatch | 0 | 各 surface projection 的分发入口：按 selectedTabKey 调用对应投影并汇总为视图集合。 |
| projectWorkflowOptions | 函数 | 447–509 | 复杂 | projection、workflow | 0 | 投影工作流选项面板：当前工作流的 schema 分区、草稿基线、字段可见性与提交文案。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [AcpTraceReplayRegion.tsx](components/AcpTraceReplayRegion.tsx.md) | src/dashboard/components/AcpTraceReplayRegion.tsx | Dashboard 的 ACP Trace & Replay 面板（Preact 区域）：上半部是语义 trace 录制器的源/限额配置与 arm-finish-cancel-save 生命周期，下半部是 replay profiler 的 trace 路径预检、阶段与节奏草稿、3×3 实测矩阵槽位及证据详情。 |
| [BackendRegion.tsx](components/BackendRegion.tsx.md) | src/dashboard/components/BackendRegion.tsx | Dashboard 的 Backend 面板：把旧实现中三套按后端类型分支的渲染器（generic / SkillRunner / ACP）合并为一个参数化区域，共享同一套任务表外壳，并附通用后端的绑定日志区与 SkillRunner 管理子视图。 |
| [dashboardDomUtils.ts](dashboardDomUtils.ts.md) | src/dashboard/dashboardDomUtils.ts | Dashboard 页面侧的 DOM 与格式化工具集：时间/字节格式化、HTML 转义、状态与日志级别的 badge class 映射、toast 提示与剪贴板复制；刻意不含任何区域语义，由 panel model 组合成视图数据。 |
| [dashboardLabels.ts](dashboardLabels.ts.md) | src/dashboard/dashboardLabels.ts | Dashboard 页面的宿主标签解析器：宿主标签优先，其次显式 fallback，最后回退到 key 本身；未解析的裸 task-dashboard-* key 视为未翻译。 |
| [dashboardTypes.ts](dashboardTypes.ts.md) | src/dashboard/dashboardTypes.ts | Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。 |
| [dashboardWireContract.ts](../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [HomeRegion.tsx](components/HomeRegion.tsx.md) | src/dashboard/components/HomeRegion.tsx | Dashboard 的 Home 面板：工作流气泡卡片、汇总统计、运行中任务表，以及点开某个工作流后的文档阅读视图，全部文案由 panel model 预先解析。 |
| [MigrationsRegion.tsx](components/MigrationsRegion.tsx.md) | src/dashboard/components/MigrationsRegion.tsx | Dashboard 的文献资产迁移面板：只读呈现 Dashboard-local 迁移 service 持有的扫描/应用/停止/继续生命周期，展示候选文献事实、决策、诊断与恢复提示，并提供复制诊断包。 |
| [ProductsRegion.tsx](components/ProductsRegion.tsx.md) | src/dashboard/components/ProductsRegion.tsx | Dashboard 的产物（Products）面板：产物与 Skill 反馈分栏切换、可展开的产物文件树、代码/Markdown 预览（highlight.js 高亮 + 共享 Markdown renderer）以及反馈选择工具栏。 |
| [RuntimeLogsRegion.tsx](components/RuntimeLogsRegion.tsx.md) | src/dashboard/components/RuntimeLogsRegion.tsx | Dashboard 的 Runtime Logs 面板：日志级别复选、后端/工作流多选下拉、诊断模式开关、上下文范围 chips、预算行、复制与清空操作，以及带详情面板的日志表。 |
| [SkillrunnerAuditRegion.tsx](components/SkillrunnerAuditRegion.tsx.md) | src/dashboard/components/SkillrunnerAuditRegion.tsx | Dashboard 的 SkillRunner 连接审计面板（只读）：呈现 governor 指标卡、各维度计数条与近期事件表；唯一的交互是复制 JSON，由集成层通过 onCopyJson 回调完成，不产生任何 wire 动作。 |
| [SynthesisSidecarRegion.tsx](components/SynthesisSidecarRegion.tsx.md) | src/dashboard/components/SynthesisSidecarRegion.tsx | Dashboard 的 Synthesis Sidecar trace 面板：汇总卡、trace 搜索过滤、命令式 trace 表 island，以及因果 trace 详情面板（span 树 + 复制）。所有筛选与选中状态都是页面本地 UI state，不产生宿主往返。 |
| [TabBarRegion.tsx](components/TabBarRegion.tsx.md) | src/dashboard/components/TabBarRegion.tsx | Dashboard 侧边栏标签条：按 system 与 backend 两个分组渲染标签项，展示不可用原因与不可用标签，并把点击回传为 onSelectTab。 |
| [WorkflowOptionsRegion.tsx](components/WorkflowOptionsRegion.tsx.md) | src/dashboard/components/WorkflowOptionsRegion.tsx | Dashboard 的工作流选项面板：内联工作流设置表单引擎，按 schema 渲染分区与字段，支持自定义 select、布尔开关、数值校验与 provider 条件字段的可见性判定。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardApp.ts](dashboardApp.ts.md) | src/dashboard/dashboardApp.ts | Dashboard 页面入口：负责引导启动、与宿主建立 postMessage 通道、发送 action，并把 DashboardSnapshot 投影为面板 DTO 后交给 chrome renderer 渲染。 |
| [dashboardChromeRenderer.ts](dashboardChromeRenderer.ts.md) | src/dashboard/dashboardChromeRenderer.ts | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardLabels.ts](dashboardLabels.ts.md) | src/dashboard/dashboardLabels.ts | Dashboard 页面的宿主标签解析器：宿主标签优先，其次显式 fallback，最后回退到 key 本身；未解析的裸 task-dashboard-* key 视为未翻译。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| projectDashboardPanel | 函数 | 1611–1640 | 面板投影总入口：DashboardSnapshot + 本地 UI 状态 → DashboardPanel DTO。 |
