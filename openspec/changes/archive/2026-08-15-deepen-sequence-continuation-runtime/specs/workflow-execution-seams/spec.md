## ADDED Requirements

### Requirement: Sequence root completion SHALL precede outer result apply

Sequence execution and workflow result application SHALL remain distinct
transactions for normal and recovered execution.

#### Scenario: Terminal step completes the root before outer apply

- **WHEN** the actual terminal sequence step completes its step apply and
  lifecycle barrier
- **THEN** the sequence runtime SHALL persist root `completed`
- **AND** the owning workflow caller SHALL invoke outer result apply afterward.

#### Scenario: Outer apply failure does not reopen sequence execution

- **WHEN** outer workflow apply fails after sequence root completion
- **THEN** workflow and task projection SHALL expose a failed main outcome
- **AND** backend status SHALL remain succeeded
- **AND** sequence root status SHALL remain completed.

### Requirement: Actual terminal step SHALL determine outer apply ownership

The outer apply seam SHALL use the step that actually produced the sequence
terminal result rather than an unexecuted declared final step.

#### Scenario: Declared final step completes normally

- **WHEN** the declared final step is the actual terminal step
- **THEN** outer apply SHALL be skipped exactly when that step declares
  `apply_result`.

#### Scenario: Earlier step short-circuits the sequence

- **WHEN** a successful earlier step short-circuits the sequence
- **THEN** result metadata SHALL identify that step as `terminal_step_id`
- **AND** outer apply ownership SHALL be determined from that step
- **AND** an unexecuted declared final step SHALL NOT suppress outer apply.
