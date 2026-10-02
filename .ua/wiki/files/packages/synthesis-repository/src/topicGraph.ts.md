
# packages/synthesis-repository/src/topicGraph.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-repository/src](../../../../modules/packages/synthesis-repository/src.md)
<!-- node: file:packages/synthesis-repository/src/topicGraph.ts -->

主题关系图持久化仓储：维护应用状态、图节点、图边与审阅项表，提供状态整体替换和索引提升。
源码：[packages/synthesis-repository/src/topicGraph.ts](../../../../../../packages/synthesis-repository/src/topicGraph.ts)

## 符号（4）
<!-- node: function:packages/synthesis-repository/src/topicGraph.ts:ensureSynthesisTopicGraphApplicationRepositorySchema -->
<!-- node: function:packages/synthesis-repository/src/topicGraph.ts:promoteSynthesisTopicGraphIndex -->
<!-- node: function:packages/synthesis-repository/src/topicGraph.ts:rebuildSynthesisTopicGraphApplicationStateRow -->
<!-- node: function:packages/synthesis-repository/src/topicGraph.ts:replaceSynthesisTopicGraphState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ensureSynthesisTopicGraphApplicationRepositorySchema | 函数 | 217–231 | 简单 | schema、migration、sqlite | 0 | 确保主题图仓储 schema 存在，覆盖状态、节点、边与审阅表。 |
| promoteSynthesisTopicGraphIndex | 函数 | 420–447 | 简单 | persistence、index、promotion | 0 | 提升主题图索引为已发布状态，供引用与 workbench 消费。 |
| rebuildSynthesisTopicGraphApplicationStateRow | 函数 | 120–143 | 简单 | contract、rebuild、topic-graph | 0 | 重建主题图 application state 行，规范化图谱快照哈希与统计。 |
| replaceSynthesisTopicGraphState | 函数 | 386–418 | 简单 | transaction、persistence、topic-graph | 0 | 在事务内整体替换主题图状态与节点边行。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-repository/src/durableBundle.ts | Durable bundle 仓储：把仓储层的引用、审阅、主题 basis 与草稿事实投影为可导出的 durable bundle 仓储状态。 |
| [durableBundleImport.ts](durableBundleImport.ts.md) | packages/synthesis-repository/src/durableBundleImport.ts | Durable bundle 导入仓储：按 sync index 与 commit receipt 校验导入事实，逐条 upsert 领域对象并更新各领域 basis，完成 durable 状态导入。 |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |
| [knowledgeCheckpoint.ts](knowledgeCheckpoint.ts.md) | packages/synthesis-repository/src/knowledgeCheckpoint.ts | 知识检查点仓储：捕获并整体替换各领域（概念、标签、主题图谱）的 active basis 集合，用于判断索引是否需要重建。 |
| [topicGraphApplication.ts](../../synthesis-application/src/topicGraphApplication.ts.md) | packages/synthesis-application/src/topicGraphApplication.ts | 主题图应用层：维护主题间关系图谱的节点、边与审阅项，接收 topic graph relation proposal，检测反向更宽路径等冲突后决定合并或转审阅。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureSynthesisTopicGraphApplicationRepositorySchema | 函数 | 217–231 | 确保主题图仓储 schema 存在，覆盖状态、节点、边与审阅表。 |
| promoteSynthesisTopicGraphIndex | 函数 | 420–447 | 提升主题图索引为已发布状态，供引用与 workbench 消费。 |
| rebuildSynthesisTopicGraphApplicationStateRow | 函数 | 120–143 | 重建主题图 application state 行，规范化图谱快照哈希与统计。 |
| replaceSynthesisTopicGraphState | 函数 | 386–418 | 在事务内整体替换主题图状态与节点边行。 |
