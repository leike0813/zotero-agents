# synthesis-citation-graph Delta

## MODIFIED Requirements

### Requirement: Citation graph Workbench layout is stored in DB

The Synthesis repository SHALL store Workbench citation graph layout state in
SQLite as runtime state separate from graph structure and metrics.

#### Scenario: Layout state is created

- **WHEN** an explicit citation graph layout operation computes a layout for a
  bounded Workbench graph view and algorithm
- **THEN** the repository SHALL persist the layout coordinates, graph hash,
  algorithm key, status, diagnostics, and update timestamp
- **AND** later Workbench snapshots SHALL read that state from SQLite.

#### Scenario: Layout is stale

- **WHEN** the stored layout graph hash differs from the current DB graph hash
  or the stored layout version is older than the current layout version
- **THEN** the snapshot SHALL report layout status `stale`
- **AND** it MAY include the old coordinates for optimistic rendering.

#### Scenario: Layout operation runs without legacy projection

- **WHEN** SQLite citation graph rows exist
- **AND** legacy citation graph projection files are missing
- **THEN** the layout operation SHALL compute layout from SQLite graph rows
- **AND** it SHALL NOT require legacy graph index files.

## ADDED Requirements

### Requirement: Citation graph supports multiple layout algorithms

The Citation Graph layout operation SHALL support a default force layout and
lightweight deterministic alternatives.

#### Scenario: Force layout is requested

- **WHEN** the layout algorithm is `force`
- **THEN** the service SHALL compute one d3-force layout using the default force
  parameters
- **AND** it SHALL NOT compute compact, balanced, or expanded force variants.

#### Scenario: Radial layout is requested

- **WHEN** the layout algorithm is `radial`
- **THEN** the service SHALL compute deterministic coordinates without force
  iterations
- **AND** library nodes SHALL be ordered by citation importance with higher
  incoming citation nodes closer to the center.

#### Scenario: Components layout is requested

- **WHEN** the layout algorithm is `components`
- **THEN** the service SHALL compute deterministic coordinates without force
  iterations
- **AND** connected components SHALL be separated visually.

#### Scenario: Legacy preset input is received

- **WHEN** a caller requests `compact`, `balanced`, or `expanded`
- **THEN** the service SHALL treat the request as `force`.
