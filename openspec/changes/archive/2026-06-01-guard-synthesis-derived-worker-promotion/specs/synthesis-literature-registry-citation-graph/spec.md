## ADDED Requirements

### Requirement: Derived worker output is invisible until basis-checked promotion

Derived worker output SHALL remain invisible until final promotion succeeds
against the current Registry basis for graph structure, metrics, layout, and
Registry-dependent read models.

#### Scenario: Worker commits after basis changes

- **WHEN** a worker captured basis `A` but active Registry basis is `B` during
  final promotion
- **THEN** promotion SHALL be rejected
- **AND** active graph, metrics, layout, or read-model state SHALL remain
  unchanged.

#### Scenario: Worker commits on current basis

- **WHEN** captured basis still equals active basis during final promotion
- **THEN** staged output SHALL become visible atomically
- **AND** dependent dirty events SHALL be recorded as needed.

#### Scenario: Startup finds previous-session running rows

- **WHEN** startup cleanup finds dirty events or job rows left running by a
  previous session
- **THEN** it SHALL requeue, retry, fail, or supersede them before they appear as
  active UI jobs.
