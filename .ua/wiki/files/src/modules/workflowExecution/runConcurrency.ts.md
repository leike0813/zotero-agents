
# src/modules/workflowExecution/runConcurrency.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/runConcurrency.ts -->

工作流派发并发度解析：仅 SkillRunner 与通用 HTTP 这类全并行 Provider 允许按请求数并发，其余 Provider 强制串行。
源码：[src/modules/workflowExecution/runConcurrency.ts](../../../../../../src/modules/workflowExecution/runConcurrency.ts)

## 符号（1）
<!-- node: function:src/modules/workflowExecution/runConcurrency.ts:resolveWorkflowDispatchConcurrency -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| resolveWorkflowDispatchConcurrency | 函数 | 7–18 | 简单 | concurrency、dispatch、policy、provider | 1 | 按 Provider 能力与请求数解析派发并发度，非全并行 Provider 恒为 1。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runSeam.ts](runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveWorkflowDispatchConcurrency | 函数 | 7–18 | 按 Provider 能力与请求数解析派发并发度，非全并行 Provider 恒为 1。 |
