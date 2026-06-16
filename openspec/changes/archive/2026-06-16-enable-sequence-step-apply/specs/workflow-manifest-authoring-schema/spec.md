## ADDED Requirements

### Requirement: Sequence steps MAY declare step apply behavior

Workflow manifest schema SHALL allow `request.sequence.steps[]` entries to
declare optional `apply_result` behavior.

#### Scenario: Author declares step apply

- **WHEN** a sequence step declares `apply_result.workflow_id` and
  `apply_result.on_failure`
- **THEN** manifest validation SHALL accept non-empty workflow ids
- **AND** `on_failure` SHALL be limited to `continue` or `fail_sequence`.

#### Scenario: Author omits step apply

- **WHEN** a sequence step omits `apply_result`
- **THEN** the step SHALL preserve existing no-intermediate-apply behavior.
