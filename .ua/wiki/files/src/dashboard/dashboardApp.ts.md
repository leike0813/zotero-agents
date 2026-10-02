
# src/dashboard/dashboardApp.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/dashboard](../../../modules/src/dashboard.md)
<!-- node: file:src/dashboard/dashboardApp.ts -->

Dashboard 页面入口：负责引导启动、与宿主建立 postMessage 通道、发送 action，并把 DashboardSnapshot 投影为面板 DTO 后交给 chrome renderer 渲染。
源码：[src/dashboard/dashboardApp.ts](../../../../../src/dashboard/dashboardApp.ts)

## 符号（4）
<!-- node: function:src/dashboard/dashboardApp.ts:bootstrapDashboardApp -->
<!-- node: function:src/dashboard/dashboardApp.ts:createDashboardController -->
<!-- node: function:src/dashboard/dashboardApp.ts:createInitialUiState -->
<!-- node: function:src/dashboard/dashboardApp.ts:sendDashboardAction -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bootstrapDashboardApp | 函数 | 231–288 | 中等 | bootstrap、entry-point、wiring | 0 | 页面引导：adopt 页面根容器、绑定宿主消息监听、创建 controller 与 renderer，并向上发送 ready 声明。 |
| createDashboardController | 函数 | 71–229 | 复杂 | controller、state-management、projection | 0 | Dashboard 核心 controller：接收宿主 init/snapshot 消息，合并本地 UI 状态，投影面板 DTO 并驱动 chrome renderer，同时处理页面本地动作。 |
| createInitialUiState | 函数 | 57–69 | 简单 | factory、default-state | 0 | 构造 Dashboard 页面初始 UI 状态：默认 tab 与空白的 sidecar 筛选与选中。 |
| sendDashboardAction | 函数 | 30–50 | 简单 | message-protocol、action-dispatch | 0 | 把 dashboard 动作封装为 postMessage 信封投递到 parent/top/opener，并按引用去重。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardChromeRenderer.ts](dashboardChromeRenderer.ts.md) | src/dashboard/dashboardChromeRenderer.ts | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |
| [dashboardPanelModel.ts](dashboardPanelModel.ts.md) | src/dashboard/dashboardPanelModel.ts | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |
| [dashboardTypes.ts](dashboardTypes.ts.md) | src/dashboard/dashboardTypes.ts | Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。 |
| [dashboardWireContract.ts](../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardChromeRenderer.ts](dashboardChromeRenderer.ts.md) | src/dashboard/dashboardChromeRenderer.ts | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| bootstrapDashboardApp | 函数 | 231–288 | 页面引导：adopt 页面根容器、绑定宿主消息监听、创建 controller 与 renderer，并向上发送 ready 声明。 |
| createDashboardController | 函数 | 71–229 | Dashboard 核心 controller：接收宿主 init/snapshot 消息，合并本地 UI 状态，投影面板 DTO 并驱动 chrome renderer，同时处理页面本地动作。 |
| sendDashboardAction | 函数 | 30–50 | 把 dashboard 动作封装为 postMessage 信封投递到 parent/top/opener，并按引用去重。 |
