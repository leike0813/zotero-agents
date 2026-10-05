
# packages/synthesis-contracts/src/topicGraphCore.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/topicGraphCore.ts -->

主题图谱索引引擎常量与类型：契约/算法/schema 版本、节点与边上限，以及关系、边状态、定义状态枚举。
源码：[packages/synthesis-contracts/src/topicGraphCore.ts](../../../../../../packages/synthesis-contracts/src/topicGraphCore.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [topicGraphApplication.ts](topicGraphApplication.ts.md) | packages/synthesis-contracts/src/topicGraphApplication.ts | 主题图谱应用契约：快照、replace/upsert/ingest/物化主题、关系裁决、审阅、标记删除与索引重建请求及 mutation 结果。 |
| [topicGraphIndex.ts](../../synthesis-engine/src/topicGraphIndex.ts.md) | packages/synthesis-engine/src/topicGraphIndex.ts | 主题关系图索引引擎：把主题节点与边编译为有界索引结果，支持分批 checkpoint，控制节点数、边数与字符串长度上限。 |
