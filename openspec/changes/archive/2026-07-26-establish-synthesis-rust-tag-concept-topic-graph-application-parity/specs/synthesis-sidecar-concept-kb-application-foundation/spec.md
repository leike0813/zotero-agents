## ADDED Requirements

### Requirement: Concept KB SHALL have typed Rust application parity
The private Rust candidate SHALL implement strict Concept snapshot replacement, deterministic proposal and review policy, display and deletion cascades, index promotion, bounded query, and lifecycle behavior over typed ports.

#### Scenario: Concept aggregate or index loses its basis
- **WHEN** a manifest CAS fails or index computation is superseded
- **THEN** no partial Concept projection is committed
- **AND** the last-good index remains readable

#### Scenario: Candidate query executes
- **WHEN** a bounded typed query is submitted against a current index
- **THEN** the Rust result and durable read-only state match the Node oracle
