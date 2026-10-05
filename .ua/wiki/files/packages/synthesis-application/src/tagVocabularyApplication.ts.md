
# packages/synthesis-application/src/tagVocabularyApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/tagVocabularyApplication.ts -->

标签词表应用层：读取并哈希词表候选、管理 staged 标签绑定与宿主批量生效请求，校验归一化后的状态记录并驱动 Zotero 侧 tag effect 执行。
源码：[packages/synthesis-application/src/tagVocabularyApplication.ts](../../../../../../packages/synthesis-application/src/tagVocabularyApplication.ts)

## 符号（8）
<!-- node: function:packages/synthesis-application/src/tagVocabularyApplication.ts:createSynthesisTagVocabularyApplication -->
<!-- node: function:packages/synthesis-application/src/tagVocabularyApplication.ts:hashSynthesisTagVocabularyApplicationCandidate -->
<!-- node: function:packages/synthesis-application/src/tagVocabularyApplication.ts:mergeStaged -->
<!-- node: function:packages/synthesis-application/src/tagVocabularyApplication.ts:readSynthesisTagVocabularyApplicationCandidate -->
<!-- node: function:packages/synthesis-application/src/tagVocabularyApplication.ts:stagedFromRecord -->
<!-- node: function:packages/synthesis-application/src/tagVocabularyApplication.ts:stagedRecord -->
<!-- node: function:packages/synthesis-application/src/tagVocabularyApplication.ts:synthesisTagVocabularyStateRecordsFromCandidate -->
<!-- node: function:packages/synthesis-application/src/tagVocabularyApplication.ts:validationRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSynthesisTagVocabularyApplication | 函数 | 387–1144 | 复杂 | 工厂函数、标签词表、核心、命令集合、worker | 0 | 标签词表应用工厂：暴露读取、staged 绑定管理、提交到宿主、丢弃与重建索引等命令，并以 worker 状态串行化长耗时操作。 |
| hashSynthesisTagVocabularyApplicationCandidate | 函数 | 197–204 | 简单 | hash、basis、标签词表、纯函数 | 1 | 对词表候选取 canonical JSON 哈希，作为知识检查点使用的 tagRevision basis。 |
| mergeStaged | 函数 | 348–373 | 中等 | staged-绑定、合并、标签词表 | 0 | 将 staged 标签绑定合并进当前词表状态，按绑定键去重并保留未提交的宿主解析结果。 |
| readSynthesisTagVocabularyApplicationCandidate | 函数 | 159–195 | 中等 | 读取、标签词表、候选快照 | 1 | 从 repository 与宿主读取词表候选集合，归一化标签名与绑定，产出可哈希的候选快照。 |
| stagedFromRecord | 函数 | 296–317 | 中等 | staged-绑定、还原、标签词表 | 0 | 把 repository 中的 staged 绑定行还原为领域对象，规范化解析 ID 与诊断字段。 |
| stagedRecord | 函数 | 319–331 | 简单 | staged-绑定、repository-记录、转换 | 0 | 把领域侧的 staged 绑定转换为 repository 行记录，供提交时整体写入。 |
| synthesisTagVocabularyStateRecordsFromCandidate | 函数 | 229–282 | 中等 | repository-记录、标签词表、转换 | 1 | 把词表候选快照转换为 repository 状态记录集合，保持标签、别名与绑定行的结构稳定。 |
| validationRequest | 函数 | 206–227 | 中等 | 请求构造、校验、标签词表 | 0 | 构造标签词表校验请求，携带待生效的绑定与诊断上限，交给宿主侧 tag effect 端口执行。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [tagEffect.ts](../../synthesis-contracts/src/tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts | 宿主标签 effect 契约：staged binding 解析请求与结果，以及标签 effect 批次请求、逐条 receipt 与批次结果重建。 |
| [tagVocabulary.ts](../../synthesis-engine/src/tagVocabulary.ts.md) | packages/synthesis-engine/src/tagVocabulary.ts | 标签词表引擎：校验 canonical 标签、别名与缩写并计算标签索引结果，输出可被引用与主题图谱消费的词表事实。 |
| [tagVocabulary.ts](../../synthesis-repository/src/tagVocabulary.ts.md) | packages/synthesis-repository/src/tagVocabulary.ts | 标签词表持久化仓储：维护词条、别名、缩写、协议、告警、staged suggestion、审计与 effect 行，支持词表状态替换与索引提升。 |
| [tagVocabularyApplication.ts](../../synthesis-contracts/src/tagVocabularyApplication.ts.md) | packages/synthesis-contracts/src/tagVocabularyApplication.ts | 标签词表应用契约：候选、保存、分页、staging、条目更新删除、索引重建与审计替换清空的完整请求/结果 DTO 集合。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [knowledgeCheckpointApplication.ts](knowledgeCheckpointApplication.ts.md) | packages/synthesis-application/src/knowledgeCheckpointApplication.ts | 知识检查点（knowledge checkpoint）应用层：跨概念库、标签词表与主题图三类 basis 计算知识载荷哈希、生成差异预览，并在用户覆盖决定后以 expectedBases 做原子替换。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisTagVocabularyApplication | 函数 | 387–1144 | 标签词表应用工厂：暴露读取、staged 绑定管理、提交到宿主、丢弃与重建索引等命令，并以 worker 状态串行化长耗时操作。 |
| hashSynthesisTagVocabularyApplicationCandidate | 函数 | 197–204 | 对词表候选取 canonical JSON 哈希，作为知识检查点使用的 tagRevision basis。 |
| readSynthesisTagVocabularyApplicationCandidate | 函数 | 159–195 | 从 repository 与宿主读取词表候选集合，归一化标签名与绑定，产出可哈希的候选快照。 |
| synthesisTagVocabularyStateRecordsFromCandidate | 函数 | 229–282 | 把词表候选快照转换为 repository 状态记录集合，保持标签、别名与绑定行的结构稳定。 |
