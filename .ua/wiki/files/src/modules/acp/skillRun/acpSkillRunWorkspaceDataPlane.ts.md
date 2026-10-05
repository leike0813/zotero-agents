
# src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts -->

ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。
源码：[src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts)

## 符号（19）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:acpSkillRunWorkspaceChange -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:acpSkillRunWorkspaceChangePartitionKey -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:countActiveAcpSkillRunSummaries -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:createAcpSkillRunWorkspaceChange -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:emitWorkspaceChanged -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:enqueuePendingAcpSkillRunWorkspaceChange -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:getAcpSkillRunDiagnostics -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:getAcpSkillRunTranscriptMirrorDiagnosticsForTests -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:getAcpSkillRunWorkspaceDetailsReadModel -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:getAcpSkillRunWorkspaceReadModel -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:inspectAcpSkillRunTimers -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:listAcpSkillRuns -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:listAcpSkillRunSummaries -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:mergeAcpSkillRunWorkspaceChanges -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:resetAcpSkillRunSummaryDiagnosticsForTests -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:resetAcpSkillRunWorkspaceDataPlaneForTests -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:scheduleWorkspaceChangedEmit -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:subscribeAcpSkillRunWorkspaceChanges -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts:summarizeAcpSkillRun -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acpSkillRunWorkspaceChange | 函数 | 199–229 | 简单 | acp、数据面、cache | 0 | 发布一条工作区变更，立即或经合并后通知所有订阅方。 |
| acpSkillRunWorkspaceChangePartitionKey | 函数 | 158–169 | 简单 | acp、数据面、cache | 0 | 计算变更的分区键，使同一 run 的变更进入同一合并通道。 |
| countActiveAcpSkillRunSummaries | 函数 | 482–516 | 简单 | acp、数据面、cache | 0 | 统计活跃 run 摘要数量，供 Dashboard 与导航徽标使用。 |
| createAcpSkillRunWorkspaceChange | 函数 | 56–113 | 中等 | acp、数据面、factory | 0 | 构造一条工作区变更记录，标注受影响区域与触发原因，供订阅方按需响应。 |
| emitWorkspaceChanged | 函数 | 231–263 | 简单 | acp、数据面、event-handler | 0 | 把待发变更合并后真正派发给订阅方，并附带发布耗时诊断。 |
| enqueuePendingAcpSkillRunWorkspaceChange | 函数 | 175–186 | 简单 | acp、数据面、serialization | 0 | 把变更入队等待合并发射，同时限制待发队列长度。 |
| getAcpSkillRunDiagnostics | 函数 | 680–701 | 简单 | acp、数据面、query | 0 | 导出数据面整体诊断信息（计数、缓存、定时器），供 debug 模式与 Dashboard 展示。 |
| getAcpSkillRunTranscriptMirrorDiagnosticsForTests | 函数 | 529–559 | 简单 | acp、数据面、test | 0 | 读取 transcript 镜像的诊断数据（缓存命中、水合状态、淘汰次数）。 |
| getAcpSkillRunWorkspaceDetailsReadModel | 函数 | 622–678 | 中等 | acp、数据面、query | 0 | 组装选中 run 的详情读取模型：transcript 区域、runtime catalog 与权限状态。 |
| getAcpSkillRunWorkspaceReadModel | 函数 | 561–620 | 中等 | acp、数据面、query | 0 | 组装 ACP Skills 工作区的顶层读取模型：run 摘要列表、选中项与面板状态。 |
| inspectAcpSkillRunTimers | 函数 | 316–393 | 中等 | acp、数据面、cache | 0 | 导出数据面与镜像相关的在途定时器快照，供诊断与泄漏排查使用。 |
| listAcpSkillRuns | 函数 | 414–425 | 简单 | acp、数据面、query | 0 | 列出全部 run 记录，按最近活跃时间排序供工作区渲染。 |
| listAcpSkillRunSummaries | 函数 | 427–480 | 中等 | acp、数据面、query | 0 | 列出 run 摘要（状态、预览、计数），避免为列表加载完整 transcript。 |
| mergeAcpSkillRunWorkspaceChanges | 函数 | 115–156 | 简单 | acp、数据面、state-management | 0 | 合并同一分区内连续变更，保留最新内容与受影响区域集合。 |
| resetAcpSkillRunSummaryDiagnosticsForTests | 函数 | 522–527 | 简单 | acp、数据面、test | 0 | 重置摘要投影的诊断计数，用于测试断言是否发生了重复投影。 |
| resetAcpSkillRunWorkspaceDataPlaneForTests | 函数 | 307–314 | 简单 | acp、数据面、test | 0 | 重置合并队列、订阅者与诊断计数，使测试从确定性状态开始。 |
| scheduleWorkspaceChangedEmit | 函数 | 265–296 | 简单 | acp、数据面、utility | 0 | 调度一次延迟发射，把短时间内的多次变更压成一次通知。 |
| subscribeAcpSkillRunWorkspaceChanges | 函数 | 298–305 | 简单 | acp、数据面、event-handler | 0 | 订阅工作区变更，返回取消订阅函数以便组件卸载时释放。 |
| summarizeAcpSkillRun | 函数 | 703–759 | 中等 | acp、数据面、cache | 0 | 把完整 run 记录压缩为摘要投影，仅保留列表与计数所需的字段。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePerformanceProfiler.ts](../diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpRuntimeReplayLogicalTime.ts](../diagnostics/acpRuntimeReplayLogicalTime.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts | 回放的逻辑时间源：把原生 setTimeout 包装为可检查、可取消、可按剩余时间恢复的逻辑定时器，使回放不再依赖真实墙钟等待。 |
| [acpSkillRunHosts.ts](acpSkillRunHosts.ts.md) | src/modules/acp/skillRun/acpSkillRunHosts.ts | skill run store 三个协作者模块（持久化、transcript 镜像、workspace 数据面）的宿主槽位契约：只含类型定义与 configure/get 访问器，刻意不产生运行时 import。 |
| [acpSkillRunPayloadStore.ts](acpSkillRunPayloadStore.ts.md) | src/modules/acp/skillRun/acpSkillRunPayloadStore.ts | skill run 的载荷持久化：读写 run context 载荷并维护 output revision 追加日志，为产物投影与恢复提供磁盘事实源。 |
| [acpSkillRunPersistence.ts](acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTranscriptMirror.ts](acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayProductionPorts.ts](../diagnostics/acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpSkillRunRuntimeCatalog.ts](acpSkillRunRuntimeCatalog.ts.md) | src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts | ACP Skill Run 运行时目录（runtime catalog）的读写门面：保存 Agent 上报的可用模式/模型目录，并应用用户的运行时选择。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceSelection.ts](acpSkillRunWorkspaceSelection.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| acpSkillRunWorkspaceChange | 函数 | 199–229 | 发布一条工作区变更，立即或经合并后通知所有订阅方。 |
| countActiveAcpSkillRunSummaries | 函数 | 482–516 | 统计活跃 run 摘要数量，供 Dashboard 与导航徽标使用。 |
| createAcpSkillRunWorkspaceChange | 函数 | 56–113 | 构造一条工作区变更记录，标注受影响区域与触发原因，供订阅方按需响应。 |
| emitWorkspaceChanged | 函数 | 231–263 | 把待发变更合并后真正派发给订阅方，并附带发布耗时诊断。 |
| getAcpSkillRunDiagnostics | 函数 | 680–701 | 导出数据面整体诊断信息（计数、缓存、定时器），供 debug 模式与 Dashboard 展示。 |
| getAcpSkillRunTranscriptMirrorDiagnosticsForTests | 函数 | 529–559 | 读取 transcript 镜像的诊断数据（缓存命中、水合状态、淘汰次数）。 |
| getAcpSkillRunWorkspaceDetailsReadModel | 函数 | 622–678 | 组装选中 run 的详情读取模型：transcript 区域、runtime catalog 与权限状态。 |
| getAcpSkillRunWorkspaceReadModel | 函数 | 561–620 | 组装 ACP Skills 工作区的顶层读取模型：run 摘要列表、选中项与面板状态。 |
| inspectAcpSkillRunTimers | 函数 | 316–393 | 导出数据面与镜像相关的在途定时器快照，供诊断与泄漏排查使用。 |
| listAcpSkillRuns | 函数 | 414–425 | 列出全部 run 记录，按最近活跃时间排序供工作区渲染。 |
| listAcpSkillRunSummaries | 函数 | 427–480 | 列出 run 摘要（状态、预览、计数），避免为列表加载完整 transcript。 |
| resetAcpSkillRunSummaryDiagnosticsForTests | 函数 | 522–527 | 重置摘要投影的诊断计数，用于测试断言是否发生了重复投影。 |
| resetAcpSkillRunWorkspaceDataPlaneForTests | 函数 | 307–314 | 重置合并队列、订阅者与诊断计数，使测试从确定性状态开始。 |
| scheduleWorkspaceChangedEmit | 函数 | 265–296 | 调度一次延迟发射，把短时间内的多次变更压成一次通知。 |
| subscribeAcpSkillRunWorkspaceChanges | 函数 | 298–305 | 订阅工作区变更，返回取消订阅函数以便组件卸载时释放。 |
