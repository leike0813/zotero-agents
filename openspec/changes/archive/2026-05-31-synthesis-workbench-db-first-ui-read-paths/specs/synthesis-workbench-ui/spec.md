## MODIFIED Requirements

### Requirement: Workbench UI reads live Synthesis state from SQLite

The Synthesis Workbench SHALL build its normal UI read model from
SQLite-backed repository/runtime state only.

#### Scenario: Legacy files exist with empty DB

- **WHEN** legacy `data/synthesis` JSON, canonical projection files, or old
  task rows exist
- **AND** the SQLite Synthesis repository has no corresponding live rows
- **THEN** Workbench Home, Topics, Cleanup, Deleted Artifacts, Graph, topic
  options, and background jobs SHALL render the DB-empty state
- **AND** those legacy files SHALL NOT inject UI rows or task status.

#### Scenario: DB rows conflict with legacy files

- **WHEN** SQLite state and legacy files contain different Synthesis data
- **THEN** the Workbench UI SHALL display only the SQLite-backed rows
- **AND** legacy rows SHALL be ignored for normal UI rendering.

### Requirement: Graph tab renders DB graph structure while layout refreshes

The Graph tab SHALL treat DB citation graph structure as the source of graph
availability and layout state as a presentation cache.

#### Scenario: DB graph structure is missing

- **WHEN** the SQLite citation graph has no nodes and no edges
- **THEN** the Graph tab SHALL show an empty graph state
- **AND** it MAY offer a build/rebuild action.

#### Scenario: DB graph exists but layout is missing

- **WHEN** the SQLite citation graph has visible graph rows
- **AND** no current layout is available
- **THEN** the Graph tab SHALL show a drawing or refreshing state
- **AND** the Workbench host SHALL trigger citation graph layout refresh.

#### Scenario: DB graph exists with stale layout

- **WHEN** the SQLite citation graph has visible graph rows
- **AND** an older DB layout is available but does not match the current graph
  hash
- **THEN** the Graph tab SHALL render available coordinates when possible
- **AND** it SHALL show a refreshing/stale layout state until a current layout
  is ready.

#### Scenario: DB layout is ready

- **WHEN** the DB layout state is ready for the current graph view, preset, and
  graph hash
- **THEN** the Graph tab SHALL render the graph with layout coordinates.
