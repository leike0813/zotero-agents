
# packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas](../../../../../../modules/packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas.md)
<!-- node: config:packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json -->

canonical literature artifacts v1 契约集中文献评分产物（literature_score.v1）的 JSON Schema，约束 rubric_id、paper_type 枚举、overall_score/confidence/confidence_adjusted_score 取值范围，以及固定 6 个维度的 Dimension、criteria 明细 Criterion 与带行号引文的 Evidence 子结构。
源码：[packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json](../../../../../../../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureArtifacts.ts](../../../src/literatureArtifacts.ts.md) | packages/synthesis-contracts/src/literatureArtifacts.ts | 定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。 |
