# Synthesis Workbench Tab — Host 端运行时

## Overview

`src/modules/synthesisWorkbenchTab.ts` 是 Synthesis Workbench 的 host 端运行时。它管理 Zotero tab 生命周期、嵌入式 browser（XUL browser / iframe）的创建和销毁、host↔child 双向通信桥接、50+ host 命令的派发与并发控制、surface 脏标记和按需刷新、以及预预热（prewarm）机制。

配套文档：
- `doc/synthesis-layer/workbench-ui.md` — frontend（web UI）侧的 read-model 契约和 surface-scoped refresh 架构
- `doc/components/synthesis-workbench-invalidation.md` — 失效监听机制
- `doc/synthesis-layer/domain-model.md` — 领域模型

## 架构概览

```
Zotero Plugin Process (Host)              chrome://page (Child Frame)
┌─────────────────────────────┐           ┌─────────────────────┐
│ synthesisWorkbenchTab.ts    │ postMessage│  synthesis UI (web) │
│  · tab lifecycle            │◄──────────►│  · surfaces         │
│  · bridge installer         │  bridge    │  · commands         │
│  · handleAction dispatcher  │           │  · topic reader     │
│  · command progress polling │           └─────────────────────┘
│  · surface invalidation     │
└─────────────────────────────┘
```

Host 端运行在 Zotero 插件进程中，Child Frame 加载 `chrome://<addonRef>/content/synthesis/index.html` 页面。二者通过 `window.postMessage` 和注入的 bridge 对象通信。

## 核心类型

```typescript
type SynthesisWorkbenchRuntime = {
  tabId: string;
  window: _ZoteroTypes.MainWindow;      // chrome window
  hostWindow: Window;                    // host window（与 chrome window 可以是同一对象）
  frame: Element;                        // XUL browser 或 iframe
  frameWindow: Window | null;
  removeMessageListener?: () => void;
  handshakeTimer?: ReturnType<typeof setInterval>;
  commandProgressTimer?: ReturnType<typeof setInterval>;
  commandProgressSnapshotRunning?: boolean;
  handshakeAttemptCount: number;
  handshakeSuccessCount: number;
  handshakeComplete: boolean;
  state: SynthesisUiState;              // UI 状态（selectedTab, registry filters 等）
  snapshotInput?: SynthesisUiSnapshotInput;
  snapshotInputLocked?: boolean;
  loadedSurfaces: Set<SynthesisWorkbenchSurfaceName>;
  dirtySurfaces: Set<SynthesisWorkbenchSurfaceName>;
  surfaceRequestSeq: number;
  latestSurfaceRequestBySurface: Partial<Record<SynthesisWorkbenchSurfaceName, number>>;
  libraryReadModelRevision: number;
  libraryReadModelDirtyTimer?: ReturnType<typeof setTimeout>;
  inFlightCommands: Map<string, SynthesisUiActionOperation>;
  lastCompletedCommand?: SynthesisUiActionOperation;
  lastFailedCommand?: SynthesisUiActionOperation;
  actionWarnings: SynthesisUiActionOperation[];
};
```

- `SynthesisWorkbenchBridge` — `{ postMessage(action, payload): Promise<void> }` 接口，注入到 child frameWindow 供其调用
- `MountedSynthesisWorkbenchRuntime` — 嵌入场景（非 Zotero tab）返回的 `{ refresh(), cleanup() }` 句柄
- `SynthesisBridgeMessageType` — 7 种消息类型字面量

## 生命周期

### 1. 入口

两个入口函数，底层共享同一套初始化流程：

- **`openSynthesisWorkbenchTab(args)`** — 通过 `Zotero_Tabs.add()` 创建 Zotero 原生 tab，设置 `onClose` 回调。适用于独立 tab 模式。
- **`mountSynthesisWorkbenchRuntime(args)`** — 在指定 DOM 容器内渲染。清除容器的现有子节点后创建 frame。适用于嵌入模式（如 sidebar 内嵌）。

两个入口都创建 `SynthesisWorkbenchRuntime` 实例并执行后续步骤。

### 2. Frame 创建

`createSynthesisBrowser(doc)` 创建嵌入式 browser：

- 优先使用 XUL `createXULElement("browser")`，回退为 HTML `createElement("iframe")`
- 属性：`data-zs-role="synthesis-workbench-frame"`, `disableglobalhistory`, `maychangeremoteness`, `flex=1`, `type="content"`, `transparent`
- 样式：`width/height=100%`, `border=none`, `minHeight=0`

URL 由 `resolveSynthesisPageUrl()` 构造：`chrome://<addonRef>/content/synthesis/index.html?ui=20260520-controls-v5`

### 3. Bridge 安装

`installSynthesisWorkbenchBridge(runtime)` 创建 bridge 对象并将其写入 child frameWindow：

```typescript
const bridge: SynthesisWorkbenchBridge = {
  postMessage: async (action, payload) => {
    handleAction(runtime, {
      type: "synthesis:action",
      action,
      payload: payload && typeof payload === "object" ? payload : {},
    });
  },
};
```

bridge 写入 `frameWindow.__zoteroSkillsSynthesisWorkbenchBridge` 和（如有）`wrappedJSObject` 的对应键。清理时通过 `clearSynthesisWorkbenchBridge()` 删除这些引用。

### 4. Handshake

`scheduleWorkbenchHandshake(runtime)` 启动轮询：

- 间隔：`SYNTHESIS_WORKBENCH_HANDSHAKE_INTERVAL_MS = 100ms`
- 连续成功阈值：`SYNTHESIS_WORKBENCH_HANDSHAKE_REQUIRED_SUCCESSES = 5`
- 最大尝试次数：`SYNTHESIS_WORKBENCH_HANDSHAKE_MAX_ATTEMPTS = 80`（8 秒超时）
- 每次尝试调用 `ensureWorkbenchHandshake()` → `resolveFrameWindow()` + `installSynthesisWorkbenchBridge()`
- 达到 5 次连续成功 → `finalizeWorkbenchHandshake()`：标记 `handshakeComplete = true`，停止轮询，发送 `synthesis:init` + `synthesis:chrome` + `synthesis:active-surface`
- 达到 80 次但已有成功记录 → 降级使用已成功的次数直接完成
- 完全无成功记录 → 静默失败

### 5. 消息监听

`attachWorkbenchBridge(runtime)` 在 `runtime.hostWindow` 注册 `message` 事件监听：

```typescript
const onMessage = (event: MessageEvent) => {
  const data = event.data;
  if (!data || data.type !== "synthesis:action") return;
  handleAction(runtime, data as SynthesisWorkbenchActionEnvelope);
};
```

消息类型过滤只接收 `synthesis:action`。监听器在清理时通过 `runtime.removeMessageListener()` 移除。

### 6. 初始化

`finalizeWorkbenchHandshake()` 完成后发送三条消息：
1. `sendSnapshot("synthesis:init")` — 初始快照
2. `sendChrome()` — 状态栏和操作进度
3. `sendActiveSurface()` — 当前 tab 对应的 surface 数据

### 7. 运行

Child frame 通过 bridge `postMessage()` 或 `postMessage` 事件发送 action，host 端 `handleAction()` 负责路由和处理。

### 8. 清理

`cleanupSynthesisRuntime(runtime)` 清理所有资源：

- 清除 `handshakeTimer`、`libraryReadModelDirtyTimer`
- 清除 `commandProgressTimer`
- 清除 bridge 引用
- 移除 message listener
- 从 `synthesisWorkbenchRuntimes` Set 中删除

`openSynthesisWorkbenchTab` 在 tab 关闭时自动调用 `cleanupSynthesisWorkbenchTab()`。`mountSynthesisWorkbenchRuntime` 返回的 `cleanup` 回调由调用方负责。

## 通信协议

### 消息类型

| 消息类型 | 方向 | 用途 | 触发时机 |
|---------|------|------|---------|
| `synthesis:init` | H→C | 首次完整快照 | handshake 完成 |
| `synthesis:snapshot` | H→C | 后续快照刷新 | refresh action |
| `synthesis:chrome` | H→C | 状态栏、操作进度、pending actions | action 处理后、进度轮询 |
| `synthesis:surface` | H→C | 特定 surface 数据 + surface request metadata | surface 加载/切换/失效 |
| `synthesis:surface-error` | H→C | surface 加载错误 + surface request metadata | surface 数据取失败 |
| `synthesis:topic-detail` | H→C | 主题详情数据 + 打开 reader | openTopicArtifact 命令 |
| `synthesis:digest` | H→C | 论文摘要 | resolveTopicPaperDigest 命令 |
| `synthesis:action` | C→H | Action envelope | child frame 用户操作 |

### Payload 包装

所有发送给 child frame 的 payload 都经过 `withSynthesisWorkbenchI18n()` 包装，注入 i18n 语言包 (`locale` + `messages`)。语言包在每次发送时构建，确保反映最新本地化状态。

## Action 派发机制

`handleAction(runtime, envelope)` 是核心路由函数，负责处理所有来自 child frame 的 action。

### 路由逻辑

1. **applySynthesisUiAction** — 调用 `synthesis/uiModel.ts` 的 `applySynthesisUiAction()` 处理 UI state 变更
2. **未处理检查** — `result.handled === false` 时刷新当前 surface 并返回
3. **内建 action** — 无需 host 参与，直接处理 UI 状态：
   - `ready` — 首次就绪，刷新 chrome + 活跃 surface
   - `refresh` — 强制刷新 chrome + 活跃 surface
   - `selectTab` — 切换 tab，刷新新 surface
   - `setFilters` — 设置过滤器，按需从 service 刷新
4. **hostCommand** — 匹配具体命令执行

### 内建 action 处理

| action | 行为 |
|--------|------|
| `ready` | `sendChrome(refreshFromService: true)` + `scheduleActiveSurfaceRefresh()` |
| `refresh` | `sendChrome(refreshFromService: true)` + `scheduleActiveSurfaceRefresh(refreshFromService: true)` |
| `selectTab` | `sendChrome(refreshFromService: false)` + `scheduleActiveSurfaceRefresh()` |
| `setFilters` | 探查 registry/reviews 过滤器变更决定是否 `refreshFromService: true` |

### Host 命令分类

| 子系统 | 命令数 | 关键命令 |
|--------|--------|---------|
| Synthesis 工作流 | 2 | `runSynthesizeTopic`, `submitTopicSynthesisUpdate` |
| 引用 sidecar | 4 | `refreshReferenceSidecarNow`, `retryReferenceSidecarRefresh`, `runAdvancedReferenceMatchingNow`, `retryAdvancedReferenceMatching` |
| 引用匹配提案 | 9 | `applyReferenceMatchProposalAction`, `applyReferenceMatchProposalActions`, `applyCanonicalRevisionReviewAction`, `mergeEffectiveCanonicalReference`, `applyCanonicalRevisionMergeRequests`, 等 |
| 引用元数据 | 2 | `updateCanonicalReferenceMetadata`, `archiveCanonicalReference` |
| Citation Graph | 4 | `rebuildCitationGraphCacheNow`, `refreshCitationGraphCacheIncrementalNow`, `retryCitationGraphCacheRebuild`, `manualRecomputeLayout` |
| Tag Vocabulary | 10+ | `rebuildTagVocabularyIndex`, `validateTagVocabulary`, `exportTagVocabulary`, `importTagVocabulary`, `previewTagVocabularyImport`, `updateStagedTagSuggestion`, `updateTagVocabularyEntry`, `deleteTagVocabularyEntry`, `promoteStagedTagSuggestions`, `discardStagedTagSuggestions`, `clearStagedTagSuggestions`, `applyTagVocabularyImport` |
| Concept KB | 4 | `rebuildConceptKbIndex`, `deleteConceptEntry`, `updateConceptDisplayText`, `applyConceptReviewAction` |
| Topic Graph | 4 | `rebuildTopicGraphIndex`, `acceptTopicGraphRelation`, `rejectTopicGraphRelation`, `applyTopicGraphReviewAction` |
| Topic Discovery | 2 | `rejectTopicDiscoveryHint`, `restoreTopicDiscoveryHint` |
| Git Sync | 5 | `syncNow`, `pauseGitSync`, `resumeGitSync`, `retryGitSync`, `resolveGitSyncConflict` |
| Topic Artifact | 5 | `openTopicArtifact`, `exportTopicSynthesisReport`, `resolveTopicPaperDigest`, `deleteTopicArtifact`, `purgeDeletedTopicArtifacts` |
| 其他 | 2 | `openPreferences`, `manualRecomputeLayout` |

四个 Citation Graph host 命令动态解析默认 `SynthesisClient` 并调用 `client.graph`。手动 layout 请求传入 `force: true`；Graph surface 的自动 layout refresh 复用同一个 client 完成 surface read 和非强制 recompute。Full rebuild、incremental refresh 和 retry 均使用无参数 client command，不把 `onProgress` 或其它 UI callback 带入 contract。

四个 Reference Sidecar/advanced matching 维护命令动态解析默认 `SynthesisClient` 并调用 `client.references`。它们使用无参数 client command，不把 `onProgress` 或其它 UI callback 带入 contract；refresh 与 advanced matching 保留确认，三个长命令保留 deferred start，而 Reference Sidecar retry 保持立即启动。

Canonical revision review、单个/批量 Reference match proposal action、单个/批量 canonical merge、metadata update 与 archive 同样在命令执行闭包内动态解析默认 `SynthesisClient`，并调用对应的 `client.references` 方法。Workbench 负责 snake/camel alias、trim、默认 action、batch 普通对象过滤与 canonical 映射、manual-target 映射、布尔确认字段归一化以及 metadata patch alias 归一化；client adapter 只接受 canonical 严格 DTO。命令保留原有 single-flight key 与 `.then(failOnDiagnostic)`；merge 类命令失效 Index/Review/Graph，metadata/archive 失效 Index/Review。仅 batch canonical merge 保留 deferred start，不增加确认对话框或 progress callback。

Concept KB rebuild、display-text update、review action 与批量删除也在命令执行闭包内解析默认 `SynthesisClient`，并调用 `client.concepts`。Workbench 保留 concept/review id trim、review action allowlist、可选 merge target、单个/批量删除 aliases 和 single-flight 参数；client adapter 只接受四个显示字段、严格 review action 与非空删除列表。Rebuild 保留 protected confirmation 和 deferred start，但不再把 `onProgress` callback 带入 contract，进度继续来自 `workbench.readProgress()`。仅 review action 使用 singular `failOnDiagnostic`，四路仍失效 Concepts/Review。Concept queries/checkpoint export 与其它 command domains 保持当前边界。

Topic artifact delete/purge 与 discovery-hint reject/restore 在各自命令闭包内解析默认 `SynthesisClient`，并调用 `client.topics`。Delete 与 hint 请求只跨越 trim 后的 canonical `topicId` / `hintId`，purge 为无参数命令；四路都不携带 progress callback、streaming state 或 deferred start。Delete/purge 保留原确认、single-flight 和 Home/Topics 失效，delete 的 `ok: false` 继续以领域 `reason` 失败；hint actions 保留空 ID 跳过、singular `failOnDiagnostic` 与 selected-surface 默认失效。Topic queries、mirror、Sync、Host Bridge 和 MCP 保持当前边界。

Topic Graph projection rebuild、edge accept/reject 与 review action 使用独立的 `client.topicGraph`，不并入 Citation Graph 的 `client.graph`。Rebuild 保留 protected confirmation、deferred start 与 Home-only 默认失效，但调用无参数 client method，进度只来自 `workbench.readProgress()`；edge/review 请求只传递 trim 后的 canonical ID 和严格 review action。三个 mutation 保留原 single-flight、singular `failOnDiagnostic`、立即启动及 Home/Topics/Graph/Review 失效。Topic Graph query/checkpoint export、Host Bridge 和 MCP 保持当前边界。

Tag Vocabulary validation、projection rebuild 与 regulator export 在各自命令闭包内解析默认 `SynthesisClient`，并调用 `client.tags`。三路均使用空 single-flight args；validation 与 export 立即启动并保持 Home-only 默认失效，rebuild 保留 protected confirmation、deferred start 与 Tags 失效。Rebuild 不再传递 progress callback，进度只来自 `workbench.readProgress()`；export 返回 string array 后仍由 host 写入 clipboard，格式为每个 tag 一行并保留尾随换行。Staged suggestions、import、vocabulary edit/delete、bootstrap 与 audit command 保持现有直连边界。

### 受保护命令

6 个重建命令在确认前弹出自定义确认对话框：

- `refreshReferenceSidecarNow` — 提示"heavier pass" 风险
- `runAdvancedReferenceMatchingNow` — 同上
- `rebuildCitationGraphCacheNow` — 提示"重建索引"标准文案
- `rebuildTagVocabularyIndex` — 同上
- `rebuildConceptKbIndex` — 同上
- `rebuildTopicGraphIndex` — 同上

### 错误与确认

- `reportWorkbenchError(error, win)` — 调用 `alertWindow()` 向用户展示错误信息
- `confirmWorkbenchAction(message, win)` — 调用 `window.confirm()` 弹确认框
- `confirmProtectedRebuildCommand(command, win)` — 根据命令类型选不同的确认文案
- `failOnDiagnostic(result)` — 只检查返回值的单数 `diagnostic` 字段，有则抛出异常；复数 `diagnostics` 保持为普通 domain result 数据

## Command 执行管理

### runWorkbenchCommandOnce

`runWorkbenchCommandOnce(runtime, command, args, run, options)` 是命令执行包装器：

1. **防重复**：用 `runtime.inFlightCommands` Map（keyed by `operation.key`）跟踪进行中命令
2. **重复请求**：记录 `actionWarnings`（最多保留最近 6 条），发送 chrome 更新后直接返回
3. **启动**：将操作存入 `inFlightCommands`，发送 chrome 更新，启动进度轮询
4. **执行**：调用 `run()` 函数
5. **完成**：
   - 成功 → 更新 `lastCompletedCommand`
   - 失败 → 更新 `lastFailedCommand`，调用 `reportWorkbenchError()`
   - finally → 从 `inFlightCommands` 删除，清理轮询，发送 chrome，根据 `surfacesInvalidatedByCommand()` 刷新受影响的 surface

### 进度轮询

`ensureCommandProgressPolling(runtime)` 在首次命令启动时设置 500ms 间隔轮询：

```typescript
runtime.commandProgressTimer = setInterval(() => {
  if (!runtime.inFlightCommands.size) {
    clearCommandProgressPolling(runtime);
    return;
  }
  refreshWorkbenchCommandProgress(runtime);
}, SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS);
```

`refreshWorkbenchCommandProgress()` 动态解析默认 `SynthesisClient`，通过无参数 `client.workbench.readProgress()` 读取 opaque maintenance projection，经共享 UI adapter 转换后使用现有 runtime merge 合并到 `snapshotInput`，再发送 chrome 更新。该查询不修改 operation lifecycle；持久化 `running` operation 只由显式 startup reconciliation 作为 restart orphan 取消。Citation Graph cache 与 Reference maintenance command 不再主动回调 UI，进度完全由这条持久化状态轮询路径发布。轮询保留 `commandProgressSnapshotRunning` 并发锁、`snapshotInputLocked` 保护、Git/WebDAV Sync chrome fast path、错误 fallback 和 500ms cadence。

### surfacesInvalidatedByCommand

命令完成后的 surface 失效映射：

| 命令类别 | 失效 surface |
|---------|-------------|
| Reference sidecar refresh/retry | index, review, graph |
| 提案操作（apply/merge） | index, review, graph |
| 引用元数据更新 | index, review |
| Graph 操作 | graph |
| Tag vocabulary 操作 | tags |
| Concept KB 操作 | concepts, review |
| 主题 create/update | home, topics, graph, review |
| 主题图操作 | home, topics, graph, review |
| Topic 删除 | home, topics |

未匹配的命令回退到默认 tab 的 surface。

## Surface 管理

### 状态跟踪

每个 runtime 维护 `loadedSurfaces` 和 `dirtySurfaces` 两个 Set：

- `markSurfaceLoaded(runtime, surface)` — 添加 loaded，删除 dirty
- `markSurfaceDirty(runtime, surface)` — 添加 dirty
- `surfaceNeedsServiceRefresh(runtime, surface)` — `!loaded || dirty`

### 数据发送

- **`snapshotForRuntime(runtime)`** — 从 `runtime.snapshotInput` + `actionStatusInput()` 构建 `SynthesisUiSnapshot`
- **`sendChrome(runtime, options)`** — 刷新 chrome：通过 `SynthesisClient.workbench.readChrome()` 获取 ChromeInput（含 maintenance summary、background jobs 等），merge 到 snapshotInput，发送 `synthesis:chrome` 消息
- **`refreshWorkbenchCommandProgress(runtime)`** — 通过 `SynthesisClient.workbench.readProgress()` 获取仅包含 maintenance progress 的 projection，merge 到现有 snapshotInput，只发送 `synthesis:chrome`
- **`sendSurface(runtime, surface, options)`** — 刷新 surface：通过 `SynthesisClient.workbench.readSurface()` 获取 surface 输入数据，merge 到 snapshotInput，标记 surface loaded，发送 `synthesis:surface` 消息。失败时发送 `synthesis:surface-error`
- **`sendSnapshot(runtime, messageType)`** — 发送完整 snapshot（用于 init）

### Surface 请求代际

Surface refresh 是异步且可能乱序返回的。SQLite busy retry 会扩大慢响应窗口，因此 host 和 child frame 都必须把 surface 数据当成带代际的响应处理，而不是“最后到达者覆盖 UI”。

- Host 每次 `sendSurface()` 创建递增 `requestId`，记录到 `latestSurfaceRequestBySurface[surface]`，并把 `{ requestId, surface, selectedTabAtRequest, refreshFromService, startedAt }` 随 `synthesis:surface` / `synthesis:surface-error` 一起发送。
- Host 在 client read 返回后、postMessage 前再次校验该请求仍是目标 surface 的最新请求，且目标 surface 仍是当前活跃 surface。过期或非活跃 surface 的响应只能更新 host 内部 cache，不得覆盖 iframe。
- `scheduleActiveSurfaceRefresh()` 调度时捕获目标 surface。定时器执行时如果用户已经切到其他 tab，调度直接丢弃，不重新读取“当前 tab”后误发另一个 surface。
- Child frame 按 surface 保存 latest accepted request id 与 last-known-good snapshot。旧 request id 的 `synthesis:surface` / `synthesis:surface-error` 必须丢弃。

### 临时存储 busy

`NS_ERROR_STORAGE_BUSY`、`SQLITE_BUSY`、`database is locked` 等读取失败属于 transient refresh failure。Host 用 `isTransientStorageBusyError()` 识别后发送 `synthesis:surface-error`，并标记 `transient: true`、`code: "storage_busy"`。

Child frame 收到 transient error 时不得清空当前 surface 内容；如果有 last-known-good snapshot，继续显示旧内容，并在 surface body/statusbar 显示刷新诊断。如果没有任何 last-known-good snapshot，才显示明确的 diagnostic panel。这个 last-known-good 仅是 UI 展示保护，不是真实数据缓存源。

### 刷新策略

- `scheduleActiveSurfaceRefresh(runtime)` — 通过 `setTimeout(0)` 微任务立即刷新当前 surface
- `scheduleLibraryReadModelSurfaceRefresh(runtime, surfaces)` — 250ms 防抖延迟刷新（library item 变更后触发）。检查当前活动 surface 是否在受影响的 surface 列表中，且 `surfaceNeedsServiceRefresh()` — 两个条件都满足才真正刷新

## 预预热

`prewarmSynthesisWorkbenchSurfaces(args)` 在 tab 实际打开之前预加载 surface 数据：

- 单次运行保护：`prewarmSynthesisSurfacesPromise` 防止重复预热
- 启动时只捕获并转换一次 Workbench state；通过现有 `SynthesisClient.workbench.readChrome()` / `readSurface()` 分阶段加载，不使用 callback、streaming 或 full-snapshot client API
- 默认顺序为 `index → review → graph → tags → concepts → topics`；显式 `surfaces: []` 只预热 chrome；每次 surface read 前先让出事件循环
- chrome 失败终止本轮并由外层 fallback 返回 `undefined`；单个 surface 失败只跳过该 surface
- 每个成功 phase 先更新 `prewarmedSynthesisSnapshotInput` 全局缓存，再动态读取当前 runtime 并 merge：chrome 发布 cached chrome；surface 先标记 loaded，且仅在当前 active 时发布 cached surface
- 完成后：`prewarmedSynthesisSnapshotInput` 供后续 `openSynthesisWorkbenchTab()` / `mountSynthesisWorkbenchRuntime()` 复用

## 库变更通知

### Library Item 变更

`notifySynthesisWorkbenchLibraryItemsChanged(args)` 由 `src/modules/synthesis/itemObserver.ts` 调用：

- 递增全局 `synthesisLibraryReadModelRevision`
- 对所有运行时：
  - 更新 `runtime.libraryReadModelRevision`
  - 标记 `index` surface 为 dirty
  - 触发 250ms 防抖刷新

返回 `{ revision, invalidatedRuntimes, invalidatedSurfaces, event, type, itemCount }`。

### Sidecar 变更

`handleSynthesisWorkbenchSidecarChanged(args)` 注册为 `synthesisWorkbenchInvalidation.ts` 的监听器：

- 根据 `args.graphMayHaveChanged` 决定失效 surface：`false` → 仅 `index`；`true` 或未指定 → `index` + `graph`
- 对所有 runtime 标记 dirty + 防抖刷新 + 发送 chrome 更新
- 返回 `{ invalidatedRuntimes, invalidatedSurfaces, reason, sourceRefs }`

## 辅助能力

### 本地化

`buildSynthesisWorkbenchI18nEnvelope()` 从 Zotero locale system 读取当前语言和所有消息键值，构造 `SynthesisWorkbenchI18nEnvelope`（`{ locale, messages }`）。所有发送给 child frame 的消息都附带此语言包。

### Topic Report 导出

`exportTopicSynthesisReport(runtime, topicId)` 通过现有 `SynthesisClient.topics.getTopicReport()` 读取报告，使用 Zotero FilePicker（`toolkit.FilePicker`）让用户选择保存路径，然后通过 `writeRuntimeTextFile()` 写入 Markdown 文件。

文件名通过 `safeTopicReportExportFileName()` 规范化（替换非法字符，截断至 120 字符）。

### 测试重置

`resetSynthesisWorkbenchTabRuntimeForTests()` 调用 `cleanupSynthesisWorkbenchTab()` 清理全局 `synthesisWorkbenchTab` 实例。

## 常量

| 常量 | 值 | 用途 |
|------|-----|------|
| `SYNTHESIS_WORKBENCH_TAB_ID` | `"zotero-skills-synthesis-workbench"` | Zotero tab ID |
| `SYNTHESIS_WORKBENCH_EMBEDDED_ID` | `"zotero-skills-synthesis-workbench-embedded"` | 嵌入模式 frame ID |
| `SYNTHESIS_WORKBENCH_HANDSHAKE_INTERVAL_MS` | 100 | handshake 轮询间隔 |
| `SYNTHESIS_WORKBENCH_HANDSHAKE_REQUIRED_SUCCESSES` | 5 | 连续成功阈值 |
| `SYNTHESIS_WORKBENCH_HANDSHAKE_MAX_ATTEMPTS` | 80 | 最大尝试次数 |
| `SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS` | 500 | 命令进度轮询间隔 |
| `SYNTHESIS_WORKBENCH_LIBRARY_INVALIDATION_DEBOUNCE_MS` | 250 | 库变更防抖延迟 |
