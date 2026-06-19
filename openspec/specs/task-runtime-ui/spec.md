# task-runtime-ui Specification

## Purpose
TBD - created by archiving change m2-baseline. Update Purpose after archive.
## Requirements
### Requirement: 系统必须维护任务运行态模型
系统 MUST 维护任务在运行期的状态（排队、执行、完成、失败），并提供稳定标识用于查询与展示。

#### Scenario: SkillRunner sequence step projection remains step-scoped

- **WHEN** a SkillRunner sequence workflow launches multiple steps
- **THEN** each step SHALL keep its independent task projection
- **AND** reconciler-owned apply settlement SHALL update that step projection
  rather than an outer sequence task row

#### Scenario: ACP run-store rows are not created for SkillRunner sequence requests

- **WHEN** a SkillRunner sequence step request id is settled by runtime or
  reconciler code
- **THEN** task runtime SHALL NOT create an ACP `skill-runs` record for that
  request id
- **AND** SkillRunner dashboard/history SHALL remain the visible task record

### Requirement: 系统必须提供任务 UI 的最小可观测能力
系统 MUST 以 Dashboard 形态提供任务可观测能力，而非仅单表视图。

#### Scenario: SkillRunner backend run table includes local engine column
- **WHEN** 用户进入 SkillRunner backend 的 run 列表页
- **THEN** 系统 MUST 在表格中展示本地任务记录的 `engine` 列
- **AND** `engine` 值 MUST 来自本地 runtime/history 任务模型
- **AND** 系统 MUST NOT 因该列改造引入后端 runs 列表作为主数据源

### Requirement: Dashboard MUST provide main-window toolbar shortcut with project logo
系统 MUST 在 Zotero 主窗口顶部工具栏提供 Dashboard 快捷入口，并使用项目图标。

#### Scenario: open dashboard from toolbar button
- **WHEN** 用户点击工具栏中的 Dashboard 图标按钮
- **THEN** 系统 MUST 打开 Dashboard 窗口
- **AND** 按钮卸载时 MUST 被清理，避免重复挂载

### Requirement: Dashboard sidebar MUST separate Home and Backend groups
系统 MUST 在 Dashboard 侧栏中提供 `Dashboard Home` 与 `Backends` 两个分组，并以视觉分隔线区分。

#### Scenario: render sidebar tabs
- **WHEN** Dashboard 渲染侧栏 tab
- **THEN** Home MUST 显示在独立分组
- **AND** Backend tabs MUST 显示在后端分组
- **AND** 两个分组之间 MUST 可见分隔符

### Requirement: Backend tab with no tasks MUST render backend-empty table state
系统 MUST 在"已选 backend 且无任务"时渲染该 backend 的空表态，而不是"请选择 backend"提示。

#### Scenario: selected backend has no rows
- **WHEN** 用户已进入某 backend tab 且该 backend 无历史/运行任务
- **THEN** 页面 MUST 显示空表格
- **AND** 文案 MUST 指示"当前 backend 无任务"

### Requirement: Run Dialog chat viewport MUST preserve manual scroll position
系统 MUST 在 Run Dialog 聊天区中仅在用户位于底部附近时自动跟随新消息，避免阅读旧消息时被强制跳转。

#### Scenario: auto-follow only near bottom
- **WHEN** 新 snapshot 到达且聊天区已有滚动位置
- **THEN** 若用户位于底部附近，系统 MUST 自动滚动到底部
- **AND** 若用户不在底部附近，系统 MUST 保持当前滚动位置不变

### Requirement: Dashboard backend log panel MUST provide navigation to diagnostic export
系统 MUST 在 Dashboard backend 日志区域提供跳转到诊断导出的入口，避免在 Dashboard 内重复实现独立导出面板。

#### Scenario: open diagnostic export from backend log section
- **WHEN** 用户在 backend 日志区域点击"诊断导出"入口
- **THEN** 系统 MUST 打开日志窗口并聚焦诊断导出操作
- **AND** 保留当前 backend/任务过滤上下文用于导出构建

### Requirement: Main-window toolbar MUST provide execute-workflow menu shortcut
系统 MUST 在 Zotero 主窗口工具栏提供 `Execute Workflow` 图标菜单按钮。

#### Scenario: inject toolbar execute-workflow button with anchored placement
- **WHEN** 主窗口加载并注入插件工具栏按钮
- **THEN** 系统 MUST 注入 `Execute Workflow` 图标菜单按钮
- **AND** 若存在 `zotero-tb-note-add`，该按钮 MUST 插入在其右侧
- **AND** Dashboard 图标按钮 MUST 继续位于搜索锚点前
- **AND** 卸载/窗口关闭时 MUST 清理两个按钮

### Requirement: Execute-workflow toolbar menu MUST reuse workflow trigger semantics
系统 MUST 复用右键 workflow 触发区的 workflow 可执行判定、禁用原因文案和执行命令行为。

#### Scenario: build toolbar execute-workflow popup
- **WHEN** 用户展开工具栏 `Execute Workflow` 菜单
- **THEN** 菜单项 MUST 与右键 workflow 触发区使用同源 workflow 判定逻辑
- **AND** 菜单 MUST NOT 包含 `Open Dashboard...` 等非 workflow 入口
- **AND** 无 workflow 时 MUST 显示禁用空态项

### Requirement: Dashboard home MUST provide workflow bubbles above task summary
系统 MUST 在 Dashboard 首页任务统计区上方渲染 workflow 气泡区，并为每个已注册 workflow 提供说明与设置入口。

#### Scenario: render compact workflow bubbles on home page
- **WHEN** 用户打开 Dashboard 首页
- **THEN** 系统 MUST 在任务统计区上方显示 workflow 气泡区
- **AND** 每个气泡 MUST 显示 workflow label
- **AND** 每个气泡 MUST 提供"说明"和"设置"两个按钮
- **AND** 气泡布局 MUST 水平排列并在空间不足时换行
- **AND** 气泡标题与按钮行 MUST 保持单行显示（不换行）

#### Scenario: disable settings button for non-configurable workflow
- **WHEN** 某 workflow 无可配置项
- **THEN** 该 workflow 气泡中的"设置"按钮 MUST 为禁用状态

### Requirement: Dashboard home MUST support embedded workflow README doc subview
系统 MUST 支持从首页 workflow 气泡进入 README 说明子页，并保持左侧 tab 结构不变。

#### Scenario: open workflow doc subview in home main area
- **WHEN** 用户点击 workflow 气泡中的"说明"按钮
- **THEN** 系统 MUST 在右侧主区显示该 workflow 的 README 渲染内容
- **AND** `selectedTabKey` MUST 保持为 `home`
- **AND** 页面 MUST 提供"回到 Dashboard"按钮返回首页主视图

#### Scenario: fallback when README is missing
- **WHEN** 目标 workflow 根目录不存在 `README.md`
- **THEN** 系统 MUST 显示本地化的"README 缺失"提示文本

### Requirement: Dashboard home MUST route workflow settings from bubbles
系统 MUST 支持从首页 workflow 气泡直接跳转到 workflow 设置页并定位目标 workflow。

#### Scenario: open workflow options from home bubble
- **WHEN** 用户点击 workflow 气泡中的"设置"按钮
- **THEN** 系统 MUST 切换到 `workflow-options` tab
- **AND** 系统 MUST 选中对应 workflow 的设置子页

### Requirement: Dashboard SHALL use the shared visual theme

The Task Dashboard SHALL use the shared Zotero Skills visual theme foundation
for shell, sidebar, cards, tables, forms, workflow settings, and custom select
controls.

#### Scenario: Dashboard renders in dark mode

- **WHEN** the selected visual theme is dark
- **THEN** Dashboard shell, sidebar, cards, tables, controls, status chips, and
  settings dialogs SHALL remain readable
- **AND** Dashboard CSS SHALL NOT depend on a separate independent palette for
  core surfaces.

### Requirement: Startup SHALL reconcile provider task UI projections

Provider workflow task projections restored from plugin state SHALL be reconciled on startup before active task UI surfaces render. SkillRunner projections for known requests SHALL remain user-visible when backend reconciliation proves the request is missing or rejected.

#### Scenario: ACP projection follows ACP run SSOT

- **GIVEN** an ACP workflow task projection exists for an ACP skill run
- **WHEN** startup reconciliation runs
- **THEN** the projection SHALL be updated or removed according to the ACP skill run record
- **AND** recoverable non-terminal ACP runs SHALL NOT be failed solely because their local controller was lost.

#### Scenario: SkillRunner request remains backend-owned

- **GIVEN** a SkillRunner workflow task projection has both `backendId` and `requestId`
- **WHEN** plugin startup restores task projections
- **THEN** the projection SHALL remain available for backend ledger reconciliation

#### Scenario: Orphan projection is not active forever

- **GIVEN** a workflow task projection cannot be associated with an ACP run or SkillRunner backend request
- **WHEN** startup reconciliation runs
- **THEN** the projection SHALL be marked `failed`
- **AND** it SHALL no longer appear in active task lists.

#### Scenario: SkillRunner missing request becomes failed history

- **GIVEN** a SkillRunner workflow task projection has both `backendId` and `requestId`
- **WHEN** startup or managed-local-up ledger reconciliation receives `404` for that request
- **THEN** the projection SHALL be marked `failed`
- **AND** dashboard history SHALL retain a failed row for that request
- **AND** the task SHALL NOT disappear because active/history rows were deleted
- **AND** plugin SHALL NOT mark the backend unreachable solely because of that request-level 404

### Requirement: Dashboard home SHALL identify core workflows

Dashboard home workflow bubbles SHALL expose whether a workflow is core and SHALL render a localized Core badge for core workflows. Builtin workflow badges SHALL continue to render independently.

#### Scenario: Core workflow appears on Dashboard home

- **GIVEN** a visible workflow declares `display.core` as true
- **WHEN** Dashboard home workflow bubbles are rendered
- **THEN** the workflow bubble snapshot includes `core: true`
- **AND** the UI renders a localized Core badge for that bubble

#### Scenario: Non-core workflow appears on Dashboard home

- **GIVEN** a visible workflow does not declare `display.core` as true
- **WHEN** Dashboard home workflow bubbles are rendered
- **THEN** no Core badge is rendered for that workflow

### Requirement: Dashboard snapshot labels SHALL cover fixed Dashboard UI

Dashboard snapshots SHALL provide labels for fixed Dashboard UI chrome, table headers, toolbar buttons, products, runtime logs, management UI controls, empty states, and validation prompts.

#### Scenario: Dashboard static UI renders

- **GIVEN** a Dashboard snapshot with localized labels
- **WHEN** the main Dashboard page renders home, workflow options, products, runtime logs, or backend views
- **THEN** fixed UI text MUST come from the snapshot labels
- **AND** action keys and business DTO fields MUST remain unchanged

### Requirement: Dashboard workflow display SHALL use localized workflow labels

Dashboard workflow cards and newly-created user-visible run labels SHALL use localized workflow labels when available.

#### Scenario: Dashboard workflow card is localized

- **WHEN** dashboard workflow summaries are built for a locale with workflow package messages
- **THEN** each workflow card label SHALL use the localized workflow label
- **AND** workflow ids and settings routing SHALL remain unchanged.

#### Scenario: Existing history is not migrated

- **WHEN** historical task rows already contain workflow labels
- **THEN** the system SHALL NOT rewrite those rows during workflow locale changes
- **AND** only newly-created labels use the current locale projection.

### Requirement: Dashboard SHALL govern refreshes by selected surface

Dashboard snapshots SHALL expose stable chrome and selected-surface signatures so background refreshes can be ignored when they do not change the active view.

#### Scenario: Background task update does not change active Products surface

- **GIVEN** Dashboard is showing the Products tab
- **AND** the registered products, skill feedback records, selected product, selected feedback record, filters, and Dashboard chrome are unchanged
- **WHEN** a task update, ACP skill run snapshot update, backend-health update, or periodic refresh occurs
- **THEN** Dashboard SHALL NOT post a replacement snapshot that forces the Products surface to re-render.

#### Scenario: Product storage changes while Products is active

- **GIVEN** Dashboard is showing the Products tab
- **WHEN** normal workflow products or `skill_run_feedback` products change
- **THEN** Dashboard SHALL post a snapshot whose selected-surface signature changes
- **AND** the Products or Skill Feedback surface SHALL update.

### Requirement: Dashboard SHALL keep a stable browser shell

Dashboard browser rendering SHALL keep the top-level app shell stable and update selected view surfaces without rebuilding unrelated shell nodes.

#### Scenario: Sidebar Dashboard receives noisy snapshots

- **GIVEN** Dashboard is embedded in the assistant/sidebar workspace
- **AND** a task is running in another Dashboard surface
- **WHEN** the active view receives duplicate unchanged Dashboard snapshots
- **THEN** the browser renderer SHALL skip the duplicate render
- **AND** local UI state such as scroll position, product preview, product tree expansion, and feedback checkbox selection SHALL remain stable.

### Requirement: Dashboard Products and Skill Feedback SHALL share stable product browsing behavior

Dashboard Products and Skill Feedback SHALL use the same stable product browsing model for filtering, selection, preview, and export controls.

#### Scenario: Skill Feedback remains selected during background activity

- **GIVEN** the user selected one or more Skill Feedback records
- **AND** another task emits progress updates
- **WHEN** the feedback product set and active skill filter are unchanged
- **THEN** Dashboard SHALL keep the selected feedback records and current Markdown preview visible.

#### Scenario: Skill Feedback select-all respects the active skill filter

- **GIVEN** the Skill Feedback product list is filtered by skill
- **WHEN** the user toggles the select-all checkbox
- **THEN** Dashboard SHALL select or clear only feedback records visible under the active filter
- **AND** feedback records outside the active filter SHALL NOT be selected merely because select-all was toggled.

### Requirement: SkillRunner pre-ready requests MUST not become invisible observer tasks

Task runtime bookkeeping MUST distinguish dispatch-owned pre-ready SkillRunner request ids from user-visible task projections. Pre-ready requests MAY remain in dispatch or ledger state, but they MUST NOT start observation loops as invisible tasks.

#### Scenario: upload-stalled request remains non-observing until ready

- **GIVEN** SkillRunner `/v1/jobs` has returned a `requestId`
- **AND** the upload step has not emitted `request-ready`
- **WHEN** task runtime or startup reconciliation restores local bookkeeping for that request
- **THEN** it MUST NOT create a hidden active task that is absent from the task list but still drives session sync
- **AND** it MUST NOT start event-session sync for that request before the ready boundary

#### Scenario: request-ready creates normal visible ownership

- **GIVEN** a SkillRunner request has emitted `request-ready`
- **WHEN** task runtime creates or restores the associated task projection
- **THEN** the projection MUST contain `backendId` and `requestId`
- **AND** subsequent observation and reconcile behavior MAY proceed through the bounded non-terminal cadence rules

### Requirement: SkillRunner non-terminal reconcile MUST back off when unchanged

Task runtime reconciliation MUST preserve visible SkillRunner non-terminal task rows while reducing request frequency for runs whose backend state remains unchanged.

#### Scenario: unchanged queued request uses bounded reconcile cadence

- **GIVEN** a SkillRunner task projection has `backendId` and `requestId`
- **AND** backend reconciliation repeatedly observes the same non-terminal `queued` state
- **WHEN** the reconciler schedules subsequent checks
- **THEN** it MUST increase or maintain a bounded per-request reconcile interval instead of polling on every global tick
- **AND** it MUST keep the task visible as non-terminal
- **AND** it MUST NOT delete active/history rows solely because the request is stuck queued

#### Scenario: state change resets reconcile cadence

- **GIVEN** a SkillRunner request is under a throttled non-terminal reconcile cadence
- **WHEN** reconciliation observes a changed state such as `running`, `waiting_user`, `waiting_auth`, `succeeded`, `failed`, or `canceled`
- **THEN** plugin MUST reset request-local cadence for the changed state
- **AND** terminal and waiting-state handling MUST proceed without waiting for the old queued backoff window

#### Scenario: backend-level failures keep existing health semantics

- **WHEN** reconciliation fails due to network error, timeout, `429`, or `5xx`
- **THEN** plugin MUST continue to use existing recoverable/backend health gating semantics
- **AND** unchanged-state backoff MUST NOT suppress backend health failure accounting

#### Scenario: throttled task remains cancelable when cancellation is available

- **WHEN** a SkillRunner task is throttled because it remains unchanged non-terminal
- **THEN** dashboard/workspace projections MUST retain enough `backendId` and `requestId` context for user actions such as opening the run or canceling it when those actions are otherwise available

### Requirement: Legacy ACP/SR task state MUST be cleared on separated-store hard cut

Plugin MUST clear legacy ACP Skills and SkillRunner local task state exactly
once when the separated run-store hard-cut schema is first initialized.

The separated run-store schema intentionally starts fresh for ACP Skills and
SkillRunner local run state.

#### Scenario: first startup after separated-store hard cut clears legacy rows

- **WHEN** plugin initializes the separated run-store hard-cut schema for the first time
- **THEN** plugin SHALL clear legacy ACP skill-run rows and SkillRunner request/context/task rows
- **AND** plugin SHALL record a reset marker in `plugin_meta`
- **AND** subsequent startups SHALL NOT clear new run-store data again.

#### Scenario: SkillRunner UI projection ignores legacy rows

- **WHEN** legacy SkillRunner task/request/context rows remain in local state
- **THEN** Dashboard, Task Manager, and assistant workspace SHALL list SkillRunner tasks from the SkillRunner run store
- **AND** they SHALL NOT restore or display tasks from legacy SkillRunner rows.

### Requirement: SkillRunner run workspace MUST preserve warm stream session state

The SkillRunner run workspace SHALL separate selected-task projection from
per-run chat stream session state.

#### Scenario: warm run state remains available after selection changes

- **WHEN** a selected running run is switched to the warm stream pool
- **THEN** its messages and cursor SHALL remain associated with that request id
- **AND** returning to that run SHALL render the preserved session without
  forcing a reconnect

#### Scenario: warm stream does not drive unrelated selected UI

- **WHEN** a warm non-selected run receives chat stream frames
- **THEN** those frames SHALL update that run's session state
- **AND** the currently selected run's transcript SHALL NOT be replaced by the
  warm run's transcript

#### Scenario: backend-gated workspace releases streams

- **WHEN** a backend becomes reconcile-gated or the run workspace closes
- **THEN** all UI stream sessions owned by that backend/workspace SHALL be
  aborted
- **AND** task history/projection rows SHALL remain preserved

### Requirement: SkillRunner workspace selection MUST be user-driven

SkillRunner run workspace selection SHALL change only from explicit user UI
actions and SHALL NOT be driven by provider progress or temporary request
placeholders.

#### Scenario: newly submitted SkillRunner run does not steal focus

- **WHEN** a SkillRunner job emits `request-created` or `request-ready`
- **THEN** plugin SHALL register the run for projection and settlement
- **AND** plugin SHALL NOT change the currently selected SkillRunner run

#### Scenario: request-created job is not user-visible before request-ready

- **WHEN** a SkillRunner job is queued, running, or has emitted
  `request-created` but has not emitted `request-ready`
- **THEN** task runtime and dashboard history SHALL NOT expose that job as a
  SkillRunner run row
- **AND** the SkillRunner run store SHALL NOT create a projectable run record
  for that job

#### Scenario: missing projection is not represented as a temporary task

- **WHEN** a request id is known from provider progress but the SkillRunner run
  store has not exposed a projection for it
- **THEN** the workspace SHALL NOT synthesize a selectable temporary task row
- **AND** the task SHALL appear only after the run store projection exists

#### Scenario: refresh does not auto-pick fallback run

- **WHEN** workspace data refreshes without a user-selected task key
- **THEN** the currently selected visible run SHALL remain selected
- **AND** if the current run is unavailable, the workspace SHALL show no
  selected run instead of selecting the newest or first visible task

### Requirement: SkillRunner UI MUST separate run state from apply state

Task runtime UI SHALL render SkillRunner backend execution state and deferred
apply state as separate lifecycle fields.

#### Scenario: terminal run with pending apply stays projectable

- **WHEN** a SkillRunner run state is `succeeded`
- **AND** apply state is `pending` or `running`
- **THEN** task runtime UI SHALL keep the run in projections with a deferred
  apply indicator
- **AND** it SHALL NOT archive the run solely because backend execution is
  terminal

#### Scenario: failed apply is visible and cancellable only where meaningful

- **WHEN** a SkillRunner run state is terminal
- **AND** apply state is `failed`
- **THEN** task runtime UI SHALL show the apply error summary
- **AND** it SHALL NOT continue chat stream, pending, reply, or cancel loops for
  that terminal backend run

#### Scenario: SkillRunner request ids do not pollute ACP UI state

- **WHEN** a SkillRunner request reaches terminal or apply settlement
- **THEN** task runtime UI SHALL derive its row from SkillRunner projections
- **AND** it SHALL NOT require or create ACP `skill-runs` state for that request

### Requirement: SkillRunner sequence step task identity MUST remain stable

Task runtime and UI projections SHALL preserve sequence step identity across
submission, settlement, persistence, and restore.

#### Scenario: sequence step run record keeps full identity

- **WHEN** a SkillRunner sequence step reaches request-ready
- **THEN** its projectable run record SHALL include `workflowRunId`,
  `sequenceStepId`, `sequenceStepIndex`, `sequenceJobId`, and
  `sequenceStepSkillId`
- **AND** restoring that record into the reconciler SHALL preserve those fields

#### Scenario: sequence root is not a task row

- **WHEN** a SkillRunner sequence root exists only as orchestration state
- **THEN** it SHALL be stored with `projectable=false`
- **AND** it SHALL NOT appear as a separate Dashboard, popover, or RunDialog
  task row

### Requirement: Sequence apply state MUST remain visible independently of run state

UI projections SHALL keep terminal run state and deferred apply state separate.

#### Scenario: terminal step with pending apply remains visible

- **WHEN** a SkillRunner sequence step run is terminal succeeded
- **AND** side-effect apply is still pending, running, retrying, or failed
- **THEN** the step SHALL remain visible in task projections
- **AND** the projection SHALL expose apply state, error, and next retry time
  when available

### Requirement: SkillRunner connection audit snapshots SHALL be metadata-only

Runtime UI and debug capability snapshots for SkillRunner connection audit SHALL
contain only redacted connection metadata.

#### Scenario: governor audit event is redacted

- **WHEN** a SkillRunner connection lifecycle event is captured
- **THEN** the event SHALL include backend id, lane, request id when present,
  operation label, timestamps, duration, timeout, reason, and error name when
  available
- **AND** the event SHALL NOT include request payloads, response bodies,
  parameters, tokens, local paths, or result contents

#### Scenario: late settlement is visible

- **WHEN** a governed task settles after the governor already timed out or
  aborted it
- **THEN** the governor audit event buffer SHALL record a
  `late_resolve_after_timeout`, `late_reject_after_timeout`, or corresponding
  late-abort settlement event
- **AND** that event SHALL be visible in the debug audit snapshot

### Requirement: SkillRunner run projection MUST remain visible while observation is degraded

Observation downgrade MUST NOT remove or hide deferred apply/run state.

#### Scenario: deferred apply remains visible during connection pressure

- **WHEN** a SkillRunner run is terminal but deferred apply is pending, retrying, or failed
- **AND** the backend is under connection pressure or degraded observation
- **THEN** dashboard, popover, and run workspace SHALL keep the run projection visible
- **AND** the apply state SHALL remain readable from the SkillRunner run store projection.

#### Scenario: observation skip is not task deletion

- **WHEN** plugin skips background history or reachability requests due to physical debt
- **THEN** plugin SHALL NOT delete task projections or dashboard history
- **AND** UI SHALL keep the last-known state until a critical path updates it.
