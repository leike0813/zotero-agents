
# src/dashboard/dashboardTypes.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/dashboard](../../../modules/src/dashboard.md)
<!-- node: file:src/dashboard/dashboardTypes.ts -->

Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。
源码：[src/dashboard/dashboardTypes.ts](../../../../../src/dashboard/dashboardTypes.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [AcpTraceReplayRegion.tsx](components/AcpTraceReplayRegion.tsx.md) | src/dashboard/components/AcpTraceReplayRegion.tsx | Dashboard 的 ACP Trace & Replay 面板（Preact 区域）：上半部是语义 trace 录制器的源/限额配置与 arm-finish-cancel-save 生命周期，下半部是 replay profiler 的 trace 路径预检、阶段与节奏草稿、3×3 实测矩阵槽位及证据详情。 |
| [BackendRegion.tsx](components/BackendRegion.tsx.md) | src/dashboard/components/BackendRegion.tsx | Dashboard 的 Backend 面板：把旧实现中三套按后端类型分支的渲染器（generic / SkillRunner / ACP）合并为一个参数化区域，共享同一套任务表外壳，并附通用后端的绑定日志区与 SkillRunner 管理子视图。 |
| [dashboardLabels.ts](dashboardLabels.ts.md) | src/dashboard/dashboardLabels.ts | Dashboard 页面的宿主标签解析器：宿主标签优先，其次显式 fallback，最后回退到 key 本身；未解析的裸 task-dashboard-* key 视为未翻译。 |
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
| [dashboardPanelModel.ts](dashboardPanelModel.ts.md) | src/dashboard/dashboardPanelModel.ts | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |
