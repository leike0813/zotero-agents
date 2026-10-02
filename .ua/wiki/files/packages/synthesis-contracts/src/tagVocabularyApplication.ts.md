
# packages/synthesis-contracts/src/tagVocabularyApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/tagVocabularyApplication.ts -->

标签词表应用契约：候选、保存、分页、staging、条目更新删除、索引重建与审计替换清空的完整请求/结果 DTO 集合。
源码：[packages/synthesis-contracts/src/tagVocabularyApplication.ts](../../../../../../packages/synthesis-contracts/src/tagVocabularyApplication.ts)

## 符号（21）
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:entry -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:exact -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:protocol -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationAuditClearRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationAuditReplaceRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationCandidate -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationEntryDeleteRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationEntryUpdateRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationMutationResult -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationPageRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationRebuildIndexRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationSaveRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationSelectionRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationStagedPage -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationStageRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationState -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:rebuildSynthesisTagVocabularyApplicationUpdateStagedRequest -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:stagedSuggestion -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:string -->
<!-- node: function:packages/synthesis-contracts/src/tagVocabularyApplication.ts:stringRecord -->
<!-- node: class:packages/synthesis-contracts/src/tagVocabularyApplication.ts:SynthesisTagVocabularyApplicationContractError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| entry | 函数 | 188–268 | 中等 | validation、tag-vocabulary、contract | 0 | 重建标签词表词条：标签、facet、别名、缩写与弃用信息。 |
| exact | 函数 | 138–147 | 简单 | validation、contract、guard | 0 | 校验字段集合与契约一致，缺字段或多余字段都会失败。 |
| protocol | 函数 | 291–323 | 简单 | validation、tag-vocabulary、contract | 0 | 重建引擎协议描述：版本、tag 模式与 facet 列表。 |
| rebuildSynthesisTagVocabularyApplicationAuditClearRequest | 函数 | 607–619 | 简单 | contract、rebuild、audit | 0 | 重建审计清空请求，校验范围与确认语义。 |
| rebuildSynthesisTagVocabularyApplicationAuditReplaceRequest | 函数 | 564–605 | 简单 | contract、rebuild、audit | 0 | 重建审计替换请求，校验审计批次、行数与字节上限。 |
| rebuildSynthesisTagVocabularyApplicationCandidate | 函数 | 325–361 | 简单 | contract、rebuild、tag-vocabulary | 0 | 重建词表候选条目，含标签、facet 与置信证据。 |
| rebuildSynthesisTagVocabularyApplicationEntryDeleteRequest | 函数 | 536–548 | 简单 | contract、rebuild、tag-vocabulary | 0 | 重建词条删除请求，校验删除标识与原因。 |
| rebuildSynthesisTagVocabularyApplicationEntryUpdateRequest | 函数 | 515–534 | 简单 | contract、rebuild、tag-vocabulary | 0 | 重建词条更新请求，校验 facet、别名与弃用字段。 |
| rebuildSynthesisTagVocabularyApplicationMutationResult | 函数 | 701–763 | 中等 | contract、rebuild、durable-write | 0 | 重建词表写操作结果，记录 durable 提交与终态证据。 |
| rebuildSynthesisTagVocabularyApplicationPageRequest | 函数 | 379–393 | 简单 | contract、rebuild、pagination | 0 | 重建词表分页请求，校验游标与过滤条件。 |
| rebuildSynthesisTagVocabularyApplicationRebuildIndexRequest | 函数 | 550–562 | 简单 | contract、rebuild、index | 0 | 重建词表索引重建请求，校验范围与全量/增量模式。 |
| rebuildSynthesisTagVocabularyApplicationSaveRequest | 函数 | 363–377 | 简单 | contract、rebuild、tag-vocabulary | 0 | 重建词表保存请求，校验词条集合与并发 basis。 |
| rebuildSynthesisTagVocabularyApplicationSelectionRequest | 函数 | 489–513 | 简单 | contract、rebuild、tag-vocabulary | 0 | 重建词表选择请求，校验选中词条与分面。 |
| rebuildSynthesisTagVocabularyApplicationStagedPage | 函数 | 656–684 | 简单 | contract、rebuild、pagination | 0 | 重建 staged 分页结果，聚合建议与分页元数据。 |
| rebuildSynthesisTagVocabularyApplicationStageRequest | 函数 | 448–468 | 简单 | contract、rebuild、tag-vocabulary | 0 | 重建 staging 请求，校验建议集合与作用范围。 |
| rebuildSynthesisTagVocabularyApplicationState | 函数 | 621–654 | 简单 | contract、rebuild、tag-vocabulary | 0 | 重建词表应用状态，含版本、计数与索引就绪情况。 |
| rebuildSynthesisTagVocabularyApplicationUpdateStagedRequest | 函数 | 470–487 | 简单 | contract、rebuild、tag-vocabulary | 0 | 重建 staged 条目更新请求，校验字段变更与 basis。 |
| stagedSuggestion | 函数 | 395–446 | 中等 | contract、rebuild、tag-vocabulary | 0 | 重建 staged 标签建议，校验建议标签、facet 与置信度。 |
| string | 函数 | 149–160 | 简单 | utility、internal、synthesis | 0 | 标签词表应用契约：候选、保存、分页、staging、条目更新删除、索引重建与审计替换清空的完整请求/结果 DTO 集合。 内部的 string 处理逻辑。 |
| stringRecord | 函数 | 270–289 | 简单 | validation、contract、parsing | 0 | 收敛字符串键值记录，限制键数、键长与值长。 |
| SynthesisTagVocabularyApplicationContractError | 类 | 114–121 | 简单 | error-handling、contract、diagnostics | 0 | 标签词表应用契约错误，携带字段路径与失败原因码。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [itemRef.ts](itemRef.ts.md) | packages/synthesis-contracts/src/itemRef.ts | Zotero 条目引用合约：校验 libraryId 与 itemKey 的组合，提供稳定的比较函数、键构造函数与批量重建，供跨边界传递 portable refs。 |
| [tagVocabularyCore.ts](tagVocabularyCore.ts.md) | packages/synthesis-contracts/src/tagVocabularyCore.ts | 标签词表引擎核心类型：词条、引擎协议、校验警告与索引检索行的定义。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-contracts/src/durableBundle.ts | durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。 |
| [knowledgeCheckpoint.ts](knowledgeCheckpoint.ts.md) | packages/synthesis-contracts/src/knowledgeCheckpoint.ts | 知识检查点合约：定义三类知识 basis（标签修订、概念清单、主题图）、载荷结构与计数族，并重建检查点对象与 apply 请求。 |
| [tagVocabularyApplication.ts](../../synthesis-application/src/tagVocabularyApplication.ts.md) | packages/synthesis-application/src/tagVocabularyApplication.ts | 标签词表应用层：读取并哈希词表候选、管理 staged 标签绑定与宿主批量生效请求，校验归一化后的状态记录并驱动 Zotero 侧 tag effect 执行。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisTagVocabularyApplicationAuditClearRequest | 函数 | 607–619 | 重建审计清空请求，校验范围与确认语义。 |
| rebuildSynthesisTagVocabularyApplicationAuditReplaceRequest | 函数 | 564–605 | 重建审计替换请求，校验审计批次、行数与字节上限。 |
| rebuildSynthesisTagVocabularyApplicationCandidate | 函数 | 325–361 | 重建词表候选条目，含标签、facet 与置信证据。 |
| rebuildSynthesisTagVocabularyApplicationEntryDeleteRequest | 函数 | 536–548 | 重建词条删除请求，校验删除标识与原因。 |
| rebuildSynthesisTagVocabularyApplicationEntryUpdateRequest | 函数 | 515–534 | 重建词条更新请求，校验 facet、别名与弃用字段。 |
| rebuildSynthesisTagVocabularyApplicationMutationResult | 函数 | 701–763 | 重建词表写操作结果，记录 durable 提交与终态证据。 |
| rebuildSynthesisTagVocabularyApplicationPageRequest | 函数 | 379–393 | 重建词表分页请求，校验游标与过滤条件。 |
| rebuildSynthesisTagVocabularyApplicationRebuildIndexRequest | 函数 | 550–562 | 重建词表索引重建请求，校验范围与全量/增量模式。 |
| rebuildSynthesisTagVocabularyApplicationSaveRequest | 函数 | 363–377 | 重建词表保存请求，校验词条集合与并发 basis。 |
| rebuildSynthesisTagVocabularyApplicationSelectionRequest | 函数 | 489–513 | 重建词表选择请求，校验选中词条与分面。 |
| rebuildSynthesisTagVocabularyApplicationStagedPage | 函数 | 656–684 | 重建 staged 分页结果，聚合建议与分页元数据。 |
| rebuildSynthesisTagVocabularyApplicationStageRequest | 函数 | 448–468 | 重建 staging 请求，校验建议集合与作用范围。 |
| rebuildSynthesisTagVocabularyApplicationState | 函数 | 621–654 | 重建词表应用状态，含版本、计数与索引就绪情况。 |
| rebuildSynthesisTagVocabularyApplicationUpdateStagedRequest | 函数 | 470–487 | 重建 staged 条目更新请求，校验字段变更与 basis。 |
| SynthesisTagVocabularyApplicationContractError | 类 | 114–121 | 标签词表应用契约错误，携带字段路径与失败原因码。 |
