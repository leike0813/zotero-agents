## ADDED Requirements

### Requirement: Normal Synthesis runtime must not write data-root files

Normal Synthesis Workbench and background maintenance operations SHALL NOT create or mutate files under `<persistence>/data/synthesis/**`.

#### Scenario: Opening Workbench does not create data synthesis files

- **WHEN** a Synthesis snapshot is loaded for a clean persistence root
- **THEN** `<persistence>/data/synthesis` remains absent
- **AND** UI state is derived from the SQLite repository and bounded runtime state.

#### Scenario: Rebuilding index does not create data synthesis files

- **WHEN** the literature registry/index rebuild command runs
- **THEN** Synthesis repository rows and job progress are updated
- **AND** `<persistence>/data/synthesis/**` is not created or changed.

#### Scenario: Background workers do not create data synthesis files

- **WHEN** update queue workers, citation graph layout, topic freshness, topic discovery, or startup reconcile run
- **THEN** their hot-path state is written to SQLite/job state
- **AND** they do not write under `<persistence>/data/synthesis/**`.

### Requirement: Explicit file artifacts are not hot-path state

Explicit export, checkpoint, debug dump, and import workflows MAY read or write file bundles, but those bundles SHALL NOT be used as implicit Workbench snapshot, queue, graph, freshness, or topic option sources.

#### Scenario: Old JSON files do not affect UI

- **GIVEN** old `data/synthesis/**` files exist
- **AND** the Synthesis DB has no corresponding rows
- **WHEN** Workbench snapshot, topic options, graph, cleanup, or background jobs are rendered
- **THEN** the UI shows the DB-derived empty/idle state.

### Requirement: Clean-install reset removes Synthesis file residues

Clean-install reset SHALL remove old data-root Synthesis files and runtime-root Synthesis scratch files while preserving non-Synthesis state.

#### Scenario: Reset clears both file roots

- **GIVEN** files exist under `<persistence>/data/synthesis` and `<persistence>/runtime/synthesis`
- **WHEN** clean-install reset is confirmed
- **THEN** both file roots are removed
- **AND** Synthesis DB runtime tables are cleared.
