
# mutationResultToMigrationOutcome
<!-- node: function:src/modules/literatureArtifactMigration.ts:mutationResultToMigrationOutcome -->

把 canonical mutation 执行结果映射为迁移 outcome，区分成功、冲突、需人工介入等终态。
类型：函数  
复杂度：复杂  
入边数：1  
标签：mutation、迁移、结果映射  
所属文件：[src/modules/literatureArtifactMigration.ts](../../../../files/src/modules/literatureArtifactMigration.ts.md)
源码：[src/modules/literatureArtifactMigration.ts:408](../../../../../../src/modules/literatureArtifactMigration.ts#L408)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createLiteratureArtifactMigrationService](../../../../files/src/modules/literatureArtifactMigration.ts.md) | src/modules/literatureArtifactMigration.ts:1443–2495 | 迁移服务的构造入口：装配宿主、候选计划、批处理执行、运行状态持久化与中断恢复等全部生命周期能力。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [stripLegacyPayloadMarkup](../../../../files/src/modules/literatureArtifactMigration.ts.md) | src/modules/literatureArtifactMigration.ts:298–330 | 剥离 legacy payload 中的标签与样式标记，保留可读文本供迁移备注使用。 |
| [getMutationOperation](../../../../files/src/modules/zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts:626–638 | 按操作 ID 查询 canonical mutation 的当前状态与终态证据。 |
