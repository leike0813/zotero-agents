
# packages/synthesis-contracts/src/knowledgeCheckpoint.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/knowledgeCheckpoint.ts -->

知识检查点合约：定义三类知识 basis（标签修订、概念清单、主题图）、载荷结构与计数族，并重建检查点对象与 apply 请求。
源码：[packages/synthesis-contracts/src/knowledgeCheckpoint.ts](../../../../../../packages/synthesis-contracts/src/knowledgeCheckpoint.ts)

## 符号（8）
<!-- node: function:packages/synthesis-contracts/src/knowledgeCheckpoint.ts:countSynthesisKnowledgeCheckpointPayload -->
<!-- node: function:packages/synthesis-contracts/src/knowledgeCheckpoint.ts:rebuildCountFamily -->
<!-- node: function:packages/synthesis-contracts/src/knowledgeCheckpoint.ts:rebuildSynthesisKnowledgeCheckpoint -->
<!-- node: function:packages/synthesis-contracts/src/knowledgeCheckpoint.ts:rebuildSynthesisKnowledgeCheckpointApplyRequest -->
<!-- node: function:packages/synthesis-contracts/src/knowledgeCheckpoint.ts:rebuildSynthesisKnowledgeCheckpointBases -->
<!-- node: function:packages/synthesis-contracts/src/knowledgeCheckpoint.ts:rebuildSynthesisKnowledgeCheckpointCounts -->
<!-- node: function:packages/synthesis-contracts/src/knowledgeCheckpoint.ts:rebuildSynthesisKnowledgeCheckpointPayload -->
<!-- node: class:packages/synthesis-contracts/src/knowledgeCheckpoint.ts:SynthesisKnowledgeCheckpointContractError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| countSynthesisKnowledgeCheckpointPayload | 函数 | 257–281 | 中等 | 统计、知识检查点、合约 | 0 | 统计知识载荷中各计数族的实体数量，供差异视图与用户决策覆盖使用。 |
| rebuildCountFamily | 函数 | 283–303 | 中等 | 合约、计数族、校验、知识检查点 | 1 | 重建单个计数族：校验实体数量、摘要哈希与实体 ID 列表的规模上限与去重约束。 |
| rebuildSynthesisKnowledgeCheckpoint | 函数 | 335–374 | 中等 | 合约、知识检查点、校验、版本 | 0 | 重建完整检查点对象：绑定 contractVersion、basis、载荷与 payloadHash，阻断版本或哈希不匹配的检查点。 |
| rebuildSynthesisKnowledgeCheckpointApplyRequest | 函数 | 376–396 | 中等 | 合约、apply-请求、compare-and-set、知识检查点 | 0 | 重建检查点 apply 请求：同时携带 expectedBases 与新载荷，使替换成为 compare-and-set 而非无条件覆盖。 |
| rebuildSynthesisKnowledgeCheckpointBases | 函数 | 194–217 | 中等 | 合约、basis、知识检查点、校验 | 1 | 重建知识 basis 集合：校验标签修订、概念清单与主题图三处哈希形状，缺失项以 null 显式表达。 |
| rebuildSynthesisKnowledgeCheckpointCounts | 函数 | 305–333 | 中等 | 合约、计数、知识检查点 | 0 | 重建计数汇总：逐个计数族应用 rebuildCountFamily 并汇总总数，作为差异展示的轻量视图。 |
| [rebuildSynthesisKnowledgeCheckpointPayload](../../../../symbols/packages/synthesis-contracts/src/knowledgeCheckpoint.ts/rebuildSynthesisKnowledgeCheckpointPayload.md) | 函数 | 219–255 | 复杂 | 合约、知识检查点、载荷、有界 | 1 | 重建知识检查点载荷：校验各计数族的哈希与实体数量上限，输出可比较的规范化载荷。 |
| SynthesisKnowledgeCheckpointContractError | 类 | 129–136 | 简单 | 错误类型、合约、知识检查点 | 0 | 知识检查点合约错误类型，携带字段定位与原因，用于 basis、载荷与计数族校验失败。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptKbApplication.ts](conceptKbApplication.ts.md) | packages/synthesis-contracts/src/conceptKbApplication.ts | 概念知识库应用层合约（1155 行，全批最大合约文件）：逐字段重建概念、义项、别名、关系、proposal、审阅项与主题链接，并定义 replace/ingest/review/delete/query 等请求与 mutation 结果。 |
| [tagVocabularyApplication.ts](tagVocabularyApplication.ts.md) | packages/synthesis-contracts/src/tagVocabularyApplication.ts | 标签词表应用契约：候选、保存、分页、staging、条目更新删除、索引重建与审计替换清空的完整请求/结果 DTO 集合。 |
| [topicGraphApplication.ts](topicGraphApplication.ts.md) | packages/synthesis-contracts/src/topicGraphApplication.ts | 主题图谱应用契约：快照、replace/upsert/ingest/物化主题、关系裁决、审阅、标记删除与索引重建请求及 mutation 结果。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [knowledgeCheckpointApplication.ts](../../synthesis-application/src/knowledgeCheckpointApplication.ts.md) | packages/synthesis-application/src/knowledgeCheckpointApplication.ts | 知识检查点（knowledge checkpoint）应用层：跨概念库、标签词表与主题图三类 basis 计算知识载荷哈希、生成差异预览，并在用户覆盖决定后以 expectedBases 做原子替换。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| countSynthesisKnowledgeCheckpointPayload | 函数 | 257–281 | 统计知识载荷中各计数族的实体数量，供差异视图与用户决策覆盖使用。 |
| rebuildSynthesisKnowledgeCheckpoint | 函数 | 335–374 | 重建完整检查点对象：绑定 contractVersion、basis、载荷与 payloadHash，阻断版本或哈希不匹配的检查点。 |
| rebuildSynthesisKnowledgeCheckpointApplyRequest | 函数 | 376–396 | 重建检查点 apply 请求：同时携带 expectedBases 与新载荷，使替换成为 compare-and-set 而非无条件覆盖。 |
| rebuildSynthesisKnowledgeCheckpointBases | 函数 | 194–217 | 重建知识 basis 集合：校验标签修订、概念清单与主题图三处哈希形状，缺失项以 null 显式表达。 |
| rebuildSynthesisKnowledgeCheckpointCounts | 函数 | 305–333 | 重建计数汇总：逐个计数族应用 rebuildCountFamily 并汇总总数，作为差异展示的轻量视图。 |
| [rebuildSynthesisKnowledgeCheckpointPayload](../../../../symbols/packages/synthesis-contracts/src/knowledgeCheckpoint.ts/rebuildSynthesisKnowledgeCheckpointPayload.md) | 函数 | 219–255 | 重建知识检查点载荷：校验各计数族的哈希与实体数量上限，输出可比较的规范化载荷。 |
| SynthesisKnowledgeCheckpointContractError | 类 | 129–136 | 知识检查点合约错误类型，携带字段定位与原因，用于 basis、载荷与计数族校验失败。 |
