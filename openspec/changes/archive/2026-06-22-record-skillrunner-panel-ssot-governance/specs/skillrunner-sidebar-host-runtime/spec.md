## ADDED Requirements

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
