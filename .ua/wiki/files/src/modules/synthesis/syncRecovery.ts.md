
# src/modules/synthesis/syncRecovery.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/syncRecovery.ts -->

Synthesis 侧同步恢复逻辑，负责在 sidecar 交互中断后重建同步状态并驱动重试与补偿流程。
源码：[src/modules/synthesis/syncRecovery.ts](../../../../../../src/modules/synthesis/syncRecovery.ts)

## 符号（4）
<!-- node: function:src/modules/synthesis/syncRecovery.ts:assessSynthesisSyncRecovery -->
<!-- node: function:src/modules/synthesis/syncRecovery.ts:buildConflictCandidateActions -->
<!-- node: function:src/modules/synthesis/syncRecovery.ts:normalizeConflictCandidates -->
<!-- node: function:src/modules/synthesis/syncRecovery.ts:planStartupSyncCheck -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [assessSynthesisSyncRecovery](../../../../symbols/src/modules/synthesis/syncRecovery.ts/assessSynthesisSyncRecovery.md) | 函数 | 125–186 | 复杂 | synthesis、recovery、assessment、diagnostics | 1 | 综合 root 绑定状态、本地索引健康度与冲突候选，产出同步恢复评估：状态、诊断、允许动作与确认要求；永不自动覆盖 canonical。 |
| buildConflictCandidateActions | 函数 | 108–123 | 中等 | synthesis、recovery、conflict、action-planning | 0 | 为单个冲突候选构造本地可行的恢复动作（重试更新或清除候选），并标记 localOnly 语义。 |
| [normalizeConflictCandidates](../../../../symbols/src/modules/synthesis/syncRecovery.ts/normalizeConflictCandidates.md) | 函数 | 84–106 | 中等 | synthesis、normalization、validation、conflict | 3 | 把部分填充的冲突候选对象规范化为完整的 SynthesisConflictCandidate 列表，丢弃缺少关键标识的条目。 |
| planStartupSyncCheck | 函数 | 188–205 | 中等 | synthesis、startup、recovery、entry-point | 0 | 按启动哈希检查开关决定跳过或执行同步恢复评估，是启动期同步检查的唯一入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [assessSynthesisSyncRecovery](../../../../symbols/src/modules/synthesis/syncRecovery.ts/assessSynthesisSyncRecovery.md) | 函数 | 125–186 | 综合 root 绑定状态、本地索引健康度与冲突候选，产出同步恢复评估：状态、诊断、允许动作与确认要求；永不自动覆盖 canonical。 |
| buildConflictCandidateActions | 函数 | 108–123 | 为单个冲突候选构造本地可行的恢复动作（重试更新或清除候选），并标记 localOnly 语义。 |
| [normalizeConflictCandidates](../../../../symbols/src/modules/synthesis/syncRecovery.ts/normalizeConflictCandidates.md) | 函数 | 84–106 | 把部分填充的冲突候选对象规范化为完整的 SynthesisConflictCandidate 列表，丢弃缺少关键标识的条目。 |
| planStartupSyncCheck | 函数 | 188–205 | 按启动哈希检查开关决定跳过或执行同步恢复评估，是启动期同步检查的唯一入口。 |
