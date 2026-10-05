
# src/dashboard/components/AcpTraceReplayRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/dashboard/components](../../../../modules/src/dashboard/components.md)
<!-- node: file:src/dashboard/components/AcpTraceReplayRegion.tsx -->

Dashboard 的 ACP Trace & Replay 面板（Preact 区域）：上半部是语义 trace 录制器的源/限额配置与 arm-finish-cancel-save 生命周期，下半部是 replay profiler 的 trace 路径预检、阶段与节奏草稿、3×3 实测矩阵槽位及证据详情。
源码：[src/dashboard/components/AcpTraceReplayRegion.tsx](../../../../../../src/dashboard/components/AcpTraceReplayRegion.tsx)

## 符号（4）
<!-- node: function:src/dashboard/components/AcpTraceReplayRegion.tsx:AcpTraceReplayRegion -->
<!-- node: function:src/dashboard/components/AcpTraceReplayRegion.tsx:projectDashboardAcpReplayProfilerSelection -->
<!-- node: function:src/dashboard/components/AcpTraceReplayRegion.tsx:projectDashboardAcpTraceRecorderSelection -->
<!-- node: function:src/dashboard/components/AcpTraceReplayRegion.tsx:projectDashboardAcpTraceReplaySelection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AcpTraceReplayRegion | 函数 | 1134–1172 | 中等 | component、memo、region | 0 | memo 化的 ACP Trace & Replay 区域组件，按 signature 相等判断决定是否重渲染，并把所有 wire 动作回传给宿主绑定。 |
| projectDashboardAcpReplayProfilerSelection | 函数 | 388–613 | 复杂 | projection、acp、replay | 0 | 投影 replay profiler 的 selection：trace 文件路径、预检结论、阶段与节奏草稿、3×3 槽位矩阵的已完成/进行中状态及各 surface 汇总卡数据。 |
| projectDashboardAcpTraceRecorderSelection | 函数 | 207–386 | 复杂 | projection、acp、trace | 0 | 把录制器视图投影为可渲染 selection：解析 trace 源种类、字节/事件限额、当前录制状态与告警文案，产出按钮可用性与字段约束。 |
| projectDashboardAcpTraceReplaySelection | 函数 | 615–631 | 简单 | projection、composition | 0 | 合并录制器与 profiler 两个子面板的 selection，产出 AcpTraceReplayRegion 的统一入参。 |

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

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [SynthesisSidecarRegion.tsx](SynthesisSidecarRegion.tsx.md) | src/dashboard/components/SynthesisSidecarRegion.tsx | Dashboard 的 Synthesis Sidecar trace 面板：汇总卡、trace 搜索过滤、命令式 trace 表 island，以及因果 trace 详情面板（span 树 + 复制）。所有筛选与选中状态都是页面本地 UI state，不产生宿主往返。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| AcpTraceReplayRegion | 函数 | 1134–1172 | memo 化的 ACP Trace & Replay 区域组件，按 signature 相等判断决定是否重渲染，并把所有 wire 动作回传给宿主绑定。 |
| projectDashboardAcpReplayProfilerSelection | 函数 | 388–613 | 投影 replay profiler 的 selection：trace 文件路径、预检结论、阶段与节奏草稿、3×3 槽位矩阵的已完成/进行中状态及各 surface 汇总卡数据。 |
| projectDashboardAcpTraceRecorderSelection | 函数 | 207–386 | 把录制器视图投影为可渲染 selection：解析 trace 源种类、字节/事件限额、当前录制状态与告警文案，产出按钮可用性与字段约束。 |
| projectDashboardAcpTraceReplaySelection | 函数 | 615–631 | 合并录制器与 profiler 两个子面板的 selection，产出 AcpTraceReplayRegion 的统一入参。 |
