
# Agent 协议与后端运行时

ACP 协议与 SkillRunner 后端运行时：JSON-RPC transport、会话与 transcript 投影、skill run store 与诊断，以及 acp / skillrunner / generic-http / pass-through 四类后端 Provider 的请求适配。
> 本页由知识图谱分层 `layer:agent-runtime` 生成，共 155 个文件级节点。

## 目录分布

| 目录 | 文件数 |
| --- | --- |
| [src/modules/acp/skillRun](../modules/src/modules/acp/skillRun.md) | 41 |
| [src/modules/acp/diagnostics](../modules/src/modules/acp/diagnostics.md) | 18 |
| [src/modules/skillRunner/run](../modules/src/modules/skillRunner/run.md) | 15 |
| [src/modules/acp/chat](../modules/src/modules/acp/chat.md) | 14 |
| [src/modules/acp/transport](../modules/src/modules/acp/transport.md) | 12 |
| [src/providers/skillrunner](../modules/src/providers/skillrunner.md) | 9 |
| [src/modules/skillRunner/connection](../modules/src/modules/skillRunner/connection.md) | 8 |
| [src/modules/skillRunner/surface](../modules/src/modules/skillRunner/surface.md) | 7 |
| [src/modules/skillRunner/runtime](../modules/src/modules/skillRunner/runtime.md) | 6 |
| [src/providers](../modules/src/providers.md) | 5 |
| [src/providers/skillrunner/models/codex](../modules/src/providers/skillrunner/models/codex.md) | 5 |
| [src/providers/skillrunner/models/iflow](../modules/src/providers/skillrunner/models/iflow.md) | 5 |
| [src/providers/skillrunner/models/gemini](../modules/src/providers/skillrunner/models/gemini.md) | 4 |
| [src/modules](../modules/src/modules.md) | 3 |
| [src/providers/acp](../modules/src/providers/acp.md) | 1 |
| [src/providers/generic-http](../modules/src/providers/generic-http.md) | 1 |
| [src/providers/pass-through](../modules/src/providers/pass-through.md) | 1 |

## 文件清单

| 文件 | 类型 | 语言 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/acp/chat/acpBackendPresets.ts](../files/src/modules/acp/chat/acpBackendPresets.ts.md) | 文件 | — | ACP 后端预设目录：维护内置 Agent 后端（命令、参数、请求类型、显示名）的定义与解析，供后端管理器和连接层复用。 |
| [src/modules/acp/chat/acpChatSkillInjection.ts](../files/src/modules/acp/chat/acpChatSkillInjection.ts.md) | 文件 | — | ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。 |
| [src/modules/acp/chat/acpChatTranscriptMirror.ts](../files/src/modules/acp/chat/acpChatTranscriptMirror.ts.md) | 文件 | — | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [src/modules/acp/chat/acpChatWorkspaceDataPlane.ts](../files/src/modules/acp/chat/acpChatWorkspaceDataPlane.ts.md) | 文件 | — | ACP Chat 的 workspace 数据面：把 session runtime 投影为 Assistant Workspace read model，处理 owner 导航、transcript 分页与 transcript 事件发布，并向订阅者派发 workspace change。 |
| [src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts](../files/src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts.md) | 文件 | — | ACP Chat workspace 事件发布面的宿主槽位模块：定义 emission 类型契约与 register/get 访问器，使 acpSessionManager 域核心无需运行时 import 数据面即可发布事件。 |
| [src/modules/acp/chat/acpChatWorkspaceSurface.ts](../files/src/modules/acp/chat/acpChatWorkspaceSurface.ts.md) | 文件 | — | ACP Chat 工作区 surface adapter：把后端 conversation 变化映射为 publication kinds，并投影 transcript、toolbar、banner 等各区域的可见内容。 |
| [src/modules/acp/chat/acpContextBuilder.ts](../files/src/modules/acp/chat/acpContextBuilder.ts.md) | 文件 | — | 构造随 prompt 发给 ACP Agent 的宿主上下文：当前选中条目、library 范围与 Reader 位置，统一收敛为 AcpHostContext 结构。 |
| [src/modules/acp/chat/acpConversationStore.ts](../files/src/modules/acp/chat/acpConversationStore.ts.md) | 文件 | — | ACP Chat 会话状态的持久化事实源：负责会话索引与 conversation state 的读写删除、快照反序列化归一化，并协调 transcript 存储路径与 pluginStateStore 的 ACP 域记录。 |
| [src/modules/acp/chat/acpConversationTranscriptStore.ts](../files/src/modules/acp/chat/acpConversationTranscriptStore.ts.md) | 文件 | — | ACP Chat transcript 的落盘适配层：复用 skillRun 的 NDJSON transcript 引擎，以 AcpConversationItem 类型提供追加、批量入队、刷盘与分页/全量读取。 |
| [src/modules/acp/chat/acpModelOptionFolding.ts](../files/src/modules/acp/chat/acpModelOptionFolding.ts.md) | 文件 | — | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [src/modules/acp/chat/acpReasoningEffortFallback.ts](../files/src/modules/acp/chat/acpReasoningEffortFallback.ts.md) | 文件 | — | 推理强度设置的容错层：设置 thought_level 失败时识别特定后端的 -32602 参数错误，判定为可降级而非硬失败。 |
| [src/modules/acp/chat/acpSessionConfigOptions.ts](../files/src/modules/acp/chat/acpSessionConfigOptions.ts.md) | 文件 | — | ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。 |
| [src/modules/acp/chat/acpSessionManager.ts](../files/src/modules/acp/chat/acpSessionManager.ts.md) | 文件 | — | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [src/modules/acp/chat/acpSidebarModel.ts](../files/src/modules/acp/chat/acpSidebarModel.ts.md) | 文件 | — | 构建 ACP Chat 侧边栏视图快照：解析会话状态标签与宿主上下文摘要，产出侧边栏消费的展示模型。 |
| [src/modules/acp/diagnostics/acpAuditAppendCore.ts](../files/src/modules/acp/diagnostics/acpAuditAppendCore.ts.md) | 文件 | — | 审计日志追加的公共内核：基于 bufferedWriteCoordinator 提供带 owner 维度的 NDJSON 追加、刷盘、丢弃，并统一处理溢出与写入失败事件。 |
| [src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts](../files/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | 文件 | — | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts](../files/src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts.md) | 文件 | — | ACP Chat 诊断审计轨迹：按 backendId+conversationId 组织 owner，把 warn/error 级诊断证据写入审计文件，并管理 owner 的激活、刷盘与丢弃。 |
| [src/modules/acp/diagnostics/acpDiagnosticRouter.ts](../files/src/modules/acp/diagnostics/acpDiagnosticRouter.ts.md) | 文件 | — | 诊断事件路由：把 Chat 与 Skills 两个 surface 的诊断条目投影为证据记录，按级别决定是否写入 runtime log 或转发到调试审计 sink。 |
| [src/modules/acp/diagnostics/acpDiagnostics.ts](../files/src/modules/acp/diagnostics/acpDiagnostics.ts.md) | 文件 | — | ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。 |
| [src/modules/acp/diagnostics/acpRuntimeDiagnosticsMode.ts](../files/src/modules/acp/diagnostics/acpRuntimeDiagnosticsMode.ts.md) | 文件 | — | 运行时诊断模式（idle / recording / replaying）的单例状态机，保证录制与回放互斥，避免同一时间存在两个诊断消费者。 |
| [src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts](../files/src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts.md) | 文件 | — | ACP 运行时性能基线治理：脱敏采集元数据与环境信息、汇总 profiler 快照并构造可冻结的基线记录。 |
| [src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts](../files/src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts.md) | 文件 | — | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayController.ts](../files/src/modules/acp/diagnostics/acpRuntimeReplayController.ts.md) | 文件 | — | ACP 运行时回放控制器：管理回放任务的生命周期，负责 trace 预检、目标构造、矩阵执行与取消，并向 workspace 暴露回放状态视图。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts](../files/src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts.md) | 文件 | — | 回放场景的身份与命名规则：构造 synthetic chat/workflow owner identity，并把 phase、sample、cadence 收敛为有长度上限的 slug 文件名段。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts](../files/src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts.md) | 文件 | — | 回放的逻辑时间源：把原生 setTimeout 包装为可检查、可取消、可按剩余时间恢复的逻辑定时器，使回放不再依赖真实墙钟等待。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts](../files/src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts.md) | 文件 | — | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts](../files/src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts.md) | 文件 | — | 回放 profiling 上下文槽位：保存当前 requestId、来源种类与 surface，使深层性能记录无需逐层传参即可归因到正确的回放样本。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts](../files/src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts.md) | 文件 | — | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts](../files/src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts.md) | 文件 | — | 回放的发布侧车：在独立 window 上下文里监听 Assistant Workspace 消息，跨 epoch 排空发布队列并等待 workspace 就绪，使回放期间的 UI 事件可被完整捕获与归因。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts](../files/src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts.md) | 文件 | — | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |
| [src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts](../files/src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts.md) | 文件 | — | 语义 trace 的数据模型与 NDJSON 编解码：定义 trace schema、单调时钟、限额常量、完整性校验与解析加载，是录制端与回放端共享的格式契约。 |
| [src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts](../files/src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts.md) | 文件 | — | 语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。 |
| [src/modules/acp/skillRun/acpAgentFamilyResolver.ts](../files/src/modules/acp/skillRun/acpAgentFamilyResolver.ts.md) | 文件 | — | agent family 解析器：按后端类型与命令特征判定当前 Agent 所属家族，为 skill run 提供差异化的执行假设。 |
| [src/modules/acp/skillRun/acpPermissionQueue.ts](../files/src/modules/acp/skillRun/acpPermissionQueue.ts.md) | 文件 | — | ACP 权限请求的 FIFO 队列：同一会话只暴露队首请求为 active，支持按 requestId 幂等入队、应答与整队取消。 |
| [src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts](../files/src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts.md) | 文件 | — | Agent 运行时依赖包装器：按 agent family 探测并准备命令依赖（Node/Python 等），通过平台 subprocess 抽象执行版本与存在性检查。 |
| [src/modules/acp/skillRun/acpRuntimePromptTemplates.ts](../files/src/modules/acp/skillRun/acpRuntimePromptTemplates.ts.md) | 文件 | — | ACP 运行时 prompt 模板管理：把内置 prompt 模板物化到 runtime 目录并提供按 key 读取/解析的能力。 |
| [src/modules/acp/skillRun/acpSharedSkillCatalog.ts](../files/src/modules/acp/skillRun/acpSharedSkillCatalog.ts.md) | 文件 | — | ACP 共享 Skill 目录：聚合插件 Skill registry 与资源清单，生成本次会话可用的共享 Skill 列表。 |
| [src/modules/acp/skillRun/acpSkillMaterializer.ts](../files/src/modules/acp/skillRun/acpSkillMaterializer.ts.md) | 文件 | — | Skill 物化器：把 Skill 目录（含资源清单）写入 runtime 工作区，并按 agent family 决定是否需要薄代理 Skill。 |
| [src/modules/acp/skillRun/acpSkillOutputConvergence.ts](../files/src/modules/acp/skillRun/acpSkillOutputConvergence.ts.md) | 文件 | — | Skill 输出收敛层：在多次运行输出之间做校验与归一，判断产物是否已稳定收敛并给出终态结论。 |
| [src/modules/acp/skillRun/acpSkillOutputValidator.ts](../files/src/modules/acp/skillRun/acpSkillOutputValidator.ts.md) | 文件 | — | Skill 输出校验器：按 schema 资产与产物 manifest 校验 skill run 输出结构，输出结构化错误而非松散字符串。 |
| [src/modules/acp/skillRun/acpSkillPatchTemplates.ts](../files/src/modules/acp/skillRun/acpSkillPatchTemplates.ts.md) | 文件 | — | Skill Patch 模板模块：把内置 patch 模板物化到 runtime 目录，供不同 agent family 修补 SKILL.md 行为差异。 |
| [src/modules/acp/skillRun/acpSkillReferenceRewriter.ts](../files/src/modules/acp/skillRun/acpSkillReferenceRewriter.ts.md) | 文件 | — | Skill 内容引用重写器：把 SKILL.md 等文本中的相对引用改写为物化后的绝对路径，无外部依赖。 |
| [src/modules/acp/skillRun/acpSkillResourceManifest.ts](../files/src/modules/acp/skillRun/acpSkillResourceManifest.ts.md) | 文件 | — | Skill 资源清单：列举单个 Skill 声明的附带资源文件，供物化与校验阶段核对完整性。 |
| [src/modules/acp/skillRun/acpSkillResultFileFallback.ts](../files/src/modules/acp/skillRun/acpSkillResultFileFallback.ts.md) | 文件 | — | Skill 结果文件回退：当 Agent 未直接给出结构化结果时，从落盘结果文件回读并按校验器语义归一。 |
| [src/modules/acp/skillRun/acpSkillRunActions.ts](../files/src/modules/acp/skillRun/acpSkillRunActions.ts.md) | 文件 | — | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [src/modules/acp/skillRun/acpSkillRunAuditTrail.ts](../files/src/modules/acp/skillRun/acpSkillRunAuditTrail.ts.md) | 文件 | — | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts](../files/src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts.md) | 文件 | — | skill run controller 注册表：登记执行期与准备期 controller，维护等待用户分离计时器，并在终态时清理陈旧权限请求。 |
| [src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts](../files/src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts.md) | 文件 | — | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [src/modules/acp/skillRun/acpSkillRunForeground.ts](../files/src/modules/acp/skillRun/acpSkillRunForeground.ts.md) | 文件 | — | 把指定 skill run 拉到前台：按执行模式选择 run、更新记录中的前台标记，并打开 Assistant Workspace 侧边栏。 |
| [src/modules/acp/skillRun/acpSkillRunHosts.ts](../files/src/modules/acp/skillRun/acpSkillRunHosts.ts.md) | 文件 | — | skill run store 三个协作者模块（持久化、transcript 镜像、workspace 数据面）的宿主槽位契约：只含类型定义与 configure/get 访问器，刻意不产生运行时 import。 |
| [src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts](../files/src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts.md) | 文件 | — | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts](../files/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts.md) | 文件 | — | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts](../files/src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts.md) | 文件 | — | Skill runner 工作区管理：创建/清理 runtime 下的运行工作目录，隔离不同 requestId 的产物。 |
| [src/modules/acp/skillRun/acpSkillRunPayloadStore.ts](../files/src/modules/acp/skillRun/acpSkillRunPayloadStore.ts.md) | 文件 | — | skill run 的载荷持久化：读写 run context 载荷并维护 output revision 追加日志，为产物投影与恢复提供磁盘事实源。 |
| [src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts](../files/src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts.md) | 文件 | — | ACP Skill Run 权限请求的宿主注入门面：允许外部注册并设置权限请求处理器，从而把 UI 审批回路与队列实现解耦。 |
| [src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts](../files/src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts.md) | 文件 | — | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [src/modules/acp/skillRun/acpSkillRunPersistence.ts](../files/src/modules/acp/skillRun/acpSkillRunPersistence.ts.md) | 文件 | — | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts](../files/src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts.md) | 文件 | — | Skill run prompt 构建器：组合 agent family 规则、共享 Skill 目录、patch 模板与工作区上下文，生成最终运行提示词。 |
| [src/modules/acp/skillRun/acpSkillRunRecovery.ts](../files/src/modules/acp/skillRun/acpSkillRunRecovery.ts.md) | 文件 | — | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts](../files/src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts.md) | 文件 | — | 请求适配器：把 SkillRunner 风格的 job 记录转换为统一的 ACP skill run 请求对象，屏蔽两种后端形态的差异。 |
| [src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts](../files/src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts.md) | 文件 | — | ACP Skill Run 运行时目录（runtime catalog）的读写门面：保存 Agent 上报的可用模式/模型目录，并应用用户的运行时选择。 |
| [src/modules/acp/skillRun/acpSkillRunState.ts](../files/src/modules/acp/skillRun/acpSkillRunState.ts.md) | 文件 | — | ACP Skill Run 的进程内可变状态集合：run 记录表、控制器注册表、按 run 划分的权限队列与 runtime catalog，以及当前选中项。 |
| [src/modules/acp/skillRun/acpSkillRunStatus.ts](../files/src/modules/acp/skillRun/acpSkillRunStatus.ts.md) | 文件 | — | ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。 |
| [src/modules/acp/skillRun/acpSkillRunStore.ts](../files/src/modules/acp/skillRun/acpSkillRunStore.ts.md) | 文件 | — | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [src/modules/acp/skillRun/acpSkillRunTaskProjection.ts](../files/src/modules/acp/skillRun/acpSkillRunTaskProjection.ts.md) | 文件 | — | 把 ACP Skill run 摘要投影为统一的工作流任务行，使 skill run 能与普通工作流任务在同一 Dashboard/队列中呈现。 |
| [src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts](../files/src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts.md) | 文件 | — | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts](../files/src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts.md) | 文件 | — | ACP Skill Run transcript 的磁盘存储层：把 transcript 事件追加写入 NDJSON 日志、维护可增量重建的索引，并按页读取历史条目。 |
| [src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts](../files/src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts.md) | 文件 | — | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
| [src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts](../files/src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts.md) | 文件 | — | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |
| [src/modules/acp/skillRun/acpSkillSchemaAssets.ts](../files/src/modules/acp/skillRun/acpSkillSchemaAssets.ts.md) | 文件 | — | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |
| [src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts](../files/src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | 文件 | — | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [src/modules/acp/skillRun/acpStartupPromptPreambles.ts](../files/src/modules/acp/skillRun/acpStartupPromptPreambles.ts.md) | 文件 | — | ACP 会话启动提示前缀：解析内置指令文件并把宿主环境说明以可读前言形式插入首轮 prompt。 |
| [src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts](../files/src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts.md) | 文件 | — | ACP Skill 的薄代理物化器：按 agent family 解析 skill 根目录，注入 patch 模板与参考重写，把 Skill 包物化成 Agent 可直接消费的目录结构。 |
| [src/modules/acp/transport/acpBackendProbe.ts](../files/src/modules/acp/transport/acpBackendProbe.ts.md) | 文件 | — | ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。 |
| [src/modules/acp/transport/acpClientConnection.ts](../files/src/modules/acp/transport/acpClientConnection.ts.md) | 文件 | — | ACP 客户端连接：基于 NDJSON 传输实现 JSON-RPC 请求/响应/通知的收发、请求 ID 配对、写入排队与关闭语义。 |
| [src/modules/acp/transport/acpConnectionAdapter.ts](../files/src/modules/acp/transport/acpConnectionAdapter.ts.md) | 文件 | — | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [src/modules/acp/transport/acpExecutionProgress.ts](../files/src/modules/acp/transport/acpExecutionProgress.ts.md) | 文件 | — | ACP 执行进度累计器：按会话统计执行阶段与消息计数，供 UI 显示「正在执行/已完成」进度并在恢复时还原。 |
| [src/modules/acp/transport/acpMessageStream.ts](../files/src/modules/acp/transport/acpMessageStream.ts.md) | 文件 | — | ACP NDJSON 消息流：把子进程 stdout/stderr 按行切分并解析为 JSON-RPC 消息，向上提供异步迭代接口。 |
| [src/modules/acp/transport/acpNpxLaunchCache.ts](../files/src/modules/acp/transport/acpNpxLaunchCache.ts.md) | 文件 | — | 缓存 npx 启动 ACP 代理时解析出的可执行入口与版本信息，避免每次连接重复探测磁盘与 PATH，并通过有界等待处理启动竞态。 |
| [src/modules/acp/transport/acpPermissionOptions.ts](../files/src/modules/acp/transport/acpPermissionOptions.ts.md) | 文件 | — | ACP 权限选项语义：定义允许/拒绝等选项种类，并解析「自动批准」应对应哪个选项 ID。 |
| [src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts](../files/src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts.md) | 文件 | — | 静默终态 assistant 文本收集器：在不产生可见 transcript 的场景下收集终局 assistant 文本，供结果校验使用。 |
| [src/modules/acp/transport/acpSyntheticConnectionAdapter.ts](../files/src/modules/acp/transport/acpSyntheticConnectionAdapter.ts.md) | 文件 | — | 合成 ACP 连接适配器：用固定回放的 session update 序列替代真实后端进程，供回放诊断与测试驱动完整 UI 链路。 |
| [src/modules/acp/transport/acpTranscriptBoundary.ts](../files/src/modules/acp/transport/acpTranscriptBoundary.ts.md) | 文件 | — | ACP transcript 边界判定：按协议语义把 session update 分类为消息边界更新、语义更新与硬边界更新，供 Chat 与 Skills 两条路径共用。 |
| [src/modules/acp/transport/acpTransport.ts](../files/src/modules/acp/transport/acpTransport.ts.md) | 文件 | — | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [src/modules/acp/transport/acpWebSocketBridgeService.ts](../files/src/modules/acp/transport/acpWebSocketBridgeService.ts.md) | 文件 | — | ACP WebSocket Bridge sidecar 服务：定位预编译桥接二进制并在本地拉起 WebSocket 端点，为浏览器侧后端提供替代进程内 NDJSON 的连接路径。 |
| [src/modules/acpProtocol.ts](../files/src/modules/acpProtocol.ts.md) | 文件 | — | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [src/modules/acpTypes.ts](../files/src/modules/acpTypes.ts.md) | 文件 | — | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts](../files/src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts.md) | 文件 | — | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts](../files/src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts.md) | 文件 | — | 后端可达性探测的调度协调器：周期性扫描已配置后端、通过 management client 发起轻量探针，并把判定为长期不可达的后端自动禁用并弹出提示 toast。 |
| [src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts](../files/src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts.md) | 文件 | — | 连接审计的读取门面：把 connection governor 的核心快照与连接审计事件存储合并为单一诊断快照。 |
| [src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts](../files/src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts.md) | 文件 | — | SkillRunner 连接审计事件的内存存储：按 governor 实例保留有界事件流与分类计数，供调试开关打开时查询连接排队、超时、跳过与迟到结算等行为。 |
| [src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts](../files/src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts.md) | 文件 | — | SkillRunner 出站连接的唯一治理点：把提交、前台流、前台查询、结算、对账等连接请求分配到不同泳道并排队调度，施加并发上限、前台流池与物理连接债务记账，统一处理超时、abort 与迟到结算。 |
| [src/modules/skillRunner/connection/skillRunnerHandshake.ts](../files/src/modules/skillRunner/connection/skillRunnerHandshake.ts.md) | 文件 | — | SkillRunner 协议握手层：向后端查询其支持的能力与协议集合并做带 TTL 的缓存，同时提供执行前断言所需协议的校验函数。 |
| [src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts](../files/src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts.md) | 文件 | — | 握手协议的契约层：定义请求/响应 schema id、已支持的协议常量集合，以及旧版后端的兼容能力合成与交互文件能力协商逻辑。 |
| [src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts](../files/src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts.md) | 文件 | — | SkillRunner 管理客户端的构造工厂，把后端实例的 baseUrl 与管理鉴权的读取/持久化回调注入客户端，并统一本地化错误提示。 |
| [src/modules/skillRunner/run/skillRunFeedback.ts](../files/src/modules/skillRunner/run/skillRunFeedback.ts.md) | 文件 | — | Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。 |
| [src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts](../files/src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts.md) | 文件 | — | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [src/modules/skillRunner/run/skillRunnerExecutionMode.ts](../files/src/modules/skillRunner/run/skillRunnerExecutionMode.ts.md) | 文件 | — | SkillRunner 执行模式解析：把请求中的模式字段规整为已知取值，并为缺省情形给出稳定的默认模式。 |
| [src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts](../files/src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | 文件 | — | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts](../files/src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts.md) | 文件 | — | 交互式自动回复开关模块：解析用户偏好并判定某个 run 是否应启用自动回复，同时构造对应的请求载荷。 |
| [src/modules/skillRunner/run/skillRunnerProgressMapping.ts](../files/src/modules/skillRunner/run/skillRunnerProgressMapping.ts.md) | 文件 | — | 把 SkillRunner 事件流中的进度事件映射为 jobQueue 的 JobState、生命周期阶段与提交阶段，是后端事件语义与插件任务状态之间的翻译层。 |
| [src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts](../files/src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts.md) | 文件 | — | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [src/modules/skillRunner/run/skillRunnerRecoverableState.ts](../files/src/modules/skillRunner/run/skillRunnerRecoverableState.ts.md) | 文件 | — | 可恢复状态判定：判断哪些 SkillRunner 任务已具备恢复条件、哪些失败属于不可恢复，是重启恢复决策的最小判定单元。 |
| [src/modules/skillRunner/run/skillRunnerRunIdentity.ts](../files/src/modules/skillRunner/run/skillRunnerRunIdentity.ts.md) | 文件 | — | 按 workflowRunId:sequenceJobId:stepId 三段拼接生成 SkillRunner 序列步骤的本地 runId，任一环节缺失时返回空串。 |
| [src/modules/skillRunner/run/skillRunnerRunSettlement.ts](../files/src/modules/skillRunner/run/skillRunnerRunSettlement.ts.md) | 文件 | — | SkillRunner 运行的失败结算：把管理端响应与异常解析为语义化结论，按状态机规则将 run 标记为失败并停止对应的会话同步。 |
| [src/modules/skillRunner/run/skillRunnerRunStateProjection.ts](../files/src/modules/skillRunner/run/skillRunnerRunStateProjection.ts.md) | 文件 | — | 把运行状态与待处理 owner 投影为 UI 可直接消费的组合视图，包含等待归属方、是否应清除 pending 以及状态机违规信息。 |
| [src/modules/skillRunner/run/skillRunnerRunStore.ts](../files/src/modules/skillRunner/run/skillRunnerRunStore.ts.md) | 文件 | — | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts](../files/src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts.md) | 文件 | — | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [src/modules/skillRunner/run/skillRunnerSubmissionContext.ts](../files/src/modules/skillRunner/run/skillRunnerSubmissionContext.ts.md) | 文件 | — | 提交上下文小模块：归一化用户提交文本并解析对应的 Skill 展示名，供 run 记录与 UI 共用。 |
| [src/modules/skillRunner/run/skillRunnerTaskReconciler.ts](../files/src/modules/skillRunner/run/skillRunnerTaskReconciler.ts.md) | 文件 | — | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts](../files/src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts.md) | 文件 | — | SkillRunner 异步子系统的统一停机编排：按固定顺序排空运行对话框、停止自动回复观察者与任务对账器、关闭会话同步并释放本地运行时租约，任一环节失败只记日志而不中断后续清理。 |
| [src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts](../files/src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts.md) | 文件 | — | SkillRunner 控制面桥接：与本地 Skill-Runner ctl 服务建立/维持连接，投递运行请求并流式回传事件，是旧后端兼容路径的核心。 |
| [src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts](../files/src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts.md) | 文件 | — | 本地运行时部署调试日志的内存存储：只在调试模式开启时记录部署各阶段的结构化条目，供调试对话框查看与复制。 |
| [src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts](../files/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | 文件 | — | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts](../files/src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts.md) | 文件 | — | SkillRunner 发布版安装器：经 ctl bridge 触发后端自身安装/升级，解析版本并把安装结果写入运行时持久化目录。 |
| [src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts](../files/src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts.md) | 文件 | — | 本地 SkillRunner 运行时版本源的读取模块：拉取远端 feed 文档、规范化并按平台与架构挑选可用版本，在网络失败时回退到缓存与内置版本常量。 |
| [src/modules/skillRunner/surface/skillRunnerBackendToasts.ts](../files/src/modules/skillRunner/surface/skillRunnerBackendToasts.ts.md) | 文件 | — | 后端相关 toast 提示的构造与展示层：统一解析后端显示名、生成语义化提示文案与 payload，并区分插件托管的本地后端与外部后端。 |
| [src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts](../files/src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts.md) | 文件 | — | 本地运行时部署调试对话框：把调试日志条目渲染为可读列表，支持复制单条详情或整段控制台文本，便于排查一键部署失败。 |
| [src/modules/skillRunner/surface/skillRunnerManagementDialog.ts](../files/src/modules/skillRunner/surface/skillRunnerManagementDialog.ts.md) | 文件 | — | SkillRunner 管理界面的 URL 构造工具：校验并规范化后端 baseUrl，补齐 /ui 路径，为管理面板提供安全的打开地址。 |
| [src/modules/skillRunner/surface/skillRunnerRunDialog.ts](../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | 文件 | — | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [src/modules/skillRunner/surface/skillRunnerSidebarModel.ts](../files/src/modules/skillRunner/surface/skillRunnerSidebarModel.ts.md) | 文件 | — | SkillRunner 侧边栏的展示模型：把工作区任务按上下文相关性分组为运行中/已完成/待处理区块，并挑选应默认聚焦的任务键。 |
| [src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts](../files/src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts.md) | 文件 | — | Skill 展示注册表：保存后端上报的 skill 展示名快照，避免每次渲染都往返后端。 |
| [src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts](../files/src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts.md) | 文件 | — | 把 SkillRunner 工作区适配到 Assistant Workspace 共享 surface 契约：把工作区变更映射为发布类型，构造 hint、交互区、控制徽标与 composer 状态，并注册统一的 publication adapter。 |
| [src/modules/skillRunnerSsoFacts.ts](../files/src/modules/skillRunnerSsoFacts.ts.md) | 文件 | — | SkillRunner 运行时 SSOT 事实的单一事实源：把 provider 状态集合、终态集合、后端健康探测节奏、事件流连接/断连状态、托管本地后端身份等硬编码常量集中导出，供治理脚本与文档一致性校验读取。 |
| [src/providers/acp/provider.ts](../files/src/providers/acp/provider.ts.md) | 文件 | — | ACP Provider：把工作流请求转交 ACP 后端执行，负责模型选项折叠、SkillRun 编排调用与运行时选项归一。 |
| [src/providers/contracts.ts](../files/src/providers/contracts.ts.md) | 文件 | — | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [src/providers/generic-http/provider.ts](../files/src/providers/generic-http/provider.ts.md) | 文件 | — | 通用 HTTP Provider：按声明式请求对任意 REST 后端发起调用，支持模板插值、JSON path 提取、多步骤编排、上传与轮询。 |
| [src/providers/pass-through/provider.ts](../files/src/providers/pass-through/provider.ts.md) | 文件 | — | 透传 Provider：不发起真实网络调用，仅做请求契约校验与结果回显，用于验证工作流声明与后端契约链路是否连通。 |
| [src/providers/profile.ts](../files/src/providers/profile.ts.md) | 文件 | — | Provider Profile 层：把后端实例投影为可校验、可指纹化的 provider profile，并按 provider 运行时选项 schema 校验取值。 |
| [src/providers/registry.ts](../files/src/providers/registry.ts.md) | 文件 | — | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |
| [src/providers/requestContracts.ts](../files/src/providers/requestContracts.ts.md) | 文件 | — | Provider 请求契约校验层：为每种 request kind 定义 provider/backend 兼容矩阵与负载校验规则，并在调度前断言契约成立。 |
| [src/providers/skillrunner/client.ts](../files/src/providers/skillrunner/client.ts.md) | 文件 | — | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [src/providers/skillrunner/errors.ts](../files/src/providers/skillrunner/errors.ts.md) | 文件 | — | SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。 |
| [src/providers/skillrunner/managementClient.ts](../files/src/providers/skillrunner/managementClient.ts.md) | 文件 | — | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [src/providers/skillrunner/modelCache.ts](../files/src/providers/skillrunner/modelCache.ts.md) | 文件 | — | SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。 |
| [src/providers/skillrunner/modelCatalog.ts](../files/src/providers/skillrunner/modelCatalog.ts.md) | 文件 | — | SkillRunner 模型目录：解析静态 manifest 与远端快照，展开 engine/provider/model 层级并把模型规格归一为 UI 与运行时可用形态。 |
| [src/providers/skillrunner/models/codex/manifest.json](../files/src/providers/skillrunner/models/codex/manifest.json.md) | 配置 | — | Codex 引擎模型快照目录的清单，声明 engine 为 codex，并按版本号升序列出四份快照文件名，供 SkillRunner Provider 定位并加载对应版本的模型定义。 |
| [src/providers/skillrunner/models/codex/models_0.0.0.json](../files/src/providers/skillrunner/models/codex/models_0.0.0.json.md) | 配置 | — | Codex 引擎 0.0.0 基线模型快照，仅收录 gpt-5-codex 一个模型，支持 minimal 到 xhigh 五档 effort，作为版本对比与兜底的起点。 |
| [src/providers/skillrunner/models/codex/models_0.106.0.json](../files/src/providers/skillrunner/models/codex/models_0.106.0.json.md) | 配置 | — | Codex 引擎 0.106.0 模型快照，是本目录最新且条目最多的版本，在 0.99.0 基础上补入 gpt-5.4，共六个模型，并区分 mini 与通用模型的 effort 上限。 |
| [src/providers/skillrunner/models/codex/models_0.89.0.json](../files/src/providers/skillrunner/models/codex/models_0.89.0.json.md) | 配置 | — | Codex 引擎 0.89.0 模型快照，收录 gpt-5.1-codex-mini、max、gpt-5.2 与 gpt-5.2-codex 四个模型，并逐个标注 supported_effort 档位。 |
| [src/providers/skillrunner/models/codex/models_0.99.0.json](../files/src/providers/skillrunner/models/codex/models_0.99.0.json.md) | 配置 | — | Codex 引擎 0.99.0 模型快照，在 0.89.0 的四个模型基础上新增 gpt-5.3-codex，共五个模型条目，deprecated 均为 false。 |
| [src/providers/skillrunner/models/gemini/manifest.json](../files/src/providers/skillrunner/models/gemini/manifest.json.md) | 配置 | — | Gemini 引擎的模型快照清单，声明 engine=gemini 并索引三个版本化快照文件（0.0.0、0.25.2、0.30.0），供 SkillRunner Provider 按版本发现并加载对应模型表。 |
| [src/providers/skillrunner/models/gemini/models_0.0.0.json](../files/src/providers/skillrunner/models/gemini/models_0.0.0.json.md) | 配置 | — | Gemini 0.0.0 初始基线快照，仅收录 gemini-3-pro-preview 一个模型，作为后续模型表扩展的对照基线。 |
| [src/providers/skillrunner/models/gemini/models_0.25.2.json](../files/src/providers/skillrunner/models/gemini/models_0.25.2.json.md) | 配置 | — | Gemini 0.25.2 版本模型表，收录 gemini-3-pro/flash-preview 与 gemini-2.5-pro/flash/flash-lite 共 5 个模型条目（均未废弃），供 SkillRunner Provider 做模型选择。 |
| [src/providers/skillrunner/models/gemini/models_0.30.0.json](../files/src/providers/skillrunner/models/gemini/models_0.30.0.json.md) | 配置 | — | Gemini 0.30.0 版本模型表，把 pro 主力模型升级为 gemini-3.1-pro-preview，其余 4 个模型与 0.25.2 保持一致，用于多版本后端下的模型发现与降级。 |
| [src/providers/skillrunner/models/iflow/manifest.json](../files/src/providers/skillrunner/models/iflow/manifest.json.md) | 配置 | — | iflow 引擎的模型快照清单，列出 engine 为 iflow 并按版本升序索引 0.0.0/0.5.2/0.5.12/0.5.14 四个 models_*.json 快照文件，供 SkillRunner modelCatalog 解析模型目录。 |
| [src/providers/skillrunner/models/iflow/models_0.0.0.json](../files/src/providers/skillrunner/models/iflow/models_0.0.0.json.md) | 配置 | — | iFlow 引擎 0.0.0 的钉版（pinned snapshot）模型清单，仅含单个 gpt-4 条目，作为最早的回退模型集合。 |
| [src/providers/skillrunner/models/iflow/models_0.5.12.json](../files/src/providers/skillrunner/models/iflow/models_0.5.12.json.md) | 配置 | — | iFlow 引擎 0.5.12 的钉版模型清单，登记 9 个模型，结构与 0.5.14 一致（0.5.12 用 MiniMax M2.1，0.5.14 换为 M2.5）。 |
| [src/providers/skillrunner/models/iflow/models_0.5.14.json](../files/src/providers/skillrunner/models/iflow/models_0.5.14.json.md) | 配置 | — | iFlow 引擎 0.5.14 的钉版模型清单，登记 9 个模型，是 modelCatalog.ts 中 iflow 目录可选的最新快照版本。 |
| [src/providers/skillrunner/models/iflow/models_0.5.2.json](../files/src/providers/skillrunner/models/iflow/models_0.5.2.json.md) | 配置 | — | iFlow 引擎 0.5.2 的钉版模型清单，登记 7 个模型（GLM 4.7、iFlow ROME 30BA3B、DeepSeek V3.2、Qwen3 Coder Plus、Kimi K2 Thinking、MiniMax M2.1、Kimi K2 0905）。 |
| [src/providers/skillrunner/provider.ts](../files/src/providers/skillrunner/provider.ts.md) | 文件 | — | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [src/providers/skillrunner/skillPackageBundler.ts](../files/src/providers/skillrunner/skillPackageBundler.ts.md) | 文件 | — | SkillRunner 侧 skill 包打包：把插件 Skill 注册表中的条目组装成 zip 包，经 zipTransport 发送给旧版 SkillRunner 后端。 |
| [src/providers/skillrunner/uploadMapping.ts](../files/src/providers/skillrunner/uploadMapping.ts.md) | 文件 | — | SkillRunner 上传路径映射：把工作流声明的输入物化为受控的上传相对路径，并生成 Host Bridge 选择包路径。 |
| [src/providers/skillrunner/zipTransport.ts](../files/src/providers/skillrunner/zipTransport.ts.md) | 文件 | — | SkillRunner provider 的 zip 上传传输层：在 Zotero 沙箱内用纯 JS 构造 zip 与 multipart 负载，把 skill 包发送给旧版后端。 |
| [src/providers/types.ts](../files/src/providers/types.ts.md) | 文件 | — | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |

## 对其它分层的依赖

| 目标分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [插件外壳与核心运行时](plugin-core.md) | 288 | imports×288 |
| [页面与交互界面](ui-surface.md) | 68 | imports×67、depends_on×1 |
| [工作流引擎与执行](workflow-engine.md) | 59 | imports×59 |
| [Zotero 宿主与 Bridge 集成](zotero-host.md) | 18 | imports×18 |
| [构建、发布与工程配置](build-tooling.md) | 5 | imports×5 |

## 被其它分层依赖

| 来源分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [工作流引擎与执行](workflow-engine.md) | 71 | imports×67、defines_schema×4 |
| [页面与交互界面](ui-surface.md) | 57 | imports×57 |
| [插件外壳与核心运行时](plugin-core.md) | 29 | imports×29 |
| [Zotero 宿主与 Bridge 集成](zotero-host.md) | 15 | imports×15 |
| [构建、发布与工程配置](build-tooling.md) | 5 | imports×5 |
| [内置工作流包与 Skill 资产](workflow-assets.md) | 2 | imports×2 |
