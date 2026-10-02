
# packages/synthesis-contracts/src/relatedItemsEffect.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/relatedItemsEffect.ts -->

宿主 related-items 批量 effect 契约：定义批次与诊断条数上限，重建 effect 请求、逐条 receipt 与批次结果。
源码：[packages/synthesis-contracts/src/relatedItemsEffect.ts](../../../../../../packages/synthesis-contracts/src/relatedItemsEffect.ts)

## 符号（4）
<!-- node: function:packages/synthesis-contracts/src/relatedItemsEffect.ts:rebuildEffect -->
<!-- node: function:packages/synthesis-contracts/src/relatedItemsEffect.ts:rebuildReceipt -->
<!-- node: function:packages/synthesis-contracts/src/relatedItemsEffect.ts:rebuildSynthesisHostRelatedItemsEffectBatchRequest -->
<!-- node: function:packages/synthesis-contracts/src/relatedItemsEffect.ts:rebuildSynthesisHostRelatedItemsEffectBatchResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| rebuildEffect | 函数 | 82–160 | 中等 | contract、rebuild、effect-dispatch | 0 | 重建 related-items 单条 effect，校验动作、目标引用与载荷。 |
| rebuildReceipt | 函数 | 187–229 | 简单 | contract、rebuild、effect-dispatch | 0 | 重建 effect 执行 receipt，记录成功、跳过与失败原因。 |
| rebuildSynthesisHostRelatedItemsEffectBatchRequest | 函数 | 162–185 | 简单 | contract、rebuild、effect-dispatch | 0 | 重建 related-items 批次请求，限制批大小并逐条校验。 |
| rebuildSynthesisHostRelatedItemsEffectBatchResult | 函数 | 231–273 | 简单 | contract、rebuild、effect-dispatch | 0 | 重建批次结果，聚合 receipt、诊断与库键映射。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [itemRef.ts](itemRef.ts.md) | packages/synthesis-contracts/src/itemRef.ts | Zotero 条目引用合约：校验 libraryId 与 itemKey 的组合，提供稳定的比较函数、键构造函数与批量重建，供跨边界传递 portable refs。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisHostRelatedItemsEffectBatchRequest | 函数 | 162–185 | 重建 related-items 批次请求，限制批大小并逐条校验。 |
| rebuildSynthesisHostRelatedItemsEffectBatchResult | 函数 | 231–273 | 重建批次结果，聚合 receipt、诊断与库键映射。 |
