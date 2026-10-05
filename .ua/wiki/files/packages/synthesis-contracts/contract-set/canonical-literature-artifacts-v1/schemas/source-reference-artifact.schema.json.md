
# packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas](../../../../../../modules/packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas.md)
<!-- node: config:packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json -->

canonical literature artifacts v1 契约集中来源引用产物（source_reference_artifact.v1）的 JSON Schema，要求 references 数组（上限 25000 条），每条含 sourceReferenceId、extraction 抽取置信度、bibliography 书目字段与 matching 的 DOI/ISBN/citekey 等匹配标识，是引用分析产物所依赖的引用事实来源。
源码：[packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json](../../../../../../../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [protocolSchema.ts](../../../src/protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |
| [sourceReferenceArtifact.ts](../../../src/sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
