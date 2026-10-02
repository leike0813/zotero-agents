
# packages/synthesis-repository/src/knowledgeCheckpoint.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-repository/src](../../../../modules/packages/synthesis-repository/src.md)
<!-- node: file:packages/synthesis-repository/src/knowledgeCheckpoint.ts -->

知识检查点仓储：捕获并整体替换各领域（概念、标签、主题图谱）的 active basis 集合，用于判断索引是否需要重建。
源码：[packages/synthesis-repository/src/knowledgeCheckpoint.ts](../../../../../../packages/synthesis-repository/src/knowledgeCheckpoint.ts)

## 符号（2）
<!-- node: function:packages/synthesis-repository/src/knowledgeCheckpoint.ts:captureSynthesisKnowledgeCheckpointRepositoryState -->
<!-- node: function:packages/synthesis-repository/src/knowledgeCheckpoint.ts:replaceSynthesisKnowledgeCheckpointRepositoryState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| captureSynthesisKnowledgeCheckpointRepositoryState | 函数 | 84–110 | 简单 | checkpoint、snapshot、knowledge | 0 | 捕获各领域 active basis 集合，形成知识检查点基线。 |
| replaceSynthesisKnowledgeCheckpointRepositoryState | 函数 | 112–149 | 简单 | checkpoint、persistence、knowledge | 0 | 整体替换知识检查点基线，用于判定索引失效与重建。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptKb.ts](conceptKb.ts.md) | packages/synthesis-repository/src/conceptKb.ts | 概念知识库持久化仓储：维护概念、义项、别名、关系、审阅项与主题-概念链接表，并支持概念状态整体替换与索引提升。 |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |
| [tagVocabulary.ts](tagVocabulary.ts.md) | packages/synthesis-repository/src/tagVocabulary.ts | 标签词表持久化仓储：维护词条、别名、缩写、协议、告警、staged suggestion、审计与 effect 行，支持词表状态替换与索引提升。 |
| [topicGraph.ts](topicGraph.ts.md) | packages/synthesis-repository/src/topicGraph.ts | 主题关系图持久化仓储：维护应用状态、图节点、图边与审阅项表，提供状态整体替换和索引提升。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| captureSynthesisKnowledgeCheckpointRepositoryState | 函数 | 84–110 | 捕获各领域 active basis 集合，形成知识检查点基线。 |
| replaceSynthesisKnowledgeCheckpointRepositoryState | 函数 | 112–149 | 整体替换知识检查点基线，用于判定索引失效与重建。 |
