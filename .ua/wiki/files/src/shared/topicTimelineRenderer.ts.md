
# src/shared/topicTimelineRenderer.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/topicTimelineRenderer.ts -->

命令式的主题时间线渲染器：把论文与里程碑事件排布到年份轴上并产出可直接挂载的 DOM。
源码：[src/shared/topicTimelineRenderer.ts](../../../../../src/shared/topicTimelineRenderer.ts)

## 符号（14）
<!-- node: function:src/shared/topicTimelineRenderer.ts:currentPaperMatches -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:el -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:hideTopicTimelineTooltip -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:normalizeEvent -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:normalizePaper -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:renderTimelineClusters -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:renderTimelineEventPopover -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:renderTopicTimeline -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:showTimelineTooltip -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:timelineAxisTicks -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:timelineDenseMarkerKeys -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:timelineItemSortKey -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:timelineLayoutFromItems -->
<!-- node: function:src/shared/topicTimelineRenderer.ts:timelinePaperLeft -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| currentPaperMatches | 函数 | 359–368 | 简单 | predicate、timeline、current-item | 0 | 判定某论文项是否对应当前 Zotero 条目，用于当前文献高亮。 |
| el | 函数 | 112–121 | 简单 | dom、utility、factory | 0 | 创建带类名与可选文本的 HTMLElement，简化时间线 DOM 构造。 |
| hideTopicTimelineTooltip | 函数 | 277–280 | 简单 | tooltip、cleanup、standalone | 1 | 移除当前激活的时间线悬浮浮层，供独立导出页在外部调用。 |
| normalizeEvent | 函数 | 326–343 | 中等 | normalization、timeline、projection | 1 | 把 wire 里程碑事件规范化为时间线渲染所需的内部项形状。 |
| normalizePaper | 函数 | 308–324 | 中等 | normalization、timeline、projection | 1 | 把 wire 论文条目规范化为时间线渲染所需的内部项形状。 |
| [renderTimelineClusters](../../../symbols/src/shared/topicTimelineRenderer.ts/renderTimelineClusters.md) | 函数 | 370–475 | 复杂 | rendering、timeline、cluster、imperative | 1 | 渲染按年份聚类的论文标记组，处理标签碰撞、密集年份与当前文献钉标。 |
| renderTimelineEventPopover | 函数 | 257–268 | 简单 | popover、timeline、imperative | 0 | 构建并挂载里程碑事件的悬浮详情浮层。 |
| [renderTopicTimeline](../../../symbols/src/shared/topicTimelineRenderer.ts/renderTopicTimeline.md) | 函数 | 477–554 | 复杂 | entry-point、timeline、rendering | 2 | 时间线渲染入口：组装摘要、轴、聚类与事件轨道，返回可直接挂载的根节点。 |
| showTimelineTooltip | 函数 | 282–306 | 中等 | tooltip、imperative、timeline | 1 | 在指定标记旁展示悬浮浮层，并在新的交互到来时复用单例容器。 |
| timelineAxisTicks | 函数 | 180–190 | 简单 | timeline、axis、ticks | 0 | 按可用宽度与最小年份间距挑选需要渲染的年份刻度。 |
| timelineDenseMarkerKeys | 函数 | 228–244 | 中等 | timeline、density、labeling | 1 | 在标记过密的年份区间挑选需要保留标签的标记键，避免标签互相覆盖。 |
| timelineItemSortKey | 函数 | 213–226 | 简单 | sorting、timeline、pure | 0 | 构造论文与里程碑共用的排序键，保证同年份内顺序稳定。 |
| timelineLayoutFromItems | 函数 | 142–178 | 中等 | layout、timeline、pure | 1 | 由排布项计算年份范围、像素宽度与同年份聚合区间，形成时间线布局基准。 |
| timelinePaperLeft | 函数 | 201–211 | 简单 | layout、timeline、positioning | 0 | 把论文项的年份与顺序换算成轨道上的像素左偏移。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [narrowing.ts](../synthesis/components/reader/narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [TimelineIsland.tsx](../synthesis/components/reader/TimelineIsland.tsx.md) | src/synthesis/components/reader/TimelineIsland.tsx | 主题时间线 island：仅在时间线数据签名或选中证据变化时重建共享命令式渲染器的产出 DOM。 |
| [topicTimelineStandalone.ts](topicTimelineStandalone.ts.md) | src/shared/topicTimelineStandalone.ts | 把主题时间线渲染器挂到 window 全局，供独立导出页在无宿主桥的情况下直接调用。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| hideTopicTimelineTooltip | 函数 | 277–280 | 移除当前激活的时间线悬浮浮层，供独立导出页在外部调用。 |
| [renderTopicTimeline](../../../symbols/src/shared/topicTimelineRenderer.ts/renderTopicTimeline.md) | 函数 | 477–554 | 时间线渲染入口：组装摘要、轴、聚类与事件轨道，返回可直接挂载的根节点。 |
