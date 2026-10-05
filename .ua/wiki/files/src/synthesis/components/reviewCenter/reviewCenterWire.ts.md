
# src/synthesis/components/reviewCenter/reviewCenterWire.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/reviewCenter](../../../../../modules/src/synthesis/components/reviewCenter.md)
<!-- node: file:src/synthesis/components/reviewCenter/reviewCenterWire.ts -->

审阅中心 wire 边界收窄：把宿主快照中的可选字段收窄为受控的合并目标与审阅快照形状。
源码：[src/synthesis/components/reviewCenter/reviewCenterWire.ts](../../../../../../../src/synthesis/components/reviewCenter/reviewCenterWire.ts)

## 符号（2）
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterWire.ts:narrowMergeTargets -->
<!-- node: function:src/synthesis/components/reviewCenter/reviewCenterWire.ts:narrowReviewCenterSnapshot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| narrowMergeTargets | 函数 | 158–166 | 简单 | narrowing、type-guard、review | 0 | 收窄合并目标列表，过滤无效条目。 |
| narrowReviewCenterSnapshot | 函数 | 169–194 | 中等 | narrowing、wire-contract、review | 1 | 收窄审阅中心快照为受控形状，补齐可选字段的默认值。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchWireContract.ts](../../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [reviewCenterProjection.ts](reviewCenterProjection.ts.md) | src/synthesis/components/reviewCenter/reviewCenterProjection.ts | 审阅中心投影层：把 wire 快照与 registry 行投影成引用匹配行、清理行、概念行与话题图审阅行，并派生目标候选分组与整体选择 DTO。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| narrowReviewCenterSnapshot | 函数 | 169–194 | 收窄审阅中心快照为受控形状，补齐可选字段的默认值。 |
