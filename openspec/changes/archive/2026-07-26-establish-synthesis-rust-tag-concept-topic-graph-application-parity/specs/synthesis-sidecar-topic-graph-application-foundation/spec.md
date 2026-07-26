## ADDED Requirements

### Requirement: Topic Graph SHALL have typed Rust application parity
The private Rust candidate SHALL implement strict snapshot and upsert operations, proposal and relation/review decisions, two-stage deletion, index promotion, and lifecycle behavior over typed repository and compute ports.

#### Scenario: An invalid relation is proposed
- **WHEN** relation identity is malformed, an active broader-than cycle would be created, or unsafe policy requires review
- **THEN** the Rust candidate returns the same stable result as Node
- **AND** user-decided relations and the last-good aggregate are preserved

#### Scenario: Deleted relations are purged
- **WHEN** mark and purge operations use the expected manifest basis
- **THEN** the node, edge, review, revision, and index-staleness observations match Node atomically
