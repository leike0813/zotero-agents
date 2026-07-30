# synthesis-sidecar-runtime-supervision Specification

## Purpose

Defines launch-scoped supervision for the single XPI-owned production sidecar.

## Requirements

### Requirement: Launch SHALL use one session config

The plugin SHALL launch the verified current executable with
`serve --config <session-config>`. The config SHALL directly bind production
database and canonical paths, reverse Host locator, runtime identity, and
session tokens. No separate admission or preflight command SHALL exist.

#### Scenario: Service publishes readiness
- **WHEN** session discovery, health, and handshake match the launch config
- **THEN** the supervisor publishes one authenticated production connection

### Requirement: Discovery SHALL be launch-scoped

Discovery and tokens SHALL live only under the current supervisor session. A
new launch SHALL use a new session directory and SHALL NOT consult global
discovery, owner, lease, receipt, or generation files.

#### Scenario: A legacy global discovery document exists
- **WHEN** a new session launches
- **THEN** the supervisor waits only for the session discovery document

### Requirement: Production ownership SHALL use a held OS lock

Rust SHALL hold an exclusive OS file lock for `state/synthesis.lock` for its
process lifetime before opening or initializing production storage. It SHALL
NOT infer ownership from PID, owner, lease, receipt, or activation files.

#### Scenario: Another process holds the production lock
- **WHEN** a second sidecar targets the same production database
- **THEN** it fails with `production_lock_conflict` before opening storage

#### Scenario: The owner exits
- **WHEN** the process releases or loses the lock
- **THEN** a later process can acquire it without stale-owner recovery

### Requirement: Parent lifetime and authenticated shutdown SHALL bound service lifetime

The sidecar SHALL stop on authenticated shutdown or parent stdin EOF. The
supervisor MAY force termination only after bounded graceful shutdown fails.

#### Scenario: The plugin process disappears
- **WHEN** the sidecar observes parent-pipe EOF
- **THEN** it stops without waiting for a lease timeout

### Requirement: Application errors SHALL retain their code

RPC clients SHALL return a recognized application error code before applying
success-response identity fences. Successful responses SHALL still match the
current request and service instance exactly.

#### Scenario: Service returns an application failure with placeholder identity
- **WHEN** the response contains a recognized error code
- **THEN** the client reports that code instead of `runtime_mismatch`
