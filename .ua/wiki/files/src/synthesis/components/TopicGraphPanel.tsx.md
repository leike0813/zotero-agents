
# src/synthesis/components/TopicGraphPanel.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components](../../../../modules/src/synthesis/components.md)
<!-- node: file:src/synthesis/components/TopicGraphPanel.tsx -->

Topics 表面内嵌的主题关系图面板：模式工具栏、SVG 画布、检视器侧栏与关系评审面板。
源码：[src/synthesis/components/TopicGraphPanel.tsx](../../../../../../src/synthesis/components/TopicGraphPanel.tsx)

## 符号（5）
<!-- node: function:src/synthesis/components/TopicGraphPanel.tsx:TopicGraphCanvas -->
<!-- node: function:src/synthesis/components/TopicGraphPanel.tsx:TopicGraphPanel -->
<!-- node: function:src/synthesis/components/TopicGraphPanel.tsx:TopicInspector -->
<!-- node: function:src/synthesis/components/TopicGraphPanel.tsx:TopicRelationReviewPanel -->
<!-- node: function:src/synthesis/components/TopicGraphPanel.tsx:TopicRelationSection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [TopicGraphCanvas](../../../../symbols/src/synthesis/components/TopicGraphPanel.tsx/TopicGraphCanvas.md) | 函数 | 152–248 | 复杂 | svg、canvas、topic-graph、rendering | 1 | 用普通 SVG 与绝对定位按钮绘制主题关系图节点与连线，支持节点点击选中。 |
| TopicGraphPanel | 函数 | 87–150 | 中等 | topic-graph、panel、preact | 0 | 主题关系图面板入口：模式工具栏 + 画布 + 检视器 + 关系评审面板的组合。 |
| [TopicInspector](../../../../symbols/src/synthesis/components/TopicGraphPanel.tsx/TopicInspector.md) | 函数 | 250–335 | 复杂 | inspector、topic、presentational | 1 | 主题检视器侧栏，展示选中主题的定义、指标与来源材料状态。 |
| [TopicRelationReviewPanel](../../../../symbols/src/synthesis/components/TopicGraphPanel.tsx/TopicRelationReviewPanel.md) | 函数 | 373–520 | 复杂 | review-panel、relations、topic-graph | 1 | 主题关系评审面板，持有本地展开索引并按队列顺序提交评审动作。 |
| TopicRelationSection | 函数 | 337–366 | 中等 | relations、review、topic-graph | 1 | 渲染单个关系维度下的建议关系条目与接受/拒绝动作。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchWireContract.ts](../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |
| [topicsControls.tsx](topicsControls.tsx.md) | src/synthesis/components/topicsControls.tsx | 话题区域共享控件：话题徽标、空态、宿主命令按钮、操作组和指标展示组件。 |
| [topicsRegionData.ts](topicsRegionData.ts.md) | src/synthesis/components/topicsRegionData.ts | 话题区域数据层：收窄话题产物与图节点/边 DTO、构建关系审阅队列、计算话题图布局坐标，并派生本地化枚举文本与状态色调。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [TopicsRegion.tsx](TopicsRegion.tsx.md) | src/synthesis/components/TopicsRegion.tsx | Synthesis Workbench 的 artifacts 表面：搜索排序工具栏、图/列表/网格视图切换与主题关系图嵌入。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| TopicGraphPanel | 函数 | 87–150 | 主题关系图面板入口：模式工具栏 + 画布 + 检视器 + 关系评审面板的组合。 |
