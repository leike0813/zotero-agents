
# src/modules/workflowExecution/workflowExecuteMessage.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/workflowExecuteMessage.ts -->

工作流执行消息与 toast 文案的构建层：把执行结果、错误与队列进度组装成可本地化的展示文案。

规模：190 行
源码：[src/modules/workflowExecution/workflowExecuteMessage.ts](../../../../../../src/modules/workflowExecution/workflowExecuteMessage.ts)

## 符号（6）
<!-- node: function:src/modules/workflowExecution/workflowExecuteMessage.ts:buildWorkflowFinishMessage -->
<!-- node: function:src/modules/workflowExecution/workflowExecuteMessage.ts:buildWorkflowJobToastMessage -->
<!-- node: function:src/modules/workflowExecution/workflowExecuteMessage.ts:buildWorkflowStartToastMessage -->
<!-- node: function:src/modules/workflowExecution/workflowExecuteMessage.ts:buildWorkflowWaitingToastMessage -->
<!-- node: function:src/modules/workflowExecution/workflowExecuteMessage.ts:normalizeErrorMessage -->
<!-- node: function:src/modules/workflowExecution/workflowExecuteMessage.ts:resolveFormatter -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildWorkflowFinishMessage | 函数 | 112–143 | 中等 | workflow、ui-messages、formatting | 0 | 构建工作流结束汇总消息，包含成功/失败/跳过计数与失败原因标题及溢出提示。 |
| buildWorkflowJobToastMessage | 函数 | 167–190 | 中等 | toast、ui-messages、workflow | 0 | 构建单个作业级 toast 文案，按成功/失败/取消分别给出进度、任务名与失败原因。 |
| buildWorkflowStartToastMessage | 函数 | 145–154 | 简单 | toast、ui-messages、workflow | 0 | 构建工作流启动 toast 文案，提示工作流名称与待执行任务总数。 |
| buildWorkflowWaitingToastMessage | 函数 | 156–165 | 简单 | toast、ui-messages、workflow | 0 | 构建工作流等待 toast 文案，提示当前排队中的任务数量。 |
| normalizeErrorMessage | 函数 | 80–110 | 简单 | error-handling、formatting、workflow | 0 | 把任意错误归一为可展示的单行错误文案，压缩空白并按最大长度截断。 |
| resolveFormatter | 函数 | 68–78 | 简单 | fallback、workflow、utility | 0 | 解析实际生效的 message formatter，缺省时回退到内置默认文案集合。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applySeam.ts](applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [contracts.ts](contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [feedbackSeam.ts](feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [messageFormatter.ts](messageFormatter.ts.md) | src/modules/workflowExecution/messageFormatter.ts | 工作流消息本地化格式化器：先查 addon locale 资源，缺失时回落到调用方提供的 fallback 文案，并组装出符合 WorkflowMessageFormatter 契约的格式化函数。 |
| [preparationSeam.ts](preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [submissionSeam.ts](submissionSeam.ts.md) | src/modules/workflowExecution/submissionSeam.ts | 工作流提交接缝：把已准备好的工作流执行单元提交到宿主任务队列或直接执行路径，并汇总每个单元的执行与回填结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildWorkflowFinishMessage | 函数 | 112–143 | 构建工作流结束汇总消息，包含成功/失败/跳过计数与失败原因标题及溢出提示。 |
| buildWorkflowJobToastMessage | 函数 | 167–190 | 构建单个作业级 toast 文案，按成功/失败/取消分别给出进度、任务名与失败原因。 |
| buildWorkflowStartToastMessage | 函数 | 145–154 | 构建工作流启动 toast 文案，提示工作流名称与待执行任务总数。 |
| buildWorkflowWaitingToastMessage | 函数 | 156–165 | 构建工作流等待 toast 文案，提示当前排队中的任务数量。 |
| normalizeErrorMessage | 函数 | 80–110 | 把任意错误归一为可展示的单行错误文案，压缩空白并按最大长度截断。 |
