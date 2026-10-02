
# src/synthesis/components/reader/EvidenceDrawer.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reader](../../../../../modules/src/synthesis/components/reader.md)
<!-- node: file:src/synthesis/components/reader/EvidenceDrawer.tsx -->

证据浏览器与滑出抽屉：选中证据卡片、派生的声明/时间线/分类法反向链接。
源码：[src/synthesis/components/reader/EvidenceDrawer.tsx](../../../../../../../src/synthesis/components/reader/EvidenceDrawer.tsx)

## 符号（4）
<!-- node: function:src/synthesis/components/reader/EvidenceDrawer.tsx:derivedEvidenceLinks -->
<!-- node: function:src/synthesis/components/reader/EvidenceDrawer.tsx:EvidenceDrawer -->
<!-- node: function:src/synthesis/components/reader/EvidenceDrawer.tsx:EvidenceExplorer -->
<!-- node: function:src/synthesis/components/reader/EvidenceDrawer.tsx:SelectedEvidenceCard -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| derivedEvidenceLinks | 函数 | 28–50 | 中等 | reverse-link、evidence、reader | 0 | 由选中证据反查引用它的声明、时间线事件与分类法节点。 |
| EvidenceDrawer | 函数 | 147–179 | 中等 | drawer、evidence、preact | 1 | 证据滑出抽屉：组合浏览器与选中卡片并处理关闭。 |
| EvidenceExplorer | 函数 | 103–145 | 中等 | evidence、list、reader | 0 | 证据浏览器列表，支持按状态与年份筛选并选择证据行。 |
| SelectedEvidenceCard | 函数 | 58–101 | 中等 | evidence、card、presentational | 0 | 选中证据卡片，展示元数据、摘要与派生的反向链接。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [narrowing.ts](narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [sections.tsx](sections.tsx.md) | src/synthesis/components/reader/sections.tsx | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |
| [values.ts](values.ts.md) | src/synthesis/components/reader/values.ts | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ReaderRegion.tsx](ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| EvidenceDrawer | 函数 | 147–179 | 证据滑出抽屉：组合浏览器与选中卡片并处理关闭。 |
| EvidenceExplorer | 函数 | 103–145 | 证据浏览器列表，支持按状态与年份筛选并选择证据行。 |
