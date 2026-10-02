
# src/synthesis/standaloneGraphState.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/synthesis](../../../modules/src/synthesis.md)
<!-- node: file:src/synthesis/standaloneGraphState.ts -->

独立图谱页面的图状态归一化与更新：收敛 wire 快照为本地图状态并应用增量更新。
源码：[src/synthesis/standaloneGraphState.ts](../../../../../src/synthesis/standaloneGraphState.ts)

## 符号（2）
<!-- node: function:src/synthesis/standaloneGraphState.ts:normalizeStandaloneGraph -->
<!-- node: function:src/synthesis/standaloneGraphState.ts:updateStandaloneGraph -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| normalizeStandaloneGraph | 函数 | 6–29 | 简单 | normalization、graph、state | 0 | 把 wire 图快照归一化为独立页面的本地图状态。 |
| updateStandaloneGraph | 函数 | 31–48 | 简单 | state、graph、update | 0 | 在既有图状态上应用一次增量更新，输出新的不可变状态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphVisualRules.ts](../shared/citationGraphVisualRules.ts.md) | src/shared/citationGraphVisualRules.ts | Citation Graph 的视觉规则单一事实源：缩放范围、节点基准尺寸与上限、重要性光晕配色、边样式，以及可见性投影、入度统计、重要性计算等纯函数。 |
| [synthesisWorkbenchWireContract.ts](../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [standaloneGraphApp.ts](standaloneGraphApp.ts.md) | src/synthesis/standaloneGraphApp.ts | 独立引用图谱页面的挂载入口：解析宿主快照、准备导出能力并把 GraphRegion 渲染到独立页面容器。 |
| [standaloneTopicApp.ts](standaloneTopicApp.ts.md) | src/synthesis/standaloneTopicApp.ts | 独立话题页面的挂载入口：组合 GraphRegion 与 ReaderRegion，只渲染所选话题所需的最小区域集合。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| normalizeStandaloneGraph | 函数 | 6–29 | 把 wire 图快照归一化为独立页面的本地图状态。 |
| updateStandaloneGraph | 函数 | 31–48 | 在既有图状态上应用一次增量更新，输出新的不可变状态。 |
