## ADDED Requirements

### Requirement: Citation graph projection exposes latest usable snapshot state

Synthesis Citation Graph SHALL expose stale/missing/running state without deleting the latest usable JSON projection.

#### Scenario: Background rebuild fails

- **WHEN** citation graph rebuild fails retryably
- **THEN** the previous usable graph projection SHALL remain readable
- **AND** diagnostics SHALL report retry state rather than returning raw library objects.

#### Scenario: Projection backend is JSON DTO

- **WHEN** citation graph projection is rebuilt
- **THEN** the projection SHALL declare backend `json-dto`
- **AND** no SQLite/FTS/BM25 artifact SHALL be created.
