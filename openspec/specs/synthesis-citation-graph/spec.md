## Purpose

Citation Graph stores graph structure, metrics, and Workbench layout as stale-tolerant sidecar cache projections built from active references and bindings.

## Requirements

### Requirement: Citation graph Workbench layout is stored in DB

The Synthesis repository SHALL store Workbench citation graph layout state in
SQLite as runtime state separate from graph structure and metrics.

#### Scenario: Layout state is created

- **WHEN** an explicit citation graph layout operation computes a layout for a bounded
  Workbench graph view and preset
- **THEN** the repository SHALL persist the layout coordinates, graph hash,
  status, diagnostics, and update timestamp
- **AND** later Workbench snapshots SHALL read that state from SQLite.

#### Scenario: Layout is stale

- **WHEN** the stored layout graph hash differs from the current DB graph hash
- **THEN** the snapshot SHALL report layout status `dirty`
- **AND** it MAY include the old coordinates for optimistic rendering.

#### Scenario: Layout operation runs without legacy projection

- **WHEN** SQLite citation graph rows exist
- **AND** legacy citation graph projection files are missing
- **THEN** the layout operation SHALL compute layout from SQLite graph rows
- **AND** it SHALL NOT require legacy graph index files.

### Requirement: Debug operation can run citation graph layout

The debug operation runner SHALL support running citation graph layout refresh.

#### Scenario: Debug citation graph layout operation is requested

- **WHEN** `debug.synthesis.worker.run` is called with
  `worker: "citationGraphLayout"`
- **THEN** the service SHALL run the DB-backed citation graph layout operation
- **AND** the result SHALL include before and after diagnostics showing layout
  state changes.
