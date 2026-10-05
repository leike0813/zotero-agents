
# src/synthesis/components/topicsRegionData.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components](../../../../modules/src/synthesis/components.md)
<!-- node: file:src/synthesis/components/topicsRegionData.ts -->

话题区域数据层：收窄话题产物与图节点/边 DTO、构建关系审阅队列、计算话题图布局坐标，并派生本地化枚举文本与状态色调。
源码：[src/synthesis/components/topicsRegionData.ts](../../../../../../src/synthesis/components/topicsRegionData.ts)

## 符号（13）
<!-- node: function:src/synthesis/components/topicsRegionData.ts:buildTopicRelationReviewQueue -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:compactReviewValue -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:computeTopicGraphLayout -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:localizedEnumText -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:narrowTopicArtifactRow -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:narrowTopicGraphEdge -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:narrowTopicGraphInspector -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:narrowTopicGraphNode -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:narrowTopicGraphRelationReviewItems -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:narrowTopicGraphSuggestedRelations -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:topicsHostCommandOperationKey -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:topicSourceMaterialsLabel -->
<!-- node: function:src/synthesis/components/topicsRegionData.ts:topicSourceMaterialsTone -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildTopicRelationReviewQueue | 函数 | 327–398 | 复杂 | projection、review、graph、queueing | 0 | 构建话题关系审阅队列：按角色与置信度排序并去重。 |
| compactReviewValue | 函数 | 680–706 | 中等 | utility、formatting、review | 0 | 把审阅值压缩为单行可读文本。 |
| computeTopicGraphLayout | 函数 | 435–553 | 复杂 | graph-layout、algorithm、deterministic、topics | 0 | 纯函数力导向布局：迭代收敛并回绕坐标，产出稳定节点位置。 |
| localizedEnumText | 函数 | 600–621 | 中等 | i18n、formatting、topics | 0 | 话题枚举文本本地化，带人类化回退。 |
| narrowTopicArtifactRow | 函数 | 72–95 | 简单 | narrowing、projection、topics | 0 | 收窄话题产物行，统一标题、类型与时间字段。 |
| narrowTopicGraphEdge | 函数 | 153–163 | 简单 | narrowing、graph、topics | 0 | 收窄话题图边，保留角色与端点引用。 |
| narrowTopicGraphInspector | 函数 | 190–227 | 中等 | narrowing、graph、inspection | 0 | 收窄话题图检视器数据：选中节点、邻居与关系角色。 |
| narrowTopicGraphNode | 函数 | 122–136 | 简单 | narrowing、graph、topics | 0 | 收窄话题图节点，限定坐标、角色与标签字段。 |
| narrowTopicGraphRelationReviewItems | 函数 | 278–299 | 简单 | narrowing、projection、review | 0 | 把建议关系转换为待审阅条目。 |
| narrowTopicGraphSuggestedRelations | 函数 | 244–263 | 简单 | narrowing、graph、review | 0 | 收窄系统建议的关系列表。 |
| topicsHostCommandOperationKey | 函数 | 721–739 | 简单 | utility、action、dedupe、topics | 0 | 派生话题区域宿主命令的操作键，用于抑制重复提交。 |
| topicSourceMaterialsLabel | 函数 | 634–647 | 简单 | i18n、formatting、topics | 0 | 生成来源材料状态的展示标签。 |
| topicSourceMaterialsTone | 函数 | 649–660 | 简单 | utility、presentation、topics | 0 | 把来源材料状态映射为徽标色调。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [synthesisWorkbenchI18nContract.ts](../../shared/synthesisWorkbenchI18nContract.ts.md) | src/shared/synthesisWorkbenchI18nContract.ts | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |
| [synthesisWorkbenchWireContract.ts](../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisSurfaceProjection.ts](../synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [TopicGraphPanel.tsx](TopicGraphPanel.tsx.md) | src/synthesis/components/TopicGraphPanel.tsx | Topics 表面内嵌的主题关系图面板：模式工具栏、SVG 画布、检视器侧栏与关系评审面板。 |
| [topicsControls.tsx](topicsControls.tsx.md) | src/synthesis/components/topicsControls.tsx | 话题区域共享控件：话题徽标、空态、宿主命令按钮、操作组和指标展示组件。 |
| [TopicsRegion.tsx](TopicsRegion.tsx.md) | src/synthesis/components/TopicsRegion.tsx | Synthesis Workbench 的 artifacts 表面：搜索排序工具栏、图/列表/网格视图切换与主题关系图嵌入。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildTopicRelationReviewQueue | 函数 | 327–398 | 构建话题关系审阅队列：按角色与置信度排序并去重。 |
| compactReviewValue | 函数 | 680–706 | 把审阅值压缩为单行可读文本。 |
| computeTopicGraphLayout | 函数 | 435–553 | 纯函数力导向布局：迭代收敛并回绕坐标，产出稳定节点位置。 |
| localizedEnumText | 函数 | 600–621 | 话题枚举文本本地化，带人类化回退。 |
| narrowTopicArtifactRow | 函数 | 72–95 | 收窄话题产物行，统一标题、类型与时间字段。 |
| narrowTopicGraphEdge | 函数 | 153–163 | 收窄话题图边，保留角色与端点引用。 |
| narrowTopicGraphInspector | 函数 | 190–227 | 收窄话题图检视器数据：选中节点、邻居与关系角色。 |
| narrowTopicGraphNode | 函数 | 122–136 | 收窄话题图节点，限定坐标、角色与标签字段。 |
| narrowTopicGraphRelationReviewItems | 函数 | 278–299 | 把建议关系转换为待审阅条目。 |
| narrowTopicGraphSuggestedRelations | 函数 | 244–263 | 收窄系统建议的关系列表。 |
| topicsHostCommandOperationKey | 函数 | 721–739 | 派生话题区域宿主命令的操作键，用于抑制重复提交。 |
| topicSourceMaterialsLabel | 函数 | 634–647 | 生成来源材料状态的展示标签。 |
| topicSourceMaterialsTone | 函数 | 649–660 | 把来源材料状态映射为徽标色调。 |
