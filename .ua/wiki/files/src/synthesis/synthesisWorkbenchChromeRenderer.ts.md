
# src/synthesis/synthesisWorkbenchChromeRenderer.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/synthesis](../../../modules/src/synthesis.md)
<!-- node: file:src/synthesis/synthesisWorkbenchChromeRenderer.ts -->

工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。
源码：[src/synthesis/synthesisWorkbenchChromeRenderer.ts](../../../../../src/synthesis/synthesisWorkbenchChromeRenderer.ts)

## 符号（5）
<!-- node: function:src/synthesis/synthesisWorkbenchChromeRenderer.ts:createElement -->
<!-- node: function:src/synthesis/synthesisWorkbenchChromeRenderer.ts:createSynthesisWorkbenchChromeRenderer -->
<!-- node: function:src/synthesis/synthesisWorkbenchChromeRenderer.ts:ensureSynthesisSkeleton -->
<!-- node: function:src/synthesis/synthesisWorkbenchChromeRenderer.ts:setGraphMountActive -->
<!-- node: function:src/synthesis/synthesisWorkbenchChromeRenderer.ts:SurfacePlaceholder -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createElement | 函数 | 75–84 | 简单 | utility、dom、renderer | 0 | 创建带类名与属性的 DOM 元素，简化骨架构建。 |
| createSynthesisWorkbenchChromeRenderer | 函数 | 235–488 | 复杂 | renderer、factory、preact、memoization | 0 | chrome 渲染器工厂：按各区域 signature 独立挂载与更新 Preact 区域。 |
| ensureSynthesisSkeleton | 函数 | 86–195 | 复杂 | renderer、dom、scaffold | 0 | 按需创建工作台页面骨架 DOM，重复调用不会重建已有容器。 |
| setGraphMountActive | 函数 | 218–233 | 简单 | renderer、graph、dom | 0 | 切换图区域挂载点的启用状态，避免非图 surface 干扰图容器。 |
| SurfacePlaceholder | 函数 | 197–216 | 简单 | component、placeholder、renderer | 0 | surface 未加载时的占位容器，保留区域挂载点。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ChromeRegion.tsx](components/ChromeRegion.tsx.md) | src/synthesis/components/ChromeRegion.tsx | Synthesis Workbench 页面的 chrome 区域：底部动作状态栏、后台任务弹层与 sidecar 运行指示。 |
| [ConceptsRegion.tsx](components/ConceptsRegion.tsx.md) | src/synthesis/components/ConceptsRegion.tsx | Synthesis Workbench 的 concepts 表面：概念筛选工具栏、缓存状态行、批量选择条、概念表与内联评审面板。 |
| [GraphRegion.tsx](components/graph/GraphRegion.tsx.md) | src/synthesis/components/graph/GraphRegion.tsx | Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。 |
| [HomeRegion.tsx](components/HomeRegion.tsx.md) | src/synthesis/components/HomeRegion.tsx | Synthesis Workbench 的 home / overview 表面：库洞察卡片、WebDAV 同步面板与热门主题网格。 |
| [preactRegionMount.ts](../shared/preactRegionMount.ts.md) | src/shared/preactRegionMount.ts | 与页面无关的 managed-region 挂载辅助：为按区域独立渲染的 Preact 页面创建并定位 managed mount 子节点，并给区域容器打上通用 data 属性。 |
| [ReaderRegion.tsx](components/reader/ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |
| [regionEquality.ts](../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [RegistryRegion.tsx](components/registry/RegistryRegion.tsx.md) | src/synthesis/components/registry/RegistryRegion.tsx | 注册表（Registry）主区域组件：装配索引表、canonical 工作台与审阅抽屉三个子区域，并提供缓存徽标、sidecar 命令和索引/工具筛选器。 |
| [ReviewCenterRegion.tsx](components/reviewCenter/ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [ShellRegion.tsx](components/ShellRegion.tsx.md) | src/synthesis/components/ShellRegion.tsx | Synthesis Workbench 页面的侧栏与顶栏外壳：导航标签、库标识与折叠开关。 |
| [sigmaIsland.ts](components/graph/sigmaIsland.ts.md) | src/synthesis/components/graph/sigmaIsland.ts | Citation graph 表面的命令式 Sigma island，跨区域重渲染持有 graphology 模型与 Sigma 渲染器。 |
| [synthesisWorkbenchPanelModel.ts](synthesisWorkbenchPanelModel.ts.md) | src/synthesis/synthesisWorkbenchPanelModel.ts | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [synthesisWorkbenchTypes.ts](synthesisWorkbenchTypes.ts.md) | src/synthesis/synthesisWorkbenchTypes.ts | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |
| [synthesisWorkbenchWireContract.ts](../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |
| [TagsRegion.tsx](components/TagsRegion.tsx.md) | src/synthesis/components/TagsRegion.tsx | Synthesis Workbench 的 tags 表面：词汇表、待定收件箱、导入面板与全部标签批量编辑操作。 |
| [TopicsRegion.tsx](components/TopicsRegion.tsx.md) | src/synthesis/components/TopicsRegion.tsx | Synthesis Workbench 的 artifacts 表面：搜索排序工具栏、图/列表/网格视图切换与主题关系图嵌入。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchApp.ts](synthesisWorkbenchApp.ts.md) | src/synthesis/synthesisWorkbenchApp.ts | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisWorkbenchChromeRenderer | 函数 | 235–488 | chrome 渲染器工厂：按各区域 signature 独立挂载与更新 Preact 区域。 |
