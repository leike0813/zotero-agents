
# src/modules/debugMode.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/debugMode.ts -->

插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。
源码：[src/modules/debugMode.ts](../../../../../src/modules/debugMode.ts)

## 符号（6）
<!-- node: function:src/modules/debugMode.ts:isAcpRuntimePerformanceProfilerAvailable -->
<!-- node: function:src/modules/debugMode.ts:isDebugModeEnabled -->
<!-- node: function:src/modules/debugMode.ts:isSynthesisSidecarDiagnosticsAvailable -->
<!-- node: function:src/modules/debugMode.ts:setDebugModeOverrideForTests -->
<!-- node: function:src/modules/debugMode.ts:setSkillRunnerConnectionAuditSourceOverrideForTests -->
<!-- node: function:src/modules/debugMode.ts:setSynthesisSidecarDiagnosticsSourceOverrideForTests -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| isAcpRuntimePerformanceProfilerAvailable | 函数 | 89–95 | 简单 | feature-flag、diagnostics、acp | 0 | 判断 ACP 运行时性能剖析器是否启用，供运行时指标采集逻辑做条件编译。 |
| [isDebugModeEnabled](../../../symbols/src/modules/debugMode.ts/isDebugModeEnabled.md) | 函数 | 82–87 | 简单 | feature-flag、diagnostics、utility | 4 | 判断插件是否处于调试模式，是大部分诊断日志分支的总开关。 |
| isSynthesisSidecarDiagnosticsAvailable | 函数 | 109–115 | 简单 | feature-flag、diagnostics、sidecar | 0 | 判断 Synthesis sidecar 的诊断通道是否开启，决定是否向 sidecar 请求额外诊断数据。 |
| setDebugModeOverrideForTests | 函数 | 160–168 | 简单 | test、feature-flag、diagnostics | 0 | 在测试中强制设置或清除调试模式总开关。 |
| setSkillRunnerConnectionAuditSourceOverrideForTests | 函数 | 130–141 | 简单 | test、feature-flag、skillrunner | 0 | 在测试中覆盖 SkillRunner 连接审计开关的取值来源。 |
| setSynthesisSidecarDiagnosticsSourceOverrideForTests | 函数 | 117–128 | 简单 | test、feature-flag、diagnostics | 0 | 在测试中覆盖 sidecar 诊断开关的取值来源，绕过真实 pref 依赖。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpChatDiagnosticAuditTrail.ts](acp/diagnostics/acpChatDiagnosticAuditTrail.ts.md) | src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts | ACP Chat 诊断审计轨迹：按 backendId+conversationId 组织 owner，把 warn/error 级诊断证据写入审计文件，并管理 owner 的激活、刷盘与丢弃。 |
| [acpClientConnection.ts](acp/transport/acpClientConnection.ts.md) | src/modules/acp/transport/acpClientConnection.ts | ACP 客户端连接：基于 NDJSON 传输实现 JSON-RPC 请求/响应/通知的收发、请求 ID 配对、写入排队与关闭语义。 |
| [acpConnectionAdapter.ts](acp/transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpDiagnosticRouter.ts](acp/diagnostics/acpDiagnosticRouter.ts.md) | src/modules/acp/diagnostics/acpDiagnosticRouter.ts | 诊断事件路由：把 Chat 与 Skills 两个 surface 的诊断条目投影为证据记录，按级别决定是否写入 runtime log 或转发到调试审计 sink。 |
| [acpRuntimePerformanceProfiler.ts](acp/diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpRuntimeReplayProfiler.ts](acp/diagnostics/acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [acpRuntimeSemanticTraceRecorder.ts](acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts | 语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。 |
| [acpSessionManager.ts](acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunAuditTrail.ts](acp/skillRun/acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpSkillRunnerOrchestrator.ts](acp/skillRun/acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunPersistence.ts](acp/skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunRecovery.ts](acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillRunStore.ts](acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceDataPlane.ts](acp/skillRun/acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
| [acpTransport.ts](acp/transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [assistantWorkspacePublicationCoordinator.ts](assistant/publication/assistantWorkspacePublicationCoordinator.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts | 发布协调器：把 runtime 产出的发布请求按 owner 排队、去重与节流，并跟踪 ack 生命周期与 lane 占用。 |
| [assistantWorkspacePublicationHost.ts](assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceSidebar.ts](assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [bufferedWriteCoordinator.ts](bufferedWriteCoordinator.ts.md) | src/modules/bufferedWriteCoordinator.ts | 带缓冲的写入协调器：按 key 合并短时间内的重复写入、施加字节与条数上限并支持显式 flush/discard，避免高频 IO 打爆文件系统。 |
| [citationGraphCrashJournal.ts](synthesis/debug/citationGraphCrashJournal.ts.md) | src/modules/synthesis/debug/citationGraphCrashJournal.ts | Citation Graph 构建崩溃日志（crash journal）的读写模块：把构建期崩溃的诊断片段以有界 journal 形式落盘，供 System E2E 测试与 debug 模式回溯定位失败根因。 |
| [contentPackageSubscription.ts](workflow/catalog/contentPackageSubscription.ts.md) | src/modules/workflow/catalog/contentPackageSubscription.ts | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
| [dashboardActions.ts](dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardRuntime.ts](dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [dashboardSnapshot.ts](dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [docsUrl.ts](../utils/docsUrl.ts.md) | src/utils/docsUrl.ts | 帮助中心文档链接构造：按用户 locale 选择 GitHub Pages 或本地站点基址，处理 zh-CN 前缀拼接与 debug 模式下的本地回退。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeCapabilityRegistry.ts](hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeServer.ts](hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [loader.ts](../workflows/loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [pluginSkillRegistry.ts](workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [preferenceScript.ts](preferenceScript.ts.md) | src/modules/preferenceScript.ts | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |
| [runSeam.ts](workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [runTables.ts](pluginStateStore/runTables.ts.md) | src/modules/pluginStateStore/runTables.ts | 工作流运行记录表：保存 run 的状态、阶段与诊断信息，并在 debug 模式或性能 profiler 打开时附加审计字段。 |
| [runtime.ts](../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [runtimeLogManager.ts](runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [selectionSample.ts](workflow/ui/selectionSample.ts.md) | src/modules/workflow/ui/selectionSample.ts | 调试用选区采样工具：在 Zotero 菜单中注册「采样当前选区」入口，读取 Zotero SelectionContext 后写入临时文件，供工作流输入物化问题排查。 |
| [sequenceRuntime.ts](workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [skillRunnerConnectionGovernor.ts](skillRunner/connection/skillRunnerConnectionGovernor.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts | SkillRunner 出站连接的唯一治理点：把提交、前台流、前台查询、结算、对账等连接请求分配到不同泳道并排队调度，施加并发上限、前台流池与物理连接债务记账，统一处理超时、abort 与迟到结算。 |
| [skillRunnerLocalDeployDebugStore.ts](skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts | 本地运行时部署调试日志的内存存储：只在调试模式开启时记录部署各阶段的结构化条目，供调试对话框查看与复制。 |
| [skillRunnerLocalRuntimePreferences.ts](preferences/skillRunnerLocalRuntimePreferences.ts.md) | src/modules/preferences/skillRunnerLocalRuntimePreferences.ts | SkillRunner 本地运行时相关的偏好面板绑定，负责安装目录、版本、自动拉取与自动拉起等设置的读写与即时生效。 |
| [synthesisSidecarRuntimeSupervisor.ts](synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |
| [synthesisSidecarTrace.ts](synthesis/sidecar/synthesisSidecarTrace.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTrace.ts | sidecar trace 通道：维护按 trace 聚合的有界事件缓冲，按 patch 间隔批量发布订阅者通知，并把观测事件投影为 Dashboard 使用的 wire 快照。 |
| [testRuntimeCleanup.ts](testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workflowDebugProbe.ts](workflow/ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowPackageDiagnostics.ts](workflow/catalog/workflowPackageDiagnostics.ts.md) | src/modules/workflow/catalog/workflowPackageDiagnostics.ts | 工作流包诊断通道：在 debug 模式或诊断详细级别下，把工作流运行时可用能力摘要与 hook 诊断信息写入 runtimeLog，并按诊断级别选择 console 通道输出。 |
| [workflowVisibility.ts](workflow/catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |
| [zotero-plugin.config.ts](../../zotero-plugin.config.ts.md) | zotero-plugin.config.ts | zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isAcpRuntimePerformanceProfilerAvailable | 函数 | 89–95 | 判断 ACP 运行时性能剖析器是否启用，供运行时指标采集逻辑做条件编译。 |
| [isDebugModeEnabled](../../../symbols/src/modules/debugMode.ts/isDebugModeEnabled.md) | 函数 | 82–87 | 判断插件是否处于调试模式，是大部分诊断日志分支的总开关。 |
| isSynthesisSidecarDiagnosticsAvailable | 函数 | 109–115 | 判断 Synthesis sidecar 的诊断通道是否开启，决定是否向 sidecar 请求额外诊断数据。 |
| setDebugModeOverrideForTests | 函数 | 160–168 | 在测试中强制设置或清除调试模式总开关。 |
| setSkillRunnerConnectionAuditSourceOverrideForTests | 函数 | 130–141 | 在测试中覆盖 SkillRunner 连接审计开关的取值来源。 |
| setSynthesisSidecarDiagnosticsSourceOverrideForTests | 函数 | 117–128 | 在测试中覆盖 sidecar 诊断开关的取值来源，绕过真实 pref 依赖。 |
