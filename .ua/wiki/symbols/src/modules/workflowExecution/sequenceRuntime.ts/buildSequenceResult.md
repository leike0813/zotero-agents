
# buildSequenceResult
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:buildSequenceResult -->

由序列状态组装最终运行结果，含各步骤输出与失败信息。
类型：函数  
复杂度：简单  
入边数：2  
标签：sequence、result、composition、projection  
所属文件：[src/modules/workflowExecution/sequenceRuntime.ts](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md)
源码：[src/modules/workflowExecution/sequenceRuntime.ts:1314](../../../../../../../src/modules/workflowExecution/sequenceRuntime.ts#L1314)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildTerminalSequenceResultFromState](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:1380–1401 | 直接从序列状态构造终态结果，用于跳过剩余步骤的场景。 |
| [executeSequenceFromState](executeSequenceFromState.md) | src/modules/workflowExecution/sequenceRuntime.ts:1582–1953 | 序列执行主循环：逐步构建请求、投递、等待完成并推进，涵盖错误、可恢复态与取消处理。 |

## 调用

该符号没有记录对外调用。
