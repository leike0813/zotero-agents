
# src/synthesis/components/reader/narrowing.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reader](../../../../../modules/src/synthesis/components/reader.md)
<!-- node: file:src/synthesis/components/reader/narrowing.ts -->

Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。
源码：[src/synthesis/components/reader/narrowing.ts](../../../../../../../src/synthesis/components/reader/narrowing.ts)

## 符号（19）
<!-- node: function:src/synthesis/components/reader/narrowing.ts:evidenceForRef -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:evidenceTimelineTone -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:evidenceTimelineWeight -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowArtifactReader -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowClaims -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowCompare -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowConceptEntry -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowCoverage -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowCoverageCards -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowDigestResult -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowEvidenceRow -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowFutureDirections -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowOverview -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowReaderConcepts -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowStandaloneDigests -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowTaxonomy -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowTaxonomyNode -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowTimeline -->
<!-- node: function:src/synthesis/components/reader/narrowing.ts:narrowTopicDetail -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [evidenceForRef](../../../../../symbols/src/synthesis/components/reader/narrowing.ts/evidenceForRef.md) | 函数 | 210–227 | 中等 | lookup、evidence、resolver | 2 | 按 ref 变体集合在证据集合中定位匹配行，是引用反向链接的查找基础。 |
| evidenceTimelineTone | 函数 | 107–121 | 中等 | metrics、evidence、timeline | 0 | 由证据来源与年份派生时间线标记色调。 |
| evidenceTimelineWeight | 函数 | 93–105 | 简单 | metrics、evidence、timeline | 0 | 由证据年份与重要度派生时间线标记权重。 |
| narrowArtifactReader | 函数 | 975–987 | 简单 | narrowing、artifact、projection | 0 | 收窄 artifact 阅读器载荷：原始 markdown 与元信息。 |
| narrowClaims | 函数 | 517–531 | 中等 | narrowing、claims、projection | 0 | 收窄 topic claims 分区条目与来源引用。 |
| narrowCompare | 函数 | 533–611 | 复杂 | narrowing、compare、projection | 0 | 收窄方法对比分区的行列矩阵与差异标注。 |
| narrowConceptEntry | 函数 | 857–868 | 简单 | narrowing、concept、projection | 0 | 收窄单个概念词条及其别名与定义。 |
| narrowCoverage | 函数 | 661–695 | 复杂 | narrowing、coverage、projection | 0 | 收窄覆盖度分区的整体指标与卡片集合。 |
| narrowCoverageCards | 函数 | 626–640 | 中等 | narrowing、coverage、projection | 0 | 收窄覆盖度卡片并去重。 |
| narrowDigestResult | 函数 | 931–955 | 中等 | narrowing、digest、projection | 0 | 收窄论文 digest 结果：markdown、大纲、代表性图与来源变更标记。 |
| [narrowEvidenceRow](../../../../../symbols/src/synthesis/components/reader/narrowing.ts/narrowEvidenceRow.md) | 函数 | 123–207 | 复杂 | narrowing、evidence、projection | 1 | 把来源论文 wire 条目收窄为完整证据行，含年份解析、refKey 与状态。 |
| narrowFutureDirections | 函数 | 613–624 | 简单 | narrowing、future-directions、projection | 0 | 收窄未来方向分区的方向条目。 |
| narrowOverview | 函数 | 439–485 | 复杂 | narrowing、topic-detail、projection | 0 | 收窄 topic overview 分区字段。 |
| [narrowReaderConcepts](../../../../../symbols/src/synthesis/components/reader/narrowing.ts/narrowReaderConcepts.md) | 函数 | 875–901 | 复杂 | narrowing、concept、projection | 1 | 收窄读者区域的概念词条集合并按别名建立查找索引。 |
| narrowStandaloneDigests | 函数 | 957–967 | 简单 | narrowing、digest、standalone | 0 | 收窄独立导出页注入的 digest 结果集合。 |
| narrowTaxonomy | 函数 | 487–515 | 复杂 | narrowing、taxonomy、projection | 0 | 收窄 topic taxonomy 分区：多个分类轴与节点树。 |
| narrowTaxonomyNode | 函数 | 415–437 | 中等 | narrowing、taxonomy、projection | 0 | 收窄分类法节点及其子节点与来源引用。 |
| narrowTimeline | 函数 | 709–740 | 复杂 | narrowing、timeline、projection | 0 | 收窄时间线分区的论文与里程碑事件集合。 |
| [narrowTopicDetail](../../../../../symbols/src/synthesis/components/reader/narrowing.ts/narrowTopicDetail.md) | 函数 | 743–819 | 复杂 | narrowing、topic-detail、projection | 2 | 收窄整个 topic detail 载荷，产出 Reader 区域消费的全部分区投影。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchWireContract.ts](../../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |
| [topicTimelineRenderer.ts](../../../shared/topicTimelineRenderer.ts.md) | src/shared/topicTimelineRenderer.ts | 命令式的主题时间线渲染器：把论文与里程碑事件排布到年份轴上并产出可直接挂载的 DOM。 |
| [values.ts](values.ts.md) | src/synthesis/components/reader/values.ts | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ArtifactReader.tsx](ArtifactReader.tsx.md) | src/synthesis/components/reader/ArtifactReader.tsx | artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。 |
| [conceptOverlay.ts](conceptOverlay.ts.md) | src/synthesis/components/reader/conceptOverlay.ts | Reader 区域的概念覆盖机制：已渲染 markdown/分区内别名词元高亮、hover 气泡与报告概念导航投影。 |
| [DigestModal.tsx](DigestModal.tsx.md) | src/synthesis/components/reader/DigestModal.tsx | 论文 digest 模态：正文、大纲与导语块（来源变更警告 + 代表图）作为一个命令式 island 渲染。 |
| [EvidenceDrawer.tsx](EvidenceDrawer.tsx.md) | src/synthesis/components/reader/EvidenceDrawer.tsx | 证据浏览器与滑出抽屉：选中证据卡片、派生的声明/时间线/分类法反向链接。 |
| [markdownIsland.ts](markdownIsland.ts.md) | src/synthesis/components/reader/markdownIsland.ts | Reader 区域的命令式 markdown island：synthesis profile 渲染、纯文本回退与有界的概念/短码/digest 链接增强。 |
| [ReaderRegion.tsx](ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |
| [sections.tsx](sections.tsx.md) | src/synthesis/components/reader/sections.tsx | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |
| [synthesisExportProjection.ts](../../synthesisExportProjection.ts.md) | src/synthesis/synthesisExportProjection.ts | 导出能力投影：把当前图选择与阅读器选择整理为可导出的 payload，供 standalone 与导出按钮复用。 |
| [synthesisSurfaceProjection.ts](../../synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [TimelineIsland.tsx](TimelineIsland.tsx.md) | src/synthesis/components/reader/TimelineIsland.tsx | 主题时间线 island：仅在时间线数据签名或选中证据变化时重建共享命令式渲染器的产出 DOM。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [narrowTopicDetail](../../../../../symbols/src/synthesis/components/reader/narrowing.ts/narrowTopicDetail.md) | src/synthesis/components/reader/narrowing.ts | 收窄整个 topic detail 载荷，产出 Reader 区域消费的全部分区投影。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [evidenceForRef](../../../../../symbols/src/synthesis/components/reader/narrowing.ts/evidenceForRef.md) | 函数 | 210–227 | 按 ref 变体集合在证据集合中定位匹配行，是引用反向链接的查找基础。 |
| narrowArtifactReader | 函数 | 975–987 | 收窄 artifact 阅读器载荷：原始 markdown 与元信息。 |
| narrowDigestResult | 函数 | 931–955 | 收窄论文 digest 结果：markdown、大纲、代表性图与来源变更标记。 |
| [narrowReaderConcepts](../../../../../symbols/src/synthesis/components/reader/narrowing.ts/narrowReaderConcepts.md) | 函数 | 875–901 | 收窄读者区域的概念词条集合并按别名建立查找索引。 |
| narrowStandaloneDigests | 函数 | 957–967 | 收窄独立导出页注入的 digest 结果集合。 |
| [narrowTopicDetail](../../../../../symbols/src/synthesis/components/reader/narrowing.ts/narrowTopicDetail.md) | 函数 | 743–819 | 收窄整个 topic detail 载荷，产出 Reader 区域消费的全部分区投影。 |
