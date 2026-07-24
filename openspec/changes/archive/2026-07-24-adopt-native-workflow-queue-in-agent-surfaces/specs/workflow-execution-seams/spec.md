## ADDED Requirements

### Requirement: Prepared workflow submission SHALL have one shared execution seam
Workflow UI and Host Bridge SHALL call one submission seam after confirmed planning and duplicate guarding. The seam SHALL accept resolved prepared execution state and immutable allowed prepared units, and SHALL own queue admission plus direct-provider fallback.

#### Scenario: ACP unit is admitted
- **WHEN** the submission queue admits an ACP or SkillRunner prepared unit
- **THEN** the seam SHALL build and preflight that unit, run it to terminal state, and complete Host apply before releasing its queue slot

#### Scenario: Input plan already exists
- **WHEN** the seam receives a prepared execution and allowed units
- **THEN** it SHALL NOT inspect raw selection, invoke the planner, delete members, or regroup units

#### Scenario: UI and Host submit concurrently
- **WHEN** UI and Host Bridge submit queue-managed workflows
- **THEN** each entry path SHALL invoke the shared seam once
- **AND** no path SHALL enqueue the same unit twice or bypass the native queue
