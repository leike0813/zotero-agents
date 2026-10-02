
# src/synthesis/components/TagsRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components](../../../../modules/src/synthesis/components.md)
<!-- node: file:src/synthesis/components/TagsRegion.tsx -->

Synthesis Workbench 的 tags 表面：词汇表、待定收件箱、导入面板与全部标签批量编辑操作。
源码：[src/synthesis/components/TagsRegion.tsx](../../../../../../src/synthesis/components/TagsRegion.tsx)

## 符号（34）
<!-- node: function:src/synthesis/components/TagsRegion.tsx:CommitTextInput -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:compactReviewValue -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:DetailList -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:EmptyState -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:FilterSelect -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:HostCommandButton -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:importPreviewSignature -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:isSynthesisTagsRegionCommand -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:maybeLocalized -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:narrowExpandedRows -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:narrowSynthesisStagedTagRow -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:narrowSynthesisTagEditingState -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:narrowSynthesisTagImportPreview -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:narrowSynthesisTagRow -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:narrowTagWarnings -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:projectSynthesisTagsSelection -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:RowExpandButton -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:StagedEditStateBadge -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:stagedEditStateView -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:StagedInboxSubview -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:StagedTableRow -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:SummaryMetric -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:synthesisWorkbenchTagsOperationKey -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:TagBadge -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:TagImportPanel -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:TagPillList -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:TagsRegion -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:tagsRegionPropsEqual -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:TagsSubviewTabs -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:TagsSummaryBar -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:TagsTableShell -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:useTagSelectionHandlers -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:VocabularySubview -->
<!-- node: function:src/synthesis/components/TagsRegion.tsx:VocabularyTableRow -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| CommitTextInput | 函数 | 820–844 | 中等 | input、inline-edit、tag | 0 | 提交即保存的文本输入，用于行内编辑标签与备注。 |
| compactReviewValue | 函数 | 1931–1957 | 中等 | formatting、staged、tag | 0 | 把待定建议字段压缩为单行可展示文本。 |
| DetailList | 函数 | 682–698 | 中等 | key-value、presentational、tag | 0 | 渲染键值型详情列表。 |
| EmptyState | 函数 | 700–717 | 简单 | empty-state、tag、presentational | 0 | 渲染词汇表或收件箱的空态占位。 |
| FilterSelect | 函数 | 745–769 | 中等 | controls、filters、tag | 0 | 标签表面通用的过滤下拉控件。 |
| HostCommandButton | 函数 | 771–813 | 中等 | button、host-command、tag | 0 | 标签表面的宿主命令按钮，按操作键与允许能力决定禁用状态。 |
| importPreviewSignature | 函数 | 1959–1972 | 简单 | signature、import、tag | 0 | 由导入预览内容派生签名，避免重复渲染同一份预览。 |
| isSynthesisTagsRegionCommand | 函数 | 223–225 | 简单 | predicate、host-command、tags | 0 | 判定某个宿主命令名是否属于 tags 表面自身的命令集合。 |
| maybeLocalized | 函数 | 576–598 | 中等 | localization、tags、projection | 0 | 把可能是本地化对象或原始标量的字段解析为展示字符串。 |
| narrowExpandedRows | 函数 | 356–365 | 简单 | narrowing、tags、expansion | 0 | 收窄展开行集合，过滤无法对应到真实行的条目。 |
| narrowSynthesisStagedTagRow | 函数 | 302–316 | 中等 | narrowing、tags、projection | 0 | 把待定标签建议 wire 行收窄为收件箱行视图。 |
| narrowSynthesisTagEditingState | 函数 | 342–354 | 中等 | narrowing、tags、editing | 0 | 收窄行内编辑草稿状态，判定该行是否处于 dirty。 |
| narrowSynthesisTagImportPreview | 函数 | 318–340 | 中等 | narrowing、tags、import | 0 | 收窄标签词汇表导入预览：冲突项、新增项与合并策略选项。 |
| narrowSynthesisTagRow | 函数 | 282–300 | 中等 | narrowing、tags、projection | 0 | 把词汇表标签 wire 行收窄为表格行视图。 |
| narrowTagWarnings | 函数 | 271–280 | 简单 | narrowing、tags、warnings | 0 | 收窄标签校验警告为提示文本与色调。 |
| [projectSynthesisTagsSelection](../../../../symbols/src/synthesis/components/TagsRegion.tsx/projectSynthesisTagsSelection.md) | 函数 | 373–453 | 复杂 | projection、tags、selection | 1 | 由 wire 快照投影 Tags 区域的完整 selection：汇总指标、词汇表行、待定建议与导入草稿。 |
| RowExpandButton | 函数 | 846–866 | 中等 | button、expansion、tag | 0 | 展开/收起表格行详情的切换按钮。 |
| StagedEditStateBadge | 函数 | 1550–1565 | 简单 | badge、staged、presentational | 0 | 渲染待定建议的编辑状态徽章。 |
| stagedEditStateView | 函数 | 1521–1548 | 中等 | badge、staged、tag | 0 | 由待定建议的编辑状态派生徽章文案与色调。 |
| [StagedInboxSubview](../../../../symbols/src/synthesis/components/TagsRegion.tsx/StagedInboxSubview.md) | 函数 | 1700–1895 | 复杂 | staged、bulk-actions、table | 1 | 待定建议收件箱子视图：表格、批量提升/丢弃、清空与搜索筛选。 |
| [StagedTableRow](../../../../symbols/src/synthesis/components/TagsRegion.tsx/StagedTableRow.md) | 函数 | 1567–1698 | 复杂 | table-row、staged、inline-edit | 1 | 待定收件箱单行：来源流、父绑定、行内编辑与采纳/丢弃动作。 |
| SummaryMetric | 函数 | 872–884 | 简单 | metric、summary、tag | 0 | 汇总条上的单项指标展示。 |
| synthesisWorkbenchTagsOperationKey | 函数 | 463–483 | 中等 | operation-key、tags、pending-state | 1 | 由标签命令与参数派生稳定操作键，用于禁用进行中的动作按钮。 |
| TagBadge | 函数 | 641–650 | 简单 | badge、tag、presentational | 0 | 渲染单个标签徽章。 |
| [TagImportPanel](../../../../symbols/src/synthesis/components/TagsRegion.tsx/TagImportPanel.md) | 函数 | 1974–2120 | 复杂 | import-panel、tags、vocabulary | 1 | 标签词汇表导入面板：载荷输入、预览冲突处理与合并/覆盖策略提交。 |
| TagPillList | 函数 | 661–680 | 中等 | badge、list、tag | 0 | 渲染标签词元列表并限制展示数量。 |
| TagsRegion | 函数 | 2125–2173 | 中等 | tags-region、preact、memoized | 0 | Tags 表面区域组件：汇总条、词汇表子视图、待定收件箱与导入面板的组合入口。 |
| tagsRegionPropsEqual | 函数 | 174–183 | 简单 | equality、memoized、preact | 0 | Tags 区域的 memo 比较器：翻译器与回调恒等加 selection 签名相等。 |
| TagsSubviewTabs | 函数 | 886–927 | 中等 | tabs、navigation、tag | 0 | 词汇表与待定收件箱两个子视图的切换标签。 |
| [TagsSummaryBar](../../../../symbols/src/synthesis/components/TagsRegion.tsx/TagsSummaryBar.md) | 函数 | 929–995 | 复杂 | summary-bar、controls、tag | 1 | 标签表面汇总条：计数指标、筛选控件与子视图切换。 |
| TagsTableShell | 函数 | 719–743 | 中等 | table、shell、tag | 0 | 标签表格外壳：统一表头、滚动容器与空态插槽。 |
| useTagSelectionHandlers | 函数 | 1225–1262 | 中等 | hook、selection、tag | 0 | 汇总行勾选与 Shift 范围选择的处理器 hook。 |
| [VocabularySubview](../../../../symbols/src/synthesis/components/TagsRegion.tsx/VocabularySubview.md) | 函数 | 1264–1502 | 复杂 | vocabulary、table、bulk-actions | 1 | 词汇表子视图：表格、批量选择工具条、搜索筛选与展开行详情。 |
| [VocabularyTableRow](../../../../symbols/src/synthesis/components/TagsRegion.tsx/VocabularyTableRow.md) | 函数 | 1017–1216 | 复杂 | table-row、vocabulary、inline-edit | 1 | 词汇表单行：勾选、标签与分面展示、行内编辑与删除/更新命令。 |

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
| [synthesisWorkbenchChromeRenderer.ts](../synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [projectSynthesisTagsSelection](../../../../symbols/src/synthesis/components/TagsRegion.tsx/projectSynthesisTagsSelection.md) | src/synthesis/components/TagsRegion.tsx | 由 wire 快照投影 Tags 区域的完整 selection：汇总指标、词汇表行、待定建议与导入草稿。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isSynthesisTagsRegionCommand | 函数 | 223–225 | 判定某个宿主命令名是否属于 tags 表面自身的命令集合。 |
| narrowSynthesisStagedTagRow | 函数 | 302–316 | 把待定标签建议 wire 行收窄为收件箱行视图。 |
| narrowSynthesisTagEditingState | 函数 | 342–354 | 收窄行内编辑草稿状态，判定该行是否处于 dirty。 |
| narrowSynthesisTagImportPreview | 函数 | 318–340 | 收窄标签词汇表导入预览：冲突项、新增项与合并策略选项。 |
| narrowSynthesisTagRow | 函数 | 282–300 | 把词汇表标签 wire 行收窄为表格行视图。 |
| [projectSynthesisTagsSelection](../../../../symbols/src/synthesis/components/TagsRegion.tsx/projectSynthesisTagsSelection.md) | 函数 | 373–453 | 由 wire 快照投影 Tags 区域的完整 selection：汇总指标、词汇表行、待定建议与导入草稿。 |
| synthesisWorkbenchTagsOperationKey | 函数 | 463–483 | 由标签命令与参数派生稳定操作键，用于禁用进行中的动作按钮。 |
| TagsRegion | 函数 | 2125–2173 | Tags 表面区域组件：汇总条、词汇表子视图、待定收件箱与导入面板的组合入口。 |
| tagsRegionPropsEqual | 函数 | 174–183 | Tags 区域的 memo 比较器：翻译器与回调恒等加 selection 签名相等。 |
