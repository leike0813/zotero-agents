# SkillRunner / Providers / Backends 只读侦察报告

- 侦察时间基准：工作区 HEAD `d75221a7`（`research(e2e-wayfinder): catalog historical cross-boundary regressions for issue #43`）
- 侦察方式：只读（read / rg / grep / codegraph）。未修改任何文件、未执行构建或测试。
- 规模事实：`src/modules/skillRunner/` 共 **36** 个 `.ts`，**25016** 行；`src/providers/` 31 个文件（含 12 个 `models/*.json`）；`src/backends/` 5 文件；`src/jobQueue/` 3 文件；`src/config/` 1 文件；`src/platform/` 8 文件；`src/utils/` 14 文件。
- **范围校正：`src/handlers/` 在本仓库不存在**（`find src -maxdepth 2 -iname '*handler*'` 无结果；全仓唯一含 Handler 的文件是 `src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts`，属 Synthesis 域）。`tests/tooling/12-handlers.test.ts` 实际测的是 Zotero Host capability broker（`src/modules/zoteroHost/zoteroHostNativeMutations`），与 `src/handlers/` 无关。详见第 10 节。

---

## 1. 职责与边界

### 1.1 SkillRunner 模块做什么

SkillRunner 是插件面向**旧式 Skill-Runner HTTP 后端服务**的完整客户端侧实现，横跨四层：

| 层 | 职责 | 关键证据 |
| --- | --- | --- |
| connection | 后端握手/能力协商、可达性探测与自动禁用、物理连接调度治理、连接审计 | `src/modules/skillRunner/connection/` |
| run | 运行记录与事件、状态机、会话事件流同步、任务对账、前台续跑、自动回复 | `src/modules/skillRunner/run/` |
| runtime | 本地 runtime 的部署/启停/版本/lease/ctl 桥接/调试日志 | `src/modules/skillRunner/runtime/` |
| surface | Assistant Workspace publication adapter、运行工作台读模型、侧栏模型、toast、管理/调试对话框 | `src/modules/skillRunner/surface/` |

它的对外协议契约由 `src/providers/contracts.ts` 定义（`skillrunner.job.v1`、`skillrunner.sequence.v1`、`http.steps`），HTTP 传输在 `src/providers/skillrunner/client.ts`，管理面（history/events/reply/auth）在 `src/providers/skillrunner/managementClient.ts`。

### 1.2 与 ACP 模块的关系与分工

两者是**同一抽象下的两个 Provider 实现**，不是主从关系：

- 抽象层：`src/providers/types.ts:102` 的 `Provider`；`src/providers/registry.ts:22` 注册 4 个 provider（skillrunner / acp / generic-http / pass-through）。
- SkillRunner 走 HTTP：`SkillRunnerProvider.execute` → `SkillRunnerClient.executeSkillRunnerJob`（`src/providers/skillrunner/provider.ts:457`、`:639`）。
- ACP 走本地 agent 进程 + ACP 协议：`AcpProvider.execute` → `executeAcpSkillRunnerJob`（`src/providers/acp/provider.ts:197`、:203，实现在 `src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts`）。
- **偶合点**：`skillrunner.sequence.v1` 允许两种后端（`src/providers/requestContracts.ts:28-42` 的 `compatiblePairs`），由 `SkillRunnerProvider` 或 `AcpProvider` 承接，序列编排统一在 `src/modules/workflowExecution/sequenceRuntime.ts`。
- **互斥的落盘/镜像机制**：ACP 用 cold full mirror LRU（`src/modules/acp/chat/acpChatTranscriptMirror.ts`、`src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts` 调 `createAssistantTranscriptMirrorLru`）；SkillRunner **不建** LRU mirror，直接用有界内存会话历史供页（见第 5 节）。这印证 AGENTS.md 中「SkillRunner 不维护 cold full mirror cache」的约束。
- ACP prompt 通路当前是**桩**：`src/providers/acp/provider.ts:236` 日志 stage 为 `provider-acp-dispatch-stubbed`，返回 `phase: "sidebar-global-chat"`。

### 1.3 Provider 抽象解决什么问题

消除「workflow 编排」与「后端协议」的耦合，把 N×M 收敛成 N+M：

1. **按 `requestKind + backend.type` 解析唯一 Provider**：`resolveProvider`（`src/providers/registry.ts:129`）。
2. **注册期 + 解析期双重契约校验**：`PROVIDER_REQUEST_CONTRACTS` 表（`src/providers/requestContracts.ts:19-68`）声明 `providerType`/`backendType`/可选 `compatiblePairs`/`validatePayload`；`assertRequestKindBackendCompatible`（:689）与 `assertProviderRequestDispatchContract`（:761）在 `executeWithProvider` 内先后执行（`src/providers/registry.ts:133`、:164）。
3. **统一结果与进度 DTO**：`ProviderExecutionResult` = `succeeded | deferred | failed/canceled`（`src/providers/contracts.ts:298`）；`ProviderProgressEvent`（`src/providers/types.ts:44`）。
4. **运行时选项 schema 由 Provider 自持**：`getRuntimeOptionSchema` / `getRuntimeOptionEnumValues` / `normalizeRuntimeOptions`（`src/providers/types.ts:107-116`），泛型兜底在 `normalizeWithSchema`（`src/providers/registry.ts:63`）。
5. **无后端 profile 的 Provider**：`Provider.requiresBackendProfile === false`（`src/providers/types.ts:104`），`PassThroughProvider` 与 `GenericHttpProvider` 在 workflowSettings 中据此获得虚拟 `local://` backend（`src/modules/workflow/settings/workflowSettings.ts:303-311` `buildLocalBackendForProvider`）。

### 1.4 backends 注册机制

- **单一事实源是 Zotero pref `backendsConfigJson`**，不是文件（`src/backends/registry.ts:28` `BACKENDS_CONFIG_PREF_KEY`；`src/backends/registry.ts:720-722` `sourcePath = "prefs"`）。
- 文档形状 `{ schemaVersion: 2, backends: BackendInstance[] }`（`src/backends/registry.ts:17`、:31、:713`createBackendsPrefsDocument`）。
- 读取用「rawText 指纹 + 内存缓存」：`backendRegistryCache`（:47、:120 `cacheLoadedBackends`），命中即 clone 返回（:728-731）。
- 规范化与校验：`normalizeBackendEntry`（:405）逐条产出 `errors`/`invalidBackends`，类型必须属于 `BACKEND_TYPES`（:427）。
- 兼容性排序：`resolveCompatibleBackendTypesForWorkflow` + `sortBackendsByCompatibilityPriority`（:821-837），由 workflow manifest 的 `provider` 派生候选 backend type（**`request.kind` 不参与兼容性推断**，见 `docs/components/providers.md`）。
- 解析入口：`listBackendsForProvider`（:839）、`listBackendsForWorkflow`（:851）、`resolveBackendForWorkflow`（:869）。
- 跨引用同步：`syncBackendReferenceState`（:697）与 `applyBackendIdMappingToWorkflowSettings`（:261）、`applyBackendIdMappingToTaskHistory`（:325）——backend id 改名会回写 workflow settings 与任务历史。
- 托管本地 backend：`MANAGED_LOCAL_BACKEND_ID = "local-skillrunner-backend"`（`src/backends/identity.ts:3`），由 runtime manager 在部署时创建/同步（`src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:2678` `createManagedProfileOnDeploy`、:2720 `syncManagedProfileIfExists`）。

---

## 2. 文件地图

### 2.1 `src/modules/skillRunner/`（36 文件 / 25016 行）

**connection/**

| 文件 | 一句话 |
| --- | --- |
| `connection/skillRunnerHandshakeProtocol.ts` (220) | **契约文件**：握手请求/响应 schema、协议 id（`job.v1`/`sequence.v1`/`interaction.files`）、能力归一化 |
| `connection/skillRunnerHandshake.ts` (117) | 握手执行与按 backend 缓存；按 requestKind 推导必需协议并断言支持 |
| `connection/skillRunnerBackendHealthRegistry.ts` (472) | 探测退避步长、可达性/可见性状态机、6 小时自动禁用、订阅通知 |
| `connection/skillRunnerBackendReachabilityCoordinator.ts` (319) | 60s tick 的探测调度器（启动/停止/单次排期） |
| `connection/skillRunnerConnectionGovernor.ts` (1112) | **状态机文件**：8 车道优先级队列、每 backend 并发上限、前台流上限、超时/中止/降级 |
| `connection/skillRunnerConnectionAuditStore.ts` (137) | 按 owner 对象作用域记录连接审计事件（Dashboard 只读展示） |
| `connection/skillRunnerConnectionAudit.ts` (39) | 审计快照投影（governor snapshot 的子集） |
| `connection/skillRunnerManagementClientFactory.ts` (92) | 管理面客户端工厂（注入 backend / localize） |

**run/**

| 文件 | 一句话 |
| --- | --- |
| `run/skillRunnerRunStore.ts` (1915) | **核心契约 + 状态机**：`SkillRunnerRunRecord`(schemaVersion 3.0.0)、runKey 构造、事件 reducer、投影/列表读 |
| `run/skillRunnerProviderStateMachine.ts` (345) | **状态机文件**：7 状态（queued/running/waiting_user/waiting_auth/succeeded/failed/canceled）、合法迁移与事件序校验 |
| `run/skillRunnerRunStateProjection.ts` (76) | run 记录 → 展示态投影（含 waiting/terminal 派生） |
| `run/skillRunnerRunSettlement.ts` (187) | 管理面响应语义解析与「终态失败」结算 |
| `run/skillRunnerRunIdentity.ts` (17) | 序列步骤的本地 run id 构造 |
| `run/skillRunnerRecoverableState.ts` (98) | 可恢复 / 不可恢复失败判定与 job 状态矫正 |
| `run/skillRunnerSessionSyncManager.ts` (517) | 每 request 的 SSE 事件循环、cursor 持久、断连状态集合、订阅 |
| `run/skillRunnerTaskReconciler.ts` (1108) | **状态机文件**：任务账本对账（启动恢复、60s 退避、缺失上下文清理、toast） |
| `run/skillRunnerForegroundContinuation.ts` (1275) | waiting 状态下的前台续跑（构造续跑 step job 并再次 dispatch provider） |
| `run/skillRunnerAutoReplyObserver.ts` (546) | 交互式任务的自动回复观察器（轮询 + guard + 回复失败对账） |
| `run/skillRunnerInteractiveAutoReply.ts` (130) | 自动回复开关、run 记录请求载荷构造、是否启用判定 |
| `run/skillRunnerExecutionMode.ts` (40) | `auto` / `interactive` 归一化与从 request 解析 |
| `run/skillRunnerProgressMapping.ts` (73) | Provider 进度事件 → 序列步骤/提交阶段映射 |
| `run/skillRunFeedback.ts` (459) | 运行反馈 sidecar（`_skill_run_feedback.md`）采集，受 pref 开关控制 |
| `run/skillRunnerSubmissionContext.ts` (28) | skill 显示名快照归一化与解析 |

**runtime/**

| 文件 | 一句话 |
| --- | --- |
| `runtime/skillRunnerLocalRuntimeManager.ts` (5048) | **状态机 + 编排核心**：部署/一键启停/自动拉起/lease/心跳/端口回退/状态持久化 |
| `runtime/skillRunnerCtlBridge.ts` (2242) | **契约文件**：`skill-runnerctl` 桥接，子进程 nohup/Start-Process 启动、pid 探活、SIGTERM→SIGKILL、状态文件、端口选择 |
| `runtime/skillRunnerReleaseInstaller.ts` (422) | 从 release 仓库下载并安装 runtime 发行包 |
| `runtime/skillRunnerRuntimeFeed.ts` (304) | runtime 版本 feed 契约、主/备 URL、内置兜底、版本选择与解析 |
| `runtime/skillRunnerAsyncLifecycle.ts` (58) | 统一异步关闭序列（7 步 best-effort） |
| `runtime/skillRunnerLocalDeployDebugStore.ts` (113) | 部署调试日志环形内存存储 + 订阅 |

**surface/**

| 文件 | 一句话 |
| --- | --- |
| `surface/skillRunnerRunDialog.ts` (6067) | **核心契约 + 读模型**：内存会话表、transcript 分页读、publication 适配、workspace action 分发 |
| `surface/skillRunnerWorkspaceSurface.ts` (561) | Assistant Workspace publication adapter（change→publication kind 映射） |
| `surface/skillRunnerSidebarModel.ts` (371) | 侧栏分组/聚焦/等待计数纯函数模型 |
| `surface/skillRunnerSkillDisplayRegistry.ts` (103) | skillId → 显示名快照注册表 |
| `surface/skillRunnerBackendToasts.ts` (124) | 后端 toast 载荷构造与 30s 去重 |
| `surface/skillRunnerManagementDialog.ts` (30) | 管理页 URL 构造 |
| `surface/skillRunnerLocalDeployDebugDialog.ts` (251) | 部署调试控制台对话框 |

### 2.2 `src/providers/`

| 文件 | 一句话 |
| --- | --- |
| `providers/types.ts` | **契约**：`Provider` 接口、进度事件、编排上下文、runtime option schema |
| `providers/contracts.ts` | **契约**：全部 request kind 的载荷类型 + `ProviderExecutionResult` 三态 |
| `providers/registry.ts` | Provider 注册/解析/schema normalize/dispatch（含审计日志） |
| `providers/requestContracts.ts` | **契约 + 分派关口**：kind→provider/backend 兼容表与 payload 校验 |
| `providers/profile.ts` | Provider Profile 描述/校验（`zotero-bridge.provider-profile.v1`），供 Host Bridge 暴露 |
| `providers/acp/provider.ts` (265) | ACP provider（prompt 为桩；skill run 转 orchestrator） |
| `providers/generic-http/provider.ts` (837) | 通用 HTTP provider：单请求 + 多步 `steps`（含 `fail_when`/`repeat_until`） |
| `providers/pass-through/provider.ts` (102) | 纯本地合成 provider，不发网络，直接产出 resultJson |
| `providers/skillrunner/provider.ts` (683) | Skill-Runner provider：选项校验、托管 runtime ensure、握手断言、委托 client |
| `providers/skillrunner/client.ts` (1424) | HTTP 传输：job 提交、多部件上传、`http.steps` 执行、poll 循环、bundle/result 拉取 |
| `providers/skillrunner/managementClient.ts` (1101) | 管理面：run 列表/状态、chat history、events history、SSE 流、reply、auth、cancel |
| `providers/skillrunner/modelCatalog.ts` (744) | 内置模型目录（读 `models/<engine>/models_<ver>.json` + manifest） |
| `providers/skillrunner/modelCache.ts` (675) | 模型目录按 backend 实时拉取 + pref 缓存 + 1 小时自动刷新 |
| `providers/skillrunner/skillPackageBundler.ts` (120) | 本地 skill 目录 → zip 包（走 runtimePersistence adapter） |
| `providers/skillrunner/zipTransport.ts` (168) | 无依赖 CRC32 + zip 构造 + multipart zip part |
| `providers/skillrunner/uploadMapping.ts` (72) | 上传相对路径映射与清洗 |
| `providers/skillrunner/errors.ts` (93) | `SkillRunnerHttpError`、可重试/终态客户端错误判定 |
| `providers/skillrunner/models/**` (12 json) | codex / gemini / iflow 三引擎的版本化模型目录 |

### 2.3 其他目录

| 文件 | 一句话 |
| --- | --- |
| `backends/registry.ts` (934) | backend pref 文档读/写/规范化/缓存/兼容排序/跨引用同步 |
| `backends/types.ts` (80) | `BackendInstance` / `LoadedBackends` 契约 |
| `backends/identity.ts` (146) | 托管 backend id、ACP 配置指纹、连接测试状态写入、id 生成 |
| `backends/managementAuth.ts` (161) | 管理面 basic auth 的读写（写回 backends 文档） |
| `backends/displayName.ts` (23) | backend 显示名解析（含托管本地 backend 的本地化） |
| `config/defaults.ts` (44) | **默认值 SSOT**：backend 类型枚举、各类型默认 request kind、默认端点/id |
| `jobQueue/manager.ts` (710) | 通用内存作业队列（`JobQueueManager`：并发上限、状态迁移、进度事件） |
| `jobQueue/workflowSubmissionQueue.ts` (951) | workflow 提交级队列（多单元批处理、取消、snapshot） |
| `jobQueue/workflowSubmissionQueueContracts.ts` (211) | 提交队列的 brand 类型契约 |
| `platform/command.ts` (955) | 命令解析/可信路径搜索/Windows 特殊解析 |
| `platform/subprocess.ts` (645) | 一次性子进程抽象（node/mozilla/zotero-internal/windows-xpcom 四适配器） |
| `platform/processControl.ts` (311) | 进程注册表快照与终止控制 |
| `platform/env.ts` (902) | 环境变量/路径搜索/工具探测 |
| `platform/path.ts` (179) | 跨平台路径（win/posix 风格） |
| `platform/runtimePlatform.ts` (138) | 平台与架构探测 |
| `platform/filePicker.ts` (142) | 原生文件选择器接入 |
| `platform/hash.ts` (40) | sha256（Mozilla 优先，回退） |
| `utils/prefs.ts` | **pref key 类型契约 + getPref/setPref** |
| `utils/wait.ts` | sleep / 取消信号 / watchdog / AbortController 解析 |
| `utils/path.ts` / `utils/fileSystem.ts` | 路径工具 / 在系统文件管理器中打开目录 |
| `utils/locale.ts` / `utils/localizationGovernance.ts` | FTL 本地化与文案治理 |
| `utils/window.ts` / `utils/ztoolkit.ts` / `utils/runtimeBridge.ts` / `utils/runtimeCompatibility.ts` | 窗口存活、toolkit、运行时桥、兼容探测 |
| `utils/sha256.ts` / `utils/timingSafeEqual.ts` | 摘要与恒定时间比较 |
| `utils/docsUrl.ts` / `utils/env.ts` | 文档 URL / 环境判定 |

---

## 3. 对外接口（主要导出与真实调用方）

### 3.1 Provider 层

| 导出 | 定义 | 真实调用方 |
| --- | --- | --- |
| `Provider` / `ProviderExecuteArgs` / `ProviderSupportsArgs` | `src/providers/types.ts:70-117` | 4 个 provider 实现类 |
| `executeWithProvider` | `src/providers/registry.ts:155` | `src/modules/workflowExecution/runSeam.ts:665`（单 job）；`src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:939`（waiting 续跑） |
| `resolveProvider` | `src/providers/registry.ts:129` | `src/modules/workflow/settings/workflowSettings.ts:297,1094`；`src/modules/workflow/ui/workflowDebugProbe.ts:243` |
| `resolveProviderById` | `src/providers/registry.ts:54` | `src/modules/workflow/settings/workflowSettingsDialogModel.ts:1`；`workflowSettings.ts:726` |
| `normalizeProviderRuntimeOptions` | `src/providers/registry.ts:116` | `workflowSettings.ts:919,1109,1161` |
| `registerProvider` / `listProviders` | `src/providers/registry.ts:38,50` | 测试与扩展注册（生产默认 4 个） |
| `assertProviderRequestDispatchContract` 等 | `src/providers/requestContracts.ts:665-789` | `src/providers/registry.ts` |
| `describeProviderProfile` / `validateProviderProfile` | `src/providers/profile.ts:347,537` | Host Bridge provider-profile surface |

`codegraph explore` 的调用者统计：`executeWithProvider` — 2 处源码调用方（`runSeam.ts`、`skillRunnerForegroundContinuation.ts`），测试 `tests/runtime/33-provider-backend-registry.test.ts`。

### 3.2 SkillRunner 模块（被模块外引用者）

| 导出 | 定义 | 模块外调用方 |
| --- | --- | --- |
| `applySkillRunnerRunEvent` / `getSkillRunnerRunRecord(ByRequest)` / `listSkillRunnerRunRecords` / `projectSkillRunnerRun` | `run/skillRunnerRunStore.ts:845,1383,1397,1432,1532` | `src/jobQueue/manager.ts`、`src/modules/taskRuntime.ts`、`surface/skillRunnerRunDialog.ts` |
| `shutdownSkillRunnerAsyncLifecycle` | `runtime/skillRunnerAsyncLifecycle.ts:35` | `src/hooks.ts:1209`（插件 shutdown） |
| `startSkillRunnerTaskReconciler` / `purgeSkillRunnerBackendReconcileState` | `run/skillRunnerTaskReconciler.ts:1014,1046` | `src/hooks.ts:66,890,896` |
| `startSkillRunnerBackendReachabilityCoordinator` / `stop...` | `connection/skillRunnerBackendReachabilityCoordinator.ts:251,293` | `src/hooks.ts:90-93,1181` |
| `startManagedLocalRuntimeAutoEnsureLoop` / `deployAndConfigureLocalSkillRunner` / `planLocalRuntimeOneclick` / `stateSkillRunnerLocalRuntime` 等 | `runtime/skillRunnerLocalRuntimeManager.ts:3098,3126,2994` … | `src/hooks.ts:69-80,1837-1854`（工具栏/命令分发） |
| `startSkillRunnerModelCacheAutoRefresh` / `refreshSkillRunnerModelCacheForBackend` | `providers/skillrunner/modelCache.ts:640` | `src/hooks.ts:63,83,892` |
| `SKILLRUNNER_WORKSPACE_ADAPTER` / `readSkillRunnerWorkspaceRegions` / `mapSkillRunnerChangeToPublicationKinds` | `surface/skillRunnerWorkspaceSurface.ts:497,298,92` | Assistant Workspace publication runtime（`src/modules/assistant/workspace/`） |
| `getSkillRunnerRunDialogRuntimeForTests` / `shutdownSkillRunnerRunDialogRuntime` | `surface/skillRunnerRunDialog.ts:4945,4938` | `src/hooks.ts`、测试 harness |

### 3.3 被 SkillRunner 模块导入的关键外部接口

- `src/modules/pluginStateStore.ts` 的 run 表族：`upsertPluginRunStoreEntry` / `getPluginRunStoreEntry(ByRequest)` / `listPluginRunStoreEntriesFiltered` / `appendPluginRunEventStoreEntry` / `listPluginRunEventStoreEntries` / `clearPluginRunStore`（re-export 自 `src/modules/pluginStateStore/runTables.ts`，`pluginStateStore.ts:791-828`）。
- `src/modules/taskRuntime.ts`：`updateWorkflowTaskStateByRequest`、`listActiveWorkflowTaskSummaries`（`run/skillRunnerSessionSyncManager.ts:18`、`surface/skillRunnerRunDialog.ts:1736`）。
- `src/modules/taskDashboardHistory.ts`：`updateTaskDashboardHistoryStateByRequest`。
- `src/modules/assistant/publication/*`：publication DTO 与 owner 工厂（`surface/skillRunnerWorkspaceSurface.ts:16-25`）。

---

## 4. 主要流程

### 4.1 完整链路：选择后端 → 发起 skill run → 流式接收 → 落盘/展示 → 结束清理

**阶段 0 — 后端选择（提交前，UI 侧）**

1. workflow manifest 声明 `provider`；`resolveProviderId` 读取（`workflowSettings.ts:240`）。
2. `resolveWorkflowExecutionContext` 组合：saved settings ⊕ run-once override → `mergeExecutionOptions` → `resolveBackendForWorkflow`（无 profile 的 provider 走 `buildLocalBackendForProvider`）→ `resolveEffectiveRequestKindForBackend` → `resolveProvider`（`workflowSettings.ts:1052-1130`）。
3. `resolveEffectiveRequestKindForBackend`（`workflowSettings.ts:271-283`）：声明 `skillrunner.job.v1` 但 backend 是 `acp` 时**改写为 `acp.skill.run.v1`** —— 这是 ACP/SkillRunner 兼容的关键改写点。
4. runtime options 经 provider schema 归一 + `constrainSkillRunnerProviderOptionsByMode`（`workflowSettings.ts:919-926,1109-1127`）。

**阶段 1 — 入队与 dispatch**

5. `src/modules/workflow/productionExecution.ts:49` → `runWorkflowExecutionSeam`（`runSeam.ts:473`）。
6. 并发由 `resolveWorkflowDispatchConcurrency` 决定：非「批量全并行」provider 恒为 1，否则等于 request 数（`src/modules/workflowExecution/runConcurrency.ts:7-18`）。
7. `new JobQueueManager({ concurrency })`（`runSeam.ts:537-538`）→ `enqueue`（`jobQueue/manager.ts:283`）→ 队列按 `runningCount < concurrency` 抽取（`manager.ts:698`）。
8. `executeJob` 内：序列 kind 走 `executeSkillRunnerSequence`（`runSeam.ts:623`）；否则组装 `orchestrationContext` 后 `executeWithProvider`（`runSeam.ts:665`）。

**阶段 2 — Provider 执行**

9. `executeWithProvider` → `resolveProvider`（backend 兼容 + provider 匹配 + provider/kind 校验）→ `assertProviderRequestDispatchContract` → 打点 → `provider.execute`（`providers/registry.ts:155-220`）。
10. `SkillRunnerProvider.execute`（`providers/skillrunner/provider.ts:457`）：
    - `normalizeRuntimeOptions`；对每个显式 providerOptions 校验「未被 schema 拒绝」（否则 `provider_profile_option_unavailable`）——:483-540（拒绝错误在 :525）。
    - 若 backend 是 skillrunner：`ensureManagedLocalRuntimeForBackend`（本地托管时自动拉起）→ `resolveRequiredSkillRunnerProtocolForExecution` → `SkillRunnerManagementClient` → `resolveSkillRunnerBackendCapabilities`（握手）→ `assertSkillRunnerBackendSupportsProtocol`——:533-580。
    - 构造 `SkillRunnerClient`，按 `request.kind === "http.steps"` 或 `skillrunner.job.v1` 分派——:616-637。
11. `SkillRunnerClient.executeSkillRunnerJob` → `toHttpStepsRequest` 生成 `http.steps`（create → upload → poll → fetch）→ `executeHttpSteps`（`providers/skillrunner/client.ts:1408-1420,1253-1290`）。

**阶段 3 — 流式接收（两条并行通道）**

- **通道 A：提交期进度**。`onProgress` 回调把 `request-creating/created/uploading/ready`、`sequence-step-*` 事件回灌：`runSeam.ts:676` `onJobProgress` → `recordSingleSkillRunnerProgress` / `recordSequenceStepSkillRunnerProgress`（`runSeam.ts:302,322`）→ `applySkillRunnerRunEvent` 写 run 记录；`skillRunnerProgressMapping.ts:33,57` 做生命周期/阶段映射。
- **通道 B：运行期会话流**。`ensureSkillRunnerSessionSync`（`run/skillRunnerSessionSyncManager.ts:380`）为每个 `backendId:requestId` 起 SSE 循环，读 `/v1/jobs/{id}/events`（`providers/skillrunner/managementClient.ts:1083`），带 cursor 与重连退避；`conversation.state.changed` 驱动状态更新（:101-110）。等待态（`waiting_user`/`waiting_auth`）断流（`skillRunnerSessionSyncManager.ts:64-70`）。
- **transcript 通道（无增量）**：SkillRunner 走 `chat/history` 拉取 + 内存会话镜像（`surface/skillRunnerRunDialog.ts` 的 `mergeHistoryEventsIntoSession` :1330、`syncHistory`），publication 只以 **snapshot** 形式发布（`surface/skillRunnerWorkspaceSurface.ts:45-58` 模块头注释明确：「SkillRunner has no incremental transcript channel… runtime treats a transcript kind without mutations as a snapshot request」）。

**阶段 4 — 落盘**

- **运行记录落盘**：所有状态迁移经 `applySkillRunnerRunEvent` reducer（`run/skillRunnerRunStore.ts:845`）→ `upsertPluginRunStoreEntry("skillrunner", runKey, payload)`（`pluginStateStore.ts:793`）→ SQLite 表 `plugin_skillrunner_runs` + `plugin_skillrunner_run_events`（`src/modules/pluginStateStore/runTables.ts:48,58`）。
- **产物落盘（applyResult）**：`src/modules/workflowExecution/applySeam.ts:255` `runWorkflowApplySeam` —— 对每个 job 先 `resolveTargetParentRefFromRequest`（:524），再调用 workflow 声明的 `applyResult` hook（:692 起）；序列最终步的 applyResult 拥有所有权（:663）。结果字段 `ProviderExecutionSucceededResult.resultJsonPath / workspaceDir / resultArtifactBasePath / bundleDir`（`providers/contracts.ts:239-271`）。
- **反馈 sidecar**：`collectSkillRunFeedbackSidecar`（`run/skillRunFeedback.ts:298`）产出 `_skill_run_feedback.md`；仅 bundle fetch 且开关打开才采集。

**阶段 5 — 展示**

- 运行工作台读模型 `getSkillRunnerWorkspaceReadModel`（`surface/skillRunnerRunDialog.ts:5400`）、任务分组 `listSkillRunnerWorkspaceTaskGroups`（:5265）、owner 详情 `readSkillRunnerWorkspaceOwnerDetails`（:5601）。
- transcript 分页 `readSkillRunnerTranscriptRegion`（:5974）：**page-first**，默认 limit 80，tail 或 cursor 两种锚点，`totalVisibleItemCount = items.length`。
- publication adapter：`readSkillRunnerWorkspaceRegions`（`surface/skillRunnerWorkspaceSurface.ts:298`）→ `SKILLRUNNER_WORKSPACE_ADAPTER`（:497）。

**阶段 6 — 结束与清理**

- 终态判定：`isTerminal`（`run/skillRunnerProviderStateMachine.ts:206`）；backend 终态事件 → `backend.terminal` → reducer 落 `status` + `apply` 状态。
- waiting 态续跑：`continueSkillRunnerForegroundRun`（`run/skillRunnerForegroundContinuation.ts:1236`）再次 `executeWithProvider`。
- 会话流停止：`stopSessionSync` / `stopAllSkillRunnerSessionSync` / `drain` / `shutdown`（`run/skillRunnerSessionSyncManager.ts:422,439,445,449`）。
- 插件关闭：`shutdownSkillRunnerAsyncLifecycle`（`runtime/skillRunnerAsyncLifecycle.ts:35`）按 7 步顺序 best-effort 收尾，含 `runDialog-drain → autoReply → reconciler stop → sessionSync drain → reconciler drain → modelCache stop → local runtime shutdown+lease release`。
- 本地 runtime 释放：`releaseManagedLocalRuntimeLeaseOnShutdown`（`runtime/skillRunnerLocalRuntimeManager.ts:5013`）。

### 4.2 generic-http / pass-through provider 的分派点

分派是**两段式**，均由 `requestKind` + `backend.type` 决定，没有 `if (providerId === ...)` 特判：

1. **编译器/设置阶段决定 requestKind**：`src/workflows/declarativeRequestCompiler.ts` 依 workflow manifest 的 `request.kind` 产出；`resolveEffectiveRequestKindForBackend`（`workflowSettings.ts:271`）做 ACP 改写。
2. **运行时分派点**：`src/providers/registry.ts:137` —— `getProviders().find((provider) => provider.supports(args))`，`providers` 顺序为 `[SkillRunnerProvider, AcpProvider, GenericHttpProvider, PassThroughProvider]`（`registry.ts:22-29`）。
3. **Provider 自述的匹配条件**：
   - `GenericHttpProvider.supports`（`src/providers/generic-http/provider.ts:512-518`）：`backend.type === "generic-http"` 且 kind ∈ {`generic-http.request.v1`, `generic-http.steps.v1`}。
   - `PassThroughProvider.supports`（`src/providers/pass-through/provider.ts:29-34`）：`backend.type === "pass-through"` 且 kind === `pass-through.run.v1`。
4. **二次内部分派**：
   - generic-http：`execute` 内按 kind 走 `executeSingleRequest`（:520）或 `executeStepsRequest`（:600）（`provider.ts:793-816`）。
   - pass-through：无内部分派，直接合成 `resultJson`（`pass-through/provider.ts:69-100`），**不发任何网络请求**，`status: "succeeded"` + `fetchType: "result"`。
5. **契约关口**：`PROVIDER_REQUEST_CONTRACTS`（`requestContracts.ts:43-52,63-67`）把两类 kind 各自钉到同名 backend type，`compatiblePairs` 缺省即「只允许这一对」。
6. **虚拟 backend**：两者 `requiresBackendProfile` 为 `false`/未声明，由 `buildLocalBackendForProvider` 造 `local://` backend（`workflowSettings.ts:303-311`），因此**不依赖 `backendsConfigJson` 中存在条目**。

---

## 5. 状态与持久化

### 5.1 run 记录的持久化位置

- **主存：SQLite**（Zotero `pluginStateStore`）。
  - 表：`plugin_skillrunner_runs`、`plugin_skillrunner_run_events`（`src/modules/pluginStateStore/runTables.ts:48,58`）；同族还有 ACP 与 workflow sequence 表（:27,37,69）。
  - 记录形状：`SkillRunnerRunRecord`，`schemaVersion: "3.0.0"`（`run/skillRunnerRunStore.ts:80`），含 `runKey / requestId / backendId / workflowRunId / jobId / status / submitPhase / apply / result / messageCounts / archivedAt`。
  - runKey 构造优先级：序列键 → 单 job 键 → 本地键（`skillRunnerRunStore.ts:510-538`）。
- **pref 层**：`src/utils/prefs.ts:9-17` 声明 `skillRunnerModelCacheJson`、`skillRunnerDeferredTasksJson`、`skillRunnerRequestLedgerJson`、`skillRunnerSkillDisplayRegistryJson`、`skillRunnerLocalRuntimeVersion`、`skillRunnerLocalRuntimeStateJson`、`skillRunnerRuntimeFeedCacheJson`；默认值在 `addon/prefs.js:1-20`。`skillRunnerDeferredTasksJson` / `skillRunnerRequestLedgerJson` 仍出现在 `pluginStateStore.ts` 的读取路径中（迁移/清空），属**遗留 pref 的读写兼容路径** —— 需进一步核实（见第 9 节）。
- **运行历史展示**：`src/modules/taskDashboardHistory.ts`（记录 + 30 天保留，`src/modules/taskRetentionPolicy.ts:1-3` `TASK_HISTORY_RETENTION_DAYS = 30`），与 run 记录是两套展示投影。

### 5.2 内存上限、LRU 与清理逻辑

**（a）500 条会话上限 — 存在，位置有两处**

- `surface/skillRunnerRunDialog.ts:1354-1355`（`mergeHistoryEventsIntoSession` 内）：
  `if (changed && args.session.messages.length > 500) args.session.messages = args.session.messages.slice(-500);`
- `surface/skillRunnerRunDialog.ts:3229-3230`（live 事件入口内）：同一逻辑重复一遍。
- 语义：**按 session 保留最后 500 条**，即运行时内存会话镜像的上界。归档设计文档佐证：`openspec/changes/archive/2026-08-01-assistant-workspace-skillrunner-convergence/design.md:19`（"in-memory `session.messages` list (bounded at 500…"）、`.../2026-08-01-assistant-workspace-data-plane-merge/proposal.md:96`（"bounded in-memory 500-entry mirror"）。

**（b）SkillRunner 没有 cold full mirror LRU**

- `src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:587` 的 `createAssistantTranscriptMirrorLru` 只被 ACP 两处调用（`acp/chat/acpChatTranscriptMirror.ts`、`acp/skillRun/acpSkillRunTranscriptMirror.ts`），SkillRunner 无调用点。
- 因此 `readSkillRunnerTranscriptRegion`（`skillRunnerRunDialog.ts:5974`）直接由内存会话供页，`totalVisibleItemCount` 受 500 上限约束。

**（c）transcript 展示分页上限**

- `RUN_WORKSPACE_PANEL_HISTORY_LIMIT = 100`（`skillRunnerRunDialog.ts:380`），任务列表读 `limit + 1` 用于判 `truncated`（:1742-1761），`historyTruncated` 影响 publication 的 complete/unavailable 标记（:2254）。

**（d）前台流池淘汰（近似 LRU，按 backend）**

- `MAX_RUN_DIALOG_STREAMS_PER_BACKEND = 2`（:418）；`enforceRunDialogStreamPoolForBackend`（:4060-4088）按 `streamLastFocusedAt` 升序选victim，`stopRunDialogEntryObserver` 逐出。这是**流**的淘汰，不是会话数据淘汰。

**（e）`runDialogMap` 无逐条淘汰**

- 唯一写入点是 `runDialogMap.set(key, entry)`（:4556），唯一删除点是 `runDialogMap.clear()`（:4120，仅在 `shutdownRunDialogRuntime` 内）。无 `delete`。
- 即：用户依次选中过的每个 run 都会保留一个 entry（含最多 500 条消息），直到插件关闭。**这是内存增长面**（见第 9 节）。

**（f）其他清理**

- 运行持久化分类清理：`cleanupRuntimePersistenceCategory("skillrunner-ledger")` → `clearPluginRunStore("skillrunner") + clearPluginTaskDomain("skillrunner")`（`src/modules/runtimePersistenceGovernance.ts:778-784`）。
- 后端健康状态裁剪：`pruneSkillRunnerBackendHealth`（`connection/skillRunnerBackendHealthRegistry.ts:418`）。
- backend 删除时：`untrackSkillRunnerBackendHealth`、`purgeSkillRunnerBackendReconcileState`（`src/hooks.ts:890-891`）。

---

## 6. 并发与生命周期

### 6.1 本地 runtime 管理（`skillRunnerLocalRuntimeManager.ts`）

- **常量**（:56-73）：`MANAGED_PROFILE_ID = "local-skillrunner-backend"`、`127.0.0.1`、端口 `29813`、端口回退跨度 `10`、`DEFAULT_LOCAL_RUNTIME_VERSION = BUILTIN_SKILLRUNNER_RUNTIME_VERSION`、心跳 `20s`、lease owner `zotero-plugin`、状态轮询 5×2000ms、**自动拉起 tick 15000ms**、toast 去重 5000ms。
- **状态机**（`RuntimeState`，:74-80）：`unknown | starting | running | stopped | degraded | reconciling_after_heartbeat_fail`。
- **lease 状态机**（:81）：`pending | acquired | conflict | failed`；`MonitoringState`：`inactive | heartbeat | reconciling`。
- **持久化**：`skillRunnerLocalRuntimeStateJson`（:64 `STATE_PREF_KEY`）、`skillRunnerLocalRuntimeVersion`（:65 `VERSION_PREF_KEY`）；`readManagedLocalRuntimeState`（:1423）/ 写回 + `subscribeManagedLocalRuntimeStateChange`（:214）通知。
- **并发控制**：`ensureManagedLocalRuntimeForBackend` 全程包在 `withRuntimeControlLock` 内（:4769）——所有运行时动作串行化，避免并发部署/启动。
- **入口**：`startLocalRuntime`（:4715）、`stopLocalRuntime`（:4313）、`deployAndConfigureLocalSkillRunner`（:3126）、`planLocalRuntimeOneclick`（:2994）、`uninstallLocalRuntime`（:4400）、`previewLocalRuntimeUninstall`（:4141）、`toggleLocalRuntimeAutoPull`（:3914）、`runManagedRuntimeStartupPreflightProbe`（:2939）。
- **守护循环**：`startManagedLocalRuntimeAutoEnsureLoop`（:3098）/ `stopManagedLocalRuntimeAutoEnsureLoop`（:3122），15000ms tick。
- **自动拉起暂停**：`isLocalRuntimeAutoStartPaused`（:849）、`autoStartPaused` 持久字段（:118）；会话态 `autoStartEnabledInSession`（:163）。
- **部署后动作**：`localRuntimePostUpTaskReconcileRunner`（:200），在 up 成功后触发任务对账。
- **版本解析**：`resolveSkillRunnerRuntimeVersion`（`runtime/skillRunnerRuntimeFeed.ts:200`），来源优先级 `override → primary → fallback → cache → builtin`（:38-43）；内置兜底 `v0.7.2`（:17）。

### 6.2 ctl bridge 如何启动/停止子进程（`skillRunnerCtlBridge.ts`）

- **入口命令集**（`CtlArgs.command`，:57-66）：`bootstrap | install | preflight | up | down | status | doctor`，`mode: local | docker`。
- **ctl 路径解析**：`resolveCtlPathFromInstallDir`（:773）—— Windows `skill-runnerctl.ps1`，其他 `skill-runnerctl`。
- **状态文件**：`<agentCacheDir>/local_runtime_service.json`（:798-801）；日志 `<dataDir>/logs/local_runtime_service.log` 与 `.stderr.log`（:803-813）。
- **启动（POSIX）**：拼 shell 脚本设置 `SKILL_RUNNER_*` 环境变量后 `nohup uv run uvicorn server.main:app --host … --port … >>log 2>>err < /dev/null &`（:1896），**脱离父进程**。（Windows 用 `Start-Process -PassThru -WindowStyle Hidden` + `Set-Content` 落 pid，:1859。）
- **pid 捕获**：`<agentCacheDir>/local_runtime_startup.pid`（:1829，启动前先删除）。
- **端口选择**：`selectPortWithFallback`（:1047）——在 `[requestedPort, requestedPort+span]` 内挑可用端口，返回 `triedPorts`；不可用则整体失败（:1798-1813）。
- **探活**：`isPidAlive`（:860）用 `runtime.process.kill(pid, 0)`；`resolveListeningPidByPort`（:947）+ `probeLocalService`（:1010）做 HTTP 探活。
- **停止**：`terminatePid`（:903）先 `SIGTERM`，延迟后 `SIGKILL`（:936,939）。`downLocalRuntime`（:1647）→ `runCtlCommand`。
- **状态判定**：`buildLocalStatus`（:1088）依 state 文件 pid + HTTP healthy 判 `running | starting | stopped`（:1100-1124）。
- **子进程执行基座**：`SkillRunnerCtlBridgeDeps.runCommand`（:45-51）默认走 `src/platform/subprocess.ts` 的 `executeOneShotSubprocess`（:491），四适配器（node/mozilla/zotero-internal/windows-xpcom），结果 `exited | unavailable | timed_out | failed`。

### 6.3 超时与失败处理

| 场景 | 超时 | 证据 |
| --- | --- | --- |
| ctl 通用命令 | 默认 `600_000` ms（10 min） | `skillRunnerCtlBridge.ts:427` |
| ctl 探活类命令 | 30 s | :845,855,885,927,978,995 |
| bootstrap/install 类 | 20 min | :1273 |
| up/down | 2 min | :1881,1907 |
| uninstall | 10 min | :2182,2224 |
| up 后的等待 | `waitSeconds` 默认 30，deadline 自旋 | :1772,1956 |
| HTTP 单请求 | `DEFAULT_HTTP_REQUEST_TIMEOUT_MS = 120000` | `providers/skillrunner/client.ts:35` |
| poll 间隔 | `poll.interval_ms ?? 2000` | `client.ts:711` |
| generic-http poll 总时长 | `poll.timeout_ms ?? 600000` | `providers/generic-http/provider.ts:623` |
| 连接治理器 | 每请求 `timeoutMs` 计时，超时抛 `SkillRunnerConnectionTimeoutError` | `connection/skillRunnerConnectionGovernor.ts:144-154` |
| 后台对账退避 | 60 s | `run/skillRunnerTaskReconciler.ts:109` |
| 后端探测退避 | `SKILLRUNNER_BACKEND_PROBE_BACKOFF_STEPS_MS`、tick 60 s | `connection/skillRunnerBackendHealthRegistry.ts:42,45` |
| 不可重试错误判定 | `isNonRecoverableSkillRunnerFailure` | `run/skillRunnerRecoverableState.ts:77` |
| 失败结算 | `settleSkillRunnerRunAsFailed` | `run/skillRunnerRunSettlement.ts:114` |

**连接治理器并发事实**（`connection/skillRunnerConnectionGovernor.ts`）：

- `DEFAULT_MAX_ACTIVE_PER_BACKEND = 6`、`MAX_FOREGROUND_STREAMS_PER_BACKEND = 2`、`DEGRADED_FOREGROUND_STREAMS_PER_BACKEND = 1`、`LOW_PRIORITY_RESERVED_CONNECTIONS = 2`、`PHYSICAL_DEBT_COOLDOWN_MS = 30000`（:90-94）。
- 8 车道优先级（:96-105）：`submit(0) → settlement(1) → reconcile(2) → foreground-query(3) → foreground-stream(4) → background(5) → maintenance(6) → health(7)`。
- 队列项终态含 `timeout | abort | evict`（:63-77）。

**JobQueue 并发**：`this.concurrency = Math.max(1, config.concurrency)`（`src/jobQueue/manager.ts:277`）；值来自 `resolveWorkflowDispatchConcurrency`（多数 provider 为 1，仅「批量全并行」provider 取 request 数）。

---

## 7. 配置合并与默认值

### 7.1 读取链路

1. **pref 访问层**：`src/utils/prefs.ts` —— `getPref`/`setPref` 包 `Zotero.Prefs`，key 类型在 `PluginPrefsMap`（:4-58）。
2. **默认值定义两处**（各司其职）：
   - **静态默认**：`addon/prefs.js`（Zotero 侧初始值；`skillRunnerEndpoint` = `http://127.0.0.1:8030`，`backendsConfigJson` = `""`，`collectSkillRunFeedbackEnabled` = `false` …）。
   - **代码常量 SSOT**：`src/config/defaults.ts` —— `DEFAULT_SKILLRUNNER_ENDPOINT`、`DEFAULT_BACKEND_ID`、`DEFAULT_BACKEND_TYPE`、`ACP_*`、`PASS_THROUGH_*`、`BACKEND_TYPES`、`DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE`。
   - **注意**：`addon/prefs.js:1` 的 `skillRunnerEndpoint` 与 `src/config/defaults.ts:1` 的 `DEFAULT_SKILLRUNNER_ENDPOINT` **字面重复**，属两处定义（见第 9 节）。
3. **backend 配置**：`backends/registry.ts` 读 `backendsConfigJson` → `normalizeBackendsDocument` → `normalizeBackendEntry`（逐条默认值：`enabled`、`defaults.headers`、`defaults.timeout_ms`）。
4. **workflow 设置**：`workflowSettings.ts` 读 `workflowSettingsJson`（:71），`getWorkflowSettings`（:573）→ `mergeExecutionOptions(saved, override)`（:1065；定义在 `src/modules/workflow/settings/workflowSettingsDomain.ts:385`）。
5. **运行时选项**：`normalizeProviderRuntimeOptions`（`providers/registry.ts:116`）→ provider 自己的 `normalizeRuntimeOptions`（SkillRunner 的自定义归一在 `providers/skillrunner/provider.ts:288-440`，含 `hard_timeout_seconds` 正整数归一与写回 `runtime_options`，`client.ts:1158-1165`）。
6. **选项默认值 SSOT**：**Provider 的 `getRuntimeOptionSchema()`**。SkillRunner 的 `engine/provider_id/model/effort/no_cache/interactive_auto_reply/hard_timeout_seconds` 默认值全部在 `providers/skillrunner/provider.ts:137-230` 定义（含 `defaultEngine = getDefaultSkillRunnerEngine() || "gemini"`）。UI 描述符由 `toProviderSchemaEntries`（`workflowSettings.ts:711-800`）投影，`defaultValue: entry.default`（:777）——**UI 不复制默认值**。
7. **retention 语义**：schema entry 的 `retention: "workflow" | "backend"`（`providers/types.ts:88`）决定选项是随 workflow 保存还是随 backend 保存。

### 7.2 合并顺序（事实源）

```
addon/prefs.js（静态初始值）
  └─ utils/prefs.getPref
       ├─ backendsConfigJson → backends/registry（normalize + 缓存 + 兼容排序）→ BackendInstance
       └─ workflowSettingsJson → workflowSettings.getWorkflowSettings
                                   ⊕ runOnceOverride（setRunOnceWorkflowOverrides :998）
                                      ↓ mergeExecutionOptions
                                   resolveBackendForWorkflow（preferredBackendId 可 strict）
                                      ↓
                                   resolveEffectiveRequestKindForBackend（ACP 改写）
                                      ↓
                                   resolveProvider → providerId
                                      ↓
                                   normalizeProviderRuntimeOptions（provider schema 默认值填充）
                                      ↓
                                   constrainSkillRunnerProviderOptionsByMode
                                      ↓
                                   WorkflowExecutionContext
```

### 7.3 其他默认值 SSOT

| 项 | 位置 |
| --- | --- |
| 本地 runtime 端口/主机/回退跨度 | `skillRunnerLocalRuntimeManager.ts:57-59` |
| runtime 版本内置兜底 `v0.7.2` + feed 文档 | `runtime/skillRunnerRuntimeFeed.ts:17,53` |
| feed 主/备 URL | `runtime/skillRunnerRuntimeFeed.ts:12,14`（与 `addon/prefs.js:9-15` 重复） |
| release 仓库 `leike0813/Skill-Runner` | `skillRunnerLocalRuntimeManager.ts:63` |
| 连接治理并发常量 | `connection/skillRunnerConnectionGovernor.ts:82-86` |
| 后端探测退避/自动禁用时窗 | `connection/skillRunnerBackendHealthRegistry.ts:42-49` |
| run 面板历史条数 100 | `surface/skillRunnerRunDialog.ts:380` |
| 会话镜像条数 500 | `surface/skillRunnerRunDialog.ts:1354,3229` |
| job 队列默认并发 | 由 `runConcurrency.ts` 推导，非固定常量 |

---

## 8. 测试覆盖

### 8.1 `tests/skillrunner/`（30 个文件）

| 文件 | 行数 | 主题 |
| --- | --- | --- |
| `107-acp-skillrunner-compatible-runner.test.ts` | 14459 | ACP 侧对 SkillRunner 兼容运行时的端到端行为（最大单文件） |
| `154-skillrunner-sequence-runtime.test.ts` | 3555 | `skillrunner.sequence.v1` 编排：handoff、short_circuit、apply_result |
| `193-skillrunner-workspace-surface.test.ts` | 2103 | 读模型 + publication adapter（含 transcript 分页/签名） |
| `65-skillrunner-run-dialog-bubble-model.test.ts` | 1006 | run dialog 消息模型（role/kind 归一、投影） |
| `74-skillrunner-ctl-bridge.test.ts` | 789 | ctl 桥接：命令拼装、状态文件、pid 探活、端口回退 |
| `71-skillrunner-run-dialog-ui-e2e-alignment.test.ts` | 789 | SkillRunner tab 端到端契约（publication 边界） |
| `161-skillrunner-connection-governor.test.ts` | 743 | 车道优先级、并发上限、超时/中止/降级 |
| `61-skillrunner-management-client.test.ts` | 740 | 管理面客户端（history/events/reply/auth/cancel/SSE） |
| `167-skillrunner-handshake.test.ts` | 541 | 握手协议与能力协商、协议断言 |
| `94-skillrunner-sidebar-model.test.ts` | 524 | 侧栏分组/聚焦/等待计数 |
| `163-skillrunner-auto-reply-observer.test.ts` | 472 | 自动回复观察器生命周期 |
| `36-skillrunner-model-catalog.test.ts` | 430 | 内置模型目录与清单版本选择 |
| `166-skillrunner-runtime-feed.test.ts` | 243 | runtime feed 解析、版本选择、内置兜底 |
| `75-skillrunner-release-installer.test.ts` | 246 | release 安装（下载/校验/落盘） |
| `198-skillrunner-run-store-reducer.test.ts` | 222 | run store 事件 reducer |
| `93-skillrunner-session-sync-lifecycle.test.ts` | 227 | 会话流起停/排空/重连 |
| `69-skillrunner-model-cache-refresh.test.ts` | 255 | 模型缓存刷新与小时级自动刷新 |
| `247-dashboard-skillrunner-audit.test.ts` | 246 | Dashboard 连接审计只读面 |
| `83-skillrunner-run-dialog-waiting-auth-observer.test.ts` | 205 | waiting_auth 观察与退出判定 |
| `76-skillrunner-run-workspace-singleton.test.ts` | 177 | 运行工作台单例假设 |
| `30-transport-skillrunner-mock.test.ts` | 177 | 对 mock 服务的传输契约 |
| `95-skillrunner-sidebar-host-runtime.test.ts` | 148 | 侧栏宿主运行时挂载 |
| `94-skillrunner-sidebar-entrypoints.test.ts` | 120 | 侧栏入口点 |
| `72-skillrunner-provider-state-machine.test.ts` | 100 | 7 状态迁移与事件序 |
| `84-skillrunner-run-state-projection.test.ts` | 56 | run 记录 → 展示态投影 |
| `177-skillrunner-upload-mapping.test.ts` | 61 | 上传路径映射 |
| `70a/70b/70c-*.test.ts` | 各 3 | **薄入口**：转调 `70-skillrunner-task-reconciler.shared.ts`（state restore / apply bundle retry / ledger reconcile 三主题） |
| `73a/73b/73c-*.test.ts` | 各 3 | **薄入口**：转调 `73-skillrunner-local-runtime-manager.shared.ts`（deploy lifecycle / oneclick start-stop / auto-start session） |

辅助：`tests/skillrunner/70-skillrunner-task-reconciler.shared.ts`、`73-skillrunner-local-runtime-manager.shared.ts`、`tests/helpers/skillRunnerWorkspaceSnapshotHarness.ts`。

### 8.2 `tests/tooling/`（相关子集）

| 文件 | 主题 |
| --- | --- |
| `tests/tooling/skillrunner-output-contract.test.ts` | SkillRunner 输出合约 Python 库（`assets/skillrunner-output-contract`）：artifact 越界拒绝、必填字段处理。通过 `uv run --project=$HOME/.ar` 执行 |
| `tests/tooling/159-separated-run-stores.test.ts` | SkillRunner / ACP run store 隔离 |
| `tests/tooling/160-skill-run-feedback.test.ts` | 运行反馈 sidecar 采集 |
| `tests/tooling/12-handlers.test.ts` | **实为 Zotero Host capability broker 测试**（`zoteroHostNativeMutations` / `brokerMutationPrimitives`），与 `src/handlers/` 无关 |
| `tests/tooling/31-transport-upload-fallback.test.ts` | 上传回退传输 |
| `tests/tooling/56-declarative-request-compiler-guards.test.ts` | 声明式 request 编译器（含 `poll.timeout_ms` 编译） |
| `tests/tooling/196-sequence-state-reducer.test.ts` | 序列状态 reducer |
| `tests/tooling/ui-render-stability-contract.test.ts` | UI 渲染稳定性契约（含 transcript region 解耦） |

### 8.3 其他相关

- `tests/runtime/33-provider-backend-registry.test.ts`：provider 注册/解析/契约、backend registry 读合并、`resolveWorkflowExecutionContext`。
- `tests/runtime/32-job-queue-transport-integration.test.ts`：JobQueueManager + SkillRunnerProvider 对 mock 服务的集成（需 `ZOTERO_TEST_SKILLRUNNER_ENDPOINT`）。
- `tests/runtime/34/37/38-*`：generic-http e2e、pass-through、generic-http steps。
- `tests/runtime/181-provider-profile-selection.test.ts`：provider profile 选择。
- `tests/runtime/63-job-queue-progress.test.ts`：队列进度事件。
- `tests/runtime/108-runtime-persistence-governance.test.ts`：持久化分类清理（含 skillrunner-ledger）。
- `tests/mock-skillrunner/server.ts` + `contracts.ts`：mock Skill-Runner 服务（jobs 创建/上传/轮询/终态，traffic 记录）。
- `tests/workflows/164-workflow-host-queue-management.test.ts`、`tests/acp/167-acp-skills-concurrent-submission.test.ts`：并发提交。

**覆盖观察**：ctl bridge、connection governor、run store reducer、状态机、会话同步、handshake、模型目录/缓存、runtime feed/installer、任务对账、local runtime manager 均有专测；**未见**针对 `skillRunnerRunDialog` 的 `runDialogMap` 淘汰/增长、以及 SkillRunner `poll.timeout_ms` 语义的专测。

---

## 9. 疑点清单（待核查，附证据路径）

1. **`poll.timeout_ms` 契约字段在 SkillRunner 路径被丢弃**
   - 声明处：`src/providers/contracts.ts:33,68,121,232`（4 处 request 类型都声明 `poll.timeout_ms`）。
   - 编译器产出：`src/workflows/declarativeRequestCompiler.ts:641-642`（`requestSpec?.poll?.timeout_ms || manifest.execution?.timeout_ms`）。
   - generic-http **有消费**：`src/providers/generic-http/provider.ts:623`（`poll.timeout_ms ?? 600000`）。
   - SkillRunner **无消费**：`src/providers/skillrunner/client.ts:1284-1286` 只透传 `interval_ms`；全仓 `rg "timeout_ms" src/providers/skillrunner/` 无命中。
   - 待核查：是设计上把总时长交给后端 `hard_timeout_seconds`，还是遗漏？

2. **`executePollStep` 本地无墙钟上限**
   - `src/providers/skillrunner/client.ts:711-745`：`while (true)`，仅在 `succeeded/failed/canceled` 或 `isWaiting` 时返回；其余 `sleep(intervalMs)` 后重试，未检查累计时长。
   - 每轮 HTTP 有 120s 超时（`client.ts:35`），但**循环本身无 deadline**。
   - 待核查：后端永久 `running` 时本地是否会无限轮询；`hard_timeout_seconds` 是否真的由后端强制。

3. **`runDialogMap` 无逐条淘汰，可能随时间增长**
   - 唯一写：`src/modules/skillRunner/surface/skillRunnerRunDialog.ts:4556`；唯一删：`:4120`（`shutdownRunDialogRuntime`）。全文件无 `runDialogMap.delete`。
   - 每个 entry 的 `session.messages` 上限 500（:1354、:3229），但 entry 数量只与「被选中过的 run 数」相关。
   - 对照：同类数据在 ACP 侧受 cold mirror LRU 约束（`src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:587-620`），SkillRunner 无对应机制。
   - 待核查：是否需按 owner 上限/淘汰；与 AGENTS.md「有界的内存会话历史（上限 500 条）即是 mirror」的表述是否有缺口。

4. **500 条截断逻辑在两处重复**
   - `surface/skillRunnerRunDialog.ts:1354-1355` 与 `:3229-3230` 语义相同但各写一遍（前者带 `changed &&` 条件，后者不带）。
   - 待核查：是否应提取为单一常量/函数（DRY），两处条件差异是否有意。

5. **`skillRunnerEndpoint` 默认值两处定义**
   - `addon/prefs.js:1`：`pref("skillRunnerEndpoint", "http://127.0.0.1:8030")`
   - `src/config/defaults.ts:1`：`DEFAULT_SKILLRUNNER_ENDPOINT = "http://127.0.0.1:8030"`
   - 同类：runtime feed 主/备 URL 同时在 `addon/prefs.js:9-15` 与 `runtime/skillRunnerRuntimeFeed.ts:12,14`。
   - 待核查：是否存在实际漂移风险，或已有治理脚本校验一致性。

6. **遗留 pref `skillRunnerDeferredTasksJson` / `skillRunnerRequestLedgerJson` 的现状**
   - 仍声明于 `src/utils/prefs.ts:10-11`，`addon/prefs.js:5-6`；`src/modules/pluginStateStore.ts` 有读取与清空路径（观测到 `getPref(...)` / `setPref(..., "")` 调用）。
   - 但 run 记录已迁到 SQLite（`plugin_skillrunner_runs`）。文档中未明确这些 pref 是否已完全弃用。
   - 待核查：是否仅为一次性迁移输入；若已迁移完成，是否可移除（AGENTS.md「如无必要，勿增实体」）。

7. **`AcpProvider` prompt 通路为桩**
   - `src/providers/acp/provider.ts:236` 日志 stage `provider-acp-dispatch-stubbed`；返回 `resultJson.phase = "sidebar-global-chat"`，不产生真实 agent 调用。
   - `supports()` 却声明支持 `acp.prompt.v1`（:186-195）。
   - 待核查：这是既定阶段划分（注释称 "phase-1 global chat surface"）还是未完成项；对 workflow 使用 `acp.prompt.v1` 的语义影响。

8. **`skillRunner.sequence.v1` 的 provider 归属与 `compatiblePairs` 的落地校验**
   - 主 pair 是 ACP（`requestContracts.ts:28-42`），次 pair 是 skillrunner。
   - `AcpProvider.execute` 对 sequence kind **直接抛错**：`"skillrunner.sequence.v1 must be executed by workflow runtime orchestration"`（`src/providers/acp/provider.ts:207-211`），即 `supports()` 返回 true 但 `execute` 拒绝。
   - 待核查：`resolveProvider` 会选中 AcpProvider，随后 execute 抛错；该路径是否只可能由 `runSeam.ts:629` 的序列分支拦下（不走 executeWithProvider），从而永不触发。若是，`supports()` 声明 sequence 是否为误导性契约。

9. **`SkillRunnerProvider` 构造参数的 `staticClient` 分支**
   - `provider.ts:112-118` 允许只有 `baseUrl` 无 backend；`resolveBackend` 在无 backend 且有 staticClient 时返回 `null`（:445-455），随后跳过托管 runtime ensure 与握手（:541 的 `if (backend && ...)`）。
   - 待核查：生产默认注册（`registry.ts:24` `new SkillRunnerProvider()` 无参）下该分支是否只用于测试；无参且无 backend 时会抛「requires backend config」。

10. **`RUN_WORKSPACE_PANEL_HISTORY_LIMIT = 100` 与 run 记录总量的关系**
    - `surface/skillRunnerRunDialog.ts:380`、`:1742-1761`。历史列表只取 100 条（+1 判截断），超出部分不可见。
    - `historyTruncated` 会把 transcript 状态置为 `unavailable`（:2254）。
    - 待核查：截断是否为已接受的有界设计，还是需要分页/“加载更多”。

11. **`jobQueue` 与实际后端能力的并发错配**
    - `resolveWorkflowDispatchConcurrency`（`runConcurrency.ts:14-17`）：非批量并行 provider 恒为 1，否则等于 **request 数**（没有上限）。
    - 而连接治理器对每 backend 上限 6（`connection/skillRunnerConnectionGovernor.ts:82`），前台流上限 2（:83）。
    - 待核查：大批量 workflow 下队列入队数是否会远超实际可并发数，是否有上游 clamp。

12. **`analyzeSession.messages` 供页与 publication 签名的一致性**
    - `readSkillRunnerTranscriptRegion` 在 `publishedTranscriptEntryKey === entry.key` 时用 `publishedTranscriptMessages`，否则用 `entry.session.messages`（`surface/skillRunnerRunDialog.ts:5989-5992`）。
    - 两条来源都可能被 500 截断，但截断点在写入侧而非读取侧。
    - 待核查：`publishedTranscriptMessages` 是否也会增长（是否有自己的裁剪）。其写入点为 `surface/skillRunnerRunDialog.ts:2295-2330`，读取点为 `:5989-5992`。

---

## 10. 未覆盖范围

1. **`src/handlers/` 不存在** —— 任务范围中列出的该目录在本仓库无对应实现（已用 `find src -iname '*handler*'` 与 `rg -ln "handler" src/` 双重确认）。若指的是 workflow hook handler 体系，实际落点在 `src/workflows/hostApi.ts` 与 `src/modules/workflowExecution/*Seam.ts`；若指 Host Bridge handler，落点在 `src/modules/hostBridge/server/routes/`。
2. **`src/modules/acp/`（43+ 文件）未展开** —— 仅在与 SkillRunner 的交互点（sequence、mirror LRU、provider 桩）做了对照，未做 ACP 侧完整侦察。
3. **`src/workflows/`（工作流引擎、manifest schema、declarativeRequestCompiler 全貌）未展开** —— 仅在 request kind 推导与 `poll.timeout_ms` 编译处取证。
4. **`src/modules/workflow/`（settings UI、catalog、backendManager 全貌）未展开** —— 仅取 workflowSettings 的合并/解析链路。
5. **`src/modules/assistant/`（publication plane、workspace surface skeleton、transcript renderer）未展开** —— 仅确认 SkillRunner 与 cold mirror LRU 的关系。
6. **`src/sidebar/` 前端渲染未展开** —— 未核查 `assistantTranscriptRenderer.js` 对 SkillRunner snapshot 的实际消费路径。
7. **`rust/` 与 `packages/` 未涉及**。
8. **未运行任何测试或构建**，因此第 8 节只列出测试文件与 `describe` 主题，不构成通过/失败证据。
9. **未核查 `assets/skillrunner-output-contract` Python 库的内部实现** —— 仅据 `tests/tooling/skillrunner-output-contract.test.ts` 推断其职责。
10. **未做 git 历史/blame 分析**，因此第 9 节的疑点未区分「新引入」与「长期存在」。
11. **未核查 `docs/` 与 `openspec/` 全文**，仅按关键词抽样（skillrunner / provider / backend / job-queue 相关文档 8 篇、归档 change 2 篇）。
12. **`src/platform/` 与 `src/utils/` 仅做角色标注**，未深入 Windows 命令解析、子进程适配器矩阵、hash 回退等实现细节。
