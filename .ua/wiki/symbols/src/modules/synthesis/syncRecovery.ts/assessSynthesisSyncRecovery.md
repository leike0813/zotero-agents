
# assessSynthesisSyncRecovery
<!-- node: function:src/modules/synthesis/syncRecovery.ts:assessSynthesisSyncRecovery -->

综合 root 绑定状态、本地索引健康度与冲突候选，产出同步恢复评估：状态、诊断、允许动作与确认要求；永不自动覆盖 canonical。
类型：函数  
复杂度：复杂  
入边数：1  
标签：synthesis、recovery、assessment、diagnostics  
所属文件：[src/modules/synthesis/syncRecovery.ts](../../../../../files/src/modules/synthesis/syncRecovery.ts.md)
源码：[src/modules/synthesis/syncRecovery.ts:125](../../../../../../../src/modules/synthesis/syncRecovery.ts#L125)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [planStartupSyncCheck](../../../../../files/src/modules/synthesis/syncRecovery.ts.md) | src/modules/synthesis/syncRecovery.ts:188–205 | 按启动哈希检查开关决定跳过或执行同步恢复评估，是启动期同步检查的唯一入口。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [normalizeConflictCandidates](normalizeConflictCandidates.md) | src/modules/synthesis/syncRecovery.ts:84–106 | 把部分填充的冲突候选对象规范化为完整的 SynthesisConflictCandidate 列表，丢弃缺少关键标识的条目。 |
