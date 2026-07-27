# synthesis-native-webdav-maintenance-surface Specification

## Purpose
TBD - created by archiving change complete-synthesis-native-webdav-maintenance-surface. Update Purpose after archive.
## Requirements
### Requirement: WebDAV state SHALL be durable and secret-free

The native surface SHALL implement the six WebDAV operations assigned by the R9a operation-ownership matrix using durable Rust state and a declared reverse-Host transport that does not disclose credentials. Sync, pause, resume, retry, and conflict results MUST survive restart.

#### Scenario: WebDAV transport succeeds
- **WHEN** the authenticated Host transport completes the expected remote operation
- **THEN** Rust atomically persists the matching state and receipt before reporting success

#### Scenario: The process restarts
- **WHEN** a durable WebDAV state or partial operation receipt exists
- **THEN** Rust resumes or reconciles from that state
- **AND** does not reset authoritative sync state to process-memory defaults

### Requirement: Maintenance and reset SHALL require exclusive admitted ownership

Public maintenance, startup reconcile, database reset, and clean-install reset SHALL use dedicated typed ports. Destructive actions MUST require the current production-owner identity, mutation admission, required checkpoint/backup evidence, and exclusive execution.

#### Scenario: Reset is not admitted
- **WHEN** owner identity, mutation admission, checkpoint, or exclusive lease is missing or stale
- **THEN** reset fails closed without changing repository or canonical state

#### Scenario: Reset crashes after a committed phase
- **WHEN** restart observes a partial maintenance receipt
- **THEN** the runtime enters Rust-only repair and resumes or restores according to the recorded phase
- **AND** it does not fall back to the legacy owner

### Requirement: High-risk readiness SHALL include crash evidence

All nine owned operations SHALL pass differential, restart, crash-window, conflict, Host-failure, bounds, deadline, and repair fixtures before ready-roster admission.

#### Scenario: Happy-path behavior passes without crash coverage
- **WHEN** a WebDAV or maintenance handler lacks required crash/reopen evidence
- **THEN** the operation remains not ready

