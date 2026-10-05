
# parseWorkflowManifestFromText
<!-- node: function:src/workflows/loaderContracts.ts:parseWorkflowManifestFromText -->

解析并校验工作流 manifest 文本，返回规范化 manifest 或带诊断的错误。
类型：函数  
复杂度：复杂  
入边数：2  
标签：parsing、validation、contract  
所属文件：[src/workflows/loaderContracts.ts](../../../../files/src/workflows/loaderContracts.ts.md)
源码：[src/workflows/loaderContracts.ts:424](../../../../../../src/workflows/loaderContracts.ts#L424)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [collectSingleWorkflowCandidate](../../../../files/src/workflows/loader.ts.md) | src/workflows/loader.ts:630–661 | 从单个 manifest 文件路径构造工作流候选，解析失败时转为错误级诊断而非抛出。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [formatManifestValidationError](../../../../files/src/workflows/loaderContracts.ts.md) | src/workflows/loaderContracts.ts:97–113 | 把 Ajv 错误对象格式化为带实例路径与关键字的可读消息。 |
| [getWorkflowManifestValidator](../../../../files/src/workflows/loaderContracts.ts.md) | src/workflows/loaderContracts.ts:68–81 | 惰性构建并缓存工作流 manifest 的 Ajv 校验函数。 |
| [validateSelectionCountSemantics](validateSelectionCountSemantics.md) | src/workflows/loaderContracts.ts:240–325 | 校验选择计数的完整语义：各条目 kind 的计数区间不得重叠冲突，并与输入规划对齐。 |
