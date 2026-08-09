# acp-skillrunner-result-apply-and-run-panel Specification

## Purpose
TBD - created by archiving change fix-acp-skillrunner-result-apply-and-run-panel. Update Purpose after archive.
## Requirements
### Requirement: ACP SkillRunner-compatible result context

ACP SkillRunner-compatible provider results SHALL expose validated result JSON and local path hints for `WorkflowResultContext`.

#### Scenario: Literature digest artifacts are resolved through result context

Given an ACP skill run produced a valid `result/result.json`
And the result references digest, references, and citation analysis artifacts
When the provider returns a successful result
Then `fetchType` SHALL be `result`
And `responseJson.resultResolution` SHALL be `workflow-result-context`
And the workflow SHALL read referenced artifacts through `WorkflowResultContext`.

### Requirement: ACP skill run conversation panel

ACP skill run UI SHALL present the selected run as an agent run transcript panel with a task drawer for switching runs.

#### Scenario: ACP session updates become run transcript

Given an ACP SkillRunner-compatible run receives ACP session updates
When agent message, thought, tool call, plan, or usage updates arrive
Then the run store SHALL persist them as run-local transcript state
And it SHALL NOT write them into the normal ACP chat conversation store.

#### Scenario: Details are secondary

Given an ACP skill run is selected
When the panel is rendered
Then the main surface SHALL show the run transcript, plan panel, permission state, running state, and final state
And workspace, skill roots, validation, logs, and result JSON SHALL be shown only in a secondary details drawer.

### Requirement: ACP backend workflow task management

ACP backend dashboard tabs SHALL render `skillrunner.job.v1` workflow runs as task-management rows, not as generic HTTP log-inspection views.

#### Scenario: ACP backend tab opens a workflow run

Given an ACP backend has `skillrunner.job.v1` runs
When the dashboard backend tab is rendered
Then the tab SHALL show task-management rows with workflow, task, status, requestId, update time, and actions
And opening a row SHALL route to the ACP skill run panel for that requestId.

#### Scenario: Queued row admission races with Dashboard cancellation

- **WHEN** the row has already been admitted before Dashboard handles its cancel action
- **THEN** the Dashboard SHALL refresh the queue projection
- **AND** it SHALL NOT issue ACP backend cancellation on behalf of that stale queued action

### Requirement: ACP Skills task drawer SHALL expose Host-queued units as non-owner rows

The ACP Skills task drawer MUST render collapsible `Running`, `Queued`, and
`Completed` sections using one shared presentation contract. `Running` MUST be
expanded by default; `Queued` and `Completed` MUST be collapsed by default.
The `Queued` section MUST be hidden when empty, grouped by backend profile with
independently collapsible backend groups, and populated from the Host queue
read model rather than ACP task or transcript state.

#### Scenario: ACP queued units exist

- **WHEN** the ACP Skills drawer snapshot contains Host-queued units
- **THEN** the drawer SHALL render `Running`, `Queued`, and `Completed` in that order
- **AND** all three section headers SHALL toggle only their own local collapse state
- **AND** queued rows SHALL be grouped under their backend profiles
- **AND** the queued section SHALL be collapsed by default while its backend groups retain independent state
- **AND** the section titles, queued state, and cancel action SHALL use localized shared labels
- **AND** Running, Queued, and Completed SHALL use subtle theme-aware blue, amber, and neutral treatments respectively

#### Scenario: ACP queue is empty

- **WHEN** no ACP Host-queued units exist
- **THEN** the ACP Skills drawer SHALL omit the entire queued section

#### Scenario: User clicks an ACP queued row

- **WHEN** the user clicks the queued row body
- **THEN** the selected ACP run owner SHALL remain unchanged
- **AND** no transcript, details drawer, or foreground task SHALL be opened

#### Scenario: User cancels an ACP queued row

- **WHEN** the user activates the row's Material icon-only cancel action while the unit remains pending
- **THEN** the Host SHALL remove that unit from the queue
- **AND** the row SHALL disappear without creating an ACP task or archived history row

### Requirement: ACP backend Dashboard tabs SHALL expose cancellable queued rows

ACP backend-specific Dashboard views MUST merge Host-queued units into their
task table projection without representing them as ACP backend tasks. A queued
row MUST be visibly non-running, MUST have no open-details behavior, and MUST
offer the same pending-only cancel action as the task drawer.

#### Scenario: ACP backend tab is visible

- **WHEN** the selected Dashboard backend has Host-queued ACP units
- **THEN** those units SHALL appear in that backend's task list
- **AND** they SHALL NOT contribute a backend requestId, transcript link, or backend status action

#### Scenario: Queued row admission races with Dashboard cancellation

- **WHEN** the row has already been admitted before Dashboard handles its cancel action
- **THEN** the Dashboard SHALL refresh the queue projection
- **AND** it SHALL NOT issue ACP backend cancellation on behalf of that stale queued action

### Requirement: Queue-only updates SHALL be isolated to task-drawer managed regions

ACP Skills and SkillRunner queue subscription events MUST update only the task
drawer region whose visible queue projection changed. Queue revisions, queue
counts, FIFO positions, or cancellation state MUST NOT enter transcript,
toolbar, banner, plan, hint, reply, context drawer, details drawer, permission
drawer, or whole-runner render signatures.

#### Scenario: Background queued unit is added

- **WHEN** a Host-queued unit is added for a backend represented in the task drawer
- **THEN** the affected drawer section SHALL update
- **AND** existing transcript and non-drawer managed-region DOM identities SHALL remain unchanged

#### Scenario: Queued unit is canceled

- **WHEN** a queued row disappears after cancellation
- **THEN** only the affected queued backend group and necessary parent drawer signatures SHALL change
- **AND** the selected run owner and transcript window SHALL remain unchanged

#### Scenario: Queue changes for an unchanged drawer group

- **WHEN** a queue notification does not alter a rendered drawer group's visible content
- **THEN** that group's signature guard SHALL suppress DOM clear or rebuild

### Requirement: Task-section collapse state SHALL have a drawer-owned signature

The Running, Queued, and Completed sections and their backend groups MUST
preserve collapse state through unrelated transcript, run-status, and queue
updates. Their signatures MUST contain only the user-visible rows and
drawer-owned open/collapsed state.

#### Scenario: Transcript streams while queued section is collapsed

- **WHEN** transcript-only updates arrive while the user has collapsed a queued section or backend group
- **THEN** the collapse state and drawer DOM identity SHALL remain stable

#### Scenario: User collapses a running or completed section

- **WHEN** the user toggles the Running or Completed section header
- **THEN** only that section's drawer-owned collapse state SHALL change
- **AND** transcript and non-drawer managed-region DOM identities SHALL remain stable

#### Scenario: A row is added to an expanded backend group

- **WHEN** a queued row is added to an expanded backend group
- **THEN** the group SHALL remain expanded
- **AND** unrelated backend groups SHALL retain their DOM identity

### Requirement: Dashboard queued entries SHALL be backend-tab-only

Host-queued units MUST be visible only in the matching ACP Skills or SkillRunner
backend tab. They MUST NOT appear on Dashboard Home, in Home task counts or
summary cards, in active-task popovers, or in completed/history projections.

#### Scenario: Dashboard Home is rendered with pending units

- **WHEN** one or more Host-queued units exist
- **THEN** Dashboard Home task lists, counts, and summary cards SHALL ignore them
- **AND** Home SHALL continue to reflect only its existing provider-task sources

#### Scenario: Active-task popover is opened

- **WHEN** Host-queued units exist and the user opens the Dashboard active-task popover
- **THEN** the popover SHALL not list or count those units

#### Scenario: Matching backend tab is opened

- **WHEN** the user opens the ACP Skills or SkillRunner backend tab that owns queued units
- **THEN** the tab SHALL display those units alongside its provider-task projection with an explicit queued presentation
- **AND** queued rows SHALL remain distinguishable from backend `queued` or `running` states

### Requirement: Dashboard queued actions SHALL remain Host-local

A Dashboard queued row MUST provide a Material icon-only pending-cancel action
and MUST NOT provide open-details, archive, provider retry, or provider cancel
actions. Successful cancellation MUST remove the row and contribute a skipped
outcome to its originating workflow submission.

#### Scenario: User clicks a queued row body

- **WHEN** the user clicks a Host-queued Dashboard row outside its cancel action
- **THEN** no task details, transcript, or foreground workspace SHALL open

#### Scenario: User cancels a queued row

- **WHEN** the Host confirms that the row is still pending
- **THEN** the unit SHALL be removed from the backend-tab projection
- **AND** no backend API SHALL be called
- **AND** no completed or archived Dashboard row SHALL be created

### Requirement: Dashboard queue refresh SHALL be subscription-driven and scoped

Dashboard backend-tab queue projections MUST refresh from Host queue change
subscriptions. A queue-only event MUST NOT force Dashboard Home or an unrelated
backend tab to rebuild.

#### Scenario: Visible backend queue changes

- **WHEN** a queued unit changes for the currently visible backend tab
- **THEN** that backend's queue projection SHALL refresh without polling

#### Scenario: Hidden backend queue changes

- **WHEN** a queued unit changes for a backend other than the currently visible tab
- **THEN** Dashboard SHALL update the stored backend snapshot or dirty marker
- **AND** it SHALL NOT rebuild the visible unrelated tab

### Requirement: ACP Skills unfinished rows SHALL expose submission identity

ACP Skills queued, running, waiting, and resumption-pending task rows owned by a Host submission SHALL display that submission's stable symbol immediately before the task title. Terminal rows SHALL omit it. The symbol SHALL have a localized tooltip and equivalent `aria-label` containing the symbol, frozen provider, and frozen model, while the subtitle SHALL retain only its existing skill/workflow and sequence semantics.

#### Scenario: Related ACP tasks share lineage

- **WHEN** unfinished ACP task rows belong to the same submission
- **THEN** they SHALL display the same symbol and frozen tooltip metadata
- **AND** a row from a different submission SHALL display a different symbol

#### Scenario: ACP task completes

- **WHEN** an ACP task becomes terminal
- **THEN** its row SHALL no longer display a submission symbol

### Requirement: Submission decoration SHALL be task-row scoped

Submission symbol, tooltip, provider/model display metadata, and resumption-pending state SHALL enter only the affected task row and necessary task-drawer parent signatures. They MUST NOT enter transcript, toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, or whole-runner signatures.

#### Scenario: Submission decoration changes

- **WHEN** an unfinished row gains or changes resumption-pending or submission display fields
- **THEN** the affected drawer row SHALL update
- **AND** transcript, Runner pane, and every non-drawer managed region SHALL retain DOM identity

