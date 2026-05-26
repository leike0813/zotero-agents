## ADDED Requirements

### Requirement: Workbench snapshot reads are side-effect free

Synthesis Workbench snapshot reads SHALL NOT mutate Literature Registry or
Citation Graph job, canonical, or projection state.

#### Scenario: Projection is stale or missing during snapshot read

- **WHEN** the Workbench reads a snapshot and literature or citation projection
  state is stale or missing
- **THEN** the snapshot SHALL report bounded freshness diagnostics
- **AND** it SHALL NOT enqueue a rebuild job
- **AND** it SHALL NOT write job state, projection files, receipts, events, or
  canonical assets.

### Requirement: Workbench reads citation data from lightweight projections

Synthesis Workbench SHALL use projection files or latest usable legacy
projection files for Literature/Citation rendering.

#### Scenario: Canonical citation directories exist

- **WHEN** Workbench snapshot data is read
- **THEN** the service SHALL NOT scan `citation-graph/*` canonical directories
  solely to render the Workbench snapshot.

#### Scenario: JSON projection exists

- **WHEN** `state/citation-graph-index.json` exists
- **THEN** Workbench graph data SHALL be read from that projection.
