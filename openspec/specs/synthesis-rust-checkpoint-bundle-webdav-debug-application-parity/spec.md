## ADDED Requirements

### Requirement: Final R7 applications SHALL have typed Rust owners
The Rust application crate SHALL expose separate typed Knowledge Checkpoint, Durable Bundle, WebDAV Sync, and Debug/Maintenance modules whose DTO, policy, admission, cancellation, and drain behavior matches the frozen Node oracle without generic or string-selected dispatch.

#### Scenario: A final-cluster application is invoked
- **WHEN** a typed request is supplied through its explicit repository, canonical, Host, codec, scheduler, profiler, or maintenance ports
- **THEN** the Rust application returns the same public DTO or stable code as Node
- **AND** no production client, Host owner, capability, or runtime manifest is changed

### Requirement: Final R7 parity SHALL be independently reproducible
The cluster SHALL have one immutable corpus, one development-only Rust driver, and one Node checker that run Node and Rust against physically isolated mutable roots.

#### Scenario: Differential evidence is evaluated
- **WHEN** the checker executes every corpus scenario
- **THEN** it compares public observations, all 51 sorted table projections, canonical and WebDAV-owned filesystem state, remote objects, operation/cache rows, and close/reopen results
- **AND** it rejects an unexpected write or recovery difference
