
# src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts -->

SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。
源码：[src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts)

## 符号（12）
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:applyContinuationStepProgressEvent -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:applySequenceRootResultIfNeeded -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:applySequenceTerminalStep -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:applySingleTerminalSuccess -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:applyWorkflowResult -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:buildContinuationStepJob -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:continueSkillRunnerForegroundRun -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:continueSkillRunnerForegroundRunNow -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:findContinuationRunRecord -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:persistContinuationStepJob -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:setRequestState -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:updateSequenceRootApplyState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyContinuationStepProgressEvent | 函数 | 495–611 | 复杂 | skillrunner、events、projection、core | 0 | 把续跑步骤的进度事件投影到 run 与 sequence 状态，保持 UI 可见进度与内部状态一致。 |
| applySequenceRootResultIfNeeded | 函数 | 769–848 | 中等 | skillrunner、workflow-execution、state-machine | 0 | 在最后一步完成后应用 sequence 根结果，产出任务级终态与产物引用。 |
| [applySequenceTerminalStep](../../../../../symbols/src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts/applySequenceTerminalStep.md) | 函数 | 850–986 | 复杂 | skillrunner、workflow-execution、state-machine、core | 1 | 应用 sequence 终态步骤的结果，判定成功或失败并触发相应的收尾语义。 |
| applySingleTerminalSuccess | 函数 | 339–426 | 中等 | skillrunner、workflow-execution、state-machine | 0 | 处理单步骤工作流的成功终态：应用结果、收敛状态并发布完成事件。 |
| applyWorkflowResult | 函数 | 277–337 | 中等 | skillrunner、workflow-execution、artifacts | 1 | 把工作流结果应用到 run 上下文，解析产物路径与结果引用。 |
| buildContinuationStepJob | 函数 | 433–493 | 中等 | skillrunner、workflow-execution、job-queue | 1 | 为续跑步骤构造 job 载荷，继承原 run 的工作流、step 键与后端上下文。 |
| continueSkillRunnerForegroundRun | 函数 | 1236–1264 | 简单 | skillrunner、api-handler、workflow-execution、core | 1 | 对外续跑入口：按 runId 触发一次前台续跑，供自动回复观察器与外部调用方使用。 |
| [continueSkillRunnerForegroundRunNow](../../../../../symbols/src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts/continueSkillRunnerForegroundRunNow.md) | 函数 | 1047–1234 | 复杂 | skillrunner、workflow-execution、orchestration、core | 1 | 续跑主实现：找到待推进的 run、构造下一 step 任务、提交执行并按结果更新 sequence 与终态。 |
| findContinuationRunRecord | 函数 | 1033–1045 | 简单 | skillrunner、query、workflow-execution | 1 | 按 runId 查找待续跑的 run 记录，找不到时明确返回未找到而非新建。 |
| persistContinuationStepJob | 函数 | 613–684 | 中等 | skillrunner、persistence、recovery | 1 | 持久化续跑步骤的 job 记录，使插件重启后仍能识别未完成的 step。 |
| setRequestState | 函数 | 224–260 | 中等 | skillrunner、state-machine、persistence | 0 | 按 requestId 写回 run 状态，保证同一请求下的多个 run 状态一致。 |
| updateSequenceRootApplyState | 函数 | 695–767 | 中等 | skillrunner、workflow-execution、state-machine | 1 | 更新 sequence 根的 apply 状态，区分执行完成与结果已应用两个阶段。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [bundleIO.ts](../../workflowExecution/bundleIO.ts.md) | src/modules/workflowExecution/bundleIO.ts | 运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。 |
| [client.ts](../../../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [contracts.ts](../../../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [manager.ts](../../../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [registry.ts](../../../providers/registry.ts.md) | src/providers/registry.ts | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |
| [requestMeta.ts](../../workflowExecution/requestMeta.ts.md) | src/modules/workflowExecution/requestMeta.ts | 从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。 |
| [resultContext.ts](../../workflowExecution/resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |
| [runtime.ts](../../../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [sequenceRuntime.ts](../../workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [sequenceStateStore.ts](../../workflowExecution/sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [sequenceStepApply.ts](../../workflowExecution/sequenceStepApply.ts.md) | src/modules/workflowExecution/sequenceStepApply.ts | 序列单步 apply 执行：构造结果上下文与 bundle reader 调用运行时 apply，并收集 Skill Run 反馈侧信息返回给序列状态机。 |
| [skillRunFeedback.ts](skillRunFeedback.ts.md) | src/modules/skillRunner/run/skillRunFeedback.ts | Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。 |
| [skillRunnerAutoReplyObserver.ts](skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerInteractiveAutoReply.ts](skillRunnerInteractiveAutoReply.ts.md) | src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts | 交互式自动回复开关模块：解析用户偏好并判定某个 run 是否应启用自动回复，同时构造对应的请求载荷。 |
| [skillRunnerProviderStateMachine.ts](skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerRecoverableState.ts](skillRunnerRecoverableState.ts.md) | src/modules/skillRunner/run/skillRunnerRecoverableState.ts | 可恢复状态判定：判断哪些 SkillRunner 任务已具备恢复条件、哪些失败属于不可恢复，是重启恢复决策的最小判定单元。 |
| [skillRunnerRunStore.ts](skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [triggerPolicy.ts](../../../workflows/triggerPolicy.ts.md) | src/workflows/triggerPolicy.ts | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowRuntime.ts](../../workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerAutoReplyObserver.ts](skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerRunDialog.ts](../surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerTaskReconciler.ts](skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| continueSkillRunnerForegroundRun | 函数 | 1236–1264 | 对外续跑入口：按 runId 触发一次前台续跑，供自动回复观察器与外部调用方使用。 |
