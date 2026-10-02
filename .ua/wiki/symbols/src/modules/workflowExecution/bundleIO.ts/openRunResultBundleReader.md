
# openRunResultBundleReader
<!-- node: function:src/modules/workflowExecution/bundleIO.ts:openRunResultBundleReader -->

打开运行结果 bundle：优先目录结果，其次 zip 结果，均不可用时回落到不可用 reader。
类型：函数  
复杂度：简单  
入边数：2  
标签：bundle、reader、zip、fallback  
所属文件：[src/modules/workflowExecution/bundleIO.ts](../../../../../files/src/modules/workflowExecution/bundleIO.ts.md)
源码：[src/modules/workflowExecution/bundleIO.ts:84](../../../../../../../src/modules/workflowExecution/bundleIO.ts#L84)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runWorkflowApplySeam](../applySeam.ts/runWorkflowApplySeam.md) | src/modules/workflowExecution/applySeam.ts:255–1172 | 工作流 apply seam 主入口：按请求种类分派单作业与序列路径，读取产物并调用运行时 apply，识别 ACP 可恢复非终态并汇总序列步骤结果。 |
| [executeSequenceStepApply](../../../../../files/src/modules/workflowExecution/sequenceStepApply.ts.md) | src/modules/workflowExecution/sequenceStepApply.ts:16–76 | 执行序列单步 apply：构造结果上下文、调用运行时 apply 并收集反馈与诊断返回。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createDirectoryBundleReader](../../../../../files/src/modules/workflowExecution/bundleIO.ts.md) | src/modules/workflowExecution/bundleIO.ts:51–71 | 基于目录构造 BundleReader，支持文本与字节读取并对缺失条目返回受控错误。 |
| [createUnavailableBundleReader](../../../../../files/src/modules/workflowExecution/bundleIO.ts.md) | src/modules/workflowExecution/bundleIO.ts:32–40 | 构造不可用的 BundleReader，所有读取均返回受控失败。 |
