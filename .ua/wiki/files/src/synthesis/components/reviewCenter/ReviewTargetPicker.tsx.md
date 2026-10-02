
# src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reviewCenter](../../../../../modules/src/synthesis/components/reviewCenter.md)
<!-- node: file:src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx -->

审阅目标选择浮层：按分组展示引用、主题与概念候选，支持搜索过滤、锚定定位和选中回调。
源码：[src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx](../../../../../../../src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx)

## 符号（4）
<!-- node: function:src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx:candidateTooltip -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx:positionPopover -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx:ReviewTargetPickerOverlay -->
<!-- node: function:src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx:scrollListToGroup -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| candidateTooltip | 函数 | 96–102 | 简单 | utility、formatting、review | 0 | 生成候选条目的悬浮提示文本。 |
| positionPopover | 函数 | 57–94 | 中等 | utility、positioning、popover | 0 | 按锚点与视口约束计算浮层位置，避免溢出屏幕。 |
| [ReviewTargetPickerOverlay](../../../../../symbols/src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx/ReviewTargetPickerOverlay.md) | 函数 | 104–250 | 复杂 | component、popover、review、selection | 1 | 审阅目标选择浮层主组件：搜索过滤、分组渲染、键盘可达与选中回调。 |
| scrollListToGroup | 函数 | 37–55 | 简单 | utility、dom、navigation | 0 | 将候选列表滚动到指定分组标题。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [reviewCenterProjection.ts](reviewCenterProjection.ts.md) | src/synthesis/components/reviewCenter/reviewCenterProjection.ts | 审阅中心投影层：把 wire 快照与 registry 行投影成引用匹配行、清理行、概念行与话题图审阅行，并派生目标候选分组与整体选择 DTO。 |
| [ReviewCenterRegion.tsx](ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [reviewCenterText.ts](reviewCenterText.ts.md) | src/synthesis/components/reviewCenter/reviewCenterText.ts | 审阅中心文案与本地化辅助：枚举键解析、文案回退、状态色调与操作标签的集中投影。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ReviewCenterRegion.tsx](ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [ReviewTargetPickerOverlay](../../../../../symbols/src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx/ReviewTargetPickerOverlay.md) | 函数 | 104–250 | 审阅目标选择浮层主组件：搜索过滤、分组渲染、键盘可达与选中回调。 |
