
# src/shared/citationGraphVisualRules.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/citationGraphVisualRules.ts -->

Citation Graph 的视觉规则单一事实源：缩放范围、节点基准尺寸与上限、重要性光晕配色、边样式，以及可见性投影、入度统计、重要性计算等纯函数。
源码：[src/shared/citationGraphVisualRules.ts](../../../../../src/shared/citationGraphVisualRules.ts)

## 符号（7）
<!-- node: function:src/shared/citationGraphVisualRules.ts:aggregateCitationGraphVisualEdges -->
<!-- node: function:src/shared/citationGraphVisualRules.ts:buildCitationGraphNodeImportance -->
<!-- node: function:src/shared/citationGraphVisualRules.ts:citationGraphFallbackIncomingDegrees -->
<!-- node: function:src/shared/citationGraphVisualRules.ts:citationGraphFallbackOffsets -->
<!-- node: function:src/shared/citationGraphVisualRules.ts:citationGraphIncomingCounts -->
<!-- node: function:src/shared/citationGraphVisualRules.ts:citationGraphNodeSize -->
<!-- node: function:src/shared/citationGraphVisualRules.ts:projectCitationGraphVisibility -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| aggregateCitationGraphVisualEdges | 函数 | 72–100 | 中等 | data-transform、citation-graph | 0 | 把原始引用边聚合为可绘制的视觉边，合并重复方向并统计权重。 |
| buildCitationGraphNodeImportance | 函数 | 316–363 | 中等 | ranking、citation-graph | 0 | 由入度、聚焦状态与 tier 组合出节点重要性分值，作为尺寸与光晕的共同输入。 |
| citationGraphFallbackIncomingDegrees | 函数 | 285–303 | 简单 | fallback-layout、statistics | 0 | 为兜底布局场景计算各节点的入度分布。 |
| citationGraphFallbackOffsets | 函数 | 125–154 | 中等 | fallback-layout、citation-graph | 0 | 在缺少真实布局坐标时，按分环策略生成确定性的兜底布局偏移。 |
| citationGraphIncomingCounts | 函数 | 102–123 | 中等 | statistics、citation-graph | 0 | 统计每个节点的入度与出度，作为重要性与边样式的输入。 |
| citationGraphNodeSize | 函数 | 379–391 | 简单 | visual-rules、citation-graph | 1 | 按重要性与节点 tier 计算最终渲染尺寸，并受各自尺寸上限约束。 |
| [projectCitationGraphVisibility](../../../symbols/src/shared/citationGraphVisualRules.ts/projectCitationGraphVisibility.md) | 函数 | 156–283 | 复杂 | projection、visibility、citation-graph | 1 | 按搜索、焦点节点与显示层级计算每个节点的可见性（default/hover_only）与低信号标记。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphStandalone.ts](citationGraphStandalone.ts.md) | src/shared/citationGraphStandalone.ts | 独立 Citation Graph 视图：不依赖 Sigma，直接用 SVG 渲染引用图谱，含外壳、空态、分位式布局投影、节点/边配色与重要性光晕，并提供悬停高亮与缩放。 |
| [graphModel.ts](../synthesis/components/graph/graphModel.ts.md) | src/synthesis/components/graph/graphModel.ts | Citation graph 表面的模型层：wire 快照的防御式收窄、纯视图逻辑与签名计算。 |
| [GraphRegion.tsx](../synthesis/components/graph/GraphRegion.tsx.md) | src/synthesis/components/graph/GraphRegion.tsx | Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。 |
| [sigmaIsland.ts](../synthesis/components/graph/sigmaIsland.ts.md) | src/synthesis/components/graph/sigmaIsland.ts | Citation graph 表面的命令式 Sigma island，跨区域重渲染持有 graphology 模型与 Sigma 渲染器。 |
| [standaloneGraphState.ts](../synthesis/standaloneGraphState.ts.md) | src/synthesis/standaloneGraphState.ts | 独立图谱页面的图状态归一化与更新：收敛 wire 快照为本地图状态并应用增量更新。 |
| [uiModel.ts](../modules/synthesis/uiModel.ts.md) | src/modules/synthesis/uiModel.ts | Synthesis 工作台的 UI 状态模型：把 workbench 契约快照规范化为可渲染的行集合，实现 topic / concept / tag / graph / review / registry 各面板的筛选与派生逻辑，并用纯函数 reducer 处理全部工作台 action。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| aggregateCitationGraphVisualEdges | 函数 | 72–100 | 把原始引用边聚合为可绘制的视觉边，合并重复方向并统计权重。 |
| buildCitationGraphNodeImportance | 函数 | 316–363 | 由入度、聚焦状态与 tier 组合出节点重要性分值，作为尺寸与光晕的共同输入。 |
| citationGraphFallbackIncomingDegrees | 函数 | 285–303 | 为兜底布局场景计算各节点的入度分布。 |
| citationGraphFallbackOffsets | 函数 | 125–154 | 在缺少真实布局坐标时，按分环策略生成确定性的兜底布局偏移。 |
| citationGraphIncomingCounts | 函数 | 102–123 | 统计每个节点的入度与出度，作为重要性与边样式的输入。 |
| citationGraphNodeSize | 函数 | 379–391 | 按重要性与节点 tier 计算最终渲染尺寸，并受各自尺寸上限约束。 |
| [projectCitationGraphVisibility](../../../symbols/src/shared/citationGraphVisualRules.ts/projectCitationGraphVisibility.md) | 函数 | 156–283 | 按搜索、焦点节点与显示层级计算每个节点的可见性（default/hover_only）与低信号标记。 |
