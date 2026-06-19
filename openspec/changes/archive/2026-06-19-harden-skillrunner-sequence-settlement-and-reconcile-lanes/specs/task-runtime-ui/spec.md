## ADDED Requirements

### Requirement: SkillRunner sequence step task identity MUST remain stable

Task runtime and UI projections SHALL preserve sequence step identity across
submission, settlement, persistence, and restore.

#### Scenario: sequence step run record keeps full identity

- **WHEN** a SkillRunner sequence step reaches request-ready
- **THEN** its projectable run record SHALL include `workflowRunId`,
  `sequenceStepId`, `sequenceStepIndex`, `sequenceJobId`, and
  `sequenceStepSkillId`
- **AND** restoring that record into the reconciler SHALL preserve those fields

#### Scenario: sequence root is not a task row

- **WHEN** a SkillRunner sequence root exists only as orchestration state
- **THEN** it SHALL be stored with `projectable=false`
- **AND** it SHALL NOT appear as a separate Dashboard, popover, or RunDialog
  task row

### Requirement: Sequence apply state MUST remain visible independently of run state

UI projections SHALL keep terminal run state and deferred apply state separate.

#### Scenario: terminal step with pending apply remains visible

- **WHEN** a SkillRunner sequence step run is terminal succeeded
- **AND** side-effect apply is still pending, running, retrying, or failed
- **THEN** the step SHALL remain visible in task projections
- **AND** the projection SHALL expose apply state, error, and next retry time
  when available
