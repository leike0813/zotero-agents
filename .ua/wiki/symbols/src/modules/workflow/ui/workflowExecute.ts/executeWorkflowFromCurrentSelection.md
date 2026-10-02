
# executeWorkflowFromCurrentSelection
<!-- node: function:src/modules/workflow/ui/workflowExecute.ts:executeWorkflowFromCurrentSelection -->

从当前选择执行工作流：校验可运行性、运行 preparation seam 生成执行单元、判重后提交，并处理跳过与错误反馈。
类型：函数  
复杂度：复杂  
入边数：1  
标签：execution、entry-point、orchestration、submission、duplicate-guard  
所属文件：[src/modules/workflow/ui/workflowExecute.ts](../../../../../../files/src/modules/workflow/ui/workflowExecute.ts.md)
源码：[src/modules/workflow/ui/workflowExecute.ts:78](../../../../../../../../src/modules/workflow/ui/workflowExecute.ts#L78)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [triggerWorkflowFromUnifiedEntry](../../../../../../files/src/modules/workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts:233–266 | 统一触发入口：按策略判定是否需要选择上下文，随后执行工作流并反馈触发失败原因。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [isWorkflowConfigurable](../../../../../../files/src/modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts:986–996 | 判断工作流是否存在可配置项，无可配置项时隐藏设置入口。 |
| [updateWorkflowSettings](../../../../../../files/src/modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts:580–605 | 合并写入工作流设置，校验修订号后序列化并刷新缓存。 |
| [runWorkflowUnitDuplicateGuardSeam](../../../workflowExecution/duplicateGuardSeam.ts/runWorkflowUnitDuplicateGuardSeam.md) | src/modules/workflowExecution/duplicateGuardSeam.ts:123–246 | 对单个执行单元执行重复守卫，命中重复时给出可读的跳过原因与日志。 |
| [buildWorkflowExecutionUnitPreview](../../../workflowExecution/preparationSeam.ts/buildWorkflowExecutionUnitPreview.md) | src/modules/workflowExecution/preparationSeam.ts:742–811 | 构建执行单元预览描述，含任务名、输入规模与选项摘要供 UI 展示。 |
| [runWorkflowPreparationSeam](../../../workflowExecution/preparationSeam.ts/runWorkflowPreparationSeam.md) | src/modules/workflowExecution/preparationSeam.ts:366–740 | preparation seam 主入口：解析执行上下文、规划执行单元、构建请求、校验必填参数并返回已准备执行结果或带诊断的失败。 |
