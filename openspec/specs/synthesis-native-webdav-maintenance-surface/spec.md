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

### Requirement: WebDAV maintenance adapter SHALL only translate wire representation

The WebDAV maintenance adapter SHALL validate and decode the existing public request, invoke the typed maintenance lifecycle interface, and encode the resulting transport-neutral operation view. It MUST NOT own durable admission, dispatch, control-state transitions, terminal classification, restart reconciliation, lifecycle event publication, or persistence-record projection.

#### Scenario: Public maintenance operation is read
- **WHEN** the WebDAV maintenance adapter receives a valid operation query
- **THEN** it SHALL obtain a typed view from the lifecycle interface and encode the existing public schema
- **AND** it SHALL NOT read or interpret the underlying operation record, basis, source hash, or diagnostics storage

#### Scenario: Control request uses the supported wire spelling
- **WHEN** a control request uses the strict wire-contract fields for operation ID and retry key
- **THEN** the adapter SHALL normalize it into one typed control command before lifecycle dispatch
- **AND** unsupported aliases SHALL fail validation before lifecycle dispatch
- **AND** the lifecycle SHALL receive no wire field or raw JSON shape knowledge

#### Scenario: Surface inventory is checked
- **WHEN** WebDAV and generic maintenance surface parity is validated
- **THEN** the existing operation inventory and public DTO SHALL remain unchanged
- **AND** internal lifecycle ownership SHALL NOT require a second public surface or method

### Requirement: Known native WebDAV timestamps SHALL migrate before canonical validation

The Rust WebDAV application SHALL recognize the exact decimal Unix-millisecond timestamp encoding written by the earlier native production clock at persisted local-state and remote-HEAD read boundaries. It SHALL canonicalize those known fields to ISO-8601 before applying the unchanged strict state or pointer validator. Local state SHALL be saved atomically only after the complete migrated state validates, while a remote HEAD SHALL change only through the normal ETag-guarded synchronization publication path.

#### Scenario: Disabled legacy state is reconciled on startup

- **WHEN** startup reconciliation reads a schema-valid disabled WebDAV state whose native-owned timestamps use the historical decimal-millisecond encoding
- **THEN** Rust canonicalizes and atomically persists that state as ISO-8601
- **AND** startup reports ready with disabled WebDAV state rather than `webdav_sync_state_invalid`

#### Scenario: Legacy state contains run or retry timestamps

- **WHEN** a schema-valid state contains historical last-run timestamps or an established retry timestamp whose base uses decimal milliseconds
- **THEN** Rust canonicalizes every known native-owned timestamp before validating ordering and retry bounds
- **AND** it preserves queue, retry, conflict, diagnostic, and last-run semantics

#### Scenario: Remote HEAD uses the historical native clock

- **WHEN** a configured sync reads an otherwise valid remote HEAD whose `updated_at` is a decimal Unix-millisecond string
- **THEN** Rust canonicalizes the pointer in memory and continues strict preview and synchronization behavior
- **AND** it does not rewrite the remote pointer outside the existing ETag-guarded publication transaction

#### Scenario: Persisted timestamp is not a known historical encoding

- **WHEN** local state or a remote pointer contains a malformed, signed, fractional, overflowing, or otherwise noncanonical timestamp outside the exact historical encoding
- **THEN** the existing stable invalid-state or invalid-HEAD failure is returned before unsafe work
- **AND** public DTO rebuilders and canonical validators remain strict
