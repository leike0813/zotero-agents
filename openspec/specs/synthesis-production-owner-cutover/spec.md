# synthesis-production-owner-cutover Specification

## Purpose

Defines direct ownership and initialization of production storage by the
XPI-owned Rust sidecar.

## Requirements

### Requirement: Rust SHALL directly own production storage

The launched Rust service SHALL open `state/synthesis.db` and
`data/synthesis` after acquiring the production OS lock. Startup SHALL NOT run
a plugin-to-Rust cutover, receipt progression, critical-smoke activation, or
runtime admission workflow.

#### Scenario: Existing production storage is valid
- **WHEN** both database and canonical root match the current identities
- **THEN** Rust opens them and publishes readiness

### Requirement: Empty initialization SHALL be native-owned

If the database, its SQLite sidecars, and canonical root are all absent, Rust
SHALL initialize the database and canonical root as one startup operation.

#### Scenario: Both production stores are absent
- **WHEN** the sidecar starts under the production lock
- **THEN** Rust initializes both stores and then opens them normally

#### Scenario: Only part of production state exists
- **WHEN** database, WAL/SHM, or canonical state exists without its required
  counterpart
- **THEN** startup fails with `synthesis_source_state_incomplete`
- **AND** it does not create the missing half

### Requirement: Legacy lifecycle artifacts SHALL remain untouched

Existing receipt, admission, activation, owner, lease, backup, pointer, and
version artifacts SHALL NOT influence startup and SHALL NOT be automatically
deleted or rewritten.

#### Scenario: A legacy profile contains conflicting artifacts
- **WHEN** current production storage and the XPI runtime are valid
- **THEN** startup succeeds through the current path
- **AND** the legacy artifacts remain byte-identical
