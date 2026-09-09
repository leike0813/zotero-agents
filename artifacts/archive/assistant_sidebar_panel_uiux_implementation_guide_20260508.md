# Assistant Sidebar 三面板 UI/UX 代码实现导览

本文档记录当前 Assistant sidebar 三个 panel 的 UI/UX 代码实现逻辑，方便后续做视觉美化、回归排查和实现交接。

## 文档关系

- `doc/components/assistant-sidebar-panel-ui-ssot.md` 是规范合同，定义三面板统一 UI/UX 模型的目标状态和约束。
- 本文档是当前实现导览，说明代码如何实现这些合同，以及后续美化时应该优先检查哪些实现锚点。
- 页面代码仍保留 panel-specific adapter/action mapping：ACP Chat、ACP Skills、SkillRunner 的底层 store、host bridge、业务协议没有物理合并。

## 统一 Runtime 总览

当前三面板使用两条共享 UI/runtime 主线：

- `AssistantPanelSnapshot -> AssistantPanelRenderer`：负责六区布局中除 conversation window 以外的区域，包括 toolbar、banner、plan、hint、reply、context drawer、details drawer。
- `AssistantConversationView -> AssistantTranscriptRenderer`：负责 conversation window 中的 transcript items 渲染，包括 message、process、tool、status、revision badge、plain/bubble 视图。

共享视觉基础集中在 `addon/content/dashboard/assistant-panel-shared.css`。三页面私有 CSS 应只保留容器布局、iframe/page mount、少量 adapter-specific 修饰，不应重新定义主按钮体系、transcript 主样式或 drawer 主样式。

三个页面的职责收敛为：

- 接收 host snapshot。
- 调用对应 projection helper 生成 `AssistantPanelSnapshot`。
- 调用 shared panel renderer 渲染六区非 transcript UI。
- 调用 shared transcript renderer 渲染 conversation window。
- 将 renderer 发出的 action envelope 映射回原 host action。
- 保留 markdown/math callback、plain/bubble 本地偏好、drawer open/details open 等少量页面状态。

## 核心代码锚点

### Panel Model

`addon/content/dashboard/assistant-panel-model.js` 是三面板 UI view model 的主入口。

关键函数：

- `normalizeAssistantPanelSnapshot(input)`：补齐 panel snapshot 默认字段，确保 renderer 不因缺字段崩溃。
- `projectAcpChatPanelSnapshot(snapshot)`：将 ACP Chat host snapshot 投影为 managed panel snapshot。
- `projectAcpSkillRunPanelSnapshot(snapshot)`：将 ACP Skills selected run/list snapshot 投影为 managed panel snapshot。
- `projectSkillRunnerPanelSnapshot(snapshot)`：将 SkillRunner run/workspace envelope 投影为 managed panel snapshot。
- `buildSessionPickerOptions(...)`：ACP Chat 当前 backend conversation selector 的选项治理，包括 `Show more` sentinel。
- `contextSelector(...)`：生成 banner/reply selector view model。
- `contextAction(...)`：生成 banner action view model。
- `archiveItemAction(...)`：生成 drawer item 右侧归档 action。

### Panel Renderer

`addon/content/dashboard/assistant-panel-renderer.js` 是六区非 transcript UI 的共享 renderer。

关键函数：

- `renderAssistantPanelSnapshot(snapshot, options)`：统一入口，按 `managedRegions` 分发渲染。
- `renderToolbar(...)`：渲染 panel-level toolbar action。
- `renderAssistantBanner(...)`：渲染 title/subtitle、metadata、indicators、context selectors、context actions。
- `renderAssistantPlan(...)`：渲染 plan widget、状态图标和 `x/n` progress。
- `renderAssistantHint(...)`：渲染 permission/auth/disconnected/waiting/running/completed/notice。
- `renderAssistantReply(...)`：渲染 textarea + reply footer。
- `renderAssistantContextDrawer(...)`：渲染普通 context drawer 或分派到 workspace task drawer。
- `renderAssistantWorkspaceTaskDrawer(...)`：渲染 ACP Chat/ACP Skills/SkillRunner 的任务式 drawer。
- `renderDetailsDrawer(...)`：渲染 details/diagnostics drawer，包括 header actions、section card、折叠状态和滚动 body。

### Conversation Projection

`addon/content/dashboard/assistant-conversation-view.js` 负责 ACP Chat 和 ACP Skills 的 conversation projection。

关键函数：

- `projectAcpChatConversationView(snapshot)`：将 ACP Chat transcript/status/tool/process/usage 投影为 `AssistantConversationView`。
- `projectAcpSkillRunConversationView(run)`：将 ACP Skills selected run transcript/plan/pending interaction/usage 投影为 `AssistantConversationView`。

SkillRunner 的 conversation projection 目前在 `run-dialog.js` 与 `assistant-panel-model.js` 中协同完成，因为它需要消费 SkillRunner thinking core 和 native revision/replacement 语义。

### Transcript Renderer

`addon/content/dashboard/assistant-transcript-renderer.js` 是 conversation window 的共享 renderer。

关键函数：

- `renderAssistantTranscript(options)`：增量渲染 transcript item list，维护 scroll anchoring 和 node reuse。
- `renderAssistantTranscriptItem(row, item, options)`：渲染单条 canonical transcript item。

统一 transcript DOM vocabulary：

- `assistant-transcript-row`
- `assistant-transcript-meta`
- `assistant-transcript-body`
- `assistant-transcript-tool-*`
- `assistant-transcript-revision-badge`

页面不应恢复 `.acp-message/*`、`.transcript-row/*` 等旧主样式分支作为可见 transcript 样式入口。

## 六区渲染流程

三页面的基本渲染流程一致：

1. 页面收到 host `init` 或 `snapshot` message。
2. 页面保存 snapshot 到本地 state。
3. 页面调用对应 `project*PanelSnapshot()` 生成 managed panel snapshot。
4. 页面调用 `renderAssistantPanelSnapshot(..., { managed: true, managedRegions: ... })`。
5. Panel renderer 接管 toolbar、banner、plan、hint、reply、drawer、details。
6. 页面单独调用 `renderAssistantTranscript()` 渲染 conversation window。
7. 页面根据本地 state 控制 drawer/details 可见性和 plain/bubble 按钮状态。

三页面的 grid owner 应保持一致：

- outer shell 固定为三行：toolbar、banner、main。
- main 固定为四行：conversation、plan、hint、reply。
- drawer 和 details 是 overlay，不参与 shell/main grid 行。
- ACP Chat、ACP Skills、SkillRunner 都应遵守这一结构，避免同一 shared renderer 在不同 grid owner 下产生高度和对齐漂移。

`conversation` region 被 `AssistantPanelRenderer` 标记为非 managed，因为 transcript 有独立 diff state、scroll anchoring、markdown/math callback 和展开状态。

## ACP Chat 实现细节

页面入口：`addon/content/dashboard/acp-chat.js`。

核心状态：

- `snapshot`
- `chatDisplayMode`
- `sessionDrawerOpen`
- `detailsDrawerOpen`
- `transcriptNodeMap`
- `transcriptOrderKey`
- `transcriptMode`
- `toolActivityExpandedIds`

`projectAcpChatPanelSnapshot()` 负责：

- Banner title/status/backend metadata。
- `Backend` selector。
- 当前 backend 的 `Conversation` selector。
- `New`、`Connect`、`Disconnect`、`Authenticate` context actions。
- ACP Chat reply controls：mode、model、reasoning selectors。
- usage gauge。
- connection indicator。
- MCP indicator。
- Sessions drawer 的 backend/conversation grouping。
- conversation item 的 `archive-conversation` action。
- details drawer diagnostics sections。

`acp-chat.js` 的 `handlePanelAction()` 将 managed action 映射为 host action：

- `set-active-backend -> set-active-backend { backendId }`
- `set-active-conversation -> set-active-conversation { conversationId, backendId }`
- `new-conversation -> new-conversation { backendId }`
- `connect -> connect { backendId }`
- `disconnect -> disconnect { backendId }`
- `authenticate -> authenticate { backendId, methodId }`
- `set-mode -> set-mode { modeId }`
- `set-model -> set-model { modelId }`
- `set-reasoning-effort -> set-reasoning-effort { effortId }`
- `send-prompt -> send-prompt { message }`
- `cancel -> cancel`
- `archive-conversation -> archive-conversation`

Conversation selector 中 `Show more` 是 sentinel：选择它只打开 Sessions drawer，不发送 conversation switch。

Transcript 渲染：

- `renderTranscript(snapshot)` 先投影 `projectAcpChatConversationView(snapshot)`。
- 再调用 `renderAssistantTranscript()`。
- 使用 `transcriptNodeMap / transcriptOrderKey / transcriptMode / toolActivityExpandedIds` 做增量渲染和展开状态保持。

## ACP Skills 实现细节

页面入口：`addon/content/dashboard/acp-skill-run.js`。

核心状态：

- `snapshot`
- `runDrawerOpen`
- `detailsOpen`
- `chatDisplayMode`
- `pendingSelectedRequestId`
- `transcriptNodeMap`
- `transcriptOrderKey`
- `transcriptMode`
- `transcriptRunId`
- `toolActivityExpandedIds`
- `drawerCompletedCollapsed`

`projectAcpSkillRunPanelSnapshot()` 负责：

- selected run banner。
- selected run connection/MCP indicators。
- `Connect`、`Disconnect`、`Cancel Run` context actions。
- Runs drawer。
- details drawer。
- output revisions details。
- permission interaction。
- waiting/running/completed hint。
- plan widget。
- reply zone。
- usage gauge。

Runs drawer 使用 `workspace-task-drawer` layout：

- Running section 默认展开。
- Completed section 默认折叠。
- 每个 section 内按 backend group 展示 run card。
- terminal run 才显示右侧 `archive-run` action。
- active run 高亮。

`acp-skill-run.js` 的 `handleAssistantPanelAction()` 将 managed action 映射为 host action：

- `select-run -> select-run { requestId }`
- `connect-run -> connect-run { requestId }`
- `disconnect-run -> disconnect-run { requestId }`
- `cancel-run -> cancel-run { requestId }`
- `archive-run -> archive-run { requestId }`
- `reply-run -> reply-run { requestId, message }`
- `resolve-permission -> resolve-permission`
- `toggle-drawer-section` 只更新本地 `drawerCompletedCollapsed`。

Transcript 渲染：

- `renderTranscript(run)` 投影 `projectAcpSkillRunConversationView(run)`。
- selected run 切换时通过 `transcriptRunId` 重置 node map 和展开状态，避免跨 run 复用节点。
- 使用 shared transcript renderer 的增量渲染路径。

## SkillRunner 实现细节

页面入口：`addon/content/dashboard/run-dialog.js`。

SkillRunner 已接入 managed runtime，但仍保留几个业务专属边界：

- auth import 文件读取。
- waiting_auth reply payload。
- waiting_user option reply payload。
- hostMode/sidebar bridge。
- SkillRunner thinking core。
- native revision/replacement metadata。

`projectSkillRunnerPanelSnapshot()` 提供基础 managed panel snapshot；`run-dialog.js` 会在此基础上补充 `skillRunnerConversationItems(session)`。

`skillRunnerConversationItems()` 负责：

- 将普通 assistant/user 消息映射为 `message`。
- 将 reasoning 映射为 `process`。
- 将 `assistant_process + processType=tool_call/command_execution` 映射为 shared `tool` item。
- 从 `correlation.tool_name`、`correlation.details.path/pattern/command/args` 等字段提取 ACP 风格的 tool name 和 input summary。
- 将 native revision/replacement 映射为带 `revision` metadata 的 message。

SkillRunner Runs drawer 使用 managed drawer shell，但保持 SkillRunner 专用组织逻辑：

- Running/Completed section。
- backend group。
- task card。
- selected/related/disabled 状态。
- Completed 可折叠。
- terminal task 右侧显示 archive action。

`run-dialog.js` 的 `handleAssistantPanelAction()` 映射：

- `open-context-drawer -> toggle-drawer`
- `close-context-drawer -> close-drawer`
- `select-task -> close-drawer + select-task`
- `cancel-run -> cancel-run`
- `archive-run -> archive-run`
- `reply-run -> reply-run`
- `auth-import-run -> auth-import-run`

## Drawer Governance

三面板 drawer 都通过 managed renderer 的 task drawer 体系呈现，但底层语义不同：

- ACP Chat：drawer 对象是 conversation；右侧 action 是 `archive-conversation`。
- ACP Skills：drawer 对象是 run；terminal run 右侧 action 是 `archive-run`；非终态通过 banner `Cancel Run`。
- SkillRunner：drawer 对象是 run/task；terminal run 右侧 action 是 `archive-run`；非终态通过 banner `Cancel Run`。

Archive 语义：

- 只从默认 UI 列表移除。
- 标记 archived state。
- 不物理删除 workspace、日志、诊断、历史记录或 result artifacts。

Cancel Run 语义：

- 只对非终态 run/task 可用。
- 属于 banner context action，不属于 drawer item action。

## Details Drawer Governance

三面板 Details 抽屉都通过 `AssistantPanelSnapshot.drawers.details -> renderDetailsDrawer()` 渲染。页面 JS 不应手写可见 details body。

Details section 当前支持：

- `title`：section 标题。
- `summary`：标题栏旁侧的短说明。
- `entries`：label/value 或 code entries。
- `kind`：`metadata`、`diagnostics`、`logs`、`result`、`revisions` 等语义分类。
- `collapsible` / `defaultCollapsed`：折叠行为。

默认设计：

- 基础 metadata section 展开。
- diagnostics、logs、raw JSON、result、output revisions 默认折叠。
- drawer header 固定，`.assistant-panel-details-list` 是主滚动区域。
- `Copy Diagnostics`、`Copy ID`、`Open Workspace` 等诊断/导出/产物动作留在 Details 内。
- 后端管理动作 `open-backend-manager` 在 ACP Chat、ACP Skills、SkillRunner 三个 panel 的 toolbar 中统一暴露，不放 Details。

SkillRunner Details 展示当前 run/task metadata、pending/auth 摘要、conversation summary 和 revision/replacement 摘要。完整 transcript、完整 conversation history 和 raw envelope 不应直接进入可见 Details；需要完整排障时走 `copy-diagnostics`。SkillRunner Details 也应提供 `Copy ID`，与 ACP Skills 的 request/run 复制能力保持一致。

## Conversation Window 代码模型

统一 canonical item kinds：

- `message`：user 或 assistant 可读消息。
- `process`：thought/reasoning/thinking 过程。
- `tool`：工具调用、命令执行、MCP/tool activity。
- `status`：生命周期或系统状态行。

非 user/agent 内容的当前显示入口：

- Thinking/reasoning：`process` row。
- Tool call/command execution：`tool` row。
- Status/lifecycle：`status` row。
- Revision/replacement：message 上的 `revision` metadata/badge。
- Permission/waiting/running/completed：原则上进入 hint widget，不应作为普通 transcript message，除非协议 transcript 明确记录为 item。

Plain/Bubble：

- view mode 由页面本地 state 维护。
- conversation overlay button 触发 `set-chat-display-mode`。
- shared transcript CSS 根据 mode class 控制全宽 transcript 行或左右气泡布局。

## Reply Zone 代码模型

`renderAssistantReply()` 固定生成：

- `textarea.assistant-panel-reply-input`
- `div.assistant-panel-reply-footer`
- `div.assistant-panel-reply-primary`
- `div.assistant-panel-reply-controls`
- `div.assistant-panel-reply-secondary`

布局规则：

- Send/Cancel 按钮在 footer 最左。
- ACP Chat mode/model/reasoning selectors 位于 controls。
- usage gauge 和快捷键/status hint 位于 secondary。
- ACP Chat 和 ACP Skills 常驻 usage gauge。
- SkillRunner 默认不显示 usage gauge，除非 snapshot 明确启用。
- Reply region 不应外套独立卡片 surface；textarea 和 footer 应与 conversation window 左右对齐。

## Hint / Permission 代码模型

`renderAssistantHint()` 统一处理：

- `permission`
- `auth`
- `disconnected`
- `error`
- `waiting_user`
- `running`
- `completed`
- `notice`
- `hidden`

交互优先级由 conversation/panel projection 决定，renderer 只消费最终 `interaction`。

Permission/auth 的实现要求：

- 必须显示摘要。
- 有 detail 时用 `<details>` 展开完整请求。
- action buttons 通过 managed action envelope 派发，不直接调用 panel-specific host API。

## Plan Widget 代码模型

`renderAssistantPlan()` 只在有 active/non-terminal plan 时显示。

当前渲染内容：

- Header `Plan`。
- 右上角 `completedCount/totalCount`。
- 每行 plan entry。
- running spinner。
- completed check。
- pending dot。

Plan 的内容字段 fallback 顺序包括 `title/text/label/content`，用于兼容 ACP Skills 的 plan entry。

## Visual 美化约束

后续做 UI 美化时应遵守：

- 优先改 `assistant-panel-shared.css`。
- Toolbar surface 和 toolbar 内部 managed-view 布局由 `.asst-shell-toolbar` 统一定义；页面 CSS 不应为 ACP Chat、ACP Skills 或 SkillRunner 分别定义 toolbar 卡片边框、圆角、阴影或按钮排列。
- Shell grid、main grid、body/reset、banner managed-view、conversation surface padding、plan/hint/reply baseline、drawer/details overlay 和 empty state 也由 `assistant-panel-shared.css` 管理。
- 页面私有 CSS 白名单仅包括：panel-specific 宽度变量、transcript scroll hook、`hidden` 工具类，以及少量无法共享的 adapter-specific 约束。
- 不新增页面级 toolbar/banner/hint/reply/drawer builder。
- 不新增页面级 details drawer builder；details section 折叠、滚动和卡片视觉由 shared renderer/CSS 管理。
- 不恢复 `.acp-message/*`、`.transcript-row/*` 等页面私有 transcript 主样式。
- 普通按钮保持矩形圆角；pill 只用于 metadata/status chip。
- drawer/task card、reply/footer、plain/bubble、plan/hint 的主视觉应通过 shared class 统一。
- 如需 panel-specific 差异，应通过 `data-assistant-panel-kind` 或少量 adapter-specific class 做局部修饰，而不是分叉 DOM。
- 修改 action UI 时必须同时检查 action mapping，避免 renderer 发出 action 后页面未映射到 host。

## 常用回归检查点

UI 美化后建议至少检查：

- ACP Chat mode/model/reasoning selector 有 options，切换能发 typed payload。
- ACP Chat conversation selector 能切换会话，`Show more` 只打开 drawer。
- ACP Chat/ACP Skills usage gauge 常驻显示。
- ACP Skills Runs drawer 能切换 selected run，Completed 折叠状态正常。
- SkillRunner Runs drawer 能选择 task，选择后 drawer 关闭。
- 三面板 archive button 不触发 item selection。
- 三面板 plain/bubble 视觉差异一致。
- ACP Skills 和 SkillRunner 的 `Cancel Run` 只对非终态可用。
- Permission hint 显示摘要并能展开完整请求。
