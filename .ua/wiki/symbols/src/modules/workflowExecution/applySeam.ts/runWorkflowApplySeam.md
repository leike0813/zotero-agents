
# runWorkflowApplySeam
<!-- node: function:src/modules/workflowExecution/applySeam.ts:runWorkflowApplySeam -->

工作流 apply seam 主入口：按请求种类分派单作业与序列路径，读取产物并调用运行时 apply，识别 ACP 可恢复非终态并汇总序列步骤结果。
类型：函数  
复杂度：复杂  
入边数：1  
标签：seam、apply、orchestration、acp、sequence  
所属文件：[src/modules/workflowExecution/applySeam.ts](../../../../../files/src/modules/workflowExecution/applySeam.ts.md)
源码：[src/modules/workflowExecution/applySeam.ts:255](../../../../../../../src/modules/workflowExecution/applySeam.ts#L255)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executePreparedWorkflowUnit](../../../../../files/src/modules/workflowExecution/submissionSeam.ts.md) | src/modules/workflowExecution/submissionSeam.ts:69–126 | 执行单个已准备好的工作流单元：调用 execution seam 获取 run state，再按需走 apply seam 回填产物，并返回统一结果对象。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [normalizeWorkflowApplyDiagnostics](../../../../../files/src/modules/workflowExecution/applyDiagnostics.ts.md) | src/modules/workflowExecution/applyDiagnostics.ts:18–58 | 归一化 apply 诊断信息：过滤非法 warning、限制 code 数量与长度并保留错误码。 |
| [createSequenceApplyContext](../../../../../files/src/modules/workflowExecution/applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts:204–253 | 构造序列步骤的 apply 上下文，汇集 Provider 结果、运行状态与结果上下文读取能力。 |
| [isSkillRunnerSingleJobRequest](../../../../../files/src/modules/workflowExecution/applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts:66–87 | 判断当前请求是否为 SkillRunner 单作业（非序列）执行。 |
| [openRunResultBundleReader](../bundleIO.ts/openRunResultBundleReader.md) | src/modules/workflowExecution/bundleIO.ts:84–114 | 打开运行结果 bundle：优先目录结果，其次 zip 结果，均不可用时回落到不可用 reader。 |
| [createWorkflowResultContext](../resultContext.ts/createWorkflowResultContext.md) | src/modules/workflowExecution/resultContext.ts:442–578 | 构造工作流结果上下文：打开 bundle reader、定位并解析 result.json，并暴露按字段与产物路径读取的访问器。 |
