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

### Requirement: SkillRunner sidebar panel SHALL use one bounded foreground snapshot

The SkillRunner sidebar panel SHALL build its foreground task list from one
bounded snapshot model instead of stitching together independent active,
completed-window, selected-request, drawer, or preserved-selected read paths.

The foreground snapshot MAY read recent lightweight SkillRunner history
projections, but it SHALL NOT read full run payloads for unselected completed
runs.

#### Scenario: Initial SkillRunner sidebar open shows recent completed runs

- **GIVEN** retained completed SkillRunner runs exist
- **WHEN** the user opens the SkillRunner sidebar panel
- **THEN** the panel SHALL show recent completed runs from the bounded
  lightweight projection window
- **AND** completed runs SHALL NOT depend on opening or expanding the drawer.

#### Scenario: Selected run outside the recent window is exact-supplemented

- **GIVEN** a completed SkillRunner request is older than the bounded recent
  panel window
- **WHEN** the user opens that request from Dashboard
- **THEN** the panel SHALL read that selected request's lightweight projection
  exactly
- **AND** the selected row SHALL be inserted into the panel model
- **AND** full run detail MAY be read only for that selected request.

### Requirement: SkillRunner sidebar rows SHALL use canonical request identity

SkillRunner sidebar panel rows SHALL be de-duplicated by canonical identity,
preferring `backendId + requestId`, then `backendId + localRunId`, then
`backendId + taskId`.

When a request id becomes available for a local/pre-request run, the request row
SHALL replace the matching local row rather than coexist with it.

#### Scenario: Request-ready migration does not create duplicate rows

- **GIVEN** a SkillRunner run appears first as a local pre-request row
- **WHEN** the backend returns a request id for the same local run identity
- **THEN** the sidebar model SHALL contain one canonical request row
- **AND** the old local running row SHALL NOT remain visible.

#### Scenario: Terminal transition clears stale running state

- **GIVEN** a SkillRunner request is visible as running in the sidebar
- **WHEN** the request becomes terminal
- **THEN** the sidebar model SHALL show the run as completed
- **AND** the active task index SHALL NOT keep a stale running row.

### Requirement: SkillRunner sidebar presentation actions SHALL be fast

SkillRunner sidebar presentation actions SHALL update presentation state without
rebuilding the full workspace model or triggering history reads, including
drawer open, drawer close, and completed-section collapse.

#### Scenario: Drawer actions do not reload history

- **WHEN** the user opens, closes, or collapses the SkillRunner drawer
- **THEN** the host SHALL push an updated presentation snapshot
- **AND** the action SHALL NOT invoke a completed-history load path.

### Requirement: SkillRunner sidebar entrypoints SHALL attach to one active host

SkillRunner toolbar, side-pane, and Dashboard-jump entrypoints SHALL converge on
the active Assistant workspace SkillRunner tab and host.

#### Scenario: Toolbar switches an open Assistant sidebar to SkillRunner

- **GIVEN** the Assistant sidebar is already open on ACP Chat or ACP Skills
- **WHEN** the user invokes the SkillRunner toolbar toggle
- **THEN** the sidebar SHALL switch to the SkillRunner tab
- **AND** it SHALL NOT close the sidebar.

#### Scenario: Target switch detaches the old SkillRunner frame

- **GIVEN** a SkillRunner sidebar host is attached to the library or reader pane
- **WHEN** the active sidebar target switches to the other pane
- **THEN** the old SkillRunner frame SHALL be detached before the new pane is
  attached.

### Requirement: SkillRunner sidebar refreshes use Assistant Workspace publish governance

SkillRunner sidebar snapshots SHALL use the global `live`, `boundary`, or `silent` Assistant Workspace policy. Canonical run state, foreground SSE, HTTP history catch-up, pending/auth refresh, interaction, permission, terminal handling, and semantic message counting SHALL remain active in every mode.

SkillRunner SHALL keep canonical backend history separate from its UI-visible publication mirror. When a selected run starts with local pre-request notices and later receives backend history, the next eligible snapshot SHALL publish that history with a new transcript revision. A critical refresh SHALL NOT leave the live-mode mirror pinned to local notices. HTTP history and SSE entries SHALL use the same normalized semantic-boundary classifier.

SkillRunner SHALL normalize Assistant replacement identity and Thought/Tool process identity before counting. Assistant final promotion SHALL not double-count an intermediate message. Each reasoning segment and new tool/command call SHALL count once, while updates for the same stable identity SHALL not increment. Silent process entries SHALL remain absent from the visible transcript while their counts advance.

#### Scenario: live text advances naturally

- **GIVEN** mode is `live`
- **WHEN** SkillRunner receives assistant or process text
- **THEN** the visible transcript advances without waiting for metadata cadence
- **AND** semantic category counts advance.

#### Scenario: critical history catch-up replaces local-only mirror

- **GIVEN** mode is `live`
- **AND** a selected SkillRunner run has published only local pre-request notices
- **WHEN** a critical refresh catches up backend history for the same owner
- **THEN** the first snapshot reflecting the new semantic counts SHALL include the eligible backend messages
- **AND** its transcript revision SHALL be newer than the local-only snapshot.

#### Scenario: boundary history uses SSE semantic classification

- **GIVEN** mode is `boundary`
- **AND** a selected SkillRunner run has unpublished backend history
- **WHEN** a history batch contains an entry classified as a semantic boundary by the SSE boundary rule
- **THEN** the accumulated eligible history SHALL publish once with a new transcript revision.

#### Scenario: boundary behavior remains unchanged

- **GIVEN** mode is `boundary`
- **WHEN** SkillRunner receives complete message, thought, and tool process entries
- **THEN** complete messages and non-tool thoughts publish at their existing boundaries
- **AND** tool processes wait for the existing eligible boundary.

#### Scenario: silent process is counted but suppressed

- **GIVEN** mode is `silent`
- **WHEN** SkillRunner receives reasoning, tool, command, and intermediate assistant entries
- **THEN** process entries remain absent from the visible transcript
- **AND** Assistant, Thought, and Tool counts advance by normalized semantic identity.

#### Scenario: final promotes intermediate identity

- **GIVEN** an intermediate Assistant message has been counted
- **WHEN** an `assistant_final` replaces the same message family or id
- **THEN** the final appears according to the display policy
- **AND** the Assistant count does not increment again.

#### Scenario: terminal and restart retain counts

- **WHEN** a run becomes terminal and is later reopened
- **THEN** its last current and cumulative category values are restored
- **AND** foreground observation and critical-state behavior remain unchanged.

### Requirement: SkillRunner waiting-user replies are canonical and interaction-id-bound

The SkillRunner host runtime SHALL route Assistant waiting-user actions through the current selected run and preserve the backend-native numeric interaction id required by the SkillRunner API. The Assistant DTO and child action SHALL NOT expose a duplicate interaction token.

#### Scenario: Current quick reply is submitted

- **WHEN** the user submits text or a typed option for the selected waiting run
- **THEN** the host SHALL read the current pending `interactionId`
- **AND** submit that id and the canonical response to the backend.

#### Scenario: File interaction changes during selection

- **WHEN** the native picker completes after the current pending interaction id or waiting state changed
- **THEN** the host SHALL not upload the selected files
- **AND** the Assistant child SHALL not need to echo an interaction token.

### Requirement: SkillRunner file replies are capability-gated

The plugin SHALL treat file reply as unsupported unless handshake capability `skillrunner.interaction-files.v1` is present. It SHALL retain a text composer and show a localized unsupported state when disabled. When enabled, it SHALL enforce the lower of plugin and advertised limits and submit multipart metadata and repeated file parts through the management client.

#### Scenario: Existing backend requests files

- **WHEN** the handshake omits the file-reply capability
- **THEN** the Assistant SHALL display the requested slots and unsupported status
- **AND** SHALL NOT issue a multipart request

#### Scenario: Capable backend accepts files

- **WHEN** the capability is present and selected files fit effective limits
- **THEN** the client SHALL POST to `/v1/jobs/{requestId}/interaction/reply/files`
- **AND** metadata SHALL bind interaction id, idempotency key, slots, and file indexes
- **AND** the multipart body SHALL carry repeated `files` parts

### Requirement: Run-workspace snapshot boundary is verified behaviorally

The SkillRunner run-workspace snapshot contract SHALL be verified by tests
that capture a production `RunWorkspaceSnapshot` through the real host
assembly (`attachSkillRunnerSidebarHost` with an injected `publishSnapshot`)
and consume it through the real receiver projection
(`projectSkillRunnerPanelSnapshot`), rather than by matching source-file
text. Receiver field consumption SHALL be recorded with a recursive Proxy:
consuming a field the producer never sends SHALL fail; every curated critical
field SHALL be consumed; produced-but-unconsumed fields SHALL be reported
without failing.

#### Scenario: Phantom receiver read

- **WHEN** the receiver projection reads a snapshot field path that the
  production snapshot never provides
- **THEN** the contract test SHALL fail naming the missing path.

#### Scenario: Lifecycle snapshot semantics

- **WHEN** waiting-user, terminal, pending-interaction, and pending-auth runs
  are seeded
- **THEN** the production snapshot SHALL expose the matching status
  semantics, reply/cancel capabilities, pending interaction pass-through, and
  auth pass-through, and the receiver projection SHALL render them without
  throwing.

#### Scenario: Dialog scaffold linkage

- **WHEN** the run dialog HTML changes
- **THEN** every mount point the renderer or dialog script looks up SHALL
  exist in the document, and shared assistant panel assets SHALL remain
  referenced.

### Requirement: Run-workspace snapshots are schema-versioned and validated

Every run-workspace snapshot SHALL carry
`schema: "zotero-agents.skillrunner-workspace-snapshot.v1"` from the single
production builder. The receiver SHALL validate each inbound snapshot through
the shared `validate` implementation in
`src/shared/skillRunnerSnapshotContract.ts` before rendering and SHALL drop
and trace invalid payloads. Validation SHALL cover schema equality, required
structural keys (including the own `session` key), per-level known-key
whitelists rejecting unknown fields, and L2 type spot checks; decorated
fields (hostMode, badges, sidebar, renderHints) SHALL remain optional.

#### Scenario: Snapshot without an own session key arrives

- **WHEN** an inbound snapshot lacks the own `session` key
- **THEN** the receiver SHALL drop and trace it
- **AND** the panel model's envelope-as-session sniffing fallback SHALL NOT
  be reached.

#### Scenario: Producer emits a malformed snapshot in a debug build

- **WHEN** the debug-gated producer self-check is enabled and the built
  snapshot violates the v1 contract
- **THEN** the host SHALL throw before delivery.

#### Scenario: Both sides validate identically

- **WHEN** the TS assert and the receiver gate evaluate the same payload
- **THEN** they SHALL accept or reject identically, because both call the
  same shared validate implementation.

### Requirement: Temporary SkillRunner host detach MUST preserve transcript publication continuity
The SkillRunner host runtime MUST distinguish temporary host detachment from complete runtime teardown. Temporary detachment MUST preserve the owner transcript revision and published transcript cache, while complete runtime teardown MUST clear them.

#### Scenario: Same owner reattaches after backend history advances
- **WHEN** a selected SkillRunner owner publishes revision N, its host temporarily detaches, backend history advances, and the same runtime reattaches to the retained consumer
- **THEN** the reattached publication revision is not lower than N
- **AND** the first eligible transcript update advances the revision and displays the new history without another owner switch.

#### Scenario: Runtime is completely destroyed
- **WHEN** plugin shutdown, test reset, or standalone dialog destruction performs complete runtime teardown
- **THEN** the runtime clears its transcript publication clock and published transcript cache.
