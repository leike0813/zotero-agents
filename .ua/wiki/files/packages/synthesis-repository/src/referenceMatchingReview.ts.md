
# packages/synthesis-repository/src/referenceMatchingReview.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-repository/src](../../../../modules/packages/synthesis-repository/src.md)
<!-- node: file:packages/synthesis-repository/src/referenceMatchingReview.ts -->

引用匹配审阅仓储：持久化匹配提案、匹配状态与 preparation 阶段结果，提供分页查询、状态流转与已拒绝提案判定。
源码：[packages/synthesis-repository/src/referenceMatchingReview.ts](../../../../../../packages/synthesis-repository/src/referenceMatchingReview.ts)

## 符号（6）
<!-- node: function:packages/synthesis-repository/src/referenceMatchingReview.ts:ensureSynthesisReferenceMatchingReviewRepositorySchema -->
<!-- node: function:packages/synthesis-repository/src/referenceMatchingReview.ts:listSynthesisReferenceMatchProposalPage -->
<!-- node: function:packages/synthesis-repository/src/referenceMatchingReview.ts:rebuildSynthesisReferenceMatchProposalRow -->
<!-- node: function:packages/synthesis-repository/src/referenceMatchingReview.ts:reconcileSynthesisReferenceMatchingPreparations -->
<!-- node: function:packages/synthesis-repository/src/referenceMatchingReview.ts:replaceSynthesisReferenceMatchingState -->
<!-- node: function:packages/synthesis-repository/src/referenceMatchingReview.ts:updateSynthesisReferenceMatchProposalStatus -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ensureSynthesisReferenceMatchingReviewRepositorySchema | 函数 | 366–387 | 简单 | schema、migration、sqlite | 0 | 确保引用匹配审阅 schema 存在，覆盖提案、状态与 preparation 表。 |
| listSynthesisReferenceMatchProposalPage | 函数 | 683–704 | 简单 | query、pagination、review | 0 | 按状态与游标分页查询匹配提案，供审阅界面加载。 |
| rebuildSynthesisReferenceMatchProposalRow | 函数 | 205–244 | 简单 | contract、rebuild、reference-matching | 0 | 重建引用匹配提案行，规范化来源、目标与证据字段。 |
| reconcileSynthesisReferenceMatchingPreparations | 函数 | 527–542 | 简单 | reconciliation、lifecycle、reference-matching | 0 | 对残留的 preparation 记录做启动对账，标记无法继续的为失败或待续。 |
| replaceSynthesisReferenceMatchingState | 函数 | 396–432 | 简单 | transaction、persistence、reference-matching | 0 | 整体替换引用匹配状态行，保持与提案表的原子一致。 |
| updateSynthesisReferenceMatchProposalStatus | 函数 | 713–735 | 简单 | state-machine、persistence、review | 0 | 以 compare-and-set 语义推进匹配提案状态，阻止非法迁移。 |

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

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureSynthesisReferenceMatchingReviewRepositorySchema | 函数 | 366–387 | 确保引用匹配审阅 schema 存在，覆盖提案、状态与 preparation 表。 |
| listSynthesisReferenceMatchProposalPage | 函数 | 683–704 | 按状态与游标分页查询匹配提案，供审阅界面加载。 |
| rebuildSynthesisReferenceMatchProposalRow | 函数 | 205–244 | 重建引用匹配提案行，规范化来源、目标与证据字段。 |
| reconcileSynthesisReferenceMatchingPreparations | 函数 | 527–542 | 对残留的 preparation 记录做启动对账，标记无法继续的为失败或待续。 |
| replaceSynthesisReferenceMatchingState | 函数 | 396–432 | 整体替换引用匹配状态行，保持与提案表的原子一致。 |
| updateSynthesisReferenceMatchProposalStatus | 函数 | 713–735 | 以 compare-and-set 语义推进匹配提案状态，阻止非法迁移。 |
