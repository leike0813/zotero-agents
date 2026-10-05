
# src/synthesis/components/reviewCenter/reviewCenterProjection.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reviewCenter](../../../../../modules/src/synthesis/components/reviewCenter.md)
<!-- node: file:src/synthesis/components/reviewCenter/reviewCenterProjection.ts -->

审阅中心投影层：把 wire 快照与 registry 行投影成引用匹配行、清理行、概念行与话题图审阅行，并派生目标候选分组与整体选择 DTO。
源码：[src/synthesis/components/reviewCenter/reviewCenterProjection.ts](../../../../../../../src/synthesis/components/reviewCenter/reviewCenterProjection.ts)

## 符号（16）
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:buildRegistryReviewLookup -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:candidateBindingLabel -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:candidateProjectedId -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:filterReviewCenterTargetCandidates -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:projectCleanupRows -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:projectConceptRows -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:projectPickerProposalMeta -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:projectReferenceMatchingRows -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:projectSynthesisReviewCenterSelection -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:projectTargetCandidates -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:projectTopicGraphRows -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:referenceMatchProposalContext -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:reviewSearchMatches -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:reviewStatusMatches -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:targetPaperRefForProposal -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterProjection.ts:topicGraphReviewRows -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRegistryReviewLookup | 函数 | 150–181 | 中等 | projection、indexing、review、performance | 0 | 构建按文献键索引的审阅上下文表，供匹配行与清理行复用。 |
| candidateBindingLabel | 函数 | 455–473 | 简单 | utility、formatting、review | 0 | 生成候选与已绑定条目的对照标签。 |
| candidateProjectedId | 函数 | 427–447 | 简单 | utility、identity、review | 0 | 为审阅目标候选生成稳定的投影 ID。 |
| filterReviewCenterTargetCandidates | 函数 | 522–547 | 中等 | filter、review、search | 0 | 按关键词与分组过滤候选目标，输出匹配后的子集。 |
| projectCleanupRows | 函数 | 352–415 | 复杂 | projection、data-table、review | 0 | 把遗留清理提案投影为表格行，标注影响范围与可撤销性。 |
| projectConceptRows | 函数 | 561–610 | 复杂 | projection、review、concepts | 0 | 把概念候选投影为审阅行，含概念名、来源与状态。 |
| projectPickerProposalMeta | 函数 | 272–291 | 简单 | projection、review、popover | 0 | 投影选择浮层中单条提案的展示元信息。 |
| projectReferenceMatchingRows | 函数 | 293–350 | 复杂 | projection、data-table、review | 0 | 把待决提案投影为引用匹配表格行，含搜索文本与状态色调。 |
| projectSynthesisReviewCenterSelection | 函数 | 850–904 | 复杂 | projection、selection、review、synthesis | 0 | 投影审阅中心整体选择 DTO：当前 tab、选择集合、目标与计数。 |
| projectTargetCandidates | 函数 | 481–516 | 中等 | projection、review、grouping | 0 | 汇总引用、主题与概念候选为统一候选列表并按分组归类。 |
| projectTopicGraphRows | 函数 | 777–831 | 复杂 | projection、review、graph | 0 | 按当前话题与筛选条件组织话题图审阅行集合。 |
| referenceMatchProposalContext | 函数 | 190–261 | 复杂 | projection、review、matching | 0 | 组装引用匹配的对照上下文：候选条目、现有条目与差异线索。 |
| reviewSearchMatches | 函数 | 88–95 | 简单 | filter、search、review | 0 | 按可搜索字段判定记录是否命中关键词。 |
| reviewStatusMatches | 函数 | 70–86 | 简单 | filter、review、predicate | 0 | 判定一行记录的审阅状态是否命中当前筛选条件。 |
| targetPaperRefForProposal | 函数 | 126–136 | 简单 | projection、review、lookup | 0 | 从提案中解析目标文献引用。 |
| topicGraphReviewRows | 函数 | 671–753 | 复杂 | projection、review、graph | 0 | 把话题图节点与关系投影为可审阅行，标注每条关系的审阅状态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ReviewCenterRegion.tsx](ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [reviewCenterText.ts](reviewCenterText.ts.md) | src/synthesis/components/reviewCenter/reviewCenterText.ts | 审阅中心文案与本地化辅助：枚举键解析、文案回退、状态色调与操作标签的集中投影。 |
| [reviewCenterWire.ts](reviewCenterWire.ts.md) | src/synthesis/components/reviewCenter/reviewCenterWire.ts | 审阅中心 wire 边界收窄：把宿主快照中的可选字段收窄为受控的合并目标与审阅快照形状。 |
| [synthesisWorkbenchWireContract.ts](../../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ReviewCenterRegion.tsx](ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [ReviewTargetPicker.tsx](ReviewTargetPicker.tsx.md) | src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx | 审阅目标选择浮层：按分组展示引用、主题与概念候选，支持搜索过滤、锚定定位和选中回调。 |
| [synthesisSurfaceProjection.ts](../../synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| filterReviewCenterTargetCandidates | 函数 | 522–547 | 按关键词与分组过滤候选目标，输出匹配后的子集。 |
| projectSynthesisReviewCenterSelection | 函数 | 850–904 | 投影审阅中心整体选择 DTO：当前 tab、选择集合、目标与计数。 |
