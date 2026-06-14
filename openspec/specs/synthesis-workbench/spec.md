## Purpose

Synthesis Workbench snapshots should read current indexed runtime state instead of legacy projection files.

## Requirements

### Requirement: Workbench snapshots use DB-first state

Synthesis Workbench snapshots SHALL derive normal UI rows, options, graph state, cleanup rows, and background jobs from SQLite-backed Synthesis repository/runtime state, not from legacy JSON/canonical files.

#### Scenario: Legacy files are ignored

- **GIVEN** legacy `data/synthesis/**` files exist
- **AND** the SQLite Synthesis repository is empty
- **WHEN** the Workbench snapshot is built
- **THEN** Home, Topics, Cleanup, Graph, topic options, and background jobs are empty or idle.

### Requirement: Citation graph visual rules SHALL be reusable

The Synthesis Workbench citation graph visual and interaction rules SHALL be reusable by standalone graph exports.

#### Scenario: Shared visual rules are available

- **GIVEN** Workbench citation graph nodes and edges
- **WHEN** graph visual attributes are derived
- **THEN** node size, color, importance halo, edge colors, hover label policy, and selection detail data SHALL be available from shared citation graph renderer logic.

#### Scenario: Readonly standalone mode omits Host actions

- **GIVEN** the standalone renderer is initialized with `readonly: true`
- **WHEN** a library paper node is selected
- **THEN** the renderer SHALL show local selection details
- **AND** it SHALL NOT render Host-only actions such as opening a Zotero item.
