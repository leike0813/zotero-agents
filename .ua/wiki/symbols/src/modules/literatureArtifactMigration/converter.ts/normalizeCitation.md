
# normalizeCitation
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:normalizeCitation -->

把 legacy citation 记录归一为 canonical citation 分析结构，生成稳定 mention id 并补全引用绑定。
类型：函数  
复杂度：复杂  
入边数：1  
标签：citation、归一化、canonical  
所属文件：[src/modules/literatureArtifactMigration/converter.ts](../../../../../files/src/modules/literatureArtifactMigration/converter.ts.md)
源码：[src/modules/literatureArtifactMigration/converter.ts:824](../../../../../../../src/modules/literatureArtifactMigration/converter.ts#L824)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [classifyConversion](classifyConversion.md) | src/modules/literatureArtifactMigration/converter.ts:1023–1295 | 综合转换结果给出迁移分类（可迁移、需人工解析、跳过等）并汇总受影响条目与缺失产物。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [makeSourceReference](makeSourceReference.md) | src/modules/literatureArtifactMigration/converter.ts:595–661 | 构造并校验 SourceReference 产物，缺字段时记录诊断并复用已有 sourceReferenceId。 |
| [matchReference](../../../../../files/src/modules/literatureArtifactMigration/converter.ts.md) | src/modules/literatureArtifactMigration/converter.ts:663–720 | 按 DOI/citekey/标题等分级匹配 legacy 引用与已有 SourceReference，并报告匹配理由。 |
