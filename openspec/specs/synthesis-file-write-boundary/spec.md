## Purpose

Synthesis writes are scoped to explicit workflow apply, explicit operations, and managed sidecar persistence.

## Requirements

### Requirement: Cache reads do not write files
Synthesis read paths SHALL NOT write canonical files, sidecar files, or operation rows.

#### Scenario: Workbench snapshot is read
- **WHEN** Workbench reads Synthesis state
- **THEN** it SHALL not refresh cache projections or write source artifacts
- **AND** it SHALL not mutate topic, tag, concept, graph, or reference state.

### Requirement: Explicit operations own their write boundaries
Explicit Synthesis operations SHALL write only their documented sidecar/cache/projection outputs.

#### Scenario: Reference cache refresh runs
- **WHEN** the reference cache refresh operation runs
- **THEN** it MAY update reference cache projections and operation progress
- **AND** it SHALL NOT write topic artifacts or workflow outputs.
