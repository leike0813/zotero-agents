
# src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts -->

skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。
源码：[src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts)

## 符号（12）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:applyAcpSkillRunRuntimeSelection -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:buildAcpSkillOutputValidationFailureDetails -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:buildRunPrompt -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:createAcpHardTimeoutMonitor -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:findWorkspaceActivitySnapshot -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:preflightRequiredMcpTools -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:prepareAcpSkillRunHostBridgeCli -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:refreshAcpSkillRunRuntimeCatalogFromSession -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:resolveAcpSkillRunEffectiveRuntimeOptions -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:resolveRequiredMcpTools -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:resolveZoteroHostAccessRequirement -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts:wrapAcpSkillRunPermissionRequestForTimeoutPause -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyAcpSkillRunRuntimeSelection | 函数 | 1144–1279 | 复杂 | 运行时选项、状态同步、acp-skills | 0 | 把运行时选择应用到已连接的 run：逐项下发 mode/model/effort 并记录每项的 applied/unavailable/fallback 结果。 |
| buildAcpSkillOutputValidationFailureDetails | 函数 | 212–247 | 中等 | 校验、产物、错误处理 | 0 | 构造产物校验失败的结构化详情，区分缺字段、schema 不符与内容不可解析三类原因。 |
| buildRunPrompt | 函数 | 486–532 | 复杂 | prompt 构造、acp-skills、skill-run | 0 | 组装最终 run prompt：拼接启动前置、skill 合约、宿主访问要求与工作区意图说明。 |
| createAcpHardTimeoutMonitor | 函数 | 697–817 | 复杂 | 超时监控、资源治理、acp-skills | 0 | 创建硬超时监视器：在共享 deadline 内协调 transcript 排空与 adapter 强停，避免超时时留下悬挂任务。 |
| findWorkspaceActivitySnapshot | 函数 | 410–461 | 中等 | workspace 活动、快照、acp-skills | 0 | 从 run 记录中定位最新的 workspace 活动快照，用于 UI 呈现 Agent 的文件操作。 |
| preflightRequiredMcpTools | 函数 | 891–963 | 复杂 | 前置检查、mcp、acp-skills | 0 | 预检 run 所需 MCP 工具是否可用，产出可渲染的守卫提示或直接通过。 |
| prepareAcpSkillRunHostBridgeCli | 函数 | 632–695 | 复杂 | host-bridge、准备流程、acp-skills | 0 | 准备 run 使用的 Host Bridge CLI 可执行物与身份文件，失败时给出可诊断的错误分类。 |
| refreshAcpSkillRunRuntimeCatalogFromSession | 函数 | 1068–1133 | 复杂 | 运行时目录、同步、acp-skills | 0 | 从已 attach 的 session 刷新运行时目录，合并后端实际支持的 mode/model/effort 选项。 |
| resolveAcpSkillRunEffectiveRuntimeOptions | 函数 | 303–341 | 中等 | 运行时选项、acp-skills、解析 | 0 | 推导 run 实际生效的运行时选项，合并默认值、请求覆盖与后端实际支持情况。 |
| resolveRequiredMcpTools | 函数 | 596–605 | 简单 | mcp、前置检查、acp-skills | 1 | 解析本 run 所需的 MCP 工具集合，合并 workflow 声明与 runner 兜底要求。 |
| resolveZoteroHostAccessRequirement | 函数 | 607–630 | 中等 | 宿主能力、acp-skills、解析 | 1 | 判定 run 是否需要 Zotero 宿主访问能力，并据此决定是否注入 Host Bridge。 |
| wrapAcpSkillRunPermissionRequestForTimeoutPause | 函数 | 1025–1051 | 中等 | 权限请求、超时监控、acp-skills | 0 | 包装权限请求处理，使等待用户输入期间硬超时监视器能够暂停计时。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](../transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpDiagnosticRouter.ts](../diagnostics/acpDiagnosticRouter.ts.md) | src/modules/acp/diagnostics/acpDiagnosticRouter.ts | 诊断事件路由：把 Chat 与 Skills 两个 surface 的诊断条目投影为证据记录，按级别决定是否写入 runtime log 或转发到调试审计 sink。 |
| [acpPermissionOptions.ts](../transport/acpPermissionOptions.ts.md) | src/modules/acp/transport/acpPermissionOptions.ts | ACP 权限选项语义：定义允许/拒绝等选项种类，并解析「自动批准」应对应哪个选项 ID。 |
| [acpReasoningEffortFallback.ts](../chat/acpReasoningEffortFallback.ts.md) | src/modules/acp/chat/acpReasoningEffortFallback.ts | 推理强度设置的容错层：设置 thought_level 失败时识别特定后端的 -32602 参数错误，判定为可降级而非硬失败。 |
| [acpRuntimePromptTemplates.ts](acpRuntimePromptTemplates.ts.md) | src/modules/acp/skillRun/acpRuntimePromptTemplates.ts | ACP 运行时 prompt 模板管理：把内置 prompt 模板物化到 runtime 目录并提供按 key 读取/解析的能力。 |
| [acpSessionConfigOptions.ts](../chat/acpSessionConfigOptions.ts.md) | src/modules/acp/chat/acpSessionConfigOptions.ts | ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。 |
| [acpSkillOutputConvergence.ts](acpSkillOutputConvergence.ts.md) | src/modules/acp/skillRun/acpSkillOutputConvergence.ts | Skill 输出收敛层：在多次运行输出之间做校验与归一，判断产物是否已稳定收敛并给出终态结论。 |
| [acpSkillRunAuditTrail.ts](acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunnerWorkspace.ts](acpSkillRunnerWorkspace.ts.md) | src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts | Skill runner 工作区管理：创建/清理 runtime 下的运行工作目录，隔离不同 requestId 的产物。 |
| [acpSkillRunPermissionQueue.ts](acpSkillRunPermissionQueue.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [acpSkillRunPromptBuilder.ts](acpSkillRunPromptBuilder.ts.md) | src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts | Skill run prompt 构建器：组合 agent family 规则、共享 Skill 目录、patch 模板与工作区上下文，生成最终运行提示词。 |
| [acpSkillRunRuntimeCatalog.ts](acpSkillRunRuntimeCatalog.ts.md) | src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts | ACP Skill Run 运行时目录（runtime catalog）的读写门面：保存 Agent 上报的可用模式/模型目录，并应用用户的运行时选择。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpStartupPromptPreambles.ts](acpStartupPromptPreambles.ts.md) | src/modules/acp/skillRun/acpStartupPromptPreambles.ts | ACP 会话启动提示前缀：解析内置指令文件并把宿主环境说明以可读前言形式插入首轮 prompt。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [contracts.ts](../../../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [hostBridgeCliInjection.ts](../../hostBridge/cli/hostBridgeCliInjection.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInjection.ts | 把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。 |
| [hostBridgeServer.ts](../../hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [zoteroMcpProtocol.ts](../../hostBridge/mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |
| [zoteroMcpServer.ts](../../hostBridge/mcp/zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |
| [zoteroRuntimeVersion.ts](../../../shared/zoteroRuntimeVersion.ts.md) | src/shared/zoteroRuntimeVersion.ts | 把 Zotero 版本号解析为受支持的主版本（7 / 9 / 10），用于兼容性分支与诊断输出。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayTargets.ts](../diagnostics/acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyAcpSkillRunRuntimeSelection | 函数 | 1144–1279 | 把运行时选择应用到已连接的 run：逐项下发 mode/model/effort 并记录每项的 applied/unavailable/fallback 结果。 |
| resolveRequiredMcpTools | 函数 | 596–605 | 解析本 run 所需的 MCP 工具集合，合并 workflow 声明与 runner 兜底要求。 |
