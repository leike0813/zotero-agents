
# packages/synthesis-repository/src/tagVocabulary.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-repository/src](../../../../modules/packages/synthesis-repository/src.md)
<!-- node: file:packages/synthesis-repository/src/tagVocabulary.ts -->

标签词表持久化仓储：维护词条、别名、缩写、协议、告警、staged suggestion、审计与 effect 行，支持词表状态替换与索引提升。
源码：[packages/synthesis-repository/src/tagVocabulary.ts](../../../../../../packages/synthesis-repository/src/tagVocabulary.ts)

## 符号（6）
<!-- node: function:packages/synthesis-repository/src/tagVocabulary.ts:ensureSynthesisTagVocabularyApplicationRepositorySchema -->
<!-- node: function:packages/synthesis-repository/src/tagVocabulary.ts:promoteSynthesisTagVocabularyState -->
<!-- node: function:packages/synthesis-repository/src/tagVocabulary.ts:rebuildSynthesisTagApplicationStateRow -->
<!-- node: function:packages/synthesis-repository/src/tagVocabulary.ts:recordSynthesisTagEffectReceipts -->
<!-- node: function:packages/synthesis-repository/src/tagVocabulary.ts:replaceSynthesisTagStagedSuggestions -->
<!-- node: function:packages/synthesis-repository/src/tagVocabulary.ts:replaceSynthesisTagVocabularyState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ensureSynthesisTagVocabularyApplicationRepositorySchema | 函数 | 284–341 | 中等 | schema、migration、sqlite | 0 | 确保标签词表仓储 schema 存在，覆盖词条、别名、协议、审计与 effect 表。 |
| promoteSynthesisTagVocabularyState | 函数 | 626–674 | 简单 | persistence、promotion、tag-vocabulary | 0 | 提升标签词表状态为已发布，使新词表对外可见。 |
| rebuildSynthesisTagApplicationStateRow | 函数 | 270–282 | 简单 | contract、rebuild、tag-vocabulary | 0 | 重建标签词表 application state 行，规范化词表 basis 与统计字段。 |
| recordSynthesisTagEffectReceipts | 函数 | 701–733 | 简单 | audit、idempotency、receipt | 0 | 记录标签变更的 effect 回执，支撑幂等重放与审计。 |
| replaceSynthesisTagStagedSuggestions | 函数 | 571–600 | 简单 | persistence、staging、review | 0 | 整体替换 staged 标签建议行，供人工审阅确认。 |
| replaceSynthesisTagVocabularyState | 函数 | 525–552 | 简单 | transaction、persistence、tag-vocabulary | 0 | 在事务内替换标签词表全部行，保持词表与别名的一致性。 |

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
| [tagVocabularyApplication.ts](../../synthesis-application/src/tagVocabularyApplication.ts.md) | packages/synthesis-application/src/tagVocabularyApplication.ts | 标签词表应用层：读取并哈希词表候选、管理 staged 标签绑定与宿主批量生效请求，校验归一化后的状态记录并驱动 Zotero 侧 tag effect 执行。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureSynthesisTagVocabularyApplicationRepositorySchema | 函数 | 284–341 | 确保标签词表仓储 schema 存在，覆盖词条、别名、协议、审计与 effect 表。 |
| promoteSynthesisTagVocabularyState | 函数 | 626–674 | 提升标签词表状态为已发布，使新词表对外可见。 |
| rebuildSynthesisTagApplicationStateRow | 函数 | 270–282 | 重建标签词表 application state 行，规范化词表 basis 与统计字段。 |
| recordSynthesisTagEffectReceipts | 函数 | 701–733 | 记录标签变更的 effect 回执，支撑幂等重放与审计。 |
| replaceSynthesisTagStagedSuggestions | 函数 | 571–600 | 整体替换 staged 标签建议行，供人工审阅确认。 |
| replaceSynthesisTagVocabularyState | 函数 | 525–552 | 在事务内替换标签词表全部行，保持词表与别名的一致性。 |
