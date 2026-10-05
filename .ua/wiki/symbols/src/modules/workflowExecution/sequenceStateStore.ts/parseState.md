
# parseState
<!-- node: function:src/modules/workflowExecution/sequenceStateStore.ts:parseState -->

解析完整序列运行状态，缺失字段按默认结构补齐。
类型：函数  
复杂度：中等  
入边数：2  
标签：parsing、state-store、state、persistence  
所属文件：[src/modules/workflowExecution/sequenceStateStore.ts](../../../../../files/src/modules/workflowExecution/sequenceStateStore.ts.md)
源码：[src/modules/workflowExecution/sequenceStateStore.ts:315](../../../../../../../src/modules/workflowExecution/sequenceStateStore.ts#L315)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [getSequenceRunState](../../../../../files/src/modules/workflowExecution/sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts:824–832 | 按运行 ID 读取序列运行状态。 |
| [initializeSequenceRunState](../../../../../files/src/modules/workflowExecution/sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts:781–822 | 初始化并持久化一次序列运行状态，必要时从已有条目恢复。 |

## 调用

该符号没有记录对外调用。
