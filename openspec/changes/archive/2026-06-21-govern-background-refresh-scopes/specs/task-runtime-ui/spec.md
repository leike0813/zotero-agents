## ADDED Requirements

### Requirement: Dashboard background refreshes use scoped read models

Dashboard periodic refreshes SHALL preserve the scheduler tick but SHALL NOT
perform unscoped full task, run, log, product, or history reads from the tick.

#### Scenario: Dashboard home periodic refresh
- **WHEN** the dashboard home surface receives a periodic refresh tick
- **THEN** it SHALL refresh using active lightweight task summaries and current
  visible workflow metadata only
- **AND** it SHALL NOT read full SkillRunner run payloads.

#### Scenario: Dashboard backend tab periodic refresh
- **WHEN** a backend tab is active and visible
- **THEN** periodic refresh MAY read rows scoped to that backend
- **AND** it SHALL NOT read unrelated backend runs or full unscoped history.

### Requirement: Task popover reads only visible active rows

The active task popover SHALL read task data only while open and SHALL request no
more than the visible active row limit.

#### Scenario: Popover opens
- **WHEN** the user opens the active task popover
- **THEN** it SHALL read active lightweight task rows up to the visible row limit
- **AND** it SHALL stop refreshing when the popover closes.

### Requirement: Workspace shell counts use active summaries

Workspace shell waiting counts SHALL be computed from active lightweight
summaries and permission summaries.

#### Scenario: Workspace snapshot posts waiting count
- **WHEN** the workspace shell posts a snapshot for its header badge
- **THEN** it SHALL compute the waiting count without reading full SkillRunner
  run payloads or ACP transcripts.
