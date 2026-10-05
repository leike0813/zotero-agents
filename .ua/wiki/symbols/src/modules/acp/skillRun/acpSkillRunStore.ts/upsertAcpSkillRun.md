
# upsertAcpSkillRun
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:upsertAcpSkillRun -->

写入或更新一条 run 记录：校验状态迁移、刷新 transcript 条目、更新权限与回复状态并触发持久化。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、store、state-management  
所属文件：[src/modules/acp/skillRun/acpSkillRunStore.ts](../../../../../../files/src/modules/acp/skillRun/acpSkillRunStore.ts.md)
源码：[src/modules/acp/skillRun/acpSkillRunStore.ts:1177](../../../../../../../../src/modules/acp/skillRun/acpSkillRunStore.ts#L1177)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [cancelAcpSkillRun](../../../../../../files/src/modules/acp/skillRun/acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts:103–169 | 取消一次 skill run：取消权限队列、通知 adapter 并把记录置为取消终态。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ensureAcpSkillRunStoreHydrated](../../../../../../files/src/modules/acp/skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts:689–734 | 确保插件状态库中的 run 记录已载入内存，重复调用直接复用已完成的水合结果。 |
| [persistRun](../../../../../../files/src/modules/acp/skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts:867–940 | 把单条 run 记录写入插件状态库，必要时同步刷新 context 与 output revision 文件。 |
