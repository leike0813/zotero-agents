
# src/dashboard/dashboardChromeRenderer.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/dashboard](../../../modules/src/dashboard.md)
<!-- node: file:src/dashboard/dashboardChromeRenderer.ts -->

Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。
源码：[src/dashboard/dashboardChromeRenderer.ts](../../../../../src/dashboard/dashboardChromeRenderer.ts)

## 符号（3）
<!-- node: function:src/dashboard/dashboardChromeRenderer.ts:createDashboardChromeRenderer -->
<!-- node: function:src/dashboard/dashboardChromeRenderer.ts:ensureDashboardSkeleton -->
<!-- node: function:src/dashboard/dashboardChromeRenderer.ts:renderBackendLoadError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [createDashboardChromeRenderer](../../../symbols/src/dashboard/dashboardChromeRenderer.ts/createDashboardChromeRenderer.md) | 函数 | 149–362 | 复杂 | renderer、factory、preact、region-mount | 1 | 创建 Dashboard chrome renderer：建立各 surface 的 managed mount，按 selectedTabKey 互斥渲染，暴露 toast 与复制能力，并把区域动作回传 controller。 |
| ensureDashboardSkeleton | 函数 | 92–125 | 中等 | bootstrap、dom、skeleton | 0 | adopt 或创建页面骨架容器（tabbar aside、main、toast 宿主），缺失时按 legacy class 名补齐以套用既有样式表。 |
| renderBackendLoadError | 函数 | 127–144 | 简单 | presentation、error-state | 0 | 渲染后端配置加载失败占位：说明原因并提供重试入口。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [AcpTraceReplayRegion.tsx](components/AcpTraceReplayRegion.tsx.md) | src/dashboard/components/AcpTraceReplayRegion.tsx | Dashboard 的 ACP Trace & Replay 面板（Preact 区域）：上半部是语义 trace 录制器的源/限额配置与 arm-finish-cancel-save 生命周期，下半部是 replay profiler 的 trace 路径预检、阶段与节奏草稿、3×3 实测矩阵槽位及证据详情。 |
| [BackendRegion.tsx](components/BackendRegion.tsx.md) | src/dashboard/components/BackendRegion.tsx | Dashboard 的 Backend 面板：把旧实现中三套按后端类型分支的渲染器（generic / SkillRunner / ACP）合并为一个参数化区域，共享同一套任务表外壳，并附通用后端的绑定日志区与 SkillRunner 管理子视图。 |
| [dashboardDomUtils.ts](dashboardDomUtils.ts.md) | src/dashboard/dashboardDomUtils.ts | Dashboard 页面侧的 DOM 与格式化工具集：时间/字节格式化、HTML 转义、状态与日志级别的 badge class 映射、toast 提示与剪贴板复制；刻意不含任何区域语义，由 panel model 组合成视图数据。 |
| [dashboardPanelModel.ts](dashboardPanelModel.ts.md) | src/dashboard/dashboardPanelModel.ts | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |
| [dashboardTypes.ts](dashboardTypes.ts.md) | src/dashboard/dashboardTypes.ts | Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。 |
| [HomeRegion.tsx](components/HomeRegion.tsx.md) | src/dashboard/components/HomeRegion.tsx | Dashboard 的 Home 面板：工作流气泡卡片、汇总统计、运行中任务表，以及点开某个工作流后的文档阅读视图，全部文案由 panel model 预先解析。 |
| [MigrationsRegion.tsx](components/MigrationsRegion.tsx.md) | src/dashboard/components/MigrationsRegion.tsx | Dashboard 的文献资产迁移面板：只读呈现 Dashboard-local 迁移 service 持有的扫描/应用/停止/继续生命周期，展示候选文献事实、决策、诊断与恢复提示，并提供复制诊断包。 |
| [preactRegionMount.ts](../shared/preactRegionMount.ts.md) | src/shared/preactRegionMount.ts | 与页面无关的 managed-region 挂载辅助：为按区域独立渲染的 Preact 页面创建并定位 managed mount 子节点，并给区域容器打上通用 data 属性。 |
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

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardPanelModel.ts](dashboardPanelModel.ts.md) | src/dashboard/dashboardPanelModel.ts | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createDashboardChromeRenderer](../../../symbols/src/dashboard/dashboardChromeRenderer.ts/createDashboardChromeRenderer.md) | 函数 | 149–362 | 创建 Dashboard chrome renderer：建立各 surface 的 managed mount，按 selectedTabKey 互斥渲染，暴露 toast 与复制能力，并把区域动作回传 controller。 |
