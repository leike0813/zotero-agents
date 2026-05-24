# task-dashboard-history Specification

## Purpose
TBD - created by archiving change reset-task-manager-to-dashboard. Update Purpose after archive.
## Requirements
### Requirement: Dashboard MUST persist local task history for 30 days
系统 MUST 为 Dashboard 维护本地任务历史账本，支持历史回看与 backend 分组统计。

#### Scenario: 终态任务写入历史
- **WHEN** 任务进入终态（succeeded/failed/canceled）
- **THEN** 系统 MUST 将任务记录写入本地历史
- **AND** 历史记录 MUST 包含 backend/provider/workflow/job/request 元数据

#### Scenario: 历史数据按 30 天淘汰
- **WHEN** Dashboard 启动或历史写入发生
- **THEN** 系统 MUST 清理超过 30 天的历史记录
- **AND** 清理后统计与列表 MUST 仅基于保留记录

### Requirement: Workspace toolbar shows active task popover

The Workspace toolbar button SHALL expose a lightweight hover/focus popover that
summarizes current active tasks.

The popover SHALL use the same active-task visibility rules as the Dashboard
running task list. It SHALL NOT use a separate task source or duplicate stale
ACP task filtering logic.

The toolbar button click behavior SHALL continue to open the Zotero Skills
Workspace.

#### Scenario: User hovers Workspace button

- **WHEN** the user hovers or focuses the Workspace toolbar button
- **THEN** a compact running task popover SHALL appear after a short delay
- **AND** it SHALL list current active visible tasks or an empty state.

#### Scenario: User clicks Workspace button

- **WHEN** the user clicks the Workspace toolbar button itself
- **THEN** the Zotero Skills Workspace SHALL open as before.

#### Scenario: User clicks a task row

- **WHEN** the user clicks an ACP skill run task row in the popover
- **THEN** the unified Assistant Workspace SHALL open on the ACP Skills tab
- **AND** the corresponding run SHALL be selected.

- **WHEN** the user clicks a SkillRunner task row in the popover
- **THEN** the unified Assistant Workspace SHALL open on the SkillRunner tab
- **AND** the corresponding request SHALL be focused.

#### Scenario: Popover omits footer actions

- **WHEN** the running task popover is shown
- **THEN** it SHALL NOT include a footer button such as `View all` or
  `Open Dashboard`.

