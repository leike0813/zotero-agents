
# renderMarkdownIsland
<!-- node: function:src/synthesis/components/reader/markdownIsland.ts:renderMarkdownIsland -->

markdown island 渲染入口：调用共享渲染器、缺渲染器时降级为纯文本，并附加概念、shortcode 与 digest 增强。
类型：函数  
复杂度：复杂  
入边数：3  
标签：markdown-island、entry-point、imperative  
所属文件：[src/synthesis/components/reader/markdownIsland.ts](../../../../../../files/src/synthesis/components/reader/markdownIsland.ts.md)
源码：[src/synthesis/components/reader/markdownIsland.ts:270](../../../../../../../../src/synthesis/components/reader/markdownIsland.ts#L270)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ArtifactReader.tsx](../../../../../../files/src/synthesis/components/reader/ArtifactReader.tsx.md) | src/synthesis/components/reader/ArtifactReader.tsx:— | artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。 |
| [DigestModal.tsx](../../../../../../files/src/synthesis/components/reader/DigestModal.tsx.md) | src/synthesis/components/reader/DigestModal.tsx:— | 论文 digest 模态：正文、大纲与导语块（来源变更警告 + 代表图）作为一个命令式 island 渲染。 |
| [sections.tsx](../../../../../../files/src/synthesis/components/reader/sections.tsx.md) | src/synthesis/components/reader/sections.tsx:— | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |

## 调用

该符号没有记录对外调用。
