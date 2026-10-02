
# createWorkflowHostError
<!-- node: function:src/workflows/workflowHostErrorContract.ts:createWorkflowHostError -->

创建 Workflow Host 错误的统一入口，负责码、details 与 retryable 的一致性。
类型：函数  
复杂度：简单  
入边数：5  
标签：error-contract、factory、exported  
所属文件：[src/workflows/workflowHostErrorContract.ts](../../../../files/src/workflows/workflowHostErrorContract.ts.md)
源码：[src/workflows/workflowHostErrorContract.ts:568](../../../../../../src/workflows/workflowHostErrorContract.ts#L568)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [validateEntries](../../../../files/src/workflows/archive.ts.md) | src/workflows/archive.ts:280–319 | 校验归档条目集合的非空、命名与类型约束。 |
| [createWorkflowBibliographyOwner](../bibliography.ts/createWorkflowBibliographyOwner.md) | src/workflows/bibliography.ts:194–398 | 创建书目 owner，绑定翻译器解析与宿主调用接缝。 |
| [createWorkflowClipboardOwner](../../../../files/src/workflows/clipboard.ts.md) | src/workflows/clipboard.ts:178–234 | 创建剪贴板 owner，按优先级选定 adapter 并统一限额、取消与错误语义。 |
| [materializeWorkflowInputFile](../../../../files/src/workflows/workflowInputMaterialization.ts.md) | src/workflows/workflowInputMaterialization.ts:90–121 | 把一个声明的输入文件复制到受管工作区并返回其大小与摘要事实。 |
| [createWorkflowNoteImagePreparation](../../../../files/src/workflows/workflowNoteImagePreparation.ts.md) | src/workflows/workflowNoteImagePreparation.ts:490–573 | 创建图片准备器，绑定画布能力、摘要与错误映射。 |

## 调用

该符号没有记录对外调用。
