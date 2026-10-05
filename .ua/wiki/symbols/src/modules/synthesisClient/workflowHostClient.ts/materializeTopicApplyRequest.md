
# materializeTopicApplyRequest
<!-- node: function:src/modules/synthesisClient/workflowHostClient.ts:materializeTopicApplyRequest -->

把工作流传入的原始 bundle 物化为 topic apply 请求：校验输入上限、解析条目引用并补齐物化资产。
类型：函数  
复杂度：复杂  
入边数：1  
标签：物化、topic、workflow-host、校验  
所属文件：[src/modules/synthesisClient/workflowHostClient.ts](../../../../../files/src/modules/synthesisClient/workflowHostClient.ts.md)
源码：[src/modules/synthesisClient/workflowHostClient.ts:313](../../../../../../../src/modules/synthesisClient/workflowHostClient.ts#L313)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createWorkflowSynthesisHostApi](../../../../../files/src/modules/synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts:543–933 | 构造工作流侧 Synthesis API：代理 topic plan/apply、digest apply、tag audit 与文献快照等全部工作流能力。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveWorkflowItem](../../../../../files/src/modules/synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts:274–293 | 按工作流传入的条目引用解析出 Zotero 条目并生成快照，缺失时返回结构化错误。 |
