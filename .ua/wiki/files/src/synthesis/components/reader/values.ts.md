
# src/synthesis/components/reader/values.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reader](../../../../../modules/src/synthesis/components/reader.md)
<!-- node: file:src/synthesis/components/reader/values.ts -->

Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。
源码：[src/synthesis/components/reader/values.ts](../../../../../../../src/synthesis/components/reader/values.ts)

## 符号（9）
<!-- node: function:src/synthesis/components/reader/values.ts:enumLabel -->
<!-- node: function:src/synthesis/components/reader/values.ts:evidenceRefKeyVariants -->
<!-- node: function:src/synthesis/components/reader/values.ts:firstText -->
<!-- node: function:src/synthesis/components/reader/values.ts:formatTimeSpan -->
<!-- node: function:src/synthesis/components/reader/values.ts:humanizeEnumValue -->
<!-- node: function:src/synthesis/components/reader/values.ts:maybeLocalizedValue -->
<!-- node: function:src/synthesis/components/reader/values.ts:nestedMetric -->
<!-- node: function:src/synthesis/components/reader/values.ts:normalizeEvidenceRefKey -->
<!-- node: function:src/synthesis/components/reader/values.ts:numericYear -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| enumLabel | 函数 | 129–140 | 简单 | i18n、formatting、fallback | 0 | 结合 i18n 消息与枚举原值生成标签，缺失消息时回退为人类化文本。 |
| evidenceRefKeyVariants | 函数 | 289–294 | 中等 | utility、dedupe、evidence | 0 | 产出证据引用的多种键形态，兼容不同宿主产物的命名差异。 |
| firstText | 函数 | 57–67 | 简单 | utility、formatting、fallback | 0 | 从结构化字段中取出第一段可展示文本，缺失时回退到空串。 |
| formatTimeSpan | 函数 | 183–208 | 简单 | formatting、utility、time | 0 | 把起止时间戳格式化为可读的时间跨度，非法或缺省输入返回空串。 |
| humanizeEnumValue | 函数 | 107–116 | 简单 | utility、formatting、enum | 0 | 把下划线/短横线分隔的枚举值转换为可读文本。 |
| maybeLocalizedValue | 函数 | 142–161 | 简单 | i18n、utility、type-guard | 0 | 判定字段是枚举值还是已本地化对象，输出可直接渲染的字符串。 |
| nestedMetric | 函数 | 247–261 | 简单 | utility、narrowing、metrics | 0 | 沿键路径读取嵌套指标值，并在任一层缺失时安全返回空串。 |
| normalizeEvidenceRefKey | 函数 | 271–281 | 简单 | utility、dedupe、evidence | 0 | 把证据引用归一化为稳定键，用于跨产物去重。 |
| numericYear | 函数 | 210–240 | 简单 | parsing、utility、time | 0 | 从多种日期字段形态中提取四位年份，失败时返回空串。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchI18nContract.ts](../../../shared/synthesisWorkbenchI18nContract.ts.md) | src/shared/synthesisWorkbenchI18nContract.ts | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |
| [synthesisWorkbenchWireContract.ts](../../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ArtifactReader.tsx](ArtifactReader.tsx.md) | src/synthesis/components/reader/ArtifactReader.tsx | artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。 |
| [conceptOverlay.ts](conceptOverlay.ts.md) | src/synthesis/components/reader/conceptOverlay.ts | Reader 区域的概念覆盖机制：已渲染 markdown/分区内别名词元高亮、hover 气泡与报告概念导航投影。 |
| [DigestModal.tsx](DigestModal.tsx.md) | src/synthesis/components/reader/DigestModal.tsx | 论文 digest 模态：正文、大纲与导语块（来源变更警告 + 代表图）作为一个命令式 island 渲染。 |
| [EvidenceDrawer.tsx](EvidenceDrawer.tsx.md) | src/synthesis/components/reader/EvidenceDrawer.tsx | 证据浏览器与滑出抽屉：选中证据卡片、派生的声明/时间线/分类法反向链接。 |
| [markdownIsland.ts](markdownIsland.ts.md) | src/synthesis/components/reader/markdownIsland.ts | Reader 区域的命令式 markdown island：synthesis profile 渲染、纯文本回退与有界的概念/短码/digest 链接增强。 |
| [narrowing.ts](narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [ReaderRegion.tsx](ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |
| [sections.tsx](sections.tsx.md) | src/synthesis/components/reader/sections.tsx | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |
| [TimelineIsland.tsx](TimelineIsland.tsx.md) | src/synthesis/components/reader/TimelineIsland.tsx | 主题时间线 island：仅在时间线数据签名或选中证据变化时重建共享命令式渲染器的产出 DOM。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| enumLabel | 函数 | 129–140 | 结合 i18n 消息与枚举原值生成标签，缺失消息时回退为人类化文本。 |
| evidenceRefKeyVariants | 函数 | 289–294 | 产出证据引用的多种键形态，兼容不同宿主产物的命名差异。 |
| firstText | 函数 | 57–67 | 从结构化字段中取出第一段可展示文本，缺失时回退到空串。 |
| formatTimeSpan | 函数 | 183–208 | 把起止时间戳格式化为可读的时间跨度，非法或缺省输入返回空串。 |
| humanizeEnumValue | 函数 | 107–116 | 把下划线/短横线分隔的枚举值转换为可读文本。 |
| maybeLocalizedValue | 函数 | 142–161 | 判定字段是枚举值还是已本地化对象，输出可直接渲染的字符串。 |
| nestedMetric | 函数 | 247–261 | 沿键路径读取嵌套指标值，并在任一层缺失时安全返回空串。 |
| normalizeEvidenceRefKey | 函数 | 271–281 | 把证据引用归一化为稳定键，用于跨产物去重。 |
| numericYear | 函数 | 210–240 | 从多种日期字段形态中提取四位年份，失败时返回空串。 |
