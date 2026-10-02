
# src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts -->

Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。
源码：[src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts)

## 符号（7）
<!-- node: class:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:AcpPromptFailureError -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:classifyAcpPromptError -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:classifyAcpPromptFailure -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:createAssistantTurnAccumulator -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:executeAcpSkillRunnerJob -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:recordAcpSkillRunnerSetupStage -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:runPrompt -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AcpPromptFailureError | 类 | 213–221 | 简单 | acp、error、type | 0 | ACP prompt 失败的类型化错误，携带分类结果与原始错误供上层决定重试或终止。 |
| classifyAcpPromptError | 函数 | 349–372 | 中等 | acp、error、classification | 0 | 对单个错误对象应用分类规则并保留原始诊断信息。 |
| [classifyAcpPromptFailure](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts/classifyAcpPromptFailure.md) | 函数 | 292–347 | 复杂 | acp、error、classification | 1 | 把 prompt 失败按类型归类（连接、权限、协议、用户中止等），输出结构化分类与建议动作。 |
| [createAssistantTurnAccumulator](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts/createAssistantTurnAccumulator.md) | 函数 | 227–280 | 复杂 | acp、transcript、protocol、accumulator | 1 | 创建 assistant 轮次累加器，按协议语义维护稳定的 assistant text segment 与工具调用轨迹。 |
| [executeAcpSkillRunnerJob](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts/executeAcpSkillRunnerJob.md) | 函数 | 593–3253 | 复杂 | acp、orchestrator、skill-run、entry-point、state-machine | 1 | Skill run 编排主流程：准备工作区与依赖、建立会话、运行 prompt、处理权限与交互、收敛与校验产物并在失败时执行恢复。 |
| recordAcpSkillRunnerSetupStage | 函数 | 555–591 | 中等 | acp、observability、audit | 0 | 记录 Skill runner 准备阶段的阶段证据（物化、依赖、连接、权限），供审计与诊断使用。 |
| [runPrompt](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts/runPrompt.md) | 函数 | 374–532 | 复杂 | acp、transcript、streaming、protocol | 1 | 向 ACP 发送 prompt 并消费 session update 流，边流边处理权限请求、计划更新与 transcript 事件。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpAgentFamilyResolver.ts](acpAgentFamilyResolver.ts.md) | src/modules/acp/skillRun/acpAgentFamilyResolver.ts | agent family 解析器：按后端类型与命令特征判定当前 Agent 所属家族，为 skill run 提供差异化的执行假设。 |
| [acpConnectionAdapter.ts](../transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpRuntimeDependencyWrapper.ts](acpRuntimeDependencyWrapper.ts.md) | src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts | Agent 运行时依赖包装器：按 agent family 探测并准备命令依赖（Node/Python 等），通过平台 subprocess 抽象执行版本与存在性检查。 |
| [acpRuntimePerformanceProfiler.ts](../diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpRuntimeSemanticTraceRecorder.ts](../diagnostics/acpRuntimeSemanticTraceRecorder.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts | 语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。 |
| [acpSessionConfigOptions.ts](../chat/acpSessionConfigOptions.ts.md) | src/modules/acp/chat/acpSessionConfigOptions.ts | ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。 |
| [acpSkillMaterializer.ts](acpSkillMaterializer.ts.md) | src/modules/acp/skillRun/acpSkillMaterializer.ts | Skill 物化器：把 Skill 目录（含资源清单）写入 runtime 工作区，并按 agent family 决定是否需要薄代理 Skill。 |
| [acpSkillOutputConvergence.ts](acpSkillOutputConvergence.ts.md) | src/modules/acp/skillRun/acpSkillOutputConvergence.ts | Skill 输出收敛层：在多次运行输出之间做校验与归一，判断产物是否已稳定收敛并给出终态结论。 |
| [acpSkillOutputValidator.ts](acpSkillOutputValidator.ts.md) | src/modules/acp/skillRun/acpSkillOutputValidator.ts | Skill 输出校验器：按 schema 资产与产物 manifest 校验 skill run 输出结构，输出结构化错误而非松散字符串。 |
| [acpSkillResultFileFallback.ts](acpSkillResultFileFallback.ts.md) | src/modules/acp/skillRun/acpSkillResultFileFallback.ts | Skill 结果文件回退：当 Agent 未直接给出结构化结果时，从落盘结果文件回读并按校验器语义归一。 |
| [acpSkillRunAuditTrail.ts](acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpSkillRunControllerRegistry.ts](acpSkillRunControllerRegistry.ts.md) | src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts | skill run controller 注册表：登记执行期与准备期 controller，维护等待用户分离计时器，并在终态时清理陈旧权限请求。 |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunForeground.ts](acpSkillRunForeground.ts.md) | src/modules/acp/skillRun/acpSkillRunForeground.ts | 把指定 skill run 拉到前台：按执行模式选择 run、更新记录中的前台标记，并打开 Assistant Workspace 侧边栏。 |
| [acpSkillRunnerWorkspace.ts](acpSkillRunnerWorkspace.ts.md) | src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts | Skill runner 工作区管理：创建/清理 runtime 下的运行工作目录，隔离不同 requestId 的产物。 |
| [acpSkillRunPermissionQueue.ts](acpSkillRunPermissionQueue.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [acpSkillRunPromptBuilder.ts](acpSkillRunPromptBuilder.ts.md) | src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts | Skill run prompt 构建器：组合 agent family 规则、共享 Skill 目录、patch 模板与工作区上下文，生成最终运行提示词。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillRunStatus.ts](acpSkillRunStatus.ts.md) | src/modules/acp/skillRun/acpSkillRunStatus.ts | ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillSchemaAssets.ts](acpSkillSchemaAssets.ts.md) | src/modules/acp/skillRun/acpSkillSchemaAssets.ts | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [backgroundRefreshGovernance.ts](../../backgroundRefreshGovernance.ts.md) | src/modules/backgroundRefreshGovernance.ts | 后台刷新治理：限制并发定时器数量并记录读放大诊断，防止低价值轮询在插件内失控。 |
| [contracts.ts](../../../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [hostBridgeCliInjection.ts](../../hostBridge/cli/hostBridgeCliInjection.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInjection.ts | 把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。 |
| [pluginSkillRegistry.ts](../../workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../../../providers/types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [provider.ts](../../../providers/acp/provider.ts.md) | src/providers/acp/provider.ts | ACP Provider：把工作流请求转交 ACP 后端执行，负责模型选项折叠、SkillRun 编排调用与运行时选项归一。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| AcpPromptFailureError | 类 | 213–221 | ACP prompt 失败的类型化错误，携带分类结果与原始错误供上层决定重试或终止。 |
| classifyAcpPromptError | 函数 | 349–372 | 对单个错误对象应用分类规则并保留原始诊断信息。 |
| [classifyAcpPromptFailure](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts/classifyAcpPromptFailure.md) | 函数 | 292–347 | 把 prompt 失败按类型归类（连接、权限、协议、用户中止等），输出结构化分类与建议动作。 |
| [createAssistantTurnAccumulator](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts/createAssistantTurnAccumulator.md) | 函数 | 227–280 | 创建 assistant 轮次累加器，按协议语义维护稳定的 assistant text segment 与工具调用轨迹。 |
| [executeAcpSkillRunnerJob](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts/executeAcpSkillRunnerJob.md) | 函数 | 593–3253 | Skill run 编排主流程：准备工作区与依赖、建立会话、运行 prompt、处理权限与交互、收敛与校验产物并在失败时执行恢复。 |
| [runPrompt](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts/runPrompt.md) | 函数 | 374–532 | 向 ACP 发送 prompt 并消费 session update 流，边流边处理权限请求、计划更新与 transcript 事件。 |
