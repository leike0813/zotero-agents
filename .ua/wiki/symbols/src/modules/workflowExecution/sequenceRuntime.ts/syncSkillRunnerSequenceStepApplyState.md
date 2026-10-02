
# syncSkillRunnerSequenceStepApplyState
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:syncSkillRunnerSequenceStepApplyState -->

将 SkillRunner 步骤的 apply 状态与序列状态对齐，识别可恢复非终态。
类型：函数  
复杂度：简单  
入边数：2  
标签：sequence、sync、apply、skillrunner、state  
所属文件：[src/modules/workflowExecution/sequenceRuntime.ts](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md)
源码：[src/modules/workflowExecution/sequenceRuntime.ts:907](../../../../../../../src/modules/workflowExecution/sequenceRuntime.ts#L907)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [acceptCompletedSequenceStepNow](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:1425–1559 | 接收指定步骤的完成结果，解析 Provider 输出并更新序列状态。 |
| [applySequenceStepIfNeeded](applySequenceStepIfNeeded.md) | src/modules/workflowExecution/sequenceRuntime.ts:953–1167 | 在步骤成功且需要 apply 时执行 apply，处理结果解析、失败模式判定与状态写回。 |

## 调用

该符号没有记录对外调用。
