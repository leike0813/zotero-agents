
# src/modules/acp/skillRun/acpSkillRunPersistence.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunPersistence.ts -->

ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。
源码：[src/modules/acp/skillRun/acpSkillRunPersistence.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunPersistence.ts)

## 符号（33）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:buildPersistedAcpSkillRunPayload -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:cleanupExpiredAcpSkillRunsForRetention -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:cloneRuntimeCatalog -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:deriveAcpSkillRunRuntimeFileMetadata -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:ensureAcpSkillRunStoreHydrated -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:flushAcpSkillRunRuntimeFileWrites -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:hasLargeAcpSkillRunPayload -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:inspectAcpSkillRunSoftPersistReplayTimers -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:isAcpSkillRunRetentionEligible -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:isAcpSkillRunWorkflowTask -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:migrateLegacyAcpSkillRunStatus -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:normalizeConversationState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:normalizeOptionalNonNegativeInteger -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:normalizeRecoveryState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:normalizeReplyState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:normalizeSelectableOption -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:normalizeSelectableOptions -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:normalizeStatus -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:parseAuditTrailState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:parseHostBridgeCliState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:parsePendingInteraction -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:parseRunRecord -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:persistAcpSkillRunRuntimeFiles -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:persistRun -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:reconcileAcpSkillRunWorkflowTasksOnStartup -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:resetAcpSkillRunPersistenceForTests -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:sanitizeAcpSkillRunPersistedValue -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:scheduleSoftRunPersist -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:shouldExternalizeRunContext -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:shouldMigrateLegacyFailedRunToRetriable -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:trackAcpSkillRunRuntimeFileWrite -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:truncateAcpSkillRunPreview -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPersistence.ts:updateTouchesAcpSkillRunContext -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildPersistedAcpSkillRunPayload | 函数 | 830–865 | 简单 | acp、持久化、factory | 0 | 构建落盘用的 run payload，按是否外置 context 决定内联字段或文件引用。 |
| cleanupExpiredAcpSkillRunsForRetention | 函数 | 1229–1292 | 中等 | acp、持久化、cache | 0 | 按保留期清理过期 run 记录，同步删除其 transcript、payload 与任务投影。 |
| cloneRuntimeCatalog | 函数 | 258–270 | 简单 | acp、持久化、utility | 0 | 深拷贝 runtime catalog，避免持久化过程中与运行时会话目录共享引用。 |
| deriveAcpSkillRunRuntimeFileMetadata | 函数 | 141–175 | 简单 | acp、持久化、factory | 0 | 根据 payload 体积与内容推导运行时文件元数据，决定是否外置 context 以及文件名与大小信息。 |
| ensureAcpSkillRunStoreHydrated | 函数 | 689–734 | 简单 | acp、持久化、cache | 1 | 确保插件状态库中的 run 记录已载入内存，重复调用直接复用已完成的水合结果。 |
| flushAcpSkillRunRuntimeFileWrites | 函数 | 817–824 | 简单 | acp、持久化、serialization | 0 | 强制刷出所有待写的 runtime 文件，保证持久化在读取前完成。 |
| hasLargeAcpSkillRunPayload | 函数 | 177–186 | 简单 | acp、持久化、validation | 0 | 判断 run 的 payload 是否超过外置阈值，用于选择内联或文件化存储。 |
| inspectAcpSkillRunSoftPersistReplayTimers | 函数 | 972–1038 | 中等 | acp、持久化、cache | 0 | 导出软持久化定时器的诊断快照，供 Dashboard 与测试观察合并行为。 |
| isAcpSkillRunRetentionEligible | 函数 | 1047–1060 | 简单 | acp、持久化、validation | 0 | 判定一条 run 是否达到保留期清理条件（终态、已归档且超过保留窗口）。 |
| isAcpSkillRunWorkflowTask | 函数 | 1066–1075 | 简单 | acp、持久化、validation | 0 | 判定一条 run 是否对应可投影为工作流任务的记录，避免污染普通对话任务列表。 |
| migrateLegacyAcpSkillRunStatus | 函数 | 447–474 | 简单 | acp、持久化、cache | 0 | 把旧版状态词汇迁移到当前状态机，未知状态按可恢复性分类落到安全默认值。 |
| normalizeConversationState | 函数 | 289–303 | 简单 | acp、持久化、validation | 0 | 规整会话连接状态（已连接、已断开、模式等），剔除与当前 run 不一致的残留字段。 |
| normalizeOptionalNonNegativeInteger | 函数 | 223–232 | 简单 | acp、持久化、validation | 0 | 把任意输入规整为可选的非负整数，非法或缺失时返回 undefined。 |
| normalizeRecoveryState | 函数 | 305–317 | 简单 | acp、持久化、validation | 0 | 规整恢复状态字段，保证恢复流程读到的布尔与标识符形状稳定。 |
| normalizeReplyState | 函数 | 319–329 | 简单 | acp、持久化、validation | 0 | 规整用户回复状态，清除已终结 run 上残留的待回复标记。 |
| normalizeSelectableOption | 函数 | 234–246 | 简单 | acp、持久化、validation | 0 | 规整单个可选模式项（值、显示名、是否选中）并过滤掉缺少标识的项。 |
| normalizeSelectableOptions | 函数 | 248–252 | 简单 | acp、持久化、validation | 0 | 规整可选模式项列表，去重并保持原有顺序，供 UI 复用。 |
| normalizeStatus | 函数 | 272–287 | 简单 | acp、持久化、validation | 0 | 把任意状态字符串规整到已知状态集合，非法值统一收敛为默认值。 |
| parseAuditTrailState | 函数 | 389–407 | 简单 | acp、持久化、validation | 0 | 解析审计轨迹状态字段，还原 run 的审计文件与更新摘要元数据。 |
| parseHostBridgeCliState | 函数 | 369–387 | 简单 | acp、持久化、validation | 0 | 解析 Host Bridge CLI 准备状态，恢复运行时所需的路径与执行模式信息。 |
| parsePendingInteraction | 函数 | 341–360 | 简单 | acp、持久化、validation | 0 | 解析持久化记录中的 pending 交互（权限、计划、用户输入），逐项做形状校验。 |
| parseRunRecord | 函数 | 476–683 | 复杂 | acp、持久化、validation | 0 | 把持久化的 JSON 记录解析为完整 run 对象，逐字段校验、规整并执行旧状态迁移。 |
| persistAcpSkillRunRuntimeFiles | 函数 | 761–811 | 中等 | acp、持久化、serialization | 0 | 合并同一批 runtime 文件写入，按事务式托管路径执行写盘并处理失败降级。 |
| persistRun | 函数 | 867–940 | 中等 | acp、持久化、serialization | 1 | 把单条 run 记录写入插件状态库，必要时同步刷新 context 与 output revision 文件。 |
| reconcileAcpSkillRunWorkflowTasksOnStartup | 函数 | 1085–1227 | 中等 | acp、持久化、cache | 0 | 启动时用持久化 run 记录重建工作流任务投影，修正中断留下的状态漂移。 |
| resetAcpSkillRunPersistenceForTests | 函数 | 740–750 | 简单 | acp、持久化、test | 0 | 重置水合标记与写入队列，使测试可以在干净的持久化状态下运行。 |
| sanitizeAcpSkillRunPersistedValue | 函数 | 102–139 | 简单 | acp、持久化、validation | 0 | 清洗待持久化值，剔除不可序列化的字段与超长内容，避免污染状态库。 |
| scheduleSoftRunPersist | 函数 | 946–962 | 简单 | acp、持久化、utility | 0 | 登记一次软持久化更新，用可重放的定时器把高频状态变更合并成一次写盘。 |
| shouldExternalizeRunContext | 函数 | 188–197 | 简单 | acp、持久化、validation | 0 | 综合 run 体积与宿主文件系统能力，决定该 run 的 context 是否应外置到独立文件。 |
| shouldMigrateLegacyFailedRunToRetriable | 函数 | 419–445 | 简单 | acp、持久化、validation | 0 | 判定旧版失败状态是否应迁移为可重试状态，避免历史记录被误判为终态。 |
| trackAcpSkillRunRuntimeFileWrite | 函数 | 754–759 | 简单 | acp、持久化、cache | 0 | 登记一次运行时文件写入，供合并刷盘与诊断统计使用。 |
| truncateAcpSkillRunPreview | 函数 | 92–100 | 简单 | acp、持久化、validation | 0 | 按字符预算截断 run 预览文本，并补上省略标记以保持预览长度可控。 |
| updateTouchesAcpSkillRunContext | 函数 | 215–221 | 简单 | acp、持久化、state-management | 0 | 标记一次写入是否触及 run context 语义，使外置判定在增量更新后仍然成立。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpExecutionProgress.ts](../transport/acpExecutionProgress.ts.md) | src/modules/acp/transport/acpExecutionProgress.ts | ACP 执行进度累计器：按会话统计执行阶段与消息计数，供 UI 显示「正在执行/已完成」进度并在恢复时还原。 |
| [acpModelOptionFolding.ts](../chat/acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [acpPermissionOptions.ts](../transport/acpPermissionOptions.ts.md) | src/modules/acp/transport/acpPermissionOptions.ts | ACP 权限选项语义：定义允许/拒绝等选项种类，并解析「自动批准」应对应哪个选项 ID。 |
| [acpRuntimePerformanceProfiler.ts](../diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpRuntimeReplayLogicalTime.ts](../diagnostics/acpRuntimeReplayLogicalTime.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts | 回放的逻辑时间源：把原生 setTimeout 包装为可检查、可取消、可按剩余时间恢复的逻辑定时器，使回放不再依赖真实墙钟等待。 |
| [acpSkillRunAuditTrail.ts](acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpSkillRunHosts.ts](acpSkillRunHosts.ts.md) | src/modules/acp/skillRun/acpSkillRunHosts.ts | skill run store 三个协作者模块（持久化、transcript 镜像、workspace 数据面）的宿主槽位契约：只含类型定义与 configure/get 访问器，刻意不产生运行时 import。 |
| [acpSkillRunPayloadStore.ts](acpSkillRunPayloadStore.ts.md) | src/modules/acp/skillRun/acpSkillRunPayloadStore.ts | skill run 的载荷持久化：读写 run context 载荷并维护 output revision 追加日志，为产物投影与恢复提供磁盘事实源。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTranscriptMirror.ts](acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [acpSkillRunTranscriptStore.ts](acpSkillRunTranscriptStore.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts | ACP Skill Run transcript 的磁盘存储层：把 transcript 事件追加写入 NDJSON 日志、维护可增量重建的索引，并按页读取历史条目。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantMessageCounts.ts](../../assistant/publication/assistantMessageCounts.ts.md) | src/modules/assistant/publication/assistantMessageCounts.ts | Assistant 消息计数工具：创建、规整与克隆消息计数三元组，并提供执行开始/结束与逐条自增的计数维护入口。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [pluginStateStore.ts](../../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunActions.ts](acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunPermissionQueue.ts](acpSkillRunPermissionQueue.ts.md) | src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts | ACP Skill Run 的权限审批队列：把 Agent 发起的 permission 请求登记为 pending 交互，支持自动批准、过期清理与用户决议回写。 |
| [acpSkillRunRuntimeCatalog.ts](acpSkillRunRuntimeCatalog.ts.md) | src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts | ACP Skill Run 运行时目录（runtime catalog）的读写门面：保存 Agent 上报的可用模式/模型目录，并应用用户的运行时选择。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceDataPlane.ts](acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| cleanupExpiredAcpSkillRunsForRetention | 函数 | 1229–1292 | 按保留期清理过期 run 记录，同步删除其 transcript、payload 与任务投影。 |
| cloneRuntimeCatalog | 函数 | 258–270 | 深拷贝 runtime catalog，避免持久化过程中与运行时会话目录共享引用。 |
| deriveAcpSkillRunRuntimeFileMetadata | 函数 | 141–175 | 根据 payload 体积与内容推导运行时文件元数据，决定是否外置 context 以及文件名与大小信息。 |
| ensureAcpSkillRunStoreHydrated | 函数 | 689–734 | 确保插件状态库中的 run 记录已载入内存，重复调用直接复用已完成的水合结果。 |
| flushAcpSkillRunRuntimeFileWrites | 函数 | 817–824 | 强制刷出所有待写的 runtime 文件，保证持久化在读取前完成。 |
| inspectAcpSkillRunSoftPersistReplayTimers | 函数 | 972–1038 | 导出软持久化定时器的诊断快照，供 Dashboard 与测试观察合并行为。 |
| normalizeOptionalNonNegativeInteger | 函数 | 223–232 | 把任意输入规整为可选的非负整数，非法或缺失时返回 undefined。 |
| normalizeSelectableOptions | 函数 | 248–252 | 规整可选模式项列表，去重并保持原有顺序，供 UI 复用。 |
| normalizeStatus | 函数 | 272–287 | 把任意状态字符串规整到已知状态集合，非法值统一收敛为默认值。 |
| parsePendingInteraction | 函数 | 341–360 | 解析持久化记录中的 pending 交互（权限、计划、用户输入），逐项做形状校验。 |
| parseRunRecord | 函数 | 476–683 | 把持久化的 JSON 记录解析为完整 run 对象，逐字段校验、规整并执行旧状态迁移。 |
| persistRun | 函数 | 867–940 | 把单条 run 记录写入插件状态库，必要时同步刷新 context 与 output revision 文件。 |
| reconcileAcpSkillRunWorkflowTasksOnStartup | 函数 | 1085–1227 | 启动时用持久化 run 记录重建工作流任务投影，修正中断留下的状态漂移。 |
| resetAcpSkillRunPersistenceForTests | 函数 | 740–750 | 重置水合标记与写入队列，使测试可以在干净的持久化状态下运行。 |
| scheduleSoftRunPersist | 函数 | 946–962 | 登记一次软持久化更新，用可重放的定时器把高频状态变更合并成一次写盘。 |
| trackAcpSkillRunRuntimeFileWrite | 函数 | 754–759 | 登记一次运行时文件写入，供合并刷盘与诊断统计使用。 |
| truncateAcpSkillRunPreview | 函数 | 92–100 | 按字符预算截断 run 预览文本，并补上省略标记以保持预览长度可控。 |
| updateTouchesAcpSkillRunContext | 函数 | 215–221 | 标记一次写入是否触及 run context 语义，使外置判定在增量更新后仍然成立。 |
