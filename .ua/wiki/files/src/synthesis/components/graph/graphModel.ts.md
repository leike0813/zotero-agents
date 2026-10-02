
# src/synthesis/components/graph/graphModel.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/graph](../../../../../modules/src/synthesis/components/graph.md)
<!-- node: file:src/synthesis/components/graph/graphModel.ts -->

Citation graph 表面的模型层：wire 快照的防御式收窄、纯视图逻辑与签名计算。
源码：[src/synthesis/components/graph/graphModel.ts](../../../../../../../src/synthesis/components/graph/graphModel.ts)

## 符号（23）
<!-- node: function:src/synthesis/components/graph/graphModel.ts:collectSelectedNodeCitations -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:graphEdgeById -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:graphEdgeRoleLabel -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:graphEnumLabel -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:graphNodeById -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:graphNodeMatchesSearchText -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:graphRoleOptions -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:graphSelectedNodeIncomingCounts -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:isCurrentPaperGraphNode -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:localizedGraphDetailValue -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:narrowDiagnostics -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:narrowDiagnosticSummaryEntries -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:narrowFilters -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:narrowGraphEdge -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:narrowGraphNode -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:narrowGraphSurfaceView -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:narrowLayoutFailure -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:narrowNodeKindList -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:narrowSelectedElement -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:narrowTopicScopes -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:narrowWindow -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:sigmaGraphLayoutSignature -->
<!-- node: function:src/synthesis/components/graph/graphModel.ts:sigmaGraphModelSignature -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectSelectedNodeCitations | 函数 | 726–740 | 中等 | citations、graph、selection | 1 | 收集选中节点的入边与出边引用明细，供 SelectedNodeCitations 渲染。 |
| graphEdgeById | 函数 | 583–589 | 简单 | lookup、graph、pure | 1 | 按 id 在边集合中查找边。 |
| graphEdgeRoleLabel | 函数 | 551–558 | 简单 | localization、graph、enum | 0 | 把引用关系角色解析为展示文案。 |
| graphEnumLabel | 函数 | 535–549 | 中等 | localization、graph、enum | 1 | 把图相关的枚举值解析为本地化展示文案。 |
| graphNodeById | 函数 | 575–581 | 简单 | lookup、graph、pure | 1 | 按 id 在节点集合中查找节点，返回未命中时为 undefined。 |
| graphNodeMatchesSearchText | 函数 | 633–644 | 中等 | search、predicate、graph | 1 | 判定图节点是否命中当前搜索文本（标题、作者、标签等字段）。 |
| graphRoleOptions | 函数 | 561–573 | 简单 | options、filters、graph | 0 | 列出可用的边角色过滤选项。 |
| graphSelectedNodeIncomingCounts | 函数 | 702–718 | 中等 | metrics、graph、citation | 1 | 统计选中节点的入度与引用计数，供检视面板展示。 |
| isCurrentPaperGraphNode | 函数 | 499–508 | 简单 | predicate、graph、current-item | 1 | 判定图节点是否为当前 Zotero 文献，用于图上定位高亮。 |
| localizedGraphDetailValue | 函数 | 596–624 | 中等 | localization、graph、detail | 1 | 把节点检视详情字段解析为本地化字符串，兼容原始标量与本地化对象。 |
| narrowDiagnostics | 函数 | 401–432 | 中等 | narrowing、diagnostics、graph | 0 | 聚合图表面的诊断信息为区域可消费的形状。 |
| narrowDiagnosticSummaryEntries | 函数 | 383–399 | 中等 | narrowing、diagnostics、graph | 0 | 收窄图表面诊断摘要条目。 |
| narrowFilters | 函数 | 285–299 | 中等 | narrowing、filters、graph | 0 | 收窄图表面过滤状态（搜索、角色、主题范围）。 |
| narrowGraphEdge | 函数 | 228–242 | 中等 | narrowing、graph、projection | 0 | 把 unknown 的图边 wire 槽位收窄为具体边形状。 |
| narrowGraphNode | 函数 | 198–226 | 中等 | narrowing、graph、projection | 0 | 把 unknown 的图节点 wire 槽位收窄为具体节点形状。 |
| [narrowGraphSurfaceView](../../../../../symbols/src/synthesis/components/graph/graphModel.ts/narrowGraphSurfaceView.md) | 函数 | 439–483 | 复杂 | narrowing、projection、graph-surface | 2 | 把整个图表面 wire 槽位收窄为节点、边、过滤、窗口与诊断的组合视图。 |
| narrowLayoutFailure | 函数 | 355–379 | 中等 | narrowing、diagnostics、graph | 0 | 收窄布局计算失败的诊断信息与可用重试算法。 |
| narrowNodeKindList | 函数 | 268–283 | 中等 | narrowing、filters、graph | 0 | 收窄并去重图节点类别过滤列表。 |
| narrowSelectedElement | 函数 | 344–353 | 简单 | narrowing、selection、graph | 0 | 收窄当前选中的图元素（节点或边）。 |
| narrowTopicScopes | 函数 | 328–342 | 简单 | narrowing、filters、graph | 0 | 收窄主题范围过滤集合。 |
| narrowWindow | 函数 | 301–326 | 中等 | narrowing、graph-window、projection | 0 | 收窄 graph window 的状态、进度与失败信息。 |
| sigmaGraphLayoutSignature | 函数 | 692–699 | 简单 | signature、layout、graph | 1 | 计算布局相关字段的签名，仅布局变化时重置 camera。 |
| sigmaGraphModelSignature | 函数 | 663–689 | 中等 | signature、incremental-update、graph | 1 | 计算图数据模型的签名，供 island 判断是否需要重建模型。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphVisualRules.ts](../../../shared/citationGraphVisualRules.ts.md) | src/shared/citationGraphVisualRules.ts | Citation Graph 的视觉规则单一事实源：缩放范围、节点基准尺寸与上限、重要性光晕配色、边样式，以及可见性投影、入度统计、重要性计算等纯函数。 |
| [synthesisWorkbenchI18nContract.ts](../../../shared/synthesisWorkbenchI18nContract.ts.md) | src/shared/synthesisWorkbenchI18nContract.ts | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [GraphRegion.tsx](GraphRegion.tsx.md) | src/synthesis/components/graph/GraphRegion.tsx | Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。 |
| [sigmaIsland.ts](sigmaIsland.ts.md) | src/synthesis/components/graph/sigmaIsland.ts | Citation graph 表面的命令式 Sigma island，跨区域重渲染持有 graphology 模型与 Sigma 渲染器。 |
| [synthesisExportProjection.ts](../../synthesisExportProjection.ts.md) | src/synthesis/synthesisExportProjection.ts | 导出能力投影：把当前图选择与阅读器选择整理为可导出的 payload，供 standalone 与导出按钮复用。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| graphEdgeById | src/synthesis/components/graph/graphModel.ts | 按 id 在边集合中查找边。 |
| graphEnumLabel | src/synthesis/components/graph/graphModel.ts | 把图相关的枚举值解析为本地化展示文案。 |
| graphNodeById | src/synthesis/components/graph/graphModel.ts | 按 id 在节点集合中查找节点，返回未命中时为 undefined。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| collectSelectedNodeCitations | 函数 | 726–740 | 收集选中节点的入边与出边引用明细，供 SelectedNodeCitations 渲染。 |
| graphEdgeById | 函数 | 583–589 | 按 id 在边集合中查找边。 |
| graphEdgeRoleLabel | 函数 | 551–558 | 把引用关系角色解析为展示文案。 |
| graphEnumLabel | 函数 | 535–549 | 把图相关的枚举值解析为本地化展示文案。 |
| graphNodeById | 函数 | 575–581 | 按 id 在节点集合中查找节点，返回未命中时为 undefined。 |
| graphNodeMatchesSearchText | 函数 | 633–644 | 判定图节点是否命中当前搜索文本（标题、作者、标签等字段）。 |
| graphRoleOptions | 函数 | 561–573 | 列出可用的边角色过滤选项。 |
| graphSelectedNodeIncomingCounts | 函数 | 702–718 | 统计选中节点的入度与引用计数，供检视面板展示。 |
| isCurrentPaperGraphNode | 函数 | 499–508 | 判定图节点是否为当前 Zotero 文献，用于图上定位高亮。 |
| localizedGraphDetailValue | 函数 | 596–624 | 把节点检视详情字段解析为本地化字符串，兼容原始标量与本地化对象。 |
| narrowGraphEdge | 函数 | 228–242 | 把 unknown 的图边 wire 槽位收窄为具体边形状。 |
| narrowGraphNode | 函数 | 198–226 | 把 unknown 的图节点 wire 槽位收窄为具体节点形状。 |
| [narrowGraphSurfaceView](../../../../../symbols/src/synthesis/components/graph/graphModel.ts/narrowGraphSurfaceView.md) | 函数 | 439–483 | 把整个图表面 wire 槽位收窄为节点、边、过滤、窗口与诊断的组合视图。 |
| sigmaGraphLayoutSignature | 函数 | 692–699 | 计算布局相关字段的签名，仅布局变化时重置 camera。 |
| sigmaGraphModelSignature | 函数 | 663–689 | 计算图数据模型的签名，供 island 判断是否需要重建模型。 |
