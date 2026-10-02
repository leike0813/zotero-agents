
# applySequenceStepIfNeeded
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:applySequenceStepIfNeeded -->

在步骤成功且需要 apply 时执行 apply，处理结果解析、失败模式判定与状态写回。
类型：函数  
复杂度：复杂  
入边数：1  
标签：sequence、apply、step、error-handling  
所属文件：[src/modules/workflowExecution/sequenceRuntime.ts](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md)
源码：[src/modules/workflowExecution/sequenceRuntime.ts:953](../../../../../../../src/modules/workflowExecution/sequenceRuntime.ts#L953)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyAndSettleSuccessfulSequenceStep](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:1203–1247 | 对成功步骤执行 apply 并立即完成生命周期收敛，失败时短路。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildStepRequest](buildStepRequest.md) | src/modules/workflowExecution/sequenceRuntime.ts:557–653 | 为单个序列步骤构建完整 Provider 请求：输入映射、附件绑定、运行选项与任务命名。 |
| [syncSkillRunnerSequenceStepApplyState](syncSkillRunnerSequenceStepApplyState.md) | src/modules/workflowExecution/sequenceRuntime.ts:907–951 | 将 SkillRunner 步骤的 apply 状态与序列状态对齐，识别可恢复非终态。 |
