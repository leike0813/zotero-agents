## ADDED Requirements

### Requirement: Shared ACP controller SHALL own signal authorization and actuation
Every plugin-owned ACP process launch and close path SHALL use the shared transport controller, and business consumers MUST NOT construct process-group signal targets or external signal commands.

#### Scenario: ACP consumer closes a local controller
- **WHEN** Backend Manager probing, ACP Chat, ACP Skills, a sequence stage, recovery, or a diagnostic closes a local ACP process
- **THEN** cleanup SHALL pass through the shared controller's validated signal boundary
- **AND** no consumer-specific process-group termination logic SHALL run

#### Scenario: Controller cannot prove safe group actuation
- **WHEN** ownership authorization or target-preserving actuation fails
- **THEN** the shared controller SHALL use only its directly held child handle
- **AND** the consumer SHALL receive bounded cleanup diagnostics without widening the signal target
