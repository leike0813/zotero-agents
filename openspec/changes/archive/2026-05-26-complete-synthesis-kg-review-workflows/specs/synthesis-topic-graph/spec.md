## MODIFIED Requirements

### Requirement: Relation proposals are ingested safely

Synthesis Topic Graph SHALL convert topic synthesis relation proposals into suggested edges or diagnostics, and SHALL preserve explicit user review decisions.

#### Scenario: User decision is preserved

- **WHEN** an existing edge for the same canonical tuple is confirmed or rejected
- **THEN** agent proposal ingestion SHALL NOT overwrite that edge status.

## ADDED Requirements

### Requirement: Suggested topic graph relations are reviewable

Synthesis Topic Graph SHALL allow Workbench users to accept or reject suggested relation edges through canonical transactions.

#### Scenario: Suggested edge is accepted

- **WHEN** a suggested edge is accepted by edge id
- **THEN** the canonical edge status SHALL become `confirmed`
- **AND** provenance and evidence SHALL be preserved
- **AND** `topic-graph-index` SHALL be marked stale.

#### Scenario: Suggested edge is rejected

- **WHEN** a suggested edge is rejected by edge id
- **THEN** the canonical edge status SHALL become `rejected`
- **AND** later proposal ingestion SHALL NOT overwrite that decision.

#### Scenario: Invalid edge decision is diagnostic-only

- **WHEN** a missing edge or non-suggested edge is reviewed
- **THEN** the service SHALL return a structured diagnostic
- **AND** no canonical graph assets SHALL be changed.
