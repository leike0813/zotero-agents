
# src/synthesis/synthesisSurfaceProjection.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/synthesis](../../../modules/src/synthesis.md)
<!-- node: file:src/synthesis/synthesisSurfaceProjection.ts -->

业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。
源码：[src/synthesis/synthesisSurfaceProjection.ts](../../../../../src/synthesis/synthesisSurfaceProjection.ts)

## 符号（1）
<!-- node: function:src/synthesis/synthesisSurfaceProjection.ts:projectBusinessSurface -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [projectBusinessSurface](../../../symbols/src/synthesis/synthesisSurfaceProjection.ts/projectBusinessSurface.md) | 函数 | 50–174 | 复杂 | projection、dispatch、synthesis、wire-contract | 1 | 按当前 tab 选择对应 surface 投影函数，把 wire 快照投影为该区域的 DTO。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ConceptsRegion.tsx](components/ConceptsRegion.tsx.md) | src/synthesis/components/ConceptsRegion.tsx | Synthesis Workbench 的 concepts 表面：概念筛选工具栏、缓存状态行、批量选择条、概念表与内联评审面板。 |
| [GraphRegion.tsx](components/graph/GraphRegion.tsx.md) | src/synthesis/components/graph/GraphRegion.tsx | Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。 |
| [HomeRegion.tsx](components/HomeRegion.tsx.md) | src/synthesis/components/HomeRegion.tsx | Synthesis Workbench 的 home / overview 表面：库洞察卡片、WebDAV 同步面板与热门主题网格。 |
| [narrowing.ts](components/reader/narrowing.ts.md) | src/synthesis/components/reader/narrowing.ts | Reader 表面全部 host-owned wire payload 的收窄投影：面板模型每次投影一次，区域组件只消费投影类型。 |
| [registryProjection.ts](registryProjection.ts.md) | src/synthesis/registryProjection.ts | 注册表区域选择态投影：把 wire 快照与本地 registry 行合成审阅选择 DTO，并提供空审阅状态的常量。 |
| [registryTypes.ts](components/registry/registryTypes.ts.md) | src/synthesis/components/registry/registryTypes.ts | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |
| [reviewCenterProjection.ts](components/reviewCenter/reviewCenterProjection.ts.md) | src/synthesis/components/reviewCenter/reviewCenterProjection.ts | 审阅中心投影层：把 wire 快照与 registry 行投影成引用匹配行、清理行、概念行与话题图审阅行，并派生目标候选分组与整体选择 DTO。 |
| [ReviewCenterRegion.tsx](components/reviewCenter/ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [synthesisExportProjection.ts](synthesisExportProjection.ts.md) | src/synthesis/synthesisExportProjection.ts | 导出能力投影：把当前图选择与阅读器选择整理为可导出的 payload，供 standalone 与导出按钮复用。 |
| [synthesisWorkbenchPanelModel.ts](synthesisWorkbenchPanelModel.ts.md) | src/synthesis/synthesisWorkbenchPanelModel.ts | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [synthesisWorkbenchTypes.ts](synthesisWorkbenchTypes.ts.md) | src/synthesis/synthesisWorkbenchTypes.ts | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |
| [TagsRegion.tsx](components/TagsRegion.tsx.md) | src/synthesis/components/TagsRegion.tsx | Synthesis Workbench 的 tags 表面：词汇表、待定收件箱、导入面板与全部标签批量编辑操作。 |
| [TopicsRegion.tsx](components/TopicsRegion.tsx.md) | src/synthesis/components/TopicsRegion.tsx | Synthesis Workbench 的 artifacts 表面：搜索排序工具栏、图/列表/网格视图切换与主题关系图嵌入。 |
| [topicsRegionData.ts](components/topicsRegionData.ts.md) | src/synthesis/components/topicsRegionData.ts | 话题区域数据层：收窄话题产物与图节点/边 DTO、构建关系审阅队列、计算话题图布局坐标，并派生本地化枚举文本与状态色调。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchPanelModel.ts](synthesisWorkbenchPanelModel.ts.md) | src/synthesis/synthesisWorkbenchPanelModel.ts | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [synthesisWorkbenchTypes.ts](synthesisWorkbenchTypes.ts.md) | src/synthesis/synthesisWorkbenchTypes.ts | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [projectBusinessSurface](../../../symbols/src/synthesis/synthesisSurfaceProjection.ts/projectBusinessSurface.md) | 函数 | 50–174 | 按当前 tab 选择对应 surface 投影函数，把 wire 快照投影为该区域的 DTO。 |
