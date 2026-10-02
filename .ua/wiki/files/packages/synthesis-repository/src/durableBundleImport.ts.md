
# packages/synthesis-repository/src/durableBundleImport.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-repository/src](../../../../modules/packages/synthesis-repository/src.md)
<!-- node: file:packages/synthesis-repository/src/durableBundleImport.ts -->

Durable bundle 导入仓储：按 sync index 与 commit receipt 校验导入事实，逐条 upsert 领域对象并更新各领域 basis，完成 durable 状态导入。
源码：[packages/synthesis-repository/src/durableBundleImport.ts](../../../../../../packages/synthesis-repository/src/durableBundleImport.ts)

## 符号（5）
<!-- node: function:packages/synthesis-repository/src/durableBundleImport.ts:applyEntry -->
<!-- node: function:packages/synthesis-repository/src/durableBundleImport.ts:applySynthesisDurableImportRepositoryState -->
<!-- node: function:packages/synthesis-repository/src/durableBundleImport.ts:captureSynthesisDurableImportRepositoryState -->
<!-- node: function:packages/synthesis-repository/src/durableBundleImport.ts:ensureSynthesisDurableImportRepositorySchema -->
<!-- node: function:packages/synthesis-repository/src/durableBundleImport.ts:readSyncIndex -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyEntry | 函数 | 407–504 | 中等 | durable-bundle、import、upsert | 0 | 按单条导入条目 upsert 领域对象并更新该领域的 basis 记录。 |
| applySynthesisDurableImportRepositoryState | 函数 | 572–638 | 中等 | transaction、durable-bundle、import | 0 | 在事务内应用整个 durable 导入状态，失败时回滚并返回导入事实。 |
| captureSynthesisDurableImportRepositoryState | 函数 | 295–314 | 简单 | snapshot、durable-bundle、import | 0 | 捕获导入前的仓储状态，为整体回滚与导入后对账提供依据。 |
| ensureSynthesisDurableImportRepositorySchema | 函数 | 141–212 | 中等 | schema、migration、durable-bundle | 0 | 确保 durable 导入所需的仓储 schema 存在，覆盖各领域对象与 sync index。 |
| readSyncIndex | 函数 | 232–268 | 简单 | durable-bundle、import、sync | 0 | 读取 durable bundle 的 sync index，确定待导入条目与其目标领域。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptKb.ts](conceptKb.ts.md) | packages/synthesis-repository/src/conceptKb.ts | 概念知识库持久化仓储：维护概念、义项、别名、关系、审阅项与主题-概念链接表，并支持概念状态整体替换与索引提升。 |
| [durableBundle.ts](../../synthesis-contracts/src/durableBundle.ts.md) | packages/synthesis-contracts/src/durableBundle.ts | durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。 |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-repository/src/durableBundle.ts | Durable bundle 仓储：把仓储层的引用、审阅、主题 basis 与草稿事实投影为可导出的 durable bundle 仓储状态。 |
| [durableBundleImport.ts](../../synthesis-contracts/src/durableBundleImport.ts.md) | packages/synthesis-contracts/src/durableBundleImport.ts | durable bundle 导入合约：构建同步索引，校验导入条目路径与载荷标量，规范化 live envelope 并把条目分类为可新增、可更新、可跳过三类事实。 |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |
| [referenceMatchingReview.ts](referenceMatchingReview.ts.md) | packages/synthesis-repository/src/referenceMatchingReview.ts | 引用匹配审阅仓储：持久化匹配提案、匹配状态与 preparation 阶段结果，提供分页查询、状态流转与已拒绝提案判定。 |
| [referenceRefresh.ts](referenceRefresh.ts.md) | packages/synthesis-repository/src/referenceRefresh.ts | 引用刷新仓储：维护 raw/canonical reference、artifact、source 与 binding 行的 canonical 重建，并支持按来源删除与整体投影替换。 |
| [tagVocabulary.ts](tagVocabulary.ts.md) | packages/synthesis-repository/src/tagVocabulary.ts | 标签词表持久化仓储：维护词条、别名、缩写、协议、告警、staged suggestion、审计与 effect 行，支持词表状态替换与索引提升。 |
| [topicGraph.ts](topicGraph.ts.md) | packages/synthesis-repository/src/topicGraph.ts | 主题关系图持久化仓储：维护应用状态、图节点、图边与审阅项表，提供状态整体替换和索引提升。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applySynthesisDurableImportRepositoryState | 函数 | 572–638 | 在事务内应用整个 durable 导入状态，失败时回滚并返回导入事实。 |
| captureSynthesisDurableImportRepositoryState | 函数 | 295–314 | 捕获导入前的仓储状态，为整体回滚与导入后对账提供依据。 |
| ensureSynthesisDurableImportRepositorySchema | 函数 | 141–212 | 确保 durable 导入所需的仓储 schema 存在，覆盖各领域对象与 sync index。 |
