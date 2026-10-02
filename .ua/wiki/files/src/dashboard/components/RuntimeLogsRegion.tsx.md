
# src/dashboard/components/RuntimeLogsRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/dashboard/components](../../../../modules/src/dashboard/components.md)
<!-- node: file:src/dashboard/components/RuntimeLogsRegion.tsx -->

Dashboard 的 Runtime Logs 面板：日志级别复选、后端/工作流多选下拉、诊断模式开关、上下文范围 chips、预算行、复制与清空操作，以及带详情面板的日志表。
源码：[src/dashboard/components/RuntimeLogsRegion.tsx](../../../../../../src/dashboard/components/RuntimeLogsRegion.tsx)

## 符号（5）
<!-- node: function:src/dashboard/components/RuntimeLogsRegion.tsx:formatRuntimeLogTimestamp -->
<!-- node: function:src/dashboard/components/RuntimeLogsRegion.tsx:LogsCopyButton -->
<!-- node: function:src/dashboard/components/RuntimeLogsRegion.tsx:LogsTableIsland -->
<!-- node: function:src/dashboard/components/RuntimeLogsRegion.tsx:RuntimeLogsRegion -->
<!-- node: class:src/dashboard/components/RuntimeLogsRegion.tsx:RuntimeLogsTableIsland -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| formatRuntimeLogTimestamp | 函数 | 141–167 | 中等 | formatting、utility | 0 | 格式化运行日志时间戳，兼容毫秒数、ISO 字符串与缺失值三种输入。 |
| LogsCopyButton | 函数 | 199–234 | 中等 | component、clipboard | 0 | 日志复制按钮：按当前筛选结果复制日志文本，并通过 toast 反馈成功或失败。 |
| LogsTableIsland | 函数 | 655–702 | 中等 | component、island、mount | 0 | 日志表 island 的 React 边界壳：把 RuntimeLogsTableIsland 挂到 managed mount 并在卸载时清理监听。 |
| [RuntimeLogsRegion](../../../../symbols/src/dashboard/components/RuntimeLogsRegion.tsx/RuntimeLogsRegion.md) | 函数 | 714–950 | 复杂 | component、memo、region | 1 | memo 化的 Runtime Logs 区域组件：组合筛选工具栏、复制/清空操作与日志表 island，并处理详情面板展开。 |
| RuntimeLogsTableIsland | 类 | 259–653 | 复杂 | component、imperative-island、table、performance | 0 | 命令式日志表 island：自管 DOM 行、滚动与选中行身份，接收新的行签名时只做局部重排而不重建整表。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [customSelect.tsx](../../shared/customSelect.tsx.md) | src/shared/customSelect.tsx | 插件各 HTML 页面共用的纯 DOM 下拉控件：Zotero 对话框窗口无法弹出原生 select 弹层，因此提供完全受控的单选与多选实现，保留被淘汰 vendor 组件的 .custom-select* class 契约。 |
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
| formatRuntimeLogTimestamp | 函数 | 141–167 | 格式化运行日志时间戳，兼容毫秒数、ISO 字符串与缺失值三种输入。 |
| [RuntimeLogsRegion](../../../../symbols/src/dashboard/components/RuntimeLogsRegion.tsx/RuntimeLogsRegion.md) | 函数 | 714–950 | memo 化的 Runtime Logs 区域组件：组合筛选工具栏、复制/清空操作与日志表 island，并处理详情面板展开。 |
