## MODIFIED Requirements

### Requirement: Parity reports SHALL compare shared observable state

Each implementation report SHALL contain public Workbench and Topic DTOs,
stable status/error/warning codes, deterministic snapshots of shared durable
tables, canonical bytes and hashes, journal and receipt state, and the same
observations after close/reopen. An implementation-private schema marker with no
owner in the other implementation SHALL be normalized by one shared parity
policy and verified by the owning implementation's repository tests instead.

#### Scenario: Rust carries a private redirect-graph schema marker

- **WHEN** the Rust report contains `reference_redirect_graph_schema_version`
- **THEN** the shared parity projection SHALL omit that Rust-owned row by key
- **AND** Node rows and unrelated Rust schema rows SHALL remain observable
- **AND** Rust repository tests SHALL continue to verify the exact current marker and migration

#### Scenario: One shared durable side effect differs

- **WHEN** DTOs, common table rows, canonical bytes, journal classification, receipt, or reopen behavior differs
- **THEN** the differential checker SHALL fail with a stable mismatch location
