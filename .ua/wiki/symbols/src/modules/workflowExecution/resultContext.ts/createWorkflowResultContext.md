
# createWorkflowResultContext
<!-- node: function:src/modules/workflowExecution/resultContext.ts:createWorkflowResultContext -->

构造工作流结果上下文：打开 bundle reader、定位并解析 result.json，并暴露按字段与产物路径读取的访问器。
类型：函数  
复杂度：中等  
入边数：3  
标签：result-context、factory、artifact、parsing、io  
所属文件：[src/modules/workflowExecution/resultContext.ts](../../../../../files/src/modules/workflowExecution/resultContext.ts.md)
源码：[src/modules/workflowExecution/resultContext.ts:442](../../../../../../../src/modules/workflowExecution/resultContext.ts#L442)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createSequenceApplyContext](../../../../../files/src/modules/workflowExecution/applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts:204–253 | 构造序列步骤的 apply 上下文，汇集 Provider 结果、运行状态与结果上下文读取能力。 |
| [runWorkflowApplySeam](../applySeam.ts/runWorkflowApplySeam.md) | src/modules/workflowExecution/applySeam.ts:255–1172 | 工作流 apply seam 主入口：按请求种类分派单作业与序列路径，读取产物并调用运行时 apply，识别 ACP 可恢复非终态并汇总序列步骤结果。 |
| [executeSequenceStepApply](../../../../../files/src/modules/workflowExecution/sequenceStepApply.ts.md) | src/modules/workflowExecution/sequenceStepApply.ts:16–76 | 执行序列单步 apply：构造结果上下文、调用运行时 apply 并收集反馈与诊断返回。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [addNamespacedPathCandidates](../../../../../files/src/modules/workflowExecution/resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts:287–327 | 为候选路径追加命名空间前缀变体，兼容不同 Provider 的产物目录布局。 |
| [addPathCandidates](../../../../../files/src/modules/workflowExecution/resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts:227–285 | 把一组基础路径展开为候选路径集合并去重。 |
| [buildArtifactCandidates](buildArtifactCandidates.md) | src/modules/workflowExecution/resultContext.ts:329–364 | 组合基础路径、命名空间与文件名后缀，生成最终产物候选列表。 |
| [tryReadResultJson](../../../../../files/src/modules/workflowExecution/resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts:373–440 | 按候选列表依次尝试读取并解析 result.json，失败时静默继续下一候选。 |
| [unwrapSkillRunnerResultJson](../../../../../files/src/modules/workflowExecution/resultEnvelope.ts.md) | src/modules/workflowExecution/resultEnvelope.ts:24–45 | 识别并解包 SkillRunner 结果信封，取出内部真实结果对象。 |
