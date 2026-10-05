
# src/modules/acp/skillRun/acpSkillRunRecovery.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunRecovery.ts -->

ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。
源码：[src/modules/acp/skillRun/acpSkillRunRecovery.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunRecovery.ts)

## 符号（11）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRecovery.ts:applyRecoveredAcpSkillResult -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRecovery.ts:attachRecoveredSession -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRecovery.ts:buildRecoveredContinuationPrompt -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRecovery.ts:canContinueRecoveredWorkflowTask -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRecovery.ts:continueRecoveredSequenceStep -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRecovery.ts:readAcpSkillRunResultJson -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRecovery.ts:reapplyAcpSkillRunResult -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRecovery.ts:recoverAcpSkillRunConversation -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRecovery.ts:requestRecoveredSequenceStepForeground -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRecovery.ts:resolveBackendForRecoveredRun -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRecovery.ts:resolveRecoveredWorkflow -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyRecoveredAcpSkillResult | 函数 | 275–436 | 复杂 | acp、recovery、workflow-execution、state-machine | 0 | 把恢复出来的 skill 结果重新应用到工作流 sequence 上，推进 apply 状态并保持与在线执行一致。 |
| attachRecoveredSession | 函数 | 801–868 | 中等 | acp、recovery、session、transport | 1 | 把恢复出的 session 重新挂到现有 ACP 连接上，恢复 transcript 订阅与后续消息通道。 |
| buildRecoveredContinuationPrompt | 函数 | 907–951 | 中等 | acp、recovery、prompt、workflow | 0 | 为恢复后的续跑构造 prompt 模板，补齐工作流上下文与已完成的步骤摘要。 |
| canContinueRecoveredWorkflowTask | 函数 | 870–905 | 中等 | acp、recovery、validation、workflow | 1 | 判断一个历史任务是否具备继续执行的条件（后端可用、工作流仍加载、状态未终结）。 |
| continueRecoveredSequenceStep | 函数 | 477–662 | 复杂 | acp、recovery、workflow-execution、queue | 0 | 继续恢复出来的 sequence step：重建 step 上下文、重新排队执行并等待终态。 |
| readAcpSkillRunResultJson | 函数 | 664–684 | 简单 | acp、recovery、io、persistence | 1 | 读取 run 落盘的 result.json，容错缺失与格式错误，为恢复提供结果事实源。 |
| reapplyAcpSkillRunResult | 函数 | 713–781 | 中等 | acp、recovery、replay、skill-run | 0 | 手动重放某个已完成 run 的结果，让用户无需重跑 Agent 即可推进后续工作流步骤。 |
| recoverAcpSkillRunConversation | 函数 | 953–2378 | 复杂 | acp、recovery、skill-run、orchestration、core | 0 | 恢复入口：按后端与请求定位历史 run，重建 transcript 归属、工作流与 sequence 状态，必要时继续执行或直接回放终态。 |
| requestRecoveredSequenceStepForeground | 函数 | 438–475 | 中等 | acp、recovery、permission、workflow-execution | 0 | 为恢复出的 step 申请前台执行权限并派发请求，是继续执行前的准入步骤。 |
| resolveBackendForRecoveredRun | 函数 | 783–799 | 简单 | acp、recovery、backends、resolution | 0 | 为恢复出的 run 解析后端实例，后端不可用时决定是否退回新建实例。 |
| resolveRecoveredWorkflow | 函数 | 254–273 | 简单 | acp、recovery、workflow、resolution | 1 | 按 run 记录中的工作流 id 找回当前已加载的 manifest，缺失时给出不可恢复结论。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](../transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpRuntimeDependencyWrapper.ts](acpRuntimeDependencyWrapper.ts.md) | src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts | Agent 运行时依赖包装器：按 agent family 探测并准备命令依赖（Node/Python 等），通过平台 subprocess 抽象执行版本与存在性检查。 |
| [acpRuntimePerformanceProfiler.ts](../diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpRuntimePromptTemplates.ts](acpRuntimePromptTemplates.ts.md) | src/modules/acp/skillRun/acpRuntimePromptTemplates.ts | ACP 运行时 prompt 模板管理：把内置 prompt 模板物化到 runtime 目录并提供按 key 读取/解析的能力。 |
| [acpSequenceStepLifecycle.ts](../../workflowExecution/acpSequenceStepLifecycle.ts.md) | src/modules/workflowExecution/acpSequenceStepLifecycle.ts | ACP 序列步骤的生命周期适配器实现，在步骤应用结果确定后把 apply 状态写回 ACP Skill Run 并在结束时卸载控制器。 |
| [acpSkillOutputConvergence.ts](acpSkillOutputConvergence.ts.md) | src/modules/acp/skillRun/acpSkillOutputConvergence.ts | Skill 输出收敛层：在多次运行输出之间做校验与归一，判断产物是否已稳定收敛并给出终态结论。 |
| [acpSkillOutputValidator.ts](acpSkillOutputValidator.ts.md) | src/modules/acp/skillRun/acpSkillOutputValidator.ts | Skill 输出校验器：按 schema 资产与产物 manifest 校验 skill run 输出结构，输出结构化错误而非松散字符串。 |
| [acpSkillResultFileFallback.ts](acpSkillResultFileFallback.ts.md) | src/modules/acp/skillRun/acpSkillResultFileFallback.ts | Skill 结果文件回退：当 Agent 未直接给出结构化结果时，从落盘结果文件回读并按校验器语义归一。 |
| [acpSkillRunActions.ts](acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunAuditTrail.ts](acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpSkillRunControllerRegistry.ts](acpSkillRunControllerRegistry.ts.md) | src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts | skill run controller 注册表：登记执行期与准备期 controller，维护等待用户分离计时器，并在终态时清理陈旧权限请求。 |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunForeground.ts](acpSkillRunForeground.ts.md) | src/modules/acp/skillRun/acpSkillRunForeground.ts | 把指定 skill run 拉到前台：按执行模式选择 run、更新记录中的前台标记，并打开 Assistant Workspace 侧边栏。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunnerWorkspace.ts](acpSkillRunnerWorkspace.ts.md) | src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts | Skill runner 工作区管理：创建/清理 runtime 下的运行工作目录，隔离不同 requestId 的产物。 |
| [acpSkillRunPayloadStore.ts](acpSkillRunPayloadStore.ts.md) | src/modules/acp/skillRun/acpSkillRunPayloadStore.ts | skill run 的载荷持久化：读写 run context 载荷并维护 output revision 追加日志，为产物投影与恢复提供磁盘事实源。 |
| [acpSkillRunPermissionQueue.ts](acpSkillRunPermissionQueue.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [acpSkillRunStatus.ts](acpSkillRunStatus.ts.md) | src/modules/acp/skillRun/acpSkillRunStatus.ts | ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [bundleIO.ts](../../workflowExecution/bundleIO.ts.md) | src/modules/workflowExecution/bundleIO.ts | 运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。 |
| [contracts.ts](../../../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [localization.ts](../../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [requestMeta.ts](../../workflowExecution/requestMeta.ts.md) | src/modules/workflowExecution/requestMeta.ts | 从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。 |
| [resultContext.ts](../../workflowExecution/resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |
| [runtime.ts](../../../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sequenceRuntime.ts](../../workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [sequenceStateStore.ts](../../workflowExecution/sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [sequenceStepApply.ts](../../workflowExecution/sequenceStepApply.ts.md) | src/modules/workflowExecution/sequenceStepApply.ts | 序列单步 apply 执行：构造结果上下文与 bundle reader 调用运行时 apply，并收集 Skill Run 反馈侧信息返回给序列状态机。 |
| [skillRunFeedback.ts](../../skillRunner/run/skillRunFeedback.ts.md) | src/modules/skillRunner/run/skillRunFeedback.ts | Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [triggerPolicy.ts](../../../workflows/triggerPolicy.ts.md) | src/workflows/triggerPolicy.ts | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../../../providers/types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [workflowRuntime.ts](../../workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowSubmissionQueue.ts](../../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| continueRecoveredSequenceStep | 函数 | 477–662 | 继续恢复出来的 sequence step：重建 step 上下文、重新排队执行并等待终态。 |
| reapplyAcpSkillRunResult | 函数 | 713–781 | 手动重放某个已完成 run 的结果，让用户无需重跑 Agent 即可推进后续工作流步骤。 |
| recoverAcpSkillRunConversation | 函数 | 953–2378 | 恢复入口：按后端与请求定位历史 run，重建 transcript 归属、工作流与 sequence 状态，必要时继续执行或直接回放终态。 |
