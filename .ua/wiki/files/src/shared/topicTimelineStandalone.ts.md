
# src/shared/topicTimelineStandalone.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/topicTimelineStandalone.ts -->

把主题时间线渲染器挂到 window 全局，供独立导出页在无宿主桥的情况下直接调用。
源码：[src/shared/topicTimelineStandalone.ts](../../../../../src/shared/topicTimelineStandalone.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [topicTimelineRenderer.ts](topicTimelineRenderer.ts.md) | src/shared/topicTimelineRenderer.ts | 命令式的主题时间线渲染器：把论文与里程碑事件排布到年份轴上并产出可直接挂载的 DOM。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hideTopicTimelineTooltip](topicTimelineRenderer.ts.md) | src/shared/topicTimelineRenderer.ts | 移除当前激活的时间线悬浮浮层，供独立导出页在外部调用。 |
| [renderTopicTimeline](../../../symbols/src/shared/topicTimelineRenderer.ts/renderTopicTimeline.md) | src/shared/topicTimelineRenderer.ts | 时间线渲染入口：组装摘要、轴、聚类与事件轨道，返回可直接挂载的根节点。 |
