
# src/modules/skillRunner/run/skillRunnerRecoverableState.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerRecoverableState.ts -->

可恢复状态判定：判断哪些 SkillRunner 任务已具备恢复条件、哪些失败属于不可恢复，是重启恢复决策的最小判定单元。
源码：[src/modules/skillRunner/run/skillRunnerRecoverableState.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerRecoverableState.ts)

## 符号（3）
<!-- node: function:src/modules/skillRunner/run/skillRunnerRecoverableState.ts:getSkillRunnerRequestIdFromJob -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRecoverableState.ts:hasRecoverableSkillRunnerRequest -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerRecoverableState.ts:isSkillRunnerRequestReadyForRecovery -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getSkillRunnerRequestIdFromJob | 函数 | 26–37 | 简单 | skillrunner、parsing、compatibility | 1 | 从 job 记录中解析 requestId，兼容缺字段的旧记录并返回 undefined。 |
| hasRecoverableSkillRunnerRequest | 函数 | 65–75 | 简单 | skillrunner、recovery、query、core | 0 | 判定队列中是否存在可恢复的 SkillRunner 请求，是启动期恢复扫描的入口。 |
| isSkillRunnerRequestReadyForRecovery | 函数 | 39–55 | 简单 | skillrunner、recovery、validation、core | 1 | 判定单个请求是否已越过 pre-ready 阶段并可安全恢复。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [errors.ts](../../../providers/skillrunner/errors.ts.md) | src/providers/skillrunner/errors.ts | SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。 |
| [manager.ts](../../../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [skillRunnerProviderStateMachine.ts](skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applySeam.ts](../../workflowExecution/applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [manager.ts](../../../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [sequenceRuntime.ts](../../workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [skillRunnerForegroundContinuation.ts](skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getSkillRunnerRequestIdFromJob | 函数 | 26–37 | 从 job 记录中解析 requestId，兼容缺字段的旧记录并返回 undefined。 |
| hasRecoverableSkillRunnerRequest | 函数 | 65–75 | 判定队列中是否存在可恢复的 SkillRunner 请求，是启动期恢复扫描的入口。 |
| isSkillRunnerRequestReadyForRecovery | 函数 | 39–55 | 判定单个请求是否已越过 pre-ready 阶段并可安全恢复。 |
