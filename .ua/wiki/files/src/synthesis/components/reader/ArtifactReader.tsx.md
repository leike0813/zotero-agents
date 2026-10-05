
# src/synthesis/components/reader/ArtifactReader.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reader](../../../../../modules/src/synthesis/components/reader.md)
<!-- node: file:src/synthesis/components/reader/ArtifactReader.tsx -->

artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。
源码：[src/synthesis/components/reader/ArtifactReader.tsx](../../../../../../../src/synthesis/components/reader/ArtifactReader.tsx)

## 符号（1）
<!-- node: function:src/synthesis/components/reader/ArtifactReader.tsx:ArtifactReaderPanel -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ArtifactReaderPanel | 函数 | 15–97 | 中等 | artifact-reader、markdown、reader | 1 | artifact 原文阅读面板：把原始 markdown 挂载为命令式 island，并提供复制与元信息行。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptOverlay.ts](conceptOverlay.ts.md) | src/synthesis/components/reader/conceptOverlay.ts | Reader 区域的概念覆盖机制：已渲染 markdown/分区内别名词元高亮、hover 气泡与报告概念导航投影。 |
| [markdownIsland.ts](markdownIsland.ts.md) | src/synthesis/components/reader/markdownIsland.ts | Reader 区域的命令式 markdown island：synthesis profile 渲染、纯文本回退与有界的概念/短码/digest 链接增强。 |
| [narrowing.ts](narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [regionEquality.ts](../../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [values.ts](values.ts.md) | src/synthesis/components/reader/values.ts | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ReaderRegion.tsx](ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ArtifactReaderPanel | 函数 | 15–97 | artifact 原文阅读面板：把原始 markdown 挂载为命令式 island，并提供复制与元信息行。 |
