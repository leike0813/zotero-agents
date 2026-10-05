
# packages/synthesis-contracts/src/conceptKbCore.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/conceptKbCore.ts -->

概念知识库索引核心类型：定义概念状态、置信度枚举，以及索引概念、义项、别名、查询请求与结果的共享结构，被 application 合约与 engine 共用。
源码：[packages/synthesis-contracts/src/conceptKbCore.ts](../../../../../../packages/synthesis-contracts/src/conceptKbCore.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptKbApplication.ts](conceptKbApplication.ts.md) | packages/synthesis-contracts/src/conceptKbApplication.ts | 概念知识库应用层合约（1155 行，全批最大合约文件）：逐字段重建概念、义项、别名、关系、proposal、审阅项与主题链接，并定义 replace/ingest/review/delete/query 等请求与 mutation 结果。 |
| [conceptKbIndex.ts](../../synthesis-engine/src/conceptKbIndex.ts.md) | packages/synthesis-engine/src/conceptKbIndex.ts | Synthesis 概念知识库索引引擎：把概念、义项、别名、来源等 canonical 行编译为可 checkpoint 的索引与查询结果，并提供进程内引擎工厂。 |
