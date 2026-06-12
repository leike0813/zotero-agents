## ADDED Requirements

### Requirement: ACP skill runs SHALL preserve recoverability after startup
ACP skill run startup reconciliation SHALL preserve recoverable non-terminal runs while clearing non-recoverable stale local executions.

#### Scenario: Recoverable ACP run survives local controller loss
- **GIVEN** an ACP skill run is non-terminal and its conversation recovery state is `available` or `connected`
- **WHEN** startup reconciliation runs after a plugin restart
- **THEN** the run SHALL remain non-terminal and recoverable
- **AND** the associated workflow task projection SHALL NOT be failed solely because the local controller is gone.

#### Scenario: Non-recoverable ACP run is failed after restart
- **GIVEN** an ACP skill run is non-terminal and cannot be recovered
- **WHEN** startup reconciliation runs after a plugin restart
- **THEN** the run SHALL be marked `failed`
- **AND** the associated workflow task projection SHALL leave active task lists.
