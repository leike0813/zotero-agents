
# src/shared/citationGraphStandalone.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/citationGraphStandalone.ts -->

独立 Citation Graph 视图：不依赖 Sigma，直接用 SVG 渲染引用图谱，含外壳、空态、分位式布局投影、节点/边配色与重要性光晕，并提供悬停高亮与缩放。
源码：[src/shared/citationGraphStandalone.ts](../../../../../src/shared/citationGraphStandalone.ts)

## 符号（5）
<!-- node: function:src/shared/citationGraphStandalone.ts:haloColors -->
<!-- node: function:src/shared/citationGraphStandalone.ts:renderCitationGraph -->
<!-- node: function:src/shared/citationGraphStandalone.ts:renderShell -->
<!-- node: function:src/shared/citationGraphStandalone.ts:renderSvgCitationGraph -->
<!-- node: function:src/shared/citationGraphStandalone.ts:svgPointProjector -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| haloColors | 函数 | 136–153 | 简单 | visual-rules、theme | 0 | 按节点所属 tier 与当前主题（light/dark）返回重要性光晕颜色组。 |
| renderCitationGraph | 函数 | 430–477 | 中等 | entry-point、rendering | 0 | 独立 Citation Graph 的对外入口：校验输入、渲染外壳并绘制图谱内容。 |
| renderShell | 函数 | 162–184 | 简单 | rendering、shell | 0 | 渲染独立图谱的外壳：画布容器、缩放控件、图例与空态占位节点。 |
| renderSvgCitationGraph | 函数 | 265–428 | 复杂 | rendering、svg、citation-graph | 0 | 把节点与边集合渲染成 SVG 图谱：布局、连线、重要性光晕、选中与悬停高亮、标题截断与 tooltip。 |
| svgPointProjector | 函数 | 208–259 | 中等 | rendering、projection | 0 | 把图坐标投影为 SVG 视口坐标，封装平移、缩放与视口裁剪。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphVisualRules.ts](citationGraphVisualRules.ts.md) | src/shared/citationGraphVisualRules.ts | Citation Graph 的视觉规则单一事实源：缩放范围、节点基准尺寸与上限、重要性光晕配色、边样式，以及可见性投影、入度统计、重要性计算等纯函数。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphVisualRules.ts](citationGraphVisualRules.ts.md) | src/shared/citationGraphVisualRules.ts | Citation Graph 的视觉规则单一事实源：缩放范围、节点基准尺寸与上限、重要性光晕配色、边样式，以及可见性投影、入度统计、重要性计算等纯函数。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| renderCitationGraph | 函数 | 430–477 | 独立 Citation Graph 的对外入口：校验输入、渲染外壳并绘制图谱内容。 |
