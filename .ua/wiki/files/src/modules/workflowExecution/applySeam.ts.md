
# src/modules/workflowExecution/applySeam.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/applySeam.ts -->

工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。
源码：[src/modules/workflowExecution/applySeam.ts](../../../../../../src/modules/workflowExecution/applySeam.ts)

## 符号（3）
<!-- node: function:src/modules/workflowExecution/applySeam.ts:createSequenceApplyContext -->
<!-- node: function:src/modules/workflowExecution/applySeam.ts:isSkillRunnerSingleJobRequest -->
<!-- node: function:src/modules/workflowExecution/applySeam.ts:runWorkflowApplySeam -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSequenceApplyContext | 函数 | 204–253 | 中等 | sequence、apply、context、composition | 1 | 构造序列步骤的 apply 上下文，汇集 Provider 结果、运行状态与结果上下文读取能力。 |
| isSkillRunnerSingleJobRequest | 函数 | 66–87 | 简单 | predicate、skillrunner、request、request-kind | 1 | 判断当前请求是否为 SkillRunner 单作业（非序列）执行。 |
| [runWorkflowApplySeam](../../../../symbols/src/modules/workflowExecution/applySeam.ts/runWorkflowApplySeam.md) | 函数 | 255–1172 | 复杂 | seam、apply、orchestration、acp、sequence | 1 | 工作流 apply seam 主入口：按请求种类分派单作业与序列路径，读取产物并调用运行时 apply，识别 ACP 可恢复非终态并汇总序列步骤结果。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunActions.ts](../acp/skillRun/acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [applyDiagnostics.ts](applyDiagnostics.ts.md) | src/modules/workflowExecution/applyDiagnostics.ts | 工作流 apply 阶段诊断信息的归一化，限制 warning 数量与 code 长度上限，输出结构化且有界的诊断记录。 |
| [bundleIO.ts](bundleIO.ts.md) | src/modules/workflowExecution/bundleIO.ts | 运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。 |
| [contracts.ts](contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [requestMeta.ts](requestMeta.ts.md) | src/modules/workflowExecution/requestMeta.ts | 从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。 |
| [resultContext.ts](resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |
| [runtime.ts](../../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [runtimeLogManager.ts](../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [sequenceRuntime.ts](sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [skillRunFeedback.ts](../skillRunner/run/skillRunFeedback.ts.md) | src/modules/skillRunner/run/skillRunFeedback.ts | Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。 |
| [skillRunnerProviderStateMachine.ts](../skillRunner/run/skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRecoverableState.ts](../skillRunner/run/skillRunnerRecoverableState.ts.md) | src/modules/skillRunner/run/skillRunnerRecoverableState.ts | 可恢复状态判定：判断哪些 SkillRunner 任务已具备恢复条件、哪些失败属于不可恢复，是重启恢复决策的最小判定单元。 |
| [skillRunnerRunStore.ts](../skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [taskRuntime.ts](../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [terminalResolution.ts](terminalResolution.ts.md) | src/modules/workflowExecution/terminalResolution.ts | 工作流作业终态解析：把 ACP SkillRun、SkillRunner run store 与序列状态三个来源的观测归一到统一的作业槽位状态和终态结论。 |
| [triggerPolicy.ts](../../workflows/triggerPolicy.ts.md) | src/workflows/triggerPolicy.ts | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [workflowExecuteMessage.ts](workflowExecuteMessage.ts.md) | src/modules/workflowExecution/workflowExecuteMessage.ts | 工作流执行消息与 toast 文案的构建层：把执行结果、错误与队列进度组装成可本地化的展示文案。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [productionExecution.ts](../workflow/productionExecution.ts.md) | src/modules/workflow/productionExecution.ts | 工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。 |
| [submissionSeam.ts](submissionSeam.ts.md) | src/modules/workflowExecution/submissionSeam.ts | 工作流提交接缝：把已准备好的工作流执行单元提交到宿主任务队列或直接执行路径，并汇总每个单元的执行与回填结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [runWorkflowApplySeam](../../../../symbols/src/modules/workflowExecution/applySeam.ts/runWorkflowApplySeam.md) | 函数 | 255–1172 | 工作流 apply seam 主入口：按请求种类分派单作业与序列路径，读取产物并调用运行时 apply，识别 ACP 可恢复非终态并汇总序列步骤结果。 |
