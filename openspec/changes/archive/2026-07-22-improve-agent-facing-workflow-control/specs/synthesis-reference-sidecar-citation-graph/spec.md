## ADDED Requirements

### Requirement: Public sidecar refresh SHALL defer graph update
The public reference-sidecar refresh operation SHALL commit sidecar changes and mark graph state stale without rebuilding graph rows in the same transaction.

#### Scenario: Public sidecar refresh changes references
- **WHEN** a paper-scoped or library-scoped refresh commits changed reference facts
- **THEN** the operation receipt reports the committed reference basis
- **AND** citation graph update remains a separate explicit operation.

### Requirement: Public graph update SHALL preserve graph consistency
Paper-scoped graph update SHALL atomically rewrite the requested source closure, while library-scoped graph update SHALL atomically replace the full graph and preserve last-good state on failure.

#### Scenario: Partial graph update cannot bootstrap a graph
- **WHEN** paper-scoped graph update is requested without an existing graph cache
- **THEN** the operation fails before writing with a safe action to request a library-scoped update.
