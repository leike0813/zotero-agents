
# src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reviewCenter](../../../../../modules/src/synthesis/components/reviewCenter.md)
<!-- node: file:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx -->

审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。
源码：[src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx](../../../../../../../src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx)

## 符号（19）
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:CanonicalRevisionActions -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ConceptActionCell -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ConceptCandidatePills -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:equalReferenceReviewControl -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReferenceBulkActions -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReferencePendingControls -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReferenceProposalRowActions -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReferenceStatusStack -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReviewBadge -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:reviewCenterOperationKey -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReviewCenterRegion -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReviewCenterToolbar -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReviewCommandButton -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReviewEmptyState -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReviewLocalButton -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReviewPillList -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReviewSearchInput -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:ReviewSelect -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx:TopicGraphActionCell -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| CanonicalRevisionActions | 函数 | 955–993 | 中等 | component、review、canonical-revision | 0 | 规范修订审阅动作集合，按提案类型派发对应操作。 |
| ConceptActionCell | 函数 | 1021–1114 | 复杂 | component、review、concepts | 0 | 概念审阅动作单元格：逐候选接受/拒绝并展示影响范围。 |
| ConceptCandidatePills | 函数 | 999–1019 | 简单 | component、presentation、concepts | 0 | 以 pill 形式展示概念候选及其审阅状态。 |
| equalReferenceReviewControl | 函数 | 268–288 | 简单 | memoization、review、performance | 0 | 引用审阅控件的签名比较，防止无关状态变化触发重渲染。 |
| ReferenceBulkActions | 函数 | 752–825 | 复杂 | component、bulk-action、review | 0 | 引用批量接受/拒绝动作，按选择集合派发意图。 |
| ReferencePendingControls | 函数 | 705–750 | 中等 | component、review、pending-state | 0 | 引用审阅进行中控件组，按操作键展示进行中与禁用态。 |
| ReferenceProposalRowActions | 函数 | 827–924 | 复杂 | component、row-actions、review | 0 | 单条提案的动作集合：接受、拒绝、忽略与详情入口。 |
| ReferenceStatusStack | 函数 | 926–953 | 简单 | component、presentation、review | 0 | 状态堆叠展示：把一条记录的多个状态压缩为徽标行。 |
| ReviewBadge | 函数 | 376–385 | 简单 | component、ui-control、presentation | 0 | 审阅状态徽标。 |
| reviewCenterOperationKey | 函数 | 295–315 | 中等 | utility、action、dedupe、review | 0 | 派生审阅操作键，抑制同一操作在 pending 期间的重复派发。 |
| [ReviewCenterRegion](../../../../../symbols/src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx/ReviewCenterRegion.md) | 函数 | 1192–1880 | 复杂 | component、region、review、orchestration、memoization | 2 | 审阅中心主区域：按 tab 装配工具栏与各类审阅表格，维护选择与批量操作状态。 |
| ReviewCenterToolbar | 函数 | 540–698 | 复杂 | component、toolbar、review、bulk-action | 0 | 审阅中心工具栏：状态/搜索/动作筛选、批量动作与刷新命令的统一编排。 |
| ReviewCommandButton | 函数 | 454–489 | 中等 | component、action、ui-control | 0 | 派发宿主命令的按钮，处理禁用原因与 pending 态。 |
| ReviewEmptyState | 函数 | 387–403 | 简单 | component、empty-state、ui-control | 0 | 审阅区域空态占位，附带空态说明。 |
| ReviewLocalButton | 函数 | 492–511 | 简单 | component、action、ui-control | 0 | 仅修改本地审阅状态的按钮，不跨宿主边界。 |
| ReviewPillList | 函数 | 1116–1132 | 简单 | component、presentation、ui-control | 0 | 通用 pill 列表渲染，限制最大展示项数。 |
| ReviewSearchInput | 函数 | 429–451 | 简单 | component、ui-control、filter | 0 | 审阅搜索输入框，输出规范化关键词。 |
| ReviewSelect | 函数 | 405–424 | 简单 | component、ui-control、filter | 0 | 审阅筛选下拉控件。 |
| TopicGraphActionCell | 函数 | 1134–1186 | 中等 | component、review、graph | 0 | 话题图关系审阅动作单元格，按关系角色派发接受/拒绝。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [regionEquality.ts](../../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [reviewCenterProjection.ts](reviewCenterProjection.ts.md) | src/synthesis/components/reviewCenter/reviewCenterProjection.ts | 审阅中心投影层：把 wire 快照与 registry 行投影成引用匹配行、清理行、概念行与话题图审阅行，并派生目标候选分组与整体选择 DTO。 |
| [reviewCenterText.ts](reviewCenterText.ts.md) | src/synthesis/components/reviewCenter/reviewCenterText.ts | 审阅中心文案与本地化辅助：枚举键解析、文案回退、状态色调与操作标签的集中投影。 |
| [ReviewTargetPicker.tsx](ReviewTargetPicker.tsx.md) | src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx | 审阅目标选择浮层：按分组展示引用、主题与概念候选，支持搜索过滤、锚定定位和选中回调。 |
| [synthesisWorkbenchWireContract.ts](../../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [reviewCenterProjection.ts](reviewCenterProjection.ts.md) | src/synthesis/components/reviewCenter/reviewCenterProjection.ts | 审阅中心投影层：把 wire 快照与 registry 行投影成引用匹配行、清理行、概念行与话题图审阅行，并派生目标候选分组与整体选择 DTO。 |
| [ReviewTargetPicker.tsx](ReviewTargetPicker.tsx.md) | src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx | 审阅目标选择浮层：按分组展示引用、主题与概念候选，支持搜索过滤、锚定定位和选中回调。 |
| [synthesisSurfaceProjection.ts](../../synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [synthesisWorkbenchApp.ts](../../synthesisWorkbenchApp.ts.md) | src/synthesis/synthesisWorkbenchApp.ts | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |
| [synthesisWorkbenchChromeRenderer.ts](../../synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |
| [synthesisWorkbenchPanelModel.ts](../../synthesisWorkbenchPanelModel.ts.md) | src/synthesis/synthesisWorkbenchPanelModel.ts | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [synthesisWorkbenchTypes.ts](../../synthesisWorkbenchTypes.ts.md) | src/synthesis/synthesisWorkbenchTypes.ts | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [ReviewCenterRegion](../../../../../symbols/src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx/ReviewCenterRegion.md) | 函数 | 1192–1880 | 审阅中心主区域：按 tab 装配工具栏与各类审阅表格，维护选择与批量操作状态。 |
