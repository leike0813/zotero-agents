
# src/synthesis/components/reviewCenter/reviewCenterText.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reviewCenter](../../../../../modules/src/synthesis/components/reviewCenter.md)
<!-- node: file:src/synthesis/components/reviewCenter/reviewCenterText.ts -->

审阅中心文案与本地化辅助：枚举键解析、文案回退、状态色调与操作标签的集中投影。
源码：[src/synthesis/components/reviewCenter/reviewCenterText.ts](../../../../../../../src/synthesis/components/reviewCenter/reviewCenterText.ts)

## 符号（10）
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterText.ts:humanizeReviewCenterEnumValue -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterText.ts:reviewCenterCellText -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterText.ts:reviewCenterEnumLabel -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterText.ts:reviewCenterFilterOptionLabel -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterText.ts:reviewCenterHumanizeLabel -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterText.ts:reviewCenterMaybeLocalized -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterText.ts:reviewCenterOperationLabel -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterText.ts:reviewCenterProposalActionLabel -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterText.ts:reviewCenterStatusTone -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterText.ts:reviewCenterUiText -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| humanizeReviewCenterEnumValue | 函数 | 69–78 | 简单 | utility、formatting、enum | 0 | 把审阅枚举值转换为可读文本。 |
| reviewCenterCellText | 函数 | 161–168 | 简单 | utility、formatting、data-table | 0 | 把任意值压缩为表格单元格可展示文本。 |
| reviewCenterEnumLabel | 函数 | 113–124 | 简单 | i18n、formatting、review | 0 | 审阅枚举标签本地化，优先使用 i18n 消息。 |
| reviewCenterFilterOptionLabel | 函数 | 126–133 | 简单 | i18n、filter、review | 0 | 生成审阅筛选选项的展示标签。 |
| reviewCenterHumanizeLabel | 函数 | 200–210 | 简单 | utility、formatting、i18n | 0 | 生成审阅栏位标题的人类化标签。 |
| reviewCenterMaybeLocalized | 函数 | 136–158 | 简单 | i18n、type-guard、review | 0 | 判定字段是枚举还是已本地化对象并输出统一文本。 |
| reviewCenterOperationLabel | 函数 | 213–219 | 简单 | i18n、action、review | 0 | 生成审阅操作按钮的文案。 |
| reviewCenterProposalActionLabel | 函数 | 242–247 | 简单 | i18n、action、review | 0 | 生成提案动作（接受/拒绝/忽略）的文案。 |
| reviewCenterStatusTone | 函数 | 181–197 | 简单 | utility、presentation、review | 0 | 把审阅状态映射为徽标色调。 |
| reviewCenterUiText | 函数 | 105–111 | 简单 | i18n、fallback、review | 0 | 读取固定 UI 文案键，缺失时回退到默认消息表。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchI18nContract.ts](../../../shared/synthesisWorkbenchI18nContract.ts.md) | src/shared/synthesisWorkbenchI18nContract.ts | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [reviewCenterProjection.ts](reviewCenterProjection.ts.md) | src/synthesis/components/reviewCenter/reviewCenterProjection.ts | 审阅中心投影层：把 wire 快照与 registry 行投影成引用匹配行、清理行、概念行与话题图审阅行，并派生目标候选分组与整体选择 DTO。 |
| [ReviewCenterRegion.tsx](ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [ReviewTargetPicker.tsx](ReviewTargetPicker.tsx.md) | src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx | 审阅目标选择浮层：按分组展示引用、主题与概念候选，支持搜索过滤、锚定定位和选中回调。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| humanizeReviewCenterEnumValue | 函数 | 69–78 | 把审阅枚举值转换为可读文本。 |
| reviewCenterCellText | 函数 | 161–168 | 把任意值压缩为表格单元格可展示文本。 |
| reviewCenterEnumLabel | 函数 | 113–124 | 审阅枚举标签本地化，优先使用 i18n 消息。 |
| reviewCenterFilterOptionLabel | 函数 | 126–133 | 生成审阅筛选选项的展示标签。 |
| reviewCenterHumanizeLabel | 函数 | 200–210 | 生成审阅栏位标题的人类化标签。 |
| reviewCenterMaybeLocalized | 函数 | 136–158 | 判定字段是枚举还是已本地化对象并输出统一文本。 |
| reviewCenterOperationLabel | 函数 | 213–219 | 生成审阅操作按钮的文案。 |
| reviewCenterProposalActionLabel | 函数 | 242–247 | 生成提案动作（接受/拒绝/忽略）的文案。 |
| reviewCenterStatusTone | 函数 | 181–197 | 把审阅状态映射为徽标色调。 |
| reviewCenterUiText | 函数 | 105–111 | 读取固定 UI 文案键，缺失时回退到默认消息表。 |
