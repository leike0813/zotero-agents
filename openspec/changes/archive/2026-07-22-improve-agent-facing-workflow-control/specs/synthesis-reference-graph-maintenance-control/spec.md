## ADDED Requirements

### Requirement: Reference sidecar refresh SHALL be a public asynchronous operation
Host Bridge SHALL expose an approval-gated `reference_sidecar.refresh` capability with paper or library scope and a typed Synthesis operation receipt.

#### Scenario: Agent refreshes selected papers
- **WHEN** an agent requests sidecar refresh for normalized paper refs from one library
- **THEN** Host Bridge returns an operation handle
- **AND** terminal status reports processed, changed, skipped, and failed paper refs plus a reference basis hash.

### Requirement: Citation graph update SHALL be a separate public operation
Host Bridge SHALL expose an independently approved `citation_graph.update` capability that never runs inside the reference-sidecar transaction.

#### Scenario: Agent updates a graph from a sidecar basis
- **WHEN** an agent submits a graph update with an expected reference basis hash
- **THEN** Host Bridge rejects a mismatched basis before writing
- **AND** a successful update commits an atomic graph projection without changing sidecar facts.

### Requirement: Maintenance operation retry SHALL be idempotent
Each public maintenance operation SHALL accept an idempotency key bound to a normalized request hash.

#### Scenario: Idempotency key is reused
- **WHEN** the same key and normalized request are submitted again
- **THEN** Host Bridge returns the original running or terminal operation
- **AND** the same key with a different request is rejected as a conflict.
