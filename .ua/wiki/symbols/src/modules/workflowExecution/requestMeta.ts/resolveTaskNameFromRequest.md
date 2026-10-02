
# resolveTaskNameFromRequest
<!-- node: function:src/modules/workflowExecution/requestMeta.ts:resolveTaskNameFromRequest -->

从请求中解析任务名，缺失时按索引生成占位名称。
类型：函数  
复杂度：简单  
入边数：2  
标签：metadata、request、fallback  
所属文件：[src/modules/workflowExecution/requestMeta.ts](../../../../../files/src/modules/workflowExecution/requestMeta.ts.md)
源码：[src/modules/workflowExecution/requestMeta.ts:13](../../../../../../../src/modules/workflowExecution/requestMeta.ts#L13)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [findDuplicateState](../../../../../files/src/modules/workflowExecution/duplicateGuardSeam.ts.md) | src/modules/workflowExecution/duplicateGuardSeam.ts:91–121 | 在活动任务中查找与给定执行单元身份重复的记录，区分可复用与冲突两种状态。 |
| [runWorkflowUnitDuplicateGuardSeam](../duplicateGuardSeam.ts/runWorkflowUnitDuplicateGuardSeam.md) | src/modules/workflowExecution/duplicateGuardSeam.ts:123–246 | 对单个执行单元执行重复守卫，命中重复时给出可读的跳过原因与日志。 |

## 调用

该符号没有记录对外调用。
