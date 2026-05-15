## ADDED Requirements

### Requirement: SkillRunner Sidebar Task Order SHALL Be Stable

SkillRunner sidebar task lists MUST preserve stable relative order independent of current focus window or task update churn.

#### Scenario: Task update does not reorder drawer rows

- **WHEN** a task receives a status or transcript update
- **THEN** its relative order within the current drawer section SHALL NOT change solely because `updatedAt` changed.

#### Scenario: Focus window changes do not reorder drawer rows

- **WHEN** the user changes the focused Zotero item or reader tab
- **THEN** matching tasks MAY change visual relation state
- **AND** task row order SHALL remain stable.

### Requirement: SkillRunner Sidebar SHALL Mark Waiting Tasks

SkillRunner sidebar task rows MUST visually mark `waiting_user` and `waiting_auth` tasks and emit deduped waiting toasts.

#### Scenario: Waiting task shows warning indicator

- **WHEN** a task status is `waiting_user` or `waiting_auth`
- **THEN** the task row SHALL display a warning LED.

#### Scenario: Waiting toast is deduped

- **WHEN** a task remains in the same waiting state across repeated snapshots
- **THEN** the sidebar SHALL NOT emit duplicate waiting toasts.
