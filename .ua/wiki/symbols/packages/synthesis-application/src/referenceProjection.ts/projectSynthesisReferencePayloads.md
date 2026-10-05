
# projectSynthesisReferencePayloads
<!-- node: function:packages/synthesis-application/src/referenceProjection.ts:projectSynthesisReferencePayloads -->

从 source/artifact 中投影出 raw、canonical 与 binding 三类参考文献载荷，按 itemKey 索引去重并施加规模上限。
类型：函数  
复杂度：复杂  
入边数：1  
标签：投影、参考文献、去重、有界、核心  
所属文件：[packages/synthesis-application/src/referenceProjection.ts](../../../../../files/packages/synthesis-application/src/referenceProjection.ts.md)
源码：[packages/synthesis-application/src/referenceProjection.ts:595](../../../../../../../packages/synthesis-application/src/referenceProjection.ts#L595)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createSynthesisReferenceRefreshApplication](../../../../../files/packages/synthesis-application/src/referenceRefreshApplication.ts.md) | packages/synthesis-application/src/referenceRefreshApplication.ts:182–748 | 参考文献刷新应用工厂：提供 prepare、page、apply 与 inspect 命令，比较 source 描述符决定刷新范围并以输入哈希守卫投影替换。 |

## 调用

该符号没有记录对外调用。
