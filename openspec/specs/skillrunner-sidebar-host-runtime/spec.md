# skillrunner-sidebar-host-runtime Specification

## Purpose
TBD - created by archiving change unify-assistant-run-archive-governance. Update Purpose after archive.
## Requirements
### Requirement: SkillRunner run archive marker

SkillRunner SHALL support archiving terminal request ledger records without deleting persisted diagnostics or run history.

Archived SkillRunner ledger records SHALL be hidden from the default managed Runs drawer.

SkillRunner `Cancel Run` SHALL remain a non-terminal run lifecycle action and SHALL NOT be used to archive terminal runs.

#### Scenario: Terminal SkillRunner run is archived

- **Given** a SkillRunner ledger record has terminal status
- **When** the user activates the Archive item action for that run
- **Then** the ledger record is marked with `archivedAt`
- **And** the record no longer appears in the default SkillRunner Runs drawer
- **And** no backend cancel request is sent.

### Requirement: SkillRunner Details metadata boundary

SkillRunner Details SHALL show current run/task metadata and compact diagnostics summaries.

SkillRunner Details SHALL expose a `Copy ID` action for the current run when a request id is available.

SkillRunner Details SHALL NOT render full conversation history, full transcript message lists, or full raw envelope dumps in the visible drawer body.

Full SkillRunner diagnostics MAY remain available through diagnostic copy/export actions.

#### Scenario: SkillRunner Details omits full conversation history

- **Given** a SkillRunner run has many chat messages
- **When** the Details drawer is rendered
- **Then** the drawer shows run metadata and compact summaries
- **And** it does not render the full message list or full raw envelope dump.

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

### Requirement: Assistant Sidebar entry task attention

The Assistant Sidebar entry SHALL be the persistent UI surface for backend tasks that need user attention.

#### Scenario: Badge counts only human-attention tasks

- **GIVEN** active SkillRunner workflow tasks and ACP Skill runs exist
- **WHEN** only some are `waiting_user`, `waiting_auth`, or pending permission
- **THEN** the Assistant Sidebar entry badge SHALL count only those human-attention tasks
- **AND** ordinary running tasks SHALL NOT increase the badge count.

#### Scenario: Sidebar entry hosts active task popover

- **GIVEN** the Assistant Sidebar entry is mounted
- **WHEN** the user hovers the entry
- **THEN** the existing active task popover SHALL open from that entry
- **AND** the popover SHALL continue to list active task rows from the Dashboard active task read model.

#### Scenario: Workbench sidebar entry mirrors task attention

- **GIVEN** the user is in the Workbench tab and the Zotero library toolbar is not visible
- **WHEN** active tasks enter or leave `waiting_user`, `waiting_auth`, or pending permission
- **THEN** the Workbench header sidebar button SHALL update its attention badge from the same human-attention count as the toolbar sidebar button
- **AND** hovering the Workbench header sidebar button SHALL open the existing active task popover.

#### Scenario: Workbench button does not own task affordances

- **GIVEN** the Workbench toolbar button is mounted
- **WHEN** active or waiting tasks exist
- **THEN** the Workbench button SHALL NOT host the active task popover
- **AND** it SHALL NOT mirror the Assistant Sidebar attention badge.

#### Scenario: Side-pane buttons do not own task affordances

- **GIVEN** the Assistant side-pane buttons are mounted inside Zotero item or reader panes
- **WHEN** active or waiting tasks exist
- **THEN** those side-pane buttons SHALL NOT host the active task popover
- **AND** they SHALL NOT draw task attention badges.

### Requirement: SkillRunner run secondary labels SHALL be consistent

SkillRunner selected-run banners and run drawer task cards SHALL use the same secondary label rule.

#### Scenario: Single SkillRunner workflow shows current skill
- **WHEN** a single SkillRunner workflow run has `skillName`
- **THEN** the banner subtitle SHALL show `skillName`
- **AND** the task-card secondary line SHALL show the same value
- **AND** workflow label SHALL NOT replace the skill label for single runs

#### Scenario: SkillRunner sequence step shows step skill and workflow
- **WHEN** a SkillRunner sequence step has step index `0`, `skillName`, and `workflowLabel`
- **THEN** the banner subtitle SHALL show `1️⃣ <skillName>/<workflowLabel>`
- **AND** the task-card secondary line SHALL show the same value

### Requirement: Sidebar task attention uses lightweight scoped summaries

Sidebar task attention refreshes SHALL use lightweight scoped task summaries for
default badges and waiting-task toasts, including the Assistant Sidebar entry and
SkillRunner sidebar task attention surfaces.

#### Scenario: Sidebar badge refresh with many retained runs
- **GIVEN** many terminal SkillRunner runs are retained
- **WHEN** the Assistant Sidebar attention badge refreshes
- **THEN** the badge count SHALL be derived from active lightweight summaries
- **AND** full SkillRunner run payloads SHALL NOT be read.

### Requirement: Sidebar selected-run details read only selected scope

The sidebar SHALL read full run detail only for the selected request or active
run detail scope.

#### Scenario: Selected SkillRunner run opens
- **WHEN** the user opens a SkillRunner run in the sidebar
- **THEN** full run detail MAY be read for that selected request
- **AND** unrelated retained runs SHALL NOT be read as full payloads.

