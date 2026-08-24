## MODIFIED Requirements

### Requirement: Host admission SHALL settle canceled ACP units exactly once

When an ACP task publishes a terminal canceled or failed state before its provider promise returns, Host queue management SHALL settle that execution unit exactly once through the existing terminal observer path. Settlement SHALL release at most one slot and remove the active submission identity without waiting for late provider completion.

#### Scenario: Canceled provider promise settles late

- **WHEN** an admitted ACP unit publishes `canceled` while its provider promise remains pending
- **THEN** Host admission SHALL release its slot and active identity
- **AND** the same source unit MAY be submitted again without a duplicate warning
- **AND** a later provider settlement SHALL NOT release another slot or settle the unit again.

#### Scenario: One concurrent sequence stalls

- **GIVEN** a submission admits two ACP sequence units
- **WHEN** one unit stalls during startup and the other is ready
- **THEN** the ready unit SHALL be able to start independently
- **AND** canceling the stalled unit SHALL not retain its Host slot or submission identity.
