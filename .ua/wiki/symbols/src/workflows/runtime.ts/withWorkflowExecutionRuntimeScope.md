
# withWorkflowExecutionRuntimeScope
<!-- node: function:src/workflows/runtime.ts:withWorkflowExecutionRuntimeScope -->

以受控 leaf scope 包裹工作流执行期调用，确保 hook 只能访问本次执行声明的能力面。
类型：函数  
复杂度：复杂  
入边数：1  
标签：security、scoping、host-bridge  
所属文件：[src/workflows/runtime.ts](../../../../files/src/workflows/runtime.ts.md)
源码：[src/workflows/runtime.ts:520](../../../../../../src/workflows/runtime.ts#L520)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runWorkflowHookWithDiagnostics](runWorkflowHookWithDiagnostics.md) | src/workflows/runtime.ts:604–823 | 带诊断地执行单个 hook：注入上下文、捕获异常、附加 hook 失败元数据并按来源记录运行时日志。 |

## 调用

该符号没有记录对外调用。
