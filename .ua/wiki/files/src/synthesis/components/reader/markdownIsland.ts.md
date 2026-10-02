
# src/synthesis/components/reader/markdownIsland.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reader](../../../../../modules/src/synthesis/components/reader.md)
<!-- node: file:src/synthesis/components/reader/markdownIsland.ts -->

Reader 区域的命令式 markdown island：synthesis profile 渲染、纯文本回退与有界的概念/短码/digest 链接增强。
源码：[src/synthesis/components/reader/markdownIsland.ts](../../../../../../../src/synthesis/components/reader/markdownIsland.ts)

## 符号（6）
<!-- node: function:src/synthesis/components/reader/markdownIsland.ts:enhanceReportLiteratureDigestLinks -->
<!-- node: function:src/synthesis/components/reader/markdownIsland.ts:outlineForVariant -->
<!-- node: function:src/synthesis/components/reader/markdownIsland.ts:renderMarkdownCircleShortcodes -->
<!-- node: function:src/synthesis/components/reader/markdownIsland.ts:renderMarkdownIsland -->
<!-- node: function:src/synthesis/components/reader/markdownIsland.ts:replaceCircleShortcodesInTextNode -->
<!-- node: function:src/synthesis/components/reader/markdownIsland.ts:stripDuplicateReportHeadings -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| enhanceReportLiteratureDigestLinks | 函数 | 116–198 | 复杂 | markdown、digest、enrichment | 0 | 把报告中的文献引用链接增强为可打开 digest 的交互元素。 |
| outlineForVariant | 函数 | 204–234 | 中等 | outline、markdown、variant | 0 | 按 island 变体（report/digest/artifact）决定是否产出大纲。 |
| renderMarkdownCircleShortcodes | 函数 | 91–110 | 中等 | markdown、shortcode、enrichment | 1 | 遍历渲染结果替换全部圈号短码。 |
| [renderMarkdownIsland](../../../../../symbols/src/synthesis/components/reader/markdownIsland.ts/renderMarkdownIsland.md) | 函数 | 270–318 | 复杂 | markdown-island、entry-point、imperative | 3 | markdown island 渲染入口：调用共享渲染器、缺渲染器时降级为纯文本，并附加概念、shortcode 与 digest 增强。 |
| replaceCircleShortcodesInTextNode | 函数 | 62–89 | 中等 | dom-walk、markdown、shortcode | 0 | 在文本节点内替换圈号短码为上标引用，保持其余 DOM 不变。 |
| stripDuplicateReportHeadings | 函数 | 240–262 | 中等 | markdown、outline、cleanup | 1 | 移除与报告标题重复的顶层标题，避免大纲出现同名条目。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptOverlay.ts](conceptOverlay.ts.md) | src/synthesis/components/reader/conceptOverlay.ts | Reader 区域的概念覆盖机制：已渲染 markdown/分区内别名词元高亮、hover 气泡与报告概念导航投影。 |
| [narrowing.ts](narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [values.ts](values.ts.md) | src/synthesis/components/reader/values.ts | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ArtifactReader.tsx](ArtifactReader.tsx.md) | src/synthesis/components/reader/ArtifactReader.tsx | artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。 |
| [DigestModal.tsx](DigestModal.tsx.md) | src/synthesis/components/reader/DigestModal.tsx | 论文 digest 模态：正文、大纲与导语块（来源变更警告 + 代表图）作为一个命令式 island 渲染。 |
| [sections.tsx](sections.tsx.md) | src/synthesis/components/reader/sections.tsx | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [renderMarkdownIsland](../../../../../symbols/src/synthesis/components/reader/markdownIsland.ts/renderMarkdownIsland.md) | 函数 | 270–318 | markdown island 渲染入口：调用共享渲染器、缺渲染器时降级为纯文本，并附加概念、shortcode 与 digest 增强。 |
