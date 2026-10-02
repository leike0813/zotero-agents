
# runWorkflowUnitDuplicateGuardSeam
<!-- node: function:src/modules/workflowExecution/duplicateGuardSeam.ts:runWorkflowUnitDuplicateGuardSeam -->

对单个执行单元执行重复守卫，命中重复时给出可读的跳过原因与日志。
类型：函数  
复杂度：中等  
入边数：2  
标签：duplicate-guard、seam、validation、user-feedback  
所属文件：[src/modules/workflowExecution/duplicateGuardSeam.ts](../../../../../files/src/modules/workflowExecution/duplicateGuardSeam.ts.md)
源码：[src/modules/workflowExecution/duplicateGuardSeam.ts:123](../../../../../../../src/modules/workflowExecution/duplicateGuardSeam.ts#L123)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeWorkflowFromCurrentSelection](../../workflow/ui/workflowExecute.ts/executeWorkflowFromCurrentSelection.md) | src/modules/workflow/ui/workflowExecute.ts:78–408 | 从当前选择执行工作流：校验可运行性、运行 preparation seam 生成执行单元、判重后提交，并处理跳过与错误反馈。 |
| [runWorkflowDuplicateGuardSeam](../../../../../files/src/modules/workflowExecution/duplicateGuardSeam.ts.md) | src/modules/workflowExecution/duplicateGuardSeam.ts:260–370 | 对整批执行单元执行重复守卫，逐个判定并汇总通过与跳过结果。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [findDuplicateState](../../../../../files/src/modules/workflowExecution/duplicateGuardSeam.ts.md) | src/modules/workflowExecution/duplicateGuardSeam.ts:91–121 | 在活动任务中查找与给定执行单元身份重复的记录，区分可复用与冲突两种状态。 |
| [resolveInputUnitIdentityFromRequest](../../../../../files/src/modules/workflowExecution/requestMeta.ts.md) | src/modules/workflowExecution/requestMeta.ts:20–29 | 解析输入单元身份标识，用于重复守卫与日志追踪。 |
| [resolveTaskNameFromRequest](../requestMeta.ts/resolveTaskNameFromRequest.md) | src/modules/workflowExecution/requestMeta.ts:13–18 | 从请求中解析任务名，缺失时按索引生成占位名称。 |
