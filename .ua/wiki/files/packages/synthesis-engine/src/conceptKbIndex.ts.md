
# packages/synthesis-engine/src/conceptKbIndex.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-engine/src](../../../../modules/packages/synthesis-engine/src.md)
<!-- node: file:packages/synthesis-engine/src/conceptKbIndex.ts -->

Synthesis 概念知识库索引引擎：把概念、义项、别名、来源等 canonical 行编译为可 checkpoint 的索引与查询结果，并提供进程内引擎工厂。
源码：[packages/synthesis-engine/src/conceptKbIndex.ts](../../../../../../packages/synthesis-engine/src/conceptKbIndex.ts)

## 符号（8）
<!-- node: function:packages/synthesis-engine/src/conceptKbIndex.ts:computeIndex -->
<!-- node: function:packages/synthesis-engine/src/conceptKbIndex.ts:computeQuery -->
<!-- node: function:packages/synthesis-engine/src/conceptKbIndex.ts:createInProcessSynthesisConceptKbIndexEngine -->
<!-- node: function:packages/synthesis-engine/src/conceptKbIndex.ts:rebuildSynthesisConceptKbIndexRequest -->
<!-- node: function:packages/synthesis-engine/src/conceptKbIndex.ts:rebuildSynthesisConceptKbIndexResult -->
<!-- node: function:packages/synthesis-engine/src/conceptKbIndex.ts:rebuildSynthesisConceptKbQueryRequest -->
<!-- node: function:packages/synthesis-engine/src/conceptKbIndex.ts:rebuildSynthesisConceptKbQueryResult -->
<!-- node: class:packages/synthesis-engine/src/conceptKbIndex.ts:SynthesisConceptKbIndexContractError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| computeIndex | 函数 | 535–623 | 中等 | engine、index、compute | 0 | 执行概念索引计算：规范化概念行、分批 checkpoint 并产出索引结果。 |
| computeQuery | 函数 | 625–686 | 中等 | engine、query、search | 0 | 在已构建索引上执行概念检索，生成搜索行与 overlay 匹配项。 |
| createInProcessSynthesisConceptKbIndexEngine | 函数 | 897–910 | 简单 | factory、engine、concept-kb | 0 | 创建进程内概念知识库索引引擎，绑定索引与查询两个能力。 |
| rebuildSynthesisConceptKbIndexRequest | 函数 | 460–484 | 简单 | contract、validation、index | 0 | 校验并重建概念知识库索引构建请求，拒绝越界分页与非法 checkpoint 参数。 |
| rebuildSynthesisConceptKbIndexResult | 函数 | 765–777 | 简单 | contract、validation、index | 0 | 重建概念索引结果的结构化契约，逐字段校验派生行。 |
| rebuildSynthesisConceptKbQueryRequest | 函数 | 486–511 | 简单 | contract、validation、query | 0 | 校验并重建概念索引查询请求，限定查询串长度与返回行上限。 |
| rebuildSynthesisConceptKbQueryResult | 函数 | 862–874 | 简单 | contract、validation、query | 0 | 重建概念查询结果契约，校验搜索行与 overlay 命中的字段完备性。 |
| SynthesisConceptKbIndexContractError | 类 | 45–52 | 简单 | error-type、contract、concept-kb | 0 | 概念知识库索引契约错误类型，携带结构化 code 与字段定位信息。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-contracts/src/canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [conceptKbCore.ts](../../synthesis-contracts/src/conceptKbCore.ts.md) | packages/synthesis-contracts/src/conceptKbCore.ts | 概念知识库索引核心类型：定义概念状态、置信度枚举，以及索引概念、义项、别名、查询请求与结果的共享结构，被 application 合约与 engine 共用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptKbApplication.ts](../../synthesis-application/src/conceptKbApplication.ts.md) | packages/synthesis-application/src/conceptKbApplication.ts | 概念知识库（Concept KB）应用层：管理概念、义项、别名、关系与审阅项的快照读写，接收 topic synthesis 产出的概念卡片 proposal 并用 token 重叠做合并。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createInProcessSynthesisConceptKbIndexEngine | 函数 | 897–910 | 创建进程内概念知识库索引引擎，绑定索引与查询两个能力。 |
| rebuildSynthesisConceptKbIndexRequest | 函数 | 460–484 | 校验并重建概念知识库索引构建请求，拒绝越界分页与非法 checkpoint 参数。 |
| rebuildSynthesisConceptKbIndexResult | 函数 | 765–777 | 重建概念索引结果的结构化契约，逐字段校验派生行。 |
| rebuildSynthesisConceptKbQueryRequest | 函数 | 486–511 | 校验并重建概念索引查询请求，限定查询串长度与返回行上限。 |
| rebuildSynthesisConceptKbQueryResult | 函数 | 862–874 | 重建概念查询结果契约，校验搜索行与 overlay 命中的字段完备性。 |
| SynthesisConceptKbIndexContractError | 类 | 45–52 | 概念知识库索引契约错误类型，携带结构化 code 与字段定位信息。 |
