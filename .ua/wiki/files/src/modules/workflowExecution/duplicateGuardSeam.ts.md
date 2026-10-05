
# src/modules/workflowExecution/duplicateGuardSeam.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/duplicateGuardSeam.ts -->

工作流重复执行守卫：比对进行中的任务摘要与待执行单元的身份（任务名、目标父条目、输入单元），识别重复后阻止提交并给出可读原因。
源码：[src/modules/workflowExecution/duplicateGuardSeam.ts](../../../../../../src/modules/workflowExecution/duplicateGuardSeam.ts)

## 符号（3）
<!-- node: function:src/modules/workflowExecution/duplicateGuardSeam.ts:findDuplicateState -->
<!-- node: function:src/modules/workflowExecution/duplicateGuardSeam.ts:runWorkflowDuplicateGuardSeam -->
<!-- node: function:src/modules/workflowExecution/duplicateGuardSeam.ts:runWorkflowUnitDuplicateGuardSeam -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| findDuplicateState | 函数 | 91–121 | 简单 | duplicate-guard、lookup、identity、conflict | 1 | 在活动任务中查找与给定执行单元身份重复的记录，区分可复用与冲突两种状态。 |
| runWorkflowDuplicateGuardSeam | 函数 | 260–370 | 中等 | duplicate-guard、seam、batch、aggregation | 0 | 对整批执行单元执行重复守卫，逐个判定并汇总通过与跳过结果。 |
| [runWorkflowUnitDuplicateGuardSeam](../../../../symbols/src/modules/workflowExecution/duplicateGuardSeam.ts/runWorkflowUnitDuplicateGuardSeam.md) | 函数 | 123–246 | 中等 | duplicate-guard、seam、validation、user-feedback | 2 | 对单个执行单元执行重复守卫，命中重复时给出可读的跳过原因与日志。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [messageFormatter.ts](messageFormatter.ts.md) | src/modules/workflowExecution/messageFormatter.ts | 工作流消息本地化格式化器：先查 addon locale 资源，缺失时回落到调用方提供的 fallback 文案，并组装出符合 WorkflowMessageFormatter 契约的格式化函数。 |
| [requestMeta.ts](requestMeta.ts.md) | src/modules/workflowExecution/requestMeta.ts | 从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。 |
| [runtimeLogManager.ts](../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [taskRuntime.ts](../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeWorkflowControl.ts](../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [productionExecution.ts](../workflow/productionExecution.ts.md) | src/modules/workflow/productionExecution.ts | 工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。 |
| [workflowExecute.ts](../workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| runWorkflowDuplicateGuardSeam | 函数 | 260–370 | 对整批执行单元执行重复守卫，逐个判定并汇总通过与跳过结果。 |
| [runWorkflowUnitDuplicateGuardSeam](../../../../symbols/src/modules/workflowExecution/duplicateGuardSeam.ts/runWorkflowUnitDuplicateGuardSeam.md) | 函数 | 123–246 | 对单个执行单元执行重复守卫，命中重复时给出可读的跳过原因与日志。 |
