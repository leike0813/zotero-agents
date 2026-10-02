
# classifyConversion
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:classifyConversion -->

综合转换结果给出迁移分类（可迁移、需人工解析、跳过等）并汇总受影响条目与缺失产物。
类型：函数  
复杂度：复杂  
入边数：1  
标签：分类、迁移、诊断  
所属文件：[src/modules/literatureArtifactMigration/converter.ts](../../../../../files/src/modules/literatureArtifactMigration/converter.ts.md)
源码：[src/modules/literatureArtifactMigration/converter.ts:1023](../../../../../../../src/modules/literatureArtifactMigration/converter.ts#L1023)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveLiteratureArtifactMigrationConversion](../../../../../files/src/modules/literatureArtifactMigration/converter.ts.md) | src/modules/literatureArtifactMigration/converter.ts:1304–1441 | 把用户提供的解析决策应用到转换结果，产出最终可执行的 canonical 产物集合。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [normalizeCitation](normalizeCitation.md) | src/modules/literatureArtifactMigration/converter.ts:824–989 | 把 legacy citation 记录归一为 canonical citation 分析结构，生成稳定 mention id 并补全引用绑定。 |
| [resolveLegacyValues](resolveLegacyValues.md) | src/modules/literatureArtifactMigration/converter.ts:423–540 | 从多来源 legacy 输入中解析并归一 references、citation 等原始值，形成转换的中间事实。 |
