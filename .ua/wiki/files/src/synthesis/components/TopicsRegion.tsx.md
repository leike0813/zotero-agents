
# src/synthesis/components/TopicsRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components](../../../../modules/src/synthesis/components.md)
<!-- node: file:src/synthesis/components/TopicsRegion.tsx -->

Synthesis Workbench 的 artifacts 表面：搜索排序工具栏、图/列表/网格视图切换与主题关系图嵌入。
源码：[src/synthesis/components/TopicsRegion.tsx](../../../../../../src/synthesis/components/TopicsRegion.tsx)

## 符号（7）
<!-- node: function:src/synthesis/components/TopicsRegion.tsx:CreateTopicButton -->
<!-- node: function:src/synthesis/components/TopicsRegion.tsx:TopicCard -->
<!-- node: function:src/synthesis/components/TopicsRegion.tsx:TopicDiscoveryBadge -->
<!-- node: function:src/synthesis/components/TopicsRegion.tsx:topicsEmptyStateProps -->
<!-- node: function:src/synthesis/components/TopicsRegion.tsx:TopicsGrid -->
<!-- node: function:src/synthesis/components/TopicsRegion.tsx:TopicsRegion -->
<!-- node: function:src/synthesis/components/TopicsRegion.tsx:TopicsTable -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| CreateTopicButton | 函数 | 114–128 | 简单 | button、host-command、topics | 1 | 创建主题按钮，按是否有主题调整文案与可用性。 |
| TopicCard | 函数 | 156–198 | 中等 | card、topic、presentational | 1 | 网格视图下的主题卡片，展示标题、定义与指标。 |
| TopicDiscoveryBadge | 函数 | 130–154 | 中等 | badge、discovery、topics | 1 | 主题发现状态徽章，提示待审候选数量与色调。 |
| topicsEmptyStateProps | 函数 | 100–112 | 简单 | empty-state、topics、formatting | 0 | 由空态原因（无主题 / 无搜索结果）派生空态组件所需文案。 |
| [TopicsGrid](../../../../symbols/src/synthesis/components/TopicsRegion.tsx/TopicsGrid.md) | 函数 | 200–265 | 复杂 | grid、virtualized、topics | 1 | 主题网格视图，使用窗口化行 hook 承载大量卡片。 |
| TopicsRegion | 函数 | 424–520 | 复杂 | topics-region、preact、memoized | 0 | Artifacts 表面区域组件：工具栏、视图切换、图表面板与删除计数提示。 |
| [TopicsTable](../../../../symbols/src/synthesis/components/TopicsRegion.tsx/TopicsTable.md) | 函数 | 296–422 | 复杂 | table、virtualized、topics | 1 | 主题列表视图的窗口化表格行渲染。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [synthesisWorkbenchWireContract.ts](../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |
| [TopicGraphPanel.tsx](TopicGraphPanel.tsx.md) | src/synthesis/components/TopicGraphPanel.tsx | Topics 表面内嵌的主题关系图面板：模式工具栏、SVG 画布、检视器侧栏与关系评审面板。 |
| [topicsControls.tsx](topicsControls.tsx.md) | src/synthesis/components/topicsControls.tsx | 话题区域共享控件：话题徽标、空态、宿主命令按钮、操作组和指标展示组件。 |
| [topicsRegionData.ts](topicsRegionData.ts.md) | src/synthesis/components/topicsRegionData.ts | 话题区域数据层：收窄话题产物与图节点/边 DTO、构建关系审阅队列、计算话题图布局坐标，并派生本地化枚举文本与状态色调。 |
| [windowedRows.tsx](windowedRows.tsx.md) | src/synthesis/components/windowedRows.tsx | 窗口化（虚拟）行渲染基础设施：按滚动偏移计算可见区间、上下占位高度，并提供表格与网格两套 spacer 组件。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisSurfaceProjection.ts](../synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [synthesisWorkbenchChromeRenderer.ts](../synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| TopicsRegion | 函数 | 424–520 | Artifacts 表面区域组件：工具栏、视图切换、图表面板与删除计数提示。 |
