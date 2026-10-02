
# resolveLegacyValues
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:resolveLegacyValues -->

从多来源 legacy 输入中解析并归一 references、citation 等原始值，形成转换的中间事实。
类型：函数  
复杂度：复杂  
入边数：1  
标签：legacy、归一化、转换  
所属文件：[src/modules/literatureArtifactMigration/converter.ts](../../../../../files/src/modules/literatureArtifactMigration/converter.ts.md)
源码：[src/modules/literatureArtifactMigration/converter.ts:423](../../../../../../../src/modules/literatureArtifactMigration/converter.ts#L423)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [classifyConversion](classifyConversion.md) | src/modules/literatureArtifactMigration/converter.ts:1023–1295 | 综合转换结果给出迁移分类（可迁移、需人工解析、跳过等）并汇总受影响条目与缺失产物。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [decodeHtmlPayloads](../../../../../files/src/modules/literatureArtifactMigration/converter.ts.md) | src/modules/literatureArtifactMigration/converter.ts:386–399 | 从笔记 HTML 中提取全部 payload 标签及其对应类型。 |
