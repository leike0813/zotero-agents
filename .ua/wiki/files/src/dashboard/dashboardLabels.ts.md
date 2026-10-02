
# src/dashboard/dashboardLabels.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/dashboard](../../../modules/src/dashboard.md)
<!-- node: file:src/dashboard/dashboardLabels.ts -->

Dashboard 页面的宿主标签解析器：宿主标签优先，其次显式 fallback，最后回退到 key 本身；未解析的裸 task-dashboard-* key 视为未翻译。
源码：[src/dashboard/dashboardLabels.ts](../../../../../src/dashboard/dashboardLabels.ts)

## 符号（1）
<!-- node: function:src/dashboard/dashboardLabels.ts:labelText -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| labelText | 函数 | 13–23 | 简单 | i18n、labels、utility | 0 | 解析一个宿主标签：命中且非未解析 key 时返回其值，否则返回 fallback 或 key。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardPanelModel.ts](dashboardPanelModel.ts.md) | src/dashboard/dashboardPanelModel.ts | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |
| [dashboardTypes.ts](dashboardTypes.ts.md) | src/dashboard/dashboardTypes.ts | Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| labelText | 函数 | 13–23 | 解析一个宿主标签：命中且非未解析 key 时返回其值，否则返回 fallback 或 key。 |
