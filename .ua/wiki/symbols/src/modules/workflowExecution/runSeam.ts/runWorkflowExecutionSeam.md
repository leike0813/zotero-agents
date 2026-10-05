
# runWorkflowExecutionSeam
<!-- node: function:src/modules/workflowExecution/runSeam.ts:runWorkflowExecutionSeam -->

运行 seam 主入口：按并发度投递已准备执行单元到队列与 Provider，登记任务、前台聚焦与进度订阅，并在终态后完成清理。
类型：函数  
复杂度：复杂  
入边数：1  
标签：seam、dispatch、orchestration、concurrency、lifecycle  
所属文件：[src/modules/workflowExecution/runSeam.ts](../../../../../files/src/modules/workflowExecution/runSeam.ts.md)
源码：[src/modules/workflowExecution/runSeam.ts:473](../../../../../../../src/modules/workflowExecution/runSeam.ts#L473)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executePreparedWorkflowUnit](../../../../../files/src/modules/workflowExecution/submissionSeam.ts.md) | src/modules/workflowExecution/submissionSeam.ts:69–126 | 执行单个已准备好的工作流单元：调用 execution seam 获取 run state，再按需走 apply seam 回填产物，并返回统一结果对象。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveWorkflowDispatchConcurrency](../../../../../files/src/modules/workflowExecution/runConcurrency.ts.md) | src/modules/workflowExecution/runConcurrency.ts:7–18 | 按 Provider 能力与请求数解析派发并发度，非全并行 Provider 恒为 1。 |
| [applySkillRunnerProgressEvent](../../../../../files/src/modules/workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts:183–300 | 将 SkillRunner 进度事件映射为工作流任务状态与日志，处理取消、失败与重试等终态。 |
| [observeWorkflowRunTerminal](../../../../../files/src/modules/workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts:387–471 | 观察工作流运行的终态事件，收尾任务记录、历史与 trace 并向订阅方发布结果。 |
| [recordSequenceStepSkillRunnerProgress](../../../../../files/src/modules/workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts:322–385 | 把序列步骤的 SkillRunner 进度记录到序列运行状态并通知订阅者。 |
| [executeSkillRunnerSequence](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:1955–2020 | SkillRunner 序列执行入口：初始化或恢复序列运行状态后进入执行循环。 |
