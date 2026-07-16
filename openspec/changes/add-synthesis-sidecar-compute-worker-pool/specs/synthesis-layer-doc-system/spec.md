## ADDED Requirements

### Requirement: Current Synthesis docs SHALL describe the compute canary topology

Runtime, packaging, performance, README, and Stage 1 documentation SHALL state
that the supervised service owns a lazy bounded layout worker canary while
production DB, canonical files, engine composition, and client routing remain
in-process.

#### Scenario: Engineer reads active sidecar documentation

- **WHEN** active docs describe sidecar compute
- **THEN** they SHALL distinguish control-plane availability, worker-pool state,
  and production kernel ownership
- **AND** they SHALL not claim that production layout has migrated.

#### Scenario: Engineer reviews steady-state cost

- **WHEN** active performance docs describe the supervisor and compute pool
- **THEN** they SHALL state that the supervisor has low steady-state overhead
- **AND** the worker is created lazily and bounded.
