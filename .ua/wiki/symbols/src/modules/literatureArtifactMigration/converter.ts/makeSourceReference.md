
# makeSourceReference
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:makeSourceReference -->

构造并校验 SourceReference 产物，缺字段时记录诊断并复用已有 sourceReferenceId。
类型：函数  
复杂度：复杂  
入边数：1  
标签：文献产物、canonical、校验  
所属文件：[src/modules/literatureArtifactMigration/converter.ts](../../../../../files/src/modules/literatureArtifactMigration/converter.ts.md)
源码：[src/modules/literatureArtifactMigration/converter.ts:595](../../../../../../../src/modules/literatureArtifactMigration/converter.ts#L595)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [normalizeCitation](normalizeCitation.md) | src/modules/literatureArtifactMigration/converter.ts:824–989 | 把 legacy citation 记录归一为 canonical citation 分析结构，生成稳定 mention id 并补全引用绑定。 |

## 调用

该符号没有记录对外调用。
