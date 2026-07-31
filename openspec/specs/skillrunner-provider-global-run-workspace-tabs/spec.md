# skillrunner-provider-global-run-workspace-tabs Specification

## Purpose
TBD - created by archiving change skillrunner-provider-global-run-workspace-tabs. Update Purpose after archive.
## Requirements
### Requirement: SkillRunner run details SHALL be routed to a global singleton workspace
All “open run details” actions for SkillRunner tasks SHALL target one global run workspace hosted primarily inside the Zotero right sidebar shell.

#### Scenario: open when workspace is closed
- **WHEN** user opens run details for a SkillRunner task and the sidebar workspace is closed
- **THEN** the system SHALL open the SkillRunner sidebar workspace
- **AND** the workspace SHALL select and focus the target task session

#### Scenario: open when workspace is already open
- **WHEN** user opens run details for a SkillRunner task and the sidebar workspace is already open
- **THEN** the system SHALL focus the existing sidebar workspace host
- **AND** the workspace SHALL switch to the target task session
- **AND** the system SHALL NOT open another run-details window

#### Scenario: fallback when sidebar host is unavailable
- **WHEN** user opens run details for a SkillRunner task and the sidebar host cannot be initialized
- **THEN** the system SHALL fall back to the existing run-details dialog
- **AND** the fallback dialog SHALL select and focus the target task session

### Requirement: Run workspace left panel SHALL group tasks by backend profile
SkillRunner tasks SHALL be grouped by backend profile with collapsible group bubbles.

#### Scenario: non-terminal and terminal buckets
- **WHEN** workspace renders tasks for a backend profile
- **THEN** non-terminal tasks SHALL render directly in the profile bubble
- **AND** terminal tasks SHALL render inside a child bubble titled “已结束任务 / Completed Tasks”
- **AND** child bubble SHALL be collapsed by default

#### Scenario: task title fallback and no-requestId behavior
- **WHEN** task tab title is resolved
- **THEN** system SHALL use `taskName`, fallback to `workflowLabel`, then `requestId`
- **AND** tasks without requestId SHALL be visible but disabled with “等待 requestId / Waiting for requestId”

### Requirement: Workspace right panel SHALL preserve existing run-detail interaction model
The run workspace detail panel SHALL preserve the existing run-detail interaction model while operating inside the sidebar shell.

#### Scenario: selected task session actions
- **WHEN** user submits reply, cancel, or auth-import in the sidebar workspace detail panel
- **THEN** the action SHALL target the currently selected task session
- **AND** the action protocol SHALL remain compatible with the existing run-dialog host bridge contract

#### Scenario: close action restores native shell state
- **WHEN** user closes SkillRunner from the sidebar workspace global toolbar
- **THEN** the system SHALL close the sidebar workspace
- **AND** the system SHALL restore the native right-shell mode that was active before SkillRunner opened

### Requirement: Run workspace task navigation SHALL use sidebar-oriented task surfaces grouped by backend profile
SkillRunner tasks and Host-queued SkillRunner execution units SHALL be exposed
through sidebar-oriented navigation surfaces that fit a narrow right shell
while preserving backend grouping. Host-queued units are non-owner rows and
MUST NOT be inserted into the selectable SkillRunner run-session collection.

#### Scenario: running queued and completed task drawer sections
- **WHEN** the sidebar task drawer renders entries for a backend profile
- **THEN** running tasks SHALL appear in a `Running` section grouped by backend profile
- **AND** Host-queued units SHALL appear in a `Queued` section between `Running` and `Completed`, grouped by backend profile
- **AND** succeeded tasks SHALL appear in a `Completed` section grouped by backend profile
- **AND** all three sections SHALL be independently collapsible
- **AND** `Running` SHALL be expanded by default while `Queued` and `Completed` SHALL be collapsed by default
- **AND** the `Queued` section SHALL be hidden when empty
- **AND** section titles, queued state, and queue cancellation SHALL use the shared localized Assistant labels
- **AND** Running, Queued, and Completed SHALL use subtle theme-aware blue, amber, and neutral treatments respectively
- **AND** failed, canceled, disabled, or requestId-less provider placeholder tasks SHALL NOT appear in the sidebar task drawer

#### Scenario: queued backend groups collapse independently
- **WHEN** queued SkillRunner units exist for multiple backend profiles
- **THEN** the queued section SHALL expose one independently collapsible group per backend profile
- **AND** collapsing one group SHALL NOT change another group's state

#### Scenario: queued row is non-selectable
- **WHEN** the user clicks a queued SkillRunner row
- **THEN** the selected run session and foreground transcript owner SHALL remain unchanged
- **AND** the system SHALL NOT fabricate a requestId or disabled run placeholder

#### Scenario: queued row cancellation
- **WHEN** the user activates the queued row's Material icon-only cancel action while it remains pending
- **THEN** the Host SHALL remove the unit from the queue
- **AND** no SkillRunner cancellation request or archived run row SHALL be created

#### Scenario: current parent item shortcut strip
- **WHEN** the current library or reader context resolves a primary parent item
- **THEN** the workspace SHALL expose a top shortcut strip for running tasks related to that parent item
- **AND** each shortcut SHALL display only the workflow title
- **AND** Host-queued units SHALL NOT appear in the shortcut strip
- **AND** selecting a shortcut SHALL switch the global workspace to that task session

#### Scenario: task title fallback in sidebar navigation
- **WHEN** a sidebar task label is resolved
- **THEN** running and completed tasks SHALL use `taskName`, fallback to `workflowLabel`, then `requestId`
- **AND** Host-queued rows SHALL use their queue display `taskName` with the workflow label as fallback
- **AND** only provider tasks with requestId SHALL be selectable in sidebar navigation

### Requirement: SkillRunner unfinished rows SHALL expose submission identity

SkillRunner queued, running, waiting, and resumption-pending task rows owned by a Host submission SHALL use the shared submission-symbol presentation used by ACP Skills. The symbol SHALL precede the title, remain absent from the subtitle, expose equivalent tooltip and `aria-label` semantics, and disappear for terminal rows.

#### Scenario: SkillRunner submission spans task states

- **WHEN** tasks from one submission are queued, running, waiting, or resumption-pending
- **THEN** every unfinished row SHALL retain the same symbol
- **AND** its existing state text SHALL remain the sole task-state indicator

Invariant anchors:

- `INV-WS-HOST-QUEUED-SOURCE-ROWS`

