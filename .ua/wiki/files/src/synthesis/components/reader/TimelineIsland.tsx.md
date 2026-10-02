
# src/synthesis/components/reader/TimelineIsland.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reader](../../../../../modules/src/synthesis/components/reader.md)
<!-- node: file:src/synthesis/components/reader/TimelineIsland.tsx -->

主题时间线 island：仅在时间线数据签名或选中证据变化时重建共享命令式渲染器的产出 DOM。
源码：[src/synthesis/components/reader/TimelineIsland.tsx](../../../../../../../src/synthesis/components/reader/TimelineIsland.tsx)

## 符号（3）
<!-- node: function:src/synthesis/components/reader/TimelineIsland.tsx:buildTimelineData -->
<!-- node: function:src/synthesis/components/reader/TimelineIsland.tsx:paragraphsNode -->
<!-- node: function:src/synthesis/components/reader/TimelineIsland.tsx:TopicTimelineIsland -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildTimelineData | 函数 | 41–83 | 中等 | projection、timeline、reader | 1 | 由 topic detail 投影构建共享时间线渲染器所需的 data 与 labels。 |
| paragraphsNode | 函数 | 17–30 | 简单 | dom、prose、timeline | 0 | 把多段文本拆分为 topic-prose 段落节点。 |
| TopicTimelineIsland | 函数 | 85–121 | 中等 | timeline-island、imperative、reader | 1 | 时间线 island 组件，仅在数据签名或选中证据变化时重建渲染器产出。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [narrowing.ts](narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [regionEquality.ts](../../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [topicTimelineRenderer.ts](../../../shared/topicTimelineRenderer.ts.md) | src/shared/topicTimelineRenderer.ts | 命令式的主题时间线渲染器：把论文与里程碑事件排布到年份轴上并产出可直接挂载的 DOM。 |
| [values.ts](values.ts.md) | src/synthesis/components/reader/values.ts | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ReaderRegion.tsx](ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| TopicTimelineIsland | 函数 | 85–121 | 时间线 island 组件，仅在数据签名或选中证据变化时重建渲染器产出。 |
