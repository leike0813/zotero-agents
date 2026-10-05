
# packages/synthesis-contracts/src/itemRef.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/itemRef.ts -->

Zotero 条目引用合约：校验 libraryId 与 itemKey 的组合，提供稳定的比较函数、键构造函数与批量重建，供跨边界传递 portable refs。
源码：[packages/synthesis-contracts/src/itemRef.ts](../../../../../../packages/synthesis-contracts/src/itemRef.ts)

## 符号（1）
<!-- node: function:packages/synthesis-contracts/src/itemRef.ts:rebuildSynthesisHostItemRef -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [rebuildSynthesisHostItemRef](../../../../symbols/packages/synthesis-contracts/src/itemRef.ts/rebuildSynthesisHostItemRef.md) | 函数 | 18–42 | 中等 | 校验、portable-ref、条目引用、安全 | 6 | 重建 portable item ref：libraryId 必须为正安全整数，itemKey 须匹配字母数字并受长度上限约束。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [relatedItemsEffect.ts](relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts | 宿主 related-items 批量 effect 契约：定义批次与诊断条数上限，重建 effect 请求、逐条 receipt 与批次结果。 |
| [tagEffect.ts](tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts | 宿主标签 effect 契约：staged binding 解析请求与结果，以及标签 effect 批次请求、逐条 receipt 与批次结果重建。 |
| [tags.ts](tags.ts.md) | packages/synthesis-contracts/src/tags.ts | 标签域契约：词表 regulator 导出、审计 staging 条目、verified commit DTO 与 tag capability 结果重建。 |
| [tagVocabularyApplication.ts](tagVocabularyApplication.ts.md) | packages/synthesis-contracts/src/tagVocabularyApplication.ts | 标签词表应用契约：候选、保存、分页、staging、条目更新删除、索引重建与审计替换清空的完整请求/结果 DTO 集合。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [rebuildSynthesisHostItemRef](../../../../symbols/packages/synthesis-contracts/src/itemRef.ts/rebuildSynthesisHostItemRef.md) | 函数 | 18–42 | 重建 portable item ref：libraryId 必须为正安全整数，itemKey 须匹配字母数字并受长度上限约束。 |
