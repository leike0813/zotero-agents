
# applySequenceTerminalStep
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:applySequenceTerminalStep -->

应用 sequence 终态步骤的结果，判定成功或失败并触发相应的收尾语义。
类型：函数  
复杂度：复杂  
入边数：1  
标签：skillrunner、workflow-execution、state-machine、core  
所属文件：[src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts](../../../../../../files/src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md)
源码：[src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:850](../../../../../../../../src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts#L850)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [continueSkillRunnerForegroundRunNow](continueSkillRunnerForegroundRunNow.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:1047–1234 | 续跑主实现：找到待推进的 run、构造下一 step 任务、提交执行并按结果更新 sequence 与终态。 |

## 调用

该符号没有记录对外调用。
