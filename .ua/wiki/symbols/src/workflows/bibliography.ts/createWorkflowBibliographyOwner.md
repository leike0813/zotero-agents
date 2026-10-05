
# createWorkflowBibliographyOwner
<!-- node: function:src/workflows/bibliography.ts:createWorkflowBibliographyOwner -->

创建书目 owner，绑定翻译器解析与宿主调用接缝。
类型：函数  
复杂度：复杂  
入边数：1  
标签：factory、bibliography、owner、exported  
所属文件：[src/workflows/bibliography.ts](../../../../files/src/workflows/bibliography.ts.md)
源码：[src/workflows/bibliography.ts:194](../../../../../../src/workflows/bibliography.ts#L194)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createWorkflowHostApi](../hostApi.ts/createWorkflowHostApi.md) | src/workflows/hostApi.ts:98–685 | 装配并返回 Workflow Host API v12 实例，版本与各 owner 一并校验。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createWorkflowHostError](../workflowHostErrorContract.ts/createWorkflowHostError.md) | src/workflows/workflowHostErrorContract.ts:568–579 | 创建 Workflow Host 错误的统一入口，负责码、details 与 retryable 的一致性。 |
