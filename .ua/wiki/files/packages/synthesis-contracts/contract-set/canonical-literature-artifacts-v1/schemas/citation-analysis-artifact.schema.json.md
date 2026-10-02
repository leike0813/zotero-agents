
# packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas](../../../../../../modules/packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas.md)
<!-- node: config:packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json -->

canonical literature artifacts v1 契约集中引用分析产物（citation_analysis_artifact.v1）的 JSON Schema，规定 meta / summary / timeline / items / unresolved 六个必填顶层字段，并用 $defs 描述引用条目 CitationItem、引用功能枚举、mention 行号与 snippet、early/mid/recent 时间线分桶、scope 决策与参考文献抽取状态。
源码：[packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json](../../../../../../../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [protocolSchema.ts](../../../src/protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |
| [sourceReferenceArtifact.ts](../../../src/sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literature-score-artifact.schema.json](literature-score-artifact.schema.json.md) | packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json | canonical literature artifacts v1 契约集中文献评分产物（literature_score.v1）的 JSON Schema，约束 rubric_id、paper_type 枚举、overall_score/confidence/confidence_adjusted_score 取值范围，以及固定 6 个维度的 Dimension、criteria 明细 Criterion 与带行号引文的 Evidence 子结构。 |
| [source-reference-artifact.schema.json](source-reference-artifact.schema.json.md) | packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json | canonical literature artifacts v1 契约集中来源引用产物（source_reference_artifact.v1）的 JSON Schema，要求 references 数组（上限 25000 条），每条含 sourceReferenceId、extraction 抽取置信度、bibliography 书目字段与 matching 的 DOI/ISBN/citekey 等匹配标识，是引用分析产物所依赖的引用事实来源。 |
