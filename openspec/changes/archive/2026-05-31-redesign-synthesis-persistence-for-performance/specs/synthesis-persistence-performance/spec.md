## ADDED Requirements

### Requirement: Synthesis runtime state is SQLite-first

Synthesis SHALL use SQLite as the local runtime source of truth for high
frequency UI, MCP, Host Bridge, review, and worker paths.

#### Scenario: Workbench reads Synthesis state

- **WHEN** the Workbench builds a Synthesis snapshot
- **THEN** it SHALL query SQLite view-model tables or repository APIs
- **AND** it SHALL NOT scan `data/synthesis/**` JSON canonical assets as the
  default source.

#### Scenario: MCP reads Synthesis state

- **WHEN** a read-only MCP or Host Bridge command reads registry, graph, metrics,
  tags, concepts, or topic graph state
- **THEN** it SHALL use bounded SQLite queries
- **AND** it SHALL NOT trigger JSON projection rebuild or canonical file scans.

#### Scenario: Synthesis state mutates

- **WHEN** a review action, registry update, concept edit, tag import, or topic
  graph mutation succeeds
- **THEN** the local SQLite state SHALL update transactionally
- **AND** the UI SHALL be able to observe the result without waiting for JSON
  checkpoint export.

### Requirement: JSON canonical assets are cold-path checkpoints

Synthesis SHALL retain JSON canonical assets as explicit import/export,
checkpoint, audit, and future sync material only.

#### Scenario: Normal runtime action completes

- **WHEN** a normal UI action or background worker updates Synthesis state
- **THEN** it SHALL NOT write one JSON canonical file per changed record as part
  of the hot path.

#### Scenario: Checkpoint export is requested

- **WHEN** an explicit checkpoint/export command is invoked
- **THEN** Synthesis SHALL serialize the current SQLite state into canonical JSON
  assets under `data/synthesis/`.

#### Scenario: Existing fixture is imported

- **WHEN** a developer or tester explicitly imports existing `data/synthesis/`
  JSON data
- **THEN** the importer SHALL populate SQLite state after dry-run validation
- **AND** startup SHALL NOT perform this import automatically.

### Requirement: Synthesis repository exposes typed indexed operations

Synthesis SHALL provide a typed repository boundary for local state rather than
using unindexed JSON blobs as the primary state model.

#### Scenario: Repository migrates schema

- **WHEN** the repository initializes
- **THEN** it SHALL apply idempotent schema migrations
- **AND** it SHALL create indexes required by registry, review, graph, and worker
  queries.

#### Scenario: Repository transaction fails

- **WHEN** a Synthesis repository transaction fails
- **THEN** all changes in that transaction SHALL roll back
- **AND** the caller SHALL receive a structured diagnostic or exception.

### Requirement: Performance is an acceptance contract

Synthesis SHALL include performance acceptance coverage for large local state.

#### Scenario: Large synthetic dataset is tested

- **WHEN** performance tests run against 1k and 10k synthetic paper datasets
- **THEN** Workbench snapshot, Index filter, cleanup decision, graph slice,
  metrics read, and worker batch paths SHALL report measured durations
- **AND** budget failures SHALL include enough diagnostic context to locate the
  slow path.
