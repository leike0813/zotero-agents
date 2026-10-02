
# rebuildSynthesisHostItemRef
<!-- node: function:packages/synthesis-contracts/src/itemRef.ts:rebuildSynthesisHostItemRef -->

重建 portable item ref：libraryId 必须为正安全整数，itemKey 须匹配字母数字并受长度上限约束。
类型：函数  
复杂度：中等  
入边数：6  
标签：校验、portable-ref、条目引用、安全  
所属文件：[packages/synthesis-contracts/src/itemRef.ts](../../../../../files/packages/synthesis-contracts/src/itemRef.ts.md)
源码：[packages/synthesis-contracts/src/itemRef.ts:18](../../../../../../../packages/synthesis-contracts/src/itemRef.ts#L18)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [relatedItemsEffect.ts](../../../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts:— | 宿主 related-items 批量 effect 契约：定义批次与诊断条数上限，重建 effect 请求、逐条 receipt 与批次结果。 |
| [rebuildEffect](../../../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts:82–160 | 重建 related-items 单条 effect，校验动作、目标引用与载荷。 |
| [rebuildSynthesisHostStagedTagBindingResolutionResult](../../../../../files/packages/synthesis-contracts/src/tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts:140–193 | 重建绑定解析结果，记录解析成功、歧义与未匹配项。 |
| [rebuildTagAuditStagingEntries](../../../../../files/packages/synthesis-contracts/src/tags.ts.md) | packages/synthesis-contracts/src/tags.ts:284–375 | 重建标签审计 staging 条目，校验批次、行数与字节上限。 |
| [rebuildTagRegulationVerifiedCommitDto](../../../../../files/packages/synthesis-contracts/src/tags.ts.md) | packages/synthesis-contracts/src/tags.ts:377–435 | 重建标签治理 verified commit 记录，绑定 basis 哈希与证据。 |
| [stagedSuggestion](../../../../../files/packages/synthesis-contracts/src/tagVocabularyApplication.ts.md) | packages/synthesis-contracts/src/tagVocabularyApplication.ts:395–446 | 重建 staged 标签建议，校验建议标签、facet 与置信度。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [assertSynthesisExactFields](../common.ts/assertSynthesisExactFields.md) | packages/synthesis-contracts/src/common.ts:163–181 | 断言对象恰好包含必需字段且不含未知字段，是全部合约 DTO 拒绝多余字段的统一入口。 |
