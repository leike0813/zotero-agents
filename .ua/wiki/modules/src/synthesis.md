
# src/synthesis
> 目录聚合页：10 个文件、37 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/synthesis/registryProjection.ts](../../files/src/synthesis/registryProjection.ts.md) | 文件 | 1 | 注册表区域选择态投影：把 wire 快照与本地 registry 行合成审阅选择 DTO，并提供空审阅状态的常量。 |
| [src/synthesis/standaloneGraphApp.ts](../../files/src/synthesis/standaloneGraphApp.ts.md) | 文件 | 1 | 独立引用图谱页面的挂载入口：解析宿主快照、准备导出能力并把 GraphRegion 渲染到独立页面容器。 |
| [src/synthesis/standaloneGraphState.ts](../../files/src/synthesis/standaloneGraphState.ts.md) | 文件 | 2 | 独立图谱页面的图状态归一化与更新：收敛 wire 快照为本地图状态并应用增量更新。 |
| [src/synthesis/standaloneTopicApp.ts](../../files/src/synthesis/standaloneTopicApp.ts.md) | 文件 | 1 | 独立话题页面的挂载入口：组合 GraphRegion 与 ReaderRegion，只渲染所选话题所需的最小区域集合。 |
| [src/synthesis/synthesisExportProjection.ts](../../files/src/synthesis/synthesisExportProjection.ts.md) | 文件 | 2 | 导出能力投影：把当前图选择与阅读器选择整理为可导出的 payload，供 standalone 与导出按钮复用。 |
| [src/synthesis/synthesisSurfaceProjection.ts](../../files/src/synthesis/synthesisSurfaceProjection.ts.md) | 文件 | 1 | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [src/synthesis/synthesisWorkbenchApp.ts](../../files/src/synthesis/synthesisWorkbenchApp.ts.md) | 文件 | 6 | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |
| [src/synthesis/synthesisWorkbenchChromeRenderer.ts](../../files/src/synthesis/synthesisWorkbenchChromeRenderer.ts.md) | 文件 | 5 | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |
| [src/synthesis/synthesisWorkbenchPanelModel.ts](../../files/src/synthesis/synthesisWorkbenchPanelModel.ts.md) | 文件 | 18 | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [src/synthesis/synthesisWorkbenchTypes.ts](../../files/src/synthesis/synthesisWorkbenchTypes.ts.md) | 文件 | 0 | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |

## 子目录
- [components/graph](synthesis/components/graph.md)、[components/reader](synthesis/components/reader.md)、[components/registry](synthesis/components/registry.md)、[components/reviewCenter](synthesis/components/reviewCenter.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/shared](shared.md) | 18 |
| [src/synthesis/components](synthesis/components.md) | 17 |
| [src/synthesis/components/graph](synthesis/components/graph.md) | 11 |
| [src/synthesis/components/registry](synthesis/components/registry.md) | 9 |
| [src/synthesis/components/reviewCenter](synthesis/components/reviewCenter.md) | 8 |
| [src/synthesis/components/reader](synthesis/components/reader.md) | 5 |
