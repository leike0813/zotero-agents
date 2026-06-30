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
