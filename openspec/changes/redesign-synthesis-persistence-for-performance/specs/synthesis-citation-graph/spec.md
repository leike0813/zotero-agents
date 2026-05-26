## MODIFIED Requirements

### Requirement: Citation graph runtime state is SQLite-backed

Citation graph structure, metrics, and layout metadata SHALL be stored in
indexed SQLite tables for runtime use.

#### Scenario: Graph slice is read

- **WHEN** the UI, MCP, or Host Bridge requests a citation graph slice
- **THEN** the service SHALL query bounded SQLite graph tables
- **AND** it SHALL NOT assemble or parse a full JSON graph projection.

#### Scenario: Source paper references change

- **WHEN** one source paper's reference resolution state changes
- **THEN** only that source paper's outgoing ownership and affected target/work
  incoming groups SHALL update.

#### Scenario: Metrics are read

- **WHEN** metrics are read
- **THEN** lightweight and latest usable complex metrics SHALL come from SQLite
  rows
- **AND** stale metrics SHALL return diagnostics rather than rebuilding from a
  read path.

#### Scenario: Layout is refreshed

- **WHEN** Graph UI or an explicit command refreshes layout
- **THEN** only the requested layout preset rows SHALL update
- **AND** MCP/CLI graph reads SHALL NOT trigger layout work.
