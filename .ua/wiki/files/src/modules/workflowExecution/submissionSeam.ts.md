
# src/modules/workflowExecution/submissionSeam.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/submissionSeam.ts -->

工作流提交接缝：把已准备好的工作流执行单元提交到宿主任务队列或直接执行路径，并汇总每个单元的执行与回填结果。

规模：262 行
源码：[src/modules/workflowExecution/submissionSeam.ts](../../../../../../src/modules/workflowExecution/submissionSeam.ts)

## 符号（3）
<!-- node: function:src/modules/workflowExecution/submissionSeam.ts:executePreparedWorkflowUnit -->
<!-- node: function:src/modules/workflowExecution/submissionSeam.ts:submitPreparedWorkflowUnits -->
<!-- node: function:src/modules/workflowExecution/submissionSeam.ts:summarizeDirectOutcomes -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| executePreparedWorkflowUnit | 函数 | 69–126 | 中等 | workflow、execution、seam | 0 | 执行单个已准备好的工作流单元：调用 execution seam 获取 run state，再按需走 apply seam 回填产物，并返回统一结果对象。 |
| submitPreparedWorkflowUnits | 函数 | 128–262 | 复杂 | workflow、job-queue、orchestration、submission | 0 | 把一批已准备工作流单元提交到宿主队列或直连执行路径，处理排队、批次提交与整体执行结果汇总。 |
| summarizeDirectOutcomes | 函数 | 57–67 | 简单 | workflow、aggregation、utility | 0 | 汇总直连执行路径下各执行单元的 outcome，输出计数与失败原因列表。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applySeam.ts](applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [contracts.ts](contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [preparationSeam.ts](preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [runSeam.ts](runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [runtimeLogManager.ts](../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [workflowExecuteMessage.ts](workflowExecuteMessage.ts.md) | src/modules/workflowExecution/workflowExecuteMessage.ts | 工作流执行消息与 toast 文案的构建层：把执行结果、错误与队列进度组装成可本地化的展示文案。 |
| [workflowSubmissionQueue.ts](../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [workflowSubmissionQueueContracts.ts](../../jobQueue/workflowSubmissionQueueContracts.ts.md) | src/jobQueue/workflowSubmissionQueueContracts.ts | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeWorkflowControl.ts](../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [productionExecution.ts](../workflow/productionExecution.ts.md) | src/modules/workflow/productionExecution.ts | 工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。 |
| [workflowExecute.ts](../workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| executePreparedWorkflowUnit | 函数 | 69–126 | 执行单个已准备好的工作流单元：调用 execution seam 获取 run state，再按需走 apply seam 回填产物，并返回统一结果对象。 |
| submitPreparedWorkflowUnits | 函数 | 128–262 | 把一批已准备工作流单元提交到宿主队列或直连执行路径，处理排队、批次提交与整体执行结果汇总。 |
