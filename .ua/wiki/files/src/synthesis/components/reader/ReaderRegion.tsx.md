
# src/synthesis/components/reader/ReaderRegion.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reader](../../../../../modules/src/synthesis/components/reader.md)
<!-- node: file:src/synthesis/components/reader/ReaderRegion.tsx -->

Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。
源码：[src/synthesis/components/reader/ReaderRegion.tsx](../../../../../../../src/synthesis/components/reader/ReaderRegion.tsx)

## 符号（4）
<!-- node: function:src/synthesis/components/reader/ReaderRegion.tsx:ReaderRegion -->
<!-- node: function:src/synthesis/components/reader/ReaderRegion.tsx:ReaderRegionBody -->
<!-- node: function:src/synthesis/components/reader/ReaderRegion.tsx:TopicDetailToolbar -->
<!-- node: function:src/synthesis/components/reader/ReaderRegion.tsx:TopicDetailView -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ReaderRegion | 函数 | 345–367 | 中等 | reader-region、preact、memoized | 0 | Reader 表面区域组件：以 selection 签名隔离 memo，挂载证据抽屉、digest 模态与时间线 island。 |
| ReaderRegionBody | 函数 | 315–343 | 中等 | reader、composition、preact | 1 | Reader 区域主体装配：分区视图、时间线 island 与 artifact 阅读器之间的切换。 |
| [TopicDetailToolbar](../../../../../symbols/src/synthesis/components/reader/ReaderRegion.tsx/TopicDetailToolbar.md) | 函数 | 47–150 | 复杂 | toolbar、topic-detail、reader | 1 | topic detail 工具栏：分区切换、来源材料状态与宿主命令入口。 |
| [TopicDetailView](../../../../../symbols/src/synthesis/components/reader/ReaderRegion.tsx/TopicDetailView.md) | 函数 | 152–313 | 复杂 | topic-detail、view、reader | 1 | topic detail 主视图：按当前分区渲染对应分区组件并处理选中证据。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ArtifactReader.tsx](ArtifactReader.tsx.md) | src/synthesis/components/reader/ArtifactReader.tsx | artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。 |
| [conceptOverlay.ts](conceptOverlay.ts.md) | src/synthesis/components/reader/conceptOverlay.ts | Reader 区域的概念覆盖机制：已渲染 markdown/分区内别名词元高亮、hover 气泡与报告概念导航投影。 |
| [DigestModal.tsx](DigestModal.tsx.md) | src/synthesis/components/reader/DigestModal.tsx | 论文 digest 模态：正文、大纲与导语块（来源变更警告 + 代表图）作为一个命令式 island 渲染。 |
| [EvidenceDrawer.tsx](EvidenceDrawer.tsx.md) | src/synthesis/components/reader/EvidenceDrawer.tsx | 证据浏览器与滑出抽屉：选中证据卡片、派生的声明/时间线/分类法反向链接。 |
| [narrowing.ts](narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [regionEquality.ts](../../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [sections.tsx](sections.tsx.md) | src/synthesis/components/reader/sections.tsx | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |
| [synthesisWorkbenchWireContract.ts](../../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |
| [TimelineIsland.tsx](TimelineIsland.tsx.md) | src/synthesis/components/reader/TimelineIsland.tsx | 主题时间线 island：仅在时间线数据签名或选中证据变化时重建共享命令式渲染器的产出 DOM。 |
| [values.ts](values.ts.md) | src/synthesis/components/reader/values.ts | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [standaloneTopicApp.ts](../../standaloneTopicApp.ts.md) | src/synthesis/standaloneTopicApp.ts | 独立话题页面的挂载入口：组合 GraphRegion 与 ReaderRegion，只渲染所选话题所需的最小区域集合。 |
| [synthesisWorkbenchChromeRenderer.ts](../../synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ReaderRegion | 函数 | 345–367 | Reader 表面区域组件：以 selection 签名隔离 memo，挂载证据抽屉、digest 模态与时间线 island。 |
