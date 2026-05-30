## ADDED Requirements

### Requirement: Live UI updates preserve interaction state

Live plugin UI surfaces SHALL separate content updates from chrome/status
updates so background activity does not reset user interaction state.

#### Scenario: Chrome-only update arrives

- **WHEN** a live UI surface receives an update that changes only progress,
  action status, warning, heartbeat, or task chrome
- **THEN** it SHALL update only the affected chrome/status region
- **AND** it SHALL NOT rebuild the active content pane.

#### Scenario: Content update requires a render

- **WHEN** a live UI surface receives data that changes the active content pane
- **THEN** it MAY re-render that pane
- **AND** it SHALL preserve stable transient state such as scroll, focus,
  selection, expanded details, drawer state, and graph camera where applicable.

#### Scenario: Graph or canvas data is unchanged

- **WHEN** graph/canvas content data has not changed
- **THEN** status or progress updates SHALL NOT destroy and recreate the graph
  renderer or reset its camera.

