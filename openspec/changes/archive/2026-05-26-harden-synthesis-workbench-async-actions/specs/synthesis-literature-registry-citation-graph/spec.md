## ADDED Requirements

### Requirement: Literature and citation graph actions are asynchronous in UI

Workbench Literature Registry and Citation Graph controls SHALL treat rebuild,
retry, cleanup, and layout work as asynchronous operations.

#### Scenario: Registry rebuild is started

- **WHEN** the user starts a Literature Registry rebuild
- **THEN** the Workbench SHALL disable duplicate rebuild actions while the job is
  queued, running, or locally pending
- **AND** retry SHALL remain available only for retryable failure states.

#### Scenario: Citation graph layout recompute is started

- **WHEN** the user starts layout recompute for a preset
- **THEN** the Workbench SHALL disable recompute for the same preset until the
  operation completes or fails
- **AND** read-only graph interactions SHALL remain available.
