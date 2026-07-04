## ADDED Requirements

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
