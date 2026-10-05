
# sequenceTerminalStepOwnsApply
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:sequenceTerminalStepOwnsApply -->

判定终态步骤是否自行负责 apply，避免与终态结果组装重复执行。
类型：函数  
复杂度：简单  
入边数：2  
标签：sequence、predicate、apply、terminal  
所属文件：[src/modules/workflowExecution/sequenceRuntime.ts](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md)
源码：[src/modules/workflowExecution/sequenceRuntime.ts:1352](../../../../../../../src/modules/workflowExecution/sequenceRuntime.ts#L1352)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [advanceSuccessfulSequenceStep](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:1249–1312 | 推进到下一个成功步骤，必要时返回延迟结果或终态结果。 |
| [executeSequenceFromState](executeSequenceFromState.md) | src/modules/workflowExecution/sequenceRuntime.ts:1582–1953 | 序列执行主循环：逐步构建请求、投递、等待完成并推进，涵盖错误、可恢复态与取消处理。 |

## 调用

该符号没有记录对外调用。
