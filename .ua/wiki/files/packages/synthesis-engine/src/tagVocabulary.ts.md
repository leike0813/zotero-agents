
# packages/synthesis-engine/src/tagVocabulary.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-engine/src](../../../../modules/packages/synthesis-engine/src.md)
<!-- node: file:packages/synthesis-engine/src/tagVocabulary.ts -->

标签词表引擎：校验 canonical 标签、别名与缩写并计算标签索引结果，输出可被引用与主题图谱消费的词表事实。
源码：[packages/synthesis-engine/src/tagVocabulary.ts](../../../../../../packages/synthesis-engine/src/tagVocabulary.ts)

## 符号（8）
<!-- node: function:packages/synthesis-engine/src/tagVocabulary.ts:computeIndex -->
<!-- node: function:packages/synthesis-engine/src/tagVocabulary.ts:computeValidation -->
<!-- node: function:packages/synthesis-engine/src/tagVocabulary.ts:createInProcessSynthesisTagVocabularyEngine -->
<!-- node: function:packages/synthesis-engine/src/tagVocabulary.ts:rebuildSynthesisTagVocabularyIndexRequest -->
<!-- node: function:packages/synthesis-engine/src/tagVocabulary.ts:rebuildSynthesisTagVocabularyIndexResult -->
<!-- node: function:packages/synthesis-engine/src/tagVocabulary.ts:rebuildSynthesisTagVocabularyValidationRequest -->
<!-- node: function:packages/synthesis-engine/src/tagVocabulary.ts:rebuildSynthesisTagVocabularyValidationResult -->
<!-- node: class:packages/synthesis-engine/src/tagVocabulary.ts:SynthesisTagVocabularyContractError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| computeIndex | 函数 | 647–698 | 中等 | engine、index、search | 0 | 构建标签词表索引，产出搜索行与规范化后的词条集合。 |
| computeValidation | 函数 | 636–645 | 简单 | engine、validation、warnings | 0 | 执行词表校验：检查重复、冲突别名与协议一致性，生成告警行。 |
| createInProcessSynthesisTagVocabularyEngine | 函数 | 885–898 | 简单 | factory、engine、tag-vocabulary | 0 | 创建进程内标签词表引擎，绑定校验与索引能力。 |
| rebuildSynthesisTagVocabularyIndexRequest | 函数 | 463–482 | 简单 | contract、validation、index | 0 | 校验并重建标签词表索引请求，约束词条规模与字符串长度上限。 |
| rebuildSynthesisTagVocabularyIndexResult | 函数 | 816–835 | 简单 | contract、validation、index | 0 | 重建词表索引结果契约，校验搜索行与统计字段。 |
| rebuildSynthesisTagVocabularyValidationRequest | 函数 | 448–461 | 简单 | contract、validation、tag-vocabulary | 0 | 校验并重建标签词表校验请求，规范词条、别名与协议字段。 |
| rebuildSynthesisTagVocabularyValidationResult | 函数 | 753–772 | 简单 | contract、validation、warnings | 0 | 重建词表校验结果契约，逐字段校验告警项。 |
| SynthesisTagVocabularyContractError | 类 | 85–92 | 简单 | error-type、contract、tag-vocabulary | 0 | 标签词表契约错误类型，用于索引与校验请求的字段级失败。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-contracts/src/canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [tagVocabularyCore.ts](../../synthesis-contracts/src/tagVocabularyCore.ts.md) | packages/synthesis-contracts/src/tagVocabularyCore.ts | 标签词表引擎核心类型：词条、引擎协议、校验警告与索引检索行的定义。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [tagVocabularyApplication.ts](../../synthesis-application/src/tagVocabularyApplication.ts.md) | packages/synthesis-application/src/tagVocabularyApplication.ts | 标签词表应用层：读取并哈希词表候选、管理 staged 标签绑定与宿主批量生效请求，校验归一化后的状态记录并驱动 Zotero 侧 tag effect 执行。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createInProcessSynthesisTagVocabularyEngine | 函数 | 885–898 | 创建进程内标签词表引擎，绑定校验与索引能力。 |
| rebuildSynthesisTagVocabularyIndexRequest | 函数 | 463–482 | 校验并重建标签词表索引请求，约束词条规模与字符串长度上限。 |
| rebuildSynthesisTagVocabularyIndexResult | 函数 | 816–835 | 重建词表索引结果契约，校验搜索行与统计字段。 |
| rebuildSynthesisTagVocabularyValidationRequest | 函数 | 448–461 | 校验并重建标签词表校验请求，规范词条、别名与协议字段。 |
| rebuildSynthesisTagVocabularyValidationResult | 函数 | 753–772 | 重建词表校验结果契约，逐字段校验告警项。 |
| SynthesisTagVocabularyContractError | 类 | 85–92 | 标签词表契约错误类型，用于索引与校验请求的字段级失败。 |
