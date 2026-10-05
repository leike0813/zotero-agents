
# src/shared/synthesisWorkbenchWireContract.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/synthesisWorkbenchWireContract.ts -->

Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。
源码：[src/shared/synthesisWorkbenchWireContract.ts](../../../../../src/shared/synthesisWorkbenchWireContract.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [synthesisCitationGraphWindow.ts](synthesisCitationGraphWindow.ts.md) | src/shared/synthesisCitationGraphWindow.ts | Citation Graph 窗口模型：定义有界窗口状态（generation、cursor、hover-only 集合与总量计数）与严格的 patch 合并规则，是宿主与页面共享的图谱分页数据契约。 |
| [synthesisWorkbenchI18n.ts](../synthesisWorkbenchI18n.ts.md) | src/synthesisWorkbenchI18n.ts | Synthesis 工作台文案目录：以默认英文消息表为 SSOT，定义全部消息键，并把 sidecar 失败码投影为用户可读的失败卡片文案。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ChromeRegion.tsx](../synthesis/components/ChromeRegion.tsx.md) | src/synthesis/components/ChromeRegion.tsx | Synthesis Workbench 页面的 chrome 区域：底部动作状态栏、后台任务弹层与 sidecar 运行指示。 |
| [ConceptsRegion.tsx](../synthesis/components/ConceptsRegion.tsx.md) | src/synthesis/components/ConceptsRegion.tsx | Synthesis Workbench 的 concepts 表面：概念筛选工具栏、缓存状态行、批量选择条、概念表与内联评审面板。 |
| [HomeRegion.tsx](../synthesis/components/HomeRegion.tsx.md) | src/synthesis/components/HomeRegion.tsx | Synthesis Workbench 的 home / overview 表面：库洞察卡片、WebDAV 同步面板与热门主题网格。 |
| [narrowing.ts](../synthesis/components/reader/narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [ReaderRegion.tsx](../synthesis/components/reader/ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |
| [registryTypes.ts](../synthesis/components/registry/registryTypes.ts.md) | src/synthesis/components/registry/registryTypes.ts | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |
| [reviewCenterProjection.ts](../synthesis/components/reviewCenter/reviewCenterProjection.ts.md) | src/synthesis/components/reviewCenter/reviewCenterProjection.ts | 审阅中心投影层：把 wire 快照与 registry 行投影成引用匹配行、清理行、概念行与话题图审阅行，并派生目标候选分组与整体选择 DTO。 |
| [ReviewCenterRegion.tsx](../synthesis/components/reviewCenter/ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [reviewCenterWire.ts](../synthesis/components/reviewCenter/reviewCenterWire.ts.md) | src/synthesis/components/reviewCenter/reviewCenterWire.ts | 审阅中心 wire 边界收窄：把宿主快照中的可选字段收窄为受控的合并目标与审阅快照形状。 |
| [sections.tsx](../synthesis/components/reader/sections.tsx.md) | src/synthesis/components/reader/sections.tsx | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |
| [ShellRegion.tsx](../synthesis/components/ShellRegion.tsx.md) | src/synthesis/components/ShellRegion.tsx | Synthesis Workbench 页面的侧栏与顶栏外壳：导航标签、库标识与折叠开关。 |
| [standaloneGraphApp.ts](../synthesis/standaloneGraphApp.ts.md) | src/synthesis/standaloneGraphApp.ts | 独立引用图谱页面的挂载入口：解析宿主快照、准备导出能力并把 GraphRegion 渲染到独立页面容器。 |
| [standaloneGraphState.ts](../synthesis/standaloneGraphState.ts.md) | src/synthesis/standaloneGraphState.ts | 独立图谱页面的图状态归一化与更新：收敛 wire 快照为本地图状态并应用增量更新。 |
| [standaloneTopicApp.ts](../synthesis/standaloneTopicApp.ts.md) | src/synthesis/standaloneTopicApp.ts | 独立话题页面的挂载入口：组合 GraphRegion 与 ReaderRegion，只渲染所选话题所需的最小区域集合。 |
| [synthesisWorkbenchApp.ts](../synthesis/synthesisWorkbenchApp.ts.md) | src/synthesis/synthesisWorkbenchApp.ts | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |
| [synthesisWorkbenchChromeRenderer.ts](../synthesis/synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |
| [synthesisWorkbenchPanelModel.ts](../synthesis/synthesisWorkbenchPanelModel.ts.md) | src/synthesis/synthesisWorkbenchPanelModel.ts | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [synthesisWorkbenchTab.ts](../modules/synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [synthesisWorkbenchTypes.ts](../synthesis/synthesisWorkbenchTypes.ts.md) | src/synthesis/synthesisWorkbenchTypes.ts | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |
| [TagsRegion.tsx](../synthesis/components/TagsRegion.tsx.md) | src/synthesis/components/TagsRegion.tsx | Synthesis Workbench 的 tags 表面：词汇表、待定收件箱、导入面板与全部标签批量编辑操作。 |
| [TopicGraphPanel.tsx](../synthesis/components/TopicGraphPanel.tsx.md) | src/synthesis/components/TopicGraphPanel.tsx | Topics 表面内嵌的主题关系图面板：模式工具栏、SVG 画布、检视器侧栏与关系评审面板。 |
| [topicsControls.tsx](../synthesis/components/topicsControls.tsx.md) | src/synthesis/components/topicsControls.tsx | 话题区域共享控件：话题徽标、空态、宿主命令按钮、操作组和指标展示组件。 |
| [TopicsRegion.tsx](../synthesis/components/TopicsRegion.tsx.md) | src/synthesis/components/TopicsRegion.tsx | Synthesis Workbench 的 artifacts 表面：搜索排序工具栏、图/列表/网格视图切换与主题关系图嵌入。 |
| [topicsRegionData.ts](../synthesis/components/topicsRegionData.ts.md) | src/synthesis/components/topicsRegionData.ts | 话题区域数据层：收窄话题产物与图节点/边 DTO、构建关系审阅队列、计算话题图布局坐标，并派生本地化枚举文本与状态色调。 |
| [uiModel.ts](../modules/synthesis/uiModel.ts.md) | src/modules/synthesis/uiModel.ts | Synthesis 工作台的 UI 状态模型：把 workbench 契约快照规范化为可渲染的行集合，实现 topic / concept / tag / graph / review / registry 各面板的筛选与派生逻辑，并用纯函数 reducer 处理全部工作台 action。 |
| [values.ts](../synthesis/components/reader/values.ts.md) | src/synthesis/components/reader/values.ts | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |
