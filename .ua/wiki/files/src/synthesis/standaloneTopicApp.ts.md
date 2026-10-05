
# src/synthesis/standaloneTopicApp.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/synthesis](../../../modules/src/synthesis.md)
<!-- node: file:src/synthesis/standaloneTopicApp.ts -->

独立话题页面的挂载入口：组合 GraphRegion 与 ReaderRegion，只渲染所选话题所需的最小区域集合。
源码：[src/synthesis/standaloneTopicApp.ts](../../../../../src/synthesis/standaloneTopicApp.ts)

## 符号（1）
<!-- node: function:src/synthesis/standaloneTopicApp.ts:mountStandaloneTopic -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| mountStandaloneTopic | 函数 | 20–106 | 复杂 | entry-point、bootstrap、topics、standalone | 0 | 挂载独立话题页面：只组合 GraphRegion 与 ReaderRegion 所需区域，避免引入完整 hosted 渲染器。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [GraphRegion.tsx](components/graph/GraphRegion.tsx.md) | src/synthesis/components/graph/GraphRegion.tsx | Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。 |
| [ReaderRegion.tsx](components/reader/ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |
| [sigmaIsland.ts](components/graph/sigmaIsland.ts.md) | src/synthesis/components/graph/sigmaIsland.ts | Citation graph 表面的命令式 Sigma island，跨区域重渲染持有 graphology 模型与 Sigma 渲染器。 |
| [standaloneGraphState.ts](standaloneGraphState.ts.md) | src/synthesis/standaloneGraphState.ts | 独立图谱页面的图状态归一化与更新：收敛 wire 快照为本地图状态并应用增量更新。 |
| [synthesisExportProjection.ts](synthesisExportProjection.ts.md) | src/synthesis/synthesisExportProjection.ts | 导出能力投影：把当前图选择与阅读器选择整理为可导出的 payload，供 standalone 与导出按钮复用。 |
| [synthesisGraphVendors.ts](../shared/synthesisGraphVendors.ts.md) | src/shared/synthesisGraphVendors.ts | 在页面入口处一次性组装 citation graph 所需的 graphology / Sigma 浏览器 vendor。 |
| [synthesisWorkbenchI18nContract.ts](../shared/synthesisWorkbenchI18nContract.ts.md) | src/shared/synthesisWorkbenchI18nContract.ts | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |
| [synthesisWorkbenchWireContract.ts](../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| mountStandaloneTopic | 函数 | 20–106 | 挂载独立话题页面：只组合 GraphRegion 与 ReaderRegion 所需区域，避免引入完整 hosted 渲染器。 |
