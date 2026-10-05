
# src/dashboard/components/HomeRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/dashboard/components](../../../../modules/src/dashboard/components.md)
<!-- node: file:src/dashboard/components/HomeRegion.tsx -->

Dashboard 的 Home 面板：工作流气泡卡片、汇总统计、运行中任务表，以及点开某个工作流后的文档阅读视图，全部文案由 panel model 预先解析。
源码：[src/dashboard/components/HomeRegion.tsx](../../../../../../src/dashboard/components/HomeRegion.tsx)

## 符号（4）
<!-- node: function:src/dashboard/components/HomeRegion.tsx:HomeDocViewSection -->
<!-- node: function:src/dashboard/components/HomeRegion.tsx:HomeRegion -->
<!-- node: function:src/dashboard/components/HomeRegion.tsx:RunningTaskTable -->
<!-- node: function:src/dashboard/components/HomeRegion.tsx:WorkflowBubble -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| HomeDocViewSection | 函数 | 236–308 | 中等 | component、document、markdown | 0 | 工作流文档二级视图：以共享 Markdown renderer 渲染文档内容并提供返回首页的入口。 |
| HomeRegion | 函数 | 310–364 | 中等 | component、memo、region | 1 | memo 化的 Home 区域组件，按 signature 相等判断重渲染，组合气泡卡片、汇总卡、任务表与文档视图。 |
| RunningTaskTable | 函数 | 181–234 | 中等 | component、table、task-table | 0 | 运行中任务表：列出当前活跃任务，点击后派发打开任务的宿主动作。 |
| WorkflowBubble | 函数 | 115–179 | 中等 | component、card、workflow | 0 | 单个工作流气泡卡片：展示官方/核心徽标、标题与快捷运行、设置、打开文档三个入口。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardWireContract.ts](../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardChromeRenderer.ts](../dashboardChromeRenderer.ts.md) | src/dashboard/dashboardChromeRenderer.ts | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |
| [dashboardPanelModel.ts](../dashboardPanelModel.ts.md) | src/dashboard/dashboardPanelModel.ts | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |
| [dashboardTypes.ts](../dashboardTypes.ts.md) | src/dashboard/dashboardTypes.ts | Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [equalBySignature](../../../../symbols/src/shared/regionEquality.ts/equalBySignature.md) | src/shared/regionEquality.ts | 按签名判定两个区域 selection 是否等价，为同引用、null 合并与同类型原值提供与 stringify 等价的快路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| HomeRegion | 函数 | 310–364 | memo 化的 Home 区域组件，按 signature 相等判断重渲染，组合气泡卡片、汇总卡、任务表与文档视图。 |
