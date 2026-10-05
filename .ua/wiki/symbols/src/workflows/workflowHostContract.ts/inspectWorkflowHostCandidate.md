
# inspectWorkflowHostCandidate
<!-- node: function:src/workflows/workflowHostContract.ts:inspectWorkflowHostCandidate -->

按候选 manifest 检查实际宿主实现，产出缺失成员、多余成员、非函数、非对象与取值不符五类偏差。
类型：函数  
复杂度：复杂  
入边数：1  
标签：contract、validation、host-bridge  
所属文件：[src/workflows/workflowHostContract.ts](../../../../files/src/workflows/workflowHostContract.ts.md)
源码：[src/workflows/workflowHostContract.ts:244](../../../../../../src/workflows/workflowHostContract.ts#L244)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [inspectWorkflowHostContract](../../../../files/src/workflows/workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts:424–471 | Workflow Host 契约检查入口：按候选 manifest 汇总各变体检查结果与能力摘要。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [collectManifestLeafPaths](../../../../files/src/workflows/workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts:228–242 | 把候选 manifest 递归展开为叶子路径集合，oneOf 与函数成员单独处理。 |
