
# packages/synthesis-engine/src/topicGraphIndex.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-engine/src](../../../../modules/packages/synthesis-engine/src.md)
<!-- node: file:packages/synthesis-engine/src/topicGraphIndex.ts -->

主题关系图索引引擎：把主题节点与边编译为有界索引结果，支持分批 checkpoint，控制节点数、边数与字符串长度上限。
源码：[packages/synthesis-engine/src/topicGraphIndex.ts](../../../../../../packages/synthesis-engine/src/topicGraphIndex.ts)

## 符号（5）
<!-- node: function:packages/synthesis-engine/src/topicGraphIndex.ts:computeIndex -->
<!-- node: function:packages/synthesis-engine/src/topicGraphIndex.ts:createInProcessSynthesisTopicGraphIndexEngine -->
<!-- node: function:packages/synthesis-engine/src/topicGraphIndex.ts:rebuildSynthesisTopicGraphIndexRequest -->
<!-- node: function:packages/synthesis-engine/src/topicGraphIndex.ts:rebuildSynthesisTopicGraphIndexResult -->
<!-- node: class:packages/synthesis-engine/src/topicGraphIndex.ts:SynthesisTopicGraphIndexContractError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| computeIndex | 函数 | 342–388 | 简单 | engine、index、compute | 0 | 按契约上限对主题节点与边做有界索引计算并分批 checkpoint。 |
| createInProcessSynthesisTopicGraphIndexEngine | 函数 | 432–441 | 简单 | factory、engine、topic-graph | 0 | 创建进程内主题图索引引擎，绑定索引能力。 |
| rebuildSynthesisTopicGraphIndexRequest | 函数 | 276–321 | 简单 | contract、validation、topic-graph | 0 | 校验并重建主题图索引请求，约束节点/边规模与 checkpoint 间隔。 |
| rebuildSynthesisTopicGraphIndexResult | 函数 | 390–402 | 简单 | contract、validation、topic-graph | 0 | 重建主题图索引结果契约，校验节点、边与 checkpoint 字段。 |
| SynthesisTopicGraphIndexContractError | 类 | 25–32 | 简单 | error-type、contract、topic-graph | 0 | 主题图索引契约错误类型，用于索引请求的越界与字段失败。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-contracts/src/canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [topicGraphCore.ts](../../synthesis-contracts/src/topicGraphCore.ts.md) | packages/synthesis-contracts/src/topicGraphCore.ts | 主题图谱索引引擎常量与类型：契约/算法/schema 版本、节点与边上限，以及关系、边状态、定义状态枚举。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [topicGraphApplication.ts](../../synthesis-application/src/topicGraphApplication.ts.md) | packages/synthesis-application/src/topicGraphApplication.ts | 主题图应用层：维护主题间关系图谱的节点、边与审阅项，接收 topic graph relation proposal，检测反向更宽路径等冲突后决定合并或转审阅。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createInProcessSynthesisTopicGraphIndexEngine | 函数 | 432–441 | 创建进程内主题图索引引擎，绑定索引能力。 |
| rebuildSynthesisTopicGraphIndexRequest | 函数 | 276–321 | 校验并重建主题图索引请求，约束节点/边规模与 checkpoint 间隔。 |
| rebuildSynthesisTopicGraphIndexResult | 函数 | 390–402 | 重建主题图索引结果契约，校验节点、边与 checkpoint 字段。 |
| SynthesisTopicGraphIndexContractError | 类 | 25–32 | 主题图索引契约错误类型，用于索引请求的越界与字段失败。 |
