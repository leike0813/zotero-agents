
# closeConceptBubble
<!-- node: function:src/synthesis/components/reader/conceptOverlay.ts:closeConceptBubble -->

关闭并清理当前概念 hover 气泡及其定时器。
类型：函数  
复杂度：简单  
入边数：5  
标签：cleanup、hover-bubble、imperative  
所属文件：[src/synthesis/components/reader/conceptOverlay.ts](../../../../../../files/src/synthesis/components/reader/conceptOverlay.ts.md)
源码：[src/synthesis/components/reader/conceptOverlay.ts:55](../../../../../../../../src/synthesis/components/reader/conceptOverlay.ts#L55)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ArtifactReader.tsx](../../../../../../files/src/synthesis/components/reader/ArtifactReader.tsx.md) | src/synthesis/components/reader/ArtifactReader.tsx:— | artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。 |
| [conceptOverlay.ts](../../../../../../files/src/synthesis/components/reader/conceptOverlay.ts.md) | src/synthesis/components/reader/conceptOverlay.ts:— | Reader 区域的概念覆盖机制：已渲染 markdown/分区内别名词元高亮、hover 气泡与报告概念导航投影。 |
| [DigestModal.tsx](../../../../../../files/src/synthesis/components/reader/DigestModal.tsx.md) | src/synthesis/components/reader/DigestModal.tsx:— | 论文 digest 模态：正文、大纲与导语块（来源变更警告 + 代表图）作为一个命令式 island 渲染。 |
| [ReaderRegion.tsx](../../../../../../files/src/synthesis/components/reader/ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx:— | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |
| [sections.tsx](../../../../../../files/src/synthesis/components/reader/sections.tsx.md) | src/synthesis/components/reader/sections.tsx:— | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |

## 调用

该符号没有记录对外调用。
