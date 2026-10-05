
# src/synthesis/synthesisExportProjection.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/synthesis](../../../modules/src/synthesis.md)
<!-- node: file:src/synthesis/synthesisExportProjection.ts -->

导出能力投影：把当前图选择与阅读器选择整理为可导出的 payload，供 standalone 与导出按钮复用。
源码：[src/synthesis/synthesisExportProjection.ts](../../../../../src/synthesis/synthesisExportProjection.ts)

## 符号（2）
<!-- node: function:src/synthesis/synthesisExportProjection.ts:projectGraphSelection -->
<!-- node: function:src/synthesis/synthesisExportProjection.ts:projectReaderSelection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| projectGraphSelection | 函数 | 22–35 | 简单 | projection、export、graph | 0 | 把当前图选择投影为导出 payload，含节点、边与可见性。 |
| projectReaderSelection | 函数 | 37–77 | 中等 | projection、export、reader | 1 | 把阅读器选择投影为导出 payload，汇总产物、概念与证据。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [graphModel.ts](components/graph/graphModel.ts.md) | src/synthesis/components/graph/graphModel.ts | Citation graph 表面的模型层：wire 快照的防御式收窄、纯视图逻辑与签名计算。 |
| [GraphRegion.tsx](components/graph/GraphRegion.tsx.md) | src/synthesis/components/graph/GraphRegion.tsx | Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。 |
| [narrowing.ts](components/reader/narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [synthesisWorkbenchPanelModel.ts](synthesisWorkbenchPanelModel.ts.md) | src/synthesis/synthesisWorkbenchPanelModel.ts | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [synthesisWorkbenchTypes.ts](synthesisWorkbenchTypes.ts.md) | src/synthesis/synthesisWorkbenchTypes.ts | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [standaloneGraphApp.ts](standaloneGraphApp.ts.md) | src/synthesis/standaloneGraphApp.ts | 独立引用图谱页面的挂载入口：解析宿主快照、准备导出能力并把 GraphRegion 渲染到独立页面容器。 |
| [standaloneTopicApp.ts](standaloneTopicApp.ts.md) | src/synthesis/standaloneTopicApp.ts | 独立话题页面的挂载入口：组合 GraphRegion 与 ReaderRegion，只渲染所选话题所需的最小区域集合。 |
| [synthesisSurfaceProjection.ts](synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| projectGraphSelection | 函数 | 22–35 | 把当前图选择投影为导出 payload，含节点、边与可见性。 |
| projectReaderSelection | 函数 | 37–77 | 把阅读器选择投影为导出 payload，汇总产物、概念与证据。 |
