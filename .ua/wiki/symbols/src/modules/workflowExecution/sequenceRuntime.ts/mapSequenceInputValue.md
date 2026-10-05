
# mapSequenceInputValue
<!-- node: function:src/modules/workflowExecution/sequenceRuntime.ts:mapSequenceInputValue -->

按声明类型把步骤输入值映射为 Provider 请求可接受的形态。
类型：函数  
复杂度：简单  
入边数：2  
标签：sequence、input-mapping、coercion  
所属文件：[src/modules/workflowExecution/sequenceRuntime.ts](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md)
源码：[src/modules/workflowExecution/sequenceRuntime.ts:212](../../../../../../../src/modules/workflowExecution/sequenceRuntime.ts#L212)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyHandoffBindings](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:452–555 | 把前序步骤输出按 handoff 声明绑定到当前步骤输入，支持嵌套取值与类型转换。 |
| [mapSequenceRequestInputs](../../../../../files/src/modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts:236–259 | 遍历步骤输入声明并生成完整的请求输入映射。 |

## 调用

该符号没有记录对外调用。
