
# packages/synthesis-contracts/src/tagEffect.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/tagEffect.ts -->

宿主标签 effect 契约：staged binding 解析请求与结果，以及标签 effect 批次请求、逐条 receipt 与批次结果重建。
源码：[packages/synthesis-contracts/src/tagEffect.ts](../../../../../../packages/synthesis-contracts/src/tagEffect.ts)

## 符号（8）
<!-- node: function:packages/synthesis-contracts/src/tagEffect.ts:diagnostics -->
<!-- node: function:packages/synthesis-contracts/src/tagEffect.ts:rebuildEffect -->
<!-- node: function:packages/synthesis-contracts/src/tagEffect.ts:rebuildReceipt -->
<!-- node: function:packages/synthesis-contracts/src/tagEffect.ts:rebuildSynthesisHostStagedTagBindingResolutionRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagEffect.ts:rebuildSynthesisHostStagedTagBindingResolutionResult -->
<!-- node: function:packages/synthesis-contracts/src/tagEffect.ts:rebuildSynthesisHostTagEffectBatchRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagEffect.ts:rebuildSynthesisHostTagEffectBatchResult -->
<!-- node: function:packages/synthesis-contracts/src/tagEffect.ts:requiredString -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| diagnostics | 函数 | 94–104 | 简单 | validation、diagnostics、contract | 0 | 重建有界诊断列表，逐条校验 code/message 并截断到上限。 |
| rebuildEffect | 函数 | 195–272 | 中等 | contract、rebuild、effect-dispatch | 0 | 重建标签单条 effect，校验动作、目标条目与标签载荷。 |
| rebuildReceipt | 函数 | 294–337 | 简单 | contract、rebuild、effect-dispatch | 0 | 重建标签 effect receipt，记录执行结果与失败原因。 |
| rebuildSynthesisHostStagedTagBindingResolutionRequest | 函数 | 106–138 | 简单 | contract、rebuild、tagging | 0 | 重建 staged 标签绑定解析请求，校验批次与候选上限。 |
| rebuildSynthesisHostStagedTagBindingResolutionResult | 函数 | 140–193 | 中等 | contract、rebuild、tagging | 0 | 重建绑定解析结果，记录解析成功、歧义与未匹配项。 |
| rebuildSynthesisHostTagEffectBatchRequest | 函数 | 274–292 | 简单 | contract、rebuild、effect-dispatch | 0 | 重建标签 effect 批次请求，限制批大小并逐条校验。 |
| rebuildSynthesisHostTagEffectBatchResult | 函数 | 339–366 | 简单 | contract、rebuild、effect-dispatch | 0 | 重建标签批次结果，聚合 receipt 与诊断。 |
| requiredString | 函数 | 83–92 | 简单 | validation、contract、parsing | 0 | 读取必填字符串字段，缺失、超长或含非法字符时抛出契约错误。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [itemRef.ts](itemRef.ts.md) | packages/synthesis-contracts/src/itemRef.ts | Zotero 条目引用合约：校验 libraryId 与 itemKey 的组合，提供稳定的比较函数、键构造函数与批量重建，供跨边界传递 portable refs。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |
| [tagVocabularyApplication.ts](../../synthesis-application/src/tagVocabularyApplication.ts.md) | packages/synthesis-application/src/tagVocabularyApplication.ts | 标签词表应用层：读取并哈希词表候选、管理 staged 标签绑定与宿主批量生效请求，校验归一化后的状态记录并驱动 Zotero 侧 tag effect 执行。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisHostStagedTagBindingResolutionRequest | 函数 | 106–138 | 重建 staged 标签绑定解析请求，校验批次与候选上限。 |
| rebuildSynthesisHostStagedTagBindingResolutionResult | 函数 | 140–193 | 重建绑定解析结果，记录解析成功、歧义与未匹配项。 |
| rebuildSynthesisHostTagEffectBatchRequest | 函数 | 274–292 | 重建标签 effect 批次请求，限制批大小并逐条校验。 |
| rebuildSynthesisHostTagEffectBatchResult | 函数 | 339–366 | 重建标签批次结果，聚合 receipt 与诊断。 |
