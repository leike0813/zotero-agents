# synthesis-production-owner-cutover Specification

## Purpose

Defines direct ownership and initialization of production storage by the
XPI-owned Rust sidecar.

## Requirements

### Requirement: Production storage SHALL be opened directly by Rust

The launched Rust service SHALL acquire the production OS lock before opening or migrating `state/synthesis.db` and `data/synthesis`. Current storage SHALL open directly. An exact registered legacy pair SHALL be migrated and adopted by Rust during the same locked startup. Startup SHALL NOT run a plugin-to-Rust cutover, receipt progression, critical-smoke activation, or runtime admission workflow.

#### Scenario: Existing current production storage is valid
- **WHEN** both database and canonical root match the current identities
- **THEN** Rust opens them and publishes readiness

#### Scenario: Existing registered legacy production storage is valid
- **WHEN** both legacy stores pass registered migration and canonical adoption validation
- **THEN** Rust migrates them under the production lock, assumes the canonical identity, and publishes readiness

#### Scenario: Existing production storage is unsupported
- **WHEN** either store does not satisfy the current identity or registered legacy contract
- **THEN** startup fails closed without invoking a legacy owner

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

### Requirement: Repository foundation upgrades SHALL follow the registered chain
The production owner SHALL upgrade every supported Rust repository foundation version to the current version through each registered migration in order, under one backup and one transaction. A repository with no complete registered path SHALL fail without mutation.

#### Scenario: Version one repository starts under version three runtime
- **WHEN** the repository declares foundation v1 and the current runtime declares foundation v3
- **THEN** the owner applies v1-to-v2 and v2-to-v3 in order
- **AND** commits both only after the final v3 repository validates

### Requirement: Failed production ownership SHALL be recoverable explicitly
A deterministic startup failure SHALL remain terminal until a caller explicitly requests recovery. Recovery SHALL clear failed promise ownership, start one new supervised generation, and never overlap with the failed generation.

#### Scenario: User retries a corrected startup
- **WHEN** startup failed, the underlying cause was corrected, and the user invokes retry
- **THEN** the production owner creates one new startup generation
- **AND** all production consumers observe that generation rather than a permanently cached rejection
