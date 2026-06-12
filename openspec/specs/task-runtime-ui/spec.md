# task-runtime-ui Specification

## Purpose
TBD - created by archiving change m2-baseline. Update Purpose after archive.
## Requirements
### Requirement: 系统必须维护任务运行态模型
系统 MUST 维护任务在运行期的状态（排队、执行、完成、失败），并提供稳定标识用于查询与展示。

#### Scenario: 任务状态更新
- **WHEN** workflow 输入单元状态变化
- **THEN** 系统更新对应任务状态并保持键稳定

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
系统 MUST 在“已选 backend 且无任务”时渲染该 backend 的空表态，而不是“请选择 backend”提示。

#### Scenario: selected backend has no rows
- **WHEN** 用户已进入某 backend tab 且该 backend 无历史/运行任务
- **THEN** 页面 MUST 显示空表格
- **AND** 文案 MUST 指示“当前 backend 无任务”

### Requirement: Run Dialog chat viewport MUST preserve manual scroll position
系统 MUST 在 Run Dialog 聊天区中仅在用户位于底部附近时自动跟随新消息，避免阅读旧消息时被强制跳转。

#### Scenario: auto-follow only near bottom
- **WHEN** 新 snapshot 到达且聊天区已有滚动位置
- **THEN** 若用户位于底部附近，系统 MUST 自动滚动到底部
- **AND** 若用户不在底部附近，系统 MUST 保持当前滚动位置不变

### Requirement: Dashboard backend log panel MUST provide navigation to diagnostic export
系统 MUST 在 Dashboard backend 日志区域提供跳转到诊断导出的入口，避免在 Dashboard 内重复实现独立导出面板。

#### Scenario: open diagnostic export from backend log section
- **WHEN** 用户在 backend 日志区域点击“诊断导出”入口
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
- **AND** 每个气泡 MUST 提供“说明”和“设置”两个按钮
- **AND** 气泡布局 MUST 水平排列并在空间不足时换行
- **AND** 气泡标题与按钮行 MUST 保持单行显示（不换行）

#### Scenario: disable settings button for non-configurable workflow
- **WHEN** 某 workflow 无可配置项
- **THEN** 该 workflow 气泡中的“设置”按钮 MUST 为禁用状态

### Requirement: Dashboard home MUST support embedded workflow README doc subview
系统 MUST 支持从首页 workflow 气泡进入 README 说明子页，并保持左侧 tab 结构不变。

#### Scenario: open workflow doc subview in home main area
- **WHEN** 用户点击 workflow 气泡中的“说明”按钮
- **THEN** 系统 MUST 在右侧主区显示该 workflow 的 README 渲染内容
- **AND** `selectedTabKey` MUST 保持为 `home`
- **AND** 页面 MUST 提供“回到 Dashboard”按钮返回首页主视图

#### Scenario: fallback when README is missing
- **WHEN** 目标 workflow 根目录不存在 `README.md`
- **THEN** 系统 MUST 显示本地化的“README 缺失”提示文本

### Requirement: Dashboard home MUST route workflow settings from bubbles
系统 MUST 支持从首页 workflow 气泡直接跳转到 workflow 设置页并定位目标 workflow。

#### Scenario: open workflow options from home bubble
- **WHEN** 用户点击 workflow 气泡中的“设置”按钮
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

Provider workflow task projections restored from plugin state SHALL be reconciled on startup before active task UI surfaces render.

#### Scenario: ACP projection follows ACP run SSOT

- **GIVEN** an ACP workflow task projection exists for an ACP skill run
- **WHEN** startup reconciliation runs
- **THEN** the projection SHALL be updated or removed according to the ACP skill run record
- **AND** recoverable non-terminal ACP runs SHALL NOT be failed solely because their local controller was lost.

#### Scenario: SkillRunner request remains backend-owned

- **GIVEN** a SkillRunner workflow task projection has both `backendId` and `requestId`
- **WHEN** startup reconciliation runs
- **THEN** the projection SHALL remain available for backend ledger reconciliation
- **AND** taskRuntime SHALL NOT mark it failed preemptively.

#### Scenario: Orphan projection is not active forever

- **GIVEN** a workflow task projection cannot be associated with an ACP run or SkillRunner backend request
- **WHEN** startup reconciliation runs
- **THEN** the projection SHALL be marked `failed`
- **AND** it SHALL no longer appear in active task lists.

