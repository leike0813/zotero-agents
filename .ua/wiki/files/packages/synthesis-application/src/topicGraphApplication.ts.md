
# packages/synthesis-application/src/topicGraphApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/topicGraphApplication.ts -->

主题图应用层：维护主题间关系图谱的节点、边与审阅项，接收 topic graph relation proposal，检测反向更宽路径等冲突后决定合并或转审阅。
源码：[packages/synthesis-application/src/topicGraphApplication.ts](../../../../../../packages/synthesis-application/src/topicGraphApplication.ts)

## 符号（6）
<!-- node: function:packages/synthesis-application/src/topicGraphApplication.ts:createSynthesisTopicGraphApplication -->
<!-- node: function:packages/synthesis-application/src/topicGraphApplication.ts:hashSynthesisTopicGraphSnapshot -->
<!-- node: function:packages/synthesis-application/src/topicGraphApplication.ts:hasSynthesisTopicGraphBroaderPath -->
<!-- node: function:packages/synthesis-application/src/topicGraphApplication.ts:readSynthesisTopicGraphApplicationSnapshot -->
<!-- node: function:packages/synthesis-application/src/topicGraphApplication.ts:synthesisTopicGraphTupleForProposal -->
<!-- node: function:packages/synthesis-application/src/topicGraphApplication.ts:validateSynthesisTopicGraphCandidate -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSynthesisTopicGraphApplication | 函数 | 360–987 | 复杂 | 工厂函数、主题图、核心、命令集合 | 0 | 主题图应用工厂：提供快照读取、proposal ingest、关系决策、审阅、upsert、软删除、清空与索引重建等完整命令集。 |
| hashSynthesisTopicGraphSnapshot | 函数 | 115–121 | 简单 | hash、basis、主题图、纯函数 | 1 | 对主题图快照取 canonical JSON 哈希，作为知识检查点使用的 topicGraph basis。 |
| hasSynthesisTopicGraphBroaderPath | 函数 | 273–303 | 中等 | 冲突检测、图遍历、主题图、核心 | 1 | 在已有主题关系图中检测是否存在比当前提案更宽的传递路径，用于拒绝会收窄语义的边。 |
| readSynthesisTopicGraphApplicationSnapshot | 函数 | 128–178 | 中等 | 读取、快照、主题图、repository | 0 | 从 repository 行重建主题图快照，恢复节点、边元组、审阅项与索引状态。 |
| synthesisTopicGraphTupleForProposal | 函数 | 247–272 | 中等 | 关系、规范化、主题图 | 0 | 由 relation proposal 推导规范化的边元组（起点、终点、关系类型），并检查双向重复。 |
| validateSynthesisTopicGraphCandidate | 函数 | 304–347 | 中等 | 校验、主题图、候选快照 | 1 | 校验主题图候选快照的节点与边自洽性，拒绝自环、悬空端点与重复边元组。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [topicGraph.ts](../../synthesis-repository/src/topicGraph.ts.md) | packages/synthesis-repository/src/topicGraph.ts | 主题关系图持久化仓储：维护应用状态、图节点、图边与审阅项表，提供状态整体替换和索引提升。 |
| [topicGraphApplication.ts](../../synthesis-contracts/src/topicGraphApplication.ts.md) | packages/synthesis-contracts/src/topicGraphApplication.ts | 主题图谱应用契约：快照、replace/upsert/ingest/物化主题、关系裁决、审阅、标记删除与索引重建请求及 mutation 结果。 |
| [topicGraphIndex.ts](../../synthesis-engine/src/topicGraphIndex.ts.md) | packages/synthesis-engine/src/topicGraphIndex.ts | 主题关系图索引引擎：把主题节点与边编译为有界索引结果，支持分批 checkpoint，控制节点数、边数与字符串长度上限。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [knowledgeCheckpointApplication.ts](knowledgeCheckpointApplication.ts.md) | packages/synthesis-application/src/knowledgeCheckpointApplication.ts | 知识检查点（knowledge checkpoint）应用层：跨概念库、标签词表与主题图三类 basis 计算知识载荷哈希、生成差异预览，并在用户覆盖决定后以 expectedBases 做原子替换。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisTopicGraphApplication | 函数 | 360–987 | 主题图应用工厂：提供快照读取、proposal ingest、关系决策、审阅、upsert、软删除、清空与索引重建等完整命令集。 |
| hashSynthesisTopicGraphSnapshot | 函数 | 115–121 | 对主题图快照取 canonical JSON 哈希，作为知识检查点使用的 topicGraph basis。 |
| hasSynthesisTopicGraphBroaderPath | 函数 | 273–303 | 在已有主题关系图中检测是否存在比当前提案更宽的传递路径，用于拒绝会收窄语义的边。 |
| readSynthesisTopicGraphApplicationSnapshot | 函数 | 128–178 | 从 repository 行重建主题图快照，恢复节点、边元组、审阅项与索引状态。 |
| synthesisTopicGraphTupleForProposal | 函数 | 247–272 | 由 relation proposal 推导规范化的边元组（起点、终点、关系类型），并检查双向重复。 |
| validateSynthesisTopicGraphCandidate | 函数 | 304–347 | 校验主题图候选快照的节点与边自洽性，拒绝自环、悬空端点与重复边元组。 |
