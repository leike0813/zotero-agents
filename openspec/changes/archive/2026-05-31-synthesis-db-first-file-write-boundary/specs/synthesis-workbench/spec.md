## MODIFIED Requirements

### Requirement: Workbench snapshots use DB-first state

Synthesis Workbench snapshots SHALL derive normal UI rows, options, graph state, cleanup rows, and background jobs from SQLite-backed Synthesis repository/runtime state, not from legacy JSON/canonical files.

#### Scenario: Legacy files are ignored

- **GIVEN** legacy `data/synthesis/**` files exist
- **AND** the SQLite Synthesis repository is empty
- **WHEN** the Workbench snapshot is built
- **THEN** Home, Topics, Cleanup, Graph, topic options, and background jobs are empty or idle.
