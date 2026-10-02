
# packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts -->

参考文献匹配审阅应用契约：prepare/apply/discard 请求、匹配提案与审阅决策 DTO、提案分页以及带图谱增量的 mutation 结果重建。
源码：[packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts](../../../../../../packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts)

## 符号（19）
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:boundedStringArray -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:exactFields -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:jsonSafe -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildGraphDelta -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchingApplyRequest -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchingDiscardRequest -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchingInspectResult -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchingMutationResult -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchingPrepareRequest -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchingPrepareResult -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchProposal -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchProposalPage -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchProposalPageRequest -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchReviewDecision -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchReviewDecisionResult -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchReviewRequest -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:rebuildSynthesisReferenceMatchReviewResult -->
<!-- node: function:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:requiredString -->
<!-- node: class:packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts:SynthesisReferenceMatchingReviewContractError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| boundedStringArray | 函数 | 488–497 | 简单 | validation、contract、parsing | 0 | 收敛有长度上限的字符串数组，逐项校验。 |
| exactFields | 函数 | 169–178 | 简单 | validation、contract、guard | 0 | 校验对象字段集合与契约完全一致，多余或缺失字段均判为契约错误。 |
| jsonSafe | 函数 | 499–530 | 简单 | validation、serialization、contract | 0 | 递归校验 JSON 值只含可序列化类型，剔除 undefined、函数与不安全键。 |
| rebuildGraphDelta | 函数 | 542–570 | 简单 | contract、rebuild、citation-graph | 0 | 重建引用图谱增量：新增、合并与断开的引用关系。 |
| rebuildSynthesisReferenceMatchingApplyRequest | 函数 | 321–342 | 简单 | contract、rebuild、application-layer | 0 | 重建匹配 apply 请求，校验提案 ID 集合与决策载荷。 |
| rebuildSynthesisReferenceMatchingDiscardRequest | 函数 | 344–355 | 简单 | contract、rebuild、application-layer | 0 | 重建匹配 discard 请求，校验待丢弃的运行标识。 |
| rebuildSynthesisReferenceMatchingInspectResult | 函数 | 687–734 | 简单 | contract、rebuild、application-layer | 0 | 重建匹配 inspect 结果，汇总待审数量与分页游标。 |
| rebuildSynthesisReferenceMatchingMutationResult | 函数 | 768–812 | 简单 | contract、rebuild、durable-write | 0 | 重建匹配写操作结果，区分 durable 提交与重放拒绝。 |
| rebuildSynthesisReferenceMatchingPrepareRequest | 函数 | 198–319 | 中等 | contract、rebuild、application-layer | 0 | 重建匹配 prepare 请求，校验 scope、候选上限与并发写入边界。 |
| rebuildSynthesisReferenceMatchingPrepareResult | 函数 | 814–870 | 中等 | contract、rebuild、application-layer | 0 | 重建 prepare 结果，记录生成的提案与扫描 basis。 |
| rebuildSynthesisReferenceMatchProposal | 函数 | 572–685 | 中等 | contract、rebuild、reference-management | 0 | 重建匹配提案，含两端引用、置信度、证据与生成 basis。 |
| rebuildSynthesisReferenceMatchProposalPage | 函数 | 736–766 | 简单 | contract、rebuild、pagination | 0 | 重建提案分页结果，含页元数据与提案数组。 |
| rebuildSynthesisReferenceMatchProposalPageRequest | 函数 | 357–378 | 简单 | contract、rebuild、pagination | 0 | 重建提案分页请求，校验游标、页大小与过滤条件。 |
| rebuildSynthesisReferenceMatchReviewDecision | 函数 | 380–457 | 中等 | contract、rebuild、review-workflow | 0 | 重建单条审阅决策，校验动作、理由与操作者字段。 |
| rebuildSynthesisReferenceMatchReviewDecisionResult | 函数 | 872–917 | 简单 | contract、rebuild、review-workflow | 0 | 重建单条决策结果，记录提案的新状态与图谱影响。 |
| rebuildSynthesisReferenceMatchReviewRequest | 函数 | 459–476 | 简单 | contract、rebuild、review-workflow | 0 | 重建审阅请求，聚合决策数组与整体 basis。 |
| rebuildSynthesisReferenceMatchReviewResult | 函数 | 919–970 | 中等 | contract、rebuild、review-workflow | 0 | 重建整体审阅结果，聚合各决策结果与终态 basis。 |
| requiredString | 函数 | 180–190 | 简单 | validation、contract、parsing | 0 | 读取必填字符串字段，缺失、超长或含非法字符时抛出契约错误。 |
| SynthesisReferenceMatchingReviewContractError | 类 | 144–151 | 简单 | error-handling、contract、diagnostics | 0 | 匹配审阅契约错误，携带字段路径与失败原因码。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-contracts/src/durableBundle.ts | durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。 |
| [referenceMatchingReviewApplication.ts](../../synthesis-application/src/referenceMatchingReviewApplication.ts.md) | packages/synthesis-application/src/referenceMatchingReviewApplication.ts | 参考文献匹配审阅应用层：驱动 reference matcher 引擎产出绑定/去重提案，维护提案状态机（待审、已接受、已丢弃），并把用户决策投影为 mutation 结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisReferenceMatchingApplyRequest | 函数 | 321–342 | 重建匹配 apply 请求，校验提案 ID 集合与决策载荷。 |
| rebuildSynthesisReferenceMatchingDiscardRequest | 函数 | 344–355 | 重建匹配 discard 请求，校验待丢弃的运行标识。 |
| rebuildSynthesisReferenceMatchingInspectResult | 函数 | 687–734 | 重建匹配 inspect 结果，汇总待审数量与分页游标。 |
| rebuildSynthesisReferenceMatchingMutationResult | 函数 | 768–812 | 重建匹配写操作结果，区分 durable 提交与重放拒绝。 |
| rebuildSynthesisReferenceMatchingPrepareRequest | 函数 | 198–319 | 重建匹配 prepare 请求，校验 scope、候选上限与并发写入边界。 |
| rebuildSynthesisReferenceMatchingPrepareResult | 函数 | 814–870 | 重建 prepare 结果，记录生成的提案与扫描 basis。 |
| rebuildSynthesisReferenceMatchProposal | 函数 | 572–685 | 重建匹配提案，含两端引用、置信度、证据与生成 basis。 |
| rebuildSynthesisReferenceMatchProposalPage | 函数 | 736–766 | 重建提案分页结果，含页元数据与提案数组。 |
| rebuildSynthesisReferenceMatchProposalPageRequest | 函数 | 357–378 | 重建提案分页请求，校验游标、页大小与过滤条件。 |
| rebuildSynthesisReferenceMatchReviewDecision | 函数 | 380–457 | 重建单条审阅决策，校验动作、理由与操作者字段。 |
| rebuildSynthesisReferenceMatchReviewDecisionResult | 函数 | 872–917 | 重建单条决策结果，记录提案的新状态与图谱影响。 |
| rebuildSynthesisReferenceMatchReviewRequest | 函数 | 459–476 | 重建审阅请求，聚合决策数组与整体 basis。 |
| rebuildSynthesisReferenceMatchReviewResult | 函数 | 919–970 | 重建整体审阅结果，聚合各决策结果与终态 basis。 |
| SynthesisReferenceMatchingReviewContractError | 类 | 144–151 | 匹配审阅契约错误，携带字段路径与失败原因码。 |
