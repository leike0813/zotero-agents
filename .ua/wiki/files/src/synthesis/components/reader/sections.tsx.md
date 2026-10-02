
# src/synthesis/components/reader/sections.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reader](../../../../../modules/src/synthesis/components/reader.md)
<!-- node: file:src/synthesis/components/reader/sections.tsx -->

Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。
源码：[src/synthesis/components/reader/sections.tsx](../../../../../../../src/synthesis/components/reader/sections.tsx)

## 符号（27）
<!-- node: function:src/synthesis/components/reader/sections.tsx:Badge -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:CitationGraphSection -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:ContentCard -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:CoverageCardGrid -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:DiscoveryCandidateRow -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:EmptyStructured -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:EvidenceRefChips -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:KeyValueList -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:KeyValueValue -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:LocalizedBadge -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:matrixValueTone -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:MethodComparisonTable -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:Paragraphs -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:ReportConceptNav -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:ScopeBoundaryValue -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TaxonomyAxisGroup -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TaxonomyNodeCard -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TopicClaimsSection -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TopicCompareSection -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TopicCoverageSection -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TopicDiscoverySection -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TopicFutureDirectionsSection -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TopicOverviewSection -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TopicReferencesSection -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TopicReportSection -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TopicSectionSwitch -->
<!-- node: function:src/synthesis/components/reader/sections.tsx:TopicTaxonomySection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| Badge | 函数 | 55–66 | 简单 | badge、presentational、utility | 0 | 通用徽章组件。 |
| CitationGraphSection | 函数 | 1570–1584 | 简单 | citation-graph、section、presentational | 0 | citation graph 分区占位，由宿主注入的独立图 island 承接渲染。 |
| ContentCard | 函数 | 100–111 | 简单 | card、presentational、utility | 0 | 带标题与正文的通用内容卡片。 |
| CoverageCardGrid | 函数 | 945–994 | 中等 | coverage、grid、presentational | 0 | 覆盖度卡片网格，按状态色调排布。 |
| DiscoveryCandidateRow | 函数 | 1411–1455 | 中等 | discovery、row、presentational | 0 | 主题发现候选行，展示候选标签、来源与采纳/忽略动作。 |
| EmptyStructured | 函数 | 113–120 | 简单 | empty-state、presentational、utility | 0 | 结构化分区为空时的占位提示。 |
| EvidenceRefChips | 函数 | 182–203 | 中等 | evidence、chip、presentational | 0 | 把来源引用渲染为可点击的证据 chip。 |
| KeyValueList | 函数 | 166–180 | 简单 | key-value、presentational、utility | 0 | 键值列表组件，为空时渲染空态。 |
| KeyValueValue | 函数 | 122–164 | 中等 | key-value、normalization、presentational | 0 | 渲染单个键值条目，兼容字符串、数组与本地化对象等形态。 |
| LocalizedBadge | 函数 | 69–82 | 简单 | badge、localization、presentational | 0 | 把枚举值解析为本地化文案后再渲染的徽章。 |
| matrixValueTone | 函数 | 715–736 | 中等 | compare、formatting、pure | 0 | 由矩阵取值派生色调，突出差异显著的方法。 |
| MethodComparisonTable | 函数 | 676–713 | 中等 | compare、table、presentational | 0 | 方法对比矩阵表格，按维度展示各方法的取值。 |
| Paragraphs | 函数 | 84–98 | 简单 | prose、presentational、utility | 0 | 按空行拆分文本并渲染为段落列表。 |
| ReportConceptNav | 函数 | 1176–1224 | 中等 | navigation、concept、report | 0 | 报告内的概念导航，按分组列出概念并支持滚动定位。 |
| ScopeBoundaryValue | 函数 | 209–231 | 中等 | scope-boundary、presentational、utility | 0 | 渲染 scope boundary 字段的边界说明与色调。 |
| TaxonomyAxisGroup | 函数 | 473–522 | 中等 | taxonomy、group、presentational | 0 | 一个分类轴下的节点分组渲染。 |
| TaxonomyNodeCard | 函数 | 392–471 | 复杂 | taxonomy、card、presentational | 0 | 单个分类法节点卡片，展示定义、证据引用与子节点。 |
| TopicClaimsSection | 函数 | 596–670 | 复杂 | claims、section、preact | 0 | topic claims 分区：声明条目、置信度徽章与来源引用。 |
| TopicCompareSection | 函数 | 738–870 | 复杂 | compare、section、preact | 0 | topic compare 分区：对比矩阵、差异标注与结论条目。 |
| TopicCoverageSection | 函数 | 996–1080 | 复杂 | coverage、section、preact | 0 | topic coverage 分区：覆盖指标与卡片网格。 |
| TopicDiscoverySection | 函数 | 1457–1498 | 中等 | discovery、section、preact | 0 | topic discovery 分区：候选列表与批量审阅动作。 |
| TopicFutureDirectionsSection | 函数 | 876–932 | 中等 | future-directions、section、preact | 0 | topic future directions 分区：未来研究方向条目与优先级。 |
| TopicOverviewSection | 函数 | 233–364 | 复杂 | topic-overview、section、preact | 0 | topic overview 分区：定义、摘要、边界与关键指标的完整渲染。 |
| TopicReferencesSection | 函数 | 1086–1170 | 复杂 | references、section、preact | 0 | topic references 分区：文献清单、状态与跳转动作。 |
| TopicReportSection | 函数 | 1276–1409 | 复杂 | report、section、markdown-island | 0 | topic report 分区：通过 ref 挂载命令式 markdown island，并渲染大纲与概念导航。 |
| TopicSectionSwitch | 函数 | 1534–1568 | 中等 | tabs、navigation、presentational | 1 | 八个 topic detail 分区的切换标签条。 |
| TopicTaxonomySection | 函数 | 524–583 | 复杂 | taxonomy、section、preact | 0 | topic taxonomy 分区：按分类轴分组渲染全部节点。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptOverlay.ts](conceptOverlay.ts.md) | src/synthesis/components/reader/conceptOverlay.ts | Reader 区域的概念覆盖机制：已渲染 markdown/分区内别名词元高亮、hover 气泡与报告概念导航投影。 |
| [markdownIsland.ts](markdownIsland.ts.md) | src/synthesis/components/reader/markdownIsland.ts | Reader 区域的命令式 markdown island：synthesis profile 渲染、纯文本回退与有界的概念/短码/digest 链接增强。 |
| [narrowing.ts](narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [regionEquality.ts](../../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [synthesisWorkbenchWireContract.ts](../../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |
| [values.ts](values.ts.md) | src/synthesis/components/reader/values.ts | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [EvidenceDrawer.tsx](EvidenceDrawer.tsx.md) | src/synthesis/components/reader/EvidenceDrawer.tsx | 证据浏览器与滑出抽屉：选中证据卡片、派生的声明/时间线/分类法反向链接。 |
| [ReaderRegion.tsx](ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| Badge | 函数 | 55–66 | 通用徽章组件。 |
| ContentCard | 函数 | 100–111 | 带标题与正文的通用内容卡片。 |
| EmptyStructured | 函数 | 113–120 | 结构化分区为空时的占位提示。 |
| KeyValueList | 函数 | 166–180 | 键值列表组件，为空时渲染空态。 |
| LocalizedBadge | 函数 | 69–82 | 把枚举值解析为本地化文案后再渲染的徽章。 |
| Paragraphs | 函数 | 84–98 | 按空行拆分文本并渲染为段落列表。 |
| TopicClaimsSection | 函数 | 596–670 | topic claims 分区：声明条目、置信度徽章与来源引用。 |
| TopicCompareSection | 函数 | 738–870 | topic compare 分区：对比矩阵、差异标注与结论条目。 |
| TopicCoverageSection | 函数 | 996–1080 | topic coverage 分区：覆盖指标与卡片网格。 |
| TopicDiscoverySection | 函数 | 1457–1498 | topic discovery 分区：候选列表与批量审阅动作。 |
| TopicFutureDirectionsSection | 函数 | 876–932 | topic future directions 分区：未来研究方向条目与优先级。 |
| TopicOverviewSection | 函数 | 233–364 | topic overview 分区：定义、摘要、边界与关键指标的完整渲染。 |
| TopicReferencesSection | 函数 | 1086–1170 | topic references 分区：文献清单、状态与跳转动作。 |
| TopicReportSection | 函数 | 1276–1409 | topic report 分区：通过 ref 挂载命令式 markdown island，并渲染大纲与概念导航。 |
| TopicSectionSwitch | 函数 | 1534–1568 | 八个 topic detail 分区的切换标签条。 |
| TopicTaxonomySection | 函数 | 524–583 | topic taxonomy 分区：按分类轴分组渲染全部节点。 |
