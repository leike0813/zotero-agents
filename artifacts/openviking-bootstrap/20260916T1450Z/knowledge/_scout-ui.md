# UI 与前端层只读侦察报告

范围：`src/sidebar/`（26 文件，13,715 行）、`src/modules/assistant/`（16 文件，11,102 行）、`src/dashboard/`（21 文件，14,366 行）、`src/synthesis/`（10 顶层 + `components/**` 35 文件，25,891 行）、`src/shared/`（21 文件，6,905 行）、`src/modules/harness/`（12 文件，6,042 行），以及 `addon/content/{dashboard,sidebar,synthesis,workspace,harness,shared}` 下未被生成的页面资源。

方法：只读。使用 `read`/`rg`/`wc -l`/`ls`；未使用 `codegraph explore`（索引库 `.codegraph/codegraph.db` 存在，618 MB，但本次全部问题都能由源码与行号直接回答）。未修改文件、未执行 git 写操作、未安装依赖、未运行构建或测试。

对任务描述的两处校正（事实）：

1. `src/sidebar/` 下 `acpChildApp.js`、`assistantWorkspaceApp.js` 各只有 1 行，是 esbuild 入口转引（`src/sidebar/acpChildApp.js:1` = `import "./assistantWorkspaceAcpChild.js";`），不承载逻辑。
2. `addon/content/` 下**不存在**任何 `.bundle.js` / `app.js` 产物；它们只生成到 `.scaffold/build/addon/content/**`（`zotero-plugin.config.ts:250,276,307,315,324`）。页面 HTML 里 `<script src="./app.js">` 之类的引用在源码树中是断链，属构建期注入。

---

## 1. 职责与边界

### 1.1 六个页面的用户可见职责

| 页面 | 宿主 HTML | 入口源码 → 产物 | 用户可见职责 |
| --- | --- | --- | --- |
| Assistant Workspace 外壳（Zotero 右侧栏） | `addon/content/sidebar/assistant-workspace.html` | `src/sidebar/assistantWorkspaceShell.js` → `assistant-workspace.bundle.js` | 三个 tab（ACP Chat / ACP Skills / SkillRunner）的 iframe 切页、loading 遮罩、关闭按钮、host ready 握手与子页发布转发 |
| ACP Chat / ACP Skills / SkillRunner 子面板 ×3 | `acp-chat.html`、`acp-skill-run.html`、`skillrunner.html`（三个文件的 `body data-source` 分别为 `acp-chat` / `acp-skills` / `skillrunner`） | 三者共用 `src/sidebar/assistantWorkspaceAcpChild.js` → `acp-child.bundle.js` | 单个会话/run 的 toolbar、banner、消息计数、transcript、plan、hint（交互/权限/等待用户）、回复 composer、context/details/permission 抽屉 |
| Task Dashboard | `addon/content/dashboard/index.html` | `src/dashboard/dashboardApp.ts` → `dashboard/app.js` | 首页工作流入口、Products、Workflow Options、Runtime Logs、Synthesis Sidecar 诊断、SkillRunner 连接审计、ACP Trace Replay、Literature 迁移、各 backend 任务表 |
| 后端管理对话框 | `addon/content/dashboard/backend-manager.html` | `src/dashboard/backendManagerApp.ts` → `backend-manager.js` | backend 列表增删改、ACP / Generic HTTP 预设对话框 |
| 工作流设置对话框 | `addon/content/dashboard/workflow-settings-dialog.html` | `src/dashboard/workflowSettingsDialogApp.ts` → `workflow-settings-dialog.js` | 单个工作流的参数与执行选项表单 |
| Synthesis Workbench（+ 两个 standalone 导出） | `addon/content/synthesis/index.html` | `src/synthesisWorkbenchApp.ts` → `synthesis/app.bundle.js`；`src/synthesis/standaloneTopicApp.ts` → `topic-export.bundle.js` | Home / Topics / Concepts / Tags / Index / Review / Reader / Graph 八个 surface，shell 导航、topbar、状态栏 job popover、侧车指示器 |
| Assistant Workspace（旧 workspace 页） | `addon/content/workspace/index.html` | `src/workspaceApp.ts` → `workspace/app.bundle.js` | 通用 workspace 容器（本报告不展开：源码不在任务范围内） |
| Harness（只读测试台） | `addon/content/harness/index.html` | `addon/content/harness/harness-host.js`（手写，非 bundle）+ `scripts/ui-harness-serve.ts` | 左右并排 iframe 同时驱动 Workspace 与 Assistant Sidebar，播放只读 snapshot / publication，11 种 locale 切换 |

### 1.2 区域化渲染 vs 命令式渲染（事实）

**Preact 区域化渲染**（每个 region 一个 `render(vnode, mount)`，region 之间互不清空）：

- Assistant Workspace chrome：`src/sidebar/components/chromeRenderer.ts:71-221`，10 个 region。
- Dashboard：`src/dashboard/dashboardChromeRenderer.ts:186-348`，10 个 region（tabbar + main 下 9 个 surface）；加载错误 banner 由 `renderBackendLoadError` 命令式维护，不算 region。
- Synthesis：`src/synthesis/synthesisWorkbenchChromeRenderer.ts:286-485`，shell / topbar / sidecar / surface / graph-surface / chrome 共 6 个 mount（surface 内再按业务 surface 分派到 8 个组件）。
- Sidebar 静态 chrome：`renderStaticChrome`（`chromeRenderer.ts:247-272`）渲染 view-mode 切换与空态文案。

**命令式渲染**（直接操作 DOM）：

- transcript 行渲染与虚拟滚动：`src/sidebar/assistantTranscriptRenderer.js`（2,715 行）全部命令式，由 `TranscriptRegion` 包一层 Preact 占位边界（见 §3.4）。
- 区域容器标记 / managed mount 创建：`src/sidebar/assistantPanelRenderer.js:94-133`（`adoptPanelRegions`）、`:54-67`（`managedMount`）；页面级对应物 `src/shared/preactRegionMount.ts:19-59`。
- 折叠把手与容器 class：`src/sidebar/assistantRegionCollapse.ts`（250 行），显式声明"不进入任何 region 渲染管线"（`assistantRegionCollapse.ts:1-18`）。
- Dashboard 骨架创建与错误 banner：`dashboardChromeRenderer.ts:92-144`。
- toast：`src/dashboard/dashboardDomUtils.ts`（`showToast` / `disposeToast`，被 `dashboardChromeRenderer.ts:350-359` 在 dispose 时清理）。
- Synthesis 图容器激活/惰性：`synthesisWorkbenchChromeRenderer.ts:218-233`（`setGraphMountActive` 用 `inert` + `visibility` 而非卸载，Sigma 实例因此不重建）。

### 1.3 宿主 ↔ 页面消息边界

三层结构，每层边界都有独立契约：

**A. Zotero 主进程 ↔ Assistant Workspace 外壳（父页）**
- 宿主侧：`src/modules/assistant/workspace/assistantWorkspaceSidebar.ts`（2,069 行）把 `chrome://<addonRef>/content/sidebar/assistant-workspace.html` 挂进 Zotero item/context pane（`:329`、`:372-390`），按钮入口 `:417-420`。
- 契约：`src/shared/assistantWireContract.ts`。消息类型：`ASSISTANT_WORKSPACE_MESSAGE_TYPES`（`:134-151`，9 种）；桥对象 `__zsAssistantWorkspaceBridge`（`:242`）与 `__zsAssistantWorkspaceAcpBridge`（`:245`）。
- 外壳 → 宿主动作只有 3 个：`READY` / `SET_TAB` / `CLOSE_SIDEBAR`（`:257-261`）。
- 宿主 → 外壳：`INIT` / `SURFACE_CONFIG` / `CHILD_PUBLICATION` + 仅 harness 使用的 `SET_TAB`（`:139-141` 注释明确 "production host code never sends it"）。

**B. 外壳 ↔ 三个子 iframe**
- 外壳转发：`src/sidebar/assistantWorkspaceShell.js` 持有 `initializedFrames` / `childDocumentGenerations` / `loadedFrames` / `pendingChildPublications` / `deliveredChildPublications`（`:12-23`），即"每个子页一次性 ready + 按 generation 去重投递"。
- 子页 → 宿主：`ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS`（`assistantWireContract.ts:264-273`）：`ready`、`publication-ack`、`publication-render-observation`、`load-transcript-page`、`request-owner-details`。
- 业务动作词汇：`ASSISTANT_WORKSPACE_ACTION_REGISTRY`（`src/modules/assistant/publication/assistantWorkspacePublication.ts:88` 起），每条含 `scope`（`local` / `target-owner` / `selected-owner` / `navigation-group` / `global`）、`sources`、`payloadKeys`。运行时经 `surface-config` 下发给子页（`assistantWorkspaceAcpChild.js:1809-1814`）。

**C. Dashboard / Synthesis 页面 ↔ 宿主**
- Dashboard：`postMessage` 双向，页面 → 宿主 `{ type: "dashboard:action", action, payload }`（`src/dashboard/dashboardApp.ts:30-50`，目标 `window.parent`/`top`/`opener` 去重广播，`targetOrigin: "*"`）；宿主 → 页面 `dashboard:init` / `dashboard:snapshot`（`dashboardApp.ts:254-265`）。契约唯一源 `src/shared/dashboardWireContract.ts`，宿主侧 `src/modules/dashboard/{dashboardFrame,dashboardSnapshot,dashboardActions}.ts`。
- Synthesis：优先用宿主注入的直连桥 `window.__zoteroSkillsSynthesisWorkbenchBridge`，否则回退 postMessage（`src/synthesis/synthesisWorkbenchApp.ts:1-20` 头部注释）。契约唯一源 `src/shared/synthesisWorkbenchWireContract.ts`，宿主侧 `src/modules/synthesis/workbench/synthesisWorkbenchTab.ts`（142,909 字节）。

---

## 2. 文件地图

### 2.1 `src/sidebar/`（26 文件）

| 文件 | 角色（一句话） |
| --- | --- |
| `acpChildApp.js` | esbuild 入口 shim，转引 `assistantWorkspaceAcpChild.js` |
| `assistantWorkspaceApp.js` | esbuild 入口 shim，转引 `assistantWorkspaceShell.js` |
| `assistantWorkspaceShell.js`（810） | 外壳：tab 切换、iframe 生命周期、host ready 重试、publication 转发与 ack |
| `assistantWorkspaceAcpChild.js`（1,905） | 三个子面板的唯一 runtime：wire 校验、page model、mutation batch 提交、渲染调度、动作派发 |
| `assistantPanelModel.js`（2,073） | 纯投影：`projectAssistantWorkspacePanel(snapshot, ui, labels)` → panel DTO；`statusTone` |
| `assistantPanelRenderer.js`（141） | 迁移后仅剩 `adoptPanelRegions` + `managedMount`（+3 个死导出，见 §9） |
| `assistantTranscriptRenderer.js`（2,715） | 命令式 transcript 渲染器：虚拟滚动、行身份、增量 patch、markdown 代码块装饰、贴底粘性 |
| `assistantRegionCollapse.ts`（250） | toolbar/banner/composer 的容器级折叠控制器（ResizeObserver + 迟滞 + 手动覆盖） |
| `markdownParser.js`（54） | 页面级 markdown-it 单例 memo（`renderSidebarMarkdown`） |
| `prototypeWorkspaceApp.js`（2,600） | issue #36 的 harness 专用原型外壳，生产构建排除 |
| `components/chromeRenderer.ts`（297） | 10 个 managed region 的 Preact 渲染工厂 `createChromePanelRenderer` |
| `components/regionEquality.ts`（200） | sidebar 侧 equality 单一来源：re-export 共享原语 + reply/permission/details/context/messageCounts 选择器 |
| `components/ActionControls.tsx`（269） | 共享按钮/选择控件原语（`PanelAction`、`SelectControl`） |
| `components/ToolbarRegion.tsx`（56） | toolbar 区域，memo 在 `actions` |
| `components/BannerRegion.tsx`（219） | banner 区域，memo 在 `(context, lifecycle)` |
| `components/MessageCountsRegion.tsx`（95） | 消息计数区域（嵌套 memo：counts 内层 + selection 外层） |
| `components/PlanRegion.tsx`（132） | plan 区域 |
| `components/HintRegion.tsx`（440） | interaction/hint 区域：权限摘要、auth 诊断、`waiting_user` 提示与选项、文件槽 |
| `components/ReplyRegion.tsx`（288） | composer 区域：**结构 / 实时双层 equality**，textarea 保留 |
| `components/PermissionDrawerRegion.tsx`（127） | 权限抽屉覆盖层（open 状态进入 signature） |
| `components/DetailsDrawerRegion.tsx`（195） | 详情抽屉（open 状态**不**进入 signature） |
| `components/ContextDrawerRegion.tsx`（562） | 任务/会话上下文抽屉（sections + 选中 task） |
| `components/TranscriptRegion.tsx`（75） | transcript 的 Preact 包装：只拥有 idle/loading/failed 占位 + mode class |
| `components/ViewModeToggle.tsx`（63） | plain/bubble 视图切换按钮 |
| `components/EmptyStateRegion.tsx`（16） | 空态文案区域 |
| `components/replyHistory.ts`（131） | composer 输入历史 key 与状态（session 内） |

### 2.2 `src/modules/assistant/`（16 文件）

`publication/`（10）：

| 文件 | 角色 |
| --- | --- |
| `assistantWorkspacePublication.ts`（1,858） | 发布契约 SSOT：publication schema、action registry、region 构造器（`createIdle/Loading/ReadyTranscriptRegion`） |
| `assistantWorkspacePublicationCoordinator.ts`（574） | 发布协调器：region signature 去重、transcript 车道与 accumulator、排序/ack |
| `assistantWorkspacePublicationRuntime.ts`（1,116） | 运行时：activity 门控、owner 同步、16 ms 合批队列、分页/详情请求、ack 记录 |
| `assistantWorkspaceTranscriptPublication.ts`（686） | transcript item 联合类型、page/mutation/delta DTO、accumulator 与 projection |
| `assistantTranscriptMirrorStore.ts`（817） | 通用 mirror store：事件应用、**cold LRU**、hydrate、分页读 |
| `assistantTranscriptPageProjection.ts`（87） | 可见 item 过滤 + cursor 分页投影（`readUiVisibleTranscriptPage`） |
| `assistantMessageCounts.ts`（117） | assistant/thought/tool 三元计数快照与合并 |
| `assistantExecutionDisplayPolicy.ts`（128） | live/boundary/silent 显示模式偏好与订阅，`ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS = 160` |
| `assistantTranscriptRenderingPreference.ts`（15） | 虚拟滚动开关偏好 |
| `assistantWorkspacePublicationLabels.ts`（242） | 按 source 组装 UI 文案包 |

`workspace/`（6）：

| 文件 | 角色 |
| --- | --- |
| `assistantWorkspaceSidebar.ts`（2,069） | Zotero 侧栏宿主：pane 挂载、按钮与 attention、宿主动作处理、publication 投递 |
| `assistantWorkspacePublicationHost.ts`（1,234） | 宿主侧调度：各 source 的 change → schedule、runtime 配置下发、ack / render observation 记录、诊断 |
| `assistantWorkspaceActionRouter.ts`（1,098） | 动作路由器：把 panel 动作映射到 ACP Chat / ACP Skills / SkillRunner 的领域调用 |
| `assistantWorkspaceSurfaceSkeleton.ts`（213） | 三个 surface adapter 的共享骨架（change→publication 映射、region 读取分派） |
| `assistantPanelLabels.ts`（666） | 面板文案包（FTL key + fallback） |
| `assistantSidebarViewModel.ts`（182） | 侧栏快照/渲染提示模型，`ASSISTANT_SIDEBAR_STREAM_FLUSH_MS = 160` |

### 2.3 `src/dashboard/`（21 文件）

| 文件 | 角色 |
| --- | --- |
| `dashboardApp.ts`（295） | 页面入口 + 控制器：postMessage、projection memo、UI patch、dispose |
| `dashboardChromeRenderer.ts`（362） | 骨架 + 10 个 region 的 Preact 渲染 / dispose |
| `dashboardPanelModel.ts`（1,703） | 纯投影 `projectDashboardPanel` + 10 个 region equality 选择器 |
| `dashboardTypes.ts`（107） | 页面侧 panel DTO、`DashboardUiState`、dispatcher 类型 |
| `dashboardDomUtils.ts`（227） | toast、剪贴板、时间/字节格式化、badge class |
| `dashboardLabels.ts`（23） | label 透传 helper |
| `backendManagerApp.ts`（694）/ `backendManagerRenderer.ts`（185） | 后端管理对话框入口与 6-region 渲染器 |
| `workflowSettingsDialogApp.ts`（116） | 工作流设置对话框入口 |
| `components/*.tsx`（12 文件，10,654 行） | 各 surface region；最大的三个：`ProductsRegion`(1,442)、`BackendManagerRegion`(1,348)、`WorkflowOptionsRegion`(1,216) |

### 2.4 `src/synthesis/`（顶层 10 + components 35）

| 文件 | 角色 |
| --- | --- |
| `synthesisWorkbenchApp.ts`（1,323） | hosted 页面入口 + 控制器：桥、snapshot 应用、surface runtime 分键缓存、chrome signature 门、standalone 分支 |
| `synthesisWorkbenchChromeRenderer.ts`（488） | 骨架 + 6 个 region mount 与 surface 分派 |
| `synthesisWorkbenchPanelModel.ts`（776） | 纯投影 + equality 输入 + `synthesisWorkbenchChromeSignatureInput` |
| `synthesisWorkbenchTypes.ts`（135） | panel / controller 类型 |
| `synthesisSurfaceProjection.ts`（174） | 8 个业务 surface 的 projection 分派 |
| `registryProjection.ts`（100） | Index/Registry surface 选择器投影 |
| `synthesisExportProjection.ts`（77） | reader / graph 的 standalone 导出投影 |
| `standaloneGraphApp.ts`（100）/ `standaloneGraphState.ts`（48）/ `standaloneTopicApp.ts`（118） | 两个 standalone 导出入口与状态 |
| `components/**` | `ShellRegion`、`ChromeRegion`、`HomeRegion`、`TopicsRegion`(+`topicsControls`/`topicsRegionData`)、`ConceptsRegion`、`TagsRegion`、`windowedRows.tsx`、`graph/`(GraphRegion/sigmaIsland/graphModel)、`reader/`(9 文件)、`registry/`(6 文件)、`reviewCenter/`(5 文件) |

### 2.5 `src/shared/`（21 文件）

见 §4 契约表；此外 `regionEquality.ts`（42）、`preactRegionMount.ts`（77）、`customSelect.tsx`（312）、`acpToolCallDisplay.ts`（336）、`citationGraphStandalone.ts`（489）、`citationGraphVisualRules.ts`（391）、`topicTimelineRenderer.ts`（567）、`literatureScore.ts`（153）、`zoteroRuntimeVersion.ts`（16）为区域无关的页面共享实现。

### 2.6 `src/modules/harness/`（12 文件）

| 文件 | 角色 |
| --- | --- |
| `assistantReadonlyPublication.ts`（1,966） | harness 的 Assistant Workspace 只读发布会话（构造 owner / page / region，记录而不执行写类动作） |
| `dashboardReadonlyModel.ts`（1,071） | 从 plugin state DB + prefs + workflows 组装只读 Dashboard snapshot |
| `synthesisReadonlyPort.ts`（847） | Synthesis surface 的只读 port（复用 `packages/synthesis-contracts` 的 read state 重建） |
| `synthesisReadonlyClient.ts`（65） | 把只读 port 接成 SynthesisClient |
| `zoteroReadonlyLibraryAdapter.ts`（552） | 从 Zotero DB 备份读 note/附件/reference sidecar |
| `sqliteReadonly.ts`（200） | 只读 SQLite 适配（拒绝写语句、稳定备份快照） |
| `pluginStateReadonly.ts`（435） | plugin state DB 只读行投影 |
| `prefsReadonly.ts`（76）/ `env.ts`（66） | prefs / 环境变量只读解析 |
| `backendsReadonly.ts`（168） | backend 注册表只读投影 |
| `skillRunnerReadonlyProjection.ts`（455） | SkillRunner run 只读投影 |
| `synthesisWorkbenchI18nEnvelope.ts`（141） | 从 locale FTL 组装 harness i18n envelope |

---

## 3. 区域化渲染模型

### 3.1 signature equality 的两个共享原语

`src/shared/regionEquality.ts`（页无关）：

- `safeText(value)`（`:12`）：`String(v ?? "").trim()`。
- `stableRegionSignature(value)`（`:16`）：`JSON.stringify(value ?? null)`，异常时退回 `safeText`。
- `equalBySignature(prev, next)`（`:24`）：先引用相等 → null/undefined 合并 → 同型 string/boolean 短路 false → 否则比较 signature 字符串。`:25-29` 注释明示这些快速路径与 `JSON.stringify` 输出等价（数字故意落到字符串比较，NaN/Infinity 都 stringify 成 `null`）。

`src/sidebar/components/regionEquality.ts`（sidebar 侧）：re-export 上述三者（`:15-19`），并追加 region 专用选择器与 `labelOf` 点号查找（`:51-64`）。文件头 `:1-11` 明确："imperative guard 与 Preact memo 共用同一批字段选择，迁移期边界不能漂移"。

### 3.2 managed region 的挂载机制

- Assistant Workspace：`assistantPanelRenderer.js:54-67` `managedMount(container, name)` 在容器下建 `.assistant-panel-managed-view.assistant-panel-managed-{name}` 并给容器加 `is-assistant-managed`；`drawer`/`details` 额外加 `asst-drawer-panel`。
- Dashboard / Synthesis：`preactRegionMount.ts:19-39` `ensureRegionMount(container, name, before?)` 建 `[data-region-mount="{name}"]`，支持 `before` 指定插入位置（Synthesis 用它把 topbar mount 插到既有 `.topbar-controls` 之前：`synthesisWorkbenchChromeRenderer.ts:321-325`）。
- 卸载：Dashboard `dispose()` 对全部 `[data-region-mount]` 调 `render(null, mount)`（`dashboardChromeRenderer.ts:356-358`）。

### 3.3 各 managed region 与 signature 字段

**Assistant Workspace（10 个）**——由 `chromeRenderer.ts:71-221` 逐个 render，props 即 equality 选择器：

| region | mount 名 | signature 输入（字段来源） |
| --- | --- | --- |
| messageCounter | 直接 render 进 `regions.messageCounter`（无 mount） | `messageCountsEqualityInput(panel)`：`scopeKey, executionKey, active, current, cumulative, completeness, revision, labels(transcript 文案)`（`regionEquality.ts:77-92`） |
| toolbar | `toolbar` | `panel.actions.toolbar`（`chromeRenderer.ts:93`），组件 memo 在 `actions`（`ToolbarRegion.tsx:55`） |
| banner | `banner` | `(panel.context, panel.lifecycle)`（`chromeRenderer.ts:105-106`），组件 memo 二者（`BannerRegion.tsx:215`） |
| plan | `plan` | `panel.plan` + `panel.interaction.kind` + `labelOf("plan.title")`（`chromeRenderer.ts:118-127`），组件 memo（`PlanRegion.tsx:128`） |
| hint | `hint` | `panel.interaction`（`chromeRenderer.ts:138`），组件 memo（`HintRegion.tsx:439`） |
| reply | `reply` | `replyRegionEqualityInput(panel)`：`{structure, live}`，structure = `action/tone/clearOnSend/showUsageGauge/controls`，live = `enabled/inputEnabled/placeholder/hint/submitLabel/sending/payload/value/usage`（`regionEquality.ts:111-140`） |
| details | `details` | `detailsDrawerEqualityInput`：`title, details[], loading, actions.details[], labels`（`:162-177`）——**不含**抽屉开合 |
| drawer | `drawer` | `contextDrawerEqualityInput`：`layout, contextTitle, selectedTaskKey, contextCount, sections, notice, labels`（`:184-199`） |
| permission overlay | root 下 `.assistant-panel-permission-drawer-overlay`（惰性创建，`chromeRenderer.ts:199-207`） | `permissionDrawerEqualityInput`：`{open, request, labels{close,title}}`（`:145-157`）——**含**开合 |
| transcript | `regions.transcript` 容器（Preact 只占位） | `{state, message, mode, ownerKey}` + `container` 引用（`TranscriptRegion.tsx:59-74`） |

注意 `adoptPanelRegions`（`assistantPanelRenderer.js:114-132`）给 8 个容器打了 `data-assistant-region` 标记，**唯独没有 `details`**——details 只靠 `managedMount` 拿到 mount，没有 region 标记属性。

**Dashboard（10 个）**：`dashboardPanelModel.ts:1642-1702` 的 selector 全部是 `panel.tabbar` / `panel.home` / `panel.views.{products,workflowOptions,runtimeLogs,synthesisSidecar,skillrunnerConnectionAudit,acpTraceReplay,migrations,backend}` 的直接投影，组件侧 `memo(..., equalBySignature(prev.selection, next.selection))`。关键不变量写在 `dashboardTypes.ts:80-90` 与 `dashboardPanelModel.ts:1-6`：**只有选中 tab 的 view 非 null**，隐藏 tab 的数据变化不进入可见 region 的 equality 输入。

**Synthesis（6 个）**：`synthesisWorkbenchPanelModel.ts:723-747` 对应 `panel.{shell,topbar,chrome,sidecar,surface}`；graph 区域额外持有跨消息的 `graphSelection`（`synthesisWorkbenchChromeRenderer.ts:240,362-379`）——切到非 graph surface 时保留 selection 并只把 mount 置为 `inert`，因此 Sigma 实例与 camera 不被重建。

**组件级 memo 分布**（`rg "equalBySignature"`）：sidebar 16 处、dashboard `components/` 13 处（含 `AcpTraceReplayRegion` 的 3 层嵌套 memo：`:658`、`:827`、`:1134`）、synthesis 组件若干。所有 region 组件均为 `memo(..., equalBySignature)`。

### 3.4 transcript 渲染器（`assistantTranscriptRenderer.js`，2,715 行）

**常量与状态容器**（`:37-45`）：`VIRTUAL_PAGE_SIZE = 80`、`VIRTUAL_PAGE_CACHE_LIMIT = 5`、`VIRTUAL_RENDER_WINDOW_LIMIT = 120`、`VIRTUAL_RENDER_BUFFER = 20`、`VIRTUAL_ESTIMATED_ROW_HEIGHT = 88`、`VIRTUAL_PAGE_LOAD_THRESHOLD_PX = 320`。状态挂在 `WeakMap`：`virtualTranscriptStates`（每容器一份虚拟滚动状态）、`transcriptBottomStickStates`、`transcriptNodeMaps`（`:3`，行节点索引）。

**行身份（row identity）**：两层键。

- 缓存项键：`virtualTranscriptEntryKey(entry)`（`:382-392`）——优先 `"item:" + itemId`，否则 `"index:{i}:{itemKind}:{role}"`。
- 已渲染行键：`virtualTranscriptRenderedRowKey(item, index, virtual)`（`:394-413`）——虚拟窗口内直接取 `virtual.rowKeys[index]`（由 layout position 计算），否则回退 `item.rowKey` 或 `"rendered:{i}:{rowKind}:{role}"`。
- 键落到 DOM：`applyVirtualTranscriptRowMetadata`（`:415-428`）写 `data-assistant-virtual-row-key` / `data-assistant-virtual-row-index`。
- 行级 diff 门：`renderAssistantTranscriptItemIfChanged`（`:2168-2210`）比较 `transcriptItemSignature(item, options)`（`:2125-2166`，23 个字段含 `rowKey/itemIds/rowKind/role/status/text/summary/createdAt/updatedAt/revision.count/items[]`，用 `\u001f` 连接）与行上 `data-assistant-render-signature`；**streaming 追加特例**：当 `kind∈{message,thought}` 且 `state==="streaming"` 且新文本以旧文本为前缀且 body 只有一个文本子节点时，走 `textNode.appendData(suffix)`，避免重建 DOM（`:2178-2201`）。

**虚拟滚动**：

- 状态：`getVirtualTranscriptState(container)`（`:71-94`）持有 `ownerKey / pages(Map<cursor,page>) / loadingCursors / rowHeights / itemLocations / lastVirtual / lastAnchor`。
- 布局：`buildVirtualTranscriptLayout`（`:481-517`）按 `measuredVirtualRowHeight`（`:474-479`，命中 `rowHeights` 用实测值，否则 `estimatedVirtualRowHeight` 按文本长度估算，上限 4096）累加 top/bottom。
- 窗口：`buildVirtualTranscriptWindow`（`:733-894`）取 `[scrollTop - overscan, scrollTop + viewport + overscan]` 命中的 positions，再前后各留 `renderBuffer` 行，超 `renderLimit` 时以首个可视行居中裁剪；产出 `rowKeys / topSpacerHeight / bottomSpacerHeight / cachedTopBoundary / cachedBottomBoundary / previousCursor / nextCursor / loadingGap` 与一个 **signature 字符串**（`:863-892`，含 start/end、总数、上下 spacer、loadingGap、以及每行的 `key:height:itemId`）。
- 分页：`maybeRequestVirtualTranscriptPages`（`:930-958`）在距缓存上下边界 < 320 px 时请求 `previousCursor` / `nextCursor`；`requestVirtualTranscriptPage`（`:901-928`）先看 `isVirtualPageCachedOrLoading`（`:896-899`）去重，写入 `loadingCursors` 后回调 `onRequestPage`，并挂 5 s 定时器兜底清除游标。
- 缓存淘汰：`trimVirtualTranscriptPages`（`:357-380`）保留离当前视口最近的 `pageCacheLimit`（默认 5）页，然后 `rebuildVirtualTranscriptItemLocations` + `pruneVirtualTranscriptRowHeights`（`:430-445`，只保留仍在缓存里的行高）。
- 滚动锚定：`captureVirtualScrollAnchor`（`:637`）/ `restoreVirtualScrollAnchor`（`:663`）/ `isVirtualSpacerAnchor`（`:659`）；贴底粘性由 `installAssistantTranscriptStickiness`（`:1382`）+ `ASSISTANT_TRANSCRIPT` 系列的 `scheduleAssistantTranscriptBottomStick`（`:1490`）驱动，`renderAssistantTranscript` 末尾按 `shouldStick` 决定贴底或恢复锚点（`:2664-2688`）。
- 增量 effect 通道：`applyAssistantTranscriptEffectsExact`（`:2361-2489`）/ `Unsafe`（`:2212-2360`）按 `effect.mutations` 的 `upsert_item/append_text/patch_item/delete_item` 只改受影响行，失败返回 `{ok:false, failure:{stage,code}}`，码表与 `assistantWireContract.ts:222-235` 的 ack failure code 对齐。

**与 Preact 的分界**：`renderAssistantTranscript`（`:2495-2697`）只在容器上做 `renderAssistantTranscriptPage`/`renderMutationEffect` 调用；`TranscriptRegion` 在 `state==="ready"` 时返回 `null`，Preact 永不 diff 命令式行（`TranscriptRegion.tsx:44`）。进入非 ready 态时由 `onResetVirtualState` 清空虚拟状态并移除 `data-assistant-transcript-order-key` / `-mode-key`（`assistantWorkspaceAcpChild.js:1406-1413`）。

**与宿主分页的对接**：`assistantWorkspaceAcpChild.js:1446-1459` 把 `onRequestPage` 转成 `LOAD_TRANSCRIPT_PAGE` 控制动作（cursor + limit）；恢复失败时 `recoverRenderFailure`（`:1673-1712`）先 `renderTranscriptRegionReset` 再清空容器子节点，最后重渲染。

---

## 4. 跨边界契约

| 契约文件 | 服务页面 | 宿主侧消费方 | 页面侧消费方 |
| --- | --- | --- | --- |
| `src/shared/assistantWireContract.ts`（273） | Assistant Workspace 外壳 + 三个子面板 | `src/modules/assistant/**`（经 `assistantWorkspacePublication.ts:14-24` re-export）、`assistantWorkspaceSidebar.ts` | `src/sidebar/{assistantWorkspaceShell,assistantWorkspaceAcpChild}.js`、`components/chromeRenderer.ts` |
| `src/shared/dashboardWireContract.ts`（1,271） | Task Dashboard + backend-manager + workflow-settings-dialog | `src/modules/dashboard/{dashboardSnapshot,dashboardActions,dashboardFrame}.ts`、`src/modules/taskDashboardSnapshot.ts` | `src/dashboard/*.ts`、`dashboardTypes.ts:8-13` |
| `src/shared/synthesisWorkbenchWireContract.ts`（1,328） | Synthesis Workbench + standalone 导出 | `src/modules/synthesis/workbench/synthesisWorkbenchTab.ts` | `src/synthesis/synthesisWorkbenchApp.ts:22-37` |
| `src/shared/synthesisWorkbenchI18nContract.ts`（19） | Synthesis Workbench + harness | 经 `src/synthesisWorkbenchI18n.ts`（message SSOT） | `src/synthesis/**` 页面投影、`src/modules/harness/synthesisWorkbenchI18nEnvelope.ts` |
| `src/shared/hostBridgeAgentContract.ts`（29） | 非页面：Host Bridge 协议/表面 schema 常量 | Host Bridge 三层表面 | — |
| `src/shared/hostBridgePluginSkillBundleContract.ts`（57） | 非页面：plugin skill bundle manifest | 打包/校验脚本 | — |
| `src/shared/assistantActionContract.ts`（493）/ `assistantInteractionContract.ts`（520） | Assistant Workspace | 两侧共用（`parseAssistantPendingInteraction` 等） | `assistantWorkspaceAcpChild.js` |

三条硬约束在注释里写明（事实）：契约文件不得 import `src/modules/**`，以保证页面 bundle 不拉入特权代码（`assistantWireContract.ts:1-10`、`dashboardWireContract.ts:1-14`、`synthesisWorkbenchWireContract.ts:1-14`）；契约内类型必须是纯 JSON 可序列化 wire shape；宿主内部状态（如 `DashboardState`）不得跨 `postMessage`。

**契约漂移测试**：`tests/assistant/190-assistant-workspace-wire-drift.test.ts` 锁定 re-export 一致性、publication kind 全覆盖、key 列表无重复/无禁区交集、message type / bridge key / action 词表一致性（`:63,144,163,188,217`）。

---

## 5. 主要流程

### 5.1 侧边栏 ACP 对话：发起 → 流式 transcript → 区域刷新

1. **用户输入**：`ReplyRegion.tsx` 的 composer 提交，动作名取自 `panel.reply.action`（ACP Chat 投影为 `"send-prompt"`，`src/sidebar/assistantPanelModel.js:1901`）并携带 `{ message }`（`src/sidebar/components/ReplyRegion.tsx:187-196`）→ `chromeRenderer.ts:150-159` 注入的 `onAction` → `assistantWorkspaceAcpChild.js` `handlePanelAction`（`:1472` 起）→ `sendAction`（`:1270`）经桥发 `assistant-workspace:child-action`。
2. **外壳转发**：`assistantWorkspaceShell.js` 收到 child action，转成 shell → host 的 `ACTION`/`CHILD_ACTION` 信封（`assistantWireContract.ts:143-144`）。
3. **宿主路由**：`assistantWorkspaceSidebar.ts` 的宿主动作处理 → `assistantWorkspaceActionRouter.ts` 的动作表（`"send-prompt"` 条目在 `:698`，其中 `"acp-chat"` 分支调 `sendAcpConversationPrompt`，同文件 `:704-712`）→ `src/modules/acp/chat/acpSessionManager.ts` 发送 `session/prompt`。
4. **流式落地**：ACP 流事件写进 mirror（`src/modules/acp/chat/acpChatTranscriptMirror.ts`；事件 op 见 `assistantTranscriptMirrorStore.ts:10-14`）。mirror 只改 owner state，随后触发 workspace change 订阅。
5. **发布调度**：`scheduleAcpChatPublications`（`assistantWorkspacePublicationHost.ts:406-421`）带 context（target / activeTab / 虚拟化开关 / 显示模式）调 `runtime.schedule`。
6. **运行时裁决**：`assistantWorkspacePublicationRuntime.ts:437-507` 先判 activity 与 owner 匹配（不匹配即 `dropped` 并记 hook）；owner 变化时先 `synchronizeOwner` + `initialize`（owner-first）并返回 `initializing`。
7. **transcript 走快车道**：`mapped.transcript` 存在时**立即** `coordinator.publishDomainChange(... form:"mutations")`（`:545-557`），不经过 16 ms 队列；其余 region kind 与 transcript snapshot 请求进 `queue`（`:1003-1021`，16 ms 定时器合批，同 source+owner 的 lane 合并 kinds）。
8. **协调器去重**：`publishRegion` 用 `JSON.stringify(payload)` 作 signature，键为 `source\nownerKey\npublicationKind`，命中即跳过（`assistantWorkspacePublicationCoordinator.ts:111-144`），并打点 `panel_signature` / `panel_signature_bytes` / `panel_signature_skip`。
9. **跨进程投递**：宿主 → 外壳 `CHILD_PUBLICATION`，外壳按 `childDocumentGenerations` 去重后 → 子页 `ACP_PUBLICATION`（`assistantWorkspaceAcpChild.js:1848-1850`）。
10. **子页应用**：`createController({render, ack, recoverRenderFailure})`（`:1714-1795`）按 `publicationKind` 分派：
    - `transcript` + `effect.kind === "mutations"` → `renderMutationEffect`（`:1633-1671`）→ `applyAssistantTranscriptEffectsExact`，只碰受影响行；
    - `transcript` + `effect.kind === "cache-page"` → `renderTranscriptPage`（整页）；
    - 其它 → `renderPanel()`（重投影 panel 并逐 region render）。
11. **ack 回流**：`ack(publication, stage, outcome, reason, renderFailure)`，stage ∈ `shell-receive/shell-forward/child-apply/render-complete`（`assistantWireContract.ts:192-196`），失败带 `failure.stage` + `failure.code`；宿主记入 `recordWorkspacePublicationAck` / `recordWorkspacePublicationRenderObservation`（`assistantWorkspacePublicationHost.ts:898,991`）。
12. **失败恢复**：`recoverRenderFailure`（`:1673-1712`）对 transcript 做硬重置后全量重渲染并上报 `renderPath: "recovery-full"`。

**区域解耦的关键点（事实）**：transcript mutation 走 `renderMutationEffect`，不调用 `renderPanel()`；只有 `owner-navigation` 等 kind 才 `renderPanel()` 并额外补一次 `renderTranscript()`（`:1778-1793`）。因此 transcript-only 更新不会重建 toolbar/banner/drawer。

### 5.2 Dashboard：打开 → 快照加载 → 操作派发

1. **宿主打开**：`src/modules/dashboardHost.ts:26-99` `openTaskDashboard`，非 embedded 时用 `ztoolkit.Dialog` 开窗；iframe URL 由 `src/modules/dashboard/dashboardFrame.ts:31-35` 生成 `chrome://<addonRef>/content/dashboard/index.html?ui=…`。
2. **页面自举**：`dashboardApp.ts:293-295` 在存在 `#app` 时 `bootstrapDashboardApp()`；`:274` 先 `sendDashboardAction("ready", {})`。
3. **快照到达**：`:254-265` 监听 `dashboard:init` / `dashboard:snapshot` → `controller.applySnapshot`（`:137-152`）——重置 README 滚动槽、写入 snapshot、**清空乐观 tab override**（宿主对选中 tab 有权威）、`renderCurrentPanel()`。
4. **投影 memo**：`:76-133` 以 `(snapshot 引用, selectedTabKey, traceFilter, selectedTraceId, outcomeFilter, operationFilter)` 为键缓存 `projectDashboardPanel` 结果；键相同直接复用同一 panel 对象，从而让所有 region selection 引用相等、memo 短路而无需重新序列化 signature。
5. **区域渲染**：`dashboardChromeRenderer.renderPanel`（`:186-348`）——每次都对每个 region 调 `ensureRegionMount` + `render(vnode, mount)`；未选中 tab 的 region 传 `null`，得到 `render(null, mount)`。
6. **操作派发**：region 组件调 `deps.dispatchAction`（`:221` 等）→ `dashboardApp.ts:166-201`：4 个 page-local action（`synthesis-sidecar-select-trace` / `-set-trace-filter` / `-set-outcome-filter` / `-set-operation-filter`）写回 UI state 并同步重投影；其余原样 `sendAction` 给宿主。
7. **tab 点击**：`handleSelectTab`（`:153-156`）先 `onUiChange({selectedTabKey})`（乐观）再 `sendAction("select-tab", …)`。
8. **销毁**：`pagehide` → `dispose()`（`:276-285`）先 `renderPanel(null)` 再 `chromeRenderer.dispose()`，后者卸载全部 region mount 并 `disposeToast()`。

### 5.3 Synthesis：快照 → surface runtime → 区域刷新（补充）

- `synthesisWorkbenchApp.ts` 用 `surfaceRuntimeKey(surface, snapshot)`（`:407`）为每个 surface 维护独立 runtime（`{status, snapshot}`），`retainedBusiness`（`:786`）在 chrome-only 更新时保留上一次成功投影的业务 surface——对应硬约束"surface 刷新失败必须保留已成功加载内容"。
- `chromeSignature()`（`:838`）是**投影级**门（`synthesisWorkbenchChromeSignatureInput`，`synthesisWorkbenchPanelModel.ts:759-776`：actions / localPendingActions / backgroundJobs / sidecarStatus / sync.status / jobPopoverOpen），只用于跳过冗余投影，不参与 region memo。

---

## 6. 性能相关机制

| 机制 | 实现位置 | 要点 |
| --- | --- | --- |
| **cold mirror LRU** | `src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:587-657` | `Map` 保序即 LRU；`touch` 跳过 live owner（`:633-636`）与未 hydrate 的 owner；`prune` 先剔除 live/已消失 key，再在超限时从最旧开始 `forceRelease`；`shouldReleaseOnEvict` 可覆盖默认的"非 pinned 才释放" |
| **LRU 容量** | `src/modules/acp/chat/acpChatTranscriptMirror.ts:45`（`ACP_CHAT_COLD_TRANSCRIPT_MIRROR_CACHE_LIMIT = 10`）、`src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:61`（同值 10） | 按 owner 维护：Chat 键 `backendId\nconversationId`，Skills 用 `requestId` |
| **pinned 语义** | `assistantTranscriptMirrorStore.ts:595-596` | `isLive(state) \|\| isForeground(state)` 即 pinned，不参与淘汰；`releaseIdleBackgroundTranscriptMirror`（`:737-773`）对 live 直接出队、对 foreground 只 touch、有未完成写入时等 `Promise.allSettled` 后再递归释放 |
| **mirror hydrate 去重** | 同上 `:659-735` | `core.transcriptHydratePromise` 存在则 await 复用（`:674-677`）；`shouldSkipHydrate` / `transcriptMirrorLoaded` 短路；hydrate 前可按需 flush 未完成写入 |
| **分页读（mirror 优先，store 兜底）** | `src/modules/acp/chat/acpChatWorkspaceSurface.ts:207-245` | `readAcpConversationTranscriptMirrorPage(...) \|\| await readAcpConversationTranscriptPage(...)`；mirror 未命中仍能靠 indexed page read 渲染 |
| **分页投影** | `assistantTranscriptPageProjection.ts:30-87` | `normalizeLimit` 夹在 `[1, maxLimit]`；默认游标为 `total - limit`（尾页对齐）；`prevCursor/nextCursor` 由可见项切片推导；`live` 模式才显示 streaming item（`:19-27`） |
| **分页尺寸** | `acpChatTranscriptMirror.ts:46-47` / `acpSkillRunTranscriptMirror.ts:59-60` / `acpSkillRunTranscriptStore.ts:29-30` | 默认 80，最大 200（与渲染器 `VIRTUAL_PAGE_SIZE = 80` 对齐） |
| **渲染器页缓存** | `assistantTranscriptRenderer.js:357-380`, `:690-731` | 最多 5 页内存窗口；`virtualTranscriptCacheEntries` 把多页 items 按绝对 index 合并去重 |
| **行高缓存清理** | `:430-445` | 只保留仍在页缓存里的行高 key，防止长会话无界增长 |
| **单行增量 patch（streaming 追加）** | `:2168-2210` | `appendData(suffix)` 快路径，避免整行重建；否则落回 `renderAssistantTranscriptItem` |
| **行级全量重渲染门** | `:2599-2663` | `contextKey`（virtual/items + variant + mode + ownerKey）或 mode 变化或 nodeMap 缺失才 `clearNode` 全量；否则按 `rowKey` 做增删改 diff |
| **loader 隔离（per-owner loading）** | `assistantWorkspaceAcpChild.js:1382-1420` + `:1758-1777` | transcript 状态机由 region.status 推导；`render` 分派中 transcript 分支只走 effect 或整页，不调用 `renderPanel()` |
| **in-flight 去重（分页请求）** | `assistantTranscriptRenderer.js:896-928` | `loadingCursors` 集合 + 5 s 兜底定时器；同 cursor 在飞行中不重复请求 |
| **in-flight 去重（owner-details）** | `assistantWorkspacePublicationRuntime.ts:760-779` | `detailsRequestEpoch` 单调递增，响应回来时 epoch 不匹配即丢弃 |
| **发布合批（非 transcript）** | `:1003-1021` | 16 ms 定时器 + 同 `source\nownerKey` lane 合并 kinds，避免每帧多次 region 读 |
| **发布 signature 去重** | `assistantWorkspacePublicationCoordinator.ts:111-144` | `JSON.stringify(payload)` 比较，命中即跳过并打点 |
| **transcript 快车道** | `assistantWorkspacePublicationRuntime.ts:543-557` | mutation 立即发布，不等 16 ms 队列 |
| **投影 memo（Dashboard）** | `src/dashboard/dashboardApp.ts:76-133` | 引用级缓存，使 region selection 引用相等、memo 免于重新序列化 signature |
| **surface 级 snapshot 缓存（Synthesis）** | `src/synthesis/synthesisWorkbenchApp.ts:407-426`, `:786` | 每 surface 独立 runtime + `retainedBusiness` 保留旧内容 |
| **虚拟滚动（Synthesis 表格）** | `src/synthesis/components/windowedRows.tsx`（418 行） | 通用 `WindowedRows` hook：`getKey` / `resetKey` / `measureRow` / `scrollToIndex`，含 top/middle/bottom 三段 spacer |
| **确定性编辑器实例复用（Synthesis Graph）** | `synthesisWorkbenchChromeRenderer.ts:218-233` | 非激活时 `inert` + `visibility:hidden` 而不是卸载 mount |
| **写前 flush 顺序** | `assistantTranscriptMirrorStore.ts:680-698` | hydrate 前先等未完成写入，防止旧快照覆盖新事件 |
| **SkillRunner 有界内存历史** | `src/modules/skillRunner/surface/skillRunnerRunDialog.ts:1354-1355`, `:3229-3230` | 会话消息上限 500 条（`slice(-500)`），即其"mirror"；不维护 cold full mirror 缓存 |

---

## 7. 样式与设计 token

`addon/content/shared/page-chrome.css`（259 行）由 Dashboard（`addon/content/dashboard/index.html:11`）与 Synthesis（`addon/content/synthesis/index.html:14`）共同 link；`addon/content/dashboard/styles.css:199,2468` 与 `src/dashboard/dashboardChromeRenderer.ts:146-148` 在注释里引用它作为唯一来源。

文件头 `:1-26` 是**滚动所有权模型的权威注释**（原文要点）：

- **L0 页面根**：永不滚动（`overflow:hidden`），由 grid 切出 chrome。
- **L1 chrome**：侧栏导航可内部滚动；topbar/statusbar 永不滚。
- **L2 面板根**（`.zs-fill-col`）：列 flex、`overflow:hidden`、`min-height:0`；固定区（面板头、工具栏、筛选行、分页）不随内容滚动。
- **L3 主滚动区**：每个面板**有且仅有一个**主内容滚动区（`flex:1; min-height:0; overflow:auto`），sticky 表头位于其内部。Dashboard 用共享 `.zs-scroll-region`；Synthesis 各 surface 用自身表格容器（`.concept-table-wrap`、`.tags-table-wrap`）承担同一角色。区域内的 table wrapper 被压平（`max-height:none`），只有独立滚动容器才留在区域外。
- **L4 有界二级区**：概念审阅面板（`max-height:42%`）、标签导入浮层（`max-height:45%`）可保留自身滚动，但不得承载主内容；drawer / popover / dialog body 与 Sigma canvas 自管滚动。

代码里的对应固化：

- 工具类：`.zs-fill-col`（`:158-164`）、`.zs-scroll-region`（`:166-170`）、`.zs-panel-fixed`（`:172-174`）。
- Dashboard 侧压平规则：`addon/content/dashboard/styles.css:439-443`（`.zs-scroll-region .table-wrap { max-height:none; overflow:visible; }`，`:430` 的 320px 只对区域外独立滚动容器生效）。
- Synthesis 侧二级面板：`addon/content/synthesis/styles.css:2390`（`max-height:45%`）、`:2559`（`max-height:42%`）。
- 共享受理 token：`--zs-control-*`（`:29-34`，深色覆盖 `:65-72` + `prefers-color-scheme` `:74-83`）、`--zs-text-{xs,sm,md,lg}`（`:36-39`）、`--zs-space-{1..6}`（`:41-46`）、`--zs-badge-*` 系列（`:48-62`，全部派生自 `theme.css` 的语义色，文件头声明"never hardcodes raw colors outside the token definitions"）。
- 共享模式：`.zs-panel-header*`（`:87-127`）、`.zs-back-link`（`:131-155`，二级视图页头左侧第一位）、`.zs-empty`（`:177-187`）、`.zs-badge` + 4 个修饰符（`:191-227`）、`.zs-status-dot`（`:230-249`）、`.zs-icon-btn`（`:252-258`）。

`addon/content/synthesis/styles.css` 使用 `zs-` 前缀 328 处（主要是继承来的 `.zs-icon`），未自行重定义 token 名——与硬约束一致。

---

## 8. 测试覆盖

### 8.1 `tests/ui/`（16 个 `*.test.ts` + `testMode.ts`/`workflow-test-utils.ts` 两个辅助模块）

与本次范围直接相关：

| 测试 | 覆盖主题 |
| --- | --- |
| `156-ui-readonly-harness.test.ts` | Harness 端到端：Dashboard bundle 经 Harness 路由自举（`:400`）、prefs 只读（`:512`）、只读 SQLite 拒绝写（`:590`）、备份快照打开（`:616`）、Dashboard 只读快照对齐（`:646`）、Assistant 只读 publication 序列（`:821`）、权限/transcript payload（`:852`）、写类 registry 动作只记录不执行（`:905`）、owner-select 走 owner-switch 初始化（`:957`）、分页请求与 ack（`:1011`）、协议动作白名单（`:1069`）、Synthesis 全 surface 只读 + 阻断变更（`:1208`）、i18n envelope（`:1426`）、locale 切换边界（`:1452`） |
| `49-dashboard-products-scroll-stability.test.ts` | Products 表格滚动稳定性 |
| `46-shared-markdown-renderer-contract.test.ts` | 共享 markdown renderer 契约 |
| `157-synthesis-sidecar-dashboard.test.ts` | Dashboard 侧车诊断面板 |
| `264-literature-migration-region.test.ts` | 迁移 region |
| `35-workflow-settings-execution.test.ts` / `50-workflow-settings-dialog-model.test.ts` | 工作流设置对话框 |

### 8.2 `tests/dashboard/`（13 文件）

`241-dashboard-chrome-scaffold`（region subtree identity `:421`、region selector 隔离高频字段 `:457`、乐观 tab 覆盖 `:480`）、`242-dashboard-workflow-options`、`243-dashboard-products`、`244-dashboard-backend`、`245-dashboard-runtime-logs`、`246-dashboard-synthesis-sidecar`、`247-dashboard-skillrunner-audit`、`248-dashboard-acp-trace-replay`、`249-dashboard-integration`、`250-dashboard-workflow-settings-dialog`、`251-dashboard-backend-manager`、`252-region-equality`（只用两个 `it`，参数表逐对比较 `equalBySignature` 与 legacy `JSON.stringify` 等价性，含 null/undefined/数字/布尔/嵌套）、`253-dashboard-panel-scroll-ownership`（3 个 `it`，只断言 DOM 结构不断言 CSS 值）、`60/62/64` 为 dashboard 任务历史/快照/工具按钮。

### 8.3 `tests/assistant/`（5 文件）

`108-assistant-execution-display-policy`、`138-workspace-toolbar-running-popover`、`190-assistant-workspace-wire-drift`（见 §4）、`192-assistant-workspace-chrome-components`（逐 region 单测：渲染、零 DOM 工作、子树恒等、pending 标记、roving tabindex、事件 payload）、`200-assistant-region-collapse`（迟滞分级、手动覆盖、把手挂在区域容器、折叠不破坏子树恒等 `:215`）。

### 8.4 其它相关

- `tests/acp/97-acp-ui-smoke.test.ts`（55 个 `it`，本范围最重的 DOM 身份测试）：直接 import `assistantTranscriptRenderer.js`（`:8`）与 `chromeRenderer`（`:31`），断言点包括"transcript 更新不重建 managed chrome"（`:811`）、"owner 切换 loading-first"（`:1362`）、"非 transcript managed region 全保留"（`:2941`）、"背景 owner publication 不破坏选中 DOM"（`:3109`）、"DOM 提交失败后重试 v1 mutation"（`:3195`）、"terminal Markdown + 实测虚拟几何"（`:3496`）、"stick-to-bottom 首渲染不发历史请求"（`:3775`）、"增量锚点恢复后同步 last scroll top"（`:3847`）、"bottom-stick rAF 合并"（`:3938`）、"loading/empty signature 含 owner 身份"（`:4035`）。
- `tests/acp/184-assistant-workspace-publication-data-plane.test.ts`、`tests/skillrunner/193-skillrunner-workspace-surface.test.ts`、`tests/acp/96-acp-session-manager-transcript.test.ts`。
- `tests/synthesis/252-synthesis-workbench-scaffold`、`253..260`（各 region）、`257-synthesis-windowed-rows`。
- 测试基建：`tests/helpers/sidebarDomEnv.ts`（`createSidebarDomEnvironment` / `installSidebarDomGlobals` / `captureRegionSubtrees` / `assertRegionSubtreesPreserved` / `subtreeNodes`）是本范围 DOM 恒等断言的公共工具。

---

## 9. 疑点清单（只列待核查项，未下结论）

| # | 疑点 | 证据路径 |
| --- | --- | --- |
| 1 | `details` 区域没有 `data-assistant-region` 标记，其它 8 个都有；需确认是否有意为之（governance 注释与测试是否依赖该属性） | `src/sidebar/assistantPanelRenderer.js:114-132` |
| 2 | `assistantPanelRenderer.js` 的 `installOverlayDismiss`、`markRegion`、`shouldManageRegion` 无任何消费方（仅 `adoptPanelRegions` / `managedMount` 被用） | `src/sidebar/assistantPanelRenderer.js:80,37,47,135-141`；全仓 grep 零使用 |
| 3 | `src/shared/preactRegionMount.ts` 的 `shouldManageRegion` 零使用；且与 #2 的 `assistantPanelRenderer.js:shouldManageRegion` 逻辑重复（两处同构实现） | `src/shared/preactRegionMount.ts:66-77`；grep 结果 0 处引用 |
| 4 | `synthesisWorkbenchChromeRenderer.ts:355-358` 与 `:382-385` 对 `panel.i18n` 做了**两次**相同的 `equalBySignature` 检查并重建 `translate`，第二次是死代码？ | `src/synthesis/synthesisWorkbenchChromeRenderer.ts:355,382` |
| 5 | `assistantTranscriptPageProjection.ts` 的 `import type { AssistantExecutionDisplayMode }` 位于文件末尾（第 87 行，所有实现之后）——是否 ESLint import 顺序规则被绕过 / 该文件被某处特殊处理 | `src/modules/assistant/publication/assistantTranscriptPageProjection.ts:87` |
| 6 | `requestVirtualTranscriptPage` 用固定 5 s 定时器清除 `loadingCursors`；若宿主响应慢于 5 s 会重复请求同一 cursor，且无重试上限 | `src/sidebar/assistantTranscriptRenderer.js:920-927` |
| 7 | `setVirtualTranscriptItemsSource` 在非分页模式把全部 items 塞进单页且 `limit = items.length || 1`，此路径无任何分页/上限保护 | `src/sidebar/assistantTranscriptRenderer.js:334-355` |
| 8 | `buildVirtualTranscriptWindow` 的 signature 把窗口内每行的 `key:height:itemId` 全量拼接；窗口上限 120 行时字符串长度需实测确认 | `src/sidebar/assistantTranscriptRenderer.js:863-892` |
| 9 | harness `index.html` 链接 `prototype-workspace.html` / `prototype-source-switching.html`，但打包显式排除 `prototype-*.html` 与 `prototype-*.bundle.js`——发布包内这两个链接为死链 | `addon/content/harness/index.html:13-18`；`zotero-plugin.config.ts:190-191` |
| 10 | `prototypeWorkspaceApp.js`（2,600 行）在源码树中位于 `src/sidebar/`，仅由 harness 服务使用；需确认 esbuild 未把它并入任何生产 entry（当前 entry 列表无它） | `src/sidebar/prototypeWorkspaceApp.js:1-25`；`zotero-plugin.config.ts:236-330` |
| 11 | `synthesis/index.html` 提供 `[data-role="synthesis-content"]`，而 renderer 的 `ensureSynthesisSkeleton` 在缺失时创建 `div.content`；`hostShape === "hosted"` 时才创建 `[data-role="synthesis-chrome"]`——非 hosted standalone 页面缺该容器是否被覆盖 | `addon/content/synthesis/index.html:23-30`；`src/synthesis/synthesisWorkbenchChromeRenderer.ts:108-174` |
| 12 | `replyRegionEqualityInput` 把整个 `reply.payload` 纳入 live tier，作者注释解释为"避免陈旧 submit 闭包"；需评估大 payload（如文件槽）导致的序列化成本 | `src/sidebar/components/regionEquality.ts:122-140` |
| 13 | 两个 160 ms 节流常量各自独立：`ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS` 只被 `acpSessionManager.ts:9,979,1011` 与 `acpSkillRunWorkspaceDataPlane.ts:2,295,356` 消费，`ASSISTANT_SIDEBAR_STREAM_FLUSH_MS` 只被 `skillRunnerRunDialog.ts:80` 与 `assistantSidebarViewModel.ts:42` 消费。数值巧合一致，但两者语义（发布节流 vs 侧栏流式提示）不同，需确认是否应统一为一个常量 | `src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts:22`；`src/modules/assistant/workspace/assistantSidebarViewModel.ts:30` |
| 14 | `transcriptRebasePageRequest`（`assistantWorkspacePublicationHost.ts:157`）与 `deactivateWorkspacePublicationRuntime` 的 rebase 语义只在注释中描述，未见测试直接锁定 | `src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:157-190` |
| 15 | Dashboard `dispose()` 只卸载 `[data-region-mount]`；`renderBackendLoadError` 创建的 `.error-banner`（非 mount 内）不会被清理 | `src/dashboard/dashboardChromeRenderer.ts:127-144,350-359` |
| 16 | `DashboardUiState.selectedTabKey` 每次 applySnapshot 都被清空（`:150`），若宿主回传的 `snapshot.selectedTabKey` 落后于用户点击，会出现一次 tab 回跳；需确认宿主 echo 时序 | `src/dashboard/dashboardApp.ts:137-152` |

---

## 10. 未覆盖范围

1. **`src/workspaceApp.ts` 与 `addon/content/workspace/`**：workspace 页面源不在任务目录清单内，仅记录了它的 HTML/入口事实（§1.1）。
2. **宿主侧非 UI 模块**：`src/modules/dashboard/{dashboardRuntime,dashboardSnapshot,dashboardActions,dashboardFrame}.ts`、`src/modules/synthesis/workbench/synthesisWorkbenchTab.ts`（142 KB）、`src/modules/sidebarBrowserHost.ts`、`src/modules/dashboardToolbarButton.ts` 只作为消息边界的对端被引用，未逐层展开。
3. **`src/modules/harness/` 的 Node 侧细节**：只读了 12 个文件的头部职责；`sqliteReadonly` 的备份快照实现、`zoteroReadonlyLibraryAdapter` 的 fixture 映射未深入（`tests/ui/156` 已覆盖其行为）。
4. **CSS 细节**：`addon/content/dashboard/styles.css`（63 KB）、`addon/content/synthesis/styles.css`（118 KB）只抽样验证了 page-chrome 的滚动契约与二级面板 max-height；未做全量 token 去重审计。
5. **`src/synthesis/components/**` 内部实现**：39 个文件、25.9 K 行，只覆盖到 region 边界与 `windowedRows` 的接口；`reader/`、`registry/`、`reviewCenter/`、`graph/` 的内部数据流未追踪。
6. **构建与打包插件**：`dashboardSynthesisSidecarRegionElisionPlugin`、`runtimeDiagnosticsSideEffectsPlugin` 的行为未读（只确认了 debug/诊断 region 会被 DCE，见 `dashboardChromeRenderer.ts:56-62`）。
7. **未运行任何测试或 lint**，所有结论均来自静态阅读；文中"性能"相关判断仅描述机制存在，不含实测数据。
