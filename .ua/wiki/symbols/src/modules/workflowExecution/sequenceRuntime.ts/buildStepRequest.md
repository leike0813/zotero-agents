
# buildStepRequest
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:buildStepRequest -->

为单个序列步骤构建完整 Provider 请求：输入映射、附件绑定、运行选项与任务命名。
类型：函数  
复杂度：中等  
入边数：2  
标签：sequence、request、composition、step  
所属文件：[src/modules/workflowExecution/sequenceRuntime.ts](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md)
源码：[src/modules/workflowExecution/sequenceRuntime.ts:557](../../../../../../../src/modules/workflowExecution/sequenceRuntime.ts#L557)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applySequenceStepIfNeeded](applySequenceStepIfNeeded.md) | src/modules/workflowExecution/sequenceRuntime.ts:953–1167 | 在步骤成功且需要 apply 时执行 apply，处理结果解析、失败模式判定与状态写回。 |
| [executeSequenceFromState](executeSequenceFromState.md) | src/modules/workflowExecution/sequenceRuntime.ts:1582–1953 | 序列执行主循环：逐步构建请求、投递、等待完成并推进，涵盖错误、可恢复态与取消处理。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyHandoffBindings](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:452–555 | 把前序步骤输出按 handoff 声明绑定到当前步骤输入，支持嵌套取值与类型转换。 |
| [mapSequenceRequestInputs](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:236–259 | 遍历步骤输入声明并生成完整的请求输入映射。 |
| [resolveSequenceAttachmentBindings](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:154–197 | 解析序列步骤的附件绑定，将前序产物路径映射为当前步骤的上传输入。 |
| [resolveSequenceRequestForDispatch](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:287–323 | 在派发前按当前状态与上传映射解析出最终步骤请求。 |
