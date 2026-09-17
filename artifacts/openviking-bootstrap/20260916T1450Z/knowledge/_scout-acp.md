# ACP 模块只读侦察报告

范围：`src/modules/acp/`（85 个 `.ts`，49,277 行）+ 其外部契约模块 `src/modules/acpProtocol.ts`、`src/modules/acpTypes.ts`。
方法：只读。使用了 `codegraph explore`、`rg`、`read`。未修改任何文件、未执行 git 写操作、未安装依赖、未运行构建或测试。

**对任务描述的一处更正**：`src/modules/acp/` 下**没有散文件**，`find` 结果 85 个文件全部落在四个子目录中：`chat/` 14、`diagnostics/` 18、`skillRun/` 41、`transport/` 12（`ls -la src/modules/acp/` 仅显示四个目录）。本文按这四个子目录组织。

---

## 1. 职责与边界

### 1.1 负责什么（我看到代码是这样）

1. **扮演 ACP 的 client 端**：拉起 agent 子进程 / WebSocket bridge，用 JSON-RPC 2.0 + NDJSON 与之通信，实现 `initialize` / `session/new` / `session/load` / `session/resume` / `session/prompt` / `session/cancel` / `session/set_mode` / `session/set_model` / `session/set_config_option` / `authenticate`（`src/modules/acp/transport/acpClientConnection.ts:368-446`，方法表在 `src/modules/acpProtocol.ts:5`）。
2. **两条消费路径**：
   - **ACP Chat**——交互式对话。会话生命周期、transcript、权限、模式/模型/推理强度、持久化，主入口 `src/modules/acp/chat/acpSessionManager.ts`。
   - **ACP Skills**——skill run 编排。从请求校验、skill 物化、workspace 准备、prompt、输出收敛/校验、结果 apply 语义、恢复，主入口 `src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:592`（`executeAcpSkillRunnerJob`）。
3. **对上层提供 read model / 事件**：`ACP_CHAT_WORKSPACE_ADAPTER`（`src/modules/acp/chat/acpChatWorkspaceSurface.ts:510`）与 `ACP_SKILLS_WORKSPACE_ADAPTER`（`src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts:546`），由 `src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:1667,1700` 与 `assistantWorkspacePublicationHost.ts:385,398` 消费。
4. **可观测性子系统**：诊断路由、审计落盘、运行时性能 profiler、语义 trace 录制、trace replay（`src/modules/acp/diagnostics/`，18 个文件，占总行数约 1/4）。
5. **作为 provider 执行体**：`AcpProvider`（`src/providers/acp/provider.ts:27`，`id = ACP_BACKEND_TYPE`）把 workflow 执行请求转成 skill run。

### 1.2 明确不负责什么（有代码证据）

| 边界 | 证据 |
| --- | --- |
| **不渲染 UI / 不碰 DOM** | 全模块 `rg "document\.(createElement\|querySelector\|getElementById)\|createXULElement\|ownerDocument"` 零命中；只输出 snapshot / change 事件，真实渲染在 `src/sidebar/`、`src/modules/assistant/workspace/` |
| **不做 Zotero 数据 CRUD** | 全模块 `rg "\bZotero\.[A-Za-z]+"` 共 8 行，其中**真实宿主调用只有 3 处**：`Zotero.version`（`diagnostics/acpRuntimeReplayProductionPorts.ts:158`）、`Zotero.getMainWindow?.()`（`diagnostics/acpBackendRefreshCacheDiagnostic.ts:958`）、`Zotero.Items.get(...)`（`chat/acpContextBuilder.ts:84`，只读当前条目标题）；其余 5 行是诊断标签/错误文案字符串（`:1582,1586,3226,3241`、`transport/acpWebSocketBridgeService.ts:421`）。写入类操作不在本模块：apply 结果由 `src/modules/workflowExecution/applySeam.ts:795,890` 调 `markAcpSkillRunApplyResult` 交回 workflow 层 |
| **Zotero 耦合集中在一处** | `chat/acpContextBuilder.ts`（`Zotero.Items.get` + `Zotero_Tabs` 经 `(win as any)` 访问，`:73-92`）是本模块唯一的宿主上下文读取点，输出为 `AcpHostContext`（`src/modules/acpTypes.ts:163`） |
| **不直接读写 Zotero prefs** | `rg "Zotero\.Prefs\|getPref\(|setPref\(" src/modules/acp/` 零命中 |
| **不直接选文件系统 adapter** | 全部经 `src/modules/runtimePersistence.ts`（`getRuntimePersistencePaths` / `writeRuntimeTextFile` / `removeRuntimePath`）；`src/modules/pluginStateStore.ts`（SQLite） |
| **不拥有后端注册表** | `src/modules/acp/chat/acpSessionManager.ts:1196` 调 `loadBackendsRegistry()`（`src/backends/registry`），ACP 模块只做类型过滤（`:1200-1202`） |
| **不拥有工作流引擎与任务队列** | skill run 记录向 `pluginStateStore` 的 `acp` run store 投影（`acpSkillRunPersistence.ts:867` `upsertPluginRunStoreEntry("acp", …)`），工作流任务侧由 `acpSkillRunTaskProjection.ts:60` 投影 |
| **不拥有 MCP / host bridge** | 静态方向是 acp → hostBridge（`hostBridge/cli`、`hostBridge/mcp` 被 import）；反向引用存在但**全部走动态 import**（`hostBridge/permissions/hostBridgePermissionManager.ts:500`、`hostBridgeCapabilityRegistry.ts:2150,2204,2795`），见 §3.2 |

### 1.3 依赖方向（外部 import 统计）

`rg -o 'from "(\.\./)+[^"]+"' src/modules/acp/` 聚合后，外部目标按频次：`assistant/publication` 34、`runtimePersistence` 33、`utils/path` 23、`acpTypes` 21、`backends/types` 18、`acpProtocol` 17、`debugMode` 16、`runtimeLogManager` 11、`config/defaults` 11、`utils/wait` 8、`workflow/catalog` 6、`providers/contracts` 5、`hostBridge/mcp` 5、`pluginStateStore` 3。

模块内部依赖方向（按 `from "../<dir>/…"` 出现次数）：`../diagnostics` 27、`../transport` 24、`../skillRun` 16、`../chat` 11。逐条核对：

- `chat/ → skillRun/` **存在，7 处**，全部指向 skillRun 的叶子模块：`acpChatSkillInjection.ts:7,12`（agent family resolver、prompt templates）、`acpSessionManager.ts:152,157`（permission queue、startup preambles）、`acpConversationTranscriptStore.ts:2,12`（transcript store，即 Chat transcript 直接复用 skillRun 实现）、`acpReasoningEffortFallback.ts:2`（agent family resolver）。
- `skillRun/ → chat/` **存在，7 处**，同样只指向 chat 的叶子/工具模块：`../chat/acpModelOptionFolding`（`acpSkillRunPersistence.ts:32`、`acpSkillRunActions.ts:18`、`acpSkillRunStore.ts:29`）、`../chat/acpSessionConfigOptions`（`acpSkillRunnerOrchestrator.ts:46`、`acpSkillRunStore.ts:30`、`acpSkillRunExecutionSupport.ts:39`）、`../chat/acpReasoningEffortFallback`（`acpSkillRunExecutionSupport.ts:40`）。没有 `skillRun/ → chat/acpSessionManager` 这类核心互引。
- `../transport` 与 `../diagnostics` 的引用来自 chat 与 skillRun 两侧。
- 结论：chat 与 skillRun **互相引用对方的叶子模块**，不是单向分层。循环依赖靠两类技术规避：无运行时 import 的 host 槽（`skillRun/acpSkillRunHosts.ts:1-14` 注释明确说明此意图）与注册式 facade（`chat/acpChatWorkspaceEmissionFacade.ts:18-22`、`skillRun/acpSkillRunPermissionFacade.ts`）。

---

## 2. 文件与子目录地图

### 2.1 `transport/`（12 文件，约 5.5k 行）——传输与协议编解码

| 文件 | 角色 | 标记 |
| --- | --- | --- |
| `acpTransport.ts`（2620） | 进程/传输抽象：`AcpTransport` 接口（`:86`）、launch 计划、POSIX 进程组所有权校验与清理、exit lifecycle（`:110`）、`launchAcpTransport`（`:2599`） | **传输/入口** |
| `acpMessageStream.ts`（206） | NDJSON 分帧编解码（`createAcpNdJsonMessageStream:37`） | **传输** |
| `acpClientConnection.ts`（449） | JSON-RPC 2.0 客户端：请求/响应/通知分发、pending map、client 方法反调（`AcpClientConnection:74`） | **传输/状态机** |
| `acpConnectionAdapter.ts`（2165） | ACP 语义适配层：initialize/newSession/load/resume/prompt/cancel/setMode/…（`AcpConnectionAdapter:229`），update 捕获、权限请求、诊断、claude 扩展（`:654-760`） | **契约/入口** |
| `acpSyntheticConnectionAdapter.ts`（207） | 合成 adapter（replay/测试用），带定时器检查 | 传输 |
| `acpWebSocketBridgeService.ts`（461） | Windows 用 Rust WebSocket bridge 单例进程：二进制解析、spawn、ready file、shutdown（`:341,:368`） | **传输/生命周期** |
| `acpTranscriptBoundary.ts`（77） | session update → transcript 边界分类（纯函数，与后端无关） | **契约** |
| `acpExecutionProgress.ts`（192） | 按 scope key 的消息计数进度（内存 Map + release） | 状态 |
| `acpPermissionOptions.ts`（54） | 权限选项 kind 归一化 / 自动批准选项选择 | 契约 |
| `acpSilentTerminalAssistantCollector.ts`（51） | silent 模式下终端 assistant 文本收集器 | 状态 |
| `acpBackendProbe.ts`（423） | 连接探测 → `buildAcpRuntimeOptionsCache` / `probeAcpBackendRuntimeOptions` | 入口 |
| `acpNpxLaunchCache.ts`（334） | 受管 npx 启动缓存 + 租约串行化（`leaseTails`） | 状态 |

### 2.2 `chat/`（14 文件，约 9.5k 行）——ACP Chat 域

| 文件 | 角色 | 标记 |
| --- | --- | --- |
| `acpSessionManager.ts`（3987） | Chat 域核心：会话 runtime 注册表、连接/断开、prompt、取消、权限、模式/模型、持久化调度、优雅关闭 | **入口/状态机** |
| `acpConversationStore.ts`（983） | 会话与索引的持久化（SQLite `pluginStateStore` + runtime 目录），路径解析 | **持久化** |
| `acpConversationTranscriptStore.ts`（102） | Chat transcript 写入，直接复用 skillRun 的 transcript store | 持久化 |
| `acpChatTranscriptMirror.ts`（792） | Chat transcript 内存镜像 + 冷镜像 LRU(10) + 分页读取（`:45,:493,:621`） | 状态 |
| `acpChatWorkspaceDataPlane.ts`（645） | 监听器集合、workspace change 构建、owner/read model 投影 | **状态/契约** |
| `acpChatWorkspaceSurface.ts`（568） | `ACP_CHAT_WORKSPACE_ADAPTER`、region 读取、publication 映射 | **契约** |
| `acpChatWorkspaceEmissionFacade.ts`（55） | 打破循环依赖的 emission 注入槽 | 契约 |
| `acpChatSkillInjection.ts`（575） | Chat 侧 skill 注入与 workspace 准备锁 | 行为 |
| `acpContextBuilder.ts` | `buildAcpHostContext`（Zotero 侧上下文 → prompt 上下文） | 契约 |
| `acpSessionConfigOptions.ts`（495） | runtime option（mode/model/effort）解析与归一化 | 契约 |
| `acpModelOptionFolding.ts`（500） | model 变体折叠为 model+reasoning 两个选项 | 转换 |
| `acpReasoningEffortFallback.ts` | reasoning effort 降级重试 | 行为 |
| `acpSidebarModel.ts`（239） | `buildAcpSidebarViewSnapshot` 视图快照 | 契约 |
| `acpBackendPresets.ts`（500） | 内置后端预设清单（agentFamily 归类） | 配置 |

### 2.3 `skillRun/`（41 文件，约 20k 行）——ACP Skills 域

入口 / 编排：

| 文件 | 角色 | 标记 |
| --- | --- | --- |
| `acpSkillRunnerOrchestrator.ts`（3219） | `executeAcpSkillRunnerJob`：workspace→物化→校验→依赖→adapter→prompt→收敛→apply 全流程 | **入口** |
| `acpSkillRunRecovery.ts`（2358） | 重启后恢复：`recoverAcpSkillRunConversation:952`、`continueRecoveredSequenceStep:476`、`reapplyAcpSkillRunResult:712` | **入口/状态机** |
| `acpSkillRunActions.ts`（1100） | UI 面动作：cancel/interrupt/archive/reply/connect/disconnect/end/detach/apply | **入口** |
| `acpSkillRunRequestAdapter.ts` | SkillRunner job → `AcpSkillRunRequestV1` 适配 | 契约 |
| `acpSkillRunForeground.ts` | 前台聚焦请求 | 行为 |

状态机 / 状态：

| 文件 | 角色 | 标记 |
| --- | --- | --- |
| `acpSkillRunStore.ts`（2085） | run 记录 Map、状态迁移、transcript live state、host 注入 | **状态机** |
| `acpSkillRunState.ts` | 共享可变状态叶子模块（依赖方向锚点） | 状态 |
| `acpSkillRunStatus.ts` | 纯谓词：terminal / active / recoverable / post-terminal | **契约** |
| `acpSkillRunPersistence.ts`（1279） | SQLite run/event 写入、runtime 文件、soft persist 定时器、启动 reconcile、retention 清理 | **持久化** |
| `acpSkillRunTranscriptStore.ts`（996） | transcript.jsonl + index 持久化与分页源 | **持久化** |
| `acpSkillRunTranscriptMirror.ts`（1439） | transcript 内存镜像 + 冷镜像 LRU(10) + projection | 状态 |
| `acpSkillRunWorkspaceDataPlane.ts`（759） | skill run 侧 read model / listener / change 合并 | **状态** |
| `acpSkillRunWorkspaceSelection.ts` | 选中 run 的持久选择 | 状态 |
| `acpSkillRunRuntimeCatalog.ts` | mode/model/effort 选项目录（内存） | 状态 |
| `acpSkillRunControllerRegistry.ts` | run setup controller 注册表（cancel 句柄） | 状态 |
| `acpSkillRunPayloadStore.ts`（166） | `run-context.json` / `output-revisions.jsonl` | 持久化 |
| `acpSkillRunInteractionFiles.ts`（313） | 交互式文件选择 staging 与提交 | 行为 |

权限：

| 文件 | 角色 |
| --- | --- |
| `acpPermissionQueue.ts` | 通用权限请求 FIFO 队列类 |
| `acpSkillRunPermissionQueue.ts`（314） | skill run 权限请求设置/自动批准/过期清理/解决 |
| `acpSkillRunPermissionFacade.ts` | 权限请求 handler 注入槽（给 hostBridge 用） |

Skill 物化与校验：

| 文件 | 角色 |
| --- | --- |
| `acpSkillMaterializer.ts` | 单 skill 物化 |
| `acpThinProxySkillMaterializer.ts`（563） | 共享 skill catalog + thin proxy 物化 |
| `acpSharedSkillCatalog.ts`（223） | 共享 catalog 构建（带 inflight 去重） |
| `acpSkillReferenceRewriter.ts`（159） | skill 内引用重写 |
| `acpSkillResourceManifest.ts` | 资源清单与可用性摘要 |
| `acpSkillSchemaAssets.ts`（571） | input/parameter/output schema 解析、校验、JSON Schema 编译 |
| `acpSkillOutputConvergence.ts`（210） | 输出收敛（候选文本抽取） |
| `acpSkillOutputValidator.ts`（188） | 输出校验 |
| `acpSkillResultFileFallback.ts`（158） | 结果文件回退解析 |
| `acpRuntimeDependencyWrapper.ts`（491） | uv 运行时依赖探测与包装 |
| `acpSkillPatchTemplates.ts` / `acpRuntimePromptTemplates.ts` / `acpStartupPromptPreambles.ts` | prompt 模板与启动前言 |
| `acpSkillRunPromptBuilder.ts`（326） | 按 agentFamily 组装执行指令 |
| `acpAgentFamilyResolver.ts`（279） | backend → agentFamily 解析与 skill root/injection 计划 |
| `acpSkillRunnerWorkspace.ts`（237） | workspace 创建与 workflow workspace 复用注册表 |
| `acpSkillRunHosts.ts`（126） | 三个协作模块的 host 注入槽（无运行时 import 的叶子） |
| `acpSkillRunAuditTrail.ts`（723） | 运行审计产物写入与批量释放 |
| `acpSkillRunTaskProjection.ts` | run 摘要 → workflow 任务状态投影 |
| `acpSkillRunExecutionSupport.ts`（1275） | 执行支持（审计事件、诊断、runtime selection 应用） |
| `acpSkillsWorkspaceSurface.ts`（608） | `ACP_SKILLS_WORKSPACE_ADAPTER` |

### 2.4 `diagnostics/`（18 文件，约 12k 行）

| 文件 | 角色 |
| --- | --- |
| `acpDiagnostics.ts`（213） | 错误归一化：`describeAcpError` / `serializeAcpError` / evidence 截断（`DIAGNOSTIC_EVIDENCE_STRING_LIMIT=4000`） |
| `acpDiagnosticRouter.ts`（51） | `recordAcpRuntimeDiagnostic` 唯一路由入口（吞异常以保护执行路径） |
| `acpChatDiagnosticAuditTrail.ts`（170） | Chat 诊断审计（owner 激活/追加/刷出/释放/丢弃） |
| `acpAuditAppendCore.ts` | 审计追加核心，带 pending 上限（2048 条 / 2MB） |
| `acpRuntimeDiagnosticsMode.ts` | 诊断模式引用计数 acquire/release |
| `acpBackendRefreshCacheDiagnostic.ts`（4169） | **最大文件**：后端刷新诊断菜单、11 步探测流程、内嵌 Node 探测脚本（含 WS bridge 自举） |
| `acpRuntimePerformanceProfiler.ts`（915） | 指标/快照 profiler，上限 8 活跃 + 8 完成 profile、128 metric series、4096 publication lifecycle |
| `acpRuntimePerformanceBaseline.ts`（466） | silent 运行时性能基线 |
| `acpRuntimeSemanticTrace.ts`（275） | 语义 trace 文档 schema、NDJSON 编解码、限额 |
| `acpRuntimeSemanticTraceRecorder.ts`（747） | trace 录制器（arm/claim/record/finish/save/shutdown） |
| `acpRuntimeReplayController.ts`（440） | replay 生命周期控制器（start/cancel/shutdown） |
| `acpRuntimeReplayLogicalTime.ts`（157） | replay 逻辑时钟端口 |
| `acpRuntimeReplayProfiler.ts`（1619） | replay 侧 profiler 端口实现 |
| `acpRuntimeReplayIdentity.ts` / `Targets.ts`（415） / `ProfileContext.ts` / `ProductionPorts.ts`（522） / `PublicationSidecar.ts`（421） | replay 身份命名、目标（chat/workflow）、上下文、生产端口、发布 sidecar |

### 2.5 外部契约模块（不在 `src/modules/acp/` 但属于本域）

- `src/modules/acpProtocol.ts`（357）：`ACP_PROTOCOL_VERSION=1`、`ACP_AGENT_METHODS`、`ACP_CLIENT_METHODS`、权限 kind。
- `src/modules/acpTypes.ts`（559）：`AcpConversationSnapshot:291`、`AcpConversationItem:284`、`AcpPendingPermissionRequest:221`、`AcpChatSessionSummary:355`、`AcpPromptInterruptState`。
- `src/providers/contracts.ts:200,206`：`AcpPromptRequestV1`、`AcpSkillRunRequestV1`。

---

## 3. 对外接口

### 3.1 静态 import 本模块的外部文件（仅 6 个）

`rg -n 'from ".*modules/acp' src --no-heading -g '!src/modules/acp/**'`：

| 外部文件 | 引用 |
| --- | --- |
| `src/hooks.ts:10,112,113,115,116,189` | `registerAcpBackendRefreshCacheDiagnosticMenu`、`shutdownAcpSessionManager`、`releaseAcpSkillRunAuditTrailWrites`、`shutdownAcpWebSocketBridgeService`、`reconcileAcpSkillRunWorkflowTasksOnStartup`、`shutdownAcpSkillRunConversations` |
| `src/providers/acp/provider.ts:14,15-23,25` | `executeAcpSkillRunnerJob`、`acpModelOptionFolding`、`normalizeAcpSkillRuntimeSelection` |
| `src/providers/types.ts` | `acpRuntimeSemanticTraceRecorder`（类型） |
| `src/providers/profile.ts` | `acpModelOptionFolding` |

### 3.2 动态 import（延迟加载，用于生命周期钩子/宿主能力）

- `src/hooks.ts:1221,1236,1422`：trace recorder shutdown、replay controller shutdown、skill run store 摘要。
- `src/modules/hostBridgeCapabilityRegistry.ts:2150,2204,2795`：skill run store 与 `reapplyAcpSkillRunResult`。
- `src/modules/runtimePersistenceGovernance.ts:794,853`：skill run store 与 `cleanupExpiredAcpSkillRunsForRetention`。
- `src/modules/dashboard/dashboardSnapshot.ts:2679,2684`、`dashboardActions.ts:516,539,568`：trace/replay 只读视图。
- `src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:500`：`acpSkillRunPermissionFacade`。

### 3.3 通过 workspace adapter 契约对接 UI

`ACP_CHAT_WORKSPACE_ADAPTER`（`acpChatWorkspaceSurface.ts:510`）与 `ACP_SKILLS_WORKSPACE_ADAPTER`（`acpSkillsWorkspaceSurface.ts:546`）被以下位置消费：

- `src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:1667,1700,1885,1898`
- `src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:135,385,398,419,561,568,870,881,1206,1219`

即：**UI 只通过 adapter + change 事件与本模块耦合**，模块本身不 import `src/sidebar/**`（`rg "modules/acp" src/sidebar` 零命中）。

### 3.4 主要导出符号与调用方

| 导出 | 位置 | 主要调用方 |
| --- | --- | --- |
| `executeAcpSkillRunnerJob` | `skillRun/acpSkillRunnerOrchestrator.ts:592` | `src/providers/acp/provider.ts:14`；`acpSkillRunRecovery.ts:185`（恢复复用）；8 个 caller 中多数在测试 |
| `createAcpConnectionAdapter` | `transport/acpConnectionAdapter.ts:2161` | `chat/acpSessionManager.ts`、`skillRun/acpSkillRunnerOrchestrator.ts`、`skillRun/acpSkillRunRecovery.ts`、`transport/acpBackendProbe.ts`、`diagnostics/acpBackendRefreshCacheDiagnostic.ts`（7 callers） |
| `launchAcpTransport` | `transport/acpTransport.ts:2599` | `acpConnectionAdapter.ts`、`acpBackendProbe.ts`、`acpBackendRefreshCacheDiagnostic.ts` |
| `connectAcpConversation` | `chat/acpSessionManager.ts:2730` | `assistant/workspace/assistantWorkspaceActionRouter.ts`、`diagnostics/acpRuntimeReplayTargets.ts:83`（9 callers） |
| `sendAcpConversationPrompt` | `chat/acpSessionManager.ts:2833` | `assistantWorkspaceActionRouter.ts` |
| `cancelAcpConversationPrompt` | `chat/acpSessionManager.ts:3094` | `assistantWorkspaceActionRouter.ts` |
| `shutdownAcpSessionManager` | `chat/acpSessionManager.ts:3850` | `src/hooks.ts:112` |
| `shutdownAcpSkillRunConversations` | `skillRun/acpSkillRunActions.ts:1040` | `src/hooks.ts:189` |
| `reconcileAcpSkillRunWorkflowTasksOnStartup` | `skillRun/acpSkillRunPersistence.ts:1085` | `src/hooks.ts:702` |
| `registerAcpBackendRefreshCacheDiagnosticMenu` | `diagnostics/acpBackendRefreshCacheDiagnostic.ts` | `src/hooks.ts:999` |
| `shutdownAcpWebSocketBridgeService` | `transport/acpWebSocketBridgeService.ts:368` | `src/hooks.ts:115` |
| `releaseAcpSkillRunAuditTrailWrites` | `skillRun/acpSkillRunAuditTrail.ts` | `src/hooks.ts:113` |
| `armAcpRuntimeSemanticTraceRecorder` / `shutdownAcpRuntimeSemanticTraceRecorder` | `diagnostics/acpRuntimeSemanticTraceRecorder.ts:208,712` | dashboard / hooks / replay targets |
| `startAcpRuntimeReplayController` / `shutdownAcpRuntimeReplayController` | `diagnostics/acpRuntimeReplayController.ts:268,412` | dashboard / hooks |
| `cleanupExpiredAcpSkillRunsForRetention` | `skillRun/acpSkillRunPersistence.ts:1216` | `runtimePersistenceGovernance.ts:854` |

---

## 4. 主要流程

### 4.1 启动一次 ACP Chat 会话

1. `connectAcpConversation()`（`chat/acpSessionManager.ts:2730`）→ `ensureInitialized()`（`:443`，加载 `loadAcpFrontendState` 与 session index）。
2. `refreshAcpBackends()`（`:1195`）→ `loadBackendsRegistry()`，过滤 `type === ACP_BACKEND_TYPE`，合并 scoped adapter 注册的后端（`:1204-1214`），刷新 active backend。
3. `getOrCreateSessionRuntime(backendId, conversationId)`（`:598`）→ 命中/创建 `AcpChatSessionRuntime`（注册表 `sessionRuntimes:279`）。
4. 若已有 `adapter + sessionId` 则直接复用；否则 `ensureSession()`（`:2283`）→ `ensureAdapter()`。
5. `ensureAdapter` 内部：`launchAcpTransport()`（`transport/acpTransport.ts:2599`，平台上分 Mozilla subprocess / WebSocket bridge / Node 三条）→ `createAcpNdJsonMessageStream` → `AcpClientConnection` → `createAcpConnectionAdapter()`（`transport/acpConnectionAdapter.ts:2161`）。
6. adapter `initialize()` → `session/new` 或按 `remoteSessionId` 走 `session/load` / `session/resume` 附着（`ensureSession` 的 `finishAttach("existing"|…)`，`:2292-2313`）。
7. 语义 trace（若开启）：`beginAcpRuntimeSemanticTraceClaimAttempt`（`:2749`）→ `claimAcpRuntimeSemanticTraceRoot` → `bindAcpChatSemanticTraceAfterAttach`（`:2299`）。
8. `emitSessionRuntimeSnapshot()` → 经 `acpChatWorkspaceDataPlane` 通知 UI。
9. 会话落盘：`saveAcpFrontendState` / `saveAcpChatSessionIndex`（`chat/acpConversationStore.ts:777,609`）。

**活会话上限**：`MAX_LIVE_ACP_CHAT_ADAPTERS = 3`（`chat/acpSessionManager.ts:298`）；超出时驱逐最久未活动的非 busy 会话（`:690-716`），全部 busy 则抛错。

### 4.2 发送一个 prompt

1. `sendAcpConversationPrompt()`（`:2833`）→ 校验 adapter/sessionId → 构造 `activePrompt`（含 token 与 `watchdog`）。
2. 文本拼装：`buildPromptText(message, mcpCompatibilityMode)`（`acpConnectionAdapter.ts:1975`），prompt block 带 `_meta.requestKind = ACP_PROMPT_REQUEST_KIND`。
3. `connection.prompt()`（`acpClientConnection.ts:408`）→ `sendRequest(ACP_AGENT_METHODS.session_prompt)`（`:409`），响应按 id 匹配 `pendingResponses`（`handleResponse:214`）。
4. 流式更新：`AcpClientConnection.tryHandleNotification`（`:184`）分发 `session/update` → adapter 的 update 监听 → `classifyAcpTranscriptSessionUpdate`（`transport/acpTranscriptBoundary.ts:23`）→ `handleAcpChatTranscriptSessionUpdate`（`chat/acpChatTranscriptMirror.ts:621`）→ 累积/合并 assistant 文本段 → 通知 workspace。
5. 结束：`finishAcpExecutionProgress`（`:2990` 等）+ transcript flush（`flushPendingChatTranscriptWrites:2448`）。
6. 取消：`cancelAcpConversationPrompt()`（`:3094`）→ 取消排队中的权限请求 → `adapter.cancel({sessionId})`（`acpConnectionAdapter.ts:2019` → `notifySessionCancel:415`）；失败则 `forceStopAcpChatPrompt`；成功后挂 `watchPromiseSettlement` 宽限期看门狗（`:3132`），超时强制停止。
7. 权限：adapter 反调 `requestPermission` → `AcpPermissionQueue` → `resolveAcpConversationPermission()`（`:3466`）。

### 4.3 执行一次 skill run

`executeAcpSkillRunnerJob()`（`skillRun/acpSkillRunnerOrchestrator.ts:592`），按代码顺序：

1. `assertAcpSkillRunRequest` → `createCancellationController()`（AbortController 包装）→ `createAcpSkillRunnerWorkspace()`（`acpSkillRunnerWorkspace.ts:163`）。
2. `initializeAcpSkillRunAuditTrail()` → `upsertAcpSkillRun({status:"queued", statusReason:"create"})` → `registerAcpSkillRunSetupController()`（阶段 `workspace-created`，`:665`）。
3. `args.onProgress({type:"request-created"})`；阶段 `acp-skillrunner-start`（`:787`）→ `input-manifest-written`（`:842`）。
4. `scanRegistry` → 阶段 `registry-ready`（`:858`）→ `buildAcpSkillInjectionPlan()`（`acpAgentFamilyResolver.ts:231`）→ 阶段 `skill-injection-planned`（`:895`）。
5. `materializeAcpSkill()`（含 `acpSharedSkillCatalog` + `acpThinProxySkillMaterializer`）→ 阶段 `skill-materialized`（`:940`）。
6. `validateAcpSkillRunRequestAgainstSchemas()`（`acpSkillSchemaAssets.ts:284`，`:975`）。
7. host bridge CLI 注入 → 阶段 `host-bridge-cli-ready`（`:1036`）。
8. `buildAcpRuntimeDependencyPlan()`（`acpRuntimeDependencyWrapper.ts:369`）→ 阶段 `runtime-dependencies-resolved`（`:1075`）。
9. `createAdapter()`（默认 `createAcpConnectionAdapter`）→ 阶段 `adapter-created`（`:1201`）。
10. `runPrompt()`（`:373`）：`adapter.initialize()` → `adapter.newSession()`（阶段 `acp-session-created`）→ `prepareSession` → `adapter.prompt()`（阶段 `prompt-started:500` / `acp-prompt-finished:516`）。
11. 输出收敛 `convergeAcpSkillTurnOutput` → 校验 `acpSkillOutputValidator` → 阶段 `output-validation-succeeded`（`:2259`）或 repair 轮（`:2555` `repair-started`，`maxRepairRounds`）。
12. 进入等待用户回复 / detach（阶段 `waiting-user:2400`、`reply-received:2413`、`detached-reply-output-validation-succeeded:2462`）。
13. apply：由 workflow 层调用（`modules/workflowExecution/applySeam.ts:795,890` → `markAcpSkillRunApplyResult`）。
14. 取消路径：阶段 `cancel-requested:1730` / `interrupt-requested:1759` / `interrupt-forced:1831` / `canceled:1922`；硬超时 `hard-timeout-disconnect-requested:1335`。

### 4.4 后端刷新与诊断

- 轻量刷新：`refreshAcpConversationBackends()`（`chat/acpSessionManager.ts:2709`）→ `loadBackendsRegistry` → 重建缓存 → 广播 `kinds:["backend"]`。
- 运行时选项缓存：`probeAcpBackendRuntimeOptions` / `buildAcpRuntimeOptionsCache`（`transport/acpBackendProbe.ts`），结果写入 `BackendInstance.acp.runtimeOptionsCache`（`src/backends/types.ts:46-69`）。
- 深度诊断菜单：`registerAcpBackendRefreshCacheDiagnosticMenu()`（`diagnostics/acpBackendRefreshCacheDiagnostic.ts`），常量显示 11 步/后端（`:43`），含 PowerShell 捕获、resolved exe spike、Node bridge、WebSocket bridge、stdin 矩阵等探测，整体阶段超时 60s（`:41`），并生成内嵌 Node 探测脚本（socket/child/server 代码在脚本模板内，约 `:2346-2500`）。
- 运行时诊断分级：`acpRuntimeDiagnosticsMode.ts` 引用计数；`recordAcpRuntimeDiagnostic`（`acpDiagnosticRouter.ts`）统一路由，异常被吞以保护执行路径。

### 4.5 启动 reconcil 与恢复

1. `src/hooks.ts:702` → `reconcileAcpSkillRunWorkflowTasksOnStartup()`（`acpSkillRunPersistence.ts:1085`）：清除过期 terminal 会话活动（`:1140`），本地 controller 丢失但远端可恢复时置 `startup-recovery-available`（`:1178`），否则 `startup-recovery-unavailable`（`:1200`）。
2. 用户触发恢复：`recoverAcpSkillRunConversation()`（`acpSkillRunRecovery.ts:952`）→ 解析后端（`:782`）→ 重建 adapter → `session/load` 或 `resume` → `continueRecoveredSequenceStep()`（`:476`）→ 复用 `executeAcpSkillRunnerJob`（`:185`）。
3. workflow workspace 复用：`registerAcpWorkflowWorkspaceForReuse()`（`acpSkillRunnerWorkspace.ts:137`，调用点 `acpSkillRunRecovery.ts:522`）。
4. 结果重放：`reapplyAcpSkillRunResult()`（`:712`），被 `hostBridgeCapabilityRegistry.ts:2795` 调用。

---

## 5. 关键状态与持久化

### 5.1 SQLite（`src/modules/pluginStateStore.ts`，domain `"acp"`）

- 常量：`PLUGIN_TASK_DOMAIN_ACP = "acp"`（`:35`）、`PluginRunStoreKind = "acp" | "skillrunner"`（`:79`）。
- Chat 会话行：`upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, …)`（`chat/acpConversationStore.ts:520` 会话索引、`:674` 重命名、`:778` frontend state、`:813` 会话快照）；scope `"active"`。
- Chat 会话删除：`replacePluginTaskRowEntries` 保留集合（`:472`）+ `removeRuntimePath(conversationStorageDir)`（`:484`，注意是 `void` 非 await）。
- Skill run 行：`upsertPluginRunStoreEntry("acp", {runKey: requestId, …})` + `appendPluginRunEventStoreEntry("acp", …)`（`skillRun/acpSkillRunPersistence.ts:891,929`）；表 `plugin_acp_skill_runs` / `plugin_acp_skill_run_events`（`pluginStateStore.ts:945-946,1074-1084`）。
- Skill run 清理：`deleteAcpSkillRunRecord`（`acpSkillRunStore.ts:897`）、`cleanupExpiredAcpSkillRunsForRetention`（`acpSkillRunPersistence.ts:1216`，由 `runtimePersistenceGovernance.ts:854` 按 `getTaskHistoryRetentionConfig()` 驱动）。
- 注意：`persistRun` 对 `backendType !== ACP_BACKEND_TYPE` 直接 return（`acpSkillRunPersistence.ts:872`）。

### 5.2 runtime 文件（`src/modules/runtimePersistence.ts`）

- `acpChatRoot = <runtimeRoot>/acp/chat`（`:618`）、`acpChatWorkspaceDir = …/chat/workspace`（`:631`）、`acpChatConversationsDir = …/chat/conversations`（`:632`）、`legacyAcpChatWorkspacesDir`（`:633`，注释标明为 legacy，新写走 conversations）、`acpSkillRunsDir = <runtimeRoot>/acp/skill-runs`（`:634`）。
- Chat 会话目录：`joinPath(acpChatConversationsDir, backendId, conversationId)`，含 `diagnostics.ndjson`（`chat/acpConversationStore.ts:377-392`）。
- Chat transcript：复用 skill run transcript 路径（`chat/acpConversationTranscriptStore.ts:24-26`）。
- Skill run：`transcript.jsonl` + `transcript.index.json`（`skillRun/acpSkillRunTranscriptStore.ts:161-162`）、`run-context.json` + `output-revisions.jsonl`（`skillRun/acpSkillRunPayloadStore.ts:49-50`）。
- WebSocket bridge：ready file `ready-<ts>.json`、日志 `zotero-acp-bridge.log`（`transport/acpWebSocketBridgeService.ts:287-289`）。

### 5.3 内存状态（模块级）

| 状态 | 位置 | 释放/上限 |
| --- | --- | --- |
| `sessionRuntimes: Map` | `chat/acpSessionManager.ts:279` | `pruneAcpChatSessionRuntimesForBackends:3774`、`shutdownAcpSessionManager:3850`、测试 reset |
| `chatTranscriptWrites: Set<Promise>` | `:280` | `flushPendingChatTranscriptWrites:2448` |
| `scopedAdapterFactories: Map` | `:268` | `unregisterAcpConnectionAdapterFactory:3934` |
| Chat transcript 冷镜像 LRU | `chat/acpChatTranscriptMirror.ts:45`（limit 10） | `clearAcpChatTranscriptMirrorLru:386`、`pruneIdleAcpChatBackgroundTranscriptMirrors:476`、`releaseIdleAcpChatBackgroundTranscriptMirror:466` |
| `runRecords: Map`（全部已持久化 run） | `skillRun/acpSkillRunStore.ts`（hydrate 自持久层） | `deleteAcpSkillRunRecord:897`、retention、`resetAcpSkillRunsForTests:910` |
| `transcriptLiveStates: Map` | `:614` | `:898` 随 run 删除；`pruneInactiveAcpSkillRunTranscriptMirrors`（`acpSkillRunTranscriptMirror.ts:619`） |
| `waitingUserDetachTimers: Map` | `:615` | `:827,:843` 清理；TTL `30 * 60 * 1000`（`:676`） |
| `activeRunRequestIds: Set` | `:675` | `:742,:901,:913` |
| `softRunPersistTimers` / `softRunPersistRecords` / `lastPersistedEventIds` | `skillRun/acpSkillRunPersistence.ts:942-944` | `persistRun:877-882`、reset `:744-749` |
| `runtimeFileWrites: Set<Promise>` | `:752` | `flushAcpSkillRunRuntimeFileWrites:817` |
| `transcriptIndexStates` / `transcriptWriteKeys` | `skillRun/acpSkillRunTranscriptStore.ts:78-79` | 需进一步核查（见 §9） |
| `states: Map`（执行进度） | `transport/acpExecutionProgress.ts:30` | `releaseAcpExecutionProgress`，调用点 `acpSessionManager.ts:3890,3959`、`acpSkillRunStore.ts:899,908` |
| `workflowWorkspacesByRunId: Map` | `skillRun/acpSkillRunnerWorkspace.ts:52` | 仅测试 reset `:159`（见 §9 疑点） |
| `catalogBuildInflight: Map` | `skillRun/acpSharedSkillCatalog.ts:199` | promise settle 后自删（`:217-218`） |
| `leaseTails: Map` | `transport/acpNpxLaunchCache.ts:44` | 尾部结算自删（`:203,215`） |
| `activeSyntheticAdapters: Map` | `transport/acpSyntheticConnectionAdapter.ts:30` | 需确认（见 §9） |
| `claimAttempts/activeTurns/activeRequests/registeredRequestActivities/finishWaiters` | `diagnostics/acpRuntimeSemanticTraceRecorder.ts:134-158` | `resetAcpRuntimeSemanticTraceRecorder:668`、`shutdown…:712` |
| `discardedOwners: Set` | `diagnostics/acpChatDiagnosticAuditTrail.ts:7` | `discardAllAcpChatDiagnosticAuditsForTests` |
| `acpChatWorkspaceListeners` / `workspaceListeners` | `chat/acpChatWorkspaceDataPlane.ts:124` / `skillRun/acpSkillRunWorkspaceDataPlane.ts:173` | `clearAcpChatWorkspaceListeners`（facade）、测试 reset |

### 5.4 谁负责清理

- 插件卸载：`src/hooks.ts:1184-1237` 注册的钩子——`acp-skills-detach`、`acp-chat-detach`、`acp-audit-drain`、`acp-websocket-bridge-shutdown`、`acp-runtime-semantic-trace-recorder-shutdown`、`acp-runtime-replay-controller-shutdown`。
- 启动：`reconcileAcpSkillRunWorkflowTasksOnStartup()`（`hooks.ts:702`）。
- 历史清理：`cleanupRuntimePersistenceRetention()`（`runtimePersistenceGovernance.ts:841`）→ ACP skill run retention + 删除其 runtime 目录（仅删除位于 `paths.acpSkillRunsDir` 之下者，`:867-875`）。
- 会话级：`deleteActiveAcpConversation`（`acpSessionManager.ts:3311`）、`archiveAcpConversation`（`:3200`）、`deleteAcpConversationState`（`acpConversationStore.ts:932`）、`clearAcpConversationState`（`:960`）。

---

## 6. 并发 / 异步 / 生命周期

### 6.1 长生命周期对象

| 对象 | 创建位置 | 释放位置 |
| --- | --- | --- |
| agent 子进程 + transport | `launchAcpTransport`（`transport/acpTransport.ts:2599`，三条分支：`launchMozillaAcpTransport` / `launchNodeAcpTransport` / `launchWebSocketBridgeAcpTransport:1949`） | `transport.close()`（`:1356` 起：grace → SIGTERM(进程组) → 重新校验所有权 → SIGKILL → 直接 `proc.kill` 回退 → 移除 supervisor pid 文件） |
| `AcpClientConnection` | `acpConnectionAdapter` 内部 | `closed` promise（`acpClientConnection.ts:94`）；`receiveLoop` 结束即 `resolveClosed` 并 reject 所有 pending（`:100-119`） |
| WebSocket bridge 单例进程 | `startBridgeService()`（`acpWebSocketBridgeService.ts:266`），`ensureAcpWebSocketBridgeService:341` | `shutdownAcpWebSocketBridgeService:368`（best-effort `proc.kill`）；进程退出后单例自清（`:322-330`） |
| Chat adapter | `ensureAdapter`，受 `MAX_LIVE_ACP_CHAT_ADAPTERS=3` 约束（`:298,690`） | `disconnectAcpConversation:2797`、驱逐、`shutdownAcpSessionManager:3850` |
| Skill run setup controller | `registerAcpSkillRunSetupController`（orchestrator `:704`） | controller `cancel()` → `setupAbortController.abort()` + `setupAdapter?.close()` |
| 权限队列 resolver | `AcpPermissionQueue` / `acpSkillRunPermissionQueue.ts:61` | 解决 / `clearStaleAcpSkillRunPermissionRequest:197` / `resolveAcpSkillRunPermissionRequest:241` |
| 诊断/审计追加 | `acpAuditAppendCore.ts`（pending 上限 2048 条 / 2MB） | `releaseAcpSkillRunAuditTrailWrites`（hooks）、`flushAcpChatDiagnosticAudit` |

### 6.2 定时器（`setTimeout` 59 处、`setInterval` 3 处）

分文件前三：`diagnostics/acpBackendRefreshCacheDiagnostic.ts` 14、`diagnostics/acpRuntimeReplayPublicationSidecar.ts` 8、`chat/acpSessionManager.ts` 7。代表性机制：

- prompt 中断宽限看门狗：`watchPromiseSettlement(activePrompt.promise, acpChatPromptInterruptGraceMs, forceStop)`（`acpSessionManager.ts:3132`），默认值来自 `DEFAULT_ACP_PROMPT_INTERRUPT_GRACE_MS`（orchestrator import）。
- soft persist 去抖：`scheduleSoftRunPersist`（`acpSkillRunPersistence.ts:946`）；`persistRun` 会先清掉同 requestId 的 pending timer（`:877`）。
- 等待用户回复的 detach TTL 定时器（`acpSkillRunStore.ts:676` 30 分钟）。
- 定时器可检视性：`inspectAcpChatSessionTimers`（`:982`）、`inspectAcpSkillRunSoftPersistReplayTimers`（`acpSkillRunPersistence.ts:972`）、`inspectAcpSyntheticConnectionAdapterTimers`（`acpSyntheticConnectionAdapter.ts:39`）、`inspectAcpRuntimeReplayLogicalTime` 系列。
- `unref()` 出现 3 次（探测脚本/子进程场景）。

### 6.3 取消 / 超时 / 重试机制

**取消**：
- Chat prompt：`cancelAcpConversationPrompt` + 宽限看门狗 + `forceStopAcpChatPrompt`；`snapshot.promptInterruptState` 状态 `idle|requested|confirmed|forced|unconfirmed`（`src/modules/acpTypes.ts:22-37`）。
- Skill run：`AcpSkillRunSetupController.cancel`（orchestrator `:678`）、`cancelAcpSkillRun` / `interruptAcpSkillRunCurrentTurn`（`acpSkillRunActions.ts:103,171`）、`cancelAcpRuntimeReplayController`（`acpRuntimeReplayController.ts:403`）。
- 传输级：`transport.close({graceMs, kill})`（`acpTransport.ts:165-168`）。

**超时**：
- 启动阶段 `ACP_SKILL_STARTUP_PHASE_TIMEOUT_MS = 60_000`（orchestrator `:97`），经 `waitForBoundedPromise`（`utils/wait`）。
- 传输关闭 grace / kill wait 常量（`acpTransport.ts` 内 `ACP_TRANSPORT_CLOSE_GRACE_MS`、`ACP_TRANSPORT_KILL_WAIT_MS`）。
- 诊断阶段超时族（`acpBackendRefreshCacheDiagnostic.ts:41-52`：60s 阶段、5s toast、2s raw exit、500ms post-spawn、30s file capture、15s resolved exe、15s node bridge、20s websocket bridge、5s stdin 矩阵）。
- skill run 硬超时：`hard-timeout-disconnect-requested` 阶段（orchestrator `:1335`）。

**重试**：
- adapter 级：claude raw SDK meta 被拒后禁用扩展重试（`acpConnectionAdapter.ts:706-716,1740-1743`）；`acpReasoningEffortFallback.ts`。
- 输出 repair 轮：`maxRepairRounds`（orchestrator deps `:191`）+ 阶段 `repair-started:2555`。
- 事务级：无通用「重试队列」；恢复靠 `acpSkillRunRecovery.ts` 显式用户/宿主触发。

---

## 7. 协议边界

### 7.1 编解码

- **帧格式**：NDJSON。`createAcpNdJsonMessageStream(output, input)`（`transport/acpMessageStream.ts:37`）：`TextEncoder`/`TextDecoder` + 行缓冲 + 等待队列；错误类型 `AcpMessageStreamError` 带 `stage`。
- **消息格式**：JSON-RPC 2.0。`acpClientConnection.ts:151,346,360` 处显式写 `jsonrpc: "2.0"`；`processMessage:147` 按 request / notification / response 三分支；`handleResponse:214` 按 id 匹配 `pendingResponses`。
- **方法名常量**：`ACP_AGENT_METHODS`（`acpProtocol.ts:5`）、`ACP_CLIENT_METHODS`（`:18`）；`ACP_PROTOCOL_VERSION = 1`（`:3`）。
- **client 侧反向方法**：只实现 `session/request_permission`（`acpClientConnection.ts:170-175`），未知方法返回 `methodNotFound`（`:177`）。
- **非标准通知兜底**：未知 notification 转 `client.providerNotification`（`:193`）。
- **Trace**：`traceMessage("in"/"out", …)` + `onTrace`，adapter 侧映射为 `jsonrpc_trace` 诊断（`acpConnectionAdapter.ts:646`）。

### 7.2 是否对后端做特判

存在，但集中在少数几处：

| 特判 | 位置 | 性质 |
| --- | --- | --- |
| `isClaudeFamilyBackend()`（`agentFamily === "claude-code"`）→ 请求 `_claude/sdkMessage` 扩展、缓冲并投影 assistant 文本、被拒后禁用 | `transport/acpConnectionAdapter.ts:654-760,901-916,1296,1714,1740` | **provider 私有协议扩展**，非 transcript 语义 |
| MCP 兼容模式（`mcpCompatibilityMode`，默认 `disabled_by_default`）影响 prompt 文本与引导 | `acpConnectionAdapter.ts:167,380-396,963,1975` | 后端能力差异 |
| `agentFamily` 分支（codex / claude-code / gemini-cli / qwen-code / kilo / hermes / …）影响 skill injection root、启动前言、prompt 包装、运行时依赖包装 | `skillRun/acpAgentFamilyResolver.ts:79,122,231`、`acpStartupPromptPreambles.ts:21`、`acpSkillRunPromptBuilder.ts:33-60`、`acpRuntimeDependencyWrapper.ts:430` | 后端集成差异（非 transcript） |
| Windows 走 WebSocket bridge 而非直接子进程 | `acpTransport.ts:2603-2605`（`detectRuntimePlatform() === "win32" && shouldUseAcpWebSocketBridgeTransport()`） | 平台差异 |
| 预设表按 `agentFamily` 归类（opencode/codex/claude-code/gemini-cli/hermes/qwen-code/kilo/codebuddy/…） | `chat/acpBackendPresets.ts:83-266` | 配置预置 |

**transcript 分类器本身不含后端特判**：`transport/acpTranscriptBoundary.ts` 是纯 switch on `updateKind`（`:43-72`），`classifyAcpTranscriptSemanticUpdate` 输出 9 类语义 kind，`tool_call_update`/`usage_update`/`status_update`/`workspace_activity` 等归为 `soft-side-channel`（不切断 assistant 文本段），与 `AGENTS.md`「ACP Transcript Projection 硬约束」一致（`agent_message_chunk` → `text-continuation`）。

---

## 8. 测试覆盖（`tests/acp/`，34 个文件）

| 文件 | 主题 |
| --- | --- |
| `96-acp-conversation-store.test.ts` | 会话持久化存储 |
| `96-acp-session-manager-lifecycle.test.ts` | 会话生命周期 |
| `96-acp-session-manager-multi-session.test.ts` | 多会话/活会话上限 |
| `96-acp-session-manager-permissions.test.ts` | 权限队列与解决 |
| `96-acp-session-manager-runtime-options.test.ts` | mode/model/effort 运行时选项 |
| `96-acp-session-manager-transcript.test.ts` | Chat transcript 投影与合并（91KB） |
| `97-acp-ui-smoke.test.ts` | Assistant Workspace ACP UI 冒烟（137KB） |
| `98-acp-skill-run-hosts-leaf.test.ts` | host 注入槽叶子模块 |
| `98-acp-transport.test.ts` | transport 全量（110KB，最大） |
| `99-acp-message-stream.test.ts` | NDJSON 分帧 |
| `100-acp-client-connection.test.ts` | JSON-RPC 连接（44KB） |
| `100a-acp-npx-launch-cache.test.ts` | npx 启动缓存/租约 |
| `103-acp-opencode-mcp-integration.test.ts` | OpenCode MCP 真实集成 |
| `108-acp-execution-progress.test.ts` | 执行进度计数 |
| `110-acp-shared-skill-catalog-thin-proxy.test.ts` | 共享 catalog + thin proxy |
| `111-acp-backend-probe.test.ts` | 后端探测 |
| `130-acp-skill-run-request-adapter.test.ts` | 请求适配 |
| `166-acp-websocket-bridge-packaging.test.ts` | WS bridge 打包 |
| `167-acp-skills-concurrent-submission.test.ts` | 并发提交/setup 生命周期 |
| `171-acp-runtime-memory-governance.test.ts` | 运行时内存治理（48KB） |
| `175…182` （8 个） | profiler、silent 基线、silent collector、semantic trace、replay profiler、replay controller、replay logical time、replay publication sidecar |
| `184-assistant-workspace-publication-data-plane.test.ts` | Assistant Workspace publication data plane（71KB） |
| `195-acp-tool-call-display-contract.test.ts` | tool-call 显示契约 |
| `197-acp-synthetic-connection-adapter.test.ts` | 合成 adapter |
| `199-acp-skill-run-module-boundaries.test.ts` | 聚焦模块所有权（status 谓词、controller registry、permission queue、runtime catalog、workspace selection、archive 路由）——**不检查目录级依赖方向** |
| `248-dashboard-acp-trace-replay.test.ts` | Dashboard trace/replay 区域 |

相关但不在 `tests/acp/`：`tests/skillrunner/107-…`、`tests/skillrunner/154-…`、`tests/skillrunner/198-…`（经 codegraph caller 分析命中）。

---

## 9. 疑点（仅列出待核查项，不下结论）

1. **`workflowWorkspacesByRunId` 可能无生产清理路径**。`skillRun/acpSkillRunnerWorkspace.ts:52` 定义，`:152`、`:217` 写入（每个 workflow run id 一条，含 `namespaceCountsBySkillId` Map），唯一的 clear 是测试专用的 `resetAcpWorkflowWorkspaceRegistryForTests`（`:159`）。生产侧只见过 `registerAcpWorkflowWorkspaceForReuse` 的写入调用（`acpSkillRunRecovery.ts:522`）。**待核查**：workflow run 结束后是否有其他模块调用 clear，或该 Map 随会话数无界增长。
2. **`removeConversationStorageDir` 的删除是 fire-and-forget**。`chat/acpConversationStore.ts:484` 使用 `void removeRuntimePath(...)`，删除失败不会反馈给调用方；同一函数上方刚做过 SQLite 行删除（`:472`）。**待核查**：失败是否会被上层诊断捕获。
3. **`acpBackendRefreshCacheDiagnostic.ts:2493` 的空 `catch {}`**。经核实该段位于**内嵌的 Node 探测脚本模板**内（`const child = spawn(...)` / `server.listen(0, …)`，约 `:2330-2500`），不在插件运行时路径上——但同一文件把「插件代码」与「生成的 Node 代码」混在同一个 4169 行的 TS 文件里，**待核查**：是否有 lint/测试约束这段字符串的语法正确性。
4. **Chat transcript 镜像与 SkillRun transcript 镜像疑似重复实现**。`chat/acpChatTranscriptMirror.ts`（792）与 `skillRun/acpSkillRunTranscriptMirror.ts`（1439）各自持有冷镜像 LRU 常量（分别 `:45` 与 `:61`，值都为 10）、分页默认/上限、prune 函数。两者是否共享投影逻辑、还是并行实现，**待核查**。
5. **权限队列疑似两套**。`skillRun/acpPermissionQueue.ts`（通用类）与 `skillRun/acpSkillRunPermissionQueue.ts`（模块级函数 + 状态）并存，另有 `acpSkillRunPermissionFacade.ts`。**待核查**：是否存在同一语义的重复实现，以及 hostBridge 的注册是否与内部调用路径重叠。
6. **`ACP_RUNTIME_SEMANTIC_TRACE` 相关全局 Set/Map 的清理条件**。`diagnostics/acpRuntimeSemanticTraceRecorder.ts:134-158` 的 `claimAttempts` / `activeTurns` / `activeRequests` / `registeredRequestActivities` 依赖 `finish`/`cancel`/`shutdown`/reset 清理；在 trace 被 arm 后异常中断的场景下是否有兜底，**待核查**。
7. **`activeSyntheticAdapters`（`transport/acpSyntheticConnectionAdapter.ts:30`）的注销路径**。未在扫描中看到显式 delete（仅测试 reset 相关导出）。**待核查**。
8. **`transcriptIndexStates` / `transcriptWriteKeys`（`skillRun/acpSkillRunTranscriptStore.ts:78-79`）的生命周期**。文件内未见对应 release；分页缓存若成为长驻状态，需确认其上限。**待核查**。
9. **`acpSkillRunStore.runRecords` 的内存规模等于全部已持久化 run**（hydrate 后驻留）。retention（`acpSkillRunPersistence.ts:1216`）能删除过期行，但触发频率取决于 `runtimePersistenceGovernance` 的调用者。**待核查**：长时间不清理时内存占用上界。
10. **`acpSharedSkillCatalog.catalogBuildInflight`（`:199`）是全局去重 Map**，键来自 catalog root；promise settle 后自删（`:217-218`），但没有并发上限。**待核查**：大量不同 catalog root 并发时是否会长时间持有大对象。
11. **文档与代码可能漂移**：`docs/components/transport.md` 仅 44 行、`## 当前状态` 段落措辞暗示「仍在演进」；而 `src/modules/acp/transport/` 已有 2620 行的 transport 与 2165 行的 adapter。**待核查** `docs/components/transport.md` 的「通用层抽取条件」是否仍与实际结构一致。另 `docs/acp-skills-state-machine-ssot.md`（729 行）自述为 SSOT，`## Implementation Mapping` 段落可能与 `acpSkillRunStore.ts:132` 的 8 个状态枚举存在偏差——**建议逐项对照**。
12. **`acpRuntimeReplayProductionPorts.ts:224` 的 `createAcpRuntimeR2ProductionNoopPort`**：生产代码中存在显式 noop 端口。**待核查**：是否存在某条 replay 路径在未接线端口上静默通过。
13. **`tests/acp/199-acp-skill-run-module-boundaries.test.ts` 名为「module boundaries」，实际只断言聚焦模块的行为**（阅读全文确认），不校验目录级依赖方向或「acp 不得 import UI」这类边界。**待核查**：是否存在其他测试（如 scripts 下的治理脚本）承担该职责。
14. **`acpConnectionAdapter.ts` 的 claude 特判与 `AGENTS.md` 的转录约束的边界**：约束明确禁止的是 *transcript message coalescing* 层面的后端特判；claude 文本是经 `bufferClaudeRawSdkAssistantText` → `flushClaudeRawSdkAssistantText`（`:746,:901`）注入的 fallback 路径。**待核查**：这条 fallback 是否绕过了 `acpTranscriptBoundary` 的 soft/hard 边界分类，从而在 claude 后端上产生不同的文本分段行为。

---

## 10. 未覆盖范围

### 完整读过（全文或等价全文）
- `src/modules/acp/transport/acpTranscriptBoundary.ts`（77 行，全文）
- `tests/acp/199-acp-skill-run-module-boundaries.test.ts`（124 行，全文）
- codegraph explore 已返回全文（视为已读）：`chat/acpSessionManager.ts`（部分区块）、`transport/acpConnectionAdapter.ts`（部分区块）、`transport/acpTransport.ts`（部分区块）、`transport/acpClientConnection.ts`（部分区块）、`skillRun/acpSkillRunStore.ts`（部分区块）、`skillRun/acpSkillRunnerOrchestrator.ts`（部分区块）、`src/backends/types.ts`（全文）、`src/providers/contracts.ts`（片段）

### 部分读过（按行区间，用于取证）
- `chat/acpSessionManager.ts`：`:1-120`、`:690-760`、`:1195-1280`、`:2283-2313`、`:2612-3140`、进度/清理相关散点
- `transport/acpTransport.ts`：`:86-185`、`:1350-1459`
- `transport/acpClientConnection.ts`：`:100-229`
- `transport/acpMessageStream.ts`：`:1-80`
- `skillRun/acpSkillRunStore.ts`：`:125-300`、`:600-710`
- `skillRun/acpSkillRunnerOrchestrator.ts`：`:94-280`、`:373-420`、`:592-700`
- `skillRun/acpSkillRunPersistence.ts`：`:867-945`
- `skillRun/acpSkillRunnerWorkspace.ts`：`:125-224`
- `chat/acpConversationStore.ts`：`:1-80`、`:440-549`
- `chat/acpChatWorkspaceDataPlane.ts`：`:100-180`、`chat/acpChatWorkspaceEmissionFacade.ts` `:1-60`
- `diagnostics/acpBackendRefreshCacheDiagnostic.ts`：`:1-60`、`:2330-2360`、`:2480-2500`
- `skillRun/acpSkillRunHosts.ts`：`:1-30`
- `src/hooks.ts`、`src/providers/acp/provider.ts`：按匹配行局部读取

### 仅通过导出清单/rg 归纳、未逐行阅读
- `skillRun/` 的 41 个文件中约 30 个（物化、schema、输出收敛、审计、投影、权限等）——角色判定基于导出符号名与依赖统计
- `diagnostics/` 18 个文件中约 14 个（replay 家族、profiler 家族）
- `chat/` 的 `acpBackendPresets.ts`、`acpChatSkillInjection.ts`、`acpContextBuilder.ts`、`acpModelOptionFolding.ts`、`acpReasoningEffortFallback.ts`、`acpSessionConfigOptions.ts`、`acpSidebarModel.ts`、`acpSkillInjection` 相关
- `transport/` 的 `acpBackendProbe.ts`、`acpNpxLaunchCache.ts`、`acpSyntheticConnectionAdapter.ts`、`acpPermissionOptions.ts` 等
- `src/modules/acpProtocol.ts`、`src/modules/acpTypes.ts`：仅读取常量与类型定义行附近

### 未检查
- 任何构建/类型检查/lint/测试运行结果（任务禁止）
- `src/modules/acp/` 之外调用方的内部实现（只看了调用点行）
- `openspec/` 与 `docs/` 与代码的逐条对照（仅列了疑似漂移点，未逐段核实）
- 运行时行为验证（无本地运行）

### 未覆盖风险的说明
第 9 节所有疑点均为静态阅读推断，未经验证；尤其「未释放资源」「无界增长」类判断需要动态或针对性测试才能定性。第 4 节流程的**顺序**来自代码中阶段事件（`stage: "…"`）的行号排序，可能与真实异步交错顺序不同。
