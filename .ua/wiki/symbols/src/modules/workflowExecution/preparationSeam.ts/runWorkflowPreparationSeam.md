
# runWorkflowPreparationSeam
<!-- node: function:src/modules/workflowExecution/preparationSeam.ts:runWorkflowPreparationSeam -->

preparation seam 主入口：解析执行上下文、规划执行单元、构建请求、校验必填参数并返回已准备执行结果或带诊断的失败。
类型：函数  
复杂度：复杂  
入边数：1  
标签：seam、preparation、input-planning、validation、orchestration  
所属文件：[src/modules/workflowExecution/preparationSeam.ts](../../../../../files/src/modules/workflowExecution/preparationSeam.ts.md)
源码：[src/modules/workflowExecution/preparationSeam.ts:366](../../../../../../../src/modules/workflowExecution/preparationSeam.ts#L366)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeWorkflowFromCurrentSelection](../../workflow/ui/workflowExecute.ts/executeWorkflowFromCurrentSelection.md) | src/modules/workflow/ui/workflowExecute.ts:78–408 | 从当前选择执行工作流：校验可运行性、运行 preparation seam 生成执行单元、判重后提交，并处理跳过与错误反馈。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveWorkflowExecutionContext](../../../../../files/src/modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts:1052–1134 | 解析工作流执行上下文：确定后端、Provider、运行时选项、宿主访问范围与并发度。 |
| [adaptRequestsForExecutionContext](../../../../../files/src/modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts:93–136 | 按解析出的执行上下文调整构建好的请求，注入后端标识与运行选项。 |
| [buildPreparedWorkflowBatchExecution](../../../../../files/src/modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts:888–968 | 汇总多个已准备执行对象为批量执行计划并计算可执行/跳过统计。 |
| [collectSkillRunnerSkillIdsFromRequests](../../../../../files/src/modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts:237–259 | 从请求集合中收集全部 Skill ID 供展示名解析使用。 |
| [resolveSkillRunnerSkillDisplayById](../../../../../files/src/modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts:281–318 | 按 Skill ID 解析展示名称，缺失时回落到 ID 本身。 |
| [resolveSkippedUnitsFromNoValidInputError](../../../../../files/src/modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts:320–340 | 从“无有效输入”错误中还原被跳过的执行单元，供 UI 展示明细。 |
