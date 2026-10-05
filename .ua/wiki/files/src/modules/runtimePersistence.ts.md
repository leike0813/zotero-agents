
# src/modules/runtimePersistence.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/runtimePersistence.ts -->

跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。
源码：[src/modules/runtimePersistence.ts](../../../../../src/modules/runtimePersistence.ts)

## 符号（11）
<!-- node: function:src/modules/runtimePersistence.ts:copyRuntimeTree -->
<!-- node: function:src/modules/runtimePersistence.ts:ensureRuntimeDirectoryInternal -->
<!-- node: function:src/modules/runtimePersistence.ts:getRuntimePersistencePaths -->
<!-- node: class:src/modules/runtimePersistence.ts:ManagedPathPolicyError -->
<!-- node: function:src/modules/runtimePersistence.ts:removeRuntimePath -->
<!-- node: function:src/modules/runtimePersistence.ts:replaceRuntimeTextFileAtomically -->
<!-- node: function:src/modules/runtimePersistence.ts:scanRuntimeTree -->
<!-- node: function:src/modules/runtimePersistence.ts:scanRuntimeUtf8Lines -->
<!-- node: function:src/modules/runtimePersistence.ts:statRuntimePathInternal -->
<!-- node: function:src/modules/runtimePersistence.ts:validateManagedRelativePath -->
<!-- node: function:src/modules/runtimePersistence.ts:writeRuntimeBytes -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| copyRuntimeTree | 函数 | 1946–2005 | 复杂 | persistence、file-io、concurrency、materializer | 0 | 复制受管目录树，串行化到独占 copy slot 避免并发物化互相覆盖。 |
| ensureRuntimeDirectoryInternal | 函数 | 740–809 | 复杂 | persistence、file-io、cross-runtime、bootstrap | 0 | 按平台选择 IOUtils 或 Node fs 创建目录，聚合失败原因并支持严格模式抛错。 |
| getRuntimePersistencePaths | 函数 | 610–642 | 中等 | persistence、path-resolution、facade、runtime | 0 | 汇总运行时全部关键落盘路径（数据根、数据库、sidecar、ACP 缓存等），是路径解析的唯一入口。 |
| ManagedPathPolicyError | 类 | 106–117 | 简单 | error-handling、security、path-policy、type-definition | 0 | 受管路径策略违规时抛出的错误类型，区分逃逸路径、绝对路径与未注册根目录三类原因。 |
| removeRuntimePath | 函数 | 1848–1916 | 复杂 | persistence、file-io、cleanup、path-policy | 0 | 递归删除受管路径，先做策略校验再按平台执行，删除失败时保留可诊断原因。 |
| replaceRuntimeTextFileAtomically | 函数 | 1560–1632 | 复杂 | persistence、atomicity、file-io、crash-safety | 0 | 以临时文件 + 原子替换的方式更新受管文本文件，避免进程中断留下半写状态。 |
| scanRuntimeTree | 函数 | 1788–1821 | 中等 | persistence、tree、manifest、entry-point | 0 | 扫描受管目录树并委托 runtimeTreeManifest 生成 manifest，是文件资产比对的上层入口。 |
| scanRuntimeUtf8Lines | 函数 | 1270–1387 | 复杂 | persistence、streaming、file-io、encoding | 0 | 流式扫描 UTF-8 文本文件的匹配行，跨行段解码并通过 worker 分片读取大文件。 |
| statRuntimePathInternal | 函数 | 1659–1725 | 复杂 | persistence、cross-runtime、metadata、file-io | 0 | 跨运行时的 stat 实现，把不同 IO 后端的元数据归一化为统一形状，并识别"检查能力不可用"错误。 |
| [validateManagedRelativePath](../../../symbols/src/modules/runtimePersistence.ts/validateManagedRelativePath.md) | 函数 | 217–353 | 复杂 | persistence、validation、security、path-policy | 2 | managed 相对路径的唯一校验实现：拒绝逃逸、拒绝绝对路径与危险片段，是所有受管落盘写操作的守门人。 |
| writeRuntimeBytes | 函数 | 923–986 | 复杂 | persistence、file-io、cross-runtime、binary | 0 | 写入二进制文件：先确保父目录，再按运行时分派具体 IO 实现并回报写入字节数。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../platform/path.ts.md) | src/platform/path.ts | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeFileRangeReader.ts](runtimeFileRangeReader.ts.md) | src/modules/runtimeFileRangeReader.ts | 在 Zotero 沙箱中按字节区间读取大文件的读取器，配合 runtimeFileRangeProtocol 与 worker 实现分段读取，避免一次性载入造成内存峰值。 |
| [runtimeTreeManifest.ts](runtimeTreeManifest.ts.md) | src/modules/runtimeTreeManifest.ts | 目录清单工具：把持久化目录树序列化为 manifest 结构并比较差异，用于检测文件是否需要重新物化或清理。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpAuditAppendCore.ts](acp/diagnostics/acpAuditAppendCore.ts.md) | src/modules/acp/diagnostics/acpAuditAppendCore.ts | 审计日志追加的公共内核：基于 bufferedWriteCoordinator 提供带 owner 维度的 NDJSON 追加、刷盘、丢弃，并统一处理溢出与写入失败事件。 |
| [acpBackendPresets.ts](acp/chat/acpBackendPresets.ts.md) | src/modules/acp/chat/acpBackendPresets.ts | ACP 后端预设目录：维护内置 Agent 后端（命令、参数、请求类型、显示名）的定义与解析，供后端管理器和连接层复用。 |
| [acpBackendProbe.ts](acp/transport/acpBackendProbe.ts.md) | src/modules/acp/transport/acpBackendProbe.ts | ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。 |
| [acpBackendRefreshCacheDiagnostic.ts](acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpChatSkillInjection.ts](acp/chat/acpChatSkillInjection.ts.md) | src/modules/acp/chat/acpChatSkillInjection.ts | ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。 |
| [acpConversationStore.ts](acp/chat/acpConversationStore.ts.md) | src/modules/acp/chat/acpConversationStore.ts | ACP Chat 会话状态的持久化事实源：负责会话索引与 conversation state 的读写删除、快照反序列化归一化，并协调 transcript 存储路径与 pluginStateStore 的 ACP 域记录。 |
| [acpNpxLaunchCache.ts](acp/transport/acpNpxLaunchCache.ts.md) | src/modules/acp/transport/acpNpxLaunchCache.ts | 缓存 npx 启动 ACP 代理时解析出的可执行入口与版本信息，避免每次连接重复探测磁盘与 PATH，并通过有界等待处理启动竞态。 |
| [acpRuntimePromptTemplates.ts](acp/skillRun/acpRuntimePromptTemplates.ts.md) | src/modules/acp/skillRun/acpRuntimePromptTemplates.ts | ACP 运行时 prompt 模板管理：把内置 prompt 模板物化到 runtime 目录并提供按 key 读取/解析的能力。 |
| [acpRuntimeReplayProfiler.ts](acp/diagnostics/acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [acpRuntimeSemanticTrace.ts](acp/diagnostics/acpRuntimeSemanticTrace.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts | 语义 trace 的数据模型与 NDJSON 编解码：定义 trace schema、单调时钟、限额常量、完整性校验与解析加载，是录制端与回放端共享的格式契约。 |
| [acpRuntimeSemanticTraceRecorder.ts](acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts | 语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。 |
| [acpSessionManager.ts](acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSharedSkillCatalog.ts](acp/skillRun/acpSharedSkillCatalog.ts.md) | src/modules/acp/skillRun/acpSharedSkillCatalog.ts | ACP 共享 Skill 目录：聚合插件 Skill registry 与资源清单，生成本次会话可用的共享 Skill 列表。 |
| [acpSkillMaterializer.ts](acp/skillRun/acpSkillMaterializer.ts.md) | src/modules/acp/skillRun/acpSkillMaterializer.ts | Skill 物化器：把 Skill 目录（含资源清单）写入 runtime 工作区，并按 agent family 决定是否需要薄代理 Skill。 |
| [acpSkillOutputConvergence.ts](acp/skillRun/acpSkillOutputConvergence.ts.md) | src/modules/acp/skillRun/acpSkillOutputConvergence.ts | Skill 输出收敛层：在多次运行输出之间做校验与归一，判断产物是否已稳定收敛并给出终态结论。 |
| [acpSkillOutputValidator.ts](acp/skillRun/acpSkillOutputValidator.ts.md) | src/modules/acp/skillRun/acpSkillOutputValidator.ts | Skill 输出校验器：按 schema 资产与产物 manifest 校验 skill run 输出结构，输出结构化错误而非松散字符串。 |
| [acpSkillPatchTemplates.ts](acp/skillRun/acpSkillPatchTemplates.ts.md) | src/modules/acp/skillRun/acpSkillPatchTemplates.ts | Skill Patch 模板模块：把内置 patch 模板物化到 runtime 目录，供不同 agent family 修补 SKILL.md 行为差异。 |
| [acpSkillResourceManifest.ts](acp/skillRun/acpSkillResourceManifest.ts.md) | src/modules/acp/skillRun/acpSkillResourceManifest.ts | Skill 资源清单：列举单个 Skill 声明的附带资源文件，供物化与校验阶段核对完整性。 |
| [acpSkillResultFileFallback.ts](acp/skillRun/acpSkillResultFileFallback.ts.md) | src/modules/acp/skillRun/acpSkillResultFileFallback.ts | Skill 结果文件回退：当 Agent 未直接给出结构化结果时，从落盘结果文件回读并按校验器语义归一。 |
| [acpSkillRunAuditTrail.ts](acp/skillRun/acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpSkillRunExecutionSupport.ts](acp/skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunInteractionFiles.ts](acp/skillRun/acpSkillRunInteractionFiles.ts.md) | src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [acpSkillRunnerWorkspace.ts](acp/skillRun/acpSkillRunnerWorkspace.ts.md) | src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts | Skill runner 工作区管理：创建/清理 runtime 下的运行工作目录，隔离不同 requestId 的产物。 |
| [acpSkillRunPayloadStore.ts](acp/skillRun/acpSkillRunPayloadStore.ts.md) | src/modules/acp/skillRun/acpSkillRunPayloadStore.ts | skill run 的载荷持久化：读写 run context 载荷并维护 output revision 追加日志，为产物投影与恢复提供磁盘事实源。 |
| [acpSkillRunPersistence.ts](acp/skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunPromptBuilder.ts](acp/skillRun/acpSkillRunPromptBuilder.ts.md) | src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts | Skill run prompt 构建器：组合 agent family 规则、共享 Skill 目录、patch 模板与工作区上下文，生成最终运行提示词。 |
| [acpSkillRunRecovery.ts](acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillRunTranscriptStore.ts](acp/skillRun/acpSkillRunTranscriptStore.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts | ACP Skill Run transcript 的磁盘存储层：把 transcript 事件追加写入 NDJSON 日志、维护可增量重建的索引，并按页读取历史条目。 |
| [acpSkillRunWorkspaceDataPlane.ts](acp/skillRun/acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
| [acpSkillSchemaAssets.ts](acp/skillRun/acpSkillSchemaAssets.ts.md) | src/modules/acp/skillRun/acpSkillSchemaAssets.ts | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |
| [acpThinProxySkillMaterializer.ts](acp/skillRun/acpThinProxySkillMaterializer.ts.md) | src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts | ACP Skill 的薄代理物化器：按 agent family 解析 skill 根目录，注入 patch 模板与参考重写，把 Skill 包物化成 Agent 可直接消费的目录结构。 |
| [acpTransport.ts](acp/transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [acpWebSocketBridgeService.ts](acp/transport/acpWebSocketBridgeService.ts.md) | src/modules/acp/transport/acpWebSocketBridgeService.ts | ACP WebSocket Bridge sidecar 服务：定位预编译桥接二进制并在本地拉起 WebSocket 端点，为浏览器侧后端提供替代进程内 NDJSON 的连接路径。 |
| [archive.ts](../workflows/archive.ts.md) | src/workflows/archive.ts | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [builtinWorkflowSync.ts](workflow/catalog/builtinWorkflowSync.ts.md) | src/modules/workflow/catalog/builtinWorkflowSync.ts | 内置工作流目录同步：比对 workflows_builtin 随插件分发的定义与本地已安装工作流，按版本与内容摘要判定升级、跳过或失败，并经 runtimeBridge 把变更投到 Workflow Host。 |
| [bundleIO.ts](workflowExecution/bundleIO.ts.md) | src/modules/workflowExecution/bundleIO.ts | 运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。 |
| [citationGraphCrashJournal.ts](synthesis/debug/citationGraphCrashJournal.ts.md) | src/modules/synthesis/debug/citationGraphCrashJournal.ts | Citation Graph 构建崩溃日志（crash journal）的读写模块：把构建期崩溃的诊断片段以有界 journal 形式落盘，供 System E2E 测试与 debug 模式回溯定位失败根因。 |
| [client.ts](../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [command.ts](../platform/command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [contentPackageSubscription.ts](workflow/catalog/contentPackageSubscription.ts.md) | src/modules/workflow/catalog/contentPackageSubscription.ts | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
| [dashboardSnapshot.ts](dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [env.ts](../platform/env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [exportDeliveryAdapter.ts](synthesis/exportDeliveryAdapter.ts.md) | src/modules/synthesis/exportDeliveryAdapter.ts | Synthesis 宿主导出与运行工作区物化 port 的实现：把 sidecar 侧请求落到运行时目录、注册 Host Bridge 文件句柄并返回可下载交付结果。 |
| [file.ts](../workflows/file.ts.md) | src/workflows/file.ts | 工作流文件能力 API：基于 runtimePersistence 统一的文件读写、原子写入、目录遍历与移动删除，并接入平台文件选择器，路径与错误均按 Workflow Host 契约规范化。 |
| [foundation.ts](synthesis/foundation.ts.md) | src/modules/synthesis/foundation.ts | Synthesis 层基础设施：统一 canonical JSON 序列化与哈希、topic 路径 id 生成，以及知识图谱与 topic 存储目录布局。 |
| [healthGate.ts](../../scripts/system-e2e/healthGate.ts.md) | scripts/system-e2e/healthGate.ts | Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeCapabilityRegistry.ts](hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeCliInjection.ts](hostBridge/cli/hostBridgeCliInjection.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInjection.ts | 把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。 |
| [hostBridgeCliInstaller.ts](hostBridge/cli/hostBridgeCliInstaller.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstaller.ts | Host Bridge CLI 安装器：按平台从打包资产中解析预编译二进制，校验并落盘到运行时持久化目录，同时处理 Windows 命令解析差异。 |
| [hostBridgeCliInstallPrompt.ts](hostBridge/cli/hostBridgeCliInstallPrompt.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts | Host Bridge CLI 的安装提示流程：探测 CLI 是否可用、组装提示文案与用户交互入口，并驱动用户进入安装流程。 |
| [hostBridgeCliResolver.ts](hostBridge/cli/hostBridgeCliResolver.ts.md) | src/modules/hostBridge/cli/hostBridgeCliResolver.ts | 解析 Host Bridge CLI 的最终可执行路径，优先使用环境变量覆盖与已安装版本，回退到默认平台安装位置。 |
| [hostBridgeFileRegistry.ts](hostBridge/server/hostBridgeFileRegistry.ts.md) | src/modules/hostBridge/server/hostBridgeFileRegistry.ts | Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。 |
| [hostBridgePluginSkillBundle.ts](hostBridge/cli/hostBridgePluginSkillBundle.ts.md) | src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts | 构建随插件分发的 Host Bridge agent skill 包：以 contracts/host-bridge/surfaces.json 为事实源生成 skill 内容，并用 SHA-256 摘要判断是否需要重新物化。 |
| [hostBridgeProfileStore.ts](hostBridge/cli/hostBridgeProfileStore.ts.md) | src/modules/hostBridge/cli/hostBridgeProfileStore.ts | Host Bridge CLI 的 well-known profile 存储：按平台解析 profile 根目录，并把连接所需的 token、端口与主机信息写成 Agent 可发现的 profile 文件。 |
| [hostBridgeWorkflowAgentRun.ts](hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [hostBridgeWorkflowResources.ts](hostBridge/workflow/hostBridgeWorkflowResources.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts | Host Bridge 工作流资源层：管理一次运行期间的输入输出槽位绑定、文件登记与物化，为工作流提供受约束的读写资源 API。 |
| [loader.ts](../workflows/loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [markdownAttachmentTab.ts](markdownAttachmentTab.ts.md) | src/modules/markdownAttachmentTab.ts | Markdown 附件阅读器标签页的完整实现：在 Zotero 标签中创建内嵌 browser 加载共享阅读器页面，把文档内容通过 bridge 注入，并在页面脚本加载失败时回退到内联独立 HTML。 |
| [packagedAssetResolver.ts](packagedAssetResolver.ts.md) | src/modules/packagedAssetResolver.ts | 打包资产解析器：把插件内相对路径映射为 Zotero 插件目录下的真实文件路径，并校验资产是否存在，是 CLI/sidecar 等二进制定位的统一入口。 |
| [packageHookBundler.ts](../workflows/packageHookBundler.ts.md) | src/workflows/packageHookBundler.ts | 工作流包 hook 打包器：收集工作流包声明的 hook 脚本与其依赖资源，生成可分发的 bundle 目录结构。 |
| [pluginSkillRegistry.ts](workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [pluginStateStore.ts](pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [preferenceScript.ts](preferenceScript.ts.md) | src/modules/preferenceScript.ts | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |
| [provider.ts](../providers/generic-http/provider.ts.md) | src/providers/generic-http/provider.ts | 通用 HTTP Provider：按声明式请求对任意 REST 后端发起调用，支持模板插值、JSON path 提取、多步骤编排、上传与轮询。 |
| [registry.ts](synthesis/registry.ts.md) | src/modules/synthesis/registry.ts | 文献 sidecar 注册表：归一文献元数据指纹、发现 managed note 中的产物覆盖情况，并生成 sidecar 索引行与分面统计。 |
| [representativeImageReadAdapter.ts](synthesis/representativeImageReadAdapter.ts.md) | src/modules/synthesis/representativeImageReadAdapter.ts | Synthesis 代表图读取 port 实现：按 digest 描述符定位附件文件、读取字节并以 base64 形式回传，同时对不可用情形返回结构化诊断。 |
| [researchBundleService.ts](hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [resultContext.ts](workflowExecution/resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |
| [runtimeEvidence.ts](../../scripts/system-e2e/runtimeEvidence.ts.md) | scripts/system-e2e/runtimeEvidence.ts | 采集单个执行 cell 的运行时证据：读取已安装 sidecar runtime、会话记录与运行日志，按 schema 输出可归档证据文档。 |
| [runtimeFileTransfer.ts](runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |
| [runtimeLogManager.ts](runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistenceGovernance.ts](runtimePersistenceGovernance.ts.md) | src/modules/runtimePersistenceGovernance.ts | 运行时持久化治理：集中执行配额、保留期限与清理策略，串联 pluginStateStore、任务保留策略与 workflow 产品存储，控制插件落盘数据的增长。 |
| [runWorkspaceMaterializationAdapter.ts](synthesis/runWorkspaceMaterializationAdapter.ts.md) | src/modules/synthesis/runWorkspaceMaterializationAdapter.ts | 把 synthesis-contracts 定义的 run workspace 物化契约适配到插件侧运行时文件系统，使 Sidecar 下发的 workspace 结构在 Zotero 沙箱内按 runtimePersistence 规则落盘。 |
| [selectionSample.ts](workflow/ui/selectionSample.ts.md) | src/modules/workflow/ui/selectionSample.ts | 调试用选区采样工具：在 Zotero 菜单中注册「采样当前选区」入口，读取 Zotero SelectionContext 后写入临时文件，供工作流输入物化问题排查。 |
| [skillPackageBundler.ts](../providers/skillrunner/skillPackageBundler.ts.md) | src/providers/skillrunner/skillPackageBundler.ts | SkillRunner 侧 skill 包打包：把插件 Skill 注册表中的条目组装成 zip 包，经 zipTransport 发送给旧版 SkillRunner 后端。 |
| [skillRunnerCtlBridge.ts](skillRunner/runtime/skillRunnerCtlBridge.ts.md) | src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts | SkillRunner 控制面桥接：与本地 Skill-Runner ctl 服务建立/维持连接，投递运行请求并流式回传事件，是旧后端兼容路径的核心。 |
| [skillRunnerLocalRuntimeManager.ts](skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [skillRunnerReleaseInstaller.ts](skillRunner/runtime/skillRunnerReleaseInstaller.ts.md) | src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts | SkillRunner 发布版安装器：经 ctl bridge 触发后端自身安装/升级，解析版本并把安装结果写入运行时持久化目录。 |
| [skillRunnerRunDialog.ts](skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [syncRuntimeCleanup.ts](synthesis/syncRuntimeCleanup.ts.md) | src/modules/synthesis/syncRuntimeCleanup.ts | Synthesis 同步运行期残留的清理入口：在 sidecar 生命周期结束或首选项关闭后清掉旧的同步临时目录，避免磁盘堆积。 |
| [synthesisProductionOwner.ts](synthesis/production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisSidecarRuntimeInstaller.ts](synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts | sidecar 运行时安装器：按当前平台目标把打包的 sidecar 二进制从 staging 目录原子落位到运行时目录，逐文件校验 SHA-256 摘要并设置可执行权限，同时负责过期 manifest 的清理与诊断快照。 |
| [synthesisSidecarRuntimeSupervisor.ts](synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |
| [synthesisWorkbenchTab.ts](synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [windowsCommandResolution.ts](windowsCommandResolution.ts.md) | src/modules/windowsCommandResolution.ts | Windows 上外部命令解析模块：定位 npx/node/python 等可执行文件，识别 shim（.cmd/.ps1）与 App Execution Alias，并为 subprocess 调用生成可运行的命令行。 |
| [workflowHostOwners.ts](../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowInputMaterialization.ts](../workflows/workflowInputMaterialization.ts.md) | src/workflows/workflowInputMaterialization.ts | 工作流输入物化：把声明的输入文件复制到受管工作区，规范化并去重文件名，拒绝 Windows 保留设备名，然后返回可供后续处理的可信路径。 |
| [workflowNoteImagePreparation.ts](../workflows/workflowNoteImagePreparation.ts.md) | src/workflows/workflowNoteImagePreparation.ts | 笔记图片准备：解码并校验 base64 图片、推断 MIME、按有界尺寸与 token 化引用生成 prepared image，供后续在原生事务中导入为笔记附件。 |
| [workflowProductStore.ts](workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |
| [workflowRuntime.ts](workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [zipBundleReader.ts](../workflows/zipBundleReader.ts.md) | src/workflows/zipBundleReader.ts | zip bundle 读取：解析工作流/内容包 zip 归档，校验条目路径安全后解出文件树，并配合泄漏探针清理解包临时目录。 |
| [zoteroHostCapabilityBroker.ts](zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostMutationAuthority.ts](zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |
| [zoteroHostNativeMutations.ts](zoteroHost/zoteroHostNativeMutations.ts.md) | src/modules/zoteroHost/zoteroHostNativeMutations.ts | Zotero 宿主原生 mutation 执行层：把已审批的写操作落到原生 transaction 与 Zotero API，覆盖元数据创建、附件写入等 canonical mutation 路径。 |
| [zoteroNotePayloadResolver.ts](zoteroHost/zoteroNotePayloadResolver.ts.md) | src/modules/zoteroHost/zoteroNotePayloadResolver.ts | 笔记负载解析器：按条目分页列出笔记中的 payload 块，必要时从笔记附件中读取并校验内嵌负载字节，为引用图谱与产物读取提供统一的取数入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| copyRuntimeTree | 函数 | 1946–2005 | 复制受管目录树，串行化到独占 copy slot 避免并发物化互相覆盖。 |
| getRuntimePersistencePaths | 函数 | 610–642 | 汇总运行时全部关键落盘路径（数据根、数据库、sidecar、ACP 缓存等），是路径解析的唯一入口。 |
| removeRuntimePath | 函数 | 1848–1916 | 递归删除受管路径，先做策略校验再按平台执行，删除失败时保留可诊断原因。 |
| replaceRuntimeTextFileAtomically | 函数 | 1560–1632 | 以临时文件 + 原子替换的方式更新受管文本文件，避免进程中断留下半写状态。 |
| scanRuntimeTree | 函数 | 1788–1821 | 扫描受管目录树并委托 runtimeTreeManifest 生成 manifest，是文件资产比对的上层入口。 |
| [validateManagedRelativePath](../../../symbols/src/modules/runtimePersistence.ts/validateManagedRelativePath.md) | 函数 | 217–353 | managed 相对路径的唯一校验实现：拒绝逃逸、拒绝绝对路径与危险片段，是所有受管落盘写操作的守门人。 |
| writeRuntimeBytes | 函数 | 923–986 | 写入二进制文件：先确保父目录，再按运行时分派具体 IO 实现并回报写入字节数。 |
