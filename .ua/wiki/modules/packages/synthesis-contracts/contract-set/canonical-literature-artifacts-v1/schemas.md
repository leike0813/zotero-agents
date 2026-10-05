
# packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas
> 目录聚合页：3 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json.md) | 配置 | 0 | canonical literature artifacts v1 契约集中引用分析产物（citation_analysis_artifact.v1）的 JSON Schema，规定 meta / summary / timeline / items / unresolved 六个必填顶层字段，并用 $defs 描述引用条目 CitationItem、引用功能枚举、mention 行号与 snippet、early/mid/recent 时间线分桶、scope 决策与参考文献抽取状态。 |
| [packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json.md) | 配置 | 0 | canonical literature artifacts v1 契约集中文献评分产物（literature_score.v1）的 JSON Schema，约束 rubric_id、paper_type 枚举、overall_score/confidence/confidence_adjusted_score 取值范围，以及固定 6 个维度的 Dimension、criteria 明细 Criterion 与带行号引文的 Evidence 子结构。 |
| [packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json.md) | 配置 | 0 | canonical literature artifacts v1 契约集中来源引用产物（source_reference_artifact.v1）的 JSON Schema，要求 references 数组（上限 25000 条），每条含 sourceReferenceId、extraction 抽取置信度、bibliography 书目字段与 matching 的 DOI/ISBN/citekey 等匹配标识，是引用分析产物所依赖的引用事实来源。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/src](../../src.md) | 3 |
