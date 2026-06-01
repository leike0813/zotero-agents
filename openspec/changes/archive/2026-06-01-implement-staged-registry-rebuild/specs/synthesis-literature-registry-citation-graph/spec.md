## ADDED Requirements

### Requirement: Registry rebuild uses staged promotion

Full Registry rebuild SHALL write candidate state, validate it, and promote a
new active `registry_epoch` only through a short promotion transaction.

#### Scenario: Candidate build fails

- **WHEN** candidate rebuild fails before validation or promotion
- **THEN** the active Registry epoch SHALL remain unchanged
- **AND** Workbench reads SHALL continue using the previous committed Registry.

#### Scenario: Candidate validates successfully

- **WHEN** validation passes
- **THEN** promotion SHALL atomically swap active Registry basis
- **AND** previous active basis SHALL be retained as last-known-good.

### Requirement: Registry candidate validation is blocking

Candidate validation SHALL fail or block promotion for identity, binding,
redirect, reference, observed-source, suspicious-count, durable-effect, or
diagnostic-boundary violations.

#### Scenario: Matched resolution points to missing target

- **WHEN** candidate reference integrity validation finds a matched resolution
  targeting a missing or tombstoned literature item
- **THEN** promotion SHALL fail
- **AND** active Registry basis SHALL remain unchanged.

#### Scenario: Candidate is suspicious but structurally valid

- **WHEN** candidate count deltas exceed configured suspicious thresholds
- **THEN** default promotion SHALL be blocked
- **AND** explicit dangerous confirmation SHALL be required to promote it.
