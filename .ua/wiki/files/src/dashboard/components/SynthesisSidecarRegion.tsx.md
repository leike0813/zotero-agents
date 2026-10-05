
# src/dashboard/components/SynthesisSidecarRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/dashboard/components](../../../../modules/src/dashboard/components.md)
<!-- node: file:src/dashboard/components/SynthesisSidecarRegion.tsx -->

Dashboard 的 Synthesis Sidecar trace 面板：汇总卡、trace 搜索过滤、命令式 trace 表 island，以及因果 trace 详情面板（span 树 + 复制）。所有筛选与选中状态都是页面本地 UI state，不产生宿主往返。
源码：[src/dashboard/components/SynthesisSidecarRegion.tsx](../../../../../../src/dashboard/components/SynthesisSidecarRegion.tsx)

## 符号（11）
<!-- node: function:src/dashboard/components/SynthesisSidecarRegion.tsx:filterSynthesisSidecarTraces -->
<!-- node: function:src/dashboard/components/SynthesisSidecarRegion.tsx:narrowSynthesisSidecarTraceSnapshot -->
<!-- node: function:src/dashboard/components/SynthesisSidecarRegion.tsx:rankSynthesisSidecarTraces -->
<!-- node: function:src/dashboard/components/SynthesisSidecarRegion.tsx:reconcileSynthesisSidecarTraceRows -->
<!-- node: function:src/dashboard/components/SynthesisSidecarRegion.tsx:resolveSynthesisSidecarVisibleTraces -->
<!-- node: function:src/dashboard/components/SynthesisSidecarRegion.tsx:synthesisSidecarEventDepths -->
<!-- node: function:src/dashboard/components/SynthesisSidecarRegion.tsx:synthesisSidecarOperationOptions -->
<!-- node: function:src/dashboard/components/SynthesisSidecarRegion.tsx:SynthesisSidecarRegion -->
<!-- node: function:src/dashboard/components/SynthesisSidecarRegion.tsx:SynthesisSidecarTraceDetail -->
<!-- node: function:src/dashboard/components/SynthesisSidecarRegion.tsx:synthesisSidecarTraceRowSignature -->
<!-- node: function:src/dashboard/components/SynthesisSidecarRegion.tsx:SynthesisSidecarTraceTableIsland -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| filterSynthesisSidecarTraces | 函数 | 414–426 | 简单 | filtering、trace | 0 | 按搜索文本过滤 trace 列表，匹配根操作、outcome 与 surface 名称。 |
| narrowSynthesisSidecarTraceSnapshot | 函数 | 286–313 | 中等 | validation、narrowing | 0 | 从 snapshot 的 unknown 槽位收窄出 trace 快照，缺失字段回退为安全的空快照。 |
| rankSynthesisSidecarTraces | 函数 | 388–402 | 简单 | ranking、trace | 0 | 按根操作身份、失败优先与时间新近度对 trace 排序，保证活跃与异常 trace 排在前面。 |
| reconcileSynthesisSidecarTraceRows | 函数 | 580–619 | 复杂 | reconciliation、performance、imperative-dom | 0 | 把新的可见 trace 列表与既有行 DOM 增量对齐：复用未变行、只更新变化的单元格，避免整表重建。 |
| resolveSynthesisSidecarVisibleTraces | 函数 | 449–474 | 中等 | composition、trace | 0 | 串联收窄、过滤与排序，得到受可见条数上限约束的最终 trace 列表。 |
| synthesisSidecarEventDepths | 函数 | 501–578 | 复杂 | projection、tree、trace | 0 | 由 trace 事件推导 span 树的父子深度与缩进层级，供详情面板渲染因果结构。 |
| synthesisSidecarOperationOptions | 函数 | 431–444 | 简单 | projection、filter-options | 0 | 由当前 trace 集合派生根操作下拉选项，作为多选筛选的取值域。 |
| SynthesisSidecarRegion | 函数 | 842–967 | 复杂 | component、memo、region | 0 | memo 化的 Synthesis Sidecar 区域组件：组合汇总卡、筛选工具栏、trace 表 island 与详情面板。 |
| SynthesisSidecarTraceDetail | 函数 | 674–840 | 复杂 | component、detail、tree | 0 | trace 详情面板：渲染 span 树、边界与 outcome 说明，并提供复制整条 trace 的操作。 |
| synthesisSidecarTraceRowSignature | 函数 | 477–489 | 简单 | signature、performance | 0 | 生成单条 trace 行的稳定签名，只包含行内可见字段，用于判断行是否需要重排。 |
| SynthesisSidecarTraceTableIsland | 函数 | 621–672 | 中等 | component、imperative-island、table | 0 | 命令式 trace 表 island：自管行 DOM、滚动锚点与选中行，卸载时清理 observer 与计时器。 |

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
| filterSynthesisSidecarTraces | 函数 | 414–426 | 按搜索文本过滤 trace 列表，匹配根操作、outcome 与 surface 名称。 |
| narrowSynthesisSidecarTraceSnapshot | 函数 | 286–313 | 从 snapshot 的 unknown 槽位收窄出 trace 快照，缺失字段回退为安全的空快照。 |
| rankSynthesisSidecarTraces | 函数 | 388–402 | 按根操作身份、失败优先与时间新近度对 trace 排序，保证活跃与异常 trace 排在前面。 |
| reconcileSynthesisSidecarTraceRows | 函数 | 580–619 | 把新的可见 trace 列表与既有行 DOM 增量对齐：复用未变行、只更新变化的单元格，避免整表重建。 |
| resolveSynthesisSidecarVisibleTraces | 函数 | 449–474 | 串联收窄、过滤与排序，得到受可见条数上限约束的最终 trace 列表。 |
| synthesisSidecarEventDepths | 函数 | 501–578 | 由 trace 事件推导 span 树的父子深度与缩进层级，供详情面板渲染因果结构。 |
| synthesisSidecarOperationOptions | 函数 | 431–444 | 由当前 trace 集合派生根操作下拉选项，作为多选筛选的取值域。 |
| SynthesisSidecarRegion | 函数 | 842–967 | memo 化的 Synthesis Sidecar 区域组件：组合汇总卡、筛选工具栏、trace 表 island 与详情面板。 |
| SynthesisSidecarTraceDetail | 函数 | 674–840 | trace 详情面板：渲染 span 树、边界与 outcome 说明，并提供复制整条 trace 的操作。 |
| synthesisSidecarTraceRowSignature | 函数 | 477–489 | 生成单条 trace 行的稳定签名，只包含行内可见字段，用于判断行是否需要重排。 |
| SynthesisSidecarTraceTableIsland | 函数 | 621–672 | 命令式 trace 表 island：自管行 DOM、滚动锚点与选中行，卸载时清理 observer 与计时器。 |
