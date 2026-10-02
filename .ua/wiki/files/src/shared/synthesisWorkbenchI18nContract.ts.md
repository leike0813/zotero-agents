
# src/shared/synthesisWorkbenchI18nContract.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/synthesisWorkbenchI18nContract.ts -->

把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。
源码：[src/shared/synthesisWorkbenchI18nContract.ts](../../../../../src/shared/synthesisWorkbenchI18nContract.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ConceptsRegion.tsx](../synthesis/components/ConceptsRegion.tsx.md) | src/synthesis/components/ConceptsRegion.tsx | Synthesis Workbench 的 concepts 表面：概念筛选工具栏、缓存状态行、批量选择条、概念表与内联评审面板。 |
| [graphModel.ts](../synthesis/components/graph/graphModel.ts.md) | src/synthesis/components/graph/graphModel.ts | Citation graph 表面的模型层：wire 快照的防御式收窄、纯视图逻辑与签名计算。 |
| [GraphRegion.tsx](../synthesis/components/graph/GraphRegion.tsx.md) | src/synthesis/components/graph/GraphRegion.tsx | Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。 |
| [HomeRegion.tsx](../synthesis/components/HomeRegion.tsx.md) | src/synthesis/components/HomeRegion.tsx | Synthesis Workbench 的 home / overview 表面：库洞察卡片、WebDAV 同步面板与热门主题网格。 |
| [registryTypes.ts](../synthesis/components/registry/registryTypes.ts.md) | src/synthesis/components/registry/registryTypes.ts | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |
| [reviewCenterText.ts](../synthesis/components/reviewCenter/reviewCenterText.ts.md) | src/synthesis/components/reviewCenter/reviewCenterText.ts | 审阅中心文案与本地化辅助：枚举键解析、文案回退、状态色调与操作标签的集中投影。 |
| [standaloneGraphApp.ts](../synthesis/standaloneGraphApp.ts.md) | src/synthesis/standaloneGraphApp.ts | 独立引用图谱页面的挂载入口：解析宿主快照、准备导出能力并把 GraphRegion 渲染到独立页面容器。 |
| [standaloneTopicApp.ts](../synthesis/standaloneTopicApp.ts.md) | src/synthesis/standaloneTopicApp.ts | 独立话题页面的挂载入口：组合 GraphRegion 与 ReaderRegion，只渲染所选话题所需的最小区域集合。 |
| [synthesisWorkbenchApp.ts](../synthesis/synthesisWorkbenchApp.ts.md) | src/synthesis/synthesisWorkbenchApp.ts | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |
| [synthesisWorkbenchPanelModel.ts](../synthesis/synthesisWorkbenchPanelModel.ts.md) | src/synthesis/synthesisWorkbenchPanelModel.ts | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [TagsRegion.tsx](../synthesis/components/TagsRegion.tsx.md) | src/synthesis/components/TagsRegion.tsx | Synthesis Workbench 的 tags 表面：词汇表、待定收件箱、导入面板与全部标签批量编辑操作。 |
| [topicsRegionData.ts](../synthesis/components/topicsRegionData.ts.md) | src/synthesis/components/topicsRegionData.ts | 话题区域数据层：收窄话题产物与图节点/边 DTO、构建关系审阅队列、计算话题图布局坐标，并派生本地化枚举文本与状态色调。 |
| [values.ts](../synthesis/components/reader/values.ts.md) | src/synthesis/components/reader/values.ts | Synthesis 阅读器区域的取值与格式化工具集：把 wire DTO 中的松散结构安全地收敛为文本、数字、枚举标签与时间跨度，并为证据引用生成稳定的去重键。 |
