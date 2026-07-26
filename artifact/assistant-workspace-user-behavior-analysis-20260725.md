# Assistant Workspace (Sidebar) 用户面行为分析

日期：2026-07-25
分析基线：`main` HEAD `aa44a7a2` + 当时工作树未提交改动（`addon/bin/` 预编译二进制等，不影响本主题）
用途：Assistant Workspace 重构（`artifact/assistant-workspace-refactor-plan-20260718.md`）的行为对照基准。重构完成的判定标准是：用户感觉不到功能、样式、行为逻辑、交互逻辑有任何变化，只觉得更流畅、bug 更少。本文档记录的是**当前实现下用户实际看到和感受到的一切**，供重构期间与合并前逐条比对。
与既有文档的关系：`artifact/assistant-workspace-dev-ui-contract-audit-20260717.md` 写的是"契约应当是什么"（面向架构），本文档写的是"用户现在实际看到什么"（面向行为）。两者有出入处以本文档（以当前代码核实）为准，差异在第 7.1 节集中列出。

## 0. 范围与代码地图

Assistant Workspace 侧边栏有三个 tab：**ACP Chat**、**ACP Skills**、**SkillRunner**。前两个走 publication plane 架构（宿主按区域发布快照，子页面按签名守卫做区域级渲染），SkillRunner 走 legacy 路径（宿主推送完整装饰快照，子页面自行 diff）。三个 tab 共享同一套渲染器与样式。

| 层 | 位置 | 职责 |
|---|---|---|
| Shell 页面 | `addon/content/sidebar/assistant-workspace.html/.css`、`src/sidebar/assistantWorkspaceShell.js` | tab 条、三个 iframe、loading 遮罩、publication 缓存与有序转发 |
| ACP 子页面骨架 | `addon/content/sidebar/acp-chat.html`、`acp-skill-run.html`（结构同构，仅 `data-source` 不同） | 空容器：toolbar/banner/message-counts/drawer/conversation/plan/hint/composer/details |
| SkillRunner 子页面骨架 | `addon/content/sidebar/run-dialog.html/.css` | 与 ACP 同构，无独立 empty-state 区域，id 命名 |
| 子页面渲染 | `src/sidebar/assistantPanelRenderer.js`（chrome 区域）、`assistantTranscriptRenderer.js`（transcript）、`assistantPanelModel.js`（投影）、`assistantWorkspaceAcpChild.js`（ACP 接收端）、`runDialog.js`（SkillRunner 接收端）、`chatThinkingCore.js`（SkillRunner 消息归并） | 区域签名守卫、DOM reconcile、transcript 虚拟化 |
| 宿主侧（privileged） | `src/modules/assistantWorkspaceSidebar.ts`、`assistantWorkspacePublication*.ts`、`acpChatWorkspaceSurface.ts`、`acpSkillsWorkspaceSurface.ts`、`acpSessionManager.ts`、`acpSkillRunStore.ts`、`skillRunnerRunDialog.ts`、`assistantPanelLabels.ts`、`assistantExecutionDisplayPolicy.ts`、`assistantMessageCounts.ts` | 快照投影、发布调度、action 路由、transcript mirror/分页/LRU |
| 共享契约 | `src/shared/assistantWireContract.ts`、`assistantActionContract.ts`、`assistantInteractionContract.ts`、`skillRunnerSnapshotContract.ts` | wire 字段白名单、action 注册表、交互控件契约 |

文中所有行为断言均可回溯到 `path:line` 出处的代码；个别标注"未确认"的条目是代码阅读无法定论、需要运行时验证的点。

## 1. 总体布局

### 1.1 侧边栏在 Zotero 中的位置

Assistant Workspace 不是独立窗口，而是霸占 Zotero 原生右侧面板：库界面下插入 `#zotero-item-pane` 内、sidenav 之前；阅读器下插入 `#zotero-context-pane-inner` 之前（`src/modules/assistantWorkspaceSidebar.ts:3505`、`3549`）。激活时原生面板内容被 `hidden`，停靠库还是阅读器由当前选中的 Zotero tab 决定（`:321-330`）。**宽度由 Zotero 原生 splitter 决定，插件不设定宽度**（`src/modules/sidebarBrowserHost.ts:60-100`）。

打开入口（全部汇聚到 `openAssistantWorkspaceSidebar()`，`assistantWorkspaceSidebar.ts:4001`）：

- 主窗口工具栏 Assistant 图标按钮（带 attention 徽标，已开则关，`src/modules/dashboardToolbarButton.ts:320-347`）
- 库界面 item pane sidenav / 阅读器 context pane sidenav 的 "Assistant" 按钮（`assistantWorkspaceSidebar.ts:3491-3500`、`3535-3544`）
- 条目右键菜单 "Zotero Agents → Open Sidebar"（默认打开 SkillRunner tab，`src/modules/workflowMenu.ts:90-103`）
- 工具栏任务气泡、Markdown 阅读器等编程入口
- **没有快捷键**（`src/hooks.ts:1948-1950` 的 `onShortcuts` 为空）

关闭行为：shell 右上角 `×` → `close-sidebar` → 宿主仅把容器 `display:none`、恢复原生面板内容（`assistantWorkspaceSidebar.ts:557-601`）。**shell 与三个子 iframe 都不销毁**，重新打开后 tab、滚动位置、输入草稿全部保留。点击 sidenav 上其它按钮也会停用插件面板。

### 1.2 Shell 结构

```
Zotero 主窗口 / 阅读器窗口
┌──────────────────────────────────────────────────────────┐
│ 主工具栏 […] [Assistant 图标按钮(含 attention 徽标)]     │
├────────────────────────────────────┬─────────────────────┤
│                                    │ 原生右侧面板         │
│   条目列表 / 阅读器                │ （宽度=Zotero splitter）│
│                                    │ ┌─ shell iframe ──┐ │
│                                    │ │ tabbar (32px)   │ │
│                                    │ │ [ACP Chat]      │ │
│                                    │ │ [ACP Skills]    │ │
│                                    │ │ [SkillRunner][×]│ │
│                                    │ ├─────────────────┤ │
│                                    │ │ body: 3 个 iframe│ │
│                                    │ │ 叠放，非活动 tab │ │
│                                    │ │ display:none     │ │
│                                    │ │ [loading 遮罩，  │ │
│                                    │ │  初始可见]       │ │
│                                    │ └─────────────────┘ │
│                                    │ [sidenav: … Assistant]│
└────────────────────────────────────┴─────────────────────┘
```

三个 iframe（`acp-chat.html`、`acp-skill-run.html`、`run-dialog.html`）的 `src` 静态写死在 HTML 里，shell 加载时**三个子页面并行全部加载，无懒加载**（`assistant-workspace.html:67-84`）。tab 切换只是切换 `hidden` class（`assistantWorkspaceShell.js:1021-1026`），iframe 不销毁，DOM、滚动位置、草稿全部存活。切换的副作用：向被切走的 tab 广播 `CLOSE_DRAWERS`（**切 tab 会强制关掉其它子页面里打开的抽屉**，`:1018-1020`），并通知宿主持久化 `activeTab`，下次打开侧边栏恢复上次 tab。

Loading 遮罩：初始可见，中央 18px 旋转圆环；当活动 tab 的 iframe 文档加载完成即隐藏（**不等业务数据**，`assistantWorkspaceShell.js:59-65`）。`prefers-reduced-motion` 时旋转动画禁用。

### 1.3 单 tab 内部布局（ACP Chat / ACP Skills）

两个 ACP 子页面骨架逐行同构，外壳为 grid `auto auto auto 1fr`，主区为 grid `1fr auto auto auto`：

```
┌─ iframe (acp-chat / acp-skills) ────────────────────────────┐
│ ┌─ toolbar ───────────────────────────────────────────────┐ │ 始终可见
│ │ [Sessions/Runs] [Details] [Manage Backends]   (Live|By  │ │
│ │  message|Silent)                                        │ │
│ ├─ banner ────────────────────────────────────────────────┤ │ 始终占位
│ │ 标题 / 副标题 / metadata pills / Status badge / LED 指示 │ │
│ │ / 选择器 / 动作按钮                                      │ │
│ ├─ message-counts（默认隐藏）─────────────────────────────┤ │ 有计数数据才显示
│ │ Assistant: n  Thought: n  Tool: n                        │ │
│ ├─ main ──────────────────────────────────────────────────┤ │
│ │ ┌─ conversation ──────────────────────────────────────┐ │ │
│ │ │ transcript（滚动区，默认 Plain 模式）               │ │ │
│ │ │ [empty-state 居中浮层：无选中 owner 时显示]          │ │ │
│ │ │                          ◤右上角 Plain/Bubble 悬浮钮│ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ [ plan 条（默认隐藏，有活动条目才显示，max-height 140px）]│ │
│ │ [ hint 条（默认隐藏，有待提示状态时显示，min-height 42px）]│ │
│ │ ┌─ composer ──────────────────────────────────────────┐ │ │ 始终占位
│ │ │ [textarea                              ] [Send]     │ │ │
│ │ │ [Mode ▾] [Model ▾] [Reasoning ▾]        (usage ◔)  │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────┘ │
│ 〔context drawer：默认隐藏，左侧滑出 min(380px,92vw)，带遮罩〕│
│ 〔details drawer：默认隐藏，右侧滑出 min(520px,94vw)，带遮罩〕│
│ 〔permission drawer：按需创建，底部 sheet min(760px,100%)〕  │
└──────────────────────────────────────────────────────────────┘
```

骨架默认显隐（`acp-chat.html:25-86`）：toolbar、banner、composer 可见；message-counts、context-drawer、details-drawer、plan、hint 均 `hidden`；empty-state 在 acp-chat 默认隐藏、acp-skill-run 默认可见（两页骨架唯一差异，JS 启动后按 owner 有无统一接管）；permission drawer 不在骨架中，由渲染器按需创建（`assistantPanelRenderer.js:2646-2652`）。

抽屉机制：三者都覆盖在内容之上（不挤压布局）、都有半透明背景遮罩、**点遮罩即关闭**，头部都有 Close 按钮；**均无滑入滑出动画**（瞬间出现/消失）。context drawer 从左、details drawer 从右、permission drawer 从底部弹出。代码中未发现 Esc 关闭抽屉的处理（未确认存在）。

### 1.4 SkillRunner tab 布局

区域结构与 ACP 页面完全相同（toolbar/banner/message-counter/drawer/details/main=conversation+plan+hint+reply），差异仅在：

- 没有独立的 empty-state 区域，空态直接画在 transcript 容器里；
- 全部用 `id` 而非 `data-role` 命名；
- drawer 宽度 390px / 540px；
- Plain/Bubble 按钮文案硬编码在 HTML 里（ACP 页由 JS 填充）；
- plan 区域投影恒为空，永远隐藏（`assistantPanelModel.js:489-496`）。

### 1.5 动画与响应式

用户可见的动效只有：loading 圆环旋转（0.85s）、运行中 LED 呼吸脉冲（1.2s）、view-mode 悬浮菜单 hover 展开（120ms）、display mode 滑块（120ms）、details 箭头旋转（120ms）、代码块 Copy 按钮 hover 淡入（120ms）。`prefers-reduced-motion` 关闭 spinner 与 LED 动画。响应式：≤740px tab 条横向滚动；≤440px 隐藏选择器与指示器的文字 label；≤420px display mode 切换器独占一行；≤400px 外壳 padding 收窄。

## 2. 控件与交互逻辑

可见文案几乎全部来自 `src/modules/assistantPanelLabels.ts` 与 `assistantWorkspacePublicationLabels.ts`，按 11 种语言的 FTL 本地化。本节按"控件 / 可见条件 / 可用条件 / 交互效果 / action"组织。action 从子页面发往宿主时带 envelope `{source, owner, action, payload, actionId}`，宿主先按注册表校验 source/scope/payloadKeys，再对 selected-owner 类 action 做"owner 仍是当前选中"守卫（`assistantWorkspaceSidebar.ts:2583-2632`）。

### 2.1 Toolbar（两个 ACP tab 相同）

Toolbar 固定四项，渲染为左侧组 + 右对齐组（`assistantPanelModel.js:3123-3185`；`assistantPanelRenderer.js:846-872`）。

| 控件 | 可见/可用条件 | 交互效果 | action |
|---|---|---|---|
| Context（Chat 文案 "Sessions"，Skills 文案 "Runs"） | 恒可见、恒可用 | 纯本地打开 context drawer，无宿主往返 | `open-context-drawer`（local） |
| Details | 恒可见；仅当有选中 owner 时可用 | 本地打开 details drawer，并立即向宿主发 `request-owner-details`（先显示 loading，再填充） | `open-details-drawer`（local）+ `request-owner-details` |
| Manage Backends | 恒可见、恒可用 | 宿主打开后端管理对话框（`initialProviderType: "acp"`） | `open-backend-manager`（global） |
| Display mode 单选组（Live / By message / Silent） | 恒可见、恒可用，右对齐 | `role=radiogroup`，roving tabindex；键盘 ArrowRight/Down 下一项、ArrowLeft/Up 上一项、Home 首项、End 末项，选中即发宿主，影响后续 transcript 发布节奏（见 §3.6） | `set-execution-display-mode`（global） |

注意两个容易归错类的控件：**Close 不在 toolbar**——它是 shell tabbar 的 `×`；**Plain/Bubble 不在 toolbar**——它是 transcript 区右上角的悬浮菜单，且纯本地、从不发往宿主（`assistantWorkspaceAcpChild.js:1551-1555`）。

### 2.2 Banner（ACP Chat）

渲染顺序：标题/副标题 → metadata pills → notice → 状态行（Status badge + LED）→ 选择器 → 动作按钮（`assistantPanelRenderer.js:874-942`）。

| 控件 | 显示内容来源 | 可见/可用条件 | 交互与 action |
|---|---|---|---|
| 标题 | 固定 "ACP Chat" | 恒可见 | — |
| 副标题 | 有 owner："Chat with your Zotero library."；无 owner："No conversation" | 有文本才渲染 | — |
| Status badge | 宿主会话状态，经本地化与着色；无 owner 时 "unavailable" | 有状态即显示 | — |
| metadata pills | Backend（display name）、Conversation（sessionTitle 或 sessionId）、Workspace（取 agentWorkspaceDir→sessionCwd→workspaceDir→runtimeDir 首个非空）；空值条目过滤 | 值非空 | — |
| Connection LED | 连接状态；LED 只显示本地化 label，**原始状态值（idle/running 等）不可见**（CSS 隐藏，`assistant-panel-shared.css:1123-1135`） | 有 owner；无 owner 时显示 unavailable 占位 | — |
| Host Bridge LED | 宿主 Host Bridge 服务状态（running 绿 / failed 红 / starting 黄 / 其他灰） | 恒投影 | — |
| Backend 选择器 | 全部后端分组 | 有 owner；options 为空则 disabled；无 owner 时为禁用占位 | change → `set-active-backend` |
| Session 选择器 | 当前 backend 的会话；**超过 8 条截断为前 8 条**（选中项不在其中则追加），末尾追加 "Show more…" 哨兵项 | 有 owner；options 空则 disabled | 普通项 → `set-active-conversation`；选中 "Show more…" 不发宿主，改为本地打开 context drawer（`assistantWorkspaceAcpChild.js:1556-1564`） |
| New Conversation | — | 有 owner 且至少一个后端；connecting/disconnecting 中 disabled | `new-conversation` |
| Connect | connecting 时文案变 "Connecting..." | `!busy && !connected && !connectionChanging` | `connect` |
| Disconnect | disconnecting 时文案变 "Disconnecting..." | `connected && !busy && !connectionChanging` | `disconnect` |
| Authenticate | — | `status==="auth-required"` 且有 auth method | `authenticate`（携带第一个 methodId） |
| Auto-approve | 开关样式（`role=switch`），标签随状态 "Auto-approve on/off" | 常驻（有 owner） | 点击后按钮进入 pending（`aria-busy`），发 `set-auto-approve-permissions`，下一快照复位 |

无 owner 时 banner 动作按钮全部为 disabled 占位（`assistantPanelModel.js:2410-2454`）。

### 2.3 Banner（ACP Skills）

无选择器，无 New/Authenticate/Auto-approve。

| 控件 | 显示内容来源 | 可见/可用条件 | 交互与 action |
|---|---|---|---|
| 标题 | `taskName → workflowLabel → skillId → requestId` 回退链；无 owner 时 "ACP Skill Runs" | 恒可见 | — |
| 副标题 | sequence 工作流：步骤标记（1️⃣–9️⃣，第 10 步起 `#N`）+ `skillName/workflowLabel`；普通：`skillName → skillId → requestId`。**两个槽位语义不同，即使文案相同也不去重** | 有文本才渲染 | — |
| Status badge / pills / 两颗 LED | 同 Chat（pills 仅 Backend 与 Workspace） | 同 Chat | — |
| Connect | connecting 文案切换 | 有 sessionId、`!connected`、`!changing`、会话非 ended、恢复状态非 unavailable/unsupported | `connect-run` |
| Disconnect | — | `connected && !changing` | `disconnect-run` |
| Cancel Task | danger 色调 | 所有非终态 run（含 queued/idle） | `cancel-run` |

### 2.4 Context drawer（上下文抽屉）

通用行为：打开/关闭均为纯本地状态，**打开时不向宿主请求数据**——内容来自宿主持续发布的 owner-navigation 快照。关闭途径：头部 Close、点遮罩、选中条目（先本地关抽屉再转发选择）、shell tab 切换广播。渲染按 `sectionId/groupKey/taskKey` reconcile，未变化卡片保持 DOM 身份，仅 updatedAt 文本与 is-active class 走活字段更新。空目录显示 "No runs."/"No entries."。

ACP Chat：单一 section（不可折叠），按 backend 分组（组头可折叠，折叠态本地保持）。卡片显示标题、backend display name、主状态 badge、Backend 状态轴、updatedAt；有 lastError 时显示 warning attention LED。**Archive 按钮仅当状态为 idle 或 disconnected 时出现**；归档活动会话会自动切到最近更新的可见会话（`acpSessionManager.ts:4785-4844`）。

ACP Skills：三个 section——Running（可折叠，默认展开）、Queued（有排队条目才出现，**默认折叠**）、Completed（**默认折叠**）。卡片显示标题、sequence/skill 副标题（与 banner 同一投影）、主状态 badge、Backend 与 Apply 双状态轴（各带 LED）、attention LED（有 error 或 pendingPermission 时）、updatedAt。Archive 按钮仅终态 run 出现；Queued 卡片不可选中，带 `cancel-queued-workflow-unit` 按钮（从提交队列移除）。

### 2.5 Details drawer（详情抽屉）

打开时先本地打开并立即发 `request-owner-details`，内容未到前显示 "Loading details..."；**每次打开都重新请求**。宿主仅当请求 owner 仍是当前选中 owner 时才读取，读取后再次校验 epoch + owner，迟到结果丢弃（`assistantWorkspacePublicationRuntime.ts:597-629`）。owner 切换时三个抽屉被原子关闭。

**一个与契约文档不符的现状（已抽查核实）**：宿主侧把 Diagnostics（Chat）、Output revisions / Runtime logs / Result JSON（Skills）标记为 `collapsed: true`，但渲染器判断的是 `collapsible`/`defaultCollapsed` 字段（`assistantPanelRenderer.js:554-555`），model 透传的字段名是 `collapsed`（`assistantPanelModel.js:2131`）——**当前所有 section 都渲染为不可折叠、内容全部展开**，折叠标记不产生任何 UI 效果。**已决策（2026-07-25）**：此为 bug，重构完成后按原意图修复（恢复默认折叠），见改进候选文档 B1。

ACP Chat sections：Session（target、agent、agent-version、session、remote-session、remote-restore、stop-reason）、Paths（workspace、host-context json）、Diagnostics（最近 12 条诊断、command、stderr、last-error、prerequisite-error）；头部动作：Copy Diagnostics（复制诊断 JSON）、Open Workspace（系统文件管理器打开工作目录）。Chat 无 Copy ID。

ACP Skills sections：Run paths、Runner（backend、agent-family、mode/model/reasoning、raw-model、skill、skill-roots、session）、Validation（validation/repair/errors、apply 结果与时间）、Runtime Dependencies、Output Revisions、Runtime Logs、Result JSON；头部动作：Copy ID、Copy Diagnostics、Open Workspace。空值字段在宿主侧与 model 侧双重过滤，整 section 无条目则丢弃。

### 2.6 Permission drawer（权限请求抽屉）

**drawer 不自动弹出**。唯一打开途径是 hint 区域的 "View details" 按钮，且该按钮仅当 request 带 command/preview/detail 非空时才渲染（`assistantPanelRenderer.js:1144-1157`）；否则审批直接在 hint 内联完成，drawer 无法打开。request 被解决/替换/owner 切换时 drawer 强制关闭。

显示内容：标题=工具名（缺省 "Permission request"）、副标题=摘要（≤1000 字符）、meta 行=来源（Zotero / ACP backend）+ 请求时间、`<pre>` 块=command→preview→summary 首个非空、后端提供的全部选项按钮 + 恒追加的 danger Cancel、Close 按钮。点遮罩只关 drawer，不解决请求。

选项点击后发 `resolve-permission`，payload 为 `{permissionRequestId, outcome: "selected"|"cancelled", optionId}`。用户可见结果：request 清除 → hint 恢复正常优先级、drawer 自动关闭、agent 继续执行、composer 从禁用态恢复。宿主处理异常统一 `alert()` 弹窗。

### 2.7 Action 路由总表（子页面 → 宿主）

| action | scope | 宿主处理的用户可见结果 |
|---|---|---|
| `set-execution-display-mode` | global | 切换执行显示策略（Live/By message/Silent） |
| `set-active-backend` | navigation-group | 切换 backend，banner 选择器与会话列表刷新 |
| `set-active-conversation` / `select-run` | target-owner | 切换 owner，owner-first loading snapshot（见 §4.7） |
| `new-conversation` | navigation-group | 新会话成为活动 owner |
| `archive-conversation` / `archive-run` | target-owner | 从导航隐藏；归档活动会话自动切到最近可见会话 |
| `cancel-queued-workflow-unit` | global | 从工作流提交队列移除 |
| `connect` / `disconnect` / `cancel`（Chat） | selected-owner | 连接状态、按钮可用态、hint 随 control 发布更新 |
| `connect-run` / `disconnect-run` / `cancel-run` / `interrupt-run-turn`（Skills） | selected-owner | 同上；`interrupt-run-turn` 只中断当前 turn，未确认时走 forced 路径置 `waiting_user` |
| `authenticate` | selected-owner | 进入 auth 流程，hint 区渲染认证界面 |
| `set-auto-approve-permissions` | selected-owner | 开关随下一快照复位 pending 态 |
| `resolve-permission` | selected-owner | 见 §2.6 |
| `send-prompt` / `reply-run` | selected-owner | 见 §5.9 |
| `set-mode` / `set-model` / `set-reasoning-effort` | selected-owner | 会话应用后重发布 composer 刷新选中值；三者都未应用成功时向 transcript 插入 "Session configuration options updated." 状态条 |
| `select-interaction-option` / `submit-interaction-files` | selected-owner（Skills） | 回应 pending interaction；状态不符时 throw → alert |
| `request-owner-details` | selected-owner | 懒读取 details（epoch/owner 守卫） |
| `load-transcript-page` | selected-owner | transcript 分页读取（见 §4.6） |
| `copy-request-id` / `copy-diagnostics` / `open-workspace` | selected-owner | 见 §2.5 |
| `open-backend-manager` | global | 打开后端管理对话框 |
| `close-sidebar` | shell 通道 | 关闭整个侧边栏 |
| `open/close-context-drawer`、`open/close-details-drawer`、`toggle-drawer-section/group`、`open/close-permission-request`、`set-chat-display-mode` | local | 不发宿主，子页面本地处理 |

## 3. DOM 刷新与渲染模型

### 3.1 更新链路总览（ACP Chat / ACP Skills）

```
宿主侧 TS                                shell iframe              子页面 iframe
─────────────────────────────           ──────────────────        ─────────────────────────
surface 投影 (acpChat/Skills            pendingChildPublications   校验 envelope/payload
  WorkspaceSurface)                     缓存 + deliverySequence    exact-keys
  ↓                                      排序转发                  ↓
PublicationRuntime（16ms 合并、          ← ACK shell-receive       串行队列、拒收乱序/过期
  非活跃 owner/tab 丢弃）                ← ACK shell-forward       ↓
  ↓                                                               assistantPanelRenderer
Coordinator（signature 去重、                                      （chrome 区域签名守卫）
  revision/sequence 编号、                                       assistantTranscriptRenderer
  transcript delta 通道）                                        （transcript 行级 diff）
  ↓ postMessage CHILD_PUBLICATION         ACP_PUBLICATION →        ↓
                                                          ACK child-apply / render-complete
```

每个页面区块（toolbar、banner、计数条、计划条、提示条、输入区、两个抽屉、消息流）由独立的发布通道驱动：**一个区块的数据变化只重画对应区块**。

### 3.2 Region 清单与 region-to-DOM 矩阵

10 个 publication kind 注册于 `ASSISTANT_WORKSPACE_REGION_REGISTRY`（`assistantWorkspacePublication.ts:787-867`）：

| Publication kind | 覆盖的 DOM 区域 |
|---|---|
| owner-navigation | context drawer（会话/run 列表）、banner、`empty` 空态 |
| service-status | banner（Host Bridge LED） |
| owner-control | toolbar、banner、hint 区、composer |
| message-counts | message-counts 条 |
| transcript | transcript（且只写 transcript） |
| plan | plan 条 |
| permission | hint 区（摘要条）、permission drawer、composer（禁用态） |
| composer | composer（reply 输入 + 三个下拉） |
| owner-presentation | banner（标题/副标题/pills/notice/usage） |
| owner-details | details drawer |

反向会动 transcript 的更新只有：transcript snapshot/delta、owner-navigation（可能改变选中 owner/空态，会额外调 `renderTranscript()`）、本地动作（Plain/Bubble 切换、行展开）、渲染失败恢复。

### 3.3 Signature 语义

两层签名。宿主侧：`JSON.stringify(payload)`，key 为 `source\nownerKey\nkind`，payload 字段被 wire 白名单限定为只含用户可见内容——签名相同就根本不产生 publication（`assistantWorkspacePublicationCoordinator.ts:109-113`）。子页面侧：`renderManagedRegionIfChanged` 用 `data-assistant-<name>-signature` attribute 比对，未变则完全不调用渲染函数、不碰 DOM（`assistantPanelRenderer.js:2770-2782`）。

签名确实包含打开/折叠状态（drawer section collapsed、permission drawer open 都在签名内），但 context/details 抽屉的整体开合是签名之外的 `classList.toggle("hidden")`。reply 区域的签名还包含输入草稿 value（结构签名命中时只走活字段更新，见 §5.1）。

**用户可感知效果**：无关更新到来时界面不闪烁、不打断滚动位置、不折叠已展开的消息、不清空正在输入的草稿；纯内部事件（不改变可见字段）不会引发任何重绘。

### 3.4 有序投递、ACK 与 rebase

每条 publication 带 `publicationId`、按 region 递增的 `regionRevision`、全局递增的 `deliverySequence`。ACK 四阶段：`shell-receive / shell-forward / child-apply / render-complete`。子页面拒收 `deliverySequence <= 已应用`（reason `superseded`）与 `regionRevision <= 已有`（reason `stale`）；同一 publicationId 重复投递返回缓存结果，不产生渲染 effect。

transcript delta 基线不匹配（`baseTranscriptRevision` 不等）或 mutation 无法应用时，子页面回 `gap`；渲染失败回 `render-failed`。这两种 reason 触发宿主 `requestRebase`：重读 transcript 页并以 `force:true` 发布全量快照。accumulator 溢出（>512 条 mutation 或 >256KB）也触发 rebase。shell 会缓存 iframe 重建期间未投递的 publication 并按序重放。

**用户可感知效果**：乱序/过期的更新被静默丢弃，画面不变；delta 断档时消息流保持当前内容，随后被一次全量快照整体替换（可能出现一次整体重建）；渲染失败时 transcript 容器清空做一次全量重渲。单条非法更新被静默丢弃，用户看不到错误。

### 3.5 区域隔离

transcript publication 只写 `elements.transcript`（mutation 走 `applyAssistantTranscriptEffectsExact`，snapshot 走 `renderTranscript`），不会重建 toolbar/banner/plan/hint/composer/drawer。非 transcript kind 走 `renderPanel()`，不触碰 transcript。panel 内各 region 各自签名守卫，loading/streaming 引起的 owner-control/message-counts 更新即使触发 renderPanel，也不会重画签名未变的区域。

**用户可感知效果**：流式输出期间只有消息流在动，顶栏按钮、计划条、抽屉保持 DOM 稳定，不会因高频更新而抖动或丢失交互状态。这是 AGENTS.md "Assistant Workspace UI 硬约束"的用户面表达，重构后必须逐条保持。

### 3.6 Display mode（Live / By message / Silent）

存于 pref `assistantExecutionDisplayMode`，默认 live；宿主侧 live 发布有 160ms 节流合并（`ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS`），region 读取另有 16ms 合并窗口。

- **Live**：所有 mutation（含 text-continuation）直接上屏——用户看到逐字流式输出。
- **By message（boundary）**：text-continuation mutation 被扣在投影内，直到 hard-boundary 事件到达才一并释放——用户看到消息按段成批出现，过程更平稳。
- **Silent**：所有 mutation 丢弃，执行期间消息流不动，只能看到 message counts 计数器增长；assistant 最终文本由 `AcpSilentTerminalAssistantCollector` 收集，turn 终止时一次性补入——用户结束时一次性看到结果。

### 3.7 Message counts

三个条目 Assistant / Thought / Tool，位于 banner 之下、conversation 之上；无数据时整区隐藏。`completeness === "complete"` 时显示 `current/cumulative`（如 "3/7"），否则只显示 current。计数口径：assistant/thought 按连续文本段各计 1（同类 chunk 连续到达不重复计数），tool 按 `tool_call` 各计 1，soft-side-channel 不计数；current 在每次执行开始清零。节点按 kind 复用，不重建 DOM。

### 3.8 Plan 区域

无活动条目时整区隐藏。头部显示 "Plan" 与 `completed/total`；每行一个条目：running 且 owner 执行中时显示 spinner，completed 显示 ✓，其余显示 •。plan 更新只重画 plan mount，与 transcript/presentation 更新互不影响。

### 3.9 Hint 优先级链

hint 条永远只显示当前最重要的一件事。子页面 model 层：**存在 pending permission 时 hint 恒为 permission 摘要，覆盖宿主 hint 的一切其他状态**（`assistantPanelModel.js:2821-2838`）。否则按宿主推导的 kind：

- Skills：error → waiting_user → disconnected（可恢复）→ repairing → running → completed → canceled → error（无文案）→ hidden（`acpSkillsWorkspaceSurface.ts:108-150`）
- Chat：error（prerequisiteError 优先于 lastError）→ auth → running → notice（lastStopReason）→ hidden（`acpChatWorkspaceSurface.ts:163-183`）

表现：一行 LED + 文案，LED 色调按 kind（running/repairing 蓝、permission/auth/waiting_user 黄、disconnected/error 红、completed 绿）。文案缺省取本地化语义回退（"Agent is working..."、"Agent is waiting for your reply." 等）。permission/auth 额外渲染摘要盒（approval 类型、工具名、toolCallId、"View details" 按钮）与选项按钮；waiting_user 渲染 pending interaction 的 prompt、选项按钮、文件上传（见 §5.7）。

### 3.10 Loading / spinner 的 owner 作用域

transcript 的 idle/loading/failed 态签名 = `ownerKey + kind + message`；同一 owner 相同 loading 状态有签名去重，**不会反复清空重建 spinner**。切到另一会话/run 时才换成新的 loading 画面，加载完成后被首页内容替换。shell 级 loading 遮罩按 tab 维度，该 tab 的 iframe 完成首轮投递前显示。

## 4. Transcript 窗口

transcript 是用户最高频看的区域，挂载与更新完全由 `assistantWorkspaceAcpChild.js` + `assistantTranscriptRenderer.js` 负责（不经过 `assistantPanelRenderer` 的 chrome 路径）。

### 4.1 条目类型与渲染形态

数据层有 6 种 `itemKind`，其中 `plan` 在进入渲染前被过滤（plan 走独立 plan 区域）。用户实际看到 5 种条目 + bubble 模式特有的工具分组行：

- **user / assistant / system 消息**：行内上部 meta（小号大写角色标签 + 可选 revision 徽章 "Revised N x" + HH:MM 时间），下部正文。完成后正文经 markdown-it 渲染，页面加载了 KaTeX（`dollars` 分隔符）；fenced code 块带 Copy 按钮。streaming 中正文是纯文本。
- **thought（思考）**：meta 为 "Thinking"；虚线边框 + 浅蓝底；正文规则同消息。
- **tool call（单个）**：8px 圆形状态 LED + 工具名徽章（超长省略）+ 摘要文本。LED 颜色：running=主题色带 1.2s 脉冲、pending=警告色、completed=绿、failed=红。徽章与摘要带命令详情 tooltip。占位工具名（"tool"/"call_xxx"）被过滤，兜底显示 "Tool"。
- **tool activity 分组（仅 bubble 模式、≥2 个连续 tool-call）**：默认折叠，显示一行摘要：chevron、聚合状态 LED、"Tool activity (N)"、"N tools • X failed • Y running • Z pending"。点击展开为缩进的逐条工具列表。展开状态按 rowKey 存于子页内存，重渲染与 Plain/Bubble 切换后保持；owner 切换时该集合不清空（旧 rowKey 只是不再匹配）。连续 tool-call 只有 1 个时不分组。
- **permission**：状态 LED（approved 绿 / denied/cancelled 红 / pending 脉冲）+ 图标（✓ / × / !）+ 摘要；整行警告色黄底。
- **workspace activity**：文件图标 + 相对路径。
- **generic status**：meta 为条目标签（兜底 "Status"），正文纯文本；level=warn/error 时整行黄/红底。

**streaming 进行中没有专门视觉指示**：streaming 行会加 `is-streaming` class，但全部 CSS 中没有对应规则（已 grep 确认）——streaming 期间唯一可见特征是正文为未渲染的纯文本，加上 running 工具 LED 的脉冲。

### 4.2 Plain / Bubble 两种视图

切换入口：对话区右上角浮层菜单（未 hover 时折叠为 28px 小按钮），默认 plain。

- **Plain**：行宽 100%，无气泡，仅 3px 左边框 + 底分隔线；左边框按角色着色（user 蓝、assistant 绿、tool 警告色、status 深灰）；tool 与 workspace-activity 行隐藏 meta。无 tool 分组。
- **Bubble**：行为气泡（最大宽 `min(88%,560px)`、大圆角、投影）；user 靠右浅蓝渐变底，其余靠左；连续 tool-call 分组为 tool-activity-group（分组只在 bubble 模式发生）。

切换时：模式是 render key 的一部分，触发 transcript **整体清空重建**；若当前吸底则重建后重新吸底，否则恢复滚动 anchor/scrollTop；tool 组展开状态保留；composer 不重渲染，草稿不受影响；transcript 内正在进行的文本选择会丢失。切换是纯本地的；子页路径不把选择发回宿主，重载后回到 plain（宿主侧存在按 conversation 持久化的机制，但子页切换路径是否到达未确认）。

### 4.3 代码块 Copy 按钮

绝对定位在 `<pre>` 右上角，平时 `opacity:0` 不可见，hover 代码块或聚焦时淡入（120ms）。点击复制代码文本；状态变化：idle "Copy" → 成功 "Copied"（绿底）/ 失败 "Copy failed"（红底）→ **1400ms 后自动恢复**。

### 4.4 流式更新

assistant/thought 的 streaming 条目以**纯文本**逐段追加。DOM 层有快速路径：新文本是旧文本的前缀扩展时，直接向已有 Text 节点 `appendData`，不重建该行——逐字/逐块生长，无整块刷新。条目状态变为 complete/error 时该行重渲染，正文此刻才变成 Markdown。

边界语义（协议级通用，不按后端特判）：`tool_call_update`、`usage_update`、`status_update`、`workspace_activity`、`available_commands_update`、`current_mode_update`、`config_option_update`、`session_info_update` 归类为 soft-side-channel，**不打断当前 assistant 文本段**。结束当前段的事件：新 `tool_call`、`plan` 更新、message/thought 种类互换、用户发出新 prompt、turn 结束/出错/取消、turn boundary/request terminal。

display mode 影响（见 §3.6）：boundary 模式 text-continuation 被扣到下一个 hard boundary；silent 模式不上屏，且分页投影过滤掉 streaming 状态的 message/thought。

### 4.5 滚动语义

- 距底 < 80px 视为在底部。用户在底部时，新内容渲染后自动吸底（双 rAF 内完成）。
- 用户向上滚动即取消吸底，此后新内容**不再把用户拽回底部**，渲染改为恢复滚动 anchor/scrollTop；重新滚回距底 80px 内恢复吸底。
- 程序性吸底期间若用户上滚，立即取消该次吸底。
- **没有"回到底部"按钮**（已 grep 确认）。

### 4.6 虚拟化与分页

- 默认开启（pref `assistantTranscriptPaginationVirtualizationEnabled`，默认 true）。每页 80 条；子页侧页缓存最多 5 页（约 400 条），超出淘汰距视口最远的页。
- 渲染窗口：最多 120 行 + 上下各 20 行 buffer，估计行高 88px；未渲染区域用 spacer div 撑高度；实际行高渲染后测量缓存，偏差 >1px 触发一次重排修正 spacer。
- 加载更多：滚动到距已缓存内容边界 320px 内时自动请求上一页/下一页（`load-transcript-page` action）；加载期间在缺口处显示 "Loading transcript..." 占位；同一 cursor 5 秒未返回解除 loading 允许重试。
- **没有页码、上一页/下一页按钮**——分页完全是滚动驱动的无限加载。

### 4.7 冷加载与 owner 切换

- **owner-first**：切换 owner 时宿主先发 loading 状态的 transcript snapshot（子页把 transcript 容器替换为一个无文字 spinner），再异步读页；同一 owner 重复 loading 状态有签名去重，不反复清空重建。
- 无选中 owner：transcript 区显示空态，conversation 区上方显示 emptySelection 文案。
- 首个渲染的页是**尾部页**（最后 80 条），渲染后吸底。
- **page-first**：Skills 在 full mirror 未 hydrate 时直接从 store 做 indexed page read 返回所选页，后台再调度 hydrate，首屏不等待 full mirror；Chat 优先读内存 mirror 页，mirror 未加载时直接读 store 页。`transcript page ready` 与 `full mirror ready` 是两个独立状态。
- **LRU**：cold full mirror 缓存上限各 10 个 owner（Chat key = `backendId\nconversationId`，Skills key = requestId）。命中时切回该 owner 走内存页读（更快）；未命中走 store page-first 读取，首屏需一次异步 I/O。淘汰只是释放内存，下次打开仍能按页恢复——缓存是性能优化，不是正确性前提。
- **pinned**：live/prompting/lifecycle-open 的 owner mirror 不进 cold LRU（Skills 另保留当前选中 owner）。对用户意味着：正在运行/连接中的对话 transcript 永远即时可见，不会因缓存淘汰而重新加载。

### 4.8 节点身份保持

- 行节点按 rowKey 复用；每行有渲染签名，未变直接跳过。streaming 文本前缀追加走 Text 节点 `appendData`。
- 增量 mutation 路径采用 staged nodeMap + 失败回滚，非吸底时捕获/恢复滚动 anchor；结构校验失败触发全量恢复重渲。
- 增量路径下未变化的行完全不重建：**不闪烁、滚动不跳、已展开的 tool 组不塌、其他行内的文本选择不受影响**。被 patch 的行本身会重建其 meta/body（该行内的选择会丢）。全量重渲（模式切换、owner 变化、恢复路径）则整个容器重建。

### 4.9 Loading / error / empty 三态

三者都渲染为容器内唯一子节点，带签名去重：

- **loading**：无文字 spinner。出现时机：region.status === "loading"，或 ready 但 page 缺失。
- **failed**：灰字显示 error.message（宿主侧错误码固定为 `transcript-page-read-failed`）。
- **empty**：ready 且 0 条时显示本地化 empty 文案；无 owner 时另有 conversation 级 emptySelection 文案。

### 4.10 Message counts

见 §3.7。显示格式取决于 `completeness` 标志（complete → `current/cumulative`），而非 active 标志；active 字段进入签名但无独立视觉差异。

## 5. 用户交互区（Composer）

composer 渲染为 `[data-role="composer"]` 区域，结构签名命中时只走活字段更新（`assistantPanelRenderer.js:1418-1603`）。

### 5.1 输入框（textarea）

- 占位符：Chat "Ask the active ACP backend about the current library or item..."；Skills "Reply to this ACP skill conversation..."（均本地化）。
- **无 JS 自动增高**：固定 `min-height 58px; max-height 24vh; resize: vertical`，用户可手动拖拽，超出出滚动条。
- 禁用时背景变浅、文字变灰。
- 结构重建时保留已输入文本与焦点/选区；活字段路径仅在输入框未聚焦时覆盖 value。

### 5.2 发送 / 取消按钮状态机

| composer.reply.status | 输入框 | 按钮文案 / 色调 | action |
|---|---|---|---|
| `enabled` | 可写 | "Send" / primary | Chat: `send-prompt`；Skills: `reply-run` |
| `busy` | 禁用 | **"Cancel"** / danger | Chat: `cancel`；Skills: `interrupt-run-turn` |
| `cancelling` | 禁用 | "Cancelling..." / danger，按钮禁用 | （不可再点） |
| `disabled` | 禁用 | "Send" / primary，按钮禁用 | — |

注意：busy 态两个 tab 的按钮文案**都是 "Cancel"**（区别只在 action 名与宿主行为）；契约审计文档中 "danger Interrupt" 的表述与代码不符。Skills 的 `interrupt-run-turn` 只中断当前 turn（后端未确认时走 forced 路径，run 置 `waiting_user`、会话关闭为可恢复）；取消整个 run 的 `cancel-run` 挂在 banner/drawer 上，不在 composer。

### 5.3 键盘交互

- **Ctrl/Cmd+Enter 发送**（仅按钮未禁用时）；普通 Enter 换行，无拦截。
- **ArrowUp 在首行 / ArrowDown 在末行**遍历历史输入：上限 50 条，连续重复不记录；作用域 = tab × owner × action 隔离；进入遍历前暂存当前未发送文本，ArrowDown 越过最新一条后恢复；输入禁用、按住修饰键、选区非折叠时不拦截；手动输入重置遍历游标。
- 无 Escape 等其他键处理（未确认存在）。

### 5.4 草稿（draft）

**按 owner 隔离**，存于子页 `ui.replyDraftByOwner`。切换 owner 时先保存当前 owner 草稿、再恢复新 owner 草稿。Chat 与 Skills 是两个独立子页面文档，草稿**不跨 tab**；子页面文档卸载后草稿丢失（无持久化，但侧边栏关闭不销毁 iframe，所以整个 Zotero 会话期间草稿实际存活）。

### 5.5 Mode / Model / Reasoning 下拉

三个下拉**始终渲染**在 composer footer，不存在隐藏逻辑；不可用即 `disabled`。选项为空时渲染单个 `-` 占位——**例外：Chat 的 Reasoning 无选项时显示本地化的 "Default"**（禁用但显示 Default 而非 `-`）；Skills 无此注入。选项来自 session 提供的 selectable options，未连接时选项数组清空。

| 下拉 | ACP Chat | ACP Skills |
|---|---|---|
| Mode | `connected && 有选项`（不要求 non-busy） | `connected && 有选项`（不要求 non-busy） |
| Model | `connected && !busy && 有选项` | `connected && canEditModelConfig && 有选项` |
| Reasoning | `connected && !busy && 有选项` | `connected && canEditModelConfig && 有选项` |

Skills 的 `canEditModelConfig` = `!promptActive && (status==="waiting_user" || status==="failed_retriable")`——比 non-busy 更严格：connected 普通 idle 时 Model/Reasoning 也不可用，而 Mode 只要 connected 即可用。

选择后发 `set-mode` / `set-model` / `set-reasoning-effort`。**无乐观更新**：session 应用后重发布 composer 刷新选中值；三者都未应用成功时向 transcript 插入 "Session configuration options updated." 状态条；异常 `alert()` 弹窗。选项/选中值变化触发 composer 整体重建（文本与焦点保留）。

### 5.6 用量 gauge

形态：圆环（CSS 变量驱动）+ 中心文字：

- 有 limit：中心显示 `N%`；
- 无 limit 但有 used：中心显示 token 数（如 `12.3k`）；
- 两者皆无：灰化 + 中心 "N/A"，tooltip "No usage data"。

tooltip/aria-label 显示 `used/limit tokens`。数据来自 owner-presentation publication（底层是 ACP `usage_update`）。**更新时机的代码事实**：composer publication 不携带 usage，gauge 数字实际只在 owner-presentation 重发布时刷新（Chat 为 `session_info_update` 与 diagnostics，Skills 为 run 类变更）——并非每次 `usage_update` 都即时反映在 UI 上（代码推断，未做运行时验证）。SkillRunner tab 无 usage gauge。

### 5.7 waiting-user 动态回复控件

渲染位置在 **hint 区**（composer 上方、独立于 composer DOM）。**仅 Skills 有此场景**（Chat 的 hint kind 集合没有 waiting_user）。触发：run `waiting_user`、有 pendingInteraction、或 connected idle 且 turn 被 interrupted。

控件类型由 pendingInteraction 决定：

- **选项类（choose_one/confirm 等）**：消息行（黄 LED + prompt 文本，缺省 "Agent is waiting for your reply."）+ 每个选项一个按钮，点击即回复（`select-interaction-option`）；
- **文件类（upload_files）**：每个文件槽一行（名称 + Required/Optional + hint）+ "Choose files" 按钮（`submit-interaction-files`）；后端不支持文件回复时显示 "File replies are unavailable for this backend."。上限：选项 16、文件槽 8、单文件 32MB、合计 64MB。

与普通输入框**并存**：waiting_user 时 composer 文本框保持可写，用户既可点 hint 区按钮回答，也可自由输入后 Send。提交后 replyState 经 `submitted` → `accepted`，composer 随之进入 busy。

### 5.8 可写条件完整矩阵

面板层统一约束：`有 owner && status!=="disabled" && !cancelling && !pendingPermission`。

**ACP Chat**：

| 状态 | reply.status | 表现 |
|---|---|---|
| 有 owner、非 busy、非 connecting/disconnecting、无 pending permission | enabled | 可写，Send 可用 |
| prompting / busy | busy | 输入禁用，danger "Cancel" 可用 |
| 已发取消 | cancelling | 全禁用，"Cancelling..." |
| connecting / disconnecting、pending permission、无 owner | disabled | 全禁用 |
| **disconnected 且 idle** | **enabled** | **可写、Send 可用**（Chat 的 reply.status 不检查 connected，已抽查核实 `acpChatWorkspaceSurface.ts:306-316`） |

**ACP Skills**：

| 状态 | reply.status | 表现 |
|---|---|---|
| connected + waiting_user（含 pending interaction、connected interrupted turn）、connected + failed_retriable | enabled | 可写，Send 可用 |
| activePrompt 或 continuation | busy | 输入禁用，danger "Cancel"（interrupt-run-turn）可用 |
| interrupt requested | cancelling | 全禁用 |
| pending permission、terminal、disconnected、connected 普通 idle、无 owner | disabled | 全禁用 |

宿主侧二次校验：`replyAcpSkillRun` 仅接受 `waiting_user` / `failed_retriable`，terminal 直接拒绝。

### 5.9 发送一条消息后用户立即看到什么

1. 文本记入该 owner 的历史（去重、上限 50）；
2. emit action，重置历史遍历游标；
3. **输入框立即清空**（clearOnSend 默认生效）；
4. 按钮/输入框**不做本地乐观切换**，等宿主 composer publication。

随后（Chat）：宿主先把用户消息 push 进 transcript 并置 busy → 用户消息出现在 transcript、输入框禁用、按钮变 danger "Cancel"。空消息在宿主侧被丢弃。随后（Skills）：replyState 立即置 `submitted` → composer 重发布为 busy；随后 `accepted` 并经 controller 发送（用户回复在 transcript 的回显路径未确认）。

点取消：不清空输入（输入已禁用）；宿主置 interrupt requested 后按钮变禁用的 "Cancelling..."。

## 6. SkillRunner tab 的用户面差异

SkillRunner tab 与 ACP tab 共享同一套渲染器、样式与八区 managed 渲染（toolbar/banner/message-counter/drawer/details/hint/reply + transcript），但走 legacy 快照路径，行为上有这些可感知差异。

### 6.1 更新模型

- **推送而非轮询为主**：宿主对每个 run 维护 SSE 流（cursor 续传，断线指数退避 800ms→30s）；例外是 waiting_auth 期间每 1500ms 轮询一次。另有五类 store 订阅触发刷新。
- **每次推送都是完整装饰快照**（不是增量 mutation），live 流式有 160ms 合并窗口（与 ACP 同一常量）。页面侧不是整面板重建：8 个 managed region 各自签名守卫，transcript 走 microtask 调度 + `transcriptRevision` 门控 + 行级 nodeMap diff。
- **流式质感与 ACP tab 一致**（同一渲染器、同一 160ms flush、同一 80px 吸底阈值），差异在数据链路而非渲染。
- display mode 同样生效：live 才允许流式推送；boundary 时 transcript 只在 waiting/terminal 边界更新；silent 时 assistant_process/中间消息完全不进 transcript。
- **切换 run 时 transcript 整棵重建**（context key 变化重置 nodeMap 与虚拟滚动状态），历史未就绪时 transcript 末尾显示 "Loading conversation..." 状态行——不同于 ACP tab 的 owner-first spinner + page-first。

### 6.2 布局与控件差异

- 无独立 empty-state 区域；无 run 时 transcript 显示 "No SkillRunner tasks."，banner 副标题 "No task"，indicator "Unavailable"。
- plan 区域恒为空、永远隐藏；无 usage gauge；无 permission drawer（managedRegions 不含 permission，权限审批只在 hint 区内联）。
- toolbar 与 ACP 相同（Runs / Details / Manage Backends / Display mode）。
- banner 特有：Cancel Task（`cancel-run`）、control indicator 只读徽章（Approval / Auth / Needs input / Preparing / Submitting / Read-only / Streaming / Unavailable）、**auto-reply 指示器**（Active/Inactive + 倒计时秒数 + 进度条）。
- drawer：Running / Queued / Completed 三 section、按 backend 分组、终态可归档、排队可取消；后端不可达时该分组 disabled 并显示 "Backend {backend} is temporarily unreachable..."。
- details drawer 动作：Copy ID、Copy Diagnostics（整个快照 JSON）。

### 6.3 生命周期状态的用户可见表现

| 状态 | 徽章 | 其他可见表现 |
|---|---|---|
| queued | "Queued" | indicator "Preparing"/"Submitting"；drawer 行可取消排队 |
| running | "Running" | indicator "Streaming"；hint 转圈 LED + "Agent is working..."；composer 主按钮变 Cancel |
| waiting_user | "Waiting"（黄） | indicator "Needs input"；hint 显示 prompt + 选项按钮；drawer 行出现 "Needs user interaction"；workspace 级 waitingCount 聚合到 tab 徽标 |
| waiting_auth | "Auth required" | hint 区为 auth 交互全家桶：方法选择按钮、auth_url 链接（`open-auth-url`）、user_code / last_error 诊断行、auth 文件导入（"Import and Continue"）；宿主每 1.5s 轮询 |
| succeeded | "Succeeded"（绿） | indicator "Read-only"；hint "Run completed"；可归档；deferred apply 时显示 apply 状态徽章（Pending apply/Applying/Applied/Retry scheduled/Apply failed） |
| failed | "Failed"（红） | 错误文本进 details drawer Error 字段；操作失败另有 alert 弹窗 |
| canceled | "Canceled" | 终态文案 |

### 6.4 Composer 差异

- **没有"随时发消息"的自由输入**：只在 waiting_user 时可输入可发送；waiting_auth 且后端接受聊天输入时，输入框变为粘贴 API key / 授权码（按钮变 "Submit API Key" / "Submit Code"）；running/prompting 时输入禁用、主按钮变 Cancel；terminal / permission pending 时禁用。发送必须挂在 pendingInteractionId 或 auth session 上。
- waiting-user 的结构化交互（选项快捷按钮、必填文件槽上传）与 ACP Skills 同构。
- Ctrl/Cmd+Enter 发送、ArrowUp/Down 历史、Plain/Bubble 切换均与 ACP 相同。

### 6.5 Transcript 差异

- 数据源为快照 `session.messages`（上限保留最近 500 条）；消息类型：message（区分中间消息与 `assistant_final`，final 到达后同 chain 的中间消息被移除）、thought、tool-call、**revision（"Rejected final reply"，带 repair round 元数据）**、status（"Loading conversation..."）。
- 消息归并依据 SkillRunner 协议的 `message_id`/`message_family_id`/`replaces_message_id` correlation，而非 ACP session update 边界；经 `adaptLegacyTranscriptItem` 适配进同一渲染器。
- thinking 分组逻辑存在但在 runDialog.js 中被展平为逐条 Thought/tool 条目——**折叠交互实际不暴露**。
- 支持 Markdown + KaTeX。

## 7. 其他发现

### 7.1 当前代码与 20260717 契约审计文档的出入（以代码为准，已抽查核实关键项）

1. **Details 折叠未生效**：审计称 Diagnostics、Output revisions、Runtime logs、Result JSON 默认折叠；实际 model 透传字段名 `collapsed` 与渲染器判断的 `collapsible`/`defaultCollapsed` 不匹配，所有 section 始终展开且不可折叠（`assistantPanelModel.js:2131` vs `assistantPanelRenderer.js:554-555`）。**已决策（2026-07-25）：此为 bug，重构完成后按原意图修复（恢复默认折叠）**——重构期间的比对仍以"全部展开"为基线，修复落地后本条改写为新行为。
2. **Skills busy 按钮文案是 "Cancel" 而非 "Interrupt"**（`assistantPanelModel.js:3046-3058`）。
3. **Chat composer 断连空闲也可写**（`acpChatWorkspaceSurface.ts:306-316` 不检查 connected），审计 "writable with a session" 的隐含条件比代码严格。
4. **Close 与 Plain/Bubble 不在 toolbar**：Close 是 shell tabbar 的 `×`；Plain/Bubble 是 transcript 浮动菜单，纯本地不发宿主。
5. **Permission drawer 不自动弹出**：只有点 hint 的 "View details" 才打开，且该按钮在 request 无 command/preview 时不渲染。
6. **Skills context drawer 有 Queued 分区**（默认折叠），审计只提到 Running/Completed。
7. **message counts 显示格式取决于 completeness 标志**而非 active 标志。
8. **streaming 行无专门视觉指示**（`is-streaming` class 无 CSS 规则）；**没有"回到底部"按钮**。

### 7.2 空态与首帧差异

- acp-skills 首帧（JS 未跑时）empty-state 默认可见、acp-chat 默认隐藏——JS 启动后按 owner 有无统一接管，用户只可能在极短首帧看到差异。
- 无 owner 时：banner 动作按钮全 disabled 占位、选择器禁用、副标题 "No conversation"/"No task"、transcript 空态 + conversation 级 emptySelection 文案、composer disabled。

### 7.3 持久化与存活的用户状态清单

| 状态 | 作用域 | 存活期 |
|---|---|---|
| 活动 tab | 宿主持久化 `host.activeTab` | 跨侧边栏开关 |
| display mode | pref `assistantExecutionDisplayMode` | 跨会话 |
| transcript 虚拟化开关 | pref | 跨会话 |
| 输入草稿 | 子页内存 `replyDraftByOwner`，按 owner | 子页面文档存活期（侧边栏关闭不销毁 iframe，实际覆盖整个 Zotero 会话） |
| 输入历史（50 条） | 子页内存，tab × owner × action | 同上 |
| tool 组展开状态 | 子页内存 `expandedTranscriptRows` | 同上；owner 切换不清空 |
| drawer 组折叠状态 | 子页内存 | 同上 |
| Plain/Bubble | 子页内存 | 同上；重载回 plain（宿主侧持久化路径未确认被子页使用） |
| cold full mirror LRU | 宿主内存，10 owner | 运行期 |

### 7.4 错误呈现路径汇总

- transcript 页读取失败：transcript 区灰字 error.message。
- action 处理异常：`alert()` 弹窗（统一路径）。
- 后端不可达（SkillRunner）：drawer 分组 disabled + 提示文案。
- run/conversation 错误：hint 区 error 级提示 + details drawer 错误字段。
- auth 错误：hint 区 `last_error:` 诊断行。
- wire 校验失败：静默丢弃，用户不可见。

### 7.5 对重构的直接提示（事实层，非建议）

- 用户可感知的"流畅"主要来自四个机制的组合：区域签名守卫（§3.3/§3.5）、transcript 行级 diff 与 `appendData` 快速路径（§4.8）、160ms live 合并（§3.6）、owner-first/page-first 冷加载（§4.7）。任何一环退化为整面板重建，用户都能立刻察觉（闪烁、滚动跳动、草稿丢失）。
- SkillRunner tab 已经共享同一渲染器与签名守卫，重构把它收敛到 publication plane 时，用户面应无变化——除了 §6.1 中"切换 run 整棵重建"若被 owner-first 模式取代，会是用户可感知的改进，需确认是否符合"无感"目标还是计入"更流畅"。

## 8. 重构等价性检查清单

以下条目从全文推导，供重构后逐条比对"用户无感"。每条标注本文档章节以便回溯细节与代码出处。标注 ⚠ 的条目是已知的现状怪癖（bug 或契约偏差），重构若改变它们属于**用户可感知的行为变更**，必须显式决策、不得顺手"修复"。

### 8.1 Shell 与导航

- [ ] 打开入口全部可用：工具栏按钮（含 attention 徽标）、库/阅读器 sidenav、条目右键菜单（默认 SkillRunner tab）、任务气泡；无快捷键（§1.1）
- [ ] 侧边栏霸占原生右侧面板，宽度由 Zotero splitter 决定，插件不设宽（§1.1）
- [ ] 关闭仅隐藏容器，iframe 不销毁；重开后 tab、滚动、草稿全部保留（§1.1）
- [ ] 三个 tab 无懒加载、切换只切 `hidden`、状态保留；切 tab 强制关闭其它子页面抽屉；活动 tab 跨开关持久化（§1.2）
- [ ] shell loading 遮罩初始可见、iframe 文档加载完成即消失（不等业务数据）（§1.2）

### 8.2 布局与区域显隐

- [ ] 单 tab 区域顺序：toolbar / banner / message-counts / conversation(transcript+empty+view 菜单) / plan / hint / composer；三抽屉覆盖层位置与宽度（§1.3）
- [ ] 默认显隐：message-counts、plan、hint、三抽屉默认隐藏；toolbar/banner/composer 恒占位；empty-state 按 owner 有无切换（§1.3、§7.2）
- [ ] 抽屉均有点击遮罩关闭、无滑入动画；permission drawer 底部 sheet、按需创建（§1.3）
- [ ] SkillRunner 无独立 empty 区、plan 恒隐藏、无 usage gauge、无 permission drawer（§1.4、§6.2）

### 8.3 控件行为

- [ ] toolbar 四项的可见/可用条件与键盘交互（radiogroup roving tabindex、Arrow/Home/End）（§2.1）
- [ ] banner 各控件矩阵（两 tab 分别核对）：Session 选择器 8 条截断 + "Show more…" 哨兵开抽屉；Connect/Disconnect/Authenticate/Auto-approve 可用条件；Skills 的 sequence 副标题 1️⃣–9️⃣/#N 投影且两槽位不去重；LED 只显示本地化 label 不显示原始值（§2.2、§2.3）
- [ ] context drawer：分组折叠保持、卡片字段、Archive 条件（Chat: idle/disconnected；Skills: 终态）、归档活动会话自动切换、Skills Queued 分区默认折叠、选中先关抽屉再转发（§2.4）
- [ ] details drawer：每次打开重新请求、先 loading 再填充、迟到读取丢弃、owner 切换原子关闭、sections 与动作按钮清单、⚠ 折叠标记当前无效全部展开（§2.5、§7.1.1）——⚠ 此项已决策为 bug，重构完成后修复为默认折叠；合并验收时按"全部展开"比对，修复落地后按"默认折叠"比对
- [ ] permission：drawer 不自动弹出、"View details" 按钮的出现条件、选项 + 恒追加 danger Cancel、解决后 hint/drawer/composer 联动恢复（§2.6）
- [ ] display mode 三态语义：Live 逐字流式 / By message 按段成批 / Silent 只见计数增长、结束一次性出结果（§3.6）

### 8.4 Transcript

- [ ] 五种条目 + tool 分组的渲染形态、LED 颜色语义、revision 徽章、⚠ streaming 无专门视觉指示（§4.1）
- [ ] Plain/Bubble 差异与切换语义（整体重建、吸底/anchor 恢复、展开保留、选择丢失、纯本地）（§4.2）
- [ ] 代码块 Copy：hover 淡入、Copied/Copy failed、1400ms 恢复（§4.3）
- [ ] 流式追加走 Text 节点 appendData、完成时才转 Markdown；soft-side-channel 不切分 assistant 段；段边界事件清单（§4.4）
- [ ] 滚动：80px 吸底阈值、上滚不拽回、回到底部恢复吸底、⚠ 无"回到底部"按钮（§4.5）
- [ ] 虚拟化：80 条/页、5 页缓存、120+20 行窗口、320px 预加载、"Loading transcript..." 占位、5s 重试、⚠ 无分页按钮（§4.6）
- [ ] 冷加载：owner-first loading spinner、签名去重不重复重建、尾部页首渲染、page-first 不等 full mirror、LRU 10 owner、live/pinned 不淘汰（§4.7）
- [ ] 增量更新不闪烁、滚动不跳、展开不塌、他行选区不受影响；全量重渲仅在模式切换/owner 变化/恢复路径（§4.8）
- [ ] loading/failed/empty 三态呈现与文案来源（§4.9）

### 8.5 Composer

- [ ] textarea：占位符、无自动增高（58px/24vh/可拖拽）、禁用外观、重建保留文本与焦点（§5.1）
- [ ] 按钮状态机四态（enabled/busy/cancelling/disabled）与文案、⚠ 两 tab busy 按钮都是 "Cancel"（§5.2）
- [ ] Ctrl/Cmd+Enter；ArrowUp/Down 历史 50 条、tab×owner×action 作用域、draft 暂存恢复（§5.3）
- [ ] 草稿按 owner 隔离、切换保留、不跨 tab（§5.4）
- [ ] 三个下拉：恒渲染、空选项 `-`、⚠ Chat Reasoning 空选项显示 "Default"；可用条件矩阵（Skills Model/Reasoning 需 waiting_user/failed_retriable）；无乐观更新；未应用成功时插入配置提示状态条（§5.5）
- [ ] usage gauge 三态（%/token 数/N-A）、⚠ 数字仅在 owner-presentation 重发布时刷新（§5.6）
- [ ] waiting-user 控件：仅 Skills、渲染在 hint 区、选项按钮/文件槽、与输入框并存、上限 16 选项/8 槽/32MB/64MB（§5.7）
- [ ] 可写条件完整矩阵（两 tab 各 7+ 行逐行核对）、⚠ Chat 断连空闲可写（§5.8）
- [ ] 发送后时序：立即清空输入、无本地乐观切换、用户消息随后出现在 transcript（§5.9）

### 8.6 渲染模型不变量

- [ ] region-to-DOM 矩阵不变；transcript 更新只写 transcript 区域；流式期间 chrome 各区域 DOM 稳定（§3.2、§3.5）
- [ ] 签名未变完全不碰 DOM；签名只含可见内容与开合状态（§3.3）
- [ ] 乱序/过期/重复 publication 静默丢弃；delta 断档 rebase 全量自愈；校验失败用户不可见（§3.4）
- [ ] hint 优先级链：pending permission 覆盖一切；Skills/Chat 各自的 kind 推导顺序与 LED 色调（§3.9）
- [ ] message counts：`current/cumulative` 格式条件、计数口径、节点复用（§3.7）
- [ ] plan 区域：显隐条件、completed/total、spinner/✓/• 图标（§3.8）

### 8.7 SkillRunner 专項

- [ ] 生命周期七状态的徽章/indicator/hint/composer 表现（§6.3 表格逐行）
- [ ] auth 交互全家桶（方法选择、auth_url、user_code、文件导入、1.5s 轮询）（§6.3）
- [ ] composer 无自由输入，发送必须挂在 interaction/auth 上；waiting_auth 输入框变 API key/授权码粘贴（§6.4）
- [ ] revision 条目（"Rejected final reply"）与 final 到达后中间消息移除（§6.5）
- [ ] 切换 run transcript 整棵重建 + "Loading conversation..."（§6.1；若收敛后改为 owner-first 模式，属于可感知变化，需显式确认）
