
# equalBySignature
<!-- node: function:src/shared/regionEquality.ts:equalBySignature -->

按签名判定两个区域 selection 是否等价，为同引用、null 合并与同类型原值提供与 stringify 等价的快路径。
类型：函数  
复杂度：中等  
入边数：25  
标签：equality、memoization、signature、fast-path  
所属文件：[src/shared/regionEquality.ts](../../../../files/src/shared/regionEquality.ts.md)
源码：[src/shared/regionEquality.ts:24](../../../../../../src/shared/regionEquality.ts#L24)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ChromeRegion.tsx](../../../../files/src/synthesis/components/ChromeRegion.tsx.md) | src/synthesis/components/ChromeRegion.tsx:— | Synthesis Workbench 页面的 chrome 区域：底部动作状态栏、后台任务弹层与 sidecar 运行指示。 |
| [ConceptsRegion.tsx](../../../../files/src/synthesis/components/ConceptsRegion.tsx.md) | src/synthesis/components/ConceptsRegion.tsx:— | Synthesis Workbench 的 concepts 表面：概念筛选工具栏、缓存状态行、批量选择条、概念表与内联评审面板。 |
| [GraphRegion.tsx](../../../../files/src/synthesis/components/graph/GraphRegion.tsx.md) | src/synthesis/components/graph/GraphRegion.tsx:— | Synthesis Workbench 的 citation graph 表面：围绕命令式 Sigma island 的 Preact 边界与全部图控制、检视与覆盖层。 |
| [HomeRegion.tsx](../../../../files/src/synthesis/components/HomeRegion.tsx.md) | src/synthesis/components/HomeRegion.tsx:— | Synthesis Workbench 的 home / overview 表面：库洞察卡片、WebDAV 同步面板与热门主题网格。 |
| [ReaderRegion.tsx](../../../../files/src/synthesis/components/reader/ReaderRegion.tsx.md) | src/synthesis/components/reader/ReaderRegion.tsx:— | Reader 表面区域：topic detail 八个分区标签、证据抽屉、时间线 island、digest 模态与 artifact 阅读器。 |
| [RegistryRegion.tsx](../../../../files/src/synthesis/components/registry/RegistryRegion.tsx.md) | src/synthesis/components/registry/RegistryRegion.tsx:— | 注册表（Registry）主区域组件：装配索引表、canonical 工作台与审阅抽屉三个子区域，并提供缓存徽标、sidecar 命令和索引/工具筛选器。 |
| [ReviewCenterRegion.tsx](../../../../files/src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:— | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [ShellRegion.tsx](../../../../files/src/synthesis/components/ShellRegion.tsx.md) | src/synthesis/components/ShellRegion.tsx:— | Synthesis Workbench 页面的侧栏与顶栏外壳：导航标签、库标识与折叠开关。 |
| [TagsRegion.tsx](../../../../files/src/synthesis/components/TagsRegion.tsx.md) | src/synthesis/components/TagsRegion.tsx:— | Synthesis Workbench 的 tags 表面：词汇表、待定收件箱、导入面板与全部标签批量编辑操作。 |
| [TopicsRegion.tsx](../../../../files/src/synthesis/components/TopicsRegion.tsx.md) | src/synthesis/components/TopicsRegion.tsx:— | Synthesis Workbench 的 artifacts 表面：搜索排序工具栏、图/列表/网格视图切换与主题关系图嵌入。 |
| [contextDrawerEqualityInput](../../../../files/src/sidebar/components/regionEquality.ts.md) | src/sidebar/components/regionEquality.ts:184–200 | 上下文抽屉比较输入：分组键、任务键与各任务动作，构成抽屉的唯一重渲染依据。 |
| [detailsDrawerEqualityInput](../../../../files/src/sidebar/components/regionEquality.ts.md) | src/sidebar/components/regionEquality.ts:162–177 | 详情抽屉比较输入：区块标题、条目文本与开放状态。 |
| [permissionDrawerEqualityInput](../../../../files/src/sidebar/components/regionEquality.ts.md) | src/sidebar/components/regionEquality.ts:145–157 | 权限抽屉比较输入：只含待审批项的标识、选项与开放状态。 |

## 调用

该符号没有记录对外调用。
