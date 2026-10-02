
# src/modules/acp/skillRun/acpSkillRunStore.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunStore.ts -->

ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。
源码：[src/modules/acp/skillRun/acpSkillRunStore.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunStore.ts)

## 符号（31）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:appendAcpSkillRunUserReply -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:appendOutputRevision -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:appendStatusTranscriptItem -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:cancelAcpSkillRunPermissionQueue -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:clearAcpSkillRunRecords -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:clearAcpSkillRunsForRuntimePersistence -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:clearWaitingUserDetachTimer -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:cloneAcpSkillRunRecord -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:deleteAcpSkillRunRecords -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:formatJsonMarkdownList -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:formatMarkdownListScalar -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:getAcpSkillRunRecord -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:getAcpSkillRunTranscriptLiveState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:isAcpSkillRunLifecycleOpen -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:isAllowedNonTerminalAcpSkillRunTransition -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:permissionStatusFromResolution -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:projectAcpSkillRunMetadataRecord -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:projectAcpSkillRunOutputEnvelopeToTranscript -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:propagateAcpSkillRunTerminalState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:recordAcpSkillRunOutputRevision -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:removeLatestAssistantCandidateMessage -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:replaceLatestAssistantMessage -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:resetAcpSkillRunsForTests -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:resolveAcpSkillRunStatusTransition -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:runtimeCatalogForRun -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:setAcpSkillRunRecord -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:setAcpSkillRunRecoveryHandler -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:setAcpSkillRunRecoveryHandlerForTests -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:syncWaitingUserDetachTimer -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:upsertAcpSkillRun -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunStore.ts:upsertPermissionTranscriptItem -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendAcpSkillRunUserReply | 函数 | 1572–1618 | 简单 | acp、store、serialization | 0 | 追加用户回复到指定 run，清理等待交互标记并把回复并入下一轮 prompt 上下文。 |
| appendOutputRevision | 函数 | 1779–1816 | 简单 | acp、store、serialization | 0 | 向 run 的 output revision 列表追加一版输出，写入版本号、状态与产物引用。 |
| appendStatusTranscriptItem | 函数 | 1047–1098 | 中等 | acp、store、serialization | 0 | 向 transcript 追加一条状态变更说明，把不可见的状态机迁移翻译成用户可读文本。 |
| cancelAcpSkillRunPermissionQueue | 函数 | 1958–2017 | 中等 | acp、store、validation | 0 | 取消某条 run 的全部 pending 权限请求，避免取消后仍弹出审批对话框。 |
| clearAcpSkillRunRecords | 函数 | 906–918 | 简单 | acp、store、cache | 0 | 清空全部 run 记录与附属定时器，用于测试与运行时会话整体重置。 |
| clearAcpSkillRunsForRuntimePersistence | 函数 | 2078–2085 | 简单 | acp、store、cache | 0 | 在运行时持久化重建前释放内存中的 run 记录，避免与状态库水合产生双份真相。 |
| clearWaitingUserDetachTimer | 函数 | 823–829 | 简单 | acp、store、lifecycle | 0 | 清除等待用户态的自动脱离定时器，防止延迟回调改变已推进的 run。 |
| cloneAcpSkillRunRecord | 函数 | 865–877 | 简单 | acp、store、cache | 0 | 深拷贝 run 记录，切断内部对象与持久化快照之间的共享引用。 |
| deleteAcpSkillRunRecords | 函数 | 2019–2033 | 简单 | acp、store、cache | 0 | 按 requestId 集合删除 run 记录及其 transcript、payload 与任务投影。 |
| formatJsonMarkdownList | 函数 | 1666–1697 | 简单 | acp、store、validation | 0 | 把对象/数组格式化为 Markdown 列表，用于把工具结果渲染进 transcript。 |
| formatMarkdownListScalar | 函数 | 1644–1664 | 简单 | acp、store、validation | 0 | 把标量值格式化为 Markdown 列表项，正确处理引号与换行的转义。 |
| getAcpSkillRunRecord | 函数 | 2035–2043 | 简单 | acp、store、query | 0 | 按 requestId 读取 run 记录，缺失时返回 undefined 而不抛错。 |
| getAcpSkillRunTranscriptLiveState | 函数 | 678–697 | 简单 | acp、store、query | 0 | 判断某条 run 的 transcript 是否处于 live（流式进行中）状态，用于区分增量更新与全量发布。 |
| isAcpSkillRunLifecycleOpen | 函数 | 699–728 | 简单 | acp、store、validation | 0 | 判定 run 生命周期是否仍然开放（未终结、未取消），决定是否继续接受状态写入。 |
| isAllowedNonTerminalAcpSkillRunTransition | 函数 | 1100–1149 | 中等 | acp、store、validation | 0 | 白名单校验非终态之间的状态迁移是否合法，拒绝跨阶段的跳跃式跃迁。 |
| permissionStatusFromResolution | 函数 | 987–1001 | 简单 | acp、store、utility | 0 | 由权限结算结果推导权限条目的展示状态（待处理、已允许、已拒绝）。 |
| projectAcpSkillRunMetadataRecord | 函数 | 879–894 | 简单 | acp、store、cache | 0 | 投影 run 的轻量元数据记录，供列表与 Dashboard 使用而不触碰完整 transcript。 |
| projectAcpSkillRunOutputEnvelopeToTranscript | 函数 | 1862–1927 | 中等 | acp、store、cache | 0 | 把输出信封（结构化产物 + 校验结果）投影为 transcript 中的可读条目。 |
| propagateAcpSkillRunTerminalState | 函数 | 746–776 | 简单 | acp、store、cache | 0 | 把终态向派生视图传播：关闭等待用户定时器、结算权限队列并通知工作区变更。 |
| recordAcpSkillRunOutputRevision | 函数 | 1818–1860 | 简单 | acp、store、state-management | 0 | 记录一次 run 输出修订：校验状态、落盘修订历史并把修订内容投影到 transcript。 |
| removeLatestAssistantCandidateMessage | 函数 | 1757–1777 | 简单 | acp、store、lifecycle | 0 | 移除尚处于候选态的最后一条 assistant 消息，用于流式失败时回滚未确认内容。 |
| replaceLatestAssistantMessage | 函数 | 1699–1755 | 中等 | acp、store、utility | 0 | 用新的 assistant 消息替换 transcript 中最后一条 assistant 条目，保持流式续写语义。 |
| resetAcpSkillRunsForTests | 函数 | 2059–2076 | 简单 | acp、store、test | 0 | 重置 run 记录、控制器与诊断计数，使每个测试用例从干净状态开始。 |
| resolveAcpSkillRunStatusTransition | 函数 | 1151–1175 | 简单 | acp、store、cache | 0 | 解析状态迁移请求，返回目标状态或拒绝原因，是状态机唯一的裁决入口。 |
| runtimeCatalogForRun | 函数 | 1945–1956 | 简单 | acp、store、utility | 0 | 取出指定 run 的 runtime catalog 快照，供 prompt 组装与 UI 展示复用。 |
| setAcpSkillRunRecord | 函数 | 778–821 | 简单 | acp、store、cache | 0 | 写入或替换一条 run 记录，同时同步其所属 workspace 的选择与权限队列归属。 |
| setAcpSkillRunRecoveryHandler | 函数 | 1935–1939 | 简单 | acp、store、cache | 0 | 注入 run 恢复处理器，store 只依赖该回调而不直接耦合恢复实现。 |
| setAcpSkillRunRecoveryHandlerForTests | 函数 | 1929–1933 | 简单 | acp、store、test | 0 | 为测试替换 run 恢复处理器，使恢复路径可以被独立驱动验证。 |
| syncWaitingUserDetachTimer | 函数 | 831–863 | 简单 | acp、store、state-management | 0 | 按等待用户态与超时配置同步脱离定时器，使超时后 UI 能从运行态退回等待态。 |
| [upsertAcpSkillRun](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunStore.ts/upsertAcpSkillRun.md) | 函数 | 1177–1570 | 复杂 | acp、store、state-management | 1 | 写入或更新一条 run 记录：校验状态迁移、刷新 transcript 条目、更新权限与回复状态并触发持久化。 |
| upsertPermissionTranscriptItem | 函数 | 1003–1045 | 简单 | acp、store、state-management | 0 | 把一条 pending 权限写入 transcript，按权限 ID 幂等更新同一条目而不追加重复项。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpExecutionProgress.ts](../transport/acpExecutionProgress.ts.md) | src/modules/acp/transport/acpExecutionProgress.ts | ACP 执行进度累计器：按会话统计执行阶段与消息计数，供 UI 显示「正在执行/已完成」进度并在恢复时还原。 |
| [acpModelOptionFolding.ts](../chat/acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpRuntimePerformanceProfiler.ts](../diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpRuntimeSemanticTraceRecorder.ts](../diagnostics/acpRuntimeSemanticTraceRecorder.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts | 语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。 |
| [acpSessionConfigOptions.ts](../chat/acpSessionConfigOptions.ts.md) | src/modules/acp/chat/acpSessionConfigOptions.ts | ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。 |
| [acpSkillRunAuditTrail.ts](acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpSkillRunHosts.ts](acpSkillRunHosts.ts.md) | src/modules/acp/skillRun/acpSkillRunHosts.ts | skill run store 三个协作者模块（持久化、transcript 镜像、workspace 数据面）的宿主槽位契约：只含类型定义与 configure/get 访问器，刻意不产生运行时 import。 |
| [acpSkillRunPayloadStore.ts](acpSkillRunPayloadStore.ts.md) | src/modules/acp/skillRun/acpSkillRunPayloadStore.ts | skill run 的载荷持久化：读写 run context 载荷并维护 output revision 追加日志，为产物投影与恢复提供磁盘事实源。 |
| [acpSkillRunPersistence.ts](acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunState.ts](acpSkillRunState.ts.md) | src/modules/acp/skillRun/acpSkillRunState.ts | ACP Skill Run 的进程内可变状态集合：run 记录表、控制器注册表、按 run 划分的权限队列与 runtime catalog，以及当前选中项。 |
| [acpSkillRunStatus.ts](acpSkillRunStatus.ts.md) | src/modules/acp/skillRun/acpSkillRunStatus.ts | ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。 |
| [acpSkillRunTranscriptMirror.ts](acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [acpSkillRunTranscriptStore.ts](acpSkillRunTranscriptStore.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts | ACP Skill Run transcript 的磁盘存储层：把 transcript 事件追加写入 NDJSON 日志、维护可增量重建的索引，并按页读取历史条目。 |
| [acpSkillRunWorkspaceDataPlane.ts](acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantMessageCounts.ts](../../assistant/publication/assistantMessageCounts.ts.md) | src/modules/assistant/publication/assistantMessageCounts.ts | Assistant 消息计数工具：创建、规整与克隆消息计数三元组，并提供执行开始/结束与逐条自增的计数维护入口。 |
| [assistantWorkspaceTranscriptPublication.ts](../../assistant/publication/assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [hostBridgeWriteAutoApprovalRegistry.ts](../../hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts.md) | src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts | Host Bridge 写操作的自动授权登记处：签发、吊销与按 run 回收 write auto-approval grant，并判定某个 scope 是否落在自动放权范围内。 |
| [pluginStateStore.ts](../../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [sequenceStateStore.ts](../../workflowExecution/sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConversationTranscriptStore.ts](../chat/acpConversationTranscriptStore.ts.md) | src/modules/acp/chat/acpConversationTranscriptStore.ts | ACP Chat transcript 的落盘适配层：复用 skillRun 的 NDJSON transcript 引擎，以 AcpConversationItem 类型提供追加、批量入队、刷盘与分页/全量读取。 |
| [acpRuntimeReplayTargets.ts](../diagnostics/acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |
| [acpSkillRunActions.ts](acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunAuditTrail.ts](acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpSkillRunControllerRegistry.ts](acpSkillRunControllerRegistry.ts.md) | src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts | skill run controller 注册表：登记执行期与准备期 controller，维护等待用户分离计时器，并在终态时清理陈旧权限请求。 |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunForeground.ts](acpSkillRunForeground.ts.md) | src/modules/acp/skillRun/acpSkillRunForeground.ts | 把指定 skill run 拉到前台：按执行模式选择 run、更新记录中的前台标记，并打开 Assistant Workspace 侧边栏。 |
| [acpSkillRunHosts.ts](acpSkillRunHosts.ts.md) | src/modules/acp/skillRun/acpSkillRunHosts.ts | skill run store 三个协作者模块（持久化、transcript 镜像、workspace 数据面）的宿主槽位契约：只含类型定义与 configure/get 访问器，刻意不产生运行时 import。 |
| [acpSkillRunInteractionFiles.ts](acpSkillRunInteractionFiles.ts.md) | src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunPayloadStore.ts](acpSkillRunPayloadStore.ts.md) | src/modules/acp/skillRun/acpSkillRunPayloadStore.ts | skill run 的载荷持久化：读写 run context 载荷并维护 output revision 追加日志，为产物投影与恢复提供磁盘事实源。 |
| [acpSkillRunPermissionQueue.ts](acpSkillRunPermissionQueue.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [acpSkillRunPersistence.ts](acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillRunRuntimeCatalog.ts](acpSkillRunRuntimeCatalog.ts.md) | src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts | ACP Skill Run 运行时目录（runtime catalog）的读写门面：保存 Agent 上报的可用模式/模型目录，并应用用户的运行时选择。 |
| [acpSkillRunState.ts](acpSkillRunState.ts.md) | src/modules/acp/skillRun/acpSkillRunState.ts | ACP Skill Run 的进程内可变状态集合：run 记录表、控制器注册表、按 run 划分的权限队列与 runtime catalog，以及当前选中项。 |
| [acpSkillRunStatus.ts](acpSkillRunStatus.ts.md) | src/modules/acp/skillRun/acpSkillRunStatus.ts | ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。 |
| [acpSkillRunTaskProjection.ts](acpSkillRunTaskProjection.ts.md) | src/modules/acp/skillRun/acpSkillRunTaskProjection.ts | 把 ACP Skill run 摘要投影为统一的工作流任务行，使 skill run 能与普通工作流任务在同一 Dashboard/队列中呈现。 |
| [acpSkillRunTranscriptMirror.ts](acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [acpSkillRunTranscriptStore.ts](acpSkillRunTranscriptStore.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts | ACP Skill Run transcript 的磁盘存储层：把 transcript 事件追加写入 NDJSON 日志、维护可增量重建的索引，并按页读取历史条目。 |
| [acpSkillRunWorkspaceDataPlane.ts](acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
| [acpSkillRunWorkspaceSelection.ts](acpSkillRunWorkspaceSelection.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |
| [acpSkillsWorkspaceSurface.ts](acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [assistantWorkspaceActionRouter.ts](../../assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublicationHost.ts](../../assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceSidebar.ts](../../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardActiveTasks.ts](../../dashboardActiveTasks.ts.md) | src/modules/dashboardActiveTasks.ts | Dashboard 活跃任务投影：按可见 scope 过滤 ACP skill run 与工作流任务，产出需要人工关注的任务计数。 |
| [dashboardRuntime.ts](../../dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [dashboardSnapshot.ts](../../dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeWorkflowControl.ts](../../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [runSeam.ts](../../workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [sequenceRuntime.ts](../../workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [terminalResolution.ts](../../workflowExecution/terminalResolution.ts.md) | src/modules/workflowExecution/terminalResolution.ts | 工作流作业终态解析：把 ACP SkillRun、SkillRunner run store 与序列状态三个来源的观测归一到统一的作业槽位状态和终态结论。 |
| [workspaceTab.ts](../../workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| appendAcpSkillRunUserReply | 函数 | 1572–1618 | 追加用户回复到指定 run，清理等待交互标记并把回复并入下一轮 prompt 上下文。 |
| cancelAcpSkillRunPermissionQueue | 函数 | 1958–2017 | 取消某条 run 的全部 pending 权限请求，避免取消后仍弹出审批对话框。 |
| clearAcpSkillRunsForRuntimePersistence | 函数 | 2078–2085 | 在运行时持久化重建前释放内存中的 run 记录，避免与状态库水合产生双份真相。 |
| clearWaitingUserDetachTimer | 函数 | 823–829 | 清除等待用户态的自动脱离定时器，防止延迟回调改变已推进的 run。 |
| deleteAcpSkillRunRecords | 函数 | 2019–2033 | 按 requestId 集合删除 run 记录及其 transcript、payload 与任务投影。 |
| getAcpSkillRunRecord | 函数 | 2035–2043 | 按 requestId 读取 run 记录，缺失时返回 undefined 而不抛错。 |
| projectAcpSkillRunOutputEnvelopeToTranscript | 函数 | 1862–1927 | 把输出信封（结构化产物 + 校验结果）投影为 transcript 中的可读条目。 |
| recordAcpSkillRunOutputRevision | 函数 | 1818–1860 | 记录一次 run 输出修订：校验状态、落盘修订历史并把修订内容投影到 transcript。 |
| resetAcpSkillRunsForTests | 函数 | 2059–2076 | 重置 run 记录、控制器与诊断计数，使每个测试用例从干净状态开始。 |
| runtimeCatalogForRun | 函数 | 1945–1956 | 取出指定 run 的 runtime catalog 快照，供 prompt 组装与 UI 展示复用。 |
| setAcpSkillRunRecoveryHandler | 函数 | 1935–1939 | 注入 run 恢复处理器，store 只依赖该回调而不直接耦合恢复实现。 |
| setAcpSkillRunRecoveryHandlerForTests | 函数 | 1929–1933 | 为测试替换 run 恢复处理器，使恢复路径可以被独立驱动验证。 |
| syncWaitingUserDetachTimer | 函数 | 831–863 | 按等待用户态与超时配置同步脱离定时器，使超时后 UI 能从运行态退回等待态。 |
| [upsertAcpSkillRun](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunStore.ts/upsertAcpSkillRun.md) | 函数 | 1177–1570 | 写入或更新一条 run 记录：校验状态迁移、刷新 transcript 条目、更新权限与回复状态并触发持久化。 |
