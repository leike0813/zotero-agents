
# assertWorkflowHostStrictJsonValue
<!-- node: function:src/workflows/workflowHostErrorContract.ts:assertWorkflowHostStrictJsonValue -->

递归校验值为严格 JSON（无函数、symbol、循环引用与原型污染键）。
类型：函数  
复杂度：中等  
入边数：2  
标签：validation、json、security、exported  
所属文件：[src/workflows/workflowHostErrorContract.ts](../../../../files/src/workflows/workflowHostErrorContract.ts.md)
源码：[src/workflows/workflowHostErrorContract.ts:309](../../../../../../src/workflows/workflowHostErrorContract.ts#L309)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [serializeEditorResult](../../../../files/src/modules/workflow/ui/workflowEditorHost.ts.md) | src/modules/workflow/ui/workflowEditorHost.ts:153–164 | 把编辑器内 DOM 状态序列化为严格 JSON 值，剔除函数与循环引用。 |
| [createWorkflowLoggingOwner](../../../../files/src/workflows/workflowLoggingOwner.ts.md) | src/workflows/workflowLoggingOwner.ts:125–150 | 创建工作流日志 owner，绑定运行身份与 runtime log 写入器。 |

## 调用

该符号没有记录对外调用。
