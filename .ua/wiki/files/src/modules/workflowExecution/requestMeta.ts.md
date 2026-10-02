
# src/modules/workflowExecution/requestMeta.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/requestMeta.ts -->

从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。
源码：[src/modules/workflowExecution/requestMeta.ts](../../../../../../src/modules/workflowExecution/requestMeta.ts)

## 符号（3）
<!-- node: function:src/modules/workflowExecution/requestMeta.ts:resolveInputUnitIdentityFromRequest -->
<!-- node: function:src/modules/workflowExecution/requestMeta.ts:resolveTargetParentRefFromRequest -->
<!-- node: function:src/modules/workflowExecution/requestMeta.ts:resolveTaskNameFromRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| resolveInputUnitIdentityFromRequest | 函数 | 20–29 | 简单 | metadata、request、identity、duplicate-guard | 1 | 解析输入单元身份标识，用于重复守卫与日志追踪。 |
| resolveTargetParentRefFromRequest | 函数 | 4–11 | 简单 | metadata、request、selection、validation | 0 | 从请求中解析目标父条目引用并校验其为合法选择引用。 |
| [resolveTaskNameFromRequest](../../../../symbols/src/modules/workflowExecution/requestMeta.ts/resolveTaskNameFromRequest.md) | 函数 | 13–18 | 简单 | metadata、request、fallback | 2 | 从请求中解析任务名，缺失时按索引生成占位名称。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [selectionContext.ts](../selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunRecovery.ts](../acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [applySeam.ts](applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [duplicateGuardSeam.ts](duplicateGuardSeam.ts.md) | src/modules/workflowExecution/duplicateGuardSeam.ts | 工作流重复执行守卫：比对进行中的任务摘要与待执行单元的身份（任务名、目标父条目、输入单元），识别重复后阻止提交并给出可读原因。 |
| [hostBridgeWorkflowControl.ts](../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [runSeam.ts](runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [runtime.ts](../../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [skillRunnerForegroundContinuation.ts](../skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveInputUnitIdentityFromRequest | 函数 | 20–29 | 解析输入单元身份标识，用于重复守卫与日志追踪。 |
| resolveTargetParentRefFromRequest | 函数 | 4–11 | 从请求中解析目标父条目引用并校验其为合法选择引用。 |
| [resolveTaskNameFromRequest](../../../../symbols/src/modules/workflowExecution/requestMeta.ts/resolveTaskNameFromRequest.md) | 函数 | 13–18 | 从请求中解析任务名，缺失时按索引生成占位名称。 |
