
# executeSequenceFromState
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:executeSequenceFromState -->

序列执行主循环：逐步构建请求、投递、等待完成并推进，涵盖错误、可恢复态与取消处理。
类型：函数  
复杂度：复杂  
入边数：2  
标签：sequence、runtime、state-machine、orchestration、error-handling  
所属文件：[src/modules/workflowExecution/sequenceRuntime.ts](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md)
源码：[src/modules/workflowExecution/sequenceRuntime.ts:1582](../../../../../../../src/modules/workflowExecution/sequenceRuntime.ts#L1582)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [continueSequenceFromIndex](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:2022–2082 | 从指定步骤索引继续执行序列，用于断点续跑。 |
| [executeSkillRunnerSequence](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:1955–2020 | SkillRunner 序列执行入口：初始化或恢复序列运行状态后进入执行循环。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [acceptCompletedSequenceStep](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:1561–1580 | 接收完成步骤结果并推进状态机的对外入口。 |
| [buildSequenceResult](buildSequenceResult.md) | src/modules/workflowExecution/sequenceRuntime.ts:1314–1350 | 由序列状态组装最终运行结果，含各步骤输出与失败信息。 |
| [buildStepRequest](buildStepRequest.md) | src/modules/workflowExecution/sequenceRuntime.ts:557–653 | 为单个序列步骤构建完整 Provider 请求：输入映射、附件绑定、运行选项与任务命名。 |
| [sequenceTerminalStepOwnsApply](sequenceTerminalStepOwnsApply.md) | src/modules/workflowExecution/sequenceRuntime.ts:1352–1378 | 判定终态步骤是否自行负责 apply，避免与终态结果组装重复执行。 |
