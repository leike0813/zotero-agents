
# src/synthesis/components/graph/sigmaIsland.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/graph](../../../../../modules/src/synthesis/components/graph.md)
<!-- node: file:src/synthesis/components/graph/sigmaIsland.ts -->

Citation graph 表面的命令式 Sigma island，跨区域重渲染持有 graphology 模型与 Sigma 渲染器。
源码：[src/synthesis/components/graph/sigmaIsland.ts](../../../../../../../src/synthesis/components/graph/sigmaIsland.ts)

## 符号（6）
<!-- node: class:src/synthesis/components/graph/sigmaIsland.ts:CitationGraphIsland -->
<!-- node: function:src/synthesis/components/graph/sigmaIsland.ts:createCitationGraphIsland -->
<!-- node: function:src/synthesis/components/graph/sigmaIsland.ts:drawGraphImportanceHalo -->
<!-- node: function:src/synthesis/components/graph/sigmaIsland.ts:graphZoomRatioFromSliderValue -->
<!-- node: function:src/synthesis/components/graph/sigmaIsland.ts:graphZoomSliderValueFromRatio -->
<!-- node: function:src/synthesis/components/graph/sigmaIsland.ts:resolveCitationGraphVendors -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [CitationGraphIsland](../../../../../symbols/src/synthesis/components/graph/sigmaIsland.ts/CitationGraphIsland.md) | 类 | 277–1028 | 复杂 | sigma-island、imperative、class、incremental-update、citation-graph | 1 | 命令式 Sigma island：持有 graphology 模型与渲染器，按签名 diff 选择仅交互/增量合并/完整重建三条更新路径，并暴露选择、悬停、缩放与邻域展开接口。 |
| createCitationGraphIsland | 函数 | 1030–1036 | 简单 | factory、sigma-island、mount | 1 | 构造并挂载 CitationGraphIsland，返回销毁函数。 |
| drawGraphImportanceHalo | 函数 | 222–271 | 中等 | rendering、importance、sigma | 0 | 按节点重要度在 Sigma 画布上绘制光晕，用于强调高影响力文献。 |
| graphZoomRatioFromSliderValue | 函数 | 202–211 | 简单 | zoom、math、graph | 0 | 把滑块刻度值反解为相机缩放比例。 |
| graphZoomSliderValueFromRatio | 函数 | 193–199 | 简单 | zoom、math、graph | 0 | 把相机缩放比例换算为滑块刻度值。 |
| resolveCitationGraphVendors | 函数 | 148–154 | 简单 | vendor-injection、citation-graph、resolution | 1 | 解析注入的 graphology/Sigma vendor，优先取 window 全局再回落到显式传入值。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphCrashReporter.ts](../citationGraphCrashReporter.ts.md) | src/synthesis/components/citationGraphCrashReporter.ts | 把 citation graph 生命周期阶段转发到崩溃日志记录的薄桥接。 |
| [citationGraphVisualRules.ts](../../../shared/citationGraphVisualRules.ts.md) | src/shared/citationGraphVisualRules.ts | Citation Graph 的视觉规则单一事实源：缩放范围、节点基准尺寸与上限、重要性光晕配色、边样式，以及可见性投影、入度统计、重要性计算等纯函数。 |
| [graphModel.ts](graphModel.ts.md) | src/synthesis/components/graph/graphModel.ts | Citation graph 表面的模型层：wire 快照的防御式收窄、纯视图逻辑与签名计算。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [GraphRegion.tsx](GraphRegion.tsx.md) | src/synthesis/components/graph/GraphRegion.tsx | Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。 |
| [standaloneGraphApp.ts](../../standaloneGraphApp.ts.md) | src/synthesis/standaloneGraphApp.ts | 独立引用图谱页面的挂载入口：解析宿主快照、准备导出能力并把 GraphRegion 渲染到独立页面容器。 |
| [standaloneTopicApp.ts](../../standaloneTopicApp.ts.md) | src/synthesis/standaloneTopicApp.ts | 独立话题页面的挂载入口：组合 GraphRegion 与 ReaderRegion，只渲染所选话题所需的最小区域集合。 |
| [synthesisWorkbenchApp.ts](../../../synthesisWorkbenchApp.ts.md) | src/synthesisWorkbenchApp.ts | Synthesis 工作台页面 bundle 入口：注入图谱 vendor 后调用 bootstrapSynthesisWorkbench 启动工作台。 |
| [synthesisWorkbenchApp.ts](../../synthesisWorkbenchApp.ts.md) | src/synthesis/synthesisWorkbenchApp.ts | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |
| [synthesisWorkbenchChromeRenderer.ts](../../synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [CitationGraphIsland](../../../../../symbols/src/synthesis/components/graph/sigmaIsland.ts/CitationGraphIsland.md) | src/synthesis/components/graph/sigmaIsland.ts | 命令式 Sigma island：持有 graphology 模型与渲染器，按签名 diff 选择仅交互/增量合并/完整重建三条更新路径，并暴露选择、悬停、缩放与邻域展开接口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [CitationGraphIsland](../../../../../symbols/src/synthesis/components/graph/sigmaIsland.ts/CitationGraphIsland.md) | 类 | 277–1028 | 命令式 Sigma island：持有 graphology 模型与渲染器，按签名 diff 选择仅交互/增量合并/完整重建三条更新路径，并暴露选择、悬停、缩放与邻域展开接口。 |
| createCitationGraphIsland | 函数 | 1030–1036 | 构造并挂载 CitationGraphIsland，返回销毁函数。 |
| graphZoomRatioFromSliderValue | 函数 | 202–211 | 把滑块刻度值反解为相机缩放比例。 |
| graphZoomSliderValueFromRatio | 函数 | 193–199 | 把相机缩放比例换算为滑块刻度值。 |
| resolveCitationGraphVendors | 函数 | 148–154 | 解析注入的 graphology/Sigma vendor，优先取 window 全局再回落到显式传入值。 |
