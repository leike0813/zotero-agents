
# src/workflows/errorMeta.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/errorMeta.ts -->

工作流 hook 失败元数据：把 hook 名、工作流标识与能力来源挂到异常对象上，供诊断层读取并生成可读的失败摘要。

规模：83 行
源码：[src/workflows/errorMeta.ts](../../../../../src/workflows/errorMeta.ts)

## 符号（3）
<!-- node: function:src/workflows/errorMeta.ts:attachWorkflowHookFailureMeta -->
<!-- node: function:src/workflows/errorMeta.ts:readWorkflowHookFailureMeta -->
<!-- node: function:src/workflows/errorMeta.ts:summarizeWorkflowExecutionError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| attachWorkflowHookFailureMeta | 函数 | 16–36 | 中等 | error-handling、metadata、diagnostics | 0 | 把 hook 失败上下文写入异常对象，附加 hook 名、workflowId、packageId、来源种类与执行模式。 |
| readWorkflowHookFailureMeta | 函数 | 38–58 | 中等 | error-handling、metadata、utility | 1 | 从异常对象读取 hook 失败元数据，缺失时返回 undefined。 |
| summarizeWorkflowExecutionError | 函数 | 60–83 | 中等 | error-handling、diagnostics、formatting | 0 | 把执行异常与其 hook 元数据汇总为一行可读摘要，供日志与 toast 展示。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [preparationSeam.ts](../modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [runtime.ts](runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [workflowDebugProbe.ts](../modules/workflow/ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| attachWorkflowHookFailureMeta | 函数 | 16–36 | 把 hook 失败上下文写入异常对象，附加 hook 名、workflowId、packageId、来源种类与执行模式。 |
| readWorkflowHookFailureMeta | 函数 | 38–58 | 从异常对象读取 hook 失败元数据，缺失时返回 undefined。 |
| summarizeWorkflowExecutionError | 函数 | 60–83 | 把执行异常与其 hook 元数据汇总为一行可读摘要，供日志与 toast 展示。 |
