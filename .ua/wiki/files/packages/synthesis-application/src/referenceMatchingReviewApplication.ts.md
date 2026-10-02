
# packages/synthesis-application/src/referenceMatchingReviewApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/referenceMatchingReviewApplication.ts -->

参考文献匹配审阅应用层：驱动 reference matcher 引擎产出绑定/去重提案，维护提案状态机（待审、已接受、已丢弃），并把用户决策投影为 mutation 结果。
源码：[packages/synthesis-application/src/referenceMatchingReviewApplication.ts](../../../../../../packages/synthesis-application/src/referenceMatchingReviewApplication.ts)

## 符号（4）
<!-- node: function:packages/synthesis-application/src/referenceMatchingReviewApplication.ts:aggregateDelta -->
<!-- node: function:packages/synthesis-application/src/referenceMatchingReviewApplication.ts:createSynthesisReferenceMatchingReviewApplication -->
<!-- node: function:packages/synthesis-application/src/referenceMatchingReviewApplication.ts:projectSynthesisReferenceMatchingPromotion -->
<!-- node: function:packages/synthesis-application/src/referenceMatchingReviewApplication.ts:projectSynthesisReferenceMatchReviewTransition -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| aggregateDelta | 函数 | 120–144 | 中等 | 聚合、增量、参考文献 | 0 | 汇总各计数族的增量（新增绑定、移除绑定、去重合并等），生成 apply 阶段要写入的变化摘要。 |
| createSynthesisReferenceMatchingReviewApplication | 函数 | 552–855 | 复杂 | 工厂函数、参考文献、审阅、核心、命令集合 | 0 | 参考文献匹配审阅应用工厂：提供 prepare、inspect、提案分页、单条审阅决策、apply 与 discard 命令，并把引擎结果投影为稳定的 review 状态。 |
| projectSynthesisReferenceMatchingPromotion | 函数 | 198–331 | 复杂 | 投影、参考文献、匹配、有界 | 0 | 把绑定/去重引擎结果投影为待审提案集合，按稳定 ID 排序聚合并施加证据与候选数量上限。 |
| projectSynthesisReferenceMatchReviewTransition | 函数 | 333–546 | 复杂 | 状态机、审阅、参考文献、核心 | 0 | 执行单条提案的审阅状态迁移：接受、拒绝或改判后重算 delta 与剩余提案数，并校验迁移的合法前后态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [referenceMatcher.ts](../../synthesis-engine/src/referenceMatcher.ts.md) | packages/synthesis-engine/src/referenceMatcher.ts | 参考文献匹配引擎：从原始引文文本抽取标识符、归一化标题、聚类去重并按策略解析为 canonical reference，是引用图谱与引用分析的前置计算核心。 |
| [referenceMatchingReviewApplication.ts](../../synthesis-contracts/src/referenceMatchingReviewApplication.ts.md) | packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts | 参考文献匹配审阅应用契约：prepare/apply/discard 请求、匹配提案与审阅决策 DTO、提案分页以及带图谱增量的 mutation 结果重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisReferenceMatchingReviewApplication | 函数 | 552–855 | 参考文献匹配审阅应用工厂：提供 prepare、inspect、提案分页、单条审阅决策、apply 与 discard 命令，并把引擎结果投影为稳定的 review 状态。 |
| projectSynthesisReferenceMatchingPromotion | 函数 | 198–331 | 把绑定/去重引擎结果投影为待审提案集合，按稳定 ID 排序聚合并施加证据与候选数量上限。 |
| projectSynthesisReferenceMatchReviewTransition | 函数 | 333–546 | 执行单条提案的审阅状态迁移：接受、拒绝或改判后重算 delta 与剩余提案数，并校验迁移的合法前后态。 |
