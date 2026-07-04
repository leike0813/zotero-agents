# assistant-workspace-ui-refresh-governance Specification

## Purpose
Governs how Assistant Workspace panels classify, coalesce, and publish UI refresh events to prevent high-frequency streaming updates from overwhelming the interface while preserving responsiveness for critical states and structural transcript events.
## Requirements
### Requirement: Assistant Workspace UI publish events are governed

Assistant Workspace panels SHALL classify runtime refreshes as `critical`,
`boundary`, `live`, or `background` before publishing UI snapshots.

`critical` and `boundary` events SHALL publish immediately. Text or thought
`live` transcript events SHALL publish naturally when streaming render is
enabled. Metadata `live` events SHALL publish at most once per shared live
cadence when streaming render is enabled. Text or thought `live` events SHALL
NOT publish transcript text when streaming render is disabled unless the panel
classifies a complete semantic message as a boundary. `background`
events SHALL update canonical state without publishing a visible snapshot.

#### Scenario: text live updates stream naturally

- **GIVEN** streaming render is enabled
- **WHEN** a running Assistant Workspace panel receives text or thought chunks
- **THEN** the UI-visible transcript advances with those chunks without waiting
  for the metadata live cadence
- **AND** canonical runtime state still records every update.

#### Scenario: metadata live updates are bounded

- **GIVEN** streaming render is enabled
- **WHEN** a running Assistant Workspace panel receives many metadata live
  updates
- **THEN** visible non-transcript panel snapshots are coalesced to the shared
  live cadence.

#### Scenario: disabled streaming render is boundary-only

- **GIVEN** streaming render is disabled
- **WHEN** a running Assistant Workspace panel receives live runtime updates
- **THEN** those updates do not publish UI snapshots
- **AND** the next critical or boundary event publishes the latest allowed view.

#### Scenario: panel-specific complete messages can be boundaries

- **GIVEN** streaming render is disabled
- **WHEN** a panel receives a complete semantic message rather than a partial
  text chunk
- **THEN** the panel MAY classify that complete message as a boundary
- **AND** publish the accumulated UI-visible transcript immediately.

#### Scenario: critical and boundary events publish immediately

- **WHEN** a runtime event is classified as `critical` or `boundary`
- **THEN** the panel SHALL publish the UI snapshot immediately
- **AND** SHALL NOT wait for the metadata live cadence or streaming render
  preference.

### Requirement: UI-visible transcript is separate from canonical transcript

Assistant Workspace panels SHALL publish transcript snapshots from a UI-visible
transcript view instead of exposing the canonical transcript directly during
live runs.

Metadata, diagnostics, backend health, usage, and session information updates
SHALL NOT expose unpublished partial text simply because the canonical
transcript has advanced.

Workspace activity, tool state changes, plan changes, output revision
projection, permission, waiting, and error events SHALL be treated as
structural transcript events. They SHALL update the UI-visible transcript
immediately without releasing unrelated unpublished streaming text.

#### Scenario: metadata does not leak partial text

- **GIVEN** streaming render is disabled
- **WHEN** a text chunk updates canonical transcript state
- **AND** a metadata update publishes panel state
- **THEN** the visible transcript does not show the partial text
- **AND** a later transcript boundary shows the complete text.

#### Scenario: structural transcript updates do not wait for metadata cadence

- **GIVEN** streaming render is disabled
- **WHEN** a text chunk updates canonical transcript state
- **AND** a workspace activity or tool completion event updates the transcript
- **THEN** the structural event appears immediately
- **AND** the unpublished partial text remains hidden until its text boundary.

#### Scenario: output revisions publish their projected message

- **WHEN** an Assistant Workspace runtime projects an invalid, pending, or final
  output revision into the transcript
- **THEN** the UI-visible transcript immediately reflects the projected
  assistant message and revision summary.

### Requirement: Transcript rendering is revision-gated

Assistant Workspace child panels SHALL render transcript content only when the
transcript render revision changes.

Toolbar, banner, details, drawer, reply, and selection updates SHALL NOT force
transcript rendering when the transcript view is unchanged.

#### Scenario: unrelated refresh skips transcript work

- **GIVEN** a child panel has rendered transcript revision `N`
- **WHEN** a subsequent snapshot updates only non-transcript panel data
- **THEN** the child panel does not invoke the transcript renderer
- **AND** the non-transcript regions still update normally.

### Requirement: Assistant Workspace refreshes SHALL target the single active shell

Assistant Workspace SHALL target the single live shell and current active pane
target when publishing snapshots, routing shell actions, routing child actions,
and binding the SkillRunner sidebar host. Assistant Workspace SHALL NOT treat a
message from any other source as an independent Assistant Workspace instance.

#### Scenario: Snapshot publishes to active shell only

- **WHEN** ACP Chat, ACP Skills, or SkillRunner state changes while the
  Assistant Workspace is open
- **THEN** the host publishes the resulting snapshot to the single live shell
  frame
- **AND** it does not publish another snapshot to an inactive library or reader
  shell copy.

#### Scenario: Child action uses active target

- **WHEN** the single Assistant Workspace shell emits a child panel action
- **THEN** the host routes the action using the shell's current active pane
  target
- **AND** it does not infer a separate target from a hidden duplicate shell.

#### Scenario: SkillRunner host binding follows shell docking

- **WHEN** the active Assistant Workspace target changes while the SkillRunner
  tab is active
- **THEN** the SkillRunner sidebar host binding is refreshed for the moved
  single shell frame
- **AND** no second SkillRunner child frame receives a sidebar host binding.

### Requirement: Single shell init SHALL flush after lifecycle convergence

Assistant Workspace SHALL treat shell load, shell ready, child ready, and
active target commit as independent lifecycle events. The host SHALL record
load/ready even when no active target is committed yet, and SHALL publish
`assistant-workspace:init` plus baseline ACP Chat and ACP Skills init snapshots
only after an active target exists and the shell is loaded or ready. The shell
SHALL re-announce already initialized child frames after receiving host init so
child ready messages that arrived before target commit are not lost.

#### Scenario: Ready before target commit still receives init snapshot

- **WHEN** the single shell reports ready before the host has committed the
  active target for a dock move
- **THEN** the host records the shell as ready
- **AND** it does not route arbitrary non-shell messages without a valid shell
  frame source
- **AND** after the target is committed, the host publishes shell init plus ACP
  Chat and ACP Skills baseline init snapshots to the single shell.

#### Scenario: Child ready before target commit is replayed

- **WHEN** ACP Chat or ACP Skills reports ready before the host has committed
  an active target
- **AND** the host later publishes `assistant-workspace:init`
- **THEN** the shell re-announces the initialized child frame as ready
- **AND** the host publishes that child's localized controls and current
  snapshot instead of leaving the static English HTML shell visible.

### Requirement: ACP Skills workspace refreshes are request scoped

Assistant Workspace SHALL use ACP Skills change descriptors to avoid rebuilding or posting ACP Skills snapshots for changes that are known to be unrelated to the selected ACP Skills run.

#### Scenario: Unrelated background transcript does not rebuild inactive ACP Skills panel

- **GIVEN** Assistant Workspace is open on a tab other than ACP Skills
- **WHEN** a non-selected ACP Skills run emits a transcript-only change descriptor
- **THEN** the workspace host SHALL NOT rebuild or post an ACP Skills panel snapshot for that change
- **AND** toast and attention indicator work SHALL also be skipped when the descriptor is known to be transcript-only.

#### Scenario: Selected transcript change refreshes active ACP Skills panel

- **GIVEN** Assistant Workspace is open on the ACP Skills tab
- **AND** request `A` is the selected ACP Skills run
- **WHEN** request `A` emits a transcript or runtime-options change descriptor
- **THEN** the workspace host SHALL refresh the ACP Skills panel snapshot.

#### Scenario: Unknown changes remain conservative

- **WHEN** an ACP Skills store change has no descriptor or is marked global
- **THEN** the workspace host SHALL use the existing conservative refresh behavior.

### Requirement: ACP Skills snapshots are signature guarded

Assistant Workspace SHALL avoid posting ACP Skills child snapshots when the bounded snapshot content is unchanged.

#### Scenario: Repeated unchanged snapshot is skipped

- **GIVEN** the host has posted an ACP Skills snapshot with signature `S`
- **WHEN** a later ordinary store-change refresh produces the same signature `S`
- **THEN** the host SHALL skip posting that child snapshot.

#### Scenario: Init and user actions force snapshot delivery

- **WHEN** ACP Skills is initialized, activated by tab selection, or refreshed after a user child action
- **THEN** the host SHALL deliver the ACP Skills snapshot even if its content signature matches the previous snapshot.

### Requirement: Child transcript rendering ignores stale same-context revisions

Assistant Workspace child transcript renderers SHALL treat transcript revisions
as monotonic within a single conversation or run context. After rendering
revision `N`, a later snapshot for the same context with revision lower than
`N` SHALL NOT repaint the transcript or replace newer child transcript state.

Loading and failed transcript states for the current context SHALL remain
renderable even when the last rendered content revision is newer.

#### Scenario: Stale same-context transcript snapshot is ignored

- **GIVEN** an Assistant Workspace child panel has rendered transcript revision
  `5` for context `A`
- **WHEN** it later receives a transcript snapshot for context `A` with revision
  `4`
- **THEN** it SHALL NOT invoke the transcript renderer for that stale snapshot
- **AND** it SHALL keep the revision `5` transcript state.

#### Scenario: Context switch resets revision guard

- **GIVEN** an Assistant Workspace child panel has rendered transcript revision
  `5` for context `A`
- **WHEN** the selected conversation or run changes to context `B`
- **AND** context `B` receives transcript revision `1`
- **THEN** the panel SHALL render context `B` revision `1`.

#### Scenario: ACP Skills equal-revision history page is accepted

- **GIVEN** the ACP Skills panel has rendered revision `5` for run `R`
- **WHEN** it receives another transcript page for run `R` with revision `5`
  and a different cursor
- **THEN** it SHALL allow that page to merge into the child page cache
- **AND** it MAY repaint if the virtual window or display-mode signature changes.

### Requirement: ACP Skills transcript SHALL be request-scoped

ACP Skills transcript rendering SHALL keep transcript render state scoped by
request id. Switching selected runs SHALL save the previous request's
transcript page/render state inside the shared transcript renderer and restore
the new request's cached state when available; otherwise the panel SHALL request
the new request's transcript page through the shared renderer. Building a panel
snapshot for a requested run SHALL NOT mutate the globally selected request;
global selection SHALL only change through explicit selection actions. Late
transcript page requests for a run that is no longer selected SHALL be ignored
instead of publishing a stale ACP Skills snapshot.

#### Scenario: Switching concurrent ACP Skills runs does not reuse transcript DOM

- **WHEN** multiple ACP Skills runs are active
- **AND** the user selects a different run while the host snapshot is still
  catching up
- **THEN** the ACP Skills panel keeps the pending request id separate from the
  previous selected run
- **AND** it does not render the previous run's transcript as the pending run
- **AND** it restores the pending request's cached transcript state when
  available
- **AND** it requests the pending request's transcript page when no cached state
  is available.

#### Scenario: Late old-run page request is ignored

- **GIVEN** the ACP Skills panel selected run changes from run A to run B
- **WHEN** a delayed transcript page request for run A reaches the host
- **THEN** the host SHALL NOT publish a forced ACP Skills snapshot for run A
- **AND** a page request for the currently selected run B SHALL still publish a
  snapshot.
