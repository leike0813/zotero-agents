
# src/synthesis/components/reader
> 目录聚合页：10 个文件、81 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/synthesis/components/reader/ArtifactReader.tsx](../../../../files/src/synthesis/components/reader/ArtifactReader.tsx.md) | 文件 | 1 | artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。 |
| [src/synthesis/components/reader/conceptOverlay.ts](../../../../files/src/synthesis/components/reader/conceptOverlay.ts.md) | 文件 | 6 | Reader 区域的概念覆盖机制：已渲染 markdown/分区内别名词元高亮、hover 气泡与报告概念导航投影。 |
| [src/synthesis/components/reader/DigestModal.tsx](../../../../files/src/synthesis/components/reader/DigestModal.tsx.md) | 文件 | 2 | 论文 digest 模态：正文、大纲与导语块（来源变更警告 + 代表图）作为一个命令式 island 渲染。 |
| [src/synthesis/components/reader/EvidenceDrawer.tsx](../../../../files/src/synthesis/components/reader/EvidenceDrawer.tsx.md) | 文件 | 4 | 证据浏览器与滑出抽屉：选中证据卡片、派生的声明/时间线/分类法反向链接。 |
| [src/synthesis/components/reader/markdownIsland.ts](../../../../files/src/synthesis/components/reader/markdownIsland.ts.md) | 文件 | 6 | Reader 区域的命令式 markdown island：synthesis profile 渲染、纯文本回退与有界的概念/短码/digest 链接增强。 |
| [src/synthesis/components/reader/narrowing.ts](../../../../files/src/synthesis/components/reader/narrowing.ts.md) | 文件 | 19 | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [src/synthesis/components/reader/ReaderRegion.tsx](../../../../files/src/synthesis/components/reader/ReaderRegion.tsx.md) | 文件 | 4 | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |
| [src/synthesis/components/reader/sections.tsx](../../../../files/src/synthesis/components/reader/sections.tsx.md) | 文件 | 27 | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |
| [src/synthesis/components/reader/TimelineIsland.tsx](../../../../files/src/synthesis/components/reader/TimelineIsland.tsx.md) | 文件 | 3 | 主题时间线 island：仅在时间线数据签名或选中证据变化时重建共享命令式渲染器的产出 DOM。 |
| [src/synthesis/components/reader/values.ts](../../../../files/src/synthesis/components/reader/values.ts.md) | 文件 | 9 | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/shared](../../shared.md) | 18 |
