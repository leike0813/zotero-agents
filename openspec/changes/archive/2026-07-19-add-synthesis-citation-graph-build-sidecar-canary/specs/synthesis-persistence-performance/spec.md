## ADDED Requirements

### Requirement: Graph-build canary SHALL remain globally bounded
Graph-build serialization and execution SHALL use the existing compute byte,
JSON-node, queue, worker, deadline, cancellation, resource, and shutdown bounds.

#### Scenario: Graph build saturates the worker
- **WHEN** graph-build work occupies the active slot and waiting queue
- **THEN** health, handshake, cancellation, and shutdown SHALL remain responsive and additional compute SHALL receive immediate backpressure

#### Scenario: Graph build is canceled while active
- **WHEN** cooperative cancellation does not complete within 100ms
- **THEN** the worker SHALL be terminated and replaced within the existing lifecycle policy
