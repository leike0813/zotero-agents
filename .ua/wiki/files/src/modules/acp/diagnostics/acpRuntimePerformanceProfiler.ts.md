
# src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts -->

ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。
源码：[src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts)

## 符号（16）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:enableAcpRuntimePerformanceProfiler -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:finishAcpRuntimeProfile -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:getOrCreateSeries -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:incrementAcpRuntimeMetric -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:metricSnapshot -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:normalizeLabels -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:observeAcpRuntimeDuration -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:observeAcpRuntimeGauge -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:profileSnapshot -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:readAcpRuntimePerformanceClockMs -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:recordAcpRuntimePublicationAck -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:recordPublicationLifecycle -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:registerAcpRuntimeProfileAlias -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:scheduleDriftProbe -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:snapshotAcpRuntimeProfiles -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:startAcpRuntimeProfile -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| enableAcpRuntimePerformanceProfiler | 函数 | 638–647 | 简单 | profiler、lifecycle、acp、enable | 0 | 启用 profiler 并挂载漂移探针计时器。 |
| finishAcpRuntimeProfile | 函数 | 699–725 | 简单 | profiler、profile、lifecycle、finalize | 0 | 结束性能采集窗口并固化该窗口内的指标与时长统计。 |
| getOrCreateSeries | 函数 | 486–513 | 简单 | profiler、metrics、bounded-buffer、series | 0 | 按 profile + 指标名获取有界指标序列，必要时创建并裁剪旧样本。 |
| incrementAcpRuntimeMetric | 函数 | 727–750 | 简单 | metrics、counter、profiler、acp | 1 | 递增一条计数型指标，按归一化标签分桶。 |
| metricSnapshot | 函数 | 801–824 | 简单 | snapshot、metrics、profiler、serialization | 0 | 把单条指标序列转换为可序列化快照，包含计数、均值与分位数。 |
| normalizeLabels | 函数 | 386–411 | 简单 | labels、normalization、profiler、metrics | 0 | 归一化指标标签，剔除未纳入白名单的高基数字段。 |
| observeAcpRuntimeDuration | 函数 | 752–778 | 简单 | metrics、duration、profiler、observation | 1 | 观察一段耗时并归入当前 profile 的时长分布。 |
| observeAcpRuntimeGauge | 函数 | 780–799 | 简单 | metrics、gauge、profiler、observation | 0 | 记录瞬时 gauge 值（如队列深度、连接数）。 |
| profileSnapshot | 函数 | 826–866 | 简单 | snapshot、profiler、serialization、acp | 0 | 把单个 profile 的内部状态转换为可序列化快照。 |
| [readAcpRuntimePerformanceClockMs](../../../../../symbols/src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts/readAcpRuntimePerformanceClockMs.md) | 函数 | 318–327 | 简单 | timer、clock、profiler、utility | 2 | 读取单调递增的高精度时钟，供所有耗时测量统一取时。 |
| recordAcpRuntimePublicationAck | 函数 | 515–593 | 中等 | publication、ack、profiler、latency、acp | 1 | 在宿主回执到达时记录 publication ack 时刻与排队时延，是漂移分析的主要数据来源。 |
| recordPublicationLifecycle | 函数 | 413–463 | 中等 | publication、profiler、lifecycle、metrics | 0 | 记录一次 publication 从调度到 ack 的完整生命周期阶段。 |
| registerAcpRuntimeProfileAlias | 函数 | 677–697 | 简单 | profiler、profile、alias、acp | 0 | 为 profile 注册别名，让不同调用方用统一短名指向同一采集窗口。 |
| scheduleDriftProbe | 函数 | 606–627 | 简单 | profiler、scheduling、drift、diagnostics | 0 | 按退避策略安排漂移探针，周期性检查 publication 时延是否偏离基线。 |
| snapshotAcpRuntimeProfiles | 函数 | 879–903 | 简单 | snapshot、profiler、diagnostics、export | 0 | 导出全部 profile 的深冻结快照，供诊断面板与基线录制共用。 |
| startAcpRuntimeProfile | 函数 | 659–675 | 简单 | profiler、profile、lifecycle、acp | 0 | 开启一次带名的性能采集窗口。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWireContract.ts](../../../shared/assistantWireContract.ts.md) | src/shared/assistantWireContract.ts | Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [zoteroRuntimeVersion.ts](../../../shared/zoteroRuntimeVersion.ts.md) | src/shared/zoteroRuntimeVersion.ts | 把 Zotero 版本号解析为受支持的主版本（7 / 9 / 10），用于兼容性分支与诊断输出。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpClientConnection.ts](../transport/acpClientConnection.ts.md) | src/modules/acp/transport/acpClientConnection.ts | ACP 客户端连接：基于 NDJSON 传输实现 JSON-RPC 请求/响应/通知的收发、请求 ID 配对、写入排队与关闭语义。 |
| [acpConnectionAdapter.ts](../transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpRuntimePerformanceBaseline.ts](acpRuntimePerformanceBaseline.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts | ACP 运行时性能基线治理：脱敏采集元数据与环境信息、汇总 profiler 快照并构造可冻结的基线记录。 |
| [acpRuntimeReplayProductionPorts.ts](acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpRuntimeReplayProfiler.ts](acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [acpSkillRunnerOrchestrator.ts](../skillRun/acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunPersistence.ts](../skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunRecovery.ts](../skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillRunStore.ts](../skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceDataPlane.ts](../skillRun/acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
| [acpTransport.ts](../transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [assistantWorkspacePublicationCoordinator.ts](../../assistant/publication/assistantWorkspacePublicationCoordinator.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts | 发布协调器：把 runtime 产出的发布请求按 owner 排队、去重与节流，并跟踪 ack 生命周期与 lane 占用。 |
| [assistantWorkspacePublicationHost.ts](../../assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspacePublicationRuntime.ts](../../assistant/publication/assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [assistantWorkspaceSidebar.ts](../../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [bufferedWriteCoordinator.ts](../../bufferedWriteCoordinator.ts.md) | src/modules/bufferedWriteCoordinator.ts | 带缓冲的写入协调器：按 key 合并短时间内的重复写入、施加字节与条数上限并支持显式 flush/discard，避免高频 IO 打爆文件系统。 |
| [hostBridgeServer.ts](../../hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [runTables.ts](../../pluginStateStore/runTables.ts.md) | src/modules/pluginStateStore/runTables.ts | 工作流运行记录表：保存 run 的状态、阶段与诊断信息，并在 debug 模式或性能 profiler 打开时附加审计字段。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| enableAcpRuntimePerformanceProfiler | 函数 | 638–647 | 启用 profiler 并挂载漂移探针计时器。 |
| finishAcpRuntimeProfile | 函数 | 699–725 | 结束性能采集窗口并固化该窗口内的指标与时长统计。 |
| incrementAcpRuntimeMetric | 函数 | 727–750 | 递增一条计数型指标，按归一化标签分桶。 |
| observeAcpRuntimeDuration | 函数 | 752–778 | 观察一段耗时并归入当前 profile 的时长分布。 |
| observeAcpRuntimeGauge | 函数 | 780–799 | 记录瞬时 gauge 值（如队列深度、连接数）。 |
| [readAcpRuntimePerformanceClockMs](../../../../../symbols/src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts/readAcpRuntimePerformanceClockMs.md) | 函数 | 318–327 | 读取单调递增的高精度时钟，供所有耗时测量统一取时。 |
| recordAcpRuntimePublicationAck | 函数 | 515–593 | 在宿主回执到达时记录 publication ack 时刻与排队时延，是漂移分析的主要数据来源。 |
| registerAcpRuntimeProfileAlias | 函数 | 677–697 | 为 profile 注册别名，让不同调用方用统一短名指向同一采集窗口。 |
| snapshotAcpRuntimeProfiles | 函数 | 879–903 | 导出全部 profile 的深冻结快照，供诊断面板与基线录制共用。 |
| startAcpRuntimeProfile | 函数 | 659–675 | 开启一次带名的性能采集窗口。 |
