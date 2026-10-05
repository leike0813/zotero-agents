
# continueSkillRunnerForegroundRunNow
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:continueSkillRunnerForegroundRunNow -->

续跑主实现：找到待推进的 run、构造下一 step 任务、提交执行并按结果更新 sequence 与终态。
类型：函数  
复杂度：复杂  
入边数：1  
标签：skillrunner、workflow-execution、orchestration、core  
所属文件：[src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts](../../../../../../files/src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md)
源码：[src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:1047](../../../../../../../../src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts#L1047)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [continueSkillRunnerForegroundRun](../../../../../../files/src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:1236–1264 | 对外续跑入口：按 runId 触发一次前台续跑，供自动回复观察器与外部调用方使用。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applySequenceTerminalStep](applySequenceTerminalStep.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:850–986 | 应用 sequence 终态步骤的结果，判定成功或失败并触发相应的收尾语义。 |
| [buildContinuationStepJob](../../../../../../files/src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:433–493 | 为续跑步骤构造 job 载荷，继承原 run 的工作流、step 键与后端上下文。 |
| [findContinuationRunRecord](../../../../../../files/src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:1033–1045 | 按 runId 查找待续跑的 run 记录，找不到时明确返回未找到而非新建。 |
| [persistContinuationStepJob](../../../../../../files/src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:613–684 | 持久化续跑步骤的 job 记录，使插件重启后仍能识别未完成的 step。 |
