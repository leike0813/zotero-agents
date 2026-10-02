
# runWorkflowHookWithDiagnostics
<!-- node: function:src/workflows/runtime.ts:runWorkflowHookWithDiagnostics -->

带诊断地执行单个 hook：注入上下文、捕获异常、附加 hook 失败元数据并按来源记录运行时日志。
类型：函数  
复杂度：复杂  
入边数：2  
标签：hook、diagnostics、error-handling  
所属文件：[src/workflows/runtime.ts](../../../../files/src/workflows/runtime.ts.md)
源码：[src/workflows/runtime.ts:604](../../../../../../src/workflows/runtime.ts#L604)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeApplyResult](../../../../files/src/workflows/runtime.ts.md) | src/workflows/runtime.ts:1212–1294 | 执行 applyResult 阶段：把后端结果交给 hook 决定产物写入、笔记生成与回填开关，并归一执行结果。 |
| [executeBuildRequests](../../../../files/src/workflows/runtime.ts.md) | src/workflows/runtime.ts:891–1210 | 执行单元的 build 阶段主循环：逐单元编译声明式请求、调用 hook 构建请求并汇总 build 结果与失败原因。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [withWorkflowExecutionRuntimeScope](withWorkflowExecutionRuntimeScope.md) | src/workflows/runtime.ts:520–563 | 以受控 leaf scope 包裹工作流执行期调用，确保 hook 只能访问本次执行声明的能力面。 |
