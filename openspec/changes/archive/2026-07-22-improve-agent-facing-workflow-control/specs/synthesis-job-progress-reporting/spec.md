## ADDED Requirements

### Requirement: Public maintenance operation handles SHALL be queryable
The formal Synthesis status surface SHALL accept a maintenance operation id and return its pending, running, or terminal progress and receipt.

#### Scenario: Agent polls a maintenance operation
- **WHEN** an agent queries status with an operation id returned by sidecar refresh or graph update
- **THEN** the response identifies the operation type, phase, scope, progress counts, timestamps, and current outcome
- **AND** polling does not mutate operation state.
