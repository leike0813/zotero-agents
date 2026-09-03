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

### Requirement: Supervision SHALL expose causal lifecycle spans in debug

Debug traces SHALL cover launch, discovery, identity/health checks, process
exit, bounded restart, fuse, graceful shutdown, and forced shutdown. The
supervisor SHALL not maintain a second mutable startup diagnostic snapshot.

#### Scenario: Three restarts open the fuse
- **WHEN** the supervised process fails through the configured restart budget
- **THEN** one trace shows each attempt and the terminal fused state

### Requirement: Process termination SHALL compete with discovery
The supervisor SHALL observe child termination while waiting for discovery. A child that exits before ready publication SHALL terminate that launch immediately with its stable startup code when available instead of waiting for discovery timeout.

#### Scenario: Unsupported repository exits before discovery
- **WHEN** the child reports `legacy_schema_variant_unsupported` and exits before publishing discovery
- **THEN** the launch terminates with that code without waiting for the discovery deadline
- **AND** the deterministic failure is not retried automatically

#### Scenario: Unknown child crash occurs
- **WHEN** the child exits without a recognized deterministic startup code
- **THEN** the supervisor applies the bounded retry policy
- **AND** opens the fuse after the configured attempt budget

### Requirement: Supervisor SHALL own startup terminal state
The supervisor SHALL be the single owner of startup deadline, retry, fuse, terminal publication, and explicit recovery. Once a generation becomes terminal it SHALL not launch more attempts.

#### Scenario: Startup deadline expires
- **WHEN** the startup deadline expires during an attempt
- **THEN** the supervisor terminates the generation once
- **AND** no production-owner timer or pending retry starts another child

### Requirement: The production-lock winner SHALL reconcile stale discovery

Startup SHALL remove a pre-existing discovery document only after winning the
production lock. Missing discovery SHALL succeed. Other cleanup failures SHALL
return `stale_discovery_cleanup_failed` and release the acquired lock.

#### Scenario: A prior owner died after readiness

- **WHEN** no live process holds the lock but discovery remains
- **THEN** the next owner removes it before publishing its own ready document

#### Scenario: A competing owner is live

- **WHEN** lock acquisition returns `production_lock_conflict`
- **THEN** the losing process leaves the live owner's discovery unchanged

#### Scenario: Parent input closes after readiness

- **WHEN** the real sidecar process observes parent EOF
- **THEN** it exits successfully within the lifecycle bound and removes discovery
