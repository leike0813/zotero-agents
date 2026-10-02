
# inspectWorkflowHostContractVariants
<!-- node: function:src/workflows/workflowHostContract.ts:inspectWorkflowHostContractVariants -->

依次检查 interactive 与 non-interactive 两个契约变体，报告实际满足的变体。
类型：函数  
复杂度：复杂  
入边数：2  
标签：contract、validation、host-bridge  
所属文件：[src/workflows/workflowHostContract.ts](../../../../files/src/workflows/workflowHostContract.ts.md)
源码：[src/workflows/workflowHostContract.ts:329](../../../../../../src/workflows/workflowHostContract.ts#L329)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [inspectWorkflowHostContract](../../../../files/src/workflows/workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts:424–471 | Workflow Host 契约检查入口：按候选 manifest 汇总各变体检查结果与能力摘要。 |
| [resolveWorkflowHostContractVersion](../../../../files/src/workflows/workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts:387–405 | 解析宿主实际支持的 Workflow Host API 契约版本号，供输入规划选择上下文构造方式。 |

## 调用

该符号没有记录对外调用。
