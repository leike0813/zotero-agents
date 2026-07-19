## Purpose

Plugin UI rendering should update live status without disrupting active user interaction state.

## Requirements

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

### Requirement: WebGL graph surfaces preserve renderer identity across routine UI updates

Plugin graph surfaces SHALL treat the renderer, canvas layers, and WebGL contexts as persistent surface-owned resources rather than disposable output of routine shell rendering.

#### Scenario: Graph-local or shell chrome changes

- **WHEN** selection, search, drawers, status, sidebar state, localization, or an equivalent graph snapshot changes without replacing the Workbench document
- **THEN** the surface SHALL preserve its renderer, canvas elements, WebGL contexts, and camera
- **AND** it SHALL NOT call a renderer teardown path that explicitly loses WebGL contexts.

#### Scenario: User switches away from and back to Graph

- **WHEN** the user selects another Workbench tab and later returns to Graph
- **THEN** the existing Graph surface and renderer SHALL be reused
- **AND** temporary invisibility SHALL NOT resize the renderer to a degenerate framebuffer or destroy its contexts.

#### Scenario: Graph model changes

- **WHEN** visible graph topology, layout coordinates, or renderer-relevant attributes change
- **THEN** the existing renderer SHALL receive the replacement graph model in place
- **AND** unrelated shell and interaction state SHALL NOT recreate the renderer.

#### Scenario: Host layout changes graph dimensions

- **WHEN** host UI changes such as a sidebar resize the graph container repeatedly
- **THEN** plugin-owned resize work SHALL be cancellable and coalesced
- **AND** hidden graph surfaces SHALL defer resize work until they are visible again.
