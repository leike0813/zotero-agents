
# src/synthesis/components/graph/GraphRegion.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/graph](../../../../../modules/src/synthesis/components/graph.md)
<!-- node: file:src/synthesis/components/graph/GraphRegion.tsx -->

Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。
源码：[src/synthesis/components/graph/GraphRegion.tsx](../../../../../../../src/synthesis/components/graph/GraphRegion.tsx)

## 符号（16）
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:defaultGraphDetailLabels -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:GraphLegend -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:GraphRegion -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:GraphSelectionDrawer -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:GraphStageOverlays -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:GraphWindowProgress -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:HostedGraphControls -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:IncrementalRefreshButton -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:LayoutControls -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:LayoutFailureAction -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:LayoutRecomputeButton -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:NodeKindControls -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:RoleSelect -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:SelectedDetail -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:SelectedNodeCitations -->
<!-- node: function:src/synthesis/components/graph/GraphRegion.tsx:StandaloneGraphControls -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| defaultGraphDetailLabels | 函数 | 118–162 | 中等 | labels、graph、detail | 0 | 图节点检视详情的默认展示标签表，覆盖年份、作者、标签、集合与引用指标。 |
| GraphLegend | 函数 | 240–301 | 中等 | legend、graph、presentational | 0 | 渲染 citation graph 图例，说明节点类别、边的引用方向配色与低信号引用含义。 |
| GraphRegion | 函数 | 1170–1328 | 复杂 | graph-region、preact、memoized、citation-graph | 0 | Citation graph 表面区域组件：挂载 Sigma island、桥接 selection 与 island，并把交互上报为 wire 动作。 |
| GraphSelectionDrawer | 函数 | 920–946 | 中等 | drawer、graph、presentational | 0 | 侧边检视抽屉容器，包裹选中节点详情与关闭动作。 |
| GraphStageOverlays | 函数 | 1000–1167 | 复杂 | overlay、graph、stage | 0 | 图舞台上的全部覆盖层：空态、加载态、失败态、window 进度与选中提示。 |
| GraphWindowProgress | 函数 | 527–568 | 中等 | graph-window、progress、graph | 0 | graph window 分页加载进度与继续/重试动作的展示。 |
| HostedGraphControls | 函数 | 628–706 | 复杂 | controls、hosted、graph | 0 | 宿主模式下的图控制条：过滤、布局、缓存重建与增量刷新。 |
| IncrementalRefreshButton | 函数 | 570–600 | 中等 | button、host-command、graph | 0 | 触发增量刷新 citation graph 缓存的按钮，按进行中状态禁用。 |
| LayoutControls | 函数 | 476–498 | 简单 | controls、layout、graph | 0 | 布局算法选择控件，提供 force / radial / components 三种布局。 |
| LayoutFailureAction | 函数 | 952–998 | 中等 | error-state、layout、graph | 0 | 布局计算失败时的重试动作区，展示诊断并提供重算入口。 |
| LayoutRecomputeButton | 函数 | 602–626 | 中等 | button、layout、graph | 0 | 触发手动重算布局的按钮并携带当前算法参数。 |
| NodeKindControls | 函数 | 430–474 | 中等 | controls、filters、graph | 0 | 节点类别过滤控件组，按 library / external / unresolved 切换可见性。 |
| RoleSelect | 函数 | 500–525 | 中等 | controls、filters、graph | 0 | 引用角色过滤下拉，选项来自 graphModel 的角色词表。 |
| SelectedDetail | 函数 | 801–918 | 复杂 | inspector、detail、graph | 0 | 选中节点检视面板，渲染节点元数据、指标与打开 Zotero 条目的动作。 |
| SelectedNodeCitations | 函数 | 727–799 | 复杂 | citations、detail、graph | 0 | 展示选中节点的引用明细：入边来源、出边目标与引用计数。 |
| StandaloneGraphControls | 函数 | 708–721 | 简单 | controls、standalone、graph | 0 | 独立导出页下的精简图控制条，仅保留宿主桥可用的动作。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphVisualRules.ts](../../../shared/citationGraphVisualRules.ts.md) | src/shared/citationGraphVisualRules.ts | Citation Graph 的视觉规则单一事实源：缩放范围、节点基准尺寸与上限、重要性光晕配色、边样式，以及可见性投影、入度统计、重要性计算等纯函数。 |
| [graphModel.ts](graphModel.ts.md) | src/synthesis/components/graph/graphModel.ts | Citation graph 表面的模型层：wire 快照的防御式收窄、纯视图逻辑与签名计算。 |
| [regionEquality.ts](../../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [sigmaIsland.ts](sigmaIsland.ts.md) | src/synthesis/components/graph/sigmaIsland.ts | Citation graph 表面的命令式 Sigma island，跨区域重渲染持有 graphology 模型与 Sigma 渲染器。 |
| [synthesisWorkbenchI18nContract.ts](../../../shared/synthesisWorkbenchI18nContract.ts.md) | src/shared/synthesisWorkbenchI18nContract.ts | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [standaloneGraphApp.ts](../../standaloneGraphApp.ts.md) | src/synthesis/standaloneGraphApp.ts | 独立引用图谱页面的挂载入口：解析宿主快照、准备导出能力并把 GraphRegion 渲染到独立页面容器。 |
| [standaloneTopicApp.ts](../../standaloneTopicApp.ts.md) | src/synthesis/standaloneTopicApp.ts | 独立话题页面的挂载入口：组合 GraphRegion 与 ReaderRegion，只渲染所选话题所需的最小区域集合。 |
| [synthesisExportProjection.ts](../../synthesisExportProjection.ts.md) | src/synthesis/synthesisExportProjection.ts | 导出能力投影：把当前图选择与阅读器选择整理为可导出的 payload，供 standalone 与导出按钮复用。 |
| [synthesisSurfaceProjection.ts](../../synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [synthesisWorkbenchChromeRenderer.ts](../../synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [narrowGraphSurfaceView](../../../../../symbols/src/synthesis/components/graph/graphModel.ts/narrowGraphSurfaceView.md) | src/synthesis/components/graph/graphModel.ts | 把整个图表面 wire 槽位收窄为节点、边、过滤、窗口与诊断的组合视图。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| defaultGraphDetailLabels | 函数 | 118–162 | 图节点检视详情的默认展示标签表，覆盖年份、作者、标签、集合与引用指标。 |
| GraphRegion | 函数 | 1170–1328 | Citation graph 表面区域组件：挂载 Sigma island、桥接 selection 与 island，并把交互上报为 wire 动作。 |
