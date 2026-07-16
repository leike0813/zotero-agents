## ADDED Requirements

### Requirement: Topic Graph index engine execution is bounded

Topic Graph index requests SHALL enforce production collection and string
limits before computation and SHALL expose deterministic cancellation
checkpoints.

#### Scenario: Production bounds are exceeded

- **WHEN** a source collection exceeds its configured limit
- **THEN** computation SHALL fail without modifying repository, canonical, or
  projection state.

### Requirement: Topic Graph projection promotion is failure-safe

Projection registry state SHALL advance only after the application strictly
rebuilds an engine result for the current manifest basis.

#### Scenario: Result basis is invalid

- **WHEN** an engine result changes manifest hash or rebuild timestamp
- **THEN** the result SHALL be rejected and the previous projection state
  SHALL remain authoritative.
