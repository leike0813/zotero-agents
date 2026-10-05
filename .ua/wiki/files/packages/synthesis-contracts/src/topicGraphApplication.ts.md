
# packages/synthesis-contracts/src/topicGraphApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/topicGraphApplication.ts -->

主题图谱应用契约：快照、replace/upsert/ingest/物化主题、关系裁决、审阅、标记删除与索引重建请求及 mutation 结果。
源码：[packages/synthesis-contracts/src/topicGraphApplication.ts](../../../../../../packages/synthesis-contracts/src/topicGraphApplication.ts)

## 符号（20）
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:confidence -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:edge -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:jsonSafe -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:node -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:proposal -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationIngestRequest -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationMarkDeletedRequest -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationMaterializedTopicRequest -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationMutationResult -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationPurgeRequest -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationRebuildIndexRequest -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationRelationDecisionRequest -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationReplaceRequest -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationReviewRequest -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationSnapshot -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationState -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:rebuildSynthesisTopicGraphApplicationUpsertRequest -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:reviewItem -->
<!-- node: function:packages/synthesis-contracts/src/topicGraphApplication.ts:string -->
<!-- node: class:packages/synthesis-contracts/src/topicGraphApplication.ts:SynthesisTopicGraphApplicationContractError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| confidence | 函数 | 195–206 | 简单 | validation、topic-graph、parsing | 0 | 校验置信度取值落在 [0,1] 且为有限数值。 |
| edge | 函数 | 342–389 | 简单 | validation、topic-graph、contract | 0 | 重建主题图谱边：关系类型、置信度与两端节点引用。 |
| jsonSafe | 函数 | 207–242 | 简单 | validation、serialization、contract | 0 | 递归校验 JSON 值只含可序列化类型，剔除 undefined、函数与不安全键。 |
| node | 函数 | 267–340 | 中等 | validation、topic-graph、contract | 0 | 重建主题图谱节点：topic ID、状态、名称与证据。 |
| proposal | 函数 | 519–560 | 简单 | contract、rebuild、topic-graph | 0 | 重建图谱关系提案，含两端主题、关系类型与置信证据。 |
| rebuildSynthesisTopicGraphApplicationIngestRequest | 函数 | 663–689 | 简单 | contract、rebuild、application-layer | 0 | 重建图谱摄取请求，校验来源、批次与幂等键。 |
| rebuildSynthesisTopicGraphApplicationMarkDeletedRequest | 函数 | 734–746 | 简单 | contract、rebuild、application-layer | 0 | 重建标记删除请求，校验软删除范围与原因。 |
| rebuildSynthesisTopicGraphApplicationMaterializedTopicRequest | 函数 | 601–662 | 中等 | contract、rebuild、topic | 0 | 重建物化主题请求，校验主题定义、artifact 引用与哈希。 |
| rebuildSynthesisTopicGraphApplicationMutationResult | 函数 | 812–881 | 中等 | contract、rebuild、durable-write | 0 | 重建图谱写操作结果，记录 durable 提交与终态证据。 |
| rebuildSynthesisTopicGraphApplicationPurgeRequest | 函数 | 747–763 | 简单 | contract、rebuild、application-layer | 0 | 重建图谱清理请求，校验清理范围与确认语义。 |
| rebuildSynthesisTopicGraphApplicationRebuildIndexRequest | 函数 | 764–776 | 简单 | contract、rebuild、index | 0 | 重建图谱索引重建请求，校验范围与模式。 |
| rebuildSynthesisTopicGraphApplicationRelationDecisionRequest | 函数 | 690–711 | 简单 | contract、rebuild、review-workflow | 0 | 重建关系裁决请求，校验提案 ID、决策与理由。 |
| rebuildSynthesisTopicGraphApplicationReplaceRequest | 函数 | 562–574 | 简单 | contract、rebuild、application-layer | 0 | 重建图谱整体替换请求，校验全量节点边集合。 |
| rebuildSynthesisTopicGraphApplicationReviewRequest | 函数 | 712–733 | 简单 | contract、rebuild、review-workflow | 0 | 重建图谱审阅请求，聚合多项审阅决策。 |
| rebuildSynthesisTopicGraphApplicationSnapshot | 函数 | 450–517 | 中等 | contract、rebuild、topic-graph | 0 | 重建主题图谱快照，校验节点、边、索引版本与统计量。 |
| rebuildSynthesisTopicGraphApplicationState | 函数 | 777–811 | 简单 | contract、rebuild、topic-graph | 0 | 重建图谱应用状态，含版本、计数与索引就绪情况。 |
| rebuildSynthesisTopicGraphApplicationUpsertRequest | 函数 | 575–600 | 简单 | contract、rebuild、application-layer | 0 | 重建图谱节点/边 upsert 请求，校验标识与 basis。 |
| reviewItem | 函数 | 391–444 | 中等 | validation、topic-graph、review-workflow | 0 | 重建主题图谱审阅条目，含判定状态与操作者痕迹。 |
| string | 函数 | 149–163 | 简单 | utility、internal、synthesis | 0 | 主题图谱应用契约：快照、replace/upsert/ingest/物化主题、关系裁决、审阅、标记删除与索引重建请求及 mutation 结果。 内部的 string 处理逻辑。 |
| SynthesisTopicGraphApplicationContractError | 类 | 120–126 | 简单 | error-handling、contract、diagnostics | 0 | 主题图谱应用契约错误，携带字段路径与失败原因码。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [topicGraphCore.ts](topicGraphCore.ts.md) | packages/synthesis-contracts/src/topicGraphCore.ts | 主题图谱索引引擎常量与类型：契约/算法/schema 版本、节点与边上限，以及关系、边状态、定义状态枚举。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-contracts/src/durableBundle.ts | durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。 |
| [knowledgeCheckpoint.ts](knowledgeCheckpoint.ts.md) | packages/synthesis-contracts/src/knowledgeCheckpoint.ts | 知识检查点合约：定义三类知识 basis（标签修订、概念清单、主题图）、载荷结构与计数族，并重建检查点对象与 apply 请求。 |
| [topicGraphApplication.ts](../../synthesis-application/src/topicGraphApplication.ts.md) | packages/synthesis-application/src/topicGraphApplication.ts | 主题图应用层：维护主题间关系图谱的节点、边与审阅项，接收 topic graph relation proposal，检测反向更宽路径等冲突后决定合并或转审阅。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisTopicGraphApplicationIngestRequest | 函数 | 663–689 | 重建图谱摄取请求，校验来源、批次与幂等键。 |
| rebuildSynthesisTopicGraphApplicationMarkDeletedRequest | 函数 | 734–746 | 重建标记删除请求，校验软删除范围与原因。 |
| rebuildSynthesisTopicGraphApplicationMaterializedTopicRequest | 函数 | 601–662 | 重建物化主题请求，校验主题定义、artifact 引用与哈希。 |
| rebuildSynthesisTopicGraphApplicationMutationResult | 函数 | 812–881 | 重建图谱写操作结果，记录 durable 提交与终态证据。 |
| rebuildSynthesisTopicGraphApplicationPurgeRequest | 函数 | 747–763 | 重建图谱清理请求，校验清理范围与确认语义。 |
| rebuildSynthesisTopicGraphApplicationRebuildIndexRequest | 函数 | 764–776 | 重建图谱索引重建请求，校验范围与模式。 |
| rebuildSynthesisTopicGraphApplicationRelationDecisionRequest | 函数 | 690–711 | 重建关系裁决请求，校验提案 ID、决策与理由。 |
| rebuildSynthesisTopicGraphApplicationReplaceRequest | 函数 | 562–574 | 重建图谱整体替换请求，校验全量节点边集合。 |
| rebuildSynthesisTopicGraphApplicationReviewRequest | 函数 | 712–733 | 重建图谱审阅请求，聚合多项审阅决策。 |
| rebuildSynthesisTopicGraphApplicationSnapshot | 函数 | 450–517 | 重建主题图谱快照，校验节点、边、索引版本与统计量。 |
| rebuildSynthesisTopicGraphApplicationState | 函数 | 777–811 | 重建图谱应用状态，含版本、计数与索引就绪情况。 |
| rebuildSynthesisTopicGraphApplicationUpsertRequest | 函数 | 575–600 | 重建图谱节点/边 upsert 请求，校验标识与 basis。 |
| SynthesisTopicGraphApplicationContractError | 类 | 120–126 | 主题图谱应用契约错误，携带字段路径与失败原因码。 |
