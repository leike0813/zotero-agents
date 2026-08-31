## ADDED Requirements

### Requirement: Rust repository SHALL preserve the complete shadow schema

The Rust repository SHALL install and strictly operate the current complete isolated Synthesis schema and indexes with the existing schema identity, WAL, `synchronous=NORMAL`, foreign keys, 250 ms busy timeout, JavaScript-safe integer limits, and row normalization.

#### Scenario: Fresh and restarted repositories match the oracle
- **WHEN** fresh, reopened, and restarted Rust repositories are compared with independent Node oracle repositories
- **THEN** schema objects, indexes, PRAGMA state, normalized rows, and persisted terminal state are equivalent

### Requirement: Rust repository transactions SHALL preserve admission semantics

Outer Rust write transactions SHALL use `BEGIN IMMEDIATE`, nested transactions SHALL use savepoints, failed scopes SHALL roll back without leaking writes, and competing writers SHALL fail within the stable 250 ms busy-timeout category.

#### Scenario: Nested rollback and lock contention are exercised
- **WHEN** an inner savepoint fails and a separate connection competes for the writer
- **THEN** the outer caller retains deliberate commit/rollback control, no failed inner writes persist, and the competitor returns the stable busy error

### Requirement: Rust repository lifecycle SHALL be deterministic

Startup reconciliation SHALL cancel only `running` operations, and every shutdown path SHALL close repository statements and connections within the existing service budget.

#### Scenario: Restart and close preserve durable state
- **WHEN** a repository containing running and terminal operations is restarted and then shut down
- **THEN** only running operations become canceled, terminal rows remain unchanged, and the database can be reopened without a stale owner
