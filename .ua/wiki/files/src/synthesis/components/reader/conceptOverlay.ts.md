
# src/synthesis/components/reader/conceptOverlay.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reader](../../../../../modules/src/synthesis/components/reader.md)
<!-- node: file:src/synthesis/components/reader/conceptOverlay.ts -->

Reader 区域的概念覆盖机制：已渲染 markdown/分区内别名词元高亮、hover 气泡与报告概念导航投影。
源码：[src/synthesis/components/reader/conceptOverlay.ts](../../../../../../../src/synthesis/components/reader/conceptOverlay.ts)

## 符号（6）
<!-- node: function:src/synthesis/components/reader/conceptOverlay.ts:applyConceptOverlay -->
<!-- node: function:src/synthesis/components/reader/conceptOverlay.ts:closeConceptBubble -->
<!-- node: function:src/synthesis/components/reader/conceptOverlay.ts:projectReportConceptEntries -->
<!-- node: function:src/synthesis/components/reader/conceptOverlay.ts:scheduleReaderConceptBubbleClose -->
<!-- node: function:src/synthesis/components/reader/conceptOverlay.ts:showConceptBubble -->
<!-- node: function:src/synthesis/components/reader/conceptOverlay.ts:showReaderConceptBubble -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [applyConceptOverlay](../../../../../symbols/src/synthesis/components/reader/conceptOverlay.ts/applyConceptOverlay.md) | 函数 | 121–188 | 复杂 | dom-walk、concept、highlight | 1 | 遍历已渲染 DOM，为别名词元包裹标记类名并绑定 hover 交互，跳过交互元素与代码块。 |
| [closeConceptBubble](../../../../../symbols/src/synthesis/components/reader/conceptOverlay.ts/closeConceptBubble.md) | 函数 | 55–63 | 简单 | cleanup、hover-bubble、imperative | 5 | 关闭并清理当前概念 hover 气泡及其定时器。 |
| [projectReportConceptEntries](../../../../../symbols/src/synthesis/components/reader/conceptOverlay.ts/projectReportConceptEntries.md) | 函数 | 200–261 | 复杂 | projection、concept、navigation | 1 | 把报告概念导航投影为按首字母分组的可跳转条目列表。 |
| scheduleReaderConceptBubbleClose | 函数 | 273–275 | 简单 | hover-bubble、scheduling、reader | 0 | 调度概念气泡的延迟关闭，留出用户悬停交互窗口。 |
| showConceptBubble | 函数 | 65–118 | 中等 | hover-bubble、concept、imperative | 1 | 在词元旁展示概念定义气泡，复用单例容器并支持延迟关闭。 |
| showReaderConceptBubble | 函数 | 264–270 | 简单 | hover-bubble、concept、reader | 1 | 读者区域专用的概念气泡入口，附加报告上下文后展示气泡。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [narrowing.ts](narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [values.ts](values.ts.md) | src/synthesis/components/reader/values.ts | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ArtifactReader.tsx](ArtifactReader.tsx.md) | src/synthesis/components/reader/ArtifactReader.tsx | artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。 |
| [DigestModal.tsx](DigestModal.tsx.md) | src/synthesis/components/reader/DigestModal.tsx | 论文 digest 模态：正文、大纲与导语块（来源变更警告 + 代表图）作为一个命令式 island 渲染。 |
| [markdownIsland.ts](markdownIsland.ts.md) | src/synthesis/components/reader/markdownIsland.ts | Reader 区域的命令式 markdown island：synthesis profile 渲染、纯文本回退与有界的概念/短码/digest 链接增强。 |
| [ReaderRegion.tsx](ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |
| [sections.tsx](sections.tsx.md) | src/synthesis/components/reader/sections.tsx | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [applyConceptOverlay](../../../../../symbols/src/synthesis/components/reader/conceptOverlay.ts/applyConceptOverlay.md) | 函数 | 121–188 | 遍历已渲染 DOM，为别名词元包裹标记类名并绑定 hover 交互，跳过交互元素与代码块。 |
| [closeConceptBubble](../../../../../symbols/src/synthesis/components/reader/conceptOverlay.ts/closeConceptBubble.md) | 函数 | 55–63 | 关闭并清理当前概念 hover 气泡及其定时器。 |
| [projectReportConceptEntries](../../../../../symbols/src/synthesis/components/reader/conceptOverlay.ts/projectReportConceptEntries.md) | 函数 | 200–261 | 把报告概念导航投影为按首字母分组的可跳转条目列表。 |
| scheduleReaderConceptBubbleClose | 函数 | 273–275 | 调度概念气泡的延迟关闭，留出用户悬停交互窗口。 |
| showReaderConceptBubble | 函数 | 264–270 | 读者区域专用的概念气泡入口，附加报告上下文后展示气泡。 |
