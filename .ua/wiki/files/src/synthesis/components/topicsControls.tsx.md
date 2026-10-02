
# src/synthesis/components/topicsControls.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components](../../../../modules/src/synthesis/components.md)
<!-- node: file:src/synthesis/components/topicsControls.tsx -->

话题区域共享控件：话题徽标、空态、宿主命令按钮、操作组和指标展示组件。
源码：[src/synthesis/components/topicsControls.tsx](../../../../../../src/synthesis/components/topicsControls.tsx)

## 符号（4）
<!-- node: function:src/synthesis/components/topicsControls.tsx:HostCommandButton -->
<!-- node: function:src/synthesis/components/topicsControls.tsx:TopicMetric -->
<!-- node: function:src/synthesis/components/topicsControls.tsx:TopicsBadge -->
<!-- node: function:src/synthesis/components/topicsControls.tsx:TopicsEmptyState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| HostCommandButton | 函数 | 63–106 | 中等 | component、action、ui-control | 0 | 宿主命令按钮：派发命令并处理 pending 与禁用原因。 |
| TopicMetric | 函数 | 112–119 | 简单 | component、metrics、presentation | 0 | 话题指标数值展示。 |
| TopicsBadge | 函数 | 25–36 | 简单 | component、ui-control、presentation | 0 | 话题状态徽标。 |
| TopicsEmptyState | 函数 | 38–55 | 简单 | component、empty-state、ui-control | 0 | 话题区域空态占位与恢复动作。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchWireContract.ts](../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |
| [topicsRegionData.ts](topicsRegionData.ts.md) | src/synthesis/components/topicsRegionData.ts | 话题区域数据层：收窄话题产物与图节点/边 DTO、构建关系审阅队列、计算话题图布局坐标，并派生本地化枚举文本与状态色调。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [TopicGraphPanel.tsx](TopicGraphPanel.tsx.md) | src/synthesis/components/TopicGraphPanel.tsx | Topics 表面内嵌的主题关系图面板：模式工具栏、SVG 画布、检视器侧栏与关系评审面板。 |
| [TopicsRegion.tsx](TopicsRegion.tsx.md) | src/synthesis/components/TopicsRegion.tsx | Synthesis Workbench 的 artifacts 表面：搜索排序工具栏、图/列表/网格视图切换与主题关系图嵌入。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| HostCommandButton | 函数 | 63–106 | 宿主命令按钮：派发命令并处理 pending 与禁用原因。 |
| TopicMetric | 函数 | 112–119 | 话题指标数值展示。 |
| TopicsBadge | 函数 | 25–36 | 话题状态徽标。 |
| TopicsEmptyState | 函数 | 38–55 | 话题区域空态占位与恢复动作。 |
