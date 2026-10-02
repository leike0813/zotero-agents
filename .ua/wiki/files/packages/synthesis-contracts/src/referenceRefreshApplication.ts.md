
# packages/synthesis-contracts/src/referenceRefreshApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/referenceRefreshApplication.ts -->

参考文献刷新应用契约：prepare/apply/page 请求，以及条目、描述符与文献质量快照的严格重建。
源码：[packages/synthesis-contracts/src/referenceRefreshApplication.ts](../../../../../../packages/synthesis-contracts/src/referenceRefreshApplication.ts)

## 符号（12）
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:exactFields -->
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:rebuildDescriptor -->
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:rebuildItem -->
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:rebuildLiteratureQualitySnapshot -->
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:rebuildReadResult -->
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:rebuildScope -->
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:rebuildSynthesisReferenceRefreshApplyRequest -->
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:rebuildSynthesisReferenceRefreshInspectResult -->
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:rebuildSynthesisReferenceRefreshMutationResult -->
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:rebuildSynthesisReferenceRefreshPageRequest -->
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:rebuildSynthesisReferenceRefreshPrepareRequest -->
<!-- node: function:packages/synthesis-contracts/src/referenceRefreshApplication.ts:requiredString -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| exactFields | 函数 | 121–130 | 简单 | validation、contract、guard | 0 | 校验对象字段集合与契约完全一致，多余或缺失字段均判为契约错误。 |
| rebuildDescriptor | 函数 | 250–342 | 中等 | contract、rebuild、data-model | 0 | 重建文献描述符：作者、年份、期刊、DOI 等规范字段。 |
| rebuildItem | 函数 | 178–248 | 中等 | contract、rebuild、reference-management | 0 | 重建刷新条目：库键、标识、标题与版本哈希。 |
| rebuildLiteratureQualitySnapshot | 函数 | 344–438 | 中等 | contract、rebuild、literature-analysis | 0 | 重建文献质量快照，校验评分、证据与产出哈希。 |
| rebuildReadResult | 函数 | 539–621 | 中等 | contract、rebuild、application-layer | 0 | 重建读取结果，区分可用刷新数据与不可用原因。 |
| rebuildScope | 函数 | 440–468 | 简单 | contract、rebuild、application-layer | 0 | 重建刷新范围定义，限定本次 prepare 覆盖的库与集合。 |
| rebuildSynthesisReferenceRefreshApplyRequest | 函数 | 623–650 | 简单 | contract、rebuild、application-layer | 0 | 重建刷新 apply 请求，校验条目集合与 basis 哈希。 |
| rebuildSynthesisReferenceRefreshInspectResult | 函数 | 673–725 | 中等 | contract、rebuild、application-layer | 0 | 重建刷新 inspect 结果，汇总范围统计与游标。 |
| rebuildSynthesisReferenceRefreshMutationResult | 函数 | 741–793 | 中等 | contract、rebuild、durable-write | 0 | 重建刷新写操作结果与 durable 提交证据。 |
| rebuildSynthesisReferenceRefreshPageRequest | 函数 | 652–671 | 简单 | contract、rebuild、pagination | 0 | 重建刷新分页请求。 |
| rebuildSynthesisReferenceRefreshPrepareRequest | 函数 | 470–537 | 中等 | contract、rebuild、application-layer | 0 | 重建刷新 prepare 请求，校验范围、批量与并发上限。 |
| requiredString | 函数 | 132–146 | 简单 | validation、contract、parsing | 0 | 读取必填字符串字段，缺失、超长或含非法字符时抛出契约错误。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [hostRead.ts](hostRead.ts.md) | packages/synthesis-contracts/src/hostRead.ts | 宿主只读合约：定义文献条目分页、按 ref 批量读取、artifact 扫描与就绪度查询、artifact 读取的分页请求与结果重建，以及文献质量评估。 |
| [literatureArtifacts.ts](literatureArtifacts.ts.md) | packages/synthesis-contracts/src/literatureArtifacts.ts | 定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-contracts/src/durableBundle.ts | durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。 |
| [referenceRefreshApplication.ts](../../synthesis-application/src/referenceRefreshApplication.ts.md) | packages/synthesis-application/src/referenceRefreshApplication.ts | 参考文献刷新应用层：按 source 描述符判定增量或全量刷新计划，合并新旧 source/artifact/raw reference 行，并以 basis 哈希守卫 repository 投影替换。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisReferenceRefreshApplyRequest | 函数 | 623–650 | 重建刷新 apply 请求，校验条目集合与 basis 哈希。 |
| rebuildSynthesisReferenceRefreshInspectResult | 函数 | 673–725 | 重建刷新 inspect 结果，汇总范围统计与游标。 |
| rebuildSynthesisReferenceRefreshMutationResult | 函数 | 741–793 | 重建刷新写操作结果与 durable 提交证据。 |
| rebuildSynthesisReferenceRefreshPageRequest | 函数 | 652–671 | 重建刷新分页请求。 |
| rebuildSynthesisReferenceRefreshPrepareRequest | 函数 | 470–537 | 重建刷新 prepare 请求，校验范围、批量与并发上限。 |
